// MCP server exposing the Meet to Manage tenant API as tools (one per endpoint in endpoints.json).
// Env: LIVE_API_BASE (e.g. https://api.meettomanage.cloud/t/meettomanage), LIVE_API_TOKEN (bearer),
//      MCP_ALLOW_WRITES=1 to also register POST/PUT/PATCH/DELETE tools (off by default: read-only).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const endpoints = JSON.parse(readFileSync(join(here, "endpoints.json"), "utf8"));
// endpoints.json paths start with /api, so the base is the tenant root (no trailing /api).
const BASE = (process.env.LIVE_API_BASE || "https://api.meettomanage.cloud/t/meettomanage").replace(/\/api\/?$/, "").replace(/\/$/, "");
const TOKEN = process.env.LIVE_API_TOKEN;
// MCP_READ_ONLY=1 (read-only demo) wins over everything: no write or create tool is registered and the HTTP helper refuses non-GET.
const READ_ONLY = process.env.MCP_READ_ONLY === "1";
const WRITES = !READ_ONLY && process.env.MCP_ALLOW_WRITES === "1";
// Narrow switch: only the typed create_* tools below, never update/delete. Independent of MCP_ALLOW_WRITES.
const CREATE = !READ_ONLY && process.env.MCP_ALLOW_CREATE === "1";
const MAX_CHARS = 30000;

const server = new McpServer({ name: "meettomanage", version: "0.1.0" });

async function api(method, path, body) {
  if (READ_ONLY && method !== "GET") throw new Error("Read-only mode: writes are disabled.");
  const isForm = body instanceof FormData;
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: "Bearer " + TOKEN, Accept: "application/json", ...(body && !isForm ? { "Content-Type": "application/json" } : {}) },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try { msg = JSON.parse(text).message ?? msg; } catch { /* plain text error */ }
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return text ? JSON.parse(text) : null;
}
const reply = (text, isError = false) => ({ isError, content: [{ type: "text", text }] });

if (CREATE) {
  server.tool(
    "create_quiz_questions",
    "Create live quiz questions in the academy's quiz bank (POST /api/quiz-questions). Give departmentId (from listDepartments) or courseId (from listCourses). Each question needs 2-6 options with exactly one isCorrect. Only call when the user asked to save/create questions.",
    {
      departmentId: z.string().optional().describe("Department id; required when courseId is not given"),
      courseId: z.string().optional().describe("Course id to scope the questions to one course"),
      questions: z.array(z.object({ prompt: z.string().min(1), options: z.array(z.object({ text: z.string().min(1), isCorrect: z.boolean() })).min(2).max(6) })).min(1).max(30),
    },
    async ({ departmentId, courseId, questions }) => {
      if (!TOKEN) return reply("Not signed in.", true);
      if (!departmentId && !courseId) return reply("Provide departmentId or courseId.", true);
      const bad = questions.findIndex((q) => q.options.filter((o) => o.isCorrect).length !== 1);
      if (bad >= 0) return reply(`Question ${bad + 1} must have exactly one correct option. Nothing was created.`, true);
      const created = [];
      const failed = [];
      for (const q of questions) {
        try {
          const r = await api("POST", "/api/quiz-questions", { ...(courseId ? { courseId } : { departmentId }), prompt: q.prompt, options: q.options });
          created.push(r?.id ?? "created");
        } catch (e) {
          failed.push(`"${q.prompt.slice(0, 40)}": ${e.message}`);
        }
      }
      return reply(`Created ${created.length}/${questions.length} quiz questions.` + (failed.length ? `\nFailed:\n${failed.join("\n")}` : ""), created.length === 0);
    },
  );

  server.tool(
    "create_assignment",
    "Create a live assignment (homework or test) for a batch (POST /api/assignments). Get batchId from listAssignableBatches. dueAtUtc is an ISO 8601 UTC time. Only call when the user asked to create/assign it.",
    {
      batchId: z.string().describe("Batch id from listAssignableBatches"),
      kind: z.enum(["Homework", "Test"]),
      title: z.string().min(1).max(200),
      instructions: z.string().optional(),
      topic: z.string().optional(),
      dueAtUtc: z.string().optional().describe("ISO 8601 UTC, e.g. 2026-11-25T18:30:00Z"),
      maxMarks: z.number().positive().optional(),
    },
    async (a) => {
      if (!TOKEN) return reply("Not signed in.", true);
      const form = new FormData();
      for (const k of ["batchId", "kind", "title", "instructions", "topic", "dueAtUtc"]) if (a[k]) form.append(k, a[k]);
      if (a.maxMarks != null) form.append("maxMarks", String(a.maxMarks));
      try {
        const r = await api("POST", "/api/assignments", form);
        return reply(`Created ${a.kind} "${a.title}"${r?.id ? ` (id ${r.id})` : ""}.`);
      } catch (e) {
        return reply(e.message, true);
      }
    },
  );
}

for (const ep of endpoints) {
  if (ep.form) continue; // multipart uploads can't be driven as JSON
  if (ep.method !== "GET" && !WRITES) continue;

  const shape = {};
  for (const p of ep.pathParams) shape[p] = z.string().describe(`Path parameter ${p}`);
  if (ep.query) shape.query = z.string().optional().describe("Raw query string, e.g. ?page=1&status=Active");
  if (ep.body) shape.body = z.record(z.string(), z.any()).optional().describe("JSON request body");

  server.tool(ep.name, `${ep.method} ${ep.path} - ${ep.description}`, shape, async (args) => {
    if (!TOKEN) return { isError: true, content: [{ type: "text", text: "Not signed in. Sign in from the desktop assistant first." }] };
    let url = ep.path;
    for (const p of ep.pathParams) url = url.replace(`{${p}}`, encodeURIComponent(args[p]));
    if (args.query) url += args.query.startsWith("?") ? args.query : "?" + args.query;

    if (READ_ONLY && ep.method !== "GET") return { isError: true, content: [{ type: "text", text: "Read-only mode: writes are disabled." }] };
    const res = await fetch(BASE + url, {
      method: ep.method,
      headers: { Authorization: "Bearer " + TOKEN, Accept: "application/json", ...(ep.body ? { "Content-Type": "application/json" } : {}) },
      body: ep.body && args.body ? JSON.stringify(args.body) : undefined,
    });
    const text = await res.text();
    const out = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + `\n...[truncated, ${text.length} chars total]` : text;
    return { isError: !res.ok, content: [{ type: "text", text: res.ok ? out || "(empty)" : `HTTP ${res.status} ${res.statusText}: ${out.slice(0, 500)}` }] };
  });
}

await server.connect(new StdioServerTransport());
