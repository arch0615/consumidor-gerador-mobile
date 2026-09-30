#!/usr/bin/env node
/**
 * Runs src/services/__tests__/live-api.test.ts against the real APIs.
 * Loads .env (API URLs) and .env.test.local (ACVEL_TEST_EMAIL / ACVEL_TEST_PASSWORD)
 * without printing any value. `--writes` also runs the upload checks.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function load(file) {
  if (!existsSync(file)) return {};
  const entries = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
    });
  return Object.fromEntries(entries);
}

const env = { ...process.env, ...load(".env"), ...load(".env.test.local"), ACVEL_LIVE: "1" };
if (process.argv.includes("--writes")) env.ACVEL_LIVE_WRITES = "1";

const missing = ["ACVEL_TEST_EMAIL", "ACVEL_TEST_PASSWORD"].filter((key) => !env[key]);
if (missing.length > 0) {
  console.error(`Missing ${missing.join(", ")} in .env.test.local`);
  process.exit(1);
}
if (!existsSync("firebase/google-services-android.json")) {
  console.error("Missing firebase/google-services-android.json");
  process.exit(1);
}

const result = spawnSync("npx", ["jest", "src/services/__tests__/live-api.test.ts", "--runInBand"], { env, stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
