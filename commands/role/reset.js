const { keyv } = require('../../index');

module.exports.execute = async function(interaction) {
    // remove all managers from role
    await keyv.set(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`, undefined);

    await interaction.editReply(`Successfully removed all managers from ${interaction.options.getRole('role').name}.`)
        .catch(console.error);
    return;
};