/**
 * models/barbecue-grill-factory.js
 * -------------------------------------------------
 * A CHURRASQUEIRA DA VARANDA (com o engradado de garrafas que vem
 * modelado ao lado dela) - quarta e ultima peca decorativa da varanda da
 * entrada. Mesmo sistema de importacao de .glb de todos os outros modelos
 * do jogo; a documentacao completa do caminho esta em
 * models/porch-plant-factory.js.
 *
 * Peca puramente DECORATIVA: sem interacao, sem fogo, sem fumaca, sem
 * som, sem animacao ("Sao apenas itens decorativos, sem interacoes, (Por
 * enquanto)"). Entra em `solids` so para o jogador nao atravessar a
 * churrasqueira andando.
 *
 * ---------- O unico caso do jogo que NAO chegou como .glb ----------
 * O pacote (churrasqueira-psx-threejs.zip) nao traz .glb nenhum: a malha
 * vem em assets/churrasqueira.psx.bin, um formato PROPRIO do autor
 * ("PSXM": cabecalho de 96 bytes, posicoes e UV quantizadas em uint16,
 * normais em int8, indices em uint16), lido pelo src/PSXMesh.js dele.
 *
 * Como o jogo carrega .glb pelo MESMO GLTFLoader em todos os modelos, o
 * conteudo daquele arquivo foi reempacotado em
 * assets/models/grill_psx.glb - e so REEMPACOTADO: os 41.026 vertices e
 * 49.794 triangulos sao os mesmos, um a um, dequantizados exatamente com
 * o offset/escala do cabecalho do proprio arquivo. Junto foi embutida a
 * textura PSX 256x256 do pacote (sampler NEAREST/REPEAT) e criado o
 * material (MeshStandardMaterial doubleSided, como o original do pacote,
 * que era de dupla face).
 *
 * Duas consequencias, as duas de proposito:
 *  - o arquivo NAO tem Draco (o formato do pacote nao usa) e nem
 *    precisa: `USES_DRACO` abaixo e false e o DRACOLoader nem e
 *    instanciado por esta fabrica. Ele fica maior em disco (1.6 MB, com
 *    posicao/normal/UV em float32) - o que ja e comum aqui, o
 *    chair_psx.glb do quarto tem 11.9 MB - e em troca carrega sem
 *    depender de CDN nenhum;
 *  - o V da UV foi INVERTIDO (v = 1 - v) na conversao. O .psx.bin guarda
 *    V de baixo para cima, para o preview do pacote poder usar
 *    flipY = true (three.js) / UNPACK_FLIP_Y_WEBGL (o preview offline em
 *    WebGL puro); o glTF quer V de cima para baixo. Isto NAO e chute: a
 *    peca foi renderizada nas duas orientacoes e comparada com o
 *    preview.png que veio no pacote - so a invertida bate (com a direta,
 *    a textura vira borrao amarelo).
 *
 * O resto do pacote nao entrou: src/PSXMaterial.js e src/Churrasqueira.js
 * (modulos ES, shader com luz propria), index.html e preview-offline.html
 * (previews).
 * -------------------------------------------------
 */

window.BarbecueGrillFactory = (function () {
  const MODEL_URL = "assets/models/grill_psx.glb";

  // ---------- Fontes do decodificador Draco ----------
  // Mesma lista, na mesma ordem, de models/stove-factory.js,
  // models/gas-cylinder-factory.js e models/fridge-factory.js: primeiro o
  // decodificador do proprio three.js r128 (o MESMO CDN e a MESMA versao
  // de onde index.html ja baixa three.min.js, o GLTFLoader e o
  // DRACOLoader), depois o do Google como rede de seguranca.
  //
  // Para rodar 100% offline um dia: copie o decodificador para uma pasta
  // local e ponha o caminho dela PRIMEIRO nesta lista, nas fabricas com
  // Draco. Nada mais precisa mudar.
  const DECODER_SOURCES = [
    "https://cdn.jsdelivr.net/npm/three@0.128/examples/js/libs/draco/",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  ];

  // Este arquivo tem (ou nao) a geometria comprimida em Draco. Quando
  // false, o GLTFLoader carrega sozinho e o DRACOLoader nem e instanciado.
  const USES_DRACO = false;

  // ---------- Medidas nativas do arquivo .glb ----------
  // Eixos do arquivo, que aqui JA sao os do jogo (Y para cima, base em
  // y = 0). Vieram do cabecalho do .psx.bin original e batem com o que o
  // README do pacote anuncia (0.7777 x 0.682 x 0.7475):
  const NATIVE_MIN_X = -0.38028499484062195;
  const NATIVE_MAX_X = 0.3974039852619171;
  const NATIVE_MIN_Y = -2.4393888452323154e-05;
  const NATIVE_MAX_Y = 0.6819490194320679;
  const NATIVE_MIN_Z = -0.2660059928894043;
  const NATIVE_MAX_Z = 0.4814870059490204;

  // Este arquivo NAO tem rotacao no no (ele foi empacotado aqui a partir
  // do .psx.bin do pacote, ver o topo): os eixos do arquivo JA sao os do
  // jogo, com Y para cima e a base em y = 0. Os ROTATED_* existem so para
  // o resto do arquivo ser identico ao das outras fabricas.
  const ROTATED_MIN_X = NATIVE_MIN_X;
  const ROTATED_MAX_X = NATIVE_MAX_X;
  const ROTATED_MIN_Y = NATIVE_MIN_Y;
  const ROTATED_MAX_Y = NATIVE_MAX_Y;
  const ROTATED_MIN_Z = NATIVE_MIN_Z;
  const ROTATED_MAX_Z = NATIVE_MAX_Z;
  const ROTATED_CENTER_X = (ROTATED_MIN_X + ROTATED_MAX_X) / 2;
  const ROTATED_CENTER_Z = (ROTATED_MIN_Z + ROTATED_MAX_Z) / 2;

  // ---------- Escala ----------
  // Sem reescala (MODEL_SCALE = 1): o pacote ja vem em metros - 0.778 x
  // 0.747 de base por 0.682 de altura, medidas de uma churrasqueira de
  // ferro com pernas. A bounding box inclui o ENGRADADO de garrafas que
  // vem modelado ao lado dela (em +X, ver a nota do giro abaixo): a
  // churrasqueira sozinha tem uns 0.54 de largura.
  const MODEL_SCALE = 1;

  // ---------- Para onde a frente do modelo olha ----------
  // Aqui a frente NAO e chute: os tres espetos de cabo de madeira que
  // ficam apoiados em cima da grelha apontam para +Z (medido no proprio
  // arquivo - eles sao os tres unicos grupos de vertices separados do
  // corpo, todos acima de y = 0.62 e chegando a z = 0.49), e o engradado
  // de garrafas fica em +X. Frente = +Z, ou seja a mesma convencao das
  // outras pecas. Com o rotationY de -90 graus que os dados usam, os cabos
  // apontam para o meio da varanda e o engradado fica encostado no canto,
  // atras da churrasqueira.
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/corridor-scene.js para encostar a peca no canto da varanda e
  // para o solido de colisao, do mesmo jeito que
  // StoveFactory/FridgeFactory.width/height/depth.
  const FINAL_WIDTH = (ROTATED_MAX_X - ROTATED_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = (ROTATED_MAX_Y - ROTATED_MIN_Y) * MODEL_SCALE;
  const FINAL_DEPTH = (ROTATED_MAX_Z - ROTATED_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peca para a convencao do topo do arquivo: X e Z no
  // centro da base, Y com a base no chao. Com MODEL_YAW = Math.PI o giro
  // inverte X e Z, entao o deslocamento inverte de sinal junto.
  const MODEL_POSITION_X =
    (YAW_FLIPPED ? ROTATED_CENTER_X : -ROTATED_CENTER_X) * MODEL_SCALE;
  const MODEL_POSITION_Y = -ROTATED_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z =
    (YAW_FLIPPED ? ROTATED_CENTER_Z : -ROTATED_CENTER_Z) * MODEL_SCALE;

  // Tom em que o exterior amanhece: o MESMO `color` do reboco de dia da
  // varanda (porchPlasterDay em materials/material-library.js), para a
  // peca e o piso em que ela se apoia amanhecerem juntos.
  const DAY_TINT = 0xd9d2c4;

  // Loader unico e reaproveitado entre chamadas - mesma ideia das outras
  // fabricas (o decodificador Draco e caro de montar).
  let sharedLoader = null;
  let sharedDraco = null;
  let decoderSourceIndex = 0;

  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
      if (USES_DRACO) {
        if (typeof THREE.DRACOLoader === "function") {
          sharedDraco = new THREE.DRACOLoader();
          sharedDraco.setDecoderPath(DECODER_SOURCES[decoderSourceIndex]);
          sharedLoader.setDRACOLoader(sharedDraco);
        } else {
          // Nao derruba nada: sem o DRACOLoader o load cai no `onError` de
          // sempre e a varanda continua montada, so sem esta peca.
          console.error(
            "BarbecueGrillFactory: THREE.DRACOLoader nao esta carregado - a peca nao " +
              "vai aparecer. Confira o <script> do DRACOLoader em index.html."
          );
        }
      }
    }
    return sharedLoader;
  }

  // Descarta o loader atual e monta outro apontando para a proxima fonte
  // do decodificador. Devolve false quando as fontes acabaram.
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

  // Mesmo ajuste de textura das outras fabricas: filtro "nearest" e sem
  // mipmap para o pixel cru do visual PSX, e encoding linear para ficar
  // consistente com o resto do jogo. O .glb ja pede nearest no sampler
  // dele, mas mipmap e encoding nao vem de graca.
  function normalizeTextures(model) {
    model.traverse(function (node) {
      if (!node.isMesh || !node.material) {
        return;
      }
      const list = Array.isArray(node.material) ? node.material : [node.material];
      list.forEach(function (mat) {
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

  // Versao de DIA do material do arquivo: MeshBasicMaterial obrigatorio
  // (ver "Noite e dia" no topo e models/tree-forest-factory.js). Mesma
  // textura, mesmo `side`, nevoa ligada.
  function makeDayMaterial(mat) {
    return new THREE.MeshBasicMaterial({
      map: mat.map || null,
      color: DAY_TINT,
      side: mat.side,
      alphaTest: mat.alphaTest,
      transparent: false,
      fog: true,
    });
  }

  function applyTimeOfDay(state) {
    state.swaps.forEach(function (item) {
      item.mesh.material = state.day ? item.day : item.night;
    });
  }

  function loadInto(group, state) {
    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        // 1) Escala para o tamanho final no mundo do jogo.
        model.scale.setScalar(MODEL_SCALE);
        // 2) Para onde a frente aponta (ver MODEL_YAW acima).
        model.rotation.y = MODEL_YAW;
        // 3) Recentraliza: X e Z no centro da base, Y com a base no chao.
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        // Noite (o material do arquivo) e dia (o chapado), por malha.
        model.traverse(function (node) {
          if (!node.isMesh || !node.material || Array.isArray(node.material)) {
            return;
          }
          state.swaps.push({
            mesh: node,
            night: node.material,
            day: makeDayMaterial(node.material),
          });
        });

        group.add(model);
        // O horario pode ter sido decidido ANTES do .glb chegar.
        applyTimeOfDay(state);
      },
      undefined,
      function onError(error) {
        console.error("BarbecueGrillFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "BarbecueGrillFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group, state);
        }
      }
    );
  }

  function createBarbecueGrill() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2, e o rotulo
    // dela em editor/editor-registry.js).
    group.name = "BarbecueGrillPSX";

    const state = { day: false, swaps: [] };
    loadInto(group, state);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
      // Mesmo contrato de tudo que vive do lado de fora (a cena empurra
      // isto em `exteriorGrounds`, ver scenes/corridor-scene.js).
      setDaytime: function (daytime) {
        state.day = daytime !== false;
        applyTimeOfDay(state);
      },
      setMorning: function () {
        state.day = true;
        applyTimeOfDay(state);
      },
    };
  }

  return { createBarbecueGrill: createBarbecueGrill };
})();
