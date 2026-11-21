// Records the Mito announcement footage from the desktop app running in READ-ONLY demo mode.
//   1) cd desktop && node launch.cjs --demo-api=https://api.thereadernest.in --remote-debugging-port=9333
//   2) node video/mito-announcement/record.mjs      (from the repo root; needs the demo profile already signed in)
// Writes frames (CDP screencast, with real timestamps) to raw/<scene>/ and marks to raw/marks.json.
import puppeteer from "puppeteer-core";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = join(HERE, "raw");
const W = 1600, H = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
for (let i = 0; i < 30 && !browser; i++) {
  try { browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9333", defaultViewport: null }); } catch { await sleep(1000); }
}
if (!browser) throw new Error("Start the app in demo mode first (see header).");
const page = (await browser.pages()).find((p) => p.url().includes("127.0.0.1:47831")) ?? (await browser.pages())[0];
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
if (!(await page.evaluate(() => !!window.desktop?.demo))) throw new Error("App is not in demo (read-only) mode. Refusing to record.");

rmSync(RAW, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });

await page.goto(new URL("/desktop/ai-workspace", page.url()).href, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.removeItem("m2m.aiWorkspace.chats"));
await page.reload({ waitUntil: "networkidle2" });
await page.waitForSelector("textarea");
await sleep(1200);

const client = await page.createCDPSession();
let current = null; // {dir, frames:[{f, t}]}
const scenes = {};
client.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  if (current) {
    const n = current.frames.length;
    const f = `${String(n).padStart(5, "0")}.jpg`;
    writeFileSync(join(current.dir, f), Buffer.from(data, "base64"));
    current.frames.push({ f, t: metadata.timestamp });
  }
  client.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});

async function startScene(name) {
  const dir = join(RAW, name);
  mkdirSync(dir, { recursive: true });
  current = { dir, frames: [], marks: {} };
  scenes[name] = current;
  await client.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await sleep(500);
}
const mark = (key) => (current.marks[key] = Date.now() / 1000);
async function endScene() {
  await sleep(700);
  await client.send("Page.stopScreencast");
  writeFileSync(join(current.dir, "frames.json"), JSON.stringify({ frames: current.frames, marks: current.marks }));
  console.log(`scene ${current.dir.split(/[\\/]/).pop()}: ${current.frames.length} frames`);
  current = null;
}

// "answer finished" = Mito stopped working and a send button (not Stop) is back.
const waitDone = () => page.waitForFunction(() => !!document.querySelector('button[aria-label="Send"]') && !document.body.innerText.includes("Working…") && document.querySelectorAll("[aria-live=polite] .group").length > 0, { timeout: 240000, polling: 400 });
const firstReplyText = () => page.waitForFunction(() => document.querySelectorAll("[aria-live=polite] .group").length > 0, { timeout: 240000, polling: 200 });
const newChat = async () => { await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText.trim() === "New chat")?.click()); await sleep(900); };
const clickText = async (text) => { await page.evaluate((t) => [...document.querySelectorAll("button")].find((b) => b.innerText.trim().startsWith(t))?.click(), text); };

// ---- Scene 1: ask a question about the academy's live data
await startScene("ask");
await sleep(900);
mark("typing");
await page.type("textarea", "How many students, batches and courses does this academy have?", { delay: 38 });
await sleep(500);
mark("send");
await page.keyboard.press("Enter");
await firstReplyText();
mark("answer");
await waitDone();
mark("done");
await sleep(2200);
await endScene();

// ---- Scene 2: a chart from live data
await newChat();
await startScene("chart");
await sleep(700);
mark("typing");
await page.type("textarea", "Show a bar chart of the 6 courses with the most enrolled students.", { delay: 38 });
await sleep(400);
mark("send");
await page.keyboard.press("Enter");
await firstReplyText();
mark("answer");
await waitDone();
mark("done");
await sleep(2600);
await endScene();

// ---- Scene 3: class plan (generated, no client data)
await newChat();
await startScene("plan");
await sleep(900);
mark("click");
await clickText("Class plan");
await firstReplyText();
mark("answer");
await waitDone();
mark("done");
await sleep(1800);
await endScene();

// ---- Scene 4: quiz, answered live in the app
await newChat();
await startScene("quiz");
await sleep(900);
mark("click");
await clickText("Quiz");
await firstReplyText();
mark("answer");
await waitDone();
mark("done");
await sleep(1200);
// answer every question (first option), then check
const nQ = await page.evaluate(() => document.querySelectorAll("[aria-live=polite] ol > li").length);
for (let i = 0; i < nQ; i++) {
  await page.evaluate((i) => {
    const li = document.querySelectorAll("[aria-live=polite] ol > li")[i];
    li?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, i);
  await sleep(600);
  await page.evaluate((i) => { const li = document.querySelectorAll("[aria-live=polite] ol > li")[i]; const opts = li?.querySelectorAll("button"); (opts?.[(i % 3) + 1] ?? opts?.[0])?.click(); }, i);
  await sleep(500);
}
mark("answered");
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText.includes("Check answers"))?.click());
await sleep(1200);
mark("checked");
await sleep(2200);
await endScene();

writeFileSync(join(RAW, "scenes.json"), JSON.stringify(Object.fromEntries(Object.entries(scenes).map(([k, v]) => [k, { n: v.frames.length, marks: v.marks }])), null, 1));
console.log("recording complete");
await browser.disconnect();
