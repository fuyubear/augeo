const { keyv } = require('../../index');

module.exports.execute = async function(interaction) {
    // add manager user to role
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

    roleManagers.users.push(interaction.options.getMember('manager').id);

    await keyv.set(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`, roleManagers);

    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);

    if (roleManagers.users.includes(interaction.options.getMember('manager').id)) {
        await interaction.editReply(`Successfully added manager user ${interaction.options.getMember('manager').toString()} to ${interaction.options.getRole('role').name}`)
            .catch(console.error);
    }
    else {
        await interaction.editReply(`DB error: Could not manager user ${interaction.options.getMember('manager').toString()} to ${interaction.options.getRole('role').name}`)
            .catch(console.error);
    }

    return;
};