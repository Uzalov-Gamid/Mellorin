import { describe, expect, it } from "vitest";
import { readingText, titleOf } from "./Library";

describe("library", () => {
  it("extracts the reading text without numbers or the title line", () => {
    const note = "---\nskill: reading\n---\n# Чтение\n\n## Текст (подготовил JERY)\n\n**The Title**\n\nOne sentence.¹ Two sentence.²\n\n## Вопросы\n\n1. Why?\n";
    expect(readingText(note)).toBe("One sentence. Two sentence.");
  });
  it("makes a readable title from a dated file name", () => {
    expect(titleOf("2026-11-15-the-two-minute-start.md")).toBe("15.11.2026 · the two minute start");
  });
});
