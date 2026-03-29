import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const workspaceRoot = path.resolve(frontendRoot, "..");

const reactAliasRoot = path.resolve(frontendRoot, "node_modules/react");
const reactDomAliasRoot = path.resolve(frontendRoot, "node_modules/react-dom");
const muiAliasRoot = path.resolve(frontendRoot, "node_modules/@mui/material");
const emotionReactAliasRoot = path.resolve(frontendRoot, "node_modules/@emotion/react");
const emotionStyledAliasRoot = path.resolve(frontendRoot, "node_modules/@emotion/styled");
const reactJsxRuntimeAlias = path.resolve(frontendRoot, "node_modules/react/jsx-runtime.js");
const reactJsxDevRuntimeAlias = path.resolve(frontendRoot, "node_modules/react/jsx-dev-runtime.js");

const entryFile = path.resolve(
  workspaceRoot,
  "modules/test-modules-pages/browser/page-mui-reader.global.jsx"
);
const outDir = path.resolve(workspaceRoot, "modules/test-modules-pages/dist");

await build({
  configFile: false,
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  resolve: {
    alias: {
      react: reactAliasRoot,
      "react-dom": reactDomAliasRoot,
      "react/jsx-runtime": reactJsxRuntimeAlias,
      "react/jsx-dev-runtime": reactJsxDevRuntimeAlias,
      "@mui/material": muiAliasRoot,
      "@emotion/react": emotionReactAliasRoot,
      "@emotion/styled": emotionStyledAliasRoot
    }
  },
  build: {
    outDir,
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: entryFile,
      formats: ["iife"],
      name: "CrudPageMuiReaderBundle",
      fileName: () => "page-mui-reader.global.js"
    }
  }
});
