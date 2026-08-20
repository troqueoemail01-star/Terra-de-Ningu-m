/**
 * models/laundry-basket-factory.js
 * -------------------------------------------------
 * CESTO DE ROUPA do BANHEIRO - carregado a partir de um modelo .glb
 * pronto (assets/models/laundry_basket_psx.glb), no MESMO sistema de
 * importacao dos outros modelos do jogo: o mesmo THREE.GLTFLoader dos
 * outros .glb de assets/models, o mesmo THREE.DRACOLoader acoplado das
 * pecas com geometria comprimida, o mesmo `normalizeTextures` (filtro
 * nearest, sem mipmap, encoding linear) e a mesma ideia de "medir a
 * bounding box nativa UMA vez, escrever as medidas aqui e deixar a cena
 * so decidir ONDE a peca fica". Nenhum carregador novo, nenhum shader
 * novo, nenhum sistema paralelo de 3D.
 *
 * SEXTA e ultima das pecas decorativas do BANHEIRO (ver
 * models/toilet-factory.js, models/bathroom-sink-factory.js,
 * models/mirror-cabinet-factory.js, models/towel-factory.js e
 * models/shower-box-factory.js).
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem tampa que abre (pedido explicito: "sao apenas itens
 * decorativos, sem interacoes, (por enquanto)" - guardar/achar algo
 * dentro do cesto e trabalho de outra atualizacao, em `interactables`).
 * Entra em `solids` da cena, so para o jogador nao atravessar o cesto
 * andando.
 *
 * ---------- A TEXTURA foi embutida no .glb ----------
 * Mesma diferenca de fluxo do botijao, da pia da cozinha e do filtro de
 * barro, resolvida do mesmo jeito: o pacote trouxe a geometria e a
 * textura SEPARADAS - o .glb com a malha Draco e um material sem imagem
 * nenhuma, e as texturas PSX soltas ao lado (128 e 256).
 *
 * A de 256x256 foi EMBUTIDA no proprio
 * assets/models/laundry_basket_psx.glb, como image/png em bufferView,
 * com sampler NEAREST/NEAREST e wrap REPEAT, ligada ao
 * `baseColorTexture` de um material Standard (metallic 0, roughness 1,
 * doubleSided como o material do arquivo original - e aqui isso importa:
 * o trancado do cesto e casca fina, e com FrontSide o interior dele
 * desapareceria de certos angulos). A imagem e a mesma bit a bit e a
 * geometria Draco nao foi tocada (bloco comprimido copiado byte a byte:
 * 26.840 vertices / 50.000 triangulos).
 *
 * O que NAO entrou do pacote: index.html, exemplo-jogo.html,
 * src/PSXMaterial.js, src/PSXRenderer.js e src/CestoRoupa.js (modulos ES
 * com three.js 0.160 por importmap/unpkg, com ShaderMaterial, renderer
 * em 240p e fog proprios - seria um SEGUNDO three.js na pagina e a peca
 * ficaria fora do sistema de iluminacao da casa, o mesmo bug do material
 * "unlit" da TV) e a textura de 128, que seria um segundo caminho para a
 * mesma imagem.
 *
 * ---------- Convencao de espaco local ----------
 *   - X = 0 e Z = 0 sao o CENTRO da base do cesto;
 *   - Y = 0 e o chao;
 *   - a "frente" olha para +Z, mesma convencao do resto do jogo (num
 *     cesto redondo isso e quase cosmetico, ver MODEL_YAW).
 * -------------------------------------------------
 */

window.LaundryBasketFactory = (function () {
  const MODEL_URL = "assets/models/laundry_basket_psx.glb";

  const DECODER_SOURCES = [
    "https://cdn.jsdelivr.net/npm/three@0.128/examples/js/libs/draco/",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  ];

  // ---------- Medidas nativas do arquivo .glb ----------
  // Eixos CRUS do arquivo:
  //   X: -0.33960 a  0.34793
  //   Y: -0.33838 a  0.34036
  //   Z: -0.87802 a  0
  const NATIVE_MIN_X = -0.3396010100841522;
  const NATIVE_MAX_X = 0.34792599081993103;
  const NATIVE_MIN_Y = -0.3383769989013672;
  const NATIVE_MAX_Y = 0.340362012386322;
  const NATIVE_MIN_Z = -0.8780189752578735;
  const NATIVE_MAX_Z = 0;

  // Rotacao de +90 graus em X assada no unico no do arquivo (y -> -z,
  // z -> y), aplicada pelo GLTFLoader ao montar `gltf.scene`.
  //   X (largura):       -0.33960 a 0.34793 -> 0.688
  //   Y (altura):         0.0     a 0.87802 -> 0.878
  //   Z (profundidade):  -0.33838 a 0.34036 -> 0.679
  const ROTATED_MIN_X = NATIVE_MIN_X;
  const ROTATED_MAX_X = NATIVE_MAX_X;
  const ROTATED_MIN_Y = -NATIVE_MAX_Z;
  const ROTATED_MAX_Y = -NATIVE_MIN_Z;
  const ROTATED_MIN_Z = NATIVE_MIN_Y;
  const ROTATED_MAX_Z = NATIVE_MAX_Y;

  const ROTATED_CENTER_X = (ROTATED_MIN_X + ROTATED_MAX_X) / 2;
  const ROTATED_CENTER_Z = (ROTATED_MIN_Z + ROTATED_MAX_Z) / 2;
  const NATIVE_HEIGHT = ROTATED_MAX_Y - ROTATED_MIN_Y;

  // ---------- Escala ----------
  // Arquivo NORMALIZADO (bounding box de ~1 unidade), entao tem reescala,
  // ancorada na ALTURA e UNIFORME. As proporcoes de cesto estao certas:
  // 0.878 de altura por 0.688 de largura da 1.28x mais alto que largo, e
  // um cesto de roupa de banheiro de verdade (60 de altura por 45 de
  // diametro) da 1.33x.
  //
  // 0.60 e a altura de um cesto de roupa domestico. Com ela a peca sai
  // 0.47 x 0.46 de base - 46 cm de diametro, medida real.
  //
  // Referencias do proprio jogo: a privada ao lado (0.78 de altura) e a
  // pia (0.85) - o cesto lendo tres quartos da privada e a proporcao
  // certa.
  const TARGET_HEIGHT = 0.6;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // ---------- Para onde a frente do modelo olha ----------
  // Cesto de base praticamente redonda (0.688 x 0.679, ou seja, 1.3% de
  // diferenca entre os dois eixos): a frente aqui e cosmetica, e vale a
  // convencao do resto do jogo, +Z. Trocar por Math.PI so mostra o outro
  // lado do trancado, e 180 graus nao mudam largura/profundidade, entao a
  // colisao fica exata nos dois casos.
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  const FINAL_WIDTH = (ROTATED_MAX_X - ROTATED_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = TARGET_HEIGHT;
  const FINAL_DEPTH = (ROTATED_MAX_Z - ROTATED_MIN_Z) * MODEL_SCALE;

  const MODEL_POSITION_X =
    (YAW_FLIPPED ? ROTATED_CENTER_X : -ROTATED_CENTER_X) * MODEL_SCALE;
  const MODEL_POSITION_Y = -ROTATED_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z =
    (YAW_FLIPPED ? ROTATED_CENTER_Z : -ROTATED_CENTER_Z) * MODEL_SCALE;

  const MESH_NAME = "laundry_basket_psx";

  let sharedLoader = null;
  let sharedDraco = null;
  let decoderSourceIndex = 0;

  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();

      if (typeof THREE.DRACOLoader === "function") {
        sharedDraco = new THREE.DRACOLoader();
        sharedDraco.setDecoderPath(DECODER_SOURCES[decoderSourceIndex]);
        sharedLoader.setDRACOLoader(sharedDraco);
      } else {
        console.error(
          "LaundryBasketFactory: THREE.DRACOLoader nao esta carregado - o " +
            "cesto nao vai aparecer. Confira o <script> do DRACOLoader em " +
            "index.html."
        );
      }
    }
    return sharedLoader;
  }

  function nextDecoderSource() {
    if (!sharedDraco || decoderSourceIndex + 1 >= DECODER_SOURCES.length) {
      return false;
    }
    sharedDraco.dispose();
    sharedDraco = null;
    sharedLoader = null;
    decoderSourceIndex += 1;
    return true;
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
          "LaundryBasketFactory: falha ao carregar " + MODEL_URL,
          error
        );
        if (nextDecoderSource()) {
          console.warn(
            "LaundryBasketFactory: tentando outra fonte do decodificador " +
              "Draco: " + DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group);
        }
      }
    );
  }

  function createLaundryBasket() {
    const group = new THREE.Group();
    group.name = "LaundryBasketPSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createLaundryBasket: createLaundryBasket };
})();
