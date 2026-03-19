import inquirer from "inquirer";
import fs from "node:fs";
import path from "node:path";
import { saveConfig, getConfigPath, configExists, type AppConfig } from "../config/config.js";
import { runStart } from "./start.js";

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

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "token",
      message: "Telegram bot token (from BotFather):",
      validate: (v: string) => (v.trim().length > 0 ? true : "Token is required"),
    },
    {
      type: "input",
      name: "chatId",
      message:
        "Your Telegram chat ID\n" +
        "  (To find it: open Telegram, search for @userinfobot, send /start,\n" +
        "   and it will reply with your chat ID)\n" +
        "  Chat ID:",
      validate: (v: string) => {
        const n = Number(v);
        return !isNaN(n) && n > 0 ? true : "Must be a valid number";
      },
    },
    {
      type: "input",
      name: "workingDirectory",
      message: "Working directory for Claude Code:",
      default: process.cwd(),
      validate: (v: string) => {
        const resolved = path.resolve(v);
        return fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()
          ? true
          : "Directory does not exist";
      },
    },
  ]);

  const config: AppConfig = {
    telegram: {
      token: answers.token.trim(),
      whitelist: [Number(answers.chatId)],
    },
    claude: {
      workingDirectory: path.resolve(answers.workingDirectory),
      permissionMode: "acceptEdits",
      allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
    },
  };

  saveConfig(config);
  console.log(`\nConfig saved to ${getConfigPath()}`);

  const { startNow } = await inquirer.prompt([
    {
      type: "confirm",
      name: "startNow",
      message: "Start the bot now?",
      default: true,
    },
  ]);

  if (startNow) {
    await runStart();
  } else {
    console.log('Run "tgcc start" to launch the bot.');
  }
}
