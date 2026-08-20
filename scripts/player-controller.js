/**
 * scripts/player-controller.js
 * -------------------------------------------------
 * Primeira pessoa "pura": a câmera É o jogador, nenhum
 * corpo/braços/pernas é renderizado.
 *
 * - Olhar: consome o delta de arrasto do lado direito da
 *   tela (interface/hud.js) e gira a câmera (yaw/pitch),
 *   sem inverter os eixos.
 * - Movimento: lê o vetor do analógico virtual, calcula
 *   uma direção relativa ao "para onde a câmera olha"
 *   (só o yaw — olhar para cima/baixo não deve fazer o
 *   jogador subir ou descer) e resolve colisão contra os
 *   sólidos do cenário.
 * - Respiração / head bob: um pequeníssimo deslocamento
 *   vertical da câmera, somado a uma leve inclinação lateral
 *   (roll), aplicado POR CIMA da posição/rotação normais —
 *   ver comentário detalhado logo abaixo, antes das
 *   constantes de respiração e head bob.
 * -------------------------------------------------
 */

window.PlayerController = (function () {
  // Sensibilidade base da câmera — o mesmo valor de sempre. Na
  // prática, o que é aplicado a cada quadro é este valor multiplicado
  // pela escolha do jogador no slider "Sensibilidade" da tela de
  // Configurações (ver scripts/game-settings.js e getLookSensitivity()
  // abaixo). Em 50 (posição padrão do slider), o multiplicador é
  // sempre exatamente 1.0 — ou seja, quem nunca abrir Configurações
  // (ou se GameSettings não estiver carregado por algum motivo) sente
  // a câmera exatamente como antes desta tela existir.
  const LOOK_SENSITIVITY_BASE = 0.0045;
  const PITCH_LIMIT = 1.45; // ~83 graus, evita a câmera virar de cabeça para baixo
  const MOVE_SPEED = 2.6; // unidades por segundo

  // Lida com o multiplicador toda vez que é chamada (em vez de
  // guardar um valor fixo uma única vez), para uma mudança no slider
  // valer imediatamente, sem precisar reiniciar a gameplay.
  function getLookSensitivity() {
    if (
      window.GameSettings &&
      typeof window.GameSettings.getCameraSensitivityMultiplier === "function"
    ) {
      return (
        LOOK_SENSITIVITY_BASE *
        window.GameSettings.getCameraSensitivityMultiplier()
      );
    }
    return LOOK_SENSITIVITY_BASE;
  }

  // ---------- Respiração / head bob ----------
  // Efeito puramente visual: um pequeno deslocamento vertical da
  // câmera (posição Y) somado a uma leve inclinação lateral (roll —
  // rotation.z), para a visão em primeira pessoa nunca ficar
  // perfeitamente estática. Nunca é somado a `euler` (o estado real
  // de "para onde o jogador está olhando") nem à posição X/Z usada
  // pela colisão — por isso não afeta mira, movimento, alcance de
  // interação ou o Motion Blur (que só reage a yaw/pitch, nunca a
  // roll — ver effects/motion-blur.js). Também por isso o roll pode
  // ser aplicado com segurança: rotação em torno do próprio eixo de
  // mira da câmera não muda para onde ela aponta, só inclina a
  // imagem — o raio da mira central (InteractionSystem) sai exatamente
  // igual com ou sem ele.
  //
  // Dois estados, misturados por `walkBlend` (0 a 1):
  //   - Parado: só a respiração (lenta, mínima, contínua).
  //   - Andando: head bob (mais perceptível, sincronizado com a
  //     distância de fato percorrida — não com o tempo, nem com a
  //     intenção de andar — então se o jogador fica travado contra
  //     uma parede tentando andar, o bob também para).
  // A transição entre os dois nunca é abrupta: `walkBlend` sempre
  // desliza suavemente de um estado a outro (ver BOB_BLEND_*_RATE).

  // Respiração (player parado) — lenta e pequena, mas perceptível.
  const BREATH_CYCLE_SECONDS = 4; // duração de um ciclo completo (~15 respirações/min)
  const BREATH_VERTICAL_AMPLITUDE = 0.01; // unidades (~1cm de sobe-desce)
  const BREATH_ROLL_AMPLITUDE = 0.003; // radianos — sutil, mas já se nota

  // Head bob (player andando) — mais perceptível que a respiração,
  // mas ainda discreto. `WALK_BOB_CYCLES_PER_UNIT`
  // controla o "comprimento da passada": quantos ciclos completos de
  // balanço lateral ocorrem por unidade de distância percorrida (o
  // vertical usa o dobro dessa frequência — dois "passos", um bob
  // para cima a cada um, por ciclo lateral completo, como uma
  // caminhada real).
  const WALK_BOB_CYCLES_PER_UNIT = 0.42;
  const WALK_VERTICAL_AMPLITUDE = 0.026; // unidades
  const WALK_ROLL_AMPLITUDE = 0.017; // radianos

  // Velocidade da suavização de `walkBlend` (maior = reage mais
  // rápido). Liga mais rápido ao começar a andar; desliga mais devagar
  // ao parar, para "diminuir suavemente" em vez de cortar.
  const BOB_BLEND_IN_RATE = 6;
  const BOB_BLEND_OUT_RATE = 3;

  function create(camera, config, solids) {
    const euler = new THREE.Euler(0, config.spawn.yaw, 0, "YXZ");
    let posX = config.spawn.x;
    let posZ = config.spawn.z;

    // Enquanto false, o input de toque (olhar/mover) é ignorado —
    // usado por cutscenes em engine (ex.: cutscenes/entry-sequence.js)
    // para tirar o controle do jogador temporariamente. A respiração
    // / head bob também fica pausada nesse período (ver update()
    // abaixo): evita competir com animações de câmera "encenadas"
    // (ex.: a câmera "acordando" no início, controlada por
    // setLookPitch), então a câmera fica perfeitamente parada nesses
    // trechos, exatamente como antes desta mudança.
    let controlsEnabled = true;

    // Enquanto true, este módulo não escreve mais nada em
    // `camera.position`/`camera.rotation` a cada quadro (nem sequer o
    // reposicionamento no eyeHeight de sempre, ver o fim de update()
    // logo abaixo) — usado por uma cutscene que precisa animar a
    // câmera livremente por fora do eyeHeight/posX/posZ normais (ex.:
    // a sequência de dormir, que abaixa e move a câmera até a cama —
    // ver cutscenes/sleep-sequence.js). Sem este bloqueio, o
    // reposicionamento incondicional no fim de update() desfaria a
    // animação da cutscene no quadro seguinte. `setControlsEnabled(false)`
    // sozinho não basta aqui: ele só pausa a LEITURA de input (olhar/
    // mover), não impede a ESCRITA de posX/posZ/eyeHeight de volta na
    // câmera a cada quadro. Quem ativa isto é responsável por
    // devolver a câmera a um estado consistente (ver `teleport`
    // abaixo) antes de desativar de novo.
    let cameraOverrideActive = false;

    // Estado interno do efeito de respiração/head bob — nada disso é
    // lido por nenhum outro sistema do jogo.
    let breathClock = 0; // relógio contínuo (segundos), só para a respiração
    let walkPhase = 0; // fase do head bob — avança com a distância percorrida
    let walkBlend = 0; // 0 = só respiração, 1 = head bob completo

    camera.position.set(posX, config.eyeHeight, posZ);
    camera.rotation.copy(euler);

    function update(deltaTime) {
      if (cameraOverrideActive) {
        // Alguma cutscene está com controle total da câmera neste
        // quadro (ver comentário de `cameraOverrideActive` acima) —
        // não mexe em `camera.position`/`camera.rotation` nem lê
        // input nenhum, só devolve a posição lógica atual (sem uso
        // por quem chama neste modo). `isMoving: false` aqui garante
        // que o som de passos (scripts/main.js + audio/footstep-audio.js,
        // ver comentário de `isMoving`/`walkPhase` no return normal
        // logo abaixo) fica mudo durante qualquer cutscene com
        // controle total de câmera, mesmo princípio de
        // controlsEnabled = false.
        return { x: posX, z: posZ, yaw: euler.y, isMoving: false, walkPhase: walkPhase };
      }

      let isMoving = false;

      if (controlsEnabled) {
        // ---------- Olhar (câmera) ----------
        const look = window.HUD.consumeLookDelta();
        if (look.x !== 0 || look.y !== 0) {
          // look.x / look.y são o delta bruto de arrasto em pixels de tela
          // (positivo = arrastou para a direita / para baixo).
          const sensitivity = getLookSensitivity();
          euler.y -= look.x * sensitivity; // arrastar p/ direita => gira p/ direita
          euler.x -= look.y * sensitivity; // arrastar p/ cima (delta negativo) => olha p/ cima
          euler.x = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, euler.x));
          camera.rotation.copy(euler);
        }

        // ---------- Movimento ----------
        const move = window.HUD.getMoveVector(); // {x: strafe, y: frente/trás}
        if (move.x !== 0 || move.y !== 0) {
          const yaw = euler.y;
          // Vetor "para frente" da câmera (ignorando o pitch, para não voar/afundar)
          const forwardX = -Math.sin(yaw);
          const forwardZ = -Math.cos(yaw);
          // Vetor "direita" (perpendicular ao de frente)
          const rightX = Math.cos(yaw);
          const rightZ = -Math.sin(yaw);

          const step = MOVE_SPEED * deltaTime;
          const dx = (forwardX * move.y + rightX * move.x) * step;
          const dz = (forwardZ * move.y + rightZ * move.x) * step;

          const resolved = window.Collision.resolveMovement(
            posX,
            posZ,
            dx,
            dz,
            config.playerRadius,
            solids
          );

          // Distância de fato percorrida nesse quadro (depois da
          // colisão) — alimenta o head bob logo abaixo, para ele
          // acompanhar o deslocamento real do personagem em vez de só
          // a intenção de andar: travado contra uma parede, sem
          // avançar de verdade, o bob também não avança.
          const movedX = resolved.x - posX;
          const movedZ = resolved.z - posZ;
          const distanceMoved = Math.sqrt(movedX * movedX + movedZ * movedZ);
          if (distanceMoved > 1e-5) {
            isMoving = true;
            walkPhase += distanceMoved * WALK_BOB_CYCLES_PER_UNIT * Math.PI * 2;
          }

          posX = resolved.x;
          posZ = resolved.z;
        }
      } else {
        // Descarta qualquer input acumulado enquanto os controles
        // estão bloqueados, para não causar um salto de câmera assim
        // que forem liberados de novo.
        window.HUD.consumeLookDelta();
      }

      // ---------- Respiração / head bob ----------
      // Só roda com os controles liberados (ver comentário em
      // `controlsEnabled` acima) — durante cutscenes a câmera fica
      // exatamente como antes desta mudança (offsets em 0).
      let bobVertical = 0;
      let bobRoll = 0;

      if (controlsEnabled) {
        breathClock += deltaTime;

        // Desliza `walkBlend` suavemente até 1 (andando) ou 0 (parado)
        // — nunca um salto, mesmo trocando de estado a cada quadro.
        const blendRate = isMoving ? BOB_BLEND_IN_RATE : BOB_BLEND_OUT_RATE;
        const blendTarget = isMoving ? 1 : 0;
        walkBlend += (blendTarget - walkBlend) * (1 - Math.exp(-blendRate * deltaTime));

        const breathAngle = (breathClock / BREATH_CYCLE_SECONDS) * Math.PI * 2;
        const breathVertical = Math.sin(breathAngle) * BREATH_VERTICAL_AMPLITUDE;
        const breathRoll = Math.sin(breathAngle * 0.5) * BREATH_ROLL_AMPLITUDE;

        // Vertical no dobro da frequência do roll: dois "passos" (um
        // bob para cima a cada pé) por ciclo completo de balanço
        // lateral — mesma cadência de uma caminhada real.
        const walkVertical = Math.sin(walkPhase * 2) * WALK_VERTICAL_AMPLITUDE;
        const walkRoll = Math.sin(walkPhase) * WALK_ROLL_AMPLITUDE;

        // Mistura os dois estados por `walkBlend` — a respiração nunca
        // desaparece de vez, só fica discreta perto da amplitude do
        // head bob (reforça a sensação de presença mesmo andando).
        bobVertical = breathVertical * (1 - walkBlend) + walkVertical * walkBlend;
        bobRoll = breathRoll * (1 - walkBlend) + walkRoll * walkBlend;
      }

      camera.position.set(posX, config.eyeHeight + bobVertical, posZ);
      camera.rotation.z = bobRoll;

      // `yaw` (euler.y) vai junto desde já para pra frente: hoje só a
      // bola de futebol do quarto usa (ver scripts/ball-controller.js
      // e comentário de `playerPos`/`playerRadius` em
      // scenes/room-scene.js) — precisa saber pra onde o jogador está
      // olhando pra calcular o ponto "na frente da câmera" onde ela
      // fica enquanto está sendo segurada na mão.
      //
      // `isMoving`/`walkPhase` também vão junto: usados pelo som de
      // passos (audio/footstep-audio.js, chamado a partir de
      // scripts/main.js) para saber se deve tocar algum som neste
      // quadro e, principalmente, para saber a hora exata de cada
      // passo — `walkPhase` é o mesmo relógio de fase que já dirige o
      // head bob logo acima (avança só com a distância de fato
      // percorrida, nunca com o tempo, e nunca durante
      // cutscene/diálogo, já que só é incrementado dentro do bloco
      // `controlsEnabled` acima). O som de passos cruza esse mesmo
      // relógio em vez de manter um relógio próprio, então o áudio
      // sai naturalmente sincronizado com o balanço visual da câmera,
      // sem duplicar nenhuma lógica de cadência aqui.
      return { x: posX, z: posZ, yaw: euler.y, isMoving: isMoving, walkPhase: walkPhase };
    }

    // Bloqueia/libera o input de toque (olhar e mover) de uma vez.
    function setControlsEnabled(enabled) {
      controlsEnabled = enabled;
    }

    // Define o pitch (olhar para cima/baixo) diretamente, por fora do
    // input de toque — usado pela animação de câmera da mini cutscene
    // de entrada. Mantém "euler" (o estado interno) sincronizado, para
    // que o jogador não sinta nenhum salto ao recuperar o controle.
    function setLookPitch(radians) {
      euler.x = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, radians));
      camera.rotation.copy(euler);
    }

    // Reposiciona o jogador instantaneamente, sem nenhuma animação —
    // usado pela transição de cenário ao atravessar uma porta para um
    // novo ambiente (ver cutscenes/room-transition.js e
    // scripts/main.js). `pitch` é opcional (padrão 0, olhar nivelado):
    // sempre chamado com a tela completamente preta, no meio da
    // transição, então esse "salto" de câmera nunca chega a ser visto
    // — só garante que o jogador nasce olhando para frente no novo
    // cenário, e não com o pitch de onde estava olhando antes de
    // interagir com a porta.
    function teleport(x, z, yaw, pitch) {
      posX = x;
      posZ = z;
      euler.y = yaw;
      euler.x = pitch === undefined ? 0 : pitch;
      camera.rotation.copy(euler);
      camera.position.set(posX, config.eyeHeight, posZ);
    }

    // Liga/desliga o modo de controle total de câmera por uma
    // cutscene externa (ver comentário de `cameraOverrideActive`
    // acima). Chamar com `false` não reposiciona nada sozinho — quem
    // chama deve ter chamado `teleport(...)` antes (ou logo em
    // seguida) para `posX`/`posZ`/`euler` baterem com onde a câmera
    // realmente ficou, evitando um salto no quadro seguinte.
    function setCameraOverrideEnabled(enabled) {
      cameraOverrideActive = enabled;
    }

    return {
      update: update,
      setControlsEnabled: setControlsEnabled,
      setLookPitch: setLookPitch,
      teleport: teleport,
      setCameraOverrideEnabled: setCameraOverrideEnabled,
    };
  }

  return { create: create };
})();
