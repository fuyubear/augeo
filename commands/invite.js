const { SlashCommandBuilder } = require('@discordjs/builders');
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

        let inviteObj;
        await channel.createInvite({ maxAge: 604800, maxUses: 1, unique: true, reason: reason })
            .then(invite => inviteObj = invite)
            .catch(console.error);

        await interaction.editReply('I\'ve successfully created a single-use '
            + `7 day server invite with invite code: ${inviteObj.code}`)
            .catch(console.error);

        return;
    },
};