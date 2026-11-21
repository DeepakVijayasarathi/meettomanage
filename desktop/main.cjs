const { app, BrowserWindow, ipcMain, Menu, session, shell } = require("electron");
const { spawn, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { decide, stripTenant, parseDemoRoot } = require("./demo-guard.cjs");

const DEV = process.argv.includes("--dev");
const DEV_URL = "http://localhost:5173";

// Read-only demo against a client's live API: `--demo-api=https://api.host` (or env M2M_DEMO_API).
// Fails closed: a malformed address quits instead of silently falling back to the normal backend.
const DEMO_ARG = process.argv.find((a) => a.startsWith("--demo-api="));
const DEMO_ROOT = parseDemoRoot(DEMO_ARG ? DEMO_ARG.slice("--demo-api=".length) : process.env.M2M_DEMO_API);
if (DEMO_ARG && !DEMO_ROOT) {
  console.error("--demo-api must be an https address such as https://api.example.com");
  app.exit(1);
}
// Separate profile so the demo never shares a saved login (or chats) with the real app.
if (DEMO_ROOT) app.setPath("userData", app.getPath("userData") + "-demo");
// Installed app: run Claude from a per-user folder (Program Files is read-only and has no source). Dev: the repo.
const PROJECT_DIR = app.isPackaged ? app.getPath("userData") : path.resolve(__dirname, "..");

let mainWin = null;
const running = new Map(); // webContents.id -> child process

function findClaude() {
  if (process.env.CLAUDE_PATH) return process.env.CLAUDE_PATH;
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const out = execFileSync(cmd, ["claude"], { encoding: "utf8" }).split(/\r?\n/)[0].trim();
    if (out) return out;
  } catch {
    /* not on PATH */
  }
  // Fall back to the binary bundled with the VS Code extension.
  try {
    const extDir = path.join(require("os").homedir(), ".vscode", "extensions");
    for (const d of fs.readdirSync(extDir).filter((n) => n.startsWith("anthropic.claude-code-")).sort().reverse()) {
      const exe = path.join(extDir, d, "resources", "native-binary", process.platform === "win32" ? "claude.exe" : "claude");
      if (fs.existsSync(exe)) return exe;
    }
  } catch {
    /* no extension */
  }
  return null;
}

// The built site uses absolute asset paths and BrowserRouter, so it can't load from file://.
// Serve dist over localhost with an SPA fallback instead.
function serveDist(root) {
  const http = require("http");
  // Demo mode: the built site has the normal API address baked in. Point it at the client's API by rewriting
  // the text files we serve. (A network-level redirect can't do this: Chromium strips the Authorization header
  // when a request is redirected to another domain.)
  const rewritten = new Map();
  const REWRITE_EXT = new Set([".js", ".html", ".mjs"]);
  const swapApi = (text) =>
    text.split("https://api.meettomanage.cloud").join(DEMO_ROOT).split("wss://api.meettomanage.cloud").join(DEMO_ROOT.replace(/^https:/, "wss:"));
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".mp4": "video/mp4" };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split("?")[0]);
      let file = path.join(root, path.normalize(rel));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(root, "index.html");
      }
      const ext = path.extname(file);
      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      if (DEMO_ROOT && REWRITE_EXT.has(ext)) {
        if (!rewritten.has(file)) rewritten.set(file, swapApi(fs.readFileSync(file, "utf8")));
        res.end(rewritten.get(file));
      } else fs.createReadStream(file).pipe(res);
    });
    // Fixed port keeps the origin (and so the saved login in localStorage) the same on every launch.
    const done = () => resolve(`http://127.0.0.1:${server.address().port}`);
    server.once("error", () => server.listen(0, "127.0.0.1", done)); // port busy: fall back to a random one
    server.listen(47831, "127.0.0.1", done);
  });
}

// Demo mode request filter on the client's API host: cancel every write except sign-in, and drop the /t/<code>
// prefix the site adds (the client's own host already identifies its tenant). Same-origin redirect keeps the sign-in header.
function installDemoGuard() {
  const urls = [DEMO_ROOT + "/*", DEMO_ROOT.replace(/^https:/, "wss:") + "/*"];
  session.defaultSession.webRequest.onBeforeRequest({ urls }, (details, callback) => {
    const u = new URL(details.url);
    if (decide(details.method, u.pathname) === "block") return callback({ cancel: true });
    const stripped = stripTenant(u.pathname);
    if (stripped === u.pathname) return callback({});
    callback({ redirectURL: u.origin + stripped + u.search });
  });
}

async function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1400,
    height: 900,
    title: DEMO_ROOT ? "Meet to Manage - DEMO (read-only)" : "Meet to Manage",
    icon: path.join(__dirname, "build", "icon.png"), // taskbar / window icon (also used when run from source)
    // The site is served from http://127.0.0.1:<port>, an origin the backend's CORS list doesn't
    // allow, so the browser blocks every API call ("Can't reach the server"). This window only ever
    // loads our own bundled site (external links open in the system browser), so relax it here.
    webPreferences: { contextIsolation: true, webSecurity: false, preload: path.join(__dirname, "preload-site.cjs") },
  });
  if (DEV && !DEMO_ROOT) {
    mainWin.loadURL(DEV_URL + "/login");
  } else {
    const packaged = path.join(__dirname, "app");
    const root = fs.existsSync(packaged) ? packaged : path.join(PROJECT_DIR, "dist");
    mainWin.loadURL((await serveDist(root)) + "/login");
  }
  if (DEMO_ROOT) {
    mainWin.on("page-title-updated", (e) => e.preventDefault());
    // A pseudo-element survives client-side navigation; re-applied after every full page load.
    mainWin.webContents.on("did-finish-load", () => {
      void mainWin?.webContents.insertCSS(
        'body::after{content:"DEMO \\00B7 READ-ONLY \\00B7 ' + new URL(DEMO_ROOT).host + '";position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:2147483647;pointer-events:none;background:#F25C05;color:#fff;font:600 11px system-ui,sans-serif;letter-spacing:.04em;padding:3px 12px;border-radius:999px;box-shadow:0 1px 4px rgba(0,0,0,.25)}',
      );
    });
  }
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWin.on("closed", () => (mainWin = null));
}

// Navigates the site window to the desktop-only account screen (same origin, so the SPA route resolves).
async function openSitePage(route) {
  if (!mainWin) await createMainWindow();
  const u = new URL(mainWin.webContents.getURL());
  mainWin.loadURL(u.origin + route);
  mainWin.focus();
}
const openClaudeAccount = () => openSitePage("/desktop/claude");
const openAiWorkspace = () => openSitePage("/desktop/ai-workspace");

function buildMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "App",
        submenu: [
          { label: "AI Workspace", accelerator: "CmdOrCtrl+Shift+W", click: openAiWorkspace },
          { label: "Claude Account && Usage", accelerator: "CmdOrCtrl+Shift+U", click: openClaudeAccount },
          { role: "reload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      { role: "editMenu" },
      { role: "viewMenu" },
    ]),
  );
}

// ---- Claude account + usage (shown on the site's desktop-only /desktop/claude screen) ----
const usageFile = () => path.join(app.getPath("userData"), "claude-usage.json");
function readUsage() {
  try {
    return JSON.parse(fs.readFileSync(usageFile(), "utf8"));
  } catch {
    return { entries: [], limits: {} };
  }
}
function recordUsage(ev) {
  const u = readUsage();
  if (ev.type === "rate_limit_event" && ev.rate_limit_info) {
    const i = ev.rate_limit_info;
    u.limits[i.rateLimitType || "unknown"] = { status: i.status, resetsAt: i.resetsAt, utilization: i.utilization, seen: Date.now() };
  } else if (ev.type === "result") {
    const use = ev.usage || {};
    u.entries.push({
      at: Date.now(),
      sessionId: ev.session_id,
      models: Object.keys(ev.modelUsage || {}),
      costUsd: ev.total_cost_usd || 0,
      inputTokens: use.input_tokens || 0,
      outputTokens: use.output_tokens || 0,
      cacheReadTokens: use.cache_read_input_tokens || 0,
      cacheWriteTokens: use.cache_creation_input_tokens || 0,
      durationMs: ev.duration_ms || 0,
      turns: ev.num_turns || 0,
      isError: !!ev.is_error,
    });
    u.entries = u.entries.slice(-500);
  } else return;
  try {
    fs.writeFileSync(usageFile(), JSON.stringify(u));
  } catch {
    /* non-fatal */
  }
}

function runClaude(args, timeoutMs = 20000) {
  const claude = findClaude();
  if (!claude) return Promise.resolve({ code: -1, out: "", err: "Claude CLI not found. Install it or set CLAUDE_PATH." });
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  return new Promise((resolve) => {
    const child = spawn(claude, args, { env, shell: process.platform === "win32", windowsHide: true });
    let out = "";
    let err = "";
    const t = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      clearTimeout(t);
      resolve({ code, out, err });
    });
  });
}

ipcMain.handle("claude:status", async () => {
  const r = await runClaude(["auth", "status"]);
  if (r.code === -1) return { cliFound: false, loggedIn: false, error: r.err };
  try {
    return { cliFound: true, cliPath: findClaude(), ...JSON.parse(r.out) };
  } catch {
    return { cliFound: true, cliPath: findClaude(), loggedIn: false, error: (r.err || r.out).trim() };
  }
});
// Opens the browser sign-in; resolves when the CLI exits (5 minutes max).
ipcMain.handle("claude:login", async () => {
  const r = await runClaude(["auth", "login"], 300000);
  return { ok: r.code === 0, message: (r.err || r.out).trim() };
});
ipcMain.handle("claude:logout", async () => {
  const r = await runClaude(["auth", "logout"]);
  return { ok: r.code === 0, message: (r.err || r.out).trim() };
});
ipcMain.handle("claude:usage", () => readUsage());
ipcMain.handle("claude:clear-usage", () => {
  try {
    fs.unlinkSync(usageFile());
  } catch {
    /* already gone */
  }
});

// Live backend (tenant "meettomanage"). The token lives only in this process's memory.
const API_BASE = DEMO_ROOT ? DEMO_ROOT + "/api" : process.env.LIVE_API_BASE || "https://api.meettomanage.cloud/t/meettomanage/api";
let liveToken = null;
let liveUser = null;

ipcMain.on("app:info", (event) => {
  event.returnValue = { demo: !!DEMO_ROOT, apiHost: DEMO_ROOT ? new URL(DEMO_ROOT).host : null };
});

ipcMain.handle("ai:status", () => {
  const p = findClaude();
  return { found: !!p, path: p, cwd: PROJECT_DIR, apiBase: API_BASE, signedInAs: liveUser };
});

ipcMain.handle("api:set-token", (_e, { token, user }) => {
  liveToken = token || null;
  liveUser = token ? user || "site session" : null;
});

// Runs `claude -p` headless. The prompt goes over stdin so no shell quoting is needed.
ipcMain.on("ai:ask", (event, { prompt, sessionId, allowEdits, allowLiveWrites, allowCreate, model }) => {
  const sender = event.sender;
  if (DEMO_ROOT) allowEdits = allowLiveWrites = allowCreate = false; // enforced here, whatever the UI sent
  const claude = findClaude();
  if (!claude) {
    sender.send("ai:event", { type: "error", message: "Claude CLI not found. Install it or set CLAUDE_PATH." });
    return;
  }
  const args = ["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages"];
  if (sessionId) args.push("--resume", sessionId);
  if (allowEdits) args.push("--permission-mode", "acceptEdits");
  if (["sonnet", "opus", "haiku"].includes(model)) args.push("--model", model);

  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  // Tells Claude about the chart/table/classplan/quiz blocks the AI Workspace renders (file avoids shell quoting of JSON).
  const richPrompt = path.join(__dirname, "rich-output.md");
  if (fs.existsSync(richPrompt)) args.push("--append-system-prompt-file", process.platform === "win32" ? `"${richPrompt}"` : richPrompt);
  if (liveToken) {
    // The API is exposed to Claude as an MCP server (mcp/mcp-server.mjs). The config holds no secrets:
    // ${...} is expanded by Claude from the env below. Electron's own binary runs the server as plain Node.
    const cfgPath = path.join(require("os").tmpdir(), "meettomanage-mcp.json");
    fs.writeFileSync(
      cfgPath,
      JSON.stringify({
        mcpServers: {
          meettomanage: {
            command: process.execPath,
            args: [path.join(__dirname, "mcp", "mcp-server.mjs")],
            env: {
              ELECTRON_RUN_AS_NODE: "1",
              LIVE_API_BASE: "${LIVE_API_BASE}",
              LIVE_API_TOKEN: "${LIVE_API_TOKEN}",
              MCP_ALLOW_WRITES: "${MCP_ALLOW_WRITES}",
              MCP_ALLOW_CREATE: "${MCP_ALLOW_CREATE}",
              MCP_READ_ONLY: "${MCP_READ_ONLY}",
            },
          },
        },
      }),
    );
    const q = (s) => (process.platform === "win32" ? `"${s}"` : s);
    args.push("--mcp-config", q(cfgPath), "--allowedTools", "mcp__meettomanage");
    args.push(
      "--append-system-prompt",
      q(
        "Live Meet to Manage data is available through the meettomanage MCP tools (named after the website's API functions, for example listStudents). Prefer them over reading source code for live questions. Never print or ask for tokens." +
          (DEMO_ROOT ? " This is a read-only demo of a client's data: never offer or attempt to change anything." : allowLiveWrites ? " Write tools are enabled; confirm with the user in chat before changing data." : allowCreate ? " You may create quizzes and assignments with create_quiz_questions and create_assignment, but you cannot change or delete anything else." : " Only read tools exist; you cannot change live data."),
      ),
    );
    env.LIVE_API_BASE = API_BASE.replace(/\/api\/?$/, "");
    env.LIVE_API_TOKEN = liveToken;
    env.MCP_ALLOW_WRITES = allowLiveWrites ? "1" : "0";
    env.MCP_ALLOW_CREATE = allowCreate || allowLiveWrites ? "1" : "0";
    env.MCP_READ_ONLY = DEMO_ROOT ? "1" : "0";
  }

  const child = spawn(claude, args, {
    env,
    cwd: PROJECT_DIR,
    shell: process.platform === "win32", // .cmd shims need a shell on Windows
    windowsHide: true,
  });
  running.set(sender.id, child);

  let buf = "";
  child.stdout.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const ev = JSON.parse(line);
        recordUsage(ev);
        sender.send("ai:event", ev);
      } catch {
        /* ignore non-JSON noise */
      }
    }
  });
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d.toString()));
  child.on("close", (code) => {
    running.delete(sender.id);
    if (!sender.isDestroyed()) sender.send("ai:event", { type: "done", code, stderr: code ? stderr : "" });
  });
  child.stdin.end(prompt);
});

ipcMain.on("ai:stop", (event) => {
  const child = running.get(event.sender.id);
  if (child) child.kill();
});

app.whenReady().then(() => {
  if (DEMO_ROOT) installDemoGuard();
  buildMenu();
  createMainWindow();
});
app.on("window-all-closed", () => app.quit());
