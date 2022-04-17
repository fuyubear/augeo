const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord-api-types/v9');
const { ring, ringEnabled, botAdminIds } = require('../config.json');
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
                        .addChannelTypes([ChannelType.GuildVoice, ChannelType.GuildStageVoice]),
                ))
        .addSubcommand(subcommand =>
            subcommand.setName('edit')
                .setDescription('Edit a voice channel\'s voice region.')
                .addChannelOption(option =>
                    option.setName('voice_channel')
                        .setDescription('Pick the voice channel to edit.')
                        .setRequired(true)
                        .addChannelTypes([ChannelType.GuildVoice, ChannelType.GuildStageVoice]))
                .addStringOption(option =>
                    option.setName('voice_region')
                        .setRequired(true)
                        .setDescription('Pick the voice region for the channel')
                        .addChoice('🌐 Auto', 'auto')
                        .addChoice('🗽 New York City (US East)', 'us-east')
                        .addChoice('🏙️ Chicago (US Central)', 'us-central')
                        .addChoice('🤠 Dallas (US South)', 'us-south')
                        .addChoice('🌅 California (US West)', 'us-west')
                        .addChoice('🇯🇵 Japan', 'japan')
                        .addChoice('🇭🇰 Hong Kong', 'hongkong')
                        .addChoice('🇪🇺 Europe', 'europe')
                        .addChoice('🇦🇺 Sydney', 'sydney')
                        .addChoice('🇮🇳 India', 'india')
                        .addChoice('🇸🇬 Singapore', 'singapore')
                        .addChoice('🇿🇦 South Africa', 'southafrica')
                        .addChoice('🇧🇷 Brazil', 'brazil')
                        .addChoice('🇷🇺 Russia', 'russia')),
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
                content: `The voice channel region override for ${basicVoiceChannelName} is ${regionValName}.`,
                components: [] })
                .catch(console.error);
            return;
        }

        // really awful way to enforce command permissions
        // until Discord releases slash command permissions
        if ((ringEnabled && ring[1] && !interaction.member.roles.cache.has(ring[1]))
            && ((interaction.guild.ownerId !== interaction.member.id)
            && (!(botAdminIds.includes(interaction.member.id))))) {
            await interaction.editReply('You do not have permission to edit Voice Channel regions.')
                .catch(console.error);
            return;
        }

        if (regionVal === 'auto') {
            regionVal = null;
        }

        await interaction.editReply({
            content: `I'm switching the region for voice channel ${basicVoiceChannelName} to the ${regionValName} region...`,
            components: [] })
            .catch(console.error);

        await voiceChannel.edit({
            name: `${basicVoiceChannelName}`,
            rtcRegion: regionVal }, `Edited by a user with author ID: ${interaction.member.id}`)
            .catch(console.error);

        await interaction.editReply({
            content: `I've successfully switched the region for voice channel ${basicVoiceChannelName} to the ${regionValName} region!`,
            components: [] })
            .catch(console.error);

        return;
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