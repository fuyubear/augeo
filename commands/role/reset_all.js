const { keyv } = require('../../index');

module.exports.execute = async function(interaction) {
    // remove all managers from all roles in a guild

    if (!interaction.options.getString('confirm')) {
        await interaction.editReply('Please provide confirmation to start the resetting process for all roles in this guild.')
            .catch(console.error);
    }
    else {
        const roles = [];
        interaction.guild.roles.cache.each(value =>
            roles.push(value),
        );
        for (const role in roles) {
            await keyv.set(`role/${interaction.guildId}/${roles[role].id}/manager`, undefined);
        }
        await interaction.editReply('Cleared all managers from all roles in this guild.')
            .catch(console.error);
    }

    return;
};