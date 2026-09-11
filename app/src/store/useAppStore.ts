import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Material,
  Product,
  Batch,
  Sale,
  RestockEntry,
  Business,
  NotificationSettings,
  SyncState,
} from "../types/models";
import { supabase } from "../lib/supabaseClient";
import { rowToCamel, toSnakeRow } from "../lib/supabaseMappers";
import { enqueue, flushOutbox, outboxLength, discardQueuedOpsCausedBy, onPermanentRejection } from "../lib/outbox";
import { useToastStore } from "./useToastStore";
import { productsUsingMaterial } from "../lib/selectors";
import type { PlanLimitsByPlan } from "../lib/planLimits";
import type { AccountExport } from "../types/export";

// Real Supabase-backed store. Every business-owned row's id is generated
// client-side (crypto.randomUUID()) at creation time so optimistic local
// writes and the background outbox sync share the same id — see
// lib/outbox.ts for why that removes the need for id reconciliation.
//
// Mutating actions (add/update/remove/log*) stay SYNCHRONOUS from the
// caller's perspective: they update local state and return immediately, then
// queue+flush the Supabase write in the background. Only auth actions are
// genuinely async (the UI has to wait to know if credentials were valid).
//
// One login can own SEVERAL businesses (see supabase/migrations/
// 0002_multi_business.sql) — `businesses` holds the full list, `business` is
// always the currently active one (kept as its own field, not just derived,
// so the ~15 existing call sites reading `s.business` didn't need to change
// when this was added). `activeBusinessId` is persisted so the same
// business reopens next visit.

interface AppState {
  authChecked: boolean;
  isAuthenticated: boolean;
  /** True only for a session established via a clicked password-recovery
   * link (Supabase's "PASSWORD_RECOVERY" auth event) — distinct from a
   * regular signed-in session, which also makes isAuthenticated true but
   * shouldn't be enough on its own to unlock Reset Password's "set a new
   * password" form (see ResetPassword.tsx). */
  isPasswordRecovery: boolean;
  userEmail: string | null;
  authUserId: string | null;
  dataLoaded: boolean;
  /** True once auth is confirmed and this login owns zero businesses yet —
   * drives the redirect to the business-setup screen. */
  needsBusinessSetup: boolean;

  businesses: Business[];
  business: Business;
  activeBusinessId: string | null;
  /** Fetched once at boot from the `plan_limits` table — see
   * lib/planLimits.ts. Empty until loaded; every consumer treats a missing
   * entry as unlimited (fail open — this is a UX convenience, not the
   * actual enforcement boundary). */
  planLimits: PlanLimitsByPlan;

  materials: Material[];
  products: Product[];
  batches: Batch[];
  sales: Sale[];
  restocks: RestockEntry[];
  notificationSettings: NotificationSettings;

  syncState: SyncState;
  pendingSyncCount: number;
  lastSyncedAt: string | null;

  // Auth
  initAuth: () => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  confirmPasswordReset: (newPassword: string) => Promise<{ error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error?: string }>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<{ error?: string }>;

  // Businesses
  addBusiness: (input: Omit<Business, "id" | "ownerId" | "ownerEmail" | "createdAt" | "plan">) => string;
  switchBusiness: (id: string) => void;
  updateBusiness: (patch: Partial<Business>) => void;

  // Materials
  addMaterial: (material: Omit<Material, "id" | "businessId">) => string;
  updateMaterial: (id: string, patch: Partial<Material>) => void;
  removeMaterial: (id: string) => void;
  restockMaterial: (entry: Omit<RestockEntry, "id" | "businessId">) => void;

  // Products
  addProduct: (product: Omit<Product, "id" | "businessId">) => string;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;

  // Batches
  logBatch: (
    batch: Omit<Batch, "id" | "businessId" | "batchNumber" | "status"> & { productCode: string },
  ) => string;
  updateBatch: (id: string, patch: Partial<Batch>) => void;

  // Sales
  logSale: (sale: Omit<Sale, "id" | "businessId">) => void;

  // Settings
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => void;

  // Sync
  syncNow: () => Promise<void>;

  // Danger zone
  deleteAllData: () => Promise<void>;

  // Data export (Nigeria Data Protection Act — right to receive a copy)
  exportAllData: () => Promise<{ data?: AccountExport; error?: string }>;
}

const emptyBusiness: Business = { id: "", ownerId: "", currency: "NGN", ownerEmail: "", createdAt: "", plan: "free" };
const emptyNotificationSettings: NotificationSettings = {
  businessId: "",
  lowStockAlerts: true,
  batchReadyAlerts: true,
  dailySummary: false,
  syncIssueAlerts: true,
};

function nextBatchNumber(productCode: string, dateMade: string, existing: Batch[]): string {
  const d = new Date(dateMade);
  const yymmdd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  const prefix = `${productCode}-${yymmdd}-`;
  const sameDay = existing.filter((b) => b.batchNumber.startsWith(prefix));
  const nn = String(sameDay.length + 1).padStart(2, "0");
  return `${prefix}${nn}`;
}

/** Fire-and-forget: push a Low Stock alert for materials that just crossed
 * their reorder point in this mutation (edge-triggered — only newly-low
 * materials, not every already-low one, so this doesn't re-notify on every
 * subsequent batch). Never throws into the caller; a failed/unsent push
 * shouldn't block or roll back the batch that's already been logged. */
function notifyNewlyLowStock(before: Material[], after: Material[], products: Product[], businessId: string, alertsEnabled: boolean) {
  if (!alertsEnabled) return;
  const newlyLow = after.filter((m) => {
    const prior = before.find((p) => p.id === m.id);
    return prior && prior.currentStock > prior.reorderPoint && m.currentStock <= m.reorderPoint;
  });
  if (newlyLow.length === 0) return;

  const lines = newlyLow.map((m) => {
    const affected = productsUsingMaterial(m.id, products)
      .map((p) => p.name)
      .join(", ");
    return affected ? `${m.name}: affects ${affected}` : m.name;
  });

  void supabase.functions
    .invoke("send-push", {
      body: {
        businessId,
        title: newlyLow.length === 1 ? "Low Stock Alert" : `${newlyLow.length} Materials Low`,
        body: lines.join("; "),
        url: "/materials",
      },
    })
    .catch(() => {
      // Best-effort — no subscription, no VAPID config, or a network blip
      // shouldn't surface as an error to whoever just logged a batch.
    });
}

/** Queue a write for the given table/row, then attempt to flush the whole
 * outbox in the background. Call after every optimistic local mutation.
 * Returns the queued op's id — pass it as a follow-up op's `causedByOpId`
 * when that op is only a side effect of this one (e.g. a material
 * stock-upsert queued right after the batch/restock that changed the
 * stock), so a permanent rejection of this op can precisely discard just
 * its own dependents later (see lib/outbox.ts's discardQueuedOpsCausedBy). */
function queueAndFlush(op: {
  table: Parameters<typeof enqueue>[0]["table"];
  kind: "upsert" | "delete";
  row?: Record<string, unknown>;
  rowId?: string;
  causedByOpId?: string;
}): string {
  const opId = enqueue(op);
  useAppStore.setState({ syncState: navigator.onLine ? "pending" : "offline", pendingSyncCount: outboxLength() });
  void flushOutbox().then(({ remaining }) => {
    useAppStore.setState((s) => ({
      syncState: remaining > 0 ? (navigator.onLine ? "pending" : "offline") : "synced",
      pendingSyncCount: remaining,
      lastSyncedAt: remaining > 0 ? s.lastSyncedAt : new Date().toISOString(),
    }));
  });
  return opId;
}

const clearedBusinessData = {
  materials: [] as Material[],
  products: [] as Product[],
  batches: [] as Batch[],
  sales: [] as Sale[],
  restocks: [] as RestockEntry[],
  notificationSettings: emptyNotificationSettings,
};

let businessLoadInFlight: Promise<void> | null = null;

// Module-level (not store-state) guard: React 18 StrictMode double-invokes
// effects in dev without waiting for the first one's async work to resolve,
// so a check against `authChecked` store state (still false at that point)
// doesn't prevent a second onAuthStateChange listener from being registered.
// This flag is set synchronously on the very first call, so it does.
let authListenerRegistered = false;

let connectivityListenerRegistered = false;

/** Proactive online/offline detection — without this, syncState only ever
 * gets reevaluated when a mutation happens to queueAndFlush(), so losing
 * signal while just browsing (no edits) left the sync badge frozen on a now
 * -wrong "Synced" until the next edit. These fire on the actual browser
 * connectivity transition instead, and surface a brief toast either way. */
function registerConnectivityListeners() {
  if (connectivityListenerRegistered) return;
  connectivityListenerRegistered = true;

  window.addEventListener("offline", () => {
    useAppStore.setState({ syncState: "offline" });
    useToastStore.getState().showToast("You're offline. Changes will sync when you're back online.", "warning");
  });

  window.addEventListener("online", () => {
    const hadPending = outboxLength() > 0;
    useAppStore.setState({ syncState: "pending" });
    void flushOutbox().then(({ remaining }) => {
      useAppStore.setState((s) => ({
        syncState: remaining > 0 ? "pending" : "synced",
        pendingSyncCount: remaining,
        lastSyncedAt: remaining > 0 ? s.lastSyncedAt : new Date().toISOString(),
      }));
      if (remaining === 0) {
        useToastStore.getState().showToast(hadPending ? "Back online. Everything's synced." : "Back online.", "success");
      }
    });
  });
}

/** Fetch materials/products/batches/sales/restocks/notification_settings for
 * one business (the business row itself is already known — see
 * loadBusinesses). */
async function loadBusinessData(businessId: string, attempt = 0): Promise<void> {
  const [materialsRes, productsRes, batchesRes, salesRes, restocksRes, notifRes] = await Promise.all([
    supabase.from("materials").select("*").eq("business_id", businessId),
    supabase.from("products").select("*").eq("business_id", businessId),
    supabase.from("batches").select("*").eq("business_id", businessId),
    supabase.from("sales").select("*").eq("business_id", businessId),
    supabase.from("restock_entries").select("*").eq("business_id", businessId),
    // .maybeSingle() (not .single()) — no row yet is possible for a beat
    // right after addBusiness's own insert, not an error worth surfacing.
    supabase.from("notification_settings").select("*").eq("business_id", businessId).maybeSingle(),
  ]);

  if (!notifRes.data && attempt < 1) {
    await new Promise((r) => setTimeout(r, 500));
    return loadBusinessData(businessId, attempt + 1);
  }

  // Stale: the active business may have changed again while this was in flight.
  if (useAppStore.getState().business.id !== businessId) return;

  useAppStore.setState({
    materials: (materialsRes.data ?? []).map((r) => rowToCamel<Material>(r)),
    products: (productsRes.data ?? []).map((r) => rowToCamel<Product>(r)),
    batches: (batchesRes.data ?? []).map((r) => rowToCamel<Batch>(r)),
    sales: (salesRes.data ?? []).map((r) => rowToCamel<Sale>(r)),
    restocks: (restocksRes.data ?? []).map((r) => rowToCamel<RestockEntry>(r)),
    notificationSettings: notifRes.data
      ? rowToCamel<NotificationSettings>(notifRes.data)
      : { ...emptyNotificationSettings, businessId },
    dataLoaded: true,
  });

  // Catch up any writes queued while this device was offline/signed-out.
  void flushOutbox();
}

/** Fetch every business this login owns, pick the active one (last-used if
 * still valid, else the first), and load its data. Zero businesses is a
 * valid state right after signup — drives needsBusinessSetup. */
async function loadBusinesses(ownerId: string): Promise<void> {
  const { data } = await supabase.from("businesses").select("*").eq("owner_id", ownerId);
  const list = (data ?? []).map((r) => rowToCamel<Business>(r));

  // Stale: signed out (or a different user signed in) while this was in flight.
  if (useAppStore.getState().authUserId !== ownerId) return;

  const cachedActiveId = useAppStore.getState().activeBusinessId;
  const active = list.find((b) => b.id === cachedActiveId) ?? list[0] ?? null;

  // Cached per-business data left over from a different business (or a
  // different account on a shared device) must never leak into this one.
  const activeChanged = useAppStore.getState().business.id !== (active?.id ?? "");

  useAppStore.setState({
    businesses: list,
    business: active ?? emptyBusiness,
    activeBusinessId: active?.id ?? null,
    needsBusinessSetup: list.length === 0,
    ...(activeChanged ? clearedBusinessData : {}),
    dataLoaded: active === null,
  });

  if (active) {
    await loadBusinessData(active.id);
  }
}

/** Fetch the plan_limits reference table once — see lib/planLimits.ts for
 * why the client reads these numbers instead of hardcoding a duplicate. */
async function loadPlanLimits(): Promise<void> {
  const { data } = await supabase.from("plan_limits").select("*");
  if (!data) return;
  const byPlan: PlanLimitsByPlan = {};
  for (const row of data as Record<string, unknown>[]) {
    byPlan[row.plan as string] = {
      monthlyBatches: (row.monthly_batches as number | null) ?? null,
      monthlyRestocks: (row.monthly_restocks as number | null) ?? null,
      maxBusinesses: (row.max_businesses as number | null) ?? null,
      maxProducts: (row.max_products as number | null) ?? null,
    };
  }
  useAppStore.setState({ planLimits: byPlan });
}

let rejectionHandlerRegistered = false;

/** Reacts to a write the outbox has determined can never succeed (see
 * lib/outbox.ts's onPermanentRejection) — purges the corresponding local
 * entity rather than leaving it stuck retrying forever, which is the whole
 * point of the free-plan "purged, not silently dropped" decision. Only
 * batches/restock_entries (their own independent caps), businesses (the
 * 1-business cap), and products (the 1-product cap) can ever be rejected
 * this way — see supabase/migrations/0007_split_freemium_caps.sql. */
function registerRejectionHandler() {
  if (rejectionHandlerRegistered) return;
  rejectionHandlerRegistered = true;

  onPermanentRejection((op) => {
    const id = (op.row?.id as string | undefined) ?? op.rowId;
    if (!id) return;

    if (op.table === "batches" || op.table === "restock_entries") {
      // The material stock-upsert op(s) queued right after this one were
      // computed off a deduction/addition that never actually happened
      // server-side — sending them now would corrupt real stock. They're
      // still queued at this point (batches/restocks are always enqueued
      // before their material follow-ups, and the outbox is strict FIFO),
      // so drop them before they're ever attempted. Matched by opId (via
      // causedByOpId), not by which material they touch — a *different*,
      // still-legitimate op queued later for the same material (e.g. an
      // unrelated restock) must not get swept up in this.
      discardQueuedOpsCausedBy(op.opId);

      useAppStore.setState((s) => ({
        batches: op.table === "batches" ? s.batches.filter((b) => b.id !== id) : s.batches,
        restocks: op.table === "restock_entries" ? s.restocks.filter((r) => r.id !== id) : s.restocks,
      }));

      // Resync material stock from the server rather than hand-reversing
      // the optimistic deduction/addition locally — the server is the
      // source of truth, and this avoids a second class of manual-delta
      // bugs (the same category as the outbox snapshot bug fixed earlier
      // in this project).
      const businessId = useAppStore.getState().business.id;
      if (businessId) void loadBusinessData(businessId);

      useToastStore
        .getState()
        .showToast("Not saved: you've reached this month's free-plan limit. Upgrade to log more.", "warning");
    } else if (op.table === "businesses") {
      // addBusiness() always makes the new business the active one
      // immediately, so the rejected business is very likely (though not
      // guaranteed, if the user switched away in the meantime) the one
      // currently active — fall back to a remaining business the same way
      // switchBusiness() does, rather than leaving a dangling reference to
      // a business that no longer exists locally.
      const state = useAppStore.getState();
      const remaining = state.businesses.filter((b) => b.id !== id);
      const wasActive = state.business.id === id;
      const fallback = wasActive ? (remaining[0] ?? null) : null;

      useAppStore.setState({
        businesses: remaining,
        ...(wasActive
          ? {
              business: fallback ?? emptyBusiness,
              activeBusinessId: fallback?.id ?? null,
              needsBusinessSetup: remaining.length === 0,
              ...clearedBusinessData,
              dataLoaded: fallback === null,
            }
          : {}),
      });
      if (fallback) void loadBusinessData(fallback.id);

      useToastStore
        .getState()
        .showToast("Not saved: free accounts are limited to 1 business. Upgrade to add more.", "warning");
    } else if (op.table === "products") {
      // addProduct() has no dependent ops queued after it (unlike
      // batches/restocks, which also queue a material stock-upsert) — just
      // drop the locally-added product itself, no discard/resync needed.
      useAppStore.setState((s) => ({ products: s.products.filter((p) => p.id !== id) }));

      useToastStore
        .getState()
        .showToast("Not saved: free accounts are limited to 1 product. Upgrade to add more.", "warning");
    }
  });
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      authChecked: false,
      isAuthenticated: false,
      isPasswordRecovery: false,
      userEmail: null,
      authUserId: null,
      dataLoaded: false,
      needsBusinessSetup: false,

      businesses: [],
      business: emptyBusiness,
      activeBusinessId: null,
      planLimits: {},

      materials: [],
      products: [],
      batches: [],
      sales: [],
      restocks: [],
      notificationSettings: emptyNotificationSettings,

      syncState: "synced",
      pendingSyncCount: 0,
      lastSyncedAt: null,

      initAuth: () => {
        registerConnectivityListeners();
        registerRejectionHandler();

        if (authListenerRegistered) return;
        authListenerRegistered = true;

        supabase.auth.onAuthStateChange((event, session) => {
          const user = session?.user ?? null;
          set({
            isAuthenticated: !!user,
            // Only a real "PASSWORD_RECOVERY" event (fired when the emailed
            // recovery link's token gets consumed) turns this on. A plain
            // sign-in/sign-out explicitly turns it back off; any other event
            // (token refresh, user-updated after the reset itself) leaves it
            // as-is so it doesn't flip off mid-flow.
            ...(event === "PASSWORD_RECOVERY"
              ? { isPasswordRecovery: true }
              : event === "SIGNED_IN" || event === "SIGNED_OUT"
                ? { isPasswordRecovery: false }
                : {}),
            userEmail: user?.email ?? null,
            authUserId: user?.id ?? null,
            authChecked: true,
            // Force the gate back to "loading" on every auth transition —
            // closes a real race where dataLoaded/needsBusinessSetup left
            // over from a PREVIOUS session (e.g. signing into a different
            // account without an intervening sign-out) could otherwise
            // still read true/true here and briefly redirect to
            // /setup-business before this user's own loadBusinesses() call
            // below has a chance to set the real values.
            dataLoaded: false,
          });
          if (user) {
            if (!businessLoadInFlight) {
              businessLoadInFlight = loadBusinesses(user.id).finally(() => {
                businessLoadInFlight = null;
              });
            }
            void loadPlanLimits();
          } else {
            set({
              businesses: [],
              business: emptyBusiness,
              activeBusinessId: null,
              needsBusinessSetup: false,
              ...clearedBusinessData,
              dataLoaded: false,
            });
          }
        });
      },

      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
      },
      signUp: async (email, password) => {
        // Explicit emailRedirectTo rather than relying solely on the
        // Supabase Dashboard's Site URL default — this way it's correct in
        // every environment (dev, preview, production) automatically, and
        // it's self-documenting which screen actually handles the
        // confirmation link. Still needs `${origin}/**` in the Dashboard's
        // Redirect URLs allow-list — Supabase rejects an emailRedirectTo
        // that isn't allow-listed, as an open-redirect guard.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/email-confirmed` },
        });
        if (error) return { error: error.message };
        return { needsConfirmation: !data.session };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      resetPassword: async (email) => {
        // Same reasoning as signUp's emailRedirectTo: explicit, not left to
        // the Dashboard's Site URL default, so it's correct in every
        // environment. /reset-password is where the recovery link's session
        // actually gets caught and turned into a "set a new password" form.
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        return error ? { error: error.message } : {};
      },
      confirmPasswordReset: async (newPassword) => {
        // Deliberately does NOT re-verify a "current password" like
        // changePassword does below — there isn't one to check (the whole
        // point is the caller forgot it). The recovery-type session itself,
        // established by clicking the emailed link, is what proves account
        // ownership here.
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        // One-time use, same as the emailed link itself — otherwise
        // navigating back to /reset-password later in this same browser
        // session (still isAuthenticated from the update above) would
        // re-open the "set a new password" form with nothing gating it.
        if (!error) set({ isPasswordRecovery: false });
        return error ? { error: error.message } : {};
      },
      changePassword: async (currentPassword, newPassword) => {
        // updateUser() doesn't check the caller's current password on its
        // own, so re-verify it with a real sign-in first (this also refuses
        // the change outright if the "current password" field was wrong).
        const email = get().userEmail;
        if (!email) return { error: "Not signed in." };
        const reauth = await supabase.auth.signInWithPassword({ email, password: currentPassword });
        if (reauth.error) return { error: "Current password is incorrect." };
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return error ? { error: error.message } : {};
      },
      changeEmail: async (newEmail, currentPassword) => {
        const email = get().userEmail;
        if (!email) return { error: "Not signed in." };
        const reauth = await supabase.auth.signInWithPassword({ email, password: currentPassword });
        if (reauth.error) return { error: "Current password is incorrect." };
        // Supabase sends confirmation link(s) itself; the change only takes
        // effect once the user clicks through, so userEmail here isn't
        // updated locally yet.
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        return error ? { error: error.message } : {};
      },

      addBusiness: (input) => {
        const id = crypto.randomUUID();
        const ownerId = get().authUserId ?? "";
        const ownerEmail = get().userEmail ?? "";
        const full: Business = {
          ...input,
          id,
          ownerId,
          ownerEmail,
          createdAt: new Date().toISOString().slice(0, 10),
          plan: "free",
        };
        const notif: NotificationSettings = { ...emptyNotificationSettings, businessId: id };

        set((s) => ({
          businesses: [...s.businesses, full],
          business: full,
          activeBusinessId: id,
          needsBusinessSetup: false,
          ...clearedBusinessData,
          notificationSettings: notif,
          dataLoaded: true,
        }));
        queueAndFlush({ table: "businesses", kind: "upsert", row: toSnakeRow(full) });
        queueAndFlush({ table: "notification_settings", kind: "upsert", row: toSnakeRow(notif) });
        return id;
      },
      switchBusiness: (id) => {
        if (id === get().business.id) return;
        const target = get().businesses.find((b) => b.id === id);
        if (!target) return;
        set({ business: target, activeBusinessId: id, ...clearedBusinessData, dataLoaded: false });
        void loadBusinessData(id);
      },
      updateBusiness: (patch) => {
        const updated = { ...get().business, ...patch };
        set((s) => ({ business: updated, businesses: s.businesses.map((b) => (b.id === updated.id ? updated : b)) }));
        // Upsert the FULL row, not just the patch — Postgres's
        // INSERT..ON CONFLICT DO UPDATE (what an upsert compiles to)
        // validates NOT NULL constraints, and RLS's WITH CHECK, against the
        // literal proposed row *before* it resolves the conflict. A partial
        // payload that omits a required column (owner_id, owner_email) or
        // an RLS-checked one fails there even though the row already
        // exists and would've just updated cleanly. Same reasoning applies
        // to every other update* action below.
        queueAndFlush({ table: "businesses", kind: "upsert", row: toSnakeRow(updated) });
      },

      addMaterial: (material) => {
        const id = crypto.randomUUID();
        const businessId = get().business.id;
        const full: Material = { ...material, id, businessId };
        set((s) => ({ materials: [...s.materials, full] }));
        queueAndFlush({ table: "materials", kind: "upsert", row: toSnakeRow(full) });
        return id;
      },
      updateMaterial: (id, patch) => {
        const updated = get().materials.find((m) => m.id === id);
        if (!updated) return;
        const full = { ...updated, ...patch };
        set((s) => ({ materials: s.materials.map((m) => (m.id === id ? full : m)) }));
        queueAndFlush({ table: "materials", kind: "upsert", row: toSnakeRow(full) });
      },
      removeMaterial: (id) => {
        set((s) => ({ materials: s.materials.filter((m) => m.id !== id) }));
        queueAndFlush({ table: "materials", kind: "delete", rowId: id });
      },
      restockMaterial: (entry) => {
        const id = crypto.randomUUID();
        const businessId = get().business.id;
        const full: RestockEntry = { ...entry, id, businessId };
        set((s) => ({
          restocks: [...s.restocks, full],
          materials: s.materials.map((m) =>
            m.id === entry.materialId
              ? { ...m, currentStock: m.currentStock + entry.quantity, costPerUnit: entry.costPerUnit ?? m.costPerUnit }
              : m,
          ),
        }));
        const restockOpId = queueAndFlush({ table: "restock_entries", kind: "upsert", row: toSnakeRow(full) });
        const material = get().materials.find((m) => m.id === entry.materialId);
        if (material) {
          queueAndFlush({ table: "materials", kind: "upsert", row: toSnakeRow(material), causedByOpId: restockOpId });
        }
      },

      addProduct: (product) => {
        const id = crypto.randomUUID();
        const businessId = get().business.id;
        const full: Product = { ...product, id, businessId };
        set((s) => ({ products: [...s.products, full] }));
        queueAndFlush({ table: "products", kind: "upsert", row: toSnakeRow(full) });
        return id;
      },
      updateProduct: (id, patch) => {
        const existing = get().products.find((p) => p.id === id);
        if (!existing) return;
        const full = { ...existing, ...patch };
        set((s) => ({ products: s.products.map((p) => (p.id === id ? full : p)) }));
        queueAndFlush({ table: "products", kind: "upsert", row: toSnakeRow(full) });
      },
      removeProduct: (id) => {
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
        queueAndFlush({ table: "products", kind: "delete", rowId: id });
      },

      logBatch: ({ productCode, ...batch }) => {
        const id = crypto.randomUUID();
        const businessId = get().business.id;
        const batchNumber = nextBatchNumber(productCode, batch.dateMade, get().batches);
        const materialsBefore = get().materials;
        // Freeze each material's current cost into the batch record itself —
        // see BatchMaterialUsed.costPerUnit. Without this, Reports/Batch
        // Detail cost figures for this batch would silently drift later
        // whenever the material gets restocked at a different price, since
        // there'd be nothing left but the material's CURRENT cost to read.
        const materialsUsedWithCost = batch.materialsUsed.map((used) => ({
          ...used,
          costPerUnit: materialsBefore.find((m) => m.id === used.materialId)?.costPerUnit,
        }));
        const newBatch: Batch = {
          ...batch,
          materialsUsed: materialsUsedWithCost,
          id,
          businessId,
          batchNumber,
          status: "curing",
        };
        set((s) => ({
          batches: [...s.batches, newBatch],
          materials: s.materials.map((m) => {
            const used = newBatch.materialsUsed.find((u) => u.materialId === m.id);
            if (!used) return m;
            return { ...m, currentStock: Math.max(0, m.currentStock - used.actualQuantity) };
          }),
        }));
        const batchOpId = queueAndFlush({ table: "batches", kind: "upsert", row: toSnakeRow(newBatch) });
        for (const used of newBatch.materialsUsed) {
          const material = get().materials.find((m) => m.id === used.materialId);
          if (material) queueAndFlush({ table: "materials", kind: "upsert", row: toSnakeRow(material), causedByOpId: batchOpId });
        }
        notifyNewlyLowStock(materialsBefore, get().materials, get().products, businessId, get().notificationSettings.lowStockAlerts);
        return id;
      },
      updateBatch: (id, patch) => {
        const existing = get().batches.find((b) => b.id === id);
        if (!existing) return;
        const full = { ...existing, ...patch };
        set((s) => ({ batches: s.batches.map((b) => (b.id === id ? full : b)) }));
        queueAndFlush({ table: "batches", kind: "upsert", row: toSnakeRow(full) });
      },

      logSale: (sale) => {
        const id = crypto.randomUUID();
        const businessId = get().business.id;
        const full: Sale = { ...sale, id, businessId };
        set((s) => ({ sales: [...s.sales, full] }));
        queueAndFlush({ table: "sales", kind: "upsert", row: toSnakeRow(full) });

        const batch = get().batches.find((b) => b.id === sale.batchId);
        if (batch) {
          const soldSoFar = get()
            .sales.filter((s) => s.batchId === batch.id)
            .reduce((sum, s) => sum + s.quantitySold, 0);
          const remaining = batch.actualYield - soldSoFar;
          get().updateBatch(batch.id, { status: remaining <= 0 ? "sold_out" : "selling" });
        }
      },

      updateNotificationSettings: (patch) => {
        const full = { ...get().notificationSettings, ...patch };
        set({ notificationSettings: full });
        queueAndFlush({ table: "notification_settings", kind: "upsert", row: toSnakeRow(full) });
      },

      syncNow: async () => {
        const { remaining } = await flushOutbox();
        set({
          syncState: remaining > 0 ? "offline" : "synced",
          pendingSyncCount: remaining,
          lastSyncedAt: remaining > 0 ? get().lastSyncedAt : new Date().toISOString(),
        });
      },

      deleteAllData: async () => {
        // Deleting the auth user themselves needs a service-role key, which
        // must never ship client-side — that boundary lives in the
        // `delete-account` Edge Function (supabase/functions/delete-account),
        // which Supabase auto-injects the key into server-side. We just
        // invoke it with the caller's own session (attached automatically by
        // supabase-js); on success `businesses.owner_id ... on delete cascade`
        // takes care of every business/material/product/batch/sale this
        // login owned, with no manual per-table deletes needed here.
        const { error } = await supabase.functions.invoke("delete-account");
        if (error) {
          throw new Error(error.message || "Failed to delete account. Please try again.");
        }
        await supabase.auth.signOut();
        set({ businesses: [], business: emptyBusiness, activeBusinessId: null, ...clearedBusinessData });
      },

      exportAllData: async () => {
        // Entirely client-side — the same RLS-scoped queries every other
        // screen already makes, just read directly here instead of going
        // through the store's cached state (which only holds the currently
        // ACTIVE business's data, not every business this login owns). No
        // new backend, no new service, no email involved: the caller
        // triggers a plain Blob download in the browser. Covers NDPA's
        // right to receive a copy of your data.
        const ownerId = get().authUserId;
        if (!ownerId) return { error: "Not signed in." };

        const { data: businessRows, error: bizError } = await supabase
          .from("businesses")
          .select("*")
          .eq("owner_id", ownerId);
        if (bizError) return { error: bizError.message };

        const businesses = (businessRows ?? []).map((r) => rowToCamel<Business>(r));
        const businessIds = businesses.map((b) => b.id);

        if (businessIds.length === 0) {
          return { data: { exportedAt: new Date().toISOString(), email: get().userEmail, businesses: [] } };
        }

        const [materials, products, batches, sales, restocks, notifSettings] = await Promise.all([
          supabase.from("materials").select("*").in("business_id", businessIds),
          supabase.from("products").select("*").in("business_id", businessIds),
          supabase.from("batches").select("*").in("business_id", businessIds),
          supabase.from("sales").select("*").in("business_id", businessIds),
          supabase.from("restock_entries").select("*").in("business_id", businessIds),
          supabase.from("notification_settings").select("*").in("business_id", businessIds),
        ]);
        const firstError = [materials, products, batches, sales, restocks, notifSettings].find((r) => r.error)?.error;
        if (firstError) return { error: firstError.message };

        const byBusiness = <T extends { businessId: string }>(rows: Record<string, unknown>[] | null): T[] =>
          (rows ?? []).map((r) => rowToCamel<T>(r));

        const materialRows = byBusiness<Material>(materials.data);
        const productRows = byBusiness<Product>(products.data);
        const batchRows = byBusiness<Batch>(batches.data);
        const saleRows = byBusiness<Sale>(sales.data);
        const restockRows = byBusiness<RestockEntry>(restocks.data);
        const notifRows = byBusiness<NotificationSettings>(notifSettings.data);

        const exportData: AccountExport = {
          exportedAt: new Date().toISOString(),
          email: get().userEmail,
          businesses: businesses.map((biz) => ({
            business: biz,
            materials: materialRows.filter((r) => r.businessId === biz.id),
            products: productRows.filter((r) => r.businessId === biz.id),
            batches: batchRows.filter((r) => r.businessId === biz.id),
            sales: saleRows.filter((r) => r.businessId === biz.id),
            restockEntries: restockRows.filter((r) => r.businessId === biz.id),
            notificationSettings: notifRows.find((r) => r.businessId === biz.id) ?? null,
          })),
        };
        return { data: exportData };
      },
    }),
    {
      name: "production-log-store",
      // Auth state comes from Supabase's own session (persisted separately
      // by supabase-js) — don't let zustand's persist double-cache it, or
      // the two can disagree about who's signed in after a manual sign-out.
      // needsBusinessSetup is derived fresh on every load, not persisted.
      partialize: (s) => ({
        businesses: s.businesses,
        business: s.business,
        activeBusinessId: s.activeBusinessId,
        materials: s.materials,
        products: s.products,
        batches: s.batches,
        sales: s.sales,
        restocks: s.restocks,
        notificationSettings: s.notificationSettings,
      }),
    },
  ),
);
