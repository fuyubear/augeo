const { keyv } = require('../../index');

module.exports.execute = async function(interaction) {
    // remove manager role from role
    let roleManagers;
    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);
    if (!roleManagers) {
        await interaction.editReply('There are no managers for this role.')
            .catch(console.error);
        return;
    }

    const isRemoved = roleManagers.roles.splice(roleManagers.roles.indexOf(interaction.options.getRole('manager_role').id), 1);

    await keyv.set(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`, roleManagers);

    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);

    if (isRemoved && !(roleManagers.roles.includes(interaction.options.getRole('manager_role').id))) {
        await interaction.editReply(`Successfully removed manager role ${interaction.options.getRole('manager_role').name} from ${interaction.options.getRole('role').name}`)
            .catch(console.error);
    }
    else {
        await interaction.editReply(`DB error: Failed to remove manager role ${interaction.options.getRole('manager_role').name} from ${interaction.options.getRole('role').name}`)
            .catch(console.error);
    }

    return;
};