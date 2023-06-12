import pkg from 'discord-command-registry';
import { entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { createListeningStream } from './createListeningStream';
import { VoiceChannel } from 'discord.js';

const { SlashCommandRegistry } = pkg;


/*
Define command metadata
*/
const commandList = [
	{
		'name': 'join',
		'description': 'Joins the voice channel of the calling user.',
		'handler': joinHandler,
	},
	{
		'name': 'leave',
		'description': 'Leaves the voice channel of the calling user.',
		'handler': leaveHandler,
	},
];

const commands = new SlashCommandRegistry();

for (let i = 0; i < commandList.length; ++i) {
	commands.addCommand(command => command.setName(commandList[i].name)
		.setDescription(commandList[i].description)
		.setHandler(commandList[i].handler));
}

async function joinHandler(interaction) {
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

	try {
		await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
		const receiver = connection.receiver;
		receiver.speaking.once('start', (callerUserId) => {
			console.log('User started speaking. Called event once.');
			createListeningStream(connection, interaction.user.id);
		});
		interaction.reply({ ephemeral: true, content: 'Listening...' });
	}
	catch (error) {
		console.warn(error);
		interaction.reply({ ephemeral: true, content: 'Failed to join voice channel within 20 seconds, please try again later!' });
	}
}

async function leaveHandler(interaction) {
	const guildId: string = interaction.guild.id;
	// const userId: string = interaction.member.id;
	const connection = getVoiceConnection(guildId);
	if (connection) {
		try {
			// Should be changed (should only destroy connections created by the current user)
			const success = connection.receiver.subscriptions.delete(interaction.user.id);
			if (success) {
				connection.disconnect();
				console.info('Successfully disconnected from voice channel.');
				interaction.reply({ ephemeral: true, content: 'Successfully disconnected from voice channel.' });
			}
			else {
				console.info('Could not disconnect from voice channel, please call the leave method correctly.');
				interaction.reply({ ephemeral: true, content: 'Could not disconnect from voice channel, please call the leave method correctly.' });
			}
		}
		catch (error) {
			console.error(error);
			interaction.reply({ ephemeral: true, content: 'Could not leave voice channel due to an unexpected error. Please disconnect the bot manually.' });
		}
	}
	else {
		console.warn('Currently in idle. Join a voice channel to use this command.');
		interaction.reply({ ephemeral: true, content: 'Currently in idle. Join a voice channel to use this command.' });
	}
}

export default commands;