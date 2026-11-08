// Epilog Fusion Edge 24 teaching site: build (static site + WebGL viewer + two PDFs).
//   node build.mjs [--no-pdf]  ->  dist/ (dark), dist/light/, dist/webgl.html, dist/epilog-handbook.pdf, dist/epilog-wiki.pdf
//   node scripts/publish-site.mjs  ->  copies dist/ to the repository root, which GitHub Pages serves.
// Steps: claim check (when the source archive is present) -> site -> PDFs. Fails loudly.
import { rmSync, mkdirSync, cpSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = dirname(fileURLToPath(import.meta.url)), OUT = join(ROOT, "dist"), QA = join(ROOT, "qa");
if (Number(process.versions.node.split(".")[0]) < 22) throw Error("Node 22+ required");
const claims = spawnSync("python3", [join(ROOT, "scripts/check-claims-sb.py")], { stdio: ["ignore", "ignore", "inherit"] });
if (claims.status === 2) console.log("Claim check skipped: no source archive (see README).");
else if (claims.status !== 0) throw Error("Claim check failed (qa/claims-sb.json)");
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true }); mkdirSync(QA, { recursive: true });
const { buildSite } = await import("./generator/sbsite/site.mjs");
const files = buildSite(OUT);
let pdf = null;
if (!process.argv.includes("--no-pdf")) { const { buildPrint } = await import("./generator/sbsite/print.mjs"); pdf = buildPrint(OUT); for (const k of Object.keys(pdf)) rmSync(pdf[k].pdf.replace(/\.pdf$/, ".html")); }
cpSync(join(ROOT, "licenses"), join(OUT, "licenses"), { recursive: true }); writeFileSync(join(OUT, ".nojekyll"), "");
writeFileSync(join(QA, "build.json"), JSON.stringify({ files: files.length, pdf }, null, 1));
console.log(`Built ${files.length} HTML files${pdf ? `, handbook ${pdf.handbook.pages} pp, wiki ${pdf.wiki.pages} pp` : ""} into dist/`);
