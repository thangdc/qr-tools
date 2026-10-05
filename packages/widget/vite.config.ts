import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "QrToolsWidget",
      formats: ["iife"],
      fileName: () => "qr-tools-widget.js",
    },
    minify: false,
    sourcemap: true,
  },
});
