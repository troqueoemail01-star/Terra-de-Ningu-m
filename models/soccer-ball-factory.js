/**
 * models/soccer-ball-factory.js
 * -------------------------------------------------
 * Bola de futebol do quarto ("MEU QUARTO") — modelo 100% procedural
 * (mesmo princípio de CarpetFactory/CeilingFanFactory: sem depender de
 * nenhum arquivo externo tipo .glb ou .png): a malha é um icosaedro
 * truncado de verdade (12 pentágonos + 20 hexágonos — o mesmo layout
 * de gomos de uma bola de futebol real), construído por matemática
 * pura, com cor por vértice (gomos pretos/brancos) em vez de textura.
 *
 * Adaptado do arquivo PSXSoccerBall.js enviado pelo usuário: mesma
 * matemática de construção da malha, reescrita no formato
 * "window.XFactory" (script clássico, sem import/export) já usado por
 * todo o resto do jogo, e usando o THREE global carregado via
 * <script> em index.html (r128 — ver index.html) em vez de receber
 * THREE por parâmetro, como o arquivo original permitia. Nenhuma
 * malha/matemática de construção da esfera foi alterada.
 *
 * Material: MeshLambertMaterial padrão (iluminado pelas luzes reais da
 * cena) com o "wobble"/banding da PSX aplicados por cima via
 * onBeforeCompile — NÃO o ShaderMaterial dedicado com luz própria do
 * arquivo original do usuário, que fazia a bola ignorar a iluminação
 * do quarto (ver comentário em buildMaterial/applyPSXBallShader mais
 * abaixo).
 *
 * Peça DINÂMICA, não uma peça de mobília comum: só a malha/visual
 * nascem aqui — a física (posição, velocidade, empurrão do jogador,
 * rebote contra parede/móvel) é toda de scripts/ball-controller.js,
 * chamada por scenes/room-scene.js. Ver comentário no topo daqueles
 * dois arquivos para o resto do comportamento.
 *
 * Convenção de espaço local: o grupo devolvido por createSoccerBall()
 * já nasce com a origem exatamente no CENTRO da esfera (não na base,
 * ao contrário da lata de lixo/vaso de planta) — é o formato mais
 * conveniente para a física em scripts/ball-controller.js, que
 * trabalha com o centro da bola o tempo todo. Quem posiciona (mesmo
 * ball-controller.js) é responsável por somar `radius` no Y para a
 * base encostar no chão.
 * -------------------------------------------------
 */

window.SoccerBallFactory = (function () {
  // ---------- Vetores 3D simples (arrays [x,y,z]) ----------
  // Só para o cálculo geométrico único (não por quadro) da malha —
  // sem depender de THREE.Vector3 aqui.
  function vNormalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / len, v[1] / len, v[2] / len];
  }
  function vSub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function vAdd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function vScale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function vDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function vCross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }
  function vLerp(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  // PRNG determinística (mulberry32): o mesmo `seed` sempre gera o
  // mesmo padrão de manchas/desgaste nos gomos.
  function makeRng(seed) {
    let a = seed >>> 0 || 1;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Icosaedro truncado: 12 pentágonos (um por vértice original) + 20
  // hexágonos (um por face triangular original) — o mesmo layout de
  // gomos de uma bola de futebol de verdade.
  function buildPanels(radius) {
    const t = (1 + Math.sqrt(5)) / 2;
    const baseVerts = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ].map(vNormalize);

    const baseFaces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];

    const neighborSet = [];
    for (let i = 0; i < 12; i++) {
      neighborSet.push(new Set());
    }
    baseFaces.forEach(function (face) {
      const a = face[0], b = face[1], c = face[2];
      neighborSet[a].add(b); neighborSet[a].add(c);
      neighborSet[b].add(a); neighborSet[b].add(c);
      neighborSet[c].add(a); neighborSet[c].add(b);
    });

    const truncMap = new Map();
    function truncPoint(v, n) {
      const key = v + '_' + n;
      let p = truncMap.get(key);
      if (!p) {
        p = vScale(vNormalize(vLerp(baseVerts[v], baseVerts[n], 1 / 3)), radius);
        truncMap.set(key, p);
      }
      return p;
    }

    // Pentágonos: um por vértice original, pontos ordenados por ângulo
    // ao redor da normal (pra fechar o polígono sem "cruzar" as bordas).
    const pentagons = [];
    for (let v = 0; v < 12; v++) {
      const normal = baseVerts[v];
      const up = Math.abs(normal[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
      const tangent = vNormalize(vCross(up, normal));
      const bitangent = vCross(normal, tangent);
      const pts = Array.from(neighborSet[v]).map(function (n) {
        const p = truncPoint(v, n);
        const rel = vSub(p, vScale(normal, vDot(p, normal)));
        return { p: p, angle: Math.atan2(vDot(rel, bitangent), vDot(rel, tangent)) };
      });
      pts.sort(function (a, b) { return a.angle - b.angle; });
      pentagons.push(pts.map(function (o) { return o.p; }));
    }

    // Hexágonos: um por face triangular original.
    const hexagons = baseFaces.map(function (face) {
      const x = face[0], y = face[1], z = face[2];
      return [
        truncPoint(x, y), truncPoint(y, x),
        truncPoint(y, z), truncPoint(z, y),
        truncPoint(z, x), truncPoint(x, z),
      ];
    });

    return { pentagons: pentagons, hexagons: hexagons };
  }

  function faceCentroid(pts) {
    let c = [0, 0, 0];
    pts.forEach(function (p) { c = vAdd(c, p); });
    return vScale(c, 1 / pts.length);
  }

  // Malha não-indexada, com cor por vértice (gomos pretos/brancos) e
  // um leve "sujeira"/desgaste aleatório por gomo (`scuffAmount`).
  function buildGeometry(radius, options) {
    const pentagonColor = options.pentagonColor;
    const hexagonColor = options.hexagonColor;
    const scuffAmount = options.scuffAmount;
    const rng = makeRng(options.seed);

    const panels = buildPanels(radius);
    const positions = [];
    const colors = [];

    function addPolygon(pts, baseColor) {
      const centroid = faceCentroid(pts);
      const n = vCross(vSub(pts[1], pts[0]), vSub(pts[2], pts[0]));
      const ordered = vDot(n, centroid) < 0 ? pts.slice().reverse() : pts;

      const scuff = 1 - rng() * scuffAmount;
      const r = baseColor[0] * scuff, g = baseColor[1] * scuff, b = baseColor[2] * scuff;

      for (let i = 1; i < ordered.length - 1; i++) {
        const tri = [ordered[0], ordered[i], ordered[i + 1]];
        tri.forEach(function (p) {
          positions.push(p[0], p[1], p[2]);
          colors.push(r, g, b);
        });
      }
    }

    panels.pentagons.forEach(function (p) { addPolygon(p, pentagonColor); });
    panels.hexagons.forEach(function (h) { addPolygon(h, hexagonColor); });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals(); // não-indexada -> normais planas por gomo
    geometry.computeBoundingSphere();

    return geometry;
  }

  // Material "PSX" construído sobre THREE.MeshLambertMaterial (luz de
  // verdade) em vez do ShaderMaterial antigo. O ShaderMaterial anterior
  // calculava a própria luz sozinho, a partir de um `uLightDir`/
  // `uAmbient` FIXOS (constantes, nunca atualizados) — ou seja, a bola
  // nunca enxergava as luzes reais da cena (luminária de mesa, abajur
  // do corredor, relâmpago pela janela, a AmbientLight escura do
  // quarto no escuro — ver scripts/main.js e models/lamp-factory.js/
  // table-lamp-factory.js/window-factory.js) e o `uAmbient` de 0.4
  // impunha um piso de brilho artificial que nunca escurecia por
  // completo: era esse o motivo dela parecer "brilhar no escuro", como
  // se emitisse luz própria. Trocando para MeshLambertMaterial, a bola
  // passa a ser iluminada pelo MESMO sistema de luzes do Three.js que
  // já ilumina todo o resto do quarto (paredes, móveis etc., todos em
  // MeshStandardMaterial — ver materials/material-library.js): clara
  // num ambiente bem iluminado, escura num ambiente escuro, sem emitir
  // luz própria.
  //
  // O "wobble" de vértice (quantização do espaço de clipe) e o banding
  // de cor quantizada continuam — só que agora aplicados via
  // onBeforeCompile sobre esse material padrão, a MESMA técnica já
  // usada no resto do jogo (ver applyPSXVertexSnap em
  // models/book-factory.js, models/ceiling-fan-factory.js e
  // models/floor-plant-factory.js) em vez de dentro de um shader
  // totalmente própria. A malha já nasce com normais chapadas por
  // gomo (buildGeometry acima usa vértices não-indexados +
  // computeVertexNormals), então o resultado visual do sombreamento
  // plano/Gouraud original é preservado mesmo com o motor de
  // iluminação padrão do Three.js.
  function applyPSXBallShader(material, jitter, colorLevels) {
    const jitterVal = (jitter || 0).toFixed(1);
    const levelsVal = (colorLevels || 0).toFixed(1);
    material.onBeforeCompile = function (shader) {
      // Mesmo "tremor" de baixa precisão da PS1: arredonda a posição
      // final do vértice pra uma grade de baixa resolução no espaço de
      // clipe, depois do #include <project_vertex> padrão já ter
      // calculado gl_Position normalmente.
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        [
          '#include <project_vertex>',
          'float psxJitter = ' + jitterVal + ';',
          'if (psxJitter > 0.0) {',
          '  gl_Position.xy = floor(gl_Position.xy / gl_Position.w * psxJitter) / psxJitter * gl_Position.w;',
          '}',
        ].join('\n')
      );
      // Banding de cor quantizada (emulando o color depth 15-bit do
      // PS1), aplicado sobre a cor JÁ iluminada pelas luzes reais da
      // cena (depois de todo o cálculo de luz do MeshLambertMaterial,
      // no mesmo ponto do pipeline usado por applyPSXShader em
      // models/book-factory.js).
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <fog_fragment>',
        [
          '#include <fog_fragment>',
          'float psxLevels = ' + levelsVal + ';',
          'if (psxLevels > 0.0) {',
          '  gl_FragColor.rgb = floor(gl_FragColor.rgb * psxLevels + 0.5) / psxLevels;',
          '}',
        ].join('\n')
      );
    };
    material.needsUpdate = true;
    return material;
  }

  function buildMaterial(options) {
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });
    return applyPSXBallShader(material, options.jitter, options.colorLevels);
  }

  // Linhas escuras nas costuras reais dos gomos (não nas diagonais
  // internas da triangulação — o threshold de ângulo filtra essas
  // automaticamente, já que cada gomo é quase plano).
  function buildSeamEdges(geometry, options) {
    const edges = new THREE.EdgesGeometry(geometry, options.seamThresholdDeg);
    const material = new THREE.LineBasicMaterial({
      color: options.seamColor,
      transparent: true,
      opacity: 0.85,
    });
    return new THREE.LineSegments(edges, material);
  }

  function createSoccerBall(materials, options) {
    const opts = Object.assign({
      radius: 0.12, // ~24cm de diâmetro, bem perto do tamanho real de uma bola de futebol
      pentagonColor: [0.05, 0.05, 0.055],
      hexagonColor: [0.93, 0.90, 0.83],
      scuffAmount: 0.18,
      seed: 4,
      jitter: 150, // densidade da grade de "wobble" — menor = mais tremido
      colorLevels: 24, // níveis de quantização de cor por canal
      seamColor: 0x141414,
      seamThresholdDeg: 15,
      showSeams: true,
    }, options);

    const geometry = buildGeometry(opts.radius, opts);
    const material = buildMaterial(opts);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'SoccerBallMesh';

    const group = new THREE.Group();
    group.name = 'SoccerBallPSX';
    group.add(mesh);

    if (opts.showSeams) {
      const seams = buildSeamEdges(geometry, opts);
      seams.name = 'SoccerBallSeams';
      group.add(seams);
    }

    // Contorno de destaque (mesma "casca inflada" de todo objeto
    // interativo do jogo — ver models/outline-factory.js e, como
    // referência mais próxima de um objeto 100% procedural como este,
    // models/switch-factory.js): é só por causa dele que o
    // InteractionSystem passa a reconhecer a bola sob a mira e mostrar
    // o prompt de "Interagir" (ver scripts/interaction-system.js) — a
    // física de pegar/soltar em si é toda de scripts/ball-controller.js,
    // que só usa este `outline` pronto, sem entender de contorno.
    // `seams` (LineSegments, sem volume) já é ignorado automaticamente
    // por OutlineFactory.build (só considera THREE.Mesh de verdade).
    const outline = window.OutlineFactory.build(group, materials.outline);
    group.add(outline);

    return {
      group: group,
      outline: outline,
      radius: opts.radius,
    };
  }

  return { createSoccerBall: createSoccerBall };
})();
