import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream';
import { EndBehaviorType, VoiceReceiver } from '@discordjs/voice';
import type { User } from 'discord.js';
import * as prism from 'prism-media';
import { WebSocket } from 'ws';

function getDisplayName(userId: string, user?: User) {
	return user ? `${user.username}_${user.discriminator}` : userId;
}

export function createListeningStream(receiver: VoiceReceiver, userId: string, user?: User) {
	const audioSocket = new WebSocket('ws://127.0.0.1:8000');
	const opusStream = receiver.subscribe(userId, {
		end: {
			behavior: EndBehaviorType.Manual,
		},
	});
	audioSocket.on('open', () => {
		opusStream.on('data', (chunk) => {
			// if (audioSocket.readyState == audioSocket.OPEN) {
			// 	audioSocket.send(chunk);
			// }
			audioSocket.send(chunk);
			// else {
			// 	console.log(`Attempted to send audio when Socket is still in ${audioSocket.readyState} state`);
			// }
		});
		opusStream.on('close', () => {
			audioSocket.close();
		});
	});

	audioSocket.on('error', () => {
		console.error('An error occurred while connecting to WebSocket');
	});


	// const oggStream = new prism.opus.OggLogicalBitstream({
	// 	opusHead: new prism.opus.OpusHead({
	// 		channelCount: 2,
	// 		sampleRate: 48000,
	// 	}),
	// 	pageSizeControl: {
	// 		maxPackets: 10,
	// 	},
	// });
	//
	//
	//
	//
	// const filename = `./recordings/${Date.now()}-${getDisplayName(userId, user)}.ogg`;
	//
	// const out = createWriteStream(filename);
	//
	// console.log(`👂 Started recording ${filename}`);
	//
	// pipeline(opusStream, oggStream, out, (err) => {
	// 	if (err) {
	// 		console.warn(`❌ Error recording file ${filename} - ${err.message}`);
	// 	}
	// 	else {
	// 		console.log(`✅ Recorded ${filename}`);
	// 	}
	// });
}