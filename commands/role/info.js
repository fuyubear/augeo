const { keyv } = require('../../index');

module.exports.execute = async function(interaction) {
    if (interaction.options.getRole('role').name === '@everyone') {
        await interaction.editReply('The `@everyone` role cannot be viewed.')
            .catch(console.error);
        return;
    }

    interaction.guild.members.fetch()
        .then(console.log)
        .catch(console.error);

    const guildRoleManager = interaction.guild.roles;
    const guildMemberManager = interaction.guild.members;

    // get role and print the information out
    let roleMembers = [];
    interaction.options.getRole('role').members.each(value =>
        roleMembers.push(value.user.tag),
    );
    if (roleMembers.length === 0) {
        roleMembers = 'None';
    }

    let roleManagers;
    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);

    if (!roleManagers) {
        await interaction.editReply(`There are no managers for this role.\nRole members: ${roleMembers}`)
            .catch(console.error);
        return;
    }

    let managerUsers = [];
    for (const managerUserIdx in roleManagers.users) {
        managerUsers.push(guildMemberManager.resolve(roleManagers.users[managerUserIdx]).user.tag);
    }
    if (managerUsers.length === 0) {
        managerUsers = 'None';
    }

    let managerRoles = [];
    for (const managerRoleIdx in roleManagers.roles) {
        managerRoles.push(guildRoleManager.resolve(roleManagers.roles[managerRoleIdx]).name);
    }
    if (managerRoles.length === 0) {
        managerRoles = 'None';
    }

    const outputString = `${interaction.options.getRole('role').name}:\nManager users: ${managerUsers}\nManager roles: ${managerRoles}\nRole members: ${roleMembers}`;

    await interaction.editReply(outputString)
        .catch(console.error);
    return;
};