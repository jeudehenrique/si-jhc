/* Crescimento e marketing: meta, posicionamento, plano do mês por canal, estrutura necessária,
   caixa de conhecimento (o que o usuário entrega e o que o Gerente aprende) e ideias para implementar.
   Valores de caixa ficam no Financeiro. Dados na tabela settings (chave "crescimento" e "crescimento-AAAA-MM").
   Usa state, persist, uid, esc, fmtNum, money, todayStr e state.crm. */

const CR_CANAIS = [
  { key: 'whatsapp', nome: 'WhatsApp · prospecção', unidade: 'contatos', meta: 300, auto: true },
  { key: 'email', nome: 'E-mail marketing', unidade: 'envios', meta: 400 },
  { key: 'anuncios', nome: 'Anúncios novos (campanhas ou criativos)', unidade: 'itens', meta: 4 },
  { key: 'remarketing', nome: 'Remarketing', unidade: 'ações', meta: 2 },
  { key: 'promocoes', nome: 'Promoções e ofertas', unidade: 'ações', meta: 1 },
  { key: 'conteudo', nome: 'Conteúdo da JH (posts)', unidade: 'posts', meta: 12, auto: true }
];
const CR_STATUS_ESTR = [['pedir', 'Pedir'], ['testar', 'Testar'], ['ativo', 'Ativo'], ['descartado', 'Descartado']];
const CR_STATUS_IDEIA = [['proposta', 'Proposta'], ['aceita', 'Aceita'], ['andamento', 'Em andamento'], ['feita', 'Feita'], ['descartada', 'Descartada']];
const CR_FREQ = ['Pontual', 'Diária', 'Semanal', 'A cada 15 dias', 'Mensal'];
const CR_CANAIS_IDEIA = ['WhatsApp', 'E-mail', 'Meta Ads', 'Google Ads', 'Conteúdo', 'LinkedIn', 'IA e novidades', 'Outro'];
const CR_TIPOS_CONHEC = ['Link', 'Canal do YouTube', 'Perfil do Instagram', 'PDF ou documento', 'Nota ou dica'];
const CR_TEMAS = ['Marketing para agências', 'E-mail marketing', 'Meta Ads e Google Ads', 'IA e novas ferramentas', 'Prospecção por WhatsApp', 'LinkedIn e conteúdo'];
const CR_DEFAULT = {
  metaAnual: 60000, prazoMeses: 6, taxaFech: 3,
  funil: { contatos: 100, material: 5, fechamento: 1, fechados: 0 }, taxaProposta: 30, respEmail: 3, cpl: 25,
  canais: Object.fromEntries(CR_CANAIS.map(c => [c.key, c.meta])),
  estrutura: [
    { id: 'e1', nome: 'Ferramenta de e-mail marketing (envio e automação)', custo: '', status: 'pedir', nota: 'sugestão do Gerente' },
    { id: 'e2', nome: 'API oficial do WhatsApp (CRM no número de negócio)', custo: '', status: 'pedir', nota: 'sugestão do Gerente' },
    { id: 'e3', nome: 'Reenviar o pedido de permissão da Meta (gestão de anúncios)', custo: '', status: 'pedir', nota: 'sugestão do Gerente' },
    { id: 'e4', nome: 'Verba própria de anúncios para captar clientes para a JH', custo: '', status: 'pedir', nota: 'definir valor' }
  ],
  ideias: [
    { id: 'i1', canal: 'WhatsApp', texto: 'Dobrar a prospecção para dobrar os fechamentos.', meta: '600 contatos por mês (cerca de 30 por dia útil, em 3 blocos, no máximo 15 por hora)', freq: 'Diária', fonte: 'Sugestão do Gerente', status: 'proposta' },
    { id: 'i2', canal: 'E-mail', texto: 'Disparar e-mails novos para empresas do seu nicho. Precisa de domínio próprio aquecido aos poucos, lista segmentada, link de descadastro e cuidado com a LGPD.', meta: '1.000 a 3.000 e-mails novos por mês, em levas de 500 a 1.500', freq: 'A cada 15 dias', fonte: 'Sugestão do Gerente', status: 'proposta' },
    { id: 'i3', canal: 'Conteúdo', texto: 'Publicar o resultado dos clientes ativos (antes e depois, números dos anúncios) como prova social nas redes da JH.', meta: '1 caso novo por quinzena', freq: 'A cada 15 dias', fonte: 'Sugestão do Gerente', status: 'proposta' },
    { id: 'i4', canal: 'WhatsApp', texto: 'Contato de renovação 30 dias antes do fim de cada contrato (a maioria sai por fim de contrato, não por insatisfação).', meta: '100% dos contratos com conversa de renovação antes do fim', freq: 'Mensal', fonte: 'Sugestão do Gerente', status: 'proposta' },
    { id: 'i5', canal: 'Meta Ads', texto: 'Campanha de captação da própria JH para o seu nicho, com oferta de diagnóstico gratuito.', meta: 'definir verba e número de pedidos de diagnóstico por mês', freq: 'Mensal', fonte: 'Sugestão do Gerente', status: 'proposta' },
    { id: 'i7', canal: 'E-mail', texto: 'Sequência de 4 e-mails em 15 dias: 1) conteúdo educacional útil para o nicho (com o PDF), 2) caso de cliente com número, 3) proposta direta com diagnóstico gratuito, 4) encerramento educado. É uma hipótese a testar: meça a resposta de cada e-mail.', meta: 'taxa de resposta acima de 3% e 1 conversa de fechamento a cada 100 respostas', freq: 'A cada 15 dias', fonte: 'Sugestão do Gerente (estrutura comum de cold e-mail, a validar)', status: 'proposta' },
    { id: 'i6', canal: 'Outro', texto: 'Programa de indicação: desconto na mensalidade para o cliente que indicar alguém que feche.', meta: '1 indicação fechada por trimestre', freq: 'Pontual', fonte: 'Sugestão do Gerente', status: 'proposta' }
  ],
  conhecimento: { temas: CR_TEMAS, itens: [], aprendizados: [] }
};
let crTab = 'plano';

const crRow = key => (state.settings || []).find(s => s.key === key);
function crCfg() {
  const d = crRow('crescimento')?.data || {}, c = d.conhecimento || {};
  return { ...CR_DEFAULT, ...d, funil: { ...CR_DEFAULT.funil, ...(d.funil || {}) }, canais: { ...CR_DEFAULT.canais, ...(d.canais || {}) },
    estrutura: Array.isArray(d.estrutura) ? d.estrutura : CR_DEFAULT.estrutura,
    ideias: Array.isArray(d.ideias) ? d.ideias.map(i => ({ ...i, status: i.status === 'nova' ? 'proposta' : i.status })) : CR_DEFAULT.ideias,
    conhecimento: { temas: Array.isArray(c.temas) ? c.temas : CR_TEMAS, itens: c.itens || [], aprendizados: c.aprendizados || [] } };
}
function crSave(cfg) {
  let r = crRow('crescimento');
  if (!r) { r = { id: uid(), key: 'crescimento', data: cfg }; state.settings.push(r); } else r.data = cfg;
  persist(); render();
}
const crMesKey = () => 'crescimento-' + todayStr().slice(0, 7);
const crContadores = () => crRow(crMesKey())?.data || {};
function crSaveContador(canal, n) {
  const dados = { ...crContadores(), [canal]: Math.max(0, n) };
  let r = crRow(crMesKey());
  if (!r) { r = { id: uid(), key: crMesKey(), data: dados }; state.settings.push(r); } else r.data = dados;
  persist(); render();
}
const crLink = u => /^https?:\/\//i.test(u || '') ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 60))}</a>` : esc(u || '');

function crFeitoDoMes(c) {
  const mesAtual = todayStr().slice(0, 7);
  if (c.key === 'whatsapp') { const m = state.crm.find(x => x.id === 'prospeccao')?.dados; if (m && Number.isFinite(Number(m.mes))) return { v: Number(m.mes), auto: 'CRM' }; }
  if (c.key === 'conteudo') {
    const jh = state.clients.find(x => /JH COMPANY/i.test(x.name))?.id;
    if (jh) return { v: state.posts.filter(p => p.clientId === jh && (p.status === 'ready' || p.status === 'published') && p.publishDate.slice(0, 7) === mesAtual).length, auto: 'Calendário' };
  }
  return { v: Number(crContadores()[c.key]) || 0, auto: null };
}
/* Conversão automática, sem número editável: contatos cadastrados no CRM ÷ clientes fechados.
   Até o primeiro fechamento vale a suposição inicial de 1 cliente a cada 100 contatos. */
const CR_BASE = 100;
const crOk = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const crFotos = () => (state.settings || []).filter(s => /^funil-\d{4}-\d{2}$/.test(s.key));
function crFunilWhats() {
  const crm = state.crm?.find(x => x.id === 'prospeccao')?.dados || null, fotos = crFotos();
  const somaC = fotos.reduce((a, s) => a + (Number(s.data.contatos) || 0), 0), somaF = fotos.reduce((a, s) => a + (Number(s.data.fechados) || 0), 0);
  const doCrm = crm && crOk(crm.total_cadastradas) && crOk(crm.clientes_fechados);
  const total = doCrm ? Number(crm.total_cadastradas) : somaC, clientes = doCrm ? Number(crm.clientes_fechados) : somaF;
  return { total, clientes, emFechamento: crm && crOk(crm.em_fechamento) ? Number(crm.em_fechamento) : null,
    porCliente: clientes > 0 ? total / clientes : null, plano: clientes > 0 ? total / clientes : CR_BASE, real: clientes > 0,
    origem: doCrm ? 'do CRM' : 'acumulado desde que o SI começou a acompanhar' };
}
// guarda, sozinho, uma foto do mês com os contatos, fechamentos e gasto em anúncios; assim o acumulado cresce sem digitar nada
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
const crAcum = key => (state.settings || []).filter(s => /^crescimento-\d{4}-\d{2}$/.test(s.key)).reduce((a, s) => a + (Number(s.data[key]) || 0), 0);
const crGastoAcum = () => crFotos().reduce((a, s) => a + (Number(s.data.gasto) || 0), 0);

// a mensalidade sobe aos poucos até o fim do prazo e depois fica estável: acha a mensalidade final que fecha a meta do ano
function crCalc(metaAnual, mrr, ticket, prazo, taxa) {
  const p = Math.min(12, Math.max(0, prazo));
  const mrrFinal = Math.max(mrr, (metaAnual - p * mrr / 2) / (12 - p / 2)), gap = Math.max(0, mrrFinal - mrr);
  const novos = ticket ? Math.ceil(gap / ticket) : 0, contatos = novos && taxa ? Math.ceil(novos / (taxa / 100)) : 0;
  return { mrrFinal, gap, novos, contatos, porMes: prazo ? Math.ceil(contatos / prazo) : 0 };
}

function crPlanoHTML(cfg) {
  const pagantes = state.clients.filter(c => Number(c.fee) > 0);
  const mrr = pagantes.reduce((s, c) => s + Number(c.fee), 0), ticket = pagantes.length ? mrr / pagantes.length : 0;
  const p = Math.min(12, Math.max(0, cfg.prazoMeses));
  const crm = state.crm.find(x => x.id === 'prospeccao')?.dados || null;
  const wf = crFunilWhats(), taxa = 100 / wf.plano;
  const taxaTxt = wf.real ? `calculada: ${fmtNum(wf.total)} contatos ÷ ${fmtNum(wf.clientes)} cliente${wf.clientes > 1 ? 's' : ''} fechado${wf.clientes > 1 ? 's' : ''} (${wf.origem})` : 'suposição de planejamento de 1 cliente a cada 100 contatos, usada só até o primeiro fechamento (a métrica real ainda não existe)';
  const { mrrFinal, gap, novos, contatos, porMes } = crCalc(cfg.metaAnual, mrr, ticket, cfg.prazoMeses, taxa), porDia = Math.ceil(porMes / 21);
  const projecao = p * (mrr + gap / 2) + (12 - p) * (mrr + gap);
  const n1 = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const contatosMes = Number(cfg.canais.whatsapp) || 0, clientesMes = contatosMes / wf.plano;
  const emEnv = crAcum('email'), emFech = crAcum('email_fechou'), emCli = emFech ? emEnv / emFech : null;
  const adC = crAcum('anuncios_contatos'), adF = crAcum('anuncios_fechou'), gasto = crGastoAcum(), adCli = adF ? adC / adF : null, cac = adF && gasto ? gasto / adF : null;
  const logBtn = (k, ns) => ns.map(n => `<button class="btn small ${n === 1 || n === 10 ? '' : 'ghost'}" data-cr-add="${k}" data-n="${n}">${n > 0 ? '+' + n : '−' + Math.abs(n)}</button>`).join(' ');
  const linha = (t, v, extra = '') => `<div><span>${t}</span><b>${v}</b>${extra}</div>`;
  const inp = (field, val, extra = '') => `<input type="number" min="0" step="any" data-cr-field="${field}" value="${val}" ${extra}>`;

  const canais = CR_CANAIS.map(c => {
    const meta = Number(cfg.canais[c.key]) || 0, f = crFeitoDoMes(c), pct = meta ? Math.min(100, Math.round(f.v / meta * 100)) : 0;
    return `<div class="crc-canal"><div class="crc-canal-top"><b>${esc(c.nome)}</b>
        <span><input class="crc-meta" type="number" min="0" data-cr-canal="${c.key}" value="${meta}"> <small>${c.unidade}/mês</small></span></div>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <div class="crc-canal-bot"><small>${fmtNum(f.v)} de ${fmtNum(meta)} este mês${f.auto ? ` · vem do ${f.auto}` : ''}</small>
        ${f.auto ? '' : `<span><button class="btn small" data-cr-add="${c.key}" data-n="1">+1</button> <button class="btn small ghost" data-cr-add="${c.key}" data-n="10">+10</button> <button class="btn small ghost" data-cr-add="${c.key}" data-n="-1">−1</button></span>`}</div></div>`;
  }).join('');
  const custoTotal = cfg.estrutura.filter(e => e.status !== 'descartado').reduce((s, e) => s + (Number(e.custo) || 0), 0);
  const estr = cfg.estrutura.map(e => `<div class="crc-item"><div><b>${esc(e.nome)}</b><small>${esc(e.nota || '')}</small></div>
      <input class="crc-custo" type="number" min="0" step="any" placeholder="R$/mês" data-cr-estr-custo="${e.id}" value="${e.custo === '' ? '' : e.custo}">
      <select data-cr-estr-status="${e.id}">${CR_STATUS_ESTR.map(([v, l]) => `<option value="${v}" ${e.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button class="btn small ghost" data-cr-estr-del="${e.id}" aria-label="Remover">×</button></div>`).join('');

  return `<div class="section-title">Meta <b>de crescimento</b></div>
  <div class="card crc-meta-card"><div class="crc-linhas">
    <div><span>Meta de faturamento do ano (você define)</span>${inp('metaAnual', cfg.metaAnual)}</div>
    <div><span>Ponto de partida</span><b>${money(mrr)}</b><small class="muted">mensalidades de hoje · valores em Financeiro</small></div>
  </div></div>
  <div class="section-title">Conversão <b>calculada</b></div>
  <p class="muted" style="margin-top:0">Nenhum número aqui é editável: a conta divide o que você fez pelo que fechou e se ajusta sozinha a cada novo cliente.</p>
  <div class="crc-canais">
    <div class="card crc-conta"><b>WhatsApp · automático pelo CRM</b>
      <div class="crc-linhas">${linha('Cadastros total', fmtNum(wf.total))}${linha('Clientes fechados', fmtNum(wf.clientes))}${linha('Contatos por cliente', wf.real ? fmtNum(Math.round(wf.porCliente)) : '—')}</div>
      <p class="crc-frase">${wf.real ? `Fizemos ${fmtNum(wf.total)} contatos para fechar ${fmtNum(wf.clientes)} cliente${wf.clientes > 1 ? 's' : ''}. <b>A cada ${fmtNum(Math.round(wf.porCliente))} contatos, fechamos 1 cliente.</b>` : `Foram feitos <b>${fmtNum(wf.total)} contatos</b> e ainda não temos nenhum cliente fechado. Por isso a métrica ainda não existe.`}</p>
      <small class="muted">${wf.real ? `Para fechar mais 1 cliente, a previsão é fazer mais ${fmtNum(Math.round(wf.porCliente))} contatos. Com ${fmtNum(contatosMes)} contatos por mês, são ${n1(clientesMes)} clientes por mês. ` : 'Assim que o primeiro cliente fechar, a conta passa a ser cadastros total ÷ clientes fechados. '}Muda sozinha a cada fechamento (${wf.origem}).</small></div>
    <div class="card crc-conta"><b>E-mail · você registra o que dispara</b>
      <div class="crc-linhas">${linha('E-mails enviados (total)', fmtNum(emEnv), `<span class="crc-btns">${logBtn('email', [10, 100, -10])}</span>`)}${linha('Clientes fechados por e-mail', fmtNum(emFech), `<span class="crc-btns">${logBtn('email_fechou', [1, -1])}</span>`)}${linha('E-mails por cliente', emCli ? fmtNum(emCli) : 'aguardando o 1º cliente')}</div>
      <small class="muted">A conta é enviados ÷ clientes fechados por e-mail. Nada é estimado: só aparece quando o primeiro cliente fecha. Depois o CRM vai registrar a origem sozinho.</small></div>
    <div class="card crc-conta"><b>Anúncios · gasto vem do Painel Meta Ads</b>
      <div class="crc-linhas">${linha('Contatos vindos de anúncios', fmtNum(adC), `<span class="crc-btns">${logBtn('anuncios_contatos', [10, 100, -10])}</span>`)}${linha('Clientes fechados por anúncio', fmtNum(adF), `<span class="crc-btns">${logBtn('anuncios_fechou', [1, -1])}</span>`)}${linha('Gasto em anúncios da JH (acumulado)', gasto ? money(gasto) : '—')}${linha('Contatos por cliente', adCli ? fmtNum(adCli) : 'aguardando o 1º cliente')}${linha('Custo por cliente', cac ? money(cac) : 'aguardando o 1º cliente')}</div>
      <small class="muted">Se você rodar 300 contatos e fechar 1, a conta mostra 300 por cliente. O custo por cliente é o gasto do Painel dividido pelos clientes fechados por anúncio.</small></div>
  </div>

  <div class="card crc-conta">
    <b>A conta para chegar lá</b>
    <div class="crc-linhas">
      <div><span>Mensalidade necessária no fim do prazo</span><b>${money(mrrFinal)}</b></div>
      <div><span>Faltam por mês</span><b>${money(gap)}</b></div>
      <div><span>Clientes novos necessários</span><b>${fmtNum(novos)}</b></div>
      <div><span>Prazo para fechar (meses)</span>${inp('prazoMeses', cfg.prazoMeses, 'step="1"')}</div>
      <div><span>Contatos por cliente</span><b>${fmtNum(Math.round(wf.plano))}${wf.real ? '' : ' <small>(suposição de planejamento)</small>'}</b></div>
      <div><span>Contatos no total</span><b>${fmtNum(contatos)}</b></div>
      <div><span>Contatos por mês</span><b>${fmtNum(porMes)}</b></div>
      <div><span>Contatos por dia útil</span><b>${fmtNum(porDia)}</b></div>
    </div>
    <small class="muted">Conversão: ${taxaTxt}. A conta considera que a mensalidade sobe aos poucos até o fim do prazo e depois fica estável (receita projetada no ano: ${money(projecao)}). Clientes que saem por fim de contrato precisam ser repostos a mais.</small>
  </div>

  <div class="section-title">Cenários <b>de meta</b></div>
  <div class="card"><div class="crc-cen"><div class="crc-cen-h"><span>Cenário</span><span>Meta do ano</span><span>Mensalidade final</span><span>Clientes novos</span><span>Contatos por mês</span></div>
    ${[['Realista', cfg.metaAnual], ['Ousada', cfg.metaAnual * 1.5], ['Muito ousada', cfg.metaAnual * 2]].map(([n, m]) => { const c = crCalc(m, mrr, ticket, cfg.prazoMeses, taxa); return `<div><b>${n}</b><span>${money(m)}</span><span>${money(c.mrrFinal)}</span><span>${fmtNum(c.novos)}</span><span>${fmtNum(c.porMes)}</span></div>`; }).join('')}
  </div><small class="muted">Mesma conta de cima (prazo e conversão iguais). Quanto mais ousada, mais clientes e contatos: é aqui que entram preço maior, oferta melhor e indicação, não só volume.</small></div>

  <div class="section-title">Posicionamento <b>e estratégia</b></div>
  <div class="card crc-pos">
    ${[['publico', 'Quem atendemos', 'Ex.: empresas de serviço local (ar-condicionado, limpeza, estética) que vendem pelo WhatsApp'], ['promessa', 'O que prometemos', 'Ex.: mais pedidos de orçamento por mês, com anúncio e conteúdo que respondem no WhatsApp'], ['diferencial', 'Por que a JH e não outra', 'Ex.: relatório simples, atendimento próximo, resultado acompanhado toda semana'], ['oferta', 'Oferta principal (planos e preços)', 'Os três planos e o que cada um entrega'], ['provas', 'Provas (casos e resultados)', 'Cliente, o que fez, resultado em números']]
      .map(([k, t, ph]) => `<label><span>${t}</span><textarea rows="2" data-cr-pos="${k}" placeholder="${ph}">${esc((cfg.posicionamento || {})[k] || '')}</textarea></label>`).join('')}
    <small class="muted">Preencha com as suas palavras. O Gerente usa isso para sugerir conteúdo, anúncio e abordagem alinhados ao seu posicionamento.</small>
  </div>

  <div class="section-title">Plano <b>do mês</b></div>
  <div class="crc-canais">${canais}</div>

  <div class="section-title" style="display:flex;justify-content:space-between;gap:10px"><span>Estrutura <b>necessária</b></span><small class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">custo mensal previsto: ${money(custoTotal)}</small></div>
  <div class="card crc-lista">${estr || '<p class="muted">Nada por aqui ainda.</p>'}
    <div class="crc-add"><input id="crEstrNome" placeholder="O que precisa? (ferramenta, pessoa, verba…)"><input id="crEstrCusto" type="number" min="0" step="any" placeholder="R$/mês"><button class="btn small primary" data-cr-estr-add>Adicionar</button></div></div>`;
}

function crConhecimentoHTML(cfg) {
  const k = cfg.conhecimento, pend = k.itens.filter(i => i.status !== 'analisado').length;
  const itens = k.itens.map(i => `<div class="crc-item crc-conh"><div><b>${esc(i.titulo)}</b><small>${esc(i.tipo)} · ${crLink(i.link)} · entregue em ${esc(i.data || '')}</small></div>
      <select data-cr-conh-status="${i.id}"><option value="novo" ${i.status !== 'analisado' ? 'selected' : ''}>Para analisar</option><option value="analisado" ${i.status === 'analisado' ? 'selected' : ''}>Analisado</option></select>
      <button class="btn small ghost" data-cr-conh-del="${i.id}" aria-label="Remover">×</button></div>`).join('');
  const aprend = [...k.aprendizados].reverse().map(a => `<div class="crc-aprend"><b>${esc(a.texto)}</b><small>${esc(a.canal || '')} · ${crLink(a.fonte)} · ${esc(a.data || '')}</small></div>`).join('');
  return `<div class="section-title">Caixa <b>de conhecimento</b></div>
  <div class="card crc-lista"><p class="muted" style="margin:6px 0 12px">Entregue aqui o que achar útil: link, canal do YouTube, perfil do Instagram, PDF, documento ou uma dica sua. O Gerente analisa e transforma em aprendizados e em ideias para implementar.</p>
    <div class="crc-add crc-add-conh"><select id="crConhTipo">${CR_TIPOS_CONHEC.map(t => `<option>${t}</option>`).join('')}</select><input id="crConhTitulo" placeholder="O que é? (título ou descrição curta)"><input id="crConhLink" placeholder="Link ou nome do arquivo"><button class="btn small primary" data-cr-conh-add>Entregar</button></div>
    ${itens ? `<div class="crc-sub">${pend} para analisar</div>${itens}` : '<p class="muted" style="margin-top:12px">Nada entregue ainda.</p>'}</div>

  <div class="section-title">Temas <b>que o Gerente vigia</b></div>
  <div class="card"><textarea rows="3" data-cr-temas placeholder="Um tema por linha">${esc(k.temas.join('\n'))}</textarea>
    <small class="muted">Mercado de agências, canais de aquisição (Meta Ads, Google Ads, conteúdo, LinkedIn, e-mail marketing) e novidades em IA. A pesquisa automática diária depende de você autorizar uma tarefa agendada; sem ela, o Gerente pesquisa quando você pedir.</small></div>

  <div class="section-title">O que o Gerente <b>aprendeu</b></div>
  <div class="card crc-lista">${aprend || '<p class="muted">Ainda sem pesquisas registradas.</p>'}</div>`;
}

function crIdeiasHTML(cfg) {
  const ideias = cfg.ideias.map(i => `<div class="card crc-ideia2"><div class="crc-ideia2-top"><b>${esc(i.texto)}</b>
      <span><select data-cr-ideia-status="${i.id}">${CR_STATUS_IDEIA.map(([v, l]) => `<option value="${v}" ${i.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button class="btn small ghost" data-cr-ideia-del="${i.id}" aria-label="Remover">×</button></span></div>
      <div class="crc-tags"><span>${esc(i.canal)}</span>${i.freq ? `<span>${esc(i.freq)}</span>` : ''}</div>
      ${i.meta ? `<small><b>Meta:</b> ${esc(i.meta)}</small>` : ''}<small class="muted">${esc(i.fonte || 'sem fonte')}</small></div>`).join('');
  return `<div class="section-title">Ideias <b>para implementar</b></div>
  <p class="muted" style="margin-top:0">O que fazer para andar rumo à meta, com número e frequência. Marque a ideia como aceita para virar ação.</p>
  <div class="crc-ideias">${ideias || '<div class="card"><p class="muted">Nenhuma ideia ainda.</p></div>'}</div>
  <div class="card crc-lista" style="margin-top:12px"><b>Nova ideia</b>
    <div class="crc-add crc-add-ideia"><select id="crIdeiaCanal">${CR_CANAIS_IDEIA.map(c => `<option>${c}</option>`).join('')}</select><input id="crIdeiaTxt" placeholder="A ideia"><input id="crIdeiaMeta" placeholder="Meta (ex.: 600 contatos por mês)"><select id="crIdeiaFreq">${CR_FREQ.map(f => `<option>${f}</option>`).join('')}</select><input id="crIdeiaFonte" placeholder="Fonte (link ou nota)"><button class="btn small primary" data-cr-ideia-add>Adicionar</button></div></div>`;
}

function renderCrescimento() {
  const cfg = crCfg();
  const aba = (k, t) => `<button class="crc-tab ${crTab === k ? 'on' : ''}" data-cr-tab="${k}">${t}</button>`;
  return `<div class="page-head"><h1 class="title">CRESCIMENTO E <b>MARKETING</b></h1><a href="#" data-view="metas" class="muted" style="font-size:13px">Metas detalhadas</a></div>
  <p class="muted">Estratégia para crescer. Os valores de caixa ficam em Financeiro.</p>
  <div class="crc-tabs">${aba('plano', 'Meta e plano')}${aba('conhecimento', 'Caixa de conhecimento')}${aba('ideias', 'Ideias para implementar')}</div>
  ${crTab === 'conhecimento' ? crConhecimentoHTML(cfg) : crTab === 'ideias' ? crIdeiasHTML(cfg) : crPlanoHTML(cfg)}`;
}

document.addEventListener('change', e => {
  const t = e.target, cfg = crCfg();
  if (t.dataset.crPos) { cfg.posicionamento = { ...(cfg.posicionamento || {}), [t.dataset.crPos]: t.value }; return crSave(cfg); }
  if (t.dataset.crTemas !== undefined) { cfg.conhecimento.temas = t.value.split('\n').map(x => x.trim()).filter(Boolean); return crSave(cfg); }
  if (t.dataset.crFunil) { cfg.funil = { ...cfg.funil, [t.dataset.crFunil]: Number(t.value) || 0 }; return crSave(cfg); }
  if (t.dataset.crField) { cfg[t.dataset.crField] = Number(t.value) || 0; return crSave(cfg); }
  if (t.dataset.crCanal) { cfg.canais[t.dataset.crCanal] = Number(t.value) || 0; return crSave(cfg); }
  if (t.dataset.crEstrCusto) { const x = cfg.estrutura.find(i => i.id === t.dataset.crEstrCusto); if (x) x.custo = t.value === '' ? '' : Number(t.value); return crSave(cfg); }
  if (t.dataset.crEstrStatus) { const x = cfg.estrutura.find(i => i.id === t.dataset.crEstrStatus); if (x) x.status = t.value; return crSave(cfg); }
  if (t.dataset.crIdeiaStatus) { const x = cfg.ideias.find(i => i.id === t.dataset.crIdeiaStatus); if (x) x.status = t.value; return crSave(cfg); }
  if (t.dataset.crConhStatus) { const x = cfg.conhecimento.itens.find(i => i.id === t.dataset.crConhStatus); if (x) x.status = t.value; return crSave(cfg); }
});
document.addEventListener('click', e => {
  const tab = e.target.closest('[data-cr-tab]');
  if (tab) { crTab = tab.dataset.crTab; return render(); }
  const b = e.target.closest('[data-cr-add],[data-cr-estr-add],[data-cr-estr-del],[data-cr-ideia-add],[data-cr-ideia-del],[data-cr-conh-add],[data-cr-conh-del]');
  if (!b) return;
  const cfg = crCfg(), val = id => document.querySelector(id).value.trim();
  if (b.dataset.crAdd) { const k = b.dataset.crAdd; return crSaveContador(k, (Number(crContadores()[k]) || 0) + Number(b.dataset.n)); }
  if ('crEstrAdd' in b.dataset) {
    const nome = val('#crEstrNome'); if (!nome) return;
    const custo = document.querySelector('#crEstrCusto').value;
    cfg.estrutura = [...cfg.estrutura, { id: uid(), nome, custo: custo === '' ? '' : Number(custo), status: 'pedir', nota: '' }]; return crSave(cfg);
  }
  if (b.dataset.crEstrDel) { cfg.estrutura = cfg.estrutura.filter(i => i.id !== b.dataset.crEstrDel); return crSave(cfg); }
  if ('crIdeiaAdd' in b.dataset) {
    const texto = val('#crIdeiaTxt'); if (!texto) return;
    cfg.ideias = [...cfg.ideias, { id: uid(), canal: val('#crIdeiaCanal'), texto, meta: val('#crIdeiaMeta'), freq: val('#crIdeiaFreq'), fonte: val('#crIdeiaFonte'), status: 'proposta' }]; return crSave(cfg);
  }
  if (b.dataset.crIdeiaDel) { cfg.ideias = cfg.ideias.filter(i => i.id !== b.dataset.crIdeiaDel); return crSave(cfg); }
  if ('crConhAdd' in b.dataset) {
    const titulo = val('#crConhTitulo'); if (!titulo) return;
    cfg.conhecimento.itens = [...cfg.conhecimento.itens, { id: uid(), tipo: val('#crConhTipo'), titulo, link: val('#crConhLink'), data: todayStr().split('-').reverse().join('/'), status: 'novo' }]; return crSave(cfg);
  }
  if (b.dataset.crConhDel) { cfg.conhecimento.itens = cfg.conhecimento.itens.filter(i => i.id !== b.dataset.crConhDel); return crSave(cfg); }
});
