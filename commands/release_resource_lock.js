const { SlashCommandBuilder } = require('@discordjs/builders');
const { unlink } = require('fs').promises;

const { parentLogger } = require('../logger');
const logger = parentLogger.child({ module: 'commands-release_resource_lock' });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resource_lock_release')
        .setDescription('Release a resource lock with a specific name.')
        .addStringOption(option =>
            option.setName('resource_lock_name')
                .setDescription('The name of the resource lock to release.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('resource_lock_arg1')
                .setDescription('First argument specifically describing the resource lock.')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();

        if (!interaction.options.getString('resource_lock_name')) {
            await interaction.editReply('You did not provide the resource lock name.')
                .catch(err => logger.error(err));
            return;
        }

        let lockName = 'lock-' + interaction.options.getString('resource_lock_name') + '-' + interaction.guild.id;

        if (interaction.options.getString('resource_lock_arg1')) {
            lockName += '-' + interaction.options.getString('resource_lock_arg1');
        }

        let unlockSuccess = true;
        await unlink(lockName).catch((err) => {
            unlockSuccess = false;
            logger.error(err);
        });

        if (unlockSuccess) {
            await interaction.editReply('I successfully released this resource lock.')
                .catch(err => logger.error(err));
        }
        else {
            await interaction.editReply('I failed to release this resource lock.')
                .catch(err => logger.error(err));
        }
    },
};
