/**
 * scenes/corridor-config.js
 * -------------------------------------------------
 * Dados "puros" do cenário inicial (o corredor).
 * Nenhuma lógica de renderização aqui — apenas números
 * e textos, para que o layout do corredor possa ser
 * ajustado sem mexer no código que constrói a cena.
 * -------------------------------------------------
 */

window.CorridorConfig = {
  // Dimensões do corredor (unidades arbitrárias do motor)
  length: 22,      // comprimento total (eixo Z)
  width: 6,        // largura (eixo X)
  height: 4.2,     // pé-direito (eixo Y)

  // Altura dos olhos do jogador (câmera) a partir do chão
  eyeHeight: 1.6,

  // Raio de colisão do jogador (cápsula simplificada em círculo)
  playerRadius: 0.35,

  // Distância (em unidades) para uma porta ficar "em destaque"
  interactionRange: 2.4,

  // Ponto de nascimento do jogador: em frente à porta "ENTRADA & SAÍDA"
  // (extremidade end_b, z = -length), de costas para ela, olhando para
  // dentro do corredor.
  spawn: {
    x: 0,
    z: -20,
    // para onde o jogador olha ao nascer (radianos, 0 = olhando para -Z).
    // Math.PI = olhando para +Z, ou seja, para o interior do corredor
    // (a porta ENTRADA & SAÍDA fica atrás do jogador, em z = -length).
    yaw: Math.PI,
  },

  // Ponto onde o jogador reaparece no corredor ao voltar do quarto pela
  // porta interna (ver "porta-interna-quarto" em scripts/main.js e
  // RoomConfig.spawn, o equivalente do lado do quarto) — depois de
  // dormir e abrir a janela do quarto, essa porta passa a fazer o
  // caminho inverso de enterRoom(). Perto da porta "MEU QUARTO" (end_a,
  // z = 0, ver `doors` abaixo), de costas para ela, olhando para dentro
  // do corredor (yaw = 0, mesma convenção do spawn acima). z = -3: fora
  // da caixa de colisão extra da própria porta (minZ/maxZ = ±0.25 em
  // torno de z ≈ 0.02, ver bloco "Portas" em corridor-scene.js), já em
  // cima do tapete central (que começa em z = -endMargin = -1.5, ver
  // `carpet` abaixo), sem nenhum móvel, quadro ou vaso por perto (ver
  // `desks`/`plants` abaixo, todos com |offset| >= 4.6).
  roomDoorReturnSpawn: {
    x: 0,
    z: -3,
    yaw: 0,
  },

  // ---------- Porta compartilhada com "MEU QUARTO" ----------
  // A porta "MEU QUARTO" (side "end_a", ver `doors` abaixo) nao e mais
  // uma porta encostada num plano cheio de parede: ela e a DIVISORIA
  // FISICA entre o corredor e o quarto, agora que os dois ambientes
  // ficam carregados no MESMO mundo 3D ao mesmo tempo (ver
  // scenes/house-config.js). Uma porta so, uma folha so, servindo os
  // dois lados:
  //
  //   CORREDOR -> PORTA -> MEU QUARTO
  //
  // Por isso ela e uma porta "hinged" (ver `options.hinged` em
  // models/door-factory.js): a folha gira de verdade e, aberta, deixa
  // ver e atravessar para o outro comodo. As quatro portas laterais
  // ganharam o MESMO tratamento nesta atualizacao (ver `passages`
  // abaixo); a porta "ENTRADA & SAIDA" continua exatamente como sempre
  // foi (peca parada, so com o destaque visual).
  //
  // `openAtStart`: false = a folha ja nasce FECHADA, batente contra o
  // vao. O quarto continua carregado no mesmo mundo desde o primeiro
  // quadro (ver scenes/house-config.js), so nao da pra ver nem atravessar
  // ate a porta ser aberta pelo jogador - a etapa "interagir-porta-meu-
  // quarto" da historia libera a interacao com ela normalmente (ver
  // objectives/objective-config.js), abrindo com o giro animado de
  // sempre (ver openDoor/toggleDoor em models/door-factory.js e
  // scripts/main.js). Trocar para `true` volta a fazer a folha nascer
  // aberta, encostada de lado dentro do vao, sem giro animado no
  // primeiro quadro.
  sharedDoor: {
    id: "meu-quarto",
    openAtStart: false,
  },

  // ---------- Passagens para os quatro comodos novos ----------
  // QUARTO - 01, QUARTO - 02, COZINHA e BANHEIRO deixaram de ser
  // portas encostadas num plano cheio de parede e passaram a ser, cada
  // uma, a DIVISORIA FISICA entre o corredor e o comodo do outro lado
  // (ver `sideRooms` em scenes/house-config.js). Mesmo tratamento que
  // a porta "MEU QUARTO" ja tinha, e pelo mesmo caminho de codigo (ver
  // o bloco "Portas" em scenes/corridor-scene.js): a parede lateral
  // ganha um VAO recortado de verdade no lugar exato da porta, a folha
  // gira e a colisao acompanha o estado dela.
  //
  // Ou seja: os comodos novos foram construidos EM TORNO das portas que
  // ja existiam aqui. As posicoes em `doors` abaixo nao mudaram nem um
  // centimetro.
  //
  // `openAtStart: false` nas quatro: a folha ja nasce FECHADA, batente
  // contra o vao, sem giro animado no primeiro quadro. A passagem para
  // cada comodo continua pronta desde o inicio (o comodo existe no
  // mesmo mundo, ver scenes/house-config.js), so nao da pra ver nem
  // atravessar ate a porta ser aberta - e a etapa que libera cada porta
  // continua sendo decidida em objectives/objective-config.js,
  // exatamente como antes (nenhuma dessas quatro portas ganhou acao
  // nova no botao "Interagir"). Trocar qualquer uma para `true` volta a
  // fazer a folha nascer aberta, encostada de lado dentro do vao, sem
  // giro animado no primeiro quadro.
  passages: [
    { id: "quarto-01", openAtStart: false },
    { id: "quarto-02", openAtStart: false },
    { id: "cozinha", openAtStart: false },
    { id: "banheiro", openAtStart: false },
  ],

  // As 6 portas do corredor.
  // side: 'end_a' | 'end_b' | 'left' | 'right'
  // offset: posição ao longo do corredor (Z) para portas laterais
  doors: [
    {
      id: "meu-quarto",
      label: "MEU QUARTO",
      side: "end_a", // extremidade 1 (z = 0)
    },
    {
      id: "entrada-saida",
      label: "ENTRADA & SAÍDA",
      side: "end_b", // extremidade 2 (z = -length)
    },
    {
      id: "quarto-01",
      label: "QUARTO - 01",
      side: "left",
      offset: -7,
    },
    {
      id: "quarto-02",
      label: "QUARTO - 02",
      side: "left",
      offset: -15,
    },
    {
      id: "cozinha",
      label: "COZINHA",
      side: "right",
      offset: -7,
    },
    {
      id: "banheiro",
      label: "BANHEIRO",
      side: "right",
      offset: -15,
    },
  ],

  // Quadros decorativos nas paredes laterais (imagens fornecidas pelo
  // usuário). Espalhados em pontos diferentes do corredor, nunca lado
  // a lado, alternando de parede para variar a composição visual.
  pictures: [
    {
      id: "quadro-colher",
      image: "assets/pictures/quadro-colher.jpg",
      side: "left",
      offset: -3.2,
      size: 0.85,
    },
    {
      id: "quadro-xadrez",
      image: "assets/pictures/quadro-xadrez.jpg",
      side: "right",
      offset: -11,
      size: 0.85,
    },
    {
      id: "quadro-figura",
      image: "assets/pictures/quadro-figura.jpg",
      side: "left",
      offset: -18.8,
      size: 0.85,
    },
  ],

  // Relógio de parede decorativo (modelo importado — ver
  // models/clock-factory.js). Mesma convenção 'side'/'offset' dos
  // quadros acima. Fica na parede direita, no trecho vazio entre a
  // porta BANHEIRO (offset -15) e a parede de ENTRADA & SAÍDA
  // (z = -length = -22) — o maior espaço de parede sem nenhum outro
  // elemento em todo o corredor, e também o único trecho do lado
  // direito sem quadro, porta, planta ou interruptor por perto.
  clocks: [
    {
      id: "relogio-parede",
      side: "right",
      offset: -18.5,
    },
  ],

  // Escrivaninha de madeira, com gaveta interativa (vazia) e, sobre o
  // tampo, um vaso de rosas (decorativo) e um telefone antigo
  // (interativo, sem mecânica implementada ainda). `side` aceita as
  // mesmas opções 'left'/'right' usadas nos quadros — a peça fica
  // encostada na parede indicada, em pé no chão.
  desks: [
    {
      id: "escrivaninha-quartos",
      side: "left",
      // Centralizada entre as portas QUARTO - 01 (offset -7) e
      // QUARTO - 02 (offset -15): (-7 + -15) / 2 = -11.
      offset: -11,
    },
  ],

  // Vasos de planta decorativos do corredor (puramente visuais — ver
  // models/potted-plant-factory.js). Mesma convenção 'left'/'right' +
  // offset ao longo do corredor usada pelos quadros e pela escrivaninha,
  // aplicada aqui ao chão em vez da parede. Os dois pontos escolhidos
  // ficam bem afastados um do outro (paredes opostas, extremidades
  // diferentes do corredor) e com folga de qualquer porta, janela,
  // quadro ou móvel já existente, para parecerem parte antiga da
  // decoração sem atrapalhar a passagem nem disputar atenção com os
  // objetos interativos.
  plants: [
    {
      id: "vaso-planta-01",
      side: "right",
      offset: -4.6, // entre a janela de MEU QUARTO (-2.2) e a porta COZINHA (-7)
    },
    {
      id: "vaso-planta-02",
      side: "left",
      offset: -13.4, // entre a escrivaninha (-11) e a porta QUARTO - 02 (-15)
    },
  ],

  // Interruptor de luz do corredor: controla a luminária de teto (a
  // única fonte de luz do ambiente). Fica na parede direita, perto do
  // quadro-xadrez (offset -11, mesma parede), como se tivesse sido
  // instalado ali naturalmente — mesma convenção 'side'/'offset' usada
  // nos quadros, na escrivaninha e nos vasos de planta.
  lightSwitches: [
    {
      id: "interruptor-corredor",
      side: "right",
      offset: -10.2,
    },
  ],

  // Tapete central do corredor (elemento puramente decorativo, sem
  // colisão nem interação). Fica centralizado no chão, acompanhando o
  // comprimento do corredor.
  carpet: {
    // Largura do tapete (eixo X). Menor que `width` do corredor, para
    // sobrar um espaço visível até as paredes dos dois lados.
    width: 4.2,
    // Margem livre (eixo Z) entre cada ponta do tapete e a parede de
    // extremidade correspondente, para não encostar nas portas
    // MEU QUARTO / ENTRADA & SAÍDA.
    endMargin: 1.5,
  },

  // Varanda da porta ENTRADA & SAÍDA (ver models/porch-factory.js).
  // Dados PUROS da planta dela, no mesmo espírito do resto deste
  // arquivo: a fábrica não tem nenhuma posição escrita na mão — ela
  // deriva tudo daqui, da largura/comprimento/pé-direito do corredor, da
  // fachada e da linha do beiral do telhado.
  //
  // É uma peça 100% EXTERNA: fica inteira do lado de fora da parede de
  // ENTRADA & SAÍDA (z = -length), então nada do interior do corredor
  // depende destes números.
  porch: {
    porchLight: { enabled: true, x: 0, y: 0, z: 0 },
    porchSwitch: { enabled: true, x: 1.05, y: 1.15 },
    // Quanto a varanda avança para fora da fachada (eixo Z). É também o
    // tamanho do piso e o alcance dos dois muros laterais.
    depth: 2.6,
    // Altura do muro que cerca a varanda, medida A PARTIR DO PISO dela
    // (não do chão). A pingadeira de cima entra por cima disso.
    wallHeight: 0.88,
    // O muro NÃO para na quina da varanda: ele segue em volta das duas
    // alas da frente da casa (os dois cômodos laterais mais próximos da
    // fachada, hoje QUARTO 02 e BANHEIRO — ver scenes/house-config.js),
    // na mesma altura de topo, fechando o quintal da frente. A fábrica
    // deriva tudo dos retângulos desses cômodos, então mudar o tamanho
    // deles move o muro junto. `false` volta ao muro só da varanda.
    extendToWings: true,
    // Largura do vão no muro da frente, alinhado com a porta: é por ele
    // que se entra. Bem mais largo que a folha da porta (1.3) de
    // propósito — e os dois pilares que emolduram esse vão nascem
    // exatamente nas pontas dele.
    openingWidth: 1.7,
    // ---------- As quatro peças decorativas da varanda ----------
    // Modelos .glb enviados pelo jogador (planta, cadeira de plástico,
    // churrasqueira e varal com roupa), carregados pelo mesmo sistema de
    // importação de todos os outros modelos do jogo — ver
    // models/porch-plant-factory.js e o bloco "Peças decorativas da
    // varanda" em scenes/corridor-scene.js.
    //
    // Como todo o resto deste arquivo, são DADOS: nenhuma coordenada
    // escrita na mão. Cada peça diz apenas em que CANTO da varanda
    // encosta, e a cena deriva a posição do próprio piso, do muro e dos
    // pilares (mexer na profundidade da varanda leva as quatro junto).
    //
    //   corner       "fachada-esquerda" | "fachada-direita" |
    //                "frente-esquerda"  | "frente-direita"
    //                ("fachada" = encostado na parede da casa,
    //                 "frente"  = encostado no muro da rua)
    //   wallOffset   desliza pela parede LATERAL, do canto para o meio
    //   depthOffset  desliza para dentro da varanda, saindo da parede do
    //                canto (é o que enfileira peça atrás de peça)
    //   rotationY    giro em Y (radianos). -Math.PI/2 vira a frente da
    //                peça para o meio da varanda no lado DIREITO.
    //   elevation    quanto a peça sobe do piso (0 = apoiada nele)
    //   solid        false = sem colisão (só o varal, que é pano no ar)
    //
    // O lado escolhido foi o DIREITO, por conta própria (o pedido foi
    // "pode escolher um canto aleatório da varanda"): é o lado sem a
    // `janela-entrada-saida` (que fica em offsetX -2.0, ou seja na metade
    // ESQUERDA da fachada), então nenhuma das quatro peças entra na
    // frente da vista externa daquela janela. O vão do muro, o tapete de
    // boas-vindas e o caminho até a porta continuam livres.
    props: {
      // Canto do FUNDO à direita (encostada na fachada e na linha dos
      // pilares), com os espetos virados para o meio da varanda e o
      // engradado de garrafas escondido no canto, atrás dela.
      grills: [{ corner: "fachada-direita", rotationY: -Math.PI / 2 }],
      // Na mesma parede, logo à frente da churrasqueira, de costas para o
      // muro lateral e virada para dentro da varanda.
      plasticChairs: [
        { corner: "fachada-direita", depthOffset: 0.82, rotationY: -Math.PI / 2 },
      ],
      // A jardineira fecha a fileira, no canto da FRENTE à direita,
      // encostada no muro da rua e virada para a casa.
      porchPlants: [{ corner: "frente-direita", rotationY: 0 }],
      // O varal fica no AR, na lateral direita, pendurado no vão entre os
      // dois pilares daquele lado (1.95 m de folga para 1.13 m de varal).
      // elevation 1.35 põe a roupa entre 1.55 e 1.96 do chão: acima da
      // pingadeira do muro (1.14) e da cadeira (1.13), e muito abaixo do
      // forro da varanda.
      clotheslines: [
        {
          corner: "fachada-direita",
          depthOffset: 0.73,
          rotationY: -Math.PI / 2,
          elevation: 1.35,
          solid: false,
        },
      ],
    },
    // O tapete vermelho de boas-vindas, em frente à porta. A proporção
    // 2:1 (1.20 x 0.60) é obrigatória: é a do canvas da textura, e é ela
    // que mantém o pixel quadrado e a palavra BEM-VINDO sem distorção
    // (ver createWelcomeMatTexture em materials/textures.js).
    mat: {
      width: 1.2,
      depth: 0.6,
      // Folga entre a fachada e a borda de trás do tapete: o bastante
      // para ele ficar na frente da moldura da porta, nunca dentro dela.
      gap: 0.16,
    },
  },

  // ---------- O QUINTAL LATERAL DIREITO ----------
  // As DOZE pecas decorativas que o jogador enviou nesta rodada (quatro
  // pacotes .glb: lixo, jardim, madeira e o medidor de energia),
  // encostadas na parede lateral DIREITA, do lado de FORA da casa - a
  // parede comprida que a COZINHA e o BANHEIRO formam (ver `sideRooms` em
  // scenes/house-config.js). Quem monta e o bloco "Pecas decorativas da
  // parede lateral direita" de scenes/corridor-scene.js; os modelos sao
  // as fabricas de models/ (ver models/dumpster-factory.js).
  //
  // Como todo o resto deste arquivo, sao DADOS: nenhuma coordenada de
  // parede escrita na mao. A cena deriva o X da peca da PROPRIA parede
  // (pegada dos comodos + os 2 cm do revestimento externo), entao mexer na
  // profundidade dos comodos leva as doze junto.
  //
  //   model      qual modelo entra (a tabela YARD_MODELS da cena)
  //   id         id estavel da peca, so para mensagem de aviso no console
  //   offset     posicao ao longo da parede (Z do mundo), a MESMA
  //              convencao das portas, quadros e vasos do corredor
  //   gap        folga entre a face da parede e a peca (padrao 0.05)
  //   rotationY  giro em Y, em radianos (a peca nasce de frente para +Z)
  //   elevation  quanto a peca sobe do chao (0 = apoiada nele)
  //   solid      false = sem colisao (peca rasteira ou pendurada)
  //
  // O lado e a ordem foram escolhidos por conta propria (o pedido foi
  // "posicione em algum lugar na parede lateral direita") e tudo aqui foi
  // feito para ser mexido: o Editor move, gira e escala cada peca
  // separadamente, e o que ele salvar vale por cima destes numeros sem
  // tocar em nenhum arquivo - ver editor/README.md.
  //
  // A fila conta uma historia, da frente da casa para os fundos: medidor
  // de energia na quina da frente, o lixo todo junto perto da rua, e
  // depois a parte de "servico" do quintal (terra, lenha, machado,
  // gravetos) terminando nos dois vasos de enfeite. O trecho entre
  // z = -11.85 e z = -11.35 fica vago de proposito: e a fresta de 30 cm
  // entre as paredes da COZINHA e do BANHEIRO.
  sideYard: {
    // Qual parede lateral ("right" | "left"). Hoje as doze estao na
    // direita, que foi o pedido; a esquerda funciona pelo mesmo caminho.
    wall: "right",
    props: [
      // Pendurado na parede, mostrador na altura dos olhos, cabos
      // correndo para a frente da casa. Math.PI / 2 vira a frente da peca
      // para o quintal.
      {
        id: "medidor-energia",
        model: "power-meter",
        offset: -18.9,
        gap: 0.02,
        rotationY: Math.PI / 2,
        elevation: 1.05,
        solid: false,
      },
      // O canto do lixo, perto da quina da frente (a rua e por ali): o
      // caixote verde de lado, colado na parede, e os tres sacos e a lata
      // enfileirados depois dele, cada um com um giro diferente para nao
      // parecerem o mesmo objeto copiado.
      { id: "lixeira-grande", model: "dumpster", offset: -17.45, gap: 0.1, rotationY: Math.PI / 2 },
      { id: "saco-lixo-a", model: "trash-bag-a", offset: -16.05, gap: 0.16, rotationY: 0.35 },
      { id: "saco-lixo-b", model: "trash-bag-b", offset: -15.05, gap: 0.34, rotationY: -0.7 },
      { id: "saco-lixo-c", model: "trash-bag-c", offset: -14.1, gap: 0.1, rotationY: 1.2 },
      { id: "lata-lixo-quintal", model: "yard-trash-can", offset: -13.15, gap: 0.12, rotationY: Math.PI / 2 },
      // A parte de servico do quintal. O montinho de terra e os gravetos
      // sao rasteiros (12 cm e 22 cm), entao ficam sem colisao: a colisao
      // do jogo e um AABB sem eixo Y e viraria parede invisivel na altura
      // do peito - mesmo motivo do varal da varanda.
      { id: "montinho-terra", model: "dirt-mound", offset: -12.2, gap: 0.42, rotationY: 0.4, solid: false },
      // As toras correm no eixo Z do arquivo, ou seja ja deitadas ao longo
      // desta parede: sem giro.
      { id: "pilha-lenha", model: "woodpile", offset: -10.4, gap: 0.08, rotationY: 0 },
      { id: "machado-toco", model: "axe-stump", offset: -8.9, gap: 0.36, rotationY: 1.35 },
      { id: "gravetos", model: "branches", offset: -7.4, gap: 0.22, rotationY: 0.1, solid: false },
      // Os dois vasos de enfeite fecham a fila, ja perto dos fundos. A
      // galinha tem a cabeca virada para -X no arquivo, entao Math.PI poe
      // ela olhando para o quintal em vez de para a parede.
      { id: "vaso-samambaia", model: "fern-pot", offset: -6.0, gap: 0.1, rotationY: -0.3 },
      { id: "galinha-ferramentas", model: "chicken-toolpot", offset: -5.4, gap: 0.14, rotationY: Math.PI },
    ],
  },

  // ---------- O QUINTAL DOS FUNDOS ----------
  // A faixa de terreno ATRAS da casa: do lado de fora da parede de fundo
  // de MEU QUARTO (z = +RoomConfig.size no mundo), a mesma faixa que
  // ganhou gramado na correcao "Area sem grama atras da casa" (ver
  // README.md). Hoje mora ali uma peca so: o CARRO (ver
  // models/car-factory.js), pedido do jogador com o local circulado num
  // print - "adicione o carro ao jogo, por enquanto como modelo
  // decorativo. E posicione ele atras da casa".
  //
  // Quem monta e o bloco "Pecas decorativas do QUINTAL DOS FUNDOS" de
  // scenes/corridor-scene.js, que le esta lista com a MESMA tabela de
  // modelos do quintal lateral (YARD_MODELS). Peca nova aqui e uma linha
  // nesta lista, e nada mais.
  //
  // Como todo o resto deste arquivo, sao DADOS: nenhuma coordenada de
  // parede escrita na mao. A cena deriva o Z da PROPRIA casa (a parede de
  // fundo do quarto + os 2 cm do revestimento externo), entao mudar o
  // tamanho do quarto leva as pecas junto.
  //
  // A convencao e a MESMA do quintal lateral, so trocando o eixo: ali a
  // parede corre em Z e `offset` e o Z da peca; aqui a parede de fundo
  // corre em X, entao:
  //
  //   model      qual modelo entra (a tabela YARD_MODELS da cena)
  //   id         id estavel da peca, so para mensagem de aviso no console
  //   offset     posicao ao longo da parede de fundo (X do mundo; a casa
  //              vai de x = -3 a x = +3)
  //   gap        folga entre a face da parede e a peca, em Z (padrao 0.05)
  //   rotationY  giro em Y, em radianos (a peca nasce de frente para +Z)
  //   elevation  quanto a peca sobe do chao (0 = apoiada nele)
  //   solid      false = sem colisao (peca rasteira ou pendurada)
  //
  // Tudo aqui foi feito para ser mexido: o Editor move, gira e escala o
  // carro, e o que ele salvar vale por cima destes numeros sem tocar em
  // nenhum arquivo - ver editor/README.md.
  backYard: {
    props: [
      // O carro parado no gramado dos fundos, quase de frente para a casa:
      // o capo aponta para a parede de fundo com 12,6 graus de torto
      // (Math.PI - 0.22), porque carro estacionado em terreno de terra e
      // grama nunca fica reto - e o mesmo motivo dos giros "quebrados" dos
      // sacos de lixo do quintal lateral.
      //
      // Com `offset` 0.9 e `gap` 1.2 ele ocupa x de -0.72 a +2.52 e z de
      // 7.22 a 12.25 no mundo: inteiro dentro da largura da casa (que vai
      // de -3 a +3, entao ele nao invade nenhum dos quintais laterais nem
      // sai da faixa de chao dos fundos) e com 1,2 m de folga entre o
      // para-choque e o revestimento da parede - espaco de passar andando
      // entre o carro e a casa quando o jogador puder sair.
      {
        id: "carro-fundos",
        model: "car",
        offset: 0.9,
        gap: 1.2,
        rotationY: Math.PI - 0.22,
      },
      // ---------- O GALPAO ----------
      // O pequeno galpao/armazem PSX que o jogador enviou (ver
      // models/shed-factory.js), no gramado dos fundos, com a porta virada
      // PARA a casa. O pedido, com o lugar circulado num print do Editor:
      // "adicione esse pequeno galpao ao jogo... Parte de tras da casa
      // (exterior). Nao e pra juntar esse galpao com a casa. O galpao deve
      // ficar um pouco afastado".
      //
      // `gap` 7.3 e o "um pouco afastado": ele poe a ponta do beiral em
      // z = 13.32 e a parede da frente do galpao em z = 13.80, ou seja mais de
      // 7 m de gramado livre entre o revestimento da parede de fundo da casa e
      // o galpao - nada colado, nada encostado -, e ainda 1,07 m de folga entre
      // o para-choque do CARRO (que termina em z = 12.25) e esse beiral. E o
      // primeiro numero a mexer se ele parecer longe ou perto demais; o Editor
      // tambem arrasta a peca no lugar e salva por cima disto.
      //
      // `offset` 0 o deixa centrado na largura da casa: com o telhado de 5,42 m
      // (beiral e testeiras inclusos) ele ocupa x de -2.71 a +2.71, inteiro
      // dentro da faixa de chao que existe atras da casa (x de -3.25 a +3.25) e
      // longe dos dois quintais laterais. Depois desta atualizacao os fundos
      // tambem tem mata e nevoa proprias (ver o bloco Mata e nevoa dos FUNDOS
      // em scenes/corridor-scene.js), e nem por isso nasce arvore no galpao: a
      // pegada dele entra nas travas das duas camadas, entao nenhuma arvore e
      // sorteada dentro dela e nenhuma fatia de bruma atravessa a construcao.
      //
      // `rotationY` Math.PI: a peca nasce com a porta em +Z (para o fundo do
      // terreno), e meia volta poe as duas folhas OLHANDO PARA A CASA, que e
      // de onde o jogador vai ver o galpao. Sem os graus "tortos" do carro de
      // proposito: carro parado em terra fica torto, construcao nao.
      {
        id: "galpao-fundos",
        model: "shed",
        offset: 0,
        gap: 7.3,
        rotationY: Math.PI,
        // ---------- Nada de grama dentro do galpao ----------
        // Bug relatado depois da ultima atualizacao: tem grama dentro do
        // pequeno armazem, atravessando o chao dele. O galpao tem PISO de
        // madeira proprio (ver models/shed-factory.js), diferente do carro e
        // das pecas rasteiras do quintal, e o gramado alto dos fundos nao
        // sabia disso: as moitas eram sorteadas na faixa de terreno inteira,
        // inclusive embaixo da construcao, e as laminas subiam por dentro,
        // furando o piso.
        //
        // Com esta linha, a pegada do galpao entra na lista de travas do
        // gramado dos fundos (ver `backyardGrassKeepOut` em
        // scenes/corridor-scene.js): nenhuma moita chega a ser SORTEADA ali -
        // nada e removido depois nem testado por quadro -, exatamente o mesmo
        // caminho que os quatro comodos novos e a varanda ja usam. Peca nova
        // com piso proprio nos fundos so precisa desta linha.
        keepGrassOut: true,
        // Detalhe de fluxo: a trava sai destes DADOS (offset/gap/rotationY), nao
        // do lugar em que o Editor deixou a peca. Arrastar o galpao no Editor
        // move o galpao, mas a trava fica onde estes numeros dizem - se um dia
        // ele for reposicionado para valer, e aqui que o novo lugar tem que ser
        // gravado (o Editor continua salvando por cima para testar rapido).
        // Quanto encolher a caixa do galpao antes de ela virar essa trava, em
        // metros. A caixa que a cena usa mede o TELHADO (5,42 x 5,75, beiral e
        // testeiras inclusos, ver FINAL_WIDTH/FINAL_DEPTH em
        // models/shed-factory.js), e o beiral passa 45 cm das paredes em X e
        // 40 cm em Z (DIM.EAVE e DIM.GABLE). Descontando 0.45, a trava fica na
        // PAREDE e nao na ponta do telhado: a grama cresce por baixo do beiral
        // como em terreno abandonado de verdade, sem faixa pelada em volta do
        // armazem e sem uma unica lamina do lado de dentro (a folga fina de
        // seguranca quem da e a fabrica, que exige o raio inteiro da moita e o
        // empurrao do vento fora do retangulo).
        grassInset: 0.45,
      },
    ],
  },

  // ---------- O QUINTAL DA FRENTE ----------
  // Os dois pedacos de grama que sobram FECHADOS de cada lado da varanda,
  // entre o muro que contorna as alas e as paredes da casa (ver o bloco
  // "Os dois QUINTAIS da frente" em models/porch-factory.js, que deriva os
  // retangulos deles do muro e das paredes - nao ha nenhuma medida de
  // quintal escrita aqui).
  //
  // Como todo o resto deste arquivo, sao DADOS: mudar um numero muda a
  // fachada sem tocar em codigo, e tirar uma das duas chaves desliga
  // aquela peca por completo.
  frontYard: {
    imageGraffiti: { image: "assets/pictures/pichacao-nossa-senhora.png", side: "left", along: 0.48, centerY: 1.65, width: 2.2, height: 2.2, offset: 0.018 },
    // Os canteiros de flores (ver models/flower-bed-factory.js): rosas,
    // flores de campo e botoes, nas oito cores da paleta da fabrica,
    // espalhados pelos dois quintais.
    flowers: {
      // Semente do sorteio: o canteiro fica identico a cada vez que a cena
      // e remontada (o jogador entra e sai do quarto).
      seed: "canteiro-varanda",
      // Lado da celula da grade, em metros: quanto MENOR, mais cheio o
      // canteiro. 0.34 da um canteiro denso (~110 flores por quintal) sem
      // flor nascendo dentro de flor.
      spacing: 0.34,
      // Folga descontada das quatro bordas do quintal: e ela que mantem
      // flor nenhuma atravessando o muro, a laje da varanda ou a parede da
      // ala.
      margin: 0.38,
      // Fracao de celulas sorteadas VAZIAS: canteiro de verdade tem falha.
      gaps: 0.14,
    },
    // A pichacao da fachada (ver models/graffiti-factory.js): na parede da
    // frente da ala escolhida, virada para o quintal.
    graffiti: {
      // Qual das duas alas da frente leva a tinta ("left" | "right").
      side: "right",
      // A frase. A fabrica quebra sozinha na ultima palavra, entao isto sai
      // como "NO MAN'S" em cima e "LAND" embaixo.
      text: "No man's land",
      seed: "pichacao-ala-direita",
      // Tamanho da mancha de tinta na parede, em metros (2:1, a proporcao
      // do canvas da textura - com outra, o pixel sairia esticado).
      width: 2.6,
      height: 1.3,
      // Onde ela cai ao longo daquela parede: 0 = na quina do corredor,
      // 1 = na quina de fora da ala.
      along: 0.5,
      // Altura do CENTRO da mancha. 1.62 poe a tinta entre 0.97 e 2.27 -
      // altura de braco de gente, e toda acima do muro (que termina em
      // 0.94), entao ela aparece inteira de fora.
      centerY: 1.62,
      // Quanto o plano da tinta fica a frente do revestimento externo
      // daquela parede (que ja esta 2 cm a frente do plano dela).
      offset: 0.015,
    },
  },

  // Janelas com cortina interativa. `side` aceita as mesmas 4 opções das
  // portas: para 'end_a'/'end_b' (parede de extremidade), `offsetX`
  // desloca a janela ao longo dessa parede; para 'left'/'right' (parede
  // lateral), `offset` posiciona a janela ao longo do corredor (Z), como
  // nas portas laterais.
  windows: [
    {
      id: "janela-meu-quarto",
      side: "right", // parede lateral, ao lado da porta MEU QUARTO
      offset: -2.2,
    },
    {
      id: "janela-entrada-saida",
      side: "end_b", // mesma extremidade da porta ENTRADA & SAÍDA
      offsetX: -2.0,
    },
  ],
};
