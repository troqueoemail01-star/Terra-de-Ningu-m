/**
 * models/door-factory.js
 * -------------------------------------------------
 * Gera o conjunto visual de uma porta: moldura + folha
 * + maçaneta + a "casca" branca usada para o destaque
 * de interação (contorno visível quando o jogador se
 * aproxima).
 *
 * A porta é montada olhando para +Z no espaço local.
 * Quem posiciona a porta no corredor (scenes/corridor-scene.js)
 * decide a rotação em Y para ela encarar o corredor.
 *
 * ---------- Portas que abrem de verdade (`options.hinged`) ----------
 * Por padrão nada mudou: a porta é uma peça só, parada, exatamente
 * como as 6 portas do corredor sempre foram. Com
 * `createDoor(materials, { hinged: true })`, a FOLHA (+ maçaneta)
 * passa a viver num pivô próprio na linha da dobradiça e ganha
 * abrir/fechar animado (`openDoor`/`closeDoor`/`update`) — é o que a
 * porta "MEU QUARTO" usa, agora que ela é a divisão física real
 * entre o corredor e o quarto (uma porta só, compartilhada pelos dois
 * ambientes: ver scenes/corridor-scene.js, scenes/room-scene.js e
 * scripts/main.js). A moldura NUNCA gira: ela fica no lugar, como o
 * batente que é.
 *
 * Nesse modo existem dois contornos em vez de um: o da folha (que
 * acompanha o giro dela) e o da moldura. `outline` continua sendo um
 * único THREE.Mesh — o da folha, que cobre o vão inteiro da porta e
 * é o alvo do raycast da mira (ver scripts/interaction-system.js);
 * o da moldura acende/apaga junto, sincronizado dentro de `update`.
 * -------------------------------------------------
 */

window.DoorFactory = (function () {
  // Dimensões padrão de todas as portas do corredor
  const DOOR_WIDTH = 1.3;
  const DOOR_HEIGHT = 2.3;
  const DOOR_DEPTH = 0.12;
  const FRAME_THICKNESS = 0.14;
  // Recuo extra da folha em relação à moldura (só a folha — a moldura
  // continua exatamente onde estava). Puramente visual: reforça a
  // sensação de batente real pedida pelo jogador, sem alterar posição
  // do grupo da porta (x/z ficam como antes, calculados em
  // corridor-scene.js) nem a colisão/interação, que dependem só dessa
  // posição do grupo.
  const PANEL_RECESS = 0.02;

  // Profundidade total da moldura (a mesma conta já usada nas peças
  // dela mais abaixo). Exportada porque é ela que dá a espessura da
  // parede compartilhada entre o corredor e MEU QUARTO: os planos das
  // duas paredes ficam exatamente nas duas faces da moldura, então o
  // vão da porta fica forrado por ela dos dois lados — nenhum vazio,
  // nenhuma fresta (ver scenes/corridor-scene.js e room-scene.js).
  const FRAME_DEPTH = DOOR_DEPTH + 0.06;

  // ---------- Espessura da DIVISORIA em que a porta vive ----------
  // CORRECAO (portas "bugadas dentro da parede"): a moldura fica
  // CENTRADA nesta espessura, e os planos das DUAS paredes que a porta
  // divide ficam nas pontas dela - sobram 2 cm de folga de cada lado da
  // madeira. Nada de plano de parede coplanar com a face da moldura (o
  // que piscava no renderizador PSX) e, principalmente, nada de plano
  // de parede ATRAVESSANDO a moldura por dentro.
  //
  // Era isso que estava acontecendo: o corredor centrava a moldura em
  // FRAME_DEPTH + 0.04 (dando a folga so do lado dele) enquanto o
  // comodo do outro lado recuava a parede dele apenas FRAME_DEPTH - ou
  // seja, o plano da parede do comodo caia 2 cm DENTRO da madeira, e a
  // porta aparecia enterrada/cortada pela parede daquele lado.
  //
  // Agora existe UM numero so, exportado daqui (e dado de MODELO: e a
  // moldura que da a espessura da divisoria) e lido pelos tres lugares
  // que precisam concordar - scenes/corridor-scene.js (onde a moldura
  // fica), scenes/side-room-scene.js e scripts/main.js (o quanto a
  // parede de entrada de cada comodo recua). Mudou a moldura, os tres
  // acompanham sozinhos.
  const PARTITION_CLEARANCE = 0.02;
  const PARTITION_DEPTH = FRAME_DEPTH + PARTITION_CLEARANCE * 2;

  // Sobreposição da folha sobre a borda do vão recortado na parede, de
  // cada lado: o vão é sempre um pouco MENOR que a folha, então a
  // porta fechada cobre a borda do recorte por completo (mesmo
  // princípio do HOLE_MARGIN das janelas, ver exterior-factory.js) —
  // sem fresta de luz e sem z-fighting entre folha e plano de parede.
  const OPENING_MARGIN = 0.02;
  const OPENING_WIDTH = DOOR_WIDTH - OPENING_MARGIN * 2;
  const OPENING_HEIGHT = DOOR_HEIGHT - OPENING_MARGIN;

  // Eixo da dobradiça (X local) das portas `hinged`: do lado oposto à
  // maçaneta e recuado o bastante para a folha ABERTA caber inteira
  // dentro do vão — é isso que garante que ela nunca atravesse o plano
  // da parede ao lado da porta ao girar.
  const HINGE_X = -(OPENING_WIDTH / 2 - DOOR_DEPTH / 2);

  // Ângulo da folha totalmente aberta (90 graus: encostada de lado, sem
  // atrapalhar a passagem) e quanto tempo o giro leva, em segundos.
  const OPEN_ANGLE = Math.PI / 2;
  const SWING_DURATION = 0.9;

  function createDoor(materials, options) {
    const hinged = !!(options && options.hinged);
    // ---------- Duas opcoes que so o GALPAO usa ----------
    // As duas nascem LIGADAS: sem elas no `options`, a porta sai exatamente
    // como as 6 do corredor e a de MEU QUARTO sempre foram - nenhuma delas
    // mudou um vertice.
    //   frame: false    - nao monta a MOLDURA (o batente). Quem pede isso e o
    //                     galpao do quintal dos fundos (ver
    //                     models/shed-factory.js): ele tem batente e verga de
    //                     madeira proprios e usa DUAS folhas lado a lado, e
    //                     duas molduras ali se atropelariam no meio do vao.
    //   outline: false  - nao monta a casca de destaque nem as bordas de face.
    //                     Peca decorativa nao entra em `interactables`, entao
    //                     nao existe contorno para acender - e sem casca ela
    //                     tambem nao vira alvo do raycast da mira.
    const withFrame = !(options && options.frame === false);
    const withOutline = !(options && options.outline === false);
    const group = new THREE.Group();
    const panelZ = -PANEL_RECESS;

    // Pivô da folha: só existe nas portas que abrem. Sem ele, folha e
    // maçaneta continuam penduradas direto no grupo, no mesmo lugar de
    // sempre.
    const leaf = hinged ? new THREE.Group() : group;
    if (hinged) {
      leaf.position.set(HINGE_X, 0, panelZ);
      group.add(leaf);
    }
    // Deslocamento da folha DENTRO do pivô: exatamente o oposto da
    // posição dele, então a porta fechada fica no lugar de sempre.
    const panelX = hinged ? -HINGE_X : 0;
    const panelLocalZ = hinged ? 0 : panelZ;

    // Folha da porta — recuada em relação ao plano da moldura (ver
    // PANEL_RECESS) e com o material próprio da porta (madeira
    // âmbar com almofadados, ver materials.doorPanel).
    const panelGeometry = new THREE.BoxGeometry(DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH);
    const panel = new THREE.Mesh(panelGeometry, materials.doorPanel);
    panel.position.set(panelX, DOOR_HEIGHT / 2, panelLocalZ);
    panel.castShadow = false;
    leaf.add(panel);

    // Maçaneta simples — acompanha o recuo da folha, sempre colada na
    // sua face frontal
    const handleGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.12);
    const handle = new THREE.Mesh(handleGeometry, materials.lampMetal);
    handle.position.set(
      panelX + DOOR_WIDTH / 2 - 0.14,
      DOOR_HEIGHT / 2,
      panelLocalZ + DOOR_DEPTH / 2 + 0.05
    );
    leaf.add(handle);

    // Moldura (topo + laterais) em torno da folha — posição inalterada
    // (continua no plano de sempre), com o material próprio da porta
    // (materials.doorCasing). Nas portas `hinged` ela vive num
    // sub-grupo só dela: é o que permite dar a ela um contorno de
    // destaque próprio, parado, enquanto a folha gira.
    const frameGroup = hinged ? new THREE.Group() : group;
    if (hinged && withFrame) {
      group.add(frameGroup);
    }

    if (withFrame) {
      const frameSideGeo = new THREE.BoxGeometry(
        FRAME_THICKNESS,
        DOOR_HEIGHT + FRAME_THICKNESS,
        FRAME_DEPTH
      );
      const frameLeft = new THREE.Mesh(frameSideGeo, materials.doorCasing);
      frameLeft.position.set(-DOOR_WIDTH / 2 - FRAME_THICKNESS / 2, DOOR_HEIGHT / 2, 0);
      frameGroup.add(frameLeft);

      const frameRight = frameLeft.clone();
      frameRight.position.x = DOOR_WIDTH / 2 + FRAME_THICKNESS / 2;
      frameGroup.add(frameRight);

      const frameTopGeo = new THREE.BoxGeometry(
        DOOR_WIDTH + FRAME_THICKNESS * 2,
        FRAME_THICKNESS,
        FRAME_DEPTH
      );
      const frameTop = new THREE.Mesh(frameTopGeo, materials.doorCasing);
      frameTop.position.set(0, DOOR_HEIGHT + FRAME_THICKNESS / 2, 0);
      frameGroup.add(frameTop);
    }

    // Casca de destaque: segue a silhueta real da porta + moldura +
    // maçaneta (ver OutlineFactory), em vez de uma caixa genérica
    // envolvendo tudo com uma margem grande. Nas portas `hinged` são
    // duas cascas (folha e moldura), cada uma pendurada na peça que ela
    // acompanha — a da folha gira junto com ela.
    let outline = null;
    let frameOutline = null;
    if (withOutline) {
      if (hinged) {
        outline = window.OutlineFactory.build(leaf, materials.outline);
        leaf.add(outline);
        if (withFrame) {
          frameOutline = window.OutlineFactory.build(frameGroup, materials.outline);
          frameGroup.add(frameOutline);
        }
      } else {
        outline = window.OutlineFactory.build(group, materials.outline);
        group.add(outline);
      }
    }

    // ---------- Borda de destaque na FACE da porta ----------
    // CORRECAO ("o contorno de interacao da porta nao aparece"): a casca
    // inflada de OutlineFactory.build so desenha a SILHUETA do objeto, e
    // a silhueta de uma porta e justamente a unica parte dela que nunca
    // esta visivel. O vao recortado na parede e mais ESTREITO que a
    // folha (OPENING_MARGIN, de proposito, para nao sobrar fresta) e a
    // moldura e maior que o vao - ou seja, a parede tapa por completo a
    // borda de 6 mm da folha E a da moldura. Resultado: o prompt
    // "Interagir" aparecia (o raycast acerta a casca normalmente, ela
    // esta la), mas contorno nenhum era desenhado na tela. De perto era
    // pior ainda: mesmo sem parede na frente, uma borda de 6 mm na
    // silhueta cai fora da tela quando a porta preenche o quadro.
    //
    // A correcao nao mexe no raycast: a casca continua sendo o alvo da
    // mira. Ela apenas GANHA uma borda visivel desenhada sobre a face da
    // folha, DENTRO do vao (por isso o recuo HIGHLIGHT_INSET, que a
    // mantem longe da borda do recorte da parede) - uma de cada lado,
    // porque a porta compartilhada e vista dos dois ambientes.
    //
    // As bordas entram como FILHAS da propria casca: assim a
    // visibilidade delas e herdada pela hierarquia de cena, e nada
    // precisa mudar no InteractionSystem (que so acende/apaga um
    // contorno por objeto) nem em scripts/main.js. Como a casca da folha
    // mora no pivo dela, as bordas tambem giram junto de graca.
    const HIGHLIGHT_INSET = 0.015;
    const HIGHLIGHT_FACE_OFFSET = 0.004;
    const highlightWidth = OPENING_WIDTH - HIGHLIGHT_INSET * 2;
    const highlightBottom = HIGHLIGHT_INSET;
    const highlightTop = OPENING_HEIGHT - HIGHLIGHT_INSET;
    const highlightHeight = highlightTop - highlightBottom;
    const highlightY = (highlightTop + highlightBottom) / 2;

    function addFaceHighlight(z) {
      // Sem casca (outline: false) nao existe pai para pendurar a borda, e nem
      // faria sentido: ninguem acende contorno de peca decorativa.
      if (!outline) {
        return null;
      }
      const border = window.OutlineFactory.buildFaceBorder(highlightWidth, highlightHeight);
      border.position.set(panelX, highlightY, z);
      // `true` de proposito: quem manda na visibilidade e a casca (o
      // pai), acesa pelo InteractionSystem quando a porta esta na mira.
      border.visible = true;
      outline.add(border);
      return border;
    }

    addFaceHighlight(panelLocalZ + DOOR_DEPTH / 2 + HIGHLIGHT_FACE_OFFSET);
    addFaceHighlight(panelLocalZ - DOOR_DEPTH / 2 - HIGHLIGHT_FACE_OFFSET);

    // ---------- Estado de abrir/fechar (só portas hinged) ----------
    // Mesmo padrão de progress/easing já usado pela cortina, pela
    // gaveta e pelo interruptor: nunca um corte seco, sempre um giro
    // suave até o alvo. update() é chamado uma vez por quadro por quem
    // montou a cena (ver frameUpdaters em scenes/corridor-scene.js).
    let openTarget = 0;
    let openProgress = 0;

    function openDoor() {
      openTarget = 1;
    }

    function closeDoor() {
      openTarget = 0;
    }

    function isOpen() {
      return openTarget === 1;
    }

    // Coloca a folha DIRETO no estado pedido, sem giro animado. Dois
    // usos, os dois em momentos em que o jogador nao pode ver a porta
    // se mexendo: a porta compartilhada com MEU QUARTO ja NASCER
    // aberta (ver openAtStart em scenes/corridor-config.js) e a mesma
    // porta ser fechada com a tela completamente preta, na virada da
    // noite (ver cutscenes/sleep-sequence.js). Nao substitui
    // openDoor/closeDoor: o giro normal, animado, continua sendo o do
    // jogo.
    function setOpenImmediate(open) {
      openTarget = open ? 1 : 0;
      openProgress = openTarget;
      if (hinged) {
        leaf.rotation.y = OPEN_ANGLE * openTarget;
      }
    }

    // 0 = fechada de vez, 1 = totalmente aberta, valores no meio =
    // girando. É o que a cena usa para ligar/desligar a colisão da
    // porta no instante certo (ver scenes/corridor-scene.js).
    function getOpenProgress() {
      return openProgress;
    }

    function update(delta) {
      if (hinged && openProgress !== openTarget) {
        const step = (delta || 0) / SWING_DURATION;
        openProgress =
          openProgress < openTarget
            ? Math.min(openTarget, openProgress + step)
            : Math.max(openTarget, openProgress - step);
        const eased = openProgress * openProgress * (3 - 2 * openProgress);
        leaf.rotation.y = OPEN_ANGLE * eased;
      }
      // Contorno da moldura sempre junto com o da folha: quem acende o
      // da folha é o InteractionSystem, que só conhece um contorno por
      // objeto interativo.
      if (frameOutline) {
        frameOutline.visible = outline.visible;
      }
    }

    return {
      group: group,
      leaf: leaf,
      outline: outline,
      frameOutline: frameOutline,
      width: DOOR_WIDTH,
      height: DOOR_HEIGHT,
      depth: DOOR_DEPTH,
      hinged: hinged,
      openDoor: openDoor,
      closeDoor: closeDoor,
      setOpenImmediate: setOpenImmediate,
      isOpen: isOpen,
      getOpenProgress: getOpenProgress,
      update: update,
    };
  }

  return {
    createDoor: createDoor,
    // Exportados para quem monta a PASSAGEM em volta da porta (o vao
    // recortado na parede compartilhada e a caixa de colisao da folha
    // aberta, ver scenes/corridor-scene.js): sao os mesmos numeros
    // usados aqui dentro, para os dois lados nunca discordarem.
    PANEL_RECESS: PANEL_RECESS,
    HINGE_X: HINGE_X,
    DOOR_WIDTH: DOOR_WIDTH,
    DOOR_HEIGHT: DOOR_HEIGHT,
    DOOR_DEPTH: DOOR_DEPTH,
    FRAME_THICKNESS: FRAME_THICKNESS,
    FRAME_DEPTH: FRAME_DEPTH,
    // Espessura da divisoria (moldura + 2 cm de folga de cada lado) -
    // ver o bloco de comentario dela mais acima.
    PARTITION_DEPTH: PARTITION_DEPTH,
    OPENING_WIDTH: OPENING_WIDTH,
    OPENING_HEIGHT: OPENING_HEIGHT,
    OPEN_ANGLE: OPEN_ANGLE,
  };
})();
