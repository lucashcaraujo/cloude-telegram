import fs from "node:fs";
import path from "node:path";
import type { Context } from "telegraf";
import { sendMessage, clearSession } from "../claude/session.js";
import type { AppConfig } from "../config/config.js";
import { log } from "../utils/logger.js";

const MAX_MESSAGE_LENGTH = 4096;

function splitMessage(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    return [text];
  }
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= MAX_MESSAGE_LENGTH) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf("\n", MAX_MESSAGE_LENGTH);
    if (splitAt === -1 || splitAt < MAX_MESSAGE_LENGTH / 2) {
      splitAt = MAX_MESSAGE_LENGTH;
    }
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  return chunks;
}

export function createHandlers(config: AppConfig) {
  const activeRequests = new Set<number>();

  async function handleStart(ctx: Context): Promise<void> {
    await ctx.reply(
      "Claude Code Bot connected.\n\n" +
        "Commands:\n" +
        "/new — Start new conversation\n" +
        `/cwd — Change working directory (current: ${config.claude.workingDirectory})\n` +
        "\nSend any message to interact with Claude Code."
    );
  }

  async function handleNew(ctx: Context): Promise<void> {
    const chatId = String(ctx.chat!.id);
    log("info", `[chat:${chatId}] Session cleared`);
    clearSession(chatId);
    await ctx.reply("Session cleared. Next message starts a new conversation.");
  }

  async function handleCwd(ctx: Context): Promise<void> {
    const text = (ctx.message as { text?: string })?.text ?? "";
    const newPath = text.replace(/^\/cwd\s*/, "").trim();

    if (!newPath) {
      await ctx.reply(`Current directory: ${config.claude.workingDirectory}`);
      return;
    }

    const resolved = path.resolve(newPath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      await ctx.reply(`Directory not found: ${resolved}`);
      return;
    }

    config.claude.workingDirectory = resolved;
    await ctx.reply(`Working directory changed to: ${resolved}`);
  }

  async function handleMessage(ctx: Context): Promise<void> {
    const chatId = ctx.chat!.id;
    const text = (ctx.message as { text?: string })?.text;

    if (!text) return;

    if (activeRequests.has(chatId)) {
      log("debug", `[chat:${chatId}] Request blocked — already processing`);
      await ctx.reply("Please wait for the current request to finish.");
      return;
    }

    log("info", `[chat:${chatId}] Message received: "${text.slice(0, 100)}${text.length > 100 ? "..." : ""}"`);
    activeRequests.add(chatId);

    const typingInterval = setInterval(() => {
      ctx.sendChatAction("typing").catch(() => {});
    }, 4000);

    try {
      await ctx.sendChatAction("typing");

      log("info", `[chat:${chatId}] Sending to Claude Code...`);
      const startTime = Date.now();

      const response = await sendMessage(
        String(chatId),
        text,
        config.claude
      );

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log("info", `[chat:${chatId}] Response received (${elapsed}s, $${response.cost.toFixed(4)})`);

      clearInterval(typingInterval);

      if (response.error) {
        log("error", `[chat:${chatId}] Error: ${response.error}`);
      }

      if (response.text) {
        const chunks = splitMessage(response.text);
        log("debug", `[chat:${chatId}] Sending ${chunks.length} message(s) to Telegram`);
        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      }

      if (response.files.length > 0) {
        log("info", `[chat:${chatId}] Sending ${response.files.length} file(s)`);
      }

      for (const filePath of response.files) {
        try {
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            if (stat.size < 50 * 1024 * 1024) {
              await ctx.replyWithDocument({
                source: fs.createReadStream(filePath),
                filename: path.basename(filePath),
              });
            }
          }
        } catch {
          // skip files that can't be sent
        }
      }

      if (response.cost > 0) {
        await ctx.reply(`💰 Cost: $${response.cost.toFixed(4)}`);
      }
    } catch (err) {
      clearInterval(typingInterval);
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`Error: ${msg}`);
    } finally {
      activeRequests.delete(chatId);
    }
  }

  return { handleStart, handleNew, handleCwd, handleMessage };
}
