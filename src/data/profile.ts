import type { Profile } from '../types.ts';

export const profile: Profile = {
  name: 'Kiran Vadlapally',
  firstName: 'Kiran',
  lastName: 'Vadlapally',
  location: 'Houghton, MI',
  relocation: 'open to relocation',
  // TODO(Kiran) T16: this address is public in the HTML and JSON-LD, so expect some spam.
  email: 'vadlapallykiran@gmail.com',
  // TODO(Kiran) T15: confirm this LinkedIn URL resolves.
  linkedin: 'https://linkedin.com/in/kvadlapa',
  github: 'https://github.com/kvadlapa',
  linkedinHandle: '/in/kvadlapa',
  githubHandle: '/kvadlapa',
  site: 'https://kvadlapa.github.io/',
  headline: 'Backend Software Engineer: reliable, fault-tolerant services in C#/.NET and Java',
  tagline: 'From copper traces to API connectors.',
  summary:
    'Backend software engineer with an M.S. in Computer Science and 3 years of experience in Java (Spring Boot) and C#/.NET. I design, build, and operate distributed services end to end, focused on reliability, fault tolerance, and scale.',
  story:
    "I studied Electrical Engineering, where copper traces carry signals. Then I went to grad school at Michigan Tech in the Keweenaw, Michigan's Copper Country. Now I build API connectors that carry data between identity and enterprise systems.",
  metaDescription:
    'Kiran Vadlapally, backend software engineer: C#/.NET and Java services built for reliability, fault tolerance, and scale. From copper traces to API connectors.',
  role: 'Software Engineer',
  stack: 'C#/.NET · Java · REST/SOAP',
  ogStack: 'C#/.NET · Java · Spring Boot · Distributed services',
  // TODO(Kiran) T9: add dates if wanted. The M.S. start would explain the 2023-2024 gap on the board.
  education: [
    { degree: 'M.S. Computer Science', school: 'Michigan Tech', detail: '2025' },
    { degree: 'B.S. Electrical & Electronics Engineering', school: 'MLR Institute of Technology', detail: 'Hyderabad' },
  ],
  // TODO(Kiran) T8: "verified credential" implies proof. Add a verification url and confirm the cert is current.
  certification: {
    name: 'Microsoft Certified: Identity and Access Administrator Associate (SC-300)',
  },
  // TODO(Kiran) T10: decide whether to add a work authorization line. Nothing was stated, so none is shown.
  contactLine: 'Open to software engineering roles: on-site, remote, or relocation.',
};
