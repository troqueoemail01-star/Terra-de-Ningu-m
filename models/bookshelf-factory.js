/**
 * models/bookshelf-factory.js
 * -------------------------------------------------
 * Estante de livros decorativa do quarto ("MEU QUARTO") — carregada a
 * partir de um modelo .glb pronto (assets/models/bookshelf_psx.glb),
 * na mesma linha do criado-mudo/relógio/cama (ver
 * models/nightstand-factory.js, models/clock-factory.js e
 * models/bed-factory.js): em vez de construir a peça por geometria
 * procedural, importamos um modelo já pronto (mesmo THREE.GLTFLoader,
 * mesmo tratamento de textura "nearest" sem mipmap) e só ajustamos
 * escala/posição/rotação para ele se encaixar no cenário — nenhum
 * sistema novo de importação, só reaproveitando o que já existe.
 *
 * Origem do asset: "PSX Style Wooden Bookshelf (Low Poly)", por My
 * Name Is This (https://sketchfab.com/3d-models/psx-style-wooden-
 * bookshelf-low-poly-bf8be00f3d344ebdafd701fb90d65497), licença
 * CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). A licença
 * exige atribuição ao autor original caso o jogo seja publicado.
 *
 * Peça puramente decorativa — sem interação, sem outline, sem
 * animação, sem som, sem evento — mesmo tratamento dado ao criado-mudo
 * e ao relógio de parede (ver NightstandFactory/ClockFactory): quem
 * posiciona (scenes/room-scene.js) só decide onde encostar o móvel na
 * parede de fundo, sem nenhuma entrada em `interactables`. Ainda
 * assim entra na lista de `solids` da cena — igual ao criado-mudo —
 * só para o jogador não atravessar o móvel andando; isso é colisão
 * física, não "interação" no sentido do InteractionSystem (sem
 * contorno de destaque, sem prompt de "Interagir", sem diálogo).
 *
 * Convenção de espaço local (mesma ideia de NightstandFactory/
 * ClockFactory/DoorFactory):
 *   - Z = 0 é a parede: a estante começa exatamente nesse plano (a
 *     face de trás, sem prateleiras) e "cresce" para +Z (para dentro
 *     do quarto, onde ficam as prateleiras com os livros).
 *   - Y = 0 é o chão (base do móvel) — mesma convenção de
 *     BedFactory/NightstandFactory (objeto apoiado no chão, não
 *     pendurado/centralizado verticalmente como o relógio).
 *   - X = 0 é o centro horizontal do móvel.
 * Isso deixa scenes/room-scene.js livre para só decidir *onde*
 * encostar a estante na parede de fundo, sem precisar saber nada
 * sobre a geometria específica do modelo importado.
 * -------------------------------------------------
 */

window.BookshelfFactory = (function () {
  const MODEL_URL = "assets/models/bookshelf_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Assim como em NightstandFactory/ClockFactory, estes valores não
  // são metros — são as unidades nativas do arquivo, medidas
  // diretamente nos vértices do modelo (bounding box de
  // `gltf.scene`, já com a correção de eixo que o próprio arquivo já
  // traz "assada" nos nós, aplicada automaticamente pelo GLTFLoader).
  //
  // Bounding box nativa de `gltf.scene` (eixo a eixo):
  //   X (profundidade): -0.86314 a 0.86314
  //   Y (altura):       -5.91835 a 5.91835
  //   Z (largura):      -5.06169 a 5.06169
  // O modelo já nasce bem mais largo/alto do que fundo (proporção de
  // estante encostada na parede — condiz com a malha de 5 prateleiras
  // do asset), mas em uma unidade nativa bem maior que metros (ver
  // TARGET_HEIGHT/MODEL_SCALE abaixo, mesma ideia de ClockFactory).
  const NATIVE_MIN_X = -0.8631383514404297;
  const NATIVE_MAX_X = 0.8631383514404297;
  const NATIVE_MIN_Y = -5.918351440429688;
  const NATIVE_MAX_Y = 5.918351440429688;
  const NATIVE_MIN_Z = -5.061690368652344;
  const NATIVE_MAX_Z = 5.061690368652344;

  // Ajuste de orientação: a frente do móvel (o lado com as
  // prateleiras/livros — visível checando a textura e as normais das
  // faces voltadas para +X no espaço nativo do arquivo) nasce olhando
  // para +X, não para +Z como o resto do jogo espera (parede em Z=0,
  // frente crescendo para dentro do quarto). Uma rotação fixa de -90°
  // em Y resolve isso, mesma ideia de ClockFactory (só que lá a
  // frente nascia em -X, por isso o sinal do ângulo é diferente):
  // com -90°, X nativo (frente/costas) passa a cair em Z do mundo (na
  // mesma direção, frente para frente) e Z nativo (largura) passa a
  // cair em X do mundo (com o sinal invertido — sem problema, a
  // estante é visualmente simétrica na largura).
  //
  // Valores abaixo já são a bounding box *depois* dessa rotação — é o
  // espaço em que `model.scale`/`model.position` são calculados logo
  // abaixo (mesmo formato de ROTATED_MIN/MAX de ClockFactory).
  const ROTATED_MIN_X = -NATIVE_MAX_Z;
  const ROTATED_MAX_X = -NATIVE_MIN_Z;
  const ROTATED_MIN_Y = NATIVE_MIN_Y;
  const ROTATED_MAX_Y = NATIVE_MAX_Y;
  const ROTATED_MIN_Z = NATIVE_MIN_X;
  const ROTATED_MAX_Z = NATIVE_MAX_X;

  const NATIVE_HEIGHT = ROTATED_MAX_Y - ROTATED_MIN_Y;

  // Altura final da estante já no mundo do jogo: bem mais alta que o
  // criado-mudo (NightstandFactory, ~0.66) e que a cabeceira da cama
  // (BED_HEIGHT, ~0.99), para ler como um móvel "de pé" de verdade,
  // mas com folga confortável até o teto do quarto (config.height =
  // 4.2 — ver room-config.js), sem chegar nem perto dele.
  const TARGET_HEIGHT = 2.0;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // Recentraliza a peça (depois de rotacionada e escalada) para a
  // convenção descrita no comentário do topo: X centralizado em 0, Y
  // com a base em 0 (chão) e Z começando em 0 (parede, face de trás)
  // e crescendo para dentro do quarto (frente com as prateleiras).
  const MODEL_POSITION_X = -((ROTATED_MIN_X + ROTATED_MAX_X) / 2) * MODEL_SCALE;
  const MODEL_POSITION_Y = -ROTATED_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z = -ROTATED_MIN_Z * MODEL_SCALE;

  // Dimensões finais (já na escala do jogo) — usadas por
  // scenes/room-scene.js para encostar o móvel na parede de fundo,
  // longe da parede lateral e do criado-mudo, e para o sólido de
  // colisão, do mesmo jeito que NightstandFactory.width/height/depth.
  const FINAL_WIDTH = (ROTATED_MAX_X - ROTATED_MIN_X) * MODEL_SCALE;
  const FINAL_DEPTH = (ROTATED_MAX_Z - ROTATED_MIN_Z) * MODEL_SCALE;
  const FINAL_HEIGHT = TARGET_HEIGHT;

  // Loader único e reaproveitado entre chamadas — mesma ideia de
  // NightstandFactory/ClockFactory (hoje só existe uma estante no
  // quarto, mas não custa nada reaproveitar o mesmo loader se um dia
  // houver mais de uma).
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura usado em NightstandFactory/ClockFactory:
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

  function createBookshelf() {
    const group = new THREE.Group();

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        // 1) Corrige a orientação: as prateleiras nascem olhando para
        //    +X no arquivo original; esta rotação as deixa olhando
        //    para +Z, a convenção de "frente" usada em todo o resto
        //    do jogo (ver DoorFactory/NightstandFactory).
        model.rotation.y = -Math.PI / 2;

        // 2) Escala para o tamanho final no mundo do jogo.
        model.scale.setScalar(MODEL_SCALE);

        // 3) Recentraliza: X no centro da peça, Y com a base no chão,
        //    Z apoiado na parede (0) e crescendo para dentro do
        //    quarto (frente com as prateleiras/livros).
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("BookshelfFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createBookshelf: createBookshelf };
})();
