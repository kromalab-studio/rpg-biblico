// ============================================================
// AVENTURA 1 — "NO PRINCÍPIO" (Gênesis 1 e 2) — arquivo de dados editável.
// Fonte: materiais/4-Aventura-1-No-Principio.pdf
//
// COMO EDITAR
// Falas são textos no formato "QUEM|texto":
//   'VOZ|Olá!'      → fala de Deus (aparece como "A Voz" até 10 anos e "Deus" a partir de 11)
//   '|E houve luz.' → narração
// Marcadores que o jogo troca sozinho:
//   {nome}  nome do Viajante        {nomes}  nomes de todos os Viajantes da mesa
//   {voz}   "a Voz" ou "Deus"        {Voz}    "A Voz" ou "Deus" (início de frase)
//   {resp.ID}   o que o Viajante respondeu na escolha/pergunta ID
//   {virtude.ID}  nome da Virtude da opção escolhida em ID
//
// AÇÕES (cada item de uma lista de passos):
//   'texto'                               uma fala (ver acima)
//   { cada: [...] }                       cada Viajante faz estes passos, cada um na sua tela
//   { escolha: {...} }                    escolha individual (dentro de "cada")
//   { escolha: {..., grupo: true} }       escolha do grupo: Conselho de 1 minuto e votação
//   { prova: {...} }                      Prova (dado da idade + Virtude), dentro de "cada"
//   { pergunta: {...} }                   pergunta aberta, dentro de "cada"
//   { se: {condição}, entao: [...], senao: [...] }
//   { espigas: N, motivo: '...' }         dá Espigas (ao Viajante, ou a todos fora de "cada")
//   { selo: 'motivo' }                    dá 1 Selo de Virtude
//   { lembrar: 'texto' }                  anota em "Memórias e Decisões" na Ficha
//   { efeito: 'nome' }                    muda o mundo (luz, ceu, terra, plantar, mar...)
//   { esperar: 1500 }                     pausa (milissegundos)
//   { cartao: { titulo, texto, lista } }  um cartão na tela
//   { novoDia: N }                        "E foi a tarde e a manhã..." e começa o dia N
//   { encerrar: true }                    dízimo, oferta, reflexão e fim da aventura
//
// CONDIÇÕES (em "se"):
//   { falhou: 'ID' } / { conseguiu: 'ID' } / { parcial: 'ID' }   resultado da Prova ID
//   { resposta: 'ID', igual: 'valor' }    o que o Viajante escolheu
//   { respondeu: 'ID' }                   respondeu algo (não pulou)
//   { idadeMin: 2 }                       0 = 5–7, 1 = 8–10, 2 = 11–13, 3 = 14+
//   { dado: 'luz' }                       usa o Dado da Luz (5–7 anos)
//   { antecedente: 'escriba' }
//   { grupo: 'ID', igual: 'valor' }       resultado de uma escolha de grupo
// ============================================================
window.AVENTURAS = window.AVENTURAS || {};
window.AVENTURAS['no-principio'] = {
  id: 'no-principio',
  numero: 1,
  titulo: 'No Princípio',
  livro: 'Gênesis',
  versiculo: '“E viu Deus tudo quanto tinha feito, e eis que era muito bom.” — Gênesis 1:31',

  // Pontos do mapa (colunas x linhas). O mapa da Criação é desenhado por js/world.js.
  mapa: {
    inicio: { x: 15, y: 13 },
    pontos: {
      luz: { x: 15, y: 9 },
      aguas: { x: 18, y: 11 },
      terra: { x: 13, y: 10 },
      jardim: { x: 11, y: 13 },
      ceu: { x: 21, y: 10 },
      sombra: { x: 15, y: 7 },
      arvore: { x: 15, y: 6 },
      fruta: { x: 19, y: 15 },
      lago: { x: 22, y: 6 },
    },
  },

  // Luz e clima do mapa, conforme o dia e as flags do mundo.
  //   escuro: escuridão em volta do Viajante · nevoa: névoa · noite: céu noturno
  //   estrelas: estrelas no céu noturno · dourado: luz de fim de tarde
  iluminacao: {
    escuro: { dia: 1, nao: 'luz' },
    nevoa: { nao: 'ceu' },
    noite: { dia: 4, nao: 'amanhecer' },
    estrelas: { sim: 'estrelas' },
    dourado: { diaMin: 7 },
  },

  abertura: [
    '|No princípio, tudo estava em penumbra, escuro e quietinho.',
    '|A terra era sem forma e vazia, e havia águas profundas por toda parte. (Gênesis 1:2)',
    'VOZ|Olá, {nomes}! Que bom que vocês vieram.',
    'VOZ|Eu vou fazer um mundo novinho... e quero que vocês me ajudem.',
    'VOZ|Estão vendo aquela luzinha? Venham até ela.',
    '|Ande com as setas ou WASD — ou toque no mapa. Para falar e interagir, use Espaço ou o botão A.',
  ],
  // Versão da abertura para quem joga sozinho.
  aberturaSolo: [
    '|No princípio, tudo estava em penumbra, escuro e quietinho.',
    '|A terra era sem forma e vazia, e havia águas profundas por toda parte. (Gênesis 1:2)',
    'VOZ|Olá, {nome}! Que bom que você veio.',
    'VOZ|Eu vou fazer um mundo novinho... e quero que você me ajude.',
    'VOZ|Está vendo aquela luzinha? Vá até ela.',
    '|Ande com as setas ou WASD — ou toque no mapa. Para falar e interagir, use Espaço ou o botão A.',
  ],

  // Cada dia: o objetivo mostrado no topo, as falas de início e os pontos de luz.
  // "quando" diz em que situação o ponto aparece (flags do mundo: luz, ceu, terra, plantado...).
  dias: {
    1: {
      objetivo: 'Vá até a luzinha e ajude a chamar a luz.',
      pontos: [{ id: 'luz', onde: 'luz', quando: { nao: 'luz' }, passo: 'passoLuz' }],
    },
    2: {
      objetivo: 'Vá até o brilho e ajude a separar as águas.',
      inicio: ['VOZ|Que lindo ficou com a luz! Agora vamos separar as águas: as de cima vão ser o céu, e as de baixo, o mar.'],
      pontos: [{ id: 'aguas', onde: 'aguas', quando: { nao: 'ceu' }, passo: 'passoAguas' }],
    },
    3: {
      objetivo: 'Vá até o brilho: a terra seca vai aparecer!',
      objetivoDepois: { quando: { sim: 'terra' }, texto: 'Vá até a terra preparada e plante o primeiro jardim.' },
      inicio: ['VOZ|Agora quero que a terra seca apareça no meio das águas. Venham até o brilho!'],
      pontos: [
        { id: 'terra', onde: 'terra', quando: { nao: 'terra' }, passo: 'passoTerra' },
        { id: 'jardim', onde: 'jardim', quando: { sim: 'terra', nao: 'plantado' }, passo: 'passoJardim' },
      ],
    },
    4: {
      objetivo: 'Vá até o brilho e ajude a pendurar as luzes do céu.',
      inicio: [
        '|A noite chega. Lá em cima, o céu parece um grande pano escuro e vazio.',
        'VOZ|Vamos pendurar as luzes do céu? O sol para o dia, a lua e as estrelas para a noite.',
      ],
      pontos: [{ id: 'ceu', onde: 'ceu', quando: { nao: 'estrelas' }, passo: 'passoCeu' }],
    },
    5: {
      objetivo: 'Vá até a praia e solte um animal no mundo.',
      efeitoInicio: 'mar',
      inicio: [
        '|As águas começam a borbulhar, e o céu se enche de asas!',
        'VOZ|Vamos encher o mar e o céu de vida! Vão até a praia e me ajudem a soltar animais no mundo.',
      ],
      pontos: [{ id: 'mar', onde: 'praia', quando: { nao: 'animais' }, passo: 'passoMar' }],
    },
    6: {
      objetivo: 'Dê nome a um animal (chegue perto e fale com ele).',
      objetivoDepois: { quando: { sim: 'nomeado' }, texto: 'Vá até a grande árvore — {voz} quer mostrar algo especial.' },
      efeitoInicio: 'animaisTerra',
      inicio: [
        '|Pela terra, surgem animais de todo jeito: grandes, pequenos, peludos, de casco...',
        'VOZ|Agora, os animais da terra! Vocês me ajudam a dar nome a eles?',
        '|Chegue perto de um animal e fale com ele para dar um nome.',
      ],
      pontos: [{ id: 'pessoas', onde: 'sombra', quando: { sim: 'nomeado', nao: 'pessoas' }, passo: 'passoPessoas' }],
    },
    7: {
      objetivo: 'Descansem à sombra da grande árvore.',
      inicio: ['VOZ|Tudo está pronto. Venham descansar comigo e olhar tudo o que fizemos. Estou esperando na sombra da grande árvore.'],
      pontos: [{ id: 'descanso', onde: 'sombra', quando: { nao: 'descanso' }, passo: 'passoDescanso' }],
    },
  },

  passos: {
    // ---------- Passo 1 — A Luz ----------
    passoLuz: [
      'VOZ|Tudo está escuro e quietinho. Vamos fazer a luz chegar?',
      { cada: [
        { escolha: {
          id: 'luzJeito',
          titulo: 'Passo 1 — A Luz',
          texto: 'O que você faz para ajudar a abrir as cortinas do céu?',
          opcoes: [
            { valor: 'fe', rotulo: 'Estender as mãos e confiar', desc: 'Mesmo sem ver nada, você confia em {voz}.', virtude: 'fe', tags: ['confiar'] },
            { valor: 'coragem', rotulo: 'Puxar as cortinas com força', desc: 'Mesmo com um pouquinho de medo do escuro.', virtude: 'coragem' },
            { valor: 'humildade', rotulo: 'Esperar e ouvir com atenção', desc: 'Você deixa {voz} guiar o seu jeito.', virtude: 'humildade' },
          ],
        } },
        // "Aqui ninguém falha" (Aventura 1, Passo 1).
        { prova: { id: 'luzProva', titulo: 'Abrir as cortinas do céu', texto: 'Você estica os braços bem alto, procurando as cortinas no escuro...', virtudeDe: 'luzJeito', dificuldade: 'simples', semFalha: true } },
        { se: { falhou: 'luzProva' }, entao: ['VOZ|Você tentou com o coração, e isso bastou.'] },
      ] },
      { efeito: 'luz' },
      'VOZ|Haja luz!',
      '|E houve luz! Ela se espalha devagar, morna e dourada, por todo lugar.',
      '|E {voz} viu que a luz era boa. (Gênesis 1:3-4)',
      { cada: [
        { espigas: 1, motivo: 'por participar com fé' },
        { se: { resposta: 'luzJeito', igual: 'fe' }, entao: [{ selo: 'começou confiando' }] },
        { lembrar: 'Dia 1 — ajudou a chamar a luz ({virtude.luzJeito}).' },
      ] },
      { novoDia: 2 },
    ],

    // ---------- Passo 2 — O Céu e as Águas ----------
    passoAguas: [
      { cada: [
        { escolha: {
          id: 'ceuEscolha',
          titulo: 'Passo 2 — O Céu e as Águas',
          texto: 'Como você quer ajudar? As duas escolhas são boas!',
          opcoes: [
            { valor: 'ceu', rotulo: 'Pintar o céu de azul', desc: 'Um pincel enorme, molhado de luz.' },
            { valor: 'mar', rotulo: 'Juntar as águas do mar', desc: 'Com as mãos, você empurra as ondas para baixo.' },
          ],
        } },
        { se: { resposta: 'ceuEscolha', igual: 'ceu' },
          entao: ['|Você mergulha o pincel na luz e pinta o céu de um azul bem bonito.'],
          senao: ['|Você junta as águas, e elas rolam em ondas lá para baixo.'] },
        { lembrar: 'Dia 2 — {resp.ceuEscolha}.' },
        { espigas: 1, motivo: 'pela ajuda no trabalho da Criação' },
      ] },
      { efeito: 'ceu' },
      '|A névoa se abre!',
      '|E {voz} chamou o firmamento de Céu. (Gênesis 1:8)',
      'VOZ|Obrigado pela ajuda! Ficou lindo.',
      { novoDia: 3 },
    ],

    // ---------- Passo 3 — A Terra e as Plantas ----------
    passoTerra: [
      'VOZ|Que as águas se juntem num só lugar, e que apareça a terra seca!',
      { efeito: 'terra' },
      { esperar: 1600 },
      '|A terra seca sobe do meio das águas, marrom e macia, com praias de areia em volta.',
      '|{Voz} chamou a terra seca de Terra, e as águas juntas de Mares. (Gênesis 1:10)',
      'VOZ|Agora vamos plantar o primeiro jardim! Venham até a terra preparada, ali perto.',
    ],
    passoJardim: [
      // O jardim é um só no mapa: escolha do grupo (Conselho + votação).
      { escolha: {
        id: 'jardim',
        grupo: true,
        titulo: 'Passo 3 — O Primeiro Jardim',
        texto: 'O que vamos plantar?',
        opcoes: [
          { valor: 'flores', rotulo: 'Flores coloridas', desc: 'Amarelas, rosas, roxas e brancas.' },
          { valor: 'arvores', rotulo: 'Árvores com frutos', desc: 'Que darão sombra e comida gostosa.' },
        ],
      } },
      { cada: [
        { prova: { id: 'jardimProva', titulo: 'Plantar com cuidado', texto: 'Plantar exige cuidado e paciência. Você cava, coloca cada semente e rega com carinho...', virtude: 'bondade', tags: ['cuidar', 'paciencia'], dificuldade: 'media' } },
        { se: { conseguiu: 'jardimProva' },
          entao: [
            { se: { parcial: 'jardimProva' },
              entao: ['|As sementes brotam aos pouquinhos... e você aprende que plantar também é saber esperar.'],
              senao: ['|As sementes brotam na hora! O verde corre pela terra, como um tapete macio.'] },
            'VOZ|Você cuidou do jardim com muito zelo. Obrigado!',
            { espigas: 2, motivo: 'por cultivar com cuidado' },
            { selo: 'cuidou bem do jardim' },
          ],
          senao: [
            '|Os brotos saem pequeninos, bem devagar...',
            'VOZ|Tudo bem. Plantar pede paciência — e eu cuido junto com você.',
            { espigas: 1, motivo: 'pelo trabalho no jardim' },
          ] },
        { lembrar: 'Dia 3 — ajudou a plantar o primeiro jardim.' },
      ] },
      { efeito: 'plantar' },
      { esperar: 1200 },
      '|Pouco a pouco, o verde se espalha pela terra inteira.',
      '|E a terra deu erva verde e árvores que dão fruto. E {voz} viu que isso era bom. (Gênesis 1:11-12)',
      { novoDia: 4 },
    ],

    // ---------- Passo 4 — O Sol, a Lua e as Estrelas (sem Prova) ----------
    passoCeu: [
      '|Uma a uma, as luzes vão sendo penduradas: a lua prateada... e milhares de estrelas!',
      { efeito: 'estrelas' },
      'VOZ|Olhem para cima. O céu está se enchendo de estrelas.',
      { cada: [
        { escolha: {
          id: 'estrela',
          titulo: 'Passo 4 — As Luzes do Céu',
          texto: 'Qual estrela é a sua favorita?',
          opcoes: [
            { valor: 'azul', rotulo: 'Uma estrela azul e pequenina' },
            { valor: 'dourada', rotulo: 'Uma estrela dourada bem grande' },
            { valor: 'vermelha', rotulo: 'Uma estrela vermelhinha que pisca' },
            { valor: 'cadente', rotulo: 'Uma estrela cadente que risca o céu' },
          ],
        } },
        { pergunta: { id: 'estrelaDesc', titulo: 'A sua estrela', texto: 'Como ela é? Conte um pouquinho (se quiser).', placeholder: 'Ex.: ela brilha mais forte quando eu sorrio' } },
        'VOZ|Que estrela linda! Ela vai brilhar lá no alto todas as noites.',
        // Aprendiz de Escriba: "sabe 1 versículo extra por aventura".
        { se: { antecedente: 'escriba' }, entao: ['|Você se lembra de um versículo que aprendeu: "Os céus declaram a glória de Deus, e o firmamento anuncia a obra das suas mãos." (Salmo 19:1)'] },
        { lembrar: 'Dia 4 — estrela favorita: {resp.estrela}.' },
      ] },
      { efeito: 'amanhecer' },
      '|Depois de um tempo, o sol nasce no horizonte, grande e quentinho.',
      '|{Voz} fez o sol para o dia, a lua para a noite, e também as estrelas. (Gênesis 1:16)',
      { novoDia: 5 },
    ],

    // ---------- Passo 5 — Os Peixes e as Aves ----------
    passoMar: [
      { cada: [
        { escolha: {
          id: 'animal',
          titulo: 'Passo 5 — Os Peixes e as Aves',
          texto: 'Qual animal você quer ajudar a soltar no mundo?',
          opcoes: [
            { valor: 'peixe', rotulo: 'Um peixinho colorido', tag: 'mar' },
            { valor: 'golfinho', rotulo: 'Um golfinho brincalhão', tag: 'mar' },
            { valor: 'baleia', rotulo: 'Uma baleia gigante', tag: 'mar' },
            { valor: 'pomba', rotulo: 'Uma pomba branquinha', tag: 'céu' },
            { valor: 'aguia', rotulo: 'Uma águia veloz', tag: 'céu' },
            { valor: 'beijaflor', rotulo: 'Um beija-flor', tag: 'céu' },
          ],
        } },
        { pergunta: { id: 'animalDesc', titulo: 'O seu animal', texto: 'Descreva o seu animal: como ele é? O que ele gosta de fazer?', placeholder: 'Ex.: ele tem listras azuis e adora dar saltos' } },
        { se: { dado: 'luz' },
          entao: ['|Você abre as mãos e ele vai embora, todo feliz!'],
          senao: [
            { escolha: {
              id: 'soltarJeito',
              titulo: 'Soltar o animal',
              texto: 'Como você o solta?',
              opcoes: [
                { valor: 'bondade', rotulo: 'Com cuidado, nas mãos em concha', tag: 'Bondade', virtude: 'bondade', tags: ['cuidar'] },
                { valor: 'coragem', rotulo: 'Com alegria, bem alto, sem medo', tag: 'Coragem', virtude: 'coragem' },
                { valor: 'sabedoria', rotulo: 'Observando para onde ele quer ir', tag: 'Sabedoria', virtude: 'sabedoria', tags: ['enxergar'] },
              ],
            } },
            { prova: { id: 'soltarProva', titulo: 'Soltar o animal', texto: 'Você segura {resp.animal} e se prepara para soltá-lo...', virtudeDe: 'soltarJeito', dificuldade: 'media' } },
            { se: { conseguiu: 'soltarProva' },
              entao: ['|Ele vai feliz, dando voltas como quem diz "obrigado"!'],
              senao: ['|Ele fica tímido um pouquinho... mas logo vai embora, feliz.'] },
          ] },
        { se: { respondeu: 'animalDesc' }, entao: ['VOZ|Que animal maravilhoso! "{resp.animalDesc}"'], senao: ['VOZ|Que animal maravilhoso!'] },
        { espigas: 1, motivo: 'pela criatividade' },
        { lembrar: 'Dia 5 — soltou {resp.animal} no mundo.' },
      ] },
      { efeito: 'animais' },
      '|E {voz} abençoou os peixes e as aves, dizendo: "Encham as águas dos mares e multipliquem-se sobre a terra." (Gênesis 1:22)',
      { novoDia: 6 },
    ],

    // ---------- Passo 6 — Os Animais e as Pessoas ----------
    // (Dar nome aos animais acontece ao falar com eles: veja "nomear", mais abaixo.)
    passoPessoas: [
      '|Então {voz} fez algo muito especial: criou as pessoas — homem e mulher — parecidas com Ele, à sua imagem. (Gênesis 1:27)',
      { cada: [
        'VOZ|Também fiz você, {nome}. E você é muito especial para mim.',
        // Para Guardiões e Mensageiros, a conversa sobre a "imagem de Deus".
        { se: { idadeMin: 2 }, entao: [
          { pergunta: { id: 'imagemDeus', titulo: 'À imagem de Deus', texto: 'Para pensar e conversar: o que significa ser feito "à imagem de Deus"?', placeholder: 'Escreva o que você pensa (opcional)', multilinha: true } },
          { cartao: { titulo: 'Para aprofundar', texto: 'Todo ser humano — sem exceção — carrega algo do próprio Deus: a capacidade de criar, de amar, de escolher e de cuidar. É a base de toda a dignidade humana. Se todos carregam a imagem de Deus, como isso muda o jeito de tratar até quem não gostamos?' } },
        ] },
      ] },
      { efeito: 'pessoas' },
      { novoDia: 7 },
    ],

    // ---------- Passo 7 — O Descanso ----------
    passoDescanso: [
      { efeito: 'descanso' },
      '|Vocês se sentam na sombra da grande árvore. Uma brisa fresca passa pelas folhas.',
      'VOZ|Vamos descansar e olhar para tudo o que foi feito.',
      { cada: [{ resumo: true }] },
      'VOZ|E era muito bom.',
      '|"E viu Deus tudo quanto tinha feito, e eis que era muito bom." (Gênesis 1:31)',
      { encerrar: true },
    ],
  },

  // Itens do resumo do Passo 7 (aparecem só se a resposta existir).
  resumo: {
    titulo: 'Tudo o que você ajudou a criar',
    itens: [
      { se: 'luzJeito', texto: '☀️ Você ajudou a chamar a luz, com {virtude.luzJeito}.' },
      { se: 'ceuEscolha', texto: '🌊 Você ajudou: {resp.ceuEscolha}.' },
      { seGrupo: 'jardim', texto: '🌱 Vocês plantaram: {grupo.jardim}.' },
      { se: 'estrela', texto: '⭐ A sua estrela favorita: {resp.estrela}.' },
      { se: 'animal', texto: '🐾 Você soltou {resp.animal} no mundo.' },
      { se: 'nomes', texto: '🦁 Você deu nome a: {resp.nomes}.' },
    ],
  },

  // Dia 6: os animais da terra que podem receber nome.
  animaisTerra: [
    { id: 'ovelha', nome: 'ovelha', x: 9, y: 8, sugestoes: ['Ovelha', 'Lã-de-Nuvem', 'Branquinha'] },
    { id: 'leao', nome: 'leão', x: 21, y: 13, sugestoes: ['Leão', 'Juba-Dourada', 'Rugidinho'] },
    { id: 'coelho', nome: 'coelho', x: 17, y: 16, sugestoes: ['Coelho', 'Saltitante', 'Orelhudo'] },
    { id: 'cervo', nome: 'cervo', x: 8, y: 15, sugestoes: ['Cervo', 'Galhudo', 'Pé-Ligeiro'] },
    { id: 'elefante', nome: 'elefante', x: 24, y: 9, sugestoes: ['Elefante', 'Trombinha', 'Gigante Gentil'] },
    { id: 'tartaruga', nome: 'tartaruga', x: 12, y: 5, sugestoes: ['Tartaruga', 'Casco-Verde', 'Devagarinho'] },
  ],
  nomear: {
    titulo: 'Um(a) {animal}!',
    texto: 'Que nome você dá a este animal?',
    placeholder: 'Escreva um nome ou escolha um',
    resposta: 'VOZ|{nomeDado}! Que nome bonito. E assim ele vai se chamar.',
    jaTemNome: '|{nomeDado} olha para você, todo contente com o nome que ganhou.',
    descansando: '|O(a) {animal} descansa tranquilo.',
    // Primeira vez que cada Viajante dá um nome:
    primeiro: [
      { espigas: 1, motivo: 'por nomear com imaginação' },
      '|Tudo o que foi chamado, esse foi o seu nome. (Gênesis 2:19)',
      'VOZ|Pode dar nome a outros animais, se quiser. Quando terminar, venha até a grande árvore: quero mostrar algo muito especial.',
    ],
    // Nome inventado (não veio das sugestões): Selo por criatividade, uma vez por Viajante.
    seloCriativo: 'criatividade ao nomear um animal',
  },

  // Pequena colheita escondida (Guia do Mestre: "colheitas que você semeia na cena").
  colheita: {
    texto: '|Os galhos estão carregados de frutos maduros! Você colhe alguns, com gratidão.',
    espigas: 1,
    motivo: '— uma pequena colheita',
    depois: '|Os galhos já estão se enchendo de novos frutos.',
  },

  // O que aparece ao interagir com cada tipo de chão.
  tiles: {
    A: '|As águas profundas estão quietinhas. Algo bom está para acontecer.',
    '~': '|A água brilha, fresquinha e limpa.',
    O: '|Uma árvore enorme, de sombra fresca. Dá vontade de descansar aqui.',
    Y: '|Árvores carregadas de frutos coloridos.',
    '#': '|Uma árvore cheia de folhas verdinhas.',
    b: '|Um arbusto com gotas de orvalho.',
    r: '|Uma pedra lisa, morna de sol.',
  },

  // Encerramento (Seções V, VI e VII da aventura).
  encerramento: {
    dilema: {
      titulo: 'O Dilema',
      texto: 'Se Deus criou tudo e disse que era muito bom — de onde veio o mal? Por que um mundo que começou perfeito tem dor, escolhas erradas, sofrimento? Não há resposta fácil, e tudo bem deixar a pergunta aberta.',
      depois: 'Ela acompanha a Bíblia inteira — e começa a ser respondida já na próxima aventura, no Jardim.',
    },
    perguntaJornadaIntro: 'A Criação levanta grandes perguntas: de onde viemos? Para quê?',
    reflexaoMenores: ['Qual parte do mundo você mais gostou de ajudar a fazer?', 'A Voz achou tudo muito bom. Você também acha o mundo bom?'],
    reflexaoMaiores: ['Se o mundo foi feito com tanto cuidado, como devemos tratá-lo?', 'E as pessoas, feitas à imagem de Deus — como isso muda o jeito de tratar os outros?'],
    reflexaoIntro: 'Hora de conversar de verdade, fora do jogo, com quem está jogando com você:',
    oracao: 'Obrigado, Senhor, pelo mundo que fizeste, pela nossa família reunida e por esta aventura. Amém.',
    fim: 'A Grande Jornada começou. A próxima parada na Bíblia é o Jardim — e a primeira escolha.',
  },
};
