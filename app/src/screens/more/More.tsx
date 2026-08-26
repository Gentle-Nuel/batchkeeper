import { useNavigate } from "react-router-dom";
import { NotebookText, BarChart3, Settings } from "lucide-react";
import { PageHeader, Section, MenuRow } from "../../components/ui";

export function More() {
  const navigate = useNavigate();

  return (
    <div className="pb-4">
      <PageHeader title="More" />

      <Section title="Business">
        <div className="flex flex-col gap-3">
          <MenuRow
            icon={<NotebookText size={18} />}
            title="Products & Recipes"
            subtitle="Recipes & NAFDAC status"
            onClick={() => navigate("/products")}
          />
          <MenuRow icon={<BarChart3 size={18} />} title="Reports" subtitle="Profit & loss over time" onClick={() => navigate("/reports")} />
        </div>
      </Section>

      <Section title="App">
        <MenuRow icon={<Settings size={18} />} title="Settings" subtitle="Business, sync, account, support" onClick={() => navigate("/settings")} />
      </Section>
    </div>
  );
}
