/**
 * models/car-factory.js
 * -------------------------------------------------
 * O CARRO ESTACIONADO NOS FUNDOS DA CASA (VW Golf Mk4 PSX)
 *
 * Primeira peca do QUINTAL DOS FUNDOS - a faixa de terreno atras da
 * parede de fundo de MEU QUARTO, a mesma que ganhou gramado na correcao
 * "Area sem grama atras da casa" (ver README.md). Peca puramente
 * DECORATIVA, exatamente como pedido ("por enquanto como modelo
 * decorativo"): sem interacao, sem outline, sem prompt de Interagir, sem
 * dialogo, sem animacao, sem som, sem evento.
 *
 * CUIDADO com o nome: CarInteriorFactory (models/car-interior-factory.js)
 * e OUTRA coisa - a cabine em primeira pessoa da cutscene de abertura na
 * estrada, feita em codigo, sem arquivo nenhum. Esta aqui e o carro
 * INTEIRO, visto de fora, importado de um .glb, parado no gramado.
 *
 * ---------- Mesmo sistema de import de sempre ----------
 * Carregado de um .glb em assets/models pelo MESMO THREE.GLTFLoader que
 * carrega todos os outros modelos do jogo (ver models/dumpster-factory.js,
 * models/woodpile-factory.js e models/stove-factory.js), com o MESMO
 * normalizeTextures (nearest, sem mipmap, encoding linear) e a MESMA ideia
 * de medir a bounding box nativa UMA vez, escrever as medidas aqui e
 * deixar a cena decidir so ONDE a peca fica. Nenhum carregador novo,
 * nenhum shader novo, nenhum segundo three.js - foi exatamente o pedido:
 * "ja tem outros itens que foram implementados dessa forma, portanto use o
 * mesmo sistema, nao precisa criar algo novo".
 *
 * A geometria deste arquivo chega CRUA (sem Draco e sem quantizacao:
 * POSITION/NORMAL/TEXCOORD em float32, indices em Uint16), entao ela nem
 * passa pelo DRACOLoader - nada precisou mudar no bloco do motor 3D de
 * index.html por causa desta peca. A textura PSX (256x256, 256 cores,
 * 15-bit) ja vem EMBUTIDA no proprio .glb, com sampler NEAREST, entao
 * tambem nao tem TextureLoader avulso aqui: um arquivo so, um caminho de
 * codigo so.
 *
 * ---------- Sete pecas, UM objeto ----------
 * O arquivo traz 7 nos separados (body, mirror_L, mirror_R e as quatro
 * rodas, 4.376 triangulos no total). Diferente dos pacotes de lixo,
 * jardim e madeira - onde cada peca era um OBJETO diferente do quintal e
 * virou uma fabrica propria -, aqui as sete sao partes do MESMO objeto:
 * um carro. Entao entra UMA fabrica, UM grupo e UM nome no Editor, e o
 * carro se move, gira e escala como uma coisa so. As sete continuam
 * existindo como malhas separadas dentro do grupo (com nome proprio na
 * hierarquia do Editor), o que deixa a porta aberta para o futuro sem
 * custo nenhum hoje: esconder uma roda, baixar a suspensao, abrir a porta.
 *
 * ---------- O motor PSX do pacote NAO entrou ----------
 * O pacote veio com preview proprio, um three.js r185 inteiro
 * (lib/three.psx.min.js) e um runtime PSX em src/ (ShaderMaterial com
 * snap de vertice, warp afim de textura, dither de 15 bits e luz Gouraud
 * propria). NADA disso entrou aqui, pelos MESMOS motivos ja escritos em
 * models/porch-plant-factory.js e models/portable-radio-factory.js: o
 * jogo roda em three.js r128 com scripts globais, entao usar aquele
 * runtime significaria carregar um SEGUNDO three.js na pagina (o "sistema
 * novo" que o pedido descarta), e o shader dele tem luz PROPRIA fixa - o
 * carro ignoraria as luzes da casa e o amanhecer. O look PSX daqui ja vem
 * da renderizacao do jogo (resolucao interna baixa, filtro nearest, sem
 * mipmap) e da propria textura reprocessada que veio no arquivo.
 *
 * ---------- Convencao de espaco local ----------
 *   - X = 0 e Z = 0 sao o CENTRO da base;
 *   - Y = 0 e o chao (base da peca, ou seja onde os pneus encostam);
 *   - a frente olha para +Z, mesma convencao do resto do jogo.
 * O arquivo ja chega exatamente assim ("Eixos corrigidos: Y para cima,
 * frente em +Z, escala em metros, pivot no centro do chao", LEIA-ME do
 * pacote), entao nao existe aqui o bloco ROTATED_* que o fogao, a
 * geladeira e a planta da varanda precisaram ter.
 *
 * ---------- Noite e dia ----------
 * A peca vive do lado de FORA, e do lado de fora ninguem sobrevive so com
 * o material do arquivo: de manha o terreno, a grama, a fachada e o
 * telhado trocam para material CHAPADO (MeshBasicMaterial, ver
 * materials/material-library.js), porque nao existe sol de verdade na
 * cena - um modelo iluminado no meio de um cenario chapado apareceria
 * PRETO. Entao ele cumpre o MESMO contrato de tudo que vive la fora
 * (setDaytime/setMorning, ver models/porch-plant-factory.js e
 * models/dumpster-factory.js): mesma geometria e mesma textura nos dois
 * periodos, trocando so o material - MeshStandardMaterial de noite e
 * MeshBasicMaterial de dia, no mesmo tom em que a fachada amanhece. E
 * reversivel (o controle de HORARIO do Editor) e pode ser chamado ANTES
 * do .glb terminar de carregar.
 *
 * ---------- Credito obrigatorio (CC-BY 4.0) ----------
 * Modelo "1998 Volkswagen Golf Mk4", de ImperialBlue
 * (https://sketchfab.com/ImperialBlue3D), licenca CC-BY 4.0. A malha nao
 * foi alterada; a textura veio reamostrada e requantizada em estilo PSX
 * pelo proprio pacote (obra derivada, permitida pela licenca). A licenca
 * EXIGE atribuicao visivel se o jogo for publicado - o credito esta
 * repetido na secao "O CARRO DOS FUNDOS" do README.md, que e o lugar de
 * onde ele deve sair para a futura tela de CREDITOS do menu.
 * -------------------------------------------------
 */

window.CarFactory = (function () {
  const MODEL_URL = "assets/models/car_golf_mk4_psx.glb";

  // Nome legivel dado ao no raiz do arquivo, e o dicionario de nomes das
  // SETE malhas de dentro dele. Renomear na hora de carregar deixa a
  // arvore do painel de hierarquia do Editor legivel e os ids estaveis e
  // com significado (ver "Identidade dos objetos" em editor/README.md e o
  // dicionario NAME_LABELS de editor/editor-registry.js). Nao muda o
  // arquivo em disco e nao mexe em um vertice.
  //
  // Aqui, diferente das outras fabricas de modelo importado, as malhas NAO
  // recebem todas o mesmo nome: as sete sao partes distintas de um carro
  // (carroceria, dois espelhos, quatro rodas), e nomear cada uma faz a
  // hierarquia do Editor dizer "Carro: roda diant. esquerda" em vez de
  // sete linhas iguais. O id que o Editor guarda nao depende do nome (ele
  // sai de uma assinatura com a posicao original, ver o caso 3 de
  // editor/editor-registry.js), entao isto e so legibilidade.
  const MESH_NAME = "car_golf_mk4_psx";
  const PART_NAMES = {
    body: "car_body",
    mirror_L: "car_mirror_l",
    mirror_R: "car_mirror_r",
    wheel_FL: "car_wheel_fl",
    wheel_FR: "car_wheel_fr",
    wheel_RL: "car_wheel_rl",
    wheel_RR: "car_wheel_rr",
  };

  // ---------- Medidas nativas do arquivo .glb ----------
  // A bounding box de gltf.scene, ou seja JA com a hierarquia de nos
  // resolvida pelo GLTFLoader, medida uma vez a partir do proprio arquivo
  // (o glTF obriga o accessor de POSITION a trazer min/max, e os sete nos
  // deste arquivo nao trazem rotacao, translacao nem escala - os eixos do
  // arquivo JA sao os eixos do jogo). Escrita aqui pela MESMA razao das
  // outras fabricas de modelo importado: a cena so decide ONDE a peca
  // fica, e nunca precisa esperar o .glb chegar para saber o tamanho dela.
  //
  // O X extremo vem dos ESPELHOS (a carroceria sozinha tem 1.904 de
  // largura); o Y de cima, do teto; o Z, dos para-choques.
  const NATIVE_MIN_X = -1.1455471515655518;
  const NATIVE_MAX_X = 1.1455471515655518;
  const NATIVE_MIN_Y = 0.0000032376406124967616;
  const NATIVE_MAX_Y = 1.6527700424194336;
  const NATIVE_MIN_Z = -2.3209140300750732;
  const NATIVE_MAX_Z = 2.3209140300750732;
  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;

  // ---------- Escala ----------
  // 1:1, como a cama, o criado-mudo e o fogao: o LEIA-ME do pacote diz
  // "escala em metros" com todas as letras, e escala de pacote nao se
  // inventa aqui (mesma regra das doze pecas do quintal lateral, cada uma
  // com o fator declarado pelo pacote dela). Com ela o carro sai em
  // 2.291 x 1.653 x 4.642 m.
  //
  // Nota de acervo, para o dia em que alguem quiser mexer: um Golf Mk4 de
  // verdade tem 4.15 x 1.74 x 1.44 m, entao este modelo esta ~12% maior
  // que o carro real (o pacote arredondou para cima na conversao). Como o
  // jogo nao tem NENHUMA referencia de carro em escala perto dele - ele
  // esta sozinho no gramado dos fundos, e a cabine da cutscene e outra
  // peca, em outro mundo -, esses 12% nao se leem na tela. Se um dia isso
  // incomodar, e UM numero: MODEL_SCALE = 0.894 devolve os 4.15 m de
  // comprimento exatos, e todas as medidas finais e a colisao acompanham
  // sozinhas (elas sao derivadas, nao escritas na mao).
  const MODEL_SCALE = 1;

  // ---------- Para onde a frente do modelo olha ----------
  // Zero: a peca entra na cena exatamente como o arquivo a entrega, com a
  // frente (o capo) em +Z - a mesma convencao de "frente" do resto do jogo
  // (ver DoorFactory). Quem vira o carro para o lado certo do quintal e o
  // rotationY dos DADOS (ver backYard.props em
  // scenes/corridor-config.js), como acontece com as pecas da varanda e as
  // doze do quintal lateral: assim mudar o angulo dele nunca exige mexer
  // em codigo, e o Editor gira a peca no lugar por cima disso.
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/corridor-scene.js para afastar a peca da parede e para o solido
  // de colisao, do mesmo jeito que
  // DumpsterFactory/WoodpileFactory.width/height/depth.
  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = (NATIVE_MAX_Y - NATIVE_MIN_Y) * MODEL_SCALE;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peca para a convencao de espaco local do jogo: X e Z no
  // centro da base, Y com a base no chao. Este arquivo ja chega assim,
  // entao a conta da praticamente zero (o Y desce 3 milesimos de
  // MILIMETRO) - ela fica escrita do mesmo jeito que nas outras fabricas
  // de proposito: se um dia o .glb for trocado por outro com a origem em
  // outro canto, basta atualizar os seis NATIVE_* acima e a peca continua
  // assentando certo.
  const MODEL_POSITION_X =
    (YAW_FLIPPED ? NATIVE_CENTER_X : -NATIVE_CENTER_X) * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z =
    (YAW_FLIPPED ? NATIVE_CENTER_Z : -NATIVE_CENTER_Z) * MODEL_SCALE;

  // Tom em que o exterior amanhece: o MESMO color das outras pecas
  // importadas que vivem do lado de fora (ver DAY_TINT em
  // models/porch-plant-factory.js e exteriorWallDayMaterial em
  // materials/material-library.js), para o carro e o gramado em que ele
  // esta parado amanhecerem juntos.
  const DAY_TINT = 0xd9d2c4;

  // Loader unico e reaproveitado entre chamadas, mesma ideia das outras
  // fabricas. Sem DRACOLoader: a geometria deste arquivo chega CRUA (como
  // a do microondas, do radio portatil e das doze do quintal lateral),
  // entao ele nem e instanciado.
  let sharedLoader = null;

  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura de todas as pecas importadas: filtro "nearest"
  // e sem mipmap para o pixel cru do visual PSX, e encoding linear para
  // ficar consistente com o resto do jogo. O sampler que o pacote embutiu
  // no .glb ja pede NEAREST/NEAREST, entao aqui isso e cinto e
  // suspensorio - de proposito.
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

  // Conserto do material "Unlit" do arquivo - a MESMA funcao de
  // models/tv-factory.js (o primeiro modelo do jogo com esse problema), de
  // models/microwave-factory.js, models/portable-radio-factory.js,
  // models/toilet-factory.js e models/dumpster-factory.js, com os mesmos
  // numeros de acabamento. Sem isto o carro brilharia sozinho no meio da
  // noite, ignorando as luzes da cena e o amanhecer (KHR_materials_unlit,
  // gravado no proprio .glb, vira MeshBasicMaterial no GLTFLoader).
  //
  // Roda DEPOIS de normalizeTextures de proposito: a textura ja sai dali
  // com nearest/sem mipmap/encoding linear e e reaproveitada como esta
  // (map: mat.map), sem recarregar nada. `side` e preservado porque o
  // material do arquivo vem doubleSided.
  //
  // Uma diferenca desta peca em relacao as outras: as SETE malhas do carro
  // compartilham UM material so no arquivo, e o GLTFLoader entrega essa
  // mesma instancia para as sete. O cache abaixo preserva esse
  // compartilhamento - o carro inteiro fica com UM MeshStandardMaterial
  // (e, mais abaixo, UM MeshBasicMaterial de dia), em vez de 14 copias do
  // mesmo material num jogo mobile.
  function fixUnlitMaterial(model, cache) {
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
        if (cache.has(mat)) {
          return cache.get(mat);
        }
        const replacement = new THREE.MeshStandardMaterial({
          map: mat.map || null,
          color: mat.color ? mat.color.clone() : undefined,
          side: mat.side,
          vertexColors: !!mat.vertexColors,
          roughness: 0.7,
          metalness: 0.05,
        });
        cache.set(mat, replacement);
        mat.dispose();
        return replacement;
      });
      node.material = isArray ? fixed : fixed[0];
    });
  }

  // Versao de DIA do material: MeshBasicMaterial obrigatorio (ver "Noite e
  // dia" no topo, models/porch-plant-factory.js e
  // models/tree-forest-factory.js). Mesma textura, mesmo side, nevoa
  // ligada. O cache e o mesmo truque do conserto acima: um material de dia
  // para o carro inteiro.
  function dayMaterialFor(mat, cache) {
    if (cache.has(mat)) {
      return cache.get(mat);
    }
    const made = new THREE.MeshBasicMaterial({
      map: mat.map || null,
      color: DAY_TINT,
      side: mat.side,
      alphaTest: mat.alphaTest,
      transparent: false,
      fog: true,
    });
    cache.set(mat, made);
    return made;
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
        fixUnlitMaterial(model, new Map());

        // Nomes legiveis no lugar dos do arquivo (ver MESH_NAME e
        // PART_NAMES). E deterministico, entao a hierarquia do Editor sai
        // igual em toda execucao.
        model.name = MESH_NAME;
        model.traverse(function (node) {
          if (node === model) {
            return;
          }
          node.name = PART_NAMES[node.name] || MESH_NAME;
        });

        // 1) Escala para o tamanho final no mundo do jogo.
        model.scale.setScalar(MODEL_SCALE);
        // 2) Para onde a frente aponta (ver MODEL_YAW acima).
        model.rotation.y = MODEL_YAW;
        // 3) Recentraliza: X e Z no centro da base, Y com a base no chao.
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        // Noite (o material do arquivo, ja consertado) e dia (o chapado),
        // por malha - as sete apontando para o mesmo par de materiais.
        const dayCache = new Map();
        model.traverse(function (node) {
          if (!node.isMesh || !node.material || Array.isArray(node.material)) {
            return;
          }
          state.swaps.push({
            mesh: node,
            night: node.material,
            day: dayMaterialFor(node.material, dayCache),
          });
        });

        group.add(model);
        // O horario pode ter sido decidido ANTES do .glb chegar.
        applyTimeOfDay(state);
      },
      undefined,
      function onError(error) {
        console.error("CarFactory: falha ao carregar " + MODEL_URL, error);
      }
    );
  }

  function createCar() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2, e o rotulo
    // dela em editor/editor-registry.js).
    group.name = "CarPSX";

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

  return { createCar: createCar };
})();
