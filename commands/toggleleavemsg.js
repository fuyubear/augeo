const { PermissionsBitField } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { keyv } = require('../index');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggleleavemsg')
        .setDescription('Bot admin(s) only. '
        + 'Toggle user leave messages in the System Messages text channel.'),
    async execute(interaction) {
        await interaction.deferReply();

        let enabled;
        const LEAVE_MSG_KEY_URL = `leave-msg/${interaction.guildId}/settings`;

        await keyv.get(LEAVE_MSG_KEY_URL)
            .then(ret => enabled = ret);
        if (!enabled || !enabled.flag) {
            const botPermissionsInSystemMessagesChannel = interaction.guild.members.me.permissionsIn(
                interaction.guild.systemChannel,
            );
            if (!(botPermissionsInSystemMessagesChannel.has(
                [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            ))) {
                await interaction.editReply('I cannot see and post messages in the '
                + 'System Messages Channel, so user leave messages was not enabled.')
                    .catch(console.error);
                return;
            }

            await keyv.set(LEAVE_MSG_KEY_URL, {
                flag: true,
            });
            await keyv.get(LEAVE_MSG_KEY_URL)
                .then(ret => enabled = ret);
            if (enabled.flag) {
                await interaction.editReply('Leave messsages are enabled.')
                    .catch(console.error);
                return;
            }
        }
        else if (enabled.flag) {
            await keyv.set(LEAVE_MSG_KEY_URL, {
                flag: false,
            });
            await keyv.get(LEAVE_MSG_KEY_URL)
                .then(ret => enabled = ret);
            if (!enabled.flag) {
                await interaction.editReply('Leave messsages is disabled.')
                    .catch(console.error);
                return;
            }
        }

        await interaction.editReply('DB error: Failed to toggle user leave messages setting.')
            .catch(console.error);
    },
};
