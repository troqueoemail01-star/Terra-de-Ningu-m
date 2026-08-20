/**
 * models/nightstand-factory.js
 * -------------------------------------------------
 * Criado-mudo (mesa de cabeceira) do quarto ("MEU QUARTO") — carregado
 * a partir de um modelo .glb pronto (assets/models/nightstand_psx.glb),
 * na mesma linha do telefone/relógio/cama (ver models/phone-factory.js,
 * models/clock-factory.js e models/bed-factory.js): em vez de construir
 * a peça por geometria procedural, importamos um modelo já pronto e só
 * ajustamos escala/posição para ele se encaixar no cenário.
 *
 * NOTA IMPORTANTE sobre o nome do arquivo enviado: o usuário se referiu
 * a este modelo como "cabeceira", mas o próprio .glb (metadado
 * asset.extras, gravado pelo Sketchfab) identifica a peça como "ps1
 * style nightstand", com os nós da hierarquia chamados "Nightstand" /
 * "Nightstand drawer" / "Nightstand drawer handle" — ou seja, é um
 * criado-mudo (mesa de cabeceira com gaveta), não um painel de
 * cabeceira que se prende na cama. Isso bate exatamente com o pedido
 * original ("adicione a cabeceira AO LADO da cama"), então a peça foi
 * tratada e posicionada como criado-mudo (ver scenes/room-scene.js) —
 * um painel de cabeceira, por definição, ficaria atrás/anexado à cama,
 * não ao lado dela.
 *
 * Origem do asset: "ps1 style nightstand", por vanillao03
 * (https://sketchfab.com/kevinandst), licença CC-BY-4.0
 * (http://creativecommons.org/licenses/by/4.0/) — metadado que já vem
 * gravado no próprio arquivo .glb (asset.extras), junto com a nota de
 * que a textura já foi reprocessada em estilo PSX (baseColor
 * reamostrada para 48x48 + dithering de paleta), mesmo tratamento dos
 * outros modelos importados do jogo. A licença exige atribuição ao
 * autor original caso o jogo seja publicado.
 *
 * Peça puramente decorativa — sem interação, sem outline, sem
 * animação, sem som — mesmo tratamento dado ao relógio de parede e aos
 * vasos de planta do corredor (ver ClockFactory/PottedPlantFactory):
 * quem posiciona (scenes/room-scene.js) só decide onde encostar o
 * móvel, sem nenhuma entrada em `interactables`. Ainda assim entra na
 * lista de `solids` da cena — igual aos vasos de planta — só para o
 * jogador não atravessar o móvel andando; isso é colisão física, não
 * "interação" no sentido do InteractionSystem (sem contorno de
 * destaque, sem prompt de "Interagir", sem diálogo).
 *
 * Convenção de espaço local — mistura as duas convenções já usadas no
 * resto do jogo, pela natureza do móvel (encostado numa parede E de pé
 * no chão):
 *   - Z = 0 é a parede: o criado-mudo começa exatamente nesse plano
 *     (a face de trás, sem gaveta) e "cresce" para +Z (para dentro do
 *     quarto, onde fica a frente com a gaveta e o puxador) — mesma
 *     convenção de DoorFactory/ClockFactory/PictureFactory.
 *   - Y = 0 é o chão (base do móvel) — mesma convenção de
 *     BedFactory/PottedPlantFactory (objeto apoiado no chão, não
 *     pendurado/centralizado verticalmente como o relógio).
 *   - X = 0 é o centro horizontal do móvel.
 * Isso deixa scenes/room-scene.js livre para só decidir *onde* encostar
 * o criado-mudo (parede + posição ao longo dela), sem precisar saber
 * nada sobre a geometria específica do modelo importado.
 * -------------------------------------------------
 */

window.NightstandFactory = (function () {
  const MODEL_URL = "assets/models/nightstand_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Assim como em ClockFactory/PhoneFactory, estes valores não são
  // metros — são as unidades nativas do arquivo, medidas diretamente
  // nos vértices do modelo (bounding box de `gltf.scene`, já com toda
  // a hierarquia de nós resolvida — corpo do móvel + gaveta + puxador
  // juntos), considerando a correção de eixo que o próprio arquivo já
  // traz "assada" nos nós (aplicada automaticamente pelo GLTFLoader ao
  // montar `gltf.scene`, mesma situação dos outros modelos importados).
  //
  // A base do móvel já nasce essencialmente encostada em y = 0 (min Y
  // = 0.00316, praticamente zero) — mesma sorte de BedFactory, não
  // precisou de nenhum ajuste de "chão" fora do comum. A gaveta (mais
  // a frente, +Z) e o puxador confirmam que a frente do móvel (o lado
  // com o puxador, por onde alguém abriria a gaveta) já nasce olhando
  // para +Z — mesma convenção de "frente" usada em todo o resto do
  // jogo (ver DoorFactory/PottedPlantFactory) — então, como o telefone
  // (ver comentário em phone-factory.js), não foi preciso nenhuma
  // rotação de correção, só reescala e recentralização.
  const NATIVE_MIN_X = 0.73567073;
  const NATIVE_MAX_X = 1.32208656;
  const NATIVE_MIN_Y = 0.00315875;
  const NATIVE_MAX_Y = 0.66725928;
  const NATIVE_MIN_Z = -0.39348191;
  const NATIVE_MAX_Z = 0.11065642;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;

  // Sem reescala: o modelo já chega em unidades muito próximas do
  // metro (altura ~0.66 — proporção plausível de criado-mudo, um
  // pouco mais baixo que a mesa do corredor, DESK_HEIGHT = 0.8, o que
  // faz sentido: criado-mudo fica mais baixo que escrivaninha) e essas
  // medidas já batem com a escala do resto do jogo (cama também com
  // MODEL_SCALE = 1 — ver bed-factory.js), então não precisou de
  // nenhum fator de ajuste como TARGET_HEIGHT/MODEL_SCALE de
  // ClockFactory.
  const MODEL_SCALE = 1;

  // Dimensões finais (já na escala do jogo) — usadas por
  // scenes/room-scene.js para encostar o móvel na parede certa, ao
  // lado da cama, e para o sólido de colisão, do mesmo jeito que
  // DeskFactory.DESK_WIDTH/DESK_DEPTH ou BedFactory.BED_LENGTH/WIDTH.
  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = (NATIVE_MAX_Y - NATIVE_MIN_Y) * MODEL_SCALE;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peça para a convenção descrita no comentário do
  // topo: X centralizado em 0, Y com a base em 0 (chão), Z começando
  // em 0 (parede, face de trás) e crescendo para dentro do quarto.
  const MODEL_POSITION_X = -NATIVE_CENTER_X * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z = -NATIVE_MIN_Z * MODEL_SCALE;

  // Loader único e reaproveitado entre chamadas — mesma ideia de
  // ClockFactory/PhoneFactory (hoje só existe um criado-mudo no
  // quarto, mas não custa nada reaproveitar o mesmo loader se um dia
  // houver mais de um).
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura usado em ClockFactory/PhoneFactory/
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
          mat.map.encoding = THREE.LinearEncoding;
          mat.map.needsUpdate = true;
        }
      });
    });
  }

  function createNightstand() {
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
        //    quarto (frente com a gaveta/puxador).
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("NightstandFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createNightstand: createNightstand };
})();
