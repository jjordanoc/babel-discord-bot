import { createAudioPlayer, createAudioResource, EndBehaviorType, StreamType, VoiceConnection } from '@discordjs/voice';
import * as prism from 'prism-media';
import { WebSocket } from 'ws';
import * as stream from 'stream';
import * as JSON from 'json3';

export function createListeningStream(connection: VoiceConnection, userId: string, languages: {
	'source': string,
	'target': string
}) {
	const player = createAudioPlayer();
	player.on('error', error => {
		console.error(error.message);
	});
	connection.subscribe(player);
	console.log('Reached 1');
	const opusStream = connection.receiver.subscribe(userId, {
		end: {
			behavior: EndBehaviorType.Manual,
		},
	});
	opusStream.on('end', () => {
		// TODO: perform cleanup
		console.log('Ended user audio stream');
		audioSocket.close();
	});
	opusStream.on('close', () => {
		console.log('Closed user audio stream');
		audioSocket.close();
	});
	const decoder = opusStream
		.pipe(new prism.opus.Decoder({
			rate: 48000,
			channels: 1,
			frameSize: 960,
		}));
	const audioSocket = new WebSocket('ws://127.0.0.1:8000');
	audioSocket.on('open', () => {
		console.log(JSON.stringify(languages));
		audioSocket.send(JSON.stringify(languages));
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