import { useEffect, useLayoutEffect, useState } from "react";
import { useCoachmarkStore } from "../store/useCoachmarkStore";

export interface CoachmarkStep {
  /** DOM id of the element to spotlight (simpler than ref-forwarding through
   * shared components like PageHeader/SyncBadge — just give the target
   * element a stable id). */
  targetId: string;
  title: string;
  body: string;
}

/** Spotlight-style first-time-visit hint sequence: dims the screen, cuts a
 * highlight around each step's target element in turn, with a small popover
 * explaining it. Shows once per `sequenceId` (tracked in useCoachmarkStore),
 * then never again on this device. Use one CoachmarkSequence per screen. */
export function CoachmarkSequence({ sequenceId, steps }: { sequenceId: string; steps: CoachmarkStep[] }) {
  const hasSeen = useCoachmarkStore((s) => s.hasSeen);
  const markSeen = useCoachmarkStore((s) => s.markSeen);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (hasSeen(sequenceId)) return;
    // Small delay so the screen has finished laying out (and any entrance
    // transition settled) before a target's bounding box is measured.
    const t = setTimeout(() => setStepIndex(0), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequenceId]);

  useLayoutEffect(() => {
    if (stepIndex === null) return;
    const el = steps[stepIndex] ? document.getElementById(steps[stepIndex].targetId) : null;
    setRect(el ? el.getBoundingClientRect() : null);
  }, [stepIndex, steps]);

  if (stepIndex === null || !rect) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  function finish() {
    markSeen(sequenceId);
    setStepIndex(null);
  }
  function next() {
    if (isLast) finish();
    else setStepIndex((i) => (i ?? 0) + 1);
  }

  const pad = 6;
  const highlightTop = rect.top - pad;
  const highlightLeft = rect.left - pad;
  const spaceBelow = window.innerHeight - rect.bottom;
  const showBelow = spaceBelow > 160;
  const popoverWidth = 260;
  const popoverLeft = Math.min(Math.max(16, rect.left), window.innerWidth - popoverWidth - 16);

  return (
    <>
      {/* Dimmed backdrop with a "cut out" hole over the target, via the
          giant-box-shadow trick — no SVG mask needed. */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: highlightTop,
          left: highlightLeft,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          borderRadius: 14,
          boxShadow: "0 0 0 9999px rgba(15, 23, 21, 0.6)",
          pointerEvents: "none",
          zIndex: 60,
          transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
        }}
      />
      <div
        role="dialog"
        aria-label={step.title}
        style={{
          position: "fixed",
          top: showBelow ? rect.bottom + pad + 10 : undefined,
          bottom: showBelow ? undefined : window.innerHeight - rect.top + pad + 10,
          left: popoverLeft,
          width: popoverWidth,
          zIndex: 61,
        }}
        className="rounded-card border border-border bg-surface p-4 shadow-lg"
      >
        <p className="text-[13px] font-semibold text-text">{step.title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={finish} className="text-[12px] font-semibold text-text-secondary">
            Skip
          </button>
          <div className="flex items-center gap-2.5">
            {steps.length > 1 && (
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${i === stepIndex ? "bg-teal" : "bg-border"}`}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-pill bg-teal px-3 py-1.5 text-[12px] font-semibold text-white active:bg-teal-dark"
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
