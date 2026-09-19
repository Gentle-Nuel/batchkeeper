import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, MailWarning } from "lucide-react";
import { BoxedInput, PrimaryButton, PasswordRequirements } from "../../components/ui";
import { useAppStore } from "../../store/useAppStore";
import { useToastStore } from "../../store/useToastStore";
import { passwordMeetsAllRules } from "../../lib/passwordRules";

// Landing target for Supabase's password-recovery redirect (see
// resetPassword's explicit redirectTo in useAppStore.ts). Unlike
// EmailConfirmed, this doesn't need to worry about "which browser did the
// session land in" — the whole point of resetting a password is to be able
// to do it from any device, then go sign in with the new password wherever
// you actually use the app. So this screen only has two states: a valid
// recovery session exists here (show the set-new-password form), or it
// doesn't (expired/already-used/no-token link — send back to request a
// fresh one).
//
// Gated on isPasswordRecovery, NOT plain isAuthenticated: someone who's
// simply already signed in on this device (bookmark, back button, a stale
// link opened while still logged in from before) would make isAuthenticated
// true too, but they didn't arrive via a real, still-valid recovery link —
// this form would otherwise let them set a new password with no current-
// password check at all, which is exactly the "current password" step
// changePassword deliberately keeps.
export function ResetPassword() {
  const navigate = useNavigate();
  const authChecked = useAppStore((s) => s.authChecked);
  const isPasswordRecovery = useAppStore((s) => s.isPasswordRecovery);
  const confirmPasswordReset = useAppStore((s) => s.confirmPasswordReset);
  const showToast = useToastStore((s) => s.showToast);

  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordMeetsAllRules(next)) {
      setError("New password doesn't meet all the requirements below.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation don't match.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await confirmPasswordReset(next);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    showToast("Password updated");
    navigate("/", { replace: true });
  }

  if (!authChecked) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-card bg-teal/10 text-teal">
          <KeyRound size={26} />
        </span>
        <h1 className="text-[24px] font-semibold text-text">Checking…</h1>
      </div>
    );
  }

  if (!isPasswordRecovery) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-card bg-danger/10 text-danger">
          <MailWarning size={26} />
        </span>
        <h1 className="text-[24px] font-semibold text-text">Link expired</h1>
        <p className="mx-auto mt-2 max-w-xs text-[12px] leading-relaxed text-text-secondary">
          This reset link isn't valid anymore, either it's already been used or it's expired. Request a new one.
        </p>
        <div className="mt-5 w-full">
          <PrimaryButton type="button" onClick={() => navigate("/forgot-password")}>
            Request New Link
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-card bg-teal/10 text-teal">
          <KeyRound size={26} />
        </span>
        <h1 className="text-[24px] font-semibold text-text">Set a new password</h1>
        <p className="mt-1 text-[12px] text-text-secondary">Choose a new password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <BoxedInput
          label="New Password"
          type="password"
          placeholder="Enter new password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          minLength={8}
          required
        />
        <PasswordRequirements password={next} />
        <BoxedInput
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
        <PrimaryButton type="submit" disabled={submitting}>
          {submitting ? "Updating…" : "Update Password"}
        </PrimaryButton>
      </form>
    </div>
  );
}
