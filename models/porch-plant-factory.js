/**
 * models/porch-plant-factory.js
 * -------------------------------------------------
 * A PLANTA DA VARANDA - primeira das QUATRO pecas decorativas que a
 * varanda da entrada recebeu nesta rodada (as outras tres sao a CADEIRA
 * DE PLASTICO, a CHURRASQUEIRA e o VARAL COM ROUPA, ver
 * models/plastic-chair-factory.js, models/barbecue-grill-factory.js e
 * models/clothesline-factory.js).
 *
 * Carregada a partir de um modelo .glb pronto
 * (assets/models/porch_plant_psx.glb), no MESMO sistema de importacao de
 * todos os outros modelos do jogo (ver models/stove-factory.js,
 * models/gas-cylinder-factory.js, models/fridge-factory.js e
 * models/tree-forest-factory.js): o mesmo THREE.GLTFLoader que ja
 * carrega os outros .glb de assets/models, o mesmo THREE.DRACOLoader
 * acoplado, o mesmo `normalizeTextures` (nearest, sem mipmap, encoding
 * linear) e a mesma ideia de "medir a bounding box nativa UMA vez,
 * escrever as medidas aqui e deixar a cena so decidir ONDE a peca
 * fica". Nenhum carregador novo, nenhum shader novo, nenhum sistema
 * paralelo de 3D - foi exatamente o pedido: "ja tem outros itens que
 * foram implementados dessa forma, portanto use o mesmo sistema, nao
 * precisa criar algo novo".
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem evento (pedido explicito: "Sao apenas itens
 * decorativos, sem interacoes, (Por enquanto)"). Quem posiciona
 * (scenes/corridor-scene.js, bloco "Pecas decorativas da varanda") so
 * decide em que canto da varanda ela encosta, sem nenhuma entrada em
 * `interactables`. Ainda assim entra na lista de `solids` da cena - so
 * para o jogador nao atravessar o vaso andando quando a porta
 * ENTRADA & SAIDA abrir; isso e colisao FISICA, nao "interacao" no
 * sentido do InteractionSystem.
 *
 * ---------- Sobre o pacote em que o modelo chegou (psx-plant.zip) ----------
 * O .glb veio acompanhado de um preview proprio (index.html,
 * standalone.html, js/app.js) e de um motor PSX em modulo ES
 * (js/psx.js): ShaderMaterial com snap de vertice, warp afim de
 * textura, gouraud por vertice e dither de 15 bits, mais um pipeline
 * que renderiza num framebuffer de 240 linhas. NADA dos dois entrou
 * aqui, pelos MESMOS motivos ja escritos em models/stove-factory.js e
 * models/fridge-factory.js:
 *
 *  - o jogo roda em three.js r128 com scripts globais (ver index.html),
 *    nao em modulos ES com importmap: `import * as THREE from 'three'`
 *    nao existe neste contexto. Usar o motor do pacote significaria
 *    carregar um SEGUNDO three.js na pagina, que e exatamente o
 *    "sistema novo" que o pedido descarta;
 *  - aquele shader tem luz PROPRIA fixa. Dentro do jogo, so a planta
 *    ignoraria as luzes da casa e apareceria chapada no meio de um
 *    cenario escuro - o look PSX daqui ja vem da renderizacao do jogo
 *    (resolucao interna baixa, filtro nearest, sem mipmap).
 *
 * O que importava do pacote - a geometria Draco e a textura PSX 256x256
 * (15 bits, dither ordenado) - entrou inteiro: a geometria como veio e
 * a textura EMBUTIDA no .glb (ver abaixo).
 *
 * ---------- A textura veio SOLTA e foi embutida no .glb ----------
 * Mesmo fluxo do botijao de gas (ver models/gas-cylinder-factory.js):
 * o plant.glb do pacote traz SO a geometria (sem material e sem imagem
 * nenhuma) e a textura mora ao lado, em assets/plant_psx_256.png, para
 * o preview aplicar em tempo de execucao. Como o jogo carrega .glb e
 * nao modulos ES, essa mesma imagem foi embutida bit a bit dentro de
 * assets/models/porch_plant_psx.glb, com sampler NEAREST e wrap REPEAT,
 * e o material (MeshStandardMaterial, metalness 0, roughness 1,
 * doubleSided) foi criado no proprio arquivo. Mudou so ONDE a imagem
 * mora: o modelo continua sendo UM arquivo carregado pelo MESMO
 * GLTFLoader, sem TextureLoader avulso e sem um segundo asset para
 * sincronizar. A geometria Draco nao foi tocada.
 *
 * `doubleSided` porque as folhas sao cartoes/casquinhas abertas (o
 * material do preview tambem e DoubleSide): sem isso metade da
 * folhagem sumiria dependendo do angulo.
 *
 * ---------- O V da textura (a pegadinha do pacote) ----------
 * O preview do pacote carrega a textura com o `flipY` PADRAO do
 * three.js (true, ver applyPSXTextureSettings em js/psx.js), mas o
 * README dele garante que a malha nao foi alterada - "mesmos vertices,
 * mesmos triangulos, mesmas UVs" -, ou seja o UV do arquivo e UV de
 * glTF (V de cima para baixo), e a textura PSX e uma requantizacao da
 * base color ORIGINAL, na mesma orientacao dela (medido: a mesma
 * conferencia feita no pacote do varal da erro ~2 na orientacao direta
 * contra ~42 na invertida). Com UV de glTF e imagem na orientacao
 * original, quem esta certo e `flipY = false` - exatamente o que o
 * GLTFLoader usa, e o que o pacote da CADEIRA (o mais bem acabado dos
 * quatro) escreve com todas as letras em src/PSXMaterial.js ("UV de
 * glTF"). Por isso a imagem foi embutida SEM inverter.
 *
 * Se algum dia a folhagem aparecer espelhada na vertical, o conserto e
 * uma linha em `normalizeTextures` (aqui embaixo), sem tocar no .glb:
 *
 *     mat.map.repeat.y = -1; mat.map.offset.y = 1;
 *
 * (funciona sempre, inclusive quando a imagem chega como ImageBitmap,
 * caso em que `map.flipY` e ignorado pelo three.js).
 *
 * ---------- Geometria comprimida em Draco ----------
 * KHR_draco_mesh_compression marcada como extensao *required* dentro do
 * arquivo (39.988 vertices / 37.418 triangulos). O <script> do
 * DRACOLoader ja esta em index.html desde o fogao, entao nada de novo
 * precisou entrar la. Se o decodificador nao chegar (rede caida, CDN
 * bloqueado), a planta simplesmente nao aparece: a falha vai para o
 * console, as fontes alternativas sao tentadas em ordem
 * (DECODER_SOURCES) e o boot continua identico - o grupo devolvido por
 * createPorchPlant() nasce vazio e e preenchido de forma assincrona,
 * mesmo comportamento de todos os outros modelos importados.
 *
 * ---------- Convencao de espaco local ----------
 * Mesma convencao "centralizada" de StoveFactory/FridgeFactory (objeto
 * apoiado no chao):
 *   - X = 0 e Z = 0 sao o CENTRO da base;
 *   - Y = 0 e o chao (base da peca);
 *   - a frente olha para +Z, mesma convencao de "frente" do resto do
 *     jogo (ver DoorFactory).
 * Origem no centro da base porque o usuario avisou que pode querer
 * mudar a posicao pelo Editor depois: assim o gizmo gira a peca NO
 * LUGAR, em vez de varrer ela para fora do canto.
 *
 * ---------- Noite e dia (o que esta peca tem de diferente) ----------
 * Esta e a primeira familia de modelos importados que fica na VARANDA,
 * ou seja do lado de FORA da casa - e do lado de fora ninguem sobrevive
 * so com o material do arquivo: de manha o chao de grama, o gramado, a
 * estrada, a fachada e a propria varanda trocam para material CHAPADO
 * (MeshBasicMaterial, ver materials/material-library.js e o
 * `porchPlasterDay`), porque nao existe sol de verdade na cena. Um
 * modelo iluminado no meio de um cenario chapado apareceria PRETO.
 *
 * Entao a peca cumpre o MESMO contrato de tudo que vive lá fora
 * (`setDaytime`/`setMorning`), pelo MESMO caminho da floresta importada
 * (ver models/tree-forest-factory.js): a mesma geometria e a mesma
 * textura servem aos dois periodos e o que troca e so o material -
 * MeshStandardMaterial de noite (reage a luz ambiente 0x141018 a 0.35,
 * ver scripts/main.js) e MeshBasicMaterial de dia, no mesmo tom em que
 * a varanda amanhece (DAY_TINT). Reversivel, por causa do controle de
 * horario do Editor, e pode ser chamado ANTES do .glb terminar de
 * carregar: o estado fica guardado e e aplicado quando as malhas
 * existirem.
 * -------------------------------------------------
 */

window.PorchPlantFactory = (function () {
  const MODEL_URL = "assets/models/porch_plant_psx.glb";

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
  // A bounding box de `gltf.scene`, ou seja JA com a hierarquia de nos
  // resolvida pelo GLTFLoader. Medidas tiradas do proprio arquivo: o glTF
  // obriga o accessor de POSITION a trazer min/max, entao da para medir a
  // peca sem descomprimir a geometria Draco. Eixos CRUS do arquivo:
  const NATIVE_MIN_X = -0.6851909756660461;
  const NATIVE_MAX_X = 0.38343000411987305;
  const NATIVE_MIN_Y = -0.19124199450016022;
  const NATIVE_MAX_Y = 0.1899919956922531;
  const NATIVE_MIN_Z = -0.7385119795799255;
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
  // Sem reescala (MODEL_SCALE = 1), como o fogao: o arquivo ja chega em
  // metros e nas medidas de uma jardineira de verdade - 1.069 x 0.381 de
  // base por 0.739 de altura, ou seja um vaso comprido de planta na altura
  // do muro da varanda (0.88 medido do piso dela). Esticar so um eixo
  // nunca esta em jogo: distorceria a peca e a textura.
  const MODEL_SCALE = 1;

  // ---------- Para onde a frente do modelo olha ----------
  // O arquivo tem UM no e UMA malha, sem nada no nome que diga qual lado e
  // a frente. Assumido o MESMO lado do fogao, do botijao e da geladeira,
  // que sairam da mesma esteira de conversao (o no traz a mesma rotacao de
  // +90 graus em X): a frente cai em +Z depois da rotacao do no. Numa
  // planta a diferenca e quase nenhuma; se ainda assim ficar melhor virada,
  // esta e a UNICA linha a mexer (0 ou Math.PI) - o recentramento acompanha
  // o giro sozinho e a colisao segue exata. O Editor tambem gira a peca no
  // lugar, sem tocar em codigo.
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
            "PorchPlantFactory: THREE.DRACOLoader nao esta carregado - a peca nao " +
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
        console.error("PorchPlantFactory: falha ao carregar " + MODEL_URL, error);
        if (nextDecoderSource()) {
          console.warn(
            "PorchPlantFactory: tentando outra fonte do decodificador Draco: " +
              DECODER_SOURCES[decoderSourceIndex]
          );
          loadInto(group, state);
        }
      }
    );
  }

  function createPorchPlant() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2, e o rotulo
    // dela em editor/editor-registry.js).
    group.name = "PorchPlantPSX";

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

  return { createPorchPlant: createPorchPlant };
})();
