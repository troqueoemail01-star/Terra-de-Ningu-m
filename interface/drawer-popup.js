/**
 * interface/drawer-popup.js
 * -------------------------------------------------
 * Pop-up discreto da GAVETA da escrivaninha: mostra o que esta
 * guardado dentro dela e deixa o jogador pegar um item tocando nele.
 *
 * Nao tem casca propria: monta o conteudo dentro da casca unica de
 * pop-up do jogo (ver interface/popup.js), entao herda de graca o
 * fundo escurecido, o painel translucido, o botao discreto "Fechar",
 * o HUD escondido enquanto esta aberto e o bloqueio de toque para a
 * camera principal.
 *
 * Tambem nao sabe nada sobre a historia nem sobre a gaveta 3D: quem
 * decide quais itens estao la dentro, o que acontece ao escolher um
 * deles e o que fazer ao fechar e scripts/main.js (que, no fechar,
 * empurra a gaveta de volta e devolve o controle ao jogador).
 *
 * Uso:
 *   const gaveta = window.DrawerPopup.create(container);
 *   gaveta.open({
 *     itens: [{ id, nome, icone }],
 *     aoEscolher: function (item) { ... },
 *     aoFechar: function () { ... },
 *   });
 * -------------------------------------------------
 */

window.DrawerPopup = (function () {
  function create(container) {
    let popup = null;
    let list = null;
    let onChoose = null;
    let onClose = null;

    // Montagem preguicosa: o pop-up so existe no DOM depois que o
    // jogador abre a gaveta pela primeira vez.
    function build() {
      popup = window.Popup.create(container, {
        className: "drawer-popup",
        titulo: "GAVETA",
        aoFechar: function () {
          close();
        },
      });

      list = document.createElement("ul");
      list.className = "drawer-popup-list";
      popup.corpo.appendChild(list);
    }

    function buildItem(item) {
      const li = document.createElement("li");

      const button = document.createElement("button");
      button.type = "button";
      button.className = "drawer-popup-item";

      const icon = document.createElement("span");
      icon.className = "drawer-popup-item-icon";
      if (item.icone && window.Inventory) {
        window.Inventory.applyIcon(icon, item.icone, item.iconeEmbutido);
      }
      button.appendChild(icon);

      const label = document.createElement("span");
      label.className = "drawer-popup-item-name";
      label.textContent = item.nome;
      button.appendChild(label);

      button.addEventListener("click", function () {
        if (typeof onChoose === "function") {
          onChoose(item);
        }
      });

      li.appendChild(button);
      return li;
    }

    // Gaveta sem nada dentro (depois que a carta ja foi pega): em vez
    // de um pop-up vazio e sem explicacao, uma linha discreta em
    // italico dizendo que nao ha mais nada ali.
    function buildEmpty() {
      const li = document.createElement("li");
      li.className = "drawer-popup-empty";
      li.textContent = "(vazia)";
      return li;
    }

    function open(options) {
      options = options || {};
      if (!popup) {
        build();
      }

      onChoose = options.aoEscolher || null;
      onClose = options.aoFechar || null;

      list.innerHTML = "";
      const itens = options.itens || [];
      if (itens.length === 0) {
        list.appendChild(buildEmpty());
      } else {
        itens.forEach(function (item) {
          list.appendChild(buildItem(item));
        });
      }

      popup.open();
    }

    // Fecha por qualquer caminho (botao "Fechar" ou item escolhido) e
    // avisa quem abriu — assim a gaveta 3D volta a fechar e o jogador
    // recupera o controle em um lugar so.
    function close() {
      if (!popup || !popup.isOpen()) {
        return;
      }
      popup.close();
      const callback = onClose;
      onChoose = null;
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
