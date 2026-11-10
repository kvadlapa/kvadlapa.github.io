/** Geometry for the hero socket (DESIGN 6.1), shared by the inline SVG and the OG card. */
const WEST_ENDS = [860, 640, 760, 520, 700, 590, 430, 360, 470, 610, 540, 720, 660, 800, 880];

export interface SocketGeometry {
  front: string;
  mid: string;
  vias: { x: number; y: number; front: boolean }[];
  pads: { x: number; y: number; w: number; h: number }[];
}

export function socketGeometry(): SocketGeometry {
  let front = '';
  let mid = '';
  const vias: SocketGeometry['vias'] = [];
  const pads: SocketGeometry['pads'] = [];

  for (let i = 0; i < 15; i++) {
    const off = i - 7;
    const a = Math.abs(off);
    const y0 = 258 + 28 * i;

    const westY = 450 + 16 * off;
    const westX1 = 1000 - 6 * a;
    const westX2 = westX1 - Math.abs(y0 - westY);
    const xEnd = WEST_ENDS[i];
    const west = `M1040 ${y0}H${westX1}L${westX2} ${westY}H${xEnd}`;
    const isFront = a <= 4;
    if (isFront) front += west;
    else mid += west;
    vias.push({ x: xEnd, y: westY, front: isFront });

    const eastY = 450 + 76 * off;
    const eastX1 = 1400 + 4 * a;
    const eastX2 = eastX1 + Math.abs(y0 - eastY);
    mid += `M1380 ${y0}H${eastX1}L${eastX2} ${eastY}H3400`;

    pads.push({ x: 1038, y: y0 - 6, w: 28, h: 12 }, { x: 1354, y: y0 - 6, w: 28, h: 12 });
  }

  for (let i = 0; i < 11; i++) {
    const off = i - 5;
    const a = Math.abs(off);
    const x0 = 1070 + 28 * i;
    const northY1 = 200 - 4 * a;
    const southY1 = 700 + 4 * a;
    mid += `M${x0} 230V${northY1}L${x0 + 30 * off} ${northY1 - 30 * a}V-420`;
    mid += `M${x0} 670V${southY1}L${x0 + 30 * off} ${southY1 + 30 * a}V1320`;
    pads.push({ x: x0 - 6, y: 228, w: 12, h: 28 }, { x: x0 - 6, y: 644, w: 12, h: 28 });
  }

  return { front, mid, vias, pads };
}
