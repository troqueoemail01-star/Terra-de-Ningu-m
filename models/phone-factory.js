/**
 * models/phone-factory.js
 * -------------------------------------------------
 * Telefone de mesa antigo — agora carregado a partir de um
 * modelo .glb pronto (assets/models/old_telephone_psx.glb,
 * um telefone com fio clássico, textura já reprocessada em
 * estilo PSX) em vez de construído por geometria procedural
 * (versão anterior). É só uma troca de modelo: a posição, o
 * "espaço" que o telefone ocupa sobre a escrivaninha e o
 * comportamento de interação continuam exatamente como
 * estavam — ver DeskFactory, que continua posicionando/
 * escalando este grupo do jeito de sempre, sem saber (nem
 * precisar saber) que o telefone agora vem de um arquivo.
 *
 * Mesma convenção do resto do jogo (ver DoorFactory): olha
 * para +Z no espaço local (o lado "de frente" do aparelho —
 * onde fica o teclado — encara quem se aproxima) e todo o
 * modelo é construído a partir de y = 0 local (o tampo da
 * escrivaninha), então "sobe" a partir daí sem depender de
 * nenhum ajuste externo de altura. O .glb já traz essa
 * orientação praticamente pronta (ver comentário de
 * MODEL_SCALE/NATIVE_* mais abaixo) — não foi preciso
 * rotacionar nada, só reescalar e recentralizar.
 *
 * Continua interativo: quando o jogador aperta "Interagir"
 * por perto (mira em cima dele), a interação é reconhecida
 * (função `interact`). A mini cutscene (fade in/out) e o
 * diálogo da ligação com Ravi que isso dispara não vivem
 * aqui — são orquestrados em scripts/main.js, junto com
 * cutscenes/phone-sequence.js — esta função continua
 * reservada para um efeito futuro no próprio modelo, por
 * enquanto vazia, exatamente como na versão anterior. Só que
 * agora o modelo é uma única malha importada (sem peças
 * separadas tipo "fone"/"forquilha" como antes); um efeito
 * futuro aqui provavelmente exigiria ou mexer na geometria
 * importada, ou trocar por uma versão do asset com partes
 * separadas — não é um problema para resolver agora.
 * -------------------------------------------------
 */

window.PhoneFactory = (function () {
  const MODEL_URL = "assets/models/old_telephone_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // O arquivo já traz, "assada" no nó raiz da sua hierarquia, a
  // correção de eixo de quem o gerou (Y-up do glTF a partir de uma
  // origem provavelmente Z-up) — uma rotação de 180° em X. O
  // GLTFLoader aplica isso sozinho ao montar `gltf.scene`, então o
  // resultado já nasce "de pé" (base perto de y = 0) e olhando na
  // direção certa (o teclado inclinado fica voltado para cima e para
  // +Z — mesmo sentido de "quem se aproxima" usado no resto do jogo;
  // a forquilha/fone ficam para -Z, ou seja, "atrás", como no modelo
  // anterior). Por isso não há nenhuma rotação aplicada abaixo — só
  // reescala e recentraliza.
  //
  // Estes quatro valores (min/max em Y, mais o "centro" do corpo em X
  // e Z) foram medidos diretamente nos vértices do modelo — não são
  // metros, são as unidades nativas do arquivo. NATIVE_CENTER_X/Z
  // ignoram de propósito a ponta solta do fio espiralado do fone: ele
  // se estende bem mais para o lado -X do que qualquer outra parte do
  // aparelho, então incluí-lo na média puxaria o "centro" calculado
  // para bem longe do centro visual real do corpo do telefone (base +
  // fone) — o que faria o corpo parecer descentralizado em relação ao
  // ponto onde a DeskFactory posiciona este grupo.
  const NATIVE_MIN_Y = -0.0403; // base do telefone
  const NATIVE_MAX_Y = 13.0174; // topo do fone apoiado na forquilha
  const NATIVE_CENTER_X = 0.5;
  const NATIVE_CENTER_Z = -0.012;

  // Altura total do telefone antigo (procedural) que este modelo
  // substitui, do tampo da escrivaninha (y = 0 local) até o topo do
  // fone apoiado na forquilha — mesmo cálculo de
  // HANDSET_REST_Y + EAR_RADIUS * EAR_SCALE.y da versão anterior
  // deste arquivo. É o alvo de altura usado para calcular o fator de
  // escala abaixo, para o novo modelo ocupar sobre a escrivaninha
  // aproximadamente o mesmo espaço vertical que o antigo ocupava.
  const TARGET_HEIGHT = 0.1556;

  const NATIVE_HEIGHT = NATIVE_MAX_Y - NATIVE_MIN_Y;
  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // Só para o metadado de referência devolvido em `width`/`depth` (ver
  // comentário no retorno de `createPhone`) — footprint aproximado do
  // corpo (base + fone, sem contar o fio) já na escala final.
  const NATIVE_CORE_WIDTH = 25.06;
  const NATIVE_CORE_DEPTH = 24.975;

  // ---------- Contorno de destaque (placeholder até o modelo carregar) ----------
  // OutlineFactory.build devolve sempre um único THREE.Mesh (nunca um
  // Group) de propósito: o InteractionSystem faz raycast direto nele
  // (`raycaster.intersectObject(item.outline, false)`, não
  // recursivo — ver interaction-system.js). Como o carregamento do
  // .glb é assíncrono mas `createPhone` precisa devolver `outline` já
  // pronto (a referência é guardada de imediato em
  // corridor-scene.js), criamos aqui um Mesh "vazio" válido (posição +
  // normal com zero vértices, não só `new THREE.BufferGeometry()` sem
  // nenhum atributo) — isso evita erro quando, mais tarde,
  // OutlineFactory.build percorrer este mesmo grupo de novo e
  // encontrar este mesh já como filho dele (ver `onLoad` abaixo, dentro
  // de `createPhone`).
  // Continua sendo o MESMO objeto do início ao fim: quando o modelo
  // termina de carregar, só a geometria dele é trocada no lugar — quem
  // já guardou essa referência nem precisa saber que isso aconteceu.
  function createEmptyGeometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(0), 3));
    return geometry;
  }

  // Loader único e reaproveitado entre chamadas (hoje só existe uma
  // escrivaninha/telefone no corredor, mas não custa nada reaproveitar
  // o mesmo loader se um dia houver mais de um).
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Ajusta as texturas do modelo importado para a mesma convenção
  // visual usada em todo o resto do jogo (ver materials/textures.js):
  // filtro "nearest" e sem mipmap, para o pixel "cru" característico
  // do visual PSX, e encoding linear (nenhuma outra textura do jogo
  // usa sRGBEncoding, então mantemos o telefone consistente com elas
  // em vez de deixar o valor padrão do GLTFLoader, que trataria o
  // baseColorTexture como sRGB e destoaria em brilho/saturação do
  // resto da cena).
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

  function createPhone(materials) {
    const group = new THREE.Group();

    // Placeholder do contorno — ver comentário de createEmptyGeometry
    // acima. Já entra como filho de `group` desde já: assim,
    // `outline.getWorldPosition(...)` (lido a cada quadro pelo
    // InteractionSystem, para o alcance de interação) já devolve a
    // posição certa do telefone sobre a escrivaninha desde o primeiro
    // quadro, mesmo antes do modelo terminar de carregar — só o
    // raycast (que exige geometria de verdade) fica sem efeito até lá.
    const outline = new THREE.Mesh(createEmptyGeometry(), materials.outline);
    outline.visible = false;
    group.add(outline);

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        model.scale.setScalar(MODEL_SCALE);
        model.position.set(
          -NATIVE_CENTER_X * MODEL_SCALE,
          -NATIVE_MIN_Y * MODEL_SCALE,
          -NATIVE_CENTER_Z * MODEL_SCALE
        );
        group.add(model);

        // Agora que a peça de verdade está no grupo, reconstrói a
        // casca de contorno a partir da silhueta real dela — e só
        // troca a geometria do mesh placeholder no lugar (mesma
        // referência de objeto devolvida por `createPhone`; ver
        // comentário mais acima).
        const built = window.OutlineFactory.build(group, materials.outline);
        outline.geometry.dispose();
        outline.geometry = built.geometry;
      },
      undefined,
      function onError(error) {
        console.error("PhoneFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    // ---------- Interação (reservada para efeito futuro no modelo) ----------
    // O sistema de interação já reconhece o telefone (mira + alcance)
    // e chama esta função quando o jogador aperta "Interagir" com ele
    // em destaque. A mecânica de verdade (mini cutscene de fade +
    // diálogo com Ravi) é disparada em paralelo por scripts/main.js
    // (ver cutscenes/phone-sequence.js) — esta função continua vazia,
    // reservada para um efeito futuro só do modelo em si, sem
    // som/animação/evento por enquanto — exatamente como antes.
    function interact() {
      // Intencionalmente vazio por enquanto.
    }

    return {
      group: group,
      outline: outline,
      interact: interact,
      width: NATIVE_CORE_WIDTH * MODEL_SCALE,
      depth: NATIVE_CORE_DEPTH * MODEL_SCALE,
    };
  }

  return { createPhone: createPhone };
})();
