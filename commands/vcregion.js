const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');
const { keyv } = require('../index');

// const voiceRegionDict = {
//     'auto': { 'name': 'Auto', 'emoji': '🌐' },
//     'us-east': { 'name': 'New York City (US East)', 'emoji': '🗽' },
//     'us-central': { 'name': 'Chicago (US Central)', 'emoji': '🏙️' },
//     'us-south': { 'name': 'Dallas (US South)', 'emoji': '🤠' },
//     'us-west': { 'name': 'California (US West)', 'emoji': '🌅' },
//     'japan': { 'name': 'Japan', 'emoji': '🇯🇵' },
//     'hongkong': { 'name': 'Hong Kong', 'emoji': '🇭🇰' },
//     'europe': { 'name': 'Europe', 'emoji': '🇪🇺' },
//     'sydney': { 'name': 'Australia (Sydney)', 'emoji': '🇦🇺' },
//     'india': { 'name': 'India', 'emoji': '🇮🇳' },
//     'singapore': { 'name': 'Singapore', 'emoji': '🇸🇬' },
//     'southafrica': { 'name': 'South Africa', 'emoji': '🇿🇦' },
//     'brazil': { 'name': 'Brazil', 'emoji': '🇧🇷' },
//     'russia': { 'name': 'Russia', 'emoji': '🇷🇺' },
// };

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vcregion')
        .setDescription('Manage voice channel region overrides. Only use if necessary.')
        .addSubcommand(subcommand =>
            subcommand.setName('view')
                .setDescription('View a voice channel\'s region override.')
                .addChannelOption(option =>
                    option.setName('voice_channel')
                        .setDescription('Pick the voice channel to view its region override.')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice),
                ))
        .addSubcommand(subcommand =>
            subcommand.setName('edit')
                .setDescription('Edit a voice channel\'s voice region.')
                .addChannelOption(option =>
                    option.setName('voice_channel')
                        .setDescription('Pick the voice channel to edit.')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice))
                .addStringOption(option =>
                    option.setName('voice_region')
                        .setRequired(true)
                        .setDescription('Pick the voice region for the channel')
                        .addChoices(
                            { name: '🌐 Auto', value: 'auto' },
                            { name: '🗽 New York City (US East)', value: 'us-east' },
                            { name: '🏙️ Chicago (US Central)', value: 'us-central' },
                            { name: '🤠 Dallas (US South)', value: 'us-south' },
                            { name: '🌅 California (US West)', value: 'us-west' },
                            { name: '🇯🇵 Japan', value: 'japan' },
                            { name: '🇭🇰 Hong Kong', value: 'hongkong' },
                            { name: '🇳🇱 Rotterdam', value: 'rotterdam' },
                            { name: '🇦🇺 Sydney', value: 'sydney' },
                            { name: '🇮🇳 India', value: 'india' },
                            { name: '🇸🇬 Singapore', value: 'singapore' },
                            { name: '🇿🇦 South Africa', value: 'southafrica' },
                            { name: '🇧🇷 Brazil', value: 'brazil' },
                            { name: '🇷🇺 Russia', value: 'russia' },
                        ),
                ),
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const settings = await getSettings(interaction.guildId);
        if (!settings || !settings.flag) {
            await interaction.editReply('This command and its functionality is disabled.')
                .catch(console.error);
            return;
        }

        const voiceChannel = interaction.options.getChannel('voice_channel');
        const basicVoiceChannelName = voiceChannel.name;

        let regionVal = interaction.options.getString('voice_region');
        let regionValName = regionVal;

        if (interaction.options.getSubcommand() === 'view') {
            regionValName = voiceChannel.rtcRegion;
            if (regionValName === null) {
                regionValName = 'Automatic';
            }
            await interaction.editReply({
                content: 'The voice channel region override for '
                        + `${basicVoiceChannelName} is ${regionValName}.`,
                components: [] })
                .catch(console.error);
            return;
        }

        if (regionVal === 'auto') {
            regionVal = null;
        }

        await interaction.editReply({
            content: 'I\'m switching the region for voice channel '
                    + `${basicVoiceChannelName} to the ${regionValName} region...`,
            components: [] })
            .catch(console.error);

        let editSuccess = true;
        await voiceChannel.edit({
            name: `${basicVoiceChannelName}`,
            rtcRegion: regionVal,
            reason: `Edited by a user with author ID: ${interaction.member.id}` })
            .catch((err) => {
                editSuccess = false;
                console.error(err);
            });

        if (editSuccess === true) {
            await interaction.editReply({
                content: 'I\'ve successfully switched the region for voice channel '
                        + `${basicVoiceChannelName} to the ${regionValName} region!`,
                components: [] })
                .catch(console.error);
        }
        else {
            await interaction.editReply({
                content: 'I\'ve failed to switch the region for voice channel '
                        + `${basicVoiceChannelName} to the ${regionValName} region.`,
                components: [] })
                .catch(console.error);
        }
    },
};

async function getSettings(interactionGuildId) {
    let enabled;
    const VOICE_REGIONS_SETTINGS_KEY_URL = `voice-regions/${interactionGuildId}/settings`;
    await keyv.get(VOICE_REGIONS_SETTINGS_KEY_URL)
        .then(ret => enabled = ret);
    if (!enabled) {
        return false;
    }
    return enabled;
}