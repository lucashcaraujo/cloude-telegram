import type { Context, MiddlewareFn } from "telegraf";

export function whitelist(allowedIds: number[]): MiddlewareFn<Context> {
  const allowed = new Set(allowedIds);
  return (ctx, next) => {
    const chatId = ctx.chat?.id;
    if (chatId === undefined || !allowed.has(chatId)) {
      return;
    }
    return next();
  };
}
