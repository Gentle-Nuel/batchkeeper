import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, KeyRound, Download } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { useToastStore } from "../../store/useToastStore";
import { BackHeader, Section, MenuRow, DeleteLink, ConfirmDialog } from "../../components/ui";

export function Account() {
  const navigate = useNavigate();
  const userEmail = useAppStore((s) => s.userEmail);
  const exportAllData = useAppStore((s) => s.exportAllData);
  const showToast = useToastStore((s) => s.showToast);
  const [exporting, setExporting] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);

  async function handleExport() {
    setConfirmExport(false);
    setExporting(true);
    const { data, error } = await exportAllData();
    if (error || !data) {
      setExporting(false);
      showToast(error || "Couldn't export your data. Try again.");
      return;
    }
    // xlsx is only ever needed here, so it's dynamically imported rather
    // than sitting in the main bundle for everyone who never exports.
    const { buildExportWorkbook } = await import("../../lib/exportXlsx");
    const XLSX = await import("xlsx");
    const wb = buildExportWorkbook(data);
    const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    setExporting(false);
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batchkeeper-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Export downloaded");
  }

  return (
    <div className="pb-8">
      <BackHeader title="Account" onBack={() => navigate(-1)} />

      <Section>
        <div className="flex flex-col gap-3">
          <MenuRow icon={<Mail size={18} />} title="Email" subtitle={userEmail ?? undefined} onClick={() => navigate("/settings/account/change-email")} />
          <MenuRow icon={<KeyRound size={18} />} title="Change Password" onClick={() => navigate("/settings/account/change-password")} />
          <MenuRow
            icon={<Download size={18} />}
            title="Export My Data"
            subtitle={exporting ? "Preparing…" : "Download an Excel copy of everything"}
            onClick={exporting ? undefined : () => setConfirmExport(true)}
          />
        </div>
      </Section>

      <Section>
        <DeleteLink type="button" onClick={() => navigate("/settings/account/delete")}>
          Delete Account
        </DeleteLink>
      </Section>

      <ConfirmDialog
        open={confirmExport}
        tone="neutral"
        title="Export your data?"
        message="This pulls everything across every business you own into one Excel file and downloads it to this device."
        confirmLabel="Export"
        onConfirm={handleExport}
        onCancel={() => setConfirmExport(false)}
      />
    </div>
  );
}
