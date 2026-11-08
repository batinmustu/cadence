import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components";
import { type CalendarItem, groupByDate, type MonthRef, shiftMonth } from "../../core/calendar";
import { WEEKDAY_KEYS } from "../../core/weekdays";
import { useCalendar } from "./useCalendar";

const MAX_CHIPS = 3;
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
  const { grid, items } = useCalendar(month);
  const byDate = groupByDate(items);
  const today = todayDate();
  const title = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(
    new Date(month.year, month.month, 1),
  );

  return (
    <section>
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
            <div
              key={day.date}
              data-testid="calendar-day"
              data-date={day.date}
              className={`min-h-24 bg-bg p-1.5 ${day.inMonth ? "" : "opacity-50"}`}
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
            </div>
          );
        })}
      </div>
      <ul className="m-0 mt-3 flex list-none gap-4 p-0 text-xs text-text-3">
        <li>{t("calendar.legend.planned")}</li>
        <li>{t("calendar.legend.empty")}</li>
        <li>{t("calendar.legend.published")}</li>
      </ul>
    </section>
  );
}
