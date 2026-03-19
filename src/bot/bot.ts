import { Telegraf } from "telegraf";
import type { AppConfig } from "../config/config.js";
import { whitelist } from "./middleware.js";
import { createHandlers } from "./handlers.js";
import { initSessions } from "../claude/session.js";
import { ensureTelegramConnection } from "../utils/telegram-tls.js";
import { log } from "../utils/logger.js";

export function createBot(config: AppConfig): Telegraf {
  const bot = new Telegraf(config.telegram.token, {
    handlerTimeout: 600_000, // 10 minutes — Claude Code can take a while
  });

  bot.catch((err, ctx) => {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", `[chat:${ctx.chat?.id}] Unhandled error: ${msg}`);
    ctx.reply("An error occurred. Please try again.").catch(() => {});
  });

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
  const patched = await ensureTelegramConnection(config.telegram.token);
  if (patched) {
    log("info", "Using SNI bypass for Telegram connection");
  } else {
    log("info", "Connected to Telegram API");
  }

  const bot = createBot(config);

  const shutdown = () => {
    console.log("\nShutting down...");
    bot.stop("SIGINT");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("Bot started. Listening for messages...");
  console.log(`Working directory: ${config.claude.workingDirectory}`);
  console.log(`Whitelisted users: ${config.telegram.whitelist.join(", ")}`);

  await bot.launch({ dropPendingUpdates: true });
}
