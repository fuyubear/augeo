const { SlashCommandBuilder } = require('@discordjs/builders');
const { keyv } = require('../index');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('togglevoiceregions')
        .setDescription('Bot admin(s) only. '
        + 'Toggle users to change regions without Edit Channels + emojis on channel names.'),
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
                await interaction.editReply('Voice region functionality is enabled.')
                    .catch(console.error);
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
                await interaction.editReply('Voice region functionality is disabled.')
                    .catch(console.error);
                return;
            }
        }

        await interaction.editReply('DB error: Failed to toggle' +
        ' voice region functionality setting.')
            .catch(console.error);
    },
};
