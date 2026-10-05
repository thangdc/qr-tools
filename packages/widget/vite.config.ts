import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root,
  build: {
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      name: "QrToolsWidget",
      formats: ["iife"],
      fileName: () => "qr-tools-widget.js",
    },
    minify: false,
    sourcemap: true,
  },
});
