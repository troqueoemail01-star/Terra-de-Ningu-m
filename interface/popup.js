/**
 * interface/popup.js
 * -------------------------------------------------
 * Casca unica de pop-up do jogo: o fundo escurecido, o painel
 * translucido e o botao discreto "Fechar" que qualquer janela do jogo
 * usa. Nao sabe o que vai dentro dela — quem monta o conteudo e quem
 * cria o pop-up (hoje: interface/drawer-popup.js e
 * interface/note-reader.js).
 *
 * Visual: exatamente a mesma formula ja usada pela caixa de dialogo e
 * pela tela de Configuracoes (fundo rgba(5,4,8,.72), borda clara
 * sutil, cantos levemente arredondados, fonte BoldsPixels — ver
 * dialogue/dialogue.css e menu/settings.css), para nenhum pop-up novo
 * parecer de outro jogo.
 *
 * Regra fixa, igual a de dialogue/dialogue-box.js: enquanto um pop-up
 * esta na tela, o HUD inteiro (analogico, area de camera, botao
 * "Interagir", inventario) fica escondido, e volta so depois que o
 * pop-up sai. Por ficar aqui dentro, qualquer pop-up futuro ja nasce
 * seguindo a regra. Travar o olhar/movimento do jogador continua
 * sendo de quem chama (scripts/main.js), mesmo padrao da caixa de
 * dialogo.
 *
 * O overlay tambem engole todo evento de ponteiro: nenhum toque
 * atravessa para a area de camera do HUD por baixo, entao a camera
 * principal nunca se mexe por acidente enquanto o pop-up esta aberto.
 *
 * Uso:
 *   const popup = window.Popup.create(container, {
 *     className: "drawer-popup",
 *     titulo: "GAVETA",
 *     aoFechar: function () { ... },
 *   });
 *   popup.corpo.appendChild(algumConteudo);
 *   popup.open();
 * -------------------------------------------------
 */

window.Popup = (function () {
  function create(container, options) {
    options = options || {};

    const overlay = document.createElement("div");
    overlay.className = "game-popup-overlay";
    if (options.className) {
      overlay.classList.add(options.className);
    }

    // Nenhum toque no pop-up pode virar arrasto de camera / toque de
    // avancar dialogo (mesmo cuidado do botao "Interagir" e do
    // "PULAR TUDO" da caixa de dialogo).
    ["pointerdown", "pointermove", "pointerup", "pointercancel"].forEach(function (evt) {
      overlay.addEventListener(evt, function (e) {
        e.stopPropagation();
      });
    });

    const panel = document.createElement("div");
    panel.className = "game-popup-panel";
    overlay.appendChild(panel);

    if (options.titulo) {
      const title = document.createElement("h2");
      title.className = "game-popup-title";
      title.textContent = options.titulo;
      panel.appendChild(title);
    }

    const body = document.createElement("div");
    body.className = "game-popup-body";
    panel.appendChild(body);

    const footer = document.createElement("div");
    footer.className = "game-popup-footer";
    panel.appendChild(footer);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "game-popup-close";
    closeButton.textContent = "Fechar";
    footer.appendChild(closeButton);

    container.appendChild(overlay);

    let open = false;

    function show() {
      if (open) return;
      open = true;
      // Esconde o HUD antes mesmo do fade-in terminar, para nenhum
      // botao de gameplay ficar clicavel por tras do pop-up (ver
      // regra no topo do arquivo).
      window.HUD.setVisible(false);
      overlay.classList.add("game-popup-visible");
    }

    function hide() {
      if (!open) return;
      open = false;
      overlay.classList.remove("game-popup-visible");
      window.HUD.setVisible(true);
    }

    closeButton.addEventListener("click", function () {
      if (typeof options.aoFechar === "function") {
        options.aoFechar();
      } else {
        hide();
      }
    });

    return {
      raiz: overlay,
      painel: panel,
      corpo: body,
      rodape: footer,
      botaoFechar: closeButton,
      open: show,
      close: hide,
      isOpen: function () {
        return open;
      },
    };
  }

  return { create: create };
})();
