const { keyv } = require('../index');
const { ChannelType } = require('discord.js');
const { existsSync, appendFile } = require('fs');
const { unlink } = require('fs').promises;

const { parentLogger } = require('../logger');
const logger = parentLogger.child({ module: 'events-channelDelete' });

module.exports = {
    name: 'channelDelete',
    async execute(channel) {
        if (!channel.type === ChannelType.GuildVoice) {
            return;
        }

        let accordionSettings = await getAccordionSettings(channel.guildId);
        if (!accordionSettings || !accordionSettings.enabled || accordionSettings.v2) {
            return;
        }

        const instanceLogPrefix = 'DVC Run ID [' + channel.guild.id + '-' + Date.now() + ']';

        logger.info(instanceLogPrefix + ' Starting DVC processing.');

        const lockFileName = 'lock-dvc-' + channel.guild.id;

        // only 1 event should be processed at any time for DVC
        let acquiredLock = false;
        while (!acquiredLock) {
            await getLock(lockFileName, instanceLogPrefix)
                .then(val => acquiredLock = val)
                .catch(err => logger.error(err));
        }

        accordionSettings = await getAccordionSettings(channel.guildId);
        if (!accordionSettings || !accordionSettings.enabled || accordionSettings.v2) {
            logger.info(instanceLogPrefix + ' Release lock for DVC processing.');

            await unlink(lockFileName).catch(err => logger.error(err));

            logger.info(instanceLogPrefix + ' Ending DVC processing.');
            return;
        }

        if (isAccordionExpandChannel(channel, accordionSettings)) {
            accordionSettings.expand.push(channel.name);
            logger.info(instanceLogPrefix + ' Removed voice channel ' + channel.name);
            await setSettings(channel.guildId, accordionSettings);
        }

        logger.info(instanceLogPrefix + ' Release lock for DVC processing.');

        await unlink(lockFileName).catch(err => logger.error(err));

        logger.info(instanceLogPrefix + ' Ending DVC processing.');

        return;
    },
};

function isAccordionExpandChannel(channel, accordionSettings) {
    if (!accordionSettings.v2) {
        const chName = channel.name;
        return (accordionSettings.expandList.includes(chName));
    }
    for (const expandChName in accordionSettings.expand) {
        if (accordionSettings.expand[expandChName] === channel.id) {
            return true;
        }
    }
    return false;
}

async function setSettings(guildId, accordionSettings) {
    const VOICE_ACCORDION_AVAILABLE_URL = `voice-accordion/${guildId}/settings`;
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
