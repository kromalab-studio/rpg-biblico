// O mundo da Aventura 1: um único mapa que muda a cada dia da Criação.
const World = (() => {
  const W = 30, H = 22, CX = 15, CY = 11;

  const P = {
    inicio: { x: 15, y: 13 },
    luz: { x: 15, y: 9 },
    aguas: { x: 18, y: 11 },
    terra: { x: 13, y: 10 },
    jardim: { x: 11, y: 13 }, // centro do canteiro 3x3
    ceu: { x: 21, y: 10 },
    arvore: { x: 15, y: 6 },   // a grande árvore (sólida)
    sombra: { x: 15, y: 7 },   // lugar de descanso, sob a árvore
    fruta: { x: 19, y: 15 },   // árvore com frutos maduros
    lago: { x: 22, y: 6 },
  };

  function hash(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function vnoise(x, y) {
    const gx = x / 4, gy = y / 4;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0, 1), b = hash(x0 + 1, y0, 1), c = hash(x0, y0 + 1, 1), d = hash(x0 + 1, y0 + 1, 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }

  function inGarden(x, y) {
    return Math.abs(x - P.jardim.x) <= 1 && Math.abs(y - P.jardim.y) <= 1;
  }

  function near(x, y, p, d) {
    return Math.abs(x - p.x) <= d && Math.abs(y - p.y) <= d;
  }

  function landTile(x, y) {
    const n = vnoise(x, y);
    const d = ((x - CX) / 12.5) ** 2 + ((y - CY) / 9) ** 2 + (n - 0.5) * 0.45;
    if (d > 1) return '~';
    if (d > 0.8) return ':';
    return null;
  }

  function shorePoint(tiles) {
    // Areia mais próxima do lado oeste, com água ao lado.
    let best = null, bestD = 1e9;
    for (let y = 6; y < H - 6; y++) {
      for (let x = 1; x < CX; x++) {
        if (tiles[y][x] !== ':') continue;
        if (tiles[y][x - 1] !== '~') continue;
        const d = Math.abs(y - CY) * 2 + x;
        if (d < bestD) { bestD = d; best = { x: x + 1, y }; }
      }
    }
    return best || { x: 5, y: CY };
  }

  function build(c) {
    const t = [];
    for (let y = 0; y < H; y++) {
      const row = [];
      for (let x = 0; x < W; x++) {
        if (!c.terra) {
          const d = ((x - CX) / 4.6) ** 2 + ((y - CY) / 3.3) ** 2;
          row.push(d <= 1 ? 'v' : 'A');
        } else {
          row.push(landTile(x, y) || (c.plantado ? '.' : 'd'));
        }
      }
      t.push(row);
    }
    if (!c.terra) return t;

    const shore = shorePoint(t);
    const keys = [P.inicio, P.luz, P.aguas, P.terra, P.ceu, P.sombra, P.fruta, shore, { x: CX, y: CY }];

    if (c.plantado) {
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          if (t[y][x] !== '.') continue;
          if (inGarden(x, y) || near(x, y, { x: CX, y: CY }, 2)) continue;
          if (keys.some(k => near(x, y, k, 1))) continue;
          const h = hash(x, y, 7);
          if (h < 0.06) t[y][x] = '#';
          else if (h < 0.08) t[y][x] = 'b';
          else if (h < 0.095) t[y][x] = 'r';
          else if (h < 0.2) t[y][x] = 'f';
          else if (h < 0.3) t[y][x] = ',';
        }
      }
      t[P.arvore.y][P.arvore.x] = 'O';
      t[P.fruta.y - 1][P.fruta.x] = 'Y';
      t[P.lago.y][P.lago.x] = '~'; t[P.lago.y][P.lago.x + 1] = '~';
      t[P.lago.y + 1][P.lago.x] = '~'; t[P.lago.y + 1][P.lago.x + 1] = '~';
    }

    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        const gx = P.jardim.x + x, gy = P.jardim.y + y;
        if (!c.plantado) t[gy][gx] = 'G';
        else if (c.jardim === 'arvores') t[gy][gx] = (x !== 0 && y !== 0) ? 'Y' : 'f';
        else t[gy][gx] = 'f';
      }
    }

    carvePaths(t, keys);
    return t;
  }

  // Garante que todo ponto importante pode ser alcançado a partir do centro.
  function carvePaths(t, keys) {
    const start = { x: CX, y: CY };
    for (const k of keys) {
      const seen = reach(t, start);
      if (seen.has(k.y * W + k.x)) continue;
      let x = start.x, y = start.y;
      while (x !== k.x || y !== k.y) {
        if (x !== k.x) x += Math.sign(k.x - x);
        else y += Math.sign(k.y - y);
        if (Art.SOLID.has(t[y][x]) && t[y][x] !== 'O' && t[y][x] !== 'Y') t[y][x] = '.';
      }
    }
  }

  function reach(t, s) {
    const seen = new Set([s.y * W + s.x]);
    const q = [s];
    while (q.length) {
      const p = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = p.x + dx, y = p.y + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const k = y * W + x;
        if (seen.has(k) || Art.SOLID.has(t[y][x])) continue;
        seen.add(k);
        q.push({ x, y });
      }
    }
    return seen;
  }

  return { W, H, CX, CY, P, build, shorePoint, hash };
})();
