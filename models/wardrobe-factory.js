/**
 * models/wardrobe-factory.js
 * -------------------------------------------------
 * Guarda-roupas do quarto ("MEU QUARTO") — carregado a partir de um
 * modelo .glb pronto (assets/models/wardrobe_psx.glb), na mesma linha
 * do criado-mudo/estante/cama (ver models/nightstand-factory.js,
 * models/bookshelf-factory.js e models/bed-factory.js): mesmo
 * THREE.GLTFLoader já usado no resto do jogo, mesmo tratamento de
 * textura "nearest" sem mipmap — nenhum sistema novo de importação,
 * só reaproveitando o que já existe (ver `getLoader`/`normalizeTextures`
 * abaixo, idênticos aos das outras factories de .glb).
 *
 * Origem do asset: "Closet PS1", por Homie
 * (https://sketchfab.com/3d-models/closet-ps1-71f7484a79284561989745b14765d113),
 * licença CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/) —
 * metadado gravado no próprio .glb (asset.extras), junto com a nota de
 * que a textura já veio reprocessada em estilo PSX (128×128,
 * dither+NEAREST) — mesmo tratamento dos outros modelos importados do
 * jogo. A licença exige atribuição ao autor original caso o jogo seja
 * publicado.
 *
 * ---------- Portas fechadas ----------
 * O arquivo .glb enviado originalmente traz as duas portas abertas
 * (escancaradas para fora, cada uma girada na própria dobradiça).
 * Diferente do resto deste comentário (que é só sobre posicionar um
 * modelo pronto), aqui houve um tratamento extra ANTES de o modelo
 * chegar ao jogo: as duas portas foram fechadas diretamente no arquivo
 * .glb (não em código, e não com uma rotação aplicada em tempo de
 * execução aqui no factory).
 *
 * Como cada porta é um nó de grupo (sem geometria própria) com um nó
 * filho carregando a malha da porta, "fechar" a porta é só encontrar,
 * pela geometria real medida no arquivo (silhueta da porta no plano
 * X-Z: ponto de dobradiça, que não se move, e ponta livre, que
 * varre um arco), o ângulo que falta girar a porta em torno da própria
 * dobradiça (eixo vertical, Y) até ela ficar encostada e alinhada com
 * a face da frente do móvel (onde as duas portas se encontram no
 * centro) — e regravar a matriz local desse nó de grupo com esse
 * ângulo já embutido. As duas portas resultaram encostadas exatamente
 * no mesmo plano, se completando no meio (sem sobreposição nem vão
 * maior que a espessura natural do batente) — dá para conferir a
 * matemática usada nesse ajuste no histórico da conversa que gerou
 * este arquivo, caso o modelo precise ser reprocessado no futuro (por
 * exemplo, se vier a ser trocado por uma versão com uma pose diferente
 * de "aberto").
 *
 * O resultado é que o .glb usado por este factory já chega com o
 * guarda-roupas de portas fechadas "de fábrica" — não existe nenhum
 * código aqui nem em scenes/room-scene.js que abra ou feche portas.
 * Isso também é o que deixa a peça pronta para uma futura animação de
 * abrir/fechar: como as duas portas continuam sendo nós separados
 * dentro da hierarquia do modelo (só a pose inicial delas mudou, a
 * estrutura de nós é a mesma), animá-las mais tarde significa
 * encontrar esses mesmos nós (por nome, via `model.getObjectByName`)
 * e girá-los a partir da pose fechada atual — não precisa desmontar
 * nem reimportar nada.
 *
 * ---------- Interação (reservada para o futuro) ----------
 * Pedido explícito desta atualização: o guarda-roupas já deve ser
 * reconhecido como objeto interativo pelo sistema único de "mira
 * central" (ver scripts/interaction-system.js — funciona só a partir
 * de ter uma `outline`, sem precisar ensinar aquele arquivo a
 * reconhecer mais um tipo de objeto nem mudar nada nele), mas SEM
 * nenhuma ação própria por enquanto: sem abrir/fechar porta, sem
 * diálogo, sem animação, sem som, sem evento algum.
 *
 * A peça entra em `interactables` (ver scenes/room-scene.js) com
 * `kind: "wardrobe"` e uma função `interact()` vazia — mesma "reserva
 * para efeito futuro" já usada em PhoneFactory (ver o comentário
 * daquele arquivo). "wardrobe" não aparece em NENHUM
 * `allowedKinds`/`allowedIds` de objectives/objective-config.js — e é
 * exatamente essa ausência, no sistema que já existe, que faz
 * `objectives/objective-system.js` bloquear por padrão qualquer
 * interação de verdade com a peça (ver o comentário no topo daquele
 * arquivo: "Tudo que não estiver aqui fica bloqueado por padrão"). A
 * diferença para PhoneFactory é que, a partir desta atualização, o id
 * da peça ("guarda-roupa-quarto") TEM uma entrada em
 * `blockedResponses.byId` (mesmo mecanismo já usado pela cama, ver
 * BedFactory e o comentário em RoomConfig.beds): `getBlockedDialogueKey`
 * devolve a chave "guarda-roupa-dormir" de dialogue/dialogue-config.js
 * e scripts/main.js toca essa fala única no lugar da ação normal —
 * sem chamar `interact()` (que segue vazia) nem passar pelo switch por
 * "kind" daquele arquivo. Continua sem abrir/fechar porta, sem
 * animação, sem som, sem qualquer outro evento. Quando a interação de
 * verdade for implementada, basta então adicionar um `case "wardrobe"`
 * no switch de scripts/main.js (mesmo lugar de "phone"/"lightSwitch"/
 * etc.) e, se for o caso, liberar o `kind`/id em objective-config.js —
 * nenhuma mudança adicional necessária aqui.
 *
 * ---------- Convenção de espaço local ----------
 * Mesma convenção de NightstandFactory/BookshelfFactory/DoorFactory:
 *   - Z = 0 é a parede: o guarda-roupas começa exatamente nesse plano
 *     (a face de trás) e "cresce" para +Z (para dentro do quarto, onde
 *     fica a frente com as portas).
 *   - Y = 0 é o chão (base do móvel).
 *   - X = 0 é o centro horizontal do móvel.
 * Isso deixa scenes/room-scene.js livre para só decidir *onde*
 * encostar o guarda-roupas (parede + posição ao longo dela + rotação
 * do grupo conforme a parede), sem precisar saber nada sobre a
 * geometria específica do modelo importado — mesma ideia de
 * NightstandFactory/BookshelfFactory.
 * -------------------------------------------------
 */

window.WardrobeFactory = (function () {
  const MODEL_URL = "assets/models/wardrobe_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Assim como em BookshelfFactory/NightstandFactory, estes valores
  // não são metros — são as unidades nativas do arquivo, medidas
  // diretamente nos vértices do modelo (bounding box de `gltf.scene`,
  // já com toda a hierarquia de nós resolvida — corpo + portas
  // fechadas + puxadores juntos).
  //
  // Bounding box nativa de `gltf.scene` (eixo a eixo):
  //   X (profundidade): -0.63770 a 0.64969
  //   Y (altura):       -2.22512 a 2.03096
  //   Z (largura):      -1.02661 a 1.02661
  const NATIVE_MIN_X = -0.6377043128526734;
  const NATIVE_MAX_X = 0.6496888844460788;
  const NATIVE_MIN_Y = -2.225115386212586;
  const NATIVE_MAX_Y = 2.0309563901713403;
  const NATIVE_MIN_Z = -1.0266117552724894;
  const NATIVE_MAX_Z = 1.0266117552724894;

  // Ajuste de orientação: a frente do móvel (o lado com as portas —
  // checando a dobradiça/puxadores medidos diretamente no arquivo)
  // nasce olhando para +X no espaço nativo, não para +Z como o resto
  // do jogo espera (parede em Z=0, frente crescendo para dentro do
  // quarto). Mesma correção de -90° em Y já usada por BookshelfFactory
  // (que tem exatamente o mesmo caso: frente nativa em +X): com -90°,
  // X nativo (frente/costas) passa a cair em Z do mundo (na mesma
  // direção, frente para frente) e Z nativo (largura) passa a cair em
  // X do mundo (mestre espelhado — sem problema, o guarda-roupas é
  // visualmente simétrico na largura, com as duas portas se
  // encontrando no centro).
  //
  // Valores abaixo já são a bounding box *depois* dessa rotação — é o
  // espaço em que `model.scale`/`model.position` são calculados logo
  // abaixo (mesmo formato de ROTATED_MIN/MAX de BookshelfFactory).
  const ROTATED_MIN_X = -NATIVE_MAX_Z;
  const ROTATED_MAX_X = -NATIVE_MIN_Z;
  const ROTATED_MIN_Y = NATIVE_MIN_Y;
  const ROTATED_MAX_Y = NATIVE_MAX_Y;
  const ROTATED_MIN_Z = NATIVE_MIN_X;
  const ROTATED_MAX_Z = NATIVE_MAX_X;

  const NATIVE_HEIGHT = ROTATED_MAX_Y - ROTATED_MIN_Y;

  // Altura final do guarda-roupas já no mundo do jogo: mais alto que a
  // estante (BookshelfFactory.TARGET_HEIGHT = 2.0) e bem mais alto que
  // o criado-mudo/cama, para ler como um móvel "de pé" imponente (como
  // no print de referência do usuário), mas com folga confortável até
  // o teto do quarto (config.height = 4.2 — ver room-config.js), sem
  // chegar nem perto dele. Com essa altura, a peça resulta com ~1.04m
  // de largura e ~0.65m de profundidade — proporções plausíveis de
  // guarda-roupa de duas portas.
  const TARGET_HEIGHT = 2.15;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // Recentraliza a peça (depois de rotacionada e escalada) para a
  // convenção descrita no comentário do topo: X centralizado em 0, Y
  // com a base em 0 (chão) e Z começando em 0 (parede, face de trás) e
  // crescendo para dentro do quarto (frente com as portas).
  const MODEL_POSITION_X = -((ROTATED_MIN_X + ROTATED_MAX_X) / 2) * MODEL_SCALE;
  const MODEL_POSITION_Y = -ROTATED_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z = -ROTATED_MIN_Z * MODEL_SCALE;

  // Dimensões finais (já na escala do jogo) — usadas por
  // scenes/room-scene.js para encostar o móvel na parede indicada e
  // para o sólido de colisão, do jeito de sempre
  // (NightstandFactory.width/height/depth, BookshelfFactory.*).
  const FINAL_WIDTH = (ROTATED_MAX_X - ROTATED_MIN_X) * MODEL_SCALE;
  const FINAL_DEPTH = (ROTATED_MAX_Z - ROTATED_MIN_Z) * MODEL_SCALE;
  const FINAL_HEIGHT = TARGET_HEIGHT;

  // Loader único e reaproveitado entre chamadas — mesma ideia de
  // NightstandFactory/BookshelfFactory (hoje só existe um
  // guarda-roupas no quarto, mas não custa nada reaproveitar o mesmo
  // loader se um dia houver mais de um).
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

  // ---------- Contorno de destaque (placeholder até o modelo carregar) ----------
  // Mesma técnica de PhoneFactory (ver o comentário detalhado naquele
  // arquivo): OutlineFactory.build devolve sempre um único THREE.Mesh
  // (nunca um Group), porque o InteractionSystem faz raycast direto
  // nele (não recursivo). Como o carregamento do .glb é assíncrono mas
  // `createWardrobe` precisa devolver `outline` já pronto (a
  // referência é guardada de imediato em scenes/room-scene.js), cria-se
  // aqui um Mesh "vazio" válido — troca de geometria no lugar quando o
  // modelo terminar de carregar, sem trocar a referência do objeto.
  function createEmptyGeometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(0), 3));
    return geometry;
  }

  function createWardrobe(materials) {
    const group = new THREE.Group();

    // Placeholder do contorno — ver comentário acima. Já entra como
    // filho de `group` desde já, para `outline.getWorldPosition(...)`
    // (lido a cada quadro pelo InteractionSystem, para o alcance de
    // interação) devolver a posição certa do guarda-roupas desde o
    // primeiro quadro, mesmo antes do modelo terminar de carregar — só
    // o raycast (que exige geometria de verdade) fica sem efeito até
    // lá.
    const outline = new THREE.Mesh(createEmptyGeometry(), materials.outline);
    outline.visible = false;
    group.add(outline);

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        // 1) Corrige a orientação: as portas nascem olhando para +X no
        //    arquivo original; esta rotação as deixa olhando para +Z,
        //    a convenção de "frente" usada em todo o resto do jogo
        //    (ver DoorFactory/NightstandFactory/BookshelfFactory).
        model.rotation.y = -Math.PI / 2;

        // 2) Escala para o tamanho final no mundo do jogo.
        model.scale.setScalar(MODEL_SCALE);

        // 3) Recentraliza: X no centro da peça, Y com a base no chão,
        //    Z apoiado na parede (0) e crescendo para dentro do
        //    quarto (frente com as portas, já fechadas no próprio
        //    arquivo — ver comentário no topo deste arquivo).
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);

        // Agora que a peça de verdade está no grupo, reconstrói a
        // casca de contorno a partir da silhueta real dela — e só
        // troca a geometria do mesh placeholder no lugar (mesma
        // referência de objeto devolvida por `createWardrobe`).
        const built = window.OutlineFactory.build(group, materials.outline);
        outline.geometry.dispose();
        outline.geometry = built.geometry;
      },
      undefined,
      function onError(error) {
        console.error("WardrobeFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    // ---------- Interação (reservada para efeito futuro) ----------
    // Ver o comentário longo no topo deste arquivo: a peça já é
    // reconhecida pelo InteractionSystem (mira + contorno + prompt de
    // "Interagir", só por ter `outline`), mas esta função continua
    // vazia de propósito — nenhuma ação, diálogo, animação, som ou
    // evento por enquanto. `kind: "wardrobe"` não aparece em nenhum
    // `allowedKinds`/`blockedResponses` de objectives/objective-config.js,
    // então o próprio sistema de objetivos já garante que apertar
    // "Interagir" aqui não faz nada (ver scripts/main.js) — sem
    // precisar de nenhuma outra mudança além desta função reservada.
    function interact() {
      // Intencionalmente vazio por enquanto.
    }

    return {
      group: group,
      outline: outline,
      interact: interact,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createWardrobe: createWardrobe };
})();
