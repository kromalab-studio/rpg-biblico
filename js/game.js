// Motor: laço principal, movimento, câmera, entrada, iluminação e ponte com o roteiro da aventura.
const Game = (() => {
  const T = 16, VW = 20, VH = 15, SPEED = 4.5;
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  canvas.width = VW * T;
  canvas.height = VH * T;
  const $ = id => document.getElementById(id);

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  let v = null;           // Viajante atual
  let st = null;          // estado da aventura (v.av1)
  let mode = 'title';     // title | world | scene | pause
  let tiles = null, prevTiles = null;
  let reveal = null;      // { x, y, t } transição radial entre mapas
  let mov = null, path = [];
  let stepFlip = false;
  let time = 0;
  let ents = [];
  let fx = { dark: 0, fog: 0, night: 0, gold: 0 };
  let birds = [], fish = [];
  let held = [];
  let bumpCooldown = 0;

  // ---------- Estado e salvamento ----------
  function newAdventure() {
    return {
      dia: 1, x: World.P.inicio.x, y: World.P.inicio.y, dir: 'up',
      c: { nomes: {} }, espigas: 0, selos: 0, concluida: false,
    };
  }

  function save() {
    if (!v) return;
    st.x = pos().x; st.y = pos().y;
    Store.save();
  }

  function pos() {
    return mov ? { x: mov.tx, y: mov.ty } : { x: st.x, y: st.y };
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

  function refreshEntities() {
    const old = new Map(ents.map(e => [e.id, e]));
    ents = Adventure.entities(st, tiles).map(e => {
      const o = old.get(e.id);
      if (o && e.wander && o.def.kind === e.kind) {
        o.def = e;
        return o;
      }
      return { id: e.id, def: e, x: e.x, y: e.y, ox: e.x, oy: e.y, t: 1, dir: e.dir || 'down', timer: 1 + Math.random() * 3 };
    });
    if (st.c.mar && !fish.length) spawnSea();
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
        vx: (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 12), vy: (Math.random() - 0.5) * 6,
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

  // ---------- Movimento ----------
  function tryMove(dir) {
    st.dir = dir;
    const [dx, dy] = DIRS[dir];
    const nx = st.x + dx, ny = st.y + dy;
    const e = entAt(nx, ny);
    if (e) {
      if (bumpCooldown <= 0 && e.def.onTouch) { bumpCooldown = 0.6; interactWith(e); }
      path = [];
      return false;
    }
    if (Art.SOLID.has(tileAt(nx, ny))) { path = []; return false; }
    mov = { fx: st.x, fy: st.y, tx: nx, ty: ny, t: 0 };
    stepFlip = !stepFlip;
    return true;
  }

  function finishMove() {
    st.x = mov.tx; st.y = mov.ty;
    mov = null;
  }

  function facing() {
    const [dx, dy] = DIRS[st.dir];
    return { x: st.x + dx, y: st.y + dy };
  }

  function interact() {
    const f = facing();
    const e = ents.find(n => n.x === f.x && n.y === f.y);
    if (e) return interactWith(e);
    const t = tileAt(f.x, f.y);
    const fn = Adventure.tileTalk(st, t, f);
    if (fn) scene(fn);
  }

  function interactWith(e) {
    if (!e.def.talk) return;
    if (e.def.wander) {
      const p = pos();
      e.dir = p.x < e.x ? 'left' : 'right';
    }
    scene(() => e.def.talk(api, e));
  }

  // Encontra um caminho até o toque do jogador (BFS).
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
          const x = k % World.W, y = Math.floor(k / World.W);
          out.unshift({ x, y });
          k = prev.get(k);
        }
        return { steps: out, face: target ? null : { x: tx, y: ty } };
      }
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = p.x + dx, ny = p.y + dy;
        const k = key(nx, ny);
        if (prev.has(k) || blocked(nx, ny)) continue;
        if (nx < 0 || ny < 0 || nx >= World.W || ny >= World.H) continue;
        prev.set(k, key(p.x, p.y));
        q.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  let pathFace = null;

  function followPath() {
    if (!path.length) {
      if (pathFace) {
        const p = pos();
        const dx = pathFace.x - p.x, dy = pathFace.y - p.y;
        st.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
        pathFace = null;
        interact();
      }
      return;
    }
    const n = path.shift();
    const dx = n.x - st.x, dy = n.y - st.y;
    const dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    if (!tryMove(dir)) { path = []; pathFace = null; }
  }

  // ---------- Cenas (roteiro assíncrono) ----------
  async function scene(fn) {
    if (mode !== 'world') return;
    mode = 'scene';
    path = [];
    held = [];
    try {
      await fn(api);
    } catch (err) {
      console.error(err);
    }
    if (mode === 'scene') mode = 'world';
    if (st) refreshEntities();
    save();
    updateHud();
  }

  const api = {
    get v() { return v; },
    get st() { return st; },
    get c() { return st.c; },
    get voz() { return RULES.camada(v).voz; },
    get camada() { return RULES.camada(v); },
    get idade() { return RULES.camadas.findIndex(c => c.id === v.camada); },
    get pos() { return pos(); },
    say: lines => UI.say(lines),
    rebuild: origin => rebuild(origin),
    refresh: () => { refreshEntities(); updateHud(); },
    wait: ms => new Promise(r => setTimeout(r, ms)),
    espigas(n, motivo) {
      if (n <= 0) return;
      if (st.revisita) { st.espigas += n; UI.toast(`+${n} 🌾 (passeio)`, 'espiga'); return; }
      v.espigas += n;
      v.espigasColhidas += n;
      st.espigas += n;
      UI.toast(`+${n} Espiga${n > 1 ? 's' : ''} 🌾 ${motivo || ''}`, 'espiga');
      updateHud();
    },
    gastarEspigas(n) {
      v.espigas = Math.max(0, v.espigas - n);
      updateHud();
    },
    selo(motivo) {
      if (st.revisita) { st.selos += 1; UI.toast(`⭐ ${motivo} (passeio)`, 'selo'); return; }
      v.selos += 1;
      st.selos += 1;
      v.registro.push(`${RULES.camada(v).selo} de Virtude — ${motivo}`);
      UI.toast(`+1 ${RULES.camada(v).selo} ⭐ ${motivo}`, 'selo');
      updateHud();
    },
    lembrar(texto) {
      v.decisoes.push(texto);
    },
    prova: spec => UI.prova(v, { ...spec, espigas: v.espigas, onSpend: n => api.gastarEspigas(n) }),
    choose: o => UI.choose(o),
    ask: o => UI.ask(o),
    card: o => UI.card(o),
    banner: (a, b) => UI.banner(a, b),
    async novoDia(n) {
      await UI.banner(`E foi a tarde e a manhã: o ${['', 'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo'][n - 1]} dia.`);
      st.dia = n;
      refreshEntities();
      save();
      updateHud();
      await Adventure.startDay(api, n);
    },
    finish: () => endAdventure(),
  };

  // ---------- Fim da aventura ----------
  async function endAdventure() {
    mode = 'scene';
    await Adventure.ending(api);
    st.concluida = true;
    save();
    toTitle();
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
      const tx = Math.floor((sx + cam.x) / T), ty = Math.floor((sy + cam.y) / T);
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
    const cam = RULES.camada(v);
    $('pause-stats').innerHTML = `
      <span>Viajante</span><b>${UI.esc(v.nome)}</b>
      <span>Idade</span><b>${UI.esc(cam.nome)}</b>
      <span>Pontos de Luz</span><b>${'♥'.repeat(v.luz)}</b>
      <span>Espigas</span><b>🌾 ${v.espigas}</b>
      <span>${UI.esc(cam.selos)}</span><b>⭐ ${v.selos}</b>
      <span>Cesto da Comunidade</span><b>🧺 ${Store.data.cesto}</b>`;
    $('opt-narrar-2').checked = UI.settings.narrar;
    $('pause').classList.remove('hidden');
  }

  function closePause() {
    $('pause').classList.add('hidden');
    mode = 'world';
  }

  function setupPause() {
    $('pause').addEventListener('click', e => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act === 'resume') closePause();
      else if (act === 'ficha') { $('pause').classList.add('hidden'); save(); Screens.ficha(v, () => { Screens.hideAll(); openPause(); }); }
      else if (act === 'title') { closePause(); save(); toTitle(); }
    });
    $('opt-narrar-2').onchange = e => { UI.settings.narrar = e.target.checked; Store.save(); };
  }

  // ---------- HUD ----------
  let hudCache = '';
  function updateHud() {
    if (!v || !st) return;
    const cam = RULES.camada(v);
    const hearts = '♥'.repeat(v.luz) + '♡'.repeat(Math.max(0, v.luzMax - v.luz));
    const html = `<b>${UI.esc(v.nome)}</b> <span class="hp">${hearts}</span><br><span>🌾 ${v.espigas}</span> &nbsp; <span>⭐ ${v.selos}</span>`;
    const goal = `<b>Dia ${Math.min(st.dia, 7)}</b> · ${UI.esc(Adventure.objective(st, api))}`;
    const key = html + goal;
    if (key === hudCache) return;
    hudCache = key;
    $('hud-stats').innerHTML = html;
    $('hud-goal').innerHTML = goal;
    $('hud-stats').title = `${cam.selos} de Virtude`;
  }

  // ---------- Desenho ----------
  function playerPixel() {
    if (mov) return { x: (mov.fx + (mov.tx - mov.fx) * mov.t) * T, y: (mov.fy + (mov.ty - mov.fy) * mov.t) * T };
    return { x: st.x * T, y: st.y * T };
  }

  function camera() {
    const pp = playerPixel();
    const cx = Math.max(0, Math.min(World.W * T - VW * T, pp.x + T / 2 - VW * T / 2));
    const cy = Math.max(0, Math.min(World.H * T - VH * T, pp.y + T / 2 - VH * T / 2));
    return { x: Math.round(cx), y: Math.round(cy) };
  }

  function render() {
    ctx.imageSmoothingEnabled = false;
    if (mode === 'title' || !tiles) {
      drawTitleBg();
      return;
    }
    const cam = camera();
    const x0 = Math.floor(cam.x / T), y0 = Math.floor(cam.y / T);
    for (let y = y0; y <= y0 + VH; y++) {
      for (let x = x0; x <= x0 + VW; x++) {
        if (x >= World.W || y >= World.H) continue;
        ctx.drawImage(Art.tile(shownTile(x, y), x, y, time), x * T - cam.x, y * T - cam.y);
      }
    }

    // Espírito pairando sobre as águas (Gênesis 1:2)
    if (!st.c.terra) {
      for (let i = 0; i < 18; i++) {
        const px = (i * 53 + time * (8 + i % 4)) % (World.W * T);
        const py = (i * 97 % (World.H * T)) + Math.sin(time + i) * 6;
        ctx.fillStyle = `rgba(220,230,255,${0.25 + 0.2 * Math.sin(time * 2 + i)})`;
        ctx.fillRect(Math.round(px - cam.x), Math.round(py - cam.y), 2, 1);
      }
    }

    // Peixes saltando
    for (const f of fish) {
      const s = Math.sin(time * 1.4 + f.phase);
      if (s < 0.4) continue;
      const hop = (s - 0.4) / 0.6;
      const fx2 = f.x * T - cam.x, fy2 = f.y * T - cam.y - hop * 6;
      if (fx2 < -T || fy2 < -T || fx2 > VW * T || fy2 > VH * T) continue;
      Art.entity(ctx, { kind: f.kind }, fx2, fy2, Math.sin(f.phase) > 0 ? 'right' : 'left', 0, time, 0.6);
    }

    const list = ents.map(e => ({
      y: e.oy + (e.y - e.oy) * e.t,
      draw: () => {
        const ex = (e.ox + (e.x - e.ox) * e.t) * T - cam.x;
        const ey = (e.oy + (e.y - e.oy) * e.t) * T - cam.y;
        if (e.def.kind === 'sparkle') Art.sparkle(ctx, ex, ey, time);
        else Art.entity(ctx, e.def, ex, ey, e.dir, e.t < 1 ? (stepFlip ? 1 : 2) : 0, time);
        if (e.def.label) Art.label(ctx, e.def.label, ex + 8, ey - 1);
        else if (e.def.marker) Art.label(ctx, '?', ex + 8, ey - 1 + Math.sin(time * 4) * 1.5);
      },
    }));
    const pp = playerPixel();
    list.push({
      y: pp.y / T,
      draw: () => Art.entity(ctx, { kind: 'person', ...v.aparencia }, pp.x - cam.x, pp.y - cam.y, st.dir, mov ? (stepFlip ? 1 : 2) * (mov.t < 0.5 ? 1 : 0) : 0, time),
    });
    list.sort((a, b) => a.y - b.y).forEach(o => o.draw());

    // Aves voando por cima
    for (const b of birds) {
      const bx = b.x - cam.x, by = b.y - cam.y;
      if (bx < -T || by < -T || bx > VW * T || by > VH * T) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(Math.round(bx + 4), Math.round(by + 22), 6, 2);
      Art.entity(ctx, { kind: b.kind }, bx, by, b.vx > 0 ? 'right' : 'left', Math.sin(time * 10 + b.x) > 0 ? 1 : 0, time, 0.75);
    }

    drawLight(pp, cam);
  }

  function drawLight(pp, cam) {
    const W = canvas.width, H = canvas.height;
    if (fx.fog > 0.01) {
      ctx.fillStyle = `rgba(190,200,220,${0.42 * fx.fog})`;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 8; i++) {
        const x = ((i * 70 + time * 7) % (W + 120)) - 60;
        ctx.fillStyle = `rgba(230,236,245,${0.18 * fx.fog})`;
        ctx.beginPath();
        ctx.ellipse(x, (i * 41) % H, 50, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (fx.night > 0.01) {
      ctx.fillStyle = `rgba(12,18,56,${0.62 * fx.night})`;
      ctx.fillRect(0, 0, W, H);
      const R = Art.rng(7);
      for (let i = 0; i < 70; i++) {
        const sx = R() * W, sy = R() * H, tw = 0.5 + 0.5 * Math.sin(time * 3 + i);
        ctx.fillStyle = `rgba(255,250,220,${fx.night * (0.4 + 0.6 * tw)})`;
        ctx.fillRect(Math.round(sx), Math.round(sy), i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1);
      }
      ctx.fillStyle = `rgba(250,246,225,${fx.night})`;
      ctx.beginPath();
      ctx.arc(W - 40, 34, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(12,18,56,${fx.night})`;
      ctx.beginPath();
      ctx.arc(W - 35, 31, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    if (fx.gold > 0.01) {
      ctx.fillStyle = `rgba(255,190,110,${0.16 * fx.gold})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (fx.dark > 0.01) {
      const cx = pp.x - cam.x + 8, cy = pp.y - cam.y + 8;
      const grd = ctx.createRadialGradient(cx, cy, 10, cx, cy, 70);
      grd.addColorStop(0, `rgba(4,4,12,${0.35 * fx.dark})`);
      grd.addColorStop(1, `rgba(4,4,12,${0.97 * fx.dark})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      // O ponto de luz brilha através da escuridão.
      for (const e of ents) {
        if (e.def.kind !== 'sparkle') continue;
        ctx.save();
        ctx.globalAlpha = fx.dark;
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
    const R = Art.rng(3);
    for (let i = 0; i < 90; i++) {
      const sx = R() * W, sy = R() * H * 0.6;
      ctx.fillStyle = `rgba(255,250,220,${0.3 + 0.5 * Math.abs(Math.sin(time * 1.5 + i))})`;
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    }
    const sunY = H * 0.78;
    const sg = ctx.createRadialGradient(W / 2, sunY, 4, W / 2, sunY, 90);
    sg.addColorStop(0, 'rgba(255,240,190,0.95)');
    sg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2f4f2a';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) ctx.lineTo(x, H * 0.82 - Math.sin(x * 0.03) * 8 - Math.sin(x * 0.07 + 1) * 4);
    ctx.lineTo(W, H);
    ctx.fill();
    ctx.fillStyle = '#1f3a1c';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) ctx.lineTo(x, H * 0.9 - Math.sin(x * 0.05 + 2) * 6);
    ctx.lineTo(W, H);
    ctx.fill();
  }

  // ---------- Atualização ----------
  function approach(cur, target, dt, speed = 0.8) {
    return cur + (target - cur) * Math.min(1, dt * speed * 3);
  }

  function update(dt) {
    time += dt;
    UI.updateDialog(dt);
    if (!st || mode === 'title') return;

    const target = Adventure.lighting(st);
    fx.dark = approach(fx.dark, target.dark, dt, 0.35);
    fx.fog = approach(fx.fog, target.fog, dt, 0.4);
    fx.night = approach(fx.night, target.night, dt, 0.4);
    fx.gold = approach(fx.gold, target.gold, dt, 0.4);

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

    const p = pos();
    for (const e of ents) {
      if (e.t < 1) { e.t = Math.min(1, e.t + dt * 2.5); continue; }
      if (!e.def.wander) continue;
      e.timer -= dt;
      if (e.timer > 0) continue;
      e.timer = 1.5 + Math.random() * 3;
      const dirs = Object.entries(DIRS);
      const [name, [dx, dy]] = dirs[(Math.random() * 4) | 0];
      const nx = e.x + dx, ny = e.y + dy;
      const pl = mov ? [{ x: mov.fx, y: mov.fy }, { x: mov.tx, y: mov.ty }] : [p];
      if (blocked(nx, ny) || pl.some(q => q.x === nx && q.y === ny)) continue;
      if (tileAt(nx, ny) === ':' && Math.random() < 0.7) continue;
      e.ox = e.x; e.oy = e.y; e.x = nx; e.y = ny; e.t = 0;
      if (dx) e.dir = name;
    }

    for (const b of birds) {
      b.x += b.vx * dt;
      b.y += b.vy * dt + Math.sin(time + b.x * 0.01) * 0.2;
      if (b.x < -40) b.x = World.W * T + 30;
      if (b.x > World.W * T + 40) b.x = -30;
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

  // ---------- Fluxo de telas ----------
  function toTitle() {
    mode = 'title';
    v = null; st = null; tiles = null; ents = []; fish = []; birds = [];
    $('stage-wrap').classList.remove('playing');
    $('hud').classList.add('hidden');
    $('pause').classList.add('hidden');
    hudCache = '';
    Screens.title({ play });
  }

  async function play(viajante) {
    v = viajante;
    if (!v.av1 || v.av1.concluida) {
      const revisita = v.aventurasConcluidas > 0;
      if (revisita) {
        const again = await UI.card({
          title: 'Rever "No Princípio"?',
          text: 'A aventura já foi concluída. Você pode passear por ela de novo — as Espigas e os Selos desta vez não contam, para manter a ficha justa.',
          buttons: [{ label: 'Voltar', value: false, ghost: true }, { label: 'Passear de novo', value: true }],
        });
        if (!again) return;
      }
      v.av1 = newAdventure();
      v.av1.revisita = revisita;
    }
    st = v.av1;
    v.luz = v.luzMax; // início de aventura: recupera todos os Pontos de Luz
    Screens.hideAll();
    $('stage-wrap').classList.add('playing');
    $('hud').classList.remove('hidden');
    mov = null; path = []; held = []; reveal = null; prevTiles = null; fish = []; birds = []; ents = [];
    rebuild(null);
    const t = Adventure.lighting(st);
    fx = { ...t };
    mode = 'world';
    updateHud();
    save();
    if (!st.iniciada) {
      st.iniciada = true;
      scene(a => Adventure.intro(a));
    } else {
      scene(a => a.say([`|Bem-vindo de volta, ${v.nome}. A jornada continua no dia ${Math.min(st.dia, 7)}.`]));
    }
  }

  function init() {
    Store.load();
    setupTouch();
    setupPause();
    if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
    toTitle();
    requestAnimationFrame(frame);
  }

  // Ganchos para testes automatizados.
  const debug = {
    get st() { return st; },
    get mode() { return mode; },
    get ents() { return ents; },
    touch(id) { const e = ents.find(n => n.id === id); if (e) interactWith(e); },
  };

  return { init, api, debug };
})();

window.addEventListener('DOMContentLoaded', () => Game.init());
