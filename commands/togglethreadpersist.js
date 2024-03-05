const { SlashCommandBuilder } = require("@discordjs/builders");
const { keyv } = require("../index");

const { parentLogger } = require("../logger");
const logger = parentLogger.child({ module: "commands-togglethreadpersist" });

module.exports = {
    data: new SlashCommandBuilder()
        .setName("togglethreadpersist")
        .setDescription("Toggle all threads to auto-archive or not."),
    async execute(interaction) {
        await interaction.deferReply();

        let enabled;
        const THREAD_PERSIST_KEY_URL = `thread-persist/${interaction.guildId}/settings`;

        await keyv.get(THREAD_PERSIST_KEY_URL).then((ret) => (enabled = ret));
        if (!enabled || !enabled.flag) {
            await keyv.set(THREAD_PERSIST_KEY_URL, {
                flag: true,
            });
            await keyv
                .get(THREAD_PERSIST_KEY_URL)
                .then((ret) => (enabled = ret));
            if (enabled.flag) {
                logger.info(
                    `Thread persistance functionality is enabled for guild ${interaction.guildId}`
                );
                await interaction
                    .editReply("Thread persistance is enabled.")
                    .catch((err) => logger.error(err));
                return;
            }
        } else if (enabled.flag) {
            await keyv.set(THREAD_PERSIST_KEY_URL, {
                flag: false,
            });
            await keyv
                .get(THREAD_PERSIST_KEY_URL)
                .then((ret) => (enabled = ret));
            if (!enabled.flag) {
                logger.info(
                    `Thread persistance functionality is disabled for guild ${interaction.guildId}`
                );
                await interaction
                    .editReply("Thread persistance is disabled.")
                    .catch((err) => logger.error(err));
                return;
            }
        }

        logger.error(
            `DB error: Failed to toggle the thread persistance setting for guild ${interaction.guildId}`
        );
        await interaction
            .editReply(
                "DB error: Failed to toggle the thread persistance setting."
            )
            .catch((err) => logger.error(err));
    },
};
