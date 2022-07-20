const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');
const { keyv } = require('../index');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voiceaccordion')
        .setDescription('Bot admin(s) only. '
        + 'Toggle the voice accordion feature.')
        .addChannelOption(option =>
            option.setName('category_channel')
                .setDescription('Pick the category channel where the voice accordion will exist.')
                .setRequired(false)
                .addChannelTypes([ChannelType.GuildCategory]))
        .addStringOption(option =>
            option.setName('base_ch_name')
                .setDescription('Unique name of the '
                + 'initial voice channel to create for this accordion.')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('base_is_afk')
                .setDescription('Is the base channel the AFK channel?')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('expand_ch_names')
                .setDescription('Comma-separated list of '
                + 'unique names of accordion expansion channels.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('ignore_ch_names')
                .setDescription('Comma-separated list of '
                + 'unique names of channels in the category but not a part of this accordion.')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();

        let enabled;
        const VOICE_ACCORDION_KEY_URL = `voice-accordion/${interaction.guildId}/settings`;
        await keyv.get(VOICE_ACCORDION_KEY_URL)
            .then(ret => enabled = ret);
        if (!enabled || !enabled.flag) {
            const voiceAccordionCategory = interaction.options.getChannel('category_channel');
            const voiceAccordionBase = interaction.options.getString('base_ch_name');
            let voiceAccordionExpand = interaction.options.getString('expand_ch_names');
            let voiceAccordionIgnore = interaction.options.getString('ignore_ch_names');
            const voiceAccordionBaseIsAfk = interaction.options.getBoolean('base_is_afk');

            if (!voiceAccordionBase || !voiceAccordionCategory || !voiceAccordionExpand
                || !voiceAccordionBaseIsAfk) {
                await interaction.editReply('Voice accordion is currently disabled. '
                + 'Please provide category channel, base and expand channel names, '
                + 'and whether the base channel is the AFK channel or not, to enable it.')
                    .catch(console.error);
                return;
            }

            voiceAccordionExpand = voiceAccordionExpand.split(',');

            if (voiceAccordionIgnore) {
                voiceAccordionIgnore = voiceAccordionIgnore.split(',');
            }
            else {
                voiceAccordionIgnore = [];
            }

            await keyv.set(VOICE_ACCORDION_KEY_URL, {
                flag: true,
                category: voiceAccordionCategory,
                base: voiceAccordionBase,
                expand: voiceAccordionExpand,
                expandList: voiceAccordionExpand,
                expandSize: voiceAccordionExpand.length,
                ignore: voiceAccordionIgnore,
                baseIsAfk: voiceAccordionBaseIsAfk,
            });
            await keyv.get(VOICE_ACCORDION_KEY_URL)
                .then(ret => enabled = ret);
            if (enabled.flag) {
                let categoryCh;
                await interaction.guild.channels.fetch(voiceAccordionCategory.id)
                    .then(ret => categoryCh = ret);

                let newVoiceChannelName;
                newVoiceChannelName = voiceAccordionBase;

                await categoryCh.createChannel(newVoiceChannelName, {
                    type: ChannelType.GuildVoice,
                    bitrate: interaction.guild.maximumBitrate,
                }).catch(console.error);

                if (voiceAccordionIgnore) {
                    for (let i = 0; i < voiceAccordionIgnore.length; i++) {
                        newVoiceChannelName = voiceAccordionIgnore[i];

                        await categoryCh.createChannel(newVoiceChannelName, {
                            type: ChannelType.GuildVoice,
                            bitrate: interaction.guild.maximumBitrate,
                        }).catch(console.error);
                    }
                }

                await interaction.editReply('Voice accordion is enabled. '
                + '**Do not delete any channels nor toggle voice regions. '
                + 'Otherwise you will need to disable, then reenable voice accordion '
                + 'for it to work well again.** If needed, edit appropriate permissions '
                + 'for ignored channels.')
                    .catch(console.error);
                return;
            }
        }
        else if (enabled.flag) {
            await keyv.set(VOICE_ACCORDION_KEY_URL, {
                flag: false,
            });
            await keyv.get(VOICE_ACCORDION_KEY_URL)
                .then(ret => enabled = ret);
            if (!enabled.flag) {
                await interaction.editReply('Voice accordion is disabled. All settings '
                + 'are cleared. When reenabling, make sure the chosen category is empty.')
                    .catch(console.error);
                return;
            }
        }

        await interaction.editReply('DB error: Failed to toggle voice accordion setting.')
            .catch(console.error);

        return;
    },
};
