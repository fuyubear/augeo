const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord-api-types/v9');
const { keyv } = require('../index');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voiceaccordion')
        .setDescription('Bot admin(s) only. '
        + 'Toggle the voice accordion feature. Leave options empty to disable and clear.')
        .addChannelOption(option =>
            option.setName('category_channel')
                .setDescription('Pick the category channel where the voice accordion will exist.')
                .setRequired(false)
                .addChannelTypes([ChannelType.GuildCategory]))
        .addStringOption(option =>
            option.setName('base_ch_names')
                .setDescription('Unique name of the '
                + 'initial voice channel to create for this accordion.')
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
            let voiceAccordionBase = interaction.options.getString('base_ch_names');
            let voiceAccordionExpand = interaction.options.getString('expand_ch_names');
            let voiceAccordionIgnore = interaction.options.getString('ignore_ch_names');

            if (!voiceAccordionBase || !voiceAccordionCategory || !voiceAccordionExpand) {
                await interaction.editReply('Voice accordion is currently disabled. '
                + 'Please provide category channel and base channel name to enable it.')
                    .catch(console.error);
                return;
            }

            voiceAccordionBase = voiceAccordionBase.split(',');
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
            });
            await keyv.get(VOICE_ACCORDION_KEY_URL)
                .then(ret => enabled = ret);
            if (enabled.flag) {
                let categoryCh;
                await interaction.guild.channels.fetch(voiceAccordionCategory.id)
                    .then(ret => categoryCh = ret);

                let newVoiceChannelName;
                for (let i = 0; i < voiceAccordionBase.length; i++) {
                    newVoiceChannelName = voiceAccordionBase[i];

                    await categoryCh.createChannel(newVoiceChannelName, {
                        type: 'GUILD_VOICE',
                        bitrate: interaction.guild.maximumBitrate,
                    }).catch(console.error);
                }

                if (voiceAccordionIgnore) {
                    for (let i = 0; i < voiceAccordionIgnore.length; i++) {
                        newVoiceChannelName = voiceAccordionIgnore[i];

                        await categoryCh.createChannel(newVoiceChannelName, {
                            type: 'GUILD_VOICE',
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
