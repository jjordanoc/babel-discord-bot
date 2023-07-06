import {VoiceChannel} from "discord.js";
import {entersState, joinVoiceChannel, VoiceConnectionStatus} from "@discordjs/voice";
import { InteractionType } from 'discord-api-types/v10';
import {createListeningStream} from "../createListeningStream";

/**
 * Handler function for join the bot into a voice channel
 * @type {Function}
 * @param {InteractionType} interaction Message that your application receives when a user uses an application command or a message component. See {@link https://discord.com/developers/docs/interactions/receiving-and-responding | Interaction Documentation}
 * @return {void}
 */
export async function joinHandler(interaction) {
    const guildId: string = interaction.guild.id;
    const channel: VoiceChannel | null = interaction.member.voice.channel;

    if (channel == null) {
        interaction.reply({ ephemeral: true, content: 'Join voice channel first.' });
        return;
    }

    const connection = joinVoiceChannel({
        channelId: channel?.id,
        guildId: guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true,
    });

    const options = {
        'source': interaction.options.getString('source'),
        'target': interaction.options.getString('target'),
        'gender': interaction.options.getString('gender'),
    };

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
        const receiver = connection.receiver;
        receiver.speaking.once('start', (callerUserId) => {
            console.log('User started speaking. Called event once.');
            createListeningStream(connection, interaction.user.id, options);
        });
        interaction.reply({ ephemeral: true, content: 'Listening...' });
    }
    catch (error) {
        console.warn(error);
        interaction.reply({
            ephemeral: true,
            content: 'Failed to join voice channel within 20 seconds, please try again later!',
        });
    }
}