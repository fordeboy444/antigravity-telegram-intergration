const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Antigravity plugin manifest & bundle...');

const pluginRoot = path.join(__dirname, '..', 'plugins', 'telegram-integration');
const manifestPath = path.join(pluginRoot, 'plugin.json');

// 1. Verify plugin manifest exists and is valid JSON
assert.ok(fs.existsSync(manifestPath), `Manifest not found at ${manifestPath}`);

const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
let manifest;
try {
    manifest = JSON.parse(manifestRaw);
} catch (err) {
    assert.fail(`plugin.json is not valid JSON: ${err.message}`);
}

assert.strictEqual(manifest.name, 'telegram-integration', 'Manifest name must be "telegram-integration"');
assert.ok(manifest.version, 'Manifest must specify a version');
assert.strictEqual(typeof manifest.description, 'string', 'Manifest description must be a string');
assert.ok(manifest.description.trim().length > 0, 'Manifest description must not be empty');

console.log(`  ✓ Manifest valid: ${manifest.name} v${manifest.version}`);

// 2. Verify bundled skills
const expectedSkills = [
    'telegram-connect',
    'telegram-disconnect',
    'telegram-setup',
    'telegram-status'
];

const skillsDir = path.join(pluginRoot, 'skills');
assert.ok(fs.existsSync(skillsDir), `Skills directory not found at ${skillsDir}`);

for (const skill of expectedSkills) {
    const skillPath = path.join(skillsDir, skill, 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), `SKILL.md missing for ${skill} at ${skillPath}`);

    const content = fs.readFileSync(skillPath, 'utf8');
    assert.ok(content.length > 0, `SKILL.md for ${skill} is empty`);

    // Verify YAML frontmatter
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(frontmatterMatch, `Frontmatter missing or malformed in ${skillPath}`);

    const frontmatter = frontmatterMatch[1];
    const nameMatch = frontmatter.match(/name:\s*([^\n\r]+)/);
    assert.ok(nameMatch, `name field missing in frontmatter of ${skillPath}`);
    assert.strictEqual(nameMatch[1].trim(), skill, `name field in ${skillPath} does not match directory name`);

    const hasDescription = /description:\s*([^\n\r]+)/.test(frontmatter);
    assert.ok(hasDescription, `description field missing in frontmatter of ${skillPath}`);

    console.log(`  ✓ Skill verified: ${skill}`);
}

// 3. Verify no prohibited files (rules/, AGENTS.md)
const prohibitedPaths = [
    path.join(pluginRoot, 'rules'),
    path.join(pluginRoot, 'AGENTS.md')
];

for (const prohibited of prohibitedPaths) {
    assert.ok(!fs.existsSync(prohibited), `Prohibited file/directory exists in plugin: ${prohibited}`);
}

console.log('✅ Plugin manifest & bundle tests passed successfully!');
