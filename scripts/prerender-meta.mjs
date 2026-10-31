// Post-build step: writes dist/<route>.html for every public marketing page, with that
// page's own title, description, canonical and social tags plus a <noscript> summary and links.
// The SPA still boots from the same shell (nginx serves <route>.html via try_files), but
// crawlers that don't run JavaScript (Bing, AI bots, link previews) now see per-page metadata
// instead of the homepage defaults. Keep the table in sync with each page's <Seo> and with
// public/sitemap-pages.xml. Blog posts are fetched from the live API at build time (a post
// published after the build still works — it just gets the shell's default tags until the
// next deploy); the sitemap lists them live via /sitemap-blog.xml.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PAGES } from "./seo-pages.mjs";
import { existsSync } from "node:fs";

const SITE = "https://meettomanage.cloud";
const dist = path.resolve(import.meta.dirname, "../dist");


const NAV = [
  ["/free-games", "Free alphabet and phonics games"],
  ["/resources", "Free coaching centre templates"],
  ["/", "Home"], ["/pricing", "Pricing"], ["/demo", "Book a free demo"], ["/get-started", "Request a platform demo"],
  ["/store", "Course catalogue"], ["/blog", "Blog"], ["/customers", "Customers"], ["/solutions/live-class-software-for-institutes", "Live class software"], ["/solutions/online-attendance-software-for-institutes", "Attendance software"], ["/docs", "Documentation"], ["/careers", "Careers"],
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const BLOG_TITLE_SUFFIX = " | Meet to Manage";
const blogSeoTitle = (title) => {
  const available = 60 - BLOG_TITLE_SUFFIX.length;
  if (title.length <= available) return `${title}${BLOG_TITLE_SUFFIX}`;
  const shortened = title.slice(0, available - 1).replace(/\s+\S*$/, "").replace(/[\s:;,.-]+$/, "");
  return `${shortened || title.slice(0, available - 1)}…${BLOG_TITLE_SUFFIX}`;
};

/** Page title without the " — Meet to Manage…" or " | Meet to Manage" suffix, for the visible heading. */
const heading = (title) => title.replace(/\s+[—|]\s+Meet to Manage.*$/, "");

/** Same markdown-lite as BlogPost.tsx: "## " headings, "- "/"• " lists, **bold**, blank-line paragraphs. */
function markdownToHtml(content) {
  const inline = (text) => esc(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/meettomanage\.cloud\/get-started/g, '<a href="/get-started">meettomanage.cloud/get-started</a>');
  const out = [];
  let list = null;
  for (const raw of content.split(/\n{2,}/)) {
    const block = raw.trim();
    if (!block) continue;
    const lines = block.split("\n").map((l) => l.trim());
    if (lines.every((l) => /^[•-]\s+/.test(l))) {
      list ??= [];
      list.push(...lines.map((l) => `<li>${inline(l.replace(/^[•-]\s+/, ""))}</li>`));
      continue;
    }
    if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; }
    if (block.startsWith("## ")) out.push(`<h2>${inline(block.slice(3).trim())}</h2>`);
    else out.push(`<p>${inline(lines.join(" "))}</p>`);
  }
  if (list) out.push(`<ul>${list.join("")}</ul>`);
  return out.join("\n");
}

function render(shell, page) {
  const url = SITE + page.path;
  const title = esc(page.title);
  const desc = esc(page.description);
  const image = page.image ? SITE + page.image : null;
  let html = shell;
  // Function replacers: "$" in page text must not be read as a capture-group reference.
  const swap = (re, replacement) => {
    if (!re.test(html)) throw new Error(`prerender-meta: pattern ${re} not found in dist/index.html`);
    html = html.replace(re, (_m, a = "", b = "") => (typeof replacement === "function" ? replacement(a, b) : replacement));
  };
  swap(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  swap(/(<meta\s+name="description"\s+content=")[^"]*(")/, (a, b) => `${a}${desc}${b}`);
  swap(/(<link rel="canonical" href=")[^"]*(")/, (a, b) => `${a}${url}${b}`);
  swap(/(<meta property="og:title" content=")[^"]*(")/, (a, b) => `${a}${title}${b}`);
  swap(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, (a, b) => `${a}${desc}${b}`);
  swap(/(<meta property="og:url" content=")[^"]*(")/, (a, b) => `${a}${url}${b}`);
  swap(/(<meta property="og:type" content=")[^"]*(")/, (a, b) => `${a}${page.type ?? "website"}${b}`);
  swap(/(<meta name="twitter:title" content=")[^"]*(")/, (a, b) => `${a}${title}${b}`);
  swap(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, (a, b) => `${a}${desc}${b}`);
  if (image) {
    // The cover's own size isn't the default 1200x630, so drop the default dimensions.
    swap(/(<meta property="og:image" content=")[^"]*(")/, (a, b) => `${a}${image}${b}`);
    swap(/(<meta name="twitter:image" content=")[^"]*(")/, (a, b) => `${a}${image}${b}`);
    html = html.replace(/\s*<meta property="og:image:(?:width|height)" content="\d+" \/>/g, "");
  }
  if (page.publishedAt) {
    // Article structured data: eligible for article rich results and read by AI search crawlers.
    const ld = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: heading(page.title).slice(0, 110),
      description: page.description,
      datePublished: page.publishedAt,
      dateModified: page.publishedAt,
      mainEntityOfPage: url,
      url,
      ...(image ? { image } : {}),
      author: { "@type": "Organization", name: "Meet to Manage", url: `${SITE}/` },
      publisher: { "@type": "Organization", name: "Meet to Manage", logo: { "@type": "ImageObject", url: `${SITE}/logo-icon.png` } },
    };
    swap(/<\/head>/, `<meta property="article:published_time" content="${esc(page.publishedAt)}" />\n    <script type="application/ld+json" data-prerender>${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>\n  </head>`);
  }
  // The boot screen (visible until React mounts, and all a non-JS crawler sees) carries the
  // home hero by default; give each page its own heading, summary and, for posts, the article.
  const body = page.contentHtml
    ? `<main class="article"><h1>${esc(heading(page.title))}</h1><p class="lead">${desc}</p>${page.contentHtml}<p><a class="cta" href="/get-started">Book Demo</a></p></main>`
    : `<main><h1>${esc(heading(page.title))}</h1><p>${desc}</p><a class="cta" href="/get-started">Book Demo</a></main>`;
  swap(/(<div id="boot">[\s\S]*?)<main>[\s\S]*?<\/main>/, (a) => `${a}${body}`);
  const links = NAV.map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join("");
  swap(/<body([^>]*)>/, (a) => `<body${a}><noscript><nav><ul>${links}</ul></nav></noscript>`);
  return html;
}

const API = (process.env.PRERENDER_API_URL ?? "https://api.meettomanage.cloud").replace(/\/$/, "");

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** Every published post with its full text, from the API. A build must never fail because the API is down. */
async function blogPages() {
  try {
    const posts = (await getJson(`${API}/api/blog`)).filter((p) => typeof p.slug === "string" && /^[a-z0-9-]+$/.test(p.slug));
    const pages = [];
    for (const p of posts) {
      let contentHtml = "";
      try {
        contentHtml = markdownToHtml((await getJson(`${API}/api/blog/${p.slug}`)).content ?? "");
      } catch (err) {
        console.warn(`prerender-meta: no body for ${p.slug} (${err.message})`);
      }
      const cover = `/blog/${p.slug}.webp`;
      pages.push({
        path: `/blog/${p.slug}`,
        type: "article",
        title: blogSeoTitle(p.title),
        description: p.excerpt ?? "",
        publishedAt: p.publishedAtUtc,
        image: existsSync(path.join(dist, cover)) ? cover : undefined,
        contentHtml,
      });
    }
    return pages;
  } catch (err) {
    console.warn(`prerender-meta: skipped blog posts (${err.message})`);
    return [];
  }
}

// Live posts replace the hand-written fallback entries for the same path.
for (const post of await blogPages()) {
  const i = PAGES.findIndex((p) => p.path === post.path);
  if (i >= 0) PAGES[i] = post;
  else PAGES.push(post);
}

// Marketing console → SEO overrides, so crawlers that don't run JavaScript see the same
// titles/descriptions as the live pages. The home page's live in the shell (dist/index.html).
const SEO_KEYS = { "/": "home", "/pricing": "pricing", "/get-started": "getStarted", "/demo": "demo", "/store": "store", "/blog": "blog" };
let seo = {};
try {
  seo = Object.fromEntries((await getJson(`${API}/api/settings/public`)).filter((s) => s.key?.startsWith("seo.") && s.value?.trim()).map((s) => [s.key, s.value.trim()]));
} catch (err) {
  console.warn(`prerender-meta: no SEO overrides (${err.message})`);
}
for (const page of PAGES) {
  const key = SEO_KEYS[page.path];
  if (!key) continue;
  page.title = seo[`seo.${key}.title`] ?? page.title;
  page.description = seo[`seo.${key}.description`] ?? page.description;
}

let shell = await readFile(path.join(dist, "index.html"), "utf8");
if (seo["seo.home.title"] || seo["seo.home.description"]) {
  const t = esc(seo["seo.home.title"] ?? "");
  const d = esc(seo["seo.home.description"] ?? "");
  const set = (re, v) => { if (v) shell = shell.replace(re, (_m, a, b) => `${a}${v}${b}`); };
  set(/(<title>)[\s\S]*?(<\/title>)/, t);
  set(/(<meta property="og:title" content=")[^"]*(")/, t);
  set(/(<meta name="twitter:title" content=")[^"]*(")/, t);
  set(/(<meta\s+name="description"\s+content=")[^"]*(")/, d);
  await writeFile(path.join(dist, "index.html"), shell);
}
for (const page of PAGES) {
  const file = path.join(dist, `${page.path}.html`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, render(shell, page));
}
console.log(`prerender-meta: wrote ${PAGES.length} pages (${PAGES.filter((p) => p.contentHtml).length} with full article text)`);
