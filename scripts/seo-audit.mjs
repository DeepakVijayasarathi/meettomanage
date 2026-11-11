// Production-HTML SEO regression gate. Run after `npm run build` so this checks what a
// crawler receives, not only the React source.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PAGES } from "./seo-pages.mjs";

const DIST = path.resolve(import.meta.dirname, "../dist");
const SITE = "https://meettomanage.cloud";
const failures = [];

async function htmlFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await htmlFiles(file));
    else if (entry.name.endsWith(".html")) output.push(file);
  }
  return output;
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([:\w-]+)=(?:"([^"]*)"|'([^']*)')/g)].map((match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? ""]));
}

function routeFor(file) {
  const relative = path.relative(DIST, file).replaceAll("\\", "/").replace(/\.html$/, "");
  return relative === "index" ? "/" : `/${relative}`;
}

const files = await htmlFiles(DIST);
const pages = [];
for (const file of files) {
  const html = await readFile(file, "utf8");
  const route = routeFor(file);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attributes(match[0]));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => attributes(match[0]));
  const description = meta.find((item) => item.name === "description")?.content?.trim() ?? "";
  const robots = meta.find((item) => item.name === "robots")?.content?.toLowerCase() ?? "";
  const canonical = links.find((item) => item.rel === "canonical")?.href ?? "";
  const expected = PAGES.find((item) => item.path === route);

  if (!title) failures.push(`${route}: missing title`);
  if (!description) failures.push(`${route}: missing meta description`);
  if (description.length > 165) failures.push(`${route}: meta description is ${description.length} characters`);
  if (canonical !== `${SITE}${route === "/" ? "/" : route}`) failures.push(`${route}: wrong or missing canonical (${canonical || "none"})`);
  if ((html.match(/<h1\b/gi) ?? []).length !== 1 && !robots.includes("noindex")) failures.push(`${route}: indexable page must contain exactly one H1`);
  if (expected?.noindex && !robots.includes("noindex")) failures.push(`${route}: expected noindex`);
  if (expected && !expected.noindex && robots.includes("noindex")) failures.push(`${route}: sitemap page is unexpectedly noindex`);

  for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); } catch { failures.push(`${route}: invalid JSON-LD`); }
  }
  pages.push({ route, title, html });
}

for (const [title, matches] of Map.groupBy(pages.filter((page) => page.title), (page) => page.title)) {
  if (matches.length > 1) failures.push(`duplicate title "${title}" on ${matches.map((page) => page.route).join(", ")}`);
}

const knownRoutes = new Set(pages.map((page) => page.route));
const utilityRoutes = new Set(["/demo-login", "/portal-select", "/register", "/forgot-password", "/reset-pin", "/terms"]);
for (const page of pages) {
  for (const match of page.html.matchAll(/href="(\/[^"]*)"/g)) {
    const target = match[1].replaceAll("&amp;", "&").split(/[?#]/)[0].replace(/\/$/, "") || "/";
    if (/\.[a-z0-9]{2,16}$/i.test(target) || target.startsWith("/assets/") || target.startsWith("/templates/") || target.startsWith("/t/") || target.startsWith("/pay/") || target.startsWith("/verify/")) continue;
    if (!knownRoutes.has(target) && !utilityRoutes.has(target)) failures.push(`${page.route}: broken internal link to ${target}`);
  }
}

if (failures.length) {
  console.error(`seo-audit: ${failures.length} problem(s)\n- ${[...new Set(failures)].join("\n- ")}`);
  process.exit(1);
}
const blogCount = pages.filter((page) => page.route.startsWith("/blog/")).length;
if (blogCount < 10) {
  console.warn(`seo-audit: only ${blogCount} article pages were generated; check build-time access to the blog API`);
}
console.log(`seo-audit: ${pages.length} generated pages (${blogCount} articles) passed metadata, schema and link checks`);
