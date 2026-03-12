import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rollup } from "rollup";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const distDir = path.join(packageRoot, "dist");

await mkdir(distDir, { recursive: true });

async function buildBundle(input, output) {
  const bundle = await rollup({ input });
  await bundle.write(output);
  await bundle.close();
}

await buildBundle(path.join(packageRoot, "src", "browser", "global-runtime.mjs"), {
  file: path.join(distDir, "client-runtime.global.js"),
  format: "iife",
  name: "CrudClientRuntimeBundle",
  sourcemap: true,
  banner: "/* crud-control client runtime global artifact */"
});

await buildBundle(path.join(packageRoot, "src", "index.mjs"), {
  file: path.join(distDir, "client-runtime.esm.js"),
  format: "esm",
  sourcemap: true
});
