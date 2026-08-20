/**
 * models/bottle-glass-factory.js
 * -------------------------------------------------
 * GARRAFA + COPO da COZINHA - carregada a partir de um modelo .glb
 * pronto (assets/models/bottle_glass_psx.glb), no MESMO sistema de
 * importacao dos outros modelos do jogo (ver models/stove-factory.js,
 * models/gas-cylinder-factory.js, models/fridge-factory.js,
 * models/fruit-table-factory.js, models/sink-cabinet-factory.js,
 * models/shelf-factory.js, models/microwave-factory.js e
 * models/clay-filter-factory.js): o mesmo THREE.GLTFLoader que ja carrega
 * os outros .glb de assets/models, o mesmo THREE.DRACOLoader acoplado que
 * as outras pecas com geometria comprimida ja usam, o mesmo
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
 * sem interacoes, (por enquanto)" - beber, pegar ou encher o copo um dia
 * e trabalho de outra atualizacao) - mesmo tratamento do fogao, do
 * botijao, da geladeira, da mesa, da pia, da prateleira, do microondas e
 * do filtro de barro do mesmo comodo: quem posiciona
 * (scenes/side-room-scene.js) so decide onde a peca encosta, sem nenhuma
 * entrada em `interactables`. Ainda assim entra na lista de `solids` da
 * cena - igual as outras oito - so para o jogador nao atravessar a peca
 * andando; isso e colisao FISICA, nao "interacao" no sentido do
 * InteractionSystem (sem contorno de destaque, sem prompt de
 * "Interagir", sem dialogo). O dia em que a garrafa virar item de
 * inventario, o lugar disso e `interactables`, nao esta fabrica.
 *
 * ---------- Sobre o pacote em que o modelo chegou ----------
 * O .glb veio acompanhado de um preview proprio (preview.html com o
 * modelo em base64 embutido, OrbitControls no dedo, render em baixa
 * resolucao com upscale nearest, vertex snapping, flat shading, fog,
 * scanlines e wireframe) e de um LEIA-ME.txt. NADA do preview entrou
 * aqui, pelos MESMOS motivos ja escritos nas outras fabricas da COZINHA:
 *
 *  - o preview carrega three.js e o decodificador Draco por CDN em outra
 *    versao; o jogo roda em three.js r128 com scripts globais (ver
 *    index.html). Usar o codigo do preview significaria carregar um
 *    SEGUNDO three.js na pagina, que e exatamente o "sistema novo" que o
 *    pedido descarta;
 *  - o efeito PS1 do preview e por peca (render target e shader
 *    proprios). No jogo o visual PSX ja e do JOGO INTEIRO (resolucao
 *    interna baixa, vinheta, scanlines e motion blur, ver index.html e
 *    effects/motion-blur.js): a garrafa entra nele de graca, como as
 *    outras pecas importadas;
 *  - o material do preview e feito na mao (iluminacao por vertice, com
 *    fallback unlit). MeshBasicMaterial ignora as luzes: a garrafa seria a
 *    UNICA peca autoiluminada de um comodo escuro - o mesmo bug que a TV
 *    do MEU QUARTO e o microondas tiveram (ver fixUnlitMaterial em
 *    models/tv-factory.js). O material que veio DENTRO deste .glb ja e
 *    Standard (metallic 0, roughness 1), entao ele fica como esta e nao
 *    precisa de conserto nenhum.
 *
 * ---------- A TEXTURA ja vinha DENTRO do .glb ----------
 * Primeira peca importada da COZINHA que nao deu trabalho nenhum nesse
 * ponto: o botijao, a pia, a prateleira e o filtro de barro chegaram com a
 * geometria e a textura em arquivos SEPARADOS e a imagem precisou ser
 * embutida no .glb na mao (ver o bloco de mesmo nome em
 * models/gas-cylinder-factory.js). Este arquivo ja chegou completo - o PNG
 * PSX de 256x256 mora no proprio .glb (data URI image/png), com sampler
 * NEAREST/NEAREST e wrap REPEAT, ligado ao `baseColorTexture` de um
 * material Standard (metallic 0, roughness 1, doubleSided) - e o
 * GLTFLoader do r128 le data URI direto, sem TextureLoader avulso e sem
 * nenhum caminho de codigo novo.
 *
 * Por isso o .glb entrou em assets/models byte a byte como veio do
 * pacote: nada de reexportar, nada de recomprimir, nada de sincronizar um
 * segundo asset. O basecolor_psx.png que veio ao lado dele e a MESMA
 * imagem que ja esta dentro do arquivo - ficou no pacote original como
 * copia editavel e NAO e lido pelo jogo.
 *
 * De carona vem o mesmo detalhe de UV do filtro de barro: textura que
 * mora DENTRO do .glb e lida pelo GLTFLoader com `flipY = false`, que e o
 * certo para UVs de glTF (origem em CIMA). O preview do pacote carrega o
 * PNG solto com THREE.TextureLoader (`flipY = true`), ou seja, e o
 * preview que espelha a textura na vertical - aqui ela cai no lugar
 * sozinha.
 *
 * Sem normal map e sem mapa metallic/roughness (o pacote os removeu de
 * proposito: PS1 nao tinha PBR nenhum, so textura + iluminacao simples).
 * Material Standard puro iluminado pelas luzes da casa, igual ao resto do
 * cenario (ver materials/material-library.js).
 *
 * ---------- Geometria comprimida em Draco ----------
 * SETIMO modelo do jogo com a geometria comprimida em Draco
 * (KHR_draco_mesh_compression, listada como extensao *required* dentro do
 * arquivo: 28.331 vertices / 50.000 triangulos). Os seis primeiros foram o
 * fogao, o botijao, a geladeira, a mesa de frutas, a pia e o filtro de
 * barro, e o <script> do DRACOLoader ja esta em index.html desde entao -
 * nada de novo precisou entrar la por causa desta peca.
 *
 * Continua sendo o MESMO loader dos outros modelos, so com o
 * THREE.DRACOLoader acoplado (`setDRACOLoader`) para ele saber
 * descomprimir. Cada fabrica monta o proprio loader, como todas as outras
 * deste diretorio ja fazem; o decodificador em si e baixado sob demanda
 * e, na segunda vez, sai do cache do navegador.
 *
 * Se o decodificador nao chegar (rede caida, CDN bloqueado), a garrafa
 * simplesmente nao aparece: a falha vai para o console, as fontes
 * alternativas sao tentadas em ordem (DECODER_SOURCES, abaixo) e o boot
 * continua identico - o grupo devolvido por createBottleGlass() nasce
 * vazio e e preenchido de forma assincrona, mesmo comportamento de todos
 * os outros modelos importados.
 *
 * ---------- Convencao de espaco local ----------
 * Mesma convencao "centralizada" das outras pecas da COZINHA (objeto
 * apoiado no chao), e nao a "Z = 0 e a parede" dos moveis de encostar:
 *   - X = 0 e Z = 0 sao o CENTRO da base do CONJUNTO (garrafa + copo
 *     contam como uma peca so: eles vem na mesma malha do arquivo);
 *   - Y = 0 e o chao (base da garrafa e do copo, que se apoiam no mesmo
 *     plano no arquivo);
 *   - a "frente" olha para +Z, mesma convencao de frente do resto do jogo
 *     (ver DoorFactory).
 *
 * Origem no centro da base porque o usuario avisou que pode querer mudar a
 * posicao pelo Editor depois: assim o gizmo gira a peca NO LUGAR, em vez
 * de varrer ela para fora da parede. Quem encosta a peca na parede e
 * scenes/side-room-scene.js, que recebe largura/profundidade finais
 * (`width`/`depth` do retorno) para descontar a metade certa.
 * -------------------------------------------------
 */

window.BottleGlassFactory = (function () {
  const MODEL_URL = "assets/models/bottle_glass_psx.glb";

  // ---------- Fontes do decodificador Draco ----------
  // Mesma lista, na mesma ordem, das outras fabricas com Draco (ver
  // models/stove-factory.js, models/gas-cylinder-factory.js,
  // models/fridge-factory.js, models/fruit-table-factory.js,
  // models/sink-cabinet-factory.js e models/clay-filter-factory.js):
  // primeiro o decodificador do proprio three.js r128 (o MESMO CDN e a
  // MESMA versao de onde index.html ja baixa three.min.js, o GLTFLoader e
  // o DRACOLoader), depois o do Google como rede de seguranca se o
  // jsdelivr estiver bloqueado.
  //
  // Para rodar 100% offline um dia: copie draco_wasm_wrapper.js,
  // draco_decoder.wasm e draco_decoder.js para uma pasta local
  // (ex.: libs/draco/) e ponha o caminho dela PRIMEIRO nesta lista - nas
  // SETE fabricas com Draco. Nada mais precisa mudar.
  const DECODER_SOURCES = [
    "https://cdn.jsdelivr.net/npm/three@0.128/examples/js/libs/draco/",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  ];

  // ---------- Medidas nativas do arquivo .glb ----------
  // Mesma ideia das outras pecas da COZINHA: a bounding box de
  // `gltf.scene`, ou seja, JA com a hierarquia de nos resolvida pelo
  // GLTFLoader - inclusive a rotacao de +90 graus em X que vem "assada" no
  // unico no do arquivo (quaternion 0.7071, 0, 0, 0.7071: a conversao de
  // eixos do exportador, a mesma do fogao, do botijao, da geladeira, da
  // mesa, da pia e do filtro de barro). Nos eixos crus do arquivo o
  // conjunto esta deitado ao longo de -Z; essa rotacao troca os eixos
  // (y = -z, z = y) e poe as pecas de pe, com a base exatamente em y = 0.
  //
  // Medidas tiradas do proprio arquivo: o glTF obriga o accessor de
  // POSITION a trazer min/max, entao da para medir a peca sem
  // descomprimir a geometria Draco. Eixos CRUS do arquivo:
  //   X: -0.44889 a  0.41562
  //   Y: -0.20887 a  0.20707
  //   Z: -0.92949 a  0
  // Depois da rotacao do no (o que o jogo ve):
  //   X (largura):      -0.44889 a 0.41562 -> 0.865
  //   Y (altura):        0.0     a 0.92949 -> 0.929
  //   Z (profundidade): -0.20887 a 0.20707 -> 0.416
  const NATIVE_MIN_X = -0.4488860070705414;
  const NATIVE_MAX_X = 0.4156219959259033;
  const NATIVE_MIN_Y = -0.20886600017547607;
  const NATIVE_MAX_Y = 0.20707100629806519;
  const NATIVE_MIN_Z = -0.9294869899749756;
  const NATIVE_MAX_Z = 0;

  // Os mesmos limites JA nos eixos do jogo (a rotacao de +90 graus em X do
  // no leva y -> -z e z -> y). Escrito assim, e nao com os numeros ja
  // trocados na mao, porque e o que deixa claro de onde cada medida sai -
  // mesma tecnica de ROTATED_* em models/clay-filter-factory.js,
  // models/sink-cabinet-factory.js, models/fruit-table-factory.js,
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
  // Aqui tem reescala, como no botijao, na geladeira, na mesa, na pia e no
  // filtro de barro (e diferente do fogao, da prateleira e do microondas,
  // que chegaram em metros e usam MODEL_SCALE = 1): o arquivo mede
  // 0.865 x 0.416 de base por 0.929 de ALTURA, ou seja, uma garrafa de
  // quase um metro do lado de um copo do tamanho de um balde. E o mesmo
  // vicio de exportacao dos outros pacotes: o modelo chega normalizado
  // para caber em uma caixa de ~1 unidade, seja ele uma geladeira ou um
  // copo.
  //
  // As PROPORCOES estao certas, e sao a prova disso: 0.929 de altura por
  // 0.416 de profundidade da 2.23x mais alto que fundo - e a profundidade
  // e o diametro do corpo mais gordo do conjunto (a garrafa). Garrafa de
  // vidro de 1 litro: uns 30 cm de altura por uns 9 a 10 cm de diametro no
  // corpo, e o resto da profundidade e a folga entre a garrafa e o copo,
  // que nao estao alinhados no mesmo eixo.
  //
  // A ancora escolhida foi a ALTURA, e a escala e UNIFORME (nunca esticar
  // so um eixo: distorceria a peca e a textura). Motivo de ancorar na
  // altura: e a medida que o jogador le, em primeira pessoa, contra o
  // filtro de barro que fica na MESMA parede (0.65, ver
  // models/clay-filter-factory.js), contra a geladeira do lado (1.6) e
  // contra a bancada da pia (0.9) do outro lado do comodo.
  //
  // 0.30 = a altura de uma garrafa de vidro de 1 litro (as de cerveja
  // grande/refrigerante retornavel ficam entre 0.28 e 0.32). Com essa
  // altura a base do CONJUNTO sai 0.28 x 0.13: a garrafa e o copo ocupam
  // 28 cm de comprimento juntos, com 13 cm de fundo - exatamente o que
  // uma garrafa e um copo lado a lado ocupam de verdade. E ela le como
  // menos da metade do filtro de barro ao lado, que e a proporcao certa.
  //
  // Se a peca parecer grande ou pequena demais dentro do jogo, esta e a
  // UNICA linha a mexer: largura, profundidade, recentramento e caixa de
  // colisao saem todas dela. Dando na mesma, o Editor tambem escala a peca
  // no lugar, sem tocar em codigo (ver editor/README.md).
  const TARGET_HEIGHT = 0.3;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // ---------- Para onde a frente do modelo olha ----------
  // Aqui a frente e IRRELEVANTE, e isso tambem esta na bounding box do
  // arquivo: o eixo Z do jogo vai de -0.20887 a +0.20707, ou seja,
  // praticamente simetrico (1.8 mm de diferenca entre os dois lados) - nao
  // ha nenhuma parte da peca sobrando para um lado, como a torneira do
  // filtro de barro ou a porta da geladeira. Garrafa e copo sao corpos de
  // revolucao: nao existe "frente" para acertar.
  //
  // MODEL_YAW = 0, portanto - a MESMA convencao das outras oito pecas da
  // COZINHA e do resto do jogo (ver DoorFactory), so que aqui ela e
  // cosmetica. O que o giro muda de verdade e a ORDEM em que garrafa e
  // copo aparecem no eixo X (o conjunto e assimetrico nesse eixo, ver
  // NATIVE_MIN_X/NATIVE_MAX_X), e isso e decisao de POSICIONAMENTO: quem
  // resolve e o `rotationY` da cena (ver scenes/house-config.js).
  //
  // Se um dia o modelo for trocado, esta e a UNICA linha a mexer: 0 ou
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
  // ClayFilterFactory .width/.height/.depth. Sao as medidas da BOUNDING
  // BOX do CONJUNTO: 0.28 x 0.13 de base, 0.30 de altura. A largura e o
  // dobro da profundidade porque garrafa e copo estao lado a lado no eixo
  // X - cada um deles, sozinho, e redondo.
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
  // "node_0", que nao diz nada - o padrao das outras pecas importadas e o
  // nome do asset, e e por ele que o dicionario NAME_LABELS do Editor acha
  // o rotulo (ver "Identidade dos objetos" em editor/README.md e
  // editor/editor-registry.js). Renomear na hora de carregar deixa a
  // arvore consistente com as outras oito pecas e o id do Editor estavel.
  // Nao muda o arquivo em disco e nao muda geometria nenhuma.
  const MESH_NAME = "bottle_glass_psx";

  // Loader unico e reaproveitado entre chamadas - mesma ideia das outras
  // fabricas com Draco (hoje existe uma garrafa so, mas o decodificador
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
        // sempre e o comodo continua montado, so sem a garrafa (ver
        // comentario do topo).
        console.error(
          "BottleGlassFactory: THREE.DRACOLoader nao esta carregado - a " +
            "garrafa com o copo nao vai aparecer. Confira o <script> do " +
            "DRACOLoader em index.html."
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
  // O sampler que veio no .glb ja pede NEAREST/NEAREST, entao aqui isso e
  // cinto e suspensorio - de proposito: se um dia a textura for trocada por
  // outra que peca LINEAR/mipmap (foi o caso da mesa de frutas), a peca
  // continua pixelada como o resto do jogo sem ninguem precisar lembrar
  // deste detalhe.
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

        // Nome de asset no lugar do "node_0" do arquivo (ver MESH_NAME).
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
        console.error("BottleGlassFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "BottleGlassFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group);
        }
      }
    );
  }

  function createBottleGlass() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2). Sem nome, o
    // id sairia de uma assinatura estrutural - que tambem funciona, mas
    // muda se a peca for reposicionada no codigo.
    group.name = "BottleGlassPSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createBottleGlass: createBottleGlass };
})();
