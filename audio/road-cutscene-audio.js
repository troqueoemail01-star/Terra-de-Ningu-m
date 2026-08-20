/**
 * audio/road-cutscene-audio.js
 * -------------------------------------------------
 * Os quatro sons da cutscene de abertura na estrada (ver
 * cutscenes/road-cutscene.js), na ordem em que entram:
 *
 *   1. MUSICA (playMusic) - o arquivo enviado pelo jogador, em
 *      audio/musica/cutscene-estrada.mp3. Toca do primeiro quadro da
 *      cutscene (junto com o fade-in de 8 s) e e ela quem cronometra a
 *      abertura: a cutscene le a DURACAO real da faixa
 *      (getMusicDuration) e conta de tras para a frente para achar a hora
 *      de a ligacao entrar - nenhum tempo fixo chutado no codigo, mesma
 *      ideia que a discagem/toque da primeira ligacao do jogo ja usava
 *      (ver audio/phone-audio.js).
 *
 *      Ela esta tocando no RADIO DO CARRO, entao vem um degrau abaixo do
 *      volume cheio de "Musica" (MUSIC_LEVEL) e NAO e mais cortada quando a
 *      ligacao e atendida: sai em fade-out de 5 s (fadeOutMusic), comecando
 *      no mesmo instante do xiado e terminando exatamente onde a faixa
 *      acabaria sozinha.
 *
 *   2. TOQUE DE CHAMADA (startRing/stopRing) - a ligacao de radio
 *      chegando. Nao ha arquivo novo aqui: e o MESMO
 *      audio/telefone/chamando.wav das ligacoes da casa, so tocado de
 *      outro jeito. O recorte original comeca com ~1,1 s de silencio (a
 *      pausa antes do primeiro toque, ver AUDIO_FILES em
 *      audio/phone-audio.js); aqui a leitura comeca DEPOIS desse
 *      silencio e o trecho toque + pausa e posto em loop, entao os 3
 *      segundos pedidos sao 3 segundos de telefone tocando de fato, com
 *      a cadencia certa.
 *
 *   3. XIADO DE RADIO (playStatic) - o chiado curto que abre e fecha a
 *      ligacao. Nao existe gravacao de referencia para ele, entao e
 *      SINTETIZADO na hora (ruido branco filtrado em passa-banda + um
 *      estalo de squelch descendo de tom), exatamente como os cliques
 *      de gancho do telefone da casa ja sao (ver playClick em
 *      audio/phone-audio.js) e como os passos foram antes de existir
 *      gravacao.
 *
 *   4. ESTRADA DE TERRA (startRoad/stopRoad) - o carro andando no chao de
 *      terra, em audio/carro/estrada-terra.mp3, recortado da gravacao
 *      enviada pelo jogador. Toca em LOOP do primeiro ao ultimo quadro da
 *      cutscene, pelo tempo que o jogador levar no dialogo, e chega ao
 *      ouvido ABAFADO: o som acontece do lado de fora e o Kael esta dentro
 *      do carro (ver ROAD_MUFFLE_HZ).
 *
 * Arquitetura igual a dos outros dois pacotes de som do jogo (Web Audio
 * API, AudioBuffer decodificado uma vez, volume lido AO VIVO das
 * Configuracoes): a musica usa Musica e o toque, o xiado e a estrada usam
 * Efeitos sonoros (ver scripts/game-settings.js). Mexer no slider durante a
 * cutscene ja vale na hora, inclusive no meio do fade-out da musica.
 *
 * window.RoadCutsceneAudio.preload()
 * window.RoadCutsceneAudio.playMusic()   -> Promise (resolve no fim)
 * window.RoadCutsceneAudio.getMusicDuration()
 * window.RoadCutsceneAudio.stopMusic()
 * window.RoadCutsceneAudio.fadeOutMusic(segundos)
 * window.RoadCutsceneAudio.startRing() / stopRing()
 * window.RoadCutsceneAudio.playStatic()  -> Promise (resolve no fim)
 * window.RoadCutsceneAudio.startRoad() / stopRoad(segundos)
 * window.RoadCutsceneAudio.unlock() / isBlocked() / stopAll()
 * -------------------------------------------------
 */

window.RoadCutsceneAudio = (function () {
  const MUSIC_URL = "audio/musica/cutscene-estrada.mp3";
  const RING_URL = "audio/telefone/chamando.wav";
  const ROAD_URL = "audio/carro/estrada-terra.mp3";

  // A musica sai do RADIO DO CARRO, nao de uma trilha por cima da cena: o
  // volume de "Musica" das Configuracoes entra multiplicado por este fator
  // para ela ficar um degrau abaixo do resto, como um alto-falante de
  // painel com a estrada roncando em volta.
  const MUSIC_LEVEL = 0.55;

  // Fade-out usado quando ninguem pede um tempo especifico. O fade de 5 s
  // da ligacao atendida nao mora aqui: quem manda nele e
  // cutscenes/road-cutscene.js, que passa o tempo na chamada.
  const MUSIC_FADE_DEFAULT = 0.25;

  // Recorte do chamando.wav usado como toque em loop (medido no proprio
  // arquivo): o silencio inicial fica de fora e o loop cobre um toque
  // completo mais a pausa que vem depois dele.
  const RING_START = 1.1;
  const RING_LOOP_END = 3.5;

  // Recorte de estrada-terra.mp3 que fica em loop. O arquivo traz 1 s de
  // cauda antes e 1,5 s de cabeca depois desta regiao de proposito: assim o
  // padding do mp3 nunca cai dentro do loop (mesma ideia do recorte do
  // toque acima). Dentro da regiao, o fim ja foi cruzado com o comeco na
  // geracao do arquivo, entao a volta do loop nao tem emenda audivel.
  const ROAD_LOOP_START = 1.0;
  const ROAD_LOOP_END = 11.8;

  // Ganho relativo do som da estrada (por cima de "Efeitos sonoros"): ele
  // sustenta a cutscene inteira, entao precisa estar presente sem cobrir o
  // toque do telefone nem o dialogo.
  const ROAD_LEVEL = 0.62;

  // O abafamento: o Kael ouve a estrada de DENTRO da cabine, com vidro e
  // lataria no meio. A passa-baixa em 780 Hz tira o cascalho estalando e
  // deixa passar o ronco; o high shelf derruba o agudo que ainda vaza pelo
  // joelho do filtro. Mesma tecnica do toque distante do telefone da casa
  // (ver audio/phone-audio.js).
  const ROAD_MUFFLE_HZ = 780;
  const ROAD_TILT_HZ = 2200;
  const ROAD_TILT_DB = -14;

  // Duracao do xiado de radio.
  const STATIC_DURATION = 0.5;

  let audioCtx = null;
  let masterGain = null;

  const buffers = { music: null, ring: null, road: null };
  let requested = false;

  let musicNodes = null;
  let ringNodes = null;
  let roadNodes = null;

  function ensureContext() {
    if (audioCtx) {
      return audioCtx;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      return null; // navegador sem Web Audio - a cutscene roda muda, sem quebrar
    }
    try {
      audioCtx = new Ctor();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(audioCtx.destination);
    } catch (e) {
      audioCtx = null;
    }
    return audioCtx;
  }

  function getMusicVolume01() {
    if (window.GameSettings && typeof window.GameSettings.getMusicVolume === "function") {
      return Math.max(0, Math.min(1, window.GameSettings.getMusicVolume() / 100));
    }
    return 0.8;
  }

  function getSfxVolume01() {
    if (window.GameSettings && typeof window.GameSettings.getSfxVolume === "function") {
      return Math.max(0, Math.min(1, window.GameSettings.getSfxVolume() / 100));
    }
    return 0.8;
  }

  function decode(name, url) {
    return fetch(url)
      .then(function (response) {
        return response.arrayBuffer();
      })
      .then(function (data) {
        return new Promise(function (resolve, reject) {
          // Assinatura antiga (callback) por compatibilidade com
          // WebViews mais velhas, igual aos outros pacotes de som.
          const maybePromise = audioCtx.decodeAudioData(data, resolve, reject);
          if (maybePromise && maybePromise.then) {
            maybePromise.then(resolve, reject);
          }
        });
      })
      .then(function (buffer) {
        buffers[name] = buffer;
      })
      .catch(function (error) {
        console.error("RoadCutsceneAudio: falha ao carregar " + url, error);
      });
  }

  // decodeAudioData funciona com o contexto ainda suspenso, entao o
  // download/decode pode comecar no carregamento da cutscene, em
  // paralelo com os modelos 3D.
  function preload() {
    if (requested) {
      return;
    }
    if (!ensureContext()) {
      return;
    }
    requested = true;
    decode("music", MUSIC_URL);
    decode("ring", RING_URL);
    decode("road", ROAD_URL);
  }

  function isReady() {
    // O som da estrada entra no primeiro quadro, junto com a musica, entao
    // ele tambem conta para a cutscene poder comecar.
    return !!buffers.music && !!buffers.road;
  }

  // Duracao real da faixa: e dela que a cutscene tira a hora de a ligacao
  // entrar (ver cutscenes/road-cutscene.js). 0 se a musica nao carregou.
  function getMusicDuration() {
    return buffers.music ? buffers.music.duration : 0;
  }

  // Navegadores mobile so liberam audio depois de um toque. A cutscene e
  // disparada DENTRO do toque em NOVO JOGO, entao normalmente isso
  // resolve na primeira tentativa; se nao resolver, road-cutscene.js
  // pede um toque na tela (ver isBlocked).
  function unlock() {
    if (!ensureContext()) {
      return;
    }
    if (audioCtx.state === "suspended" && audioCtx.resume) {
      audioCtx.resume();
    }
  }

  function isBlocked() {
    return !!audioCtx && audioCtx.state === "suspended";
  }

  // ---------- 1) Musica ----------
  function playMusic() {
    return new Promise(function (resolve) {
      if (!audioCtx || !buffers.music) {
        resolve();
        return;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffers.music;

      // Dois ganhos em serie, de proposito: o de VOLUME acompanha o slider
      // de Musica ao vivo e o de ENVELOPE e exclusivo do fade-out. Num no
      // so, o acompanhamento do slider reescreveria o valor 4x por segundo
      // e atropelaria a rampa do fade - a musica cairia e voltaria.
      const gain = audioCtx.createGain();
      gain.gain.value = getMusicVolume01() * MUSIC_LEVEL;

      const envelope = audioCtx.createGain();
      envelope.gain.value = 1;

      source.connect(gain);
      gain.connect(envelope);
      envelope.connect(masterGain);

      // O slider de Musica vale ao vivo: enquanto a faixa toca, o ganho
      // e reavaliado de tempos em tempos (barato, 4x por segundo).
      const follow = setInterval(function () {
        if (musicNodes) {
          gain.gain.value = getMusicVolume01() * MUSIC_LEVEL;
        }
      }, 250);

      let finished = false;
      function finish() {
        if (finished) {
          return;
        }
        finished = true;
        clearInterval(follow);
        musicNodes = null;
        resolve();
      }

      source.onended = finish;
      musicNodes = { source: source, gain: gain, envelope: envelope, finish: finish };
      source.start(0);
    });
  }

  // Tira a musica do ar em FADE, a partir de agora. E isto que toca quando
  // a ligacao e atendida: o pedido era a musica sair suavemente junto com o
  // xiado, em 5 segundos, em vez de ser cortada no meio (ver
  // cutscenes/road-cutscene.js, que passa o tempo). A rampa mora no
  // ENVELOPE, nunca no ganho do slider, entao mexer no volume das
  // Configuracoes durante o fade continua valendo e nao desfaz a saida.
  //
  // A rampa e EXPONENCIAL, nao reta: o ouvido nao ouve amplitude, ouve dB.
  // Numa reta de 5 s a musica passaria metade do caminho ainda em meio
  // volume e sumiria de repente no fim; na exponencial ela desce parelho do
  // comeco ao fim, que e o que se ouve como "a musica saindo".
  function fadeOutMusic(fadeSeconds) {
    if (!musicNodes || !audioCtx) {
      return;
    }
    const nodes = musicNodes;
    const fade = fadeSeconds === undefined ? MUSIC_FADE_DEFAULT : fadeSeconds;
    const now = audioCtx.currentTime;
    try {
      nodes.envelope.gain.cancelScheduledValues(now);
      nodes.envelope.gain.setValueAtTime(Math.max(0.0001, nodes.envelope.gain.value), now);
      nodes.envelope.gain.exponentialRampToValueAtTime(0.0001, now + fade);
      // A fonte so para DEPOIS do fim da rampa: parar antes traria de volta
      // o corte seco, so que mais discreto.
      nodes.source.stop(now + fade + 0.05);
    } catch (e) {
      // no ja parado - sem problema
    }
  }

  // Encerra a musica com um fade curtinho (nao um corte seco, que estala).
  // Se ela ja tiver acabado sozinha, nao faz nada.
  function stopMusic(fadeSeconds) {
    fadeOutMusic(fadeSeconds === undefined ? MUSIC_FADE_DEFAULT : fadeSeconds);
  }

  // ---------- 2) Toque de chamada ----------
  function startRing() {
    if (!audioCtx || !buffers.ring || ringNodes) {
      return;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffers.ring;
    source.loop = true;
    source.loopStart = RING_START;
    source.loopEnd = Math.min(RING_LOOP_END, buffers.ring.duration);

    // Passa-banda de telefone/radio: tira os graves e o brilho, como um
    // alto-falante pequeno. Mesmo tratamento que o toque da segunda
    // ligacao do jogo recebe (ver audio/phone-audio.js).
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.8;

    const gain = audioCtx.createGain();
    gain.gain.value = getSfxVolume01() * 0.9;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    ringNodes = { source: source, gain: gain, filter: filter };
    source.start(0, RING_START);
  }

  function stopRing() {
    if (!ringNodes || !audioCtx) {
      return;
    }
    const nodes = ringNodes;
    ringNodes = null;
    const now = audioCtx.currentTime;
    try {
      nodes.gain.gain.cancelScheduledValues(now);
      nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, now);
      nodes.gain.gain.linearRampToValueAtTime(0.0001, now + 0.06);
      nodes.source.stop(now + 0.09);
    } catch (e) {
      // no ja parado
    }
  }

  // ---------- 3) Xiado de radio ----------
  function playStatic() {
    return new Promise(function (resolve) {
      if (!audioCtx) {
        resolve();
        return;
      }

      const volume = getSfxVolume01();
      const now = audioCtx.currentTime;
      const duration = STATIC_DURATION;

      // Ruido branco com a amplitude ja rasgada em blocos curtos: e o
      // que da a textura de estatica de radio, em vez de um chiado liso.
      const length = Math.floor(audioCtx.sampleRate * duration);
      const noiseBuffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let blockGain = 1;
      for (let i = 0; i < length; i++) {
        if (i % 512 === 0) {
          blockGain = 0.45 + Math.random() * 0.55;
        }
        data[i] = (Math.random() * 2 - 1) * blockGain;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;

      const band = audioCtx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.setValueAtTime(2600, now);
      band.frequency.exponentialRampToValueAtTime(900, now + duration);
      band.Q.value = 0.7;

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.02);
      noiseGain.gain.setValueAtTime(volume * 0.5, now + duration * 0.55);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noise.connect(band);
      band.connect(noiseGain);
      noiseGain.connect(masterGain);

      // O squelch: o estalo de portadora abrindo/fechando, descendo de
      // tom por cima do chiado.
      const squelch = audioCtx.createOscillator();
      squelch.type = "square";
      squelch.frequency.setValueAtTime(760, now);
      squelch.frequency.exponentialRampToValueAtTime(180, now + 0.16);

      const squelchGain = audioCtx.createGain();
      squelchGain.gain.setValueAtTime(volume * 0.16, now);
      squelchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      squelch.connect(squelchGain);
      squelchGain.connect(masterGain);

      noise.start(now);
      squelch.start(now);
      squelch.stop(now + 0.2);

      setTimeout(function () {
        try {
          noise.disconnect();
          band.disconnect();
          noiseGain.disconnect();
          squelch.disconnect();
          squelchGain.disconnect();
        } catch (e) {
          // nos ja coletados
        }
        resolve();
      }, (duration + 0.05) * 1000);
    });
  }

  // ---------- 4) A estrada de terra por baixo do carro ----------
  // Um loop so, tocando do primeiro ao ultimo quadro da cutscene: e o chao
  // passando embaixo do carro, o tempo que o jogador levar no dialogo.
  // Entra em fade curto (nao aparece do nada em volume cheio) e sai em fade
  // longo junto com o preto do fim.
  function startRoad(fadeSeconds) {
    if (!audioCtx || !buffers.road || roadNodes) {
      return;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffers.road;
    source.loop = true;
    source.loopStart = ROAD_LOOP_START;
    source.loopEnd = Math.min(ROAD_LOOP_END, buffers.road.duration);

    // ABAFADO: o som acontece do lado de fora e chega ao Kael atravessando
    // vidro e lataria. Passa-baixa cortando o cascalho estalando, e um high
    // shelf negativo por cima para o agudo que ainda vaza pelo joelho do
    // filtro. O que sobra e o ronco surdo de dentro da cabine.
    const muffle = audioCtx.createBiquadFilter();
    muffle.type = "lowpass";
    muffle.frequency.value = ROAD_MUFFLE_HZ;
    muffle.Q.value = 0.7;

    const tilt = audioCtx.createBiquadFilter();
    tilt.type = "highshelf";
    tilt.frequency.value = ROAD_TILT_HZ;
    tilt.gain.value = ROAD_TILT_DB;

    const gain = audioCtx.createGain();
    const fade = fadeSeconds === undefined ? 0.6 : fadeSeconds;
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(getSfxVolume01() * ROAD_LEVEL, now + fade);

    source.connect(muffle);
    muffle.connect(tilt);
    tilt.connect(gain);
    gain.connect(masterGain);

    // O slider de Efeitos sonoros vale ao vivo aqui tambem (mesmo passo de
    // 250 ms da musica), mas so depois do fade de entrada terminar, para nao
    // atropelar a rampa.
    const follow = setInterval(function () {
      if (!roadNodes || audioCtx.currentTime < now + fade) {
        return;
      }
      gain.gain.value = getSfxVolume01() * ROAD_LEVEL;
    }, 250);

    roadNodes = { source: source, gain: gain, muffle: muffle, tilt: tilt, follow: follow };
    source.start(0, ROAD_LOOP_START);
  }

  function stopRoad(fadeSeconds) {
    if (!roadNodes || !audioCtx) {
      return;
    }
    const nodes = roadNodes;
    roadNodes = null;
    clearInterval(nodes.follow);
    const fade = fadeSeconds === undefined ? 0.4 : fadeSeconds;
    const now = audioCtx.currentTime;
    try {
      nodes.gain.gain.cancelScheduledValues(now);
      nodes.gain.gain.setValueAtTime(Math.max(0.0001, nodes.gain.gain.value), now);
      nodes.gain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
      nodes.source.stop(now + fade + 0.05);
    } catch (e) {
      // no ja parado
    }
  }

  function stopAll() {
    stopRing();
    stopMusic(0.2);
    stopRoad(0.3);
  }

  return {
    preload: preload,
    isReady: isReady,
    unlock: unlock,
    isBlocked: isBlocked,
    playMusic: playMusic,
    getMusicDuration: getMusicDuration,
    stopMusic: stopMusic,
    fadeOutMusic: fadeOutMusic,
    startRing: startRing,
    stopRing: stopRing,
    playStatic: playStatic,
    startRoad: startRoad,
    stopRoad: stopRoad,
    stopAll: stopAll,
  };
})();
