/**
 * models/tv-factory.js
 * -------------------------------------------------
 * TV de tubo (CRT) decorativa, apoiada em cima da mesinha de TV do
 * quarto ("MEU QUARTO" — ver models/tabletv-factory.js) — carregada a
 * partir de um modelo .glb pronto (assets/models/crt_tv_psx.glb), na
 * mesma linha do relógio de parede/telefone/mesinha (ver
 * models/clock-factory.js, models/phone-factory.js e
 * models/tabletv-factory.js): em vez de construir a peça por
 * geometria procedural, importamos um modelo já pronto e só ajustamos
 * escala/posição para ele se encaixar no cenário. Mesmo sistema de
 * importação (THREE.GLTFLoader) já usado por todos os móveis
 * importados do jogo — nenhum sistema novo criado para esta peça.
 *
 * Origem do asset: "PSX CRT TV", por Tomitos
 * (https://sketchfab.com/Tomitos_), licença CC-BY-4.0
 * (http://creativecommons.org/licenses/by/4.0/) — metadado gravado no
 * próprio arquivo .glb (asset.extras). O arquivo traz duas peças na
 * mesma hierarquia — o corpo da TV e um controle remoto apoiado ao
 * lado dela —, ambas carregadas juntas como um único objeto (não há
 * necessidade de separar as duas: nenhuma das duas se move nem é
 * interativa, ver comentário mais abaixo).
 *
 * Peça puramente decorativa — sem interação, sem outline, sem prompt
 * de "Interagir", sem diálogo, sem animação, sem som (pedido explícito
 * do usuário). Mesmo tratamento do relógio de parede/mesinha de TV:
 * quem posiciona (scenes/room-scene.js) só decide onde apoiar o grupo
 * inteiro — hoje, como filho do próprio grupo da mesinha de TV, igual
 * ao abajur em cima do criado-mudo (ver TableLampFactory) — sem
 * precisar saber nada sobre a geometria específica do modelo
 * importado.
 *
 * Convenção de espaço local (mesma ideia de PhoneFactory — peça de
 * "mesa", não de parede, então sem a convenção "Z = 0 é a parede"
 * usada por Clock/Picture/Door):
 *   - Y = 0 é a base da TV (a superfície em que ela está apoiada —
 *     aqui, o tampo da mesinha).
 *   - X = 0 e Z = 0 são o centro horizontal do CORPO da TV (não conta
 *     o controle remoto — ver NATIVE_CENTER_X/Z abaixo, mesmo motivo
 *     de NATIVE_CENTER_X/Z em phone-factory.js: o controle fica bem
 *     deslocado para a frente/lado do corpo, então incluí-lo na conta
 *     puxaria o "centro" para longe do centro visual real da TV).
 *   - A parte frontal (o visor/tela) já nasce olhando para +Z — mesma
 *     convenção de "frente" usada no resto do jogo (ver
 *     DoorFactory/PhoneFactory) —, então, ao contrário do relógio de
 *     parede (que precisou de uma rotação fixa de correção, ver
 *     comentário em clock-factory.js), nenhuma rotação é aplicada
 *     aqui: quem posiciona decide a rotação inteira do zero, de acordo
 *     com para onde a tela deve apontar.
 * -------------------------------------------------
 */

window.TVFactory = (function () {
  const MODEL_URL = "assets/models/crt_tv_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Assim como em PhoneFactory/ClockFactory, estes valores não são
  // metros — são as unidades nativas do arquivo, medidas diretamente
  // nos vértices do modelo (bounding box de `gltf.scene`, já com toda
  // a hierarquia de nós resolvida — mesma situação dos outros modelos
  // importados). Só o corpo da TV entra nesta conta (nó "TVCRT" da
  // hierarquia do arquivo) — o controle remoto (nó "TVRemote") fica de
  // fora de propósito, pelo mesmo motivo de NATIVE_CENTER_X/Z em
  // phone-factory.js (ver comentário de espaço local acima).
  //
  // Bounding box nativa do corpo da TV (eixo a eixo):
  //   X (largura):      -0.30000005 a  0.30000006
  //   Y (altura):        0.0        a  0.54000004  (já nasce apoiada em y = 0)
  //   Z (profundidade): -0.24000008 a  0.21000003  (frente/tela no lado +Z)
  const NATIVE_MIN_X = -0.30000005;
  const NATIVE_MAX_X = 0.30000006;
  const NATIVE_MIN_Y = -0.00000004; // ≈ 0 — já nasce apoiada no chão/tampo
  const NATIVE_MAX_Y = 0.54000004;
  const NATIVE_MIN_Z = -0.24000008;
  const NATIVE_MAX_Z = 0.21000003;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;

  // Sem reescala: assim como a mesinha de TV (MODEL_SCALE = 1 em
  // tabletv-factory.js), este modelo já chega em unidades muito
  // próximas do metro — 0.6m de largura por 0.54m de altura por 0.45m
  // de profundidade é uma proporção plausível para uma TV de tubo
  // (CRT) de porte médio —, então não precisou de nenhum fator de
  // ajuste do tipo TARGET_HEIGHT/MODEL_SCALE usado por
  // WardrobeFactory/BookshelfFactory.
  const MODEL_SCALE = 1;

  // Dimensões finais (já na escala do jogo) — mesmo papel de
  // NightstandFactory.width/height/depth: referência para quem
  // posiciona a peça (aqui, o espaço que ela ocupa em cima da
  // mesinha).
  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = (NATIVE_MAX_Y - NATIVE_MIN_Y) * MODEL_SCALE;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peça para a convenção descrita no comentário do
  // topo: X/Z centralizados no corpo da TV (0), Y com a base em 0.
  const MODEL_POSITION_X = -NATIVE_CENTER_X * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z = -NATIVE_CENTER_Z * MODEL_SCALE;

  // Loader único e reaproveitado entre chamadas — mesma ideia de
  // ClockFactory/TableTVFactory (hoje só existe uma TV no quarto, mas
  // não custa nada reaproveitar o mesmo loader se um dia houver mais
  // de uma).
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura usado em ClockFactory/TableTVFactory:
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
          mat.map.anisotropy = 1;
          mat.map.encoding = THREE.LinearEncoding;
          mat.map.needsUpdate = true;
        }
      });
      node.castShadow = true;
      node.receiveShadow = true;
    });
  }

  // Corrige o material do arquivo: ele foi exportado do Sketchfab
  // marcado como "Unlit" (extensão KHR_materials_unlit — metadado
  // gravado no próprio .glb, junto da licença citada no comentário do
  // topo). O GLTFLoader, ao ver essa extensão, cria automaticamente um
  // THREE.MeshBasicMaterial para o modelo — e MeshBasicMaterial ignora
  // completamente as luzes da cena, sempre renderizando a textura no
  // brilho máximo. Era por isso que a TV aparecia "brilhando" mesmo em
  // cômodos escuros, ao contrário de qualquer outro modelo importado
  // do jogo (nenhum outro .glb do projeto usa essa extensão — ver
  // phone/clock/table/nightstand/etc., que já chegam com um material
  // sensível à luz por padrão).
  //
  // A correção troca o material pelo mesmo tipo usado em todo o resto
  // do jogo (THREE.MeshStandardMaterial — ver materials/material-
  // library.js), reaproveitando a textura já normalizada acima, com
  // um acabamento fosco de plástico (roughness/metalness no mesmo
  // espírito de materials.phoneBody, o corpo plástico mais parecido
  // já existente no jogo). `side` é preservado porque o material
  // original vem marcado como doubleSided no arquivo.
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
          roughness: 0.7,
          metalness: 0.05,
        });
        mat.dispose();
        return replacement;
      });
      node.material = isArray ? fixed : fixed[0];
    });
  }

  // Ponto de referência na traseira da TV, onde o cabo de energia (ver
  // models/cable-factory.js e o bloco "Tomada + cabo de energia" em
  // scenes/room-scene.js) visualmente entra na TV — canto inferior da
  // face de trás (Z mínimo, já que a frente/tela é +Z, ver convenção
  // de espaço local no topo do arquivo), a uns 25% da altura total a
  // partir da base, mesma região onde fica a entrada de força numa TV
  // de tubo de verdade. Um THREE.Object3D vazio, adicionado desde já
  // (não depende do modelo terminar de carregar — mesmo princípio do
  // placeholder de contorno em phone-factory.js): quem monta a cena lê
  // a posição-mundo dele com `getWorldPosition` depois de posicionar/
  // rotacionar este grupo em cima da mesinha, sem precisar duplicar
  // nenhuma conta de transformação aqui.
  const POWER_ANCHOR_Y = FINAL_HEIGHT * 0.25;
  const POWER_ANCHOR_Z = -FINAL_DEPTH / 2;

  function createTV() {
    const group = new THREE.Group();

    const powerAnchor = new THREE.Object3D();
    powerAnchor.position.set(0, POWER_ANCHOR_Y, POWER_ANCHOR_Z);
    group.add(powerAnchor);

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);
        fixUnlitMaterial(model);

        // 1) Escala para o tamanho final no mundo do jogo (hoje 1:1,
        //    ver comentário de MODEL_SCALE acima).
        model.scale.setScalar(MODEL_SCALE);

        // 2) Recentraliza: X/Z no centro do corpo da TV, Y com a base
        //    em 0 — sem nenhuma rotação (o visor já nasce olhando para
        //    +Z, ver comentário de espaço local no topo do arquivo).
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("TVFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
      powerAnchor: powerAnchor,
    };
  }

  return { createTV: createTV };
})();
