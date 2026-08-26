import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { useToastStore } from "../../store/useToastStore";
import { BackHeader, Card, Section, BoxedInput, PrimaryButton, PasswordRequirements } from "../../components/ui";
import { passwordMeetsAllRules } from "../../lib/passwordRules";

export function ChangePassword() {
  const navigate = useNavigate();
  const changePassword = useAppStore((s) => s.changePassword);
  const showToast = useToastStore((s) => s.showToast);
  const [current, setCurrent] = useState("");
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
    const { error: err } = await changePassword(current, next);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    showToast("Password updated");
    navigate(-1);
  }

  return (
    <div className="pb-8">
      <BackHeader title="Change Password" onBack={() => navigate(-1)} />
      <form onSubmit={handleSubmit}>
        <Section>
          <Card className="flex flex-col gap-3">
            <BoxedInput label="Current Password" type="password" placeholder="••••••••" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            <BoxedInput label="New Password" type="password" placeholder="Enter new password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required />
            <PasswordRequirements password={next} />
            <BoxedInput label="Confirm New Password" type="password" placeholder="Re-enter new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Card>
          {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
        </Section>
        <Section>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Updating..." : "Update Password"}
          </PrimaryButton>
        </Section>
      </form>
    </div>
  );
}
