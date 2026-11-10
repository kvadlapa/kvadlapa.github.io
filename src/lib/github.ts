import { exclude, featured, overrides } from '../data/projects.ts';
import snapshot from '../data/github-snapshot.json' with { type: 'json' };
import type { GitHubRepo, ProjectCardData, ProjectOverride } from '../types.ts';

const OWNER = 'kvadlapa';
const TIMEOUT_MS = 8000;
const MAX_CARDS = 6;

export interface Curation {
  featured: readonly string[];
  exclude: readonly string[];
  overrides: Readonly<Record<string, ProjectOverride>>;
}

export interface FetchOptions {
  base?: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

class RetryableError extends Error {}

function warn(message: string): void {
  console.warn(`[github] ${message}`);
}

async function requestRepos({ base, token, fetchImpl = fetch }: Required<Pick<FetchOptions, 'base'>> & FetchOptions) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': `${OWNER}-portfolio-build`,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetchImpl(`${base}/users/${OWNER}/repos?per_page=100&type=owner&sort=pushed`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new RetryableError(error instanceof Error ? error.message : String(error));
  }

  if (response.status >= 500) throw new RetryableError(`HTTP ${response.status}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!Array.isArray(body)) throw new Error('response was not an array');
  return body as GitHubRepo[];
}

/** One retry on network or 5xx errors, none on 403/429 (PLAN D4). */
export async function fetchRepos(options: FetchOptions = {}): Promise<GitHubRepo[]> {
  const merged = {
    ...options,
    base: options.base ?? process.env.GH_API_BASE ?? 'https://api.github.com',
    token: options.token ?? process.env.GITHUB_TOKEN,
  };
  try {
    return await requestRepos(merged);
  } catch (error) {
    if (!(error instanceof RetryableError)) throw error;
    return requestRepos(merged);
  }
}

/** Applies filters, then featured order, then stars and recency (PLAN D5, D13). */
export function rankRepos(repos: readonly GitHubRepo[], curation: Curation): GitHubRepo[] {
  const usable = repos.filter(
    (repo) => !repo.fork && !repo.archived && repo.size > 0 && !curation.exclude.includes(repo.name),
  );

  const pinned: GitHubRepo[] = [];
  for (const name of curation.featured) {
    const repo = usable.find((candidate) => candidate.name === name);
    if (repo) pinned.push(repo);
    else if (!curation.exclude.includes(name)) warn(`featured repo "${name}" was not found, dropping it`);
  }

  const rest = usable
    .filter((repo) => !pinned.includes(repo))
    .sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at));

  return [...pinned, ...rest].slice(0, MAX_CARDS);
}

export function toCard(repo: GitHubRepo, override: ProjectOverride = {}): ProjectCardData {
  const description = override.description ?? repo.description?.trim();
  return {
    name: repo.name,
    url: override.url ?? repo.html_url,
    description: description || null,
    language: repo.language,
    tags: override.tags ?? repo.topics ?? [],
    pushedAt: repo.pushed_at,
  };
}

const curation: Curation = { featured, exclude, overrides };

/** Never throws: any failure, or a 200 with no usable repos, uses the committed snapshot (PLAN D4). */
export async function loadProjects(): Promise<ProjectCardData[]> {
  let ranked: GitHubRepo[] = [];
  try {
    ranked = rankRepos(await fetchRepos(), curation);
    if (ranked.length === 0) warn('no usable repos in the API response, using the snapshot');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    warn(`request failed (${reason}), using the snapshot`);
  }
  if (ranked.length === 0) ranked = rankRepos(snapshot as GitHubRepo[], curation);
  return ranked.map((repo) => toCard(repo, curation.overrides[repo.name]));
}
