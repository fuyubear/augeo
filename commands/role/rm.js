const { roleMention } = require("discord.js");

const { parentLogger } = require("../../logger");
const logger = parentLogger.child({ module: "commands-role_rm" });

module.exports = {
    async execute(interaction) {
        await this.executeThis(
            interaction,
            undefined,
            interaction.options.getString("reason")
        );
        return;
    },
    async executeThis(interaction, plainRoleId, reason) {
        // remove user from role
        let roleId;
        if (!plainRoleId) {
            roleId = interaction.options.getRole("role").id;
        } else {
            roleId = plainRoleId;
        }

        if (reason) {
            reason = `Executed by user ${interaction.user.id}: ` + reason;
        } else {
            reason = `Executed by user ${interaction.user.id}.`;
        }

        await interaction.options
            .getMember("user")
            .roles.remove(roleId, reason)
            .catch((err) => logger.error(err));

        const msg = `successfully removed ${interaction.options
            .getMember("user")
            .toString()} from ${roleMention(roleId)}`;
        // PRIVACY: logger.info(`User ${interaction.user.id} ${msg}`);
        await interaction
            .editReply("You " + msg)
            .catch((err) => logger.error(err));
        return;
    },
};
