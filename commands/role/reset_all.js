const { keyv } = require('../../index');

const { parentLogger } = require('../../logger');
const logger = parentLogger.child({ module: 'commands-role_reset-all' });

module.exports.execute = async function(interaction) {
    // remove all managers from all roles in a guild

    if (!interaction.options.getString('confirm')) {
        await interaction.editReply('Please provide confirmation to start the resetting process for all roles in this guild.')
            .catch(err => logger.error(err));
    }
    else {
        const roles = [];
        interaction.guild.roles.cache.each(value =>
            roles.push(value),
        );
        for (const role in roles) {
            await keyv.set(`role/${interaction.guildId}/${roles[role].id}/manager`, undefined);
        }
        const msg = 'Cleared all managers from all roles in ';
        logger.info(msg + `guild ${interaction.guildId}`);
        await interaction.editReply(msg + 'this guild.').catch(err => logger.error(err));
    }

    return;
};