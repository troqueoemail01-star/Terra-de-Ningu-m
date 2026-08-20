/**
 * models/portable-radio-factory.js
 * -------------------------------------------------
 * RADIO PORTATIL da COZINHA - carregado a partir de um modelo .glb
 * pronto (assets/models/portable_radio_psx.glb), no MESMO sistema de
 * importacao dos outros modelos do jogo (ver
 * models/microwave-factory.js, models/shelf-factory.js,
 * models/sink-cabinet-factory.js, models/fruit-table-factory.js,
 * models/fridge-factory.js, models/gas-cylinder-factory.js e
 * models/stove-factory.js): o mesmo THREE.GLTFLoader que ja carrega os
 * outros .glb de assets/models, o mesmo `normalizeTextures` (filtro
 * nearest, sem mipmap, encoding linear), o mesmo `fixUnlitMaterial` que
 * a TV do MEU QUARTO e o microondas deste comodo ja usam (ver
 * models/tv-factory.js e o bloco "Material unlit" mais abaixo) e a mesma
 * ideia de "medir a bounding box nativa UMA vez, escrever as medidas
 * aqui e deixar a cena so decidir ONDE a peca fica". Nenhum carregador
 * novo, nenhum shader novo, nenhum sistema paralelo de 3D - foi
 * exatamente o pedido: "ja tem outros itens que foram implementados
 * dessa forma, portanto use o mesmo sistema, nao precisa criar algo
 * novo".
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem estatica, sem musica, sem botao que liga (pedido
 * explicito: "e apenas um item decorativo, sem interacoes, (por
 * enquanto)") - mesmo tratamento das outras NOVE pecas da COZINHA (fogao,
 * botijao, geladeira, mesa de frutas, pia, prateleira, microondas, filtro
 * de barro e garrafa com copo): quem posiciona
 * (scenes/side-room-scene.js) so decide onde a peca encosta, sem nenhuma
 * entrada em `interactables`. Ainda assim entra na lista de `solids` da
 * cena - igual as outras nove - so para o jogador nao atravessar o
 * aparelho andando; isso e colisao FISICA, nao "interacao" no sentido do
 * InteractionSystem (sem contorno de destaque, sem prompt de
 * "Interagir", sem dialogo). O dia em que der para LIGAR o radio, ouvir
 * chuvisco de estacao morta ou girar o dial, o lugar disso e
 * `interactables` + audio/, nao esta fabrica.
 *
 * ---------- Por que nao se chama RadioFactory ----------
 * Porque esse nome JA EXISTE e e de outra peca: models/radio-factory.js
 * e o radio DE MAO que fica deitado na mesinha de TV do MEU QUARTO
 * (assets/models/hand_radio_psx.glb). Sao dois objetos diferentes, em
 * dois comodos diferentes, e `window.RadioFactory` so cabe um. Dai
 * `PortableRadioFactory` / portable_radio_psx.glb / "PortableRadioPSX":
 * o arquivo novo nao encosta em uma linha do radio de mao, e a hierarquia
 * do Editor mostra os dois com rotulos distintos (ver NAME_LABELS em
 * editor/editor-registry.js).
 *
 * ---------- O arquivo entrou COMO CHEGOU, byte a byte ----------
 * assets/models/portable_radio_psx.glb e copia identica (26 KB) do
 * radio_psx.glb do pacote enviado - nada foi remodelado, reexportado nem
 * recomprimido:
 *
 *  - geometria INTOCADA: 161 vertices / 95 triangulos, como o README do
 *    pacote descreve;
 *  - textura JA dentro do mesmo arquivo: image/png 128x128 em
 *    bufferView, ligada ao `baseColorTexture`, com a paleta reduzida a
 *    48 cores e o dither ja assados nos pixels. Ou seja, este caso e o
 *    do MICROONDAS e nao o do botijao/pia/prateleira/filtro: nao
 *    precisou embutir textura nenhuma na mao, e a radio_psx_texture.png
 *    solta do pacote NAO entrou no jogo (seria um segundo caminho para a
 *    mesma imagem). A radio_original_texture.png (1024x1024,
 *    fotorrealista) tambem nao: ela existe so para o comparativo do
 *    preview.html do pacote.
 *  - creditos obrigatorios da licenca (CC BY 4.0, "Radio" de
 *    Luka.Aleksic, via Sketchfab) preservados no `asset.extras` de
 *    dentro do proprio .glb.
 *
 * De carona vem o `flipY = false` que um TextureLoader solto exigiria na
 * mao: o glTF assume UV com origem em CIMA e o GLTFLoader ja cuida disso
 * sozinho para textura que mora dentro do arquivo - esquecer esse
 * detalhe significaria a textura de cabeca para baixo.
 *
 * ---------- O js/psx-material.js do pacote NAO foi usado ----------
 * De proposito, e por tres motivos concretos:
 *
 *  1. E um modulo ES (`import * as THREE from 'three'`, `export function`)
 *     e este jogo carrega o three.js r128 por <script> global (ver
 *     index.html). Ele nao roda aqui sem bundler/import map - seria
 *     infraestrutura nova para um enfeite.
 *  2. Ele e um ShaderMaterial com luz, fog e direcao de luz PROPRIAS,
 *     cravadas em uniforms. O radio seria o UNICO objeto do jogo fora do
 *     sistema de iluminacao da casa: as luzes do comodo, o amanhecer
 *     (setDaytime) e o fog da cena nao chegariam nele. E o mesmo bug do
 *     material "unlit" que a TV e o microondas tiveram, so que de
 *     dentro para fora.
 *  3. O visual PS1 que aquele arquivo simula o jogo JA TEM, e por outro
 *     caminho: render em resolucao interna baixa com upscale sem
 *     suavizacao (INTERNAL_WIDTH/INTERNAL_HEIGHT em scripts/main.js +
 *     `image-rendering: pixelated` em interface/layout.css) e textura
 *     nearest/sem mipmap (o `normalizeTextures` daqui). O "wobble" de
 *     vertice e o unico item da lista que o jogo nao faz - e adotar um
 *     shader proprio SO no radio deixaria a peca visualmente
 *     inconsistente com as outras nove do mesmo comodo.
 *
 * Ou seja: o pacote veio com uma opcao a mais, e a opcao que atende ao
 * pedido ("use o mesmo sistema") e a que este arquivo usa.
 *
 * ---------- Material unlit: o MESMO conserto da TV ----------
 * UNICA pegadinha do arquivo, e ela ja tem dois precedentes no projeto. O
 * modelo veio do Sketchfab marcado como "Unlit"
 * (KHR_materials_unlit em `extensionsUsed`), e o GLTFLoader, ao ver essa
 * extensao, cria um THREE.MeshBasicMaterial - que IGNORA as luzes da cena
 * e desenha a textura sempre no brilho maximo. Numa COZINHA sem luz
 * propria (a ambiente da casa e 0x141018 a 0.35, ver scripts/main.js) o
 * radio brilharia sozinho no escuro, do lado de um fogao e de uma
 * geladeira apagados - exatamente o bug que a TV do MEU QUARTO e o
 * microondas deste comodo tiveram.
 *
 * Entao aqui roda o MESMO `fixUnlitMaterial` de models/tv-factory.js:
 * troca o MeshBasicMaterial por THREE.MeshStandardMaterial reaproveitando
 * a textura ja normalizada, com o mesmo acabamento fosco de plastico
 * (roughness 0.7 / metalness 0.05) que a TV e o microondas usam. Nao e
 * sistema novo: e a mesma funcao de 20 linhas do outro arquivo, e o
 * material passa a ser o mesmo tipo de todo o resto do jogo (ver
 * materials/material-library.js).
 *
 * `side` e PRESERVADO na troca (o material do arquivo vem `doubleSided`)
 * e aqui isso importa de verdade: a ANTENA e um cilindro finissimo de
 * ~3 mm e a alca e uma tira sem espessura - com FrontSide, faces vistas
 * pelo lado "de dentro" desapareceriam em certos angulos de camera. A
 * geometria segue INTOCADA.
 *
 * ---------- Geometria crua: nada de Draco ----------
 * Como o MICROONDAS, e diferente das outras sete pecas da COZINHA: a
 * geometria chega crua (161 vertices / 95 triangulos), entao esta fabrica
 * nao acopla DRACOLoader nenhum e nao tem lista de fontes de
 * decodificador. O <script> do DRACOLoader continua em index.html por
 * causa das outras, e nada de novo precisou entrar la por causa desta
 * peca - o loader aqui e o GLTFLoader puro.
 *
 * Se o arquivo nao chegar (caminho errado, asset faltando), o radio
 * simplesmente nao aparece: a falha vai para o console e o boot continua
 * identico - o grupo devolvido por createPortableRadio() nasce vazio e e
 * preenchido de forma assincrona, mesmo comportamento de todos os outros
 * modelos importados.
 *
 * ---------- Convencao de espaco local ----------
 * Mesma convencao "centralizada" das outras nove pecas da COZINHA (objeto
 * apoiado numa superficie), e nao a "Z = 0 e a parede" dos moveis de
 * encostar:
 *   - X = 0 e Z = 0 sao o CENTRO da base do radio;
 *   - Y = 0 e a base (o pe da peca);
 *   - a "frente" (auto-falante + dial + os dois botoes) olha para +Z,
 *     mesma convencao de frente do resto do jogo (ver DoorFactory).
 *
 * Origem no centro da base porque o usuario avisou que pode querer mudar
 * a posicao pelo Editor depois: assim o gizmo gira a peca NO LUGAR, em
 * vez de varrer ela para fora da parede. Quem encosta o radio na parede e
 * scenes/side-room-scene.js, que recebe largura/profundidade finais
 * (`width`/`depth` do retorno) para descontar a metade certa.
 * -------------------------------------------------
 */

window.PortableRadioFactory = (function () {
  const MODEL_URL = "assets/models/portable_radio_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Eixos CRUS do arquivo (o glTF obriga o accessor de POSITION a trazer
  // min/max, entao da para medir a peca sem nem descomprimir nada):
  //   X: -0.10250 a 0.10250
  //   Y: -0.03500 a 0.03940
  //   Z: -0.00001 a 0.55225
  const NATIVE_MIN_X = -0.10249999910593033;
  const NATIVE_MAX_X = 0.10249999910593033;
  const NATIVE_MIN_Y = -0.03500000014901161;
  const NATIVE_MAX_Y = 0.03939500078558922;
  const NATIVE_MIN_Z = -0.000007000000096013537;
  const NATIVE_MAX_Z = 0.5522540211677551;

  // ---------- Z-up -> Y-up: a rotacao do no raiz ----------
  // O no raiz da cena ("Sketchfab_model") traz uma matriz de conversao de
  // eixo assada nele - a mesma historia do botijao, da geladeira, da
  // mesa, da pia, da prateleira, do filtro e da garrafa -, e o
  // GLTFLoader aplica isso sozinho ao montar `gltf.scene`. So que aqui o
  // giro e -90 graus em X, o SINAL OPOSTO dos outros sete (que sao +90),
  // e ja houve precedente disso no projeto (ver o comentario de
  // models/radio-factory.js sobre a caixa de papelao). Traduzindo a
  // matriz do arquivo: y -> z e z -> -y (nos outros era y -> -z e
  // z -> y).
  //
  // Escrito como conta, e nao com os numeros ja trocados na mao, porque e
  // o que deixa claro de onde cada medida sai - e o que evita copiar o
  // ROTATED_* de outra fabrica sem perceber que o sinal aqui e outro.
  // Depois da rotacao (o que o jogo ve):
  //   X (largura):       -0.10250 a 0.10250 -> 0.205
  //   Y (altura):        -0.00001 a 0.55225 -> 0.552  (a ANTENA, ver abaixo)
  //   Z (profundidade):  -0.03940 a 0.03500 -> 0.074
  const ROTATED_MIN_X = NATIVE_MIN_X;
  const ROTATED_MAX_X = NATIVE_MAX_X;
  const ROTATED_MIN_Y = NATIVE_MIN_Z;
  const ROTATED_MAX_Y = NATIVE_MAX_Z;
  const ROTATED_MIN_Z = -NATIVE_MAX_Y;
  const ROTATED_MAX_Z = -NATIVE_MIN_Y;

  const ROTATED_CENTER_X = (ROTATED_MIN_X + ROTATED_MAX_X) / 2;
  const ROTATED_CENTER_Z = (ROTATED_MIN_Z + ROTATED_MAX_Z) / 2;

  // ---------- Escala ----------
  // Sem reescala (MODEL_SCALE = 1), como no FOGAO, na PRATELEIRA e no
  // MICROONDAS: o arquivo chegou em metros e ja em medida de aparelho de
  // verdade. O CORPO do radio mede 0.205 x 0.139 x 0.074 - 20,5 cm de
  // frente por 14 cm de altura e 7,4 cm de fundo, que e exatamente um
  // radio portatil de bancada/pilha.
  //
  // E aqui esta a pegadinha desta peca, e o motivo de NAO existir
  // TARGET_HEIGHT neste arquivo: a altura da bounding box e 0.552, mas
  // esses 55 cm sao a ANTENA ESTENDIDA, nao o aparelho. Ancorar a escala
  // na altura da caixa (como fazem o botijao, a geladeira, a mesa, a pia,
  // o filtro e a garrafa, todos pacotes que chegaram normalizados para
  // ~1 unidade) esmagaria o radio: com TARGET_HEIGHT = 0.30, por exemplo,
  // o corpo cairia para 11 x 7,5 cm - um radio de casa de boneca com uma
  // antena de 30 cm. Escala 1 e o certo: as PROPORCOES e as MEDIDAS ja
  // estao certas no arquivo.
  //
  // Referencias do proprio jogo para conferir que fecha: a bancada da pia
  // (SinkCabinetFactory, 0.9 de altura), o fogao (StoveFactory, 0.92) e o
  // microondas (MicrowaveFactory, 0.376 de altura por 0.611 de largura) -
  // o radio lendo um terco da largura do microondas e a proporcao certa
  // de um portatil do lado de um forno de bancada.
  const MODEL_SCALE = 1;

  // ---------- Para onde a frente do modelo olha ----------
  // Aqui NAO foi chute: a frente e conhecida pela propria textura. As
  // faces do lado +Z (depois da conversao de eixo acima) caem na regiao
  // do atlas 128x128 que traz o AUTO-FALANTE redondo, o dial de sintonia
  // com as marcacoes de frequencia e os dois botoes redondos; o lado -Z
  // traz o painel traseiro (tampa de pilhas, etiquetas e o encaixe da
  // antena). Ou seja: a frente cai em +Z, que e a MESMA convencao das
  // outras nove pecas da COZINHA e do resto do jogo.
  //
  // A ANTENA sai do canto de tras a direita do aparelho (X ~ +0.077,
  // Z ~ -0.034, ou seja, colada na traseira), o que confirma a leitura da
  // textura: antena atras, painel de controle na frente.
  //
  // Se algum dia o modelo for trocado e a peca aparecer de costas, esta e
  // a UNICA linha a mexer: 0 ou Math.PI. O recentramento abaixo acompanha
  // o giro sozinho, e 180 graus nao mudam largura/profundidade, entao a
  // colisao segue exata. (Para 90 graus seria preciso trocar FINAL_WIDTH
  // por FINAL_DEPTH tambem - nao implementado porque nao ha uso: girar 90
  // graus e trabalho de POSICIONAMENTO, e quem faz isso e a cena, ver
  // `rotationY` em scenes/side-room-scene.js.)
  const MODEL_YAW = 0;
  const YAW_FLIPPED = Math.abs(Math.abs(MODEL_YAW) - Math.PI) < 1e-6;

  // Dimensoes finais (ja na escala do jogo) - usadas por
  // scenes/side-room-scene.js para encostar a peca na parede e para o
  // solido de colisao, do mesmo jeito que StoveFactory/MicrowaveFactory/
  // BottleGlassFactory .width/.height/.depth. Sao as medidas da BOUNDING
  // BOX: 0.205 x 0.074 de base, 0.552 de altura.
  //
  // A altura inclui a antena, e a largura/profundidade NAO ficam infladas
  // por ela: a antena nasce DENTRO da pegada do corpo (X entre +0.073 e
  // +0.080, dentro dos +-0.1025 do corpo; Z entre -0.038 e -0.031, dentro
  // dos -0.039 a +0.035 do corpo), entao a base da caixa e exatamente a
  // base do aparelho. Traduzindo: a colisao do comodo nao vira uma coluna
  // invisivel de 55 cm de altura em volta de uma haste de 3 mm - ela e a
  // pegada do radio e nada mais, e a antena so existe para os olhos.
  const FINAL_WIDTH = (ROTATED_MAX_X - ROTATED_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = (ROTATED_MAX_Y - ROTATED_MIN_Y) * MODEL_SCALE;
  const FINAL_DEPTH = (ROTATED_MAX_Z - ROTATED_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peca para a convencao do comentario do topo: X e Z no
  // centro da base, Y com a base no chao. Aqui os tres dao numeros
  // pequenos mas NAO nulos (o modelo chegou centrado em X, 2,2 mm fora do
  // centro em Z e 7 micrometros abaixo do zero em Y), e a conta fica
  // escrita igual as outras fabricas: e ela que garante que trocar o .glb
  // por outra versao do modelo nao vai enterrar a peca no chao nem
  // desalinhar o encosto na parede. Com MODEL_YAW = Math.PI o giro
  // inverte X e Z, entao o deslocamento inverte de sinal junto.
  const MODEL_POSITION_X =
    (YAW_FLIPPED ? ROTATED_CENTER_X : -ROTATED_CENTER_X) * MODEL_SCALE;
  const MODEL_POSITION_Y = -ROTATED_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z =
    (YAW_FLIPPED ? ROTATED_CENTER_Z : -ROTATED_CENTER_Z) * MODEL_SCALE;

  // Nome da malha de dentro do modelo. O arquivo chama a malha de
  // "Object_2" e os nos intermediarios de "Sketchfab_model" /
  // "radio.obj.cleaner.materialmerger.gles" (nomes de exportador, que
  // apareceriam assim no painel de hierarquia do Editor). Renomear na
  // hora de carregar deixa a arvore legivel e o id do Editor estavel e
  // com significado - ver "Identidade dos objetos" em editor/README.md e
  // o dicionario NAME_LABELS de editor/editor-registry.js. Nao muda o
  // arquivo em disco e nao muda geometria nenhuma.
  const MESH_NAME = "portable_radio_psx";

  // Loader unico e reaproveitado entre chamadas - mesma ideia das outras
  // fabricas (hoje existe um radio so). Sem DRACOLoader: a geometria
  // deste arquivo e crua, ver o comentario do topo.
  let sharedLoader = null;

  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura usado nas outras nove pecas da COZINHA:
  // filtro "nearest" e sem mipmap para o pixel "cru" do visual PSX, e
  // encoding linear para ficar consistente com o resto do jogo (que nao
  // usa sRGBEncoding em nenhuma outra textura).
  //
  // Aqui isso NAO e cinto e suspensorio como no microondas: o sampler
  // deste .glb pede LINEAR com LINEAR_MIPMAP_LINEAR (o padrao do
  // Sketchfab), igual ao caso da mesa de frutas. Sem esta funcao a
  // textura de 128x128 chegaria borrada e com mipmap - o oposto do visual
  // do jogo, e visivel de perto justamente onde o modelo tem detalhe (o
  // dial de sintonia e as marcacoes de frequencia).
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

  // Conserto do material "Unlit" do arquivo - a MESMA funcao de
  // models/tv-factory.js (o primeiro modelo do jogo com esse problema) e
  // de models/microwave-factory.js, com os mesmos numeros de acabamento.
  // Ver o bloco "Material unlit" no comentario do topo para o porque.
  //
  // Roda DEPOIS de normalizeTextures de proposito: a textura ja sai dali
  // com nearest/sem mipmap/encoding linear e e reaproveitada como esta
  // (`map: mat.map`), sem recarregar nada. `side` e preservado porque o
  // material do arquivo vem doubleSided - e a antena e a alca DEPENDEM
  // disso (ver o topo).
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

  function loadInto(group) {
    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        const model = gltf.scene;
        normalizeTextures(model);
        fixUnlitMaterial(model);

        // Nomes legiveis no lugar dos genericos do exportador (ver
        // MESH_NAME). Deterministico, ou seja, o id que o Editor guarda
        // continua estavel entre execucoes.
        model.name = MESH_NAME;
        model.traverse(function (node) {
          if (node !== model && node.isMesh) {
            node.name = MESH_NAME;
          }
        });

        // 1) Escala (aqui 1:1, ver MODEL_SCALE acima - o arquivo ja
        //    chegou em metros).
        model.scale.setScalar(MODEL_SCALE);

        // 2) Para onde a frente aponta (ver MODEL_YAW acima).
        model.rotation.y = MODEL_YAW;

        // 3) Recentraliza: X e Z no centro da base, Y com a base no chao
        //    (ver convencao de espaco local no topo do arquivo).
        model.position.set(MODEL_POSITION_X, MODEL_POSITION_Y, MODEL_POSITION_Z);

        group.add(model);
      },
      undefined,
      function onError(error) {
        console.error(
          "PortableRadioFactory: falha ao carregar " + MODEL_URL,
          error
        );
      }
    );
  }

  function createPortableRadio() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2). Sem nome, o
    // id sairia de uma assinatura estrutural - que tambem funciona, mas
    // muda se a peca for reposicionada no codigo.
    group.name = "PortableRadioPSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createPortableRadio: createPortableRadio };
})();
