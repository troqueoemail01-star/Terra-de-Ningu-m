/**
 * models/trash-can-factory.js
 * -------------------------------------------------
 * Lata de lixo decorativa do quarto ("MEU QUARTO") — carregada a
 * partir de um modelo .glb pronto (assets/models/trash_can_psx.glb),
 * na mesma linha do criado-mudo/estante (ver models/nightstand-
 * factory.js e models/bookshelf-factory.js): mesmo THREE.GLTFLoader já
 * usado no resto do jogo, mesmo tratamento de textura "nearest" sem
 * mipmap — nenhum sistema novo de importação, só reaproveitando o que
 * já existe.
 *
 * Origem do asset: "psx trash can", por zynxeror
 * (https://sketchfab.com/3d-models/psx-trash-can-6b691a9cb47249809e52aab5346aa430),
 * licença CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/) — a
 * licença exige atribuição ao autor original caso o jogo seja
 * publicado. A textura embutida no .glb usado aqui já veio reprocessada
 * em estilo PSX (pixelização + dithering, mesma técnica de
 * process_texture.py) antes de entrar em assets/models — mesmo
 * tratamento dos outros modelos importados do jogo (ver comentário
 * equivalente em models/wardrobe-factory.js): não há nenhum efeito de
 * dithering em tempo de execução aqui, só o `normalizeTextures` de
 * sempre (filtro nearest, sem mipmap).
 *
 * ---------- Material unlit: o MESMO conserto da TV ----------
 * (a correção do bug relatado: a lixeira fica brilhando no escuro)
 *
 * O arquivo veio do Sketchfab marcado como "Unlit" (a extensão
 * KHR_materials_unlit está gravada dentro do próprio .glb, em
 * `extensionsUsed`) e o GLTFLoader, ao ver essa extensão, cria um
 * THREE.MeshBasicMaterial — que IGNORA as luzes da cena e desenha a
 * textura sempre no brilho máximo. Em "MEU QUARTO", onde de noite a única
 * luz que chega é a ambiente da casa (0x141018 a 0.35, ver
 * scripts/main.js), a lata era a ÚNICA peça acesa do cômodo: aparecia
 * clarinha no escuro ao lado de um guarda-roupas, uma cama e um
 * criado-mudo escuros.
 *
 * Não é sistema novo nem caso novo — é o MESMO bug e o MESMO conserto que
 * a TV, o microondas, a privada e o rádio portátil já tiveram: a função
 * `fixUnlitMaterial` de models/tv-factory.js, com os mesmos números de
 * acabamento fosco (roughness 0.7 / metalness 0.05). Ela roda DEPOIS de
 * `normalizeTextures`, reaproveitando a textura já normalizada (nearest,
 * sem mipmap, encoding linear) sem recarregar nada, e o material passa a
 * ser THREE.MeshStandardMaterial — iluminado pelas luzes da casa como
 * todo o resto do cenário. Nenhuma geometria, medida, posição ou textura
 * mudou: a lata é a mesma, só deixou de ter luz própria.
 *
 * Duas coisas são PRESERVADAS na troca, e é nelas que esta cópia difere
 * da do microondas — porque esta peça depende das duas:
 *   - `side`: o material do .glb vem `doubleSided` e a lata é uma casca
 *     aberta em cima; com FrontSide o lado de dentro dela desapareceria.
 *   - `alphaTest`: o material vem com `alphaMode: MASK` e
 *     `alphaCutoff: 0.05`, que o GLTFLoader traduz em `alphaTest` — é o
 *     que recorta a textura da lata. Sem copiar isso, o recorte viraria
 *     chapa opaca.
 *
 * Peça puramente decorativa — sem interação, sem outline, sem
 * animação, sem som, sem evento — mesmo tratamento dado ao criado-mudo
 * e à estante (ver NightstandFactory/BookshelfFactory): quem posiciona
 * (scenes/room-scene.js) só decide onde encostar o objeto no chão, ao
 * lado do guarda-roupas, sem nenhuma entrada em `interactables`. Ainda
 * assim entra na lista de `solids` da cena — igual ao criado-mudo/
 * estante — só para o jogador não atravessar o objeto andando; isso é
 * colisão física, não "interação" no sentido do InteractionSystem (sem
 * contorno de destaque, sem prompt de "Interagir", sem diálogo).
 *
 * Convenção de espaço local — diferente da convenção "Z = 0 é a
 * parede" usada por criado-mudo/estante/guarda-roupas (móveis
 * encostados numa parede inteira): a lata de lixo é um objeto solto no
 * chão, não encostado em nenhuma parede por uma face plana, então usa
 * a mesma convenção "centralizada" de PottedPlantFactory:
 *   - X = 0 e Z = 0 são o centro horizontal da base do objeto (a peça
 *     é praticamente simétrica ao redor do próprio eixo vertical).
 *   - Y = 0 é o chão (base do objeto).
 * Isso deixa scenes/room-scene.js livre para só decidir a posição
 * (x, z) do centro da lata ao lado do guarda-roupas, sem precisar
 * saber nada sobre a geometria específica do modelo importado.
 * -------------------------------------------------
 */

window.TrashCanFactory = (function () {
  const MODEL_URL = "assets/models/trash_can_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Assim como em NightstandFactory/BookshelfFactory, estes valores
  // não são metros — são as unidades nativas do arquivo, medidas
  // diretamente nos vértices do modelo (bounding box de `gltf.scene`,
  // já com toda a hierarquia de nós resolvida, incluindo a pequena
  // rotação "assada" nos nós do próprio arquivo — mesma situação dos
  // outros modelos importados, resolvida automaticamente pelo
  // GLTFLoader ao montar `gltf.scene`).
  //
  // Bounding box nativa de `gltf.scene` (eixo a eixo):
  //   X (largura):  -0.56557 a 0.56557
  //   Y (altura):    0.0     a 2.0625
  //   Z (largura):  -0.50804 a 0.50804
  // A base do objeto já nasce exatamente em y = 0 — mesma sorte de
  // BedFactory/NightstandFactory, não precisou de nenhum ajuste de
  // "chão" fora do comum. Como o objeto é praticamente simétrico ao
  // redor do próprio eixo vertical (uma lata de lixo não tem uma
  // "frente" que precise apontar para algum lado), não foi preciso
  // nenhuma rotação de correção — só reescala e recentralização,
  // mesma ideia de NightstandFactory (que também não precisou de
  // rotação).
  const NATIVE_MIN_X = -0.5655717580;
  const NATIVE_MAX_X = 0.5655717580;
  const NATIVE_MIN_Y = 0;
  const NATIVE_MAX_Y = 2.0625;
  const NATIVE_MIN_Z = -0.5080391737;
  const NATIVE_MAX_Z = 0.5080391737;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;
  const NATIVE_HEIGHT = NATIVE_MAX_Y - NATIVE_MIN_Y;

  // Altura final da lata já no mundo do jogo: ainda bem mais baixa que
  // o criado-mudo (NightstandFactory, ~0.66), lendo como uma lata de
  // lixo de quarto — mesma ideia de TARGET_HEIGHT/MODEL_SCALE de
  // WardrobeFactory/BookshelfFactory (o arquivo original não chega em
  // unidades de metro). Valor aumentado a pedido do usuário (era 0.38)
  // depois de ver a peça pequena demais dentro do jogo.
  const TARGET_HEIGHT = 0.5;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // Dimensões finais (já na escala do jogo) — usadas por
  // scenes/room-scene.js para posicionar o objeto ao lado do
  // guarda-roupas e para o sólido de colisão, do mesmo jeito que
  // NightstandFactory.width/height/depth.
  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;
  const FINAL_HEIGHT = TARGET_HEIGHT;

  // Recentraliza a peça para a convenção descrita no comentário do
  // topo: X e Z centralizados em 0 (centro da base) e Y com a base em
  // 0 (chão).
  const MODEL_POSITION_X = -NATIVE_CENTER_X * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z = -NATIVE_CENTER_Z * MODEL_SCALE;

  // Loader único e reaproveitado entre chamadas — mesma ideia de
  // NightstandFactory/BookshelfFactory (hoje só existe uma lata de
  // lixo no quarto, mas não custa nada reaproveitar o mesmo loader se
  // um dia houver mais de uma).
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura usado em NightstandFactory/BookshelfFactory:
  // filtro "nearest" e sem mipmap para o pixel "cru" do visual PSX, e
  // encoding linear para ficar consistente com o resto do jogo (que
  // não usa sRGBEncoding em nenhuma outra textura).
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

  // Conserto do material "Unlit" do arquivo — a MESMA função de
  // models/tv-factory.js (o primeiro modelo do jogo com esse problema),
  // com os mesmos números de acabamento. Ver o bloco "Material unlit" no
  // comentário do topo para o porquê.
  //
  // Roda DEPOIS de normalizeTextures de propósito: a textura já sai dali
  // com nearest/sem mipmap/encoding linear e é reaproveitada como está
  // (`map: mat.map`), sem recarregar nada. `side`, `alphaTest` e
  // `transparent` são preservados porque o material do arquivo vem
  // doubleSided e com alphaMode MASK, e a lata depende dos dois (ver o
  // topo).
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
          alphaTest: mat.alphaTest,
          transparent: mat.transparent,
          roughness: 0.7,
          metalness: 0.05,
        });
        mat.dispose();
        return replacement;
      });
      node.material = isArray ? fixed : fixed[0];
    });
  }

  function createTrashCan() {
    const group = new THREE.Group();

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);
        // Ver o bloco "Material unlit" no topo: sem isto a lata fica no
        // brilho máximo, acesa no meio de um quarto escuro.
        fixUnlitMaterial(model);

        // 1) Escala para o tamanho final no mundo do jogo.
        model.scale.setScalar(MODEL_SCALE);

        // 2) Recentraliza: X e Z no centro da base, Y com a base no
        //    chão (ver comentário de convenção de espaço local no
        //    topo deste arquivo).
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("TrashCanFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createTrashCan: createTrashCan };
})();
