import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";

nextEnv.loadEnvConfig(process.cwd());
const command = process.argv[2];
if (!["deploy", "status"].includes(command)) {
  throw new Error("Usar: node scripts/migrate.mjs deploy|status");
}
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL.");
const migrationUrl = new URL(process.env.DATABASE_URL);
// Migrations need a session connection; keep the application's pool URL unchanged.
if (migrationUrl.hostname.endsWith(".pooler.supabase.com") && migrationUrl.port === "6543") {
  migrationUrl.port = "5432";
}
migrationUrl.searchParams.set("connect_timeout", "15");
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", command], {
  env: { ...process.env, DATABASE_URL: migrationUrl.toString() },
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

