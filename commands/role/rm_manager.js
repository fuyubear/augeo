const { keyv } = require('../../index');

const { parentLogger } = require('../../logger');
const logger = parentLogger.child({ module: 'commands-role_rm-manager' });

module.exports.execute = async function(interaction) {
    // remove manager user from role
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
    if (roleManagers.users.includes(interaction.options.getMember('manager').id)) {
        isRemoved = roleManagers.users.splice(roleManagers.users.indexOf(interaction.options.getMember('manager').id), 1);
    }
    else {
        const msg = `${interaction.options.getMember('manager').toString()} already does not manage ${interaction.options.getRole('role').toString()}`;
        // PRIVACY: logger.info(msg);
        await interaction.editReply(msg).catch(err => logger.error(err));
        return;
    }

    await keyv.set(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`, roleManagers);

    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);

    if (isRemoved && !(roleManagers.users.includes(interaction.options.getMember('manager').id))) {
        const msg = `Successfully removed manager ${interaction.options.getMember('manager').toString()} from ${interaction.options.getRole('role').toString()}`;
        // PRIVACY: logger.info(msg);
        await interaction.editReply(msg).catch(err => logger.error(err));
    }
    else {
        const msg = `DB error: Failed to remove manager ${interaction.options.getMember('manager').toString()} from ${interaction.options.getRole('role').toString()}`;
        // PRIVACY: logger.error(msg);
        logger.error('DB error: Could not remove manager user to role');
        await interaction.editReply(msg).catch(err => logger.error(err));
    }

    return;
};