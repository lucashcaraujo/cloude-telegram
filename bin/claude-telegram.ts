#!/usr/bin/env node

import { Command } from "commander";
import { runInit } from "../src/cli/init.js";
import { runStart } from "../src/cli/start.js";
import { runConfigShow, runConfigSet } from "../src/cli/config.js";
import { setLogLevel } from "../src/utils/logger.js";

const program = new Command();

program
  .name("tgcc")
  .description("Control Claude Code remotely via Telegram")
  .version("1.0.0");

program
  .command("init")
  .description("Interactive setup wizard")
  .action(async () => {
    await runInit();
  });

program
  .command("start")
  .description("Start the Telegram bot")
  .option("--debug", "Enable debug logging")
  .action(async (opts: { debug?: boolean }) => {
    if (opts.debug) {
      setLogLevel("debug");
    }
    await runStart();
  });

const configCmd = program
  .command("config")
  .description("Manage configuration");

configCmd
  .command("show")
  .description("Show current configuration")
  .action(() => {
    runConfigShow();
  });

configCmd
  .command("set <key> <value>")
  .description("Set a configuration value")
  .action((key: string, value: string) => {
    runConfigSet(key, value);
  });

program.parse();
