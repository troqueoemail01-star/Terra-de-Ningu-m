/**
 * models/fruit-table-factory.js
 * -------------------------------------------------
 * MESA (com as frutas em cima) da COZINHA - carregada a partir de um
 * modelo .glb pronto (assets/models/fruit_table_psx.glb), no MESMO
 * sistema de importacao dos outros modelos do jogo (ver
 * models/fridge-factory.js, models/stove-factory.js e
 * models/gas-cylinder-factory.js): o mesmo THREE.GLTFLoader que ja
 * carrega os outros .glb de assets/models, o mesmo THREE.DRACOLoader
 * acoplado que o fogao, o botijao e a geladeira ja usam, o mesmo
 * `normalizeTextures` (filtro nearest, sem mipmap, encoding linear) e a
 * mesma ideia de "medir a bounding box nativa UMA vez, escrever as
 * medidas aqui e deixar a cena so decidir ONDE a peca fica". Nenhum
 * carregador novo, nenhum shader novo, nenhum sistema paralelo de 3D -
 * foi exatamente o pedido: "ja tem outros itens que foram implementados
 * dessa forma, portanto use o mesmo sistema, nao precisa criar algo
 * novo".
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem evento (pedido explicito: "e apenas um item decorativo,
 * sem interacoes, por enquanto") - mesmo tratamento do fogao, do
 * botijao e da geladeira do mesmo comodo e dos moveis do MEU QUARTO:
 * quem posiciona (scenes/side-room-scene.js) so decide em que canto a
 * peca encosta, sem nenhuma entrada em `interactables`. Ainda assim
 * entra na lista de `solids` da cena - igual as outras tres - so para o
 * jogador nao atravessar a mesa andando; isso e colisao FISICA, nao
 * "interacao" no sentido do InteractionSystem (sem contorno de
 * destaque, sem prompt de "Interagir", sem dialogo).
 *
 * ---------- Sobre o pacote em que o modelo chegou ----------
 * O .glb veio acompanhado de um preview proprio (index.html + README.txt,
 * com OrbitControls, render em baixa resolucao, vertex snapping e um
 * passe de dithering para simular o visual PS1). NADA do preview entrou
 * aqui, pelos MESMOS motivos ja escritos nas outras tres fabricas da
 * COZINHA:
 *
 *  - o preview roda em three.js 0.16x por importmap/modulos ES; o jogo
 *    roda em three.js r128 com scripts globais (ver index.html). Usar o
 *    codigo do preview significaria carregar um SEGUNDO three.js na
 *    pagina, que e exatamente o "sistema novo" que o pedido descarta;
 *  - o efeito PS1 do preview e por peca (shader proprio + render target
 *    proprio). No jogo o visual PSX ja e do JOGO INTEIRO (resolucao
 *    interna baixa, vinheta, scanlines e motion blur, ver index.html e
 *    effects/motion-blur.js): a mesa entra nele de graca, como as outras
 *    pecas importadas. Duas camadas do mesmo efeito so brigariam entre
 *    si;
 *  - o preview troca/embrulha o material do modelo. Todo o cenario do
 *    jogo usa MeshStandardMaterial e e iluminado pelas luzes da casa
 *    (ver materials/material-library.js): manter o material que vem no
 *    .glb (Standard, via GLTFLoader) e o que faz a mesa receber a mesma
 *    luz da geladeira e do fogao ao lado.
 *
 * O que importava do pacote - a geometria Draco e as texturas PSX ja
 * embutidas no proprio .glb - veio de graca dentro do arquivo. O .glb foi
 * copiado bit a bit para assets/models/fruit_table_psx.glb, sem
 * reexportar nada.
 *
 * ---------- Texturas em WebP (EXT_texture_webp) ----------
 * Primeiro modelo do jogo cujas imagens chegaram em WebP em vez de PNG:
 * o arquivo declara EXT_texture_webp como extensao *required* (cor
 * 128x128 e metalico/rugosidade 128x128 no estilo PSX, mais um normal
 * map 1024x1024 que o pacote manteve em alta resolucao de proposito, ver
 * o README do pacote).
 *
 * Nao precisa de nada novo: o GLTFLoader le EXT_texture_webp desde o
 * r122 (o jogo esta no r128), entao e o MESMO loader dos outros .glb,
 * sem plugin, sem script extra em index.html e sem reconverter imagem.
 * O unico requisito e o navegador decodificar WebP - Chrome/Android e
 * iOS 14+ decodificam, e este e um jogo mobile. Se um dia um navegador
 * antigo abrir o jogo, a mesa simplesmente nao aparece (a falha vai para
 * o console) e o resto do comodo continua igual, mesmo comportamento de
 * qualquer outro modelo importado que nao carregue.
 *
 * O material do arquivo tambem usa KHR_materials_specular, que o r128
 * nao le: por nao ser *required*, o loader ignora a extensao em silencio
 * e a peca fica com o Standard de sempre (cor + normal +
 * metalico/rugosidade). Nada a fazer.
 *
 * ---------- Geometria comprimida em Draco ----------
 * Quarto modelo do jogo com a geometria comprimida em Draco
 * (KHR_draco_mesh_compression, listada como extensao *required* dentro
 * do arquivo: 32.018 vertices / 50.000 triangulos). Os tres primeiros
 * foram o fogao, o botijao e a geladeira, e o <script> do DRACOLoader ja
 * esta em index.html desde entao - nada de novo precisou entrar la por
 * causa desta peca.
 *
 * Continua sendo o MESMO loader dos outros modelos, so com o
 * THREE.DRACOLoader acoplado (`setDRACOLoader`) para ele saber
 * descomprimir. Cada fabrica monta o proprio loader, como todas as
 * outras deste diretorio ja fazem; o decodificador em si e baixado sob
 * demanda e, na segunda vez, sai do cache do navegador.
 *
 * Se o decodificador nao chegar (rede caida, CDN bloqueado), a mesa
 * simplesmente nao aparece: a falha vai para o console, as fontes
 * alternativas sao tentadas em ordem (DECODER_SOURCES, abaixo) e o boot
 * continua identico - o grupo devolvido por createFruitTable() nasce
 * vazio e e preenchido de forma assincrona, mesmo comportamento de todos
 * os outros modelos importados.
 *
 * ---------- Convencao de espaco local ----------
 * Mesma convencao "centralizada" de StoveFactory/GasCylinderFactory/
 * FridgeFactory (objeto apoiado no chao), e nao a "Z = 0 e a parede" dos
 * moveis de encostar:
 *   - X = 0 e Z = 0 sao o CENTRO da base da mesa;
 *   - Y = 0 e o chao (base dos pes);
 *   - a "frente" (o lado comprido da mesa) olha para +Z, mesma convencao
 *     de frente do resto do jogo (ver DoorFactory).
 *
 * Origem no centro da base porque o usuario avisou que pode querer mudar
 * a posicao pelo Editor depois: assim o gizmo gira a peca NO LUGAR, em
 * vez de varrer ela para fora do canto. Quem encosta a mesa no canto e
 * scenes/side-room-scene.js, que recebe largura/profundidade finais
 * (`width`/`depth` do retorno) para descontar a metade certa.
 * -------------------------------------------------
 */

window.FruitTableFactory = (function () {
  const MODEL_URL = "assets/models/fruit_table_psx.glb";

  // ---------- Fontes do decodificador Draco ----------
  // Mesma lista, na mesma ordem, de models/stove-factory.js,
  // models/gas-cylinder-factory.js e models/fridge-factory.js: primeiro o
  // decodificador do proprio three.js r128 (o MESMO CDN e a MESMA versao
  // de onde index.html ja baixa three.min.js, o GLTFLoader e o
  // DRACOLoader), depois o do Google como rede de seguranca se o jsdelivr
  // estiver bloqueado.
  //
  // Para rodar 100% offline um dia: copie draco_wasm_wrapper.js,
  // draco_decoder.wasm e draco_decoder.js para uma pasta local
  // (ex.: libs/draco/) e ponha o caminho dela PRIMEIRO nesta lista - nas
  // QUATRO fabricas com Draco. Nada mais precisa mudar.
  const DECODER_SOURCES = [
    "https://cdn.jsdelivr.net/npm/three@0.128/examples/js/libs/draco/",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  ];

  // ---------- Medidas nativas do arquivo .glb ----------
  // Mesma ideia das outras tres pecas da COZINHA: a bounding box de
  // `gltf.scene`, ou seja, JA com a hierarquia de nos resolvida pelo
  // GLTFLoader - inclusive a rotacao de +90 graus em X que vem "assada"
  // no unico no do arquivo (a conversao de eixos do exportador, a mesma
  // do fogao, do botijao e da geladeira). Nos eixos crus do arquivo o
  // modelo esta deitado ao longo de -Z; essa rotacao troca os eixos
  // (y = -z, z = y) e poe a peca de pe, com a base exatamente em y = 0.
  //
  // Medidas tiradas do proprio arquivo: o glTF obriga o accessor de
  // POSITION a trazer min/max, entao da para medir a peca sem
  // descomprimir a geometria Draco. Eixos CRUS do arquivo:
  //   X: -0.53757 a  0.53323
  //   Y: -0.27417 a  0.27647
  //   Z: -0.50156 a  0
  // Depois da rotacao do no (o que o jogo ve):
  //   X (largura):      -0.53757 a 0.53323 -> 1.071
  //   Y (altura):        0.0     a 0.50156 -> 0.502
  //   Z (profundidade): -0.27417 a 0.27647 -> 0.551
  const NATIVE_MIN_X = -0.5375679731369019;
  const NATIVE_MAX_X = 0.5332260131835938;
  const NATIVE_MIN_Y = -0.2741680145263672;
  const NATIVE_MAX_Y = 0.2764680087566376;
  const NATIVE_MIN_Z = -0.5015599727630615;
  const NATIVE_MAX_Z = 0;

  // Os mesmos limites JA nos eixos do jogo (a rotacao de +90 graus em X
  // do no leva y -> -z e z -> y). Escrito assim, e nao com os numeros ja
  // trocados na mao, porque e o que deixa claro de onde cada medida sai -
  // mesma tecnica de ROTATED_* em models/fridge-factory.js,
  // models/gas-cylinder-factory.js e models/wardrobe-factory.js.
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
  // Aqui tem reescala, como no botijao, no guarda-roupa e na geladeira (e
  // diferente do fogao, que chegou em metros e usa MODEL_SCALE = 1): o
  // arquivo mede 1.07 x 0.55 de base por 0.50 de altura. Essa altura e a
  // do CONJUNTO (mesa + o que esta em cima dela), e meio metro e altura
  // de mesinha de centro, nao de mesa de cozinha.
  //
  // A ancora escolhida foi a ALTURA, e a escala e UNIFORME (nunca esticar
  // so um eixo: distorceria a peca e a textura). Motivo de ancorar na
  // altura: e a medida que o jogador le, em primeira pessoa, contra a
  // escrivaninha do corredor (DeskFactory.DESK_HEIGHT = 0.8, o tampo de
  // referencia do jogo), contra o fogao do mesmo comodo (0.92) e contra o
  // pe-direito (4.2, ver CorridorConfig.height).
  //
  // 0.9 = a bounding box INTEIRA, com a fruteira e as garrafas em cima da
  // mesa; o TAMPO em si cai um pouco abaixo disso, na faixa de 0.7 a 0.75
  // que e a de uma mesa de jantar de verdade, na mesma leitura da
  // escrivaninha (0.8) e da bancada do fogao (0.92). Com essa altura a
  // base sai em 1.92 x 0.99, uma mesa de cozinha de familia - cabe folgada
  // no comodo (7.7 x 4.8) e sobra 0.68 entre ela e o vao da porta (ver a
  // conta em scenes/side-room-scene.js).
  //
  // Se ela parecer grande ou pequena demais dentro do jogo, esta e a
  // UNICA linha a mexer: largura, profundidade, recentramento e caixa de
  // colisao saem todos dela. Dando na mesma, o Editor tambem escala a
  // peca no lugar, sem tocar em codigo (ver editor/README.md).
  const TARGET_HEIGHT = 0.9;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // ---------- Para onde a frente do modelo olha ----------
  // A mesa e quase simetrica (os dois lados compridos leem igual), entao
  // "frente" aqui vale so para a convencao de espaco local: assumido o
  // MESMO lado das outras tres pecas da COZINHA, que sairam da mesma
  // esteira de conversao (o no traz a mesma rotacao de +90 graus em X) -
  // a frente cai em +Z depois da rotacao do no.
  //
  // Se um dia a arrumacao das frutas ficar melhor virada para o outro
  // lado, esta e a UNICA linha a mexer: 0 ou Math.PI. O recentramento
  // abaixo acompanha o giro sozinho, e 180 graus nao mudam
  // largura/profundidade, entao a colisao segue exata. (Para 90 graus
  // seria preciso trocar FINAL_WIDTH por FINAL_DEPTH tambem - nao
  // implementado porque nao ha uso: girar 90 graus e trabalho de
  // POSICIONAMENTO, e quem faz isso e a cena, ver `rotationY` em
  // scenes/side-room-scene.js.)
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/side-room-scene.js para encostar a peca no canto e para o
  // solido de colisao, do mesmo jeito que StoveFactory/FridgeFactory
  // .width/.height/.depth. Sao as medidas da BOUNDING BOX: 1.92 x 0.99 de
  // base, 0.9 de altura total.
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

  // Nome da malha de dentro do modelo. O arquivo chama o unico no dele de
  // "node_0" (nome generico do conversor, o mesmo caso do .glb da
  // geladeira), o que apareceria assim no painel de hierarquia do Editor.
  // Renomear na hora de carregar deixa a arvore legivel e o id do Editor
  // estavel e com significado - ver "Identidade dos objetos" em
  // editor/README.md e o dicionario NAME_LABELS de
  // editor/editor-registry.js. Nao muda o arquivo em disco e nao muda
  // geometria nenhuma.
  const MESH_NAME = "fruit_table_psx";

  // Loader unico e reaproveitado entre chamadas - mesma ideia das outras
  // tres fabricas com Draco (hoje existe uma mesa so, mas o decodificador
  // Draco e caro de montar: reaproveitar o loader evita instanciar o
  // decodificador de novo se um dia houver mais de uma).
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
        // sempre e o comodo continua montado, so sem a mesa (ver
        // comentario do topo).
        console.error(
          "FruitTableFactory: THREE.DRACOLoader nao esta carregado - a mesa " +
            "nao vai aparecer. Confira o <script> do DRACOLoader em " +
            "index.html."
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

  // Mesmo ajuste de textura usado nas outras tres pecas da COZINHA:
  // filtro "nearest" e sem mipmap para o pixel "cru" do visual PSX, e
  // encoding linear para ficar consistente com o resto do jogo (que nao
  // usa sRGBEncoding em nenhuma outra textura).
  //
  // Aqui isso conta mais que nas outras: o sampler deste .glb pede filtro
  // LINEAR com mipmap (as outras pecas ja vinham pedindo NEAREST), entao e
  // esta funcao que devolve o pixelado PSX da textura de cor. O normal map
  // (1024x1024, mantido em alta no pacote) nao e tocado, exatamente como
  // nas outras fabricas: ele nao carrega o "pixel" visivel da peca e os
  // mipmaps dele evitam o chuvisco da iluminacao a distancia.
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

        // Nome legivel no lugar do "node_0" do arquivo (ver MESH_NAME).
        model.name = MESH_NAME;
        model.traverse(function (node) {
          if (node !== model && node.isMesh && !node.name) {
            node.name = MESH_NAME;
          }
        });

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
        console.error("FruitTableFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "FruitTableFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group);
        }
      }
    );
  }

  function createFruitTable() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2). Sem nome, o
    // id sairia de uma assinatura estrutural - que tambem funciona, mas
    // muda se a peca for reposicionada no codigo.
    group.name = "FruitTablePSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createFruitTable: createFruitTable };
})();
