const fs = require("fs");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const {
    token,
    redisEnabled,
    redisUser,
    redisPass,
    redisConnection,
} = require("./config.json");
const { parentLogger } = require("./logger");

// when an uncaught exception is encountered...
process.on("uncaughtException", (err) => {
    // ...log the exception and keep going
    parentLogger.fatal(err, "Uncaught exception detected");
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
    ],
});
module.exports.client = client;

// ORM + logger
const Keyv = require("keyv");
const dbKeyvLogger = parentLogger.child({ module: "keyv" });
let keyv;
// TODO: add support for more storage backends supported by keyv
if (redisEnabled) {
    keyv = new Keyv(`redis://${redisUser}:${redisPass}@${redisConnection}`);
} else {
    keyv = new Keyv("sqlite://db.sqlite");
}
keyv.on("error", (err) => dbKeyvLogger.error("Keyv connection error:", err));
module.exports.keyv = keyv;

client.commands = new Collection();
const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

const eventFiles = fs
    .readdirSync("./events")
    .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.login(token);
