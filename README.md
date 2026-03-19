# telegram-claude-code

Control [Claude Code](https://docs.anthropic.com/en/docs/claude-code) remotely via Telegram. Send messages from anywhere and let Claude Code edit files, run commands, and manage your projects — all through a Telegram bot.

## How it works

```
You (Telegram) → Bot (thin proxy) → Claude Agent SDK → Your machine
```

The bot is a **thin proxy** — it just routes messages between Telegram and the Claude Agent SDK. All the heavy lifting (conversation context, file editing, code execution) is handled by Claude Code itself.

## Features

- **Remote Claude Code access** — interact with Claude Code from your phone or any device with Telegram
- **Session persistence** — conversations are maintained between messages and survive bot restarts
- **File sharing** — files created or edited by Claude Code are sent as Telegram documents
- **Whitelist auth** — only authorized Telegram users can interact with the bot
- **Cross-platform** — works on Linux, macOS, and Windows
- **Simple CLI** — interactive setup wizard, one command to start

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated (`ANTHROPIC_API_KEY` set)
- A Telegram bot token (create one via [@BotFather](https://t.me/BotFather))
- Your Telegram chat ID (get it from [@userinfobot](https://t.me/userinfobot))

## Installation

```bash
npm install -g telegram-claude-code
```

Or run directly with npx:

```bash
npx telegram-claude-code init
```

## Quick Start

### 1. Setup

```bash
telegram-claude-code init
```

The wizard will ask for:
- **Telegram bot token** — from BotFather
- **Your chat ID** — who can use the bot
- **Working directory** — where Claude Code will operate

### 2. Start the bot

```bash
telegram-claude-code start
```

### 3. Chat

Open your bot on Telegram and start sending messages. Claude Code will respond just like it does in the terminal.

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Show welcome message and usage info |
| `/new` | Start a new conversation (clear session) |
| `/cwd <path>` | Change the working directory |

Any other text message is sent directly to Claude Code.

## CLI Commands

```bash
# Interactive setup
telegram-claude-code init

# Start the bot
telegram-claude-code start

# Show current config
telegram-claude-code config show

# Update a config value
telegram-claude-code config set telegram.whitelist 123456789,987654321
telegram-claude-code config set claude.workingDirectory /path/to/project
```

## Configuration

Config is stored at `~/.telegram-claude-code/config.json`:

```json
{
  "telegram": {
    "token": "YOUR_BOT_TOKEN",
    "whitelist": [123456789]
  },
  "claude": {
    "workingDirectory": "/home/user/projects",
    "permissionMode": "acceptEdits",
    "allowedTools": ["Read", "Edit", "Write", "Bash", "Glob", "Grep"]
  }
}
```

### Options

| Key | Description | Default |
|-----|-------------|---------|
| `telegram.token` | Telegram bot token | — |
| `telegram.whitelist` | Array of allowed chat IDs | — |
| `claude.workingDirectory` | Directory Claude Code operates in | `cwd` |
| `claude.permissionMode` | Permission mode (`default`, `acceptEdits`, `bypassPermissions`) | `acceptEdits` |
| `claude.allowedTools` | Tools Claude Code can use | `Read, Edit, Write, Bash, Glob, Grep` |

## Security

- Config file is created with `600` permissions (owner read/write only)
- Only whitelisted chat IDs can interact with the bot
- Messages from unauthorized users are silently ignored
- The bot runs locally on your machine — no data is sent to third-party servers (only Telegram API and Anthropic API)

## How Sessions Work

Each Telegram chat gets its own Claude Code session. The conversation context is maintained between messages, so you can have multi-turn interactions just like in the terminal. Sessions persist across bot restarts.

Use `/new` to start a fresh conversation when you want to change topics.

## License

MIT
