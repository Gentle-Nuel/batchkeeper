import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Mail } from "lucide-react";
import { PrimaryButton } from "../../components/ui";
import { useAppStore } from "../../store/useAppStore";

// Landing target for Supabase's email-confirmation redirect. Doesn't assume
// the session lands in THIS browser — for a PWA that's often wrong: tapping
// the confirmation link from a mail app opens the phone's regular browser,
// not the installed home-screen app, and on iOS those don't share storage
// at all (Android/Chrome usually do, since the installed PWA and the
// browser share the same engine's storage). A different device entirely
// (confirm on a laptop, use the app on a phone) hits the same problem.
// So: check whether a session actually landed here, and show the right
// thing either way, rather than silently assuming success.
export function EmailConfirmed() {
  const navigate = useNavigate();
  const authChecked = useAppStore((s) => s.authChecked);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    if (authChecked && isAuthenticated) {
      setContinuing(true);
      const t = setTimeout(() => navigate("/", { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [authChecked, isAuthenticated, navigate]);

  const waiting = !authChecked;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-card bg-teal/10 text-teal">
        {waiting ? <Mail size={26} /> : <CheckCircle2 size={26} />}
      </span>

      {waiting && (
        <>
          <h1 className="text-[24px] font-semibold text-text">Confirming…</h1>
          <p className="mt-1 text-[12px] text-text-secondary">One moment.</p>
        </>
      )}

      {!waiting && continuing && (
        <>
          <h1 className="text-[24px] font-semibold text-text">You're all set!</h1>
          <p className="mt-1 text-[12px] text-text-secondary">Taking you in.</p>
        </>
      )}

      {!waiting && !continuing && (
        <>
          <h1 className="text-[24px] font-semibold text-text">Email confirmed</h1>
          <p className="mx-auto mt-2 max-w-xs text-[12px] leading-relaxed text-text-secondary">
            Your email is confirmed. If this isn't the device or browser you use Batchkeeper on, open the app there
            and sign in.
          </p>
          <div className="mt-5 w-full">
            <PrimaryButton type="button" onClick={() => navigate("/sign-in")}>
              Go to Sign In
            </PrimaryButton>
          </div>
        </>
      )}
    </div>
  );
}
