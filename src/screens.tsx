import { TextViewer } from "./TextViewer";
export const screens = [{ id: "english/reading", subject: "english", skill: "reading", component: TextViewer }];
export type ScreenId = string;
export function screenFromHash(hash: string): ScreenId {
  const id = hash.replace(/^#\/?/, "");
  if (!id) return "home";
  return id === "home" || /^[\p{L}\p{N}_-]+\/[\p{L}\p{N}_-]+$/u.test(id) ? id : "english/reading";
}

export function ScreenPanels({ active }: { active: string }) {
  return <>{screens.map(({ id, component: Component }) => <div className="tab-panel" key={id} hidden={id !== active}><Component /></div>)}</>;
}
