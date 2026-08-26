import { useNavigate } from "react-router-dom";
import { BackHeader, Section } from "../../components/ui";

export function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="pb-8">
      <BackHeader title="Privacy Policy" onBack={() => navigate(-1)} />

      <p className="px-5 pb-2 text-[12px] text-text-secondary">Last updated 22 August 2026</p>

      <Section title="What we collect">
        <p className="text-[14px] leading-relaxed text-text">
          Your email address, for signing in. The business details you enter (business name, phone, address,
          currency). The materials, products, batches, sales, and restock records you log while using the app. If
          you turn on push notifications, your device registers a subscription (an address and encryption keys) so
          alerts can reach it, we don't see anything else about your device from this. Nothing beyond what you
          type in and what's needed to run features you've turned on.
        </p>
      </Section>

      <Section title="How it's stored">
        <p className="text-[14px] leading-relaxed text-text">
          Your data lives in a hosted database (Supabase), sent over an encrypted connection. Access is locked to
          your own login, so no other account can read or change your data. Some of it is also cached on your
          device so the app keeps working without an internet connection, and syncs back once you're online. The
          app itself is served by Vercel.
        </p>
      </Section>

      <Section title="What we don't do">
        <p className="text-[14px] leading-relaxed text-text">
          We don't sell your data. We don't share it beyond what's needed to run the app: Supabase (database and
          backend), Vercel (hosting), and, only if you enable push notifications, your browser's own push service
          (Google, Apple, or Mozilla, depending on your device) to deliver the alert. There's no advertising or
          analytics tracking built into the app.
        </p>
      </Section>

      <Section title="Your control over it">
        <p className="text-[14px] leading-relaxed text-text">
          You can edit or remove any record you've entered at any time. Deleting your account from Settings
          permanently erases your login and everything tied to it, including every business, material, product,
          batch, and sale, and this can't be undone.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p className="text-[14px] leading-relaxed text-text">
          For as long as you have an account with us. If you delete your account from Settings, everything tied to
          it is removed immediately and permanently, not just marked as deleted.
        </p>
      </Section>

      <Section title="Your rights over your data">
        <p className="text-[14px] leading-relaxed text-text">
          Under Nigeria's Data Protection Act, you have the right to access, correct, or delete your data, to
          withdraw consent, and to receive a copy of it. Access and correction happen directly in the app, wherever
          you entered the information. You can download a full copy of your data at any time from Settings →
          Account → Export My Data. Deleting your account (Settings → Account → Delete Account) exercises your
          right to erasure immediately. If anything here isn't working as it should, email us and we'll handle it
          directly. You also have the right to lodge a complaint with the Nigeria Data Protection Commission
          (NDPC).
        </p>
      </Section>

      <Section title="Where your data is processed">
        <p className="text-[14px] leading-relaxed text-text">
          Our infrastructure providers (Supabase and Vercel) may process and store your data on servers outside
          Nigeria. We only use established providers with strong security practices, and your data is always sent
          over an encrypted connection and access-locked to your own login, wherever it's held.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p className="text-[14px] leading-relaxed text-text">
          If this changes in a way that matters, we'll update the date at the top of this page.
        </p>
      </Section>

      <Section title="Questions">
        <p className="text-[14px] leading-relaxed text-text">
          Reach us at{" "}
          <a href="mailto:embaeri@gmail.com" className="font-semibold text-teal">
            embaeri@gmail.com
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
