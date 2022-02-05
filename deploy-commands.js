const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildTestId, token } = require('./config.json');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        if (guildTestId) {
            await rest.put(
                Routes.applicationGuildCommands(clientId, guildTestId),
                { body: commands },
            );
            console.log('Successfully reloaded application (/) commands for all guilds.'
                        + 'Changes to the command details should show up soon.');
        }
        else {
            await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
            console.log('Successfully reloaded application (/) commands for all guilds.'
                        + 'Please give time for command changes to propagate.');
        }
    }
    catch (error) {
        console.error(error);
    }
})();
