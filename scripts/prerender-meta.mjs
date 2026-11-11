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
const NO_SHOWS_SLUG = "reduce-no-shows-online-classes";
const NO_SHOWS_DESCRIPTION = "A practical guide for Indian coaching centres and online academies to reduce student and demo-class no-shows with reminders, attendance tracking and clear follow-up.";
const BLOG_SEARCH_TITLES = {
  "single-subject-academy-growth-playbook": "Growth Playbook for Phonics, Maths and Coding Academies",
  "whatsapp-automation-for-coaching-centres": "WhatsApp Automation for Coaching Centres",
  "class-recordings-15-day-window": "Class Recordings: Why a 15-Day Window Works",
  "online-counselling-mentoring-platform": "Online Counselling and Mentoring Platform",
  "how-to-qualify-coaching-centre-leads-without-slowing-down-enrolment": "How to Qualify Coaching Centre Leads",
  "the-demo-booking-follow-up-checklist-that-prevents-lost-admissions": "Demo Booking Follow-Up Checklist for Academies",
  "hybrid-classes-for-schools": "Hybrid Classes for Schools Without the Chaos",
  "interactive-whiteboard-activities-online-classes": "10 Interactive Whiteboard Activities for Online Classes",
  "gamification-online-classes-kids": "Gamification for Kids' Online Classes",
  "tutor-grow-10-to-50-students": "How Tutors Can Grow from 10 to 50 Students",
  "zoom-vs-live-classroom-for-academies": "Zoom vs Live Classroom Software for Academies",
  "automated-fee-collection-setup": "Automated Fee Collection Setup for Academies",
  "online-coaching-software-checklist": "Online Coaching Software Checklist",
  "automatic-fee-suspension-payment-conversations": "Automatic Fee Suspension for Late Payments",
  "demo-booking-to-enrolled-family": "From Demo Booking to Enrolled Family",
};
const NO_SHOWS_CONTEXT = "<aside><h2>For coaching centres and online academies</h2><p>This guide is for academy owners and administrators in India who want fewer missed student classes and demo bookings. It focuses on parent reminders, class scheduling, attendance tracking and follow-up—not sports lessons or event ticketing.</p></aside>";
/** Brand suffix only when it fits in ~60 characters; a long title stays whole (never cut with "…"), so its keywords stay in. */
const blogSeoTitle = (title, slug) => {
  const searchTitle = BLOG_SEARCH_TITLES[slug] ?? title;
  return searchTitle.length + BLOG_TITLE_SUFFIX.length <= 60 ? `${searchTitle}${BLOG_TITLE_SUFFIX}` : searchTitle;
};
const clipDescription = (value, max = 160) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const shortened = text.slice(0, max - 3);
  const boundary = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, boundary >= 120 ? boundary : shortened.length).trim()}...`;
};
const blogSeoDescription = (post, content) => {
  if (post.slug === NO_SHOWS_SLUG) return NO_SHOWS_DESCRIPTION;
  const excerpt = String(post.excerpt ?? "").trim();
  if (excerpt.length >= 70) return clipDescription(excerpt);
  const plain = String(content ?? "").replace(/^##\s+.*$/gm, " ").replace(/[*_#-]+/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= 160) return clipDescription(plain || excerpt);
  const cut = plain.slice(0, 157);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 120)).trim()}…`;
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
  if (page.noindex) {
    if (/<meta\s+name="robots"/i.test(html)) {
      html = html.replace(/(<meta\s+name="robots"\s+content=")[^"]*(")/i, "$1noindex, follow$2");
    } else {
      swap(/<\/head>/, '<meta name="robots" content="noindex, follow" />\n  </head>');
    }
  }
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
      headline: (page.heading ?? heading(page.title)).slice(0, 110),
      description: page.description,
      datePublished: page.publishedAt,
      dateModified: page.publishedAt,
      mainEntityOfPage: url,
      url,
      inLanguage: "en-IN",
      ...(page.wordCount ? { wordCount: page.wordCount } : {}),
      isPartOf: { "@type": "Blog", name: "Meet to Manage Blog", url: `${SITE}/blog` },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
          { "@type": "ListItem", position: 3, name: page.heading ?? heading(page.title), item: url },
        ],
      },
      ...(image ? { image } : {}),
      author: { "@type": "Organization", name: "Meet to Manage", url: `${SITE}/` },
      publisher: { "@type": "Organization", name: "Meet to Manage", logo: { "@type": "ImageObject", url: `${SITE}/logo-icon.png` } },
    };
    swap(/<\/head>/, `<meta property="article:published_time" content="${esc(page.publishedAt)}" />\n    <script type="application/ld+json" data-prerender>${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>\n  </head>`);
  }
  // The boot screen (visible until React mounts, and all a non-JS crawler sees) carries the
  // home hero by default; give each page its own heading, summary and, for posts, the article.
  const body = page.contentHtml
    ? `<main class="article"><h1>${esc(page.heading ?? heading(page.title))}</h1><p class="lead">${desc}</p>${page.contentHtml}<p><a class="cta" href="/get-started">Book Demo</a></p></main>`
    : `<main><h1>${esc(heading(page.title))}</h1><p>${desc}</p><a class="cta" href="/get-started">Book Demo</a></main>`;
  swap(/(<div id="boot">[\s\S]*?)<main>[\s\S]*?<\/main>/, (a) => `${a}${body}`);
  const links = NAV.map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join("");
  swap(/<body([^>]*)>/, (a) => `<body${a}><noscript><nav><ul>${links}</ul></nav></noscript>`);
  return html;
}

const API = (process.env.PRERENDER_API_URL ?? "https://api.meettomanage.cloud").replace(/\/$/, "");

async function getJson(url, attempts = 1) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        console.warn(`prerender-meta: retrying ${url} (${attempt}/${attempts})`);
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }
  throw lastError;
}

function blogProductBridge(post) {
  const topic = `${post.slug ?? ""} ${post.title ?? ""}`.toLowerCase();
  let solution = {
    href: "/solutions/tuition-centre-management-software",
    label: "See the complete coaching-centre workflow",
    copy: "Turn the ideas in this guide into one practical system for classes, attendance, fees, parents, and daily operations.",
  };
  if (/demo|admission|enrol|booking|crm|lead/.test(topic)) {
    solution = {
      href: "/solutions/coaching-centre-admission-crm",
      label: "See the admission CRM workflow",
      copy: "Capture enquiries, assign follow-ups, schedule demos, and move interested families through one visible admission pipeline.",
    };
  } else if (/fee|payment|gateway|pricing|billing|cost/.test(topic)) {
    solution = {
      href: "/solutions/fee-management-software-for-coaching-centres",
      label: "See the fee-management workflow",
      copy: "Track collections, overdue fees, receipts, and parent reminders without maintaining separate spreadsheets.",
    };
  } else if (/class|whiteboard|gamif|recording|teacher|zoom|lesson/.test(topic)) {
    solution = {
      href: "/solutions/live-class-software-for-institutes",
      label: "See the live-class workflow",
      copy: "Run classes, attendance, recordings, and learner communication from a workflow designed for teaching businesses.",
    };
  }
  return `<aside class="product-bridge"><h2>Put this guide into practice</h2><p>${esc(solution.copy)}</p><p><a href="${solution.href}">${esc(solution.label)}</a></p></aside>`;
}

/** Every published post with its full text, from the API. A build must never fail because the API is down. */
async function blogPages() {
  try {
    const posts = (await getJson(`${API}/api/blog`, 3)).filter((p) => typeof p.slug === "string" && /^[a-z0-9-]+$/.test(p.slug));
    const pages = [];
    const makePage = async (p) => {
      let content = "";
      let contentHtml = "";
      let wordCount = 0;
      try {
        content = (await getJson(`${API}/api/blog/${p.slug}`)).content ?? "";
        contentHtml = markdownToHtml(content);
        wordCount = content.trim().split(/\s+/).filter(Boolean).length;
      } catch (err) {
        console.warn(`prerender-meta: no body for ${p.slug} (${err.message})`);
      }
      const cover = `/blog/${p.slug}.webp`;
      return {
        path: `/blog/${p.slug}`,
        type: "article",
        title: blogSeoTitle(p.title, p.slug),
        // The visible heading and article headline use the post's full title, not the search-result title.
        heading: p.title,
        description: blogSeoDescription(p, content),
        publishedAt: p.publishedAtUtc,
        wordCount,
        image: existsSync(path.join(dist, cover)) ? cover : undefined,
        contentHtml: `${p.slug === NO_SHOWS_SLUG ? NO_SHOWS_CONTEXT : ""}${contentHtml}${blogProductBridge(p)}`,
      };
    };
    // Keep builds responsive when one API instance is slow, without creating an
    // unbounded burst of requests against the production blog service.
    const concurrency = 6;
    for (let index = 0; index < posts.length; index += concurrency) {
      pages.push(...await Promise.all(posts.slice(index, index + concurrency).map(makePage)));
    }
    return pages;
  } catch (err) {
    console.warn(`prerender-meta: skipped blog posts (${err.message})`);
    return [];
  }
}

// Live posts replace the hand-written fallback entries for the same path.
const posts = await blogPages();
for (const post of posts) {
  const i = PAGES.findIndex((p) => p.path === post.path);
  if (i >= 0) PAGES[i] = post;
  else PAGES.push(post);
}

// The blog index loads its list from the API, so prerender-body skips it and crawlers that don't run
// JavaScript saw an empty page with no links to any post. List every post here instead, newest first.
const blogIndex = PAGES.find((p) => p.path === "/blog");
if (blogIndex && posts.length) {
  const items = [...posts]
    .sort((a, b) => String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")))
    .map((p) => `<li><h2><a href="${p.path}">${esc(p.heading ?? p.title)}</a></h2>${p.description ? `<p>${esc(p.description)}</p>` : ""}</li>`)
    .join("");
  const buyerPaths = `<section><h2>Start with your biggest problem</h2><p>Use these practical guides to diagnose the problem, then see the matching product workflow.</p><ul><li><a href="/blog/admissions-crm-for-coaching-centres-the-complete-workflow">Improve enquiry and admission follow-up</a></li><li><a href="/blog/fee-management-software-for-coaching-institutes-a-buyer-guide">Choose a better fee-management process</a></li><li><a href="/blog/online-coaching-software-checklist">Plan an online coaching workflow</a></li></ul></section>`;
  blogIndex.contentHtml = `${buyerPaths}<ul class="post-list">${items}</ul>`;
}

// Marketing console → SEO overrides, so crawlers that don't run JavaScript see the same
// titles/descriptions as the live pages. The home page's live in the shell (dist/index.html).
const SEO_KEYS = { "/": "home", "/pricing": "pricing", "/get-started": "getStarted", "/demo": "demo", "/store": "store", "/blog": "blog" };
let seo = {};
try {
  seo = Object.fromEntries((await getJson(`${API}/api/settings/public`, 3)).filter((s) => s.key?.startsWith("seo.") && s.value?.trim()).map((s) => [s.key, s.value.trim()]));
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
