import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachmarkStore } from "../../store/useCoachmarkStore";
import { PrimaryButton } from "../../components/ui";
import {
  SPRING_DEFAULT,
  SPRING_MOMENTUM,
  clamp,
  nearestPoint,
  project,
  rubberband,
  runSpring,
  type SpringConfig,
  type SpringRun,
} from "../../lib/motion";
import { useReducedMotion } from "../../lib/useReducedMotion";
import logisticsSvg from "../../assets/onboarding/logistics.svg?raw";
import noSignalSvg from "../../assets/onboarding/no-signal.svg?raw";
import growthChartSvg from "../../assets/onboarding/growth-chart.svg?raw";

// The real, shipped version of the 3-slide flow prototyped and approved as
// a standalone artifact first. Shown once ever per device (see
// ONBOARDING_ID below) to a not-yet-authenticated visitor, ahead of
// Sign Up/Sign In — see the gate in components/TabLayout.tsx, which sends
// a first-time unauthenticated visit here instead of straight to /sign-in.

const ONBOARDING_ID = "onboarding";

const slides = [
  {
    illustration: logisticsSvg,
    title: "Track every batch, from mix to sale",
    body: "Record what went into each batch, how much you made, and where it went. No more sticky notes or scattered notebooks.",
  },
  {
    illustration: noSignalSvg,
    title: "Works even when your signal doesn't",
    body: "Log batches and sales right on the production floor. Everything saves on your phone first and syncs the moment you're back online.",
  },
  {
    illustration: growthChartSvg,
    title: "Know what's low, and what you're really making",
    body: "Get alerts that name exactly which products a shortage affects, and see real profit and loss without needing a spreadsheet.",
  },
];

const LAST = slides.length - 1;
/** How far a press must travel sideways before it counts as a swipe. */
const DRAG_THRESHOLD = 10;
const DOT = 6;
const DOT_ACTIVE = 20;
const FADE_MS = 150;

interface Sample {
  t: number;
  x: number;
}

export function Onboarding() {
  const navigate = useNavigate();
  const markSeen = useCoachmarkStore((s) => s.markSeen);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  // `index` is the slide nearest the current position, so the Skip / Create
  // Account controls and the screen-reader state swap as the slides cross the
  // halfway point. `targetRef` is where the carousel is heading (the intent),
  // which is what Next and the dots build on.
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const targetRef = useRef(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const widthRef = useRef(0);
  const xRef = useRef(0);
  const runRef = useRef<SpringRun | null>(null);
  const dragRef = useRef<{
    id: number;
    x0: number;
    y0: number;
    xAtDown: number;
    startIndex: number;
    active: boolean;
    samples: Sample[];
    resume: { velocity: number } | null;
  } | null>(null);

  const isLast = index === LAST;

  function finish(to: "/sign-up" | "/sign-in") {
    markSeen(ONBOARDING_ID);
    navigate(to);
  }

  /** The one place position is written: moves the track and stretches the
   * dots by how close each slide is, so they follow the finger rather than
   * jumping when it lands. */
  function setX(x: number) {
    xRef.current = x;
    const w = widthRef.current || 1;
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
    const progress = clamp(-x / w, 0, LAST);
    slides.forEach((_, i) => {
      const near = Math.max(0, 1 - Math.abs(progress - i));
      const dot = dotRefs.current[i];
      const fill = fillRefs.current[i];
      if (dot) dot.style.width = `${DOT + (DOT_ACTIVE - DOT) * near}px`;
      if (fill) fill.style.opacity = String(near);
    });
    const nearest = Math.round(progress);
    if (nearest !== indexRef.current) {
      indexRef.current = nearest;
      setIndex(nearest);
    }
  }

  function moveTo(x: number, velocity = 0, config: SpringConfig = SPRING_DEFAULT) {
    runRef.current?.stop();
    const track = trackRef.current;
    if (reducedRef.current && track) {
      // Reduced motion: no travel, a short fade between slides instead.
      track.style.transition = "none";
      track.style.opacity = "0";
      setX(x);
      void track.offsetWidth;
      track.style.transition = `opacity ${FADE_MS}ms`;
      track.style.opacity = "1";
      return;
    }
    runRef.current = runSpring({ from: xRef.current, to: x, velocity, config, onUpdate: setX });
  }

  function goTo(i: number, velocity = 0, config?: SpringConfig) {
    const target = clamp(i, 0, LAST);
    targetRef.current = target;
    moveTo(-target * widthRef.current, velocity, config);
  }

  // Measure the viewport, and keep the track on the right slide if it changes
  // size (rotation, window resize) without animating the correction.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      // Exact (fractional) width, not clientWidth, which rounds: real phones
      // have fractional layout widths, and a rounded slide width would leave
      // each slide landing a fraction of a pixel further off.
      const w = viewport.getBoundingClientRect().width;
      if (w === widthRef.current) return;
      widthRef.current = w;
      runRef.current?.stop();
      runRef.current = null;
      setX(-targetRef.current * w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    return () => {
      ro.disconnect();
      runRef.current?.stop();
      runRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    // Grabbed mid-animation: freeze right where it is on screen, carrying its
    // velocity, so a tap resumes the same motion and a swipe takes over from here.
    let resume: { velocity: number } | null = null;
    if (runRef.current) {
      const live = runRef.current.stop();
      runRef.current = null;
      // Only a spring still in flight is an interruption; a finished one just
      // remembers where it ended, which may not be where the track is now
      // (a reduced-motion jump moves it without starting a spring).
      if (live.running) {
        xRef.current = live.value;
        resume = { velocity: live.velocity };
      }
    }
    dragRef.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      xAtDown: xRef.current,
      startIndex: Math.round(-xRef.current / (widthRef.current || 1)),
      active: false,
      samples: [],
      resume,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical: not ours.
        dragRef.current = null;
        if (d.resume) goTo(targetRef.current, d.resume.velocity);
        return;
      }
      d.active = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // The pointer is already gone (an interrupted touch); the swipe can proceed without capture.
      }
    }
    // 1:1 with the finger from where the track was when grabbed, resisting
    // progressively past either end instead of stopping dead.
    const w = widthRef.current;
    const min = -LAST * w;
    const raw = d.xAtDown + dx;
    setX(raw > 0 ? rubberband(raw, w) : raw < min ? min - rubberband(min - raw, w) : raw);
    d.samples.push({ t: e.timeStamp, x: raw });
    if (d.samples.length > 8) d.samples.shift();
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d.active) {
      if (d.resume) goTo(targetRef.current, d.resume.velocity);
      return;
    }
    // Velocity from the last ~100ms of movement; a finger that paused before
    // lifting has stopped, so it carries none.
    const recent = d.samples.filter((s) => e.timeStamp - s.t <= 100);
    let v = 0;
    if (recent.length >= 2 && e.type !== "pointercancel") {
      const a = recent[0];
      const b = recent[recent.length - 1];
      if (b.t > a.t) v = ((b.x - a.x) / (b.t - a.t)) * 1000;
    }
    // Choose the slide from where the flick is heading, not where the finger
    // let go, but never more than one slide per swipe: a hard flick should not
    // skip the middle of a three-slide intro.
    const w = widthRef.current;
    const landing = nearestPoint(
      xRef.current + project(v),
      slides.map((_, i) => -i * w),
    );
    const target = clamp(Math.round(-landing / w), d.startIndex - 1, d.startIndex + 1);    // Only a gesture that carried momentum gets any bounce settling in.
    goTo(target, v, Math.abs(v) > 300 ? SPRING_MOMENTUM : SPRING_DEFAULT);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg">
      <div className="flex h-11 items-center justify-end px-5 pt-5">
        {!isLast && (
          <button
            type="button"
            onClick={() => finish("/sign-in")}
            className="relative text-[13px] font-semibold text-text-secondary after:absolute after:-inset-x-3 after:-inset-y-3"
          >
            Skip
          </button>
        )}
      </div>

      {/* touch-pan-y: the browser keeps vertical scrolling, and sideways
          movement reaches the swipe handlers. */}
      <div
        ref={viewportRef}
        role="group"
        aria-roledescription="carousel"
        aria-label="Introduction"
        className="flex flex-1 touch-pan-y select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={trackRef} className="flex w-full shrink-0" style={{ willChange: "transform" }}>
          {slides.map((slide, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
              aria-hidden={i !== index}
              inert={i !== index}
              className="flex w-full shrink-0 flex-col items-center justify-center px-8 text-center"
            >
              <div
                className="mx-auto mb-6 flex h-[170px] w-full max-w-[300px] items-center justify-center text-teal [&_svg]:block [&_svg]:h-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:max-w-full [&_svg]:overflow-visible"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: slide.illustration }}
              />
              <h1 className="text-[21px] font-semibold leading-tight text-text text-balance">{slide.title}</h1>
              <p className="mt-3 max-w-[270px] text-[14px] leading-relaxed text-text-secondary">{slide.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 px-8 pb-10">
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              // Width and fill are driven from setX as the carousel moves; these
              // are only the resting values for the first paint and never change.
              style={{ width: i === 0 ? DOT_ACTIVE : DOT }}
              className="relative h-1.5 rounded-full bg-border after:absolute after:-inset-x-[3px] after:-inset-y-[19px]"
            >
              <span
                ref={(el) => {
                  fillRefs.current[i] = el;
                }}
                aria-hidden="true"
                style={{ opacity: i === 0 ? 1 : 0 }}
                className="absolute inset-0 rounded-full bg-teal"
              />
            </button>
          ))}
        </div>

        {isLast ? (
          <div className="flex w-full flex-col gap-3">
            <PrimaryButton type="button" onClick={() => finish("/sign-up")}>
              Create Account
            </PrimaryButton>
            <button
              type="button"
              onClick={() => finish("/sign-in")}
              className="relative text-[13px] font-semibold text-text-secondary after:absolute after:-inset-x-3 after:-inset-y-3"
            >
              Already have an account? <span className="text-teal">Sign In</span>
            </button>
          </div>
        ) : (
          <PrimaryButton type="button" arrow onClick={() => goTo(targetRef.current + 1)}>
            Next
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
