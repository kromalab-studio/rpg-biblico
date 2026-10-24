// ============================================================
// REGRAS DE "A GRANDE JORNADA" — arquivo de dados editável.
// Fonte: Guia do Jogador e Guia do Mestre (manual provisório v2), em /materiais.
// Pode editar textos e números à vontade; mantenha os "id" iguais.
// ============================================================
window.DADOS_REGRAS = {
  virtudes: [
    { id: 'fe', nome: 'Fé', desc: 'Confiar em Deus mesmo sem ver o fim', quem: 'Abraão, Rute' },
    { id: 'coragem', nome: 'Coragem', desc: 'Fazer o certo mesmo com medo', quem: 'Davi, Ester' },
    { id: 'sabedoria', nome: 'Sabedoria', desc: 'Saber o que fazer e quando fazer', quem: 'Salomão, Daniel' },
    { id: 'bondade', nome: 'Bondade', desc: 'Tratar os outros com amor', quem: 'O Bom Samaritano, José' },
    { id: 'fidelidade', nome: 'Fidelidade', desc: 'Manter a palavra que se deu', quem: 'Jônatas, Paulo' },
    { id: 'humildade', nome: 'Humildade', desc: 'Servir sem buscar aparecer', quem: 'Moisés, João Batista' },
  ],

  // As quatro camadas de idade.
  camadas: [
    {
      id: 'ajudante', nome: 'Pequeno Ajudante', idade: '5–7 anos', dado: 'luz', luz: 3, voz: 'A Voz',
      selo: 'Estrela', selos: 'Estrelas',
      regraVirtudes: 'Escolha UMA Virtude favorita. Sem números — é o "jeito" do seu Viajante.',
    },
    {
      id: 'aprendiz', nome: 'Jovem Aprendiz', idade: '8–10 anos', dado: 6, luz: 4, voz: 'A Voz',
      selo: 'Selo', selos: 'Selos',
      regraVirtudes: 'Escolha DUAS Virtudes. Cada uma soma +1 nas Provas que combinam com ela.',
    },
    {
      id: 'guardiao', nome: 'Guardião', idade: '11–13 anos', dado: 8, luz: 5, voz: 'Deus',
      selo: 'Selo', selos: 'Selos',
      regraVirtudes: 'Distribua +3, +2, +1 e +1 entre quatro Virtudes à sua escolha.',
    },
    {
      id: 'mensageiro', nome: 'Mensageiro', idade: '14+ anos', dado: 20, luz: 6, voz: 'Deus',
      selo: 'Selo', selos: 'Selos',
      regraVirtudes: 'Todas começam em 0. Distribua +8 pontos no total, sem passar de +3 em nenhuma.',
    },
  ],

  antecedentes: [
    { id: 'pastores', nome: 'Filho de Pastores', quem: 'Cresceu cuidando de rebanhos', ganho: '+1 em Provas de cuidar e proteger', tags: ['cuidar', 'proteger'] },
    { id: 'orfao', nome: 'Órfão Acolhido', quem: 'Foi criado pela bondade de outros', ganho: '+1 em Provas de confiar e agradecer', tags: ['confiar', 'agradecer'] },
    { id: 'escriba', nome: 'Aprendiz de Escriba', quem: 'Aprendeu a ler os textos sagrados', ganho: 'Sabe 1 versículo extra por aventura', tags: [] },
    { id: 'estrangeiro', nome: 'Estrangeiro de Terra Distante', quem: 'Veio de longe, vê tudo com olhos novos', ganho: '+1 em Provas de enxergar "de fora"', tags: ['enxergar'] },
    { id: 'cidade', nome: 'Filho da Cidade Grande', quem: 'Cresceu entre mercados e multidões', ganho: '+1 em Provas sociais e de negociação', tags: ['social'] },
    { id: 'deserto', nome: 'Coração do Deserto', quem: 'Cresceu em terras duras', ganho: '+1 em Provas de resistência e paciência', tags: ['resistir', 'paciencia'] },
  ],

  // Trilha de níveis. "aventuras" e "selos" são totais acumulados necessários.
  // O manual lista "+2 aventuras / 4 Selos" para o Nível 2, "+3 / 6" para o 3 etc.;
  // aqui os acréscimos de aventuras são somados e os Selos são lidos como total da tabela.
  niveis: [
    { n: 1, titulo: 'Caminhante', aventuras: 0, selos: 0, recompensa: '—' },
    { n: 2, titulo: 'Companheiro', aventuras: 3, selos: 4, recompensa: '+1 numa Virtude' },
    { n: 3, titulo: 'Servo Fiel', aventuras: 6, selos: 6, recompensa: '1º Dom' },
    { n: 4, titulo: 'Guardião da Luz', aventuras: 10, selos: 8, recompensa: '+1 numa Virtude' },
    { n: 5, titulo: 'Portador da Palavra', aventuras: 15, selos: 10, recompensa: '2º Dom' },
    { n: 6, titulo: 'Peregrino Firme', aventuras: 21, selos: 12, recompensa: '+1 numa Virtude' },
    { n: 7, titulo: 'Coração Valente', aventuras: 28, selos: 14, recompensa: '3º Dom' },
    { n: 8, titulo: 'Luz entre as Nações', aventuras: 36, selos: 16, recompensa: '+1 numa Virtude' },
    { n: 9, titulo: 'Voz do Caminho', aventuras: 45, selos: 18, recompensa: '4º Dom' },
    { n: 10, titulo: 'Mensageiro do Alto', aventuras: 55, selos: 20, recompensa: 'Dom Final' },
  ],

  // Número da Prova por dado. d20 vem direto do Guia do Mestre; d6 e d8 são o ajuste proporcional.
  numeroProva: {
    6: { simples: 2, media: 3, dificil: 4 },
    8: { simples: 3, media: 5, dificil: 7 },
    20: { simples: 8, media: 13, dificil: 18 },
  },
  nomeDificuldade: { simples: 'Pão de Cada Dia', media: 'Prova do Deserto', dificil: 'Hora Decisiva' },

  perguntasJornada: [
    'Qual é o meu chamado?',
    'Como eu lido com aquilo que ainda não entendo de Deus?',
    'Que tipo de pessoa eu quero ser quando crescer?',
  ],


  // Textos gerais do encerramento de toda aventura (Guia do Mestre, Seção VIII).
  textos: {
    dizimoAjudante: 'De tudo o que colhemos, uma parte a gente devolve com gratidão. "Esta a gente guarda para ajudar quem precisa."',
    dizimoAprendiz: 'Você colheu {colhidas} Espigas nesta aventura. A cada 10 Espigas, 1 vai para o Cesto da Comunidade.',
    dizimoAprendizPrimeiro: 'Você ainda não chegou a 10, mas vamos separar 1 mesmo assim, como a primeira lição do dízimo.',
    dizimoPleno: 'Você já colheu {total} Espigas na jornada. O dízimo é 1 a cada 10.',
    dizimoPlenoSeparar: 'Chegou a hora de separar {separar}.',
    dizimoPlenoAinda: 'Quando chegar a 10, uma irá para o Cesto.',
    dizimoReflexao: 'Por que devolvemos parte do que recebemos? O que significa ser grato com gestos, não só com palavras?',
    dizimoVersiculo: '“Trazei todos os dízimos à casa do tesouro.” — Malaquias 3:10',
    oferta: 'Você tem {espigas} Espiga(s). Além do dízimo, você pode dar mais, se quiser. Ofertar não é obrigado — é uma escolha. O Cesto ajuda quem precisa nas histórias.',
    perguntaJornada: 'Escolha a pergunta que o seu Viajante vai carregar por toda a Bíblia.',
    perguntaJornadaJaTem: '"{pergunta}" — ela não tem resposta rápida. Ela amadurece com você, aventura após aventura.',
  },
};
