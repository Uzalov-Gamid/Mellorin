import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { analyze, frontmatter, obsidian, resolveLink } from "./model";

describe("safe Obsidian notes", () => {
  it("parses properties without executing YAML or expanding aliases", () => {
    expect(frontmatter('---\nsubject: english\nreviewed: 2\ntags: [one, two]\n---\n# Theory').properties).toEqual([["subject", "english"], ["reviewed", "2"], ["tags", '["one","two"]']]);
    expect(frontmatter('---\na: &a [x]\nb: *a\n---\nbody').error).toBeTruthy();
    expect(frontmatter('---\na: 1\na: 2\n---\nbody').error).toBeTruthy();
  });
  it("keeps tables, tasks, quotes, callouts, Unicode markers and literal code", () => {
    const md = '# Тема\n\n## Правило\n\n|A|B|\n|-|-|\n|1|2|\n\n> [!warning] Ловушка\n> Careful\n\n> Ordinary quote\n\n- [x] Done\n- [ ] Pending\n\n¹ ² ³ #english [[errors|Ошибки]]\n\n```js\n[[not-a-link]]\n```\n\n![safe](safe.png)';
    const result = analyze(md);
    expect(result.outline.map(h => h.title)).toEqual(["Тема", "Правило"]);
    expect(result.links).toEqual(["wiki:errors"]);
    const html = renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm, obsidian]} skipHtml urlTransform={value => value}>{md}</ReactMarkdown>);
    expect(html).toContain('<table>'); expect(html).toContain('notes-callout-warning'); expect(html).toContain('Ordinary quote');
    expect(html).toContain('disabled=""'); expect(html).toContain('¹ ² ³'); expect(html).toContain('[[not-a-link]]'); expect(html).toContain('href="tag:');
  });
  it("preserves callout body when the marker has no custom title", () => {
    const html = renderToStaticMarkup(<ReactMarkdown remarkPlugins={[obsidian]}>{"> [!note]\n> Body remains content"}</ReactMarkdown>);
    expect(html).toContain("ЗАМЕТКА"); expect(html).toContain("Body remains content");
  });
  it("drops raw HTML and gives duplicate headings stable distinct IDs", () => {
    const html = renderToStaticMarkup(<ReactMarkdown remarkPlugins={[obsidian]} skipHtml>{'# Same\n\n# Same\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>'}</ReactMarkdown>);
    expect(html).not.toContain('<script'); expect(html).not.toContain('<img');
    expect(analyze('# Same\n# Same').outline.map(h => h.id)).toEqual(['same', 'same-1']);
  });
  it("resolves local, root and unique wikilinks and refuses ambiguous or external paths", () => {
    const files = ['Learning/English/notes/a.md', 'Learning/English/notes/errors.md', 'Learning/English/plan.md', 'Learning/C/topic.md', 'Learning/DevOps/topic.md', 'assets/figure.png'];
    const from = files[0];
    expect(resolveLink(from, 'wiki:errors%23Details', files)).toEqual({path: files[1], fragment: 'Details'});
    expect(resolveLink(from, '../plan', files).path).toBe(files[2]);
    expect(resolveLink(from, 'vault:assets%2Ffigure.png', files).path).toBe('assets/figure.png');
    expect(resolveLink(from, '#Rule', files).path).toBe(from);
    for (const target of ['topic', 'missing', '../../../../outside', 'https://example.org/a', 'javascript:alert(1)', '%2Fetc%2Fpasswd', 'file:///tmp/a', '%ZZ']) expect(() => resolveLink(from, target, files)).toThrow();
  });
  it("derives backlinks from links, excluding code and image references", () => {
    expect(analyze('`[[no]]`\n\n![[figure.png]]\n\n[[a]] and [b](../b.md)').links).toEqual(['wiki:a', '../b.md']);
    expect(analyze('[source][ref]\n\n[ref]: errors.md').links).toEqual(['errors.md']);
  });
  it("limits automatic local media reads per note", () => {
    const html = renderToStaticMarkup(<ReactMarkdown remarkPlugins={[obsidian]} urlTransform={value => value}>{Array.from({ length: 20 }, (_, i) => `![figure](figure-${i}.png)`).join("\n\n")}</ReactMarkdown>);
    expect((html.match(/<img /g) || []).length).toBe(16);
    expect(html).toContain("Лимит вложений на заметку: 16");
  });

});
