import type { ResearchItem } from '../types.ts';

// TODO(Kiran) T12: confirm titles and descriptions can be public (advisor, co-authors, unpublished work),
// and set paperUrl and repoUrl when ready. Each link renders only when its URL is set.
// Descriptions are the brief's wording in sentence case (team lead's decision, fix round 1).
export const research: ResearchItem[] = [
  {
    id: 'sql',
    title: 'LLM-Assisted SQL Query Optimization',
    description: 'Using LLMs to detect and rewrite inefficient SQL, evaluated against execution plans',
    slot: 'research-sql',
  },
  {
    id: 'cicd',
    title: 'Security Misconfigurations in CI/CD Workflows',
    description: 'An empirical study of software supply-chain risks in pipeline configurations',
    slot: 'research-cicd',
  },
];
