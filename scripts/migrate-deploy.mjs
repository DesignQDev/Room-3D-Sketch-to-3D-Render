// Applies pending Prisma migrations during the build, robustly.
//
// A bare `prisma migrate deploy` can fail a deployment with P1002 ("timed out
// trying to acquire a postgres advisory lock"): Prisma takes a database-wide
// lock with a fixed 10s timeout, and the lock can be held by a concurrent build
// or left behind on a pooled connection. This wrapper:
//   1. migrates over the direct (unpooled) connection when one is provided —
//      session-level locks are unreliable through connection poolers;
//   2. retries on lock timeouts;
//   3. as a last resort, runs once without the advisory lock instead of failing
//      the whole deploy (the lock only guards against two migrations running at
//      the same time, and a clash there fails loudly rather than corrupting data).
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");

// Neon's Vercel integration provides the first two; fall back to DATABASE_URL.
const directUrl =
  process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
const databaseUrl = directUrl || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[migrate] DATABASE_URL is not set.");
  process.exit(1);
}
console.log(
  `[migrate] using the ${directUrl ? "direct (unpooled)" : "DATABASE_URL"} connection`
);

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function runMigrate({ disableLock }) {
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      ...(disableLock ? { PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1" } : {}),
    },
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return { ok: result.status === 0, lockTimeout: /P1002|advisory lock/i.test(output) };
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const lastAttempt = attempt === MAX_ATTEMPTS;
  if (lastAttempt) {
    console.warn("[migrate] final attempt: running without the advisory lock");
  }
  const { ok, lockTimeout } = runMigrate({ disableLock: lastAttempt });
  if (ok) process.exit(0);
  if (!lockTimeout) process.exit(1); // a real migration error — don't retry
  if (!lastAttempt) {
    console.warn(
      `[migrate] lock timeout (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${RETRY_DELAY_MS / 1000}s…`
    );
    await sleep(RETRY_DELAY_MS);
  }
}
process.exit(1);
