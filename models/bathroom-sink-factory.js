/**
 * models/bathroom-sink-factory.js
 * -------------------------------------------------
 * PIA DE COLUNA do BANHEIRO - carregada a partir de um modelo .glb
 * pronto (assets/models/bathroom_sink_psx.glb), no MESMO sistema de
 * importacao dos outros modelos do jogo (ver models/stove-factory.js,
 * models/sink-cabinet-factory.js, models/microwave-factory.js e
 * models/portable-radio-factory.js): o mesmo THREE.GLTFLoader que ja
 * carrega os outros .glb de assets/models, o mesmo `normalizeTextures`
 * (filtro nearest, sem mipmap, encoding linear) e a mesma ideia de
 * "medir a bounding box nativa UMA vez, escrever as medidas aqui e
 * deixar a cena so decidir ONDE a peca fica". Nenhum carregador novo,
 * nenhum shader novo, nenhum sistema paralelo de 3D - foi exatamente o
 * pedido: "ja tem outros itens que foram implementados dessa forma,
 * portanto use o mesmo sistema, nao precisa criar algo novo".
 *
 * SEGUNDA das SEIS pecas decorativas do BANHEIRO (ver
 * models/toilet-factory.js, models/mirror-cabinet-factory.js,
 * models/towel-factory.js, models/shower-box-factory.js e
 * models/laundry-basket-factory.js).
 *
 * ---------- CUIDADO com o nome: sao DUAS pias no jogo ----------
 * `SinkCabinetFactory` (models/sink-cabinet-factory.js) e a PIA COM
 * ARMARIO da COZINHA - bancada de 0.9 com portas embaixo. Esta e outra
 * peca, em outro comodo: uma pia de coluna de banheiro, com torneira,
 * cuba e o pedestal. Por isso os nomes sao diferentes em todos os
 * lugares (`BathroomSinkFactory`, `bathroom_sink_psx.glb`, grupo
 * `BathroomSinkPSX`, lista `bathroomSinks` nos dados do comodo): o
 * arquivo novo nao encosta em uma linha da pia da cozinha, e no painel
 * de hierarquia do Editor as duas aparecem com rotulos distintos.
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem evento (pedido explicito: "sao apenas itens decorativos,
 * sem interacoes, (por enquanto)" - abrir a torneira um dia e trabalho
 * de outra atualizacao). Entra em `solids` da cena, so para o jogador
 * nao atravessar a pia andando; isso e colisao FISICA, nao "interacao"
 * no sentido do InteractionSystem.
 *
 * ---------- Como este .glb foi montado ----------
 * Este e o UNICO dos seis pacotes do BANHEIRO que nao trouxe um .glb: a
 * geometria vinha em src/pia_model.js, embutida em base64 dentro do
 * proprio JavaScript (posicoes em Uint16 quantizado + min/scale, normais
 * em Int8, UV em Uint16, cores por vertice em Uint8 e indices em
 * Uint32), montada em runtime por `PiaModel.buildPiaGeometry(THREE)`.
 *
 * Usar aquilo direto seria um SEGUNDO caminho de import na pagina (um
 * arquivo .js de 1.4 MB que monta BufferAttributes na mao, em paralelo
 * ao GLTFLoader que carrega todo o resto do cenario), e o pedido era o
 * oposto disso. Entao os MESMOS buffers foram gravados num .glb padrao,
 * sem tocar em um vertice: 29.737 vertices / 50.000 triangulos, POSITION
 * e NORMAL em float32 (as normais renormalizadas, ja que o pacote as
 * guardava em Int8), TEXCOORD_0 em float32, indices em Uint16 (cabem: o
 * modelo tem menos de 65.536 vertices) e a textura PSX de 256x256
 * embutida como PNG em bufferView, com sampler NEAREST/NEAREST e um
 * material Standard (metallic 0, roughness 1, doubleSided). Nenhuma
 * decimacao, nenhuma suavizacao, nenhuma reexportacao por ferramenta de
 * modelagem: a geometria que o jogo desenha e bit a bit a que estava no
 * pacote.
 *
 * As cores por vertice (`color`) do pacote NAO entraram: eram a textura
 * ja "assada" em Gouraud para o preview poder desligar o mapeamento UV
 * (o botao "textura/vertex" dele). No jogo elas seriam multiplicadas por
 * cima da textura pelo MeshStandardMaterial, escurecendo a peca duas
 * vezes - e a iluminacao aqui e a da casa, nao a do preview.
 *
 * A textura entrou DENTRO do .glb (e nao solta ao lado, com um
 * TextureLoader avulso) pelo mesmo motivo do botijao, da pia da cozinha
 * e do filtro de barro: um arquivo so, um caminho de codigo so. De
 * carona vem o detalhe de UV: o pacote carregava o PNG com
 * THREE.TextureLoader, que usa `flipY = true`, mas os UVs deste modelo
 * sao de glTF (origem em CIMA). Textura que mora dentro do .glb e lida
 * pelo GLTFLoader com `flipY = false`, que e o certo - entao aqui ela
 * cai no lugar sozinha.
 *
 * ---------- O que NAO entrou do pacote ----------
 * preview.html e src/psx_material.js: o preview roda um ShaderMaterial
 * proprio (UV afim, snap de vertices, luz por vertice, banding e fog
 * cravados em uniforms), ou seja, um segundo sistema de material em
 * paralelo ao do jogo - a peca seria a UNICA fora do sistema de
 * iluminacao da casa, o mesmo bug do material "unlit" da TV. E o visual
 * PS1 que ele simula o jogo JA TEM por outro caminho: render em
 * resolucao interna baixa com upscale sem suavizacao e textura
 * nearest/sem mipmap. src/pia_texture.js (a mesma imagem em data URI)
 * tambem ficou de fora: seria um segundo caminho para a mesma textura.
 *
 * ---------- Geometria CRUA: sem Draco aqui ----------
 * Como o microondas e o radio portatil, este .glb nao usa
 * KHR_draco_mesh_compression - a geometria foi gravada crua. Entao a
 * fabrica nao acopla DRACOLoader nenhum: e o GLTFLoader puro. O
 * <script> do DRACOLoader continua em index.html por causa das outras
 * pecas (inclusive as quatro do BANHEIRO que sao comprimidas), e nada de
 * novo precisou entrar la.
 *
 * ---------- Convencao de espaco local ----------
 *   - X = 0 e Z = 0 sao o CENTRO da base da pia;
 *   - Y = 0 e o chao (base do pedestal);
 *   - a "frente" (a cuba, o lado oposto a torneira) olha para +Z, mesma
 *     convencao de frente do resto do jogo (ver DoorFactory).
 * -------------------------------------------------
 */

window.BathroomSinkFactory = (function () {
  const MODEL_URL = "assets/models/bathroom_sink_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Este arquivo NAO tem rotacao de eixo no no raiz (ver "Como este .glb
  // foi montado": ele foi gravado ja em Y para cima, com a base em
  // y = 0), diferente da privada, da toalha, do box e do cesto - por
  // isso aqui nao existe o par NATIVE_*/ROTATED_* das outras fabricas: os
  // eixos do arquivo JA sao os eixos do jogo.
  //   X (largura):      -0.28057 a 0.27902 -> 0.560
  //   Y (altura):        0.0     a 1.05308 -> 1.053
  //   Z (profundidade): -0.22822 a 0.32648 -> 0.555
  const NATIVE_MIN_X = -0.2805669903755188;
  const NATIVE_MAX_X = 0.2790194153785706;
  const NATIVE_MIN_Y = 0;
  const NATIVE_MAX_Y = 1.05308198928833;
  const NATIVE_MIN_Z = -0.22822299599647522;
  const NATIVE_MAX_Z = 0.3264773190021515;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;
  const NATIVE_HEIGHT = NATIVE_MAX_Y - NATIVE_MIN_Y;

  // ---------- Escala ----------
  // Tem reescala: o pacote chegou NORMALIZADO (bounding box de ~1
  // unidade de altura, o modelo encaixado num cubo unitario pelo
  // aplicativo de escaneamento), e nao em metros. As PROPORCOES estao
  // certas - 1.053 de altura por 0.560 de largura da 1.88x mais alto que
  // largo, e uma pia de coluna de verdade (0.85 de altura por 0.45 de
  // cuba) da 1.89x.
  //
  // A ancora e a ALTURA e a escala e UNIFORME (nunca esticar so um eixo:
  // distorceria a peca e a textura). 0.85 e a altura de norma para
  // lavatorio: a NBR pede a borda da cuba entre 0.80 e 0.90 do piso.
  // Com ela a base sai 0.45 x 0.45, a pegada real da peca.
  //
  // Referencias do proprio jogo: a privada ao lado (0.78, ver
  // models/toilet-factory.js), a bancada da pia da COZINHA (0.9, ver
  // models/sink-cabinet-factory.js) e a altura do olho do jogador
  // (1.6, CorridorConfig.eyeHeight).
  //
  // Se ela parecer grande ou pequena demais dentro do jogo, esta e a
  // UNICA linha a mexer: largura, profundidade, recentramento e caixa de
  // colisao saem todas dela.
  const TARGET_HEIGHT = 0.85;

  const MODEL_SCALE = TARGET_HEIGHT / NATIVE_HEIGHT;

  // ---------- Para onde a frente do modelo olha ----------
  // Aqui NAO foi chute: foi medido na propria malha (que chegou crua,
  // entao da para ler vertice por vertice). Os pontos mais ALTOS da peca
  // - a torneira e os dois registros, acima do plano da bancada - caem
  // todos entre z = -0.17 e z = -0.02, ou seja, no lado -Z; e a aba da
  // bancada avanca para o outro lado, ate z = +0.33. Traduzindo: torneira
  // (e parede) em -Z, cuba e frente em +Z - a MESMA convencao das dez
  // pecas da COZINHA e do resto do jogo (ver DoorFactory).
  //
  // Se um dia o modelo for trocado e a peca aparecer de costas, esta e a
  // UNICA linha a mexer: 0 ou Math.PI. O recentramento abaixo acompanha o
  // giro sozinho, e 180 graus nao mudam largura/profundidade, entao a
  // colisao segue exata.
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/side-room-scene.js para encostar a peca na parede e para o
  // solido de colisao. Sao as medidas da BOUNDING BOX: 0.45 x 0.45 de
  // base, 0.85 de altura.
  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = TARGET_HEIGHT;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peca para a convencao do comentario do topo: X e Z no
  // centro da base, Y com a base no chao. Com MODEL_YAW = Math.PI o giro
  // inverte X e Z, entao o deslocamento inverte de sinal junto.
  const MODEL_POSITION_X =
    (YAW_FLIPPED ? NATIVE_CENTER_X : -NATIVE_CENTER_X) * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z =
    (YAW_FLIPPED ? NATIVE_CENTER_Z : -NATIVE_CENTER_Z) * MODEL_SCALE;

  // Nome da malha de dentro do modelo (o padrao das outras pecas
  // importadas: o nome do asset). E por ele que o dicionario NAME_LABELS
  // do Editor acha o rotulo - ver "Identidade dos objetos" em
  // editor/README.md e editor/editor-registry.js.
  const MESH_NAME = "bathroom_sink_psx";

  // Loader unico e reaproveitado entre chamadas. Sem DRACOLoader: a
  // geometria deste arquivo e crua, ver o comentario do topo.
  let sharedLoader = null;

  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura das outras pecas importadas: filtro
  // "nearest" e sem mipmap para o pixel "cru" do visual PSX, e encoding
  // linear para ficar consistente com o resto do jogo. O sampler
  // embutido no .glb ja pede NEAREST/NEAREST, entao aqui e cinto e
  // suspensorio - de proposito, para a peca continuar pixelada se a
  // textura for trocada um dia.
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

  function loadInto(group) {
    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);

        model.name = MESH_NAME;
        model.traverse(function (node) {
          if (node !== model && node.isMesh) {
            node.name = MESH_NAME;
          }
        });

        // 1) Escala para o tamanho final no mundo do jogo.
        model.scale.setScalar(MODEL_SCALE);

        // 2) Para onde a frente aponta (ver MODEL_YAW acima).
        model.rotation.y = MODEL_YAW;

        // 3) Recentraliza: X e Z no centro da base, Y com a base no chao.
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error("BathroomSinkFactory: falha ao carregar " + MODEL_URL, error);
      }
    );
  }

  function createBathroomSink() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2).
    group.name = "BathroomSinkPSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createBathroomSink: createBathroomSink };
})();
