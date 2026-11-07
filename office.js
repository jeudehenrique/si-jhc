/* Escritório virtual — ilustração isométrica em vetor (SVG).
   Cada sala é uma ilha de trabalho com um agente; a pose e as cores mostram o status:
   digitando = trabalhando · balão "?" = aguardando aprovação · cabeça baixa com "Zzz" = parada ·
   tremendo com "!" = atrasada · tomando café = livre. */
const Office = (() => {
  const S = 12, C = Math.cos(Math.PI / 6);
  const VW = 820, VH = 630, OX = 342, OY = 128;
  const W = 45, D = 30;
  const ACCENT = {
    'Design': '#e86aa6', 'Edição de vídeo': '#9b6bff', 'Programação/Sites': '#22b5a7', 'SEO': '#ff9f43',
    'Gestão de anúncios': '#38BDF8', 'Criação de conteúdo': '#2fbf71', 'Prospecção': '#F3B44F', 'Atendimento': '#ff6b6b'
  };
  const ICON = {
    'Design': '🎨', 'Edição de vídeo': '🎬', 'Programação/Sites': '💻', 'SEO': '🔍',
    'Gestão de anúncios': '📈', 'Criação de conteúdo': '✍️', 'Prospecção': '📞', 'Atendimento': '💬'
  };
  // aparência de cada agente, vista de costas (style: 0 curto, 1 comprido, 2 raspado, 3 coque)
  const LOOKS = [
    { skin: '#f6d1b1', hair: '#6b3e1f', style: 1 },
    { skin: '#c68642', hair: '#1a1a1a', style: 0 },
    { skin: '#f1c27d', hair: '#d9a441', style: 3 },
    { skin: '#8d5524', hair: '#1a1a1a', style: 2 },
    { skin: '#e0ac85', hair: '#2b1d14', style: 0 },
    { skin: '#f6d1b1', hair: '#a33b2b', style: 1 },
    { skin: '#c68642', hair: '#3b2a1a', style: 3 },
    { skin: '#e0ac85', hair: '#5a5a5a', style: 2 }
  ];
  const ME = { skin: '#e0ac85', hair: '#1a1a1a', style: 0 };
  const NOMES = { 'Design': 'DESIGN GRÁFICO', 'Edição de vídeo': 'EDIÇÃO DE VÍDEO', 'Gestão de anúncios': 'GESTÃO DE ANÚNCIOS', 'Criação de conteúdo': 'CRIAÇÃO DE CONTEÚDO', 'Programação/Sites': 'SITES', 'SEO': 'SEO', 'Prospecção': 'PROSPECÇÃO', 'Atendimento': 'ATENDIMENTO' };
  const STATUS = { work: '#22C55E', appr: '#F3B44F', stop: '#8b95a7', late: '#FF8A80', free: '#38BDF8' };

  /* ---- projeção e primitivas ---- */
  const f = n => Math.round(n * 10) / 10;
  const P = (x, y, z = 0) => [f(OX + (x - y) * C * S), f(OY + (x + y) * 0.5 * S - z * S)];
  const pts = a => a.map(p => p.join(',')).join(' ');
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.min(255, Math.round(v * k)).toString(16).padStart(2, '0')).join('');
  };
  let out = [];
  const add = s => out.push(s);
  const poly = (a, fill, extra = '') => add(`<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`);
  const line = (a, b, stroke, w = 1, extra = '') => add(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`);
  const quadPts = (x, y, z, w, d) => [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)];
  const faceY = (x1, x2, y, z1, z2) => [P(x1, y, z1), P(x2, y, z1), P(x2, y, z2), P(x1, y, z2)];
  const faceX = (x, y1, y2, z1, z2) => [P(x, y1, z1), P(x, y2, z1), P(x, y2, z2), P(x, y1, z2)];
  const lerp = (a, b, t) => [f(a[0] + (b[0] - a[0]) * t), f(a[1] + (b[1] - a[1]) * t)];

  function box(x, y, z, w, d, h, c) {
    poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], shade(c, .9));
    poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], shade(c, .78));
    poly(quadPts(x, y, z + h, w, d), c);
  }
  function cyl(x, y, z, r, h, c) {
    const [bx, by] = P(x, y, z), [tx, ty] = P(x, y, z + h);
    const rx = f(r * S * 1.2247), ry = f(r * S * .7071);
    add(`<path d="M${f(bx - rx)},${by} A${rx},${ry} 0 0 0 ${f(bx + rx)},${by} L${f(tx + rx)},${ty} A${rx},${ry} 0 0 1 ${f(tx - rx)},${ty} Z" fill="${shade(c, .82)}"/>`);
    add(`<ellipse cx="${tx}" cy="${ty}" rx="${rx}" ry="${ry}" fill="${c}"/>`);
  }
  function plant(x, y, s = 1, pot = '#f2efe9', z = 0) {
    const [gx, gy] = P(x, y, z);
    add(`<ellipse cx="${gx}" cy="${gy}" rx="${f(10 * s)}" ry="${f(5 * s)}" fill="#000" opacity=".08"/>`);
    cyl(x, y, z, .5 * s, 1.1 * s, pot);
    const [cx, cy] = P(x, y, z + 1.1 * s);
    [[-13, -8, -35], [12, -10, 32], [-6, -20, -12], [8, -22, 18], [-17, 0, -62], [16, 0, 58], [0, -13, 0]].forEach(([dx, dy, rot], i) => {
      const lx = f(cx + dx * s), ly = f(cy + dy * s);
      add(`<ellipse cx="${lx}" cy="${ly}" rx="${f(9 * s)}" ry="${f(4.4 * s)}" transform="rotate(${rot} ${lx} ${ly})" fill="${['#2f8f4e', '#3aa65b', '#58c27a'][i % 3]}"/>`);
    });
  }
  function tree(x, y, z, s = 1) {
    const [cx, cy] = P(x, y, z);
    [[0, 0, 26], [-18, 10, 20], [18, 8, 22], [-6, -16, 18], [10, -12, 16]].forEach(([dx, dy, r], i) =>
      add(`<circle cx="${f(cx + dx * s)}" cy="${f(cy + dy * s)}" r="${f(r * s)}" fill="${['#6cbf5a', '#5aae4c', '#7dcc69', '#4f9e44', '#88d575'][i]}"/>`));
  }
  function bubbleIcon(x, y, ch, bg, fg, stroke) {
    add(`<g class="qb"><path d="M${f(x - 4)},${f(y + 6)} L${f(x - 7)},${f(y + 12)} L${f(x + 1)},${f(y + 7.5)} Z" fill="${bg}" stroke="${stroke}" stroke-width="1.5"/>
      <circle cx="${x}" cy="${y}" r="8.5" fill="${bg}" stroke="${stroke}" stroke-width="2"/>
      <text x="${x}" y="${f(y + .5)}" text-anchor="middle" dominant-baseline="central" font-family="Montserrat,sans-serif" font-weight="900" font-size="11" fill="${fg}">${ch}</text></g>`);
  }
  function badge(x, y, z, emoji) {
    const [sx, sy] = P(x, y, z), [gx, gy] = P(x, y, 0);
    add(`<ellipse cx="${gx}" cy="${gy}" rx="8" ry="4" fill="#000" opacity=".08"/>
      <g class="bb"><rect x="${f(sx - 12)}" y="${f(sy - 12)}" width="24" height="24" rx="6" fill="#fff" filter="url(#ofSoft)"/>
      <text x="${sx}" y="${f(sy + 1)}" text-anchor="middle" dominant-baseline="central" font-size="13">${emoji}</text></g>`);
  }

  /* ---- móveis ---- */
  function desk(x, y, w, d, top = '#f7f7f9', leg = '#2b2f38') {
    box(x + .15, y + .15, 0, .2, d - .3, 2.2, leg);
    box(x + w - .35, y + .15, 0, .2, d - .3, 2.2, leg);
    box(x, y, 2.2, w, d, .22, top);
  }
  function screen(k, x1, x2, y, z1, z2) {
    const face = faceY(x1, x2, y, z1, z2);
    const fill = { work: '#0f2a3a', appr: '#F3B44F', stop: '#1a2233', late: '#FF8A80', free: '#0c0f14', chart: '#0f2a3a' }[k];
    poly(face, fill, k === 'late' ? 'class="blink"' : '');
    if (k === 'work') [['#22C55E', .55], ['#7fd4ff', .85], ['#ffffff', .4]].forEach(([c, len], i) => {
      const z = z2 - .35 - i * .35;
      line(P(x1 + .2, y, z), P(x1 + .2 + (x2 - x1 - .4) * len, y, z), c, 1.4, `stroke-linecap="round" class="code" style="animation-delay:${i * .4}s"`);
    });
    if (k === 'chart') [.4, .7, .5, 1].forEach((h, i) => {
      const x = x1 + .3 + i * .45;
      line(P(x, y, z1 + .15), P(x, y, z1 + .15 + h), i === 3 ? '#F3B44F' : '#38BDF8', 3);
    });
    if (k === 'stop') { const [dx, dy] = P((x1 + x2) / 2, y, (z1 + z2) / 2); add(`<circle cx="${dx}" cy="${dy}" r="1.6" fill="#38BDF8" opacity=".6" class="blink"/>`); }
  }
  function monitor(x, y, z, w, k) {
    box(x + w / 2 - .2, y + .05, z, .4, .3, .5, '#2b2f38');
    const lit = { work: 1, appr: 1, late: 1, chart: 1 }[k];
    if (lit) poly(faceY(x, x + w, y + .15, z + .5, z + 2.1), k === 'chart' ? '#38BDF8' : STATUS[k], 'filter="url(#ofGlow)" opacity=".75"');
    box(x, y, z + .5, w, .15, 1.6, '#1f232b');
    screen(k, x + .12, x + w - .12, y + .15, z + .6, z + 2.0);
  }
  function chairBack(bx, by, fx, fy) {
    add(`<ellipse cx="${fx}" cy="${fy}" rx="9" ry="4.5" fill="#2b2f38"/><rect x="${f(bx - 1.2)}" y="${by}" width="2.4" height="${f(fy - by)}" fill="#3a3f4b"/>`);
  }
  function chairFront(bx, by, color) {
    add(`<path d="M${f(bx - 11)},${f(by + 3)} L${f(bx - 11)},${f(by - 11)} Q${f(bx - 11)},${f(by - 17)} ${f(bx - 5)},${f(by - 17)} L${f(bx + 5)},${f(by - 17)} Q${f(bx + 11)},${f(by - 17)} ${f(bx + 11)},${f(by - 11)} L${f(bx + 11)},${f(by + 3)} Z" fill="${color}"/>
      <rect x="${f(bx - 11)}" y="${f(by - 1)}" width="22" height="4" fill="${shade(color, .78)}"/>`);
  }

  /* ---- agente (sentado, de costas, olhando para o monitor) ---- */
  function agent(x, y, z, L, k, shirt, chair = '#2f3440') {
    const [bx, by] = P(x, y, z), [fx, fy] = P(x, y, 0);
    const sd = shade(shirt, .8), skin = L.skin;
    add(`<ellipse class="ring ${k}" cx="${fx}" cy="${fy}" rx="27" ry="13.5" fill="${STATUS[k]}" opacity=".28" stroke="${STATUS[k]}" stroke-width="1.5"/>`);
    chairBack(bx, by, fx, fy);
    let g = `<g class="ag ${k}">`;
    if (k === 'late') {
      g += `<ellipse cx="${f(bx - 9)}" cy="${f(by - 27)}" rx="3.2" ry="8" transform="rotate(28 ${f(bx - 9)} ${f(by - 27)})" fill="${sd}"/>
            <ellipse cx="${f(bx + 9)}" cy="${f(by - 27)}" rx="3.2" ry="8" transform="rotate(-28 ${f(bx + 9)} ${f(by - 27)})" fill="${sd}"/>`;
    } else if (k === 'free') {
      g += `<ellipse cx="${f(bx - 9)}" cy="${f(by - 14)}" rx="3.4" ry="7" fill="${sd}"/>
            <ellipse cx="${f(bx + 10)}" cy="${f(by - 19)}" rx="3.4" ry="7" transform="rotate(-35 ${f(bx + 10)} ${f(by - 19)})" fill="${sd}"/>`;
    } else {
      g += `<ellipse class="a1" cx="${f(bx - 9)}" cy="${f(by - 14)}" rx="3.4" ry="7" fill="${sd}"/>
            <ellipse class="a2" cx="${f(bx + 9)}" cy="${f(by - 14)}" rx="3.4" ry="7" fill="${sd}"/>`;
    }
    g += `<path d="M${f(bx - 9)},${by} L${f(bx - 9)},${f(by - 19)} Q${f(bx - 9)},${f(by - 26)} ${f(bx - 2)},${f(by - 26)} L${f(bx + 2)},${f(by - 26)} Q${f(bx + 9)},${f(by - 26)} ${f(bx + 9)},${f(by - 19)} L${f(bx + 9)},${by} Z" fill="${shirt}"/>
          <path d="M${f(bx + 3)},${f(by - 26)} Q${f(bx + 9)},${f(by - 26)} ${f(bx + 9)},${f(by - 19)} L${f(bx + 9)},${by} L${f(bx + 4)},${by} Z" fill="${sd}" opacity=".55"/>`;
    const hx = bx, hy = f(by - 35);
    let hair = `<circle cx="${hx}" cy="${f(hy - .8)}" r="7.1" fill="${L.hair}" ${L.style === 2 ? 'opacity=".55"' : ''}/>`;
    if (L.style === 1) hair += `<rect x="${f(hx - 7.4)}" y="${f(hy - 2)}" width="14.8" height="13" rx="4" fill="${L.hair}"/>`;
    if (L.style === 3) hair += `<circle cx="${hx}" cy="${f(hy - 8.5)}" r="3.6" fill="${L.hair}"/>`;
    g += `<g class="head"><rect x="${f(hx - 2.2)}" y="${f(by - 30)}" width="4.4" height="5" fill="${skin}"/>
          <circle cx="${f(hx - 6.8)}" cy="${f(hy + 1)}" r="1.8" fill="${skin}"/><circle cx="${f(hx + 6.8)}" cy="${f(hy + 1)}" r="1.8" fill="${skin}"/>
          <circle cx="${hx}" cy="${hy}" r="7" fill="${skin}"/>${hair}</g>`;
    if (k === 'late') g += `<circle cx="${f(bx - 7)}" cy="${f(by - 37)}" r="2.6" fill="${skin}"/><circle cx="${f(bx + 7)}" cy="${f(by - 37)}" r="2.6" fill="${skin}"/>`;
    if (k === 'free') g += `<rect x="${f(bx + 12)}" y="${f(by - 30)}" width="6" height="7" rx="1.2" fill="#ffffff" stroke="#d0d4dc" stroke-width=".6"/>
          <path d="M${f(bx + 18)},${f(by - 28.5)} q3,1.5 0,3.5" fill="none" stroke="#d0d4dc" stroke-width="1.2"/>
          <path class="steam" d="M${f(bx + 14)},${f(by - 33)} q-2,-3 0,-6 M${f(bx + 16.5)},${f(by - 33)} q2,-3 0,-6" fill="none" stroke="#c2c8d2" stroke-width="1.1" stroke-linecap="round"/>`;
    add(g + '</g>');
    chairFront(bx, by, chair);
    if (k === 'stop') add(`<g><text x="${f(bx + 9)}" y="${f(by - 40)}" class="z z1">z</text><text x="${f(bx + 13)}" y="${f(by - 46)}" class="z z2">z</text><text x="${f(bx + 18)}" y="${f(by - 53)}" class="z z3">Z</text></g>`);
    if (k === 'appr') bubbleIcon(f(bx + 14), f(by - 47), '?', '#ffffff', '#b8860b', '#F3B44F');
    if (k === 'late') bubbleIcon(f(bx + 14), f(by - 47), '!', '#FF8A80', '#ffffff', '#ffffff');
  }
  function emptyChair(x, y, z, ring = true) {
    const [bx, by] = P(x, y, z), [fx, fy] = P(x, y, 0);
    if (ring) add(`<ellipse cx="${fx}" cy="${fy}" rx="27" ry="13.5" fill="none" stroke="#F3B44F" stroke-width="1.5" stroke-dasharray="5 4"/>`);
    chairBack(bx, by, fx, fy);
    add(`<ellipse cx="${bx}" cy="${f(by + 1)}" rx="11" ry="5" fill="#3a3f4b"/>`);
    chairFront(bx, by, '#9aa1ad');
  }

  /* ---- cenário ---- */
  function window_(face) {
    poly(face, 'url(#ofGlass)', 'stroke="#0f1a33" stroke-width="1.8"');
    const [a, b, c, d] = face;
    poly([lerp(a, b, .12), lerp(a, b, .3), lerp(d, c, .55), lerp(d, c, .37)], '#ffffff', 'opacity=".2"');
    line(lerp(a, b, .5), lerp(d, c, .5), '#0f1a33', 1.4);
  }
  function background() {
    add(`<rect width="${VW}" height="${VH}" fill="url(#ofSky)"/>`);
    poly([P(-9, -9, -1.1), P(W + 9, -9, -1.1), P(W + 9, D + 9, -1.1), P(-9, D + 9, -1.1)], '#111821');
    for (let x = 3; x <= 45; x += 6) tree(x, -4, 7.6 + (x % 4) * .3);
    for (let y = 4; y <= 28; y += 6) tree(-4, y, 7.6 + (y % 4) * .3);
    // piso de madeira
    box(0, 0, -1, W, D, 1, '#dbb98a');
    for (let y = 1.4; y < D; y += 1.4) line(P(0, y, 0), P(W, y, 0), '#c9a373', .7);
    // paredes do fundo com janelões
    box(-.6, -.6, -1, .6, D + .6, 8, '#1f3260');
    box(0, -.6, -1, W, .6, 8, '#1f3260');
    for (let x = 13; x < 44; x += 6.2) window_(faceY(x, x + 5.4, 0, .7, 6.3));
    for (let y = 12; y < 27; y += 5) window_(faceX(0, y, y + 4.2, .7, 6.3));
    // quadro decorativo na sala do diretor
    poly(faceY(7.6, 10.4, 0, 3, 5.4), '#ffffff', 'stroke="#0f1a33" stroke-width="1.2"');
    poly(faceY(7.9, 9.2, 0, 3.3, 4.6), '#38BDF8', 'opacity=".7"');
    poly(faceY(8.8, 10.1, 0, 3.8, 5.1), '#F3B44F', 'opacity=".8"');
    // trepadeiras no alto das paredes
    for (let x = 1, i = 0; x < W; x += 2.3, i++) {
      const [vx, vy] = P(x, -.3, 7);
      add(`<circle cx="${vx}" cy="${vy}" r="3.8" fill="${i % 2 ? '#3aa65b' : '#58c27a'}"/>`);
      if (i % 3 === 0) { const [dx, dy] = P(x, 0, 6.1); add(`<ellipse cx="${dx}" cy="${dy}" rx="2.3" ry="6.5" fill="#3aa65b"/>`); }
    }
    for (let y = 1, i = 0; y < D; y += 2.3, i++) {
      const [vx, vy] = P(-.3, y, 7);
      add(`<circle cx="${vx}" cy="${vy}" r="3.8" fill="${i % 2 ? '#58c27a' : '#3aa65b'}"/>`);
      if (i % 3 === 1) { const [dx, dy] = P(0, y, 6.1); add(`<ellipse cx="${dx}" cy="${dy}" rx="2.3" ry="6.5" fill="#3aa65b"/>`); }
    }
  }
  function director(k) {
    poly(quadPts(.2, .2, .02, 10.8, 9.8), '#e3e6eb');
    for (let i = 1.6; i < 10.8; i += 1.6) line(P(i, .2, .02), P(i, 10, .02), '#d3d7de', .6);
    for (let j = 1.6; j < 10; j += 1.6) line(P(.2, j, .02), P(11, j, .02), '#d3d7de', .6);
    poly(quadPts(2.4, 4.6, .03, 6.6, 4.6), '#38BDF8', 'opacity=".16" stroke="#38BDF8" stroke-opacity=".4"');
    // estante com livros
    box(0, .8, 0, .9, 4.6, 5.2, '#b7794a');
    [1.3, 2.6, 3.9].forEach((z, j) => {
      line(P(.9, .8, z), P(.9, 5.4, z), '#8a5532', 1.2);
      for (let b = 0; b < 6; b++) {
        const y1 = 1.1 + b * .68 + (j % 2) * .2;
        poly(faceX(.9, y1, y1 + .5, z + .05, z + .9 - (b % 3) * .15), ['#38BDF8', '#F3B44F', '#FF8A80', '#22C55E', '#9b6bff', '#ffffff'][(b + j) % 6]);
      }
    });
    plant(1.6, 8.8, 1.3);
    // mesa executiva
    box(3, 2.2, 0, 5.6, 2.4, 2.3, '#9a6237');
    box(2.9, 2.1, 2.3, 5.8, 2.6, .18, '#c48850');
    monitor(3.5, 2.6, 2.48, 2.1, k);
    monitor(5.9, 2.6, 2.48, 2.1, 'chart');
    box(4.7, 3.6, 2.48, 1.6, .55, .06, '#e3e5ea');
    agent(5.6, 6.2, 1.6, ME, k, '#1b2440', '#3a2a20');
    // logo da JH na parede
    const [lx, ly] = P(4.6, 0, 6.2);
    add(`<circle cx="${lx}" cy="${ly}" r="15" fill="#000" stroke="#38BDF8" stroke-width="2"/><text x="${lx}" y="${f(ly + 1)}" text-anchor="middle" dominant-baseline="central" font-size="15">🚀</text>`);
  }
  function glassWalls() {   // paredes SÓLIDAS da sala do gerente geral (azul da SI), baixas para o personagem continuar visível
    const wall = (face, c) => { poly(face, shade(c, .7), `stroke="${c}" stroke-width="1.2"`); line(face[3], face[2], '#9cc7ff', 4.5, 'stroke-linecap="round"'); };
    wall(faceX(11, .2, 10, 0, 3.2), '#38BDF8');
    wall(faceY(0, 7, 10, 0, 3.2), '#38BDF8');
    wall(faceY(9, 11, 10, 0, 3.2), '#38BDF8');
    box(10.85, 9.85, 0, .3, .3, 3.3, '#9cc7ff');
  }
  const x0v = 1.6; // início das mesas das vagas
  function vacancies(list) {
    poly(quadPts(.8, 11.5, .03, 10, 15.7), '#F3B44F', 'fill-opacity=".07" stroke="#F3B44F" stroke-width="1.5" stroke-dasharray="6 5"');
    list.forEach((v, n) => {
      const x0 = x0v, y0 = 12.4 + n * 7.4;
      desk(x0 + 1, y0 + 1.2, 6, 2.6);
      monitor(x0 + 2.7, y0 + 1.7, 2.42, 2.6, 'free');
      for (let j = 0; j < Math.min(v.total, 6); j++) box(x0 + 5.3, y0 + 2.3, 2.42 + j * .14, 1.2, .9, .12, j % 2 ? '#e9ecf2' : '#ffffff');
      emptyChair(x0 + 4, y0 + 5.2, 1.6);
    });
    plant(10.2, 26.4, 1.1, '#c97a4a');
  }
  const stationOrigin = i => [12 + (i % 4) * 8, i < 4 ? 1 : 12];
  const mix = (hex, t) => {
    const n = parseInt(hex.slice(1), 16);
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('');
  };
  // cada setor tem o seu piso colorido, bem delimitado
  function stationFloor(s) {
    const [x0, y0] = stationOrigin(s.i), acc = ACCENT[s.room];
    poly(quadPts(x0, y0, .03, 8, 9), mix(acc, .6));
    for (let i = 1; i < 8; i++) line(P(x0 + i, y0, .04), P(x0 + i, y0 + 9, .04), '#ffffff', .6, 'opacity=".35"');
    for (let j = 1; j < 9; j++) line(P(x0, y0 + j, .04), P(x0 + 8, y0 + j, .04), '#ffffff', .6, 'opacity=".35"');
    poly(quadPts(x0, y0, .05, 8, 9), 'none', `stroke="${acc}" stroke-width="3" stroke-linejoin="round"`);
  }
  // divisória SÓLIDA na cor do setor, com trilho claro em cima
  function glassWall(face, acc) {
    poly(face, shade(acc, .7), `stroke="${acc}" stroke-width="1.1"`);
    line(face[3], face[2], mix(acc, .45), 4.5, 'stroke-linecap="round"');
  }
  // nome do setor pintado no chão, deitado na perspectiva do piso; desenhado por último para nada tapar
  function stationLabel(s) {
    const [x0, y0] = stationOrigin(s.i), acc = ACCENT[s.room], name = s.short;
    const size = Math.min(1.45, 6.9 / (name.length * .76));
    const [ex, ey] = P(x0 + 4, y0 + 7.4, .06);
    add(`<g transform="matrix(${f(C * S)} ${f(.5 * S)} ${f(-C * S)} ${f(.5 * S)} ${ex} ${ey})">
      <text text-anchor="middle" dominant-baseline="central" font-family="Inter,sans-serif" font-weight="800" font-size="${f(size)}" letter-spacing=".05" fill="${shade(acc, .55)}" stroke="#ffffff" stroke-width=".22" stroke-linejoin="round" paint-order="stroke">${name}</text></g>`);
  }
  // placa com o nome da sala pintada na parede dos fundos (plano y = const)
  function wallSign(xc, y, nome, cor, apagada) {
    const [ex, ey] = P(xc, y, 5.3), w = 7, h = 1.5, ta = f(Math.min(1, 6.5 / (nome.length * .62 * .85)));
    add(`<g transform="matrix(${f(C * S)} ${f(.5 * S)} 0 ${S} ${ex} ${ey})" opacity="${apagada ? .75 : 1}">
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx=".25" fill="${cor}" stroke="#ffffff" stroke-width=".12"/>
      <text text-anchor="middle" dominant-baseline="central" font-family="Montserrat,Inter,sans-serif" font-weight="900" font-size=".85" textLength="${f(Math.min(6.5, nome.length * .62 * .85))}" lengthAdjust="spacingAndGlyphs" fill="#ffffff" stroke="${shade(cor, .5)}" stroke-width=".08" paint-order="stroke">${nome}</text></g>`);
    void ta;
  }
  function station(s) {
    const [x0, y0] = stationOrigin(s.i);
    const acc = ACCENT[s.room];
    if (s.i % 4 > 0) glassWall(faceX(x0, y0, y0 + 9, 0, 2.6), acc);
    if (s.i >= 4) glassWall(faceY(x0, x0 + 8, y0, 0, 6.1), acc);
    wallSign(x0 + 4, s.i >= 4 ? y0 : 0, NOMES[s.room], acc, !s.hasAgent);
    desk(x0 + 1, y0 + 1.2, 6, 2.6);
    monitor(x0 + 2.7, y0 + 1.7, 2.42, 2.6, s.k);
    box(x0 + 3.1, y0 + 2.75, 2.42, 1.8, .6, .06, '#e3e5ea');
    cyl(x0 + 6.1, y0 + 2.5, 2.42, .2, .35, '#ffffff');
    if (s.hasAgent) agent(x0 + 4, y0 + 5.2, 1.6, LOOKS[s.i], s.k, acc);
    else emptyChair(x0 + 4, y0 + 5.2, 1.6, false);   // sala sem agente ainda: só a cadeira vazia
    badge(x0 + 7.2, y0 + 1.1, 4.4, ICON[s.room]);  }
  function lounge() {
    poly(quadPts(13, 21.6, .02, 16, 7.6), '#f3e8d5', 'stroke="#e2d3b8"');
    box(14.5, 22, 0, 8, .8, 2.3, '#3b4150');
    box(14.5, 22.8, 0, 8, 1.8, 1.1, '#4a5163');
    box(14.5, 22, 0, .7, 2.6, 1.6, '#3b4150');
    box(21.8, 22, 0, .7, 2.6, 1.6, '#3b4150');
    box(15.5, 22.9, 1.1, 1.6, 1.1, .4, '#F3B44F');
    box(20, 22.9, 1.1, 1.6, 1.1, .4, '#38BDF8');
    cyl(18.5, 26.4, 0, 1.4, .9, '#f7f7f9');
    plant(18.5, 26.4, .45, '#ffffff', .9);
    cyl(24.6, 26.6, 0, .8, .9, '#e9d8bd');
    plant(13.8, 22.3, 1.5);
    plant(28.8, 22.6, 1.2, '#c97a4a');
    // copa
    box(33, 27.2, 0, 10.5, 1.6, 2.3, '#f4f4f6');
    box(32.9, 27.1, 2.3, 10.7, 1.8, .2, '#c48850');
    box(34.2, 27.4, 2.5, 1.2, 1, 1.4, '#2b2f38');
    cyl(36.3, 27.9, 2.5, .22, .4, '#ffffff');
    cyl(37, 27.9, 2.5, .22, .4, '#F3B44F');
    plant(42.4, 27.9, .7, '#ffffff', 2.5);
    plant(44, 23.4, 1.5, '#c97a4a');
    plant(44, 1.4, 1.6);
    plant(11.6, 20.9, 1);
  }
  function bushes() {
    for (let x = 1; x < W + 2; x += 2.6) { const [bx, by] = P(x, D + 1.4, -1); add(`<circle cx="${bx}" cy="${by}" r="${7 + (x * 7) % 4}" fill="${x % 2 ? '#7cc767' : '#68b856'}"/>`); }
    for (let y = 1; y < D; y += 2.6) { const [bx, by] = P(W + 1.4, y, -1); add(`<circle cx="${bx}" cy="${by}" r="${7 + (y * 5) % 4}" fill="${y % 2 ? '#68b856' : '#7cc767'}"/>`); }
  }
  function defs() {
    add(`<defs>
      <linearGradient id="ofSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A0E13"/><stop offset="1" stop-color="#0A0E13"/></linearGradient>
      <linearGradient id="ofGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f86e8"/><stop offset=".6" stop-color="#2a5fb8"/><stop offset="1" stop-color="#1c3f82"/></linearGradient>
      <filter id="ofGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
      <filter id="ofSoft" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".18"/></filter>
    </defs>`);
  }
  const hit = (a, attrs, label) => add(`<polygon class="spot" points="${pts(a)}" ${attrs} tabindex="0" role="button" aria-label="${label}"/>`);

  /* ---- montagem: SVG + rótulos em HTML por cima ---- */
  function html(data) {
    out = [];
    add(`<svg viewBox="0 0 ${VW} ${VH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Escritório virtual com o status de cada sala">`);
    defs(); background(); director(data.me.k); glassWalls(); wallSign(5.5, 0, 'GERENTE GERAL', '#38BDF8', false); if (data.vagas.length) vacancies(data.vagas);
    data.st.forEach(stationFloor);
    data.st.forEach(station);
    lounge(); bushes();
    hit(quadPts(.2, .2, 0, 10.8, 9.8), 'data-view="alertas"', `Agente 1, gerente geral: ${data.me.label}`);
    data.vagas.forEach((v, n) => hit(quadPts(.8, 11.5 + n * 7.85, 0, 10, 7.85), `data-owner="${v.owner}"`, `Vaga ${v.short}`));
    data.st.forEach(s => { const [x0, y0] = stationOrigin(s.i); hit(quadPts(x0 + .2, y0 + .2, 0, 7.6, 7.6), s.hasAgent ? `data-view="sala:${s.agentKey}"` : `data-room="${s.room}"`, s.hasAgent ? `${s.agentName}: ${s.label}` : `${s.room}: sem agente ainda`); });
    add('</svg>');

    const at = ([x, y]) => `left:${(x / VW * 100).toFixed(2)}%;top:${(y / VH * 100).toFixed(2)}%`;
    const notif = (p, a, dx = 7.5) => a.pend ? `<div class="notif ${a.late ? 'late' : ''}" style="${at(p)};margin-left:${dx}cqw">🔔 ${a.pend}</div>` : '';
    // uma etiqueta clara em cima de cada personagem: nome, função e se está trabalhando ou livre
    const tag = (p, num, title, k, label) => `<div class="ntag ${k}" style="${at(p)}"><b>Agente ${num}</b><span>${title}</span><em><i></i>${label}</em></div>`;
    let ov = tag(P(5.6, 6.2, 5.4), 1, 'Gerente geral', data.me.k, data.me.label) + notif(P(5.6, 6.2, 5.4), data.me, 8.5);
    data.st.forEach(s => {
      const [x0, y0] = stationOrigin(s.i), p = P(x0 + 4, y0 + 5.2, 5.4);
      if (s.hasAgent) ov += tag(p, s.num, s.title, s.k, s.label) + notif(p, s, 8.5);   // sala sem agente: sem etiqueta e sem sino (fica na lista abaixo)
    });
    return `<div class="office-scroll"><div class="office-wrap">${out.join('')}${ov}</div></div>`;
  }
  return { html };
})();
