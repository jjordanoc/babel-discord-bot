import { Client, Events, GatewayIntentBits } from 'discord.js';
import commands from './commands';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * @type {Client}
 * The client of discord
 * @see https://discord.js.org/docs/packages/core/0.6.0/Client:Class
 */
const client: Client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages] });

/**
 * The procedure that occurs when the client is ready
 */
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

/**
 * The procedure that occurs when a interaction occurs. Execute a command if exists.
 */
client.on(Events.InteractionCreate, (interaction) => {
	if (!interaction.isCommand() || !interaction.guildId) return;
	commands.execute(interaction);
});

/**
 * The procedure that occurs when an error occurs. Show the error in console.
 */
client.on(Events.Error, console.warn);

/**
 * Login the client with the credentials
 */
client.login(process.env.TOKEN);