/**
 * Task Watcher — Monitors IDE transcript.jsonl for unsolicited agent messages.
 * 
 * Detects:
 * 1. Timer/schedule completions (agent proactively sends messages after timer fires)
 * 2. Sub-agent completion notifications
 * 3. Any new MODEL response when bot is NOT actively waiting (waitForAgentResponse not running)
 * 
 * Architecture:
 * - Uses fs.watch on the brain/ directory to detect new transcript writes
 * - Reads only NEW lines (tail-follow approach) to avoid re-processing old content
 * - Only triggers when bot is "idle" (not in an active waitForAgentResponse cycle)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function cleanUserPrompt(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    let text = rawText;

    // If there are <USER_REQUEST> tags, extract only the content inside them
    const userRequestMatches = [...text.matchAll(/<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/gi)];
    if (userRequestMatches.length > 0) {
        text = userRequestMatches.map(m => m[1].trim()).filter(Boolean).join('\n\n');
    } else {
        text = text.replace(/<CONTEXT_SUMMARY>[\s\S]*?<\/CONTEXT_SUMMARY>/gi, '');
        text = text.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, '');
        text = text.replace(/<system_instructions>[\s\S]*?<\/system_instructions>/gi, '');
    }

    // Strip any remaining metadata wrappers
    text = text.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, '');
    text = text.replace(/<CONTEXT_SUMMARY>[\s\S]*?<\/CONTEXT_SUMMARY>/gi, '');

    return text.trim();
}

class TaskWatcher {
    constructor(options = {}) {
        this.appDataName = options.appDataName || 'antigravity-ide';
        this.brainPath = path.join(os.homedir(), '.gemini', this.appDataName, 'brain');
        this.onNotification = options.onNotification || (() => {});
        this.isAgentBusy = false; // set by bot when waitForAgentResponse is active
        this.watchers = new Map(); // conversationId -> { watcher, lastSize, transcriptPath }
        this.activeConversationId = null;
        this.debounceTimer = null;
        this.DEBOUNCE_MS = options.debounceMs !== undefined ? options.debounceMs : 1000;
        this.enabled = true;
    }

    /**
     * Set the active conversation to watch.
     * Cleans up old watcher and starts watching the new conversation's transcript.
     */
    setActiveConversation(conversationId) {
        if (this.activeConversationId === conversationId) return; // Already watching

        // Clean up old watcher
        if (this.activeConversationId && this.watchers.has(this.activeConversationId)) {
            const old = this.watchers.get(this.activeConversationId);
            if (old.watcher) {
                try { old.watcher.close(); } catch (_) {}
            }
            this.watchers.delete(this.activeConversationId);
            console.log(`[TaskWatcher] Stopped watching: ${this.activeConversationId.substring(0, 8)}`);
        }

        this.activeConversationId = conversationId;
        if (!conversationId) return;

        const transcriptPath = path.join(
            this.brainPath, conversationId,
            '.system_generated', 'logs', 'transcript.jsonl'
        );

        if (!fs.existsSync(transcriptPath)) {
            console.log(`[TaskWatcher] Transcript not found for ${conversationId.substring(0, 8)}, searching for most recent...`);
            // Fallback: find the most recently modified transcript.jsonl in brain/
            const fallbackId = this._findMostRecentConversation();
            if (fallbackId && fallbackId !== conversationId) {
                console.log(`[TaskWatcher] Falling back to most recent conversation: ${fallbackId.substring(0, 8)}`);
                this.activeConversationId = null; // Reset so recursive call works
                return this.setActiveConversation(fallbackId);
            }
            return;
        }

        // Record current file size as baseline (don't process existing content)
        const stats = fs.statSync(transcriptPath);
        const lastSize = stats.size;

        try {
            const watcher = fs.watch(transcriptPath, (eventType) => {
                if (eventType === 'change' && !this.isAgentBusy && this.enabled) {
                    this._onFileChange(conversationId, transcriptPath);
                }
            });

            watcher.on('error', (err) => {
                console.error(`[TaskWatcher] Watcher error: ${err.message}`);
            });

            this.watchers.set(conversationId, { watcher, lastSize, transcriptPath });
            console.log(`[TaskWatcher] Watching conversation: ${conversationId.substring(0, 8)} (baseline: ${lastSize} bytes)`);
        } catch (e) {
            console.error('[TaskWatcher] Failed to watch:', e.message);
        }
    }

    /**
     * Mark the bot as busy (actively waiting for agent response).
     * When going from busy→idle, update the baseline to skip content generated during the wait.
     */
    setBusy(busy) {
        const wasBusy = this.isAgentBusy;
        this.isAgentBusy = busy;

        // When going from busy→idle, update the lastSize to current
        // This prevents re-notifying content that was generated during the request/response cycle
        if (wasBusy && !busy && this.activeConversationId) {
            this._lastIdleTime = Date.now(); // Cooldown timer
            this.syncBaseline(this.activeConversationId);
        }
    }

    /**
     * Explicitly synchronize baseline with disk file size.
     * Call this after a completed response cycle to make sure late flushes are skipped.
     */
    syncBaseline(conversationId = null) {
        const convId = conversationId || this.activeConversationId;
        if (!convId) return;
        const entry = this.watchers.get(convId);
        if (entry && fs.existsSync(entry.transcriptPath)) {
            try {
                entry.lastSize = fs.statSync(entry.transcriptPath).size;
                this._lastIdleTime = Date.now();
                console.log(`[TaskWatcher] Baseline synced for ${convId.substring(0, 8)}: ${entry.lastSize} bytes`);
            } catch (_) {}
        }
    }

    /**
     * Toggle or set watcher enabled state.
     */
    toggle(enable = null) {
        if (enable === null) {
            this.enabled = !this.enabled;
        } else {
            this.enabled = !!enable;
        }
        if (this.enabled) {
            this.syncBaseline();
        }
        return this.enabled;
    }

    /**
     * Get watcher status.
     */
    getStatus() {
        return {
            enabled: this.enabled,
            activeConversationId: this.activeConversationId,
            isAgentBusy: this.isAgentBusy,
            watchingCount: this.watchers.size
        };
    }

    /**
     * Handle file change event with debounce.
     * Multiple rapid writes are coalesced into a single read.
     */
    _onFileChange(conversationId, transcriptPath) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this._processNewContent(conversationId, transcriptPath);
        }, this.DEBOUNCE_MS);
    }

    /**
     * Read new content since lastSize and emit notifications for user inputs and model responses.
     */
    _processNewContent(conversationId, transcriptPath) {
        // Double-check we're not busy (could have changed during debounce)
        if (this.isAgentBusy) return;

        // Cooldown: don't trigger within 3s of going idle from a Telegram-managed wait
        if (this._lastIdleTime && (Date.now() - this._lastIdleTime) < 3000) {
            return;
        }

        const entry = this.watchers.get(conversationId);
        if (!entry) return;

        try {
            const stats = fs.statSync(transcriptPath);
            if (stats.size <= entry.lastSize) return; // No new content

            // Read only the new bytes
            const fd = fs.openSync(transcriptPath, 'r');
            const newBytes = stats.size - entry.lastSize;
            const buffer = Buffer.alloc(newBytes);
            fs.readSync(fd, buffer, 0, newBytes, entry.lastSize);
            fs.closeSync(fd);

            entry.lastSize = stats.size;

            const newContent = buffer.toString('utf8');
            const lines = newContent.split('\n').filter(l => l.trim());

            // Parse all new entries
            const userInputs = [];
            const modelResponses = [];
            const modelFeedbackRequests = [];

            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);

                    if (parsed.source === 'USER_EXPLICIT' || parsed.type === 'USER_INPUT') {
                        const content = parsed.content || '';
                        const isAutomatedFeedback = content.includes('The user has approved this document') || 
                                                    content.includes('The user has provided feedback') ||
                                                    content.includes('The user has rejected this document');
                        if (!isAutomatedFeedback) {
                            const cleaned = cleanUserPrompt(content);
                            if (cleaned) {
                                userInputs.push(cleaned);
                            }
                        }
                    }

                    if (
                        parsed.source === 'MODEL' &&
                        parsed.type === 'PLANNER_RESPONSE' &&
                        parsed.content &&
                        parsed.status === 'DONE'
                    ) {
                        modelResponses.push(parsed.content);
                    }

                    if (
                        parsed.source === 'MODEL' &&
                        (parsed.type === 'WRITE_TO_FILE' || parsed.type === 'MULTI_REPLACE_FILE_CONTENT' || parsed.type === 'REPLACE_FILE_CONTENT') &&
                        parsed.status === 'DONE' &&
                        parsed.content &&
                        parsed.content.includes('requested user feedback')
                    ) {
                        modelFeedbackRequests.push(parsed.content);
                    }
                } catch (_) {
                    // Not valid JSON line, skip
                }
            }

            // 1. Forward CLI user prompts
            for (const input of userInputs) {
                console.log(`[TaskWatcher] 👤 CLI user prompt detected (${input.length} chars, conv: ${conversationId.substring(0, 8)})`);
                this.onNotification({
                    conversationId,
                    text: input,
                    type: 'cli_user_input'
                });
            }

            // 2. Forward Feedback Requests
            if (modelFeedbackRequests.length > 0) {
                const feedbackText = modelFeedbackRequests[modelFeedbackRequests.length - 1];
                console.log(`[TaskWatcher] 📬 Feedback request detected, conv: ${conversationId.substring(0, 8)}`);
                this.onNotification({
                    conversationId,
                    text: feedbackText,
                    type: 'agent_proactive_feedback'
                });
            } else if (modelResponses.length > 0) {
                // Use the LAST model response (most complete)
                let finalText = modelResponses[modelResponses.length - 1];

                // Clean up excessive whitespace
                finalText = finalText.replace(/\n{3,}/g, '\n\n').trim();

                if (finalText.length > 0) {
                    console.log(`[TaskWatcher] 🤖 Model response detected (${finalText.length} chars, conv: ${conversationId.substring(0, 8)})`);
                    this.onNotification({
                        conversationId,
                        text: finalText,
                        type: 'cli_agent_response'
                    });
                }
            }
        } catch (e) {
            console.error('[TaskWatcher] Error processing:', e.message);
        }
    }

    /**
     * Find the most recently modified transcript.jsonl across all conversations.
     * Used as fallback when resolved conversation ID doesn't have a transcript.
     */
    _findMostRecentConversation() {
        try {
            if (!fs.existsSync(this.brainPath)) return null;

            let newestId = null;
            let newestMtime = 0;

            const entries = fs.readdirSync(this.brainPath, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                // Skip non-UUID directories
                if (entry.name.length < 30) continue;

                const tPath = path.join(
                    this.brainPath, entry.name,
                    '.system_generated', 'logs', 'transcript.jsonl'
                );

                try {
                    const stats = fs.statSync(tPath);
                    if (stats.mtimeMs > newestMtime) {
                        newestMtime = stats.mtimeMs;
                        newestId = entry.name;
                    }
                } catch (_) {
                    // No transcript in this conversation
                }
            }

            return newestId;
        } catch (e) {
            console.error('[TaskWatcher] Error finding recent conversation:', e.message);
            return null;
        }
    }

    /**
     * Stop all watchers and clean up.
     */
    stop() {
        for (const [id, entry] of this.watchers) {
            if (entry.watcher) {
                try { entry.watcher.close(); } catch (_) {}
            }
        }
        this.watchers.clear();
        clearTimeout(this.debounceTimer);
        this.activeConversationId = null;
        console.log('[TaskWatcher] All watchers stopped.');
    }

    /**
     * Wait for the next completed PLANNER_RESPONSE in a conversation transcript
     * @param {string} conversationId
     * @param {object} [options]
     * @param {number} [options.timeoutMs=120000]
     * @param {number} [options.pollIntervalMs=300]
     * @param {function} [options.onProgress]
     * @returns {Promise<string>}
     */
    waitForNextResponse(conversationId, options = {}) {
        const timeoutMs = options.timeoutMs || 120000;
        const pollIntervalMs = options.pollIntervalMs || 300;
        const onProgress = options.onProgress || (() => {});
        const startTime = Date.now();

        const transcriptPath = path.join(
            this.brainPath, conversationId,
            '.system_generated', 'logs', 'transcript.jsonl'
        );

        let initialSize = 0;
        if (fs.existsSync(transcriptPath)) {
            try {
                initialSize = fs.statSync(transcriptPath).size;
            } catch (_) {}
        }

        return new Promise((resolve, reject) => {
            const timer = setInterval(() => {
                if (Date.now() - startTime > timeoutMs) {
                    clearInterval(timer);
                    return reject(new Error(`Timeout waiting for agent response (${Math.round(timeoutMs / 1000)}s)`));
                }

                onProgress();

                if (!fs.existsSync(transcriptPath)) return;

                try {
                    const stats = fs.statSync(transcriptPath);
                    if (stats.size <= initialSize) return;

                    const newBytes = stats.size - initialSize;
                    const fd = fs.openSync(transcriptPath, 'r');
                    try {
                        const buffer = Buffer.alloc(newBytes);
                        fs.readSync(fd, buffer, 0, newBytes, initialSize);

                        const lines = buffer.toString('utf8').split('\n').filter(l => l.trim());
                        for (const line of lines) {
                            try {
                                const parsed = JSON.parse(line);
                                if (
                                    parsed.source === 'MODEL' &&
                                    parsed.type === 'PLANNER_RESPONSE' &&
                                    parsed.content &&
                                    parsed.status === 'DONE'
                                ) {
                                    clearInterval(timer);
                                    this.syncBaseline(conversationId);
                                    return resolve(parsed.content.trim());
                                }
                            } catch (_) {}
                        }
                    } finally {
                        fs.closeSync(fd);
                    }
                } catch (err) {
                    console.error('[TaskWatcher] Polling error in waitForNextResponse:', err.message);
                }
            }, pollIntervalMs);
        });
    }
}

TaskWatcher.cleanUserPrompt = cleanUserPrompt;
module.exports = TaskWatcher;
