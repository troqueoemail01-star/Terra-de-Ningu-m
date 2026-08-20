/**
 * models/stove-factory.js
 * -------------------------------------------------
 * Fogao da COZINHA - carregado a partir de um modelo .glb pronto
 * (assets/models/stove_psx.glb), no MESMO sistema de importacao dos
 * outros modelos do jogo (ver models/nightstand-factory.js,
 * models/trash-can-factory.js e models/wardrobe-factory.js): o mesmo
 * THREE.GLTFLoader que ja carrega os outros .glb de assets/models, o
 * mesmo `normalizeTextures` (filtro nearest, sem mipmap, encoding
 * linear) e a mesma ideia de "medir a bounding box nativa UMA vez,
 * escrever as medidas aqui e deixar a cena so decidir ONDE o movel
 * fica". Nenhum carregador novo, nenhum shader novo, nenhum sistema
 * paralelo de 3D.
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem
 * animacao, sem som, sem evento (pedido explicito do usuario: "apenas
 * um item decorativo, sem interacoes, por enquanto") - mesmo
 * tratamento do criado-mudo, da estante e da lata de lixo do quarto
 * (ver NightstandFactory/BookshelfFactory/TrashCanFactory): quem
 * posiciona (scenes/side-room-scene.js) so decide em que canto o movel
 * encosta, sem nenhuma entrada em `interactables`. Ainda assim entra na
 * lista de `solids` da cena - igual aos moveis do quarto - so para o
 * jogador nao atravessar o fogao andando; isso e colisao FISICA, nao
 * "interacao" no sentido do InteractionSystem (sem contorno de
 * destaque, sem prompt de "Interagir", sem dialogo).
 *
 * ---------- Sobre o pacote em que o modelo chegou ----------
 * O .glb veio acompanhado de um preview proprio (psx-render.js +
 * psx-glb-loader.js): um mini carregador de GLB e um shader PSX
 * (wobble de vertice, warp de textura afim, dither 15-bit) que rodam
 * fora do three.js do jogo. NADA disso entrou aqui, de proposito:
 *
 *  - o look PSX do jogo ja vem da propria renderizacao (resolucao
 *    interna baixa, texturas nearest sem mipmap, vinheta e scanlines
 *    de interface/layout.css);
 *  - todo o cenario usa MeshStandardMaterial e e iluminado pelas luzes
 *    da casa (ver materials/material-library.js). Trocar o material do
 *    fogao pelo shader do pacote deixaria SO ele com iluminacao
 *    propria, ignorando as luzes do comodo - o movel apareceria
 *    "chapado" no meio de um cenario escuro;
 *  - o mini carregador do pacote e um segundo sistema de import, que e
 *    exatamente o que o usuario pediu para NAO existir.
 *
 * A parte que importava do pacote e a TEXTURA, e ela ja vem embutida
 * no .glb em versao PSX (256x256, 15-bit, CLUT de 256 cores com dither
 * ordenado) - mesmo tratamento previo dos outros modelos importados do
 * jogo (ver comentario equivalente em models/wardrobe-factory.js): nao
 * existe nenhum efeito de dithering em tempo de execucao aqui, so o
 * `normalizeTextures` de sempre.
 *
 * ---------- A UNICA diferenca em relacao aos outros .glb: Draco ----------
 * Este e o primeiro modelo do jogo com a geometria COMPRIMIDA em Draco
 * (KHR_draco_mesh_compression, listada como extensao *required* dentro
 * do arquivo: 33.165 vertices / 50.000 triangulos em 231 KB). Os
 * outros .glb de assets/models sao crus, por isso o THREE.GLTFLoader
 * sozinho sempre bastou.
 *
 * Para ele saber descomprimir, o GLTFLoader precisa de um
 * THREE.DRACOLoader acoplado (`setDRACOLoader`) - e so isso: continua
 * sendo o MESMO loader, o mesmo .glb dentro de assets/models e o mesmo
 * caminho de codigo dos outros modelos, so com a extensao habilitada.
 * O script do DRACOLoader entra em index.html logo depois do
 * GLTFLoader, do MESMO CDN e da MESMA versao do three.js que o jogo ja
 * usa (r128), e o decodificador em si e baixado sob demanda, na
 * primeira vez que este arquivo carrega o modelo.
 *
 * O jogo ja depende de internet para o proprio three.js (ver
 * index.html), entao isso nao muda o que o jogo exige para rodar. E se
 * o decodificador nao chegar (rede caida, CDN bloqueado), o fogao
 * simplesmente nao aparece: a falha vai para o console, as fontes
 * alternativas sao tentadas em ordem (DECODER_SOURCES, abaixo) e o
 * boot continua identico - o grupo devolvido por createStove() nasce
 * vazio e e preenchido de forma assincrona, mesmo comportamento de
 * todos os outros modelos importados.
 *
 * ---------- Convencao de espaco local ----------
 * Mesma convencao "centralizada" de TrashCanFactory/PottedPlantFactory
 * (objeto apoiado no chao), e nao a "Z = 0 e a parede" de
 * criado-mudo/estante/guarda-roupas:
 *   - X = 0 e Z = 0 sao o CENTRO da base do fogao;
 *   - Y = 0 e o chao (base do movel);
 *   - a FRENTE do fogao (painel e porta do forno) olha para +Z, mesma
 *     convencao de "frente" do resto do jogo (ver DoorFactory).
 *
 * Por que centralizado, e nao encostado como os outros moveis de
 * parede: o usuario avisou que pode querer mudar a posicao pelo Editor
 * depois. Com a origem no centro da base, girar a peca com o gizmo
 * gira ela NO LUGAR; com a origem na face de tras, o mesmo giro
 * varreria o fogao para fora do canto e ele teria de ser reposicionado
 * na mao. Quem encosta a peca no canto e scenes/side-room-scene.js,
 * que ja recebe a largura/profundidade finais (`width`/`depth` do
 * retorno) para descontar a metade certa.
 * -------------------------------------------------
 */

window.StoveFactory = (function () {
  const MODEL_URL = "assets/models/stove_psx.glb";

  // ---------- Fontes do decodificador Draco ----------
  // Tentadas em ordem, uma por falha de carregamento (ver
  // `nextDecoderSource` abaixo). A primeira e a do proprio three.js
  // r128 - a MESMA versao e o MESMO CDN de onde index.html ja baixa o
  // three.min.js e o GLTFLoader; a segunda e a do Google, fonte oficial
  // do decodificador, como rede de seguranca se o jsdelivr estiver
  // bloqueado.
  //
  // Para rodar 100% offline um dia: copie draco_wasm_wrapper.js,
  // draco_decoder.wasm e draco_decoder.js para uma pasta local
  // (ex.: libs/draco/) e ponha o caminho dela PRIMEIRO nesta lista.
  // Nada mais precisa mudar.
  const DECODER_SOURCES = [
    "https://cdn.jsdelivr.net/npm/three@0.128/examples/js/libs/draco/",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  ];

  // ---------- Medidas nativas do arquivo .glb ----------
  // Mesma ideia de NightstandFactory/TrashCanFactory: a bounding box de
  // `gltf.scene`, ou seja, JA com a hierarquia de nos resolvida pelo
  // GLTFLoader - inclusive a rotacao de +90 graus em X que vem "assada"
  // no unico no do arquivo (a conversao de eixos do exportador). Nos
  // eixos crus do arquivo o modelo esta deitado; depois dessa rotacao
  // ele fica de pe, com a base exatamente em y = 0 - mesma sorte de
  // BedFactory/NightstandFactory, sem nenhum ajuste de "chao" fora do
  // comum.
  //
  // Medidas tiradas do proprio arquivo: o glTF obriga o accessor de
  // POSITION a trazer min/max, entao da para medir a peca sem
  // descomprimir a geometria Draco. Depois da rotacao do no:
  //   X (largura):      -0.28626 a 0.27305  -> 0.559
  //   Y (altura):        0.0     a 0.91589  -> 0.916
  //   Z (profundidade): -0.29543 a 0.29276  -> 0.588
  const NATIVE_MIN_X = -0.2862559855;
  const NATIVE_MAX_X = 0.2730549872;
  const NATIVE_MIN_Y = 0;
  const NATIVE_MAX_Y = 0.9158869982;
  const NATIVE_MIN_Z = -0.2954309881;
  const NATIVE_MAX_Z = 0.2927570045;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;

  // Sem reescala: o arquivo ja chega praticamente em metros (0.92 de
  // altura, 0.56 x 0.59 de base - a medida de um fogao de quatro bocas
  // de verdade) e isso ja bate com a escala do resto do jogo, onde a
  // mobilia e 1:1 (cama e criado-mudo tambem usam MODEL_SCALE = 1 e a
  // escrivaninha tem DESK_HEIGHT = 0.8). Nada de TARGET_HEIGHT como em
  // WardrobeFactory/TrashCanFactory, cujos arquivos vinham em unidades
  // arbitrarias.
  const MODEL_SCALE = 1;

  // ---------- Para onde a frente do modelo olha ----------
  // O arquivo tem UM no e UMA malha, sem nada no nome que diga qual
  // lado e a frente, e a base e quase quadrada (0.559 x 0.588), entao a
  // bounding box tambem nao diz. Pela camera padrao do preview que veio
  // no pacote (ela nasce olhando o modelo de frente e um pouco pela
  // esquerda), a frente cai em +Z depois da rotacao do no - e e isso
  // que o resto deste arquivo assume.
  //
  // Se dentro do jogo a peca aparecer de costas (painel e forno virados
  // para a parede), esta e a UNICA linha a mexer: 0 ou Math.PI. O
  // recentramento abaixo acompanha o giro sozinho, e 180 graus nao
  // mudam largura/profundidade, entao a colisao segue exata. (Para 90
  // graus seria preciso trocar FINAL_WIDTH por FINAL_DEPTH tambem - nao
  // implementado porque nao ha uso: girar 90 graus e trabalho de
  // POSICIONAMENTO, e quem faz isso e a cena, ver `rotationY` em
  // scenes/side-room-scene.js.)
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/side-room-scene.js para encostar o fogao no canto e para o
  // solido de colisao, do mesmo jeito que NightstandFactory.width/
  // height/depth.
  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = (NATIVE_MAX_Y - NATIVE_MIN_Y) * MODEL_SCALE;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peca para a convencao do comentario do topo: X e Z
  // no centro da base, Y com a base no chao. Com MODEL_YAW = Math.PI o
  // giro inverte X e Z, entao o deslocamento inverte de sinal junto.
  const MODEL_POSITION_X =
    (YAW_FLIPPED ? NATIVE_CENTER_X : -NATIVE_CENTER_X) * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z =
    (YAW_FLIPPED ? NATIVE_CENTER_Z : -NATIVE_CENTER_Z) * MODEL_SCALE;

  // Loader unico e reaproveitado entre chamadas - mesma ideia de
  // NightstandFactory/TrashCanFactory (hoje existe um fogao so, mas o
  // decodificador Draco e caro de montar: reaproveitar o loader evita
  // baixar e instanciar o decodificador de novo se um dia houver mais
  // de um).
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
        // sempre e o comodo continua montado, so sem o fogao (ver
        // comentario do topo).
        console.error(
          "StoveFactory: THREE.DRACOLoader nao esta carregado - o fogao " +
            "nao vai aparecer. Confira o <script> do DRACOLoader em index.html."
        );
      }
    }
    return sharedLoader;
  }

  // Descarta o loader atual e monta outro apontando para a proxima
  // fonte do decodificador. Devolve false quando as fontes acabaram.
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

  // Mesmo ajuste de textura usado em NightstandFactory/TrashCanFactory:
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

        // 1) Escala para o tamanho final no mundo do jogo (hoje 1:1,
        //    ver comentario de MODEL_SCALE acima).
        model.scale.setScalar(MODEL_SCALE);

        // 2) Para onde a frente aponta (ver MODEL_YAW acima).
        model.rotation.y = MODEL_YAW;

        // 3) Recentraliza: X e Z no centro da base, Y com a base no
        //    chao (ver convencao de espaco local no topo do arquivo).
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("StoveFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "StoveFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group);
        }
      }
    );
  }

  function createStove() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2). Sem nome, o
    // id sairia de uma assinatura estrutural - que tambem funciona, mas
    // muda se a peca for reposicionada no codigo.
    group.name = "StovePSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createStove: createStove };
})();
