import { supabase } from "./supabaseClient";

// Offline write queue. Every mutation is applied to local state immediately
// (optimistic — the UI never waits on the network, matching the app's
// offline-first requirement), then queued here and flushed against Supabase
// in the background. IDs for new rows are generated client-side
// (crypto.randomUUID()) at creation time, so a queued "update" or "delete"
// for a row created while offline references the same id its eventual
// "create" upsert will use — no server-generated-id reconciliation needed,
// as long as ops are replayed strictly in the order they were queued (FIFO),
// which guarantees a row's create always lands before its later updates.

export type OutboxTable =
  | "businesses"
  | "materials"
  | "restock_entries"
  | "products"
  | "batches"
  | "sales"
  | "notification_settings";

export interface OutboxOp {
  opId: string;
  table: OutboxTable;
  kind: "upsert" | "delete";
  row?: Record<string, unknown>;
  rowId?: string;
  /** opId of the op this one is a side effect of (e.g. a material
   * stock-upsert queued right after the batch/restock that caused the
   * stock change) — lets a permanent rejection of the parent op precisely
   * discard just ITS dependent ops, not every other still-queued op that
   * happens to touch the same row (see discardQueuedOpsCausedBy). */
  causedByOpId?: string;
}

const OUTBOX_KEY = "production-log-outbox";

const primaryKeyByTable: Record<OutboxTable, string> = {
  businesses: "id",
  materials: "id",
  restock_entries: "id",
  products: "id",
  batches: "id",
  sales: "id",
  notification_settings: "business_id",
};

function loadOutbox(): OutboxOp[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveOutbox(ops: OutboxOp[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops));
}

export function outboxLength(): number {
  return loadOutbox().length;
}

/** Remove any still-queued ops that were caused by (queued as a side effect
 * of) the given op, without ever attempting them — matched by opId, NOT by
 * which row they touch, so this can't accidentally discard an unrelated,
 * still-legitimate op that happens to touch the same row (e.g. a later,
 * perfectly valid restock of the same material the rejected batch also
 * used). Used when a permanently-rejected mutation makes its own
 * dependent ops moot — e.g. the material stock-deduction op(s) queued
 * right after a batch that then got rejected for being over the free
 * plan's cap: that stock change never actually happened server-side and
 * must never be sent. Safe to call any time; only touches ops that
 * haven't been sent yet. */
export function discardQueuedOpsCausedBy(causedByOpId: string): void {
  saveOutbox(loadOutbox().filter((o) => o.causedByOpId !== causedByOpId));
}

// A write the server will NEVER accept, no matter how many times it's
// retried (e.g. it would push a business over its free-plan cap), as
// opposed to a transient failure (offline, a real blip) where retrying
// later is the right move. Postgres exceptions raised for this reason
// (see enforce_entry_cap()/enforce_business_cap() in
// supabase/migrations/0004_freemium_caps.sql) always start with this fixed,
// greppable prefix in their message text — simpler and more robust across
// the PostgREST/supabase-js error-shape layer than relying on a custom
// SQLSTATE code.
const PERMANENT_REJECTION_PREFIX = "FREE_PLAN_LIMIT:";

type RejectionListener = (op: OutboxOp, message: string) => void;
let rejectionListener: RejectionListener | null = null;

/** Register the single handler invoked once, synchronously, right when a
 * permanent rejection is detected inside the flush loop — not surfaced only
 * through a caller's own flushOutbox().then(), since several call sites can
 * be awaiting the very same in-flight flush pass (see the inFlight/
 * pendingRerun lock below), which would otherwise invoke a naive per-caller
 * handler more than once for the same rejected op. Only one listener is
 * ever needed (useAppStore.ts registers it once at store-init time). */
export function onPermanentRejection(listener: RejectionListener): void {
  rejectionListener = listener;
}

export function enqueue(op: Omit<OutboxOp, "opId">): string {
  const ops = loadOutbox();
  const opId = crypto.randomUUID();
  ops.push({ ...op, opId });
  saveOutbox(ops);
  return opId;
}

// Concurrency guard: mutating actions each call flushOutbox() themselves,
// AND loadAllData() calls it after a data refresh, AND those can genuinely
// overlap (e.g. an auth-state event firing around the same time as a form
// submit). Without a lock, overlapping calls all race to process the same
// front-of-queue item independently — observed in testing as dozens of
// duplicate requests (and duplicate 409s) for a single stuck op instead of
// one retry per call. inFlight ensures only one flush runs at a time;
// pendingRerun ensures a flush requested *during* an in-flight one still
// happens once the current one finishes, instead of being silently dropped.
let inFlight: Promise<{ flushed: number; remaining: number; rejected: OutboxOp[] }> | null = null;
let pendingRerun = false;

async function flushOutboxOnce(): Promise<{ flushed: number; remaining: number; rejected: OutboxOp[] }> {
  let flushed = 0;
  const rejected: OutboxOp[] = [];
  while (true) {
    // Re-read fresh on every iteration — NOT a snapshot taken once at the
    // top. A real, silent data-loss bug lived here: several store actions
    // (logBatch, restockMaterial, logSale+updateBatch, addBusiness) call
    // queueAndFlush() more than once synchronously, e.g. logBatch queues
    // the batch upsert, then a materials upsert per material used, with no
    // await between them. The first queueAndFlush's flushOutbox() starts
    // awaiting its network call — at that point a stale `ops` snapshot had
    // already been captured — while the second queueAndFlush's enqueue()
    // appends to localStorage in the meantime. When the first call's
    // network response came back, `ops.slice(1)` operated on the STALE
    // snapshot (which never knew about the second op) and `saveOutbox()`
    // overwrote localStorage with it, silently erasing the second op
    // before it was ever sent — no error, nothing left in the outbox to
    // retry, the write just vanished. Confirmed via a live batch-logging
    // test: the batch itself persisted, but the material stock deduction
    // it queued right after did not, even though local state (and the UI)
    // showed the correct post-deduction value the whole time.
    const ops = loadOutbox();
    if (ops.length === 0) break;
    const op = ops[0];
    const pk = primaryKeyByTable[op.table];
    try {
      if (op.kind === "upsert") {
        const { error } = await supabase.from(op.table).upsert(op.row!, { onConflict: pk });
        if (error) throw error;
      } else {
        const { error } = await supabase.from(op.table).delete().eq(pk, op.rowId!);
        if (error) throw error;
      }
      // Re-read again right before removing (more ops may have been
      // enqueued while the request above was in flight) and remove only
      // the specific op just flushed, by id — never blindly overwrite
      // with whatever array happened to be in memory.
      saveOutbox(loadOutbox().filter((o) => o.opId !== op.opId));
      flushed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? "");
      if (message.startsWith(PERMANENT_REJECTION_PREFIX)) {
        // This op can never succeed — remove it (same as success, just not
        // counted as flushed) and keep going. Don't let one purged entry
        // stall every other unrelated queued write sitting behind it.
        saveOutbox(loadOutbox().filter((o) => o.opId !== op.opId));
        rejected.push(op);
        rejectionListener?.(op, message);
        continue;
      }
      // Network error (offline) or a real write failure — either way, stop
      // here and leave the remaining queue for the next flush attempt.
      break;
    }
  }
  return { flushed, remaining: loadOutbox().length, rejected };
}

/** Replay queued ops against Supabase, oldest first, stopping at the first
 * failure (still offline, or a real error) so later ops don't run out of
 * order. Safe to call repeatedly and concurrently (e.g. an 'online' event, a
 * manual "Sync Now" tap, and a mutation's own post-write flush can all fire
 * around the same time) — calls are serialized via the lock above rather
 * than each racing the queue independently. */
export async function flushOutbox(): Promise<{ flushed: number; remaining: number; rejected: OutboxOp[] }> {
  if (inFlight) {
    pendingRerun = true;
    return inFlight;
  }
  inFlight = (async () => {
    let result = await flushOutboxOnce();
    while (pendingRerun) {
      pendingRerun = false;
      result = await flushOutboxOnce();
    }
    return result;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
