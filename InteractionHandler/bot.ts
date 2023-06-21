import { Client, Events, GatewayIntentBits } from 'discord.js';
import commands from './commands';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages] });

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, (interaction) => {
	if (!interaction.isCommand() || !interaction.guildId) return;
	commands.execute(interaction);
});

client.on(Events.Error, console.warn);

client.login(process.env.TOKEN);