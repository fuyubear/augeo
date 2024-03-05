const { SlashCommandBuilder } = require("@discordjs/builders");

const { parentLogger } = require("../logger");
const logger = parentLogger.child({ module: "commands-ping" });

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),
    async execute(interaction) {
        return interaction.reply("Pong!").catch((err) => logger.error(err));
    },
};
