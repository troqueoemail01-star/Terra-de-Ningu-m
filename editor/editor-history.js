/**
 * editor/editor-history.js
 * -------------------------------------------------
 * DESFAZER / REFAZER.
 *
 * Pilha simples de ações reversíveis. Cada ação sabe se desfazer e
 * se refazer sozinha — o histórico não conhece objeto 3D nenhum, só
 * guarda pares de funções. É por isso que qualquer ferramenta nova
 * do Editor (adicionar objeto, duplicar, editar partícula...) entra
 * no histórico sem precisar mexer neste arquivo.
 *
 * Limite curto de propósito (LIMIT): é uma ferramenta de
 * desenvolvimento rodando no celular, não um editor de vídeo.
 * -------------------------------------------------
 */

window.EditorHistory = (function () {
  const LIMIT = 60;

  function create(onChange) {
    const undoStack = [];
    const redoStack = [];

    function notify() {
      if (typeof onChange === "function") {
        onChange();
      }
    }

    /**
     * push({ label, undo(), redo() }) — a ação JÁ deve ter sido
     * executada por quem chama; aqui só entra o registro de como
     * voltar atrás.
     */
    function push(action) {
      if (!action || typeof action.undo !== "function" || typeof action.redo !== "function") {
        return;
      }
      undoStack.push(action);
      if (undoStack.length > LIMIT) {
        undoStack.shift();
      }
      redoStack.length = 0;
      notify();
    }

    function undo() {
      const action = undoStack.pop();
      if (!action) return null;
      action.undo();
      redoStack.push(action);
      notify();
      return action;
    }

    function redo() {
      const action = redoStack.pop();
      if (!action) return null;
      action.redo();
      undoStack.push(action);
      notify();
      return action;
    }

    function clear() {
      undoStack.length = 0;
      redoStack.length = 0;
      notify();
    }

    return {
      push: push,
      undo: undo,
      redo: redo,
      clear: clear,
      canUndo: function () {
        return undoStack.length > 0;
      },
      canRedo: function () {
        return redoStack.length > 0;
      },
      lastLabel: function () {
        const action = undoStack[undoStack.length - 1];
        return action ? action.label : "";
      },
    };
  }

  return { create: create };
})();
