/**
 * models/exterior-factory.js
 * -------------------------------------------------
 * Vista externa vista através do vidro das três janelas do jogo
 * (duas do corredor + a do "MEU QUARTO" — ver models/window-factory.js
 * e models/window-glass-factory.js). Por enquanto, só o chão de
 * grama pedido nesta atualização — sem céu, árvores, casas ou
 * qualquer outro elemento (ver scenes/corridor-scene.js e
 * scenes/room-scene.js, bloco "Vista externa (grama)" em cada um,
 * para como isto é usado).
 *
 * Tres responsabilidades, sem nenhuma delas saber nada sobre janelas
 * específicas (mesmo princípio do resto das fábricas: só geometria
 * em torno da própria origem, sem posição própria — quem posiciona
 * no mundo é sempre a cena):
 *
 *  1. `buildWallGeometryWithHoles(width, height, holes)` — MOTIVO
 *     DE EXISTIR: até esta atualização, as paredes do corredor/quarto
 *     eram sempre um único THREE.PlaneGeometry cheio, sem nenhum vão
 *     recortado onde as janelas ficam (o vidro só "ganhava" da
 *     parede visualmente por estar alguns cm na frente dela, um
 *     truque de teste de profundidade — ver os comentários grandes
 *     sobre isso em scenes/corridor-scene.js e scenes/room-scene.js,
 *     no bloco "Janelas"/"Janela"). Isso bastava enquanto não havia
 *     nada para ver do lado de fora, mas esconde qualquer coisa
 *     desenhada mais longe: a própria parede, sólida, continua bem
 *     atrás do vidro e tampa a vista. Esta função substitui aquele
 *     plano cheio por um com um vão retangular de verdade recortado
 *     em cada posição de `holes` (uma por janela daquela parede),
 *     usando THREE.Shape + Path (buraco). O UV de cada vértice é
 *     recalculado manualmente (`(x+hw)/width, (y+hh)/height`) para
 *     reproduzir exatamente o mesmo mapeamento 0-1 que uma
 *     PlaneGeometry cheia do mesmo tamanho já tinha — ShapeGeometry,
 *     por padrão, usa a coordenada local crua como UV, sem
 *     normalizar, o que faria a textura tileável da parede
 *     (materials.wallSide/wallEnd/wallRoom) ficar fora de escala.
 *     Com o remapeamento, a textura continua batendo perfeitamente
 *     nas bordas do vão, sem nenhuma costura visível — e a própria
 *     moldura de madeira da janela (sempre um pouco maior que o vão,
 *     ver HOLE_MARGIN abaixo) cobre a borda do recorte por
 *     completo, então nenhuma aresta crua chega a aparecer.
 *
 *  2. `createGroundPlane(materials)` — o chão de grama em si: um
 *     único plano grande (GROUND_SIZE x GROUND_SIZE), baixo-poligonagem
 *     de propósito (2 triângulos, nenhuma subdivisão) — mais que
 *     suficiente pra esconder a borda: a névoa da cena (ver
 *     scripts/atmosphere.js, dono dela) fica 100% opaca bem antes do
 *     limite de desenho da câmera (50) e MUITO antes da borda de
 *     verdade do plano, e isso vale nas duas paletas — a da noite
 *     fecha a 13 unidades, a do dia a 28, contra bordas que ficam a
 *     30 unidades ou mais do vidro em qualquer direção (ver
 *     GROUND_SIZE abaixo). O jogador nunca chega a perceber onde a
 *     grama "acaba", nem de frente pra janela olhando reto pra fora,
 *     nem de esguelha.
 *
 *  3. `createWallCladding(options)` - o REVESTIMENTO EXTERNO de uma
 *     parede: a casca de fora da casa, com a textura de reboco velho e
 *     mofo da fachada (createExteriorPlasterWallTexture em
 *     materials/textures.js). MOTIVO DE EXISTIR: as paredes do jogo sao
 *     planos de espessura zero e DoubleSide, entao o lado de FORA
 *     mostrava a mesma textura de dentro vista pelas costas - o reboco
 *     do corredor e o lambri dos quartos apareciam na fachada da casa.
 *     Ver o comentario grande dela mais abaixo. E, principalmente:
 *     NADA do interior muda por causa dela - a casca e uma malha nova,
 *     2 cm pra fora, visivel so pelo lado de fora.
 *
 *  4. `createUnderHouseGround(materials, options)` - o CHAO SOB A CASA:
 *     o remendo de grama que fecha a unica faixa de terreno que nenhum
 *     dos remendos de janela alcanca - a propria PEGADA da casa. MOTIVO
 *     DE EXISTIR: todo remendo de createGroundPlane e encostado do lado
 *     de FORA da parede da janela dele (a borda dele para em WALL_GAP da
 *     parede, ver o bloco "Vista externa (grama)" das cenas), entao
 *     nenhum deles passa POR BAIXO da construcao. A faixa central - x de
 *     -(halfW + WALL_GAP) a +(halfW + WALL_GAP), de tras da parede
 *     ENTRADA & SAIDA ate a fachada da frente de MEU QUARTO e dali para
 *     fora - ficava literalmente sem chao nenhum: vista de fora e um
 *     pouco de baixo, a casa aparecia flutuando, com o vao aberto para o
 *     limbo embaixo dela (era o buraco relatado). Esta funcao preenche
 *     exatamente essa faixa com a MESMA grama de sempre
 *     (materials.grass/grassDay - nenhuma textura nova, nenhum material
 *     novo, 2 triangulos, 1 draw call) e o faz ABAIXO do zero, ver
 *     UNDER_HOUSE_DROP: e o que garante, POR CONSTRUCAO, que este chao
 *     nunca atravessa o piso de comodo nenhum. Ver o bloco "Chao sob a
 *     casa" em scenes/corridor-scene.js, quem posiciona.
 * -------------------------------------------------
 */

window.ExteriorFactory = (function () {
  // Tamanho (mundo) de cada "remendo" de chão externo, um por janela.
  // Precisa ser confortavelmente maior que a distância em que a névoa
  // da cena já esconde tudo, em TODAS as direções (ver comentário no
  // topo do arquivo) — o remendo é quadrado e centrado na janela,
  // então as bordas LATERAIS ficam a apenas GROUND_SIZE/2 do vidro,
  // metade da distância da borda da frente.
  //
  // Era 30 enquanto a névoa da noite era a única que existia (opaca a
  // 13 unidades, escondia qualquer borda com folga de sobra). Com a
  // névoa de DIA, que só fecha por completo a 28 unidades (ver
  // Atmosphere.DAY em scripts/atmosphere.js), 30 deixou de bastar: a
  // borda da frente ficava no limite e as laterais, a 15 unidades,
  // apareciam como uma linha reta de grama cortada contra o céu quando
  // o jogador olhava pela janela de esguelha. 60 põe TODAS as bordas a
  // 30 unidades ou mais, sempre atrás do ponto em que a névoa já está
  // 100% fechada. Continua custando os mesmos 2 triângulos de sempre —
  // um plano maior não é mais caro de desenhar.
  //
  // E se um pedaço do plano passar do limite de desenho da câmera
  // (`far` = 50, ver scripts/main.js), também não aparece corte: de
  // dia, a cor de fundo do renderer é a própria cor da névoa, e o céu
  // abaixo do horizonte também (ver hazeColor em
  // models/sky-factory.js) — tudo o que está longe termina no mesmo
  // tom, com ou sem geometria por baixo.
  //
  // IMPORTANTE: precisa continuar batendo com o repeat usado em
  // materials/material-library.js (const grassTex = ...) pra grama
  // não ficar esticada/comprimida — os dois lugares comentam um o
  // outro. Mexeu aqui, mexe lá.
  const GROUND_SIZE = 60;

  // Folga entre a face externa da parede e a borda mais próxima do
  // chão de grama, pras duas superfícies nunca ficarem exatamente
  // coplanares bem em cima da parede (nenhum bug de profundidade de
  // verdade aconteceria aqui — o chão nunca fica visível por trás da
  // parede sólida, só através do vão da janela — é só uma margem de
  // segurança barata, mesmo espírito dos vários "wallGap" já usados
  // no resto do jogo).
  const WALL_GAP = 0.05;

  // Quanto o vão recortado na parede fica MENOR que a moldura externa
  // da janela (WindowFactory.WINDOW_WIDTH/HEIGHT) de cada lado — a
  // moldura de madeira (sempre opaca, sempre um pouco na frente da
  // parede) sobra por cima da borda do recorte e a esconde por
  // completo, mesmo com o leve "wobble" de vértice em espaço de tela
  // do shader PSX (ver applyPSXShader em window-factory.js) deslocando
  // moldura e parede em separado a cada quadro. Grande o bastante pra
  // cobrir isso com folga, pequeno o bastante pra não cortar nada do
  // vidro visível (bem menor que o vão real por trás do friso — ver
  // visW/visTopY-visBottomY em window-factory.js).
  const HOLE_MARGIN = 0.06;

  /**
   * Geometria de uma parede (mesma convenção de THREE.PlaneGeometry:
   * plano centralizado na origem, no eixo XY local, olhando para
   * +Z — width ao longo de X, height ao longo de Y) com um ou mais
   * vãos retangulares recortados.
   *
   * `holes`: array de { width, height, x, y } — x/y é o CENTRO de
   * cada vão, no mesmo referencial local da parede (0,0 = centro
   * dela). Devolve uma THREE.ShapeGeometry pronta pra substituir a
   * PlaneGeometry normal na hora de criar o THREE.Mesh — mesma
   * rotação/posição de sempre, nenhum ajuste extra necessário.
   */
  function buildWallGeometryWithHoles(width, height, holes) {
    return buildWallGeometryWithOpenings(width, height, holes, null);
  }

  /**
   * Mesma ideia de buildWallGeometryWithHoles acima (parede chapada
   * com recorte de verdade + UV remapeado igual ao de uma
   * PlaneGeometry cheia do mesmo tamanho), agora com um segundo tipo
   * de abertura:
   *
   *  - holes: vaos FECHADOS, sem contato com nenhuma borda da parede
   *    (as janelas) - mesmo formato de sempre: {width, height, x, y},
   *    com x/y medidos a partir do CENTRO da parede.
   *  - doorways: vaos de PORTA, que nascem no chao e sobem. Estes NAO
   *    podem ser buracos (THREE.Path) como as janelas: um buraco
   *    encostado na borda de baixo do contorno gera um poligono
   *    degenerado e a triangulacao sai errada. Aqui eles entram como
   *    um desvio no proprio contorno da parede - a borda de baixo
   *    sobe, atravessa o vao e desce de volta, formando um unico
   *    poligono simples (concavo), que o Earcut do ShapeGeometry
   *    resolve sem problema. Formato: {x, width, height}, com x
   *    medido do CENTRO da parede (mesma convencao dos holes) e
   *    height medida a partir do CHAO.
   *
   * E o que permite a parede compartilhada entre o corredor e
   * "MEU QUARTO" ter um vao de porta de verdade - atravessavel e
   * transparente a vista - em vez de uma porta apenas encostada num
   * plano cheio (ver scenes/corridor-scene.js e scenes/room-scene.js).
   */
  function buildWallGeometryWithOpenings(width, height, holes, doorways) {
    const hw = width / 2;
    const hh = height / 2;

    // Ordenados da esquerda para a direita: o contorno e desenhado num
    // unico traco continuo, entao os desvios precisam aparecer na
    // ordem em que a borda de baixo os encontra.
    const doors = (doorways || []).slice().sort(function (a, b) {
      return a.x - b.x;
    });

    const shape = new THREE.Shape();
    shape.moveTo(-hw, -hh);
    doors.forEach(function (door) {
      const halfDoor = door.width / 2;
      const top = -hh + door.height;
      shape.lineTo(door.x - halfDoor, -hh);
      shape.lineTo(door.x - halfDoor, top);
      shape.lineTo(door.x + halfDoor, top);
      shape.lineTo(door.x + halfDoor, -hh);
    });
    shape.lineTo(hw, -hh);
    shape.lineTo(hw, hh);
    shape.lineTo(-hw, hh);
    shape.closePath();

    (holes || []).forEach(function (hole) {
      const hhw = hole.width / 2;
      const hhh = hole.height / 2;
      const path = new THREE.Path();
      path.moveTo(hole.x - hhw, hole.y - hhh);
      path.lineTo(hole.x + hhw, hole.y - hhh);
      path.lineTo(hole.x + hhw, hole.y + hhh);
      path.lineTo(hole.x - hhw, hole.y + hhh);
      path.closePath();
      shape.holes.push(path);
    });

    const geo = new THREE.ShapeGeometry(shape);

    // Recalcula o UV de cada vértice manualmente — ver comentário
    // grande no topo do arquivo (item 1) sobre o motivo.
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, (x + hw) / width, (y + hh) / height);
    }
    uv.needsUpdate = true;

    return geo;
  }

  // ---------------------------------------------------------------
  // Revestimento externo das paredes (a casca de FORA da casa)
  // ---------------------------------------------------------------
  // Quanto a casca fica a frente da face externa da parede. As paredes
  // do jogo sao PLANOS de espessura zero e DoubleSide (ver o bloco
  // "Paredes" de cada cena), entao ate agora o lado de FORA da casa
  // mostrava a mesma textura do lado de dentro, vista pelas costas: o
  // reboco do corredor e o lambri dos quartos apareciam na fachada.
  //
  // 2 cm resolvem por construcao, sem polygonOffset: longe o bastante
  // pra nunca empatar em profundidade com a parede (nem com o wobble de
  // vertice do shader PSX mexendo os dois em separado), e perto o
  // bastante pra caber com folga dentro do WALL_GAP de 5 cm do chao
  // externo e nao aparecer como uma "borda" na quina da casa.
  const CLADDING_GAP = 0.02;

  /**
   * Casca externa de uma parede: uma copia da parede, 2 cm pra fora,
   * com a textura de reboco velho e mofo da FACHADA
   * (createExteriorPlasterWallTexture em materials/textures.js) e
   * visivel SO pelo lado de fora.
   *
   * Por que uma malha nova em vez de trocar o material da parede: o
   * pedido foi mudar apenas o exterior. Trocando o material, o mesmo
   * plano DoubleSide levaria o mofo pra dentro do comodo tambem. Com a
   * casca, o interior nao muda um pixel - e o proprio plano da parede,
   * opaco, continua tapando a casca quando o jogador esta dentro de
   * casa.
   *
   * `options`:
   *   wall        - a malha da parede que vai ser revestida (dela saem
   *                 geometria, posicao e rotacao - inclusive os vaos de
   *                 janela/porta ja recortados, ver
   *                 buildWallGeometryWithOpenings acima: a casca herda
   *                 os MESMOS vaos, de graca, sem recalcular nada).
   *   material    - material de NOITE (MeshStandard, reage as luzes).
   *   dayMaterial - material de DIA (MeshBasic chapado, mesmo motivo do
   *                 chao de grama e do telhado: nao existe sol de
   *                 verdade na cena). Opcional; sem ele, a casca nao
   *                 muda no amanhecer.
   *   name        - nome legivel pro Editor (ver editor/editor-registry.js).
   *
   * A geometria e COMPARTILHADA com a parede (nenhuma copia, nenhum
   * vertice novo na memoria) e o material e `side: THREE.BackSide` (ver
   * materials/material-library.js), ou seja: a casca desenha so a face
   * que olha pra fora. Custo total de cada parede revestida: um draw
   * call, dois triangulos (ou os poucos do recorte).
   *
   * Devolve o mesmo contrato de createGroundPlane e de tudo que vive do
   * lado de fora (`mesh` + `setDaytime`/`setMorning`), pra casca poder
   * entrar direto na lista `exteriorGrounds` que cada cena ja percorre
   * no amanhecer - sem nenhum encanamento novo.
   */
  function createWallCladding(options) {
    const opts = options || {};
    const wall = opts.wall;
    if (!wall || !wall.geometry) {
      return null;
    }
    const nightMaterial = opts.material;
    const dayMaterial = opts.dayMaterial || opts.material;

    const mesh = new THREE.Mesh(wall.geometry, nightMaterial);
    mesh.name = opts.name || "parede-externa";
    mesh.rotation.copy(wall.rotation);
    mesh.position.copy(wall.position);

    // Direcao do lado de FORA. Toda parede da casa e montada olhando
    // para +Z local (convencao de THREE.PlaneGeometry, que
    // buildWallGeometryWithOpenings mantem de proposito) e esse +Z
    // aponta sempre para DENTRO do comodo - e por isso que o lado de
    // fora e, sempre, -Z local, em qualquer parede de qualquer cena.
    const outward = new THREE.Vector3(0, 0, -1).applyEuler(mesh.rotation);
    mesh.position.addScaledVector(outward, CLADDING_GAP);

    function setDaytime(daytime) {
      mesh.material = daytime === false ? nightMaterial : dayMaterial;
    }

    function setMorning() {
      setDaytime(true);
    }

    return {
      mesh: mesh,
      setDaytime: setDaytime,
      setMorning: setMorning,
    };
  }

  /**
   * O chão de grama em si — plano único, sem nenhuma posição/rotação
   * própria além de já vir "deitado" (mesma convenção do chão interno
   * em scenes/corridor-scene.js e scenes/room-scene.js): quem chama
   * só precisa de `mesh.position.set(x, 0, z)` pra encaixar do lado
   * de fora da parede certa.
   */
  function createGroundPlane(materials) {
    const geo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const nightMaterial = materials.grass;
    const dayMaterial = materials.grassDay || materials.grass;
    const mesh = new THREE.Mesh(geo, nightMaterial);
    mesh.rotation.x = -Math.PI / 2;

    // O chão nasce com o material noturno e troca no mesmo instante em
    // que o céu/névoa viram dia. A troca é por mesh, não por material
    // global: as três janelas podem ser construídas independentemente,
    // mas todas amanhecem juntas quando a cena chama setDaytime().
    //
    // Os DOIS sentidos existem (e não só o "amanhecer") por causa do
    // controle de horário do Editor, que precisa voltar para a noite —
    // ver editor/editor-ui.js e scripts/atmosphere.js. No jogo normal
    // nada muda: a sequência de dormir continua chamando setMorning().
    function setDaytime(daytime) {
      mesh.material = daytime === false ? nightMaterial : dayMaterial;
    }

    function setMorning() {
      setDaytime(true);
    }

    return {
      mesh: mesh,
      setDaytime: setDaytime,
      setMorning: setMorning,
    };
  }

  // ---------------------------------------------------------------
  // Chao sob a casa (a pegada da construcao)
  // ---------------------------------------------------------------
  // Quanto este chao fica ABAIXO do y = 0, e a razao de ser do numero:
  // o piso do corredor e o de MEU QUARTO ficam exatamente em y = 0 e o
  // dos quatro comodos novos em y = 0.02 (FLOOR_LIFT, ver
  // scenes/side-room-scene.js). Nascendo 4 cm ABAIXO de todos eles, o
  // remendo de baixo nao pode atravessar o piso de comodo nenhum: nao e
  // "quase coplanar" que teria de ser resolvido com polygonOffset ou
  // tentativa e erro - ele simplesmente esta em outro plano, mais baixo
  // que qualquer piso da casa, e todo piso e opaco. Nada muda dentro dos
  // comodos, nem um pixel.
  //
  // E por que so 4 cm (e nao meio metro): visto de fora, este remendo
  // encosta nos remendos das janelas (y = 0) num sliver de
  // UNDER_HOUSE_OVERLAP escondido debaixo da parede/revestimento. Quanto
  // menor o degrau, menos ele pode aparecer como uma "faixa" na base da
  // fachada em vista rasante - e 4 cm ja e folga de sobra contra o
  // wobble de vertice do shader PSX (que mexe centimetros, nao
  // decimetros).
  const UNDER_HOUSE_DROP = 0.04;

  // Quanto este remendo entra POR BAIXO dos remendos das janelas em cada
  // borda. Existe para nao haver emenda de aresta com aresta entre dois
  // planos do mesmo tamanho de pixel (uma linha de 1 pixel de fundo
  // aparecendo entre eles quando a camera pega a junta de raspao).
  // Sobrepor 20 cm resolve, e a sobreposicao cai justamente na base da
  // parede - o pedaco de terreno que a propria parede e o revestimento
  // externo tapam.
  const UNDER_HOUSE_OVERLAP = 0.2;

  /**
   * O chao que fecha a pegada da casa - ver o item 4 no topo do arquivo.
   *
   * Mesma convencao de createGroundPlane (plano ja "deitado", sem
   * posicao propria: quem chama faz `mesh.position.set(x, y, z)`) e
   * mesmo contrato de retorno de tudo que vive do lado de fora
   * (`mesh` + `setDaytime`/`setMorning`), pra entrar direto na lista
   * `exteriorGrounds` que a cena ja percorre no amanhecer.
   *
   * `options`:
   *   width / depth - tamanho do remendo (mundo). Livres de proposito:
   *                   a faixa a preencher e um retangulo comprido e
   *                   estreito, nada parecido com o quadrado de
   *                   GROUND_SIZE.
   *   name          - nome legivel pro Editor.
   *
   * A grama continua com EXATAMENTE a mesma densidade de pixel dos
   * outros remendos, em qualquer tamanho de plano, e sem clonar textura
   * nem criar material novo: `grassTex` vem de
   * materials/material-library.js com repeat 60 calibrado para um plano
   * de GROUND_SIZE = 60 (ou seja, 1 repeticao por unidade de mundo), e o
   * UV de uma PlaneGeometry vai de 0 a 1 - entao basta multiplicar o UV
   * por tamanho / GROUND_SIZE que a conta volta a dar 1 repeticao por
   * unidade. Sem isso, um remendo mais estreito esticaria a grama.
   */
  function createUnderHouseGround(materials, options) {
    const opts = options || {};
    const width = Math.max(0.1, opts.width || GROUND_SIZE);
    const depth = Math.max(0.1, opts.depth || GROUND_SIZE);

    const geo = new THREE.PlaneGeometry(width, depth);

    const uv = geo.attributes.uv;
    const scaleU = width / GROUND_SIZE;
    const scaleV = depth / GROUND_SIZE;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * scaleU, uv.getY(i) * scaleV);
    }
    uv.needsUpdate = true;

    const nightMaterial = materials.grass;
    const dayMaterial = materials.grassDay || materials.grass;

    const mesh = new THREE.Mesh(geo, nightMaterial);
    mesh.name = opts.name || "chao-sob-a-casa";
    mesh.rotation.x = -Math.PI / 2;

    // Noite <-> dia pelo MESMO caminho do chao das janelas (os dois
    // materiais sao os mesmos objetos, compartilhados): o terreno de
    // baixo amanhece junto com o de cima, senao a emenda na base da
    // fachada apareceria como uma faixa escura de dia.
    function setDaytime(daytime) {
      mesh.material = daytime === false ? nightMaterial : dayMaterial;
    }

    function setMorning() {
      setDaytime(true);
    }

    return {
      mesh: mesh,
      setDaytime: setDaytime,
      setMorning: setMorning,
    };
  }

  return {
    GROUND_SIZE: GROUND_SIZE,
    UNDER_HOUSE_DROP: UNDER_HOUSE_DROP,
    UNDER_HOUSE_OVERLAP: UNDER_HOUSE_OVERLAP,
    WALL_GAP: WALL_GAP,
    HOLE_MARGIN: HOLE_MARGIN,
    CLADDING_GAP: CLADDING_GAP,
    buildWallGeometryWithHoles: buildWallGeometryWithHoles,
    buildWallGeometryWithOpenings: buildWallGeometryWithOpenings,
    createWallCladding: createWallCladding,
    createGroundPlane: createGroundPlane,
    createUnderHouseGround: createUnderHouseGround,
  };
})();
