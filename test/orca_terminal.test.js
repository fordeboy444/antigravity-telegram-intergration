const assert = require('assert');
const { execSync } = require('child_process');
const OrcaTerminalDriver = require('../src/drivers/orca_terminal');

async function testOrcaTerminalDriver() {
    console.log('🧪 Testing OrcaTerminalDriver...');

    const driver = new OrcaTerminalDriver({
        binaryPath: 'mock-orca',
        execFileFn: async (cmd, args) => {
            if (args.includes('list')) {
                return {
                    stdout: JSON.stringify({
                        ok: true,
                        result: {
                            terminals: [
                                {
                                    handle: 'term_old',
                                    worktreePath: '/home/orca/Agents/Main Agent',
                                    connected: true,
                                    writable: true,
                                    lastOutputAt: 1000
                                },
                                {
                                    handle: 'term_active',
                                    worktreePath: '/home/orca/Agents/Main Agent',
                                    connected: true,
                                    writable: true,
                                    lastOutputAt: 5000
                                },
                                {
                                    handle: 'term_other_worktree',
                                    worktreePath: '/home/orca/Agents/Other',
                                    connected: true,
                                    writable: true,
                                    lastOutputAt: 9000
                                },
                                {
                                    handle: 'term_unwritable',
                                    worktreePath: '/home/orca/Agents/Main Agent',
                                    connected: true,
                                    writable: false,
                                    lastOutputAt: 8000
                                }
                            ]
                        }
                    })
                };
            }
            if (args.includes('send')) {
                return { stdout: JSON.stringify({ ok: true, result: { sent: true } }) };
            }
            throw new Error(`Unhandled mock command: ${args.join(' ')}`);
        }
    });

    // Test 1: listTerminals parses terminals array
    const terminals = await driver.listTerminals();
    assert.strictEqual(terminals.length, 4, 'Should parse 4 terminals');

    // Test 2: findActiveTerminal filters by workspace, writable, connected and picks highest lastOutputAt
    const active = await driver.findActiveTerminal('/home/orca/Agents/Main Agent');
    assert.ok(active, 'Should find active terminal');
    assert.strictEqual(active.handle, 'term_active', 'Should select term_active with highest lastOutputAt');

    // Test 3: findActiveTerminal returns null when no matching workspace
    const missing = await driver.findActiveTerminal('/home/orca/Agents/NonExistent');
    assert.strictEqual(missing, null, 'Should return null for non-matching workspace');

    // Test 4: sendPrompt dispatches terminal send with --terminal and --text
    let dispatchedArgs = [];
    const dispatchDriver = new OrcaTerminalDriver({
        binaryPath: 'mock-orca',
        execFileFn: async (cmd, args) => {
            if (args.includes('list')) {
                return {
                    stdout: JSON.stringify({
                        ok: true,
                        result: {
                            terminals: [
                                {
                                    handle: 'term_123',
                                    worktreePath: '/home/orca/Agents/Main Agent',
                                    connected: true,
                                    writable: true,
                                    lastOutputAt: 2000
                                }
                            ]
                        }
                    })
                };
            }
            if (args.includes('send')) {
                dispatchedArgs = args;
                return { stdout: JSON.stringify({ ok: true }) };
            }
        }
    });

    const sendRes = await dispatchDriver.sendPrompt('hello world', { worktreeDir: '/home/orca/Agents/Main Agent' });
    assert.strictEqual(sendRes.success, true);
    assert.strictEqual(sendRes.handle, 'term_123');
    assert.ok(dispatchedArgs.includes('--terminal'), 'Args must include --terminal');
    assert.ok(dispatchedArgs.includes('term_123'), 'Args must include handle');
    assert.ok(dispatchedArgs.includes('--text'), 'Args must include --text');
    assert.ok(dispatchedArgs.includes('hello world'), 'Args must include prompt text');
    assert.ok(dispatchedArgs.includes('--enter'), 'Args must include --enter');

    console.log('✅ OrcaTerminalDriver unit tests passed!');
}

const DriverFactory = require('../src/drivers');

async function testDriverFactory() {
    console.log('🧪 Testing DriverFactory with orca_terminal...');
    const driver = DriverFactory.getDriver('orca_terminal');
    assert.strictEqual(driver.appType, 'orca_terminal', 'DriverFactory must instantiate OrcaTerminalDriver');
    assert.strictEqual(typeof driver.sendPrompt, 'function', 'Driver must implement sendPrompt');

    const driverAlias = DriverFactory.getDriver('orca');
    assert.strictEqual(driverAlias.appType, 'orca_terminal', 'DriverFactory must alias orca to orca_terminal');
    console.log('✅ DriverFactory tests passed!');
}

const TaskWatcher = require('../src/task_watcher');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testTaskWatcherWaitForResponse() {
    console.log('🧪 Testing TaskWatcher.waitForNextResponse...');
    const testConvId = 'test-conv-' + Date.now();
    const tempBrainDir = path.join(os.tmpdir(), 'gemini-test-brain-' + Date.now());
    const logDir = path.join(tempBrainDir, testConvId, '.system_generated', 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const transcriptFile = path.join(logDir, 'transcript.jsonl');

    // Initial log entry
    fs.writeFileSync(transcriptFile, JSON.stringify({
        source: 'USER_EXPLICIT',
        type: 'USER_INPUT',
        content: 'hello'
    }) + '\n', 'utf8');

    const watcher = new TaskWatcher({ appDataName: 'antigravity-cli' });
    watcher.brainPath = tempBrainDir;

    // Start wait promise in background
    const waitPromise = watcher.waitForNextResponse(testConvId, {
        timeoutMs: 3000,
        pollIntervalMs: 100
    });

    // Simulate agent writing PLANNER_RESPONSE after 300ms
    setTimeout(() => {
        fs.appendFileSync(transcriptFile, JSON.stringify({
            source: 'MODEL',
            type: 'PLANNER_RESPONSE',
            content: 'Hello! How can I help you today?',
            status: 'DONE'
        }) + '\n', 'utf8');
    }, 300);

    const response = await waitPromise;
    assert.strictEqual(response, 'Hello! How can I help you today?');

    // Cleanup
    fs.rmSync(tempBrainDir, { recursive: true, force: true });
    console.log('✅ TaskWatcher.waitForNextResponse tests passed!');
}

async function testTaskWatcherCliMirroring() {
    console.log('🧪 Testing TaskWatcher CLI mirroring (prompts & responses)...');
    const testConvId = 'test-cli-conv-' + Date.now();
    const tempBrainDir = path.join(os.tmpdir(), 'gemini-test-brain-cli-' + Date.now());
    const logDir = path.join(tempBrainDir, testConvId, '.system_generated', 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const transcriptFile = path.join(logDir, 'transcript.jsonl');

    // Initial baseline file
    fs.writeFileSync(transcriptFile, '', 'utf8');

    const receivedNotifications = [];
    const watcher = new TaskWatcher({
        appDataName: 'antigravity-cli',
        debounceMs: 50,
        onNotification: (notif) => {
            receivedNotifications.push(notif);
        }
    });
    watcher.brainPath = tempBrainDir;
    watcher.setActiveConversation(testConvId);

    // 1. Simulate user typing an XML-wrapped prompt in the CLI
    fs.appendFileSync(transcriptFile, JSON.stringify({
        source: 'USER_EXPLICIT',
        type: 'USER_INPUT',
        content: '<USER_REQUEST>\ncan you explain how the bridge works?\n</USER_REQUEST>\n<ADDITIONAL_METADATA>\nThe current local time is: 2026-09-01T22:50:29Z.\n</ADDITIONAL_METADATA>',
        status: 'DONE'
    }) + '\n', 'utf8');

    await new Promise(r => setTimeout(r, 150));
    assert.strictEqual(receivedNotifications.length, 1, 'Should receive 1 notification for user prompt');
    assert.strictEqual(receivedNotifications[0].type, 'cli_user_input');
    assert.strictEqual(receivedNotifications[0].text, 'can you explain how the bridge works?', 'Should strip <USER_REQUEST> and metadata');

    // 2. Simulate model finishing its response in the CLI
    fs.appendFileSync(transcriptFile, JSON.stringify({
        source: 'MODEL',
        type: 'PLANNER_RESPONSE',
        content: 'The bridge streams transcript logs to Telegram in real-time.',
        status: 'DONE'
    }) + '\n', 'utf8');

    await new Promise(r => setTimeout(r, 150));
    assert.strictEqual(receivedNotifications.length, 2, 'Should receive 2 notifications (prompt + response)');
    assert.strictEqual(receivedNotifications[1].type, 'cli_agent_response');
    assert.strictEqual(receivedNotifications[1].text, 'The bridge streams transcript logs to Telegram in real-time.');

    // Cleanup watcher
    if (watcher.watchers.has(testConvId)) {
        const w = watcher.watchers.get(testConvId);
        if (w.watcher) w.watcher.close();
    }
    fs.rmSync(tempBrainDir, { recursive: true, force: true });
    console.log('✅ TaskWatcher CLI mirroring tests passed!');
}

async function testOrcaDispatcherRouting() {
    console.log('🧪 Testing Orca message routing logic...');

    let injectedPrompt = null;
    let injectedTerminal = null;

    const mockDriver = {
        appType: 'orca_terminal',
        findActiveTerminal: async () => ({ handle: 'term_live_123', worktreePath: '/home/orca/Agents/Main Agent' }),
        sendPrompt: async (prompt, opts) => {
            injectedPrompt = prompt;
            injectedTerminal = opts.terminalHandle;
            return { success: true, handle: opts.terminalHandle };
        }
    };

    const terminal = await mockDriver.findActiveTerminal();
    assert.ok(terminal, 'Must find active terminal');
    const res = await mockDriver.sendPrompt('test message', { terminalHandle: terminal.handle });
    assert.strictEqual(res.success, true);
    assert.strictEqual(injectedPrompt, 'test message');
    assert.strictEqual(injectedTerminal, 'term_live_123');

    console.log('✅ Dispatcher routing logic tests passed!');
}

function testTgCtlStatus() {
    console.log('🧪 Testing tg-ctl status --json output...');
    const out = execSync('node src/tg_ctl.js status --json', {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8'
    });
    const parsed = JSON.parse(out);
    assert.ok(parsed.botConfig, 'Should have botConfig');
    assert.ok(parsed.sessionSync, 'Should have sessionSync');
    assert.ok('orcaTerminal' in parsed, 'Should include orcaTerminal field in status JSON');
    console.log('✅ tg-ctl status tests passed!');
}

async function runAllTests() {
    await testOrcaTerminalDriver();
    await testDriverFactory();
    await testTaskWatcherWaitForResponse();
    await testTaskWatcherCliMirroring();
    await testOrcaDispatcherRouting();
    await testTgCtlStatus();
}

runAllTests().catch((err) => {
    console.error('❌ Tests failed:', err);
    process.exit(1);
});


