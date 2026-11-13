/* Sala individual de cada agente (menu "Agentes"): status, pendências e botões para trabalhar.
   O botão grande abre a FERRAMENTA do agente (painel, gerador de carrosséis, editor de vídeos) neste computador, pelo ajudante local
   (si-ponte/launcher.mjs). Pastas e arquivos não são configurados por aqui. */

const SALA = {
  conteudo: { app: '🖼️ Abrir o gerador de carrosséis', aviso: 'O gerador abre só neste computador, com o ajudante local ligado.' },
  video: { app: '🎬 Abrir o CapCut' },
  dashboard: { app: '📊 Abrir o painel', url: 'http://localhost:3000' },
  metaads: { app: '🎯 Ainda sem ferramenta ligada', aviso: 'Este agente ainda não tem ferramenta própria. Quando tiver, ela abre por aqui.' },
  crm: { app: '💬 Abrir o CRM', url: 'http://localhost:3333' }
};
const LAUNCHER_URL = 'http://127.0.0.1:3777';

async function chamarAjudante(alvo, acao) {
  try {
    const r = await fetch(`${LAUNCHER_URL}/abrir?alvo=${alvo}&acao=${acao}`, { headers: { 'X-SI': '1' }, signal: AbortSignal.timeout(20000) });
    return (await r.json()).ok === true;
  } catch { return false; }
}
async function copiar(texto) { try { await navigator.clipboard.writeText(texto); return true; } catch { return false; } }

function salaItens(a) {
  const dem = state.demands.filter(d => isOpen(d) && a.rooms.includes(d.room)).sort(byDue);
  const posts = state.posts.filter(p => a.postTypes.includes(p.type) && ['todo', 'doing', 'approval'].includes(p.status)).sort((x, y) => x.deliveryDate.localeCompare(y.deliveryDate));
  const contas = a.key === 'dashboard' ? state.ads.filter(x => x.fundsLevel === 'urgente' || x.fundsLevel === 'baixo') : [];
  return { dem, posts, contas };
}
function pedidoParaAgente(a) {
  const { dem, posts, contas } = salaItens(a);
  const nome = id => state.clients.find(c => c.id === id)?.name || 'Sem cliente';
  const linhas = [
    ...dem.map(d => `- [prazo ${fmtDate(d.due)}] ${nome(d.clientId)}: ${d.desc}`),
    ...posts.map(p => `- [entrega ${fmtDate(p.deliveryDate)}, publica ${fmtDate(p.publishDate)}] ${nome(p.clientId)}: ${POST_TYPES[p.type].label} · ${p.title}`),
    ...contas.map(c => `- ${c.company}: saldo ${c.fundsLevel === 'urgente' ? 'urgente' : 'baixo'} (${money(c.funds || 0)})`)
  ];
  return `Olá! Sou o gerente da SI. Estas são as suas pendências agora (Agente ${a.num} · ${a.title}):\n${linhas.join('\n') || '- (nenhuma pendência no momento)'}\n\nComece pela mais urgente e me mostre a prévia antes de entregar.`;
}

function renderSala(key) {
  const a = AGENTS.map(agentInfo).find(x => x.key === key);
  if (!a || key === 'gerente') return '<div class="card empty">Sala não encontrada.</div>';
  const t = SALA[key] || {}, { dem, posts, contas } = salaItens(a);
  const principal = `<button class="btn primary" data-sala="app" data-key="${key}">${t.app}</button>`;
  return `<div class="page-head"><h1 class="title">AGENTE ${a.num} · <b>${a.title.toUpperCase()}</b></h1>${principal}</div>
  <div class="sala-top">
    ${agentCardHTML(a)}
    <div class="card sala-tools">
      <div class="section-title" style="margin-top:0">Ferramentas da <b>sala</b></div>
      <button class="btn" data-sala="pedido" data-key="${key}">📋 Copiar o pedido pronto para o agente</button>
      <p class="muted small-note">A ferramenta abre neste computador. No celular, use "Copiar o pedido" e cole na conversa do agente.</p>
    </div>
  </div>
  <div class="section-title">Pendências <b>desta área</b> (${dem.length + posts.length + contas.length})</div>
  <div class="list">${dem.map(itemHTML).join('')}${posts.map(postItemHTML).join('')}
    ${contas.map(c => `<div class="alert ${c.fundsLevel === 'urgente' ? 'late' : 'today'}" data-view="painel" tabindex="0" role="button"><span class="aico">📣</span><div class="abody"><b>${esc(c.company)}: saldo ${c.fundsLevel === 'urgente' ? 'urgente' : 'baixo'} (${money(c.funds || 0)})</b><small>abastecer no Gerenciador da Meta</small></div><span class="asev ${c.fundsLevel === 'urgente' ? 'late' : 'today'}">${c.fundsLevel === 'urgente' ? 'Urgente' : 'Baixo'}</span></div>`).join('')}
    ${dem.length + posts.length + contas.length ? '' : '<div class="card empty">Nenhuma pendência nesta área. 🎉</div>'}</div>`;
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-sala]'); if (!b) return;
  const key = b.dataset.key, t = SALA[key] || {}, a = AGENTS.map(agentInfo).find(x => x.key === key);
  if (b.dataset.sala === 'pedido') return toast(await copiar(pedidoParaAgente(a)) ? 'Pedido copiado. Cole na conversa do agente.' : 'Não consegui copiar automaticamente.', 3500);
  toast('Abrindo… (se a ferramenta estiver desligada, ela é ligada antes)', 4000);
  if (await chamarAjudante(key, 'app')) return;
  // ajudante desligado ou fora deste computador
  if (t.url) { window.open(t.url, '_blank', 'noopener'); return; }
  toast(t.aviso || 'Não consegui abrir: o ajudante local não está ligado.', 6000);
});
