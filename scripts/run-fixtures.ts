/**
 * Fixture run (PLAN D6): drops all five PNG masters and a resume PDF into the real folders, builds to
 * dist-fixture, removes them in a finally, then runs the fixture specs against that build and the
 * build-resilience specs. Refuses to start if real images or a real resume are already present.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { imageSlots } from '../src/data/image-slots.ts';
import { RESUME_FILE } from '../src/lib/resume.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const imageDir = `${root}src/assets/images/`;
const resume = `${root}public/${RESUME_FILE}`;

const existing = imageSlots.filter((slot) => existsSync(imageDir + slot.file)).map((slot) => slot.file);
if (existing.length || existsSync(resume)) {
  console.error(`Real assets are present (${[...existing, existsSync(resume) ? RESUME_FILE : ''].filter(Boolean).join(', ')}).`);
  console.error('The fixture run would overwrite and then delete them, so it will not start. Move them aside first.');
  process.exit(1);
}

// Hero is solid #808080 so AC 1.11 can test the scrim against a mid-grey photo.
const FILLS: Record<string, string> = {
  hero: '#808080',
  keweenaw: '#25404a',
  'research-sql': '#1d2c3a',
  'research-cicd': '#2a2430',
  'section-texture': '#3c6c66',
};

// A minimal valid one-page PDF.
const PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
trailer<</Root 1 0 R>>
%%EOF
`;

const run = (command: string, args: string[], env: Record<string, string> = {}) =>
  spawnSync(command, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } }).status ?? 1;

let status = 0;
try {
  for (const slot of imageSlots) {
    await sharp({ create: { width: slot.width, height: slot.height, channels: 3, background: FILLS[slot.name] } })
      .png()
      .toFile(imageDir + slot.file);
  }
  writeFileSync(resume, PDF);
  console.log('Fixtures written. Building dist-fixture...');
  status = run('npx', ['astro', 'build'], { OUT_DIR: './dist-fixture' });
} finally {
  for (const slot of imageSlots) rmSync(imageDir + slot.file, { force: true });
  rmSync(resume, { force: true });
}

const leftovers = readdirSync(imageDir).filter((name) => name !== '.gitkeep');
const cleanup = leftovers.length === 0 && !existsSync(resume);
console.log(cleanup ? 'AC 7.7 pass: fixtures removed, src/assets/images holds only .gitkeep' : `AC 7.7 FAIL: left behind ${leftovers.join(', ')}`);

if (status !== 0) {
  console.error('Fixture build failed.');
  process.exit(status);
}

const fixtureTests = run('npx', ['playwright', 'test', '--project=fixtures'], { FIXTURES: '1', REPORT_NAME: 'fixtures' });
const buildTests = run('npx', ['playwright', 'test', '--project=builds'], { REPORT_NAME: 'builds' });
process.exit(cleanup ? fixtureTests || buildTests : 1);
