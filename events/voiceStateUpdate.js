const { keyv } = require('../index');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const accordionSettings = await getAccordionSettings(oldState, newState);
        if (!accordionSettings || !accordionSettings.flag) {
            return;
        }

        const baseIsAfk = accordionSettings.baseIsAfk;
        const voiceAccordionCategoryId = accordionSettings.category.id;

        // remove any accordion expand channels with no members left,
        // leaving empty accordion base channel(s),
        // accordion expand channels with users in them,
        // and empty accordion ignore channel(s) (if any)
        if (oldState.channel) {
            const emptyAccordionExpandChannels = [];
            oldState.guild.channels.cache.filter(channel =>
                channel.type === 'GUILD_VOICE'
                && channel.parentId === voiceAccordionCategoryId
                && isAccordionExpandChannel(channel.name, accordionSettings)
                && (channel.members.size === 0),
            ).each(channel =>
                emptyAccordionExpandChannels.push(channel),
            );

            let numChannelsRemoved;
            if (
                (oldState.guild.channels.cache.filter(
                    (channel) =>
                        channel.type === 'GUILD_VOICE'
                        && channel.parentId === voiceAccordionCategoryId
                        && channel.members.size === 0
                        && isAccordionBaseChannel(channel.name, accordionSettings),
                ).size === 0) ||
                (baseIsAfk && (oldState.guild.channels.cache.filter(
                    (channel) =>
                        channel.type === 'GUILD_VOICE'
                        && channel.parentId === voiceAccordionCategoryId
                        && channel.members.size > 0
                        && isAccordionExpandChannel(channel.name, accordionSettings),
                ).size > 0))
            ) {
                // all base channels have at least one participant
                // OR (for an afk base) all expand channels have at least one participant
                // leave one empty expand channel reserved
                numChannelsRemoved = emptyAccordionExpandChannels.length - 1;
            }
            else {
                // some base channels have no participants
                // delete all empty expand channels
                numChannelsRemoved = emptyAccordionExpandChannels.length;
            }

            for (let i = 0; i < numChannelsRemoved; i++) {
                const oldChannelName = emptyAccordionExpandChannels[i].name;
                await emptyAccordionExpandChannels[i].delete()
                    .catch(console.error);

                // put name back into expand
                accordionSettings.expand.push(oldChannelName);
            }

            await setSettings(oldState.guild.id, accordionSettings);
        }

        // check if any accordion channels are empty and if the maximum accordion limit is filled.
        // then create another voice channel in the accordion if these conditions are met.

        // alternatively if all expand channels have at least 1 person when base ch is AFK, then generate
        // another expand channel.
        if (newState.channel
            && ((newState.guild.channels.cache.filter(
                (channel) =>
                    channel.type === 'GUILD_VOICE'
                    && channel.parentId === voiceAccordionCategoryId
                    && channel.members.size === 0
                    && isAccordionBaseOrExpandChannel(channel.name, accordionSettings),
            ).size === 0)
                 || (baseIsAfk && newState.guild.channels.cache.filter(
                     (channel) =>
                         channel.type === 'GUILD_VOICE'
                        && channel.parentId === voiceAccordionCategoryId
                        && channel.members.size === 0
                        && isAccordionExpandChannel(channel.name, accordionSettings),
                 ).size === 0
                 ))
            && newState.guild.channels.cache.filter(
                (channel) =>
                    channel.type === 'GUILD_VOICE'
                    && channel.parentId === voiceAccordionCategoryId,
            ).size < (accordionSettings.base.length
                + accordionSettings.expandSize + accordionSettings.ignore.length)
        ) {
            const checkIfAccordionChannel = isAccordionBaseOrExpandChannel(newState.channel.name,
                accordionSettings);
            if (checkIfAccordionChannel
                && newState.channel.parentId === voiceAccordionCategoryId
                && newState.channel.type === 'GUILD_VOICE') {

                // pull name out from expand
                const newVoiceChannelName = accordionSettings.expand.pop();

                // const newVoiceChannel =
                // await newState.channel.clone({
                //     position: newState.channel.rawPosition,
                //     name: `${newVoiceChannelName}`,
                //     bitrate: newState.guild.maximumBitrate,
                // }).catch(console.error);

                let categoryChannel;
                newState.guild.channels.fetch(accordionSettings.category.id)
                    .then(fetched => categoryChannel = fetched)
                    .catch(console.error);

                newState.guild.channels.create(`${newVoiceChannelName}`, {
                    type: 'GUILD_VOICE',
                    bitrate: newState.guild.maximumBitrate,
                }).then(channel =>
                    channel.setParent(categoryChannel),
                ).catch(console.error);

                await setSettings(newState.guild.id, accordionSettings);
            }
        }

        return;
    },
};

function isAccordionExpandChannel(chName, accordionSettings) {
    return (accordionSettings.expandList.includes(chName));
}

function isAccordionBaseChannel(chName, accordionSettings) {
    return (accordionSettings.base.includes(chName));
}

function isAccordionBaseOrExpandChannel(chName, accordionSettings) {
    return (accordionSettings.expandList.includes(chName))
    || (accordionSettings.base.includes(chName));
}

async function setSettings(guildId, accordionSettings) {
    const VOICE_ACCORDION_AVAILABLE_URL = `voice-accordion/${guildId}/settings`;
    await keyv.set(VOICE_ACCORDION_AVAILABLE_URL, accordionSettings);
    return;
}

async function getAccordionSettings(oldState, newState) {
    let guildId;
    if (oldState.channel) {
        guildId = oldState.guild.id;
    }
    else if (newState.channel) {
        guildId = newState.guild.id;
    }
    else {
        return false;
    }

    let enabled;
    const VOICE_ACCORDION_SETTINGS_KEY_URL = `voice-accordion/${guildId}/settings`;
    await keyv.get(VOICE_ACCORDION_SETTINGS_KEY_URL)
        .then(ret => enabled = ret);
    if (!enabled) {
        return false;
    }
    return enabled;
}
