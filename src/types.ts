export type SectionId = 'about' | 'experience' | 'projects' | 'research' | 'skills' | 'contact';

export interface EducationEntry {
  degree: string;
  school: string;
  /** Rendered verbatim after the degree. */
  detail: string;
}

export interface Certification {
  name: string;
  /** When set, the chip links to this verification page. */
  url?: string;
}

export interface Profile {
  name: string;
  firstName: string;
  lastName: string;
  location: string;
  relocation: string;
  email: string;
  linkedin: string;
  github: string;
  linkedinHandle: string;
  githubHandle: string;
  site: string;
  headline: string;
  tagline: string;
  summary: string;
  story: string;
  metaDescription: string;
  role: string;
  stack: string;
  /** Short stack line for the Open Graph card. */
  ogStack: string;
  education: EducationEntry[];
  certification: Certification;
  contactLine: string;
}

export interface Role {
  designator: string;
  role: string;
  company: string;
  location?: string;
  /** ISO year-month. Display order is derived from this, never from array order. */
  start: string;
  dateRange: string;
  bullets: string[];
  variant: 'ic' | 'test-point';
  active?: boolean;
}

export interface SkillGroup {
  bank: string;
  label: string;
  parts: string[];
  note?: string;
}

export interface ResearchItem {
  id: 'sql' | 'cicd';
  title: string;
  description: string;
  slot: 'research-sql' | 'research-cicd';
  paperUrl?: string;
  repoUrl?: string;
}

export interface GitHubRepo {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  size: number;
  topics?: string[];
}

export interface ProjectOverride {
  description?: string;
  tags?: string[];
  url?: string;
}

export interface ProjectCardData {
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  tags: string[];
  pushedAt: string;
}

export interface ResearchPlaceholder {
  title: string;
  line: string;
}

export type SlotName = 'hero' | 'keweenaw' | 'research-sql' | 'research-cicd' | 'section-texture';

export interface ImageSlotDef {
  name: SlotName;
  file: string;
  width: number;
  height: number;
  prompt: string;
  alt: string;
  sizes: string;
}
