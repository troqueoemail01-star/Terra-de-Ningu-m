/**
 * scenes/corridor-scene.js
 * -------------------------------------------------
 * Monta o cenário inicial: um corredor largo com 6 portas
 * (extremidades + duas de cada lado), iluminado por uma
 * única luminária de teto.
 *
 * Retorna tudo que o resto do jogo precisa saber sobre
 * esta cena: o grupo 3D, a lista de sólidos (colisão) e
 * a lista única de objetos interativos (portas, cortinas,
 * gaveta e telefone da escrivaninha — ver InteractionSystem).
 * -------------------------------------------------
 */

window.CorridorScene = (function () {
  const WALL_THICKNESS = 0.3;

  function build(config, materials) {
    const root = new THREE.Group();
    const solids = []; // caixas {minX,maxX,minZ,maxZ} usadas na colisão
    // Lista única de todos os objetos interativos da cena (portas,
    // cortinas das janelas, gaveta e telefone da escrivaninha, e
    // qualquer outro que vier a ser adicionado no futuro). O
    // InteractionSystem lê a posição de cada um diretamente da própria
    // "outline" a cada quadro, então basta empurrar `{ id, kind,
    // outline, ...ação }` aqui — não é preciso calcular posição-mundo
    // manualmente nem manter listas separadas por tipo de objeto.
    const interactables = [];
    const frameUpdaters = [];
    const exteriorGrounds = []; // funções update(delta, elapsed) de elementos animados (janelas, luminária)

    // Guarda o objeto devolvido por cada WindowFactory.createWindow das
    // duas janelas do corredor (mesmo princípio de `roomWindowBuilts`
    // em scenes/room-scene.js), para `setMorning()` (fim deste arquivo)
    // poder desligar os relâmpagos delas quando a história virar o dia.
    const corridorWindowBuilts = [];

    const halfW = config.width / 2;
    const L = config.length;
    // Altura do centro das janelas (mundo)
    const WINDOW_CENTER_Y = 1.85;
    // Altura do centro dos quadros decorativos (mundo)
    const PICTURE_CENTER_Y = 1.85;
    // Altura do centro do relógio de parede (mundo) — um pouco acima
    // da altura dos quadros, para os dois elementos não ficarem
    // exatamente na mesma linha horizontal.
    const CLOCK_CENTER_Y = 2.05;
    // Altura do centro do interruptor de luz (mundo) — compatível com a
    // altura real de um interruptor de parede, bem mais baixa que
    // quadros/janelas (que ficam na altura dos olhos).
    const SWITCH_CENTER_Y = 1.15;

    // ---------- Passagem compartilhada com MEU QUARTO ----------
    // A porta "MEU QUARTO" nao e mais uma porta encostada num plano
    // cheio de parede: ela e a divisoria fisica entre este corredor e
    // a zona do quarto, que agora vive no MESMO mundo 3D, do outro
    // lado desta parede de extremidade (ver scenes/house-config.js e
    // `sharedDoor` em scenes/corridor-config.js). Por isso, aqui:
    //
    //  - a parede `end_a` ganha um VAO DE PORTA de verdade, recortado
    //    do chao para cima (ver buildWallGeometryWithOpenings em
    //    models/exterior-factory.js) - e o que permite ver o quarto
    //    daqui e atravessar para la sem trocar de cena;
    //  - a folha dessa porta gira de verdade (`hinged`);
    //  - a colisao dela deixa de ser uma caixa fixa e passa a
    //    acompanhar o estado da folha (ver o bloco Portas mais
    //    abaixo).
    //
    // ---------- As outras quatro passagens (comodos novos) ----------
    // QUARTO - 01, QUARTO - 02, COZINHA e BANHEIRO ganharam nesta
    // atualizacao EXATAMENTE o mesmo tratamento descrito acima (ver
    // `passages` em scenes/corridor-config.js e `sideRooms` em
    // scenes/house-config.js): cada uma passou a ser a divisoria fisica
    // entre o corredor e o comodo do outro lado, com vao recortado de
    // verdade na parede LATERAL, folha que gira e colisao que acompanha
    // o estado da folha.
    //
    // Nada abaixo trata "a porta do quarto" como caso especial: existe
    // uma LISTA de passagens e o mesmo codigo serve para todas. A unica
    // diferenca que sobrou entre elas e que a do MEU QUARTO continua
    // sendo exposta como `roomDoor` no fim do arquivo, porque a
    // historia manda nela (ver scripts/main.js e
    // cutscenes/sleep-sequence.js).
    //
    // A porta "ENTRADA & SAIDA" nao mudou em nada: continua peca parada,
    // so com o destaque visual.
    const sharedDoorDef = config.sharedDoor || null;

    // Todas as passagens da casa numa lista so, na ordem em que devem
    // ser lidas: a compartilhada com MEU QUARTO primeiro (para nao
    // mudar nada da ordem de antes) e as quatro novas depois.
    const passageDefs = [];
    if (sharedDoorDef) {
      passageDefs.push(sharedDoorDef);
    }
    (config.passages || []).forEach(function (passageDef) {
      passageDefs.push(passageDef);
    });

    function passageDefFor(doorDef) {
      if (!doorDef) {
        return null;
      }
      for (let i = 0; i < passageDefs.length; i++) {
        if (passageDefs[i].id === doorDef.id) {
          return passageDefs[i];
        }
      }
      return null;
    }

    function isPassageDoor(doorDef) {
      return !!passageDefFor(doorDef);
    }

    function isSharedDoor(doorDef) {
      return !!(sharedDoorDef && doorDef && doorDef.id === sharedDoorDef.id);
    }

    // As portas que sao passagem, agrupadas pela parede em que estao -
    // e daqui que sai o recorte do vao de cada parede, mais abaixo.
    const passageDoors = (config.doors || []).filter(isPassageDoor);

    function passageDoorsForSide(side) {
      return passageDoors.filter(function (doorDef) {
        return doorDef.side === side;
      });
    }

    // Vao livre da passagem: um pouco menor que a folha, que sobrepoe
    // a borda do recorte quando fechada (ver OPENING_MARGIN em
    // models/door-factory.js) - sem fresta de luz e sem z-fighting
    // entre folha e plano de parede.
    const DOORWAY_WIDTH = window.DoorFactory.OPENING_WIDTH;
    const DOORWAY_HEIGHT = window.DoorFactory.OPENING_HEIGHT;

    // Espessura da divisoria entre corredor e quarto: a propria
    // moldura da porta. Os planos das DUAS paredes (esta, em z = 0, e
    // a de entrada do quarto, recuada exatamente isto) ficam nas duas
    // faces da moldura, entao o vao fica forrado por ela dos dois
    // lados - nenhum vazio, nenhuma fresta, nenhuma parede coplanar
    // brigando por profundidade com a outra.
    // Do not place the two wall planes exactly on the front/back faces of
    // the casing. They are coplanar otherwise, and the PSX renderer can
    // alternate between the wall and casing, producing the flicker around
    // the shared door. A tiny clearance keeps the casing visually in front
    // of both walls without creating a readable gap.
    // Vem de DoorFactory (ver PARTITION_DEPTH la): o MESMO numero que a
    // parede de entrada de cada comodo usa para recuar (ver
    // scenes/side-room-scene.js e scripts/main.js). Enquanto este valor
    // vivia escrito aqui, o outro lado da divisoria recuava so
    // FRAME_DEPTH e o plano da parede do comodo cortava a moldura por
    // dentro - a porta aparecia enterrada na parede.
    const PARTITION_DEPTH = window.DoorFactory.PARTITION_DEPTH;

    // Onde o vao de cada passagem cai DENTRO do plano da parede dela,
    // no referencial local da propria parede (0 = centro da parede,
    // mesma convencao dos vaos de janela - ver
    // models/exterior-factory.js).
    //
    //  - Portas de extremidade ('end_a'/'end_b') ficam sempre
    //    centralizadas na parede (x = 0, ver o bloco Portas mais
    //    abaixo), entao o vao tambem.
    //  - Portas laterais ('left'/'right') ficam em `doorDef.offset` ao
    //    longo do corredor (Z do mundo). As duas paredes laterais sao
    //    planos de largura L girados em Y e posicionados em z = -L/2,
    //    entao o X local e o mesmo mapeamento ja usado pelos vaos das
    //    janelas, com o sinal de cada giro: a parede DIREITA
    //    (rotationY = -90) le `offset + L/2` e a ESQUERDA
    //    (rotationY = +90) le o oposto disso.
    function doorwayLocalX(doorDef) {
      if (doorDef.side === "left") {
        return -(doorDef.offset + L / 2);
      }
      if (doorDef.side === "right") {
        return doorDef.offset + L / 2;
      }
      return 0;
    }

    function doorwaysForSide(side) {
      return passageDoorsForSide(side).map(function (doorDef) {
        return {
          x: doorwayLocalX(doorDef),
          width: DOORWAY_WIDTH,
          height: DOORWAY_HEIGHT,
        };
      });
    }

    // ---------- Chão ----------
    const floorGeo = new THREE.PlaneGeometry(config.width, L);
    const floor = new THREE.Mesh(floorGeo, materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -L / 2);
    root.add(floor);

    // ---------- Tapete do corredor (decorativo, sem colisão) ----------
    if (config.carpet) {
      const carpetGroup = window.CarpetFactory.createCarpet(
        config,
        config.carpet,
        materials
      );
      // Mesmo centro do chão (0, 0, -L/2): fica automaticamente
      // centralizado na largura e no comprimento do corredor.
      carpetGroup.position.set(0, 0, -L / 2);
      root.add(carpetGroup);
    }

    // ---------- Detecção de superfície (som de passos) ----------
    // Usada por scripts/main.js + audio/footstep-audio.js para saber
    // se o jogador está pisando no tapete central acima ou no piso de
    // madeira do resto do corredor, e trocar o som de passos na hora
    // certa. Não recalcula nada: reaproveita exatamente a mesma
    // geometria do tapete (config.carpet + centro em (0, -L/2)) já
    // usada para desenhá-lo alguns quadros acima — se o tapete mudar
    // de tamanho/posição algum dia, a detecção acompanha sozinha.
    // Puramente informativa (não altera colisão nem visual nenhum).
    function getSurfaceAt(x, z) {
      if (!config.carpet) {
        return "madeira";
      }
      const halfCarpetWidth = config.carpet.width / 2;
      const carpetLength = Math.max(1, L - config.carpet.endMargin * 2);
      const halfCarpetLength = carpetLength / 2;
      const carpetCenterZ = -L / 2;
      const withinWidth = Math.abs(x) <= halfCarpetWidth;
      const withinLength = Math.abs(z - carpetCenterZ) <= halfCarpetLength;
      return withinWidth && withinLength ? "tapete" : "madeira";
    }

    // ---------- Teto ----------
    const ceilingGeo = new THREE.PlaneGeometry(config.width, L);
    const ceiling = new THREE.Mesh(ceilingGeo, materials.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, config.height, -L / 2);
    root.add(ceiling);

    // ---------- Paredes laterais ----------
    // Vão recortado nas paredes que têm janela (ver comentário grande
    // no topo de models/exterior-factory.js sobre o motivo: sem um
    // vão de verdade, mesmo com o vidro transparente, a própria
    // parede continuaria sólida bem atrás dele e esconderia a vista
    // externa adicionada mais abaixo). `windowsForSide` também é
    // usada pelo bloco "Vista externa (grama)", mais abaixo — mesma
    // fonte de dados (config.windows) dos dois lados, sempre
    // consistente.
    function windowsForSide(side) {
      return (config.windows || []).filter(function (w) {
        return w.side === side;
      });
    }

    // Tamanho do vão recortado — sempre um pouco menor que a moldura
    // externa da janela (ver HOLE_MARGIN em models/exterior-factory.js),
    // pra moldura de madeira (sempre opaca, sempre na frente da
    // parede) cobrir a borda do recorte por completo. HOLE_Y (posição
    // vertical do centro do vão, já no referencial local da parede)
    // vale para qualquer parede do jogo com janela, porque todas usam
    // a mesma WINDOW_CENTER_Y e o mesmo pé-direito (config.height).
    const HOLE_W = window.WindowFactory.WINDOW_WIDTH - window.ExteriorFactory.HOLE_MARGIN;
    const HOLE_H = window.WindowFactory.WINDOW_HEIGHT - window.ExteriorFactory.HOLE_MARGIN;
    const HOLE_Y = WINDOW_CENTER_Y - config.height / 2;

    const sideWallGeo = new THREE.PlaneGeometry(L, config.height);

    // Geometria de uma parede lateral, com TUDO que estiver recortado
    // nela: os vaos das janelas daquele lado (buracos fechados, no meio
    // da parede) e os vaos das PORTAS que sao passagem para os comodos
    // novos (abrem no chao e sobem, ver buildWallGeometryWithOpenings em
    // models/exterior-factory.js). Sem nada para recortar, devolve a
    // mesma PlaneGeometry cheia de sempre - ou seja, uma parede sem
    // janela nem passagem sai identica ao que era antes.
    //
    // Antes da rotacao, o X local destas paredes corresponde ao Z do
    // mundo (elas correm ao longo do comprimento do corredor): como o
    // grupo fica em position.z = -L/2, o centro do vao em X local e
    // `offset + L/2` na parede direita, e o oposto disso na esquerda
    // (ver doorwayLocalX acima) - a mesma conta para janelas e portas.
    function buildSideWallGeometry(side, holeSign) {
      const windows = windowsForSide(side);
      const doorways = doorwaysForSide(side);
      if (!windows.length && !doorways.length) {
        return sideWallGeo;
      }
      return window.ExteriorFactory.buildWallGeometryWithOpenings(
        L,
        config.height,
        windows.map(function (w) {
          return {
            width: HOLE_W,
            height: HOLE_H,
            x: holeSign * (w.offset + L / 2),
            y: HOLE_Y,
          };
        }),
        doorways
      );
    }

    // Parede esquerda (as portas QUARTO - 01 e QUARTO - 02 moram aqui,
    // ver corridor-config.js): nenhuma janela hoje, dois vaos de porta.
    const leftWall = new THREE.Mesh(
      buildSideWallGeometry("left", -1),
      materials.wallSide
    );
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-halfW, config.height / 2, -L / 2);
    root.add(leftWall);

    // Parede direita ("janela-meu-quarto" mora aqui, mais as portas
    // COZINHA e BANHEIRO): uma janela e dois vaos de porta na mesma
    // parede.
    const rightWall = new THREE.Mesh(
      buildSideWallGeometry("right", 1),
      materials.wallSide
    );
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(halfW, config.height / 2, -L / 2);
    root.add(rightWall);

    // ---------- Paredes das extremidades ----------
    const endWallGeo = new THREE.PlaneGeometry(config.width, config.height);

    // Parede da extremidade A: e a parede COMPARTILHADA com
    // "MEU QUARTO" (ver as constantes da passagem no topo desta
    // funcao). Com uma porta compartilhada configurada, ela deixa de
    // ser um plano cheio e passa a ter o vao da porta recortado de
    // verdade: e por ele que o jogador ve o quarto de dentro do
    // corredor e atravessa andando, sem troca de cena.
    const endAWallDoorways = doorwaysForSide("end_a");
    const endWallAGeo = endAWallDoorways.length
      ? window.ExteriorFactory.buildWallGeometryWithOpenings(
          config.width,
          config.height,
          [],
          endAWallDoorways
        )
      : endWallGeo;
    const endWallA = new THREE.Mesh(endWallAGeo, materials.wallEnd);
    endWallA.rotation.y = Math.PI;
    endWallA.position.set(0, config.height / 2, 0);
    root.add(endWallA);

    // Parede da extremidade B ("janela-entrada-saida" mora aqui): sem
    // nenhuma rotação, então o X local já é diretamente o X do mundo
    // — o centro do vão é só `winDef.offsetX`.
    const endBWindows = windowsForSide("end_b");
    const endWallBGeo = endBWindows.length
      ? window.ExteriorFactory.buildWallGeometryWithHoles(
          config.width,
          config.height,
          endBWindows.map(function (w) {
            return { width: HOLE_W, height: HOLE_H, x: w.offsetX, y: HOLE_Y };
          })
        )
      : endWallGeo;
    const endWallB = new THREE.Mesh(endWallBGeo, materials.wallEnd);
    endWallB.position.set(0, config.height / 2, -L);
    root.add(endWallB);

    // ---------- Revestimento externo (a FACHADA do corredor) ----------
    // A casca de FORA das paredes que dao para o terreno: a MESMA
    // geometria da parede (com os vaos de janela e de porta ja
    // recortados nela, de graca), 2 cm para fora, agora com o reboco
    // velho e mofado da fachada - ver createWallCladding em
    // models/exterior-factory.js e a receita em materials/textures.js.
    //
    // MOTIVO: as paredes sao planos DoubleSide, entao ate agora o lado
    // de fora da casa mostrava o reboco de DENTRO do corredor visto
    // pelas costas. Nada aqui mexe no interior: materials.wallSide e
    // materials.wallEnd continuam exatamente como estavam, nos mesmos
    // planos de sempre.
    //
    // Entram as duas laterais e a extremidade `end_b` (a da porta
    // ENTRADA & SAIDA, em z = -L). A extremidade `end_a` (endWallA,
    // z = 0) NAO entra: ela nao e fachada, e a divisoria com o
    // MEU QUARTO - comodo dos dois lados dela.
    //
    // Os trechos das laterais em que um dos quatro comodos encosta
    // tambem recebem a casca, e isso nao e problema: ali ela fica
    // prensada entre os dois planos de parede, dentro da espessura da
    // divisoria, e quem esta no comodo continua vendo o lambri dele.
    //
    // As cascas entram na lista `exteriorGrounds` - a mesma do chao de
    // grama, da estrada de terra, do gramado, da floresta e da neblina.
    // E ela que o setDaytime da cena percorre no amanhecer, e a casca
    // cumpre o mesmo contrato (setDaytime/setMorning), entao a fachada
    // amanhece junto com o resto do exterior sem nenhuma linha nova la
    // embaixo.
    [
      {
        wall: leftWall,
        name: "parede-externa-corredor-esquerda",
        material: materials.wallExteriorCorridor,
        dayMaterial: materials.wallExteriorCorridorDay,
      },
      {
        wall: rightWall,
        name: "parede-externa-corredor-direita",
        material: materials.wallExteriorCorridor,
        dayMaterial: materials.wallExteriorCorridorDay,
      },
      {
        wall: endWallB,
        name: "parede-externa-corredor-entrada",
        material: materials.wallExteriorEnd,
        dayMaterial: materials.wallExteriorEndDay,
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
      exteriorGrounds.push(cladding);
    });

    // ---------- Sólidos de colisão do "invólucro" do corredor ----------
    // Um sólido fino por parede: impede o jogador de atravessar
    // tanto as paredes quanto as portas (que ficam no mesmo plano).
    // Paredes laterais: com as passagens para os comodos novos abertas
    // nelas (QUARTO - 01 e QUARTO - 02 na esquerda, COZINHA e BANHEIRO
    // na direita), o solido de cada uma deixa de ser UM retangulo
    // corrido de ponta a ponta e passa a ser um TRECHO por pedaco de
    // parede que sobrou entre os vaos. E o que permite o jogador
    // atravessar cada porta andando; quem fecha ou libera o vao em si e
    // a colisao da folha da porta (bloco "Colisao da PASSAGEM" mais
    // abaixo), que acompanha o estado dela.
    //
    // Sem nenhuma passagem naquele lado, sai exatamente um solido
    // unico de -L a 0, identico ao de antes.
    // `ownerWall` e a malha da parede de onde estes trechos saem: e ela
    // que cada caixa passa a seguir, para a colisao sair junto se a
    // parede for EXCLUIDA no Editor (ver `owner` em scripts/collision.js).
    function pushSideWallSolids(side, minX, maxX, ownerWall) {
      const gaps = passageDoorsForSide(side)
        .map(function (doorDef) {
          return {
            from: doorDef.offset - DOORWAY_WIDTH / 2,
            to: doorDef.offset + DOORWAY_WIDTH / 2,
          };
        })
        .sort(function (a, b) {
          return a.from - b.from;
        });

      let z = -L;
      gaps.forEach(function (gap) {
        if (gap.from > z) {
          solids.push({ owner: ownerWall, minX: minX, maxX: maxX, minZ: z, maxZ: gap.from });
        }
        z = Math.max(z, gap.to);
      });
      if (z < 0) {
        solids.push({ owner: ownerWall, minX: minX, maxX: maxX, minZ: z, maxZ: 0 });
      }
    }

    pushSideWallSolids("left", -halfW - WALL_THICKNESS, -halfW, leftWall); // esquerda
    pushSideWallSolids("right", halfW, halfW + WALL_THICKNESS, rightWall); // direita
    // Extremidade A: com a passagem para "MEU QUARTO" aberta na
    // parede, o solido dela vira DOIS - um de cada lado do vao - em
    // vez de um so cobrindo a parede inteira. E o que permite o
    // jogador atravessar a porta andando (a colisao da propria folha,
    // que fecha ou libera esse vao, mora no bloco Portas mais abaixo).
    if (endAWallDoorways.length) {
      const passHalf = DOORWAY_WIDTH / 2;
      solids.push({ owner: endWallA, minX: -halfW - WALL_THICKNESS, maxX: -passHalf, minZ: -WALL_THICKNESS, maxZ: 0 });
      solids.push({ owner: endWallA, minX: passHalf, maxX: halfW + WALL_THICKNESS, minZ: -WALL_THICKNESS, maxZ: 0 });
    } else {
      solids.push({ owner: endWallA, minX: -halfW, maxX: halfW, minZ: -WALL_THICKNESS, maxZ: 0 }); // extremidade A
    }
    solids.push({ owner: endWallB, minX: -halfW, maxX: halfW, minZ: -L, maxZ: -L + WALL_THICKNESS }); // extremidade B

    // ---------- Luminária de teto (única fonte de luz) ----------
    const lamp = window.LampFactory.createCeilingLamp(materials);
    lamp.position.set(0, config.height - 0.02, -L / 2);
    root.add(lamp);
    if (lamp.update) {
      frameUpdaters.push(lamp.update);
    }

    // ---------- Portas ----------
    // Guarda a porta compartilhada com "MEU QUARTO" (a unica com folha
    // que gira) para o resto do jogo poder abrir/fechar ela: e a
    // divisoria entre as duas zonas da casa, entao ela nao pertence so
    // ao corredor (ver `roomDoor` no fim deste arquivo).
    let roomDoorBuilt = null;

    config.doors.forEach(function (doorDef) {
      const shared = isSharedDoor(doorDef);
      // Toda porta que e PASSAGEM (a do MEU QUARTO e as quatro dos
      // comodos novos) tem folha que gira de verdade; a ENTRADA & SAIDA
      // continua sendo uma peca parada, como sempre.
      const passageDef = passageDefFor(doorDef);
      const passage = !!passageDef;
      const built = window.DoorFactory.createDoor(materials, { hinged: passage });
      const group = built.group;

      let x = 0;
      let z = 0;
      let rotationY = 0;
      let signOffsetAxis = "x"; // eixo ao longo do qual a placa se desloca da porta

      if (doorDef.side === "end_a") {
        x = 0;
        // Porta compartilhada: a moldura fica CENTRADA na espessura da
        // divisoria (plano desta parede em z = 0, plano da parede de
        // entrada do quarto em z = PARTITION_DEPTH), para forrar o vao
        // dos dois lados. As outras portas continuam apenas encostadas
        // no plano da parede, como sempre (0.02).
        z = passage ? PARTITION_DEPTH / 2 : 0.02;
        rotationY = Math.PI;
      } else if (doorDef.side === "end_b") {
        x = 0;
        z = -L - 0.02;
        rotationY = 0;
      } else if (doorDef.side === "left") {
        // Mesma regra da porta de extremidade acima, agora na parede
        // lateral: sendo passagem, a moldura fica CENTRADA na espessura
        // da divisoria (o plano desta parede em x = -halfW e o plano da
        // parede de entrada do comodo recuado exatamente FRAME_DEPTH),
        // para forrar o vao dos dois lados. Nao sendo, continua apenas
        // encostada no plano da parede, como sempre (0.02).
        x = passage ? -halfW - PARTITION_DEPTH / 2 : -halfW - 0.02;
        z = doorDef.offset;
        rotationY = Math.PI / 2;
      } else if (doorDef.side === "right") {
        x = passage ? halfW + PARTITION_DEPTH / 2 : halfW + 0.02;
        z = doorDef.offset;
        rotationY = -Math.PI / 2;
      }

      group.position.set(x, 0, z);
      group.rotation.y = rotationY;
      root.add(group);

      // Caixa de colisão extra da porta (levemente saliente da parede),
      // além do invólucro geral — cobre o requisito de "colisão nas portas".
      // CORRECAO (colisao "muito a frente"/"muito atras" da porta): doorSpan
      // e a meia-profundidade da caixa no eixo perpendicular a parede (o
      // eixo por onde o jogador entra/sai do vao). Antes era um numero fixo
      // (0.25, ou seja, 0.5 de profundidade total) sem relacao nenhuma com o
      // tamanho real da porta - bem maior que a moldura (PARTITION_DEPTH,
      // ~0.22) e ate maior que a propria parede (WALL_THICKNESS, 0.3), entao
      // a colisao sobrava bastante pra dentro do corredor e do comodo dos
      // dois lados, travando o jogador antes mesmo dele chegar perto da
      // porta. Usando PARTITION_DEPTH (a mesma constante que define a
      // espessura real da divisoria onde a porta vive, ja exportada por
      // DoorFactory) a caixa passa a cobrir só a porta em si.
      const doorHalfW = window.DoorFactory.DOOR_WIDTH / 2 + 0.1;
      const doorSpan = window.DoorFactory.PARTITION_DEPTH / 2;
      if (passage) {
        // ---------- Colisao da PASSAGEM ----------
        // Esta porta e a divisoria fisica entre os dois comodos, entao a
        // colisao dela nao pode ser uma caixa fixa como nas outras 5:
        // ela acompanha o estado da folha.
        //
        //  - FECHADA: a caixa cobre o vao inteiro (ninguem passa para o
        //    quarto, igual a qualquer parede).
        //  - ABERTA: o vao fica LIVRE (o jogador atravessa andando) e a
        //    caixa passa a cobrir so a propria folha encostada de lado,
        //    para ninguem atravessar a madeira dela.
        //  - GIRANDO: passagem livre - a folha esta em movimento, e uma
        //    caixa acompanhando o giro so serviria para prender o
        //    jogador dentro dela.
        //
        // E sempre a MESMA caixa (`passageSolid`), reescrita por dentro
        // a cada quadro: a lista de solidos do mundo guarda a referencia
        // dela (ver scripts/house-world.js), entao nada precisa ser
        // adicionado ou removido de lista nenhuma quando a porta abre.
        //
        // CORRECAO (colisao "virada de lado" nas portas laterais): a caixa
        // FECHADA precisa respeitar em qual parede a porta esta. Nas
        // paredes de EXTREMIDADE (end_a/end_b) a porta encara o eixo Z, entao
        // a LARGURA dela (doorHalfW) fica no eixo X e a PROFUNDIDADE
        // (doorSpan) no eixo Z - exatamente como estava. Mas nas paredes
        // LATERAIS (left/right, usadas por QUARTO-01, QUARTO-02, COZINHA e
        // BANHEIRO) a porta esta girada 90 graus: e a LARGURA dela que corre
        // ao longo do eixo Z (o comprimento do corredor) e a PROFUNDIDADE
        // que fica no eixo X (por onde o jogador entra/sai do comodo). O
        // codigo antigo usava sempre a mesma combinacao (doorHalfW em X,
        // doorSpan em Z) para as 5 portas de passagem, entao nas 4 portas
        // laterais a caixa saia com os eixos trocados: fina demais ao longo
        // da parede e comprida demais para dentro do corredor/comodo -
        // exatamente a "colisao virada de lado" que travava o jogador antes
        // dele conseguir chegar perto da porta. Mesma logica de eixos ja
        // usada logo abaixo, no bloco das portas que NAO abrem.
        const sideways = doorDef.side === "left" || doorDef.side === "right";
        const closedBox = sideways
          ? {
              minX: x - doorSpan,
              maxX: x + doorSpan,
              minZ: z - doorHalfW,
              maxZ: z + doorHalfW,
            }
          : {
              minX: x - doorHalfW,
              maxX: x + doorHalfW,
              minZ: z - doorSpan,
              maxZ: z + doorSpan,
            };

        // Caixa da folha ABERTA. No espaco local da porta, a folha gira
        // 90 graus em torno da dobradica (HINGE_X) e termina de lado,
        // atravessada no vao: a espessura dela passa a ocupar o X local
        // e o comprimento passa a ocupar o Z local. Todos os numeros
        // saem de DoorFactory (a mesma geometria que esta sendo
        // desenhada) e a conversao para o mundo reaproveita o transform
        // das zonas da casa (ver scripts/house-world.js) - nenhuma conta
        // de seno/cosseno repetida aqui.
        const leafHalfDepth = window.DoorFactory.DOOR_DEPTH / 2;
        const hingeX = window.DoorFactory.HINGE_X;
        const panelX = -hingeX;
        const panelZ = -window.DoorFactory.PANEL_RECESS;
        const halfLeaf = window.DoorFactory.DOOR_WIDTH / 2;
        const leafMargin = 0.02;
        const openBox = window.HouseWorld.createTransform({
          x: x,
          z: z,
          rotationY: rotationY,
        }).transformBox({
          minX: hingeX - leafHalfDepth - leafMargin,
          maxX: hingeX + leafHalfDepth + leafMargin,
          minZ: panelZ - panelX - halfLeaf - leafMargin,
          maxZ: panelZ - panelX + halfLeaf + leafMargin,
        });

        const passageSolid = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
        passageSolid.owner = group;
        // Quem manda nos limites desta caixa e a propria cena, aqui embaixo
        // (clearPassage/applyPassage), e nao a posicao do movel: com a
        // porta aberta ela vai de proposito para 1e6, LONGE do desenho da
        // porta. Declarar isso e o que a mantem fora das duas varreduras
        // automaticas da colisao - a que cola a caixa no modelo e a que
        // apaga caixa solta no vazio (ver `sceneDriven` em
        // scripts/collision.js). Sem isso, abrir a porta e esperar a
        // faxina apagava a colisao dela para o resto da partida.
        passageSolid.sceneDriven = true;
        solids.push(passageSolid);

        const clearPassage = function () {
          passageSolid.minX = 1e6;
          passageSolid.maxX = 1e6;
          passageSolid.minZ = 1e6;
          passageSolid.maxZ = 1e6;
        };

        const applyPassage = function (box, playerPos, playerRadius) {
          // Nunca prende o jogador: se ele estiver DENTRO da caixa que
          // passaria a valer agora (ex.: fechou a porta parado no meio
          // do vao), ela fica desligada ate ele sair de la - a colisao
          // eixo a eixo de scripts/collision.js bloquearia TODAS as
          // direcoes se o centro dele ficasse dentro do solido.
          if (
            playerPos &&
            window.Collision.circleHitsBox(
              playerPos.x,
              playerPos.z,
              playerRadius || 0.35,
              box
            )
          ) {
            clearPassage();
            return;
          }
          passageSolid.minX = box.minX;
          passageSolid.maxX = box.maxX;
          passageSolid.minZ = box.minZ;
          passageSolid.maxZ = box.maxZ;
        };

        clearPassage();
        frameUpdaters.push(function (delta, elapsed, playerPos, playerRadius) {
          const progress = built.getOpenProgress();
          if (progress <= 0.001) {
            applyPassage(closedBox, playerPos, playerRadius);
          } else if (progress >= 0.999) {
            applyPassage(openBox, playerPos, playerRadius);
          } else {
            clearPassage();
          }
        });

        // Giro suave da folha + contorno da moldura acompanhando o da
        // folha (ver `update` em models/door-factory.js). So esta porta
        // precisa: as outras 5 nao tem peca movel nenhuma.
        frameUpdaters.push(built.update);
      } else if (doorDef.side === "end_a" || doorDef.side === "end_b") {
        solids.push({
          owner: group,
          minX: x - doorHalfW,
          maxX: x + doorHalfW,
          minZ: z - doorSpan,
          maxZ: z + doorSpan,
        });
      } else {
        solids.push({
          owner: group,
          minX: x - doorSpan,
          maxX: x + doorSpan,
          minZ: z - doorHalfW,
          maxZ: z + doorHalfW,
        });
      }

      // Placa de identificação, montada acima da porta.
      // O deslocamento em Z precisa ser grande o bastante para a placa
      // ficar claramente à frente do plano da parede — com um valor
      // pequeno demais ela acaba coincidindo com o plano da parede
      // (z-fighting), o que fazia a placa piscar e "entrar" na parede
      // dependendo do ângulo da câmera.
      const sign = window.SignFactory.createSign(doorDef.label, 1.1, 0.28);
      const signY = window.DoorFactory.DOOR_HEIGHT + 0.35;
      sign.position.set(0, signY, 0.16);
      group.add(sign);

      interactables.push({
        id: doorDef.id,
        kind: "door",
        label: doorDef.label,
        outline: built.outline,
        // Unica porta com acao propria: a compartilhada com
        // "MEU QUARTO". `toggleDoor` abre/fecha a folha de verdade (giro
        // animado) e `isOpen` diz o estado atual - quem decide QUANDO
        // isso e permitido continua sendo a historia (ver o caso "door"
        // em scripts/main.js e objectives/objective-config.js). Nas
        // outras 5 portas os dois campos ficam undefined e nada muda:
        // continua so o destaque visual, igual a sempre.
        toggleDoor: passage
          ? function () {
              if (built.isOpen()) {
                built.closeDoor();
              } else {
                built.openDoor();
              }
            }
          : undefined,
        isOpen: passage ? built.isOpen : undefined,
        // Sem ação própria ainda: só o destaque visual funciona (ver
        // README) — "Interagir" não faz nada quando a porta está em
        // destaque, igual ao comportamento ja existente.
      });

      if (passage) {
        // `openAtStart`: a folha ja nasce aberta, sem giro animado no
        // primeiro segundo de jogo (ver setOpenImmediate em
        // models/door-factory.js e os comentarios de `sharedDoor` e
        // `passages` em scenes/corridor-config.js). E o que faz o comodo
        // do outro lado ja aparecer do corredor desde o primeiro quadro.
        if (passageDef.openAtStart) {
          built.setOpenImmediate(true);
        }
      }

      if (shared) {
        // So a porta do MEU QUARTO e exposta como `roomDoor` no fim do
        // arquivo: e a unica em que a historia manda (ver
        // scripts/main.js e cutscenes/sleep-sequence.js).
        roomDoorBuilt = built;
      }
    });

    // ---------- Quadros decorativos ----------
    (config.pictures || []).forEach(function (picDef) {
      const picGroup = window.PictureFactory.createPicture(
        picDef.image,
        picDef.size,
        materials
      );

      let x = 0;
      let rotationY = 0;
      if (picDef.side === "left") {
        x = -halfW + 0.025; // levemente à frente da parede, do lado de dentro
        rotationY = Math.PI / 2;
      } else if (picDef.side === "right") {
        x = halfW - 0.025;
        rotationY = -Math.PI / 2;
      }

      picGroup.position.set(x, PICTURE_CENTER_Y, picDef.offset);
      picGroup.rotation.y = rotationY;
      root.add(picGroup);
    });

    // ---------- Relógio de parede decorativo ----------
    // Mesma lógica de posicionamento dos quadros acima (modelo
    // "olha" para +Z local; aqui só decidimos parede + rotação) — a
    // diferença é que a peça vem de um .glb importado (ver
    // models/clock-factory.js), não de geometria procedural.
    (config.clocks || []).forEach(function (clockDef) {
      const built = window.ClockFactory.createClock();
      const clockGroup = built.group;

      let x = 0;
      let rotationY = 0;
      if (clockDef.side === "left") {
        x = -halfW + 0.025; // levemente à frente da parede, do lado de dentro
        rotationY = Math.PI / 2;
      } else if (clockDef.side === "right") {
        x = halfW - 0.025;
        rotationY = -Math.PI / 2;
      }

      clockGroup.position.set(x, CLOCK_CENTER_Y, clockDef.offset);
      clockGroup.rotation.y = rotationY;
      root.add(clockGroup);
    });

    // ---------- Interruptor de luz do corredor ----------
    // Mesma convenção 'side'/'offset' dos quadros acima. Entra na mesma
    // lista única de interativos (kind: "lightSwitch") — o
    // InteractionSystem não precisa saber nada de especial sobre ele,
    // só usa a "outline" como qualquer outro objeto. A ação de
    // "Interagir" alterna o estado visual do próprio interruptor
    // (built.toggle) e, na sequência, aplica esse novo estado à
    // luminária de teto já construída acima (lamp.setPower) — a única
    // ligação entre os dois, mantendo LampFactory e SwitchFactory
    // totalmente independentes um do outro.
    (config.lightSwitches || []).forEach(function (switchDef) {
      const built = window.SwitchFactory.createSwitch(materials);
      const group = built.group;

      let x = 0;
      let rotationY = 0;
      if (switchDef.side === "left") {
        x = -halfW + 0.025;
        rotationY = Math.PI / 2;
      } else if (switchDef.side === "right") {
        x = halfW - 0.025;
        rotationY = -Math.PI / 2;
      }

      group.position.set(x, SWITCH_CENTER_Y, switchDef.offset);
      group.rotation.y = rotationY;
      root.add(group);

      interactables.push({
        id: switchDef.id,
        kind: "lightSwitch",
        outline: built.outline,
        toggleSwitch: function () {
          built.toggle();
          lamp.setPower(built.isOn());
        },
      });
      frameUpdaters.push(built.update);
    });

    // ---------- Escrivaninha (gaveta interativa + vaso + telefone) ----------
    (config.desks || []).forEach(function (deskDef) {
      const built = window.DeskFactory.createDesk(materials);
      const group = built.group;

      let x = 0;
      let rotationY = 0;
      if (deskDef.side === "left") {
        x = -halfW - 0.02;
        rotationY = Math.PI / 2;
      } else if (deskDef.side === "right") {
        x = halfW + 0.02;
        rotationY = -Math.PI / 2;
      }
      const z = deskDef.offset;

      group.position.set(x, 0, z);
      group.rotation.y = rotationY;
      root.add(group);

      // Colisão: caixa cobrindo a extensão da escrivaninha, da parede
      // até sua frente, para o jogador não conseguir atravessá-la.
      const deskMargin = 0.05;
      if (deskDef.side === "left") {
        solids.push({
          owner: group,
          minX: x,
          maxX: x + window.DeskFactory.DESK_DEPTH + deskMargin,
          minZ: z - window.DeskFactory.DESK_WIDTH / 2 - deskMargin,
          maxZ: z + window.DeskFactory.DESK_WIDTH / 2 + deskMargin,
        });
      } else if (deskDef.side === "right") {
        solids.push({
          owner: group,
          minX: x - window.DeskFactory.DESK_DEPTH - deskMargin,
          maxX: x,
          minZ: z - window.DeskFactory.DESK_WIDTH / 2 - deskMargin,
          maxZ: z + window.DeskFactory.DESK_WIDTH / 2 + deskMargin,
        });
      }

      // Gaveta e telefone entram na mesma lista única de interativos.
      // Cada um só precisa de sua "outline" — o InteractionSystem lê a
      // posição-mundo diretamente dela a cada quadro (o que já cobre
      // corretamente a gaveta deslizando e o escalonamento do conjunto
      // inteiro, ver DESK_SCALE em DeskFactory), sem precisar calcular
      // nada aqui.
      // A gaveta expõe, além do alternar de sempre, abrir/fechar por
      // comando e o acesso à carta guardada dentro dela — é o que o
      // pop-up da gaveta do objetivo "LER A CARTA" usa (ver
      // models/desk-factory.js, interface/drawer-popup.js e
      // scripts/main.js).
      interactables.push({
        id: deskDef.id + "-gaveta",
        kind: "drawer",
        outline: built.drawerOutline,
        toggleDrawer: built.toggleDrawer,
        openDrawer: built.openDrawer,
        closeDrawer: built.closeDrawer,
        isDrawerOpen: built.isDrawerOpen,
        takeNote: built.takeDrawerNote,
        hasNote: built.hasDrawerNote,
      });

      interactables.push({
        id: deskDef.id + "-telefone",
        kind: "phone",
        outline: built.phoneOutline,
        interact: built.interactPhone,
      });

      frameUpdaters.push(built.update);
    });

    // ---------- Vasos de planta decorativos ----------
    // Distância do eixo central do vaso até o plano da parede (o vaso é
    // praticamente redondo visto de cima, então sua origem local fica no
    // próprio centro — diferente da escrivaninha, cujo encosto fica em
    // z/x = 0). Mantém o vaso visivelmente encostado na parede sem
    // atravessá-la.
    const PLANT_WALL_INSET = 0.45;

    (config.plants || []).forEach(function (plantDef) {
      const plant = window.PottedPlantFactory.createPottedPlant(materials);

      let x = 0;
      let rotationY = 0;
      if (plantDef.side === "left") {
        x = -halfW + PLANT_WALL_INSET;
        rotationY = Math.PI / 2;
      } else if (plantDef.side === "right") {
        x = halfW - PLANT_WALL_INSET;
        rotationY = -Math.PI / 2;
      }
      const z = plantDef.offset;

      plant.position.set(x, 0, z);
      plant.rotation.y = rotationY;
      root.add(plant);

      // Sólido simples (footprint do vaso, aproximado por um quadrado)
      // para o jogador não conseguir atravessá-lo — mesmo princípio da
      // escrivaninha, só que aqui não há gaveta nem telefone: o vaso
      // inteiro não entra na lista de interativos, é só um obstáculo.
      const half = window.PottedPlantFactory.FOOTPRINT_RADIUS + 0.05;
      solids.push({
        owner: plant,
        minX: x - half,
        maxX: x + half,
        minZ: z - half,
        maxZ: z + half,
      });
    });

    // ---------- Varanda da entrada ----------
    // A varanda da porta ENTRADA & SAIDA (ver models/porch-factory.js):
    // piso avancando da fachada, muro cercando esse piso, pilares do piso
    // ao teto e o tapete vermelho de boas-vindas em frente a porta. Peca
    // 100% EXTERNA - nenhum vertice dela cruza a linha da fachada (a
    // propria fabrica tem uma trava que garante isso e reclama no console
    // se um dia deixar de valer), entao NADA do interior do corredor muda
    // por causa dela.
    //
    // Montada aqui, ANTES do bloco da vista externa logo abaixo, por dois
    // motivos: (1) o corredor e a zona de referencia da casa (fica na
    // origem, sem giro - ver scenes/house-config.js), entao as
    // coordenadas locais dele SAO as do mundo e a varanda nao precisa de
    // conversao nenhuma; (2) o gramado, a floresta e a neblina daquela
    // janela precisam do RETANGULO dela antes de existirem, para nao
    // sortear nenhum tufo e nenhuma arvore dentro da varanda.
    // Os retangulos dos quatro comodos laterais, em coordenadas do MUNDO
    // (paredes inclusas). Calculados AQUI, antes da varanda, por dois
    // motivos: a varanda precisa deles para saber onde ficam as duas ALAS
    // da frente da casa (e ate onde o muro dela vai, ver o item 3 das
    // correcoes no topo de models/porch-factory.js), e o bloco da vista
    // externa logo abaixo usa a MESMA lista, sem calcular duas vezes.
    const sideRoomFootprints = window.SideRoomScene
      ? window.SideRoomScene.footprints(config)
      : [];

    const porch = window.PorchFactory
      ? window.PorchFactory.build(materials, {
          corridorConfig: config,
          // As alas da casa: a fabrica escolhe, de cada lado, a mais
          // proxima da fachada e leva o muro em volta dela.
          wings: sideRoomFootprints,
          // O X da porta ENTRADA & SAIDA: o vao do muro e o tapete se
          // alinham NELA, e nao num numero solto (ver o bloco Portas
          // acima - as portas de extremidade ficam em x = 0 hoje).
          doorX: 0,
        })
      : null;

    let porchLamp = null;
    let porchSwitch = null;
    if (porch) {
      root.add(porch.root);
      // Mesma lista do chao de grama, da estrada de terra, do gramado, da
      // mata, da nevoa e da fachada: a varanda cumpre o mesmo contrato
      // (setDaytime/setMorning), entao amanhece junto com o resto do
      // exterior sem nenhuma linha nova no setDaytime() da cena la
      // embaixo. Nao entra em frameUpdaters - nada nela se move.
      exteriorGrounds.push(porch);
      // Muro e pilares viram colisao; o piso nao (ver o bloco Colisao no
      // fim de models/porch-factory.js).
      porch.solids.forEach(function (box) {
        // Cada caixa ja chega com o `owner` dela (a alvenaria da varanda,
        // ver models/porch-factory.js); a varanda inteira serve de dono
        // reserva, para nenhuma caixa da varanda ficar orfa se o modelo
        // deixar de marcar alguma (ver `owner` em scripts/collision.js).
        if (!box.owner) box.owner = porch.root;
        solids.push(box);
      });
    }


    // ---------- Luz e interruptor exclusivos da varanda ----------
    // Mesma luminaria de teto do corredor e dos comodos laterais
    // (LampFactory.createCeilingLamp) e mesmo interruptor de parede
    // (SwitchFactory): nenhuma peca nova, so uma instancia a mais montada
    // aqui e ligada por `setPower`, igual ao bloco do interruptor do
    // corredor mais acima.
    //
    // A posicao sai TODA da planta da varanda, nunca de numero solto. O
    // detalhe que muda em relacao ao corredor: o forro da varanda e
    // INCLINADO - desce `coverRise` metros ao longo de `coverSpan`, da
    // fachada para a ponta do beiral (ver COVER_RISE e o underAt() em
    // models/porch-factory.js). Ou seja, a altura do teto DEPENDE do z, e
    // nao existe um pe-direito unico para usar como no corredor: a
    // luminaria interpola o forro no proprio z em que ela esta.
    const porchCfg = config.porch || {};
    const porchLightCfg = porchCfg.porchLight || {};
    if (porch && porchLightCfg.enabled) {
      const porchPlan = porch.plan;

      // Z: meio da varanda, medido da fachada (frontZ) para FORA da casa.
      const lampZ =
        porchPlan.frontZ - porchPlan.depth / 2 + (porchLightCfg.z || 0);

      // Y: a face de BAIXO do forro naquele z (interpolacao simples entre
      // a fachada e a ponta do beiral), menos a mesma folga de 0.02 que a
      // luminaria do corredor usa - o bastante para a canopla nao
      // atravessar a laje. A origem do grupo da luminaria E o teto: o
      // cordao, a cupula e o bulbo pendem em y NEGATIVO a partir dela
      // (ver models/lamp-factory.js), entao este ponto e o do teto e nao
      // o da lampada.
      const slope = (porchPlan.frontZ - lampZ) / porchPlan.coverSpan;
      const ceilingY = porchPlan.underWallY - porchPlan.coverRise * slope;
      const lampY = ceilingY - 0.02 + (porchLightCfg.y || 0);

      porchLamp = window.LampFactory.createCeilingLamp(materials);
      // X: alinhada com a porta de ENTRADA & SAIDA, o mesmo X de onde o
      // vao do muro e o tapete de boas-vindas nascem.
      porchLamp.position.set(
        porchPlan.doorX + (porchLightCfg.x || 0),
        lampY,
        lampZ
      );
      root.add(porchLamp);
      if (porchLamp.update) {
        frameUpdaters.push(porchLamp.update);
      }
    }

    // O interruptor fica na parede da FACHADA, na entrada da varanda, do
    // lado de fora dela (z = frontZ) e virado para dentro da varanda -
    // dai o giro de 180 graus. So monta junto com a luminaria: sem ela nao
    // ha nada para acender.
    if (
      porch &&
      porchCfg.porchSwitch &&
      porchCfg.porchSwitch.enabled &&
      porchLamp
    ) {
      const built = window.SwitchFactory.createSwitch(materials);
      const group = built.group;

      group.position.set(
        porchCfg.porchSwitch.x,
        porchCfg.porchSwitch.y,
        porch.plan.frontZ - 0.025
      );
      group.rotation.y = Math.PI;
      root.add(group);
      porchSwitch = built;

      interactables.push({
        id: "interruptor-varanda",
        kind: "lightSwitch",
        outline: built.outline,
        toggleSwitch: function () {
          built.toggle();
          porchLamp.setPower(built.isOn());
        },
      });
      frameUpdaters.push(built.update);
    }

    // ---------- Pecas decorativas da varanda ----------
    // As quatro pecas que o jogador enviou como .glb (planta, cadeira de
    // plastico, churrasqueira e varal com roupa), apoiadas no piso da
    // varanda da entrada. Mesmo sistema de importacao de todos os outros
    // modelos do jogo (ver models/porch-plant-factory.js, que documenta o
    // caminho inteiro), e mesmo desenho de bloco que a mobilia dos quatro
    // comodos laterais usa (ver FLOOR_PROPS e CORNERS em
    // scenes/side-room-scene.js): uma TABELA que liga a lista de dados a
    // fabrica correspondente, e UM bloco que encosta a peca no canto,
    // calcula a colisao e a poe no piso. Peca decorativa nova na varanda
    // daqui pra frente e uma linha nesta tabela e uma lista em
    // `porch.props` (scenes/corridor-config.js), e nada mais.
    //
    // `create` e chamada na hora de montar, nunca na definicao do array:
    // as fabricas moram em window e sao carregadas por <script> em
    // index.html, entao ler window.XFactory aqui em cima dependeria da
    // ordem de carregamento. Fabrica ausente = aviso no console e a
    // varanda montada sem aquela peca; o boot nunca cai por causa de
    // decoracao.
    const PORCH_PROPS = [
      {
        dataKey: "grills",
        label: "churrasqueira",
        create: function () {
          return window.BarbecueGrillFactory
            ? window.BarbecueGrillFactory.createBarbecueGrill()
            : null;
        },
      },
      {
        dataKey: "plasticChairs",
        label: "cadeira de plastico",
        create: function () {
          return window.PlasticChairFactory
            ? window.PlasticChairFactory.createPlasticChair()
            : null;
        },
      },
      {
        dataKey: "porchPlants",
        label: "planta da varanda",
        create: function () {
          return window.PorchPlantFactory
            ? window.PorchPlantFactory.createPorchPlant()
            : null;
        },
      },
      {
        dataKey: "clotheslines",
        label: "varal com roupa",
        create: function () {
          return window.ClotheslineFactory
            ? window.ClotheslineFactory.createClothesline()
            : null;
        },
      },
    ];

    // Os quatro cantos da varanda, no mesmo espirito da tabela CORNERS de
    // scenes/side-room-scene.js: cada canto diz de qual parede de cada
    // eixo a peca encosta, e a conta de posicao logo abaixo e UMA SO para
    // as quatro opcoes e para qualquer peca. "fachada" e a parede da casa
    // (o lado de dentro da varanda) e "frente" e o muro da rua.
    const PORCH_CORNERS = {
      "fachada-esquerda": { x: "esquerda", z: "fachada" },
      "fachada-direita": { x: "direita", z: "fachada" },
      "frente-esquerda": { x: "esquerda", z: "frente" },
      "frente-direita": { x: "direita", z: "frente" },
    };

    if (porch) {
      const porchProps = (config.porch && config.porch.props) || {};
      const plan = porch.plan;

      // Mesma folga de encaixe (2 cm) que a mobilia dos comodos usa contra
      // a parede, e a mesma margem de colisao (5 cm).
      const PORCH_PROP_GAP = 0.02;
      const PORCH_PROP_MARGIN = 0.05;

      // ---------- As tres linhas que limitam o piso ----------
      // Nenhuma escrita na mao: todas saem da planta da varanda (ver
      // models/porch-factory.js).
      //
      // Lateral: a face INTERNA do pilar de quina, e nao a do muro. Os
      // dois pilares de cada lado (um na frente, um na fachada) avancam
      // PILLAR - WALL_T mais para dentro do que o muro, e uma peca
      // encostada no muro entre eles ficaria com a quina DENTRO de um
      // pilar. Usar a linha mais restritiva das duas resolve isso para
      // qualquer `depthOffset`, sem caso especial.
      const porchLateralX = plan.deckHalfX - plan.pillarSize;
      // Casa: a face externa da parede de ENTRADA & SAIDA - a mesma linha
      // que a varanda inteira nao pode cruzar.
      const porchHouseZ = plan.frontZ;
      // Rua: a face de tras do muro da frente ou a dos pilares da frente,
      // a que estiver mais para dentro (pelo mesmo motivo da lateral).
      const porchFrontZ = Math.max(
        plan.deckFrontZ + plan.wallThickness,
        plan.pillarLineZ + plan.pillarSize / 2
      );

      PORCH_PROPS.forEach(function (spec) {
        (porchProps[spec.dataKey] || []).forEach(function (def) {
          const cornerKey = def.corner || "fachada-direita";
          const cornerSpec = PORCH_CORNERS[cornerKey];
          if (!cornerSpec) {
            // Canto que nao existe (erro de digitacao nos dados): avisa e
            // segue sem a peca, em vez de montar ela no lugar errado.
            console.error(
              "CorridorScene: canto de varanda desconhecido '" +
                cornerKey +
                "' na " +
                spec.label +
                " - a peca nao vai aparecer. Cantos validos: " +
                Object.keys(PORCH_CORNERS).join(", ") +
                "."
            );
            return;
          }

          const built = spec.create();
          if (!built || !built.group) {
            console.error(
              "CorridorScene: a fabrica da " +
                spec.label +
                " nao esta carregada - a peca nao vai aparecer na varanda. " +
                "Confira o <script> dela em index.html."
            );
            return;
          }

          // A peca nasce centralizada na propria base (ver a convencao de
          // espaco local nas fabricas), entao aqui basta decidir o centro
          // (x, z) dela dentro da varanda.
          const rotationY = def.rotationY || 0;
          const propHalfW = built.width / 2;
          const propHalfD = built.depth / 2;
          // Metade do contorno da base JA projetada nos eixos do mundo
          // depois do giro - a mesma trigonometria da mobilia dos comodos
          // laterais e da caixa de papelao do MEU QUARTO. Vale para
          // qualquer angulo, inclusive os que nao sao multiplos de 90.
          const boxHalfX =
            Math.abs(propHalfW * Math.cos(rotationY)) +
            Math.abs(propHalfD * Math.sin(rotationY));
          const boxHalfZ =
            Math.abs(propHalfW * Math.sin(rotationY)) +
            Math.abs(propHalfD * Math.cos(rotationY));

          const wallOffset = def.wallOffset || 0;
          const depthOffset = def.depthOffset || 0;
          const elevation = def.elevation || 0;

          const x =
            cornerSpec.x === "esquerda"
              ? -porchLateralX + PORCH_PROP_GAP + boxHalfX + wallOffset
              : porchLateralX - PORCH_PROP_GAP - boxHalfX - wallOffset;
          const z =
            cornerSpec.z === "fachada"
              ? porchHouseZ - PORCH_PROP_GAP - boxHalfZ - depthOffset
              : porchFrontZ + PORCH_PROP_GAP + boxHalfZ + depthOffset;

          // ---------- Tres avisos (nenhum impede nada) ----------
          // Mesmo espirito dos avisos do bloco de mobilia dos comodos
          // laterais: melhor descobrir pelo console do que caminhando
          // dentro de um movel.
          if (Math.abs(x) + boxHalfX > porchLateralX + 0.001) {
            console.warn(
              "CorridorScene: a " +
                spec.label +
                " da varanda com wallOffset " +
                wallOffset +
                " passa da linha dos pilares - reveja `porch.props` em " +
                "scenes/corridor-config.js."
            );
          }
          if (z - boxHalfZ < porchFrontZ - 0.001 || z + boxHalfZ > porchHouseZ + 0.001) {
            console.warn(
              "CorridorScene: a " +
                spec.label +
                " da varanda com depthOffset " +
                depthOffset +
                " passa do muro da frente ou da fachada - reveja " +
                "`porch.props` em scenes/corridor-config.js."
            );
          }
          // O tapete de boas-vindas e o caminho da porta: a unica parte da
          // varanda que precisa continuar livre.
          const welcome = plan.mat;
          if (
            Math.abs(x - welcome.x) < boxHalfX + welcome.width / 2 &&
            Math.abs(z - welcome.z) < boxHalfZ + welcome.depth / 2
          ) {
            console.warn(
              "CorridorScene: a " +
                spec.label +
                " da varanda esta em cima do tapete de boas-vindas, na " +
                "frente da porta ENTRADA & SAIDA - reveja `porch.props` em " +
                "scenes/corridor-config.js."
            );
          }

          // Y = plan.deckTop, e nao 0: o piso da varanda nasce 20 cm acima
          // da grama (ver models/porch-factory.js). Sem isso a peca
          // afundaria esses 20 cm na laje. `elevation` soma a isso, para as
          // pecas que ficam no ar (hoje so o varal).
          built.group.position.set(x, plan.deckTop + elevation, z);
          built.group.rotation.y = rotationY;
          root.add(built.group);

          // Mesma lista do chao de grama, da estrada, do gramado, da mata,
          // da nevoa, da fachada, da varanda e das flores: as pecas vivem
          // do lado de FORA, entao amanhecem junto com o resto do exterior
          // (setDaytime/setMorning trocam o material do modelo pelo
          // chapado, ver "Noite e dia" em models/porch-plant-factory.js).
          // Nao entram em frameUpdaters - nada nelas se move.
          if (built.setDaytime || built.setMorning) {
            exteriorGrounds.push(built);
          }

          // Colisao: mesma margem dos moveis dos comodos. Fica de
          // prevencao, como o muro e os pilares - a porta ENTRADA & SAIDA
          // continua bloqueada pela historia, entao ninguem pisa na varanda
          // ainda. `solid: false` nos dados desliga (o varal e pano no ar
          // na altura do peito: a colisao do jogo e um AABB sem eixo Y, e
          // um solido ali viraria parede invisivel no meio da passagem).
          if (def.solid !== false) {
            solids.push({
              owner: built.group,
              minX: x - boxHalfX - PORCH_PROP_MARGIN,
              maxX: x + boxHalfX + PORCH_PROP_MARGIN,
              minZ: z - boxHalfZ - PORCH_PROP_MARGIN,
              maxZ: z + boxHalfZ + PORCH_PROP_MARGIN,
            });
          }
        });
      });
    }

    // ---------- Pecas decorativas da PAREDE LATERAL DIREITA ----------
    // As DOZE pecas .glb que o jogador enviou (quatro pacotes: lixo,
    // jardim, madeira e o medidor de energia), encostadas na parede
    // lateral direita, do lado de FORA da casa. Mesmo sistema de
    // importacao de todos os outros modelos do jogo (ver
    // models/dumpster-factory.js, que documenta o caminho inteiro) e mesmo
    // desenho de bloco das pecas da varanda, logo acima: uma TABELA que
    // liga o nome do modelo a fabrica dele, e UM bloco que encosta a peca
    // na parede, calcula a colisao e a poe no chao. Peca nova aqui e uma
    // linha nesta tabela e uma linha em `sideYard.props`
    // (scenes/corridor-config.js), e nada mais.
    //
    // A tabela se chama YARD_MODELS (e nao SIDE_YARD_MODELS) porque ela
    // deixou de ser so deste quintal: o bloco "Pecas decorativas do
    // QUINTAL DOS FUNDOS", mais abaixo (hoje o carro, ver
    // models/car-factory.js), le a MESMA tabela. Um modelo pode ser usado
    // pelos dois quintais sem nenhuma duplicacao, e a folga/margem padrao
    // (YARD_GAP/YARD_MARGIN) tambem valem para os dois.
    //
    // `create` e chamada na hora de montar, nunca na definicao da tabela:
    // as fabricas moram em window e sao carregadas por <script> em
    // index.html, entao ler window.XFactory aqui em cima dependeria da
    // ordem de carregamento. Fabrica ausente = aviso no console e o
    // quintal montado sem aquela peca; o boot nunca cai por decoracao.
    const YARD_MODELS = {
      dumpster: {
        label: "lixeira grande",
        create: function () {
          return window.DumpsterFactory ? window.DumpsterFactory.createDumpster() : null;
        },
      },
      "yard-trash-can": {
        label: "lata de lixo do quintal",
        create: function () {
          return window.YardTrashCanFactory
            ? window.YardTrashCanFactory.createYardTrashCan()
            : null;
        },
      },
      "trash-bag-a": {
        label: "saco de lixo A",
        create: function () {
          return window.TrashBagAFactory ? window.TrashBagAFactory.createTrashBagA() : null;
        },
      },
      "trash-bag-b": {
        label: "saco de lixo B",
        create: function () {
          return window.TrashBagBFactory ? window.TrashBagBFactory.createTrashBagB() : null;
        },
      },
      "trash-bag-c": {
        label: "saco de lixo C",
        create: function () {
          return window.TrashBagCFactory ? window.TrashBagCFactory.createTrashBagC() : null;
        },
      },
      "dirt-mound": {
        label: "montinho de terra",
        create: function () {
          return window.DirtMoundFactory ? window.DirtMoundFactory.createDirtMound() : null;
        },
      },
      "fern-pot": {
        label: "vaso de samambaia",
        create: function () {
          return window.FernPotFactory ? window.FernPotFactory.createFernPot() : null;
        },
      },
      "chicken-toolpot": {
        label: "galinha porta-ferramentas",
        create: function () {
          return window.ChickenToolPotFactory
            ? window.ChickenToolPotFactory.createChickenToolPot()
            : null;
        },
      },
      woodpile: {
        label: "pilha de lenha",
        create: function () {
          return window.WoodpileFactory ? window.WoodpileFactory.createWoodpile() : null;
        },
      },
      branches: {
        label: "gravetos",
        create: function () {
          return window.BranchesFactory ? window.BranchesFactory.createBranches() : null;
        },
      },
      "axe-stump": {
        label: "machado no toco",
        create: function () {
          return window.AxeStumpFactory ? window.AxeStumpFactory.createAxeStump() : null;
        },
      },
      "power-meter": {
        label: "medidor de energia",
        create: function () {
          return window.PowerMeterFactory ? window.PowerMeterFactory.createPowerMeter() : null;
        },
      },
      // O carro (VW Golf Mk4 PSX) - hoje usado pelo QUINTAL DOS FUNDOS,
      // nao por este aqui (ver `backYard.props` em
      // scenes/corridor-config.js). Esta na MESMA tabela de proposito:
      // qualquer modelo do acervo pode ir para qualquer um dos dois
      // quintais so mudando o dado. CUIDADO: CarInteriorFactory e OUTRA
      // peca - a cabine da cutscene de abertura.
      car: {
        label: "carro",
        create: function () {
          return window.CarFactory ? window.CarFactory.createCar() : null;
        },
      },
      // O GALPAO (armazem PSX) - segunda peca do QUINTAL DOS FUNDOS, ver
      // models/shed-factory.js e `backYard.props` em
      // scenes/corridor-config.js. Unica peca desta tabela que recebe a
      // biblioteca de materiais: as duas folhas da porta dele SAO a porta do
      // jogo (DoorFactory), e ela precisa de materials.doorPanel e
      // materials.lampMetal. As outras pecas trazem material proprio de
      // dentro do .glb, por isso `create()` continua sem argumento para elas.
      shed: {
        label: "galpao",
        create: function () {
          return window.ShedFactory ? window.ShedFactory.createShed(materials) : null;
        },
      },
    };

    // Mesma folga de encaixe (2 cm de padrao, cada peca pode pedir a sua)
    // e a mesma margem de colisao (5 cm) que a mobilia dos comodos usa.
    const YARD_GAP = 0.05;
    const YARD_MARGIN = 0.05;

    const sideYardData = config.sideYard || {};
    const sideYardDefs = sideYardData.props || [];

    if (sideYardDefs.length) {
      // ---------- A parede, derivada da propria casa ----------
      // Nenhum X escrito na mao. `SideRoomScene.footprints` (ja calculado
      // acima) devolve a pegada de cada comodo em coordenadas do MUNDO,
      // com as paredes INCLUSAS e de proposito engordada (meia espessura
      // nas pontas do comprimento, uma inteira na profundidade - ver o
      // comentario dela). Descontando essa engorda voltamos ao PLANO da
      // parede, e somando o CLADDING_GAP chegamos na superficie que o
      // jogador ve (o revestimento externo fica 2 cm a frente do plano,
      // ver createWallCladding em models/exterior-factory.js).
      const yardWall = sideYardData.wall === "left" ? "left" : "right";
      const yardSign = yardWall === "left" ? -1 : 1;
      const yardRoomWallT =
        (window.SideRoomScene && window.SideRoomScene.WALL_THICKNESS) || 0.3;
      const yardCladdingGap =
        (window.ExteriorFactory && window.ExteriorFactory.CLADDING_GAP) || 0.02;

      let yardWallPlaneX = null;
      let yardWallMinZ = Infinity;
      let yardWallMaxZ = -Infinity;
      sideRoomFootprints.forEach(function (rect) {
        const side = (rect.minX + rect.maxX) / 2 < 0 ? "left" : "right";
        if (side !== yardWall) {
          return;
        }
        const plane =
          yardWall === "left" ? rect.minX + yardRoomWallT : rect.maxX - yardRoomWallT;
        if (yardWallPlaneX === null) {
          yardWallPlaneX = plane;
        } else {
          yardWallPlaneX =
            yardWall === "left"
              ? Math.min(yardWallPlaneX, plane)
              : Math.max(yardWallPlaneX, plane);
        }
        yardWallMinZ = Math.min(yardWallMinZ, rect.minZ + yardRoomWallT / 2);
        yardWallMaxZ = Math.max(yardWallMaxZ, rect.maxZ - yardRoomWallT / 2);
      });

      if (yardWallPlaneX === null) {
        // Nenhum comodo daquele lado (alguem tirou a COZINHA e o BANHEIRO
        // dos dados): sem parede lateral, nao ha quintal lateral. Avisa e
        // segue - o resto do exterior continua identico.
        console.error(
          "CorridorScene: nao existe comodo do lado '" +
            yardWall +
            "' para encostar as pecas do quintal lateral - reveja `sideRooms` " +
            "em scenes/house-config.js e `sideYard.wall` em " +
            "scenes/corridor-config.js."
        );
      } else {
        const yardWallFaceX = yardWallPlaneX + yardSign * yardCladdingGap;
        // Caixas ja colocadas, para avisar quando duas pecas se atropelam.
        const yardBoxes = [];

        sideYardDefs.forEach(function (def) {
          const spec = YARD_MODELS[def.model];
          if (!spec) {
            console.error(
              "CorridorScene: modelo de quintal lateral desconhecido '" +
                def.model +
                "' (peca " +
                (def.id || "sem id") +
                ") - a peca nao vai aparecer. Modelos validos: " +
                Object.keys(YARD_MODELS).join(", ") +
                "."
            );
            return;
          }

          const built = spec.create();
          if (!built || !built.group) {
            console.error(
              "CorridorScene: a fabrica da " +
                spec.label +
                " nao esta carregada - a peca nao vai aparecer no quintal " +
                "lateral. Confira o <script> dela em index.html."
            );
            return;
          }

          // A peca nasce centralizada na propria base (ver a convencao de
          // espaco local nas fabricas), entao aqui basta decidir o centro
          // (x, z) dela. Metade do contorno da base JA projetada nos eixos
          // do mundo depois do giro - a mesma trigonometria das pecas da
          // varanda e da mobilia dos comodos. Vale para qualquer angulo,
          // inclusive os que nao sao multiplos de 90.
          const rotationY = def.rotationY || 0;
          const propHalfW = built.width / 2;
          const propHalfD = built.depth / 2;
          const boxHalfX =
            Math.abs(propHalfW * Math.cos(rotationY)) +
            Math.abs(propHalfD * Math.sin(rotationY));
          const boxHalfZ =
            Math.abs(propHalfW * Math.sin(rotationY)) +
            Math.abs(propHalfD * Math.cos(rotationY));

          const gap = def.gap === undefined ? YARD_GAP : def.gap;
          const elevation = def.elevation || 0;
          const x = yardWallFaceX + yardSign * (gap + boxHalfX);
          const z = def.offset || 0;

          // ---------- Dois avisos (nenhum impede nada) ----------
          // Mesmo espirito dos avisos das pecas da varanda: melhor
          // descobrir pelo console do que achando um saco de lixo dentro
          // do outro.
          if (z - boxHalfZ < yardWallMinZ - 0.001 || z + boxHalfZ > yardWallMaxZ + 0.001) {
            console.warn(
              "CorridorScene: a peca " +
                (def.id || def.model) +
                " do quintal lateral passa da ponta da parede (ela vai de z " +
                yardWallMinZ.toFixed(2) +
                " a z " +
                yardWallMaxZ.toFixed(2) +
                ") - reveja `offset` em `sideYard.props` " +
                "(scenes/corridor-config.js)."
            );
          }

          const box = {
            id: def.id || def.model,
            minX: x - boxHalfX,
            maxX: x + boxHalfX,
            minY: elevation,
            maxY: elevation + built.height,
            minZ: z - boxHalfZ,
            maxZ: z + boxHalfZ,
          };
          yardBoxes.forEach(function (other) {
            const hits =
              box.minX < other.maxX &&
              box.maxX > other.minX &&
              box.minZ < other.maxZ &&
              box.maxZ > other.minZ &&
              box.minY < other.maxY &&
              box.maxY > other.minY;
            if (hits) {
              console.warn(
                "CorridorScene: as pecas " +
                  box.id +
                  " e " +
                  other.id +
                  " do quintal lateral estao uma dentro da outra - reveja " +
                  "`offset`/`gap` em `sideYard.props` " +
                  "(scenes/corridor-config.js)."
              );
            }
          });
          yardBoxes.push(box);

          // Y = elevation: o terreno do lado de fora esta no zero (o chao
          // de grama e o gramado nascem em y = 0, ver o bloco "Vista
          // externa" mais abaixo), diferente da varanda, que tem o piso
          // 20 cm acima. `elevation` serve as pecas penduradas - hoje so o
          // medidor de energia.
          built.group.position.set(x, elevation, z);
          built.group.rotation.y = rotationY;
          root.add(built.group);

          // Mesma lista do chao de grama, da estrada, do gramado, da mata,
          // da nevoa, da fachada e das pecas da varanda: as doze vivem do
          // lado de FORA, entao amanhecem junto com o resto do exterior
          // (setDaytime/setMorning trocam o material do modelo pelo
          // chapado, ver "Noite e dia" em models/dumpster-factory.js). Nao
          // entram em frameUpdaters - nada nelas se move.
          if (built.setDaytime || built.setMorning) {
            exteriorGrounds.push(built);
          }

          // Colisao: mesma margem dos moveis dos comodos, e fica de
          // prevencao para o dia em que o jogador puder andar por fora (a
          // porta ENTRADA & SAIDA continua bloqueada pela historia).
          // `solid: false` nos dados desliga - as pecas rasteiras (terra,
          // gravetos) e a pendurada (medidor) usam isso, porque a colisao
          // do jogo e um AABB sem eixo Y e elas viariam parede invisivel.
          if (def.solid !== false) {
            solids.push({
              owner: built.group,
              minX: box.minX - YARD_MARGIN,
              maxX: box.maxX + YARD_MARGIN,
              minZ: box.minZ - YARD_MARGIN,
              maxZ: box.maxZ + YARD_MARGIN,
            });
          }
        });
      }
    }

    // ---------- Canteiros de flores do quintal da frente ----------
    // Pedido do jogador sobre a imagem de referencia: os dois pedacos de
    // grama que sobram fechados de cada lado da varanda cheios de rosas e
    // flores de todas as cores (ver models/flower-bed-factory.js).
    //
    // Os retangulos vem da VARANDA (`porch.plan.yards`), que os deriva do
    // muro e das paredes das alas - nenhuma medida de quintal escrita
    // aqui. Sem varanda, nao ha canteiro: e ela que sabe onde o quintal
    // fica.
    const frontYard = config.frontYard || {};

    if (porch && window.FlowerBedFactory && frontYard.flowers !== false) {
      const flowerData = frontYard.flowers || {};
      const flowerBeds = window.FlowerBedFactory.createFlowerBeds({
        beds: porch.plan.yards,
        seed: flowerData.seed,
        spacing: flowerData.spacing,
        margin: flowerData.margin,
        gaps: flowerData.gaps,
        // Rede de seguranca: mesmo com a folga das bordas, nenhuma flor e
        // sorteada dentro da pegada de um comodo.
        exclusions: sideRoomFootprints,
      });
      root.add(flowerBeds.group);
      // Mesma lista do chao de grama, do gramado, da mata, da estrada, da
      // fachada e da varanda: as flores amanhecem junto com o resto do
      // exterior (setDaytime/setMorning), sem nenhuma linha nova no
      // setDaytime() da cena la embaixo. Nao entram em frameUpdaters (nada
      // nelas se move) nem em `solids`: e um canteiro, nao um obstaculo.
      exteriorGrounds.push(flowerBeds);
    }

    // ---------- Pichacao da fachada ----------
    // "No man's land" na parede da frente de uma das duas alas, virada
    // para o quintal (ver models/graffiti-factory.js). A parede e o dado
    // que a varanda ja calculou para o muro: `wing.sideWallX` e a quina de
    // fora da ala e `wing.frontZ` e o revestimento externo dessa parede -
    // a tinta fica 1.5 cm a frente dele, sem nada coplanar e sem um
    // vertice dentro da casa.
    if (porch && window.GraffitiFactory && frontYard.graffiti) {
      const tagData = frontYard.graffiti;
      const tagSide = tagData.side === "left" ? "left" : "right";
      const tagWing = porch.plan.wings[tagSide];
      if (tagWing) {
        const tag = window.GraffitiFactory.createGraffiti({
          text: tagData.text,
          seed: tagData.seed,
          width: tagData.width,
          height: tagData.height,
          name: "pichacao-fachada",
        });
        const fromX = (tagSide === "left" ? -1 : 1) * halfW;
        const along = tagData.along === undefined ? 0.5 : tagData.along;
        tag.group.position.set(
          fromX + (tagWing.sideWallX - fromX) * along,
          tagData.centerY === undefined ? 1.62 : tagData.centerY,
          tagWing.frontZ - (tagData.offset === undefined ? 0.015 : tagData.offset)
        );
        // O plano do three.js nasce olhando para +Z; a parede da frente da
        // ala olha para -Z (para o quintal), entao meia volta em Y.
        tag.group.rotation.y = Math.PI;
        root.add(tag.group);
        exteriorGrounds.push(tag);
      }
    }


    // Pichacao enviada pelo jogador na parede lateral esquerda, vista de frente.
    if(porch && window.GraffitiFactory && frontYard.imageGraffiti){
      const d=frontYard.imageGraffiti, wing=porch.plan.wings.left;
      if(wing){ const g=window.GraffitiFactory.createImageGraffiti({image:d.image,width:d.width,height:d.height,name:'pichacao-nossa-senhora'}); const fromX=-halfW, along=d.along===undefined?.5:d.along; g.group.position.set(fromX+(wing.sideWallX-fromX)*along,d.centerY||1.65,wing.outerX+(d.offset||.018)); g.group.rotation.y=-Math.PI/2; root.add(g.group); exteriorGrounds.push(g); }
    }

    // ---------- Comodos novos e varanda x vista externa ----------
    // Os quatro comodos desta atualizacao (QUARTO 01/02, COZINHA e
    // BANHEIRO, ver scenes/side-room-scene.js) ocupam pedacos do
    // terreno em que a vista externa planta grama, arvores e neblina -
    // principalmente do lado da parede direita, onde fica a unica
    // janela lateral do corredor.
    //
    // A solucao segue a MESMA ideia ja usada pelo caminho de terra (ver
    // o bloco "Caminho limpo" no topo de models/dirt-path-factory.js):
    // nao existe remocao depois nem teste por quadro - as tres fabricas
    // recebem os retangulos da construcao e simplesmente NAO sorteiam
    // nenhuma instancia dentro deles, e a neblina zera a opacidade ali.
    // Ou seja, grama/arvore dentro de comodo nunca chega a existir:
    // nada de tufo atravessando piso, arvore cruzando parede ou objeto
    // presto dentro da estrutura nova.
    //
    // `SideRoomScene.footprints` devolve os retangulos em coordenadas do
    // MUNDO (paredes inclusas); aqui eles sao convertidos para o espaco
    // LOCAL de cada ancora da vista externa (origem no pe da parede, +Z
    // apontando para fora - a mesma convencao das tres camadas). Com
    // rotacoes multiplas de 90 graus, converter os 4 cantos e pegar os
    // extremos e EXATO, sem inflar nada (ver transformBox em
    // scripts/house-world.js).
    // Tudo que a vista externa precisa EVITAR, no mesmo formato de
    // retangulo de mundo: os quatro comodos novos mais a VARANDA da
    // entrada (ver o bloco acima). A varanda entra pelo mesmo caminho e
    // pelo mesmo motivo dos comodos - sem ela nesta lista, o gramado
    // plantaria tufos atravessando o piso dela e as fatias de nevoa
    // passariam por dentro, exatamente o bug que os comodos novos tiveram.
    // `porch.footprints` traz o retangulo da varanda MAIS uma faixa em
    // volta de cada perna do muro das alas (ver o fim de
    // models/porch-factory.js) - sem elas, o gramado plantaria tufo
    // atravessando o muro novo e a mata poria pinheiro dentro do quintal.
    const outdoorFootprints = sideRoomFootprints.concat(
      porch ? porch.footprints || [porch.footprint] : []
    );

    function exclusionsFor(anchor) {
      if (!anchor || !outdoorFootprints.length) {
        return [];
      }
      const transform = window.HouseWorld.createTransform({
        x: anchor.x,
        z: anchor.z,
        rotationY: anchor.rotationY,
      });

      const rects = [];
      outdoorFootprints.forEach(function (rect) {
        const corners = [
          transform.toLocal(rect.minX, rect.minZ),
          transform.toLocal(rect.minX, rect.maxZ),
          transform.toLocal(rect.maxX, rect.minZ),
          transform.toLocal(rect.maxX, rect.maxZ),
        ];
        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        for (let i = 0; i < corners.length; i++) {
          minX = Math.min(minX, corners[i].x);
          maxX = Math.max(maxX, corners[i].x);
          minZ = Math.min(minZ, corners[i].z);
          maxZ = Math.max(maxZ, corners[i].z);
        }
        // Comodo inteiramente do lado de DENTRO da parede desta janela
        // (ou seja, atras dela): nao ha nada para excluir - a vista
        // externa nem chega perto dele. E o caso dos dois comodos da
        // esquerda em relacao a janela da parede direita.
        if (maxZ <= 0) {
          return;
        }
        rects.push({ minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ });
      });
      return rects;
    }

    // ---------- Chao sob a casa (o vao do limbo) ----------
    // O buraco que este bloco fecha: cada remendo de chao externo e
    // encostado do lado de FORA da parede da janela dele (ver "Vista
    // externa (grama)" logo abaixo e o mesmo bloco em
    // scenes/room-scene.js), com a borda parando em WALL_GAP da parede -
    // ou seja, NENHUM deles passa por baixo da construcao. Sobrava uma
    // faixa central sem chao nenhum: toda a largura da casa (x de -halfW
    // a +halfW), da parede ENTRADA & SAIDA (z = -L) para frente,
    // passando por baixo do corredor e de MEU QUARTO e seguindo alem da
    // fachada da frente. Visto de fora e um pouco de baixo, o piso do
    // corredor aparecia flutuando sobre um vao aberto para o limbo (o
    // fundo/nevoa da cena por baixo da casa).
    //
    // Aqui ele e preenchido com a MESMA grama que o jogo ja usa la fora
    // (materials.grass/grassDay, via
    // ExteriorFactory.createUnderHouseGround - nenhuma textura nova,
    // nenhum material novo, 2 triangulos, 1 draw call).
    //
    // Por que ESTE arquivo e o dono do remendo: o corredor e a zona de
    // referencia da casa (fica na origem, sem giro - ver
    // scenes/house-config.js), entao as coordenadas locais dele SAO as
    // do mundo. Nenhuma conversao, nenhum risco de a faixa nascer
    // torta. O quarto, girado 180 graus, teria que desfazer o giro para
    // dizer a mesma coisa.
    //
    // ---------- Nada de chao atravessando piso de comodo ----------
    // Regra dura, garantida pela geometria e nao por tentativa e erro,
    // em DUAS frentes:
    //
    //  1. ALTURA: o remendo nasce em y = -UNDER_HOUSE_DROP (4 cm ABAIXO
    //     do zero). O piso do corredor e o de MEU QUARTO estao em y = 0
    //     e o dos quatro comodos novos em y = 0.02 (FLOOR_LIFT, ver
    //     scenes/side-room-scene.js) - todos ACIMA deste plano, e todos
    //     opacos. Nao ha coplanaridade para brigar por profundidade nem
    //     travessia possivel: sao planos paralelos em alturas
    //     diferentes. De dentro de qualquer comodo, nada muda - o piso
    //     de sempre continua sendo a unica coisa visivel embaixo do
    //     jogador.
    //  2. LARGURA: a faixa cobre so a pegada da casa mais o sliver de
    //     UNDER_HOUSE_OVERLAP que entra por baixo dos remendos das
    //     janelas (e cai na base da parede, tapado por ela e pelo
    //     revestimento externo). Nao e um segundo terreno inteiro por
    //     baixo do mundo: fora dessa faixa, o chao continua sendo
    //     exatamente o de antes.
    //
    // Ate onde ela vai para FRENTE: a casa termina na parede de fundo de
    // MEU QUARTO (z = +RoomConfig.size no mundo) e dali para frente
    // tambem nao havia chao nessa mesma largura - so os remendos dos
    // lados. Somar GROUND_SIZE / 2 (30 unidades, o mesmo alcance dos
    // outros remendos) poe a borda da frente sempre depois do ponto em
    // que a nevoa do dia ja fechou 100% (28 unidades, ver
    // Atmosphere.DAY em scripts/atmosphere.js), entao ninguem chega a
    // ver onde ela acaba.
    const underHouseDrop = window.ExteriorFactory.UNDER_HOUSE_DROP;
    const underHouseOverlap = window.ExteriorFactory.UNDER_HOUSE_OVERLAP;
    const underHouseGap = window.ExteriorFactory.WALL_GAP;
    // Quanto a casa avanca para +Z depois da parede de extremidade
    // `end_a` (z = 0): e MEU QUARTO, do outro lado dela (ver
    // scenes/house-config.js). Lido de RoomConfig para os dois nunca
    // discordarem.
    const underHouseRoomSpan = (window.RoomConfig && window.RoomConfig.size) || 6;
    const underHouseBackZ = -L - underHouseGap - underHouseOverlap;
    const underHouseFrontZ =
      underHouseRoomSpan + window.ExteriorFactory.GROUND_SIZE / 2;
    const underHouseGround = window.ExteriorFactory.createUnderHouseGround(
      materials,
      {
        width: (halfW + underHouseGap + underHouseOverlap) * 2,
        depth: underHouseFrontZ - underHouseBackZ,
      }
    );
    underHouseGround.mesh.position.set(
      0,
      -underHouseDrop,
      (underHouseFrontZ + underHouseBackZ) / 2
    );
    root.add(underHouseGround.mesh);
    // Mesma lista do chao das janelas, do gramado, da mata e do caminho
    // de terra: ele tambem expoe setMorning(), entao amanhece junto com
    // o resto do terreno, sem nenhuma chamada nova no setMorning() da
    // cena la embaixo. Nao entra em frameUpdaters (nada nele se move) e
    // nao entra em `solids`: fica embaixo do piso, onde o jogador nunca
    // chega, e o chao de verdade que ele pisa continua sendo o piso de
    // cada comodo.
    exteriorGrounds.push(underHouseGround);

    // ---------- Chao dos FUNDOS ampliado (o fim do cenario) ----------
    // O buraco que este bloco fecha (bug relatado nesta rodada, com print):
    // "o player esta conseguindo ver o fim do cenario, o void atras do
    // armazem".
    //
    // Por que ele existia: todo chao externo do jogo e um remendo QUADRADO de
    // ExteriorFactory.GROUND_SIZE (60 x 60) encostado do lado de fora da
    // parede de UMA JANELA (ver "Vista externa (grama)" mais abaixo e o bloco
    // gemeo em scenes/room-scene.js). Nenhuma janela olha para os FUNDOS,
    // entao atras da casa o unico chao que existia era a faixa ESTREITA do
    // remendo sob a casa (o bloco acima), da largura da construcao: passando
    // do galpao, e para os lados dele, a grama simplesmente acabava e aparecia
    // o fundo da cena - o void da imagem.
    //
    // O conserto usa o MESMO remendo generico do bloco acima
    // (ExteriorFactory.createUnderHouseGround: 2 triangulos, 1 draw call, a
    // MESMA textura e os MESMOS materiais de grama de noite e de dia, sem nada
    // novo), so grande e cobrindo o fundo do terreno inteiro: da parede de
    // fundo de MEU QUARTO para frente por GROUND_SIZE metros, na largura dos
    // remendos das duas fachadas laterais somadas - assim nao sobra um canto
    // sem chao entre eles. Com a camera do jogo (far = 50, ver
    // scripts/main.js) e a nevoa de dia fechando 100% em 28 unidades (ver
    // scripts/atmosphere.js), a borda dele nunca chega a aparecer.
    //
    // ---------- Por que ele nasce ABAIXO de tudo ----------
    // Mesma ideia (e mesmo motivo) do remendo sob a casa: em vez de brigar por
    // profundidade com o chao que ja existe, ele fica num plano mais BAIXO que
    // todos eles e simplesmente aparece onde nao havia nada:
    //
    //   y = 0                   remendos das tres janelas
    //   y = -UNDER_HOUSE_DROP   remendo sob a casa, e o chao em que as pecas do
    //                           quintal dos fundos se apoiam (o carro e o
    //                           galpao, ver `backGroundY` no bloco das pecas)
    //   y = -BACK_FILL_DROP     este remendo, 2 cm abaixo dos dois acima
    //
    // Os 2 cm nao sao chute: sao a folga que o resto do exterior ja usa contra
    // coplanaridade (z-fighting) e, principalmente, colocam este chao POR
    // BAIXO do piso de madeira do galpao - de dentro do galpao continua se
    // vendo o piso dele, nunca este remendo.
    const BACK_FILL_DROP = underHouseDrop + 0.02;
    const backFillGround = window.ExteriorFactory.createUnderHouseGround(
      materials,
      {
        name: "chao-fundos-ampliado",
        width:
          (halfW + underHouseGap + window.ExteriorFactory.GROUND_SIZE) * 2,
        depth: window.ExteriorFactory.GROUND_SIZE,
      }
    );
    backFillGround.mesh.position.set(
      0,
      -BACK_FILL_DROP,
      underHouseRoomSpan +
        underHouseGap +
        window.ExteriorFactory.GROUND_SIZE / 2
    );
    root.add(backFillGround.mesh);
    // Mesma lista de sempre (chao das janelas, remendo sob a casa, gramado,
    // mata, nevoa): ele expoe setDaytime/setMorning, entao amanhece junto com o
    // resto do terreno. Nao entra em frameUpdaters (nada nele se move) nem em
    // `solids` (e chao, nao obstaculo).
    exteriorGrounds.push(backFillGround);

    // ---------- Pecas decorativas do QUINTAL DOS FUNDOS ----------
    // O pedido desta rodada: "adicione o carro ao jogo, por enquanto como
    // modelo decorativo. E posicione ele atras da casa, no local onde eu
    // circulei na imagem" - o gramado dos fundos, atras da parede de fundo de
    // MEU QUARTO (plantado no bloco logo ABAIXO deste: as pecas precisam vir
    // primeiro para o gramado, a mata e a nevoa saberem onde nao nascer).
    //
    // Nada de sistema novo, exatamente como pedido ("ja tem outros itens
    // que foram implementados dessa forma, portanto use o mesmo sistema"):
    // e o MESMO desenho do bloco do quintal lateral direito, lendo a MESMA
    // tabela de modelos (YARD_MODELS), com a MESMA folga padrao, a MESMA
    // margem de colisao e a MESMA trigonometria de caixa girada. A unica
    // diferenca e o EIXO: a parede lateral corre em Z (a peca escolhe o Z
    // e a cena deriva o X), a parede de fundo corre em X (a peca escolhe o
    // X e a cena deriva o Z).
    //
    // Os dados moram em `backYard.props` (scenes/corridor-config.js);
    // modelo, folga, giro e colisao vem de la. Peca nova nos fundos e uma
    // linha naquela lista.
    //
    // Por que ESTE arquivo e o dono do bloco: o corredor e a zona de
    // referencia da casa (fica na origem, sem giro - ver
    // scenes/house-config.js), entao as coordenadas locais dele SAO as do
    // mundo. Mesmo motivo do remendo de chao sob a casa, logo acima, e do
    // gramado dos fundos, logo abaixo. O quarto, girado 180 graus, teria que
    // desfazer o giro para dizer a mesma coisa.

    // ---------- O que a vegetacao dos fundos precisa EVITAR ----------
    // Preenchidas pelo laco abaixo, no MESMO formato de retangulo de mundo
    // que a vista externa das janelas ja usa (ver `outdoorFootprints` e
    // `exclusionsFor` mais acima):
    //
    //   backyardFootprints   - a caixa de TODAS as pecas dos fundos (carro e
    //                          galpao). Vale para a MATA e para a NEVOA dos
    //                          fundos (bloco "Mata e nevoa dos FUNDOS" mais
    //                          abaixo): nenhum pinheiro nasce dentro do
    //                          galpao e nenhuma fatia de bruma atravessa o
    //                          carro ou o galpao por dentro.
    //   backyardGrassKeepOut - so as pecas que tem PISO proprio, marcadas com
    //                          `keepGrassOut` em `backYard.props` (ver
    //                          scenes/corridor-config.js). E daqui que sai o
    //                          conserto do bug relatado nesta rodada ("tem
    //                          grama dentro do pequeno armazem, a grama esta
    //                          atravessando o chao do armazem"): a moita nem
    //                          chega a ser SORTEADA ali, exatamente como ja
    //                          acontece com os comodos novos e a varanda -
    //                          nada e removido depois nem testado por quadro.
    //
    // As duas listas precisam existir ANTES do gramado, da mata e da nevoa dos
    // fundos: por isso este bloco agora vem antes deles. E a unica mudanca de
    // ORDEM desta atualizacao - as pecas em si continuam montadas exatamente
    // como antes, com os mesmos dados, a mesma folga e a mesma colisao.
    const backyardFootprints = [];
    const backyardGrassKeepOut = [];

    const backYardData = config.backYard || {};
    const backYardDefs = backYardData.props || [];

    if (backYardDefs.length) {
      // ---------- A parede de fundo, derivada da propria casa ----------
      // Nenhum Z escrito na mao: MEU QUARTO vai de z = 0 a
      // z = +RoomConfig.size (`underHouseRoomSpan`, lido no bloco do chao
      // sob a casa), e o revestimento externo dessa parede fica
      // CLADDING_GAP a frente do plano dela (ver createWallCladding em
      // models/exterior-factory.js e a parede "parede-externa-quarto-fundo"
      // em scenes/room-scene.js). Mudar o tamanho do quarto leva o carro
      // junto.
      const backCladdingGap =
        (window.ExteriorFactory && window.ExteriorFactory.CLADDING_GAP) || 0.02;
      const backWallFaceZ = underHouseRoomSpan + backCladdingGap;

      // ---------- O chao dos fundos fica 4 cm ABAIXO do zero ----------
      // Detalhe que o quintal lateral nao tem: la as pecas se apoiam no
      // remendo de chao da janela daquela parede, que esta em y = 0. Aqui,
      // na largura da casa, o unico chao que existe e o remendo sob a casa
      // (ver o bloco "Chao sob a casa" acima), e ele nasce de proposito em
      // y = -UNDER_HOUSE_DROP. Uma peca deixada em y = 0 flutuaria esses
      // 4 cm sobre o chao que aparece embaixo dela - o mesmo cuidado que o
      // fogao teve com o FLOOR_LIFT dos comodos novos. `elevation` dos
      // dados continua contando a partir do chao, nao do zero.
      const backGroundY = -underHouseDrop;

      // Meia largura da faixa de chao dos fundos: a pegada da casa mais a
      // folga e o sliver do remendo (as mesmas contas do bloco do chao sob
      // a casa). Chao alem disso agora existe (ver o bloco do chao dos fundos
      // ampliado), mas ele nasce um pouco mais BAIXO: uma peca colocada fora
      // desta faixa deixaria de encostar no chao que aparece embaixo dela -
      // dai o aviso mais abaixo continuar valendo tal e qual.
      const backStripHalfX = halfW + underHouseGap + underHouseOverlap;

      // Caixas ja colocadas, para avisar quando duas pecas se atropelam.
      const backBoxes = [];

      backYardDefs.forEach(function (def) {
        const spec = YARD_MODELS[def.model];
        if (!spec) {
          console.error(
            "CorridorScene: modelo de quintal dos fundos desconhecido '" +
              def.model +
              "' (peca " +
              (def.id || "sem id") +
              ") - a peca nao vai aparecer. Modelos validos: " +
              Object.keys(YARD_MODELS).join(", ") +
              "."
          );
          return;
        }

        const built = spec.create();
        if (!built || !built.group) {
          console.error(
            "CorridorScene: a fabrica do " +
              spec.label +
              " nao esta carregada - a peca nao vai aparecer no quintal dos " +
              "fundos. Confira o <script> dela em index.html."
          );
          return;
        }

        // A peca nasce centralizada na propria base (ver a convencao de
        // espaco local nas fabricas), entao aqui basta decidir o centro
        // (x, z) dela. Metade do contorno da base JA projetada nos eixos do
        // mundo depois do giro - a mesma trigonometria do quintal lateral,
        // das pecas da varanda e da mobilia dos comodos. Vale para qualquer
        // angulo, inclusive os que nao sao multiplos de 90 (o carro esta
        // 12,6 graus torto de proposito).
        const rotationY = def.rotationY || 0;
        const propHalfW = built.width / 2;
        const propHalfD = built.depth / 2;
        const boxHalfX =
          Math.abs(propHalfW * Math.cos(rotationY)) +
          Math.abs(propHalfD * Math.sin(rotationY));
        const boxHalfZ =
          Math.abs(propHalfW * Math.sin(rotationY)) +
          Math.abs(propHalfD * Math.cos(rotationY));

        const gap = def.gap === undefined ? YARD_GAP : def.gap;
        const elevation = def.elevation || 0;
        const x = def.offset || 0;
        const z = backWallFaceZ + gap + boxHalfZ;

        // ---------- Dois avisos (nenhum impede nada) ----------
        // Mesmo espirito dos avisos do quintal lateral e da varanda: melhor
        // descobrir pelo console do que achando um carro meio dentro da
        // parede.
        if (x - boxHalfX < -backStripHalfX - 0.001 || x + boxHalfX > backStripHalfX + 0.001) {
          console.warn(
            "CorridorScene: a peca " +
              (def.id || def.model) +
              " do quintal dos fundos passa da faixa de chao que existe atras " +
              "da casa (x de " +
              (-backStripHalfX).toFixed(2) +
              " a " +
              backStripHalfX.toFixed(2) +
              ") - reveja `offset` em `backYard.props` " +
              "(scenes/corridor-config.js)."
          );
        }

        const box = {
          id: def.id || def.model,
          minX: x - boxHalfX,
          maxX: x + boxHalfX,
          minY: backGroundY + elevation,
          maxY: backGroundY + elevation + built.height,
          minZ: z - boxHalfZ,
          maxZ: z + boxHalfZ,
        };
        backBoxes.forEach(function (other) {
          const hits =
            box.minX < other.maxX &&
            box.maxX > other.minX &&
            box.minZ < other.maxZ &&
            box.maxZ > other.minZ &&
            box.minY < other.maxY &&
            box.maxY > other.minY;
          if (hits) {
            console.warn(
              "CorridorScene: as pecas " +
                box.id +
                " e " +
                other.id +
                " do quintal dos fundos estao uma dentro da outra - reveja " +
                "`offset`/`gap` em `backYard.props` " +
                "(scenes/corridor-config.js)."
            );
          }
        });
        backBoxes.push(box);

        // ---------- Travas da vegetacao dos fundos ----------
        // Ver "O que a vegetacao dos fundos precisa EVITAR" acima. `box` ja e
        // a caixa desta peca JA GIRADA no mundo; no caso do galpao ela mede o
        // contorno do TELHADO, beiral e testeiras inclusos (ver
        // FINAL_WIDTH/FINAL_DEPTH em models/shed-factory.js), entao a mata e a
        // nevoa respeitam o beiral inteiro.
        backyardFootprints.push({
          minX: box.minX,
          maxX: box.maxX,
          minZ: box.minZ,
          maxZ: box.maxZ,
        });
        if (def.keepGrassOut) {
          // `grassInset` encolhe a caixa antes de ela virar trava de GRAMA: no
          // galpao ele vale o beiral (ver `backYard.props` em
          // scenes/corridor-config.js), entao a trava cai na PAREDE e nao na
          // ponta do telhado - a grama cresce por baixo do beiral, sem faixa
          // pelada em volta da construcao e sem uma lamina do lado de dentro.
          // A folga fina quem da e a propria fabrica: ela exige o raio INTEIRO
          // da moita (mais o empurrao maximo do vento) fora do retangulo, ver
          // hitsExclusion em models/grass-field-factory.js.
          const grassInset = def.grassInset || 0;
          backyardGrassKeepOut.push({
            minX: box.minX + grassInset,
            maxX: box.maxX - grassInset,
            minZ: box.minZ + grassInset,
            maxZ: box.maxZ - grassInset,
          });
        }

        built.group.position.set(x, backGroundY + elevation, z);
        built.group.rotation.y = rotationY;
        root.add(built.group);

        // Mesma lista do chao de grama, do gramado dos fundos, da mata, da
        // fachada e das pecas dos outros dois quintais: esta vive do lado
        // de FORA, entao amanhece junto com o resto do exterior
        // (setDaytime/setMorning trocam o material do modelo pelo chapado,
        // ver "Noite e dia" em models/car-factory.js). Nao entra em
        // frameUpdaters - nada nela se move.
        if (built.setDaytime || built.setMorning) {
          exteriorGrounds.push(built);
        }

        // Colisao: mesma margem do quintal lateral e da mobilia dos
        // comodos, de prevencao para o dia em que o jogador puder andar por
        // fora (a porta ENTRADA & SAIDA continua bloqueada pela historia).
        // `solid: false` nos dados desliga - o carro nao usa isso: ele e
        // alto e macico, entao atravessa-lo andando seria pior que a
        // parede invisivel que as pecas rasteiras evitam.
        if (def.solid !== false) {
          solids.push({
            owner: built.group,
            minX: box.minX - YARD_MARGIN,
            maxX: box.maxX + YARD_MARGIN,
            minZ: box.minZ - YARD_MARGIN,
            maxZ: box.maxZ + YARD_MARGIN,
          });
        }
      });
    }

    // ---------- Gramado dos FUNDOS da casa ----------
    // O buraco que este bloco fechou na primeira vez (bug relatado: "a parte
    // de tras do exterior da casa tem uma area inteira sem grama").
    //
    // O gramado alto nasce por JANELA, ancorado na parede dela com o +Z local
    // apontando para FORA (ver "Vista externa (grama)" abaixo e o bloco gemeo
    // em scenes/room-scene.js), e cada campo cobre so o meio-disco do lado de
    // fora da SUA parede. O jogo tem tres janelas: duas no corredor (parede
    // direita, x = +3, e ENTRADA & SAIDA, z = -22) e a de MEU QUARTO, que com o
    // giro de 180 graus da zona da na fachada ESQUERDA (x = -3). Ou seja:
    // frente, esquerda e direita tem gramado; a faixa ATRAS da casa nao era
    // alcancada por nenhum dos tres.
    //
    // Nada de sistema novo: e o MESMO GrassFieldFactory das janelas, com a
    // MESMA convencao de ancora (origem no pe da parede, +Z local para FORA da
    // casa). A diferenca e que aqui a rotacao e ZERO - o +Z local ja aponta
    // para o +Z do mundo, que e o lado de fora da parede de fundo. E, como o
    // resto do terreno, ele entra em `exteriorGrounds` e amanhece junto
    // (setMorning), sem nenhuma chamada nova la embaixo.
    //
    // ---------- O que mudou nesta atualizacao ----------
    //  1. ELE DEIXOU DE SER UM REMENDO ESTREITO. Antes este campo cobria so a
    //     largura da casa (`lateralLimit` = halfW + folga), porque atras dela
    //     so existia a faixa de chao do remendo sob a casa. Com o chao dos
    //     fundos ampliado (bloco acima), a grama que faltava PRECISA existir
    //     para os lados tambem: sem isso, passando o galpao apareciam pedacos
    //     de chao pelado justamente onde o meio-disco de nenhuma das tres
    //     janelas chega (o "algumas areas do chao estao sem grama" do pedido).
    //     Agora o campo usa a largura cheia do terreno - o padrao da fabrica,
    //     LATERAL_LIMIT = 27,5 m para cada lado -, como os das janelas.
    //     O preco e honesto e vale saber: um campo cheio custa ~1800 moitas
    //     instanciadas, 7 draw calls de dia e 3 de noite, e ele se sobrepoe em
    //     parte ao gramado das duas fachadas laterais. Se algum dia isto pesar
    //     num aparelho fraco, o unico numero a mexer e devolver um
    //     `lateralLimit` a chamada abaixo - nada mais depende disso.
    //  2. NADA DE GRAMA DENTRO DO GALPAO. Ver `backyardGrassKeepOut` no bloco
    //     das pecas dos fundos, logo acima.
    //
    // ---------- Nada de grama dentro da casa ----------
    // A garantia e a de sempre e vem da propria fabrica (item 1 de "Onde NAO
    // pode nascer grama"): no espaco local do campo, dentro da casa e z <= 0, e
    // nenhuma moita e sorteada sem que z >= alcance da moita + WALL_SAFETY -
    // nem o centro nem a lamina mais comprida chegam ao plano da parede. Como a
    // ancora esta no plano da parede de fundo (mais o WALL_GAP de sempre) e a
    // casa INTEIRA fica atras dela (corredor, MEU QUARTO e os quatro comodos
    // vivem todos em z menor), nao existe um retangulo de comodo do lado de
    // fora desta parede: por isso este campo nao precisa das exclusoes dos
    // comodos nem de `path`, so das pecas dos fundos que tem piso proprio.
    const backyardAnchor = {
      x: 0,
      z: underHouseRoomSpan + underHouseGap,
      rotationY: 0,
    };

    // Retangulos de MUNDO -> espaco LOCAL das tres camadas dos fundos (grama,
    // mata e nevoa compartilham a mesma ancora). Como esta ancora NAO gira,
    // X local = X do mundo e Z local = Z do mundo menos o Z da ancora: nenhuma
    // trigonometria, diferente do exclusionsFor() das janelas.
    function backyardLocalRects(rects) {
      return rects.map(function (rect) {
        return {
          minX: rect.minX,
          maxX: rect.maxX,
          minZ: rect.minZ - backyardAnchor.z,
          maxZ: rect.maxZ - backyardAnchor.z,
        };
      });
    }

    const backyardGrass = window.GrassFieldFactory.createGrassField({
      // Semente propria: os fundos nao repetem o desenho de nenhuma das tres
      // janelas, e continuam sempre iguais a si mesmos a cada remontagem da
      // cena.
      seed: "gramado-fundos",
      // O conserto do "tem grama dentro do pequeno armazem": nenhuma moita e
      // sorteada dentro do galpao, nem com a ponta de uma lamina por cima do
      // piso de madeira dele.
      exclusions: backyardLocalRects(backyardGrassKeepOut),
    });
    backyardGrass.group.position.set(backyardAnchor.x, 0, backyardAnchor.z);
    backyardGrass.group.rotation.y = backyardAnchor.rotationY;
    root.add(backyardGrass.group);
    exteriorGrounds.push(backyardGrass);
    // Balanca com a mesma brisa dos gramados das janelas: o relogio do vento e
    // um so, compartilhado (ver o bloco Vento em
    // models/grass-field-factory.js).
    frameUpdaters.push(backyardGrass.update);

    // ---------- Mata e nevoa dos FUNDOS ----------
    // A outra metade do pedido desta rodada: "aumente um pouco esse cenario de
    // chao verde (com a grama). E preencha com arvores e nevoa tambem".
    //
    // O chao ja foi ampliado (bloco "Chao dos FUNDOS ampliado") e a grama ja
    // cobre a faixa nova (bloco acima). Faltavam as duas ultimas camadas da
    // vista externa, que ate agora existiam SO do lado de fora das paredes com
    // janela: a mata que fecha o horizonte e a neblina volumetrica entre os
    // troncos. Sem elas, mesmo com chao e grama, o terreno dos fundos acabava
    // numa linha reta contra o ceu - o void do print.
    //
    // Nada de sistema novo e nenhuma medida nova: sao as MESMAS
    // TreeForestFactory e FogVolumeFactory das janelas, com a MESMA convencao
    // de ancora do gramado dos fundos (`backyardAnchor`: origem no pe da parede
    // de fundo, +Z local para FORA, rotacao zero) - por isso as tres camadas
    // dos fundos reaproveitam o mesmo objeto e a mesma conversao de
    // retangulos, sem nenhuma conta nova.
    //
    // ---------- Nada de arvore nem de nevoa dentro das pecas ----------
    // `backyardFootprints` (ver o bloco das pecas dos fundos) traz a caixa do
    // CARRO e a do GALPAO. A mata simplesmente nao sorteia arvore dentro delas,
    // e com o alcance REAL da copa como margem - entao nem galho encosta -, e a
    // nevoa zera a opacidade ali dentro. Ou seja: nenhum pinheiro atravessando
    // o telhado do galpao ou o teto do carro, e nenhuma fatia de bruma passando
    // por dentro deles.
    const backyardExclusions = backyardLocalRects(backyardFootprints);

    // Largura da mata dos fundos, para cada lado da casa. Ela nao precisa dos
    // 27 metros cheios da fabrica: as florestas das duas fachadas laterais ja
    // contornam as quinas e plantam arvore ate ~25 metros para tras (ver o
    // bloco Flancos em models/tree-forest-factory.js). 18 metros e o que fecha
    // o campo de visao de quem esta no quintal dos fundos olhando para fora,
    // sem plantar uma terceira arvore no mesmo lugar em que aquelas duas ja
    // plantaram - dai a opcao `lateralLimit`, gemea da que o gramado ja tinha.
    const BACKYARD_FOREST_HALF_X = 18;

    const backyardForest = window.TreeForestFactory.createForest({
      seed: "mata-fundos",
      exclusions: backyardExclusions,
      // Quantos metros a PAREDE DA CASA ainda corre para cada lado da ancora: a
      // parede de fundo vai de -halfW a +halfW e a casa acaba nas duas quinas,
      // entao a mata pode contornar dos dois lados (mesmo caso da parede
      // ENTRADA & SAIDA). E `facade` que mantem os 6 metros de gramado livre
      // entre a construcao e a primeira arvore - o galpao continua no meio de
      // uma clareira, com a mata fechando atras dele.
      facade: { left: halfW, right: halfW },
      lateralLimit: BACKYARD_FOREST_HALF_X,
    });
    backyardForest.group.position.set(backyardAnchor.x, 0, backyardAnchor.z);
    backyardForest.group.rotation.y = backyardAnchor.rotationY;
    root.add(backyardForest.group);
    // Mesma lista do chao e do gramado: amanhece junto (setDaytime), sem
    // nenhuma chamada nova la embaixo. Nao entra em frameUpdaters (arvore
    // parada) nem em `solids` - as florestas das janelas tambem nao entram.
    exteriorGrounds.push(backyardForest);

    const backyardFog = window.FogVolumeFactory.createFogVolume({
      seed: "nevoa-fundos",
      exclusions: backyardExclusions,
    });
    backyardFog.group.position.set(backyardAnchor.x, 0, backyardAnchor.z);
    backyardFog.group.rotation.y = backyardAnchor.rotationY;
    root.add(backyardFog.group);
    // Duas listas, como a nevoa das janelas: setDaytime pela lista de sempre e
    // `update` nos frameUpdaters (o arrasto lento da bruma, um float por
    // material por quadro - todo o movimento acontece no shader).
    exteriorGrounds.push(backyardFog);
    frameUpdaters.push(backyardFog.update);

    // ---------- Chuva dos FUNDOS ----------
    // Mesma fabrica das janelas (ver models/rain-factory.js), com a MESMA
    // ancora do gramado, da mata e da nevoa dos fundos e a MESMA lista de
    // retangulos proibidos: nao cai uma gota dentro do carro nem dentro
    // do galpao. Sem este volume, o quintal seria o unico pedaco de mundo
    // seco durante a tempestade.
    const backyardRain = window.RainFactory.createRain({
      seed: "chuva-fundos",
      exclusions: backyardExclusions,
    });
    backyardRain.group.position.set(backyardAnchor.x, 0, backyardAnchor.z);
    backyardRain.group.rotation.y = backyardAnchor.rotationY;
    root.add(backyardRain.group);
    exteriorGrounds.push(backyardRain);
    frameUpdaters.push(backyardRain.update);

    // ---------- Janelas com cortina ----------
    // Folga de 0.02-0.03 em cada lado, sempre SUBTRAÍDA da posição da
    // respectiva parede (nunca somada) — mesmo motivo do ajuste em
    // scenes/room-scene.js (ver o comentário bem mais detalhado lá).
    // As paredes "right"/"end_b" (as únicas com janela no corredor)
    // já têm um vão de verdade recortado nelas agora (ver bloco
    // "Paredes laterais"/"Paredes das extremidades" acima e
    // models/exterior-factory.js), mas a moldura de madeira da janela
    // continua precisando ficar um pouco na frente do PLANO da parede
    // (mesmo lado de sempre): é ela quem cobre a borda do recorte por
    // completo (ver HOLE_MARGIN) — empurrar pro lado de FORA da
    // parede deixaria a moldura atrás desse plano, sem cobrir nada, e
    // voltaria a expor a borda crua do vão.
    // ---------- A luz do CLARÃO (uma só para a casa inteira) ----------
    // Ver effects/lightning-storm.js. Ela mora aqui porque o corredor é a
    // zona de referência da casa (na origem, sem giro), então a luz pode
    // ir para a posição mundial de qualquer janela sem conversão. O
    // updater entra ANTES do das janelas de propósito: ele é quem avança
    // o relógio da tempestade, e as janelas só leem o valor do quadro.
    const lightningStorm = window.LightningStorm.createLight();
    root.add(lightningStorm.light);
    frameUpdaters.push(lightningStorm.update);

    (config.windows || []).forEach(function (winDef) {
      const built = window.WindowFactory.createWindow(materials);
      const group = built.group;
      corridorWindowBuilts.push(built);

      let x = 0;
      let z = 0;
      let rotationY = 0;
      if (winDef.side === "end_a") {
        x = winDef.offsetX;
        z = -0.03;
        rotationY = Math.PI;
      } else if (winDef.side === "end_b") {
        x = winDef.offsetX;
        z = -L + 0.03;
        rotationY = 0;
      } else if (winDef.side === "left") {
        x = -halfW + 0.02;
        z = winDef.offset;
        rotationY = Math.PI / 2;
      } else if (winDef.side === "right") {
        x = halfW - 0.02;
        z = winDef.offset;
        rotationY = -Math.PI / 2;
      }

      group.position.set(x, WINDOW_CENTER_Y, z);
      group.rotation.y = rotationY;
      root.add(group);

      // `isOpen`: mesmo retorno de WindowFactory.createWindow usado
      // pela janela do quarto (ver scenes/room-scene.js) — nenhuma das
      // duas janelas do corredor tem esse id, então não muda nada de
      // comportamento aqui, só mantém as duas janelas consistentes
      // entre si.
      interactables.push({
        id: winDef.id,
        kind: "window",
        outline: built.outline,
        toggleCurtain: built.toggleCurtain,
        isOpen: built.isOpen,
      });
      frameUpdaters.push(built.update);

      // ---------- Vista externa (grama) ----------
      // Um "remendo" de chão de grama por janela, encostado do lado
      // de fora da parede correspondente (ver comentário grande no
      // topo de models/exterior-factory.js: a névoa da cena já
      // esconde a borda dele bem antes que o jogador consiga
      // perceber onde a grama "acaba"). Só existe vista externa pelo
      // lado de fora de "right"/"end_b" porque são os únicos lados
      // com janela no corredor hoje (ver corridor-config.js) — se um
      // dia existir uma janela em "left"/"end_a", basta somar os dois
      // casos que faltam aqui, mesmo princípio.
      const groundBuilt = window.ExteriorFactory.createGroundPlane(materials);
      const ground = groundBuilt.mesh;
      exteriorGrounds.push(groundBuilt);
      const groundGap = window.ExteriorFactory.WALL_GAP;
      const groundHalf = window.ExteriorFactory.GROUND_SIZE / 2;
      if (winDef.side === "right") {
        ground.position.set(halfW + groundGap + groundHalf, 0, winDef.offset);
      } else if (winDef.side === "end_b") {
        ground.position.set(winDef.offsetX, 0, -L - groundGap - groundHalf);
      }
      root.add(ground);

      // ---------- Vegetacao da vista externa (gramado alto) ----------
      // Em cima do "remendo" de chao acima, o gramado de verdade: ~1500
      // moitas de grama na altura do JOELHO do personagem cobrindo o
      // terreno INTEIRO, uma a cada ~40 cm perto da casa (ver
      // models/grass-field-factory.js - poucos draw calls, tres niveis
      // de detalhe por distancia, e os aneis do fundo so ligados de
      // dia). Os tufos importados do .glb que ficavam espalhados aqui
      // sairam de cena: a moita agora e construida por codigo, que e o
      // unico jeito de cobrir 60 x 60 metros num jogo mobile - ver o
      // bloco "Por que grama nova em vez do tufo importado" no topo da
      // fabrica. O chao texturizado continua ali embaixo fazendo o
      // servico dele (agora num verde mais escuro, ver GRASS_DARK_TINT
      // em materials/material-library.js), so que praticamente nao
      // aparece mais: quem faz a vista e a massa de grama.
      //
      // Diferente do chao (que e posicionado pelo CENTRO do remendo), o
      // campo de grama e ancorado NA PAREDE, com o +Z local apontando
      // para fora da casa - e dessa convencao que sai a garantia de que
      // nenhuma moita atravessa a parede para dentro do corredor (ver
      // "Onde NAO pode nascer grama", item 1, no topo da fabrica). Por isso a
      // rotacao em Y aqui: Math.PI / 2 leva o +Z local para o +X do
      // mundo (lado de fora da parede direita) e Math.PI leva para o -Z
      // (lado de fora da parede de extremidade end_b).
      //
      // A semente vem do id da janela: as duas janelas do corredor tem
      // gramados diferentes, e cada uma sempre igual a si mesma toda vez
      // que o corredor e remontado (o jogador entra e sai do quarto).
      //
      // A ancora e calculada ANTES de o campo existir de proposito: se
      // um dia aparecer uma janela num lado ainda nao tratado aqui
      // ("left"/"end_a"), nenhum tufo e criado, em vez de nascer um
      // gramado inteiro na origem da cena — ou seja, dentro do
      // corredor. Grama sem lugar definido do lado de fora simplesmente
      // nao entra.
      // `facade`: quantos metros a PAREDE DA CASA ainda corre para cada
      // lado desta janela, no mesmo espaco local do gramado/floresta
      // (left = -X local, right = +X local). Serve so para a floresta
      // (ver options.facade em models/tree-forest-factory.js): dentro
      // desse trecho ela mantem os 6 metros de gramado livre de sempre;
      // passando do canto, ela CONTORNA a construcao, em vez de deixar
      // um corredor de grama correndo ao lado da casa ate o infinito -
      // era dele que saiam os vazios que apareciam ao olhar pela janela
      // de esguelha (ver o bloco Flancos no topo daquele arquivo).
      //
      // Parede direita (rotationY = PI / 2): o +X local anda no sentido
      // -Z do mundo, ou seja, corredor adentro ate a parede de
      // ENTRADA & SAIDA (z = -L); o -X local vai para o outro lado, a
      // parede de extremidade de MEU QUARTO (z = 0) - e a casa NAO acaba
      // ali: o quarto continua a mesma fachada por mais RoomConfig.size
      // metros (a parede direita do quarto e a mesma parede direita
      // daqui, ver scenes/room-scene.js). Por isso o + roomDepth: sem
      // ele a mata dobraria a esquina em cima do quarto.
      //
      // Parede de extremidade end_b (rotationY = PI): o X local corre ao
      // longo da largura do corredor, e ali a casa acaba mesmo nas duas
      // quinas (halfW para cada lado do centro) - e o fundo da casa,
      // entao a mata pode contornar dos dois lados.
      const roomDepth = (window.RoomConfig && window.RoomConfig.size) || 6;
      let grassAnchor = null;
      if (winDef.side === "right") {
        grassAnchor = {
          x: halfW + groundGap,
          z: winDef.offset,
          rotationY: Math.PI / 2,
          facade: {
            left: Math.abs(winDef.offset) + roomDepth,
            right: L - Math.abs(winDef.offset),
          },
        };
      } else if (winDef.side === "end_b") {
        grassAnchor = {
          x: winDef.offsetX,
          z: -L - groundGap,
          rotationY: Math.PI,
          facade: {
            left: halfW - winDef.offsetX,
            right: halfW + winDef.offsetX,
          },
        };
      }

      if (grassAnchor) {
        // ---------- Caminho de terra da porta ENTRADA & SAIDA ----------
        // Quinta camada da vista externa (ver o comentario grande no
        // topo de models/dirt-path-factory.js) e a UNICA que nao vale
        // para todas as janelas: e a estrada que sai da porta
        // ENTRADA & SAIDA, entao so existe do lado de fora da parede
        // dela (end_b). A janela da parede direita continua vendo
        // exatamente o mesmo gramado, a mesma mata e a mesma nevoa de
        // antes - nada da vista dela muda.
        //
        // Mesma ancora das outras camadas (grassAnchor: origem no pe da
        // parede, +Z local apontando para FORA da casa), sem nenhuma
        // conta nova de posicao. O unico dado novo e centerX, o X LOCAL
        // do eixo do caminho: a porta ENTRADA & SAIDA fica em x = 0 do
        // mundo (ver o bloco "Portas" la em cima) e, com
        // rotationY = Math.PI, o X local de um ponto do mundo e
        // (ancora.x - x_mundo) - ou seja, grassAnchor.x - 0. E dai que
        // sai o pedido de o caminho comecar diretamente em frente a
        // porta de entrada/saida: o eixo da estrada nasce alinhado com
        // ela e segue reto para fora antes de comecar a serpentear.
        //
        // Criado ANTES do gramado e da floresta de proposito: os dois
        // recebem este mesmo objeto em options.path e simplesmente NAO
        // sorteiam nenhuma instancia dentro da estrada (ver o bloco
        // "Caminho limpo" no topo da fabrica). Nao existe remocao
        // depois nem teste por quadro - a grama e as arvores da pista
        // nunca chegam a existir, entao e impossivel nascer grama sobre
        // a terra ou arvore no meio dela.
        let dirtPath = null;
        if (winDef.side === "end_b") {
          dirtPath = window.DirtPathFactory.createDirtPath({
            seed: "caminho-" + winDef.id,
            centerX: grassAnchor.x - 0,
            materials: materials,
          });
          dirtPath.group.position.set(grassAnchor.x, 0, grassAnchor.z);
          dirtPath.group.rotation.y = grassAnchor.rotationY;
          root.add(dirtPath.group);
          // Mesma lista do chao externo, do gramado e da floresta: o
          // caminho tambem expoe setMorning(), entao a terra e as
          // pedrinhas amanhecem junto com o resto, sem nenhuma chamada
          // nova no setMorning() da cena la embaixo. Nao entra em
          // frameUpdaters: nada nele se move, o custo por quadro e zero.
          exteriorGrounds.push(dirtPath);
        }

        const roomExclusions = exclusionsFor(grassAnchor);

        const grassField = window.GrassFieldFactory.createGrassField({
          seed: winDef.id,
          // Nenhuma moita dentro dos comodos novos nem da varanda - ver
          // o bloco "Comodos novos x vista externa" acima. Embaixo da
          // casa quem aparece e o chao de grama solido de sempre
          // (ExteriorFactory.createUnderHouseGround), sem uma lamina em
          // cima.
          exclusions: roomExclusions,
          // Mantem a pista de terra limpa: nenhuma moita e sorteada
          // dentro dela nem com a ponta de uma lamina por cima dela
          // (ver o bloco do caminho acima). Vale null para as janelas
          // que nao dao para o caminho.
          path: dirtPath,
        });
        grassField.group.position.set(grassAnchor.x, 0, grassAnchor.z);
        grassField.group.rotation.y = grassAnchor.rotationY;
        root.add(grassField.group);
        // Entra na MESMA lista do chao externo: os dois expoem
        // `setMorning()`, entao a vegetacao amanhece junto com o
        // terreno, sem nenhuma chamada nova no `setMorning()` da cena
        // la embaixo.
        exteriorGrounds.push(grassField);
        // Unico custo por quadro do gramado: empurrar o relogio da
        // brisa que o vertex shader le (ver o bloco Vento em
        // models/grass-field-factory.js). Nao mexe em matriz de
        // instancia nenhuma, e chamar pelos tres gramados no mesmo
        // quadro nao acelera o vento.
        frameUpdaters.push(grassField.update);

        // ---------- Floresta da vista externa (arvores) ----------
        // Ultima camada da vista externa, empilhada nas duas de cima:
        // passada a clareira de grama aberta, vem a mata fechada que
        // cerca a casa, em quatro faixas de profundidade (ver o
        // comentario grande no topo de models/tree-forest-factory.js).
        // Mesmo modelo importado por GLTFLoader e mesmo
        // THREE.InstancedMesh do gramado - e, principalmente,
        // EXATAMENTE a mesma ancora: a floresta usa a mesma convencao
        // de espaco local do campo de grama (origem no pe da parede,
        // +Z local apontando para FORA da casa), entao reaproveita o
        // `grassAnchor` calculado acima sem nenhuma conta nova. E dessa
        // convencao que sai, de novo, a garantia de que nenhuma arvore
        // atravessa a parede para dentro do corredor.
        //
        // A semente tambem e o id da janela: as duas janelas do
        // corredor dao para florestas diferentes uma da outra (e da do
        // quarto), com a mesma densidade, e cada uma sempre igual a si
        // mesma toda vez que o corredor e remontado.
        const forest = window.TreeForestFactory.createForest({
          seed: winDef.id,
          // Nenhuma arvore (nem copa) dentro dos comodos novos - ver o
          // bloco "Comodos novos x vista externa" acima.
          exclusions: roomExclusions,
          // Ver o comentario de facade no calculo da ancora acima.
          facade: grassAnchor.facade,
          // Mantem a pista limpa e abre o corredor de arvores dos dois
          // lados dela, acompanhando a curva da estrada - ver o bloco do
          // caminho de terra acima.
          path: dirtPath,
        });
        forest.group.position.set(grassAnchor.x, 0, grassAnchor.z);
        forest.group.rotation.y = grassAnchor.rotationY;
        root.add(forest.group);
        // Mesma lista do chao externo e do gramado: os tres expoem
        // `setMorning()`, entao a floresta amanhece junto com eles, sem
        // nenhuma chamada nova no `setMorning()` da cena la embaixo.
        exteriorGrounds.push(forest);

        // ---------- Neblina da vista externa ----------
        // Quarta e ultima camada da vista externa, por cima das tres de
        // cima: a nevoa volumetrica que ocupa o ar entre a grama, os
        // troncos e as faixas da mata (ver o comentario grande no topo
        // de models/fog-volume-factory.js). Nao e filtro de tela nem
        // plano colado na camera - sao cinco fatias horizontais de nevoa
        // mais uma malha de tufos que encaram a camera, geometria de
        // verdade plantada no mundo, entrando no teste de profundidade
        // com as arvores.
        //
        // De novo a MESMA ancora do gramado e da floresta (origem no pe
        // da parede, +Z local apontando para FORA da casa): nenhuma
        // conta nova aqui, e e dessa convencao que sai a garantia de que
        // nao existe um unico vertice de neblina dentro do corredor. A
        // parede solida (com o vao recortado, ver
        // models/exterior-factory.js) faz o resto: a nevoa so aparece
        // atraves do vidro da janela.
        //
        // A semente tambem e o id da janela: cada uma tem o proprio
        // desenho de bancos de nevoa, sempre igual a si mesmo toda vez
        // que o corredor e remontado.
        const fog = window.FogVolumeFactory.createFogVolume({
          seed: winDef.id,
          // Nenhuma nevoa dentro dos comodos novos - ver o bloco
          // "Comodos novos x vista externa" acima. Sem isto, as fatias
          // horizontais de nevoa (que comecam a 30 cm da fachada e vao
          // ate 34 metros) atravessariam a COZINHA e o BANHEIRO por
          // dentro, e o jogador veria uma faixa de bruma dentro de um
          // comodo fechado.
          exclusions: roomExclusions,
        });
        fog.group.position.set(grassAnchor.x, 0, grassAnchor.z);
        fog.group.rotation.y = grassAnchor.rotationY;
        root.add(fog.group);
        // Duas listas, diferente das camadas anteriores: `setMorning()`
        // pela mesma lista de sempre, e `update` nos frameUpdaters -
        // esta e a primeira camada da vista externa que ANIMA (o arrasto
        // lento da nevoa). O update dela escreve um unico float (o
        // tempo) por material; todo o movimento acontece no shader.
        exteriorGrounds.push(fog);
        frameUpdaters.push(fog.update);

        // ---------- Chuva da vista externa ----------
        // Quinta camada da vista externa, por cima das quatro anteriores
        // (chao, gramado, mata e neblina): a chuva que cai por dentro de
        // tudo aquilo. Ver o comentario grande no topo de
        // models/rain-factory.js, inclusive o que veio do tutorial pedido
        // e o que precisou mudar para rodar na r128 e num celular.
        //
        // De novo a MESMA ancora do gramado, da floresta e da neblina
        // (origem no pe da parede, +Z local para FORA da casa): nenhuma
        // conta nova aqui, e e dessa convencao que sai a garantia de que
        // nao existe uma unica gota dentro do corredor, ja que a coluna
        // de chuva comeca 35 cm ADIANTE da fachada. A parede solida, com
        // o vao recortado, faz o resto: a chuva so aparece atraves do
        // vidro da janela.
        //
        // A semente tambem e o id da janela: cada uma tem a propria
        // cortina de agua, sempre igual a si mesma toda vez que o
        // corredor e remontado.
        //
        // CHOVE DE DIA E DE NOITE, sempre, que foi o pedido. Diferente do
        // ceu de antes, este volume nunca e desligado: ele entra em
        // exteriorGrounds so para TROCAR DE PALETA junto com o resto do
        // terreno (a agua fica mais clara de manha e quase preta de
        // noite, ver PALETTES em models/rain-factory.js).
        const rain = window.RainFactory.createRain({
          seed: winDef.id,
          exclusions: roomExclusions,
        });
        rain.group.position.set(grassAnchor.x, 0, grassAnchor.z);
        rain.group.rotation.y = grassAnchor.rotationY;
        root.add(rain.group);
        exteriorGrounds.push(rain);
        frameUpdaters.push(rain.update);
      }
    });

    // ---------- Céu (skybox, só de dia) ----------
    // Ver models/sky-factory.js: céu azul limpo "no infinito" (segue
    // a câmera sozinho, direto no shader, sem custo nenhum por
    // quadro), desenhado antes de tudo e sem escrever profundidade —
    // então o azul só sobra onde não há geometria na frente: na
    // prática, o vão das duas janelas do corredor, acima da linha da
    // grama do bloco "Vista externa" ali em cima. Nada do interior
    // precisou mudar por causa dele.
    //
    // Nasce INVISÍVEL: de noite a vista pela janela continua
    // exatamente como era até agora; quem liga o céu é `setMorning()`
    // logo abaixo, com a tela completamente preta (ver
    // cutscenes/sleep-sequence.js), junto com a luz da manhã.
    //
    // Pendurado no `root` do corredor de propósito (mesmo princípio
    // da grama e da luz da manhã): sai da cena junto com ele quando o
    // jogador entra no quarto — que tem a sua própria instância, ver
    // scenes/room-scene.js — sem nenhum estado global no meio.
    // `hazeColor`: abaixo da linha do horizonte o céu cai exatamente
    // para a cor da névoa DE DIA (ver scripts/atmosphere.js), a mesma
    // em que a grama distante se desfaz — os dois se encontram no
    // mesmo tom, sem nenhuma emenda visível, e o resultado lê como
    // bruma/mata longe. Lido de lá em vez de escrito à mão de
    // propósito: se a paleta de dia mudar, este céu acompanha sozinho.
    // ---------- Vista externa da FACHADA ESQUERDA ----------
    // As janelas novas do QUARTO 01 e do QUARTO 02 (ver
    // scenes/house-config.js e scenes/side-room-scene.js) olham para o
    // lado ESQUERDO da casa, e ali não havia NADA: todo terreno externo
    // do jogo é ancorado na parede de uma janela e, até agora, nenhuma
    // janela olhava para esse lado — abrir o vão sem isto mostraria o
    // vazio da cena.
    //
    // Quem monta é o CORREDOR, e não os quartos, pelo motivo de sempre:
    // ele é a zona de referência (origem, sem giro) e UM terreno ancorado
    // na fachada dele já cobre os DOIS quartos. Um terreno por janela
    // dobraria grama, mata, névoa e chuva no mesmo lugar — que é
    // exatamente por que a COZINHA não ganha nada aqui: a fachada
    // direita já tem a vista da `janela-meu-quarto`.
    //
    // Mesmas cinco camadas da direita, mesmas fábricas, mesmos contratos
    // (setDaytime/update) e as MESMAS exclusões dos cómodos
    // (`exclusionsFor`), então nada nasce dentro de parede.
    const leftWindowRooms = ((window.HouseConfig && window.HouseConfig.sideRooms) || []).filter(
      function (sideRoom) {
        return sideRoom.side === "left" && (sideRoom.windows || []).length;
      }
    );
    if (leftWindowRooms.length) {
      const leftGap = window.ExteriorFactory.WALL_GAP;
      const leftHalfGround = window.ExteriorFactory.GROUND_SIZE / 2;
      const leftAnchorZ = -L / 2;
      const leftGround = window.ExteriorFactory.createGroundPlane(materials);
      leftGround.mesh.position.set(-halfW - leftGap - leftHalfGround, 0, leftAnchorZ);
      root.add(leftGround.mesh);
      exteriorGrounds.push(leftGround);

      const leftAnchor = {
        x: -halfW - leftGap,
        z: leftAnchorZ,
        // -90 graus: o +Z local aponta para FORA da casa (o -X do mundo).
        rotationY: -Math.PI / 2,
        // Quanto a parede da casa ainda corre para cada lado do âncora:
        // metade do corredor para trás e a outra metade mais o MEU QUARTO
        // para a frente. É o que mantém a clareira de grama na frente da
        // fachada (ver options.facade em models/tree-forest-factory.js).
        facade: {
          left: L / 2,
          right: L / 2 + ((window.RoomConfig && window.RoomConfig.size) || 6),
        },
      };
      const leftExclusions = exclusionsFor(leftAnchor);
      const leftSeed = "fachada-esquerda";
      [
        window.GrassFieldFactory.createGrassField({ seed: leftSeed, exclusions: leftExclusions }),
        window.TreeForestFactory.createForest({ seed: leftSeed, exclusions: leftExclusions, facade: leftAnchor.facade }),
        window.FogVolumeFactory.createFogVolume({ seed: leftSeed, exclusions: leftExclusions }),
        window.RainFactory.createRain({ seed: leftSeed, exclusions: leftExclusions }),
      ].forEach(function (built) {
        if (!built || !built.group) {
          return;
        }
        built.group.position.set(leftAnchor.x, 0, leftAnchor.z);
        built.group.rotation.y = leftAnchor.rotationY;
        root.add(built.group);
        exteriorGrounds.push(built);
        if (built.update) {
          frameUpdaters.push(built.update);
        }
      });
    }

    const sky = window.SkyFactory.createSky({
      hazeColor: window.Atmosphere.DAY.fogColor,
    });
    root.add(sky.mesh);
    frameUpdaters.push(sky.update);

    // ---------- Luz da manhã (desligada até o dia amanhecer) ----------
    // Usada só por `setMorning()` logo abaixo, chamada pela sequência
    // de dormir (ver cutscenes/sleep-sequence.js) no instante em que a
    // tela está completamente preta — mesma ideia exata de
    // `morningLight`/`setMorning()` em scenes/room-scene.js, adaptada
    // ao corredor. Diferença: o corredor é comprido (`config.length`),
    // então uma única luz pontual (como a do quarto) deixaria as
    // pontas escuras — por isso aqui é uma HemisphereLight, que não
    // perde intensidade com a distância e ilumina o corredor inteiro
    // de forma uniforme, com o teto um pouco mais claro (cor do
    // "céu") que o chão (cor do "chão"), qualquer que seja o
    // comprimento do corredor. Começa com intensidade 0 (de noite, o
    // corredor continua dependendo só da luminária de teto, exatamente
    // como hoje); `setMorning()` só aumenta essa intensidade, nunca
    // mexe na luminária de teto (que continua com sua própria lógica
    // de liga/desliga e piscadas aleatórias) nem na luz ambiente
    // global (compartilhada com o quarto, ver scripts/main.js).
    const MORNING_LIGHT_INTENSITY = 0.9;
    const morningLight = new THREE.HemisphereLight(0xd9e6ff, 0x2a2420, 0);
    root.add(morningLight);

    // A virada de noite para dia do corredor inteiro. Na história ela
    // acontece uma única vez, pela sequência de dormir, com a tela
    // completamente preta (mesmo instante em que o quarto vira — ver
    // cutscenes/sleep-sequence.js): liga a luz da manhã do corredor e
    // desativa os relâmpagos das duas janelas dele (ver `stopStorm` em
    // models/window-factory.js) — a chuva/gotas continuam do jeito que
    // já estavam, só os relâmpagos param, igual ao que já acontece no
    // quarto.
    /**
     * Gêmeo exato de `setDaytime()` em scenes/room-scene.js, adaptado
     * ao corredor: liga (`true`) ou desliga (`false`) o dia na luz da
     * manhã, no céu das duas janelas e em tudo que vive lá fora. A ida
     * é a da história (`setMorning()` abaixo); a volta existe para o
     * controle de HORÁRIO do Editor (ver editor/editor-ui.js).
     */
    function setDaytime(daytime) {
      const day = daytime !== false;

      morningLight.intensity = day ? MORNING_LIGHT_INTENSITY : 0;

      // Céu azul da vista externa (ver o bloco "Céu" acima e
      // models/sky-factory.js) — de noite ele fica invisível; de dia,
      // olhar pela janela mostra céu.
      sky.setDaytime(day);

      // Percorre tudo que vive do lado de fora da janela (chão de
      // grama, gramado, estrada de terra, floresta e neblina
      // volumétrica): todos seguem o MESMO contrato e hoje todos
      // entendem setDaytime(). O caminho de reserva com setMorning()
      // fica só para o caso de uma peça nova entrar nessa lista
      // sabendo apenas amanhecer.
      exteriorGrounds.forEach(function (groundBuilt) {
        if (groundBuilt.setDaytime) {
          groundBuilt.setDaytime(day);
        } else if (day && groundBuilt.setMorning) {
          groundBuilt.setMorning();
        }
      });

      // Relâmpagos: só param, nunca voltam (`stopStorm` hoje é um no-op
      // — ver models/window-factory.js), então nada a fazer de noite.
      // Clarão dos relâmpagos: agora liga e desliga nos DOIS sentidos
      // (ver effects/lightning-storm.js) — de dia não tem tempestade, e o
      // controle de HORÁRIO do Editor pode voltar para a noite.
      corridorWindowBuilts.forEach(function (windowBuilt) {
        if (windowBuilt.setDaytime) {
          windowBuilt.setDaytime(day);
        } else if (day && windowBuilt.stopStorm) {
          windowBuilt.stopStorm();
        }
      });
      window.LightningStorm.setDaytime(day);
    }

    // Chamada uma única vez pela sequência de dormir, com a tela
    // completamente preta (ver comentário acima): mesmo nome e mesmo
    // efeito de sempre, agora como atalho de `setDaytime(true)`.
    function setMorning() {
      setDaytime(true);
    }

    // `playerPos`/`playerRadius` sao opcionais e apenas repassados aos
    // frameUpdaters - mesmo padrao ja usado por scenes/room-scene.js.
    // Hoje quem usa e a colisao da porta compartilhada (ver o bloco
    // "Colisao da PASSAGEM" acima); luminaria, cortina, gaveta e nevoa
    // ignoram os parametros extras normalmente.
    function update(delta, elapsed, playerPos, playerRadius) {
      frameUpdaters.forEach(function (fn) {
        fn(delta, elapsed, playerPos, playerRadius);
      });
    }

    return {
      root: root,
      solids: solids,
      interactables: interactables,
      update: update,
      setDaytime: setDaytime,
      setMorning: setMorning,
      getSurfaceAt: getSurfaceAt,

      // ---------- A varanda como ZONA DE LUZ ----------
      // A varanda tem luminaria propria e NAO e uma zona da casa (ela e
      // area externa, ver scripts/house-world.js), entao a caixa dela nao
      // sairia de `world.zones` como a dos seis comodos. Ela sai daqui,
      // toda derivada da planta da varanda (models/porch-factory.js): da
      // ponta do beiral ate a fachada, na largura da laje de cobertura e
      // do piso ate a linha do beiral. E o que faz a claridade dela parar
      // na parede de ENTRADA & SAIDA em vez de aparecer no corredor - ver
      // materials/light-zones.js.
      lightZone: porchLamp
        ? {
            minX: -porch.plan.coverHalfX,
            maxX: porch.plan.coverHalfX,
            minY: porch.plan.deckBottom,
            maxY: porch.plan.eaveY,
            minZ: porch.plan.coverFrontZ,
            maxZ: porch.plan.frontZ,
          }
        : null,

      // ---------- Porta compartilhada com "MEU QUARTO" ----------
      // Exposta porque ela nao pertence so ao corredor: e a divisoria
      // entre as duas zonas da casa (ver scenes/house-config.js), e
      // quem manda nela e a historia (scripts/main.js) e a virada da
      // noite (cutscenes/sleep-sequence.js, que a fecha com a tela
      // preta para a regra de "abrir a janela antes de sair do quarto"
      // continuar valendo). `null` quando nao ha porta compartilhada
      // configurada.
      roomDoor: roomDoorBuilt
        ? {
            open: roomDoorBuilt.openDoor,
            close: roomDoorBuilt.closeDoor,
            closeImmediate: function () {
              roomDoorBuilt.setOpenImmediate(false);
            },
            toggle: function () {
              if (roomDoorBuilt.isOpen()) {
                roomDoorBuilt.closeDoor();
              } else {
                roomDoorBuilt.openDoor();
              }
            },
            isOpen: roomDoorBuilt.isOpen,
            getOpenProgress: roomDoorBuilt.getOpenProgress,
          }
        : null,
    };
  }

  return { build: build };
})();
