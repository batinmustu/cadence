import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Select } from "../../components";
import { type CalendarItem, groupByDate, type MonthRef, shiftMonth } from "../../core/calendar";
import { fromLocalParts } from "../../core/schedule";
import { WEEKDAY_KEYS } from "../../core/weekdays";
import { useCalendar } from "./useCalendar";

const MAX_CHIPS = 3;
const DEFAULT_TIME = "09:00";
const todayRef = (): MonthRef => {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
};
const todayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const chipBase = "block truncate rounded-chip px-2 py-0.5 text-xs no-underline";
const chipStyle = {
  planned: "bg-surface-2 text-text",
  empty: "border border-dashed border-border-strong text-text-3",
  published: "text-text-3",
} as const;

function Chip({ item }: { item: CalendarItem }) {
  const { t } = useTranslation();
  const className = `${chipBase} ${chipStyle[item.kind]}`;
  const label = item.kind === "empty" ? t("calendar.emptySlot", { name: item.label }) : item.label;
  if (item.seriesId)
    return (
      <Link to="/series/$id" params={{ id: item.seriesId }} className={className}>
        {label}
      </Link>
    );
  return (
    <Link to="/ideas/$id" params={{ id: item.ideaId ?? "" }} className={className}>
      {label}
    </Link>
  );
}

export function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(todayRef);
  const { grid, items, ideas, scheduleIdea } = useCalendar(month);
  const [picked, setPicked] = useState<string>("");
  const [dialog, setDialog] = useState<{ ideaId: string; date: string } | null>(null);
  const [time, setTime] = useState(DEFAULT_TIME);
  const byDate = groupByDate(items);
  const today = todayDate();
  const title = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(
    new Date(month.year, month.month, 1),
  );

  const dialogIdea = ideas.find((i) => i.id === dialog?.ideaId);
  const iso = dialog ? fromLocalParts(dialog.date, time) : null;

  return (
    <div className="flex gap-6">
      <section className="min-w-0 flex-1">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="mr-auto text-[22px] font-semibold" aria-live="polite">
            {title}
          </h1>
          <Button aria-label={t("calendar.prev")} onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeft size={14} />
          </Button>
          <Button onClick={() => setMonth(todayRef())}>{t("calendar.today")}</Button>
          <Button aria-label={t("calendar.next")} onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronRight size={14} />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-px text-xs text-text-3">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <div key={d} className="px-2 pb-1">
              {t(`weekday.${WEEKDAY_KEYS[d] ?? "mon"}`)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-row bg-border-input">
          {grid.map((day) => {
            const list = byDate.get(day.date) ?? [];
            return (
              <fieldset
                key={day.date}
                aria-label={day.date}
                data-testid="calendar-day"
                data-date={day.date}
                className={`m-0 min-h-24 min-w-0 border-0 bg-bg p-1.5 ${day.inMonth ? "" : "opacity-50"}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) setDialog({ ideaId: id, date: day.date });
                }}
              >
                <span
                  className={`mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs ${
                    day.date === today ? "bg-surface-2 font-semibold" : "text-text-3"
                  }`}
                >
                  {day.day}
                </span>
                <div className="flex flex-col gap-1">
                  {list.slice(0, MAX_CHIPS).map((i) => (
                    <Chip key={i.key} item={i} />
                  ))}
                  {list.length > MAX_CHIPS ? (
                    <span className="px-2 text-xs text-text-3">
                      {t("calendar.more", { count: list.length - MAX_CHIPS })}
                    </span>
                  ) : null}
                </div>
              </fieldset>
            );
          })}
        </div>
        <ul className="m-0 mt-3 flex list-none gap-4 p-0 text-xs text-text-3">
          <li>{t("calendar.legend.planned")}</li>
          <li>{t("calendar.legend.empty")}</li>
          <li>{t("calendar.legend.published")}</li>
        </ul>
      </section>
      <aside
        aria-label={t("calendar.unscheduled")}
        className="flex w-[250px] shrink-0 flex-col gap-2 border-l border-border-input pl-6"
      >
        <h2 className="text-xs font-medium uppercase text-text-3">{t("calendar.unscheduled")}</h2>
        {ideas.length === 0 ? <p className="text-text-3">{t("calendar.noIdeas")}</p> : null}
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {ideas.map((i) => (
            <li
              key={i.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", i.id)}
              className="cursor-grab truncate rounded-row bg-surface px-2 py-1.5"
            >
              {i.title}
            </li>
          ))}
        </ul>
        {ideas.length > 0 ? (
          <div className="mt-2 flex flex-col gap-2">
            <Select
              aria-label={t("calendar.pickIdea")}
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
            >
              <option value="">{t("calendar.pickIdea")}</option>
              {ideas.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
            </Select>
            <Button
              disabled={picked === ""}
              onClick={() => setDialog({ ideaId: picked, date: todayDate() })}
            >
              {t("calendar.chooseDate")}
            </Button>
          </div>
        ) : null}
      </aside>
      {dialog && dialogIdea ? (
        <div
          role="dialog"
          aria-label={t("calendar.scheduleTitle")}
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/40"
        >
          <form
            className="flex w-80 flex-col gap-3 rounded-row border border-border-strong bg-surface p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!iso) return;
              void scheduleIdea(dialog.ideaId, iso);
              setDialog(null);
              setPicked("");
            }}
          >
            <h2 className="text-base font-semibold">{dialogIdea.title}</h2>
            <div className="flex flex-col gap-1 text-xs text-text-3">
              <label htmlFor="cal-date">{t("calendar.date")}</label>
              <Input
                id="cal-date"
                type="date"
                value={dialog.date}
                onChange={(e) => setDialog({ ...dialog, date: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1 text-xs text-text-3">
              <label htmlFor="cal-time">{t("calendar.time")}</label>
              <Input
                id="cal-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => setDialog(null)}>
                {t("calendar.cancel")}
              </Button>
              <Button type="submit" variant="primary" disabled={!iso}>
                {t("calendar.schedule")}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
