---
name: telegram-setup
description: >-
  Use when the user asks to setup or configure the Telegram bot, inspect or update
  bot tokens, set allowed chat IDs, configure default models, run test suites, or says
  "telegram: setup", "setup telegram", "configure telegram bot", "set telegram token", or "tg-ctl config".
---

# Telegram Setup

Use this skill to configure, inspect settings, and test the **Antigravity Telegram Suite**.

> [!NOTE]
> To connect a session once configured, use `telegram-connect`. To inspect live connection status, use `telegram-status`.

## Configuration Commands

### 1. View Current Configuration
Inspect all configured environment variables (tokens are masked by default):
```bash
tg-ctl config
```

### 2. Update Bot Token
Update the Telegram Bot API token obtained from [@BotFather](https://t.me/BotFather):
```bash
tg-ctl config --token <YOUR_TELEGRAM_BOT_TOKEN>
```

### 3. Update Allowed Telegram Chat ID
Set the numeric Telegram User ID or Chat ID authorized to interact with the bot:
```bash
tg-ctl config --chat-id <YOUR_TELEGRAM_CHAT_ID>
```

### 4. Update Default Model
Set the preferred AI model for headless agent processing:
```bash
tg-ctl config --model "Gemini 3.5 Flash (Medium)"
```

### 5. Query Specific Configuration Key
```bash
tg-ctl config --get BOT_TOKEN
tg-ctl config --get ALLOWED_CHAT_ID
```

---

## Configuration Files & Storage

| Configuration | Path |
|---|---|
| Suite Environment | `/home/orca/Agents/Main Agent/antigravity-telegram-suite-main/.env` |
| State & Pinning | `/home/orca/Agents/Main Agent/antigravity-telegram-suite-main/.state.json` |
| Claude Notify Backup Config | `~/.config/claude-notify/config.json` |

---

## Testing & Verification

Run the automated test suite to ensure all drivers, i18n locales, telegraph publishers, and CLI controllers are functional:
```bash
tg-ctl test
```

After updating configuration, apply changes by restarting the daemon:
```bash
tg-ctl restart
```
