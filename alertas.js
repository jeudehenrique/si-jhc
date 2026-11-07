/* Alertas: tudo que precisa de ação, junto numa tela só ("atenção hoje").
   Só lê o que já existe na SI: não cria nem altera nada sozinha.
   Usa state, view, render, openDemand, openPost, openClient, parcels (financeiro.js), agentInfo (agentes.js),
   postLate/postReady (calendar.js), money e CLIENT_LIMIT. */

const SEV = { late: 'Atrasado', today: 'Hoje', soon: 'Em breve' };
const SEV_ORDER = { late: 0, today: 1, soon: 2 };
let alertList = [];

function computeAlerts() {
  const out = [], today = todayStr(), ym = today.slice(0, 7), soon = addDays(today, 3);
  const add = (sev, icon, text, sub, act) => out.push({ sev, icon, text, sub, act });
  const day = d => diffDays(d) < 0 ? `${Math.abs(diffDays(d))} dia${Math.abs(diffDays(d)) > 1 ? 's' : ''} de atraso` : diffDays(d) === 0 ? 'hoje' : `em ${diffDays(d)} dia${diffDays(d) > 1 ? 's' : ''}`;
  const cname = id => state.clients.find(c => c.id === id)?.name || 'Sem cliente';

  // financeiro: parcelas do mês ainda não recebidas
  parcels(ym).filter(p => !p.paid && p.due <= soon).forEach(p => {
    const sev = p.due < today ? 'late' : p.due === today ? 'today' : 'soon';
    add(sev, '💰', `${p.client.name}: ${p.of === 2 ? `parcela ${p.installment}/2` : 'mensalidade'} de ${money(p.amount)}`,
      `${sev === 'late' ? 'venceu' : 'vence'} ${fmtDate(p.due)} (${day(p.due)}) · confira e marque como recebido`, { go: 'financeiro' });
  });
  // demandas
  state.demands.filter(d => isOpen(d) && d.due <= soon).forEach(d => {
    const sev = d.due < today ? 'late' : d.due === today ? 'today' : 'soon';
    add(sev, '✅', `${d.desc}`, `${cname(d.clientId)} · ${d.room} · prazo ${fmtDate(d.due)} (${day(d.due)})${d.status === 'approval' ? ' · aguardando sua aprovação' : ''}`, { demand: d.id });
  });
  // pautas
  state.posts.filter(p => !postReady(p) && p.deliveryDate <= soon).forEach(p => {
    const sev = p.deliveryDate < today ? 'late' : p.deliveryDate === today ? 'today' : 'soon';
    add(sev, POST_TYPES[p.type].icon, `${p.title}`, `${cname(p.clientId)} · entrega ${fmtDate(p.deliveryDate)} (${day(p.deliveryDate)}) · publica ${fmtDate(p.publishDate)}`, { post: p.id });
  });
  // lembrete semanal: a partir do domingo, as postagens da semana que vem pedem confirmação de que foram salvas
  const semPend = weekPosts().filter(postPendingConfirm);
  if (semPend.length) {
    const [wa, wb] = weekRange();
    add(semPend.some(p => p.publishDate < today) ? 'late' : 'today', '📅', `Postagens da semana: ${semPend.length} para confirmar que salvou`,
      `${fmtDate(wa)} a ${fmtDate(wb)} · toque para conferir e confirmar`, { go: 'calendario' });
  }
  state.posts.filter(p => p.status === 'todo' && /tema a definir/i.test(p.title) && p.publishDate >= today && p.publishDate <= addDays(today, 7)
      && p.deliveryDate > soon).forEach(p =>
    add('soon', '📝', `Falta definir o tema: ${POST_TYPES[p.type].label} de ${fmtDate(p.publishDate)}`, `${cname(p.clientId)} · publica em ${day(p.publishDate)}`, { post: p.id }));
  // agentes
  AGENTS.filter(x => x.key !== 'gerente' && x.key !== 'dashboard').map(agentInfo).forEach(a => {
    if (a.fresh && a.row.status === 'aguardando') add('today', '⏳', `${a.title} espera a sua aprovação`, a.task || 'veja o que ele entregou', { go: 'escritorio' });
    if (a.late) add('late', '🤖', `${a.title} tem ${a.late} pendência${a.late > 1 ? 's' : ''} atrasada${a.late > 1 ? 's' : ''}`, 'abra o agente para retomar', { go: 'escritorio' });
  });
  // clientes: fichas incompletas e sem pauta no mês
  state.clients.forEach(c => {
    if (!(Number(c.fee) > 0)) add('soon', '👤', `${c.name}: falta o valor mensal na ficha`, 'sem isso o financeiro não conta esse cliente', { client: c.id });
    else if (!Object.values(c.services || {}).some(v => v === true)) add('soon', '👤', `${c.name}: nenhum serviço marcado`, 'marque os serviços para montar o mês', { client: c.id });
    if (c.services?.posts && !state.posts.some(p => p.clientId === c.id && monthOf(p.publishDate) === ym))
      add('soon', '📅', `${c.name}: sem pautas em ${monthName(ym)}`, 'o cliente contratou postagens', { client: c.id, plan: true });
  });
  // anúncios: saldo para abastecer (vem do Painel Meta Ads)
  state.ads.filter(x => x.fundsLevel === 'urgente' || x.fundsLevel === 'baixo').forEach(x =>
    add(x.fundsLevel === 'urgente' ? 'late' : 'today', '📣', `${x.company}: saldo ${x.fundsLevel === 'urgente' ? 'urgente' : 'baixo'} (${money(x.funds || 0)}), abastecer`,
      `confira no Gerenciador da Meta antes de abastecer · resumo ${timeAgo(x.syncedAt)}`, { go: 'painel' }));
  if (state.ads.length && state.ads.every(adsStale)) add('soon', '🔌', 'Resumo do Painel Meta Ads desatualizado', 'ligue o painel e rode a sincronização (sync-meta.mjs)', { go: 'painel' });
  const n = state.clients.length;
  if (n >= CLIENT_LIMIT - 3) add(n >= CLIENT_LIMIT ? 'late' : 'soon', '🚀', n >= CLIENT_LIMIT ? `Limite de clientes atingido (${n} de ${CLIENT_LIMIT})` : `Perto do limite: ${n} de ${CLIENT_LIMIT} clientes`, 'hora de pensar na contratação (use o simulador no Financeiro)', { go: 'financeiro' });
  return out.sort((a, b) => alertWeight(a) - alertWeight(b));
}

/* Prioridade: primeiro o que está atrasado, depois hoje, depois os próximos dias; dentro de cada grupo, o que mexe com faturamento vem antes
   (cobrar pagamento, anúncio sem saldo), depois demandas (alta antes de baixa), depois postagens. */
function alertWeight(a) {
  const x = a.act || {};
  let w = SEV_ORDER[a.sev] * 100;
  if (a.icon === '💰') w += 0;
  else if (a.icon === '📣') w += 10;
  else if (x.demand) w += 20 + ({ alta: 0, media: 5, baixa: 10 }[state.demands.find(q => q.id === x.demand)?.priority] ?? 5);
  else if (x.post) w += 40;
  else w += 60;
  return w;
}
// quem executa: o agente da sala (ou você, quando é cobrança/decisão)
function alertOwner(a) {
  const x = a.act || {}, ag = room => AGENTS.find(g => g.rooms.includes(room));
  if (x.demand) { const g = ag(state.demands.find(q => q.id === x.demand)?.room); return g ? `${g.icon} ${g.title}` : '🧠 Você'; }
  if (x.post) return state.posts.find(q => q.id === x.post)?.type === 'reels' ? '🎬 Editor de vídeo' : '🖼️ Design gráfico';
  if (a.icon === '💰') return '🧠 Você: cobrar';
  if (a.icon === '📣') return '📊 Gestor dashboard';
  return '🧠 Você';
}

/* Crescimento: metas de prospecção, fechamentos e caixa do mês, no topo do Foco do dia. */
function growthHTML() {
  const day = state.goals.find(g => g.period === 'day' && /prospec/i.test(g.name));
  const closed = state.goals.find(g => g.period === 'month' && /fechad/i.test(g.name));
  const active = state.goals.find(g => g.source === 'clients');
  const bar = pct => `<div class="progress gold"><span style="width:${Math.min(100, pct)}%"></span></div>`;
  const cell = (title, v, t, sub, extra = '') => `<div class="card fcell"><small>${title}</small>
    <div class="gnum"><b>${v}</b><span> / ${t}</span></div>${bar(goalPct(parseFloat(String(v).replace(/\./g, '')) || 0, parseFloat(String(t).replace(/\./g, '')) || 0))}<div class="gsub">${sub}</div>${extra}</div>`;
  const cells = [];
  if (day) {
    const s = goalState(day), mTarget = day.target * 30, mv = goalValue(day, rangeFor('month'));
    const diff = mv - day.target * Number(todayStr().slice(8));
    cells.push(cell('🎯 Prospecção hoje', fmtNum(s.v), fmtNum(day.target), s.done ? 'meta do dia batida! 🎉' : `faltam ${fmtNum(s.left)} contatos`,
      `<div class="gacts"><button class="btn small" data-meta="add" data-id="${day.id}" data-n="1">+1 contato</button><button class="btn small ghost" data-meta="add" data-id="${day.id}" data-n="5">+5</button></div>`));
    cells.push(cell('📅 Prospecção no mês', fmtNum(mv), fmtNum(mTarget), diff >= 0 ? `no ritmo (+${fmtNum(diff)} à frente)` : `${fmtNum(-diff)} atrás do ritmo`));
  }
  if (closed) { const s = goalState(closed); cells.push(cell('🤝 Clientes fechados no mês', fmtNum(s.v), fmtNum(closed.target), s.done ? 'meta batida! 🎉' : `faltam ${fmtNum(s.left)}`)); }
  if (active) { const s = goalState(active); cells.push(cell('👥 Clientes ativos', fmtNum(s.v), fmtNum(active.target), s.done ? 'meta batida! 🎉' : `faltam ${fmtNum(s.left)} para a meta`)); }
  const ps = parcels(todayStr().slice(0, 7));
  if (ps.length) {
    const tot = ps.reduce((n, p) => n + p.amount, 0), rec = ps.filter(p => p.paid).reduce((n, p) => n + p.amount, 0), atr = ps.filter(p => !p.paid && p.due < todayStr()).reduce((n, p) => n + p.amount, 0);
    cells.push(`<div class="card fcell"><small>💰 Caixa do mês</small><div class="gnum"><b>${money(rec)}</b><span> / ${money(tot)}</span></div>${bar(goalPct(rec, tot))}
      <div class="gsub">${atr > 0 ? `<b style="color:var(--alert)">${money(atr)} em atraso</b> · cobrar` : 'nenhum pagamento em atraso'}</div></div>`);
  }
  if (!cells.length) return `<div class="card"><b>🚀 Crescimento</b><p class="muted">Crie as metas de prospecção para acompanhar aqui (10 contatos por dia = 300 por mês).</p><button class="btn primary" data-meta="seed">Criar metas sugeridas</button></div>`;
  return `<div class="section-title">Crescimento <b>do negócio</b></div><div class="fgrid">${cells.join('')}</div>`;
}

function alertItemHTML(a, i) {
  return `<div class="alert ${a.sev}" data-alert="${i}" tabindex="0" role="button">
    <span class="aico">${a.icon}</span>
    <div class="abody"><b>${esc(a.text)}</b><small>${esc(a.sub)}</small><em class="aowner">${alertOwner(a)}</em></div>
    <span class="asev ${a.sev}">${SEV[a.sev]}</span></div>`;
}
function renderAlertas() {
  alertList = computeAlerts();
  const groups = ['late', 'today', 'soon'].map(s => [s, alertList.map((a, i) => [a, i]).filter(([a]) => a.sev === s)]).filter(([, l]) => l.length);
  const titles = { late: 'Resolver agora (atrasado)', today: 'Para hoje', soon: 'Nos próximos dias' };
  const first = alertList[0];
  return `<div class="page-head"><h1 class="title">FOCO <b>DO DIA</b></h1></div>
    ${growthHTML()}
    ${alertList.length ? `<p class="muted">${first ? `<b style="color:var(--text)">Comece por aqui:</b> ${esc(first.text)} (${alertOwner(first)}). ` : ''}${alertList.length} ${alertList.length > 1 ? 'itens pedem' : 'item pede'} ação, do mais importante para o menos. Toque num item para resolver.</p>`
      : '<div class="card empty">Nada pedindo ação agora. 🎉<br>Tudo em dia.</div>'}
    ${groups.map(([s, l]) => `<div class="section-title ${s}">${titles[s]} <b>(${l.length})</b></div>
      <div class="list">${l.map(([a, i]) => alertItemHTML(a, i)).join('')}</div>`).join('')}
    <p class="note">O Gerente geral só organiza e prioriza: quem faz o trabalho é o agente de cada área. Esta tela não envia nada a ninguém.</p>`;
}
function renderAlertasMini() {
  const list = computeAlerts().filter(a => a.sev !== 'soon');
  if (!list.length) return '';
  return `<div class="section-title">Atenção <b>hoje</b> <a href="#" data-view="alertas" style="font:400 13px Inter;text-transform:none;color:var(--accent);margin-left:8px">Ver todos (${list.length})</a></div>
    <div class="list">${list.slice(0, 3).map(a => `<div class="alert ${a.sev}" data-alert-go="alertas" tabindex="0" role="button"><span class="aico">${a.icon}</span>
      <div class="abody"><b>${esc(a.text)}</b><small>${esc(a.sub)}</small></div><span class="asev ${a.sev}">${SEV[a.sev]}</span></div>`).join('')}</div>`;
}
function updateBell() {
  const n = computeAlerts().filter(a => a.sev !== 'soon').length, el = $$('#bellCount');
  if (!el) return;
  el.textContent = n > 9 ? '9+' : n; el.classList.toggle('hidden', !n);
  $$('#bellBtn').setAttribute('aria-label', n ? `${n} alertas urgentes` : 'Alertas');
}

function runAlert(a) {
  const x = a.act;
  if (x.demand) return openDemand(x.demand);
  if (x.post) { cal.clientId = state.posts.find(p => p.id === x.post)?.clientId || cal.clientId; cal.month = monthOf(state.posts.find(p => p.id === x.post)?.publishDate || todayStr()); view = 'calendario'; render(); return openPost(x.post); }
  if (x.client) { view = 'clientes'; render(); return x.plan ? openPlan(x.client) : openClient(x.client); }
  if (x.go) { if (x.go === 'financeiro') finMonth = todayStr().slice(0, 7); view = x.go; render(); }
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-alert-go]')) { view = 'alertas'; return render(); }
  const el = e.target.closest('[data-alert]');
  if (el && alertList[+el.dataset.alert]) runAlert(alertList[+el.dataset.alert]);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('alert')) { e.preventDefault(); e.target.click(); }
});
