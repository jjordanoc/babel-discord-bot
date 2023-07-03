import {
	AudioPlayerStatus,
	createAudioPlayer,
	createAudioResource,
	EndBehaviorType,
	StreamType,
	VoiceConnection,
} from '@discordjs/voice';
import * as prism from 'prism-media';
import { WebSocket } from 'ws';
import * as stream from 'stream';
import * as JSON from 'json3';
import * as dotenv from 'dotenv';

dotenv.config();

// Constants to handle audio actions
const PAUSE_MUSIC = '$$PAUSE_MUSIC$$';
const FINISH_MUSIC = '$$FINISH_MUSIC$$';
const START_MUSIC = '$$START_MUSIC$$';

export function createListeningStream(connection: VoiceConnection, userId: string, languages: {
	'source': string,
	'target': string,
	'gender': string
}) {
	/*
	Send user audio through socket
	 */
	const opusStream = connection.receiver.subscribe(userId, {
		end: {
			behavior: EndBehaviorType.Manual,
		},
	});
	opusStream.on('end', () => {
		// TODO: perform cleanup
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
	const audioSocket = new WebSocket(process.env.HOSTNAME_API as string);
	audioSocket.on('open', () => {
		audioSocket.send(JSON.stringify(languages));
		decoder.on('data', (chunk) => {
			audioSocket.send(chunk);
		});
		decoder.on('close', () => {
			audioSocket.close();
		});
	});
	audioSocket.on('error', () => {
		console.error('An error occurred while connecting to WebSocket');
	});
	/*
	Play received audio
	 */
	const player = createAudioPlayer();
	player.on('error', error => {
		console.error(error.message);
	});
	connection.subscribe(player);
	const queue = [];
	let isPlayingMusic = false, isReceivingMusicAudioBytes = false;
	player.on('stateChange', (oldState, newState) => {
		if (oldState.status == AudioPlayerStatus.Playing
			&& newState.status == AudioPlayerStatus.Idle) {
			if (isPlayingMusic && !isReceivingMusicAudioBytes) {
				console.log('stopped playing music');
				isPlayingMusic = false;
			}
			if (queue.length > 0) {
				// play next resource in queue
				player.play(queue.shift());
			}
		}
	});
	audioSocket.on('message', (data) => {
		if (data.toString() == START_MUSIC) {
			console.log('started playing music');
			isPlayingMusic = true;
			isReceivingMusicAudioBytes = true;
		}
		if (data.toString() == FINISH_MUSIC) {
			console.log('finished receiving music audio');
			isReceivingMusicAudioBytes = false;
		}
		if (data.toString() == PAUSE_MUSIC && player.state.status == AudioPlayerStatus.Playing) {
			console.log('pausing music');
			player.pause(true);
			isPlayingMusic = false;
		}
		else {
			const translatedAudioStream = new stream.PassThrough();
			translatedAudioStream.write(data);
			translatedAudioStream.end();
			const resource =
				createAudioResource(translatedAudioStream, { inputType: StreamType.OggOpus });
			if (player.state.status == AudioPlayerStatus.Playing) {
				if (isReceivingMusicAudioBytes || !isPlayingMusic) {
					// player is currently busy, add to queue
					console.log('adding audio to queue');
					queue.push(resource);
				}
				else {
					// player is busy playing music, discard result
					console.log('discarding result');
				}

			}
			else {
				console.log('playing audio directly');
				player.play(resource);
			}
		}
	});
}