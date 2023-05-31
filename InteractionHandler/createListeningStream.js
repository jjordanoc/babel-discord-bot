"use strict";
exports.__esModule = true;
exports.createListeningStream = void 0;
var voice_1 = require("@discordjs/voice");
var ws_1 = require("ws");
function getDisplayName(userId, user) {
    return user ? "".concat(user.username, "_").concat(user.discriminator) : userId;
}
function createListeningStream(receiver, userId, user) {
    var audioSocket = new ws_1.WebSocket('ws://127.0.0.1:8000');
    var opusStream = receiver.subscribe(userId, {
        end: {
            behavior: voice_1.EndBehaviorType.Manual
        }
    });
    audioSocket.on('open', function () {
        opusStream.on('data', function (chunk) {
            // if (audioSocket.readyState == audioSocket.OPEN) {
            // 	audioSocket.send(chunk);
            // }
            audioSocket.send(chunk);
            // else {
            // 	console.log(`Attempted to send audio when Socket is still in ${audioSocket.readyState} state`);
            // }
        });
        opusStream.on('close', function () {
            audioSocket.close();
        });
    });
    audioSocket.on('error', function () {
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
exports.createListeningStream = createListeningStream;
