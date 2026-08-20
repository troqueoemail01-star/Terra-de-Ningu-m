/**
 * models/sink-cabinet-factory.js
 * -------------------------------------------------
 * PIA + ARMARIO (o balcao da cuba) da COZINHA - carregado a partir de um
 * modelo .glb pronto (assets/models/sink_cabinet_psx.glb), no MESMO
 * sistema de importacao dos outros modelos do jogo (ver
 * models/fruit-table-factory.js, models/fridge-factory.js,
 * models/stove-factory.js e models/gas-cylinder-factory.js): o mesmo
 * THREE.GLTFLoader que ja carrega os outros .glb de assets/models, o
 * mesmo THREE.DRACOLoader acoplado que as outras quatro pecas da COZINHA
 * ja usam, o mesmo `normalizeTextures` (filtro nearest, sem mipmap,
 * encoding linear) e a mesma ideia de "medir a bounding box nativa UMA
 * vez, escrever as medidas aqui e deixar a cena so decidir ONDE a peca
 * fica". Nenhum carregador novo, nenhum shader novo, nenhum sistema
 * paralelo de 3D - foi exatamente o pedido: "ja tem outros itens que
 * foram implementados dessa forma, portanto use o mesmo sistema, nao
 * precisa criar algo novo".
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem evento (pedido explicito: "e apenas um item decorativo,
 * sem interacoes, (por enquanto)") - mesmo tratamento do fogao, do
 * botijao, da geladeira e da mesa do mesmo comodo e dos moveis do MEU
 * QUARTO: quem posiciona (scenes/side-room-scene.js) so decide onde a
 * peca encosta, sem nenhuma entrada em `interactables`. Ainda assim entra
 * na lista de `solids` da cena - igual as outras quatro - so para o
 * jogador nao atravessar o balcao andando; isso e colisao FISICA, nao
 * "interacao" no sentido do InteractionSystem (sem contorno de destaque,
 * sem prompt de "Interagir", sem dialogo). O dia em que a pia virar algo
 * de abrir/usar, o lugar disso e `interactables`, nao esta fabrica.
 *
 * ---------- Sobre o pacote em que o modelo chegou ----------
 * O .glb veio acompanhado de um preview proprio (index.html + README.md,
 * com OrbitControls, render em baixa resolucao, vertex snapping e um
 * passe de dither/quantizacao para simular o visual PS1). NADA do preview
 * entrou aqui, pelos MESMOS motivos ja escritos nas outras quatro
 * fabricas da COZINHA:
 *
 *  - o preview roda em three.js 0.1xx por modulos ES/CDN; o jogo roda em
 *    three.js r128 com scripts globais (ver index.html). Usar o codigo do
 *    preview significaria carregar um SEGUNDO three.js na pagina, que e
 *    exatamente o "sistema novo" que o pedido descarta;
 *  - o efeito PS1 do preview e por peca (shader proprio + render target
 *    proprio). No jogo o visual PSX ja e do JOGO INTEIRO (resolucao
 *    interna baixa, vinheta, scanlines e motion blur, ver index.html e
 *    effects/motion-blur.js): a pia entra nele de graca, como as outras
 *    pecas importadas. Duas camadas do mesmo efeito so brigariam entre
 *    si;
 *  - o preview troca o material do modelo por MeshBasicMaterial (o
 *    proprio README do pacote sugere isso). MeshBasicMaterial ignora
 *    iluminacao por completo: a pia seria a UNICA peca autoiluminada de
 *    um comodo escuro, do lado da geladeira e do fogao. Todo o cenario
 *    usa MeshStandardMaterial e e iluminado pelas luzes da casa (ver
 *    materials/material-library.js), e o material que vem no .glb ja e
 *    Standard (metallic 0, roughness 1) - entao ele fica como esta.
 *
 * ---------- A TEXTURA foi embutida no .glb (unica diferenca de fluxo) ----------
 * Mesma diferenca que o BOTIJAO teve, resolvida do mesmo jeito (ver o
 * bloco de mesmo nome em models/gas-cylinder-factory.js): o pacote deste
 * modelo trouxe a geometria e a textura SEPARADAS - o .glb so com a
 * geometria (material "PSX" branco, sem imagem nenhuma) e a textura PSX
 * solta ao lado, em pia-armario-psx-texture.png (256x256, cor de ~15 bits
 * e dithering ja "assados" nos pixels).
 *
 * Essa imagem foi EMBUTIDA no proprio assets/models/sink_cabinet_psx.glb,
 * como image/png em bufferView, com sampler NEAREST/NEAREST e wrap
 * REPEAT, ligada ao `baseColorTexture` do material que ja existia no
 * arquivo. A imagem e a mesma, bit a bit, e a geometria Draco nao foi
 * tocada (nada foi reexportado: so entraram os nos de textura no JSON do
 * .glb e os bytes do PNG no fim do buffer). O que mudou foi so ONDE ela
 * mora, para o modelo continuar sendo UM arquivo carregado pelo MESMO
 * GLTFLoader, sem nenhum caminho de codigo novo - nada de TextureLoader
 * avulso e nada de um segundo asset para sincronizar, exatamente como no
 * botijao.
 *
 * De carona vem o detalhe de UV que o README do pacote pedia na mao
 * (`flipY = false`): o glTF assume UV com origem em CIMA e o GLTFLoader
 * ja cuida disso sozinho para textura que mora dentro do arquivo. Com um
 * TextureLoader solto seria preciso lembrar disso na mao, e esquecer
 * significaria a textura de cabeca para baixo.
 *
 * ---------- Geometria comprimida em Draco ----------
 * QUINTO modelo do jogo com a geometria comprimida em Draco
 * (KHR_draco_mesh_compression, listada como extensao *required* dentro do
 * arquivo: 31.551 vertices / 50.000 triangulos). Os quatro primeiros
 * foram o fogao, o botijao, a geladeira e a mesa de frutas, e o <script>
 * do DRACOLoader ja esta em index.html desde entao - nada de novo
 * precisou entrar la por causa desta peca.
 *
 * Continua sendo o MESMO loader dos outros modelos, so com o
 * THREE.DRACOLoader acoplado (`setDRACOLoader`) para ele saber
 * descomprimir. Cada fabrica monta o proprio loader, como todas as outras
 * deste diretorio ja fazem; o decodificador em si e baixado sob demanda
 * e, na segunda vez, sai do cache do navegador.
 *
 * Se o decodificador nao chegar (rede caida, CDN bloqueado), a pia
 * simplesmente nao aparece: a falha vai para o console, as fontes
 * alternativas sao tentadas em ordem (DECODER_SOURCES, abaixo) e o boot
 * continua identico - o grupo devolvido por createSinkCabinet() nasce
 * vazio e e preenchido de forma assincrona, mesmo comportamento de todos
 * os outros modelos importados.
 *
 * ---------- Convencao de espaco local ----------
 * Mesma convencao "centralizada" de StoveFactory/GasCylinderFactory/
 * FridgeFactory/FruitTableFactory (objeto apoiado no chao), e nao a
 * "Z = 0 e a parede" dos moveis de encostar:
 *   - X = 0 e Z = 0 sao o CENTRO da base do balcao;
 *   - Y = 0 e o chao (base do armario);
 *   - a "frente" (as portas do armario e a boca da cuba) olha para +Z,
 *     mesma convencao de frente do resto do jogo (ver DoorFactory).
 *
 * Origem no centro da base porque o usuario avisou que pode querer mudar
 * a posicao pelo Editor depois: assim o gizmo gira a peca NO LUGAR, em
 * vez de varrer ela para fora da parede. Quem encosta a pia na parede e
 * scenes/side-room-scene.js, que recebe largura/profundidade finais
 * (`width`/`depth` do retorno) para descontar a metade certa.
 * -------------------------------------------------
 */

window.SinkCabinetFactory = (function () {
  const MODEL_URL = "assets/models/sink_cabinet_psx.glb";

  // ---------- Fontes do decodificador Draco ----------
  // Mesma lista, na mesma ordem, de models/stove-factory.js,
  // models/gas-cylinder-factory.js, models/fridge-factory.js e
  // models/fruit-table-factory.js: primeiro o decodificador do proprio
  // three.js r128 (o MESMO CDN e a MESMA versao de onde index.html ja
  // baixa three.min.js, o GLTFLoader e o DRACOLoader), depois o do Google
  // como rede de seguranca se o jsdelivr estiver bloqueado.
  //
  // Para rodar 100% offline um dia: copie draco_wasm_wrapper.js,
  // draco_decoder.wasm e draco_decoder.js para uma pasta local
  // (ex.: libs/draco/) e ponha o caminho dela PRIMEIRO nesta lista - nas
  // CINCO fabricas com Draco. Nada mais precisa mudar.
  const DECODER_SOURCES = [
    "https://cdn.jsdelivr.net/npm/three@0.128/examples/js/libs/draco/",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  ];

  // ---------- Medidas nativas do arquivo .glb ----------
  // Mesma ideia das outras quatro pecas da COZINHA: a bounding box de
  // `gltf.scene`, ou seja, JA com a hierarquia de nos resolvida pelo
  // GLTFLoader - inclusive a rotacao de +90 graus em X que vem "assada"
  // no unico no do arquivo (a conversao de eixos do exportador, a mesma
  // do fogao, do botijao, da geladeira e da mesa). Nos eixos crus do
  // arquivo o modelo esta deitado ao longo de -Z; essa rotacao troca os
  // eixos (y = -z, z = y) e poe a peca de pe, com a base exatamente em
  // y = 0.
  //
  // Medidas tiradas do proprio arquivo: o glTF obriga o accessor de
  // POSITION a trazer min/max, entao da para medir a peca sem
  // descomprimir a geometria Draco. Eixos CRUS do arquivo:
  //   X: -0.46338 a  0.47717
  //   Y: -0.25012 a  0.23874
  //   Z: -0.62475 a  0
  // Depois da rotacao do no (o que o jogo ve):
  //   X (largura):      -0.46338 a 0.47717 -> 0.941
  //   Y (altura):        0.0     a 0.62475 -> 0.625
  //   Z (profundidade): -0.25012 a 0.23874 -> 0.489
  const NATIVE_MIN_X = -0.4633820056915283;
  const NATIVE_MAX_X = 0.4771749973297119;
  const NATIVE_MIN_Y = -0.2501220107078552;
  const NATIVE_MAX_Y = 0.23874099552631378;
  const NATIVE_MIN_Z = -0.6247479915618896;
  const NATIVE_MAX_Z = 0;

  // Os mesmos limites JA nos eixos do jogo (a rotacao de +90 graus em X
  // do no leva y -> -z e z -> y). Escrito assim, e nao com os numeros ja
  // trocados na mao, porque e o que deixa claro de onde cada medida sai -
  // mesma tecnica de ROTATED_* em models/fruit-table-factory.js,
  // models/fridge-factory.js, models/gas-cylinder-factory.js e
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
  // Aqui tem reescala, como no botijao, no guarda-roupa, na geladeira e
  // na mesa (e diferente do fogao, que chegou em metros e usa
  // MODEL_SCALE = 1): o arquivo mede 0.94 x 0.49 de base por 0.62 de
  // altura, e 62 cm e altura de movel de banheiro, nao de bancada de
  // cozinha. As PROPORCOES estao certas (1.5x mais largo que alto, base
  // rasa como um balcao encostado na parede), so a escala absoluta veio
  // pequena.
  //
  // A ancora escolhida foi a ALTURA, e a escala e UNIFORME (nunca
  // esticar so um eixo: distorceria a peca e a textura). Motivo de
  // ancorar na altura: e a medida que o jogador le, em primeira pessoa,
  // contra o FOGAO que fica na mesma parede (0.92 de bancada, ver
  // models/stove-factory.js), contra a escrivaninha do corredor
  // (DeskFactory.DESK_HEIGHT = 0.8, o tampo de referencia do jogo) e
  // contra o pe-direito (4.2, ver CorridorConfig.height).
  //
  // 0.9 = altura de bancada de cozinha de verdade e praticamente a mesma
  // do fogao ao lado (0.92), entao os dois leem como uma linha continua
  // de moveis em vez de dois moveis de alturas diferentes. Com essa
  // altura a base sai 1.35 x 0.70: um balcao de pia de uma cuba, que cabe
  // folgado nos 7.7 x 4.8 do comodo (a conta do encosto esta em
  // scenes/side-room-scene.js).
  //
  // Se ela parecer grande ou pequena demais dentro do jogo, esta e a
  // UNICA linha a mexer: largura, profundidade, recentramento e caixa de
  // colisao saem todas dela. Dando na mesma, o Editor tambem escala a
  // peca no lugar, sem tocar em codigo (ver editor/README.md).
  const TARGET_HEIGHT = 0.9;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // ---------- Para onde a frente do modelo olha ----------
  // Assumido o MESMO lado das outras quatro pecas da COZINHA, que sairam
  // da mesma esteira de conversao (o no traz a mesma rotacao de +90 graus
  // em X): a frente cai em +Z depois da rotacao do no. Aqui isso IMPORTA
  // (diferente da mesa, que le igual dos dois lados): a pia tem frente e
  // costas - as portas do armario e a boca da cuba de um lado, o fundo
  // cru do outro.
  //
  // Se ela aparecer de costas no jogo, esta e a UNICA linha a mexer: 0 ou
  // Math.PI. O recentramento abaixo acompanha o giro sozinho, e 180 graus
  // nao mudam largura/profundidade, entao a colisao segue exata. (Para 90
  // graus seria preciso trocar FINAL_WIDTH por FINAL_DEPTH tambem - nao
  // implementado porque nao ha uso: girar 90 graus e trabalho de
  // POSICIONAMENTO, e quem faz isso e a cena, ver `rotationY` em
  // scenes/side-room-scene.js.)
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/side-room-scene.js para encostar a peca na parede e para o
  // solido de colisao, do mesmo jeito que StoveFactory/FridgeFactory/
  // FruitTableFactory .width/.height/.depth. Sao as medidas da BOUNDING
  // BOX: 1.35 x 0.70 de base, 0.9 de altura.
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
  // geladeira e da mesa), o que apareceria assim no painel de hierarquia
  // do Editor. Renomear na hora de carregar deixa a arvore legivel e o id
  // do Editor estavel e com significado - ver "Identidade dos objetos" em
  // editor/README.md e o dicionario NAME_LABELS de
  // editor/editor-registry.js. Nao muda o arquivo em disco e nao muda
  // geometria nenhuma.
  const MESH_NAME = "sink_cabinet_psx";

  // Loader unico e reaproveitado entre chamadas - mesma ideia das outras
  // quatro fabricas com Draco (hoje existe uma pia so, mas o decodificador
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
        // sempre e o comodo continua montado, so sem a pia (ver
        // comentario do topo).
        console.error(
          "SinkCabinetFactory: THREE.DRACOLoader nao esta carregado - a pia " +
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

  // Mesmo ajuste de textura usado nas outras quatro pecas da COZINHA:
  // filtro "nearest" e sem mipmap para o pixel "cru" do visual PSX, e
  // encoding linear para ficar consistente com o resto do jogo (que nao
  // usa sRGBEncoding em nenhuma outra textura).
  //
  // O sampler que foi embutido no .glb ja pede NEAREST/NEAREST, entao
  // aqui isso e cinto e suspensorio - de proposito: se um dia a textura
  // for trocada por outra que peca LINEAR/mipmap (foi o caso da mesa de
  // frutas), a peca continua pixelada como o resto do jogo sem ninguem
  // precisar lembrar deste detalhe.
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
        console.error("SinkCabinetFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "SinkCabinetFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group);
        }
      }
    );
  }

  function createSinkCabinet() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2). Sem nome, o
    // id sairia de uma assinatura estrutural - que tambem funciona, mas
    // muda se a peca for reposicionada no codigo.
    group.name = "SinkCabinetPSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createSinkCabinet: createSinkCabinet };
})();
