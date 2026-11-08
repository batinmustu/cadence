import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select, TagInput, Toggle } from "../../components";
import { normalizeTagName, sameTagName, type Tag } from "../../core/tags";
import { consumeCaptureFocus, onCaptureFocusRequest } from "./captureFocus";
import type { PlatformOption, SeriesOption } from "./useIdeas";

const PLATFORM_KEY = "cadence.capture.platforms";

function loadSaved(): string[] {
  try {
    const raw = localStorage.getItem(PLATFORM_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

type Props = {
  platforms: PlatformOption[];
  tags: Tag[];
  series?: SeriesOption[];
  onCapture: (
    title: string,
    platformIds: string[],
    tagNames: string[],
    seriesId: string | null,
  ) => Promise<void>;
  autoFocus?: boolean;
};

export function CaptureBox({ platforms, tags, series = [], onCapture, autoFocus = false }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>(loadSaved);
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [seriesId, setSeriesId] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const focus = () => {
      if (consumeCaptureFocus()) ref.current?.focus();
    };
    focus();
    return onCaptureFocusRequest(focus);
  }, []);

  function toggle(id: string, on: boolean) {
    const next = on ? [...selected, id] : selected.filter((s) => s !== id);
    setSelected(next);
    try {
      localStorage.setItem(PLATFORM_KEY, JSON.stringify(next));
    } catch {
      // Remembering the toggles is a convenience only.
    }
  }

  async function submit() {
    const title = text.trim();
    if (!title) return;
    const tagNames = pendingTags;
    setText("");
    setPendingTags([]);
    const chosenSeries = series.some((s) => s.id === seriesId) ? seriesId : null;
    await onCapture(
      title,
      platforms.map((p) => p.id).filter((id) => selected.includes(id)),
      tagNames,
      chosenSeries,
    );
  }

  return (
    <div className="rounded-capture bg-surface p-4">
      <textarea
        ref={ref}
        value={text}
        rows={2}
        aria-label={t("ideas.capture.label")}
        placeholder={t("ideas.capture.placeholder")}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void submit();
          }
        }}
        className="w-full resize-none bg-transparent text-text placeholder:text-text-4 focus:outline-none"
      />
      <div className="mt-2">
        <TagInput
          selected={pendingTags.map((name) => ({
            id: tags.find((x) => sameTagName(x.name, name))?.id ?? `new:${name}`,
            name,
          }))}
          known={tags}
          onAdd={(name) =>
            setPendingTags((prev) =>
              prev.some((n) => sameTagName(n, name)) ? prev : [...prev, normalizeTagName(name)],
            )
          }
          onRemove={(tag) =>
            setPendingTags((prev) => prev.filter((n) => !sameTagName(n, tag.name)))
          }
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-2">
          {platforms.map((p) => (
            <Toggle
              key={p.id}
              pressed={selected.includes(p.id)}
              onPressedChange={(on) => toggle(p.id, on)}
            >
              {p.name}
            </Toggle>
          ))}
        </div>
        {series.length > 0 ? (
          <Select
            aria-label={t("series.new.picker")}
            className="h-7 w-36 rounded-md text-xs"
            value={seriesId}
            onValueChange={(v) => setSeriesId(v)}
          >
            <option value="">{t("series.new.none")}</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        ) : null}
        <button
          type="button"
          aria-label={t("ideas.capture.save")}
          onClick={() => void submit()}
          className="flex size-8 items-center justify-center rounded-full bg-text text-bg"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );
}
