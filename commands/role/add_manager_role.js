const { keyv } = require('../../index');

const { parentLogger } = require('../../logger');
const logger = parentLogger.child({ module: 'commands-role_add-manager-role' });

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

    if (!roleManagers.roles.includes(interaction.options.getRole('manager_role').id)) {
        roleManagers.roles.push(interaction.options.getRole('manager_role').id);
    }

    await keyv.set(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`, roleManagers);

    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);

    if (roleManagers.roles.includes(interaction.options.getRole('manager_role').id)) {
        const msg = `Successfully added manager role ${interaction.options.getRole('manager_role').toString()} to ${interaction.options.getRole('role').toString()}`;
        logger.info(msg);
        await interaction.editReply(msg).catch(err => logger.error(err));
    }
    else {
        const msg = `DB error: Could not add manager role ${interaction.options.getRole('manager_role').toString()} to ${interaction.options.getRole('role').toString()}`;
        logger.error(msg);
        await interaction.editReply(msg).catch(err => logger.error(err));
    }

    return;
};