import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream';
import {
	createAudioPlayer,
	createAudioResource,
	EndBehaviorType,
	VoiceConnection,
	VoiceReceiver,
} from '@discordjs/voice';
import type { User } from 'discord.js';
import * as prism from 'prism-media';
import { WebSocket } from 'ws';
import * as stream from 'stream';

function getDisplayName(userId: string, user?: User) {
	return user ? `${user.username}_${user.discriminator}` : userId;
}

export function createListeningStream(connection: VoiceConnection, userId: string, user?: User) {
	const receiver = connection.receiver;
	const player = createAudioPlayer();
	connection.subscribe(player);
	const audioSocket = new WebSocket('ws://127.0.0.1:8000');

	player.on('error', error => {
		console.error(error.message);
	});

	const opusStream = receiver.subscribe(userId, {
		end: {
			behavior: EndBehaviorType.Manual,
		},
	});
	const decoder = opusStream
		.pipe(new prism.opus.Decoder({
			rate: 48000,
			channels: 1,
			frameSize: 960,
		}));

	audioSocket.on('open', () => {
		decoder.on('data', (chunk) => {
			audioSocket.send(chunk);
		});
		decoder.on('close', () => {
			audioSocket.close();
		});
	});

	audioSocket.on('close', () => {
		translatedAudioStream.end();
	});

	const translatedAudioStream = new stream.PassThrough();

	audioSocket.on('message', (data) => {
		console.log(data);
		translatedAudioStream.write(data);
	});
	audioSocket.on('error', () => {
		console.error('An error occurred while connecting to WebSocket');
	});
	player.play(createAudioResource(translatedAudioStream));
}0;