// Telas fora do mundo: salvamento, tela inicial, criação do Viajante e Ficha.
const Store = (() => {
  const KEY = 'grande-jornada-v1';
  let data = { viajantes: [], cesto: 0, settings: { narrar: false } };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) data = Object.assign(data, JSON.parse(raw));
    } catch (e) { /* armazenamento indisponível: segue só na memória */ }
    UI.settings.narrar = !!data.settings.narrar;
    return data;
  }

  function save() {
    data.settings.narrar = UI.settings.narrar;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* idem */ }
  }

  return {
    load, save,
    get data() { return data; },
    get(id) { return data.viajantes.find(v => v.id === id); },
    add(v) { data.viajantes.push(v); save(); },
    remove(id) { data.viajantes = data.viajantes.filter(v => v.id !== id); save(); },
  };
})();

const Screens = (() => {
  const $ = id => document.getElementById(id);
  const esc = UI.esc;

  const PALETA = {
    robe: ['#d2b06e', '#c8553d', '#4f7cac', '#6a9a4a', '#8a5fa8', '#e6e2d6', '#a8683a', '#e8a33a'],
    hair: ['#2a1a0c', '#4a2c17', '#8a4f1f', '#c9822f', '#e8c97a', '#d8d8d0'],
    skin: ['#f3cfa6', '#e3b483', '#c99868', '#a0704a', '#6e4a2f'],
  };

  const EXEMPLOS = {
    traco: 'Ex.: "Eu sempre ajudo os mais fracos"',
    ideal: 'Ex.: "Ninguém fica para trás"',
    vinculo: 'Ex.: "Minha irmã caçula"',
    defeito: 'Ex.: "Fujo quando sinto medo"',
  };

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('hidden', s.id !== id));
  }

  function hideAll() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  }

  function drawPreview(canvas, ap, dir = 'down') {
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    const s = canvas.width / 16;
    g.save();
    g.scale(s, s);
    Art.person(g, ap, dir, 0);
    g.restore();
  }

  function progresso(v) {
    if (v.av1 && v.av1.concluida) return 'No Princípio — concluída';
    if (v.av1) return `No Princípio — Dia ${Math.min(7, v.av1.dia)}`;
    return 'Pronto para a primeira aventura';
  }

  // ---------- Tela inicial ----------
  function title(handlers) {
    const d = Store.data;
    const list = d.viajantes.map(v => {
      const cam = RULES.camada(v);
      const nv = RULES.nivelAtual(v);
      return `<li class="v-card" data-id="${v.id}">
        <canvas width="48" height="48" class="v-avatar"></canvas>
        <div class="v-info"><b>${esc(v.nome)}</b><small>${esc(cam.nome)} · Nível ${nv.n} — ${esc(nv.titulo)}</small><small>${esc(progresso(v))}</small></div>
        <div class="v-actions">
          <button data-act="play">${v.av1 && v.av1.concluida ? 'Rever' : v.av1 ? 'Continuar' : 'Começar'}</button>
          <button data-act="ficha" class="ghost">Ficha</button>
          <button data-act="del" class="ghost small" aria-label="Apagar Viajante">✕</button>
        </div>
      </li>`;
    }).join('');

    $('title-list').innerHTML = list || '<li class="empty">Nenhum Viajante ainda. Crie o seu para começar!</li>';
    $('title-cesto').textContent = d.cesto;
    $('opt-narrar').checked = UI.settings.narrar;

    $('title-list').querySelectorAll('.v-card').forEach(li => {
      const v = Store.get(li.dataset.id);
      drawPreview(li.querySelector('canvas'), v.aparencia);
      li.querySelector('[data-act=play]').onclick = () => handlers.play(v);
      li.querySelector('[data-act=ficha]').onclick = () => ficha(v, () => title(handlers));
      li.querySelector('[data-act=del]').onclick = async () => {
        const ok = await UI.card({
          title: 'Apagar Viajante?',
          text: `A ficha de ${v.nome} será apagada deste navegador. Isso não pode ser desfeito.`,
          buttons: [{ label: 'Cancelar', value: false, ghost: true }, { label: 'Apagar', value: true }],
        });
        if (ok) { Store.remove(v.id); title(handlers); }
      };
    });
    $('btn-new').onclick = () => creation(handlers);
    $('opt-narrar').onchange = e => { UI.settings.narrar = e.target.checked; Store.save(); };
    show('title');
  }

  // ---------- Criação do Viajante ----------
  function creation(handlers) {
    const v = {
      id: 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nome: '', camada: 'aprendiz',
      aparencia: { robe: PALETA.robe[0], hair: PALETA.hair[1], skin: PALETA.skin[1], long: false, lenco: null },
      descricao: '', favorita: null, virtudes: {}, antecedente: null,
      traco: '', ideal: '', vinculo: '', defeito: '', pergunta: '',
    };
    const f = $('creation');
    const preview = $('cr-preview');
    let previewDir = 0;

    function sw(kind) {
      return PALETA[kind].map(c => `<button type="button" class="sw ${v.aparencia[kind] === c ? 'on' : ''}" data-kind="${kind}" data-c="${c}" style="background:${c}" aria-label="cor"></button>`).join('');
    }

    function renderAparencia() {
      $('cr-robe').innerHTML = sw('robe');
      $('cr-hair').innerHTML = sw('hair');
      $('cr-skin').innerHTML = sw('skin');
      f.querySelectorAll('.sw').forEach(b => b.onclick = () => {
        v.aparencia[b.dataset.kind] = b.dataset.c;
        renderAparencia();
      });
      drawPreview(preview, v.aparencia, ['down', 'right', 'up', 'left'][previewDir]);
    }

    function renderCamadas() {
      $('cr-camadas').innerHTML = RULES.camadas.map(c => `
        <button type="button" class="cam ${v.camada === c.id ? 'on' : ''}" data-id="${c.id}">
          <b>${esc(c.nome)}</b><span>${esc(c.idade)}</span>
          <small>${c.dado === 'luz' ? 'Dado da Luz' : 'd' + c.dado} · ${c.luz} Pontos de Luz</small>
        </button>`).join('');
      f.querySelectorAll('.cam').forEach(b => b.onclick = () => {
        v.camada = b.dataset.id;
        v.virtudes = {};
        v.favorita = null;
        renderAll();
      });
    }

    function virtudesUI() {
      const cam = RULES.camada(v);
      $('cr-virt-rule').textContent = cam.regraVirtudes;
      const box = $('cr-virtudes');
      const vals = v.virtudes;

      if (v.camada === 'ajudante' || v.camada === 'aprendiz') {
        const multi = v.camada === 'aprendiz';
        box.innerHTML = RULES.virtudes.map(x => {
          const on = multi ? vals[x.id] === 1 : v.favorita === x.id;
          return `<button type="button" class="virt ${on ? 'on' : ''}" data-id="${x.id}"><b>${esc(x.nome)}</b><small>${esc(x.desc)}</small><small class="who">${esc(x.quem)}</small></button>`;
        }).join('');
        box.querySelectorAll('.virt').forEach(b => b.onclick = () => {
          const id = b.dataset.id;
          if (!multi) { v.favorita = id; v.virtudes = {}; }
          else if (vals[id]) delete vals[id];
          else if (Object.keys(vals).length < 2) vals[id] = 1;
          virtudesUI();
        });
        const n = multi ? Object.keys(vals).length : (v.favorita ? 1 : 0);
        $('cr-virt-status').textContent = multi ? `${n} de 2 escolhidas` : (n ? '' : 'Escolha a sua favorita');
        return;
      }

      if (v.camada === 'guardiao') {
        const pool = [3, 2, 1, 1];
        const used = Object.values(vals);
        const restantes = pool.slice();
        used.forEach(u => restantes.splice(restantes.indexOf(u), 1));
        box.innerHTML = RULES.virtudes.map(x => `
          <div class="vrow"><div><b>${esc(x.nome)}</b><small>${esc(x.desc)}</small></div>
          <div class="vbtns">${[3, 2, 1].map(p => {
            const on = vals[x.id] === p;
            const can = on || restantes.includes(p);
            return `<button type="button" data-id="${x.id}" data-p="${p}" class="${on ? 'on' : ''}" ${can ? '' : 'disabled'}>+${p}</button>`;
          }).join('')}</div></div>`).join('');
        box.querySelectorAll('.vbtns button').forEach(b => b.onclick = () => {
          const id = b.dataset.id, p = +b.dataset.p;
          if (vals[id] === p) delete vals[id]; else vals[id] = p;
          virtudesUI();
        });
        $('cr-virt-status').textContent = restantes.length ? `Falta distribuir: ${restantes.map(p => '+' + p).join(', ')}` : 'Tudo distribuído!';
        return;
      }

      // Mensageiro: 8 pontos, máximo +3 em cada.
      const total = Object.values(vals).reduce((a, b) => a + b, 0);
      box.innerHTML = RULES.virtudes.map(x => {
        const n = vals[x.id] || 0;
        return `<div class="vrow"><div><b>${esc(x.nome)}</b><small>${esc(x.desc)}</small></div>
          <div class="stepper"><button type="button" data-id="${x.id}" data-d="-1" ${n <= 0 ? 'disabled' : ''}>−</button><span>+${n}</span><button type="button" data-id="${x.id}" data-d="1" ${n >= 3 || total >= 8 ? 'disabled' : ''}>+</button></div></div>`;
      }).join('');
      box.querySelectorAll('.stepper button').forEach(b => b.onclick = () => {
        const id = b.dataset.id;
        vals[id] = Math.max(0, Math.min(3, (vals[id] || 0) + +b.dataset.d));
        if (!vals[id]) delete vals[id];
        virtudesUI();
      });
      $('cr-virt-status').textContent = `${8 - total} pontos para distribuir`;
    }

    function antecedentesUI() {
      const sec = $('cr-sec-antecedente');
      sec.classList.toggle('hidden', v.camada === 'ajudante');
      $('cr-ant-rule').textContent = v.camada === 'aprendiz' ? 'Opcional nesta idade.' : 'Recomendado: ele dá um pequeno talento e uma razão para caminhar.';
      $('cr-antecedentes').innerHTML = RULES.antecedentes.map(a => `
        <button type="button" class="ant ${v.antecedente === a.id ? 'on' : ''}" data-id="${a.id}"><b>${esc(a.nome)}</b><small>${esc(a.quem)}</small><small class="gain">${esc(a.ganho)}</small></button>`).join('');
      f.querySelectorAll('.ant').forEach(b => b.onclick = () => {
        v.antecedente = v.antecedente === b.dataset.id ? null : b.dataset.id;
        antecedentesUI();
      });
    }

    function cantosUI() {
      const idx = RULES.camadas.findIndex(c => c.id === v.camada);
      $('cr-sec-cantos').classList.toggle('hidden', idx < 1);
      $('cr-row-vinculo').classList.toggle('hidden', idx < 2);
      $('cr-row-defeito').classList.toggle('hidden', idx < 2);
      $('cr-sec-pergunta').classList.toggle('hidden', idx < 2);
      $('cr-perguntas').innerHTML = RULES.perguntasJornada.map(p =>
        `<button type="button" class="chip ${v.pergunta === p ? 'on' : ''}">${esc(p)}</button>`).join('');
      $('cr-perguntas').querySelectorAll('.chip').forEach(b => b.onclick = () => {
        v.pergunta = b.textContent;
        $('cr-pergunta').value = v.pergunta;
        cantosUI();
      });
    }

    function renderAll() {
      renderCamadas();
      virtudesUI();
      antecedentesUI();
      cantosUI();
      renderAparencia();
    }

    $('cr-name').value = '';
    $('cr-desc').value = '';
    ['traco', 'ideal', 'vinculo', 'defeito'].forEach(k => {
      $('cr-' + k).value = '';
      $('cr-' + k).placeholder = EXEMPLOS[k];
    });
    $('cr-pergunta').value = '';
    $('cr-long').checked = false;
    $('cr-lenco').checked = false;
    $('cr-error').textContent = '';

    $('cr-long').onchange = e => { v.aparencia.long = e.target.checked; renderAparencia(); };
    $('cr-lenco').onchange = e => { v.aparencia.lenco = e.target.checked ? '#e9dcbc' : null; renderAparencia(); };
    $('cr-turn').onclick = () => { previewDir = (previewDir + 1) % 4; renderAparencia(); };
    $('cr-pergunta').oninput = e => { v.pergunta = e.target.value; cantosUI(); };
    $('cr-back').onclick = () => title(handlers);

    $('cr-start').onclick = () => {
      v.nome = $('cr-name').value.trim();
      v.descricao = $('cr-desc').value.trim();
      ['traco', 'ideal', 'vinculo', 'defeito'].forEach(k => { v[k] = $('cr-' + k).value.trim(); });
      v.pergunta = $('cr-pergunta').value.trim();
      const err = validate(v);
      $('cr-error').textContent = err || '';
      if (err) return;
      const cam = RULES.camada(v);
      Object.assign(v, {
        luzMax: cam.luz, luz: cam.luz, selos: 0, espigas: 0, espigasColhidas: 0, dizimo: 0, ofertas: 0,
        aventurasConcluidas: 0, selosLivro: [], decisoes: [], registro: [], av1: null, criadoEm: Date.now(),
      });
      if (v.camada !== 'aprendiz' && v.camada !== 'ajudante') {
        RULES.virtudes.forEach(x => { v.virtudes[x.id] = v.virtudes[x.id] || 0; });
      }
      Store.add(v);
      handlers.play(v);
    };

    renderAll();
    show('creation');
    f.scrollTop = 0;
  }

  function validate(v) {
    if (!v.nome) return 'Dê um nome ao seu Viajante.';
    const vals = Object.values(v.virtudes);
    if (v.camada === 'ajudante' && !v.favorita) return 'Escolha a Virtude favorita do seu Viajante.';
    if (v.camada === 'aprendiz' && vals.length !== 2) return 'Escolha duas Virtudes.';
    if (v.camada === 'guardiao' && vals.slice().sort().join() !== '1,1,2,3') return 'Distribua +3, +2, +1 e +1 entre quatro Virtudes.';
    if (v.camada === 'mensageiro' && vals.reduce((a, b) => a + b, 0) !== 8) return 'Distribua exatamente 8 pontos entre as Virtudes.';
    return null;
  }

  // ---------- Ficha do Viajante ----------
  function ficha(v, onBack) {
    const cam = RULES.camada(v);
    const nv = RULES.nivelAtual(v);
    const prox = RULES.proximoNivel(v);
    const ant = RULES.antecedentes.find(a => a.id === v.antecedente);
    const idx = RULES.camadas.findIndex(c => c.id === v.camada);

    const virt = v.camada === 'ajudante'
      ? `<p class="fav">Virtude favorita: <b>${esc(RULES.virtude(v.favorita).nome)}</b></p>`
      : `<ul class="f-virt">${RULES.virtudes.map(x => {
        const n = v.virtudes[x.id] || 0;
        if (v.camada === 'aprendiz' && !n) return '';
        return `<li><span>${esc(x.nome)}</span><b>${n > 0 ? '+' + n : n}</b></li>`;
      }).join('')}</ul>`;

    const hearts = Array.from({ length: v.luzMax }, (_, i) => `<i class="${i < v.luz ? 'on' : ''}">♥</i>`).join('');
    const trilha = RULES.niveis.map(n => `<li class="${n.n <= nv.n ? 'on' : ''}"><b>${n.n}</b><small>${esc(n.titulo)}</small></li>`).join('');
    const proxTxt = prox
      ? `Próximo: <b>${esc(prox.titulo)}</b> — ${cam.selos}: ${v.selos}/${prox.selos} · Aventuras: ${v.aventurasConcluidas}/${prox.aventuras}`
      : 'Você chegou ao topo da trilha!';
    const cantos = [['Traço', v.traco], ['Ideal', v.ideal], ['Vínculo', v.vinculo], ['Defeito', v.defeito]]
      .filter(([, t]) => t).map(([k, t]) => `<p><b>${k}:</b> ${esc(t)}</p>`).join('');
    const decisoes = (v.decisoes || []).map(d => `<li>${esc(d)}</li>`).join('');
    const registro = (v.registro || []).slice(-12).map(r => `<li>${esc(r)}</li>`).join('');

    $('ficha-body').innerHTML = `
      <div class="f-head">
        <canvas width="96" height="96" id="f-avatar"></canvas>
        <div>
          <p class="kicker">Ficha do ${esc(cam.nome)} · ${esc(cam.idade)}</p>
          <h2>${esc(v.nome)}</h2>
          <p>Nível ${nv.n} — <b>${esc(nv.titulo)}</b></p>
          ${v.descricao ? `<p class="muted">${esc(v.descricao)}</p>` : ''}
        </div>
      </div>
      <div class="f-grid">
        <section><h3>${v.camada === 'ajudante' ? 'A Virtude' : 'Virtudes'}</h3>${virt}</section>
        <section><h3>Pontos de Luz</h3><div class="hearts">${hearts}</div></section>
        <section><h3>${esc(cam.selos)} de Virtude</h3><p class="big">⭐ ${v.selos}</p></section>
        <section><h3>Espigas</h3><p class="big">🌾 ${v.espigas}</p><small>Colhidas: ${v.espigasColhidas} · Dízimo: ${v.dizimo} · Ofertas: ${v.ofertas}</small></section>
      </div>
      <section><h3>Trilha de Níveis</h3><ol class="trilha">${trilha}</ol><p class="muted">${proxTxt}</p></section>
      <section><h3>Selos de Livro</h3><p>${v.selosLivro.length ? v.selosLivro.map(esc).join(' · ') : '<span class="muted">Nenhum livro concluído ainda — o primeiro é Gênesis!</span>'}</p></section>
      ${ant ? `<section><h3>Antecedente</h3><p><b>${esc(ant.nome)}</b> — ${esc(ant.ganho)}</p></section>` : ''}
      ${cantos ? `<section><h3>Os Quatro Cantos do Coração</h3>${cantos}</section>` : ''}
      ${idx >= 2 ? `<section><h3>Pergunta de Jornada</h3><p>${v.pergunta ? esc(v.pergunta) : '<span class="muted">Ainda não escolhida.</span>'}</p></section>` : ''}
      ${decisoes ? `<section><h3>Memórias e Decisões da Jornada</h3><ul class="list">${decisoes}</ul></section>` : ''}
      ${registro ? `<section><h3>Conquistas recentes</h3><ul class="list">${registro}</ul></section>` : ''}
    `;
    drawPreview($('f-avatar'), v.aparencia);
    $('ficha-back').onclick = onBack;
    show('ficha');
    $('ficha').scrollTop = 0;
  }

  return { show, hideAll, title, creation, ficha, drawPreview };
})();
