const { keyv } = require('../index');
const { AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'threadUpdate',
    async execute(oldThread, newThread) {
        const settings = await getSettings(oldThread, newThread);
        if (!settings || !settings.flag) {
            return;
        }

        if (newThread.archived && !(oldThread.archived)) {
            // sleep(10)
            await new Promise(r => setTimeout(r, 10000));

            // fetch audit logs where a thread was updated
            let logs;
            await oldThread.guild.fetchAuditLogs().then(ret => logs = ret);
            logs = logs.entries.filter(log => log.action === AuditLogEvent.ThreadUpdate);

            const logIter = logs.entries();
            while (true) {
                const next = logIter.next();
                if (next.done) {
                    break;
                }

                const log = next.value[1];
                if (log.createdAt.getTime() < Date.now() - 20000) {
                    continue;
                }
                if (log.target.id === oldThread.id) {
                    // thread was archived manually
                    return;
                }
            }

            await newThread.setArchived(false).catch(console.error);
        }

        return;
    },
};

async function getSettings(oldState, newState) {
    let guildId;
    if (oldState.id) {
        guildId = oldState.guildId;
    }
    else if (newState.id) {
        guildId = newState.guildId;
    }
    else {
        return false;
    }

    let enabled;
    const SETTINGS_URL = `thread-persist/${guildId}/settings`;
    await keyv.get(SETTINGS_URL)
        .then(ret => enabled = ret);
    if (!enabled) {
        return false;
    }
    return enabled;
}