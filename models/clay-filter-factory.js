/**
 * models/clay-filter-factory.js
 * -------------------------------------------------
 * FILTRO DE BARRO da COZINHA - carregado a partir de um modelo .glb
 * pronto (assets/models/clay_filter_psx.glb), no MESMO sistema de
 * importacao dos outros modelos do jogo (ver models/stove-factory.js,
 * models/gas-cylinder-factory.js, models/fridge-factory.js,
 * models/fruit-table-factory.js, models/sink-cabinet-factory.js,
 * models/shelf-factory.js e models/microwave-factory.js): o mesmo
 * THREE.GLTFLoader que ja carrega os outros .glb de assets/models, o
 * mesmo THREE.DRACOLoader acoplado que as outras pecas com geometria
 * comprimida ja usam, o mesmo `normalizeTextures` (filtro nearest, sem
 * mipmap, encoding linear) e a mesma ideia de "medir a bounding box
 * nativa UMA vez, escrever as medidas aqui e deixar a cena so decidir
 * ONDE a peca fica". Nenhum carregador novo, nenhum shader novo, nenhum
 * sistema paralelo de 3D - foi exatamente o pedido: "ja tem outros itens
 * que foram implementados dessa forma, portanto use o mesmo sistema, nao
 * precisa criar algo novo".
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem evento (pedido explicito: "e apenas um item decorativo,
 * sem interacoes, (por enquanto)" - encher um copo na torneira um dia e
 * trabalho de outra atualizacao) - mesmo tratamento do fogao, do
 * botijao, da geladeira, da mesa, da pia, da prateleira e do microondas
 * do mesmo comodo e dos moveis do MEU QUARTO: quem posiciona
 * (scenes/side-room-scene.js) so decide onde a peca encosta, sem nenhuma
 * entrada em `interactables`. Ainda assim entra na lista de `solids` da
 * cena - igual as outras sete - so para o jogador nao atravessar o filtro
 * andando; isso e colisao FISICA, nao "interacao" no sentido do
 * InteractionSystem (sem contorno de destaque, sem prompt de "Interagir",
 * sem dialogo). O dia em que a torneira virar algo de usar, o lugar disso
 * e `interactables`, nao esta fabrica.
 *
 * ---------- Sobre o pacote em que o modelo chegou ----------
 * O .glb veio acompanhado de um preview proprio (index.html, README.md,
 * src/main.js e src/psx.js: OrbitControls, render em baixa resolucao com
 * upscale nearest, vertex snapping, iluminacao por vertice, fog, dither
 * Bayer 4x4, quantizacao de 5 bits e "affine mapping" via a extensao
 * NV_shader_noperspective_interpolation). NADA do preview entrou aqui,
 * pelos MESMOS motivos ja escritos nas outras fabricas da COZINHA:
 *
 *  - o preview roda em three.js 0.160 por modulos ES/CDN (importmap); o
 *    jogo roda em three.js r128 com scripts globais (ver index.html).
 *    Usar o codigo do preview significaria carregar um SEGUNDO three.js
 *    na pagina, que e exatamente o "sistema novo" que o pedido descarta;
 *  - o efeito PS1 do preview e por peca (ShaderMaterial proprio + render
 *    target proprio). No jogo o visual PSX ja e do JOGO INTEIRO
 *    (resolucao interna baixa, vinheta, scanlines e motion blur, ver
 *    index.html e effects/motion-blur.js): o filtro entra nele de graca,
 *    como as outras pecas importadas. Duas camadas do mesmo efeito so
 *    brigariam entre si;
 *  - o material do preview e unlit (o proprio `createPSXMaterial` faz a
 *    iluminacao na mao, e o fallback dele e um MeshBasicMaterial).
 *    MeshBasicMaterial ignora as luzes por completo: o filtro seria a
 *    UNICA peca autoiluminada de um comodo escuro, do lado da geladeira e
 *    do fogao - o mesmo bug que a TV do MEU QUARTO e o microondas tiveram
 *    (ver fixUnlitMaterial em models/tv-factory.js). Todo o cenario usa
 *    MeshStandardMaterial e e iluminado pelas luzes da casa (ver
 *    materials/material-library.js), e o material embutido no .glb desta
 *    peca ja e Standard (metallic 0, roughness 1) - entao ele fica como
 *    esta e nao precisa de conserto nenhum.
 *
 * ---------- A TEXTURA foi embutida no .glb ----------
 * Mesma diferenca de fluxo que o BOTIJAO e a PIA tiveram, resolvida do
 * mesmo jeito (ver o bloco de mesmo nome em
 * models/gas-cylinder-factory.js): o pacote deste modelo trouxe a
 * geometria e a textura SEPARADAS - o .glb ("psx-strip") so com a
 * geometria Draco, sem material, sem textura e sem sampler nenhum, e a
 * textura PSX solta ao lado, em filtro_psx.png (256x256, ~259 cores, com
 * a posterizacao e o dithering ja "assados" nos pixels).
 *
 * Essa imagem foi EMBUTIDA no proprio assets/models/clay_filter_psx.glb,
 * como image/png em bufferView, com sampler NEAREST/NEAREST e wrap
 * REPEAT, ligada ao `baseColorTexture` de um material Standard
 * (metallic 0, roughness 1, doubleSided como o material do arquivo
 * original do pacote) apontado pelo primitivo da malha. A imagem e a
 * mesma, bit a bit, e a geometria Draco nao foi tocada: nada foi
 * reexportado, so entraram os nos de material/textura no JSON do .glb e
 * os bytes do PNG no fim do buffer. O que mudou foi so ONDE a imagem
 * mora, para o modelo continuar sendo UM arquivo carregado pelo MESMO
 * GLTFLoader, sem nenhum caminho de codigo novo - nada de TextureLoader
 * avulso e nada de um segundo asset para sincronizar.
 *
 * De carona vem um detalhe de UV que o preview do pacote errava: ele
 * carrega o PNG com THREE.TextureLoader, que usa `flipY = true`, mas os
 * UVs deste modelo sao de glTF (origem em CIMA) e a imagem PSX esta na
 * MESMA orientacao da textura original do modelo (conferido pixel a
 * pixel contra o baseColor do arquivo original do pacote). Ou seja: no
 * preview a textura entra espelhada na vertical. Textura que mora DENTRO
 * do .glb e lida pelo GLTFLoader com `flipY = false`, que e o certo -
 * entao aqui ela cai no lugar sozinha.
 *
 * ---------- Geometria comprimida em Draco ----------
 * SEXTO modelo do jogo com a geometria comprimida em Draco
 * (KHR_draco_mesh_compression, listada como extensao *required* dentro do
 * arquivo: 32.109 vertices / 50.000 triangulos). Os cinco primeiros foram
 * o fogao, o botijao, a geladeira, a mesa de frutas e a pia, e o
 * <script> do DRACOLoader ja esta em index.html desde entao - nada de
 * novo precisou entrar la por causa desta peca.
 *
 * Continua sendo o MESMO loader dos outros modelos, so com o
 * THREE.DRACOLoader acoplado (`setDRACOLoader`) para ele saber
 * descomprimir. Cada fabrica monta o proprio loader, como todas as outras
 * deste diretorio ja fazem; o decodificador em si e baixado sob demanda
 * e, na segunda vez, sai do cache do navegador.
 *
 * Se o decodificador nao chegar (rede caida, CDN bloqueado), o filtro
 * simplesmente nao aparece: a falha vai para o console, as fontes
 * alternativas sao tentadas em ordem (DECODER_SOURCES, abaixo) e o boot
 * continua identico - o grupo devolvido por createClayFilter() nasce
 * vazio e e preenchido de forma assincrona, mesmo comportamento de todos
 * os outros modelos importados.
 *
 * ---------- Convencao de espaco local ----------
 * Mesma convencao "centralizada" das outras pecas da COZINHA (objeto
 * apoiado no chao), e nao a "Z = 0 e a parede" dos moveis de encostar:
 *   - X = 0 e Z = 0 sao o CENTRO da base do filtro;
 *   - Y = 0 e o chao (base do pote de baixo);
 *   - a "frente" (a TORNEIRA) olha para +Z, mesma convencao de frente do
 *     resto do jogo (ver DoorFactory).
 *
 * Origem no centro da base porque o usuario avisou que pode querer mudar
 * a posicao pelo Editor depois: assim o gizmo gira a peca NO LUGAR, em
 * vez de varrer ela para fora da parede. Quem encosta o filtro na parede
 * e scenes/side-room-scene.js, que recebe largura/profundidade finais
 * (`width`/`depth` do retorno) para descontar a metade certa.
 * -------------------------------------------------
 */

window.ClayFilterFactory = (function () {
  const MODEL_URL = "assets/models/clay_filter_psx.glb";

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
  // Mesma ideia das outras pecas da COZINHA: a bounding box de
  // `gltf.scene`, ou seja, JA com a hierarquia de nos resolvida pelo
  // GLTFLoader - inclusive a rotacao de +90 graus em X que vem "assada"
  // no unico no do arquivo (a conversao de eixos do exportador, a mesma
  // do fogao, do botijao, da geladeira, da mesa e da pia). Nos eixos
  // crus do arquivo o modelo esta deitado ao longo de -Z; essa rotacao
  // troca os eixos (y = -z, z = y) e poe a peca de pe, com a base
  // exatamente em y = 0.
  //
  // Medidas tiradas do proprio arquivo: o glTF obriga o accessor de
  // POSITION a trazer min/max, entao da para medir a peca sem
  // descomprimir a geometria Draco. Eixos CRUS do arquivo:
  //   X: -0.24740 a  0.24637
  //   Y: -0.25411 a  0.30472
  //   Z: -1.09023 a  0
  // Depois da rotacao do no (o que o jogo ve):
  //   X (largura):      -0.24740 a 0.24637 -> 0.494
  //   Y (altura):        0.0     a 1.09023 -> 1.090
  //   Z (profundidade): -0.25411 a 0.30472 -> 0.559
  const NATIVE_MIN_X = -0.2473980039358139;
  const NATIVE_MAX_X = 0.24636800587177277;
  const NATIVE_MIN_Y = -0.2541069984436035;
  const NATIVE_MAX_Y = 0.3047240078449249;
  const NATIVE_MIN_Z = -1.0902340412139893;
  const NATIVE_MAX_Z = 0;

  // Os mesmos limites JA nos eixos do jogo (a rotacao de +90 graus em X
  // do no leva y -> -z e z -> y). Escrito assim, e nao com os numeros ja
  // trocados na mao, porque e o que deixa claro de onde cada medida sai -
  // mesma tecnica de ROTATED_* em models/sink-cabinet-factory.js,
  // models/fruit-table-factory.js, models/fridge-factory.js,
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
  // Aqui tem reescala, como no botijao, no guarda-roupa, na geladeira, na
  // mesa e na pia (e diferente do fogao, da prateleira e do microondas,
  // que chegaram em metros e usam MODEL_SCALE = 1): o arquivo mede
  // 0.49 x 0.56 de base por 1.09 de altura, ou seja, meio metro de
  // diametro e mais de um metro de altura - um filtro de barro do tamanho
  // de um botijao e meio, do lado de uma bancada de 0.9.
  //
  // As PROPORCOES estao certas, e sao a prova disso: 1.09 de altura por
  // 0.494 de largura da 2.21x mais alto que largo, praticamente a
  // proporcao de um filtro de barro domestico de verdade (um de 8 a 12
  // litros fica entre 1.9x e 2.2x). O que veio errado foi so a escala
  // absoluta.
  //
  // A ancora escolhida foi a ALTURA, e a escala e UNIFORME (nunca
  // esticar so um eixo: distorceria a peca e a textura). Motivo de
  // ancorar na altura: e a medida que o jogador le, em primeira pessoa,
  // contra a GELADEIRA que fica na mesma parede (1.6, ver
  // models/fridge-factory.js), contra a bancada da pia (0.9) e o fogao
  // (0.92) da parede do fundo e contra o pe-direito (4.2, ver
  // CorridorConfig.height).
  //
  // 0.65 = a altura de um filtro de barro grande (uns 10 a 12 litros, dos
  // de dois potes com torneira). Com essa altura a base sai 0.29 x 0.33:
  // uns 30 cm de diametro de pote, exatamente a medida real da peca - e
  // ele le como pouco mais de um terco da geladeira ao lado, que e a
  // proporcao certa.
  //
  // Se ele parecer grande ou pequeno demais dentro do jogo, esta e a
  // UNICA linha a mexer: largura, profundidade, recentramento e caixa de
  // colisao saem todas dela. Dando na mesma, o Editor tambem escala a
  // peca no lugar, sem tocar em codigo (ver editor/README.md).
  const TARGET_HEIGHT = 0.65;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // ---------- Para onde a frente do modelo olha ----------
  // Aqui a frente NAO foi chute nem heranca da convencao: ela esta na
  // propria bounding box do arquivo. O corpo do filtro e redondo, com
  // raio de ~0.247 (o eixo X vai de -0.24740 a 0.24637, centrado em
  // zero), mas a profundidade nao acompanha: o eixo Z do jogo vai de
  // -0.25411 a +0.30472, ou seja, sobra ~5.8 cm de peca so para o lado
  // +Z, fora do cilindro. Isso e a TORNEIRA saindo do pote de baixo -
  // nao ha nada parecido sobrando em nenhum outro lado.
  //
  // Frente em +Z, portanto - a MESMA convencao das outras sete pecas da
  // COZINHA e do resto do jogo (ver DoorFactory), agora medida em vez de
  // assumida.
  //
  // Se um dia o modelo for trocado e a peca aparecer de costas, esta e a
  // UNICA linha a mexer: 0 ou Math.PI. O recentramento abaixo acompanha o
  // giro sozinho, e 180 graus nao mudam largura/profundidade, entao a
  // colisao segue exata. (Para 90 graus seria preciso trocar FINAL_WIDTH
  // por FINAL_DEPTH tambem - nao implementado porque nao ha uso: girar 90
  // graus e trabalho de POSICIONAMENTO, e quem faz isso e a cena, ver
  // `rotationY` em scenes/side-room-scene.js.)
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/side-room-scene.js para encostar a peca na parede e para o
  // solido de colisao, do mesmo jeito que StoveFactory/FridgeFactory/
  // SinkCabinetFactory .width/.height/.depth. Sao as medidas da BOUNDING
  // BOX: 0.29 x 0.33 de base, 0.65 de altura. A profundidade e um pouco
  // maior que a largura por causa da torneira (ver MODEL_YAW): o pote em
  // si e redondo.
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
  // "filtro_barro", o que ja e legivel - mas o padrao das outras pecas
  // importadas e o nome do asset, e e por ele que o dicionario
  // NAME_LABELS do Editor acha o rotulo (ver "Identidade dos objetos" em
  // editor/README.md e editor/editor-registry.js). Renomear na hora de
  // carregar deixa a arvore consistente com as outras sete pecas e o id
  // do Editor estavel. Nao muda o arquivo em disco e nao muda geometria
  // nenhuma.
  const MESH_NAME = "clay_filter_psx";

  // Loader unico e reaproveitado entre chamadas - mesma ideia das outras
  // fabricas com Draco (hoje existe um filtro so, mas o decodificador
  // Draco e caro de montar: reaproveitar o loader evita instanciar o
  // decodificador de novo se um dia houver mais de um).
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
        // sempre e o comodo continua montado, so sem o filtro (ver
        // comentario do topo).
        console.error(
          "ClayFilterFactory: THREE.DRACOLoader nao esta carregado - o filtro " +
            "de barro nao vai aparecer. Confira o <script> do DRACOLoader em " +
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

  // Mesmo ajuste de textura usado nas outras pecas da COZINHA: filtro
  // "nearest" e sem mipmap para o pixel "cru" do visual PSX, e encoding
  // linear para ficar consistente com o resto do jogo (que nao usa
  // sRGBEncoding em nenhuma outra textura).
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

        // Nome de asset no lugar do "filtro_barro" do arquivo (ver
        // MESH_NAME).
        model.name = MESH_NAME;
        model.traverse(function (node) {
          if (node !== model && node.isMesh) {
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
        console.error("ClayFilterFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "ClayFilterFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group);
        }
      }
    );
  }

  function createClayFilter() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2). Sem nome, o
    // id sairia de uma assinatura estrutural - que tambem funciona, mas
    // muda se a peca for reposicionada no codigo.
    group.name = "ClayFilterPSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createClayFilter: createClayFilter };
})();
