// Mesa online com PeerJS: uma sala, convite por código/link, cada jogador na sua tela.
// Quem cria a sala é o anfitrião: roda o roteiro e manda cada pergunta para a tela certa.
// O Mestre pode ser o próprio jogo (o anfitrião também joga) ou uma pessoa (o anfitrião conduz).
const Rede = (() => {
  const PREFIXO = 'grande-jornada-sala-';
  const MAX = 6;               // limite de Viajantes por sala
  const CONSELHO_S = 60;       // Conselho de 1 minuto (Guia do Mestre, 8–10 anos)
  const $ = id => document.getElementById(id);
  const esc = UI.esc;

  function peerOpts() {
    // ?peerhost=localhost:9000 usa um servidor PeerJS próprio (testes); sem isso, o servidor público do PeerJS.
    const q = new URLSearchParams(location.search).get('peerhost');
    if (!q) return { debug: 1 };
    const [host, port] = q.split(':');
    return { host, port: +port || 9000, path: '/', secure: false, debug: 1 };
  }

  function novoCodigo() {
    const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 5 }, () => L[(Math.random() * L.length) | 0]).join('');
  }

  function abrirPeer(id) {
    return new Promise((resolve, reject) => {
      if (!window.Peer) return reject(new Error('Não foi possível carregar o PeerJS. Verifique a internet.'));
      const peer = id ? new Peer(id, peerOpts()) : new Peer(peerOpts());
      const t = setTimeout(() => reject(new Error('O servidor de salas não respondeu. Verifique a internet.')), 15000);
      peer.on('open', () => { clearTimeout(t); resolve(peer); });
      peer.on('error', err => { clearTimeout(t); reject(err); });
    });
  }

  // Fila: as telas deste aparelho mostram uma coisa por vez (diálogos e modais não se sobrepõem).
  function fila() {
    let p = Promise.resolve();
    return fn => {
      const r = p.then(fn, fn);
      p = r.catch(() => {});
      return r;
    };
  }
  const minhaTela = fila();

  // ---------- Votação do Conselho (mesma tela para anfitrião e convidados) ----------
  function abrirVotacao(spec, enviarVoto) {
    let fechar;
    const pronto = new Promise(r => { fechar = r; });
    let escolhido = null, confirmado = false;
    UI.modal(`
      <h2>${esc(spec.titulo || 'Conselho')}</h2>
      <p class="m-text">${esc(spec.texto || '')}</p>
      <p class="m-rule" id="vt-info">Conselho: conversem e escolham juntos. Cada um marca o seu voto.</p>
      <div class="m-options" id="vt-ops">${spec.opcoes.map(o =>
        `<button class="opt" data-v="${esc(o.valor)}"><b>${esc(o.rotulo)}</b>${o.desc ? `<small>${esc(o.desc)}</small>` : ''}<small class="vt-n" data-n="${esc(o.valor)}"></small></button>`).join('')}</div>
      <div class="m-actions"><span class="muted" id="vt-tempo"></span><button id="vt-ok" disabled>Confirmar voto</button></div>`,
    (card, close) => {
      card.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (confirmado) return;
        escolhido = b.dataset.v;
        card.querySelectorAll('.opt').forEach(x => x.classList.toggle('chip-on', x === b));
        card.querySelector('#vt-ok').disabled = false;
        enviarVoto(escolhido, false);
      });
      card.querySelector('#vt-ok').onclick = () => {
        if (!escolhido) return;
        confirmado = true;
        card.querySelector('#vt-ok').disabled = true;
        card.querySelector('#vt-ok').textContent = 'Voto confirmado ✓';
        enviarVoto(escolhido, true);
      };
      pronto.then(res => { close(res); });
    });
    return {
      atualizar({ contagem, confirmados, total, resta, rodada }) {
        const card = $('modal-card');
        if (!card) return;
        card.querySelectorAll('.vt-n').forEach(el => {
          const n = contagem[el.dataset.n] || 0;
          el.textContent = n ? `${'●'.repeat(n)} ${n} voto${n > 1 ? 's' : ''}` : '';
        });
        const t = card.querySelector('#vt-tempo');
        if (t) t.textContent = `${confirmados}/${total} confirmaram · ${resta}s`;
        const info = card.querySelector('#vt-info');
        if (info && rodada > 1) info.textContent = 'Deu empate! Conversem de novo e votem outra vez.';
        if (rodada > 1 && confirmado && !this._reset) {
          this._reset = true;
          confirmado = false; escolhido = null;
          card.querySelectorAll('.opt').forEach(x => x.classList.remove('chip-on'));
          const ok = card.querySelector('#vt-ok');
          ok.textContent = 'Confirmar voto'; ok.disabled = true;
        }
      },
      fechar: res => fechar(res),
    };
  }

  // =====================================================================
  // ANFITRIÃO
  // =====================================================================
  let sala = null; // estado da sala do anfitrião

  async function criarSala({ mestre, v }) {
    let peer = null, codigo = null;
    for (let i = 0; i < 4 && !peer; i++) {
      codigo = novoCodigo();
      try { peer = await abrirPeer(PREFIXO + codigo); } catch (e) { if (e.type !== 'unavailable-id' || i === 3) throw e; }
    }
    sala = { peer, codigo, mestre, conns: new Map(), jogadores: [], iniciada: false, mesa: null, rid: 0, pend: new Map(), votacao: null };
    if (v) sala.jogadores.push({ id: v.id, v, local: true });
    peer.on('connection', conn => conn.on('open', () => aoConectar(conn)));
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* segue */ } });
    telaSala();
    return sala;
  }

  function aoConectar(conn) {
    conn.on('data', msg => aoMsgAnfitriao(conn, msg));
    conn.on('close', () => aoSair(conn));
    conn.on('error', () => aoSair(conn));
  }

  function enviar(jid, msg) {
    const c = sala && sala.conns.get(jid);
    if (c && c.open) c.send(msg);
  }

  function todos(msg, exceto) {
    if (!sala) return;
    for (const [jid, c] of sala.conns) if (jid !== exceto && c.open) c.send(msg);
  }

  function resumoJogadores() {
    return sala.jogadores.map(j => ({ id: j.id, v: j.v, on: j.local || sala.conns.has(j.id) }));
  }

  function aoMsgAnfitriao(conn, msg) {
    if (!sala) return;
    if (msg.t === 'ola') {
      const v = msg.v;
      const ja = sala.jogadores.find(j => j.id === v.id);
      if (!ja && sala.iniciada) return conn.send({ t: 'recusa', motivo: 'A aventura desta sala já começou.' });
      if (!ja && sala.jogadores.length >= MAX) return conn.send({ t: 'recusa', motivo: `A sala está cheia (até ${MAX} Viajantes).` });
      if (!ja) sala.jogadores.push({ id: v.id, v });
      else if (!sala.iniciada) ja.v = v;
      sala.conns.set(v.id, conn);
      conn.jid = v.id;
      conn.send({ t: 'bemvindo', codigo: sala.codigo, mestre: sala.mestre, jogadores: resumoJogadores() });
      todos({ t: 'lobby', jogadores: resumoJogadores() });
      if (sala.iniciada) {
        // Voltou para a partida (recarregou a página ou caiu a conexão).
        conn.send({ t: 'inicio', ...pacoteInicio(), indice: sala.jogadores.findIndex(j => j.id === v.id) });
        if (sala.mesa) sala.mesa.conectado = true;
        Game.updateHud();
        UI.toast(`${v.nome} voltou para a sala`);
      } else {
        UI.toast(`${v.nome} entrou na sala`);
        telaSala();
      }
      return;
    }
    const jid = conn.jid;
    if (!jid) return;
    if (msg.t === 'resp') {
      const p = sala.pend.get(msg.rid);
      if (p) { sala.pend.delete(msg.rid); p.resolve(msg.valor); }
    } else if (msg.t === 'pos') {
      const j = sala.jogadores.find(x => x.id === jid);
      Game.moverOutro(jid, msg.p, j && j.v);
      todos({ t: 'pos', jid, p: msg.p, v: j && j.v }, jid);
    } else if (msg.t === 'acao') {
      Game.executar(msg.acao, jid);
    } else if (msg.t === 'gastar') {
      sala.mesa && sala.mesa.io.reward(jid, { gastar: msg.n }, true);
    } else if (msg.t === 'voto') {
      registrarVoto(jid, msg.valor, msg.confirmado);
    }
  }

  function aoSair(conn) {
    if (!sala || !conn.jid) return;
    const jid = conn.jid;
    if (sala.conns.get(jid) !== conn) return;
    sala.conns.delete(jid);
    const j = sala.jogadores.find(x => x.id === jid);
    // Pedidos em aberto para quem saiu seguem com uma resposta padrão, para a história não travar.
    for (const [rid, p] of sala.pend) if (p.jid === jid) { sala.pend.delete(rid); p.resolve(p.padrao); }
    if (!sala.iniciada) {
      sala.jogadores = sala.jogadores.filter(x => x.id !== jid);
      todos({ t: 'lobby', jogadores: resumoJogadores() });
      telaSala();
    } else {
      Game.removerOutro(jid);
      todos({ t: 'saiu', jid });
      if (j) UI.toast(`${j.v.nome} saiu da sala (pode voltar com o mesmo código)`);
    }
    if (sala.votacao) atualizarVotacao();
  }

  // Pergunta algo para a tela de um convidado e espera a resposta.
  function pedir(jid, msg, padrao) {
    if (!sala.conns.has(jid)) return Promise.resolve(padrao);
    return new Promise(resolve => {
      const rid = ++sala.rid;
      sala.pend.set(rid, { resolve, jid, padrao });
      enviar(jid, { ...msg, rid });
    });
  }

  function pacoteInicio() {
    const st = { ...sala.mesa.st };
    return { st, jogadores: sala.jogadores.map(j => ({ id: j.id, v: j.v })), mestre: sala.mestre, codigo: sala.codigo };
  }

  function iniciarAventura() {
    const av = Lobby.aventura();
    const st = Mesa.novoEstado(av, false);
    const mesa = {
      modo: 'online', av, st, jogadores: sala.jogadores.map(j => ({ id: j.id, v: j.v })),
      anfitriao: true, codigo: sala.codigo, conectado: true,
      espectador: sala.mestre === 'pessoa',
      eu: sala.mestre === 'pessoa' ? 'mestre' : sala.jogadores.find(j => j.local).id,
    };
    sala.mesa = mesa;
    sala.iniciada = true;
    mesa.io = ioAnfitriao(mesa);
    mesa.salvar = () => Store.save();
    mesa.aoEfeito = () => todos({ t: 'st', st: semPos(st) });
    mesa.aoAnimal = (id, x, y, dir) => todos({ t: 'animal', id, x, y, dir });
    mesa.aoFim = () => { todos({ t: 'fim' }); setTimeout(encerrarSala, 500); };
    mesa.aoSair = () => { todos({ t: 'fechou' }); setTimeout(encerrarSala, 300); };
    if (mesa.espectador) mesa.painelMestre = () => painelMestre(mesa);
    sala.jogadores.forEach((j, i) => { if (!j.local) enviar(j.id, { t: 'inicio', ...pacoteInicio(), indice: i }); });
    Game.iniciar(mesa, {
      indice: 0,
      onMove: p => todos({ t: 'pos', jid: mesa.eu, p, v: mesa.espectador ? null : mesa.jogadores.find(j => j.id === mesa.eu).v }),
    });
    if (!mesa.espectador) {
      const p = Game.minhaPos();
      if (p) todos({ t: 'pos', jid: mesa.eu, p, v: mesa.jogadores.find(j => j.id === mesa.eu).v });
    }
  }

  function semPos(st) {
    const { pos, ...resto } = st;
    return resto;
  }

  function encerrarSala() {
    if (!sala) return;
    try { sala.peer.destroy(); } catch (e) { /* já fechou */ }
    sala = null;
  }

  // ---------- io do anfitrião: cada pedido vai para a tela certa ----------
  function ioAnfitriao(mesa) {
    const pessoa = mesa.espectador;
    const local = jid => sala.jogadores.find(j => j.id === jid && j.local);
    const jogador = jid => mesa.jogadores.find(j => j.id === jid);
    let fala = 0;

    return {
      async say(lines, alvo) {
        const alvos = alvo ? [alvo] : mesa.jogadores.map(j => j.id);
        if (pessoa && !alvo) {
          // Mestre humano: todos veem a fala; quem avança é o Mestre.
          const id = ++fala;
          todos({ t: 'sayShow', id, lines });
          await minhaTela(() => UI.say(lines));
          todos({ t: 'sayEnd', id });
          return;
        }
        await Promise.all(alvos.map(j => (local(j) ? minhaTela(() => UI.say(lines)) : pedir(j, { t: 'say', lines }, true))));
      },
      choose(jid, spec) {
        if (local(jid)) return minhaTela(() => Mesa.ui.choose(null, spec));
        return pedir(jid, { t: 'choose', spec }, spec.opcoes[0].valor);
      },
      ask(jid, spec) {
        if (local(jid)) return minhaTela(() => Mesa.ui.ask(null, spec));
        return pedir(jid, { t: 'ask', spec }, { text: '', fromSuggestion: false });
      },
      async prova(jid, spec) {
        if (pessoa && !spec.semFalha) {
          // Mestre humano ajusta o Número da Prova.
          const j = jogador(jid);
          const nomes = { simples: 'Simples', media: 'Média', dificil: 'Difícil' };
          const d = await minhaTela(() => UI.choose({
            title: `Prova de ${j.v.nome}`,
            text: `${spec.titulo}: qual a dificuldade? (sugestão do roteiro: ${nomes[spec.dificuldade]})`,
            options: ['simples', 'media', 'dificil'].map(k => ({ label: `${nomes[k]} — ${RULES.nomeDificuldade[k]}`, value: k, tag: k === spec.dificuldade ? 'sugerida' : '' })),
          }));
          spec = { ...spec, dificuldade: d };
        }
        if (local(jid)) return minhaTela(() => Mesa.ui.prova(jogador(jid).v, spec, n => this.reward(jid, { gastar: n })));
        return pedir(jid, { t: 'prova', spec }, { sucesso: true, ok: true, parcial: false, roll: 0 });
      },
      async card(jid, spec) {
        if (jid) {
          if (local(jid)) return minhaTela(() => Mesa.ui.card(spec));
          return pedir(jid, { t: 'card', spec }, spec.buttons ? spec.buttons[spec.buttons.length - 1].value : true);
        }
        const outros = mesa.jogadores.filter(j => !local(j.id)).map(j => pedir(j.id, { t: 'card', spec }, true));
        const meu = pessoa || mesa.jogadores.some(j => local(j.id)) ? minhaTela(() => Mesa.ui.card(spec)) : Promise.resolve(true);
        const [r] = await Promise.all([meu, ...outros]);
        return r;
      },
      vote: spec => votar(mesa, spec),
      reward(jid, r, jaAplicadoNoConvidado) {
        const j = jogador(jid);
        if (!j) return;
        const t = Mesa.aplicar(j.v, mesa.st, jid, r);
        if (local(jid)) { if (t) UI.toast(t.text, t.kind); Store.save(); }
        else if (!jaAplicadoNoConvidado) enviar(jid, { t: 'reward', r });
        Game.updateHud();
      },
      efeito: nome => Game.efeito(nome),
      novoDia: () => Game.novoDia(),
      async banner(a, b) {
        todos({ t: 'banner', a, b });
        await UI.banner(a, b);
      },
    };
  }

  // ---------- Conselho e votação ----------
  function votar(mesa, spec) {
    const ids = mesa.jogadores.map(j => j.id);
    if (ids.length === 1) return mesa.io.choose(ids[0], spec);
    return new Promise(resolve => {
      const vt = sala.votacao = { spec, votos: {}, conf: {}, rodada: 1, resta: CONSELHO_S, resolve, mesa, local: null };
      todos({ t: 'vote', spec });
      const eu = sala.jogadores.find(j => j.local);
      if (eu) vt.local = abrirVotacao(spec, (valor, c) => registrarVoto(eu.id, valor, c));
      else UI.toast('Conselho: os Viajantes estão votando...');
      vt.timer = setInterval(() => {
        vt.resta--;
        atualizarVotacao();
        if (vt.resta <= 0) apurar();
      }, 1000);
      atualizarVotacao();
    });
  }

  function registrarVoto(jid, valor, confirmado) {
    const vt = sala && sala.votacao;
    if (!vt) return;
    vt.votos[jid] = valor;
    if (confirmado) vt.conf[jid] = true;
    atualizarVotacao();
    const presentes = vt.mesa.jogadores.filter(j => sala.jogadores.find(x => x.id === j.id && (x.local || sala.conns.has(x.id))));
    if (presentes.every(j => vt.conf[j.id])) apurar();
  }

  function contar(vt) {
    const contagem = {};
    Object.values(vt.votos).forEach(v => { contagem[v] = (contagem[v] || 0) + 1; });
    return contagem;
  }

  function atualizarVotacao() {
    const vt = sala.votacao;
    if (!vt) return;
    const info = { contagem: contar(vt), confirmados: Object.keys(vt.conf).length, total: vt.mesa.jogadores.length, resta: Math.max(0, vt.resta), rodada: vt.rodada };
    todos({ t: 'votos', ...info });
    if (vt.local) vt.local.atualizar(info);
  }

  async function apurar() {
    const vt = sala.votacao;
    if (!vt || vt.apurando) return;
    vt.apurando = true;
    clearInterval(vt.timer);
    const contagem = contar(vt);
    const max = Math.max(0, ...Object.values(contagem));
    let empatados = vt.spec.opcoes.map(o => o.valor).filter(v => (contagem[v] || 0) === max);
    if (!max) empatados = vt.spec.opcoes.map(o => o.valor);
    let valor;
    if (empatados.length === 1) valor = empatados[0];
    else if (vt.rodada === 1) {
      // Empate: vota de novo.
      vt.rodada = 2; vt.votos = {}; vt.conf = {}; vt.resta = 30; vt.apurando = false;
      if (vt.local) vt.local._reset = false;
      UI.toast('Empate! Votem de novo.');
      atualizarVotacao();
      vt.timer = setInterval(() => { vt.resta--; atualizarVotacao(); if (vt.resta <= 0) apurar(); }, 1000);
      return;
    } else if (vt.mesa.espectador) {
      valor = await minhaTela(() => UI.choose({
        title: 'Empate no Conselho', text: 'Os Viajantes empataram duas vezes. Como Mestre, você desempata:',
        options: vt.spec.opcoes.filter(o => empatados.includes(o.valor)).map(o => ({ label: o.rotulo, value: o.valor })),
      }));
    } else {
      valor = empatados[(Math.random() * empatados.length) | 0];
    }
    const op = vt.spec.opcoes.find(o => o.valor === valor);
    sala.votacao = null;
    todos({ t: 'votoFim', valor, rotulo: op.rotulo });
    if (vt.local) vt.local.fechar(valor);
    UI.toast(`O Conselho escolheu: ${op.rotulo}`);
    vt.resolve(valor);
  }

  // ---------- Painel do Mestre humano ----------
  async function painelMestre(mesa) {
    const acao = await UI.choose({
      title: 'Painel do Mestre',
      text: 'Recompense quem agir bem (Guia do Mestre: Selos extras por boas falas, criatividade e por ajudar os outros).',
      options: [
        { label: 'Dar um Selo de Virtude', value: 'selo' },
        { label: 'Dar Espigas', value: 'espigas' },
        { label: 'Fechar', value: '' },
      ],
    });
    if (!acao) return;
    const jid = await UI.choose({ title: 'Para quem?', options: mesa.jogadores.map(j => ({ label: j.v.nome, value: j.id })) });
    if (acao === 'selo') {
      const r = await UI.ask({ title: 'Selo de Virtude', text: 'Por quê? (aparece na Ficha)', placeholder: 'Ex.: ajudou a irmã a plantar', optional: false });
      mesa.io.reward(jid, { selo: r.text });
    } else {
      const n = await UI.choose({ title: 'Quantas Espigas?', options: [1, 2, 3].map(k => ({ label: `${k} 🌾`, value: k })) });
      mesa.io.reward(jid, { espigas: n, motivo: '— presente do Mestre' });
    }
    UI.toast('Recompensa entregue!');
  }

  // =====================================================================
  // CONVIDADO
  // =====================================================================
  let conv = null;

  async function entrarSala(codigo, v) {
    const peer = await abrirPeer(null);
    const conn = peer.connect(PREFIXO + codigo.toUpperCase(), { reliable: true });
    conv = { peer, conn, codigo: codigo.toUpperCase(), v, mesa: null, jogadores: [], mestre: null };
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Não achei essa sala. Confira o código e se quem criou a sala está com o jogo aberto.')), 12000);
      conn.on('open', () => { clearTimeout(t); conn.send({ t: 'ola', v }); resolve(); });
      peer.on('error', err => { clearTimeout(t); reject(err.type === 'peer-unavailable' ? new Error('Não achei essa sala. Confira o código.') : err); });
    });
    conn.on('data', msg => aoMsgConvidado(msg));
    conn.on('close', () => {
      if (!conv) return;
      const estavaJogando = !!conv.mesa;
      conv = null;
      if (estavaJogando) Game.sair(true);
      else Screens.title(Lobby.handlers);
      UI.card({ title: 'A sala foi fechada', text: 'Quem criou a sala saiu ou a conexão caiu. Você pode entrar de novo com o mesmo código, se a sala ainda existir.' });
    });
    return conv;
  }

  function responder(rid, valor) {
    if (conv && conv.conn.open) conv.conn.send({ t: 'resp', rid, valor });
  }

  let votacaoConv = null;
  let falaMestre = null;

  async function aoMsgConvidado(msg) {
    if (!conv) return;
    const v = conv.v;
    switch (msg.t) {
      case 'recusa':
        UI.card({ title: 'Não deu para entrar', text: msg.motivo });
        sairConvidado();
        Screens.title(Lobby.handlers);
        break;
      case 'bemvindo':
      case 'lobby':
        conv.jogadores = msg.jogadores;
        if (msg.mestre) conv.mestre = msg.mestre;
        if (!conv.mesa) telaSalaConvidado();
        break;
      case 'inicio': iniciarConvidado(msg); break;
      case 'st': if (conv.mesa) Game.sincronizar(msg.st); break;
      case 'pos': if (conv.mesa && msg.jid !== v.id) Game.moverOutro(msg.jid, msg.p, msg.v); break;
      case 'saiu': Game.removerOutro(msg.jid); break;
      case 'animal': Game.moverAnimal(msg.id, msg.x, msg.y, msg.dir); break;
      case 'banner': UI.banner(msg.a, msg.b); break;
      case 'reward': {
        const t = Mesa.aplicar(v, null, v.id, msg.r);
        if (t) UI.toast(t.text, t.kind);
        Store.save();
        Game.updateHud();
        break;
      }
      case 'say': await minhaTela(() => UI.say(msg.lines)); responder(msg.rid, true); break;
      case 'sayShow': falaMestre = msg.id; minhaTela(() => (falaMestre === msg.id ? UI.say(msg.lines) : null)); break;
      case 'sayEnd': if (falaMestre === msg.id) { falaMestre = null; UI.closeDialog(); } break;
      case 'choose': responder(msg.rid, await minhaTela(() => Mesa.ui.choose(v, msg.spec))); break;
      case 'ask': responder(msg.rid, await minhaTela(() => Mesa.ui.ask(v, msg.spec))); break;
      case 'card': responder(msg.rid, await minhaTela(() => Mesa.ui.card(msg.spec))); break;
      case 'prova': {
        const r = await minhaTela(() => Mesa.ui.prova(v, msg.spec, n => {
          Mesa.aplicar(v, null, v.id, { gastar: n });
          Store.save();
          conv.conn.send({ t: 'gastar', n });
        }));
        responder(msg.rid, r);
        break;
      }
      case 'vote':
        votacaoConv = abrirVotacao(msg.spec, (valor, confirmado) => conv.conn.send({ t: 'voto', valor, confirmado }));
        break;
      case 'votos': if (votacaoConv) votacaoConv.atualizar(msg); break;
      case 'votoFim':
        if (votacaoConv) { votacaoConv.fechar(msg.valor); votacaoConv = null; }
        UI.toast(`O Conselho escolheu: ${msg.rotulo}`);
        break;
      case 'fim': case 'fechou': {
        const c = conv;
        conv = null;
        try { c.peer.destroy(); } catch (e) { /* já fechou */ }
        Game.sair(true);
        if (msg.t === 'fechou') UI.card({ title: 'A partida terminou', text: 'Quem criou a sala encerrou a partida.' });
        break;
      }
    }
  }

  function iniciarConvidado(msg) {
    const av = Lobby.aventura();
    const jogadores = msg.jogadores.map(j => (j.id === conv.v.id ? { id: j.id, v: conv.v } : j));
    const st = { ...msg.st, pos: {} };
    const mesa = {
      modo: 'online', av, st, jogadores, eu: conv.v.id, anfitriao: false, codigo: msg.codigo, conectado: true,
      salvar: () => Store.save(),
      acionar: acao => conv && conv.conn.send({ t: 'acao', acao }),
      aoSair: () => sairConvidado(),
    };
    conv.mesa = mesa;
    Game.iniciar(mesa, { indice: msg.indice || 1, onMove: p => conv && conv.conn.send({ t: 'pos', p }) });
    const p = Game.minhaPos();
    if (p) conv.conn.send({ t: 'pos', p });
  }

  function sairConvidado() {
    if (!conv) return;
    const c = conv;
    conv = null;
    try { c.peer.destroy(); } catch (e) { /* já fechou */ }
  }

  // =====================================================================
  // TELAS DA SALA
  // =====================================================================
  function linkConvite(codigo) {
    const u = new URL(location.href);
    u.search = '';
    u.searchParams.set('sala', codigo);
    const ph = new URLSearchParams(location.search).get('peerhost');
    if (ph) u.searchParams.set('peerhost', ph);
    return u.toString();
  }

  function listaHTML(jogadores) {
    return jogadores.map(j => `<li class="v-card"><canvas width="48" height="48" class="v-avatar" data-id="${esc(j.id)}"></canvas>
      <div class="v-info"><b>${esc(j.v.nome)}</b><small>${esc(RULES.camada(j.v).nome)}</small></div></li>`).join('');
  }

  function desenharAvatares(jogadores) {
    document.querySelectorAll('#sala-lista canvas').forEach(c => {
      const j = jogadores.find(x => x.id === c.dataset.id);
      if (j) Screens.drawPreview(c, j.v.aparencia);
    });
  }

  function telaSala() {
    if (!sala) return;
    const link = linkConvite(sala.codigo);
    $('sala-codigo').textContent = sala.codigo;
    $('sala-link').value = link;
    $('sala-mestre').textContent = sala.mestre === 'pessoa' ? 'Você é o Mestre: conduz a história, ajusta as Provas e dá Selos.' : 'O jogo é o Mestre, e você também joga.';
    $('sala-lista').innerHTML = listaHTML(sala.jogadores) || '<li class="empty">Esperando os Viajantes entrarem...</li>';
    desenharAvatares(sala.jogadores);
    $('sala-anfitriao').classList.remove('hidden');
    $('sala-status').textContent = `${sala.jogadores.length}/${MAX} Viajantes na sala`;
    $('sala-comecar').disabled = sala.jogadores.length < 1;
    $('sala-comecar').onclick = () => iniciarAventura();
    $('sala-copiar').onclick = async () => {
      try { await navigator.clipboard.writeText(link); UI.toast('Link copiado!'); } catch (e) { $('sala-link').select(); }
    };
    $('sala-compartilhar').classList.toggle('hidden', !navigator.share);
    $('sala-compartilhar').onclick = () => navigator.share({ title: 'A Grande Jornada', text: `Vem jogar comigo! Código da sala: ${sala.codigo}`, url: link }).catch(() => {});
    $('sala-sair').onclick = () => { encerrarSala(); Screens.title(Lobby.handlers); };
    Screens.show('sala');
  }

  function telaSalaConvidado() {
    if (!conv) return;
    $('sala-codigo').textContent = conv.codigo;
    $('sala-mestre').textContent = conv.mestre === 'pessoa' ? 'Nesta sala, o Mestre é uma pessoa.' : 'Nesta sala, o jogo é o Mestre.';
    $('sala-lista').innerHTML = listaHTML(conv.jogadores);
    desenharAvatares(conv.jogadores);
    $('sala-anfitriao').classList.add('hidden');
    $('sala-status').textContent = 'Esperando quem criou a sala começar a aventura...';
    $('sala-sair').onclick = () => { sairConvidado(); Screens.title(Lobby.handlers); };
    Screens.show('sala');
  }

  async function escolherViajante(texto) {
    const vs = Store.data.viajantes;
    if (!vs.length) {
      await UI.card({ title: 'Crie um Viajante primeiro', text: 'Para jogar online, cada pessoa precisa de um Viajante neste aparelho. Toque em "+ Novo Viajante" e volte aqui.' });
      return null;
    }
    return UI.choose({
      title: 'Qual Viajante vai jogar?', text: texto,
      options: vs.map(v => ({ label: v.nome, desc: `${RULES.camada(v).nome} · Nível ${RULES.nivelAtual(v).n}`, value: v.id })).concat({ label: 'Cancelar', value: '' }),
    }).then(id => (id ? Store.get(id) : null));
  }

  async function fluxoCriar() {
    const mestre = await UI.choose({
      title: 'Criar uma sala', text: 'Quem vai ser o Mestre?',
      options: [
        { label: 'O jogo é o Mestre', desc: 'O jogo narra; você também joga com o seu Viajante.', value: 'jogo' },
        { label: 'Eu sou o Mestre', desc: 'Você conduz a história para os outros: avança as falas, ajusta as Provas e dá Selos.', value: 'pessoa' },
        { label: 'Cancelar', value: '' },
      ],
    });
    if (!mestre) return;
    let v = null;
    if (mestre === 'jogo') {
      v = await escolherViajante('Você joga junto com os convidados.');
      if (!v) return;
    }
    UI.toast('Criando a sala...');
    try {
      await criarSala({ mestre, v });
    } catch (e) {
      UI.card({ title: 'Não deu para criar a sala', text: e.message || String(e) });
    }
  }

  async function fluxoEntrar(codigoInicial) {
    let codigo = codigoInicial;
    if (!codigo) {
      const r = await UI.ask({ title: 'Entrar numa sala', text: 'Digite o código que quem criou a sala te passou.', placeholder: 'Ex.: K7QM2', optional: true, max: 8, okLabel: 'Continuar' });
      codigo = (r.text || '').trim().toUpperCase();
      if (!codigo) return;
    }
    const v = await escolherViajante(`Sala ${codigo}`);
    if (!v) return;
    UI.toast('Entrando na sala...');
    try {
      await entrarSala(codigo, v);
    } catch (e) {
      conv = null;
      UI.card({ title: 'Não deu para entrar', text: e.message || String(e) });
    }
  }

  // Abriu o jogo por um link de convite (?sala=CODIGO).
  function verConvite() {
    const codigo = new URLSearchParams(location.search).get('sala');
    if (codigo) setTimeout(() => fluxoEntrar(codigo.toUpperCase()), 300);
  }

  return { fluxoCriar, fluxoEntrar, verConvite, MAX, get sala() { return sala; }, get conv() { return conv; } };
})();
