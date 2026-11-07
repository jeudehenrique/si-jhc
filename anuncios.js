/* Painel Meta Ads dentro da SI: resumo por conta (vindo de si-ponte/sync-meta.mjs) e atalho para abrir o painel.
   A SI só LÊ a tabela ads_accounts: quem escreve é o script de sincronização. */
const ADS_PANEL_URL = 'http://localhost:3000';
const ADS_LABEL = { urgente: 'Saldo urgente', baixo: 'Saldo baixo', ok: 'Saldo ok', cartao: 'Cartão', desconhecido: 'Saldo ?' };
const normName = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
// liga conta de anúncios ao cliente da SI pelo nome (ex.: "Camuzi Refrigeração" ~ "Camuzi")
function adsOf(client) {
  const c = normName(client.name); if (!c) return null;
  return state.ads.find(a => { const n = normName(a.company); return n === c || (c.length >= 4 && (n.includes(c) || c.includes(n))); }) || null;
}
const adsClients = a => state.clients.filter(c => adsOf(c) === a);
const adsStale = a => !a.syncedAt || Date.now() - new Date(a.syncedAt) > 2 * 3600e3;
const isLocalPanel = () => ['localhost', '127.0.0.1'].includes(location.hostname);

function adsLine(c) {
  const a = adsOf(c); if (!a) return '';
  return `<div class="sub">📣 Anúncios 7 dias: ${money(a.spend7d)} · ${a.results7d ?? 0} resultados${a.costPerResult ? ` (${money(a.costPerResult)} cada)` : ''} · <span class="lvl ${a.fundsLevel}">${ADS_LABEL[a.fundsLevel]}${a.funds !== null && a.fundsType === 'prepaid' ? ' ' + money(a.funds) : ''}</span></div>`;
}
function adsPanelHTML() {
  const open = `<a class="btn small" href="${ADS_PANEL_URL}" target="_blank" rel="noopener">📊 Abrir Painel Meta Ads</a>`;
  const hint = isLocalPanel() ? '' : '<p class="muted small-note">O painel é privado: abre só no computador onde ele roda (neste PC, ligado).</p>';
  if (!state.ads.length) return `<div class="section-title">Painel <b>Meta Ads</b></div><div class="card">${open}${hint}<p class="muted small-note" style="margin-top:8px">Ainda sem resumo na SI. Rode a sincronização (si-ponte/sync-meta.mjs) com o painel ligado.</p></div>`;
  const urg = state.ads.filter(a => a.fundsLevel === 'urgente' || a.fundsLevel === 'baixo');
  const spend7 = state.ads.reduce((s, a) => s + (a.spend7d || 0), 0), res = state.ads.reduce((s, a) => s + (a.results7d || 0), 0);
  const last = state.ads.map(a => a.syncedAt).sort().pop();
  return `<div class="section-title">Painel <b>Meta Ads</b></div>
    <div class="card adsbox">
      <div class="adsrow"><div><b>${money(spend7)}</b><small>investido em 7 dias</small></div><div><b>${res}</b><small>resultados em 7 dias</small></div>
        <div><b class="${urg.length ? 'neg' : 'pos'}">${urg.length}</b><small>contas p/ abastecer</small></div>${open}</div>
      ${urg.length ? `<div class="svcs">${urg.map(a => `<span class="svc lvl ${a.fundsLevel}">${esc(a.company)} · ${a.fundsLevel === 'urgente' ? 'urgente' : 'baixo'}${a.funds !== null ? ' ' + money(a.funds) : ''}</span>`).join('')}</div>` : ''}
      <p class="muted small-note">Atualizado ${timeAgo(last)}${adsStale({ syncedAt: last }) ? ' ⚠ resumo antigo: ligue o painel e sincronize' : ''}. ${isLocalPanel() ? '' : 'O painel abre só neste PC.'}</p>
    </div>`;
}
