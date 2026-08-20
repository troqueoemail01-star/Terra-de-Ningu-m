/**
 * models/toilet-factory.js
 * -------------------------------------------------
 * PRIVADA do BANHEIRO - carregada a partir de um modelo .glb pronto
 * (assets/models/toilet_psx.glb), no MESMO sistema de importacao dos
 * outros modelos do jogo (ver models/stove-factory.js,
 * models/fridge-factory.js, models/sink-cabinet-factory.js,
 * models/clay-filter-factory.js e models/portable-radio-factory.js): o
 * mesmo THREE.GLTFLoader que ja carrega os outros .glb de
 * assets/models, o mesmo THREE.DRACOLoader acoplado das pecas com
 * geometria comprimida, o mesmo `normalizeTextures` (filtro nearest,
 * sem mipmap, encoding linear), o mesmo `fixUnlitMaterial` de
 * models/tv-factory.js e a mesma ideia de "medir a bounding box nativa
 * UMA vez, escrever as medidas aqui e deixar a cena so decidir ONDE a
 * peca fica". Nenhum carregador novo, nenhum shader novo, nenhum
 * sistema paralelo de 3D - foi exatamente o pedido: "ja tem outros
 * itens que foram implementados dessa forma, portanto use o mesmo
 * sistema, nao precisa criar algo novo".
 *
 * PRIMEIRA das SEIS pecas decorativas do BANHEIRO (as outras cinco:
 * models/bathroom-sink-factory.js, models/mirror-cabinet-factory.js,
 * models/towel-factory.js, models/shower-box-factory.js e
 * models/laundry-basket-factory.js). Ate esta atualizacao o BANHEIRO era
 * so a caixa arquitetonica de scenes/side-room-scene.js.
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem evento (pedido explicito: "sao apenas itens decorativos,
 * sem interacoes, (por enquanto)") - mesmo tratamento das dez pecas da
 * COZINHA e dos moveis do MEU QUARTO: quem posiciona
 * (scenes/side-room-scene.js) so decide onde a peca encosta, sem nenhuma
 * entrada em `interactables`. Ainda assim entra na lista de `solids` da
 * cena, so para o jogador nao atravessar a privada andando; isso e
 * colisao FISICA, nao "interacao" no sentido do InteractionSystem (sem
 * contorno de destaque, sem prompt de "Interagir", sem dialogo). O dia
 * em que der descarga, o lugar disso e `interactables`, nao esta
 * fabrica.
 *
 * ---------- O arquivo entrou COMO CHEGOU, byte a byte ----------
 * Diferente da toalha, do box e do cesto (cujos pacotes trouxeram a
 * geometria e a textura em arquivos SEPARADOS, ver o bloco "A TEXTURA
 * foi embutida no .glb" nas fabricas deles), o pacote da privada ja
 * entregou UM arquivo completo: geometria Draco + a textura PSX de
 * 256x256 embutida como PNG em bufferView, com sampler NEAREST/NEAREST.
 * assets/models/toilet_psx.glb e copia identica do arquivo enviado
 * (237 KB, 31.393 vertices / 50.000 triangulos). Nada foi reexportado,
 * nada foi recomprimido.
 *
 * O que NAO entrou do pacote: o preview (index.html, src/PSXStage.js,
 * src/PSXMaterial.js, src/ToiletPSX.js), a copia do .glb em base64
 * (assets/toilet_psx_embedded.js, que existe so para o preview abrir por
 * file://) e as duas texturas soltas. Motivos, os MESMOS ja escritos nas
 * fabricas da COZINHA: o preview roda em three.js 0.16x por modulos ES
 * com importmap e o jogo roda em three.js r128 com scripts globais (ver
 * index.html) - usar o codigo do pacote significaria um SEGUNDO three.js
 * na pagina, que e exatamente o "sistema novo" que o pedido descarta; e
 * o efeito PS1 do preview e por peca (ShaderMaterial + render target
 * proprios), enquanto no jogo o visual PSX ja e do JOGO INTEIRO
 * (resolucao interna baixa, vinheta, scanlines e motion blur) - duas
 * camadas do mesmo efeito so brigariam entre si.
 *
 * ---------- O material vinha "Unlit" ----------
 * O .glb marca o material com KHR_materials_unlit, entao o GLTFLoader
 * cria um MeshBasicMaterial - que IGNORA as luzes e desenha a textura no
 * brilho maximo. A privada seria a UNICA peca autoiluminada de um
 * banheiro escuro, o mesmo bug que a TV do MEU QUARTO, o microondas e o
 * radio portatil ja tiveram. A fabrica roda a MESMA funcao
 * `fixUnlitMaterial` da TV (MeshStandardMaterial com a textura ja
 * normalizada, roughness 0.7 / metalness 0.05), depois de
 * normalizeTextures, e o `side` DoubleSide do arquivo e preservado (a
 * malha e um scan e tem casca fina em alguns pontos).
 *
 * ---------- Geometria comprimida em Draco ----------
 * KHR_draco_mesh_compression, listada como extensao *required* dentro do
 * arquivo. O <script> do DRACOLoader ja esta em index.html desde a
 * COZINHA - nada de novo precisou entrar la por causa desta peca. Se o
 * decodificador nao chegar (rede caida, CDN bloqueado), a privada
 * simplesmente nao aparece: a falha vai para o console, as fontes
 * alternativas sao tentadas em ordem (DECODER_SOURCES, abaixo) e o boot
 * continua identico - o grupo devolvido por createToilet() nasce vazio e
 * e preenchido de forma assincrona, mesmo comportamento de todos os
 * outros modelos importados.
 *
 * ---------- Convencao de espaco local ----------
 *   - X = 0 e Z = 0 sao o CENTRO da base da privada;
 *   - Y = 0 e o chao (base do vaso);
 *   - a "frente" (o vaso, o lado oposto a caixa de descarga) olha para
 *     +Z, mesma convencao de frente do resto do jogo (ver DoorFactory).
 *
 * Origem no centro da base porque o usuario avisou que pode querer mudar
 * a posicao pelo Editor depois: assim o gizmo gira a peca NO LUGAR, em
 * vez de varrer ela para fora da parede. Quem encosta a privada na
 * parede e scenes/side-room-scene.js, que recebe largura/profundidade
 * finais (`width`/`depth` do retorno) para descontar a metade certa.
 * -------------------------------------------------
 */

window.ToiletFactory = (function () {
  const MODEL_URL = "assets/models/toilet_psx.glb";

  // ---------- Fontes do decodificador Draco ----------
  // Mesma lista, na mesma ordem, das fabricas com Draco da COZINHA
  // (ver models/clay-filter-factory.js): primeiro o decodificador do
  // proprio three.js r128 (o MESMO CDN e a MESMA versao de onde
  // index.html ja baixa three.min.js, o GLTFLoader e o DRACOLoader),
  // depois o do Google como rede de seguranca se o jsdelivr estiver
  // bloqueado.
  //
  // Para rodar 100% offline um dia: copie draco_wasm_wrapper.js,
  // draco_decoder.wasm e draco_decoder.js para uma pasta local
  // (ex.: libs/draco/) e ponha o caminho dela PRIMEIRO nesta lista - em
  // TODAS as fabricas com Draco. Nada mais precisa mudar.
  const DECODER_SOURCES = [
    "https://cdn.jsdelivr.net/npm/three@0.128/examples/js/libs/draco/",
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  ];

  // ---------- Medidas nativas do arquivo .glb ----------
  // Medidas tiradas do proprio arquivo: o glTF obriga o accessor de
  // POSITION a trazer min/max, entao da para medir a peca sem
  // descomprimir a geometria Draco. Eixos CRUS do arquivo:
  //   X: -0.21619 a  0.27872
  //   Y: -0.26274 a  0.31954
  //   Z: -0.97586 a  0
  const NATIVE_MIN_X = -0.2161940038204193;
  const NATIVE_MAX_X = 0.2787199914455414;
  const NATIVE_MIN_Y = -0.2627379894256592;
  const NATIVE_MAX_Y = 0.31953901052474976;
  const NATIVE_MIN_Z = -0.9758579730987549;
  const NATIVE_MAX_Z = 0;

  // Os mesmos limites JA nos eixos do jogo. O unico no do arquivo traz
  // uma rotacao de +90 graus em X assada nele (a conversao de eixo do
  // exportador, a mesma do botijao, da geladeira, da pia da cozinha e do
  // filtro de barro), e o GLTFLoader aplica isso sozinho ao montar
  // `gltf.scene`: y -> -z e z -> y. Nos eixos crus o modelo esta deitado
  // ao longo de -Z; a rotacao poe a peca de pe, com a base exatamente em
  // y = 0.
  //
  // Escrito como conta, e nao com os numeros ja trocados na mao, porque e
  // o que deixa claro de onde cada medida sai - mesma tecnica de
  // ROTATED_* em models/clay-filter-factory.js.
  // Depois da rotacao (o que o jogo ve):
  //   X (largura):       -0.21619 a 0.27872 -> 0.495
  //   Y (altura):         0.0     a 0.97586 -> 0.976
  //   Z (profundidade):  -0.26274 a 0.31954 -> 0.582
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
  // Tem reescala, como a geladeira, a pia da cozinha e o filtro de barro:
  // o pacote chegou NORMALIZADO (a bounding box tem 0.976 de altura, ou
  // seja, o modelo foi encaixado num cubo de ~1 unidade pelo aplicativo
  // de escaneamento), e nao em metros. As PROPORCOES estao certas e sao a
  // prova disso: 0.976 de altura por 0.495 de largura da 1.97x mais alto
  // que largo, que e a proporcao de uma privada com caixa acoplada de
  // verdade (0.78 de altura por 0.40 de largura da 1.95x).
  //
  // A ancora escolhida foi a ALTURA, e a escala e UNIFORME (nunca
  // esticar so um eixo: distorceria a peca e a textura). 0.78 e a altura
  // de uma privada com caixa acoplada padrao, medida do chao ao topo da
  // tampa da caixa. Com ela a base sai 0.40 x 0.47, que e a pegada real
  // da peca.
  //
  // Referencias do proprio jogo para conferir que fecha: a pia do
  // banheiro ao lado (0.85 de altura, ver models/bathroom-sink-factory.js),
  // a altura do olho do jogador (1.6, CorridorConfig.eyeHeight) e o
  // pe-direito (4.2, CorridorConfig.height).
  //
  // Se ela parecer grande ou pequena demais dentro do jogo, esta e a
  // UNICA linha a mexer: largura, profundidade, recentramento e caixa de
  // colisao saem todas dela. Dando na mesma, o Editor tambem escala a
  // peca no lugar, sem tocar em codigo (ver editor/README.md).
  const TARGET_HEIGHT = 0.78;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // ---------- Para onde a frente do modelo olha ----------
  // Medida na bounding box, nao chutada: no eixo Z do jogo a peca vai de
  // -0.263 a +0.320, ou seja, sobra material para o lado +Z. Numa privada
  // com caixa acoplada e o VASO que avanca (a caixa fica rente a parede),
  // entao a frente cai em +Z - a MESMA convencao das dez pecas da COZINHA
  // e do resto do jogo (ver DoorFactory).
  //
  // A malha chega comprimida em Draco, entao nao ha como conferir isso
  // pela textura aqui dentro (como se fez no radio portatil): se a peca
  // aparecer de costas no jogo, esta e a UNICA linha a mexer: 0 ou
  // Math.PI. O recentramento abaixo acompanha o giro sozinho, e 180 graus
  // nao mudam largura/profundidade, entao a colisao segue exata. (Para 90
  // graus seria preciso trocar FINAL_WIDTH por FINAL_DEPTH tambem - nao
  // implementado porque nao ha uso: girar 90 graus e trabalho de
  // POSICIONAMENTO, e quem faz isso e a cena, ver `rotationY` em
  // scenes/side-room-scene.js.) Dando na mesma, um giro no Editor
  // resolve sem tocar em codigo.
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/side-room-scene.js para encostar a peca na parede e para o
  // solido de colisao, do mesmo jeito que StoveFactory/FridgeFactory
  // .width/.height/.depth. Sao as medidas da BOUNDING BOX: 0.40 x 0.47
  // de base, 0.78 de altura.
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

  // Nome da malha de dentro do modelo. O arquivo ja chama o unico no dele
  // de "toilet_psx", que e o padrao das outras pecas importadas (o nome
  // do asset) - a renomeacao aqui e so para garantir isso mesmo se o
  // .glb for trocado por outra versao com nome de exportador. E por este
  // nome que o dicionario NAME_LABELS do Editor acha o rotulo (ver
  // "Identidade dos objetos" em editor/README.md e
  // editor/editor-registry.js). Nao muda o arquivo em disco e nao muda
  // geometria nenhuma.
  const MESH_NAME = "toilet_psx";

  // Loader unico e reaproveitado entre chamadas - mesma ideia das outras
  // fabricas com Draco (hoje existe uma privada so, mas o decodificador
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
        // sempre e o comodo continua montado, so sem a privada.
        console.error(
          "ToiletFactory: THREE.DRACOLoader nao esta carregado - a privada " +
            "nao vai aparecer. Confira o <script> do DRACOLoader em index.html."
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

  // Mesmo ajuste de textura das outras pecas importadas: filtro
  // "nearest" e sem mipmap para o pixel "cru" do visual PSX, e encoding
  // linear para ficar consistente com o resto do jogo (que nao usa
  // sRGBEncoding em nenhuma outra textura).
  //
  // O sampler que o pacote embutiu no .glb ja pede NEAREST/NEAREST,
  // entao aqui isso e cinto e suspensorio - de proposito: se um dia a
  // textura for trocada por outra que peca LINEAR/mipmap, a peca
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

  // Conserto do material "Unlit" do arquivo - a MESMA funcao de
  // models/tv-factory.js (o primeiro modelo do jogo com esse problema),
  // de models/microwave-factory.js e de
  // models/portable-radio-factory.js, com os mesmos numeros de
  // acabamento. Ver o bloco "O material vinha Unlit" no comentario do
  // topo para o porque.
  //
  // Roda DEPOIS de normalizeTextures de proposito: a textura ja sai dali
  // com nearest/sem mipmap/encoding linear e e reaproveitada como esta
  // (`map: mat.map`), sem recarregar nada. `side` e preservado porque o
  // material do arquivo vem doubleSided.
  function fixUnlitMaterial(model) {
    model.traverse(function (node) {
      if (!node.isMesh || !node.material) {
        return;
      }
      const isArray = Array.isArray(node.material);
      const materials = isArray ? node.material : [node.material];
      const fixed = materials.map(function (mat) {
        if (!mat.isMeshBasicMaterial) {
          return mat;
        }
        const replacement = new THREE.MeshStandardMaterial({
          map: mat.map || null,
          color: mat.color ? mat.color.clone() : undefined,
          side: mat.side,
          roughness: 0.7,
          metalness: 0.05,
        });
        mat.dispose();
        return replacement;
      });
      node.material = isArray ? fixed : fixed[0];
    });
  }

  function loadInto(group) {
    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);
        fixUnlitMaterial(model);

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
        console.error("ToiletFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "ToiletFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group);
        }
      }
    );
  }

  function createToilet() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2). Sem nome, o
    // id sairia de uma assinatura estrutural - que tambem funciona, mas
    // muda se a peca for reposicionada no codigo.
    group.name = "ToiletPSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createToilet: createToilet };
})();
