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
/**
 * @type {string}
 * Code for pause the music
 */
const PAUSE_MUSIC = '$$PAUSE_MUSIC$$';

/**
 * @type {string}
 * Code for finish the music
 */
const FINISH_MUSIC = '$$FINISH_MUSIC$$';

/**
 * @type {string}
 * Code for start the music
 */
const START_MUSIC = '$$START_MUSIC$$';

/**
 * Handler function for quit the bot to the voice channel
 * @type {Function}
 * @param {VoiceConnection} connection A connection to the voice server of a Guild, can be used to play audio in voice channels.
 * @param {string} userId The user id
 * @param {Object} options Contain the source and target languages, and also the gender.
 * @return {void}
 */
export function createListeningStream(connection: VoiceConnection, userId: string, options: {
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

	const player = createAudioPlayer();

	player.on('error', error => {
		console.error(error.message);
	});

	connection.subscribe(player);

	const queue = [];

	let isPlayingMusic = false;
	let isReceivingMusicAudioBytes = false;

	player.on('stateChange', (oldState, newState) => {
		if (oldState.status == AudioPlayerStatus.Playing && newState.status == AudioPlayerStatus.Idle) {
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

	const audioSocket = new WebSocket(process.env.HOSTNAME_API as string);

	audioSocket.on('message', (data) => {
		switch (data.toString()) {
		case START_MUSIC: {
			console.log('started playing music');
			isPlayingMusic = true;
			isReceivingMusicAudioBytes = true;
			break;
		}

		case FINISH_MUSIC: {
			console.log('finished receiving music audio');
			isReceivingMusicAudioBytes = false;
			break;
		}

		case PAUSE_MUSIC: {
			if (player.state.status == AudioPlayerStatus.Playing) {
				console.log('pausing music');
				player.pause(true);
				isPlayingMusic = false;
			}
			break;
		}

		default: {
			const translatedAudioStream = new stream.PassThrough();
			translatedAudioStream.write(data);
			translatedAudioStream.end();
			const resource =
                    createAudioResource(translatedAudioStream, { inputType: StreamType.OggOpus });

			if (player.state.status != AudioPlayerStatus.Playing) {
				console.log('playing audio directly');
				player.play(resource);
				break;
			}

			if (!isReceivingMusicAudioBytes && isPlayingMusic) {
				console.log('discarding result');
				break;
			}

			console.log('adding audio to queue');
			queue.push(resource);

			break;
		}
		}
	});

	audioSocket.on('open', () => {
		audioSocket.send(JSON.stringify(options));

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

}