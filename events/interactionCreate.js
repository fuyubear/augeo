const { InteractionType } = require('discord.js');

const { parentLogger } = require('../logger');
const logger = parentLogger.child({ module: 'events-interactionCreate' });

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const client = interaction.client;
        if (interaction.type !== InteractionType.ApplicationCommand
            && !interaction.isSelectMenu()
            && !interaction.isButton()) {
            return;
        }

        let command;
        if (interaction.type === InteractionType.ApplicationCommand) {
            command = client.commands.get(interaction.commandName);
        }
        else {
            return;
        }
        // else if (interaction.isSelectMenu() || interaction.isButton()) {
        //     command = client.commands.get(interaction.customId);
        // }

        if (!command) return;

        try {
            await command.execute(interaction);
        }
        catch (error) {
            logger.error(error);
            return interaction.editReply({
                content: 'There was an error while executing this command!',
                ephemeral: true,
            }).catch(err => logger.error(err));
        }
    },
};