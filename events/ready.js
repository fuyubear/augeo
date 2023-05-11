module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        const fs = require('fs');
        const { REST } = require('@discordjs/rest');
        const { Routes } = require('discord-api-types/v10');
        const { clientId, guildTestId, token } = require('../config.json');

        const { parentLogger } = require('../logger');
        const logger = parentLogger.child({ module: 'events-ready' });

        const commands = [];
        const commandFiles = fs.readdirSync(`${process.cwd()}/commands`)
            .filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(`${process.cwd()}/commands/${file}`);
            commands.push(command.data.toJSON());
        }

        const rest = new REST({ version: '10' }).setToken(token);

        try {
            logger.info('Started refreshing application (/) commands.');

            if (guildTestId) {
                await rest.put(
                    Routes.applicationGuildCommands(clientId, guildTestId),
                    { body: commands },
                );
                logger.info('Successfully reloaded application (/) commands for the '
                            + 'selected test guild. '
                            + 'Changes to the command details should show up soon.');
            }
            else {
                await rest.put(
                    Routes.applicationCommands(clientId),
                    { body: commands },
                );
                logger.info('Successfully reloaded application (/) commands for all guilds. '
                            + 'Please give some time for command changes to propagate.');
            }
        }
        catch (error) {
            logger.error(error);
            console.error(error);
        }

        logger.info(`Ready! Logged in as ${client.user.tag}`);
    },
};