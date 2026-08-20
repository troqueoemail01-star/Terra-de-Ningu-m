/**
 * cutscenes/phone-sequence.js
 * -------------------------------------------------
 * Mini cutscenes de ligação telefônica. Duas ligações usam este mesmo
 * arquivo, o mesmo overlay preto, o mesmo fade e a mesma caixa de
 * diálogo — só o "miolo" muda:
 *
 *   1) PhoneSequence.play(...) — LIGAÇÃO FEITA POR KAEL (a primeira do
 *      jogo, primeiro objetivo da história): jogador interage com o
 *      telefone -> fade-in + discagem -> chamando -> atendimento ->
 *      fade-out -> diálogo "chamada-ravi".
 *
 *   2) PhoneSequence.playIncoming(...) — LIGAÇÃO RECEBIDA (a segunda,
 *      na manhã seguinte, depois que as 3 janelas do jogo são
 *      abertas): o telefone já está tocando sozinho no corredor há um
 *      tempo (ver PhoneAudio.startIncomingRing() e
 *      startIncomingPhoneCall() em scripts/main.js) e o jogador
 *      interage com ele -> fade-in (o telefone ainda tocando, como se
 *      Kael estivesse indo pegar o fone) -> atendimento (o toque para
 *      no clique) -> fade-out -> diálogo "chamada-ravi-manha".
 *
 * Em ambas, do primeiro ao último quadro:
 *   - controles e HUD ficam bloqueados/escondidos (mesmo padrão de
 *     cutscenes/entry-sequence.js) — nenhum botão de gameplay aparece
 *     durante a sequência;
 *   - a caixa de diálogo é a mesma de sempre (mesma fonte, cores e
 *     digitação — ver dialogue/dialogue-box.js), com "PULAR TUDO";
 *   - um clique curto de desligar toca antes da caixa fechar, e só
 *     então HUD e controles voltam ao normal.
 *
 * window.PhoneSequence.play(player, container, onComplete)
 * window.PhoneSequence.playIncoming(player, container, onComplete)
 * -------------------------------------------------
 */

window.PhoneSequence = (function () {
  // Duração do fade (precisa bater com a transição definida em
  // cutscenes/phone-sequence.css) — usada tanto para o fade-in
  // (tela escurecendo) quanto para o fade-out (ligação atendida).
  const FADE_MS = 900;

  const OUTGOING_DIALOGUE_KEY = "chamada-ravi";
  const INCOMING_DIALOGUE_KEY = "chamada-ravi-manha";

  // Espera a transição de opacidade do overlay terminar (evento
  // "transitionend") antes de seguir para o próximo passo. Um
  // setTimeout de salvaguarda garante que a sequência sempre continua,
  // mesmo se o evento não disparar por algum motivo.
  function waitForFade(overlay, onDone) {
    let done = false;
    function finish(e) {
      if (done) return;
      if (e && e.propertyName && e.propertyName !== "opacity") return;
      done = true;
      overlay.removeEventListener("transitionend", finish);
      onDone();
    }
    overlay.addEventListener("transitionend", finish);
    setTimeout(finish, FADE_MS + 150);
  }

  // Trava controles/HUD e começa o fade-in da tela preta. Usada pelas
  // duas ligações — é justamente o que garante que a segunda tenha
  // exatamente a mesma estética e o mesmo comportamento da primeira,
  // sem nenhum sistema de fade novo.
  function beginCall(player, container) {
    player.setControlsEnabled(false);
    window.HUD.setVisible(false);

    const overlay = document.createElement("div");
    overlay.className = "phone-sequence-overlay";
    container.appendChild(overlay);

    // Força o navegador a "confirmar" o estado inicial (opacidade 0)
    // antes de mudar para 1 logo abaixo — sem isso, por ser um
    // elemento recém-inserido, a primeira mudança de opacidade
    // correria o risco de não animar (pular direto pro valor final
    // em vez de fazer a transição).
    void overlay.offsetWidth;
    overlay.style.opacity = "1";

    return overlay;
  }

  // Segunda metade, idêntica nas duas ligações: clique de atendimento
  // + fade-out em paralelo, e o diálogo da ligação quando a tela já
  // voltou ao normal.
  function answerAndTalk(player, container, overlay, dialogueKey, onComplete) {
    window.PhoneAudio.playAnswered();
    overlay.style.opacity = "0";

    waitForFade(overlay, function () {
      overlay.remove();

      const dialogueBox = window.DialogueBox.create(container);
      dialogueBox.show();
      dialogueBox.playSequence(window.DialogueConfig[dialogueKey], function () {
        // Diálogo terminou (última fala confirmada ou "PULAR TUDO"):
        // clique curto de desligar antes de fechar a caixa e devolver
        // o controle.
        window.PhoneAudio.playHangup();
        dialogueBox.hide();
        player.setControlsEnabled(true);
        if (onComplete) {
          onComplete();
        }
      });
    });
  }

  // ---------- 1) Ligação feita por Kael (primeira do jogo) ----------
  // O fade-in e a discagem começam juntos, sem esperar um pelo outro
  // (igual a uma ligação de verdade: o jogador já ouve o telefone
  // discando enquanto a tela ainda escurece). Quem determina quanto
  // tempo a tela fica preta é a duração real do áudio de discagem +
  // toque (Promises de audio/phone-audio.js), não um tempo fixo.
  function play(player, container, onComplete) {
    const overlay = beginCall(player, container);

    window.PhoneAudio.playDial()
      .then(function () {
        // Discagem terminou: telefone começa a chamar.
        return window.PhoneAudio.playRinging();
      })
      .then(function () {
        // Toque terminou: ligação atendida.
        answerAndTalk(player, container, overlay, OUTGOING_DIALOGUE_KEY, onComplete);
      });
  }

  // ---------- 2) Ligação recebida (segunda, na manhã) ----------
  // Aqui não existe discagem nem espera de chamada: o telefone já
  // estava tocando no corredor. O toque em loop continua durante todo
  // o fade-in e só é cortado no instante do clique de atendimento, com
  // a tela já completamente preta — daí em diante é exatamente o mesmo
  // caminho da primeira ligação (fade-out + diálogo).
  function playIncoming(player, container, onComplete) {
    const overlay = beginCall(player, container);

    waitForFade(overlay, function () {
      window.PhoneAudio.stopIncomingRing();
      answerAndTalk(player, container, overlay, INCOMING_DIALOGUE_KEY, onComplete);
    });
  }

  return { play: play, playIncoming: playIncoming };
})();
