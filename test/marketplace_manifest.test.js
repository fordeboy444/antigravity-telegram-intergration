const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Antigravity marketplace manifest...');

const projectRoot = path.join(__dirname, '..');
const marketplacePath = path.join(projectRoot, '.agents', 'plugins', 'marketplace.json');
const claudePluginMarketplace = path.join(projectRoot, '.claude-plugin', 'marketplace.json');
const claudePluginDir = path.join(projectRoot, '.claude-plugin');

// 1. Verify prohibited Claude Code marketplace locations do not exist
assert.ok(!fs.existsSync(claudePluginMarketplace), 'Prohibited .claude-plugin/marketplace.json should not exist');
assert.ok(!fs.existsSync(claudePluginDir), 'Prohibited .claude-plugin directory should not exist');
console.log('  ✓ No prohibited .claude-plugin directory found');

// 2. Verify marketplace manifest exists at .agents/plugins/marketplace.json and is valid JSON
assert.ok(fs.existsSync(marketplacePath), `Marketplace manifest not found at ${marketplacePath}`);

const raw = fs.readFileSync(marketplacePath, 'utf8');
let manifest;
try {
    manifest = JSON.parse(raw);
} catch (err) {
    assert.fail(`marketplace.json is not valid JSON: ${err.message}`);
}

// 3. Verify manifest name
assert.strictEqual(manifest.name, 'antigravity-telegram', 'Manifest name must be "antigravity-telegram"');
console.log(`  ✓ Manifest name verified: ${manifest.name}`);

// 4. Verify interface display name
assert.ok(
    manifest.interface &&
    typeof manifest.interface.displayName === 'string' &&
    manifest.interface.displayName.trim().length > 0,
    'interface.displayName must exist and be non-empty'
);
console.log(`  ✓ Interface display name verified: ${manifest.interface.displayName}`);

// 5. Verify plugins array and telegram-integration entry
assert.ok(Array.isArray(manifest.plugins) && manifest.plugins.length >= 1, 'plugins must be an array with at least 1 item');

const plugin = manifest.plugins.find(p => p.name === 'telegram-integration');
assert.ok(plugin, 'Must contain a plugin with name "telegram-integration"');
console.log('  ✓ telegram-integration entry found in plugins');

// 6. Verify plugin source directory exists and contains plugin.json
assert.ok(plugin.source, 'Plugin source must be defined');
const pluginRelPath = typeof plugin.source === 'string' ? plugin.source : plugin.source.url;
assert.ok(pluginRelPath, 'Plugin source path/url must be defined');

const resolvedPluginDir = path.resolve(projectRoot, pluginRelPath);
const targetPluginJson = path.join(resolvedPluginDir, 'plugin.json');
assert.ok(fs.existsSync(targetPluginJson), `Referenced plugin.json must exist at ${targetPluginJson}`);
console.log(`  ✓ Plugin source target verified at ${targetPluginJson}`);

console.log('✅ Antigravity marketplace manifest test passed successfully!');
process.exit(0);
