import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { BackHeader, Card, Section, BoxedInput, BoxedSelect, PrimaryButton } from "../../components/ui";
import { CURRENCY_OPTIONS } from "../../lib/format";

export function BusinessProfile() {
  const navigate = useNavigate();
  const business = useAppStore((s) => s.business);
  const updateBusiness = useAppStore((s) => s.updateBusiness);

  const [name, setName] = useState(business.name ?? "");
  const [phone, setPhone] = useState(business.phone ?? "");
  const [address, setAddress] = useState(business.address ?? "");
  const [currency, setCurrency] = useState(business.currency);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateBusiness({ name: name || undefined, phone: phone || undefined, address: address || undefined, currency });
    navigate(-1);
  }

  return (
    <div className="pb-8">
      <BackHeader title="Business Profile" onBack={() => navigate(-1)} />
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
          <PrimaryButton type="submit">Save Business Profile</PrimaryButton>
        </Section>
      </form>
    </div>
  );
}
