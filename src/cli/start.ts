import { loadConfig } from "../config/config.js";
import { startBot } from "../bot/bot.js";

export async function runStart(): Promise<void> {
  const config = loadConfig();
  await startBot(config);
}
