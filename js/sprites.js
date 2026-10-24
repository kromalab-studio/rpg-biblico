// Arte em pixel gerada por código: tiles, Viajante, animais e efeitos de luz.
const Art = (() => {
  const T = 16;

  const C = {
    grass: '#5d9b3e', grass2: '#4c8533', grass3: '#78b553',
    tall: '#3d7428', tall2: '#2f5e1f',
    leaf: '#2f6b2a', leaf2: '#3f8a36', leaf3: '#1f4a1c', trunk: '#6b4626',
    water: '#3b7cc4', water2: '#5d9ee0', water3: '#2b62a3',
    abyss: '#141a33', abyss2: '#232c52', abyss3: '#0c1024',
    void: '#5b5770', void2: '#4c4862', void3: '#6c6884',
    sand: '#e2cc92', sand2: '#cdb377',
    soil: '#8a6440', soil2: '#74522f', soil3: '#9c774f',
    rock: '#8c8a86', rock2: '#b1aea7', rock3: '#5f5d59',
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

  function mk(draw) {
    const c = document.createElement('canvas');
    c.width = c.height = T;
    draw(c.getContext('2d'));
    return c;
  }

  function speckle(g, seed, base, cols, n) {
    r(g, 0, 0, T, T, base);
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      r(g, (R() * 15) | 0, (R() * 15) | 0, 1, 1 + ((R() * 2) | 0), cols[(R() * cols.length) | 0]);
    }
  }

  const grassBase = (g, s) => speckle(g, s, C.grass, [C.grass2, C.grass2, C.grass3], 10);

  const tiles = {};
  tiles['.'] = [11, 23, 37].map(s => mk(g => grassBase(g, s)));
  tiles[':'] = [5, 9].map(s => mk(g => speckle(g, s, C.sand, [C.sand2], 6)));
  tiles['d'] = [3, 8].map(s => mk(g => speckle(g, s, C.soil, [C.soil2, C.soil3], 12)));
  tiles['v'] = [4, 6].map(s => mk(g => speckle(g, s, C.void, [C.void2, C.void3], 10)));

  tiles[','] = [3, 7].map(s => mk(g => {
    grassBase(g, s);
    const R = rng(s * 7);
    for (let i = 0; i < 5; i++) {
      const x = 1 + ((R() * 12) | 0), y = 3 + ((R() * 9) | 0);
      r(g, x, y + 1, 1, 3, C.tall);
      r(g, x + 2, y + 1, 1, 3, C.tall);
      r(g, x + 1, y, 1, 4, C.tall2);
    }
  }));

  function flowers(g, s, cols) {
    grassBase(g, s);
    const R = rng(s * 13);
    for (let i = 0; i < 4; i++) {
      const x = 2 + ((R() * 11) | 0), y = 2 + ((R() * 11) | 0);
      const c = cols[(R() * cols.length) | 0];
      r(g, x, y, 1, 1, c); r(g, x + 2, y, 1, 1, c); r(g, x + 1, y - 1, 1, 1, c); r(g, x + 1, y + 1, 1, 1, c);
      r(g, x + 1, y, 1, 1, '#e8a33a');
    }
  }
  tiles['f'] = [2, 4, 6].map(s => mk(g => flowers(g, s, ['#f4e36b', '#f08fb0', '#ffffff', '#c58cf0'])));

  tiles['G'] = [mk(g => {
    r(g, 0, 0, T, T, C.soil);
    for (let y = 1; y < 16; y += 4) { r(g, 0, y, 16, 2, C.soil2); r(g, 0, y + 2, 16, 1, C.soil3); }
  })];

  function treeTile(seed, fruit) {
    return mk(g => {
      grassBase(g, seed);
      r(g, 6, 11, 4, 5, C.trunk);
      r(g, 2, 3, 12, 8, C.leaf);
      r(g, 4, 1, 8, 2, C.leaf);
      r(g, 1, 5, 14, 4, C.leaf);
      r(g, 4, 2, 4, 3, C.leaf2);
      r(g, 3, 5, 3, 2, C.leaf2);
      r(g, 9, 4, 3, 2, C.leaf2);
      r(g, 2, 9, 12, 2, C.leaf3);
      if (fruit) {
        const R = rng(seed);
        for (let i = 0; i < 6; i++) r(g, 2 + ((R() * 11) | 0), 2 + ((R() * 7) | 0), 2, 2, i % 2 ? '#e0453a' : '#f2a531');
      }
    });
  }
  tiles['#'] = [treeTile(41, false), treeTile(43, false)];
  tiles['Y'] = [treeTile(47, true)];

  tiles['O'] = [mk(g => {
    grassBase(g, 51);
    r(g, 5, 9, 6, 7, '#5a3a1e');
    r(g, 3, 14, 10, 2, '#5a3a1e');
    r(g, 0, 1, 16, 9, '#2a5e26');
    r(g, 1, 0, 14, 1, '#2a5e26');
    r(g, 2, 2, 6, 3, '#3f8a36');
    r(g, 9, 3, 5, 2, '#3f8a36');
    r(g, 0, 8, 16, 2, '#1c4219');
  })];

  tiles['b'] = [mk(g => {
    grassBase(g, 63);
    r(g, 2, 6, 12, 8, C.leaf);
    r(g, 3, 5, 10, 1, C.leaf);
    r(g, 4, 6, 4, 2, C.leaf2);
    r(g, 2, 12, 12, 2, C.leaf3);
    r(g, 5, 8, 1, 1, '#b8e6ff'); r(g, 10, 9, 1, 1, '#b8e6ff');
  })];

  tiles['r'] = [mk(g => {
    grassBase(g, 77);
    r(g, 3, 6, 10, 8, C.rock);
    r(g, 4, 5, 7, 1, C.rock);
    r(g, 4, 6, 4, 2, C.rock2);
    r(g, 3, 12, 10, 2, C.rock3);
  })];

  tiles['~'] = [0, 1].map(fr => mk(g => {
    r(g, 0, 0, T, T, C.water);
    const o = fr * 4;
    r(g, (2 + o) % 16, 3, 4, 1, C.water2);
    r(g, (9 + o) % 16, 7, 5, 1, C.water2);
    r(g, (4 + o) % 16, 12, 4, 1, C.water2);
    r(g, (12 + o) % 16, 13, 3, 1, C.water3);
    r(g, (0 + o) % 16, 9, 2, 1, C.water3);
  }));

  tiles['A'] = [0, 1].map(fr => mk(g => {
    r(g, 0, 0, T, T, C.abyss);
    const o = fr * 5;
    r(g, (3 + o) % 16, 4, 5, 1, C.abyss2);
    r(g, (10 + o) % 16, 10, 4, 1, C.abyss2);
    r(g, (1 + o) % 16, 13, 3, 1, C.abyss3);
  }));

  const SOLID = new Set(['A', '~', '#', 'Y', 'O', 'b', 'r']);

  function tile(ch, x, y, time) {
    const set = tiles[ch] || tiles['.'];
    if (ch === '~' || ch === 'A') return set[Math.floor(time * 1.6 + (x + y) * 0.5) % 2];
    return set[(x * 7 + y * 13) % set.length];
  }

  // ---------- Viajante (16x16) ----------

  function person(g, o, dir, step) {
    const robe = o.robe || '#d2b06e';
    const skin = o.skin || '#e3b483';
    const hair = o.hair || '#4a2c17';
    const belt = o.belt || '#5a3a1a';
    const f1 = step === 1 ? 1 : 0, f2 = step === 2 ? 1 : 0;

    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(3, 14, 10, 2);
    r(g, 5, 13 - f1, 2, 2, '#3a2410');
    r(g, 9, 13 - f2, 2, 2, '#3a2410');
    r(g, 4, 7, 8, 7, robe);
    r(g, 4, 10, 8, 1, belt);
    r(g, 3, 8, 1, 4, robe); r(g, 12, 8, 1, 4, robe);
    r(g, 3, 11, 1, 1, skin); r(g, 12, 11, 1, 1, skin);
    r(g, 5, 2, 6, 5, skin);
    r(g, 5, 1, 6, 2, hair);
    if (o.long) { r(g, 4, 2, 1, 6, hair); r(g, 11, 2, 1, 6, hair); }

    if (dir === 'up') {
      r(g, 5, 2, 6, 4, hair);
      if (o.long) r(g, 5, 6, 6, 2, hair);
    } else if (dir === 'left') {
      r(g, 9, 2, 2, 3, hair);
      r(g, 6, 4, 1, 1, '#1d1208');
    } else if (dir === 'right') {
      r(g, 5, 2, 2, 3, hair);
      r(g, 9, 4, 1, 1, '#1d1208');
    } else {
      r(g, 6, 4, 1, 1, '#1d1208');
      r(g, 9, 4, 1, 1, '#1d1208');
    }
    if (o.lenco) { r(g, 4, 1, 8, 2, o.lenco); r(g, 4, 3, 1, 3, o.lenco); r(g, 11, 3, 1, 3, o.lenco); }
    if (o.faixa) r(g, 5, 2, 6, 1, o.faixa);
  }

  // ---------- Animais (16x16, virados para a direita) ----------

  function shadow(g, w) {
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(8 - w / 2, 13, w, 2);
  }

  const animals = {
    ovelha(g, step) {
      const b = step ? 1 : 0;
      shadow(g, 12);
      r(g, 4, 12, 1, 2 + b, '#2b2b2b'); r(g, 10, 12, 1, 3 - b, '#2b2b2b');
      r(g, 2, 6, 11, 7, '#f1efe6');
      r(g, 3, 5, 4, 1, '#f1efe6'); r(g, 8, 5, 4, 1, '#f1efe6');
      r(g, 3, 11, 9, 1, '#d6d2c4');
      r(g, 11, 5, 4, 5, '#2e2a26');
      r(g, 13, 6, 1, 1, '#ffffff');
    },
    leao(g, step) {
      const b = step ? 1 : 0;
      shadow(g, 14);
      r(g, 0, 5, 2, 1, '#c8964a'); r(g, 0, 4, 1, 2, '#6b3a12');
      r(g, 2, 6, 10, 6, '#c8964a');
      r(g, 2, 11, 10, 1, '#a87a38');
      r(g, 3, 12, 2, 3 - b, '#a87a38'); r(g, 9, 12, 2, 2 + b, '#a87a38');
      r(g, 9, 2, 7, 8, '#8a4f1f');
      r(g, 11, 4, 5, 5, '#d9a85a');
      r(g, 13, 5, 1, 1, '#1d1208');
      r(g, 15, 7, 1, 1, '#3a2410');
    },
    coelho(g, step) {
      const b = step ? 1 : 0;
      shadow(g, 9);
      r(g, 4, 9 - b, 7, 5, '#c9b7a2');
      r(g, 3, 10 - b, 2, 2, '#ffffff');
      r(g, 9, 6 - b, 4, 4, '#c9b7a2');
      r(g, 9, 2 - b, 1, 4, '#c9b7a2'); r(g, 11, 2 - b, 1, 4, '#c9b7a2');
      r(g, 11, 3 - b, 1, 2, '#f2b8c6');
      r(g, 11, 7 - b, 1, 1, '#1d1208');
      r(g, 5, 13, 2, 1, '#a8957f'); r(g, 9, 13, 2, 1, '#a8957f');
    },
    cervo(g, step) {
      const b = step ? 1 : 0;
      shadow(g, 12);
      r(g, 3, 7, 9, 5, '#a8693a');
      r(g, 4, 8, 1, 1, '#f1e2c8'); r(g, 7, 9, 1, 1, '#f1e2c8'); r(g, 9, 8, 1, 1, '#f1e2c8');
      r(g, 4, 12, 1, 3 - b, '#7a4a26'); r(g, 10, 12, 1, 2 + b, '#7a4a26');
      r(g, 11, 4, 2, 4, '#a8693a');
      r(g, 12, 3, 4, 3, '#b87a48');
      r(g, 14, 4, 1, 1, '#1d1208');
      r(g, 11, 0, 1, 3, '#6b4626'); r(g, 13, 0, 1, 3, '#6b4626'); r(g, 10, 0, 1, 1, '#6b4626'); r(g, 14, 0, 1, 1, '#6b4626');
      r(g, 2, 7, 1, 2, '#f1e2c8');
    },
    elefante(g, step) {
      const b = step ? 1 : 0;
      shadow(g, 15);
      r(g, 1, 4, 11, 8, '#8d8f99');
      r(g, 2, 12, 3, 3 - b, '#7a7c86'); r(g, 8, 12, 3, 2 + b, '#7a7c86');
      r(g, 10, 3, 5, 6, '#9a9ca6');
      r(g, 9, 4, 2, 5, '#7a7c86');
      r(g, 14, 8, 2, 6, '#9a9ca6');
      r(g, 13, 5, 1, 1, '#1d1208');
      r(g, 13, 9, 1, 2, '#f4f1e6');
    },
    tartaruga(g, step) {
      const b = step ? 1 : 0;
      shadow(g, 11);
      r(g, 3, 8, 9, 5, '#4f7a3a');
      r(g, 4, 7, 7, 1, '#4f7a3a');
      r(g, 5, 9, 2, 2, '#6f9a52'); r(g, 8, 9, 2, 2, '#6f9a52');
      r(g, 12, 9 + b, 3, 3, '#9bb86a');
      r(g, 14, 10 + b, 1, 1, '#1d1208');
      r(g, 4, 13, 2, 1, '#9bb86a'); r(g, 9, 13, 2, 1, '#9bb86a');
    },
    // Criaturas do mar e do céu
    peixe(g, step) {
      r(g, 3, 7, 8, 4, '#f08a3a');
      r(g, 1, 6, 2, 6, '#f2b36a');
      r(g, 5, 7, 1, 4, '#ffffff');
      r(g, 9, 8, 1, 1, '#1d1208');
    },
    golfinho(g, step) {
      r(g, 2, 7, 11, 4, '#7a9ab8');
      r(g, 3, 10, 9, 1, '#d8e4ee');
      r(g, 13, 8, 3, 2, '#7a9ab8');
      r(g, 7, 5, 2, 2, '#6a8aa8');
      r(g, 0, 5, 2, 3, '#6a8aa8'); r(g, 0, 10, 2, 3, '#6a8aa8');
      r(g, 11, 8, 1, 1, '#1d1208');
    },
    baleia(g, step) {
      r(g, 1, 6, 13, 7, '#3d5a80');
      r(g, 2, 11, 11, 2, '#c8d6e5');
      r(g, 11, 8, 1, 1, '#ffffff');
      r(g, 7, 3, 1, 3, '#d8f0ff'); r(g, 6, 2, 1, 1, '#d8f0ff'); r(g, 8, 2, 1, 1, '#d8f0ff');
    },
    pomba(g, step) {
      const w = step ? -2 : 0;
      r(g, 4, 8, 8, 4, '#f4f4f0');
      r(g, 11, 7, 3, 3, '#f4f4f0');
      r(g, 14, 8, 1, 1, '#e8a33a');
      r(g, 12, 8, 1, 1, '#1d1208');
      r(g, 5, 4 - w, 5, 4 + w, '#e4e4de');
      r(g, 2, 9, 2, 2, '#e4e4de');
    },
    aguia(g, step) {
      const w = step ? 2 : 0;
      r(g, 4, 7, 8, 4, '#6b4626');
      r(g, 0, 5 + w, 6, 3, '#5a3a1e'); r(g, 10, 5 + w, 6, 3, '#5a3a1e');
      r(g, 11, 5, 3, 3, '#f4f1e6');
      r(g, 14, 6, 1, 1, '#f2b331');
      r(g, 12, 6, 1, 1, '#1d1208');
      r(g, 3, 9, 2, 2, '#f4f1e6');
    },
    beijaflor(g, step) {
      r(g, 6, 8, 5, 3, '#2fa37a');
      r(g, 10, 7, 2, 2, '#e04a6a');
      r(g, 12, 8, 3, 1, '#2b2b2b');
      r(g, 4, 9, 2, 1, '#2fa37a');
      r(g, 7, step ? 4 : 6, 3, 2, 'rgba(200,240,230,0.85)');
    },
  };

  function entity(g, spr, x, y, dir, step, time, scale = 1) {
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.scale(scale, scale);
    if (spr.kind === 'person') {
      person(g, spr, dir, step);
    } else if (animals[spr.kind]) {
      if (dir === 'left') { g.translate(16, 0); g.scale(-1, 1); }
      animals[spr.kind](g, step);
    }
    g.restore();
  }

  // Ponto de luz onde a próxima cena acontece.
  function sparkle(g, x, y, time) {
    const cx = x + 8, cy = y + 7 + Math.sin(time * 3) * 1.5;
    const pulse = 0.6 + Math.sin(time * 4) * 0.2;
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, 12);
    grd.addColorStop(0, `rgba(255,248,210,${0.95 * pulse + 0.05})`);
    grd.addColorStop(0.4, `rgba(255,226,140,${0.5 * pulse})`);
    grd.addColorStop(1, 'rgba(255,210,110,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(cx, cy, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fffbe8';
    for (let i = 0; i < 4; i++) {
      const a = time * 1.5 + i * Math.PI / 2;
      g.fillRect(Math.round(cx + Math.cos(a) * 7), Math.round(cy + Math.sin(a) * 7), 1, 1);
    }
    g.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3);
  }

  function label(g, text, cx, y) {
    g.font = '6px sans-serif';
    const w = Math.ceil(g.measureText(text).width) + 4;
    g.fillStyle = 'rgba(20,14,8,0.75)';
    g.fillRect(Math.round(cx - w / 2), y - 7, w, 8);
    g.fillStyle = '#fff3d0';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, Math.round(cx), y - 3);
    g.textAlign = 'left';
  }

  return { T, C, SOLID, tile, entity, sparkle, label, person, animals, rng };
})();
