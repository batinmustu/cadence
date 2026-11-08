import { useNavigate } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Input, Select, Textarea, Toggle } from "../../components";
import { ICON_STROKE, iconSize } from "../../components/iconSize";
import type { Idea } from "../../core/ideas";
import type { Slot } from "../../core/series";
import { type Frequency, WEEKDAY_KEYS } from "../../core/weekdays";
import { useAiAvailable } from "../settings/aiConfig";
import { useSeries } from "./useSeries";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-text-3">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

const FREQUENCIES: Frequency[] = ["weekly", "biweekly", "monthly"];
const REMIND_HOURS = 24;

export function SeriesScreen({ seriesId }: { seriesId: string }) {
  const aiAvailable = useAiAvailable();
  const { t, i18n } = useTranslation();
  const s = useSeries(seriesId);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [drafting, setDrafting] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { series } = s;

  if (!series) {
    return s.loaded ? <p className="text-text-3">{t("series.screen.notFound")}</p> : null;
  }

  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rhythm =
    series.frequency === "weekly"
      ? [...series.weekdays]
          .sort((a, b) => a - b)
          .map((d) => t(`weekday.${WEEKDAY_KEYS[d] ?? "sun"}`))
          .join(" ")
      : t(`series.new.${series.frequency}`);
  const ideaOf = (postId: string | null): Idea | undefined => {
    const post = s.posts.find((p) => p.id === postId);
    return [...s.groups.planned, ...s.groups.published].find((i) => i.id === post?.ideaId);
  };
  const ideaList = (list: Idea[]) => (
    <ul className="m-0 list-none p-0">
      {list.map((i) => (
        <li key={i.id} className="rounded-row px-2 py-1.5 hover:bg-surface">
          {i.title}
        </li>
      ))}
    </ul>
  );

  const draftWithAi = async (slot: Slot) => {
    setDraftError(null);
    setDrafting(slot.at);
    try {
      const ideaId = await s.aiDraft(slot);
      await navigate({ to: "/ideas/$id", params: { id: ideaId } });
    } catch (e) {
      setDraftError(typeof e === "string" ? e : "unknown");
    } finally {
      setDrafting(null);
    }
  };

  const slotCard = (slot: Slot) => {
    const idea = slot.filled ? ideaOf(slot.postId) : undefined;
    return (
      <li
        key={slot.at}
        data-testid={slot.filled ? "slot-filled" : "slot-empty"}
        className={`flex flex-col gap-2 rounded-card p-3 ${
          slot.filled ? "bg-surface" : "border border-dashed border-border-strong"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-3">{dateFmt.format(new Date(slot.at))}</span>
          {slot.filled ? (
            <>
              <span className="min-w-0 flex-1 truncate font-medium">{idea?.title}</span>
              <Badge>{t("series.screen.planned")}</Badge>
            </>
          ) : (
            <span className="text-text-3">{t("series.screen.empty")}</span>
          )}
        </div>
        {!slot.filled ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              aria-expanded={assigning === slot.at}
              onClick={() => setAssigning(assigning === slot.at ? null : slot.at)}
            >
              {t("series.screen.assign")}
            </Button>
            {aiAvailable ? (
              <Button disabled={drafting !== null} onClick={() => void draftWithAi(slot)}>
                <Sparkles size={iconSize.inline} strokeWidth={ICON_STROKE} />
                {drafting === slot.at ? t("series.screen.drafting") : t("series.screen.aiDraft")}
              </Button>
            ) : null}
            {assigning === slot.at ? (
              s.groups.unscheduled.length === 0 ? (
                <span className="text-xs text-text-3">{t("series.screen.noIdeas")}</span>
              ) : (
                <Select
                  aria-label={t("series.screen.pickIdea")}
                  className="w-56"
                  value=""
                  onValueChange={(v) => {
                    const id = v;
                    if (!id) return;
                    setAssigning(null);
                    void s.assignIdea(id, slot);
                  }}
                >
                  <option value="">{t("series.screen.pickIdea")}</option>
                  {s.groups.unscheduled.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
                </Select>
              )
            ) : null}
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className="flex gap-8">
      <section className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase text-text-3">{t("series.screen.label")}</div>
        <h1 className="mt-1 text-[22px] font-semibold">{series.name}</h1>
        {series.description ? <p className="mt-1 text-text-3">{series.description}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>{`${rhythm} · ${series.time}`}</Badge>
          {s.platformName ? <Badge>{s.platformName}</Badge> : null}
          <Badge>
            {t("series.screen.counts", {
              planned: s.groups.planned.length,
              published: s.groups.published.length,
            })}
          </Badge>
        </div>

        <h2 className="mb-2 mt-8 text-xs font-medium uppercase text-text-3">
          {t("series.screen.upcoming")}
        </h2>
        {draftError ? (
          <p role="alert" className="mb-2 text-[13px] text-text-2">
            {t(`assistant.error.${draftError}`, { defaultValue: t("assistant.error.unknown") })}
          </p>
        ) : null}
        {s.slots.length === 0 ? (
          <p className="text-text-3">{t("series.screen.noSlots")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">{s.slots.map(slotCard)}</ul>
        )}

        <h2 className="mb-2 mt-8 text-xs font-medium uppercase text-text-3">
          {t("series.screen.ideas")}
        </h2>
        {ideaList(s.groups.unscheduled)}
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void s.addIdea(newTitle);
            setNewTitle("");
          }}
        >
          <Input
            aria-label={t("series.screen.addIdea")}
            placeholder={t("series.screen.addIdea")}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Button type="submit" disabled={newTitle.trim() === ""}>
            <Plus size={iconSize.inline} />
            {t("series.screen.add")}
          </Button>
        </form>

        {s.groups.published.length > 0 ? (
          <>
            <h2 className="mb-2 mt-8 text-xs font-medium uppercase text-text-3">
              {t("series.screen.published")}
            </h2>
            {ideaList(s.groups.published)}
          </>
        ) : null}
      </section>

      <aside
        aria-label={t("series.screen.settings")}
        className="flex w-[290px] shrink-0 flex-col gap-3 border-l border-border-input pl-6"
      >
        <h2 className="text-xs font-medium uppercase text-text-3">{t("series.screen.settings")}</h2>
        <Field id="ss-name" label={t("series.new.name")}>
          <Input
            id="ss-name"
            value={series.name}
            onChange={(e) => s.edit({ name: e.target.value })}
          />
        </Field>
        <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
          <legend className="mb-1 text-xs text-text-3">{t("series.new.weekdays")}</legend>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_KEYS.map((key, d) => (
              <Toggle
                key={key}
                pressed={series.weekdays.includes(d)}
                onPressedChange={(on) =>
                  s.edit({
                    weekdays: on ? [...series.weekdays, d] : series.weekdays.filter((x) => x !== d),
                  })
                }
              >
                {t(`weekday.${key}`)}
              </Toggle>
            ))}
          </div>
        </fieldset>
        <Field id="ss-time" label={t("series.new.time")}>
          <Input
            id="ss-time"
            type="time"
            value={series.time}
            onChange={(e) =>
              /^\d{2}:\d{2}$/.test(e.target.value) && s.edit({ time: e.target.value })
            }
          />
        </Field>
        <Field id="ss-frequency" label={t("series.new.frequency")}>
          <Select
            id="ss-frequency"
            value={series.frequency}
            onValueChange={(v) => s.edit({ frequency: v as Frequency })}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t(`series.new.${f}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="ss-platform" label={t("series.new.platform")}>
          <Select
            id="ss-platform"
            value={series.platformId}
            onValueChange={(v) => s.edit({ platformId: v })}
          >
            {s.platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="ss-template" label={t("series.screen.template")}>
          <Textarea
            id="ss-template"
            value={series.template}
            placeholder={t("series.screen.templateHint")}
            onChange={(e) => s.edit({ template: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={series.remindBeforeHours > 0}
            onChange={(e) => s.edit({ remindBeforeHours: e.target.checked ? REMIND_HOURS : 0 })}
          />
          {t("series.screen.remind")}
        </label>
      </aside>
    </div>
  );
}
