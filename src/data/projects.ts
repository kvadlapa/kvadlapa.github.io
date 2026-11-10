import type { ProjectOverride, ResearchPlaceholder } from '../types.ts';
import { research } from './research.ts';

// TODO(Kiran) T4 (blocks launch quality): confirm or replace this list, and check coursework repos may be public.
/** Pin mechanism (PLAN D5): these render first, in this order. */
export const featured: string[] = [
  'job-portal-springboot',
  'springboot-microservices-main',
  'smartbudget',
  'iot-pipeline',
  'RemoteRobotUI',
  'robot_tracker',
];

/** Never shown, even when pinned. */
export const exclude: string[] = [
  'kvadlapa',
  '-smartbudget',
  'Mermaid-tester',
  'kvadlapa.github.io',
  'neetcode-submissions',
  'Java',
];

// TODO(Kiran) T4: almost no repo has a description. Add them on GitHub or here, keyed by repo name:
//   'smartbudget': { description: 'Your words', tags: ['java', 'spring-boot'] },
/** Per-repo replacements. Nobody writes these from guesses (PLAN D13). */
export const overrides: Record<string, ProjectOverride> = {};

/** The two research repos, shown after the repo cards until they are public. */
export const placeholders: ResearchPlaceholder[] = research.map(({ title }) => ({
  title,
  line: 'Repository not yet public',
}));
