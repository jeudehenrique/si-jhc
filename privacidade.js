/* Modo privacidade: valores em dinheiro, metas, quantidades, e-mail e telefone ficam OCULTOS toda vez que o SI abre.
   O olhinho no topo mostra e oculta. Nada é gravado: ao recarregar a página, volta a ficar oculto.
   Funciona em qualquer tela: troca "R$ 1.234,00" por "R$ ••••", "5 de 8 clientes" por "•• clientes", e-mail e telefone por "••••",
   e mascara os campos de valor/telefone. Datas e horários continuam visíveis. */

let privOculto = true;
const PRIV_BASE = String.raw`[−-]?\s*R\$[\s ]*[−-]?[\d.]+(?:,\d+)?|margem de [\d.,−-]+%|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\(\d{2}\)\s?\d{4,5}-?\d{4}|\+55\s?\d{2}\s?9?\d{4}-?\d{4}|\d+(?:[.,]\d+)?(?:\s*de\s*\d+(?:[.,]\d+)?)?\s+(?:clientes?|cadastr(?:os?|adas?)|contatos?|leads?|seguidores|mensagens|follow-?ups?|fechamentos?|convers(?:ões|ão)|conversas|reels|posts?|vagas)`;
const PRIV_RE = new RegExp(PRIV_BASE, 'g');
const PRIV_RE_NUM = new RegExp(PRIV_BASE + String.raw`|\d[\d.]*(?:,\d+)?%?`, 'g');
// áreas onde QUALQUER número é indicador (metas, totais, contagens) e fica oculto
const PRIV_METRICA = '.gnum, .rnum, .card.hist, [data-priv-num]';
// na tela Crescimento (metas, projeções, contas) todo número é indicador
const privNum = no => no.parentElement.closest(PRIV_METRICA) || (location.hash.startsWith('#crescimento') && no.parentElement.closest('#main'));
const privMascara = v => /R\$/.test(v) ? 'R$ ••••' : /^margem/.test(v) ? 'margem ••••' : /@/.test(v) ? 'e-mail ••••'
  : /^[(+]/.test(v) ? 'telefone ••••' : /^\d[\d.,]*%?$/.test(v) ? '••' + (v.endsWith('%') ? '%' : '')
  : v.replace(/^\d+(?:[.,]\d+)?(?:\s*de\s*\d+(?:[.,]\d+)?)?/, '••');
// campos de digitar que guardam valor ou número pessoal (ficam mascarados enquanto oculto)
const PRIV_CAMPOS = '#kFee, #kPhone, #gTarget, #lAmount, #fcAmount, #fiAmount, #finGoal, #simSalary, #simBenefits, #crMetaInput, #crEstrCusto, [data-cr-field], [data-cr-estr-custo], [data-cr-est$="|invest"]';

function privProcessar() {
  privTopo();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: n => {
      if (!n.parentElement || n.parentElement.closest('script,style,textarea,input,option,select,svg,.vv,.crc-n,.pnum,.crc-tab')) return NodeFilter.FILTER_REJECT;
      const re = privNum(n) ? PRIV_RE_NUM : PRIV_RE; re.lastIndex = 0;
      const ok = re.test(n.nodeValue); re.lastIndex = 0;
      return ok ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nos = []; while (w.nextNode()) nos.push(w.currentNode);
  nos.forEach(n => {
    const frag = document.createDocumentFragment(), txt = n.nodeValue; let ultimo = 0;
    for (const m of txt.matchAll(privNum(n) ? PRIV_RE_NUM : PRIV_RE)) {
      frag.append(txt.slice(ultimo, m.index));
      const s = document.createElement('span'); s.className = 'vv'; s.dataset.v = m[0].trim(); s.textContent = privOculto ? privMascara(s.dataset.v) : m[0];
      frag.append(s); ultimo = m.index + m[0].length;
    }
    frag.append(txt.slice(ultimo)); n.replaceWith(frag);
  });
  document.querySelectorAll('.vv').forEach(s => { s.textContent = privOculto ? privMascara(s.dataset.v) : s.dataset.v; });
  document.querySelectorAll(PRIV_CAMPOS).forEach(i => {
    if (i.dataset.priv === undefined) i.dataset.priv = i.type || 'text';
    if (privOculto) { if (i.type !== 'text') i.type = 'text'; i.classList.add('priv-campo'); }
    else { i.type = i.dataset.priv; i.classList.remove('priv-campo'); }
  });
}

// roda dentro do próprio ciclo de desenho (sem piscar o valor real) e ignora as mudanças que ela mesma faz
const privObs = new MutationObserver(() => { privObs.disconnect(); privProcessar(); privObs.takeRecords(); privObs.observe(document.body, { childList: true, subtree: true, characterData: true }); });

function privAtualizarBotao() {
  const b = document.querySelector('#privBtn'); if (!b) return;
  b.innerHTML = icon(privOculto ? 'eyeoff' : 'eye') + '<span class="hide-sm">' + (privOculto ? ' Valores' : ' Ocultar') + '</span>';
  b.title = privOculto ? 'Valores ocultos: clique para mostrar' : 'Valores visíveis: clique para ocultar';
  b.setAttribute('aria-pressed', String(!privOculto));
  b.setAttribute('aria-label', privOculto ? 'Mostrar valores' : 'Ocultar valores');
}
function privAlternar() {
  privOculto = !privOculto;
  document.body.classList.toggle('priv-on', privOculto);
  privObs.disconnect(); privProcessar(); privObs.observe(document.body, { childList: true, subtree: true, characterData: true });
  privAtualizarBotao();
}

document.body.classList.add('priv-on');
document.addEventListener('click', e => { if (e.target.closest('#privBtn')) privAlternar(); });
privProcessar(); privAtualizarBotao();
privObs.observe(document.body, { childList: true, subtree: true, characterData: true });

// guarda a altura real do topo para o menu lateral ficar fixo logo abaixo dele
function privTopo() { const t = document.querySelector('.topbar'); if (t && t.offsetHeight) document.documentElement.style.setProperty('--top-h', t.offsetHeight + 'px'); }
window.addEventListener('resize', privTopo); window.addEventListener('load', privTopo); privTopo();
