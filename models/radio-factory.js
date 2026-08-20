/**
 * models/radio-factory.js
 * -------------------------------------------------
 * Rádio de mão decorativo do quarto ("MEU QUARTO") — carregado a
 * partir de um modelo .glb pronto (assets/models/hand_radio_psx.glb),
 * na mesma linha da caixa de papelão/lata de lixo (ver models/
 * cardboard-box-factory.js e models/trash-can-factory.js): mesmo
 * THREE.GLTFLoader já usado no resto do jogo, mesma normalização de
 * textura "nearest"/sem mipmap do visual PSX — nenhum sistema novo de
 * importação criado, só mais uma "fábrica" seguindo a mesma receita
 * das outras.
 *
 * Origem do asset: modelo enviado pelo jogador ("PS1 Hand Radio",
 * originalmente via Sketchfab) — arquivo .glb usado sem nenhuma
 * alteração de geometria (posições/normais/UVs/hierarquia de nós
 * intactas), só o tratamento de material/textura descrito abaixo.
 *
 * Fica em cima da mesinha de TV, ao lado da TV (ver bloco "Mesinha de
 * TV" em scenes/room-scene.js — o rádio é adicionado como mais um
 * filho do grupo da mesinha, exatamente como a TV: "anda junto" com
 * ela automaticamente, sem duplicar nenhuma conta de posição). Peça
 * puramente decorativa (pedido explícito do usuário): sem outline,
 * sem entrada em `interactables`, sem `solids` próprio (a caixa de
 * colisão da mesinha já cobre a área por baixo dele), sem animação,
 * sem som, sem evento — mesmo tratamento da caixa de papelão em cima
 * do guarda-roupas.
 *
 * ---------- Correção de orientação (Z-up → Y-up) ----------
 * O .glb traz, no nó raiz da cena ("Sketchfab_model"), uma rotação de
 * +90° em torno do eixo X "assada" na matriz do nó — mesma conversão
 * padrão de ferramentas como Blender (Z para cima) para a convenção
 * Y-up do glTF já vista em CardboardBoxFactory, só que com o sinal
 * oposto (lá era -90°, aqui é +90° — o GLTFLoader aplica isso sozinho
 * ao montar `gltf.scene`, então as medidas nativas abaixo (NATIVE_*)
 * já são as de `gltf.scene` pronto, com essa conversão já resolvida:
 * o rádio nasce "em pé" (eixo Y = altura, o maior dos três, ~2,36
 * unidades — o modelo é claramente mais alto do que largo/fundo,
 * como um rádio de mão segurado na vertical), com a tela voltada para
 * +Z (mesma convenção de "frente" do resto do jogo).
 *
 * Isso NÃO é a correção de orientação usada abaixo em
 * `model.rotation.x` — aquela outra rotação (também -90° em X, mesmo
 * valor da correção da caixa de papelão, mas aqui aplicada por um
 * motivo diferente) é a pose "deitado" pedida pelo usuário: deita o
 * rádio de costas sobre o tampo da mesinha, com a tela voltada para
 * cima (em vez de para a frente, como ficaria se o rádio continuasse
 * em pé). O mesmo remapeamento de eixos da caixa de papelão vale
 * aqui: X nativo permanece X (largura, inalterada por uma rotação em
 * torno do próprio X), Y nativo (altura, em pé) passa a ser a nova
 * profundidade -Z (o "topo"/antena do rádio aponta para a parede), e
 * Z nativo (frente/tela) passa a ser a nova altura Y (a tela, antes
 * voltada para a frente, passa a apontar para cima).
 * -------------------------------------------------
 */

window.RadioFactory = (function () {
  const MODEL_URL = "assets/models/hand_radio_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Assim como em CardboardBoxFactory/WardrobeFactory, estes valores
  // não são metros — são as unidades nativas do arquivo, medidas
  // diretamente nos vértices de `gltf.scene` (bounding box já com
  // toda a hierarquia de nós resolvida, incluindo a correção de eixo
  // "assada" no nó raiz — ver comentário no topo do arquivo). Cobrem
  // as duas malhas do modelo (corpo + tela do visor) juntas — a tela
  // já está inteiramente contida dentro da caixa do corpo, não
  // precisa de nenhum tratamento separado como o controle remoto de
  // TVFactory.
  const NATIVE_MIN_X = -0.4000000296038956;
  const NATIVE_MAX_X = 0.40000002960389797;
  const NATIVE_MIN_Y = -0.8999999560415751; // base do rádio (em pé)
  const NATIVE_MAX_Y = 1.4585581691885396; // topo/antena (em pé)
  const NATIVE_MIN_Z = -0.2000000636781529;
  const NATIVE_MAX_Z = 0.20000004877699235; // frente/tela (lado +Z)

  // Bounding box já depois da rotação de -90° em X aplicada abaixo
  // (pose "deitado" — ver comentário no topo do arquivo sobre o
  // remapeamento de eixos: X fica igual, Y novo = Z nativo, Z novo =
  // -Y nativo) — é o espaço em que `model.scale`/`model.position` são
  // calculados logo abaixo, mesmo formato de ROTATED_MIN/MAX de
  // CardboardBoxFactory.
  const ROTATED_MIN_X = NATIVE_MIN_X;
  const ROTATED_MAX_X = NATIVE_MAX_X;
  const ROTATED_MIN_Y = NATIVE_MIN_Z;
  const ROTATED_MAX_Y = NATIVE_MAX_Z;
  const ROTATED_MIN_Z = -NATIVE_MAX_Y;
  const ROTATED_MAX_Z = -NATIVE_MIN_Y;

  // Altura "em pé" nativa (eixo Y, antes da rotação de -90° em X
  // aplicada abaixo) — é a partir dela que a escala final é
  // calculada, não da altura já deitada (ROTATED_MAX_Y-ROTATED_MIN_Y,
  // que aqui é só a espessura fina do corpo do rádio apoiado na
  // mesinha). Mesmo raciocínio de PhoneFactory (TARGET_HEIGHT/
  // MODEL_SCALE calculados sobre a dimensão mais reconhecível da
  // peça, não sobre uma medida secundária).
  const NATIVE_STANDING_HEIGHT = NATIVE_MAX_Y - NATIVE_MIN_Y;

  // Tamanho final realista de um rádio de mão (~24cm "em pé", dentro
  // da faixa 20-25cm de um walkie-talkie comum) — escala 0,1 aplicada
  // por igual nos três eixos, deixando o rádio deitado com ~23,6cm de
  // comprimento por ~8cm de largura por ~4cm de espessura, um
  // acessório pequeno o bastante para não competir em tamanho com a
  // TV (TVFactory.FINAL_WIDTH = 0,6m) ao lado da qual ele fica.
  const MODEL_SCALE = 0.1;

  // Dimensões finais (já na escala do jogo, já na orientação deitada)
  // — usadas por scenes/room-scene.js para posicionar o rádio ao lado
  // da TV sobre o tampo da mesinha, mesmo papel de
  // TableTVFactory.width/height/depth.
  const FINAL_WIDTH = (ROTATED_MAX_X - ROTATED_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = (ROTATED_MAX_Y - ROTATED_MIN_Y) * MODEL_SCALE;
  const FINAL_DEPTH = (ROTATED_MAX_Z - ROTATED_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peça para a mesma convenção de CardboardBoxFactory
  // (objeto solto sobre uma superfície, sem nenhuma face encostada em
  // parede): X e Z centralizados em 0 (centro da base) e Y com a base
  // em 0 (a superfície de apoio — aqui, o tampo da mesinha).
  const MODEL_POSITION_X = -((ROTATED_MIN_X + ROTATED_MAX_X) / 2) * MODEL_SCALE;
  const MODEL_POSITION_Y = -ROTATED_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z = -((ROTATED_MIN_Z + ROTATED_MAX_Z) / 2) * MODEL_SCALE;

  // Loader único e reaproveitado entre chamadas — mesma ideia de
  // CardboardBoxFactory/TrashCanFactory (hoje só existe um rádio no
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

  // Peça puramente decorativa (pedido explícito do usuário): sem
  // interação, sem outline, sem animação, sem som, sem evento — mesmo
  // tratamento de CardboardBoxFactory.createCardboardBox. Não recebe
  // `materials` pelo mesmo motivo: sem outline, não precisa do
  // material de contorno.
  function createRadio() {
    const group = new THREE.Group();

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        // 1) Deita o rádio: rotação de -90° em X (ver comentário no
        //    topo do arquivo) — o rádio, que nascia em pé com a tela
        //    voltada para a frente (+Z), passa a ficar apoiado de
        //    costas sobre o tampo, com a tela voltada para cima. Sem
        //    nenhuma inclinação ou rotação extra em outro eixo — só
        //    essa correção única, mesmo espírito "uma rotação de
        //    eixo só" de CardboardBoxFactory.
        model.rotation.x = -Math.PI / 2;

        // 2) Escala para o tamanho final no mundo do jogo (ver
        //    MODEL_SCALE acima).
        model.scale.setScalar(MODEL_SCALE);

        // 3) Recentraliza: X e Z no centro da base, Y com a base em 0
        //    (ver comentário de convenção de espaço local acima) —
        //    assim, quem posiciona este grupo (scenes/room-scene.js)
        //    só precisa somar a altura do tampo da mesinha, sem saber
        //    nada da geometria específica do modelo importado.
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("RadioFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createRadio: createRadio };
})();
