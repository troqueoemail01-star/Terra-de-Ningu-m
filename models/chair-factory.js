/**
 * models/chair-factory.js
 * -------------------------------------------------
 * Cadeira com roupas jogadas em cima — peça DECORATIVA do quarto
 * ("MEU QUARTO"), carregada a partir de um modelo .glb pronto
 * (assets/models/chair_psx.glb), exatamente na mesma linha da lata de
 * lixo / criado-mudo / estante (ver models/trash-can-factory.js,
 * models/nightstand-factory.js e models/bookshelf-factory.js): o MESMO
 * THREE.GLTFLoader que o resto do jogo já usa, o mesmo tratamento de
 * textura "nearest" sem mipmap e a mesma convenção de espaço local.
 * Nenhum sistema novo de importação foi criado para esta peça.
 *
 * Peça puramente decorativa — sem interação, sem outline, sem
 * animação, sem som, sem evento: não entra em `interactables` (mesmo
 * tratamento da lata de lixo e do vaso de planta, ver blocos
 * equivalentes em scenes/room-scene.js). Ainda assim entra em `solids`
 * — igual à lata de lixo — só para o jogador não atravessar a cadeira
 * andando; isso é colisão física, não "interação" no sentido do
 * InteractionSystem.
 *
 * ---------- Sobre o arquivo .glb ----------
 * O modelo veio já reprocessado em estilo PS1 (textura albedo 512x512
 * pixelizada, com dither e cor reduzida; mapas de normal e de
 * metallic/roughness removidos, porque a PS1 não tinha PBR) e a
 * textura vem embutida no próprio .glb — mesmo caso do resto dos
 * modelos importados do jogo (ver models/wardrobe-factory.js): não há
 * nenhum efeito de dithering em tempo de execução aqui, só o
 * `normalizeTextures` de sempre.
 *
 * Duas particularidades deste arquivo, que os outros .glb do jogo não
 * têm — as duas resolvidas aqui dentro, sem tocar em nada do resto:
 *
 * 1) Ele usa a extensão KHR_mesh_quantization (posição em int16, UV em
 *    uint16, normal em int8, tudo interleaved) para caber em ~11 MB em
 *    vez de ~28 MB, sem alterar a malha. O GLTFLoader da versão de
 *    Three.js usada pelo jogo (r128, ver index.html) já entende essa
 *    extensão, então o carregamento em si não precisa de nada especial.
 * 2) Nessa versão do GLTFLoader, porém, a caixa/esfera de contorno da
 *    geometria é montada a partir do min/max CRU do arquivo, sem
 *    desfazer a normalização dos int16 — o resultado é uma esfera de
 *    contorno milhares de vezes maior que a cadeira. Isso não deforma
 *    nada na tela, mas quebra o frustum culling: uma malha de 750 mil
 *    triângulos passaria a ser enviada para a GPU em TODO quadro,
 *    inclusive de costas para ela. `fixQuantizedBounds` recalcula esse
 *    contorno com a escala certa (ver a função abaixo) — em celular,
 *    é a diferença entre a cadeira custar caro só quando está no
 *    enquadramento e custar caro sempre.
 *
 * Aviso de custo: são 749.994 triângulos em 7 lotes (é um scan, não um
 * modelo de época — um jogo de PS1 usaria de 300 a 3.000). Roda porque
 * são poucos draw calls e o material é simples, mas se um dia a cadeira
 * for duplicada pela cena vale gerar uma versão decimada (LOD).
 *
 * ---------- Convenção de espaço local ----------
 * Igual à da lata de lixo / vaso de planta (objetos soltos no chão, não
 * encostados numa parede por uma face plana — diferente da convenção
 * "Z = 0 é a parede" de criado-mudo/estante/guarda-roupa):
 *   - X = 0 e Z = 0 são o CENTRO HORIZONTAL DA BASE da cadeira;
 *   - Y = 0 é o chão (base dos pés da cadeira).
 * Além disso, a cadeira tem uma FRENTE: o encosto fica no lado -Z do
 * modelo, então com `rotation.y = 0` ela olha para +Z. Quem posiciona
 * (scenes/room-scene.js) só decide o canto do quarto e o ângulo, sem
 * precisar saber nada da geometria do arquivo.
 *
 * O modelo já vem em METROS (0,98 m de altura, cadeira de tamanho
 * normal), então aqui NÃO há reescala — mesmo caso da cama, do
 * criado-mudo e da mesinha de TV (MODEL_SCALE = 1, ver
 * models/bed-factory.js), e diferente dos modelos de Sketchfab, que
 * chegam em unidades quaisquer e precisam de TARGET_HEIGHT.
 * -------------------------------------------------
 */

window.ChairFactory = (function () {
  const MODEL_URL = "assets/models/chair_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Bounding box de `gltf.scene` (já com a transformação do nó raiz
  // resolvida pelo GLTFLoader), medida diretamente nos vértices do
  // arquivo — aqui, diferente dos modelos de Sketchfab, estes valores
  // JÁ são metros:
  //   X (largura):  -0.22026 a  0.27889  -> 0.499 m
  //   Y (altura):    0.00000 a  0.98121  -> 0.981 m
  //   Z (profund.): -0.17288 a  0.32531  -> 0.498 m
  // A base já nasce em y = 0 (mesma sorte de BedFactory/
  // NightstandFactory: nenhum ajuste de "chão" fora do comum). O
  // encosto ocupa a faixa Z de -0.173 a -0.081 (por isso a frente é
  // +Z, ver comentário de convenção no topo), e a roupa jogada no
  // assento é o que faz o modelo avançar até Z = +0.325.
  const NATIVE_MIN_X = -0.2202646172;
  const NATIVE_MAX_X = 0.2788856363;
  const NATIVE_MIN_Y = 0.0000050000;
  const NATIVE_MAX_Y = 0.9812070131;
  const NATIVE_MIN_Z = -0.1728820016;
  const NATIVE_MAX_Z = 0.3253100176;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;
  const NATIVE_HEIGHT = NATIVE_MAX_Y - NATIVE_MIN_Y;

  // Sem reescala: o arquivo já está em metros (ver comentário no topo).
  const MODEL_SCALE = 1;

  // Dimensões finais (já na escala do jogo) — usadas por
  // scenes/room-scene.js para encaixar a cadeira no canto e montar o
  // sólido de colisão, do mesmo jeito que TrashCanFactory.width/
  // height/depth.
  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;
  const FINAL_HEIGHT = NATIVE_HEIGHT * MODEL_SCALE;

  // Recentraliza a peça para a convenção descrita no topo: X e Z no
  // centro da base, Y com a base no chão.
  const MODEL_POSITION_X = -NATIVE_CENTER_X * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z = -NATIVE_CENTER_Z * MODEL_SCALE;

  // Loader único e reaproveitado entre chamadas — mesma ideia de
  // TrashCanFactory/NightstandFactory.
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura usado em TrashCanFactory/NightstandFactory:
  // filtro "nearest" e sem mipmap para o pixel cru do visual PSX, e
  // encoding linear para ficar consistente com o resto do jogo.
  function normalizeTextures(model) {
    model.traverse(function (node) {
      if (!node.isMesh || !node.material) {
        return;
      }
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach(function (mat) {
        if (mat.map) {
          mat.map.magFilter = THREE.NearestFilter;
          mat.map.minFilter = THREE.NearestFilter;
          mat.map.generateMipmaps = false;
          mat.map.encoding = THREE.LinearEncoding;
          mat.map.needsUpdate = true;
        }
      });
    });
  }

  // Fator para desfazer a normalização de um atributo quantizado
  // (KHR_mesh_quantization): int16 -> [-1, 1], uint16 -> [0, 1] etc.
  // Funciona tanto para BufferAttribute quanto para
  // InterleavedBufferAttribute (este arquivo é interleaved).
  function normalizedScale(attribute) {
    const array = attribute.array || (attribute.data && attribute.data.array);
    if (!attribute.normalized || !array) {
      return 1;
    }
    if (array instanceof Int8Array) {
      return 1 / 127;
    }
    if (array instanceof Uint8Array) {
      return 1 / 255;
    }
    if (array instanceof Int16Array) {
      return 1 / 32767;
    }
    if (array instanceof Uint16Array) {
      return 1 / 65535;
    }
    return 1;
  }

  // Recalcula caixa e esfera de contorno de cada malha com a escala
  // certa (ver item 2 do comentário no topo). Roda uma única vez, no
  // fim do carregamento, e é o que devolve o frustum culling correto
  // para uma malha grande como esta. Se uma versão futura do Three.js
  // já fizer essa conta sozinha, o resultado daqui é exatamente o
  // mesmo — não há risco de "corrigir duas vezes", porque a conta parte
  // sempre dos valores crus do atributo.
  function fixQuantizedBounds(model) {
    model.traverse(function (node) {
      if (!node.isMesh || !node.geometry) {
        return;
      }
      const attributes = node.geometry.attributes;
      const position = attributes ? attributes.position : null;
      if (!position || !position.normalized) {
        return;
      }
      const scale = normalizedScale(position);
      let minX = Infinity;
      let minY = Infinity;
      let minZ = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let maxZ = -Infinity;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i) * scale;
        const y = position.getY(i) * scale;
        const z = position.getZ(i) * scale;
        if (x < minX) { minX = x; }
        if (y < minY) { minY = y; }
        if (z < minZ) { minZ = z; }
        if (x > maxX) { maxX = x; }
        if (y > maxY) { maxY = y; }
        if (z > maxZ) { maxZ = z; }
      }
      if (minX > maxX) {
        return;
      }
      const box = new THREE.Box3(
        new THREE.Vector3(minX, minY, minZ),
        new THREE.Vector3(maxX, maxY, maxZ)
      );
      node.geometry.boundingBox = box;
      node.geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    });
  }

  function createChair() {
    const group = new THREE.Group();
    // Nome legível para a hierarquia do modo EDITOR (mesma ideia de
    // "FloorPlantPSX"/"SoccerBallPSX" — ver editor/editor-registry.js).
    group.name = "ChairPSX";

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);
        fixQuantizedBounds(model);

        // 1) Escala (aqui, 1: o arquivo já está em metros).
        model.scale.setScalar(MODEL_SCALE);

        // 2) Recentraliza: X e Z no centro da base, Y com a base no
        //    chão (ver convenção de espaço local no topo).
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("ChairFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return {
    createChair: createChair,
    WIDTH: FINAL_WIDTH,
    HEIGHT: FINAL_HEIGHT,
    DEPTH: FINAL_DEPTH,
  };
})();
