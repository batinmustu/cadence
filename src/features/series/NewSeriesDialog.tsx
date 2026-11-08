import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button, Input, Segmented, Select, Toggle } from "../../components";
import type { Series } from "../../core/series";
import { type Frequency, WEEKDAY_KEYS } from "../../core/weekdays";
import { createPlatformsRepository } from "../../db/repositories/platforms";
import { createSeriesRepository } from "../../db/repositories/series";
import { platform } from "../../platform";
import { notifySeriesChanged } from "./seriesEvents";

const FREQUENCIES: Frequency[] = ["weekly", "biweekly", "monthly"];

interface PlatformRow {
  id: string;
  name: string;
}

type Props = { onClose: () => void; onCreated?: (series: Series) => void };

export function NewSeriesDialog({ onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [platforms, setPlatforms] = useState<PlatformRow[]>([]);
  const [name, setName] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState("09:00");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [failed, setFailed] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    createPlatformsRepository(platform.database)
      .listVisible()
      .then((rows) => {
        setPlatforms(rows);
        setPlatformId((cur) => cur || (rows[0]?.id ?? ""));
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canCreate = name.trim() !== "" && platformId !== "" && /^\d{2}:\d{2}$/.test(time);

  async function submit() {
    if (!canCreate) return;
    try {
      const created = await createSeriesRepository(platform.database).create({
        name,
        platformId,
        weekdays: days,
        time,
        frequency,
      });
      notifySeriesChanged();
      onCreated?.(created);
      onClose();
    } catch {
      setFailed(true);
    }
  }

  function toggleDay(d: number, on: boolean) {
    setDays((prev) => (on ? [...prev, d] : prev.filter((x) => x !== d)));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogTitle>{t("series.new.title")}</DialogTitle>
          <div className="flex flex-col gap-1 text-xs text-text-3">
            <label htmlFor="sd-name">{t("series.new.name")}</label>
            <Input
              id="sd-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1 text-xs text-text-3">
            <label htmlFor="sd-platform">{t("series.new.platform")}</label>
            <Select id="sd-platform" value={platformId} onValueChange={(v) => setPlatformId(v)}>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
            <legend className="mb-1 text-xs text-text-3">{t("series.new.weekdays")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_KEYS.map((key, d) => (
                <Toggle
                  key={key}
                  pressed={days.includes(d)}
                  onPressedChange={(on) => toggleDay(d, on)}
                >
                  {t(`weekday.${key}`)}
                </Toggle>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1 text-xs text-text-3">
            <label htmlFor="sd-time">{t("series.new.time")}</label>
            <Input
              id="sd-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <Segmented
            label={t("series.new.frequency")}
            value={frequency}
            onChange={setFrequency}
            options={FREQUENCIES.map((f) => ({ value: f, label: t(`series.new.${f}`) }))}
          />
          {failed ? (
            <p role="alert" className="text-xs text-text-3">
              {t("series.new.error")}
            </p>
          ) : null}
          <div className="mt-1 flex justify-end gap-2">
            <Button onClick={onClose}>{t("series.new.cancel")}</Button>
            <Button type="submit" variant="primary" disabled={!canCreate}>
              {t("series.new.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
