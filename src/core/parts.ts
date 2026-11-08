import { countChars } from "./charCount";

const segmenter = new Intl.Segmenter(undefined, { granularity: "sentence" });

/**
 * Splits text into parts of at most `max` counted characters, breaking at sentence
 * boundaries. A single sentence longer than `max` is cut at word boundaries, and
 * as a last resort at grapheme boundaries, so no part is ever over the limit.
 */
export function splitIntoParts(text: string, max: number, rule: string = "plain"): string[] {
  const clean = text.trim();
  if (clean === "") return [];
  const fits = (s: string) => countChars(s, rule) <= max;
  const parts: string[] = [];
  let current = "";
  const push = () => {
    if (current.trim() !== "") parts.push(current.trim());
    current = "";
  };
  const pieces = Array.from(segmenter.segment(clean), (s) => s.segment).flatMap((s) =>
    fits(s.trim()) ? [s] : cutLong(s, fits),
  );
  for (const piece of pieces) {
    if (current !== "" && !fits((current + piece).trim())) push();
    current += piece;
  }
  push();
  return parts;
}

function cutLong(sentence: string, fits: (s: string) => boolean): string[] {
  const out: string[] = [];
  let current = "";
  for (const word of sentence.split(/(?<=\s)/u)) {
    if (!fits((current + word).trim())) {
      if (current !== "") out.push(current);
      current = "";
    }
    if (!fits(word.trim())) {
      // A single unbroken word: cut by grapheme.
      const graphemes = Array.from(
        new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(word),
        (s) => s.segment,
      );
      for (const g of graphemes) {
        if (!fits((current + g).trim())) {
          out.push(current);
          current = "";
        }
        current += g;
      }
    } else {
      current += word;
    }
  }
  if (current !== "") out.push(current);
  return out;
}
