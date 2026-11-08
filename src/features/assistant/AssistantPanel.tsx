import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input } from "../../components";
import type { ApplyMode } from "../../core/assist";
import { type AssistantInput, useAssistant } from "./useAssistant";

interface Props extends AssistantInput {
  onApply: (mode: ApplyMode, text: string) => void;
}

export function AssistantPanel({ onApply, ...input }: Props) {
  const { t } = useTranslation();
  const { available, config, cards, running, error, send, cancel, discard } = useAssistant(input);
  const [free, setFree] = useState("");
  const connected = config !== null && (config.hasKey || config.verified);

  return (
    <section aria-label={t("assistant.title")} className="flex w-[300px] shrink-0 flex-col gap-3">
      <header>
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-3">
          <Sparkles size={14} strokeWidth={1.7} />
          {t("assistant.title")}
        </h2>
        {config ? <p className="mt-1 text-xs text-text-3">{config.model}</p> : null}
      </header>

      {!connected ? <p className="text-[13px] text-text-3">{t("assistant.notConnected")}</p> : null}

      <div className="flex flex-wrap gap-2">
        {available.map((c) => (
          <Button
            key={c.id}
            className="h-6 px-2 text-xs"
            onClick={() => void send(c, free)}
            disabled={!connected || running}
          >
            {c.name}
          </Button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-[13px] text-text-2">
          {t(`assistant.error.${error}`, { defaultValue: t("assistant.error.unknown") })}
        </p>
      ) : null}

      {running ? (
        <Button onClick={cancel}>
          <X size={14} strokeWidth={1.7} />
          {t("assistant.cancel")}
        </Button>
      ) : null}

      <ul className="flex flex-col gap-2">
        {cards.map((card) => (
          <li key={card.id} className="rounded-card bg-surface p-3">
            <p className="whitespace-pre-wrap text-[13px]">{card.text}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Button variant="ghost" onClick={() => onApply("replace", card.text)}>
                {t("assistant.replace")}
              </Button>
              <Button variant="ghost" onClick={() => onApply("insertBelow", card.text)}>
                {t("assistant.insertBelow")}
              </Button>
              <Button variant="ghost" onClick={() => onApply("use", card.text)}>
                {t("assistant.use")}
              </Button>
              <Button
                variant="icon"
                aria-label={t("assistant.dismiss")}
                onClick={() => discard(card.id)}
              >
                <X size={14} strokeWidth={1.7} />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="mt-auto"
        onSubmit={(e) => {
          e.preventDefault();
          void send(null, free);
          setFree("");
        }}
      >
        <Input
          aria-label={t("assistant.freeText")}
          placeholder={t("assistant.placeholder")}
          value={free}
          disabled={!connected || running}
          onChange={(e) => setFree(e.target.value)}
        />
      </form>
    </section>
  );
}
