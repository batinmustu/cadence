import { describe, expect, it } from "vitest";
import { countChars, normalizeCountRule } from "./charCount";

describe("plain rule", () => {
  it("counts graphemes, not code units", () => {
    expect(countChars("hello")).toBe(5);
    expect(countChars("")).toBe(0);
    expect(countChars("😀")).toBe(1);
    expect(countChars("👨‍👩‍👧")).toBe(1);
    expect(countChars("🇹🇷")).toBe(1);
  });
  it("counts Turkish letters as one, precomposed or combining", () => {
    expect(countChars("çğıöşü İI")).toBe(9);
    expect(countChars("i̇")).toBe(1);
    expect(countChars("ş")).toBe(1);
  });
  it("counts URLs by their length", () => {
    expect(countChars("https://example.com/a")).toBe(21);
  });
});

describe("x rule", () => {
  it("counts ASCII and Turkish letters as 1", () => {
    expect(countChars("hello", "x")).toBe(5);
    expect(countChars("çğıöşü", "x")).toBe(6);
  });
  it("counts emoji as 2, including sequences and flags", () => {
    expect(countChars("😀", "x")).toBe(2);
    expect(countChars("hi 😀", "x")).toBe(5);
    expect(countChars("👨‍👩‍👧", "x")).toBe(2);
    expect(countChars("🇹🇷", "x")).toBe(2);
  });
  it("counts CJK as 2", () => {
    expect(countChars("日本語", "x")).toBe(6);
    expect(countChars("ひらがなカタカナ", "x")).toBe(16);
    expect(countChars("한국어", "x")).toBe(6);
  });
  it("counts every URL as 23 regardless of length", () => {
    expect(countChars("https://example.com", "x")).toBe(23);
    expect(countChars(`http://example.com/${"a".repeat(200)}`, "x")).toBe(23);
    expect(countChars("see https://a.co and https://b.co/x ok", "x")).toBe(4 + 23 + 5 + 23 + 3);
  });
  it("leaves trailing sentence punctuation outside the URL", () => {
    expect(countChars("read https://example.com.", "x")).toBe(5 + 23 + 1);
    expect(countChars("(https://example.com)", "x")).toBe(1 + 23 + 1);
  });
});

describe("normalizeCountRule", () => {
  it("falls back to plain for unknown or missing rules", () => {
    expect(normalizeCountRule(undefined)).toBe("plain");
    expect(normalizeCountRule("tiktok")).toBe("plain");
    expect(normalizeCountRule("x")).toBe("x");
    expect(countChars("😀", "mystery")).toBe(1);
  });
});
