/**
 * models/clothesline-factory.js
 * -------------------------------------------------
 * O VARAL COM ROUPA DA VARANDA - terceira das quatro pecas decorativas da
 * varanda da entrada, e a PRIMEIRA peca importada do jogo que fica
 * pendurada no AR do lado de fora (as duas primeiras penduradas foram a
 * espelheira e a toalha do banheiro, ver scenes/side-room-scene.js).
 * Mesmo sistema de importacao de .glb de todos os outros modelos; a
 * documentacao completa do caminho esta em models/porch-plant-factory.js.
 *
 * Peca puramente DECORATIVA: sem interacao, sem animacao (nada balanca no
 * vento - o pacote nao traz animacao nenhuma e o pedido foi so
 * decoracao), sem som. E a UNICA das quatro que tambem NAO entra em
 * `solids`: ela e um pano no ar, na altura do peito, sobre o caminho que
 * se anda na lateral da varanda, e a colisao do jogo e um AABB sem eixo Y
 * (ver scripts/collision.js) - um solido aqui viraria uma parede
 * invisivel. Isso e dado, nao regra: `solid: true` nos dados da varanda
 * (scenes/corridor-config.js) liga a colisao dela.
 *
 * ---------- O pacote (varal-psx-threejs.zip) ----------
 * Entrou o varal.glb "slim" (so geometria Draco, 50.000 triangulos, os
 * mapas PBR removidos sem tocar em um vertice) com a textura PSX 256x256
 * (128 cores) EMBUTIDA em assets/models/clothesline_psx.glb, sampler
 * NEAREST/REPEAT, material novo doubleSided (a roupa e casca aberta).
 *
 * NAO entrou: varal-psx.js (material PSX + loader que monta o proprio
 * GLTFLoader), varal-model.js e varal-tex.js (o modelo e a textura em
 * base64/data URI, para rodar em file://), preview.html, exemplo-uso.html
 * e varal-original.glb (o arquivo cheio, com os mapas PBR de 1024). Os
 * motivos sao os de sempre: modulos/scripts com outra versao de three.js,
 * shader com luz propria e o look PSX que ja vem da renderizacao do jogo.
 *
 * Sobre o V da textura: o preview deste pacote carrega a imagem com
 * flipY = true, mas a malha e a UV do arquivo nao foram alteradas (UV de
 * glTF) e a textura PSX esta na MESMA orientacao da base color original
 * (conferido pixel a pixel contra varal-original.glb: erro medio ~2 na
 * orientacao direta contra ~42 na invertida). Logo a imagem entra no .glb
 * sem inversao, como manda o glTF - ver a secao do V em
 * models/porch-plant-factory.js, inclusive o conserto de uma linha caso
 * algum dia apareca espelhada.
 * -------------------------------------------------
 */

window.ClotheslineFactory = (function () {
  const MODEL_URL = "assets/models/clothesline_psx.glb";

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
  const NATIVE_MIN_X = -0.5441880226135254;
  const NATIVE_MAX_X = 0.5829520225524902;
  const NATIVE_MIN_Y = -0.01715799979865551;
  const NATIVE_MAX_Y = 0.014290999621152878;
  const NATIVE_MIN_Z = -0.4115779995918274;
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
  // Sem reescala (MODEL_SCALE = 1): 1.127 de vao por 0.412 de altura e
  // 0.031 de espessura. E um TRECHO de varal com a roupa pendurada, nao um
  // varal com pes - por isso ele nasce no ar (ver `elevation` nos dados da
  // varanda, em scenes/corridor-config.js) e por isso a peca e quase
  // plana. Esticar a altura para "roupa maior" cresceria o vao junto (a
  // escala e uniforme) e ele deixaria de caber entre os dois pilares da
  // lateral da varanda, que tem 1.95 de folga.
  const MODEL_SCALE = 1;

  // ---------- Para onde a frente do modelo olha ----------
  // Peca simetrica de frente para tras (uma corda com roupa): a frente em
  // +Z e so a convencao. O que importa aqui e o EIXO - com rotationY de
  // -90 graus (o valor que os dados usam) o vao de 1.127 corre ao longo do
  // Z do mundo, ou seja na lateral da varanda, entre os dois pilares.
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
            "ClotheslineFactory: THREE.DRACOLoader nao esta carregado - a peca nao " +
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
        console.error("ClotheslineFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "ClotheslineFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group, state);
        }
      }
    );
  }

  function createClothesline() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2, e o rotulo
    // dela em editor/editor-registry.js).
    group.name = "ClotheslinePSX";

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

  return { createClothesline: createClothesline };
})();
