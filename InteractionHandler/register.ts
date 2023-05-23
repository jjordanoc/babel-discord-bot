import commands from './commands.js';
import * as dotenv from 'dotenv';
dotenv.config();

commands.registerCommands({
	application_id: process.env.APP_ID,
	token: process.env.TOKEN,
	guild: process.env.GUILD_ID,
})
	.then(res => console.log('Successfully registered', res))
	.catch(err => console.error('Something went wrong', err));