// Aventura 1 — "No Princípio" (Gênesis 1 e 2). Sete passos, um para cada dia da Criação.
// Uma aventura de descoberta e maravilhamento: sem inimigos, sem batalhas, sem perda de Pontos de Luz.
const Adventure = (() => {
  const P = World.P;

  const ANIMAIS_TERRA = [
    { id: 'ovelha', nome: 'ovelha', x: 9, y: 8, sug: ['Ovelha', 'Lã-de-Nuvem', 'Branquinha'] },
    { id: 'leao', nome: 'leão', x: 21, y: 13, sug: ['Leão', 'Juba-Dourada', 'Rugidinho'] },
    { id: 'coelho', nome: 'coelho', x: 17, y: 16, sug: ['Coelho', 'Saltitante', 'Orelhudo'] },
    { id: 'cervo', nome: 'cervo', x: 8, y: 15, sug: ['Cervo', 'Galhudo', 'Pé-Ligeiro'] },
    { id: 'elefante', nome: 'elefante', x: 24, y: 9, sug: ['Elefante', 'Trombinha', 'Gigante Gentil'] },
    { id: 'tartaruga', nome: 'tartaruga', x: 12, y: 5, sug: ['Tartaruga', 'Casco-Verde', 'Devagarinho'] },
  ];

  const CRIATURAS = [
    { id: 'peixe', label: 'Um peixinho colorido', mar: true },
    { id: 'golfinho', label: 'Um golfinho brincalhão', mar: true },
    { id: 'baleia', label: 'Uma baleia gigante', mar: true },
    { id: 'pomba', label: 'Uma pomba branquinha', mar: false },
    { id: 'aguia', label: 'Uma águia veloz', mar: false },
    { id: 'beijaflor', label: 'Um beija-flor', mar: false },
  ];

  const ESTRELAS = [
    'Uma estrela azul e pequenina',
    'Uma estrela dourada bem grande',
    'Uma estrela vermelhinha que pisca',
    'Uma estrela cadente que risca o céu',
  ];

  const free = t => t && !Art.SOLID.has(t) && t !== 'G';

  function nearestFree(tiles, x, y) {
    for (let r = 0; r < 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const row = tiles[y + dy];
          if (row && free(row[x + dx]) && row[x + dx] !== ':') return { x: x + dx, y: y + dy };
        }
      }
    }
    return { x, y };
  }

  function voz(a) { return a.voz; }
  // "A Voz" para 5–10 anos; "Deus" a partir dos 11 (Guia do Mestre, Seção III).
  function V(a, text) { return `${voz(a)}|${text}`; }

  // ---------- Entidades por dia ----------
  function entities(st, tiles) {
    const c = st.c, d = st.dia, out = [];
    const spark = (id, p, talk) => out.push({ id, kind: 'sparkle', x: p.x, y: p.y, onTouch: true, talk });

    if (d === 1 && !c.luz) spark('s-luz', P.luz, passoLuz);
    if (d === 2 && !c.ceu) spark('s-aguas', P.aguas, passoAguas);
    if (d === 3 && !c.terra) spark('s-terra', P.terra, passoTerra);
    if (d === 3 && c.terra && !c.plantado) spark('s-jardim', P.jardim, passoJardim);
    if (d === 4 && !c.estrela) spark('s-ceu', P.ceu, passoCeu);

    if (c.terra) {
      const shore = World.shorePoint(tiles);
      if (d === 5 && !c.animal) spark('s-mar', shore, passoMar);
      if (c.animal) {
        const cr = CRIATURAS.find(x => x.id === c.animal);
        const spot = cr.mar ? { x: shore.x - 2, y: shore.y } : { x: shore.x, y: shore.y - 1 };
        out.push({ id: 'criatura', kind: c.animal, x: spot.x, y: spot.y, solid: false, label: c.animalNome || null });
      }
    }

    if (d >= 6) {
      for (const an of ANIMAIS_TERRA) {
        const p = nearestFree(tiles, an.x, an.y);
        const nome = c.nomes[an.id];
        out.push({
          id: 'a-' + an.id, kind: an.id, x: p.x, y: p.y, wander: true,
          label: nome || null, marker: !nome && d === 6, talk: (a, e) => nomear(a, an),
        });
      }
    }
    if (d === 6 && Object.keys(c.nomes).length && !c.pessoas) spark('s-pessoas', P.sombra, passoPessoas);
    if (d === 7 && !c.descanso) spark('s-descanso', P.sombra, passoDescanso);
    return out;
  }

  function tileTalk(st, t, p) {
    const c = st.c;
    if (t === 'Y' && p.x === P.fruta.x && p.y === P.fruta.y - 1) {
      return async a => {
        if (c.fruta) return a.say(['|Os galhos já estão se enchendo de novos frutos.']);
        c.fruta = true;
        await a.say(['|Os galhos estão carregados de frutos maduros! Você colhe alguns, com gratidão.']);
        a.espigas(1, '— uma pequena colheita');
      };
    }
    const msgs = {
      A: '|As águas profundas estão quietinhas. Algo bom está para acontecer.',
      '~': '|A água brilha, fresquinha e limpa.',
      O: '|Uma árvore enorme, de sombra fresca. Dá vontade de descansar aqui.',
      Y: '|Árvores carregadas de frutos coloridos.',
      '#': '|Uma árvore cheia de folhas verdinhas.',
      b: '|Um arbusto com gotas de orvalho.',
      r: '|Uma pedra lisa, morna de sol.',
    };
    if (msgs[t]) return a => a.say([msgs[t]]);
    return null;
  }

  function lighting(st) {
    const c = st.c;
    return {
      dark: st.dia === 1 && !c.luz ? 1 : 0,
      fog: !c.ceu ? 1 : 0,
      night: st.dia === 4 && !c.estrela ? 1 : 0,
      gold: st.dia >= 7 ? 1 : 0,
    };
  }

  function objective(st, a) {
    const c = st.c;
    switch (st.dia) {
      case 1: return 'Vá até a luzinha e ajude a chamar a luz.';
      case 2: return 'Vá até o brilho e ajude a separar as águas.';
      case 3: return c.terra ? 'Vá até a terra preparada e plante o primeiro jardim.' : 'Vá até o brilho: a terra seca vai aparecer!';
      case 4: return 'Vá até o brilho e ajude a pendurar as luzes do céu.';
      case 5: return 'Vá até a praia e solte um animal no mundo.';
      case 6: return Object.keys(c.nomes).length
        ? `Vá até a grande árvore — ${voz(a)} quer te mostrar algo especial.`
        : 'Dê nome a um animal (chegue perto e fale com ele).';
      default: return st.concluida ? 'Aventura concluída!' : 'Descanse à sombra da grande árvore.';
    }
  }

  // ---------- Abertura ----------
  async function intro(a) {
    await a.banner('A Grande Jornada', 'Aventura 1 — No Princípio');
    await a.say([
      '|No princípio, tudo estava em penumbra, escuro e quietinho.',
      '|A terra era sem forma e vazia, e havia águas profundas por toda parte. (Gênesis 1:2)',
      V(a, `Olá, ${a.v.nome}! Que bom que você veio.`),
      V(a, 'Eu vou fazer um mundo novinho... e quero que você me ajude.'),
      V(a, 'Está vendo aquela luzinha? Vá até ela.'),
      '|Ande com as setas ou WASD — ou toque no mapa. Para falar e interagir, use Espaço ou o botão A.',
    ]);
  }

  async function startDay(a, n) {
    const c = a.c;
    if (n === 2) {
      await a.say([V(a, 'Que lindo ficou com a luz! Agora vamos separar as águas: as de cima vão ser o céu, e as de baixo, o mar.')]);
    } else if (n === 3) {
      await a.say([V(a, 'Agora quero que a terra seca apareça no meio das águas. Venha até o brilho!')]);
    } else if (n === 4) {
      await a.say([
        '|A noite chega. Lá em cima, o céu parece um grande pano escuro e vazio.',
        V(a, 'Vamos pendurar as luzes do céu? O sol para o dia, a lua e as estrelas para a noite.'),
      ]);
    } else if (n === 5) {
      c.mar = true;
      a.refresh();
      await a.say([
        '|As águas começam a borbulhar, e o céu se enche de asas!',
        V(a, 'Vamos encher o mar e o céu de vida! Vá até a praia e me ajude a soltar um animal no mundo.'),
      ]);
    } else if (n === 6) {
      a.refresh();
      await a.say([
        '|Pela terra, surgem animais de todo jeito: grandes, pequenos, peludos, de casco...',
        V(a, 'Agora, os animais da terra! Você me ajuda a dar nome a eles?'),
        '|Chegue perto de um animal e fale com ele para dar um nome.',
      ]);
    } else if (n === 7) {
      a.refresh();
      await a.say([V(a, 'Tudo está pronto. Vem descansar comigo e olhar tudo o que fizemos. Estou te esperando na sombra da grande árvore.')]);
    }
  }

  // ---------- Passo 1 — A Luz ----------
  async function passoLuz(a) {
    const c = a.c;
    await a.say([V(a, 'Tudo está escuro e quietinho. Vamos fazer a luz chegar?')]);
    const escolha = await a.choose({
      title: 'Passo 1 — A Luz',
      text: 'O que você faz para ajudar a abrir as cortinas do céu?',
      options: [
        { label: 'Estender as mãos e confiar', desc: `Mesmo sem ver nada, você confia em ${voz(a)}.`, tag: 'Fé', value: 'fe' },
        { label: 'Puxar as cortinas com força', desc: 'Mesmo com um pouquinho de medo do escuro.', tag: 'Coragem', value: 'coragem' },
        { label: 'Esperar e ouvir com atenção', desc: `Você deixa ${voz(a)} guiar o seu jeito.`, tag: 'Humildade', value: 'humildade' },
      ],
    });
    const r = await a.prova({
      titulo: 'Abrir as cortinas do céu',
      texto: 'Você estica os braços bem alto, procurando as cortinas no escuro...',
      virtude: escolha,
      tags: escolha === 'fe' ? ['confiar'] : [],
      dificuldade: 'simples',
      semFalha: true,
    });
    if (!r.sucesso) await a.say([V(a, 'Você tentou com o coração, e isso bastou.')]);
    c.luz = true;
    c.luzVirtude = escolha;
    await a.say([
      V(a, 'Haja luz!'),
      '|E houve luz! Ela se espalha devagar, morna e dourada, por todo lugar.',
      `|E ${a.idade >= 2 ? 'Deus' : 'a Voz'} viu que a luz era boa. (Gênesis 1:3-4)`,
    ]);
    a.espigas(1, 'por participar com fé');
    if (escolha === 'fe') a.selo('começou confiando');
    a.lembrar(`Dia 1 — ajudou a chamar a luz (${RULES.virtude(escolha).nome}).`);
    await a.novoDia(2);
  }

  // ---------- Passo 2 — O Céu e as Águas ----------
  async function passoAguas(a) {
    const c = a.c;
    const escolha = await a.choose({
      title: 'Passo 2 — O Céu e as Águas',
      text: 'Como você quer ajudar? As duas escolhas são boas!',
      options: [
        { label: 'Pintar o céu de azul', desc: 'Um pincel enorme, molhado de luz.', value: 'ceu' },
        { label: 'Juntar as águas do mar', desc: 'Com as mãos, você empurra as ondas para baixo.', value: 'mar' },
      ],
    });
    c.ceu = true;
    c.ceuEscolha = escolha;
    await a.say([
      escolha === 'ceu'
        ? '|Você mergulha o pincel na luz e pinta o céu de um azul bem bonito. A névoa vai se abrindo!'
        : '|Você junta as águas, e elas rolam em ondas lá para baixo. A névoa vai se abrindo!',
      `|E ${a.idade >= 2 ? 'Deus' : 'a Voz'} chamou o firmamento de Céu. (Gênesis 1:8)`,
      V(a, 'Obrigado pela ajuda! Ficou lindo.'),
    ]);
    a.espigas(1, 'pela ajuda no trabalho da Criação');
    a.lembrar(`Dia 2 — ${escolha === 'ceu' ? 'pintou o céu de azul' : 'juntou as águas do mar'}.`);
    await a.novoDia(3);
  }

  // ---------- Passo 3 — A Terra e as Plantas ----------
  async function passoTerra(a) {
    const c = a.c;
    await a.say([V(a, 'Que as águas se juntem num só lugar, e que apareça a terra seca!')]);
    c.terra = true;
    a.rebuild(P.terra);
    await a.wait(1600);
    await a.say([
      '|A terra seca sobe do meio das águas, marrom e macia, com praias de areia em volta.',
      `|${a.idade >= 2 ? 'Deus' : 'A Voz'} chamou a terra seca de Terra, e as águas juntas de Mares. (Gênesis 1:10)`,
      V(a, 'Agora vamos plantar o primeiro jardim! Venha até a terra preparada, ali perto.'),
    ]);
    a.refresh();
  }

  async function passoJardim(a) {
    const c = a.c;
    const escolha = await a.choose({
      title: 'Passo 3 — O Primeiro Jardim',
      text: 'O que você quer plantar?',
      options: [
        { label: 'Flores coloridas', desc: 'Amarelas, rosas, roxas e brancas.', value: 'flores' },
        { label: 'Árvores com frutos', desc: 'Que darão sombra e comida gostosa.', value: 'arvores' },
      ],
    });
    c.jardim = escolha;
    const r = await a.prova({
      titulo: 'Plantar com cuidado',
      texto: 'Plantar exige cuidado e paciência. Você cava, coloca cada semente e rega com carinho...',
      virtude: 'bondade',
      tags: ['cuidar', 'paciencia'],
      dificuldade: 'media',
    });
    c.plantado = true;
    a.rebuild(P.jardim);
    await a.wait(1200);
    if (r.sucesso) {
      await a.say([
        r.parcial
          ? '|As sementes brotam aos pouquinhos... e você aprende que plantar também é saber esperar.'
          : '|As sementes brotam na hora! O verde corre pela terra inteira, como um tapete macio.',
        V(a, 'Você cuidou do jardim com muito zelo. Obrigado!'),
      ]);
      a.espigas(2, 'por cultivar com cuidado');
      a.selo('cuidou bem do jardim');
    } else {
      await a.say([
        '|Os brotos saem pequeninos, bem devagar...',
        V(a, 'Tudo bem. Plantar pede paciência — e eu cuido junto com você.'),
        '|Pouco a pouco, o verde se espalha pela terra inteira.',
      ]);
      a.espigas(1, 'pelo trabalho no jardim');
    }
    await a.say([`|E a terra deu erva verde e árvores que dão fruto. E ${a.idade >= 2 ? 'Deus' : 'a Voz'} viu que isso era bom. (Gênesis 1:11-12)`]);
    a.lembrar(`Dia 3 — plantou ${escolha === 'flores' ? 'flores coloridas' : 'árvores com frutos'} no primeiro jardim.`);
    await a.novoDia(4);
  }

  // ---------- Passo 4 — O Sol, a Lua e as Estrelas ----------
  async function passoCeu(a) {
    const c = a.c;
    await a.say([
      '|Você estende as mãos, e uma a uma as luzes vão sendo penduradas: a lua prateada... e milhares de estrelas!',
      V(a, 'Olhe para cima. O céu está se enchendo de estrelas.'),
    ]);
    let estrela = await a.choose({
      title: 'Passo 4 — As Luzes do Céu',
      text: 'Qual estrela é a sua favorita?',
      options: [...ESTRELAS.map(e => ({ label: e, value: e })), { label: 'Quero inventar a minha', value: '' }],
    });
    if (!estrela) {
      const r = await a.ask({ title: 'A sua estrela', text: 'Como é a estrela que você inventou?', placeholder: 'Ex.: uma estrela verde com formato de coração', optional: false });
      estrela = r.text;
    } else {
      const r = await a.ask({ title: 'A sua estrela', text: 'Como ela é? Conte um pouquinho (se quiser).', placeholder: 'Ex.: ela brilha mais forte quando eu sorrio' });
      if (r.text) c.estrelaDesc = r.text;
    }
    c.estrela = estrela;
    const lines = [V(a, 'Que estrela linda! Ela vai brilhar lá no alto todas as noites.')];
    if (a.v.antecedente === 'escriba') {
      lines.push('|Você se lembra de um versículo que aprendeu: "Os céus declaram a glória de Deus, e o firmamento anuncia a obra das suas mãos." (Salmo 19:1)');
    }
    lines.push(
      '|Depois de um tempo, o sol nasce no horizonte, grande e quentinho.',
      `|${a.idade >= 2 ? 'Deus' : 'A Voz'} fez o sol para o dia, a lua para a noite, e também as estrelas. (Gênesis 1:16)`,
    );
    await a.say(lines);
    a.lembrar(`Dia 4 — estrela favorita: ${estrela}${c.estrelaDesc ? ` (${c.estrelaDesc})` : ''}.`);
    await a.novoDia(5);
  }

  // ---------- Passo 5 — Os Peixes e as Aves ----------
  async function passoMar(a) {
    const c = a.c;
    const animal = await a.choose({
      title: 'Passo 5 — Os Peixes e as Aves',
      text: 'Qual animal você quer ajudar a soltar no mundo?',
      options: CRIATURAS.map(x => ({ label: x.label, value: x.id, tag: x.mar ? 'mar' : 'céu' })),
    });
    const cr = CRIATURAS.find(x => x.id === animal);
    const desc = await a.ask({
      title: 'O seu animal',
      text: 'Descreva o seu animal: como ele é? O que ele gosta de fazer?',
      placeholder: 'Ex.: ele tem listras azuis e adora dar saltos',
    });

    if (a.camada.dado !== 'luz') {
      const jeito = await a.choose({
        title: 'Soltar o animal',
        text: 'Como você o solta?',
        options: [
          { label: 'Com cuidado, nas mãos em concha', tag: 'Bondade', value: 'bondade' },
          { label: 'Com alegria, bem alto, sem medo', tag: 'Coragem', value: 'coragem' },
          { label: 'Observando para onde ele quer ir', tag: 'Sabedoria', value: 'sabedoria' },
        ],
      });
      const r = await a.prova({
        titulo: 'Soltar o animal',
        texto: `Você segura ${cr.label.toLowerCase()} e se prepara para soltá-lo no ${cr.mar ? 'mar' : 'céu'}...`,
        virtude: jeito,
        tags: jeito === 'bondade' ? ['cuidar'] : jeito === 'sabedoria' ? ['enxergar'] : [],
        dificuldade: 'media',
      });
      await a.say([r.sucesso
        ? `|Ele ${cr.mar ? 'mergulha' : 'voa'} feliz, dando voltas como quem diz "obrigado"!`
        : `|Ele fica tímido um pouquinho... mas logo ${cr.mar ? 'mergulha' : 'abre as asas'} e vai, feliz.`]);
    } else {
      await a.say([`|Você abre as mãos e ele ${cr.mar ? 'mergulha no mar' : 'voa pelo céu'}, todo feliz!`]);
    }
    c.animal = animal;
    if (desc.text) c.animalDesc = desc.text;
    a.refresh();
    await a.say([
      V(a, desc.text ? `Que animal maravilhoso! ${desc.text.length < 80 ? '"' + desc.text + '"' : ''}` : 'Que animal maravilhoso!'),
      `|E ${a.idade >= 2 ? 'Deus' : 'a Voz'} abençoou os peixes e as aves, dizendo: "Encham as águas dos mares e multipliquem-se sobre a terra." (Gênesis 1:22)`,
    ]);
    a.espigas(1, 'pela criatividade');
    a.lembrar(`Dia 5 — soltou ${cr.label.toLowerCase()} no mundo${desc.text ? `: "${desc.text}"` : ''}.`);
    await a.novoDia(6);
  }

  // ---------- Passo 6 — Os Animais e as Pessoas ----------
  async function nomear(a, an) {
    const c = a.c;
    if (c.nomes[an.id]) {
      return a.say([`|${c.nomes[an.id]} olha para você, todo contente com o nome que ganhou.`]);
    }
    if (a.st.dia > 6) {
      return a.say([`|O ${an.nome} descansa tranquilo.`]);
    }
    const r = await a.ask({
      title: `Um ${an.nome}!`,
      text: 'Que nome você dá a este animal?',
      suggestions: an.sug,
      placeholder: 'Escreva um nome ou escolha um',
      max: 24,
    });
    if (!r.text) return;
    const primeiro = Object.keys(c.nomes).length === 0;
    c.nomes[an.id] = r.text;
    a.refresh();
    await a.say([V(a, `${r.text}! Que nome bonito. E assim ele vai se chamar.`)]);
    if (primeiro) {
      a.espigas(1, 'por nomear com imaginação');
      await a.say([
        '|Tudo o que foi chamado, esse foi o seu nome. (Gênesis 2:19)',
        V(a, 'Pode dar nome a outros animais, se quiser. Quando terminar, venha até a grande árvore: quero te mostrar algo muito especial.'),
      ]);
    }
    if (!r.fromSuggestion && !c.seloNome) {
      c.seloNome = true;
      a.selo('criatividade ao nomear um animal');
    }
  }

  async function passoPessoas(a) {
    const c = a.c;
    await a.say([
      `|Então ${a.idade >= 2 ? 'Deus' : 'a Voz'} fez algo muito especial: criou as pessoas — homem e mulher — parecidas com Ele, à sua imagem. (Gênesis 1:27)`,
      V(a, `Também fiz você, ${a.v.nome}. E você é muito especial para mim.`),
    ]);
    if (a.idade >= 2) {
      const r = await a.ask({
        title: 'À imagem de Deus',
        text: 'Para pensar e conversar: o que significa ser feito "à imagem de Deus"?',
        placeholder: 'Escreva o que você pensa (opcional)',
        multiline: true,
      });
      if (r.text) c.imagemDeus = r.text;
      await a.card({
        title: 'Para aprofundar',
        text: 'Todo ser humano — sem exceção — carrega algo do próprio Deus: a capacidade de criar, de amar, de escolher e de cuidar. É a base de toda a dignidade humana. Se todos carregam a imagem de Deus, como isso muda o jeito de tratar até quem não gostamos?',
      });
    }
    c.pessoas = true;
    const nomes = Object.values(c.nomes);
    a.lembrar(`Dia 6 — deu nome a: ${nomes.join(', ')}.`);
    await a.novoDia(7);
  }

  // ---------- Passo 7 — O Descanso ----------
  async function passoDescanso(a) {
    const c = a.c;
    c.descanso = true;
    await a.say([
      '|Você se senta na sombra da grande árvore. Uma brisa fresca passa pelas folhas.',
      V(a, 'Vamos descansar e olhar para tudo o que foi feito.'),
    ]);
    const cr = CRIATURAS.find(x => x.id === c.animal);
    const itens = [
      `☀️ Você ajudou a chamar a luz, com ${RULES.virtude(c.luzVirtude).nome}.`,
      c.ceuEscolha === 'ceu' ? '🎨 Você pintou o céu de azul.' : '🌊 Você juntou as águas do mar.',
      c.jardim === 'flores' ? '🌸 Você plantou flores coloridas no primeiro jardim.' : '🌳 Você plantou árvores com frutos no primeiro jardim.',
      `⭐ A sua estrela favorita: ${c.estrela}.`,
      cr ? `🐾 Você soltou ${cr.label.toLowerCase()} no mundo.` : null,
      Object.keys(c.nomes).length ? `🦁 Você deu nome a: ${Object.values(c.nomes).join(', ')}.` : null,
    ].filter(Boolean);
    await a.card({
      title: 'Tudo o que você ajudou a criar',
      html: `<ul class="m-list">${itens.map(i => `<li>${UI.esc(i)}</li>`).join('')}</ul>`,
    });
    await a.say([
      V(a, 'E era muito bom.'),
      '|"E viu Deus tudo quanto tinha feito, e eis que era muito bom." (Gênesis 1:31)',
    ]);
    await a.finish();
  }

  // ---------- Encerramento: dízimo, oferta, Selos e reflexão ----------
  async function ending(a) {
    const v = a.v, st = a.st, cam = a.camada, idade = a.idade;
    const revisita = !!st.revisita;

    if (!revisita) {
      // O primeiro dízimo (Seção VI da aventura; Seção VIII do Guia do Mestre).
      let separar, texto;
      const colhidas = st.espigas;
      if (cam.id === 'ajudante') {
        separar = 1;
        texto = 'De tudo o que colhemos, uma parte a gente devolve com gratidão. "Esta a gente guarda para ajudar quem precisa."';
      } else if (cam.id === 'aprendiz') {
        separar = colhidas >= 10 ? Math.floor(colhidas / 10) : 1;
        texto = `Você colheu ${colhidas} Espigas nesta aventura. A cada 10 Espigas, 1 vai para o Cesto da Comunidade. ${colhidas < 10 ? 'Você ainda não chegou a 10, mas vamos separar 1 mesmo assim, como a primeira lição do dízimo.' : ''}`;
      } else {
        separar = Math.max(0, Math.floor(v.espigasColhidas / 10) - v.dizimo);
        texto = `Você já colheu ${v.espigasColhidas} Espigas na jornada. O dízimo é 1 a cada 10. ${separar ? `Chegou a hora de separar ${separar}.` : 'Quando chegar a 10, uma irá para o Cesto.'} Por que devolvemos parte do que recebemos? O que significa ser grato com gestos, não só com palavras?`;
      }
      separar = Math.min(separar, v.espigas);
      await a.card({
        title: 'O Primeiro Dízimo',
        text: texto,
        html: '<p class="verse-sm">“Trazei todos os dízimos à casa do tesouro.” — Malaquias 3:10</p>',
        buttons: [{ label: separar ? `Colocar ${separar} 🌾 no Cesto` : 'Entendi', value: true }],
      });
      if (separar) {
        v.espigas -= separar;
        v.dizimo += separar;
        Store.data.cesto += separar;
        UI.toast(`🧺 ${separar} Espiga${separar > 1 ? 's' : ''} no Cesto da Comunidade`, 'espiga');
      }

      // A Oferta — voluntária.
      if (v.espigas > 0) {
        const max = Math.min(3, v.espigas);
        const ops = [{ label: 'Não desta vez', value: 0, ghost: true }];
        for (let i = 1; i <= max; i++) ops.push({ label: `Ofertar ${i} 🌾`, value: i });
        const n = await a.card({
          title: 'Uma oferta do coração?',
          text: `Você tem ${v.espigas} Espiga${v.espigas > 1 ? 's' : ''}. Além do dízimo, você pode dar mais, se quiser. Ofertar não é obrigado — é uma escolha. O Cesto ajuda quem precisa nas histórias.`,
          buttons: ops,
        });
        if (n) {
          v.espigas -= n;
          v.ofertas += n;
          Store.data.cesto += n;
          a.selo('ofertou com alegria');
        }
      }

      a.selo('completou a primeira aventura');
      v.aventurasConcluidas += 1;
    }

    // Pergunta de Jornada (11+).
    if (idade >= 2) {
      if (!v.pergunta) {
        const p = await a.choose({
          title: 'A sua Pergunta de Jornada',
          text: 'A Criação levanta grandes perguntas: de onde viemos? Para quê? Escolha a pergunta que o seu Viajante vai carregar por toda a Bíblia.',
          options: [...RULES.perguntasJornada.map(q => ({ label: q, value: q })), { label: 'Quero escrever a minha', value: '' }],
        });
        if (p) v.pergunta = p;
        else {
          const r = await a.ask({ title: 'A sua Pergunta de Jornada', text: 'Qual é a pergunta do seu coração?', optional: false });
          v.pergunta = r.text;
        }
      } else {
        await a.card({ title: 'A sua Pergunta de Jornada', text: `"${v.pergunta}" — ela não tem resposta rápida. Ela amadurece com você, aventura após aventura.` });
      }
    }

    // O Dilema (14+).
    if (idade >= 3) {
      const r = await a.ask({
        title: 'O Dilema',
        text: 'Se Deus criou tudo e disse que era muito bom — de onde veio o mal? Por que um mundo que começou perfeito tem dor, escolhas erradas, sofrimento? Não há resposta fácil, e tudo bem deixar a pergunta aberta.',
        placeholder: 'Escreva o que você pensa (opcional)',
        multiline: true,
      });
      if (r.text) a.lembrar(`Dilema da Criação — "${r.text}"`);
      await a.card({ title: 'Uma pergunta que segue com você', text: 'Ela acompanha a Bíblia inteira — e começa a ser respondida já na próxima aventura, no Jardim.' });
    }

    // A Reflexão Final e o ritual de encerramento.
    const perguntas = idade >= 2
      ? ['Se o mundo foi feito com tanto cuidado, como devemos tratá-lo?', 'E as pessoas, feitas à imagem de Deus — como isso muda o jeito de tratar os outros?']
      : ['Qual parte do mundo você mais gostou de ajudar a fazer?', 'A Voz achou tudo muito bom. Você também acha o mundo bom?'];
    await a.card({
      title: 'A Reflexão Final',
      text: 'Hora de conversar de verdade, fora do jogo, com quem está jogando com você:',
      html: `<ul class="m-list">${perguntas.map(q => `<li>${UI.esc(q)}</li>`).join('')}</ul>`,
    });
    await a.card({
      title: 'O Ritual de Encerramento',
      html: `<p class="verse-sm">“E viu Deus tudo quanto tinha feito, e eis que era muito bom.” — Gênesis 1:31</p>
             <p class="m-text">Se a família desejar, encerre com uma oração curta:</p>
             <p class="prayer">Obrigado, Senhor, pelo mundo que fizeste, pela nossa família reunida e por esta aventura. Amém.</p>`,
      buttons: [{ label: 'Amém', value: true }],
    });

    const nv = RULES.nivelAtual(v);
    const prox = RULES.proximoNivel(v);
    await a.card({
      title: 'Fim da Primeira Aventura',
      cls: 'fim',
      html: `<p class="m-text">${revisita
        ? 'Que bom passear de novo pela Criação!'
        : `Nesta aventura você colheu <b>${st.espigas} 🌾</b> e ganhou <b>${st.selos} ⭐</b> ${UI.esc(cam.selos)} de Virtude.`}</p>
        <p class="m-text">${UI.esc(v.nome)} é Nível ${nv.n} — <b>${UI.esc(nv.titulo)}</b>.${prox ? ` O Nível ${prox.n} vem depois de mais aventuras.` : ''}</p>
        <p class="m-text">A Grande Jornada começou. A próxima parada na Bíblia é <b>o Jardim</b> — e a primeira escolha. <i>(em breve)</i></p>`,
      buttons: [{ label: 'Voltar à tela inicial', value: true }],
    });
  }

  return { entities, tileTalk, lighting, objective, intro, startDay, ending };
})();
