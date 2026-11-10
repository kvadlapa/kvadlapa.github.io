export interface Viewport {
  width: number;
  height: number;
}

/** PLAN section 4, set V. */
export const V: Viewport[] = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 414, height: 896 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 },
  { width: 844, height: 390 },
];

export const THEMES = ['dark', 'light'] as const;
export type Theme = (typeof THEMES)[number];

export const label = ({ width, height }: Viewport) => `${width}x${height}`;
