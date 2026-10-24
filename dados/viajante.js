// ============================================================
// APARÊNCIA DO VIAJANTE — arquivo de dados editável.
//
// MOLDES: cada molde é o desenho do Viajante de frente, pixel a pixel (33 x 34).
// Cada letra é uma "tinta"; as cores de verdade vêm das paletas mais abaixo.
//   .  transparente
//   f  cabelo claro      g  cabelo médio     n  contorno do cabelo   h  cabelo escuro
//   j  pele clara        d  pele sombra      o  contorno da pele
//   m  preto (olhos)     e  íris             w  branco
//   T  túnica            S  túnica sombra    B  faixa (cinto)
//   c  camisa            p  calça            i  contorno escuro (roupa)
// Para editar um pixel, troque a letra na posição certa. A coluna A é o 1º caractere.
// ============================================================
window.DADOS_VIAJANTE = {
  moldes: {
    curto: [
      '...................nnnh..........',
      '..................nfffn..........',
      '.....nnnn.....nnnnfffnn..........',
      '....nffffn.nnnfffffffh...........',
      '....nffffnnfffffffffffnnnnnnn....',
      '....nfffggffffffffffffffffffh....',
      '....nffggfffwfffffffffffffffh....',
      '.....hhhffwwwwwfffffffffffffh....',
      '.......hfffwwwffffffffffffffh....',
      '.......hfffwfwfffhhgffffffffh....',
      '......hffffffffffhddgffffffgh....',
      '......hffffffffffhdjjgghhggh.....',
      '......hfffffhfffmmmjjjmmhgh......',
      '......nfffffhhfmwwwjjjwwmff......',
      '.......nffffhdmmwmwdddmwmmh......',
      '........hfffhdddwewdddewhfh......',
      '........hhhhhdodwwwjjjwwhh.......',
      '.............oodddjjjjjo.........',
      '...............ooodddoo..........',
      '...............iiddjjTi..........',
      '.............iTTTiccccTSi........',
      '.............iTTTiccccTSi........',
      '............iTTTiiiiiiTSi........',
      '............iTTiiiiiiiTTSi.......',
      '............iBBBiBBcccBBBi.......',
      '............iTTTiSSccccSTi.......',
      '............idddiSSTTTSSii.......',
      '.............iiiSSSScccci........',
      '..............pdTTTiiTTdi........',
      '..............ipTTdiiTTii........',
      '..............ipppi.ippi.........',
      '..............ippi..ippi.........',
      '..............ipi...ipi..........',
      '..............iii...iii..........',
    ],
    longo: [
      '...................nnnh..........',
      '..................nfffn..........',
      '.....nnnn.....nnnnfffnn..........',
      '....nffffn.nnnfffffffh...........',
      '...nnffffnnfffffffffffnnnnnnn....',
      '..nfnfffggffffffffffffffffffhfn..',
      '..nfnffggfffwfffffffffffffffhfh..',
      '..nffhhhffwwwwwfffffffffffffhfh..',
      '..nffn.hfffwwwffffffffffffffhfh..',
      '..nfn..hfffwfwfffhhgffffffffhgh..',
      '..nn..hffffffffffhddgffffffghh...',
      '......hffffffffffhdjjgghhgghh....',
      '......hfffffhfffmmmjjjmmhghh.....',
      '.....nnfffffhhfmwwwjjjwwmffh.....',
      '....nffnffffhdmmwmwdddmwmmhn.....',
      '....nfffhfffhdddwewdddewhfhfn....',
      '.....nnhhhhhhdodwwwjjjwwhhhffn...',
      '........hfffgoodddjjjjjogghnnn...',
      '........nfffgggooodddooggfh......',
      '........nffggggiiddjjTiggfn......',
      '......nnfffggiTTTiccccTSiffn.....',
      '......nffffggiTTTiccccTSiffn.....',
      '.......hhffgiTTTiiiiiiTSigffn....',
      '.......hfffgiTTiiiiiiiTTSifffn...',
      '......hffffgiBBBiBBcccBBBifhfn...',
      '......hfffggiTTTiSSccccSTifhfh...',
      '......nfffggidddiSSTTTSSiifhhh...',
      '......nfffgggiiiSSSSccccigffh....',
      '.......nfffhggpdTTTiiTTdifh......',
      '........hhffhgipTTdiiTTiifh......',
      '..........hhhgipppi.ippifh.......',
      '............hhippi..ippih........',
      '..............ipi...ipi..........',
      '..............iii...iii..........',
    ],
  },

  estilos: [
    { id: 'curto', nome: 'Curto' },
    { id: 'longo', nome: 'Longo' },
  ],

  // Cabelo: [claro (f), médio (g), contorno (n), escuro (h)]
  cabelos: [
    { id: 'azul', nome: 'Azul', tons: ['#cfe6ff', '#6aa8f0', '#3a74d8', '#1d3478'] },
    { id: 'rosa', nome: 'Rosa', tons: ['#fdbfe6', '#fd6fb6', '#f53175', '#982053'] },
    { id: 'castanho', nome: 'Castanho', tons: ['#d8a878', '#a8743f', '#7e4c24', '#42240f'] },
    { id: 'preto', nome: 'Preto', tons: ['#6e6890', '#4a4568', '#2e2a48', '#15132a'] },
    { id: 'loiro', nome: 'Loiro', tons: ['#fff0b8', '#f2cc5e', '#d49a26', '#7a5214'] },
    { id: 'ruivo', nome: 'Ruivo', tons: ['#ffc896', '#f08a3a', '#cf571b', '#7a2a0c'] },
    { id: 'branco', nome: 'Branco', tons: ['#ffffff', '#cdd0dc', '#9a9cb2', '#55576c'] },
    { id: 'verde', nome: 'Verde', tons: ['#d2f5c8', '#79c968', '#3f9a3c', '#1e4a1e'] },
  ],

  // Pele: [clara (j), sombra/blush (d), contorno (o)]
  peles: [
    { id: 'p1', nome: 'Clara', tons: ['#fdede3', '#fba07b', '#c0603e'] },
    { id: 'p2', nome: 'Clara rosada', tons: ['#f8dcc4', '#eda07a', '#b8603c'] },
    { id: 'p3', nome: 'Média', tons: ['#e8bc92', '#cf8e5e', '#94502a'] },
    { id: 'p4', nome: 'Morena', tons: ['#c68e62', '#a06842', '#663518'] },
    { id: 'p5', nome: 'Escura', tons: ['#8e5c3e', '#6c4228', '#3c1e0e'] },
  ],

  olhos: [
    { id: 'azul', nome: 'Azul', cor: '#2f5fb8' },
    { id: 'verde', nome: 'Verde', cor: '#2f9e6a' },
    { id: 'castanho', nome: 'Castanho', cor: '#7a4a2a' },
    { id: 'roxo', nome: 'Roxo', cor: '#8a4fd1' },
    { id: 'vermelho', nome: 'Vermelho', cor: '#c0306a' },
    { id: 'preto', nome: 'Preto', cor: '#2a2a3a' },
  ],

  // Túnica: [cor (T), sombra (S)]
  tunicas: [
    { id: 'verde', nome: 'Verde-água', tons: ['#3f8f7f', '#2c6b60'] },
    { id: 'azul', nome: 'Azul', tons: ['#4f7cac', '#365a85'] },
    { id: 'vermelha', nome: 'Vermelha', tons: ['#c8553d', '#963a27'] },
    { id: 'mostarda', nome: 'Mostarda', tons: ['#d9a84a', '#a8782a'] },
    { id: 'roxa', nome: 'Roxa', tons: ['#8a5fa8', '#64407e'] },
    { id: 'areia', nome: 'Areia', tons: ['#d8c29a', '#ac946a'] },
    { id: 'branca', nome: 'Branca', tons: ['#efe9dd', '#c6bca8'] },
  ],
  camisas: [
    { id: 'branca', nome: 'Branca', cor: '#ffffff' },
    { id: 'creme', nome: 'Creme', cor: '#f3e7cf' },
    { id: 'celeste', nome: 'Celeste', cor: '#cfe2f4' },
  ],
  faixas: [
    { id: 'couro', nome: 'Couro', cor: '#8a5a2e' },
    { id: 'vermelha', nome: 'Vermelha', cor: '#b03a3a' },
    { id: 'dourada', nome: 'Dourada', cor: '#d9a84a' },
    { id: 'azul', nome: 'Azul', cor: '#34507a' },
  ],
  calcas: [
    { id: 'marrom', nome: 'Marrom', cor: '#6b4a36' },
    { id: 'bege', nome: 'Bege', cor: '#a8906a' },
    { id: 'cinza', nome: 'Cinza', cor: '#6a6a72' },
    { id: 'azul', nome: 'Azul', cor: '#3a4a6a' },
  ],

  contorno: '#681b19', // contorno escuro da roupa (i)

  padrao: { estilo: 'curto', cabelo: 'azul', pele: 'p1', olhos: 'azul', tunica: 'verde', camisa: 'branca', faixa: 'couro', calca: 'marrom' },
};
