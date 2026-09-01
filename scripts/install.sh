#!/usr/bin/env bash
# ============================================================
# Antigravity Telegram Suite — Setup Script (Linux & macOS)
# ============================================================
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OS="$(uname -s)"

print_header() {
    echo -e "\n${BLUE}${BOLD}══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}${BOLD}  🚀 Antigravity Telegram Suite Setup${NC}"
    echo -e "${BLUE}${BOLD}══════════════════════════════════════════════${NC}\n"
}

print_step() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Helper to update key-value pairs in .env safely
set_env_val() {
    local key="$1"
    local val="$2"
    local env_file="$PROJECT_DIR/.env"
    node -e '
        const fs = require("fs");
        const key = process.argv[1];
        const val = process.argv[2];
        const file = process.argv[3];
        let content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
        const regex = new RegExp("^" + key + "=.*$", "m");
        if (regex.test(content)) {
            content = content.replace(regex, `${key}=${val}`);
        } else {
            content = content.trimEnd() + `\n${key}=${val}\n`;
        }
        fs.writeFileSync(file, content, "utf8");
    ' "$key" "$val" "$env_file"
}

# ---- 1. Check Node.js ----
check_node() {
    if command -v node &>/dev/null; then
        local version
        version=$(node -v | sed 's/v//')
        local major
        major=$(echo "$version" | cut -d. -f1)
        if [ "$major" -ge 18 ]; then
            print_step "Node.js v${version} found"
            return 0
        else
            print_warn "Node.js v${version} is too old (need >= 18)"
        fi
    fi

    echo -e "\n${YELLOW}Node.js >= 18 is required. Install options:${NC}"
    echo "  1) Install via nvm (recommended)"
    echo "  2) Skip (I'll install it manually)"
    read -rp "Choose [1/2]: " choice

    if [ "$choice" = "1" ]; then
        if ! command -v nvm &>/dev/null; then
            echo "Installing nvm..."
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
        fi
        nvm install --lts
        nvm use --lts
        print_step "Node.js installed via nvm"
    else
        print_error "Please install Node.js >= 18 and re-run this script."
        exit 1
    fi
}

# ---- 2. Install npm dependencies ----
install_deps() {
    cd "$PROJECT_DIR"
    echo "Installing npm dependencies..."
    npm install
    print_step "npm dependencies installed"
}

# ---- 3. Configure .env ----
setup_env() {
    local env_file="$PROJECT_DIR/.env"
    local configure=false

    if [ ! -f "$env_file" ]; then
        cp "$PROJECT_DIR/.env.example" "$env_file"
        configure=true
    else
        print_step ".env file already exists"
        read -rp "Would you like to reconfigure .env settings? [y/N]: " reconf
        if [[ "$reconf" =~ ^[Yy]$ ]]; then
            configure=true
        fi
    fi

    if [ "$configure" = true ]; then
        echo ""
        echo -e "${BOLD}Configure your bot (.env):${NC}"

        read -rp "  Telegram Bot Token (from @BotFather): " bot_token
        if [ -n "$bot_token" ]; then
            set_env_val "BOT_TOKEN" "$bot_token"
        fi

        read -rp "  Your Telegram Chat ID (optional, press Enter to skip): " chat_id
        if [ -n "$chat_id" ]; then
            set_env_val "ALLOWED_CHAT_ID" "$chat_id"
        fi

        read -rp "  Default AI Model (press Enter for 'Gemini 3.5 Flash (Medium)'): " default_model
        if [ -n "$default_model" ]; then
            set_env_val "DEFAULT_MODEL" "$default_model"
        fi

        read -rp "  Language [en/tr/zh/ko/de/es/fr] (default: en): " user_lang
        if [ -n "$user_lang" ]; then
            set_env_val "LANGUAGE" "$user_lang"
        fi

        print_step ".env configured successfully"
    fi
}

# ---- 4. Install tg-ctl CLI symlink ----
setup_tg_ctl() {
    local bin_dir="$HOME/.local/bin"
    local target="$PROJECT_DIR/src/tg_ctl.js"
    local symlink="$bin_dir/tg-ctl"

    mkdir -p "$bin_dir"
    chmod +x "$target"

    if [ -L "$symlink" ] || [ -f "$symlink" ]; then
        rm -f "$symlink"
    fi

    ln -s "$target" "$symlink"
    print_step "tg-ctl CLI installed to $symlink"

    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        print_warn "~/.local/bin is not in your PATH. Consider adding 'export PATH=\"\$HOME/.local/bin:\$PATH\"' to your ~/.bashrc or ~/.profile."
    fi
}

# ---- 5. Install Antigravity Plugin ----
setup_plugin() {
    local plugin_source="$PROJECT_DIR/plugins/telegram-integration"
    if [ ! -d "$plugin_source" ]; then
        print_warn "Plugin directory not found at $plugin_source, skipping plugin installation."
        return
    fi

    echo ""
    read -rp "Install Antigravity Plugin for AI Coding Agents? [Y/n]: " install_plugin
    install_plugin=${install_plugin:-Y}
    if [[ "$install_plugin" =~ ^[Yy]$ ]]; then
        echo "Choose plugin target location:"
        echo "  1) Global: ~/.gemini/config/plugins/telegram-integration (Recommended)"
        echo "  2) Workspace: $(dirname "$PROJECT_DIR")/.agents/plugins/telegram-integration"
        echo "  3) Both Global and Workspace"
        read -rp "Selection [1/2/3] (default: 1): " target_choice
        target_choice=${target_choice:-1}

        local global_dir="$HOME/.gemini/config/plugins"
        local workspace_dir="$(dirname "$PROJECT_DIR")/.agents/plugins"

        install_single_plugin() {
            local dest_parent="$1"
            local dest="$dest_parent/telegram-integration"
            mkdir -p "$dest_parent"
            if [ -L "$dest" ] || [ -d "$dest" ] || [ -f "$dest" ]; then
                rm -rf "$dest"
            fi
            ln -s "$plugin_source" "$dest" 2>/dev/null || cp -r "$plugin_source" "$dest"
            print_step "Plugin installed to $dest"
        }

        if [ "$target_choice" = "1" ]; then
            install_single_plugin "$global_dir"
        elif [ "$target_choice" = "2" ]; then
            install_single_plugin "$workspace_dir"
        elif [ "$target_choice" = "3" ]; then
            install_single_plugin "$global_dir"
            install_single_plugin "$workspace_dir"
        else
            print_warn "Invalid selection; defaulting to Global installation"
            install_single_plugin "$global_dir"
        fi
    else
        print_step "Skipped Antigravity Plugin installation"
    fi
}

# ---- 6. Create IDE launcher script ----
setup_launcher() {
    local launcher_dir="$HOME/.local/bin"
    local launcher_path="$launcher_dir/antigravity-launcher.sh"

    if [ "$OS" = "Darwin" ]; then
        # macOS launcher
        mkdir -p "$launcher_dir"
        cat > "$launcher_path" << 'LAUNCHER_EOF'
#!/bin/bash
# Antigravity Launcher for macOS
PORT=${DEBUGGING_PORT:-9333}

cleanup_port() {
    local pids=$(lsof -t -i :"$PORT" 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "[launcher] Cleaning port $PORT: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 0.5
    fi
}

cleanup_port
open -a Antigravity --args --remote-debugging-port=$PORT "$@" &
wait
cleanup_port
LAUNCHER_EOF
        chmod +x "$launcher_path"
        print_step "macOS launcher created at $launcher_path"

    elif [ "$OS" = "Linux" ]; then
        if [ ! -f "$launcher_path" ]; then
            mkdir -p "$launcher_dir"
            cat > "$launcher_path" << 'LAUNCHER_EOF'
#!/bin/bash
# Antigravity Launcher for Linux
PORT=${DEBUGGING_PORT:-9333}

cleanup_port() {
    local pids
    pids=$(lsof -t -i :"$PORT" 2>/dev/null | while read pid; do
        local cmd
        cmd=$(ps -p "$pid" -o comm= 2>/dev/null)
        if [[ "$cmd" != "antigravity" ]]; then
            echo "$pid"
        fi
    done)
    if [ -n "$pids" ]; then
        echo "[launcher] Cleaning port $PORT: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 0.5
    fi
}

cleanup_port
/usr/share/antigravity/antigravity --remote-debugging-port=$PORT "$@" &
AG_PID=$!
wait $AG_PID
cleanup_port
LAUNCHER_EOF
            chmod +x "$launcher_path"
            print_step "Linux launcher created at $launcher_path"
        else
            print_step "Launcher already exists at $launcher_path"
        fi

        # Create desktop shortcut
        local desktop_file="$HOME/.local/share/applications/antigravity-bot.desktop"
        mkdir -p "$(dirname "$desktop_file")"
        cat > "$desktop_file" << EOF
[Desktop Entry]
Name=Antigravity Bot
Comment=Telegram bot for remote IDE control
Exec=bash -c "cd $PROJECT_DIR && npm start"
Icon=utilities-terminal
Terminal=true
Type=Application
Categories=Development;Utility;
EOF
        print_step "Desktop shortcut created"
    fi
}

# ---- 7. Run automated verification tests ----
run_tests() {
    echo ""
    echo -e "${BOLD}Running automated self-tests...${NC}"
    cd "$PROJECT_DIR"
    if npm test; then
        print_step "All automated self-tests passed!"
    else
        print_error "Automated tests failed! Please check output above."
        return 1
    fi
}

# ---- 8. Start Daemon Options ----
setup_daemon() {
    echo ""
    echo -e "${BOLD}Start Daemon Options:${NC}"
    echo "  1) Start now with tg-ctl watchdog (tg-ctl start --watchdog)"
    echo "  2) Start with PM2 for background process management"
    echo "  3) Skip (start manually later)"
    read -rp "Choose daemon start option [1/2/3] (default: 3): " start_choice
    start_choice=${start_choice:-3}

    if [ "$start_choice" = "1" ]; then
        cd "$PROJECT_DIR"
        if [ -x "$HOME/.local/bin/tg-ctl" ]; then
            "$HOME/.local/bin/tg-ctl" start --watchdog
        else
            node src/tg_ctl.js start --watchdog
        fi
        print_step "Bot daemon started with watchdog"
    elif [ "$start_choice" = "2" ]; then
        if ! command -v pm2 &>/dev/null; then
            echo "Installing pm2..."
            npm install -g pm2 || sudo npm install -g pm2 || true
        fi
        cd "$PROJECT_DIR"
        if command -v pm2 &>/dev/null; then
            pm2 start src/index.js --name antigravity-bot
            pm2 save
            pm2 startup 2>/dev/null || true
            print_step "PM2 configured — bot running and will auto-start on reboot"
        else
            print_warn "PM2 installation failed or unavailable. You can run 'npm start' or 'tg-ctl start --watchdog'."
        fi
    else
        print_step "Skipped daemon start. Run manually later with: tg-ctl start --watchdog"
    fi
}

# ---- Main ----
print_header
echo -e "Platform: ${BOLD}${OS}${NC}\n"

check_node
install_deps
setup_env
setup_tg_ctl
setup_plugin
setup_launcher
run_tests
setup_daemon

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ Setup Complete!${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
echo ""
echo "Quick start commands:"
echo "  tg-ctl start --watchdog   # Start daemon with health watchdog"
echo "  tg-ctl status             # Check bot & connection status"
echo "  tg-ctl stop               # Stop daemon"
echo "  npm test                  # Run verification test suite"
echo ""
echo "Make sure Antigravity IDE or Agent is launched with remote debugging:"
echo "  antigravity --remote-debugging-port=9333"
echo ""
