/**
 * models/trophy-factory.js
 * -------------------------------------------------
 * Troféu decorativo do quarto ("MEU QUARTO") — carregado a partir de um
 * modelo .glb pronto (assets/models/trophy_psx.glb), na mesma linha da
 * caixa de papelão/lata de lixo (ver models/cardboard-box-factory.js e
 * models/trash-can-factory.js): mesmo THREE.GLTFLoader já usado no resto
 * do jogo, mesmo tratamento de textura "nearest"/sem mipmap do visual
 * PSX — nenhum sistema novo de importação criado, só mais uma "fábrica"
 * seguindo a mesma receita das outras.
 *
 * Origem do asset: modelo enviado pelo jogador, um pacote próprio
 * ("psx-trophy-threejs") contendo o `.glb` original mais um sistema de
 * shader customizado (PSXMaterial/loadTrophy) para simular o hardware do
 * PS1. Só o `.glb` (geometria/material base, sem nenhuma alteração de
 * vértices/UVs/hierarquia) foi aproveitado aqui — o shader customizado
 * do pacote NÃO foi usado porque, por design (ver README daquele
 * pacote), ele ignora completamente as luzes de `THREE.Scene` e calcula
 * a iluminação sozinho via uniforms próprios; isso conflitaria com o
 * pedido explícito de que o troféu seja "corretamente iluminado pela
 * iluminação do quarto" e criaria uma segunda arquitetura de material/
 * carregamento rodando em paralelo ao resto do jogo. Em vez disso, o
 * `.glb` é carregado do jeito de sempre (GLTFLoader + normalizeTextures
 * abaixo), então o troféu reage à AmbientLight global
 * (scripts/main.js) e à luz do abajur (models/table-lamp-factory.js)
 * exatamente como qualquer outro objeto importado do quarto.
 *
 * O `.glb` traz dois materiais simples de cor lisa (sem textura de
 * imagem — `baseColorFactor` só): a base/pedestal escura e o corpo
 * dourado do troféu propriamente dito. Metadados do próprio arquivo:
 * "PSX Style Trophy" por Piterus13
 * (https://sketchfab.com/3d-models/psx-style-trophy-3d7df1e5e94147cda835c2fd732b91aa),
 * licença CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/) — a
 * licença exige atribuição ao autor original caso o jogo seja
 * publicado.
 *
 * Peça puramente decorativa (pedido explícito do usuário): sem
 * interação, sem outline, sem entrada em `interactables`, sem `solids`
 * próprio (a área ocupada pelo troféu, em cima da estante, já está
 * inteiramente coberta pela caixa de colisão da própria estante — ver
 * bloco "Estante" em scenes/room-scene.js, mesmo raciocínio já usado
 * pela caixa de papelão em cima do guarda-roupas e pela TV em cima da
 * mesinha), sem animação, sem som, sem evento.
 *
 * ---------- Orientação ----------
 * Diferente de CardboardBoxFactory/RadioFactory (que precisam de uma
 * rotação manual de correção Z-up → Y-up), este `.glb` já traz essa
 * conversão "assada" nos próprios nós da cena (mesma situação de
 * TrashCanFactory/BookshelfFactory) — o GLTFLoader resolve isso sozinho
 * ao montar `gltf.scene`, então os valores nativos abaixo (NATIVE_*) já
 * estão na orientação Y-up correta, sem precisar de nenhum
 * `model.rotation.x/y` extra aqui. A peça (uma taça sobre uma base) é
 * praticamente simétrica ao redor do próprio eixo vertical — igual a
 * TrashCanFactory, não tem uma "frente" que precise apontar para algum
 * lado específico.
 * -------------------------------------------------
 */

window.TrophyFactory = (function () {
  const MODEL_URL = "assets/models/trophy_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Assim como em TrashCanFactory/BookshelfFactory, estes valores não
  // são metros — são as unidades nativas do arquivo, medidas
  // diretamente nos vértices de `gltf.scene` (bounding box já com toda
  // a hierarquia de nós resolvida, incluindo a correção de eixo
  // "assada" nos nós do próprio arquivo).
  //
  // Bounding box nativa de `gltf.scene` (eixo a eixo):
  //   X (largura):  -0.37946 a  0.38007
  //   Y (altura):   -0.43889 a  0.43339
  //   Z (profund.): -0.22813 a  0.22813
  // A base do troféu (pedestal escuro) não nasce exatamente em y = 0
  // como a lata de lixo — por isso a recentralização abaixo usa
  // NATIVE_MIN_Y explicitamente, mesmo raciocínio de CardboardBoxFactory.
  const NATIVE_MIN_X = -0.3794641725998815;
  const NATIVE_MAX_X = 0.38006916663172063;
  const NATIVE_MIN_Y = -0.43888959288597107;
  const NATIVE_MAX_Y = 0.4333897017130326;
  const NATIVE_MIN_Z = -0.22813348241020215;
  const NATIVE_MAX_Z = 0.22813348241020215;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;
  const NATIVE_HEIGHT = NATIVE_MAX_Y - NATIVE_MIN_Y;

  // Altura final do troféu já no mundo do jogo: tamanho de um troféu de
  // mesa/prateleira comum (~25-30cm), pouco menor que o abajur do
  // criado-mudo (TableLampFactory.TARGET_HEIGHT = 0.34) e do rádio em
  // pé (RadioFactory, ~0.236 "standing"), grande o bastante para ler
  // como uma peça de destaque em cima da estante (BookshelfFactory.
  // FINAL_WIDTH ≈ 1.71m de largura, bem mais largo que o troféu, então
  // não há risco de ficar apertado) sem competir em tamanho com a
  // própria estante (BookshelfFactory.TARGET_HEIGHT = 2.0).
  const TARGET_HEIGHT = 0.27;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // Dimensões finais (já na escala do jogo) — usadas por
  // scenes/room-scene.js para centralizar o troféu em cima da estante,
  // do mesmo jeito que CardboardBoxFactory.width/height/depth.
  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;
  const FINAL_HEIGHT = TARGET_HEIGHT;

  // Recentraliza a peça para a mesma convenção "centralizada" de
  // TrashCanFactory/CardboardBoxFactory (objeto solto sobre uma
  // superfície, sem nenhuma face encostada em parede): X e Z
  // centralizados em 0 (centro da base) e Y com a base em 0 (a
  // superfície de apoio — aqui, o topo da estante).
  const MODEL_POSITION_X = -NATIVE_CENTER_X * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z = -NATIVE_CENTER_Z * MODEL_SCALE;

  // Loader único e reaproveitado entre chamadas — mesma ideia de
  // CardboardBoxFactory/TrashCanFactory (hoje só existe um troféu no
  // quarto, mas não custa nada reaproveitar o mesmo loader se um dia
  // houver mais de um).
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura usado no resto dos modelos importados:
  // filtro "nearest" e sem mipmap para o pixel "cru" do visual PSX, e
  // encoding linear para ficar consistente com o resto do jogo (que
  // não usa sRGBEncoding em nenhuma outra textura). Os dois materiais
  // deste modelo são cor lisa (`baseColorFactor`, sem `map`), então
  // este passo não tem efeito prático aqui além de manter o mesmo
  // tratamento aplicado a todo modelo importado, por consistência.
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
  // tratamento de CardboardBoxFactory.createCardboardBox. Não recebe
  // `materials` pelo mesmo motivo: sem outline, não precisa do
  // material de contorno.
  function createTrophy() {
    const group = new THREE.Group();

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        // 1) Escala para o tamanho final no mundo do jogo (ver
        //    TARGET_HEIGHT/MODEL_SCALE acima).
        model.scale.setScalar(MODEL_SCALE);

        // 2) Recentraliza: X e Z no centro da base, Y com a base em 0
        //    (ver comentário de convenção de espaço local acima) —
        //    assim, quem posiciona este grupo (scenes/room-scene.js)
        //    só precisa somar a altura do topo da estante, sem saber
        //    nada da geometria específica do modelo importado.
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("TrophyFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createTrophy: createTrophy };
})();
