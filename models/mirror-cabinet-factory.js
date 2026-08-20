/**
 * models/mirror-cabinet-factory.js
 * -------------------------------------------------
 * ESPELHEIRA do BANHEIRO (o espelho com moldura e a prateleirinha de
 * frascos embaixo) - carregada a partir de um modelo .glb pronto
 * (assets/models/mirror_cabinet_psx.glb), no MESMO sistema de importacao
 * dos outros modelos do jogo: o mesmo THREE.GLTFLoader dos outros .glb
 * de assets/models, o mesmo `normalizeTextures` (filtro nearest, sem
 * mipmap, encoding linear) e a mesma ideia de "medir a bounding box
 * nativa UMA vez, escrever as medidas aqui e deixar a cena so decidir
 * ONDE a peca fica". Nenhum carregador novo, nenhum shader novo, nenhum
 * sistema paralelo de 3D.
 *
 * TERCEIRA das SEIS pecas decorativas do BANHEIRO (ver
 * models/toilet-factory.js, models/bathroom-sink-factory.js,
 * models/towel-factory.js, models/shower-box-factory.js e
 * models/laundry-basket-factory.js).
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som (pedido explicito: "sao apenas itens decorativos, sem
 * interacoes, (por enquanto)"). O espelho NAO reflete nada: e a textura
 * do proprio scan, com o reflexo ja "assado" nos pixels. Refletir de
 * verdade pediria um cube camera por quadro, coisa que nem PS1 fazia e
 * que o jogo nao tem.
 *
 * ---------- A PRIMEIRA peca do jogo PENDURADA NA PAREDE ----------
 * Todos os moveis importados ate aqui nascem NO CHAO (ver o final do
 * bloco do radio portatil no README: "nao existe, ainda, campo de altura
 * para empilhar uma peca em cima da outra"). Espelheira no chao nao
 * existe, entao esta atualizacao acrescentou o campo OPCIONAL
 * `elevation` nos dados de mobilia do comodo (ver o bloco "Mobilia
 * decorativa" em scenes/side-room-scene.js): quantos metros a peca sobe
 * a partir do piso. E um termo somado ao Y e nada mais - a mesma ideia
 * do `wallOffset`, que e um termo somado ao X -, entao encosto na
 * parede, colisao e avisos continuam saindo da mesma conta, e as onze
 * pecas que ja existiam (as dez da COZINHA e o cesto de roupa deste
 * comodo) nao mudaram um milimetro.
 *
 * Do lado de DENTRO desta fabrica nada muda por causa disso: a peca
 * continua com a origem no centro da base, e quem levanta e a cena.
 *
 * ---------- O arquivo entrou COMO CHEGOU, byte a byte ----------
 * O pacote entregou o modelo em dois formatos - .bin + .json (geometria
 * quantizada, para o loader proprio dele) e um "GLB limpo" - e foi o GLB
 * que entrou, sem uma alteracao: assets/mirror_cabinet_psx.glb e copia
 * identica de espelheira.glb (1.29 MB, 29.779 vertices / 49.970
 * triangulos, geometria CRUA em float32 e a textura PSX de 256x256 ja
 * embutida como PNG, com sampler NEAREST/NEAREST e material Standard).
 * Nada foi reexportado, nada foi recomprimido, nenhum vertice foi
 * mexido.
 *
 * O que NAO entrou: o preview (index.html, src/main.js,
 * src/psx-material.js, src/psx-screen.js, src/touch-orbit.js,
 * src/three-loader.js, src/fallback-preview.js) e o par .bin/.json. Os
 * motivos sao os mesmos ja escritos nas fabricas da COZINHA: o preview e
 * modulo ES em three.js 0.160 por CDN (o jogo e r128 por <script>
 * global, entao seria um SEGUNDO three.js na pagina), o material dele e
 * um ShaderMaterial com luz e fog proprios (a peca ficaria fora do
 * sistema de iluminacao da casa, o mesmo bug do material "unlit" da TV)
 * e o par .bin/.json seria um segundo caminho de import para a mesma
 * malha.
 *
 * ---------- Geometria CRUA: sem Draco aqui ----------
 * Como o microondas, o radio portatil e a pia deste comodo, este .glb
 * nao usa KHR_draco_mesh_compression. A fabrica nao acopla DRACOLoader
 * nenhum: e o GLTFLoader puro.
 *
 * ---------- Convencao de espaco local ----------
 *   - X = 0 e Z = 0 sao o CENTRO da base da peca;
 *   - Y = 0 e a base dela (que aqui NAO e o chao: a cena levanta a peca
 *     pelo `elevation` dos dados, ver acima);
 *   - a "frente" (o ESPELHO) olha para +Z, mesma convencao de frente do
 *     resto do jogo (ver DoorFactory).
 * -------------------------------------------------
 */

window.MirrorCabinetFactory = (function () {
  const MODEL_URL = "assets/models/mirror_cabinet_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Como a pia deste comodo, este arquivo NAO tem rotacao de eixo no no
  // raiz: ele ja veio em Y para cima e com a base em y = 0, entao os
  // eixos do arquivo JA sao os eixos do jogo (nao existe o par
  // NATIVE_*/ROTATED_* das fabricas de modelo deitado).
  //   X (largura):      -0.37671 a 0.35264 -> 0.729
  //   Y (altura):        0.0     a 0.96065 -> 0.961
  //   Z (profundidade): -0.11836 a 0.09488 -> 0.213
  const NATIVE_MIN_X = -0.37671199440956116;
  const NATIVE_MAX_X = 0.35263511538505554;
  const NATIVE_MIN_Y = 0;
  const NATIVE_MAX_Y = 0.9606549739837646;
  const NATIVE_MIN_Z = -0.11836399883031845;
  const NATIVE_MAX_Z = 0.09488029032945633;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;
  const NATIVE_HEIGHT = NATIVE_MAX_Y - NATIVE_MIN_Y;

  // ---------- Escala ----------
  // O README do pacote afirma que o modelo esta "em metros" (73 x 96 x 21
  // cm), mas 96 cm de altura e espelheira de banheiro publico: o arquivo
  // chegou NORMALIZADO como os outros cinco do comodo (bounding box de
  // ~1 unidade), e essa medida e o cubo unitario, nao a peca.
  //
  // As PROPORCOES continuam valendo, e sao a ancora: 0.961 de altura por
  // 0.729 de largura da 1.32x mais alto que largo, que e a proporcao de
  // uma espelheira de banheiro com prateleira (60 x 80 cm da 1.33x).
  //
  // 0.80 de altura, escala UNIFORME: com ela a peca sai 0.61 de largura
  // por 0.18 de profundidade - espelheira de 61 cm, 18 cm de saliencia na
  // parede. Fica 30 cm acima da borda da pia (que tem 0.85 de altura, ver
  // models/bathroom-sink-factory.js) e o topo dela para em 1.95 do piso,
  // com a altura do olho do jogador em 1.6 (CorridorConfig.eyeHeight): o
  // espelho cai na linha do olhar, que e o ponto de uma espelheira.
  //
  // A ALTURA em que ela e pendurada nao esta aqui: e `elevation` nos
  // dados do comodo (scenes/house-config.js), porque e decisao de
  // POSICIONAMENTO, nao de modelo.
  const TARGET_HEIGHT = 0.8;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // ---------- Para onde a frente do modelo olha ----------
  // Medido, nao chutado: a malha deste pacote chegou CRUA, entao deu para
  // desenhar as quatro vistas dela antes de escrever esta linha. O lado
  // +Z e o do ESPELHO (com a moldura de madeira em volta e os dois
  // frascos na prateleirinha de baixo); o lado -Z e a tampa de fundo,
  // lisa. Frente em +Z, a MESMA convencao do resto do jogo (ver
  // DoorFactory).
  //
  // Se um dia o modelo for trocado e a peca aparecer de costas, esta e a
  // UNICA linha a mexer: 0 ou Math.PI. O recentramento abaixo acompanha o
  // giro sozinho, e 180 graus nao mudam largura/profundidade, entao a
  // colisao segue exata.
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = TARGET_HEIGHT;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;

  const MODEL_POSITION_X =
    (YAW_FLIPPED ? NATIVE_CENTER_X : -NATIVE_CENTER_X) * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z =
    (YAW_FLIPPED ? NATIVE_CENTER_Z : -NATIVE_CENTER_Z) * MODEL_SCALE;

  const MESH_NAME = "mirror_cabinet_psx";

  let sharedLoader = null;

  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

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

  function loadInto(group) {
    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        model.name = MESH_NAME;
        model.traverse(function (node) {
          if (node !== model && node.isMesh) {
            node.name = MESH_NAME;
          }
        });

        model.scale.setScalar(MODEL_SCALE);
        model.rotation.y = MODEL_YAW;
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error(
          "MirrorCabinetFactory: falha ao carregar " + MODEL_URL,
          error
        );
      }
    );
  }

  function createMirrorCabinet() {
    const group = new THREE.Group();
    group.name = "MirrorCabinetPSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createMirrorCabinet: createMirrorCabinet };
})();
