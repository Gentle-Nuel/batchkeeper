import { create } from "zustand";
import { persist } from "zustand/middleware";

// First-time-visit coach-mark "seen" tracking. Deliberately separate from
// useAppStore: this is a device-level UI preference (has she dismissed this
// hint before), not business data — no businessId, no Supabase sync, no RLS.
// Lives in its own localStorage key so it's untouched by sign-out/account
// deletion logic in the main store.

interface CoachmarkState {
  seen: Record<string, boolean>;
  markSeen: (id: string) => void;
  hasSeen: (id: string) => boolean;
}

export const useCoachmarkStore = create<CoachmarkState>()(
  persist(
    (set, get) => ({
      seen: {},
      markSeen: (id) => set((s) => ({ seen: { ...s.seen, [id]: true } })),
      hasSeen: (id) => !!get().seen[id],
    }),
    { name: "production-log-coachmarks" },
  ),
);
