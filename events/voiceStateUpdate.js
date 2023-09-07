const { keyv } = require('../index');
const { ChannelType } = require('discord.js');
const { existsSync, appendFile } = require('fs');
const { unlink } = require('fs').promises;

const { parentLogger } = require('../logger');
const logger = parentLogger.child({ module: 'events-voiceStateUpdate' });

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {

        if (oldState.channelId === newState.channelId) {
            // nothing to do when voiceStateUpdate outputs states with the same
            // channel ID (no channel changes for this voiceStateUpdate)
            return;
        }

        const instanceLogPrefix = 'DVC Run ID [' + oldState.guild.id + '-' + Date.now() + ']';

        logger.info(instanceLogPrefix + ' Starting DVC processing.');

        const lockFileName = 'lock-dvc-' + oldState.guild.id;

        // only 1 event should be processed at any time for DVC
        let acquiredLock = false;
        while (!acquiredLock) {
            await getLock(lockFileName, instanceLogPrefix)
                .then(val => acquiredLock = val)
                .catch(err => logger.error(err));
        }

        const accordionSettings = await getAccordionSettings(oldState, newState);
        if (!accordionSettings || !accordionSettings.enabled) {
            logger.info(instanceLogPrefix + ' Release lock for DVC processing.');

            await unlink(lockFileName).catch(err => logger.error(err));

            logger.info(instanceLogPrefix + ' Ending DVC processing.');

            return;
        }

        logger.info(instanceLogPrefix + ' Obtained lock for DVC processing.');

        // get freshest list of guild's channels, if possible
        if (oldState.guild) {
            await oldState.guild.channels.fetch().catch(err => logger.error(err));
        }
        else {
            await newState.guild.channels.fetch().catch(err => logger.error(err));
        }

        const voiceAccordionCategoryId = accordionSettings.category.id;

        // remove any extra accordion expand channels with no members left,
        // so that only 1 empty expand channel is present
        if (oldState.channel) {
            const emptyAccordionExpandChannels = [];
            oldState.guild.channels.cache.filter(channel =>
                channel.type === ChannelType.GuildVoice
                && channel.parentId === voiceAccordionCategoryId
                && isAccordionExpandChannel(channel, accordionSettings)
                && (channel.members.size === 0),
            ).each(channel =>
                emptyAccordionExpandChannels.push(channel),
            );

            let numChannelsRemoved;
            if (
                (oldState.guild.channels.cache.filter(
                    (channel) =>
                        channel.type === ChannelType.GuildVoice
                        && channel.parentId === voiceAccordionCategoryId
                        && channel.members.size > 0,
                ).size === 0)
            ) {
                // all voice channels are empty,
                // so delete all empty expand channels
                numChannelsRemoved = emptyAccordionExpandChannels.length;
            }
            else if (
                (oldState.guild.channels.cache.filter(
                    (channel) =>
                        channel.type === ChannelType.GuildVoice
                        && channel.parentId === voiceAccordionCategoryId
                        && channel.members.size === 0
                        && channel.id !== oldState.guild.afkChannelId
                        && isAccordionBaseChannel(channel, accordionSettings),
                ).size === 0)
            ) {
                // non-AFK base channels are filled,
                // so keep one empty expand channel
                numChannelsRemoved = emptyAccordionExpandChannels.length - 1;
            }
            else {
                // non-AFK base channels are not filled,
                // so delete all empty expand channels
                numChannelsRemoved = emptyAccordionExpandChannels.length;
            }

            if (!accordionSettings.v2) {
                for (let i = 0; i < numChannelsRemoved; i++) {
                    // put name back into expand
                    const oldChannelName = emptyAccordionExpandChannels[i].name;
                    await emptyAccordionExpandChannels[i].delete()
                        .then(accordionSettings.expand.push(oldChannelName))
                        .catch(err => logger.error(err));
                    logger.info(instanceLogPrefix + ' Removed voice channel ' + oldChannelName);
                }
            }
            else {
                for (let i = 0; i < numChannelsRemoved; i++) {
                    const oldChannelId = emptyAccordionExpandChannels[i].id;
                    await emptyAccordionExpandChannels[i].delete()
                        .then(putBackAccordionExpandCh(instanceLogPrefix, oldChannelId, accordionSettings))
                        .catch(err => logger.error(err));
                }
            }

            await setSettings(oldState.guild.id, accordionSettings);
        }

        // Check if any accordion channels are empty and if the maximum accordion limit is filled,
        // then create another voice channel in the accordion if there's remaining expand channels
        // to create, as long as the currently shown expand channel count is below the limit (if set).
        if (newState.channel
            && ((newState.guild.channels.cache.filter(
                (channel) =>
                    channel.type === ChannelType.GuildVoice
                        && channel.parentId === voiceAccordionCategoryId
                        && channel.members.size === 0
                        && channel.id !== newState.guild.afkChannelId
                        && isAccordionBaseOrExpandChannel(channel, accordionSettings),
            ).size === 0
            ))
            && ((!accordionSettings.availableChLimit && (newState.guild.channels.cache.filter(
                (channel) =>
                    channel.type === ChannelType.GuildVoice
                    && channel.parentId === voiceAccordionCategoryId
                    && isAccordionBaseOrExpandChannel(channel, accordionSettings),
            ).size < (accordionSettings.base.length
                + accordionSettings.expandSize)))
                || (accordionSettings.availableChLimit && (newState.guild.channels.cache.filter(
                    (channel) =>
                        channel.type === ChannelType.GuildVoice
                        && channel.parentId === voiceAccordionCategoryId
                        && isAccordionBaseOrExpandChannel(channel, accordionSettings),
                ).size < (accordionSettings.availableChLimit)))
            )

        ) {
            if (newState.channel.parentId === voiceAccordionCategoryId
                && newState.channel.type === ChannelType.GuildVoice) {

                let newVoiceChannelName;
                if (accordionSettings.v2) {
                    await getNewAccordionExpandChName(accordionSettings)
                        .then(ret => newVoiceChannelName = ret)
                        .catch(err => logger.error(err));
                }
                else {
                    newVoiceChannelName = accordionSettings.expand.pop();
                }

                if (!newVoiceChannelName) {
                    logger.error(instanceLogPrefix + ' Could not obtain a new name for a newly created voice channel.');

                    logger.info(instanceLogPrefix + ' Release lock for DVC processing.');

                    await unlink(lockFileName).catch(err => logger.error(err));

                    logger.info(instanceLogPrefix + ' Ending DVC processing.');

                    return;
                }

                let categoryChannel;
                await newState.guild.channels.fetch(accordionSettings.category.id)
                    .then(fetched => categoryChannel = fetched)
                    .catch(err => logger.error(err));

                let newChannel;
                await categoryChannel.children.create({
                    name: `${newVoiceChannelName}`,
                    type: ChannelType.GuildVoice,
                    bitrate: newState.guild.maximumBitrate,
                })
                    .then(ret => newChannel = ret)
                    .catch(err => logger.error(err));

                if (accordionSettings.v2) {
                    accordionSettings.expand[newVoiceChannelName] = newChannel.id;
                }

                logger.info(instanceLogPrefix + ' Created voice channel ' + newVoiceChannelName);

                await setSettings(newState.guild.id, accordionSettings);
            }
        }

        logger.info(instanceLogPrefix + ' Release lock for DVC processing.');

        await unlink(lockFileName).catch(err => logger.error(err));

        logger.info(instanceLogPrefix + ' Ending DVC processing.');

        return;
    },
};

async function getNewAccordionExpandChName(accordionSettings) {
    if (accordionSettings.cycle) {
        let skipCount = accordionSettings.cycleIdx;
        for (const expandChName in accordionSettings.expand) {
            if (skipCount === 0 && accordionSettings.expand[expandChName] === 0) {
                accordionSettings.cycleIdx++;
                if (accordionSettings.cycleIdx === accordionSettings.expandSize) {
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

async function putBackAccordionExpandCh(instanceLogPrefix, channelId, accordionSettings) {
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

function isAccordionBaseChannel(channel, accordionSettings) {
    const chName = channel.name;
    if (!accordionSettings.v2) {
        return (accordionSettings.base.includes(chName));
    }
    return (accordionSettings.base.includes(chName));
}

function isAccordionBaseOrExpandChannel(channel, accordionSettings) {
    const chName = channel.name;
    if (!accordionSettings.v2) {
        return (accordionSettings.expandList.includes(chName))
            || (accordionSettings.base.includes(chName));
    }
    else if (accordionSettings.base.includes(chName)) {
        return true;
    }
    else {
        for (const expandChName in accordionSettings.expand) {
            if (accordionSettings.expand[expandChName] === channel.id) {
                return true;
            }
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

async function getAccordionSettings(oldState, newState) {
    let guildId;
    if (oldState.channel) {
        guildId = oldState.guild.id;
    }
    else if (newState.channel) {
        guildId = newState.guild.id;
    }
    else {
        return false;
    }

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
