import { TextViewer } from "./TextViewer";

export const screens = [{ id: "english/reading", subject: "english", skill: "reading", component: TextViewer }] as const;
export type ScreenId = typeof screens[number]["id"];
export function screenFromHash(hash: string): ScreenId {
  const id = hash.replace(/^#\/?/, "");
  return screens.find(screen => screen.id === id)?.id ?? "english/reading";
}
