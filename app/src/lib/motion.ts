// Pure motion math for gesture-driven UI (sheets, carousel, toasts). No DOM,
// no timers: everything here is a plain function so it can be checked with
// `npx vite-node` without a browser. The rAF driver and the hooks that use
// these live next to the components that need them.

export interface SpringConfig {
  /** 1 = critically damped (settles with no overshoot). < 1 overshoots and
   * oscillates; lower = bouncier. Default UI springs use 1; only add bounce
   * when the gesture itself carried momentum (a flick or a throw). */
  dampingRatio: number;
  /** Seconds for one undamped oscillation, so lower = snappier. This is not a
   * duration: a spring has no fixed length, its settle time falls out of
   * these two numbers. */
  response: number;
}

/** Move / reposition: smooth settle, no overshoot. */
export const SPRING_DEFAULT: SpringConfig = { dampingRatio: 1, response: 0.4 };
/** Sheet released after a flick: a little bounce, because a flick carried it. */
export const SPRING_MOMENTUM: SpringConfig = { dampingRatio: 0.8, response: 0.3 };

export interface SpringState {
  /** Distance from the target (0 = at rest on the target). */
  offset: number;
  /** Rate of change of offset, in the same units per second. */
  velocity: number;
}

/**
 * Exact (closed-form) spring solution, evaluated `t` seconds after release.
 * `offset0` is the starting distance from the target and `velocity0` the
 * starting speed, so a drag can hand its release velocity straight in and the
 * motion continues with no visible seam. Closed form instead of stepping
 * means the result doesn't depend on frame rate and can't blow up on a long
 * frame (a backgrounded tab resuming, say).
 */
export function springAt(t: number, offset0: number, velocity0: number, { dampingRatio: z, response }: SpringConfig): SpringState {
  if (t <= 0) return { offset: offset0, velocity: velocity0 };
  const w = (2 * Math.PI) / response; // natural angular frequency

  if (z < 1) {
    const a = z * w;
    const wd = w * Math.sqrt(1 - z * z);
    const B = (velocity0 + a * offset0) / wd;
    const e = Math.exp(-a * t);
    const cos = Math.cos(wd * t);
    const sin = Math.sin(wd * t);
    return {
      offset: e * (offset0 * cos + B * sin),
      velocity: e * ((B * wd - a * offset0) * cos - (offset0 * wd + a * B) * sin),
    };
  }

  if (z === 1) {
    const D = velocity0 + w * offset0;
    const e = Math.exp(-w * t);
    return { offset: e * (offset0 + D * t), velocity: e * (D - w * (offset0 + D * t)) };
  }

  const root = w * Math.sqrt(z * z - 1);
  const r1 = -w * z + root;
  const r2 = -w * z - root;
  const c2 = (velocity0 - r1 * offset0) / (r2 - r1);
  const c1 = offset0 - c2;
  const e1 = Math.exp(r1 * t);
  const e2 = Math.exp(r2 * t);
  return { offset: c1 * e1 + c2 * e2, velocity: c1 * r1 * e1 + c2 * r2 * e2 };
}

export interface SpringRun {
  /** Stops the animation where it is and returns the live value and velocity,
   * so a new gesture (or a new spring) can take over from exactly here with no
   * jump. Safe to call after it has already finished. */
  stop: () => { value: number; velocity: number };
}

/**
 * Drives a spring from `from` to `to` on animation frames, calling `onUpdate`
 * with each value. Always starts from wherever the value really is right now
 * (never from a stale target) and accepts the velocity to carry in, which is
 * what makes an interrupted or flicked animation continue smoothly.
 */
export function runSpring({
  from,
  to,
  velocity = 0,
  config = SPRING_DEFAULT,
  onUpdate,
  onDone,
}: {
  from: number;
  to: number;
  velocity?: number;
  config?: SpringConfig;
  onUpdate: (value: number) => void;
  onDone?: () => void;
}): SpringRun {
  const start = performance.now();
  let raf = 0;
  let finished = false;
  let last = { value: from, velocity };

  const tick = (now: number) => {
    const s = springAt((now - start) / 1000, from - to, velocity, config);
    if (Math.abs(s.offset) < 0.3 && Math.abs(s.velocity) < 8) {
      finished = true;
      last = { value: to, velocity: 0 };
      onUpdate(to);
      onDone?.();
      return;
    }
    last = { value: to + s.offset, velocity: s.velocity };
    onUpdate(last.value);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    stop: () => {
      if (!finished) {
        finished = true;
        cancelAnimationFrame(raf);
      }
      return last;
    },
  };
}

/**
 * Where a gesture would come to rest if it coasted the way scroll does,
 * given its release velocity (px/s). Returns the extra distance to add to the
 * release position. Pick the snap point nearest `position + project(v)`, not
 * nearest `position`, so a short fast flick still throws the element.
 * 0.998 is normal scroll feel; 0.99 is snappier.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Soft boundary: the further past an edge, the less the element follows the
 * finger, approaching (never reaching) `dimension`. Sign follows the
 * overshoot, so it works for either edge.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The point in `points` closest to `value`. */
export function nearestPoint(value: number, points: readonly number[]): number {
  let best = points[0];
  for (const p of points) if (Math.abs(p - value) < Math.abs(best - value)) best = p;
  return best;
}
