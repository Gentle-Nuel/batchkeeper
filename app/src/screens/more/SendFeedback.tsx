import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { BackHeader, Card, Section, BoxedInput, BoxedTextarea, PrimaryButton } from "../../components/ui";

type FeedbackType = "bug" | "idea" | "general";

const types: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "Bug Report" },
  { value: "idea", label: "Feature Idea" },
  { value: "general", label: "General" },
];

const typeLabel: Record<FeedbackType, string> = {
  bug: "Bug Report",
  idea: "Feature Idea",
  general: "General Feedback",
};

const SUPPORT_EMAIL = "embaeri@gmail.com";

export function SendFeedback() {
  const navigate = useNavigate();
  const userEmail = useAppStore((s) => s.userEmail);
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = `Batchkeeper feedback: ${typeLabel[type]}`;
    const bodyLines = [message.trim(), "", `From: ${email.trim() || userEmail || "Not provided"}`];
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    // Opens the device's mail app pre-filled; the person still has to hit
    // send there. Nothing here talks to Supabase, so there's no submission
    // to go read from a table, and it lands in a real inbox either way.
    window.location.href = mailto;
    navigate(-1);
  }

  return (
    <div className="pb-8">
      <BackHeader title="Send Feedback" onBack={() => navigate(-1)} />
      <form onSubmit={handleSubmit}>
        <Section title="Type">
          <div className="flex rounded-input border border-border bg-input-fill p-1">
            {types.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex-1 rounded-[8px] py-2 text-[12px] font-semibold transition ${
                  type === t.value ? "bg-teal text-white" : "text-text-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Section>

        <Section>
          <Card className="flex flex-col gap-3">
            <BoxedTextarea
              label="Message"
              rows={5}
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <BoxedInput label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="For us to follow up" />
          </Card>
          <p className="mt-2 text-[12px] text-text-secondary">Opens your mail app with this pre-filled, ready to send to us.</p>
        </Section>

        <Section>
          <PrimaryButton type="submit">Send Feedback</PrimaryButton>
        </Section>
      </form>
    </div>
  );
}
