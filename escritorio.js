/* Escritório da SI: planta de frente, organizada por cartões.
   Em cima, os 3 agentes (quem trabalha); embaixo, as salas que ainda não têm agente.
   Cada cartão mostra: quem é, TRABALHANDO ou LIVRE, e as pendências (sino).
   Usa state, AGENTS/agentInfo (agentes.js), ROOMS, SHORT, VAGAS, POST_TYPES, postLate, diffDays, isOpen, esc, timeAgo. */

const ROOM_COLOR = {
  'Design': '#e86aa6', 'Edição de vídeo': '#9b6bff', 'Programação/Sites': '#22b5a7', 'SEO': '#ff9f43',
  'Gestão de anúncios': '#38BDF8', 'Criação de conteúdo': '#2fbf71', 'Prospecção': '#F3B44F', 'Atendimento': '#ff6b6b'
};
const ROOM_ICON2 = { 'Design': '🎨', 'Edição de vídeo': '🎬', 'Programação/Sites': '💻', 'SEO': '🔍', 'Gestão de anúncios': '📈', 'Criação de conteúdo': '✍️', 'Prospecção': '📞', 'Atendimento': '💬' };
const LOOK = {
  gerente: { skin: '#e0ac85', hair: '#1a1a1a', color: '#38BDF8' },
  conteudo: { skin: '#f6d1b1', hair: '#6b3e1f', color: '#e86aa6' },
  video: { skin: '#c68642', hair: '#1a1a1a', color: '#9b6bff' },
  dashboard: { skin: '#e0ac85', hair: '#4a4a4a', color: '#38BDF8' },
  crm: { skin: '#f1c27d', hair: '#3b2a1a', color: '#22b5a7' }
};
const tint = (hex, t) => {
  const n = parseInt(hex.slice(1), 16);
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('');
};
const ROOM_OF_POST = { carrossel: 'Criação de conteúdo', reels: 'Edição de vídeo', post: 'Design' };

/* ---------- desenho da mesa (SVG simples e limpo) ---------- */
function deskSVG({ color, k, look, empty = false, shelf = false }) {
  const work = k === 'work', skin = look?.skin || '#e0ac85', hair = look?.hair || '#1a1a1a';
  const floor = tint(color, .86), line = tint(color, .7);
  let tiles = ''; for (let x = 20; x < 220; x += 20) tiles += `<line x1="${x}" y1="0" x2="${x}" y2="150" stroke="${line}" stroke-width="1"/>`;
  for (let y = 25; y < 150; y += 25) tiles += `<line x1="0" y1="${y}" x2="220" y2="${y}" stroke="${line}" stroke-width="1"/>`;
  const screen = work
    ? `<rect x="132" y="54" width="62" height="40" rx="4" fill="#0f2a3a"/><g class="code">
        <rect x="138" y="62" width="34" height="3.5" rx="1.7" fill="#22C55E"/><rect x="138" y="70" width="46" height="3.5" rx="1.7" fill="#7fd4ff"/>
        <rect x="138" y="78" width="26" height="3.5" rx="1.7" fill="#fff" opacity=".7"/><rect x="138" y="86" width="40" height="3.5" rx="1.7" fill="#22C55E"/></g>`
    : `<rect x="132" y="54" width="62" height="40" rx="4" fill="#161b26"/><circle cx="163" cy="74" r="3" fill="#38BDF8" opacity=".55"/>`;
  const glow = work ? `<rect x="124" y="46" width="78" height="56" rx="10" fill="#22C55E" opacity=".18"/>` : '';
  const shelfSvg = shelf ? `<rect x="10" y="14" width="46" height="62" rx="3" fill="#b7794a"/><rect x="14" y="18" width="38" height="16" fill="#8a5532"/><rect x="14" y="38" width="38" height="16" fill="#8a5532"/><rect x="14" y="58" width="38" height="14" fill="#8a5532"/>
      ${['#38BDF8', '#F3B44F', '#FF8A80', '#22C55E', '#9b6bff'].map((c, i) => `<rect x="${16 + i * 7}" y="20" width="5" height="12" fill="${c}"/><rect x="${16 + i * 7}" y="40" width="5" height="12" fill="${c}"/>`).join('')}` : '';
  const person = empty ? '' : `
    <g class="${work ? 'bob' : ''}">
      <rect x="82" y="68" width="48" height="44" rx="14" fill="${color}"/>
      <rect x="100" y="64" width="12" height="10" fill="${skin}"/>
      <circle cx="106" cy="52" r="17" fill="${skin}"/>
      <path d="M89 50a17 17 0 0 1 34 0q-17-9-34 0z" fill="${hair}"/>
      ${work ? `<circle cx="100" cy="53" r="2" fill="#1a1a1a"/><circle cx="113" cy="53" r="2" fill="#1a1a1a"/><path d="M101 61q5 2 10 0" stroke="#7a4a30" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
        : `<path d="M96 54q4 3 8 0M109 54q4 3 8 0" stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M99 61q7 5 14 0" stroke="#7a4a30" stroke-width="1.8" fill="none" stroke-linecap="round"/>`}
    </g>`;
  const arms = empty ? '' : work
    ? `<rect class="arm a1" x="74" y="92" width="14" height="22" rx="7" fill="${color}"/><rect class="arm a2" x="124" y="92" width="14" height="22" rx="7" fill="${color}"/>`
    : `<rect x="74" y="92" width="14" height="22" rx="7" fill="${color}"/><rect x="126" y="86" width="14" height="22" rx="7" fill="${color}" transform="rotate(-25 133 90)"/>`;
  const mug = !work && !empty ? `<rect x="60" y="92" width="14" height="12" rx="3" fill="#fff" stroke="#d0d4dc"/><path class="steam" d="M64 88q-3-5 0-9M70 88q3-5 0-9" stroke="#b9c0cc" stroke-width="2" fill="none" stroke-linecap="round"/>` : '';
  const chair = `<rect x="76" y="60" width="60" height="58" rx="14" fill="${empty ? '#7b8396' : '#30364a'}" opacity="${empty ? .55 : 1}"/>`;
  return `<svg viewBox="0 0 220 150" class="deskscene ${k}${empty ? ' empty' : ''}" role="img" aria-hidden="true">
    <rect width="220" height="150" rx="12" fill="${floor}"/>${tiles}${shelfSvg}${glow}${chair}${person}
    <rect x="30" y="102" width="160" height="14" rx="5" fill="#c98a4b"/><rect x="36" y="116" width="148" height="24" rx="5" fill="#8b5a2b"/>
    ${screen}<rect x="159" y="94" width="8" height="8" fill="#2b2f38"/><rect x="146" y="100" width="34" height="3" rx="1.5" fill="#2b2f38"/>
    <rect x="86" y="98" width="38" height="7" rx="3" fill="#e3e5ea"/>${arms}${mug}
  </svg>`;
}

/* ---------- peças de texto ---------- */
const pendChip = (pend, late, one = 'pendência', many = 'pendências') => pend
  ? `<div class="rchip ${late ? 'late' : 'warn'}">🔔 <b>${pend}</b> ${pend > 1 ? many : one}${late ? ` · <b>${late}</b> atrasad${late > 1 ? 'as' : 'a'}` : ''}</div>`
  : `<div class="rchip ok">✓ Sem ${many}</div>`;
const stateBadge = k => k === 'work' ? '<div class="rstate work"><i></i>TRABALHANDO</div>' : '<div class="rstate free"><i></i>LIVRE</div>';

function agentCardHTML(a) {
  const isMgr = a.key === 'gerente';
  const room = a.rooms[0];
  const color = isMgr ? LOOK.gerente.color : ROOM_COLOR[room];
  const news = a.row?.updatedAt ? `Última notícia ${timeAgo(a.row.updatedAt)}` : 'Ainda não se conectou';
  const attrs = isMgr ? 'data-view="alertas"' : `data-view="sala:${a.key}"`;
  return `<div class="rcard agent ${a.k}" ${attrs} tabindex="0" role="button" style="--c:${color}">
    <div class="rhead"><span class="rnum">AGENTE ${a.num}</span><b>${a.title}</b>${isMgr ? '<small>Sala do diretor · cérebro da SI</small>' : `<small>${a.rooms.map(r => ROOM_ICON2[r]).join(' ')} ${a.rooms.length > 1 ? 'Salas' : 'Sala'} ${a.rooms.map(esc).join(' e ')}</small>`}</div>
    ${deskSVG({ color, k: a.k, look: LOOK[a.key], shelf: isMgr })}
    ${stateBadge(a.k)}
    <div class="rtask">${a.task ? '🛠️ ' + esc(a.task) : a.k === 'work' ? '&nbsp;' : 'Aguardando a próxima tarefa'}</div>
    ${isMgr ? pendChip(a.pend, a.late, 'alerta urgente', 'alertas urgentes') : pendChip(a.pend, a.late)}
    <div class="rsub">${isMgr ? 'Clique para ver os alertas' : a.key === 'dashboard' ? `${a.dem} demanda${a.dem === 1 ? '' : 's'} · ${a.accts} conta${a.accts === 1 ? '' : 's'} sem saldo · clique para abrir a sala` : `${a.dem} demanda${a.dem === 1 ? '' : 's'} · ${a.posts} pauta${a.posts === 1 ? '' : 's'} · clique para abrir a sala`} · ${news}</div>
  </div>`;
}

function emptyRoomHTML(room) {
  const d = state.demands.filter(x => isOpen(x) && x.room === room);
  const p = state.posts.filter(x => ROOM_OF_POST[x.type] === room && ['todo', 'doing', 'approval'].includes(x.status));
  const pend = d.length + p.length, late = d.filter(x => diffDays(x.due) < 0).length + p.filter(postLate).length;
  return `<div class="rcard small" data-room="${esc(room)}" tabindex="0" role="button" style="--c:${ROOM_COLOR[room]}">
    <div class="rhead"><b>${ROOM_ICON2[room]} ${esc(SHORT[room])}</b><small>Sala ${esc(room)}</small></div>
    ${deskSVG({ color: ROOM_COLOR[room], k: 'free', empty: true })}
    <div class="rstate none">SEM AGENTE AINDA</div>
    ${pend ? `<div class="rchip ${late ? 'late' : 'warn'}">🔔 <b>${pend}</b> aguardando${late ? ` · <b>${late}</b> atrasada${late > 1 ? 's' : ''}` : ''}</div>` : '<div class="rchip ok">— nada pendente</div>'}
  </div>`;
}

function sceneHTML(ags) {
  const byKey = Object.fromEntries(ags.map(a => [a.key, a]));
  const DOLL_ROOM = { 'Design': 'conteudo', 'Edição de vídeo': 'video', 'Gestão de anúncios': 'dashboard', 'Criação de conteúdo': 'crm' };   // sala onde fica o boneco de cada agente
  const lab = a => a.k === 'work' ? 'Trabalhando' : 'Livre';
  const st = ROOMS.map((room, i) => {
    const a = byKey[DOLL_ROOM[room]];
    const d = state.demands.filter(x => isOpen(x) && x.room === room);
    const p = state.posts.filter(x => ROOM_OF_POST[x.type] === room && ['todo', 'doing', 'approval'].includes(x.status));
    const pend = a ? a.pend : d.length + p.length, late = a ? a.late : d.filter(x => diffDays(x.due) < 0).length + p.filter(postLate).length;
    return { room, i, hasAgent: !!a, agentKey: a?.key, num: a?.num, title: a?.title, k: a ? a.k : 'free', label: a ? lab(a) : '', pend, late };
  });
  const g = byKey.gerente;
  const me = { k: g.k, label: lab(g), pend: g.pend, late: g.late };
  const vagas = VAGAS.map(([owner, short]) => ({ owner, short, total: 0, meta: 'a contratar' }));
  return Office.html({ st, me, vagas });
}

let officeOpen = null;   // agente cujas pendências estão abertas embaixo do escritório (clicou abre, clicou de novo fecha)
/* Lista de pendências ao lado do sino do agente (dentro do escritório, sem descer a tela).
   Clicar no sino abre; clicar de novo fecha. Cada pendência tem "Ir resolver", que leva ao agente responsável. */
function officePopHTML() {
  const a = AGENTS.map(agentInfo).find(x => x.key === officeOpen);
  if (!a) return '';
  const cname = id => state.clients.find(c => c.id === id)?.name || 'Sem cliente';
  const sevOf = d => d < todayStr() ? 'late' : d === todayStr() ? 'today' : 'soon';
  const dest = a.key === 'gerente' ? 'alertas' : `sala:${a.key}`;
  let list = [];
  if (a.key === 'gerente') {
    list = computeAlerts().filter(x => x.sev !== 'soon').map(x => ({ sev: x.sev, t: x.text, s: x.sub }));
  } else {
    const d = state.demands.filter(x => isOpen(x) && a.rooms.includes(x.room)).sort(byDue).map(x => ({ sev: sevOf(x.due), t: x.desc, s: `${cname(x.clientId)} · ${x.room} · prazo ${fmtDate(x.due)}` }));
    const p = state.posts.filter(x => a.postTypes.includes(x.type) && ['todo', 'doing', 'approval'].includes(x.status)).sort((x, y) => x.publishDate.localeCompare(y.publishDate))
      .map(x => ({ sev: postLate(x) ? 'late' : 'soon', t: x.title, s: `${cname(x.clientId)} · ${POST_TYPES[x.type].label} · publica ${fmtDate(x.publishDate)}` }));
    const ads = a.key === 'dashboard' ? state.ads.filter(x => x.fundsLevel === 'urgente' || x.fundsLevel === 'baixo').map(x => ({ sev: x.fundsLevel === 'urgente' ? 'late' : 'today', t: `${x.company}: saldo ${x.fundsLevel === 'urgente' ? 'urgente' : 'baixo'}`, s: 'abastecer a conta de anúncios' })) : [];
    list = [...d, ...p, ...ads];
  }
  const rows = list.map(x => `<div class="ofrow ${x.sev}" data-view="${dest}" tabindex="0" role="button"><div class="ofbody"><b>${esc(x.t)}</b><small>${esc(x.s)}</small></div><span class="ofgo">Ir resolver ›</span></div>`).join('');
  return `<div class="ofpop" role="dialog" aria-label="Pendências do agente ${a.num}">
    <div class="ofpop-head"><div><b>Agente ${a.num} · ${esc(a.title)}</b><small>${list.length ? `${list.length} pendência${list.length > 1 ? 's' : ''}` : 'nenhuma pendência'}</small></div>
      <button class="ofx" data-ofc="${a.key}" aria-label="Fechar">×</button></div>
    <div class="ofpop-list">${rows || '<div class="empty">Tudo em dia por aqui.</div>'}</div></div>`;
}
// coloca a lista ao lado do sino aberto (à direita; se faltar espaço, à esquerda) e dentro do desenho
function placeOfficePop() {
  const wrap = document.querySelector('.office-wrap');
  if (!wrap || !officeOpen) return;
  const bell = wrap.querySelector(`.notif[data-ofc="${officeOpen}"]`);
  wrap.insertAdjacentHTML('beforeend', officePopHTML());
  const pop = wrap.querySelector('.ofpop'); if (!pop) return;
  const w = wrap.getBoundingClientRect(), b = bell ? bell.getBoundingClientRect() : { left: w.left + w.width / 2, right: w.left + w.width / 2, top: w.top + 40, height: 0 };
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let left = b.right - w.left + 10; if (left + pw > w.width - 8) left = b.left - w.left - pw - 10;
  let top = b.top - w.top - 8; top = Math.max(8, Math.min(top, w.height - ph - 8));
  pop.style.left = Math.max(8, left) + 'px'; pop.style.top = top + 'px';
}
// o escritório é só para visualizar: tira dos cartões qualquer link que jogue para outra tela
const semLink = h => h.replace(/ data-(view|room|owner)="[^"]*"/g, '').replace(/ tabindex="0" role="button"/g, '').replace(/ · clique para abrir a sala/g, '').replace('Clique para ver os alertas', 'Cérebro da SI').replace(/class="rcard /g, 'class="rcard nolink ');
function renderEscritorio() {
  const ags = AGENTS.map(agentInfo);
  const cnt = k => ags.filter(a => a.k === k).length;
  const agentsPend = ags.filter(a => a.key !== 'gerente').reduce((s, a) => s + a.pend, 0);
  const comAgente = new Set(ags.flatMap(a => a.rooms));
  const semAgente = ROOMS.filter(r => !comAgente.has(r));
  const summary = `<div class="hud h3">
      <div class="hud-item work"><b>${cnt('work')}</b><span>Agentes trabalhando</span></div>
      <div class="hud-item free"><b>${cnt('free')}</b><span>Agentes livres</span></div>
      <div class="hud-item ${agentsPend ? 'late' : 'ok'}"><b>${agentsPend}</b><span>Pendências nos agentes</span></div></div>`;
  return `
  <div class="page-head">
    <h1 class="title">ESCRITÓRIO <b>DA SI</b></h1>
    <button class="btn primary" data-act="new">+ Nova demanda</button>
  </div>
  ${summary}
  ${sceneHTML(ags)}
  <div class="legend big">
    <span class="rstate work"><i></i>TRABALHANDO = digitando, tela acesa</span>
    <span class="rstate free"><i></i>LIVRE = tomando café</span>
    <span class="rchip warn">🔔 3 = tem pendência</span><span class="rchip late">🔔 vermelho = tem atrasada</span>
  </div>
  <p class="note">Aqui você só visualiza. Clique no sino de um agente para ver as pendências dele ao lado (clique de novo para fechar) e use "Ir resolver" para ir até quem resolve. Cadeira vazia = sala ainda sem agente. <span class="sm-only">No celular, arraste o escritório para o lado.</span></p>
  <div class="section-title">Detalhes <b>dos agentes</b></div>
  <div class="rgrid agents">${semLink(ags.map(agentCardHTML).join(''))}</div>
  <details class="roomsfold"><summary>Salas ainda sem agente (${semAgente.length}) e vagas futuras</summary>
    <div class="rgrid smalls">${semLink(semAgente.map(emptyRoomHTML).join(''))}${VAGAS.map(([, name]) => `<div class="rcard small vaga"><div class="rhead"><b>👤 ${esc(name.replace('VAGA · ', ''))}</b><small>Vaga futura</small></div><div class="vagabox">a contratar</div></div>`).join('')}</div>
  </details>`;
}

document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('rcard')) { e.preventDefault(); e.target.click(); }
});
