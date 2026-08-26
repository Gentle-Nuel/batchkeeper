import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { PrimaryButton, BoxedInput, PasswordRequirements } from "../../components/ui";
import { useAppStore } from "../../store/useAppStore";
import { passwordMeetsAllRules } from "../../lib/passwordRules";

export function SignUp() {
  const navigate = useNavigate();
  const signUp = useAppStore((s) => s.signUp);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (!passwordMeetsAllRules(password)) {
      setError("Password doesn't meet all the requirements below");
      return;
    }
    setLoading(true);
    const result = await signUp(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setNeedsConfirmation(true);
      return;
    }
    navigate("/");
  }

  if (needsConfirmation) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-card bg-teal/10 text-teal">
          <MailCheck size={26} />
        </span>
        <h1 className="text-[24px] font-semibold text-text">Check your email</h1>
        <p className="mx-auto mt-2 max-w-xs text-[12px] text-text-secondary">
          We sent a confirmation link to {email}. Open it to activate your account, then come back and sign in.
        </p>
        <Link to="/sign-in" className="mt-6 text-[12px] font-semibold text-teal">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-card">
          <img src="/favicon.svg" alt="Batchkeeper" className="h-full w-full" />
        </span>
        <h1 className="text-[24px] font-semibold text-text">Create your account</h1>
        <p className="mt-1 text-[12px] text-text-secondary">Start logging your production</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <BoxedInput
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <BoxedInput
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <PasswordRequirements password={password} />
        <BoxedInput
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-[12px] text-text-secondary">
        Already have an account?{" "}
        <Link to="/sign-in" className="font-semibold text-teal">
          Sign in
        </Link>
      </p>
    </div>
  );
}
