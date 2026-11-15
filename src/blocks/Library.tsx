import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { vaultList, vaultReadText } from "../learning";

// Listening already lists its own past lessons; the other English screens get this shared list.
const FOLDERS: Record<string, string> = { english: "English" };
const SKILLS = ["reading", "writing", "grammar"];
const SUPER = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;

// Past materials are plain dated files the agent wrote; the app lists them and reads them back.
export function readingText(markdown: string): string {
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, "");
  const section = body.match(/##\s+Текст[^\n]*\n([\s\S]*?)(?=\n##\s|$)/)?.[1] ?? "";
  return section.split("\n").filter(line => !/^\s*\*\*[^*]+\*\*\s*$/.test(line)).join("\n").replace(SUPER, "").replace(/\s+\n/g, "\n").trim();
}
export function titleOf(name: string): string {
  return name.replace(/\.md$/, "").replace(/^(\d{4})-(\d{2})-(\d{2})-?/, "$3.$2.$1 · ").replace(/-/g, " ").trim();
}

export function Library({ subject, skill, onReading }: { subject: string; skill: string; onReading?: (text: string) => void }) {
  const folder = FOLDERS[subject];
  const dir = folder && SKILLS.includes(skill) ? `Learning/${folder}/${skill}` : "";
  const [files, setFiles] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!dir) return;
    let active = true;
    vaultList(dir).then(entries => {
      if (active) setFiles(entries.filter(e => !e.is_dir && /^\d{4}-\d{2}-\d{2}.*\.md$/.test(e.name)).map(e => e.name).sort().reverse());
    }).catch(() => { if (active) setFiles([]); });
    return () => { active = false; };
  }, [dir]);
  if (!dir || files.length === 0) return null;
  async function choose(name: string) {
    setError(""); setCurrent(name);
    try {
      const text = await vaultReadText(`${dir}/${name}`);
      if (skill === "reading" && onReading) { const extracted = readingText(text); if (extracted) { onReading(extracted); setMarkdown(""); return; } }
      setMarkdown(text.replace(/^---\n[\s\S]*?\n---\n/, ""));
    } catch (reason) { setError(`Не удалось открыть: ${String(reason)}`); }
  }
  return <section className="library" aria-label="Прошлые материалы">
    <button className="btn-sm" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "▾" : "▸"} Прошлые материалы · {files.length}</button>
    {open && <ul className="library-list">{files.map(name => <li key={name}>
      <button className={name === current ? "library-item library-current" : "library-item"} onClick={() => void choose(name)}>{titleOf(name)}</button>
    </li>)}</ul>}
    {error && <p role="alert">{error}</p>}
    {markdown && <article className="library-note"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{markdown}</ReactMarkdown></article>}
  </section>;
}
