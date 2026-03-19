import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import inquirer from "inquirer";
import { Telegraf } from "telegraf";
import { saveConfig, getConfigPath, configExists, type AppConfig } from "../config/config.js";
import { ensureTelegramConnection } from "../utils/telegram-tls.js";
import { runStart } from "./start.js";

function promptWithPrefill(message: string, prefill: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} `, (answer) => {
      rl.close();
      resolve(answer);
    });

    // Write the prefill text into the line buffer so it's editable
    rl.write(prefill);
  });
}

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

async function waitForVerification(token: string): Promise<number> {
  const code = generateCode();
  const bot = new Telegraf(token);

  console.log("\n──────────────────────────────────────────");
  console.log(`  Verification code: ${code}`);
  console.log("──────────────────────────────────────────");
  console.log("  Open your bot on Telegram and send this code.");
  console.log("  Waiting...\n");

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      bot.stop("timeout");
      reject(new Error("Verification timed out after 5 minutes"));
    }, 5 * 60 * 1000);

    bot.on("text", async (ctx) => {
      const text = ctx.message.text.trim();
      if (text === code) {
        const chatId = ctx.chat.id;
        await ctx.reply("Verified! This chat is now linked to Claude Code.");
        clearTimeout(timeout);
        bot.stop("verified");
        resolve(chatId);
      } else {
        await ctx.reply("Invalid code. Try again.");
      }
    });

    bot.launch({ dropPendingUpdates: true }).catch(reject);
  });
}

export async function runInit(): Promise<void> {
  console.log("Claude Telegram — Setup\n");

  if (configExists()) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: `Config already exists at ${getConfigPath()}. Overwrite?`,
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log("Setup cancelled.");
      return;
    }
  }

  const { token } = await inquirer.prompt([
    {
      type: "input",
      name: "token",
      message: "Telegram bot token (from BotFather):",
      validate: (v: string) => (v.trim().length > 0 ? true : "Token is required"),
    },
  ]);

  let workingDirectory = "";
  while (!workingDirectory) {
    const answer = await promptWithPrefill("Working directory for Claude Code:", process.cwd());
    const resolved = path.resolve(answer);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      workingDirectory = answer;
    } else {
      console.log(`  Directory does not exist: ${resolved}`);
    }
  }

  // Ensure Telegram connection works (applies SNI bypass if needed)
  try {
    const patched = await ensureTelegramConnection(token.trim());
    if (patched) {
      console.log("  (Using SNI bypass for Telegram connection)");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nCannot connect to Telegram: ${msg}`);
    return;
  }

  let chatId: number;
  try {
    chatId = await waitForVerification(token.trim());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nVerification failed: ${msg}`);
    console.error("You can set the chat ID manually: tgcc config set telegram.whitelist YOUR_CHAT_ID");
    return;
  }

  console.log(`\nChat ID verified: ${chatId}`);

  const config: AppConfig = {
    telegram: {
      token: token.trim(),
      whitelist: [chatId],
    },
    claude: {
      workingDirectory: path.resolve(workingDirectory),
      permissionMode: "acceptEdits",
      allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
    },
  };

  saveConfig(config);
  console.log(`Config saved to ${getConfigPath()}\n`);

  await runStart();
}
