import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { BackHeader, Card, Section, BoxedInput, PrimaryButton, ReadOnlyField } from "../../components/ui";

export function ChangeEmail() {
  const navigate = useNavigate();
  const userEmail = useAppStore((s) => s.userEmail);
  const changeEmail = useAppStore((s) => s.changeEmail);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await changeEmail(newEmail, password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  }

  return (
    <div className="pb-8">
      <BackHeader title="Change Email" onBack={() => navigate(-1)} />
      <form onSubmit={handleSubmit}>
        <Section>
          <Card className="flex flex-col gap-3">
            <ReadOnlyField label="Current Email" value={userEmail ?? "Not set"} />
            <BoxedInput label="New Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            <BoxedInput label="Confirm Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Card>
          {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
        </Section>
        {sent && (
          <Section>
            <p className="text-[12px] text-text-secondary">
              Confirmation links have been sent to both {userEmail} and {newEmail}. The change takes effect once you click both.
            </p>
          </Section>
        )}
        <Section>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send Verification"}
          </PrimaryButton>
        </Section>
      </form>
    </div>
  );
}
