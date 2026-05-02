import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function walkFiles(relativeDir, extensions) {
  const startDir = path.join(rootDir, relativeDir);
  if (!fs.existsSync(startDir)) return [];

  const files = [];
  const entries = fs.readdirSync(startDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      files.push(...walkFiles(relativePath, extensions));
      continue;
    }

    if (extensions.includes(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }

  return files;
}

function checkReactEntrypoint() {
  const indexHtml = readText("client/index.html");
  const legacyAssets = ["/css/style.css", "/js/", "public/js", "public/css"];

  for (const asset of legacyAssets) {
    if (indexHtml.includes(asset)) {
      fail(`client/index.html should not load legacy public asset "${asset}".`);
    }
  }

  if (fileExists("public/js")) {
    fail("public/js should stay removed now that the React SPA owns the frontend.");
  }
}

function checkSourceBoundaries() {
  const sourceFiles = walkFiles("client/src", [".js", ".jsx"]);
  const publicImportPattern =
    /\bfrom\s+["'][^"']*public\/|import\(\s*["'][^"']*public\//;

  for (const file of sourceFiles) {
    const content = readText(file);
    if (publicImportPattern.test(content)) {
      fail(`${file} imports from public/. Move shared code into client/ or shared/.`);
    }
  }
}

function checkNodeSyntax() {
  const files = [
    ...walkFiles("server", [".js"]),
    ...walkFiles("shared", [".js"]),
    ...walkFiles("tests", [".js"]),
    ...walkFiles("scripts", [".js"])
  ];

  for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], {
      cwd: rootDir,
      encoding: "utf8"
    });

    if (result.status !== 0) {
      fail(`Syntax check failed for ${file}\n${result.stderr || result.stdout}`);
    }
  }
}

checkReactEntrypoint();
checkSourceBoundaries();
checkNodeSyntax();

if (failures.length > 0) {
  console.error("Project health checks failed:\n");
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log("Project health checks passed.");
