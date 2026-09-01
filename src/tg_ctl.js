#!/usr/bin/env node

/**
 * tg-ctl — Unified Control CLI for Antigravity Telegram Suite
 * 
 * Commands:
 *   tg-ctl status [--json]
 *   tg-ctl start [--watchdog]
 *   tg-ctl stop
 *   tg-ctl restart
 *   tg-ctl sync [<conversationId> | --auto | --current]
 *   tg-ctl config [--token <token>] [--chat-id <id>] [--model <model>] [--get <key>]
 *   tg-ctl test
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const OrcaTerminalDriver = require('./drivers/orca_terminal');

const SUITE_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(SUITE_DIR, '.env');
const STATE_PATH = path.join(SUITE_DIR, '.state.json');
const BRAIN_DIR = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain');

function loadEnv() {
    if (!fs.existsSync(ENV_PATH)) return {};
    const content = fs.readFileSync(ENV_PATH, 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim().replace(/(^["']|["']$)/g, '');
            env[key] = val;
        }
    }
    return env;
}

function saveEnv(env) {
    let content = '';
    if (fs.existsSync(ENV_PATH)) {
        content = fs.readFileSync(ENV_PATH, 'utf8');
    }
    for (const [k, v] of Object.entries(env)) {
        const regex = new RegExp(`^${k}=.*$`, 'm');
        if (regex.test(content)) {
            content = content.replace(regex, `${k}=${v}`);
        } else {
            content += `\n${k}=${v}`;
        }
    }
    fs.writeFileSync(ENV_PATH, content.trim() + '\n', 'utf8');
}

function loadState() {
    if (!fs.existsSync(STATE_PATH)) return { status: 'disconnected', syncMode: 'auto' };
    try {
        return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    } catch (_) {
        return { status: 'disconnected', syncMode: 'auto' };
    }
}

function saveState(state) {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function findMostRecentConversation() {
    const candidateDirs = [
        path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain'),
        path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain'),
        path.join(os.homedir(), '.gemini', 'antigravity', 'brain')
    ];
    let newestId = null;
    let newestMtime = 0;

    for (const brainDir of candidateDirs) {
        if (!fs.existsSync(brainDir)) continue;
        try {
            const entries = fs.readdirSync(brainDir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory() || entry.name.length < 30) continue;
                const dirPath = path.join(brainDir, entry.name);
                const transcriptPath = path.join(dirPath, '.system_generated', 'logs', 'transcript.jsonl');
                const overviewPath = path.join(dirPath, '.system_generated', 'logs', 'overview.txt');
                let mtime = 0;
                try {
                    if (fs.existsSync(transcriptPath)) mtime = fs.statSync(transcriptPath).mtimeMs;
                } catch (_) {}
                if (!mtime) {
                    try {
                        if (fs.existsSync(overviewPath)) mtime = fs.statSync(overviewPath).mtimeMs;
                    } catch (_) {}
                }
                if (!mtime) {
                    try {
                        mtime = fs.statSync(dirPath).mtimeMs;
                    } catch (_) {}
                }
                if (mtime > newestMtime) {
                    newestMtime = mtime;
                    newestId = entry.name;
                }
            }
        } catch (_) {}
    }
    return newestId;
}

function isPidRunning(pid) {
    if (!pid) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return false;
    }
}

function getRunningProcess() {
    try {
        const out = execSync('pgrep -f "node.*antigravity-telegram-suite.*/(src/index.js|src/watchdog.js)"', { encoding: 'utf8' }).trim();
        if (!out) return null;
        const pids = out.split('\n').map(p => parseInt(p, 10)).filter(p => !isNaN(p) && p !== process.pid);
        return pids.length > 0 ? pids[0] : null;
    } catch (_) {
        return null;
    }
}

// ── Command Handlers ────────────────────────────────────────────────────────

async function handleStatus(args) {
    const isJson = args.includes('--json');
    const env = loadEnv();
    const state = loadState();
    const livePid = getRunningProcess();

    const isRunning = livePid !== null;
    const effectiveConvId = state.syncMode === 'pinned' && state.syncedConversationId
        ? state.syncedConversationId
        : (findMostRecentConversation() || state.syncedConversationId || 'None');

    let orcaTerminalInfo = null;
    try {
        const orcaDriver = new OrcaTerminalDriver();
        const activeTerm = await orcaDriver.findActiveTerminal();
        if (activeTerm) {
            orcaTerminalInfo = {
                handle: activeTerm.handle,
                worktreePath: activeTerm.worktreePath,
                connected: activeTerm.connected,
                writable: activeTerm.writable,
                lastOutputAt: activeTerm.lastOutputAt
            };
        }
    } catch (_) {}

    const statusObj = {
        status: isRunning ? 'connected' : 'disconnected',
        pid: livePid || null,
        startedAt: state.startedAt || null,
        botConfig: {
            tokenMasked: env.BOT_TOKEN ? `${env.BOT_TOKEN.substring(0, 8)}...` : 'Not Configured',
            allowedChatId: env.ALLOWED_CHAT_ID || 'Not Configured',
            telegraphEnabled: env.ENABLE_TELEGRAPH === 'true',
            telegraphHost: env.TELEGRAPH_API_HOST || 'api.graph.org',
            defaultModel: env.DEFAULT_MODEL || 'Gemini 3.5 Flash (Medium)'
        },
        sessionSync: {
            mode: state.syncMode || 'auto',
            activeConversationId: effectiveConvId,
            pinnedConversationId: state.syncedConversationId || null
        },
        orcaTerminal: orcaTerminalInfo
    };

    if (isJson) {
        console.log(JSON.stringify(statusObj, null, 2));
        return;
    }

    console.log('🤖 Antigravity Telegram Suite Status');
    console.log('━'.repeat(40));
    console.log(`• Status:               ${isRunning ? '🟢 Connected (Running)' : '🔴 Disconnected (Stopped)'}`);
    if (isRunning) {
        console.log(`• PID:                  ${livePid}`);
    }
    console.log(`• Bot Token:            ${statusObj.botConfig.tokenMasked}`);
    console.log(`• Allowed Chat ID:      ${statusObj.botConfig.allowedChatId}`);
    console.log(`• Telegraph Mirror:     ${statusObj.botConfig.telegraphEnabled ? '🟢 ' + statusObj.botConfig.telegraphHost : '🔴 Disabled'}`);
    console.log(`• Session Sync Mode:    ${statusObj.sessionSync.mode.toUpperCase()}`);
    console.log(`• Active Brain Session: ${effectiveConvId}`);
    if (orcaTerminalInfo) {
        console.log(`• Orca Active Terminal: 🟢 ${orcaTerminalInfo.handle} (${orcaTerminalInfo.worktreePath})`);
    } else {
        console.log(`• Orca Active Terminal: ⚪ None detected`);
    }
    console.log('━'.repeat(40));
}

async function printActiveTerminalHint() {
    try {
        const orcaDriver = new OrcaTerminalDriver();
        const activeTerm = await orcaDriver.findActiveTerminal();
        if (activeTerm) {
            console.log(`🖥️ Active Orca Terminal: ${activeTerm.handle} (${activeTerm.worktreePath})`);
        }
    } catch (_) {}
}

async function handleStart(args) {
    if (args.includes('--force') || args.includes('--restart')) {
        handleStop();
        await new Promise(r => setTimeout(r, 1000));
    }

    const useWatchdog = !args.includes('--no-watchdog');
    const existingPid = getRunningProcess();

    // Determine target session if provided or default to current active session
    let targetSession = null;
    if (args.includes('--current')) {
        targetSession = findMostRecentConversation();
    } else {
        const nonFlagArgs = args.filter(a => !a.startsWith('-'));
        if (nonFlagArgs.length > 0) {
            targetSession = nonFlagArgs[0];
        } else {
            targetSession = findMostRecentConversation();
        }
    }

    const state = loadState();
    if (targetSession) {
        state.syncMode = 'pinned';
        state.syncedConversationId = targetSession;
    }

    if (existingPid) {
        state.status = 'connected';
        state.pid = existingPid;
        saveState(state);
        console.log(`⚡ Antigravity Telegram Suite is running (PID: ${existingPid}).`);
        if (targetSession) {
            console.log(`🔗 Synced Telegram connection to conversation: ${targetSession}`);
        }
        await printActiveTerminalHint();
        return;
    }

    const entryScript = useWatchdog ? 'src/watchdog.js' : 'src/index.js';
    const logPath = path.join(SUITE_DIR, 'daemon.log');
    const outFd = fs.openSync(logPath, 'a');
    const errFd = fs.openSync(logPath, 'a');

    console.log(`🚀 Starting Antigravity Telegram Suite (${useWatchdog ? 'Watchdog Mode' : 'Direct Mode'})...`);

    const child = spawn(process.execPath, [path.join(SUITE_DIR, entryScript)], {
        cwd: SUITE_DIR,
        detached: true,
        stdio: ['ignore', outFd, errFd],
        env: { ...process.env, ...loadEnv() }
    });

    child.unref();

    state.status = 'connected';
    state.pid = child.pid;
    state.startedAt = new Date().toISOString();
    saveState(state);

    // Wait a brief moment to confirm it didn't immediately crash
    setTimeout(() => {
        if (isPidRunning(child.pid)) {
            console.log(`✅ Telegram Suite connected and running! (PID: ${child.pid}, logs: ${logPath})`);
            if (targetSession) {
                console.log(`🔗 Synced Telegram connection to conversation: ${targetSession}`);
            }
        } else {
            console.error(`❌ Process failed to start. Check ${logPath} for details.`);
        }
    }, 1200);
}

function handleStop() {
    console.log('🛑 Stopping Antigravity Telegram Suite...');
    try {
        execSync('pkill -f "node.*antigravity-telegram-suite.*/(src/index.js|src/watchdog.js)"', { stdio: 'ignore' });
    } catch (_) {}

    const state = loadState();
    state.status = 'disconnected';
    state.pid = null;
    saveState(state);

    console.log('✅ Telegram Suite stopped.');
}

async function handleRestart(args) {
    handleStop();
    for (let i = 0; i < 20; i++) {
        if (!getRunningProcess()) break;
        await new Promise(r => setTimeout(r, 100));
    }
    await handleStart(args);
}

async function handleSync(args) {
    const target = args[0];
    const state = loadState();

    if (target === '--auto') {
        state.syncMode = 'auto';
        state.syncedConversationId = null;
        saveState(state);
        const autoId = findMostRecentConversation();
        console.log(`🔄 Session sync set to AUTO. Currently auto-discovered: ${autoId || 'None'}`);
        await printActiveTerminalHint();
        return;
    }

    let convId = target;
    if (!target || target === '--current') {
        convId = findMostRecentConversation();
        if (!convId) {
            console.error('❌ Could not find an active conversation session in brain storage.');
            process.exit(1);
        }
    }

    state.syncMode = 'pinned';
    state.syncedConversationId = convId;
    saveState(state);
    console.log(`📌 Session sync PINNED to conversation: ${convId}`);
    await printActiveTerminalHint();
}

function handleConfig(args) {
    const env = loadEnv();
    if (args.length === 0) {
        console.log('⚙️ Current Configuration:');
        for (const [k, v] of Object.entries(env)) {
            const displayVal = k.includes('TOKEN') || k.includes('SECRET') ? `${v.substring(0, 6)}...` : v;
            console.log(`  ${k}=${displayVal}`);
        }
        return;
    }

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--token' && args[i + 1]) {
            env.BOT_TOKEN = args[++i];
            console.log('✅ BOT_TOKEN updated.');
        } else if (args[i] === '--chat-id' && args[i + 1]) {
            env.ALLOWED_CHAT_ID = args[++i];
            console.log('✅ ALLOWED_CHAT_ID updated.');
        } else if (args[i] === '--model' && args[i + 1]) {
            env.DEFAULT_MODEL = args[++i];
            console.log('✅ DEFAULT_MODEL updated.');
        } else if (args[i] === '--get' && args[i + 1]) {
            const key = args[++i];
            console.log(`${key}=${env[key] || ''}`);
            return;
        }
    }
    saveEnv(env);
}

function handleTest() {
    console.log('🧪 Running Antigravity Telegram Suite Test Suite...');
    try {
        execSync('npm test', { cwd: SUITE_DIR, stdio: 'inherit' });
    } catch (e) {
        console.error('❌ Tests failed.');
        process.exit(1);
    }
}

// ── Main CLI Dispatcher ─────────────────────────────────────────────────────

async function main() {
    const [,, command, ...args] = process.argv;

    switch (command) {
        case 'status':
            await handleStatus(args);
            break;
        case 'start':
        case 'connect':
            await handleStart(args);
            break;
        case 'stop':
        case 'disconnect':
            handleStop();
            break;
        case 'restart':
            await handleRestart(args);
            break;
        case 'sync':
            await handleSync(args);
            break;
        case 'config':
            handleConfig(args);
            break;
        case 'test':
            handleTest();
            break;
        default:
            console.log(`
Usage: tg-ctl <command> [options]

Commands:
  status [--json]                           View bot connection state, PID, config & active session
  connect | start [--watchdog]              Start Telegram Suite daemon in background
  disconnect | stop                         Stop Telegram Suite daemon
  restart                                   Restart Telegram Suite daemon
  sync [<conv-id> | --auto | --current]     Set session sync mode or pin conversation ID
  config [--token <t>] [--chat-id <id>]     View or update .env configuration
  test                                      Run automated test suite
`);
            break;
    }
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
