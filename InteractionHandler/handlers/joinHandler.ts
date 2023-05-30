import { entersState, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { createListeningStream } from '../createListeningStream';

/**
 * Function handler to join the bot into a voice channel
 * @param {Object} interaction Message that your application receives when a user uses an application command or a message component. See {@link https://discord.com/developers/docs/interactions/receiving-and-responding | Interaction Documentation}
 * @return {void}
 */
export default async function joinHandler(interaction) {
	const guildId: string = interaction.guild.id;
	// const userId: string = interaction.member.id;
	const connection = joinVoiceChannel({
		channelId: interaction.member.voice.channel.id,
		guildId: guildId,
		adapterCreator: interaction.guild.voiceAdapterCreator,
		selfDeaf: false,
		selfMute: true,
	});
	try {
		await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
		const receiver = connection.receiver;
		receiver.speaking.once('start', (callerUserId) => {
			console.log('User started speaking. Called event once.');
			createListeningStream(receiver, callerUserId, interaction.client.users.cache.get(callerUserId));
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
