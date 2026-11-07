/* Agentes de IA da JH ligados à SI.
   O status vem do banco (tabela agents), atualizado pelos próprios agentes pela ponte si-ponte/si.mjs.
   Usa state, esc, isOpen, diffDays e postLate do app.js/calendar.js. */

const AGENTS = [
  { key: 'gerente', num: 1, title: 'Gerente geral', icon: '🧠', rooms: [], postTypes: [], folder: 'esta conversa: Cérebro JHC' },
  { key: 'conteudo', num: 2, title: 'Design gráfico', icon: '🖼️', rooms: ['Criação de conteúdo', 'Design'], postTypes: ['carrossel', 'post'], folder: 'Criador de iamgesn' },
  { key: 'video', num: 3, title: 'Editor de vídeo', icon: '🎬', rooms: ['Edição de vídeo'], postTypes: ['reels'], folder: 'CLAUDE EDIÇÃO DE VIDEO' },
  { key: 'dashboard', num: 4, title: 'Gestor dashboard', icon: '📊', rooms: ['Gestão de anúncios'], postTypes: [], folder: 'Painel Meta Ads (C:\\Projetos)' },
  { key: 'crm', num: 5, title: 'CRM e WhatsApp', icon: '💬', rooms: ['Prospecção', 'Atendimento'], postTypes: [], folder: 'CRM BOOT JHC (JH Company)' }
];
// "trabalhando" só vale se o agente deu notícia nas últimas horas (se esquecer de avisar que acabou, volta a "livre")
const AGENT_FRESH_HOURS = 4;
const AGENT_LABEL = { work: 'Trabalhando', free: 'Livre' };

function agentInfo(a) {
  const row = state.agents.find(x => x.key === a.key);
  const fresh = !!(row && row.updatedAt && Date.now() - new Date(row.updatedAt) < AGENT_FRESH_HOURS * 3600e3);
  const working = fresh && (row.status === 'trabalhando' || row.status === 'aguardando');
  let dem = 0, posts = 0, late = 0, pend = 0, accts = 0;
  if (a.key === 'gerente') {   // notificação do gerente = alertas urgentes de toda a SI
    const urgent = computeAlerts().filter(x => x.sev !== 'soon');
    pend = urgent.length; late = urgent.filter(x => x.sev === 'late').length;
  } else {
    const d = state.demands.filter(x => isOpen(x) && a.rooms.includes(x.room));
    const p = state.posts.filter(x => a.postTypes.includes(x.type) && ['todo', 'doing', 'approval'].includes(x.status));
    dem = d.length; posts = p.length; pend = dem + posts;
    late = d.filter(x => diffDays(x.due) < 0).length + p.filter(postLate).length;
    if (a.key === 'dashboard') {   // contas de anúncios sem saldo também são pendência do gestor da dashboard
      const bad = state.ads.filter(x => x.fundsLevel === 'urgente' || x.fundsLevel === 'baixo');
      accts = bad.length; pend += accts; late += state.ads.filter(x => x.fundsLevel === 'urgente').length;
    }
  }
  return { ...a, row, fresh, dem, posts, accts, pend, late, k: working ? 'work' : 'free', task: working && row.task ? row.task : '' };
}
function timeAgo(isoStr) {
  if (!isoStr) return '';
  const m = Math.round((Date.now() - new Date(isoStr)) / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `há ${h} h` : `há ${Math.round(h / 24)} dias`;
}

function agentsPanelHTML() {
  const cards = AGENTS.map(agentInfo).map(a => {
    const news = a.row?.updatedAt ? `Última notícia ${timeAgo(a.row.updatedAt)}` : 'Ainda não se conectou à SI';
    const pendTxt = a.key === 'gerente'
      ? (a.pend ? `${a.pend} alerta${a.pend > 1 ? 's' : ''} urgente${a.pend > 1 ? 's' : ''}${a.late ? ` · <em>${a.late} atrasado${a.late > 1 ? 's' : ''}</em>` : ''}` : 'Sem alertas urgentes')
      : (a.pend ? `${a.pend} pendência${a.pend > 1 ? 's' : ''}${a.late ? ` · <em>${a.late} atrasada${a.late > 1 ? 's' : ''}</em>` : ''} (${a.dem} demanda${a.dem === 1 ? '' : 's'}, ${a.posts} pauta${a.posts === 1 ? '' : 's'})` : 'Sem pendências');
    return `<div class="card acard ${a.k}">
      <div class="atop"><span class="aicon">${a.icon}</span><div><b>Agente ${a.num} · ${a.title}</b><small>${esc(a.folder)}</small></div>
        ${a.pend ? `<span class="abell ${a.late ? 'late' : ''}" title="Notificações">🔔 ${a.pend}</span>` : ''}</div>
      <span class="pill-st ${a.k}">${AGENT_LABEL[a.k]}</span>
      ${a.task ? `<div class="atask">🛠️ ${esc(a.task)}</div>` : ''}
      <div class="sub">${pendTxt}</div>
      <div class="sub">${news}</div>
      ${a.key === 'gerente' ? '<button class="btn small" data-view="alertas">Ver alertas</button>'
        : `${a.dem ? `<button class="btn small" data-agent-pend="${a.key}">Ver demandas</button>` : ''}${a.posts ? '<button class="btn small ghost" data-view="calendario">Ver pautas</button>' : ''}`}
    </div>`;
  }).join('');
  return `<div class="section-title">Agentes <b>de IA</b></div>
    <div class="agents">${cards}</div>
    <p class="note">Cada agente está <b>trabalhando</b> ou <b>livre</b>. O sino 🔔 mostra o que está pendente na área dele. Eles avisam a SI sozinhos; esta tela se atualiza a cada minuto.</p>`;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-agent-pend]'); if (!b) return;
  filters = { status: '', room: '', client: '', owner: '', q: '', agent: b.dataset.agentPend };
  view = 'demandas'; render();
});

/* ---------- exemplos (modo teste) ---------- */
function sampleAgents() {
  const ago = min => new Date(Date.now() - min * 60000).toISOString();
  return [
    { id: 'agente-gerente', key: 'gerente', status: 'trabalhando', task: 'Organizando a SI e os clientes', updatedAt: ago(2) },
    { id: 'agente-conteudo', key: 'conteudo', status: 'livre', task: '', updatedAt: ago(90) },
    { id: 'agente-video', key: 'video', status: 'trabalhando', task: 'Editando o reels da promoção da Pizzaria Bella', updatedAt: ago(12) }
  ];
}
