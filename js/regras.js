// Funções das regras. Os dados (Virtudes, idades, níveis...) ficam em dados/regras.js.
const RULES = (() => {
  const { virtudes, camadas, antecedentes, niveis, numeroProva, nomeDificuldade, perguntasJornada, textos } = window.DADOS_REGRAS;

  function camada(v) {
    return camadas.find(c => c.id === v.camada) || camadas[0];
  }

  function virtude(id) {
    return virtudes.find(x => x.id === id);
  }

  // Bônus de uma Virtude numa Prova, conforme a camada do Viajante.
  function bonusVirtude(v, id) {
    if (v.camada === 'ajudante') return 0;
    return (v.virtudes && v.virtudes[id]) || 0;
  }

  function bonusAntecedente(v, tags) {
    const a = antecedentes.find(x => x.id === v.antecedente);
    if (!a || !tags) return 0;
    return a.tags.some(t => tags.includes(t)) ? 1 : 0;
  }

  function nivelAtual(v) {
    let atual = niveis[0];
    for (const nv of niveis) {
      if (v.aventurasConcluidas >= nv.aventuras && v.selos >= nv.selos) atual = nv;
      else break;
    }
    return atual;
  }

  function proximoNivel(v) {
    const atual = nivelAtual(v);
    return niveis.find(n => n.n === atual.n + 1) || null;
  }

  return {
    virtudes, camadas, antecedentes, niveis, numeroProva, nomeDificuldade, perguntasJornada, textos,
    camada, virtude, bonusVirtude, bonusAntecedente, nivelAtual, proximoNivel,
  };
})();
