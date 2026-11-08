import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ToggleChip } from "../../components";
import type { PlatformOption } from "./useIdeas";

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
  onCapture: (title: string, platformIds: string[]) => Promise<void>;
  autoFocus?: boolean;
};

export function CaptureBox({ platforms, onCapture, autoFocus = false }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>(loadSaved);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

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
    setText("");
    await onCapture(
      title,
      platforms.map((p) => p.id).filter((id) => selected.includes(id)),
    );
  }

  return (
    <div className="rounded-card bg-surface p-4">
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
      <div className="mt-2 flex items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-2">
          {platforms.map((p) => (
            <ToggleChip
              key={p.id}
              pressed={selected.includes(p.id)}
              onChange={(on) => toggle(p.id, on)}
            >
              {p.name}
            </ToggleChip>
          ))}
        </div>
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
