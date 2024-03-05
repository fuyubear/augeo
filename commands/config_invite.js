const { SlashCommandBuilder } = require("@discordjs/builders");
const { keyv } = require("../index");

const { parentLogger } = require("../logger");
const logger = parentLogger.child({ module: "commands-config_invite" });

module.exports = {
    data: new SlashCommandBuilder()
        .setName("config_invite")
        .setDescription("Configure the invite slash command.")
        .addIntegerOption((option) =>
            option
                .setName("expire_after")
                .setDescription(
                    "Configure the expiration time for newly created invites in seconds. Set to 0 for no expiration."
                )
                .setRequired(true)
        )
        .addBooleanOption((option) =>
            option
                .setName("require_reason")
                .setDescription(
                    "Configure if a reason is required to be specified when creating an invite."
                )
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("use_limit")
                .setDescription(
                    "Configure the use limit of the invite slash command per user. Set to 0 for unlimited uses."
                )
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("use_expiration")
                .setDescription(
                    "Configure how long it takes in seconds for a use to not count towards the use limit."
                )
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const expireAfter = interaction.options.getInteger("expire_after");
        const requireReason = interaction.options.getBoolean("require_reason");
        const useLimit = interaction.options.getInteger("use_limit");
        const useExpiration = interaction.options.getInteger("use_expiration");

        if (!expireAfter || !useLimit || requireReason == null) {
            await interaction
                .editReply("Not all config options were not provided.")
                .catch((err) => logger.error(err));
            return;
        }

        if (!useLimit && useExpiration) {
            await interaction
                .editReply(
                    "Cannot set a use expiration when there is no use limit."
                )
                .catch((err) => logger.error(err));
            return;
        }

        if (useLimit > 0 && !useExpiration) {
            await interaction
                .editReply(
                    "Must set a use expiration when there is a use limit."
                )
                .catch((err) => logger.error(err));
            return;
        }

        const USER_INVITE_KEY_URL = `user-invite/${interaction.guildId}/settings`;
        const userInviteSettingsToSave = {
            expireAfter: expireAfter,
            requireReason: requireReason,
            useLimit: useLimit,
            useExpiration: useExpiration,
        };
        await keyv.set(USER_INVITE_KEY_URL, userInviteSettingsToSave);

        let newUserInviteSettings;
        await keyv
            .get(USER_INVITE_KEY_URL)
            .then((ret) => (newUserInviteSettings = ret))
            .catch((err) => logger.error(err));

        if (
            !newUserInviteSettings ||
            userInviteSettingsToSave.expireAfter !==
                newUserInviteSettings.expireAfter ||
            userInviteSettingsToSave.useLimit !==
                newUserInviteSettings.useLimit ||
            userInviteSettingsToSave.useExpiration !==
                newUserInviteSettings.useExpiration ||
            userInviteSettingsToSave.requireReason !==
                newUserInviteSettings.requireReason
        ) {
            await interaction
                .editReply(
                    "Failed to save this invite slash command configuration."
                )
                .catch((err) => logger.error(err));
        } else {
            await interaction
                .editReply(
                    "Successfully saved this invite slash command configuration."
                )
                .catch((err) => logger.error(err));
        }
    },
};
