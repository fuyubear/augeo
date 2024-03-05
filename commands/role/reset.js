const { keyv } = require("../../index");

const { parentLogger } = require("../../logger");
const logger = parentLogger.child({ module: "commands-role_reset" });

module.exports.execute = async function (interaction) {
    // remove all managers from role
    await keyv.set(
        `role/${interaction.guildId}/${
            interaction.options.getRole("role").id
        }/manager`,
        undefined
    );

    const msg = `Successfully removed all managers from ${interaction.options
        .getRole("role")
        .toString()}.`;
    logger.info(msg);
    await interaction.editReply(msg).catch((err) => logger.error(err));
    return;
};
