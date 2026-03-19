import fs from "node:fs";
import inquirer from "inquirer";
import { getConfigDir } from "../config/config.js";
import { runInit } from "./init.js";

export async function runReset(): Promise<void> {
  const configDir = getConfigDir();

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `This will delete all config and sessions at ${configDir}. Continue?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log("Reset cancelled.");
    return;
  }

  if (fs.existsSync(configDir)) {
    fs.rmSync(configDir, { recursive: true });
    console.log("Config and sessions deleted.\n");
  }

  await runInit();
}
