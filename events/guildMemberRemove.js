const { keyv } = require("../index");
const { userMention } = require("discord.js");

const { parentLogger } = require("../logger");
const logger = parentLogger.child({ module: "events-guildMemberRemove" });

module.exports = {
    name: "guildMemberRemove",
    async execute(member) {
        const settings = await getLeaveMsgSettings(member.guild.id);
        if (!settings || !settings.flag) {
            return;
        }

        const msg = `${userMention(member.id)} (${
            member.id
        }) has left the server.`;
        logger.info(msg);
        await member.guild.systemChannel
            .send(msg)
            .catch((err) => logger.error(err));
        return;
    },
};

async function getLeaveMsgSettings(guildId) {
    let enabled;
    const VOICE_REGIONS_SETTINGS_KEY_URL = `leave-msg/${guildId}/settings`;
    await keyv
        .get(VOICE_REGIONS_SETTINGS_KEY_URL)
        .then((ret) => (enabled = ret));
    if (!enabled) {
        return false;
    }
    return enabled;
}
