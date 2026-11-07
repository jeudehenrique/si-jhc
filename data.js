/* Camada de dados e login.
   Modo online (Supabase): liga sozinho quando config.js tem a URL e a chave pública do projeto.
   Modo teste: sem configuração, os dados ficam só neste navegador. */
// link de "recuperar senha" do e-mail: guarda antes de o Supabase limpar o endereço
const SI_RECOVERY = /type=recovery/.test(location.hash);
const DB = (() => {
  const cfg = window.JH_CONFIG || {};
  const configured = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const online = configured && !!window.supabase;
  // configurado, mas a biblioteca do Supabase não carregou (sem internet ou bloqueio)
  const configError = configured && !online;
  const sb = online ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const LOCAL = 'jh-escritorio-v1', SESSION = 'jh-sessao';

  /* Tabelas, na ordem de criação (pais antes dos filhos). Ao apagar, a ordem se inverte.
     "optional": a tabela pode não existir ainda no Supabase (migração não rodada);
     nesse caso o resto do app continua funcionando e essa parte só não é salva. */
  const TABLES = [
    { key: 'clients', table: 'clients', order: 'created_at',
      to: c => ({ id: c.id, name: c.name, phone: c.phone || null, start_date: c.startDate || null, notes: c.notes || null,
        services: c.services || {}, fee: Number(c.fee) || 0, pay_days: c.payDays || [] }),
      from: r => ({ id: r.id, name: r.name, phone: r.phone || '', startDate: r.start_date || '', notes: r.notes || '',
        services: r.services || {}, fee: Number(r.fee) || 0, payDays: r.pay_days || [] }) },
    { key: 'demands', table: 'demands',
      to: d => ({ id: d.id, client_id: d.clientId, description: d.desc, room: d.room, priority: d.priority, due: d.due,
        status: d.status, owner: d.owner, delegable: !!d.delegable, created_at: d.createdAt, done_at: d.doneAt || null }),
      from: r => ({ id: r.id, clientId: r.client_id, desc: r.description, room: r.room, priority: r.priority, due: r.due,
        status: r.status, owner: r.owner, delegable: r.delegable, createdAt: r.created_at, doneAt: r.done_at }) },
    { key: 'posts', table: 'posts', optional: true,
      to: p => ({ id: p.id, client_id: p.clientId, title: p.title, type: p.type, network: p.network || null,
        publish_date: p.publishDate, delivery_date: p.deliveryDate, status: p.status, link: p.link || null,
        demand_id: p.demandId || null, created_at: p.createdAt }),
      from: r => ({ id: r.id, clientId: r.client_id, title: r.title, type: r.type, network: r.network || '',
        publishDate: r.publish_date, deliveryDate: r.delivery_date, status: r.status, link: r.link || '',
        demandId: r.demand_id || null, createdAt: r.created_at }) },
    { key: 'goals', table: 'goals', optional: true, order: 'created_at',
      to: g => ({ id: g.id, name: g.name, period: g.period, target: Number(g.target) || 0, source: g.source, created_at: g.createdAt }),
      from: r => ({ id: r.id, name: r.name, period: r.period, target: Number(r.target), source: r.source, createdAt: r.created_at }) },
    { key: 'goalLogs', table: 'goal_logs', optional: true,
      to: l => ({ id: l.id, goal_id: l.goalId, log_date: l.date, amount: Math.round(Number(l.amount) || 0), created_at: l.createdAt }),
      from: r => ({ id: r.id, goalId: r.goal_id, date: r.log_date, amount: r.amount, createdAt: r.created_at }) },
    // status dos agentes: quem escreve são os próprios agentes (si-ponte); a SI só lê
    { key: 'agents', table: 'agents', optional: true,
      to: a => ({ id: a.id, key: a.key, status: a.status, task: a.task || null, updated_at: a.updatedAt }),
      from: r => ({ id: r.id, key: r.key, status: r.status, task: r.task || '', updatedAt: r.updated_at }) },
    { key: 'costs', table: 'costs', optional: true, order: 'created_at',
      to: c => ({ id: c.id, name: c.name, category: c.category, kind: c.kind, amount: Number(c.amount) || 0,
        date: c.date || null, pay_day: c.payDay || null, active: c.active !== false, created_at: c.createdAt }),
      from: r => ({ id: r.id, name: r.name, category: r.category, kind: r.kind, amount: Number(r.amount),
        date: r.date || null, payDay: r.pay_day || null, active: r.active, createdAt: r.created_at }) },
    { key: 'receipts', table: 'receipts', optional: true,
      to: r => ({ id: r.id, client_id: r.clientId || null, description: r.description, kind: r.kind, amount: Number(r.amount) || 0,
        month: r.month || null, installment: r.installment ?? null, due_date: r.dueDate, paid_at: r.paidAt || null, created_at: r.createdAt }),
      from: r => ({ id: r.id, clientId: r.client_id || null, description: r.description, kind: r.kind, amount: Number(r.amount),
        month: r.month || null, installment: r.installment ?? null, dueDate: r.due_date, paidAt: r.paid_at || null, createdAt: r.created_at }) },
    // resumo do Painel Meta Ads: só LEITURA aqui (o script sync-meta.mjs é quem escreve)
    { key: 'ads', table: 'ads_accounts', optional: true, readonly: true,
      to: a => ({ id: a.id }),
      from: r => ({ id: r.id, company: r.company, accountName: r.account_name, spendToday: r.spend_today === null ? null : Number(r.spend_today),
        spend7d: r.spend_7d === null ? null : Number(r.spend_7d), spendMonth: r.spend_month === null ? null : Number(r.spend_month),
        results7d: r.results_7d, costPerResult: r.cost_per_result === null ? null : Number(r.cost_per_result),
        funds: r.funds === null ? null : Number(r.funds), fundsType: r.funds_type, fundsLevel: r.funds_level, delivery: r.delivery, syncedAt: r.synced_at }) },
    // números do CRM (Agente 5): só LEITURA aqui; o CRM escreve com a chave secreta dele (tabela metricas_crm)
    { key: 'crm', table: 'metricas_crm', optional: true, readonly: true,
      to: m => ({ id: m.id }),
      from: r => ({ id: r.chave, dados: r.dados || {}, updatedAt: r.atualizado_em }) },
    { key: 'settings', table: 'settings', optional: true,
      to: s => ({ id: s.id, key: s.key, data: s.data || {} }),
      from: r => ({ id: r.id, key: r.key, data: r.data || {} }) }
  ];
  const ok = Object.fromEntries(TABLES.map(t => [t.key, true]));
  const emptyData = () => Object.fromEntries(TABLES.map(t => [t.key, []]));

  function readLocal() {
    try {
      const s = JSON.parse(localStorage.getItem(LOCAL));
      if (!s || !Array.isArray(s.clients)) return null;
      return Object.fromEntries(TABLES.map(t => [t.key, s[t.key] || []]));
    } catch { return null; }
  }

  /* Sincronização: guarda a última versão salva no banco e, a cada mudança,
     envia só o que mudou (novos/alterados) e apaga o que foi removido.
     Se falhar, a versão salva não muda, então a próxima gravação tenta de novo. */
  let snap = null;
  let queue = Promise.resolve();
  const snapshot = s => Object.fromEntries(TABLES.map(t => [t.key, new Map((s[t.key] || []).map(x => [x.id, JSON.stringify(t.to(x))]))]));
  const changed = (prev, next) => [...next].filter(([id, j]) => prev.get(id) !== j).map(([, j]) => JSON.parse(j));
  const removed = (prev, next) => [...prev.keys()].filter(id => !next.has(id));
  const check = ({ error }) => { if (error) throw error; };

  async function push(next) {
    const prev = snap || snapshot(emptyData());
    const live = TABLES.filter(t => ok[t.key] && !t.readonly);
    for (const t of live) {
      const up = changed(prev[t.key], next[t.key]);
      if (up.length) check(await sb.from(t.table).upsert(up));
    }
    for (const t of [...live].reverse()) {
      const del = removed(prev[t.key], next[t.key]);
      if (del.length) check(await sb.from(t.table).delete().in('id', del));
    }
    snap = next;
  }

  function loginMessage(err) {
    const m = (err && err.message) || '';
    if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(m)) return 'Este e-mail ainda não foi confirmado no Supabase.';
    if (/fetch|network/i.test(m)) return 'Sem conexão com o servidor. Verifique a internet.';
    return 'Não foi possível entrar: ' + m;
  }

  return {
    online, configError, localData: readLocal,
    // true quando a tabela existe no banco (ou no modo teste)
    ready: key => ok[key] !== false,
    // espera terminar as gravações que estão na fila
    idle: () => queue,
    async user() {
      if (!online) return localStorage.getItem(SESSION);
      const { data } = await sb.auth.getSession();
      return data.session?.user?.email || null;
    },
    async login(email, password) {
      if (!online) { localStorage.setItem(SESSION, email); return; }
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(loginMessage(error));
    },
    async setPassword(password) {
      if (!online) return;
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw new Error(/same|different/i.test(error.message) ? 'Escolha uma senha diferente da anterior.' : /weak|short|least/i.test(error.message) ? 'Senha muito curta ou fraca. Use pelo menos 8 caracteres.' : 'Não consegui salvar a senha: ' + error.message);
    },
    async logout() {
      snap = null;
      if (!online) localStorage.removeItem(SESSION);
      else await sb.auth.signOut();
    },
    onSignedOut(cb) {
      if (online) sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') cb(); });
    },
    async load() {
      if (!online) return readLocal() || emptyData();
      const res = await Promise.all(TABLES.map(t => {
        const q = sb.from(t.table).select('*');
        return t.order ? q.order(t.order) : q;
      }));
      const s = emptyData();
      TABLES.forEach((t, i) => {
        const r = res[i];
        if (r.error) {
          if (!t.optional) throw r.error;
          ok[t.key] = false;
          console.warn(`Tabela "${t.table}" indisponível (rode a migração correspondente):`, r.error.message);
        } else { ok[t.key] = true; s[t.key] = r.data.map(t.from); }
      });
      snap = snapshot(s);
      return s;
    },
    save(state, onError) {
      if (!online) {
        localStorage.setItem(LOCAL, JSON.stringify(Object.fromEntries(TABLES.map(t => [t.key, state[t.key] || []]))));
        return Promise.resolve();
      }
      queue = queue.then(() => push(snapshot(state))).catch(err => { console.error(err); onError && onError(err); });
      return queue;
    }
  };
})();
