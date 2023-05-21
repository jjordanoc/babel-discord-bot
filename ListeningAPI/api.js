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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var voice_1 = require("@discordjs/voice");
var express_1 = __importDefault(require("express"));
var node_stream_1 = require("node:stream");
var prism = __importStar(require("prism-media"));
var node_fs_1 = require("node:fs");
var body_parser_1 = __importDefault(require("body-parser"));
var app = (0, express_1["default"])();
app.use(body_parser_1["default"].json());
var port = 3000;
app.post("/listen", function (req, res) {
    var _a = req.body, guildId = _a.guildId, userId = _a.userId;
    console.log("body: ".concat(JSON.stringify(req.body), ", guildId: ").concat(guildId, ", userId: ").concat(userId));
    var connection = (0, voice_1.getVoiceConnection)(guildId);
    res.status(200).send("Successfully started listening to voice channel ".concat(guildId));
    var receiver = connection.receiver;
    var opusStream = receiver.subscribe(userId, {
        end: {
            behavior: voice_1.EndBehaviorType.AfterSilence,
            duration: 1000
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
    var filename = "./recordings/".concat(Date.now(), ".ogg");
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
});
app.listen(port, function () {
    console.log("Example app listening on port ".concat(port));
});
