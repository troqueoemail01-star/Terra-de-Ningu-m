/**
 * models/shelf-factory.js
 * -------------------------------------------------
 * PRATELEIRA da COZINHA - carregada a partir de um modelo .glb pronto
 * (assets/models/shelf_psx.glb), no MESMO sistema de importacao dos
 * outros modelos do jogo (ver models/sink-cabinet-factory.js,
 * models/fruit-table-factory.js, models/fridge-factory.js,
 * models/gas-cylinder-factory.js e models/stove-factory.js): o mesmo
 * THREE.GLTFLoader que ja carrega os outros .glb de assets/models, o
 * mesmo THREE.DRACOLoader acoplado que as outras cinco pecas da COZINHA
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
 * botijao, da geladeira, da mesa de frutas e da pia do mesmo comodo e
 * dos moveis do MEU QUARTO: quem posiciona (scenes/side-room-scene.js)
 * so decide onde a peca encosta, sem nenhuma entrada em
 * `interactables`. Ainda assim entra na lista de `solids` da cena -
 * igual as outras cinco - so para o jogador nao atravessar a prateleira
 * andando; isso e colisao FISICA, nao "interacao" no sentido do
 * InteractionSystem (sem contorno de destaque, sem prompt de
 * "Interagir", sem dialogo). O dia em que der para pegar alguma coisa
 * de cima dela, o lugar disso e `interactables`, nao esta fabrica.
 *
 * ---------- Sobre o pacote em que o modelo chegou ----------
 * O .glb veio acompanhado de um preview proprio (index.html + README.md,
 * com OrbitControls, render interno em 240p, vertex snapping, UV afim
 * sem correcao de perspectiva e um passe de dither/quantizacao para
 * simular o visual PS1). NADA do preview entrou aqui, pelos MESMOS
 * motivos ja escritos nas outras cinco fabricas da COZINHA:
 *
 *  - o preview roda em three.js 0.160 por modulos ES/CDN; o jogo roda em
 *    three.js r128 com scripts globais (ver index.html). Usar o codigo do
 *    preview significaria carregar um SEGUNDO three.js na pagina, que e
 *    exatamente o "sistema novo" que o pedido descarta;
 *  - o efeito PS1 do preview e por peca (shader GLSL3 proprio + render
 *    target proprio). No jogo o visual PSX ja e do JOGO INTEIRO
 *    (resolucao interna baixa, vinheta, scanlines e motion blur, ver
 *    index.html e effects/motion-blur.js): a prateleira entra nele de
 *    graca, como as outras pecas importadas. Duas camadas do mesmo
 *    efeito so brigariam entre si;
 *  - o material do preview (makePSXMaterial, que o proprio README do
 *    pacote sugere reaproveitar) tem a iluminacao assada por vertice
 *    dentro do shader, ou seja, ele NAO responde as luzes da casa. A
 *    prateleira seria a UNICA peca com luz propria de um comodo escuro,
 *    do lado do botijao e da pia. Todo o cenario usa
 *    MeshStandardMaterial e e iluminado pelas luzes da casa (ver
 *    materials/material-library.js), e o material que vai dentro do .glb
 *    do jogo e Standard - entao ele fica como esta.
 *
 * ---------- A TEXTURA foi embutida no .glb (unica diferenca de fluxo) ----------
 * Mesma diferenca que o BOTIJAO e a PIA tiveram, resolvida do mesmo jeito
 * (ver o bloco de mesmo nome em models/gas-cylinder-factory.js e em
 * models/sink-cabinet-factory.js). Aqui o pacote trouxe DUAS versoes da
 * mesma textura: as PBR originais dentro do .glb (albedo + normal +
 * metallic/roughness, 1024x1024 em WebP) e, solta ao lado, a versao PSX
 * ja estilizada em psx_shelf_albedo.png (256x256, paleta de 256 cores e
 * dithering ja assados nos pixels).
 *
 * Foi a versao PSX que entrou, EMBUTIDA no proprio
 * assets/models/shelf_psx.glb como image/png em bufferView, com sampler
 * NEAREST/NEAREST e wrap REPEAT, ligada ao `baseColorTexture` do
 * material. A imagem e a mesma do pacote, bit a bit, e a geometria Draco
 * nao foi tocada: o .glb do jogo reaproveita os MESMOS bytes comprimidos
 * do arquivo original, sem reexportar nada. Os motivos, na ordem:
 *
 *  - e a textura que combina com o jogo: 256x256 com paleta e dither e
 *    exatamente o que as outras cinco pecas da COZINHA aparentam depois
 *    de passar pelo filtro nearest;
 *  - o jogo nao usa normal map nem mapa de metallic/roughness em NENHUM
 *    material (ver materials/material-library.js), entao esses dois
 *    mapas seriam 52 KB baixados no celular para quase nada na tela;
 *  - deixa o modelo em UM arquivo carregado pelo MESMO GLTFLoader, sem
 *    nenhum caminho de codigo novo - nada de TextureLoader avulso e nada
 *    de um segundo asset para sincronizar, como no botijao e na pia;
 *  - de tabela, sai tambem a dependencia de EXT_texture_webp (que o
 *    GLTFLoader le, ver a mesa de frutas, mas que depende do navegador
 *    decodificar WebP) e o asset cai de 690 KB para 219 KB - o mesmo
 *    peso das outras pecas da COZINHA (geladeira 210 KB, pia 217 KB),
 *    que num jogo mobile conta.
 *
 * De carona vem o detalhe de UV que o README do pacote pedia na mao
 * (`flipY = false`): o glTF assume UV com origem em CIMA e o GLTFLoader
 * ja cuida disso sozinho para textura que mora dentro do arquivo. Com um
 * TextureLoader solto seria preciso lembrar disso na mao, e esquecer
 * significaria a textura de cabeca para baixo.
 *
 * E um detalhe do material que NAO da para esquecer quando se tira o
 * mapa de metallic/roughness: o glTF assume `metallicFactor` 1 quando o
 * campo nao esta escrito. Sem o mapa E sem o campo, a prateleira
 * renderizaria praticamente PRETA (metal puro num ambiente sem
 * reflexao). Por isso o material do .glb do jogo traz metallicFactor 0 e
 * roughnessFactor 1 explicitos - os mesmos valores que o .glb da pia e o
 * do botijao ja usam.
 *
 * ---------- Geometria comprimida em Draco ----------
 * SEXTO modelo do jogo com a geometria comprimida em Draco
 * (KHR_draco_mesh_compression, listada como extensao *required* dentro do
 * arquivo: 33.848 vertices / 50.000 triangulos, o mesmo orcamento das
 * outras pecas importadas da COZINHA). Os cinco primeiros foram o fogao,
 * o botijao, a geladeira, a mesa de frutas e a pia, e o <script> do
 * DRACOLoader ja esta em index.html desde entao - nada de novo precisou
 * entrar la por causa desta peca.
 *
 * Continua sendo o MESMO loader dos outros modelos, so com o
 * THREE.DRACOLoader acoplado (`setDRACOLoader`) para ele saber
 * descomprimir. Cada fabrica monta o proprio loader, como todas as outras
 * deste diretorio ja fazem; o decodificador em si e baixado sob demanda
 * e, na segunda vez, sai do cache do navegador.
 *
 * Se o decodificador nao chegar (rede caida, CDN bloqueado), a prateleira
 * simplesmente nao aparece: a falha vai para o console, as fontes
 * alternativas sao tentadas em ordem (DECODER_SOURCES, abaixo) e o boot
 * continua identico - o grupo devolvido por createShelf() nasce vazio e e
 * preenchido de forma assincrona, mesmo comportamento de todos os outros
 * modelos importados.
 *
 * ---------- Convencao de espaco local ----------
 * Mesma convencao "centralizada" das outras cinco pecas da COZINHA
 * (objeto apoiado no chao), e nao a "Z = 0 e a parede" dos moveis de
 * encostar:
 *   - X = 0 e Z = 0 sao o CENTRO da base da prateleira;
 *   - Y = 0 e o chao (o pe da peca);
 *   - a "frente" (o lado aberto das divisoes) olha para +Z, mesma
 *     convencao de frente do resto do jogo (ver DoorFactory).
 *
 * Origem no centro da base porque o usuario avisou que pode querer mudar
 * a posicao pelo Editor depois: assim o gizmo gira a peca NO LUGAR, em
 * vez de varrer ela para fora da parede. Quem encosta a prateleira na
 * parede e scenes/side-room-scene.js, que recebe largura/profundidade
 * finais (`width`/`depth` do retorno) para descontar a metade certa.
 * -------------------------------------------------
 */

window.ShelfFactory = (function () {
  const MODEL_URL = "assets/models/shelf_psx.glb";

  // ---------- Fontes do decodificador Draco ----------
  // Mesma lista, na mesma ordem, de models/stove-factory.js,
  // models/gas-cylinder-factory.js, models/fridge-factory.js,
  // models/fruit-table-factory.js e models/sink-cabinet-factory.js:
  // primeiro o decodificador do proprio three.js r128 (o MESMO CDN e a
  // MESMA versao de onde index.html ja baixa three.min.js, o GLTFLoader e
  // o DRACOLoader), depois o do Google como rede de seguranca se o
  // jsdelivr estiver bloqueado.
  //
  // Para rodar 100% offline um dia: copie draco_wasm_wrapper.js,
  // draco_decoder.wasm e draco_decoder.js para uma pasta local
  // (ex.: libs/draco/) e ponha o caminho dela PRIMEIRO nesta lista - nas
  // SEIS fabricas com Draco. Nada mais precisa mudar.
  const DECODER_SOURCES = [
    "https://cdn.jsdelivr.net/npm/three@0.128/examples/js/libs/draco/",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  ];

  // ---------- Medidas nativas do arquivo .glb ----------
  // Mesma ideia das outras cinco pecas da COZINHA: a bounding box de
  // `gltf.scene`, ou seja, JA com a hierarquia de nos resolvida pelo
  // GLTFLoader - inclusive a rotacao de +90 graus em X que vem assada no
  // unico no do arquivo (a conversao de eixos do exportador, a mesma do
  // fogao, do botijao, da geladeira, da mesa e da pia). Nos eixos crus do
  // arquivo o modelo esta deitado ao longo de -Z; essa rotacao troca os
  // eixos (y = -z, z = y) e poe a peca de pe, com a base exatamente em
  // y = 0.
  //
  // Medidas tiradas do proprio arquivo: o glTF obriga o accessor de
  // POSITION a trazer min/max, entao da para medir a peca sem
  // descomprimir a geometria Draco. Eixos CRUS do arquivo:
  //   X: -0.43399 a  0.57242
  //   Y: -0.14644 a  0.14850
  //   Z: -0.81964 a  0
  // Depois da rotacao do no (o que o jogo ve):
  //   X (largura):      -0.43399 a 0.57242 -> 1.006
  //   Y (altura):        0.0     a 0.81964 -> 0.820
  //   Z (profundidade): -0.14644 a 0.14850 -> 0.295
  const NATIVE_MIN_X = -0.4339909851551056;
  const NATIVE_MAX_X = 0.572422981262207;
  const NATIVE_MIN_Y = -0.14644299447536469;
  const NATIVE_MAX_Y = 0.14850200712680817;
  const NATIVE_MIN_Z = -0.8196359872817993;
  const NATIVE_MAX_Z = 0;

  // Os mesmos limites JA nos eixos do jogo (a rotacao de +90 graus em X
  // do no leva y -> -z e z -> y). Escrito assim, e nao com os numeros ja
  // trocados na mao, porque e o que deixa claro de onde cada medida sai -
  // mesma tecnica de ROTATED_* em models/sink-cabinet-factory.js,
  // models/fruit-table-factory.js, models/fridge-factory.js e
  // models/gas-cylinder-factory.js.
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
  // Aqui NAO tem reescala (MODEL_SCALE = 1), como no FOGAO e como a
  // mobilia do MEU QUARTO: o arquivo chegou em metros e ja em medida de
  // movel de verdade - 1.01 de largura por 0.82 de altura e 0.29 de
  // profundidade e exatamente uma prateleira baixa e rasa, do tipo que
  // encosta na parede de cozinha. Os outros quatro casos (botijao,
  // geladeira, mesa e pia) precisaram de TARGET_HEIGHT porque chegaram
  // pequenos demais; este nao.
  //
  // Duas referencias do proprio jogo para conferir que 0.82 fecha: o
  // tampo da escrivaninha do corredor (DeskFactory.DESK_HEIGHT = 0.8, o
  // tampo de referencia do jogo) e a bancada da pia ao lado
  // (SinkCabinetFactory, 0.9). A prateleira lendo um pouco mais baixa que
  // as duas e o que a proporcao do modelo pede: ele e MAIS LARGO que alto
  // (1.2x), entao esticar a altura para 1.8 (prateleira de pe) sairia
  // 2.2 de largura - um monstro de 2 metros na parede.
  const MODEL_SCALE = 1;

  // ---------- Para onde a frente do modelo olha ----------
  // Mesmo lado das outras cinco pecas da COZINHA, que sairam da mesma
  // esteira de conversao (o no traz a mesma rotacao de +90 graus em X): a
  // frente cai em +Z depois da rotacao do no. Aqui isso IMPORTA: a
  // prateleira tem frente e costas - o lado aberto das divisoes de um
  // lado, o fundo cru do outro.
  //
  // Se ela aparecer de costas no jogo, esta e a UNICA linha a mexer: 0 ou
  // Math.PI. O recentramento abaixo acompanha o giro sozinho, e 180 graus
  // nao mudam largura/profundidade, entao a colisao segue exata.
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/side-room-scene.js para encostar a peca na parede e para o
  // solido de colisao, do mesmo jeito que StoveFactory/FridgeFactory/
  // SinkCabinetFactory .width/.height/.depth. Sao as medidas da BOUNDING
  // BOX: 1.01 x 0.29 de base, 0.82 de altura.
  const FINAL_WIDTH = (ROTATED_MAX_X - ROTATED_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = NATIVE_HEIGHT * MODEL_SCALE;
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
  // node_0 (nome generico do conversor, o mesmo caso do .glb da geladeira,
  // da mesa e da pia), o que apareceria assim no painel de hierarquia do
  // Editor. Renomear na hora de carregar deixa a arvore legivel e o id do
  // Editor estavel e com significado - ver Identidade dos objetos em
  // editor/README.md e o dicionario NAME_LABELS de
  // editor/editor-registry.js. Nao muda o arquivo em disco e nao muda
  // geometria nenhuma.
  const MESH_NAME = "shelf_psx";

  // Loader unico e reaproveitado entre chamadas - mesma ideia das outras
  // cinco fabricas com Draco (hoje existe uma prateleira so, mas o
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
        // sempre e o comodo continua montado, so sem a prateleira (ver
        // comentario do topo).
        console.error(
          "ShelfFactory: THREE.DRACOLoader nao esta carregado - a " +
            "prateleira nao vai aparecer. Confira o <script> do " +
            "DRACOLoader em " +
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

  // Mesmo ajuste de textura usado nas outras cinco pecas da COZINHA:
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

        // 1) Escala (aqui 1:1, ver MODEL_SCALE acima - o arquivo ja
        //    chegou em metros).
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
        console.error("ShelfFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "ShelfFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group);
        }
      }
    );
  }

  function createShelf() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2). Sem nome, o
    // id sairia de uma assinatura estrutural - que tambem funciona, mas
    // muda se a peca for reposicionada no codigo.
    group.name = "ShelfPSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createShelf: createShelf };
})();
