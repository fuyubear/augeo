const { keyv } = require('../../index');

module.exports.execute = async function(interaction) {
    await interaction.editReply('Here are all of the managers for every role in this guild.')
        .catch(console.error);

    let messageContent = '';

    const roles = [];
    interaction.guild.roles.cache.each(value =>
        roles.push(value),
    );

    const guildRoleManager = interaction.guild.roles;
    const guildMemberManager = interaction.guild.members;

    for (const roleIdx in roles) {
        if (roles[roleIdx].name === '@everyone' || roles[roleIdx].managed) {
            continue;
        }

        let roleManagers;
        await keyv.get(`role/${interaction.guildId}/${roles[roleIdx].id}/manager`)
            .then(ret => roleManagers = ret);

        if (!roleManagers) {
            await interaction.followUp(`${roles[roleIdx].name}: no managers`)
                .catch(console.error);
            continue;
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

        messageContent = `${roles[roleIdx].name}:\nManager users: ${managerUsers}\nManager roles: ${managerRoles}`;
        await interaction.followUp(messageContent)
            .catch(console.error);
    }

    await interaction.followUp('I\'ve reached the end of the role list!')
        .catch(console.error);

    return;
};