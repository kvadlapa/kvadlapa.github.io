import type { ImageMetadata } from 'astro';
import { imageSlots, slotDef } from '../data/image-slots.ts';
import type { SlotName } from '../types.ts';

const WIDTHS = [480, 768, 1280, 1920, 2560, 3840];

// The glob needs a literal path. Nothing imports a PNG directly, so a missing file cannot break the build.
const masters = import.meta.glob<{ default: ImageMetadata }>('/src/assets/images/*.png', { eager: true });

export function slotImage(name: SlotName): ImageMetadata | undefined {
  return masters[`/src/assets/images/${slotDef(name).file}`]?.default;
}

/** Never upscales: widths stop at the master's own width. */
export function slotWidths(image: ImageMetadata): number[] {
  return WIDTHS.filter((width) => width <= image.width);
}

let reported = false;

/** Logs one line per missing or undersized slot. Safe to call from several components. */
export function reportSlots(): void {
  if (reported) return;
  reported = true;
  for (const slot of imageSlots) {
    const image = slotImage(slot.name);
    if (!image) {
      console.warn(`[images] ${slot.file} is missing, using the fallback art`);
    } else if (image.width < slot.width || image.height < slot.height) {
      console.warn(
        `[images] ${slot.file} is ${image.width}x${image.height}, smaller than the ${slot.width}x${slot.height} target. Shipping without upscaling.`,
      );
    }
  }
}
