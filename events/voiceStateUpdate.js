const { ChannelType } = require("discord.js");

const {
    getNewAccordionExpandChName,
    putBackAccordionExpandCh,
    isAccordionExpandChannel,
    isAccordionBaseChannel,
    isAccordionBaseOrExpandChannel,
    saveVoiceAccordionStateByGuild,
    getAccordionSettings,
    getGuildLock,
    releaseGuildLock,
    getInstanceLogPrefix,
    logError,
    logInfo,
} = require("../utils/voiceAccordionHelper");

const { parentLogger } = require("../logger");
const logger = parentLogger.child({ module: "events-voiceStateUpdate" });

module.exports = {
    name: "voiceStateUpdate",
    async execute(oldState, newState) {
        if (oldState.channelId === newState.channelId) {
            // nothing to do when voiceStateUpdate outputs states with the same
            // channel ID (no channel changes for this voiceStateUpdate)
            return;
        }

        // only 1 event should be processed at any time for DVC
        await getGuildLock(oldState.guild, logger)
            .then((val) => (acquiredLock = val))
            .catch((err) => logger.error(err));
        if (!acquiredLock) {
            await logError(
                logger,
                getInstanceLogPrefix(oldState.guild),
                "Could not obtain lock for DVC."
            );
            return;
        }

        const accordionSettings = await getAccordionSettings(
            oldState,
            newState
        );
        if (!accordionSettings || !accordionSettings.enabled) {
            await releaseGuildLock(oldState.guild, logger, acquiredLock);
            return;
        }

        // get freshest list of guild's channels, if possible
        if (oldState.guild) {
            await oldState.guild.channels
                .fetch()
                .catch((err) => logger.error(err));
        } else {
            await newState.guild.channels
                .fetch()
                .catch((err) => logger.error(err));
        }

        const voiceAccordionCategoryId = accordionSettings.category.id;

        // remove any extra accordion expand channels with no members left,
        // so that only 1 empty expand channel is present
        if (oldState.channel) {
            const emptyAccordionExpandChannels = [];
            oldState.guild.channels.cache
                .filter(
                    (channel) =>
                        channel.type === ChannelType.GuildVoice &&
                        channel.parentId === voiceAccordionCategoryId &&
                        isAccordionExpandChannel(
                            channel.id,
                            accordionSettings
                        ) &&
                        channel.members.size === 0
                )
                .each((channel) => emptyAccordionExpandChannels.push(channel));

            let numChannelsRemoved;
            if (
                oldState.guild.channels.cache.filter(
                    (channel) =>
                        channel.type === ChannelType.GuildVoice &&
                        channel.parentId === voiceAccordionCategoryId &&
                        channel.members.size > 0
                ).size === 0
            ) {
                // all voice channels are empty,
                // so delete all empty expand channels
                numChannelsRemoved = emptyAccordionExpandChannels.length;
            } else if (
                oldState.guild.channels.cache.filter(
                    (channel) =>
                        channel.type === ChannelType.GuildVoice &&
                        channel.parentId === voiceAccordionCategoryId &&
                        channel.members.size === 0 &&
                        channel.id !== oldState.guild.afkChannelId &&
                        isAccordionBaseChannel(channel, accordionSettings)
                ).size === 0
            ) {
                // non-AFK base channels are filled,
                // so keep one empty expand channel
                numChannelsRemoved = emptyAccordionExpandChannels.length - 1;
            } else {
                // non-AFK base channels are not filled,
                // so delete all empty expand channels
                numChannelsRemoved = emptyAccordionExpandChannels.length;
            }

            for (let i = 0; i < numChannelsRemoved; i++) {
                const oldChannelId = emptyAccordionExpandChannels[i].id;
                await emptyAccordionExpandChannels[i]
                    .delete()
                    .then(
                        putBackAccordionExpandCh(
                            oldChannelId,
                            accordionSettings,
                            logger,
                            acquiredLock
                        )
                    )
                    .catch((err) => logger.error(err));
            }

            await saveVoiceAccordionStateByGuild(
                oldState.guild.id,
                accordionSettings
            );
        }

        // Check if any accordion channels are empty and if the maximum accordion limit is filled,
        // then create another voice channel in the accordion if there's remaining expand channels
        // to create, as long as the currently shown expand channel count is below the limit (if set).
        if (
            newState.channel &&
            newState.guild.channels.cache.filter(
                (channel) =>
                    channel.type === ChannelType.GuildVoice &&
                    channel.parentId === voiceAccordionCategoryId &&
                    channel.members.size === 0 &&
                    channel.id !== newState.guild.afkChannelId &&
                    isAccordionBaseOrExpandChannel(channel, accordionSettings)
            ).size === 0 &&
            ((!accordionSettings.availableChLimit &&
                newState.guild.channels.cache.filter(
                    (channel) =>
                        channel.type === ChannelType.GuildVoice &&
                        channel.parentId === voiceAccordionCategoryId &&
                        isAccordionBaseOrExpandChannel(
                            channel,
                            accordionSettings
                        )
                ).size <
                    accordionSettings.base.length +
                        accordionSettings.expandSize) ||
                (accordionSettings.availableChLimit &&
                    newState.guild.channels.cache.filter(
                        (channel) =>
                            channel.type === ChannelType.GuildVoice &&
                            channel.parentId === voiceAccordionCategoryId &&
                            isAccordionBaseOrExpandChannel(
                                channel,
                                accordionSettings
                            )
                    ).size < accordionSettings.availableChLimit))
        ) {
            if (
                newState.channel.parentId === voiceAccordionCategoryId &&
                newState.channel.type === ChannelType.GuildVoice
            ) {
                let newVoiceChannelName;
                await getNewAccordionExpandChName(accordionSettings)
                    .then((ret) => (newVoiceChannelName = ret))
                    .catch((err) => logger.error(err));

                if (!newVoiceChannelName) {
                    await logError(
                        oldState.guild,
                        logger,
                        "Could not obtain a new name for a newly created voice channel."
                    );
                    await releaseGuildLock(
                        oldState.guild,
                        logger,
                        acquiredLock
                    );
                    return;
                }

                let categoryChannel;
                await newState.guild.channels
                    .fetch(accordionSettings.category.id)
                    .then((fetched) => (categoryChannel = fetched))
                    .catch((err) => logger.error(err));

                let newChannel;
                await categoryChannel.children
                    .create({
                        name: `${newVoiceChannelName}`,
                        type: ChannelType.GuildVoice,
                        bitrate: newState.guild.maximumBitrate,
                    })
                    .then((ret) => (newChannel = ret))
                    .catch((err) => logger.error(err));

                accordionSettings.expand[newVoiceChannelName] = newChannel.id;
                await logInfo(
                    oldState.guild,
                    logger,
                    "Created voice channel " + newVoiceChannelName
                );
                await saveVoiceAccordionStateByGuild(
                    newState.guild.id,
                    accordionSettings
                );
            }
        }

        await releaseGuildLock(oldState.guild, logger, acquiredLock);
        return;
    },
};
