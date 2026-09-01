const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const { isCdpReachable } = require('./cdp_health');

let conversationSessionActive = false;
let currentAgentModel = null;
let isExecuting = false;

/**
 * Check if the bot should use Headless CLI Agent mode
 * @param {number} [cdpPort=9333]
 * @returns {Promise<boolean>}
 */
async function shouldUseHeadless(cdpPort = 9333) {
    if (process.env.FORCE_HEADLESS === 'true') return true;
    if (process.env.FORCE_CDP === 'true') return false;
    const cdpAlive = await isCdpReachable(cdpPort, 500);
    return !cdpAlive;
}

/**
 * Find agy binary path
 */
function getAgyBinary() {
    if (process.env.AGY_PATH) return process.env.AGY_PATH;
    const candidates = [
        path.join(os.homedir(), '.local', 'bin', 'agy'),
        '/home/orca/.local/bin/agy',
        'agy'
    ];
    for (const p of candidates) {
        try {
            const fs = require('fs');
            if (fs.existsSync(p)) return p;
        } catch (_) {}
    }
    return 'agy';
}

/**
 * Execute a prompt using agy CLI in headless mode
 * @param {string} prompt - The user prompt
 * @param {object} [options]
 * @param {function} [options.onProgress] - Typing heartbeat callback
 * @param {boolean} [options.newSession] - Force start a new conversation
 * @param {string} [options.model] - Model name override
 * @returns {Promise<string>}
 */
function runAgyPrompt(prompt, options = {}) {
    return new Promise((resolve, reject) => {
        if (isExecuting) {
            return reject(new Error('Agent is already processing a request. Please wait...'));
        }

        const binary = getAgyBinary();
        const args = ['--dangerously-skip-permissions'];

        if (!options.newSession && conversationSessionActive) {
            args.push('--continue');
        }

        const model = options.model || currentAgentModel || process.env.DEFAULT_MODEL;
        if (model) {
            args.push(`--model=${model}`);
        }

        args.push(`-p=${prompt}`);

        const cwd = process.env.PROJECTS_DIR || process.cwd();
        isExecuting = true;

        console.log(`[headless_agent] Running agy: ${binary} in ${cwd}`);
        console.log(`[headless_agent] Args: ${args.join(' ')}`);

        const child = spawn(binary, args, {
            cwd,
            env: { ...process.env },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        const progressTimer = setInterval(() => {
            if (options.onProgress) {
                try { options.onProgress(); } catch (_) {}
            }
        }, 3000);

        child.stdout.on('data', (data) => {
            stdout += data.toString('utf8');
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString('utf8');
        });

        child.on('close', (code) => {
            clearInterval(progressTimer);
            isExecuting = false;

            if (code === 0) {
                conversationSessionActive = true;
                const result = stdout.trim() || 'Done.';
                resolve(result);
            } else {
                console.error(`[headless_agent] agy exited with code ${code}: ${stderr}`);
                // If continue failed because no previous session existed, retry once fresh
                if (!options.newSession && conversationSessionActive) {
                    console.log(`[headless_agent] Retrying without --continue...`);
                    conversationSessionActive = false;
                    return runAgyPrompt(prompt, { ...options, newSession: true })
                        .then(resolve)
                        .catch(reject);
                }
                reject(new Error(stderr.trim() || `agy exited with code ${code}`));
            }
        });

        child.on('error', (err) => {
            clearInterval(progressTimer);
            isExecuting = false;
            console.error(`[headless_agent] Process error:`, err);
            reject(err);
        });
    });
}

function resetAgySession() {
    conversationSessionActive = false;
}

function isAgySessionActive() {
    return conversationSessionActive;
}

function setAgyModel(modelName) {
    currentAgentModel = modelName;
}

function getAgyModel() {
    return currentAgentModel || process.env.DEFAULT_MODEL || 'Gemini 3.5 Flash (Medium)';
}

function isAgyExecuting() {
    return isExecuting;
}

module.exports = {
    shouldUseHeadless,
    runAgyPrompt,
    resetAgySession,
    isAgySessionActive,
    setAgyModel,
    getAgyModel,
    isAgyExecuting,
    getAgyBinary
};
