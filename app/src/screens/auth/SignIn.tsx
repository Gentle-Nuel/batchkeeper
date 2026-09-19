import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PrimaryButton, BoxedInput } from "../../components/ui";
import { useAppStore } from "../../store/useAppStore";

export function SignIn() {
  const navigate = useNavigate();
  const signIn = useAppStore((s) => s.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate("/");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-card">
          <img src="/favicon.svg" alt="Batchkeeper" className="h-full w-full" />
        </span>
        <h1 className="text-[24px] font-semibold text-text">Batchkeeper</h1>
        <p className="mt-1 text-[12px] text-text-secondary">Sign in to your business</p>
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
          required
        />
        <Link to="/forgot-password" className="self-end text-[12px] font-semibold text-teal">
          Forgot password?
        </Link>
        {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-[12px] text-text-secondary">
        Don't have an account?{" "}
        <Link to="/sign-up" className="font-semibold text-teal">
          Sign up
        </Link>
      </p>
    </div>
  );
}
