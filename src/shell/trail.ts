export type TrailStatus = "passed" | "current" | "future";
export function trailState(ids: string[], active: string, passed: string[] = []) {
  const activeIndex = ids.indexOf(active);
  const passedIndex = ids.reduce((last, id, index) => passed.includes(id) ? index : last, -1);
  return {
    activeIndex, passedIndex,
    linePercent: ids.length > 1 && passedIndex >= 0 ? passedIndex / (ids.length - 1) * 100 : 0,
    nodes: ids.map(id => id === active ? "current" : passed.includes(id) ? "passed" : "future") as TrailStatus[],
  };
}
