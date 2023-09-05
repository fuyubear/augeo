const { keyv } = require('../index');
const { ChannelType } = require('discord.js');
const { existsSync, appendFile } = require('fs');
const { unlink } = require('fs').promises;

const { parentLogger } = require('../logger');
const logger = parentLogger.child({ module: 'events-channelUpdate' });

module.exports = {
    name: 'channelUpdate',
    async execute(oldChannel, newChannel) {
        // For an updated channel to be a dynamically generated voice channel,
        // it must be:
        //              1. A guild voice channel
        //              2. A channel in the same guild
        //              3. The channel is/was in a category channel
        // And to proceed on to check this channel, it must have a different parent (category)
        // channel, or no parent (category) channel at all.
        if (!oldChannel.type === ChannelType.GuildVoice
            || !newChannel.type === ChannelType.GuildVoice
            || oldChannel.guildId !== newChannel.guildId
            || !oldChannel.parent
            || (newChannel.parent && oldChannel.parentId === newChannel.parentId)) {
            return;
        }

        const instanceLogPrefix = 'DVC Run ID [' + oldChannel.guild.id + '-' + Date.now() + ']';

        logger.info(instanceLogPrefix + ' Starting DVC processing.');

        const lockFileName = 'lock-dvc-' + oldChannel.guild.id;

        // only 1 event should be processed at any time for DVC
        let acquiredLock = false;
        while (!acquiredLock) {
            await getLock(lockFileName, instanceLogPrefix)
                .then(val => acquiredLock = val)
                .catch(err => logger.error(err));
        }

        const accordionSettings = await getAccordionSettings(oldChannel.guildId);
        if (!accordionSettings || !accordionSettings.enabled || !isAccordionExpandChannel(oldChannel, accordionSettings)) {
            logger.info(instanceLogPrefix + ' Release lock for DVC processing.');

            await unlink(lockFileName).catch(err => logger.error(err));

            logger.info(instanceLogPrefix + ' Ending DVC processing.');

            return;
        }

        if (!accordionSettings.v2) {
            accordionSettings.expand.push(oldChannel.name);
            logger.info(instanceLogPrefix + ' Removed voice channel ' + oldChannel.name);
            await setSettings(oldChannel.guildId, accordionSettings);
        }
        else {
            await putBackAccordionExpandCh(oldChannel.id, accordionSettings, instanceLogPrefix);
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
