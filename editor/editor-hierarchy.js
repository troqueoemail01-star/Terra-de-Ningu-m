/**
 * editor/editor-hierarchy.js
 * -------------------------------------------------
 * PAINEL DA ESQUERDA — hierarquia + pesquisa.
 *
 * Mostra a árvore de objetos do cenário ativo exatamente como ela
 * existe dentro do Three.js (CENÁRIO > grupo > peça), com os nomes
 * legíveis que o registro montou (ver editor/editor-registry.js).
 *
 * É a saída para os dois casos em que tocar no objeto na cena não
 * resolve: peça pequena demais para o dedo e peça escondida dentro
 * de outra. Digitar "telefone" na busca acha o objeto na hora.
 *
 * Filtros rápidos (Tudo / Luzes / Interativos / Cópias / Alterados)
 * existem
 * pelo mesmo motivo: em um cenário grande, rolar uma lista enorme no
 * celular é pior do que qualquer botão.
 * -------------------------------------------------
 */

window.EditorHierarchy = (function () {
  const W = window.EditorWidgets;
  const MAX_RESULTS = 250;

  const FILTERS = [
    { key: "all", label: "Tudo" },
    { key: "lights", label: "Luzes" },
    { key: "interactive", label: "Interativos" },
    // Tudo que foi duplicado dentro do Editor, numa lista só — é por
    // aqui que se acha (e se apaga) uma cópia perdida no cenário.
    { key: "clones", label: "Cópias" },
    // Tudo que foi excluído neste cenário. Objeto excluído sai da cena,
    // mas continua na árvore aqui (riscado): é por este filtro que se
    // acha e se restaura o que sumiu de vista sessões atrás.
    { key: "removed", label: "Excluídos" },
    { key: "changed", label: "Alterados" },
  ];

  function iconFor(entry) {
    if (entry.isCloneRoot) return "▣";
    if (entry.isLight) return "☀";
    if (entry.interactable) return "✦";
    if (entry.object.isInstancedMesh) return "▦";
    if (entry.isMesh) return "◈";
    return "▸";
  }

  function create(api) {
    const root = W.el("div", "editor-panel editor-panel-left");

    // ---------- Cabeçalho ----------
    const head = W.el("div", "editor-panel-head");
    head.appendChild(W.el("div", "editor-panel-title", "HIERARQUIA"));
    head.appendChild(
      W.button("✕", {
        small: true,
        title: "Fechar painel",
        onClick: function () {
          api.togglePanel("left", false);
        },
      })
    );
    root.appendChild(head);

    // ---------- Pesquisa ----------
    const searchRow = W.el("div", "editor-search");
    const searchInput = W.el("input", "editor-input");
    searchInput.type = "search";
    searchInput.placeholder = "Pesquisar objeto...";
    searchRow.appendChild(searchInput);
    searchRow.appendChild(
      W.button("✕", {
        small: true,
        title: "Limpar",
        onClick: function () {
          searchInput.value = "";
          query = "";
          refresh();
        },
      })
    );
    root.appendChild(searchRow);

    // ---------- Filtros ----------
    const filterRow = W.el("div", "editor-filters");
    const filterButtons = {};
    FILTERS.forEach(function (filter) {
      const node = W.button(filter.label, {
        small: true,
        onClick: function () {
          activeFilter = filter.key;
          refresh();
        },
      });
      filterButtons[filter.key] = node;
      filterRow.appendChild(node);
    });
    root.appendChild(filterRow);

    const body = W.el("div", "editor-panel-body");
    root.appendChild(body);

    let query = "";
    let activeFilter = "all";
    const expanded = {};

    searchInput.addEventListener("input", function () {
      query = searchInput.value;
      refresh();
    });

    function makeItem(entry, options) {
      const opts = options || {};
      const item = W.el("div", "editor-tree-item");
      item.style.paddingLeft = 1 + Math.min(opts.depth || 0, 6) * 2.2 + "vmin";

      const hasChildren = entry.children.length > 0 && !opts.flat;
      const caret = W.el(
        "div",
        "editor-tree-caret" + (hasChildren ? "" : " is-leaf"),
        hasChildren ? (expanded[entry.id] ? "▾" : "▸") : "·"
      );
      if (hasChildren) {
        caret.addEventListener("click", function (event) {
          event.stopPropagation();
          expanded[entry.id] = !expanded[entry.id];
          refresh();
        });
      }
      item.appendChild(caret);
      item.appendChild(W.el("div", "editor-tree-icon", iconFor(entry)));

      const label = W.el("div", "editor-tree-label", entry.label);
      if (hasChildren) {
        label.textContent = entry.label + "  (" + entry.children.length + ")";
      }
      item.appendChild(label);

      if (api.registry.isRemoved(entry)) {
        item.classList.add("is-removed");
        const gone = W.el("div", "editor-tree-badge is-removed", "✕");
        gone.title = "Excluído do cenário";
        item.appendChild(gone);
      } else if (!entry.object.visible) {
        const hidden = W.el("div", "editor-tree-icon", "◌");
        hidden.title = "Oculto";
        item.appendChild(hidden);
      }
      if (api.registry.hasOverride(entry)) {
        item.appendChild(W.el("div", "editor-tree-badge", "•"));
      }

      const selection = api.getSelection();
      if (selection && selection.id === entry.id && selection.sceneKey === entry.sceneKey) {
        item.classList.add("is-selected");
      }

      item.addEventListener("click", function () {
        api.select(entry);
      });

      return item;
    }

    function renderTree(entries, depth, container) {
      entries.forEach(function (entry) {
        container.appendChild(makeItem(entry, { depth: depth }));
        if (expanded[entry.id] && entry.children.length) {
          renderTree(entry.children, depth + 1, container);
        }
      });
    }

    function refresh() {
      FILTERS.forEach(function (filter) {
        filterButtons[filter.key].classList.toggle("is-active", filter.key === activeFilter);
      });

      body.innerHTML = "";
      const sceneKey = api.getActiveSceneKey();
      const searching = query.trim().length > 0 || activeFilter !== "all";

      if (searching) {
        const results = api.registry.search(sceneKey, query, activeFilter);
        if (!results.length) {
          body.appendChild(
            W.el("div", "editor-tree-empty", "Nada encontrado neste cenário.")
          );
          return;
        }
        results.slice(0, MAX_RESULTS).forEach(function (entry) {
          body.appendChild(makeItem(entry, { depth: 0, flat: true }));
        });
        if (results.length > MAX_RESULTS) {
          body.appendChild(
            W.el(
              "div",
              "editor-tree-empty",
              "+" + (results.length - MAX_RESULTS) + " resultados. Refine a busca."
            )
          );
        }
        return;
      }

      const roots = api.registry.rootEntries(sceneKey);
      if (!roots.length) {
        body.appendChild(W.el("div", "editor-tree-empty", "Cenário vazio."));
        return;
      }
      renderTree(roots, 0, body);
    }

    /** Abre todos os pais até o objeto ficar visível na árvore. */
    function revealEntry(entry) {
      let node = entry.parent;
      while (node) {
        expanded[node.id] = true;
        node = node.parent;
      }
      refresh();
      const selected = body.querySelector(".is-selected");
      if (selected && selected.scrollIntoView) {
        selected.scrollIntoView({ block: "center" });
      }
    }

    return {
      root: root,
      refresh: refresh,
      revealEntry: revealEntry,
      focusSearch: function () {
        searchInput.focus();
      },
    };
  }

  return { create: create };
})();
