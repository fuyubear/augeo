const { keyv } = require('../../index');

module.exports.execute = async function(interaction) {
    // remove manager user from role
    let roleManagers;
    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);
    if (!roleManagers) {
        await interaction.editReply('There are no managers for this role.')
            .catch(console.error);
        return;
    }

    const isRemoved = roleManagers.users.splice(roleManagers.users.indexOf(interaction.options.getMember('manager').id), 1);

    await keyv.set(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`, roleManagers);

    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);

    if (isRemoved && !(roleManagers.users.includes(interaction.options.getMember('manager').id))) {
        await interaction.editReply(`Successfully removed manager ${interaction.options.getMember('manager').toString()} from ${interaction.options.getRole('role').name}`)
            .catch(console.error);
    }
    else {
        await interaction.editReply(`DB error: Failed to remove manager ${interaction.options.getMember('manager').toString()} from ${interaction.options.getRole('role').name}`)
            .catch(console.error);
    }

    return;
};