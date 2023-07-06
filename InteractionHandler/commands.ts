import pkg from 'discord-command-registry';
import { APIApplicationCommandOptionChoice } from 'discord-api-types/v10';
import { joinHandler } from './commands/joinHandler';
import { leaveHandler } from './commands/leaveHandler';

const { SlashCommandRegistry } = pkg;

/**
 * Language configuration
 * @typedef {APIApplicationCommandOptionChoice<string>} LanguageConfig
 * @property {string} name - The name of language.
 * @property {string} value - The encoding of the language.
 */

/**
 * @type {LanguageConfig[]}
 * List of languages
 */
const languages: APIApplicationCommandOptionChoice<string>[] = [
	{ name: 'Spanish', value: 'es' },
	{ name: 'English', value: 'en' },
	{ name: 'French', value: 'fr' },
	{ name: 'Italian', value: 'it' },
	{ name: 'German', value: 'de' }
]

/**
 * @type {SlashCommandRegistry}
 * Collection of commands
 */
const commands = new SlashCommandRegistry();


/**
 * Add a command to the command registry
 */
commands.addCommand(command => {
	return command.setName('join')
		.setDescription('Joins the voice channel of the calling user.')
		.setHandler(joinHandler)
		.addStringOption((option) => {
			return option.setName('source').setDescription('What language do you speak?').setRequired(true).addChoices(...languages);
		})
		.addStringOption((option) => {
			return option.setName('target').setDescription('What language do you want to translate to?').setRequired(true).addChoices(...languages);
		})
		.addStringOption((option) => {
			return option.setName('gender').setDescription('Which gender would be your speaker?').setRequired(true).addChoices(
				{ name: 'Male', value: 'Male' },
				{ name: 'Female', value: 'Female' },
			);
		});
});

/**
 * Add a command to the command registry
 */
commands.addCommand(command => {
	return command.setName('leave')
		.setDescription('Leaves the voice channel of the calling user.')
		.setHandler(leaveHandler);
});


export default commands;