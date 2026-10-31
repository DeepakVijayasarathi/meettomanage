// Post-build step (after prerender-meta): renders each public marketing page in headless Chrome and
// writes its visible HTML into dist/<route>.html (and dist/index.html for "/"), replacing the loading
// placeholder inside #root. Crawlers that don't run JavaScript then read real page text, not 39 words.
//
// Safe by design: the app still mounts with createRoot, which replaces #root, so visitors see the same
// page as before. Any page that fails to render, renders too little text, or shows an error state keeps
// its existing file, and the whole step is skipped (exit 0) when no Chrome is found, so a build never
// fails because of this script. Set PRERENDER_CHROME to the browser binary; PRERENDER_STRICT=1 makes
// failures fatal (useful in CI while verifying).
import http from "node:http";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { PAGES } from "./seo-pages.mjs";

const dist = path.resolve(import.meta.dirname, "../dist");
const MIN_WORDS = 150;
const STRICT = process.env.PRERENDER_STRICT === "1";
// Posts and API-driven pages come from the backend at runtime. Without it the page would render an
// empty or error state, so only pages whose content is bundled with the app are rendered here.
const SKIP = new Set(["/blog", "/store", "/blog/signs-academy-outgrown-spreadsheets", "/blog/demo-booking-to-enrolled-family", "/blog/automatic-fee-suspension-payment-conversations"]);
const ERROR_MARKERS = [/page not found/i, /something went wrong/i, /could not load/i];

const CHROME_CANDIDATES = [
  process.env.PRERENDER_CHROME,
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const chrome = CHROME_CANDIDATES.find((p) => p && existsSync(p));
if (!chrome) {
  console.log("prerender-body: no Chrome found (set PRERENDER_CHROME); skipping");
  process.exit(0);
}

const MIME = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };

// Serves dist as the browser would get it from nginx, but every page route returns the plain SPA shell
// (dist/index.html as built), so what we capture is what the app renders itself.
const shell = await readFile(path.join(dist, "index.html"));
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const file = path.join(dist, decodeURIComponent(url.pathname));
  try {
    if (file.startsWith(dist) && path.extname(file) && file !== dist) {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
      return res.end(body);
    }
  } catch { /* fall through to the shell */ }
  res.writeHead(200, { "content-type": "text/html" });
  res.end(shell);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

/** Index just after the </div> that closes the element opened at `start` (a "<div" tag). */
function endOfDiv(html, start) {
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let depth = 0;
  for (let m; (m = re.exec(html)); ) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  throw new Error("unbalanced #root");
}

function injectRoot(html, inner) {
  const open = html.indexOf('<div id="root">');
  if (open < 0) throw new Error("no #root in shell");
  return html.slice(0, open) + `<div id="root">${inner}</div>` + html.slice(endOfDiv(html, open));
}

let browser;
try {
  browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
} catch (e) {
  server.close();
  console.warn(`prerender-body: could not start Chrome (${e.message}); skipping`);
  process.exit(STRICT ? 1 : 0);
}
const targets = [{ path: "/", file: path.join(dist, "index.html") }, ...PAGES.filter((p) => !SKIP.has(p.path)).map((p) => ({ path: p.path, file: path.join(dist, `${p.path}.html`) }))];
let wrote = 0;
const failures = [];
try {
  for (const t of targets) {
    const page = await browser.newPage();
    try {
      await page.setRequestInterception(true);
      // Only the local build is allowed: no API, analytics or Jitsi calls from the build machine.
      page.on("request", (req) => (req.url().startsWith(origin) || req.url().startsWith("data:") ? req.continue() : req.abort()));
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(origin + t.path, { waitUntil: "networkidle0", timeout: 30000 });
      await page.waitForSelector("main, h1", { timeout: 15000 });
      const { inner, text } = await page.evaluate(() => ({ inner: document.getElementById("root").innerHTML, text: document.getElementById("root").innerText }));
      const words = text.split(/\s+/).filter(Boolean).length;
      if (words < MIN_WORDS || ERROR_MARKERS.some((re) => re.test(text))) throw new Error(`rendered ${words} words or an error state`);
      const html = await readFile(t.file, "utf8");
      // The real page text is now in the HTML, so the short noscript summary from prerender-meta would only repeat it.
      await writeFile(t.file, injectRoot(html, inner).replace(/<noscript><h1>[\s\S]*?<\/noscript>/, ""));
      wrote++;
      console.log(`prerender-body: ${t.path} (${words} words)`);
    } catch (e) {
      failures.push(`${t.path}: ${e.message}`);
      console.warn(`prerender-body: kept existing HTML for ${t.path} (${e.message})`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`prerender-body: rendered ${wrote} of ${targets.length} pages`);
if (STRICT && failures.length) process.exit(1);
