import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { PrimaryButton, BoxedInput } from "../../components/ui";
import { useAppStore } from "../../store/useAppStore";

export function ForgotPassword() {
  const resetPassword = useAppStore((s) => s.resetPassword);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-card bg-teal/10 text-teal">
          <Mail size={26} />
        </span>
        <h1 className="text-[24px] font-semibold text-text">Reset password</h1>
        <p className="mt-1 text-[12px] text-text-secondary">
          {sent ? "Check your email for a reset link." : "We'll send you a link to reset it."}
        </p>
      </div>

      {!sent ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <BoxedInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </PrimaryButton>
        </form>
      ) : null}

      <p className="mt-6 text-center text-[12px] text-text-secondary">
        <Link to="/sign-in" className="font-semibold text-teal">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
