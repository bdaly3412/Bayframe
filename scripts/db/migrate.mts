import { applyMigrations, checkExposure, fail } from "./local.mts";

async function main(): Promise<void> {
  checkExposure();
  await applyMigrations();
  console.log("Local application migrations complete.");
}

main().catch(fail);
