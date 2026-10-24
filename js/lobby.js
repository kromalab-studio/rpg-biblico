// Ponto de partida das partidas: jogar sozinho (o jogo é o Mestre) ou numa sala online.
const Lobby = (() => {
  const aventura = () => window.AVENTURAS['no-principio'];

  async function jogarSolo(v) {
    const av = aventura();
    const st = v.sessoes && v.sessoes[av.id];
    if ((!st || st.concluida) && v.aventurasConcluidas > 0) {
      const ok = await UI.card({
        title: `Rever "${av.titulo}"?`,
        text: 'A aventura já foi concluída. Você pode passear por ela de novo — as Espigas e os Selos desta vez não contam, para manter a ficha justa.',
        buttons: [{ label: 'Voltar', value: false, ghost: true }, { label: 'Passear de novo', value: true }],
      });
      if (!ok) return;
    }
    const mesa = Mesa.solo(v, av, Game);
    mesa.reiniciar = () => {
      Mesa.desfazer(v, av.id);
      Store.save();
      jogarSolo(v);
    };
    Game.iniciar(mesa);
  }

  return { handlers: { play: jogarSolo }, aventura };
})();
