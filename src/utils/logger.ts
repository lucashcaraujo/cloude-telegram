const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type Level = keyof typeof LEVELS;

let currentLevel: Level = "info";

export function setLogLevel(level: Level): void {
  currentLevel = level;
}

function timestamp(): string {
  return new Date().toISOString();
}

export function log(level: Level, message: string): void {
  if (LEVELS[level] < LEVELS[currentLevel]) return;

  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  if (level === "error") {
    console.error(`${prefix} ${message}`);
  } else if (level === "warn") {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}
