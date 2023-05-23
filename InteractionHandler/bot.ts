import { Client, Events, GatewayIntentBits } from 'discord.js';
import commands from './commands.js';
import * as dotenv from 'dotenv';
dotenv.config();


/**
 * The IDs of the users that can be recorded by the bot.
 */
const recordable = new Set<string>();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages] });

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, (interaction) => {
	if (!interaction.isCommand() || !interaction.guildId) return;
	commands.execute(interaction)
		.then(result => console.log('Command returned this', result))
		.catch(err => console.error('Command failed', err));
});

client.on(Events.Error, console.warn);

client.login(process.env.TOKEN);