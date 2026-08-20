/**
 * models/table-lamp-factory.js
 * -------------------------------------------------
 * Abajur (luminária de mesa) do quarto ("MEU QUARTO") — carregado a
 * partir de um modelo .glb pronto (assets/models/table_lamp_psx.glb),
 * exatamente o mesmo sistema já usado por PhoneFactory/ClockFactory/
 * NightstandFactory: em vez de construir a peça por geometria
 * procedural, importamos um modelo pronto e só ajustamos escala/
 * posição para ele se encaixar no cenário. Nenhum sistema novo de
 * importação foi criado — só mais uma "fábrica" seguindo a mesma
 * receita das outras (mesmo GLTFLoader único e reaproveitado, mesma
 * normalização de textura "nearest"/sem mipmap do visual PSX).
 *
 * Origem do asset: "ps1 style lamp", por vanillao03
 * (https://sketchfab.com/kevinandst), licença CC-BY-4.0
 * (http://creativecommons.org/licenses/by/4.0/) — mesmo autor e
 * mesmo tratamento PSX do criado-mudo (ver nightstand-factory.js). A
 * licença exige atribuição ao autor original caso o jogo seja
 * publicado.
 *
 * Diferente do criado-mudo (puramente decorativo), este abajur:
 *  - é a fonte de luz do quarto (uma THREE.PointLight própria, ver
 *    createTableLamp() abaixo) — igual em espírito à luminária de
 *    teto do corredor (ver lamp-factory.js), só que aqui não existe
 *    nenhum interruptor de parede separado: o próprio abajur É o
 *    objeto interativo que liga/desliga a luz (ver `toggle`/`isOn`
 *    no retorno de createTableLamp);
 *  - por isso entra em `interactables` (ver scenes/room-scene.js),
 *    não só em `solids` como o criado-mudo. Quem monta a cena usa
 *    `kind: "lightSwitch"` — mesmo "kind" do interruptor de parede
 *    do corredor (ver corridor-scene.js/switch-factory.js) — só para
 *    reaproveitar o mesmo despacho já existente em scripts/main.js
 *    (`currentTarget.toggleSwitch()`) sem precisar ensinar aquele
 *    arquivo a reconhecer um "kind" novo, e para continuar liberado
 *    por objectives/objective-config.js sem precisar mexer lá também
 *    (a etapa atual já libera esse "kind" — o interruptor "não
 *    depende da história", e o abajur segue exatamente a mesma
 *    regra). Não é um interruptor de parede de verdade — é só o
 *    mesmo rótulo interno reaproveitado pelo motivo acima.
 *
 * Convenção de espaço local — objeto apoiado sobre uma superfície
 * (mesma ideia de VaseFactory/PhoneFactory sobre o tampo da
 * escrivaninha, ver desk-factory.js):
 *   - X = 0 e Z = 0 são o centro horizontal da base do abajur;
 *   - Y = 0 é a base (onde encosta no móvel) — quem posiciona
 *     (scenes/room-scene.js) só precisa somar a altura do
 *     criado-mudo (NightstandFactory.createNightstand().height).
 * -------------------------------------------------
 */

window.TableLampFactory = (function () {
  const MODEL_URL = "assets/models/table_lamp_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Assim como em NightstandFactory/ClockFactory/PhoneFactory, estes
  // valores não são metros — são as unidades nativas do arquivo,
  // medidas diretamente nos vértices do modelo (bounding box de
  // `gltf.scene`, já com toda a hierarquia de nós resolvida — corpo
  // do abajur + cúpula de papel juntos, considerando a correção de
  // eixo que o próprio arquivo já traz "assada" nos nós, mesma
  // situação dos outros modelos importados).
  const NATIVE_MIN_X = 0.77604332;
  const NATIVE_MAX_X = 1.14147952;
  const NATIVE_MIN_Y = 0.61791597; // base do abajur
  const NATIVE_MAX_Y = 1.23295293; // topo da cúpula
  const NATIVE_MIN_Z = -0.30154705;
  const NATIVE_MAX_Z = 0.06388922;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;
  const NATIVE_HEIGHT = NATIVE_MAX_Y - NATIVE_MIN_Y;

  // Altura final do abajur em cima do criado-mudo — proporção comum
  // de luminária de mesa/cabeceira, bem menor que o próprio
  // criado-mudo (NightstandFactory FINAL_HEIGHT ~0.667) para não
  // competir em tamanho com o móvel que o sustenta.
  const TARGET_HEIGHT = 0.34;
  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = TARGET_HEIGHT;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peça para a convenção descrita no comentário do
  // topo: X/Z centralizados em 0, Y com a base em 0 (superfície de
  // apoio).
  const MODEL_POSITION_X = -NATIVE_CENTER_X * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z = -NATIVE_CENTER_Z * MODEL_SCALE;

  // Altura (fração de FINAL_HEIGHT, já na base recentralizada acima)
  // onde fica a cúpula de papel que envolve a lâmpada — medida a
  // partir da malha "Lamp Paper" do próprio arquivo. É onde a
  // PointLight de verdade é posicionada, para a luz parecer vir de
  // dentro da cúpula, não flutuando ao lado do modelo.
  const BULB_HEIGHT_FRACTION = 0.64;

  // Cor quente do bulbo/cúpula acesos — mesma reaproveitada tanto na
  // PointLight quanto no brilho emissivo do material (ver mais
  // abaixo), para luz e "objeto que parece emitir a luz" baterem.
  const GLOW_COLOR = 0xffb37a;

  // Luz da PointLight quando ligada. Intensidade/alcance calculados
  // para cobrir a maior parte do quarto (RoomConfig.size = 6, um
  // quadrado de 6x6) a partir da posição do abajur — encostado numa
  // ponta dele, sobre o criado-mudo — sem ficar artificialmente
  // forte perto da própria luminária nem virar a única coisa visível
  // da cena (a Ambient Light global, ver scripts/main.js, continua
  // a mesma luz de preenchimento fraca de sempre). Mesmo decay (2) e
  // ordem de grandeza da luminária de teto do corredor (ver
  // lamp-factory.js), só um pouco mais forte e com mais alcance por
  // ser, aqui, a fonte principal do ambiente (e não um acessório
  // atmosférico).
  const BASE_INTENSITY = 1.6;
  const LIGHT_DISTANCE = 9.5;
  const LIGHT_DECAY = 2;

  // Loader único e reaproveitado entre chamadas (mesmo padrão de
  // NightstandFactory/ClockFactory/PhoneFactory).
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura usado no resto dos modelos importados:
  // filtro "nearest" e sem mipmap para o pixel "cru" característico
  // do visual PSX, e encoding linear para ficar consistente com o
  // resto do jogo (que não usa sRGBEncoding em nenhuma outra
  // textura).
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
  // Mesma técnica de PhoneFactory: o carregamento do .glb é
  // assíncrono, mas createTableLamp precisa devolver `outline` já
  // pronto (a referência é guardada de imediato em
  // scenes/room-scene.js) — um Mesh "vazio" válido (posição + normal
  // com zero vértices) evita erro até o modelo terminar de carregar.
  function createEmptyGeometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(0), 3));
    return geometry;
  }

  function createTableLamp(materials) {
    const group = new THREE.Group();

    // Placeholder do contorno — já entra como filho de `group` desde
    // já: assim, `outline.getWorldPosition(...)` (lido a cada quadro
    // pelo InteractionSystem) já devolve a posição certa do abajur
    // desde o primeiro quadro, mesmo antes do modelo carregar — só o
    // raycast (que exige geometria de verdade) fica sem efeito até lá.
    const outline = new THREE.Mesh(createEmptyGeometry(), materials.outline);
    outline.visible = false;
    group.add(outline);

    // ---------- Estado ligado/desligado ----------
    // Começa ligado (pedido do usuário: a luz do abajur já está
    // acesa assim que o jogador entra no quarto — este objeto é
    // criado bem antes disso, no carregamento do jogo, então o
    // estado inicial já vale desde o primeiro quadro em que o quarto
    // aparece).
    let powered = true;

    // Luz de verdade emitida pelo abajur — única fonte de luz do
    // quarto.
    const light = new THREE.PointLight(GLOW_COLOR, BASE_INTENSITY, LIGHT_DISTANCE, LIGHT_DECAY);
    group.add(light);

    // Materiais do modelo (corpo + cúpula de papel — aqui
    // compartilham o mesmo material único do .glb) que recebem um
    // leve brilho emissivo quando ligados, para o abajur parecer
    // realmente aceso, não só a PointLight "flutuando" do lado dele.
    // Preenchido de verdade só depois que o modelo carrega (ver
    // onLoad abaixo); guardado aqui para toggle() poder alternar o
    // brilho a qualquer momento, mesmo antes do carregamento
    // terminar (nesse caso o forEach abaixo simplesmente não teria
    // nada para alternar ainda — sem erro, só sem efeito visual até
    // o modelo chegar).
    const lampMaterials = [];
    const glowColor = new THREE.Color(GLOW_COLOR);
    const blackColor = new THREE.Color(0x000000);

    function applyGlow(on) {
      lampMaterials.forEach(function (mat) {
        if (!mat.emissive) {
          return;
        }
        mat.emissive.copy(on ? glowColor : blackColor);
        if (mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = on ? 0.8 : 0;
        }
      });
    }

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        model.scale.setScalar(MODEL_SCALE);
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);
        group.add(model);

        // Posiciona a luz de verdade dentro da cúpula, na altura
        // onde fica a lâmpada (ver BULB_HEIGHT_FRACTION acima) —
        // mesmo centro X/Z do modelo já recentralizado.
        light.position.set(0, FINAL_HEIGHT * BULB_HEIGHT_FRACTION, 0);

        // Reúne os materiais únicos do modelo (corpo + cúpula), para
        // toggle() poder alternar o brilho emissivo deles, e já
        // aplica o estado atual (relevante se o jogador de algum
        // jeito interagisse antes do modelo terminar de carregar).
        const seen = [];
        model.traverse(function (node) {
          if (!node.isMesh || !node.material) {
            return;
          }
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach(function (mat) {
            if (seen.indexOf(mat) === -1) {
              seen.push(mat);
              lampMaterials.push(mat);
            }
          });
        });
        applyGlow(powered);

        // Agora que a peça de verdade está no grupo, reconstrói a
        // casca de contorno a partir da silhueta real dela — e só
        // troca a geometria do mesh placeholder no lugar (mesma
        // referência de objeto devolvida por createTableLamp).
        const built = window.OutlineFactory.build(group, materials.outline);
        outline.geometry.dispose();
        outline.geometry = built.geometry;
      },
      undefined,
      function onError(error) {
        console.error("TableLampFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    // ---------- Interação: liga/desliga ----------
    // Simples alternância — sem diálogo, sem outra ação (ver
    // comentário no topo do arquivo sobre reaproveitar
    // kind: "lightSwitch" em scenes/room-scene.js). Cada toque no
    // abajur inverte o estado atual: ligado -> desligado -> ligado…
    function toggle() {
      powered = !powered;
      light.intensity = powered ? BASE_INTENSITY : 0;
      applyGlow(powered);
    }

    function isOn() {
      return powered;
    }

    return {
      group: group,
      outline: outline,
      toggle: toggle,
      isOn: isOn,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createTableLamp: createTableLamp };
})();
