/**
 * models/branches-factory.js
 * -------------------------------------------------
 * OS GRAVETOS DO QUINTAL LATERAL
 *
 * Segunda das tres pecas do pacote de madeira (psx-wood-pack): os galhos
 * e gravetos espalhados. Ver models/woodpile-factory.js para a
 * documentacao completa do pacote e do caminho de import.
 *
 * E a peca mais BAIXA do quintal (22 cm), por isso os dados dela pedem
 * solid: false - a colisao do jogo e um AABB sem eixo Y, e um solido num
 * monte de gravetos viraria uma parede invisivel na altura do peito no meio
 * da passagem. Mesmo motivo do varal da varanda.
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem evento (pedido explicito: "Sao apenas itens decorativos,
 * sem interacoes, (Por enquanto)"). Quem posiciona e o bloco "Pecas
 * decorativas da parede lateral direita" de scenes/corridor-scene.js,
 * lendo a lista sideYard.props de scenes/corridor-config.js: a peca nao
 * tem NENHUMA entrada em interactables. Ainda assim entra em solids, so
 * para o jogador nao atravessar ela andando quando um dia sair de casa -
 * isso e colisao FISICA, nao "interacao" no sentido do InteractionSystem.
 *
 * ---------- Mesmo sistema de import de sempre ----------
 * Carregada de um .glb em assets/models pelo MESMO THREE.GLTFLoader que
 * carrega todos os outros modelos do jogo (ver models/stove-factory.js,
 * models/microwave-factory.js e models/porch-plant-factory.js), com o
 * MESMO normalizeTextures (nearest, sem mipmap, encoding linear) e a
 * MESMA ideia de medir a bounding box nativa UMA vez, escrever as medidas
 * aqui e deixar a cena decidir so ONDE a peca fica. Nenhum carregador
 * novo, nenhum shader novo, nenhum segundo three.js - foi exatamente o
 * pedido: "ja tem outros itens que foram implementados dessa forma,
 * portanto use o mesmo sistema, nao precisa criar algo novo".
 *
 * A geometria deste arquivo chega CRUA (sem Draco), entao ela nem passa
 * pelo DRACOLoader - nada precisou mudar no bloco do motor 3D de
 * index.html por causa desta peca. A textura PSX ja vem EMBUTIDA no
 * proprio .glb (com sampler NEAREST e wrap REPEAT), entao tambem nao tem
 * TextureLoader avulso aqui: um arquivo so, um caminho de codigo so.
 *
 * ---------- O motor PSX do pacote NAO entrou ----------
 * O pacote veio com preview proprio e um runtime PSX em modulo ES
 * (ShaderMaterial com snap de vertice, warp afim de textura, dither de
 * 15 bits e render em 240p). NADA disso entrou aqui, pelos MESMOS motivos
 * ja escritos em models/porch-plant-factory.js: o jogo roda em three.js
 * r128 com scripts globais, entao usar aquele runtime significaria
 * carregar um SEGUNDO three.js na pagina (o "sistema novo" que o pedido
 * descarta), e o shader dele tem luz PROPRIA fixa - a peca ignoraria as
 * luzes da cena. O look PSX daqui ja vem da renderizacao do jogo
 * (resolucao interna baixa, filtro nearest, sem mipmap) e da propria
 * textura reprocessada que veio no arquivo.
 *
 * ---------- Convencao de espaco local ----------
 *   - X = 0 e Z = 0 sao o CENTRO da base;
 *   - Y = 0 e o chao (base da peca);
 *   - a frente olha para +Z, mesma convencao do resto do jogo.
 * O arquivo ja chega exatamente assim. Origem no centro da base porque o
 * usuario avisou que pode querer mudar a posicao pelo Editor depois:
 * assim o gizmo gira a peca NO LUGAR, em vez de varrer ela para longe.
 *
 * ---------- Noite e dia ----------
 * A peca vive do lado de FORA, e do lado de fora ninguem sobrevive so com
 * o material do arquivo: de manha o terreno, a grama, a fachada e o
 * telhado trocam para material CHAPADO (MeshBasicMaterial, ver
 * materials/material-library.js), porque nao existe sol de verdade na
 * cena - um modelo iluminado no meio de um cenario chapado apareceria
 * PRETO. Entao ela cumpre o MESMO contrato de tudo que vive la fora
 * (setDaytime/setMorning, ver models/porch-plant-factory.js e
 * models/tree-forest-factory.js): mesma geometria e mesma textura nos
 * dois periodos, trocando so o material - MeshStandardMaterial de noite e
 * MeshBasicMaterial de dia, no mesmo tom em que a fachada amanhece. E
 * reversivel (o controle de HORARIO do Editor) e pode ser chamado ANTES
 * do .glb terminar de carregar.
 * -------------------------------------------------
 */

window.BranchesFactory = (function () {
  const MODEL_URL = "assets/models/branches_psx.glb";

  // Nome legivel dado as malhas de dentro do arquivo. O .glb chama a peca
  // de "galho"; renomear na hora de carregar deixa a arvore do
  // painel de hierarquia do Editor legivel e o id dele estavel e com
  // significado (ver "Identidade dos objetos" em editor/README.md e o
  // dicionario NAME_LABELS de editor/editor-registry.js). Nao muda o
  // arquivo em disco e nao mexe em um vertice.
  const MESH_NAME = "branches_psx";

  // ---------- Medidas nativas do arquivo .glb ----------
  // A bounding box de gltf.scene, ou seja JA com a hierarquia de nos
  // resolvida pelo GLTFLoader, medida uma vez a partir do proprio arquivo
  // (o glTF obriga o accessor de POSITION a trazer min/max). Escrita aqui
  // pela MESMA razao das outras fabricas de modelo importado: a cena so
  // decide ONDE a peca fica, e nunca precisa esperar o .glb chegar para
  // saber o tamanho dela.
  //
  // O no deste arquivo nao traz rotacao nenhuma - a peca chega Y-up,
  // centrada em X/Z e com a base em Y = 0 -, entao os eixos do arquivo JA
  // sao os eixos do jogo: nao existe aqui o bloco ROTATED_* que o fogao,
  // a geladeira e a planta da varanda precisaram ter.
  const NATIVE_MIN_X = -0.2176649123430252;
  const NATIVE_MAX_X = 0.2176649123430252;
  const NATIVE_MIN_Y = 0.0;
  const NATIVE_MAX_Y = 0.07268570363521576;
  const NATIVE_MIN_Z = -0.26276662945747375;
  const NATIVE_MAX_Z = 0.26276662945747375;
  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;

  // ---------- Escala ----------
  // O pacote veio nas unidades do arquivo original e o README dele da o
  // fator: "para escala de metros use scale: 3". Com ele a peca sai em
  // 1.306 x 0.218 x 1.577 m - medida de um monte de gravetos espalhados no chao.
  const MODEL_SCALE = 3;

  // ---------- Para onde a frente do modelo olha ----------
  // Zero: a peca entra na cena exatamente como o arquivo a entrega, com a
  // frente em +Z - a mesma convencao de "frente" do resto do jogo (ver
  // DoorFactory). Quem vira a peca para o lado certo do quintal e o
  // rotationY dos DADOS (ver sideYard.props em
  // scenes/corridor-config.js), como acontece com as quatro pecas da
  // varanda: assim mudar o angulo dela nunca exige mexer em codigo, e o
  // Editor gira a peca no lugar por cima disso.
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/corridor-scene.js para encostar a peca na parede e para o
  // solido de colisao, do mesmo jeito que
  // StoveFactory/FridgeFactory.width/height/depth.
  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = (NATIVE_MAX_Y - NATIVE_MIN_Y) * MODEL_SCALE;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peca para a convencao de espaco local do jogo: X e Z
  // no centro da base, Y com a base no chao. Este arquivo ja chega assim,
  // entao a conta da praticamente zero - ela fica escrita do mesmo jeito
  // que nas outras fabricas de proposito: se um dia o .glb for trocado
  // por outro com a origem em outro canto, basta atualizar os seis
  // NATIVE_* acima e a peca continua assentando certo.
  const MODEL_POSITION_X =
    (YAW_FLIPPED ? NATIVE_CENTER_X : -NATIVE_CENTER_X) * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z =
    (YAW_FLIPPED ? NATIVE_CENTER_Z : -NATIVE_CENTER_Z) * MODEL_SCALE;

  // Tom em que o exterior amanhece: o MESMO color das outras pecas
  // importadas que vivem do lado de fora (ver DAY_TINT em
  // models/porch-plant-factory.js e exteriorWallDayMaterial em
  // materials/material-library.js), para a peca e o terreno em que ela se
  // apoia amanhecerem juntos.
  const DAY_TINT = 0xd9d2c4;

  // Loader unico e reaproveitado entre chamadas, mesma ideia das outras
  // fabricas. Sem DRACOLoader: a geometria deste arquivo chega CRUA (como
  // a do microondas e a do radio portatil), entao ele nem e instanciado.
  let sharedLoader = null;

  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura de todas as pecas importadas: filtro
  // "nearest" e sem mipmap para o pixel cru do visual PSX, e encoding
  // linear para ficar consistente com o resto do jogo. O sampler que o
  // pacote embutiu no .glb ja pede NEAREST/NEAREST, entao aqui isso e
  // cinto e suspensorio - de proposito.
  function normalizeTextures(model) {
    model.traverse(function (node) {
      if (!node.isMesh || !node.material) {
        return;
      }
      const list = Array.isArray(node.material) ? node.material : [node.material];
      list.forEach(function (mat) {
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

  // Versao de DIA do material: MeshBasicMaterial obrigatorio (ver "Noite
  // e dia" no topo, models/porch-plant-factory.js e
  // models/tree-forest-factory.js). Mesma textura, mesmo side, nevoa
  // ligada.
  function makeDayMaterial(mat) {
    return new THREE.MeshBasicMaterial({
      map: mat.map || null,
      color: DAY_TINT,
      side: mat.side,
      alphaTest: mat.alphaTest,
      transparent: false,
      fog: true,
    });
  }

  function applyTimeOfDay(state) {
    state.swaps.forEach(function (item) {
      item.mesh.material = state.day ? item.day : item.night;
    });
  }

  function loadInto(group, state) {
    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        // Nomes legiveis no lugar dos do arquivo (ver MESH_NAME). E
        // deterministico, entao o id que o Editor guarda continua estavel
        // entre execucoes.
        model.name = MESH_NAME;
        model.traverse(function (node) {
          if (node !== model) {
            node.name = MESH_NAME;
          }
        });

        // 1) Escala para o tamanho final no mundo do jogo.
        model.scale.setScalar(MODEL_SCALE);
        // 2) Para onde a frente aponta (ver MODEL_YAW acima).
        model.rotation.y = MODEL_YAW;
        // 3) Recentraliza: X e Z no centro da base, Y com a base no chao.
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        // Noite (o material do arquivo) e dia (o chapado), por malha.
        model.traverse(function (node) {
          if (!node.isMesh || !node.material || Array.isArray(node.material)) {
            return;
          }
          state.swaps.push({
            mesh: node,
            night: node.material,
            day: makeDayMaterial(node.material),
          });
        });

        group.add(model);
        // O horario pode ter sido decidido ANTES do .glb chegar.
        applyTimeOfDay(state);
      },
      undefined,
      function onError(error) {
        console.error("BranchesFactory: falha ao carregar " + MODEL_URL, error);
      }
    );
  }

  function createBranches() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2, e o rotulo
    // dela em editor/editor-registry.js).
    group.name = "BranchesPSX";

    const state = { day: false, swaps: [] };
    loadInto(group, state);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
      // Mesmo contrato de tudo que vive do lado de fora (a cena empurra
      // isto em exteriorGrounds, ver scenes/corridor-scene.js).
      setDaytime: function (daytime) {
        state.day = daytime !== false;
        applyTimeOfDay(state);
      },
      setMorning: function () {
        state.day = true;
        applyTimeOfDay(state);
      },
    };
  }

  return { createBranches: createBranches };
})();
