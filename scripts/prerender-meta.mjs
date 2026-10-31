// Post-build step: writes dist/<route>.html for every public marketing page, with that
// page's own title, description, canonical and social tags plus a <noscript> summary and links.
// The SPA still boots from the same shell (nginx serves <route>.html via try_files), but
// crawlers that don't run JavaScript (Bing, AI bots, link previews) now see per-page metadata
// instead of the homepage defaults. Keep the table in sync with each page's <Seo> and with
// public/sitemap.xml.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PAGES } from "./seo-pages.mjs";

const SITE = "https://meettomanage.cloud";
const dist = path.resolve(import.meta.dirname, "../dist");


const NAV = [
  ["/", "Home"], ["/pricing", "Pricing"], ["/demo", "Book a free demo"], ["/get-started", "Request a platform demo"],
  ["/store", "Course catalogue"], ["/blog", "Blog"], ["/customers", "Customers"], ["/solutions/live-class-software-for-institutes", "Live class software"], ["/solutions/online-attendance-software-for-institutes", "Attendance software"], ["/careers", "Careers"],
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function render(shell, page) {
  const url = SITE + page.path;
  const title = esc(page.title);
  const desc = esc(page.description);
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
  const links = NAV.map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join("");
  const summary = `<noscript><h1>${title}</h1><p>${desc}</p><nav><ul>${links}</ul></nav></noscript>`;
  swap(/<body([^>]*)>/, (a) => `<body${a}>${summary}`);
  return html;
}

const shell = await readFile(path.join(dist, "index.html"), "utf8");
for (const page of PAGES) {
  const file = path.join(dist, `${page.path}.html`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, render(shell, page));
}
console.log(`prerender-meta: wrote ${PAGES.length} pages`);
