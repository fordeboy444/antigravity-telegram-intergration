const IDEDriver = require('./ide_driver');
const StandaloneDriver = require('./standalone_driver');
const OrcaTerminalDriver = require('./orca_terminal');
const { spawnSync } = require('child_process');

class DriverFactory {
    static isOrcaEnvironment() {
        if (process.env.FORCE_ORCA === 'true') return true;
        if (process.env.FORCE_CDP === 'true') return false;
        try {
            const res = spawnSync('which', ['orca-ide'], { encoding: 'utf8' });
            if (res.status === 0 && res.stdout.trim()) return true;
            const resOrca = spawnSync('which', ['orca'], { encoding: 'utf8' });
            return resOrca.status === 0 && Boolean(resOrca.stdout.trim());
        } catch (_) {
            return false;
        }
    }

    static getDriver(appType = null) {
        if (!appType) {
            appType = (process.env.ANTIGRAVITY_PREFERRED_APP || '').toLowerCase();
            if (!appType && DriverFactory.isOrcaEnvironment()) {
                appType = 'orca_terminal';
            } else if (!appType) {
                appType = 'agent';
            }
        }
        if (appType === 'orca_terminal' || appType === 'orca') {
            return new OrcaTerminalDriver();
        }
        if (appType === 'ide') {
            return new IDEDriver();
        }
        return new StandaloneDriver();
    }
}

module.exports = DriverFactory;
