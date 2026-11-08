import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { requestCaptureFocus } from "../../features/ideas/captureFocus";
import { Onboarding } from "../../features/onboarding/Onboarding";
import { SettingsDialog } from "../../features/settings/SettingsDialog";
import { platform } from "../../platform";
import { PageContainer } from "./PageContainer";
import { Sidebar } from "./Sidebar";
import { useTitleBarDrag } from "./useWindowDrag";

export function AppShell() {
  const dragRef = useTitleBarDrag<HTMLDivElement>();
  const navigate = useNavigate();
  useEffect(
    () =>
      platform.window.onQuickCapture(() => {
        requestCaptureFocus();
        void navigate({ to: "/ideas" });
      }),
    [navigate],
  );
  return (
    <div className="flex h-full bg-bg text-text">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 36px drag strip above the content (window chrome spec). */}
        <div ref={dragRef} className="h-9 shrink-0" />
        <main className="min-h-0 flex-1 overflow-y-auto px-8 pb-8">
          <PageContainer>
            <Outlet />
          </PageContainer>
        </main>
      </div>
      <SettingsDialog />
      {import.meta.env.VITE_SKIP_ONBOARDING ? null : <Onboarding />}
    </div>
  );
}
