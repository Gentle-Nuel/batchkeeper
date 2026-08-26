import { useNavigate } from "react-router-dom";
import { BackHeader, Section } from "../../components/ui";

export function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="pb-8">
      <BackHeader title="Terms of Service" onBack={() => navigate(-1)} />

      <p className="px-5 pb-2 text-[12px] text-text-secondary">Last updated 22 August 2026</p>

      <Section title="What this app is for">
        <p className="text-[14px] leading-relaxed text-text">
          Batchkeeper helps you track materials, recipes, production batches, and sales for your own business.
          You're responsible for the accuracy of what you enter, we don't verify it.
        </p>
      </Section>

      <Section title="Cost">
        <p className="text-[14px] leading-relaxed text-text">
          Batchkeeper is currently free to use, with no paid plan. If that changes in the future, we'll update
          these terms first and tell you what's changing before anything is charged.
        </p>
      </Section>

      <Section title="The Batchkeeper name">
        <p className="text-[14px] leading-relaxed text-text">
          The Batchkeeper name and logo are ours. This is separate from your business records, which belong to you
          as described below, we're only talking about the app's own branding here.
        </p>
      </Section>

      <Section title="Your account">
        <p className="text-[14px] leading-relaxed text-text">
          Keep your password to yourself. You're responsible for anything done under your login. If you think
          someone else has access to your account, change your password right away from Settings.
        </p>
      </Section>

      <Section title="Your data belongs to you">
        <p className="text-[14px] leading-relaxed text-text">
          The business records you enter are yours. We store them so the app can work, we don't claim any
          ownership over them.
        </p>
      </Section>

      <Section title="No guarantees">
        <p className="text-[14px] leading-relaxed text-text">
          The app is provided as is, without a guarantee that it will always be free of bugs or downtime. NAFDAC
          status fields reflect what you've entered, they don't represent an actual registration process or
          confirm regulatory compliance on our part, that's between you and the relevant authority. To the fullest
          extent the law allows, we're not liable for losses arising from your use of the app, including lost
          production data, lost sales, or business decisions made based on what's in it, beyond what's required by
          law.
        </p>
      </Section>

      <Section title="Ending your account">
        <p className="text-[14px] leading-relaxed text-text">
          You can delete your account at any time from Settings, this permanently erases your data. We may
          suspend an account that's being used to abuse or attack the service.
        </p>
      </Section>

      <Section title="Governing law">
        <p className="text-[14px] leading-relaxed text-text">
          These terms are governed by the laws of the Federal Republic of Nigeria.
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
