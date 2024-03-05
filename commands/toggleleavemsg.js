const { PermissionsBitField } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { keyv } = require("../index");

const { parentLogger } = require("../logger");
const logger = parentLogger.child({ module: "commands-toggleleavemsg" });

module.exports = {
    data: new SlashCommandBuilder()
        .setName("toggleleavemsg")
        .setDescription(
            "Toggle user leave messages in the System Messages text channel."
        ),
    async execute(interaction) {
        await interaction.deferReply();

        let enabled;
        const LEAVE_MSG_KEY_URL = `leave-msg/${interaction.guildId}/settings`;

        await keyv.get(LEAVE_MSG_KEY_URL).then((ret) => (enabled = ret));
        if (!enabled || !enabled.flag) {
            const botPermissionsInSystemMessagesChannel =
                interaction.guild.members.me.permissionsIn(
                    interaction.guild.systemChannel
                );
            if (
                !botPermissionsInSystemMessagesChannel.has([
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                ])
            ) {
                logger.info(
                    `Leave messages failed to toggle for guild ${interaction.guildId} due to lack of permissions`
                );
                await interaction
                    .editReply(
                        "I cannot see and post messages in the " +
                            "System Messages Channel, so user leave messages was not enabled."
                    )
                    .catch((err) => logger.error(err));
                return;
            }

            await keyv.set(LEAVE_MSG_KEY_URL, {
                flag: true,
            });
            await keyv.get(LEAVE_MSG_KEY_URL).then((ret) => (enabled = ret));
            if (enabled.flag) {
                logger.info(
                    `User leave messages functionality is enabled for guild ${interaction.guildId}`
                );
                await interaction
                    .editReply("Leave messsages are enabled.")
                    .catch((err) => logger.error(err));
                return;
            }
        } else if (enabled.flag) {
            await keyv.set(LEAVE_MSG_KEY_URL, {
                flag: false,
            });
            await keyv.get(LEAVE_MSG_KEY_URL).then((ret) => (enabled = ret));
            if (!enabled.flag) {
                logger.info(
                    `User leave messages functionality is disabled for guild ${interaction.guildId}`
                );
                await interaction
                    .editReply("Leave messsages is disabled.")
                    .catch((err) => logger.error(err));
                return;
            }
        }

        logger.error(
            `DB error: Failed to toggle the user leave messages setting for guild ${interaction.guildId}`
        );
        await interaction
            .editReply("DB error: Failed to toggle the leave messages setting.")
            .catch((err) => logger.error(err));
    },
};
