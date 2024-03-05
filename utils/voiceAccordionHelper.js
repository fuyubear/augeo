const { keyv } = require("../index");
const { getLock, releaseLock } = require("../utils/fileLock");

function isAccordionBaseChannel(channel, accordionSettings) {
    const chName = channel.name;
    return accordionSettings.base.includes(chName);
}

function isAccordionExpandChannel(channelId, accordionSettings) {
    for (const expandChName in accordionSettings.expand) {
        if (accordionSettings.expand[expandChName] === channelId) {
            return true;
        }
    }
    return false;
}

function isAccordionBaseOrExpandChannel(channel, accordionSettings) {
    const chName = channel.name;
    if (accordionSettings.base.includes(chName)) {
        return true;
    } else {
        for (const expandChName in accordionSettings.expand) {
            if (accordionSettings.expand[expandChName] === channel.id) {
                return true;
            }
        }
    }
    return false;
}

async function getAccordionSettings(oldState, newState) {
    let guildId;
    if (oldState.channel) {
        guildId = oldState.guild.id;
    } else if (newState.channel) {
        guildId = newState.guild.id;
    } else {
        return false;
    }

    let enabled;
    const VOICE_ACCORDION_SETTINGS_KEY_URL = `voice-accordion/${guildId}/settings`;
    await keyv
        .get(VOICE_ACCORDION_SETTINGS_KEY_URL)
        .then((ret) => (enabled = ret));
    if (!enabled) {
        return false;
    }
    return enabled;
}

async function getAccordionSettingsByGuild(guildId) {
    let enabled;
    const VOICE_ACCORDION_SETTINGS_KEY_URL = `voice-accordion/${guildId}/settings`;
    await keyv
        .get(VOICE_ACCORDION_SETTINGS_KEY_URL)
        .then((ret) => (enabled = ret));
    if (!enabled) {
        return false;
    }
    return enabled;
}

async function saveVoiceAccordionState(accordionSettings) {
    const VOICE_ACCORDION_AVAILABLE_URL = `voice-accordion/${accordionSettings.guildId}/settings`;
    await keyv.set(VOICE_ACCORDION_AVAILABLE_URL, accordionSettings);
}

async function saveVoiceAccordionStateByGuild(guildId, accordionSettings) {
    const VOICE_ACCORDION_AVAILABLE_URL = `voice-accordion/${guildId}/settings`;
    await keyv.set(VOICE_ACCORDION_AVAILABLE_URL, accordionSettings);
}

async function getNewAccordionExpandChName(accordionSettings) {
    if (accordionSettings.cycle) {
        let skipCount = accordionSettings.cycleIdx;
        for (const expandChName in accordionSettings.expand) {
            if (
                skipCount === 0 &&
                accordionSettings.expand[expandChName] === 0
            ) {
                accordionSettings.cycleIdx++;
                if (
                    accordionSettings.cycleIdx === accordionSettings.expandSize
                ) {
                    accordionSettings.cycleIdx = 0;
                }
                await saveSettings(accordionSettings);
                return expandChName;
            }
            skipCount--;
        }
    }
    for (const expandChName in accordionSettings.expand) {
        if (accordionSettings.expand[expandChName] === 0) {
            return expandChName;
        }
    }
}

async function putBackAccordionExpandCh(
    channelId,
    accordionSettings,
    logger,
    instanceLogPrefix
) {
    for (const expandChName in accordionSettings.expand) {
        if (accordionSettings.expand[expandChName] === channelId) {
            accordionSettings.expand[expandChName] = 0;
            await saveSettings(accordionSettings);
            logInfo(
                logger,
                instanceLogPrefix,
                "Removed voice channel " +
                    expandChName +
                    " (ID:" +
                    channelId +
                    ")"
            );
        }
    }
}

async function getGuildLock(guild, logger, timeout = 300) {
    const instanceLogPrefix = getInstanceLogPrefix(guild);
    logger.info(instanceLogPrefix + " Starting DVC processing.");
    const lockFileName = getLockName(guild);

    // only 1 event should be processed at any time for DVC
    await getLock(lockFileName, instanceLogPrefix, logger, timeout)
        .then((val) => (acquiredLock = val))
        .catch((err) => logger.error(err));
    if (acquiredLock) {
        return instanceLogPrefix;
    }
    return null;
}

async function releaseGuildLock(guild, logger, instanceLogPrefix) {
    const lockFileName = getLockName(guild);
    await releaseLock(lockFileName, instanceLogPrefix, logger);
    logger.info(instanceLogPrefix + " Ending DVC processing.");
}

async function logError(logger, instanceLogPrefix, message) {
    logger.error(instanceLogPrefix + message);
}

async function logInfo(logger, instanceLogPrefix, message) {
    logger.info(instanceLogPrefix + message);
}

function getInstanceLogPrefix(guild) {
    return "DVC Run ID [" + guild.id + "-" + Date.now() + "] ";
}

function getLockName(guild) {
    return "lock-dvc-" + guild.id;
}

module.exports = {
    getNewAccordionExpandChName,
    putBackAccordionExpandCh,
    isAccordionExpandChannel,
    isAccordionBaseChannel,
    isAccordionBaseOrExpandChannel,
    getAccordionSettingsByGuild,
    saveVoiceAccordionStateByGuild,
    saveVoiceAccordionState,
    getAccordionSettings,
    getGuildLock,
    releaseGuildLock,
    logError,
    logInfo,
    getInstanceLogPrefix,
};
