/**
 * objectives/objective-system.js
 * -------------------------------------------------
 * Estado de progresso da história: sabe qual é o objetivo atual e, a
 * partir dele, decide se um objeto interativo (qualquer item da
 * lista única de `interactables`, ver scenes/corridor-scene.js) deve
 * funcionar normalmente ou responder com um diálogo no lugar da sua
 * ação de sempre.
 *
 * Não sabe nada sobre HUD, caixa de diálogo ou controles do jogador
 * — só interpreta os dados de objectives/objective-config.js. Quem
 * usa essas respostas para de fato travar a interação e mostrar a
 * fala é scripts/main.js, mantendo este arquivo pequeno e
 * reutilizável por qualquer objeto ou etapa futura da história que
 * precise perguntar "isso está liberado agora?".
 *
 * Uso:
 *   const objectives = window.ObjectiveSystem.create(window.ObjectiveConfig);
 *   objectives.isAllowed(item);             // true/false
 *   objectives.getBlockedDialogueKey(item);  // chave em DialogueConfig, ou null
 *   objectives.getCurrentId();               // id do objetivo atual, ou null
 *   objectives.advance();                    // avança para o próximo objetivo (uso futuro)
 * -------------------------------------------------
 */

window.ObjectiveSystem = (function () {
  // Condicoes opcionais sobre o ESTADO de um objeto, usadas pelo campo
  // `allowedKindsWhen` de cada objetivo (ver
  // objectives/objective-config.js). Servem para etapas em que o "kind"
  // sozinho nao basta: hoje, "abrir as janelas" libera as janelas
  // AINDA FECHADAS e bloqueia as que ja foram abertas, sem precisar
  // listar id por id nem espalhar essa regra por scripts/main.js.
  // Toda condicao aqui recebe o proprio interativo e devolve
  // true/false; um objeto que nem tenha o metodo consultado
  // (ex.: `isOpen`) nunca quebra a checagem.
  const CONDITIONS = {
    isOpen: function (item) {
      return !!(item.isOpen && item.isOpen());
    },
    isClosed: function (item) {
      return !(item.isOpen && item.isOpen());
    },
  };

  function create(config) {
    const objectives = (config && config.objectives) || [];
    let index = 0;

    function current() {
      return objectives[index] || null;
    }

    // Sem objetivo ativo (lista vazia, ou índice além do último
    // definido até agora) => nada fica bloqueado, comportamento
    // normal do jogo. Mantém o sistema seguro mesmo antes de existir
    // qualquer etapa configurada, ou depois da última já implementada.
    //
    // Além de allowedKinds (todo objeto daquele "kind"), também aceita
    // o `allowedIds` opcional de cada objetivo: libera um objeto
    // específico por id mesmo que o "kind" dele, de modo geral, não
    // esteja liberado nesta etapa — caso da porta "MEU QUARTO" a
    // partir da segunda etapa da história (ver
    // objectives/objective-config.js): só ela fica liberada, as outras
    // 5 portas do corredor continuam do "kind" "door" bloqueado
    // normalmente.
    function isAllowed(item) {
      const objective = current();
      if (!objective) {
        return true;
      }
      const allowedIds = objective.allowedIds || [];
      if (allowedIds.indexOf(item.id) !== -1) {
        return true;
      }
      const allowedKinds = objective.allowedKinds || [];
      if (allowedKinds.indexOf(item.kind) === -1) {
        return false;
      }
      // Liberado pelo "kind", mas a etapa pode exigir uma condicao a
      // mais sobre o ESTADO atual do objeto (ver allowedKindsWhen em
      // objectives/objective-config.js). Sem condicao cadastrada para
      // este "kind", segue liberado como sempre.
      const conditions = objective.allowedKindsWhen || {};
      const conditionName = conditions[item.kind];
      if (!conditionName) {
        return true;
      }
      const condition = CONDITIONS[conditionName];
      return condition ? condition(item) : true;
    }

    // Devolve a chave de dialogue/dialogue-config.js a tocar quando
    // "item" está bloqueado nesta etapa — por id específico primeiro,
    // depois por "kind" (resposta padrão para todo objeto daquele
    // tipo). Sem entrada definida para nenhum dos dois, devolve null
    // — quem chama decide o que fazer nesse caso (hoje, não faz
    // nada, igual ao comportamento das portas antes desta
    // atualização).
    function getBlockedDialogueKey(item) {
      const objective = current();
      if (!objective || !objective.blockedResponses) {
        return null;
      }
      const byId = objective.blockedResponses.byId || {};
      if (byId[item.id]) {
        return byId[item.id];
      }
      const byKind = objective.blockedResponses.byKind || {};
      return byKind[item.kind] || null;
    }

    function getCurrentId() {
      const objective = current();
      return objective ? objective.id : null;
    }

    // Avança para o próximo objetivo da lista (ex.: depois que o
    // jogador cumprir "interagir com o telefone"). Ainda não é
    // chamado em lugar nenhum do jogo — reservado para a atualização
    // futura que vai implementar a lógica do telefone.
    function advance() {
      if (index < objectives.length - 1) {
        index += 1;
      }
    }

    return {
      isAllowed: isAllowed,
      getBlockedDialogueKey: getBlockedDialogueKey,
      getCurrentId: getCurrentId,
      advance: advance,
    };
  }

  return { create: create };
})();
