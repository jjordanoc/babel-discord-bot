"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
exports.__esModule = true;
exports.createListeningStream = void 0;
var voice_1 = require("@discordjs/voice");
var prism = __importStar(require("prism-media"));
var ws_1 = require("ws");
// import { ogg } from 'prism-media';
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
    var decoder = opusStream
        // .pipe(new prism.opus.OggLogicalBitstream({
        // 	opusHead: new prism.opus.OpusHead({
        // 		channelCount: 2,
        // 		sampleRate: 48000,
        // 	}),
        // 	pageSizeControl: {
        // 		maxPackets: 10,
        // 	},
        // }))
        // .pipe(new prism.opus.OggDemuxer())
        .pipe(new prism.opus.Decoder({
        rate: 48000,
        channels: 1,
        frameSize: 960
    }));
    // const oggStream = ;
    audioSocket.on('open', function () {
        decoder.on('data', function (chunk) {
            // if (audioSocket.readyState == audioSocket.OPEN) {
            // 	audioSocket.send(chunk);
            // }
            audioSocket.send(chunk);
            // else {
            // 	console.log(`Attempted to send audio when Socket is still in ${audioSocket.readyState} state`);
            // }
        });
        decoder.on('close', function () {
            audioSocket.close();
        });
    });
    audioSocket.on('error', function () {
        console.error('An error occurred while connecting to WebSocket');
    });
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
