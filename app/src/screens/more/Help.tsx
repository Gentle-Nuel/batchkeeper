import { useNavigate } from "react-router-dom";
import { Mail, MessageCircle, MessageSquarePlus } from "lucide-react";
import { BackHeader, Section, MenuRow } from "../../components/ui";

export function Help() {
  const navigate = useNavigate();

  return (
    <div className="pb-8">
      <BackHeader title="Help & Support" onBack={() => navigate(-1)} />

      <Section title="Contact us">
        <div className="flex flex-col gap-3">
          <a href="mailto:embaeri@gmail.com">
            <MenuRow icon={<Mail size={18} />} title="Email Support" subtitle="embaeri@gmail.com" />
          </a>
          <a href="https://wa.me/2349061418974" target="_blank" rel="noreferrer">
            <MenuRow icon={<MessageCircle size={18} />} title="WhatsApp" subtitle="+234 906 141 8974" />
          </a>
        </div>
      </Section>

      <Section title="Feedback">
        <MenuRow icon={<MessageSquarePlus size={18} />} title="Send Feedback" onClick={() => navigate("/settings/help/feedback")} />
      </Section>
    </div>
  );
}
