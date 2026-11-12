/* Financeiro: recebimentos (parcelas da ficha de cada cliente + receitas avulsas), custos fixos e variáveis,
   margem do mês, meta de faturamento e simulador de contratação (CLT x PJ).
   A SI só registra e calcula o que você lançar: nada é cobrado nem enviado.
   Usa state, persist, render, toast, esc, uid, todayStr, fmtDate, diffDays, askConfirm, money (clientes.js)
   e os ajudantes de data do calendar.js. */

const COST_CATS = [['ferramenta', 'Ferramenta'], ['assinatura', 'Assinatura'], ['anuncios', 'Anúncios próprios'], ['pessoal', 'Pessoal'], ['impostos', 'Impostos'], ['outros', 'Outros']];
const ROLES = [['gestao', 'Gestão (clientes, prazos e atendimento)'], ['ia', 'Criação com IA (conteúdo, vídeos e sites)']];
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
const byPayDay = l => l.slice().sort((a, b) => (a.payDay || 99) - (b.payDay || 99) || a.name.localeCompare(b.name));
const catName = k => (COST_CATS.find(c => c[0] === k) || [, 'Outros'])[1];
let finMonth = '', editingCostId = null, editingIncomeId = null;

/* ---------- configurações (meta e simulador) ---------- */
const finSettings = () => state.settings.find(s => s.key === 'finance')?.data || {};
function saveFinSettings(patch) {
  let row = state.settings.find(s => s.key === 'finance');
  if (!row) { row = { id: uid(), key: 'finance', data: {} }; state.settings.push(row); }
  row.data = { ...row.data, ...patch };
  persist();
}

/* ---------- cálculo ---------- */
const monthEnd = ym => { const d = daysOfMonth(ym); return d[d.length - 1]; };
const sum = (arr, f) => r2(arr.reduce((s, x) => s + (Number(f(x)) || 0), 0));
// parcelas esperadas no mês, a partir da ficha de cada cliente (valor e dias de pagamento)
function parcels(ym) {
  const all = daysOfMonth(ym);
  return state.clients.filter(c => Number(c.fee) > 0 && (!c.startDate || c.startDate <= monthEnd(ym))).flatMap(c => {
    const days = (c.payDays || []).filter(Boolean);
    const n = days.length === 2 ? 2 : 1;
    return (n === 2 ? days : [days[0] || 1]).map((d, i) => {
      const rec = state.receipts.find(r => r.kind === 'parcela' && r.clientId === c.id && r.month === ym && r.installment === i + 1);
      return { client: c, installment: i + 1, of: n, amount: rec ? Number(rec.amount) : r2(c.fee / n), due: all[Math.min(d, all.length) - 1], rec, paid: !!rec?.paidAt };
    });
  }).sort((a, b) => a.due.localeCompare(b.due));
}
function finTotals(ym) {
  const ps = parcels(ym);
  const av = state.receipts.filter(r => r.kind === 'avulso' && monthOf(r.dueDate) === ym).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const fixed = state.costs.filter(c => c.kind === 'fixed' && c.active);
  const variable = state.costs.filter(c => c.kind === 'variable' && c.date && monthOf(c.date) === ym);
  const previsto = r2(sum(ps, p => p.amount) + sum(av, r => r.amount));
  const recebido = r2(sum(ps.filter(p => p.paid), p => p.amount) + sum(av.filter(r => r.paidAt), r => r.amount));
  const custos = r2(sum(fixed, c => c.amount) + sum(variable, c => c.amount));
  return { ps, av, fixed, variable, previsto, recebido, aReceber: r2(previsto - recebido), custos,
    lucro: r2(previsto - custos), lucroReal: r2(recebido - custos), margem: previsto ? Math.round((previsto - custos) / previsto * 100) : 0 };
}
function ticketMedio() {
  const fees = state.clients.map(c => Number(c.fee) || 0).filter(f => f > 0);
  return fees.length ? r2(fees.reduce((s, f) => s + f, 0) / fees.length) : 0;
}

/* ---------- simulador de contratação ---------- */
function simInputs() {
  const s = finSettings().sim || {};
  const v = (id, def) => { const el = $$('#' + id); return el ? Number(el.value) || 0 : (s[id] ?? def); };
  return { role: $$('#simRole')?.value || s.simRole || 'gestao', salary: v('simSalary', 2000), charges: v('simCharges', 30), benefits: v('simBenefits', 0), extra: v('simExtra', 8) };
}
function simResultHTML() {
  const t = finTotals(finMonth), i = simInputs(), tk = ticketMedio();
  const opts = [
    { name: 'CLT', cost: r2(i.salary * (1 + i.charges / 100) + i.benefits), note: `salário + ${i.charges}% de encargos + benefícios` },
    { name: 'PJ / freelancer', cost: r2(i.salary), note: 'valor fechado, sem encargos' }
  ];
  const cols = opts.map(o => {
    const after = r2(t.lucro - o.cost), need = tk ? Math.ceil(o.cost / tk) : null, withExtra = r2(t.lucro - o.cost + i.extra * tk);
    return `<div class="simcol">
      <b>${o.name}</b><small>${o.note}</small>
      <div class="simline">Custo por mês <span>${money(o.cost)}</span></div>
      <div class="simline">Lucro do mês com a pessoa <span class="${after < 0 ? 'neg' : ''}">${money(after)}</span></div>
      <div class="simline">Clientes a mais para ela se pagar <span>${need === null ? '—' : need}</span></div>
      <div class="simline">Lucro com +${i.extra} clientes <span class="${withExtra < 0 ? 'neg' : 'pos'}">${tk ? money(withExtra) : '—'}</span></div>
    </div>`;
  }).join('');
  return `${cols}<p class="note">Ticket médio dos clientes: ${tk ? money(tk) : 'cadastre os valores na ficha dos clientes'}.
    Lucro atual previsto: ${money(t.lucro)}. Estimativa: confirme encargos com o seu contador.</p>`;
}

/* ---------- tela ---------- */
/* Visão anual: quanto entrou em cada ano e as mensalidades de hoje. Valores em dinheiro ficam sempre no Financeiro. */
function finResumoAnualHTML() {
  const anos = [...new Set(state.receipts.filter(r => r.paidAt).map(r => r.paidAt.slice(0, 4)))].sort();
  const recebido = a => state.receipts.filter(r => r.paidAt && r.paidAt.slice(0, 4) === a).reduce((s, r) => s + Number(r.amount), 0);
  const pagantes = state.clients.filter(c => Number(c.fee) > 0), mrr = pagantes.reduce((s, c) => s + Number(c.fee), 0);
  const cell = (t, v, sub) => `<div class="card fcell"><small>${t}</small><div class="gnum"><b>${v}</b></div><div class="gsub">${sub}</div></div>`;
  return `<div class="section-title">Visão <b>anual</b></div><div class="fgrid">
    ${anos.map(a => cell(`Recebido em ${a}`, money(recebido(a)), a === todayStr().slice(0, 4) ? 'até hoje' : 'ano fechado')).join('')}
    ${cell('Mensalidades de hoje', money(mrr), `${pagantes.length} clientes pagantes`)}
    ${cell('Mensalidade média', money(pagantes.length ? mrr / pagantes.length : 0), 'por cliente pagante')}
  </div>`;
}

function renderFinanceiro() {
  if (!finMonth) finMonth = todayStr().slice(0, 7);
  const ym = finMonth, t = finTotals(ym), set = finSettings(), sim = set.sim || {};
  const goal = Number(set.revenueGoal) || 0, today = todayStr();
  const banner = DB.online && !(DB.ready('costs') && DB.ready('receipts') && DB.ready('settings'))
    ? `<div class="alertbox danger">⚠️ <div><b>Falta um passo no banco online.</b> Para salvar o financeiro, é preciso rodar a migração 6 no Supabase. Enquanto isso, os lançamentos não são salvos.</div></div>` : '';
  const noFee = state.clients.filter(c => !(Number(c.fee) > 0));
  const parcelRow = p => {
    const late = !p.paid && p.due < today, isToday = !p.paid && p.due === today;
    return `<div class="frow ${p.paid ? 'paid' : late ? 'late' : isToday ? 'today' : ''}">
      <div><b>${esc(p.client.name)}</b><small>${p.of === 2 ? `parcela ${p.installment}/2` : 'mensalidade'}</small></div>
      <div class="fdue">${p.paid ? `recebido ${fmtDate(p.rec.paidAt)}` : `${late ? 'venceu' : 'vence'} ${fmtDate(p.due)}`}</div>
      <div class="famt">${money(p.amount)}</div>
      ${p.paid ? `<button class="btn small ok" data-fin="unpay" data-id="${p.rec.id}">✓ Recebido</button>`
        : `<button class="btn small" data-fin="pay" data-c="${p.client.id}" data-i="${p.installment}">Marcar recebido</button>`}
    </div>`;
  };
  const avRow = r => `<div class="frow ${r.paidAt ? 'paid' : r.dueDate < today ? 'late' : ''}" data-fin="income" data-id="${r.id}" role="button" tabindex="0">
      <div><b>${esc(r.description)}</b><small>avulso${r.clientId ? ' · ' + esc(clientName(r.clientId)) : ''}</small></div>
      <div class="fdue">${r.paidAt ? `recebido ${fmtDate(r.paidAt)}` : `previsto ${fmtDate(r.dueDate)}`}</div>
      <div class="famt">${money(r.amount)}</div><span class="muted small-note">editar</span></div>`;
  const costRow = c => `<div class="frow cost ${c.kind === 'fixed' && !c.active ? 'off' : ''}" data-fin="cost" data-id="${c.id}" role="button" tabindex="0">
      <div><b>${esc(c.name)}</b><small>${catName(c.category)} · ${c.kind === 'fixed' ? (c.active ? 'fixo mensal' : 'fixo pausado') + (c.payDay ? ' · paga dia ' + c.payDay : ' · sem dia de pagamento') : 'variável · paga ' + fmtDate(c.date)}</small></div>
      <div class="famt">− ${money(c.amount)}</div><span class="muted small-note">editar</span></div>`;
  const pausedFixed = state.costs.filter(c => c.kind === 'fixed' && !c.active);
  return `<div class="page-head">
    <h1 class="title"><b>FINANCEIRO</b></h1>
  </div>
  ${banner}
  ${finResumoAnualHTML()}
  <div class="cal-controls"><div class="month-nav">
    <button class="btn ghost small" data-fin="prev" aria-label="Mês anterior">‹</button><b>${monthLabel(ym)}</b>
    <button class="btn ghost small" data-fin="next" aria-label="Próximo mês">›</button><button class="btn ghost small" data-fin="today">Hoje</button>
  </div></div>
  <div class="stats">
    <div class="card stat"><div class="num fnum">${money(t.previsto)}</div><div class="lbl">Faturamento previsto</div></div>
    <div class="card stat ok"><div class="num fnum">${money(t.recebido)}</div><div class="lbl">Recebido</div></div>
    <div class="card stat today"><div class="num fnum">${money(t.aReceber)}</div><div class="lbl">A receber</div></div>
    <div class="card stat late"><div class="num fnum">${money(t.custos)}</div><div class="lbl">Custos do mês</div></div>
  </div>
  <div class="card fprofit">
    <div><span class="muted">Lucro previsto do mês</span><b class="${t.lucro < 0 ? 'neg' : 'pos'}">${money(t.lucro)}</b><small>margem de ${t.margem}%</small></div>
    <div><span class="muted">Lucro com o que já entrou</span><b class="${t.lucroReal < 0 ? 'neg' : ''}">${money(t.lucroReal)}</b><small>recebido − custos</small></div>
  </div>
  <div class="card fgoal">
    <div class="fgoal-top"><span>Meta de faturamento</span>
      <label class="fgoal-in">R$ <input id="finGoal" type="number" min="0" step="100" value="${goal || ''}" placeholder="definir"></label>
      <button class="btn small" data-fin="goal-save">Salvar meta</button></div>
    ${goal ? `<div class="progress gold big"><span style="width:${Math.min(100, Math.round(t.recebido / goal * 100))}%"></span></div>
      <p class="muted small-note">Recebido ${money(t.recebido)} de ${money(goal)} (${Math.round(t.recebido / goal * 100)}%) · previsto ${Math.round(t.previsto / goal * 100)}% da meta</p>`
      : '<p class="muted small-note">Defina quanto quer faturar por mês para acompanhar aqui.</p>'}
  </div>
  ${noFee.length ? `<div class="alertbox">⚠️ <div>${noFee.length} cliente(s) sem valor na ficha: ${noFee.map(c => esc(c.name)).join(', ')}. <a href="#" data-act="clients" style="color:var(--accent)">Completar</a></div></div>` : ''}

  <div class="section-title">Recebimentos <b>do mês</b> <button class="btn small ghost" data-fin="income-new" style="margin-left:8px">+ Receita avulsa</button></div>
  <div class="flist">${t.ps.length || t.av.length ? t.ps.map(parcelRow).join('') + t.av.map(avRow).join('')
    : '<div class="card empty">Nada a receber neste mês. Cadastre o valor e os dias de pagamento na ficha dos clientes.</div>'}</div>

  <div class="section-title">Custos <b>do mês</b> <button class="btn small primary" data-fin="cost-new" style="margin-left:8px">+ Custo</button></div>
  <div class="flist">${t.fixed.length || t.variable.length || pausedFixed.length ? [...byPayDay(t.fixed), ...t.variable, ...byPayDay(pausedFixed)].map(costRow).join('')
    : '<div class="card empty">Nenhum custo lançado. Use "+ Custo" para ferramentas, assinaturas, anúncios próprios e gastos do mês.</div>'}
    <button class="btn small fadd" data-fin="cost-new">+ Adicionar custo</button></div>

  <div class="section-title">Simulador de <b>contratação</b></div>
  <div class="card sim">
    <div class="grid2 simin">
      <label>Vaga<select id="simRole">${ROLES.map(([k, l]) => `<option value="${k}" ${(sim.simRole || 'gestao') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Salário ou valor mensal (R$)<input id="simSalary" type="number" min="0" step="50" value="${sim.simSalary ?? 2000}"></label>
      <label>Encargos CLT (%)<input id="simCharges" type="number" min="0" max="150" step="1" value="${sim.simCharges ?? 30}"></label>
      <label>Benefícios CLT (VT, VR) R$<input id="simBenefits" type="number" min="0" step="10" value="${sim.simBenefits ?? 0}"></label>
      <label>Clientes a mais que a pessoa permite<input id="simExtra" type="number" min="0" max="50" step="1" value="${sim.simExtra ?? 8}"></label>
    </div>
    <div id="simRes" class="simres">${simResultHTML()}</div>
  </div>
  <p class="note">A SI só registra e calcula o que você lança: nada é cobrado nem enviado. Custos fixos valem para todos os meses enquanto estiverem ativos.</p>`;
}

function renderFinMini() {
  const ym = todayStr().slice(0, 7), t = finTotals(ym), goal = Number(finSettings().revenueGoal) || 0;
  if (!t.previsto && !t.custos) return '';
  return `<div class="section-title">Financeiro <b>de ${monthName(ym)}</b> <a href="#" data-view="financeiro" style="font:400 13px Inter;text-transform:none;color:var(--accent);margin-left:8px">Ver</a></div>
    <div class="card fmini">
      <div>Recebido <b>${money(t.recebido)}</b> de ${money(t.previsto)} previsto · custos ${money(t.custos)} · lucro previsto <b class="${t.lucro < 0 ? 'neg' : 'pos'}">${money(t.lucro)}</b> (${t.margem}%)</div>
      ${goal ? `<div class="progress gold"><span style="width:${Math.min(100, Math.round(t.recebido / goal * 100))}%"></span></div><small class="muted">${Math.round(t.recebido / goal * 100)}% da meta de ${money(goal)}</small>` : ''}
    </div>`;
}

/* ---------- custo: criar, editar, apagar ---------- */
function syncCostForm() {
  const fixed = $$('#fcKind').value === 'fixed';
  $$('#fcDateWrap').classList.toggle('hidden', fixed);
  $$('#fcDayWrap').classList.toggle('hidden', !fixed);
  $$('#fcActiveWrap').classList.toggle('hidden', !fixed);
  $$('#fcDate').required = !fixed;
  $$('#fcDay').required = fixed;
}
function openCost(id) {
  editingCostId = id || null;
  const c = state.costs.find(x => x.id === id) || {};
  $$('#costTitle').innerHTML = id ? 'EDITAR <b>CUSTO</b>' : 'NOVO <b>CUSTO</b>';
  $$('#fcCat').innerHTML = COST_CATS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  $$('#fcName').value = c.name || '';
  $$('#fcCat').value = c.category || 'ferramenta';
  $$('#fcKind').value = c.kind || 'fixed';
  $$('#fcAmount').value = c.amount ?? '';
  $$('#fcDate').value = c.date || (monthOf(todayStr()) === finMonth ? todayStr() : finMonth + '-01');
  $$('#fcActive').checked = c.active !== false;
  $$('#fcDay').value = c.payDay || '';
  $$('#fcDelete').classList.toggle('hidden', !id);
  syncCostForm();
  $$('#costDialog').showModal();
}
$$('#fcKind').addEventListener('change', syncCostForm);
$$('#costForm').addEventListener('submit', e => {
  e.preventDefault();
  const kind = $$('#fcKind').value;
  const data = { name: $$('#fcName').value.trim(), category: $$('#fcCat').value, kind, amount: r2(Math.max(0, Number($$('#fcAmount').value))),
    date: kind === 'variable' ? $$('#fcDate').value : null, payDay: kind === 'fixed' ? Math.min(31, Math.max(1, Math.round(Number($$('#fcDay').value) || 1))) : null,
    active: kind === 'fixed' ? $$('#fcActive').checked : true };
  if (!data.name || (kind === 'variable' && !data.date)) return;
  if (editingCostId) Object.assign(state.costs.find(x => x.id === editingCostId), data);
  else state.costs.push({ id: uid(), createdAt: new Date().toISOString(), ...data });
  persist(); $$('#costDialog').close(); render(); toast('Custo salvo.');
});
$$('#fcCancel').onclick = () => $$('#costDialog').close();
$$('#fcDelete').onclick = async () => {
  if (!(await askConfirm('Excluir este custo?'))) return;
  state.costs = state.costs.filter(x => x.id !== editingCostId);
  persist(); $$('#costDialog').close(); render(); toast('Custo excluído.');
};

/* ---------- receita avulsa ---------- */
function openIncome(id) {
  editingIncomeId = id || null;
  const r = state.receipts.find(x => x.id === id) || {};
  $$('#incomeTitle').innerHTML = id ? 'EDITAR <b>RECEITA</b>' : 'RECEITA <b>AVULSA</b>';
  $$('#fiClient').innerHTML = '<option value="">— sem cliente —</option>' + state.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $$('#fiDesc').value = r.description || '';
  $$('#fiClient').value = r.clientId || '';
  $$('#fiAmount').value = r.amount ?? '';
  $$('#fiDate').value = r.dueDate || (monthOf(todayStr()) === finMonth ? todayStr() : finMonth + '-01');
  $$('#fiPaid').checked = !!r.paidAt;
  $$('#fiDelete').classList.toggle('hidden', !id);
  $$('#incomeDialog').showModal();
}
$$('#incomeForm').addEventListener('submit', e => {
  e.preventDefault();
  const date = $$('#fiDate').value;
  const data = { description: $$('#fiDesc').value.trim(), clientId: $$('#fiClient').value || null, kind: 'avulso',
    amount: r2(Math.max(0, Number($$('#fiAmount').value))), dueDate: date, month: monthOf(date), installment: null,
    paidAt: $$('#fiPaid').checked ? (date <= todayStr() ? date : todayStr()) : null };
  if (!data.description || !date) return;
  if (editingIncomeId) Object.assign(state.receipts.find(x => x.id === editingIncomeId), data);
  else state.receipts.push({ id: uid(), createdAt: new Date().toISOString(), ...data });
  persist(); $$('#incomeDialog').close(); render(); toast('Receita salva.');
});
$$('#fiCancel').onclick = () => $$('#incomeDialog').close();
$$('#fiDelete').onclick = async () => {
  if (!(await askConfirm('Excluir esta receita?'))) return;
  state.receipts = state.receipts.filter(x => x.id !== editingIncomeId);
  persist(); $$('#incomeDialog').close(); render(); toast('Receita excluída.');
};

/* ---------- cliques e campos da tela ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-fin]'); if (!b) return;
  const act = b.dataset.fin;
  if (act === 'prev' || act === 'next') { finMonth = shiftMonth(finMonth, act === 'prev' ? -1 : 1); return render(); }
  if (act === 'today') { finMonth = todayStr().slice(0, 7); return render(); }
  if (act === 'cost-new') return openCost(null);
  if (act === 'income-new') return openIncome(null);
  if (act === 'cost') return openCost(b.dataset.id);
  if (act === 'income') return openIncome(b.dataset.id);
  if (act === 'goal-save') { saveFinSettings({ revenueGoal: Math.max(0, Number($$('#finGoal').value) || 0) }); render(); return toast('Meta salva.'); }
  if (act === 'pay') {
    const p = parcels(finMonth).find(x => x.client.id === b.dataset.c && x.installment === +b.dataset.i);
    if (!p || p.rec) return;
    state.receipts.push({ id: uid(), createdAt: new Date().toISOString(), clientId: p.client.id, kind: 'parcela',
      description: `${p.client.name} · ${p.of === 2 ? `parcela ${p.installment}/2` : 'mensalidade'}`, amount: p.amount,
      month: finMonth, installment: p.installment, dueDate: p.due, paidAt: todayStr() });
    persist(); render(); return toast(`${money(p.amount)} de ${p.client.name} marcado como recebido.`);
  }
  if (act === 'unpay') {
    if (!(await askConfirm('Desmarcar este recebimento?', 'Desmarcar'))) return;
    state.receipts = state.receipts.filter(r => r.id !== b.dataset.id);
    persist(); render(); return toast('Recebimento desmarcado.');
  }
});
document.addEventListener('keydown', e => {
  const el = e.target.closest?.('.frow[data-fin]');
  if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.click(); }
});
// simulador: recalcula ao digitar; guarda os números ao sair do campo
document.addEventListener('input', e => { if (e.target.closest?.('.simin')) $$('#simRes').innerHTML = simResultHTML(); });
document.addEventListener('change', e => {
  if (!e.target.closest?.('.simin')) return;
  const i = simInputs();
  saveFinSettings({ sim: { simRole: i.role, simSalary: i.salary, simCharges: i.charges, simBenefits: i.benefits, simExtra: i.extra } });
});

/* ---------- exemplos (modo teste) ---------- */
function sampleFinance(clients) {
  const ym = todayStr().slice(0, 7), now = new Date().toISOString(), d = n => `${ym}-${String(n).padStart(2, '0')}`;
  const costs = [
    { name: 'Claude e ChatGPT', category: 'ferramenta', kind: 'fixed', amount: 220, payDay: 5 },
    { name: 'Canva Pro', category: 'assinatura', kind: 'fixed', amount: 55, payDay: 12 },
    { name: 'Anúncios da própria JH', category: 'anuncios', kind: 'fixed', amount: 300, payDay: 1 },
    { name: 'Contador', category: 'impostos', kind: 'fixed', amount: 250, payDay: 20 },
    { name: 'Freelancer de edição', category: 'pessoal', kind: 'variable', amount: 200, date: d(12) }
  ].map(c => ({ id: uid(), createdAt: now, date: null, payDay: null, active: true, ...c }));
  const c0 = clients[0];
  const receipts = [
    { id: uid(), createdAt: now, clientId: c0.id, kind: 'parcela', description: `${c0.name} · parcela 1/2`, amount: r2(c0.fee / 2), month: ym, installment: 1, dueDate: d(5), paidAt: d(1) },
    { id: uid(), createdAt: now, clientId: clients[2].id, kind: 'avulso', description: 'Landing page de matrícula', amount: 800, month: ym, installment: null, dueDate: d(15), paidAt: null }
  ];
  return { costs, receipts, settings: [{ id: uid(), key: 'finance', data: { revenueGoal: 5000 } }] };
}
