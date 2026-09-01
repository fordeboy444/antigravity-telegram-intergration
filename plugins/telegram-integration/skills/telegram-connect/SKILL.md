---
name: telegram-connect
description: >-
  Use when the user asks to connect the current session to Telegram, sync Telegram
  with the active conversation, start or connect the Telegram bot daemon, or says
  "telegram: connect", "connect to telegram", "sync telegram session", or "connect telegram".
---

# Telegram Connect

Use this skill to connect the active agent conversation session to the **Antigravity Telegram Suite** daemon and ensure the bot is running and synchronized.

> [!NOTE]
> For checking connection health, use `telegram-status`. For stopping the bot, use `telegram-disconnect`. For credential and environment configuration, use `telegram-setup`.

## Primary Commands

### 1. Connect Current Session (Recommended)
Automatically detects the active conversation from Brain storage and synchronizes the running bot daemon:
```bash
tg-ctl connect
```
Or explicitly sync to the current session:
```bash
tg-ctl sync --current
```

### 2. Connect to a Specific Conversation ID (Hot Switch)
If you want to immediately switch Telegram to a specific conversation UUID without restarting:
```bash
tg-ctl sync <conversation-id>
# or
tg-ctl connect <conversation-id>
```

### 3. Force Fresh Daemon Reload
If you updated the codebase, changed configurations, or want a clean restart:
```bash
tg-ctl restart
# or
tg-ctl connect --force <conversation-id>
```

### 4. Verify Connection
After connecting, verify the status, active session, and bound Orca terminal:
```bash
tg-ctl status --json
```

---

## How Session Synchronization Works

1. **Auto-Discovery**: `tg-ctl` inspects `~/.gemini/antigravity-cli/brain/` and selects the conversation with the most recent `transcript.jsonl` activity.
2. **Dynamic Hot Rebind**: When `tg-ctl sync` or `tg-ctl connect` runs, `.state.json` is updated immediately. The running daemon watches `.state.json` via inotify and interval polling, hot-rebinding its proactive `TaskWatcher` and target session without terminating.
3. **Watchdog Management**: If the daemon is not running, `tg-ctl connect` starts the daemon with its watchdog supervisor automatically. If it is already running, it binds the session without interruption.

---

## Example Usage

```bash
# Connect and sync current session
tg-ctl connect

# Confirm session is live and connected
tg-ctl status
```
