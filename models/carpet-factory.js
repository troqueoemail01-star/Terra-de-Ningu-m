/**
 * models/carpet-factory.js
 * -------------------------------------------------
 * Tapete decorativo do corredor: uma faixa vermelha ornamentada
 * ("runner"), centralizada sobre o piso, com franjas nas duas
 * pontas. Elemento puramente visual — sem colisão e sem entrar na
 * lista de interativos — apenas enriquece o cenário já existente.
 *
 * Segue a mesma convenção do resto do jogo: a fábrica só constrói
 * a geometria em torno da própria origem; quem posiciona no mundo
 * é sempre scenes/corridor-scene.js.
 * -------------------------------------------------
 */

window.CarpetFactory = (function () {
  const FRINGE_DEPTH = 0.18; // profundidade (Z) de cada franja, nas pontas

  // corridorConfig: precisa de `.length`.
  // carpetDef: { width, endMargin } (ver CorridorConfig.carpet).
  function createCarpet(corridorConfig, carpetDef, materials) {
    const group = new THREE.Group();

    const carpetLength = Math.max(
      1,
      corridorConfig.length - carpetDef.endMargin * 2
    );
    const carpetWidth = carpetDef.width;

    // ---------- Faixa principal ----------
    const rugGeo = new THREE.PlaneGeometry(carpetWidth, carpetLength);
    const rug = new THREE.Mesh(rugGeo, materials.carpet);
    rug.rotation.x = -Math.PI / 2;
    // Pequeno deslocamento vertical para não brigar com o piso (z-fighting).
    rug.position.y = 0.02; // folga real (2 cm) acima do piso: e ela, e nao o polygonOffset, que separa tapete e piso
    // `renderOrder` maior que o padrão (0, usado pelo piso — nenhum
    // outro objeto do jogo define isso hoje): garante que o tapete é
    // sempre desenhado DEPOIS do piso, não importa a ordem que o
    // Three.js escolheria sozinho (que muda de quadro a quadro para
    // objetos a distâncias parecidas da câmera — parte de por que o
    // bug piscava especificamente ao mexer a câmera). Como o teste de
    // profundidade padrão do Three.js é "<=" (passa em empate), sendo
    // desenhado por último o tapete vence qualquer empate contra o
    // piso de forma sempre igual, quadro a quadro — complementa o
    // polygonOffset do material (ver materials/material-library.js),
    // que já devia evitar o empate na maioria dos casos.
    rug.renderOrder = 1;
    group.add(rug);

    // ---------- Franjas nas duas pontas ----------
    const fringeGeo = new THREE.PlaneGeometry(carpetWidth, FRINGE_DEPTH);
    const fringeOffset = carpetLength / 2 + FRINGE_DEPTH / 2 - 0.02;

    const fringeNear = new THREE.Mesh(fringeGeo, materials.carpetFringe);
    fringeNear.rotation.x = -Math.PI / 2;
    fringeNear.position.set(0, 0.021, fringeOffset);
    fringeNear.renderOrder = 1; // mesmo motivo do rug.renderOrder acima
    group.add(fringeNear);

    const fringeFar = new THREE.Mesh(fringeGeo, materials.carpetFringe);
    fringeFar.rotation.x = -Math.PI / 2;
    fringeFar.position.set(0, 0.021, -fringeOffset);
    fringeFar.renderOrder = 1; // mesmo motivo do rug.renderOrder acima
    group.add(fringeFar);

    return group;
  }

  // Tapete circular do quarto ("MEU QUARTO" — ver scenes/room-scene.js
  // e RoomConfig.carpet). Pedido do jogador: mesma textura do tapete
  // do corredor acima — por isso aqui não é criada nenhuma textura
  // nova, o material usado (materials.roomCarpet) reaproveita o mesmo
  // mapa de textura já pronto de material-library.js, só aplicado
  // sobre uma geometria circular em vez da faixa retangular do
  // runner. Mesma convenção do resto do arquivo: puramente decorativo,
  // sem colisão e sem entrar na lista de interativos; quem posiciona
  // no mundo (centralizado no meio do quarto) é scenes/room-scene.js.
  //
  // CORREÇÃO (bola de futebol sumindo embaixo do tapete): antes usava
  // materials.carpet — o MESMO material (mesmo polygonOffset -120) do
  // runner do corredor, calibrado pra uma distância de câmera bem
  // maior (~20 unidades) do que o quarto tem. Nesse tamanho de quarto,
  // aquele deslocamento empurrava o valor de profundidade do tapete
  // pra tão perto da câmera que ele vencia até a bola de futebol
  // rolando por cima dele (que está, de verdade, mais perto da câmera
  // nesse momento) — o tapete desenhava por cima dela. materials.roomCarpet
  // (ver material-library.js) é a mesma textura com um polygonOffset
  // bem mais moderado, suficiente pra esse tamanho de cômodo.
  function createRoundCarpet(radius, materials) {
    const group = new THREE.Group();

    const rugGeo = new THREE.CircleGeometry(radius, 48);
    const rug = new THREE.Mesh(rugGeo, materials.roomCarpet);
    rug.rotation.x = -Math.PI / 2;
    // Mesmo pequeno deslocamento vertical do runner acima, para não
    // brigar com o piso (z-fighting).
    rug.position.y = 0.02; // folga real (2 cm) acima do piso: e ela, e nao o polygonOffset, que separa tapete e piso
    // Mesmo renderOrder do runner do corredor acima, e pelo mesmo
    // motivo (garantir que vence qualquer empate de profundidade
    // contra o piso sempre da mesma forma, quadro a quadro).
    rug.renderOrder = 1;
    group.add(rug);

    return group;
  }

  // -----------------------------------------------------------------
  // TAPETE LISTRADO DA COZINHA
  // -----------------------------------------------------------------
  // Terceira peca deste arquivo, feita a partir da segunda imagem de
  // referencia enviada pelo jogador: um tapete de listras no sentido do
  // comprimento, com franja nas duas pontas curtas, para ficar em frente
  // ao armario da COZINHA. Mesmo sistema dos outros dois tapetes (nada
  // novo foi criado): geometria montada em torno da propria origem aqui,
  // material vindo pronto de materials/material-library.js e o
  // posicionamento no mundo por conta da cena - neste caso
  // scenes/side-room-scene.js, a partir dos dados de
  // HouseConfig.sideRooms. Puramente decorativo: sem colisao e fora da
  // lista de interativos, igual aos outros dois.
  //
  // ---------- Por que este e uma CAIXA, e nao um plano ----------
  // Os outros dois tapetes do jogo sao planos deitados, e os dois
  // renderam bug de profundidade contra o piso (as duas correcoes estao
  // documentadas em materials/material-library.js: tapete vazando por
  // cima da parede, bola de futebol sumindo por baixo do tapete). O
  // pedido aqui foi "espessura muito baixa, como um tapete real", e uma
  // caixa rasa resolve as duas coisas de uma vez: da a espessura pedida
  // (1.2 cm, a lamina de um tapete de verdade) e ainda tira o empate de
  // profundidade da jogada - a face de cima fica 1.5 cm acima do piso,
  // longe de qualquer disputa, e nenhum polygonOffset e necessario.
  //
  // A base flutua STRIPED_RUG_LIFT (3 mm) acima do piso de proposito: e
  // o bastante para a face de BAIXO nao ficar coplanar com o piso (o
  // unico empate que sobraria), e pouco o bastante para nao existir
  // sombra nem vao visivel a 320x180 - o tapete le como apoiado no chao,
  // que era o pedido.
  const STRIPED_RUG_THICKNESS = 0.012; // 1.2 cm de lamina
  const STRIPED_RUG_LIFT = 0.003; // 3 mm entre a base e o piso
  const STRIPED_RUG_FRINGE_DEPTH = 0.09; // franja de cada ponta curta

  // Espelha o U de uma geometria (0 <-> 1). Usado na franja da ponta
  // OPOSTA: a textura dela e desenhada com a RAIZ do fio em u = 0 e a
  // ponta solta em u = 1, entao, sem espelhar, os fios de uma das duas
  // pontas nasceriam soltos no ar e terminariam dentro do tapete.
  // Espelhar o UV e mais barato (e mais claro) que girar a malha e ter
  // de acertar a ordem dos eixos de Euler.
  function flipGeometryU(geometry) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, 1 - uv.getX(i));
    }
    uv.needsUpdate = true;
    return geometry;
  }

  // ---------- Os dois estilos de tapete-lamina ----------
  // Mesma caixa rasa, materiais diferentes - e um deles nem leva franja.
  // Existe porque o BANHEIRO pediu um tapete de banho (escuro,
  // cinza-arroxeado, felpudo e SEM franja, ver a imagem de referencia e
  // createBathMatTexture em materials/textures.js) e a COZINHA continua
  // com o listrado de sempre. E uma TABELA, e nao um `if` por comodo: o
  // estilo vem no dado do tapete (`style` em `rugs`, ver
  // scenes/house-config.js) e quem nao declara nada cai no listrado -
  // por isso o tapete da cozinha nao mudou um pixel.
  //
  // `fringe: null` = tapete sem franja. Nesse caso a peca sai sem os dois
  // planos das pontas E devolve fringeDepth 0, entao quem posiciona (ver
  // o bloco Tapetes em scenes/side-room-scene.js) calcula a folga contra a
  // parede com o tamanho real da lamina, sem sobra de fio nenhuma.
  const STRIPED_RUG_STYLES = {
    listrado: {
      face: "kitchenRug",
      edge: "kitchenRugEdge",
      fringe: "kitchenRugFringe",
    },
    banho: {
      face: "bathroomRug",
      edge: "bathroomRugEdge",
      fringe: null,
    },
  };

  // rugDef: { length, width } em metros (ver `rugs` em
  // scenes/house-config.js). `length` corre no X local do tapete e
  // `width` no Z local; as listras acompanham o COMPRIMENTO, como na
  // referencia.
  function createStripedRug(rugDef, materials) {
    const def = rugDef || {};
    const length = def.length || 2.4;
    const width = def.width || 1;
    const group = new THREE.Group();

    // Estilo (ver STRIPED_RUG_STYLES acima). Estilo desconhecido (erro
    // de digitacao nos dados) avisa e cai no listrado, em vez de montar
    // um tapete sem material nenhum.
    const styleKey = def.style || "listrado";
    let styleSpec = STRIPED_RUG_STYLES[styleKey];
    if (!styleSpec) {
      console.error(
        "CarpetFactory: estilo de tapete desconhecido '" +
          styleKey +
          "' - usando 'listrado'. Estilos validos: " +
          Object.keys(STRIPED_RUG_STYLES).join(", ") +
          "."
      );
      styleSpec = STRIPED_RUG_STYLES.listrado;
    }

    const face = materials[styleSpec.face] || materials.kitchenRug;
    const edge = materials[styleSpec.edge] || face;
    const fringeMaterial = styleSpec.fringe
      ? materials[styleSpec.fringe]
      : null;

    // Ordem das faces de uma BoxGeometry no Three.js:
    // [+X, -X, +Y, -Y, +Z, -Z]. So a de CIMA (+Y, indice 2) leva a
    // textura listrada: as laterais sao a espessura do tapete e a de
    // baixo nunca e vista.
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(length, STRIPED_RUG_THICKNESS, width),
      [edge, edge, face, edge, edge, edge]
    );
    body.position.y = STRIPED_RUG_LIFT + STRIPED_RUG_THICKNESS / 2;
    body.name = "tapete-tecido";
    group.add(body);

    // ---------- Franjas das duas pontas curtas ----------
    // Planos deitados na meia-altura da lamina, entrando 4 mm por baixo
    // do tapete: a emenda entre fio e tecido fica escondida pela propria
    // caixa, sem vao e sem duas superficies brigando por profundidade.
    // Tapete sem franja (estilo "banho") sai daqui com a lamina e nada
    // mais - e o que a referencia do tapete do BANHEIRO mostra.
    const fringeY = STRIPED_RUG_LIFT + STRIPED_RUG_THICKNESS / 2;
    const fringeX = length / 2 + STRIPED_RUG_FRINGE_DEPTH / 2 - 0.004;
    const fringeDepth = fringeMaterial ? STRIPED_RUG_FRINGE_DEPTH : 0;

    if (fringeMaterial) {
      const fringeNear = new THREE.Mesh(
        new THREE.PlaneGeometry(STRIPED_RUG_FRINGE_DEPTH, width),
        fringeMaterial
      );
      fringeNear.rotation.x = -Math.PI / 2;
      fringeNear.position.set(fringeX, fringeY, 0);
      fringeNear.name = "tapete-franja";
      group.add(fringeNear);

      const fringeFar = new THREE.Mesh(
        flipGeometryU(new THREE.PlaneGeometry(STRIPED_RUG_FRINGE_DEPTH, width)),
        fringeMaterial
      );
      fringeFar.rotation.x = -Math.PI / 2;
      fringeFar.position.set(-fringeX, fringeY, 0);
      fringeFar.name = "tapete-franja";
      group.add(fringeFar);
    }

    // Mesmo contrato das fabricas de mobilia dos comodos
    // (StoveFactory, SinkCabinetFactory e companhia): `width` e a pegada
    // em X, `depth` a pegada em Z, `height` o quanto sobe do chao. Quem
    // posiciona usa isso para alinhar a peca sem repetir medida nenhuma.
    return {
      group: group,
      width: length,
      depth: width,
      height: STRIPED_RUG_LIFT + STRIPED_RUG_THICKNESS,
      fringeDepth: fringeDepth,
    };
  }

  return {
    createCarpet: createCarpet,
    createRoundCarpet: createRoundCarpet,
    createStripedRug: createStripedRug,
  };
})();
