import type { SkillGroup } from '../types.ts';

export const skills: SkillGroup[] = [
  { bank: 'A', label: 'Languages', parts: ['Java', 'C#', 'SQL', 'VB.NET'], note: 'object-oriented design, design patterns' },
  {
    bank: 'B',
    label: 'Backend',
    parts: ['.NET Framework', 'ASP.NET', 'Spring Boot', 'Hibernate (JPA)', 'REST', 'SOAP', 'Microservices'],
  },
  {
    bank: 'C',
    label: 'Data',
    parts: ['PostgreSQL', 'MySQL', 'SQL Server'],
    note: 'query tuning, indexing, execution plans',
  },
  {
    bank: 'D',
    label: 'Reliability & Practices',
    parts: ['Incremental sync', 'Idempotency', 'Fault tolerance', 'Retries', 'Rate limiting', 'Unit & integration testing', 'Code reviews', 'CI/CD', 'Production operations'],
  },
  {
    bank: 'E',
    label: 'Identity & Security',
    parts: ['OAuth 2.0', 'OpenID Connect', 'Microsoft Entra ID', 'Active Directory'],
  },
  {
    bank: 'F',
    label: 'Cloud & DevOps',
    parts: ['AWS', 'Azure', 'Docker', 'Jenkins', 'Bitbucket Pipelines', 'Git', 'Linux'],
  },
];
