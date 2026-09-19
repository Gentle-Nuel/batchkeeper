import { Outlet, Navigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { useAppStore } from "../store/useAppStore";
import { useCoachmarkStore } from "../store/useCoachmarkStore";

/** Shown while Supabase's initial getSession() check (or the subsequent
 * businesses/data fetch) is still in flight — prevents a flash of the
 * sign-in screen, or of stale/empty content before redirecting to business
 * setup, for an already-logged-in user. */
function AuthChecking() {
  return <div className="min-h-dvh bg-bg" />;
}

function useGate() {
  const authChecked = useAppStore((s) => s.authChecked);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const dataLoaded = useAppStore((s) => s.dataLoaded);
  const needsBusinessSetup = useAppStore((s) => s.needsBusinessSetup);
  const hasSeenOnboarding = useCoachmarkStore((s) => s.hasSeen("onboarding"));

  if (!authChecked) return "loading" as const;
  // A first-time unauthenticated visit gets the onboarding carousel instead
  // of landing straight on the sign-in form; once seen (however it was
  // dismissed — Skip, or picking Create Account/Sign In there), every later
  // unauthenticated visit goes straight to sign-in as before.
  if (!isAuthenticated) return hasSeenOnboarding ? ("sign-in" as const) : ("onboarding" as const);
  if (!dataLoaded) return "loading" as const;
  if (needsBusinessSetup) return "setup-business" as const;
  return "ok" as const;
}

export function TabLayout() {
  const gate = useGate();
  if (gate === "loading") return <AuthChecking />;
  if (gate === "onboarding") return <Navigate to="/onboarding" replace />;
  if (gate === "sign-in") return <Navigate to="/sign-in" replace />;
  if (gate === "setup-business") return <Navigate to="/setup-business" replace />;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-bg">
      <Outlet />
      <BottomNav />
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const gate = useGate();
  if (gate === "loading") return <AuthChecking />;
  if (gate === "onboarding") return <Navigate to="/onboarding" replace />;
  if (gate === "sign-in") return <Navigate to="/sign-in" replace />;
  if (gate === "setup-business") return <Navigate to="/setup-business" replace />;
  return <>{children}</>;
}

/** Drill-down screens (everything reached by tapping into a tab) — back
 * button, no bottom nav, per the handoff doc's screen-by-screen spec. */
export function DrillLayout() {
  const gate = useGate();
  if (gate === "loading") return <AuthChecking />;
  if (gate === "onboarding") return <Navigate to="/onboarding" replace />;
  if (gate === "sign-in") return <Navigate to="/sign-in" replace />;
  if (gate === "setup-business") return <Navigate to="/setup-business" replace />;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-bg">
      <Outlet />
    </div>
  );
}
