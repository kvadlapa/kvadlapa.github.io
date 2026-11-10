import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { APIRoute } from 'astro';
import satori from 'satori';
import { profile } from '../data/profile.ts';
import { socketGeometry } from '../lib/socket-art.ts';

const font = (path: string) => readFileSync(join(process.cwd(), 'node_modules/@fontsource', path));

function artDataUri(): string {
  const { front, mid, vias, pads } = socketGeometry();
  const viaMarks = vias
    .map(({ x, y }) => `<circle cx="${x}" cy="${y}" r="6" fill="#C47A4A" opacity=".85"/><circle cx="${x}" cy="${y}" r="2.5" fill="#0B1218"/>`)
    .join('');
  const padMarks = pads.map(({ x, y, w, h }) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 30 1600 840">
<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="1210" cy="450" r="620"><stop offset="0" stop-color="#C47A4A" stop-opacity=".24"/><stop offset=".55" stop-color="#C47A4A" stop-opacity=".07"/><stop offset="1" stop-color="#C47A4A" stop-opacity="0"/></radialGradient>
<radialGradient id="p" gradientUnits="userSpaceOnUse" cx="1560" cy="60" r="360"><stop offset="0" stop-color="#5FA39A" stop-opacity=".16"/><stop offset="1" stop-color="#5FA39A" stop-opacity="0"/></radialGradient></defs>
<rect x="500" y="-300" width="1500" height="1500" fill="url(#g)"/><rect x="1100" y="-400" width="1000" height="900" fill="url(#p)"/>
<g fill="none" stroke="#C47A4A" stroke-width="5" stroke-linejoin="round"><path d="${mid}" opacity=".42"/><path d="${front}" opacity=".95"/></g>
${viaMarks}<g fill="#E29A64" opacity=".8">${padMarks}</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const text = (style: Record<string, unknown>, children: unknown) => ({ type: 'div', props: { style, children } });

export const GET: APIRoute = async () => {
  const card = {
    type: 'div',
    props: {
      style: { position: 'relative', display: 'flex', width: 1200, height: 630, backgroundColor: '#0B1218' },
      children: [
        { type: 'img', props: { src: artDataUri(), width: 1200, height: 630, style: { position: 'absolute', left: 0, top: 0 } } },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: 0,
              top: 0,
              width: 1200,
              height: 630,
              backgroundImage: 'linear-gradient(90deg, #0B1218 0%, rgba(11,18,24,.92) 46%, rgba(11,18,24,0) 76%)',
            },
          },
        },
        {
          type: 'div',
          props: {
            style: { position: 'absolute', left: 72, top: 72, bottom: 72, width: 700, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
            children: [
              text({ fontFamily: 'DM Mono', fontWeight: 500, fontSize: 22, letterSpacing: '.08em', color: '#C47A4A' }, profile.role.toUpperCase()),
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column' },
                  children: [
                    text({ fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 96, lineHeight: 1, letterSpacing: '-.03em', color: '#E8ECEF' }, profile.firstName),
                    text({ fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 96, lineHeight: 1, letterSpacing: '-.03em', color: '#E8ECEF' }, profile.lastName),
                    text({ fontFamily: 'Instrument Sans', fontWeight: 500, fontSize: 34, marginTop: 28, color: '#E8ECEF' }, profile.tagline),
                  ],
                },
              },
              text({ fontFamily: 'DM Mono', fontWeight: 400, fontSize: 22, color: '#8C99A4' }, profile.ogStack),
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(card as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Bricolage Grotesque', data: font('bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff'), weight: 700, style: 'normal' },
      { name: 'Instrument Sans', data: font('instrument-sans/files/instrument-sans-latin-500-normal.woff'), weight: 500, style: 'normal' },
      { name: 'DM Mono', data: font('dm-mono/files/dm-mono-latin-400-normal.woff'), weight: 400, style: 'normal' },
      { name: 'DM Mono', data: font('dm-mono/files/dm-mono-latin-500-normal.woff'), weight: 500, style: 'normal' },
    ],
  });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
