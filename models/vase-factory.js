/**
 * models/vase-factory.js
 * -------------------------------------------------
 * Pequeno vaso de cerâmica com um punhado de rosas.
 * Peça puramente decorativa — sem interação, sem
 * animação — pensada para ficar sobre a escrivaninha.
 *
 * Geometria propositalmente simples e de baixa
 * poligonagem (a mesma receita usada no resto do jogo,
 * ver LampFactory), para combinar com o visual PSX.
 * -------------------------------------------------
 */

window.VaseFactory = (function () {
  const POT_HEIGHT = 0.085;

  // Uma única rosa: caule fino + botão + uma folha, inclinados de leve
  // para não ficarem todos idênticos e "grudados" no mesmo eixo.
  function createRose(materials, stemLength, tiltX, tiltZ) {
    const rose = new THREE.Group();

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.007, stemLength, 5),
      materials.roseLeaf
    );
    stem.position.y = stemLength / 2;
    rose.add(stem);

    // Botão da rosa: icosaedro sem subdivisão — poucas faces bem
    // marcadas, coerente com a estética retrô do resto do jogo.
    const bud = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.032, 0),
      materials.roseRed
    );
    bud.position.y = stemLength + 0.018;
    bud.scale.set(1, 0.88, 1);
    bud.rotation.y = Math.random() * Math.PI;
    rose.add(bud);

    // Uma folhinha simples a meio do caule
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.004, 0.015),
      materials.roseLeaf
    );
    leaf.position.set(0.016, stemLength * 0.55, 0);
    leaf.rotation.z = 0.5;
    rose.add(leaf);

    rose.rotation.x = tiltX;
    rose.rotation.z = tiltZ;
    return rose;
  }

  function createVaseWithRoses(materials) {
    const group = new THREE.Group();

    // ---------- Vaso de cerâmica ----------
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.036, POT_HEIGHT, 8),
      materials.vaseClay
    );
    pot.position.y = POT_HEIGHT / 2;
    group.add(pot);

    // Pequeno bocal (levemente mais largo que o corpo do vaso)
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.053, 0.05, 0.012, 8),
      materials.vaseClay
    );
    rim.position.y = POT_HEIGHT - 0.006;
    group.add(rim);

    // ---------- Rosas (3, com leve variação de altura/ângulo) ----------
    const rosesGroup = new THREE.Group();
    rosesGroup.position.y = POT_HEIGHT - 0.01;
    const roseDefs = [
      { x: 0, z: 0, len: 0.15, tiltX: -0.05, tiltZ: 0.06 },
      { x: -0.018, z: 0.014, len: 0.13, tiltX: 0.12, tiltZ: -0.18 },
      { x: 0.02, z: -0.012, len: 0.14, tiltX: -0.15, tiltZ: 0.16 },
    ];
    roseDefs.forEach(function (def) {
      const rose = createRose(materials, def.len, def.tiltX, def.tiltZ);
      rose.position.set(def.x, 0, def.z);
      rosesGroup.add(rose);
    });
    group.add(rosesGroup);

    return group;
  }

  return { createVaseWithRoses: createVaseWithRoses };
})();
