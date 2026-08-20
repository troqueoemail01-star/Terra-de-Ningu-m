/**
 * models/clock-factory.js
 * -------------------------------------------------
 * Relógio de parede decorativo do corredor — carregado a partir de
 * um modelo .glb pronto (assets/models/clockwall_psx.glb), na mesma
 * linha do telefone da escrivaninha (ver models/phone-factory.js):
 * em vez de construir a peça por geometria procedural, importamos um
 * modelo já pronto e só ajustamos escala/posição/rotação para ele se
 * encaixar no cenário.
 *
 * Origem do asset: "PSX Low-Poly Victorian Clock", por PSX Game
 * Assets (https://sketchfab.com/PSXGameAssets), licença CC-BY-4.0
 * (http://creativecommons.org/licenses/by/4.0/) — metadado que já
 * vem gravado no próprio arquivo .glb (asset.extras). A licença
 * exige atribuição ao autor original caso o jogo seja publicado.
 *
 * Peça puramente decorativa — sem interação, sem outline, sem
 * animação, sem som — mesmo tratamento dado aos quadros e aos vasos
 * de planta do corredor (ver PictureFactory/PottedPlantFactory):
 * quem posiciona (scenes/corridor-scene.js) só define parede e ponto
 * ao longo do corredor, igual à convenção já usada por quadros,
 * interruptor e vasos.
 *
 * Convenção de espaço local (mesma ideia de DoorFactory/PictureFactory):
 *   - Z = 0 é a parede: o relógio começa exatamente nesse plano e
 *     "cresce" para +Z (para dentro do corredor) — nunca para trás,
 *     então não há risco de atravessar a parede.
 *   - Y = 0 é o centro vertical do relógio (mesma convenção de
 *     PICTURE_CENTER_Y em corridor-scene.js: a altura mundial que o
 *     código de cena atribui via position.y cai bem no meio da peça,
 *     não na base nem no topo).
 *   - X = 0 é o centro horizontal do relógio (moldura simétrica em
 *     torno do eixo, igual a portas/quadros).
 * Isso deixa corridor-scene.js livre para só decidir *onde* pendurar
 * o relógio (parede + altura), sem precisar saber nada sobre a
 * geometria específica do modelo importado.
 *
 * Ajuste de orientação: o modelo .glb, do jeito que veio, tem o
 * mostrador (o lado com os ponteiros/números — visível checando a
 * textura e as normais das faces voltadas para -X no espaço nativo
 * do arquivo) olhando para -X, não para +Z como o resto do jogo
 * espera. Por isso, diferente do telefone (que já chegou pronto,
 * sem precisar de nenhuma rotação — ver comentário em
 * models/phone-factory.js), aqui aplicamos uma rotação fixa de 90°
 * em Y só para "destravar" o mostrador na direção +Z antes de
 * qualquer escala/posicionamento — depois disso, o resto do arquivo
 * trata o modelo exatamente como qualquer outra peça já "alinhada"
 * do jogo.
 * -------------------------------------------------
 */

window.ClockFactory = (function () {
  const MODEL_URL = "assets/models/clockwall_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Assim como em PhoneFactory, estes valores não são metros — são as
  // unidades nativas do arquivo, medidas diretamente nos vértices do
  // modelo (bounding box), já considerando a correção de eixo que o
  // próprio arquivo traz "assada" na hierarquia de nós (Y-up a partir
  // de uma origem Z-up, aplicada automaticamente pelo GLTFLoader ao
  // montar `gltf.scene`) — ou seja, são as mesmas coordenadas em que
  // `gltf.scene` chega pronta, antes de qualquer ajuste nosso.
  //
  // Bounding box nativa de `gltf.scene` (eixo a eixo):
  //   X (largura):     -0.3375   a  0.3375
  //   Y (altura):       -0.65938 a  0.98438
  //   Z (profundidade): -0.51563 a  0.52813
  //
  // A rotação fixa de 90° em Y (ver comentário no topo do arquivo)
  // troca os eixos assim: novo X = Z antigo, Y fica igual, novo Z =
  // -X antigo. Os valores abaixo já são a bounding box *depois*
  // dessa rotação — é o espaço em que `model.scale`/`model.position`
  // são calculados logo abaixo.
  const ROTATED_MIN_X = -0.515625; // = min Z nativo
  const ROTATED_MAX_X = 0.528125; // = max Z nativo
  const ROTATED_MIN_Y = -0.659375; // altura não muda com a rotação em Y
  const ROTATED_MAX_Y = 0.984375;
  const ROTATED_MIN_Z = -0.3375; // = -(max X nativo)
  const ROTATED_MAX_Z = 0.3375; // = -(min X nativo)

  const NATIVE_HEIGHT = ROTATED_MAX_Y - ROTATED_MIN_Y;

  // Altura final do relógio já no mundo do jogo: um pouco menor que
  // os quadros decorativos (`size: 0.85` em corridor-config.js), para
  // não competir com eles em destaque visual, mas ainda grande o
  // bastante para ser notado e preencher o trecho vazio de parede.
  const TARGET_HEIGHT = 0.6;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // Recentraliza a peça (depois de rotacionada e escalada) para a
  // convenção descrita no comentário do topo: X/Y centralizados em 0,
  // Z começando em 0 (parede) e crescendo para dentro do corredor.
  const MODEL_POSITION_X = -((ROTATED_MIN_X + ROTATED_MAX_X) / 2) * MODEL_SCALE;
  const MODEL_POSITION_Y = -((ROTATED_MIN_Y + ROTATED_MAX_Y) / 2) * MODEL_SCALE;
  const MODEL_POSITION_Z = -ROTATED_MIN_Z * MODEL_SCALE;

  // Só para referência (não usado no posicionamento em si): footprint
  // aproximado já na escala final, caso algum dia seja preciso (por
  // ex. se o relógio precisar entrar numa checagem de colisão).
  const FINAL_WIDTH = (ROTATED_MAX_X - ROTATED_MIN_X) * MODEL_SCALE;
  const FINAL_DEPTH = (ROTATED_MAX_Z - ROTATED_MIN_Z) * MODEL_SCALE;

  // Loader único e reaproveitado entre chamadas — mesma ideia de
  // PhoneFactory (hoje só existe um relógio no corredor, mas não
  // custa nada reaproveitar o mesmo loader se um dia houver mais de
  // um).
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura usado em PhoneFactory (ver comentário lá):
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

  function createClock() {
    const group = new THREE.Group();

    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        // 1) Corrige a orientação: o mostrador nasce olhando para -X
        //    no arquivo original; esta rotação o deixa olhando para
        //    +Z, a convenção de "frente" usada em todo o resto do
        //    jogo (ver DoorFactory/PictureFactory).
        model.rotation.y = Math.PI / 2;

        // 2) Escala para o tamanho final no mundo do jogo.
        model.scale.setScalar(MODEL_SCALE);

        // 3) Recentraliza: X/Y no centro da peça, Z apoiado na parede
        //    (0) e crescendo para dentro do corredor.
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("ClockFactory: falha ao carregar " + MODEL_URL, error);
      }
    );

    return {
      group: group,
      width: FINAL_WIDTH,
      depth: FINAL_DEPTH,
    };
  }

  return { createClock: createClock };
})();
