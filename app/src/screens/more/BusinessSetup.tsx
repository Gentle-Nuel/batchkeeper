import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { BackHeader, Card, Section, BoxedInput, BoxedSelect, PrimaryButton } from "../../components/ui";
import { CURRENCY_OPTIONS } from "../../lib/format";
import { canAddBusiness } from "../../lib/planLimits";

/** Serves two entry points with the same form: the mandatory first-business
 * step right after signup (no back button, "Continue"), and "+ Add Business"
 * from Settings for anyone who already has one (back button, "Add
 * Business"). Which mode depends on whether this login owns any businesses
 * yet, not on how the route was reached. */
export function BusinessSetup() {
  const navigate = useNavigate();
  const authChecked = useAppStore((s) => s.authChecked);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const businesses = useAppStore((s) => s.businesses);
  const addBusiness = useAppStore((s) => s.addBusiness);
  const isFirstBusiness = businesses.length === 0;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("NGN");

  // Deliberately NOT using the shared RequireAuth/TabLayout gate here — that
  // gate redirects TO this route when a business is needed, so reusing it
  // here would loop. Just needs a signed-in user, business count aside.
  if (!authChecked) return <div className="min-h-screen bg-bg" />;
  if (!isAuthenticated) return <Navigate to="/sign-in" replace />;

  // Free accounts are limited to 1 business (see
  // supabase/migrations/0004_freemium_caps.sql's enforce_business_cap()) —
  // this is only the UX-nicety half of that boundary, blocking the form
  // before it's even shown rather than letting the user fill it out and
  // then have the write silently purged after the fact.
  if (!isFirstBusiness && !canAddBusiness(businesses)) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md bg-bg pb-8">
        <BackHeader title="Add Business" onBack={() => navigate(-1)} />
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-teal/10 text-teal">
            <Building2 size={28} />
          </span>
          <h2 className="text-[16px] font-semibold text-text">Free accounts are limited to 1 business</h2>
          <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-relaxed text-text-secondary">
            Upgrade this account to add more businesses.
          </p>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addBusiness({
      name: name || undefined,
      phone: phone || undefined,
      address: address || undefined,
      currency,
    });
    navigate(isFirstBusiness ? "/" : "/settings", { replace: isFirstBusiness });
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-bg pb-8">
      {isFirstBusiness ? (
        <div className="px-5 pt-10 pb-2 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-card bg-teal/10 text-teal">
            <Building2 size={26} />
          </span>
          <h1 className="mt-3 text-[24px] font-semibold text-text">Set up your business</h1>
          <p className="mx-auto mt-2 max-w-xs text-[12px] text-text-secondary">
            Tell us a bit about it to get started. You can change any of this later in Settings.
          </p>
        </div>
      ) : (
        <BackHeader title="Add Business" onBack={() => navigate(-1)} />
      )}

      <form onSubmit={handleSubmit}>
        <Section>
          <Card className="flex flex-col gap-3">
            <BoxedInput
              label="Business Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Add your business name"
            />
            <BoxedInput
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Add your phone number"
            />
            <BoxedInput
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Add your business address"
            />
            <BoxedSelect label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.label} ({c.code})
                </option>
              ))}
            </BoxedSelect>
          </Card>
        </Section>
        <Section>
          <PrimaryButton type="submit">{isFirstBusiness ? "Continue" : "Add Business"}</PrimaryButton>
        </Section>
      </form>
    </div>
  );
}
