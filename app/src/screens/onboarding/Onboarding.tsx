import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachmarkStore } from "../../store/useCoachmarkStore";
import { PrimaryButton } from "../../components/ui";
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

export function Onboarding() {
  const navigate = useNavigate();
  const markSeen = useCoachmarkStore((s) => s.markSeen);
  const [index, setIndex] = useState(0);

  const isLast = index === slides.length - 1;
  const slide = slides[index];

  function finish(to: "/sign-up" | "/sign-in") {
    markSeen(ONBOARDING_ID);
    navigate(to);
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

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div
          className="mx-auto mb-6 flex h-[170px] w-full max-w-[300px] items-center justify-center text-teal [&_svg]:block [&_svg]:h-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:max-w-full [&_svg]:overflow-visible"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: slide.illustration }}
        />
        <h1 className="text-[21px] font-semibold leading-tight text-text text-balance">{slide.title}</h1>
        <p className="mt-3 max-w-[270px] text-[14px] leading-relaxed text-text-secondary">{slide.body}</p>
      </div>

      <div className="flex flex-col items-center gap-5 px-8 pb-10">
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`relative h-1.5 rounded-full transition-all after:absolute after:-inset-x-[3px] after:-inset-y-[19px] ${
                i === index ? "w-5 bg-teal" : "w-1.5 bg-border"
              }`}
            />
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
          <PrimaryButton type="button" arrow onClick={() => setIndex((i) => i + 1)}>
            Next
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
