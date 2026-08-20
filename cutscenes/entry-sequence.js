/**
 * cutscenes/entry-sequence.js
 * -------------------------------------------------
 * Mini cutscene de entrada: toca uma única vez, logo depois que a
 * cutscene de introdução (vídeo, ver cutscene-player.js) termina e
 * a gameplay é montada. O jogador já nasce no lugar certo (em
 * frente à porta "ENTRADA & SAÍDA", ver spawn em
 * scenes/corridor-config.js) — o que esta cutscene faz é atrasar a
 * entrega do controle:
 *
 *   1. Câmera começa olhando para o chão, controles e HUD
 *      escondidos (o jogador não anda nem olha ao redor).
 *   2. Animação cinematográfica: a câmera sobe suavemente até a
 *      visão normal em primeira pessoa (~5s), representando o
 *      personagem recuperando a consciência.
 *   3. Diálogo de abertura (ver dialogue/dialogue-config.js),
 *      digitado aos poucos, avançando com um toque por vez.
 *   4. Só então HUD e controles voltam ao normal.
 *
 * window.EntrySequence.play(player, container, onComplete)
 * -------------------------------------------------
 */

window.EntrySequence = (function () {
  // Pitch inicial (radianos): câmera apontando para o chão. Negativo
  // = olhando para baixo (ver convenção de sinal em
  // scripts/player-controller.js). ~74.5°, abaixo do limite de pitch
  // do jogo (±1.45 rad), então não bate no clamp.
  const LOOK_DOWN_PITCH = -1.3;

  const CAMERA_RISE_DURATION_MS = 5000;

  const DIALOGUE_KEY = "entrada-kael";

  // Easing "ease-out": a câmera desacelera ao chegar na posição
  // final, para o movimento parecer suave e natural (em vez de
  // constante ou abrupto no final).
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // Anima o pitch da câmera de "olhando pro chão" até "centralizada,
  // olhando para a frente" (pitch 0), através do próprio
  // PlayerController (setLookPitch) — assim o estado interno da
  // câmera (euler) fica sempre sincronizado, sem nenhum salto quando
  // os controles forem liberados de novo ao final da cutscene.
  function animateCameraRise(player, onDone) {
    player.setLookPitch(LOOK_DOWN_PITCH);
    const start = performance.now();

    function step(now) {
      const t = Math.min((now - start) / CAMERA_RISE_DURATION_MS, 1);
      const eased = easeOutCubic(t);
      player.setLookPitch(LOOK_DOWN_PITCH * (1 - eased));

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        player.setLookPitch(0); // garante o valor final exato
        onDone();
      }
    }

    requestAnimationFrame(step);
  }

  function play(player, container, onComplete) {
    // Controles e HUD ficam bloqueados/escondidos do início ao fim
    // desta cutscene inteira (animação de câmera + diálogo).
    player.setControlsEnabled(false);
    window.HUD.setVisible(false);

    animateCameraRise(player, function () {
      const dialogueBox = window.DialogueBox.create(container);
      dialogueBox.show();

      const lines = window.DialogueConfig[DIALOGUE_KEY];
      dialogueBox.playSequence(lines, function () {
        dialogueBox.hide();
        window.HUD.setVisible(true);
        player.setControlsEnabled(true);
        if (onComplete) {
          onComplete();
        }
      });
    });
  }

  return { play: play };
})();
