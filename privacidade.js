/* Modo privacidade: valores em dinheiro, metas e margens ficam OCULTOS toda vez que o SI abre.
   O olhinho no topo mostra e oculta. Nada é gravado: ao recarregar a página, volta a ficar oculto.
   Funciona em qualquer tela: troca "R$ 1.234,00" por "R$ ••••" (texto) e mascara os campos de valor. */

let privOculto = true;
const PRIV_RE = /[−-]?\s*R\$[\s ]*[−-]?[\d.]+(?:,\d+)?|margem de [\d.,−-]+%/g;
const PRIV_TESTE = new RegExp(PRIV_RE.source);
const privMascara = v => /R\$/.test(v) ? 'R$ ••••' : 'margem ••••';
// campos de digitar que guardam valor em dinheiro (ficam mascarados enquanto oculto)
const PRIV_CAMPOS = '#kFee, #fcAmount, #fiAmount, #finGoal, #crMetaInput, #crEstrCusto, [data-cr-field], [data-cr-estr-custo], [data-cr-est$="|invest"]';

function privProcessar() {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement && !n.parentElement.closest('script,style,textarea,input,option,select,svg,.vv') && PRIV_TESTE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  const nos = []; while (w.nextNode()) nos.push(w.currentNode);
  nos.forEach(n => {
    const frag = document.createDocumentFragment(), txt = n.nodeValue; let ultimo = 0;
    for (const m of txt.matchAll(PRIV_RE)) {
      frag.append(txt.slice(ultimo, m.index));
      const s = document.createElement('span'); s.className = 'vv'; s.dataset.v = m[0].trim(); s.textContent = privOculto ? privMascara(m[0]) : m[0];
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
