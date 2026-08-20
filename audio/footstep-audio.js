/**
 * audio/footstep-audio.js
 * -------------------------------------------------
 * Som de passos do jogador — primeiro efeito sonoro do jogo (ver
 * audio/README.md).
 *
 * Toca gravações reais de passo (arquivos em audio/passos/madeira/ e
 * audio/passos/tapete/ — ver AUDIO_FILES abaixo), carregadas como
 * AudioBuffer via Web Audio API. A versão anterior deste arquivo
 * sintetizava os passos na hora (ruído filtrado), porque a pasta
 * audio/ ainda não tinha nenhum som gravado; os arquivos atuais
 * vieram de uma gravação de passos em piso de madeira fornecida pelo
 * dev, com os golpes individuais recortados, limpos e normalizados
 * (madeira) e uma segunda passada (passa-baixa + ataque suavizado +
 * volume mais baixo) derivada dela para o tapete — ver comentário no
 * topo de audio/README.md para o processo completo. Cada som ainda é
 * um evento pontual (nunca um arquivo tocando em loop): a cada passo,
 * uma das 6 variações gravadas daquela superfície é sorteada (nunca a
 * mesma duas vezes seguidas) e tocada com pequenas variações
 * aleatórias de afinação/volume por cima, pra não soar repetitivo
 * mesmo com poucas variações-fonte.
 *
 * Arquitetura, pensada para crescer com outros tipos de superfície no
 * futuro (pedra, metal, grama etc. — ver `SURFACES` abaixo):
 *   - Cada superfície é uma entrada em `SURFACES`, mapeando o nome
 *     devolvido por getSurfaceAt() (ver scenes/corridor-scene.js e
 *     scenes/room-scene.js) para a função que toca aquele som.
 *     Adicionar uma nova superfície no futuro = adicionar uma entrada
 *     em AUDIO_FILES + SURFACES, sem tocar no resto do arquivo.
 *   - `create()` devolve só um `update(playerFrame, surfaceKind)`,
 *     chamado a cada quadro por scripts/main.js: decide sozinho SE
 *     este é o quadro exato de tocar um passo nesse instante,
 *     cruzando `walkPhase` (o mesmo relógio de fase que já dirige o
 *     head bob da câmera — ver scripts/player-controller.js) com um
 *     limiar fixo de meio ciclo. Como esse relógio só avança com a
 *     distância de fato percorrida (nunca com o tempo, nunca durante
 *     cutscene/diálogo — ver comentário de `isMoving`/`walkPhase` no
 *     final de PlayerController.update()), os passos já nascem
 *     sincronizados com o andar de verdade e mudos sempre que o
 *     jogador está parado ou sem controle, sem nenhuma lógica extra
 *     aqui.
 * -------------------------------------------------
 */

window.FootstepAudio = (function () {
  // Um "passo" (evento sonoro) a cada meio ciclo de `walkPhase` — o
  // mesmo relógio de fase de scripts/player-controller.js já avança
  // 2π por ciclo completo de balanço lateral do head bob, com dois
  // "bobs" (dois passos) por ciclo (ver comentário de
  // WALK_BOB_CYCLES_PER_UNIT nesse arquivo) — por isso meio ciclo
  // (Math.PI) aqui, não o ciclo inteiro.
  const STEP_PHASE = Math.PI;

  // As 6 variações gravadas de cada superfície (ver comentário do
  // topo do arquivo e audio/README.md). Caminhos relativos a
  // index.html, mesmo padrão usado pelos .glb em models/*-factory.js.
  const AUDIO_FILES = {
    madeira: [
      "audio/passos/madeira/passo-01.wav",
      "audio/passos/madeira/passo-02.wav",
      "audio/passos/madeira/passo-03.wav",
      "audio/passos/madeira/passo-04.wav",
      "audio/passos/madeira/passo-05.wav",
      "audio/passos/madeira/passo-06.wav",
    ],
    tapete: [
      "audio/passos/tapete/passo-01.wav",
      "audio/passos/tapete/passo-02.wav",
      "audio/passos/tapete/passo-03.wav",
      "audio/passos/tapete/passo-04.wav",
      "audio/passos/tapete/passo-05.wav",
      "audio/passos/tapete/passo-06.wav",
    ],
  };

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function create() {
    let audioCtx = null;
    let masterGain = null;
    let unlockAttached = false;

    // buffers[surfaceKind] = array de AudioBuffer já decodificados
    // (só as que carregaram com sucesso — ver loadAllBuffers()).
    // Enquanto vazio, playStep() abaixo simplesmente não toca nada
    // nesse passo (sem erro, sem travar o jogo), do mesmo jeito que
    // o resto do arquivo já tolera navegador sem Web Audio.
    const buffers = { madeira: [], tapete: [] };
    let buffersRequested = false;

    // Índice da última variação tocada por superfície, só pra evitar
    // sortear a mesma gravação duas vezes seguidas (ver pickBuffer).
    const lastVariation = { madeira: -1, tapete: -1 };

    // Índice do último passo já tocado (floor(walkPhase / STEP_PHASE)).
    // walkPhase só cresce enquanto o jogador anda de verdade (nunca
    // diminui, nunca "acumula" enquanto parado — ver comentário no
    // player-controller.js), então basta comparar com o valor
    // anterior a cada quadro.
    let lastStepIndex = 0;

    // Alterna levemente o painorama estéreo a cada passo (pé
    // esquerdo/direito) — detalhe pequeno, ignorado silenciosamente
    // se o navegador não suportar StereoPannerNode.
    let stepParity = 0;

    function ensureContext() {
      if (audioCtx) {
        return;
      }
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        return; // navegador sem suporte — passos ficam mudos, sem quebrar o resto do jogo
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

    // Busca e decodifica os 12 arquivos (6 madeira + 6 tapete) uma
    // única vez, assim que o AudioContext existir. Não precisa
    // esperar o desbloqueio por toque (decodeAudioData funciona com
    // o contexto ainda "suspended") — só a reprodução em si (mais
    // abaixo, em playStep) checa `audioCtx.state === "running"", pra
    // já ir carregando em paralelo com a cutscene de entrada e estar
    // pronto assim que o jogador ganhar controle.
    function loadAllBuffers() {
      if (buffersRequested || !audioCtx) {
        return;
      }
      buffersRequested = true;

      Object.keys(AUDIO_FILES).forEach(function (surfaceKind) {
        AUDIO_FILES[surfaceKind].forEach(function (url) {
          fetch(url)
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
              buffers[surfaceKind].push(buffer);
            })
            .catch(function (e) {
              // Um arquivo faltando/corrompido não derruba os outros
              // 11 nem o resto do jogo — só essa variação específica
              // nunca entra no sorteio (ver pickBuffer).
            });
        });
      });
    }

    // A maioria dos navegadores móveis só libera áudio depois de um
    // gesto de toque do usuário. Mesmo princípio (e mesmos eventos)
    // de scripts/fullscreen-manager.js para o primeiro toque do
    // jogo: assim que ele acontece, tenta destravar o AudioContext
    // uma única vez.
    function attachUnlockListener() {
      if (unlockAttached) {
        return;
      }
      unlockAttached = true;
      const resume = function () {
        ensureContext();
        loadAllBuffers();
        if (audioCtx && audioCtx.state === "suspended") {
          audioCtx.resume().catch(function () {});
        }
      };
      ["pointerdown", "touchend", "mousedown", "keydown"].forEach(function (evt) {
        document.addEventListener(evt, resume, { passive: true });
      });
    }

    function getSfxVolume01() {
      if (
        window.GameSettings &&
        typeof window.GameSettings.getSfxVolume === "function"
      ) {
        return Math.max(0, Math.min(1, window.GameSettings.getSfxVolume() / 100));
      }
      return 0.8; // mesmo padrão de scripts/game-settings.js, se por algum motivo não estiver carregado
    }

    // Sorteia uma variação da superfície dada, evitando repetir a
    // mesma da vez anterior (só possível pular a checagem se houver
    // 1 única variação carregada). Devolve null se nada carregou
    // ainda para essa superfície.
    function pickBuffer(surfaceKind) {
      const pool = buffers[surfaceKind];
      if (!pool || pool.length === 0) {
        return null;
      }
      if (pool.length === 1) {
        return pool[0];
      }
      let index = Math.floor(Math.random() * pool.length);
      if (index === lastVariation[surfaceKind]) {
        index = (index + 1) % pool.length;
      }
      lastVariation[surfaceKind] = index;
      return pool[index];
    }

    // Toca um AudioBuffer já carregado (source -> ganho -> pan
    // opcional -> masterGain), com pequena variação aleatória de
    // afinação (playbackRate) e volume por cima do arquivo em si,
    // pra as 6 gravações de cada superfície não soarem sempre
    // idênticas entre um passo e outro.
    function playBuffer(buffer, gainMul, pitchMin, pitchMax, pan) {
      const now = audioCtx.currentTime;

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = randRange(pitchMin, pitchMax);

      const gainNode = audioCtx.createGain();
      gainNode.gain.value = gainMul * randRange(0.85, 1.05);

      let lastNode = source;
      if (typeof audioCtx.createStereoPanner === "function") {
        const panner = audioCtx.createStereoPanner();
        panner.pan.value = pan;
        lastNode.connect(panner);
        lastNode = panner;
      }

      lastNode.connect(gainNode);
      gainNode.connect(masterGain);

      source.start(now);
      source.onended = function () {
        try {
          source.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // nós já desconectados/coletados — sem problema nenhum
        }
      };
    }

    // ---------- Piso de madeira ----------
    // Som mais seco e estalado — é a gravação original, praticamente
    // como veio (só limpeza de ruído/silêncio nas pontas), sem
    // filtragem extra.
    function playWoodStep(pan) {
      const volume = getSfxVolume01();
      if (volume <= 0) {
        return;
      }
      const buffer = pickBuffer("madeira");
      if (!buffer) {
        return; // ainda carregando — sem passo audível dessa vez, sem erro
      }
      playBuffer(buffer, volume, 0.96, 1.06, pan);
    }

    // ---------- Tapete ----------
    // Mesma gravação-base, mas processada (ver audio/README.md): mais
    // abafado, ataque mais suave, sem o estalo seco da madeira, e
    // tocado num volume relativo mais baixo, além do próprio arquivo
    // já ter sido normalizado ~7dB mais baixo que o de madeira.
    function playCarpetStep(pan) {
      const volume = getSfxVolume01();
      if (volume <= 0) {
        return;
      }
      const buffer = pickBuffer("tapete");
      if (!buffer) {
        return;
      }
      playBuffer(buffer, volume * 0.9, 0.94, 1.08, pan);
    }

    const SURFACES = {
      madeira: playWoodStep,
      tapete: playCarpetStep,
    };

    // Chamado a cada quadro por scripts/main.js.
    // `playerFrame`: o objeto devolvido por PlayerController.update()
    // (usa só `.isMoving` e `.walkPhase`).
    // `surfaceKind`: "madeira" | "tapete" (ver getSurfaceAt() em
    // scenes/corridor-scene.js / scenes/room-scene.js) — qualquer
    // valor sem entrada em SURFACES é tratado como silencioso, nunca
    // quebra o jogo.
    function update(playerFrame, surfaceKind) {
      attachUnlockListener();
      ensureContext();
      loadAllBuffers();

      if (!playerFrame || !playerFrame.isMoving) {
        return;
      }

      const stepIndex = Math.floor(playerFrame.walkPhase / STEP_PHASE);
      if (stepIndex === lastStepIndex) {
        return;
      }
      lastStepIndex = stepIndex;

      if (!audioCtx || audioCtx.state !== "running") {
        return; // ainda não destravado por um toque, ou sem suporte — sem som este passo, sem erro
      }

      const play = SURFACES[surfaceKind];
      if (!play) {
        return;
      }

      stepParity = stepParity === 0 ? 1 : 0;
      const pan = stepParity === 0 ? -0.15 : 0.15;
      play(pan);
    }

    return { update: update };
  }

  return { create: create };
})();
