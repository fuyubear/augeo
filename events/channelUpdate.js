const { ChannelType } = require("discord.js");

const {
    putBackAccordionExpandCh,
    isAccordionExpandChannel,
    getAccordionSettingsByGuild,
    getGuildLock,
    releaseGuildLock,
} = require("../utils/voiceAccordionHelper");

const { parentLogger } = require("../logger");
const logger = parentLogger.child({ module: "events-channelUpdate" });

module.exports = {
    name: "channelUpdate",
    async execute(oldChannel, newChannel) {
        // For an updated channel to be a dynamically generated voice channel,
        // it must be:
        //              1. A guild voice channel
        //              2. A channel in the same guild
        //              3. The channel is/was in a category channel
        // And to proceed on to check this channel, it must have a different parent (category)
        // channel, or no parent (category) channel at all.
        if (
            !oldChannel.type === ChannelType.GuildVoice ||
            !newChannel.type === ChannelType.GuildVoice ||
            oldChannel.guildId !== newChannel.guildId ||
            !oldChannel.parent ||
            (newChannel.parent && oldChannel.parentId === newChannel.parentId)
        ) {
            return;
        }

        // only 1 event should be processed at any time for DVC
        await getGuildLock(lockFileName, instanceLogPrefix, logger)
            .then((val) => (acquiredLock = val))
            .catch((err) => logger.error(err));
        if (!acquiredLock) {
            return;
        }

        const accordionSettings = await getAccordionSettingsByGuild(
            oldChannel.guildId
        );
        if (
            !accordionSettings ||
            !accordionSettings.enabled ||
            !isAccordionExpandChannel(oldChannel.id, accordionSettings)
        ) {
            await releaseGuildLock(lockFileName, instanceLogPrefix, logger);
            return;
        }

        await putBackAccordionExpandCh(
            oldChannel.id,
            accordionSettings,
            instanceLogPrefix,
            logger
        );

        await releaseGuildLock(lockFileName, instanceLogPrefix, logger);
        return;
    },
};
