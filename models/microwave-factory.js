/**
 * models/microwave-factory.js
 * -------------------------------------------------
 * MICROONDAS da COZINHA - carregado a partir de um modelo .glb pronto
 * (assets/models/microwave_psx.glb), no MESMO sistema de importacao dos
 * outros modelos do jogo (ver models/shelf-factory.js,
 * models/sink-cabinet-factory.js, models/fruit-table-factory.js,
 * models/fridge-factory.js, models/gas-cylinder-factory.js e
 * models/stove-factory.js): o mesmo THREE.GLTFLoader que ja carrega os
 * outros .glb de assets/models, o mesmo `normalizeTextures` (filtro
 * nearest, sem mipmap, encoding linear), o mesmo `fixUnlitMaterial` que
 * a TV do MEU QUARTO ja usa (ver models/tv-factory.js e o bloco
 * "Material unlit" mais abaixo) e a mesma ideia de "medir a bounding box
 * nativa UMA vez, escrever as medidas aqui e deixar a cena so decidir
 * ONDE a peca fica". Nenhum carregador novo, nenhum shader novo, nenhum
 * sistema paralelo de 3D - foi exatamente o pedido: "ja tem outros itens
 * que foram implementados dessa forma, portanto use o mesmo sistema, nao
 * precisa criar algo novo".
 *
 * Peca puramente DECORATIVA - sem interacao, sem outline, sem animacao,
 * sem som, sem evento, sem luz interna, sem porta que abre (pedido
 * explicito: "e apenas um item decorativo, sem interacoes, (por
 * enquanto)") - mesmo tratamento do fogao, do botijao, da geladeira, da
 * mesa de frutas, da pia e da prateleira do mesmo comodo: quem posiciona
 * (scenes/side-room-scene.js) so decide onde a peca encosta, sem nenhuma
 * entrada em `interactables`. Ainda assim entra na lista de `solids` da
 * cena - igual as outras seis - so para o jogador nao atravessar o
 * aparelho andando; isso e colisao FISICA, nao "interacao" no sentido do
 * InteractionSystem (sem contorno de destaque, sem prompt de
 * "Interagir", sem dialogo). O dia em que der para abrir a porta, esquentar
 * algo ou ouvir o "beep", o lugar disso e `interactables`, nao esta
 * fabrica.
 *
 * ---------- O arquivo entrou COMO CHEGOU, byte a byte ----------
 * Diferente do botijao, da pia e da prateleira (que precisaram da textura
 * embutida no .glb), aqui nada foi tocado no asset: o pacote trouxe a
 * geometria e a textura JA dentro do mesmo arquivo - image/png 256x256 em
 * bufferView, sampler NEAREST/NEAREST, wrap REPEAT, ligada ao
 * `baseColorTexture`, com a paleta reduzida e o dither ja assados nos
 * pixels. E exatamente o formato que este projeto vinha convergindo a
 * mao nas tres pecas anteriores, entao assets/models/microwave_psx.glb e
 * copia identica do arquivo enviado (51 KB, o mais leve das SETE pecas da
 * COZINHA), com os creditos obrigatorios da licenca (CC BY 4.0, Lo-Fi
 * Microwave (PSX) de Vaportrash) preservados no `asset.extras` de dentro
 * do proprio .glb.
 *
 * De carona vem o `flipY = false` que o README do pacote pedia na mao: o
 * glTF assume UV com origem em CIMA e o GLTFLoader ja cuida disso sozinho
 * para textura que mora dentro do arquivo - com um TextureLoader solto
 * seria preciso lembrar disso, e esquecer significaria a textura de
 * cabeca para baixo.
 *
 * ---------- Material unlit: o MESMO conserto da TV ----------
 * UNICA pegadinha do arquivo, e ela ja tinha precedente no projeto. O
 * modelo veio do Sketchfab marcado como "Unlit"
 * (KHR_materials_unlit em `extensionsUsed`), e o GLTFLoader, ao ver essa
 * extensao, cria um THREE.MeshBasicMaterial - que IGNORA as luzes da cena
 * e desenha a textura sempre no brilho maximo. Numa COZINHA sem luz
 * propria (a ambiente da casa e 0x141018 a 0.35, ver scripts/main.js) o
 * microondas seria a UNICA peca do comodo acesa, do lado de um fogao, uma
 * pia e uma geladeira escuros - o mesmo bug que a TV do MEU QUARTO teve.
 *
 * Entao aqui roda o MESMO `fixUnlitMaterial` de models/tv-factory.js:
 * troca o MeshBasicMaterial por THREE.MeshStandardMaterial reaproveitando
 * a textura ja normalizada, com o mesmo acabamento fosco de plastico
 * (roughness 0.7 / metalness 0.05) que a TV usa. Nao e sistema novo: e a
 * mesma funcao de 20 linhas do outro arquivo, e o material passa a ser o
 * mesmo tipo de todo o resto do jogo (ver materials/material-library.js),
 * iluminado pelas luzes da casa como as outras seis pecas do comodo.
 *
 * `side` e PRESERVADO na troca (o material do arquivo vem `doubleSided`)
 * e isso aqui NAO e detalhe cosmetico: a face lateral esquerda do modelo
 * (a de x = -0.305) veio com a normal e o winding invertidos no arquivo,
 * apontando para DENTRO da caixa. Com DoubleSide o three.js desenha essa
 * face de qualquer jeito e inverte a normal dela na iluminacao
 * (`gl_FrontFacing`), entao ela acende igual as outras cinco; com
 * FrontSide o microondas ficaria com um buraco do lado esquerdo. A
 * geometria segue INTOCADA (a mesma politica das outras pecas: 24
 * vertices, 12 triangulos, ninguem reexportou nada).
 *
 * ---------- Geometria crua: nada de Draco ----------
 * Primeira das SETE pecas da COZINHA que NAO usa Draco: a geometria chega
 * crua (24 vertices / 12 triangulos - e uma caixa texturizada, no melhor
 * estilo PS1), entao esta fabrica nao acopla DRACOLoader nenhum e nao tem
 * lista de fontes de decodificador. O <script> do DRACOLoader continua em
 * index.html por causa das outras seis, e nada de novo precisou entrar la
 * por causa desta peca - o loader aqui e o GLTFLoader puro, igual ao de
 * models/tv-factory.js e models/clock-factory.js.
 *
 * Se o arquivo nao chegar (caminho errado, asset faltando), o microondas
 * simplesmente nao aparece: a falha vai para o console e o boot continua
 * identico - o grupo devolvido por createMicrowave() nasce vazio e e
 * preenchido de forma assincrona, mesmo comportamento de todos os outros
 * modelos importados.
 *
 * ---------- Convencao de espaco local ----------
 * Mesma convencao "centralizada" das outras seis pecas da COZINHA (objeto
 * apoiado numa superficie), e nao a "Z = 0 e a parede" dos moveis de
 * encostar:
 *   - X = 0 e Z = 0 sao o CENTRO da base do microondas;
 *   - Y = 0 e a base (o pe da peca);
 *   - a "frente" (porta de vidro + painel de botoes) olha para +Z, mesma
 *     convencao de frente do resto do jogo (ver DoorFactory).
 *
 * Origem no centro da base porque o usuario avisou que pode querer mudar
 * a posicao pelo Editor depois: assim o gizmo gira a peca NO LUGAR, em
 * vez de varrer ela para fora da parede. Quem encosta o microondas na
 * parede e scenes/side-room-scene.js, que recebe largura/profundidade
 * finais (`width`/`depth` do retorno) para descontar a metade certa.
 * -------------------------------------------------
 */

window.MicrowaveFactory = (function () {
  const MODEL_URL = "assets/models/microwave_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Mesma ideia das outras seis pecas da COZINHA: a bounding box de
  // `gltf.scene`, ou seja, JA com a hierarquia de nos resolvida pelo
  // GLTFLoader. Aqui essa hierarquia da em NADA, e isso e proposital de
  // quem exportou: o arquivo tem a cadeia classica do Sketchfab
  // (Sketchfab_model -> root -> GLTF_SceneRootNode -> psx-microwave-col_0
  // -> Object_4) com DUAS matrizes de conversao de eixo que se ANULAM
  // (-90 graus em X no primeiro no, +90 graus em X no terceiro). O
  // produto e a identidade, a menos de um epsilon de 2.2e-16, entao as
  // medidas cruas do accessor de POSITION ja SAO as medidas que o jogo
  // ve - nao existe ROTATED_* aqui como no botijao, na geladeira, na mesa,
  // na pia e na prateleira.
  //
  // Medidas tiradas do proprio arquivo (o glTF obriga o accessor de
  // POSITION a trazer min/max):
  //   X (largura):      -0.30539 a 0.30539 -> 0.611
  //   Y (altura):        0.0     a 0.37586 -> 0.376
  //   Z (profundidade): -0.18793 a 0.18793 -> 0.376
  const NATIVE_MIN_X = -0.3053891658782959;
  const NATIVE_MAX_X = 0.3053891658782959;
  const NATIVE_MIN_Y = 0;
  const NATIVE_MAX_Y = 0.37586355209350586;
  const NATIVE_MIN_Z = -0.18793177604675293;
  const NATIVE_MAX_Z = 0.18793177604675293;

  const NATIVE_CENTER_X = (NATIVE_MIN_X + NATIVE_MAX_X) / 2;
  const NATIVE_CENTER_Z = (NATIVE_MIN_Z + NATIVE_MAX_Z) / 2;

  // ---------- Escala ----------
  // Sem reescala (MODEL_SCALE = 1), como no FOGAO e na PRATELEIRA: o
  // arquivo chegou em metros e ja em medida de eletrodomestico de
  // verdade - 0.61 de largura por 0.38 de altura e 0.38 de profundidade e
  // exatamente um microondas grande de bancada. Os outros quatro casos
  // (botijao, geladeira, mesa e pia) precisaram de TARGET_HEIGHT porque
  // chegaram pequenos demais; este nao.
  //
  // Referencias do proprio jogo para conferir que fecha: a bancada da pia
  // ao lado (SinkCabinetFactory, 0.9 de altura) e o fogao
  // (StoveFactory, 0.92) - o microondas lendo menos da metade da altura
  // deles e a proporcao certa de um aparelho que normalmente fica EM CIMA
  // de uma bancada dessas.
  const MODEL_SCALE = 1;

  // ---------- Para onde a frente do modelo olha ----------
  // Aqui NAO foi chute (diferente do fogao, que precisou deduzir pela
  // camera do preview): a frente e conhecida. As seis faces da caixa usam
  // regioes diferentes do atlas 256x256 embutido no .glb, e a regiao da
  // face +Z (UV u 0.00-0.51, v 0.00-0.33) e a que traz a porta de vidro
  // escuro com o painel de botoes ao lado; a face -Z traz a grade de
  // ventilacao e a etiqueta da traseira. Ou seja: a frente cai em +Z, que
  // por sorte e a MESMA convencao das outras seis pecas da COZINHA.
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
  // solido de colisao, do mesmo jeito que StoveFactory/FridgeFactory/
  // SinkCabinetFactory/ShelfFactory .width/.height/.depth. Sao as medidas
  // da BOUNDING BOX: 0.61 x 0.38 de base, 0.38 de altura.
  const FINAL_WIDTH = (NATIVE_MAX_X - NATIVE_MIN_X) * MODEL_SCALE;
  const FINAL_HEIGHT = (NATIVE_MAX_Y - NATIVE_MIN_Y) * MODEL_SCALE;
  const FINAL_DEPTH = (NATIVE_MAX_Z - NATIVE_MIN_Z) * MODEL_SCALE;

  // Recentraliza a peca para a convencao do comentario do topo: X e Z no
  // centro da base, Y com a base no chao. Neste arquivo os tres dao ZERO
  // (o modelo ja chegou centrado em X/Z e com a base em y = 0), mas a
  // conta fica escrita igual as outras seis fabricas: e ela que garante
  // que trocar o .glb por outra versao do modelo nao vai enterrar a peca
  // no chao nem desalinhar o encosto na parede. Com MODEL_YAW = Math.PI o
  // giro inverte X e Z, entao o deslocamento inverte de sinal junto.
  const MODEL_POSITION_X =
    (YAW_FLIPPED ? NATIVE_CENTER_X : -NATIVE_CENTER_X) * MODEL_SCALE;
  const MODEL_POSITION_Y = -NATIVE_MIN_Y * MODEL_SCALE;
  const MODEL_POSITION_Z =
    (YAW_FLIPPED ? NATIVE_CENTER_Z : -NATIVE_CENTER_Z) * MODEL_SCALE;

  // Nome da malha de dentro do modelo. O arquivo chama a malha de
  // "Object_4" e os nos intermediarios de "Sketchfab_model" / "root" /
  // "GLTF_SceneRootNode" / "psx-microwave-col_0" (nomes genericos do
  // exportador, que apareceriam assim no painel de hierarquia do Editor).
  // Renomear na hora de carregar deixa a arvore legivel e o id do Editor
  // estavel e com significado - ver "Identidade dos objetos" em
  // editor/README.md e o dicionario NAME_LABELS de
  // editor/editor-registry.js. Nao muda o arquivo em disco e nao muda
  // geometria nenhuma.
  const MESH_NAME = "microwave_psx";

  // Loader unico e reaproveitado entre chamadas - mesma ideia das outras
  // fabricas (hoje existe um microondas so). Sem DRACOLoader: a geometria
  // deste arquivo e crua, ver o comentario do topo.
  let sharedLoader = null;

  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  // Mesmo ajuste de textura usado nas outras seis pecas da COZINHA:
  // filtro "nearest" e sem mipmap para o pixel "cru" do visual PSX, e
  // encoding linear para ficar consistente com o resto do jogo (que nao
  // usa sRGBEncoding em nenhuma outra textura).
  //
  // O sampler que veio no .glb ja pede NEAREST/NEAREST, entao aqui isso e
  // cinto e suspensorio - de proposito: se um dia a textura for trocada
  // por outra que peca LINEAR/mipmap (foi o caso da mesa de frutas), a
  // peca continua pixelada como o resto do jogo sem ninguem precisar
  // lembrar deste detalhe.
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
  // models/tv-factory.js (o primeiro modelo do jogo com esse problema),
  // com os mesmos numeros de acabamento. Ver o bloco "Material unlit" no
  // comentario do topo para o porque.
  //
  // Roda DEPOIS de normalizeTextures de proposito: a textura ja sai dali
  // com nearest/sem mipmap/encoding linear e e reaproveitada como esta
  // (`map: mat.map`), sem recarregar nada. `side` e preservado porque o
  // material do arquivo vem doubleSided - e o modelo DEPENDE disso (a face
  // lateral esquerda dele veio com a normal invertida, ver o topo).
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
        // MESH_NAME). Aqui a malha JA vem com nome ("Object_4"), diferente
        // do caso da prateleira, entao a renomeacao e incondicional para
        // as malhas - e deterministica, ou seja, o id que o Editor guarda
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
        console.error("MicrowaveFactory: falha ao carregar " + MODEL_URL, error);
      }
    );
  }

  function createMicrowave() {
    const group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala que o usuario fizer (ver
    // "Identidade dos objetos" em editor/README.md, item 2). Sem nome, o
    // id sairia de uma assinatura estrutural - que tambem funciona, mas
    // muda se a peca for reposicionada no codigo.
    group.name = "MicrowavePSX";

    loadInto(group);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
    };
  }

  return { createMicrowave: createMicrowave };
})();
