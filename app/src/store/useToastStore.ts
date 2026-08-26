import { create } from "zustand";

// Ephemeral, unpersisted — toasts are transient UI, not app state that
// should survive a reload. Separate from useAppStore so its persist
// middleware never has to think about this.

export type ToastTone = "info" | "success" | "warning";

interface ToastState {
  toast: { id: string; message: string; tone: ToastTone } | null;
  showToast: (message: string, tone?: ToastTone) => void;
  dismissToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (message, tone = "info") => set({ toast: { id: crypto.randomUUID(), message, tone } }),
  dismissToast: () => set({ toast: null }),
}));
