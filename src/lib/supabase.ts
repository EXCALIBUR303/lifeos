/* Isomorphic Supabase REST helpers (no SDK — one tiny fetch wrapper).
   The publishable key is safe to ship in the client by design; the tables
   are sealed by RLS and only reachable through exact-id RPC functions. */

export const SUPABASE_URL = "https://alenqqmobbtejxtoaucn.supabase.co";
export const SUPABASE_KEY = "sb_publishable_BiqnyuCkj3Bb00ZGos1chg_cOwpSgT9";

export class SyncApiError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`Sync API error ${status}: ${body.slice(0, 160)}`);
    this.status = status;
  }
}

export async function rpc<T>(fn: string, args: Record<string, string>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new SyncApiError(res.status, await res.text());
  return (await res.json()) as T;
}
