import {getVoiceConnection} from "@discordjs/voice";
import { InteractionType } from 'discord-api-types/v10';

/**
 * Handler function for quit the bot to the voice channel
 * @type {Function}
 * @param {InteractionType} interaction Message that your application receives when a user uses an application command or a message component. See {@link https://discord.com/developers/docs/interactions/receiving-and-responding | Interaction Documentation}
 * @return {void}
 */
export async function leaveHandler(interaction) {
    const guildId: string = interaction.guild.id;
    const connection = getVoiceConnection(guildId);

    if (!connection) {
        console.warn('Currently in idle. Join a voice channel to use this command.');
        interaction.reply({
            ephemeral: true,
            content: 'Currently in idle. Join a voice channel to use this command.',
        });
    }

    try {
        // Should be changed (should only destroy connections created by the current user)
        const success = connection.receiver.subscriptions.delete(interaction.user.id);

        if (!success) {
            console.info('Could not disconnect from voice channel, please call the leave method correctly.');
            interaction.reply({
                ephemeral: true,
                content: 'Could not disconnect from voice channel, please call the leave method correctly.',
            });
        }

        connection.disconnect();
        console.info('Successfully disconnected from voice channel.');
        interaction.reply({ ephemeral: true, content: 'Successfully disconnected from voice channel.' });

    }
    catch (error) {
        console.error(error);
        interaction.reply({
            ephemeral: true,
            content: 'Could not leave voice channel due to an unexpected error. Please disconnect the bot manually.',
        });
    }
}