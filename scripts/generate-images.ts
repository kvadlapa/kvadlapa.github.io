/**
 * Generates the five image slots from their prompts in src/data/image-slots.ts.
 *
 *   npm run images                  list slots; generate only if OPENAI_API_KEY is set
 *   npm run images -- --only hero   one slot
 *   npm run images -- --force       overwrite PNGs that already exist
 *
 * The provider returns at most 1536px, so each image is upscaled with sharp to its slot size,
 * and the script says so (PLAN D19). Review every result for text, logos and faces (T17).
 */
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { imageSlots } from '../src/data/image-slots.ts';

const outDir = fileURLToPath(new URL('../src/assets/images/', import.meta.url));
const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined;
const force = args.includes('--force');
const key = process.env.OPENAI_API_KEY?.trim();
const slots = imageSlots.filter((slot) => !only || slot.name === only);

console.log('Image slots (src/assets/images/):');
for (const slot of slots) {
  const state = existsSync(`${outDir}${slot.file}`) ? 'present' : 'missing';
  console.log(`  ${slot.file.padEnd(20)} ${slot.width}×${slot.height}  ${state}\n    "${slot.prompt}"`);
}

if (!key) {
  console.log('\nNo OPENAI_API_KEY set, so nothing was generated. Add one to .env, or drop PNGs in by hand.');
  process.exit(0);
}

const SAFETY = ' No text, no logos, no people, no faces.';

for (const slot of slots) {
  const target = `${outDir}${slot.file}`;
  if (existsSync(target) && !force) {
    console.log(`skip ${slot.file}: already present (use --force to replace)`);
    continue;
  }
  const size = slot.width >= slot.height ? '1536x1024' : '1024x1536';
  console.log(`generating ${slot.file} at ${size}...`);
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt: slot.prompt + SAFETY, size, quality: 'high', n: 1 }),
  });
  if (!response.ok) {
    console.error(`  failed: HTTP ${response.status} ${await response.text()}`);
    process.exitCode = 1;
    continue;
  }
  const body = (await response.json()) as { data: { b64_json: string }[] };
  const raw = Buffer.from(body.data[0].b64_json, 'base64');
  const png = await sharp(raw).resize(slot.width, slot.height, { fit: 'cover', kernel: 'lanczos3' }).png().toBuffer();
  writeFileSync(target, png);
  console.log(`  wrote ${slot.file}, upscaled from ${size} to ${slot.width}×${slot.height} with sharp`);
}
