const { AuditLogEvent } = require("discord.js");

const {
    putBackAccordionExpandCh,
    isAccordionExpandChannel,
    getAccordionSettingsByGuild,
    getGuildLock,
    releaseGuildLock,
    getInstanceLogPrefix,
} = require("../utils/voiceAccordionHelper");

const { parentLogger } = require("../logger");
const logger = parentLogger.child({
    module: "events-guildAuditLogEntryCreate",
});

module.exports = {
    name: "guildAuditLogEntryCreate",
    async execute(auditLogEntry, guild) {
        if (
            auditLogEntry.executorId == guild.client.user.id ||
            auditLogEntry.action !== AuditLogEvent.ChannelDelete
        ) {
            return;
        }

        // only 1 event should be processed at any time for DVC
        await getGuildLock(guild, logger)
            .then((val) => (acquiredLock = val))
            .catch((err) => logger.error(err));
        if (!acquiredLock) {
            await logError(
                logger,
                getInstanceLogPrefix(guild),
                "Could not obtain lock for DVC."
            );
            return;
        }

        const accordionSettings = await getAccordionSettingsByGuild(guild.id);
        if (!accordionSettings || !accordionSettings.enabled) {
            await releaseGuildLock(guild, logger, acquiredLock);
            return;
        }

        if (
            isAccordionExpandChannel(auditLogEntry.targetId, accordionSettings)
        ) {
            await putBackAccordionExpandCh(
                auditLogEntry.targetId,
                accordionSettings,
                logger,
                acquiredLock
            );
        }

        await releaseGuildLock(guild, logger, acquiredLock);
        return;
    },
};
