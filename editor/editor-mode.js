/**
 * editor/editor-mode.js
 * -------------------------------------------------
 * O CÉREBRO DO EDITOR — costura tudo.
 *
 * Recebe do jogo (scripts/main.js) um "contexto": a MESMA cena, a
 * MESMA câmera, o MESMO renderer, os MESMOS cenários já construídos.
 * Nada é recriado aqui. O Editor é uma camada de controle por cima
 * do que já está rodando.
 *
 * Do que este arquivo cuida:
 *   - entrada de toque no cenário (girar câmera / selecionar / gizmo);
 *   - seleção e destaque do objeto escolhido;
 *   - tradução de cada edição em DELTA salvo (editor-overrides.js);
 *   - duplicar (editor-clones.js) e excluir objeto/cópia;
 *   - desfazer/refazer por cima desse mesmo delta;
 *   - salvar, recarregar, resetar, exportar e importar;
 *   - sair do Editor sem deixar sujeira para trás.
 *
 * Ponto importante do desfazer: em vez de guardar "o que mudou", ele
 * guarda o RETRATO do delta do objeto antes e depois. Restaurar é
 * reescrever o delta e reaplicá-lo por cima do valor original. Isso
 * faz qualquer edição (transformação, luz, material, textura,
 * visibilidade) usar o mesmo caminho de desfazer, sem código
 * específico para cada tipo.
 * -------------------------------------------------
 */

window.EditorMode = (function () {
  const TAP_MOVE_LIMIT = 14; // px — acima disso o gesto virou "girar câmera"
  const TAP_TIME_LIMIT = 450; // ms
  const SYNC_INTERVAL = 1.0; // s — procura por modelos .glb que chegaram depois
  const EPSILON = 1e-6;

  function round6(value) {
    return Math.round(value * 1e6) / 1e6;
  }

  function start(context) {
    const registry = window.EditorRegistry;
    const overrides = window.EditorOverrides;
    const textures = window.EditorTextures;
    const clones = window.EditorClones;

    // Descobre por onde o SALVAR pode gravar na pasta do jogo
    // (servidor local ou pasta ja autorizada).
    if (window.EditorFileSystem) {
      window.EditorFileSystem.init();
    }

    const scene = context.scene;
    const camera = context.camera;
    const renderer = context.renderer;
    const container = context.container;

    // Editor aberto: nenhuma copia e refeita por conta propria daqui
    // para frente (ver freezeRebuild em editor/editor-clones.js).
    if (clones && clones.freezeRebuild) clones.freezeRebuild();

    let active = true;
    let selection = null;
    let pending = null;
    let syncClock = 0;
    let highResolution = false;
    let collisionView = false;
    let translateSnap = 0;
    let rotateSnapDegrees = 0;

    // ---------- Câmera livre ----------
    const editorCamera = window.EditorCamera.create(camera, {
      getSolids: context.getActiveSolids,
      getBounds: function () {
        return { minY: 0, maxY: context.config.height || 3 };
      },
      radius: context.config.playerRadius || 0.28,
    });
    editorCamera.syncFromCamera();

    // ---------- Destaque da seleção ----------
    const selectionBox = new THREE.BoxHelper(undefined, 0x9dff7d);
    selectionBox.userData.__editorHelper = true;
    selectionBox.material.depthTest = false;
    selectionBox.material.transparent = true;
    selectionBox.material.opacity = 0.95;
    selectionBox.renderOrder = 8999;
    selectionBox.visible = false;
    scene.add(selectionBox);

    // ---------- Caixas de colisão (ajuda visual) ----------
    const collisionGroup = new THREE.Group();
    collisionGroup.userData.__editorHelper = true;
    collisionGroup.visible = false;
    scene.add(collisionGroup);

    // ---------- Gizmo ----------
    const gizmo = window.EditorGizmo.create(scene, camera);

    // ---------- Histórico ----------
    const history = window.EditorHistory.create(function () {
      if (ui) ui.updateToolStates();
    });

    // ---------- Delta: leitura e escrita ----------

    function snapshotOverride(entry) {
      const current = overrides.get(entry.sceneKey, entry.id);
      return current ? JSON.parse(JSON.stringify(current)) : null;
    }

    function restoreOverride(entry, snapshot) {
      // Reprocura pelo id: um objeto pode ter sido recriado no meio do
      // caminho (é o caso de uma cópia que saiu e voltou pelo desfazer),
      // e aí a entrada guardada na função é a antiga. Sem isto, o valor
      // certo iria para um objeto que não está mais na cena.
      const target = registry.findById(entry.sceneKey, entry.id) || entry;
      overrides.setEntry(target.sceneKey, target.id, snapshot);
      registry.applyEntry(target, snapshot || {});
      if (selection && selection.id === target.id) {
        refreshInspector(true);
      }
      markDirty();
      if (ui) ui.hierarchy.refresh();
    }

    /**
     * Todo caminho de edição passa por aqui: garante o retrato
     * "antes", aplica a mudança e, quando o gesto termina
     * (`commit`), fecha uma etapa de desfazer.
     */
    function mutate(entry, label, applyFn, commit) {
      const key = entry.sceneKey + "|" + entry.id + "|" + label;
      if (!pending || pending.key !== key) {
        pending = { key: key, entry: entry, before: snapshotOverride(entry) };
      }
      applyFn();
      markDirty();

      if (commit) {
        const target = pending.entry;
        const before = pending.before;
        const after = snapshotOverride(target);
        pending = null;
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          history.push({
            label: label,
            undo: function () {
              restoreOverride(target, before);
            },
            redo: function () {
              restoreOverride(target, after);
            },
          });
        }
        if (ui) ui.hierarchy.refresh();
      }
    }

    function writeVector(entry, kind) {
      const obj = entry.object;
      const original = entry.original[kind];
      const hint = registry.hintFor(entry);
      ["x", "y", "z"].forEach(function (axis, index) {
        const value = obj[kind][axis];
        if (Math.abs(value - original[index]) < EPSILON) {
          overrides.clearPath(entry.sceneKey, entry.id, kind + "." + axis);
        } else {
          overrides.setPath(entry.sceneKey, entry.id, kind + "." + axis, round6(value), hint);
        }
      });
    }

    function writeScalar(entry, path, value, originalValue) {
      if (
        originalValue !== undefined &&
        typeof value === "number" &&
        Math.abs(value - originalValue) < EPSILON
      ) {
        overrides.clearPath(entry.sceneKey, entry.id, path);
        return;
      }
      if (value === originalValue) {
        overrides.clearPath(entry.sceneKey, entry.id, path);
        return;
      }
      overrides.setPath(
        entry.sceneKey,
        entry.id,
        path,
        typeof value === "number" ? round6(value) : value,
        registry.hintFor(entry)
      );
    }

    function currentOverride(entry) {
      return overrides.get(entry.sceneKey, entry.id) || {};
    }

    // ---------- Ações de edição ----------

    function setTransform(entry, kind, axis, value, commit) {
      mutate(
        entry,
        "Mudar " + kind,
        function () {
          entry.object[kind][axis] = value;
          writeVector(entry, kind);
        },
        commit
      );
    }

    function setScaleUniform(entry, axis, value, factor, commit) {
      mutate(
        entry,
        "Escalar",
        function () {
          const scale = entry.object.scale;
          if (isFinite(factor) && factor > 0 && Math.abs(factor - 1) > 1e-9) {
            scale.x = axis === "x" ? value : scale.x * factor;
            scale.y = axis === "y" ? value : scale.y * factor;
            scale.z = axis === "z" ? value : scale.z * factor;
          } else {
            scale[axis] = value;
          }
          writeVector(entry, "scale");
        },
        commit
      );
    }

    function resetTransform(entry) {
      mutate(
        entry,
        "Voltar transformação",
        function () {
          ["position", "rotation", "scale"].forEach(function (kind) {
            const original = entry.original[kind];
            entry.object[kind].set(original[0], original[1], original[2]);
            overrides.clearPath(entry.sceneKey, entry.id, kind + ".x");
            overrides.clearPath(entry.sceneKey, entry.id, kind + ".y");
            overrides.clearPath(entry.sceneKey, entry.id, kind + ".z");
          });
        },
        true
      );
      refreshInspector(true);
    }

    function setVisible(entry, value) {
      mutate(
        entry,
        "Visibilidade",
        function () {
          entry.object.visible = !!value;
          if (!!value === !!entry.original.visible) {
            overrides.clearPath(entry.sceneKey, entry.id, "visible");
          } else {
            overrides.setPath(entry.sceneKey, entry.id, "visible", !!value, registry.hintFor(entry));
          }
        },
        true
      );
    }

    function setLight(entry, prop, value, commit) {
      const original = entry.original.light || {};
      mutate(
        entry,
        "Luz: " + prop,
        function () {
          writeScalar(entry, "light." + prop, value, original[prop]);
          registry.applyEntry(entry, currentOverride(entry));
        },
        commit
      );
    }

    function setMaterial(entry, prop, value, commit) {
      const original = entry.original.material || {};
      mutate(
        entry,
        "Material: " + prop,
        function () {
          writeScalar(entry, "material." + prop, value, original[prop]);
          // Opacidade abaixo de 1 sem "transparent" não faz nada no
          // Three.js — liga junto para o resultado ser o esperado.
          if (prop === "opacity" && value < 1) {
            overrides.setPath(entry.sceneKey, entry.id, "material.transparent", true, registry.hintFor(entry));
          }
          registry.applyEntry(entry, currentOverride(entry));
        },
        commit
      );
    }

    function setTexture(entry, key) {
      mutate(
        entry,
        "Textura",
        function () {
          if (!key) {
            overrides.clearPath(entry.sceneKey, entry.id, "material.map");
          } else {
            overrides.setPath(entry.sceneKey, entry.id, "material.map", key, registry.hintFor(entry));
            // Imagem de arquivo ainda não carregada: aplica assim que
            // chegar, sem travar a interface.
            textures.resolve(key, function () {
              registry.applyEntry(entry, currentOverride(entry));
            });
          }
          registry.applyEntry(entry, currentOverride(entry));
        },
        true
      );
    }

    function resetEntry(entry) {
      const before = snapshotOverride(entry);
      overrides.setEntry(entry.sceneKey, entry.id, null);
      registry.resetEntry(entry);
      markDirty();
      history.push({
        label: "Resetar objeto",
        undo: function () {
          restoreOverride(entry, before);
        },
        redo: function () {
          restoreOverride(entry, null);
        },
      });
      refreshInspector(true);
      if (ui) ui.hierarchy.refresh();
      if (ui) ui.toast("Objeto restaurado");
    }

    // ---------- Duplicar (cópias) ----------
    // A cópia é criada pelo editor-clones.js e, a partir do instante em
    // que nasce, é um objeto como qualquer outro: gizmo, inspetor,
    // hierarquia, delta e SALVAR funcionam nela sem caso especial. Aqui
    // só amarramos as pontas: para onde ela nasce, quem fica
    // selecionado e como o desfazer traz de volta.

    /**
     * Empurrão inicial: para o lado direito de QUEM ESTÁ OLHANDO, do
     * tamanho do próprio objeto. Cópia nascendo dentro do original
     * pareceria que nada aconteceu.
     */
    function duplicateOffsetFor(entry) {
      let step = 0.3;
      try {
        const box = new THREE.Box3().setFromObject(entry.object);
        if (!box.isEmpty()) {
          const size = box.getSize(new THREE.Vector3());
          step = Math.max(size.x, size.z);
        }
      } catch (e) {
        /* objeto sem geometria: fica no empurrão padrão */
      }
      step = Math.min(Math.max(step * 1.05, 0.12), 1.2);

      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      right.y = 0;
      if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
      return right.normalize().multiplyScalar(step);
    }

    function hasSkinnedMesh(object) {
      let found = false;
      object.traverse(function (node) {
        if (node.isSkinnedMesh) found = true;
      });
      return found;
    }

    function duplicateSelection() {
      if (!selection) {
        if (ui) ui.toast("Escolha um objeto para duplicar");
        return null;
      }
      // Duplicar um objeto excluído geraria uma cópia que nasce excluída
      // (a cópia herda o delta do original, `removed` incluído): sumiria
      // na hora e pareceria defeito.
      if (registry.isRemoved(selection) || registry.isInsideRemoved(selection)) {
        if (ui) ui.toast("Objeto excluído · restaure antes de duplicar");
        return null;
      }

      const result = clones.duplicate(selection, {
        offsetWorld: duplicateOffsetFor(selection),
      });

      if (!result || !result.entry) {
        const error = result ? result.error : null;
        if (ui) {
          ui.toast(
            error === "limite"
              ? "Muitas cópias neste cenário (limite " + clones.MAX_PER_SCENE + ")"
              : "Não foi possível duplicar este objeto"
          );
        }
        return null;
      }

      const created = result.entry;
      const sceneKey = created.sceneKey;
      const cloneId = created.id;
      let snapshot = clones.snapshot(sceneKey, cloneId);

      history.push({
        label: "Duplicar",
        undo: function () {
          const entry = registry.findById(sceneKey, cloneId);
          if (entry) {
            snapshot = clones.remove(entry) || snapshot;
          }
          if (selection && isInside(selection.id, cloneId)) select(null);
          markDirty();
          refreshInspector(true);
          if (ui) ui.hierarchy.refresh();
        },
        redo: function () {
          const entry = clones.restore(snapshot);
          markDirty();
          if (entry) select(entry, { reveal: true });
          refreshInspector(true);
          if (ui) ui.hierarchy.refresh();
        },
      });

      markDirty();
      select(created, { reveal: true });
      refreshInspector(true);

      if (ui) {
        ui.hierarchy.refresh();
        ui.updateToolStates();
        if (created.isLight) {
          ui.toast("Cópia criada · luz a mais custa desempenho");
        } else if (hasSkinnedMesh(created.object)) {
          ui.toast("Cópia criada · modelo animado pode sair torto");
        } else {
          ui.toast("Cópia criada · " + created.label);
        }
      }
      return created;
    }

    function isInside(id, rootId) {
      return id === rootId || String(id).indexOf(rootId + "/") === 0;
    }

    /**
     * Apaga uma CÓPIA inteira: ela deixa de existir (o registro dela sai
     * do arquivo salvo). Objeto do jogo não passa por aqui - ele não pode
     * ser "apagado" de um arquivo que o Editor nunca escreve, então a
     * exclusão dele vira delta (ver removeEntry mais abaixo).
     */
    function deleteClone(entry) {
      const target = entry || selection;
      if (!target || !target.isClone) {
        removeEntry(target);
        return;
      }

      const sceneKey = target.sceneKey;
      const root = registry.findById(sceneKey, target.cloneRootId) || target;
      const cloneId = root.id;
      let snapshot = clones.remove(root);
      if (!snapshot) return;

      if (selection && isInside(selection.id, cloneId)) select(null);
      markDirty();

      history.push({
        label: "Excluir cópia",
        undo: function () {
          const restored = clones.restore(snapshot);
          markDirty();
          if (restored) select(restored, { reveal: true });
          refreshInspector(true);
          if (ui) ui.hierarchy.refresh();
        },
        redo: function () {
          const again = registry.findById(sceneKey, cloneId);
          if (again) {
            snapshot = clones.remove(again) || snapshot;
          }
          if (selection && isInside(selection.id, cloneId)) select(null);
          markDirty();
          refreshInspector(true);
          if (ui) ui.hierarchy.refresh();
        },
      });

      refreshInspector(true);
      if (ui) {
        ui.hierarchy.refresh();
        ui.updateToolStates();
        ui.toast("Cópia excluída");
      }
    }

    // ---------- Excluir (qualquer objeto) ----------
    //
    // Duas histórias diferentes, um botão só:
    //
    // 1. CÓPIA (raiz): o Editor criou, o Editor apaga de verdade — o
    //    registro dela sai do arquivo salvo e ela deixa de existir.
    //    Quem faz isso é o deleteClone() logo acima.
    //
    // 2. OBJETO DO JOGO (e peça de dentro de uma cópia): o arquivo
    //    original nunca é tocado, então a exclusão vira DELTA, igual a
    //    qualquer outra edição: `removed: true` na chave do objeto. No
    //    boot, o jogo monta o cenário de sempre e o objeto sai dele na
    //    hora de aplicar o delta — inclusive no jogo normal, então o
    //    que você excluiu também não existe para o jogador.
    //
    // É diferente de ocultar: oculto continua na cena (e continua
    // custando quadro); excluído sai da árvore, perde a interação e não
    // é mais desenhado. E é reversível de três formas: desfazer,
    // RESTAURAR (painel da direita, ou o filtro “Excluídos” da
    // hierarquia) e “Resetar objeto”, que limpa o delta inteiro.
    //
    // A colisão NÃO sai junto: ela vem das listas do cenário, não do
    // objeto (ver scripts/collision.js) — mesma limitação que já existia
    // ao mover uma parede pelo Editor. É o que o aviso da confirmação
    // diz, para ninguém descobrir isso de surpresa.

    function countPieces(entry) {
      let total = 0;
      entry.children.forEach(function (child) {
        total += 1 + countPieces(child);
      });
      return total;
    }

    /** Exclui de verdade (sem perguntar nada). */
    function removeEntry(target) {
      const entry = target || selection;
      if (!entry) {
        if (ui) ui.toast("Escolha um objeto para excluir");
        return;
      }
      // Cópia inteira: ela não precisa virar delta, ela simplesmente
      // deixa de existir (ver editor-clones.js).
      if (entry.isCloneRoot) {
        deleteClone(entry);
        return;
      }
      if (registry.isRemoved(entry)) {
        if (ui) ui.toast("Este objeto já está excluído");
        return;
      }
      // Peça que já saiu junto com o pai: excluir de novo não mudaria
      // nada na tela e deixaria uma exclusão escondida dentro de outra.
      if (registry.isInsideRemoved(entry)) {
        if (ui) ui.toast("Já saiu junto com o objeto de fora");
        return;
      }

      const before = snapshotOverride(entry);
      overrides.setPath(entry.sceneKey, entry.id, "removed", true, registry.hintFor(entry));
      registry.applyEntry(entry, currentOverride(entry));
      const after = snapshotOverride(entry);

      // Segue selecionado de propósito: é o que deixa o RESTAURAR na
      // mão de quem acabou de excluir sem querer.
      select(entry);
      markDirty();
      history.push({
        label: "Excluir objeto",
        undo: function () {
          restoreOverride(entry, before);
          const back = registry.findById(entry.sceneKey, entry.id);
          if (back) select(back, { reveal: true });
        },
        redo: function () {
          restoreOverride(entry, after);
        },
      });

      refreshInspector(true);
      if (ui) {
        ui.hierarchy.refresh();
        ui.updateToolStates();
        ui.toast("Excluído · " + entry.label);
      }
    }

    /** Devolve à cena um objeto excluído (o inverso exato de excluir). */
    function restoreEntry(target) {
      const entry = target || selection;
      if (!entry || !registry.isRemoved(entry)) return;

      const before = snapshotOverride(entry);
      overrides.clearPath(entry.sceneKey, entry.id, "removed");
      registry.applyEntry(entry, currentOverride(entry));
      const after = snapshotOverride(entry);

      select(entry, { reveal: true });
      markDirty();
      history.push({
        label: "Restaurar objeto",
        undo: function () {
          restoreOverride(entry, before);
        },
        redo: function () {
          restoreOverride(entry, after);
        },
      });

      refreshInspector(true);
      if (ui) {
        ui.hierarchy.refresh();
        ui.updateToolStates();
        ui.toast("Restaurado · " + entry.label);
      }
    }

    /**
     * Pergunta antes. Um toque errado no celular não pode apagar meio
     * cenário, e o texto muda com o que está selecionado: quantas peças
     * vão junto, se é objeto de história e se a colisão fica para trás.
     */
    function requestDelete(target) {
      const entry = target || selection;
      if (!entry) {
        if (ui) ui.toast("Escolha um objeto para excluir");
        return;
      }
      if (registry.isRemoved(entry)) {
        restoreEntry(entry);
        return;
      }
      if (!ui) {
        removeEntry(entry);
        return;
      }

      if (entry.isCloneRoot) {
        ui.confirm({
          title: "Excluir cópia",
          text:
            'Tirar "' +
            entry.label +
            '" do cenário? A cópia e as alterações dela são apagadas (dá para desfazer).',
          confirmLabel: "EXCLUIR",
          onConfirm: function () {
            removeEntry(entry);
          },
        });
        return;
      }

      const pieces = countPieces(entry);
      const lines = [
        'Excluir "' + entry.label + '" do cenário?',
        pieces
          ? "Leva junto " + pieces + " peça(s) de dentro dele."
          : "",
        "Não é só ocultar: o objeto sai da cena e também deixa de existir para o jogador, no próximo boot. Dá para desfazer, restaurar pelo painel e achar depois no filtro \"Excluídos\" da hierarquia.",
        entry.interactable
          ? "ATENÇÃO: este é um objeto INTERATIVO (" +
            entry.interactable.id +
            "). A interação dele sai junto, e a história do jogo pode depender dele."
          : "",
        "A colisão dele sai junto, e volta se você restaurar. Ligue \"Ver caixas de colisão\" no menu de ajustes para conferir.",
      ];
      ui.confirm({
        title: "Excluir objeto",
        text: lines
          .filter(function (line) {
            return !!line;
          })
          .join("\n"),
        confirmLabel: "EXCLUIR",
        onConfirm: function () {
          removeEntry(entry);
        },
      });
    }

    // ---------- Interação (só nesta sessão) ----------

    const disabledInteractions = {};

    function isInteractionEnabled(entry) {
      return !disabledInteractions[entry.sceneKey + "|" + entry.id];
    }

    function setInteractionEnabled(entry, value) {
      const key = entry.sceneKey + "|" + entry.id;
      const list = context.getActiveInteractables();
      const item = entry.interactable;
      if (!item) return;

      if (value) {
        delete disabledInteractions[key];
        if (list.indexOf(item) === -1) list.push(item);
      } else {
        disabledInteractions[key] = true;
        const index = list.indexOf(item);
        if (index !== -1) list.splice(index, 1);
      }
    }

    // ---------- Seleção ----------

    let lastPickedLeafId = null;
    let drillIndex = 0;

    function chainFor(entry) {
      const chain = [];
      let node = entry;
      while (node) {
        chain.unshift(node);
        node = node.parent;
      }
      return chain;
    }

    function select(entry, options) {
      const opts = options || {};
      selection = entry || null;
      selectionBox.visible = false;

      // Objeto EXCLUÍDO continua selecionável de propósito (é assim que
      // se restaura ele pelo painel da direita), mas não ganha caixa nem
      // gizmo: ele não está na cena, e arrastar o que não aparece só
      // confundiria.
      const onScene =
        !!selection && !registry.isRemoved(selection) && !registry.isInsideRemoved(selection);
      if (onScene) {
        selectionBox.setFromObject(selection.object);
        selectionBox.visible = true;
        gizmo.attach(selection.object);
      } else {
        gizmo.detach();
      }

      if (ui) {
        ui.setSelection(selection);
        if (opts.reveal && selection) {
          ui.hierarchy.revealEntry(selection);
        }
      }
    }

    function pickAt(ndc) {
      const root = context.getActiveRoot();
      if (!root) return null;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(root, true);

      for (let i = 0; i < hits.length; i++) {
        const object = hits[i].object;
        if (object.userData && object.userData.__editorHelper) continue;
        if (!isObjectVisible(object)) continue;
        const leaf = registry.entryForObject(object);
        if (leaf) return leaf;
      }
      return null;
    }

    function isObjectVisible(object) {
      let node = object;
      while (node) {
        if (node.visible === false) return false;
        node = node.parent;
      }
      return true;
    }

    /**
     * Um toque escolhe o objeto INTEIRO (a cama, a porta, a
     * escrivaninha). Tocar de novo no mesmo ponto desce um nível na
     * hierarquia — é assim que dá para pegar só a maçaneta sem
     * precisar abrir a árvore.
     */
    function selectByTap(ndc) {
      const leaf = pickAt(ndc);
      if (!leaf) {
        select(null);
        lastPickedLeafId = null;
        drillIndex = 0;
        return;
      }

      const chain = chainFor(leaf);
      if (lastPickedLeafId === leaf.id) {
        drillIndex = Math.min(drillIndex + 1, chain.length - 1);
      } else {
        drillIndex = 0;
        lastPickedLeafId = leaf.id;
      }
      select(chain[drillIndex]);
      if (ui && drillIndex > 0) {
        ui.toast("Nível " + (drillIndex + 1) + " · " + chain[drillIndex].label);
      }
    }

    // ---------- Entrada de toque no cenário ----------

    let pointerId = null;
    let pointerMode = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let startTime = 0;
    let travelled = 0;

    function toNDC(event) {
      const rect = container.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
      };
    }

    function onPointerDown(event) {
      if (pointerId !== null) return;
      pointerId = event.pointerId;
      startX = lastX = event.clientX;
      startY = lastY = event.clientY;
      startTime = Date.now();
      travelled = 0;

      const ndc = toNDC(event);
      pointerMode = gizmo.pointerDown(ndc) ? "gizmo" : "look";

      if (pointerMode === "gizmo" && selection) {
        pending = {
          key: selection.sceneKey + "|" + selection.id + "|gizmo",
          entry: selection,
          before: snapshotOverride(selection),
        };
      }
      if (ui && ui.world.setPointerCapture) {
        ui.world.setPointerCapture(pointerId);
      }
    }

    function onPointerMove(event) {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      travelled += Math.abs(dx) + Math.abs(dy);

      if (pointerMode === "gizmo") {
        gizmo.pointerMove(toNDC(event));
        return;
      }
      editorCamera.addLook(dx, dy);
    }

    function onPointerUp(event) {
      if (event.pointerId !== pointerId) return;
      const duration = Date.now() - startTime;
      const distance = Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY);

      if (pointerMode === "gizmo") {
        const result = gizmo.pointerUp();
        if (result && selection) {
          const kind =
            result.mode === "translate" ? "position" : result.mode === "rotate" ? "rotation" : "scale";
          writeVector(selection, kind);
          const target = pending ? pending.entry : selection;
          const before = pending ? pending.before : null;
          const after = snapshotOverride(target);
          pending = null;
          markDirty();
          if (JSON.stringify(before) !== JSON.stringify(after)) {
            history.push({
              label: "Gizmo: " + result.mode,
              undo: function () {
                restoreOverride(target, before);
              },
              redo: function () {
                restoreOverride(target, after);
              },
            });
          }
          refreshInspector(true);
          if (ui) ui.hierarchy.refresh();
        }
      } else if (distance < TAP_MOVE_LIMIT && duration < TAP_TIME_LIMIT && travelled < TAP_MOVE_LIMIT * 2) {
        selectByTap(toNDC(event));
      }

      pointerId = null;
      pointerMode = null;
    }

    // ---------- Salvar / recarregar / resetar ----------

    function markDirty() {
      if (ui) ui.setDirty(overrides.isDirty());
    }

    /**
     * SALVAR. Grava direto em data/editor-overrides.json, dentro da
     * pasta do jogo, quando existe caminho para isso (servidor local ou
     * pasta autorizada), e sempre tambem no aparelho. O aviso na tela
     * diz ONDE ficou: nunca deixa no ar se foi para o arquivo ou nao.
     */
    function save(onDone) {
      overrides.save(function (result) {
        markDirty();
        if (ui) {
          const copies = overrides.countClones();
          const resumo =
            overrides.countChanges() +
            " objeto(s)" +
            (copies ? " · " + copies + " cópia(s)" : "");
          if (result.folder) {
            ui.toast(
              (result.late ? "Confirmado: salvo na pasta do jogo · " : "Salvo na pasta do jogo · ") +
                resumo
            );
          } else if (result.local) {
            ui.toast(
              "Salvo só neste aparelho · " +
                resumo +
                (result.reason ? " · " + result.reason : "")
            );
          } else {
            ui.toast("Não foi possível salvar aqui. Use EXPORTAR JSON.");
          }
        }
        if (typeof onDone === "function") onDone(result);
      });
      markDirty();
      return true;
    }

    // ---------- Pasta do jogo ----------

    function storageBridge() {
      return window.EditorFileSystem || null;
    }

    function connectFolder() {
      const bridge = storageBridge();
      if (!bridge) return;
      bridge.connectFolder().then(function (result) {
        if (!ui) return;
        if (result.ok) {
          ui.toast(
            "Pasta conectada: " +
              result.name +
              (result.remembered ? "" : " (só nesta sessão)")
          );
          save();
        } else if (result.reason) {
          ui.toast(result.reason);
        }
      });
    }

    function disconnectFolder() {
      const bridge = storageBridge();
      if (!bridge) return;
      bridge.disconnectFolder().then(function () {
        if (ui) ui.toast("Pasta desconectada · SALVAR grava só no aparelho");
      });
    }

    function reloadSaved() {
      registry.resetAll();
      // As cópias saem da cena ANTES de trocar os dados (é pelos dados
      // antigos que elas são encontradas) e as do arquivo entram depois.
      clones.removeAll();
      select(null);
      // Le de novo o ARQUIVO da pasta do jogo e o que o aparelho tem
      // salvo (assincrono: agora o salvo mora no disco, nao so na
      // memoria do navegador).
      overrides.reloadFromDisk(function () {
        clones.materializeAll();
        registry.applyAll();
        history.clear();
        refreshInspector(true);
        markDirty();
        if (ui) {
          ui.hierarchy.refresh();
          ui.toast("Alterações salvas recarregadas");
        }
      });
    }

    function resetAll() {
      registry.resetAll();
      clones.removeAll();
      select(null);
      overrides.clearAll();
      // Zerar tambem precisa chegar ao arquivo da pasta do jogo, senao
      // o proximo boot traria tudo de volta de la.
      overrides.save(function (result) {
        if (ui && !result.folder && result.reason) {
          ui.toast("Resetado só neste aparelho · " + result.reason);
        }
      });
      history.clear();
      refreshInspector(true);
      markDirty();
      if (ui) {
        ui.hierarchy.refresh();
        ui.toast("Tudo voltou ao original");
      }
    }

    function exportJSON() {
      return overrides.exportText();
    }

    function downloadJSON() {
      try {
        const blob = new Blob([overrides.exportText()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "editor-overrides.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 2000);
        if (ui) ui.toast("Arquivo gerado");
      } catch (e) {
        if (ui) ui.toast("Este aparelho não permite baixar. Copie o texto.");
      }
    }

    function importJSON(text) {
      try {
        registry.resetAll();
        clones.removeAll();
        select(null);
        overrides.importText(text);
        clones.materializeAll();
        registry.applyAll();
        history.clear();
        refreshInspector(true);
        markDirty();
        if (ui) {
          ui.hierarchy.refresh();
          ui.toast("Alterações importadas (lembre de SALVAR)");
        }
      } catch (e) {
        // JSON ruim no meio do caminho: devolve a cena ao que estava
        // (as cópias voltam e o delta salvo é reaplicado). O documento em
        // si nunca foi trocado - importText só escreve depois de ler.
        try {
          clones.materializeAll();
          registry.applyAll();
        } catch (inner) {
          /* nada aqui pode virar erro na cara de quem edita */
        }
        refreshInspector(true);
        if (ui) {
          ui.hierarchy.refresh();
          ui.toast("JSON inválido");
        }
      }
    }

    // ---------- Ferramentas de navegação ----------

    function rebuildCollisionBoxes() {
      while (collisionGroup.children.length) {
        const child = collisionGroup.children.pop();
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
      if (!collisionView) return;

      const height = context.config.height || 3;
      context.getActiveSolids().forEach(function (solid) {
        // Caixa de objeto excluído já não barra mais nada (ver isSolidActive
        // em scripts/collision.js), então também não é desenhada aqui: a
        // ajuda visual mostra o que REALMENTE segura o jogador.
        const state = solidState(solid);
        if (state === "off") return;
        const ghost = state === "ghost";
        const box = new THREE.Box3(
          new THREE.Vector3(solid.minX, 0, solid.minZ),
          new THREE.Vector3(solid.maxX, height, solid.maxZ)
        );
        // Rosa = solido de verdade, o que segura o jogador. AZUL = caixa
        // FANTASMA: perdeu o contato com o que está desenhado e foi
        // desligada (ver guardFootprint em scripts/collision.js).
        // Ligar a vista LIMPA as fantasmas (ver setCollisionView), então o
        // normal é não existir nenhuma azul. O azul continua aqui como
        // aviso AO VIVO: uma que apareça durante a edição (peça arrastada
        // para longe do lugar) fica azul na hora, sem ser apagada - assim
        // dá para desfazer. Ela cai na faxina seguinte.
        const helper = new THREE.Box3Helper(box, ghost ? 0x4ad9ff : 0xff6ec7);
        helper.userData.__editorHelper = true;
        helper.userData.__ghost = ghost;
        // A caixa acompanha o objeto (ver bindSolids em
        // scripts/collision.js), entao a ajuda visual guarda de QUEM ela
        // e e passa a ser atualizada por quadro em syncCollisionBoxes,
        // em vez de congelar no lugar em que estava quando a vista foi
        // ligada. O Box3Helper le a propria `box` a cada quadro, entao
        // basta reescrever os limites dela - nenhuma geometria nova.
        helper.userData.__solid = solid;
        helper.material.depthTest = false;
        helper.material.transparent = true;
        helper.material.opacity = 0.5;
        collisionGroup.add(helper);
      });
    }

    // Vista de COLISAO em dia, por quadro e sem criar nada: as caixas
    // seguem o dono desde a correcao das paredes invisiveis, e as das
    // copias entram na lista enquanto o Editor esta aberto (ver
    // mirrorSolids em scripts/collision.js). Enquanto a vista esta
    // desligada - o normal - isto sai na primeira linha.
    function syncCollisionBoxes() {
      if (!collisionView) return;
      const solids = context.getActiveSolids();
      if (window.Collision && window.Collision.sync) {
        // O jogador nao esta andando aqui, entao ninguem consultou as
        // caixas neste quadro: quem pede a conta e a propria vista.
        window.Collision.sync(solids);
      }
      // Caixa nova ou caixa que saiu (copia criada/apagada): a lista de
      // ajudantes e refeita, o que so acontece nesses momentos.
      if (collisionGroup.children.length !== countDrawableSolids(solids)) {
        rebuildCollisionBoxes();
        return;
      }
      let repaint = false;
      collisionGroup.children.forEach(function (helper) {
        const solid = helper.userData.__solid;
        if (!solid || !helper.box) return;
        // Caixa que virou fantasma (ou voltou a valer) troca de cor, e a
        // cor mora na geometria do ajudante: nesse caso a lista e refeita.
        if (helper.userData.__ghost !== (solidState(solid) === "ghost")) repaint = true;
        helper.box.min.set(solid.minX, 0, solid.minZ);
        helper.box.max.set(solid.maxX, context.config.height || 3, solid.maxZ);
      });
      if (repaint) rebuildCollisionBoxes();
    }

    // Tres estados: "active" (segura o jogador), "ghost" (desligada por
    // estar solta no vazio, ver guardFootprint em scripts/collision.js) e
    // "off" (objeto excluido - nao se desenha).
    function solidState(solid) {
      if (!window.Collision || window.Collision.isSolidActive(solid)) return "active";
      return solid.__orphan === true ? "ghost" : "off";
    }

    function countDrawableSolids(solids) {
      let total = 0;
      solids.forEach(function (solid) {
        if (solidState(solid) !== "off") total += 1;
      });
      return total;
    }

    function setCollisionView(value) {
      collisionView = !!value;
      collisionGroup.visible = collisionView;
      // Ligar a vista refaz a pergunta da pegada em TODAS as caixas, sem
      // esperar o intervalo normal: e o momento em que quem edita quer
      // saber quantas colisoes soltas o cenario tem (ver audit em
      // scripts/collision.js).
      let ghosts = 0;
      if (collisionView && window.Collision && window.Collision.purgeGhosts) {
        try {
          // A vista liga com a colisão já LIMPA: as caixas soltas no vazio
          // saem da lista aqui, na hora, em vez de só serem ignoradas e
          // desenhadas em azul (ver purgeGhosts em scripts/collision.js).
          // `minAge: 0` porque o cenário do Editor já está carregado e a
          // própria varredura acabou de refazer a pegada de todas elas.
          ghosts = window.Collision.purgeGhosts(context.getActiveSolids(), {
            minAge: 0,
          });
        } catch (e) {
          ghosts = 0;
        }
      }
      rebuildCollisionBoxes();
      if (collisionView && ghosts && ui) {
        ui.toast(
          ghosts === 1
            ? "1 colisão solta removida"
            : ghosts + " colisões soltas removidas"
        );
      }
    }

    function setHighResolution(value) {
      highResolution = !!value;
      const width = highResolution ? 960 : 320;
      const height = highResolution ? 540 : 180;
      renderer.setSize(width, height, false);
      if (context.motionBlur && context.motionBlur.setSize) {
        context.motionBlur.setSize(width, height);
      }
    }

    // ---------- Inspetor ----------

    function refreshInspector(rebuild) {
      if (!ui) return;
      if (rebuild) {
        ui.inspector.rebuild();
      } else {
        ui.inspector.refreshValues();
      }
      if (selection && selectionBox.visible) {
        selectionBox.setFromObject(selection.object);
      }

      // Com a vista de COLISAO ligada, as caixas desenhadas acompanham o
      // movel enquanto o gizmo o arrasta (ver syncCollisionBoxes acima).
      syncCollisionBoxes();
    }

    // ---------- API entregue para a interface ----------

    const api = {
      registry: registry,
      overrides: overrides,
      textures: textures,
      history: history,
      camera: editorCamera,

      getSelection: function () {
        return selection;
      },
      select: function (entry) {
        select(entry);
      },
      focusEntry: function (entry) {
        editorCamera.focusOn(entry.object);
      },

      getActiveSceneKey: context.getActiveSceneKey,
      setActiveScene: function (key) {
        if (key === context.getActiveSceneKey()) return;
        context.setActiveScene(key);
        select(null);
        rebuildCollisionBoxes();
        if (ui) {
          ui.setSceneTabs(context.getSceneList(), key);
          ui.hierarchy.refresh();
          ui.toast("Cenário: " + key);
        }
      },

      setTransform: setTransform,
      setScaleUniform: setScaleUniform,
      resetTransform: resetTransform,
      setVisible: setVisible,
      setLight: setLight,
      setMaterial: setMaterial,
      setTexture: setTexture,
      resetEntry: resetEntry,
      duplicateSelection: duplicateSelection,
      duplicateEntry: function (entry) {
        if (entry) select(entry);
        return duplicateSelection();
      },
      deleteClone: deleteClone,
      // EXCLUIR: um caminho só para cópia e para objeto do jogo.
      requestDelete: requestDelete,
      deleteEntry: removeEntry,
      restoreEntry: restoreEntry,
      isRemoved: function (entry) {
        return registry.isRemoved(entry) || registry.isInsideRemoved(entry);
      },
      isRemovedSelf: function (entry) {
        return registry.isRemoved(entry);
      },
      countClones: function () {
        return clones.countScene(context.getActiveSceneKey());
      },
      isInteractionEnabled: isInteractionEnabled,
      setInteractionEnabled: setInteractionEnabled,

      getGizmoMode: function () {
        return gizmo.getMode();
      },
      setGizmoMode: function (mode) {
        gizmo.setMode(mode);
        if (ui) ui.updateToolStates();
      },
      getTranslateSnap: function () {
        return translateSnap;
      },
      setTranslateSnap: function (value) {
        translateSnap = value;
        gizmo.setSnap(translateSnap, (rotateSnapDegrees * Math.PI) / 180);
      },
      getRotateSnapDegrees: function () {
        return rotateSnapDegrees;
      },
      setRotateSnapDegrees: function (value) {
        rotateSnapDegrees = value;
        gizmo.setSnap(translateSnap, (rotateSnapDegrees * Math.PI) / 180);
      },

      toggleFly: function () {
        editorCamera.setFlyMode(!editorCamera.isFlyMode());
        if (ui) {
          ui.updateToolStates();
          ui.toast(editorCamera.isFlyMode() ? "Modo voo LIGADO" : "Modo voo DESLIGADO");
        }
      },
      toggleNoClip: function () {
        editorCamera.setNoClip(!editorCamera.isNoClip());
        if (ui) {
          ui.updateToolStates();
          ui.toast(editorCamera.isNoClip() ? "NO-CLIP LIGADO" : "NO-CLIP DESLIGADO");
        }
      },
      isCollisionViewOn: function () {
        return collisionView;
      },
      setCollisionView: setCollisionView,
      isHighResolution: function () {
        return highResolution;
      },
      setHighResolution: setHighResolution,

      // ---------- Horário do cenário (noite / dia) ----------
      // Estado de VISUALIZAÇÃO, não de edição: não vira delta, não
      // entra no histórico e não é salvo. O jogo continua começando de
      // noite e amanhecendo só na sequência de dormir; aqui o horário
      // é só a lente por onde o cenário está sendo olhado enquanto se
      // edita (quem faz a troca de verdade é scripts/main.js, com o
      // mesmo caminho da história — ver setTimeOfDay() lá).
      getTimeOfDay: function () {
        return context.getTimeOfDay ? context.getTimeOfDay() : "noite";
      },
      setTimeOfDay: function (key) {
        if (!context.setTimeOfDay) {
          return;
        }
        const day = key === "dia";
        context.setTimeOfDay(day ? "dia" : "noite");

        // Virar o dia TROCA o material de grama, terra e floresta (ver
        // models/grass-field-factory.js e vizinhos). Se o objeto tiver
        // alteração de material salva, ela precisa ser reaplicada por
        // cima do material novo — senão a edição "sumiria" ao alternar
        // noite/dia. Reaplicar o delta inteiro é barato e usa o mesmo
        // caminho do boot (ver scripts/main.js).
        registry.applyAll();
        refreshInspector(true);

        if (ui) {
          ui.updateToolStates();
          ui.hierarchy.refresh();
          ui.toast(day ? "Horário: DIA" : "Horário: NOITE");
        }
      },

      undo: function () {
        const action = history.undo();
        if (ui) ui.toast(action ? "Desfeito: " + action.label : "Nada para desfazer");
        refreshInspector(true);
      },
      redo: function () {
        const action = history.redo();
        if (ui) ui.toast(action ? "Refeito: " + action.label : "Nada para refazer");
        refreshInspector(true);
      },

      save: save,
      // Estado do destino do SALVAR, para a interface poder mostrar (e
      // trocar) onde a alteracao vai parar.
      storage: {
        describe: function () {
          const bridge = storageBridge();
          return bridge ? bridge.describe() : "Somente neste aparelho";
        },
        mode: function () {
          const bridge = storageBridge();
          return bridge ? bridge.mode() : "none";
        },
        canWrite: function () {
          const bridge = storageBridge();
          return !!bridge && bridge.canWrite();
        },
        hasFolder: function () {
          const bridge = storageBridge();
          return !!bridge && bridge.hasFolder();
        },
        supportsFolderPicker: function () {
          const bridge = storageBridge();
          return !!bridge && bridge.supportsFolderPicker();
        },
        targetPath: function () {
          const bridge = storageBridge();
          return bridge ? bridge.TARGET_PATH : "data/editor-overrides.json";
        },
        connectFolder: connectFolder,
        disconnectFolder: disconnectFolder,
      },
      reloadSaved: reloadSaved,
      resetAll: resetAll,
      exportJSON: exportJSON,
      downloadJSON: downloadJSON,
      importJSON: importJSON,

      togglePanel: function (side, open) {
        if (ui) ui.togglePanel(side, open);
      },
      confirm: function (options) {
        if (ui) ui.confirm(options);
      },
      toast: function (message) {
        if (ui) ui.toast(message);
      },
      exit: exit,
    };

    // ---------- Interface ----------
    const ui = window.EditorUI.create(container, api);
    ui.setSceneTabs(context.getSceneList(), context.getActiveSceneKey());
    ui.setSelection(null);
    ui.updateToolStates();
    markDirty();

    ui.world.addEventListener("pointerdown", onPointerDown);
    ui.world.addEventListener("pointermove", onPointerMove);
    ui.world.addEventListener("pointerup", onPointerUp);
    ui.world.addEventListener("pointercancel", onPointerUp);

    gizmo.setOnChange(function () {
      if (!selection || !selectionBox.visible) return;
      selectionBox.setFromObject(selection.object);
      refreshInspector(false);
    });

    // ---------- Sair ----------

    function leaveToMenu() {
      active = false;
      // Recarregar é a saída mais limpa possível: o jogo volta ao
      // menu inicial num estado 100% novo, sem nenhum resto do
      // Editor na cena, e as alterações SALVAS entram normalmente
      // pelo caminho de sempre (ver scripts/main.js).
      window.location.reload();
    }

    function exit() {
      if (!overrides.isDirty()) {
        leaveToMenu();
        return;
      }
      ui.openModal({
        title: "Sair do Editor",
        text: "Existem alterações que ainda não foram salvas.",
        dismissible: false,
        actions: [
          { label: "CANCELAR" },
          {
            label: "SAIR SEM SALVAR",
            variant: "danger",
            onClick: leaveToMenu,
          },
          {
            label: "SALVAR E SAIR",
            variant: "primary",
            onClick: function () {
              // Gravar na pasta passa pelo disco: recarregar a pagina
              // antes da resposta perderia a alteracao. Espera o SALVAR
              // terminar, com um limite para uma ponte travada nunca
              // prender o dev nesta tela.
              let left = false;
              function go() {
                if (left) return;
                left = true;
                leaveToMenu();
              }
              save(function () {
                window.setTimeout(go, 400);
              });
              window.setTimeout(go, 5000);
            },
          },
        ],
      });
    }

    // ---------- Quadro a quadro ----------

    function update(delta) {
      if (!active) return;
      editorCamera.update(delta);
      gizmo.update();

      if (selection && selectionBox.visible) {
        selectionBox.setFromObject(selection.object);
      }

      // Modelos .glb chegam depois do boot: de tempos em tempos o
      // registro procura o que apareceu e aplica nele as alterações
      // salvas que estavam esperando.
      syncClock += delta;
      if (syncClock >= SYNC_INTERVAL) {
        syncClock = 0;
        let changed = registry.sync() > 0;
        // Cópia cujo modelo .glb de origem só terminou de carregar agora
        // nasce nesta passada (ver editor/editor-clones.js).
        if (clones.materializeAll() > 0) changed = true;
        // Mesma ordem do boot (ver scripts/main.js): retrato do que
        // acabou de chegar antes de reaplicar o delta por cima.
        if (window.Collision && window.Collision.absorbOwners) {
          window.Collision.absorbOwners();
        }
        if (changed) {
          registry.applyAll();
          ui.hierarchy.refresh();
        }
      }
    }

    return {
      update: update,
      isActive: function () {
        return active;
      },
      api: api,
    };
  }

  return { start: start };
})();
