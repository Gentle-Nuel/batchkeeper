import { useNavigate } from "react-router-dom";
import { CloudOff, RefreshCw, Check } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { BackHeader, Card, Section, SecondaryButton } from "../../components/ui";
import { formatDate } from "../../lib/format";

export function SyncStatus() {
  const navigate = useNavigate();
  const syncState = useAppStore((s) => s.syncState);
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt);
  const syncNow = useAppStore((s) => s.syncNow);

  const pending = syncState !== "synced";

  return (
    <div className="pb-8">
      <BackHeader title="Sync Status" onBack={() => navigate(-1)} />

      <Section>
        <Card className={pending ? "border-status-curing-text/20 bg-status-curing-bg" : ""}>
          <div className="flex items-center gap-2.5">
            {pending ? (
              <CloudOff size={18} className="text-status-curing-text" />
            ) : (
              <Check size={18} className="text-teal" />
            )}
            <p className={`text-[14px] font-semibold ${pending ? "text-status-curing-text" : "text-text"}`}>
              {pending ? `${pendingSyncCount} item${pendingSyncCount === 1 ? "" : "s"} waiting to sync` : "All changes synced"}
            </p>
          </div>
          {lastSyncedAt && (
            <p className="mt-1 text-[12px] text-text-secondary">Last synced {formatDate(lastSyncedAt)}</p>
          )}
          <div className="mt-3">
            <SecondaryButton type="button" onClick={syncNow}>
              <RefreshCw size={14} />
              Sync Now
            </SecondaryButton>
          </div>
        </Card>
      </Section>

      <Section title="How offline mode works">
        <Card className="bg-teal/5">
          <p className="text-[12px] leading-relaxed text-text-secondary">
            You can keep logging batches and sales even without an internet connection. Everything you enter is
            saved on your phone first, then synced automatically the next time you're online. Nothing is ever lost
            while offline.
          </p>
        </Card>
      </Section>
    </div>
  );
}
