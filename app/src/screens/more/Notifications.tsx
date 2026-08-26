import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, BellOff } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { BackHeader, Section } from "../../components/ui";
import { Toggle } from "../../components/ui";
import { getExistingPushSubscription, pushSupported, subscribeToPush, unsubscribeFromPush } from "../../lib/push";
import { CoachmarkSequence } from "../../components/Coachmark";
import type { NotificationSettings } from "../../types/models";

const notificationsCoachSteps = [
  {
    targetId: "push-notifications-card",
    title: "Two switches, not one",
    body: "This turns push on for this device. The toggles below control which alerts you actually get. Both need to be on for an alert to reach you.",
  },
];

// Batch Ready Alerts, Daily Summary, and Sync Issues are deliberately not
// listed here — none of the three has a real trigger wired up (Batch Ready
// would need the auto curing->ready detection we decided against building;
// Daily Summary needs a scheduled job, same category of infra skipped this
// round; Sync Issues doesn't push at all today, only an in-app toast/badge
// that only reaches you if the app's already open). Showing a toggle for
// any of them would imply functionality that doesn't exist. Re-add each
// once it has a real trigger — Low Stock Alerts is the only one that does.
const rows: { key: keyof Omit<NotificationSettings, "businessId" | "batchReadyAlerts" | "dailySummary" | "syncIssueAlerts">; icon: React.ReactNode; title: string; subtitle: string }[] = [
  { key: "lowStockAlerts", icon: <AlertTriangle size={18} />, title: "Low Stock Alerts", subtitle: "When a material hits its reorder point" },
];

type PushStatus = "checking" | "unsupported" | "enabled" | "disabled" | "denied";

export function Notifications() {
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.notificationSettings);
  const update = useAppStore((s) => s.updateNotificationSettings);
  const businessId = useAppStore((s) => s.business.id);

  const [pushStatus, setPushStatus] = useState<PushStatus>("checking");
  const [pushError, setPushError] = useState("");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) {
      setPushStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushStatus("denied");
      return;
    }
    getExistingPushSubscription().then((sub) => setPushStatus(sub ? "enabled" : "disabled"));
  }, []);

  async function handleEnablePush() {
    setPushBusy(true);
    setPushError("");
    const { error } = await subscribeToPush(businessId);
    setPushBusy(false);
    if (error) {
      setPushError(error);
      setPushStatus(Notification.permission === "denied" ? "denied" : "disabled");
      return;
    }
    setPushStatus("enabled");
  }

  async function handleDisablePush() {
    setPushBusy(true);
    await unsubscribeFromPush();
    setPushBusy(false);
    setPushStatus("disabled");
  }

  return (
    <div className="pb-8">
      <CoachmarkSequence sequenceId="notifications.pushVsToggles" steps={notificationsCoachSteps} />
      <BackHeader title="Notifications" onBack={() => navigate(-1)} />

      <Section>
        <div id="push-notifications-card" className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-teal/10 text-teal">
            {pushStatus === "enabled" ? <Bell size={18} /> : <BellOff size={18} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-text">Push Notifications</span>
            <span className="block text-[12px] text-text-secondary">
              {pushStatus === "checking" && "Checking…"}
              {pushStatus === "unsupported" && "Not supported on this device/browser."}
              {pushStatus === "denied" && "Blocked: enable notifications for this site in your browser settings."}
              {pushStatus === "disabled" && "Off on this device. Turn on to receive the alerts below."}
              {pushStatus === "enabled" && "On for this device."}
            </span>
            {pushError && <span className="mt-1 block text-[12px] font-medium text-danger">{pushError}</span>}
          </span>
          {(pushStatus === "disabled" || pushStatus === "enabled") && (
            <button
              type="button"
              disabled={pushBusy}
              onClick={pushStatus === "enabled" ? handleDisablePush : handleEnablePush}
              className="shrink-0 rounded-input border border-border px-3 py-1.5 text-[12px] font-semibold text-teal disabled:opacity-50"
            >
              {pushBusy ? "…" : pushStatus === "enabled" ? "Turn Off" : "Turn On"}
            </button>
          )}
        </div>
      </Section>

      <Section>
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-teal/10 text-teal">
                {row.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-text">{row.title}</span>
                <span className="block text-[12px] text-text-secondary">{row.subtitle}</span>
              </span>
              <Toggle checked={settings[row.key]} onChange={(v) => update({ [row.key]: v })} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
