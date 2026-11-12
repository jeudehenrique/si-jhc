/* Crescimento e marketing, organizado em um método simples:
   APRENDER (caixa de conhecimento) -> IDEIA -> ESTRATÉGIA (com meta, rotina, investimento e resultado) -> MEDIR E DECIDIR.
   Abas: Visão geral (previsão em tempo real, método, estratégias em andamento, próximos passos),
         Estratégias (onde se monta cada uma), Ideias, Conhecimento e Meta e conta.
   Valores de caixa ficam no Financeiro. Dados na tabela settings (chave "crescimento"; fotos mensais "funil-AAAA-MM").
   Usa state, persist, uid, esc, fmtNum, money, todayStr, askConfirm e state.crm. */

const CR_ABAS = [['visao', 'Visão geral'], ['estrategias', 'Estratégias'], ['ideias', 'Ideias'], ['conhecimento', 'Conhecimento'], ['meta', 'Meta e conta']];
const CR_STATUS_EST = [['planejada', 'Planejada'], ['ativa', 'Ativa'], ['pausada', 'Pausada'], ['encerrada', 'Encerrada']];
const CR_DECISAO = [['teste', 'Em teste'], ['manter', 'Manter'], ['ajustar', 'Ajustar'], ['encerrar', 'Encerrar']];
const CR_STATUS_ESTR = [['pedir', 'Pedir'], ['testar', 'Testar'], ['ativo', 'Ativo'], ['descartado', 'Descartado']];
const CR_STATUS_IDEIA = [['proposta', 'Proposta'], ['aceita', 'Aceita'], ['andamento', 'Em andamento'], ['feita', 'Feita'], ['descartada', 'Descartada']];
const CR_FREQ = ['Pontual', 'Diária', 'Semanal', 'A cada 15 dias', 'Mensal'];
const CR_CANAIS_EST = ['WhatsApp', 'Instagram', 'Meta Ads', 'Google Ads', 'E-mail', 'LinkedIn', 'Conteúdo', 'Indicação', 'IA e novidades', 'Outro'];
const CR_TIPOS_CONHEC = ['Link', 'Canal do YouTube', 'Perfil do Instagram', 'PDF ou documento', 'Nota ou dica'];
const CR_TEMAS = ['Marketing para agências', 'E-mail marketing', 'Meta Ads e Google Ads', 'IA e novas ferramentas', 'Prospecção por WhatsApp', 'LinkedIn e conteúdo'];
const CR_BASE = 100;   // suposição de planejamento (1 cliente a cada 100 contatos), usada só na conta da meta e só até o primeiro fechamento

const CR_MODELOS = {
  branco: { nome: 'Nova estratégia', canal: 'Outro', objetivo: '', passos: '', freq: 'Semanal' },
  whatsapp: { nome: 'Prospecção por WhatsApp', canal: 'WhatsApp', auto: 'whatsapp', freq: 'Diária',
    objetivo: '15 contatos por dia útil, no máximo 15 por hora',
    passos: '1) Cadastrar cada empresa no CRM.\n2) Primeira mensagem curta, com o seu nome e o motivo do contato.\n3) Quem responder recebe o material (PDF).\n4) Follow-up em horário fixo.\n5) Marcar como "Novo cliente fechado" quando fechar.' },
  instagram: { nome: 'Instagram: página + mensagem para novos seguidores', canal: 'Instagram', freq: 'Semanal',
    objetivo: '3 posts por semana e 10 conversas novas por semana',
    passos: '1) Publicar conteúdo útil para o seu nicho, 3 vezes por semana.\n2) Para cada novo seguidor do nicho, enviar uma mensagem curta e útil, sem vender de cara.\n3) Quem responder vai para o CRM.\n4) As mensagens são manuais: robô de mensagem viola as regras do Instagram.' },
  trafego: { nome: 'Tráfego pago de captação', canal: 'Meta Ads', freq: 'Mensal',
    objetivo: 'Investir um valor fixo por mês e medir o custo por cliente',
    passos: '1) Definir a verba mensal.\n2) Campanha com oferta de diagnóstico gratuito, levando o contato para o WhatsApp.\n3) Dois criativos novos por semana.\n4) Registrar os contatos e os clientes que vieram do anúncio.\n5) Decidir pelo custo por cliente.' },
  email: { nome: 'E-mail para empresas novas', canal: 'E-mail', freq: 'A cada 15 dias',
    objetivo: '1.000 a 3.000 e-mails novos por mês, em levas a cada 15 dias',
    passos: '1) Lista segmentada do seu nicho (sem lista comprada).\n2) Domínio aquecido aos poucos, com SPF, DKIM e DMARC.\n3) Sequência de 4 e-mails em 15 dias: conteúdo útil, caso de cliente, proposta e encerramento.\n4) Link de descadastro em todos.\n5) Registrar enviados e clientes.' },
  conteudo: { nome: 'Conteúdo e prova social', canal: 'Conteúdo', freq: 'A cada 15 dias',
    objetivo: '1 caso de cliente novo por quinzena',
    passos: '1) Escolher um cliente com resultado.\n2) Montar o antes e depois com números.\n3) Publicar nas redes da JH.\n4) Usar o caso nas conversas de venda.' },
  indicacao: { nome: 'Indicação de clientes', canal: 'Indicação', freq: 'Pontual',
    objetivo: '1 indicação fechada por trimestre',
    passos: '1) Pedir indicação aos clientes satisfeitos.\n2) Oferecer desconto na mensalidade para quem indicar alguém que feche.\n3) Cadastrar a indicação no CRM.' }
};
const CR_DEFAULT = {
  metaAnual: 60000, ticketEntrada: 497,
  estrategias: [
    { id: 's1', ...CR_MODELOS.whatsapp, invest: 0, inicio: '', status: 'ativa', origem: '', contatos: 0, clientes: 0, decisao: 'teste', nota: '' },
    { id: 's2', ...CR_MODELOS.instagram, invest: 0, inicio: '', status: 'planejada', origem: '', contatos: 0, clientes: 0, decisao: 'teste', nota: '' },
    { id: 's3', ...CR_MODELOS.trafego, invest: 0, inicio: '', status: 'planejada', origem: '', contatos: 0, clientes: 0, decisao: 'teste', nota: '' },
    { id: 's4', ...CR_MODELOS.email, invest: 0, inicio: '', status: 'planejada', origem: '', contatos: 0, clientes: 0, decisao: 'teste', nota: '' }
  ],
  estrutura: [
    { id: 'e1', nome: 'Ferramenta de e-mail marketing (envio e automação)', custo: '', status: 'pedir', nota: 'sugestão do Gerente' },
    { id: 'e2', nome: 'API oficial do WhatsApp (CRM no número de negócio)', custo: '', status: 'pedir', nota: 'sugestão do Gerente' },
    { id: 'e3', nome: 'Reenviar o pedido de permissão da Meta (gestão de anúncios)', custo: '', status: 'pedir', nota: 'sugestão do Gerente' },
    { id: 'e4', nome: 'Verba própria de anúncios para captar clientes para a JH', custo: '', status: 'pedir', nota: 'definir valor' }
  ],
  ideias: [
    { id: 'i1', canal: 'WhatsApp', texto: 'Dobrar a prospecção para dobrar os fechamentos.', meta: '30 contatos por dia útil, em 3 blocos, no máximo 15 por hora', freq: 'Diária', fonte: 'Sugestão do Gerente', status: 'proposta' },
    { id: 'i2', canal: 'E-mail', texto: 'Disparar e-mails novos para empresas do seu nicho. Precisa de domínio próprio aquecido aos poucos, lista segmentada, link de descadastro e cuidado com a LGPD.', meta: '1.000 a 3.000 e-mails novos por mês, em levas de 500 a 1.500', freq: 'A cada 15 dias', fonte: 'Sugestão do Gerente', status: 'proposta' },
    { id: 'i3', canal: 'Conteúdo', texto: 'Publicar o resultado dos clientes ativos (antes e depois, números dos anúncios) como prova social nas redes da JH.', meta: '1 caso novo por quinzena', freq: 'A cada 15 dias', fonte: 'Sugestão do Gerente', status: 'proposta' },
    { id: 'i4', canal: 'WhatsApp', texto: 'Contato de renovação 30 dias antes do fim de cada contrato (a maioria sai por fim de contrato, não por insatisfação).', meta: '100% dos contratos com conversa de renovação antes do fim', freq: 'Mensal', fonte: 'Sugestão do Gerente', status: 'proposta' },
    { id: 'i5', canal: 'Meta Ads', texto: 'Campanha de captação da própria JH para o seu nicho, com oferta de diagnóstico gratuito.', meta: 'definir verba e número de pedidos de diagnóstico por mês', freq: 'Mensal', fonte: 'Sugestão do Gerente', status: 'proposta' },
    { id: 'i6', canal: 'Indicação', texto: 'Programa de indicação: desconto na mensalidade para o cliente que indicar alguém que feche.', meta: '1 indicação fechada por trimestre', freq: 'Pontual', fonte: 'Sugestão do Gerente', status: 'proposta' }
  ],
  conhecimento: { temas: CR_TEMAS, itens: [], aprendizados: [] }
};
let crTab = 'visao', crAberta = null, crNova = false;

const crRow = key => (state.settings || []).find(s => s.key === key);
function crCfg() {
  const d = crRow('crescimento')?.data || {}, c = d.conhecimento || {};
  return { ...CR_DEFAULT, ...d,
    estrategias: Array.isArray(d.estrategias) ? d.estrategias : CR_DEFAULT.estrategias,
    estrutura: Array.isArray(d.estrutura) ? d.estrutura : CR_DEFAULT.estrutura,
    ideias: Array.isArray(d.ideias) ? d.ideias.map(i => ({ ...i, status: i.status === 'nova' ? 'proposta' : i.status })) : CR_DEFAULT.ideias,
    conhecimento: { temas: Array.isArray(c.temas) ? c.temas : CR_TEMAS, itens: c.itens || [], aprendizados: c.aprendizados || [] } };
}
function crSave(cfg) {
  let r = crRow('crescimento');
  if (!r) { r = { id: uid(), key: 'crescimento', data: cfg }; state.settings.push(r); } else r.data = cfg;
  persist(); render();
}
const crLink = u => /^https?:\/\//i.test(u || '') ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 60))}</a>` : esc(u || '');

/* ---------- conversão automática: cadastros total ÷ clientes fechados (sem número editável) ---------- */
const crOk = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const crFotos = () => (state.settings || []).filter(s => /^funil-\d{4}-\d{2}$/.test(s.key));
function crFunilWhats() {
  const crm = state.crm?.find(x => x.id === 'prospeccao')?.dados || null, fotos = crFotos();
  const somaC = fotos.reduce((a, s) => a + (Number(s.data.contatos) || 0), 0), somaF = fotos.reduce((a, s) => a + (Number(s.data.fechados) || 0), 0);
  const doCrm = crm && crOk(crm.total_cadastradas) && crOk(crm.clientes_fechados);
  const total = doCrm ? Number(crm.total_cadastradas) : somaC, clientes = doCrm ? Number(crm.clientes_fechados) : somaF;
  const foto = fotos.find(s => s.key === 'funil-' + todayStr().slice(0, 7))?.data;
  return { total, clientes, porCliente: clientes > 0 ? total / clientes : null, plano: clientes > 0 ? total / clientes : CR_BASE, real: clientes > 0,
    fechadosMes: crm && crOk(crm.fechamentos_mes) ? Number(crm.fechamentos_mes) : Number(foto?.fechados) || 0,
    origem: doCrm ? 'do CRM' : 'acumulado desde que o SI começou a acompanhar' };
}
// guarda, sozinho, uma foto do mês com contatos, fechamentos e gasto em anúncios; o acumulado cresce sem ninguém digitar
function crSnapshotFunil() {
  if (!state.settings) return;
  const crm = state.crm?.find(x => x.id === 'prospeccao')?.dados; if (!crm) return;
  const jh = (state.ads || []).find(a => /JH COMPANY/i.test(a.company)), gasto = jh && crOk(jh.spendMonth) ? Number(jh.spendMonth) : 0;
  const novo = { contatos: Number(crm.mes) || 0, fechados: Number(crm.fechamentos_mes) || 0, gasto };
  const key = 'funil-' + todayStr().slice(0, 7);
  let r = state.settings.find(s => s.key === key);
  if (!r) { if (!novo.contatos && !novo.fechados && !novo.gasto) return; state.settings.push({ id: uid(), key, data: novo }); return persist(); }
  const m = { contatos: Math.max(novo.contatos, Number(r.data.contatos) || 0), fechados: Math.max(novo.fechados, Number(r.data.fechados) || 0), gasto: Math.max(novo.gasto, Number(r.data.gasto) || 0) };
  if (m.contatos !== r.data.contatos || m.fechados !== r.data.fechados || m.gasto !== r.data.gasto) { r.data = m; persist(); }
}
// A mensalidade cresce em linha reta nos próximos 12 meses até a receita do ano fechar a meta:
// soma de (M0 + k·d), k de 1 a 12 = 12·M0 + 78·d. d é o quanto a mensalidade total precisa crescer por mês.
function crCalc(metaAnual, mrr, ticket, taxa) {
  const d = Math.max(0, (metaAnual - 12 * mrr) / 78), crescer = 12 * d;
  const novos = ticket ? Math.ceil(crescer / ticket) : 0, porMesCli = ticket ? d / ticket : 0;
  const contatos = novos && taxa ? Math.ceil(novos / (taxa / 100)) : 0;
  return { d, mrrFinal: mrr + crescer, gap: crescer, novos, porMesCli, contatos, porMes: Math.ceil(contatos / 12) };
}
const crMesNome = ym => ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(ym.slice(5)) - 1] + '/' + ym.slice(2, 4);
const crSomaMes = (ym, n) => { const [a, m] = ym.split('-').map(Number), t = a * 12 + (m - 1) + n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; };
const crFmtData = s => s.split('-').reverse().join('/');
function crSomaMesesData(data, n) { const [a, m, d] = data.split('-').map(Number), t = new Date(a, m - 1 + n, d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; }
// a meta, depois de fixada, só pode ser mudada 3 meses depois
function crMetaTrava(cfg) {
  if (!cfg.metaFixadaEm) return { fixada: false, travada: false };
  const libera = cfg.metaLiberaEm || crSomaMesesData(cfg.metaFixadaEm, 3);
  return { fixada: true, travada: todayStr() < libera, libera };
}
// tudo que a tela usa, recalculado a cada desenho: por isso a previsão acompanha clientes, mensalidades e fechamentos em tempo real
function crContexto(cfg) {
  const pagantes = state.clients.filter(c => Number(c.fee) > 0);
  const mrr = pagantes.reduce((s, c) => s + Number(c.fee), 0), ticket = pagantes.length ? mrr / pagantes.length : 0;
  const wf = crFunilWhats(), taxa = 100 / wf.plano;
  const calc = crCalc(cfg.metaAnual, mrr, ticket, taxa), calcE = crCalc(cfg.metaAnual, mrr, Number(cfg.ticketEntrada) || 0, taxa);
  const previsao = mrr * 12, falta = Math.max(0, cfg.metaAnual - previsao);
  return { pagantes, mrr, ticket, wf, taxa, calc, calcE, previsao, falta, porMesNec: calcE.porMesCli, trava: crMetaTrava(cfg) };
}
function crEstInfo(e, wf) {
  const auto = e.auto === 'whatsapp', contatos = auto ? wf.total : Number(e.contatos) || 0, clientes = auto ? wf.clientes : Number(e.clientes) || 0;
  const meses = e.inicio ? Math.max(0, (Date.now() - new Date(e.inicio + 'T12:00:00').getTime()) / (30.44 * 864e5)) : 0, investido = (Number(e.invest) || 0) * meses;
  return { auto, contatos, clientes, investido, porCliente: clientes ? Math.round(contatos / clientes) : null, custo: clientes && investido ? investido / clientes : null };
}
const crResultado = i => i.clientes ? `${fmtNum(i.clientes)} cliente${i.clientes > 1 ? 's' : ''} · a cada ${fmtNum(i.porCliente)} contatos, 1 cliente` : `${fmtNum(i.contatos)} contato${i.contatos === 1 ? '' : 's'}, ainda sem cliente`;
const crOpt = (lista, atual) => lista.map(x => Array.isArray(x) ? `<option value="${x[0]}" ${atual === x[0] ? 'selected' : ''}>${x[1]}</option>` : `<option ${atual === x ? 'selected' : ''}>${x}</option>`).join('');

/* ---------- VISÃO GERAL ---------- */
function crVisaoHTML(cfg, x) {
  const n1 = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const ritmoOk = x.wf.fechadosMes >= x.porMesNec;
  const ativas = cfg.estrategias.filter(e => e.status === 'ativa');
  const pend = cfg.conhecimento.itens.filter(i => i.status !== 'analisado').length;
  const posic = ['publico', 'promessa', 'diferencial', 'oferta', 'provas'].filter(k => String((cfg.posicionamento || {})[k] || '').trim()).length;
  const prox = [];
  cfg.ideias.filter(i => i.status === 'aceita' && !i.estrategiaId).forEach(i => prox.push({ t: `Montar a estratégia da ideia: ${i.texto.slice(0, 90)}`, go: 'ideias' }));
  cfg.estrategias.filter(e => e.status === 'planejada').slice(0, 3).forEach(e => prox.push({ t: `Colocar em prática: ${e.nome}`, go: 'estrategias', abrir: e.id }));
  if (pend) prox.push({ t: `Analisar ${pend} item${pend > 1 ? 's' : ''} da caixa de conhecimento`, go: 'conhecimento' });
  if (posic < 5) prox.push({ t: `Preencher o posicionamento (${posic} de 5 campos)`, go: 'meta' });
  cfg.estrutura.filter(e => e.status === 'pedir').slice(0, 2).forEach(e => prox.push({ t: `Resolver: ${e.nome}`, go: 'meta' }));
  const passo = (n, t, v, sub, go) => `<div class="crc-passo"><span class="crc-n">${n}</span><b>${t}</b><div class="crc-v">${v}</div><small>${sub}</small><button class="btn small ghost" data-cr-tab="${go}">Abrir</button></div>`;
  const est = ativas.map(e => { const i = crEstInfo(e, x.wf); return `<div class="crc-linha"><div><b>${esc(e.nome)}</b><small>${esc(e.canal)} · ${esc(e.objetivo || 'sem meta definida')}</small></div><span>${crResultado(i)}</span><span>${e.invest ? money(e.invest) + '/mês' : '—'}</span><button class="btn small ghost" data-cr-abrir="${e.id}">Abrir</button></div>`; }).join('');
  const t = x.trava, metaSub = t.fixada ? `fixada · só pode mudar a partir de ${crFmtData(t.libera)}` : 'ainda não fixada: fixe em Meta e conta';
  return `<div class="section-title">Previsão <b>em tempo real</b></div>
  <div class="card crc-prev">
    <div class="crc-prev-grid">
      <div><span>Se nada mudar, nos próximos 12 meses</span><b>${money(x.previsao)}</b><small>mensalidades de hoje (${money(x.mrr)}) × 12</small></div>
      <div><span>Meta do ano${t.fixada ? ' (fixada)' : ''}</span><b>${money(cfg.metaAnual)}</b><small>${metaSub}</small></div>
      <div><span>Falta para a meta</span><b class="${x.falta ? 'neg' : 'pos'}">${money(x.falta)}</b><small>${x.falta ? 'por ano' : 'meta já coberta pelas mensalidades de hoje'}</small></div>
      <div><span>Crescer por mês</span><b>${money(x.calcE.d)}</b><small>de mensalidade nova a cada mês, durante 12 meses</small></div>
      <div><span>Clientes novos que faltam</span><b>${fmtNum(x.calcE.novos)}</b><small>no plano de entrada (${money(cfg.ticketEntrada)}) · ${fmtNum(x.calc.novos)} se o ticket for o médio de hoje (${money(x.ticket)})</small></div>
      <div><span>Clientes novos por mês</span><b>${n1(x.calcE.porMesCli)}</b><small>até completar os 12 meses (veja o mês a mês em Meta e conta)</small></div>
    </div>
    <div class="crc-ritmo ${ritmoOk ? 'ok' : 'atras'}"><b>${ritmoOk ? 'No ritmo' : 'Abaixo do ritmo'}</b><span>Este mês: ${fmtNum(x.wf.fechadosMes)} cliente${x.wf.fechadosMes === 1 ? '' : 's'} novo${x.wf.fechadosMes === 1 ? '' : 's'} fechado${x.wf.fechadosMes === 1 ? '' : 's'}. Para a meta, são necessários ${n1(x.porMesNec)} por mês.</span></div>
    <small class="muted">Este bloco se recalcula sozinho quando entra cliente, muda uma mensalidade ou fecha um novo cliente. Quem sai por fim de contrato precisa ser reposto a mais.</small>
  </div>

  <div class="section-title">O <b>método</b></div>
  <div class="crc-metodo">
    ${passo(1, 'Aprender', fmtNum(cfg.conhecimento.itens.length + cfg.conhecimento.aprendizados.length), 'itens na caixa de conhecimento', 'conhecimento')}
    ${passo(2, 'Ideias', fmtNum(cfg.ideias.filter(i => i.status !== 'descartada').length), `${cfg.ideias.filter(i => i.status === 'aceita').length} aceitas`, 'ideias')}
    ${passo(3, 'Estratégias', fmtNum(ativas.length), `ativas · ${cfg.estrategias.filter(e => e.status === 'planejada').length} planejadas`, 'estrategias')}
    ${passo(4, 'Resultado', fmtNum(cfg.estrategias.reduce((s, e) => s + crEstInfo(e, x.wf).clientes, 0)), 'clientes vindos das estratégias', 'estrategias')}
  </div>

  <div class="section-title">Estratégias <b>em andamento</b></div>
  <div class="card crc-lista">${est || '<p class="muted">Nenhuma estratégia ativa. Abra a aba Estratégias e coloque uma em prática.</p>'}</div>

  <div class="section-title">Próximos <b>passos</b></div>
  <div class="card crc-lista">${prox.slice(0, 7).map(p => `<div class="crc-linha"><b>${esc(p.t)}</b><span></span><span></span><button class="btn small" ${p.abrir ? `data-cr-abrir="${p.abrir}"` : `data-cr-tab="${p.go}"`}>Ir</button></div>`).join('') || '<p class="muted">Tudo em dia por aqui.</p>'}</div>

  <div class="section-title">Conversão <b>do WhatsApp</b></div>
  ${crWhatsHTML(x.wf)}`;
}
function crWhatsHTML(wf) {
  const linha = (t, v) => `<div><span>${t}</span><b>${v}</b></div>`;
  return `<div class="card crc-conta"><div class="crc-linhas">${linha('Cadastros total (CRM)', fmtNum(wf.total))}${linha('Clientes fechados', fmtNum(wf.clientes))}${linha('Contatos por cliente', wf.real ? fmtNum(Math.round(wf.porCliente)) : '—')}</div>
    <p class="crc-frase">${wf.real ? `Fizemos ${fmtNum(wf.total)} contatos para fechar ${fmtNum(wf.clientes)} cliente${wf.clientes > 1 ? 's' : ''}. <b>A cada ${fmtNum(Math.round(wf.porCliente))} contatos, fechamos 1 cliente.</b>` : `Foram feitos <b>${fmtNum(wf.total)} contatos</b> e ainda não temos nenhum cliente fechado. Por isso a métrica ainda não existe.`}</p>
    <small class="muted">${wf.real ? `Para fechar mais 1 cliente, a previsão é fazer mais ${fmtNum(Math.round(wf.porCliente))} contatos. ` : 'Assim que o primeiro cliente fechar, a conta passa a ser cadastros total ÷ clientes fechados. '}Nenhum número aqui é editável: muda sozinho a cada fechamento (${wf.origem}).</small></div>`;
}

/* ---------- ESTRATÉGIAS: onde cada estratégia é montada, acompanhada e decidida ---------- */
function crEstrategiasHTML(cfg, x) {
  const modelos = [['branco', 'Em branco'], ['whatsapp', 'Prospecção por WhatsApp'], ['instagram', 'Instagram + mensagem'], ['trafego', 'Tráfego pago'], ['email', 'E-mail frio'], ['conteudo', 'Conteúdo e prova social'], ['indicacao', 'Indicação']];
  const card = e => {
    const i = crEstInfo(e, x.wf), ideia = e.origem ? cfg.ideias.find(d => d.id === e.origem) : null, aberta = crAberta === e.id;
    const f = (campo, tipo = 'text') => `data-cr-est="${e.id}|${campo}"`;
    return `<details class="card crc-est ${e.status}" ${aberta ? 'open' : ''}>
      <summary><span class="crc-est-nome">${esc(e.nome)}</span><span class="crc-tags"><span>${esc(e.canal)}</span><span class="st-${e.status}">${(CR_STATUS_EST.find(s => s[0] === e.status) || [])[1]}</span></span>
        <span class="crc-est-res">${crResultado(i)}${e.invest ? ` · ${money(e.invest)}/mês` : ''}</span></summary>
      <div class="crc-est-corpo">
        ${ideia ? `<small class="muted">Veio da ideia: ${esc(ideia.texto.slice(0, 120))}</small>` : ''}
        <div class="crc-est-grid">
          <label><span>Nome</span><input ${f('nome')} value="${esc(e.nome)}"></label>
          <label><span>Canal</span><select ${f('canal')}>${crOpt(CR_CANAIS_EST, e.canal)}</select></label>
          <label><span>Status</span><select ${f('status')}>${crOpt(CR_STATUS_EST, e.status)}</select></label>
          <label><span>Meta (com número)</span><input ${f('objetivo')} value="${esc(e.objetivo || '')}" placeholder="Ex.: 10 conversas novas por semana"></label>
          <label><span>Rotina</span><select ${f('freq')}>${crOpt(CR_FREQ, e.freq)}</select></label>
          <label><span>Investimento por mês (R$)</span><input type="number" min="0" step="any" ${f('invest')} value="${e.invest || ''}" placeholder="0"></label>
          <label><span>Início</span><input type="date" ${f('inicio')} value="${esc(e.inicio || '')}"></label>
          <label><span>Decisão</span><select ${f('decisao')}>${crOpt(CR_DECISAO, e.decisao)}</select></label>
        </div>
        <label class="crc-full"><span>Como funciona (passo a passo)</span><textarea rows="5" ${f('passos')}>${esc(e.passos || '')}</textarea></label>
        <div class="crc-est-res2">
          <div><span>Contatos</span><b>${fmtNum(i.contatos)}</b>${i.auto ? '<small>automático pelo CRM</small>' : `<span class="crc-btns"><button class="btn small" data-cr-log="${e.id}|contatos|1">+1</button><button class="btn small" data-cr-log="${e.id}|contatos|10">+10</button><button class="btn small ghost" data-cr-log="${e.id}|contatos|-1">−1</button></span>`}</div>
          <div><span>Clientes fechados</span><b>${fmtNum(i.clientes)}</b>${i.auto ? '<small>automático pelo CRM</small>' : `<span class="crc-btns"><button class="btn small" data-cr-log="${e.id}|clientes|1">+1</button><button class="btn small ghost" data-cr-log="${e.id}|clientes|-1">−1</button></span>`}</div>
          <div><span>Contatos por cliente</span><b>${i.porCliente ? fmtNum(i.porCliente) : '—'}</b><small>${i.porCliente ? 'contatos ÷ clientes' : 'aparece no 1º cliente'}</small></div>
          <div><span>Investido até hoje</span><b>${i.investido ? money(i.investido) : '—'}</b><small>${e.inicio ? 'desde o início' : 'defina o início'}</small></div>
          <div><span>Custo por cliente</span><b>${i.custo ? money(i.custo) : '—'}</b><small>${i.custo ? 'investido ÷ clientes' : 'aparece no 1º cliente'}</small></div>
        </div>
        <label class="crc-full"><span>Anotações e o que aprendemos</span><textarea rows="2" ${f('nota')}>${esc(e.nota || '')}</textarea></label>
        <div class="crc-est-fim"><button class="btn small ghost" data-cr-est-del="${e.id}">Remover estratégia</button></div>
      </div></details>`;
  };
  const grupo = (st, t) => { const l = cfg.estrategias.filter(e => e.status === st); return l.length ? `<div class="crc-sub">${t} (${l.length})</div>${l.map(card).join('')}` : ''; };
  return `<div class="section-title">Estratégias <b>de crescimento</b></div>
  <p class="muted" style="margin-top:0">Aqui se monta cada estratégia: o que fazer, a meta em número, a rotina, quanto investir e o resultado. Todo número é calculado, sem estimativa.</p>
  <div class="card crc-lista"><b>Nova estratégia</b>
    <div class="crc-modelos">${modelos.map(([k, t]) => `<button class="btn small ${k === 'branco' ? 'ghost' : ''}" data-cr-est-novo="${k}">+ ${t}</button>`).join('')}</div>
    <small class="muted">Escolha um modelo para já vir com o passo a passo, ou comece em branco.</small></div>
  ${grupo('ativa', 'Ativas')}${grupo('planejada', 'Planejadas')}${grupo('pausada', 'Pausadas')}${grupo('encerrada', 'Encerradas')}
  ${cfg.estrategias.length ? '' : '<div class="card"><p class="muted">Nenhuma estratégia ainda.</p></div>'}`;
}

/* ---------- IDEIAS: caixa de entrada. A ideia aceita vira estratégia ---------- */
function crIdeiasHTML(cfg) {
  const ideias = cfg.ideias.map(i => { const est = i.estrategiaId ? cfg.estrategias.find(e => e.id === i.estrategiaId) : null; return `<div class="card crc-ideia2"><div class="crc-ideia2-top"><b>${esc(i.texto)}</b>
      <span><select data-cr-ideia-status="${i.id}">${crOpt(CR_STATUS_IDEIA, i.status)}</select><button class="btn small ghost" data-cr-ideia-del="${i.id}" aria-label="Remover">×</button></span></div>
      <div class="crc-tags"><span>${esc(i.canal)}</span>${i.freq ? `<span>${esc(i.freq)}</span>` : ''}</div>
      ${i.meta ? `<small><b>Meta:</b> ${esc(i.meta)}</small>` : ''}<small class="muted">${esc(i.fonte || 'sem fonte')}</small>
      ${est ? `<div class="crc-virou">Virou a estratégia: <b>${esc(est.nome)}</b> <button class="btn small ghost" data-cr-abrir="${est.id}">Ver</button></div>` : (i.status === 'descartada' ? '' : `<div><button class="btn small primary" data-cr-conv="${i.id}">Virar estratégia</button></div>`)}</div>`; }).join('');
  return `<div class="section-title">Ideias <b>para implementar</b></div>
  <p class="muted" style="margin-top:0">Toda ideia nova entra aqui. Quando fizer sentido testar, clique em <b>Virar estratégia</b>: ela segue para a aba Estratégias, com meta, rotina e resultado, e fica ligada à ideia de origem.</p>
  <div class="crc-ideias">${ideias || '<div class="card"><p class="muted">Nenhuma ideia ainda.</p></div>'}</div>
  <div class="card crc-lista" style="margin-top:12px"><b>Nova ideia</b>
    <div class="crc-add crc-add-ideia"><select id="crIdeiaCanal">${crOpt(CR_CANAIS_EST, 'WhatsApp')}</select><input id="crIdeiaTxt" placeholder="A ideia"><input id="crIdeiaMeta" placeholder="Meta (ex.: 600 contatos por mês)"><select id="crIdeiaFreq">${crOpt(CR_FREQ, 'Semanal')}</select><input id="crIdeiaFonte" placeholder="Fonte (link ou nota)"><button class="btn small primary" data-cr-ideia-add>Adicionar</button></div></div>`;
}

/* ---------- CONHECIMENTO ---------- */
function crConhecimentoHTML(cfg) {
  const k = cfg.conhecimento, pend = k.itens.filter(i => i.status !== 'analisado').length;
  const itens = k.itens.map(i => `<div class="crc-item crc-conh"><div><b>${esc(i.titulo)}</b><small>${esc(i.tipo)} · ${crLink(i.link)} · entregue em ${esc(i.data || '')}</small></div>
      <select data-cr-conh-status="${i.id}"><option value="novo" ${i.status !== 'analisado' ? 'selected' : ''}>Para analisar</option><option value="analisado" ${i.status === 'analisado' ? 'selected' : ''}>Analisado</option></select>
      <button class="btn small ghost" data-cr-conh-del="${i.id}" aria-label="Remover">×</button></div>`).join('');
  const aprend = [...k.aprendizados].reverse().map(a => `<div class="crc-aprend"><b>${esc(a.texto)}</b><small>${esc(a.canal || '')} · ${crLink(a.fonte)} · ${esc(a.data || '')}</small></div>`).join('');
  return `<div class="section-title">Caixa <b>de conhecimento</b></div>
  <div class="card crc-lista"><p class="muted" style="margin:6px 0 12px">Entregue aqui o que achar útil: link, canal do YouTube, perfil do Instagram, PDF, documento ou uma dica sua. O Gerente analisa, registra o que aprendeu e transforma em ideias.</p>
    <div class="crc-add crc-add-conh"><select id="crConhTipo">${crOpt(CR_TIPOS_CONHEC, 'Link')}</select><input id="crConhTitulo" placeholder="O que é? (título ou descrição curta)"><input id="crConhLink" placeholder="Link ou nome do arquivo"><button class="btn small primary" data-cr-conh-add>Entregar</button></div>
    ${itens ? `<div class="crc-sub">${pend} para analisar</div>${itens}` : '<p class="muted" style="margin-top:12px">Nada entregue ainda.</p>'}</div>
  <div class="section-title">Temas <b>que o Gerente vigia</b></div>
  <div class="card"><textarea rows="3" data-cr-temas placeholder="Um tema por linha">${esc(k.temas.join('\n'))}</textarea>
    <small class="muted">Mercado de agências, canais de aquisição e novidades em IA. A pesquisa automática diária depende de você autorizar uma tarefa agendada; sem ela, o Gerente pesquisa quando você pedir.</small></div>
  <div class="section-title">O que o Gerente <b>aprendeu</b></div>
  <div class="card crc-lista">${aprend || '<p class="muted">Ainda sem pesquisas registradas.</p>'}</div>`;
}

/* ---------- META E CONTA ---------- */
function crMetaHTML(cfg, x) {
  const n1 = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), t = x.trava, c = x.calcE, cm = x.calc, porDia = Math.ceil(c.porMes / 21);
  const ym0 = todayStr().slice(0, 7);
  const linhas = Array.from({ length: 12 }, (_, i) => { const k = i + 1, m = x.mrr + k * c.d; return `<div><b>${crMesNome(crSomaMes(ym0, k))}</b><span>${money(m)}</span><span>${fmtNum(c.d && cfg.ticketEntrada ? Math.ceil(k * c.d / cfg.ticketEntrada) : 0)}</span><span>${fmtNum(x.ticket && c.d ? Math.ceil(k * c.d / x.ticket) : 0)}</span></div>`; }).join('');
  const custoTotal = cfg.estrutura.filter(e => e.status !== 'descartado').reduce((s, e) => s + (Number(e.custo) || 0), 0);
  const estr = cfg.estrutura.map(e => `<div class="crc-item"><div><b>${esc(e.nome)}</b><small>${esc(e.nota || '')}</small></div>
      <input class="crc-custo" type="number" min="0" step="any" placeholder="R$/mês" data-cr-estr-custo="${e.id}" value="${e.custo === '' ? '' : e.custo}">
      <select data-cr-estr-status="${e.id}">${crOpt(CR_STATUS_ESTR, e.status)}</select>
      <button class="btn small ghost" data-cr-estr-del="${e.id}" aria-label="Remover">×</button></div>`).join('');
  const bloco = t.fixada
    ? `<div class="crc-meta-fixa"><div><span>Meta do ano (fixada)</span><b>${money(cfg.metaAnual)}</b></div>
        <small class="muted">Fixada em ${crFmtData(cfg.metaFixadaEm)}. ${t.travada ? `Não pode ser alterada até <b>${crFmtData(t.libera)}</b>.` : 'O prazo de 3 meses acabou: você já pode alterar.'}</small>
        ${t.travada ? '' : '<div><button class="btn small" data-cr-meta-alterar>Alterar meta</button></div>'}</div>`
    : `<div class="crc-meta-fixa"><div><span>Meta de faturamento do ano</span><input id="crMetaInput" type="number" min="0" step="any" value="${cfg.metaAnual}"></div>
        <small class="muted">Defina a meta e fixe. Depois de fixada, ela <b>não pode ser alterada por 3 meses</b>.</small>
        <div><button class="btn small primary" data-cr-meta-fixar>Fixar meta</button></div></div>`;
  return `<div class="section-title">Meta <b>do ano</b></div>
  <div class="card">${bloco}</div>

  <div class="section-title">O caminho <b>dos próximos 12 meses</b></div>
  <div class="card crc-conta">
    <div class="crc-linhas">
      <div><span>Ticket do plano de entrada (R$)</span><input type="number" min="0" step="any" data-cr-field="ticketEntrada" value="${cfg.ticketEntrada}"></div>
      <div><span>Ticket médio de hoje</span><b>${money(x.ticket)}</b></div>
      <div><span>Falta por ano</span><b>${money(x.falta)}</b></div>
      <div><span>Crescer por mês (mensalidade nova)</span><b>${money(c.d)}</b></div>
      <div><span>Clientes novos por mês · entrada</span><b>${n1(c.porMesCli)}</b></div>
      <div><span>Clientes novos em 12 meses · entrada</span><b>${fmtNum(c.novos)}</b></div>
      <div><span>Clientes novos em 12 meses · ticket médio</span><b>${fmtNum(cm.novos)}</b></div>
      <div><span>Mensalidade no fim dos 12 meses</span><b>${money(c.mrrFinal)}</b></div>
      <div><span>Contatos por cliente</span><b>${fmtNum(Math.round(x.wf.plano))}${x.wf.real ? '' : ' <small>(suposição de planejamento)</small>'}</b></div>
      <div><span>Contatos por mês (entrada)</span><b>${fmtNum(c.porMes)}</b></div>
      <div><span>Contatos por dia útil</span><b>${fmtNum(porDia)}</b></div>
    </div>
    <div class="crc-cen crc-cen4"><div class="crc-cen-h"><span>Mês</span><span>Mensalidade necessária</span><span>Clientes novos acumulados (entrada)</span><span>Clientes novos acumulados (ticket médio)</span></div>${linhas}</div>
    <small class="muted">A mensalidade cresce em linha reta, mês a mês, a partir das mensalidades de hoje (${money(x.mrr)}), de modo que a soma dos 12 meses fecha a meta de ${money(cfg.metaAnual)}. ${x.wf.real ? `Conversão calculada: ${fmtNum(x.wf.total)} cadastros ÷ ${fmtNum(x.wf.clientes)} clientes.` : 'Enquanto não há cliente fechado, os contatos usam a suposição de 1 cliente a cada 100, só para planejamento.'} Quem sai por fim de contrato precisa ser reposto a mais.</small>
  </div>

  <div class="section-title">Cenários <b>de meta</b></div>
  <div class="card"><div class="crc-cen"><div class="crc-cen-h"><span>Cenário</span><span>Meta do ano</span><span>Mensalidade final</span><span>Clientes novos (entrada)</span><span>Contatos por mês</span></div>
    ${[['Realista', cfg.metaAnual], ['Ousada', cfg.metaAnual * 1.5], ['Muito ousada', cfg.metaAnual * 2]].map(([n, m]) => { const cc = crCalc(m, x.mrr, Number(cfg.ticketEntrada) || 0, x.taxa); return `<div><b>${n}</b><span>${money(m)}</span><span>${money(cc.mrrFinal)}</span><span>${fmtNum(cc.novos)}</span><span>${fmtNum(cc.porMes)}</span></div>`; }).join('')}
  </div><small class="muted">Os cenários partem da meta fixada e usam o mesmo caminho de 12 meses. Quanto mais ousada, mais clientes e contatos: é aí que entram preço maior, oferta melhor e indicação.</small></div>

  <div class="section-title">Posicionamento <b>e estratégia</b></div>
  <div class="card crc-pos">
    ${[['publico', 'Quem atendemos', 'Ex.: empresas de serviço local (ar-condicionado, limpeza, estética) que vendem pelo WhatsApp'], ['promessa', 'O que prometemos', 'Ex.: mais pedidos de orçamento por mês, com anúncio e conteúdo que respondem no WhatsApp'], ['diferencial', 'Por que a JH e não outra', 'Ex.: relatório simples, atendimento próximo, resultado acompanhado toda semana'], ['oferta', 'Oferta principal (planos e preços)', 'Os três planos e o que cada um entrega'], ['provas', 'Provas (casos e resultados)', 'Cliente, o que fez, resultado em números']]
      .map(([k, t2, ph]) => `<label><span>${t2}</span><textarea rows="2" data-cr-pos="${k}" placeholder="${ph}">${esc((cfg.posicionamento || {})[k] || '')}</textarea></label>`).join('')}
    <small class="muted">Preencha com as suas palavras. O Gerente usa isso para sugerir conteúdo, anúncio e abordagem alinhados ao seu posicionamento.</small>
  </div>

  <div class="section-title" style="display:flex;justify-content:space-between;gap:10px"><span>Estrutura <b>necessária</b></span><small class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">custo mensal previsto: ${money(custoTotal)}</small></div>
  <div class="card crc-lista">${estr || '<p class="muted">Nada por aqui ainda.</p>'}
    <div class="crc-add"><input id="crEstrNome" placeholder="O que precisa? (ferramenta, pessoa, verba…)"><input id="crEstrCusto" type="number" min="0" step="any" placeholder="R$/mês"><button class="btn small primary" data-cr-estr-add>Adicionar</button></div></div>`;
}

function renderCrescimento() {
  const cfg = crCfg(), x = crContexto(cfg);
  const aba = ([k, t]) => `<button class="crc-tab ${crTab === k ? 'on' : ''}" data-cr-tab="${k}">${t}</button>`;
  const corpo = crTab === 'estrategias' ? crEstrategiasHTML(cfg, x) : crTab === 'ideias' ? crIdeiasHTML(cfg) : crTab === 'conhecimento' ? crConhecimentoHTML(cfg) : crTab === 'meta' ? crMetaHTML(cfg, x) : crVisaoHTML(cfg, x);
  return `<div class="page-head"><h1 class="title">CRESCIMENTO E <b>MARKETING</b></h1><a href="#" data-view="metas" class="muted" style="font-size:13px">Metas detalhadas</a></div>
  <p class="muted">Método: aprender, ter ideias, montar estratégias e medir o resultado. Os valores de caixa ficam em Financeiro.</p>
  <div class="crc-tabs">${CR_ABAS.map(aba).join('')}</div>
  ${corpo}`;
}

/* ---------- eventos ---------- */
document.addEventListener('change', e => {
  const t = e.target, cfg = crCfg();
  if (t.dataset.crEst) {
    const [id, campo] = t.dataset.crEst.split('|'), s = cfg.estrategias.find(i => i.id === id); if (!s) return;
    s[campo] = campo === 'invest' ? Number(t.value) || 0 : t.value; crAberta = id; return crSave(cfg);
  }
  if (t.dataset.crPos) { cfg.posicionamento = { ...(cfg.posicionamento || {}), [t.dataset.crPos]: t.value }; return crSave(cfg); }
  if (t.dataset.crTemas !== undefined) { cfg.conhecimento.temas = t.value.split('\n').map(x => x.trim()).filter(Boolean); return crSave(cfg); }
  if (t.dataset.crField) { if (t.dataset.crField === 'metaAnual') return; cfg[t.dataset.crField] = Number(t.value) || 0; return crSave(cfg); }
  if (t.dataset.crEstrCusto) { const x = cfg.estrutura.find(i => i.id === t.dataset.crEstrCusto); if (x) x.custo = t.value === '' ? '' : Number(t.value); return crSave(cfg); }
  if (t.dataset.crEstrStatus) { const x = cfg.estrutura.find(i => i.id === t.dataset.crEstrStatus); if (x) x.status = t.value; return crSave(cfg); }
  if (t.dataset.crIdeiaStatus) { const x = cfg.ideias.find(i => i.id === t.dataset.crIdeiaStatus); if (x) x.status = t.value; return crSave(cfg); }
  if (t.dataset.crConhStatus) { const x = cfg.conhecimento.itens.find(i => i.id === t.dataset.crConhStatus); if (x) x.status = t.value; return crSave(cfg); }
});
document.addEventListener('click', async e => {
  const tab = e.target.closest('[data-cr-tab]');
  if (tab) { crTab = tab.dataset.crTab; return render(); }
  const ab = e.target.closest('[data-cr-abrir]');
  if (ab) { crTab = 'estrategias'; crAberta = ab.dataset.crAbrir; return render(); }
  const b = e.target.closest('[data-cr-meta-fixar],[data-cr-meta-alterar],[data-cr-log],[data-cr-est-novo],[data-cr-est-del],[data-cr-conv],[data-cr-estr-add],[data-cr-estr-del],[data-cr-ideia-add],[data-cr-ideia-del],[data-cr-conh-add],[data-cr-conh-del]');
  if (!b) return;
  const cfg = crCfg(), val = id => document.querySelector(id).value.trim(), d = b.dataset;
  if ('crMetaFixar' in d) {
    const v = Number(document.querySelector('#crMetaInput')?.value) || 0; if (v <= 0) return;
    const libera = crSomaMesesData(todayStr(), 3);
    if (!(await askConfirm(`Fixar a meta de ${money(v)} por ano? Depois de fixada, ela não poderá ser alterada até ${crFmtData(libera)} (3 meses).`, 'Fixar meta', false))) return;
    cfg.metaAnual = v; cfg.metaFixadaEm = todayStr(); cfg.metaLiberaEm = libera; return crSave(cfg);
  }
  if ('crMetaAlterar' in d) { if (crMetaTrava(cfg).travada) return; cfg.metaFixadaEm = ''; cfg.metaLiberaEm = ''; return crSave(cfg); }
  if (d.crLog) { const [id, campo, n] = d.crLog.split('|'), s = cfg.estrategias.find(i => i.id === id); if (s) { s[campo] = Math.max(0, (Number(s[campo]) || 0) + Number(n)); crAberta = id; return crSave(cfg); } return; }
  if (d.crEstNovo) { const m = CR_MODELOS[d.crEstNovo], s = { id: uid(), ...m, invest: 0, inicio: '', status: 'planejada', origem: '', contatos: 0, clientes: 0, decisao: 'teste', nota: '' }; cfg.estrategias = [...cfg.estrategias, s]; crAberta = s.id; return crSave(cfg); }
  if (d.crEstDel) { if (!(await askConfirm('Remover esta estratégia e os números dela?', 'Remover', true))) return; cfg.estrategias = cfg.estrategias.filter(i => i.id !== d.crEstDel); cfg.ideias.forEach(i => { if (i.estrategiaId === d.crEstDel) delete i.estrategiaId; }); return crSave(cfg); }
  if (d.crConv) {
    const i = cfg.ideias.find(x => x.id === d.crConv); if (!i) return;
    const s = { id: uid(), nome: i.texto.slice(0, 70), canal: CR_CANAIS_EST.includes(i.canal) ? i.canal : 'Outro', objetivo: i.meta || '', passos: i.texto, freq: i.freq || 'Semanal', invest: 0, inicio: '', status: 'planejada', origem: i.id, contatos: 0, clientes: 0, decisao: 'teste', nota: '' };
    cfg.estrategias = [...cfg.estrategias, s]; i.estrategiaId = s.id; i.status = 'andamento'; crTab = 'estrategias'; crAberta = s.id; return crSave(cfg);
  }
  if ('crEstrAdd' in d) {
    const nome = val('#crEstrNome'); if (!nome) return;
    const custo = document.querySelector('#crEstrCusto').value;
    cfg.estrutura = [...cfg.estrutura, { id: uid(), nome, custo: custo === '' ? '' : Number(custo), status: 'pedir', nota: '' }]; return crSave(cfg);
  }
  if (d.crEstrDel) { cfg.estrutura = cfg.estrutura.filter(i => i.id !== d.crEstrDel); return crSave(cfg); }
  if ('crIdeiaAdd' in d) {
    const texto = val('#crIdeiaTxt'); if (!texto) return;
    cfg.ideias = [...cfg.ideias, { id: uid(), canal: val('#crIdeiaCanal'), texto, meta: val('#crIdeiaMeta'), freq: val('#crIdeiaFreq'), fonte: val('#crIdeiaFonte'), status: 'proposta' }]; return crSave(cfg);
  }
  if (d.crIdeiaDel) { cfg.ideias = cfg.ideias.filter(i => i.id !== d.crIdeiaDel); return crSave(cfg); }
  if ('crConhAdd' in d) {
    const titulo = val('#crConhTitulo'); if (!titulo) return;
    cfg.conhecimento.itens = [...cfg.conhecimento.itens, { id: uid(), tipo: val('#crConhTipo'), titulo, link: val('#crConhLink'), data: todayStr().split('-').reverse().join('/'), status: 'novo' }]; return crSave(cfg);
  }
  if (d.crConhDel) { cfg.conhecimento.itens = cfg.conhecimento.itens.filter(i => i.id !== d.crConhDel); return crSave(cfg); }
});
