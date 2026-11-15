import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { analyze, frontmatter, obsidian, resolveLink, slug, type Catalog } from "./model";
import { loadAttachment, loadNotes } from "./bridge";
import "./notes.css";

function Attachment({ path, label }: { path: string; label: string }) {
  const [value, setValue] = useState<{ url: string; mime: string }>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true; let url = "";
    setValue(undefined); setError("");
    void loadAttachment(path).then(data => {
      if (!active) return;
      // Keep the browser allowlist too: only this command's checked bytes become resources.
      if (!["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "audio/wav", "audio/ogg", "audio/mpeg"].includes(data.mime) || data.bytes.length > 8 * 1024 * 1024) throw Error("Неподдерживаемое вложение");
      url = URL.createObjectURL(new Blob([new Uint8Array(data.bytes)], { type: data.mime }));
      setValue({ url, mime: data.mime });
    }).catch(() => { if (active) setError("Вложение недоступно: проверь формат, размер и путь"); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [path]);
  if (error) return <span role="alert">{error}</span>;
  if (!value) return <span>Загрузка вложения…</span>;
  if (value.mime.startsWith("image/")) return <img className="notes-image" src={value.url} alt={label} />;
  if (value.mime.startsWith("audio/")) return <audio controls preload="none" src={value.url} aria-label={label} />;
  return <a href={value.url} download={path.split("/").pop()}>{label} ↓ PDF</a>;
}

export function Notes({ subject }: { subject: string; skill?: string }) {
  const [catalog, setCatalog] = useState<Catalog>(); const [path, setPath] = useState("");
  const [allSources, setAllSources] = useState(false);
  const [activated, setActivated] = useState(() => typeof window !== "undefined" && window.location.hash.replace(/^#\/?/, "") === `${subject}/notes`);
  const [query, setQuery] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const [attachment, setAttachment] = useState<{ path: string; label: string }>();
  const [fragment, setFragment] = useState(""); const article = useRef<HTMLElement>(null);
  async function reload(refresh = false) {
    setLoading(true); setError("");
    try { setCatalog(await loadNotes(refresh)); } catch { setError("Не удалось прочитать конспекты. Проверь хранилище и лимиты чтения."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const changed = () => { if (window.location.hash.replace(/^#\/?/, "") === `${subject}/notes`) setActivated(true); };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, [subject]);
  useEffect(() => { if (activated) void reload(); }, [activated]);
  const notes = catalog?.notes || [];
  const subjectSources = notes.filter(note => note.path.toLowerCase().startsWith(`learning/${subject.toLowerCase()}/`));
  const sources = allSources ? notes : subjectSources;
  const selected = notes.find(note => note.path === path) || sources[0];
  const parsed = useMemo(() => selected ? frontmatter(selected.markdown) : undefined, [selected]);
  const metadata = useMemo(() => notes.map(note => ({ ...note, ...analyze(note.markdown) })), [catalog]); // bounded catalog, one parse per refresh
  const outline = metadata.find(note => note.path === selected?.path)?.outline || [];
  const backlinks = useMemo(() => !selected || !catalog ? [] : metadata.filter(note => note.path !== selected.path && note.links.some(link => {
    try { return resolveLink(note.path, link, catalog.files).path === selected.path; } catch { return false; }
  })), [metadata, selected, catalog]);
  useEffect(() => {
    if (!fragment) { if (selected && window.location.hash.replace(/^#\/?/, "") === `${subject}/notes`) article.current?.scrollIntoView({ block: "start" }); return; }
    const id = slug(fragment);
    const element = Array.from(article.current?.querySelectorAll("[id]") || []).find(el => el.id === id || el.id === fragment);
    if (element) element.scrollIntoView({ block: "start" });
    else setError("Заголовок ссылки не найден");
  }, [selected?.path, fragment]);
  function open(raw: string) {
    if (!selected || !catalog) return;
    try {
      const link = resolveLink(selected.path, raw, catalog.files);
      if (!notes.some(note => note.path === link.path)) { setAttachment({ path: link.path, label: link.path.split("/").pop() || "Вложение" }); setError(""); return; }
      setAttachment(undefined);
      setError(""); setPath(link.path); setFragment(link.fragment);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось открыть ссылку"); }
  }
  return <section className="notes-screen" aria-label="Конспекты">
    <article className="notes-paper" ref={article}>
      <div className="notes-breadcrumb">{selected?.path.startsWith("Learning/") ? selected.path.split("/")[1] : subject === "english" ? "English" : subject} › Конспекты{selected ? ` › ${selected.path.split("/").slice(-2, -1)[0] || ""}` : ""}</div>
      {loading && <p role="status">Загрузка конспектов…</p>}
      {error && <p className="notes-error" role="alert">{error}</p>}
      {attachment && <div className="notes-attachment"><Attachment path={attachment.path} label={attachment.label} /><button className="notes-reload" onClick={() => setAttachment(undefined)}>Закрыть вложение</button></div>}
      {parsed?.error && <p role="alert">{parsed.error}</p>}
      {parsed && <>
        <div className="notes-properties">{parsed.properties.map(([key, value]) => <span key={key}>{key}: {value}</span>)}</div>
        <div className="notes-markdown"><ReactMarkdown remarkPlugins={[remarkGfm, obsidian]} skipHtml urlTransform={url => url} components={{
          a: ({ href = "", children }) => {
            if (href.startsWith("tag:")) return <span className="notes-tag">{children}</span>;
            if (/^https?:\/\//i.test(href)) return <a href={href} target="_blank" rel="noreferrer noopener">{children} ↗</a>;
            return <button className="notes-link" onClick={() => open(href)}>{children}</button>;
          },
          img: ({ src = "", alt = "" }) => {
            try { const link = resolveLink(selected!.path, src, catalog!.files); return <Attachment path={link.path} label={alt || link.path.split("/").pop() || "Вложение"} />; }
            catch { return <span role="alert">Вложение не найдено или ссылка вне хранилища</span>; }
          },
          input: ({ checked }) => <input type="checkbox" checked={!!checked} disabled readOnly aria-label={checked ? "Выполнено" : "Не выполнено"} />,
          table: ({ children }) => <div className="notes-table"><table>{children}</table></div>,
        }}>{parsed.body}</ReactMarkdown></div>
      </>}
      {!loading && !selected && <p>Конспектов по этому предмету пока нет.</p>}
    </article>
    <aside className="notes-aside">
      <div><div className="notes-cap">◆ ОГЛАВЛЕНИЕ</div>{outline.length ? outline.map(item => <button key={item.id} className="notes-outline" style={{ paddingLeft: `${2 + Math.min(item.depth - 1, 4) * 12}px` }} onClick={() => { setFragment(item.id); setError(""); }}>{item.title}</button>) : <p>Нет заголовков</p>}</div>
      <div><div className="notes-cap">◆ ОБРАТНЫЕ ССЫЛКИ</div>{backlinks.length ? backlinks.map(note => <button className="notes-link notes-source" key={note.path} onClick={() => { setPath(note.path); setFragment(""); setError(""); }}>{note.path.split("/").pop()}</button>) : <p>Нет обратных ссылок</p>}</div>
      {selected && <div className="notes-file">Файл: {selected.path}<br />Только чтение</div>}
      <div className="notes-sources"><div className="notes-cap">◆ КОНСПЕКТЫ · {sources.length}</div><button className="notes-scope" aria-pressed={allSources} onClick={() => setAllSources(value => !value)}>{allSources ? "Всё хранилище" : "Текущий предмет"} ▾</button><input aria-label="Поиск конспекта" placeholder="Найти конспект…" value={query} onChange={event => setQuery(event.target.value)} />{sources.filter(note => note.path.toLowerCase().includes(query.toLowerCase())).map(note => <button key={note.path} title={note.path} className="notes-source notes-link" aria-current={note.path === selected?.path ? "page" : undefined} onClick={() => { setPath(note.path); setFragment(""); setError(""); }}>{note.path.split("/").pop()}</button>)}<button className="notes-reload" disabled={loading} onClick={() => void reload(true)}>⟳ Перечитать файлы</button></div>
    </aside>
  </section>;
}
