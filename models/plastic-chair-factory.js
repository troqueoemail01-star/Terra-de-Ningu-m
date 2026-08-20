/**
 * models/plastic-chair-factory.js
 * -------------------------------------------------
 * A CADEIRA DE PLASTICO DA VARANDA - segunda das quatro pecas
 * decorativas da varanda da entrada. Mesmo sistema de importacao de .glb
 * de todos os outros modelos do jogo, e a documentacao completa do
 * caminho (loader, Draco, textura embutida, convencao de espaco local e o
 * contrato de noite/dia do lado de fora) esta em
 * models/porch-plant-factory.js - aqui ficam so as diferencas.
 *
 * CUIDADO com o nome: `window.ChairFactory` (models/chair-factory.js) e
 * OUTRA peca - a "Cadeira com roupas" do MEU QUARTO. Esta e a cadeira de
 * plastico monobloco da varanda.
 *
 * Peca puramente DECORATIVA: sem interacao, sem outline, sem animacao,
 * sem som ("Sao apenas itens decorativos, sem interacoes, (Por
 * enquanto)"). Entra em `solids` so para o jogador nao atravessar a
 * cadeira andando.
 *
 * ---------- O pacote (cadeira-psx-threejs.zip) ----------
 * O .glb do pacote (assets/cadeira.glb) chega com a geometria Draco e um
 * material sem imagem (os mapas PBR foram removidos pelo autor, sem tocar
 * em um vertice). A textura PSX 256x256 (32 cores, dither 4x4) morava
 * solta ao lado e foi EMBUTIDA em assets/models/plastic_chair_psx.glb,
 * com sampler NEAREST/REPEAT, no material que o arquivo ja trazia
 * (doubleSided, metalness 0, roughness 1). Nada mais mudou.
 *
 * O resto do pacote NAO entrou, pelos mesmos motivos de sempre: src/
 * (PSXMaterial, PSXPipeline, PSXMeshLoader, orbit, app) e um motor PSX em
 * modulos ES com three.js 0.160 por importmap e luz propria fixa, o
 * index.html e so preview, tools/bake-geometry.html gera um formato
 * proprio (.psxm) e reference/ tem o glb original com os mapas PBR de
 * 1024. O look PSX daqui vem da renderizacao do jogo.
 *
 * Este e o pacote que ACERTA o V da textura com todas as letras
 * ("UV de glTF", src/PSXMaterial.js, flipY = false): e a confirmacao de
 * que a imagem entra no .glb SEM inversao - ver a secao do V em
 * models/porch-plant-factory.js.
 * -------------------------------------------------
 */

window.PlasticChairFactory = (function () {
  const MODEL_URL = "assets/models/plastic_chair_psx.glb";

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
  const USES_DRACO = true;

  // ---------- Medidas nativas do arquivo .glb ----------
  // Eixos CRUS do arquivo (ver a nota da planta sobre como foram medidos):
  const NATIVE_MIN_X = -0.26245298981666565;
  const NATIVE_MAX_X = 0.261013001203537;
  const NATIVE_MIN_Y = -0.25594499707221985;
  const NATIVE_MAX_Y = 0.3515549898147583;
  const NATIVE_MIN_Z = -0.9269890189170837;
  const NATIVE_MAX_Z = 0.0;

  // Os mesmos limites JA nos eixos do jogo: o unico no do arquivo traz uma
  // rotacao de +90 graus em X (a conversao de eixos do exportador, a mesma
  // do fogao, do botijao e da geladeira), e ela leva y -> -z e z -> y.
  // Escrito assim, e nao com os numeros ja trocados na mao, porque e o que
  // deixa claro de onde cada medida sai - mesma tecnica de ROTATED_* em
  // models/fridge-factory.js.
  const ROTATED_MIN_X = NATIVE_MIN_X;
  const ROTATED_MAX_X = NATIVE_MAX_X;
  const ROTATED_MIN_Y = -NATIVE_MAX_Z;
  const ROTATED_MAX_Y = -NATIVE_MIN_Z;
  const ROTATED_MIN_Z = NATIVE_MIN_Y;
  const ROTATED_MAX_Z = NATIVE_MAX_Y;
  const ROTATED_CENTER_X = (ROTATED_MIN_X + ROTATED_MAX_X) / 2;
  const ROTATED_CENTER_Z = (ROTATED_MIN_Z + ROTATED_MAX_Z) / 2;

  // ---------- Escala ----------
  // Sem reescala (MODEL_SCALE = 1): o pacote diz, e a bounding box
  // confirma, que a cadeira chega na escala real - 0.523 x 0.608 de base
  // por 0.927 de altura, os 52 x 93 x 61 cm de uma cadeira de plastico
  // monobloco. Mexer na escala aqui seria inventar problema.
  const MODEL_SCALE = 1;

  // ---------- Para onde a frente do modelo olha ----------
  // A base e quase simetrica em X (-0.262 / +0.261) e o modelo estica mais
  // para +Z (0.352) do que para -Z (0.256) nos eixos do jogo - o encosto
  // inclinado. Assumida a mesma convencao das outras pecas importadas: a
  // frente do assento em +Z. Se dentro do jogo ela aparecer de costas,
  // esta e a UNICA linha a mexer (0 ou Math.PI); a cena tambem gira a
  // peca por dado (`rotationY` em scenes/corridor-config.js) e o Editor
  // gira no lugar.
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
            "PlasticChairFactory: THREE.DRACOLoader nao esta carregado - a peca nao " +
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
        console.error("PlasticChairFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "PlasticChairFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group, state);
        }
      }
    );
  }

  function createPlasticChair() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2, e o rotulo
    // dela em editor/editor-registry.js).
    group.name = "PlasticChairPSX";

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

  return { createPlasticChair: createPlasticChair };
})();
