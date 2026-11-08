import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { ComponentsGallery } from "./app/ComponentsGallery";
import { prepareDatabase } from "./db";
import { startReminders } from "./features/series/reminderSync";
import { runDailyBackup } from "./features/settings/dailyBackup";
import { applyGeneralSettings } from "./features/settings/generalConfig";
import { onContentWritten, platform } from "./platform";
import "./i18n";
import "./styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// Render once the schema is ready so screens can query immediately.
await prepareDatabase(platform.database);
await applyGeneralSettings().catch(() => {});
void runDailyBackup(platform.database, platform.files);
startReminders(platform.database, platform.notifications, onContentWritten);

createRoot(root).render(
  <StrictMode>
    {import.meta.env.DEV && location.pathname === "/__components" ? <ComponentsGallery /> : <App />}
  </StrictMode>,
);
