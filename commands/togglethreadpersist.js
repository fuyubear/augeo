const { SlashCommandBuilder } = require('@discordjs/builders');
const { keyv } = require('../index');
const { botAdminIds } = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('togglethreadpersist')
        .setDescription('Bot admin(s) only. Toggle all threads to auto-archive or not.'),
    async execute(interaction) {
        await interaction.deferReply();

        // really awful way to enforce command permissions
        // until Discord releases slash command permissions
        if ((interaction.guild.ownerId !== interaction.member.id)
                && (!(botAdminIds.includes(interaction.member.id)))) {
            await interaction.editReply('You do not have permission to change this setting.')
                .catch(console.error);
            return;
        }

        let enabled;
        const THREAD_PERSIST_KEY_URL = `thread-persist/${interaction.guildId}/settings`;

        await keyv.get(THREAD_PERSIST_KEY_URL)
            .then(ret => enabled = ret);
        if (!enabled || !enabled.flag) {
            await keyv.set(THREAD_PERSIST_KEY_URL, {
                flag: true,
            });
            await keyv.get(THREAD_PERSIST_KEY_URL)
                .then(ret => enabled = ret);
            if (enabled.flag) {
                await interaction.editReply('Thread persistance is enabled.')
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
                await interaction.editReply('Thread persistance is disabled.')
                    .catch(console.error);
                return;
            }
        }

        await interaction.editReply('DB error: Failed to toggle thread persistance setting.')
            .catch(console.error);
    },
};
