/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
import fetch from 'node-fetch';
import sharp from 'sharp';
import { createCanvas, loadImage } from 'canvas';
import streamToArray from 'stream-to-array';
import GIFEncoder from 'gifencoder';

type CmsImageSize = 'icon' | 'banner';
type CmsImageCollection = {
  icon: string[]
  banner: string[]
}

const GRAPH_ENDPOINT = `https://graph.codeday.org/`;
const QUERY = `
  query($pastEventCutoff: CmsDateTime, $futureEventCutoff: CmsDateTime) {
    cms {
      pressPhotos(limit: 1000) {
        items {
          photo {
            icon: url(transform: { width: 512, height: 512, resizeStrategy: FILL, format: JPG, quality: 100})
            banner: url(transform: { width: 1920, height: 1080, resizeStrategy: FILL, format: JPG, quality: 100 })
          }
        }
      }

      nextEvent: events (
        where: { endsAt_gte: $pastEventCutoff, startsAt_lte: $futureEventCutoff },
        order: startsAt_ASC, limit: 1
      ) {
        items {
          banners: themeBackgrounds {
            items {
              url(transform: { width: 1920, height: 1080, resizeStrategy: FILL, format: JPG, quality: 100})
            }
          }
          icons: themeLogoBackgrounds {
            items {
              url(transform: { width: 512, height: 512, resizeStrategy: FILL, format: JPG, quality: 100})
            }
          }
        }
      }

      logo: programs(where: {webname:"codeday"}, limit: 1) {
        items {
          logoWhite {
            url
          }
        }
      }
    }
  }
`;

async function fetchPhoto(url: string) {
  return (await fetch(url)).buffer();
}

function isoDate(offset: number) {
  return (new Date((new Date()).getTime() + (1000 * offset))).toISOString();
}

let logoCache: Buffer;
const imageUrlCache: CmsImageCollection = { icon: [], banner: [] };
async function refreshImageCache() {
  console.log(`Updating image cache...`);
  const queryResult = await fetch(GRAPH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify({
      operationName: null,
      variables: {
        pastEventCutoff: isoDate(-60 * 60 * 24),
        futureEventCutoff: isoDate(60 * 60 * 24 * 3),
      },
      query: QUERY,
    }),
  });
  const { data: { cms } } = (await queryResult.json());

  // Set default images from the pressPhotos collection
  const pressPhotos = cms.pressPhotos.items;
  imageUrlCache.banner = pressPhotos.map((p: any) => p.photo.banner);
  imageUrlCache.icon = pressPhotos.map((p: any) => p.photo.icon);

  // If there's a current event, set images from the event (if available)
  if (cms.nextEvent?.items?.length > 0) {
    const nextEvent = cms.nextEvent.items[0];
    if (nextEvent.banners?.items?.length > 0) {
      imageUrlCache.banner = nextEvent.banners.items.map((b: any) => b.url);
    }
    if (nextEvent.icons?.items?.length > 0) {
      imageUrlCache.icon = nextEvent.icons.items.map((i: any) => i.url);
    }
  }

  console.log(`  ... ${imageUrlCache.banner.length} banners and ${imageUrlCache.icon.length} icons available.`);

  logoCache = await fetchPhoto(cms.logo.items[0].logoWhite.url);
  console.log(`  ... logo updated.`);
}
setInterval(refreshImageCache, 60 * 60 * 12 * 1000);
refreshImageCache();

export async function randomImages(count: number, size: CmsImageSize): Promise<Buffer[]> {
  const result: string[] = new Array(count);
  let len = imageUrlCache[size].length;
  let n = Math.min(count, len);
  const taken = new Array(len);
  while (n--) {
    const x = Math.floor(Math.random() * len);
    result[n] = imageUrlCache[size][x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }
  return Promise.all(result.map((c) => fetchPhoto(c)));
}

export async function compositeLogo(image: Buffer): Promise<Buffer> {
  const input = sharp(image);
  const inputMetadata = await input.metadata();
  const resizedLogo = await sharp(logoCache)
    .resize(Math.floor((inputMetadata.width || 512) * 0.7), Math.floor((inputMetadata.height || 512) * 0.7))
    .png()
    .toBuffer();

  return input
    .composite([{ input: resizedLogo, blend: 'atop' }])
    .jpeg()
    .toBuffer();
}

export async function compositeGif(images: Buffer[]): Promise<Buffer> {
  const { width, height } = await sharp(images[0]).metadata();

  const encoder = new GIFEncoder(width || 512, height || 512);
  const streamPromise = streamToArray(encoder.createReadStream());

  encoder.start();
  encoder.setQuality(75);
  encoder.setDelay(1000);
  encoder.setRepeat(0);

  // Create canvas for drawing images on
  const canvas = createCanvas(width || 512, height || 512);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';

  for (const img of images) {
    // eslint-disable-next-line no-await-in-loop
    const canvasImage = await loadImage(img);
    ctx.fillRect(0, 0, width || 512, height || 512);
    ctx.drawImage(canvasImage, 0, 0);
    encoder.addFrame(ctx);
  }

  encoder.finish();

  const streamParts = await streamPromise;
  const buffers = streamParts
    .map((part) => (Buffer.isBuffer(part) ? part : Buffer.from(part)));

  return Buffer.concat(buffers);
}
