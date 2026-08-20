/**
 * models/towel-factory.js
 * -------------------------------------------------
 * TOALHA do BANHEIRO (a toalha verde pendurada) - carregada a partir de
 * um modelo .glb pronto (assets/models/towel_psx.glb), no MESMO sistema
 * de importacao dos outros modelos do jogo (ver
 * models/clay-filter-factory.js, models/sink-cabinet-factory.js e
 * models/stove-factory.js): o mesmo THREE.GLTFLoader dos outros .glb de
 * assets/models, o mesmo THREE.DRACOLoader acoplado das pecas com
 * geometria comprimida, o mesmo `normalizeTextures` (filtro nearest, sem
 * mipmap, encoding linear) e a mesma ideia de "medir a bounding box
 * nativa UMA vez, escrever as medidas aqui e deixar a cena so decidir
 * ONDE a peca fica". Nenhum carregador novo, nenhum shader novo, nenhum
 * sistema paralelo de 3D.
 *
 * QUARTA das SEIS pecas decorativas do BANHEIRO (ver
 * models/toilet-factory.js, models/bathroom-sink-factory.js,
 * models/mirror-cabinet-factory.js, models/shower-box-factory.js e
 * models/laundry-basket-factory.js).
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem pano se mexendo com o vento (pedido explicito: "sao
 * apenas itens decorativos, sem interacoes, (por enquanto)"). E uma
 * malha ESTATICA: o pano ja chegou modelado dobrado no toalheiro, sem
 * esqueleto e sem simulacao.
 *
 * ---------- Pendurada na parede, como a espelheira ----------
 * Toalha no chao nao existe, entao esta peca usa o campo OPCIONAL
 * `elevation` que entrou junto com a espelheira nesta atualizacao (ver o
 * bloco "Mobilia decorativa" em scenes/side-room-scene.js): quantos
 * metros a peca sobe a partir do piso. Aqui a altura escolhida deixa a
 * PONTA DE CIMA da toalha na altura de um toalheiro de verdade (ver o
 * comentario dos dados em scenes/house-config.js). Do lado de dentro
 * desta fabrica nada muda por causa disso: a origem continua no centro da
 * base da peca, e quem levanta e a cena.
 *
 * ---------- A TEXTURA foi embutida no .glb ----------
 * Mesma diferenca de fluxo do botijao, da pia da cozinha e do filtro de
 * barro, resolvida do mesmo jeito: o pacote trouxe o .glb com as texturas
 * PBR ORIGINAIS (baseColor, normal e metallic/roughness em WebP de 1024,
 * mais a extensao KHR_materials_specular) e, ao lado, as texturas PSX
 * soltas em PNG (64, 128 e 256).
 *
 * O que entrou no jogo foi a PSX de 256x256, embutida no proprio
 * assets/models/towel_psx.glb como image/png em bufferView, com sampler
 * NEAREST/NEAREST e wrap REPEAT, ligada ao `baseColorTexture` de um
 * material Standard (metallic 0, roughness 1, doubleSided como o material
 * do arquivo original). As tres WebP e a KHR_materials_specular sairam:
 * o normal map deste modelo e praticamente plano (o proprio README do
 * pacote mediu: desvio menor que 1.2/255), PS1 nao tinha mapa de normal
 * nem specular, e as tres imagens juntas eram 89 KB de bufferView que
 * ninguem ia ler.
 *
 * A geometria Draco NAO foi tocada: o bloco comprimido do arquivo
 * original foi copiado byte a byte (33.489 vertices / 49.992
 * triangulos). O que mudou foi so ONDE a imagem mora, para o modelo
 * continuar sendo UM arquivo carregado pelo MESMO GLTFLoader - nada de
 * TextureLoader avulso e nada de um segundo asset para sincronizar.
 *
 * De carona vem o mesmo detalhe de UV do filtro de barro: o preview do
 * pacote carrega o PNG com THREE.TextureLoader (`flipY = true`), mas os
 * UVs sao de glTF (origem em CIMA) e a imagem PSX esta na MESMA
 * orientacao da textura original do modelo - conferido aqui pixel a
 * pixel contra o baseColor WebP do proprio arquivo. Textura que mora
 * DENTRO do .glb e lida pelo GLTFLoader com `flipY = false`, que e o
 * certo: aqui ela cai no lugar sozinha.
 *
 * O que NAO entrou do pacote: index.html, example.html e
 * src/towel-psx.js (modulo ES em three.js 0.166 por CDN, com
 * ShaderMaterial, luz e fog proprios - seria um SEGUNDO three.js na
 * pagina e a peca ficaria fora do sistema de iluminacao da casa, o mesmo
 * bug do material "unlit" da TV) e as texturas PSX de 64 e 128, que
 * seriam um segundo caminho para a mesma imagem.
 *
 * ---------- Geometria comprimida em Draco ----------
 * KHR_draco_mesh_compression, extensao *required* dentro do arquivo. O
 * <script> do DRACOLoader ja esta em index.html desde a COZINHA - nada de
 * novo precisou entrar la. Se o decodificador nao chegar (rede caida, CDN
 * bloqueado), a toalha simplesmente nao aparece: a falha vai para o
 * console, as fontes alternativas sao tentadas em ordem e o boot continua
 * identico.
 *
 * ---------- Convencao de espaco local ----------
 *   - X = 0 e Z = 0 sao o CENTRO da base da peca;
 *   - Y = 0 e a base dela (a ponta de baixo do pano; a cena levanta a
 *     peca pelo `elevation` dos dados);
 *   - a "frente" (a face do pano virada para o comodo) olha para +Z,
 *     mesma convencao de frente do resto do jogo (ver DoorFactory).
 * -------------------------------------------------
 */

window.TowelFactory = (function () {
  const MODEL_URL = "assets/models/towel_psx.glb";

  // Mesma lista, na mesma ordem, das outras fabricas com Draco (ver
  // models/clay-filter-factory.js).
  const DECODER_SOURCES = [
    "https://cdn.jsdelivr.net/npm/three@0.128/examples/js/libs/draco/",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  ];

  // ---------- Medidas nativas do arquivo .glb ----------
  // Do proprio accessor de POSITION (o glTF obriga min/max, entao da para
  // medir sem descomprimir o Draco). Eixos CRUS do arquivo:
  //   X: -0.21110 a  0.22268
  //   Y: -0.13753 a  0.14477
  //   Z: -1.14035 a  0
  const NATIVE_MIN_X = -0.21109500527381897;
  const NATIVE_MAX_X = 0.222679004073143;
  const NATIVE_MIN_Y = -0.13752500712871552;
  const NATIVE_MAX_Y = 0.14477300643920898;
  const NATIVE_MIN_Z = -1.1403549909591675;
  const NATIVE_MAX_Z = 0;

  // Os mesmos limites JA nos eixos do jogo: o unico no do arquivo traz a
  // rotacao de +90 graus em X assada nele (conversao de eixo do
  // exportador, a mesma da privada, do box e do cesto), e o GLTFLoader
  // aplica sozinho ao montar `gltf.scene`: y -> -z e z -> y.
  //   X (largura):       -0.21110 a 0.22268 -> 0.434
  //   Y (altura):         0.0     a 1.14035 -> 1.140
  //   Z (profundidade):  -0.13753 a 0.14477 -> 0.282
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
  // Arquivo NORMALIZADO como os outros do comodo (bounding box de ~1
  // unidade), entao tem reescala, ancorada na ALTURA e UNIFORME. 0.95 e o
  // comprimento de uma toalha de banho dobrada no toalheiro (a toalha
  // aberta tem 1.30 a 1.50; dobrada ao meio sobre a barra, sobra por volta
  // de 0.90 a 1.00 pendurada). Com ela a peca sai 0.36 de largura por 0.24
  // de profundidade - 36 cm de pano visto de frente, 24 cm de "barriga"
  // saindo da parede, que e uma toalha de banho dobrada de verdade.
  //
  // Referencias do proprio jogo: a pia ao lado (0.85 de altura) e a
  // espelheira acima dela (0.80 de altura, pendurada em 1.15).
  const TARGET_HEIGHT = 0.95;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // ---------- Para onde a frente do modelo olha ----------
  // A malha chega comprimida em Draco, entao aqui a frente NAO pode ser
  // medida vertice por vertice como na pia e na espelheira (que chegaram
  // cruas), e a bounding box tambem nao ajuda: o pano e quase simetrico
  // nos dois lados (Z do jogo de -0.138 a +0.145). Vale a convencao do
  // resto do jogo, frente em +Z, e o efeito pratico e pequeno - as duas
  // faces de uma toalha dobrada leem igual, e 180 graus nao mudam
  // largura/profundidade, entao a colisao fica exata nos dois casos.
  //
  // Se ela aparecer com a dobra para o lado errado, esta e a UNICA linha a
  // mexer: 0 ou Math.PI - ou um giro no Editor, sem tocar em codigo.
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

  // O arquivo original chamava o no de "node_0" (nome de exportador, que
  // apareceria assim no painel de hierarquia do Editor); no repack ele
  // virou "towel_psx", o padrao das outras pecas importadas, e a
  // renomeacao aqui garante isso mesmo se o .glb for trocado.
  const MESH_NAME = "towel_psx";

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
          "TowelFactory: THREE.DRACOLoader nao esta carregado - a toalha nao " +
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
        console.error("TowelFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "TowelFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group);
        }
      }
    );
  }

  function createTowel() {
    const group = new THREE.Group();
    group.name = "TowelPSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createTowel: createTowel };
})();
