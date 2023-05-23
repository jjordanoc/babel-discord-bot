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
var discord_js_1 = require("discord.js");
var commands_js_1 = __importDefault(require("./commands.js"));
var dotenv = __importStar(require("dotenv"));
dotenv.config();
/**
 * The IDs of the users that can be recorded by the bot.
 */
var recordable = new Set();
var client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildVoiceStates, discord_js_1.GatewayIntentBits.GuildMessages] });
// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(discord_js_1.Events.ClientReady, function (c) {
    console.log("Ready! Logged in as ".concat(c.user.tag));
});
client.on(discord_js_1.Events.InteractionCreate, function (interaction) {
    if (!interaction.isCommand() || !interaction.guildId)
        return;
    commands_js_1["default"].execute(interaction)
        .then(function (result) { return console.log('Command returned this', result); })["catch"](function (err) { return console.error('Command failed', err); });
});
client.on(discord_js_1.Events.Error, console.warn);
client.login(process.env.TOKEN);
