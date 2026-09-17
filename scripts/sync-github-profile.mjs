import fs from 'node:fs/promises';

const owner = 'SamoTech';
const repo = 'SamoTech';
const api = 'https://api.github.com';
const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };

async function github(path) {
  const res = await fetch(`${api}${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  return res.json();
}

const [profile, repos] = await Promise.all([
  github(`/users/${owner}`),
  github(`/users/${owner}/repos?per_page=100&sort=updated`),
]);

const publicRepos = repos.filter(r => !r.fork && !r.archived);
const payload = {
  generatedAt: new Date().toISOString(),
  profile: {
    login: profile.login,
    name: profile.name,
    bio: profile.bio,
    avatar: profile.avatar_url,
    htmlUrl: profile.html_url,
    followers: profile.followers,
    following: profile.following,
    publicRepos: profile.public_repos,
    createdAt: profile.created_at,
  },
  repositories: publicRepos.map(r => ({
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    url: r.html_url,
    homepage: r.homepage,
    language: r.language,
    stars: r.stargazers_count,
    forks: r.forks_count,
    topics: r.topics ?? [],
    updatedAt: r.updated_at,
    pushedAt: r.pushed_at,
  })),
};

await fs.mkdir('data', { recursive: true });
await fs.writeFile('data/github.json', JSON.stringify(payload, null, 2) + '\n');
console.log(`Synced ${publicRepos.length} repositories for ${owner}.`);
