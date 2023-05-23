import pkg from 'discord-command-registry';

const {SlashCommandRegistry} = pkg;
import {EndBehaviorType} from '@discordjs/voice';
import {pipeline} from 'node:stream';
import * as prism from 'prism-media';
import {createWriteStream} from 'node:fs';
import {entersState, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus} from '@discordjs/voice';
import {Client, CommandInteraction, GuildMember, Interaction, Snowflake} from 'discord.js';
import {createListeningStream} from './createListeningStream';


/*
Define command metadata
*/
const commandList = [
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


async function joinHandler(interaction) {
    const recordable = new Set<string>;
    const guildId: string = interaction.guild.id;
    const userId: string = interaction.member.id;
    console.log(`User ID: ${userId}`);
    const connection = joinVoiceChannel({
        channelId: interaction.member.voice.channel.id,
        guildId: guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true
    });
    // first connection
    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
        const receiver = connection.receiver;

        receiver.speaking.on('start', (userId) => {
            if (recordable.has(userId)) {
                createListeningStream(receiver, userId, interaction.client.users.cache.get(userId));
            }
        });
    } catch (error) {
        console.warn(error);
        await interaction.followUp('Failed to join voice channel within 20 seconds, please try again later!');
    }
    // record
    try {
        if (connection) {
            recordable.add(userId);
            const receiver = connection.receiver;
            if (connection.receiver.speaking.users.has(userId)) {
                createListeningStream(receiver, userId, interaction.client.users.cache.get(userId));
                console.log("connection.receiver.speaking.users.has(userId) is true")
            }
            else {
                console.log("Not speaking");
            }
            // await interaction.reply({ ephemeral: true, content: 'Listening!' });
            // console.log("Listening");
        }
        else {
            // await interaction.reply({ ephemeral: true, content: 'Join a voice channel and then try that again!' });
            console.log("Not joined to vc");
        }

    } catch (error) {
        console.warn(error);
        // await interaction.reply('Failed to join voice channel within 20 seconds, please try again later!');
    }

    // await interaction.reply('Ready!');
    console.log("Done");
}


export default commands;