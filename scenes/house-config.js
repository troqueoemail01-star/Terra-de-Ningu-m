/**
 * scenes/house-config.js
 * -------------------------------------------------
 * Dados "puros" da PLANTA DA CASA: onde cada ambiente (zona) fica
 * dentro do MESMO mundo 3D. Nenhuma logica aqui, mesmo espirito de
 * scenes/corridor-config.js e scenes/room-config.js. Quem interpreta
 * estes numeros e scripts/house-world.js; quem monta o mundo com eles
 * e scripts/main.js.
 *
 * ---------- Por que este arquivo existe ----------
 * Ate esta atualizacao, "CORREDOR" e "MEU QUARTO" se REVEZAVAM na
 * cena: entrar no quarto tirava o corredor de `scene` e colocava o
 * quarto no lugar (a antiga enterRoom() em scripts/main.js). Os dois
 * viviam na origem, um em cima do outro, e so um existia por vez: por
 * isso, estando no corredor, o quarto nao existia visualmente.
 *
 * Agora existe UMA casa so. Os dois ambientes continuam sendo
 * construidos pelos MESMOS arquivos de sempre (corridor-scene.js e
 * room-scene.js, cada um com seus objetos, colisoes, interacoes e
 * logica proprios), mas ficam os DOIS dentro da cena ao mesmo tempo,
 * cada um no seu lugar do mundo:
 *
 *     MUNDO DA CASA (worldRoot, ver scripts/main.js)
 *       |
 *       +-- ZONA_CORREDOR    (z de -22 a 0)
 *       +-- ZONA_MEU_QUARTO  (z de 0 a +6)
 *       +-- EXTERIOR         (dentro de cada zona, do lado de fora das
 *             paredes: chao, grama, arvores, nevoa e ceu)
 *
 * A separacao logica continua existindo (duas cenas, duas listas de
 * interativos, duas de colisao, dois `update`), mas o renderizador ve
 * um mundo unico: do corredor da para olhar pela porta e ver o quarto
 * de verdade, e do quarto da para ver o corredor pela mesma porta.
 *
 * ---------- Como a planta foi montada ----------
 * A porta "MEU QUARTO" fica na parede de extremidade `end_a` do
 * corredor (z = 0, ver corridor-config.js), entao o quarto ocupa
 * exatamente o outro lado dessa parede:
 *
 *        x = -3                    x = +3
 *   z=+6   +--------------------------+  parede de fundo do quarto
 *          |        MEU QUARTO        |
 *   z= 0   +=========[ PORTA ]========+  parede COMPARTILHADA
 *          |                          |
 *          |         CORREDOR         |
 *   z=-22  +--------------------------+  ENTRADA & SAIDA
 *
 * O quarto e quadrado (RoomConfig.size = 6) e tem a mesma largura do
 * corredor (CorridorConfig.width = 6), entao as paredes laterais dos
 * dois seguem em linha reta, na mesma altura e escala: a casa le como
 * uma construcao unica, sem degrau, buraco ou parede sobreposta.
 *
 * `rotationY: Math.PI` no quarto: ele foi desenhado com a parede de
 * entrada em z = 0 e o interior crescendo para -Z (ver room-config.js).
 * Girar o grupo em 180 graus faz esse interior crescer para +Z no
 * mundo, do lado de fora da porta do corredor, sem reescrever um unico
 * numero da mobilia. E 180 graus em Y e uma ROTACAO (nao um espelho):
 * quem entra pela porta ve a mesma cama, no mesmo lugar de sempre.
 *
 * ---------- Espaco para os proximos comodos ----------
 * O conjunto ocupa apenas a faixa x de -3 a +3. As 4 portas laterais
 * do corredor (QUARTO - 01, QUARTO - 02, COZINHA, BANHEIRO) e as
 * laterais do quarto continuam com terreno livre dos dois lados (a
 * floresta guarda 6 metros de gramado aberto ao longo de toda a
 * fachada, ver models/tree-forest-factory.js):
 *
 *   FUTUROS COMODOS <- | MEU QUARTO | -> FUTUROS COMODOS
 *   FUTUROS COMODOS <- |  CORREDOR  | -> FUTUROS COMODOS
 *
 * Para um comodo novo no futuro: uma cena nova (nos moldes de
 * room-scene.js), uma entrada em `zones` dizendo onde ela fica e uma
 * em `connections` dizendo por qual porta ela se liga. Nada em
 * scripts/main.js precisa saber o nome dela.
 * -------------------------------------------------
 */

window.HouseConfig = {
  // Onde cada zona fica no mundo. `x`/`z` deslocam o grupo 3D da zona;
  // `rotationY` gira em Y (radianos). Sempre multiplos de 90 graus: e
  // o que mantem as caixas de colisao (AABB em X/Z, ver
  // scripts/collision.js) exatas ao serem convertidas para o mundo
  // (ver scripts/house-world.js).
  zones: {
    corredor: {
      key: "corredor",
      label: "Corredor",
      // Zona de referencia: na origem, sem giro. As coordenadas do
      // corredor SAO as do mundo (nada muda em relacao a antes).
      placement: { x: 0, z: 0, rotationY: 0 },
    },

    quarto: {
      key: "quarto",
      label: "Meu Quarto",
      // Do outro lado da parede `end_a` do corredor, ocupando z de 0 a
      // +6. Sem deslocamento: o giro de 180 graus por si so joga o
      // interior para o lado certo, e a parede de entrada do quarto cai
      // sobre a parede de extremidade do corredor (as duas viram a
      // MESMA divisoria).
      placement: { x: 0, z: 0, rotationY: Math.PI },
    },
  },

  // Ligacoes fisicas entre zonas. Hoje existe uma: a porta
  // "MEU QUARTO" do corredor, que e a UNICA passagem entre os dois
  // ambientes (uma porta so, uma folha so, servindo de divisoria para
  // os dois lados: nada de porta do corredor + porta do quarto
  // duplicadas, como era antes).
  //
  //   CORREDOR -> PORTA -> MEU QUARTO
  //
  // `doorId` e o id dessa porta em CorridorConfig.doors. A espessura da
  // divisoria vem da propria moldura da porta (DoorFactory.FRAME_DEPTH),
  // entao o vao fica forrado por ela dos dois lados, sem fresta.
  // ---------- Os quatro comodos novos ----------
  // QUARTO 01, QUARTO 02, COZINHA e BANHEIRO: a expansao desta
  // atualizacao. Dados PUROS da planta, no mesmo espirito de `zones`
  // acima - quem monta cada um e scenes/side-room-scene.js (um arquivo
  // so para os quatro: eles sao a mesma caixa arquitetonica, mudando
  // apenas o lado, a posicao e a porta).
  //
  // Diferente do MEU QUARTO, o `placement` destes NAO esta escrito
  // aqui: ele e DERIVADO do corredor e da porta a que o comodo se liga
  // (ver `resolve` em scenes/side-room-scene.js). Motivo: a posicao
  // depende da espessura da divisoria, que e a propria moldura da
  // porta (DoorFactory.FRAME_DEPTH) - dado de MODELO, nao de planta.
  // Derivar e o que garante que porta, vao recortado na parede,
  // parede do comodo e colisao nunca discordem entre si.
  //
  //   key     : id da zona (usado por scripts/house-world.js e pelo
  //             Editor).
  //   doorId  : a porta do corredor que virou a passagem deste comodo
  //             (ver `doors` e `passages` em corridor-config.js). E ela
  //             que decide onde o vao e recortado - por isso os comodos
  //             sao construidos EM TORNO das portas que ja existiam, e
  //             nao ao redor do corredor ignorando-as.
  //   side    : em qual parede do corredor ele fica ('left' | 'right'),
  //             a mesma convencao das portas laterais.
  //   center  : centro do comodo ao longo do corredor (Z do mundo).
  //   length  : quanto ele corre ao longo do corredor.
  //   depth   : quanto ele avanca para FORA, a partir do plano da
  //             parede do corredor.
  //   stoves  : fogao opcional do comodo (hoje so a COZINHA tem, ver o
  //             comentario dentro da entrada dela).
  //   gasCylinders : botijao de gas opcional, mesma ideia do `stoves`
  //             (tambem so na COZINHA hoje).
  //   fridges : geladeira opcional, mesma ideia das duas de cima
  //             (tambem so na COZINHA hoje).
  //   fruitTables : mesa com frutas opcional, mesma ideia das tres de
  //             cima (tambem so na COZINHA hoje).
  //   sinkCabinets : pia com armario opcional, mesma ideia das quatro de
  //             cima (tambem so na COZINHA hoje). As CINCO listas sao
  //             lidas pelo MESMO bloco de mobilia de
  //             scenes/side-room-scene.js: comodo que nao declarar
  //             nenhuma das cinco continua vazio, sem caso especial
  //             nenhum.
  //
  //   shelves : prateleira opcional, mesma ideia das cinco de cima
  //             (tambem so na COZINHA hoje).
  //   microwaves : microondas opcional, mesma ideia das seis de cima
  //             (tambem so na COZINHA hoje). As SETE listas passam pelo
  //             MESMO bloco de mobilia de scenes/side-room-scene.js.
  //   clayFilters : filtro de barro opcional, mesma ideia das sete de
  //             cima (tambem so na COZINHA hoje). As OITO listas passam
  //             pelo MESMO bloco de mobilia de
  //             scenes/side-room-scene.js.
  //
  //   ---------- as SEIS listas do BANHEIRO ----------
  //   bathroomSinks  : pia de coluna (models/bathroom-sink-factory.js).
  //   toilets        : privada (models/toilet-factory.js).
  //   mirrorCabinets : espelheira (models/mirror-cabinet-factory.js).
  //   towels         : toalha (models/towel-factory.js).
  //   showerBoxes    : box de chuveiro (models/shower-box-factory.js).
  //   laundryBaskets : cesto de roupa
  //             (models/laundry-basket-factory.js).
  //
  //   Nenhuma delas e um caso especial: as DEZESSEIS listas passam pelo
  //   MESMO bloco de mobilia de scenes/side-room-scene.js, e comodo que
  //   nao declarar nenhuma continua vazio (ainda o caso de QUARTO 01 e
  //   QUARTO 02: esta atualizacao deu aos dois forro rebaixado, luminaria
  //   e interruptor, mas nenhuma MOBILIA).
  //
  //   Campos de cada peca (valem para as dezesseis listas):
  //     id         : id estavel da peca dentro do comodo.
  //     corner     : em qual dos quatro cantos ela encosta (ver a tabela
  //                  CORNERS em scenes/side-room-scene.js).
  //     wallOffset : opcional. Quantos metros ela desliza pela parede a
  //                  partir do canto, na direcao do centro.
  //     elevation  : opcional, NOVO nesta atualizacao. Quantos metros ela
  //                  sobe a partir do piso - e o que permite peca
  //                  PENDURADA NA PAREDE (a espelheira e a toalha do
  //                  BANHEIRO sao as duas primeiras do jogo). Sem ele a
  //                  peca nasce no chao, como todas as outras.
  //     rotationY  : giro extra em Y, em radianos.
  //
  // A planta que sai destes numeros e exatamente a da imagem de
  // referencia (vista de cima; o corredor corre na horizontal, com
  // MEU QUARTO na ponta de z = 0):
  //
  //        x=-8.1        x=-3   x=+3        x=+8.1
  //   z=-3.15  +-------------+                          <- QUARTO 01
  //            |  QUARTO 01  |[porta -7]
  //  z=-10.85  +-------------+     |  CORREDOR  |
  //  z=-11.15  +-------------+                          <- QUARTO 02
  //            |  QUARTO 02  |[porta -15]
  //  z=-18.85  +-------------+
  //
  //   z=-3.75                      |  CORREDOR  |  +-------------+
  //                                     [porta -7]  |   COZINHA   |
  //  z=-11.45                                       +-------------+
  //  z=-11.75                                       +-------------+
  //                                    [porta -15]  |  BANHEIRO   |
  //  z=-19.45                                       +-------------+
  //
  // Dois detalhes dos numeros, os dois de proposito:
  //
  //  - `length` 7.7 com centros 8 metros afastados: sobra exatamente
  //    0.3 (a espessura de parede do jogo) entre os dois comodos de
  //    cada lado. Se fossem 8 de comprimento, as duas paredes
  //    vizinhas ficariam COPLANARES e brigariam por profundidade;
  //    com a folga, as duas leem como uma divisoria unica entre os
  //    comodos, que e o que a referencia mostra.
  //  - os comodos da direita ficam 0.6 mais para dentro do corredor
  //    que os da esquerda: e o que mantem a janela
  //    "janela-meu-quarto" (parede direita, z = -2.2, ver
  //    corridor-config.js) com a vista externa dela inteira, sem a
  //    parede da COZINHA nascendo colada no vidro.
  sideRooms: [
    {
      key: "quarto-01",
      label: "Quarto 01",
      doorId: "quarto-01",
      side: "left",
      center: -7,
      length: 7.7,
      depth: 4.8,

      // ---------- Teto REBAIXADO (o mesmo tratamento da COZINHA e do
      // BANHEIRO) ----------
      // Pedido do jogador: "os dois quartos parecem muito maior, dando a
      // impressao de que tudo la dentro e pequeno. Faca o mesmo que ja foi
      // feito na cozinha e no banheiro. Ao invez de descer o teto que ja
      // existe, crie uma nova camada de teto, que seja mais baixa".
      //
      // E literalmente o mesmo campo que a COZINHA (2.65) e o BANHEIRO
      // (2.6) ja usavam, e ele faz exatamente isso: o teto de 4.2
      // (CorridorConfig.height) continua onde sempre esteve, com o mesmo
      // material e as mesmas medidas, e o que entra e um SEGUNDO teto por
      // baixo dele (ver o bloco "Teto rebaixado" em
      // scenes/side-room-scene.js). Nenhuma parede, nenhum vao e nenhuma
      // caixa de colisao mudou de numero.
      //
      // 2.7, um dedo acima dos 2.65 da cozinha e dos 2.6 do banheiro, porque
      // dormitorio e o mais alto dos tres numa casa de verdade (a norma
      // brasileira pede 2.50 no minimo). Da a proporcao pedida: o comodo
      // para de ler como galpao, sobra 1.10 m acima da cabeca do jogador
      // (CorridorConfig.eyeHeight = 1.6) e da para andar pelo quarto inteiro
      // sem nem raspar. Nao da para descer muito mais: o limite de seguranca
      // e o alto da moldura da porta (2.44) + 10 cm, e a propria cena avisa e
      // sobe o forro se alguem escrever menos que isso.
      //
      // O vazio entre os dois tetos fica lacrado pelas quatro paredes do
      // comodo, que sobem inteiras ate 4.2 como sempre: nao existe fresta
      // por onde ve-lo, nem de dentro do quarto nem do corredor (o vao da
      // porta termina em 2.28 e a moldura em 2.44, os dois ABAIXO do forro
      // novo). Por cima da casa quem tampa e o telhado
      // (models/roof-factory.js).
      //
      // Feito para ser mexido: e um numero so, e o Editor tambem move o
      // forro no lugar (ele entra na hierarquia como
      // "Teto rebaixado do quarto 01"). Tirar a chave `loweredCeiling`
      // inteira devolve o comodo ao pe-direito antigo, sem tocar em codigo.
      loweredCeiling: { height: 2.7 },

      // ---------- Luz de teto ----------
      // MESMA luminaria do corredor, do banheiro e da cozinha
      // (LampFactory.createCeilingLamp, models/lamp-factory.js): nenhum
      // modelo novo entrou no jogo, e por isso ela le igual as outras tres.
      //
      // Sem `height` ela pendura no forro NOVO (2.7), nao no antigo: quem
      // decide isso e `fixtureCeilingHeight` em scenes/side-room-scene.js,
      // que passa a valer o teto rebaixado assim que ele existe. Bulbo em
      // ~2.24, bem acima da cabeca do jogador (CorridorConfig.eyeHeight =
      // 1.6).
      //
      // x/z = centro exato do comodo (7.7 x 4.8, sem divisoria nenhuma),
      // igual a luminaria da cozinha.
      ceilingLamps: [
        { id: "luminaria-quarto-01", x: 0, z: -2.4 },
      ],

      // ---------- Janela ----------
      // Pedido do jogador, no lugar exato circulado na imagem de
      // referência: a MESMA janela que o jogo já tem (moldura de madeira,
      // cortina interativa, vidro) — ver `windows` em
      // scenes/side-room-scene.js e models/window-factory.js. Nenhum
      // modelo novo entrou no jogo.
      //
      // Parede de FUNDO (a que dá para o terreno) e, com o clarão de volta
      // (effects/lightning-storm.js), esta janela pisca junto com as três
      // que já existiam.
      //
      // CORRECAO (janela atras da cama): `along` era -2.4 e caia em cima da
      // CABECEIRA. A cama que o jogador pos nos dois quartos pelo Editor
      // (clone "cama-quarto-copia"/"-copia-2" em data/editor-overrides.json)
      // encosta a cabeceira nesta MESMA parede de fundo e ocupa, no X local do
      // comodo, de -3.84 a -2.22 (1.56 de largura + os ~3 graus de giro dela).
      // A janela tem 1.2 de vao, ou seja, -2.4 abria de -3.0 a -1.8: 0.73 do
      // vidro nascia atras do movel, que e exatamente o que aparecia na foto.
      //
      // `along` -1.5 desliza a janela 0.9 para o lado ABERTO do quarto: ela
      // passa a ir de -2.1 a -0.9, com 12 cm de folga da cama e sem nenhum
      // pixel do vao coberto. Nao ha espaco do outro lado (a cama esta a 1 cm
      // da parede lateral, em -3.85), entao o lado tinha de ser este.
      //
      // Nos 1.2 m entre a cama e a prateleira de plantas a janela nao caberia
      // (falta 4 cm), por isso a prateleira do QUARTO 01 andou 32 cm na mesma
      // parede (data/editor-overrides.json, "plantbedpsx-copia"): agora ela
      // comeca em -0.80 e sobram 10 cm de parede entre as duas pecas. No
      // QUARTO 02 a prateleira ja estava do outro lado (+0.62) e nao precisou
      // de nada.
      //
      // `centerY` 1.4 nao mudou: peitoril em 0.6 e o alto em 2.2, meio metro
      // abaixo do forro rebaixado (2.7) - mais baixa que as janelas do
      // corredor (1.85).
      windows: [
        { id: "janela-quarto-01", wall: "fundo", along: -1.5, centerY: 1.4 },
      ],

      // ---------- Interruptor ----------
      // MESMO interruptor do corredor, da cozinha e do banheiro
      // (SwitchFactory.createSwitch, models/switch-factory.js). Um por
      // quarto, como foi pedido, e o controlador dele so conhece as
      // luminarias DESTA zona (ver o bloco `lightSwitches` em
      // scenes/side-room-scene.js): ele acende/apaga so a luz deste quarto,
      // sem tocar em nenhuma outra luz da casa.
      //
      // `wall: "entrada"` = a parede da porta, e o placeOnWall() da cena o
      // encosta na face de DENTRO dela (folga de 5 mm), virado para o
      // interior do comodo - era a condicao do pedido: "ao lado da porta,
      // pelo lado de dentro de cada quarto".
      //
      // `along` = X local do comodo. Nos dois quartos a porta cai no centro
      // exato da parede de entrada (doorLocalX = 0, ver `resolve` em
      // scenes/side-room-scene.js), e a moldura dela termina em 0.79
      // (DOOR_WIDTH/2 + FRAME_THICKNESS). Com 0.95 a espelhinha (0.09 de
      // largura) comeca 11 cm depois da moldura: encostada na porta, como
      // interruptor de verdade, sem nenhum pixel invadindo a madeira.
      //
      // O lado tambem nao e sorteado: a dobradica da folha cai em x local
      // -0.57 (DoorFactory.HINGE_X depois do giro de 90 graus da parede
      // lateral), entao +0.95 e o lado da MACANETA - a folha aberta nunca
      // passa na frente do interruptor.
      //
      // y = 1.15, a mesma altura do interruptor da cozinha.
      lightSwitches: [
        { id: "interruptor-quarto-01", wall: "entrada", along: 0.95, y: 1.15 },
      ],
    },
    {
      key: "quarto-02",
      label: "Quarto 02",
      doorId: "quarto-02",
      side: "left",
      center: -15,
      length: 7.7,
      depth: 4.8,

      // ---------- Teto REBAIXADO (o mesmo tratamento da COZINHA e do
      // BANHEIRO) ----------
      // Pedido do jogador: "os dois quartos parecem muito maior, dando a
      // impressao de que tudo la dentro e pequeno. Faca o mesmo que ja foi
      // feito na cozinha e no banheiro. Ao invez de descer o teto que ja
      // existe, crie uma nova camada de teto, que seja mais baixa".
      //
      // E literalmente o mesmo campo que a COZINHA (2.65) e o BANHEIRO
      // (2.6) ja usavam, e ele faz exatamente isso: o teto de 4.2
      // (CorridorConfig.height) continua onde sempre esteve, com o mesmo
      // material e as mesmas medidas, e o que entra e um SEGUNDO teto por
      // baixo dele (ver o bloco "Teto rebaixado" em
      // scenes/side-room-scene.js). Nenhuma parede, nenhum vao e nenhuma
      // caixa de colisao mudou de numero.
      //
      // 2.7, o MESMO numero do QUARTO 01: os dois quartos sao a mesma caixa
      // (7.7 x 4.8) na mesma parede do corredor, e forro em alturas
      // diferentes leria como erro de construcao ao passar de um para o
      // outro. Todo o resto do raciocinio esta na entrada do QUARTO 01, logo
      // acima.
      //
      // O vazio entre os dois tetos fica lacrado pelas quatro paredes do
      // comodo, que sobem inteiras ate 4.2 como sempre: nao existe fresta
      // por onde ve-lo, nem de dentro do quarto nem do corredor (o vao da
      // porta termina em 2.28 e a moldura em 2.44, os dois ABAIXO do forro
      // novo). Por cima da casa quem tampa e o telhado
      // (models/roof-factory.js).
      //
      // Feito para ser mexido: e um numero so, e o Editor tambem move o
      // forro no lugar (ele entra na hierarquia como
      // "Teto rebaixado do quarto 02"). Tirar a chave `loweredCeiling`
      // inteira devolve o comodo ao pe-direito antigo, sem tocar em codigo.
      loweredCeiling: { height: 2.7 },

      // ---------- Luz de teto ----------
      // MESMA luminaria do corredor, do banheiro e da cozinha
      // (LampFactory.createCeilingLamp, models/lamp-factory.js): nenhum
      // modelo novo entrou no jogo, e por isso ela le igual as outras tres.
      //
      // Sem `height` ela pendura no forro NOVO (2.7), nao no antigo: quem
      // decide isso e `fixtureCeilingHeight` em scenes/side-room-scene.js,
      // que passa a valer o teto rebaixado assim que ele existe. Bulbo em
      // ~2.24, bem acima da cabeca do jogador (CorridorConfig.eyeHeight =
      // 1.6).
      //
      // x/z = centro exato do comodo (7.7 x 4.8, sem divisoria nenhuma),
      // igual a luminaria da cozinha.
      ceilingLamps: [
        { id: "luminaria-quarto-02", x: 0, z: -2.4 },
      ],

      // ---------- Janela ----------
      // Pedido do jogador, no lugar exato circulado na imagem de
      // referência: a MESMA janela que o jogo já tem (moldura de madeira,
      // cortina interativa, vidro) — ver `windows` em
      // scenes/side-room-scene.js e models/window-factory.js. Nenhum
      // modelo novo entrou no jogo.
      //
      // Parede de FUNDO (a que dá para o terreno) e, com o clarão de volta
      // (effects/lightning-storm.js), esta janela pisca junto com as três
      // que já existiam.
      //
      // Os MESMOS numeros do QUARTO 01 - inclusive a correcao de `along`
      // (-2.4 -> -1.5, a janela saiu de tras da cabeceira; o porque, com as
      // medidas, esta na entrada do QUARTO 01, logo acima). O pedido foi o
      // mesmo lugar nos dois quartos, a cama esta no mesmo ponto nos dois e os
      // dois sao a mesma caixa (7.7 x 4.8) na mesma parede, entao janela em
      // altura ou posicao diferente leria como erro de construcao ao passar de
      // um para o outro.
      windows: [
        { id: "janela-quarto-02", wall: "fundo", along: -1.5, centerY: 1.4 },
      ],

      // ---------- Interruptor ----------
      // MESMO interruptor do corredor, da cozinha e do banheiro
      // (SwitchFactory.createSwitch, models/switch-factory.js). Um por
      // quarto, como foi pedido, e o controlador dele so conhece as
      // luminarias DESTA zona (ver o bloco `lightSwitches` em
      // scenes/side-room-scene.js): ele acende/apaga so a luz deste quarto,
      // sem tocar em nenhuma outra luz da casa.
      //
      // `wall: "entrada"` = a parede da porta, e o placeOnWall() da cena o
      // encosta na face de DENTRO dela (folga de 5 mm), virado para o
      // interior do comodo - era a condicao do pedido: "ao lado da porta,
      // pelo lado de dentro de cada quarto".
      //
      // `along` = X local do comodo. Nos dois quartos a porta cai no centro
      // exato da parede de entrada (doorLocalX = 0, ver `resolve` em
      // scenes/side-room-scene.js), e a moldura dela termina em 0.79
      // (DOOR_WIDTH/2 + FRAME_THICKNESS). Com 0.95 a espelhinha (0.09 de
      // largura) comeca 11 cm depois da moldura: encostada na porta, como
      // interruptor de verdade, sem nenhum pixel invadindo a madeira.
      //
      // O lado tambem nao e sorteado: a dobradica da folha cai em x local
      // -0.57 (DoorFactory.HINGE_X depois do giro de 90 graus da parede
      // lateral), entao +0.95 e o lado da MACANETA - a folha aberta nunca
      // passa na frente do interruptor.
      //
      // y = 1.15, a mesma altura do interruptor da cozinha.
      lightSwitches: [
        { id: "interruptor-quarto-02", wall: "entrada", along: 0.95, y: 1.15 },
      ],
    },
    {
      key: "cozinha",
      label: "Cozinha",
      doorId: "cozinha",
      side: "right",
      center: -7.6,
      length: 7.7,
      depth: 4.8,

      // ---------- Teto REBAIXADO (so da COZINHA) ----------
      // Pedido do jogador: a cozinha estava parecendo grande demais em
      // relacao aos moveis. O pe-direito da casa e 4.2 (CorridorConfig.
      // height) e a bancada tem 0.9 - quase cinco vezes a altura do
      // movel, o que le como galpao, nao como cozinha.
      //
      // 2.65 e altura de forro de cozinha de verdade (a norma brasileira
      // pede 2.50 no minimo) e da a proporcao pedida: pouco mais que o
      // dobro da bancada, 1.05 m acima da cabeca do jogador
      // (CorridorConfig.eyeHeight = 1.6) - da para andar por todo o
      // comodo sem nem raspar, que era a outra condicao.
      //
      // ---------- O teto antigo NAO foi tocado ----------
      // Era a condicao mais importante do pedido, e a implementacao segue
      // ela ao pe da letra: o teto de 4.2 continua onde sempre esteve,
      // com o mesmo material e as mesmas medidas, e o que entra e um
      // SEGUNDO teto por baixo dele (ver o bloco "Teto rebaixado" em
      // scenes/side-room-scene.js). Nenhuma parede, nenhum vao e nenhuma
      // caixa de colisao mudou de numero.
      //
      // O vazio entre os dois tetos fica lacrado pelas quatro paredes do
      // comodo, que sobem inteiras ate 4.2 como sempre: nao existe fresta
      // por onde ve-lo, nem de dentro da cozinha nem do corredor (o vao
      // da porta termina em 2.28, ver DoorFactory.OPENING_HEIGHT, e a
      // moldura em 2.44 - os dois ABAIXO do forro novo, entao ele nem
      // aparece de la). E o comodo ficou impossivel de olhar por cima:
      // do lado de fora quem tampa e o telhado (models/roof-factory.js).
      //
      // Feito para ser mexido: e um numero so, e o Editor tambem move o
      // forro no lugar (ele entra na hierarquia como "Teto rebaixado da
      // cozinha"). Tirar a chave `loweredCeiling` inteira devolve o
      // comodo ao pe-direito antigo, sem tocar em codigo.
      loweredCeiling: { height: 2.65 },

      // Mesma luminaria do corredor, centralizada no forro visivel.
      ceilingLamps: [
        { id: "luminaria-cozinha", x: 0, z: -2.4 },
      ],

      // ---------- Janela ----------
      // Pedido do jogador, no lugar exato circulado na imagem de
      // referência: a MESMA janela que o jogo já tem (moldura de madeira,
      // cortina interativa, vidro) — ver `windows` em
      // scenes/side-room-scene.js e models/window-factory.js. Nenhum
      // modelo novo entrou no jogo.
      //
      // Parede de FUNDO (a que dá para o terreno) e, com o clarão de volta
      // (effects/lightning-storm.js), esta janela pisca junto com as três
      // que já existiam.
      //
      // `along` 0.5: em cima da bancada da pia, exatamente onde estava o
      // círculo — entre o filtro de barro e a prateleira, sem esbarrar em
      // nenhum dos dois. `centerY` 1.8: peitoril em 1.0 (a bancada tem
      // 0.9, então sobra um dedo de azulejo) e o alto em 2.6, logo abaixo
      // do forro rebaixado da cozinha (2.65). Janela em cima da pia, como
      // em cozinha de verdade.
      windows: [
        { id: "janela-cozinha", wall: "fundo", along: 0.5, centerY: 1.8 },
      ],

      // Mesmo interruptor do corredor, na parede de entrada, pelo lado
      // de dentro. O controlador fica limitado as luminarias desta zona.
      lightSwitches: [
        { id: "interruptor-cozinha", wall: "entrada", along: 1.5, y: 1.15 },
      ],

      // Calendario decorativo acima do fogao, preso por prego e cordinha
      // via PosterFactory, como o poster do MEU QUARTO.
      posters: [
        {
          id: "calendario-cozinha",
          image: "assets/pictures/calendario-2020.png",
          wall: "fundo",
          along: -3.55,
          y: 1.75,
          width: 0.38,
          height: 0.557,
        },
      ],

      // ---------- Estilo das paredes (so da COZINHA) ----------
      // Azulejo de rodape + fiada decorativa florida + pintura verde-caqui
      // acima, feito a partir da imagem de referencia enviada pelo
      // jogador (ver createKitchenTileWallTexture em
      // materials/textures.js e kitchenWallLong/Short em
      // materials/material-library.js).
      //
      // E um campo de DADO, e nao um `if (key === "cozinha")` escondido
      // na cena: a lista de estilos vive na tabela WALL_STYLES de
      // scenes/side-room-scene.js e quem nao declara nada continua com o
      // lambri claro de sempre. Por isso QUARTO 01, QUARTO 02, BANHEIRO
      // e MEU QUARTO nao mudaram um pixel - era exatamente o pedido
      // ("nao altere as paredes dos outros comodos").
      wallStyle: "azulejo-cozinha",
      // ---------- Mobilia: o FOGAO ----------
      // Primeiro movel a entrar em um dos quatro comodos novos (ate
      // agora eles eram so a caixa arquitetonica). Dado PURO, como todo
      // o resto deste arquivo: o modelo em si e models/stove-factory.js
      // (um .glb em assets/models, mesmo sistema de importacao dos
      // moveis do MEU QUARTO) e quem monta/posiciona e
      // scenes/side-room-scene.js.
      //
      // Peca puramente decorativa: entra na colisao do comodo (para o
      // jogador nao atravessar o fogao andando), mas NAO em
      // `interactables` - sem contorno de destaque, sem prompt de
      // "Interagir", sem dialogo, sem animacao, sem som.
      //
      //   id        : id estavel da peca dentro do comodo.
      //   corner    : em qual canto do comodo o fogao encosta. Sao
      //               aceitos os quatro cantos - os dois da parede de
      //               FUNDO ("fundo-esquerda" | "fundo-direita") e os
      //               dois da parede de ENTRADA, a da porta
      //               ("entrada-esquerda" | "entrada-direita", que
      //               entraram junto com a geladeira) - ver a tabela
      //               CORNERS em scenes/side-room-scene.js. Este esta no
      //               canto do fundo a esquerda, o mais longe da porta
      //               (que cai em x local +0.6 da parede de entrada),
      //               entao o movel nunca disputa espaco com a passagem.
      //   rotationY : giro extra em Y, em radianos, aplicado ao movel
      //               ja encostado. 0 deixa a frente do fogao olhando
      //               para dentro do comodo (a peca nasce com a frente
      //               em +Z, ver models/stove-factory.js). A colisao
      //               acompanha qualquer angulo, inclusive os que nao
      //               sao multiplos de 90 graus.
      //
      // Posicao escolhida por conta propria (o usuario pediu "um canto
      // aleatorio") e feita para ser mexida: o Editor (botao EDITOR do
      // menu inicial) move, gira e escala a peca, e o que ele salvar
      // vale por cima destes numeros sem tocar em nenhum arquivo - ver
      // editor/README.md.
      stoves: [
        {
          id: "fogao-cozinha",
          corner: "fundo-esquerda",
          rotationY: 0,
        },
      ],

      // ---------- Mobilia: o BOTIJAO DE GAS ----------
      // Segunda peca decorativa da COZINHA, no MESMO esquema do `stoves`
      // logo acima (mesmos campos, mesmo bloco de montagem em
      // scenes/side-room-scene.js, mesma lista de cantos): o modelo e
      // models/gas-cylinder-factory.js, um .glb em assets/models
      // carregado pelo mesmo GLTFLoader dos outros moveis.
      //
      // Tambem puramente decorativa: entra na colisao do comodo (para o
      // jogador nao atravessar o botijao andando), mas NAO em
      // `interactables` - sem contorno de destaque, sem prompt de
      // "Interagir", sem dialogo, sem animacao, sem som. E o pedido do
      // usuario: "apenas um item decorativo, sem interacoes (por
      // enquanto)".
      //
      // Canto escolhido: "fundo-direita", o outro canto da parede do
      // fundo. O usuario deixou a posicao livre ("pode escolher um canto
      // aleatorio"), e este e o unico canto implementado que ainda
      // estava vago - o fogao ja ocupa o do fundo a esquerda, e por o
      // botijao no mesmo canto sobreporia as duas pecas e as duas caixas
      // de colisao.
      //
      // Feito para ser mexido: o Editor (botao EDITOR do menu inicial)
      // move, gira e escala a peca, e o que ele salvar vale por cima
      // destes numeros sem tocar em nenhum arquivo - ver
      // editor/README.md.
      gasCylinders: [
        {
          id: "botijao-cozinha",
          corner: "fundo-direita",
          rotationY: 0,
        },
      ],

      // ---------- Mobilia: a GELADEIRA ----------
      // Terceira peca decorativa da COZINHA, no MESMO esquema do `stoves`
      // e do `gasCylinders` acima (mesmos campos, mesmo bloco de
      // montagem em scenes/side-room-scene.js): o modelo e
      // models/fridge-factory.js, um .glb em assets/models carregado
      // pelo mesmo GLTFLoader dos outros moveis - nenhum sistema de
      // importacao novo, que foi o pedido.
      //
      // Tambem puramente decorativa: entra na colisao do comodo (para o
      // jogador nao atravessar a geladeira andando), mas NAO em
      // `interactables` - sem contorno de destaque, sem prompt de
      // "Interagir", sem dialogo, sem animacao, sem som. E o pedido do
      // usuario: "e apenas um item decorativo, sem interacoes (por
      // enquanto)".
      //
      // Canto escolhido: "entrada-esquerda", a quina da parede da PORTA
      // do lado do leftWall do comodo. Os dois cantos do fundo ja
      // estavam ocupados (fogao na esquerda, botijao na direita) e por a
      // geladeira em cima de um deles sobreporia as pecas e as caixas de
      // colisao - entao os dois cantos da parede de entrada entraram na
      // tabela CORNERS de scenes/side-room-scene.js junto com esta peca.
      // Escolhido o da esquerda, e nao o da direita, porque e o mais
      // longe do vao da porta (que cai em x local +0.6): a geladeira
      // nunca disputa espaco com a passagem nem com a folha girando. No
      // mundo ela cai por volta de x = 3.53, z = -11.15, encostada na
      // mesma parede do fogao, na outra ponta - do jeito que geladeira e
      // fogao ficam numa cozinha de verdade.
      //
      //   rotationY: Math.PI = a peca nasce com a frente em +Z (ver
      //   models/fridge-factory.js) e, nos cantos da parede de ENTRADA,
      //   o interior do comodo fica em -Z: sem esse meio giro a porta da
      //   geladeira ficaria virada para a parede. Os cantos do fundo (o
      //   fogao e o botijao) nao precisam disso, por isso o giro esta
      //   aqui nos dados e nao dentro da fabrica.
      //
      // Feito para ser mexido: o Editor (botao EDITOR do menu inicial)
      // move, gira e escala a peca, e o que ele salvar vale por cima
      // destes numeros sem tocar em nenhum arquivo - ver
      // editor/README.md.
      fridges: [
        {
          id: "geladeira-cozinha",
          corner: "entrada-esquerda",
          rotationY: Math.PI,
        },
      ],

      // ---------- Mobilia: a MESA (com as frutas em cima) ----------
      // Quarta peca decorativa da COZINHA, no MESMO esquema do `stoves`,
      // do `gasCylinders` e do `fridges` acima (mesmos campos, mesmo
      // bloco de montagem em scenes/side-room-scene.js): o modelo e
      // models/fruit-table-factory.js, um .glb em assets/models
      // carregado pelo mesmo GLTFLoader dos outros moveis - nenhum
      // sistema de importacao novo, que foi o pedido ("ja tem outros
      // itens que foram implementados dessa forma, portanto use o mesmo
      // sistema").
      //
      // Tambem puramente decorativa: entra na colisao do comodo (para o
      // jogador nao atravessar a mesa andando), mas NAO em
      // `interactables` - sem contorno de destaque, sem prompt de
      // "Interagir", sem dialogo, sem animacao, sem som. E o pedido do
      // usuario: "e apenas um item decorativo, sem interacoes (por
      // enquanto)".
      //
      // Canto escolhido: "entrada-direita", o ULTIMO dos quatro cantos
      // que ainda estava vago - fogao no fundo a esquerda, botijao no
      // fundo a direita e geladeira na entrada a esquerda. O usuario
      // deixou a posicao livre ("pode escolher um canto aleatorio") e
      // por a mesa em cima de qualquer uma das outras tres pecas
      // sobreporia os modelos e as caixas de colisao. No mundo ela cai
      // por volta de x = 3.73, z = -4.73: encostada na MESMA parede da
      // geladeira, na outra ponta, com o lado comprido acompanhando a
      // parede - e sobram 0.68 entre a quina dela e o vao da porta, que
      // cai em x local +0.6 (a conta do encosto e o aviso de "peca na
      // frente da passagem" estao em scenes/side-room-scene.js).
      //
      //   rotationY: Math.PI = mesmo caso da geladeira: a peca nasce com
      //   a frente em +Z (ver models/fruit-table-factory.js) e, nos
      //   cantos da parede de ENTRADA, o interior do comodo fica em -Z.
      //   Numa mesa isso e quase cosmetico (os dois lados compridos leem
      //   igual), mas mantem a convencao dos cantos de entrada e deixa a
      //   arrumacao das frutas virada para dentro do comodo. Trocar por 0
      //   so mostra o outro lado comprido: 180 graus nao mudam a pegada,
      //   entao a colisao fica exata nos dois casos.
      //
      // Feito para ser mexido: o Editor (botao EDITOR do menu inicial)
      // move, gira e escala a peca, e o que ele salvar vale por cima
      // destes numeros sem tocar em nenhum arquivo - ver
      // editor/README.md.
      fruitTables: [
        {
          id: "mesa-frutas-cozinha",
          corner: "entrada-direita",
          rotationY: Math.PI,
        },
      ],

      // ---------- Mobilia: a PIA COM ARMARIO ----------
      // Quinta peca decorativa da COZINHA, no MESMO esquema das quatro de
      // cima (mesmos campos, mesmo bloco de montagem em
      // scenes/side-room-scene.js): o modelo e
      // models/sink-cabinet-factory.js, um .glb em assets/models carregado
      // pelo mesmo GLTFLoader dos outros moveis - nenhum sistema de
      // importacao novo, que foi o pedido ("ja tem outros itens que foram
      // implementados dessa forma, portanto use o mesmo sistema, nao
      // precisa criar algo novo").
      //
      // Tambem puramente decorativa: entra na colisao do comodo (para o
      // jogador nao atravessar o balcao andando), mas NAO em
      // `interactables` - sem contorno de destaque, sem prompt de
      // "Interagir", sem dialogo, sem animacao, sem som. E o pedido do
      // usuario: "e apenas um item decorativo, sem interacoes, (por
      // enquanto)".
      //
      // ---------- Por que esta peca tem `wallOffset` ----------
      // As quatro pecas anteriores ocuparam os QUATRO cantos do comodo
      // (fogao no fundo a esquerda, botijao no fundo a direita, geladeira
      // na entrada a esquerda, mesa na entrada a direita). Nao sobrou
      // canto, e por a pia em cima de qualquer uma delas sobreporia os
      // modelos e as caixas de colisao.
      //
      // Entao ela usa um canto como ANCORA e DESLIZA ao longo da parede:
      // `corner: "fundo-esquerda"` a encosta na parede do fundo (a mesma
      // do fogao) e `wallOffset: 0.8` a empurra 80 cm para o lado, saindo
      // de cima do fogao. E um campo novo e opcional, lido pelo mesmo
      // bloco de mobilia de scenes/side-room-scene.js (ver o comentario da
      // tabela CORNERS la): as outras quatro pecas nao tem `wallOffset` e
      // nao mudaram um milimetro.
      //
      // O lugar nao e aleatorio a esmo (o pedido foi "pode escolher um
      // canto aleatorio"): pia ao lado do fogao, na mesma bancada, e
      // exatamente como uma cozinha de verdade e montada. No mundo ela cai
      // por volta de x = 7.43, z = -9.95, com 24 cm de folga visivel entre
      // ela e o fogao (14 cm entre as caixas de colisao) e a bancada na
      // mesma altura da dele (0.9 contra 0.92) - as duas leem como uma
      // linha continua de moveis.
      //
      //   rotationY: 0 = a peca nasce com a frente em +Z (ver
      //   models/sink-cabinet-factory.js) e, na parede do FUNDO, o
      //   interior do comodo fica em +Z: sem giro nenhum as portas do
      //   armario e a cuba ja olham para dentro do comodo. Mesmo caso do
      //   fogao e do botijao (os cantos da entrada e que precisam do meio
      //   giro).
      //
      // Feito para ser mexido: o Editor (botao EDITOR do menu inicial)
      // move, gira e escala a peca, e o que ele salvar vale por cima
      // destes numeros sem tocar em nenhum arquivo - ver
      // editor/README.md.
      sinkCabinets: [
        {
          id: "pia-armario-cozinha",
          corner: "fundo-esquerda",
          wallOffset: 0.8,
          rotationY: 0,
        },
      ],

      // ---------- Mobilia: a PRATELEIRA ----------
      // SEXTA peca decorativa da COZINHA, no MESMO esquema das cinco de
      // cima (mesmos campos, mesmo bloco de montagem em
      // scenes/side-room-scene.js): o modelo e models/shelf-factory.js, um
      // .glb em assets/models carregado pelo mesmo GLTFLoader dos outros
      // moveis - nenhum sistema de importacao novo, que foi o pedido.
      //
      // Tambem puramente decorativa: entra na colisao do comodo (para o
      // jogador nao atravessar a prateleira andando), mas NAO em
      // `interactables` - sem contorno de destaque, sem prompt de
      // Interagir, sem dialogo, sem animacao, sem som. E o pedido do
      // usuario: apenas um item decorativo, sem interacoes, por enquanto.
      //
      // ---------- Onde ela ficou ----------
      // Os quatro cantos do comodo ja estavam ocupados (fogao no fundo a
      // esquerda, botijao no fundo a direita, geladeira na entrada a
      // esquerda, mesa na entrada a direita), entao a prateleira faz o
      // MESMO que a pia: usa um canto como ANCORA e desliza ao longo da
      // parede pelo campo opcional wallOffset (ver o bloco de mobilia em
      // scenes/side-room-scene.js). Aqui a ancora e o canto do BOTIJAO
      // (fundo-direita) e ela anda 75 cm para o lado, saindo de cima dele.
      //
      // O usuario deixou a posicao livre (pode escolher um canto
      // aleatorio), e este canto e o que sobra fazendo sentido: a parede do
      // FUNDO e a mesma do fogao e da pia, entao a cozinha inteira le como
      // uma bancada continua, e a prateleira fica na ponta dela, do lado
      // oposto a pia.
      //
      // No mundo ela cai por volta de x = 7.63, z = -5.02, encostada na
      // parede do fundo, com 26 cm de folga visivel entre ela e o botijao
      // (16 cm entre as caixas de colisao) e 3.75 m de parede livre entre
      // ela e a pia - ninguem esbarra em nada andando por ali. Mede
      // 1.01 x 0.29 de base por 0.82 de altura (ver models/shelf-factory.js:
      // o arquivo chegou em metros, sem reescala nenhuma).
      //
      //   rotationY: 0 = a peca nasce com a frente em +Z (ver
      //   models/shelf-factory.js) e, na parede do FUNDO, o interior do
      //   comodo fica em +Z: sem giro nenhum o lado aberto das divisoes ja
      //   olha para dentro do comodo. Mesmo caso do fogao, do botijao e da
      //   pia (os cantos da entrada e que precisam do meio giro).
      //
      // Feito para ser mexido: o Editor (botao EDITOR do menu inicial) move,
      // gira e escala a peca, e o que ele salvar vale por cima destes
      // numeros sem tocar em nenhum arquivo - ver editor/README.md.
      shelves: [
        {
          id: "prateleira-cozinha",
          corner: "fundo-direita",
          wallOffset: 0.75,
          rotationY: 0,
        },
      ],

      // ---------- Mobilia: o MICROONDAS ----------
      // SETIMA peca decorativa da COZINHA, no MESMO esquema das seis de
      // cima (mesmos campos, mesmo bloco de montagem em
      // scenes/side-room-scene.js): o modelo e
      // models/microwave-factory.js, um .glb em assets/models carregado
      // pelo mesmo GLTFLoader dos outros moveis - nenhum sistema de
      // importacao novo, que foi o pedido ("ja tem outros itens que foram
      // implementados dessa forma, portanto use o mesmo sistema, nao
      // precisa criar algo novo").
      //
      // Tambem puramente decorativa: entra na colisao do comodo (para o
      // jogador nao atravessar o aparelho andando), mas NAO em
      // `interactables` - sem contorno de destaque, sem prompt de
      // Interagir, sem dialogo, sem animacao, sem som, sem porta que abre
      // e sem luz interna. E o pedido do usuario: apenas um item
      // decorativo, sem interacoes, por enquanto.
      //
      // ---------- Onde ele ficou ----------
      // Os quatro cantos do comodo continuam ocupados (fogao no fundo a
      // esquerda, botijao no fundo a direita, geladeira na entrada a
      // esquerda, mesa na entrada a direita), entao o microondas faz o
      // MESMO que a pia e a prateleira: usa um canto como ANCORA e desliza
      // ao longo da parede pelo campo opcional wallOffset (ver o bloco de
      // mobilia em scenes/side-room-scene.js). Aqui a ancora e o canto do
      // FOGAO (fundo-esquerda) e ele anda 2.4 m para o lado, saindo de
      // cima do fogao e da pia.
      //
      // O usuario deixou a posicao livre (pode escolher um canto
      // aleatorio), e este e o lugar que faz sentido: parede do FUNDO,
      // logo depois da pia, continuando a linha de bancada da cozinha -
      // fogao, pia, microondas, na ordem em que uma cozinha de verdade e
      // montada.
      //
      // No mundo ele cai por volta de x = 7.59, z = -8.72, encostado na
      // parede do fundo com os mesmos 2 cm de folga das outras pecas, com
      // 24 cm visiveis entre ele e a pia (14 cm entre as caixas de
      // colisao) e ainda 2.89 m de parede livre entre ele e a prateleira
      // do outro lado - ninguem esbarra em nada andando por ali. Mede
      // 0.61 x 0.38 de base por 0.38 de altura (ver
      // models/microwave-factory.js: o arquivo chegou em metros, sem
      // reescala nenhuma).
      //
      // Ele fica NO CHAO, como as outras seis: o bloco de mobilia dos
      // comodos apoia toda peca no piso e nao existe (ainda) campo de
      // altura para empilhar uma peca em cima da outra. Se a ideia for ver
      // o microondas em cima da bancada da pia, e um arraste no eixo Y do
      // gizmo do Editor e o valor fica salvo por cima destes numeros - ou,
      // no codigo, um campo opcional novo no mesmo estilo do wallOffset.
      // Nao foi inventado aqui de proposito: o pedido foi um canto do
      // cenario, com o mesmo sistema das outras pecas, e nada novo.
      //
      //   rotationY: 0 = a peca nasce com a frente em +Z (ver
      //   models/microwave-factory.js) e, na parede do FUNDO, o interior
      //   do comodo fica em +Z: sem giro nenhum a porta de vidro e o
      //   painel de botoes ja olham para dentro do comodo. Mesmo caso do
      //   fogao, do botijao, da pia e da prateleira (os cantos da entrada
      //   e que precisam do meio giro).
      //
      // Feito para ser mexido: o Editor (botao EDITOR do menu inicial)
      // move, gira e escala a peca, e o que ele salvar vale por cima
      // destes numeros sem tocar em nenhum arquivo - ver
      // editor/README.md.
      microwaves: [
        {
          id: "microondas-cozinha",
          corner: "fundo-esquerda",
          wallOffset: 2.4,
          rotationY: 0,
        },
      ],

      // ---------- Mobilia: o FILTRO DE BARRO ----------
      // OITAVA peca decorativa da COZINHA, no MESMO esquema das sete de
      // cima (mesmos campos, mesmo bloco de montagem em
      // scenes/side-room-scene.js): o modelo e
      // models/clay-filter-factory.js, um .glb em assets/models carregado
      // pelo mesmo GLTFLoader dos outros moveis, com o mesmo DRACOLoader
      // acoplado - nenhum sistema de importacao novo, que foi o pedido
      // ("ja tem outros itens que foram implementados dessa forma,
      // portanto use o mesmo sistema, nao precisa criar algo novo").
      //
      // Tambem puramente decorativa: entra na colisao do comodo (para o
      // jogador nao atravessar o filtro andando), mas NAO em
      // `interactables` - sem contorno de destaque, sem prompt de
      // Interagir, sem dialogo, sem animacao, sem som e sem torneira que
      // funciona. E o pedido do usuario: apenas um item decorativo, sem
      // interacoes, por enquanto.
      //
      // ---------- Onde ele ficou ----------
      // Os quatro cantos do comodo continuam ocupados (fogao no fundo a
      // esquerda, botijao no fundo a direita, geladeira na entrada a
      // esquerda, mesa na entrada a direita), entao o filtro faz o MESMO
      // que a pia, a prateleira e o microondas: usa um canto como ANCORA
      // e desliza ao longo da parede pelo campo opcional wallOffset (ver
      // o bloco de mobilia em scenes/side-room-scene.js). Aqui a ancora e
      // o canto da GELADEIRA (entrada-esquerda) e ele anda 1.05 m para o
      // lado, saindo de cima dela. E a primeira peca a deslizar num canto
      // da parede de ENTRADA - mesma conta de sempre, sem uma linha de
      // codigo nova.
      //
      // O usuario deixou a posicao livre (pode escolher um canto
      // aleatorio), e este e o lugar que faz sentido: a parede do FUNDO ja
      // e a bancada da cozinha (fogao, pia, microondas) e a outra ponta da
      // parede de entrada e a mesa, entao sobrou a parede da PORTA, ao
      // lado da geladeira - que e exatamente onde o filtro de barro fica
      // numa casa de verdade: perto da entrada, longe do fogo, na primeira
      // coisa que se ve ao entrar na cozinha.
      //
      // No mundo ele cai por volta de x = 3.41, z = -10.23, encostado na
      // parede da entrada com os mesmos 2 cm de folga das outras pecas,
      // com 49 cm visiveis entre ele e a geladeira (39 cm entre as caixas
      // de colisao) e ainda 2.45 m de parede livre entre ele e o vao da
      // porta - ninguem esbarra em nada andando por ali e a passagem
      // continua limpa. Mede 0.29 x 0.33 de base por 0.65 de altura (ver
      // models/clay-filter-factory.js: o arquivo chegou com as proporcoes
      // certas mas grande demais, entao ele e reescalado UNIFORMEMENTE
      // pela altura, como a geladeira e a pia).
      //
      // Ele fica NO CHAO, como as outras sete: o bloco de mobilia dos
      // comodos apoia toda peca no piso e nao existe (ainda) campo de
      // altura para empilhar uma peca em cima da outra. Filtro de barro no
      // chao e comum, mas se a ideia for ver ele em cima da mesa ou de um
      // suporte, e um arraste no eixo Y do gizmo do Editor e o valor fica
      // salvo por cima destes numeros - ou, no codigo, um campo opcional
      // novo no mesmo estilo do wallOffset. Nao foi inventado aqui de
      // proposito: o pedido foi um canto do cenario, com o mesmo sistema
      // das outras pecas, e nada novo.
      //
      //   rotationY: Math.PI = mesmo caso da geladeira e da mesa: a peca
      //   nasce com a frente em +Z (a TORNEIRA, ver MODEL_YAW em
      //   models/clay-filter-factory.js) e, nos cantos da parede de
      //   ENTRADA, o interior do comodo fica em -Z. Sem esse meio giro a
      //   torneira ficaria virada para a parede.
      //
      // Feito para ser mexido: o Editor (botao EDITOR do menu inicial)
      // move, gira e escala a peca, e o que ele salvar vale por cima
      // destes numeros sem tocar em nenhum arquivo - ver
      // editor/README.md.
      clayFilters: [
        {
          id: "filtro-barro-cozinha",
          corner: "entrada-esquerda",
          wallOffset: 1.05,
          rotationY: Math.PI,
        },
      ],

      // ---------- Mobilia: a GARRAFA COM O COPO ----------
      // NONA peca decorativa da COZINHA, mesmo esquema das oito de cima
      // (models/bottle-glass-factory.js, .glb com o mesmo GLTFLoader +
      // DRACOLoader). Puramente decorativa: entra na colisao, nao em
      // interactables. Os quatro cantos ja estavam ocupados, entao ela
      // ancora no canto da GELADEIRA e desliza 1.55 m pela parede da
      // entrada, 50 cm depois do FILTRO DE BARRO (garrafa e copo do lado
      // de onde se enche o copo). No mundo: x = 3.31, z = -9.74, 21 cm do
      // filtro e 1.97 m do vao da porta. Mede 0.28 x 0.13 por 0.30 de
      // altura. Fica no chao como as outras oito; para subir na bancada,
      // arraste o eixo Y no Editor. rotationY Math.PI: cantos da entrada.
      bottleGlasses: [
        {
          id: "garrafa-copo-cozinha",
          corner: "entrada-esquerda",
          wallOffset: 1.55,
          rotationY: Math.PI,
        },
      ],

      // ---------- Mobilia: o RADIO PORTATIL ----------
      // DECIMA peca decorativa da COZINHA, no MESMO esquema das nove de
      // cima (mesmos campos, mesmo bloco de montagem em
      // scenes/side-room-scene.js): o modelo e
      // models/portable-radio-factory.js, um .glb em assets/models
      // carregado pelo mesmo GLTFLoader dos outros moveis - sem
      // DRACOLoader, porque a geometria deste chega crua, igual a do
      // microondas. Nenhum sistema de importacao novo, que foi o pedido
      // ("ja tem outros itens que foram implementados dessa forma,
      // portanto use o mesmo sistema, nao precisa criar algo novo") - o
      // js/psx-material.js que veio no pacote do modelo ficou de fora de
      // proposito, ver o bloco sobre ele na fabrica.
      //
      // Cuidado para nao confundir com o OUTRO radio do jogo: o de MAO,
      // que fica deitado na mesinha de TV do MEU QUARTO (ver
      // models/radio-factory.js). Sao dois modelos diferentes, em dois
      // comodos diferentes; este e o portatil de bancada, com alca e
      // antena.
      //
      // Tambem puramente decorativa: entra na colisao do comodo (para o
      // jogador nao atravessar o radio andando), mas NAO em
      // `interactables` - sem contorno de destaque, sem prompt de
      // Interagir, sem dialogo, sem animacao, sem chuvisco de estacao
      // morta e sem botao que liga. E o pedido do usuario: apenas um item
      // decorativo, sem interacoes, por enquanto. O dia em que o radio
      // for LIGAR, o lugar disso e `interactables` + audio/, e nao este
      // arquivo de dados.
      //
      // ---------- Onde ele ficou ----------
      // Os quatro cantos do comodo continuam ocupados (fogao no fundo a
      // esquerda, botijao no fundo a direita, geladeira na entrada a
      // esquerda, mesa na entrada a direita), entao o radio faz o MESMO
      // que a pia, a prateleira, o microondas, o filtro e a garrafa: usa
      // um canto como ANCORA e desliza ao longo da parede pelo campo
      // opcional wallOffset (ver o bloco de mobilia em
      // scenes/side-room-scene.js). Aqui a ancora e o canto do FOGAO
      // (fundo-esquerda) e ele anda 3.2 m para o lado, caindo na parede do
      // FUNDO logo depois do microondas - a sequencia da "bancada" do
      // comodo fica fogao, pia, microondas e radio, que e onde um radio de
      // cozinha vive de verdade: ligado ao lado do fogao, com a dona da
      // casa ouvindo enquanto cozinha.
      //
      // O usuario deixou a posicao livre (pode escolher um canto
      // aleatorio) e avisou que muda pelo Editor se nao gostar. Nos
      // numeros: no comodo ele cai em x local -0.53, z local -4.74, e no
      // mundo por volta de x = 7.74, z = -8.13, encostado na parede do
      // fundo com os mesmos 2 cm de folga das outras pecas. Sobram 19 cm
      // visiveis entre ele e o microondas (9 cm entre as caixas de
      // colisao) e 2.5 m de parede livre dali ate a prateleira, do outro
      // lado - ninguem esbarra em nada andando por ali, e a peca fica bem
      // no campo de visao de quem entra pela porta (que cai do outro lado
      // do comodo, na parede de entrada).
      //
      // Mede 0.205 x 0.074 de base por 0.55 de altura, e esses 55 cm sao a
      // ANTENA ESTENDIDA: o aparelho em si tem 20,5 x 14 x 7,4 cm. Por
      // isso a fabrica usa MODEL_SCALE = 1 e nao TARGET_HEIGHT como a
      // geladeira/a pia/o filtro - o arquivo chegou em metros e com as
      // medidas certas; ancorar a escala na altura da caixa esmagaria o
      // radio. A antena nasce dentro da pegada do corpo, entao a colisao e
      // a pegada do aparelho e nao uma coluna invisivel em volta da haste
      // (ver FINAL_WIDTH em models/portable-radio-factory.js).
      //
      // Ele fica NO CHAO, como as outras nove: o bloco de mobilia dos
      // comodos apoia toda peca no piso e nao existe (ainda) campo de
      // altura para empilhar uma peca em cima da outra. Se a ideia for ver
      // o radio em cima da PRATELEIRA ou da bancada da pia - que e onde
      // ele ficaria melhor -, e um arraste no eixo Y do gizmo do Editor e
      // o valor fica salvo por cima destes numeros, sem tocar em arquivo
      // nenhum. Nao foi inventado um campo de altura aqui de proposito: o
      // pedido foi um canto do cenario, com o mesmo sistema das outras
      // pecas, e nada novo.
      //
      //   rotationY: 0 = a peca nasce com a frente em +Z (o auto-falante,
      //   o dial e os dois botoes, ver MODEL_YAW em
      //   models/portable-radio-factory.js) e, nos cantos da parede do
      //   FUNDO, o interior do comodo fica em +Z - igual ao fogao, a pia,
      //   a prateleira e o microondas. Ou seja: o painel do radio olha
      //   para dentro da cozinha e a antena fica atras, junto da parede.
      //
      // Feito para ser mexido: o Editor (botao EDITOR do menu inicial)
      // move, gira e escala a peca, e o que ele salvar vale por cima
      // destes numeros sem tocar em nenhum arquivo - ver
      // editor/README.md.
      portableRadios: [
        {
          id: "radio-cozinha",
          corner: "fundo-esquerda",
          wallOffset: 3.2,
          rotationY: 0,
        },
      ],

      // ---------- O TAPETE em frente ao armario ----------
      // Primeiro tapete de um dos quatro comodos novos. O modelo e
      // models/carpet-factory.js (createStripedRug), a MESMA fabrica dos
      // outros dois tapetes do jogo - nenhum sistema novo, que foi o
      // pedido -, feito a partir da segunda imagem de referencia:
      // listras no comprimento (oliva, vermelho, campo bege, friso
      // mostarda e faixa central azul-acinzentada, espelhadas) e franja
      // nas duas pontas curtas.
      //
      // Puramente decorativo, como toda a mobilia destes comodos: NAO
      // entra na colisao (tapete de 1.2 cm nao e obstaculo - o jogador
      // passa por cima andando normalmente) e NAO entra em
      // `interactables`. O unico efeito de jogo e o som do passo, que
      // vira "tapete" em cima dele (ver getSurfaceAt em
      // scenes/side-room-scene.js e audio/passos/tapete).
      //
      //   length : quanto ele corre ao longo da parede do fundo (X local)
      //   width  : quanto ele avanca para dentro do comodo (Z local)
      //   x / z  : centro do tapete no espaco DO COMODO (a mesma
      //            referencia dos moveis: parede da porta em z = 0,
      //            interior crescendo para -Z, parede do fundo em -4.8)
      //
      // ---------- Por que a posicao esta escrita, e nao derivada ----------
      // As outras pecas se encostam num `corner` e escorregam pela parede
      // com `wallOffset`. O tapete NAO faz isso porque ele nao mora numa
      // parede: ele mora em frente a um MOVEL, e o movel em questao (a
      // pia com armario) foi movido no Editor e ainda GANHOU UMA COPIA ao
      // lado - o balcao que aparece no jogo hoje sao as duas pecas juntas
      // (ver data/editor-overrides.json). Derivar do canto devolveria o
      // lugar ANTIGO do armario, do outro lado do comodo, e o tapete
      // apareceria longe dele.
      //
      // Entao os numeros abaixo sao a conta feita em cima do balcao como
      // ele esta na tela: as duas pecas ocupam de x = -0.91 a x = +1.74
      // (2.65 m de bancada, centro em x = 0.415) com a frente em
      // z = -4.08. O tapete sai centrado nesse mesmo 0.415, alinhado com
      // a bancada, e a borda de tras dele para em z = -4.02: 5.6 cm de
      // folga da frente do armario, perto o bastante para ler como "em
      // frente ao armario" e longe o bastante para nenhuma face entrar
      // dentro do movel.
      //
      // 2.4 x 1.0 mantem a proporcao da referencia (1 : 2.4, medida na
      // propria imagem) e cobre praticamente toda a frente da bancada,
      // como na foto com a marcacao. A escala e coerente com o comodo:
      // 2.4 m dos 7.7 de parede e 1 m dos 4.8 de profundidade, ou seja
      // sobram 3 m de piso livre entre o tapete e a porta.
      //
      // Se o armario voltar para o lugar de codigo (basta apagar as duas
      // entradas `sinkcabinetpsx` de data/editor-overrides.json), o
      // tapete acompanha trocando estes dois numeros por x = -2.353 e
      // z = -3.52. O Editor tambem arrasta o tapete no lugar, e o que ele
      // salvar vale por cima daqui (ele entra na hierarquia como
      // "Tapete da cozinha").
      rugs: [
        {
          id: "tapete-cozinha",
          length: 2.4,
          width: 1,
          x: 0.415,
          z: -3.52,
          rotationY: 0,
        },
      ],
    },
    {
      key: "banheiro",
      label: "Banheiro",
      doorId: "banheiro",
      side: "right",
      center: -15.6,
      length: 7.7,
      depth: 4.8,

      // ---------- Teto REBAIXADO (o mesmo tratamento da COZINHA) ----------
      // Pedido do jogador: "o teto esta alto de mais, dando a impressao de
      // que tudo dentro do banheiro e minusculo. Faca algo parecido com o
      // que foi feito na COZINHA. ao invez de modificar o teto que ja
      // existe, apenas crie uma nova camada de teto, que seja mais baixa".
      //
      // E literalmente o campo que a COZINHA ja usava, e ele faz
      // exatamente isso: o teto de 4.2 (CorridorConfig.height) continua
      // onde sempre esteve, com o mesmo material e as mesmas medidas, e o
      // que entra e um SEGUNDO teto por baixo dele (ver o bloco "Teto
      // rebaixado" em scenes/side-room-scene.js). Nenhuma parede, nenhum
      // vao e nenhuma caixa de colisao mudou de numero.
      //
      // 2.6, e nao os 2.65 da cozinha: banheiro e o comodo mais baixo de
      // uma casa de verdade, e aqui a peca mais alta e o box de chuveiro
      // (2 m) - com 2.6 sobram 60 cm acima dele e 1 m acima da cabeca do
      // jogador (CorridorConfig.eyeHeight = 1.6), entao da para andar pelo
      // comodo inteiro sem nem raspar. Nao da para descer muito mais: o
      // limite de seguranca e o alto da moldura da porta (2.44) + 10 cm, e
      // a propria cena avisa e sobe o forro se alguem escrever menos que
      // isso.
      //
      // O vazio entre os dois tetos fica lacrado pelas quatro paredes do
      // comodo, que sobem inteiras ate 4.2 como sempre (e agora tambem
      // pelas divisorias novas, ver `partitions` abaixo): nao existe
      // fresta por onde ve-lo, nem de dentro do banheiro nem do corredor
      // (o vao da porta termina em 2.28 e a moldura em 2.44, os dois
      // ABAIXO do forro novo). Por cima da casa quem tampa e o telhado.
      //
      // Feito para ser mexido: e um numero so, e o Editor tambem move o
      // forro no lugar (ele entra na hierarquia como "Teto rebaixado do
      // banheiro"). Tirar a chave `loweredCeiling` inteira devolve o
      // comodo ao pe-direito antigo, sem tocar em codigo.
      loweredCeiling: { height: 2.6 },

      // ---------- Estilo das paredes (so do BANHEIRO) ----------
      // Azulejo quase branco com uma florzinha salmao em CADA peca do
      // chao ate 1.84 m, e pintura bege gasta acima - feito a partir da
      // imagem de referencia enviada pelo jogador (ver
      // createBathroomTileWallTexture em materials/textures.js e
      // bathroomWallLong/Short em materials/material-library.js). O pedido
      // foi "a textura de parede deve ser a textura das paredes do
      // banheiro, (apenas do banheiro)", e e exatamente o que este campo
      // faz: a lista de estilos vive na tabela WALL_STYLES de
      // scenes/side-room-scene.js e quem nao declara nada continua com o
      // lambri claro de sempre. Por isso QUARTO 01, QUARTO 02, MEU QUARTO
      // e o CORREDOR nao mudaram um pixel, e a COZINHA segue com o azulejo
      // dela.
      wallStyle: "azulejo-banheiro",

      // Luz de teto: MESMA luminaria do corredor e da cozinha. x/z = centro
      // de area do L que sobrou depois das divisorias; sem height ela pendura
      // no forro visivel (2.6), bulbo em ~2.14.
      ceilingLamps: [
        { id: "luminaria-banheiro", x: -1.2, z: -2.05 },
      ],

      // Interruptor: acende/apaga SO esta luz (o controlador conhece apenas
      // as luminarias desta zona). Posicao medida no circulo laranja da
      // imagem, usando a grade do azulejo como regua e a moldura da porta
      // (x = 1.39) como referencia: centro em x 1.79 / y 1.29.
      lightSwitches: [
        { id: "interruptor-banheiro", wall: "entrada", along: 1.8, y: 1.3 },
      ],

      // Piso de ceramica, so deste comodo (createCeramicFloorTexture em
      // materials/textures.js, com as cores medidas na imagem enviada).
      // O som do passo continua o de madeira: o jogo nao tem gravacao de
      // piso duro ainda.
      floorStyle: "ceramica-banheiro",

      // ---------- DIVISORIAS: o comodo ficou menor ----------
      // Pedido do jogador, com uma imagem do proprio Editor riscada a
      // mao: "vamos reduzir o tamanho do banheiro... seguindo essa linha,
      // e onde voce deve colocar uma parede". O traco da imagem, lido de
      // volta para o espaco deste comodo, e uma linha de TRES trechos em
      // L: desce da parede de entrada em x = +2.5, atravessa o comodo em
      // z = -2.35 e sobe ate a parede do fundo em x = -0.3.
      //
      // Sao esses tres trechos, na ordem. Cada um comeca e termina em
      // outra parede, entao a linha fecha de parede a parede sem sobrar
      // ponta solta, e o que era um retangulo de 7.7 x 4.8 (37 m2, mais
      // salao do que banheiro) virou um L de ~23 m2 - uns 36% menor, o
      // "diminua um pouco" do pedido.
      //
      // ---------- Nada da caixa antiga foi tocado ----------
      // `length`, `depth`, o pe-direito, o vao da porta, a fachada, o
      // telhado e os retangulos que mantem grama/arvores/nevoa fora da
      // casa continuam TODOS com os mesmos numeros: as paredes novas sao
      // uma camada por dentro, do mesmo jeito que o teto rebaixado logo
      // acima e uma camada por baixo do teto antigo. O espaco que sobrou
      // atras delas fica lacrado e nao aparece em angulo nenhum.
      //
      // ---------- Nenhum movel ficou preso do lado de fora ----------
      // Conferido peca por peca (contando o que o Editor ja moveu, ver
      // data/editor-overrides.json): pia, espelheira, toalha e box ficam
      // na faixa da entrada; privada e os dois cestos ficam na parte funda
      // da esquerda; e o vao da porta (x local +0.6) continua livre, com
      // 1.9 m entre ele e a divisoria mais proxima.
      //
      // Feito para ser mexido: cada trecho tem id proprio e aparece na
      // hierarquia do Editor ("Divisoria do banheiro (entrada)" e
      // companhia), entao a posicao pode ser afinada com o gizmo sem tocar
      // em codigo - e tirar a chave `partitions` inteira devolve o
      // banheiro grande de antes.
      partitions: [
        // Desce da parede de ENTRADA ate o meio do comodo, fechando o
        // canto direito da frente.
        {
          id: "divisoria-banheiro-entrada",
          axis: "x",
          at: 2.5,
          from: 0,
          to: -2.35,
        },
        // Atravessa o comodo, paralela a parede de entrada: e ela que
        // corta a metade funda da direita.
        {
          id: "divisoria-banheiro-meio",
          axis: "z",
          at: -2.35,
          from: 2.5,
          to: -0.3,
        },
        // Sobe do meio ate a parede do FUNDO, fechando o L e deixando de
        // fora so o pedaco que ninguem usa.
        {
          id: "divisoria-banheiro-fundo",
          axis: "x",
          at: -0.3,
          from: -2.35,
          to: -4.8,
        },
      ],

      // ---------- O TAPETE de banho ----------
      // Pedido do jogador, marcado com um retangulo vermelho na mesma
      // imagem: "quero que voce coloque o tapete em frente a pia, no local
      // onde eu fiz um retangulo vermelho". O retangulo, lido de volta
      // para o espaco do comodo, da um tapete de ~1.5 x 0.9 centrado em
      // x = -1.0, z = -1.0 - e sao exatamente estes numeros, arredondados
      // para medida de tapete de banho de verdade (1.50 x 0.90).
      //
      // A pia esta em x = -0.85 na parede de ENTRADA (ela foi movida para
      // la pelo Editor, ver data/editor-overrides.json), entao "em frente
      // a pia" aqui e um pouco para dentro do comodo, no eixo Z - que e
      // onde o retangulo cai. O tapete NAO fica debaixo de movel nenhum e
      // sobra 1.35 m entre ele e a divisoria do meio.
      //
      // `style: "banho"`: tecido escuro cinza-arroxeado e SEM franja, fiel
      // a imagem do tapete que o jogador enviou (ver createBathMatTexture
      // em materials/textures.js). O tapete listrado da COZINHA continua
      // exatamente como estava - quem nao declara `style` cai nele (ver
      // STRIPED_RUG_STYLES em models/carpet-factory.js).
      //
      // Como o da cozinha, ele NAO entra na colisao (uma lamina de 1.2 cm
      // nao e obstaculo): o unico efeito de jogo e o som do passo, que
      // muda para "tapete" quando o jogador esta em cima dele.
      rugs: [
        {
          id: "tapete-banheiro",
          style: "banho",
          length: 1.5,
          width: 0.9,
          x: -1,
          z: -1,
          rotationY: 0,
        },
      ],

      // ---------- Mobilia: as SEIS pecas do BANHEIRO ----------
      // O comodo era so a caixa arquitetonica ate esta atualizacao. As
      // seis pecas chegaram juntas, em pacotes de conversao PSX, e todas
      // entraram pelo MESMO caminho das dez da COZINHA: um .glb em
      // assets/models carregado pelo MESMO GLTFLoader, uma fabrica em
      // models/ e uma lista aqui - nenhum sistema de importacao novo, que
      // foi o pedido ("ja tem outros itens que foram implementados dessa
      // forma, portanto use o mesmo sistema, nao precisa criar algo
      // novo").
      //
      // Todas puramente DECORATIVAS: entram na colisao do comodo (para o
      // jogador nao atravessar os moveis andando), mas NAO em
      // `interactables` - sem contorno de destaque, sem prompt de
      // "Interagir", sem dialogo, sem animacao, sem som. E o pedido do
      // usuario: "sao apenas itens decorativos, sem interacoes, (por
      // enquanto)".
      //
      // ---------- Onde cada uma ficou ----------
      // O usuario deixou a posicao livre ("pode escolher um canto
      // aleatorio, caso eu nao goste da posicao, eu posso alterar com o
      // editor depois"), entao a escolha seguiu a mesma regra da COZINHA:
      // canto/parede que faca sentido de banheiro de verdade e, acima de
      // tudo, nada sobreposto - cada peca com a caixa de colisao dela
      // livre. Duas coisas cairam de gracas dessa arrumacao: as quatro
      // pecas de piso ficam longe do vao da porta (que cai em x local
      // +0.6) e nenhuma delas fica na frente de outra.
      //
      // A planta que sai destes numeros (vista de cima, x local de -3.85 a
      // +3.85, parede de FUNDO em z = -4.8, porta na parede de ENTRADA):
      //
      //   FUNDO   [privada][ pia ][toalha]   [ BOX ]
      //                    (espelheira em
      //                     cima da pia)
      //
      //   ENTRADA        [porta]                [cesto]
      //
      // Duas delas ficam PENDURADAS NA PAREDE pelo campo novo
      // `elevation` (ver o bloco de mobilia em
      // scenes/side-room-scene.js): a espelheira e a toalha. Elas sao as
      // duas primeiras pecas do jogo que nao nascem no chao.
      //
      // Feito para ser mexido: o Editor (botao EDITOR do menu inicial)
      // move, gira e escala qualquer uma das seis, e o que ele salvar vale
      // por cima destes numeros sem tocar em nenhum arquivo - ver
      // editor/README.md.

      // A PRIVADA, no canto do fundo a esquerda - o mais longe da porta.
      // Encosta nas duas paredes do canto, com a caixa de descarga contra
      // a parede do fundo. No mundo: x = 7.55, z = -19.23.
      //
      //   rotationY: 0 = a peca nasce com a frente em +Z (ver
      //   models/toilet-factory.js) e, na parede do FUNDO, o interior do
      //   comodo fica em +Z: sem giro nenhum o vaso ja olha para dentro do
      //   banheiro. Mesmo caso do fogao e do botijao da COZINHA (os cantos
      //   da ENTRADA e que precisam do meio giro).
      toilets: [
        {
          id: "privada-banheiro",
          corner: "fundo-esquerda",
          rotationY: 0,
        },
      ],

      // A PIA DE COLUNA, na MESMA parede do fundo, ancorada no canto da
      // privada e deslizando 0.9 para o lado pelo campo `wallOffset` (a
      // mesma tecnica da pia e da prateleira da COZINHA). Ficam 50 cm
      // visiveis entre ela e a privada - pia do lado da privada, na mesma
      // parede, e como um banheiro pequeno e montado de verdade. No mundo:
      // x = 7.56, z = -18.30.
      bathroomSinks: [
        {
          id: "pia-banheiro",
          corner: "fundo-esquerda",
          wallOffset: 0.9,
          rotationY: 0,
        },
      ],

      // A ESPELHEIRA, PENDURADA em cima da pia: mesmo canto, mesma parede
      // e `elevation` 1.15 (a borda da cuba fica em 0.85, ver
      // models/bathroom-sink-factory.js - sobram 30 cm entre as duas, e o
      // topo da espelheira para em 1.95 do piso, com o olho do jogador em
      // 1.6). No mundo: x = 7.69, z = -18.31.
      //
      //   wallOffset 0.82, e nao 0.9 como a pia: o encosto no canto conta
      //   a meia-largura da PROPRIA peca (ver o bloco de mobilia em
      //   scenes/side-room-scene.js), e a espelheira e 15 cm mais larga
      //   que a pia. Os 8 cm de diferenca sao exatamente o que centraliza
      //   uma em cima da outra (sobra 2 mm de arredondamento, invisivel).
      mirrorCabinets: [
        {
          id: "espelheira-banheiro",
          corner: "fundo-esquerda",
          wallOffset: 0.82,
          elevation: 1.15,
          rotationY: 0,
        },
      ],

      // A TOALHA, tambem PENDURADA, na parede do fundo entre a pia e o
      // box - ancorada no canto do fundo a direita e deslizando 1.45 para
      // o lado. `elevation` 0.6 deixa a ponta de cima dela em 1.55 do
      // piso, que e a altura de um toalheiro de verdade (1.50 a 1.60), com
      // a barra logo acima da linha do olho do jogador. Fica a um passo do
      // box, que e onde toalheiro de banheiro vive. No mundo: x = 7.66,
      // z = -13.40.
      towels: [
        {
          id: "toalha-banheiro",
          corner: "fundo-direita",
          wallOffset: 1.45,
          elevation: 0.6,
          rotationY: 0,
        },
      ],

      // O BOX DE CHUVEIRO, no canto do fundo a direita - o outro canto
      // longe da porta, e o unico com espaco para uma peca de 1 m de
      // largura por 82 cm de fundo e 2 m de altura. Encosta nas duas
      // paredes do canto, do jeito que um box e instalado. Sobram 45 cm
      // entre ele e a toalha ao lado. No mundo: x = 7.37, z = -12.27.
      //
      //   rotationY: 0 = frente (o lado aberto) em +Z, o interior do
      //   comodo, como as outras pecas da parede do fundo. Ver o bloco
      //   "a unica peca cuja identidade foi DEDUZIDA" em
      //   models/shower-box-factory.js: o pacote deste modelo veio
      //   chamado so de "banheiro", e box de chuveiro e a leitura da
      //   textura (piso azulejado com ralo) e das proporcoes.
      showerBoxes: [
        {
          id: "box-chuveiro-banheiro",
          corner: "fundo-direita",
          rotationY: 0,
        },
      ],

      // O CESTO DE ROUPA, no canto da ENTRADA a direita - atras da porta,
      // do lado oposto ao vao (que cai em x local +0.6, com o cesto
      // encostando perto de +3.6). E o canto que sobra, e tambem onde um
      // cesto de roupa fica: fora do caminho. No mundo: x = 3.47,
      // z = -12.00.
      //
      //   rotationY: Math.PI = nos cantos da parede de ENTRADA o interior
      //   do comodo fica em -Z, entao sem o meio giro a frente da peca
      //   olharia para a parede (mesma convencao da geladeira e da mesa de
      //   frutas da COZINHA). Num cesto de base redonda isso e quase
      //   cosmetico, mas mantem a regra dos cantos de entrada valendo para
      //   todo mundo.
      laundryBaskets: [
        {
          id: "cesto-roupa-banheiro",
          corner: "entrada-direita",
          rotationY: Math.PI,
        },
      ],
    },
  ],

  // Ligacoes fisicas entre zonas. Cada uma e uma porta que EXISTE no
  // corredor desde sempre e que agora e a passagem real entre os dois
  // ambientes (uma porta so, uma folha so, servindo de divisoria para
  // os dois lados: nada de porta do corredor + porta do comodo
  // duplicadas).
  //
  //   CORREDOR -> PORTA -> COMODO
  //
  // `doorId` e o id dessa porta em CorridorConfig.doors. A espessura da
  // divisoria vem da propria moldura da porta (DoorFactory.FRAME_DEPTH),
  // entao o vao fica forrado por ela dos dois lados, sem fresta.
  connections: [
    {
      doorId: "meu-quarto",
      from: "corredor",
      fromWall: "end_a",
      to: "quarto",
    },
    {
      doorId: "quarto-01",
      from: "corredor",
      fromWall: "left",
      to: "quarto-01",
    },
    {
      doorId: "quarto-02",
      from: "corredor",
      fromWall: "left",
      to: "quarto-02",
    },
    {
      doorId: "cozinha",
      from: "corredor",
      fromWall: "right",
      to: "cozinha",
    },
    {
      doorId: "banheiro",
      from: "corredor",
      fromWall: "right",
      to: "banheiro",
    },
  ],
};
