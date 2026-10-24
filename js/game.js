// Motor: laço principal, mapa, movimento, câmera, entrada e iluminação.
// O conteúdo vem de dados/ e é conduzido por js/roteiro.js por meio de uma mesa (js/mesa.js).
const Game = (() => {
  // ZOOM: quanto a câmera aproxima o mapa. A tela mostra (20 x 15) / ZOOM casas.
  const T = Art.T, VW = 20, VH = 15, SPEED = 4.5, ZOOM = 2;
  const VIEW_W = VW * T / ZOOM, VIEW_H = VH * T / ZOOM; // área do mapa visível, em pixels do mapa
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  canvas.width = VW * T;
  canvas.height = VH * T;
  const $ = id => document.getElementById(id);

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  let mesa = null;        // mesa atual (solo ou online)
  let st = null;          // estado da aventura (mesa.st)
  let me = null;          // id do meu Viajante
  let eu = null;          // { x, y, dir } — minha posição
  let mode = 'title';     // title | world | scene | pause
  let tiles = null, prevTiles = null;
  let reveal = null;      // { x, y, t } transição radial entre mapas
  let mov = null, path = [], pathFace = null;
  let stepFlip = false;
  let time = 0;
  let ents = [];
  let outros = {};        // outros Viajantes na mesa online: jid → { x, y, dir, ox, oy, t, v }
  let fx = { dark: 0, fog: 0, night: 0, stars: 0, gold: 0 };
  let birds = [], fish = [];
  let held = [];
  let bumpCooldown = 0;
  let onMove = null;      // avisado quando eu mudo de casa (para a rede)

  const minhaV = () => mesa.jogadores.find(j => j.id === me).v;

  // ---------- Salvamento ----------
  function salvar() {
    if (!mesa) return;
    if (eu) st.pos[me] = { x: pos().x, y: pos().y, dir: eu.dir };
    if (mesa.salvar) mesa.salvar(); else Store.save();
  }

  function pos() {
    return mov ? { x: mov.tx, y: mov.ty } : { x: eu.x, y: eu.y };
  }

  // ---------- Mundo ----------
  function rebuild(origin) {
    const next = World.build(st.c);
    if (origin && tiles) {
      prevTiles = tiles;
      reveal = { x: origin.x, y: origin.y, t: 0 };
    }
    tiles = next;
    refreshEntities();
  }

  function tileAt(x, y) {
    if (x < 0 || y < 0 || x >= World.W || y >= World.H) return 'A';
    return tiles[y][x];
  }

  function shownTile(x, y) {
    if (reveal && prevTiles) {
      const d = Math.hypot(x - reveal.x, y - reveal.y);
      if (d > reveal.t) return prevTiles[y][x];
    }
    return tiles[y][x];
  }

  function shownTileSafe(x, y) {
    if (x < 0 || y < 0 || x >= World.W || y >= World.H) return null;
    return shownTile(x, y);
  }

  const livre = t => t && !Art.SOLID.has(t) && t !== 'G';

  function nearestIn(p, ok) {
    for (let r = 0; r < 10; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const row = tiles[p.y + dy];
          if (row && ok(row[p.x + dx])) return { x: p.x + dx, y: p.y + dy };
        }
      }
    }
    return p;
  }

  // Entidades vêm dos dados da aventura e do estado da mesa.
  function computeEntities() {
    const av = mesa.av, c = st.c, out = [];
    const P = World.P;
    for (const p of Roteiro.pontosAtivos(mesa)) {
      const xy = p.onde === 'praia' ? World.shorePoint(tiles) : P[p.onde];
      out.push({ id: 's-' + p.id, kind: 'sparkle', x: xy.x, y: xy.y, onTouch: true, acao: { tipo: 'ponto', id: p.id } });
    }
    if (c.terra && c.animais) {
      const shore = World.shorePoint(tiles);
      mesa.jogadores.forEach((j, i) => {
        const r = st.resp[j.id] || {};
        if (!r.animal) return;
        const marinho = ['peixe', 'golfinho', 'baleia'].includes(r.animal.valor);
        const base = { x: shore.x - 1, y: shore.y + (i % 2 ? i : -i) };
        const xy = nearestIn(base, marinho ? t => t === '~' : t => t === ':' || t === '.');
        out.push({ id: 'cr-' + j.id, kind: r.animal.valor, x: xy.x, y: xy.y, solid: false, label: mesa.jogadores.length > 1 ? j.v.nome : null });
      });
    }
    if (c.animaisTerra) {
      for (const an of av.animaisTerra) {
        const nome = st.nomes[an.id];
        out.push({
          id: 'a-' + an.id, kind: an.id, x: an.x, y: an.y, wander: true,
          label: nome ? nome.nome : null, marker: !nome && st.dia === 6, onTouch: true,
          acao: { tipo: 'nomear', id: an.id },
        });
      }
    }
    return out;
  }

  function refreshEntities() {
    if (!mesa) return;
    const old = new Map(ents.map(e => [e.id, e]));
    ents = [];
    for (const e of computeEntities()) {
      const o = old.get(e.id);
      if (o && e.wander) {
        o.def = e;
        ents.push(o);
        continue;
      }
      let { x, y } = e;
      if (e.wander && !livre(tileAt(x, y))) ({ x, y } = nearestIn({ x, y }, t => livre(t) && t !== ':'));
      ents.push({ id: e.id, def: e, x, y, ox: x, oy: y, t: 1, dir: e.dir || 'down', timer: 1 + Math.random() * 3 });
    }
    if (st.c.mar && !fish.length) spawnSea();
    updateHud();
  }

  function spawnSea() {
    fish = [];
    birds = [];
    for (let i = 0; i < 14; i++) {
      let x, y, tries = 0;
      do {
        x = (Math.random() * World.W) | 0;
        y = (Math.random() * World.H) | 0;
      } while (tileAt(x, y) !== '~' && ++tries < 200);
      fish.push({ x, y, phase: Math.random() * 6, kind: i % 5 === 0 ? 'golfinho' : 'peixe' });
    }
    for (let i = 0; i < 6; i++) {
      birds.push({
        x: Math.random() * World.W * T, y: Math.random() * World.H * T,
        vx: (Math.random() < 0.5 ? -1 : 1) * (28 + Math.random() * 24), vy: (Math.random() - 0.5) * 12,
        kind: i % 3 === 0 ? 'aguia' : 'pomba',
      });
    }
  }

  function entAt(x, y) {
    return ents.find(e => e.def.solid !== false && e.x === x && e.y === y);
  }

  function blocked(x, y) {
    return Art.SOLID.has(tileAt(x, y)) || !!entAt(x, y);
  }

  // ---------- Efeitos pedidos pelo roteiro ----------
  const FLAGS = ['luz', 'ceu', 'estrelas', 'amanhecer', 'mar', 'animais', 'animaisTerra', 'pessoas', 'descanso'];

  function efeito(nome) {
    const c = st.c, P = World.P;
    if (FLAGS.includes(nome)) c[nome] = true;
    if (nome === 'terra') { c.terra = true; rebuild(P.terra); }
    else if (nome === 'plantar') {
      c.plantado = true;
      c.jardim = (st.grupo.jardim && st.grupo.jardim.valor) || 'flores';
      rebuild(P.jardim);
    } else refreshEntities();
    salvar();
    if (mesa.aoEfeito) mesa.aoEfeito(nome);
  }

  function novoDia() {
    refreshEntities();
    salvar();
    if (mesa.aoEfeito) mesa.aoEfeito('dia');
  }

  // Aplica um estado vindo do anfitrião (online).
  function sincronizar(novoSt) {
    if (!st) return;
    const terraAntes = st.c.terra, plantadoAntes = st.c.plantado;
    const minha = st.pos[me];
    Object.assign(st, novoSt);
    if (minha) st.pos[me] = minha;
    if (st.c.plantado !== plantadoAntes) rebuild(World.P.jardim);
    else if (st.c.terra !== terraAntes) rebuild(World.P.terra);
    else refreshEntities();
  }

  // ---------- Movimento ----------
  function tryMove(dir) {
    eu.dir = dir;
    const [dx, dy] = DIRS[dir];
    const nx = eu.x + dx, ny = eu.y + dy;
    const e = entAt(nx, ny);
    if (e) {
      if (bumpCooldown <= 0 && e.def.onTouch) { bumpCooldown = 0.6; interactWith(e); }
      path = [];
      if (onMove) onMove({ x: eu.x, y: eu.y, dir });
      return false;
    }
    if (Art.SOLID.has(tileAt(nx, ny))) { path = []; return false; }
    mov = { fx: eu.x, fy: eu.y, tx: nx, ty: ny, t: 0 };
    stepFlip = !stepFlip;
    if (onMove) onMove({ x: nx, y: ny, dir });
    return true;
  }

  function finishMove() {
    eu.x = mov.tx; eu.y = mov.ty;
    mov = null;
  }

  function facing() {
    const [dx, dy] = DIRS[eu.dir];
    return { x: eu.x + dx, y: eu.y + dy };
  }

  function interact() {
    const f = facing();
    const e = ents.find(n => n.x === f.x && n.y === f.y);
    if (e) return interactWith(e);
    const t = tileAt(f.x, f.y);
    const P = World.P;
    if (t === 'Y' && f.x === P.fruta.x && f.y === P.fruta.y - 1) return acionar({ tipo: 'colher' });
    const msg = mesa.av.tiles[t];
    if (msg) cenaLocal(() => UI.say([Roteiro.line(mesa, msg, { jid: me })]));
  }

  function interactWith(e) {
    if (!e.def.acao) return;
    if (e.def.wander) {
      const p = pos();
      e.dir = p.x < e.x ? 'left' : 'right';
    }
    acionar(e.def.acao);
  }

  // Pede para o roteiro rodar algo. Na mesa online, quem roda é o anfitrião.
  function acionar(acao) {
    if (mode !== 'world' || UI.busy) return;
    if (mesa.acionar) return mesa.acionar(acao, me);
    executar(acao, me);
  }

  // Roda uma ação do roteiro neste aparelho (solo, ou o anfitrião no online).
  function executar(acao, jid) {
    if (!mesa) return;
    if (mesa.ocupada && acao.tipo === 'ponto') return;
    let fn;
    if (acao.tipo === 'ponto') {
      const p = Roteiro.pontosAtivos(mesa).find(x => x.id === acao.id);
      if (!p) return;
      fn = () => Roteiro.passo(mesa, p.passo);
    } else if (acao.tipo === 'nomear') {
      const an = mesa.av.animaisTerra.find(a => a.id === acao.id);
      if (!an) return;
      fn = () => Roteiro.nomear(mesa, jid, an);
    } else if (acao.tipo === 'colher') {
      fn = () => Roteiro.colher(mesa, jid);
    } else return;
    const global = acao.tipo === 'ponto';
    if (global) mesa.ocupada = true;
    return cena(fn, global, global || jid === me);
  }

  // ---------- Cenas ----------
  async function cena(fn, global, bloquear = true) {
    if (bloquear) { mode = 'scene'; path = []; held = []; }
    try {
      await fn();
    } catch (err) {
      console.error(err);
    }
    if (!mesa) return;
    if (global) mesa.ocupada = false;
    if (bloquear && mode === 'scene') mode = 'world';
    refreshEntities();
    salvar();
    if (st.concluida && global) fim();
  }

  async function cenaLocal(fn) {
    if (mode !== 'world') return;
    mode = 'scene';
    try { await fn(); } catch (err) { console.error(err); }
    if (mode === 'scene') mode = 'world';
  }

  function fim() {
    if (mesa && mesa.aoFim) mesa.aoFim();
    sair(true);
  }

  // Caminho até o toque do jogador (busca em largura).
  function findPath(tx, ty) {
    const start = pos();
    const key = (x, y) => y * World.W + x;
    const target = entAt(tx, ty) || Art.SOLID.has(tileAt(tx, ty)) ? null : { x: tx, y: ty };
    const goals = target ? [target] : Object.values(DIRS).map(([dx, dy]) => ({ x: tx + dx, y: ty + dy })).filter(p => !blocked(p.x, p.y));
    if (!goals.length) return null;
    const goalSet = new Set(goals.map(g => key(g.x, g.y)));
    const prev = new Map([[key(start.x, start.y), null]]);
    const q = [start];
    while (q.length) {
      const p = q.shift();
      if (goalSet.has(key(p.x, p.y))) {
        const out = [];
        let k = key(p.x, p.y);
        while (k !== key(start.x, start.y)) {
          out.unshift({ x: k % World.W, y: Math.floor(k / World.W) });
          k = prev.get(k);
        }
        return { steps: out, face: target ? null : { x: tx, y: ty } };
      }
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = p.x + dx, ny = p.y + dy;
        if (nx < 0 || ny < 0 || nx >= World.W || ny >= World.H) continue;
        const k = key(nx, ny);
        if (prev.has(k) || blocked(nx, ny)) continue;
        prev.set(k, key(p.x, p.y));
        q.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  function followPath() {
    if (!path.length) {
      if (pathFace) {
        const p = pos();
        const dx = pathFace.x - p.x, dy = pathFace.y - p.y;
        eu.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
        pathFace = null;
        interact();
      }
      return;
    }
    const n = path.shift();
    const dx = n.x - eu.x, dy = n.y - eu.y;
    const dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    if (!tryMove(dir)) { path = []; pathFace = null; }
  }

  // ---------- Entrada ----------
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'a', Enter: 'a', KeyZ: 'a', NumpadEnter: 'a',
    Escape: 'b', KeyX: 'b',
  };

  function press(btn) {
    if (UI.modalOpen) return;
    if (UI.dialogOpen) {
      if (btn === 'a') UI.advance();
      return;
    }
    if (mode === 'world') {
      if (btn === 'a') interact();
      else if (btn === 'b') openPause();
    } else if (mode === 'pause' && btn === 'b') {
      closePause();
    }
  }

  window.addEventListener('keydown', e => {
    const k = KEYMAP[e.code];
    if (!k) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (UI.modalOpen || !$('stage-wrap').classList.contains('playing')) return;
    if (tag === 'BUTTON' && k === 'a') e.target.blur();
    e.preventDefault();
    if (DIRS[k]) {
      if (!held.includes(k)) held.push(k);
      path = [];
    } else if (!e.repeat) press(k);
  });

  window.addEventListener('keyup', e => {
    const k = KEYMAP[e.code];
    if (k && DIRS[k]) held = held.filter(h => h !== k);
  });
  window.addEventListener('blur', () => { held = []; });

  function setupTouch() {
    document.querySelectorAll('#touch button').forEach(b => {
      const k = b.dataset.key;
      const down = e => {
        e.preventDefault();
        b.classList.add('pressed');
        if (DIRS[k]) { if (!held.includes(k)) held.push(k); path = []; } else press(k);
      };
      const up = () => {
        b.classList.remove('pressed');
        held = held.filter(h => h !== k);
      };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('pointercancel', up);
    });
    window.addEventListener('touchstart', () => document.body.classList.add('touch'), { once: true, passive: true });

    // Tocar/clicar no mapa: caminhar até lá (e interagir se for alguém).
    canvas.addEventListener('pointerdown', e => {
      if (UI.dialogOpen) { UI.advance(); return; }
      if (mode !== 'world' || UI.busy) return;
      const rect = canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) / rect.width * canvas.width;
      const sy = (e.clientY - rect.top) / rect.height * canvas.height;
      const cam = camera();
      const tx = Math.floor((sx / ZOOM + cam.x) / T), ty = Math.floor((sy / ZOOM + cam.y) / T);
      const p = pos();
      if (tx === p.x && ty === p.y) return;
      const res = findPath(tx, ty);
      if (res) { path = res.steps; pathFace = res.face; }
    });
    $('dialog').addEventListener('click', () => UI.advance());
  }

  // ---------- Pausa ----------
  function openPause() {
    mode = 'pause';
    const v = minhaV();
    const cam = RULES.camada(v);
    $('pause-stats').innerHTML = `
      <span>Viajante</span><b>${UI.esc(v.nome)}</b>
      <span>Idade</span><b>${UI.esc(cam.nome)}</b>
      <span>Pontos de Luz</span><b>${'♥'.repeat(v.luz)}</b>
      <span>Espigas</span><b>🌾 ${v.espigas}</b>
      <span>${UI.esc(cam.selos)}</span><b>⭐ ${v.selos}</b>
      <span>Cesto da Comunidade</span><b>🧺 ${Store.data.cesto}</b>
      ${mesa.modo === 'online' ? `<span>Sala</span><b>${UI.esc(mesa.codigo || '')}</b>` : ''}`;
    $('opt-narrar-2').checked = UI.settings.narrar;
    $('pause-restart').classList.toggle('hidden', !mesa.reiniciar);
    $('pause').classList.remove('hidden');
  }

  function closePause() {
    $('pause').classList.add('hidden');
    mode = 'world';
  }

  function setupPause() {
    $('pause').addEventListener('click', async e => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act === 'resume') closePause();
      else if (act === 'ficha') {
        $('pause').classList.add('hidden');
        salvar();
        Screens.ficha(minhaV(), () => { Screens.hideAll(); openPause(); });
      } else if (act === 'title') { closePause(); salvar(); sair(true); }
      else if (act === 'restart') {
        const ok = await UI.card({
          title: 'Reiniciar a aventura?',
          text: 'A aventura volta para o primeiro dia. As Espigas e os Selos ganhos nesta partida serão desfeitos.',
          buttons: [{ label: 'Cancelar', value: false, ghost: true }, { label: 'Reiniciar', value: true }],
        });
        if (!ok) return;
        closePause();
        const reiniciar = mesa.reiniciar;
        sair(false);
        reiniciar();
      }
    });
    $('opt-narrar-2').onchange = e => { UI.settings.narrar = e.target.checked; Store.save(); };
  }

  // ---------- HUD ----------
  let hudCache = '';
  function updateHud() {
    if (!mesa || !st) return;
    const v = minhaV();
    const hearts = '♥'.repeat(v.luz) + '♡'.repeat(Math.max(0, v.luzMax - v.luz));
    const online = mesa.modo === 'online' ? ` <span class="net ${mesa.conectado === false ? 'off' : ''}">● ${mesa.jogadores.length}</span>` : '';
    const html = `<b>${UI.esc(v.nome)}</b> <span class="hp">${hearts}</span>${online}<br><span>🌾 ${v.espigas}</span> &nbsp; <span>⭐ ${v.selos}</span>`;
    const goal = `<b>Dia ${Math.min(st.dia, 7)}</b> · ${UI.esc(Roteiro.objetivo(mesa))}`;
    const key = html + goal;
    if (key === hudCache) return;
    hudCache = key;
    $('hud-stats').innerHTML = html;
    $('hud-goal').innerHTML = goal;
  }

  // ---------- Desenho ----------
  function playerPixel() {
    if (mov) return { x: (mov.fx + (mov.tx - mov.fx) * mov.t) * T, y: (mov.fy + (mov.ty - mov.fy) * mov.t) * T };
    return { x: eu.x * T, y: eu.y * T };
  }

  function camera() {
    const pp = playerPixel();
    const cx = Math.max(0, Math.min(World.W * T - VIEW_W, pp.x + T / 2 - VIEW_W / 2));
    const cy = Math.max(0, Math.min(World.H * T - VIEW_H, pp.y + T / 2 - VIEW_H / 2));
    return { x: Math.round(cx), y: Math.round(cy) };
  }

  function render() {
    ctx.imageSmoothingEnabled = false;
    if (mode === 'title' || !tiles) {
      drawTitleBg();
      return;
    }
    const cam = camera();
    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    const x0 = Math.floor(cam.x / T), y0 = Math.floor(cam.y / T);
    for (let y = y0; y <= y0 + Math.ceil(VIEW_H / T); y++) {
      for (let x = x0; x <= x0 + Math.ceil(VIEW_W / T); x++) {
        if (x >= World.W || y >= World.H) continue;
        const ch = shownTile(x, y);
        ctx.drawImage(Art.tile(ch, x, y, time), x * T - cam.x, y * T - cam.y);
        Art.edges(ctx, ch, x, y, x * T - cam.x, y * T - cam.y, shownTileSafe, time);
      }
    }

    // Espírito pairando sobre as águas (Gênesis 1:2)
    if (!st.c.terra) {
      for (let i = 0; i < 18; i++) {
        const px = (i * 53 + time * (8 + i % 4)) % (World.W * T);
        const py = (i * 97 % (World.H * T)) + Math.sin(time + i) * 12;
        ctx.fillStyle = `rgba(220,230,255,${0.25 + 0.2 * Math.sin(time * 2 + i)})`;
        ctx.fillRect(Math.round(px - cam.x), Math.round(py - cam.y), 4, 2);
      }
    }

    // Peixes saltando
    for (const f of fish) {
      const s = Math.sin(time * 1.4 + f.phase);
      if (s < 0.4) continue;
      const hop = (s - 0.4) / 0.6;
      const fx2 = f.x * T - cam.x, fy2 = f.y * T - cam.y - hop * 12;
      if (fx2 < -T || fy2 < -T || fx2 > VIEW_W || fy2 > VIEW_H) continue;
      Art.entity(ctx, { kind: f.kind }, fx2, fy2, Math.sin(f.phase) > 0 ? 'right' : 'left', 0, time, 0.6);
    }

    const list = ents.map(e => ({
      y: e.oy + (e.y - e.oy) * e.t,
      draw: () => {
        const ex = (e.ox + (e.x - e.ox) * e.t) * T - cam.x;
        const ey = (e.oy + (e.y - e.oy) * e.t) * T - cam.y;
        if (e.def.kind === 'sparkle') Art.sparkle(ctx, ex, ey, time);
        else Art.entity(ctx, e.def, ex, ey, e.dir, e.t < 1 ? (stepFlip ? 1 : 2) : 0, time);
        if (e.def.label) Art.label(ctx, e.def.label, ex + T / 2, ey - 1);
        else if (e.def.marker) Art.label(ctx, '?', ex + T / 2, ey - 1 + Math.sin(time * 4) * 3, '#ffe7a3');
      },
    }));
    for (const o of Object.values(outros)) {
      const ox = (o.ox + (o.x - o.ox) * o.t) * T, oy = (o.oy + (o.y - o.oy) * o.t) * T;
      list.push({
        y: oy / T,
        draw: () => {
          Art.entity(ctx, { kind: 'person', ...o.v.aparencia }, ox - cam.x, oy - cam.y, o.dir, o.t < 1 ? (stepFlip ? 1 : 2) : 0, time);
          Art.label(ctx, o.v.nome, ox - cam.x + T / 2, oy - cam.y - 4, '#cfe8ff');
        },
      });
    }
    const pp = playerPixel();
    const v = minhaV();
    list.push({
      y: pp.y / T,
      draw: () => {
        Art.entity(ctx, { kind: 'person', ...v.aparencia }, pp.x - cam.x, pp.y - cam.y, eu.dir, mov ? (stepFlip ? 1 : 2) * (mov.t < 0.5 ? 1 : 0) : 0, time);
        if (Object.keys(outros).length) Art.label(ctx, v.nome, pp.x - cam.x + T / 2, pp.y - cam.y - 4);
      },
    });
    list.sort((a, b) => a.y - b.y).forEach(o => o.draw());

    // Aves voando por cima
    for (const b of birds) {
      const bx = b.x - cam.x, by = b.y - cam.y;
      if (bx < -T || by < -T || bx > VIEW_W || by > VIEW_H) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(Math.round(bx + 8), Math.round(by + 44), 12, 4);
      Art.entity(ctx, { kind: b.kind }, bx, by, b.vx > 0 ? 'right' : 'left', Math.sin(time * 10 + b.x) > 0 ? 1 : 0, time, 0.75);
    }
    ctx.restore();

    drawLight(pp, cam);
  }

  function drawLight(pp, cam) {
    const W = canvas.width, H = canvas.height;
    if (fx.fog > 0.01) {
      ctx.fillStyle = `rgba(190,200,220,${0.42 * fx.fog})`;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 8; i++) {
        const x = ((i * 140 + time * 14) % (W + 240)) - 120;
        ctx.fillStyle = `rgba(230,236,245,${0.18 * fx.fog})`;
        ctx.beginPath();
        ctx.ellipse(x, (i * 83) % H, 100, 28, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (fx.night > 0.01) {
      ctx.fillStyle = `rgba(12,18,56,${0.62 * fx.night})`;
      ctx.fillRect(0, 0, W, H);
      const s = fx.night * fx.stars;
      if (s > 0.01) {
        const R = Art.rng(7);
        for (let i = 0; i < 140; i++) {
          const sx = R() * W, sy = R() * H, tw = 0.5 + 0.5 * Math.sin(time * 3 + i);
          ctx.fillStyle = `rgba(255,250,220,${s * (0.4 + 0.6 * tw)})`;
          const sz = i % 9 === 0 ? 3 : i % 3 === 0 ? 2 : 1;
          ctx.fillRect(Math.round(sx), Math.round(sy), sz, sz);
        }
        ctx.fillStyle = `rgba(250,246,225,${s})`;
        ctx.beginPath();
        ctx.arc(W - 80, 68, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(12,18,56,${s})`;
        ctx.beginPath();
        ctx.arc(W - 70, 62, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (fx.gold > 0.01) {
      ctx.fillStyle = `rgba(255,190,110,${0.16 * fx.gold})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (fx.dark > 0.01) {
      const cx = (pp.x - cam.x + T / 2) * ZOOM, cy = (pp.y - cam.y + T / 2) * ZOOM;
      const grd = ctx.createRadialGradient(cx, cy, 24, cx, cy, 190);
      grd.addColorStop(0, `rgba(4,4,12,${0.35 * fx.dark})`);
      grd.addColorStop(1, `rgba(4,4,12,${0.97 * fx.dark})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      for (const e of ents) {
        if (e.def.kind !== 'sparkle') continue;
        ctx.save();
        ctx.globalAlpha = fx.dark;
        ctx.scale(ZOOM, ZOOM);
        Art.sparkle(ctx, e.x * T - cam.x, e.y * T - cam.y, time);
        ctx.restore();
      }
    }
  }

  function drawTitleBg() {
    const W = canvas.width, H = canvas.height;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b1030');
    g.addColorStop(0.55, '#3a2f5c');
    g.addColorStop(1, '#e8a85a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Luz e clima a partir das regras em dados/ (aventura.iluminacao).
  function lighting() {
    const L = mesa.av.iluminacao || {};
    const ok = q => {
      if (!q) return false;
      if (q.dia && st.dia !== q.dia) return false;
      if (q.diaMin && st.dia < q.diaMin) return false;
      return Roteiro.flags(st.c, q);
    };
    return {
      dark: ok(L.escuro) ? 1 : 0, fog: ok(L.nevoa) ? 1 : 0, night: ok(L.noite) ? 1 : 0,
      stars: ok(L.estrelas) ? 1 : 0, gold: ok(L.dourado) ? 1 : 0,
    };
  }

  // ---------- Atualização ----------
  function approach(cur, target, dt, speed = 0.8) {
    return cur + (target - cur) * Math.min(1, dt * speed * 3);
  }

  function update(dt) {
    time += dt;
    UI.updateDialog(dt);
    if (!st || mode === 'title') return;

    const target = lighting();
    for (const k of Object.keys(fx)) fx[k] = approach(fx[k], target[k], dt, k === 'dark' ? 0.35 : 0.4);

    if (reveal) {
      reveal.t += dt * 9;
      if (reveal.t > 40) { reveal = null; prevTiles = null; }
    }
    bumpCooldown -= dt;

    if (mov) {
      mov.t += dt * SPEED;
      if (mov.t >= 1) finishMove();
    }
    if (!mov && mode === 'world' && !UI.busy) {
      if (held.length) tryMove(held[held.length - 1]);
      else if (path.length || pathFace) followPath();
    }

    for (const o of Object.values(outros)) if (o.t < 1) o.t = Math.min(1, o.t + dt * SPEED);

    // Animais passeiam (no online, só o anfitrião decide para onde; os outros seguem).
    const p = pos();
    for (const e of ents) {
      if (e.t < 1) { e.t = Math.min(1, e.t + dt * 2.5); continue; }
      if (!e.def.wander || !mesa.anfitriao) continue;
      e.timer -= dt;
      if (e.timer > 0) continue;
      e.timer = 1.5 + Math.random() * 3;
      const [name, [dx, dy]] = Object.entries(DIRS)[(Math.random() * 4) | 0];
      const nx = e.x + dx, ny = e.y + dy;
      const ocupado = q => q.x === nx && q.y === ny;
      const pl = mov ? [{ x: mov.fx, y: mov.fy }, { x: mov.tx, y: mov.ty }] : [p];
      if (blocked(nx, ny) || pl.some(ocupado) || Object.values(outros).some(ocupado)) continue;
      if (tileAt(nx, ny) === ':' && Math.random() < 0.7) continue;
      e.ox = e.x; e.oy = e.y; e.x = nx; e.y = ny; e.t = 0;
      if (dx) e.dir = name;
      if (mesa.aoAnimal) mesa.aoAnimal(e.id, nx, ny, e.dir);
    }

    for (const b of birds) {
      b.x += b.vx * dt;
      b.y += b.vy * dt + Math.sin(time + b.x * 0.01) * 0.4;
      if (b.x < -80) b.x = World.W * T + 60;
      if (b.x > World.W * T + 80) b.x = -60;
      if (b.y < 0 || b.y > World.H * T) b.vy = -b.vy;
    }
    updateHud();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------- Fluxo ----------
  function sair(voltar = true) {
    const m = mesa;
    mode = 'title';
    mesa = null; st = null; me = null; eu = null; tiles = null;
    ents = []; fish = []; birds = []; outros = {}; onMove = null;
    UI.closeAll();
    $('stage-wrap').classList.remove('playing');
    $('hud').classList.add('hidden');
    $('pause').classList.add('hidden');
    hudCache = '';
    if (m && m.aoSair) m.aoSair();
    if (voltar) Screens.title(Lobby.handlers);
  }

  // Começa (ou continua) uma mesa já montada (solo ou online).
  function iniciar(m, opts = {}) {
    mesa = m;
    st = m.st;
    me = m.eu;
    World.usar(m.av);
    const ini = st.pos[me] || m.av.mapa.inicio;
    eu = { x: ini.x + (st.pos[me] ? 0 : (opts.indice || 0)), y: ini.y, dir: ini.dir || 'up' };
    for (const j of m.jogadores) j.v.luz = j.v.luzMax; // início de aventura: recupera os Pontos de Luz
    Screens.hideAll();
    $('stage-wrap').classList.add('playing');
    $('hud').classList.remove('hidden');
    mov = null; path = []; held = []; reveal = null; prevTiles = null; fish = []; birds = []; ents = []; outros = {};
    tiles = null;
    rebuild(null);
    fx = { ...lighting() };
    mode = 'world';
    onMove = opts.onMove || null;
    updateHud();
    salvar();
    if (!mesa.anfitriao) return;
    if (!st.iniciada) {
      st.iniciada = true;
      mesa.ocupada = true;
      cena(() => Roteiro.abertura(mesa), true);
    } else if (opts.boasVindas !== false) {
      cenaLocal(() => UI.say([{ who: '', text: `Bem-vindo de volta! A jornada continua no dia ${Math.min(st.dia, 7)}.` }]));
    }
  }

  // ---------- Online: posições dos outros ----------
  function moverOutro(jid, p, v) {
    let o = outros[jid];
    if (!o) {
      outros[jid] = { x: p.x, y: p.y, ox: p.x, oy: p.y, t: 1, dir: p.dir || 'down', v };
      return;
    }
    if (v) o.v = v;
    o.ox = o.ox + (o.x - o.ox) * o.t; o.oy = o.oy + (o.y - o.oy) * o.t;
    o.x = p.x; o.y = p.y; o.dir = p.dir || o.dir; o.t = 0;
  }

  function removerOutro(jid) { delete outros[jid]; }

  function moverAnimal(id, x, y, dir) {
    const e = ents.find(n => n.id === id);
    if (!e) return;
    e.ox = e.x; e.oy = e.y; e.x = x; e.y = y; e.t = 0; e.dir = dir;
  }

  function minhaPos() { return eu ? { ...pos(), dir: eu.dir } : null; }

  function init() {
    Store.load();
    setupTouch();
    setupPause();
    if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
    Screens.title(Lobby.handlers);
    requestAnimationFrame(frame);
  }

  // Ganchos para testes automatizados.
  const debug = {
    get st() { return st; },
    get mode() { return mode; },
    get ents() { return ents; },
    get mesa() { return mesa; },
    touch(id) { const e = ents.find(n => n.id === id); if (e) interactWith(e); },
  };

  return {
    init, iniciar, sair, salvar, efeito, novoDia, executar, sincronizar, refresh: refreshEntities,
    moverOutro, removerOutro, moverAnimal, minhaPos, updateHud, debug,
    get mesa() { return mesa; },
  };
})();

window.addEventListener('DOMContentLoaded', () => Game.init());
