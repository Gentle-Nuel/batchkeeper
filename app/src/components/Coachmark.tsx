import { useEffect, useLayoutEffect, useState } from "react";
import { useCoachmarkStore } from "../store/useCoachmarkStore";
import { useReducedMotion } from "../lib/useReducedMotion";

export interface CoachmarkStep {
  /** DOM id of the element to spotlight (simpler than ref-forwarding through
   * shared components like PageHeader/SyncBadge — just give the target
   * element a stable id). */
  targetId: string;
  title: string;
  body: string;
}

interface Placement {
  rect: DOMRect;
  /** True only for a step change, so the spotlight glides to the new target
   * but follows scrolling and resizing instantly with no lag behind it. */
  animate: boolean;
}

function sameRect(a: DOMRect, b: DOMRect) {
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

/** Spotlight-style first-time-visit hint sequence: dims the screen, cuts a
 * highlight around each step's target element in turn, with a small popover
 * explaining it. Shows once per `sequenceId` (tracked in useCoachmarkStore),
 * then never again on this device. Use one CoachmarkSequence per screen.
 *
 * The target is measured again whenever anything that could move it changes
 * (resize, scroll, the visual viewport, the target's own size), because a
 * single measurement goes stale on iOS as the browser toolbar collapses and
 * the page zooms or scrolls. Positions are taken against the layout viewport
 * (documentElement.client*) since that is what position: fixed resolves
 * against, not window.innerHeight, which iOS changes as its toolbar moves. */
export function CoachmarkSequence({ sequenceId, steps }: { sequenceId: string; steps: CoachmarkStep[] }) {
  const hasSeen = useCoachmarkStore((s) => s.hasSeen);
  const markSeen = useCoachmarkStore((s) => s.markSeen);
  const reduced = useReducedMotion();
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  useEffect(() => {
    if (hasSeen(sequenceId)) return;
    // Small delay so the screen has finished laying out (and any entrance
    // transition settled) before a target is first measured.
    const t = setTimeout(() => setStepIndex(0), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequenceId]);

  const step = stepIndex === null ? null : steps[stepIndex];
  const targetId = step?.targetId;

  // Measure on every step change (the spotlight glides over), retrying briefly
  // in case the target has not rendered yet.
  useLayoutEffect(() => {
    if (!targetId) {
      setPlacement(null);
      return;
    }
    const el = document.getElementById(targetId);
    if (el) {
      setPlacement({ rect: el.getBoundingClientRect(), animate: true });
      return;
    }
    setPlacement(null);
    let tries = 0;
    const id = window.setInterval(() => {
      const found = document.getElementById(targetId);
      if (found) {
        window.clearInterval(id);
        setPlacement({ rect: found.getBoundingClientRect(), animate: false });
      } else if (++tries >= 20) {
        window.clearInterval(id);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [targetId]);

  // Keep it on the target for as long as it is up. Checked every frame rather
  // than off resize/scroll events: content loading in above the target moves it
  // without resizing it or firing any event, and iOS shifts things as its
  // toolbar collapses and the page zooms. One rect read per frame is cheap, and
  // React skips the render whenever the rect has not changed.
  useEffect(() => {
    if (!targetId) return;
    let raf = 0;
    const track = () => {
      const el = document.getElementById(targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Unchanged: keep the previous state, so a step-change glide is not cut
        // short. Moved (scroll, layout shift, zoom): follow instantly, no glide.
        setPlacement((prev) => (prev && sameRect(prev.rect, rect) ? prev : { rect, animate: false }));
      }
      raf = requestAnimationFrame(track);
    };
    raf = requestAnimationFrame(track);
    return () => cancelAnimationFrame(raf);
  }, [targetId]);

  if (stepIndex === null || !placement || !step) return null;

  const { rect, animate } = placement;
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
  // The layout viewport is what position: fixed resolves against.
  const viewW = document.documentElement.clientWidth;
  const viewH = document.documentElement.clientHeight;
  const spaceBelow = viewH - rect.bottom;
  const showBelow = spaceBelow > 160;
  const popoverWidth = 260;
  const popoverLeft = Math.min(Math.max(16, rect.left), viewW - popoverWidth - 16);

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
          transition:
            animate && !reduced
              ? "top 0.32s cubic-bezier(0.22, 1, 0.36, 1), left 0.32s cubic-bezier(0.22, 1, 0.36, 1), width 0.32s cubic-bezier(0.22, 1, 0.36, 1), height 0.32s cubic-bezier(0.22, 1, 0.36, 1)"
              : "none",
        }}
      />
      {/* Keyed on the step so it re-plays its arrival for each one; it grows out
          of the edge facing the target it is explaining. */}
      <div
        key={stepIndex}
        role="dialog"
        aria-label={step.title}
        style={
          {
            position: "fixed",
            top: showBelow ? rect.bottom + pad + 10 : undefined,
            bottom: showBelow ? undefined : viewH - rect.top + pad + 10,
            left: popoverLeft,
            width: popoverWidth,
            zIndex: 61,
            transformOrigin: showBelow ? "top center" : "bottom center",
            "--coach-shift": showBelow ? "-6px" : "6px",
          } as React.CSSProperties
        }
        className="coach-pop rounded-card border border-border bg-surface p-4 shadow-lg"
      >
        <p className="text-[13px] font-semibold text-text">{step.title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={finish}
            className="relative text-[12px] font-semibold text-text-secondary after:absolute after:-inset-x-3 after:-inset-y-3"
          >
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
              className="relative rounded-pill bg-teal px-3 py-1.5 text-[12px] font-semibold text-white active:bg-teal-dark after:absolute after:-inset-y-2 after:-inset-x-1"
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
