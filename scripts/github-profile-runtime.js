(() => {
  'use strict';
  const DATA_URL = './data/github.json';
  const owner = 'SamoTech';

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const slug = value => String(value || '').toLowerCase();

  function categories(repo) {
    const text = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
    const cats = [];
    if (/\b(ai|agent|llm|gemini|gpt|mcp|memory|langgraph|model|ml)\b/.test(text)) cats.push('ai');
    if (/\b(mikrotik|router|network|vpn|infra|devops|gpo|intune|windows|linux|dns|bgp|asn)\b/.test(text)) cats.push('network');
    if (/\b(enigma2|iptv|stb|embedded|firmware)\b/.test(text)) cats.push('embedded');
    if (/\b(cli|tool|utility|registry|automation|github-actions|script)\b/.test(text)) cats.push('tools');
    if (/\b(web|app|website|store|portal|dashboard|next\.js|react|vercel)\b/.test(text) || ['TypeScript','JavaScript','HTML','CSS'].includes(repo.language)) cats.push('web');
    return [...new Set(cats.length ? cats : ['tools'])];
  }

  const icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

  function card(repo) {
    const cats = categories(repo);
    const tags = (repo.topics || []).slice(0, 4);
    if (repo.language && !tags.includes(repo.language)) tags.unshift(repo.language);
    const meta = [repo.language, repo.stars ? `${repo.stars} stars` : null, repo.forks ? `${repo.forks} forks` : null].filter(Boolean).join(' · ');
    return `<a href="${esc(repo.url)}" target="_blank" rel="noopener noreferrer" class="card" data-categories="${cats.join(' ')}">
      <div class="card-icon">${icon}</div>
      <div class="card-body">
        <div class="card-meta"><span class="card-lang">${esc(meta || 'Repository')}</span><span class="card-stars">${icon}${repo.stars || 0}</span></div>
        <h3 class="card-title">${esc(repo.name)}</h3>
        <p class="card-desc">${esc(repo.description || 'Open-source project by SamoTech.')}</p>
        <div class="card-tags">${tags.map(t => `<span class="card-tag">${esc(t)}</span>`).join('')}</div>
        <span class="card-link">View project →</span>
      </div>
    </a>`;
  }

  async function init() {
    try {
      const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Data request failed: ${res.status}`);
      const data = await res.json();
      const repos = (data.repositories || []).filter(r => r.name !== owner);
      const profile = data.profile || {};

      const statVals = document.querySelectorAll('.hero-stats .stat-val');
      if (statVals[0]) statVals[0].textContent = profile.publicRepos ?? repos.length;
      if (statVals[1] && profile.createdAt) {
        const years = Math.max(1, new Date().getUTCFullYear() - new Date(profile.createdAt).getUTCFullYear());
        statVals[1].textContent = `${years}yr`;
      }

      const desc = document.querySelector('.sec-desc');
      if (desc) desc.textContent = `All ${repos.length} public repositories, synced directly from GitHub. Filter by category.`;

      const grid = document.getElementById('proj-grid');
      if (grid) grid.innerHTML = repos.map(card).join('');

      const bar = document.querySelector('.filter-bar');
      if (bar) {
        const counts = Object.fromEntries(['all','ai','web','network','tools','embedded'].map(c => [c, c === 'all' ? repos.length : repos.filter(r => categories(r).includes(c)).length]));
        bar.querySelectorAll('.filter-btn').forEach(btn => {
          const f = btn.dataset.filter;
          if (counts[f] !== undefined) btn.textContent = `${f === 'all' ? 'All' : btn.textContent.replace(/\s*\(\d+\)$/, '')} (${counts[f]})`;
          btn.onclick = () => {
            bar.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
            grid?.querySelectorAll('.card').forEach(c => c.classList.toggle('hidden', f !== 'all' && !(c.dataset.categories || '').split(' ').includes(f)));
          };
        });
      }

      document.querySelectorAll('[data-github-repos]').forEach(el => { el.textContent = repos.length; });
      document.querySelectorAll('[data-github-followers]').forEach(el => { el.textContent = profile.followers ?? 0; });
      document.querySelectorAll('[data-github-name]').forEach(el => { el.textContent = profile.name || owner; });

      const title = `${profile.name || 'Ossama Hashim'} — IT Manager · AI Engineering · Infrastructure`;
      document.title = title;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.content = `Ossama Hashim — IT Manager, AI engineering, infrastructure and automation. ${repos.length} public GitHub repositories, dynamically synced from GitHub.`;
    } catch (error) {
      console.warn('[SamoTech] GitHub dynamic data unavailable:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
