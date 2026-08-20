/**
 * editor/editor-ui.js
 * -------------------------------------------------
 * CASCA DA INTERFACE DO EDITOR.
 *
 * Monta e governa tudo que aparece na tela no modo Editor:
 * barra superior, os dois painéis retráteis (hierarquia e
 * propriedades), o analógico de navegação, os botões SUBIR/DESCER,
 * a barra de ferramentas, o botão de duplicar, o aviso do objeto
 * selecionado, os avisos curtos e as caixas de confirmação.
 *
 * Este arquivo NÃO sabe nada de Three.js. Ele só desenha e avisa o
 * cérebro do Editor (editor/editor-mode.js) através do objeto `api`.
 * É essa separação que deixa a interface crescer depois (adicionar
 * objeto, clima, partículas, áudio...) sem embolar com a lógica 3D.
 *
 * Toda a interface vive DENTRO do #game-container, ou seja, dentro
 * do mesmo quadro 16:9 do jogo — nunca invade a barra preta do
 * letterbox, em nenhum aparelho.
 * -------------------------------------------------
 */

window.EditorUI = (function () {
  const W = window.EditorWidgets;

  const MODES = [
    { key: "translate", label: "✥", title: "Mover" },
    { key: "rotate", label: "⟳", title: "Rotacionar" },
    { key: "scale", label: "⤢", title: "Escalar" },
  ];

  function create(container, api) {
    const root = W.el("div", "editor-root");

    // ---------- Camada de toque do cenário ----------
    const world = W.el("div", "editor-world");
    root.appendChild(world);

    // ---------- Barra superior ----------
    const topbar = W.el("div", "editor-topbar");
    topbar.appendChild(W.el("div", "editor-brand", "EDITOR"));

    const sceneTabs = W.el("div", "editor-scene-tabs");
    const sceneButtons = {};
    topbar.appendChild(sceneTabs);

    topbar.appendChild(W.el("div", "editor-spacer"));

    const dirtyDot = W.el("div", "editor-dirty-dot");
    dirtyDot.title = "Existem alterações não salvas";
    topbar.appendChild(dirtyDot);

    const saveButton = W.button("SALVAR", {
      variant: "primary",
      onClick: function () {
        api.save();
      },
    });
    topbar.appendChild(saveButton);

    topbar.appendChild(
      W.button("⋯", {
        title: "Mais opções",
        onClick: openDataMenu,
      })
    );

    topbar.appendChild(
      W.button("SAIR", {
        variant: "danger",
        onClick: function () {
          api.exit();
        },
      })
    );

    root.appendChild(topbar);

    // ---------- Painéis ----------
    const hierarchy = window.EditorHierarchy.create(api);
    const inspector = window.EditorInspector.create(api);
    root.appendChild(hierarchy.root);
    root.appendChild(inspector.root);

    const handleLeft = W.el("div", "editor-handle editor-handle-left", "☰");
    handleLeft.title = "Abrir hierarquia";
    handleLeft.addEventListener("click", function () {
      togglePanel("left", true);
    });
    root.appendChild(handleLeft);

    const handleRight = W.el("div", "editor-handle editor-handle-right", "⚙");
    handleRight.title = "Abrir propriedades";
    handleRight.addEventListener("click", function () {
      togglePanel("right", true);
    });
    root.appendChild(handleRight);

    // ---------- Objeto selecionado ----------
    const chip = W.el("div", "editor-selection-chip", "Nada selecionado");
    root.appendChild(chip);

    // ---------- Analógico + subir/descer ----------
    const pad = W.el("div", "editor-pad");
    const knob = W.el("div", "editor-pad-knob");
    pad.appendChild(knob);
    root.appendChild(pad);
    setupPad(pad, knob);

    const updown = W.el("div", "editor-updown");
    const upButton = W.button("▲", { title: "Subir" });
    const downButton = W.button("▼", { title: "Descer" });
    updown.appendChild(upButton);
    updown.appendChild(downButton);
    root.appendChild(updown);
    setupHold(upButton, 1);
    setupHold(downButton, -1);

    // ---------- Ferramentas ----------
    const tools = W.el("div", "editor-tools");
    const modeButtons = {};
    MODES.forEach(function (mode) {
      const node = W.button(mode.label, {
        title: mode.title,
        onClick: function () {
          api.setGizmoMode(mode.key);
        },
      });
      modeButtons[mode.key] = node;
      tools.appendChild(node);
    });

    // ---------- Duplicar ----------
    // Mora ao lado de mover/girar/escalar porque é a mesma família: age
    // no objeto SELECIONADO. Fica apagado enquanto nada estiver
    // selecionado, em vez de reclamar depois do toque. A cópia nasce ao
    // lado do original e já selecionada, então o gizmo continua na mão:
    // duplicar, arrastar, duplicar, arrastar (ver editor-clones.js).
    //
    // Escrito por extenso, e não com um ícone: a fonte do jogo
    // (BoldsPixels) não tem símbolo de duplicar, e palavra não depende
    // de a fonte do aparelho ter o desenho certo.
    const duplicateButton = W.button("DUPLICAR", {
      small: true,
      title: "Duplicar objeto selecionado",
      onClick: function () {
        api.duplicateSelection();
      },
    });
    tools.appendChild(duplicateButton);

    // ---------- Excluir ----------
    // Vizinho do DUPLICAR porque é o par dele: um cria, o outro tira.
    // Sempre pergunta antes (ver requestDelete em editor-mode.js): dedo
    // no celular escorrega, e o botão fica a um toque do gizmo.
    //
    // Quando o objeto selecionado JÁ está excluído, o mesmo botão vira
    // RESTAURAR - em vez de um botão morto na barra, o caminho de volta
    // fica no lugar onde a pessoa acabou de tocar.
    const deleteButton = W.button("EXCLUIR", {
      small: true,
      title: "Excluir objeto selecionado",
      onClick: function () {
        const selection = api.getSelection();
        if (selection && api.isRemovedSelf(selection)) {
          api.restoreEntry(selection);
        } else {
          api.requestDelete();
        }
      },
    });
    tools.appendChild(deleteButton);

    tools.appendChild(W.el("div", "editor-tools-divider"));

    const flyButton = W.button("VOO", {
      small: true,
      onClick: function () {
        api.toggleFly();
      },
    });
    const noClipButton = W.button("NO-CLIP", {
      small: true,
      onClick: function () {
        api.toggleNoClip();
      },
    });
    tools.appendChild(flyButton);
    tools.appendChild(noClipButton);

    tools.appendChild(W.el("div", "editor-tools-divider"));

    // ---------- Horário do cenário ----------
    // Um toque alterna NOITE <-> DIA na hora, sem fade e sem cutscene:
    // é a MESMA virada da sequência de dormir (luz da manhã, céu da
    // janela, grama/estrada/floresta, névoa e neblina), aplicada sob
    // demanda nos dois cenários de uma vez — ver setTimeOfDay() em
    // scripts/main.js. O rótulo mostra o horário em vigor AGORA (ver
    // updateToolStates mais abaixo), em vez do que o toque vai fazer:
    // no meio de uma edição interessa saber em que estado o cenário
    // está, e o ícone aceso já diz isso de longe.
    //
    // Fica aqui, na barra de ferramentas, e não no painel de
    // propriedades: aquele painel só mostra o objeto selecionado, e
    // horário não é propriedade de objeto nenhum — é estado do
    // cenário inteiro, igual a VOO e NO-CLIP, que moram ao lado.
    const timeButton = W.button("☾ NOITE", {
      small: true,
      onClick: function () {
        api.setTimeOfDay(api.getTimeOfDay() === "dia" ? "noite" : "dia");
      },
    });
    tools.appendChild(timeButton);

    tools.appendChild(W.el("div", "editor-tools-divider"));

    const undoButton = W.button("↶", {
      title: "Desfazer",
      onClick: function () {
        api.undo();
      },
    });
    const redoButton = W.button("↷", {
      title: "Refazer",
      onClick: function () {
        api.redo();
      },
    });
    tools.appendChild(undoButton);
    tools.appendChild(redoButton);

    tools.appendChild(
      W.button("⚙", {
        title: "Navegação e ajustes",
        onClick: openSettingsMenu,
      })
    );

    root.appendChild(tools);

    // ---------- Aviso curto ----------
    const toastNode = W.el("div", "editor-toast");
    root.appendChild(toastNode);
    let toastTimer = null;

    function toast(message) {
      toastNode.textContent = message;
      toastNode.classList.add("is-on");
      if (toastTimer) window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () {
        toastNode.classList.remove("is-on");
      }, 1800);
    }

    container.appendChild(root);

    // ---------- Painéis: abrir/fechar ----------
    const panelState = { left: false, right: true };

    function togglePanel(side, open) {
      const value = open === undefined ? !panelState[side] : !!open;
      panelState[side] = value;
      const panel = side === "left" ? hierarchy.root : inspector.root;
      panel.classList.toggle("is-closed", !value);
      (side === "left" ? handleLeft : handleRight).classList.toggle("editor-hidden", value);
    }

    togglePanel("left", false);
    togglePanel("right", true);

    // ---------- Analógico ----------
    function setupPad(padNode, knobNode) {
      let active = false;
      let pointerId = null;
      const radius = 0.5;

      function updateFromEvent(event) {
        const rect = padNode.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = (event.clientX - cx) / (rect.width / 2);
        let dy = (event.clientY - cy) / (rect.height / 2);
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 1) {
          dx /= length;
          dy /= length;
        }
        knobNode.style.transform =
          "translate(" + dx * radius * rect.width + "px," + dy * radius * rect.height + "px)";
        // dy negativo (dedo para cima) = andar para frente
        api.camera.setMove({ x: dx, y: -dy });
      }

      padNode.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        active = true;
        pointerId = event.pointerId;
        if (padNode.setPointerCapture) padNode.setPointerCapture(pointerId);
        updateFromEvent(event);
      });
      padNode.addEventListener("pointermove", function (event) {
        if (!active || event.pointerId !== pointerId) return;
        event.preventDefault();
        updateFromEvent(event);
      });
      function release(event) {
        if (!active || (event && event.pointerId !== pointerId)) return;
        active = false;
        knobNode.style.transform = "";
        api.camera.setMove({ x: 0, y: 0 });
      }
      padNode.addEventListener("pointerup", release);
      padNode.addEventListener("pointercancel", release);
      padNode.addEventListener("pointerleave", release);
    }

    function setupHold(buttonNode, direction) {
      buttonNode.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        api.camera.setVertical(direction);
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach(function (name) {
        buttonNode.addEventListener(name, function () {
          api.camera.setVertical(0);
        });
      });
    }

    // ---------- Modais ----------
    let modalNode = null;

    function closeModal() {
      if (modalNode && modalNode.parentNode) {
        modalNode.parentNode.removeChild(modalNode);
      }
      modalNode = null;
    }

    function openModal(options) {
      closeModal();
      const overlay = W.el("div", "editor-modal");
      const card = W.el("div", "editor-modal-card");
      overlay.appendChild(card);

      if (options.title) {
        card.appendChild(W.el("div", "editor-modal-title", options.title));
      }
      if (options.text) {
        card.appendChild(W.el("div", "editor-modal-text", options.text));
      }
      if (options.content) {
        card.appendChild(options.content);
      }

      const actions = W.el("div", "editor-modal-actions");
      (options.actions || []).forEach(function (action) {
        actions.appendChild(
          W.button(action.label, {
            variant: action.variant,
            onClick: function () {
              if (action.keepOpen !== true) closeModal();
              if (action.onClick) action.onClick();
            },
          })
        );
      });
      card.appendChild(actions);

      overlay.addEventListener("click", function (event) {
        if (event.target === overlay && options.dismissible !== false) {
          closeModal();
        }
      });

      root.appendChild(overlay);
      modalNode = overlay;
      return overlay;
    }

    function confirm(options) {
      openModal({
        title: options.title,
        text: options.text,
        actions: [
          { label: options.cancelLabel || "CANCELAR" },
          {
            label: options.confirmLabel || "CONFIRMAR",
            variant: options.variant || "danger",
            onClick: options.onConfirm,
          },
        ],
      });
    }

    function menu(title, items) {
      const list = W.el("div", "editor-field");
      items.forEach(function (item) {
        if (!item) return;
        const node = W.button(item.label, {
          variant: item.variant,
          onClick: function () {
            closeModal();
            item.onClick();
          },
        });
        node.style.width = "100%";
        node.style.justifyContent = "flex-start";
        list.appendChild(node);
      });
      openModal({ title: title, content: list, actions: [{ label: "FECHAR" }] });
    }

    function textModal(options) {
      const area = W.el("textarea", "editor-textarea");
      area.value = options.value || "";
      area.readOnly = !!options.readOnly;
      area.spellcheck = false;

      openModal({
        title: options.title,
        text: options.text,
        content: area,
        actions: (options.actions || []).concat([{ label: "FECHAR" }]).map(function (action) {
          return {
            label: action.label,
            variant: action.variant,
            onClick: action.onClick
              ? function () {
                  action.onClick(area.value);
                }
              : undefined,
          };
        }),
      });
      if (options.selectAll) {
        area.focus();
        area.select();
      }
    }

    // ---------- Menus da barra superior ----------

    function openDataMenu() {
      menu("DADOS DO EDITOR", [
        {
          label: "↻  RECARREGAR salvos",
          onClick: function () {
            confirm({
              title: "Recarregar",
              text: "Descartar o que não foi salvo e recarregar as alterações gravadas?",
              confirmLabel: "RECARREGAR",
              variant: "danger",
              onClick: null,
              onConfirm: api.reloadSaved,
            });
          },
        },
        {
          label: "⌫  RESETAR alterações",
          variant: "danger",
          onClick: function () {
            confirm({
              title: "Resetar alterações",
              text:
                "Isto devolve TODOS os objetos aos valores originais do jogo, apaga as cópias que você duplicou e limpa as alterações salvas neste aparelho. Não dá para desfazer depois de salvar.",
              confirmLabel: "RESETAR TUDO",
              onConfirm: api.resetAll,
            });
          },
        },
        {
          label: "↑  EXPORTAR JSON",
          onClick: function () {
            textModal({
              title: "Exportar alterações",
              text:
                "Copie este JSON para data/editor-overrides.json se quiser que as alterações viajem junto com a build do jogo.",
              value: api.exportJSON(),
              readOnly: true,
              selectAll: true,
              actions: [
                {
                  label: "BAIXAR",
                  onClick: function () {
                    api.downloadJSON();
                  },
                },
              ],
            });
          },
        },
        {
          label: "↓  IMPORTAR JSON",
          onClick: function () {
            textModal({
              title: "Importar alterações",
              text: "Cole aqui um JSON exportado antes. Isto substitui as alterações atuais.",
              value: "",
              actions: [
                {
                  label: "IMPORTAR",
                  variant: "primary",
                  onClick: function (value) {
                    api.importJSON(value);
                  },
                },
              ],
            });
          },
        },
        {
          label: "ⓘ  Onde as alterações ficam",
          onClick: function () {
            openModal({
              title: "Persistência",
              text:
                "As alterações NÃO entram nos arquivos originais do jogo. Elas ficam em uma camada separada (armazenamento local do aparelho + o arquivo opcional data/editor-overrides.json) e são aplicadas por cima da cena toda vez que o jogo abre. Por isso continuam valendo depois de uma atualização do jogo.",
              actions: [{ label: "ENTENDI" }],
            });
          },
        },
      ]);
    }

    function openSettingsMenu() {
      const content = W.el("div", "editor-field");

      content.appendChild(
        W.sliderField({
          label: "Velocidade da câmera",
          value: api.camera.getSpeedMultiplier(),
          min: 0.25,
          max: 8,
          step: 0.25,
          precision: 2,
          format: function (value) {
            return value.toFixed(2) + "x";
          },
          onChange: function (value) {
            api.camera.setSpeedMultiplier(value);
          },
        }).root
      );

      content.appendChild(
        W.selectField({
          label: "Encaixe (mover)",
          value: String(api.getTranslateSnap()),
          options: [
            { value: "0", label: "Livre" },
            { value: "0.05", label: "5 cm" },
            { value: "0.1", label: "10 cm" },
            { value: "0.25", label: "25 cm" },
            { value: "0.5", label: "50 cm" },
          ],
          onChange: function (value) {
            api.setTranslateSnap(parseFloat(value));
          },
        }).root
      );

      content.appendChild(
        W.selectField({
          label: "Encaixe (girar)",
          value: String(api.getRotateSnapDegrees()),
          options: [
            { value: "0", label: "Livre" },
            { value: "5", label: "5°" },
            { value: "15", label: "15°" },
            { value: "45", label: "45°" },
            { value: "90", label: "90°" },
          ],
          onChange: function (value) {
            api.setRotateSnapDegrees(parseFloat(value));
          },
        }).root
      );

      // Mesma troca do botão ☾/☀ da barra de ferramentas, aqui com o
      // nome por extenso: é onde quem abriu o menu procurando por
      // "horário" vai olhar. Os dois chamam exatamente o mesmo caminho.
      content.appendChild(
        W.selectField({
          label: "Horário do cenário",
          value: api.getTimeOfDay(),
          options: [
            { value: "noite", label: "Noite" },
            { value: "dia", label: "Dia" },
          ],
          onChange: function (value) {
            api.setTimeOfDay(value);
          },
        }).root
      );

      content.appendChild(
        W.el(
          "div",
          "editor-note",
          "Vira o dia inteiro de uma vez nos dois cenários: luz da manhã, céu da janela, grama, estrada, floresta, névoa e neblina. Serve para conferir o cenário nos dois estados — não é salvo e não muda o jogo, que continua começando de noite e amanhecendo só depois de dormir."
        )
      );

      content.appendChild(
        W.toggleField({
          label: "Ver caixas de colisão",
          value: api.isCollisionViewOn(),
          onChange: function (value) {
            api.setCollisionView(value);
          },
        }).root
      );

      content.appendChild(
        W.toggleField({
          label: "Resolução alta no Editor",
          value: api.isHighResolution(),
          onChange: function (value) {
            api.setHighResolution(value);
          },
        }).root
      );

      content.appendChild(
        W.el(
          "div",
          "editor-note",
          "O jogo roda em 320x180 de propósito (visual PS1). A resolução alta vale só dentro do Editor, para dar precisão ao toque — o gameplay não muda."
        )
      );

      openModal({ title: "NAVEGAÇÃO E AJUSTES", content: content, actions: [{ label: "FECHAR" }] });
    }

    // ---------- Atualizações vindas do cérebro ----------

    function setSceneTabs(scenes, activeKey) {
      sceneTabs.innerHTML = "";
      scenes.forEach(function (scene) {
        const node = W.button(scene.label, {
          small: true,
          onClick: function () {
            api.setActiveScene(scene.key);
          },
        });
        node.classList.toggle("is-active", scene.key === activeKey);
        sceneButtons[scene.key] = node;
        sceneTabs.appendChild(node);
      });
    }

    function setSelection(entry) {
      chip.textContent = entry
        ? (api.isRemovedSelf(entry) ? "✕ " : "") + entry.label
        : "Nada selecionado";
      chip.classList.toggle("is-removed", !!entry && api.isRemoved(entry));
      inspector.setEntry(entry);
      hierarchy.refresh();
      updateToolStates();
    }

    function setDirty(value) {
      dirtyDot.classList.toggle("is-on", !!value);
    }

    function updateToolStates() {
      const mode = api.getGizmoMode();
      MODES.forEach(function (item) {
        modeButtons[item.key].classList.toggle("is-active", item.key === mode);
      });
      flyButton.classList.toggle("is-active", api.camera.isFlyMode());
      noClipButton.classList.toggle("is-active", api.camera.isNoClip());

      // Horário: o rótulo é o estado ATUAL do cenário, e o botão só
      // fica aceso de dia (a noite é o estado normal do jogo).
      const isDay = api.getTimeOfDay() === "dia";
      timeButton.textContent = isDay ? "☀ DIA" : "☾ NOITE";
      timeButton.title = isDay
        ? "Horário: DIA — tocar para voltar à NOITE"
        : "Horário: NOITE — tocar para ver de DIA";
      timeButton.classList.toggle("is-active", isDay);
      // Duplicar e excluir dependem de ter algo selecionado.
      const selection = api.getSelection();
      const removed = !!selection && api.isRemovedSelf(selection);
      duplicateButton.disabled = !selection || api.isRemoved(selection);
      deleteButton.disabled = !selection || (!removed && api.isRemoved(selection));
      deleteButton.textContent = removed ? "RESTAURAR" : "EXCLUIR";
      deleteButton.title = removed
        ? "Devolver este objeto ao cenário"
        : "Excluir objeto selecionado";
      deleteButton.classList.toggle("is-active", removed);
      undoButton.disabled = !api.history.canUndo();
      redoButton.disabled = !api.history.canRedo();
    }

    function setInterfaceVisible(visible) {
      [topbar, hierarchy.root, inspector.root, tools, pad, updown, chip].forEach(function (node) {
        node.classList.toggle("editor-hidden", !visible);
      });
    }

    function destroy() {
      closeModal();
      if (root.parentNode) {
        root.parentNode.removeChild(root);
      }
    }

    return {
      root: root,
      world: world,
      hierarchy: hierarchy,
      inspector: inspector,
      togglePanel: togglePanel,
      setSceneTabs: setSceneTabs,
      setSelection: setSelection,
      setDirty: setDirty,
      updateToolStates: updateToolStates,
      setInterfaceVisible: setInterfaceVisible,
      toast: toast,
      confirm: confirm,
      menu: menu,
      openModal: openModal,
      closeModal: closeModal,
      textModal: textModal,
      destroy: destroy,
    };
  }

  return { create: create };
})();
