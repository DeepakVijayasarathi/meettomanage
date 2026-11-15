import { readFile } from "node:fs/promises";

function parse(text) {
  return Object.fromEntries(text.split(/\r?\n/).filter((line) => line && !line.trimStart().startsWith("#") && line.includes("="))
    .map((line) => { const at = line.indexOf("="); return [line.slice(0, at).trim(), line.slice(at + 1).trim()]; }));
}

const failures = [];
for (const [file, secure] of [[".env.production", true], [".env.uat", true], [".env.development", false]]) {
  const env = parse(await readFile(file, "utf8"));
  for (const key of ["VITE_API_BASE_URL", "VITE_TENANT_EMAIL_MAP", "VITE_JITSI_DOMAIN"])
    if (!(key in env)) failures.push(`${file}: missing ${key}`);
  try {
    const api = new URL(env.VITE_API_BASE_URL);
    if (secure && api.protocol !== "https:") failures.push(`${file}: API URL must use HTTPS`);
  } catch { failures.push(`${file}: VITE_API_BASE_URL is not a valid URL`); }
  try {
    const mapping = JSON.parse(env.VITE_TENANT_EMAIL_MAP);
    if (!mapping || Array.isArray(mapping) || typeof mapping !== "object") throw new Error();
  } catch { failures.push(`${file}: VITE_TENANT_EMAIL_MAP must be a JSON object`); }
  if (!/^[a-z0-9.-]+(?::\d+)?$/i.test(env.VITE_JITSI_DOMAIN ?? ""))
    failures.push(`${file}: VITE_JITSI_DOMAIN must be a bare hostname`);
  if (env.VITE_HUB_TRANSPORT && !["websocket", "longpolling"].includes(env.VITE_HUB_TRANSPORT))
    failures.push(`${file}: unsupported VITE_HUB_TRANSPORT`);
}
if (failures.length) { console.error(`config-audit failed:\n${failures.join("\n")}`); process.exit(1); }
console.log("config-audit: production, UAT and development environment files are valid");
