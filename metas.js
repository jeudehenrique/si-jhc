/* Módulo 4 — Metas e crescimento.
   Usa state, persist, render, toast, esc, uid, todayStr, fmtDate e os ajudantes de data do calendar.js. */

const GOAL_PERIODS = [['day', 'por dia'], ['week', 'por semana'], ['month', 'por mês'], ['now', 'no total']];
const PERIOD_NOW = { day: 'hoje', week: 'esta semana', month: 'este mês', now: 'agora' };
const GOAL_SOURCES = [
  ['manual', 'Eu registro os números'],
  ['clients', 'Automática: clientes cadastrados'],
  ['posts_published', 'Automática: postagens publicadas']
];
const SUGGESTED_GOALS = [
  { name: 'Prospecções feitas', period: 'day', target: 10, source: 'manual' },
  { name: 'Follow-ups feitos', period: 'week', target: 20, source: 'manual' },
  { name: 'Postagens publicadas', period: 'week', target: 6, source: 'posts_published' },
  { name: 'Clientes fechados', period: 'month', target: 2, source: 'manual' },
  { name: 'Clientes ativos', period: 'now', target: 15, source: 'clients' }
];
let editingGoalId = null, loggingGoalId = null;

/* ---------- cálculo ---------- */
const mondayOf = s => addDays(s, -((weekdayOf(s) + 6) % 7));
function rangeFor(period, ref = todayStr()) {
  if (period === 'day') return [ref, ref];
  if (period === 'week') { const a = mondayOf(ref); return [a, addDays(a, 6)]; }
  if (period === 'month') { const d = daysOfMonth(ref.slice(0, 7)); return [d[0], d[d.length - 1]]; }
  return null;
}
const inRange = (d, r) => !r || (d >= r[0] && d <= r[1]);
function goalValue(g, range) {
  if (g.source === 'clients') return state.clients.length;
  if (g.source === 'posts_published') return state.posts.filter(p => p.status === 'published' && inRange(p.publishDate, range)).length;
  return state.goalLogs.filter(l => l.goalId === g.id && inRange(l.date, range)).reduce((s, l) => s + (Number(l.amount) || 0), 0);
}
const goalPct = (v, t) => t > 0 ? Math.round(v / t * 100) : 0;
const periodName = k => (GOAL_PERIODS.find(p => p[0] === k) || [])[1];
const fmtNum = n => Number(n).toLocaleString('pt-BR');
function goalState(g) {
  const v = goalValue(g, rangeFor(g.period)), pct = goalPct(v, g.target);
  return { v, pct, done: g.target > 0 && v >= g.target, left: Math.max(0, g.target - v) };
}

/* ---------- tela ---------- */
function goalCardHTML(g) {
  const s = goalState(g), auto = g.source !== 'manual';
  const hasLog = !auto && state.goalLogs.some(l => l.goalId === g.id);
  return `<div class="card goal ${s.done ? 'done' : ''}">
    <div class="gtop">
      <div><b>${esc(g.name)}</b><small>${periodName(g.period)}</small></div>
      <button class="btn ghost small" data-meta="edit" data-id="${g.id}" aria-label="Editar meta">✎</button>
    </div>
    <div class="gnum"><b>${fmtNum(s.v)}</b><span> / ${fmtNum(g.target)}</span>${s.done ? ' 🎉' : ''}</div>
    <div class="progress gold"><span style="width:${Math.min(100, s.pct)}%"></span></div>
    <div class="gsub">${s.pct}% ${s.done ? '· meta batida!' : `· faltam ${fmtNum(s.left)} (${PERIOD_NOW[g.period]})`}</div>
    ${auto ? `<div class="gsub">Calculada automaticamente</div>`
      : `<div class="gacts">
          <button class="btn small" data-meta="add" data-id="${g.id}" data-n="1">+1</button>
          <button class="btn small" data-meta="add" data-id="${g.id}" data-n="5">+5</button>
          <button class="btn small ghost" data-meta="log" data-id="${g.id}">Registrar…</button>
          ${hasLog ? `<button class="btn small ghost" data-meta="undo" data-id="${g.id}">Desfazer último</button>` : ''}
        </div>`}
  </div>`;
}

function historyHTML() {
  const goals = state.goals.filter(g => g.source !== 'clients');
  if (!goals.length) return '';
  const thisMonday = mondayOf(todayStr());
  const weeks = Array.from({ length: 6 }, (_, i) => addDays(thisMonday, -7 * (5 - i)));
  const rows = goals.map(g => {
    const vals = weeks.map(w => goalValue(g, [w, addDays(w, 6)]));
    const max = Math.max(...vals, 1);
    return `<tr><th>${esc(g.name)}</th>${vals.map((v, i) => `<td class="${i === 5 ? 'cur' : ''}">
      <div class="hbar"><span style="height:${Math.round(v / max * 100)}%"></span></div><b>${fmtNum(v)}</b></td>`).join('')}</tr>`;
  }).join('');
  return `<div class="section-title">Histórico por <b>semana</b></div>
  <div class="card hist"><table>
    <thead><tr><th></th>${weeks.map((w, i) => `<th class="${i === 5 ? 'cur' : ''}">${i === 5 ? 'Esta' : fmtDate(w)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="note">Total de cada semana (segunda a domingo). A coluna "Esta" ainda está em andamento.</p></div>`;
}

function renderMetas() {
  const head = `<div class="page-head">
    <h1 class="title">METAS E <b>CRESCIMENTO</b></h1>
    <button class="btn primary" data-meta="new">+ Nova meta</button>
  </div>`;
  const banner = DB.online && !DB.ready('goals')
    ? `<div class="alertbox danger">⚠️ <div><b>Falta um passo no banco online.</b> Para salvar as metas, rode o arquivo <b>migracao-3-metas.sql</b> no Supabase (SQL Editor). Enquanto isso, as metas não são salvas.</div></div>` : '';
  if (!state.goals.length) {
    return head + banner + `<div class="card empty">Você ainda não tem metas.<br>Posso criar 5 metas sugeridas (prospecções, follow-ups, postagens, clientes fechados e clientes ativos). Depois você ajusta os números.<br>
      <button class="btn primary" data-meta="seed">Criar metas sugeridas</button></div>`;
  }
  const done = state.goals.filter(g => goalState(g).done).length;
  return head + banner + `<p class="muted">${done} de ${state.goals.length} metas batidas no período atual.</p>
    <div class="goals">${state.goals.map(goalCardHTML).join('')}</div>
    ${historyHTML()}`;
}

function renderMetasMini() {
  if (!state.goals.length) return '';
  const rows = state.goals.slice(0, 5).map(g => {
    const s = goalState(g);
    return `<div class="gmini"><span>${esc(g.name)} <small>${PERIOD_NOW[g.period]}</small></span>
      <div class="progress gold"><span style="width:${Math.min(100, s.pct)}%"></span></div><b>${fmtNum(s.v)}/${fmtNum(g.target)}</b></div>`;
  }).join('');
  return `<div class="section-title">Metas <b>do período</b> <a href="#" data-view="metas" style="font:400 13px Inter;text-transform:none;color:var(--accent);margin-left:8px">Ver todas</a></div>
    <div class="card gminis">${rows}</div>`;
}

/* ---------- meta: criar, editar, apagar ---------- */
function syncGoalForm() {
  const auto = $$('#gSource').value === 'clients';
  if (auto) $$('#gPeriod').value = 'now';
  else if ($$('#gPeriod').value === 'now') $$('#gPeriod').value = 'week';
  $$('#gPeriod').disabled = auto;
}
function openGoal(id) {
  editingGoalId = id || null;
  const g = state.goals.find(x => x.id === id);
  $$('#gSource').innerHTML = GOAL_SOURCES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  $$('#gPeriod').innerHTML = GOAL_PERIODS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  $$('#goalTitle').innerHTML = g ? 'EDITAR <b>META</b>' : 'NOVA <b>META</b>';
  $$('#gName').value = g?.name || '';
  $$('#gSource').value = g?.source || 'manual';
  $$('#gPeriod').value = g?.period || 'week';
  $$('#gTarget').value = g ? g.target : 10;
  $$('#gDelete').classList.toggle('hidden', !g);
  syncGoalForm();
  $$('#goalDialog').showModal();
}
$$('#gSource').addEventListener('change', syncGoalForm);
$$('#goalForm').addEventListener('submit', e => {
  e.preventDefault();
  const data = { name: $$('#gName').value.trim(), source: $$('#gSource').value, period: $$('#gPeriod').value, target: Math.max(0, Number($$('#gTarget').value) || 0) };
  if (!data.name) return;
  if (editingGoalId) Object.assign(state.goals.find(x => x.id === editingGoalId), data);
  else state.goals.push({ id: uid(), createdAt: new Date().toISOString(), ...data });
  persist(); $$('#goalDialog').close(); render(); toast('Meta salva.');
});
$$('#gCancel').onclick = () => $$('#goalDialog').close();
$$('#gDelete').onclick = async () => {
  if (!(await askConfirm('Excluir esta meta e todos os registros dela?'))) return;
  state.goals = state.goals.filter(x => x.id !== editingGoalId);
  state.goalLogs = state.goalLogs.filter(l => l.goalId !== editingGoalId);
  persist(); $$('#goalDialog').close(); render(); toast('Meta excluída.');
};

/* ---------- registrar números ---------- */
function addLog(goalId, amount, date = todayStr()) {
  state.goalLogs.push({ id: uid(), goalId, date, amount: Math.round(amount), createdAt: new Date().toISOString() });
  persist(); render();
}
function openLog(id) {
  loggingGoalId = id;
  const g = state.goals.find(x => x.id === id);
  $$('#logTitle').innerHTML = `REGISTRAR <b>${esc(g.name.toUpperCase())}</b>`;
  $$('#lAmount').value = 1; $$('#lDate').value = todayStr(); $$('#lDate').max = todayStr();
  $$('#logDialog').showModal();
}
$$('#logForm').addEventListener('submit', e => {
  e.preventDefault();
  const n = Math.round(Number($$('#lAmount').value)), d = $$('#lDate').value;
  if (!n || !d) return;
  addLog(loggingGoalId, n, d); $$('#logDialog').close(); toast('Registrado.');
});
$$('#lCancel').onclick = () => $$('#logDialog').close();

/* ---------- cliques ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-meta]'); if (!b) return;
  const act = b.dataset.meta, id = b.dataset.id;
  if (act === 'new') return openGoal(null);
  if (act === 'edit') return openGoal(id);
  if (act === 'log') return openLog(id);
  if (act === 'add') { addLog(id, Number(b.dataset.n)); return toast(`+${b.dataset.n} registrado.`); }
  if (act === 'undo') {
    const last = state.goalLogs.filter(l => l.goalId === id).sort((a, c) => c.createdAt.localeCompare(a.createdAt))[0];
    if (!last) return;
    state.goalLogs = state.goalLogs.filter(l => l.id !== last.id);
    persist(); render(); return toast('Último registro desfeito.');
  }
  if (act === 'seed') {
    SUGGESTED_GOALS.forEach(g => state.goals.push({ id: uid(), createdAt: new Date().toISOString(), ...g }));
    persist(); render(); toast('Metas criadas. Toque no lápis para ajustar os números.');
  }
});

/* ---------- exemplos (modo teste) ---------- */
function sampleGoals() {
  const goals = SUGGESTED_GOALS.map(g => ({ id: uid(), createdAt: new Date().toISOString(), ...g }));
  const logs = [], monday = mondayOf(todayStr());
  const pattern = { 'Prospecções feitas': [8, 10, 6, 12, 9, 0, 0], 'Follow-ups feitos': [3, 4, 2, 5, 3, 0, 0], 'Clientes fechados': [0, 1, 0, 0, 0, 0, 0] };
  goals.forEach(g => {
    if (!pattern[g.name]) return;
    for (let w = 5; w >= 0; w--) for (let i = 0; i < 7; i++) {
      const date = addDays(monday, -7 * w + i);
      if (date > todayStr()) continue;
      const base = pattern[g.name][i];
      const n = w === 0 ? base : Math.max(0, base + ((w + i) % 3) - 1);
      if (n) logs.push({ id: uid(), goalId: g.id, date, amount: g.name === 'Clientes fechados' && w % 2 ? 0 : n, createdAt: new Date().toISOString() });
    }
  });
  return { goals, logs: logs.filter(l => l.amount) };
}
