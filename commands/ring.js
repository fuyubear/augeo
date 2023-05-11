/* eslint-disable indent */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ring, ringEnabled } = require('../config.json');

const { parentLogger } = require('../logger');
const logger = parentLogger.child({ module: 'commands-ring' });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ring')
        .setDescription('DEPRECATED: use /role instead! Manage Ring membership.')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('DEPRECATED: use /role add instead! Add a user to a Ring level.')
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
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Optionally add a reason for adding this user')
                        .setRequired(false),
                ))
        .addSubcommand(subcommand =>
            subcommand.setName('rm')
                .setDescription('DEPRECATED: use /role rm instead! Remove a user to a Ring level.')
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
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Optionally add a reason for removing this user')
                        .setRequired(false),
                )),
    async execute(interaction) {
        await interaction.deferReply();
        await interaction.editReply('Fetching results...')
            .catch(err => logger.error(err));

        if (!ringEnabled) {
            await interaction.editReply('Ring functionality is disabled on this instance.')
                .catch(err => logger.error(err));
            return;
        }

        const ringLevel = interaction.options.getInteger('ring_level');
        const resolvedRole = ring['' + ringLevel];

        const subcommandExecuter = require('./role');
        await subcommandExecuter.executeThis(interaction, resolvedRole, interaction.options.getString('reason'));
    },
};
