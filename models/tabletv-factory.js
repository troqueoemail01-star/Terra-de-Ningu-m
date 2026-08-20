/**
 * models/tabletv-factory.js
 * -------------------------------------------------
 * Mesinha de TV do quarto ("MEU QUARTO") — carregada a partir de um
 * modelo .glb pronto (assets/models/tabletv_psx.glb), na mesma linha
 * do criado-mudo/estante/guarda-roupas (ver models/nightstand-factory.js,
 * models/bookshelf-factory.js e models/wardrobe-factory.js): em vez de
 * construir a peça por geometria procedural, importamos um modelo já
 * pronto e só ajustamos escala/posição para ele se encaixar no
 * cenário. Mesmo sistema de importação (THREE.GLTFLoader) já usado por
 * todos os móveis acima — nenhum sistema novo criado para esta peça.
 *
 * Origem do asset: "PS1 Petite and small Table", por loyfox
 * (https://sketchfab.com/loyfox), licença CC-BY-4.0
 * (http://creativecommons.org/licenses/by/4.0/) — metadado gravado no
 * próprio arquivo .glb (asset.extras). Textura já em estilo PSX (32x32,
 * paleta baixa), mesmo tratamento dos outros modelos importados do
 * jogo — nenhuma textura nova foi criada para esta peça.
 *
 * Peça puramente decorativa — sem interação, sem outline, sem prompt
 * de "Interagir", sem diálogo, sem animação, sem som (pedido explícito
 * do usuário). Só entra na lista de `solids` da cena (ver
 * scenes/room-scene.js), mesmo tratamento do criado-mudo/estante: o
 * jogador não atravessa o móvel andando, mas não há nenhuma entrada em
 * `interactables`. Posicionada na parede lateral DIREITA do quarto,
 * perto da parede de entrada (ver RoomConfig.tableTVs em
 * scenes/room-config.js sobre a correção de lado feita nesta versão).
 *
 * Convenção de espaço local — mesma de NightstandFactory/
 * BookshelfFactory (móvel simétrico, sem "frente" única — mesa de 4
 * pernas, textura única compartilhada entre tampo e pernas —, então,
 * ao contrário de Wardrobe/Bookshelf, não precisou de nenhuma rotação
 * de correção antes de recentralizar, mesmo caso de NightstandFactory):
 *   - Z = 0 é a parede: a mesinha começa exatamente nesse plano (a
 *     face de trás) e "cresce" para +Z (para dentro do quarto).
 *   - Y = 0 é o chão (base das pernas).
 *   - X = 0 é o centro horizontal da peça.
 * Isso deixa scenes/room-scene.js livre para só decidir *onde*
 * encostar a mesinha (parede + posição ao longo dela), sem precisar
 * saber nada sobre a geometria específica do modelo importado.
 * -------------------------------------------------
 */

window.TableTVFactory = (function () {
  const MODEL_URL = "assets/models/tabletv_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Assim como em NightstandFactory/PhoneFactory, estes valores não
  // são metros — são as unidades nativas do arquivo, medidas
  // diretamente nos vértices do modelo (bounding box de `gltf.scene`,
  // já com toda a hierarquia de nós resolvida — tampo + 4 pernas
  // juntos, incluindo a correção de eixo que o próprio arquivo já traz
  // "assada" no nó raiz, aplicada automaticamente pelo GLTFLoader ao
  // montar `gltf.scene`, mesma situação dos outros modelos importados).
  //
  // Bounding box nativa de `gltf.scene` (eixo a eixo):
  //   X (largura):      -0.67781 a  0.65771
  //   Y (altura):       -0.76624 a  0.05863
  //   Z (profundidade): -0.62225 a  0.60065
  const NATIVE_MIN_X = -0.6778139;
  const NATIVE_MAX_X = 0.65771364;
  const NATIVE_MIN_Y = -0.76623758;
  const NATIVE_MAX_Y = 0.0586276;
  const NATIVE_MIN_Z = -0.6222546;
  const NATIVE_MAX_Z = 0.60065429;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;

  // Sem reescala: assim como a cama e o criado-mudo (MODEL_SCALE = 1
  // em bed-factory.js/nightstand-factory.js), este modelo já chega em
  // unidades muito próximas do metro — altura ~0.82 é uma proporção
  // plausível para uma mesinha (ligeiramente mais baixa que a
  // escrivaninha do corredor, DESK_HEIGHT = 0.8, praticamente igual) —
  // e já bate com a escala do resto do quarto, então não precisou de
  // nenhum fator de ajuste do tipo TARGET_HEIGHT/MODEL_SCALE usado por
  // WardrobeFactory/BookshelfFactory.
  const MODEL_SCALE = 1;

  // Dimensões finais (já na escala do jogo) — usadas por
  // scenes/room-scene.js para encostar o móvel na parede certa e para
  // o sólido de colisão, do mesmo jeito que
  // NightstandFactory.width/height/depth.
  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = (NATIVE_MAX_Y - NATIVE_MIN_Y) * MODEL_SCALE;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peça para a convenção descrita no comentário do
  // topo: X centralizado em 0, Y com a base em 0 (chão) e Z começando
  // em 0 (parede, face de trás), crescendo para dentro do quarto.
  const MODEL_POSITION_X = -NATIVE_CENTER_X * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z = -NATIVE_MIN_Z * MODEL_SCALE;

  // Loader único e reaproveitado entre chamadas — mesma ideia de
  // NightstandFactory/BookshelfFactory (hoje só existe uma mesinha de
  // TV no quarto, mas não custa nada reaproveitar o mesmo loader se um
  // dia houver mais de uma).
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura usado em NightstandFactory/PhoneFactory/
  // BedFactory: filtro "nearest" e sem mipmap para o pixel "cru" do
  // visual PSX, e encoding linear para ficar consistente com o resto
  // do jogo (que não usa sRGBEncoding em nenhuma outra textura).
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
          mat.map.anisotropy = 1;
          mat.map.encoding = THREE.LinearEncoding;
          mat.map.needsUpdate = true;
        }
      });
      node.castShadow = true;
      node.receiveShadow = true;
    });
  }

  function createTableTV() {
    const group = new THREE.Group();

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        // 1) Escala para o tamanho final no mundo do jogo (hoje 1:1,
        //    ver comentário de MODEL_SCALE acima).
        model.scale.setScalar(MODEL_SCALE);

        // 2) Recentraliza: X no centro da peça, Y com a base no chão,
        //    Z apoiado na parede (0) e crescendo para dentro do
        //    quarto.
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("TableTVFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createTableTV: createTableTV };
})();
