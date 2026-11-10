import type { ImageSlotDef, SlotName } from '../types.ts';

// TODO(Kiran) T17: review generated PNGs for text, logos and faces, and keep these alts accurate.
// The Keweenaw art is AI-generated, so its alt describes the scene and does not claim to be a photograph.
export const imageSlots: ImageSlotDef[] = [
  {
    name: 'hero',
    file: 'hero.png',
    width: 3840,
    height: 2160,
    prompt:
      'Ultra-macro photograph of a dark printed circuit board, glowing copper traces and solder pads, shallow depth of field, cinematic low-key lighting, deep blue-black background, copper and teal tones, subtle bokeh, 8k detail, minimalist, lots of negative space on the left',
    alt: '',
    sizes: 'max(100vw, min(178vh, 120rem))',
  },
  {
    name: 'keweenaw',
    file: 'keweenaw.png',
    width: 3840,
    height: 2160,
    prompt:
      "Moody aerial photograph of Lake Superior shoreline in Michigan's Keweenaw Peninsula at blue hour, dark rocky copper-colored cliffs, light snow, calm deep blue water, cinematic, muted palette with copper and teal accents, no buildings, no text",
    alt: 'Illustration of the Lake Superior shoreline of the Keweenaw Peninsula at blue hour, with dark copper-colored cliffs and calm water.',
    sizes: '(min-width: 64rem) min(50vw, 40rem), calc(100vw - 2rem)',
  },
  {
    name: 'research-sql',
    file: 'research-sql.png',
    width: 2400,
    height: 1600,
    prompt:
      'Abstract 3D render of glowing data tables and query paths flowing through a neural network, copper and teal light on deep navy, clean minimal composition, soft volumetric light',
    alt: 'Abstract render of glowing data tables and query paths flowing through a neural network.',
    sizes: '(min-width: 48rem) min(50vw, 40rem), calc(100vw - 2rem)',
  },
  {
    name: 'research-cicd',
    file: 'research-cicd.png',
    width: 2400,
    height: 1600,
    prompt:
      'Abstract 3D render of an interconnected software pipeline of glass cubes with one cracked, glowing node revealing a hidden flaw, copper and teal on deep navy, minimal, cinematic lighting',
    alt: 'Abstract render of a pipeline of glass cubes with one cracked, glowing node.',
    sizes: '(min-width: 48rem) min(50vw, 40rem), calc(100vw - 2rem)',
  },
  {
    name: 'section-texture',
    file: 'section-texture.png',
    width: 3840,
    height: 2160,
    prompt: 'Top-down macro of oxidized copper surface with patina streaks, seamless, dark, subtle texture',
    alt: '',
    // Shown at 6-10% opacity, so phones get a viewport-width file rather than a cover-accurate one.
    sizes: '(min-width: 64rem) max(100vw, 178vh), 100vw',
  },
];

export function slotDef(name: SlotName): ImageSlotDef {
  const def = imageSlots.find((slot) => slot.name === name);
  if (!def) throw new Error(`Unknown image slot: ${name}`);
  return def;
}
