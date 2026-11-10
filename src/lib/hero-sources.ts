import { join } from 'node:path';
import { getImage } from 'astro:assets';
import sharp from 'sharp';
import { slotDef } from '../data/image-slots.ts';
import { slotImage, slotWidths } from './images.ts';

const PORTRAIT_WIDTHS = [480, 768, 1280];
const PORTRAIT_MEDIA = '(max-width: 47.99rem)';
const LANDSCAPE_MEDIA = '(min-width: 48rem)';
const PORTRAIT_SIZES = 'max(100vw, 80vh)';

/** Everything HeroImage and its head preloads need. <Picture> has no per-source media (PLAN D7). */
async function build() {
  const image = slotImage('hero');
  if (!image) return undefined;

  const def = slotDef('hero');
  const widths = slotWidths(image);
  const portraitHeight = image.height;
  const portraitWidth = Math.round((portraitHeight * 4) / 5);

  const landscape = (format: 'avif' | 'webp') => getImage({ src: image, format, widths });
  const portrait = (format: 'avif' | 'webp') =>
    getImage({
      src: image,
      format,
      widths: PORTRAIT_WIDTHS.filter((width) => width <= portraitWidth),
      width: portraitWidth,
      height: portraitHeight,
      fit: 'cover',
      position: 'right',
    });

  const [landscapeAvif, landscapeWebp, portraitAvif, portraitWebp] = await Promise.all([
    landscape('avif'),
    landscape('webp'),
    portrait('avif'),
    portrait('webp'),
  ]);

  const lqipBytes = await sharp(join(process.cwd(), 'src/assets/images', def.file))
    .resize(24)
    .blur(1)
    .webp({ quality: 30 })
    .toBuffer();

  return {
    lqip: `data:image/webp;base64,${lqipBytes.toString('base64')}`,
    portraitMedia: PORTRAIT_MEDIA,
    landscapeMedia: LANDSCAPE_MEDIA,
    portrait: {
      avif: portraitAvif.srcSet.attribute,
      webp: portraitWebp.srcSet.attribute,
      sizes: PORTRAIT_SIZES,
    },
    landscape: {
      avif: landscapeAvif.srcSet.attribute,
      webp: landscapeWebp.srcSet.attribute,
      sizes: def.sizes,
    },
    fallback: { src: landscapeWebp.src, width: image.width, height: image.height },
  };
}

let cached: ReturnType<typeof build> | undefined;

export function getHeroSources() {
  cached ??= build();
  return cached;
}
