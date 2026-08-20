/**
 * models/flower-bed-factory.js
 * -------------------------------------------------
 * OS CANTEIROS DE FLORES DO QUINTAL DA FRENTE. Pedido do jogador sobre a
 * imagem de referencia: os dois pedacos de grama que sobram fechados de
 * cada lado da varanda (entre o muro e as paredes da casa) cheios de
 * rosas e flores DE TODAS AS CORES.
 *
 * Os dois retangulos NAO estao escritos na mao aqui: chegam de
 * `PorchFactory.plan().yards` (ver o bloco "Os dois QUINTAIS da frente"
 * em models/porch-factory.js), que os deriva do muro e das paredes das
 * alas. Mexer na planta da casa, na profundidade da varanda ou na
 * espessura do muro move o canteiro junto - a mesma regra do resto da
 * fachada.
 *
 * ---------- Custo de desenho: UMA malha ----------
 * Mesma filosofia do telhado e da varanda (ver createBuilder em
 * models/porch-factory.js), e nao a do gramado: flor nenhuma se move,
 * nenhuma e interativa e nenhuma precisa de matriz propria, entao nao
 * ha motivo para InstancedMesh nem para uma malha por especie. As ~240
 * flores dos dois canteiros sao ASSADAS numa unica BufferGeometry, ja
 * nas coordenadas do mundo: 1 draw call, ~13 mil triangulos, zero custo
 * por quadro.
 *
 * E e essa escolha que resolve o "de todas as cores" de graca. Com
 * instancias, cor por flor exigiria uma malha por cor (ou instanceColor,
 * que o material padrao do jogo nao usa em nenhum outro lugar). Assadas,
 * a cor de cada petala e so uma questao de UV: existe uma PALETA de
 * 32x32 pixels (ver createPaletteTexture) com uma celula por cor, e cada
 * peca da flor tem a UV apontada para a celula que ela vai usar. Uma
 * textura, um material, todas as cores.
 *
 * ---------- Estilo PSX ----------
 *  - Poligonagem baixa de proposito, na mesma receita do resto do jogo
 *    (ver VaseFactory/PottedPlantFactory): botao de rosa = icosaedro sem
 *    subdivisao, petala = um losango de DOIS triangulos, caule =
 *    cilindro de 4 lados.
 *  - Paleta de 32x32 com NearestFilter e sem mipmap: cor "crua",
 *    ligeiramente suja dentro de cada celula (nao e cor chapada - cada
 *    celula tem grao e um canto mais escuro), do mesmo jeito que todas as
 *    texturas de materials/textures.js.
 *  - SEM o wobble de vertice do PS1, igual a todas as outras camadas do
 *    lado de fora (chao, gramado, mata, estrada): o snapping trabalha em
 *    espaco de tela e abre fendas piscando entre pecas vizinhas rasantes
 *    - ver "Por que nao ha wobble PSX aqui" em
 *    models/dirt-path-factory.js.
 *
 * ---------- Noite e dia ----------
 * Contrato de sempre de tudo que vive do lado de fora
 * (`setDaytime`/`setMorning`, ver createGroundPlane em
 * models/exterior-factory.js): a cena empurra o canteiro na lista
 * `exteriorGrounds` e ele amanhece junto com a grama, a estrada, a mata,
 * a fachada e a varanda, trocando material por malha - sem recriar
 * geometria nenhuma. De noite MeshStandardMaterial sem emissive (flor
 * nenhuma brilha no escuro: escurece com o resto); de dia
 * MeshBasicMaterial chapado com fog, obrigatoriamente, porque o chao e o
 * gramado embaixo dela tambem viram material chapado de manha.
 *
 * ---------- Nada de flor dentro da casa, do muro ou da varanda ----------
 * Garantido pela distribuicao, nao por tentativa e erro: o sorteio
 * acontece SO dentro dos retangulos de quintal, com uma folga
 * (`margin`) descontada de todos os lados, e cada flor ainda tem o
 * proprio raio somado nessa conta. Uma flor que nasceria encostada no
 * muro, na laje da varanda ou na parede da ala simplesmente nao e
 * sorteada, em vez de ser removida depois - a mesma filosofia do
 * gramado, da mata e do caminho de terra.
 * -------------------------------------------------
 */

window.FlowerBedFactory = (function () {
  // ---------------------------------------------------------------
  // A PALETA (a textura)
  // ---------------------------------------------------------------
  // Grade de 4x4 celulas de 8x8 pixels num canvas de 32x32. Cada celula
  // e uma cor, e as UVs de cada peca da flor caem DENTRO de uma celula
  // (com 1 pixel de recuo em volta, para nem com filtro nearest existir
  // chance de vazar a cor da vizinha).
  const CELL = 8;
  const COLS = 5;
  const ROWS = 4;
  const ATLAS_W = CELL * COLS; // 40
  const ATLAS_H = CELL * ROWS; // 32

  // Onde cada coisa mora na paleta: [coluna, linha].
  // As OITO cores de flor sao o "de todas as cores" do pedido -
  // vermelho, branco, amarelo, rosa, roxo, laranja, azul e vinho.
  const PETAL_CELLS = [
    [0, 0], // vermelho de rosa
    [1, 0], // branco creme
    [2, 0], // amarelo
    [3, 0], // rosa
    [4, 0], // roxo
    [0, 1], // laranja
    [1, 1], // azul arroxeado
    [2, 1], // vinho escuro
  ];
  // Versao escurecida da MESMA cor, para o botao da rosa e as petalas de
  // baixo: e o que da volume a flor sem depender de luz nenhuma (do lado
  // de fora, de noite, nao chega luz - ver "Noite e dia" no topo).
  const PETAL_DARK_CELLS = [
    [3, 1],
    [4, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [0, 3],
  ];
  // As tres celulas que nao sao flor.
  const STEM_CELL = [1, 3];
  const LEAF_CELL = [2, 3];
  const CORE_CELL = [3, 3];

  const PETAL_COLORS = [
    [172, 42, 46],
    [226, 219, 200],
    [222, 188, 74],
    [206, 116, 148],
    [124, 84, 158],
    [211, 116, 47],
    [104, 116, 184],
    [122, 32, 56],
  ];

  function paintCell(ctx, col, row, rgb, opts) {
    const options = opts || {};
    const x0 = col * CELL;
    const y0 = row * CELL;
    const shade = options.shade || 1;
    const base = [
      Math.round(rgb[0] * shade),
      Math.round(rgb[1] * shade),
      Math.round(rgb[2] * shade),
    ];
    ctx.fillStyle = "rgb(" + base[0] + "," + base[1] + "," + base[2] + ")";
    ctx.fillRect(x0, y0, CELL, CELL);

    // Grao: alguns pixels mais claros e mais escuros dentro da celula.
    // Sem isso a flor sai numa cor chapada, coisa que nenhuma textura
    // deste jogo e (ver materials/textures.js).
    for (let i = 0; i < 14; i++) {
      const px = x0 + 1 + Math.floor(Math.random() * (CELL - 2));
      const py = y0 + 1 + Math.floor(Math.random() * (CELL - 2));
      const d = Math.random() < 0.5 ? -26 : 20;
      ctx.fillStyle =
        "rgb(" +
        Math.max(0, Math.min(255, base[0] + d)) +
        "," +
        Math.max(0, Math.min(255, base[1] + d)) +
        "," +
        Math.max(0, Math.min(255, base[2] + d)) +
        ")";
      ctx.fillRect(px, py, 1, 1);
    }

    // Canto de baixo mais escuro: com a UV da petala indo da base para a
    // ponta, isso vira uma sombra na raiz dela.
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(x0 + 1, y0 + CELL - 3, CELL - 2, 2);
  }

  function createPaletteTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_W;
    canvas.height = ATLAS_H;
    const ctx = canvas.getContext("2d");

    PETAL_COLORS.forEach(function (rgb, i) {
      const cell = PETAL_CELLS[i];
      const dark = PETAL_DARK_CELLS[i];
      paintCell(ctx, cell[0], cell[1], rgb);
      paintCell(ctx, dark[0], dark[1], rgb, { shade: 0.62 });
    });

    // Caule, folha e o miolo das flores de campo (ver
    // STEM_CELL/LEAF_CELL/CORE_CELL).
    paintCell(ctx, STEM_CELL[0], STEM_CELL[1], [78, 96, 52]);
    paintCell(ctx, LEAF_CELL[0], LEAF_CELL[1], [64, 86, 46]);
    paintCell(ctx, CORE_CELL[0], CORE_CELL[1], [190, 156, 62]);

    const texture = new THREE.CanvasTexture(canvas);
    // Mesma receita de toda textura do jogo (ver toThreeTexture em
    // materials/textures.js): pixel cru, sem mipmap, sem filtragem.
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  // A textura e UMA para todos os canteiros do jogo (criada na primeira
  // vez que alguem pede um canteiro, nao no load do arquivo: assim este
  // .js continua podendo ser carregado antes de o canvas existir).
  let paletteTexture = null;
  function palette() {
    if (!paletteTexture) {
      paletteTexture = createPaletteTexture();
    }
    return paletteTexture;
  }

  // UV de um ponto (u, v) de uma peca, jogada DENTRO de uma celula da
  // paleta com 1 pixel de recuo em volta. A conta do V leva em conta que
  // o three.js vira a imagem do canvas (texture.flipY): a linha de baixo
  // da celula no canvas - a que recebe a sombra em paintCell - e a que
  // cai em v = 0, ou seja na BASE da petala.
  function cellUV(cell, u, v, out) {
    const col = cell[0];
    const row = cell[1];
    const uMin = (col * CELL + 1) / ATLAS_W;
    const uMax = ((col + 1) * CELL - 1) / ATLAS_W;
    const vMin = 1 - ((row + 1) * CELL - 1) / ATLAS_H;
    const vMax = 1 - (row * CELL + 1) / ATLAS_H;
    const cu = u < 0 ? 0 : u > 1 ? 1 : u;
    const cv = v < 0 ? 0 : v > 1 ? 1 : v;
    out[0] = uMin + (uMax - uMin) * cu;
    out[1] = vMin + (vMax - vMin) * cv;
  }

  // ---------------------------------------------------------------
  // O ACUMULADOR DE GEOMETRIA
  // ---------------------------------------------------------------
  // Gemeo dos de models/roof-factory.js e models/porch-factory.js: recebe
  // pecas prontas (uma geometria primitiva + a matriz que a poe no lugar
  // + a celula de cor) e devolve UMA BufferGeometry no fim. E ele que
  // transforma 240 flores em 1 draw call (ver "Custo de desenho" no
  // topo).
  function createBuilder() {
    const positions = [];
    const normals = [];
    const uvs = [];
    const uv = [0, 0];

    function addPart(source, matrix, cell) {
      // Sem indice: as pecas sao assadas e nunca mais mexidas, e um
      // buffer unico sem indice e o que deixa a concatenacao ser uma
      // copia direta. O custo de vertice repetido e irrelevante nesta
      // escala (uma flor tem menos de 60 triangulos).
      const geo = source.index ? source.toNonIndexed() : source.clone();
      geo.applyMatrix4(matrix);

      const pos = geo.attributes.position.array;
      const nor = geo.attributes.normal ? geo.attributes.normal.array : null;
      const src = geo.attributes.uv ? geo.attributes.uv.array : null;
      const count = geo.attributes.position.count;

      for (let i = 0; i < count; i++) {
        positions.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        if (nor) {
          normals.push(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]);
        } else {
          normals.push(0, 1, 0);
        }
        cellUV(cell, src ? src[i * 2] : 0.5, src ? src[i * 2 + 1] : 0.5, uv);
        uvs.push(uv[0], uv[1]);
      }

      geo.dispose();
    }

    function toGeometry() {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
      return geo;
    }

    return {
      addPart: addPart,
      toGeometry: toGeometry,
      isEmpty: function () {
        return positions.length === 0;
      },
      triangles: function () {
        return positions.length / 9;
      },
    };
  }

  // ---------------------------------------------------------------
  // AS PECAS PRIMITIVAS (criadas UMA vez, reaproveitadas por todas as
  // flores de todos os canteiros)
  // ---------------------------------------------------------------
  // Todas nascem em tamanho 1 e com a base em y = 0: quem coloca a peca
  // no lugar e a matriz, entao a mesma geometria serve para uma rosa
  // grande e para um botao minusculo.
  let parts = null;

  // A PETALA: um losango de dois triangulos - o menor desenho que ainda
  // le como petala (a ponta afinada e a barriga a 45% da altura). Um
  // retangulo leria como papel; uma petala curva custaria dez vezes
  // mais triangulos por flor.
  function createPetalGeometry() {
    const geo = new THREE.BufferGeometry();
    // (0,0) base -> (0.5, 0.45) barriga direita -> (0,1) ponta ->
    // (-0.5, 0.45) barriga esquerda
    const positions = new Float32Array([
      0, 0, 0, 0.5, 0.45, 0, 0, 1, 0,
      0, 0, 0, 0, 1, 0, -0.5, 0.45, 0,
    ]);
    const normals = new Float32Array([
      0, 0, 1, 0, 0, 1, 0, 0, 1,
      0, 0, 1, 0, 0, 1, 0, 0, 1,
    ]);
    // V = altura da petala: a base (v = 0) cai na linha escura da celula
    // da paleta, entao toda petala nasce com a raiz sombreada.
    const uvs = new Float32Array([
      0.5, 0, 1, 0.45, 0.5, 1,
      0.5, 0, 0.5, 1, 0, 0.45,
    ]);
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    return geo;
  }

  function ensureParts() {
    if (parts) {
      return parts;
    }
    parts = {
      petal: createPetalGeometry(),
      // Caule: cilindro de 4 lados, sem tampa - a de baixo fica na terra
      // e a de cima morre dentro da flor. Altura 1 e raio 1: a matriz
      // afina e estica.
      stem: new THREE.CylinderGeometry(0.75, 1, 1, 4, 1, true),
      // Botao da rosa: icosaedro SEM subdivisao, a mesma escolha (e o
      // mesmo motivo) do botao de rosa que o jogo ja tem em
      // models/vase-factory.js.
      bud: new THREE.IcosahedronGeometry(1, 0),
      // Miolo das flores de campo: disco de 6 lados.
      core: new THREE.CylinderGeometry(1, 1, 1, 6),
    };
    // O cilindro do three.js nasce centrado na origem; empurrar meia
    // altura para cima poe a base em y = 0, a convencao de todas as
    // pecas daqui.
    parts.stem.translate(0, 0.5, 0);
    parts.core.translate(0, 0.5, 0);
    return parts;
  }

  // ---------------------------------------------------------------
  // AS TRES ESPECIES
  // ---------------------------------------------------------------
  // Sorteio com semente propria (mulberry32 + hash do texto da semente),
  // a MESMA receita do gramado e da mata (ver models/grass-field-factory.js):
  // o canteiro fica identico a cada vez que a cena e remontada - o
  // jogador entra e sai do quarto varias vezes, ver
  // cutscenes/room-transition.js - e Math.random nunca entra nesta conta.
  function hashSeed(value) {
    const text = String(value === undefined ? "flores" : value);
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Objetos de conta reaproveitados (nada de alocar uma matriz por
  // petala: sao milhares delas).
  const scratch = {
    matrix: new THREE.Matrix4(),
    local: new THREE.Matrix4(),
    euler: new THREE.Euler(),
    quaternion: new THREE.Quaternion(),
    position: new THREE.Vector3(),
    scale: new THREE.Vector3(),
  };

  // Matriz de uma peca: primeiro ela e deitada/afinada no lugar dentro da
  // flor (T * Ry * Rx * S, na ordem "YXZ" - inclina e depois gira em
  // volta do caule) e o resultado entra no espaco da FLOR, que por sua
  // vez ja esta no espaco do mundo.
  function part(base, x, y, z, tiltX, spinY, sx, sy, sz) {
    scratch.euler.set(tiltX, spinY, 0, "YXZ");
    scratch.quaternion.setFromEuler(scratch.euler);
    scratch.position.set(x, y, z);
    scratch.scale.set(sx, sy, sz);
    scratch.local.compose(scratch.position, scratch.quaternion, scratch.scale);
    scratch.matrix.multiplyMatrices(base, scratch.local);
    return scratch.matrix;
  }

  const TAU = Math.PI * 2;

  // ---------- 1. A ROSA ----------
  // Caule com duas folhas, botao de icosaedro e duas coroas de petalas em
  // volta dele: cinco abertas por fora e tres mais fechadas por dentro.
  // ~48 triangulos.
  function addRose(builder, rng, base, color) {
    const p = parts;
    const height = 0.2 + rng() * 0.16;
    const budRadius = 0.038 + rng() * 0.018;
    // A petala e um pouco MAIS LARGA que comprida e sobe pouco inclinada:
    // e o que faz a coroa fechar em COPA em volta do botao (rosa) em vez
    // de abrir em estrela (que le como lirio, nao como rosa).
    const petalLen = budRadius * 1.75;
    const spin = rng() * TAU;

    builder.addPart(
      p.stem,
      part(base, 0, 0, 0, 0, spin, 0.014, height, 0.014),
      STEM_CELL
    );

    for (let i = 0; i < 3; i++) {
      const angle = spin + i * (2.1 + rng() * 0.8);
      builder.addPart(
        p.petal,
        part(
          base,
          0,
          height * (0.26 + i * 0.22),
          0,
          1.0 + rng() * 0.35,
          angle,
          0.085,
          0.15,
          1
        ),
        LEAF_CELL
      );
    }

    builder.addPart(
      p.bud,
      part(
        base,
        0,
        height + budRadius * 0.55,
        0,
        0,
        rng() * TAU,
        budRadius,
        budRadius * 1.15,
        budRadius
      ),
      PETAL_DARK_CELLS[color]
    );

    for (let i = 0; i < 5; i++) {
      const angle = spin + (i / 5) * TAU + (rng() - 0.5) * 0.35;
      const radius = budRadius * 0.55;
      builder.addPart(
        p.petal,
        part(
          base,
          Math.sin(angle) * radius,
          height + budRadius * 0.3,
          Math.cos(angle) * radius,
          0.55 + rng() * 0.3,
          angle,
          petalLen * 1.15,
          petalLen,
          1
        ),
        PETAL_CELLS[color]
      );
    }

    for (let i = 0; i < 3; i++) {
      const angle = spin + (i / 3) * TAU + 0.7;
      const radius = budRadius * 0.3;
      builder.addPart(
        p.petal,
        part(
          base,
          Math.sin(angle) * radius,
          height + budRadius * 0.85,
          Math.cos(angle) * radius,
          0.18 + rng() * 0.25,
          angle,
          petalLen * 0.85,
          petalLen * 0.75,
          1
        ),
        PETAL_CELLS[color]
      );
    }
  }

  // ---------- 2. A FLOR DE CAMPO ----------
  // Miolo de disco com 6 a 8 petalas quase deitadas em volta: a
  // margarida/bem-me-quer que nasce sozinha em qualquer quintal
  // abandonado. ~30 triangulos.
  function addWildFlower(builder, rng, base, color) {
    const p = parts;
    const height = 0.16 + rng() * 0.14;
    const coreRadius = 0.021 + rng() * 0.01;
    const petalLen = 0.05 + rng() * 0.035;
    const spin = rng() * TAU;
    const count = 6 + Math.floor(rng() * 3);

    builder.addPart(
      p.stem,
      part(base, 0, 0, 0, 0, spin, 0.008, height, 0.008),
      STEM_CELL
    );

    builder.addPart(
      p.petal,
      part(base, 0, height * 0.3, 0, 1.15 + rng() * 0.3, spin + 1.4, 0.05, 0.09, 1),
      LEAF_CELL
    );

    builder.addPart(
      p.core,
      part(base, 0, height, 0, 0, spin, coreRadius, 0.013, coreRadius),
      CORE_CELL
    );

    for (let i = 0; i < count; i++) {
      const angle = spin + (i / count) * TAU + (rng() - 0.5) * 0.2;
      const radius = coreRadius * 0.75;
      builder.addPart(
        p.petal,
        part(
          base,
          Math.sin(angle) * radius,
          height + 0.006,
          Math.cos(angle) * radius,
          // Quase deitada (perto de 90 graus do caule): e a diferenca
          // entre uma margarida e um botao fechado.
          1.15 + rng() * 0.3,
          angle,
          0.032,
          petalLen,
          1
        ),
        PETAL_CELLS[color]
      );
    }
  }

  // ---------- 3. O BOTAO FECHADO ----------
  // Quatro petalas quase em pe, encostadas umas nas outras: a flor que
  // ainda nao abriu. Entra so para o canteiro nao virar um catalogo de
  // duas formas repetidas. ~18 triangulos.
  function addClosedBud(builder, rng, base, color) {
    const p = parts;
    const height = 0.18 + rng() * 0.14;
    const petalLen = 0.06 + rng() * 0.025;
    const spin = rng() * TAU;

    builder.addPart(
      p.stem,
      part(base, 0, 0, 0, 0, spin, 0.009, height, 0.009),
      STEM_CELL
    );

    builder.addPart(
      p.petal,
      part(base, 0, height * 0.28, 0, 1.2 + rng() * 0.25, spin + 2.4, 0.045, 0.08, 1),
      LEAF_CELL
    );

    for (let i = 0; i < 4; i++) {
      const angle = spin + (i / 4) * TAU;
      const radius = 0.012;
      builder.addPart(
        p.petal,
        part(
          base,
          Math.sin(angle) * radius,
          height - 0.01,
          Math.cos(angle) * radius,
          0.16 + rng() * 0.14,
          angle,
          0.038,
          petalLen,
          1
        ),
        i % 2 === 0 ? PETAL_CELLS[color] : PETAL_DARK_CELLS[color]
      );
    }
  }

  const SPECIES = [addRose, addWildFlower, addClosedBud];

  // ---------------------------------------------------------------
  // A DISTRIBUICAO
  // ---------------------------------------------------------------
  // Grade "chacoalhada" (jittered grid) dentro do retangulo do quintal,
  // com uma parte das celulas sorteada VAZIA: canteiro de verdade tem
  // falha, e uma grade cheia le como grade. Mesma ideia do gramado (ver
  // buildPlacements em models/grass-field-factory.js).
  const GROUND_SINK = 0.02; // enterra a base do caule na terra

  function hitsExclusion(exclusions, x, z, margin) {
    for (let i = 0; i < exclusions.length; i++) {
      const rect = exclusions[i];
      if (
        x > rect.minX - margin &&
        x < rect.maxX + margin &&
        z > rect.minZ - margin &&
        z < rect.maxZ + margin
      ) {
        return true;
      }
    }
    return false;
  }

  function buildPlacements(bed, opts, rng, exclusions) {
    const placements = [];
    // A folga descontada de todos os lados e o que mantem flor nenhuma
    // atravessando o muro, a laje da varanda ou a parede da ala (ver
    // "Nada de flor dentro da casa..." no topo).
    const minX = bed.minX + opts.margin;
    const maxX = bed.maxX - opts.margin;
    const minZ = bed.minZ + opts.margin;
    const maxZ = bed.maxZ - opts.margin;
    if (maxX <= minX || maxZ <= minZ) {
      return placements;
    }

    const cols = Math.max(1, Math.floor((maxX - minX) / opts.spacing));
    const rows = Math.max(1, Math.floor((maxZ - minZ) / opts.spacing));
    const stepX = (maxX - minX) / cols;
    const stepZ = (maxZ - minZ) / rows;

    for (let gx = 0; gx < cols; gx++) {
      for (let gz = 0; gz < rows; gz++) {
        if (rng() < opts.gaps) {
          continue;
        }
        const x = minX + (gx + 0.5) * stepX + (rng() - 0.5) * stepX * 0.75;
        const z = minZ + (gz + 0.5) * stepZ + (rng() - 0.5) * stepZ * 0.75;
        if (hitsExclusion(exclusions, x, z, 0.2)) {
          continue;
        }
        const roll = rng();
        placements.push({
          x: x,
          z: z,
          species: roll < 0.52 ? 0 : roll < 0.82 ? 1 : 2,
          // A COR: sorteada entre as oito da paleta, uma por flor. E daqui
          // que sai o "de todas as cores" do pedido.
          color: Math.floor(rng() * PETAL_CELLS.length) % PETAL_CELLS.length,
          spin: rng() * TAU,
          scale: 0.8 + rng() * 0.6,
        });
      }
    }

    return placements;
  }

  // ---------------------------------------------------------------
  // OS MATERIAIS
  // ---------------------------------------------------------------
  // Criados aqui dentro, e nao em materials/material-library.js, pelo
  // mesmo motivo do gramado e da mata (ver prepareAssets em
  // models/grass-field-factory.js): a textura e feita pela propria
  // fabrica, entao o material dela nao tem nada a decidir que a
  // biblioteca precise saber. Um par (noite/dia) para o jogo inteiro.
  //
  // DoubleSide: petala e folha sao casquinhas de um lado so; sem isso,
  // metade das flores desapareceria dependendo do angulo da camera - a
  // mesma escolha (e o mesmo motivo) do gramado.
  let materialPair = null;
  function materials() {
    if (!materialPair) {
      const map = palette();
      materialPair = {
        night: new THREE.MeshStandardMaterial({
          map: map,
          roughness: 1,
          metalness: 0,
          side: THREE.DoubleSide,
        }),
        day: new THREE.MeshBasicMaterial({
          map: map,
          // Levemente rebaixado, como todo material de dia do exterior
          // (ver grassDay/porchPlasterDay em
          // materials/material-library.js), mas menos que os outros: a
          // cor das petalas E o assunto da peca.
          color: 0xe9e3d6,
          side: THREE.DoubleSide,
          fog: true,
        }),
      };
    }
    return materialPair;
  }

  /**
   * Monta os canteiros.
   *
   * options:
   *   beds       - lista de retangulos do MUNDO {minX,maxX,minZ,maxZ}
   *                (o `yards` de PorchFactory.plan). Sem eles, nada e
   *                criado - nenhuma flor solta na origem da cena.
   *   seed       - texto estavel para o sorteio (padrao "canteiro-varanda")
   *   spacing    - lado da celula da grade, em metros (padrao 0.34)
   *   margin     - folga descontada das bordas do quintal (padrao 0.38)
   *   gaps       - fracao de celulas sorteadas vazias (padrao 0.14)
   *   exclusions - retangulos do MUNDO onde nao pode nascer flor
   *
   * Devolve o contrato de sempre do exterior: { group, setDaytime,
   *   setMorning } - mais `flowerCount`/`triangles`, para quem quiser
   *   medir. O grupo ja esta em coordenadas do MUNDO (a cena do corredor
   *   fica na origem, sem giro - ver scenes/house-config.js), entao quem
   *   chama so faz root.add(built.group).
   */
  function createFlowerBeds(options) {
    const opts = options || {};
    const beds = opts.beds || [];
    const group = new THREE.Group();
    group.name = "flores-do-quintal";

    const settings = {
      spacing: opts.spacing || 0.34,
      margin: opts.margin === undefined ? 0.38 : opts.margin,
      gaps: opts.gaps === undefined ? 0.14 : opts.gaps,
    };

    const built = { mesh: null, count: 0 };

    if (beds.length) {
      ensureParts();
      const builder = createBuilder();
      const base = new THREE.Matrix4();
      const spinQuat = new THREE.Quaternion();
      const spinEuler = new THREE.Euler();
      const flowerPos = new THREE.Vector3();
      const flowerScale = new THREE.Vector3();

      beds.forEach(function (bed, index) {
        const rng = mulberry32(
          hashSeed(opts.seed || "canteiro-varanda") +
            hashSeed(bed.key || index) * 0x9e3779b9
        );
        const placements = buildPlacements(
          bed,
          settings,
          rng,
          opts.exclusions || []
        );
        placements.forEach(function (pose) {
          spinEuler.set(0, pose.spin, 0);
          spinQuat.setFromEuler(spinEuler);
          flowerPos.set(pose.x, -GROUND_SINK, pose.z);
          flowerScale.setScalar(pose.scale);
          base.compose(flowerPos, spinQuat, flowerScale);
          SPECIES[pose.species](builder, rng, base, pose.color);
          built.count++;
        });
      });

      if (!builder.isEmpty()) {
        const pair = materials();
        const mesh = new THREE.Mesh(builder.toGeometry(), pair.night);
        mesh.name = "canteiro-de-flores";
        // Nada aqui se move depois de assado.
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        group.add(mesh);
        built.mesh = mesh;
        built.triangles = builder.triangles();
      }
    }

    // Mesmo contrato do chao externo, do gramado, da mata, da estrada e da
    // varanda: a cena chama isto de dentro do proprio setDaytime()/
    // setMorning() dela (ver cutscenes/sleep-sequence.js e o controle de
    // horario do Editor em editor/editor-ui.js).
    function setDaytime(daytime) {
      if (!built.mesh) {
        return;
      }
      const pair = materials();
      built.mesh.material = daytime === false ? pair.night : pair.day;
    }

    function setMorning() {
      setDaytime(true);
    }

    return {
      group: group,
      mesh: built.mesh,
      flowerCount: built.count,
      triangles: built.triangles || 0,
      setDaytime: setDaytime,
      setMorning: setMorning,
    };
  }

  return {
    createFlowerBeds: createFlowerBeds,
    PETAL_COLORS: PETAL_COLORS,
  };
})();
