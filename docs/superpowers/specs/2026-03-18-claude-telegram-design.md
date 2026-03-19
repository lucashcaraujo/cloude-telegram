# claude-telegram — Design Spec

## Overview

A cross-platform CLI tool, publishable on npm, that bridges Telegram with the Claude Agent SDK. Users configure a Telegram bot and Claude Code via an interactive wizard, then run the bot as a service. The bot acts as a thin proxy — all conversation logic, file editing, and code execution is handled by the Claude Agent SDK.

## Goals

- **Remote access to Claude Code** via Telegram from anywhere
- **Thin proxy architecture** — bot does routing only, SDK handles all logic
- **Easy onboarding** — interactive CLI wizard for setup
- **Cross-platform** — works on Linux, macOS, and Windows
- **Publishable on npm** — installable via `npm install -g claude-telegram`

## Architecture

```
Telegram User → Telegram API → Bot (proxy) → Claude Agent SDK → File system / Shell
                                   ↕
                          config.json (whitelist, tokens, paths)
```

The bot is stateless regarding conversation logic. The Claude Agent SDK manages context, tools, file editing, and command execution. The bot maintains a `Map<chatId, sessionId>` to route messages to the correct SDK session.

## CLI Commands

### `claude-telegram init`

Interactive wizard that collects:

1. **Telegram bot token** — from BotFather
2. **User's Telegram chat ID** — for the initial whitelist entry
3. **Working directory** — where Claude Code will operate

Saves config to `~/.claude-telegram/config.json` with file permission `600`.

### `claude-telegram start`

Starts the Telegram bot. Loads config, initializes the Claude Agent SDK, and begins polling for messages.

### `claude-telegram config`

- `config show` — prints current configuration
- `config set <key> <value>` — updates a specific config value (e.g., `config set telegram.whitelist 123,456`)

## Configuration File

Location: `~/.claude-telegram/config.json` (uses `os.homedir()` for cross-platform support).

```json
{
  "telegram": {
    "token": "BOT_TOKEN",
    "whitelist": [123456789]
  },
  "claude": {
    "workingDirectory": "/home/user/projects",
    "permissionMode": "acceptEdits",
    "allowedTools": ["Read", "Edit", "Write", "Bash", "Glob", "Grep"]
  }
}
```

## Bot Commands (Telegram)

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with usage instructions |
| `/new` | Start a new conversation (clears session) |
| `/cwd <path>` | Change working directory |

Any non-command text message is forwarded to the Claude Agent SDK.

## Message Flow

1. User sends message in Telegram
2. Bot checks if chat ID is in whitelist — if not, silently ignores
3. Bot sends "typing..." indicator
4. Bot calls `query()` from the Claude Agent SDK with:
   - `prompt`: the user's message
   - `options.cwd`: configured working directory
   - `options.resume`: session ID for this chat (if exists)
   - `options.allowedTools`: from config
   - `options.permissionMode`: from config
5. Bot iterates over the async generator, collecting the full response
6. On `result` message:
   - Sends text response to Telegram (split into 4096-char chunks if needed)
   - If files were created/modified, sends them as Telegram documents
   - Stores `session_id` for future messages from this chat

## Session Management

- One session per Telegram chat ID
- Session map (`chatId → sessionId`) persisted to `~/.claude-telegram/sessions.json` so it survives bot restarts
- The Claude Agent SDK also persists session content to disk automatically (`~/.claude/projects/...`)
- `/new` command clears the session ID for that chat, starting a fresh conversation
- On bot restart, session map is loaded from disk and sessions are resumed via the SDK

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Rate limit (`SDKRateLimitEvent`) | Notify user, wait, retry |
| Budget exceeded (`error_max_budget_usd`) | Notify user, end session |
| Execution error (`error_during_execution`) | Send error message to user |
| Telegram message too long (>4096 chars) | Split into sequential chunks |
| Bot disconnected | Telegraf auto-reconnects via polling |
| Unauthorized user | Silently ignore message |

## Security

- Config file stored with permission `600` (owner read/write only)
- Whitelist checked before any message processing
- Unauthorized messages are silently ignored (no response, no logging of content)

## Cross-Platform Considerations

- Config path: `os.homedir()` + `/.claude-telegram/config.json`
- File paths: `path.join()` throughout
- No CLI binary detection needed — integration is via the SDK npm package

## Project Structure

```
claude-telegram/
├── package.json
├── tsconfig.json
├── bin/
│   └── claude-telegram.ts        # CLI entry point
├── src/
│   ├── cli/
│   │   ├── init.ts               # Setup wizard
│   │   ├── start.ts              # Bot startup
│   │   └── config.ts             # Config commands
│   ├── bot/
│   │   ├── bot.ts                # Telegraf bot setup
│   │   ├── handlers.ts           # Message/command handlers
│   │   └── middleware.ts         # Whitelist middleware
│   ├── claude/
│   │   └── session.ts            # Claude Agent SDK wrapper
│   ├── config/
│   │   └── config.ts             # Config read/write
│   └── utils/
│       └── platform.ts           # Cross-platform helpers
└── README.md
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/claude-agent-sdk` | Claude Code integration |
| `telegraf` | Telegram bot framework |
| `commander` | CLI command parsing |
| `inquirer` | Interactive prompts for wizard |
| `typescript` | Type safety, compiled to JS for npm |

## npm Publishing

- Package name: `claude-telegram`
- `bin` field in package.json: `{ "claude-telegram": "dist/bin/claude-telegram.js" }`
- Install globally: `npm install -g claude-telegram`
- Or run directly: `npx claude-telegram init`

## Response Handling Details

### Text responses
- Collected from the async generator (wait for complete response)
- If response takes >5 seconds, send Telegram "typing" action
- Split into 4096-char chunks for Telegram's message limit
- Sent as sequential messages

### File responses
- When Claude Agent SDK creates or edits files, detect from tool use results in the stream
- Send modified/created files as Telegram documents
- Include a brief message indicating what was changed
