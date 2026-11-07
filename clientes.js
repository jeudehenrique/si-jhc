/* Clientes: ficha com serviços contratados e pagamento, e "Montar o mês do cliente".
   Usa state, persist, render, toast, esc, uid, todayStr, fmtDate, isOpen, askConfirm, CLIENT_LIMIT
   e os ajudantes de data/pauta do calendar.js. */

const SERVICES = [
  { k: 'meta', label: 'Meta Ads', icon: '📣' },
  { k: 'google', label: 'Google Ads', icon: '🔎' },
  { k: 'gmn', label: 'Google Meu Negócio', icon: '📍' },
  { k: 'posts', label: 'Postagens', icon: '🖼️' },
  { k: 'videos', label: 'Vídeos (Reels)', icon: '🎬' },
  { k: 'site', label: 'Site', icon: '💻' }
];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const money = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
let editingClientId = null, planClientId = null, planItems = [];

/* ---------- tela ---------- */
function serviceChips(c) {
  const s = c.services || {};
  const chips = SERVICES.filter(x => s[x.k]).map(x => {
    let extra = '';
    if (x.k === 'posts') extra = ` ${(s.postDays || []).length}x/sem`;
    if (x.k === 'videos') extra = ` ${s.videosPerMonth || 0}/mês`;
    if (x.k === 'site') extra = s.siteKind === 'novo' ? ' (novo)' : ' (manutenção)';
    return `<span class="svc">${x.icon} ${x.label}${extra}</span>`;
  }).join('');
  return chips || '<span class="muted small-note">Nenhum serviço marcado</span>';
}
function payText(c) {
  const days = (c.payDays || []).filter(Boolean);
  if (!c.fee) return 'Sem valor cadastrado';
  if (days.length === 2) return `2× ${money(c.fee / 2)} · dias ${days[0]} e ${days[1]}`;
  return `${money(c.fee)}${days[0] ? ` · dia ${days[0]}` : ''}`;
}
function renderClientes() {
  const n = state.clients.length;
  const total = state.clients.reduce((s, c) => s + (Number(c.fee) || 0), 0);
  const ym = todayStr().slice(0, 7);
  const cards = state.clients.map(c => {
    const open = state.demands.filter(d => d.clientId === c.id && isOpen(d)).length;
    const posts = state.posts.filter(p => p.clientId === c.id && monthOf(p.publishDate) === ym).length;
    return `<div class="card ccard" data-client="${c.id}" tabindex="0" role="button">
      <div class="ctop"><b>${esc(c.name)}</b><span class="cfee">${c.fee ? money(c.fee) + '/mês' : ''}</span></div>
      <div class="svcs">${serviceChips(c)}</div>
      <div class="sub">💰 ${payText(c)}</div>
      ${adsLine(c)}
      <div class="sub">📅 ${posts} pauta${posts === 1 ? '' : 's'} em ${monthName(ym)} · ${open} demanda${open === 1 ? '' : 's'} aberta${open === 1 ? '' : 's'}</div>
      <div class="cacts"><button class="btn small" data-cli="plan" data-id="${c.id}">📋 Montar o mês</button></div>
    </div>`;
  }).join('');
  return `<div class="page-head">
    <h1 class="title">MEUS <b>CLIENTES</b></h1>
    <button class="btn primary" data-cli="new">+ Novo cliente</button>
  </div>
  <p class="muted">${n} de ${CLIENT_LIMIT} clientes · faturamento mensal previsto: <b style="color:var(--gold)">${money(total)}</b></p>
  ${n ? `<div class="clients-grid">${cards}</div>`
    : `<div class="card empty">Nenhum cliente ainda.<br><button class="btn primary" data-cli="new">Cadastrar o primeiro cliente</button></div>`}
  <p class="note">Clique num cliente para editar os serviços e o pagamento. "Montar o mês" mostra uma prévia das pautas e demandas antes de criar qualquer coisa.</p>`;
}

/* ---------- ficha do cliente ---------- */
const chip = (value, label, checked) => `<label class="chip"><input type="checkbox" value="${value}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;
const checkedVals = sel => [...document.querySelectorAll(sel + ' input:checked')].map(i => i.value);
function syncClientForm() {
  const on = k => !!document.querySelector(`#kServices input[value="${k}"]`)?.checked;
  $$('#kPostsBox').classList.toggle('hidden', !on('posts'));
  $$('#kVideosBox').classList.toggle('hidden', !on('videos'));
  $$('#kSiteBox').classList.toggle('hidden', !on('site'));
  const two = $$('#kSplit').value === '2', fee = Number($$('#kFee').value) || 0;
  $$('#kDay2Wrap').classList.toggle('hidden', !two);
  $$('#kPayHint').textContent = !fee ? '' : two
    ? `2 parcelas de ${money(fee / 2)} (dias ${$$('#kDay1').value || '?'} e ${$$('#kDay2').value || '?'})`
    : `1 parcela de ${money(fee)} (dia ${$$('#kDay1').value || '?'})`;
}
function openClient(id) {
  editingClientId = id || null;
  const c = state.clients.find(x => x.id === id) || {};
  const s = c.services || {};
  $$('#clientTitle').innerHTML = id ? 'EDITAR <b>CLIENTE</b>' : 'NOVO <b>CLIENTE</b>';
  $$('#kName').value = c.name || '';
  $$('#kPhone').value = c.phone || '';
  $$('#kStart').value = c.startDate || '';
  $$('#kNotes').value = c.notes || '';
  $$('#kServices').innerHTML = SERVICES.map(x => chip(x.k, `${x.icon} ${x.label}`, s[x.k])).join('');
  $$('#kPostDays').innerHTML = DOW_ORDER.map(d => chip(d, WEEKDAYS[d], (s.postDays || [2, 4]).includes(d))).join('');
  $$('#kNetworks').innerHTML = NETWORKS.map(n => chip(n, n, (s.postNetworks || ['Instagram']).includes(n))).join('');
  $$('#kPostType').innerHTML = ['carrossel', 'post'].map(k => `<option value="${k}">${POST_TYPES[k].icon} ${POST_TYPES[k].label}</option>`).join('');
  $$('#kPostType').value = s.postType || 'carrossel';
  $$('#kVideos').value = s.videosPerMonth || 4;
  $$('#kSiteKind').value = s.siteKind || 'manutencao';
  const days = c.payDays || [];
  $$('#kFee').value = c.fee || '';
  $$('#kSplit').value = days.length === 2 ? '2' : '1';
  $$('#kDay1').value = days[0] || 5;
  $$('#kDay2').value = days[1] || 20;
  $$('#kDelete').classList.toggle('hidden', !id);
  $$('#kPlan').classList.toggle('hidden', !id);
  syncClientForm();
  $$('#clientDialog').showModal();
}
$$('#clientForm2').addEventListener('input', syncClientForm);
$$('#clientForm2').addEventListener('change', syncClientForm);
$$('#clientForm2').addEventListener('submit', async e => {
  e.preventDefault();
  const svc = checkedVals('#kServices');
  const day = v => Math.min(31, Math.max(1, Math.round(Number(v) || 1)));
  const services = {
    meta: svc.includes('meta'), google: svc.includes('google'), gmn: svc.includes('gmn'),
    posts: svc.includes('posts'), videos: svc.includes('videos'), site: svc.includes('site'),
    postDays: checkedVals('#kPostDays').map(Number), postNetworks: checkedVals('#kNetworks'), postType: $$('#kPostType').value,
    videosPerMonth: Math.max(0, Math.round(Number($$('#kVideos').value) || 0)), siteKind: $$('#kSiteKind').value
  };
  if (services.posts && !services.postDays.length) return toast('Marque ao menos um dia de postagem.');
  if (services.posts && !services.postNetworks.length) return toast('Marque ao menos uma rede.');
  const data = {
    name: $$('#kName').value.trim(), phone: $$('#kPhone').value.trim(), startDate: $$('#kStart').value || '',
    notes: $$('#kNotes').value.trim(), services, fee: Math.max(0, Number($$('#kFee').value) || 0),
    payDays: $$('#kSplit').value === '2' ? [day($$('#kDay1').value), day($$('#kDay2').value)] : [day($$('#kDay1').value)]
  };
  if (!data.name) return;
  const isNew = !editingClientId;
  let id = editingClientId;
  if (isNew) { id = uid(); state.clients.push({ id, ...data }); }
  else Object.assign(state.clients.find(x => x.id === id), data);
  persist(); $$('#clientDialog').close(); render(); toast('Cliente salvo.');
  if (isNew && SERVICES.some(x => services[x.k])
      && await askConfirm(`Quer montar agora o mês de ${data.name}?\nVocê vê a prévia antes de criar.`, 'Montar o mês', false)) openPlan(id);
});
$$('#kCancel').onclick = () => $$('#clientDialog').close();
$$('#kPlan').onclick = () => { const id = editingClientId; $$('#clientDialog').close(); openPlan(id); };
$$('#kDelete').onclick = async () => {
  const id = editingClientId, c = state.clients.find(x => x.id === id);
  const nd = state.demands.filter(d => d.clientId === id).length, np = state.posts.filter(p => p.clientId === id).length;
  const msg = `Remover ${c.name}?` + (nd || np ? `\nIsso também apaga ${nd} demanda(s) e ${np} pauta(s) dele.` : '');
  if (!(await askConfirm(msg, 'Remover'))) return;
  state.clients = state.clients.filter(x => x.id !== id);
  state.demands = state.demands.filter(d => d.clientId !== id);
  state.posts = state.posts.filter(p => p.clientId !== id);
  state.receipts.forEach(r => { if (r.clientId === id) r.clientId = null; });  // histórico financeiro fica
  persist(); $$('#clientDialog').close(); render(); toast('Cliente removido.');
};

/* ---------- montar o mês ---------- */
const isWeekday = d => { const w = weekdayOf(d); return w > 0 && w < 6; };
function buildPlan(c, ym) {
  const s = c.services || {}, today = todayStr();
  const all = daysOfMonth(ym), days = all.filter(d => d >= today), weekdays = days.filter(isWeekday);
  const lastWd = all.filter(isWeekday).pop();
  const items = [];
  const post = (date, type, title) => items.push({
    kind: 'post', date, type, title, network: (s.postNetworks || [])[0] || 'Instagram',
    exists: state.posts.some(p => p.clientId === c.id && p.publishDate === date && p.type === type)
  });
  const dem = (date, desc, room, delegable) => items.push({
    kind: 'demand', date, desc, room, delegable,
    exists: state.demands.some(d => d.clientId === c.id && d.desc === desc && d.due === date)
  });
  const weekly = (w, desc, room, deleg) => days.filter(d => weekdayOf(d) === w).forEach(d => dem(d, desc, room, deleg));

  if (s.posts) {
    const t = s.postType || 'carrossel';
    days.filter(d => (s.postDays || []).includes(weekdayOf(d))).forEach(d => post(d, t, `${POST_TYPES[t].label} · tema a definir`));
  }
  if (s.videos && s.videosPerMonth > 0 && weekdays.length) {
    const n = Math.min(s.videosPerMonth, weekdays.length);
    for (let i = 0; i < n; i++) post(weekdays[Math.floor((i + .5) * weekdays.length / n)], 'reels', 'Reels · tema a definir');
  }
  if (s.meta) {
    weekly(1, 'Meta Ads: otimizar campanhas', 'Gestão de anúncios', false);
    if (lastWd >= today) dem(lastWd, 'Meta Ads: relatório do mês', 'Gestão de anúncios', false);
  }
  if (s.google) {
    weekly(2, 'Google Ads: otimizar campanhas e palavras-chave', 'Gestão de anúncios', false);
    if (lastWd >= today) dem(lastWd, 'Google Ads: relatório do mês', 'Gestão de anúncios', false);
  }
  if (s.gmn) weekly(3, 'Google Meu Negócio: postar e responder avaliações', 'SEO', true);
  if (s.site) {
    const novo = s.siteKind === 'novo';
    const d = novo ? lastWd : (weekdays.find(x => +x.slice(8) >= 10) || weekdays[weekdays.length - 1]);
    if (d && d >= today) dem(d, novo ? 'Site: desenvolver e publicar' : 'Site: manutenção e atualizações do mês', 'Programação/Sites', true);
  }
  const pd = (c.payDays || []).filter(Boolean);
  pd.forEach((day, i) => {
    const date = all[Math.min(day, all.length) - 1];
    if (date >= today) dem(date, pd.length === 2
      ? `Conferir pagamento: parcela ${i + 1}/2 (${money(c.fee / 2)})`
      : `Conferir pagamento do mês (${money(c.fee)})`, 'Atendimento', false);
  });
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}
function updatePlanBtn() {
  const n = document.querySelectorAll('#planList input:checked').length;
  $$('#planCreate').textContent = n ? `Criar ${n} ${n === 1 ? 'item' : 'itens'}` : 'Criar';
  $$('#planCreate').disabled = !n;
}
function renderPlan() {
  const c = state.clients.find(x => x.id === planClientId), ym = $$('#planMonth').value;
  planItems = c && ym ? buildPlan(c, ym) : [];
  const icon = it => it.kind === 'post' ? POST_TYPES[it.type].icon : '✅';
  $$('#planList').innerHTML = planItems.length
    ? planItems.map((it, i) => `<label class="prow ${it.exists ? 'exists' : ''}">
        <input type="checkbox" data-i="${i}" ${it.exists ? 'disabled' : 'checked'}>
        <b>${fmtDate(it.date)} ${WEEKDAYS[weekdayOf(it.date)]}</b>
        <span>${icon(it)} ${esc(it.kind === 'post' ? it.title : it.desc)}</span>
        <small>${it.exists ? 'já existe' : it.kind === 'post' ? 'pauta' : esc(it.room)}</small></label>`).join('')
    : `<div class="muted small-note">Nada para criar em ${ym ? monthLabel(ym) : 'este mês'}. Confira se os serviços estão marcados na ficha do cliente, ou escolha um mês que ainda não passou.</div>`;
  updatePlanBtn();
}
function openPlan(id) {
  const c = state.clients.find(x => x.id === id); if (!c) return;
  planClientId = id;
  $$('#planTitle').innerHTML = `MONTAR O MÊS · <b>${esc(c.name.toUpperCase())}</b>`;
  $$('#planMonth').value = todayStr().slice(0, 7);
  renderPlan();
  $$('#planDialog').showModal();
}
$$('#planMonth').addEventListener('change', renderPlan);
$$('#planList').addEventListener('change', updatePlanBtn);
$$('#planCancel').onclick = () => $$('#planDialog').close();
$$('#planForm').addEventListener('submit', e => {
  e.preventDefault();
  const c = state.clients.find(x => x.id === planClientId); if (!c) return;
  const chosen = [...document.querySelectorAll('#planList input:checked')].map(i => planItems[+i.dataset.i]);
  if (!chosen.length) return;
  const now = new Date().toISOString(), today = todayStr();
  chosen.forEach(it => {
    if (it.kind === 'post') {
      const delivery = addDays(it.date, -2);
      state.posts.push({ id: uid(), createdAt: now, clientId: c.id, title: it.title, type: it.type, network: it.network,
        publishDate: it.date, deliveryDate: delivery < today ? today : delivery, status: 'todo', link: '', demandId: null });
    } else {
      state.demands.push({ id: uid(), desc: it.desc, clientId: c.id, room: it.room, priority: 'media', due: it.date,
        status: 'todo', owner: 'Eu', delegable: it.delegable, createdAt: now, doneAt: null });
    }
  });
  persist(); $$('#planDialog').close(); render();
  toast(`${chosen.length} ${chosen.length === 1 ? 'item criado' : 'itens criados'} para ${c.name}.`);
});

/* ---------- cliques ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cli]');
  if (b) { if (b.dataset.cli === 'new') return openClient(null); if (b.dataset.cli === 'plan') return openPlan(b.dataset.id); }
  const card = e.target.closest('.ccard');
  if (card) openClient(card.dataset.client);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('ccard')) { e.preventDefault(); openClient(e.target.dataset.client); }
});

/* ---------- exemplos (modo teste) ---------- */
function sampleClients() {
  const base = { phone: '', startDate: '', notes: '' };
  return [
    { id: uid(), name: 'Clínica Sorriso', ...base, fee: 1500, payDays: [5, 20],
      services: { meta: true, posts: true, postDays: [2, 4], postNetworks: ['Instagram', 'Facebook'], postType: 'carrossel' } },
    { id: uid(), name: 'Pizzaria Bella', ...base, fee: 1200, payDays: [10],
      services: { meta: true, gmn: true, posts: true, postDays: [1, 3, 5], postNetworks: ['Instagram'], postType: 'post', videos: true, videosPerMonth: 4 } },
    { id: uid(), name: 'Academia Forma', ...base, fee: 900, payDays: [5, 20],
      services: { google: true, gmn: true, site: true, siteKind: 'manutencao' } }
  ];
}
