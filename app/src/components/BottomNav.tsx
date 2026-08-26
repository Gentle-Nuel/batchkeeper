import { NavLink } from "react-router-dom";
import { Factory, Package, MoreHorizontal } from "lucide-react";

const tabs = [
  { to: "/", label: "Production", icon: Factory, end: true },
  { to: "/materials", label: "Materials", icon: Package, end: false },
  { to: "/more", label: "More", icon: MoreHorizontal, end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex h-[83px] w-full max-w-md items-stretch border-t border-border bg-surface">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className="flex flex-1 flex-col items-center justify-center gap-1 pb-2"
        >
          {({ isActive }) => (
            <>
              <tab.icon size={22} className={isActive ? "text-teal" : "text-text-secondary"} />
              <span className={`text-[10px] font-semibold ${isActive ? "text-teal" : "text-text-secondary"}`}>
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
