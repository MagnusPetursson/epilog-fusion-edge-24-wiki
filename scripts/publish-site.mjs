// Copy the built site from dist/ to the repository root, which GitHub Pages serves (branch main, path /).
// Removes root-level pages and PDFs that the new build no longer produces; source folders are never touched.
//   node scripts/publish-site.mjs
import { readdirSync, rmSync, cpSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), ".."), DIST = join(ROOT, "dist");
if (!existsSync(join(DIST, "index.html")) || !existsSync(join(DIST, "light", "index.html"))) throw Error("Run `node build.mjs` first: dist/ is incomplete");
const SITE_DIRS = ["light", "licenses"];
const built = new Set(readdirSync(DIST));
for (const name of readdirSync(DIST)) {
  const p = join(DIST, name);
  if (statSync(p).isDirectory() && !SITE_DIRS.includes(name)) throw Error(`Unexpected folder in dist/: ${name}`);
}
// stale root pages/PDFs
for (const name of readdirSync(ROOT)) if (/\.(html|pdf)$/.test(name) && !built.has(name)) rmSync(join(ROOT, name));
for (const d of SITE_DIRS) if (d !== "licenses") rmSync(join(ROOT, d), { recursive: true, force: true });
for (const name of built) cpSync(join(DIST, name), join(ROOT, name), { recursive: true });
console.log(`Published ${built.size} entries from dist/ to the repository root. Review with \`git status\`, then commit.`);
