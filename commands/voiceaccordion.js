const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');
const { keyv } = require('../index');

const { parentLogger } = require('../logger');
const logger = parentLogger.child({ module: 'commands-voiceaccordion' });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voiceaccordion')
        .setDescription('Bot admin(s) only. '
        + 'Toggle the voice accordion feature.')
        .addChannelOption(option =>
            option.setName('category_channel')
                .setDescription('Pick an empty category channel where the voice accordion will exist.')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildCategory))
        .addStringOption(option =>
            option.setName('base_ch_name')
                .setDescription('Unique name of the '
                + 'base voice channel to create for this accordion.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('expand_ch_names')
                .setDescription('Delimiter (default: comma) separated list of '
                + 'unique names of this accordion\'s expansion channels.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('expand_ch_names_delimiter')
                .setDescription('Delimiter to separate channel names '
                + 'in expand_ch_names.')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('is_cycle')
                .setDescription('Are channel names pulled from the front of the expand_ch list?')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('is_v2')
                .setDescription('Track expand channels by ID?')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('extra_ch_names')
                .setDescription('Comma-separated list of '
                + 'names of non-base, non-expand voice channels created in this category.')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();

        let accordionSettings;
        const VOICE_ACCORDION_KEY_URL = `voice-accordion/${interaction.guildId}/settings`;
        await keyv.get(VOICE_ACCORDION_KEY_URL)
            .then(ret => accordionSettings = ret);
        if (!accordionSettings || !accordionSettings.enabled) {
            const voiceAccordionCategory = interaction.options.getChannel('category_channel');
            const voiceAccordionBase = interaction.options.getString('base_ch_name');
            let dynamicVoiceChannelNames = interaction.options.getString('expand_ch_names');
            let delimiter = interaction.options.getString('expand_ch_names_delimiter');
            let voiceAccordionIgnore = interaction.options.getString('extra_ch_names');
            const voiceAccordionIsCycle = interaction.options.getBoolean('is_cycle');
            const voiceAccordionIsVersion2 = interaction.options.getBoolean('is_v2');

            if (!voiceAccordionBase || !voiceAccordionCategory || !dynamicVoiceChannelNames) {
                await interaction.editReply('Voice accordion is currently disabled. '
                + 'Please provide a category channel, a base channel name, and (an) expand channel name(s) to enable it.')
                    .catch(err => logger.error(err));
                return;
            }

            if (!delimiter) {
                delimiter = ',';
            }
            dynamicVoiceChannelNames = dynamicVoiceChannelNames.split(delimiter);
            if (!voiceAccordionIsVersion2) {
                dynamicVoiceChannelNames = dynamicVoiceChannelNames.reverse();
            }
            const voiceAccordionExpandSize = dynamicVoiceChannelNames.length;

            if (voiceAccordionIgnore) {
                voiceAccordionIgnore = voiceAccordionIgnore.split(',');
            }
            else {
                voiceAccordionIgnore = [];
            }

            accordionSettings = {
                enabled: true,
                guildId: interaction.guildId,
                v2: voiceAccordionIsVersion2,
                category: voiceAccordionCategory,
                base: voiceAccordionBase,
                expandSize: voiceAccordionExpandSize,
                cycle: voiceAccordionIsCycle,
                cycleIdx: 0,
            };

            if (voiceAccordionIsVersion2) {
                // accordionSettings.expand = {channelName = channel_id};
                // ^ where channel_id is either 0 (non-existent) or has a valid channel ID
                accordionSettings.expand = {};
                for (const dynamicVoiceChannelName of dynamicVoiceChannelNames) {
                    accordionSettings.expand[dynamicVoiceChannelName] = 0;
                }
            }
            else {
                accordionSettings.expand = dynamicVoiceChannelNames;
            }

            await keyv.set(VOICE_ACCORDION_KEY_URL, accordionSettings);
            await keyv.get(VOICE_ACCORDION_KEY_URL)
                .then(ret => accordionSettings = ret);
            if (accordionSettings.enabled) {
                let categoryCh;
                await interaction.guild.channels.fetch(voiceAccordionCategory.id)
                    .then(ret => categoryCh = ret);

                let newVoiceChannelName;
                newVoiceChannelName = voiceAccordionBase;

                await categoryCh.children.create({
                    name: newVoiceChannelName,
                    type: ChannelType.GuildVoice,
                    bitrate: interaction.guild.maximumBitrate,
                }).catch(err => logger.error(err));

                if (voiceAccordionIgnore) {
                    for (let i = 0; i < voiceAccordionIgnore.length; i++) {
                        newVoiceChannelName = voiceAccordionIgnore[i];

                        await categoryCh.children.create({
                            name: newVoiceChannelName,
                            type: ChannelType.GuildVoice,
                            bitrate: interaction.guild.maximumBitrate,
                        }).catch(err => logger.error(err));
                    }
                }

                logger.info(`Voice accordion is enabled for guild ${interaction.guildId}`);

                await interaction.editReply('Voice accordion is enabled. '
                + '**Do not delete any base channels. '
                + 'Otherwise you will need to disable, then reenable the voice accordion '
                + 'for it to work well again.** If needed, edit appropriate permissions '
                + 'for ignored channels.')
                    .catch(err => logger.error(err));
                return;
            }
        }
        else if (accordionSettings.enabled) {
            await keyv.set(VOICE_ACCORDION_KEY_URL, {
                enabled: false,
            });
            await keyv.get(VOICE_ACCORDION_KEY_URL)
                .then(ret => accordionSettings = ret);
            if (!accordionSettings.enabled) {
                logger.info(`Voice accordion is disabled for guild ${interaction.guildId}`);
                await interaction.editReply('Voice accordion is disabled. All settings '
                + 'are cleared. When reenabling, make sure the chosen category is empty.')
                    .catch(err => logger.error(err));
                return;
            }
        }

        logger.error(`DB error: Failed to toggle voice accordion setting for guild ${interaction.guildId}`);
        await interaction.editReply('DB error: Failed to toggle voice accordion setting.')
            .catch(err => logger.error(err));

        return;
    },
};
