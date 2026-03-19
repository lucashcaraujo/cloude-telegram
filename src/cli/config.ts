import { loadConfig, saveConfig, getConfigPath } from "../config/config.js";

export function runConfigShow(): void {
  const config = loadConfig();
  console.log(`Config file: ${getConfigPath()}\n`);
  console.log(JSON.stringify(config, null, 2));
}

export function runConfigSet(key: string, value: string): void {
  const config = loadConfig();

  const keys = key.split(".");
  let target: Record<string, unknown> = config as unknown as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!;
    if (typeof target[k] !== "object" || target[k] === null) {
      console.error(`Invalid config key: ${key}`);
      process.exit(1);
    }
    target = target[k] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1]!;
  const currentValue = target[lastKey];

  if (Array.isArray(currentValue)) {
    target[lastKey] = value.split(",").map((v) => {
      const num = Number(v.trim());
      return isNaN(num) ? v.trim() : num;
    });
  } else if (typeof currentValue === "number") {
    target[lastKey] = Number(value);
  } else {
    target[lastKey] = value;
  }

  saveConfig(config);
  console.log(`Updated ${key} = ${JSON.stringify(target[lastKey])}`);
}
