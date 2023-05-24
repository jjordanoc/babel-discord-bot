"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var discord_command_registry_1 = __importDefault(require("discord-command-registry"));
var voice_1 = require("@discordjs/voice");
var createListeningStream_1 = require("./createListeningStream");
var SlashCommandRegistry = discord_command_registry_1["default"].SlashCommandRegistry;
/*
Define command metadata
*/
var commandList = [
    {
        'name': 'join',
        'description': 'Joins the voice channel of the calling user.',
        'handler': joinHandler
    },
    {
        'name': 'leave',
        'description': 'Leaves the voice channel of the calling user.',
        'handler': leaveHandler
    },
];
var commands = new SlashCommandRegistry();
var _loop_1 = function (i) {
    commands.addCommand(function (command) { return command.setName(commandList[i].name)
        .setDescription(commandList[i].description)
        .setHandler(commandList[i].handler); });
};
for (var i = 0; i < commandList.length; ++i) {
    _loop_1(i);
}
/*
Define command handlers
*/
/*
Joins the voice channel and (temporarily) starts recording the user's audio
 */
function joinHandler(interaction) {
    return __awaiter(this, void 0, void 0, function () {
        var guildId, connection, receiver_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    guildId = interaction.guild.id;
                    connection = (0, voice_1.joinVoiceChannel)({
                        channelId: interaction.member.voice.channel.id,
                        guildId: guildId,
                        adapterCreator: interaction.guild.voiceAdapterCreator,
                        selfDeaf: false,
                        selfMute: true
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, voice_1.entersState)(connection, voice_1.VoiceConnectionStatus.Ready, 20e3)];
                case 2:
                    _a.sent();
                    receiver_1 = connection.receiver;
                    receiver_1.speaking.once('start', function (callerUserId) {
                        console.log('User started speaking. Called event once.');
                        (0, createListeningStream_1.createListeningStream)(receiver_1, callerUserId, interaction.client.users.cache.get(callerUserId));
                    });
                    interaction.reply({ ephemeral: true, content: 'Listening...' });
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.warn(error_1);
                    interaction.reply({ ephemeral: true, content: 'Failed to join voice channel within 20 seconds, please try again later!' });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function leaveHandler(interaction) {
    return __awaiter(this, void 0, void 0, function () {
        var guildId, connection, receiver;
        return __generator(this, function (_a) {
            guildId = interaction.guild.id;
            connection = (0, voice_1.getVoiceConnection)(guildId);
            if (connection) {
                try {
                    receiver = connection.receiver;
                    // Should be changed (should only destroy connections created by the current user)
                    receiver.subscriptions.forEach(function (subscription) {
                        subscription.destroy();
                    });
                    connection.disconnect();
                    console.info('Successfully disconnected from voice channel.');
                    interaction.reply({ ephemeral: true, content: 'Successfully disconnected from voice channel.' });
                }
                catch (error) {
                    console.error(error);
                    interaction.reply({ ephemeral: true, content: 'Could not leave voice channel due to an unexpected error. Please disconnect the bot manually.' });
                }
            }
            else {
                console.warn('Currently in idle. Join a voice channel to use this command.');
                interaction.reply({ ephemeral: true, content: 'Currently in idle. Join a voice channel to use this command.' });
            }
            return [2 /*return*/];
        });
    });
}
exports["default"] = commands;
