---
name: telegram-status
description: >-
  Use when the user asks for Telegram bot status, connection state, synced
  conversation session, active Orca terminal, or says "telegram: status",
  "check telegram status", "telegram bot status", "is telegram connected", or "tg-ctl status".
---

# Telegram Status

Use this skill to inspect the real-time operational status, active session synchronization, and configuration details of the **Antigravity Telegram Suite** daemon.

> [!NOTE]
> For connecting to an active session, use `telegram-connect`. For stopping the bot, use `telegram-disconnect`. For credential and environment configuration, use `telegram-setup`.

## Quick Reference Commands

| Goal | Command |
|---|---|
| Human-readable status overview | `tg-ctl status` |
| Machine-readable JSON output (for agent inspection) | `tg-ctl status --json` |

---

## Output Fields Explained

- **Status**: Live state (`🟢 Connected (Running)` or `🔴 Disconnected (Stopped)`).
- **PID**: Process identifier of the active daemon instance.
- **Bot Token**: Masked Telegram bot token showing the configured API credential.
- **Allowed Chat ID**: Telegram user/chat ID authorized to send commands and receive alerts.
- **Telegraph Mirror**: Host and status of Telegraph publishing integration (`api.graph.org`).
- **Session Sync Mode**: `PINNED` (locked to a specific conversation UUID) or `AUTO` (tracks newest activity).
- **Active Brain Session**: The UUID of the conversation currently bound to Telegram.
- **Orca Active Terminal**: The detected Orca terminal handle (e.g. `term_...`) and associated worktree path.

---

## Verification Pattern

```bash
# Get JSON status payload
tg-ctl status --json
```

*(Illustrative sample output — run `tg-ctl status --json` for live state):*
```json
{
  "status": "connected",
  "pid": 12345,
  "startedAt": "2026-09-01T12:00:00.000Z",
  "botConfig": {
    "tokenMasked": "85299898...",
    "allowedChatId": "6133410571",
    "telegraphEnabled": true,
    "telegraphHost": "api.graph.org",
    "defaultModel": "Gemini 3.5 Flash (Medium)"
  },
  "sessionSync": {
    "mode": "pinned",
    "activeConversationId": "<CONVERSATION_UUID>",
    "pinnedConversationId": "<CONVERSATION_UUID>"
  },
  "orcaTerminal": {
    "handle": "term_<TERMINAL_UUID>",
    "worktreePath": "/home/orca/Agents/Main Agent",
    "connected": true,
    "writable": true
  }
}
```
