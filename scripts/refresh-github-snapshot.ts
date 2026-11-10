import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fetchRepos } from '../src/lib/github.ts';

const target = fileURLToPath(new URL('../src/data/github-snapshot.json', import.meta.url));

const repos = await fetchRepos();
if (repos.length === 0) {
  console.error('GitHub returned no repos. Keeping the existing snapshot.');
  process.exit(1);
}

const trimmed = repos
  .map((repo) => ({
    name: repo.name,
    html_url: repo.html_url,
    description: repo.description,
    language: repo.language,
    stargazers_count: repo.stargazers_count,
    pushed_at: repo.pushed_at,
    fork: repo.fork,
    archived: repo.archived,
    size: repo.size,
    topics: repo.topics ?? [],
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(target, `${JSON.stringify(trimmed, null, 2)}\n`);
console.log(`Wrote ${trimmed.length} repos to src/data/github-snapshot.json`);
