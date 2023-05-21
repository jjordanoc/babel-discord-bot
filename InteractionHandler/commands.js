const { SlashCommandRegistry } = require('discord-command-registry');
const { joinVoiceChannel } = require('@discordjs/voice');
const axios = require('axios');

/*
Define command metadata
*/
const commandList = [
	{
		'name': 'ping',
		'description': 'Ping pong command',
		'handler': pingPongHandler,
	},
	{
		'name': 'join',
		'description': 'Joins the voice channel of the calling user.',
		'handler': joinHandler,
	},
];

const commands = new SlashCommandRegistry();

for (let i = 0; i < commandList.length; ++i) {
	commands.addCommand(command => command.setName(commandList[i].name)
		.setDescription(commandList[i].description)
		.setHandler(commandList[i].handler));
}

/*
Define command handlers
*/

function pingPongHandler(interaction) {
	return interaction.reply('pong');
}

async function joinHandler(interaction) {
	const guildId = interaction.guild.id;
	const userId = interaction.member.id;
	console.log(`User ID: ${userId}`);
	const connection = joinVoiceChannel({
		channelId: interaction.member.voice.channel.id,
		guildId: guildId,
		adapterCreator: interaction.guild.voiceAdapterCreator,
	});
	try {
		const response = await axios.post('http://localhost:3000/listen', JSON.stringify({ guildId, userId }), {
			headers: { 'content-type': 'application/json' },
		});
		if (response.status === 200) {
			await interaction.reply(`Listening to user ${userId} in voice channel ${interaction.member.voice.channel.name}`);
		}
		else {
			await interaction.reply('An error occurred while joining the voice channel. Please try again later.');
			connection.destroy();
		}
	}
	catch (e) {
		await interaction.reply('An error occurred while joining the voice channel. Please try again later.');
		connection.destroy();
	}
}


module.exports = commands;