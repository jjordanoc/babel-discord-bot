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
var node_fs_1 = require("node:fs");
var node_stream_1 = require("node:stream");
var voice_1 = require("@discordjs/voice");
var prism = __importStar(require("prism-media"));
function getDisplayName(userId, user) {
    return user ? "".concat(user.username, "_").concat(user.discriminator) : userId;
}
function createListeningStream(receiver, userId, user) {
    var opusStream = receiver.subscribe(userId, {
        end: {
            behavior: voice_1.EndBehaviorType.Manual
        }
    });
    var oggStream = new prism.opus.OggLogicalBitstream({
        opusHead: new prism.opus.OpusHead({
            channelCount: 2,
            sampleRate: 48000
        }),
        pageSizeControl: {
            maxPackets: 10
        }
    });
    var filename = "./recordings/".concat(Date.now(), "-").concat(getDisplayName(userId, user), ".ogg");
    var out = (0, node_fs_1.createWriteStream)(filename);
    console.log("\uD83D\uDC42 Started recording ".concat(filename));
    (0, node_stream_1.pipeline)(opusStream, oggStream, out, function (err) {
        if (err) {
            console.warn("\u274C Error recording file ".concat(filename, " - ").concat(err.message));
        }
        else {
            console.log("\u2705 Recorded ".concat(filename));
        }
    });
}
exports.createListeningStream = createListeningStream;
