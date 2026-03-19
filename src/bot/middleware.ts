import type { Context, MiddlewareFn } from "telegraf";
import { log } from "../utils/logger.js";

export function whitelist(allowedIds: number[]): MiddlewareFn<Context> {
  const allowed = new Set(allowedIds);
  return (ctx, next) => {
    const chatId = ctx.chat?.id;
    if (chatId === undefined || !allowed.has(chatId)) {
      log("warn", `Blocked message from unauthorized chat ID: ${chatId}`);
      return;
    }
    return next();
  };
}
