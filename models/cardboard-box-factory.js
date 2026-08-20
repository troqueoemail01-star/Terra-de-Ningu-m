/**
 * models/cardboard-box-factory.js
 * -------------------------------------------------
 * Caixa de papelão decorativa do quarto ("MEU QUARTO") — carregada a
 * partir de um modelo .glb pronto (assets/models/cardboard_box_psx.glb),
 * na mesma linha da lata de lixo/guarda-roupas (ver models/trash-can-
 * factory.js e models/wardrobe-factory.js): mesmo THREE.GLTFLoader já
 * usado no resto do jogo, mesmo tratamento de textura "nearest" sem
 * mipmap — nenhum sistema novo de importação, só reaproveitando o que já
 * existe.
 *
 * Origem do asset: "Caixa no estilo de ps1", por Moustache_Cat
 * (https://sketchfab.com/3d-models/caixa-no-estilo-de-ps1-468eedea33ce4e67badf78f820a06511),
 * licença CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/) — a
 * licença exige atribuição ao autor original caso o jogo seja publicado.
 *
 * ---------- Correção de orientação (Z-up → Y-up) ----------
 * Diferente de TrashCanFactory (modelo já exportado direto em Y-up, sem
 * precisar de nenhuma rotação de correção), o .glb desta caixa traz, no
 * próprio nó raiz da cena (`Sketchfab_model`), uma rotação de -90° em
 * torno do eixo X "assada" na matriz do nó — conversão padrão de
 * ferramentas como Blender (que trabalha com Z para cima) para a
 * convenção Y-up do glTF. As medidas nativas abaixo (NATIVE_*) são as da
 * malha propriamente dita, ANTES dessa rotação (bounding box do
 * accessor de posição do único mesh do arquivo); ROTATED_* é a mesma
 * caixa depois de já aplicada a mesma rotação de -90° em X (mesmo
 * princípio de ROTATED_MIN/MAX de WardrobeFactory/BookshelfFactory, que
 * corrigem uma rotação de -90° em Y — aqui o eixo da correção é X, não
 * Y, então o remapeamento de eixos é outro: X nativo permanece X, Z
 * nativo (profundidade no espaço Z-up) passa a ser a nova altura Y, e Y
 * nativo (altura no espaço Z-up) passa a ser -Z, com o sinal invertido
 * pela regra padrão de rotação -90° em X).
 * -------------------------------------------------
 */

window.CardboardBoxFactory = (function () {
  const MODEL_URL = "assets/models/cardboard_box_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Assim como em WardrobeFactory/TrashCanFactory, estes valores não são
  // metros — são as unidades nativas do arquivo, medidas diretamente nos
  // vértices do modelo (bounding box do accessor POSITION do único mesh
  // do arquivo, ANTES da rotação de correção do nó raiz — ver comentário
  // acima).
  const NATIVE_MIN_X = -1.0056519508361816;
  const NATIVE_MAX_X = 1.0;
  const NATIVE_MIN_Y = -1.020293951034546;
  const NATIVE_MAX_Y = 1.0228749513626099;
  const NATIVE_MIN_Z = -0.7473350167274475;
  const NATIVE_MAX_Z = 0.7767540216445923;

  // Bounding box já depois da rotação de -90° em X do nó raiz (ver
  // comentário no topo do arquivo sobre o remapeamento de eixos: X fica
  // igual, Y novo = Z nativo, Z novo = -Y nativo) — é o espaço em que
  // `model.scale`/`model.position` são calculados logo abaixo, mesmo
  // formato de ROTATED_MIN/MAX de WardrobeFactory.
  const ROTATED_MIN_X = NATIVE_MIN_X;
  const ROTATED_MAX_X = NATIVE_MAX_X;
  const ROTATED_MIN_Y = NATIVE_MIN_Z;
  const ROTATED_MAX_Y = NATIVE_MAX_Z;
  const ROTATED_MIN_Z = -NATIVE_MAX_Y;
  const ROTATED_MAX_Z = -NATIVE_MIN_Y;

  const NATIVE_HEIGHT = ROTATED_MAX_Y - ROTATED_MIN_Y;

  // Altura final da caixa já no mundo do jogo: proporção de uma caixa de
  // papelão pequena/média comum (a malha nativa já é praticamente um
  // cubo levemente achatado — ver ROTATED_* acima, largura/profundidade
  // um pouco maiores que a altura). Precisa caber com folga no topo do
  // guarda-roupas (WardrobeFactory.depth ≈ 0.65m) MESMO já considerando
  // a rotação decorativa aplicada em scenes/room-scene.js (ver comentário
  // lá: girar uma caixa quase quadrada aumenta a "sombra" dela projetada
  // nos eixos do mundo) — por isso o valor final ficou um pouco menor do
  // que uma primeira estimativa sem rotação sugeriria.
  const TARGET_HEIGHT = 0.35;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // Dimensões finais (já na escala do jogo) — usadas por
  // scenes/room-scene.js para centralizar a caixa no topo do
  // guarda-roupas, do mesmo jeito que TrashCanFactory.width/depth.
  const FINAL_WIDTH = (ROTATED_MAX_X - ROTATED_MIN_X) * MODEL_SCALE;
  const FINAL_DEPTH = (ROTATED_MAX_Z - ROTATED_MIN_Z) * MODEL_SCALE;
  const FINAL_HEIGHT = TARGET_HEIGHT;

  // Recentraliza a peça para a mesma convenção "centralizada" de
  // TrashCanFactory/PottedPlantFactory (objeto solto, não encostado em
  // nenhuma parede por uma face plana): X e Z centralizados em 0 (centro
  // da base) e Y com a base em 0 — aqui a base é ROTATED_MIN_Y, não 0,
  // ao contrário da lata de lixo (que já nascia com a base exatamente
  // em y = 0); por isso a recentralização em Y usa ROTATED_MIN_Y em vez
  // de assumir que já é zero.
  const MODEL_POSITION_X = -((ROTATED_MIN_X + ROTATED_MAX_X) / 2) * MODEL_SCALE;
  const MODEL_POSITION_Y = -ROTATED_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z = -((ROTATED_MIN_Z + ROTATED_MAX_Z) / 2) * MODEL_SCALE;

  // Loader único e reaproveitado entre chamadas — mesma ideia de
  // WardrobeFactory/TrashCanFactory (hoje só existe uma caixa no quarto,
  // mas não custa nada reaproveitar o mesmo loader se um dia houver mais
  // de uma).
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura usado em WardrobeFactory/TrashCanFactory:
  // filtro "nearest" e sem mipmap para o pixel "cru" do visual PSX, e
  // encoding linear para ficar consistente com o resto do jogo (que não
  // usa sRGBEncoding em nenhuma outra textura — nem `colorSpace`, API
  // que nem existe no three.js r128 usado aqui, ver script tag em
  // index.html e o mesmo comentário em models/floor-plant-factory.js).
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

  // Peça puramente decorativa (pedido explícito do usuário): sem
  // interação, sem outline, sem animação, sem som, sem evento — mesmo
  // tratamento de TrashCanFactory. `createCardboardBox` não recebe
  // `materials` (diferente de WardrobeFactory) pelo mesmo motivo de
  // TrashCanFactory.createTrashCan: sem outline, não precisa do material
  // de contorno.
  function createCardboardBox() {
    const group = new THREE.Group();

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        // 1) Corrige a orientação Z-up → Y-up (ver comentário no topo
        //    deste arquivo) — mesma ideia da correção de -90° em Y de
        //    WardrobeFactory/BookshelfFactory, aqui em torno de X.
        model.rotation.x = -Math.PI / 2;

        // 2) Escala para o tamanho final no mundo do jogo.
        model.scale.setScalar(MODEL_SCALE);

        // 3) Recentraliza: X e Z no centro da base, Y com a base em 0
        //    (ver comentário de convenção de espaço local acima).
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("CardboardBoxFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createCardboardBox: createCardboardBox };
})();
