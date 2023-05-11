const { keyv } = require('../../index');

const { parentLogger } = require('../../logger');
const logger = parentLogger.child({ module: 'commands-role_add-manager' });

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

    if (!roleManagers.users.includes(interaction.options.getMember('manager').id)) {
        roleManagers.users.push(interaction.options.getMember('manager').id);
    }

    await keyv.set(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`, roleManagers);

    await keyv.get(`role/${interaction.guildId}/${interaction.options.getRole('role').id}/manager`)
        .then(ret => roleManagers = ret);

    if (roleManagers.users.includes(interaction.options.getMember('manager').id)) {
        const msg = `Successfully added manager user ${interaction.options.getMember('manager').toString()} to ${interaction.options.getRole('role').toString()}`;
        // PRIVACY: logger.info(msg);
        await interaction.editReply(msg).catch(err => logger.error(err));
    }
    else {
        const msg = `DB error: Could not add manager user ${interaction.options.getMember('manager').toString()} to ${interaction.options.getRole('role').toString()}`;
        // PRIVACY: logger.error(msg);
        logger.error('DB error: Could not add manager user to role');
        await interaction.editReply(msg).catch(err => logger.error(err));
    }

    return;
};