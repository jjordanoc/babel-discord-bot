const { Client, Events, GatewayIntentBits } = require('discord.js');
const commands = require('./commands.js');
require('dotenv').config();


const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages] });

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, (interaction) => {
	commands.execute(interaction)
		.then(result => console.log('Command returned this', result))
		.catch(err => console.error('Command failed', err));
});

client.login(process.env.TOKEN);