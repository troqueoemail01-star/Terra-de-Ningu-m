/**
 * scripts/fullscreen-manager.js
 * -------------------------------------------------
 * Faz o jogo entrar em tela cheia (Fullscreen) automaticamente ao
 * iniciar, em qualquer plataforma: navegadores desktop e mobile,
 * WebView (build Android/APK) e builds compiladas para Windows/EXE.
 *
 * Estratégia (da melhor para a pior, escolhida sozinha conforme o
 * que o ambiente permitir — nenhuma configuração manual):
 *
 *   1) Fullscreen API do navegador (com os prefixos legados
 *      webkit/moz/ms). Tenta imediatamente ao carregar o script —
 *      o que já basta em builds nativas/kiosk que permitem tela
 *      cheia programática sem gesto do usuário (ex.: várias
 *      WebViews compiladas e wrappers de EXE baseados em
 *      Chromium). Quando o ambiente exige um gesto do usuário antes
 *      de liberar o Fullscreen (regra comum de segurança em
 *      navegadores comuns), o pedido falha silenciosamente aqui e
 *      o fallback abaixo assume.
 *
 *   2) Fallback universal: a primeira interação do jogador (toque,
 *      clique ou tecla), em qualquer lugar da página, tenta de
 *      novo. Como o jogo já tem pontos naturais de primeiro toque
 *      (ex.: "Toque para iniciar" da cutscene, o próprio analógico),
 *      a transição para tela cheia acontece "de carona" nesse
 *      toque — sem pedir nenhuma ação extra do jogador. Fica sempre
 *      ativo (não só uma vez): se o sistema sair da tela cheia por
 *      conta própria (ex.: usuário aperta Esc/F11 no desktop), o
 *      próximo toque tenta reengajar sozinho, sem travar em loop.
 *
 *   3) Em ambientes onde a Fullscreen API não existe de verdade
 *      (ex.: Safari no iOS fora do modo "adicionado à Tela de
 *      Início"), este arquivo não tem como forçar tela cheia via
 *      JavaScript — nesse caso, as meta tags de "web app" no
 *      <head> do index.html e o manifest.webmanifest
 *      (display: "fullscreen") cobrem o caso do jogo ser aberto a
 *      partir da Tela de Início, sem nenhuma barra do navegador.
 *
 *   4) Em qualquer outro caso, o próprio layout em CSS (ver
 *      interface/layout.css, não alterado por este arquivo) já
 *      ocupa 100% da área visível disponível — a melhor área útil
 *      possível continua garantida mesmo sem tela cheia real.
 *
 * Não depende de nenhum outro módulo do jogo, não mexe em nenhuma
 * mecânica/interface/controle existente — só solicita o modo tela
 * cheia do navegador/WebView. Carregado antes de tudo (ver
 * index.html) para registrar o gatilho de interação o quanto antes.
 * -------------------------------------------------
 */

window.FullscreenManager = (function () {
  // Elemento raiz da página inteira — garante que tudo (HUD,
  // cutscenes, futura UI) fique dentro da tela cheia, não só o
  // canvas do jogo.
  const TARGET = document.documentElement;

  function getFullscreenElement() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    );
  }

  function isSupported() {
    return !!(
      TARGET.requestFullscreen ||
      TARGET.webkitRequestFullscreen ||
      TARGET.webkitRequestFullScreen ||
      TARGET.mozRequestFullScreen ||
      TARGET.msRequestFullscreen
    );
  }

  // Chama o método de Fullscreen disponível no elemento (o primeiro
  // que existir, testando os prefixos legados nessa ordem) e sempre
  // devolve uma Promise, mesmo em navegadores antigos cujo método
  // não retorna uma nativamente — assim quem chama trata sucesso e
  // falha de um jeito só.
  function requestFullscreenOn(el) {
    const request =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.webkitRequestFullScreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;

    if (!request) {
      return Promise.reject(new Error("Fullscreen API indisponível"));
    }

    try {
      const result = request.call(el);
      return result && typeof result.then === "function"
        ? result
        : Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function exitFullscreenNow() {
    if (!getFullscreenElement()) return;
    const exit =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.webkitCancelFullScreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen;
    if (exit) {
      try {
        exit.call(document);
      } catch (err) {
        // Ambiente não permite sair programaticamente — sem problema,
        // a partir daqui quem controla é o usuário/a plataforma.
      }
    }
  }

  let attempting = false;

  // Idempotente: pode ser chamada quantas vezes for preciso (ex.: a
  // cada toque do jogador) sem custo nem efeito colateral quando o
  // jogo já está em tela cheia ou quando um pedido já está em
  // andamento.
  function request() {
    if (attempting || getFullscreenElement() || !isSupported()) {
      return;
    }
    attempting = true;
    requestFullscreenOn(TARGET)
      .catch(function () {
        // Bloqueado (falta de gesto do usuário, política da
        // plataforma etc.) — os listeners de interação abaixo
        // tentam de novo na próxima vez, de forma discreta.
      })
      .then(function () {
        attempting = false;
      });
  }

  // 1) Tenta imediatamente. Cobre builds nativas/kiosk/EXE que
  // permitem tela cheia programática sem gesto do usuário.
  request();
  document.addEventListener("DOMContentLoaded", request);
  window.addEventListener("load", request);

  // 2) Fallback universal: a primeira interação do jogador em
  // qualquer lugar da página (toque, clique ou tecla) tenta de
  // novo. Continua ativo durante todo o jogo (não só uma vez): se a
  // tela cheia for encerrada por fora (ex.: Esc/F11), o próximo
  // toque tenta reengajar sozinho, sem repetir pedidos à toa
  // enquanto já está em tela cheia (ver guarda em request()).
  ["pointerdown", "touchend", "mousedown", "keydown"].forEach(function (evt) {
    document.addEventListener(evt, request, { passive: true });
  });

  // Mantém o estado interno sincronizado com o real, inclusive
  // quando o próprio usuário sai da tela cheia manualmente.
  [
    "fullscreenchange",
    "webkitfullscreenchange",
    "mozfullscreenchange",
    "MSFullscreenChange",
  ].forEach(function (evt) {
    document.addEventListener(evt, function () {
      attempting = false;
    });
  });

  return {
    // Solicita entrar em tela cheia agora (sem efeito se já estiver
    // em tela cheia ou se a plataforma não suportar).
    request: request,
    exit: exitFullscreenNow,
    isFullscreen: function () {
      return !!getFullscreenElement();
    },
    isSupported: isSupported,
  };
})();
