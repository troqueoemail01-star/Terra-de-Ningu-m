/**
 * scripts/orientation-manager.js
 * -------------------------------------------------
 * Força o jogo a rodar somente em modo paisagem (landscape), na
 * mesma lógica em camadas do FullscreenManager (ver
 * scripts/fullscreen-manager.js):
 *
 *   1) Screen Orientation API (screen.orientation.lock): tenta travar
 *      em "landscape" o quanto antes. Em vários navegadores essa API
 *      só é liberada quando o documento já está em Fullscreen — por
 *      isso a tentativa se repete a cada mudança de estado de tela
 *      cheia e a cada interação do jogador, junto com o próprio
 *      pedido de fullscreen. Prefixos legados (screen.mozLockOrientation
 *      / screen.msLockOrientation) cobrem navegadores mais antigos que
 *      nunca implementaram a API padrão.
 *
 *   2) Fallback via CSS: em plataformas onde a Orientation Lock API
 *      não existe de verdade (ex.: Safari/iOS, que não implementa
 *      screen.orientation.lock), não há como forçar a orientação via
 *      JavaScript. Nesse caso, um overlay full-screen (ver
 *      #rotate-device-overlay em interface/layout.css) cobre o jogo
 *      inteiro sempre que o aparelho estiver em pé (retrato) e pede
 *      para o jogador girar — funciona só com CSS puro
 *      (media query "orientation: portrait"), sem depender de nenhuma
 *      API.
 *
 *   3) manifest.webmanifest também declara "orientation": "landscape",
 *      cobrindo o caso do jogo ser aberto a partir da Tela de Início
 *      (PWA instalado) em plataformas que respeitam essa chave.
 *
 * Não depende de nenhum outro módulo do jogo, não mexe em nenhuma
 * mecânica/interface/controle existente — só solicita o bloqueio de
 * orientação do navegador/WebView.
 * -------------------------------------------------
 */

window.OrientationManager = (function () {
  function lock() {
    const orientation = screen.orientation;
    if (orientation && typeof orientation.lock === "function") {
      orientation.lock("landscape").catch(function () {
        // Bloqueado (navegador exige Fullscreen antes, ou a
        // plataforma não permite lock programático) — o overlay de
        // CSS cobre esse caso independentemente.
      });
      return;
    }

    // Prefixos legados (navegadores antigos que nunca implementaram a
    // Screen Orientation API padrão).
    const legacyLock =
      screen.lockOrientation ||
      screen.mozLockOrientation ||
      screen.msLockOrientation;
    if (legacyLock) {
      try {
        legacyLock.call(screen, "landscape");
      } catch (err) {
        // Sem suporte real — o overlay de CSS cobre o caso.
      }
    }
  }

  // 1) Tenta imediatamente e a cada carregamento da página.
  lock();
  document.addEventListener("DOMContentLoaded", lock);
  window.addEventListener("load", lock);

  // 2) Tenta de novo sempre que o estado de tela cheia mudar — em
  // muitos navegadores é só a partir daí que o lock é aceito (ver
  // FullscreenManager, que dispara esses mesmos eventos).
  [
    "fullscreenchange",
    "webkitfullscreenchange",
    "mozfullscreenchange",
    "MSFullscreenChange",
  ].forEach(function (evt) {
    document.addEventListener(evt, lock);
  });

  // 3) Fallback universal: a primeira interação do jogador em
  // qualquer lugar da página também tenta travar a orientação — o
  // mesmo gatilho já usado pelo FullscreenManager.
  ["pointerdown", "touchend", "mousedown", "keydown"].forEach(function (evt) {
    document.addEventListener(evt, lock, { passive: true });
  });

  return { lock: lock };
})();
