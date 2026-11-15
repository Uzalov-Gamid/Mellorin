// Explicit opt-in: never runs in CI; no paths, properties or note text in output.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { analyze, frontmatter, obsidian } from "../../src/screens/notes/model";
const root = process.env.MELLORIN_NOTES_READ_ONLY_COPY;
if (!root) throw Error("Explicit read-only copy path required");
let files = 0, bytes = 0, notes = 0;
async function walk(dir: string, depth = 0) {
  if (depth > 32) throw Error("Depth limit");
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (++files > 10_000) throw Error("File limit");
    const name = entry.name.toLowerCase();
    if (name.startsWith(".") || ["claude.md", "jery", "templates", "formats", "_archive"].includes(name) || entry.isSymbolicLink()) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, depth + 1);
    else if (entry.isFile() && name.endsWith(".md")) {
      const data = await readFile(path); bytes += data.length;
      if (data.length > 2 * 1024 * 1024 || bytes > 16 * 1024 * 1024 || ++notes > 1000) throw Error("Read limit");
      const markdown = new TextDecoder("utf-8", { fatal: true }).decode(data);
      const parsed = frontmatter(markdown);
      if (parsed.error) throw Error("Frontmatter validation failed");
      analyze(markdown);
      renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm, obsidian]} skipHtml>{parsed.body}</ReactMarkdown>);
    }
  }
}
try { await walk(root); if (!notes) throw Error(); console.log("Read-only Markdown copy validation passed"); }
catch { console.error("Read-only Markdown copy validation failed (private details suppressed)"); process.exitCode = 1; }
