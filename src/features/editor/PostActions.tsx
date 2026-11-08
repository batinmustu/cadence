import { Copy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Textarea } from "../../components";
import { ICON_STROKE, iconSize } from "../../components/iconSize";
import type { FieldSchema } from "../../core/fieldSchema";
import type { Post, PostPatch } from "../../core/posts";
import { fromLocalParts, toLocalParts, variantText } from "../../core/schedule";
import { platform } from "../../platform";

interface Props {
  post: Post;
  schema: FieldSchema;
  onUpdate: (patch: PostPatch) => Promise<void>;
}

type Panel = "schedule" | "publish" | null;

export function PostActions({ post, schema, onUpdate }: Props) {
  const { t } = useTranslation();
  const [panel, setPanel] = useState<Panel>(null);
  const [copied, setCopied] = useState(false);
  const initial = post.scheduledAt ? toLocalParts(post.scheduledAt) : { date: "", time: "" };
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [url, setUrl] = useState(post.publishedUrl ?? "");
  const [note, setNote] = useState(post.afterNote ?? "");
  const iso = fromLocalParts(date, time);

  const copy = async () => {
    await platform.clipboard.writeText(variantText(schema, post.fields));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const close = () => setPanel(null);

  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-border-input pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void copy()}>
          <Copy size={iconSize.inline} strokeWidth={ICON_STROKE} />
          {copied ? t("editor.copied") : t("editor.copy")}
        </Button>
        {post.status === "published" ? (
          <span className="text-xs text-text-3">
            {t("editor.publishedOn", {
              date: toLocalParts(post.publishedAt ?? post.updatedAt).date,
            })}
          </span>
        ) : (
          <>
            <Button aria-expanded={panel === "schedule"} onClick={() => setPanel("schedule")}>
              {post.status === "scheduled" ? t("editor.reschedule") : t("editor.schedule")}
            </Button>
            <Button aria-expanded={panel === "publish"} onClick={() => setPanel("publish")}>
              {t("editor.markPublished")}
            </Button>
          </>
        )}
        {post.status === "scheduled" && post.scheduledAt ? (
          <span className="text-xs text-text-3">
            {t("editor.plannedFor", { date: `${initial.date} ${initial.time}` })}
          </span>
        ) : null}
      </div>

      {panel === "schedule" ? (
        <form
          aria-label={t("editor.schedule")}
          className="flex flex-wrap items-center gap-2 rounded-card bg-surface p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!iso) return;
            await onUpdate({ status: "scheduled", scheduledAt: iso });
            close();
          }}
        >
          <Input
            type="date"
            aria-label={t("editor.date")}
            className="w-40"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            type="time"
            aria-label={t("editor.time")}
            className="w-28"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <Button type="submit" variant="primary" disabled={!iso}>
            {t("editor.save")}
          </Button>
          {post.status === "scheduled" ? (
            <Button
              onClick={async () => {
                await onUpdate({ status: "draft" });
                close();
              }}
            >
              {t("editor.unschedule")}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={close}>
            {t("editor.cancel")}
          </Button>
        </form>
      ) : null}

      {panel === "publish" ? (
        <form
          aria-label={t("editor.markPublished")}
          className="flex flex-col gap-2 rounded-card bg-surface p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await onUpdate({
              status: "published",
              publishedUrl: url.trim() === "" ? null : url.trim(),
              afterNote: note.trim() === "" ? null : note.trim(),
            });
            close();
          }}
        >
          <Input
            aria-label={t("editor.publishedUrl")}
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Textarea
            aria-label={t("editor.afterNote")}
            placeholder={t("editor.afterNote")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" variant="primary">
              {t("editor.markPublished")}
            </Button>
            <Button variant="ghost" onClick={close}>
              {t("editor.cancel")}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
