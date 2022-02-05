const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token, redisEnabled, redisUser, redisPass, redisConnection } = require('./config.json');

const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MEMBERS],
});
module.exports.client = client;

// ORM
const Keyv = require('keyv');
let keyv;
if (redisEnabled) {
    keyv = new Keyv(`redis://${redisUser}:${redisPass}@${redisConnection}`);
}
else {
    keyv = new Keyv('sqlite://db.sqlite');
}
keyv.on('error', err => console.error('Keyv connection error:', err));
module.exports.keyv = keyv;

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    }
    else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.login(token);
