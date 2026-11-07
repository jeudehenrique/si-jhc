/* SI · Superinteligência JHC — Caixa de demandas, Painel e Escritório (calendar.js, metas.js, clientes.js e office.js completam) */

const ROOMS = ['Design','Edição de vídeo','Programação/Sites','SEO','Gestão de anúncios','Criação de conteúdo','Prospecção','Atendimento'];
const STATUSES = [['todo','A fazer'],['doing','Em andamento'],['approval','Aguardando aprovação'],['done','Concluída']];
const PRIORITIES = {alta:'Alta', media:'Média', baixa:'Baixa'};
const OWNERS = ['Eu','Gestão (a contratar)','Criação com IA (a contratar)'];
const CLIENT_LIMIT = 15;

/* Os dados (salvamento e login) ficam em data.js: modo teste ou Supabase. */
const emptyState = () => ({ clients: [], demands: [], posts: [], goals: [], goalLogs: [], agents: [], costs: [], receipts: [], settings: [], ads: [] });
let state = emptyState();
let view = 'alertas';
let filters = { status: '', room: '', client: '', owner: '', q: '' };
let editingId = null;

const $ = s => document.querySelector(s);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const persist = () => DB.save(state, () => toast('⚠️ Não consegui salvar no servidor. Verifique a internet; vou tentar de novo na próxima alteração.', 6000));

/* ---------- Datas ---------- */
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayStr = () => iso(new Date());
const diffDays = s => Math.round((new Date(s + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 864e5);
const fmtDate = s => s.split('-').reverse().slice(0,2).join('/');
function dueLabel(d) {
  const n = diffDays(d.due);
  if (d.status === 'done') return ['Concluída', ''];
  if (n < 0) return [`${Math.abs(n)} dia${Math.abs(n)>1?'s':''} atrasada`, 'late'];
  if (n === 0) return ['Hoje', 'today'];
  if (n === 1) return ['Amanhã', ''];
  return [`em ${n} dias`, ''];
}
function weekStart() { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return d; }

/* ---------- Auxiliares ---------- */
// confirmação própria do app (a janelinha do navegador é bloqueada em alguns lugares)
function askConfirm(message, okLabel = 'Excluir', danger = true) {
  return new Promise(resolve => {
    const dlg = $('#confirmDialog'), ok = $('#confirmOk');
    let answer = false;
    $('#confirmText').textContent = message;
    ok.textContent = okLabel; ok.className = 'btn ' + (danger ? 'danger' : 'primary');
    const done = () => { dlg.removeEventListener('close', done); resolve(answer); };
    ok.onclick = () => { answer = true; dlg.close(); };
    $('#confirmCancel').onclick = () => dlg.close();
    dlg.addEventListener('close', done);
    dlg.showModal();
  });
}
const clientName = id => (state.clients.find(c => c.id === id) || {}).name || 'Sem cliente';
const statusName = k => (STATUSES.find(s => s[0] === k) || [])[1];
const isOpen = d => d.status !== 'done';
function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), ms);
}

/* ---------- Telas ---------- */
function itemHTML(d) {
  const [lbl, cls] = dueLabel(d);
  return `<div class="item ${cls} ${d.status==='done'?'done':''}" data-id="${d.id}">
    <div class="bar ${d.priority}"></div>
    <div>
      <div class="desc">${esc(d.desc)}</div>
      <div class="meta">
        <span>${esc(clientName(d.clientId))}</span><span>${esc(d.room)}</span>
        <span>${esc(d.owner)}</span><span class="tag">${statusName(d.status)}</span>
        ${d.delegable ? '<span class="tag deleg">Pode delegar</span>' : ''}
        ${cls==='late' ? '<span class="tag late">Atrasada</span>' : ''}
      </div>
    </div>
    <div class="due">${lbl}<small>${fmtDate(d.due)}</small></div>
  </div>`;
}
const byDue = (a, b) => a.due.localeCompare(b.due) || ['alta','media','baixa'].indexOf(a.priority) - ['alta','media','baixa'].indexOf(b.priority);

function renderPainel() {
  const open = state.demands.filter(isOpen).sort(byDue);
  const today = open.filter(d => diffDays(d.due) === 0).length;
  const late = open.filter(d => diffDays(d.due) < 0).length;
  const ws = weekStart();
  const doneWeek = state.demands.filter(d => d.status === 'done' && d.doneAt && new Date(d.doneAt) >= ws).length;
  const deleg = open.filter(d => d.delegable).length;
  const n = state.clients.length;

  let warn = '';
  if (n >= CLIENT_LIMIT) warn = `<div class="alertbox danger">⚠️ <div><b>Limite atingido:</b> você tem ${n} clientes (limite sem ajuda: ${CLIENT_LIMIT}). Hora de contratar.</div></div>`;
  else if (n >= CLIENT_LIMIT - 3) warn = `<div class="alertbox">⚠️ <div><b>Perto do limite:</b> ${n} de ${CLIENT_LIMIT} clientes. Faltam ${CLIENT_LIMIT-n} vagas antes de precisar de ajuda.</div></div>`;

  const ym = todayStr().slice(0, 7);
  const clients = state.clients.map(c => {
    const all = state.demands.filter(d => d.clientId === c.id);
    const done = all.filter(d => d.status === 'done').length;
    const o = all.filter(isOpen);
    const l = o.filter(d => diffDays(d.due) < 0).length;
    const ps = state.posts.filter(p => p.clientId === c.id && monthOf(p.publishDate) === ym);
    const pr = ps.filter(postReady).length;
    const pl = ps.filter(postLate).length;
    const pct = ps.length ? Math.round(pr / ps.length * 100) : all.length ? Math.round(done / all.length * 100) : 0;
    const postLine = ps.length
      ? `📅 ${pr} de ${ps.length} postagens de ${monthName(ym)} prontas${pl ? ` · <span style="color:var(--alert)">${pl} entrega${pl>1?'s':''} atrasada${pl>1?'s':''}</span>` : ''}`
      : `📅 Sem pauta em ${monthName(ym)} · <a href="#" data-cal-go="${c.id}" style="color:var(--accent)">criar</a>`;
    return `<div class="card client"><div class="name">${esc(c.name)}</div>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <div class="sub">${postLine}</div>
      <div class="sub">${done} de ${all.length} demandas prontas · ${o.length} abertas${l ? ` · <span style="color:var(--alert)">${l} atrasada${l>1?'s':''}</span>` : ''}</div></div>`;
  }).join('');

  return `
  <div class="page-head">
    <h1 class="title">PAINEL <b>PRINCIPAL</b></h1>
    <button class="btn primary" data-act="new">+ Nova demanda</button>
  </div>
  ${warn}
  ${renderAlertasMini()}
  <div class="stats">
    <div class="card stat"><div class="num">${open.length}</div><div class="lbl">Pendências abertas</div></div>
    <div class="card stat today"><div class="num">${today}</div><div class="lbl">Vencendo hoje</div></div>
    <div class="card stat late"><div class="num">${late}</div><div class="lbl">Atrasadas</div></div>
    <div class="card stat ok"><div class="num">${doneWeek}</div><div class="lbl">Concluídas na semana</div></div>
  </div>
  ${deleg ? `<p class="muted">💡 ${deleg} pendência${deleg>1?'s':''} aberta${deleg>1?'s':''} pode${deleg>1?'m':''} ser delegada${deleg>1?'s':''}.</p>` : ''}
  <div class="section-title">O que fazer <b>primeiro</b></div>
  <div class="list">${open.length ? open.slice(0, 12).map(itemHTML).join('') : `<div class="card empty">Nenhuma pendência. 🎉<br>Registre a primeira demanda no botão acima.${state.demands.length===0 && !DB.online ? '<br><button class="btn" data-act="sample">Carregar exemplos para testar</button>' : ''}</div>`}</div>
  ${open.length > 12 ? `<p class="muted">Mostrando as 12 mais urgentes de ${open.length}. <a href="#" data-view="demandas" style="color:var(--accent)">Ver todas</a></p>` : ''}
  ${renderMetasMini()}
  ${adsPanelHTML()}
  ${renderFinMini()}
  <div class="section-title">Visão por <b>cliente</b> <span class="muted" style="font-weight:400;text-transform:none;font-family:Inter"> · ${n} de ${CLIENT_LIMIT} clientes</span></div>
  ${n ? `<div class="clients">${clients}</div>` : '<div class="card empty">Nenhum cliente cadastrado ainda.</div>'}
  <p style="margin-top:12px"><button class="btn small" data-act="clients">Ver clientes e serviços</button></p>
  <p class="note">A barra de cada cliente mostra as postagens prontas do mês (Calendário). Sem pauta no mês, mostra as demandas.</p>`;
}

function renderDemandas() {
  const f = filters;
  const list = state.demands.filter(d =>
    (!f.status || d.status === f.status) && (!f.room || d.room === f.room) &&
    (!f.client || d.clientId === f.client) && (!f.owner || d.owner === f.owner) &&
    (!f.agent || (AGENTS.find(a => a.key === f.agent)?.rooms || []).includes(d.room)) &&
    (!f.q || (d.desc + clientName(d.clientId)).toLowerCase().includes(f.q.toLowerCase()))
  ).sort((a, b) => (isOpen(b) - isOpen(a)) || byDue(a, b));
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${esc(v)}" ${cur===v?'selected':''}>${esc(l)}</option>`).join('');
  return `
  <div class="page-head">
    <h1 class="title">CAIXA DE <b>DEMANDAS</b></h1>
    <button class="btn primary" data-act="new">+ Nova demanda</button>
  </div>
  <div class="filters">
    <input id="fltQ" placeholder="Buscar…" value="${esc(f.q)}">
    <select id="fltStatus"><option value="">Todos os status</option>${opt(STATUSES, f.status)}</select>
    <select id="fltRoom"><option value="">Todas as salas</option>${opt(ROOMS.map(r=>[r,r]), f.room)}</select>
    <select id="fltClient"><option value="">Todos os clientes</option>${opt(state.clients.map(c=>[c.id,c.name]), f.client)}</select>
    ${f.agent ? `<button class="btn small" data-clear-agent>${esc(AGENTS.find(a => a.key === f.agent)?.name || '')} ✕</button>` : ''}
    <select id="fltOwner"><option value="">Todos os responsáveis</option>${opt(OWNERS.map(o=>[o,o]), f.owner)}</select>
  </div>
  ${demandGroupsHTML(list)}`;
}
/* Demandas organizadas por agente: cada um com o seu bloco e contador (salas sem agente ficam em "Outras salas") */
function demandGroupsHTML(list) {
  if (!list.length) return '<div class="card empty">Nenhuma demanda encontrada.</div>';
  const groups = AGENTS.filter(a => a.rooms.length).map(a => ({ title: `${a.icon} Agente ${a.num} · ${a.title}`, items: list.filter(d => a.rooms.includes(d.room)) }));
  const known = AGENTS.flatMap(a => a.rooms);
  groups.push({ title: '🗂️ Outras salas', items: list.filter(d => !known.includes(d.room)) });
  return groups.filter(g => g.items.length).map(g => {
    const open = g.items.filter(isOpen).length;
    return `<div class="dgroup"><div class="dgroup-head"><b>${g.title}</b><span>${open} em aberto${g.items.length > open ? ' · ' + (g.items.length - open) + ' concluída(s)' : ''}</span></div>
      <div class="list">${g.items.map(itemHTML).join('')}</div></div>`;
  }).join('');
}

/* ---------- Escritório virtual (ilustração isométrica) ---------- */
const LABEL_SALA = { free: 'LIVRE', late: 'ATRASADA', work: 'TRABALHANDO', appr: 'AGUARDANDO', stop: 'PARADA' };
const LABEL_PESSOA = { ...LABEL_SALA, late: 'ATRASADO', stop: 'PARADO' };
const SHORT = { 'Design': 'DESIGN', 'Edição de vídeo': 'VÍDEO', 'Programação/Sites': 'SITES', 'SEO': 'SEO', 'Gestão de anúncios': 'ANÚNCIOS', 'Criação de conteúdo': 'CONTEÚDO', 'Prospecção': 'PROSPECÇÃO', 'Atendimento': 'ATENDIMENTO' };
const VAGAS = [['Gestão (a contratar)', 'VAGA · GESTÃO'], ['Criação com IA (a contratar)', 'VAGA · CRIAÇÃO IA']];
function statusOf(o) {
  const late = o.filter(d => diffDays(d.due) < 0).length;
  const doing = o.filter(d => d.status === 'doing').length;
  const appr = o.filter(d => d.status === 'approval').length;
  const k = !o.length ? 'free' : late ? 'late' : doing ? 'work' : appr ? 'appr' : 'stop';
  return { k, late, doing, appr, total: o.length };
}
function render() {
  $('#main').innerHTML = view === 'painel' ? renderPainel() : view === 'escritorio' ? renderEscritorio() : view === 'calendario' ? renderCalendario() : view === 'metas' ? renderMetas() : view === 'clientes' ? renderClientes() : view === 'financeiro' ? renderFinanceiro() : view === 'alertas' ? renderAlertas() : view.startsWith('sala:') ? renderSala(view.slice(5)) : renderDemandas();
  document.querySelectorAll('#nav button[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $('#bellBtn').classList.toggle('active', view === 'alertas');
  updateBell();
}

/* ---------- Ações ---------- */
function fillSelect(el, pairs, val) {
  el.innerHTML = pairs.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
  if (val !== undefined) el.value = val;
}
function openDemand(id) {
  editingId = id || null;
  const d = state.demands.find(x => x.id === id);
  fillSelect($('#fClient'), state.clients.length ? state.clients.map(c => [c.id, c.name]) : [['', 'Cadastre um cliente primeiro']]);
  fillSelect($('#fRoom'), ROOMS.map(r => [r, r]));
  fillSelect($('#fStatus'), STATUSES);
  fillSelect($('#fOwner'), OWNERS.map(o => [o, o]));
  $('#demandTitle').innerHTML = d ? 'EDITAR <b>DEMANDA</b>' : 'NOVA <b>DEMANDA</b>';
  $('#fDesc').value = d?.desc || '';
  if (d) $('#fClient').value = d.clientId;
  $('#fRoom').value = d?.room || ROOMS[0];
  $('#fPriority').value = d?.priority || 'media';
  $('#fDue').value = d?.due || todayStr();
  $('#fStatus').value = d?.status || 'todo';
  $('#fOwner').value = d?.owner || 'Eu';
  $('#fDelegable').checked = !!d?.delegable;
  $('#fDelete').classList.toggle('hidden', !d);
  $('#demandDialog').showModal();
}

$('#demandForm').addEventListener('submit', e => {
  e.preventDefault();
  if (!state.clients.length) { toast('Cadastre um cliente antes.'); return; }
  const data = {
    desc: $('#fDesc').value.trim(), clientId: $('#fClient').value, room: $('#fRoom').value,
    priority: $('#fPriority').value, due: $('#fDue').value, status: $('#fStatus').value,
    owner: $('#fOwner').value, delegable: $('#fDelegable').checked
  };
  if (!data.desc || !data.due) return;
  if (editingId) {
    const d = state.demands.find(x => x.id === editingId);
    const wasDone = d.status === 'done';
    Object.assign(d, data);
    if (data.status === 'done' && !wasDone) d.doneAt = new Date().toISOString();
    if (data.status !== 'done') d.doneAt = null;
  } else {
    state.demands.push({ id: uid(), createdAt: new Date().toISOString(), doneAt: data.status === 'done' ? new Date().toISOString() : null, ...data });
  }
  persist(); $('#demandDialog').close(); render(); toast('Demanda salva.');
});
$('#fCancel').onclick = () => $('#demandDialog').close();
$('#fDelete').onclick = async () => {
  if (await askConfirm('Excluir esta demanda de vez?')) {
    state.demands = state.demands.filter(d => d.id !== editingId);
    state.posts.forEach(p => { if (p.demandId === editingId) p.demandId = null; });
    persist(); $('#demandDialog').close(); render(); toast('Demanda excluída.');
  }
};

function loadSample() {
  const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const c = sampleClients();
  state.clients.push(...c);
  const mk = (desc, ci, room, priority, due, status, delegable) => ({ id: uid(), desc, clientId: c[ci].id, room, priority, due: day(due), status, owner: 'Eu', delegable, createdAt: new Date().toISOString(), doneAt: status==='done' ? new Date().toISOString() : null });
  state.demands.push(
    mk('Ajustar público da campanha de implantes', 0, 'Gestão de anúncios', 'alta', -2, 'doing', false),
    mk('Carrossel sobre clareamento dental', 0, 'Criação de conteúdo', 'media', 0, 'todo', true),
    mk('Editar reels da promoção de terça', 1, 'Edição de vídeo', 'alta', 0, 'doing', true),
    mk('Trocar banner do site', 1, 'Design', 'baixa', 4, 'todo', true),
    mk('Relatório mensal de anúncios', 2, 'Atendimento', 'media', 2, 'approval', false),
    mk('Landing page de matrícula', 2, 'Programação/Sites', 'alta', 6, 'todo', true),
    mk('Subir criativos novos', 2, 'Gestão de anúncios', 'media', -1, 'done', false)
  );
  state.posts.push(...samplePosts(c));
  if (!state.agents.length) state.agents.push(...sampleAgents());
  if (!state.costs.length) { const sf = sampleFinance(c); state.costs.push(...sf.costs); state.receipts.push(...sf.receipts); state.settings.push(...sf.settings); }
  if (!state.goals.length) { const sg = sampleGoals(); state.goals.push(...sg.goals); state.goalLogs.push(...sg.logs); }
  persist(); render(); toast('Exemplos carregados. Apague quando quiser.');
}

/* ---------- Eventos globais ---------- */
document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'new') { if (state.clients.length) return openDemand(); view = 'clientes'; render(); openClient(null); return toast('Cadastre o primeiro cliente.'); }
  if (act === 'clients') { view = 'clientes'; return render(); }
  if (act === 'sample') return loadSample();
  if (e.target.closest('[data-clear-agent]')) { filters.agent = ''; return render(); }
  const nav = e.target.closest('[data-view]');
  if (nav) { e.preventDefault(); view = nav.dataset.view; render(); return; }
  const rm = e.target.closest('[data-room]');
  if (rm) { filters = { status: '', room: rm.dataset.room, client: '', owner: '', q: '' }; view = 'demandas'; render(); return; }
  const ow = e.target.closest('[data-owner]');
  if (ow) { filters = { status: '', room: '', client: '', owner: ow.dataset.owner, q: '' }; view = 'demandas'; render(); return; }
  const item = e.target.closest('.item');
  if (item) openDemand(item.dataset.id);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('spot')) {
    e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
});
$('#main').addEventListener('input', e => {
  const m = { fltQ:'q', fltStatus:'status', fltRoom:'room', fltClient:'client', fltOwner:'owner' }[e.target.id];
  if (!m) return;
  filters[m] = e.target.value; const pos = e.target.selectionStart; render();
  const el = $('#' + e.target.id); if (el && m === 'q') { el.focus(); el.setSelectionRange(pos, pos); }
});

/* tema (preferência só deste aparelho) */
const THEME_KEY = 'jh-tema';
const getTheme = () => { try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch { return 'dark'; } };
function applyTheme() { document.documentElement.dataset.theme = getTheme(); }
$('#themeBtn').onclick = () => {
  try { localStorage.setItem(THEME_KEY, getTheme() === 'dark' ? 'light' : 'dark'); } catch {}
  applyTheme();
};

/* login e carregamento */
function showLogin(msg = '') {
  $('#app').classList.add('hidden');
  $('#login').classList.remove('hidden');
  $('#loginError').textContent = msg;
}
// ao entrar online pela primeira vez, oferece enviar o que estava salvo só neste navegador
async function offerImport() {
  const local = DB.localData();
  if (!DB.online || state.clients.length || !local || !local.clients.length) return;
  const ok = await askConfirm(`Encontrei ${local.clients.length} cliente(s) e ${local.demands.length} demanda(s), ${(local.posts || []).length} pauta(s) e ${(local.goals || []).length} meta(s) salvos só neste navegador (modo teste).\n\nQuer enviar tudo para a sua conta online?`, 'Enviar', false);
  if (!ok) return;
  state = { ...emptyState(), ...local };
  await persist();
  toast('Dados do navegador enviados para a sua conta.');
}
async function showApp() {
  if (DB.configError) return showLogin('A configuração online está preenchida, mas não consegui carregar o Supabase. Verifique a internet e recarregue a página.');
  const user = await DB.user();
  if (!user) return showLogin();
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#main').innerHTML = '<div class="card empty">Carregando seus dados…</div>';
  try {
    state = { ...emptyState(), ...await DB.load() };
  } catch (err) {
    console.error(err);
    $('#main').innerHTML = `<div class="card empty">Não consegui carregar seus dados do servidor.<br>Verifique a internet e se o arquivo <b>schema.sql</b> foi rodado no Supabase.<br><button class="btn" onclick="location.reload()">Tentar de novo</button></div>`;
    return;
  }
  if (typeof SI_RECOVERY !== 'undefined' && SI_RECOVERY && DB.online) $('#pwDialog').showModal();   // veio do e-mail de recuperar senha
  $('#modeBadge').textContent = DB.online ? '☁ Online' : 'Modo teste';
  $('#modeBadge').className = 'mode ' + (DB.online ? 'on' : 'test');
  render();
  await offerImport();
  render();
}
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.submitter || $('#loginForm button');
  btn.disabled = true; btn.textContent = 'Entrando…'; $('#loginError').textContent = '';
  try {
    await DB.login($('#loginEmail').value.trim(), $('#loginPass').value);
    $('#loginPass').value = '';
    await showApp();
  } catch (err) {
    $('#loginError').textContent = err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
});
$('#logoutBtn').onclick = async () => { await DB.logout(); state = emptyState(); showLogin(); };
DB.onSignedOut(() => { state = emptyState(); showLogin('Sua sessão terminou. Entre de novo.'); });
$('#loginNote').textContent = DB.online
  ? 'Acesso restrito: use o e-mail e a senha cadastrados para você no Supabase.'
  : 'Modo de teste: qualquer e-mail e senha entram, e os dados ficam só neste navegador. Para salvar online, preencha o config.js.';

/* atualização automática: a cada minuto e ao voltar para a janela, sem atrapalhar quem está digitando */
async function refreshData() {
  if (!DB.online || document.hidden || $('#app').classList.contains('hidden')) return;
  if (document.querySelector('dialog[open]') || document.activeElement?.matches('input, textarea, select')) return;
  await DB.idle();
  try {
    const fresh = { ...emptyState(), ...await DB.load() };
    if (JSON.stringify(fresh) !== JSON.stringify(state)) { state = fresh; render(); }
  } catch (err) { console.warn('Atualização automática falhou:', err); }
}
setInterval(refreshData, 60000);
window.addEventListener('focus', refreshData);

applyTheme();
showApp();

/* nova senha (link de recuperação do e-mail) */
$('#pwDialog').addEventListener('cancel', e => e.preventDefault());   // só fecha depois de salvar
$('#pwForm').addEventListener('submit', async e => {
  e.preventDefault();
  const a = $('#pwNew').value, b = $('#pwNew2').value, msg = $('#pwMsg');
  if (a !== b) { msg.textContent = 'As duas senhas não são iguais.'; return; }
  try { await DB.setPassword(a); $('#pwDialog').close(); toast('Senha nova salva. ✓'); }
  catch (err) { msg.textContent = err.message; }
});
