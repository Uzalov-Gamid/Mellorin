import { Notes } from "./screens/notes/Notes";
import { FormatScreen } from "./blocks/FormatScreen";
export const screens = [
  ...["devops", "arabic", "c"].map(subject => ({ id: `${subject}/notes`, subject, skill: "notes", component: Notes })),
{ id: "english/notes", subject: "english", skill: "notes", component: Notes }, { id: "english/listening", subject: "english", skill: "listening", component: FormatScreen }, { id: "english/reading", subject: "english", skill: "reading", component: FormatScreen }, { id: "english/words", subject: "english", skill: "words", component: FormatScreen }];
export type ScreenId = string;
export function screenFromHash(hash: string): ScreenId {
  const id = hash.replace(/^#\/?/, "");
  if (!id) return "home";
  return id === "home" || /^[\p{L}\p{N}_-]+\/[\p{L}\p{N}_-]+$/u.test(id) ? id : "english/reading";
}

export function ScreenPanels({ active }: { active: string }) {
  return <>{screens.map(({ id, component: Component, subject, skill }) => <div className="tab-panel" key={id} hidden={id !== active}><Component subject={subject} skill={skill} /></div>)}</>;
}
