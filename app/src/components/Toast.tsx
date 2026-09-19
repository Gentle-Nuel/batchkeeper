import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CloudOff, CheckCircle2, Info } from "lucide-react";
import { useToastStore, type ToastTone } from "../store/useToastStore";
import { SPRING_DEFAULT, SPRING_MOMENTUM, nearestPoint, project, rubberband, runSpring, type SpringRun } from "../lib/motion";
import { useReducedMotion } from "../lib/useReducedMotion";

const TONE_STYLES: Record<ToastTone, { bg: string; icon: typeof Info }> = {
  info: { bg: "bg-text", icon: Info },
  success: { bg: "bg-teal", icon: CheckCircle2 },
  warning: { bg: "bg-status-curing-text", icon: CloudOff },
};

const AUTO_DISMISS_MS = 3500;
const DRAG_THRESHOLD = 6;
const FADE_MS = 150;

interface Sample {
  t: number;
  y: number;
}

/** Rendered once at the app root so it survives navigation and shows
 * regardless of which screen is active. It slides in from the top and leaves
 * the way it came (upward), auto-dismisses, and can be swiped up to dismiss.
 * Holding it pauses the timer. A newer toast arriving while one is leaving
 * brings it back rather than dismissing the new message. The connectivity
 * listeners in useAppStore are what actually call showToast(). */
export function Toast() {
  const toast = useToastStore((s) => s.toast);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  // What is drawn. Lags `toast` while the old one slides out.
  const [shown, setShown] = useState(toast);
  const [held, setHeld] = useState(false);

  const elRef = useRef<HTMLDivElement>(null);
  const yRef = useRef(0);
  const runRef = useRef<SpringRun | null>(null);
  const timerRef = useRef(0);
  const visibleRef = useRef(false);
  const leavingIdRef = useRef<string | null>(null);
  const dragRef = useRef<{
    id: number;
    y0: number;
    startY: number;
    active: boolean;
    samples: Sample[];
    resume: { target: number; velocity: number } | null;
  } | null>(null);

  function offscreen() {
    return -((elRef.current?.offsetHeight ?? 60) + 32);
  }

  function setY(y: number) {
    yRef.current = y;
    if (elRef.current) elRef.current.style.transform = `translate3d(0, ${y}px, 0)`;
  }

  function moveTo(target: number, velocity: number, config = SPRING_DEFAULT, done?: () => void) {
    runRef.current?.stop();
    window.clearTimeout(timerRef.current);
    const el = elRef.current;
    if (reducedRef.current && el) {
      // Reduced motion: fade in place instead of travelling.
      const closing = target !== 0;
      el.style.transition = `opacity ${FADE_MS}ms`;
      setY(0);
      el.style.opacity = closing ? "0" : "1";
      if (closing) timerRef.current = window.setTimeout(() => done?.(), FADE_MS);
      return;
    }
    runRef.current = runSpring({ from: yRef.current, to: target, velocity, config, onUpdate: setY, onDone: done });
  }

  function leave(velocity = 0) {
    const current = useToastStore.getState().toast ?? shown;
    if (!current || leavingIdRef.current) return;
    leavingIdRef.current = current.id;
    const id = current.id;
    moveTo(offscreen(), velocity, SPRING_DEFAULT, () => {
      leavingIdRef.current = null;
      visibleRef.current = false;
      setShown(null);
      // Only clear the store if it is still this toast, not a newer one.
      if (useToastStore.getState().toast?.id === id) useToastStore.getState().dismissToast();
    });
  }

  // A toast arrived, changed, or was dismissed elsewhere.
  useEffect(() => {
    if (toast) {
      if (leavingIdRef.current) {
        // A newer message arrived mid-exit: cancel the exit and bring it back from where it is.
        leavingIdRef.current = null;
        moveTo(0, runRef.current?.stop().velocity ?? 0);
      }
      setShown(toast);
    } else if (shown) {
      leave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  // Enter: only when it was not already on screen.
  useLayoutEffect(() => {
    if (!shown || visibleRef.current) return;
    visibleRef.current = true;
    const el = elRef.current;
    if (!el) return;
    if (reducedRef.current) {
      el.style.opacity = "0";
      setY(0);
      void el.offsetHeight;
      moveTo(0, 0);
    } else {
      el.style.opacity = "1";
      setY(offscreen());
      moveTo(0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown?.id]);

  // Auto-dismiss, paused while it is held.
  useEffect(() => {
    if (!toast || held) return;
    const t = window.setTimeout(() => leave(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, held]);

  useEffect(
    () => () => {
      runRef.current?.stop();
      window.clearTimeout(timerRef.current);
    },
    [],
  );

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    setHeld(true);
    // Grabbed mid-animation: freeze where it is, carry its velocity.
    let resume: { target: number; velocity: number } | null = null;
    if (runRef.current) {
      const live = runRef.current.stop();
      runRef.current = null;
      // Only a spring still in flight is an interruption; a finished one just
      // remembers where it ended, which may not be where the toast is now.
      if (live.running) {
        yRef.current = live.value;
        resume = { target: leavingIdRef.current ? offscreen() : 0, velocity: live.velocity };
      }
    }
    dragRef.current = { id: e.pointerId, y0: e.clientY, startY: yRef.current, active: false, samples: [], resume };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y0;
    if (!d.active) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      d.active = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // The pointer is already gone; carry on without capture.
      }
    }
    // Free upward (the way it leaves); pulling down resists.
    const raw = d.startY + dy;
    setY(raw > 0 ? rubberband(raw, 120) : raw);
    d.samples.push({ t: e.timeStamp, y: raw });
    if (d.samples.length > 8) d.samples.shift();
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    dragRef.current = null;
    setHeld(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d.active) {
      if (d.resume) {
        if (d.resume.target !== 0) leave(d.resume.velocity);
        else moveTo(0, d.resume.velocity);
      }
      return;
    }
    const recent = d.samples.filter((s) => e.timeStamp - s.t <= 100);
    let v = 0;
    if (recent.length >= 2 && e.type !== "pointercancel") {
      const a = recent[0];
      const b = recent[recent.length - 1];
      if (b.t > a.t) v = ((b.y - a.y) / (b.t - a.t)) * 1000;
    }
    // Decide from where the flick is heading, not where the finger let go.
    const away = offscreen();
    const target = nearestPoint(yRef.current + project(v), [0, away]);
    if (target === away) {
      leavingIdRef.current = null; // so leave() proceeds even if an exit was interrupted
      leave(v);
    } else {
      leavingIdRef.current = null;
      moveTo(0, v, Math.abs(v) > 300 ? SPRING_MOMENTUM : SPRING_DEFAULT);
    }
  }

  if (!shown) return null;
  const style = TONE_STYLES[shown.tone];
  const Icon = style.icon;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center">
      <div className="w-full max-w-md px-4 pt-4">
        <div
          ref={elRef}
          role="status"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`pointer-events-auto flex touch-none items-center gap-2 rounded-pill px-4 py-2.5 text-[12px] font-semibold text-white shadow-lg ${style.bg}`}
          style={{ transform: "translate3d(0, -100%, 0)", willChange: "transform" }}
        >
          <Icon size={14} className="shrink-0" />
          <span>{shown.message}</span>
        </div>
      </div>
    </div>
  );
}
