const CDP = require('chrome-remote-interface');

async function getRawTargets(port = 9334) {
    try {
        return await CDP.List({ port });
    } catch (e) {
        return [];
    }
}

function printResult(testName, passed, errorMsg = '') {
    if (passed) {
        console.log(`✅ ${testName}: PASSED`);
    } else {
        console.log(`❌ ${testName}: FAILED - ${errorMsg}`);
    }
}

module.exports = {
    getRawTargets,
    printResult
};
