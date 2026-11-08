import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button, Input, Select } from "../../components";
import type { CalendarItem } from "../../core/calendar";
import type { Idea } from "../../core/ideas";
import { fromLocalParts } from "../../core/schedule";

interface Props {
  date: string;
  items: CalendarItem[];
  ideas: Idea[];
  onSchedule: (ideaId: string, iso: string) => Promise<void>;
  onCreate: (title: string, iso: string) => Promise<void>;
  onMove: (postId: string, date: string) => Promise<void>;
  onUnschedule: (postId: string) => Promise<void>;
  onClose: () => void;
}

const DEFAULT_TIME = "09:00";

/**
 * Everything about one day: the full list of what is on it (the overflow view),
 * moving or unscheduling posts, and adding an idea. It is also the keyboard
 * alternative to drag and drop.
 */
export function DayDialog({
  date,
  items,
  ideas,
  onSchedule,
  onCreate,
  onMove,
  onUnschedule,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation();
  const [time, setTime] = useState(DEFAULT_TIME);
  const [ideaId, setIdeaId] = useState("");
  const [title, setTitle] = useState("");
  const [moveDates, setMoveDates] = useState<Record<string, string>>({});
  const iso = fromLocalParts(date, time);
  const heading = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));
  const timeFmt = new Intl.DateTimeFormat(i18n.language, { hour: "2-digit", minute: "2-digit" });
  const done = (p: Promise<void>) => void p.then(onClose);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-[min(30rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto">
        <DialogTitle>{heading}</DialogTitle>
        <DialogDescription className="sr-only">{t("calendar.day.description")}</DialogDescription>

        {items.length === 0 ? <p className="text-text-3">{t("calendar.day.empty")}</p> : null}
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((i) => (
            <li key={i.key} className="flex flex-col gap-1.5 rounded-row bg-surface p-2">
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-xs text-text-3">{timeFmt.format(new Date(i.at))}</span>
                {i.seriesId ? (
                  <Link
                    to="/series/$id"
                    params={{ id: i.seriesId }}
                    className="min-w-0 flex-1 truncate"
                  >
                    {t("calendar.emptySlot", { name: i.label })}
                  </Link>
                ) : (
                  <Link
                    to="/ideas/$id"
                    params={{ id: i.ideaId ?? "" }}
                    className="min-w-0 flex-1 truncate"
                  >
                    {i.label}
                  </Link>
                )}
                {i.platform ? <span className="text-xs text-text-3">{i.platform}</span> : null}
                <span className="text-xs text-text-3">{t(`calendar.legend.${i.kind}`)}</span>
              </div>
              {i.kind === "planned" && i.postId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    aria-label={t("calendar.day.moveTo", { title: i.label })}
                    className="h-8 w-40"
                    value={moveDates[i.key] ?? date}
                    onChange={(e) => setMoveDates({ ...moveDates, [i.key]: e.target.value })}
                  />
                  <Button
                    disabled={(moveDates[i.key] ?? date) === date}
                    onClick={() => done(onMove(i.postId ?? "", moveDates[i.key] ?? date))}
                  >
                    {t("calendar.day.move")}
                  </Button>
                  <Button onClick={() => done(onUnschedule(i.postId ?? ""))}>
                    {t("calendar.day.unschedule")}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        <form
          className="flex flex-col gap-2 border-t border-divider pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!iso) return;
            if (ideaId) done(onSchedule(ideaId, iso));
            else if (title.trim()) done(onCreate(title.trim(), iso));
          }}
        >
          <h3 className="text-xs font-medium uppercase text-text-3">{t("calendar.day.add")}</h3>
          <div className="flex flex-col gap-1 text-xs text-text-3">
            <label htmlFor="day-time">{t("calendar.time")}</label>
            <Input
              id="day-time"
              type="time"
              className="w-32"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          {ideas.length > 0 ? (
            <Select
              aria-label={t("calendar.pickIdea")}
              value={ideaId}
              onValueChange={(v) => {
                setIdeaId(v);
                if (v) setTitle("");
              }}
            >
              <option value="">{t("calendar.pickIdea")}</option>
              {ideas.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
            </Select>
          ) : null}
          <Input
            aria-label={t("calendar.day.newIdea")}
            placeholder={t("calendar.day.newIdea")}
            value={title}
            disabled={ideaId !== ""}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={!iso || (ideaId === "" && title.trim() === "")}
            >
              {ideaId ? t("calendar.schedule") : t("calendar.day.createAndSchedule")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
