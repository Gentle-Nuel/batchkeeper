import { useEffect } from "react";
import { CloudOff, CheckCircle2, Info } from "lucide-react";
import { useToastStore, type ToastTone } from "../store/useToastStore";

const TONE_STYLES: Record<ToastTone, { bg: string; icon: typeof Info }> = {
  info: { bg: "bg-text", icon: Info },
  success: { bg: "bg-teal", icon: CheckCircle2 },
  warning: { bg: "bg-status-curing-text", icon: CloudOff },
};

/** Rendered once at the app root so it survives navigation and shows
 * regardless of which screen is active. Auto-dismisses; the connectivity
 * listeners in useAppStore are what actually call showToast(). */
export function Toast() {
  const toast = useToastStore((s) => s.toast);
  const dismissToast = useToastStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dismissToast(), 3500);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);

  if (!toast) return null;
  const style = TONE_STYLES[toast.tone];
  const Icon = style.icon;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center">
      <div className="w-full max-w-md px-4 pt-4">
        <div
          role="status"
          className={`pointer-events-auto flex items-center gap-2 rounded-pill px-4 py-2.5 text-[12px] font-semibold text-white shadow-lg ${style.bg}`}
        >
          <Icon size={14} className="shrink-0" />
          <span>{toast.message}</span>
        </div>
      </div>
    </div>
  );
}
