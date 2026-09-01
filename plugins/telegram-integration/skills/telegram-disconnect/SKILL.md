---
name: telegram-disconnect
description: >-
  Use when the user asks to disconnect Telegram, stop the Telegram bot daemon,
  shut down the watchdog, or says "telegram: disconnect", "disconnect telegram",
  "stop telegram bot", "stop tg-ctl", or "turn off telegram".
---

# Telegram Disconnect

Use this skill to safely stop and disconnect the **Antigravity Telegram Suite** daemon and its watchdog process.

> [!NOTE]
> To re-connect or sync a session, use `telegram-connect`. To inspect connection status, use `telegram-status`.

## Primary Commands

### 1. Stop / Disconnect Telegram Bot
```bash
tg-ctl disconnect
```
*(Alias: `tg-ctl stop`)*

### 2. Confirm Disconnected Status
```bash
tg-ctl status
```

---

## Behavior Details

- Sends a termination signal to both the Telegram Suite entry script (`src/index.js`) and watchdog supervisor (`src/watchdog.js`).
- Updates local `.state.json` connection status to `disconnected` and clears the stored PID.
- Stops active polling and webhooks so no further Telegram updates or proactive messages are processed.
