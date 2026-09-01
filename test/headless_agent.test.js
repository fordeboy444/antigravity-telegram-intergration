const assert = require('assert');
const { shouldUseHeadless, getAgyBinary, resetAgySession, isAgySessionActive } = require('../src/headless_agent');

async function run() {
    console.log('🧪 Testing Headless Agent module...');

    const binary = getAgyBinary();
    assert(typeof binary === 'string', 'Should return a string binary path');
    console.log(`✅ Binary resolved: ${binary}`);

    // Since no CDP is running on 9999, shouldUseHeadless should return true
    const headless = await shouldUseHeadless(9999);
    assert.strictEqual(headless, true, 'Should use headless when CDP is unreachable');
    console.log('✅ Fallback to headless confirmed');

    resetAgySession();
    assert.strictEqual(isAgySessionActive(), false, 'Session should be inactive after reset');
    console.log('✅ Session reset verified');

    console.log('✅ All headless agent tests passed!');
}

run().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
