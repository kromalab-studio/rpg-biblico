# A Grande Jornada — RPG Bíblico (versão web)

Versão para navegador de **A Grande Jornada**, o RPG de mesa para a família percorrer a Bíblia, uma história de cada vez. Este jogo segue o *Guia do Jogador*, o *Guia do Mestre*, as *Fichas de Personagem* e a *Aventura 1 — No Princípio* (manual provisório v2).

O jogo é feito em HTML, CSS e JavaScript puros. Não precisa de instalação nem de build, e toda a arte em pixel é desenhada por código.

## Como jogar

- Abra `index.html` no navegador. Para servir localmente, rode `python3 -m http.server` e acesse `http://localhost:8000`.
- **Andar:** setas, WASD ou tocar no mapa.
- **Falar / interagir:** Espaço, Enter, Z ou o botão **A**.
- **Menu:** Esc, X ou o botão ☰.

O progresso é salvo automaticamente no navegador (`localStorage`). Dá para ter vários Viajantes, um por pessoa da família, e todos compartilham o mesmo **Cesto da Comunidade**.

## O que já existe

**Criação do Viajante**, seguindo as quatro idades do manual:

| Idade | Viajante | Dado | Virtudes | Pontos de Luz |
|---|---|---|---|---|
| 5–7 | Pequeno Ajudante | Dado da Luz (☀️ 🌱 ☁️) | 1 favorita | 3 |
| 8–10 | Jovem Aprendiz | d6 | 2 (+1 cada) | 4 |
| 11–13 | Guardião | d8 | +3, +2, +1, +1 | 5 |
| 14+ | Mensageiro | d20 | 8 pontos (máx. +3) | 6 |

A criação também tem nome, aparência, Antecedente, os Quatro Cantos do Coração e a Pergunta de Jornada, cada um liberado na idade indicada pelo manual.

**Aventura 1 — No Princípio** (Gênesis 1 e 2). São sete passos, um por dia da Criação, e o mapa muda a cada dia:

1. **A Luz:** o mundo começa no escuro. Prova sem falha ("você tentou com o coração, e isso bastou").
2. **O Céu e as Águas:** escolha entre pintar o céu ou juntar o mar.
3. **A Terra e as Plantas:** a terra seca sobe e você planta o primeiro jardim (Prova de Bondade).
4. **O Sol, a Lua e as Estrelas:** escolha e descreva a sua estrela favorita.
5. **Os Peixes e as Aves:** solte e descreva um animal.
6. **Os Animais e as Pessoas:** dê nome aos animais e ouça: "Também fiz você."
7. **O Descanso:** "E era muito bom". Depois vêm o primeiro dízimo, a oferta voluntária, a Reflexão Final e o ritual de encerramento.

**Regras implementadas:**
- **Provas:** o dado da idade mais a Virtude e o Antecedente, contra o Número da Prova.
- **Espigas:** dá para gastar 2 para tentar uma Prova de novo.
- **Dízimo:** escalonado por idade, com o Cesto da Comunidade.
- **Selos de Virtude:** aparecem como "Estrelas" para os pequenos.
- **Trilha de níveis**, **Ficha do Viajante** e **"A Voz" ou "Deus"** conforme a idade.
- **Para 11+ e 14+:** conversa sobre a imagem de Deus e o Dilema.

**Acessibilidade:** a narração em voz alta (pt-BR, via Web Speech API) pode ser ligada na tela inicial ou na pausa. Ela ajuda quem ainda não lê.

As falas de Deus ("A Voz") usam uma voz masculina em português, se o aparelho tiver uma. Se não tiver, usam a voz padrão com tom mais grave e mais lento. As vozes disponíveis variam de aparelho para aparelho, e o botão **▶ Testar vozes** na tela inicial mostra quais foram escolhidas. Os tons ficam na constante `TOM`, em `js/ui.js`.

## Publicando uma versão nova

O site no GitHub Pages se atualiza sozinho a cada push no branch publicado. Para o navegador não mostrar a versão antiga guardada em cache, os arquivos em `index.html` têm um número de versão (`?v=6`). A cada publicação, aumente esse número em todos eles: troque `?v=6` por `?v=7` com "localizar e substituir".

## Estrutura

```
index.html            telas, palco do jogo e modais
css/style.css         visual
dados/                ← CONTEÚDO EDITÁVEL (não precisa mexer no código)
  regras.js           Virtudes, idades, Antecedentes, níveis, Números da Prova, textos do dízimo
  animais.js          animais desenhados pixel a pixel (32 × 32) com as cores de cada um
  viajante.js         aparência do Viajante: moldes pixel a pixel (curto e longo) e paletas de cores
  aventura1.js        Aventura 1 — No Princípio: falas, escolhas, Provas, dias, animais, encerramento
js/                   código
  regras.js           funções das regras (bônus, nível atual...)
  roteiro.js          interpretador: lê a aventura de dados/ e conduz 1 ou vários Viajantes
  mesa.js             a mesa (quem joga) e as recompensas; modo solo
  lobby.js            como uma partida começa
  game.js             motor: mapa, movimento, câmera, entrada, luz
  world.js            o mapa da Criação, que muda a cada dia
  sprites.js          arte em pixel 32x32 (tiles, Viajante, animais)
  ui.js               diálogo, escolhas, perguntas, Prova com dado, narração
  screens.js          salvamento, tela inicial, criação do Viajante, Ficha
materiais/            os PDFs originais do jogo (fonte da verdade) e versões em texto
```

### Editando o Viajante

`dados/viajante.js` tem o desenho do Viajante como texto, uma letra por pixel (33 × 34), e as paletas de cores. Para trocar as cores disponíveis, edite as listas `cabelos`, `peles`, `olhos`, `tunicas`, `camisas`, `faixas` e `calcas`. Para mudar o desenho, troque as letras do molde. O começo do arquivo explica o que cada letra significa.

### Editando a aventura

Abra `dados/aventura1.js`. O começo do arquivo explica o formato. Em resumo:

- As falas são textos no formato `'VOZ|Olá!'` (Deus) ou `'|E houve luz.'` (narração).
- `{ cada: [...] }` faz cada Viajante viver os passos na própria tela.
- `{ escolha: {...} }`, `{ prova: {...} }` e `{ pergunta: {...} }` são as interações.
- `{ espigas: 1, motivo: '...' }` e `{ selo: '...' }` são as recompensas.

Depois de editar, recarregue a página. Se a página ficar em branco, provavelmente faltou uma vírgula ou aspas: abra o console do navegador (F12) para ver a linha com o erro.

## Decisões a confirmar

- **Números da Prova para d6 e d8.** O manual dá os valores do d20 (8 / 13 / 18). Para os outros dados usei um ajuste proporcional: d6 = 2 / 3 / 4 e d8 = 3 / 5 / 7.
- **Trilha de níveis.** A tabela do Guia diz "+2 aventuras / 4 Selos" para o Nível 2, mas as fichas dizem que "5 Selos destravam o próximo nível". Implementei a tabela do Guia, somando os acréscimos de aventuras. Os valores estão em `js/data.js` e são fáceis de ajustar.
- **Um Viajante por vez.** O jogo tem um Viajante por partida. Numa mesa com várias pessoas, cada uma cria o seu Viajante e joga a sua vez.
