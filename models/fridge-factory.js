/**
 * models/fridge-factory.js
 * -------------------------------------------------
 * GELADEIRA da COZINHA - carregada a partir de um modelo .glb pronto
 * (assets/models/fridge_psx.glb), no MESMO sistema de importacao dos
 * outros modelos do jogo (ver models/stove-factory.js,
 * models/gas-cylinder-factory.js e models/nightstand-factory.js): o
 * mesmo THREE.GLTFLoader que ja carrega os outros .glb de
 * assets/models, o mesmo THREE.DRACOLoader acoplado que o fogao e o
 * botijao ja usam, o mesmo `normalizeTextures` (filtro nearest, sem
 * mipmap, encoding linear) e a mesma ideia de "medir a bounding box
 * nativa UMA vez, escrever as medidas aqui e deixar a cena so decidir
 * ONDE a peca fica". Nenhum carregador novo, nenhum shader novo,
 * nenhum sistema paralelo de 3D - foi exatamente o pedido: "ja tem
 * outros itens que foram implementados dessa forma, portanto use o
 * mesmo sistema, nao precisa criar algo novo".
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem
 * animacao, sem som, sem evento (pedido explicito: "e apenas um item
 * decorativo, sem interacoes, por enquanto") - mesmo tratamento do
 * fogao e do botijao ao lado (ver StoveFactory/GasCylinderFactory) e
 * dos moveis do MEU QUARTO: quem posiciona
 * (scenes/side-room-scene.js) so decide em que canto a peca encosta,
 * sem nenhuma entrada em `interactables`. Ainda assim entra na lista
 * de `solids` da cena - igual as outras duas - so para o jogador nao
 * atravessar a geladeira andando; isso e colisao FISICA, nao
 * "interacao" no sentido do InteractionSystem (sem contorno de
 * destaque, sem prompt de "Interagir", sem dialogo).
 *
 * ---------- Sobre o pacote em que o modelo chegou ----------
 * O .glb veio acompanhado de um preview proprio (preview.html, com o
 * modelo em base64 embutido) e de um `fridge-loader.js` - um modulo ES
 * que monta o proprio GLTFLoader/DRACOLoader, importando three.js
 * 0.160 por importmap de CDN. NADA dos dois entrou aqui, pelos MESMOS
 * motivos ja escritos em models/stove-factory.js e
 * models/gas-cylinder-factory.js:
 *
 *  - o jogo roda em three.js r128 com scripts globais (ver
 *    index.html), nao em modulos ES: `import * as THREE from 'three'`
 *    nao existe neste contexto. Usar o loader do pacote significaria
 *    carregar um SEGUNDO three.js na pagina, que e exatamente o
 *    "sistema novo" que o pedido descarta;
 *  - o loader do pacote troca o material do modelo por
 *    MeshLambertMaterial. Todo o cenario do jogo usa
 *    MeshStandardMaterial e e iluminado pelas luzes da casa (ver
 *    materials/material-library.js): manter o material que vem no
 *    .glb (Standard, via GLTFLoader) e o que faz a geladeira receber
 *    a mesma luz do fogao ao lado;
 *  - o preview.html so serve para olhar a peca fora do jogo.
 *
 * O que importava do pacote - a geometria Draco e a textura PSX 128x128
 * ja embutida no proprio .glb, com sampler NEAREST/REPEAT - veio de
 * graca dentro do arquivo. O .glb foi copiado bit a bit para
 * assets/models/fridge_psx.glb, sem reexportar nada.
 *
 * ---------- Geometria comprimida em Draco ----------
 * Terceiro modelo do jogo com a geometria comprimida em Draco
 * (KHR_draco_mesh_compression, listada como extensao *required* dentro
 * do arquivo: 33.372 vertices / 49.966 triangulos). Os dois primeiros
 * foram o fogao e o botijao, e o <script> do DRACOLoader ja esta em
 * index.html desde entao - nada de novo precisou entrar la por causa
 * desta peca.
 *
 * Continua sendo o MESMO loader dos outros modelos, so com o
 * THREE.DRACOLoader acoplado (`setDRACOLoader`) para ele saber
 * descomprimir. Cada fabrica monta o proprio loader, como todas as
 * outras deste diretorio ja fazem; o decodificador em si e baixado sob
 * demanda e, na segunda vez, sai do cache do navegador.
 *
 * Se o decodificador nao chegar (rede caida, CDN bloqueado), a
 * geladeira simplesmente nao aparece: a falha vai para o console, as
 * fontes alternativas sao tentadas em ordem (DECODER_SOURCES, abaixo)
 * e o boot continua identico - o grupo devolvido por createFridge()
 * nasce vazio e e preenchido de forma assincrona, mesmo comportamento
 * de todos os outros modelos importados.
 *
 * ---------- Convencao de espaco local ----------
 * Mesma convencao "centralizada" de StoveFactory/GasCylinderFactory
 * (objeto apoiado no chao), e nao a "Z = 0 e a parede" dos moveis de
 * encostar:
 *   - X = 0 e Z = 0 sao o CENTRO da base da geladeira;
 *   - Y = 0 e o chao (base da peca);
 *   - a frente (a porta, com o puxador) olha para +Z, mesma convencao
 *     de "frente" do resto do jogo (ver DoorFactory).
 *
 * Origem no centro da base porque o usuario avisou que pode querer
 * mudar a posicao pelo Editor depois: assim o gizmo gira a peca NO
 * LUGAR, em vez de varrer ela para fora do canto. Quem encosta a
 * geladeira no canto e scenes/side-room-scene.js, que recebe
 * largura/profundidade finais (`width`/`depth` do retorno) para
 * descontar a metade certa.
 * -------------------------------------------------
 */

window.FridgeFactory = (function () {
  const MODEL_URL = "assets/models/fridge_psx.glb";

  // ---------- Fontes do decodificador Draco ----------
  // Mesma lista, na mesma ordem, de models/stove-factory.js e
  // models/gas-cylinder-factory.js: primeiro o decodificador do proprio
  // three.js r128 (o MESMO CDN e a MESMA versao de onde index.html ja
  // baixa three.min.js, o GLTFLoader e o DRACOLoader), depois o do
  // Google como rede de seguranca se o jsdelivr estiver bloqueado.
  //
  // Para rodar 100% offline um dia: copie draco_wasm_wrapper.js,
  // draco_decoder.wasm e draco_decoder.js para uma pasta local
  // (ex.: libs/draco/) e ponha o caminho dela PRIMEIRO nesta lista - nas
  // TRES fabricas com Draco. Nada mais precisa mudar.
  const DECODER_SOURCES = [
    "https://cdn.jsdelivr.net/npm/three@0.128/examples/js/libs/draco/",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  ];

  // ---------- Medidas nativas do arquivo .glb ----------
  // Mesma ideia de StoveFactory/GasCylinderFactory: a bounding box de
  // `gltf.scene`, ou seja, JA com a hierarquia de nos resolvida pelo
  // GLTFLoader - inclusive a rotacao de +90 graus em X que vem "assada"
  // no unico no do arquivo (a conversao de eixos do exportador, a mesma
  // do fogao e do botijao). Nos eixos crus do arquivo o modelo esta
  // deitado ao longo de -Z; essa rotacao troca os eixos (y = -z, z = y)
  // e poe a peca de pe, com a base exatamente em y = 0.
  //
  // Medidas tiradas do proprio arquivo: o glTF obriga o accessor de
  // POSITION a trazer min/max, entao da para medir a peca sem
  // descomprimir a geometria Draco. Eixos CRUS do arquivo:
  //   X: -0.18582 a  0.19261
  //   Y: -0.20123 a  0.19423
  //   Z: -1.08023 a  0
  // Depois da rotacao do no (o que o jogo ve):
  //   X (largura):      -0.18582 a 0.19261 -> 0.378
  //   Y (altura):        0.0     a 1.08023 -> 1.080
  //   Z (profundidade): -0.20123 a 0.19423 -> 0.395
  const NATIVE_MIN_X = -0.185822993516922;
  const NATIVE_MAX_X = 0.19260799884796143;
  const NATIVE_MIN_Y = -0.20123499631881714;
  const NATIVE_MAX_Y = 0.1942339986562729;
  const NATIVE_MIN_Z = -1.0802290439605713;
  const NATIVE_MAX_Z = 0;

  // Os mesmos limites JA nos eixos do jogo (a rotacao de +90 graus em X
  // do no leva y -> -z e z -> y). Escrito assim, e nao com os numeros ja
  // trocados na mao, porque e o que deixa claro de onde cada medida sai -
  // mesma tecnica de ROTATED_* em models/gas-cylinder-factory.js e
  // models/wardrobe-factory.js.
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
  // Aqui tem reescala, como no botijao e no guarda-roupa (e diferente do
  // fogao, que chegou em metros e usa MODEL_SCALE = 1): o arquivo mede
  // 1.08 de altura por 0.378 x 0.395 de base. As PROPORCOES estao certas
  // (uma geladeira de verdade e ~2.8x mais alta que larga, e um pouco
  // mais funda que larga - o arquivo da 2.85x e 1.04x), so a escala
  // absoluta e que veio pequena: 1.08 de altura e altura de bancada, nao
  // de geladeira.
  //
  // A ancora escolhida foi a ALTURA, e a escala e UNIFORME (nunca
  // esticar so um eixo: distorceria a peca e a textura). Motivo de
  // ancorar na altura: e a medida que o jogador le, em primeira pessoa,
  // contra o fogao do mesmo comodo (0.92 de altura) e contra o
  // pe-direito (4.2, ver CorridorConfig.height).
  //
  // 1.6 = geladeira domestica de uma porta / frost free comum. Com essa
  // altura a base sai em 0.56 x 0.59 - praticamente a mesma pegada do
  // fogao (0.56 x 0.59), que e exatamente como as duas pecas ficam numa
  // cozinha de verdade: alinhadas na mesma profundidade de parede.
  const TARGET_HEIGHT = 1.6;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // ---------- Para onde a frente do modelo olha ----------
  // O arquivo tem UM no e UMA malha, sem nada no nome que diga qual lado
  // e a frente, e a base e quase quadrada (0.378 x 0.395), entao a
  // bounding box tambem nao diz. Assumido o MESMO lado do fogao e do
  // botijao, que sairam da mesma esteira de conversao (o generator do
  // arquivo e o mesmo, "PSX-Converter", e o no traz a mesma rotacao de
  // +90 graus em X): a frente cai em +Z depois da rotacao do no.
  //
  // Se dentro do jogo a peca aparecer de costas (puxador virado para a
  // parede), esta e a UNICA linha a mexer: 0 ou Math.PI. O recentramento
  // abaixo acompanha o giro sozinho, e 180 graus nao mudam
  // largura/profundidade, entao a colisao segue exata. (Para 90 graus
  // seria preciso trocar FINAL_WIDTH por FINAL_DEPTH tambem - nao
  // implementado porque nao ha uso: girar 90 graus e trabalho de
  // POSICIONAMENTO, e quem faz isso e a cena, ver `rotationY` em
  // scenes/side-room-scene.js.) Dando na mesma, o Editor tambem gira a
  // peca no lugar, sem tocar em codigo.
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/side-room-scene.js para encostar a peca no canto e para o
  // solido de colisao, do mesmo jeito que StoveFactory.width/height/
  // depth. Sao as medidas da BOUNDING BOX: 0.561 x 0.586 de base, 1.6 de
  // altura.
  const FINAL_WIDTH = (ROTATED_MAX_X - ROTATED_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = TARGET_HEIGHT;
  const FINAL_DEPTH = (ROTATED_MAX_Z - ROTATED_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peca para a convencao do comentario do topo: X e Z no
  // centro da base, Y com a base no chao. Com MODEL_YAW = Math.PI o giro
  // inverte X e Z, entao o deslocamento inverte de sinal junto.
  const MODEL_POSITION_X =
    (YAW_FLIPPED ? ROTATED_CENTER_X : -ROTATED_CENTER_X) * MODEL_SCALE;
  const MODEL_POSITION_Y = -ROTATED_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z =
    (YAW_FLIPPED ? ROTATED_CENTER_Z : -ROTATED_CENTER_Z) * MODEL_SCALE;

  // Loader unico e reaproveitado entre chamadas - mesma ideia de
  // StoveFactory/GasCylinderFactory (hoje existe uma geladeira so, mas o
  // decodificador Draco e caro de montar: reaproveitar o loader evita
  // instanciar o decodificador de novo se um dia houver mais de uma).
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
        // Nao derruba nada: sem o DRACOLoader o load cai no `onError` de
        // sempre e o comodo continua montado, so sem a geladeira (ver
        // comentario do topo).
        console.error(
          "FridgeFactory: THREE.DRACOLoader nao esta carregado - a " +
            "geladeira nao vai aparecer. Confira o <script> do DRACOLoader " +
            "em index.html."
        );
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

  // Mesmo ajuste de textura usado em StoveFactory/GasCylinderFactory:
  // filtro "nearest" e sem mipmap para o pixel "cru" do visual PSX, e
  // encoding linear para ficar consistente com o resto do jogo (que nao
  // usa sRGBEncoding em nenhuma outra textura). O .glb ja pede nearest
  // no sampler dele, mas mipmap e encoding nao vem de graca.
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

        // 1) Escala para o tamanho final no mundo do jogo (ver
        //    TARGET_HEIGHT acima).
        model.scale.setScalar(MODEL_SCALE);

        // 2) Para onde a frente aponta (ver MODEL_YAW acima).
        model.rotation.y = MODEL_YAW;

        // 3) Recentraliza: X e Z no centro da base, Y com a base no chao
        //    (ver convencao de espaco local no topo do arquivo).
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("FridgeFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "FridgeFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group);
        }
      }
    );
  }

  function createFridge() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2). Sem nome, o
    // id sairia de uma assinatura estrutural - que tambem funciona, mas
    // muda se a peca for reposicionada no codigo.
    group.name = "FridgePSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createFridge: createFridge };
})();
