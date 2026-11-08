import { X } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeTagName, suggestTags, type Tag } from "../core/tags";

type Props = {
  /** Tags already on the item. */
  selected: Tag[];
  /** Every known tag, for autocomplete. */
  known: Tag[];
  onAdd: (name: string) => void;
  onRemove: (tag: Tag) => void;
};

export function TagInput({ selected, known, onAdd, onRemove }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const listId = useId();
  const suggestions = text.trim()
    ? suggestTags(
        known,
        text,
        selected.map((s) => s.id),
      ).slice(0, 5)
    : [];

  function add(name: string) {
    if (!normalizeTagName(name)) return;
    onAdd(name);
    setText("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex h-6 items-center gap-1 rounded-chip bg-surface-2 pl-2 pr-1 text-xs text-text-2"
        >
          #{tag.name}
          <button
            type="button"
            aria-label={t("tags.remove", { name: tag.name })}
            onClick={() => onRemove(tag)}
            className="flex size-4 items-center justify-center rounded-full text-text-3 hover:text-text"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <div className="relative">
        <input
          value={text}
          aria-label={t("tags.add")}
          placeholder={t("tags.placeholder")}
          aria-controls={suggestions.length > 0 ? listId : undefined}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.stopPropagation();
              add(text);
            } else if (e.key === "Backspace" && text === "") {
              const last = selected[selected.length - 1];
              if (last) onRemove(last);
            }
          }}
          className="h-6 w-28 bg-transparent text-xs text-text placeholder:text-text-4 focus:outline-none"
        />
        {suggestions.length > 0 ? (
          <ul
            id={listId}
            className="absolute left-0 top-7 z-10 m-0 min-w-32 list-none rounded-row border border-border-input bg-surface p-1 shadow-sm"
          >
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => add(s.name)}
                  className="w-full rounded-chip px-2 py-1 text-left text-xs text-text hover:bg-surface-2"
                >
                  #{s.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
