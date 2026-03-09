import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const serverOrigin = process.env.VITE_SERVER_ORIGIN ?? "http://127.0.0.1:3001";
const reactAliasRoot = fileURLToPath(new URL("./node_modules/react", import.meta.url));
const reactDomAliasRoot = fileURLToPath(new URL("./node_modules/react-dom", import.meta.url));
const muiAliasRoot = fileURLToPath(new URL("./node_modules/@mui/material", import.meta.url));
const dndKitCoreAliasRoot = fileURLToPath(new URL("./node_modules/@dnd-kit/core", import.meta.url));
const dndKitSortableAliasRoot = fileURLToPath(
  new URL("./node_modules/@dnd-kit/sortable", import.meta.url)
);
const dndKitUtilitiesAliasRoot = fileURLToPath(
  new URL("./node_modules/@dnd-kit/utilities", import.meta.url)
);
const emotionReactAliasRoot = fileURLToPath(
  new URL("./node_modules/@emotion/react", import.meta.url)
);
const emotionStyledAliasRoot = fileURLToPath(
  new URL("./node_modules/@emotion/styled", import.meta.url)
);
const reactJsxRuntimeAlias = fileURLToPath(
  new URL("./node_modules/react/jsx-runtime.js", import.meta.url)
);
const reactJsxDevRuntimeAlias = fileURLToPath(
  new URL("./node_modules/react/jsx-dev-runtime.js", import.meta.url)
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: reactAliasRoot,
      "react-dom": reactDomAliasRoot,
      "react/jsx-runtime": reactJsxRuntimeAlias,
      "react/jsx-dev-runtime": reactJsxDevRuntimeAlias,
      "@dnd-kit/core": dndKitCoreAliasRoot,
      "@dnd-kit/sortable": dndKitSortableAliasRoot,
      "@dnd-kit/utilities": dndKitUtilitiesAliasRoot,
      "@mui/material": muiAliasRoot,
      "@emotion/react": emotionReactAliasRoot,
      "@emotion/styled": emotionStyledAliasRoot
    }
  },
  server: {
    port: 3000,
    proxy: {
      "/health": serverOrigin,
      "/ready": serverOrigin,
      "/api": serverOrigin
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.js",
    fileParallelism: false
  }
});
