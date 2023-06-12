import { createAudioPlayer, createAudioResource, EndBehaviorType, StreamType, VoiceConnection } from '@discordjs/voice';
import type { User } from 'discord.js';
import * as prism from 'prism-media';
import { WebSocket } from 'ws';
import * as stream from 'stream';
import NanoTimer from 'nanotimer';
const SILENCE = Buffer.from([0xf8, 0xff, 0xfe]);

export function createListeningStream(connection: VoiceConnection, userId: string) {
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

	// Accumulates very, very slowly, but only when user is speaking: reduces buffer size otherwise
	const buffer = [];
	const recording = true;
	// Interpolating silence into user audio stream
	const userStream = new stream.Readable({
		read() {
			if (recording) {
				// Pushing audio at the same rate of the receiver
				// (Could probably be replaced with standard, less precise timer)
				const delay = new NanoTimer();
				delay.setTimeout(() => {
					if (buffer.length > 0) {
						this.push(buffer.shift());
					}
					else {
						this.push(SILENCE);
					}
					// delay.clearTimeout();
				}, '', '20m');
				// A 20.833ms period makes for a 48kHz frequency
			}
			else if (buffer.length > 0) {
				// Sending buffered audio ASAP
				this.push(buffer.shift());
			}
			else {
				// Ending stream
				this.push(null);
			}
		},
	});
	opusStream.on('data', chunk => buffer.push(chunk));
	opusStream.on('end', () => {
		// TODO: perform cleanup
		console.log('Ended user audio stream');
		audioSocket.close();
	});
	opusStream.on('close', () => {
		console.log('Closed user audio stream');
		audioSocket.close();
	});
	const decoder = userStream
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