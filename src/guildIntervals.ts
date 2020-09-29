import { Guild } from 'discord.js';

const MINUTE = 60 * 1000;
export interface GuildUpdateFunction {
  (guild: Guild): void
}

interface GuildUpdateInformation {
  lastUpdateDay: number;
  intervalId: NodeJS.Timeout;
}

interface TimeoutFunction {
  (): void
}

function getDay() {
  return Math.floor((+new Date()) / (1000 * 60 * 60 * 24));
}

const guildUpdates: Record<string, GuildUpdateInformation> = {};

function updateGuildIntervalFactory(guild: Guild, updateGuild: GuildUpdateFunction): TimeoutFunction {
  return () => {
    if (guildUpdates[guild.id].lastUpdateDay === getDay()) return;

    // Update the day, and call the update function.
    console.log(`Performing automatic update on ${guild.name}`);
    guildUpdates[guild.id].lastUpdateDay = getDay();
    updateGuild(guild);
  };
}

export function guildAvailable(guild: Guild, updateGuild: GuildUpdateFunction): void {
  console.log(`${guild.name} became available.`);
  const intervalId = setInterval(updateGuildIntervalFactory(guild, updateGuild), MINUTE);
  guildUpdates[guild.id] = {
    intervalId,
    lastUpdateDay: getDay(),
  };
}

export function guildUnavailable(guild: Guild): void {
  console.log(`${guild.name} became unavailable.`);
  if (guild.id in guildUpdates) {
    clearInterval(guildUpdates[guild.id].intervalId);
    delete guildUpdates[guild.id];
  }
}
