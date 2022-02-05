module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        const fs = require('fs');
        const { REST } = require('@discordjs/rest');
        const { Routes } = require('discord-api-types/v9');
        const { clientId, guildTestId, token } = require('../config.json');

        const commands = [];
        const commandFiles = fs.readdirSync(`${process.cwd()}/commands`).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(`${process.cwd()}/commands/${file}`);
            commands.push(command.data.toJSON());
        }

        const rest = new REST({ version: '9' }).setToken(token);

        try {
            console.log('Started refreshing application (/) commands.');

            await rest.put(
                Routes.applicationGuildCommands(clientId, guildTestId),
                { body: commands },
            );

            console.log('Successfully reloaded application (/) commands.');
        }
        catch (error) {
            console.error(error);
        }

        console.log(`Ready! Logged in as ${client.user.tag}`);
    },
};