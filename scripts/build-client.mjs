import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const clientDir = resolve(root, "apps/client");
const clientDist = resolve(clientDir, "dist");
const widgetDist = resolve(root, "packages/widget/dist");
const publishedWidgetDir = resolve(clientDist, "widget/v1");

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

run("npm", ["install", "--no-audit", "--no-fund"], clientDir);
run("npm", ["run", "build"], clientDir);
run("npm", ["run", "build:widget"], root);

rmSync(publishedWidgetDir, { recursive: true, force: true });
mkdirSync(publishedWidgetDir, { recursive: true });
cpSync(resolve(widgetDist, "qr-tools-widget.js"), resolve(publishedWidgetDir, "qr-tools-widget.js"));
cpSync(resolve(widgetDist, "qr-tools-widget.js.map"), resolve(publishedWidgetDir, "qr-tools-widget.js.map"));

console.log("Client app and browser widget built successfully.");
console.log("Published widget:", "apps/client/dist/widget/v1/qr-tools-widget.js");
