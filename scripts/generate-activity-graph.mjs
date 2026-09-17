import fs from 'node:fs/promises';

const token = process.env.GITHUB_TOKEN;
const login = process.env.GITHUB_REPOSITORY_OWNER || 'SamoTech';
if (!token) throw new Error('GITHUB_TOKEN is required');

const to = new Date();
const from = new Date(to);
from.setUTCDate(from.getUTCDate() - 365);
const iso = d => d.toISOString();

const query = `
query($login:String!, $from:DateTime!, $to:DateTime!) {
  user(login:$login) {
    contributionsCollection(from:$from, to:$to) {
      totalContributions
      contributionCalendar {
        weeks {
          contributionDays { date contributionCount }
        }
      }
    }
  }
}`;

const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'SamoTech-Profile-Activity-Graph'
  },
  body: JSON.stringify({ variables: { login, from: iso(from), to: iso(to) }, query })
});

if (!response.ok) throw new Error(`GitHub GraphQL HTTP ${response.status}: ${await response.text()}`);
const payload = await response.json();
if (payload.errors?.length) throw new Error(payload.errors.map(e => e.message).join('; '));

const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;
if (!calendar) throw new Error(`GitHub user ${login} was not found or contributions are unavailable`);

const weeks = calendar.weeks;
const days = weeks.flatMap(w => w.contributionDays);
const max = Math.max(1, ...days.map(d => d.contributionCount));
const level = count => count === 0 ? 0 : count >= Math.ceil(max * .75) ? 4 : count >= Math.ceil(max * .5) ? 3 : count >= Math.ceil(max * .25) ? 2 : 1;

const width = 920;
const height = 185;
const left = 46;
const top = 38;
const cell = 12;
const gap = 3;
const step = cell + gap;
const graphWidth = Math.min(53 * step, width - left - 20);
const colors = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const rects = [];
weeks.forEach((week, x) => {
  week.contributionDays.forEach(day => {
    const date = new Date(`${day.date}T00:00:00Z`);
    const dow = date.getUTCDay();
    const rx = left + x * step;
    const ry = top + dow * step;
    rects.push(`<rect x="${rx}" y="${ry}" width="${cell}" height="${cell}" rx="2" fill="${colors[level(day.contributionCount)]}"><title>${esc(day.contributionCount)} contributions on ${esc(day.date)}</title></rect>`);
  });
});

const monthLabels = [];
let previousMonth = '';
weeks.forEach((week, x) => {
  const first = week.contributionDays[0];
  if (!first) return;
  const date = new Date(`${first.date}T00:00:00Z`);
  const label = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
  if (key !== previousMonth) {
    monthLabels.push(`<text x="${left + x * step}" y="24" fill="#8b949e" font-size="11">${label}</text>`);
    previousMonth = key;
  }
});

const total = calendar.totalContributions;
const generated = new Date().toISOString().slice(0, 10);
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">GitHub activity for ${esc(login)}</title>
  <desc id="desc">${esc(total)} contributions in the last year. Generated ${generated}.</desc>
  <rect width="100%" height="100%" rx="10" fill="#0d1117"/>
  <text x="${left}" y="15" fill="#f0f6fc" font-size="13" font-family="system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-weight="600">${esc(total)} contributions in the last year</text>
  ${monthLabels.join('')}
  <text x="10" y="${top + 10}" fill="#8b949e" font-size="10">Mon</text>
  <text x="10" y="${top + 38}" fill="#8b949e" font-size="10">Wed</text>
  <text x="10" y="${top + 66}" fill="#8b949e" font-size="10">Fri</text>
  ${rects.join('')}
  <g transform="translate(${width - 145},${height - 24})">
    <text x="0" y="10" fill="#8b949e" font-size="10">Less</text>
    ${colors.map((c, i) => `<rect x="${31 + i * 15}" y="1" width="11" height="11" rx="2" fill="${c}"/>`).join('')}
    <text x="108" y="10" fill="#8b949e" font-size="10">More</text>
  </g>
</svg>
`;

await fs.mkdir('docs/assets', { recursive: true });
await fs.writeFile('docs/assets/activity-graph.svg', svg);
console.log(`Generated activity graph for ${login}: ${total} contributions.`);
