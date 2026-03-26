import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

interface HealthCheckResult {
  ok: boolean;
  checks: {
    name: string;
    status: "pass" | "fail" | "warn";
    message: string;
  }[];
}

function checkClaudeCLI(): { status: "pass" | "fail"; message: string } {
  try {
    const version = execSync("claude --version", {
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return { status: "pass", message: `Claude Code CLI found (${version})` };
  } catch {
    // Check common install locations
    const commonPaths = [
      "/usr/local/bin/claude",
      "/opt/homebrew/bin/claude",
      path.join(os.homedir(), ".npm-global/bin/claude"),
      path.join(os.homedir(), ".nvm/versions/node"),
    ];

    const found = commonPaths.find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });

    if (found) {
      return {
        status: "fail",
        message:
          `Claude Code CLI found at ${found} but not in PATH.\n` +
          `  Add it to your PATH or run: export PATH="${path.dirname(found)}:$PATH"`,
      };
    }

    return {
      status: "fail",
      message:
        "Claude Code CLI not found.\n" +
        "  Install it with: npm install -g @anthropic-ai/claude-code",
    };
  }
}

function checkAuth(): { status: "pass" | "fail" | "warn"; message: string } {
  // Check if ANTHROPIC_API_KEY is set
  if (process.env.ANTHROPIC_API_KEY) {
    return { status: "pass", message: "ANTHROPIC_API_KEY is set" };
  }

  // Check if logged in via `claude login` — credentials stored in ~/.claude/
  const credentialsPath = path.join(os.homedir(), ".claude", ".credentials.json");
  if (fs.existsSync(credentialsPath)) {
    try {
      const content = fs.readFileSync(credentialsPath, "utf-8");
      const creds = JSON.parse(content);
      if (creds && (creds.oauthAccount || creds.claudeAiOauth)) {
        return { status: "pass", message: "Authenticated via claude login" };
      }
    } catch {
      // ignore parse errors
    }
  }

  // Check alternative credential locations
  const configDir = path.join(os.homedir(), ".claude");
  if (fs.existsSync(configDir)) {
    try {
      const files = fs.readdirSync(configDir);
      const hasAuth = files.some(
        (f) => f.includes("credentials") || f.includes("auth") || f.includes("oauth")
      );
      if (hasAuth) {
        return { status: "warn", message: "Auth files found in ~/.claude/ but could not verify. Try running: claude login" };
      }
    } catch {
      // ignore
    }
  }

  return {
    status: "fail",
    message:
      "No authentication found.\n" +
      "  Option 1: Run 'claude login' to authenticate with your Anthropic account\n" +
      "  Option 2: Set ANTHROPIC_API_KEY environment variable",
  };
}

function checkWorkingDirectory(dir: string): { status: "pass" | "fail"; message: string } {
  if (!fs.existsSync(dir)) {
    return {
      status: "fail",
      message: `Working directory does not exist: ${dir}\n  Run: tgcc config set claude.workingDirectory /valid/path`,
    };
  }

  try {
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
    return { status: "pass", message: `Working directory OK (${dir})` };
  } catch {
    return {
      status: "fail",
      message: `No read/write permission on: ${dir}`,
    };
  }
}

function checkNodeVersion(): { status: "pass" | "warn"; message: string } {
  const version = process.versions.node;
  const major = parseInt(version.split(".")[0], 10);
  if (major < 18) {
    return {
      status: "warn",
      message: `Node.js ${version} detected. Version 18+ is recommended.`,
    };
  }
  return { status: "pass", message: `Node.js ${version}` };
}

export function runHealthCheck(workingDirectory: string): HealthCheckResult {
  const checks = [
    { name: "Node.js", ...checkNodeVersion() },
    { name: "Claude Code CLI", ...checkClaudeCLI() },
    { name: "Authentication", ...checkAuth() },
    { name: "Working Directory", ...checkWorkingDirectory(workingDirectory) },
  ];

  const ok = checks.every((c) => c.status !== "fail");
  return { ok, checks };
}

export function printHealthCheck(result: HealthCheckResult): void {
  console.log("\n  Health Check\n");

  for (const check of result.checks) {
    const icon =
      check.status === "pass" ? "  ✅" :
      check.status === "warn" ? "  ⚠️ " :
      "  ❌";
    console.log(`${icon} ${check.name}: ${check.message}`);
  }

  console.log("");

  if (!result.ok) {
    console.log("  ❌ Some checks failed. Fix the issues above before starting the bot.\n");
  }
}
