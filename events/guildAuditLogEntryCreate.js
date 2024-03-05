const { AuditLogEvent } = require("discord.js");

const {
    putBackAccordionExpandCh,
    isAccordionExpandChannel,
    getAccordionSettingsByGuild,
    getGuildLock,
    releaseGuildLock,
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
        await getGuildLock(lockFileName, instanceLogPrefix, logger)
            .then((val) => (acquiredLock = val))
            .catch((err) => logger.error(err));
        if (!acquiredLock) {
            return;
        }

        const accordionSettings = await getAccordionSettingsByGuild(guild.id);
        if (!accordionSettings || !accordionSettings.enabled) {
            await releaseGuildLock(lockFileName, instanceLogPrefix, logger);
            return;
        }

        if (
            isAccordionExpandChannel(auditLogEntry.targetId, accordionSettings)
        ) {
            await putBackAccordionExpandCh(
                auditLogEntry.targetId,
                accordionSettings,
                instanceLogPrefix,
                logger
            );
        }

        await releaseGuildLock(lockFileName, instanceLogPrefix, logger);
        return;
    },
};
