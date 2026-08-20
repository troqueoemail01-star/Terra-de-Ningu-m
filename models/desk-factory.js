/**
 * models/desk-factory.js
 * -------------------------------------------------
 * Escrivaninha de madeira simples e envelhecida, com uma
 * gaveta funcional (abre/fecha pelo botão "Interagir") e
 * dois objetos decorativos sobre o tampo:
 * um vaso de rosas (VaseFactory, sem interação) e um
 * telefone antigo (PhoneFactory, interativo mas sem
 * mecânica implementada ainda).
 *
 * Mesma convenção do resto do jogo (ver DoorFactory): a
 * escrivaninha "olha" para +Z no espaço local (a frente,
 * de onde a gaveta é puxada, fica virada para o corredor);
 * quem posiciona (scenes/corridor-scene.js) decide a
 * rotação em Y para ela encarar o corredor, e o encosto
 * (fundo) fica em z = 0 local, junto à parede.
 *
 * A gaveta não é mais um bloco maciço: por dentro ela é uma
 * caixa de verdade (fundo + laterais + traseira, com as MESMAS
 * medidas externas de antes) e guarda uma carta de papel
 * levemente amassada, deitada sobre o fundo
 * (models/paper-note-factory.js). A carta é filha do grupo da
 * gaveta, então desliza junto com ela: fica escondida com a
 * gaveta fechada e aparece naturalmente quando ela abre. Por
 * enquanto é só objeto visual — nenhuma interação própria.
 * -------------------------------------------------
 */

window.DeskFactory = (function () {
  // Fator de escala aplicado ao conjunto inteiro (tampo, pernas, gaveta
  // e — por estarem "dentro" deste mesmo grupo — também o vaso de
  // rosas e o telefone) no final de `createDesk`. Ajuste pedido para
  // os três modelos preencherem melhor o corredor: como os três fazem
  // parte da mesma hierarquia, um único fator uniforme os aumenta
  // juntos, mantendo a proporção entre eles exatamente como era antes.
  const DESK_SCALE = 1.2;

  const DESK_WIDTH = 1.3;
  const DESK_DEPTH = 0.5;
  const DESK_HEIGHT = 0.8; // altura da superfície do tampo
  const TOP_THICKNESS = 0.045;
  const LEG_SIZE = 0.05;
  const LEG_INSET = 0.045;

  // Friso/saia de acabamento logo abaixo do tampo (ver createDesk):
  // uma faixa fina e mais escura que envolve o mesmo contorno do
  // tampo, marcando bem a borda e dando uma sensação de estrutura mais
  // sólida — cabe folgado no vão que já existia entre o tampo e a
  // gaveta (DRAWER_Y é calculado com 0.02 de vão logo abaixo do
  // tampo), então não encosta na gaveta.
  const TOP_TRIM_HEIGHT = 0.016;

  // Pernas em dois blocos (mais largo em cima, afinando embaixo) mais
  // uma pequena sapata escura na ponta — acabamento mais trabalhado
  // que uma única peça reta, mas ainda só com ângulos retos, coerente
  // com a estética "quadrada" do resto do jogo (ver createLegGroup).
  const LEG_SIZE_TOP = LEG_SIZE * 1.15;
  const LEG_SIZE_BOTTOM = LEG_SIZE * 0.8;
  const LEG_UPPER_RATIO = 0.32; // fração da altura útil ocupada pelo bloco de cima
  const LEG_FOOT_HEIGHT = 0.018;

  const DRAWER_WIDTH = DESK_WIDTH - 0.32;
  const DRAWER_HEIGHT = 0.16;
  const DRAWER_FRONT_DEPTH = 0.03;
  const DRAWER_BODY_DEPTH = 0.3;
  const DRAWER_Y = DESK_HEIGHT - TOP_THICKNESS - 0.02 - DRAWER_HEIGHT / 2;
  const DRAWER_CLOSED_Z = DESK_DEPTH - DRAWER_FRONT_DEPTH / 2 - 0.01;
  const DRAWER_OPEN_DISTANCE = 0.24;
  const DRAWER_ANIM_DURATION = 0.6; // segundos para abrir/fechar por completo

  // ---------- Interior da gaveta ----------
  // O corpo da gaveta era um bloco maciço (a gaveta sempre vazia do
  // comentário lá em cima). Para caber alguma coisa dentro dele, virou
  // uma caixa aberta em cima: fundo + duas laterais + traseira, com
  // EXATAMENTE o mesmo envelope externo de antes (mesma largura, altura,
  // profundidade e mesma posição). Ou seja: por fora nada mudou — nem a
  // silhueta, nem o contorno de interação, nem a colisão da
  // escrivaninha. A boca da frente continua tampada pela própria frente
  // da gaveta, que é mais larga e mais alta que o corpo.
  const DRAWER_INNER_WALL = 0.01;   // espessura das laterais e da traseira
  const DRAWER_INNER_FLOOR = 0.012; // espessura do fundo

  // ---------- Carta guardada dentro da gaveta ----------
  // Folha de papel levemente amassada, deitada sobre o fundo da gaveta
  // (ver models/paper-note-factory.js). É só objeto físico/visual: não
  // tem interação, contorno, diálogo nem objetivo ligado a ela.
  const NOTE_WIDTH = 0.19;        // largura da folha (a altura sai da proporção real)
  const NOTE_CRUMPLE = 0.6;       // 0 = folha lisa | 1 = padrão da fábrica (amassado forte)
  const NOTE_SEED = 5;            // semente do amassado (sempre igual em toda máquina)
  const NOTE_YAW = 0.14;          // giro da folha no próprio plano, em radianos
  const NOTE_OFFSET_X = -0.045;   // deslocamento lateral dentro da gaveta
  const NOTE_OFFSET_Z = 0.008;    // + = mais para a frente da gaveta
  const NOTE_FLOOR_GAP = 0.0006;  // folga mínima para não brigar com o fundo (z-fighting)
  const NOTE_EDGE_MARGIN = 0.012; // folga mínima até as paredes internas

  function createDesk(materials) {
    const group = new THREE.Group();

    // ---------- Tampo ----------
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(DESK_WIDTH, TOP_THICKNESS, DESK_DEPTH),
      materials.deskWood
    );
    top.position.set(0, DESK_HEIGHT - TOP_THICKNESS / 2, DESK_DEPTH / 2);
    group.add(top);

    // ---------- Friso/saia sob o tampo ----------
    // Mesmo contorno do tampo (largura x profundidade), só que fina e
    // num tom mais escuro (doorFrame, o mesmo castanho escuro já usado
    // no corpo da gaveta) — marca a borda do tampo com mais definição
    // e lê como uma peça estrutural de acabamento (a "saia" clássica
    // logo abaixo do tampo de uma escrivaninha de verdade), sem
    // atrapalhar a gaveta logo abaixo dela.
    const topTrim = new THREE.Mesh(
      new THREE.BoxGeometry(DESK_WIDTH, TOP_TRIM_HEIGHT, DESK_DEPTH),
      materials.doorFrame
    );
    topTrim.position.set(0, DESK_HEIGHT - TOP_THICKNESS - TOP_TRIM_HEIGHT / 2, DESK_DEPTH / 2);
    group.add(topTrim);

    // ---------- Pernas ----------
    // Cada perna é montada em dois blocos (mais largo em cima, afinando
    // embaixo) mais uma sapata escura na ponta — ver comentário das
    // constantes acima. `legOffsetX`/`legPositions` continuam calculados
    // a partir de LEG_SIZE, exatamente como antes, para a posição de
    // cada perna não mudar (só o "corpo" visível dela).
    const legHeight = DESK_HEIGHT - TOP_THICKNESS;
    const legOffsetX = DESK_WIDTH / 2 - LEG_SIZE / 2 - LEG_INSET;
    const legPositions = [
      [-legOffsetX, LEG_INSET + LEG_SIZE / 2],
      [legOffsetX, LEG_INSET + LEG_SIZE / 2],
      [-legOffsetX, DESK_DEPTH - LEG_INSET - LEG_SIZE / 2],
      [legOffsetX, DESK_DEPTH - LEG_INSET - LEG_SIZE / 2],
    ];

    function createLegGroup() {
      const legGroup = new THREE.Group();

      const bodyHeight = legHeight - LEG_FOOT_HEIGHT;
      const upperHeight = bodyHeight * LEG_UPPER_RATIO;
      const lowerHeight = bodyHeight - upperHeight;

      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(LEG_SIZE_TOP, upperHeight, LEG_SIZE_TOP),
        materials.deskWood
      );
      upper.position.y = LEG_FOOT_HEIGHT + lowerHeight + upperHeight / 2;
      legGroup.add(upper);

      const lower = new THREE.Mesh(
        new THREE.BoxGeometry(LEG_SIZE_BOTTOM, lowerHeight, LEG_SIZE_BOTTOM),
        materials.deskWood
      );
      lower.position.y = LEG_FOOT_HEIGHT + lowerHeight / 2;
      legGroup.add(lower);

      // Sapata: peça baixa e um pouco mais larga que a base da perna,
      // no mesmo tom escuro do friso do tampo — acabamento discreto de
      // "pé" da perna, como um patim protegendo a madeira do contato
      // com o chão.
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(LEG_SIZE_BOTTOM * 1.15, LEG_FOOT_HEIGHT, LEG_SIZE_BOTTOM * 1.15),
        materials.doorFrame
      );
      foot.position.y = LEG_FOOT_HEIGHT / 2;
      legGroup.add(foot);

      return legGroup;
    }

    legPositions.forEach(function (pos) {
      const legGroup = createLegGroup();
      legGroup.position.set(pos[0], 0, pos[1]);
      group.add(legGroup);
    });

    // ---------- Gaveta (frente + corpo deslizam juntos) ----------
    const drawerGroup = new THREE.Group();

    const drawerFront = new THREE.Mesh(
      new THREE.BoxGeometry(DRAWER_WIDTH, DRAWER_HEIGHT, DRAWER_FRONT_DEPTH),
      materials.deskDrawerFront
    );
    drawerGroup.add(drawerFront);

    // Corpo da gaveta: caixa aberta em cima (fundo + duas laterais +
    // traseira), montada dentro de um sub-grupo cujo centro fica
    // exatamente onde ficava o centro do antigo bloco maciço — as
    // medidas externas continuam idênticas (ver DRAWER_INNER_WALL lá
    // em cima). A frente da gaveta tampa a boca da caixa: ela é mais
    // larga e mais alta que o corpo e passa na frente da abertura,
    // então de fora não há nenhuma fresta para dentro da gaveta.
    const drawerBodyWidth = DRAWER_WIDTH - 0.04;
    const drawerBodyHeight = DRAWER_HEIGHT - 0.03;

    const drawerBody = new THREE.Group();
    drawerBody.position.z = -(DRAWER_BODY_DEPTH / 2 + DRAWER_FRONT_DEPTH / 2 - 0.01);

    const drawerFloor = new THREE.Mesh(
      new THREE.BoxGeometry(drawerBodyWidth, DRAWER_INNER_FLOOR, DRAWER_BODY_DEPTH),
      materials.doorFrame
    );
    drawerFloor.position.y = -drawerBodyHeight / 2 + DRAWER_INNER_FLOOR / 2;
    drawerBody.add(drawerFloor);

    const drawerBack = new THREE.Mesh(
      new THREE.BoxGeometry(drawerBodyWidth, drawerBodyHeight, DRAWER_INNER_WALL),
      materials.doorFrame
    );
    drawerBack.position.z = -DRAWER_BODY_DEPTH / 2 + DRAWER_INNER_WALL / 2;
    drawerBody.add(drawerBack);

    const drawerSideGeo = new THREE.BoxGeometry(
      DRAWER_INNER_WALL,
      drawerBodyHeight,
      DRAWER_BODY_DEPTH
    );
    const drawerSideLeft = new THREE.Mesh(drawerSideGeo, materials.doorFrame);
    drawerSideLeft.position.x = -drawerBodyWidth / 2 + DRAWER_INNER_WALL / 2;
    drawerBody.add(drawerSideLeft);

    const drawerSideRight = new THREE.Mesh(drawerSideGeo, materials.doorFrame);
    drawerSideRight.position.x = drawerBodyWidth / 2 - DRAWER_INNER_WALL / 2;
    drawerBody.add(drawerSideRight);

    drawerGroup.add(drawerBody);

    // Altura da face de cima do fundo da gaveta, já em coordenadas do
    // próprio drawerGroup — é sobre ela que a carta se apoia (ver mais
    // abaixo).
    const drawerFloorTopY =
      drawerBody.position.y - drawerBodyHeight / 2 + DRAWER_INNER_FLOOR;

    // Puxador simples (mesmo metal escuro usado na maçaneta das portas)
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.08, 6),
      materials.lampMetal
    );
    knob.rotation.z = Math.PI / 2;
    knob.position.set(0, 0, DRAWER_FRONT_DEPTH / 2 + 0.04);
    drawerGroup.add(knob);

    drawerGroup.position.set(0, DRAWER_Y, DRAWER_CLOSED_Z);
    group.add(drawerGroup);

    // Casca de destaque da gaveta: segue a silhueta real da frente +
    // corpo + puxador (ver OutlineFactory). Construída a partir de
    // `drawerGroup` e adicionada como filha dele, então continua
    // "colada" na gaveta ao deslizar (o grupo inteiro se move junto).
    const drawerOutline = window.OutlineFactory.build(drawerGroup, materials.outline);
    drawerGroup.add(drawerOutline);

    // ---------- Carta de papel dentro da gaveta ----------
    // Filha do próprio `drawerGroup` de propósito: é exatamente o grupo
    // que desliza em `update()` (mais abaixo), então a carta acompanha a
    // gaveta abrindo e fechando sem nenhum código de sincronia e sem
    // nunca perder a posição relativa dentro dela — igual à frente, ao
    // puxador e à casca de contorno, que já viajam nesse mesmo grupo.
    //
    // Entra DEPOIS de `OutlineFactory.build` acima (e marcada com
    // `excludeFromOutline`) para ficar fora da silhueta de destaque:
    // quem é interativo é a gaveta, não o papel — e inflar uma folha
    // amassada em 6 mm viraria um borrão branco em cima dela.
    //
    // Nesta etapa a carta é só um objeto físico/visual: nenhuma
    // interação, diálogo, zoom, leitura ou objetivo ligado a ela.
    let drawerNote = null;
    if (window.PaperNoteFactory) {
      drawerNote = window.PaperNoteFactory.criar({
        largura: NOTE_WIDTH,
        amassado: NOTE_CRUMPLE,
        semente: NOTE_SEED,
        // MeshStandardMaterial, como o resto do cenário (quadros,
        // pôsteres, móveis): reage à luminária, à luz ambiente e à
        // névoa igual a qualquer outra superfície do corredor.
        iluminacao: 'standard',
        // Texturas de 256 px e tremor de vértice na mesma resolução
        // interna do jogo (320x180, ver scripts/main.js) — é o que
        // mantém a folha na mesma estética PS1 do resto.
        resolucao: 'psx',
        psx: { resolucao: [320, 180] },
      });

      const noteGroup = drawerNote.grupo;
      noteGroup.name = 'carta-gaveta';
      noteGroup.userData.excludeFromOutline = true;

      // A folha nasce em pé, olhando para +Z (convenção do projeto).
      // rotation.x deita ela com a frente virada para cima; rotation.z
      // gira a carta no próprio plano, para ela não ficar
      // milimetricamente alinhada com a gaveta — parece papel largado
      // ali dentro, não peça encaixada.
      noteGroup.rotation.set(-Math.PI / 2, 0, NOTE_YAW);
      noteGroup.position.set(
        NOTE_OFFSET_X,
        0,
        drawerBody.position.z + NOTE_OFFSET_Z
      );

      // Apoio no fundo: em vez de chutar uma altura, mede a caixa real
      // da folha (já amassada e já deitada) e encosta o ponto mais baixo
      // dela no fundo da gaveta. Assim o papel nunca afunda na madeira
      // nem flutua, seja qual for o amassado/semente escolhidos.
      noteGroup.updateMatrixWorld(true);
      const noteBox = new THREE.Box3().setFromObject(noteGroup);
      noteGroup.position.y += drawerFloorTopY + NOTE_FLOOR_GAP - noteBox.min.y;

      // Trava de segurança: se um dia alguém mexer no tamanho da folha
      // ou da gaveta, a carta é empurrada de volta para dentro em vez de
      // atravessar uma lateral, a traseira ou a frente da gaveta (o
      // limite da frente é a face de trás da própria frente da gaveta,
      // por isso ela some por completo com a gaveta fechada).
      const innerMinX = -drawerBodyWidth / 2 + DRAWER_INNER_WALL + NOTE_EDGE_MARGIN;
      const innerMaxX = drawerBodyWidth / 2 - DRAWER_INNER_WALL - NOTE_EDGE_MARGIN;
      const innerMinZ =
        drawerBody.position.z -
        DRAWER_BODY_DEPTH / 2 +
        DRAWER_INNER_WALL +
        NOTE_EDGE_MARGIN;
      const innerMaxZ = -DRAWER_FRONT_DEPTH / 2 - NOTE_EDGE_MARGIN;
      if (noteBox.min.x < innerMinX) {
        noteGroup.position.x += innerMinX - noteBox.min.x;
      } else if (noteBox.max.x > innerMaxX) {
        noteGroup.position.x += innerMaxX - noteBox.max.x;
      }
      if (noteBox.min.z < innerMinZ) {
        noteGroup.position.z += innerMinZ - noteBox.min.z;
      } else if (noteBox.max.z > innerMaxZ) {
        noteGroup.position.z += innerMaxZ - noteBox.max.z;
      }

      drawerGroup.add(noteGroup);
    }

    // ---------- Vaso de rosas (decorativo, sem interação) ----------
    const vase = window.VaseFactory.createVaseWithRoses(materials);
    const vaseLocalX = -DESK_WIDTH * 0.26;
    const vaseLocalZ = DESK_DEPTH * 0.6;
    vase.position.set(vaseLocalX, DESK_HEIGHT, vaseLocalZ);
    group.add(vase);

    // ---------- Telefone antigo (interativo, sem mecânica ainda) ----------
    const phoneBuilt = window.PhoneFactory.createPhone(materials);
    const phoneLocalX = DESK_WIDTH * 0.24;
    const phoneLocalZ = DESK_DEPTH * 0.42;
    phoneBuilt.group.position.set(phoneLocalX, DESK_HEIGHT, phoneLocalZ);
    group.add(phoneBuilt.group);

    // ---------- Pilha de livros (decorativa, sem interação) ----------
    // Em X, fica a meio caminho entre a borda direita do vaso e a
    // borda esquerda do telefone (não entre os dois centros — isso
    // ficaria bem mais perto do telefone, já que ele é bem mais largo
    // que o vaso), com folga parecida dos dois lados. Em Z, a meio
    // caminho entre a profundidade de cada um. Mesma convenção de
    // altura do vaso e do telefone: a base do modelo já nasce em
    // y = 0 local (ver BookFactory), então plantar o grupo em
    // y = DESK_HEIGHT apoia a pilha exatamente sobre o tampo, sem
    // flutuar nem afundar nele.
    const bookStack = window.BookFactory.createBookStack();
    const bookLocalX = -DESK_WIDTH * 0.046;
    const bookLocalZ = DESK_DEPTH * 0.52;
    bookStack.position.set(bookLocalX, DESK_HEIGHT, bookLocalZ);
    group.add(bookStack);

    // ---------- Estado / animação da gaveta ----------
    let drawerOpen = false;
    let drawerProgress = 0; // 0 = fechada, 1 = aberta

    function toggleDrawer() {
      drawerOpen = !drawerOpen;
    }

    // Abrir/fechar por comando (em vez de alternar): usado pelo pop-up
    // da gaveta do objetivo "LER A CARTA" — interagir com a gaveta
    // puxa ela de verdade e abre a lista de itens; fechar o pop-up
    // empurra ela de volta (ver interface/drawer-popup.js e
    // scripts/main.js). A animação é a MESMA de sempre (update()
    // abaixo), só a forma de pedir muda.
    function openDrawer() {
      drawerOpen = true;
    }

    function closeDrawer() {
      drawerOpen = false;
    }

    function isDrawerOpen() {
      return drawerOpen;
    }

    // Tira a carta de dentro da gaveta (o jogador pegou). Não destrói
    // nada: só esconde a malha, então a folha continua no lugar exato
    // caso um dia precise voltar. `hasDrawerNote()` é o que o pop-up
    // consulta para saber se ainda há algo lá dentro.
    function takeDrawerNote() {
      if (drawerNote && drawerNote.grupo) {
        drawerNote.grupo.visible = false;
      }
    }

    function hasDrawerNote() {
      return !!(drawerNote && drawerNote.grupo && drawerNote.grupo.visible);
    }

    function update(delta) {
      const target = drawerOpen ? 1 : 0;
      const step = delta / DRAWER_ANIM_DURATION;
      if (drawerProgress < target) {
        drawerProgress = Math.min(target, drawerProgress + step);
      } else if (drawerProgress > target) {
        drawerProgress = Math.max(target, drawerProgress - step);
      }
      const eased = drawerProgress * drawerProgress * (3 - 2 * drawerProgress);
      drawerGroup.position.z = DRAWER_CLOSED_Z + DRAWER_OPEN_DISTANCE * eased;
    }

    // Telefone: só repassa a interação (por enquanto sem efeito nenhum).
    function interactPhone() {
      phoneBuilt.interact();
    }

    // Aumenta o conjunto inteiro de uma vez só (ver comentário de
    // DESK_SCALE acima) — feito por último, depois que tampo, pernas,
    // gaveta, vaso e telefone já foram todos montados como filhos deste
    // grupo, então todos crescem juntos na mesma proporção.
    group.scale.setScalar(DESK_SCALE);

    return {
      group: group,
      update: update,
      toggleDrawer: toggleDrawer,
      openDrawer: openDrawer,
      closeDrawer: closeDrawer,
      isDrawerOpen: isDrawerOpen,
      takeDrawerNote: takeDrawerNote,
      hasDrawerNote: hasDrawerNote,
      interactPhone: interactPhone,
      drawerOutline: drawerOutline,
      // Carta dentro da gaveta: exposta só como referência para
      // quando a leitura dela for implementada (hoje ninguém usa).
      drawerNote: drawerNote,
      phoneOutline: phoneBuilt.outline,
      // Pontos de interação em espaço local, antes da rotação/posição
      // aplicadas pela cena E antes do escalonamento acima (o sistema
      // de interação atual não usa mais estes pontos para calcular
      // posição — ele lê a posição-mundo diretamente de cada "outline",
      // que já reflete corretamente a escala. Mantidos aqui apenas como
      // metadado de referência local da gaveta/telefone.
      drawerAnchor: { x: 0, z: DRAWER_CLOSED_Z },
      phoneAnchor: { x: phoneLocalX, z: phoneLocalZ },
    };
  }

  return {
    createDesk: createDesk,
    DESK_WIDTH: DESK_WIDTH * DESK_SCALE,
    DESK_DEPTH: DESK_DEPTH * DESK_SCALE,
    DESK_HEIGHT: DESK_HEIGHT * DESK_SCALE,
  };
})();
