/**
 * models/tavern-table-factory.js
 * -------------------------------------------------
 * Mesa de taverna - peca decorativa de "MEU QUARTO"
 *
 * O pacote da taverna chegou como UM modelo (mesa + 5 garrafas colados). Foi separado em SEIS arquivos .glb independentes (esta mesa + tavern_bottle_01..05_psx.glb), cada um com pivo proprio na base e fabrica propria - foi o pedido explicito: cada peca tem que dar para mexer sozinha no Editor. A escala nativa do arquivo daria uma mesa de 43 cm de altura, entao TARGET_HEIGHT poe ela em 76 cm, altura de mesa de verdade (o proprio manifesto do pacote sugeria 1.75x).
 *
 * Peca puramente DECORATIVA, sem interacao (pedido explicito: "Sao
 * apenas itens decorativos, sem interacoes, (Por enquanto)"): sem
 * outline, sem entrada em `interactables`, sem prompt de "Interagir",
 * sem dialogo, sem animacao, sem som, sem evento. Quem posiciona e o
 * bloco "Pecas decorativas soltas" de scenes/room-scene.js, lendo a
 * lista RoomConfig.props de scenes/room-config.js - mesmo desenho do
 * bloco das pecas do quintal em scenes/corridor-scene.js.
 *
 * ---------- Mesmo sistema de import de sempre ----------
 * Carregada de um .glb em assets/models pelo MESMO THREE.GLTFLoader que
 * carrega todos os outros modelos do jogo (ver models/fern-pot-factory.js
 * e models/trophy-factory.js), com o MESMO normalizeTextures (nearest,
 * sem mipmap, encoding linear) e a MESMA ideia de medir a bounding box
 * nativa UMA vez, escrever as medidas aqui e deixar a cena decidir so
 * ONDE a peca fica. Nenhum carregador novo, nenhum shader novo, nenhum
 * segundo three.js - foi exatamente o pedido: "ja tem outros itens que
 * foram implementados dessa forma, portanto use o mesmo sistema, nao
 * precisa criar algo novo".
 *
 * A geometria chega CRUA (sem Draco e sem extensao de glTF), entao nao
 * passa pelo DRACOLoader e nada precisou mudar no bloco do motor 3D de
 * index.html. A textura PSX ja vem EMBUTIDA no proprio .glb (sampler
 * NEAREST, sem mipmap), entao tambem nao tem TextureLoader avulso aqui.
 *
 * ---------- O motor PSX do pacote NAO entrou ----------
 * O pacote psx-tavern-table veio com preview proprio e um runtime PSX em modulo
 * ES (ShaderMaterial com snap de vertice, warp afim de textura, dither de
 * 15 bits e render em 240p). NADA disso entrou, pelos MESMOS motivos ja
 * escritos em models/fern-pot-factory.js: o jogo roda em three.js r128
 * com scripts globais, entao usar aquele runtime significaria carregar um
 * SEGUNDO three.js na pagina, e o shader dele calcula a luz sozinho - a
 * peca ignoraria o abajur e a luz da manha do quarto. O look PSX daqui ja
 * vem da renderizacao do jogo (resolucao interna baixa, nearest, sem
 * mipmap) e da propria textura reprocessada que veio no arquivo.
 *
 * Peca de DENTRO da casa: nao tem setDaytime/setMorning como as pecas do
 * quintal (models/fern-pot-factory.js). O interior nunca troca para
 * material chapado - o material do arquivo (MeshStandardMaterial) reage a
 * AmbientLight global (scripts/main.js), ao abajur
 * (models/table-lamp-factory.js) e a luz da manha do quarto exatamente
 * como a cama, a estante e o trofeu.
 *
 * ---------- Convencao de espaco local ----------
 *   - X = 0 e Z = 0 sao o CENTRO da base;
 *   - Y = 0 e o chao (base da peca);
 *   - a frente olha para +Z, mesma convencao do resto do jogo.
 * O arquivo ja chega exatamente assim (foi recentralizado na conversao).
 * Origem no centro da base porque o usuario avisou que pode querer mudar
 * a posicao pelo Editor depois: assim o gizmo gira a peca NO LUGAR, em
 * vez de varrer ela para longe.
 * -------------------------------------------------
 */

window.TavernTableFactory = (function () {
  const MODEL_URL = "assets/models/tavern_table_psx.glb";

  // Nome legivel dado as malhas de dentro do arquivo: deixa a arvore do
  // painel de hierarquia do Editor legivel e o id estavel (ver
  // "Identidade dos objetos" em editor/README.md e o dicionario
  // NAME_LABELS de editor/editor-registry.js). Nao muda o arquivo em
  // disco e nao mexe em um vertice.
  const MESH_NAME = "tavern_table_psx";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Bounding box de gltf.scene (ja com a hierarquia de nos resolvida),
  // medida uma vez a partir do proprio arquivo. Escrita aqui pela MESMA
  // razao das outras fabricas de modelo importado: a cena so decide ONDE
  // a peca fica, e nunca precisa esperar o .glb chegar para saber o
  // tamanho dela.
  const NATIVE_MIN_X = -0.425592989;
  const NATIVE_MAX_X = 0.425592989;
  const NATIVE_MIN_Y = 0.000000000;
  const NATIVE_MAX_Y = 0.434634881;
  const NATIVE_MIN_Z = -0.221682504;
  const NATIVE_MAX_Z = 0.221682504;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;
  const NATIVE_HEIGHT = NATIVE_MAX_Y - NATIVE_MIN_Y;

  // ---------- Escala ----------
  // O arquivo nao chega no tamanho de uso (0.851 x 0.435 x 0.443 m nativos),
  // entao a peca e normalizada pela ALTURA, mesma ideia de
  // TARGET_HEIGHT/MODEL_SCALE de BookshelfFactory/TrashCanFactory/
  // TrophyFactory. Resultado final: 1.488 x 0.760 x 0.775 m.
  const TARGET_HEIGHT = 0.76;
  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/room-scene.js para o solido de colisao e para o aviso de
  // pecas sobrepostas, do mesmo jeito que FernPotFactory.width/height/depth.
  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = NATIVE_HEIGHT * MODEL_SCALE;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;

  // Recentraliza para a convencao de espaco local do jogo: X e Z no
  // centro da base, Y com a base no chao. O arquivo ja chega assim, entao
  // a conta da praticamente zero - fica escrita de proposito, igual as
  // outras fabricas: se um dia o .glb for trocado por outro com a origem
  // em outro canto, basta atualizar os seis NATIVE_* acima.
  const MODEL_POSITION_X = -NATIVE_CENTER_X * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z = -NATIVE_CENTER_Z * MODEL_SCALE;

  // Loader unico e reaproveitado entre chamadas, mesma ideia das outras
  // fabricas. Sem DRACOLoader: a geometria deste arquivo chega crua.
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura de todas as pecas importadas: filtro
  // "nearest" e sem mipmap para o pixel cru do visual PSX, e encoding
  // linear para ficar consistente com o resto do jogo. O sampler que o
  // .glb embute ja pede NEAREST, entao aqui e cinto e suspensorio - de
  // proposito.
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

  function createTavernTable() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2, e o rotulo
    // dela em editor/editor-registry.js).
    group.name = "TavernTablePSX";

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        // Nomes legiveis no lugar dos do arquivo (ver MESH_NAME). E
        // deterministico, entao o id que o Editor guarda continua estavel
        // entre execucoes.
        model.name = MESH_NAME;
        model.traverse(function (node) {
          if (node !== model) {
            node.name = MESH_NAME;
          }
        });

        // 1) Escala para o tamanho final no mundo do jogo.
        model.scale.setScalar(MODEL_SCALE);
        // 2) Recentraliza: X e Z no centro da base, Y com a base no chao.
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("TavernTableFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createTavernTable: createTavernTable };
})();
