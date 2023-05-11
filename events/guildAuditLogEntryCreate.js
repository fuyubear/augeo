const { keyv } = require('../index');
const { AuditLogEvent } = require('discord.js');
const { existsSync, appendFile } = require('fs');
const { unlink } = require('fs').promises;

const { parentLogger } = require('../logger');
const logger = parentLogger.child({ module: 'events-guildAuditLogEntryCreate' });

module.exports = {
    name: 'guildAuditLogEntryCreate',
    async execute(auditLogEntry, guild) {
        if (auditLogEntry.executorId == guild.client.user.id
            || auditLogEntry.action !== AuditLogEvent.ChannelDelete) {
            return;
        }

        const instanceLogPrefix = 'DVC Run ID [' + guild.id + '-' + Date.now() + ']';

        logger.info(instanceLogPrefix + ' Starting DVC processing.');

        const lockFileName = 'dvc-lock-' + guild.id;

        // only 1 event should be processed at any time for DVC
        let acquiredLock = false;
        while (!acquiredLock) {
            await getLock(lockFileName, instanceLogPrefix)
                .then(val => acquiredLock = val)
                .catch(err => logger.error(err));
        }

        const accordionSettings = await getAccordionSettings(guild.id);
        if (!accordionSettings || !accordionSettings.enabled || !accordionSettings.v2) {
            logger.info(instanceLogPrefix + ' Release lock for DVC processing.');

            await unlink(lockFileName).catch(err => logger.error(err));

            logger.info(instanceLogPrefix + ' Ending DVC processing.');

            return;
        }

        if (isAccordionExpandChannel(auditLogEntry.targetId, accordionSettings)) {
            await putBackAccordionExpandCh(auditLogEntry.targetId, accordionSettings, instanceLogPrefix);
        }

        logger.info(instanceLogPrefix + ' Release lock for DVC processing.');

        await unlink(lockFileName).catch(err => logger.error(err));

        logger.info(instanceLogPrefix + ' Ending DVC processing.');

        return;
    },
};

async function putBackAccordionExpandCh(channelId, accordionSettings, instanceLogPrefix) {
    for (const expandChName in accordionSettings.expand) {
        if (accordionSettings.expand[expandChName] === channelId) {
            accordionSettings.expand[expandChName] = 0;
            await saveSettings(accordionSettings);
            logger.info(instanceLogPrefix + ' Removed voice channel ' + expandChName + ' (ID:' + channelId + ')');
        }
    }
}

function isAccordionExpandChannel(channelId, accordionSettings) {
    for (const expandChName in accordionSettings.expand) {
        if (accordionSettings.expand[expandChName] === channelId) {
            return true;
        }
    }
    return false;
}

async function saveSettings(accordionSettings) {
    const VOICE_ACCORDION_AVAILABLE_URL = `voice-accordion/${accordionSettings.guildId}/settings`;
    await keyv.set(VOICE_ACCORDION_AVAILABLE_URL, accordionSettings);
}

async function getAccordionSettings(guildId) {
    let enabled;
    const VOICE_ACCORDION_SETTINGS_KEY_URL = `voice-accordion/${guildId}/settings`;
    await keyv.get(VOICE_ACCORDION_SETTINGS_KEY_URL)
        .then(ret => enabled = ret);
    if (!enabled) {
        return false;
    }
    return enabled;
}

async function getLock(lockName, instanceLogPrefix) {
    if (existsSync(lockName)) {
        logger.info(instanceLogPrefix + ' Waiting 1 second for lock ' + lockName);
        await new Promise(r => setTimeout(r, 1000));
        return false;
    }
    else {
        appendFile(lockName, lockName, function(err) {
            if (err) return err;
        });
        return true;
    }
}
