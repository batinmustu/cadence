import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  return (
    <div className="flex h-full bg-bg text-text">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 36px drag strip above the content (window chrome spec). */}
        <div data-tauri-drag-region className="h-9 shrink-0" />
        <main className="min-h-0 flex-1 overflow-y-auto px-8 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
