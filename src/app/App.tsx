import { useTranslation } from "react-i18next";
import { platform } from "../platform";

// Placeholder until the app shell lands (issue #8).
export function App() {
  const { t } = useTranslation();
  return (
    <main className="flex h-full flex-col items-center justify-center gap-2">
      <h1 className="text-xl font-semibold">{t("app.name")}</h1>
      <p className="text-text-3" data-testid="platform">
        {platform.window.platform}
      </p>
    </main>
  );
}
