import { Guild } from 'discord.js';
import { randomImages, compositeLogo, compositeGif } from './images';

export async function randomizeGuildIcon(guild: Guild): Promise<void> {
  console.log(`Updating the icon on ${guild.name}`);

  const images = (await randomImages(5, 'icon'));
  console.log(`  ...fetahed images.`);

  const imagesWithLogo = await Promise.all(images.map(compositeLogo));
  console.log(`  ...added logos.`);

  const gif = await compositeGif(imagesWithLogo);
  console.log(`  ...created GIF.`);

  await guild.setIcon(gif);
  console.log(`  ...updated!`);
}

export async function randomizeGuildBanner(guild: Guild): Promise<void> {
  console.log(`Updating the banner on ${guild.name}`);

  const image = (await randomImages(1, 'banner'))[0];

  guild.setBanner(image);
  console.log(`  ...updated!`);
}
