import { describe, expect, it } from "vitest";
import { trailState } from "./trail";
import { resolveSubjects } from "../subjects";
describe("subject trails", () => {
  it("keeps missing progress unknown rather than inferring passed steps", () => {
    expect(trailState(["a", "b", "c"], "b")).toEqual({ activeIndex: 1, passedIndex: -1, linePercent: 0, nodes: ["future", "current", "future"] });
  });
  it("computes the passed line and handles empty or single trails", () => {
    expect(trailState(["a", "b", "c"], "c", ["a", "b"]).linePercent).toBe(50);
    expect(trailState([], "a").activeIndex).toBe(-1);
    expect(trailState(["a"], "a", ["a"]).linePercent).toBe(0);
  });
  it("uses stable labels and discovers additional folders", () => {
    const subjects = resolveSubjects([{ name: "English", skills: ["vocabulary", "extra"] }, { name: "Physics", skills: [] }]);
    expect(subjects[0].skills.filter(skill => skill.id === "words")).toHaveLength(1);
    expect(subjects[0].skills[subjects[0].skills.length - 1]?.id).toBe("extra");
    expect(subjects[1].skills[0].id).toBe("start");
  });
});
