import pkg from 'discord-command-registry';
import { entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { createListeningStream } from './createListeningStream';
import { VoiceChannel } from 'discord.js';

const { SlashCommandRegistry } = pkg;


const commands = new SlashCommandRegistry();

// Define Join command
commands.addCommand(command => {
	return command.setName('join')
		.setDescription('Joins the voice channel of the calling user.')
		.setHandler(joinHandler)
		.addStringOption((option) => {
			return option.setName('source').setDescription('What language do you speak?').setRequired(true).addChoices(
				{ name: 'Spanish', value: 'es' },
				{ name: 'English', value: 'en' },
				{ name: 'French', value: 'fr' },
				{ name: 'Italian', value: 'it' },
			);
		})
		.addStringOption((option) => {
			return option.setName('target').setDescription('What language do you want to translate to?').setRequired(true).addChoices(
				{ name: 'Spanish', value: 'es' },
				{ name: 'English', value: 'en' },
				{ name: 'French', value: 'fr' },
				{ name: 'Italian', value: 'it' },
			);
		});
});

// Define Leave command
commands.addCommand(command => {
	return command.setName('leave')
		.setDescription('Leaves the voice channel of the calling user.')
		.setHandler(leaveHandler);
});


function joinSourceLanguageHandler(option) {
	return option.setName('source').setDescription('What language do you speak?').setRequired(true).addChoices(
		{ name: 'Spanish', value: 'es' },
		{ name: 'English', value: 'en' },
		{ name: 'French', value: 'fr' },
		{ name: 'Italian', value: 'it' },
	);
}

function joinTargetLanguageHandler(option) {
	return option.setName('target').setDescription('What language do you want to translate to?').setRequired(true).addChoices(
		{ name: 'Spanish', value: 'es' },
		{ name: 'English', value: 'en' },
		{ name: 'French', value: 'fr' },
		{ name: 'Italian', value: 'it' },
	);
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

	const languages = {
		'source': interaction.options.getString('source'),
		'target': interaction.options.getString('target'),
	};
	console.log(languages);

	try {
		await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
		const receiver = connection.receiver;
		receiver.speaking.once('start', (callerUserId) => {
			console.log('User started speaking. Called event once.');
			createListeningStream(connection, interaction.user.id, languages);
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
				interaction.reply({
					ephemeral: true,
					content: 'Could not disconnect from voice channel, please call the leave method correctly.',
				});
			}
		}
		catch (error) {
			console.error(error);
			interaction.reply({
				ephemeral: true,
				content: 'Could not leave voice channel due to an unexpected error. Please disconnect the bot manually.',
			});
		}
	}
	else {
		console.warn('Currently in idle. Join a voice channel to use this command.');
		interaction.reply({ ephemeral: true, content: 'Currently in idle. Join a voice channel to use this command.' });
	}
}

export default commands;