/**
 * models/outlet-factory.js
 * -------------------------------------------------
 * Tomada elétrica de parede — peça 100% procedural (sem .glb, mesmo
 * princípio de SwitchFactory/LampFactory: placa + detalhes construídos
 * com geometrias primitivas do three.js), criada para a TV do quarto
 * ("MEU QUARTO") ter uma fonte de energia visível na parede atrás dela
 * (ver scenes/room-scene.js, bloco "Tomada + cabo de energia" dentro
 * de "Mesinha de TV") — só para dar a impressão de que a TV está
 * ligada na tomada, sem nenhuma outra função.
 *
 * Reaproveita os mesmos materiais já usados pelo interruptor de luz do
 * corredor (materials.switchPlate/lampMetal — ver material-library.js)
 * e o mesmo tom escuro do disco do telefone (materials.phoneDial) para
 * os furos, em vez de criar qualquer material novo — mesmo espírito de
 * "reaproveitar o que já existe" já seguido pelos outros modelos do
 * jogo.
 *
 * Peça puramente decorativa — sem interação, sem outline, sem prompt
 * de "Interagir" (mesmo tratamento do criado-mudo/mesinha de TV: não
 * entra em `interactables`).
 *
 * Convenção de espaço local (mesma ideia de PictureFactory/
 * SwitchFactory): Z = 0 é a parede (a placa "cresce" para +Z, saindo
 * da parede em direção ao quarto); X = 0 e Y = 0 são o centro
 * horizontal/vertical da placa.
 * -------------------------------------------------
 */

window.OutletFactory = (function () {
  const PLATE_WIDTH = 0.08;
  const PLATE_HEIGHT = 0.08;
  const PLATE_DEPTH = 0.012;

  const SLOT_WIDTH = 0.006;
  const SLOT_HEIGHT = 0.02;
  const SLOT_DEPTH = 0.006;
  const SLOT_OFFSET_X = 0.016;
  const SLOT_OFFSET_Y = 0.008;

  // Furo de aterramento (terceiro furo, redondo, entre/abaixo dos dois
  // furos principais — layout comum de tomada) — é também onde o cabo
  // (ver CableFactory) visualmente "nasce", por isso a posição dele
  // vira `plugAnchor` mais abaixo.
  const GROUND_HOLE_RADIUS = 0.0055;
  const GROUND_HOLE_Y = -0.014;

  const SCREW_RADIUS = 0.005;
  const SCREW_LENGTH = 0.008;

  function createOutlet(materials) {
    const group = new THREE.Group();

    // ---------- Placa plástica (fixada na parede) ----------
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(PLATE_WIDTH, PLATE_HEIGHT, PLATE_DEPTH),
      materials.switchPlate
    );
    plate.position.z = PLATE_DEPTH / 2;
    group.add(plate);

    // ---------- Furos das duas lâminas ----------
    const slotGeo = new THREE.BoxGeometry(SLOT_WIDTH, SLOT_HEIGHT, SLOT_DEPTH);
    [-SLOT_OFFSET_X, SLOT_OFFSET_X].forEach(function (x) {
      const slot = new THREE.Mesh(slotGeo, materials.phoneDial);
      slot.position.set(x, SLOT_OFFSET_Y, PLATE_DEPTH - SLOT_DEPTH / 2 + 0.001);
      group.add(slot);
    });

    // ---------- Furo de aterramento (redondo) ----------
    const groundHole = new THREE.Mesh(
      new THREE.CylinderGeometry(GROUND_HOLE_RADIUS, GROUND_HOLE_RADIUS, SLOT_DEPTH, 8),
      materials.phoneDial
    );
    groundHole.rotation.x = Math.PI / 2;
    groundHole.position.set(0, GROUND_HOLE_Y, PLATE_DEPTH - SLOT_DEPTH / 2 + 0.001);
    group.add(groundHole);

    // ---------- Parafusos de fixação (mesmo metal escuro do interruptor) ----------
    const screwGeo = new THREE.CylinderGeometry(SCREW_RADIUS, SCREW_RADIUS, SCREW_LENGTH, 6);
    [PLATE_HEIGHT / 2 - 0.012, -PLATE_HEIGHT / 2 + 0.012].forEach(function (y) {
      const screw = new THREE.Mesh(screwGeo, materials.lampMetal);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(0, y, PLATE_DEPTH + SCREW_LENGTH / 2 - 0.003);
      group.add(screw);
    });

    // Ponto onde o cabo (ver CableFactory, usado em
    // scenes/room-scene.js) visualmente "sai" da tomada — no furo de
    // aterramento, já na frente da placa. Um THREE.Object3D vazio (só
    // posição, sem geometria própria): quem monta a cena lê a posição-
    // mundo dele com `getWorldPosition` depois de posicionar/rotacionar
    // este grupo inteiro na parede, sem precisar duplicar nenhuma
    // conta de transformação aqui.
    const plugAnchor = new THREE.Object3D();
    plugAnchor.position.set(0, GROUND_HOLE_Y, PLATE_DEPTH);
    group.add(plugAnchor);

    return {
      group: group,
      width: PLATE_WIDTH,
      height: PLATE_HEIGHT,
      plugAnchor: plugAnchor,
    };
  }

  return { createOutlet: createOutlet };
})();
