module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const client = interaction.client;
        if (!interaction.isCommand() && !interaction.isSelectMenu() && !interaction.isButton()) return;

        let command;
        if (interaction.isCommand()) {
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
            console.error(error);
            return interaction.editReply({ content: 'There was an error while executing this command!', ephemeral: true })
                .catch(console.error);
        }
    },
};