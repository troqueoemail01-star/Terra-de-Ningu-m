/**
 * audio/curtain-audio.js
 * -------------------------------------------------
 * Som das cortinas das janelas — terceiro "pacote" de efeitos
 * sonoros do jogo, depois dos passos (audio/footstep-audio.js) e da
 * sequência telefônica (audio/phone-audio.js). Ver audio/README.md.
 *
 * Mesma arquitetura de fundo dos dois anteriores (Web Audio API,
 * AudioBuffer decodificado uma única vez, volume de "Efeitos
 * sonoros" lido ao vivo de scripts/game-settings.js) — nada de
 * <audio> solto nem de sistema de volume novo.
 *
 * Um único arquivo (audio/cortinas/cortina.wav, ~0,68s), recortado
 * do áudio de referência enviado pelo dev, usado tanto para ABRIR
 * quanto para FECHAR: é o mesmo tecido correndo no varão nos dois
 * sentidos, e uma pequena variação aleatória de afinação/volume a
 * cada reprodução (ver play() abaixo) já evita a sensação de
 * "sample repetido" quando o jogador abre e fecha a mesma cortina
 * várias vezes seguidas.
 *
 * Quem chama: `toggleCurtain()` em models/window-factory.js — ou
 * seja, o ponto exato em que a cortina passa a se mover. Como toda
 * janela do jogo (as duas do corredor e a do quarto) nasce da mesma
 * WindowFactory.createWindow(), as três já ficam cobertas sem
 * nenhuma alteração em scenes/corridor-scene.js,
 * scenes/room-scene.js ou no switch de interação de
 * scripts/main.js.
 *
 * Espacialização: `setListener(camera)` (chamado uma vez por
 * scripts/main.js) permite calcular, a cada toque, a distância e o
 * lado (esquerda/direita) da janela em relação à câmera do jogador,
 * para o som parecer vir da própria cortina que ele está
 * manipulando, e não da "cabeça" dele. Sem listener registrado (ou
 * sem StereoPannerNode no navegador), o som simplesmente toca
 * centralizado — nunca deixa de tocar por causa disso.
 * -------------------------------------------------
 */

window.CurtainAudio = (function () {
  // Recorte do áudio de referência enviado pelo dev ("Curtains sound
  // effect", MP3 estéreo 48kHz): tirado o silêncio/padding do começo
  // (o som passa a valer já no primeiro sample, pra não atrasar nada
  // em relação à animação), cortada a cauda inaudível do fim,
  // removido o grave abaixo de 45Hz (mesma limpeza dos passos),
  // pequenos fades nas pontas pra não estalar e pico normalizado a
  // -3dB. Convertido para WAV mono 16-bit — mesmo motivo dos outros
  // sons do projeto: sem o padding de início que um codec com perdas
  // (MP3) introduz, e mono é o que o StereoPanner abaixo espera pra
  // posicionar o som direito.
  const AUDIO_FILE = "audio/cortinas/cortina.wav";

  // Volume relativo do efeito, por cima do volume de "Efeitos
  // sonoros" das Configurações. Baixo de propósito: som discreto de
  // tecido, num jogo de terror em primeira pessoa — não deve
  // competir com os passos nem assustar por volume.
  const CURTAIN_GAIN = 0.5;

  // Atenuação por distância: volume cheio até NEAR_DISTANCE (o
  // jogador está praticamente com a mão na cortina) e caindo
  // suavemente até FAR_GAIN em FAR_DISTANCE. Como só dá pra interagir
  // de perto (ver o `range` do InteractionSystem em
  // scripts/main.js), na prática é um ajuste fino — serve pra o som
  // "grudar" na janela em vez de soar sempre colado no ouvido.
  const NEAR_DISTANCE = 1.0;
  const FAR_DISTANCE = 3.5;
  const FAR_GAIN = 0.55;

  // Quanto o som pode ir pros lados no estéreo. Não vai a 1.0 de
  // propósito: o jogador está de frente pra janela na maior parte das
  // interações, e um pan extremo soaria artificial em fone.
  const MAX_PAN = 0.65;

  let audioCtx = null;
  let masterGain = null;
  let buffer = null;
  let bufferRequested = false;
  let unlockAttached = false;
  let listenerCamera = null;

  // Uma "voz" por janela (chave = id passado por quem toca): se o
  // jogador abrir e fechar a MESMA cortina em sequência rápida, o som
  // anterior daquela janela é cortado com um fade bem curto antes do
  // novo começar, em vez de os dois se somarem e dobrarem de volume.
  // Janelas diferentes continuam podendo soar ao mesmo tempo, cada
  // uma na sua chave.
  const activeVoices = {};

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function ensureContext() {
    if (audioCtx) {
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      return; // navegador sem suporte — cortina fica muda, sem quebrar o resto do jogo
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

  // Busca e decodifica o arquivo uma única vez, assim que o
  // AudioContext existir (decodeAudioData funciona com o contexto
  // ainda "suspended", não precisa esperar toque nenhum) — mesmo
  // padrão de footstep-audio.js/phone-audio.js: quando o jogador
  // chegar na primeira janela, o buffer já está pronto há muito
  // tempo.
  function loadBuffer() {
    if (bufferRequested || !audioCtx) {
      return;
    }
    bufferRequested = true;

    fetch(AUDIO_FILE)
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        return res.arrayBuffer();
      })
      .then(function (arrayBuffer) {
        return audioCtx.decodeAudioData(arrayBuffer);
      })
      .then(function (decoded) {
        buffer = decoded;
      })
      .catch(function (e) {
        // Arquivo faltando/corrompido: a cortina simplesmente abre e
        // fecha muda, exatamente como antes desta atualização — sem
        // travar a interação nem o resto do jogo.
      });
  }

  // A maioria dos navegadores móveis só libera a REPRODUÇÃO depois de
  // um gesto do usuário (o carregamento acima não precisa esperar).
  // Mesmos eventos de scripts/fullscreen-manager.js e dos outros dois
  // módulos de áudio.
  function attachUnlockListener() {
    if (unlockAttached) {
      return;
    }
    unlockAttached = true;
    const resume = function () {
      ensureContext();
      loadBuffer();
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(function () {});
      }
    };
    ["pointerdown", "touchend", "mousedown", "keydown"].forEach(function (evt) {
      document.addEventListener(evt, resume, { passive: true });
    });
  }

  // Começa a carregar assim que este script é interpretado — não
  // espera o jogador chegar perto de nenhuma janela.
  ensureContext();
  loadBuffer();
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

  /**
   * Registra a câmera do jogador como "ouvinte" (chamado uma única
   * vez em scripts/main.js). Guardada só como referência: nenhuma
   * matriz é lida aqui, só na hora de tocar.
   */
  function setListener(camera) {
    listenerCamera = camera || null;
  }

  // Distância + lado da janela em relação à câmera, direto da
  // matrixWorld dela (elements[12..14] = posição; elements[0..2] =
  // vetor "direita" da câmera, já normalizado porque a câmera nunca é
  // escalada). Feito na mão pra este módulo não depender do THREE.
  function spatialize(position) {
    const result = { gain: 1, pan: 0 };
    if (!position || !listenerCamera || !listenerCamera.matrixWorld) {
      return result;
    }
    const e = listenerCamera.matrixWorld.elements;
    const dx = position.x - e[12];
    const dy = position.y - e[13];
    const dz = position.z - e[14];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!isFinite(dist) || dist < 0.0001) {
      return result;
    }

    if (dist > NEAR_DISTANCE) {
      const t = Math.min(
        1,
        (dist - NEAR_DISTANCE) / (FAR_DISTANCE - NEAR_DISTANCE)
      );
      result.gain = 1 + (FAR_GAIN - 1) * t;
    }

    // Projeção da direção da janela no vetor "direita" da câmera:
    // +1 = totalmente à direita do jogador, -1 = à esquerda, 0 = bem
    // à frente (o caso mais comum, já que ele precisa estar mirando
    // na cortina pra interagir).
    const right = (dx * e[0] + dy * e[1] + dz * e[2]) / dist;
    result.pan = Math.max(-MAX_PAN, Math.min(MAX_PAN, right * MAX_PAN));
    return result;
  }

  // Corta com um fade bem curto (não instantâneo, pra não estalar) o
  // som que ainda estiver tocando naquela janela.
  function stopVoice(voiceId) {
    const voice = activeVoices[voiceId];
    if (!voice) {
      return;
    }
    delete activeVoices[voiceId];
    try {
      const now = audioCtx.currentTime;
      voice.gainNode.gain.cancelScheduledValues(now);
      voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
      voice.gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.04);
      voice.source.stop(now + 0.05);
    } catch (e) {
      // source já finalizado/coletado — sem problema nenhum
    }
  }

  /**
   * Toca o som da cortina. Chamado por `toggleCurtain()` em
   * models/window-factory.js, no mesmo instante em que a janela muda
   * de estado — ou seja, no quadro em que a animação começa, sem
   * nenhum atraso programado nem setTimeout no meio: movimento e som
   * partem juntos, tanto ao abrir quanto ao fechar.
   *
   * O MESMO som serve para os dois sentidos (ver comentário do topo).
   *
   * `options`:
   *   - `position`: {x, y, z} da janela no mundo (opcional).
   *   - `voiceId`: identificador da janela, pra abre/fecha rápido na
   *     mesma cortina não empilhar dois sons (opcional).
   */
  function play(options) {
    const opts = options || {};

    attachUnlockListener();
    ensureContext();
    loadBuffer();

    if (!audioCtx || !buffer) {
      return; // sem Web Audio ou arquivo ainda não carregado — cortina abre muda, sem erro
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(function () {});
    }

    const volume = getSfxVolume01();
    if (volume <= 0) {
      return; // "Efeitos sonoros" no zero — nada aqui depende de tempo/Promise, dá pra pular de verdade
    }

    const voiceId = opts.voiceId || "default";
    stopVoice(voiceId);

    const spatial = spatialize(opts.position);
    const now = audioCtx.currentTime;

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    // Variação sutil de afinação, pra abrir e fechar a mesma cortina
    // em sequência não soar como o mesmo arquivo colado duas vezes.
    // Faixa estreita de propósito (±3%): mexer muito mudaria a
    // duração do som e ele deixaria de casar com a animação.
    source.playbackRate.value = randRange(0.97, 1.03);

    const gainNode = audioCtx.createGain();
    gainNode.gain.value =
      volume * CURTAIN_GAIN * spatial.gain * randRange(0.94, 1.04);

    let lastNode = source;
    if (typeof audioCtx.createStereoPanner === "function") {
      const panner = audioCtx.createStereoPanner();
      panner.pan.value = spatial.pan;
      lastNode.connect(panner);
      lastNode = panner;
    }
    lastNode.connect(gainNode);
    gainNode.connect(masterGain);

    activeVoices[voiceId] = { source: source, gainNode: gainNode };

    source.onended = function () {
      if (activeVoices[voiceId] && activeVoices[voiceId].source === source) {
        delete activeVoices[voiceId];
      }
      try {
        source.disconnect();
        gainNode.disconnect();
      } catch (e) {
        // nós já desconectados/coletados — sem problema nenhum
      }
    };

    source.start(now);
  }

  return {
    setListener: setListener,
    play: play,
  };
})();
