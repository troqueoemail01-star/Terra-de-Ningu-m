/**
 * models/road-loop-factory.js
 * -------------------------------------------------
 * A ESTRADA DE TERRA em looping infinito da cutscene de abertura (ver
 * cutscenes/road-cutscene.js): pista de terra batida, floresta fechada
 * nas duas margens, grama, arbustos, samambaias, postes marcadores,
 * pedras soltas e tufos de nevoa entre os troncos.
 *
 * Modelos (os dois em assets/models/, carregados pelo MESMO
 * THREE.GLTFLoader de todos os outros modelos importados do jogo -
 * nenhum sistema novo de importacao entrou aqui):
 *
 *   estrada_terra_psx.glb .. o pacote da estrada. Traz NOVE pecas num
 *                            arquivo so: Estrada_Segmento (a pista, um
 *                            trecho de 16 m feito para repetir),
 *                            Samambaia, Arbusto, Grama, Palmeira_Peq,
 *                            Poste_Marcador, Pedra_A, Pedra_B e
 *                            Neblina_Puff. Texturas ja embutidas.
 *   arvores_psx.glb ........ os pinheiros. E EXATAMENTE o mesmo arquivo
 *                            que a floresta vista pelas janelas da casa
 *                            ja usa (ver models/tree-forest-factory.js):
 *                            um asset so, dois lugares, byte a byte o
 *                            mesmo .glb - nao foi duplicado.
 *
 * ---------- Como o "infinito" funciona ----------
 * Nada se move, e nada e criado ou destruido durante a cutscene: o que
 * anda e a CAMERA (o carro, ver models/car-interior-factory.js),
 * sempre no sentido -Z. O mundo montado aqui tem PERIOD metros de
 * comprimento e e desenhado para dar a volta em si mesmo:
 *
 *   - a pista e o MESMO segmento de 16 m clonado em Z. O ruido de
 *     altura do modelo tem periodo exato de 16 m, entao as bordas casam
 *     sem emenda nenhuma.
 *   - todo o povoamento (arvores, mato, postes, pedras, nevoa) e
 *     sorteado uma vez dentro do trecho [-PERIOD, 0) e DUPLICADO nas
 *     duas pontas (ver `emit`), cobrindo os VIEW metros que a camera
 *     alcanca. Assim, quando a cutscene devolve o carro para o inicio
 *     do trecho (ver o `travel` de road-cutscene.js), o salto acontece
 *     no meio de um pedaco de mata identico ao que estava na tela - e
 *     nao aparece.
 *
 * Resultado: o carro pode rodar por 30 segundos ou por 10 minutos (o
 * jogador decide, lendo o dialogo no ritmo dele ou pulando tudo) sem
 * nenhuma emenda visivel e com custo de memoria fixo.
 *
 * ---------- Desempenho (o jogo e mobile) ----------
 *  1. THREE.InstancedMesh para todo o povoamento, agrupado em blocos de
 *     64 m: sao ~1.500 objetos espalhados desenhados em poucas dezenas
 *     de draw calls, nao 1.500 objetos independentes. Mesma escolha da
 *     grama e da floresta das janelas.
 *  2. Cada bloco (e cada segmento da pista) sabe em que faixa de Z ele
 *     vive e e LIGADO/DESLIGADO por `update(cameraZ)`, a cada quadro,
 *     conforme entra ou sai do alcance da nevoa. Nao da para usar o
 *     frustum culling do three.js aqui: ele mede a caixa da GEOMETRIA
 *     de uma instancia so, que num InstancedMesh nao diz nada sobre
 *     onde as copias estao. Uma comparacao de dois numeros por bloco
 *     resolve, e e exata.
 *  3. Materiais MeshLambert (nao Standard) com as tres tecnicas PSX
 *     injetadas - ver materials/psx-cutscene-material.js.
 *
 * ---------- O terreno em formula ----------
 * As funcoes roadY/shoulderY/groundY abaixo sao a MESMA conta que gerou
 * a malha do .glb, e servem para uma coisa so: saber a altura do chao
 * num ponto qualquer sem precisar de raycast. E dai que sai a altura do
 * carro (ele sobe e desce de verdade com o abaulamento e os sulcos da
 * pista, em vez de flutuar numa linha reta).
 *
 * window.RoadLoopFactory.build(scene, onReady) -> { update, dispose }
 * -------------------------------------------------
 */

window.RoadLoopFactory = (function () {
  const ROAD_URL = "assets/models/estrada_terra_psx.glb";
  const TREES_URL = "assets/models/arvores_psx.glb";

  // Medidas do pacote da estrada (LEIA-ME do modelo): segmento de 16 m
  // no eixo Z, pista de 6,8 m de largura (3,4 m para cada lado do eixo)
  // e solo de floresta ate 30 m de cada lado.
  const SEGMENT = 16;
  const ROAD_HALF_WIDTH = 3.4;

  // Comprimento do trecho que da a volta em si mesmo, e quanto dele a
  // camera enxerga (o suficiente para cobrir a nevoa mais aberta).
  const PERIOD = 176;
  const VIEW = 64;

  // Tamanho do bloco de instancias e a janela de visibilidade usada por
  // update() - "a frente" e -Z, "atras" e +Z.
  const CHUNK = 64;
  const DRAW_AHEAD = 76;
  const DRAW_BEHIND = 16;

  // Semente fixa do sorteio: a mata fica IDENTICA em toda partida (e
  // identica ao preview do pacote), como na grama e na floresta das
  // janelas. Nada de Math.random.
  const SCATTER_SEED = 20260817;

  const TAU = Math.PI * 2;

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  // mulberry32 - o mesmo PRNG dos outros povoamentos do jogo.
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- O terreno em formula (espelha o .glb) ----------
  const K = TAU / SEGMENT;

  function gauss(x, c, s) {
    const d = x - c;
    return Math.exp(-(d * d) / (2 * s * s));
  }

  function bump(x, z) {
    return (
      0.03 * Math.sin(K * z + 0.35 * x) +
      0.02 * Math.sin(3 * K * z - 0.55 * x + 1.1) +
      0.012 * Math.sin(5 * K * z + 0.95 * x + 2.2) +
      0.017 * Math.sin(0.7 * x + 2 * K * z + 0.4) +
      0.008 * Math.sin(1.9 * x + 4 * K * z + 2.7)
    );
  }

  // Altura da terra batida: abaulamento central + os quatro sulcos de
  // pneu + o ruido fino.
  function roadY(x, z) {
    const t = clamp(x / ROAD_HALF_WIDTH, -1, 1);
    return (
      0.1 * (1 - t * t) -
      (0.06 * gauss(x, 0.85, 0.3) +
        0.06 * gauss(x, -0.85, 0.3) +
        0.048 * gauss(x, 2.3, 0.28) +
        0.048 * gauss(x, -2.3, 0.28)) +
      bump(x, zLocal(z))
    );
  }

  const AX = [3.4, 3.62, 3.85, 4.1, 4.38, 4.7, 5.1, 5.7, 6.6, 7.8, 9.6, 12.0, 16.0, 22.0, 30.0];
  const BY = [0.0, 0.17, 0.4, 0.545, 0.515, 0.4, 0.325, 0.3, 0.295, 0.315, 0.35, 0.4, 0.47, 0.55, 0.66];
  const NA = [0.0, 0.018, 0.032, 0.048, 0.05, 0.046, 0.05, 0.06, 0.072, 0.09, 0.11, 0.145, 0.185, 0.225, 0.27];

  function shoulderY(ax, z, side) {
    const ph = side > 0 ? 0.0 : 2.3;
    let i = 0;
    while (i < AX.length - 2 && ax > AX[i + 1]) {
      i++;
    }
    const t = clamp((ax - AX[i]) / (AX[i + 1] - AX[i]), 0, 1);
    const by = BY[i] + (BY[i + 1] - BY[i]) * t;
    const na = NA[i] + (NA[i + 1] - NA[i]) * t;
    const n =
      0.55 * Math.sin(K * z + 0.8 * ax + ph) +
      0.3 * Math.sin(3 * K * z - 0.5 * ax + ph * 1.7) +
      0.15 * Math.sin(5 * K * z + 1.7 * ax + ph * 0.6) +
      0.35 * Math.sin(2 * K * z + 2.9 * ax + ph * 2.2);
    let y = by + na * n;
    if (ax > 3.6 && ax < 4.9) {
      y += 0.055 * Math.sin(2 * K * z + ph * 1.3) + 0.03 * Math.sin(5 * K * z + ph);
    }
    return y;
  }

  // Z dentro do segmento de 16 m (o modelo se repete nele).
  function zLocal(z) {
    return ((z % SEGMENT) + SEGMENT) % SEGMENT;
  }

  function groundY(x, z) {
    const zl = zLocal(z);
    const ax = Math.abs(x);
    if (ax <= ROAD_HALF_WIDTH) {
      return roadY(x, zl);
    }
    return shoulderY(Math.min(ax, 30), zl, x > 0 ? 1 : -1);
  }

  // ---------- Carregamento (uma vez, com fila) ----------
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo tratamento de textura dos outros modelos importados (ver
  // normalizeTexture em models/tree-forest-factory.js): nearest e sem
  // mipmap para o pixel cru do PSX, encoding linear como todo o resto
  // do jogo. wrapS/wrapT ficam como vieram do arquivo (REPEAT).
  function normalizeTexture(map) {
    if (!map) {
      return;
    }
    map.magFilter = THREE.NearestFilter;
    map.minFilter = THREE.NearestFilter;
    map.generateMipmaps = false;
    map.encoding = THREE.LinearEncoding;
    map.needsUpdate = true;
  }

  // COLOR_0 chega como VEC4 nestes modelos. O three.js r128 declara a
  // cor de vertice como vec3, entao o canal alpha (sempre 1 aqui) e
  // descartado na entrada, em vez de contar com a tolerancia do driver.
  function dropColorAlpha(geometry) {
    const color = geometry.attributes.color;
    if (!color || color.itemSize !== 4) {
      return;
    }
    const rgb = new Float32Array(color.count * 3);
    for (let i = 0; i < color.count; i++) {
      rgb[i * 3] = color.getX(i);
      rgb[i * 3 + 1] = color.getY(i);
      rgb[i * 3 + 2] = color.getZ(i);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(rgb, 3));
  }

  // Achata a hierarquia do .glb: nome do no -> lista de pecas
  // { geometry, material } com as matrizes ja assadas na geometria.
  // Assim cada peca pode ser instanciada em qualquer lugar sem arrastar
  // o no pai dela.
  function collectParts(gltf, knownNames) {
    const parts = {};
    const materialCache = new Map();

    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(function (child) {
      if (!child.isMesh) {
        return;
      }

      // Malhas com mais de uma primitiva viram varios Mesh filhos de um
      // Group com o nome do no - por isso a busca sobe pelos pais.
      let key = child.name;
      let node = child;
      while (node) {
        if (knownNames.indexOf(node.name) !== -1) {
          key = node.name;
          break;
        }
        node = node.parent;
      }

      const geometry = child.geometry.clone();
      geometry.applyMatrix4(child.matrixWorld);
      dropColorAlpha(geometry);
      if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
      }
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      const source = child.material;
      if (!materialCache.has(source.uuid)) {
        normalizeTexture(source.map);
        materialCache.set(source.uuid, window.PSXCutsceneMaterial.fromStandard(source));
      }

      if (!parts[key]) {
        parts[key] = [];
      }
      parts[key].push({ geometry: geometry, material: materialCache.get(source.uuid) });
    });

    return parts;
  }

  // As arvores vem centradas em torno da propria origem, cada uma com
  // uma altura nativa diferente. Aqui elas passam para a mesma
  // convencao da floresta das janelas: centro em X/Z, base em Y = 0 -
  // e a altura nativa fica guardada, para a escala de cada instancia
  // poder ser pedida em METROS.
  function prepareTrees(parts) {
    const kinds = [];
    Object.keys(parts).forEach(function (name) {
      if (!/Tree|Pine/i.test(name)) {
        return;
      }
      parts[name].forEach(function (part) {
        const geometry = part.geometry;
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        geometry.translate(
          -(box.min.x + box.max.x) / 2,
          -box.min.y,
          -(box.min.z + box.max.z) / 2
        );
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        kinds.push({
          geometry: geometry,
          material: part.material,
          height: geometry.boundingBox.max.y || 1,
        });
      });
    });
    return kinds;
  }

  let assets = null;
  let loading = false;
  const waiting = [];

  function whenReady(callback) {
    if (assets) {
      callback(assets);
      return;
    }
    waiting.push(callback);
    if (loading) {
      return;
    }
    loading = true;

    const loader = getLoader();
    let road = null;
    let trees = null;

    function finishIfDone() {
      if (!road || !trees) {
        return;
      }
      assets = { road: road, trees: trees };
      while (waiting.length) {
        waiting.shift()(assets);
      }
    }

    loader.load(
      ROAD_URL,
      function (gltf) {
        road = collectParts(gltf, [
          "Estrada_Segmento",
          "Samambaia",
          "Arbusto",
          "Grama",
          "Palmeira_Peq",
          "Poste_Marcador",
          "Pedra_A",
          "Pedra_B",
          "Neblina_Puff",
        ]);

        // O tufo de neblina e a UNICA peca semitransparente e gigante da
        // cutscene, e por isso a unica que nao aguenta as tres tecnicas
        // PSX (elas rasgavam o cartao em pedacos de borda reta e faziam a
        // borda piscar). Aqui ele e marcado como VOLUME pelo nome do no:
        // a marcacao acontece ANTES do primeiro quadro, que e quando o
        // shader compila. Ver materials/psx-cutscene-material.js.
        (road["Neblina_Puff"] || []).forEach(function (part) {
          window.PSXCutsceneMaterial.markAsVolume(part.material);
        });

        finishIfDone();
      },
      undefined,
      function (error) {
        console.error("RoadLoopFactory: falha ao carregar " + ROAD_URL, error);
      }
    );

    loader.load(
      TREES_URL,
      function (gltf) {
        trees = prepareTrees(collectParts(gltf, []));
        finishIfDone();
      },
      undefined,
      function (error) {
        console.error("RoadLoopFactory: falha ao carregar " + TREES_URL, error);
      }
    );
  }

  // ---------- Montagem do mundo ----------
  function assemble(scene, assetSet) {
    const root = new THREE.Group();
    root.name = "CutsceneEstrada";
    scene.add(root);

    // Tudo o que update() liga e desliga por faixa de Z.
    const zoned = [];

    function addZoned(object, zMin, zMax) {
      object.matrixAutoUpdate = false;
      object.updateMatrix();
      // O frustum culling do three.js nao serve para InstancedMesh (ver
      // o bloco de desempenho no topo): quem decide e a faixa de Z.
      object.frustumCulled = false;
      root.add(object);
      zoned.push({ object: object, zMin: zMin, zMax: zMax });
    }

    // ---------- A pista ----------
    const segmentParts = assetSet.road["Estrada_Segmento"] || [];
    const firstSegment = -Math.ceil(VIEW / SEGMENT);
    const lastSegment = Math.ceil((PERIOD + VIEW) / SEGMENT);
    for (let i = firstSegment; i <= lastSegment; i++) {
      const z = -i * SEGMENT;
      segmentParts.forEach(function (part) {
        const mesh = new THREE.Mesh(part.geometry, part.material);
        mesh.position.z = z;
        addZoned(mesh, z, z + SEGMENT);
      });
    }

    // ---------- Povoamento ----------
    const R = rng(SCATTER_SEED);
    const buckets = new Map();
    const tmpPosition = new THREE.Vector3();
    const tmpEuler = new THREE.Euler();
    const tmpQuaternion = new THREE.Quaternion();
    const tmpScale = new THREE.Vector3();
    let assetKeys = 0;

    function place(asset, x, y, z, rotY, sx, sy, sz, tiltX, tiltZ) {
      tmpPosition.set(x, y, z);
      tmpEuler.set(tiltX || 0, rotY || 0, tiltZ || 0, "YXZ");
      tmpQuaternion.setFromEuler(tmpEuler);
      tmpScale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);

      if (!asset.key) {
        asset.key = "a" + assetKeys++;
      }
      const key = asset.key + "#" + Math.floor(z / CHUNK);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { asset: asset, matrices: [], zMin: z, zMax: z };
        buckets.set(key, bucket);
      }
      bucket.matrices.push(new THREE.Matrix4().compose(tmpPosition, tmpQuaternion, tmpScale));
      bucket.zMin = Math.min(bucket.zMin, z);
      bucket.zMax = Math.max(bucket.zMax, z);
    }

    // Duplica nas pontas o que estiver perto delas: e o que esconde a
    // volta do loop (ver o topo do arquivo).
    function emit(x, z, callback) {
      callback(x, z);
      if (z > -VIEW - 4) {
        callback(x, z - PERIOD);
      }
      if (z < -PERIOD + VIEW + 4) {
        callback(x, z + PERIOD);
      }
    }

    // Floresta fechada dos dois lados.
    const kinds = assetSet.trees;
    if (kinds.length) {
      [1, -1].forEach(function (side) {
        let z = -R() * 2;
        while (z > -PERIOD) {
          z -= 1.15 + R() * 1.5;
          const kind = kinds[(R() * kinds.length) | 0];
          const near = R();
          const ax = 5.0 + Math.pow(near, 0.72) * 29;
          const x = side * (ax + (R() - 0.5) * 1.6);
          const height = 8.5 + Math.pow(R(), 1.45) * 15.5;
          const s = height / kind.height;
          const thin = s * (0.52 + R() * 0.34);
          const rot = R() * TAU;
          const tilt = (R() - 0.5) * 0.05;
          emit(x, z, function (xx, zz) {
            place(kind, xx, groundY(xx, zz) - 0.22, zz, rot, thin, s, thin, tilt, tilt * 0.7);
          });
        }
      });
    }

    // Arbustos, samambaias e palmeirinhas na beira.
    const bushes = [
      assetSet.road["Samambaia"][0],
      assetSet.road["Arbusto"][0],
      assetSet.road["Palmeira_Peq"][0],
    ];
    [1, -1].forEach(function (side) {
      let z = -R() * 2;
      while (z > -PERIOD) {
        z -= 0.75 + R() * 1.3;
        const bush = bushes[(R() * bushes.length) | 0];
        const ax = 3.75 + Math.pow(R(), 0.8) * 13;
        const x = side * ax;
        const s = 0.62 + R() * 0.95;
        const rot = R() * TAU;
        emit(x, z, function (xx, zz) {
          place(bush, xx, groundY(xx, zz) - 0.09, zz, rot, s * (0.85 + R() * 0.3), s, s);
        });
      }
    });

    // Grama: tapete junto ao barranco.
    const grass = assetSet.road["Grama"][0];
    [1, -1].forEach(function (side) {
      let z = 0;
      while (z > -PERIOD) {
        z -= 0.28 + R() * 0.4;
        const ax = 3.5 + Math.pow(R(), 0.65) * 12;
        const x = side * ax;
        const s = 0.7 + R() * 0.85;
        const rot = R() * TAU;
        emit(x, z, function (xx, zz) {
          place(grass, xx, groundY(xx, zz) - 0.05, zz, rot, s, s * (0.8 + R() * 0.6), s);
        });
      }
    });

    // Postes marcadores no alto do barranco, a cada 8 m.
    const post = assetSet.road["Poste_Marcador"][0];
    [1, -1].forEach(function (side) {
      for (let z = -2; z > -PERIOD; z -= 8) {
        const x = side * (4.24 + (R() - 0.5) * 0.14);
        const rot = (R() - 0.5) * 0.5;
        const tilt = (R() - 0.5) * 0.09;
        emit(x, z, function (xx, zz) {
          place(post, xx, groundY(xx, zz) - 0.12, zz, rot, 1, 0.94 + R() * 0.16, 1, tilt, tilt);
        });
      }
    });

    // Pedras soltas na terra batida.
    const rocks = [assetSet.road["Pedra_A"][0], assetSet.road["Pedra_B"][0]];
    for (let z = 0; z > -PERIOD; z -= 2.6 + R() * 4) {
      const rock = rocks[(R() * rocks.length) | 0];
      // A pedra nasce SEMPRE fora da trilha do carro. Antes o sorteio era
      // (R() - 0.5) * 8.4, que cobria o eixo da estrada inteiro: como a
      // cabine tem 1 m para cada lado e o carro so deriva LATERAL_DRIFT
      // (0,22 m, ver cutscenes/road-cutscene.js), toda pedra sorteada perto
      // de x = 0 passava DENTRO do carro, atravessando o assoalho na frente
      // da camera. Agora ela cai numa das duas faixas laterais, de 2,05 m a
      // 4,3 m do eixo: ainda e terra batida (a pista tem 3,4 m de meia
      // largura) e a pedra ainda passa rente a janela, mas por fora do
      // casco. Pedra_A e a maior das duas (0,45 m de lado,
      // ate 0,92 m com a escala cheia deste sorteio), entao a folga no pior
      // caso e 2,05 - 0,22 (deriva) - 1,0 (meia largura da cabine com o
      // retrovisor) - 0,46 (meia pedra) = 0,37 m.
      const side = R() < 0.5 ? -1 : 1;
      const x = side * (2.05 + R() * 2.25);
      const s = 0.55 + R() * 1.5;
      const rot = R() * TAU;
      emit(x, z, function (xx, zz) {
        place(rock, xx, groundY(xx, zz) - 0.03, zz, rot, s, s * (0.7 + R() * 0.5), s);
      });
    }

    // Nevoa entre os troncos: cartoes cruzados, quase transparentes.
    //
    // O tufo e uma CRUZ de dois quads de lado s (o modelo e um cubo
    // unitario de 8 vertices), entao o alcance dele e s/2 em qualquer
    // direcao horizontal, contado do centro. Antes o centro era sorteado
    // a 5,5-29,5 m do eixo SEM olhar para o tamanho: um tufo de 25 m
    // largado a 5,5 m chegava a x = -7, ou seja, atravessava a pista
    // inteira e passava DENTRO da cabine, na frente da camera - o mesmo
    // erro que as pedras tinham (ver o bloco delas acima).
    //
    // Agora o tamanho vem PRIMEIRO e a distancia e medida pela BORDA, nao
    // pelo centro: a borda interna do tufo nasce a 4,6 m do eixo, no
    // minimo. A pista tem 3,4 m de meia largura, a cabine 1 m e a deriva
    // do carro e 0,22 m - sobram 1,2 m de folga para o casco e nada mais
    // atravessa o carro. A nevoa continua entre os troncos, que e onde
    // ela foi feita para estar, e a bruma sobre a pista continua vindo do
    // scene.fog (ver cutscenes/road-cutscene.js).
    const puff = assetSet.road["Neblina_Puff"][0];
    const PUFF_CLEARANCE = ROAD_HALF_WIDTH + 1.2;
    for (let z = 0; z > -PERIOD; z -= 3.2 + R() * 3.4) {
      [1, -1].forEach(function (side) {
        const s = 9 + R() * 16;
        const flat = 0.42 + R() * 0.3;
        const x = side * (PUFF_CLEARANCE + s * 0.5 + R() * 9);
        const y = 1.1 + R() * 3.4;
        const rot = R() * TAU;
        // rot e flat ficam FORA do emit de proposito: as copias das duas
        // pontas do trecho precisam ser IDENTICAS a original, senao a
        // volta do loop muda a nevoa de lugar e a emenda aparece.
        emit(x, z, function (xx, zz) {
          place(puff, xx, y, zz, rot, s, s * flat, s);
        });
      });
    }

    // ---------- Materializa as instancias ----------
    let instances = 0;
    buckets.forEach(function (bucket) {
      const mesh = new THREE.InstancedMesh(
        bucket.asset.geometry,
        bucket.asset.material,
        bucket.matrices.length
      );
      for (let i = 0; i < bucket.matrices.length; i++) {
        mesh.setMatrixAt(i, bucket.matrices[i]);
      }
      mesh.instanceMatrix.needsUpdate = true;
      instances += bucket.matrices.length;
      // Margem generosa: a peca mais larga do povoamento (os tufos de
      // nevoa) chega a 25 m de lado, entao a faixa de Z do bloco cresce
      // um pouco para nenhum tufo piscar ao entrar na tela.
      addZoned(mesh, bucket.zMin - 26, bucket.zMax + 26);
    });
    buckets.clear();

    // ---------- Visibilidade por faixa de Z ----------
    function update(cameraZ) {
      const ahead = cameraZ - DRAW_AHEAD;
      const behind = cameraZ + DRAW_BEHIND;
      for (let i = 0; i < zoned.length; i++) {
        const item = zoned[i];
        item.object.visible = item.zMax >= ahead && item.zMin <= behind;
      }
    }

    function dispose() {
      root.traverse(function (child) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (child.material.map) {
            child.material.map.dispose();
          }
          child.material.dispose();
        }
      });
      if (root.parent) {
        root.parent.remove(root);
      }
      zoned.length = 0;
      // A cutscene toca uma vez por partida: depois dela, guardar as
      // geometrias em cache seria peso morto na memoria do celular
      // durante a gameplay inteira.
      assets = null;
      loading = false;
    }

    return {
      root: root,
      update: update,
      dispose: dispose,
      instanceCount: instances,
    };
  }

  // Monta o mundo assim que os dois .glb chegarem. Devolve um objeto
  // "vazio mas seguro" na hora, para quem chamou poder ja rodar o loop
  // de render sem esperar (a tela esta preta nesse momento, ver o
  // fade-in em cutscenes/road-cutscene.js).
  function build(scene, onReady) {
    const handle = {
      ready: false,
      update: function () {},
      dispose: function () {},
    };

    whenReady(function (assetSet) {
      const world = assemble(scene, assetSet);
      handle.ready = true;
      handle.update = world.update;
      handle.dispose = world.dispose;
      handle.root = world.root;
      if (onReady) {
        onReady(handle);
      }
    });

    return handle;
  }

  return {
    build: build,
    roadY: roadY,
    groundY: groundY,
    zLocal: zLocal,
    SEGMENT: SEGMENT,
    PERIOD: PERIOD,
    ROAD_HALF_WIDTH: ROAD_HALF_WIDTH,
  };
})();
