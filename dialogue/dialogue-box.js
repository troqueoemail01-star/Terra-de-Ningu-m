/**
 * dialogue/dialogue-box.js
 * -------------------------------------------------
 * Caixa de diálogo reutilizável: digita cada fala caractere por
 * caractere (efeito de máquina de escrever), mantendo "Nome:" em
 * amarelo e o resto da frase em branco (ver dialogue/dialogue.css).
 * O avanço é sempre manual — um toque na tela avança para a
 * próxima fala, só depois que a atual termina de ser digitada.
 *
 * Uso:
 *   const box = window.DialogueBox.create(container);
 *   box.show();
 *   box.playSequence(window.DialogueConfig["alguma-chave"], function () {
 *     box.hide(); // chamado depois do toque na última fala
 *   });
 *
 * Botão "PULAR TUDO": fica sempre visível, coladinho no canto
 * superior direito da caixa, enquanto uma sequência está tocando —
 * pensado para agilizar testes durante o desenvolvimento (evita
 * precisar tocar fala por fala pra passar de um diálogo). Ao ser
 * tocado, encerra a sequência inteira na hora (não só a fala atual):
 * chama o mesmo callback "onAllDone" de playSequence, como se o
 * jogador tivesse tocado até o final normalmente — então quem chamou
 * (entry-sequence.js, phone-sequence.js, scripts/main.js) não precisa
 * saber que o pulo aconteceu, só recebe o mesmo aviso de "acabou".
 *
 * Regra fixa, válida para qualquer diálogo do jogo (atual ou
 * futuro): enquanto uma fala está na tela, o HUD inteiro (analógico,
 * área de câmera, botão "Interagir", inventário) fica escondido —
 * show() esconde o HUD assim que o diálogo aparece, hide() só o
 * traz de volta depois que a caixa já foi removida da tela. Por
 * ficar dentro desta caixa (e não em cada chamador), nenhum diálogo
 * futuro precisa se lembrar de esconder o HUD por conta própria.
 * Não sabe nada sobre câmera ou os controles de movimento/olhar do
 * jogador — travar/liberar esses continua sendo responsabilidade de
 * quem chama (ex.: cutscenes/entry-sequence.js, scripts/main.js).
 * -------------------------------------------------
 */

window.DialogueBox = (function () {
  // Velocidade da digitação (caracteres por segundo) — ritmo
  // confortável para leitura, nem lento nem acelerado demais.
  const CHARS_PER_SECOND = 26;

  function create(container) {
    const box = document.createElement("div");
    box.className = "dialogue-box";

    const textEl = document.createElement("div");
    textEl.className = "dialogue-text";

    const nameSpan = document.createElement("span");
    nameSpan.className = "dialogue-name";
    const messageSpan = document.createElement("span");
    messageSpan.className = "dialogue-message";

    const indicator = document.createElement("span");
    indicator.className = "dialogue-indicator";
    indicator.textContent = "\u25BC"; // "▼" discreto, só pra sinalizar o toque

    // Botão de pular a sequência inteira de uma vez (ver comentário no
    // topo do arquivo). Fica FORA de textEl, num canto fixo da caixa,
    // pra nunca ficar embaixo do texto sendo digitado.
    const skipButton = document.createElement("button");
    skipButton.type = "button";
    skipButton.className = "dialogue-skip-button";
    skipButton.textContent = "PULAR TUDO";

    textEl.appendChild(nameSpan);
    textEl.appendChild(messageSpan);
    box.appendChild(textEl);
    box.appendChild(indicator);
    box.appendChild(skipButton);
    container.appendChild(box);

    let rafId = null;
    let activeTapHandler = null;
    // Callback "onAllDone" da sequência em andamento (ver playSequence
    // mais abaixo) — guardado aqui pra skipAll() poder chamá-lo direto,
    // sem precisar esperar a digitação/toque normal chegar até ele.
    let currentOnAllDone = null;

    function stopTyping() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function stopWaitingForTap() {
      if (activeTapHandler) {
        container.removeEventListener("pointerdown", activeTapHandler);
        activeTapHandler = null;
      }
    }

    // Encerra a sequência inteira imediatamente, não importa se ainda
    // está digitando uma fala ou já esperando o toque pra avançar.
    // Não faz nada se não houver sequência ativa no momento (botão
    // tocado fora de uma janela de playSequence — não deveria
    // acontecer no fluxo normal, mas evita quebrar caso aconteça).
    function skipAll() {
      if (!currentOnAllDone) {
        return;
      }
      stopTyping();
      stopWaitingForTap();
      box.classList.remove("dialogue-box-waiting");
      const onAllDone = currentOnAllDone;
      currentOnAllDone = null;
      onAllDone();
    }

    // Mesmo truque de cutscenes/cutscene-player.js: impede que tocar no
    // botão borbulhe como um toque "na tela" (o waitForTap acima escuta
    // pointerdown no container inteiro) — sem isso, tocar em "PULAR
    // TUDO" também contaria como o toque de avançar uma fala.
    ["pointerdown", "pointermove", "pointerup"].forEach(function (evt) {
      skipButton.addEventListener(evt, function (e) {
        e.stopPropagation();
      });
    });

    skipButton.addEventListener("click", skipAll);

    // Espera um único toque em qualquer lugar da tela (o container do
    // jogo inteiro) antes de chamar "cb" — mesmo padrão de "esperar um
    // toque" já usado em cutscenes/cutscene-player.js.
    function waitForTap(cb) {
      activeTapHandler = function () {
        stopWaitingForTap();
        cb();
      };
      container.addEventListener("pointerdown", activeTapHandler);
    }

    // Digita uma linha caractere por caractere. "Nome: " é revelado
    // primeiro (em amarelo), seguido do resto da fala (em branco) —
    // ambos fazem parte da mesma contagem de caracteres, então o
    // efeito de digitação flui como uma frase só.
    function typeLine(character, text, onDone) {
      const prefix = character + ": ";
      const fullLength = prefix.length + text.length;
      const start = performance.now();

      function step(now) {
        const elapsedChars = ((now - start) / 1000) * CHARS_PER_SECOND;
        const revealed = Math.min(Math.floor(elapsedChars), fullLength);

        if (revealed <= prefix.length) {
          nameSpan.textContent = prefix.slice(0, revealed);
          messageSpan.textContent = "";
        } else {
          nameSpan.textContent = prefix;
          messageSpan.textContent = text.slice(0, revealed - prefix.length);
        }

        if (revealed < fullLength) {
          rafId = requestAnimationFrame(step);
        } else {
          rafId = null;
          onDone();
        }
      }

      rafId = requestAnimationFrame(step);
    }

    // Toca uma sequência de falas, uma de cada vez: digita a fala,
    // espera um toque, digita a próxima — até acabar a lista.
    function playSequence(lines, onAllDone) {
      let index = 0;
      currentOnAllDone = onAllDone;

      function next() {
        if (index >= lines.length) {
          currentOnAllDone = null;
          onAllDone();
          return;
        }
        const line = lines[index];
        typeLine(line.character, line.text, function () {
          // Fala terminou de aparecer: mostra o indicador de "toque
          // para continuar" e espera a ação do jogador.
          box.classList.add("dialogue-box-waiting");
          waitForTap(function () {
            box.classList.remove("dialogue-box-waiting");
            index += 1;
            next();
          });
        });
      }

      next();
    }

    function show() {
      // Esconde o HUD inteiro assim que o diálogo passa a ser exibido
      // (ver regra no topo do arquivo) — antes mesmo do fade-in da
      // caixa terminar, para nenhum botão ficar clicável enquanto a
      // fala está aparecendo.
      window.HUD.setVisible(false);
      box.classList.add("dialogue-box-visible");
    }

    function hide() {
      stopTyping();
      stopWaitingForTap();
      currentOnAllDone = null;
      box.remove();
      // Só devolve o HUD depois que a caixa já foi removida da tela
      // (ver regra no topo do arquivo).
      window.HUD.setVisible(true);
    }

    return {
      playSequence: playSequence,
      show: show,
      hide: hide,
    };
  }

  return { create: create };
})();
