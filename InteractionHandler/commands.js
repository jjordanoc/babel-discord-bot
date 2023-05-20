const { SlashCommandRegistry } = require('discord-command-registry');
const { joinVoiceChannel } = require('@discordjs/voice');


/*
Define command metadata
*/
const commandList = [
	{
		'name' : 'ping',
		'description' : 'Ping pong command',
		'handler' : pingPongHandler,
	},
	{
		'name' : 'join',
		'description' : 'Joins the voice channel of the calling user.',
		'handler' : joinHandler,
	}
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

function joinHandler(interaction) {
	const conn = joinVoiceChannel({
		channelId: interaction.member.voice.channel.id,
		guildId: interaction.guild.id,
  		adapterCreator: interaction.guild.voiceAdapterCreator,
	});
	return interaction.reply("Joined voice channel " + interaction.member.voice.channel.name);
}


module.exports = commands;