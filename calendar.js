/* Módulo 2 — Calendário editorial por cliente.
   Usa state, persist, render, toast, esc, uid, iso, todayStr, diffDays, fmtDate e openDemand do app.js. */

const POST_TYPES = {
  carrossel: { label: 'Carrossel', icon: '🖼️', room: 'Criação de conteúdo', roomName: 'Criação de carrossel' },
  reels: { label: 'Reels', icon: '🎬', room: 'Edição de vídeo', roomName: 'Edição de reels' },
  post: { label: 'Post único', icon: '📸', room: 'Design', roomName: 'Criação de post' }
};
const POST_STATUS = [['todo', 'Pauta'], ['doing', 'Em criação'], ['approval', 'Aguardando aprovação'], ['ready', 'Pronto'], ['published', 'Publicado']];
const NETWORKS = ['Instagram', 'Facebook', 'LinkedIn'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

let cal = { clientId: '', month: '' };
let editingPostId = null;
let deliveryTouched = false;

/* ---------- datas e ajudantes ---------- */
const monthOf = s => s.slice(0, 7);
const monthLabel = ym => { const [y, m] = ym.split('-'); return `${MONTHS[+m - 1]} de ${y}`; };
const monthName = ym => MONTHS[+ym.slice(5, 7) - 1];
const shiftMonth = (ym, n) => { const [y, m] = ym.split('-').map(Number); return iso(new Date(y, m - 1 + n, 1)).slice(0, 7); };
const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return iso(new Date(y, m - 1, d + n)); };
const weekdayOf = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };
const daysOfMonth = ym => { const [y, m] = ym.split('-').map(Number); const out = []; for (let d = new Date(y, m - 1, 1); d.getMonth() === m - 1; d.setDate(d.getDate() + 1)) out.push(iso(d)); return out; };
const postReady = p => p.status === 'ready' || p.status === 'published';
const postLate = p => !postReady(p) && diffDays(p.deliveryDate) < 0;
const postStatusName = k => (POST_STATUS.find(s => s[0] === k) || [])[1];
const safeUrl = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
const $$ = s => document.querySelector(s);

function ensureCal() {
  if (!cal.month) cal.month = todayStr().slice(0, 7);
  if (!state.clients.find(c => c.id === cal.clientId)) cal.clientId = state.clients[0]?.id || '';
}

/* ---------- tela ---------- */
function postItemHTML(p) {
  const t = POST_TYPES[p.type], late = postLate(p), link = safeUrl(p.link);
  return `<div class="pitem ${postReady(p) ? 'ready' : ''} ${late ? 'late' : ''}" data-post="${p.id}" tabindex="0" role="button">
    <div class="pdate"><b>${fmtDate(p.publishDate)}</b><small>${WEEKDAYS[weekdayOf(p.publishDate)]}</small></div>
    <div class="pbody">
      <div class="ptitle">${t.icon} ${esc(p.title)}</div>
      <div class="meta">
        <span>${t.label}</span>${p.network ? `<span>${esc(p.network)}</span>` : ''}
        <span class="tag st-${p.status}">${postStatusName(p.status)}</span>
        <span class="${late ? 'late-txt' : ''}">Entrega ${fmtDate(p.deliveryDate)}${late ? ' · atrasada' : ''}</span>
        ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" class="plink">🔗 Material</a>` : ''}
      </div>
    </div>
  </div>`;
}

/* Semana de postagens: de segunda a domingo. A partir do DOMINGO já mostra a semana que começa no dia seguinte. */
function weekRange(ref = todayStr()) {
  const dow = weekdayOf(ref);   // 0 = domingo
  const start = dow === 0 ? addDays(ref, 1) : addDays(ref, -(dow - 1));
  return [start, addDays(start, 6)];
}
const weekPosts = () => { const [a, b] = weekRange(); return state.posts.filter(p => p.publishDate >= a && p.publishDate <= b && p.status !== 'published').sort((x, y) => x.publishDate.localeCompare(y.publishDate) || x.type.localeCompare(y.type)); };
const postPendingConfirm = p => ['todo', 'doing', 'approval'].includes(p.status);
function weekBoxHTML() {
  const ps = weekPosts(); if (!ps.length) return '';
  const [a, b] = weekRange(), pend = ps.filter(postPendingConfirm), cname = id => state.clients.find(x => x.id === id)?.name || 'Sem cliente';
  const rows = ps.map(p => {
    const t = POST_TYPES[p.type], late = p.publishDate < todayStr() && postPendingConfirm(p);
    return `<div class="wkrow ${postReady(p) ? 'ok' : late ? 'late' : ''}">
      <div class="wkdate"><b>${fmtDate(p.publishDate)}</b><small>${WEEKDAYS[weekdayOf(p.publishDate)]}</small></div>
      <div class="wkmain"><b>${esc(cname(p.clientId))}</b><span>${t.icon} ${esc(p.title)} · ${t.label}${p.network ? ' · ' + esc(p.network) : ''}</span></div>
      ${postReady(p) ? '<span class="tag st-ready">✓ Salva</span>' : `<button class="btn small" data-wk="one" data-id="${p.id}">✅ Confirmar que salvei</button>`}
      <button class="btn small ghost" data-post-open="${p.id}">Abrir</button></div>`;
  }).join('');
  return `<div class="card weekbox">
    <div class="section-title" style="margin:0 0 8px">📌 Postagens da <b>semana</b> <small class="muted" style="font:400 13px Inter;text-transform:none">${fmtDate(a)} a ${fmtDate(b)} · ${pend.length ? pend.length + ' para confirmar' : 'tudo confirmado ✓'}</small></div>
    ${rows}
    ${pend.length > 1 ? `<div class="wkall"><button class="btn small primary" data-wk="all">✅ Confirmar todas (${pend.length})</button></div>` : ''}
  </div>`;
}
document.addEventListener('click', async e => {
  const open = e.target.closest('[data-post-open]'); if (open) return openPost(open.dataset.postOpen);
  const b = e.target.closest('[data-wk]'); if (!b) return;
  if (b.dataset.wk === 'one') {
    const p = state.posts.find(x => x.id === b.dataset.id); if (!p) return;
    p.status = 'ready'; persist(); render(); return toast('Confirmado: postagem salva. ✓');
  }
  const pend = weekPosts().filter(postPendingConfirm); if (!pend.length) return;
  if (!(await askConfirm(`Confirmar que as ${pend.length} postagens da semana estão salvas?`, 'Sim, salvei', false))) return;
  pend.forEach(p => { p.status = 'ready'; }); persist(); render(); toast(`${pend.length} postagens confirmadas. ✓`);
});

function renderCalendario() {
  ensureCal();
  const header = `<div class="page-head">
    <h1 class="title">CALENDÁRIO <b>EDITORIAL</b></h1>
    <button class="btn primary" data-cal="bulk">+ Criar mês de pautas</button>
  </div>`;
  if (!state.clients.length) {
    return header + `<div class="card empty">Cadastre um cliente para montar o calendário dele.<br><button class="btn" data-act="clients">Cadastrar cliente</button></div>`;
  }
  const banner = DB.online && !DB.ready('posts')
    ? `<div class="alertbox danger">⚠️ <div><b>Falta um passo no banco online.</b> Para salvar as pautas, rode o arquivo <b>migracao-2-calendario.sql</b> no Supabase (SQL Editor). Enquanto isso, as pautas não são salvas.</div></div>` : '';
  const posts = state.posts.filter(p => p.clientId === cal.clientId && monthOf(p.publishDate) === cal.month)
    .sort((a, b) => a.publishDate.localeCompare(b.publishDate) || a.type.localeCompare(b.type));
  const ready = posts.filter(postReady).length;
  const approval = posts.filter(p => p.status === 'approval').length;
  const late = posts.filter(postLate).length;
  const pct = posts.length ? Math.round(ready / posts.length * 100) : 0;
  const clientOpts = state.clients.map(c => `<option value="${c.id}" ${c.id === cal.clientId ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  return header + banner + weekBoxHTML() + `
  <div class="cal-controls">
    <select id="calClient" aria-label="Cliente">${clientOpts}</select>
    <div class="month-nav">
      <button class="btn ghost small" data-cal="prev" aria-label="Mês anterior">‹</button>
      <b>${monthLabel(cal.month)}</b>
      <button class="btn ghost small" data-cal="next" aria-label="Próximo mês">›</button>
      <button class="btn ghost small" data-cal="today">Hoje</button>
    </div>
    <button class="btn small" data-cal="new">+ Nova pauta</button>
  </div>
  <div class="stats">
    <div class="card stat"><div class="num">${posts.length}</div><div class="lbl">Pautas no mês</div></div>
    <div class="card stat ok"><div class="num">${ready}</div><div class="lbl">Prontas ou publicadas</div></div>
    <div class="card stat today"><div class="num">${approval}</div><div class="lbl">Aguardando aprovação</div></div>
    <div class="card stat late"><div class="num">${late}</div><div class="lbl">Entregas atrasadas</div></div>
  </div>
  ${posts.length ? `<div class="progress big"><span style="width:${pct}%"></span></div><p class="muted" style="margin:6px 0 16px">${ready} de ${posts.length} prontas (${pct}%)</p>` : ''}
  <div class="list">${posts.length ? posts.map(postItemHTML).join('')
    : `<div class="card empty">Nenhuma pauta de ${monthLabel(cal.month)} para este cliente.<br><button class="btn" data-cal="bulk">Criar o mês inteiro</button></div>`}</div>
  <p class="note">Clique numa pauta para ver a sala responsável, editar ou criar a demanda dela. Nada é criado ou publicado sem o seu clique.</p>`;
}

/* ---------- pauta (criar, editar, sala) ---------- */
function fillPostSelects() {
  $$('#pClient').innerHTML = state.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $$('#pType').innerHTML = Object.entries(POST_TYPES).map(([k, t]) => `<option value="${k}">${t.icon} ${t.label}</option>`).join('');
  $$('#pNetwork').innerHTML = '<option value="">—</option>' + NETWORKS.map(n => `<option>${n}</option>`).join('');
  $$('#pStatus').innerHTML = POST_STATUS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
}
function refreshRoomBox() {
  const p = state.posts.find(x => x.id === editingPostId);
  const t = POST_TYPES[$$('#pType').value];
  const dem = p?.demandId && state.demands.find(d => d.id === p.demandId);
  $$('#pRoom').innerHTML = `<div class="room-name">${t.icon} Sala: <b>${t.roomName}</b> <span class="muted">(${t.room})</span></div>
    <div class="room-actions">
      <button type="button" class="btn small" id="pOpenRoom">Abrir sala</button>
      ${dem ? '<button type="button" class="btn small" id="pSeeDemand">Ver demanda</button>'
        : p ? '<button type="button" class="btn small primary" id="pMakeDemand">Criar demanda nesta sala</button>'
          : '<span class="muted small-note">Salve a pauta para poder criar a demanda.</span>'}
    </div>`;
}
function openPost(id, preset = {}) {
  ensureCal();
  editingPostId = id || null;
  const p = state.posts.find(x => x.id === id);
  fillPostSelects();
  $$('#postTitle').innerHTML = p ? 'EDITAR <b>PAUTA</b>' : 'NOVA <b>PAUTA</b>';
  $$('#pClient').value = p?.clientId || cal.clientId;
  $$('#pTitleInput').value = p?.title || '';
  $$('#pType').value = p?.type || preset.type || 'carrossel';
  $$('#pNetwork').value = p?.network || 'Instagram';
  const pub = p?.publishDate || preset.date || (monthOf(todayStr()) === cal.month ? todayStr() : cal.month + '-01');
  $$('#pPublish').value = pub;
  $$('#pDelivery').value = p?.deliveryDate || addDays(pub, -2);
  $$('#pStatus').value = p?.status || 'todo';
  $$('#pLink').value = p?.link || '';
  $$('#pDelete').classList.toggle('hidden', !p);
  deliveryTouched = !!p;
  refreshRoomBox();
  $$('#postDialog').showModal();
}
$$('#postForm').addEventListener('submit', e => {
  e.preventDefault();
  const link = $$('#pLink').value.trim();
  if (link && !safeUrl(link)) { toast('O link precisa começar com http:// ou https://'); return; }
  const data = {
    clientId: $$('#pClient').value, title: $$('#pTitleInput').value.trim(), type: $$('#pType').value,
    network: $$('#pNetwork').value, publishDate: $$('#pPublish').value, deliveryDate: $$('#pDelivery').value,
    status: $$('#pStatus').value, link
  };
  if (!data.title || !data.publishDate || !data.deliveryDate) return;
  if (editingPostId) Object.assign(state.posts.find(x => x.id === editingPostId), data);
  else state.posts.push({ id: uid(), createdAt: new Date().toISOString(), demandId: null, ...data });
  cal.clientId = data.clientId; cal.month = monthOf(data.publishDate);
  persist(); $$('#postDialog').close(); render(); toast('Pauta salva.');
});
$$('#pCancel').onclick = () => $$('#postDialog').close();
$$('#pDelete').onclick = async () => {
  if (!(await askConfirm('Excluir esta pauta de vez?'))) return;
  state.posts = state.posts.filter(x => x.id !== editingPostId);
  persist(); $$('#postDialog').close(); render(); toast('Pauta excluída.');
};
$$('#pType').addEventListener('change', refreshRoomBox);
$$('#pPublish').addEventListener('change', e => { if (!deliveryTouched && e.target.value) $$('#pDelivery').value = addDays(e.target.value, -2); });
$$('#pDelivery').addEventListener('input', () => { deliveryTouched = true; });
$$('#pRoom').addEventListener('click', e => {
  const p = state.posts.find(x => x.id === editingPostId);
  const id = e.target.id;
  if (id === 'pOpenRoom') {
    const t = POST_TYPES[$$('#pType').value];
    $$('#postDialog').close();
    filters = { status: '', room: t.room, client: $$('#pClient').value, owner: '', q: '' };
    view = 'demandas'; render();
  } else if (id === 'pSeeDemand' && p?.demandId) {
    $$('#postDialog').close(); openDemand(p.demandId);
  } else if (id === 'pMakeDemand' && p) {
    const t = POST_TYPES[p.type];
    const dem = {
      id: uid(), desc: `${t.roomName}: ${p.title}`, clientId: p.clientId, room: t.room, priority: 'media',
      due: p.deliveryDate, status: 'todo', owner: 'Eu', delegable: false, createdAt: new Date().toISOString(), doneAt: null
    };
    state.demands.push(dem); p.demandId = dem.id;
    persist(); refreshRoomBox(); render(); toast('Demanda criada na sala. Prazo = data de entrega.');
  }
});

/* ---------- criar o mês inteiro ---------- */
function bulkPlan() {
  const ym = $$('#bMonth').value;
  if (!ym) return { items: [], extra: 0, ym };
  const days = new Set([...document.querySelectorAll('#bDays input:checked')].map(i => +i.value));
  const lead = Math.max(0, +$$('#bLead').value || 0);
  const defType = $$('#bType').value, net = $$('#bNetwork').value;
  const slots = daysOfMonth(ym).filter(d => days.has(weekdayOf(d)));
  const lines = $$('#bLines').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^(carrossel|reels|post(?: único)?)\s*[:\-–]\s*(.+)$/i);
    if (!m) return { type: defType, title: l };
    const k = m[1].toLowerCase(); return { type: k.startsWith('post') ? 'post' : k, title: m[2].trim() };
  });
  const items = slots.map((date, i) => {
    const l = lines[i] || { type: defType, title: `${POST_TYPES[defType].label} · tema a definir` };
    return { type: l.type, title: l.title, publishDate: date, deliveryDate: addDays(date, -lead), network: net };
  });
  return { items, extra: Math.max(0, lines.length - slots.length), ym };
}
function renderBulkPreview() {
  const { items, extra, ym } = bulkPlan();
  const cid = $$('#bClient').value;
  const existing = state.posts.filter(p => p.clientId === cid && monthOf(p.publishDate) === ym).length;
  $$('#bPreview').innerHTML = items.length
    ? `<div class="muted small-note">Prévia: ${items.length} pauta${items.length > 1 ? 's' : ''} em ${monthLabel(ym)}. Nada é criado até você confirmar.${existing ? ` Este cliente já tem ${existing} pauta(s) nesse mês; elas não serão alteradas.` : ''}</div>
       <ul class="bprev">${items.map(i => `<li><b>${fmtDate(i.publishDate)} ${WEEKDAYS[weekdayOf(i.publishDate)]}</b> ${POST_TYPES[i.type].icon} ${esc(i.title)} <small>entrega ${fmtDate(i.deliveryDate)}</small></li>`).join('')}</ul>
       ${extra ? `<div class="alertbox" style="margin-top:8px">⚠️ <div>${extra} linha(s) da lista não couberam nos dias marcados. Marque mais dias da semana ou apague linhas.</div></div>` : ''}`
    : '<div class="muted small-note">Marque ao menos um dia da semana e escolha o mês para ver a prévia.</div>';
  $$('#bCreate').textContent = items.length ? `Criar ${items.length} pauta${items.length > 1 ? 's' : ''}` : 'Criar pautas';
  $$('#bCreate').disabled = !items.length;
}
function openBulk() {
  ensureCal();
  $$('#bClient').innerHTML = state.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $$('#bClient').value = cal.clientId;
  $$('#bMonth').value = cal.month;
  $$('#bType').innerHTML = Object.entries(POST_TYPES).map(([k, t]) => `<option value="${k}">${t.icon} ${t.label}</option>`).join('');
  $$('#bNetwork').innerHTML = NETWORKS.map(n => `<option>${n}</option>`).join('');
  $$('#bDays').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => `<label class="chip"><input type="checkbox" value="${d}" ${[1, 3, 5].includes(d) ? 'checked' : ''}><span>${WEEKDAYS[d]}</span></label>`).join('');
  $$('#bLead').value = 2; $$('#bLines').value = '';
  renderBulkPreview();
  $$('#bulkDialog').showModal();
}
$$('#bulkForm').addEventListener('input', renderBulkPreview);
$$('#bCancel').onclick = () => $$('#bulkDialog').close();
$$('#bulkForm').addEventListener('submit', e => {
  e.preventDefault();
  const { items, ym } = bulkPlan(); if (!items.length) return;
  const clientId = $$('#bClient').value;
  items.forEach(i => state.posts.push({ id: uid(), createdAt: new Date().toISOString(), clientId, status: 'todo', link: '', demandId: null, ...i }));
  cal.clientId = clientId; cal.month = ym; view = 'calendario';
  persist(); $$('#bulkDialog').close(); render(); toast(`${items.length} pautas criadas.`);
});

/* ---------- cliques da tela ---------- */
document.addEventListener('click', e => {
  const act = e.target.closest('[data-cal]')?.dataset.cal;
  if (act) {
    ensureCal();
    if (act === 'prev') cal.month = shiftMonth(cal.month, -1);
    else if (act === 'next') cal.month = shiftMonth(cal.month, 1);
    else if (act === 'today') cal.month = todayStr().slice(0, 7);
    else if (act === 'new') { if (!state.clients.length) return toast('Cadastre um cliente antes.'); return openPost(null); }
    else if (act === 'bulk') { if (!state.clients.length) return toast('Cadastre um cliente antes.'); return openBulk(); }
    return render();
  }
  const go = e.target.closest('[data-cal-go]');
  if (go) { e.preventDefault(); cal.clientId = go.dataset.calGo; cal.month = todayStr().slice(0, 7); view = 'calendario'; return render(); }
  if (e.target.closest('.plink')) return;
  const item = e.target.closest('.pitem');
  if (item) openPost(item.dataset.post);
});
document.addEventListener('change', e => { if (e.target.id === 'calClient') { cal.clientId = e.target.value; render(); } });
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('pitem')) { e.preventDefault(); openPost(e.target.dataset.post); }
});

/* ---------- exemplos (modo teste) ---------- */
function samplePosts(clients) {
  const ym = todayStr().slice(0, 7), mk = (c, day, type, title, status) => {
    const d = `${ym}-${String(day).padStart(2, '0')}`;
    return { id: uid(), createdAt: new Date().toISOString(), clientId: clients[c].id, title, type, network: 'Instagram', publishDate: d, deliveryDate: addDays(d, -2), status, link: '', demandId: null };
  };
  const days = daysOfMonth(ym).length;
  return [
    mk(0, 3, 'carrossel', 'Mitos sobre clareamento', 'published'),
    mk(0, 8, 'reels', 'Bastidores da clínica', 'ready'),
    mk(0, 15, 'post', 'Promoção de limpeza', 'approval'),
    mk(0, Math.min(22, days), 'carrossel', 'Cuidados com a gengiva', 'doing'),
    mk(0, Math.min(28, days), 'reels', 'Depoimento de paciente', 'todo'),
    mk(1, 5, 'post', 'Sabor da semana', 'ready'),
    mk(1, 12, 'reels', 'Pizza saindo do forno', 'todo'),
    mk(1, 19, 'carrossel', 'Cardápio de inverno', 'todo')
  ];
}
