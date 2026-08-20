/**
 * scenes/room-scene.js
 * -------------------------------------------------
 * Monta o cenário do quarto ("MEU QUARTO"): um ambiente quadrado, com
 * a mesma madeira do chão/teto do corredor e uma nova parede em
 * lambri claro (ver materials/material-library.js), a porta de
 * entrada reaproveitada do modelo já existente (ver
 * models/door-factory.js) e, agora, a cama encostada na parede
 * direita (ver models/bed-factory.js e RoomConfig.beds).
 *
 * Mesmo formato de retorno de scenes/corridor-scene.js (root, solids,
 * interactables, update), para scripts/main.js poder trocar de um
 * cenário para o outro sem precisar de nenhum caso especial: troca o
 * que está em `scene`, troca o conteúdo das listas "ativas" de
 * colisão/interação (ver enterRoom() em scripts/main.js) e passa a
 * chamar este `update` a cada quadro em vez do da CorridorScene.
 * `interactables` já entra com a cama e o abajur sobre o criado-mudo
 * (ver mais abaixo). `update` chama, a cada quadro, o `update` de
 * cada peça animada do quarto — hoje, só o ventilador de teto (ver
 * bloco "Ventilador de teto" mais abaixo e models/ceiling-fan-factory.js);
 * nem a cama nem o abajur têm nenhuma peça móvel, ao contrário da
 * gaveta/cortina do corredor — a luz do abajur liga/desliga na hora,
 * sem transição animada, ver models/table-lamp-factory.js.
 *
 * ---------- O quarto dentro da casa (local x mundo) ----------
 * Este arquivo continua escrito 100% nas coordenadas DO QUARTO: a
 * parede de entrada em z = 0 e o interior crescendo para -Z, exatamente
 * como sempre (ver scenes/room-config.js). O que mudou e que o quarto
 * nao vive mais sozinho na origem: ele e uma ZONA da casa e recebe, por
 * `options.placement`, onde fica dentro do mundo (ver
 * scenes/house-config.js) - hoje, girado 180 graus, do outro lado da
 * parede de extremidade do corredor, com os dois carregados no MESMO
 * mundo 3D ao mesmo tempo.
 *
 * Por isso existe uma regra de borda simples: por DENTRO tudo continua
 * em coordenadas do quarto; o que sai daqui para o resto do jogo sai em
 * coordenadas do MUNDO - `solids` (colisao do jogador), `getSurfaceAt`
 * (som de passos), `sleepSpot` da cama (cutscene de dormir) - e o
 * `playerPos` que chega em `update` e convertido para o espaco do quarto
 * antes de ser repassado (quem faz conta com ele e a fisica da bola).
 * A conversao inteira mora em scripts/house-world.js: nenhuma conta de
 * seno/cosseno espalhada por aqui.
 *
 * `options.entryDoorway` recorta o VAO DA PORTA na parede de entrada e
 * desliga a porta propria do quarto: a porta passa a ser UMA SO,
 * construida pelo corredor, servindo de divisoria para os dois lados
 * (ver `sharedDoor` em scenes/corridor-config.js). `options.sharedSky`
 * desliga o ceu proprio do quarto, ja que a casa toda usa um ceu so.
 * -------------------------------------------------
 */

window.RoomScene = (function () {
  const WALL_THICKNESS = 0.3; // mesmo valor do invólucro do corredor

  function build(config, materials, options) {
    const opts = options || {};

    // ---------- Lugar do quarto dentro da casa ----------
    // Ver o comentario de borda no topo do arquivo. Sem `placement`
    // (ninguem passando nada), este arquivo se comporta exatamente como
    // antes: quarto na origem, sem giro, local == mundo.
    const placement = opts.placement || null;
    const transform =
      placement && window.HouseWorld
        ? window.HouseWorld.createTransform(placement)
        : null;

    function toWorldPoint(x, z) {
      return transform ? transform.toWorld(x, z) : { x: x, z: z };
    }

    // Mesma conversao de `toWorldPoint`, mas para um SENTIDO (vetor)
    // em vez de um ponto: o deslocamento da zona nao entra na conta, so
    // o giro dela. Feito com a diferenca entre dois pontos convertidos,
    // justamente para nao repetir aqui nenhum seno/cosseno (a
    // matematica mora em scripts/house-world.js, ver a regra de borda
    // no topo deste arquivo). Devolve o vetor normalizado.
    function toWorldDirection(x, z) {
      const origin = toWorldPoint(0, 0);
      const tip = toWorldPoint(x, z);
      const dx = tip.x - origin.x;
      const dz = tip.z - origin.z;
      const len = Math.hypot(dx, dz) || 1;
      return { x: dx / len, z: dz / len };
    }

    const root = new THREE.Group();
    if (placement) {
      root.position.set(placement.x || 0, 0, placement.z || 0);
      root.rotation.y = placement.rotationY || 0;
    }
    const solids = [];
    const interactables = []; // preenchida mais abaixo (hoje: só a cama)
    const exteriorGrounds = [];
    const frameUpdaters = []; // funções update(delta) de peças animadas — mesmo princípio de corridor-scene.js; hoje só o ventilador de teto

    // Guarda o objeto devolvido por cada WindowFactory.createWindow do
    // quarto (hoje só existe uma janela aqui — ver bloco "Janela" mais
    // abaixo), para `setMorning()` (fim deste arquivo) poder desligar
    // os relâmpagos dela quando a história virar o dia (ver
    // cutscenes/sleep-sequence.js).
    const roomWindowBuilts = [];

    const size = config.size;
    const half = size / 2;

    // Altura do centro da janela (mundo) — mesmo valor de
    // WINDOW_CENTER_Y usado pelas duas janelas do corredor (ver
    // scenes/corridor-scene.js), consistente aqui porque o quarto usa
    // o mesmo pé-direito (config.height) do corredor.
    const WINDOW_CENTER_Y = 1.85;
    // Altura do centro do poster (mundo) — acima da altura de
    // quadros/janela, para ficar folgado acima do criado-mudo/abajur
    // que fica embaixo dele (ver bloco "Poster" mais abaixo).
    const POSTER_CENTER_Y = 2.15;

    // ---------- Chão ----------
    // Mesma madeira do corredor (materials.roomFloor — ver
    // material-library.js: mesma receita de textura, só recalculada
    // para o tamanho do quarto).
    const floorGeo = new THREE.PlaneGeometry(size, size);
    const floor = new THREE.Mesh(floorGeo, materials.roomFloor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -half);
    root.add(floor);

    // ---------- Tapete circular (decorativo, sem colisão) ----------
    // Ver models/carpet-factory.js (createRoundCarpet) e
    // RoomConfig.carpet: mesma textura do tapete do corredor
    // (materials.roomCarpet — mesmo mapa de textura do runner, mas com
    // polygonOffset próprio calibrado pro tamanho do quarto; ver
    // comentário em createRoundCarpet), só que circular em vez da
    // faixa retangular do corredor. Mesmo centro do chão acima (0, -half): fica
    // automaticamente no meio do quarto, mesmo princípio de
    // posicionamento do tapete do corredor em corridor-scene.js.
    if (config.carpet) {
      const carpetGroup = window.CarpetFactory.createRoundCarpet(
        config.carpet.radius,
        materials
      );
      carpetGroup.position.set(0, 0, -half);
      root.add(carpetGroup);
    }

    // ---------- Detecção de superfície (som de passos) ----------
    // Mesmo princípio de CorridorScene.getSurfaceAt (ver
    // scenes/corridor-scene.js): reaproveita a geometria do tapete
    // circular já desenhado acima (config.carpet.radius, centro em
    // (0, -half)) para dizer se o jogador está sobre ele ou sobre o
    // piso de madeira do resto do quarto. Consumida por
    // scripts/main.js + audio/footstep-audio.js.
    function getSurfaceAt(x, z) {
      if (!config.carpet) {
        return "madeira";
      }
      const carpetCenterZ = -half;
      const dx = x;
      const dz = z - carpetCenterZ;
      const withinRadius =
        dx * dx + dz * dz <= config.carpet.radius * config.carpet.radius;
      return withinRadius ? "tapete" : "madeira";
    }

    // ---------- Teto ----------
    const ceilingGeo = new THREE.PlaneGeometry(size, size);
    const ceiling = new THREE.Mesh(ceilingGeo, materials.roomCeiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, config.height, -half);
    root.add(ceiling);

    // ---------- Paredes ----------
    // As 4 paredes usam o mesmo material novo em lambri
    // (materials.wallRoom) — diferente do corredor, aqui não há duas
    // variantes (lateral/extremidade), porque o quarto é quadrado:
    // todas as paredes têm a mesma largura. Três delas (entrada,
    // oposta, esquerda) compartilham a mesma geometria cheia
    // (`wallGeo`); a direita tem sua própria geometria à parte, com
    // um vão recortado para a janela (ver bloco dedicado logo abaixo).
    const wallGeo = new THREE.PlaneGeometry(size, config.height);

    // ---------- Passagem compartilhada com o CORREDOR ----------
    // `opts.entryDoorway` = { width, height, inset }: o vao da porta a
    // ser recortado na parede de entrada (mesma tecnica do vao das
    // janelas, ver models/exterior-factory.js) e o quanto essa parede
    // recua para dentro do quarto.
    //
    // O recuo (`inset`) e a espessura da divisoria entre os dois
    // comodos: o plano da parede de extremidade do corredor fica de um
    // lado da moldura da porta e este plano fica do outro (ver
    // PARTITION_DEPTH em scenes/corridor-scene.js). Duas vantagens:
    //
    //  - as duas paredes NAO ficam coplanares (nada de z-fighting entre
    //    o lambri claro daqui e o papel de parede do corredor, que sao
    //    materiais DoubleSide);
    //  - o vao fica forrado pela moldura da porta dos dois lados, sem
    //    fresta e sem borda crua aparecendo.
    //
    // O chao e o teto do quarto NAO recuam junto (continuam de z = 0 a
    // z = -size): eles seguem por baixo/por cima da divisoria e
    // encostam exatamente no chao/teto do corredor, entao a passagem nao
    // tem buraco nem degrau no piso.
    const entryDoorway = opts.entryDoorway || null;
    // Keep the shared casing a few millimeters in front of both wall
    // planes. Matching either wall exactly creates z-fighting on mobile
    // GPUs, especially with the low-resolution PSX render target.
    const entryWallInset = entryDoorway ? entryDoorway.inset || 0 : 0;

    // Parede de entrada (onde fica a porta) — z = 0, encarando para
    // dentro do quarto (-Z), mesma convenção da parede "end_a" do
    // corredor (ver corridor-scene.js).
    const entryWallGeo = entryDoorway
      ? window.ExteriorFactory.buildWallGeometryWithOpenings(
          size,
          config.height,
          [],
          [{ x: 0, width: entryDoorway.width, height: entryDoorway.height }]
        )
      : wallGeo;
    const entryWall = new THREE.Mesh(entryWallGeo, materials.wallRoom);
    entryWall.rotation.y = Math.PI;
    entryWall.position.set(0, config.height / 2, -entryWallInset);
    root.add(entryWall);

    // Parede oposta à entrada
    const farWall = new THREE.Mesh(wallGeo, materials.wallRoom);
    farWall.position.set(0, config.height / 2, -size);
    root.add(farWall);

    // Parede esquerda
    const leftWall = new THREE.Mesh(wallGeo, materials.wallRoom);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-half, config.height / 2, -half);
    root.add(leftWall);

    // Parede direita — tem a janela do quarto (RoomConfig.windows,
    // side "direita"), então precisa de um vão de verdade recortado
    // nela (mesmo motivo/técnica do corredor — ver comentário grande
    // no topo de models/exterior-factory.js e o bloco "Paredes
    // laterais" em scenes/corridor-scene.js): sem isso, mesmo com o
    // vidro transparente, a própria parede continuaria sólida bem
    // atrás dele e esconderia a vista externa adicionada mais abaixo
    // (bloco "Janela"). Antes da rotação, o X local desta parede
    // corresponde ao Z do mundo — como o grupo fica em
    // position.z = -half, o centro do vão em X local é
    // `winDef.offset - (-half)` = `winDef.offset + half`.
    const rightWindows = (config.windows || []).filter(function (w) {
      return w.side === "direita";
    });
    const HOLE_W = window.WindowFactory.WINDOW_WIDTH - window.ExteriorFactory.HOLE_MARGIN;
    const HOLE_H = window.WindowFactory.WINDOW_HEIGHT - window.ExteriorFactory.HOLE_MARGIN;
    const HOLE_Y = WINDOW_CENTER_Y - config.height / 2;
    const rightWallGeo = rightWindows.length
      ? window.ExteriorFactory.buildWallGeometryWithHoles(
          size,
          config.height,
          rightWindows.map(function (w) {
            return { width: HOLE_W, height: HOLE_H, x: w.offset + half, y: HOLE_Y };
          })
        )
      : wallGeo;
    const rightWall = new THREE.Mesh(rightWallGeo, materials.wallRoom);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(half, config.height / 2, -half);
    root.add(rightWall);

    // ---------- Revestimento externo (a FACHADA do quarto) ----------
    // Mesma coisa que o corredor faz (ver o bloco de mesmo nome em
    // scenes/corridor-scene.js): a casca de FORA das paredes que dao
    // para o terreno, com o reboco velho e mofado da fachada - a MESMA
    // geometria da parede (inclusive o vao da janela desta parede
    // direita, ja recortado), 2 cm para fora. Ver createWallCladding em
    // models/exterior-factory.js.
    //
    // Entram TRES das quatro paredes: fundo, esquerda e direita. A de
    // ENTRADA (entryWall) nao entra - ela e a divisoria com o corredor,
    // com comodo dos dois lados.
    //
    // O lambri claro de dentro (materials.wallRoom) nao muda em nada:
    // continua nos mesmos quatro planos, e e ele que o jogador ve
    // enquanto esta no quarto.
    //
    // Vao para a lista `exteriorGrounds` (a mesma do chao de grama, do
    // gramado, da floresta e da neblina), entao a fachada amanhece junto
    // com o resto do exterior pelo setDaytime que a cena ja tem.
    [
      {
        wall: farWall,
        name: "parede-externa-quarto-fundo",
        material: materials.wallExteriorRoom,
        dayMaterial: materials.wallExteriorRoomDay,
      },
      {
        wall: leftWall,
        name: "parede-externa-quarto-esquerda",
        material: materials.wallExteriorRoom,
        dayMaterial: materials.wallExteriorRoomDay,
      },
      {
        wall: rightWall,
        name: "parede-externa-quarto-direita",
        material: materials.wallExteriorRoom,
        dayMaterial: materials.wallExteriorRoomDay,
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

    // ---------- Sólidos de colisão do invólucro do quarto ----------
    // Mesmo princípio do corredor: um sólido fino por parede, cobrindo
    // a parede inteira (inclusive onde fica a porta, que ainda não
    // abre — ver mais abaixo).
    solids.push({ owner: leftWall, minX: -half - WALL_THICKNESS, maxX: -half, minZ: -size, maxZ: 0 }); // esquerda
    solids.push({ owner: rightWall, minX: half, maxX: half + WALL_THICKNESS, minZ: -size, maxZ: 0 }); // direita
    // Entrada: com a passagem para o corredor aberta nesta parede, o
    // solido dela vira DOIS - um de cada lado do vao - em vez de um so
    // cobrindo a parede inteira, para o jogador poder atravessar a porta
    // andando. Quem fecha ou libera o vao em si e a colisao da folha da
    // porta compartilhada (ver scenes/corridor-scene.js).
    if (entryDoorway) {
      const passHalf = entryDoorway.width / 2;
      solids.push({
        owner: entryWall,
        minX: -half - WALL_THICKNESS,
        maxX: -passHalf,
        minZ: -entryWallInset - WALL_THICKNESS,
        maxZ: -entryWallInset,
      });
      solids.push({
        owner: entryWall,
        minX: passHalf,
        maxX: half + WALL_THICKNESS,
        minZ: -entryWallInset - WALL_THICKNESS,
        maxZ: -entryWallInset,
      });
    } else {
      solids.push({ owner: entryWall, minX: -half, maxX: half, minZ: -WALL_THICKNESS, maxZ: 0 }); // entrada
    }
    solids.push({ owner: farWall, minX: -half, maxX: half, minZ: -size, maxZ: -size + WALL_THICKNESS }); // oposta

    // ---------- Porta de entrada ----------
    // Reaproveita o mesmo modelo de porta usado nas 6 portas do
    // corredor (window.DoorFactory) — nenhum modelo novo, só ajustes
    // de posição/rotação para encaixar na parede de entrada do quarto.
    // A escala não precisa de ajuste: o quarto usa a mesma largura
    // (size = 6) e o mesmo pé-direito (config.height = 4.2) do
    // corredor, então as proporções da porta já batem certinho aqui,
    // igual do outro lado dela.
    //
    // Interativa (contorno + prompt de "Interagir"), mas sem ação real
    // de voltar ao corredor ainda — reaproveitar a mesma porta para
    // essa função fica para uma atualização futura. `kind: "wardrobe"`
    // de propósito, não um "kind" novo: é exatamente o mesmo tratamento
    // "reservado para o futuro" já usado pelo guarda-roupa (ver
    // models/wardrobe-factory.js e o bloco `wardrobePlacements` acima)
    // — nunca entra em `allowedKinds` de nenhuma etapa em
    // objectives/objective-config.js, então toda tentativa de interação
    // cai automaticamente no bloqueio. Antes da primeira noite (etapa
    // "interagir-porta-meu-quarto"), isso já bastaria para não fazer
    // nada (sem resposta cadastrada); o pedido do usuário era mostrar a
    // MESMA fala do guarda-roupa nesse período, então essa etapa ganhou
    // uma entrada própria em blockedResponses.byId para o id
    // "porta-interna-quarto" apontando para "guarda-roupa-dormir" (ver
    // objective-config.js). Depois da primeira noite (etapa
    // "abrir-janelas"), reaproveita de graça o byKind.wardrobe já
    // existente lá ("abrir-janela-primeiro") — mesmo lembrete que cama,
    // abajur e guarda-roupa já dão nessa etapa, sem precisar de
    // nenhuma entrada nova.
    // ATUALIZACAO (integracao dos dois ambientes num mundo so): com
    // `opts.entryDoorway`, a porta NAO e mais construida aqui. Existe
    // uma porta so, do lado do corredor, e ela e a propria divisoria
    // entre os dois comodos - a mesma folha, a mesma moldura, o mesmo
    // objeto interativo (id "meu-quarto") servindo os dois lados:
    //
    //   CORREDOR -> PORTA -> MEU QUARTO
    //
    // Antes existiam DUAS portas no mesmo lugar (uma em cada cenario),
    // porque os dois nunca estavam na cena ao mesmo tempo; agora isso
    // seria a porta duplicada dentro da divisoria. Quem cuida do giro,
    // da colisao e da interacao dela e scenes/corridor-scene.js (ver
    // `sharedDoor`/`roomDoor` la) - inclusive quando o jogador esta
    // DENTRO do quarto, olhando ela por dentro (ver o caso "door" em
    // scripts/main.js, que sabe de qual lado o jogador esta).
    //
    // Sem `entryDoorway` (nenhum mundo montado em volta), o quarto
    // continua construindo a porta propria dele, exatamente como antes.
    if (!entryDoorway) {
      const doorBuilt = window.DoorFactory.createDoor(materials);
      doorBuilt.group.position.set(0, 0, 0.02);
      doorBuilt.group.rotation.y = Math.PI;
      root.add(doorBuilt.group);

      interactables.push({
        id: "porta-interna-quarto",
        kind: "wardrobe",
        outline: doorBuilt.outline,
      });
    }

    // ---------- Cama ----------
    // Ao contrário da porta acima (e de quadros/relógio no corredor),
    // o grupo devolvido por BedFactory.createBed já nasce centralizado
    // nos eixos X/Z, com a base no chão em Y = 0 (ver comentário de
    // espaço local em models/bed-factory.js) — então aqui só é preciso
    // decidir onde fica esse centro: encosta a cabeceira na parede
    // indicada (`bedDef.side`: 'esquerda' | 'direita' | 'fundo') e
    // escolhe a posição ao longo dela (`bedDef.offset`) — para
    // 'esquerda'/'direita' isso é a profundidade (eixo Z, mesma
    // convenção side/offset já usada pelos móveis do corredor, ver
    // corridor-scene.js); para 'fundo' (parede oposta à entrada) o
    // sentido natural muda: aqui `offset` é a posição ao longo da
    // largura do quarto (eixo X), já que a própria parede corre no
    // eixo X. Posição indicada pelo usuário (print de referência):
    // cabeceira encostada na parede de fundo, cama deslocada para o
    // lado direito do quarto, com folga até a parede direita.
    // Guarda a posição já calculada de cada cama (por id), para o
    // bloco do criado-mudo logo abaixo poder se encostar "ao lado" da
    // cama certa sem duplicar nenhuma conta feita aqui.
    const bedPlacements = {};

    // Guarda o interativo da cama (por id), para o bloco do
    // criado-mudo/abajur logo abaixo poder anexar `isLampOn` a ele
    // assim que o abajur daquela cama for criado (ver `bedInteractable`
    // mais abaixo) — sem precisar duplicar nenhum dado novo aqui.
    const bedInteractables = {};

    (config.beds || []).forEach(function (bedDef) {
      const built = window.BedFactory.createBed(materials);
      const group = built.group;
      const bedLength = window.BedFactory.BED_LENGTH;
      const bedWidth = window.BedFactory.BED_WIDTH;

      // Mesma folga de encaixe (0.02) contra a parede já usada pela
      // escrivaninha do corredor — sem vão visível entre a cabeceira e
      // a parede, sem embutir o resto da cama nela.
      const wallEmbed = 0.02;
      let x = 0;
      let z = 0;
      let rotationY = 0;
      // Metade do tamanho do móvel já projetada nos eixos do mundo —
      // para 'esquerda'/'direita' o eixo cabeça->pés do modelo (X
      // local) segue alinhado com X do mundo, mas em 'fundo' a
      // rotação de 90° troca os eixos (ver comentário daquele ramo
      // abaixo); usada só para a caixa de colisão logo mais adiante.
      let worldHalfX = bedLength / 2;
      let worldHalfZ = bedWidth / 2;
      if (bedDef.side === "esquerda") {
        // Cabeceira encostada na parede esquerda (x = -half), pés
        // apontando para dentro do quarto (+X) — sem rotação: o eixo
        // local de comprimento da cama já nasce alinhado com X.
        x = -half - wallEmbed + bedLength / 2;
        z = bedDef.offset;
        rotationY = 0;
      } else if (bedDef.side === "direita") {
        // Cabeceira encostada na parede direita (x = +half), pés
        // apontando para dentro do quarto (-X) — 180° para inverter o
        // sentido "cabeceira -> pés" do modelo (que nasce virado para
        // +X, ver bed-factory.js).
        x = half + wallEmbed - bedLength / 2;
        z = bedDef.offset;
        rotationY = Math.PI;
      } else if (bedDef.side === "fundo") {
        // Cabeceira encostada na parede de fundo (oposta à entrada,
        // z = -size), pés apontando para a entrada (+Z) — -90° gira o
        // eixo cabeça->pés do modelo (nasce alinhado com X, cabeceira
        // do lado -X) para ficar alinhado com Z, cabeceira do lado
        // -Z. Essa rotação troca os eixos locais: o comprimento da
        // cama passa a ocupar Z no mundo, e a largura passa a ocupar
        // X — por isso worldHalfX/Z abaixo usam bedWidth/bedLength
        // invertidos em relação aos outros dois ramos.
        // Aqui, ao contrário de esquerda/direita, a cabeceira não usa
        // wallEmbed (que embutiria alguns cm dela na parede) — puxada
        // um pouco pra frente em vez disso (0.1 de folga da parede),
        // conforme print do usuário mostrando a cabeceira encostando
        // na parede de fundo.
        const headboardGap = 0.1;
        x = bedDef.offset;
        z = -size + headboardGap + bedLength / 2;
        rotationY = -Math.PI / 2;
        worldHalfX = bedWidth / 2;
        worldHalfZ = bedLength / 2;
      }

      // Sentido "cabeceira -> pes" da cama, em coordenadas do QUARTO.
      // Sai da mesma fonte que os tres ramos acima usam para girar o
      // movel (`side`), sem numero novo nenhum: a cabeceira e sempre o
      // lado encostado na parede, entao os pes sempre apontam para
      // dentro do quarto - 'esquerda' = +X, 'direita' = -X, 'fundo' =
      // +Z. Quem consome e a cutscene de dormir (ver `footDirection`
      // mais abaixo e cutscenes/sleep-sequence.js).
      let footLocalX = 0;
      let footLocalZ = 1;
      if (bedDef.side === "esquerda") {
        footLocalX = 1;
        footLocalZ = 0;
      } else if (bedDef.side === "direita") {
        footLocalX = -1;
        footLocalZ = 0;
      }

      group.position.set(x, 0, z);
      group.rotation.y = rotationY;
      root.add(group);

      // Colisão: caixa cobrindo a área da cama inteira, mesma margem
      // (0.05) já usada pela escrivaninha do corredor — o jogador não
      // consegue atravessar o móvel.
      const bedMargin = 0.05;
      solids.push({
        owner: group,
        minX: x - worldHalfX - bedMargin,
        maxX: x + worldHalfX + bedMargin,
        minZ: z - worldHalfZ - bedMargin,
        maxZ: z + worldHalfZ + bedMargin,
      });

      bedPlacements[bedDef.id] = {
        side: bedDef.side,
        x: x,
        z: z,
        size: size,
        worldHalfX: worldHalfX,
        worldHalfZ: worldHalfZ,
      };

      // Interativa: entra na lista única de interativos do quarto (só
      // precisa da "outline" — o InteractionSystem lê a posição-mundo
      // diretamente dela a cada quadro, ver interaction-system.js).
      // A cama fica fora do sistema de objetivos de propósito (nunca
      // entra em allowedKinds/allowedIds — ver
      // objectives/objective-config.js): scripts/main.js trata o
      // "kind": "bed" como um caso especial, ANTES de consultar
      // objectives.isAllowed(), porque a regra aqui não depende da
      // etapa da história, e sim do abajur estar aceso ou apagado
      // (`isLampOn`, anexado a este objeto logo abaixo, no bloco do
      // criado-mudo/abajur, assim que o abajur correspondente é
      // criado): aceso, toda interação cai na mesma fala de sempre
      // ("cama-apagar-luz", ver dialogue/dialogue-config.js); apagado,
      // dispara a sequência de dormir (ver
      // cutscenes/sleep-sequence.js). `sleepSpot` é o ponto (x,z) que
      // essa cutscene usa como destino da câmera ao deitar — o mesmo
      // centro do móvel já calculado acima, sem duplicar nenhuma
      // conta.
      const bedInteractable = {
        id: bedDef.id,
        kind: "bed",
        outline: built.outline,
        interact: built.interact,
        // Em coordenadas do MUNDO, nao do quarto (ver a regra de borda
        // no topo deste arquivo): quem consome e a cutscene de dormir,
        // que anima a camera direto no mundo (ver
        // cutscenes/sleep-sequence.js).
        sleepSpot: toWorldPoint(x, z),
        // Sentido (x,z) que aponta da cabeceira para os pes da cama, em
        // coordenadas do MUNDO e ja normalizado (mesma regra de borda do
        // `sleepSpot` logo acima - o giro da zona entra pela conversao,
        // ver toWorldDirection no topo deste arquivo). A cutscene de
        // dormir usa este eixo para decidir COMO a tela fica girada ao
        // fim da animacao: deitado olhando o teto no sentido do pe da
        // cama, nao da cabeceira (ver cutscenes/sleep-sequence.js).
        footDirection: toWorldDirection(footLocalX, footLocalZ),
      };
      interactables.push(bedInteractable);
      bedInteractables[bedDef.id] = bedInteractable;
    });

    // ---------- Criado-mudo ----------
    // Ver models/nightstand-factory.js (inclusive a nota sobre o
    // modelo enviado como "cabeceira" ser, na verdade, um criado-mudo
    // — o que bate com o pedido do usuário de posicioná-lo "ao lado da
    // cama"). Puramente decorativo: entra em `solids` (para o jogador
    // não atravessar o móvel andando), mas não em `interactables` —
    // sem contorno de destaque, sem prompt de "Interagir", sem
    // diálogo, sem animação, sem som (ver instrução do usuário). O
    // abajur apoiado em cima dele (ver bloco mais abaixo, depois da
    // colisão) É interativo — mas é o abajur que entra em
    // `interactables`, não o criado-mudo em si, que continua do jeito
    // descrito acima.
    //
    // Só sabe posicionar o criado-mudo quando a cama referenciada está
    // encostada na parede de fundo (`side === "fundo"`, o único caso
    // configurado hoje em RoomConfig.beds) — mesma lógica de
    // "cabeceira encostada na parede de fundo" de BedFactory logo
    // acima. Se um dia surgir uma cama 'esquerda'/'direita', este
    // bloco precisaria de um ramo equivalente; não implementado agora
    // por não haver essa configuração em uso.
    // Guarda a posição já calculada de cada criado-mudo (por id), para
    // o bloco da estante logo abaixo poder se referenciar a ele sem
    // duplicar nenhuma conta feita aqui (mesmo princípio de
    // bedPlacements acima).
    const nightstandPlacements = {};

    (config.nightstands || []).forEach(function (nightstandDef) {
      const bedPlacement = bedPlacements[nightstandDef.bedId];
      if (!bedPlacement || bedPlacement.side !== "fundo") {
        return;
      }

      const built = window.NightstandFactory.createNightstand();
      const group = built.group;

      // Mesma folga de encaixe (0.02) contra a parede já usada pela
      // cama nos lados 'esquerda'/'direita' (wallEmbed, ver acima) —
      // sem vão visível entre o móvel e a parede.
      const wallGap = 0.02;

      // Vão até a cama: o suficiente para não encostar nem dar a
      // impressão de que os dois móveis estão colados um no outro,
      // mas pequeno o bastante para ficar claramente "ao lado dela"
      // (mesma ideia de folga usada entre móveis e paredes no resto
      // do quarto/corredor).
      const bedGap = 0.1;

      // Lado aberto do quarto: a cama (side = 'fundo') ocupa, no eixo
      // X do mundo, de bedPlacement.x - worldHalfX até + worldHalfX.
      // Do lado direito (X crescente) sobra só ~20cm até a parede
      // direita (RoomConfig.size = 6, offset da cama = 2) — estreito
      // demais para o criado-mudo (built.width ~0.59m). Do lado
      // esquerdo (X decrescente) o quarto fica praticamente livre até
      // a parede esquerda, então é ali que o móvel entra, junto à
      // ponta da cabeceira da cama.
      const bedLeftEdgeX = bedPlacement.x - bedPlacement.worldHalfX;
      const x = bedLeftEdgeX - bedGap - built.width / 2;

      // Z = 0 local do criado-mudo já é a face de trás (encostada na
      // parede — ver convenção em nightstand-factory.js), então basta
      // colocar esse ponto exatamente onde a parede de fundo fica
      // (-bedPlacement.size), com a mesma folga wallGap usada acima.
      const z = -bedPlacement.size + wallGap;

      group.position.set(x, 0, z);
      root.add(group);

      // Colisão: mesma margem (0.05) já usada pela cama/escrivaninha.
      const nightstandMargin = 0.05;
      solids.push({
        owner: group,
        minX: x - built.width / 2 - nightstandMargin,
        maxX: x + built.width / 2 + nightstandMargin,
        minZ: z - nightstandMargin,
        maxZ: z + built.depth + nightstandMargin,
      });

      nightstandPlacements[nightstandDef.id] = {
        x: x,
        width: built.width,
      };

      // ---------- Abajur (luminária de mesa) ----------
      // Ver models/table-lamp-factory.js (inclusive o comentário no
      // topo daquele arquivo sobre reaproveitar kind: "lightSwitch").
      // Mesmo sistema de importação de .glb usado acima para o
      // criado-mudo, com duas diferenças: o abajur é interativo
      // (liga/desliga a própria luz) e por isso entra em
      // `interactables`, não só em `solids` — e é filho do próprio
      // grupo do criado-mudo (não de `root`), então "anda junto" com
      // ele automaticamente, sem duplicar nenhuma conta de posição.
      // Só falta decidir onde, no tampo do criado-mudo, o abajur
      // fica apoiado: centralizado na superfície (X = 0, Z = metade
      // da profundidade — ver convenção de espaço local em
      // table-lamp-factory.js) e na altura exata do tampo
      // (built.height, o mesmo valor já usado na colisão acima).
      const lampBuilt = window.TableLampFactory.createTableLamp(materials);
      lampBuilt.group.position.set(0, built.height, built.depth / 2);
      group.add(lampBuilt.group);

      interactables.push({
        id: "abajur-" + nightstandDef.id,
        kind: "lightSwitch",
        outline: lampBuilt.outline,
        toggleSwitch: function () {
          lampBuilt.toggle();
        },
      });

      // Anexa `isLampOn` ao interativo da cama que este abajur
      // acompanha (ver comentário sobre "kind": "bed" no bloco da
      // cama acima) — assim scripts/main.js só precisa perguntar
      // `currentTarget.isLampOn()` ao próprio alvo em destaque, sem
      // precisar conhecer o criado-mudo/abajur nem procurá-lo à parte.
      const bedInteractable = bedInteractables[nightstandDef.bedId];
      if (bedInteractable) {
        bedInteractable.isLampOn = lampBuilt.isOn;
      }
    });

    // ---------- Estante ----------
    // Ver models/bookshelf-factory.js. Puramente decorativa: entra em
    // `solids` (para o jogador não atravessar o móvel andando), mas
    // não em `interactables` — sem contorno de destaque, sem prompt de
    // "Interagir", sem diálogo, sem animação, sem som (mesmo
    // tratamento do criado-mudo, ver bloco acima). Encostada na mesma
    // parede de fundo do criado-mudo (`side === "fundo"` — único caso
    // configurado hoje, mesma limitação já assumida pelo bloco de
    // criado-mudo acima), no trecho livre entre a parede esquerda e o
    // criado-mudo — posição indicada pelo usuário (print de
    // referência do cenário): perto da parede lateral, sem encostar
    // nela nem no criado-mudo/abajur ao lado da cama.
    // Guarda a posição já calculada de cada estante (por id), para o
    // bloco novo do troféu logo abaixo poder se referenciar a ela sem
    // duplicar nenhuma conta feita aqui (mesmo princípio de
    // wardrobePlacements/nightstandPlacements acima e abaixo).
    const bookshelfPlacements = {};

    (config.bookshelves || []).forEach(function (bookshelfDef) {
      const nightstandPlacement = nightstandPlacements[bookshelfDef.nightstandId];
      if (!nightstandPlacement) {
        return;
      }

      const built = window.BookshelfFactory.createBookshelf();
      const group = built.group;

      // Mesma folga de encaixe (0.02) contra a parede já usada pelo
      // criado-mudo (wallGap, ver acima) — sem vão visível entre a
      // estante e a parede.
      const wallGap = 0.02;

      // Folgas mínimas de segurança contra a parede lateral e contra o
      // criado-mudo — o pedido do usuário é que a estante não encoste
      // em nenhum dos dois; 0.3 é uma folga pequena o bastante para a
      // estante continuar lendo como "encostada" naquele canto do
      // quarto, mas grande o bastante para nunca parecer colada nem
      // atravessando os móveis vizinhos.
      const wallMinGap = 0.3;
      const nightstandMinGap = 0.3;

      // Trecho livre da parede de fundo: da parede esquerda (x =
      // -half, mais a folga mínima) até a borda do criado-mudo mais
      // próxima da parede (mais a folga mínima do lado dele). A
      // estante entra centralizada nesse trecho — sobra folga extra
      // dos dois lados além do mínimo, então nunca encosta em nada,
      // mesmo se o modelo precisar de um pouco mais de largura no
      // futuro.
      const availableLeftX = -half + wallMinGap;
      const availableRightX = nightstandPlacement.x - nightstandPlacement.width / 2 - nightstandMinGap;
      const x = (availableLeftX + availableRightX) / 2;

      // Z = 0 local da estante já é a face de trás (encostada na
      // parede), então basta colocar esse ponto exatamente onde a
      // parede de fundo fica (-size), com a mesma folga wallGap usada
      // pelo criado-mudo.
      const z = -size + wallGap;

      group.position.set(x, 0, z);
      root.add(group);

      // Colisão: mesma margem (0.05) já usada pelo criado-mudo/cama.
      const bookshelfMargin = 0.05;
      solids.push({
        owner: group,
        minX: x - built.width / 2 - bookshelfMargin,
        maxX: x + built.width / 2 + bookshelfMargin,
        minZ: z - bookshelfMargin,
        maxZ: z + built.depth + bookshelfMargin,
      });

      bookshelfPlacements[bookshelfDef.id] = {
        x: x,
        z: z,
        width: built.width,
        depth: built.depth,
        // `height` não era usado por nenhum bloco anterior (a estante
        // em si não tinha nada apoiado em cima até agora) — guardado
        // aqui só para o bloco novo do troféu logo abaixo poder
        // apoiá-lo exatamente no topo dela sem duplicar essa conta
        // (mesmo princípio de wardrobePlacements[...].height, usado
        // pela caixa de papelão em cima do guarda-roupas).
        height: built.height,
      };
    });

    // ---------- Troféu (em cima da estante) ----------
    // Ver models/trophy-factory.js. Puramente decorativa: pedido
    // explícito do usuário para NÃO entrar em `interactables` (sem
    // contorno de destaque, sem prompt de "Interagir", sem diálogo, sem
    // animação, sem som, sem evento) — mesmo tratamento da caixa de
    // papelão em cima do guarda-roupas (ver bloco mais abaixo). Também
    // não entra em `solids`: a área do troféu fica inteiramente dentro
    // da área da estante, já coberta pelo `solids` dela (ver bloco
    // acima) — mesmo raciocínio já usado pela caixa de papelão/TV.
    //
    // `bookshelfId` amarra o troféu à estante em cujo topo ele fica:
    // usa a posição/dimensões já calculadas dela (bookshelfPlacements,
    // guardado no bloco acima), sem duplicar nenhuma conta aqui.
    (config.trophies || []).forEach(function (trophyDef) {
      const bookshelfPlacement = bookshelfPlacements[trophyDef.bookshelfId];
      if (!bookshelfPlacement) {
        return;
      }

      const built = window.TrophyFactory.createTrophy();
      const group = built.group;

      // Posição no topo da estante — mesma convenção "centralizada" de
      // espaço local do troféu (X/Z = centro da base, ver comentário em
      // trophy-factory.js), por isso aqui só é preciso decidir o centro
      // (x, z) dele sobre o topo e a altura (y). Pedido explícito do
      // usuário desta vez: centralizar (diferente da caixa de papelão/
      // lata de lixo, que foram deslocadas de propósito para não
      // parecerem "encaixadas") — x no centro horizontal da estante
      // (bookshelfPlacement.x já é esse centro, ver bloco acima) e z no
      // meio da profundidade dela (bookshelfPlacement.z é a face de
      // trás, encostada na parede, e a estante cresce built.depth para
      // dentro do quarto a partir daí — ver comentário de convenção de
      // espaço local em models/bookshelf-factory.js).
      const x = bookshelfPlacement.x;
      const z = bookshelfPlacement.z + bookshelfPlacement.depth / 2;

      // Altura: exatamente o topo da estante (bookshelfPlacement.height)
      // — a base do troféu (Y local = 0, mesma convenção de
      // TrashCanFactory/CardboardBoxFactory) encosta ali, sem flutuar
      // nem afundar no móvel.
      const y = bookshelfPlacement.height;

      group.position.set(x, y, z);
      root.add(group);
    });

    // ---------- Guarda-roupas ----------
    // Ver models/wardrobe-factory.js (inclusive o comentário longo
    // naquele arquivo sobre as portas já chegarem fechadas no próprio
    // .glb, e sobre a peça já ser reconhecida como interativa sem
    // nenhuma ação própria ainda). Diferente de
    // cama/criado-mudo/estante acima (todos encostados na parede de
    // FUNDO), o guarda-roupas vai na parede LATERAL ESQUERDA — ver o
    // comentário em RoomConfig.wardrobes (scenes/room-config.js) sobre
    // como essa parede foi identificada a partir do print de
    // referência do usuário.
    //
    // O grupo devolvido por WardrobeFactory.createWardrobe já nasce na
    // convenção "Z = 0 é a parede, cresce para +Z" (mesma convenção de
    // NightstandFactory/BookshelfFactory) — que é exatamente o que a
    // parede de FUNDO precisa (por isso nightstand/bookshelf acima só
    // usam essa convenção direto, sem nenhuma rotação extra). A parede
    // ESQUERDA, porém, corre ao longo do eixo Z do quarto (não do X) e
    // sua direção "para dentro do quarto" é +X, não +Z — por isso, só
    // para este móvel, o grupo inteiro precisa de mais 90° em Y (só
    // quando side === "esquerda"): isso faz o "Z local" do móvel
    // (frente/costas) passar a apontar para o eixo X do mundo (parede
    // -> dentro do quarto) e o "X local" (largura) passar a correr ao
    // longo do Z do mundo (o sentido em que a parede esquerda se
    // estende) — mesma relação já usada pelas próprias paredes do
    // invólucro (ver leftWall/rightWall mais acima, que giram 90°/-90°
    // pelo mesmo motivo).
    // Guarda a posição já calculada de cada guarda-roupas (por id),
    // para o bloco da lata de lixo logo abaixo poder se referenciar a
    // ele sem duplicar nenhuma conta feita aqui (mesmo princípio de
    // nightstandPlacements acima).
    const wardrobePlacements = {};

    (config.wardrobes || []).forEach(function (wardrobeDef) {
      if (wardrobeDef.side !== "esquerda") {
        // Não implementado para outras paredes por não haver essa
        // configuração em uso hoje (mesma limitação já assumida pelo
        // bloco do criado-mudo/estante acima, restrito a side ===
        // "fundo").
        return;
      }

      const built = window.WardrobeFactory.createWardrobe(materials);
      const group = built.group;

      // Mesma folga de encaixe (0.02) contra a parede já usada por
      // criado-mudo/estante na parede de fundo (wallGap, ver acima) —
      // sem vão visível entre o móvel e a parede.
      const wallGap = 0.02;

      const x = -half + wallGap;
      const z = wardrobeDef.offset;

      group.rotation.y = Math.PI / 2;
      group.position.set(x, 0, z);
      root.add(group);

      // Colisão: caixa cobrindo a área do guarda-roupas inteiro, mesma
      // margem (0.05) já usada pelos outros móveis do quarto. Depois
      // da rotação de 90° acima, a profundidade do móvel (Z local)
      // passa a se projetar no eixo X do mundo (a partir da parede
      // esquerda, para dentro do quarto) e a largura (X local) no eixo
      // Z do mundo, centralizada em `z`.
      const wardrobeMargin = 0.05;
      solids.push({
        owner: group,
        minX: x - wardrobeMargin,
        maxX: x + built.depth + wardrobeMargin,
        minZ: z - built.width / 2 - wardrobeMargin,
        maxZ: z + built.width / 2 + wardrobeMargin,
      });

      wardrobePlacements[wardrobeDef.id] = {
        x: x,
        z: z,
        width: built.width,
        depth: built.depth,
        // `height` não era usado por nenhum bloco anterior (lata de
        // lixo/vaso de planta ficam no chão, não precisam da altura do
        // guarda-roupas) — guardado aqui só para o bloco novo da caixa
        // de papelão logo abaixo poder apoiá-la exatamente no topo dele
        // sem duplicar essa conta.
        height: built.height,
      };

      // Interativo (contorno + prompt de "Interagir"), mas sem ação
      // própria ainda — ver o comentário longo em
      // models/wardrobe-factory.js sobre por que isso já funciona
      // corretamente sem precisar tocar em objectives/objective-config.js
      // nem no switch de scripts/main.js: "wardrobe" simplesmente não
      // está liberado em nenhuma etapa e não tem resposta de diálogo
      // cadastrada, então apertar "Interagir" nele não faz nada.
      interactables.push({
        id: wardrobeDef.id,
        kind: "wardrobe",
        outline: built.outline,
        interact: built.interact,
      });
    });

    // ---------- Caixa de papelão (em cima do guarda-roupas) ----------
    // Ver models/cardboard-box-factory.js. Puramente decorativa: pedido
    // explícito do usuário para NÃO entrar em `interactables` (sem
    // contorno de destaque, sem prompt de "Interagir", sem diálogo, sem
    // animação, sem som, sem evento) — mesmo tratamento do criado-mudo/
    // estante (ver blocos acima). Também não entra em `solids`: o
    // sistema de colisão do quarto é só 2D (planta baixa X/Z, sem
    // nenhum campo de altura — ver os objetos `{minX,maxX,minZ,maxZ}`
    // em todo este arquivo), e a área do guarda-roupas já está coberta
    // pelo `solids` dele (ver bloco acima); como a caixa fica inteira
    // dentro dessa mesma área, em cima do móvel, não precisa de nenhum
    // sólido próprio — mesmo raciocínio já usado pelo abajur em cima do
    // criado-mudo e pela TV em cima da mesinha (nenhum dos dois ganha
    // `solids` separado, ver blocos de nightstand e tableTVs).
    //
    // `wardrobeId` amarra a caixa ao guarda-roupas em cujo topo ela
    // fica: usa a posição/dimensões já calculadas dele (wardrobePlacement,
    // guardado no bloco acima), sem duplicar nenhuma conta aqui.
    (config.cardboardBoxes || []).forEach(function (boxDef) {
      const wardrobePlacement = wardrobePlacements[boxDef.wardrobeId];
      if (!wardrobePlacement) {
        return;
      }

      const built = window.CardboardBoxFactory.createCardboardBox();
      const group = built.group;

      // Posição no topo do guarda-roupas — mesma convenção "centralizada"
      // de espaço local da caixa (X/Z = centro da base, ver comentário em
      // cardboard-box-factory.js), por isso aqui só é preciso decidir o
      // centro (x, z) dela sobre o tampo e a altura (y).
      //
      // Rotação decorativa fixa, mesmo espírito da lata de lixo logo
      // abaixo (TrashCanFactory, ver bloco seguinte): evita o alinhamento
      // perfeito com as bordas do guarda-roupas, para não ler como
      // posicionada "artificialmente" (pedido explícito do usuário) — a
      // caixa não tem uma "frente" que precise apontar para algum lado
      // em particular (textura simétrica nas quatro faces, só uma fita
      // de papelão no topo, ver comentário em cardboard-box-factory.js).
      // Aplicada ANTES de calcular x/z abaixo porque, com a caixa quase
      // quadrada na base (built.width/built.depth bem próximos), girar o
      // objeto aumenta a área que ele ocupa projetada nos eixos X/Z do
      // mundo (a "sombra" de um retângulo girado é maior que o próprio
      // retângulo) — as margens contra a borda do guarda-roupas
      // calculadas logo abaixo (`frontMargin`/comentários) já levam essa
      // rotação em conta, por isso precisam do ângulo primeiro.
      const rotationY = -Math.PI / 18; // 10°
      group.rotation.y = rotationY;

      // Metade do contorno (bounding box) da base da caixa já projetado
      // nos eixos do mundo depois da rotação acima — mesma trigonometria
      // usada para caixas de colisão giradas (ver comentário da lata de
      // lixo logo abaixo, que faz a mesma aproximação para a própria
      // colisão): base ~retangular, então a projeção de cada eixo é
      // |meia-largura·cos| + |meia-profundidade·sen| (e vice-versa).
      const halfW = built.width / 2;
      const halfD = built.depth / 2;
      const boxHalfX = Math.abs(halfW * Math.cos(rotationY)) + Math.abs(halfD * Math.sin(rotationY));
      const boxHalfZ = Math.abs(halfW * Math.sin(rotationY)) + Math.abs(halfD * Math.cos(rotationY));

      // Eixo X do mundo (profundidade do guarda-roupas depois da rotação
      // de 90° daquele bloco: vai de wardrobePlacement.x, na parede, até
      // wardrobePlacement.x + wardrobePlacement.depth, para dentro do
      // quarto — ver comentário no bloco do guarda-roupas acima e o
      // `solids` dele). Em vez de centralizar a caixa exatamente no meio
      // dessa profundidade (o que a deixaria com uma leitura "colada por
      // um sistema", exatamente o que o usuário pediu para evitar),
      // empurra a caixa um pouco para o lado da parede (mesma lógica de
      // uma caixa de verdade, deixada encostada mais para o fundo do
      // móvel do que pendurada na borda da frente): `wallGap` é a folga
      // até a parede (mesmo espírito do `wallGap` usado pelo próprio
      // guarda-roupas contra ela, ver bloco acima — valor um pouco maior
      // aqui só porque `boxHalfX` já é a metade do retângulo GIRADO, não
      // da caixa "reta"). Com os valores usados (built ≈0.46×0.47 antes
      // de girar), sobra ≈8,5cm de margem livre entre a borda da frente
      // da caixa e a borda da frente do guarda-roupas
      // (wardrobePlacement.depth ≈0.65 contra 2×boxHalfX ≈0.535 mais a
      // folga da parede) — dá para conferir com o script de validação
      // usado ao montar este bloco, caso TARGET_HEIGHT/wallGap precisem
      // mudar no futuro.
      const wallGap = 0.03;
      const x = wardrobePlacement.x + wallGap + boxHalfX;

      // Eixo Z do mundo (largura do guarda-roupas, centralizada em
      // wardrobePlacement.z — ver `solids` dele acima). Mesmo raciocínio
      // do eixo X: em vez de centralizar exatamente em wardrobePlacement.z,
      // desloca um pouco para um dos lados (`widthOffset`) — leitura de
      // objeto largado ali, não de peça "encaixada" no centro exato do
      // móvel; a largura do guarda-roupas (~1.04m) tem espaço de sobra
      // para esse deslocamento sem chegar perto das bordas, mesmo com o
      // retângulo já girado (boxHalfZ).
      const widthOffset = -0.13;
      const z = wardrobePlacement.z + widthOffset;

      // Altura: exatamente o topo do guarda-roupas (wardrobePlacement.height,
      // guardado no bloco acima) — a base da caixa (Y local = 0, mesma
      // convenção de TrashCanFactory) encosta ali, sem flutuar nem
      // afundar no móvel.
      const y = wardrobePlacement.height;

      group.position.set(x, y, z);
      root.add(group);
    });

    // ---------- Lata de lixo ----------
    // Ver models/trash-can-factory.js. Puramente decorativa: entra em
    // `solids` (para o jogador não atravessar o objeto andando), mas
    // não em `interactables` — sem contorno de destaque, sem prompt de
    // "Interagir", sem diálogo, sem animação, sem som (mesmo
    // tratamento do criado-mudo/estante, ver blocos acima). Fica no
    // chão, encostada na mesma parede ESQUERDA do guarda-roupas, no
    // trecho livre entre ele e a parede de entrada (posição indicada
    // pelo usuário — print de referência do cenário).
    // Guarda a posição já calculada de cada lata de lixo (por id), para
    // o bloco do vaso de planta logo abaixo poder se referenciar a ela
    // sem duplicar nenhuma conta feita aqui (mesmo princípio de
    // wardrobePlacements acima).
    const trashCanPlacements = {};

    (config.trashCans || []).forEach(function (trashCanDef) {
      const wardrobePlacement = wardrobePlacements[trashCanDef.wardrobeId];
      if (!wardrobePlacement) {
        return;
      }

      const built = window.TrashCanFactory.createTrashCan();
      const group = built.group;

      // Mesma folga de encaixe (0.02) contra a parede já usada pelo
      // guarda-roupas (wallGap, ver bloco acima) — sem vão visível
      // entre a lata e a parede. Diferente do guarda-roupas, porém, a
      // lata não nasce com a convenção "Z = 0 é a parede" (ver
      // comentário de convenção de espaço local em
      // models/trash-can-factory.js: objeto centralizado, sem face de
      // trás) — por isso a posição ao longo do eixo X do quarto (o
      // mesmo sentido "parede -> dentro do quarto" usado pelo
      // guarda-roupas nessa mesma parede esquerda) precisa somar a
      // metade da própria largura do objeto, para a face mais próxima
      // da parede ficar encostada nela, e não o centro.
      const wallGap = 0.02;
      const x = -half + wallGap + built.width / 2;

      // Ao longo da parede (eixo Z do quarto): logo depois da borda do
      // guarda-roupas mais próxima da parede de entrada (z crescente —
      // o guarda-roupas fica no meio do caminho entre a entrada e a
      // parede de fundo, ver RoomConfig.wardrobes, e esse é o lado com
      // trecho de parede livre até o canto da porta), com uma folga
      // pequena para a lata não encostar nele, mais a metade da
      // própria profundidade do objeto (mesmo raciocínio do `x` acima:
      // para o CENTRO da lata ficar a essa distância da borda do
      // guarda-roupas, não a face mais próxima dela).
      const wardrobeGap = 0.15;
      const wardrobeNearEdgeZ = wardrobePlacement.z + wardrobePlacement.width / 2;
      const z = wardrobeNearEdgeZ + wardrobeGap + built.depth / 2;

      // Pequena rotação fixa só para a lata não ficar "grudada" no
      // mesmo alinhamento perfeito da parede — leitura mais natural de
      // um objeto solto no chão ao lado do móvel, sem nenhum efeito
      // além do puramente visual (a peça não tem uma "frente" que
      // precise apontar para algum lado em particular — ver comentário
      // no topo de models/trash-can-factory.js).
      group.rotation.y = Math.PI / 6;
      group.position.set(x, 0, z);
      root.add(group);

      // Colisão: mesma margem (0.05) já usada pelos outros móveis do
      // quarto — caixa simples cobrindo a área da lata (aproximação
      // por bounding box alinhada aos eixos do mundo, sem considerar a
      // rotação acima; a folga de 0.05 é suficiente para cobrir o
      // pequeno crescimento da caixa alinhada causado pela rotação de
      // 30°, já que a lata é um objeto pequeno e quase simétrico).
      const trashCanMargin = 0.05;
      solids.push({
        owner: group,
        minX: x - built.width / 2 - trashCanMargin,
        maxX: x + built.width / 2 + trashCanMargin,
        minZ: z - built.depth / 2 - trashCanMargin,
        maxZ: z + built.depth / 2 + trashCanMargin,
      });

      trashCanPlacements[trashCanDef.id] = {
        x: x,
        z: z,
        width: built.width,
        depth: built.depth,
      };
    });

    // ---------- Vaso de planta ----------
    // Ver models/floor-plant-factory.js. Puramente decorativo: entra em
    // `solids` (para o jogador não atravessar o vaso andando), mas não
    // em `interactables` — sem contorno de destaque, sem prompt de
    // "Interagir", sem diálogo, sem animação, sem som (mesmo tratamento
    // da própria lata de lixo, ver bloco acima). Fica no chão, encostado
    // na mesma parede ESQUERDA da lata de lixo, logo depois dela, do
    // lado livre em direção à parede de entrada (posição indicada pelo
    // usuário — print de referência do cenário).
    // Guarda a posição já calculada do vaso (por id), para o bloco da
    // bola de futebol logo abaixo poder se referenciar a ela sem
    // duplicar nenhuma conta feita aqui (mesmo princípio de
    // trashCanPlacements/wardrobePlacements acima).
    const floorPlantPlacements = {};

    (config.floorPlants || []).forEach(function (floorPlantDef) {
      const trashCanPlacement = trashCanPlacements[floorPlantDef.trashCanId];
      if (!trashCanPlacement) {
        return;
      }

      const built = window.FloorPlantFactory.createFloorPlant();

      // O grupo devolvido pela factory já vem com a correção de eixo
      // (rotation.x) embutida nele mesmo (ver comentário em
      // models/floor-plant-factory.js — conversão Z-up do .glb original
      // para Y-up do Three.js). Setar TAMBÉM um rotation.y diretamente
      // nesse mesmo objeto, por cima do rotation.x que já existe, faz o
      // Three.js combinar os dois num Euler só — o que INCLINA o vaso
      // (a rotação de "variedade" passa a girar em torno do eixo
      // vertical ORIGINAL do modelo cru, antes da correção, e não do
      // eixo vertical já corrigido), em vez de só girá-lo na horizontal
      // como pretendido — foi essa combinação que deixou o vaso torto no
      // jogo. Por isso a rotação de variedade entra num grupo
      // ENVOLVENTE separado, por fora do grupo já corrigido: assim ela
      // só acontece depois da correção de eixo já aplicada, sem se
      // misturar com ela (mesma ideia de hierarquia pai/filho já usada
      // em outros pontos do jogo sempre que uma peça precisa de dois
      // ajustes de rotação independentes).
      const group = new THREE.Group();
      group.add(built.group);

      // Mesma folga de encaixe (0.02) contra a parede já usada pela
      // lata de lixo (wallGap, ver bloco acima) — sem vão visível entre
      // o vaso e a parede. Mesma convenção "centralizada" da lata de
      // lixo (ver comentário no topo de models/floor-plant-factory.js):
      // a posição ao longo do eixo X do quarto precisa somar a metade
      // da própria largura do vaso, para a face mais próxima da parede
      // ficar encostada nela, e não o centro.
      const wallGap = 0.02;
      const x = -half + wallGap + built.width / 2;

      // Ao longo da parede (eixo Z do quarto): logo depois da borda da
      // lata de lixo mais próxima da parede de entrada (z crescente —
      // mesmo lado livre já usado para posicionar a própria lata de
      // lixo em relação ao guarda-roupa, ver bloco acima), com uma
      // folga para o vaso não encostar nela (mesma folga usada entre a
      // lata de lixo e o guarda-roupa, wardrobeGap no bloco acima), mais
      // a metade da própria profundidade do vaso (mesmo raciocínio do
      // `x` acima: para o CENTRO do vaso ficar a essa distância da borda
      // da lata de lixo, não a face mais próxima dela).
      const trashCanGap = 0.15;
      const trashCanNearEdgeZ = trashCanPlacement.z + trashCanPlacement.depth / 2;
      const z = trashCanNearEdgeZ + trashCanGap + built.depth / 2;

      // Pequena rotação fixa, só para o vaso não ficar "grudado" no
      // mesmo alinhamento perfeito da lata de lixo ao lado — leitura
      // mais natural de dois objetos soltos no chão lado a lado (mesma
      // ideia da rotação fixa da própria lata de lixo, ver bloco acima;
      // ângulo diferente do dela só para os dois não saírem espelhados
      // um do outro).
      group.rotation.y = -Math.PI / 5;
      group.position.set(x, 0, z);
      root.add(group);

      // Colisão: mesma margem (0.05) e mesma aproximação por bounding
      // box alinhada aos eixos do mundo (ignorando a pequena rotação)
      // já usadas pela lata de lixo ao lado (ver bloco acima).
      const floorPlantMargin = 0.05;
      solids.push({
        owner: group,
        minX: x - built.width / 2 - floorPlantMargin,
        maxX: x + built.width / 2 + floorPlantMargin,
        minZ: z - built.depth / 2 - floorPlantMargin,
        maxZ: z + built.depth / 2 + floorPlantMargin,
      });

      floorPlantPlacements[floorPlantDef.id] = {
        x: x,
        z: z,
        width: built.width,
        depth: built.depth,
      };
    });

    // ---------- Cadeira com roupas ----------
    // Ver models/chair-factory.js. Puramente decorativa: entra em
    // `solids` (para o jogador não atravessar a cadeira andando), mas
    // NÃO em `interactables` — sem contorno de destaque, sem prompt de
    // "Interagir", sem diálogo, sem animação, sem som (mesmo tratamento
    // da lata de lixo e do vaso de planta, ver blocos acima).
    //
    // Diferente de toda a mobília acima, esta peça é posicionada por
    // CANTO (RoomConfig.chairs, campo `corner`), e não por parede +
    // offset: um canto é o encontro de duas paredes, então basta saber
    // onde está cada uma delas e para que lado fica o "dentro do quarto"
    // em cada eixo (`insideX`/`insideZ`, +1 ou -1). São esses dois
    // sinais que resolvem, de uma vez, a posição encostada nas duas
    // paredes E o ângulo em que a cadeira encara o meio do quarto.
    //
    // Atenção à parede de ENTRADA: ela não fica em z = 0, e sim recuada
    // `entryWallInset` para dentro do quarto (a espessura da divisória
    // com o corredor, ver o bloco das paredes no topo) — é essa face
    // recuada que conta aqui, senão o encosto da cadeira ficaria
    // enterrado na parede.
    const chairCorners = {
      "entrada-esquerda": { x: -half, z: -entryWallInset, insideX: 1, insideZ: -1 },
      "entrada-direita": { x: half, z: -entryWallInset, insideX: -1, insideZ: -1 },
      "fundo-esquerda": { x: -half, z: -size, insideX: 1, insideZ: 1 },
      "fundo-direita": { x: half, z: -size, insideX: -1, insideZ: 1 },
    };

    (config.chairs || []).forEach(function (chairDef) {
      const corner = chairCorners[chairDef.corner] || chairCorners["entrada-esquerda"];

      const built = window.ChairFactory.createChair();
      const group = built.group;

      // Ângulo: a cadeira olha para a diagonal do canto, ou seja, para
      // o meio do quarto — é assim que uma cadeira largada num canto se
      // lê, e é o que evita o encosto ficar de frente para o jogador. A
      // frente do modelo é +Z (o encosto fica em -Z, ver
      // models/chair-factory.js) e rotation.y leva esse +Z para
      // (sin, cos): logo o ângulo que aponta para (insideX, insideZ) é
      // atan2(insideX, insideZ) — com os dois valores em -1/+1, isso cai
      // sempre em 45 graus virados para dentro do quarto.
      const rotationY =
        chairDef.rotationY != null
          ? chairDef.rotationY
          : Math.atan2(corner.insideX, corner.insideZ);

      // Meias-medidas da caixa alinhada aos eixos do mundo DEPOIS da
      // rotação (mesma conta da caixa de papelão girada em cima do
      // guarda-roupa, ver bloco acima): girada 45 graus, uma peça de
      // ~0,50 x 0,50 passa a ocupar ~0,71 x 0,71 no mundo. É essa medida
      // que encosta a cadeira no canto sem cravar nenhuma quina dela
      // dentro do lambri.
      const cosA = Math.abs(Math.cos(rotationY));
      const sinA = Math.abs(Math.sin(rotationY));
      const chairHalfX = (built.width * cosA + built.depth * sinA) / 2;
      const chairHalfZ = (built.width * sinA + built.depth * cosA) / 2;

      // Folga contra as duas paredes do canto: um pouco maior que a das
      // peças retas (0.02) justamente porque esta está girada — quem
      // chega perto da parede é uma QUINA da caixa girada, e uma folga
      // apertada deixaria a ponta do encosto (ou a roupa pendurada)
      // atravessando a parede.
      const cornerGap = chairDef.gap != null ? chairDef.gap : 0.05;

      const x = corner.x + corner.insideX * (cornerGap + chairHalfX);
      const z = corner.z + corner.insideZ * (cornerGap + chairHalfZ);

      group.rotation.y = rotationY;
      group.position.set(x, 0, z);
      root.add(group);

      // Colisão: mesma margem (0.05) e mesma aproximação por bounding
      // box alinhada aos eixos do mundo das outras peças do quarto — só
      // que usando as meias-medidas JÁ giradas (chairHalfX/chairHalfZ),
      // e não as do modelo reto.
      const chairMargin = 0.05;
      solids.push({
        owner: group,
        minX: x - chairHalfX - chairMargin,
        maxX: x + chairHalfX + chairMargin,
        minZ: z - chairHalfZ - chairMargin,
        maxZ: z + chairHalfZ + chairMargin,
      });
    });

    // ---------- Bola de futebol ----------
    // Ver models/soccer-ball-factory.js (malha + shader) e
    // scripts/ball-controller.js (física: empurrão do jogador, atrito,
    // rebote contra parede/móvel, e agora também segurar/largar na mão
    // pelo botão "Interagir") — ver comentário no topo de cada um
    // desses dois arquivos para o resto do comportamento. Nasce ao
    // lado do vaso de planta (RoomConfig.soccerBalls -> `floorPlantId`,
    // mesmo princípio de referência de RoomConfig.floorPlants acima),
    // um pouco afastada da parede — espaço de sobra pra rolar assim
    // que o jogador chegar perto, em vez de nascer encostada nela.
    //
    // Diferente de toda a mobília acima: NÃO entra em `solids` (senão
    // o próprio jogador ficaria travado contra ela como se fosse uma
    // parede — resolveMovement bloqueia o eixo em vez de empurrar o
    // obstáculo, ver scripts/collision.js). ENTRA em `interactables`
    // (diferente da versão anterior desta peça): tem contorno de
    // destaque e prompt de "Interagir" como qualquer outro objeto do
    // jogo (ver `outline` em models/soccer-ball-factory.js), mas o
    // botão só alterna pegar/largar na mão (BallController.toggleHold
    // — nunca vai pro inventário do jogador, pedido explícito do
    // usuário); o contato físico direto (chute por encostão) continua
    // reagindo do mesmo jeito de sempre, sem precisar de nenhum botão.
    // Ainda assim colide normalmente CONTRA os `solids` já existentes
    // (paredes, guarda-roupa, cama, criado-mudo, mesinha de TV, lata
    // de lixo, o próprio vaso etc.) — reaproveita a MESMA lista, só
    // nunca aparece nela.
    (config.soccerBalls || []).forEach(function (ballDef) {
      const floorPlantPlacement = floorPlantPlacements[ballDef.floorPlantId];
      if (!floorPlantPlacement) {
        return;
      }

      const built = window.SoccerBallFactory.createSoccerBall(materials);
      root.add(built.group);

      // Afastada da parede (eixo X, mesmo sentido "parede -> dentro do
      // quarto" usado pelo vaso/lata de lixo ao lado): borda do vaso
      // mais distante da parede, mais uma folga BEM maior que a
      // usada pelos móveis encostados acima (de propósito — é uma
      // bola solta no meio do caminho, não uma peça grudada em nada),
      // mais o próprio raio da bola.
      const plantFarEdgeX = floorPlantPlacement.x + floorPlantPlacement.width / 2;
      const wallClearance = 0.4;
      const x = plantFarEdgeX + wallClearance + built.radius;

      // Mesmo Z do vaso, com um pequeno desvio — ao lado dele, não
      // alinhada perfeitamente (leitura mais natural de dois objetos
      // soltos lado a lado, mesma ideia da rotação fixa da lata de
      // lixo/vaso ao lado, ver blocos acima).
      const z = floorPlantPlacement.z + 0.25;

      // ---------- Limite: a bola NUNCA sai de "MEU QUARTO" ----------
      // Retangulo do INTERIOR do quarto, nas coordenadas locais desta
      // cena (as mesmas em que a fisica da bola roda), ja descontado o
      // raio dela. Vai para BallController.create como trava final de
      // posicao, aplicada depois de TODO deslocamento da bola.
      //
      // Por que os solidos sozinhos nao bastavam (o bug relatado: a bola
      // atravessava a parede e ia para o CORREDOR): o solido da parede
      // de entrada e, de PROPOSITO, cortado em dois - um de cada lado do
      // vao da porta - para o JOGADOR poder atravessar andando (ver o
      // bloco "Solidos de colisao do involucro do quarto" acima), e quem
      // fecha o vao em si e a colisao da FOLHA da porta, que vive na cena
      // do CORREDOR e nunca chega a esta fisica. Ou seja: na altura da
      // porta havia um buraco de verdade na lista de colisao, e um chute
      // naquela direcao passava reto por ele.
      //
      // As faces abaixo sao as MESMAS dos solidos das paredes, para o
      // limite coincidir exatamente com onde a bola ja ressaltava antes:
      // entrada em z = -entryWallInset (ou -WALL_THICKNESS quando nao ha
      // passagem), fundo em z = -size + WALL_THICKNESS e laterais em
      // x = -half e x = +half.
      const entryFaceZ = entryDoorway ? -entryWallInset : -WALL_THICKNESS;
      const ballBounds = {
        minX: -half + built.radius,
        maxX: half - built.radius,
        minZ: -size + WALL_THICKNESS + built.radius,
        maxZ: entryFaceZ - built.radius,
      };

      const ball = window.BallController.create(built.group, x, z, built.radius, ballBounds);

      // Botão "Interagir": só pega/larga na mão (ver comentário acima
      // e BallController.toggleHold) — nenhuma outra ação, diálogo ou
      // evento associado.
      interactables.push({
        id: ballDef.id,
        kind: "ball",
        outline: built.outline,
        interact: ball.toggleHold,
        // Exposto para scripts/main.js: enquanto a bola estiver na mão
        // (ou em transição até ela — ver BallController.isHeld), nada
        // além dela mesma pode ficar em destaque nem responder ao
        // botão "Interagir" (pedido do usuário: "o player não deve
        // conseguir interagir com nada enquanto estiver com a bola na
        // mão").
        isHeld: ball.isHeld,
      });

      // `playerPos`/`playerRadius` chegam por fora (ver update() logo
      // abaixo, alimentado por scripts/main.js) — a bola precisa deles
      // pra reagir ao contato com o jogador, diferente do resto dos
      // frameUpdaters do quarto (ventilador, cortina), que só usam
      // delta/elapsed.
      frameUpdaters.push(function (delta, elapsed, playerPos, playerRadius) {
        ball.update(delta, solids, playerPos, playerRadius);
      });
    });

    // ---------- Mesinha de TV ----------
    // Ver models/tabletv-factory.js. Puramente decorativa: entra em
    // `solids` (para o jogador não atravessar o móvel andando), mas
    // não em `interactables` — sem contorno de destaque, sem prompt de
    // "Interagir", sem diálogo, sem animação, sem som (mesmo
    // tratamento do criado-mudo/estante, ver blocos acima). Vai na
    // parede LATERAL DIREITA, perto da parede de entrada (ver
    // comentário em RoomConfig.tableTVs sobre a correção de lado: a
    // primeira tentativa usou a parede esquerda e saiu espelhada — um
    // print já dentro do jogo confirmou que o canto certo é o da
    // parede direita). O grupo devolvido por
    // TableTVFactory.createTableTV nasce na convenção "Z = 0 é a
    // parede, cresce para +Z" (mesma convenção de Nightstand/
    // Bookshelf), que sem rotação serviria direto para a parede de
    // FUNDO — na parede DIREITA, a correção é -90° em Y (sentido
    // oposto ao -90°/+90° usado pelo guarda-roupas na esquerda, mesmo
    // princípio espelhado): isso faz o "Z local" (frente/costas)
    // apontar para -X do mundo (da parede direita para dentro do
    // quarto) e o "X local" (largura) correr ao longo do Z do mundo.
    (config.tableTVs || []).forEach(function (tableTVDef) {
      if (tableTVDef.side !== "direita") {
        // Não implementado para outras paredes por não haver essa
        // configuração em uso hoje (mesma limitação já assumida pelos
        // blocos de criado-mudo/estante, restritos a side === "fundo",
        // e pelo guarda-roupas, restrito a side === "esquerda").
        return;
      }

      const built = window.TableTVFactory.createTableTV();
      const group = built.group;

      // Mesma folga de encaixe (0.02) contra a parede já usada por
      // criado-mudo/estante/guarda-roupas (wallGap, ver blocos acima)
      // — sem vão visível entre o móvel e a parede.
      const wallGap = 0.02;

      const x = half - wallGap;
      const z = tableTVDef.offset;

      group.rotation.y = -Math.PI / 2;
      group.position.set(x, 0, z);
      root.add(group);

      // Colisão: caixa cobrindo a área da mesinha inteira, mesma
      // margem (0.05) já usada pelos outros móveis do quarto. Depois
      // da rotação de -90° acima, a profundidade do móvel (Z local)
      // passa a se projetar para -X no mundo (a partir da parede
      // direita, para dentro do quarto) e a largura (X local) no eixo
      // Z do mundo, centralizada em `z` — mesma lógica de colisão do
      // guarda-roupas, espelhada.
      const tableTVMargin = 0.05;
      solids.push({
        owner: group,
        minX: x - built.depth - tableTVMargin,
        maxX: x + tableTVMargin,
        minZ: z - built.width / 2 - tableTVMargin,
        maxZ: z + built.width / 2 + tableTVMargin,
      });

      // ---------- TV ----------
      // Ver models/tv-factory.js. Puramente decorativa, mesmo
      // tratamento do resto do bloco acima: sem outline, sem entrada
      // em `interactables`, sem `solids` próprio (a caixa de colisão
      // da mesinha, montada acima, já cobre a área por baixo dela —
      // mesmo princípio do abajur em cima do criado-mudo, que também
      // não ganha um `solids` separado). Filha do próprio grupo da
      // mesinha (não de `root`), então "anda junto" com ela
      // automaticamente, sem duplicar nenhuma conta de posição — mesma
      // ideia do abajur em cima do criado-mudo (ver bloco de
      // nightstand/abajur mais acima).
      const tvBuilt = window.TVFactory.createTV();

      // Posição sobre o tampo: centralizada na largura da mesinha (X
      // local = 0 — ver convenção de espaço local em
      // tabletv-factory.js) e na altura exata do tampo (built.height,
      // mesmo valor já usado na colisão acima). `tvZLocal` é a
      // distância da parede (Z local da mesinha, que cresce para
      // dentro do quarto): 0.35 deixa uma pequena folga entre a TV e a
      // parede (por trás, como se houvesse fiação ali) e o resto do
      // tampo livre na frente, onde o próprio modelo da TV já traz um
      // controle remoto apoiado (ver comentário de espaço local em
      // tv-factory.js) — folga suficiente para ele não ultrapassar a
      // borda da mesinha.
      const tvZLocal = 0.35;
      tvBuilt.group.position.set(0, built.height, tvZLocal);

      // Rotação: aponta o visor da TV (frente do modelo, ver convenção
      // de espaço local em tv-factory.js) diretamente para a cama
      // (RoomConfig.tableTVs[].bedId, ver room-config.js), para o
      // jogador poder assistir à TV deitado ou perto dela no futuro.
      // Como este grupo é filho do grupo já rotacionado da mesinha
      // (group.rotation.y = -Math.PI / 2, ver acima), a rotação
      // aplicada AQUI precisa ser relativa a esse referencial: primeiro
      // calcula, em coordenadas do mundo, a posição da TV sobre o
      // tampo (mesma conta de x/z usada na colisão, projetando
      // tvZLocal pela rotação da mesinha) e o ângulo (atan2) até o
      // centro da cama; depois subtrai a rotação já aplicada pela
      // mesinha (-Math.PI / 2) para achar só o ajuste que falta neste
      // grupo filho.
      const tvBedPlacement = bedPlacements[tableTVDef.bedId];
      if (tvBedPlacement) {
        const tvWorldX = x - tvZLocal; // rotação -90° da mesinha: Z local → -X do mundo
        const tvWorldZ = z; // X local = 0 não desloca em Z do mundo nesta rotação
        const dx = tvBedPlacement.x - tvWorldX;
        const dz = tvBedPlacement.z - tvWorldZ;
        const worldAngle = Math.atan2(dx, dz);
        tvBuilt.group.rotation.y = worldAngle - group.rotation.y;
      }

      group.add(tvBuilt.group);

      // ---------- Rádio de mão ----------
      // Ver models/radio-factory.js. Puramente decorativa, mesmo
      // tratamento do resto deste bloco: sem outline, sem entrada em
      // `interactables`, sem `solids` próprio (a caixa de colisão da
      // mesinha, montada acima, já cobre a área por baixo dele —
      // mesmo princípio da TV logo acima). Filho do próprio grupo da
      // mesinha (não de `root`, e não da TV), então "anda junto" com
      // ela automaticamente, sem duplicar nenhuma conta de posição —
      // mesma ideia da TV.
      const radioBuilt = window.RadioFactory.createRadio();

      // Posição sobre o tampo: mesma altura exata da TV (built.height
      // — o rádio já nasce deitado, apoiado sobre sua própria base,
      // ver radio-factory.js, então soma-se só a altura do tampo, sem
      // nenhum ajuste extra). Z local igual ao da TV (tvZLocal) — os
      // dois ficam alinhados na mesma "fileira" sobre a mesinha, à
      // mesma distância da parede.
      //
      // X local POSITIVO (radioXLocal) — corrigido depois do relato
      // do usuário (com print) de que o rádio estava caindo em cima
      // do controle remoto do modelo da TV. O controle ("TVRemote")
      // vem embutido no próprio .glb da TV (ver tv-factory.js) e fica
      // deslocado do centro do corpo — não entra no bounding box
      // usado por NATIVE_CENTER_X/Z ali, então não dava pra ver isso
      // só lendo tv-factory.js. Extraindo a hierarquia de nós do
      // crt_tv_psx.glb e projetando o controle no referencial local
      // desta mesinha (mesma rotação aplicada a tvBuilt.group para
      // apontar a TV para a cama, ver tvBedPlacement acima), ele cai
      // em X local ≈ -0,50 a -0,29, Z local ≈ 0,39 a 0,64 — faixa que
      // cobre exatamente a posição antiga do rádio (-0,48, mesmo Z da
      // TV), daí a sobreposição. TV ocupa só a faixa central do tampo
      // (X local de -0,3 a 0,3, ver tv-factory.js) e o controle fica
      // do lado NEGATIVO disso, então o lado POSITIVO (oposto) está
      // livre dos dois. Espelhando o valor antigo (0,48 em vez de
      // -0,48) mantém as mesmas folgas já validadas (~14-17cm até a
      // lateral da TV, ~15cm até a borda da mesinha — built.width/2 ≈
      // 0,668), só do lado sem o controle.
      const radioXLocal = 0.48;
      radioBuilt.group.position.set(radioXLocal, built.height, tvZLocal);
      group.add(radioBuilt.group);

      // ---------- Tomada + cabo de energia ----------
      // Ver models/outlet-factory.js e models/cable-factory.js. Só
      // para dar a impressão de que a TV está ligada na tomada (pedido
      // explícito do usuário) — mesmo tratamento decorativo do resto
      // deste bloco: sem interação, sem `interactables`, sem `solids`
      // próprio (peças pequenas, coladas na parede/na TV, fora do
      // caminho do jogador).
      //
      // Precisa da posição-MUNDO da traseira da TV (tvBuilt.powerAnchor
      // — ver tv-factory.js) para saber onde a tomada deve ficar
      // (mesma altura, na parede diretamente atrás dela) e para onde o
      // cabo deve apontar. Como esse ponto é filho de uma cadeia de
      // transformações (TV → grupo da mesinha → root, com duas
      // rotações no meio do caminho), em vez de repetir na mão a
      // mesma conta de x/z/ângulo já feita acima para a TV, força a
      // atualização das matrizes-mundo (`root.updateMatrixWorld`) e lê
      // a posição já resolvida direto com `getWorldPosition` — mais
      // simples e sem risco de duplicar (e um dia dessincronizar) a
      // mesma matemática duas vezes.
      root.updateMatrixWorld(true);
      const tvConnectorWorld = new THREE.Vector3();
      tvBuilt.powerAnchor.getWorldPosition(tvConnectorWorld);

      const outletBuilt = window.OutletFactory.createOutlet(materials);
      // Mesma folga (0.025) já usada por quadros/interruptor do
      // corredor para ficar levemente à frente da parede, do lado de
      // dentro (ver PictureFactory/SwitchFactory em
      // scenes/corridor-scene.js) — e mesma rotação de -90° usada pela
      // mesinha acima, por estar na mesma parede direita. Mesma altura
      // (Y) e mesma profundidade (Z) do conector da TV: a tomada fica
      // bem atrás dela, então o cabo sai praticamente reto até a TV,
      // sem precisar contornar a mesinha por baixo.
      outletBuilt.group.position.set(half - 0.025, tvConnectorWorld.y, z);
      outletBuilt.group.rotation.y = -Math.PI / 2;
      root.add(outletBuilt.group);

      root.updateMatrixWorld(true);
      const outletPlugWorld = new THREE.Vector3();
      outletBuilt.plugAnchor.getWorldPosition(outletPlugWorld);

      // Ponto do meio puxado levemente para baixo (leve "barriga" por
      // gravidade), em vez de um fio perfeitamente esticado/reto entre
      // as duas pontas — mesmo efeito visual de um cabo de verdade
      // meio frouxo.
      const cableMid = outletPlugWorld
        .clone()
        .add(tvConnectorWorld)
        .multiplyScalar(0.5);
      cableMid.y -= 0.04;

      const cableBuilt = window.CableFactory.createCable(
        [outletPlugWorld, cableMid, tvConnectorWorld],
        materials.phoneDial
      );
      root.add(cableBuilt.group);
    });

    // ---------- Comodos novos x vista externa DESTA janela ----------
    // Bloco gemeo do "Comodos novos x vista externa" de
    // scenes/corridor-scene.js, e pelo mesmo motivo - ele faltava aqui.
    //
    // CORRECAO (grama, arvores e nevoa DENTRO de QUARTO 01 e QUARTO 02):
    // a vista externa desta janela e ancorada na parede DIREITA do quarto
    // que, com o giro de 180 graus da zona (ver HouseConfig.zones.quarto),
    // e a fachada ESQUERDA da casa no mundo - exatamente o lado em que os
    // dois QUARTOS novos foram construidos. As tres camadas se estendem
    // dezenas de metros ao longo dessa fachada, entao o gramado, a
    // floresta e as fatias de nevoa nasciam POR DENTRO dos dois comodos:
    // tufos e troncos atravessando o piso e uma faixa de bruma cortando um
    // comodo fechado. As duas janelas do corredor ja recebiam os
    // retangulos da construcao nova; esta, nao.
    //
    // Mesma filosofia de la (e do caminho de terra): nada e removido
    // depois nem testado por quadro - a grama e as arvores dentro dos
    // retangulos nunca chegam a ser sorteadas, e a nevoa zera a opacidade
    // ali dentro no proprio fragmento.
    //
    // `SideRoomScene.footprints` devolve os retangulos em coordenadas do
    // MUNDO (paredes inclusas). A ancora daqui, porem, e escrita no espaco
    // LOCAL do quarto: ela e levada para o mundo pelo transform da zona
    // (posicao) somando o giro da zona ao giro local (orientacao) - so
    // assim os retangulos caem no espaco local das tres fabricas (origem
    // no pe da parede, +Z apontando para FORA da casa). Com rotacoes
    // multiplas de 90 graus, converter os 4 cantos e pegar os extremos e
    // EXATO, sem inflar nada.
    const sideRoomFootprints = window.SideRoomScene
      ? window.SideRoomScene.footprints(window.CorridorConfig)
      : [];

    function exteriorExclusions(localX, localZ, localRotationY) {
      if (!sideRoomFootprints.length || !window.HouseWorld) {
        return [];
      }
      const anchorWorld = toWorldPoint(localX, localZ);
      const anchorTransform = window.HouseWorld.createTransform({
        x: anchorWorld.x,
        z: anchorWorld.z,
        rotationY: ((placement && placement.rotationY) || 0) + localRotationY,
      });

      const rects = [];
      sideRoomFootprints.forEach(function (rect) {
        const corners = [
          anchorTransform.toLocal(rect.minX, rect.minZ),
          anchorTransform.toLocal(rect.minX, rect.maxZ),
          anchorTransform.toLocal(rect.maxX, rect.minZ),
          anchorTransform.toLocal(rect.maxX, rect.maxZ),
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
        // Comodo inteiramente do lado de DENTRO desta parede (atras dela):
        // a vista externa nem chega perto dele, nao ha o que excluir.
        if (maxZ <= 0) {
          return;
        }
        rects.push({ minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ });
      });
      return rects;
    }

    // ---------- Janela ----------
    // Ver models/window-factory.js — mesmo modelo usado nas duas
    // janelas do corredor (moldura, cortina interativa, chuva/
    // relâmpago do lado de fora), sem nenhuma peça nova. Implementado
    // só para `side === "direita"` (mesma parede da mesinha de TV
    // acima): não há configuração em uso hoje para as outras paredes
    // do quarto, mesma limitação já assumida pelos blocos de
    // guarda-roupas (só "esquerda") e mesinha de TV (só "direita")
    // logo acima.
    (config.windows || []).forEach(function (winDef) {
      if (winDef.side !== "direita") {
        return;
      }

      const built = window.WindowFactory.createWindow(materials);
      roomWindowBuilts.push(built);

      // Mesma folga (0.02) usada pelas janelas "left"/"right" do
      // corredor para ficar levemente embutida na parede (ver
      // scenes/corridor-scene.js) — parede direita do quarto (x =
      // +half), mesma rotação de -90° já usada pelos outros móveis
      // dessa parede acima (mesinha de TV, tomada), para o lado de
      // dentro da janela (+Z local, ver comentário no topo de
      // window-factory.js) apontar para dentro do quarto (-X do
      // mundo).
      //
      // A folga precisa ser SUBTRAÍDA de `half` (não somada): mesmo
      // com o vão de verdade recortado agora na parede direita (ver
      // bloco "Paredes" acima e models/exterior-factory.js), a
      // moldura de madeira da janela ainda precisa ficar um pouco na
      // frente do PLANO da parede (mesmo lado de sempre) — é ela quem
      // cobre a borda do recorte por completo (ver HOLE_MARGIN).
      // Somar a folga jogava a origem do grupo (e a moldura) para o
      // lado de FORA da parede (x > half): mais longe da câmera do
      // que o plano dela, então a moldura ficaria atrás desse plano
      // em vez de na frente — sem cobrir a borda do vão, e (na época
      // em que a parede ainda era um plano cheio, sem vão nenhum) o
      // vidro também perdia o teste de profundidade pra ela e nunca
      // chegava a ser desenhado (bug antigo: "a textura da parede tá
      // dentro da janela"). Subtraindo, a origem (moldura + vidro)
      // fica alguns cm mais perto da câmera que o plano da parede —
      // na frente dela, exatamente como sempre (ver FRAME_DEPTH em
      // window-factory.js).
      const wallGap = 0.02;
      const x = half - wallGap;
      const z = winDef.offset;

      built.group.position.set(x, WINDOW_CENTER_Y, z);
      built.group.rotation.y = -Math.PI / 2;
      root.add(built.group);

      // Mesmo "kind" das janelas do corredor: cai automaticamente no
      // mesmo bloqueio de diálogo já configurado em
      // objectives/objective-config.js (blockedResponses.byKind.window
      // = "janela-bloqueada") — nenhuma entrada nova precisa ser
      // adicionada lá.
      // `isOpen` (além de `toggleCurtain` de sempre): scripts/main.js
      // usa isso pra saber se esta janela (id "janela-quarto") já foi
      // aberta, condição pra porta interna do quarto passar a levar o
      // jogador de volta pro corredor (ver "porta-interna-quarto" em
      // scripts/main.js) — não muda nada do comportamento normal da
      // cortina em si.
      interactables.push({
        id: winDef.id,
        kind: "window",
        outline: built.outline,
        toggleCurtain: built.toggleCurtain,
        isOpen: built.isOpen,
      });
      frameUpdaters.push(built.update);

      // ---------- Vista externa (grama) ----------
      // Mesmo princípio de scenes/corridor-scene.js (ver comentário
      // grande no topo de models/exterior-factory.js): um "remendo"
      // de chão de grama encostado do lado de fora da parede direita,
      // centralizado na mesma posição Z da janela.
      const groundBuilt = window.ExteriorFactory.createGroundPlane(materials);
      const ground = groundBuilt.mesh;
      exteriorGrounds.push(groundBuilt);
      const groundGap = window.ExteriorFactory.WALL_GAP;
      const groundHalf = window.ExteriorFactory.GROUND_SIZE / 2;
      ground.position.set(half + groundGap + groundHalf, 0, winDef.offset);
      root.add(ground);

      // ---------- Vegetacao da vista externa (gramado alto) ----------
      // Bloco gemeo do de scenes/corridor-scene.js (ver os comentarios
      // de la e o topo de models/grass-field-factory.js): ~1700 moitas
      // de grama na altura do joelho do personagem, em
      // THREE.InstancedMesh, cobrindo o chao externo acima de ponta a
      // ponta - e nao mais os tufos espalhados do .glb, que sairam de
      // cena nesta atualizacao.
      //
      // O campo e ancorado NA PAREDE direita, com o +Z local apontando
      // para fora da casa (rotacao Y de Math.PI / 2 = +X do mundo) - e
      // dessa convencao que sai a garantia de que nenhuma moita
      // atravessa a parede e aparece dentro de "MEU QUARTO".
      // Retangulos dos comodos novos no espaco local desta ancora (ver
      // exteriorExclusions acima): a MESMA lista serve para as tres
      // camadas, exatamente como no corredor.
      const roomExclusions = exteriorExclusions(
        half + groundGap,
        winDef.offset,
        Math.PI / 2
      );

      const grassField = window.GrassFieldFactory.createGrassField({
        seed: winDef.id,
        // Nenhuma moita dentro dos comodos novos nem da varanda - ver o
        // bloco "Comodos novos x vista externa DESTA janela" acima.
        exclusions: roomExclusions,
      });
      // Mesma lista do chao externo: os dois expoem `setMorning()`,
      // entao a vegetacao amanhece junto com o terreno.
      exteriorGrounds.push(grassField);
      // Unico custo por quadro do gramado: empurrar o relogio da brisa
      // que o vertex shader le (ver o bloco Vento em
      // models/grass-field-factory.js). Nao mexe em matriz de instancia
      // nenhuma, e chamar pelos tres gramados no mesmo quadro nao
      // acelera o vento.
      frameUpdaters.push(grassField.update);
      grassField.group.position.set(half + groundGap, 0, winDef.offset);
      grassField.group.rotation.y = Math.PI / 2;
      root.add(grassField.group);

      // ---------- Floresta da vista externa (arvores) ----------
      // Bloco gemeo do de scenes/corridor-scene.js (ver os comentarios
      // de la e o topo de models/tree-forest-factory.js): passada a
      // clareira de grama aberta, a mata fechada que cerca a casa, em
      // quatro faixas de profundidade, desenhada com
      // THREE.InstancedMesh a partir do mesmo .glb importado pelo mesmo
      // GLTFLoader de sempre.
      //
      // A ancora e a MESMA do gramado logo acima (parede direita, +Z
      // local apontando para fora da casa, rotacao Y de Math.PI / 2):
      // as duas fabricas combinam a mesma convencao de espaco local de
      // proposito. E dela que sai a garantia de que nenhuma arvore
      // atravessa a parede e aparece dentro de "MEU QUARTO".
      //
      // A semente e o id desta janela ("janela-quarto"), diferente das
      // duas do corredor: a vista daqui tem a propria distribuicao de
      // arvores e o proprio desenho de orla da clareira, com a mesma
      // densidade - olhar por esta janela nao mostra a mesma foto que
      // olhar pelas de la.
      // `facade`: quantos metros a PAREDE DA CASA ainda corre para cada
      // lado desta janela, no espaco local da floresta (left = -X local,
      // right = +X local) - ver options.facade em
      // models/tree-forest-factory.js e o bloco Flancos no topo de la.
      // Dentro desse trecho a mata mantem os 6 metros de gramado livre
      // de sempre; passando do canto, ela contorna a construcao, em vez
      // de deixar um corredor de grama correndo ao lado da casa ate o
      // infinito - era dele que saiam os vazios que apareciam ao olhar
      // pela janela de esguelha.
      //
      // Com rotationY = PI / 2 (mesma ancora do gramado logo acima), o
      // +X local anda no sentido -Z do quarto: da janela ate a parede de
      // fundo (z = -size) sobra size - |offset| de parede, e ali a casa
      // acaba de verdade - a mata pode dobrar a esquina. Para o outro
      // lado (-X local) fica a parede de entrada (z = 0), e a casa NAO
      // acaba ali: e a mesma parede direita do corredor que continua,
      // por mais CorridorConfig.length metros (ver o bloco gemeo em
      // scenes/corridor-scene.js). Por isso o + corridorLength.
      const corridorLength =
        (window.CorridorConfig && window.CorridorConfig.length) || 22;
      const forest = window.TreeForestFactory.createForest({
        seed: winDef.id,
        // Nenhuma arvore (nem copa) dentro dos comodos novos - ver o bloco
        // "Comodos novos x vista externa DESTA janela" acima.
        exclusions: roomExclusions,
        facade: {
          left: Math.abs(winDef.offset) + corridorLength,
          right: size - Math.abs(winDef.offset),
        },
      });
      // Mesma lista do chao externo e do gramado: os tres expoem
      // `setMorning()`, entao a floresta amanhece junto com eles.
      exteriorGrounds.push(forest);
      forest.group.position.set(half + groundGap, 0, winDef.offset);
      forest.group.rotation.y = Math.PI / 2;
      root.add(forest.group);

      // ---------- Neblina da vista externa ----------
      // Bloco gemeo do de scenes/corridor-scene.js (ver os comentarios
      // de la e o topo de models/fog-volume-factory.js): a quarta e
      // ultima camada da vista externa, a nevoa volumetrica que ocupa o
      // ar entre a grama, os troncos e as faixas da mata. Cinco fatias
      // horizontais de nevoa mais uma malha de tufos que encaram a
      // camera - geometria de verdade plantada no mundo, nao filtro de
      // tela.
      //
      // A ancora e a MESMA do gramado e da floresta acima (parede
      // direita, +Z local apontando para fora da casa, rotacao Y de
      // Math.PI / 2). E dela que sai a garantia de que nao existe um
      // unico vertice de neblina dentro de "MEU QUARTO"; a parede
      // solida, com o vao recortado, faz o resto - a nevoa so aparece
      // atraves do vidro da janela.
      //
      // A semente e o id desta janela ("janela-quarto"), diferente das
      // duas do corredor: os bancos de nevoa vistos daqui nao repetem os
      // de la.
      const fog = window.FogVolumeFactory.createFogVolume({
        seed: winDef.id,
        // Nenhuma fatia de nevoa dentro dos comodos novos - ver o bloco
        // "Comodos novos x vista externa DESTA janela" acima. Sem isto as
        // fatias (que comecam a 30 cm da fachada e vao ate 34 metros)
        // atravessam QUARTO 01 e QUARTO 02 por dentro.
        exclusions: roomExclusions,
      });
      // Duas listas, diferente das camadas anteriores: `setMorning()`
      // pela lista de sempre, e `update` nos frameUpdaters do quarto -
      // esta e a primeira camada da vista externa que ANIMA (o arrasto
      // lento da nevoa). O update dela escreve um unico float (o tempo)
      // por material e ignora os parametros extras de playerPos/
      // playerRadius, como o ventilador e a cortina ja fazem.
      exteriorGrounds.push(fog);
      frameUpdaters.push(fog.update);

      // ---------- Chuva da vista externa ----------
      // Bloco gemeo do de scenes/corridor-scene.js (ver os comentarios de
      // la e o topo de models/rain-factory.js): a quinta camada da vista
      // externa. Mesma ancora do gramado, da floresta e da nevoa, e dela
      // sai a garantia de que nao cai uma gota dentro de MEU QUARTO.
      // Chove de dia E de noite; entra em exteriorGrounds so para trocar
      // de paleta junto com o resto do terreno.
      const rain = window.RainFactory.createRain({
        seed: winDef.id,
        exclusions: roomExclusions,
      });
      rain.group.position.set(half + groundGap, 0, winDef.offset);
      rain.group.rotation.y = Math.PI / 2;
      root.add(rain.group);
      exteriorGrounds.push(rain);
      frameUpdaters.push(rain.update);
      fog.group.position.set(half + groundGap, 0, winDef.offset);
      fog.group.rotation.y = Math.PI / 2;
      root.add(fog.group);
    });

    // ---------- Poster ----------
    // Ver models/poster-factory.js — imagem enviada pelo jogador,
    // presa na parede por um prego + cordinha (sem moldura de
    // madeira, sem colisão, sem interação). Implementado só para
    // `side === "fundo"` (única parede em uso hoje para o poster,
    // mesma limitação já assumida pelos blocos de guarda-roupas/
    // mesinha de TV acima, restritos cada um a uma única parede).
    (config.posters || []).forEach(function (posterDef) {
      if (posterDef.side !== "fundo") {
        return;
      }

      const posterGroup = window.PosterFactory.createPoster(
        posterDef.image,
        posterDef.width,
        posterDef.height
      );

      // Mesma folga de encaixe (0.02) já usada por criado-mudo/
      // estante nessa mesma parede de fundo (wallGap, ver blocos
      // acima) — sem vão visível entre o papel e a parede.
      const wallGap = 0.02;
      posterGroup.position.set(posterDef.offset, POSTER_CENTER_Y, -size + wallGap);
      root.add(posterGroup);
    });

    // ---------- Pecas decorativas soltas (modelos .glb do jogador) ----------
    // As DOZE pecas de RoomConfig.props (ver scenes/room-config.js, que
    // documenta cada campo e explica por que as posicoes foram escolhidas
    // por conta propria). MESMO desenho de bloco das pecas do quintal em
    // scenes/corridor-scene.js: uma TABELA que liga o nome do modelo a
    // fabrica dele e UM bloco que poe a peca no lugar, calcula a colisao e
    // avisa no console se algo ficou fora do quarto ou dentro de outra
    // peca. Peca nova e uma linha nesta tabela e uma linha na lista dos
    // dados, e nada mais.
    //
    // Todas sao PURAMENTE DECORATIVAS (pedido explicito): nenhuma entra em
    // `interactables` - sem contorno de destaque, sem prompt de
    // "Interagir", sem dialogo, sem animacao, sem som, sem evento. Entram
    // em `solids` so para o jogador nao atravessar elas andando (colisao
    // FISICA, nao "interacao" no sentido do InteractionSystem), e quem
    // estiver apoiada em cima de outra peca sai dessa lista com
    // `solid: false` nos dados - mesmo raciocinio do trofeu em cima da
    // estante.
    //
    // `create` e chamada na hora de montar, nunca na definicao da tabela:
    // as fabricas moram em window e sao carregadas por <script> em
    // index.html, entao ler window.XFactory aqui em cima dependeria da
    // ordem de carregamento. Fabrica ausente = aviso no console e o quarto
    // montado sem aquela peca; o boot nunca cai por decoracao.
    const ROOM_PROP_MODELS = {
      "chess-table": {
        label: "mesa de xadrez",
        create: function () {
          return window.ChessTableFactory ? window.ChessTableFactory.createChessTable() : null;
        },
      },
      "rocking-chair": {
        label: "cadeira de balanco",
        create: function () {
          return window.RockingChairFactory ? window.RockingChairFactory.createRockingChair() : null;
        },
      },
      "plant-bed": {
        label: "canteiro de plantas",
        create: function () {
          return window.PlantBedFactory ? window.PlantBedFactory.createPlantBed() : null;
        },
      },
      "round-pot": {
        label: "vaso oval de planta",
        create: function () {
          return window.RoundPotFactory ? window.RoundPotFactory.createRoundPot() : null;
        },
      },
      "side-table": {
        label: "mesa de canto",
        create: function () {
          return window.SideTableFactory ? window.SideTableFactory.createSideTable() : null;
        },
      },
      "tavern-table": {
        label: "mesa de taverna",
        create: function () {
          return window.TavernTableFactory ? window.TavernTableFactory.createTavernTable() : null;
        },
      },
      "tavern-bottle_01": {
        label: "garrafa 1 da taverna (jarro baixo)",
        create: function () {
          return window.TavernBottle01Factory ? window.TavernBottle01Factory.createTavernBottle01() : null;
        },
      },
      "tavern-bottle_02": {
        label: "garrafa 2 da taverna (garrafao)",
        create: function () {
          return window.TavernBottle02Factory ? window.TavernBottle02Factory.createTavernBottle02() : null;
        },
      },
      "tavern-bottle_03": {
        label: "garrafa 3 da taverna (quadrada)",
        create: function () {
          return window.TavernBottle03Factory ? window.TavernBottle03Factory.createTavernBottle03() : null;
        },
      },
      "tavern-bottle_04": {
        label: "garrafa 4 da taverna (alta)",
        create: function () {
          return window.TavernBottle04Factory ? window.TavernBottle04Factory.createTavernBottle04() : null;
        },
      },
      "tavern-bottle_05": {
        label: "garrafa 5 da taverna (frasco)",
        create: function () {
          return window.TavernBottle05Factory ? window.TavernBottle05Factory.createTavernBottle05() : null;
        },
      },
      "sofa": {
        label: "sofa",
        create: function () {
          return window.SofaFactory ? window.SofaFactory.createSofa() : null;
        },
      },
    };

    // Mesma margem de colisao (5 cm) da mobilia do quarto.
    const ROOM_PROP_MARGIN = 0.05;
    const roomPropBoxes = [];

    (config.props || []).forEach(function (def) {
      const spec = ROOM_PROP_MODELS[def.model];
      if (!spec) {
        console.error(
          "RoomScene: modelo decorativo desconhecido '" +
            def.model +
            "' (peca " +
            (def.id || "sem id") +
            ") - a peca nao vai aparecer. Modelos validos: " +
            Object.keys(ROOM_PROP_MODELS).join(", ") +
            "."
        );
        return;
      }

      const built = spec.create();
      if (!built || !built.group) {
        console.error(
          "RoomScene: a fabrica da " +
            spec.label +
            " nao esta carregada - a peca nao vai aparecer no quarto. " +
            "Confira o <script> dela em index.html."
        );
        return;
      }

      // A peca nasce centralizada na propria base (ver a convencao de
      // espaco local nas fabricas), entao aqui basta decidir o centro
      // (x, z) dela. Metade do contorno da base JA projetada nos eixos do
      // quarto depois do giro - a mesma trigonometria da cadeira de canto
      // e das pecas do quintal. Vale para qualquer angulo, inclusive os
      // que nao sao multiplos de 90.
      const rotationY = def.rotationY || 0;
      const propHalfW = built.width / 2;
      const propHalfD = built.depth / 2;
      const boxHalfX =
        Math.abs(propHalfW * Math.cos(rotationY)) +
        Math.abs(propHalfD * Math.sin(rotationY));
      const boxHalfZ =
        Math.abs(propHalfW * Math.sin(rotationY)) +
        Math.abs(propHalfD * Math.cos(rotationY));

      const x = def.x || 0;
      const z = def.z || 0;
      const elevation = def.elevation || 0;

      const box = {
        id: def.id || def.model,
        minX: x - boxHalfX,
        maxX: x + boxHalfX,
        minY: elevation,
        maxY: elevation + built.height,
        minZ: z - boxHalfZ,
        maxZ: z + boxHalfZ,
      };

      // ---------- Dois avisos (nenhum impede nada) ----------
      // Mesmo espirito dos avisos das pecas do quintal: melhor descobrir
      // pelo console do que achando uma garrafa dentro da parede. A parede
      // de ENTRADA nao fica em z = 0, e sim recuada `entryWallInset` para
      // dentro do quarto (ver o bloco das paredes no topo).
      if (
        box.minX < -half - 0.001 ||
        box.maxX > half + 0.001 ||
        box.minZ < -size - 0.001 ||
        box.maxZ > -entryWallInset + 0.001
      ) {
        console.warn(
          "RoomScene: a peca decorativa " +
            box.id +
            " passa das paredes do quarto (o chao vai de x " +
            (-half).toFixed(2) +
            " a x " +
            half.toFixed(2) +
            " e de z " +
            (-size).toFixed(2) +
            " a z " +
            (-entryWallInset).toFixed(2) +
            ") - reveja `x`/`z` em RoomConfig.props (scenes/room-config.js)."
        );
      }

      roomPropBoxes.forEach(function (other) {
        const hits =
          box.minX < other.maxX &&
          box.maxX > other.minX &&
          box.minZ < other.maxZ &&
          box.maxZ > other.minZ &&
          box.minY < other.maxY &&
          box.maxY > other.minY;
        if (hits) {
          console.warn(
            "RoomScene: as pecas decorativas " +
              box.id +
              " e " +
              other.id +
              " estao uma dentro da outra - reveja `x`/`z`/`elevation` em " +
              "RoomConfig.props (scenes/room-config.js)."
          );
        }
      });
      roomPropBoxes.push(box);

      // Y = elevation: o chao do quarto esta no zero. `elevation` serve as
      // pecas apoiadas em cima de outra - hoje, as cinco garrafas em cima
      // da mesa de taverna.
      built.group.position.set(x, elevation, z);
      built.group.rotation.y = rotationY;
      root.add(built.group);

      // Colisao: mesma caixa alinhada aos eixos e mesma margem dos outros
      // moveis do quarto. `solid: false` nos dados desliga - as garrafas
      // usam isso, porque a colisao do jogo e um AABB sem eixo Y e uma
      // garrafa em cima da mesa viraria parede invisivel no ar.
      if (def.solid !== false) {
        solids.push({
          owner: built.group,
          minX: box.minX - ROOM_PROP_MARGIN,
          maxX: box.maxX + ROOM_PROP_MARGIN,
          minZ: box.minZ - ROOM_PROP_MARGIN,
          maxZ: box.maxZ + ROOM_PROP_MARGIN,
        });
      }
    });

    // ---------- Ventilador de teto ----------
    // Ver models/ceiling-fan-factory.js — peça 100% procedural (mesmo
    // princípio de CarpetFactory/LampFactory: sem depender de nenhum
    // .glb). Sem interação, sem prompt de "Interagir" (não entra em
    // `interactables`, não entra em `solids` — fica bem acima da
    // altura de colisão de qualquer outro móvel do quarto). As pás
    // giram continuamente (ver frameUpdaters abaixo); o suporte preso
    // ao teto fica parado — ver comentário no topo de
    // ceiling-fan-factory.js sobre como isso é garantido (mount/rod
    // ficam fora do grupo que gira). Sempre centralizada no teto: X =
    // 0 e Z = -half são exatamente o centro da própria peça de teto
    // montada lá em cima (ver `ceiling`, início desta função), então
    // RoomConfig.ceilingFans não precisa de side/offset como os
    // móveis de parede acima.
    (config.ceilingFans || []).forEach(function (fanDef) {
      const built = window.CeilingFanFactory.createCeilingFan();
      const group = built.group;

      // A origem do grupo (Y = 0) fica no nível do motor/pás, não no
      // topo do suporte — `built.mountTopY` é a altura local desse
      // topo (ver comentário em ceiling-fan-factory.js). Por isso a
      // posição vertical aqui não é simplesmente `config.height`: é
      // preciso subir o grupo inteiro até esse topo encostar no teto.
      // `ceilingEmbed` embute o suporte alguns cm além disso (mesmo
      // princípio de wallEmbed/wallGap usado pelos móveis encostados
      // nas paredes, aqui aplicado ao teto — e da mesma forma que a
      // luminária do corredor se embute no teto, ver
      // scenes/corridor-scene.js), para não sobrar nenhuma fresta
      // visível nem a peça flutuando abaixo do teto.
      const ceilingEmbed = 0.02;
      const y = config.height - built.mountTopY + ceilingEmbed;

      group.position.set(0, y, -half);
      root.add(group);
      frameUpdaters.push(built.update);
    });

    // ---------- Céu (skybox, só de dia) ----------
    // Mesma instância/ideia do céu do corredor (ver o bloco gêmeo em
    // scenes/corridor-scene.js e o comentário grande no topo de
    // models/sky-factory.js): céu azul limpo "no infinito", desenhado
    // antes de tudo e sem escrever profundidade, então só aparece no
    // vão da janela do quarto, acima da linha da grama do bloco
    // "Vista externa" ali em cima. Nasce INVISÍVEL (o quarto só vira
    // dia em `setMorning()` logo abaixo, chamado com a tela preta pela
    // sequência de dormir — ver cutscenes/sleep-sequence.js) e vive no
    // `root` do quarto, entrando/saindo da cena junto com ele.
    // `hazeColor`: abaixo da linha do horizonte o céu cai exatamente
    // para a cor da névoa DE DIA (ver scripts/atmosphere.js), a mesma
    // em que a grama distante se desfaz — os dois se encontram no
    // mesmo tom, sem nenhuma emenda visível, e o resultado lê como
    // bruma/mata longe. Lido de lá em vez de escrito à mão de
    // propósito: se a paleta de dia mudar, este céu acompanha sozinho.
    // ATUALIZACAO (mundo unico): com a casa inteira dentro de uma cena
    // so, o ceu tambem e UM. Quem monta o mundo passa
    // `opts.sharedSky` e o quarto deixa de criar o proprio - dois
    // skyboxes, os dois seguindo a camera, seriam duas passadas de
    // desenho pintando exatamente o mesmo pixel (e o dobro de custo de
    // um fundo que nem escreve profundidade). O ceu do corredor passa a
    // valer para o vao das tres janelas do jogo, ja que agora todas
    // olham para o mesmo mundo.
    const sky = opts.sharedSky
      ? null
      : window.SkyFactory.createSky({
          hazeColor: window.Atmosphere.DAY.fogColor,
        });
    if (sky) {
      root.add(sky.mesh);
    frameUpdaters.push(sky.update);
    }

    // ---------- Luz da manhã (desligada até o dia amanhecer) ----------
    // Usada só por `setMorning()` logo abaixo, chamada pela sequência
    // de dormir (ver cutscenes/sleep-sequence.js) no instante em que a
    // tela está completamente preta, entre a noite e o dia seguinte —
    // então a troca em si nunca chega a ser vista, mesma ideia do
    // resto das trocas de estado "escondidas pelo preto" do jogo (ver
    // scripts/main.js/enterRoom()). Começa com intensidade 0 (de
    // noite, o quarto continua dependendo só do abajur, exatamente
    // como hoje); `setMorning()` só aumenta essa intensidade, nunca
    // mexe no abajur (que já está apagado — é pré-requisito para
    // dormir) nem na luz ambiente global (compartilhada com o
    // corredor, ver scripts/main.js). Posicionada no teto, perto do
    // centro do quarto, para iluminar o ambiente de forma
    // relativamente uniforme, na mesma ordem de grandeza da luz do
    // abajur (ver BASE_INTENSITY/LIGHT_DISTANCE em
    // models/table-lamp-factory.js).
    const MORNING_LIGHT_INTENSITY = 1.5;
    const morningLight = new THREE.PointLight(0xd9e6ff, 0, 10, 2);
    morningLight.position.set(0, config.height - 0.3, -half + 1.5);
    root.add(morningLight);

    // A virada de noite para dia do quarto inteiro. Na história ela
    // acontece uma única vez, pela sequência de dormir, com a tela
    // completamente preta (ver comentário acima): liga a luz da manhã
    // e desativa os relâmpagos das janelas do quarto (ver `stopStorm`
    // em models/window-factory.js) — a chuva/gotas continuam do jeito
    // que já estavam, só os relâmpagos param, conforme pedido.
    /**
     * Liga (`true`) ou desliga (`false`) o DIA no quarto inteiro de uma
     * vez: luz da manhã, céu da janela e tudo que vive do lado de fora
     * dela. É o mesmo trabalho que `setMorning()` sempre fez, agora com
     * os dois sentidos — o que a história precisa continua sendo só a
     * ida (ver `setMorning()` logo abaixo), a volta existe para o
     * controle de HORÁRIO do Editor (ver editor/editor-ui.js), onde o
     * cenário precisa ser conferido de noite E de dia sem reabrir o
     * jogo. Nada é recriado nem animado nos dois sentidos: são os
     * mesmos materiais e as mesmas paletas que já existiam.
     */
    function setDaytime(daytime) {
      const day = daytime !== false;

      morningLight.intensity = day ? MORNING_LIGHT_INTENSITY : 0;

      // Céu azul da vista externa (ver o bloco "Céu" acima e
      // models/sky-factory.js) — de noite ele fica invisível; de dia,
      // olhar pela janela mostra céu.
      if (sky) {
        sky.setDaytime(day);
      }

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
      // Clarão dos relâmpagos: agora nos dois sentidos (ver
      // effects/lightning-storm.js e o gêmeo em scenes/corridor-scene.js).
      roomWindowBuilts.forEach(function (windowBuilt) {
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

    // `playerPos`/`playerRadius` são opcionais (undefined quando quem
    // chama não os fornece, ex.: nenhum uso hoje fora de
    // scripts/main.js) — só a bola de futebol acima realmente os usa;
    // os demais frameUpdaters (ventilador, cortina) ignoram os
    // parâmetros extras normalmente.
    // ---------- Borda: mundo -> quarto ----------
    // Ver a regra de borda no topo do arquivo. Objeto unico,
    // reaproveitado a cada quadro (nada de lixo por frame), com a
    // posicao do jogador convertida para as coordenadas DO QUARTO:
    // quem faz conta com ela por dentro e a fisica da bola de futebol
    // (ver scripts/ball-controller.js), que vive no espaco local daqui
    // como todo o resto desta cena. Sem `placement`, nada e convertido
    // e o proprio objeto que chegou e repassado, igual a antes.
    const localPlayerPos = { x: 0, z: 0, yaw: 0, isMoving: false, walkPhase: 0 };

    function update(delta, elapsed, playerPos, playerRadius) {
      let pos = playerPos;
      if (playerPos && transform) {
        const local = transform.toLocal(playerPos.x, playerPos.z);
        localPlayerPos.x = local.x;
        localPlayerPos.z = local.z;
        localPlayerPos.yaw = transform.toLocalYaw(playerPos.yaw);
        localPlayerPos.isMoving = playerPos.isMoving;
        localPlayerPos.walkPhase = playerPos.walkPhase;
        pos = localPlayerPos;
      }
      frameUpdaters.forEach(function (fn) {
        fn(delta, elapsed, pos, playerRadius);
      });
    }

    // Superficie sob o jogador (madeira/tapete) perguntada em
    // coordenadas do MUNDO e respondida pela geometria local do quarto.
    function getWorldSurfaceAt(x, z) {
      const local = transform ? transform.toLocal(x, z) : { x: x, z: z };
      return getSurfaceAt(local.x, local.z);
    }

    // Caixas de colisao do quarto convertidas para o mundo, de uma vez
    // so, aqui no fim (todas ja foram empilhadas neste ponto). Com
    // `rotationY` em multiplos de 90 graus - o unico caso usado pela
    // casa - a conversao de AABB e exata, sem inflar nada (ver
    // transformBox em scripts/house-world.js). Nenhuma delas muda com o
    // tempo: o quarto nao tem obstaculo movel (a bola de futebol,
    // proposito, nunca entra em `solids`).
    // O `owner` de cada caixa (o objeto 3D de quem ela e a colisao) e
    // copiado para a caixa convertida: transformBox devolve uma caixa
    // NOVA, so com os quatro limites, e sem essa linha a lista que vai
    // para o mundo perderia justamente a informacao que faz a colisao
    // sumir quando o objeto e excluido no Editor (ver `owner` em
    // scripts/collision.js).
    const worldSolids = transform
      ? solids.map(function (box) {
          const worldBox = transform.transformBox(box);
          worldBox.owner = box.owner || null;
          // `enabled`, `follow` e `modelFit` sao as chaves manuais da
          // caixa (ver scripts/collision.js), e transformBox devolve uma
          // caixa NOVA, so com os quatro limites: sem estas linhas um
          // solido desligado no espaco do quarto voltava ligado no mundo.
          if (box.enabled !== undefined) worldBox.enabled = box.enabled;
          if (box.follow !== undefined) worldBox.follow = box.follow;
          if (box.modelFit !== undefined) worldBox.modelFit = box.modelFit;
          if (box.sceneDriven !== undefined) worldBox.sceneDriven = box.sceneDriven;
          return worldBox;
        })
      : solids;

    // Retangulo que o quarto ocupa no mundo - usado por
    // scripts/house-world.js para responder "em que comodo o jogador
    // esta" (som de passos, lado da porta compartilhada etc.).
    const localBounds = { minX: -half, maxX: half, minZ: -size, maxZ: 0 };
    const worldBounds = transform
      ? transform.transformBox(localBounds)
      : localBounds;

    return {
      root: root,
      // Em coordenadas do MUNDO (colisao do jogador roda no mundo).
      solids: worldSolids,
      // As mesmas caixas no espaco do quarto, como estao escritas nos
      // blocos acima: e o que a fisica da bola usa por dentro.
      localSolids: solids,
      interactables: interactables,
      update: update,
      setDaytime: setDaytime,
      setMorning: setMorning,
      getSurfaceAt: getWorldSurfaceAt,
      bounds: worldBounds,
      transform: transform,
    };
  }

  return { build: build };
})();
