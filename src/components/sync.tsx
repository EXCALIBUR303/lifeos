"use client";

import { toICS } from "@/lib/calendar";
import { useLife, useSettings } from "@/lib/store";
import {
  getSyncMeta,
  pickSyncData,
  pullSnapshot,
  pushFeed,
  pushSnapshot,
  setSyncMeta,
  SyncData,
  useSyncStatus,
} from "@/lib/sync";
import { useCallback, useEffect, useRef } from "react";

const PUSH_DEBOUNCE_MS = 2500;

/**
 * Invisible engine that keeps devices in sync.
 * - pulls on load / tab focus (remote wins if newer than our last sync)
 * - pushes local changes, debounced (last writer wins)
 * - republishes the calendar feed when events change (independent of sync)
 */
export function SyncManager() {
  const syncCode = useSettings((s) => s.syncCode);
  const publishFeed = useSettings((s) => s.publishFeed);
  const feedId = useSettings((s) => s.feedId);
  const setStatus = useSyncStatus((s) => s.set);

  const applyingRemote = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);

  const doPush = useCallback(async () => {
    if (!syncCode || busy.current) return;
    busy.current = true;
    setStatus("syncing", "Pushing changes…");
    try {
      const updatedAt = await pushSnapshot(syncCode, pickSyncData(useLife.getState()));
      setSyncMeta(updatedAt);
      setStatus("ok", "Up to date");
    } catch {
      setStatus("error", "Push failed — will retry on next change");
    } finally {
      busy.current = false;
    }
  }, [syncCode, setStatus]);

  const doPull = useCallback(async () => {
    if (!syncCode || busy.current) return;
    busy.current = true;
    setStatus("syncing", "Checking for updates…");
    try {
      const remote = await pullSnapshot(syncCode);
      if (!remote) {
        // first device on this code — seed the cloud copy
        busy.current = false;
        await doPush();
        return;
      }
      const meta = getSyncMeta();
      if (
        !meta.lastSyncedAt ||
        new Date(remote.updatedAt) > new Date(meta.lastSyncedAt)
      ) {
        applyingRemote.current = true;
        useLife.setState(remote.data as Partial<SyncData>);
        applyingRemote.current = false;
        setSyncMeta(remote.updatedAt);
        setStatus("ok", "Pulled latest from other device");
      } else {
        setStatus("ok", "Up to date");
      }
    } catch (err) {
      const wrongCode = err instanceof DOMException; // AES-GCM auth failure
      setStatus("error", wrongCode ? "Couldn't decrypt — is the code right?" : "Pull failed — check connection");
    } finally {
      busy.current = false;
    }
  }, [syncCode, setStatus, doPush]);

  // initial pull + pull on tab focus
  useEffect(() => {
    if (!syncCode) {
      setStatus("idle", "Not set up");
      return;
    }
    doPull();
    const onFocus = () => doPull();
    const onVisible = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("lifeos-sync-now", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("lifeos-sync-now", onFocus);
    };
  }, [syncCode, doPull, setStatus]);

  // push local changes (debounced) + republish calendar feed
  useEffect(() => {
    const unsub = useLife.subscribe((state, prev) => {
      if (applyingRemote.current) return;

      // feed republish when events change (works even without a sync code)
      if (publishFeed && feedId && state.events !== prev.events) {
        pushFeed(feedId, toICS(state.events)).catch(() => {});
      }

      if (!syncCode) return;
      let changed = false;
      for (const k of Object.keys(pickSyncData(state)) as (keyof SyncData)[]) {
        if (state[k] !== prev[k]) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(doPush, PUSH_DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [syncCode, publishFeed, feedId, doPush]);

  // publish the feed immediately when it's switched on
  useEffect(() => {
    if (publishFeed && feedId) {
      pushFeed(feedId, toICS(useLife.getState().events)).catch(() => {});
    }
  }, [publishFeed, feedId]);

  return null;
}
