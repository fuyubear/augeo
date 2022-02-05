const { keyv } = require('../index');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        const settings = await getLeaveMsgSettings(member.guild.id);
        if (!settings || !settings.flag) {
            return;
        }

        await member.guild.systemChannel.send(
            `${member.user.tag} has left ${member.guild.name}.`,
        ).catch(console.error);
        return;
    },
};

async function getLeaveMsgSettings(guildId) {
    let enabled;
    const VOICE_REGIONS_SETTINGS_KEY_URL = `leave-msg/${guildId}/settings`;
    await keyv.get(VOICE_REGIONS_SETTINGS_KEY_URL)
        .then(ret => enabled = ret);
    if (!enabled) {
        return false;
    }
    return enabled;
}