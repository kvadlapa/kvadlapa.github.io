import type { Role } from '../types.ts';

export const experience: Role[] = [
  {
    designator: 'U3',
    role: 'Software Engineer',
    company: 'SoftwareIDM',
    location: 'Houghton, MI',
    start: '2025-12',
    dateRange: 'Dec 2025–Present',
    active: true,
    variant: 'ic',
    // TODO(Kiran) T2: these match your resume; a public site is more visible, so confirm your employer is fine with named systems and client counts.
    bullets: [
      'Designed and own the ServiceNow connector end to end, from architecture through release and production support. Replaced hardcoded, per-table logic with a JSON configuration-driven architecture (tables, APIs, pagination, filters), so one codebase serves 3+ clients and onboarding a client takes configuration, not code',
      'Build and maintain C#/.NET connectors that sync identity data several times a day for 6+ client companies across Microsoft Entra ID, Active Directory, Exchange Online, Intune, CyberArk, HashiCorp Vault, SuccessFactors, and Oracle HR, with OAuth 2.0 auth and identity lifecycle operations',
      'Implemented incremental sync with high-watermark tracking, pagination, and filtering, so each run fetches only records changed since the last successful sync rather than all 50,000+, cutting API calls and run time',
      'Made connectors fault-tolerant against unreliable third-party APIs with retries for transient failures, HTTP 429 rate-limit handling, and idempotent writes, so a rerun never creates duplicate records',
      'Operate connectors in production: trace failures seen only with real client data (API errors, serialization mismatches, data-consistency gaps) to root cause, then ship, test, and document the fix',
      'Write unit and integration tests for connector changes and release through Docker, Azure, and Bitbucket Pipelines CI/CD',
      'Review teammates\' pull requests and write Confluence runbooks and resolution guides used by engineers, consultants, and clients',
    ],
  },
  {
    designator: 'U2',
    role: 'Software Engineer',
    company: 'Antra, Inc.',
    location: 'Remote',
    start: '2025-05',
    dateRange: 'May 2025–Nov 2025',
    variant: 'ic',
    bullets: [
      'Built C#/.NET REST and SOAP integrations for enterprise identity clients, including authentication and data transformation between source and target systems, and resolved client-reported integration failures',
    ],
  },
  {
    designator: 'U1',
    role: 'Associate Software Developer',
    company: 'Accenture',
    location: 'Hyderabad, India',
    start: '2022-04',
    dateRange: 'Apr 2022–Aug 2023',
    variant: 'ic',
    bullets: [
      'Developed Spring Boot microservices with Hibernate (JPA) for a production insurance onboarding platform and documented their REST APIs in Swagger for the teams consuming them',
      'Diagnosed slow SQL behind daily production reports using execution plans, then added indexes and removed N+1 query patterns, cutting report response times by about 33%',
      'Contributed to Jenkins and AWS CI/CD pipelines that automated manual release steps',
    ],
  },
  {
    designator: 'TP1',
    role: 'Teaching Assistant & Grader',
    company: 'Michigan Technological University',
    start: '2024-08',
    dateRange: 'Aug 2024–May 2025',
    variant: 'test-point',
    bullets: [
      'Helped students debug Java, compiler errors, and environment setup',
      // TODO(Kiran) T14: confirm the spelling of these three course names.
      'Ran labs/graded for Software Processes & Management, Team Software Project, Model-Driven Software Development',
    ],
  },
];

/** Reverse chronological by start date (PLAN D2), whatever the array order. */
export function byStartDesc(roles: readonly Role[]): Role[] {
  return [...roles].sort((a, b) => b.start.localeCompare(a.start));
}
