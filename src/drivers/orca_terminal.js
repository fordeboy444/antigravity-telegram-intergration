const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const BaseDriver = require('./base_driver');

const execFileAsync = promisify(execFile);

class OrcaTerminalDriver extends BaseDriver {
    constructor(options = {}) {
        super('orca_terminal', 'antigravity-cli', null);
        this._customBinary = options.binaryPath || process.env.ORCA_BINARY || null;
        this._execFileFn = options.execFileFn || (async (cmd, args, opts) => {
            return await execFileAsync(cmd, args, { maxBuffer: 10 * 1024 * 1024, ...opts });
        });
    }

    getBinary() {
        if (this._customBinary) return this._customBinary;
        const candidates = [
            'orca-ide',
            '/home/orca/.local/bin/orca-ide',
            'orca',
            '/home/orca/.local/bin/orca'
        ];
        for (const bin of candidates) {
            try {
                const { spawnSync } = require('child_process');
                const res = spawnSync('which', [bin], { encoding: 'utf8' });
                if (res.status === 0 && res.stdout.trim()) {
                    return res.stdout.trim();
                }
            } catch (_) {}
        }
        return 'orca-ide';
    }

    async isAvailable() {
        try {
            const binary = this.getBinary();
            const { stdout } = await this._execFileFn(binary, ['status', '--json'], { timeout: 2000 });
            const data = JSON.parse(stdout);
            return data && (data.ok === true || data.status === 'ok' || data.result !== undefined);
        } catch (_) {
            return false;
        }
    }

    async listTerminals() {
        const binary = this.getBinary();
        try {
            const { stdout } = await this._execFileFn(binary, ['terminal', 'list', '--json'], { timeout: 3000 });
            const data = JSON.parse(stdout);
            if (data && data.result && Array.isArray(data.result.terminals)) {
                return data.result.terminals;
            }
            if (Array.isArray(data.terminals)) {
                return data.terminals;
            }
            return [];
        } catch (err) {
            console.error(`[OrcaTerminalDriver] listTerminals error: ${err.message}`);
            return [];
        }
    }

    async findActiveTerminal(targetWorktree = null, options = {}) {
        const allowFallback = options.allowFallback !== undefined ? options.allowFallback : !targetWorktree;
        const cwd = targetWorktree || process.env.PROJECTS_DIR || process.cwd();
        const normTarget = path.resolve(cwd).toLowerCase();
        const terminals = await this.listTerminals();

        let matching = terminals.filter(t => {
            if (!t.connected || t.writable === false) return false;
            if (!t.worktreePath) return false;
            const normPath = path.resolve(t.worktreePath).toLowerCase();
            return normPath === normTarget || normPath.startsWith(normTarget + '/') || normTarget.startsWith(normPath + '/');
        });

        if (matching.length === 0 && allowFallback) {
            // Fallback to any connected, writable terminal
            matching = terminals.filter(t => t.connected && t.writable !== false);
        }

        if (matching.length === 0) return null;

        matching.sort((a, b) => (b.lastOutputAt || 0) - (a.lastOutputAt || 0));
        return matching[0];
    }

    async sendPrompt(prompt, options = {}) {
        let handle = options.terminalHandle;
        if (!handle) {
            const active = await this.findActiveTerminal(options.worktreeDir);
            if (!active) {
                throw new Error('NO_ACTIVE_TERMINAL');
            }
            handle = active.handle;
        }

        const binary = this.getBinary();
        const args = [
            'terminal',
            'send',
            '--terminal',
            handle,
            '--text',
            prompt,
            '--enter',
            '--json'
        ];

        try {
            await this._execFileFn(binary, args, { timeout: 5000 });
            return { success: true, handle };
        } catch (err) {
            console.error(`[OrcaTerminalDriver] sendPrompt error: ${err.message}`);
            throw err;
        }
    }

    getLocatorsScript() {
        return "";
    }

    getActiveThreadInfoScript() {
        return "(() => ({ name: null, workspace: null, threadId: null }))()";
    }

    getSwitchThreadScript(threadNameStr, targetWsNameStr) {
        return "(() => 'unsupported')()";
    }

    getListAgentThreadsScript() {
        return "(() => [])()";
    }
}

module.exports = OrcaTerminalDriver;
