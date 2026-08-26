import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, RefreshCw, Bell, UserCircle, HelpCircle, CircleHelp, Info, LogOut, Check } from "lucide-react";
import { BackHeader, Section, MenuRow, ConfirmDialog } from "../../components/ui";
import { useAppStore } from "../../store/useAppStore";

export function Settings() {
  const navigate = useNavigate();
  const signOut = useAppStore((s) => s.signOut);
  const businesses = useAppStore((s) => s.businesses);
  const activeBusiness = useAppStore((s) => s.business);
  const switchBusiness = useAppStore((s) => s.switchBusiness);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  async function handleSignOut() {
    setConfirmSignOut(false);
    await signOut();
    navigate("/sign-in", { replace: true });
  }

  return (
    <div className="pb-8">
      <BackHeader title="Settings" onBack={() => navigate(-1)} />

      <Section
        title="Businesses"
        action={
          <Link to="/setup-business" className="rounded-pill bg-teal px-3 py-1.5 text-[14px] font-semibold text-white">
            + Add
          </Link>
        }
      >
        <div className="flex flex-col gap-3">
          {businesses.map((b) => {
            const active = b.id === activeBusiness.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => switchBusiness(b.id)}
                className={`flex items-center justify-between gap-3 rounded-card border p-3.5 text-left ${
                  active ? "border-teal bg-teal/5" : "border-border bg-surface"
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text">
                  {b.name || "Untitled business"}
                </span>
                {active && <Check size={16} className="shrink-0 text-teal" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section>
        <MenuRow icon={<Building2 size={18} />} title="Business Profile" onClick={() => navigate("/settings/business-profile")} />
      </Section>

      <Section title="Data & Sync">
        <div className="flex flex-col gap-3">
          <MenuRow icon={<RefreshCw size={18} />} title="Sync & Offline Data" onClick={() => navigate("/settings/sync")} />
          <MenuRow icon={<Bell size={18} />} title="Notifications" onClick={() => navigate("/settings/notifications")} />
        </div>
      </Section>

      <Section title="Account">
        <MenuRow icon={<UserCircle size={18} />} title="Account" onClick={() => navigate("/settings/account")} />
      </Section>

      <Section title="Support">
        <div className="flex flex-col gap-3">
          <MenuRow icon={<HelpCircle size={18} />} title="Help & Support" onClick={() => navigate("/settings/help")} />
          <MenuRow icon={<CircleHelp size={18} />} title="FAQ" onClick={() => navigate("/settings/faq")} />
          <MenuRow icon={<Info size={18} />} title="About" onClick={() => navigate("/settings/about")} />
        </div>
      </Section>

      <Section>
        <button
          onClick={() => setConfirmSignOut(true)}
          className="mx-auto flex items-center gap-1.5 text-[14px] font-semibold text-text-secondary"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </Section>

      <ConfirmDialog
        open={confirmSignOut}
        tone="neutral"
        title="Sign out?"
        message="You'll need to sign in again to get back to your businesses."
        confirmLabel="Sign Out"
        onConfirm={handleSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </div>
  );
}
