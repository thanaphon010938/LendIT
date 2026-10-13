// `npm run dev`: starts `next dev --turbo`, then requests every route once in the
// background so each page is compiled before anyone clicks it.
import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const PORT = process.env.PORT ?? "3000";
const BASE = `http://localhost:${PORT}`;
const APP_DIR = join(process.cwd(), "src", "app");
// Valid ObjectId shape so dynamic pages don't trip Prisma's id validation.
const DUMMY_ID = "000000000000000000000000";

// Run Next's CLI with this same Node binary: no shell needed, so args are passed safely on every OS.
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const next = spawn(process.execPath, [nextBin, "dev", "--turbo", ...process.argv.slice(2)], { stdio: "inherit" });
next.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => next.kill(signal));

function findRoutes(dir) {
  const routes = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      routes.push(...findRoutes(full));
    } else if (name === "page.tsx" || name === "route.ts") {
      const route = relative(APP_DIR, dir)
        .split(sep)
        .filter((segment) => segment && !segment.startsWith("("))
        .map((segment) => (segment.startsWith("[...") ? "warmup" : segment.startsWith("[") ? DUMMY_ID : segment))
        .join("/");
      routes.push(`/${route}`);
    }
  }
  return routes;
}

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(`${BASE}/login`, { headers: { "x-dev-warmup": "1" } });
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

async function warmUp() {
  if (!(await waitForServer())) return;
  const routes = [...new Set(findRoutes(APP_DIR))];
  const started = Date.now();
  for (const route of routes) {
    try {
      await fetch(`${BASE}${route}`, { headers: { "x-dev-warmup": "1" }, redirect: "manual" });
    } catch {
      // Compile errors show in the Next output; keep warming the rest.
    }
  }
  console.log(`\n ✓ Warm-up: compiled ${routes.length} routes in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
}

warmUp();
