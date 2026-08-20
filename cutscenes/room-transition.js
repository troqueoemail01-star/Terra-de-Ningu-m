/**
 * cutscenes/room-transition.js
 * -------------------------------------------------
 * Transição genérica de cenário, usada ao atravessar uma porta que
 * leva a um novo ambiente (hoje, só a porta "MEU QUARTO" do corredor
 * — ver scripts/main.js). Mesmo conceito da mini cutscene do telefone
 * (cutscenes/phone-sequence.js): uma camada preta cobre a tela com um
 * fade-in e, só então, com a tela completamente preta, quem chamou
 * pode trocar o cenário de verdade através do callback `onSwap`
 * (esconder o grupo 3D antigo, mostrar o novo, reposicionar o
 * jogador) — o jogador nunca vê a troca direta entre os dois
 * cenários. Em seguida, um fade-out revela o novo ambiente.
 *
 * Diferente da mini cutscene do telefone, não há nenhum diálogo nem
 * espera narrativa aqui (o telefone "chamando" precisava de tempo;
 * atravessar uma porta, não) — por isso a duração de cada metade do
 * fade é bem mais curta.
 *
 * window.RoomTransition.play(player, container, onSwap, onComplete, fadeMs)
 * -------------------------------------------------
 * `fadeMs` é opcional: duração (em ms) de CADA metade do fade
 * (fade-in e fade-out usam o mesmo valor). Quando omitido, usa
 * FADE_HALF_MS abaixo (o padrão, definido também em
 * cutscenes/room-transition.css). Passar um valor sobrescreve a
 * duração só nesta chamada, sem alterar o padrão usado pelas outras
 * transições que reaproveitam esta mesma função.
 */

window.RoomTransition = (function () {
  // Duração padrão de cada metade do fade quando `fadeMs` não é
  // informado (precisa bater com a transição definida em
  // cutscenes/room-transition.css).
  const FADE_HALF_MS = 600;

  // Mesma técnica de espera de cutscenes/phone-sequence.js: aguarda o
  // fim de verdade da transição de opacidade ("transitionend"), com um
  // setTimeout de salvaguarda para a sequência sempre continuar, mesmo
  // se o evento não disparar por algum motivo. `durationMs` é a
  // duração real usada nesta chamada (padrão ou sobrescrita via
  // `fadeMs` de play()), para a salvaguarda bater com o fade de
  // verdade mesmo quando ele é mais longo que o padrão.
  function waitForFade(overlay, durationMs, onDone) {
    let done = false;
    function finish(e) {
      if (done) return;
      if (e && e.propertyName && e.propertyName !== "opacity") return;
      done = true;
      overlay.removeEventListener("transitionend", finish);
      onDone();
    }
    overlay.addEventListener("transitionend", finish);
    setTimeout(finish, durationMs + 150);
  }

  function play(player, container, onSwap, onComplete, fadeMs) {
    // Controles e HUD ficam bloqueados/escondidos do início ao fim da
    // transição inteira — mesma regra de qualquer cutscene em engine
    // do jogo (ver cutscenes/entry-sequence.js e
    // cutscenes/phone-sequence.js).
    player.setControlsEnabled(false);
    window.HUD.setVisible(false);

    const duration = typeof fadeMs === "number" ? fadeMs : FADE_HALF_MS;

    const overlay = document.createElement("div");
    overlay.className = "room-transition-overlay";
    // Sobrescreve a duração da transição definida em CSS só quando
    // `fadeMs` é passado — do contrário, o valor de
    // room-transition.css (mesmo padrão de FADE_HALF_MS) continua
    // valendo normalmente.
    if (typeof fadeMs === "number") {
      overlay.style.transitionDuration = fadeMs + "ms";
    }
    container.appendChild(overlay);

    // Confirma o estado inicial (opacidade 0) antes de mudar para 1 —
    // mesmo motivo de phone-sequence.js: sem isso, a primeira mudança
    // de opacidade de um elemento recém-inserido corre o risco de não
    // animar.
    void overlay.offsetWidth;

    // Fase 1: fade-in (tela escurece).
    overlay.style.opacity = "1";
    waitForFade(overlay, duration, function () {
      // Tela completamente preta: momento seguro para trocar o
      // cenário de verdade, sem o jogador ver a troca.
      if (onSwap) {
        onSwap();
      }

      // Fase 2: fade-out (novo ambiente revelado).
      overlay.style.opacity = "0";
      waitForFade(overlay, duration, function () {
        overlay.remove();
        player.setControlsEnabled(true);
        window.HUD.setVisible(true);
        if (onComplete) {
          onComplete();
        }
      });
    });
  }

  return { play: play };
})();
