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
exports.__esModule = true;
exports.leaveHandler = void 0;
var voice_1 = require("@discordjs/voice");
/**
 * Handler function for quit the bot to the voice channel
 * @type {Function}
 * @param {InteractionType} interaction Message that your application receives when a user uses an application command or a message component. See {@link https://discord.com/developers/docs/interactions/receiving-and-responding | Interaction Documentation}
 * @return {void}
 */
function leaveHandler(interaction) {
    return __awaiter(this, void 0, void 0, function () {
        var guildId, connection, success;
        return __generator(this, function (_a) {
            guildId = interaction.guild.id;
            connection = (0, voice_1.getVoiceConnection)(guildId);
            if (!connection) {
                console.warn('Currently in idle. Join a voice channel to use this command.');
                interaction.reply({
                    ephemeral: true,
                    content: 'Currently in idle. Join a voice channel to use this command.'
                });
            }
            try {
                success = connection.receiver.subscriptions["delete"](interaction.user.id);
                if (!success) {
                    console.info('Could not disconnect from voice channel, please call the leave method correctly.');
                    interaction.reply({
                        ephemeral: true,
                        content: 'Could not disconnect from voice channel, please call the leave method correctly.'
                    });
                }
                connection.disconnect();
                console.info('Successfully disconnected from voice channel.');
                interaction.reply({ ephemeral: true, content: 'Successfully disconnected from voice channel.' });
            }
            catch (error) {
                console.error(error);
                interaction.reply({
                    ephemeral: true,
                    content: 'Could not leave voice channel due to an unexpected error. Please disconnect the bot manually.'
                });
            }
            return [2 /*return*/];
        });
    });
}
exports.leaveHandler = leaveHandler;
