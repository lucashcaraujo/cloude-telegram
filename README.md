# tgcc — Telegram + Claude Code

Control **Claude Code** from anywhere using **Telegram**. Edit files, run commands, manage projects — all from your phone.

```
You (Telegram) → tgcc (thin proxy) → Claude Code → Your machine
```

tgcc is a lightweight bridge between Telegram and the [Claude Agent SDK](https://docs.anthropic.com/en/docs/claude-code). The bot handles zero logic — Claude Code does all the thinking, coding, and file management. You just chat.

---

## Why tgcc?

- **Code from anywhere** — Review PRs from the couch. Fix bugs from the bus. Deploy from the beach.
- **Full Claude Code power** — File editing, terminal commands, codebase navigation, multi-turn conversations. Everything the CLI can do, now on Telegram.
- **Zero config AI** — No API keys to manage. If Claude Code works on your machine, tgcc works too.
- **Secure by default** — Whitelist-based auth. Only verified users can interact with the bot.
- **Dead simple setup** — One command. Paste a token. Send a code. Done.

---

## Demo

```
You:  List all TODO comments in the project
Bot:  ⏳ Processing...
Bot:  Found 3 TODOs across 2 files:
      - src/api.ts:42 — TODO: add rate limiting
      - src/api.ts:89 — TODO: handle timeout errors
      - src/db.ts:15 — TODO: add connection pooling

You:  Fix the rate limiting one
Bot:  ⏳ Processing...
Bot:  Done. Added rate limiting middleware using express-rate-limit.
      Modified: src/api.ts, package.json
Bot:  📎 src/api.ts
```

---

## Quick Start

### 1. Install

```bash
npm install -g @lucashca/tgcc
```

### 2. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the bot token

### 3. Setup

```bash
tgcc init
```

The wizard will:
- Ask for your **bot token**
- Ask for your **working directory**
- Generate a **verification code** — send it to your bot on Telegram to link your account
- **Start the bot** automatically

That's it. Start chatting with Claude Code on Telegram.

---

## Usage

### Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Show welcome message |
| `/new` | Start a fresh conversation |
| `/cwd /path/to/project` | Change working directory |

Any other message goes straight to Claude Code.

### CLI Commands

```bash
tgcc init              # Setup wizard
tgcc start             # Start the bot
tgcc start --debug     # Start with verbose logging
tgcc reset             # Delete config and re-run setup
tgcc config show       # Show current config
tgcc config set <key> <value>  # Update a config value
```

### Examples

```bash
# Add another user to the whitelist
tgcc config set telegram.whitelist 123456789,987654321

# Change working directory
tgcc config set claude.workingDirectory /home/user/my-project

# Change permission mode
tgcc config set claude.permissionMode bypassPermissions
```

---

## Features

### Session Persistence

Each chat gets its own Claude Code session. Context is preserved between messages — ask follow-up questions, iterate on code, debug across multiple turns. Sessions survive bot restarts.

### File Sharing

When Claude Code creates or edits files, tgcc sends them as Telegram documents. Review diffs, download generated code, all without leaving the chat.

### Processing Indicator

A visible "⏳ Processing..." message appears while Claude Code works, so you always know the bot is thinking. It disappears when the response arrives.

### Long-Running Tasks

tgcc supports requests that take up to **10 minutes** — enough for complex refactors, test runs, or codebase analysis. The bot stays responsive throughout.

### SNI Bypass

Some networks block Telegram at the TLS/SNI level. tgcc automatically detects this and falls back to an IP-based connection. No VPN needed.

### Error Recovery

The bot catches errors gracefully and keeps running. No more crashes from timeouts or unexpected responses.

---

## Configuration

Config lives at `~/.claude-telegram/config.json`:

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

| Key | Description | Default |
|-----|-------------|---------|
| `telegram.token` | Bot token from BotFather | — |
| `telegram.whitelist` | Allowed Telegram chat IDs | Set during init |
| `claude.workingDirectory` | Where Claude Code operates | Set during init |
| `claude.permissionMode` | `default`, `acceptEdits`, or `bypassPermissions` | `acceptEdits` |
| `claude.allowedTools` | Tools Claude Code can use | All standard tools |

---

## Security

- **Whitelist auth** — Only verified chat IDs can use the bot
- **Verification flow** — New users must enter a code shown in the terminal
- **Local only** — The bot runs on your machine. No third-party servers.
- **Config protection** — Config file created with `600` permissions (owner-only)
- **No data storage** — tgcc stores nothing. Conversations live in Claude Code's session system.

---

## Requirements

- [Node.js](https://nodejs.org/) >= 18
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- A Telegram bot token ([create one here](https://t.me/BotFather))

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Telegram   │────▶│  tgcc (bot)  │────▶│ Claude Agent SDK │
│   (phone)    │◀────│  thin proxy  │◀────│   (full agent)   │
└──────────────┘     └──────────────┘     └──────────────────┘
                            │
                     ~/.claude-telegram/
                       config.json
                       sessions.json
```

tgcc is intentionally minimal. It does three things:
1. Receives messages from Telegram
2. Forwards them to the Claude Agent SDK
3. Sends responses back

All intelligence, context management, file editing, and code execution is handled by Claude Code.

---

## Troubleshooting

**Bot not responding?**
- Run `tgcc start --debug` to see detailed logs
- Check that your chat ID is in the whitelist: `tgcc config show`

**Connection timeout?**
- tgcc auto-detects SNI blocks and falls back to IP-based connection
- If issues persist, check your network/firewall settings

**"Permission denied" errors?**
- Adjust the permission mode: `tgcc config set claude.permissionMode bypassPermissions`

---

## Contributing

This is an open-source project. PRs and issues are welcome.

1. Clone: `git clone https://github.com/lucashcaraujo/cloude-telegram.git`
2. Install: `npm install`
3. Build: `npm run build`
4. Run locally: `npm run local -- start --debug`

---

## License

MIT

---

Built with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Telegraf](https://telegraf.js.org/).
