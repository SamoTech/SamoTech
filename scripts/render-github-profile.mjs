import fs from 'node:fs/promises';

const data = JSON.parse(await fs.readFile('data/github.json', 'utf8'));
const repos = (data.repositories || [])
  .filter(r => !r.fork && !r.archived)
  .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
const profile = data.profile || {};

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const md = value => String(value ?? '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').trim();
const title = esc(profile.name || profile.login || 'SamoTech');
const bio = esc(profile.bio || '');
const repoCount = repos.length;
const featuredRepos = repos.slice(0, 20);
const years = Math.max(1, new Date().getUTCFullYear() - new Date(profile.createdAt || Date.now()).getUTCFullYear());

const classify = r => {
  const cats = [];
  const text = `${r.name} ${r.description || ''} ${(r.topics || []).join(' ')}`.toLowerCase();
  if (/ai|agent|llm|gemini|gpt|model|memory|langgraph/.test(text)) cats.push('ai');
  if (/next|react|web|vercel|app|site|html|frontend/.test(text)) cats.push('web');
  if (/mikrotik|router|network|infra|bgp|dns|devops|linux|windows/.test(text)) cats.push('network');
  if (/cli|tool|automation|github-action|script|registry/.test(text)) cats.push('tools');
  if (/enigma|iptv|embedded|stb/.test(text)) cats.push('embedded');
  if (!cats.length) cats.push('tools');
  return cats;
};

const cards = featuredRepos.map((r, i) => {
  const cats = classify(r);
  const tags = (r.topics || []).slice(0, 4).map(t => `<span class="card-tag">${esc(t)}</span>`).join('');
  const updated = r.updatedAt ? new Date(r.updatedAt).toISOString().slice(0, 10) : '';
  return `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" class="card ${i === 0 ? 'card--feat' : ''}" data-categories="${cats.join(' ')}">
    <div class="card-body">
      <div class="card-meta"><span class="card-lang">${esc(r.language || 'Repository')}</span><span class="card-stars">★ ${r.stars || 0}</span></div>
      <h3 class="card-title">${esc(r.name)}</h3>
      <p class="card-desc">${esc(r.description || 'Open-source project by SamoTech.')}</p>
      ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      <span class="card-link">Updated ${esc(updated)} · View project →</span>
    </div>
  </a>`;
}).join('\n');

const start = '<!-- GITHUB-DYNAMIC:START -->';
const end = '<!-- GITHUB-DYNAMIC:END -->';
const stats = `<div class="hero-stats reveal r4">
  <div><div class="stat-val">${profile.publicRepos ?? repoCount}</div><div class="stat-lbl">Public repositories</div></div>
  <div><div class="stat-val">${years}yr</div><div class="stat-lbl">On GitHub</div></div>
  <div><div class="stat-val">${profile.followers ?? 0}</div><div class="stat-lbl">Followers</div></div>
</div>`;
const projects = `<section class="section" id="projects" aria-labelledby="projects-heading">
  <div class="wrap">
    <p class="sec-label">Projects</p>
    <h2 class="sec-title" id="projects-heading">Selected Projects</h2>
    <p class="sec-desc">Top 20 repositories by last updated date, loaded directly from GitHub and refreshed automatically.</p>
    <div class="filter-bar" role="group" aria-label="Filter by category">
      <button class="filter-btn active" data-filter="all">All (${featuredRepos.length})</button>
      <button class="filter-btn" data-filter="ai">AI &amp; Agents</button>
      <button class="filter-btn" data-filter="web">Web Apps</button>
      <button class="filter-btn" data-filter="network">Network / Infra</button>
      <button class="filter-btn" data-filter="tools">Tools &amp; CLI</button>
      <button class="filter-btn" data-filter="embedded">Embedded</button>
    </div>
    <div class="proj-grid" id="proj-grid">${cards}</div>
    <div style="margin-top:2.5rem;text-align:center"><a href="${esc(profile.htmlUrl || 'https://github.com/SamoTech?tab=repositories')}" target="_blank" rel="noopener noreferrer" class="btn-ghost">See all repositories on GitHub →</a></div>
  </div>
</section>`;

const readmeProjects = `${start}
## Selected Projects

> Top 20 repositories by last updated date. This section is generated automatically from GitHub and refreshed by the profile sync workflow.

| Project | Last Updated | Language | Stars |
|---|---|---|---:|
${featuredRepos.map(r => `| [**${md(r.name)}**](${r.url}) | ${r.updatedAt ? new Date(r.updatedAt).toISOString().slice(0, 10) : 'N/A'} | ${md(r.language || '—')} | ${r.stars || 0} |`).join('\n')}

_The table is generated from \`data/github.json\`; repositories are sorted by GitHub \`updated_at\`, with forks and archived repositories excluded._

${end}`;

let html = await fs.readFile('index.html', 'utf8');
const heroStatsStart = html.indexOf('<div class="hero-stats reveal r4">');
if (heroStatsStart !== -1) {
  const heroStatsEnd = html.indexOf('</div>\n      </div>\n    </section>', heroStatsStart);
  if (heroStatsEnd !== -1) html = html.slice(0, heroStatsStart) + stats + html.slice(heroStatsEnd + '</div>'.length);
}
const dynamicRegex = new RegExp(`${start}[\\s\\S]*?${end}`);
if (dynamicRegex.test(html)) html = html.replace(dynamicRegex, `${start}\n${projects}\n${end}`);
else {
  const projectsRegex = /<section class="section" id="projects"[\s\S]*?<\/section>/;
  if (!projectsRegex.test(html)) throw new Error('Projects section not found in index.html');
  html = html.replace(projectsRegex, `${start}\n${projects}\n${end}`);
}
html = html.replace(/<title>[^<]*<\/title>/, `<title>${title} — GitHub &amp; Open Source</title>`);
html = html.replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${bio}" />`);
html = html.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title} — GitHub &amp; Open Source" />`);
html = html.replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${title} — GitHub &amp; Open Source" />`);
await fs.writeFile('index.html', html);

let readme = await fs.readFile('README.md', 'utf8');
if (!dynamicRegex.test(readme)) throw new Error('README.md is missing GITHUB-DYNAMIC markers');
readme = readme.replace(dynamicRegex, readmeProjects);
await fs.writeFile('README.md', readme);

console.log(`Rendered top ${featuredRepos.length} of ${repoCount} repositories into index.html and README.md.`);
