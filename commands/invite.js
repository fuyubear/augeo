const { SlashCommandBuilder } = require('@discordjs/builders');

const { parentLogger } = require('../logger');
const logger = parentLogger.child({ module: 'commands-invite' });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Create a single-use server invite that lasts for 7 days.')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Optionally add a reason for creating this server invite')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();

        let reason = interaction.options.getString('reason');
        const channel = interaction.channel;

        if (reason) {
            reason = `User ${interaction.user.id} created this invite: ` + reason;
        }
        else {
            reason = `User ${interaction.user.id} created this invite.`;
        }

        let inviteSuccess = true;
        let inviteObj;
        await channel.createInvite({ maxAge: 604800, maxUses: 1, unique: true, reason: reason })
            .then(invite => inviteObj = invite)
            .catch((err) => {
                inviteSuccess = false;
                logger.error(err);
            });

        if (inviteSuccess === true) {
            // const msg = `A single-use 7 day server invite ${inviteObj.code} was created by user ${interaction.user.id}. Audit log reason: "${reason}"`;
            // PRIVACY: logger.info(msg);
            await interaction.editReply('I\'ve successfully created a single-use '
                + `7 day server invite with invite code: ${inviteObj.code}`)
                .catch(err => logger.error(err));
        }
        else {
            const msg = 'I\'ve failed to create an invite. Please make sure I have the permissions to create an invite.';
            logger.error(msg);
            await interaction.editReply(msg).catch(err => logger.error(err));
        }

        return;
    },
};