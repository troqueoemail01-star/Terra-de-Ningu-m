/**
 * menu/menu.js
 * -------------------------------------------------
 * Menu principal do jogo — primeira tela exibida ao abrir,
 * antes de qualquer cutscene, diálogo ou gameplay.
 *
 * window.MainMenu.show(onNewGame) monta o menu (vídeo de fundo
 * em loop + botões) e só chama onNewGame() quando o jogador
 * toca em "NOVO JOGO" — nesse momento o menu se encerra e quem
 * chamou (scripts/main.js) segue o fluxo normal do jogo (a
 * mesma Cutscene de introdução + gameplay que já existiam antes
 * do menu, sem nenhuma mudança nelas).
 *
 * "CONFIGURAÇÕES" abre a tela de Configurações (ver
 * menu/settings.js) dentro deste MESMO quadro/vídeo — os botões do
 * menu somem com um fade curto e o painel de Configurações aparece
 * no lugar, sem o vídeo de fundo parar ou reiniciar o loop. "VOLTAR"
 * na tela de Configurações desfaz essa troca.
 *
 * "EDITOR" é um botão de FERRAMENTA DE DESENVOLVIMENTO, não um
 * botão de jogo: ele fica separado dos demais por um traço e um
 * tratamento visual próprio (ver .main-menu-dev-separator e
 * .main-menu-button.is-dev-tool em editor/editor.css). Em vez de
 * começar o jogo, ele chama `onEditor()`, que leva direto ao modo
 * Editor (ver editor/editor-mode.js e scripts/main.js) — sem
 * cutscene de introdução e sem tocar em nada do fluxo normal acima.
 *
 * Os outros dois botões (CONTINUAR, FECHAR JOGO) continuam só
 * tocáveis, respondendo visualmente ao toque (ver menu/menu.css,
 * .main-menu-button:active), mas sem ação própria ainda — de
 * propósito, conforme pedido.
 *
 * Vídeo de fundo em loop: dois <video> com a mesma fonte,
 * alternados. Pouco antes do vídeo em exibição terminar, o
 * outro já começa a tocar do início por baixo, e um crossfade
 * curto (opacidade, ver .main-menu-video-visible) disfarça o
 * corte entre o fim e o começo — mesma ideia de dois vídeos
 * alternados já usada em cutscenes/cutscene-player.js, aqui
 * aplicada a um loop de um único vídeo em vez de uma sequência
 * de partes diferentes.
 * -------------------------------------------------
 */

window.MainMenu = (function () {
  const VIDEO_SRC = "assets/videos/menu-background.mp4";

  // Precisa bater com a transição definida em menu.css
  // (.main-menu-overlay).
  const OVERLAY_FADE_MS = 500;

  // Quanto antes do fim do vídeo o crossfade para o próximo loop
  // começa (precisa bater com a transição de .main-menu-video).
  const CROSSFADE_S = 0.6;

  const BUTTONS = [
    { key: "novo-jogo", label: "NOVO JOGO", action: "new-game" },
    { key: "continuar", label: "CONTINUAR", action: null },
    { key: "configuracoes", label: "CONFIGURAÇÕES", action: "settings" },
    { key: "fechar-jogo", label: "FECHAR JOGO", action: null },
  ];

  function createVideo() {
    const video = document.createElement("video");
    video.className = "main-menu-video";
    video.src = VIDEO_SRC;
    video.muted = true;
    video.volume = 0;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "true");
    video.preload = "auto";
    video.controls = false;
    return video;
  }

  function createButton(entry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "main-menu-button";
    button.textContent = entry.label;
    button.setAttribute("aria-label", entry.label);
    return button;
  }

  // Ferramenta de desenvolvimento — ver o comentário no topo.
  const DEV_BUTTON = { key: "editor", label: "EDITOR", action: "editor" };

  function show(onNewGame, onEditor) {
    const overlay = document.createElement("div");
    overlay.className = "main-menu-overlay";

    // Quadro travado em 16:9 (mesmo formato do vídeo e do jogo) —
    // ver .main-menu-frame em menu.css. Garante que o vídeo nunca
    // seja esticado nem cortado, com barras pretas nas laterais
    // (ou em cima/embaixo) em telas com outra proporção.
    const frame = document.createElement("div");
    frame.className = "main-menu-frame";
    overlay.appendChild(frame);

    // videoA/videoB se revezam entre "tocando agora" e "pronto
    // pro próximo loop" — ver startLoop() abaixo.
    const videoA = createVideo();
    const videoB = createVideo();
    frame.appendChild(videoA);
    frame.appendChild(videoB);

    const buttonsWrap = document.createElement("div");
    buttonsWrap.className = "main-menu-buttons";
    frame.appendChild(buttonsWrap);

    let finished = false;

    // Tela de Configurações: montada aqui dentro do mesmo `frame` (e
    // por cima do mesmo vídeo de fundo em loop, sem interrompê-lo).
    // Começa escondida (ver .settings-panel em menu/settings.css) —
    // só aparece quando o jogador toca em "CONFIGURAÇÕES" abaixo.
    const settingsMenu = window.SettingsMenu.create(frame, {
      onBack: function () {
        settingsMenu.hide();
        buttonsWrap.classList.remove("main-menu-buttons-hidden");
      },
    });

    BUTTONS.forEach(function (entry) {
      const button = createButton(entry);
      buttonsWrap.appendChild(button);

      if (entry.action === "new-game") {
        button.addEventListener("click", function () {
          if (finished) return;
          finished = true;
          startNewGame();
        });
      } else if (entry.action === "settings") {
        button.addEventListener("click", function () {
          if (finished) return;
          buttonsWrap.classList.add("main-menu-buttons-hidden");
          settingsMenu.show();
        });
      }
      // Demais botões: só o feedback visual do toque (CSS
      // :active em menu.css) — nenhuma ação própria por enquanto.
    });

    // ---------- Botão de desenvolvimento (EDITOR) ----------
    // Separado dos botões de jogo de propósito: traço divisório,
    // fonte menor e uma legenda discreta deixando claro que é
    // ferramenta, não conteúdo do jogo.
    if (typeof onEditor === "function") {
      const separator = document.createElement("div");
      separator.className = "main-menu-dev-separator";
      buttonsWrap.appendChild(separator);

      const editorButton = createButton(DEV_BUTTON);
      editorButton.classList.add("is-dev-tool");
      buttonsWrap.appendChild(editorButton);

      const hint = document.createElement("div");
      hint.className = "main-menu-dev-hint";
      hint.textContent = "ferramenta de desenvolvimento";
      buttonsWrap.appendChild(hint);

      editorButton.addEventListener("click", function () {
        if (finished) return;
        finished = true;
        closeMenu(onEditor);
      });
    }

    document.body.appendChild(overlay);

    // ---------- Loop de vídeo com crossfade ----------
    function attemptPlay(video) {
      const p = video.play();
      if (p && p.catch) {
        p.catch(function () {
          // Autoplay bloqueado (raro com vídeo mudo, mas por
          // segurança): tenta de novo no primeiro toque do
          // jogador em qualquer lugar do menu.
          overlay.addEventListener(
            "pointerdown",
            function () {
              video.play().catch(function () {});
            },
            { once: true }
          );
        });
      }
    }

    let current = videoA;
    let next = videoB;
    let crossfading = false;

    current.addEventListener(
      "loadeddata",
      function () {
        current.classList.add("main-menu-video-visible");
        attemptPlay(current);
      },
      { once: true }
    );

    function handleTimeUpdate() {
      if (crossfading || finished) return;
      if (!current.duration || !isFinite(current.duration)) return;
      if (current.duration - current.currentTime > CROSSFADE_S) return;

      // Começa o próximo loop por baixo e faz o crossfade — o
      // corte entre o fim e o começo do vídeo fica disfarçado
      // pela transição suave de opacidade (ver .main-menu-video
      // em menu.css), em vez de um corte brusco.
      crossfading = true;
      next.currentTime = 0;
      attemptPlay(next);
      next.classList.add("main-menu-video-visible");
      current.classList.remove("main-menu-video-visible");

      setTimeout(function () {
        current.pause();
        current.currentTime = 0;
        const swap = current;
        current = next;
        next = swap;
        crossfading = false;
      }, CROSSFADE_S * 1000 + 80);
    }

    videoA.addEventListener("timeupdate", handleTimeUpdate);
    videoB.addEventListener("timeupdate", handleTimeUpdate);

    // ---------- Encerrar o menu ----------
    // Mesmo encerramento para "NOVO JOGO" e para "EDITOR": dispara o
    // destino ENQUANTO o menu ainda cobre a tela por completo e só
    // então começa o fade — mesma estratégia já usada em
    // cutscenes/cutscene-player.js (finishAll), pra nenhum quadro em
    // branco aparecer na transição.
    function closeMenu(destination) {
      videoA.removeEventListener("timeupdate", handleTimeUpdate);
      videoB.removeEventListener("timeupdate", handleTimeUpdate);

      destination();

      overlay.classList.add("main-menu-fade-out");
      videoA.pause();
      videoB.pause();

      let removed = false;
      function remove() {
        if (removed) return;
        removed = true;
        overlay.remove();
      }
      overlay.addEventListener("transitionend", remove, { once: true });
      setTimeout(remove, OVERLAY_FADE_MS + 150); // salvaguarda
    }

    // ---------- "NOVO JOGO" ----------
    function startNewGame() {
      closeMenu(onNewGame);
    }
  }

  return { show: show };
})();
