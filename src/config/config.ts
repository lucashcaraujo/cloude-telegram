import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface TelegramConfig {
  token: string;
  whitelist: number[];
}

export interface ClaudeConfig {
  workingDirectory: string;
  permissionMode: string;
  allowedTools: string[];
}

export interface AppConfig {
  telegram: TelegramConfig;
  claude: ClaudeConfig;
}

export interface SessionMap {
  [chatId: string]: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".claude-telegram");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const SESSIONS_FILE = path.join(CONFIG_DIR, "sessions.json");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE);
}

export function loadConfig(): AppConfig {
  if (!configExists()) {
    throw new Error(
      `Config not found. Run "claude-telegram init" first.`
    );
  }
  const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
  return JSON.parse(raw) as AppConfig;
}

export function saveConfig(config: AppConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}

export function loadSessions(): SessionMap {
  if (!fs.existsSync(SESSIONS_FILE)) {
    return {};
  }
  const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
  return JSON.parse(raw) as SessionMap;
}

export function saveSessions(sessions: SessionMap): void {
  ensureConfigDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}
