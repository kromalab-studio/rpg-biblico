// A mesa: quem está jogando, o estado da aventura e como o roteiro conversa com cada tela.
// No solo, tudo acontece neste aparelho (io local). No online, o anfitrião roda o roteiro
// e o io manda cada pergunta para a tela certa (js/rede.js).
const Mesa = (() => {
  function novoEstado(av, revisita) {
    return {
      aventura: av.id, dia: 1, c: {}, resp: {}, grupo: {}, nomes: {},
      colhidas: {}, ganhos: {}, pos: {}, iniciada: false, concluida: false, revisita: !!revisita,
    };
  }

  // Aplica uma recompensa no Viajante e no estado da aventura. Usado pelo anfitrião e pelo convidado.
  function aplicar(v, st, jid, r) {
    const rev = st && st.revisita;
    const ganhos = st ? (st.ganhos[jid] = st.ganhos[jid] || { espigas: 0, selos: 0 }) : { espigas: 0, selos: 0 };
    const cam = RULES.camada(v);
    let toast = null;
    if (r.espigas) {
      if (st) st.colhidas[jid] = (st.colhidas[jid] || 0) + r.espigas;
      ganhos.espigas += r.espigas;
      if (!rev) { v.espigas += r.espigas; v.espigasColhidas += r.espigas; }
      toast = { text: `+${r.espigas} Espiga${r.espigas > 1 ? 's' : ''} 🌾 ${r.motivo || ''}${rev ? ' (passeio)' : ''}`, kind: 'espiga' };
    }
    if (r.selo) {
      ganhos.selos += 1;
      if (!rev) { v.selos += 1; v.registro.push(`${cam.selo} de Virtude — ${r.selo}`); }
      toast = { text: `+1 ${cam.selo} ⭐ ${r.selo}${rev ? ' (passeio)' : ''}`, kind: 'selo' };
    }
    if (r.lembrar && !rev) {
      v.decisoes.push(r.lembrar);
      if (st) { st.lembrados = st.lembrados || {}; st.lembrados[jid] = (st.lembrados[jid] || 0) + 1; }
    }
    if (r.dizimo) {
      v.espigas -= r.dizimo; v.dizimo += r.dizimo;
      Store.data.cesto += r.dizimo;
      toast = { text: `🧺 ${r.dizimo} Espiga${r.dizimo > 1 ? 's' : ''} no Cesto da Comunidade`, kind: 'espiga' };
    }
    if (r.oferta) {
      v.espigas -= r.oferta; v.ofertas += r.oferta;
      Store.data.cesto += r.oferta;
    }
    if (r.gastar) v.espigas = Math.max(0, v.espigas - r.gastar);
    if (r.concluir) v.aventurasConcluidas += 1;
    if (r.pergunta) v.pergunta = r.pergunta;
    return toast;
  }

  // ---------- io local (solo e telas deste aparelho) ----------
  const ui = {
    say: lines => UI.say(lines),
    choose: (v, spec) => UI.choose({
      title: spec.titulo, text: spec.texto,
      options: spec.opcoes.map(o => ({ label: o.rotulo, desc: o.desc, tag: o.tag, value: o.valor })),
    }),
    ask: (v, spec) => UI.ask({
      title: spec.titulo, text: spec.texto, placeholder: spec.placeholder || '', suggestions: spec.sugestoes || [],
      optional: spec.opcional !== false, multiline: !!spec.multilinha, max: spec.max || 140,
    }),
    prova: (v, spec, onSpend) => UI.prova(v, { ...spec, espigas: v.espigas, onSpend }),
    card: spec => UI.card({
      title: spec.title, text: spec.text, buttons: spec.buttons,
      html: (spec.lista && spec.lista.length ? `<ul class="m-list">${spec.lista.map(i => `<li>${UI.esc(i)}</li>`).join('')}</ul>` : '')
        + (spec.verso ? `<p class="verse-sm">${UI.esc(spec.verso)}</p>` : '')
        + (spec.oracao ? `<p class="prayer">${UI.esc(spec.oracao)}</p>` : ''),
    }),
  };

  // Mesa de uma pessoa só: o próprio jogo é o Mestre.
  function solo(v, av, motor) {
    const key = av.id;
    v.sessoes = v.sessoes || {};
    let st = v.sessoes[key];
    if (!st || st.concluida) {
      st = novoEstado(av, v.aventurasConcluidas > 0 && (!st || st.concluida));
      v.sessoes[key] = st;
    }
    const jid = v.id;
    const mesa = { modo: 'solo', av, st, jogadores: [{ id: jid, v }], eu: jid, anfitriao: true };

    mesa.io = {
      say: lines => ui.say(lines),
      choose: (j, spec) => ui.choose(v, spec),
      vote: spec => ui.choose(v, spec), // sozinho, não há Conselho: a escolha é direta
      ask: (j, spec) => ui.ask(v, spec),
      prova: (j, spec) => ui.prova(v, spec, n => mesa.io.reward(jid, { gastar: n })),
      card: (j, spec) => ui.card(spec),
      reward(j, r) {
        const t = aplicar(v, st, jid, r);
        if (t) UI.toast(t.text, t.kind);
        motor.salvar();
      },
      efeito: nome => motor.efeito(nome),
      novoDia: n => motor.novoDia(n),
      banner: (a, b) => UI.banner(a, b),
    };
    return mesa;
  }

  // Reiniciar: desfaz o que esta partida deu ao Viajante e apaga o progresso dela.
  function desfazer(v, avId) {
    const st = v.sessoes && v.sessoes[avId];
    if (!st) return;
    if (!st.revisita && !st.concluida) {
      const g = st.ganhos[v.id] || { espigas: 0, selos: 0 };
      const colhidas = st.colhidas[v.id] || 0;
      v.espigas = Math.max(0, v.espigas - colhidas);
      v.espigasColhidas = Math.max(0, v.espigasColhidas - colhidas);
      v.selos = Math.max(0, v.selos - g.selos);
      v.registro.splice(Math.max(0, v.registro.length - g.selos));
      const n = (st.lembrados && st.lembrados[v.id]) || 0;
      v.decisoes.splice(Math.max(0, v.decisoes.length - n));
    }
    delete v.sessoes[avId];
  }

  return { novoEstado, aplicar, solo, desfazer, ui };
})();
