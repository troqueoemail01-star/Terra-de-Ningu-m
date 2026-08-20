/**
 * interface/note-reader.js
 * -------------------------------------------------
 * Pop-up de LEITURA da carta do Ravi, aberto com a carta na mao
 * direita e o botao "Interagir" ja existente (ver scripts/main.js e
 * scripts/hand-item.js).
 *
 * Layout, na orientacao landscape do jogo:
 *
 *   +-------------------------------------------------+
 *   |                                                 |
 *   |   MODELO 3D          TEXTO DA CARTA             |
 *   |   DA CARTA                                      |
 *   |   [girar/zoom]       Como identificar...        |
 *   |                      1 - ...                    |
 *   |                      2 - ...                    |
 *   |                                                 |
 *   |                                      [Fechar]   |
 *   +-------------------------------------------------+
 *
 * Do lado esquerdo, o MODELO 3D de verdade (nao uma imagem): o mesmo
 * papel amassado do jogo, numa cena/camera/renderer proprios, para o
 * jogador girar e dar zoom sem mexer um milimetro na camera principal
 * (ver models/note-viewer.js). Do lado direito, o texto escrito na
 * carta, na mesma fonte pixelada de todo o resto (BoldsPixels).
 *
 * A casca (fundo escurecido, painel translucido, botao discreto
 * "Fechar", HUD escondido enquanto esta aberto, toques que nao
 * atravessam para a camera) vem inteira de interface/popup.js — este
 * arquivo so monta o conteudo.
 *
 * Montagem preguicosa e reaproveitada: o pop-up e o contexto WebGL do
 * visualizador nascem na PRIMEIRA leitura e sao reutilizados em todas
 * as seguintes. Fechado, o loop de render do visualizador para
 * (`stop()`), entao nao custa nada enquanto o jogador esta jogando.
 * -------------------------------------------------
 */

window.NoteReader = (function () {
  // Texto exatamente como escrito na carta — nenhuma palavra alterada.
  // Cada item vira um paragrafo proprio na tela.
  const LETTER_TEXT = [
    "Como identificar infectados:",
    "1 - Os infectados sofrem muta\u00e7\u00f5es faciais. Caso note algo de incomum no rosto de um indiv\u00edduo, h\u00e1 grandes chances de que ele esteja infectado.",
    "2 - Marcas at\u00edpicas podem surgir pelo corpo, concentrando-se principalmente nos bra\u00e7os e no abd\u00f4men.",
    "At\u00e9 o momento, estas s\u00e3o as informa\u00e7\u00f5es repassadas pela P.H.",
    "Mas lembre-se: caso encontre algu\u00e9m que apresente esses sintomas, \u00e9 fundamental question\u00e1-lo. A presen\u00e7a de um sinal n\u00e3o significa, necessariamente, que a pessoa esteja infectada.",
    "Os visitantes oferecer\u00e3o recursos em troca de abrigo. Caber\u00e1 a voc\u00ea decidir se vale o risco ou n\u00e3o.",
    "Jamais fique sozinho, seu ot\u00e1rio.",
  ];

  const SIGNATURE = "\u2014 Ravi S.";

  function create(container) {
    let popup = null;
    let viewer = null;
    let onClose = null;

    function build() {
      popup = window.Popup.create(container, {
        className: "note-reader",
        aoFechar: function () {
          close();
        },
      });

      const layout = document.createElement("div");
      layout.className = "note-reader-layout";
      popup.corpo.appendChild(layout);

      // ---------- Lado esquerdo: o modelo 3D ----------
      const modelSide = document.createElement("div");
      modelSide.className = "note-reader-model";
      layout.appendChild(modelSide);

      const canvas = document.createElement("canvas");
      canvas.className = "note-reader-canvas";
      // touch-action none: o arrasto aqui e para girar a carta, nunca
      // para rolar a pagina nem para o zoom do navegador.
      canvas.style.touchAction = "none";
      modelSide.appendChild(canvas);

      const hint = document.createElement("p");
      hint.className = "note-reader-hint";
      hint.textContent = "arraste para girar \u00b7 pin\u00e7a para zoom";
      modelSide.appendChild(hint);

      // ---------- Lado direito: o texto da carta ----------
      const textSide = document.createElement("div");
      textSide.className = "note-reader-text";
      layout.appendChild(textSide);

      LETTER_TEXT.forEach(function (paragraph, index) {
        const p = document.createElement("p");
        p.className = index === 0 ? "note-reader-heading" : "note-reader-paragraph";
        p.textContent = paragraph;
        textSide.appendChild(p);
      });

      const signature = document.createElement("p");
      signature.className = "note-reader-signature";
      signature.textContent = SIGNATURE;
      textSide.appendChild(signature);

      // O visualizador so entra depois do canvas estar no DOM.
      viewer = window.NoteViewer.create(canvas);
    }

    function open(options) {
      options = options || {};
      if (!popup) {
        build();
      }
      onClose = options.aoFechar || null;

      // Toda leitura comeca no mesmo enquadramento, mesmo que a
      // anterior tenha terminado com a carta girada de lado.
      viewer.reset();
      popup.open();
      viewer.start();
    }

    function close() {
      if (!popup || !popup.isOpen()) {
        return;
      }
      popup.close();
      viewer.stop();
      const callback = onClose;
      onClose = null;
      if (typeof callback === "function") {
        callback();
      }
    }

    function isOpen() {
      return !!popup && popup.isOpen();
    }

    return { open: open, close: close, isOpen: isOpen };
  }

  return { create: create };
})();
