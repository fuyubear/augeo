const { keyv } = require('../../index');
const { userMention, roleMention } = require('discord.js');

const { parentLogger } = require('../../logger');
const logger = parentLogger.child({ module: 'commands-role_view-all-managers' });

module.exports.execute = async function(interaction) {
    await interaction.editReply('Here are all of the managers for every role in this guild.')
        .catch(err => logger.error(err));

    let messageContent = '';

    await interaction.guild.members.fetch()
        // .then(console.log)
        .catch(err => logger.error(err));

    await interaction.guild.roles.fetch()
        // .then(console.log)
        .catch(err => logger.error(err));

    const roles = [];
    interaction.guild.roles.cache.each(value =>
        roles.push(value),
    );

    for (const roleIdx in roles) {
        if (roles[roleIdx].name === '@everyone' || roles[roleIdx].managed) {
            continue;
        }

        let roleManagers;
        await keyv.get(`role/${interaction.guildId}/${roles[roleIdx].id}/manager`)
            .then(ret => roleManagers = ret);

        if (!roleManagers) {
            await interaction.followUp(`${roles[roleIdx].name}: no managers`)
                .catch(err => logger.error(err));
            continue;
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

        messageContent = `${roles[roleIdx].name}:\nManager users: ${managerUsers}\nManager roles: ${managerRoles}`;
        await interaction.followUp(messageContent)
            .catch(err => logger.error(err));
    }

    await interaction.followUp('I\'ve reached the end of the role list!')
        .catch(err => logger.error(err));

    return;
};