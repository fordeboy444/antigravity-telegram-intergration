<div align="center">

# 🤖 Antigravity Telegram Integration & Plugin

**Bidirectional Remote Control Suite & Agent Plugin for Google Antigravity (IDE, Standalone App, and Headless Agent Sessions).**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org)
[![CI Matrix](https://github.com/fordeboy444/antigravity-telegram-intergration/actions/workflows/ci.yml/badge.svg)](https://github.com/fordeboy444/antigravity-telegram-intergration/actions/workflows/ci.yml)
[![Antigravity Plugin](https://img.shields.io/badge/Antigravity%20Plugin-v1.0.0-purple.svg)](plugins/telegram-integration/)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey.svg)]()
[![Version](https://img.shields.io/badge/Version-3.8.6-orange.svg)](package.json)

🌍 Languages: [English](README.md) | [中文](README.zh.md) | [한국어](README.ko.md) | [Türkçe](README.tr.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md)

</div>

---

## 📢 Community & Updates
- **Updates Channel:** [@agts_updates](https://t.me/agts_updates)
- **Discussion Group:** [@agts_community](https://t.me/agts_community)
- **GitHub Repository:** [fordeboy444/antigravity-telegram-intergration](https://github.com/fordeboy444/antigravity-telegram-intergration)

---

## ✨ Features Overview

| Feature | Category | Description |
|---|---|---|
| 🔌 **Dual-Mode Operation** | Core Engine | Seamlessly operates via **CDP Remote Debugging** for GUI apps (IDE & Standalone) and **Orca Terminal / Brain Driver** for headless container sessions. |
| 🔄 **Live Session Hot-Rebinding** | Session Management | Dynamically detects active Brain conversations (`~/.gemini/antigravity-cli/brain/`) and hot-rebinds live transcript tracking without daemon restarts. |
| 📱 **Rich Telegram UI** | User Experience | Intuitive slash commands, 2-stage inline model selection keyboards, thinking effort tier toggles, and interactive chat managers. |
| 📋 **Plan Notifications & Telegraph** | Visibility | Real-time plan execution updates, task completion alerts, and 128-bit unguessable crypto slug URLs published to Telegraph Instant View. |
| 🧩 **Antigravity Plugin Bundle** | Agent Extension | Bundled native plugin (`plugins/telegram-integration/`) exposing 4 skills (`telegram-connect`, `telegram-disconnect`, `telegram-setup`, `telegram-status`). |
| ⚡ **Unified `tg-ctl` CLI** | CLI Tooling | Single command-line interface to start, stop, restart, sync, configure, and test daemon health and terminal handles. |
| 🚀 **Turbo Multi-Agent Council** | Orchestration | Multi-model pipeline: Claude plans → Gemini codes → Claude reviews → Gemini fixes → Gemini summarizes. |
| 🎯 **Goal Mode & Plan Mode** | Autonomy | Single-session autonomous execution until task completion (`/goal`) and structured pre-implementation planning (`/plan`). |
| ⚡ **MutationObserver Auto-Accept** | Automation | Automatically clicks Run, Accept, Allow, and Continue tool confirmation buttons in the UI. |
| 🔔 **Proactive TaskWatcher** | Monitoring | Detects background agent notifications, subagent completion, and timer events from JSONL logs and forwards them to Telegram. |
| 📸 **Remote Screenshots & Files** | Utilities | Capture IDE screenshots, browse project directories, download artifacts, and upload files directly from chat. |
| 🔐 **Google Multi-Account Manager** | Authentication | Authenticate multiple Google accounts, inject credentials into IDE databases/keychains, and switch active profiles on the fly. |
| 🌐 **7 Built-in Languages** | Localization | Full localization for English, Chinese (Simplified), Korean, Turkish, German, Spanish, and French. |

---

## ⚡ 60-Second Quickstart

### Automated Setup (Recommended)

Clone the repository and run the interactive setup wizard:

```bash
git clone https://github.com/fordeboy444/antigravity-telegram-intergration.git
cd antigravity-telegram-intergration
npm run setup
```

The wizard automatically:
1. Validates Node.js >= 18 (offers automatic LTS installation via `nvm` if missing).
2. Installs all npm dependencies (`npm install`).
3. Prompts for your Telegram Bot Token and Chat ID to configure `.env`.
4. Installs the `tg-ctl` CLI symlink into `~/.local/bin/tg-ctl`.
5. Installs the **Antigravity Plugin** into your Global (`~/.gemini/config/plugins/`) or Workspace directory.
6. Sets up desktop and terminal launchers (Linux & macOS).
7. Executes the automated self-test suite (`npm test`).
8. Launches the bot daemon with the auto-restarting watchdog.

> 💡 **Windows Users:** Run `npm run setup:win` or execute `powershell -ExecutionPolicy Bypass -File scripts\install.ps1`.

---

### Manual Installation

If you prefer configuring manually step-by-step:

```bash
# 1. Clone repository
git clone https://github.com/fordeboy444/antigravity-telegram-intergration.git
cd antigravity-telegram-intergration

# 2. Install dependencies
npm install

# 3. Create .env from template
cp .env.example .env

# 4. Configure credentials in .env
# Open .env and set BOT_TOKEN and ALLOWED_CHAT_ID

# 5. Link tg-ctl CLI globally (optional)
mkdir -p ~/.local/bin
chmod +x src/tg_ctl.js
ln -sf "$(pwd)/src/tg_ctl.js" ~/.local/bin/tg-ctl

# 6. Run test suite
npm test

# 7. Start the daemon with watchdog supervisor
node src/tg_ctl.js start --watchdog
```

---

## 🧩 Antigravity Plugin Integration

The repository includes a ready-to-use **Antigravity Plugin Bundle** located at `plugins/telegram-integration/`. When installed, AI coding agents (such as Antigravity AGY, Claude Code, and Orca harnesses) gain direct native capabilities to inspect, connect, configure, and control the Telegram daemon.

### Plugin Manifest (`plugins/telegram-integration/plugin.json`)

```json
{
  "name": "telegram-integration",
  "description": "Antigravity Telegram Suite: Remote bot control, session sync, status monitoring, and plan notifications directly in Telegram.",
  "version": "1.0.0"
}
```

### Bundled Agent Skills

| Skill | Directory | Triggers & Intent |
|---|---|---|
| **`telegram-connect`** | `skills/telegram-connect/` | Connects current session, auto-discovers Brain storage, hot-rebinds active daemon, or spawns watchdog. Triggers on *"connect to telegram"*, *"sync telegram session"*, *"telegram: connect"*. |
| **`telegram-disconnect`** | `skills/telegram-disconnect/` | Gracefully terminates bot daemon and watchdog process, updates state. Triggers on *"disconnect telegram"*, *"stop telegram bot"*, *"turn off telegram"*. |
| **`telegram-setup`** | `skills/telegram-setup/` | Configures `.env` parameters (Bot Token, Chat ID, Default Model), verifies credentials, runs test matrix. Triggers on *"setup telegram"*, *"configure telegram bot"*, *"set telegram token"*. |
| **`telegram-status`** | `skills/telegram-status/` | Inspects live connection state, PID, synced conversation UUID, active Orca terminal handle, and Telegraph mirror. Triggers on *"check telegram status"*, *"telegram status"*, *"is telegram connected"*. |

### Installing the Plugin

You can install the plugin during `npm run setup` or manually via symlink:

```bash
# Global plugin installation (Available to all workspaces)
mkdir -p ~/.gemini/config/plugins
ln -s "$(pwd)/plugins/telegram-integration" ~/.gemini/config/plugins/telegram-integration

# Workspace-specific plugin installation
mkdir -p .agents/plugins
ln -s "$(pwd)/plugins/telegram-integration" .agents/plugins/telegram-integration
```

---

## 🛠️ `tg-ctl` CLI Reference

The unified `tg-ctl` binary controls all aspects of the Telegram integration:

```text
Usage: tg-ctl <command> [options]
```

### Command Reference Table

| Command | Arguments / Flags | Description | Example |
|---|---|---|---|
| **`status`** | `[--json]` | Shows live connection status, PID, Telegraph mirror, active Brain session, and Orca terminal handle. | `tg-ctl status`<br>`tg-ctl status --json` |
| **`connect`** / **`start`** | `[--watchdog]` `[--force]` `[--current]` `[<conv-id>]` | Starts the Telegram daemon (or connects/binds active session if already running). | `tg-ctl connect`<br>`tg-ctl start --watchdog`<br>`tg-ctl connect --current` |
| **`disconnect`** / **`stop`** | None | Gracefully stops the bot daemon and watchdog processes. | `tg-ctl stop`<br>`tg-ctl disconnect` |
| **`restart`** | `[--watchdog]` | Stops existing daemon instances and starts a fresh process. | `tg-ctl restart` |
| **`sync`** | `<conv-id>` \| `--auto` \| `--current` | Sets session synchronization mode or manually pins a conversation UUID. | `tg-ctl sync --auto`<br>`tg-ctl sync --current`<br>`tg-ctl sync fdac3d96-5f1a-4b47-8fd1` |
| **`config`** | `[--token <t>]` `[--chat-id <id>]` `[--model <m>]` `[--get <key>]` | Inspects or updates `.env` configuration keys. | `tg-ctl config`<br>`tg-ctl config --token 12345:ABC`<br>`tg-ctl config --get DEFAULT_MODEL` |
| **`test`** | None | Executes the full automated unit and integration test matrix. | `tg-ctl test` |

### Example CLI Output

```text
$ tg-ctl status
🤖 Antigravity Telegram Suite Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Status:               🟢 Connected (Running)
• PID:                  18639
• Bot Token:            78945612...
• Allowed Chat ID:      6133410571
• Telegraph Mirror:     🟢 api.graph.org
• Session Sync Mode:    PINNED
• Active Brain Session: fdac3d96-5f1a-4b47-8fd1-576dc6501994
• Orca Active Terminal: 🟢 term_87402f42-e638-4534-8bb2-4b3033684d42 (/home/orca/Agents/Main Agent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ⚙️ Environment Variables Reference

All runtime options are managed via `.env` (copied from `.env.example`):

| Variable | Default Value | Required | Description |
|---|---|:---:|---|
| `BOT_TOKEN` | *None* | **Yes** | HTTP API Bot Token obtained from [@BotFather](https://t.me/BotFather). |
| `ALLOWED_CHAT_ID` | *None* | **Yes** | Authorized Telegram User / Chat ID(s). Comma-separated for multiple users (e.g., `12345678,87654321`). |
| `LANGUAGE` | `en` | No | UI language (`en`, `zh`, `ko`, `tr`, `de`, `es`, `fr`). |
| `DEFAULT_MODEL` | `Gemini 3.5 Flash (Medium)` | No | Default model selected on startup and for new conversations. |
| `QUOTA_DISPLAY_MODELS` | *Common models* | No | Comma-separated list filtering model quotas shown in `/getinfo`. |
| `AGENT_CDP_PORT` | `9333` | No | Chrome DevTools Protocol port for Antigravity Standalone App. |
| `IDE_CDP_PORT` | `9334` | No | Chrome DevTools Protocol port for Antigravity Monaco IDE. |
| `DEBUGGING_PORT` | `9333` | No | Legacy fallback debugging port. |
| `PROJECTS_DIR` | `~/Projects` | No | Root directory containing project workspaces and repositories. |
| `ORCA_WORKSPACE_DIR` | `~/Projects` | No | Active workspace directory for Orca terminal sessions and worktrees. |
| `TELEGRAM_UPLOAD_DIR` | `/tmp/telegram-uploads` | No | Local staging directory for file uploads, screenshots, and diffs. |
| `ANTIGRAVITY_PREFERRED_APP` | `ide` | No | Default active driver target: `ide`, `agent`, or `orca_terminal`. |
| `AUTOACCEPT_DEFAULT` | `true` | No | Automatically click confirmation buttons (Run/Accept/Allow/Continue). |
| `AUTO_MEMORY_CONVENTION` | `false` | No | Injects project memory structure into `AGENT.md` on `/workspace` switch. |
| `ENABLE_TELEGRAPH` | `true` | No | Publish long plans, artifacts, and walkthroughs to Telegraph Instant View. |
| `TELEGRAPH_API_HOST` | `api.graph.org` | No | Telegraph API endpoint mirror (`api.graph.org` or `api.telegra.ph`). |
| `GOOGLE_CLIENT_ID` | *None* | No | Google OAuth 2.0 Client ID for `/login` authentication flow. |
| `GOOGLE_CLIENT_SECRET` | *None* | No | Google OAuth 2.0 Client Secret. |
| `TURBO_PHASE1_MODEL` | `Gemini 3.5 Flash (High)` | No | Model for Turbo Mode Phase 1 (Planning). |
| `TURBO_PHASE1_FALLBACK` | `Claude Opus 4.6 (Thinking)` | No | Fallback model for Phase 1 if quota is exceeded. |
| `TURBO_PHASE2_MODEL` | `Gemini 3.1 Pro (High)` | No | Model for Turbo Mode Phase 2 (Implementation). |
| `TURBO_PHASE3_MODEL` | `Gemini 3.5 Flash (High)` | No | Model for Turbo Mode Phase 3 (Review). |
| `TURBO_PHASE3_FALLBACK` | `Claude Opus 4.6 (Thinking)` | No | Fallback model for Phase 3 review. |
| `TURBO_PHASE4_MODEL` | `Gemini 3.1 Pro (High)` | No | Model for Turbo Mode Phase 4 (Fixes). |
| `TURBO_PHASE5_MODEL` | `Gemini 3.5 Flash (High)` | No | Model for Turbo Mode Phase 5 (Executive Summary). |

---

## 📱 Telegram Bot Commands Reference

### Core Commands

| Command | Description |
|---|---|
| *(any text)* | Injects message directly into active Antigravity chat or terminal session |
| `/latest` | Retrieves the latest agent response as formatted text |
| `/screenshot` | Takes and sends a screenshot of the active IDE window |
| `/status` | Displays system status (IDE/PTY connection, CDP health, active model) |
| `/stop` | Interrupts and stops currently running agent task |
| `/new` | Clears conversation state and opens a fresh chat session |

### AI Model & Workflow Management

| Command | Description |
|---|---|
| `/model` | Opens 2-stage inline model selector (Gemini Flash/Pro, Claude Opus/Sonnet) |
| `/turbo` | Toggles **Turbo Mode** (Multi-Agent Council orchestration) |
| `/goal <task>` | Initiates autonomous **Goal Mode** until task is 100% complete |
| `/plan <task>` | Generates a structured **Implementation Plan** before coding |
| `/schedule_task <prompt>` | Schedules one-time or recurring instructions |
| `/agents [query]` | Interactive chat thread manager (browse recent chats, search, switch sessions) |
| `/quota` | Displays remaining AI model credits and quota consumption bars |

### App, Window & Workspace Control

| Command | Description |
|---|---|
| `/app` | Switches active focus between Antigravity IDE, Standalone App, and Terminal |
| `/start_ide` / `/close_ide` | Remotely launches or closes Antigravity Monaco IDE |
| `/start_ag` / `/close_ag` | Remotely launches or closes Standalone Antigravity Agent |
| `/close` | Closes the currently active Antigravity window |
| `/window` | Switches between multiple open IDE windows |
| `/workspace` | Interactive workspace and repository browser |
| `/restart` | Restarts the bot daemon process |

### Files, Artifacts & Privacy

| Command | Description |
|---|---|
| `/file` | Interactive file tree explorer to browse and download project files |
| `/artifacts` | Lists and downloads generated artifacts and diffs from current thread |
| `/autoaccept` | Toggles DOM MutationObserver auto-approval (on / off / status) |
| `/telegraph` | Toggles Telegraph Instant View publishing (on / off / status / wipe) |
| `/cleartelegraph` | Overwrites published Telegraph pages with redaction notices |
| `/lang` | Switches interface language |
| `/update` | Checks for updates and pulls latest version from git |
| `/version` | Shows suite version and environment information |
| `/menu` | Refreshes the Telegram command menu |

### Google Account Management

| Command | Description |
|---|---|
| `/login` | Starts Google OAuth 2.0 flow to authenticate an account |
| `/logincode <url_or_code>` | Submits OAuth redirect URL/code for headless/remote setups |
| `/accounts` | Lists all saved Google accounts, active status, and subscription tiers |
| `/switchacc <id>` | Injects selected credentials into IDE database/keychain and restarts app |
| `/getinfo <id>` | Fetches detailed account info and renders quota progress bars |
| `/delacc <id>` | Deletes saved authentication tokens from local store |

---

## 🐚 Architecture & Driver Operation

```
                                  ┌────────────────────────┐
                                  │  Telegram User / Phone │
                                  └───────────▲────────────┘
                                              │ Telegram Bot API
                                  ┌───────────▼────────────┐
                                  │ tg-ctl / Bot Daemon    │
                                  │ (Watchdog Supervisor)  │
                                  └─────┬────────────┬─────┘
                                        │            │
            ┌───────────────────────────┘            └───────────────────────────┐
            │ CDP WebSocket (Ports 9333/9334)                                    │ IPC / JSONL / PTY Driver
┌───────────▼────────────┐                                          ┌────────────▼───────────┐
│ Antigravity IDE &      │                                          │ Headless Orca Session  │
│ Standalone Agent App   │                                          │ & Brain Storage Logs   │
│ • DOM MutationObserver │                                          │ • transcript.jsonl     │
│ • AutoAccept Clicker   │                                          │ • Session Hot-Rebind   │
│ • Screenshot Extractor │                                          │ • TaskWatcher Mon      │
└────────────────────────┘                                          └────────────────────────┘
```

### Dual Driver Architecture

1. **CDP Driver (`src/cdp_controller.js`)**: Connects to the Chrome DevTools Protocol endpoint exposed by Electron when running Antigravity IDE or Standalone App with `--remote-debugging-port`. Enables direct DOM input injection, button clicking, and viewport screenshots.
2. **Orca Terminal & Brain Driver (`src/drivers/orca_terminal.js`)**: Connects headless container environments and CLI agents. Automatically monitors `~/.gemini/antigravity-cli/brain/` for active conversation transcripts, watches `.state.json` for hot-rebinding, and bridges live terminal sessions directly to Telegram.

---

## 🚀 Turbo Mode: Multi-Agent Council

Turbo Mode orchestrates a multi-model pipeline where specialized AI models collaborate on complex tasks:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TURBO MODE PIPELINE                              │
│                                                                         │
│  Phase 1: PLANNING        Claude Opus → Architect implementation plan   │
│  Phase 2: CODING          Gemini Pro  → Implement code & unit tests     │
│  Phase 3: REVIEW          Claude Opus → Security, syntax & spec review  │
│  Phase 4: FIX (if needed) Gemini Pro  → Resolve review issues           │
│  Phase 5: SUMMARY         Gemini Pro  → Produce executive user summary  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Enable:** Send `/turbo` → Select **Enable**.
- **Execution:** Simply send your prompt in Telegram. The orchestrator manages model switching, error retries, and fallback tiers automatically while streaming phase updates.

---

## 🧪 Verification & Testing

The suite includes a comprehensive automated test matrix covering drivers, controllers, i18n, and plugin manifests:

```bash
# Run standard test suite (11 test suites)
npm test

# Run smoke tests
npm run test:smoke

# Run full test matrix
npm run test:all

# Validate i18n localization dictionaries
npm run i18n:validate
```

### Continuous Integration (CI)

Every commit and pull request is verified across **Linux (Ubuntu)**, **macOS**, and **Windows** on Node.js **18.x**, **20.x**, and **22.x** via GitHub Actions:
- Workflow file: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository on GitHub: [`fordeboy444/antigravity-telegram-intergration`](https://github.com/fordeboy444/antigravity-telegram-intergration).
2. Create a dedicated feature branch (`git checkout -b feature/my-feature`).
3. Ensure all tests pass (`npm test`).
4. Commit your changes (`git commit -m 'feat: add amazing feature'`).
5. Push to your fork (`git push origin feature/my-feature`).
6. Submit a Pull Request.

---

## 🙏 Acknowledgments & Credits

- **[Emre Türkmen](https://emreturkmen.com)** — Original Creator and Lead Maintainer of Antigravity Telegram Suite.
- **[gtxPrime](https://github.com/gtxPrime)** — Google OAuth multi-account switching, keychain credential injection, and Telegraph Instant View publishing.
- **[ATX-AI-Dev](https://github.com/ATX-AI-Dev)** — Standalone App support, Watchdog agent, and dynamic model fetching.
- **[yvg](https://github.com/yvg/antigravity-telegram-suite)** — Multi-Window support.
- **[achshar](https://github.com/achshar/antigravity-telegram-suite)** — Agent Manager UI locators for thread management.
- **[Interdesigncorp Lab](https://github.com/interdesigncorp-lab/Agents-Council)** — Inspiration for Turbo Mode Multi-Agent Council architecture.
- **[acmavirus/antigravity-telegram-control](https://github.com/acmavirus/antigravity-telegram-control)** — Foundation open-source Telegram integration.
- **[yazanbaker94/AntiGravity-AutoAccept](https://github.com/yazanbaker94/AntiGravity-AutoAccept)** — DOM MutationObserver pattern for auto-accept actions.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<div align="center">
Made with ❤️ for remote developers and autonomous AI agents.
</div>
