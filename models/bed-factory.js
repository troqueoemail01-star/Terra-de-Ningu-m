/**
 * models/bed-factory.js
 * -------------------------------------------------
 * Cama do quarto ("MEU QUARTO") — carregada a partir de um modelo
 * .glb pronto (assets/models/bed_psx.glb), na mesma linha do telefone
 * e do relógio de parede (ver models/phone-factory.js e
 * models/clock-factory.js): em vez de construir a peça por geometria
 * procedural, importamos um modelo já pronto e só ajustamos
 * escala/posição para ele se encaixar no cenário.
 *
 * Origem do asset: "Retro Lowpoly Bed", por lonesomeducky
 * (https://sketchfab.com/lonesomeducky), licença SKETCHFAB Standard —
 * metadado gravado no próprio arquivo .glb (asset.extras). A textura
 * já vem reprocessada em estilo PSX (mesmo arquivo bed_psx.glb citado
 * pelo usuário) e embutida no próprio .glb (não precisa de nenhum
 * arquivo de imagem separado).
 *
 * Interativa: enquanto o abajur do quarto estiver aceso, ao interagir
 * mostra só a fala "Kael: (preciso apagar a luz)." — sem deitar, sem
 * animação, sem trocar de câmera. Com o abajur apagado, interagir de
 * novo dispara a sequência de dormir inteira (câmera deitando, fade
 * para preto, passagem para o dia seguinte, câmera levantando — ver
 * cutscenes/sleep-sequence.js). Nenhuma das duas decisões é tomada
 * aqui: `scripts/main.js` trata o "kind": "bed" como um caso especial
 * (fora do sistema de objetivos, ver comentário em
 * scenes/room-scene.js) e decide qual das duas rodar, perguntando
 * `isLampOn()` ao próprio interativo da cama.
 *
 * Convenção de espaço local — diferente da convenção "Z = 0 na
 * parede" usada por peças decorativas pequenas (DoorFactory/
 * ClockFactory/PictureFactory): aqui o grupo devolvido por
 * `createBed` já nasce com origem (0,0,0) exatamente no CENTRO
 * horizontal da cama (X e Z), com Y = 0 no chão (base das pernas/
 * pés do móvel) — de propósito, para a "outline" (usada tanto para o
 * contorno de destaque quanto para o cálculo de distância do
 * InteractionSystem, ver interaction-system.js) ficar centralizada no
 * meio do móvel, não numa ponta dele. Como a cama é bem maior que
 * qualquer outro interativo do jogo (~2,24 x ~1,56), medir a
 * distância a partir de uma ponta (ex.: a cabeceira) deixaria a outra
 * ponta (os pés da cama) fora do alcance de interação
 * (config.interactionRange, ver corridor-config.js) — centralizar aqui
 * evita esse problema sem precisar mexer no InteractionSystem
 * genérico. scenes/room-scene.js, portanto, posiciona a cama pelo seu
 * próprio centro (não por uma quina encostada na parede).
 * -------------------------------------------------
 */

window.BedFactory = (function () {
  const MODEL_URL = "assets/models/bed_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Bounding box de `gltf.scene` (eixo a eixo), medida diretamente nos
  // vértices do modelo — já considerando a correção de eixo que o
  // arquivo traz "assada" na hierarquia de nós (o GLTFLoader aplica
  // isso sozinho ao montar `gltf.scene`, mesma situação de
  // PhoneFactory/ClockFactory). Eixo X = comprimento da cama (cabeça
  // -> pés), Z = largura, Y = altura — o modelo já chega com a
  // cabeceira (mais alta) do lado -X e os pés (mais baixos) do lado
  // +X, sem precisar de nenhuma rotação de correção.
  const NATIVE_MIN_X = -1.09979; // cabeceira
  const NATIVE_MAX_X = 1.13996; // pés da cama
  const NATIVE_MIN_Y = -0.30846; // base das pernas (chão)
  const NATIVE_MAX_Y = 0.68985; // topo dos montantes da cabeceira
  const NATIVE_MIN_Z = -0.76458;
  const NATIVE_MAX_Z = 0.80011;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;

  // Sem reescala: o modelo já chega em unidades muito próximas do
  // metro (comprimento ~2,24, largura ~1,56 — medidas plausíveis de
  // uma cama de casal) e essas medidas já batem com a escala do resto
  // do jogo (porta = 2.3 de altura, pé-direito = 4.2, olhos do
  // jogador a 1.6 do chão — ver corridor-config.js/room-config.js),
  // então não precisou de nenhum fator de ajuste como
  // TARGET_HEIGHT/MODEL_SCALE de PhoneFactory/ClockFactory.
  const MODEL_SCALE = 1;

  // Dimensões finais (já na escala do jogo — hoje idênticas às nativas
  // acima, já que MODEL_SCALE = 1) — usadas por scenes/room-scene.js
  // para encostar a cama na parede certa e para o sólido de colisão,
  // do mesmo jeito que DeskFactory.DESK_WIDTH/DESK_DEPTH.
  const BED_LENGTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE; // cabeça -> pés
  const BED_WIDTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;
  const BED_HEIGHT = (NATIVE_MAX_Y - NATIVE_MIN_Y) * MODEL_SCALE;

  // ---------- Contorno de destaque (placeholder até o modelo carregar) ----------
  // Mesmo princípio de PhoneFactory: `createBed` precisa devolver
  // `outline` já pronto (a referência é guardada de imediato em
  // scenes/room-scene.js) mesmo antes do .glb terminar de carregar —
  // por isso um Mesh "vazio" (posição + normal com zero vértices) no
  // lugar, trocado pela silhueta real assim que o modelo chega.
  function createEmptyGeometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(0), 3));
    return geometry;
  }

  // Loader único e reaproveitado entre chamadas (hoje só existe uma
  // cama no quarto, mesma ideia de PhoneFactory/ClockFactory).
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura de PhoneFactory/ClockFactory: filtro
  // "nearest" e sem mipmap para o pixel "cru" do visual PSX, e
  // encoding linear para ficar consistente com o resto do jogo.
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

  function createBed(materials) {
    const group = new THREE.Group();

    // Placeholder do contorno — ver comentário de createEmptyGeometry
    // acima. Já entra como filho de `group` desde já, na origem
    // (0,0,0) = centro horizontal da cama (ver comentário de espaço
    // local no topo do arquivo): assim, `outline.getWorldPosition(...)`
    // (lido a cada quadro pelo InteractionSystem) já devolve a
    // posição certa desde o primeiro quadro, mesmo antes do modelo
    // terminar de carregar — só o raycast (que exige geometria de
    // verdade) fica sem efeito até lá.
    const outline = new THREE.Mesh(createEmptyGeometry(), materials.outline);
    outline.visible = false;
    group.add(outline);

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        model.scale.setScalar(MODEL_SCALE);
        // Recentraliza X/Z (o modelo nativo já nasce quase centrado,
        // ver NATIVE_CENTER_X/Z) e sobe o modelo em Y para a base das
        // pernas encostar exatamente em y = 0 local — mesma ideia de
        // PhoneFactory (-NATIVE_MIN_Y), só que aqui o resultado é o
        // chão em vez do tampo de uma escrivaninha.
        model.position.set(
          -NATIVE_CENTER_X * MODEL_SCALE,
          -NATIVE_MIN_Y * MODEL_SCALE,
          -NATIVE_CENTER_Z * MODEL_SCALE
        );
        group.add(model);

        // Agora que a peça de verdade está no grupo, reconstrói a
        // casca de contorno a partir da silhueta real dela — e só
        // troca a geometria do mesh placeholder no lugar (mesma
        // referência de objeto devolvida por `createBed`).
        const built = window.OutlineFactory.build(group, materials.outline);
        outline.geometry.dispose();
        outline.geometry = built.geometry;
      },
      undefined,
      function onError(error) {
        console.error("BedFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    // ---------- Interação ----------
    // A cama não faz nada por conta própria: tanto a fala de "preciso
    // apagar a luz" quanto a sequência de dormir são disparadas por
    // scripts/main.js (ver comentário no topo deste arquivo), não por
    // esta função. Fica aqui vazia — mesmo espírito do `interact`
    // ainda vazio de PhoneFactory.
    function interact() {
      // Intencionalmente vazio.
    }

    return {
      group: group,
      outline: outline,
      interact: interact,
    };
  }

  return {
    createBed: createBed,
    BED_LENGTH: BED_LENGTH,
    BED_WIDTH: BED_WIDTH,
    BED_HEIGHT: BED_HEIGHT,
  };
})();
