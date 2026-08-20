/**
 * materials/material-library.js
 * -------------------------------------------------
 * Centraliza a criação dos materiais usados na cena.
 * Mantém materials/ (define "de que é feito") separado
 * de textures.js (define "qual é o padrão visual").
 * -------------------------------------------------
 */

window.MaterialLibrary = (function () {
  function build(corridorConfig, roomConfig, houseConfig) {
    const floorTex = window.PsxTextures.createWoodTexture(
      corridorConfig.width * 1.2,
      corridorConfig.length * 1.2
    );
    const ceilingTex = window.PsxTextures.createWoodTexture(
      corridorConfig.width * 1.2,
      corridorConfig.length * 1.2
    );
    // Chão e teto do quarto ("MEU QUARTO" — ver scenes/room-scene.js):
    // mesma receita de madeira do corredor acima (createWoodTexture),
    // não uma textura nova — só recalculada para o tamanho do quarto,
    // que é quadrado e bem menor que o corredor. O multiplicador
    // (*1.2) é o mesmo usado no chão/teto do corredor: é ele quem
    // define quantas unidades de mundo cada ripa ocupa, então repetir
    // o mesmo cálculo aqui (só trocando width/length pelo lado do
    // quarto) garante ripas do mesmo tamanho visual nos dois ambientes
    // — reaproveitar o objeto de textura do corredor tal como está
    // não funcionaria: o repeat dele foi calibrado para as proporções
    // bem alongadas do corredor (6 x 22), e aplicado sobre um quarto
    // quadrado (6 x 6) sairia esticado/distorcido num dos eixos.
    const roomSize = (roomConfig && roomConfig.size) || corridorConfig.width;
    const roomFloorTex = window.PsxTextures.createWoodTexture(
      roomSize * 1.2,
      roomSize * 1.2
    );
    const roomCeilingTex = window.PsxTextures.createWoodTexture(
      roomSize * 1.2,
      roomSize * 1.2
    );
    // Parede do quarto: lambri claro (ver createPsxWallPanelTexture),
    // inspirado na referência enviada pelo jogador. repeatY = 1, mesmo
    // princípio do wallTex abaixo — cobre o pé-direito inteiro numa
    // única passada vertical, sem costura no meio da parede.
    const roomWallTex = window.PsxTextures.createPsxWallPanelTexture(
      Math.max(2, Math.round(roomSize / 3)),
      1
    );
    // repeatY = 1: a textura cobre o pé-direito inteiro numa única
    // "passada" vertical (sem costura no meio da parede). repeatX
    // deliberadamente baixo (poucos painéis ao longo do corredor) para
    // que as manchas e fissuras pareçam parte de uma parede real, e
    // não um ladrilho óbvio se repetindo várias vezes.
    // ---------- Os quatro comodos novos ----------
    // QUARTO 01, QUARTO 02, COZINHA e BANHEIRO (ver
    // scenes/side-room-scene.js). NENHUMA textura nova aqui: piso e
    // teto usam a MESMA receita de madeira do corredor
    // (createWoodTexture, igual ao floorTex/ceilingTex acima) e as
    // paredes usam a MESMA do MEU QUARTO (createPsxWallPanelTexture,
    // igual ao roomWallTex acima). O que muda e so o `repeat`,
    // recalculado para o tamanho destes comodos - a mesma correcao que o
    // quarto ja fazia, e pelo mesmo motivo: o repeat do corredor foi
    // calibrado para 6 x 22 e, aplicado a um comodo de 7.7 x 4.8,
    // sairia esticado num dos eixos.
    //
    // Com o multiplicador *1.2 do corredor mantido, cada tabua ocupa
    // exatamente as mesmas unidades de mundo nos dois ambientes: o piso
    // atravessa a porta sem mudar de escala, que era o pedido de
    // continuidade visual.
    //
    // Um conjunto so serve os QUATRO comodos porque eles tem as mesmas
    // medidas (ver HouseConfig.sideRooms) - alem de coerente, e mais
    // barato: quatro comodos, quatro texturas, nao dezesseis.
    const sideRooms =
      (houseConfig && houseConfig.sideRooms) ||
      (window.HouseConfig && window.HouseConfig.sideRooms) ||
      [];
    const sideRoomLength = sideRooms.length ? sideRooms[0].length : 7.7;
    const sideRoomDepth = sideRooms.length ? sideRooms[0].depth : 4.8;
    const sideRoomFloorTex = window.PsxTextures.createWoodTexture(
      sideRoomLength * 1.2,
      sideRoomDepth * 1.2
    );
    const sideRoomCeilingTex = window.PsxTextures.createWoodTexture(
      sideRoomLength * 1.2,
      sideRoomDepth * 1.2
    );
    // Duas variantes de parede, uma por comprimento: as duas paredes
    // longas (entrada e oposta, 7.7) e as duas curtas (laterais, 4.8).
    // Mesma conta de paineis do MEU QUARTO (lado / 3), so aplicada a
    // cada largura - com um material unico, o lambri sairia esticado nas
    // paredes curtas.
    const sideRoomWallLongTex = window.PsxTextures.createPsxWallPanelTexture(
      Math.max(2, Math.round(sideRoomLength / 3)),
      1
    );
    const sideRoomWallShortTex = window.PsxTextures.createPsxWallPanelTexture(
      Math.max(2, Math.round(sideRoomDepth / 3)),
      1
    );
    // ---------- CORREDOR: reboco + trilho + LAMBRI VERDE + rodape ----------
    // A unica parede de dentro que a atualizacao do LAMBRI DO CORREDOR
    // mexeu (ver
    // createCorridorWainscotWallTexture em materials/textures.js, feita a
    // partir da referencia enviada pelo jogador). O reboco liso e cinzento
    // de antes (createOldPlasterWallTexture) nao e mais usado por ninguem.
    //
    // Vale SO para o CORREDOR: MEU QUARTO, QUARTO 01, QUARTO 02 e BANHEIRO
    // seguem com o lambri claro (roomWallTex/sideRoomWall* acima), a COZINHA
    // com o azulejo (kitchenWall* abaixo) e a fachada com o reboco mofado -
    // nenhum deles mudou um pixel.
    //
    // repeatY = 1 e obrigatorio, nao e estilo: a textura tem topo e base
    // (trilho em 1.50 m, rodape no chao). Com repeatY = 2 sairiam dois
    // trilhos e dois rodapes empilhados no meio da parede.
    //
    // repeatX = largura da parede / pe-direito, a mesma regra da fachada:
    // como o canvas e quadrado e cobre o pe-direito em Y, essa conta deixa o
    // texel QUADRADO, ou seja o pixel da parede tem o mesmo tamanho em
    // metros na parede de 22 metros e na de 6. Sem arredondar para inteiro
    // de proposito: a textura fecha sem costura em X, entao uma repeticao
    // quebrada na quina nao aparece, mas um repeat arredondado esticaria os
    // escorridos do lambri num dos eixos.
    const wallTex = window.PsxTextures.createCorridorWainscotWallTexture(
      corridorConfig.length / corridorConfig.height,
      1
    );
    const endWallTex = window.PsxTextures.createCorridorWainscotWallTexture(
      corridorConfig.width / corridorConfig.height,
      1
    );
    // ---------- FACHADA: as faces de FORA das paredes ----------
    // Reboco velho com mofo subindo do chao, fiel a referencia enviada
    // pelo jogador - ver createExteriorPlasterWallTexture em
    // materials/textures.js. Usada SO na casca externa da casa (ver
    // createWallCladding em models/exterior-factory.js): nenhuma parede
    // de DENTRO muda por causa deste bloco: a parede do corredor
    // (wallTex/endWallTex acima) e o lambri do MEU QUARTO e dos quatro
    // comodos sao materiais separados destes aqui.
    //
    // repeatY = 1 em todas, e isso NAO e escolha de estilo: a receita
    // nao repete na vertical porque o mofo mora no rodape dela. Com
    // repeatY = 2 apareceria uma segunda faixa de mofo flutuando no meio
    // da parede (ver o comentario grande da receita).
    //
    // repeatX = largura da parede / pe-direito. Com isso o pixel da
    // fachada tem o MESMO tamanho em metros em toda a casa, tenha a
    // parede 22 metros (o corredor) ou 4.8 (a lateral de um comodo) - a
    // mesma regra que o piso de madeira ja segue entre o corredor e os
    // quartos. Sem arredondar para inteiro de proposito: a textura fecha
    // sem costura em X, entao uma repeticao quebrada no fim da parede
    // nao aparece, mas um repeat arredondado esticaria o pixel.
    const wallHeight = corridorConfig.height;
    const exteriorCorridorTex =
      window.PsxTextures.createExteriorPlasterWallTexture(
        corridorConfig.length / wallHeight,
        1
      );
    // As duas extremidades do corredor. Hoje so a `end_b` e fachada de
    // verdade (a da porta ENTRADA & SAIDA, em z = -22); a `end_a` e a
    // divisoria com o MEU QUARTO e por isso NAO leva casca nenhuma.
    const exteriorEndTex =
      window.PsxTextures.createExteriorPlasterWallTexture(
        corridorConfig.width / wallHeight,
        1
      );
    // MEU QUARTO: as tres paredes dele que dao para o terreno (fundo,
    // esquerda e direita). Mesma largura das extremidades do corredor,
    // mas textura propria - duas paredes vizinhas com o mesmo padrao
    // sorteado leriam como um espelho na quina da casa.
    const exteriorRoomTex =
      window.PsxTextures.createExteriorPlasterWallTexture(
        roomSize / wallHeight,
        1
      );
    // Os quatro comodos novos: uma variante por comprimento, igual ao
    // que o lambri de dentro deles ja faz (sideRoomWallLong/Short).
    const exteriorSideRoomLongTex =
      window.PsxTextures.createExteriorPlasterWallTexture(
        sideRoomLength / wallHeight,
        1
      );
    const exteriorSideRoomShortTex =
      window.PsxTextures.createExteriorPlasterWallTexture(
        sideRoomDepth / wallHeight,
        1
      );

    // ---------- COZINHA: azulejo, faixa decorativa e pintura ----------
    // A UNICA parede de dentro que muda nesta atualizacao (ver
    // createKitchenTileWallTexture em materials/textures.js, feita a
    // partir da referencia enviada pelo jogador). Vale SO para a
    // COZINHA: QUARTO 01, QUARTO 02 e BANHEIRO seguem com o lambri
    // claro dos materiais sideRoomWallLong/Short logo acima, que nao
    // mudaram um pixel - quem escolhe qual dos dois cada comodo usa e o
    // campo `wallStyle` dos dados da planta (ver a tabela WALL_STYLES em
    // scenes/side-room-scene.js).
    //
    // Duas variantes, uma por comprimento de parede (7.7 nas duas
    // longas, 4.8 nas duas curtas), MESMO motivo do lambri: com um
    // material unico o azulejo sairia esticado nas paredes curtas.
    //
    // ---------- A conta do repeat (por que o azulejo nao estica) ----------
    // A textura cobre um quadrado de lado igual ao pe-direito (4.2) com
    // 16 azulejos, ou seja azulejos de 26 cm. Para uma parede de
    // `wallLength` metros, um repeat de wallLength/4.2 daria azulejos
    // exatamente quadrados, mas terminaria a parede cortando uma peca no
    // meio da quina. Arredondar para um numero INTEIRO de azulejos fecha
    // a fiada na quina e muda o tamanho da peca em menos de 2% (0.2655 m
    // na parede longa, 0.2667 m na curta, contra os 0.2625 m da
    // vertical): o pixel continua praticamente quadrado nos dois eixos,
    // que e o que o pedido chamava de "escala coerente".
    const kitchenTileSize = wallHeight / 16;
    function kitchenWallRepeat(wallLength) {
      const tiles = Math.max(1, Math.round(wallLength / kitchenTileSize));
      return tiles / 16;
    }
    const kitchenWallLongTex = window.PsxTextures.createKitchenTileWallTexture(
      kitchenWallRepeat(sideRoomLength),
      1
    );
    const kitchenWallShortTex = window.PsxTextures.createKitchenTileWallTexture(
      kitchenWallRepeat(sideRoomDepth),
      1
    );


    // ---------- BANHEIRO: azulejo florido + pintura bege ----------
    // A UNICA parede de dentro que muda nesta atualizacao (ver
    // createBathroomTileWallTexture em materials/textures.js, feita a
    // partir da imagem de referencia enviada pelo jogador). Vale SO para
    // o BANHEIRO: QUARTO 01 e QUARTO 02 seguem com o lambri claro
    // (sideRoomWallLong/Short), a COZINHA com o azulejo dela
    // (kitchenWall* logo acima) e o CORREDOR com o lambri verde - nenhum
    // deles mudou um pixel. Quem escolhe qual estilo cada comodo usa e o
    // campo `wallStyle` dos dados da planta (ver a tabela WALL_STYLES em
    // scenes/side-room-scene.js).
    //
    // Duas variantes, uma por comprimento de parede (7.7 nas duas longas,
    // 4.8 nas duas curtas), MESMO motivo do azulejo da cozinha: com um
    // material unico o ladrilho sairia esticado nas paredes curtas. As
    // DIVISORIAS novas do comodo nao pedem uma terceira variante: elas
    // reaproveitam estes dois materiais e corrigem a escala no U da
    // propria malha (ver o bloco Divisorias internas em
    // scenes/side-room-scene.js).
    //
    // A conta do repeat e a mesma do azulejo da cozinha: 16 pecas por
    // lado de canvas, canvas cobrindo o pe-direito, e um numero INTEIRO
    // de pecas por parede para a fiada fechar na quina.
    const bathroomTileSize = wallHeight / 16;
    function bathroomWallRepeat(wallLength) {
      const tiles = Math.max(1, Math.round(wallLength / bathroomTileSize));
      return tiles / 16;
    }
    const bathroomWallLongTex =
      window.PsxTextures.createBathroomTileWallTexture(
        bathroomWallRepeat(sideRoomLength),
        1
      );
    const bathroomWallShortTex =
      window.PsxTextures.createBathroomTileWallTexture(
        bathroomWallRepeat(sideRoomDepth),
        1
      );

    // ---------- BANHEIRO: o PISO de ceramica ----------
    // Pedido do jogador, com uma imagem de textura de ceramica em anexo:
    // 'quero que faca o chao do banheiro com uma textura de ceramica, que
    // seja fiel a imagem que enviei. (Esse chao vai ser apenas do
    // banheiro)'. A receita esta em createCeramicFloorTexture
    // (materials/textures.js), medida pixel a pixel da referencia; quem
    // liga o material ao comodo e o campo `floorStyle` dos dados da
    // planta (ver a tabela FLOOR_STYLES em scenes/side-room-scene.js).
    //
    // Vale SO para o BANHEIRO, exatamente como o azulejo de parede logo
    // acima: QUARTO 01, QUARTO 02, COZINHA, MEU QUARTO e CORREDOR
    // continuam com a madeira de sempre (sideRoomFloor) - e o TETO do
    // banheiro tambem. Ceramica e o chao, so o chao.
    //
    // ---------- A conta do repeat ----------
    // Mesma filosofia do azulejo: um numero INTEIRO de pecas por lado do
    // comodo, para a fiada fechar na parede em vez de cortar uma peca no
    // meio da quina. Peca de 30 cm (medida de piso de banheiro de
    // verdade) da 26 pecas nos 7.7 m e 16 nos 4.8 m, ou seja 29.6 x 30 cm
    // na pratica - 1% de diferenca entre os dois eixos, invisivel, e em
    // troca o texel sai praticamente quadrado nos dois.
    //
    // O canvas tem 8 pecas por lado (CERAMIC_FLOOR_COLS em
    // materials/textures.js), entao o repeat e pecas / 8.
    const ceramicTileSize = 0.3;
    function ceramicFloorRepeat(span) {
      const tiles = Math.max(1, Math.round(span / ceramicTileSize));
      return tiles / 8;
    }
    const bathroomFloorTex = window.PsxTextures.createCeramicFloorTexture(
      ceramicFloorRepeat(sideRoomLength),
      ceramicFloorRepeat(sideRoomDepth)
    );
    // ---------- BANHEIRO: o tapete de banho ----------
    // Ver createBathMatTexture em materials/textures.js e createStripedRug
    // (estilo "banho") em models/carpet-factory.js. Mesma ideia do tapete
    // da cozinha logo acima: as medidas saem dos DADOS da planta, e nao de
    // numeros repetidos aqui, para repeatX = comprimento / largura manter
    // o texel quadrado - mudar o tamanho do tapete nos dados recalibra a
    // textura sozinho. A busca e pela chave do comodo (e nao pelo primeiro
    // `rugs` que aparecer, como a da cozinha) porque os dois tapetes
    // existem ao mesmo tempo e cada um tem a sua textura.
    let bathMatLength = 1.5;
    let bathMatWidth = 0.9;
    for (let i = 0; i < sideRooms.length; i++) {
      if (sideRooms[i].key !== "banheiro") {
        continue;
      }
      const bathRugList = sideRooms[i].rugs;
      if (bathRugList && bathRugList.length) {
        bathMatLength = bathRugList[0].length || bathMatLength;
        bathMatWidth = bathRugList[0].width || bathMatWidth;
      }
      break;
    }
    const bathMatTex = window.PsxTextures.createBathMatTexture(
      bathMatLength / bathMatWidth,
      1
    );

    // ---------- COZINHA: o tapete listrado ----------
    // Ver createStripedRugTexture em materials/textures.js e
    // createStripedRug em models/carpet-factory.js. As medidas saem dos
    // DADOS da planta (o primeiro `rugs` declarado em
    // HouseConfig.sideRooms) e nao de numeros repetidos aqui: e o que
    // mantem repeatX = comprimento/largura, o unico valor em que a
    // listra nao estica (texel quadrado). Mudar o tamanho do tapete nos
    // dados recalibra a textura sozinho.
    let kitchenRugLength = 2.4;
    let kitchenRugWidth = 1;
    for (let i = 0; i < sideRooms.length; i++) {
      const rugList = sideRooms[i].rugs;
      if (rugList && rugList.length) {
        kitchenRugLength = rugList[0].length || kitchenRugLength;
        kitchenRugWidth = rugList[0].width || kitchenRugWidth;
        break;
      }
    }
    const kitchenRugTex = window.PsxTextures.createStripedRugTexture(
      kitchenRugLength / kitchenRugWidth,
      1
    );
    const kitchenRugFringeTex =
      window.PsxTextures.createStripedRugFringeTexture(1, 1);

    // Grama do chão externo (vista através do vidro das três janelas
    // — ver models/exterior-factory.js). repeatX/Y = 60: ~1
    // repetição por unidade de mundo (mesma densidade do piso de
    // madeira acima), calibrado para o tamanho fixo do "remendo" de
    // grama de cada janela (ExteriorFactory.GROUND_SIZE = 60, que
    // cresceu de 30 quando a névoa de dia passou a enxergar mais
    // longe — ver o comentário dele) — os dois números precisam
    // continuar batendo, senão a grama sai esticada ou comprimida;
    // ver comentário equivalente lá.
    const grassTex = window.PsxTextures.createGrassTexture(60, 60);
    // ---------- O tom de verde mais escuro do terreno ----------
    // Tintura aplicada nos DOIS materiais de grama do chao externo
    // (`grass` e `grassDay`, mais abaixo). MOTIVO DE EXISTIR: o gramado
    // alto de models/grass-field-factory.js passou a ser plantado em
    // TODO o terreno, num verde bem mais escuro (a media das laminas
    // dele fica em ~rgb(37, 52, 23)). A textura de grama daqui e um
    // oliva claro (#565a28 de base, ver createGrassTexture em
    // materials/textures.js) e, do jeito que estava, o chao solido
    // aparecia CLARO nas frestas entre uma moita e outra - exatamente o
    // efeito de "grama pintada em cima de um tapete claro" que a
    // atualizacao veio matar.
    //
    // Multiplicando a textura por este tom, o chao passa a ler
    // ~rgb(40, 52, 22): um fio mais escuro que a media das laminas, que
    // e o que se espera do solo VISTO POR BAIXO da grama (a luz nao
    // chega la). Nenhuma textura nova, nenhum material novo, custo zero
    // - so um `color` multiplicando o mapa que ja existia.
    //
    // Vale para os dois periodos: o chao de noite tambem escureceu, para
    // o amanhecer nao trocar o TOM do terreno, so o brilho dele.
    const GRASS_DARK_TINT = 0x77938c;
    // Terra batida do caminho que sai da porta ENTRADA & SAIDA (ver
    // models/dirt-path-factory.js). repeat 1x1 de proposito: quem
    // ladrilha a estrada e a propria malha dela, pelas UVs (x/TILE,
    // z/TILE em espaco de mundo) - assim o pixel de terra nao estica
    // onde a pista alarga. Diferente do grassTex acima, cujo repeat
    // precisa acompanhar o GROUND_SIZE do remendo de chao.
    const dirtPathTex = window.PsxTextures.createDirtPathTexture(1, 1);
    const curtainTex = window.PsxTextures.createCurtainTexture(2, 3);
    const glassTex = window.PsxTextures.createFrostedGlassTexture(1, 1);
    const streakTex = window.PsxTextures.createRainStreakTexture(1, 2);
    const deskWoodTex = window.PsxTextures.createAgedWoodTexture(1.5, 1.5);
    const deskDrawerFrontTex = window.PsxTextures.createDeskDrawerFrontTexture();
    // repeatX = 1: mostra a borda + campo + borda uma única vez ao longo
    // da largura do tapete. repeatY: repete o medalhão central várias
    // vezes ao longo do comprimento (estilo "runner").
    const carpetTex = window.PsxTextures.createCarpetTexture(
      1,
      Math.max(4, Math.round(corridorConfig.length / 2.2))
    );
    const carpetFringeTex = window.PsxTextures.createCarpetFringeTexture(1, 1);
    // Textura única da folha da porta (sem repeat — cobre a folha
    // inteira de uma vez) e moldura própria da porta (tileável, repete
    // um pouco ao longo das peças compridas do caixilho).
    const doorPanelTex = window.PsxTextures.createDoorPanelTexture();
    const doorCasingTex = window.PsxTextures.createDoorFrameWoodTexture(1, 2);
    // Cerâmica envelhecida dos dois vasos de planta do corredor (ver
    // PottedPlantFactory) — repeat um pouco maior que o do vaso de
    // rosas por ser uma superfície bem maior.
    const potCeramicTex = window.PsxTextures.createAgedCeramicTexture(1.4, 1.4);
    // Baquelite escura envelhecida do corpo do telefone de mesa (ver
    // PhoneFactory, modelo redesenhado) — repeat baixo (2x2): a peça é
    // pequena, então um padrão sutil de manchas/arranhões já cobre o
    // objeto todo sem ficar óbvio ou repetitivo em nenhuma face.
    const phoneBodyTex = window.PsxTextures.createAgedBakeliteTexture(2, 2);
    // ---------- Telhado (ver models/roof-factory.js) ----------
    // Repeticao 1 nas duas: quem controla a escala da telha e o UV do
    // proprio telhado, medido em METROS de mundo (TEX_SCALE em
    // models/roof-factory.js), para as aguas grandes e pequenas sairem
    // com telha do mesmo tamanho.
    const roofShingleTex = window.PsxTextures.createRoofShingleTexture(1, 1);
    const roofBoardTex = window.PsxTextures.createAgedWoodTexture(1, 1);
    // ---------- Varanda da entrada (ver models/porch-factory.js) ----------
    // Repeticao 1 no reboco pelo MESMO motivo do telhado logo acima: quem
    // controla a escala e o UV da propria varanda, medido em METROS
    // (TEX_SCALE em models/porch-factory.js). E o que faz o pixel do
    // reboco ter o mesmo tamanho no piso deitado, no muro de 88 cm e no
    // pilar de 3 metros - com repeat por peca, cada uma sairia numa
    // escala diferente.
    //
    // Por que uma receita propria e nao a `exteriorEndTex` da fachada: a
    // da fachada nao fecha na vertical (o mofo dela mora no rodape), e a
    // varanda ladrilha nos dois sentidos. Ver o comentario grande de
    // createPorchPlasterTexture em materials/textures.js.
    const porchPlasterTex = window.PsxTextures.createPorchPlasterTexture(1, 1);
    // O capacho de boas-vindas. Sem repeat nenhum: o desenho (com a
    // palavra BEM-VINDO) aparece UMA vez na face de cima do tapete.
    const welcomeMatTex = window.PsxTextures.createWelcomeMatTexture();

    // ---------- Materiais da FACHADA ----------
    // Duas receitas fixas (noite e dia) aplicadas a cada textura de
    // fachada acima - uma funcao em vez de dez blocos identicos, ja que
    // a unica coisa que muda de uma parede externa para a outra e o
    // repeat da textura.
    //
    // side: THREE.BackSide, e nao DoubleSide como todo o resto: a casca
    // externa e desenhada por cima da face de FORA de uma parede que
    // continua existindo (ver createWallCladding em
    // models/exterior-factory.js), entao so essa face precisa existir.
    // Meio custo de rasterizacao e nenhuma chance de a casca aparecer
    // por dentro do comodo.
    //
    // emissive baixinho pelo mesmo motivo do telhado (roofShingle mais
    // abaixo): a fachada e a outra superficie da casa que fica 100% fora
    // do alcance das lampadas de dentro, e sem esse piso minimo de luz
    // ela viraria uma silhueta preta chapada contra o ceu na paleta de
    // noite.
    function exteriorWallMaterial(tex) {
      return new THREE.MeshStandardMaterial({
        map: tex.map,
        normalMap: tex.normalMap,
        normalScale: new THREE.Vector2(0.7, 0.7),
        emissive: 0x0d0c09,
        roughness: 1,
        metalness: 0,
        side: THREE.BackSide,
      });
    }

    // Versao de DIA, mesma ideia do chao de grama (grassDay) e do
    // telhado (roofShingleDay): nao existe sol de verdade na cena, entao
    // quem ilumina o exterior de manha e um material sem sombreamento
    // nenhum. `color` um pouco rebaixado para o reboco claro nao
    // estourar ao lado da grama e do telhado. A nevoa continua ligada,
    // entao a ponta distante da fachada se desfaz na bruma como todo o
    // resto.
    function exteriorWallDayMaterial(tex) {
      return new THREE.MeshBasicMaterial({
        map: tex.map,
        color: 0xd9d2c4,
        side: THREE.BackSide,
        fog: true,
      });
    }

    return {
      floor: new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      ceiling: new THREE.MeshStandardMaterial({
        map: ceilingTex,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      // Chão externo (grama, vista através do vidro das três janelas
      // — ver models/exterior-factory.js). Mesma receita do chão
      // interno acima (roughness 1, metalness 0, sem mapa emissivo
      // nenhum): reage à luz da cena normalmente, sem parecer um
      // objeto que brilha com luz própria.
      grass: new THREE.MeshStandardMaterial({
        map: grassTex,
        // Ver GRASS_DARK_TINT la em cima: o verde escuro do terreno,
        // para o chao solido nao aparecer claro entre as moitas do
        // gramado alto (models/grass-field-factory.js).
        color: GRASS_DARK_TINT,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      // A grama externa fica muito longe das luzes do quarto/corredor
      // (o remendo começa a mais de 30 unidades da parede), então um
      // MeshStandardMaterial continuava quase preto mesmo depois da
      // luz da manhã. Este material é usado só depois do amanhecer:
      // MeshBasic mantém a textura visível sem fingir que existe uma
      // lâmpada gigante do lado de fora. A névoa da cena continua
      // aplicada normalmente e apaga a distância.
      grassDay: new THREE.MeshBasicMaterial({
        map: grassTex,
        // Mesmo tom do material de noite acima (ver GRASS_DARK_TINT): o
        // amanhecer muda o brilho do terreno, nunca a cor dele.
        color: GRASS_DARK_TINT,
        side: THREE.DoubleSide,
        fog: true,
      }),
      // ---------- Caminho de terra da porta ENTRADA & SAIDA ----------
      // Ver models/dirt-path-factory.js. A textura vem com repeat 1x1
      // porque o ladrilhamento e feito nas PROPRIAS UVs da estrada
      // (x/2, z/2 em espaco de mundo, ver TILE la): assim o tamanho do
      // pixel de terra nao estica nos trechos em que a pista alarga,
      // nem encolhe onde ela estreita. Diferente do chao de grama logo
      // acima, cujo repeat precisa acompanhar GROUND_SIZE.
      //
      // vertexColors nos dois: a variacao de cor em escala grande
      // (manchas de metros e o escurecimento progressivo ate a borda,
      // que e o que faz a transicao terra para grama parecer organica)
      // e gravada no atributo color da malha, nao em textura nenhuma.
      // Custo zero: nenhum material extra, nenhum draw call extra.
      dirtPath: new THREE.MeshStandardMaterial({
        map: dirtPathTex,
        vertexColors: true,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      // Mesmo motivo de grassDay acima (e obrigatorio acompanhar a
      // escolha do chao): depois do amanhecer o terreno e a grama viram
      // MeshBasic, e uma estrada iluminada em cima de um gramado chapado
      // apareceria preta. A nevoa continua ligada, entao a distancia
      // continua se desfazendo na bruma, que e justamente o que esconde
      // o fim do caminho.
      dirtPathDay: new THREE.MeshBasicMaterial({
        map: dirtPathTex,
        vertexColors: true,
        color: 0xffffff,
        side: THREE.DoubleSide,
        fog: true,
      }),
      // Pedrinhas decorativas das bordas da estrada (geometria
      // procedural, sem textura: sao seixos de 7 a 26 cm, a essa
      // distancia uma textura neles nao renderia um pixel).
      // flatShading porque o facetado chapado e exatamente a leitura
      // PSX que se quer.
      pathRock: new THREE.MeshStandardMaterial({
        color: 0x6e6659,
        roughness: 1,
        metalness: 0,
        flatShading: true,
      }),
      pathRockDay: new THREE.MeshBasicMaterial({
        color: 0x8e8578,
        fog: true,
      }),
      // Relevo sutil via normal map (ver
      // createCorridorWainscotWallTexture): normalScale baixo de
      // propósito, só o bastante pra quebrar o aspecto totalmente plano
      // sob a luz da luminária, sem exagerar.
      //
      // `roughness: 1` com roughnessMap NÃO é a parede ficando mais
      // fosca: o valor numérico multiplica o mapa, então quem manda no
      // brilho agora é a textura. O reboco continua nos mesmos 0.95 de
      // sempre (242/255 no mapa) e o que muda é só o resto da parede
      // nova: a tinta a óleo do lambri verde reflete a luminária um
      // pouco mais (0.75) e a madeira do trilho e do rodapé fica no meio
      // — é essa diferença que faz o verde ler como pintura lavável e o
      // caqui de cima como cal.
      wallSide: new THREE.MeshStandardMaterial({
        map: wallTex.map,
        normalMap: wallTex.normalMap,
        roughnessMap: wallTex.roughnessMap,
        normalScale: new THREE.Vector2(0.6, 0.6),
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      wallEnd: new THREE.MeshStandardMaterial({
        map: endWallTex.map,
        normalMap: endWallTex.normalMap,
        roughnessMap: endWallTex.roughnessMap,
        normalScale: new THREE.Vector2(0.6, 0.6),
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      // ---------- FACHADA (casca externa das paredes) ----------
      // Um par noite/dia por parede externa da casa. Quem os usa e
      // createWallCladding (ver models/exterior-factory.js), chamado
      // pelos blocos de revestimento externo das tres cenas. Nenhuma
      // parede interna aponta para estes materiais - o interior nao
      // mudou.
      wallExteriorCorridor: exteriorWallMaterial(exteriorCorridorTex),
      wallExteriorCorridorDay: exteriorWallDayMaterial(exteriorCorridorTex),
      wallExteriorEnd: exteriorWallMaterial(exteriorEndTex),
      wallExteriorEndDay: exteriorWallDayMaterial(exteriorEndTex),
      wallExteriorRoom: exteriorWallMaterial(exteriorRoomTex),
      wallExteriorRoomDay: exteriorWallDayMaterial(exteriorRoomTex),
      wallExteriorSideRoomLong: exteriorWallMaterial(exteriorSideRoomLongTex),
      wallExteriorSideRoomLongDay: exteriorWallDayMaterial(
        exteriorSideRoomLongTex
      ),
      wallExteriorSideRoomShort: exteriorWallMaterial(exteriorSideRoomShortTex),
      wallExteriorSideRoomShortDay: exteriorWallDayMaterial(
        exteriorSideRoomShortTex
      ),
      // Chão e teto do quarto — mesma receita de createWoodTexture do
      // corredor acima (materials.floor/materials.ceiling), só
      // recalculada para o tamanho do quarto (ver comentário mais
      // acima, antes de roomFloorTex).
      roomFloor: new THREE.MeshStandardMaterial({
        map: roomFloorTex,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      roomCeiling: new THREE.MeshStandardMaterial({
        map: roomCeilingTex,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      // ---------- Os quatro comodos novos ----------
      // Mesmas receitas do corredor (madeira) e do MEU QUARTO (lambri),
      // so com o repeat recalculado - ver o bloco de comentario das
      // texturas la em cima. Tambem as mesmas propriedades de material
      // (roughness/metalness/side/normalScale) dos originais: os comodos
      // novos reagem a luz exatamente como o resto da casa.
      sideRoomFloor: new THREE.MeshStandardMaterial({
        map: sideRoomFloorTex,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      sideRoomCeiling: new THREE.MeshStandardMaterial({
        map: sideRoomCeilingTex,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      sideRoomWallLong: new THREE.MeshStandardMaterial({
        map: sideRoomWallLongTex.map,
        normalMap: sideRoomWallLongTex.normalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.85,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
      sideRoomWallShort: new THREE.MeshStandardMaterial({
        map: sideRoomWallShortTex.map,
        normalMap: sideRoomWallShortTex.normalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.85,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
      // ---------- COZINHA (e so ela): paredes de azulejo ----------
      // Mesmas propriedades dos materiais de parede acima, com uma
      // adicao: `roughnessMap`. O azulejo esmaltado e a pintura a cal
      // NAO refletem a luz do mesmo jeito, e sem o mapa a parede inteira
      // brilharia igual - com ele, a mesma malha responde a luz fraca da
      // casa como ceramica embaixo e como parede pintada em cima.
      // `roughness: 1` porque o Three.js MULTIPLICA o valor pelo mapa: e
      // o mapa que abaixa a rugosidade onde tem azulejo.
      kitchenWallLong: new THREE.MeshStandardMaterial({
        map: kitchenWallLongTex.map,
        normalMap: kitchenWallLongTex.normalMap,
        roughnessMap: kitchenWallLongTex.roughnessMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 1,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
      kitchenWallShort: new THREE.MeshStandardMaterial({
        map: kitchenWallShortTex.map,
        normalMap: kitchenWallShortTex.normalMap,
        roughnessMap: kitchenWallShortTex.roughnessMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 1,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
      // ---------- BANHEIRO (e so ele): paredes de azulejo florido ----------
      // Mesmas propriedades dos materiais de azulejo da cozinha, e pelos
      // mesmos motivos - inclusive o `roughnessMap`: ceramica esmaltada
      // embaixo e cal fosca em cima nao refletem a luz do mesmo jeito, e
      // `roughness: 1` porque o Three.js MULTIPLICA o valor pelo mapa.
      bathroomWallLong: new THREE.MeshStandardMaterial({
        map: bathroomWallLongTex.map,
        normalMap: bathroomWallLongTex.normalMap,
        roughnessMap: bathroomWallLongTex.roughnessMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 1,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
      bathroomWallShort: new THREE.MeshStandardMaterial({
        map: bathroomWallShortTex.map,
        normalMap: bathroomWallShortTex.normalMap,
        roughnessMap: bathroomWallShortTex.roughnessMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 1,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
      // ---------- BANHEIRO: o piso de ceramica ----------
      // Ver createCeramicFloorTexture em materials/textures.js e o bloco
      // de comentario das texturas la em cima. As propriedades sao as
      // MESMAS do azulejo de parede deste comodo, e pelos mesmos motivos:
      // `roughnessMap` porque a peca esmaltada e o rejunte poroso nao
      // refletem a luz do mesmo jeito, e `roughness: 1` porque o Three.js
      // MULTIPLICA o valor pelo mapa. `normalScale` baixo de proposito: o
      // sulco do rejunte tem que dar um sulco, nao um relevo de pedra.
      // `DoubleSide` igual ao piso de madeira que ele substitui.
      bathroomFloor: new THREE.MeshStandardMaterial({
        map: bathroomFloorTex.map,
        normalMap: bathroomFloorTex.normalMap,
        roughnessMap: bathroomFloorTex.roughnessMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 1,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
      // ---------- BANHEIRO: o tapete de banho ----------
      // Face de CIMA do tapete (ver createStripedRug, estilo "banho", em
      // models/carpet-factory.js). SEM polygonOffset e em FrontSide pelo
      // mesmo motivo do tapete da cozinha: nao e um plano coplanar com o
      // piso, e uma caixa de 1.2 cm apoiada 3 mm acima dele, entao nao
      // existe empate de profundidade para resolver.
      bathroomRug: new THREE.MeshStandardMaterial({
        map: bathMatTex,
        roughness: 1,
        metalness: 0,
        side: THREE.FrontSide,
      }),
      // A espessura do tapete vista de lado: cor cheia num tom um pouco
      // mais escuro que o campo do tecido (a felpa deitada na quina pega
      // menos luz). Sem textura porque em 1.2 cm de altura ela nao
      // apareceria - so gastaria memoria.
      bathroomRugEdge: new THREE.MeshStandardMaterial({
        color: 0x3a3442,
        roughness: 1,
        metalness: 0,
        side: THREE.FrontSide,
      }),
      // ---------- COZINHA: o tapete listrado ----------
      // Face de CIMA do tapete (ver createStripedRug em
      // models/carpet-factory.js).
      //
      // SEM polygonOffset, de proposito: as duas correcoes documentadas
      // em `carpet` e `roomCarpet` mais abaixo mostraram que qualquer
      // deslocamento de profundidade num plano deitado, visto de angulo
      // raso a 320x180, acaba vazando por cima do cenario. Este tapete
      // nao precisa de nenhum: ele nao e um plano coplanar com o piso, e
      // uma CAIXA de 1.2 cm de espessura apoiada 3 mm acima dele (ver a
      // fabrica), entao nao existe empate de profundidade para resolver.
      // `FrontSide` pelo mesmo motivo: caixa fechada nao tem face vista
      // do avesso.
      kitchenRug: new THREE.MeshStandardMaterial({
        map: kitchenRugTex,
        roughness: 1,
        metalness: 0,
        side: THREE.FrontSide,
      }),
      // A espessura do tapete vista de lado: cor cheia no mesmo
      // verde-oliva da listra da borda, que e justamente a listra que
      // encosta na quina. Nao leva textura porque em 1.2 cm de altura
      // ela nao apareceria - so gastaria memoria.
      kitchenRugEdge: new THREE.MeshStandardMaterial({
        color: 0x3f462d,
        roughness: 1,
        metalness: 0,
        side: THREE.FrontSide,
      }),
      // Franja das duas pontas. Mesma receita do `carpetFringe` do
      // corredor (recorte por alphaTest, `transparent: false` para a
      // franja continuar sendo ocluida pelo cenario como qualquer objeto
      // opaco - ver o comentario grande dele), com as cores das listras
      // deste tapete.
      kitchenRugFringe: new THREE.MeshStandardMaterial({
        map: kitchenRugFringeTex,
        transparent: false,
        alphaTest: 0.4,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      // Paredes do quarto: lambri claro em ripas verticais (ver
      // createPsxWallPanelTexture) — a única mudança visual pedida
      // pelo jogador em relação ao corredor, que continua com o reboco
      // antigo (materials.wallSide/wallEnd acima).
      wallRoom: new THREE.MeshStandardMaterial({
        map: roomWallTex.map,
        normalMap: roomWallTex.normalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.85,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
      // Cor lisa original, sem textura — mantida como estava porque
      // WindowFactory (peitoril) ainda usa este material; só a porta em
      // si passou a usar materials.doorPanel (ver abaixo).
      door: new THREE.MeshStandardMaterial({
        color: 0x2c2117,
        roughness: 0.8,
        metalness: 0.1,
      }),
      // Cor lisa original, sem textura — mantida como estava porque
      // WindowFactory, PictureFactory, DeskFactory e PhoneFactory
      // reaproveitam este material para molduras/detalhes que não são a
      // porta; só a moldura da porta em si passou a usar
      // materials.doorCasing (ver abaixo).
      doorFrame: new THREE.MeshStandardMaterial({
        color: 0x1a1410,
        roughness: 0.9,
      }),
      // Folha da porta: madeira nobre em tom âmbar com dois almofadados
      // de cantos chanfrados (ver createDoorPanelTexture) — substitui a
      // cor lisa por uma textura inspirada na foto de referência do
      // jogador. normalScale um pouco mais forte que o das paredes: o
      // relevo do sulco dos almofadados é um elemento central do
      // desenho, então merece se destacar mais que o grão sutil do
      // reboco.
      doorPanel: new THREE.MeshStandardMaterial({
        map: doorPanelTex.map,
        normalMap: doorPanelTex.normalMap,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughness: 0.75,
        metalness: 0.08,
      }),
      // Moldura própria da porta (caixilho ao redor da folha): madeira
      // num castanho-avermelhado mais escuro que a folha, mesmo
      // contraste da referência.
      doorCasing: new THREE.MeshStandardMaterial({
        map: doorCasingTex.map,
        normalMap: doorCasingTex.normalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.85,
        metalness: 0.05,
      }),
      signPlate: new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.6,
        metalness: 0.3,
      }),
      lampMetal: new THREE.MeshStandardMaterial({
        color: 0x1c1c1c,
        roughness: 0.5,
        metalness: 0.6,
      }),
      lampGlow: new THREE.MeshBasicMaterial({
        color: 0xfff3c4,
      }),
      // Placa plástica do interruptor de luz do corredor: tom marfim
      // levemente amarelado pelo tempo (mesmo espírito "desgastado mas
      // bem conservado" do resto do cenário), fosco o bastante para não
      // parecer plástico moderno e brilhante. Também usado na alavanca
      // e na base do mecanismo, para um acabamento único e coerente.
      switchPlate: new THREE.MeshStandardMaterial({
        color: 0xcfc3a4,
        roughness: 0.55,
        metalness: 0.05,
      }),
      // Luzinha indicadora do interruptor (mesma técnica visual do
      // bulbo da luminária e da luz do telefone — ver
      // LampFactory/PhoneFactory): acende fraco quando a luz do
      // corredor está desligada, ajudando a localizar o interruptor no
      // escuro — e apaga quando a luz está ligada.
      switchIndicator: new THREE.MeshBasicMaterial({
        color: 0xffb066,
      }),
      // Material "casca" usado no contorno branco de destaque das portas
      outline: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.BackSide,
      }),
      // Tecido da cortina das janelas
      curtain: new THREE.MeshStandardMaterial({
        map: curtainTex,
        roughness: 0.95,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      // Vidro fosco/martelado das janelas (ver createFrostedGlassTexture).
      // MeshPhysicalMaterial em vez do MeshStandardMaterial anterior: o
      // normalMap dá o relevo das células onduladas, o roughnessMap
      // deixa as células salientes um pouco mais lisas que os vales, e
      // uma fina camada de clearcoat simula a superfície polida do
      // vidro por cima do fosco — sem depender de mapa de ambiente,
      // então continua leve no celular. O resultado reage normalmente
      // à luz do corredor e aos clarões de relâmpago (ver
      // WindowFactory), só que agora com brilho e profundidade
      // próprios, que não se confundem com o reboco fosco da parede.
      windowGlass: new THREE.MeshPhysicalMaterial({
        map: glassTex.map,
        normalMap: glassTex.normalMap,
        normalScale: new THREE.Vector2(1.1, 1.1),
        roughnessMap: glassTex.roughnessMap,
        color: 0xd7e3ea,
        roughness: 0.6,
        metalness: 0,
        clearcoat: 0.45,
        clearcoatRoughness: 0.25,
        reflectivity: 0.55,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
      }),
      // Traços de água escorrendo pelo vidro (sobreposto ao vidro fosco)
      rainStreak: new THREE.MeshBasicMaterial({
        map: streakTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      // Madeira envelhecida da escrivaninha (tampo e pernas). A saia
      // sob o tampo e o corpo da gaveta continuam usando o
      // materials.doorFrame escuro, como já era antes (ver DeskFactory).
      // normalScale baixo, mesmo espírito do reboco das paredes: só o
      // bastante pra quebrar o aspecto totalmente chapado sob a luz da
      // luminária.
      deskWood: new THREE.MeshStandardMaterial({
        map: deskWoodTex.map,
        normalMap: deskWoodTex.normalMap,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.92,
        metalness: 0,
      }),
      // Frente da gaveta: textura própria e única (ver
      // createDeskDrawerFrontTexture), com sulco de painel rebaixado —
      // substitui a madeira lisa e tileada de deskWood só nessa peça,
      // pelo mesmo motivo que a folha da porta usa materials.doorPanel
      // em vez do doorFrame genérico (ver comentário mais acima).
      deskDrawerFront: new THREE.MeshStandardMaterial({
        map: deskDrawerFrontTex.map,
        normalMap: deskDrawerFrontTex.normalMap,
        normalScale: new THREE.Vector2(0.6, 0.6),
        roughness: 0.85,
        metalness: 0.03,
      }),
      // Cerâmica simples do vaso de flores
      vaseClay: new THREE.MeshStandardMaterial({
        color: 0x8a5636,
        roughness: 0.85,
        metalness: 0,
      }),
      // Pétalas das rosas
      roseRed: new THREE.MeshStandardMaterial({
        color: 0x6e1b26,
        roughness: 0.6,
        metalness: 0.05,
      }),
      // Folhas e caules das rosas
      roseLeaf: new THREE.MeshStandardMaterial({
        color: 0x35502c,
        roughness: 0.85,
        metalness: 0,
      }),
      // Baquelite escura envelhecida do corpo do telefone de mesa
      // (corpo, ombro, torre, forquilha e fone — ver PhoneFactory):
      // textura própria (ver createAgedBakeliteTexture) com manchas
      // sutis de oxidação, pequenos arranhões foscos e leves pontos de
      // polimento, mais roughness alto e metalness bem baixo para um
      // acabamento fosco "sem brilho exagerado" — nada de plástico
      // brilhante/moderno. normalScale baixo, mesmo espírito das
      // outras texturas do jogo: só o bastante pra quebrar o aspecto
      // chapado sob a luz da luminária.
      phoneBody: new THREE.MeshStandardMaterial({
        map: phoneBodyTex.map,
        normalMap: phoneBodyTex.normalMap,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughness: 0.68,
        metalness: 0.04,
      }),
      // Baquelite ainda mais escura do disco discador e da sapata da
      // forquilha do telefone (ver PhoneFactory): tom quase preto,
      // levemente mais "vivo" que o doorFrame genérico (um triz de
      // metalness) para se diferenciar do corpo por contraste sutil de
      // tom, enquanto o bezel/cubo metálicos (materials.lampMetal)
      // ficam com o contraste mais forte da peça.
      phoneDial: new THREE.MeshStandardMaterial({
        color: 0x140f0b,
        roughness: 0.55,
        metalness: 0.1,
      }),
      // Luzinha indicadora do telefone (emissiva visualmente, mesma
      // técnica do bulbo da luminária — ver LampFactory/lampGlow)
      phoneIndicatorLight: new THREE.MeshBasicMaterial({
        color: 0xc41e1e,
      }),
      // Tapete central do corredor (elemento decorativo, ver CarpetFactory).
      //
      // CORRECAO (tapete aparecendo POR CIMA das paredes / atravessando o
      // cenario quando visto de angulo raso): este material usava
      // polygonOffsetFactor/Units = -120. O comentario antigo afirmava que
      // um deslocamento tao grande "nao tem NENHUM efeito colateral visual,
      // so decide quem vence o empate" - isso nao e verdade, e e exatamente
      // a mesma armadilha ja documentada em `roomCarpet` logo abaixo (a bola
      // de futebol sumindo debaixo do tapete do quarto).
      //
      // Por que -120 quebra AQUI de forma tao visivel: o deslocamento final
      // aplicado pela GPU e
      //     factor * (maior inclinacao de profundidade do poligono por pixel)
      //   + units  * (menor incremento representavel no depth buffer)
      // O termo do `factor` NAO e constante - ele cresce com a inclinacao do
      // poligono na tela. O tapete e um plano deitado de ~19 unidades de
      // comprimento, quase sempre visto de angulo raso, e o jogo renderiza a
      // 320x180 (ver INTERNAL_WIDTH/HEIGHT em scripts/main.js): cada pixel
      // cobre MUITA profundidade, a inclinacao por pixel fica enorme e,
      // multiplicada por 120, vira um deslocamento equivalente a varias
      // unidades de mundo. O tapete deixa de disputar so com o piso e passa
      // a vencer o teste de profundidade contra a parede que esta
      // genuinamente na frente dele, vazando por cima do cenario.
      //
      // -1 / -2 sao os valores classicos de "decal" (adesivo colado numa
      // superficie): acompanham a inclinacao do poligono, que e para o que o
      // polygonOffset serve, sem nunca chegar perto de furar geometria
      // vizinha. Quem de fato separa tapete e piso e a folga real em Y (ver
      // rug.position.y em CarpetFactory, aumentada junto com esta correcao).
      carpet: new THREE.MeshStandardMaterial({
        map: carpetTex,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
      }),
      // Franjas nas duas pontas do tapete (textura "recorte" com alpha).
      // Mesmo polygonOffset moderado do tapete acima, e pelo mesmo motivo.
      //
      // `transparent` foi para false de proposito: com `alphaTest`, o recorte
      // fio-a-fio da franja ja e feito no shader (pixel com alpha abaixo do
      // corte e descartado), entao marcar como transparente so jogava a
      // franja para a fila de transparencia - desenhada depois de TODO o
      // cenario opaco e ordenada por distancia - o que, junto do
      // polygonOffset gigante, ajudava a franja a aparecer sobre a parede.
      // Como opaca ela escreve profundidade normalmente e fica ocluida pelo
      // cenario como qualquer outro objeto. Visualmente identica.
      carpetFringe: new THREE.MeshStandardMaterial({
        map: carpetFringeTex,
        transparent: false,
        alphaTest: 0.4,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
      }),
      // Tapete redondo do quarto ("MEU QUARTO", ver createRoundCarpet em
      // CarpetFactory) — mesma textura do tapete acima (carpetTex,
      // nenhuma textura nova), mas com um `polygonOffset` bem mais
      // moderado, em vez de reaproveitar o material `carpet` tal como
      // está.
      //
      // CORREÇÃO (bola sumindo embaixo do tapete): o -120 do tapete do
      // corredor foi calibrado pra vencer o piso lá na ponta mais
      // distante do corredor (~20 unidades da câmera — ver comentário
      // em `carpet` acima), onde a precisão do depth buffer já caiu
      // bastante. O comentário original dizia que um deslocamento tão
      // grande "não desloca nada no mundo 3D, só decide quem vence o
      // empate" — verdade só enquanto o único empate no entorno é
      // mesmo o do piso. O quarto é bem menor (RoomConfig.size = 6, no
      // máximo ~8 unidades de qualquer ponto até a câmera): o mesmo
      // -120 aplicado aqui empurra o valor de profundidade do tapete
      // tão pra perto da câmera que ele passa a vencer até objetos
      // genuinamente MAIS PRÓXIMOS da câmera que ele — como o centro
      // da bola de futebol (sempre desenhada acima do chão, portanto
      // mais perto da câmera de verdade sempre que rola por cima do
      // tapete). O tapete então "ganha" o teste de profundidade mesmo
      // estando atrás dela, e ela some por baixo dele — o próprio
      // tapete, e não mais o piso, virou a origem do bug. -4 aqui é de
      // sobra pra resolver o z-fighting piso/tapete nessa distância
      // curta, sem chegar nem perto de tirar objetos próximos do lugar
      // que é deles no teste de profundidade.
      //
      // CORRECAO (tapete do quarto se sobrepondo ao cenario): -4 / -4 e
      // bem menos agressivo que o -120 antigo, mas ainda e 4x o
      // deslocamento de "decal" e cai na MESMA armadilha ja documentada em
      // `carpet` logo acima: o termo do `factor` nao e constante, ele
      // cresce com a inclinacao do poligono na tela. O tapete e um plano
      // deitado, visto quase sempre de angulo raso, e o jogo renderiza a
      // 320x180 (ver INTERNAL_WIDTH/HEIGHT em scripts/main.js) - cada
      // pixel cobre MUITA profundidade. Multiplicado por 4, o deslocamento
      // ainda bastava para o tapete vencer o teste de profundidade contra
      // geometria que esta genuinamente NA FRENTE dele: aparecia como uma
      // lasca vermelha do tapete atravessando o batente da porta e o
      // rodape ao redor dela.
      //
      // -1 / -2 sao os valores classicos de decal, os MESMOS que o runner
      // do corredor passou a usar depois da mesma correcao: acompanham a
      // inclinacao do poligono sem nunca chegar perto de furar geometria
      // vizinha. Quem separa tapete e piso continua sendo a folga real de
      // 2 cm em Y (ver rug.position.y em createRoundCarpet), nao o
      // polygonOffset, e o renderOrder de la ja decide qualquer empate com
      // o piso sempre do mesmo jeito, quadro a quadro. A bola de futebol
      // segue resolvida: quanto menor o deslocamento, menos o tapete
      // interfere em objetos mais proximos da camera que ele.
      roomCarpet: new THREE.MeshStandardMaterial({
        map: carpetTex,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
      }),
      // ---------- Vasos de planta do corredor (ver PottedPlantFactory) ----------
      // Cerâmica envelhecida do corpo e da borda do vaso.
      potCeramic: new THREE.MeshStandardMaterial({
        map: potCeramicTex,
        roughness: 0.9,
        metalness: 0,
      }),
      // Terra visível no topo do vaso, sob a planta.
      potSoil: new THREE.MeshStandardMaterial({
        color: 0x2a1f16,
        roughness: 1,
        metalness: 0,
      }),
      // Pedrinhas decorativas espalhadas sobre a terra.
      plantPebble: new THREE.MeshStandardMaterial({
        color: 0x5c574c,
        roughness: 0.85,
        metalness: 0,
      }),
      // Folhagem principal (a maior parte das folhas).
      plantLeafPrimary: new THREE.MeshStandardMaterial({
        color: 0x2f4a26,
        roughness: 0.75,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      // Segundo tom de verde, um pouco mais claro, só para nem todas as
      // folhas saírem idênticas.
      plantLeafSecondary: new THREE.MeshStandardMaterial({
        color: 0x3c5c30,
        roughness: 0.75,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      // Nervura central das folhas, discreta e mais escura.
      plantLeafRib: new THREE.MeshStandardMaterial({
        color: 0x1f3318,
        roughness: 0.8,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      // Caules/hastes das folhas.
      plantStem: new THREE.MeshStandardMaterial({
        color: 0x3d5230,
        roughness: 0.8,
        metalness: 0,
      }),
      // Base das hastes mais baixas, com o tom avermelhado característico
      // dessas plantas perto da terra.
      plantStemBase: new THREE.MeshStandardMaterial({
        color: 0x5a3728,
        roughness: 0.8,
        metalness: 0,
      }),
      // ---------- Telhado (ver models/roof-factory.js) ----------
      // As aguas: telha de madeira escura e suja. `emissive` bem baixo
      // de proposito - o telhado e a unica superficie da casa que fica
      // 100% fora do alcance das lampadas internas, entao sem esse piso
      // minimo de luz ele viraria uma silhueta preta chapada contra o
      // ceu na paleta de noite (a luz ambiente da cena e fraquissima, ver
      // scripts/main.js). DoubleSide porque o lado de baixo do beiral
      // aparece de dentro do terreno, olhando de baixo para cima.
      roofShingle: new THREE.MeshStandardMaterial({
        map: roofShingleTex.map,
        normalMap: roofShingleTex.normalMap,
        normalScale: new THREE.Vector2(0.9, 0.9),
        emissive: 0x0f0a06,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      // Versao de DIA, mesma ideia do chao de grama (ver `grassDay`
      // acima): sem sol de verdade na cena, quem ilumina o exterior de
      // manha e um material sem sombreamento nenhum, so a textura, um
      // pouco rebaixada para o telhado nao ficar mais claro que a grama.
      roofShingleDay: new THREE.MeshBasicMaterial({
        map: roofShingleTex.map,
        color: 0xcfc6b8,
        side: THREE.DoubleSide,
        fog: true,
      }),
      // Arremates de madeira: cumeeiras e testeiras (as tabuas que dao
      // espessura a borda das aguas).
      roofTrim: new THREE.MeshStandardMaterial({
        map: roofBoardTex.map,
        normalMap: roofBoardTex.normalMap,
        normalScale: new THREE.Vector2(0.6, 0.6),
        color: 0x6b5a48,
        emissive: 0x0d0906,
        roughness: 1,
        metalness: 0,
      }),
      roofTrimDay: new THREE.MeshBasicMaterial({
        map: roofBoardTex.map,
        color: 0xa79b8c,
        fog: true,
      }),
      // Oitoes: o triangulo de tabuas que fecha as pontas do telhado
      // acima do topo das paredes. Um tom mais claro que a telha, para a
      // fachada nao virar uma massa marrom unica.
      roofGable: new THREE.MeshStandardMaterial({
        map: roofBoardTex.map,
        normalMap: roofBoardTex.normalMap,
        normalScale: new THREE.Vector2(0.7, 0.7),
        color: 0x8a7a68,
        emissive: 0x100c08,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      roofGableDay: new THREE.MeshBasicMaterial({
        map: roofBoardTex.map,
        color: 0xc3b8a6,
        side: THREE.DoubleSide,
        fog: true,
      }),
      // ---------- VARANDA DA ENTRADA (ver models/porch-factory.js) ----------
      // A alvenaria dela: piso, muro, pingadeira e pilares. Mesmas
      // escolhas da fachada (ver exteriorWallMaterial acima) e pelos
      // mesmos motivos - normalScale baixo para um relevo sutil de
      // reboco, e `emissive` minimo porque a varanda tambem fica 100%
      // fora do alcance das lampadas de dentro de casa e viraria uma
      // silhueta preta chapada contra o ceu de noite.
      //
      // A DIFERENCA e o `side`: a fachada e BackSide (uma casca colada por
      // fora de uma parede que ja existe), enquanto a varanda e feita de
      // CAIXAS FECHADAS de verdade - entao FrontSide, o padrao, que
      // desenha so a face virada para a camera. Metade do custo de
      // rasterizacao de um DoubleSide, sem nenhuma diferenca visivel:
      // ninguem ve um muro pelo lado de dentro do proprio muro.
      porchPlaster: new THREE.MeshStandardMaterial({
        map: porchPlasterTex.map,
        normalMap: porchPlasterTex.normalMap,
        roughnessMap: porchPlasterTex.roughnessMap,
        normalScale: new THREE.Vector2(0.7, 0.7),
        emissive: 0x0d0c09,
        roughness: 1,
        metalness: 0,
      }),
      // Versao de DIA - mesma receita de `wallExteriorEndDay` e
      // `grassDay`: nao existe sol de verdade na cena, entao de manha o
      // exterior inteiro passa a material chapado, com a nevoa ainda
      // ligada. O mesmo `color` rebaixado da fachada, para as duas
      // amanhecerem no mesmo tom (a varanda encosta nela).
      porchPlasterDay: new THREE.MeshBasicMaterial({
        map: porchPlasterTex.map,
        color: 0xd9d2c4,
        fog: true,
      }),
      // O tapete vermelho de boas-vindas. So a face de CIMA da lamina usa
      // este material (ver o item 6 de models/porch-factory.js); as outras
      // cinco faces usam o `welcomeMatEdge` abaixo.
      //
      // Sem polygonOffset, e de proposito: o tapete e uma caixa rasa 3 mm
      // acima do piso da varanda, entao nao existe empate de profundidade
      // para corrigir - a mesma licao ja documentada nos dois tapetes de
      // dentro de casa (ver `carpet` e `roomCarpet` mais acima).
      welcomeMat: new THREE.MeshStandardMaterial({
        map: welcomeMatTex,
        emissive: 0x0a0605,
        roughness: 1,
        metalness: 0,
      }),
      welcomeMatDay: new THREE.MeshBasicMaterial({
        map: welcomeMatTex,
        color: 0xd9d2c4,
        fog: true,
      }),
      // A espessura do capacho (1.2 cm): vermelho escuro liso, sem
      // textura - a essa altura nao renderiza um pixel de padrao.
      welcomeMatEdge: new THREE.MeshStandardMaterial({
        color: 0x5a1712,
        emissive: 0x080404,
        roughness: 1,
        metalness: 0,
      }),
      welcomeMatEdgeDay: new THREE.MeshBasicMaterial({
        color: 0x7a231b,
        fog: true,
      }),
    };
  }

  return { build: build };
})();
