/* eslint-disable indent */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ring, ringEnabled } = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ring')
        .setDescription('Manage Ring membership.')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a user to a Ring level.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add.')
                        .setRequired(true),
                )
                .addIntegerOption(option =>
                    option.setName('ring_level')
                        .setDescription('Ring level to add user to.')
                        .setRequired(true)
                        .addChoices({ name: 'Ring 1', value: 1 }, { name: 'Ring 2', value: 2 }, { name: 'Ring 3', value: 3 }),
                ))
        .addSubcommand(subcommand =>
            subcommand.setName('rm')
                .setDescription('Remove a user to a Ring level.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove.')
                        .setRequired(true),
                )
                .addIntegerOption(option =>
                    option.setName('ring_level')
                        .setDescription('Ring level to remove user from.')
                        .setRequired(true)
                        .addChoices({ name: 'Ring 1', value: 1 }, { name: 'Ring 2', value: 2 }, { name: 'Ring 3', value: 3 }),
                )),
    async execute(interaction) {
        await interaction.deferReply();

        if (!ringEnabled) {
            await interaction.editReply('Ring functionality is disabled on this instance.')
                .catch(console.error);
            return;
        }

        const ringLevel = interaction.options.getInteger('ring_level');
        const resolvedRole = ring['' + ringLevel];

        const subcommandExecuter = require('./role');
        await subcommandExecuter.executeThis(interaction, resolvedRole);
    },
};
