/**
 * models/shower-box-factory.js
 * -------------------------------------------------
 * BOX DE CHUVEIRO do BANHEIRO (o canto azulejado com o piso e o ralo) -
 * carregado a partir de um modelo .glb pronto
 * (assets/models/shower_box_psx.glb), no MESMO sistema de importacao dos
 * outros modelos do jogo: o mesmo THREE.GLTFLoader dos outros .glb de
 * assets/models, o mesmo THREE.DRACOLoader acoplado das pecas com
 * geometria comprimida, o mesmo `normalizeTextures` (filtro nearest, sem
 * mipmap, encoding linear) e a mesma ideia de "medir a bounding box
 * nativa UMA vez, escrever as medidas aqui e deixar a cena so decidir
 * ONDE a peca fica". Nenhum carregador novo, nenhum shader novo, nenhum
 * sistema paralelo de 3D.
 *
 * QUINTA das SEIS pecas decorativas do BANHEIRO (ver
 * models/toilet-factory.js, models/bathroom-sink-factory.js,
 * models/mirror-cabinet-factory.js, models/towel-factory.js e
 * models/laundry-basket-factory.js).
 *
 * ---------- ATENCAO: a unica peca cuja identidade foi DEDUZIDA ----------
 * O pacote deste modelo veio chamado so de "banheiro"
 * (banheiro-psx-threejs / banheiro_psx.glb), sem dizer QUE peca de
 * banheiro e - e a malha chega comprimida em Draco, entao nao da para
 * desenha-la aqui e olhar, como foi possivel com a pia e a espelheira
 * (que chegaram cruas). O que da para medir e ler diz o seguinte:
 *
 *  - a bounding box (do accessor de POSITION, que o glTF obriga a trazer
 *    min/max) da uma peca 2.0x mais alta que larga, com pegada quase
 *    quadrada: 0.505 x 0.418 de base por 1.014 de altura no arquivo
 *    normalizado;
 *  - a textura (a PSX de 256 e a PBR original de 1024 que veio no
 *    banheiro_source.glb do pacote) e um atlas de PAINEIS RETANGULARES
 *    azulejados, com rejunte, um RALO redondo com grelha, tubos e manchas
 *    magenta - o magenta e o preenchimento tipico de area que o
 *    escaneamento nao conseguiu ver, o que combina com o interior de algo
 *    fechado.
 *
 * Piso azulejado com ralo + paredes azulejadas + proporcao de coisa alta
 * e estreita = box de chuveiro. E por isso que o asset, a fabrica e o
 * rotulo do Editor falam "box de chuveiro", e nao "banheiro" (nome que,
 * alem de nao dizer nada, colidiria com o nome do COMODO).
 *
 * Se a deducao estiver errada, o conserto e pequeno e nao mexe em
 * geometria nenhuma: TARGET_HEIGHT aqui embaixo (uma linha), o `corner` /
 * `rotationY` nos dados do comodo (scenes/house-config.js) e, se quiser,
 * o rotulo em editor/editor-registry.js. O Editor tambem redimensiona e
 * gira a peca no lugar, sem tocar em codigo.
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem agua caindo (pedido explicito: "sao apenas itens
 * decorativos, sem interacoes, (por enquanto)"). Entra em `solids` da
 * cena, so para o jogador nao atravessar o box andando.
 *
 * ---------- A TEXTURA foi embutida no .glb ----------
 * Mesma diferenca de fluxo do botijao, da pia da cozinha e do filtro de
 * barro, resolvida do mesmo jeito: o pacote trouxe a geometria e a
 * textura SEPARADAS - o .glb com a malha Draco e um material sem imagem
 * nenhuma, e as texturas PSX soltas ao lado (128, 256, 256 de 16 cores e
 * 512).
 *
 * A de 256x256 foi EMBUTIDA no proprio assets/models/shower_box_psx.glb,
 * como image/png em bufferView, com sampler NEAREST/NEAREST e wrap
 * REPEAT, ligada ao `baseColorTexture` do material Standard que o arquivo
 * ja tinha (metallic 0, roughness 1, doubleSided). A imagem e a mesma bit
 * a bit, e a geometria Draco nao foi tocada (bloco comprimido copiado
 * byte a byte: 32.018 vertices / 50.144 triangulos). O que mudou foi so
 * ONDE a imagem mora, para o modelo continuar sendo UM arquivo carregado
 * pelo MESMO GLTFLoader - nada de TextureLoader avulso.
 *
 * A orientacao da imagem foi conferida contra o baseColor original do
 * banheiro_source.glb do pacote: as duas estao na MESMA orientacao, e
 * textura que mora dentro do .glb e lida com `flipY = false`, que e o que
 * os UVs de glTF pedem. O preview do pacote, que carrega o PNG com
 * THREE.TextureLoader (`flipY = true`), e que mostrava a imagem
 * espelhada - mesmo caso do filtro de barro.
 *
 * O que NAO entrou do pacote: index.html, game-example.html e src/*.js
 * (modulos ES com three.js por CDN, PSXStage/framebuffer virtual e
 * material proprios - seria um SEGUNDO three.js na pagina e a peca
 * ficaria fora do sistema de iluminacao da casa), as outras tres texturas
 * e o assets/original/banheiro_source.glb (o arquivo cru do usuario, com
 * as PBR de 1024 em WebP: serviu so para conferir a orientacao da
 * textura).
 *
 * ---------- Convencao de espaco local ----------
 *   - X = 0 e Z = 0 sao o CENTRO da base do box;
 *   - Y = 0 e o chao;
 *   - a "frente" (o lado aberto) olha para +Z, mesma convencao de frente
 *     do resto do jogo (ver DoorFactory).
 * -------------------------------------------------
 */

window.ShowerBoxFactory = (function () {
  const MODEL_URL = "assets/models/shower_box_psx.glb";

  const DECODER_SOURCES = [
    "https://cdn.jsdelivr.net/npm/three@0.128/examples/js/libs/draco/",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  ];

  // ---------- Medidas nativas do arquivo .glb ----------
  // Eixos CRUS do arquivo:
  //   X: -0.27371 a  0.23169
  //   Y: -0.20255 a  0.21560
  //   Z: -1.01435 a  0
  const NATIVE_MIN_X = -0.2737089991569519;
  const NATIVE_MAX_X = 0.23169200122356415;
  const NATIVE_MIN_Y = -0.20254600048065186;
  const NATIVE_MAX_Y = 0.2156040072441101;
  const NATIVE_MIN_Z = -1.0143539905548096;
  const NATIVE_MAX_Z = 0;

  // Rotacao de +90 graus em X assada no unico no do arquivo (y -> -z,
  // z -> y), aplicada pelo GLTFLoader ao montar `gltf.scene`.
  //   X (largura):       -0.27371 a 0.23169 -> 0.505
  //   Y (altura):         0.0     a 1.01435 -> 1.014
  //   Z (profundidade):  -0.20255 a 0.21560 -> 0.418
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
  // Arquivo NORMALIZADO (bounding box de ~1 unidade, o cubo unitario do
  // aplicativo de escaneamento), entao tem reescala, ancorada na ALTURA e
  // UNIFORME.
  //
  // 2.0 e a altura de um box de chuveiro de verdade (a divisoria vai do
  // piso ate 1.90/2.00, na altura do registro do chuveiro). Com ela a peca
  // sai 1.00 x 0.82 de pegada - box de 1 m por 82 cm, medida de banheiro
  // brasileiro. E as PROPORCOES do arquivo confirmam a leitura: 2.0x mais
  // alto que largo e exatamente a proporcao de um box.
  //
  // Referencias do proprio jogo: o pe-direito do comodo (4.2,
  // CorridorConfig.height), o vao da porta (2.28, DoorFactory.
  // OPENING_HEIGHT) e a altura do olho do jogador (1.6,
  // CorridorConfig.eyeHeight) - o box passa da cabeca do jogador, como
  // tem de ser, e ainda sobram 2.2 m livres ate o teto.
  //
  // Esta e a UNICA linha a mexer se a peca aparecer grande ou pequena
  // demais: largura, profundidade, recentramento e caixa de colisao saem
  // todas dela. Ver tambem o bloco "a unica peca cuja identidade foi
  // DEDUZIDA" no topo.
  const TARGET_HEIGHT = 2.0;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // ---------- Para onde a frente do modelo olha ----------
  // Malha comprimida em Draco (nao da para medir vertice por vertice
  // aqui) e bounding box quase simetrica no eixo Z do jogo (-0.203 a
  // +0.216): vale a convencao do resto do jogo, frente em +Z, que num
  // canto da parede de FUNDO ja e o lado do interior do comodo.
  //
  // Se o lado aberto do box aparecer virado para a parede, esta e a UNICA
  // linha a mexer: 0 ou Math.PI - ou um giro no Editor. 180 graus nao
  // mudam largura/profundidade, entao a colisao segue exata.
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

  const MESH_NAME = "shower_box_psx";

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
          "ShowerBoxFactory: THREE.DRACOLoader nao esta carregado - o box nao " +
            "vai aparecer. Confira o <script> do DRACOLoader em index.html."
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
        console.error("ShowerBoxFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "ShowerBoxFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group);
        }
      }
    );
  }

  function createShowerBox() {
    const group = new THREE.Group();
    group.name = "ShowerBoxPSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createShowerBox: createShowerBox };
})();
