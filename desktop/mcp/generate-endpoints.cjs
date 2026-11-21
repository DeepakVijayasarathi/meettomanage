// Scans src/api/*.ts for apiFetch(...) calls and writes endpoints.json, which mcp-server.mjs turns into MCP tools.
// Run: node desktop/mcp/generate-endpoints.cjs
const fs = require("fs");
const path = require("path");

const API_DIR = path.resolve(__dirname, "..", "..", "src", "api");
const OUT = path.join(__dirname, "endpoints.json");
const CALL = /apiFetch(?:<[^(]*?>)?\(\s*(["`])(\/api\/[\s\S]*?)\1/g; // tenant-scoped calls only (apiFetchGlobal is platform-wide)

function balancedCall(src, openIdx) {
  let depth = 0;
  let quote = null;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return src.slice(openIdx, i + 1);
  }
  return src.slice(openIdx, openIdx + 800);
}

function docBefore(src, idx) {
  // The JSDoc that sits directly above the enclosing exported function, if any.
  const head = src.slice(0, idx);
  const exp = [...head.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+\w+/g)].pop();
  if (!exp) return "";
  const m = head.slice(0, exp.index).match(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*$/);
  if (!m) return "";
  return m[1].replace(/^\s*\*\s?/gm, "").replace(/\s+/g, " ").trim().slice(0, 240);
}

const endpoints = [];
const used = new Map();
const skipped = [];

for (const file of fs.readdirSync(API_DIR).filter((f) => f.endsWith(".ts") && !f.includes(".test."))) {
  const src = fs.readFileSync(path.join(API_DIR, file), "utf8");
  let m;
  CALL.lastIndex = 0;
  while ((m = CALL.exec(src))) {
    const openIdx = src.lastIndexOf("(", m.index + m[0].indexOf("(") + 1);
    const call = balancedCall(src, src.indexOf("(", m.index));
    const methodMatch = call.match(/method:\s*(["'])(\w+)\1/);
    if (/method:/.test(call) && !methodMatch) {
      skipped.push(`${file}: dynamic method near "${m[2]}"`);
      continue;
    }
    const method = (methodMatch ? methodMatch[2] : "GET").toUpperCase();
    // File uploads / multipart forms can't be sent as JSON; the MCP server skips these (curated tools cover the ones that matter).
    const form = /FormData|body:\s*(form\b|toForm\()/.test(call);

    const before = src.slice(0, m.index);
    const fn = [...before.matchAll(/export\s+(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+))/g)].pop();
    const base = fn ? fn[1] || fn[2] : file.replace(".ts", "");
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    const name = n === 1 ? base : `${base}_${n}`;

    let rawPath = m[2];
    const pathParams = [];
    let hasQuery = false;
    rawPath = rawPath.replace(/\$\{([^}]*)\}/g, (_all, expr) => {
      const e = expr.trim();
      const simple = /^[A-Za-z_][\w.]*$/.test(e);
      const queryLike = /query|qs|params|search|suffix/i.test(e);
      if (!simple || queryLike) {
        hasQuery = true;
        return "{{query}}";
      }
      let p = e.replace(/\./g, "_");
      while (pathParams.includes(p)) p += "_";
      pathParams.push(p);
      return `{${p}}`;
    });
    // A literal "?x=${v}" in the path also means optional raw query text; keep it simple and expose `query`.
    const [pathOnly, literalQuery] = rawPath.includes("?") && !rawPath.includes("{{query}}") ? rawPath.split("?") : [rawPath, null];
    if (literalQuery !== null) hasQuery = true;

    endpoints.push({
      name,
      method,
      path: pathOnly.replace("{{query}}", ""),
      pathParams,
      query: hasQuery,
      body: method !== "GET" && method !== "DELETE",
      form,
      source: `src/api/${file}`,
      description: docBefore(src, m.index) || `${method} ${pathOnly.replace("{{query}}", "")}`,
    });
  }
}

fs.writeFileSync(OUT, JSON.stringify(endpoints, null, 2));
const counts = endpoints.reduce((a, e) => ((a[e.method] = (a[e.method] || 0) + 1), a), {});
console.log(`wrote ${endpoints.length} endpoints`, counts);
if (skipped.length) console.log("skipped:\n  " + skipped.join("\n  "));
