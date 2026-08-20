/**
 * models/potted-plant-factory.js
 * -------------------------------------------------
 * Vaso de planta decorativo do corredor: vaso de cerâmica
 * envelhecida (mas bem conservado) com uma planta frondosa
 * de folhas grandes, inspirada na referência enviada pelo
 * usuário (um vaso de "ave-do-paraíso" / strelitzia).
 *
 * Peça puramente decorativa — sem interação, sem outline,
 * sem animação — pensada para ficar encostada na parede do
 * corredor (ver scenes/corridor-scene.js). Mesma receita de
 * baixa poligonagem do resto do jogo (ver LampFactory /
 * VaseFactory): geometrias simples, poucos segmentos.
 *
 * Convenção igual à de DoorFactory/DeskFactory: a planta
 * "olha" para +Z no espaço local — a maior parte da folhagem
 * fica voltada para esse lado — e quem posiciona (corridor-
 * scene.js) decide a rotação em Y para virá-la para dentro do
 * corredor. Isso mantém as folhas mais compridas longe da
 * parede, em vez de atravessá-la.
 * -------------------------------------------------
 */

window.PottedPlantFactory = (function () {
  const POT_TOP_RADIUS = 0.27;
  const POT_BOTTOM_RADIUS = 0.21;
  const POT_HEIGHT = 0.44;
  const RIM_HEIGHT = 0.04;
  const RIM_RADIUS = POT_TOP_RADIUS + 0.018;
  const SOIL_RADIUS = POT_TOP_RADIUS - 0.03;
  const SOIL_Y = POT_HEIGHT - 0.02;

  // Contorno simples de uma folha (base presa na haste -> ponta), com
  // poucos segmentos de curva — baixa poligonagem, mesma receita usada
  // no botão da rosa em VaseFactory (IcosahedronGeometry sem subdivisão).
  function createLeafGeometry(length, width) {
    const halfW = width / 2;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(halfW, length * 0.24, halfW * 0.92, length * 0.55);
    shape.quadraticCurveTo(halfW * 0.5, length * 0.88, 0, length);
    shape.quadraticCurveTo(-halfW * 0.5, length * 0.88, -halfW * 0.92, length * 0.55);
    shape.quadraticCurveTo(-halfW, length * 0.24, 0, 0);
    return new THREE.ShapeGeometry(shape, 4);
  }

  // Uma folha completa: haste fina + lâmina com nervura central
  // discreta. `def.angle` distribui a folha ao redor do centro do
  // vaso (visto de cima); `def.tilt` controla o quanto ela se ergue
  // (perto de 0 = quase horizontal, perto de PI/2 = quase vertical) —
  // imitando o leque desigual de alturas de uma planta real.
  function createLeaf(materials, def) {
    const leaf = new THREE.Group();

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.017, def.stemLength, 5),
      def.reddishBase ? materials.plantStemBase : materials.plantStem
    );
    stem.position.y = def.stemLength / 2;
    leaf.add(stem);

    const bladeMat = def.altTone ? materials.plantLeafSecondary : materials.plantLeafPrimary;
    const blade = new THREE.Mesh(createLeafGeometry(def.bladeLength, def.bladeWidth), bladeMat);
    blade.position.y = def.stemLength;
    blade.rotation.x = -Math.PI / 2 + def.tilt;
    leaf.add(blade);

    // Nervura central discreta, um pouco mais escura — filha de
    // `blade`, então já herda a orientação da lâmina automaticamente.
    const rib = new THREE.Mesh(
      new THREE.PlaneGeometry(0.01, def.bladeLength * 0.88),
      materials.plantLeafRib
    );
    rib.position.set(0, def.bladeLength * 0.46, 0.0015);
    blade.add(rib);

    leaf.rotation.y = def.angle;
    return leaf;
  }

  // Leque desigual de folhas: a maioria voltada para a frente (local
  // +Z — lado que fica de frente para o corredor, ver comentário
  // acima), com duas ou três folhas curtas nos fundos (perto de PI)
  // só para dar volume sem furar a parede.
  const BASE_LEAF_DEFS = [
    { angle: 0.05, stemLength: 0.6, bladeLength: 0.66, bladeWidth: 0.21, tilt: 1.05 },
    { angle: 0.55, stemLength: 0.52, bladeLength: 0.58, bladeWidth: 0.2, tilt: 0.82, altTone: true },
    { angle: -0.5, stemLength: 0.5, bladeLength: 0.6, bladeWidth: 0.2, tilt: 0.78 },
    { angle: 1.05, stemLength: 0.4, bladeLength: 0.5, bladeWidth: 0.17, tilt: 0.5, altTone: true },
    { angle: -1.1, stemLength: 0.38, bladeLength: 0.48, bladeWidth: 0.17, tilt: 0.45 },
    { angle: 1.95, stemLength: 0.24, bladeLength: 0.4, bladeWidth: 0.15, tilt: 0.22, reddishBase: true },
    { angle: -1.9, stemLength: 0.22, bladeLength: 0.37, bladeWidth: 0.14, tilt: 0.18, altTone: true, reddishBase: true },
    { angle: 2.95, stemLength: 0.15, bladeLength: 0.26, bladeWidth: 0.12, tilt: 0.05, reddishBase: true },
  ];

  function createPottedPlant(materials) {
    const group = new THREE.Group();

    // ---------- Vaso de cerâmica ----------
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(POT_TOP_RADIUS, POT_BOTTOM_RADIUS, POT_HEIGHT, 10),
      materials.potCeramic
    );
    pot.position.y = POT_HEIGHT / 2;
    group.add(pot);

    // Borda/bocal levemente mais largo que o corpo, para dar
    // acabamento (mesma ideia do bocal em VaseFactory).
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(RIM_RADIUS, POT_TOP_RADIUS, RIM_HEIGHT, 10),
      materials.potCeramic
    );
    rim.position.y = POT_HEIGHT - RIM_HEIGHT / 2;
    group.add(rim);

    // ---------- Terra ----------
    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(SOIL_RADIUS, SOIL_RADIUS * 0.94, 0.03, 10),
      materials.potSoil
    );
    soil.position.y = SOIL_Y;
    group.add(soil);

    // Pedrinhas espalhadas sobre a terra (baixa poligonagem — icosaedro
    // sem subdivisão, mesma técnica do botão das rosas em VaseFactory).
    const pebbleCount = 5;
    for (let i = 0; i < pebbleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * SOIL_RADIUS * 0.75;
      const pebble = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.012 + Math.random() * 0.01, 0),
        materials.plantPebble
      );
      pebble.position.set(Math.cos(angle) * dist, SOIL_Y + 0.016, Math.sin(angle) * dist);
      pebble.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      group.add(pebble);
    }

    // ---------- Folhagem ----------
    const foliage = new THREE.Group();
    BASE_LEAF_DEFS.forEach(function (base) {
      // Pequena variação aleatória por instância, para os dois vasos do
      // corredor não saírem idênticos um ao outro.
      const def = {
        angle: base.angle + (Math.random() - 0.5) * 0.16,
        stemLength: base.stemLength * (0.92 + Math.random() * 0.16),
        bladeLength: base.bladeLength * (0.92 + Math.random() * 0.16),
        bladeWidth: base.bladeWidth * (0.94 + Math.random() * 0.12),
        tilt: base.tilt + (Math.random() - 0.5) * 0.1,
        altTone: base.altTone,
        reddishBase: base.reddishBase,
      };
      foliage.add(createLeaf(materials, def));
    });
    foliage.position.y = SOIL_Y;
    group.add(foliage);

    return group;
  }

  return {
    createPottedPlant: createPottedPlant,
    // Raio aproximado do "footprint" do vaso (borda, que é a parte mais
    // larga) — usado por corridor-scene.js para montar a caixa de
    // colisão sem precisar repetir esse número lá.
    FOOTPRINT_RADIUS: RIM_RADIUS,
  };
})();
