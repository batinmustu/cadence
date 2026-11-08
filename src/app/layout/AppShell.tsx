import { Outlet, useNavigate } from "@tanstack/react-router";
import { PanelLeft, Search } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components";
import { requestCaptureFocus } from "../../features/ideas/captureFocus";
import { Onboarding } from "../../features/onboarding/Onboarding";
import { platform } from "../../platform";
import { Sidebar } from "./Sidebar";
import { useSidebarCollapsed } from "./useSidebarCollapsed";

export function AppShell() {
  const { t } = useTranslation();
  const [collapsed, toggle] = useSidebarCollapsed();
  const navigate = useNavigate();
  useEffect(
    () =>
      platform.window.onQuickCapture(() => {
        requestCaptureFocus();
        void navigate({ to: "/ideas" });
      }),
    [navigate],
  );
  const isMac = platform.window.platform === "macos";
  return (
    <div className="flex h-full bg-bg text-text">
      {collapsed ? null : <Sidebar onToggle={toggle} />}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 36px drag strip above the content (window chrome spec). */}
        <div
          data-tauri-drag-region
          className={`flex h-9 shrink-0 items-center gap-1 ${collapsed ? (isMac ? "pl-20" : "pl-4") : ""}`}
        >
          {collapsed ? (
            <>
              <Button
                variant="icon"
                aria-label={t("nav.showSidebar")}
                title={`${t("nav.showSidebar")} (${platform.window.toggleSidebarShortcut})`}
                onClick={toggle}
              >
                <PanelLeft size={16} strokeWidth={1.7} />
              </Button>
              <Button variant="icon" aria-label={t("nav.search")}>
                <Search size={16} strokeWidth={1.7} />
              </Button>
            </>
          ) : null}
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto px-8 pb-8">
          <Outlet />
        </main>
      </div>
      {import.meta.env.VITE_SKIP_ONBOARDING ? null : <Onboarding />}
    </div>
  );
}
