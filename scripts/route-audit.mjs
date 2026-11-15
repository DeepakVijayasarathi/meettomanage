import { readFile } from "node:fs/promises";

const source = await readFile("src/App.tsx", "utf8");
const portals = ["admin", "itadmin", "marketing", "executive", "teacher", "parent", "subadmin", "admission", "coordinator", "management", "student"];
const failures = [];
for (const portal of portals) {
  const escaped = portal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const guarded = new RegExp(`<Route\\s+path="/${escaped}"[^>]+element=\\{<RequireAuth\\s+role="${escaped}"`);
  if (!guarded.test(source)) failures.push(`/${portal} is not guarded by RequireAuth role="${portal}"`);
}
if (!source.includes('<Route path="/marketing/login" element={<MarketingLogin />} />'))
  failures.push("marketing login must remain outside the protected marketing shell");
if (failures.length) {
  console.error(`route-audit failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`route-audit: ${portals.length} portal roots have matching role guards`);
