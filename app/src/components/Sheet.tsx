import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type ReactNode, type Ref } from "react";
import {
  SPRING_DEFAULT,
  SPRING_MOMENTUM,
  nearestPoint,
  project,
  rubberband,
  runSpring,
  type SpringConfig,
  type SpringRun,
} from "../lib/motion";
import { useReducedMotion } from "../lib/useReducedMotion";

export interface SheetHandle {
  /** Slides the sheet away. When it has gone, runs `after` if given, otherwise
   * the sheet's own `onClose`. Safe to call while it is already leaving. */
  dismiss: (after?: () => void) => void;
}

interface Sample {
  t: number;
  y: number;
}

/** How far a press must travel before it counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 10;
const FADE_MS = 150;

/** Bottom sheet with a scrim: springs in from below, follows the finger 1:1
 * when dragged, and on release picks stay-or-go from where the flick would
 * land (not from where the finger stopped) and hands the release velocity to
 * the spring. It can be grabbed again mid-animation and picks up from its live
 * position. It only unmounts itself by calling `onClose` once it has finished
 * leaving, so the parent should treat `onClose` as "it is gone, remove it".
 *
 * Dragging starts from the grabber and from anything marked `data-sheet-drag`
 * (or anywhere, with `dragAnywhere`, for sheets with nothing to scroll), so
 * content that scrolls keeps scrolling. */
export function Sheet({
  label,
  onClose,
  dragAnywhere = false,
  ref,
  children,
}: {
  label: string;
  onClose: () => void;
  dragAnywhere?: boolean;
  ref?: Ref<SheetHandle>;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(0);
  const yRef = useRef(0);
  const runRef = useRef<SpringRun | null>(null);
  const timerRef = useRef(0);
  const exitingRef = useRef(false);
  const afterRef = useRef<(() => void) | undefined>(undefined);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dragRef = useRef<{
    id: number;
    x0: number;
    y0: number;
    sheetY0: number;
    active: boolean;
    samples: Sample[];
    resume: { target: number; velocity: number } | null;
  } | null>(null);

  function setY(y: number) {
    yRef.current = y;
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (panel) panel.style.transform = `translate3d(0, ${y}px, 0)`;
    // The scrim fades in step with the sheet, so it tracks the finger too.
    if (scrim) scrim.style.opacity = String(1 - Math.min(Math.max(y / (heightRef.current || 1), 0), 1));
  }

  function finish() {
    runRef.current = null;
    const after = afterRef.current;
    afterRef.current = undefined;
    (after ?? onCloseRef.current)();
  }

  function moveTo(target: number, velocity: number, config: SpringConfig, done?: () => void) {
    runRef.current?.stop();
    window.clearTimeout(timerRef.current);
    if (reducedRef.current) {
      // Reduced motion: no travel, just a short fade.
      const panel = panelRef.current;
      const scrim = scrimRef.current;
      if (!panel || !scrim) return;
      const closing = target !== 0;
      panel.style.transition = scrim.style.transition = `opacity ${FADE_MS}ms`;
      setY(0);
      panel.style.opacity = scrim.style.opacity = closing ? "0" : "1";
      if (closing) timerRef.current = window.setTimeout(() => done?.(), FADE_MS);
      return;
    }
    runRef.current = runSpring({ from: yRef.current, to: target, velocity, config, onUpdate: setY, onDone: done });
  }

  function dismiss(after?: () => void) {
    if (after) afterRef.current = after;
    if (exitingRef.current) return;
    exitingRef.current = true;
    heightRef.current = panelRef.current?.offsetHeight ?? heightRef.current;
    moveTo(heightRef.current, 0, SPRING_DEFAULT, finish);
  }
  useImperativeHandle(ref, () => ({ dismiss }));

  // Enter.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    heightRef.current = panel.offsetHeight;
    if (reducedRef.current) {
      panel.style.opacity = "0";
      setY(0);
      void panel.offsetHeight; // commit opacity 0 so the fade has something to fade from
      moveTo(0, 0, SPRING_DEFAULT);
    } else {
      setY(heightRef.current);
      moveTo(0, 0, SPRING_DEFAULT);
    }
    return () => {
      runRef.current?.stop();
      runRef.current = null;
      window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus goes into the dialog, the page behind stops scrolling, and both are
  // put back when it goes.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  // Escape closes; Tab stays inside the dialog.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        dismiss();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    const inZone = dragAnywhere || !!(e.target as Element).closest("[data-sheet-drag]");
    if (!inZone) return;
    // Grabbed mid-animation: freeze right where it is on screen and carry its
    // velocity, so a tap resumes the same motion and a drag takes over from here.
    let resume: { target: number; velocity: number } | null = null;
    if (runRef.current) {
      const live = runRef.current.stop();
      runRef.current = null;
      yRef.current = live.value;
      resume = { target: exitingRef.current ? heightRef.current : 0, velocity: live.velocity };
    }
    dragRef.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, sheetY0: yRef.current, active: false, samples: [], resume };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        // Sideways: not ours.
        dragRef.current = null;
        if (d.resume) resumeAfterInterrupt(d.resume);
        return;
      }
      d.active = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // The pointer is already gone (an interrupted touch); the drag can still proceed without capture.
      }
    }
    // 1:1 with the finger, measured from where the sheet was when grabbed.
    const raw = d.sheetY0 + dy;
    setY(raw < 0 ? rubberband(raw, Math.min(heightRef.current, 300)) : raw);
    d.samples.push({ t: e.timeStamp, y: raw });
    if (d.samples.length > 8) d.samples.shift();
  }

  function resumeAfterInterrupt(r: { target: number; velocity: number }) {
    moveTo(r.target, r.velocity, SPRING_DEFAULT, r.target !== 0 ? finish : undefined);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d.active) {
      if (d.resume) resumeAfterInterrupt(d.resume);
      return;
    }
    // Velocity from the last ~100ms of movement; a finger that paused before
    // lifting has stopped, so it carries no velocity.
    const recent = d.samples.filter((s) => e.timeStamp - s.t <= 100);
    let v = 0;
    if (recent.length >= 2 && e.type !== "pointercancel") {
      const a = recent[0];
      const b = recent[recent.length - 1];
      if (b.t > a.t) v = ((b.y - a.y) / (b.t - a.t)) * 1000;
    }
    // Decide from where the flick is heading, not where the finger let go.
    const h = heightRef.current;
    const target = nearestPoint(yRef.current + project(v), [0, h]);
    if (target === h) {
      exitingRef.current = true;
      moveTo(h, v, SPRING_DEFAULT, finish);
    } else {
      exitingRef.current = false;
      // Only a gesture that carried momentum gets any bounce on the way back.
      moveTo(0, v, Math.abs(v) > 300 ? SPRING_MOMENTUM : SPRING_DEFAULT);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        ref={scrimRef}
        aria-hidden="true"
        className="absolute inset-0 bg-black/40"
        style={{ opacity: 0 }}
        onClick={() => dismiss()}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`relative outline-none ${dragAnywhere ? "touch-none" : ""}`}
          style={{ transform: "translate3d(0, 100%, 0)", willChange: "transform" }}
        >
          {/* Grabber: a visual cue and a drag handle, sitting in the sheet's top padding. */}
          <div data-sheet-drag className="absolute inset-x-0 top-0 z-10 flex h-5 touch-none justify-center pt-1.5">
            <span className="h-1 w-9 rounded-full bg-border" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
