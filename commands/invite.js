const { SlashCommandBuilder } = require('@discordjs/builders');
const { existsSync, appendFile } = require('fs');
const { unlink } = require('fs').promises;

const { keyv } = require('../index');
const { parentLogger } = require('../logger');
const logger = parentLogger.child({ module: 'commands-invite' });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Create a single-use server invite.')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Add a reason for creating this server invite. May be required.')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();

        const channel = interaction.channel;
        const timestamp = Math.floor(Date.now() / 1000);

        let userInviteGuildSettings;
        const USER_INVITE_GUILD_KEY_URL = `user-invite/${interaction.guildId}/settings`;
        await keyv.get(USER_INVITE_GUILD_KEY_URL)
            .then(ret => userInviteGuildSettings = ret)
            .catch(err => logger.error(err));

        if (!userInviteGuildSettings) {
            // await interaction.editReply('The config_invite slash command must be run before this command can be used. Contact your bot admin to fix this.')
            //     .catch(err => logger.error(err));
            userInviteGuildSettings = {
                expireAfter: 604800,
                requireReason: false,
                useLimit: 0,
                useExpiration: 0,
            };
        }

        const instanceLogPrefix = 'Invite Run ID [' + interaction.guildId + '-' + interaction.member.id + '-' + timestamp + ']';

        logger.info(instanceLogPrefix + ' Starting Invite processing.');

        const lockFileName = 'lock-invite-' + interaction.guildId + '-' + interaction.member.id;

        // Only 1 request should be processed at any time per guild and user.
        let acquiredLock = false;
        while (!acquiredLock) {
            await getLock(lockFileName, instanceLogPrefix)
                .then(val => acquiredLock = val)
                .catch(err => logger.error(err));
        }

        let userInviteUserState;
        const USER_INVITE_USER_STATE_KEY_URL = `user-invite/${interaction.guildId}/user/${interaction.member.id}`;
        await keyv.get(USER_INVITE_USER_STATE_KEY_URL)
            .then(ret => userInviteUserState = ret)
            .catch(err => logger.error(err));

        if (!userInviteUserState) {
            userInviteUserState = {
                uses: [],
            };
        }

        // Update user state
        for (let i = 0; i < userInviteUserState.uses.length; i++) {
            if (userInviteUserState.uses[i] + userInviteGuildSettings.useExpiration <= timestamp) {
                userInviteUserState.uses.splice(i, 1);
                i--;
            }
        }
        await keyv.set(USER_INVITE_USER_STATE_KEY_URL, userInviteUserState).catch(err => logger.error(err));

        // Make sure invites are available for use.
        if (userInviteGuildSettings.useLimit > 0 && userInviteUserState.uses.length >= userInviteGuildSettings.useLimit) {
            const secondsUntilNextUse = userInviteUserState.uses[0] + userInviteGuildSettings.useExpiration - timestamp;
            await interaction.editReply('You have used your entire invite creation allotment. You must wait '
                + secondsUntilNextUse + ' seconds before you can create another invite or ask someone else to create one for you.')
                .catch(err => logger.error(err));
            await unlink(lockFileName).catch(err => logger.error(err));
            logger.info(instanceLogPrefix + ' Ending Invite processing.');
            return;
        }


        let reason = interaction.options.getString('reason');
        if (userInviteGuildSettings.requireReason && reason == null) {
            await interaction.editReply('You must provide the reason you\'re creating the invite.')
                .catch(err => logger.error(err));
            await unlink(lockFileName).catch(err => logger.error(err));
            logger.info(instanceLogPrefix + ' Ending Invite processing.');
            return;
        }

        if (reason) {
            reason = `User ${interaction.user.id} created this invite: ` + reason;
        }
        else {
            reason = `User ${interaction.user.id} created this invite.`;
        }

        let inviteSuccess = true;
        let inviteObj;
        await channel.createInvite({ maxAge: userInviteGuildSettings.expireAfter, maxUses: 1, unique: true, reason: reason })
            .then(invite => inviteObj = invite)
            .catch((err) => {
                inviteSuccess = false;
                logger.error(err);
            });

        if (inviteSuccess === true) {
            // const msg = `A single-use 7 day server invite ${inviteObj.code} was created by user ${interaction.user.id}. Audit log reason: "${reason}"`;
            // PRIVACY: logger.info(msg);
            await interaction.editReply('I\'ve successfully created a single-use '
                + `server invite with invite code: ${inviteObj.code}. This code expires in ${userInviteGuildSettings.expireAfter} seconds.`)
                .catch(err => logger.error(err));

            // Count the invite use and then save it.
            // Should ensure the array is ordered from lowest (earliest) use to highest (latest) use.
            userInviteUserState.uses.push(timestamp);
            await keyv.set(USER_INVITE_USER_STATE_KEY_URL, userInviteUserState).catch(err => logger.error(err));
        }
        else {
            const msg = 'I\'ve failed to create an invite. Please make sure I have the permissions to create an invite.';
            logger.error(msg);
            await interaction.editReply(msg).catch(err => logger.error(err));
        }

        await unlink(lockFileName).catch(err => logger.error(err));
        logger.info(instanceLogPrefix + ' Ending Invite processing.');
        return;
    },
};

async function getLock(lockName, instanceLogPrefix) {
    if (existsSync(lockName)) {
        logger.info(instanceLogPrefix + ' Waiting 1 second for lock ' + lockName);
        await new Promise(r => setTimeout(r, 1000));
        return false;
    }
    else {
        appendFile(lockName, lockName, function(err) {
            if (err) return err;
        });
        return true;
    }
}
