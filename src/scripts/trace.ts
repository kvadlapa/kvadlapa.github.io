interface Point {
  x: number;
  y: number;
}

export interface Branch {
  el: SVGPathElement;
  length: number;
  y: number;
  scrollDrawn: boolean;
}

export interface Via {
  el: SVGCircleElement;
  y: number;
}

const NS = 'http://www.w3.org/2000/svg';
const main = document.querySelector('main') as HTMLElement;
const svg = document.querySelector('svg[data-trace]') as SVGSVGElement;
const bed = svg.querySelector('[data-trace-bed]') as SVGPathElement;
const live = svg.querySelector('[data-trace-main]') as SVGPathElement;
const branchLayer = svg.querySelector('[data-trace-branches]') as SVGGElement;
const viaLayer = svg.querySelector('[data-trace-vias]') as SVGGElement;
const gradient = svg.querySelector('#trace-grad') as SVGLinearGradientElement;
const wide = matchMedia('(min-width: 48rem)');

export const trace = {
  live,
  total: 0,
  mainTop: 0,
  table: [] as [number, number][],
  branches: [] as Branch[],
  vias: [] as Via[],
};

const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

function locate(el: Element): Point {
  const box = el.getBoundingClientRect();
  const origin = main.getBoundingClientRect();
  return { x: box.left - origin.left + box.width / 2, y: box.top - origin.top + box.height / 2 };
}

function anchor(selector: string): Point {
  return locate(document.querySelector(`[data-trace-anchor]${selector}`) as Element);
}

/** The J1 connector straddles the panel's top border, so land on its lower edge, inside the panel. */
function terminus(): Point {
  const el = document.querySelector('[data-trace-anchor="end"]') as Element;
  const point = locate(el);
  return { x: point.x, y: point.y + el.getBoundingClientRect().height / 2 - 1 };
}

const toPath = (points: Point[]) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('');

function route(): Point[] {
  const c = 1.5 * rem();
  const start = anchor('[data-trace-anchor="start"]');
  const end = terminus();
  const left = anchor('[data-trace-anchor="rail-l"]').x;
  const right = anchor('[data-trace-anchor="rail-r"]').x;
  const gapHero = anchor('[data-gap="hero"]').y;
  const gapProjects = anchor('[data-gap="projects"]').y;
  const gapSkills = anchor('[data-gap="skills"]').y;

  return [
    start,
    { x: start.x, y: gapHero - c },
    { x: start.x - c, y: gapHero },
    { x: left + c, y: gapHero },
    { x: left, y: gapHero + c },
    { x: left, y: gapProjects - c },
    { x: left + c, y: gapProjects },
    { x: right - c, y: gapProjects },
    { x: right, y: gapProjects + c },
    { x: right, y: gapSkills - c },
    { x: right - c, y: gapSkills },
    { x: end.x + c, y: gapSkills },
    { x: end.x, y: gapSkills + c },
    end,
  ];
}

function straightRoute(): Point[] {
  const x = Math.round(anchor('[data-trace-anchor="rail-l"]').x);
  const badge = locate(document.querySelector('[data-credential]') as Element);
  return [
    { x, y: badge.y },
    { x, y: terminus().y },
  ];
}

/** Walks the route into [y, length] pairs. A level leg spans 2rem of scroll so it draws instead of snapping. */
function buildTable(points: Point[]): { table: [number, number][]; total: number } {
  const spread = rem();
  const table: [number, number][] = [[points[0].y, 0]];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const start = length;
    length += Math.hypot(to.x - from.x, to.y - from.y);
    if (Math.abs(to.y - from.y) < 0.5) {
      table.pop();
      table.push([to.y - spread, start], [to.y + spread, length]);
    } else {
      table.push([to.y, length]);
    }
  }
  return { table, total: length };
}

function addStub(name: string, d: string, y: number, length: number, scrollDrawn: boolean): void {
  const under = document.createElementNS(NS, 'path');
  under.setAttribute('class', 'trace-bed');
  under.setAttribute('d', d);
  const path = document.createElementNS(NS, 'path');
  path.dataset.branch = name;
  path.setAttribute('d', d);
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length}`;
  branchLayer.append(under, path);
  trace.branches.push({ el: path, length, y, scrollDrawn });
}

function addVia(x: number, y: number, radius: number): void {
  const circle = document.createElementNS(NS, 'circle');
  circle.setAttribute('class', 'trace-via');
  circle.setAttribute('cx', `${x}`);
  circle.setAttribute('cy', `${y}`);
  circle.setAttribute('r', `${radius}`);
  viaLayer.append(circle);
  trace.vias.push({ el: circle, y });
}

function buildBranches(points: Point[]): void {
  const left = anchor('[data-trace-anchor="rail-l"]').x;
  const right = anchor('[data-trace-anchor="rail-r"]').x;
  const via = 0.25 * rem();

  for (const name of ['about', 'experience', 'projects', 'research', 'skills']) {
    const target = anchor(`[data-trace-anchor="section"][data-section="${name}"]`);
    const rail = name === 'research' || name === 'skills' ? right : left;
    addStub(name, `M${rail} ${target.y}H${target.x}`, target.y, Math.abs(target.x - rail), true);
    addVia(rail, target.y, via);
  }

  const drop = points[points.length - 2];
  const end = points[points.length - 1];
  addStub('contact', `M${drop.x} ${drop.y}L${end.x} ${end.y}`, drop.y, end.y - drop.y, true);

  // The /contact label sits on the drop line's path: run its hairline from the drop to the via.
  const label = anchor('[data-trace-anchor="section"][data-section="contact"]');
  addStub('contact-label', `M${drop.x} ${label.y}H${label.x}`, label.y, Math.abs(drop.x - label.x), true);
  addVia(drop.x, label.y, via);

  for (const pin of document.querySelectorAll<HTMLElement>('[data-pin]')) {
    const target = locate(pin);
    addStub(`component-${pin.dataset.pin}`, `M${left} ${target.y}H${target.x}`, target.y, target.x - left, false);
    addVia(left, target.y, via);
  }
}

export function rebuild(): void {
  branchLayer.replaceChildren();
  viaLayer.replaceChildren();
  trace.branches = [];
  trace.vias = [];

  const points = wide.matches ? route() : straightRoute();
  const d = toPath(points);
  bed.setAttribute('d', d);
  live.setAttribute('d', d);
  gradient.setAttribute('y2', `${main.offsetHeight}`);
  Object.assign(trace, buildTable(points));
  trace.mainTop = main.getBoundingClientRect().top + window.scrollY;

  if (wide.matches) {
    buildBranches(points);
  } else {
    for (const section of document.querySelectorAll('[data-trace-anchor="section"]')) {
      addVia(points[0].x, locate(section).y, 0.1875 * rem());
    }
  }

  document.documentElement.classList.add('trace-ready');
  document.dispatchEvent(new Event('trace:built'));
}

export function lengthAt(y: number): number {
  const { table, total } = trace;
  if (y <= table[0][0]) return 0;
  for (let i = 1; i < table.length; i++) {
    const [y1, l1] = table[i];
    if (y <= y1) {
      const [y0, l0] = table[i - 1];
      return l0 + ((y - y0) / (y1 - y0)) * (l1 - l0);
    }
  }
  return total;
}

export function onRebuildNeeded(listener: () => void): void {
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      listener();
    });
  };
  new ResizeObserver(schedule).observe(main);
  wide.addEventListener('change', schedule);
  document.fonts.ready.then(schedule);
}
