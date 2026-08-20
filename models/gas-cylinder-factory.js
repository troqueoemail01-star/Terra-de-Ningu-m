/**
 * models/gas-cylinder-factory.js
 * -------------------------------------------------
 * BOTIJAO DE GAS da COZINHA - carregado a partir de um modelo .glb
 * pronto (assets/models/gas_cylinder_psx.glb), no MESMO sistema de
 * importacao dos outros modelos do jogo (ver models/stove-factory.js,
 * models/nightstand-factory.js e models/trash-can-factory.js): o mesmo
 * THREE.GLTFLoader que ja carrega os outros .glb de assets/models, o
 * mesmo THREE.DRACOLoader acoplado que o fogao ja usa, o mesmo
 * `normalizeTextures` (filtro nearest, sem mipmap, encoding linear) e a
 * mesma ideia de "medir a bounding box nativa UMA vez, escrever as
 * medidas aqui e deixar a cena so decidir ONDE a peca fica". Nenhum
 * carregador novo, nenhum shader novo, nenhum sistema paralelo de 3D.
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem evento (pedido explicito do usuario: "apenas um item
 * decorativo, sem interacoes, por enquanto") - mesmo tratamento do
 * fogao ao lado (ver StoveFactory) e dos moveis do MEU QUARTO: quem
 * posiciona (scenes/side-room-scene.js) so decide em que canto a peca
 * encosta, sem nenhuma entrada em `interactables`. Ainda assim entra na
 * lista de `solids` da cena - igual ao fogao - so para o jogador nao
 * atravessar o botijao andando; isso e colisao FISICA, nao "interacao"
 * no sentido do InteractionSystem (sem contorno de destaque, sem prompt
 * de "Interagir", sem dialogo).
 *
 * ---------- Sobre o pacote em que o modelo chegou ----------
 * Igual ao do fogao: o .glb veio acompanhado de um preview proprio
 * (index.html + botijao-psx.js) com um shader PSX de verdade (wobble de
 * vertice, warp de textura afim, dither/quantizacao de cor) rodando
 * fora do three.js do jogo. NADA disso entrou aqui, pelos MESMOS
 * motivos ja escritos em models/stove-factory.js:
 *
 *  - o look PSX do jogo ja vem da propria renderizacao (resolucao
 *    interna baixa, texturas nearest sem mipmap, vinheta e scanlines de
 *    interface/layout.css);
 *  - todo o cenario usa MeshStandardMaterial e e iluminado pelas luzes
 *    da casa (ver materials/material-library.js). O ShaderMaterial do
 *    pacote tem luz propria embutida (uLightDir/uAmbient fixos): so
 *    esta peca ignoraria as luzes do comodo e apareceria "chapada" no
 *    meio de um cenario escuro;
 *  - o mini carregador do pacote e um segundo sistema de import, que e
 *    exatamente o que o usuario pediu para NAO existir.
 *
 * ---------- A TEXTURA foi embutida no .glb (unica diferenca de fluxo) ----------
 * Aqui houve UMA diferenca em relacao ao fogao, e vale saber dela: no
 * pacote do fogao a textura PSX ja vinha dentro do .glb; no pacote do
 * botijao NAO - o .glb chegou so com a geometria (material branco, sem
 * imagem nenhuma) e a textura morava como data URI dentro do
 * botijao-psx.js, aplicada em tempo de execucao pelo ShaderMaterial do
 * preview.
 *
 * Como o jogo carrega .glb e nao modulos ES, a textura PSX que veio no
 * pacote (PNG 256x256, ja com dithering ordenado e cor de ~15-bit
 * "assados" nos pixels) foi EMBUTIDA no proprio arquivo
 * assets/models/gas_cylinder_psx.glb, como imagem em bufferView, com
 * sampler NEAREST/NEAREST e wrap REPEAT - exatamente o que o preview do
 * pacote pedia no codigo dele. Ou seja: a imagem e a mesma, bit a bit;
 * o que mudou foi so ONDE ela mora, para o modelo continuar sendo UM
 * arquivo carregado pelo MESMO GLTFLoader, sem nenhum caminho de codigo
 * novo (nada de TextureLoader avulso, nada de segundo asset para
 * sincronizar). A geometria Draco do arquivo nao foi tocada.
 *
 * Detalhe util se um dia a textura for trocada: o glTF assume UV com
 * origem em CIMA e o GLTFLoader ja cuida disso sozinho (flipY = false),
 * que e o mesmo ajuste que o preview do pacote fazia na mao.
 *
 * ---------- Geometria comprimida em Draco ----------
 * Segundo modelo do jogo com a geometria comprimida em Draco
 * (KHR_draco_mesh_compression, listada como extensao *required* dentro
 * do arquivo: 55.497 vertices / 49.770 triangulos). O primeiro foi o
 * fogao, e o <script> do DRACOLoader ja esta em index.html desde
 * entao - nada de novo precisou entrar la por causa desta peca.
 *
 * Continua sendo o MESMO loader dos outros modelos, so com o
 * THREE.DRACOLoader acoplado (`setDRACOLoader`) para ele saber
 * descomprimir. Cada fabrica monta o proprio loader, como todas as
 * outras deste diretorio ja fazem; o decodificador em si e baixado sob
 * demanda e, na segunda vez, sai do cache do navegador.
 *
 * Se o decodificador nao chegar (rede caida, CDN bloqueado), o botijao
 * simplesmente nao aparece: a falha vai para o console, as fontes
 * alternativas sao tentadas em ordem (DECODER_SOURCES, abaixo) e o boot
 * continua identico - o grupo devolvido por createGasCylinder() nasce
 * vazio e e preenchido de forma assincrona, mesmo comportamento de
 * todos os outros modelos importados.
 *
 * ---------- Convencao de espaco local ----------
 * Mesma convencao "centralizada" de StoveFactory/TrashCanFactory
 * (objeto apoiado no chao), e nao a "Z = 0 e a parede" dos moveis de
 * encostar:
 *   - X = 0 e Z = 0 sao o CENTRO da base do botijao;
 *   - Y = 0 e o chao (base da peca);
 *   - a frente (a valva/registro no topo) olha para +Z, mesma convencao
 *     de "frente" do resto do jogo (ver DoorFactory) - embora num
 *     botijao isso quase nao se note: a peca e um cilindro, entao girar
 *     em Y muda pouca coisa.
 *
 * Origem no centro da base porque o usuario avisou que pode querer
 * mudar a posicao pelo Editor depois: assim o gizmo gira a peca NO
 * LUGAR, em vez de varrer ela para fora do canto. Quem encosta o
 * botijao no canto e scenes/side-room-scene.js, que recebe
 * largura/profundidade finais (`width`/`depth` do retorno) para
 * descontar a metade certa.
 * -------------------------------------------------
 */

window.GasCylinderFactory = (function () {
  const MODEL_URL = "assets/models/gas_cylinder_psx.glb";

  // ---------- Fontes do decodificador Draco ----------
  // Mesma lista, na mesma ordem, de models/stove-factory.js: primeiro o
  // decodificador do proprio three.js r128 (o MESMO CDN e a MESMA versao
  // de onde index.html ja baixa three.min.js, o GLTFLoader e o
  // DRACOLoader), depois o do Google como rede de seguranca se o
  // jsdelivr estiver bloqueado.
  //
  // Para rodar 100% offline um dia: copie draco_wasm_wrapper.js,
  // draco_decoder.wasm e draco_decoder.js para uma pasta local
  // (ex.: libs/draco/) e ponha o caminho dela PRIMEIRO nesta lista - nas
  // duas fabricas com Draco. Nada mais precisa mudar.
  const DECODER_SOURCES = [
    "https://cdn.jsdelivr.net/npm/three@0.128/examples/js/libs/draco/",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  ];

  // ---------- Medidas nativas do arquivo .glb ----------
  // Mesma ideia de StoveFactory/TrashCanFactory: a bounding box de
  // `gltf.scene`, ou seja, JA com a hierarquia de nos resolvida pelo
  // GLTFLoader - inclusive a rotacao de +90 graus em X que vem "assada"
  // no unico no do arquivo (a conversao de eixos do exportador, a mesma
  // do fogao). Nos eixos crus do arquivo o modelo esta deitado ao longo
  // de -Z; essa rotacao troca os eixos (y = -z, z = y) e poe a peca de
  // pe, com a base exatamente em y = 0.
  //
  // Medidas tiradas do proprio arquivo: o glTF obriga o accessor de
  // POSITION a trazer min/max, entao da para medir a peca sem
  // descomprimir a geometria Draco. Eixos CRUS do arquivo:
  //   X: -0.37726 a  0.36470
  //   Y: -0.33428 a  0.32981
  //   Z: -0.91161 a  0
  // Depois da rotacao do no (o que o jogo ve):
  //   X (largura):      -0.37726 a 0.36470 -> 0.742
  //   Y (altura):        0.0     a 0.91161 -> 0.912
  //   Z (profundidade): -0.33428 a 0.32981 -> 0.664
  const NATIVE_MIN_X = -0.3772619962692261;
  const NATIVE_MAX_X = 0.3646999895572662;
  const NATIVE_MIN_Y = -0.3342750072479248;
  const NATIVE_MAX_Y = 0.3298119902610779;
  const NATIVE_MIN_Z = -0.9116079807281494;
  const NATIVE_MAX_Z = 0;

  // Os mesmos limites JA nos eixos do jogo (a rotacao de +90 graus em X
  // do no leva y -> -z e z -> y). Escrito assim, e nao com os numeros ja
  // trocados na mao, porque e o que deixa claro de onde cada medida sai -
  // mesma tecnica de ROTATED_* em models/wardrobe-factory.js.
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
  // Aqui SIM tem reescala, diferente do fogao (que chegou em metros e
  // usa MODEL_SCALE = 1) e igual a WardrobeFactory/TrashCanFactory: o
  // arquivo mede 0.91 de altura por 0.74 x 0.66 de base, ou seja, um
  // botijao 1.5x maior que o de verdade - e com a base larga demais para
  // a altura (um P13 domestico tem ~0.34 de diametro e ~0.60 de altura
  // com a valva; a proporcao do arquivo e bem mais "gorda", provavelmente
  // porque a bounding box abraca tambem o que sai do corpo do cilindro:
  // alca/valva no topo e a saia da base).
  //
  // A ancora escolhida foi a ALTURA, e a escala e UNIFORME (nunca
  // esticar so um eixo: distorceria a peca e a textura). Motivo de
  // ancorar na altura: e a medida que o jogador le, em primeira pessoa,
  // contra o fogao ao lado (0.92 de altura) e contra o pe-direito do
  // comodo. Ficar um pouco mais "gordo" que o botijao real nao
  // incomoda - mobilia chapuda e parte da estetica PS1 -, mas ficar 50%
  // mais alto que o normal seria obvio na hora.
  //
  // 0.60 = botijao P13 domestico (o de cozinha), com a valva.
  const TARGET_HEIGHT = 0.6;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // ---------- Para onde a frente do modelo olha ----------
  // Um botijao e praticamente simetrico em torno do proprio eixo, entao
  // esta constante e mais gosto que geometria: 0 deixa a peca como ela
  // saiu do arquivo. Quem quiser virar a valva/etiqueta para outro lado
  // mexe no `rotationY` do dado da cena (ver HouseConfig.sideRooms) ou
  // gira no Editor - nao aqui.
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/side-room-scene.js para encostar a peca no canto e para o
  // solido de colisao, do mesmo jeito que StoveFactory.width/height/
  // depth. Sao as medidas da BOUNDING BOX, entao a colisao e um pouco
  // mais folgada que o cilindro visivel (ver o comentario da escala
  // acima): melhor sobrar do que o jogador enfiar a camera dentro do
  // botijao.
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
  // StoveFactory/NightstandFactory (hoje existe um botijao so, mas o
  // decodificador Draco e caro de montar: reaproveitar o loader evita
  // instanciar o decodificador de novo se um dia houver mais de um).
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
        // sempre e o comodo continua montado, so sem o botijao (ver
        // comentario do topo).
        console.error(
          "GasCylinderFactory: THREE.DRACOLoader nao esta carregado - o " +
            "botijao nao vai aparecer. Confira o <script> do DRACOLoader " +
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

  // Mesmo ajuste de textura usado em StoveFactory/TrashCanFactory:
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
        console.error("GasCylinderFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "GasCylinderFactory: tentando outra fonte do decodificador " +
              "Draco: " + DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group);
        }
      }
    );
  }

  function createGasCylinder() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2). Sem nome, o
    // id sairia de uma assinatura estrutural - que tambem funciona, mas
    // muda se a peca for reposicionada no codigo.
    group.name = "GasCylinderPSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createGasCylinder: createGasCylinder };
})();
