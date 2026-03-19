import { Telegraf } from "telegraf";
import type { AppConfig } from "../config/config.js";
import { whitelist } from "./middleware.js";
import { createHandlers } from "./handlers.js";
import { initSessions } from "../claude/session.js";

export function createBot(config: AppConfig): Telegraf {
  const bot = new Telegraf(config.telegram.token);

  bot.use(whitelist(config.telegram.whitelist));

  initSessions();

  const handlers = createHandlers(config);

  bot.command("start", handlers.handleStart);
  bot.command("new", handlers.handleNew);
  bot.command("cwd", handlers.handleCwd);
  bot.on("text", handlers.handleMessage);

  return bot;
}

export async function startBot(config: AppConfig): Promise<void> {
  const bot = createBot(config);

  const shutdown = () => {
    console.log("Shutting down...");
    bot.stop("SIGINT");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("Bot started. Listening for messages...");
  console.log(`Working directory: ${config.claude.workingDirectory}`);
  console.log(`Whitelisted users: ${config.telegram.whitelist.join(", ")}`);

  await bot.launch();
}
