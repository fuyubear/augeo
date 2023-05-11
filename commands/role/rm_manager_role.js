const { keyv } = require('../../index');

const { parentLogger } = require('../../logger');
const logger = parentLogger.child({ module: 'commands-role_rm-manager-role' });

module.exports.execute = async function(interaction) {
    // remove manager role from role
    let roleManagers;
    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);
    if (!roleManagers) {
        const msg = `There are no managers for ${interaction.options.getRole('role').toString()}`;
        logger.info(msg);
        await interaction.editReply(msg).catch(err => logger.error(err));
        return;
    }

    let isRemoved = false;
    if (roleManagers.roles.includes(interaction.options.getRole('manager_role').id)) {
        isRemoved = roleManagers.roles.splice(roleManagers.roles.indexOf(interaction.options.getRole('manager_role').id), 1);
    }
    else {
        const msg = `${interaction.options.getRole('manager_role').toString()} already does not manage ${interaction.options.getRole('role').toString()}`;
        logger.info(msg);
        await interaction.editReply(msg).catch(err => logger.error(err));
        return;
    }

    await keyv.set(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`, roleManagers);

    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);

    if (isRemoved && !(roleManagers.roles.includes(interaction.options.getRole('manager_role').id))) {
        const msg = `Successfully removed manager role ${interaction.options.getRole('manager_role').toString()} from ${interaction.options.getRole('role').toString()}`;
        logger.info(msg);
        await interaction.editReply(msg).catch(err => logger.error(err));
    }
    else {
        const msg = `DB error: Failed to remove manager role ${interaction.options.getRole('manager_role').toString()} from ${interaction.options.getRole('role').toString()}`;
        logger.error(msg);
        await interaction.editReply(msg).catch(err => logger.error(err));
    }

    return;
};