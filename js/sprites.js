// Arte em pixel (32x32) gerada por código: tiles, Viajante, animais e efeitos de luz.
// Tudo é desenhado com retângulos para manter os pixels nítidos.
const Art = (() => {
  const T = 32;

  const C = {
    grass: '#5f9e3f', grass2: '#4e8a34', grass3: '#7dba55', grass4: '#3f7429',
    tall: '#3d7428', tall2: '#2c5a1d', tall3: '#5a9a3a',
    leaf: '#2f6b2a', leaf2: '#3f8a36', leaf3: '#1f4a1c', leaf4: '#58a548', trunk: '#6b4626', trunk2: '#4f321a',
    water: '#3b7cc4', water2: '#6aaee8', water3: '#2b62a3', foam: '#d8efff',
    abyss: '#121831', abyss2: '#222c55', abyss3: '#0a0d1f',
    void: '#5b5770', void2: '#4c4862', void3: '#6c6884',
    sand: '#e4cf96', sand2: '#cfb57a', sand3: '#f2e2b4',
    soil: '#8a6440', soil2: '#6f4f2e', soil3: '#a07a50',
    rock: '#8e8c88', rock2: '#b9b6ae', rock3: '#5f5d59',
  };

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function r(g, x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  }

  // Elipse "pixelada" (linhas de retângulos), para copas, corpos e pedras.
  function blob(g, cx, cy, rx, ry, c) {
    g.fillStyle = c;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      if (w > 0) g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
    }
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
    const rr = f(n >> 16), gg = f((n >> 8) & 255), bb = f(n & 255);
    return '#' + ((1 << 24) | (rr << 16) | (gg << 8) | bb).toString(16).slice(1);
  }

  function mk(draw) {
    const c = document.createElement('canvas');
    c.width = c.height = T;
    draw(c.getContext('2d'));
    return c;
  }

  function speckle(g, seed, base, cols, n, h = 2) {
    r(g, 0, 0, T, T, base);
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      r(g, (R() * 31) | 0, (R() * 30) | 0, 1 + ((R() * 2) | 0), 1 + ((R() * h) | 0), cols[(R() * cols.length) | 0]);
    }
  }

  function grassBase(g, s) {
    speckle(g, s, C.grass, [C.grass2, C.grass2, C.grass3], 26, 3);
    const R = rng(s * 3 + 1);
    for (let i = 0; i < 4; i++) {
      const x = 2 + ((R() * 27) | 0), y = 4 + ((R() * 24) | 0);
      r(g, x, y, 1, 3, C.grass4); r(g, x + 1, y - 1, 1, 3, C.grass3);
    }
  }

  const tiles = {};
  tiles['.'] = [11, 23, 37, 53].map(s => mk(g => grassBase(g, s)));
  tiles[':'] = [5, 9, 13].map(s => mk(g => {
    speckle(g, s, C.sand, [C.sand2, C.sand3], 22);
    const R = rng(s);
    if (R() < 0.5) { r(g, 8 + ((R() * 12) | 0), 18, 3, 2, '#f6eee0'); r(g, 9 + ((R() * 12) | 0), 19, 1, 1, '#e0a7a0'); }
  }));
  tiles['d'] = [3, 8].map(s => mk(g => speckle(g, s, C.soil, [C.soil2, C.soil3], 30)));
  tiles['v'] = [4, 6, 10].map(s => mk(g => {
    speckle(g, s, C.void, [C.void2, C.void3], 28);
    const R = rng(s * 5);
    for (let i = 0; i < 2; i++) blob(g, 6 + R() * 20, 6 + R() * 20, 3, 2, C.void2);
  }));

  tiles[','] = [3, 7, 19].map(s => mk(g => {
    grassBase(g, s);
    const R = rng(s * 7);
    for (let i = 0; i < 7; i++) {
      const x = 2 + ((R() * 25) | 0), y = 8 + ((R() * 16) | 0);
      r(g, x, y + 2, 1, 6, C.tall); r(g, x + 4, y + 2, 1, 6, C.tall);
      r(g, x + 1, y, 1, 8, C.tall2); r(g, x + 3, y + 1, 1, 7, C.tall2);
      r(g, x + 2, y - 1, 1, 9, C.tall3);
    }
  }));

  function flowers(g, s) {
    grassBase(g, s);
    const R = rng(s * 13);
    const cols = ['#f4e36b', '#f08fb0', '#ffffff', '#c58cf0', '#ff9f5a'];
    for (let i = 0; i < 5; i++) {
      const x = 3 + ((R() * 24) | 0), y = 3 + ((R() * 24) | 0);
      const c = cols[(R() * cols.length) | 0];
      r(g, x + 1, y + 3, 1, 3, C.leaf2);
      r(g, x, y, 3, 3, c); r(g, x + 1, y - 1, 1, 5, c); r(g, x - 1, y + 1, 5, 1, c);
      r(g, x + 1, y + 1, 1, 1, '#e8a33a');
    }
  }
  tiles['f'] = [2, 4, 6].map(s => mk(g => flowers(g, s)));

  tiles['G'] = [mk(g => {
    r(g, 0, 0, T, T, C.soil);
    for (let y = 2; y < 32; y += 8) {
      r(g, 0, y, 32, 3, C.soil2);
      r(g, 0, y + 3, 32, 1, C.soil3);
      for (let x = 3; x < 32; x += 7) r(g, x, y + 1, 2, 1, '#5a3e22');
    }
  })];

  function treeTile(seed, fruit) {
    return mk(g => {
      grassBase(g, seed);
      g.fillStyle = 'rgba(0,0,0,0.2)';
      blob(g, 16, 28, 11, 3, 'rgba(0,0,0,0.22)');
      r(g, 13, 20, 6, 10, C.trunk);
      r(g, 13, 20, 2, 10, C.trunk2);
      r(g, 11, 28, 10, 2, C.trunk);
      blob(g, 16, 13, 14, 11, C.leaf3);
      blob(g, 16, 12, 13, 10, C.leaf);
      blob(g, 11, 9, 6, 5, C.leaf2);
      blob(g, 21, 11, 5, 4, C.leaf2);
      blob(g, 10, 7, 3, 2, C.leaf4);
      blob(g, 20, 8, 2, 2, C.leaf4);
      if (fruit) {
        const R = rng(seed);
        for (let i = 0; i < 8; i++) {
          const fx = 5 + ((R() * 21) | 0), fy = 5 + ((R() * 14) | 0);
          r(g, fx, fy, 3, 3, i % 2 ? '#e0453a' : '#f2a531');
          r(g, fx, fy, 1, 1, '#ffd9a0');
        }
      }
    });
  }
  tiles['#'] = [treeTile(41, false), treeTile(43, false)];
  tiles['Y'] = [treeTile(47, true), treeTile(49, true)];

  tiles['O'] = [mk(g => {
    grassBase(g, 51);
    blob(g, 16, 29, 14, 3, 'rgba(0,0,0,0.25)');
    r(g, 11, 17, 10, 14, '#5a3a1e');
    r(g, 11, 17, 3, 14, '#3f2812');
    r(g, 6, 28, 20, 3, '#5a3a1e');
    blob(g, 16, 10, 16, 10, '#1c4219');
    blob(g, 16, 9, 15, 9, '#2a5e26');
    blob(g, 9, 6, 7, 4, '#3f8a36');
    blob(g, 22, 8, 6, 4, '#3f8a36');
    blob(g, 15, 3, 5, 2, '#58a548');
  })];

  tiles['b'] = [mk(g => {
    grassBase(g, 63);
    blob(g, 16, 26, 12, 3, 'rgba(0,0,0,0.2)');
    blob(g, 16, 18, 13, 9, C.leaf3);
    blob(g, 16, 17, 12, 8, C.leaf);
    blob(g, 11, 14, 5, 4, C.leaf2);
    blob(g, 20, 15, 4, 3, C.leaf2);
    r(g, 10, 17, 2, 2, '#b8e6ff'); r(g, 21, 19, 2, 2, '#b8e6ff'); r(g, 16, 13, 1, 1, '#ffffff');
  })];

  tiles['r'] = [mk(g => {
    grassBase(g, 77);
    blob(g, 16, 25, 12, 3, 'rgba(0,0,0,0.25)');
    blob(g, 16, 18, 12, 9, C.rock3);
    blob(g, 16, 17, 11, 8, C.rock);
    blob(g, 12, 14, 5, 3, C.rock2);
    r(g, 18, 18, 5, 1, C.rock3);
  })];

  // Água com 3 quadros de animação.
  tiles['~'] = [0, 1, 2].map(fr => mk(g => {
    r(g, 0, 0, T, T, C.water);
    const o = fr * 5;
    r(g, (3 + o) % 32, 6, 7, 1, C.water2);
    r(g, (17 + o) % 32, 13, 9, 1, C.water2);
    r(g, (6 + o) % 32, 23, 6, 1, C.water2);
    r(g, (23 + o) % 32, 27, 5, 1, C.water3);
    r(g, (1 + o) % 32, 17, 4, 1, C.water3);
  }));

  tiles['A'] = [0, 1, 2].map(fr => mk(g => {
    r(g, 0, 0, T, T, C.abyss);
    const o = fr * 6;
    r(g, (5 + o) % 32, 8, 9, 1, C.abyss2);
    r(g, (19 + o) % 32, 20, 7, 1, C.abyss2);
    r(g, (2 + o) % 32, 27, 5, 1, C.abyss3);
  }));

  const SOLID = new Set(['A', '~', '#', 'Y', 'O', 'b', 'r']);
  const WET = new Set(['~', 'A']);

  function tile(ch, x, y, time) {
    const set = tiles[ch] || tiles['.'];
    if (WET.has(ch)) return set[Math.floor(time * 2 + (x * 3 + y * 5) * 0.3) % 3];
    return set[(x * 7 + y * 13) % set.length];
  }

  // Espuma onde a água encosta na terra.
  function edges(g, ch, x, y, px, py, at, time) {
    if (!WET.has(ch)) return;
    const foam = ch === '~' ? C.foam : '#3a4470';
    const wob = Math.round(Math.sin(time * 2 + x + y) * 1);
    const dry = (dx, dy) => { const t = at(x + dx, y + dy); return t && !WET.has(t); };
    g.fillStyle = foam;
    if (dry(0, -1)) g.fillRect(px, py + 1 + wob, T, 2);
    if (dry(0, 1)) g.fillRect(px, py + T - 3 - wob, T, 2);
    if (dry(-1, 0)) g.fillRect(px + 1 + wob, py, 2, T);
    if (dry(1, 0)) g.fillRect(px + T - 3 - wob, py, 2, T);
  }

  // ---------- Viajante (molde 33x34 de dados/viajante.js, com as cores escolhidas) ----------

  const vjCache = new Map();

  // Aceita a aparência nova ({ estilo, cabelo, pele... }) e a antiga ({ robe, hair, long }).
  function normalizar(ap) {
    const D = window.DADOS_VIAJANTE;
    if (ap && ap.cabelo) return { ...D.padrao, ...ap };
    return { ...D.padrao, estilo: ap && ap.long ? 'longo' : 'curto' };
  }

  function paleta(ap) {
    const D = window.DADOS_VIAJANTE;
    const pick = (lista, id) => lista.find(x => x.id === id) || lista[0];
    const [f, g, n, h] = pick(D.cabelos, ap.cabelo).tons;
    const [j, d, o] = pick(D.peles, ap.pele).tons;
    const [T, S] = pick(D.tunicas, ap.tunica).tons;
    return {
      f, g, n, h, j, d, o, T, S,
      e: pick(D.olhos, ap.olhos).cor, c: pick(D.camisas, ap.camisa).cor,
      B: pick(D.faixas, ap.faixa).cor, p: pick(D.calcas, ap.calca).cor,
      m: '#000000', w: '#ffffff', i: D.contorno,
    };
  }

  // Escolhe a vista (frente, lado ou costas) e aplica o passo: uma perna sobe 1 pixel.
  function moldePara(estilo, dir, frame) {
    const M = window.DADOS_VIAJANTE.moldes;
    const m = M[estilo] || M.curto;
    const vista = Array.isArray(m) ? m : (dir === 'up' ? m.costas : dir === 'left' || dir === 'right' ? m.lado : m.frente) || m.frente;
    let g = vista.map(r => r.split(''));
    if (dir === 'left') g = g.map(r => r.slice().reverse());
    if (frame) {
      const meio = Math.floor(g[0].length / 2) + 1;
      const lado = frame === 1 ? x => x <= meio : x => x > meio;
      for (let y = 28; y < g.length; y++) {
        for (let x = 0; x < g[y].length; x++) {
          if (!lado(x)) continue;
          g[y][x] = y + 1 < g.length ? g[y + 1][x] : '.';
        }
      }
    }
    return g;
  }

  function viajante(ap, dir = 'down', frame = 0) {
    const a = normalizar(ap);
    const key = JSON.stringify([a, dir, frame]);
    let c = vjCache.get(key);
    if (c) return c;
    const pal = paleta(a);
    const g = moldePara(a.estilo, dir, frame);
    c = document.createElement('canvas');
    c.width = g[0].length;
    c.height = g.length;
    const ctx = c.getContext('2d');
    for (let y = 0; y < g.length; y++) {
      for (let x = 0; x < g[y].length; x++) {
        const col = pal[g[y][x]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    vjCache.set(key, c);
    return c;
  }

  // Desenha o Viajante com os pés na base da casa (o molde é um pouco maior que 32x32).
  function person(g, ap, dir, step) {
    blob(g, 16, 30, 8, 2, 'rgba(0,0,0,0.25)');
    g.drawImage(viajante(ap, dir, step), -2, -2 - (step ? 1 : 0));
  }

  // ---------- Animais (32x32, virados para a direita) ----------

  function shadow(g, w) {
    blob(g, 16, 29, w / 2, 2, 'rgba(0,0,0,0.22)');
  }
  const eye = (g, x, y) => { r(g, x, y, 2, 2, '#1d1208'); r(g, x, y, 1, 1, '#ffffff'); };

  const animals = {
    ovelha(g, step) {
      const b = step ? 1 : 0;
      shadow(g, 22);
      r(g, 8, 23, 2, 5 + b, '#2b2b2b'); r(g, 13, 23, 2, 5 - b, '#2b2b2b');
      r(g, 18, 23, 2, 5 - b, '#2b2b2b'); r(g, 22, 23, 2, 5 + b, '#2b2b2b');
      blob(g, 15, 17, 11, 8, '#d9d5c8');
      blob(g, 15, 16, 10, 7, '#f3f1e8');
      blob(g, 9, 12, 4, 3, '#fbfaf5'); blob(g, 16, 11, 4, 3, '#fbfaf5'); blob(g, 21, 13, 3, 3, '#fbfaf5');
      r(g, 23, 11, 7, 9, '#2e2a26');
      r(g, 24, 10, 5, 2, '#2e2a26');
      r(g, 22, 12, 2, 3, '#2e2a26');
      eye(g, 26, 13);
      r(g, 29, 17, 1, 1, '#6b5a50');
      blob(g, 25, 10, 3, 2, '#fbfaf5');
    },
    leao(g, step) {
      const b = step ? 1 : 0;
      shadow(g, 26);
      r(g, 1, 12, 4, 2, '#c8964a'); r(g, 0, 10, 2, 4, '#6b3a12');
      r(g, 5, 13, 18, 10, '#c8964a');
      r(g, 5, 20, 18, 3, '#a87a38');
      r(g, 6, 22, 3, 6 - b, '#a87a38'); r(g, 11, 22, 3, 6 + b, '#b88a44');
      r(g, 17, 22, 3, 6 + b, '#a87a38'); r(g, 21, 22, 3, 6 - b, '#b88a44');
      blob(g, 23, 12, 8, 9, '#8a4f1f');
      blob(g, 23, 11, 7, 8, '#a35e26');
      blob(g, 25, 13, 5, 5, '#d9a85a');
      eye(g, 25, 11);
      r(g, 29, 14, 2, 2, '#3a2410');
      r(g, 25, 17, 4, 1, '#8a5a2a');
      r(g, 20, 5, 3, 3, '#a35e26');
    },
    coelho(g, step) {
      const b = step ? 2 : 0;
      shadow(g, 16);
      blob(g, 14, 21 - b, 8, 6, '#c9b7a2');
      blob(g, 13, 22 - b, 6, 4, '#ddd0bf');
      blob(g, 6, 20 - b, 3, 3, '#ffffff');
      blob(g, 21, 15 - b, 5, 5, '#c9b7a2');
      r(g, 18, 3 - b, 3, 10, '#c9b7a2'); r(g, 22, 4 - b, 3, 9, '#b8a690');
      r(g, 19, 5 - b, 1, 6, '#f2b8c6'); r(g, 23, 6 - b, 1, 5, '#f2b8c6');
      eye(g, 22, 14 - b);
      r(g, 25, 17 - b, 1, 1, '#e08a9a');
      r(g, 10, 26, 4, 2, '#a8957f'); r(g, 17, 26, 4, 2, '#a8957f');
    },
    cervo(g, step) {
      const b = step ? 1 : 0;
      shadow(g, 22);
      r(g, 6, 14, 16, 9, '#a8693a');
      r(g, 6, 20, 16, 3, '#8a542c');
      for (const [x, y] of [[9, 15], [13, 17], [17, 15], [11, 19]]) r(g, x, y, 2, 1, '#f1e2c8');
      r(g, 7, 22, 2, 7 - b, '#7a4a26'); r(g, 11, 22, 2, 7 + b, '#7a4a26');
      r(g, 16, 22, 2, 7 + b, '#7a4a26'); r(g, 20, 22, 2, 7 - b, '#7a4a26');
      r(g, 4, 14, 2, 3, '#f1e2c8');
      r(g, 20, 8, 4, 8, '#a8693a');
      r(g, 22, 6, 8, 6, '#b87a48');
      r(g, 28, 9, 2, 3, '#c98c5a');
      eye(g, 25, 7);
      r(g, 30, 10, 1, 1, '#1d1208');
      r(g, 22, 0, 2, 6, '#6b4626'); r(g, 26, 0, 2, 6, '#6b4626');
      r(g, 20, 1, 2, 1, '#6b4626'); r(g, 28, 1, 2, 1, '#6b4626'); r(g, 21, 3, 1, 1, '#6b4626');
    },
    elefante(g, step) {
      const b = step ? 1 : 0;
      shadow(g, 28);
      blob(g, 13, 15, 12, 9, '#7a7c86');
      blob(g, 13, 14, 11, 8, '#8d8f99');
      r(g, 4, 21, 5, 8 - b, '#7a7c86'); r(g, 10, 21, 5, 8 + b, '#868892');
      r(g, 16, 21, 5, 8 + b, '#7a7c86');
      blob(g, 23, 11, 7, 7, '#9a9ca6');
      blob(g, 18, 12, 4, 6, '#7a7c86');
      r(g, 27, 14, 3, 12, '#9a9ca6'); r(g, 28, 25, 3, 2, '#9a9ca6');
      eye(g, 24, 9);
      r(g, 26, 16, 2, 4, '#f4f1e6');
      r(g, 1, 12, 2, 6, '#7a7c86');
    },
    tartaruga(g, step) {
      const b = step ? 1 : 0;
      shadow(g, 22);
      blob(g, 14, 18, 10, 6, '#3e6a2e');
      blob(g, 14, 17, 9, 5, '#4f7a3a');
      for (const [x, y] of [[9, 15], [14, 14], [19, 15], [11, 19], [17, 19]]) r(g, x, y, 3, 2, '#6f9a52');
      r(g, 23, 17 + b, 6, 5, '#9bb86a');
      eye(g, 26, 18 + b);
      r(g, 7, 23, 4, 3, '#9bb86a'); r(g, 17, 23, 4, 3, '#9bb86a');
      r(g, 3, 19, 3, 2, '#9bb86a');
    },
    // Criaturas do mar e do céu
    peixe(g) {
      r(g, 6, 13, 16, 8, '#f08a3a');
      r(g, 8, 12, 12, 1, '#f08a3a'); r(g, 8, 21, 12, 1, '#f08a3a');
      r(g, 1, 11, 5, 12, '#f2b36a');
      r(g, 11, 13, 2, 8, '#ffffff'); r(g, 16, 13, 2, 8, '#ffffff');
      eye(g, 19, 15);
    },
    golfinho(g) {
      blob(g, 15, 17, 12, 5, '#6a8aa8');
      blob(g, 15, 18, 11, 3, '#d8e4ee');
      r(g, 26, 16, 5, 3, '#7a9ab8');
      r(g, 13, 9, 4, 5, '#5a7a98');
      r(g, 0, 11, 4, 5, '#5a7a98'); r(g, 0, 19, 4, 5, '#5a7a98');
      eye(g, 22, 15);
    },
    baleia(g) {
      blob(g, 15, 18, 14, 8, '#34507a');
      blob(g, 15, 21, 12, 4, '#c8d6e5');
      eye(g, 23, 16);
      r(g, 14, 4, 2, 6, '#d8f0ff'); r(g, 11, 3, 2, 2, '#d8f0ff'); r(g, 17, 3, 2, 2, '#d8f0ff');
    },
    pomba(g, step) {
      const w = step ? -4 : 0;
      blob(g, 15, 18, 8, 5, '#f4f4f0');
      blob(g, 23, 14, 4, 4, '#f4f4f0');
      r(g, 27, 15, 3, 2, '#e8a33a');
      eye(g, 24, 13);
      r(g, 9, 6 - w, 10, 9 + w, '#e4e4de');
      r(g, 3, 17, 5, 4, '#e4e4de');
    },
    aguia(g, step) {
      const w = step ? 4 : 0;
      blob(g, 15, 16, 8, 5, '#6b4626');
      r(g, 0, 10 + w, 11, 5, '#5a3a1e'); r(g, 20, 10 + w, 11, 5, '#5a3a1e');
      r(g, 0, 14 + w, 4, 2, '#3f2812'); r(g, 27, 14 + w, 4, 2, '#3f2812');
      blob(g, 24, 11, 4, 4, '#f4f1e6');
      r(g, 27, 12, 3, 2, '#f2b331');
      eye(g, 24, 10);
      r(g, 5, 18, 5, 4, '#f4f1e6');
    },
    beijaflor(g, step) {
      blob(g, 16, 17, 6, 4, '#2fa37a');
      blob(g, 21, 14, 3, 3, '#e04a6a');
      r(g, 24, 15, 7, 1, '#2b2b2b');
      eye(g, 21, 13);
      r(g, 6, 18, 5, 2, '#2fa37a');
      r(g, 12, step ? 6 : 10, 6, 4, 'rgba(200,240,230,0.85)');
    },
  };

  // Animal desenhado a partir de dados/animais.js (passo: as patas da frente sobem 1 pixel).
  const anCache = new Map();
  function animal(kind, step) {
    const key = kind + step;
    let c = anCache.get(key);
    if (c) return c;
    const d = window.DADOS_ANIMAIS[kind];
    const g = d.molde.map(r => r.split(''));
    if (step) {
      for (let y = 22; y < g.length - 1; y++) {
        for (let x = 16; x < g[y].length; x++) g[y][x] = g[y + 1][x];
      }
    }
    c = document.createElement('canvas');
    c.width = g[0].length; c.height = g.length;
    const ctx = c.getContext('2d');
    for (let y = 0; y < g.length; y++) {
      for (let x = 0; x < g[y].length; x++) {
        const col = d.cores[g[y][x]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    anCache.set(key, c);
    return c;
  }

  function entity(g, spr, x, y, dir, step, time, scale = 1) {
    g.save();
    g.translate(Math.round(x), Math.round(y));
    if (scale !== 1) g.scale(scale, scale);
    if (spr.kind === 'person') {
      person(g, spr, dir, step);
    } else if (window.DADOS_ANIMAIS && window.DADOS_ANIMAIS[spr.kind]) {
      if (dir === 'left') { g.translate(T, 0); g.scale(-1, 1); }
      blob(g, 16, 29, 10, 2, 'rgba(0,0,0,0.22)');
      g.drawImage(animal(spr.kind, step), 0, step ? -1 : 0);
    } else if (animals[spr.kind]) {
      if (dir === 'left') { g.translate(T, 0); g.scale(-1, 1); }
      animals[spr.kind](g, step);
    }
    g.restore();
  }

  // Ponto de luz onde a próxima cena acontece.
  function sparkle(g, x, y, time) {
    const cx = x + 16, cy = y + 14 + Math.sin(time * 3) * 3;
    const pulse = 0.6 + Math.sin(time * 4) * 0.2;
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, 26);
    grd.addColorStop(0, `rgba(255,248,210,${0.95 * pulse + 0.05})`);
    grd.addColorStop(0.35, `rgba(255,226,140,${0.5 * pulse})`);
    grd.addColorStop(1, 'rgba(255,210,110,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(cx, cy, 26, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fffbe8';
    for (let i = 0; i < 6; i++) {
      const a = time * 1.5 + i * Math.PI / 3;
      const d = 12 + Math.sin(time * 3 + i) * 2;
      g.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), 2, 2);
    }
    g.fillRect(Math.round(cx) - 3, Math.round(cy) - 1, 6, 2);
    g.fillRect(Math.round(cx) - 1, Math.round(cy) - 3, 2, 6);
  }

  function label(g, text, cx, y, color = '#fff3d0') {
    g.font = '600 11px "Pixelify Sans", ui-monospace, monospace';
    const w = Math.ceil(g.measureText(text).width) + 10;
    const x = Math.round(cx - w / 2);
    g.fillStyle = 'rgba(20,14,8,0.82)';
    g.fillRect(x, y - 15, w, 15);
    g.fillStyle = 'rgba(201,164,92,0.9)';
    g.fillRect(x, y - 15, w, 1); g.fillRect(x, y - 1, w, 1);
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, Math.round(cx), y - 7);
    g.textAlign = 'left';
  }

  return { T, C, SOLID, tile, edges, entity, sparkle, label, person, viajante, normalizar, animals, rng, shade };
})();
