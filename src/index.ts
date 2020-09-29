import Discord, { Guild, Message } from 'discord.js';
import config from './config';
import { guildAvailable, guildUnavailable } from './guildIntervals';
import { randomizeGuildIcon, randomizeGuildBanner } from './actions';

const client = new Discord.Client();

function updateGuild(guild: Guild) {
  randomizeGuildIcon(guild);
  randomizeGuildBanner(guild);
}

client.on('ready', async (): Promise<void> => {
  console.log('Connected!');
  const alreadyJoinedGuilds = client.guilds.valueOf();
  alreadyJoinedGuilds.forEach((guild: Guild): void => guildAvailable(guild, updateGuild));
});

client.on('guildCreate', (guild: Guild): void => guildAvailable(guild, updateGuild));
client.on('guildDelete', (guild: Guild): void => guildUnavailable(guild));

client.on('message', async (msg: Message) => {
  if (!msg.guild) return;

  if (msg.content === '$random icon') {
    randomizeGuildIcon(msg.guild);
  } else if (msg.content === '$random banner') {
    randomizeGuildBanner(msg.guild);
  }
});

console.log('Starting up...');
client.login(config.discord.token);
