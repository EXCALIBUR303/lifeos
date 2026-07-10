"use client";

import { create } from "zustand";
import { SeedData } from "./seed";
import { rpc } from "./supabase";

/* ================================================================
   End-to-end encrypted device sync.

   One "sync code" pairs devices. From it we derive:
   - the row id     = SHA-256("lifeos-id:" + code)   (server sees only this)
   - the AES key    = PBKDF2(code)                    (never leaves the device)
   The server stores only ciphertext — nobody without the code (including
   the database) can read the data. Conflict policy: last writer wins.
   ================================================================ */

/** Everything that syncs between devices (chat + API keys stay local). */
export type SyncData = Pick<
  SeedData,
  | "tasks" | "habits" | "transactions" | "budgets" | "goals" | "journal"
  | "health" | "focus" | "events" | "subjects" | "flashcards" | "notes"
>;

export const SYNC_FIELDS: (keyof SyncData)[] = [
  "tasks", "habits", "transactions", "budgets", "goals", "journal",
  "health", "focus", "events", "subjects", "flashcards", "notes",
];

export function pickSyncData(state: SyncData): SyncData {
  const out = {} as SyncData;
  for (const k of SYNC_FIELDS) (out as Record<string, unknown>)[k] = state[k];
  return out;
}

/* ---------------- codes & crypto ---------------- */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

export function genSyncCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `${chars.slice(0, 5).join("")}-${chars.slice(5, 10).join("")}-${chars.slice(10, 15).join("")}-${chars.slice(15, 20).join("")}`;
}

export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z2-9]/g, "");
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function syncIdFromCode(code: string): Promise<string> {
  return sha256Hex(`lifeos-id:${normalizeCode(code)}`);
}

async function deriveKey(code: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalizeCode(code)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("lifeos-sync-v1"),
      iterations: 120000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function encryptJSON(code: string, obj: unknown): Promise<string> {
  const key = await deriveKey(code);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(obj)),
  );
  const joined = new Uint8Array(iv.length + ct.byteLength);
  joined.set(iv, 0);
  joined.set(new Uint8Array(ct), iv.length);
  return toB64(joined);
}

async function decryptJSON<T>(code: string, b64: string): Promise<T> {
  const key = await deriveKey(code);
  const joined = fromB64(b64);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: joined.slice(0, 12) },
    key,
    joined.slice(12),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/* ---------------- snapshot transport ---------------- */

export async function pushSnapshot(code: string, data: SyncData): Promise<string> {
  const id = await syncIdFromCode(code);
  const ciphertext = await encryptJSON(code, data);
  return rpc<string>("put_snapshot", { p_id: id, p_data: ciphertext });
}

export async function pullSnapshot(
  code: string,
): Promise<{ data: SyncData; updatedAt: string } | null> {
  const id = await syncIdFromCode(code);
  const rows = await rpc<{ data: string; updated_at: string }[]>("get_snapshot", {
    p_id: id,
  });
  if (!rows.length) return null;
  const data = await decryptJSON<SyncData>(code, rows[0].data);
  return { data, updatedAt: rows[0].updated_at };
}

/* ---------------- calendar feed transport ---------------- */

export function genFeedId(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function pushFeed(feedId: string, ics: string): Promise<string> {
  return rpc<string>("put_feed", { p_id: feedId, p_ics: ics });
}

export function feedUrls(feedId: string): { https: string; webcal: string } {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://lifeos-eta-woad.vercel.app";
  const https = `${origin}/api/feed/${feedId}`;
  return { https, webcal: https.replace(/^https?:\/\//, "webcal://") };
}

/* ---------------- sync meta (per-device) ---------------- */

const META_KEY = "lifeos-sync-meta";

export function getSyncMeta(): { lastSyncedAt: string | null } {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? "") as { lastSyncedAt: string };
  } catch {
    return { lastSyncedAt: null };
  }
}

export function setSyncMeta(lastSyncedAt: string) {
  localStorage.setItem(META_KEY, JSON.stringify({ lastSyncedAt }));
}

export function clearSyncMeta() {
  localStorage.removeItem(META_KEY);
}

/* ---------------- live status (for the Settings UI) ---------------- */

export interface SyncStatus {
  state: "idle" | "syncing" | "ok" | "error";
  detail: string;
  at: string | null;
  set: (state: SyncStatus["state"], detail: string) => void;
}

export const useSyncStatus = create<SyncStatus>((set) => ({
  state: "idle",
  detail: "Not set up",
  at: null,
  set: (state, detail) => set({ state, detail, at: new Date().toISOString() }),
}));
