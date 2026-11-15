import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import { parseDocument } from "yaml";
import type { Root, Text, Link, Image, Heading, Blockquote, Definition, LinkReference } from "mdast";

export interface Note { path: string; markdown: string }
export interface Catalog { notes: Note[]; files: string[] }
export interface OutlineItem { id: string; title: string; depth: number }
const textOf = (node: unknown): string => {
  const n = node as { value?: string; children?: unknown[] };
  return n.value || n.children?.map(textOf).join("") || "";
};
export const slug = (text: string) => text.toLowerCase().trim().replace(/[^\p{L}\p{N}_\s-]/gu, "").replace(/\s+/g, "-");

export function frontmatter(markdown: string) {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  if (!match) return { body: markdown, properties: [] as [string, string][], error: "" };
  try {
    const doc = parseDocument(match[1], { schema: "core", uniqueKeys: true });
    if (doc.errors.length) throw Error();
    const value: unknown = doc.toJS({ maxAliasCount: 0 });
    if (!value || typeof value !== "object" || Array.isArray(value)) throw Error();
    const entries = Object.entries(value);
    if (entries.length > 100) throw Error();
    return { body: markdown.slice(match[0].length), properties: entries.map(([key, val]) => [key, typeof val === "string" ? val : JSON.stringify(val)] as [string, string]), error: "" };
  } catch { return { body: markdown.slice(match[0].length), properties: [], error: "Не удалось прочитать свойства YAML" }; }
}

// Transform only Markdown text nodes: code, raw HTML and URLs never become executable markup.
export function obsidian() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined || parent.type === "link" || parent.type === "linkReference") return;
      const re = /(!?)\[\[([^\]\n]+)\]\]|(^|\s)(#[\p{L}\p{N}_/-]+)/gu;
      const nodes: (Text | Link | Image)[] = []; let end = 0;
      for (const match of node.value.matchAll(re)) {
        const offset = match.index!;
        if (offset > end) nodes.push({ type: "text", value: node.value.slice(end, offset) });
        if (match[2]) {
          const [target, alias] = match[2].split("|");
          if (match[1]) nodes.push({ type: "image", url: `vault:${encodeURIComponent(target)}`, alt: alias || target });
          else nodes.push({ type: "link", url: `wiki:${encodeURIComponent(target)}`, children: [{ type: "text", value: alias || target }] });
        } else {
          if (match[3]) nodes.push({ type: "text", value: match[3] });
          nodes.push({ type: "link", url: `tag:${encodeURIComponent(match[4])}`, children: [{ type: "text", value: match[4] }] });
        }
        end = offset + match[0].length;
      }
      if (nodes.length) {
        if (end < node.value.length) nodes.push({ type: "text", value: node.value.slice(end) });
        parent.children.splice(index, 1, ...nodes as typeof parent.children);
        return index + nodes.length;
      }
    });
    let images = 0;
    visit(tree, ["image", "imageReference"], (_node, index, parent) => {
      if (++images > 16 && parent && index !== undefined) parent.children[index] = { type: "text", value: "[Лимит вложений на заметку: 16]" };
    });
    const ids = new Map<string, number>();
    visit(tree, "heading", (node: Heading) => {
      const base = slug(textOf(node)); const count = ids.get(base) || 0; ids.set(base, count + 1);
      node.data = { ...node.data, hProperties: { id: count ? `${base}-${count}` : base } };
    });
    visit(tree, "blockquote", (node: Blockquote) => {
      const first = node.children[0];
      if (first?.type !== "paragraph" || first.children[0]?.type !== "text") return;
      const text = first.children[0]; const match = /^\[!([\w-]+)\]([+-])?[ \t]*([^\n]*)(?:\n|$)/.exec(text.value);
      if (!match) return;
      const labels: Record<string, string> = { note: "ЗАМЕТКА", tip: "СОВЕТ", warning: "ЛОВУШКА", danger: "ВАЖНО", info: "ИНФОРМАЦИЯ", quote: "ЦИТАТА" };
      const kind = ["warning", "danger", "tip", "note", "info", "quote"].includes(match[1].toLowerCase()) ? match[1].toLowerCase() : "note";
      text.value = text.value.slice(match[0].length);
      node.children.unshift({ type: "paragraph", data: { hProperties: { className: ["notes-callout-title"] } }, children: [{ type: "text", value: match[3] || labels[kind] }] });
      node.data = { hProperties: { className: ["notes-callout", `notes-callout-${kind}`] } };
    });
  };
}

export function analyze(markdown: string) {
  const { body } = frontmatter(markdown);
  const processor = unified().use(remarkParse).use(remarkGfm).use(obsidian);
  const tree = processor.runSync(processor.parse(body)) as Root;
  const outline: OutlineItem[] = []; const links: string[] = [];
  const definitions = new Map<string, string>();
  visit(tree, "definition", (node: Definition) => { if (!definitions.has(node.identifier.toLowerCase())) definitions.set(node.identifier.toLowerCase(), node.url); });
  visit(tree, "linkReference", (node: LinkReference) => { const url = definitions.get(node.identifier.toLowerCase()); if (url) links.push(url); });
  visit(tree, "heading", (node: Heading) => { outline.push({ title: textOf(node), depth: node.depth, id: String(node.data?.hProperties?.id || "") }); });
  visit(tree, "link", (node: Link) => { if (!node.url.startsWith("tag:")) links.push(node.url); });
  return { outline, links };
}

const indexes = new WeakMap<string[], { paths: Set<string>; names: Map<string, string[]> }>();
function fileIndex(files: string[]) {
  let index = indexes.get(files);
  if (!index) {
    if (files.length > 10_000) throw Error("Превышен лимит поиска файлов");
    index = { paths: new Set(files), names: new Map() };
    for (const file of files) {
      const name = file.split("/").pop() || "";
      const group = index.names.get(name) || []; group.push(file); index.names.set(name, group);
    }
    indexes.set(files, index);
  }
  return index;
}

export function resolveLink(from: string, raw: string, files: string[]): { path: string; fragment: string } {
  let target: string;
  try { target = decodeURIComponent(raw.replace(/^(wiki|vault):/, "")); } catch { throw Error("Некорректная ссылка"); }
  if (target.length > 2048 || /^(?:[a-z][\w+.-]*:|\/|\\)/i.test(target)) throw Error("Ссылка вне хранилища");
  const [name, fragment = ""] = target.split("#");
  if (!name) return { path: from, fragment };
  if (name.includes("\\")) throw Error("Недопустимый путь");
  const normalize = (path: string) => {
    const parts: string[] = [];
    for (const part of path.split("/")) {
      if (part === "..") { if (!parts.length) throw Error("Ссылка вне хранилища"); parts.pop(); }
      else if (part && part !== ".") parts.push(part);
    }
    return parts.join("/");
  };
  const index = fileIndex(files);
  const dir = from.split("/").slice(0, -1).join("/");
  const variants = (path: string) => [path, `${path}.md`];
  const local = variants(normalize(`${dir}/${name}`)); const absolute = name.startsWith("../") || name.startsWith("./") ? [] : variants(normalize(name));
  for (const paths of [local, absolute]) {
    const found = paths.find(file => index.paths.has(file));
    if (found) return { path: found, fragment };
  }
  const names = variants(name);
  const matches = names.flatMap(candidate => (index.names.get(candidate.split("/").pop() || "") || []).filter(file => file === candidate || file.endsWith(`/${candidate}`)));
  if (matches.length !== 1) throw Error(matches.length ? "Ссылка неоднозначна: уточни путь" : "Файл не найден в хранилище");
  return { path: matches[0], fragment };
}
