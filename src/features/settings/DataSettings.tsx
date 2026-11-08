import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components";
import { exportFileName } from "../../core/backup";
import { exportAll, importAll } from "../../db/dataTransfer";
import { platform } from "../../platform";

type Message = { tone: "ok" | "error"; text: string } | null;

export function DataSettings() {
  const { t } = useTranslation();
  const [message, setMessage] = useState<Message>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const desktop = platform.window.platform !== "web";

  const doExport = async () => {
    try {
      const json = await exportAll(platform.database);
      const where = await platform.files.saveExport(exportFileName(new Date()), json);
      setMessage({
        tone: "ok",
        text: where ? t("settings.data.exportedTo", { path: where }) : t("settings.data.exported"),
      });
    } catch {
      setMessage({ tone: "error", text: t("settings.data.exportFailed") });
    }
  };

  const doImport = async (file: File) => {
    const result = await importAll(platform.database, await file.text());
    setMessage(
      result.ok
        ? { tone: "ok", text: t("settings.data.imported") }
        : { tone: "error", text: t(`settings.data.importError.${result.reason}`) },
    );
    // Screens read the database on mount, so a reload shows the imported data.
    if (result.ok) setTimeout(() => location.assign("/"), 1200);
  };

  return (
    <div className="flex max-w-md flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t("settings.data.exportTitle")}</h2>
        <p className="text-xs text-text-3">{t("settings.data.exportHelp")}</p>
        <div>
          <Button onClick={() => void doExport()}>{t("settings.data.export")}</Button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t("settings.data.importTitle")}</h2>
        <p className="text-xs text-text-3">{t("settings.data.importHelp")}</p>
        <div>
          <Button onClick={() => fileInput.current?.click()}>{t("settings.data.import")}</Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            data-testid="import-file"
            aria-label={t("settings.data.import")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void doImport(file);
            }}
          />
        </div>
      </section>

      {desktop && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">{t("settings.data.databaseTitle")}</h2>
          <p className="text-xs text-text-3">{t("settings.data.databaseHelp")}</p>
          <div>
            <Button onClick={() => void platform.files.revealDatabase()}>
              {t("settings.data.reveal")}
            </Button>
          </div>
        </section>
      )}

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className="text-[13px] text-text-2">
          {message.text}
        </p>
      )}
    </div>
  );
}
