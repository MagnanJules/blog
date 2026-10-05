import { readdir, readFile, mkdir, writeFile, rm, cp } from "node:fs/promises";
import { join, basename } from "node:path";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

const root = new URL("..", import.meta.url).pathname;
const postsDir = join(root, "content/posts");
const templatesDir = join(root, "site/templates");
const staticDir = join(root, "site/static");
const outDir = join(root, "dist");

const md = MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(code, lang) {
    const language = lang && hljs.getLanguage(lang) ? lang : null;
    const { value } = language
      ? hljs.highlight(code, { language })
      : hljs.highlightAuto(code);
    return `<pre><code class="hljs language-${language ?? "plaintext"}">${value}</code></pre>`;
  },
});

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function parse(source, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) throw new Error(`${file}: front-matter manquant`);
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const sep = line.indexOf(":");
    if (sep === -1)
      throw new Error(`${file}: ligne front-matter invalid: ${line}`);
    meta[line.slice(0, sep).trim()] = line
      .slice(sep + 1)
      .trim()
      .replace(/^["'](.*)["']$/, "$1");
  }
  for (const key of ["title", "date"]) {
    if (!meta[key]) throw new Error(`${file}: '${key}' is mandatory`);
  }
  if (Number.isNaN(Date.parse(meta.date))) {
    throw new Error(`${file}: invalid date '${meta.date}', YYYY-MM-DD`);
  }
  return {
    title: meta.title,
    date: meta.date,
    slug: meta.slug ?? basename(file, ".md"),
    body: source.slice(match[0].length),
  };
}

const render = (template, values) =>
  Object.entries(values).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template,
  );

const files = (await readdir(postsDir)).filter((f) => f.endsWith(".md"));
const posts = await Promise.all(
  files.map(async (f) => parse(await readFile(join(postsDir, f), "utf8"), f)),
);
posts.sort((a, b) => b.date.localeCompare(a.date));

const duplicate = posts.find(
  (p, i) => posts.findIndex((q) => q.slug === p.slug) !== i,
);
if (duplicate) throw new Error(`slug en double: ${duplicate.slug}`);

const pageTemplate = await readFile(join(templatesDir, "page.html"), "utf8");
const indexTemplate = await readFile(join(templatesDir, "index.html"), "utf8");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(staticDir, outDir, { recursive: true });

for (const post of posts) {
  await mkdir(join(outDir, post.slug), { recursive: true });
  await writeFile(
    join(outDir, post.slug, "index.html"),
    render(pageTemplate, {
      title: escapeHtml(post.title),
      date: post.date,
      content: md.render(post.body),
    }),
  );
}

const list = posts
  .map(
    (p) =>
      `      <li><time datetime="${p.date}">${p.date}</time>` +
      ` <a href="/${p.slug}/">${escapeHtml(p.title)}</a></li>`,
  )
  .join("\n");

await writeFile(
  join(outDir, "index.html"),
  render(indexTemplate, { posts: list }),
);
console.log(`${posts.length} dist/`);
