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

const SITE = "https://meettomanage.cloud";
const dist = path.resolve(import.meta.dirname, "../dist");

const PAGES = [
  { path: "/pricing", title: "Pricing — Meet to Manage", description: "One simple price per academy, with live classes, admissions, fee collection and a parent app included. Pay monthly or yearly." },
  { path: "/get-started", title: "Request a Demo — Meet to Manage", description: "Running an academy? See how Meet to Manage's live classroom, scheduling, admissions and billing work together — request a platform demo." },
  { path: "/demo", title: "Book a Free Demo — Meet to Manage", description: "Book a free demo class and see how Meet to Manage's live classroom, scheduling and billing work together." },
  { path: "/store", title: "Course Catalogue — Meet to Manage", description: "Browse current courses and book a free demo class — no account needed." },
  { path: "/blog", title: "Blog — Meet to Manage", description: "Practical notes on running a modern academy: admissions, billing automation, scheduling and more." },
  { path: "/blog/signs-academy-outgrown-spreadsheets", type: "article", title: "5 signs your academy has outgrown spreadsheets — Meet to Manage Blog", description: "Spreadsheets and a WhatsApp group get a small academy through its first year. Here's how to tell you've outgrown them." },
  { path: "/blog/demo-booking-to-enrolled-family", type: "article", title: "What actually happens between a demo booking and an enrolled family — Meet to Manage Blog", description: "What happens between a demo booking and an enrolled family, and how to make each step reliable." },
  { path: "/blog/automatic-fee-suspension-payment-conversations", type: "article", title: "How automatic fee-suspension turns an awkward conversation into a non-event — Meet to Manage Blog", description: "How automatic fee suspension removes the awkward payment conversation between academy and parents." },
  { path: "/customers", title: "Customers and Case Studies — Meet to Manage", description: "How online coaching centres use Meet to Manage for live classes, enrolment, fee collection and a parent app." },
  { path: "/customers/the-reader-nest", type: "article", title: "The Reader Nest Customer Story — Meet to Manage", description: "How The Reader Nest runs online phonics and public-speaking classes for children on Meet to Manage: enrolment, live classes, worksheets, recordings and a parent dashboard." },
  { path: "/solutions/live-class-software-for-institutes", title: "Live Class Software for Institutes and Online Coaching — Meet to Manage", description: "Run live classes and meetings with video, shared whiteboard, quizzes, screen sharing and recordings. Attendance, fees and the parent app are built in." },
  { path: "/solutions/online-attendance-software-for-institutes", title: "Online Attendance Software for Institutes — Meet to Manage", description: "Attendance is recorded when students join the live class and shown to parents on their dashboard. One platform for classes, attendance, fees and reports." },
  { path: "/careers", title: "Careers — Meet to Manage", description: "Work on the platform online coaching centres use for live classes, fees and parent apps. See open roles or send an open application." },
  { path: "/privacy", title: "Privacy Policy — Meet to Manage", description: "How Meet to Manage collects, uses, shares and protects information about academies, teachers, parents and students." },
  { path: "/legal/terms", title: "Terms of Service — Meet to Manage", description: "The terms that apply when an academy, school or coach subscribes to Meet to Manage: plans and billing, cancellation, acceptable use and data." },
  { path: "/policy", title: "Privacy Policy — Meet to Manage", description: "How Infinity Uniquers collects, uses, stores, shares and protects information across Meet to Manage and Infinity Client Finder." },
];

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

/** Every published post, from the API. A build must never fail because the API is down. */
async function blogPages() {
  const api = (process.env.PRERENDER_API_URL ?? "https://api.meettomanage.cloud").replace(/\/$/, "");
  try {
    const res = await fetch(`${api}/api/blog`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts = await res.json();
    return posts
      .filter((p) => typeof p.slug === "string" && /^[a-z0-9-]+$/.test(p.slug))
      .map((p) => ({ path: `/blog/${p.slug}`, type: "article", title: `${p.title} — Meet to Manage Blog`, description: p.excerpt ?? "" }));
  } catch (err) {
    console.warn(`prerender-meta: skipped blog posts (${err.message})`);
    return [];
  }
}

const known = new Set(PAGES.map((p) => p.path));
for (const post of await blogPages()) {
  if (!known.has(post.path)) PAGES.push(post);
}

const shell = await readFile(path.join(dist, "index.html"), "utf8");
for (const page of PAGES) {
  const file = path.join(dist, `${page.path}.html`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, render(shell, page));
}
console.log(`prerender-meta: wrote ${PAGES.length} pages`);
