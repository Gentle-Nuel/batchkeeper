import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { BackHeader, Section } from "../../components/ui";

const faqs = [
  {
    q: "What happens when a material hits its reorder point?",
    a: "It's flagged as low stock on Production and Materials, and named specifically in the low-stock alert so you know exactly which products it affects, not just that something is running low.",
  },
  { q: "Can I use the app without an internet connection?", a: "Yes. See Sync & Offline Data in Settings." },
  { q: "How do I change a product's recipe?", a: "Open the product from Products & Recipes and edit its Recipe section." },
  {
    q: "What does \"waiting to sync\" mean?",
    a: "It means some of your entries are saved on your phone but haven't reached the cloud yet, usually because you're offline. They'll sync automatically once you're back online, and nothing is lost in the meantime.",
  },
  {
    q: "I forgot my password. What do I do?",
    a: "On the sign in screen, tap \"Forgot password?\" and enter your email. We'll send you a link to set a new one.",
  },
  {
    q: "What do Curing, Ready, Selling, and Sold Out mean for a batch?",
    a: "Curing means the batch is still setting and not ready to sell yet. Ready means it can be sold. Selling means some units have already been sold. Sold Out means none are left.",
  },
  {
    q: "Do I need a NAFDAC number to use this app?",
    a: "No. You can mark a product as Not Registered, In Process, or Registered, whichever is true for you right now, and update it later once your status changes.",
  },
  {
    q: "How do I add stock when I buy more raw materials?",
    a: "Open the material from the Materials tab and tap Restock. Enter how much you bought and its cost, and your stock level updates right away.",
  },
  {
    q: "Can I run more than one business in this app?",
    a: "Yes. Go to Settings, and under Businesses tap \"+ Add\" to set up another one. You can switch between them from the same screen at any time.",
  },
  {
    q: "Can other people on my team use this with me?",
    a: "Not yet. Right now each login runs one set of businesses. If a staff member needs to log batches or sales, they'd need to use your sign in details for now.",
  },
  {
    q: "Is my data safe if I lose my phone?",
    a: "Yes. Everything you enter is backed up to the cloud as long as you've been online, so signing in on a new device brings it all back.",
  },
  {
    q: "What happens to my data if I delete my account?",
    a: "It's permanently erased, including every business, material, product, batch, and sale under that login. This can't be undone.",
  },
  {
    q: "How do I get help if something goes wrong?",
    a: "Go to Settings, then Help & Support, to email or WhatsApp us directly, or use Send Feedback to tell us what happened.",
  },
];

export function FAQ() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(0);

  return (
    <div className="pb-8">
      <BackHeader title="FAQ" onBack={() => navigate(-1)} />

      <Section>
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => {
            const isOpen = expanded === i;
            return (
              <div
                key={faq.q}
                className={`rounded-card border bg-surface p-3.5 ${isOpen ? "border-teal" : "border-border"}`}
              >
                <button
                  onClick={() => setExpanded(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="text-[14px] font-semibold text-text">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp size={16} className="shrink-0 text-teal" />
                  ) : (
                    <ChevronDown size={16} className="shrink-0 text-text-secondary" />
                  )}
                </button>
                {isOpen && (
                  <>
                    <div className="my-2.5 h-px bg-border" />
                    <p className="text-[12px] leading-relaxed text-text-secondary">{faq.a}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
