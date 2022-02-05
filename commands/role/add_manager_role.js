const { keyv } = require('../../index');

module.exports.execute = async function(interaction) {
    // add manager role to role
    let roleManagers;
    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);
    if (!roleManagers) {
        await keyv.set(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`, {
            users: [],
            roles: [],
        });
        await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
            .then(ret => roleManagers = ret);
    }

    roleManagers.roles.push(interaction.options.getRole('manager_role').id);

    await keyv.set(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`, roleManagers);

    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);

    if (roleManagers.roles.includes(interaction.options.getRole('manager_role').id)) {
        await interaction.editReply(`Successfully added manager role ${interaction.options.getRole('manager_role').name} to ${interaction.options.getRole('role').name}`)
            .catch(console.error);
    }
    else {
        await interaction.editReply(`DB error: Could not add manager role ${interaction.options.getRole('manager_role').name} to ${interaction.options.getRole('role').name}`)
            .catch(console.error);
    }

    return;
};