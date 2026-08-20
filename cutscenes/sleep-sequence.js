/**
 * cutscenes/sleep-sequence.js
 * -------------------------------------------------
 * Sequência de dormir do quarto ("MEU QUARTO"): toca quando o jogador
 * aperta "Interagir" com a cama já com o abajur apagado (ver
 * "kind": "bed" em scripts/main.js e o comentário correspondente em
 * scenes/room-scene.js). Cinco fases, em ordem:
 *
 *   1. Câmera anima suavemente (5-10s, ver SLEEP_ANIM_DURATION_MS) da
 *      posição/direção atuais do jogador até "deitado na cama, olhando
 *      para o teto" — a câmera acompanha o movimento inteiro, sem
 *      corte, terminando apontada para cima (ver CEILING_PITCH) e
 *      GIRADA no eixo da cama, no sentido "cabeceira -> pés" (ver
 *      `footYaw` em `play`): a tela gira até ficar como quem está
 *      deitado de costas, cabeça no travesseiro, olhando o teto reto na
 *      direção do pé da cama — nunca no da cabeceira. Só depois disso a
 *      tela escurece.
 *   2. Fade-in de uma camada preta (tela escurece por completo).
 *   3. Com a tela completamente preta: o quarto vira dia — a luz da
 *      manhã liga, o céu azul da vista externa aparece e os
 *      relâmpagos das janelas desligam (ver `setMorning()` em
 *      scenes/room-scene.js) — e o corredor também
 *      vira dia, exatamente do mesmo jeito (ver `setMorning()` em
 *      scenes/corridor-scene.js), mesmo estando fora de tela nesse
 *      momento (o jogador só volta a vê-lo mais tarde, ao sair do
 *      quarto). A névoa da cena troca junto, da paleta de noite para
 *      a de dia (ver `atmosphere.setMorning()` em
 *      scripts/atmosphere.js): ela é da CENA, compartilhada pelos dois
 *      cenários, por isso vem de fora e não de dentro deles — e a
 *      câmera já fica
 *      pronta no ponto de partida da animação de levantar (mesma
 *      posição/pitch de quando a tela escureceu). Nada disso chega a
 *      ser visto.
 *   4. Fade-out da camada preta (a manhã é revelada) ao mesmo tempo em
 *      que a câmera anima de volta, de "deitado olhando pro teto" até
 *      a posição/altura de pé de sempre, olhando para a frente — ou
 *      seja, o jogador já está se levantando assim que a imagem
 *      começa a aparecer, exatamente como pedido.
 *   5. As duas animações da fase 4 (fade e câmera) não têm
 *      necessariamente a mesma duração — só quando as DUAS terminam é
 *      que os controles voltam ao jogador (ver `tryFinish` dentro de
 *      `play`).
 *
 * Este módulo assume controle total da câmera do início ao fim (ver
 * `player.setCameraOverrideEnabled` em scripts/player-controller.js):
 * diferente das outras cutscenes do jogo (que só mexem no pitch via
 * `setLookPitch` ou teleportam instantaneamente), aqui a câmera
 * precisa se mover de verdade (posição + pitch) de forma gradual, o
 * que o restante da API de PlayerController não permite. Ao final,
 * `player.teleport(...)` resincroniza o estado interno do
 * PlayerController com onde a câmera realmente ficou, antes de
 * devolver o controle — sem esse passo, o próximo quadro puxaria a
 * câmera de volta para a posição antiga (ver comentário de
 * `cameraOverrideActive` em player-controller.js).
 *
 * window.SleepSequence.play(player, camera, container, room, corridor, atmosphere, bedTarget, onComplete)
 * -------------------------------------------------
 */

window.SleepSequence = (function () {
  // Duração da animação de ir dormir — dentro da janela de 5-10s
  // pedida, sem ficar nem no mínimo nem no máximo.
  const SLEEP_ANIM_DURATION_MS = 7000;

  // Duração da animação de levantar (não tem uma janela pedida —
  // só precisa ser "natural e suave"; mais curta que a de dormir
  // porque não é o momento central da cena, mas ainda longa o
  // bastante para não parecer um corte).
  const WAKE_ANIM_DURATION_MS = 4000;

  // Duração de cada metade do fade (precisa bater com a transição
  // definida em cutscenes/sleep-sequence.css). Vale para o fade-in
  // (adormecer) e para o fade-out (acordar), os dois iguais. Era 900ms
  // antes desta correção: rápido demais, o jogador "acordava num
  // piscar" em vez de a manhã ir surgindo. O dobro disso já dá o peso
  // de sono/despertar sem arrastar a cena.
  const FADE_HALF_MS = 1800;

  // Altura da câmera "deitada" na cama (unidades do jogo, chão = 0 —
  // mesma referência de config.eyeHeight). Medida diretamente na
  // malha de assets/models/bed_psx.glb: o topo do colchão, perto do
  // centro do móvel (onde `sleepSpot` posiciona X/Z — ver
  // scenes/room-scene.js), fica em torno de Y = 0.54-0.57. Um valor
  // igual ou muito perto disso (era 0.55 antes desta correção) deixa
  // a câmera cravada bem em cima/dentro do colchão: perto o bastante
  // do plano de corte próximo da câmera (`near = 0.05`, ver
  // scripts/main.js) para um único polígono enorme e mal iluminado
  // encher a tela inteira, num branco/cinza estourado — o bug
  // relatado. 0.85 dá uma folga confortável acima do colchão
  // (ainda bem abaixo do topo da cabeceira, ~0.9-1.0, que de todo
  // jeito fica numa ponta bem longe do centro do móvel).
  const LIE_DOWN_HEIGHT = 0.85;

  // Pitch final "olhando para o teto" (radianos, mesma convenção de
  // scripts/player-controller.js: positivo = para cima). Não é
  // exatamente Math.PI/2 (90°) de propósito — bem perto disso já lê
  // como "olhando direto para cima", evitando qualquer efeito visual
  // estranho bem em cima do ponto exato de reto para cima.
  const CEILING_PITCH = 1.55;

  // Yaw (radianos, mesma convenção de scripts/player-controller.js:
  // 0 = olhando para -Z, frente = (-sin yaw, -cos yaw)) que aponta a
  // câmera na direção horizontal `dir` ({x, z}, normalizado).
  function yawTowards(dir) {
    return Math.atan2(-dir.x, -dir.z);
  }

  // Mesmo ângulo que `targetYaw`, mas escrito como o valor mais próximo
  // de `fromYaw` (diferença sempre dentro de ±180°). `tweenCamera`
  // interpola o yaw em linha reta, então sem isto a câmera poderia dar
  // uma volta de 300° para a esquerda onde 60° para a direita chegariam
  // no mesmo lugar.
  function nearestYaw(fromYaw, targetYaw) {
    let delta = (targetYaw - fromYaw) % (Math.PI * 2);
    if (delta > Math.PI) {
      delta -= Math.PI * 2;
    }
    if (delta < -Math.PI) {
      delta += Math.PI * 2;
    }
    return fromYaw + delta;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Anima `camera.position`/`camera.rotation` de `from` para `to`
  // (cada um um objeto {x, y, z, pitch, yaw}) ao longo de
  // `durationMs`, com aceleração/desaceleração suaves nas duas
  // pontas — reaproveitada tanto para a animação de dormir quanto
  // para a de levantar (ver `play` abaixo).
  function tweenCamera(camera, from, to, durationMs, onDone) {
    const start = performance.now();

    function step(now) {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = easeInOutCubic(t);

      camera.position.set(
        from.x + (to.x - from.x) * eased,
        from.y + (to.y - from.y) * eased,
        from.z + (to.z - from.z) * eased
      );
      camera.rotation.x = from.pitch + (to.pitch - from.pitch) * eased;
      camera.rotation.y = from.yaw + (to.yaw - from.yaw) * eased;

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        onDone();
      }
    }

    requestAnimationFrame(step);
  }

  // Mesma técnica de espera de cutscenes/room-transition.js: aguarda o
  // fim de verdade da transição de opacidade ("transitionend"), com um
  // setTimeout de salvaguarda para a sequência sempre continuar, mesmo
  // se o evento não disparar por algum motivo.
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
    setTimeout(finish, FADE_HALF_MS + 150);
  }

  // `onMorning` (opcional, ultimo parametro) e chamado no instante da
  // tela 100% preta, junto com as duas viradas abaixo: e por ele que o
  // RESTO da casa amanhece (os quatro comodos laterais e o telhado, que
  // nao sao "room" nem "corridor" - ver playSleepSequence em
  // scripts/main.js). Sem ele, a fachada externa do corredor e do quarto
  // amanhecia e a dos comodos ficava na paleta de noite ao lado.
  function play(player, camera, container, room, corridor, atmosphere, bedTarget, onComplete, onMorning) {
    // Controles e HUD ficam bloqueados/escondidos do início ao fim da
    // sequência inteira — mesma regra de qualquer cutscene em engine
    // do jogo. `setCameraOverrideEnabled(true)` também tira o
    // PlayerController do caminho da câmera (ver comentário no topo
    // deste arquivo): sem isso, o reposicionamento de sempre no
    // eyeHeight desfaria a animação a cada quadro.
    player.setControlsEnabled(false);
    player.setCameraOverrideEnabled(true);
    window.HUD.setVisible(false);

    const standingPose = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      pitch: camera.rotation.x,
      yaw: camera.rotation.y,
    };

    // Yaw de destino ao deitar: alinhado com o eixo da cama, virado no
    // sentido "cabeceira -> pés" (`footDirection` vem da própria cama,
    // já em coordenadas do mundo — ver scenes/room-scene.js; nenhum
    // eixo chumbado aqui). Antes desta correção a câmera guardava o yaw
    // que o jogador tinha ao interagir: como ele chega na cama vindo da
    // entrada do quarto, olhando para a cabeceira, com o pitch quase
    // reto para cima a tela terminava girada para o lado da CABECEIRA —
    // o problema relatado. É o yaw, e não o pitch, que decide esse giro
    // quando se olha para o teto. Para inverter o sentido algum dia,
    // basta somar Math.PI aqui. Sem `footDirection` (cama de alguma
    // cena que não forneça esse dado), cai no comportamento antigo.
    const footYaw = bedTarget.footDirection
      ? yawTowards(bedTarget.footDirection)
      : standingPose.yaw;

    // Ponto de destino ao deitar: o centro da própria cama (ver
    // `sleepSpot` em scenes/room-scene.js), na altura aproximada de
    // quem está deitado, olhando reto para cima na direção do pé da
    // cama. Posição, pitch e yaw animam juntos, na mesma tween, então o
    // giro da tela acontece de forma contínua, junto do movimento de
    // deitar — sem nenhum corte nem virada seca.
    const lyingPose = {
      x: bedTarget.sleepSpot.x,
      y: LIE_DOWN_HEIGHT,
      z: bedTarget.sleepSpot.z,
      pitch: CEILING_PITCH,
      yaw: nearestYaw(standingPose.yaw, footYaw),
    };

    // Fase 1: câmera "deita" na cama (ver comentário no topo do
    // arquivo) — só então a tela começa a escurecer.
    tweenCamera(camera, standingPose, lyingPose, SLEEP_ANIM_DURATION_MS, function () {
      const overlay = document.createElement("div");
      overlay.className = "sleep-sequence-overlay";
      container.appendChild(overlay);

      // Confirma o estado inicial (opacidade 0) antes de mudar para 1
      // — mesmo motivo das outras cutscenes: sem isso, a primeira
      // mudança de opacidade de um elemento recém-inserido corre o
      // risco de não animar.
      void overlay.offsetWidth;

      // Fase 2: fade-in (tela escurece).
      overlay.style.opacity = "1";
      waitForFade(overlay, function () {
        // Fase 3: tela completamente preta — o quarto vira dia, sem o
        // jogador ver a troca (ver comentário no topo do arquivo). O
        // corredor vira dia junto, mesmo estando fora da cena neste
        // momento (o jogador está dentro do quarto) — como é apenas
        // estado interno (intensidade de luz, relâmpagos desligados),
        // fica pronto para quando o jogador sair do quarto mais tarde.
        if (room && room.setMorning) {
          room.setMorning();
        }
        if (corridor && corridor.setMorning) {
          corridor.setMorning();
        }
        // O resto da casa (ver o comentario de `onMorning` no topo de
        // play): as zonas que nao sao o quarto nem o corredor e o
        // telhado. Mesmo instante, mesma tela preta.
        if (typeof onMorning === "function") {
          onMorning();
        }

        // Porta compartilhada com o corredor FECHADA, sem giro animado
        // (ver setOpenImmediate em models/door-factory.js). Duas razoes,
        // as duas do mesmo tamanho:
        //
        //  - leitura: o jogador dormiu; acordar com a porta do quarto
        //    fechada e o esperado;
        //  - regra da historia: e a porta fechada que devolve sentido ao
        //    "abrir a janela antes de sair do quarto" (ver
        //    "porta compartilhada vista de dentro do quarto" em
        //    scripts/main.js). Antes desta atualizacao isso vinha de
        //    graca, porque sair do quarto era trocar de cenario; agora a
        //    passagem e fisica, entao ela precisa mesmo estar fechada.
        //
        // Acontece com a tela 100% preta, entao nada disso e visto.
        if (corridor && corridor.roomDoor) {
          corridor.roomDoor.closeImmediate();
        }
        // Névoa da cena: paleta de noite -> paleta de dia (ver
        // scripts/atmosphere.js). Diferente das duas linhas acima,
        // isto não é estado de um cenário: a névoa é única e vale
        // para os dois ao mesmo tempo (ver scripts/main.js). Sem esta
        // troca, a névoa PRETA da noite continuaria fechando a 13
        // unidades e apagaria a grama distante num breu, deixando uma
        // faixa escura entre o chão e o céu azul no vão da janela.
        if (atmosphere && atmosphere.setMorning) {
          atmosphere.setMorning();
        }

        // Fase 4: fade-out (a manhã é revelada) e a animação de
        // levantar começam juntas — o jogador já está se levantando
        // assim que a imagem começa a aparecer. Volta exatamente para
        // onde e para onde estava olhando antes de deitar (pitch
        // nivelado no final, para "acordou e ficou de pé olhando pra
        // frente" em vez de repetir o ângulo de olhar de antes de
        // dormir). O yaw também desgira junto, de volta ao de antes de
        // deitar: como `lyingPose.yaw` já foi escrito como o ângulo mais
        // próximo do de pé (ver `nearestYaw` acima), a volta sai pelo
        // lado curto, sem nenhuma conta extra aqui.
        const wakingPose = {
          x: standingPose.x,
          y: standingPose.y,
          z: standingPose.z,
          pitch: 0,
          yaw: standingPose.yaw,
        };

        let fadeDone = false;
        let wakeDone = false;
        function tryFinish() {
          if (!fadeDone || !wakeDone) {
            return;
          }
          overlay.remove();
          // Resincroniza o PlayerController com a pose final antes de
          // devolver o controle (ver comentário no topo do arquivo).
          player.teleport(standingPose.x, standingPose.z, standingPose.yaw, 0);
          player.setCameraOverrideEnabled(false);
          player.setControlsEnabled(true);
          window.HUD.setVisible(true);
          if (onComplete) {
            onComplete();
          }
        }

        overlay.style.opacity = "0";
        waitForFade(overlay, function () {
          fadeDone = true;
          tryFinish();
        });
        tweenCamera(camera, lyingPose, wakingPose, WAKE_ANIM_DURATION_MS, function () {
          wakeDone = true;
          tryFinish();
        });
      });
    });
  }

  return { play: play };
})();
