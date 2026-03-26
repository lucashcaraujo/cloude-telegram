import { loadConfig } from "../config/config.js";
import { startBot } from "../bot/bot.js";
import { runHealthCheck, printHealthCheck } from "../utils/healthcheck.js";

export async function runStart(): Promise<void> {
  const config = loadConfig();

  const health = runHealthCheck(config.claude.workingDirectory);
  printHealthCheck(health);

  if (!health.ok) {
    process.exit(1);
  }

  await startBot(config);
}
