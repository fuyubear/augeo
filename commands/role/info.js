const { keyv } = require('../../index');
const { userMention, roleMention } = require('discord.js');

const { parentLogger } = require('../../logger');
const logger = parentLogger.child({ module: 'commands-role_info' });

module.exports.execute = async function(interaction) {
    if (interaction.options.getRole('role').name === '@everyone') {
        await interaction.editReply('The `@everyone` role cannot be viewed.')
            .catch(err => logger.error(err));
        return;
    }

    await interaction.guild.members.fetch()
        // .then(console.log)
        .catch(err => logger.error(err));

    // get role and print the information out
    let roleMembers = [];
    const roleMemberIds = interaction.options.getRole('role').members.keys();
    for (const id of roleMemberIds) {
        roleMembers.push(userMention(id));
    }
    if (roleMembers.length === 0) {
        roleMembers = 'None';
    }

    let roleManagers;
    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);

    if (!roleManagers) {
        await interaction.editReply(`There are no managers for this role.\nRole members: ${roleMembers}`)
            .catch(err => logger.error(err));
        return;
    }

    let managerUsers = [];
    for (const managerUserIdx in roleManagers.users) {
        managerUsers.push(userMention(roleManagers.users[managerUserIdx]));
    }
    if (managerUsers.length === 0) {
        managerUsers = 'None';
    }

    let managerRoles = [];
    for (const managerRoleIdx in roleManagers.roles) {
        managerRoles.push(roleMention(roleManagers.roles[managerRoleIdx]));
    }
    if (managerRoles.length === 0) {
        managerRoles = 'None';
    }

    const outputString = `${interaction.options.getRole('role').name}:\nManager users: ${managerUsers}\nManager roles: ${managerRoles}\nRole members: ${roleMembers}`;

    await interaction.editReply(outputString).catch(err => logger.error(err));
    return;
};