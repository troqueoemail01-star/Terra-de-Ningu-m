/**
 * audio/phone-audio.js
 * -------------------------------------------------
 * Sons da sequência telefônica da cena inicial (ver
 * cutscenes/phone-sequence.js). Segundo "pacote" de efeitos sonoros
 * do jogo, depois dos passos (ver audio/footstep-audio.js e
 * audio/README.md) — mesma arquitetura de fundo (Web Audio API,
 * AudioBuffer decodificado uma única vez, volume lido ao vivo de
 * "Efeitos sonoros" em scripts/game-settings.js).
 *
 * Dois grupos de som, dependendo se existe gravação de referência:
 *
 *   1) Discagem e chamada (`playDial`/`playRinging`): recortados de
 *      um único áudio de referência enviado pelo dev (uma ligação
 *      real, discagem + toque), carregados como AudioBuffer a partir
 *      de audio/telefone/discagem.wav e audio/telefone/chamando.wav
 *      — ver comentário de AUDIO_FILES abaixo para o que foi cortado
 *      de cada trecho. Cada um devolve uma Promise que só resolve
 *      quando o som termina de tocar sozinho ("onended"): é essa
 *      Promise que cutscenes/phone-sequence.js encadeia
 *      (playDial().then(playRinging).then(...)) para saber quando
 *      avançar de etapa, em vez de um tempo fixo "chutado" no
 *      código — a duração da mini cutscene nasce automaticamente
 *      igual à duração real do áudio, sem precisar manter dois
 *      números em sincronia manualmente.
 *
 *   2) Cliques curtos de gancho (`playAnswered`/`playHangup`): sem
 *      gravação de referência para estes dois (o áudio enviado cobre
 *      só discagem + toque) — sintetizados na hora via Web Audio
 *      (osciladores + ruído filtrado), mesmo princípio já usado antes
 *      neste projeto para os passos, antes de existir gravação real
 *      (ver comentário no topo de audio/README.md). Tocados direto,
 *      sem Promise, porque não precisam segurar a sequência.
 * -------------------------------------------------
 */

window.PhoneAudio = (function () {
  // Recortes do áudio de referência enviado pelo dev (ligação real,
  // discagem + 2 toques completos), já limpos e com pequenos fades
  // nas pontas para não estalar:
  //   - discagem.wav: só os tons de discagem (~2,77s), com um
  //     pequeno silêncio natural antes do primeiro tom.
  //   - chamando.wav: da pausa logo depois da discagem até o fim do
  //     2º toque completo (~5,66s) — inclui a pequena pausa antes do
  //     telefone começar a chamar, igual à ligação original.
  // Convertidos para mono (metade do tamanho do arquivo original em
  // estéreo; efeito de telefone soa até mais autêntico em mono) —
  // caminhos relativos a index.html, mesmo padrão de
  // audio/footstep-audio.js.
  const AUDIO_FILES = {
    discagem: "audio/telefone/discagem.wav",
    chamando: "audio/telefone/chamando.wav",
  };

  let audioCtx = null;
  let masterGain = null;

  // buffers[nome] só existe depois que o fetch+decode daquele arquivo
  // terminar (ver loadBuffers). Enquanto null, playBufferByName espera
  // um pouco (poll) antes de desistir — ver comentário lá embaixo.
  const buffers = { discagem: null, chamando: null };
  let buffersRequested = false;

  function ensureContext() {
    if (audioCtx) {
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      return; // navegador sem suporte — sons ficam mudos, sem quebrar o resto do jogo
    }
    try {
      audioCtx = new Ctor();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(audioCtx.destination);
    } catch (e) {
      audioCtx = null; // ambiente sem Web Audio de verdade (raro) — segue mudo
    }
  }

  // Busca e decodifica discagem.wav e chamando.wav uma única vez.
  // decodeAudioData funciona com o contexto ainda "suspended" (não
  // precisa esperar nenhum toque do jogador) — por isso é chamada já
  // no carregamento do script (ver o fim deste arquivo), em paralelo
  // com o resto do jogo, bem antes do jogador chegar perto do
  // telefone.
  function loadBuffers() {
    if (buffersRequested || !audioCtx) {
      return;
    }
    buffersRequested = true;

    Object.keys(AUDIO_FILES).forEach(function (name) {
      fetch(AUDIO_FILES[name])
        .then(function (res) {
          if (!res.ok) {
            throw new Error("HTTP " + res.status);
          }
          return res.arrayBuffer();
        })
        .then(function (arrayBuffer) {
          return audioCtx.decodeAudioData(arrayBuffer);
        })
        .then(function (buffer) {
          buffers[name] = buffer;
        })
        .catch(function (e) {
          // Arquivo faltando/corrompido: essa etapa da ligação
          // simplesmente fica muda (ver playBufferByName), sem
          // travar o resto da sequência nem do jogo.
        });
    });
  }

  // Mesmo princípio (e mesmos eventos) de
  // scripts/fullscreen-manager.js e audio/footstep-audio.js para o
  // primeiro toque do jogador: a maioria dos navegadores móveis só
  // libera a REPRODUÇÃO de áudio depois de um gesto do usuário —
  // o carregamento em si (acima) não precisa esperar por isso.
  let unlockAttached = false;
  function attachUnlockListener() {
    if (unlockAttached) {
      return;
    }
    unlockAttached = true;
    const resume = function () {
      ensureContext();
      loadBuffers();
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(function () {});
      }
    };
    ["pointerdown", "touchend", "mousedown", "keydown"].forEach(function (evt) {
      document.addEventListener(evt, resume, { passive: true });
    });
  }

  // Começa a carregar os dois arquivos assim que este script é
  // interpretado — não precisa esperar o jogador chegar perto do
  // telefone nem interagir com nada antes.
  ensureContext();
  loadBuffers();
  attachUnlockListener();

  function getSfxVolume01() {
    if (
      window.GameSettings &&
      typeof window.GameSettings.getSfxVolume === "function"
    ) {
      return Math.max(0, Math.min(1, window.GameSettings.getSfxVolume() / 100));
    }
    return 0.8; // mesmo padrão de scripts/game-settings.js, se por algum motivo não estiver carregado
  }

  // Toca um dos dois arquivos carregados e devolve uma Promise que
  // resolve quando ele termina sozinho ("onended"). O source sempre
  // é criado e iniciado (mesmo com volume 0/"Efeitos sonoros"
  // desligado) — só o ganho fica em 0 nesse caso — para o RITMO da
  // mini cutscene (quanto tempo cada etapa dura) nunca depender do
  // volume estar ligado ou não; só o áudio propriamente dito depende.
  //
  // Se o arquivo ainda não carregou (rede lenta), espera um pouco
  // (poll a cada 100ms, até ~4s) antes de desistir e resolver mesmo
  // assim sem tocar nada — a ligação nunca trava esperando áudio.
  function playBufferByName(name) {
    return new Promise(function (resolve) {
      ensureContext();
      if (!audioCtx) {
        resolve();
        return;
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(function () {});
      }

      function attempt(attemptsLeft) {
        const buffer = buffers[name];
        if (buffer) {
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;

          const gainNode = audioCtx.createGain();
          gainNode.gain.value = getSfxVolume01();

          source.connect(gainNode);
          gainNode.connect(masterGain);

          source.onended = function () {
            try {
              source.disconnect();
              gainNode.disconnect();
            } catch (e) {
              // nós já desconectados/coletados — sem problema nenhum
            }
            resolve();
          };
          source.start(audioCtx.currentTime);
          return;
        }
        if (attemptsLeft <= 0) {
          resolve(); // desistiu de esperar o carregamento — sequência não trava
          return;
        }
        setTimeout(function () {
          attempt(attemptsLeft - 1);
        }, 100);
      }

      attempt(40);
    });
  }

  function playDial() {
    return playBufferByName("discagem");
  }

  function playRinging() {
    return playBufferByName("chamando");
  }

  // ---------- Toque contínuo de uma ligação RECEBIDA ----------
  // Diferente de playRinging() acima (que toca o arquivo uma vez só e
  // devolve uma Promise, servindo de "relógio" da mini cutscene da
  // primeira ligação), aqui é o telefone da casa tocando sozinho,
  // esperando o jogador: o mesmo chamando.wav em loop, sem Promise
  // nenhuma, até que alguém chame stopIncomingRing(). É o que segura o
  // toque enquanto o jogador anda pelo corredor até a escrivaninha
  // (ver startIncomingPhoneCall() em scripts/main.js).
  //
  // Reaproveita o som que já existe no projeto (audio/telefone/
  // chamando.wav, o mesmo da primeira ligação): ele já começa com a
  // pequena pausa natural antes do toque, então o loop sai com o
  // intervalo certo entre uma chamada e outra, sem nenhum ajuste.
  //
  // ESPACIALIZAÇÃO: este toque NÃO soa colado no ouvido do jogador —
  // ele sai do telefone, lá na escrivaninha do corredor. Mesmo
  // princípio já usado no som das cortinas (ver audio/curtain-audio.js:
  // câmera registrada como "ouvinte" via setListener, distância e lado
  // calculados na mão a partir da matrixWorld dela, sem depender do
  // THREE aqui dentro), com duas diferenças que este caso exige:
  //
  //   1. o som é CONTÍNUO e o jogador se move enquanto ele toca, então
  //      não dá pra calcular volume/pan uma vez só no começo — quem
  //      recalcula é updateIncomingRing(), chamada uma vez por quadro
  //      pelo loop principal (mesmo padrão de footsteps.update em
  //      scripts/main.js). Todo valor entra por setTargetAtTime, com
  //      uma constante de tempo curta: a mudança acompanha o passo do
  //      jogador sem nenhum "zíper"/estalo de parâmetro pulando de
  //      quadro em quadro;
  //   2. a distância aqui é bem maior que a de uma cortina (dá pra
  //      estar no fim do corredor, ou até dentro do quarto), então além
  //      do volume cair existe um filtro passa-baixa: longe, o toque
  //      chega abafado, como som atravessando o corredor/parede; perto,
  //      abre e fica nítido. É isso que dá a leitura de "o telefone
  //      está tocando ALI" em vez de "o jogo está tocando um som".
  //
  // Sem listener registrado (ou em navegador sem StereoPannerNode), o
  // toque simplesmente soa centralizado, como antes — nunca deixa de
  // tocar por causa disso.

  // Volume cheio até REF_DISTANCE (jogador praticamente em cima da
  // escrivaninha) e caindo daí em diante com uma curva de atenuação
  // inversa (a mesma forma que o mundo real usa, e que o PannerNode
  // chama de "inverse"), até um piso audível em MAX_DISTANCE — o toque
  // nunca some por completo, senão o jogador perderia a pista de onde
  // ir se estivesse longe.
  const RING_REF_DISTANCE = 1.4;
  const RING_MAX_DISTANCE = 20;
  const RING_ROLLOFF = 1.1;
  const RING_MIN_GAIN = 0.12;

  // Volume relativo do toque, por cima de "Efeitos sonoros" das
  // Configurações (mesma ideia de CURTAIN_GAIN em
  // audio/curtain-audio.js).
  const RING_GAIN = 0.9;

  // Passa-baixa por distância: aberto de perto, abafado de longe. O
  // valor de longe é baixo o bastante pra ler como "som vindo de outro
  // canto da casa", sem virar um som abafado demais a ponto de sumir.
  const RING_NEAR_CUTOFF = 16000;
  const RING_FAR_CUTOFF = 1100;

  // Quando o telefone está ATRÁS do jogador, o passa-baixa fecha um
  // pouco mais. Estéreo puro (esquerda/direita) não distingue frente de
  // trás; esse abafamento extra é o truque de sempre pra dar essa
  // dica ao ouvido, sem precisar de HRTF.
  const RING_BEHIND_CUTOFF_FACTOR = 0.55;

  // Quanto o toque pode ir pros lados no estéreo. Um pouco mais
  // generoso que o das cortinas (que só tocam com o jogador de frente
  // pro objeto): aqui o telefone pode estar perfeitamente a 90 graus
  // do olhar, e é justamente esse pan que faz o jogador virar a cabeça
  // pro lado certo.
  const RING_MAX_PAN = 0.85;

  // Bem de perto o pan volta pro centro: passando do telefone, um pan
  // extremo soaria artificial (o fone "pulando" de um lado pro outro).
  const RING_PAN_FULL_DISTANCE = 1.2;

  // Suavização de todo parâmetro espacial (segundos). Curta o bastante
  // pra acompanhar o jogador andando, longa o bastante pra não
  // estalar.
  const RING_SMOOTH_TIME = 0.06;

  let incomingNodes = null;
  let incomingCancelled = false;
  let incomingPosition = null;
  let listenerCamera = null;

  /**
   * Registra a câmera do jogador como "ouvinte" do toque (chamado uma
   * única vez em scripts/main.js, ao lado do mesmo registro já feito
   * para CurtainAudio). Guardada só como referência: a matriz dela é
   * lida na hora de cada atualização.
   */
  function setListener(camera) {
    listenerCamera = camera || null;
  }

  // Volume, lado e abafamento do toque a partir de onde o jogador está
  // e pra onde está olhando NESTE quadro. Lê a matrixWorld da câmera na
  // mão (elements[12..14] = posição, [0..2] = vetor "direita",
  // [8..10] = vetor "trás") pelo mesmo motivo de
  // audio/curtain-audio.js: este módulo não precisa conhecer o THREE.
  function spatializeRing() {
    const result = { gain: 1, pan: 0, cutoff: RING_NEAR_CUTOFF };
    if (!incomingPosition || !listenerCamera || !listenerCamera.matrixWorld) {
      return result;
    }

    const e = listenerCamera.matrixWorld.elements;
    const dx = incomingPosition.x - e[12];
    const dy = incomingPosition.y - e[13];
    const dz = incomingPosition.z - e[14];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!isFinite(dist) || dist < 0.0001) {
      return result;
    }

    // Atenuação inversa por distância, com piso.
    const clamped = Math.max(RING_REF_DISTANCE, Math.min(RING_MAX_DISTANCE, dist));
    const inverse =
      RING_REF_DISTANCE /
      (RING_REF_DISTANCE + RING_ROLLOFF * (clamped - RING_REF_DISTANCE));
    result.gain = Math.max(RING_MIN_GAIN, inverse);

    // Progresso 0..1 de "colado no telefone" até "o mais longe que
    // importa" — usado tanto pelo filtro quanto pela abertura do pan.
    const far = Math.min(
      1,
      Math.max(0, (dist - RING_REF_DISTANCE) / (RING_MAX_DISTANCE - RING_REF_DISTANCE))
    );

    // Passa-baixa interpolado em escala logarítmica (é assim que o
    // ouvido percebe frequência: linear soaria "tudo abafado de uma
    // vez" nos primeiros metros).
    const logNear = Math.log(RING_NEAR_CUTOFF);
    const logFar = Math.log(RING_FAR_CUTOFF);
    let cutoff = Math.exp(logNear + (logFar - logNear) * far);

    const right = (dx * e[0] + dy * e[1] + dz * e[2]) / dist;
    // e[8..10] é o vetor "trás" da câmera no THREE (ela olha para -Z
    // local), então o produto escalar com ele é positivo quando o
    // telefone está ATRÁS do jogador.
    const behind = (dx * e[8] + dy * e[9] + dz * e[10]) / dist;
    if (behind > 0) {
      cutoff *= 1 - (1 - RING_BEHIND_CUTOFF_FACTOR) * Math.min(1, behind);
    }
    result.cutoff = Math.max(300, cutoff);

    // Pan: cheio a partir de RING_PAN_FULL_DISTANCE, voltando ao centro
    // conforme o jogador encosta no telefone.
    const panScale = Math.min(1, dist / RING_PAN_FULL_DISTANCE);
    result.pan = Math.max(
      -RING_MAX_PAN,
      Math.min(RING_MAX_PAN, right * RING_MAX_PAN * panScale)
    );

    return result;
  }

  // Aplica volume/pan/filtro nos nós que já estão tocando. `immediate`
  // só no primeiro quadro (o toque já começa no volume e no lado
  // certos, em vez de "chegar" ao valor correto depois de alguns
  // milissegundos vindo do centro).
  function applyRingSpatial(immediate) {
    if (!incomingNodes || !audioCtx) {
      return;
    }
    const spatial = spatializeRing();
    const target = getSfxVolume01() * RING_GAIN * spatial.gain;
    const now = audioCtx.currentTime;

    if (immediate) {
      incomingNodes.gain.gain.setValueAtTime(target, now);
      incomingNodes.filter.frequency.setValueAtTime(spatial.cutoff, now);
      if (incomingNodes.panner) {
        incomingNodes.panner.pan.setValueAtTime(spatial.pan, now);
      }
      return;
    }

    incomingNodes.gain.gain.setTargetAtTime(target, now, RING_SMOOTH_TIME);
    incomingNodes.filter.frequency.setTargetAtTime(
      spatial.cutoff,
      now,
      RING_SMOOTH_TIME
    );
    if (incomingNodes.panner) {
      incomingNodes.panner.pan.setTargetAtTime(spatial.pan, now, RING_SMOOTH_TIME);
    }
  }

  /**
   * Começa o toque em loop.
   *
   * `options`:
   *   - `position`: {x, y, z} do telefone no mundo. Sem isso (ou sem
   *     listener registrado), o toque soa centralizado, sem
   *     espacialização — nunca deixa de tocar.
   */
  function startIncomingRing(options) {
    stopIncomingRing();
    incomingCancelled = false;

    const opts = options || {};
    incomingPosition = opts.position || null;

    ensureContext();
    if (!audioCtx) {
      return;
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(function () {});
    }

    // Mesmo poll de playBufferByName: se o arquivo ainda não terminou
    // de carregar, espera um pouco em vez de simplesmente não tocar.
    function attempt(attemptsLeft) {
      if (incomingCancelled) {
        return;
      }
      const buffer = buffers.chamando;
      if (!buffer) {
        if (attemptsLeft > 0) {
          setTimeout(function () {
            attempt(attemptsLeft - 1);
          }, 100);
        }
        return;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Cadeia: source -> passa-baixa (distância/parede) -> panner
      // (lado) -> ganho (distância + volume das Configurações).
      const filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = RING_NEAR_CUTOFF;
      filter.Q.value = 0.7;

      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;

      let panner = null;
      source.connect(filter);
      if (typeof audioCtx.createStereoPanner === "function") {
        panner = audioCtx.createStereoPanner();
        filter.connect(panner);
        panner.connect(gainNode);
      } else {
        filter.connect(gainNode);
      }
      gainNode.connect(masterGain);

      incomingNodes = {
        source: source,
        gain: gainNode,
        filter: filter,
        panner: panner,
      };

      // Já nasce no volume/lado corretos para a posição atual do
      // jogador (ver applyRingSpatial acima).
      applyRingSpatial(true);
      source.start(audioCtx.currentTime);
    }

    attempt(40);
  }

  /**
   * Reavalia posição do jogador e volume das Configurações. Chamada
   * uma vez por quadro pelo loop principal (scripts/main.js) — sai na
   * hora se não houver nenhum toque em andamento, então pode ser
   * chamada sempre, sem nenhuma verificação do lado de lá.
   */
  function updateIncomingRing() {
    if (!incomingNodes) {
      return;
    }
    applyRingSpatial(false);
  }

  function stopIncomingRing() {
    incomingCancelled = true;
    if (!incomingNodes) {
      incomingPosition = null;
      return;
    }
    const nodes = incomingNodes;
    incomingNodes = null;
    incomingPosition = null;
    try {
      // Fade bem curto antes de parar de verdade: cortar um som em
      // loop no meio da onda estala (mesmo cuidado de stopVoice em
      // audio/curtain-audio.js).
      const now = audioCtx.currentTime;
      nodes.gain.gain.cancelScheduledValues(now);
      nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, now);
      nodes.gain.gain.linearRampToValueAtTime(0.0001, now + 0.04);
      nodes.source.stop(now + 0.06);
      setTimeout(function () {
        try {
          nodes.source.disconnect();
          nodes.filter.disconnect();
          if (nodes.panner) {
            nodes.panner.disconnect();
          }
          nodes.gain.disconnect();
        } catch (e) {
          // nós já desconectados/coletados — sem problema nenhum
        }
      }, 150);
    } catch (e) {
      // source já parado/coletado — sem problema nenhum
    }
  }

  function isIncomingRinging() {
    return !!incomingNodes;
  }

  // ---------- Cliques curtos sintetizados (sem arquivo) ----------
  // Simula o clique mecânico do gancho do telefone: um "thump" grave
  // curto (oscilador senoidal com pitch caindo rápido) por baixo de
  // uma camada fina de ruído filtrado (textura do contato/plástico).
  // "answered": clique único, mais agudo e mais curto (~0,11s).
  // "hangup": um pouco mais grave e mais longo (~0,19s), como o fone
  // sendo pousado com mais peso na forquilha.
  function playClick(kind) {
    ensureContext();
    if (!audioCtx) {
      return;
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(function () {});
    }
    const volume = getSfxVolume01();
    if (volume <= 0) {
      return; // aqui pode pular de verdade: não faz parte de nenhuma Promise/sequência
    }

    const isHangup = kind === "hangup";
    const now = audioCtx.currentTime;
    const thumpDur = isHangup ? 0.19 : 0.11;
    const noiseDur = isHangup ? 0.06 : 0.035;

    const thump = audioCtx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(isHangup ? 170 : 260, now);
    thump.frequency.exponentialRampToValueAtTime(isHangup ? 65 : 120, now + thumpDur);

    const thumpGain = audioCtx.createGain();
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(volume * (isHangup ? 0.55 : 0.4), now + 0.006);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + thumpDur);

    thump.connect(thumpGain);
    thumpGain.connect(masterGain);
    thump.start(now);
    thump.stop(now + thumpDur + 0.02);

    const noiseBuffer = audioCtx.createBuffer(
      1,
      Math.max(1, Math.floor(audioCtx.sampleRate * noiseDur)),
      audioCtx.sampleRate
    );
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = isHangup ? 900 : 1800;
    noiseFilter.Q.value = 0.9;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(volume * (isHangup ? 0.35 : 0.3), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + noiseDur);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(now);

    setTimeout(function () {
      try {
        thump.disconnect();
        thumpGain.disconnect();
        noise.disconnect();
        noiseFilter.disconnect();
        noiseGain.disconnect();
      } catch (e) {
        // nós já desconectados/coletados — sem problema nenhum
      }
    }, (thumpDur + 0.05) * 1000);
  }

  function playAnswered() {
    playClick("answered");
  }

  function playHangup() {
    playClick("hangup");
  }

  return {
    playDial: playDial,
    playRinging: playRinging,
    playAnswered: playAnswered,
    playHangup: playHangup,
    setListener: setListener,
    startIncomingRing: startIncomingRing,
    updateIncomingRing: updateIncomingRing,
    stopIncomingRing: stopIncomingRing,
    isIncomingRinging: isIncomingRinging,
  };
})();
