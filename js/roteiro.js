// Interpretador do roteiro: lê uma aventura de dados/ e a conduz para 1 ou vários Viajantes.
// Ele não desenha nada: fala com a "mesa" por meio de mesa.io (local no solo, pela rede no online).
//
// mesa = {
//   av: a aventura (dados),
//   st: estado salvo { dia, c: flags do mundo, resp: { jid: { id: resposta } }, grupo: { id: opção }, nomes, revisita },
//   jogadores: [{ id, v }],   // v = Viajante
//   io: { say, choose, vote, prova, ask, card, reward, efeito, novoDia, banner }
// }
const Roteiro = (() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function idade(v) {
    return RULES.camadas.findIndex(c => c.id === v.camada);
  }

  // Mesa mista: usa o termo da criança mais nova (Guia do Mestre, Seção III).
  function vozTermo(mesa) {
    return mesa.jogadores.some(j => idade(j.v) < 2) ? 'A Voz' : 'Deus';
  }

  function jogador(mesa, jid) {
    return mesa.jogadores.find(j => j.id === jid);
  }

  function resp(mesa, jid) {
    if (!mesa.st.resp[jid]) mesa.st.resp[jid] = {};
    return mesa.st.resp[jid];
  }

  function nomes(mesa) {
    const ns = mesa.jogadores.map(j => j.v.nome);
    return ns.length <= 1 ? ns.join('') : ns.slice(0, -1).join(', ') + ' e ' + ns[ns.length - 1];
  }

  function respTexto(r) {
    if (r == null) return '';
    if (Array.isArray(r)) return r.join(', ');
    if (typeof r === 'object') return r.rotulo || r.texto || '';
    return String(r);
  }

  // Troca os marcadores {nome}, {voz}, {resp.ID} etc.
  function fmt(text, mesa, ctx, extra = {}) {
    const voz = vozTermo(mesa);
    return text.replace(/\{([\w.]+)\}/g, (m, key, off) => {
      let out;
      if (key === 'nome') out = ctx ? jogador(mesa, ctx.jid).v.nome : nomes(mesa);
      else if (key === 'nomes') out = nomes(mesa);
      else if (key === 'voz') out = voz === 'A Voz' ? 'a Voz' : 'Deus';
      else if (key === 'Voz') out = voz;
      else if (key in extra) out = extra[key];
      else {
        const [kind, id] = key.split('.');
        if (kind === 'resp' && ctx) out = respTexto(resp(mesa, ctx.jid)[id]);
        else if (kind === 'virtude' && ctx) {
          const r = resp(mesa, ctx.jid)[id];
          out = r && r.virtude ? RULES.virtude(r.virtude).nome : '';
        } else if (kind === 'grupo') out = respTexto(mesa.st.grupo[id]);
        else return m;
      }
      // No meio da frase, "Um peixinho" vira "um peixinho".
      if (off > 0 && /^(Um|Uma|O|A) /.test(out) && !/[.!?:"]\s*$/.test(text.slice(0, off))) {
        out = out[0].toLowerCase() + out.slice(1);
      }
      return out;
    });
  }

  function line(mesa, s, ctx, extra) {
    const i = s.indexOf('|');
    let who = i < 0 ? '' : s.slice(0, i);
    const text = i < 0 ? s : s.slice(i + 1);
    if (who === 'VOZ') who = vozTermo(mesa);
    return { who, text: fmt(text, mesa, ctx, extra) };
  }

  function renderSpec(spec, mesa, ctx) {
    const o = { ...spec };
    for (const k of ['titulo', 'texto', 'placeholder']) if (o[k]) o[k] = fmt(o[k], mesa, ctx);
    if (o.opcoes) o.opcoes = o.opcoes.map(op => ({ ...op, rotulo: fmt(op.rotulo, mesa, ctx), desc: op.desc ? fmt(op.desc, mesa, ctx) : '' }));
    return o;
  }

  // ---------- Condições ----------
  function cond(mesa, c, ctx) {
    const r = ctx ? resp(mesa, ctx.jid) : {};
    const v = ctx ? jogador(mesa, ctx.jid).v : null;
    if (c.falhou) return !!r[c.falhou] && !r[c.falhou].sucesso;
    if (c.conseguiu) return !!r[c.conseguiu] && r[c.conseguiu].sucesso;
    if (c.parcial) return !!r[c.parcial] && r[c.parcial].parcial;
    if (c.resposta) return !!r[c.resposta] && r[c.resposta].valor === c.igual;
    if (c.respondeu) return !!respTexto(r[c.respondeu]);
    if (c.idadeMin != null) return v ? idade(v) >= c.idadeMin : mesa.jogadores.every(j => idade(j.v) >= c.idadeMin);
    if (c.dado) return v && RULES.camada(v).dado === c.dado;
    if (c.antecedente) return v && v.antecedente === c.antecedente;
    if (c.grupo) return mesa.st.grupo[c.grupo] && mesa.st.grupo[c.grupo].valor === c.igual;
    return true;
  }

  // Condição de pontos e objetivos: { sim: 'flag', nao: 'flag' }
  function flags(c, q) {
    if (!q) return true;
    if (q.sim && !c[q.sim]) return false;
    if (q.nao && c[q.nao]) return false;
    return true;
  }

  // ---------- Execução ----------
  async function run(mesa, acoes, ctx, extra) {
    let falas = [];
    const flush = async () => {
      if (!falas.length) return;
      const l = falas;
      falas = [];
      await mesa.io.say(l, ctx ? ctx.jid : null);
    };
    for (const a of acoes) {
      if (typeof a === 'string') { falas.push(line(mesa, a, ctx, extra)); continue; }
      await flush();
      await exec(mesa, a, ctx, extra);
    }
    await flush();
  }

  function alvos(mesa, ctx) {
    return ctx ? [ctx.jid] : mesa.jogadores.map(j => j.id);
  }

  async function exec(mesa, a, ctx, extra) {
    const io = mesa.io;
    if (a.cada) {
      await Promise.all(mesa.jogadores.map(j => run(mesa, a.cada, { jid: j.id }, extra)));
    } else if (a.escolha) {
      const spec = renderSpec(a.escolha, mesa, ctx);
      if (spec.grupo) {
        const valor = await io.vote(spec);
        mesa.st.grupo[spec.id] = spec.opcoes.find(o => o.valor === valor);
      } else {
        const valor = await io.choose(ctx.jid, spec);
        resp(mesa, ctx.jid)[spec.id] = spec.opcoes.find(o => o.valor === valor);
      }
    } else if (a.prova) {
      const p = a.prova;
      const r = resp(mesa, ctx.jid);
      const op = p.virtudeDe ? r[p.virtudeDe] : null;
      const spec = {
        titulo: fmt(p.titulo, mesa, ctx), texto: fmt(p.texto || '', mesa, ctx),
        virtude: p.virtude || (op && op.virtude), tags: p.tags || (op && op.tags) || [],
        dificuldade: p.dificuldade || 'media', semFalha: !!p.semFalha,
      };
      r[p.id] = await io.prova(ctx.jid, spec);
    } else if (a.pergunta) {
      const spec = renderSpec(a.pergunta, mesa, ctx);
      const res = await io.ask(ctx.jid, spec);
      if (res && res.text) resp(mesa, ctx.jid)[spec.id] = res.text;
    } else if (a.se) {
      await run(mesa, cond(mesa, a.se, ctx) ? (a.entao || []) : (a.senao || []), ctx, extra);
    } else if (a.espigas) {
      for (const jid of alvos(mesa, ctx)) io.reward(jid, { espigas: a.espigas, motivo: a.motivo || '' });
    } else if (a.selo) {
      for (const jid of alvos(mesa, ctx)) io.reward(jid, { selo: a.selo });
    } else if (a.lembrar) {
      for (const jid of alvos(mesa, ctx)) io.reward(jid, { lembrar: fmt(a.lembrar, mesa, { jid }, extra) });
    } else if (a.efeito) {
      await io.efeito(a.efeito);
    } else if (a.esperar) {
      await sleep(a.esperar);
    } else if (a.cartao) {
      const c = a.cartao;
      await io.card(ctx ? ctx.jid : null, {
        title: fmt(c.titulo || '', mesa, ctx), text: fmt(c.texto || '', mesa, ctx),
        lista: (c.lista || []).map(t => fmt(t, mesa, ctx)),
      });
    } else if (a.resumo) {
      await resumo(mesa, ctx);
    } else if (a.novoDia) {
      await novoDia(mesa, a.novoDia);
    } else if (a.encerrar) {
      await encerrar(mesa);
    }
  }

  // ---------- Dias e pontos ----------
  const ORDINAIS = ['', 'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo'];

  async function novoDia(mesa, n) {
    await mesa.io.banner(`E foi a tarde e a manhã: o ${ORDINAIS[n - 1]} dia.`);
    mesa.st.dia = n;
    await mesa.io.novoDia(n);
    await iniciarDia(mesa, n);
  }

  async function iniciarDia(mesa, n) {
    const d = mesa.av.dias[n];
    if (!d) return;
    if (d.efeitoInicio) await mesa.io.efeito(d.efeitoInicio);
    if (d.inicio) await run(mesa, d.inicio, null);
  }

  async function abertura(mesa) {
    await mesa.io.banner('A Grande Jornada', `Aventura ${mesa.av.numero} — ${mesa.av.titulo}`);
    const falas = mesa.jogadores.length === 1 && mesa.av.aberturaSolo ? mesa.av.aberturaSolo : mesa.av.abertura;
    await run(mesa, falas, null);
  }

  function pontosAtivos(mesa) {
    const d = mesa.av.dias[mesa.st.dia];
    if (!d) return [];
    return d.pontos.filter(p => flags(mesa.st.c, p.quando));
  }

  async function passo(mesa, nome) {
    await run(mesa, mesa.av.passos[nome], null);
  }

  function objetivo(mesa) {
    const st = mesa.st;
    if (st.concluida) return 'Aventura concluída!';
    const d = mesa.av.dias[st.dia];
    if (!d) return '';
    const t = d.objetivoDepois && flags(st.c, d.objetivoDepois.quando) ? d.objetivoDepois.texto : d.objetivo;
    return fmt(t, mesa, null);
  }

  // ---------- Interações livres ----------
  async function nomear(mesa, jid, animal) {
    const n = mesa.av.nomear;
    const st = mesa.st;
    const ctx = { jid };
    const ja = st.nomes[animal.id];
    if (ja) return run(mesa, [n.jaTemNome], ctx, { nomeDado: ja.nome, animal: animal.nome });
    if (st.dia > 6) return run(mesa, [n.descansando], ctx, { animal: animal.nome });
    const res = await mesa.io.ask(jid, {
      titulo: fmt(n.titulo, mesa, ctx, { animal: animal.nome }), texto: n.texto,
      sugestoes: animal.sugestoes, placeholder: n.placeholder, max: 24,
    });
    if (!res || !res.text) return;
    if (st.nomes[animal.id]) return run(mesa, [n.jaTemNome], ctx, { nomeDado: st.nomes[animal.id].nome, animal: animal.nome });
    st.nomes[animal.id] = { nome: res.text, por: jid };
    const r = resp(mesa, jid);
    const primeiro = !r.nomes;
    r.nomes = (r.nomes || []).concat(res.text);
    st.c.nomeado = true;
    await mesa.io.efeito('nomes');
    await run(mesa, [n.resposta], ctx, { nomeDado: res.text });
    if (primeiro) await run(mesa, n.primeiro, ctx);
    if (!res.fromSuggestion && !r.seloNome) {
      r.seloNome = true;
      mesa.io.reward(jid, { selo: n.seloCriativo });
    }
  }

  async function colher(mesa, jid) {
    const h = mesa.av.colheita;
    if (mesa.st.c.colheita) return run(mesa, [h.depois], { jid });
    mesa.st.c.colheita = true;
    await run(mesa, [h.texto], { jid });
    mesa.io.reward(jid, { espigas: h.espigas, motivo: h.motivo });
  }

  // ---------- Resumo e encerramento ----------
  async function resumo(mesa, ctx) {
    const R = mesa.av.resumo;
    const r = resp(mesa, ctx.jid);
    const lista = R.itens
      .filter(i => (i.se ? respTexto(r[i.se]) : i.seGrupo ? mesa.st.grupo[i.seGrupo] : true))
      .map(i => fmt(i.texto, mesa, ctx));
    await mesa.io.card(ctx.jid, { title: R.titulo, lista });
  }

  async function encerrar(mesa) {
    const E = mesa.av.encerramento;
    const T = RULES.textos;
    const io = mesa.io;
    const revisita = !!mesa.st.revisita;

    await Promise.all(mesa.jogadores.map(async j => {
      const v = j.v;
      const cam = RULES.camada(v);
      const ctx = { jid: j.id };
      const colhidas = (mesa.st.colhidas && mesa.st.colhidas[j.id]) || 0;

      if (!revisita) {
        // O primeiro dízimo, escalonado por idade.
        let separar, texto;
        if (cam.id === 'ajudante') {
          separar = 1;
          texto = T.dizimoAjudante;
        } else if (cam.id === 'aprendiz') {
          separar = colhidas >= 10 ? Math.floor(colhidas / 10) : 1;
          texto = fmt(T.dizimoAprendiz, mesa, ctx, { colhidas }) + (colhidas < 10 ? ' ' + T.dizimoAprendizPrimeiro : '');
        } else {
          separar = Math.max(0, Math.floor(v.espigasColhidas / 10) - v.dizimo);
          texto = [fmt(T.dizimoPleno, mesa, ctx, { total: v.espigasColhidas }),
            separar ? fmt(T.dizimoPlenoSeparar, mesa, ctx, { separar }) : T.dizimoPlenoAinda, T.dizimoReflexao].join(' ');
        }
        separar = Math.min(separar, v.espigas);
        await io.card(j.id, {
          title: 'O Dízimo', text: texto, verso: T.dizimoVersiculo,
          buttons: [{ label: separar ? `Colocar ${separar} 🌾 no Cesto` : 'Entendi', value: true }],
        });
        if (separar) io.reward(j.id, { dizimo: separar });

        // A Oferta — voluntária.
        if (v.espigas > 0) {
          const max = Math.min(3, v.espigas);
          const buttons = [{ label: 'Não desta vez', value: 0, ghost: true }];
          for (let i = 1; i <= max; i++) buttons.push({ label: `Ofertar ${i} 🌾`, value: i });
          const n = await io.card(j.id, { title: 'Uma oferta do coração?', text: fmt(T.oferta, mesa, ctx, { espigas: v.espigas }), buttons });
          if (n) {
            io.reward(j.id, { oferta: n });
            io.reward(j.id, { selo: 'ofertou com alegria' });
          }
        }
        io.reward(j.id, { selo: `completou a aventura ${mesa.av.numero}` });
        io.reward(j.id, { concluir: mesa.av.id });
      }

      // Pergunta de Jornada (11+).
      if (idade(v) >= 2) {
        if (!v.pergunta) {
          const opcoes = RULES.perguntasJornada.map(q => ({ valor: q, rotulo: q })).concat({ valor: '', rotulo: 'Quero escrever a minha' });
          let p = await io.choose(j.id, { titulo: 'A sua Pergunta de Jornada', texto: `${E.perguntaJornadaIntro} ${T.perguntaJornada}`, opcoes });
          if (!p) p = (await io.ask(j.id, { titulo: 'A sua Pergunta de Jornada', texto: 'Qual é a pergunta do seu coração?', opcional: false })).text;
          io.reward(j.id, { pergunta: p });
        } else {
          await io.card(j.id, { title: 'A sua Pergunta de Jornada', text: fmt(T.perguntaJornadaJaTem, mesa, ctx, { pergunta: v.pergunta }) });
        }
      }

      // O Dilema (14+).
      if (idade(v) >= 3 && E.dilema) {
        const r = await io.ask(j.id, { titulo: E.dilema.titulo, texto: E.dilema.texto, placeholder: 'Escreva o que você pensa (opcional)', multilinha: true });
        if (r && r.text) io.reward(j.id, { lembrar: `${E.dilema.titulo} — "${r.text}"` });
        await io.card(j.id, { title: 'Uma pergunta que segue com você', text: E.dilema.depois });
      }

      // A Reflexão Final, por idade.
      await io.card(j.id, { title: 'A Reflexão Final', text: E.reflexaoIntro, lista: idade(v) >= 2 ? E.reflexaoMaiores : E.reflexaoMenores });
    }));

    // O ritual de encerramento, para todos.
    await io.card(null, { title: 'O Ritual de Encerramento', verso: mesa.av.versiculo, text: 'Se a família desejar, encerre com uma oração curta:', oracao: E.oracao, buttons: [{ label: 'Amém', value: true }] });
    mesa.st.concluida = true;
    await Promise.all(mesa.jogadores.map(j => {
      const nv = RULES.nivelAtual(j.v);
      const g = (mesa.st.ganhos && mesa.st.ganhos[j.id]) || { espigas: 0, selos: 0 };
      return io.card(j.id, {
        title: `Fim da Aventura ${mesa.av.numero}`,
        text: revisita ? 'Que bom passear de novo pela Criação!' : `Nesta aventura você colheu ${g.espigas} 🌾 e ganhou ${g.selos} ⭐.`,
        lista: [`${j.v.nome} é Nível ${nv.n} — ${nv.titulo}.`, E.fim],
        buttons: [{ label: 'Terminar', value: true }],
      });
    }));
  }

  return { run, passo, abertura, iniciarDia, novoDia, pontosAtivos, objetivo, nomear, colher, fmt, line, flags, vozTermo, idade, respTexto };
})();
