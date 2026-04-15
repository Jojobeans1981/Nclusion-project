const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "www");

const files = [
  "index.html",
  "styles.css",
  "app.js",
  "sw.js",
  "manifest.webmanifest",
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(relPath) {
  const src = path.join(root, relPath);
  const dest = path.join(outDir, relPath);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(relDir) {
  const srcDir = path.join(root, relDir);
  const destDir = path.join(outDir, relDir);
  ensureDir(destDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcEntry = path.join(srcDir, entry.name);
    const destEntry = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(path.join(relDir, entry.name));
    } else {
      fs.copyFileSync(srcEntry, destEntry);
    }
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
ensureDir(outDir);

for (const file of files) {
  copyFile(file);
}
copyDir("icons");

console.log("Built web assets to ./www");
