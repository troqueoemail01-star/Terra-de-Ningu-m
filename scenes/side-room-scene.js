/**
 * scenes/side-room-scene.js
 * -------------------------------------------------
 * Monta UM dos quatro comodos novos da casa (QUARTO 01, QUARTO 02,
 * COZINHA e BANHEIRO) - a "caixa arquitetonica" pedida na expansao da
 * casa: piso, paredes, teto, o vao da porta que liga o comodo ao
 * corredor e a colisao de tudo isso. Nenhuma luz nova e nenhuma
 * mecanica nova continuam valendo aqui: estrutura, e nada mais.
 *
 * A UNICA coisa que entrou depois foi MOBILIA DECORATIVA, e so onde os
 * dados pedem: o comodo que declarar `stoves`, `gasCylinders`,
 * `fridges`, `fruitTables`, `sinkCabinets`, `shelves`, `microwaves`,
 * `clayFilters`, `bottleGlasses` ou `portableRadios` em
 * HouseConfig.sideRooms ganha, respectivamente, um
 * fogao (models/stove-factory.js), um botijao de gas
 * (models/gas-cylinder-factory.js), uma geladeira
 * (models/fridge-factory.js), uma mesa com frutas
 * (models/fruit-table-factory.js), uma pia com armario
 * (models/sink-cabinet-factory.js), uma prateleira
 * (models/shelf-factory.js), um microondas
 * (models/microwave-factory.js), um filtro de barro
 * (models/clay-filter-factory.js), uma garrafa com copo
 * (models/bottle-glass-factory.js) e um radio portatil
 * (models/portable-radio-factory.js) encostados numa parede - hoje so a
 * COZINHA declara as dez coisas. Ver o bloco Mobilia decorativa mais
 * abaixo: e UM bloco para as dez pecas, porque do ponto de vista do
 * comodo elas sao a mesma coisa (objeto apoiado no chao, encostado numa
 * parede). As dez entram na colisao do comodo e NAO em
 * `interactables`: e cenario, nao interativo. Comodo sem esses dados
 * continua exatamente como antes, sem nenhum movel.
 *
 * ---------- Os SEIS moveis do BANHEIRO ----------
 * O BANHEIRO era o ultimo dos quatro comodos ainda vazio, e nesta
 * atualizacao ele ganhou seis pecas decorativas, TODAS pelo caminho que
 * este arquivo ja tinha: uma linha em FLOOR_PROPS (abaixo) e uma lista
 * nos dados da planta - `toilets` (models/toilet-factory.js),
 * `bathroomSinks` (models/bathroom-sink-factory.js), `mirrorCabinets`
 * (models/mirror-cabinet-factory.js), `towels` (models/towel-factory.js),
 * `showerBoxes` (models/shower-box-factory.js) e `laundryBaskets`
 * (models/laundry-basket-factory.js). Nenhum bloco novo de montagem,
 * nenhum caso especial por comodo: para a cena as dezesseis listas sao a
 * mesma coisa.
 *
 * A UNICA coisa que a cena ganhou de verdade foi um campo OPCIONAL nos
 * dados de mobilia: `elevation`, quantos metros a peca sobe a partir do
 * piso. Existe porque duas das seis pecas do BANHEIRO ficam PENDURADAS NA
 * PAREDE (a espelheira e a toalha), e ate agora todo movel importado
 * nascia no chao. E um termo somado ao Y, a mesma ideia do `wallOffset`
 * (que e um termo somado ao X): encosto, colisao e avisos continuam
 * saindo da mesma conta, e quem nao declara `elevation` nao muda um
 * milimetro - por isso as dez pecas da COZINHA seguem identicas.
 *
 * UM arquivo para os QUATRO comodos de proposito: eles sao
 * geometricamente iguais (mudam o lado do corredor, a posicao ao longo
 * dele e a porta a que se ligam), entao quatro copias de room-scene.js
 * seriam quatro lugares para o mesmo bug. Os dados de cada um sao
 * puros e moram em `HouseConfig.sideRooms` (ver scenes/house-config.js).
 *
 * ---------- O que a atualizacao da COZINHA acrescentou ----------
 * Tres coisas, todas OPCIONAIS e ligadas por DADO em
 * HouseConfig.sideRooms - por isso os outros tres comodos nao mudaram
 * uma linha:
 *
 *  - `loweredCeiling`: um SEGUNDO teto, mais baixo, por baixo do que ja
 *    existia (o antigo continua intacto, no mesmo lugar, com o mesmo
 *    material) - ver o bloco "Teto rebaixado" dentro de build();
 *  - `wallStyle`: de qual par de materiais as paredes de DENTRO saem -
 *    ver a tabela WALL_STYLES logo abaixo. A COZINHA passou a usar
 *    azulejo; quem nao declara nada segue com o lambri claro de sempre;
 *  - `rugs`: tapete decorativo apoiado no piso, construido pela MESMA
 *    CarpetFactory dos outros dois tapetes do jogo. Nao entra na
 *    colisao (e uma lamina de 1.2 cm), so troca o som do passo para
 *    "tapete".
 *
 * ---------- O que a atualizacao do BANHEIRO acrescentou ----------
 * Uma coisa nova e OPCIONAL, ligada por DADO como todo o resto (por isso
 * QUARTO 01, QUARTO 02 e COZINHA nao mudaram uma linha):
 *
 *  - `partitions`: DIVISORIAS INTERNAS, paredes novas por dentro do
 *    comodo para diminuir a area util dele sem reescrever `length`,
 *    `depth` ou qualquer numero da caixa antiga - ver o bloco
 *    "Divisorias internas" dentro de build(). Mesma filosofia do
 *    `loweredCeiling`: o que existia continua inteiro, no mesmo lugar, e
 *    o que entra e uma camada nova por dentro.
 *
 * O BANHEIRO tambem passou a usar dois campos que a COZINHA ja tinha
 * (`loweredCeiling` e `wallStyle`, este ultimo com o azulejo florido novo
 * do comodo) e um `rugs` com o campo `style`, o tapete de banho - nada
 * disso pediu codigo novo aqui. *
 * ---------- Mesmo contrato das outras zonas ----------
 * Este arquivo segue exatamente a mesma regra de borda de
 * scenes/room-scene.js:
 *
 *  - por DENTRO tudo e escrito nas coordenadas DO COMODO: a parede de
 *    entrada em z = 0 (o plano da parede do corredor), o interior
 *    crescendo para -Z e a largura ao longo de X, centrada em 0;
 *  - o que sai daqui para o resto do jogo sai em coordenadas do MUNDO
 *    (`solids`, `getSurfaceAt`, `bounds`), convertido de uma vez pelo
 *    transform da zona (ver scripts/house-world.js).
 *
 * ---------- Onde cada comodo fica (derivado, nao escrito a mao) ----------
 * O `placement` NAO esta escrito em HouseConfig como o do MEU QUARTO:
 * ele e DERIVADO do corredor e da porta a que o comodo se liga (ver
 * `resolve` abaixo). Motivo: a posicao depende da espessura da
 * divisoria, que e a propria moldura da porta
 * (DoorFactory.FRAME_DEPTH) - dado de modelo, nao de planta. Derivar
 * garante que porta, vao recortado, parede e colisao nunca discordem,
 * mesmo que a porta mude de tamanho um dia.
 *
 *   rotationY = +90 graus  -> comodo do lado ESQUERDO do corredor
 *                             (interior crescendo para -X do mundo)
 *   rotationY = -90 graus  -> comodo do lado DIREITO
 *                             (interior crescendo para +X do mundo)
 *
 * Os dois sao multiplos de 90 graus, entao as caixas de colisao (AABB
 * em X/Z) continuam EXATAS ao virar coordenadas de mundo.
 *
 * ---------- A porta e a passagem ----------
 * A porta em si NAO e construida aqui: ela e a mesma porta que sempre
 * existiu no corredor (ver `passages` em scenes/corridor-config.js e o
 * bloco "Portas" em scenes/corridor-scene.js), agora servindo de
 * divisoria fisica para os dois lados - exatamente o que a porta
 * "MEU QUARTO" ja fazia. Daqui sai apenas o VAO correspondente,
 * recortado de verdade na parede de entrada, no mesmo X em que a porta
 * esta no corredor.
 * -------------------------------------------------
 */

window.SideRoomScene = (function () {
  // Mesma espessura de parede do corredor e do MEU QUARTO.
  const WALL_THICKNESS = 0.3;
  // Espessura da COLISAO das divisorias internas (ver o bloco
  // "Divisorias internas" dentro de build()). A parede em si e um plano
  // sem espessura, como as quatro paredes do comodo; este numero e so a
  // caixa que barra o jogador, centrada no plano. Bem mais fina que
  // WALL_THICKNESS de proposito: uma divisoria nao e parede de fora, e
  // uma caixa grossa demais roubaria area util do comodo justo do lado em
  // que se anda.
  const PARTITION_COLLISION = 0.16;

  // Multiplica o U de uma geometria (o eixo horizontal da textura).
  // Usado pelas divisorias internas: com ele a mesma textura de parede do
  // comodo sai na MESMA escala em metros numa parede de outro tamanho,
  // sem gerar textura nem material novo. Irmao do flipGeometryU de
  // models/carpet-factory.js.
  function scaleGeometryU(geometry, scale) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, uv.getX(i) * scale);
    }
    uv.needsUpdate = true;
    return geometry;
  }


  // O piso destes comodos nasce 2 cm acima do zero, e nao no zero como
  // o do corredor/quarto. Motivo concreto: os comodos da DIREITA ficam
  // por cima do "remendo" de chao externo daquela fachada (um plano de
  // grama em y = 0 que se estende 30 unidades para cada lado da janela
  // do corredor, ver models/exterior-factory.js). Dois planos
  // coplanares em y = 0 brigariam por profundidade e o piso do comodo
  // piscaria com a grama - o mesmo tipo de empate que ja mordeu o
  // tapete do corredor (ver materials/material-library.js). 2 cm
  // resolvem por construcao, sem polygonOffset e sem degrau visivel:
  // a camera do jogador fica presa em eyeHeight (1.6), entao a altura
  // do piso nao entra em conta nenhuma de jogo.
  const FLOOR_LIFT = 0.02;

  // Espessura da divisoria entre o corredor e o comodo: a mesma do
  // MEU QUARTO (a propria moldura da porta forra o vao dos dois
  // lados). Lida de DoorFactory para os dois lados nunca discordarem.
  function entryInset() {
    // CORRECAO (portas dentro da parede): tem de ser a espessura da
    // DIVISORIA (moldura + a folga de 2 cm de cada lado), nao a
    // profundidade crua da moldura. O corredor centra a moldura nesta
    // mesma espessura (ver PARTITION_DEPTH em scenes/corridor-scene.js),
    // entao recuar so FRAME_DEPTH punha este plano de parede 2 cm DENTRO
    // da madeira: vista de dentro do comodo, a porta ficava cortada/
    // enterrada na parede. Com PARTITION_DEPTH os dois planos caem nas
    // pontas da divisoria e a moldura forra o vao dos dois lados, sem
    // fresta e sem interseccao.
    return window.DoorFactory.PARTITION_DEPTH;
  }

  // ---------- Mobilia decorativa dos comodos ----------
  // Cada entrada liga uma LISTA de dados da planta
  // (HouseConfig.sideRooms) a fabrica que constroi a peca. As dez sao
  // montadas pelo MESMO bloco dentro de build() (ver Mobilia decorativa)
  // porque, do ponto de vista do comodo, fogao, botijao, geladeira, mesa,
  // pia, prateleira, microondas, filtro de barro, garrafa com copo e
  // radio portatil sao a mesma coisa: um
  // objeto apoiado no chao, encostado num
  // canto, que entra na colisao e nao em `interactables`. Peca
  // decorativa nova = mais uma linha aqui + a lista nos dados, e nao
  // mais um bloco de posicionamento para manter em dia (mesmo motivo de
  // existir UM arquivo para os quatro comodos, ver o topo) - a geladeira
  // (terceira peca), a mesa de frutas (quarta), a prateleira (sexta), o
  // microondas (setima), o filtro de barro (oitava), a garrafa com copo
  // (nona) e o radio portatil (decima) foram exatamente
  // isso: uma linha aqui e uma lista em HouseConfig, sem tocar em
  // build().
  //
  // `create` e chamada na hora de montar, nunca aqui: as fabricas moram
  // em window e sao carregadas por <script> em index.html, entao ler
  // window.StoveFactory na definicao deste array dependeria da ordem de
  // carregamento. Se a fabrica nao estiver la, `create` devolve null e o
  // comodo e montado sem a peca - o boot nunca cai por causa de
  // mobilia.
  const FLOOR_PROPS = [
    {
      dataKey: "stoves",
      label: "fogao",
      create: function () {
        return window.StoveFactory ? window.StoveFactory.createStove() : null;
      },
    },
    {
      dataKey: "gasCylinders",
      label: "botijao de gas",
      create: function () {
        return window.GasCylinderFactory
          ? window.GasCylinderFactory.createGasCylinder()
          : null;
      },
    },
    {
      dataKey: "fridges",
      label: "geladeira",
      create: function () {
        return window.FridgeFactory ? window.FridgeFactory.createFridge() : null;
      },
    },
    {
      dataKey: "fruitTables",
      label: "mesa de frutas",
      create: function () {
        return window.FruitTableFactory
          ? window.FruitTableFactory.createFruitTable()
          : null;
      },
    },
    {
      dataKey: "sinkCabinets",
      label: "pia com armario",
      create: function () {
        return window.SinkCabinetFactory
          ? window.SinkCabinetFactory.createSinkCabinet()
          : null;
      },
    },
    {
      dataKey: "shelves",
      label: "prateleira",
      create: function () {
        return window.ShelfFactory ? window.ShelfFactory.createShelf() : null;
      },
    },
    {
      dataKey: "microwaves",
      label: "microondas",
      create: function () {
        return window.MicrowaveFactory
          ? window.MicrowaveFactory.createMicrowave()
          : null;
      },
    },
    {
      dataKey: "clayFilters",
      label: "filtro de barro",
      create: function () {
        return window.ClayFilterFactory
          ? window.ClayFilterFactory.createClayFilter()
          : null;
      },
    },
    {
      dataKey: "bottleGlasses",
      label: "garrafa com copo",
      create: function () {
        return window.BottleGlassFactory
          ? window.BottleGlassFactory.createBottleGlass()
          : null;
      },
    },
    {
      // CUIDADO com o nome: a fabrica do radio da COZINHA e
      // PortableRadioFactory (ver models/portable-radio-factory.js).
      // `window.RadioFactory` e OUTRA peca - o radio de mao que fica na
      // mesinha de TV do MEU QUARTO (ver models/radio-factory.js e
      // scenes/room-scene.js), que nao tem nada a ver com este comodo.
      dataKey: "portableRadios",
      label: "radio portatil",
      create: function () {
        return window.PortableRadioFactory
          ? window.PortableRadioFactory.createPortableRadio()
          : null;
      },
    },
    // ---------- As seis pecas do BANHEIRO ----------
    // Mesmo contrato das dez de cima: `dataKey` e a lista nos dados da
    // planta, `label` e o nome que aparece nos avisos de console e
    // `create` chama a fabrica na hora de montar (nunca aqui, ver o
    // comentario acima).
    {
      // CUIDADO com o nome: SinkCabinetFactory (mais acima) e OUTRA peca,
      // a pia com armario da COZINHA. Esta e a pia de coluna do BANHEIRO
      // (ver models/bathroom-sink-factory.js).
      dataKey: "bathroomSinks",
      label: "pia do banheiro",
      create: function () {
        return window.BathroomSinkFactory
          ? window.BathroomSinkFactory.createBathroomSink()
          : null;
      },
    },
    {
      dataKey: "toilets",
      label: "privada",
      create: function () {
        return window.ToiletFactory ? window.ToiletFactory.createToilet() : null;
      },
    },
    {
      // Peca PENDURADA: os dados dela usam `elevation` (ver o bloco de
      // mobilia dentro de build()).
      dataKey: "mirrorCabinets",
      label: "espelheira",
      create: function () {
        return window.MirrorCabinetFactory
          ? window.MirrorCabinetFactory.createMirrorCabinet()
          : null;
      },
    },
    {
      // Peca PENDURADA, como a espelheira.
      dataKey: "towels",
      label: "toalha",
      create: function () {
        return window.TowelFactory ? window.TowelFactory.createTowel() : null;
      },
    },
    {
      dataKey: "showerBoxes",
      label: "box de chuveiro",
      create: function () {
        return window.ShowerBoxFactory
          ? window.ShowerBoxFactory.createShowerBox()
          : null;
      },
    },
    {
      dataKey: "laundryBaskets",
      label: "cesto de roupa",
      create: function () {
        return window.LaundryBasketFactory
          ? window.LaundryBasketFactory.createLaundryBasket()
          : null;
      },
    },
  ];

  // ---------- Estilo de parede de cada comodo ----------
  // De qual PAR de materiais as paredes de dentro de um comodo saem.
  // Existe porque a COZINHA passou a ter azulejo (pedido do jogador, a
  // partir da imagem de referencia) e os outros tres comodos NAO podiam
  // mudar - e a mesma ideia da tabela CORNERS logo abaixo: uma tabela de
  // dados no lugar de um `if (info.key === "cozinha")` cravado no meio da
  // construcao, que e justo o tipo de caso especial que este arquivo
  // evita por existir (um arquivo para os quatro comodos).
  //
  //   long  : material das duas paredes COMPRIDAS (entrada e fundo, 7.7)
  //   short : material das duas paredes CURTAS (laterais, 4.8)
  //
  // Os dois nomes sao chaves da biblioteca de materiais (ver
  // materials/material-library.js). Comodo que nao declarar `wallStyle`
  // nos dados da planta cai no estilo padrao, o lambri claro de sempre:
  // por isso QUARTO 01, QUARTO 02 e BANHEIRO seguem identicos.
  const WALL_STYLES = {
    "lambri-claro": { long: "sideRoomWallLong", short: "sideRoomWallShort" },
    "azulejo-cozinha": { long: "kitchenWallLong", short: "kitchenWallShort" },
    "azulejo-banheiro": {
      long: "bathroomWallLong",
      short: "bathroomWallShort",
    },
  };

  const DEFAULT_WALL_STYLE = "lambri-claro";

  // Estilo de PISO: gemea de WALL_STYLES. So o BANHEIRO declara
  // floorStyle (ceramica); os outros seguem na madeira do corredor.
  const FLOOR_STYLES = {
    "madeira-corredor": "sideRoomFloor",
    "ceramica-banheiro": "bathroomFloor",
  };

  const DEFAULT_FLOOR_STYLE = "madeira-corredor";

  // ---------- Os cantos em que uma peca de mobilia pode encostar ----------
  // O `corner` de cada peca (ver os dados em HouseConfig.sideRooms) sai
  // desta tabela, e nao de uma cadeia de `if`: cada canto diz apenas de
  // qual PAREDE de cada eixo ele encosta, e o bloco de mobilia dentro de
  // build() faz a conta uma vez so, para qualquer peca.
  //
  //   x: "esquerda" -> parede lateral em x = -length/2 (o leftWall)
  //      "direita"  -> parede lateral em x = +length/2 (o rightWall)
  //   z: "fundo"    -> parede oposta a porta, em z = -depth
  //      "entrada"  -> a parede da PORTA, em z = -inset (ver
  //                    entryInset(): o plano dela recua a espessura da
  //                    divisoria para dentro do comodo)
  //
  // Os dois cantos da parede de ENTRADA entraram junto com a GELADEIRA:
  // os dois do fundo ja estavam ocupados (fogao na esquerda, botijao na
  // direita) e por a geladeira em cima de um deles sobreporia as pecas e
  // as caixas de colisao. Nenhum caso especial por peca: qualquer
  // mobilia pode usar qualquer um dos quatro cantos. Com a MESA DE FRUTAS
  // em entrada-direita a COZINHA passou a ocupar os quatro.
  //
  // A quinta peca (a PIA COM ARMARIO) foi exatamente o que este
  // comentario previa: em vez de inventar um canto que nao existe, ela
  // usa um canto como ANCORA e desliza ao longo da parede - o campo
  // opcional `wallOffset` nos dados do comodo (ver o bloco de mobilia
  // dentro de build()). Continua tudo na mesma tabela e na mesma conta:
  // `wallOffset` e so um termo somado ao X, entao encosto, colisao e o
  // aviso de "peca na frente da passagem" seguem valendo sem nenhum caso
  // especial. Peca nova encostada numa parede = uma linha em FLOOR_PROPS
  // e uma lista nos dados, como sempre.
  //
  // A parede de entrada e a que tem a porta, entao uma peca encostada num
  // canto dela PODE, em teoria, invadir o vao. Nao acontece em nenhum
  // comodo de hoje (o vao fica no meio da parede e as pecas nos cantos),
  // e o bloco de mobilia avisa no console se um dia acontecer.
  const CORNERS = {
    "fundo-esquerda": { x: "esquerda", z: "fundo" },
    "fundo-direita": { x: "direita", z: "fundo" },
    "entrada-esquerda": { x: "esquerda", z: "entrada" },
    "entrada-direita": { x: "direita", z: "entrada" },
  };

  function doorDefFor(corridorConfig, doorId) {
    const doors = (corridorConfig && corridorConfig.doors) || [];
    for (let i = 0; i < doors.length; i++) {
      if (doors[i].id === doorId) {
        return doors[i];
      }
    }
    return null;
  }

  /**
   * Traduz os dados puros de um comodo (HouseConfig.sideRooms) para os
   * numeros de que a construcao precisa. Sem efeito colateral nenhum:
   * o corredor tambem chama isto (ver `footprints`) para saber onde os
   * comodos ficam e manter a vegetacao fora deles.
   */
  function resolve(room, corridorConfig) {
    const cfg = corridorConfig || window.CorridorConfig;
    const halfW = cfg.width / 2;
    const left = room.side === "left";
    const door = doorDefFor(cfg, room.doorId);
    // Posicao da porta ao longo do corredor (Z do mundo). Sem porta
    // encontrada, o comodo cai centrado no proprio centro dele - assim
    // um id errado nunca derruba o boot.
    const doorZ =
      door && typeof door.offset === "number" ? door.offset : room.center;

    return {
      key: room.key,
      label: room.label,
      side: room.side,
      doorId: room.doorId,
      length: room.length,
      depth: room.depth,
      height: cfg.height,
      doorZ: doorZ,
      // O plano da parede de entrada do comodo cai EXATAMENTE sobre o
      // plano da parede lateral do corredor (x = +-halfW): e a mesma
      // divisoria, vista dos dois lados.
      placement: {
        x: left ? -halfW : halfW,
        z: room.center,
        rotationY: left ? Math.PI / 2 : -Math.PI / 2,
      },
      // X LOCAL do vao da porta dentro da parede de entrada. Sai da
      // propria conversao da zona: para o lado esquerdo
      // (rotationY = +90) o mundo le z = -x + centro; para o direito
      // (-90), z = x + centro.
      doorLocalX: left ? room.center - doorZ : doorZ - room.center,
    };
  }

  /**
   * Retangulos (em coordenadas do MUNDO) que os quatro comodos ocupam,
   * paredes inclusas. Usado por scenes/corridor-scene.js para manter
   * grama, arvores e neblina FORA da construcao nova - ver
   * `exclusions` nas tres fabricas da vista externa.
   */
  function footprints(corridorConfig) {
    const cfg = corridorConfig || window.CorridorConfig;
    const halfW = cfg.width / 2;
    const rooms = (window.HouseConfig && window.HouseConfig.sideRooms) || [];

    return rooms.map(function (room) {
      const info = resolve(room, cfg);
      const outer = halfW + info.depth + WALL_THICKNESS;
      const halfLen = info.length / 2 + WALL_THICKNESS / 2;
      const left = room.side === "left";
      return {
        key: info.key,
        minX: left ? -outer : halfW,
        maxX: left ? -halfW : outer,
        minZ: room.center - halfLen,
        maxZ: room.center + halfLen,
      };
    });
  }

  /**
   * Monta um comodo. `materials` e a mesma biblioteca de sempre (ver
   * materials/material-library.js): piso e teto na MESMA madeira do
   * corredor e paredes na MESMA textura do MEU QUARTO, so recalculadas
   * para o tamanho destes comodos - nenhuma textura nova.
   */
  function build(room, materials, options) {
    const opts = options || {};
    const cfg = opts.corridorConfig || window.CorridorConfig;
    const info = resolve(room, cfg);
    const transform = window.HouseWorld.createTransform(info.placement);

    const root = new THREE.Group();
    root.position.set(info.placement.x, 0, info.placement.z);
    root.rotation.y = info.placement.rotationY;

    const solids = [];
    const interactables = [];
    const frameUpdaters = [];
    const half = info.length / 2;
    const depth = info.depth;
    const height = info.height;
    const inset = entryInset();

    const doorwayWidth = window.DoorFactory.OPENING_WIDTH;
    const doorwayHeight = window.DoorFactory.OPENING_HEIGHT;
    const doorX = info.doorLocalX;
    // Meia-largura do vao. Usada em dois lugares: pelo bloco de mobilia
    // (para avisar se uma peca encostada num canto da parede de ENTRADA
    // cair na frente da passagem) e pelos dois solidos da parede de
    // entrada, mais abaixo.
    const passHalf = doorwayWidth / 2;

    // ---------- Materiais das paredes deste comodo ----------
    // Ver WALL_STYLES no topo do arquivo. Estilo desconhecido (erro de
    // digitacao nos dados) avisa e cai no padrao, em vez de montar o
    // comodo sem parede nenhuma; material que falte na biblioteca cai no
    // lambri de sempre pelo mesmo motivo.
    const wallStyleKey = room.wallStyle || DEFAULT_WALL_STYLE;
    const wallStyle = WALL_STYLES[wallStyleKey];
    if (!wallStyle) {
      console.error(
        "SideRoomScene: estilo de parede desconhecido '" +
          wallStyleKey +
          "' em " +
          info.key +
          " - usando '" +
          DEFAULT_WALL_STYLE +
          "'. Estilos validos: " +
          Object.keys(WALL_STYLES).join(", ") +
          "."
      );
    }
    const styleSpec = wallStyle || WALL_STYLES[DEFAULT_WALL_STYLE];
    const wallLongMaterial =
      materials[styleSpec.long] || materials.sideRoomWallLong;
    const wallShortMaterial =
      materials[styleSpec.short] || materials.sideRoomWallShort;

    // ---------- Piso ----------
    // Mesma madeira do chao do corredor (ver materials.sideRoomFloor).
    // Vai de z = 0 (o plano da divisoria) ate z = -depth, ou seja,
    // passa POR BAIXO da divisoria e encosta no piso do corredor: sem
    // degrau, sem buraco e sem piso sobreposto na passagem.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(info.length, depth),
      materials[FLOOR_STYLES[room.floorStyle || DEFAULT_FLOOR_STYLE]] ||
        materials.sideRoomFloor
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, FLOOR_LIFT, -depth / 2);
    root.add(floor);

    // ---------- Soleira da porta ----------
    // CORRECAO (fresta sob as portas de QUARTO 01, QUARTO 02, COZINHA e
    // BANHEIRO): o piso destes comodos nasce FLOOR_LIFT acima do zero
    // (ver comentario da constante, mais acima), mas a porta que liga o
    // comodo ao corredor - construida em scenes/corridor-scene.js, a
    // mesma peca dos dois lados - fica presa no zero do CORREDOR, a
    // mesma referencia do piso dele e do MEU QUARTO. Nada preenchia
    // esses 2 cm entre a base da porta e o piso real do comodo: um vao
    // fino, na largura inteira da porta, por onde dava pra ver o
    // cenario do lado de fora por baixo dela.
    //
    // A correcao e uma soleira de verdade: uma tabua rasa preenchendo
    // esse degrau, do zero do corredor ate um pouco ACIMA do piso do
    // comodo (THRESHOLD_PROUD) - de proposito um pouco alem de
    // FLOOR_LIFT, e nao exatamente nele, para as duas superficies nunca
    // ficarem coplanares e brigarem por profundidade (mesmo tipo de
    // empate que ja mordeu o tapete do corredor, ver
    // materials/material-library.js). Na largura da propria porta
    // (DoorFactory.DOOR_WIDTH, um pouco mais larga que o vao recortado
    // na parede, mesma folga que a folha ja usa sobre o vao) e encaixada
    // na profundidade inteira da divisoria (`inset`), para ficar coberta
    // pela moldura em vez de aparecer como uma tabua solta.
    const THRESHOLD_PROUD = 0.006;
    const thresholdHeight = FLOOR_LIFT + THRESHOLD_PROUD;
    const threshold = new THREE.Mesh(
      new THREE.BoxGeometry(window.DoorFactory.DOOR_WIDTH, thresholdHeight, inset),
      materials.doorCasing
    );
    threshold.position.set(doorX, thresholdHeight / 2, -inset / 2);
    root.add(threshold);

    // ---------- Teto ----------
    // Mesma madeira do teto do corredor, no MESMO pe-direito
    // (cfg.height): a altura do teto atravessa a porta sem emenda.
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(info.length, depth),
      materials.sideRoomCeiling
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, height, -depth / 2);
    root.add(ceiling);

    // ---------- Teto REBAIXADO (opcional) ----------
    // Segundo teto, mais baixo, POR BAIXO do de cima - so no comodo que
    // declarar `loweredCeiling` nos dados da planta (hoje a COZINHA, o
    // BANHEIRO, o QUARTO 01 e o QUARTO 02, ver scenes/house-config.js).
    // Pedido do jogador, o mesmo nos quatro: o comodo parecia grande demais
    // em relacao aos moveis, e a condicao era nao alterar nem quebrar o teto
    // que ja existia. Nada aqui precisou mudar para os dois quartos entrarem
    // nesta atualizacao: e o mesmo caminho de dados, sem caso especial.
    //
    // E exatamente o que acontece aqui: o teto de cima (logo acima) NAO
    // foi tocado - mesma altura, mesmo material, mesma malha. Este e uma
    // camada nova, com o MESMO material de madeira do outro
    // (materials.sideRoomCeiling, cujo repeat ja esta calibrado para
    // estas medidas): as tabuas do forro novo saem no mesmo tamanho das
    // do antigo, entao ninguem le a troca como "outro teto", so como um
    // comodo mais baixo.
    //
    // O vazio entre os dois nao aparece em nenhum angulo de gameplay: as
    // quatro paredes do comodo sobem inteiras ate o pe-direito antigo
    // (nada nelas mudou), o vao da porta termina bem abaixo do forro novo
    // (a checagem de altura minima esta logo abaixo) e por cima da casa
    // fica o telhado. Nao existe fresta.
    //
    // As duas folgas de 2 cm (OVERHANG) enfiam as bordas do forro DENTRO
    // das paredes do fundo e das laterais, para nao sobrar nem um pixel
    // de costura na quina em angulo raso. Do lado da ENTRADA nao ha
    // folga nenhuma de proposito: la o plano do comodo encosta na parede
    // do corredor, e qualquer sobra viraria uma lasca de teto
    // atravessando a parede, visivel do corredor.
    let fixtureCeilingHeight = height;
    const lowered = room.loweredCeiling;
    if (lowered && typeof lowered.height === "number") {
      // Altura minima segura: o alto da MOLDURA da porta (a folha tem
      // DOOR_HEIGHT e a moldura passa FRAME_THICKNESS dela) mais 10 cm.
      // Abaixo disso o forro cortaria a moldura ao meio e abriria um
      // buraco de verdade entre a cozinha e o corredor.
      const doorTop =
        window.DoorFactory.DOOR_HEIGHT + window.DoorFactory.FRAME_THICKNESS;
      const minLowered = doorTop + 0.1;
      const OVERHANG = 0.02;

      let loweredHeight = lowered.height;
      if (loweredHeight >= height) {
        console.warn(
          "SideRoomScene: o teto rebaixado de " +
            info.key +
            " (" +
            loweredHeight +
            ") nao e mais baixo que o pe-direito (" +
            height +
            ") - o comodo ficou sem o forro novo. Ver `loweredCeiling` em " +
            "scenes/house-config.js."
        );
        loweredHeight = null;
      } else if (loweredHeight < minLowered) {
        console.warn(
          "SideRoomScene: o teto rebaixado de " +
            info.key +
            " (" +
            loweredHeight +
            ") cortaria a moldura da porta - subido para " +
            minLowered.toFixed(2) +
            ". Ver `loweredCeiling` em scenes/house-config.js."
        );
        loweredHeight = minLowered;
      }

      if (loweredHeight) {
        const loweredCeiling = new THREE.Mesh(
          new THREE.PlaneGeometry(
            info.length + OVERHANG * 2,
            depth + OVERHANG
          ),
          materials.sideRoomCeiling
        );
        loweredCeiling.rotation.x = Math.PI / 2;
        loweredCeiling.position.set(
          0,
          loweredHeight,
          -(depth + OVERHANG) / 2
        );
        // Nome explicito: e o que da a ele um id estavel e um rotulo
        // legivel no painel do Editor (ver "Identidade dos objetos" em
        // editor/README.md e NAME_LABELS em editor/editor-registry.js),
        // para a altura do forro poder ser afinada com o gizmo sem tocar
        // em codigo.
        loweredCeiling.name = "teto-rebaixado-" + info.key;
        root.add(loweredCeiling);
        fixtureCeilingHeight = loweredHeight;
      }
    }

    // ---------- Parede de entrada (com o vao da porta) ----------
    // Mesma tecnica da parede compartilhada com o MEU QUARTO: o vao e
    // recortado DE VERDADE na parede (nasce no chao e sobe), entao a
    // passagem e uma passagem - da para ver o comodo do corredor e
    // atravessar andando. A parede recua `inset` para dentro do
    // comodo: os dois planos (este e o da parede do corredor) ficam
    // nas duas faces da moldura da porta, que forra o vao dos dois
    // lados - sem fresta, sem borda crua e sem dois planos coplanares
    // brigando por profundidade.
    //
    // CORRECAO (porta bugada DENTRO da parede, na COZINHA e no BANHEIRO):
    // este plano e girado 180 graus em Y logo abaixo (ele precisa encarar
    // o interior do comodo, que cresce para -Z). Um giro de 180 graus em Y
    // INVERTE o X: um vertice desenhado em x = +a acaba em x = -a no
    // espaco do comodo. O vao era recortado em `doorX` (o X LOCAL correto
    // da porta, ver `resolve`) e, depois do giro, terminava em -doorX - ou
    // seja, espelhado para o outro lado do centro da parede.
    //
    // Nos dois comodos da ESQUERDA a porta cai exatamente no centro do
    // comodo (doorX = 0), entao o espelho nao mudava nada e ninguem
    // percebia. Nos dois da DIREITA a porta fica 0.6 fora do centro (eles
    // sao deslocados 0.6 para nao nascerem colados na janela-meu-quarto,
    // ver HouseConfig.sideRooms), e 0.6 espelhado da 1.2 de erro: o vao
    // aparecia 1.2 metro ao lado da porta e a PAREDE do comodo tapava a
    // passagem por dentro - a porta lia como se estivesse embutida na
    // parede, com um buraco solto no lambri ao lado dela.
    //
    // A colisao (mais abaixo) sempre usou `doorX` no espaco do comodo, que
    // e o valor certo - por isso o jogador atravessava a parede fechada.
    // Desenhar em -doorX faz o vao cair, depois do giro, exatamente em
    // doorX: geometria, porta, moldura e colisao voltam a concordar.
    const entryWall = new THREE.Mesh(
      window.ExteriorFactory.buildWallGeometryWithOpenings(
        info.length,
        height,
        [],
        [{ x: -doorX, width: doorwayWidth, height: doorwayHeight }]
      ),
      wallLongMaterial
    );
    entryWall.rotation.y = Math.PI;
    entryWall.position.set(0, height / 2, -inset);
    root.add(entryWall);

    // ---------- Parede oposta ----------
    // ---------- Janelas do cómodo (dado puro, ver `windows` em
    // scenes/house-config.js) ----------
    // Mesma janela do resto do jogo (models/window-factory.js): mesma
    // moldura, mesma cortina interativa, mesmo vidro, mesmo som e agora
    // também o mesmo CLARÃO de relâmpago (ver effects/lightning-storm.js).
    // Nenhuma peça nova entrou no jogo por causa delas.
    //
    //   id      : id estável da janela (o Editor e o InteractionSystem usam).
    //   along   : X local do cómodo (0 = meio da parede de fundo).
    //   centerY : altura do CENTRO da janela. Tem padrão, mas cada cómodo
    //             manda no seu: na COZINHA ela sobe para passar por cima
    //             da bancada, nos quartos ela desce um pouco.
    //
    // Só a parede de FUNDO aceita janela, e isso é de propósito: é a
    // única das quatro que dá para o terreno em toda a sua extensão (a
    // da entrada é divisória com o corredor e as duas laterais encostam
    // no cómodo vizinho ou na fachada de outro).
    const DEFAULT_WINDOW_CENTER_Y = 1.6;
    const windowDefs = (room.windows || []).map(function (def, index) {
      return {
        id: def.id || "janela-" + info.key + "-" + (index + 1),
        along: typeof def.along === "number" ? def.along : 0,
        centerY:
          typeof def.centerY === "number" ? def.centerY : DEFAULT_WINDOW_CENTER_Y,
      };
    });
    const sideWindowBuilts = [];

    // O vão recortado na parede é sempre um pouco menor que a moldura
    // (HOLE_MARGIN), pra madeira cobrir a borda do recorte por completo —
    // a mesma conta do corredor e do MEU QUARTO. Sem janela declarada, a
    // parede sai a MESMA PlaneGeometry cheia de sempre.
    const HOLE_W =
      window.WindowFactory.WINDOW_WIDTH - window.ExteriorFactory.HOLE_MARGIN;
    const HOLE_H =
      window.WindowFactory.WINDOW_HEIGHT - window.ExteriorFactory.HOLE_MARGIN;
    const farWallGeometry = windowDefs.length
      ? window.ExteriorFactory.buildWallGeometryWithHoles(
          info.length,
          height,
          windowDefs.map(function (def) {
            return {
              width: HOLE_W,
              height: HOLE_H,
              x: def.along,
              y: def.centerY - height / 2,
            };
          })
        )
      : new THREE.PlaneGeometry(info.length, height);

    // O revestimento externo desta parede reaproveita ESTA geometria (ver
    // createWallCladding em models/exterior-factory.js), então o vão
    // aparece nos dois lados de graça, sem uma segunda conta.
    const farWall = new THREE.Mesh(farWallGeometry, wallLongMaterial);
    farWall.position.set(0, height / 2, -depth);
    root.add(farWall);

    // ---------- Paredes laterais ----------
    // Material proprio (sideRoomWallShort): a MESMA receita de textura
    // das paredes longas, so com o numero de paineis recalculado para a
    // largura menor - sem isso o lambri sairia esticado nestas duas.
    const sideWallGeo = new THREE.PlaneGeometry(depth, height);

    const leftWall = new THREE.Mesh(sideWallGeo, wallShortMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-half, height / 2, -depth / 2);
    root.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, wallShortMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(half, height / 2, -depth / 2);
    root.add(rightWall);

    // ---------- Divisorias internas (opcional) ----------
    // Paredes NOVAS dentro do comodo, para diminuir a area util dele sem
    // mexer em nada do que ja existia. So o comodo que declarar
    // `partitions` nos dados da planta ganha alguma (hoje so o BANHEIRO,
    // ver scenes/house-config.js) - por isso QUARTO 01, QUARTO 02 e
    // COZINHA nao mudaram uma linha.
    //
    // ---------- Mesma filosofia do teto rebaixado ----------
    // Pedido do jogador: o banheiro estava grande demais. Em vez de
    // reescrever `length`/`depth` do comodo (o que moveria piso, teto,
    // paredes, fachada, vao da porta, colisao e os retangulos que mantem
    // a vegetacao fora da casa - tudo de uma vez), entram paredes por
    // DENTRO: a caixa arquitetonica antiga continua inteira, nos mesmos
    // numeros, e o comodo em que se anda fica menor. Igualzinho ao
    // `loweredCeiling`, que abaixou o pe-direito da COZINHA sem tocar no
    // teto que ja existia.
    //
    // O espaco que sobra atras delas fica LACRADO e nao aparece em angulo
    // nenhum de gameplay: a divisoria sobe do piso ate o pe-direito
    // antigo (a mesma altura das quatro paredes do comodo), o forro
    // rebaixado tampa por cima e o telhado tampa a casa de fora.
    //
    // ---------- Um plano, como as paredes do comodo ----------
    // As quatro paredes daqui sao planos de face dupla, e a divisoria e
    // igual: as duas faces dela sao parede de verdade e ela nao tem canto
    // solto para deixar ver a espessura zero (cada divisoria comeca e
    // termina em outra parede - ver `partitions` nos dados). O que da
    // corpo a ela e a COLISAO, uma caixa de PARTITION_COLLISION centrada
    // no plano (ver a constante no topo do arquivo).
    //
    // ---------- Por que o U da malha e escalado ----------
    // Os materiais de parede do comodo tem o repeat calibrado para as
    // medidas dele (7.7 nas longas, 4.8 nas curtas, ver
    // materials/material-library.js). Numa divisoria de 2.35 m o mesmo
    // material sairia com o azulejo esticado quase o dobro. Em vez de
    // gerar uma textura por divisoria, quem corrige a escala e a PROPRIA
    // MALHA: o U dela e multiplicado por (comprimento / medida de
    // referencia), entao o ladrilho sai do mesmo tamanho em metros que
    // nas paredes do comodo - o mesmo truque que o caminho de terra ja
    // usa (ver dirtPathTex em materials/material-library.js). Zero
    // textura nova, zero material novo.
    //
    // Os dados de cada divisoria (ver `partitions` em
    // scenes/house-config.js):
    //
    //   id   : nome estavel da peca. E o que da a ela um rotulo legivel e
    //          um id fixo no Editor (ver NAME_LABELS em
    //          editor/editor-registry.js), para a parede poder ser movida
    //          com o gizmo sem tocar em codigo.
    //   axis : qual eixo do comodo ela mantem CONSTANTE - ou seja, de que
    //          lado ela olha. "x" = parede em x = `at` correndo ao longo
    //          do Z (paralela as laterais); "z" = parede em z = `at`
    //          correndo ao longo do X (paralela a de entrada e a de
    //          fundo).
    //   at   : a coordenada constante, no espaco do comodo.
    //   from : onde ela comeca, no outro eixo.
    //   to   : onde ela termina, no outro eixo.
    (room.partitions || []).forEach(function (def, index) {
      const axis = def.axis === "z" ? "z" : "x";
      const at = typeof def.at === "number" ? def.at : 0;
      const from = typeof def.from === "number" ? def.from : 0;
      const to = typeof def.to === "number" ? def.to : 0;
      const span = Math.abs(to - from);
      const name = def.id || "divisoria-" + info.key + "-" + (index + 1);

      if (span < 0.05) {
        // Divisoria de comprimento zero (erro nos dados): avisa e segue
        // sem ela, em vez de deixar uma parede invisivel de 5 cm barrando
        // o jogador.
        console.error(
          "SideRoomScene: a divisoria " +
            name +
            " de " +
            info.key +
            " nao tem comprimento (from " +
            from +
            ", to " +
            to +
            ") - reveja `partitions` nos dados do comodo " +
            "(scenes/house-config.js)."
        );
        return;
      }

      // Uma parede em z constante corre ao longo do X, e vice-versa.
      const runsAlongX = axis === "z";
      const material = runsAlongX ? wallLongMaterial : wallShortMaterial;
      const reference = runsAlongX ? info.length : depth;
      const mid = (from + to) / 2;

      const wall = new THREE.Mesh(
        scaleGeometryU(
          new THREE.PlaneGeometry(span, height),
          reference > 0 ? span / reference : 1
        ),
        material
      );
      wall.position.set(
        runsAlongX ? mid : at,
        height / 2,
        runsAlongX ? at : mid
      );
      if (!runsAlongX) {
        wall.rotation.y = Math.PI / 2;
      }
      wall.name = name;
      root.add(wall);

      // Colisao: caixa fina centrada no plano, esticada meia-espessura
      // para cada lado nas duas pontas - e o que faz duas divisorias que
      // se encontram em L fecharem a quina sem deixar o jogador passar
      // pelo vertice.
      const halfT = PARTITION_COLLISION / 2;
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      const box = runsAlongX
        ? {
            minX: lo - halfT,
            maxX: hi + halfT,
            minZ: at - halfT,
            maxZ: at + halfT,
          }
        : {
            minX: at - halfT,
            maxX: at + halfT,
            minZ: lo - halfT,
            maxZ: hi + halfT,
          };
      box.owner = wall;
      solids.push(box);

      // Aviso (nao impede nada) para divisoria passando das paredes do
      // comodo. Mesmo espirito dos avisos da mobilia: melhor descobrir
      // pelo console do que achando uma parede atravessando a fachada.
      if (
        box.minX < -half - 0.001 ||
        box.maxX > half + 0.001 ||
        box.minZ < -depth - 0.001 ||
        box.maxZ > 0.001
      ) {
        console.warn(
          "SideRoomScene: a divisoria " +
            name +
            " passa das paredes de " +
            info.key +
            " - reveja `partitions` nos dados do comodo " +
            "(scenes/house-config.js)."
        );
      }

      // Aviso (nao impede nada) para divisoria em cima da passagem: uma
      // parede nova na frente do vao trancaria o jogador do lado de fora
      // do comodo. A folga de 0.9 e o espaco que a folha da porta precisa
      // para girar (DoorFactory.DOOR_WIDTH, arredondado para cima).
      const doorClearance = 0.9;
      const blocksDoorway = runsAlongX
        ? at > -inset - doorClearance &&
          hi > doorX - passHalf &&
          lo < doorX + passHalf
        : Math.abs(at - doorX) < passHalf + halfT &&
          hi > -inset - doorClearance;
      if (blocksDoorway) {
        console.warn(
          "SideRoomScene: a divisoria " +
            name +
            " de " +
            info.key +
            " esta na frente do vao da porta - reveja `partitions` nos " +
            "dados do comodo (scenes/house-config.js)."
        );
      }
    });

    // ---------- Revestimento externo (a FACHADA do comodo) ----------
    // Mesma coisa que o corredor e o MEU QUARTO fazem (ver o bloco de
    // mesmo nome em scenes/corridor-scene.js): a casca de FORA das
    // paredes que dao para o terreno, com o reboco velho e mofado da
    // fachada - a MESMA geometria da parede, 2 cm para fora. Ver
    // createWallCladding em models/exterior-factory.js.
    //
    // Estes quatro comodos avancam para FORA do corredor, entao tres das
    // quatro paredes de cada um sao fachada: a oposta e as duas
    // laterais. A de ENTRADA nao entra - ela e a divisoria com o
    // corredor.
    //
    // O revestimento de DENTRO (ver WALL_STYLES no topo do arquivo:
    // lambri claro nos tres comodos, azulejo na COZINHA) nao muda em
    // nada por causa deste bloco.
    const claddings = [];
    [
      {
        wall: farWall,
        name: "parede-externa-" + info.key + "-fundo",
        material: materials.wallExteriorSideRoomLong,
        dayMaterial: materials.wallExteriorSideRoomLongDay,
      },
      {
        wall: leftWall,
        name: "parede-externa-" + info.key + "-esquerda",
        material: materials.wallExteriorSideRoomShort,
        dayMaterial: materials.wallExteriorSideRoomShortDay,
      },
      {
        wall: rightWall,
        name: "parede-externa-" + info.key + "-direita",
        material: materials.wallExteriorSideRoomShort,
        dayMaterial: materials.wallExteriorSideRoomShortDay,
      },
    ].forEach(function (spec) {
      if (!spec.material) {
        return;
      }
      const cladding = window.ExteriorFactory.createWallCladding(spec);
      if (!cladding) {
        return;
      }
      root.add(cladding.mesh);
      claddings.push(cladding);
    });

    // ---------- Mobilia decorativa ----------
    // COZINHA: FOGAO, BOTIJAO, GELADEIRA, MESA, PIA, PRATELEIRA,
    // MICROONDAS, FILTRO DE BARRO, GARRAFA COM COPO e RADIO PORTATIL.
    // BANHEIRO: PIA DE COLUNA, PRIVADA, ESPELHEIRA, TOALHA, BOX DE
    // CHUVEIRO e CESTO DE ROUPA (as duas primeiras pecas PENDURADAS do
    // jogo estao aqui: espelheira e toalha, ver `elevation` mais
    // abaixo).
    // Ver FLOOR_PROPS e CORNERS no topo do arquivo,
    // models/stove-factory.js, models/gas-cylinder-factory.js,
    // models/fridge-factory.js, models/fruit-table-factory.js,
    // models/sink-cabinet-factory.js, models/shelf-factory.js,
    // models/microwave-factory.js, models/clay-filter-factory.js,
    // models/bottle-glass-factory.js e
    // models/portable-radio-factory.js. So
    // monta
    // o que o comodo declarar nos dados da planta
    // (HouseConfig.sideRooms) - hoje so a COZINHA declara (`stoves`,
    // `gasCylinders`, `fridges`, `fruitTables`, `sinkCabinets`,
    // `shelves`, `microwaves`, `clayFilters`, `bottleGlasses` e
    // `portableRadios`), e os outros tres comodos
    // continuam vazios sem nenhum caso especial aqui.
    //
    // Pecas puramente decorativas: entram em `solids` (para o jogador
    // nao atravessar o movel andando), mas nao em `interactables` - sem
    // contorno de destaque, sem prompt de "Interagir", sem dialogo, sem
    // animacao, sem som. Mesmo tratamento do criado-mudo/estante/lata de
    // lixo do MEU QUARTO (ver scenes/room-scene.js).
    //
    // Sobre a altura: o Y das pecas e FLOOR_LIFT, nao 0. O piso destes
    // quatro comodos nasce 2 cm acima do zero (ver o comentario da
    // constante, no topo do arquivo) - diferente do MEU QUARTO, onde os
    // moveis podem ficar em y = 0 porque o piso dele esta no zero. Sem
    // isso o movel afundaria esses mesmos 2 cm no chao.
    FLOOR_PROPS.forEach(function (spec) {
      (room[spec.dataKey] || []).forEach(function (def) {
        const corner = def.corner || "fundo-esquerda";
        const cornerSpec = CORNERS[corner];
        if (!cornerSpec) {
          // Canto que nao existe (erro de digitacao nos dados da planta):
          // avisa e segue sem a peca, em vez de montar ela no lugar
          // errado. Ver CORNERS no topo do arquivo para a lista dos
          // quatro.
          console.error(
            "SideRoomScene: canto desconhecido '" +
              corner +
              "' no " +
              spec.label +
              " de " +
              info.key +
              " - a peca nao vai aparecer. Cantos validos: " +
              Object.keys(CORNERS).join(", ") +
              "."
          );
          return;
        }

        const built = spec.create();
        if (!built || !built.group) {
          // Fabrica ausente (ver FLOOR_PROPS): avisa e segue sem a peca.
          console.error(
            "SideRoomScene: a fabrica do " +
              spec.label +
              " nao esta carregada - a peca nao vai aparecer em " +
              info.key +
              ". Confira o <script> dela em index.html."
          );
          return;
        }

        const group = built.group;

        // A peca nasce centralizada na propria base (ver a convencao de
        // espaco local nas fabricas), entao aqui basta decidir o
        // centro (x, z) dela dentro do comodo.
        const rotationY = def.rotationY || 0;

        // Metade do contorno da base JA projetada nos eixos do comodo
        // depois do giro - mesma trigonometria que a caixa de papelao do
        // MEU QUARTO usa (ver scenes/room-scene.js): base retangular,
        // entao cada eixo mede |meia-largura*cos| + |meia-profundidade*sen|
        // (e vice-versa). Com isso o mesmo bloco encosta a peca no canto
        // sem atravessar parede em qualquer angulo, inclusive nos que nao
        // sao multiplos de 90 graus.
        const halfW = built.width / 2;
        const halfD = built.depth / 2;
        const boxHalfX =
          Math.abs(halfW * Math.cos(rotationY)) + Math.abs(halfD * Math.sin(rotationY));
        const boxHalfZ =
          Math.abs(halfW * Math.sin(rotationY)) + Math.abs(halfD * Math.cos(rotationY));

        // Mesma folga de encaixe (0.02) que os moveis do MEU QUARTO usam
        // contra a parede: sem vao visivel entre a peca e o canto, e sem
        // duas superficies coladas brigando por profundidade.
        const wallGap = 0.02;

        // Deslizar ao longo da parede: quantos metros a peca anda a
        // partir do canto, na direcao do CENTRO da parede (sempre positivo,
        // qualquer que seja o canto). Opcional e 0 por padrao, entao as
        // quatro pecas de canto nao mudam um milimetro.
        //
        // Existe porque a COZINHA ficou com os quatro cantos ocupados
        // (fogao, botijao, geladeira e mesa) e a PIA COM ARMARIO precisava
        // de lugar na parede do fundo, ao lado do fogao - como numa cozinha
        // de verdade, pia e fogao na mesma bancada.
        //
        // A PRATELEIRA (sexta peca) veio depois e usa o mesmo campo, do
        // outro lado da mesma parede do fundo, ancorada no canto do
        // botijao - prova de que a ideia se paga: peca nova encostada numa
        // parede nao pediu uma linha de codigo aqui. O MICROONDAS (setima)
        // repetiu a historia: ancorado no canto do fogao, 2.4 m para o
        // lado, na mesma parede do fundo, logo depois da pia - zero linha
        // nova neste bloco. E o FILTRO DE BARRO (oitava) fez o mesmo na
        // parede da ENTRADA: ancorado no canto da geladeira, 1.05 m para
        // o lado - primeira peca a deslizar num canto da parede de
        // entrada, e tambem sem uma linha nova aqui (encosto, colisao e
        // os dois avisos abaixo saem todos da mesma conta). A GARRAFA COM
        // O COPO (nona) e o RADIO PORTATIL (decima) fecharam a conta: a
        // garrafa 50 cm depois do filtro, na mesma parede da entrada, e o
        // radio na parede do FUNDO, ancorado no canto do fogao, logo
        // depois do microondas - as duas sem uma linha nova aqui.
        //
        // E um termo somado ao X e nada mais: o canto continua sendo a
        // ancora (a peca segue encostada na parede que o `corner` manda,
        // com a mesma folga de 2 cm), e a colisao mais abaixo sai do mesmo
        // `x`, entao ela acompanha sozinha.
        //
        // Nao existe versao "deslizar ao longo da parede lateral" (no eixo
        // Z) porque nao ha uso: as paredes compridas destes comodos sao a
        // de fundo e a de entrada. Se um dia precisar, e o mesmo termo
        // somado ao Z aqui embaixo.
        const wallOffset = def.wallOffset || 0;

        // Levantar a peca do piso: quantos metros ela sobe a partir do
        // chao do comodo. Opcional e 0 por padrao, entao as onze pecas
        // que nascem no chao (as dez da COZINHA e o cesto de roupa do
        // BANHEIRO) nao mudam um milimetro.
        //
        // Existe porque o BANHEIRO trouxe as duas primeiras pecas
        // PENDURADAS NA PAREDE do jogo: a espelheira (em cima da pia) e a
        // toalha (no toalheiro). E o mesmo tipo de termo que o
        // `wallOffset` logo acima - la somado ao X, aqui somado ao Y -,
        // entao nao existe caminho de codigo novo: o encosto na parede, a
        // caixa de colisao e os avisos saem todos das mesmas contas.
        //
        // A COLISAO nao muda com a altura de proposito: ela e um AABB em
        // X/Z (ver scripts/collision.js), sem eixo Y, entao uma peca
        // pendurada continua bloqueando a pegada dela no chao. Para as
        // duas do BANHEIRO isso e o certo: a espelheira fica em cima da
        // pia (que ja e solida no mesmo lugar) e ninguem deve conseguir
        // enfiar a cabeca dentro da toalha. Peca pendurada ALTA o
        // suficiente para o jogador passar embaixo pediria um solido com
        // altura - coisa que a colisao do jogo nao tem, e que nao faz
        // falta aqui.
        const elevation = def.elevation || 0;

        // Paredes laterais em x = -half ("esquerda", o leftWall acima) e
        // x = +half ("direita"); parede de FUNDO em z = -depth e parede
        // de ENTRADA no plano recuado da divisoria, z = -inset (a mesma
        // referencia do entryWall, mais acima). De qual das duas cada
        // canto encosta sai de CORNERS, no topo do arquivo.
        const x =
          cornerSpec.x === "esquerda"
            ? -half + wallGap + boxHalfX + wallOffset
            : half - wallGap - boxHalfX - wallOffset;
        const z =
          cornerSpec.z === "fundo"
            ? -depth + wallGap + boxHalfZ
            : -inset - wallGap - boxHalfZ;

        // Aviso (nao impede nada) para `wallOffset` grande demais: a peca
        // atravessaria a parede do outro lado do comodo. Mesmo espirito do
        // aviso do vao da porta, logo abaixo - melhor descobrir pelo
        // console do que caminhando dentro de um movel.
        //
        // O 1 mm de tolerancia e para peca SEM `wallOffset` nunca cair
        // aqui: sem deslocamento a quina dela para exatamente em
        // `half - wallGap`, e comparar float com float na igualdade
        // renderia um aviso falso por arredondamento.
        if (Math.abs(x) + boxHalfX > half - wallGap + 0.001) {
          console.warn(
            "SideRoomScene: o " +
              spec.label +
              " de " +
              info.key +
              " com wallOffset " +
              wallOffset +
              " passa da parede oposta - reveja os dados do comodo " +
              "(scenes/house-config.js)."
          );
        }

        // Aviso (nao impede nada) para o unico jeito de este bloco
        // colocar uma peca em cima de uma passagem: canto da parede de
        // ENTRADA em um comodo cuja porta caia perto da quina. Nao
        // acontece em nenhum comodo de hoje - na COZINHA a porta fica em
        // x local 0.6, a geladeira encosta perto de x = -3.55, o filtro de
        // barro (que desliza na mesma parede) perto de x = -2.63 e a mesa
        // de frutas perto de x = +2.87, com a quina dela parando em
        // x = 1.91 (o vao termina em 1.23) -, mas se a planta mudar um dia
        // e melhor descobrir pelo console do que andando contra um movel
        // invisivel dentro do vao.
        if (
          cornerSpec.z === "entrada" &&
          Math.abs(x - doorX) < passHalf + boxHalfX
        ) {
          console.warn(
            "SideRoomScene: o " +
              spec.label +
              " no canto " +
              corner +
              " de " +
              info.key +
              " esta na frente do vao da porta - reveja o `corner` nos " +
              "dados do comodo (scenes/house-config.js)."
          );
        }

        // Aviso (nao impede nada) para peca pendurada alta demais: com
        // `elevation` grande ela atravessaria o teto do comodo. Mesmo
        // espirito dos dois avisos acima - melhor descobrir pelo console
        // do que achando um movel enterrado no forro. `built.height` vem
        // da fabrica, como `width`/`depth`.
        if (elevation > 0 && elevation + (built.height || 0) > height) {
          console.warn(
            "SideRoomScene: o " +
              spec.label +
              " de " +
              info.key +
              " com elevation " +
              elevation +
              " passa do teto do comodo - reveja os dados do comodo " +
              "(scenes/house-config.js)."
          );
        }

        group.position.set(x, FLOOR_LIFT + elevation, z);
        group.rotation.y = rotationY;
        root.add(group);

        // Colisao: mesma margem (0.05) dos moveis do MEU QUARTO. Entra na
        // MESMA lista das paredes, logo abaixo, e vira coordenada de mundo
        // no mesmo lugar que tudo aqui (ver "Borda: local -> mundo").
        const propMargin = 0.05;
        solids.push({
          owner: group,
          minX: x - boxHalfX - propMargin,
          maxX: x + boxHalfX + propMargin,
          minZ: z - boxHalfZ - propMargin,
          maxZ: z + boxHalfZ + propMargin,
        });
      });
    });

    // ---------- Tapetes ----------
    // So o comodo que declarar `rugs` nos dados da planta ganha um (hoje
    // so a COZINHA, ver scenes/house-config.js). O modelo e
    // models/carpet-factory.js (createStripedRug), a MESMA fabrica dos
    // tapetes do corredor e do MEU QUARTO - nada de sistema novo.
    //
    // Diferente da mobilia, o tapete NAO se encosta num `corner`: ele
    // mora em frente a um movel, nao numa parede, entao a posicao vem
    // escrita nos dados (`x`/`z`, no espaco do comodo). O porque em
    // detalhe esta no comentario dos dados.
    //
    // Tambem NAO entra em `solids`: uma lamina de 1.2 cm nao e obstaculo,
    // o jogador tem de passar por cima andando normalmente. O unico
    // efeito de jogo e o som do passo (ver getSurfaceAt mais abaixo).
    const rugRects = [];

    (room.rugs || []).forEach(function (def) {
      const factory = window.CarpetFactory;
      if (!factory || !factory.createStripedRug) {
        console.error(
          "SideRoomScene: CarpetFactory.createStripedRug nao esta carregada " +
            "- o tapete nao vai aparecer em " +
            info.key +
            ". Confira o <script> de models/carpet-factory.js em index.html."
        );
        return;
      }

      const built = factory.createStripedRug(def, materials);
      if (!built || !built.group) {
        return;
      }

      const rotationY = def.rotationY || 0;
      // Mesma trigonometria da mobilia (ver o bloco acima): meia-pegada
      // ja projetada nos eixos do comodo, para as contas de folga
      // valerem em qualquer angulo, nao so nos multiplos de 90 graus.
      const rugHalfW = built.width / 2;
      const rugHalfD = built.depth / 2;
      const rugHalfX =
        Math.abs(rugHalfW * Math.cos(rotationY)) +
        Math.abs(rugHalfD * Math.sin(rotationY));
      const rugHalfZ =
        Math.abs(rugHalfW * Math.sin(rotationY)) +
        Math.abs(rugHalfD * Math.cos(rotationY));

      const x = typeof def.x === "number" ? def.x : 0;
      const z = typeof def.z === "number" ? def.z : -depth / 2;

      // Y = FLOOR_LIFT: a base do tapete nasce no piso REAL do comodo
      // (que fica 2 cm acima do zero, ver a constante no topo do
      // arquivo), do mesmo jeito que a mobilia. A folga de 3 mm que
      // separa a lamina do piso e por dentro da propria fabrica - aqui
      // nao existe numero magico de altura, e por isso o tapete nao
      // flutua nem afunda.
      built.group.position.set(x, FLOOR_LIFT, z);
      built.group.rotation.y = rotationY;
      // Nome explicito pelo mesmo motivo do teto rebaixado: id estavel e
      // rotulo legivel no Editor, para ajustar posicao/giro/escala com o
      // gizmo sem tocar em codigo (ver editor/README.md).
      built.group.name = def.id || "tapete-" + info.key;
      root.add(built.group);

      // Aviso (nao impede nada) para tapete passando da parede. A franja
      // conta: ela avanca `fringeDepth` alem das duas pontas curtas.
      const reachX = rugHalfX + (built.fringeDepth || 0);
      if (
        x - reachX < -half ||
        x + reachX > half ||
        z - rugHalfZ < -depth ||
        z + rugHalfZ > -inset
      ) {
        console.warn(
          "SideRoomScene: o tapete " +
            built.group.name +
            " passa das paredes de " +
            info.key +
            " - reveja `rugs` nos dados do comodo " +
            "(scenes/house-config.js)."
        );
      }

      // Aviso (nao impede nada) para tapete debaixo de um movel. `solids`
      // aqui tem SO a mobilia (as paredes entram depois), que e
      // exatamente o que interessa: tapete atravessando um armario ou
      // nascendo debaixo da geladeira e o tipo de coisa que se descobre
      // tarde, andando pelo cenario.
      for (let i = 0; i < solids.length; i++) {
        const box = solids[i];
        if (
          x + rugHalfX > box.minX &&
          x - rugHalfX < box.maxX &&
          z + rugHalfZ > box.minZ &&
          z - rugHalfZ < box.maxZ
        ) {
          console.warn(
            "SideRoomScene: o tapete " +
              built.group.name +
              " de " +
              info.key +
              " esta por baixo de um movel - reveja `rugs` nos dados do " +
              "comodo (scenes/house-config.js)."
          );
          break;
        }
      }

      rugRects.push({
        minX: x - rugHalfX,
        maxX: x + rugHalfX,
        minZ: z - rugHalfZ,
        maxZ: z + rugHalfZ,
      });
    });

    // ---------- Objetos de teto e parede ----------
    // Opcional por dados: comodo que nao declara nada continua sem luz e sem
    // interativos. Hoje declaram COZINHA, BANHEIRO, QUARTO 01 e QUARTO 02.
    const wallDefs = {
      entrada: { axis: "z", at: -inset, inward: -1, rotationY: Math.PI },
      fundo: { axis: "z", at: -depth, inward: 1, rotationY: 0 },
      esquerda: { axis: "x", at: -half, inward: 1, rotationY: Math.PI / 2 },
      direita: { axis: "x", at: half, inward: -1, rotationY: -Math.PI / 2 },
    };
    function placeOnWall(group, wallKey, along, y, gap) {
      const wall = wallDefs[wallKey];
      if (!wall) return;
      const normal = wall.at + wall.inward * gap;
      if (wall.axis === "z") group.position.set(along, y, normal);
      else group.position.set(normal, y, along);
      group.rotation.y = wall.rotationY;
    }

    const roomLamps = [];
    (room.ceilingLamps || []).forEach(function (def) {
      const lamp = window.LampFactory.createCeilingLamp(materials);
      lamp.position.set(
        typeof def.x === "number" ? def.x : 0,
        typeof def.height === "number" ? def.height - 0.02 : fixtureCeilingHeight - 0.02,
        typeof def.z === "number" ? def.z : -depth / 2
      );
      root.add(lamp);
      roomLamps.push(lamp);
      if (lamp.update) frameUpdaters.push(lamp.update);
    });

    (room.lightSwitches || []).forEach(function (def) {
      const built = window.SwitchFactory.createSwitch(materials);
      const group = built.group;
      placeOnWall(group, def.wall || "entrada", typeof def.along === "number" ? def.along : 0, typeof def.y === "number" ? def.y : 1.15, 0.005);
      root.add(group);
      interactables.push({
        id: def.id,
        kind: "lightSwitch",
        outline: built.outline,
        toggleSwitch: function () {
          built.toggle();
          roomLamps.forEach(function (lamp) { lamp.setPower(built.isOn()); });
        },
      });
      frameUpdaters.push(built.update);
    });

    (room.posters || []).forEach(function (def) {
      const poster = window.PosterFactory.createPoster(def.image, def.width, def.height);
      placeOnWall(poster, def.wall || "fundo", typeof def.along === "number" ? def.along : 0, typeof def.y === "number" ? def.y : 1.55, 0.02);
      root.add(poster);
    });

    // ---------- Colisao ----------
    // Um solido fino por parede, mesmo principio do corredor e do
    // MEU QUARTO. A parede de entrada vira DOIS solidos, um de cada
    // lado do vao, para o jogador atravessar a porta andando; quem
    // fecha ou libera o vao em si e a colisao da folha da porta, que
    // mora no corredor (ver "Colisao da PASSAGEM" em
    // scenes/corridor-scene.js) e acompanha o estado dela.
    // ---------- As janelas, montadas ----------
    // Moldura 2 cm para DENTRO do cómodo (nunca para fora): é ela que
    // cobre a borda do recorte. A parede continua sólida na colisão —
    // janela não é passagem.
    //
    // A vista externa (chão, gramado, mata, névoa e chuva) NÃO é montada
    // aqui: ela já existe lá fora, ancorada nas fachadas do CORREDOR (ver
    // scenes/corridor-scene.js) e com a pegada deste cómodo excluída dela.
    // Um terreno por fachada, nunca um por janela.
    windowDefs.forEach(function (def) {
      const built = window.WindowFactory.createWindow(materials);
      built.group.name = def.id;
      built.group.position.set(def.along, def.centerY, -depth + 0.02);
      root.add(built.group);
      sideWindowBuilts.push(built);
      interactables.push({
        id: def.id,
        kind: "window",
        outline: built.outline,
        toggleCurtain: built.toggleCurtain,
        isOpen: built.isOpen,
      });
      frameUpdaters.push(built.update);
      if (Math.abs(def.along) + window.WindowFactory.WINDOW_WIDTH / 2 > half) {
        console.warn(
          "SideRoomScene: a janela " +
            def.id +
            " passa da parede lateral de " +
            info.key +
            " - reveja `windows` nos dados do comodo (scenes/house-config.js)."
        );
      }
    });

    solids.push({ owner: leftWall, minX: -half - WALL_THICKNESS, maxX: -half, minZ: -depth, maxZ: 0 });
    solids.push({ owner: rightWall, minX: half, maxX: half + WALL_THICKNESS, minZ: -depth, maxZ: 0 });
    solids.push({ owner: farWall, minX: -half, maxX: half, minZ: -depth, maxZ: -depth + WALL_THICKNESS });

    solids.push({
      owner: entryWall,
      minX: -half - WALL_THICKNESS,
      maxX: doorX - passHalf,
      minZ: -inset,
      maxZ: 0,
    });
    solids.push({
      owner: entryWall,
      minX: doorX + passHalf,
      maxX: half + WALL_THICKNESS,
      minZ: -inset,
      maxZ: 0,
    });

    // ---------- Borda: local -> mundo ----------
    // Mesma copia de `owner` que scenes/room-scene.js faz aqui: a caixa
    // convertida e uma caixa nova, e e ela que o mundo usa - sem levar o
    // dono junto, excluir o movel no Editor deixaria a colisao dele para
    // tras (ver `owner` em scripts/collision.js).
    const worldSolids = solids.map(function (box) {
      const worldBox = transform.transformBox(box);
      worldBox.owner = box.owner || null;
      // Mesmas chaves manuais que scenes/room-scene.js leva junto: a caixa
      // convertida e nova e teria perdido todas elas.
      if (box.enabled !== undefined) worldBox.enabled = box.enabled;
      if (box.follow !== undefined) worldBox.follow = box.follow;
      if (box.modelFit !== undefined) worldBox.modelFit = box.modelFit;
      if (box.sceneDriven !== undefined) worldBox.sceneDriven = box.sceneDriven;
      return worldBox;
    });

    const worldBounds = transform.transformBox({
      minX: -half,
      maxX: half,
      minZ: -depth,
      maxZ: 0,
    });

    // Superficie sob o jogador, para o som do passo (ver
    // audio/footstep-audio.js e audio/passos/). A pergunta chega em
    // coordenadas do MUNDO, como no contrato das outras zonas (ver
    // scripts/house-world.js), entao aqui ela e convertida para o espaco
    // do comodo antes de olhar os tapetes - a mesma conversao que
    // scenes/room-scene.js faz.
    //
    // Comodo sem tapete nenhum responde "madeira" na hora, sem conta
    // nenhuma: os outros tres comodos continuam como antes.
    function getSurfaceAt(worldX, worldZ) {
      if (!rugRects.length || typeof worldX !== "number") {
        return "madeira";
      }
      const local = transform.toLocal(worldX, worldZ);
      for (let i = 0; i < rugRects.length; i++) {
        const rect = rugRects[i];
        if (
          local.x >= rect.minX &&
          local.x <= rect.maxX &&
          local.z >= rect.minZ &&
          local.z <= rect.maxZ
        ) {
          return "tapete";
        }
      }
      return "madeira";
    }

    function update(delta, elapsed) {
      frameUpdaters.forEach(function (fn) { fn(delta, elapsed); });
    }

    // Noite <-> dia. Ate esta atualizacao estes comodos nao tinham nada
    // que mudasse no amanhecer (nenhuma janela, nenhum exterior), entao
    // nem expunham a funcao - HouseWorld.setDaytime simplesmente pulava
    // eles (ver scripts/house-world.js). Agora eles tem FACHADA, e ela
    // precisa trocar de material junto com o resto do lado de fora da
    // casa, senao as paredes externas destes quatro comodos ficariam
    // escuras de dia enquanto a do corredor e a do quarto amanhecem.
    function setDaytime(daytime) {
      claddings.forEach(function (cladding) {
        cladding.setDaytime(daytime);
      });
      // Clarão dos relâmpagos das janelas deste cómodo, mesmo contrato do
      // corredor e do MEU QUARTO (ver effects/lightning-storm.js): de dia
      // não tem tempestade, e o Editor pode voltar para a noite.
      sideWindowBuilts.forEach(function (windowBuilt) {
        if (windowBuilt.setDaytime) {
          windowBuilt.setDaytime(daytime !== false);
        }
      });
      if (window.LightningStorm) {
        window.LightningStorm.setDaytime(daytime !== false);
      }
    }

    function setMorning() {
      setDaytime(true);
    }

    return {
      key: info.key,
      label: info.label,
      root: root,
      solids: worldSolids,
      localSolids: solids,
      interactables: interactables,
      update: update,
      setDaytime: setDaytime,
      setMorning: setMorning,
      getSurfaceAt: getSurfaceAt,
      bounds: worldBounds,
      transform: transform,
      placement: info.placement,
    };
  }

  return {
    WALL_THICKNESS: WALL_THICKNESS,
    resolve: resolve,
    footprints: footprints,
    build: build,
  };
})();
