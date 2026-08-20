/**
 * scenes/room-config.js
 * -------------------------------------------------
 * Dados "puros" do novo cenário "MEU QUARTO" — mesmo espírito de
 * scenes/corridor-config.js: só números, sem nenhuma lógica de
 * renderização aqui (quem monta a cena a partir destes dados é
 * scenes/room-scene.js).
 *
 * O ambiente estrutural (chão, teto, quatro paredes e a porta de
 * entrada reaproveitada do corredor) veio primeiro; a mobília entra
 * aos poucos a partir daqui — primeira peça: a cama (`beds` abaixo).
 * Mesmo espírito de corridor-config.js (doors/pictures/desks/etc.):
 * mais arrays como este vão aparecer aqui à medida que o quarto for
 * ganhando conteúdo.
 * -------------------------------------------------
 */

window.RoomConfig = {
  // Quadrado, do mesmo tamanho da largura do corredor (6) — espaçoso
  // o bastante para a mobília futura, sem exagerar.
  size: 6,

  // Mesmo pé-direito do corredor (config.height em
  // scenes/corridor-config.js): mantém a proporção das texturas de
  // chão/teto/parede reaproveitadas (ver materials/material-library.js)
  // idêntica à do corredor, e a porta reaproveitada (mesma altura)
  // encaixa sem precisar de nenhum ajuste de escala.
  height: 4.2,

  // Ponto onde o jogador aparece assim que a transição termina, ao
  // atravessar a porta "MEU QUARTO" (ver cutscenes/room-transition.js
  // e scripts/main.js): perto da porta de entrada (parede z = 0, ver
  // scenes/room-scene.js), de costas para ela, olhando para dentro do
  // quarto. Mesma convenção de yaw do corredor: 0 = olhando para -Z —
  // aqui, o eixo -Z é justamente para onde o quarto se estende a
  // partir da porta.
  spawn: {
    x: 0,
    z: -1.1,
    yaw: 0,
  },

  // Cama (ver models/bed-factory.js) — primeira peça de mobília do
  // quarto. `side` indica em qual parede a cabeceira fica encostada
  // ('esquerda' | 'direita' | 'fundo', mesmos nomes usados nos
  // comentários de scenes/room-scene.js para as quatro paredes);
  // `offset` é a posição do centro da cama ao longo dessa parede —
  // para 'esquerda'/'direita' isso é o eixo Z do quarto (mesma
  // convenção side/offset já usada pelos móveis do corredor, ver
  // corridor-config.js), para 'fundo' é o eixo X, já que é essa a
  // parede que corre nesse sentido. Encostada na parede de fundo
  // (oposta à entrada), deslocada para o lado direito do quarto, com
  // folga até a parede direita — posição indicada pelo usuário (print
  // de referência do cenário).
  beds: [
    {
      id: "cama-quarto",
      side: "fundo",
      offset: 2,
    },
  ],

  // Criado-mudo (ver models/nightstand-factory.js — e a nota no topo
  // daquele arquivo sobre o modelo enviado como "cabeceira" ser, na
  // verdade, um criado-mudo). `bedId` amarra o móvel à cama que ele
  // acompanha: scenes/room-scene.js posiciona o criado-mudo relativo à
  // posição já calculada dessa cama (mesma parede de fundo, do lado
  // aberto do quarto — o lado direito da cama tem só uns 20cm de vão
  // até a parede direita, estreito demais para um móvel; o lado
  // esquerdo tem o quarto inteiro livre), então não precisa duplicar
  // nenhum número aqui — só a referência.
  nightstands: [
    {
      id: "criado-mudo-quarto",
      bedId: "cama-quarto",
    },
  ],

  // Estante de livros (ver models/bookshelf-factory.js) — peça
  // puramente decorativa, sem nenhuma interação. `nightstandId` amarra
  // a estante ao criado-mudo que ela fica ao lado (do lado da parede
  // lateral, oposto à cama): scenes/room-scene.js centraliza a
  // estante no trecho livre da parede de fundo entre a parede
  // esquerda e esse criado-mudo, com folga de ambos os lados (posição
  // indicada pelo usuário — print de referência do cenário), então
  // não precisa duplicar nenhum número aqui, só a referência.
  bookshelves: [
    {
      id: "estante-quarto",
      nightstandId: "criado-mudo-quarto",
    },
  ],

  // Guarda-roupas (ver models/wardrobe-factory.js) — peça nova desta
  // atualização, na parede LATERAL ESQUERDA (diferente de
  // cama/criado-mudo/estante, todos na parede de fundo — ver acima).
  // Print de referência do usuário: mostra uma mira central (o ponto
  // de "Interagir" do HUD) sobre uma parede em lambri claramente vazia
  // ocupando a maior parte da tela, com só um móvel escuro (a
  // silhueta da estante, mesma madeira escura de
  // materials/material-library.js) e o brilho do abajur aparecendo
  // colados na borda direita do quadro — ou seja, o jogador está
  // olhando quase de frente para um trecho vazio de parede, com o
  // canto onde ficam estante/criado-mudo (parede de fundo) só
  // "vazando" pela lateral do enquadramento. Isso só bate com o
  // jogador olhando para a parede ESQUERDA do quarto (x = -half): de
  // frente para ela, o canto com a parede de fundo (onde já moram
  // estante/criado-mudo/abajur) fica à direita da câmera (mesma
  // relação geométrica de RoomScene.build: "direita da câmera" quando
  // se olha para -X é o sentido -Z, exatamente onde fica a parede de
  // fundo) — batendo com o que aparece no print. Por isso o
  // guarda-roupas vai na parede esquerda, longe o bastante do canto da
  // estante para não encostar nela (ver margem em scenes/room-scene.js).
  // `offset` é a posição do centro do guarda-roupas ao longo da parede
  // esquerda (eixo Z do quarto, mesma convenção side/offset usada
  // pelos móveis do corredor — ver corridor-config.js): meio do
  // caminho entre a porta de entrada (z = 0) e a parede de fundo
  // (z = -size), ponto central do trecho de parede vazio mostrado no
  // print, com folga de sobra tanto do canto da porta quanto do canto
  // da estante.
  wardrobes: [
    {
      id: "guarda-roupa-quarto",
      side: "esquerda",
      offset: -3,
    },
  ],

  // Lata de lixo (ver models/trash-can-factory.js) — peça puramente
  // decorativa, no chão ao lado do guarda-roupas (posição indicada
  // pelo usuário — print de referência do cenário: mostra o objeto
  // encostado na mesma parede esquerda do guarda-roupas, no trecho
  // livre entre ele e a parede de entrada). `wardrobeId` amarra a lata
  // ao guarda-roupas que ela fica ao lado: scenes/room-scene.js usa a
  // posição já calculada dele (mesmo princípio de `bedId` em
  // RoomConfig.nightstands), então não precisa duplicar nenhum número
  // aqui, só a referência.
  trashCans: [
    {
      id: "lata-lixo-quarto",
      wardrobeId: "guarda-roupa-quarto",
    },
  ],

  // Caixa de papelão (ver models/cardboard-box-factory.js) — peça
  // puramente decorativa, apoiada em cima do guarda-roupas (pedido do
  // usuário nesta atualização). `wardrobeId` amarra a caixa ao
  // guarda-roupas em cujo topo ela fica: scenes/room-scene.js usa a
  // posição e a altura já calculadas dele (mesmo princípio de
  // `wardrobeId` em RoomConfig.trashCans acima), então não precisa
  // duplicar nenhum número aqui, só a referência.
  cardboardBoxes: [
    {
      id: "caixa-papelao-quarto",
      wardrobeId: "guarda-roupa-quarto",
    },
  ],

  // Vaso de planta (ver models/floor-plant-factory.js) — peça
  // puramente decorativa, no chão ao lado da lata de lixo (posição
  // indicada pelo usuário — print de referência do cenário: mostra o
  // ponto onde a lata de lixo já está, e o vaso deve ficar encostado
  // na mesma parede esquerda, logo depois dela, do lado aberto em
  // direção à parede de entrada — mesmo lado livre já usado para
  // posicionar a própria lata de lixo em relação ao guarda-roupa, ver
  // `trashCans` acima). `trashCanId` amarra o vaso à lata que ele fica
  // ao lado: scenes/room-scene.js usa a posição já calculada dela
  // (mesmo princípio de `wardrobeId` em RoomConfig.trashCans), então
  // não precisa duplicar nenhum número aqui, só a referência.
  floorPlants: [
    {
      id: "vaso-planta-quarto",
      trashCanId: "lata-lixo-quarto",
    },
  ],

  // Cadeira com roupas (ver models/chair-factory.js) — peça puramente
  // decorativa, sem nenhuma interação: uma cadeira de madeira com roupas
  // jogadas em cima, largada num canto do quarto (pedido do usuário:
  // escolher um canto qualquer, para depois ajustar no modo EDITOR se a
  // posição não agradar).
  //
  // Diferente da mobília de parede (cama/criado-mudo/estante/
  // guarda-roupa/mesinha de TV, todas com side + offset), esta peça é de
  // CANTO: `corner` diz em qual dos quatro cantos do quarto ela fica, e
  // scenes/room-scene.js resolve sozinho a posição encostada nas duas
  // paredes desse canto e o ângulo em que a cadeira olha para o meio do
  // quarto (a diagonal do canto). Trocar de canto é trocar essa string:
  //   'entrada-esquerda' | 'entrada-direita' | 'fundo-esquerda' | 'fundo-direita'
  // ('entrada' = parede da porta; 'fundo' = parede oposta a ela — mesmos
  //  nomes de parede já usados nos comentários de scenes/room-scene.js).
  //
  // Canto escolhido: 'entrada-esquerda', o encontro da parede da porta
  // com a parede ESQUERDA — o único canto do quarto que estava
  // completamente livre (o da frente à direita tem a mesinha de TV, ver
  // `tableTVs`; o do fundo à direita tem a cama, ver `beds`; o do fundo
  // à esquerda tem a estante, ver `bookshelves`). Fica longe do vão da
  // porta (x = 0) e também do trecho da parede esquerda já ocupado por
  // guarda-roupa/lata de lixo/vaso de planta, que param em z ≈ -1,5.
  //
  // `rotationY` e `gap` são opcionais e existem só como escape: sem eles,
  // o ângulo sai da diagonal do canto e a folga das paredes é de 5 cm.
  chairs: [
    {
      id: "cadeira-roupas-quarto",
      corner: "entrada-esquerda",
    },
  ],

  // Bola de futebol (ver models/soccer-ball-factory.js para a malha e
  // scripts/ball-controller.js para a física) — diferente de toda a
  // mobília acima, é um objeto DINÂMICO: nasce ao lado do vaso de
  // planta (pedido do usuário), mas não fica presa lá — reage
  // fisicamente ao ser tocada pelo jogador e ao bater em paredes/
  // móveis, perdendo velocidade aos poucos até parar sozinha em
  // outro lugar do quarto (ver bloco correspondente em
  // scenes/room-scene.js, chamado a cada quadro). `floorPlantId`
  // amarra só a posição INICIAL da bola ao vaso que ela nasce ao lado,
  // mesmo princípio de `trashCanId` em RoomConfig.floorPlants acima —
  // depois do primeiro quadro, a posição já não depende mais dele.
  soccerBalls: [
    {
      id: "bola-futebol-quarto",
      floorPlantId: "vaso-planta-quarto",
    },
  ],

  // Mesinha de TV (ver models/tabletv-factory.js) — peça puramente
  // decorativa. Corrigido: o print original do usuário mostrava o
  // canto vazio (parede lateral se afastando em perspectiva de um
  // lado, porta de entrada do outro), mas um segundo print — já
  // dentro do jogo, com a mesinha na posição errada — deixou claro que
  // era o canto onde a parede DIREITA encontra a parede DE ENTRADA
  // (z = 0), não a esquerda (a primeira tentativa colocou a mesinha
  // espelhada, do lado oposto ao pedido). Fica perto da porta, mas sem
  // encostar nela (a porta está na parede adjacente, não na mesma
  // parede da mesinha — sem risco de sobreposição). Esse canto está
  // completamente livre — nada mais foi posicionado na parede direita
  // até agora. Mesma convenção side/offset dos outros móveis de parede
  // (offset = posição do centro ao longo da parede direita, eixo Z do
  // quarto): perto da parede de entrada (z = 0), com folga para não
  // ficar encostada bem no vértice do canto.
  //
  // `bedId` é novo nesta atualização (ver models/tv-factory.js): amarra
  // a TV apoiada em cima da mesinha à cama que ela deve encarar —
  // scenes/room-scene.js usa a posição já calculada dessa cama (mesmo
  // princípio de `bedId` em RoomConfig.nightstands acima) para apontar
  // o visor da TV diretamente para ela, sem precisar duplicar nenhum
  // número aqui.
  tableTVs: [
    {
      id: "mesinha-tv-quarto",
      side: "direita",
      offset: -0.9,
      bedId: "cama-quarto",
    },
  ],

  // Ventilador de teto (ver models/ceiling-fan-factory.js) — peça
  // puramente decorativa, sempre centralizada no teto do quarto (não
  // faz sentido nenhuma outra posição para ela), por isso só o `id`,
  // sem side/offset como os móveis de parede acima.
  ceilingFans: [
    {
      id: "ventilador-quarto",
    },
  ],

  // Tapete circular (ver models/carpet-factory.js, createRoundCarpet)
  // — elemento puramente decorativo, sem colisão, no meio do quarto.
  // Pedido do jogador: mesma textura do tapete do corredor (ver
  // materials.roomCarpet em material-library.js — mesmo mapa de
  // textura do runner, nenhuma textura nova, só um polygonOffset
  // próprio), só que circular em vez da faixa retangular do corredor.
  // Sempre centralizado no chão (X = 0,
  // Z = -half — mesmo centro usado pelo ventilador de teto acima),
  // por isso só precisa do raio, sem side/offset como os móveis de
  // parede.
  carpet: {
    radius: 1.3,
  },

  // Janela (mesmo modelo/sistema de interação das duas janelas do
  // corredor — ver models/window-factory.js e RoomScene.build):
  // moldura de madeira, cortina interativa e chuva/relâmpago do lado
  // de fora. Posição indicada pelo usuário (print de referência do
  // cenário): trecho vazio da parede DIREITA, entre a mesinha de TV
  // (perto da parede de entrada, RoomConfig.tableTVs) e a cama
  // encostada na parede de fundo (RoomConfig.beds — que fica bem
  // perto da parede direita, só ~20cm de vão até ela). `offset` é a
  // posição do centro da janela ao longo dessa parede (eixo Z do
  // quarto, mesma convenção side/offset dos outros móveis de parede
  // acima): a meio caminho entre a borda da mesinha de TV e a borda
  // da cama, com folga de sobra dos dois lados.
  windows: [
    {
      id: "janela-quarto",
      side: "direita",
      offset: -2.6,
    },
  ],

  // Poster (ver models/poster-factory.js) — imagem enviada pelo
  // próprio jogador, presa na parede por um prego + cordinha (sem
  // moldura de madeira, diferente dos quadros do corredor — ver
  // models/picture-factory.js). Posição indicada pelo usuário (print
  // de referência do cenário): parede de FUNDO, no trecho livre acima
  // do criado-mudo/abajur (RoomConfig.nightstands), entre ele e a
  // cabeceira da cama (RoomConfig.beds). `offset` segue a mesma
  // convenção da cama/criado-mudo/estante nessa parede (eixo X do
  // quarto). `width`/`height` em metros, na mesma proporção da
  // imagem original (retrato, não quadrada).
  posters: [
    {
      id: "poster-brasil-penta",
      image: "assets/pictures/poster-brasil-penta.jpg",
      side: "fundo",
      offset: 1.0,
      width: 0.9,
      height: 1.2,
    },
  ],

  // Troféu (ver models/trophy-factory.js) — peça puramente decorativa,
  // apoiada em cima da estante de livros (pedido do usuário nesta
  // atualização). `bookshelfId` amarra o troféu à estante em cujo topo
  // ele fica: scenes/room-scene.js usa a posição e a altura já
  // calculadas dela (mesmo princípio de `wardrobeId` em
  // RoomConfig.cardboardBoxes acima), então não precisa duplicar
  // nenhum número aqui, só a referência.
  trophies: [
    {
      id: "trofeu-quarto",
      bookshelfId: "estante-quarto",
    },
  ],

  // ---------- PECAS DECORATIVAS SOLTAS (modelos .glb do jogador) ----------
  // As DOZE pecas desta rodada, de seis pacotes .glb enviados pelo
  // jogador: mesa de xadrez, cadeira de balanco, canteiro de plantas,
  // vaso oval, mesa de canto, mesa de taverna + as CINCO garrafas dela e
  // o sofa. Todas puramente decorativas, sem nenhuma interacao (pedido
  // explicito: "Sao apenas itens decorativos, sem interacoes, (Por
  // enquanto)").
  //
  // Diferente da mobilia acima (cama/estante/guarda-roupa/mesinha de TV,
  // cada uma com um array e um bloco proprio, porque cada uma se amarra
  // numa parede ou noutro movel), estas entram por uma lista GENERICA -
  // exatamente o mesmo desenho que as pecas do quintal ja usam em
  // `sideYard.props`/`backYard.props` (scenes/corridor-config.js): uma
  // TABELA que liga o nome do modelo a fabrica dele (ROOM_PROP_MODELS, no
  // bloco "Pecas decorativas soltas" de scenes/room-scene.js) e UM bloco
  // que le esta lista. Peca nova aqui e uma linha nesta lista + uma linha
  // naquela tabela, e nada mais.
  //
  //   model      qual modelo entra (a tabela ROOM_PROP_MODELS da cena)
  //   id         id estavel da peca, so para mensagem de aviso no console
  //   x, z       posicao do CENTRO DA BASE, em coordenadas DO QUARTO
  //              (x de -3 a +3; z = 0 e a parede da porta e z = -6 e a
  //              parede de fundo - a mesma convencao dos blocos acima)
  //   rotationY  giro em Y, em radianos (a peca nasce de frente para +Z)
  //   elevation  quanto a peca sobe do chao (0 = apoiada nele)
  //   solid      false = sem colisao (peca apoiada em cima de outra)
  //
  // AS POSICOES FORAM ESCOLHIDAS POR CONTA PROPRIA - o pedido foi
  // "posicione em algum lugar dentro do QUARTO PS1, caso eu nao goste da
  // posicao, eu posso alterar com o editor depois". O criterio foi so
  // nao sobrepor nada do que ja estava no quarto, nao tampar o vao da
  // porta (x de -0.63 a +0.63 em z = -0.22) e deixar o ponto onde o
  // jogador nasce (RoomConfig.spawn, x = 0 / z = -1.1) livre. O Editor
  // move, gira e escala cada peca separadamente e o que ele salvar vale
  // por cima destes numeros, sem tocar em nenhum arquivo - ver
  // editor/README.md.
  //
  // Onde cada uma ficou:
  //   - a mesa de taverna com as 5 garrafas e o canteiro/vaso ocupam o
  //     canto do FUNDO A ESQUERDA, o trecho que estava vazio entre a
  //     estante e o guarda-roupa;
  //   - a mesa de xadrez fica na frente da estante, ainda no fundo;
  //   - a cadeira de balanco e a mesa de canto ficam na parte da FRENTE
  //     a esquerda, viradas para o meio do quarto;
  //   - o sofa encosta na parede DIREITA, debaixo da janela, no vao que
  //     sobrava entre a mesinha de TV e a cama.
  props: [
    // Mesa de taverna: no meio do trecho livre do fundo a esquerda, com o
    // lado comprido acompanhando a parede de fundo.
    { id: "mesa-taverna", model: "tavern-table", x: -2.0, z: -4.35, rotationY: 0 },
    // As CINCO garrafas EM CIMA da mesa (elevation = 0.76, a altura do
    // tampo dela): cada uma no mesmo ponto do tampo em que estava no
    // modelo original, so que agora como peca separada. `solid: false`
    // porque a area delas ja esta coberta pela colisao da propria mesa -
    // mesmo raciocinio do trofeu em cima da estante e da caixa de papelao
    // em cima do guarda-roupa.
    { id: "garrafa-taverna-01", model: "tavern-bottle_01", x: -2.4175, z: -4.2217, rotationY: 0, elevation: 0.76, solid: false },
    { id: "garrafa-taverna-02", model: "tavern-bottle_02", x: -2.2001, z: -4.3927, rotationY: 0, elevation: 0.76, solid: false },
    { id: "garrafa-taverna-03", model: "tavern-bottle_03", x: -1.902, z: -4.226, rotationY: 0, elevation: 0.76, solid: false },
    { id: "garrafa-taverna-04", model: "tavern-bottle_04", x: -1.8504, z: -4.5398, rotationY: 0, elevation: 0.76, solid: false },
    { id: "garrafa-taverna-05", model: "tavern-bottle_05", x: -1.5941, z: -4.3758, rotationY: 0, elevation: 0.76, solid: false },
    // Canteiro comprido de pe no canto do fundo a esquerda, girado 90 graus
    // para acompanhar a parede esquerda.
    { id: "canteiro-plantas", model: "plant-bed", x: -2.72, z: -5.45, rotationY: Math.PI / 2 },
    // O vaso oval do mesmo pacote, ao lado do canteiro, encostado na
    // parede de fundo.
    { id: "vaso-oval", model: "round-pot", x: -2.28, z: -5.8, rotationY: Math.PI / 2 },
    // Mesa de xadrez na frente da estante, no trecho de chao livre entre
    // ela e o criado-mudo.
    { id: "mesa-xadrez", model: "chess-table", x: -0.75, z: -5.2, rotationY: 0 },
    // Cadeira de balanco na parte da frente a esquerda, virada para o meio
    // do quarto (o encosto do modelo fica em -Z, entao 2.47 rad poe a
    // frente dela apontando para o centro).
    { id: "cadeira-balanco", model: "rocking-chair", x: -1.6, z: -1.0, rotationY: 2.47 },
    // Mesa de canto ao lado da cadeira de balanco, do lado de dentro do
    // quarto - ainda com folga de sobra do vao da porta e do ponto onde o
    // jogador nasce.
    { id: "mesa-canto", model: "side-table", x: -0.7, z: -1.6, rotationY: 0 },
    // Sofa encostado na parede DIREITA, debaixo da janela (janela em
    // z = -2.6), no vao que sobrava entre a mesinha de TV (z = -0.18 para a
    // frente) e a cama (z = -3.66 para o fundo). -Math.PI/2 vira a frente
    // dele (que no arquivo olha para +Z) para dentro do quarto.
    { id: "sofa", model: "sofa", x: 2.597, z: -2.64, rotationY: -Math.PI / 2 },
  ],
};
