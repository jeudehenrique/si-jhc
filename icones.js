/* Ícones de linha (estilo profissional): troca os emojis do texto por ícones SVG que herdam a cor do texto.
   Não mexe no desenho do escritório (SVG) nem em campos de digitação. Roda sozinho a cada mudança na tela. */

const IC_PATHS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 010 6M18 14c2 .8 3 2.7 3 6"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/>',
  bell: '<path d="M6 17v-6a6 6 0 1112 0v6l2 2H4zM10 21a2 2 0 004 0"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.4-2.6-1.2M12 6v2M12 16v2"/>',
  megaphone: '<path d="M3 11v2a1 1 0 001 1h2l7 4V6L6 10H4a1 1 0 00-1 1zM16 9a4 4 0 010 6M19 7a7 7 0 010 10"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  message: '<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.5A8 8 0 1121 12z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/>',
  clapper: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 9l3-5h4L7 9M11 9l3-5h4l-3 5"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.1"/>',
  award: '<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5"/>',
  rocket: '<path d="M12 14l-2-2c0-5 4-9 11-9 0 7-4 11-9 11zM9 11H4l2-3h4M13 15v5l3-2v-4M5 15c-1 1-1.5 4-1.5 4s3-.5 4-1.5"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5V16h8v-2.5A6 6 0 0012 3z"/>',
  folder: '<path d="M3 6a2 2 0 012-2h4l2 3h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  cloud: '<path d="M7 18a4 4 0 010-8 5 5 0 019.6-1A4.5 4.5 0 0117 18z"/>',
  pencil: '<path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
  plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.2M6.6 6.6A17 17 0 002 12s3.5 7 10 7a9.7 9.7 0 004.4-1M9.9 9.9a3 3 0 004.2 4.2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>'
};
// emoji -> ícone
const IC_EMOJI = {
  '🎯': 'target', '📊': 'chart', '📈': 'trend', '👥': 'users', '🤝': 'users', '👤': 'user', '🔔': 'bell', '📅': 'calendar', '📋': 'clipboard',
  '💰': 'coin', '📣': 'megaphone', '🧠': 'cpu', '🤖': 'cpu', '💬': 'message', '🖼': 'image', '📸': 'image', '🎨': 'image', '🎬': 'clapper',
  '⚠': 'alert', '🎉': 'award', '🚀': 'rocket', '💻': 'monitor', '🛠': 'monitor', '💡': 'bulb', '🗂': 'folder', '☁': 'cloud', '📝': 'pencil',
  '✍': 'pencil', '⏳': 'hourglass', '🔌': 'plug', '🔗': 'link', '📌': 'pin', '📍': 'pin', '🔍': 'search', '🔎': 'search', '📞': 'phone', '✅': 'check'
};
const IC_RE = /(?:🎯|📊|📈|👥|🤝|👤|🔔|📅|📋|💰|📣|🧠|🤖|💬|🖼|📸|🎨|🎬|⚠|🎉|🚀|💻|🛠|💡|🗂|☁|📝|✍|⏳|🔌|🔗|📌|📍|🔍|🔎|📞|✅)️?/gu;
const icon = name => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC_PATHS[name] || ''}</svg>`;

function iconizar(root) {
  root.querySelectorAll('[data-ic]').forEach(e => { if (!e.firstChild) e.innerHTML = icon(e.dataset.ic); });
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement && !n.parentElement.closest('svg,script,style,textarea,input,option,select') && /[^\x00-\x7F]/.test(n.nodeValue) && new RegExp(IC_RE.source, 'u').test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  const nos = []; while (w.nextNode()) nos.push(w.currentNode);
  nos.forEach(n => {
    const html = n.nodeValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(IC_RE, m => icon(IC_EMOJI[m.replace('️', '')] || ''));
    const span = document.createElement('span'); span.className = 'icw'; span.innerHTML = html;
    n.replaceWith(...span.childNodes);
  });
}
let icAgendado = false;
new MutationObserver(() => {
  if (icAgendado) return; icAgendado = true;
  requestAnimationFrame(() => { icAgendado = false; try { iconizar(document.body); } catch (e) { console.warn(e); } });
}).observe(document.body, { childList: true, subtree: true, characterData: true });
document.addEventListener('DOMContentLoaded', () => iconizar(document.body));
iconizar(document.body);
