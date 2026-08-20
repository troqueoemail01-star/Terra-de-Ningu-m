/**
 * scripts/main.js
 * -------------------------------------------------
 * Inicializa o jogo e roda o loop principal. O menu principal
 * (ver menu/menu.js) é a primeira tela exibida ao abrir o jogo;
 * só depois que o jogador toca em "NOVO JOGO" a cutscene de
 * abertura na estrada (ver cutscenes/road-cutscene.js) toca
 * automaticamente e, assim que termina, a gameplay (o corredor) é
 * carregada na hora — sem nenhuma tela intermediária. Ver o disparo no fim
 * deste arquivo.
 * -------------------------------------------------
 */

window.Game = {
  /**
   * `options.editor = true` abre a MESMA gameplay de sempre, com os
   * mesmos cenários, a mesma câmera e o mesmo renderer, só que sem
   * entregar o controle ao jogador: quem assume é o modo Editor (ver
   * editor/editor-mode.js). Nenhum caminho do jogo normal muda por
   * causa disso — sem `options`, este arquivo se comporta exatamente
   * como antes do Editor existir.
   */
  start: function (options) {
    const editorMode = !!(options && options.editor);
    const config = window.CorridorConfig;

    // Resolução interna baixa de propósito (16:9) — é o que dá o "pixel
    // cru" do PS1. A tela final é ampliada via CSS (image-rendering:
    // pixelated), então isso não afeta o tamanho visual em nenhum aparelho.
    const INTERNAL_WIDTH = 320;
    const INTERNAL_HEIGHT = 180;

    const container = document.getElementById("game-container");
    const canvas = document.getElementById("game-canvas");

    // ---------- Cena, câmera, renderer ----------
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      68,
      INTERNAL_WIDTH / INTERNAL_HEIGHT,
      0.05,
      50
    );

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
    });
    renderer.setPixelRatio(1);
    // updateStyle = false: mantém o tamanho em CSS controlado pelo
    // layout (100% do container), só o buffer interno é pequeno.
    renderer.setSize(INTERNAL_WIDTH, INTERNAL_HEIGHT, false);

    // ---------- Atmosfera (névoa + cor de fundo) ----------
    // Ver scripts/atmosphere.js: dono único de `scene.fog` e da cor de
    // fundo do renderer, com uma paleta de noite e uma de dia. Já
    // aplica a da NOITE aqui (mesma névoa escura curta que estava
    // escrita solta neste arquivo antes) — nada muda antes de o
    // jogador dormir. A paleta de dia entra em `atmosphere.setMorning()`,
    // chamada pela sequência de dormir com a tela preta, junto de
    // `room.setMorning()`/`corridor.setMorning()` (ver
    // cutscenes/sleep-sequence.js e playSleepSequence() mais abaixo).
    const atmosphere = window.Atmosphere.create(scene, renderer);

    // ---------- Pós-processamento (Motion Blur) ----------
    // Desfoque sutil, ligado apenas à velocidade com que a câmera gira
    // (ver efeitos/motion-blur.js). Roda na mesma resolução interna
    // baixa acima, então não interfere na estética PSX — só adiciona
    // um passe extra de composição antes de exibir o quadro.
    const motionBlur = window.MotionBlur.create(
      renderer,
      INTERNAL_WIDTH,
      INTERNAL_HEIGHT
    );

    // ---------- Luz ----------
    // Luz ambiente muito fraca — o corredor deve ser escuro,
    // com a luminária de teto como praticamente a única fonte de luz.
    const ambient = new THREE.AmbientLight(0x141018, 0.35);
    scene.add(ambient);

    // ---------- Cenário ----------
    const materials = window.MaterialLibrary.build(
      config,
      window.RoomConfig,
      window.HouseConfig
    );
    // ---------- A CASA: um mundo, duas zonas ----------
    // Antes desta atualizacao, os dois cenarios se REVEZAVAM na cena:
    // o corredor saia de `scene` e o quarto entrava no lugar quando o
    // jogador atravessava a porta (a antiga enterRoom()). Por isso,
    // estando no corredor, o quarto simplesmente nao existia
    // visualmente - e vice-versa.
    //
    // Agora existe UMA casa so: os dois sao construidos pelos MESMOS
    // arquivos de sempre e ficam os DOIS dentro da cena ao mesmo tempo,
    // cada um no seu lugar do mundo (ver scenes/house-config.js):
    //
    //   worldRoot (MUNDO DA CASA)
    //     +-- corridor.root  (ZONA_CORREDOR,   z de -22 a 0)
    //     +-- room.root      (ZONA_MEU_QUARTO, z de 0 a +6)
    //
    // Do corredor da para olhar pela porta e ver o quarto de verdade
    // (chao, paredes, cama, abajur, guarda-roupa, TV...), e de dentro do
    // quarto da para olhar pela MESMA porta e ver o corredor. Nenhuma
    // troca de cena, nenhum fade: e uma casa.
    //
    // A separacao interna continua inteira: duas cenas, duas listas de
    // interativos, duas de colisao, dois `update`, cada zona com a
    // logica dela. Quem costura as duas num mundo unico e
    // scripts/house-world.js.
    const corridor = window.CorridorScene.build(config, materials);

    // O quarto recebe (1) onde ele fica dentro da casa, (2) o vao da
    // porta a ser recortado na parede de entrada dele - a MESMA porta do
    // corredor, que passa a ser a divisoria fisica entre os dois - e (3)
    // o aviso de que o ceu e compartilhado (um so para a casa toda).
    // Ver o comentario de borda no topo de scenes/room-scene.js.
    const room = window.RoomScene.build(window.RoomConfig, materials, {
      placement: window.HouseConfig.zones.quarto.placement,
      entryDoorway: {
        width: window.DoorFactory.OPENING_WIDTH,
        height: window.DoorFactory.OPENING_HEIGHT,
        // Espessura da divisoria, nao a profundidade crua da moldura:
        // e o mesmo numero que o corredor usa para centrar a moldura
        // (ver PARTITION_DEPTH em models/door-factory.js). Com
        // FRAME_DEPTH, a parede de entrada do quarto caia 2 cm dentro da
        // madeira e a porta aparecia enterrada na parede.
        inset: window.DoorFactory.PARTITION_DEPTH,
      },
      sharedSky: true,
    });

    // ---------- Os quatro comodos novos ----------
    // QUARTO 01, QUARTO 02, COZINHA e BANHEIRO (ver
    // scenes/side-room-scene.js): a expansao desta atualizacao. Sao
    // ZONAS da casa como qualquer outra - a diferenca e que os quatro
    // saem do MESMO construtor, porque sao a mesma caixa arquitetonica
    // em quatro lugares diferentes.
    //
    // Cada um se liga ao corredor pela porta que ja existia na parede
    // dele (ver `passages` em scenes/corridor-config.js e `sideRooms` em
    // scenes/house-config.js): a porta virou a divisoria fisica entre os
    // dois, com o vao recortado de verdade na parede - exatamente o que
    // a porta "MEU QUARTO" ja fazia. Nada aqui sabe o nome de nenhum
    // deles: acrescentar um quinto comodo no futuro e uma entrada em
    // `sideRooms`, e mais nada.
    const sideRooms = ((window.HouseConfig && window.HouseConfig.sideRooms) || []).map(
      function (roomDef) {
        return window.SideRoomScene.build(roomDef, materials, {
          corridorConfig: config,
        });
      }
    );

    // ---------- Telhado ----------
    // A casca externa da casa, construida DEPOIS dos comodos porque e
    // deles que ela tira as medidas (ver models/roof-factory.js): a
    // planta vem de CorridorConfig/RoomConfig/HouseConfig, os mesmos
    // dados que acabaram de montar corredor, MEU QUARTO e os quatro
    // comodos laterais. Nao tem colisao nem interacao nenhuma: e
    // geometria puramente visual, sempre acima do forro de todos os
    // comodos.
    const roof = window.RoofFactory.build(materials, {
      corridorConfig: config,
      roomConfig: window.RoomConfig,
      houseConfig: window.HouseConfig,
    });

    // Todos pendurados no mesmo grupo, e o grupo na cena: daqui para
    // frente nada mais entra ou sai de `scene` por causa de troca de
    // ambiente.
    const worldRoot = new THREE.Group();
    worldRoot.add(corridor.root);
    worldRoot.add(room.root);
    sideRooms.forEach(function (sideRoom) {
      worldRoot.add(sideRoom.root);
    });
    worldRoot.add(roof.root);
    scene.add(worldRoot);

    // Registro das zonas: soma as listas de colisao/interacao das duas
    // (o jogador anda pela casa inteira), roda o `update` das duas a
    // cada quadro e sabe dizer em qual comodo um ponto do mundo esta.
    const world = window.HouseWorld.create({
      zones: [
        {
          key: "corredor",
          label: window.HouseConfig.zones.corredor.label,
          scene: corridor,
          // O corredor e a zona de referencia da casa (fica na origem,
          // sem giro), entao as coordenadas dele SAO as do mundo.
          bounds: {
            minX: -config.width / 2,
            maxX: config.width / 2,
            minZ: -config.length,
            maxZ: 0,
          },
        },
        {
          key: "quarto",
          label: window.HouseConfig.zones.quarto.label,
          scene: room,
          // Calculado pela propria cena a partir do placement dela.
          bounds: room.bounds,
        },
      ].concat(
        // Os quatro comodos novos, cada um com o retangulo que ocupa no
        // mundo (calculado pela propria cena, ver
        // scenes/side-room-scene.js). Entram na mesma lista das outras
        // zonas, entao colisao, interacao, som de passos e "em que comodo
        // o jogador esta" passam a valer neles sem nenhum caso especial.
        sideRooms.map(function (sideRoom) {
          return {
            key: sideRoom.key,
            label: sideRoom.label,
            scene: sideRoom,
            bounds: sideRoom.bounds,
          };
        })
      ),
    });

    // ---------- Colisao que acompanha o objeto ----------
    // Cada caixa de colisao tira aqui o retrato do dono dela (ver
    // bindSolids em scripts/collision.js). Precisa ser NESTE ponto: os
    // cenarios acabaram de ser montados com os valores dos arquivos - os
    // mesmos de que as caixas foram calculadas - e as alteracoes salvas
    // do Editor (mover, girar, escalar, duplicar) so entram no bloco
    // seguinte. Dai para frente, movel movido leva a colisao dele junto,
    // em vez de deixar uma parede invisivel no lugar antigo e virar um
    // movel atravessavel no lugar novo.
    //
    // Duas listas por cenario, porque sao duas caixas diferentes para o
    // mesmo movel: a do MUNDO (que o jogador usa) e a LOCAL do comodo
    // (que a fisica da bola de futebol usa, ver scripts/ball-controller.js).
    // A local vem acompanhada da conversao da zona, senao um empurrao no
    // eixo X do mundo iria para o eixo errado dentro do comodo girado.
    window.Collision.bindSolids(world.solids);
    world.zones.forEach(function (zone) {
      const zoneScene = zone.scene;
      if (!zoneScene || !zoneScene.localSolids) return;
      if (zoneScene.localSolids === zoneScene.solids) return;
      window.Collision.bindSolids(zoneScene.localSolids, {
        space: zoneScene.transform || null,
      });
    });

    // ---------- Poeira suspensa no ar ----------
    // Partículas minúsculas flutuando dentro dos seis cômodos internos
    // (ver effects/dust-motes.js): detalhe de ambientação, no mesmo
    // mundo 3D e no mesmo renderer de tudo o mais. Nasce DEPOIS de
    // `world` de propósito: o volume de poeira de cada cômodo é o
    // próprio retângulo que a zona ocupa (`zone.bounds`), encolhido
    // pelas paredes — é o que garante que a poeira nunca atravessa
    // parede nem aparece fora da casa. Um cômodo novo no futuro ganha
    // a poeira dele só por existir na lista de zonas: nada aqui sabe o
    // nome de nenhum deles.
    //
    // `fog` e `ambientLight` são lidos por quadro, então a poeira
    // acompanha noite/dia e o piscar das luminárias sozinha, sem a
    // sequência de dormir nem o Editor precisarem avisá-la.
    const dust = window.DustMotes.create({
      zones: world.zones,
      parent: worldRoot,
      height: config.height,
      fog: scene.fog,
      ambientLight: ambient,
      lightRoot: worldRoot,
    });

    // ---------- Camada de edição (alterações salvas) ----------
    // Roda SEMPRE, no jogo normal também — é o passo 3 do esquema
    // "arquivos originais + alterações salvas = cenário do jogador"
    // (ver editor/editor-overrides.js). Os cenários acima já estão
    // montados com os valores originais; aqui o registro fotografa
    // esses valores e, em seguida, aplica por cima o que estiver
    // salvo. Se não houver nada salvo, nada acontece e o jogo é
    // exatamente o de antes.
    //
    // As chamadas atrasadas existem por causa dos modelos .glb:
    // eles entram na cena depois do boot, então o registro volta a
    // varrer a árvore algumas vezes e aplica neles o que estava
    // esperando. Depois disso, nada mais roda por quadro.
    window.EditorRegistry.nameMaterials(materials);
    window.EditorRegistry.registerScene("corredor", "Corredor", corridor.root, corridor.interactables);
    window.EditorRegistry.registerScene("quarto", "Meu Quarto", room.root, room.interactables);
    sideRooms.forEach(function (sideRoom) {
      window.EditorRegistry.registerScene(
        sideRoom.key,
        sideRoom.label,
        sideRoom.root,
        sideRoom.interactables
      );
    });
    window.EditorRegistry.registerScene("telhado", "Telhado", roof.root, []);

    function applySavedEdits() {
      try {
        window.EditorRegistry.sync();
        // Cópias feitas no Editor (DUPLICAR): passam a existir aqui,
        // ANTES do delta ser aplicado, porque elas são objetos como
        // quaisquer outros e têm delta próprio. Como isto roda no jogo
        // normal também, o que foi duplicado aparece para o jogador (ver
        // editor/editor-clones.js). Uma cópia cuja origem é um modelo
        // .glb nasce na passada em que o modelo termina de carregar.
        window.EditorClones.materializeAll();
        // Modelo .glb que acabou de entrar na arvore: a caixa de colisao
        // dele tira o retrato AGORA, com o modelo ainda nos valores de
        // fabrica, antes de as alteracoes salvas entrarem na linha de
        // baixo - e o que separa "a peca cresceu" de "a peca foi movida"
        // (ver absorbOwners em scripts/collision.js).
        window.Collision.absorbOwners();
        window.EditorRegistry.applyAll();
      } catch (e) {
        // Uma alteração salva NUNCA pode impedir o jogo de abrir.
      }
    }

    window.EditorOverrides.init(applySavedEdits);
    applySavedEdits();
    // As passadas vao mais longe do que iam (era ate 5s) porque os
    // modelos .glb pesados de um celular carregando por 3G/arquivo local
    // chegam depois disso - e cada copia so nasce na passada em que o
    // modelo da origem dela terminou de chegar (ver
    // editor/editor-clones.js). Sao varreduras baratas e param sozinhas:
    // quando nao ha mais nenhuma copia pendente, as passadas seguintes
    // nao fazem nada.
    [400, 1200, 2500, 5000, 8000, 12000, 20000].forEach(function (ms) {
      setTimeout(function () {
        // Nada pendente e nada novo para varrer: nao custa nem esta
        // varredura.
        try {
          if (window.EditorClones.pendingCount() === 0 && window.EditorRegistry.sync() === 0) {
            return;
          }
        } catch (e) {
          /* na duvida, faz a passada normal */
        }
        applySavedEdits();
      }, ms);
    });

    // ---------- Colisao solta: faxina definitiva ----------
    // As caixas de colisao que ficaram soltas no vazio - as AZUIS da vista
    // de COLISAO do Editor, colisao de coisa que nao esta mais no jogo -
    // ja nao barravam ninguem, mas continuavam na lista. Aqui elas saem
    // dela de vez (ver purgeGhosts em scripts/collision.js). Roda no jogo
    // normal tambem, e nao so com o Editor aberto.
    //
    // DEPOIS das passadas de cima, de proposito: uma caixa so conta como
    // solta se o dono dela ja tem desenho e o desenho nao encosta nela - e
    // boa parte da mobilia e .glb, que chega ao longo dos primeiros
    // segundos. Varrer antes disso apagaria a colisao de um movel que ainda
    // estava carregando. As varreduras repetidas cobrem o celular lento: a
    // caixa precisa estar solta ha mais de um segundo para cair.
    [7000, 10000, 15000, 23000].forEach(function (ms) {
      setTimeout(function () {
        try {
          window.Collision.purgeGhosts();
        } catch (e) {
          /* faxina de colisao nunca pode derrubar o jogo */
        }
      }, ms);
    });

    // ---------- Zona de luz de cada comodo ----------
    // As luminarias de teto sao PointLight e o jogo nao usa shadow map,
    // entao, sem isto, a claridade de uma delas atravessa a parede e
    // aparece no comodo vizinho (era o caso da varanda, cuja luz se via do
    // corredor). Cada zona registra aqui a caixa que ocupa, em
    // coordenadas do MUNDO, e o shader passa a so aceitar luz de dentro da
    // propria caixa - ver materials/light-zones.js.
    //
    // O retangulo e o MESMO `zone.bounds` que a colisao, o som de passos e
    // a poeira ja usam (calculado por cada cena a partir do placement
    // dela): comodo novo no futuro ganha a zona de luz dele so por existir
    // na lista, sem nenhuma linha aqui. A altura vai do piso ao forro (o
    // pe-direito e o mesmo em toda a casa, ver CorridorConfig.height).
    window.LightZones.reset();
    world.zones.forEach(function (zone) {
      const zoneBounds = zone.bounds;
      if (!zoneBounds) {
        return;
      }
      window.LightZones.add({
        minX: zoneBounds.minX,
        maxX: zoneBounds.maxX,
        minY: -0.1,
        maxY: config.height,
        minZ: zoneBounds.minZ,
        maxZ: zoneBounds.maxZ,
      });
    });

    // A varanda tem luminaria propria e nao e uma zona da casa (e area
    // externa): a caixa dela vem do proprio corredor, derivada da planta
    // da varanda (ver `lightZone` no fim de scenes/corridor-scene.js).
    if (corridor.lightZone) {
      window.LightZones.add(corridor.lightZone);
    }

    // Os materiais precisam ser patcheados uma vez cada. A varredura
    // repete nos mesmos instantes da camada de edicao e pelo mesmo motivo:
    // boa parte da mobilia vem de .glb e entra na cena depois do boot, com
    // material proprio. Material ja patcheado e ignorado na hora.
    function applyLightZones() {
      window.LightZones.applyTo(scene);
    }
    applyLightZones();
    [400, 1200, 2500, 5000].forEach(function (ms) {
      setTimeout(applyLightZones, ms);
    });

    // ---------- HUD / controles de toque ----------
    window.HUD.init(container);

    // ---------- Colisao: a casa inteira ----------
    // Uma lista so, com os solidos das DUAS zonas somados (ver
    // scripts/house-world.js): o jogador anda pela casa inteira, entao
    // nao existe mais "trocar a lista de colisao ao mudar de ambiente" -
    // era isso que a antiga enterRoom()/exitRoom() fazia. E a referencia
    // que o PlayerController guarda, e ela nunca e esvaziada.
    //
    // Os OBJETOS de dentro dele sao os mesmos das cenas (nenhuma copia),
    // entao caixas que a propria cena atualiza por quadro continuam
    // valendo aqui - hoje, a da folha da porta compartilhada, que libera
    // o vao quando ela abre (ver scenes/corridor-scene.js).
    // Antes isto era uma COPIA da lista (slice). Agora e a propria lista
    // do mundo, de proposito: uma copia feita no Editor ganha a caixa de
    // colisao dela em tempo de execucao (ver mirrorSolids em
    // scripts/collision.js) e precisa entrar justamente na lista que o
    // PlayerController esta segurando - com o slice, a caixa da copia
    // nascia numa lista que ninguem mais consultava.
    const activeSolids = world.solids;

    // ---------- Jogador ----------
    const player = window.PlayerController.create(camera, config, activeSolids);

    // ---------- Som de passos ----------
    // Ver audio/footstep-audio.js: decide sozinho a hora exata de
    // cada passo (cruzando o mesmo relógio de fase do head bob da
    // câmera) e qual som tocar, a partir da superfície devolvida por
    // `activeSceneSurface` abaixo. `footsteps.update(...)` é chamado
    // uma vez por quadro, lá no fim deste arquivo (função tick()).
    const footsteps = window.FootstepAudio.create();

    // ---------- Som das cortinas ----------
    // Ver audio/curtain-audio.js: o som em si é disparado lá de
    // dentro de models/window-factory.js (no toggleCurtain de cada
    // janela), então aqui só registramos a câmera como "ouvinte" —
    // é o que permite o efeito soar do lado certo e um pouco mais
    // baixo conforme a distância até a janela, em vez de sempre
    // colado no ouvido do jogador.
    if (window.CurtainAudio && typeof window.CurtainAudio.setListener === "function") {
      window.CurtainAudio.setListener(camera);
    }

    // ---------- Ouvinte do toque do telefone ----------
    // Mesmo registro acima, agora para o toque da segunda ligação (ver
    // startIncomingPhoneCall() mais abaixo e audio/phone-audio.js): o
    // telefone toca sozinho por um bom tempo, com o jogador andando
    // pelo corredor, então o som precisa sair da escrivaninha (com
    // lado, distância e abafamento reavaliados a cada quadro) em vez
    // de soar colado no ouvido dele. Os sons da PRIMEIRA ligação não
    // mudam: eles tocam com a tela preta, com o jogador "no telefone",
    // então continuam centralizados de propósito.
    if (window.PhoneAudio && typeof window.PhoneAudio.setListener === "function") {
      window.PhoneAudio.setListener(camera);
    }

    // Superficie sob o jogador (madeira/tapete) para o som de passos:
    // pergunta ao mundo, que repassa para a zona em que o jogador esta
    // neste instante (ver getSurfaceAt em scripts/house-world.js). Antes
    // isso era uma variavel que trocava de valor na troca de cenario;
    // agora e sempre a mesma funcao, e ela sozinha ja sabe se o pe do
    // jogador esta no corredor ou no quarto.
    const activeSceneSurface = world.getSurfaceAt;

    // ---------- Mini cutscene de entrada ----------
    // O jogador já nasce no lugar certo (em frente à porta "ENTRADA &
    // SAÍDA"), mas o controle só é entregue depois da animação de
    // câmera "acordando" + diálogo inicial de Kael (ver
    // cutscenes/entry-sequence.js). Bloqueia controles/HUD já aqui,
    // antes do primeiro quadro, para não haver nenhum flash de HUD ou
    // frame com controle liberado antes da cutscene começar.
    // No modo Editor não existe "acordar": a ferramenta assume a
    // câmera direto (ver o bloco do Editor mais abaixo).
    if (!editorMode) {
      window.EntrySequence.play(player, container);
    }

    // Sistema unico de interacao: a cada quadro, decide qual objeto (se
    // algum) esta sob a mira central do jogador e dentro do alcance -
    // porta, cortina de janela, gaveta, telefone, interruptor, cama,
    // abajur, bola... todos na mesma lista.
    //
    // Com a casa num mundo so, a lista tambem e uma so: os interativos
    // das DUAS zonas ficam sempre disponiveis (ver
    // scripts/house-world.js). Nao ha custo escondido nisso - o
    // InteractionSystem descarta por distancia antes de qualquer
    // raycast (config.interactionRange = 2.4), entao o que esta no outro
    // comodo nunca chega a ser testado de verdade.
    const activeInteractables = world.interactables.slice();

    // Objeto EXCLUÍDO no Editor (ver editor/editor-registry.js) não pode
    // continuar interativo: sem isto, uma porta apagada continuaria
    // abrindo e um telefone apagado continuaria tocando, os dois
    // invisíveis. Entregar a lista viva aqui resolve para o jogo normal e
    // para o Editor de uma vez - é a MESMA lista que o InteractionSystem
    // varre por quadro. Roda mesmo sem nada excluído (aí não faz nada).
    window.EditorRegistry.setInteractableList(activeInteractables);

    const interaction = window.InteractionSystem.create(
      activeInteractables,
      config.interactionRange
    );

    // ---------- Objetivos / progresso da história ----------
    // Decide, a cada tentativa de interação, se o objeto em destaque
    // funciona normalmente ou responde com diálogo (ver
    // objectives/objective-config.js e objectives/objective-system.js).
    // O primeiro objetivo do jogo já nasce ativo aqui: "Interagir com
    // o telefone".
    const objectives = window.ObjectiveSystem.create(window.ObjectiveConfig);

    // Enquanto uma dessas falas de bloqueio está na tela, novos toques
    // em "Interagir" são ignorados — evita empilhar mais de uma caixa
    // de diálogo se o jogador apertar o botão várias vezes seguidas.
    let dialogueActive = false;

    // Toca a resposta curta de um objeto bloqueado, reaproveitando
    // exatamente a mesma caixa de diálogo da mini cutscene de entrada
    // (mesma fonte, cores e digitação — ver dialogue/dialogue-box.js).
    // A própria caixa já esconde o HUD inteiro enquanto está na tela
    // e devolve assim que é fechada (regra fixa de dialogue-box.js);
    // aqui só travamos olhar/movimento do jogador, igual à cutscene
    // de entrada, para não competir com o próprio toque de avançar o
    // diálogo — a exploração livre volta assim que ela fecha.
    function playBlockedDialogue(dialogueKey) {
      const lines = window.DialogueConfig[dialogueKey];
      if (!lines) {
        return;
      }
      dialogueActive = true;
      player.setControlsEnabled(false);

      const box = window.DialogueBox.create(container);
      box.show();
      box.playSequence(lines, function () {
        box.hide();
        player.setControlsEnabled(true);
        dialogueActive = false;
      });
    }

    // ---------- Carta do Ravi (etapa "LER A CARTA DO RAVI") ----------
    // Este bloco só costura peças que vivem em arquivos próprios (ver
    // o comentário no topo de cada um): a gaveta da escrivaninha
    // (models/desk-factory.js), o pop-up de itens dela
    // (interface/drawer-popup.js), o inventário do HUD
    // (interface/inventory.js), a carta na mão direita
    // (scripts/hand-item.js) e o pop-up de leitura com o modelo 3D
    // (interface/note-reader.js + models/note-viewer.js). Nenhum
    // sistema paralelo: a casca dos dois pop-ups é a mesma
    // (interface/popup.js), o botão de interação é o mesmo do HUD, a
    // fonte é a mesma dos diálogos e o esconde-HUD segue a mesma
    // regra fixa de dialogue/dialogue-box.js.
    //
    // Fluxo completo: gaveta -> pop-up com os itens -> escolher a
    // carta -> carta no inventário -> tocar no ícone -> carta na mão
    // direita -> "Interagir" -> pop-up de leitura (modelo 3D à
    // esquerda, texto à direita) -> "Fechar" -> volta ao gameplay.
    // Nada além disso: nenhum objetivo novo é criado depois da
    // leitura, de propósito (ver objectives/objective-config.js).

    // Ícone da carta no inventário e na lista da gaveta: a MESMA arte
    // usada pelo modelo 3D, com o pacote base64 como reserva para o
    // jogo aberto em file:// (ver applyIcon em
    // interface/inventory.js).
    const NOTE_ICON = "assets/pictures/nota-infectados-256.png";
    const NOTE_ICON_EMBEDDED = "frente256";
    const NOTE_ITEM_ID = "carta-ravi";
    const NOTE_ITEM_NAME = "Carta do Ravi";

    const handItem = window.HandItem.create(camera, scene);
    const drawerPopup = window.DrawerPopup.create(container);
    const noteReader = window.NoteReader.create(container);

    // Trava/destrava o gameplay do mesmo jeito que a caixa de diálogo
    // já fazia: olhar/movimento parados e o botão "Interagir"
    // ignorado enquanto o pop-up está na tela (o HUD em si é
    // escondido pela própria casca do pop-up). Ao fechar, tudo volta
    // exatamente ao estado anterior.
    function lockForPopup() {
      dialogueActive = true;
      player.setControlsEnabled(false);
    }

    function unlockFromPopup() {
      player.setControlsEnabled(true);
      dialogueActive = false;
    }

    // Guarda de uma vez só, mesmo princípio de phoneCallStarted /
    // sleepSequenceStarted mais abaixo: a carta só sai da gaveta uma
    // vez.
    let letterTaken = false;

    // Interagir com a gaveta na etapa da carta: ela abre de verdade
    // (mesma animação de sempre) e, junto, aparece o pop-up discreto
    // com o que está lá dentro.
    function openDrawerPopup(drawer) {
      if (drawer.openDrawer) {
        drawer.openDrawer();
      }
      lockForPopup();

      const hasNote = !!(drawer.hasNote && drawer.hasNote());
      drawerPopup.open({
        itens: hasNote
          ? [
              {
                id: NOTE_ITEM_ID,
                nome: NOTE_ITEM_NAME,
                icone: NOTE_ICON,
                iconeEmbutido: NOTE_ICON_EMBEDDED,
              },
            ]
          : [],
        aoEscolher: function () {
          takeLetter(drawer);
        },
        aoFechar: function () {
          if (drawer.closeDrawer) {
            drawer.closeDrawer();
          }
          unlockFromPopup();
        },
      });
    }

    // Pegar a carta: ela some de dentro da gaveta, entra no
    // inventário e o pop-up fecha. De propósito, NÃO vai para a mão
    // agora — isso só acontece quando o jogador tocar no ícone dela no
    // inventário.
    function takeLetter(drawer) {
      if (!letterTaken) {
        letterTaken = true;
        if (drawer.takeNote) {
          drawer.takeNote();
        }
        window.Inventory.add({
          id: NOTE_ITEM_ID,
          nome: NOTE_ITEM_NAME,
          icone: NOTE_ICON,
          iconeEmbutido: NOTE_ICON_EMBEDDED,
          aoSelecionar: toggleLetterEquipped,
        });
      }
      // close() dispara o "aoFechar" registrado acima: empurra a
      // gaveta de volta e devolve o controle ao jogador por um
      // caminho só, igual ao botão "Fechar".
      drawerPopup.close();
    }

    // Tocar no ícone do inventário só equipa/guarda a carta na mão
    // direita — de propósito não abre o texto dela na hora (isso é o
    // botão "Interagir", com a carta já na mão).
    function toggleLetterEquipped() {
      if (handItem.isEquipped()) {
        handItem.unequip();
        window.Inventory.setSelected(NOTE_ITEM_ID, false);
      } else {
        handItem.equip();
        window.Inventory.setSelected(NOTE_ITEM_ID, true);
      }
    }

    // Leitura da carta: modelo 3D à esquerda (com câmera própria, para
    // girar/dar zoom sem mexer na câmera do jogo) e o texto à direita.
    function openNoteReader() {
      lockForPopup();
      noteReader.open({ aoFechar: unlockFromPopup });
    }

    // Evita que o jogador dispare a mini cutscene do telefone mais de
    // uma vez: assim que ela começa (primeiro toque em "Interagir" com
    // o telefone em destaque), a ligação com Ravi já aconteceu — tocar
    // no telefone de novo depois disso não faz mais nada, igual a
    // qualquer outro objeto ainda sem ação própria.
    let phoneCallStarted = false;

    // Toca a mini cutscene do telefone inteira (fade + diálogo com
    // Ravi — ver cutscenes/phone-sequence.js) e só então avança para o
    // próximo objetivo da história. Hoje isso não muda nada visível
    // (advance() é um no-op, já que "interagir com o telefone" ainda é
    // o único objetivo definido — ver objectives/objective-system.js),
    // mas deixa o progresso pronto para a próxima etapa.
    function playPhoneSequence() {
      phoneCallStarted = true;
      dialogueActive = true;
      window.PhoneSequence.play(player, container, function () {
        dialogueActive = false;
        objectives.advance();
      });
    }

    // Evita disparar a sequência de dormir mais de uma vez (mesmo
    // princípio de phoneCallStarted acima) — sobretudo contra um
    // segundo toque em "Interagir" bem no instante em que a sequência
    // já começou.
    let sleepSequenceStarted = false;

    // Toca a sequência de dormir inteira (câmera deitando -> fade ->
    // manhã -> câmera levantando — ver cutscenes/sleep-sequence.js) e
    // trava novos toques em "Interagir" enquanto ela dura, mesmo
    // princípio de playPhoneSequence/enterRoom acima e abaixo.
    function playSleepSequence(bedTarget) {
      sleepSequenceStarted = true;
      dialogueActive = true;
      window.SleepSequence.play(
        player,
        camera,
        container,
        room,
        corridor,
        atmosphere,
        bedTarget,
        function () {
          playWakeUpDialogue();
        },
        // Amanhecer do RESTO da casa, no mesmo instante de tela preta em
        // que o quarto e o corredor viram dia (ver `onMorning` em
        // cutscenes/sleep-sequence.js):
        //
        //  - `world.setDaytime` cobre TODAS as zonas de uma vez, entao os
        //    quatro comodos laterais (que hoje tem fachada externa para
        //    trocar, ver o revestimento externo em
        //    scenes/side-room-scene.js) e qualquer comodo novo no futuro
        //    amanhecem sem tocar nesta linha. Chamar de novo o quarto e o
        //    corredor por dentro dela nao custa nem quebra nada: sao as
        //    mesmas trocas de material/intensidade, idempotentes;
        //  - o telhado nao e uma zona da casa (nao tem interior, colisao
        //    nem interacao), entao ele vira aqui - e a mesma dupla que o
        //    controle de HORARIO do Editor ja usava em setTimeOfDay()
        //    mais abaixo.
        function () {
          world.setDaytime(true);
          roof.setDaytime(true);
        }
      );
    }

    // Diálogo automático de Kael (ver "acordar-primeira-noite" em
    // dialogue/dialogue-config.js), tocado assim que a animação de
    // levantar termina por completo — chamado direto pelo onComplete
    // de SleepSequence.play acima, então a cena já está de dia e a
    // câmera já voltou à pose de pé (controles/HUD já devolvidos ao
    // jogador pela própria SleepSequence, ver tryFinish() em
    // cutscenes/sleep-sequence.js). Trava os controles de novo só
    // enquanto a fala está na tela (a caixa já cuida de esconder o
    // HUD sozinha — ver dialogue-box.js), mesmo princípio de
    // playBlockedDialogue acima. Ao terminar, libera "dialogueActive"
    // e avança para o terceiro objetivo da história ("abrir as
    // janelas" — ver objectives/objective-config.js): a partir daí,
    // interagir com qualquer objeto do quarto que não seja a janela
    // ou a bola responde com "(Melhor abrir as janelas logo)."
    function playWakeUpDialogue() {
      player.setControlsEnabled(false);

      const box = window.DialogueBox.create(container);
      box.show();
      box.playSequence(window.DialogueConfig["acordar-primeira-noite"], function () {
        box.hide();
        player.setControlsEnabled(true);
        dialogueActive = false;
        objectives.advance();
      });
    }

    // ---------- Conclusão do objetivo "abrir as janelas" ----------
    // Existem 3 janelas no jogo: 1 dentro de "MEU QUARTO" (aberta
    // ainda lá dentro, já que a porta interna do quarto só destranca
    // com ela aberta) e 2 no corredor. Esta função pergunta, ao vivo,
    // se TODAS já estão abertas neste exato instante — mesmo princípio
    // de isRoomWindowOpen() acima (nenhum estado próprio guardado
    // aqui), só que varrendo os dois cenários de uma vez pelo "kind"
    // em vez de por id. Assim, qualquer janela nova que venha a
    // existir no futuro entra na conta automaticamente, sem tocar
    // nesta função.
    function areAllWindowsOpen() {
      const lists = [corridor.interactables, room.interactables];
      let found = 0;
      for (let l = 0; l < lists.length; l++) {
        for (let i = 0; i < lists[l].length; i++) {
          const item = lists[l][i];
          if (item.kind !== "window") {
            continue;
          }
          found += 1;
          if (!(item.isOpen && item.isOpen())) {
            return false;
          }
        }
      }
      return found > 0;
    }

    // Quantos milissegundos de silêncio entre o fim do diálogo das
    // janelas e o telefone começar a tocar sozinho.
    const PHONE_RING_DELAY_MS = 3000;

    // Guarda de uma vez só (mesmo princípio de phoneCallStarted/
    // sleepSequenceStarted acima): a conclusão do objetivo das janelas
    // roda uma única vez, mesmo que o jogador fique alternando as
    // cortinas depois.
    let windowsObjectiveDone = false;

    // Chamada no instante em que a ÚLTIMA das 3 janelas é aberta (ver
    // o caso "window" em window.HUD.setInteractHandler abaixo). Avança
    // a história para a etapa "atender-telefone" (ver
    // objectives/objective-config.js) e toca o diálogo automático de
    // Kael na hora — mesmo mecanismo de playWakeUpDialogue() acima
    // (controles travados só enquanto a fala está na tela; a própria
    // caixa já esconde o HUD sozinha). Quando a última fala é
    // confirmada, começa a contagem de 3 segundos até o telefone
    // tocar.
    function finishWindowsObjective() {
      windowsObjectiveDone = true;
      objectives.advance();

      dialogueActive = true;
      player.setControlsEnabled(false);

      const box = window.DialogueBox.create(container);
      box.show();
      box.playSequence(window.DialogueConfig["janelas-abertas"], function () {
        box.hide();
        player.setControlsEnabled(true);
        dialogueActive = false;

        // Os 3 segundos correm com o jogador já livre para andar pelo
        // corredor — nada de tela travada esperando.
        setTimeout(startIncomingPhoneCall, PHONE_RING_DELAY_MS);
      });
    }

    // ---------- Segunda ligação (o Ravi é quem liga) ----------
    // Com phoneRinging = true, o telefone da escrivaninha está tocando
    // de verdade (som em loop, ver PhoneAudio.startIncomingRing() em
    // audio/phone-audio.js — o mesmo chamando.wav da primeira ligação,
    // reaproveitado) e continua assim, sem limite de tempo, até o
    // jogador ir até lá e apertar "Interagir".
    let phoneRinging = false;

    // Posição do telefone da escrivaninha no mundo, lida da própria
    // "outline" dele (mesma fonte de verdade que o InteractionSystem
    // usa a cada quadro — ver scripts/interaction-system.js), então
    // nasce certa mesmo com o escalonamento do conjunto da
    // escrivaninha (DESK_SCALE em models/desk-factory.js). Lida uma vez
    // só, no momento em que o telefone começa a tocar: ele não se
    // move. É a partir daqui que o toque vira posicional (ver
    // PhoneAudio.startIncomingRing).
    function getCorridorPhonePosition() {
      for (let i = 0; i < corridor.interactables.length; i++) {
        const item = corridor.interactables[i];
        if (item.kind === "phone" && item.outline) {
          const pos = new THREE.Vector3();
          item.outline.getWorldPosition(pos);
          return { x: pos.x, y: pos.y, z: pos.z };
        }
      }
      return null;
    }

    function startIncomingPhoneCall() {
      phoneRinging = true;
      window.PhoneAudio.startIncomingRing({
        position: getCorridorPhonePosition(),
      });
    }

    // Atendimento: mesma mini cutscene de fade da primeira ligação,
    // reaproveitada inteira (ver PhoneSequence.playIncoming em
    // cutscenes/phone-sequence.js — mesmo overlay, mesma duração,
    // mesma caixa de diálogo, HUD escondido do começo ao fim). Ao
    // terminar o diálogo, avança para a última etapa desta
    // atualização: "ler-carta".
    function playIncomingPhoneSequence() {
      phoneRinging = false;
      dialogueActive = true;
      window.PhoneSequence.playIncoming(player, container, function () {
        dialogueActive = false;
        objectives.advance();
      });
    }

    // ---------- Porta compartilhada CORREDOR <-> MEU QUARTO ----------
    // A porta "MEU QUARTO" nao troca mais de cenario: ela ABRE. Os dois
    // ambientes ja estao no mesmo mundo (ver o bloco "A CASA" mais
    // acima), entao ela e a passagem fisica entre eles - o jogador
    // atravessa andando, vendo o outro comodo pelo vao antes, durante e
    // depois. Foi isso que substituiu a antiga enterRoom()/exitRoom(),
    // que tirava um cenario da cena e colocava o outro com a tela preta.
    //
    // O QUANDO nao mudou de lugar: continua na historia (ver
    // objectives/objective-config.js - a porta so fica liberada a partir
    // da etapa "interagir-porta-meu-quarto", como sempre), com um unico
    // caso especial, mais abaixo: a MESMA porta vista de dentro do
    // quarto depois da primeira noite continua exigindo a janela aberta.
    const roomDoor = corridor.roomDoor;
    const sharedDoorId = (config.sharedDoor && config.sharedDoor.id) || "meu-quarto";

    function toggleRoomDoor() {
      if (roomDoor) {
        roomDoor.toggle();
      }
    }

    // Em qual zona da casa o jogador esta neste instante (ver
    // scripts/house-world.js). Atualizado uma vez por quadro no loop
    // principal, la embaixo. Usado pela porta compartilhada, que
    // responde diferente dependendo do lado em que ele esta.
    let currentZoneKey = "corredor";
    // Consulta em tempo real se a janela do quarto (id "janela-quarto")
    // está aberta NESTE exato instante — não guarda estado próprio de
    // propósito. É a condição (junto com sleepSequenceStarted) pra
    // porta interna do quarto (ver "porta-interna-quarto" logo abaixo
    // em window.HUD.setInteractHandler) levar o jogador de volta pro
    // corredor: precisa estar aberta no momento de interagir com a
    // porta, não só ter sido aberta alguma vez — fechar a cortina
    // tranca a porta de novo (ver "guarda-roupa-dormir"/
    // "abrir-janela-primeiro" nesse caso, mesmo bloqueio de antes desta
    // porta existir). `room.interactables` é sempre a mesma lista (ver
    // RoomScene.build), então funciona independente do jogador estar
    // no quarto ou no corredor no momento da checagem.
    function isRoomWindowOpen() {
      for (let i = 0; i < room.interactables.length; i++) {
        const item = room.interactables[i];
        if (item.id === "janela-quarto") {
          return !!(item.isOpen && item.isOpen());
        }
      }
      return false;
    }

    // Enquanto algum interativo estiver "na mão" (hoje, só a bola —
    // ver isHeld em scenes/room-scene.js/scripts/ball-controller.js),
    // o jogador não deve conseguir mirar nem interagir com mais nada:
    // o único gesto possível com o botão "Interagir" nesse momento é
    // largar o que já está segurando. Genérico de propósito (checa
    // `item.isHeld`, não `kind === "ball"`) para cobrir automaticamente
    // qualquer outro objeto "segurável" que vier a existir no futuro.
    function getHeldItem() {
      for (let i = 0; i < activeInteractables.length; i++) {
        const item = activeInteractables[i];
        if (item.isHeld && item.isHeld()) {
          return item;
        }
      }
      return null;
    }

    // "Interagir" age sobre o que estiver em destaque no momento do toque.
    // A cama é um caso especial, tratado ANTES do sistema de objetivos
    // (ver comentário sobre "kind": "bed" em scenes/room-scene.js): a
    // regra depende do abajur estar aceso ou apagado (`isLampOn()`),
    // não da etapa atual da história, então ela nunca passa por
    // objectives.isAllowed(). Para todo o resto, primeiro passa pelo
    // sistema de objetivos: se o objeto ainda está bloqueado na etapa
    // atual da história, mostra a fala de bloqueio no lugar da ação
    // normal. Se estiver liberado, segue o mesmo switch por tipo
    // (kind) de sempre. As portas, de modo geral, continuam sem ação
    // própria mesmo quando liberadas (só o destaque visual) — a única
    // exceção hoje é a porta "MEU QUARTO" (ver caso "door" abaixo e
    // allowedIds em objectives/objective-config.js).
    let currentTarget = null;
    window.HUD.setInteractHandler(function () {
      if (dialogueActive) {
        return;
      }

      // Carta na mão direita: o MESMO botão "Interagir" de sempre
      // passa a abrir o pop-up de leitura dela, sem precisar mirar em
      // nada (enquanto ela está equipada, nada do cenário fica em
      // destaque — ver o loop principal lá embaixo). Nenhum botão novo
      // foi criado para isso.
      if (handItem.isEquipped()) {
        openNoteReader();
        return;
      }

      if (!currentTarget) {
        return;
      }

      if (currentTarget.isHeld && currentTarget.isHeld()) {
        // Já está na mão: o único gesto possível é largar (ver
        // getHeldItem() acima, que já força currentTarget a ser
        // sempre este mesmo item enquanto held/holdProgress > 0) — não
        // passa pelo resto do switch (cama, objetivos, porta etc.),
        // nem exige estar mirando exatamente nele.
        currentTarget.interact();
        return;
      }

      // A cama so entra em cena quando a historia chega nela: a etapa
      // "interagir-porta-meu-quarto" (ou seja, depois da ligacao com o
      // Ravi). Antes disso ela cai no sistema de objetivos logo abaixo e
      // responde com o lembrete de ligar para o Ravi, igual a qualquer
      // outro objeto bloqueado.
      //
      // Esta condicao e nova: como a casa agora e um mundo unico e a
      // porta do quarto pode estar aberta desde o inicio (ver
      // `sharedDoor` em scenes/corridor-config.js), o jogador consegue
      // entrar no quarto ANTES da ligacao. Sem ela, ele poderia dormir
      // antes de ligar para o Ravi e furar a ordem da historia - coisa
      // que antes era impossivel so porque o quarto nem existia na cena.
      if (
        currentTarget.kind === "bed" &&
        !sleepSequenceStarted &&
        objectives.getCurrentId() === "interagir-porta-meu-quarto"
      ) {
        // Abajur aceso: mesma fala de sempre, sem nenhuma ação real
        // (ver "cama-apagar-luz" em dialogue/dialogue-config.js).
        // Apagado: dispara a sequência de dormir inteira (ver
        // cutscenes/sleep-sequence.js), uma única vez — depois disso
        // (sleepSequenceStarted = true), a cama deixa de ser tratada
        // aqui como caso especial e cai no sistema de objetivos
        // normal logo abaixo, igual a qualquer outro objeto do quarto
        // (ver "bed" em objectives/objective-config.js, etapa
        // "abrir-janelas").
        if (currentTarget.isLampOn && currentTarget.isLampOn()) {
          playBlockedDialogue("cama-apagar-luz");
        } else {
          playSleepSequence(currentTarget);
        }
        return;
      }

      // A MESMA porta compartilhada, agora vista de DENTRO do quarto,
      // depois da primeira noite: era a antiga "porta-interna-quarto"
      // (uma segunda porta, no mesmo lugar, que existia so porque os
      // dois cenarios nunca estavam na cena juntos). Agora e uma porta
      // so, e a regra dela continua identica a de antes:
      //
      //  - janela do quarto FECHADA: a porta nao abre e Kael responde
      //    com a mesma fala de sempre;
      //  - janela ABERTA: a porta abre e o jogador volta ao corredor
      //    ANDANDO, sem fade e sem troca de cenario.
      //
      // Fica fora do sistema de objetivos pelo mesmo motivo da cama: a
      // regra depende de dois estados concretos do jogo (ja dormiu +
      // janela aberta agora, consultada ao vivo em isRoomWindowOpen()),
      // nao da etapa da historia. E depende do LADO: no corredor, esta
      // mesma porta segue o caminho normal de sempre, mais abaixo.
      if (
        currentTarget.kind === "door" &&
        currentTarget.id === sharedDoorId &&
        currentZoneKey === "quarto" &&
        sleepSequenceStarted
      ) {
        if (isRoomWindowOpen()) {
          toggleRoomDoor();
        } else {
          playBlockedDialogue("abrir-janela-primeiro");
        }
        return;
      }
      if (!objectives.isAllowed(currentTarget)) {
        const dialogueKey = objectives.getBlockedDialogueKey(currentTarget);
        if (dialogueKey) {
          playBlockedDialogue(dialogueKey);
        }
        return;
      }

      if (currentTarget.kind === "window") {
        currentTarget.toggleCurtain();
        // Esta pode ter sido a última das 3 janelas do jogo (ver
        // areAllWindowsOpen() acima). Se for, o objetivo "abrir as
        // janelas" termina aqui mesmo, no quadro seguinte à cortina
        // começar a abrir: diálogo de Kael -> 3 segundos -> telefone
        // tocando. Fora dessa etapa, ou com alguma janela ainda
        // fechada, nada disso acontece e a cortina segue sendo só uma
        // cortina.
        if (
          !windowsObjectiveDone &&
          objectives.getCurrentId() === "abrir-janelas" &&
          areAllWindowsOpen()
        ) {
          finishWindowsObjective();
        }
      } else if (currentTarget.kind === "drawer") {
        // Etapa "LER A CARTA DO RAVI": a gaveta é o único interativo
        // liberado (ver objectives/objective-config.js) e interagir
        // com ela abre a gaveta de verdade + o pop-up com o que está
        // guardado dentro. Em qualquer outra etapa, continua sendo a
        // gaveta de sempre, que só abre e fecha.
        if (
          objectives.getCurrentId() === "ler-carta" &&
          typeof currentTarget.openDrawer === "function"
        ) {
          openDrawerPopup(currentTarget);
        } else {
          currentTarget.toggleDrawer();
        }
      } else if (currentTarget.kind === "phone") {
        currentTarget.interact();
        if (phoneRinging) {
          // Telefone tocando (segunda ligação, ver
          // startIncomingPhoneCall() acima): atender tem prioridade
          // sobre qualquer outra coisa.
          playIncomingPhoneSequence();
        } else if (!phoneCallStarted) {
          playPhoneSequence();
        }
      } else if (currentTarget.kind === "lightSwitch") {
        currentTarget.toggleSwitch();
      } else if (currentTarget.kind === "ball") {
        // Bola de futebol do quarto (ver scenes/room-scene.js e
        // scripts/ball-controller.js): só alterna pegar/largar na mão
        // (BallController.toggleHold, exposto aqui como `interact` —
        // mesmo padrão do telefone acima) — nunca vai pro inventário
        // do jogador, nenhuma outra ação/diálogo associado.
        currentTarget.interact();
      } else if (
        currentTarget.kind === "door" &&
        currentTarget.id === sharedDoorId
      ) {
        // Unica porta com acao propria (ver allowedIds em
        // objectives/objective-config.js): abre/fecha a folha de verdade,
        // com o giro animado de models/door-factory.js. Nada de fade nem
        // de troca de cenario - o outro comodo ja esta ali, do outro lado
        // do vao, e o jogador simplesmente atravessa.
        toggleRoomDoor();
      }
    });

    // ---------- Loop principal ----------
    // Nao existe mais "funcao de update do cenario ativo": a casa e um
    // mundo unico, entao TODAS as zonas animam a cada quadro
    // (world.update, ver scripts/house-world.js). E o que faz a cortina,
    // o ventilador do quarto e a folha da porta continuarem se movendo
    // enquanto o jogador olha de longe, do outro comodo.

    // ---------- Modo Editor ----------
    // As abas "Corredor" / "Meu Quarto" do Editor nao trocam mais o que
    // esta na cena (as duas zonas estao sempre carregadas e visiveis, e
    // e justamente isso que o dev precisa ver): elas so escolhem QUAL
    // zona esta sendo editada agora - e o que a arvore de hierarquia e o
    // salvamento de alteracoes usam para saber a quem pertence cada
    // objeto (ver editor/editor-registry.js). A selecao por toque
    // continua funcionando na casa inteira, porque o Editor recebe o
    // worldRoot como raiz (ver getActiveRoot mais abaixo).
    let activeSceneKey = "corredor";

    function editorSetActiveScene(key) {
      activeSceneKey = key;
    }
    // ---------- Horário do cenário (noite / dia) ----------
    // Ferramenta de EDIÇÃO, não caminho de jogo: quem vira o dia na
    // história continua sendo a sequência de dormir, uma única vez, com
    // a tela preta (ver playSleepSequence() acima e
    // cutscenes/sleep-sequence.js). Isto aqui é exatamente o mesmo
    // trabalho, feito sob demanda e nos DOIS sentidos, para o Editor
    // poder conferir o cenário de noite e de dia sem reabrir o jogo
    // (ver o controle de HORÁRIO em editor/editor-ui.js).
    //
    // Os dois cenários são virados JUNTOS, inclusive o que não está na
    // cena neste instante: assim, trocar de aba (Corredor / Meu Quarto)
    // dentro do Editor nunca mostra um de dia e o outro de noite. Custa
    // nada — são trocas de material/uniform já prontas, sem recriar
    // geometria nenhuma (ver scripts/atmosphere.js).
    //
    // O estado NÃO é guardado aqui: quem sabe o horário é a própria
    // atmosfera (`atmosphere.isMorning()`), a mesma que a sequência de
    // dormir já usa — então os dois caminhos nunca podem discordar.
    function getTimeOfDay() {
      return atmosphere.isMorning() ? "dia" : "noite";
    }

    function setTimeOfDay(key) {
      const day = key === "dia";
      atmosphere.setDaytime(day);
      // Todas as zonas da casa de uma vez (ver scripts/house-world.js):
      // um comodo novo no futuro amanhece junto sem tocar nesta funcao.
      world.setDaytime(day);
      // O telhado nao e uma zona da casa (nao tem interior, colisao nem
      // interacao), entao ele amanhece aqui, no mesmo instante que elas.
      roof.setDaytime(day);
    }

    let editor = null;

    if (editorMode) {
      // HUD de jogo fora, controle do jogador desligado: a câmera
      // passa a ser escrita pela câmera livre do Editor (ver
      // editor/editor-camera.js). Nada é destruído — sair do Editor
      // recarrega o jogo limpo, direto no menu inicial.
      window.HUD.setVisible(false);
      player.setControlsEnabled(false);
      player.setCameraOverrideEnabled(true);

      camera.position.set(config.spawn.x, config.eyeHeight, config.spawn.z);
      camera.rotation.set(0, config.spawn.yaw, 0, "YXZ");

      window.EditorTextures.scanScenes(
        [corridor.root, room.root, roof.root].concat(
          sideRooms.map(function (sideRoom) {
            return sideRoom.root;
          })
        )
      );

      editor = window.EditorMode.start({
        scene: scene,
        camera: camera,
        renderer: renderer,
        container: container,
        motionBlur: motionBlur,
        config: config,
        getSceneList: function () {
          return [
            { key: "corredor", label: "Corredor" },
            { key: "quarto", label: "Meu Quarto" },
          ].concat(
            sideRooms.map(function (sideRoom) {
              return { key: sideRoom.key, label: sideRoom.label };
            }),
            [{ key: "telhado", label: "Telhado" }]
          );
        },
        getActiveSceneKey: function () {
          return activeSceneKey;
        },
        setActiveScene: editorSetActiveScene,
        // A casa inteira: com as duas zonas na cena ao mesmo tempo, o
        // toque de selecao do Editor precisa alcancar qualquer objeto
        // que esteja aparecendo na tela, inclusive o do outro comodo
        // visto pela porta. Quem descobre a que zona o objeto pertence e
        // o proprio registro, pelo userData do grupo dela (ver
        // entryForObject em editor/editor-registry.js).
        getActiveRoot: function () {
          return worldRoot;
        },
        getActiveSolids: function () {
          return activeSolids;
        },
        getActiveInteractables: function () {
          return activeInteractables;
        },
        getTimeOfDay: getTimeOfDay,
        setTimeOfDay: setTimeOfDay,
      });
    }

    // Posição "do jogador" entregue às animações do cenário enquanto
    // o Editor está aberto: é a própria câmera livre. Objeto único,
    // reaproveitado a cada quadro (nada de lixo por frame).
    const editorPlayerPos = { x: 0, z: 0, yaw: 0, isMoving: false, walkPhase: 0 };

    const clock = new THREE.Clock();

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1); // evita saltos ao voltar de segundo plano
      const elapsed = clock.getElapsedTime();

      // ---------- Quadro do Editor ----------
      // Mesmo renderer, mesma cena, mesmo pós-processamento do jogo:
      // só o que dirige a câmera e o que responde ao toque é outro.
      // O update do cenário ativo continua rodando (cortina, gaveta,
      // ventilador, bola) para o dev editar a cena viva, e não uma
      // foto parada dela.
      if (editor && editor.isActive()) {
        editor.update(delta);

        editorPlayerPos.x = camera.position.x;
        editorPlayerPos.z = camera.position.z;
        editorPlayerPos.yaw = camera.rotation.y;

        world.update(delta, elapsed, editorPlayerPos, config.playerRadius);
        // A poeira também anda no Editor: o dev precisa ver o cômodo
        // vivo, e a câmera livre faz o papel do jogador aqui.
        dust.update(delta, elapsed, editorPlayerPos);

        // Zona de luz: a matriz da camera muda a cada quadro e o shader
        // precisa dela para levar luz e pixel de volta ao espaco do mundo
        // (ver materials/light-zones.js).
        window.LightZones.update(camera);
        motionBlur.beginSceneRender();
        renderer.render(scene, camera);
        motionBlur.finishAndRender(camera, delta);

        requestAnimationFrame(tick);
        return;
      }
      // A posição devolvida por player.update() alimenta a física da
      // bola de futebol do quarto (ver scenes/room-scene.js e
      // scripts/ball-controller.js) — ela precisa saber onde o
      // jogador está a cada quadro pra reagir ao contato. Cenários sem
      // nenhum objeto físico desse tipo (hoje, o corredor) simplesmente
      // ignoram os dois parâmetros extras.
      const playerPos = player.update(delta);

      // Em que comodo da casa ele esta agora (ver
      // scripts/house-world.js). Uma consulta por quadro, so comparacao
      // de retangulos: quem usa e a porta compartilhada, que responde
      // diferente conforme o lado, e o som de passos, pela superficie.
      currentZoneKey = world.zoneKeyAt(playerPos.x, playerPos.z) || currentZoneKey;

      // Som de passos: decide se este é o quadro de tocar um passo
      // (ver comentário de `footsteps`/`activeSceneSurface` acima) a
      // partir de `playerPos.isMoving`/`playerPos.walkPhase` e da
      // superfície sob o jogador neste exato instante. Chamado antes
      // do resto do loop de propósito, mas isso não importa pra
      // ordem visual — é só áudio, nunca escreve na cena.
      footsteps.update(playerPos, activeSceneSurface(playerPos.x, playerPos.z));

      // Toque do telefone (quando está tocando): reavalia a cada quadro
      // o volume, o lado e o abafamento a partir de onde o jogador está
      // e pra onde está olhando — é isso que faz o som "ficar" na
      // escrivaninha enquanto ele se move. Sai na hora se não houver
      // ligação chamando, então pode ser chamada sempre.
      window.PhoneAudio.updateIncomingRing();

      // Atualiza a animação do cenário ativo (gaveta, cortinas etc. no
      // corredor; ventilador de teto e a bola de futebol no quarto —
      // ver activeSceneUpdate acima) antes de ler a posição-mundo das
      // "outlines" na mira, para não ficar um quadro atrasado em
      // relação ao que está sendo desenhado.
      world.update(delta, elapsed, playerPos, config.playerRadius);
      // Poeira do ar: o movimento dela vem do relógio do jogo, não do
      // jogador — continua flutuando com ele parado, andando ou girando
      // a câmera. A posição entra só para desligar os cômodos distantes
      // (ver effects/dust-motes.js).
      dust.update(delta, elapsed, playerPos);
      // Com algo na mão (ver getHeldItem() acima), a mira central nem
      // roda: nenhum objeto do cenário pode ficar em destaque (por
      // isso o outline de todos é forçado a apagado aqui — inclusive
      // de um item que estivesse com o contorno aceso bem no quadro em
      // que foi pego) e currentTarget é travado no próprio item
      // segurado, único alvo que "Interagir" pode afetar nesse
      // momento.
      // Carta na mão: sobe ao ser equipada, desce ao ser guardada e
      // respira de leve enquanto está lá (ver scripts/hand-item.js).
      // Sai na hora quando não há nada equipado, então pode ser
      // chamada sempre.
      handItem.update(delta, elapsed);

      const heldItem = getHeldItem();
      if (handItem.isEquipped()) {
        // Mesma regra do objeto segurado logo abaixo, agora para a
        // carta equipada: nenhum objeto do cenário pode ficar em
        // destaque e o botão "Interagir" só age sobre ela (abrir a
        // leitura, ver setInteractHandler acima).
        activeInteractables.forEach(function (item) {
          item.outline.visible = false;
        });
        currentTarget = null;
      } else if (heldItem) {
        activeInteractables.forEach(function (item) {
          item.outline.visible = false;
        });
        currentTarget = heldItem;
      } else {
        currentTarget = interaction.update(camera);
      }

      // A cena é desenhada no render target interno do Motion Blur;
      // finishAndRender() mede a velocidade de rotação da câmera neste
      // quadro e compõe o resultado (cena + desfoque, se houver) no
      // canvas de verdade.
      window.LightZones.update(camera);
      motionBlur.beginSceneRender();
      renderer.render(scene, camera);
      motionBlur.finishAndRender(camera, delta);

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  },
};

// ---------- Bootstrap ----------
// Menu principal: primeira tela exibida ao abrir o jogo, antes de
// qualquer cutscene, diálogo ou gameplay (ver menu/menu.js). Só
// depois que o jogador toca em "NOVO JOGO" o fluxo de sempre começa:
// a cutscene de abertura na estrada (ver cutscenes/road-cutscene.js)
// toca automaticamente e, ao terminar, window.Game.start() carrega a
// gameplay (o corredor) imediatamente, sem tela intermediária —
// exatamente como antes do menu existir.
//
// O segundo argumento é o botão "EDITOR" do menu (ferramenta de
// desenvolvimento — ver menu/menu.js e o README do Editor): ele pula
// a cutscene de abertura e abre a mesma gameplay já em modo de
// edição. O caminho de "NOVO JOGO" continua idêntico ao de sempre.
window.MainMenu.show(
  function () {
    window.RoadCutscene.play(window.Game.start);
  },
  function () {
    window.Game.start({ editor: true });
  }
);
