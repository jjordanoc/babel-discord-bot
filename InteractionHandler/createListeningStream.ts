import { createAudioPlayer, createAudioResource, EndBehaviorType, StreamType, VoiceConnection } from '@discordjs/voice';
import type { User } from 'discord.js';
import * as prism from 'prism-media';
import { WebSocket } from 'ws';
import * as stream from 'stream';

export function createListeningStream(connection: VoiceConnection, userId: string, user?: User) {
	const receiver = connection.receiver;
	const player = createAudioPlayer();
	player.on('error', error => {
		console.error(error.message);
	});
	connection.subscribe(player);
	console.log('Reached 1');
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
	const audioSocket = new WebSocket('ws://127.0.0.1:8000');
	audioSocket.on('open', () => {
		decoder.on('data', (chunk) => {
			audioSocket.send(chunk);
		});
		decoder.on('close', () => {
			audioSocket.close();
		});
	});
	console.log('Reached 2');
	audioSocket.on('close', () => {
		// clean up
	});
	audioSocket.on('message', (data) => {
		const translatedAudioStream = new stream.PassThrough();
		console.log(data);
		translatedAudioStream.write(data);
		player.play(createAudioResource(translatedAudioStream, { inputType: StreamType.OggOpus }));
		translatedAudioStream.end();
	});
	console.log('Reached 3');
	audioSocket.on('error', () => {
		console.error('An error occurred while connecting to WebSocket');
	});
	console.log('Reached 4');
}