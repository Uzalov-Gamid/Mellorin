#!/usr/bin/env node
// Checks that relative Markdown links, images and in-page anchors in the docs resolve.
// Usage: node scripts/check-links.mjs [files...]   (default: README.md, README.ru.md, SECURITY.md, CHANGELOG.md, docs/*.md)
import { readFile, readdir, access } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';

const root = process.cwd();
const defaults = ['README.md', 'README.ru.md', 'SECURITY.md', 'CHANGELOG.md', 'CONTRIBUTING.md',
  ...(await readdir('docs')).filter(n => n.endsWith('.md')).map(n => join('docs', n)), 'scripts/README.md'];
const files = process.argv.slice(2).length ? process.argv.slice(2) : defaults;

const slug = (heading) => heading.trim().toLowerCase()
  .replace(/<[^>]+>/g, '').replace(/[`*_~]/g, '')
  .replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');

async function anchorsOf(path) {
  const text = await readFile(path, 'utf8');
  const set = new Set();
  let fence = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) { fence = !fence; continue; }
    if (fence) continue;
    const m = line.match(/^#{1,6}\s+(.*)$/);
    if (m) set.add(slug(m[1]));
  }
  return set;
}

let bad = 0;
const cache = new Map();
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const body = text.replace(/```[\s\S]*?```/g, '');
  const links = [...body.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map(m => m[1])
    .concat([...body.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1]));
  for (const link of links) {
    if (/^(https?:|mailto:)/.test(link)) continue;
    const [pathPart, hash] = link.split('#');
    const target = pathPart ? resolve(dirname(file), decodeURIComponent(pathPart)) : resolve(file);
    try { await access(target); } catch { console.log(`${file}: missing file ${link}`); bad++; continue; }
    if (hash && target.endsWith('.md')) {
      if (!cache.has(target)) cache.set(target, await anchorsOf(target));
      if (!cache.get(target).has(decodeURIComponent(hash).toLowerCase())) { console.log(`${file}: missing anchor ${link}`); bad++; }
    }
  }
}
console.log(bad ? `${bad} broken link(s)` : `all links ok (${files.length} files)`);
process.exit(bad ? 1 : 0);
