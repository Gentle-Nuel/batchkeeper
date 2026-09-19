import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, RefreshCw, Check, CloudOff, Eye, EyeOff, Circle } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import type { BatchStatus, NafdacStatus } from "../types/models";
import { PASSWORD_RULES } from "../lib/passwordRules";
import { Sheet, type SheetHandle } from "./Sheet";

// ---- Sync status badge ---------------------------------------------------

export function SyncBadge() {
  const syncState = useAppStore((s) => s.syncState);
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);

  const config = {
    synced: { icon: Check, label: "Synced", cls: "text-teal bg-teal/10" },
    pending: { icon: RefreshCw, label: `Syncing ${pendingSyncCount}`, cls: "text-status-curing-text bg-status-curing-bg" },
    offline: { icon: CloudOff, label: "Offline", cls: "text-text-secondary bg-input-fill" },
  }[syncState];

  const Icon = config.icon;
  return (
    <span
      id="sync-badge"
      className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[10px] font-semibold ${config.cls}`}
    >
      <Icon size={11} className={syncState === "pending" ? "animate-spin" : ""} />
      {config.label}
    </span>
  );
}

// ---- Page header ----------------------------------------------------------

// Both headers are sticky so the title (and, on BackHeader, the only way
// back) stay reachable on any screen long enough to scroll -- previously
// plain in-flow divs, so scrolling down on e.g. Settings took the back
// button off-screen with no way to invoke it short of scrolling all the
// way back up. An explicit bg-bg is required for a sticky element to look
// right over scrolling content underneath it (otherwise the content shows
// through beneath what should read as an opaque bar). z-20 sits below
// BottomNav's z-30 and ConfirmDialog's z-40, so neither gets covered.
export function PageHeader({
  title,
  showSync = true,
  right,
}: {
  title: string;
  showSync?: boolean;
  right?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between bg-bg px-5 pt-5 pb-2">
      <h1 className="text-[24px] font-semibold text-text leading-tight">{title}</h1>
      <div className="flex items-center gap-2">
        {right}
        {showSync && <SyncBadge />}
      </div>
    </div>
  );
}

export function BackHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 bg-bg px-5 pt-5 pb-2">
      <button
        onClick={onBack}
        aria-label="Back"
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text after:absolute after:-inset-[6px]"
      >
        <ChevronRightIcon flip />
      </button>
      <h1 className="flex-1 text-[24px] font-semibold text-text leading-tight truncate">{title}</h1>
      {right}
    </div>
  );
}

function ChevronRightIcon({ flip }: { flip?: boolean }) {
  return (
    <span className={flip ? "rotate-180 inline-flex" : "inline-flex"}>
      <ChevronRight size={18} />
    </span>
  );
}

// ---- Status pills -----------------------------------------------------------

const batchStatusMeta: Record<BatchStatus, { label: string; bg: string; text: string }> = {
  curing: { label: "PROCESSING", bg: "bg-status-curing-bg", text: "text-status-curing-text" },
  ready: { label: "READY", bg: "bg-status-ready-bg", text: "text-status-ready-text" },
  selling: { label: "SELLING", bg: "bg-status-ready-bg", text: "text-status-ready-text" },
  sold_out: { label: "SOLD OUT", bg: "bg-status-soldout-bg", text: "text-status-soldout-text" },
};

export function BatchStatusPill({ status }: { status: BatchStatus }) {
  const m = batchStatusMeta[status];
  return (
    <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

const nafdacMeta: Record<NafdacStatus, { label: string; bg: string; text: string }> = {
  registered: { label: "REGISTERED", bg: "bg-status-ready-bg", text: "text-status-ready-text" },
  in_process: { label: "IN PROCESS", bg: "bg-status-curing-bg", text: "text-status-curing-text" },
  not_registered: { label: "NOT REGISTERED", bg: "bg-status-soldout-bg", text: "text-status-soldout-text" },
};

export function NafdacPill({ status }: { status: NafdacStatus }) {
  const m = nafdacMeta[status];
  return (
    <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

// ---- Cards / layout --------------------------------------------------------

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-border bg-surface p-4 ${className}`}>{children}</div>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-dvh w-full max-w-md bg-bg pb-24">{children}</div>;
}

export function Section({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-5 py-3">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-[16px] font-semibold text-text">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ---- Form inputs ------------------------------------------------------------

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{children}</div>;
}

export function BoxedInput({
  label,
  ...props
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  const isPassword = props.type === "password";
  return (
    <label className="block">
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="relative">
        <input
          {...props}
          type={isPassword ? (visible ? "text" : "password") : props.type}
          className={`w-full rounded-input border border-border bg-input-fill px-3 py-2.5 text-[16px] text-text outline-none focus:border-teal ${
            isPassword ? "pr-10" : ""
          } ${props.className ?? ""}`}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary after:absolute after:-inset-[14px]"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </label>
  );
}

/** Live checklist of password requirements — updates as the user types,
 * rather than only surfacing what's wrong after a failed submit. Shares
 * PASSWORD_RULES with the actual submit-time validation (lib/passwordRules)
 * so the two can never say different things. */
export function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="mt-1.5 flex flex-col gap-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 text-[12px] transition-colors ${met ? "text-teal" : "text-text-secondary"}`}
          >
            {met ? <Check size={13} /> : <Circle size={13} />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export function BoxedTextarea({
  label,
  ...props
}: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      {label && <FieldLabel>{label}</FieldLabel>}
      <textarea
        {...props}
        className={`w-full rounded-input border border-border bg-input-fill px-3 py-2.5 text-[16px] text-text outline-none focus:border-teal ${props.className ?? ""}`}
      />
    </label>
  );
}

export function BoxedSelect({
  label,
  children,
  ...props
}: { label?: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label && <FieldLabel>{label}</FieldLabel>}
      <select
        {...props}
        className={`w-full rounded-input border border-border bg-input-fill px-3 py-2.5 text-[16px] text-text outline-none focus:border-teal ${props.className ?? ""}`}
      >
        {children}
      </select>
    </label>
  );
}

export function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="text-[14px] text-text">{value}</div>
    </div>
  );
}

// ---- Buttons ----------------------------------------------------------------

export function PrimaryButton({
  children,
  arrow = false,
  className = "",
  ...props
}: { children: ReactNode; arrow?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex w-full items-center justify-center gap-2 rounded-card bg-teal px-4 py-3.5 text-[14px] font-semibold text-white active:bg-teal-dark disabled:opacity-50 ${className}`}
    >
      {children}
      {arrow && <ChevronRight size={16} />}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex w-full items-center justify-center gap-2 rounded-card border border-border bg-surface px-4 py-3.5 text-[14px] font-semibold text-text active:bg-input-fill ${className}`}
    >
      {children}
    </button>
  );
}

export function DeleteLink({ children, ...props }: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className="mx-auto flex items-center gap-1.5 text-[14px] font-semibold text-danger">
      {children}
    </button>
  );
}

/** Small confirm-before-destroy dialog for single-item deletes (Remove
 * material, Delete product). Delete Account gets its own dedicated full
 * screen instead — this is for the lighter, single-row case. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  /** "danger" (default) is red, for destructive actions like delete. "neutral"
   * is teal, for actions worth a beat before firing (Sign Out, Export) that
   * aren't actually risky — red styling there would misleadingly imply harm. */
  tone?: "danger" | "neutral";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Kept mounted after `open` goes false so the sheet can slide out instead of
  // vanishing. Opening mounts it at once; closing (Confirm, or the parent
  // flipping `open`) dismisses it and only then unmounts.
  const [mounted, setMounted] = useState(open);
  const sheetRef = useRef<SheetHandle>(null);
  useEffect(() => {
    if (open) setMounted(true);
    else sheetRef.current?.dismiss(() => setMounted(false));
  }, [open]);

  if (!mounted) return null;
  return (
    <Sheet
      ref={sheetRef}
      label={title}
      dragAnywhere
      // Reached when the user dismisses it (Cancel, scrim tap, Esc, drag down).
      onClose={() => {
        setMounted(false);
        onCancel();
      }}
    >
      <div className="rounded-t-frame border border-border bg-surface p-5 pb-8">
        <h3 className="text-[16px] font-semibold text-text">{title}</h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-text-secondary">{message}</p>
        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full rounded-card px-4 py-3.5 text-[14px] font-semibold text-white ${
              tone === "danger" ? "bg-danger" : "bg-teal active:bg-teal-dark"
            }`}
          >
            {confirmLabel}
          </button>
          <SecondaryButton type="button" onClick={() => sheetRef.current?.dismiss()}>
            Cancel
          </SecondaryButton>
        </div>
      </div>
    </Sheet>
  );
}

// ---- Toggle -------------------------------------------------------------

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        checked ? "border-teal bg-teal" : "border-border bg-input-fill"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ---- Menu row (More / Settings pattern) ------------------------------------

export function MenuRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-3.5 text-left"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-teal/10 text-teal">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-text">{title}</span>
        {subtitle && <span className="block truncate text-[12px] text-text-secondary">{subtitle}</span>}
      </span>
      <ChevronRight size={16} className="shrink-0 text-text-secondary" />
    </button>
  );
}
