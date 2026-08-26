import { useNavigate } from "react-router-dom";
import { BackHeader } from "../../components/ui";

export function About() {
  const navigate = useNavigate();

  return (
    <div className="pb-8">
      <BackHeader title="About" onBack={() => navigate(-1)} />
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-card">
          <img src="/favicon.svg" alt="Batchkeeper" className="h-full w-full" />
        </span>
        <h1 className="text-[24px] font-semibold text-text">Batchkeeper</h1>
        <p className="mt-1 text-[12px] text-text-secondary">Version 1.0.0</p>
        <p className="mt-1 text-[12px] text-text-secondary">Built by Code and Canvas</p>

        <div className="mt-6 flex flex-col gap-3 text-[12px] font-semibold text-teal">
          <button type="button" onClick={() => navigate("/settings/about/terms")}>
            Terms of Service
          </button>
          <button type="button" onClick={() => navigate("/settings/about/privacy")}>
            Privacy Policy
          </button>
        </div>

        <p className="mt-8 text-[12px] text-text-secondary">© 2026 Code and Canvas. All rights reserved.</p>
      </div>
    </div>
  );
}
