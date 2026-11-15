import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const assets = "dist/assets";
const files = await readdir(assets);
const sizes = new Map(await Promise.all(files.map(async (name) => [name, (await stat(join(assets, name))).size])));
const limits = [
  [/^index-.*\.js$/, 340_000, "entry JavaScript"],
  [/^index-.*\.css$/, 260_000, "application CSS"],
  [/^vendor-recharts-.*\.js$/, 480_000, "chart vendor"],
  [/^JitsiLive-.*\.js$/, 680_000, "live-class route"],
];
const failures = [];
for (const [pattern, max, label] of limits) {
  const match = [...sizes].find(([name]) => pattern.test(name));
  if (!match) failures.push(`${label}: output not found`);
  else if (match[1] > max) failures.push(`${label}: ${match[1]} bytes exceeds ${max}`);
  else console.log(`performance-budget: ${label} ${match[1]}/${max} bytes`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
