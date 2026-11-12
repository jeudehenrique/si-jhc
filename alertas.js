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
    add(sev, '📋', `${d.desc}`, `${cname(d.clientId)} · ${d.room} · prazo ${fmtDate(d.due)} (${day(d.due)})${d.status === 'approval' ? ' · aguardando sua aprovação' : ''}`, { demand: d.id });
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
  // follow-ups: o que não foi marcado como feito sobe como pendência
  const diaAnt = planoDiaUtilAnterior(today);
  if (!planoFeitos(diaAnt).includes(4)) add('late', '💬', `Follow-ups de ${fmtDate(diaAnt)} não foram feitos`, 'volte a conversar com quem já recebeu contato e marque como feito no Foco do dia', { go: 'alertas' });
  if (![0, 6].includes(weekdayOf(today)) && new Date().getHours() >= 17 && !planoFeitos(today).includes(4)) add('today', '💬', 'Follow-ups de hoje ainda não foram feitos', 'faça os follow-ups ou marque como feito no Foco do dia', { go: 'alertas' });
  const fuCrm = Number(state.crm?.find(x => x.id === 'prospeccao')?.dados?.followups_atrasados) || 0;
  if (fuCrm > 0) add('late', '💬', `${fmtNum(fuCrm)} follow-up${fuCrm > 1 ? 's' : ''} atrasado${fuCrm > 1 ? 's' : ''} no CRM`, 'abra o CRM e retome essas conversas', { go: 'alertas' });
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
  else if (a.icon === '💬') w += 12;
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
  if (a.icon === '💬') return '💬 CRM e WhatsApp';
  return '🧠 Você';
}

/* Plano de hoje: três passos na ordem do negócio. 1) vender, 2) cuidar dos clientes e dos anúncios, 3) postar o conteúdo do dia.
   Usa só o que já existe na SI (CRM, resumo dos anúncios e pautas). */
function planoHTML() {
  const today = todayStr();
  const crm = state.crm.find(x => x.id === 'prospeccao')?.dados || null;
  const meta = crm && Number.isFinite(Number(crm.meta_diaria)) ? Number(crm.meta_diaria) : null;
  const feitos = crm ? Number(crm.hoje) || 0 : 0;
  // 1) 8h: campanhas. Abre o painel, vê o que está funcionando, anota as otimizações e avisa quem precisa abastecer.
  const ruins = state.ads.filter(x => x.fundsLevel === 'urgente' || x.fundsLevel === 'baixo');
  const contas = state.ads.length;
  const p1 = { n: 1, titulo: '8h · Campanhas (cerca de 30 minutos)', done: contas > 0 && ruins.length === 0,
    linhas: [
      contas ? `Abra o painel e veja o resultado de ontem e dos últimos 3 dias de ${fmtNum(contas)} conta${contas > 1 ? 's' : ''}.` : 'Sem resumo dos anúncios ainda. Ligue o Painel Meta Ads.',
      'Anote o que está funcionando bem e o que precisa de otimização (subir ou parar imagem, subir, aumentar ou diminuir campanha).',
      ...ruins.map(x => `Avise o responsável: ${x.company} está com saldo ${x.fundsLevel === 'urgente' ? 'urgente' : 'baixo'}. Precisa abastecer.`)
    ] };
  // 2) prospecção no bloco certo, depois da revisão das campanhas
  const p2 = { n: 2, titulo: 'Prospecção: trazer cliente novo', done: meta !== null && feitos >= meta,
    linhas: [meta === null ? 'Ainda sem dados do CRM. Registre seus contatos ou conecte o CRM.' : `${fmtNum(feitos)} de ${fmtNum(meta)} contatos hoje${feitos >= meta ? ' · meta batida' : ` · faltam ${fmtNum(meta - feitos)}`}`] };
  // 3) conteúdo: se houver demanda, faz; se não, segue para os follow-ups. Na segunda, planeja a semana.
  const devidas = state.posts.filter(x => !postReady(x) && x.publishDate <= today);
  const cname = id => state.clients.find(c => c.id === id)?.name || 'Sem cliente';
  const dono = x => x.type === 'reels' ? 'Editor de vídeo' : 'Design gráfico';
  const p3 = { n: 3, titulo: 'Conteúdo', done: devidas.length === 0,
    linhas: [
      ...(devidas.length ? devidas.sort((a, b) => a.publishDate.localeCompare(b.publishDate)).map(x => `${x.publishDate < today ? 'ATRASADA · ' : ''}${x.title} · ${cname(x.clientId)} · ${dono(x)}`) : ['Sem demanda de conteúdo para hoje. Siga para os follow-ups.']),
      weekdayOf(today) === 1 ? 'Segunda-feira: planeje e produza os conteúdos da semana (ou das 2 semanas) e agende a postagem.' : 'Conteúdo da semana já planejado na segunda.'
    ] };
  // 4) follow-ups: voltar a falar com quem já foi contatado
  const p4 = { n: 4, titulo: 'Follow-ups', done: false,
    linhas: ['Volte a conversar com quem já recebeu contato. Veja os follow-ups de hoje no CRM.'] };
  const marcados = planoFeitos(), nFeitos = [1, 2, 3, 4].filter(n => marcados.includes(n)).length;
  const diaAnt = planoDiaUtilAnterior(today), marcAnt = planoFeitos(diaAnt);
  const ontem = [[1, 'Campanhas'], [4, 'Follow-ups']].filter(([n]) => !marcAnt.includes(n));
  const blocoOntem = ontem.length ? `<div class="card plano-ontem"><b>Pendente de ${WEEKDAYS[weekdayOf(diaAnt)]}, ${fmtDate(diaAnt)}</b><small>O que ficou sem marcar como feito no dia útil anterior. Faça e marque, ou marque se já foi feito.</small>
      ${ontem.map(([n, t]) => `<div class="plano-ontem-linha"><span>${t}</span><button class="btn small primary" data-plano="${n}" data-dia="${diaAnt}">Marcar como feito</button></div>`).join('')}</div>` : '';
  return `<div class="section-title" style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span>Plano <b>de hoje</b> · ${WEEKDAYS[weekdayOf(today)]}, ${fmtDate(today)}</span><small class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">${nFeitos} de 4 concluídos${nFeitos === 4 ? ' · dia fechado ✓' : ''}</small></div>
    ${blocoOntem}
    <div class="plano">${[p1, p2, p3, p4].map(p => {
      const ok = marcados.includes(p.n);
      return `<div class="card passo ${ok || p.done ? 'ok' : ''}">
        <div class="pnum">${p.n}</div>
        <div class="pbody"><b>${esc(p.titulo)}</b>${p.linhas.map(t => `<small>${esc(t)}</small>`).join('')}</div>
        <div class="pact"><span class="asev ${ok || p.done ? 'ok' : 'today'}">${ok ? 'Feito' : p.done ? 'Em dia' : 'Fazer'}</span>
          <button class="btn small ${ok ? '' : 'primary'}" data-plano="${p.n}">${ok ? 'Desmarcar' : 'Marcar como feito'}</button></div></div>`;
    }).join('')}</div>`;
}

/* marcar os passos do dia como feitos: fica salvo na SI (tabela settings), então aparece em qualquer aparelho */
function planoFeitos(dia = todayStr()) {
  const row = (state.settings || []).find(s => s.key === 'plano-' + dia);
  return row && Array.isArray(row.data.feitos) ? row.data.feitos : [];
}
// último dia útil (segunda a sexta) antes de hoje: é o dia cujo plano precisa ter sido concluído
function planoDiaUtilAnterior(hoje = todayStr()) { let d = addDays(hoje, -1); while ([0, 6].includes(weekdayOf(d))) d = addDays(d, -1); return d; }
function marcarPlano(n, dia = todayStr()) {
  const key = 'plano-' + dia;
  let row = state.settings.find(s => s.key === key);
  if (!row) { row = { id: uid(), key, data: { feitos: [] } }; state.settings.push(row); }
  const f = new Set(row.data.feitos || []);
  if (f.has(n)) f.delete(n); else f.add(n);
  row.data = { feitos: [...f].sort() };
  persist(); render();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-plano]');
  if (b) marcarPlano(Number(b.dataset.plano), b.dataset.dia || todayStr());
});

/* Conexões: mostra se cada parte do negócio está mandando notícias para o SI (verde = novidade nas últimas 24 h). */
function linksHTML(crmAt) {
  const h = d => d ? (Date.now() - new Date(d).getTime()) / 36e5 : Infinity;
  const ads = state.ads.map(a => a.syncedAt).filter(Boolean).sort().pop();
  const ag = key => state.agents.find(a => a.key === key)?.updatedAt;
  const items = [['📊 Painel Meta Ads', ads], ['💬 CRM', crmAt], ['🖼️ Design', ag('conteudo')], ['🎬 Vídeo', ag('video')]];
  return `<div class="flinks">${items.map(([n, d]) => `<span class="flink ${h(d) <= 24 ? 'ok' : ''}" title="${d ? 'última novidade ' + timeAgo(d) : 'ainda sem novidades'}"><i></i>${n}</span>`).join('')}</div>`;
}

/* Resumo do CRM (Agente 5) no mesmo desenho do dashboard dele: Empresas, Metas de prospecção e totais.
   Os números vêm da tabela metricas_crm (chave prospeccao), atualizada a cada minuto como o resto do painel.
   Campos opcionais que o CRM pode acrescentar depois (aparecem sozinhos quando existirem):
   total_empresas, em_negociacao, clientes_fechados, followups_hoje, followups_atrasados. */
function prospeccaoHTML() {
  const row = state.crm.find(x => x.id === 'prospeccao');
  const head = right => `<div class="section-title" style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span>Resumo <b>do CRM</b></span>${right || ''}</div>`;
  if (!row) return `${head()}<div class="card"><p class="muted" style="margin:0">Sem dados do CRM ainda.</p></div>`;
  const d = row.dados || {}, num = v => Number.isFinite(Number(v)) ? Number(v) : 0, has = v => v !== null && v !== undefined && Number.isFinite(Number(v));
  const at = d.atualizado_em || row.updatedAt, min = at ? (Date.now() - new Date(at)) / 60000 : Infinity;
  const off = !(min <= 30), hh = at ? new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const pct1 = v => num(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const tile = (lbl, v, sub) => `<div class="crm-tile"><small>${lbl}</small><b>${fmtNum(v)}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
  const goal = (lbl, v, m, cap) => { const p = m > 0 ? Math.round(v / m * 100) : 0; return `<div class="crm-goal"><div class="crm-goal-top"><span>${lbl}</span><b>${fmtNum(v)}<small> / ${fmtNum(m)}</small><em>${p}%</em></b></div>
    <div class="progress"><span style="width:${Math.min(100, p)}%"></span></div><small>${cap}: ${fmtNum(m)} contatos</small></div>`; };
  const falta = has(d.faltam_fechamentos) ? num(d.faltam_fechamentos) : null;
  const para = falta === null ? 'Ainda sem dados para calcular.' : falta <= 0 ? 'Meta de fechamentos do mês batida.'
    : `Faltam ${fmtNum(falta)} fechamento${falta > 1 ? 's' : ''}; ${has(d.contatos_necessarios) ? `na taxa atual, ${fmtNum(num(d.contatos_necessarios))} contatos` : 'ainda sem dados para calcular'}.`;
  const t1 = [has(d.total_empresas) && tile('Total', num(d.total_empresas)), tile('Cadastradas hoje', num(d.hoje)), tile('Em andamento', num(d.em_andamento)), tile('Fechadas', num(d.fechamentos_mes)), tile('Desqualificadas', num(d.desqualificadas))].filter(Boolean).join('');
  const t3 = [has(d.total_empresas) && tile('Empresas', num(d.total_empresas), 'cadastradas no CRM'), has(d.em_negociacao) && tile('Em negociação', num(d.em_negociacao), 'oportunidades abertas'),
    has(d.clientes_fechados) && tile('Clientes fechados', num(d.clientes_fechados), `${pct1(d.taxa_fechamento)}% de conversão`),
    has(d.followups_hoje) && tile('Follow-ups hoje', num(d.followups_hoje), has(d.followups_atrasados) && num(d.followups_atrasados) > 0 ? `${num(d.followups_atrasados)} atrasado${num(d.followups_atrasados) > 1 ? 's' : ''}` : 'nenhum atrasado')].filter(Boolean).join('');
  return `${head(off ? '' : `<small class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">Atualizado ${timeAgo(at)}</small>`)}
  <div class="crm-dash ${off ? 'off' : ''}">
    ${off ? `<div class="pros-off">CRM offline — últimos números de ${hh}</div>` : ''}
    <div class="crm-label">Empresas</div><div class="crm-tiles">${t1}</div>
    <div class="card crm-metas"><div class="crm-label">Metas de prospecção</div>
      <div class="crm-goals">${goal('Hoje', num(d.hoje), num(d.meta_diaria), 'Meta diária')}${goal('Esta semana', num(d.semana), num(d.meta_semanal), 'Meta semanal')}${goal('Este mês', num(d.mes), num(d.meta_mensal), 'Meta mensal')}</div>
      <div class="crm-stats">
        <div><small>Fechamentos no mês</small><b>${fmtNum(num(d.fechamentos_mes))}${has(d.meta_fechamentos) ? `<small> / ${fmtNum(num(d.meta_fechamentos))}</small>` : ''}</b></div>
        <div><small>Taxa de fechamento</small><b>${pct1(d.taxa_fechamento)}%</b><span>fechamentos ÷ contatos do mês</span></div>
        <div><small>Para bater a meta</small><p>${para}</p></div>
      </div></div>
    ${t3 ? `<div class="crm-tiles crm-tiles-big">${t3}</div>` : ''}
  </div>`;
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
  const crm = state.crm.find(x => x.id === 'prospeccao')?.dados;
  const crmAt = state.crm.find(x => x.id === 'prospeccao')?.updatedAt;
  if (crm && Number.isFinite(Number(crm.meta_diaria))) {   // números do CRM aparecem no bloco "Prospecção"; sem registro manual
  } else if (day) {
    const s = goalState(day), mTarget = day.target * 30, mv = goalValue(day, rangeFor('month'));
    const diff = mv - day.target * Number(todayStr().slice(8));
    cells.push(cell('🎯 Prospecção hoje', fmtNum(s.v), fmtNum(day.target), s.done ? 'meta do dia batida! 🎉' : `faltam ${fmtNum(s.left)} contatos`,
      `<div class="gacts"><button class="btn small" data-meta="add" data-id="${day.id}" data-n="1">+1 contato</button><button class="btn small ghost" data-meta="add" data-id="${day.id}" data-n="5">+5</button></div>`));
    cells.push(cell('📅 Prospecção no mês', fmtNum(mv), fmtNum(mTarget), diff >= 0 ? `no ritmo (+${fmtNum(diff)} à frente)` : `${fmtNum(-diff)} atrás do ritmo`));
  }
  if (closed && !(crm && Number.isFinite(Number(crm.meta_fechamentos)))) { const s = goalState(closed); cells.push(cell('🤝 Clientes fechados no mês', fmtNum(s.v), fmtNum(closed.target), s.done ? 'meta batida! 🎉' : `faltam ${fmtNum(s.left)}`)); }
  if (active) { const s = goalState(active); cells.push(cell('👥 Clientes ativos', fmtNum(s.v), fmtNum(active.target), s.done ? 'meta batida! 🎉' : `faltam ${fmtNum(s.left)} para a meta`)); }
  const ps = parcels(todayStr().slice(0, 7));
  if (ps.length) {
    const tot = ps.reduce((n, p) => n + p.amount, 0), rec = ps.filter(p => p.paid).reduce((n, p) => n + p.amount, 0), atr = ps.filter(p => !p.paid && p.due < todayStr()).reduce((n, p) => n + p.amount, 0);
    cells.push(`<div class="card fcell"><small>💰 Caixa do mês</small><div class="gnum"><b>${money(rec)}</b><span> / ${money(tot)}</span></div>${bar(goalPct(rec, tot))}
      <div class="gsub">${atr > 0 ? `<b style="color:var(--alert)">${money(atr)} em atraso</b> · cobrar` : 'nenhum pagamento em atraso'}</div></div>`);
  }
  if (!cells.length) return `<div class="card"><b>🚀 Crescimento</b><p class="muted">Crie as metas de prospecção para acompanhar aqui (10 contatos por dia = 300 por mês).</p><button class="btn primary" data-meta="seed">Criar metas sugeridas</button></div>`;
  return `<div class="section-title">Crescimento <b>do negócio</b></div>${prospeccaoHTML()}<div class="fgrid">${cells.join('')}</div>${linksHTML(crmAt)}`;
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
    ${planoHTML()}
    ${growthHTML()}
    ${alertList.length ? `<p class="callout">${first ? `<b style="color:var(--text)">Comece por aqui:</b> ${esc(first.text)} (${alertOwner(first)}). ` : ''}${alertList.length} ${alertList.length > 1 ? 'itens pedem' : 'item pede'} ação, do mais importante para o menos. Toque num item para resolver.</p>`
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
