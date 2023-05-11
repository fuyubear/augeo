const { SlashCommandBuilder } = require('@discordjs/builders');
const { keyv } = require('../index');

const { parentLogger } = require('../logger');
const logger = parentLogger.child({ module: 'commands-togglevoiceregions' });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('togglevoiceregions')
        .setDescription('Toggle users to change regions without Edit Channels perms.'),
    async execute(interaction) {
        await interaction.deferReply();

        let enabled;
        const THREAD_PERSIST_KEY_URL = `voice-regions/${interaction.guildId}/settings`;

        await keyv.get(THREAD_PERSIST_KEY_URL)
            .then(ret => enabled = ret);
        if (!enabled || !enabled.flag) {
            await keyv.set(THREAD_PERSIST_KEY_URL, {
                flag: true,
            });
            await keyv.get(THREAD_PERSIST_KEY_URL)
                .then(ret => enabled = ret);
            if (enabled.flag) {
                logger.info(`Voice region edit functionality is enabled for guild ${interaction.guildId}`);
                await interaction.editReply('Voice region edit functionality is enabled.')
                    .catch(err => logger.error(err));
                return;
            }
        }
        else if (enabled.flag) {
            await keyv.set(THREAD_PERSIST_KEY_URL, {
                flag: false,
            });
            await keyv.get(THREAD_PERSIST_KEY_URL)
                .then(ret => enabled = ret);
            if (!enabled.flag) {
                logger.info(`Voice region edit functionality is disabled for guild ${interaction.guildId}`);
                await interaction.editReply('Voice region edit functionality is disabled.')
                    .catch(err => logger.error(err));
                return;
            }
        }

        logger.error(`DB error: Failed to toggle the voice region edit functionality setting failed for guild ${interaction.guildId}`);
        await interaction.editReply('DB error: Failed to toggle the' +
        ' voice region functionality setting.')
            .catch(err => logger.error(err));
    },
};
