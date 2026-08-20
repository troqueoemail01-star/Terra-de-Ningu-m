/**
 * cutscenes/road-cutscene.js
 * -------------------------------------------------
 * A CUTSCENE DE ABERTURA do jogo: Kael voltando para casa de carro, de
 * noitinha, numa estrada de terra, quando recebe uma ligacao de radio do
 * Ravi. Toca uma vez, logo depois de NOVO JOGO, e no fim dela a
 * gameplay comeca no corredor exatamente como sempre comecou.
 *
 * ---------- Ela substituiu os dois videos de introducao ----------
 * Antes, a abertura eram dois arquivos de video tocados em sequencia
 * (assets/videos/cutscene-parte1.mp4 e cutscene-parte2.mp4, ~76 MB
 * juntos, quase 2 minutos de reproducao). Isso saiu inteiro: os dois
 * .mp4, o player deles (cutscenes/cutscene-player.js), o caminho dos
 * arquivos (cutscenes/cutscene-config.js) e o CSS da camada de video
 * (cutscenes/cutscene.css). Nada de video sobrou na abertura - o unico
 * .mp4 que continua no jogo e o fundo do menu principal.
 *
 * No lugar deles, esta cutscene e IN ENGINE: roda em three.js, com os
 * dois pacotes 3D enviados pelo jogador, e pesa ~600 KB somados (o .glb
 * da estrada + a musica), contra os 76 MB dos videos. A cabine do carro
 * nao pesa nada em disco: e geometria feita em codigo.
 *
 * ---------- O mundo ----------
 *   models/car-interior-factory.js .. a cabine em primeira pessoa, com a
 *                                     camera FIXA no olho do motorista.
 *   models/road-loop-factory.js ..... a estrada de terra, a floresta, o
 *                                     mato e a nevoa, montados para dar
 *                                     a volta em si mesmos.
 *   models/rain-factory.js .......... A CHUVA. E a MESMA chuva que o jogo
 *                                     ja tinha nas janelas da casa: mesma
 *                                     fabrica, mesmo shader, mesma gota -
 *                                     nenhum sistema novo de chuva entrou
 *                                     no projeto (ver "A CHUVA" abaixo).
 *
 * A camera nunca gira nem se desloca por conta propria: quem anda e o
 * carro, sempre para a frente, num loop que nao acaba. O carro roda pelo
 * tempo que o jogador levar lendo o dialogo - dez segundos ou dez
 * minutos, sem emenda visivel e sem nenhum objeto novo sendo criado no
 * meio do caminho.
 *
 * ---------- A linha do tempo ----------
 *   0 s ........... a tela ja esta preta (o menu acabou de sair) e a
 *                   musica enviada pelo jogador comeca a tocar.
 *   0 -> 8 s ...... FADE-IN de 8 segundos: a estrada aparece por tras do
 *                   preto, com o carro ja em movimento.
 *   fim da musica.. o telefone comeca a tocar, como uma ligacao de radio
 *                   entrando. Quem cronometra esse instante e a PROPRIA
 *                   musica (a Promise de playMusic, ver
 *                   audio/road-cutscene-audio.js) - nao um tempo fixo
 *                   escrito aqui.
 *   +3 s .......... depois de tres segundos tocando: xiado de radio
 *                   curto, a musica e encerrada e o DIALOGO comeca.
 *   dialogo ....... a caixa de dialogo de sempre (mesma fonte, mesma
 *                   digitacao, mesmo "PULAR TUDO" - ver
 *                   dialogue/dialogue-box.js). O botao PULAR TUDO encerra
 *                   a conversa inteira de uma vez, e a cutscene segue
 *                   para o fim na hora.
 *   fim do dialogo. o mesmo xiado de radio, agora como a ligacao caindo.
 *   +10 s ......... FADE-OUT de 10 segundos ate o preto. A gameplay e
 *                   montada com a tela ja completamente preta e so
 *                   depois o preto sai - entao nenhum soluco da montagem
 *                   da casa aparece na transicao (mesma estrategia do
 *                   antigo player de video e do fim do menu).
 *
 * ---------- A CHUVA (e por que ela nao atravessa o carro) ----------
 * A tempestade nao comeca mais quando o jogador chega em casa: ja esta
 * chovendo na estrada, na volta. Quem chove aqui e
 * window.RainFactory.createRain, a mesma fabrica das tres janelas e do
 * quintal (ver models/rain-factory.js) - nada foi reescrito, copiado nem
 * duplicado. A cutscene so faz tres coisas:
 *
 *  1. UM volume de chuva, com o carro DENTRO dele. O volume da fabrica e
 *     uma coluna com +Z local apontando para fora da parede da casa; aqui
 *     o grupo leva 180 graus em Y, entao o +Z local vira a FRENTE do carro
 *     (-Z do mundo) e a coluna cobre de RAIN_BEHIND metros atras da cabine
 *     ate o alcance da chuva la adiante.
 *
 *  2. O volume ANDA COM O CARRO (ver o tick). A chuva e infinita pelo
 *     mesmo motivo que a estrada e infinita: ela acompanha a cabine. Como
 *     a queda e calculada no shader a partir do tempo absoluto, mover o
 *     grupo nao mexe uma virgula na animacao das gotas - custo por quadro
 *     continua sendo UM float.
 *
 *  3. A CABINE FICA SECA POR GEOMETRIA. O retangulo em RAIN_CAR_* entra
 *     como `exclusions` da propria fabrica - o mesmo recurso que impede de
 *     chover dentro da COZINHA, do BANHEIRO, debaixo da varanda e dentro
 *     do carro do quintal. Gota nenhuma e SORTEADA com o caminho de queda
 *     passando por dentro dessa caixa: nao existe uma unica gota dentro do
 *     carro, e nao porque alguem testa colisao por quadro - e porque a
 *     gota nunca chega a existir ali. O retangulo tem 3,2 m de largura por
 *     3,9 m de comprimento, folga de sobra em cima da cabine (2,0 m x
 *     2,25 m), entao nem o para-brisa nem o vao da janela do motorista tem
 *     agua atravessando por dentro.
 *
 * A nevoa da chuva vai junto: as gotas se dissolvem no MESMO cinza de fim
 * de tarde da estrada (RAIN_FOG_*, ver `options.fog` da fabrica) e acabam
 * antes da borda do volume, entao o fim da chuva nunca aparece na tela.
 * Os limpadores continuam parados na posicao de descanso (ver
 * models/car-interior-factory.js): varrer o vidro nao foi pedido.
 *
 * ---------- Renderer proprio, canvas proprio ----------
 * A gameplay ainda nao existe quando esta cutscene roda (window.Game.start
 * e justamente o que ela chama no fim). Entao ela cria o SEU canvas
 * dentro do #game-container e o seu renderer, na mesma resolucao interna
 * de 320x180 da gameplay - por isso a cutscene ganha de graca a vinheta,
 * as scanlines e o upscale quadriculado do jogo (ver
 * interface/layout.css), sem nenhum ajuste. Ao terminar, tudo isso e
 * descartado (geometrias, texturas, materiais e o proprio contexto WebGL)
 * ANTES de a gameplay montar o dela no #game-canvas de sempre: nunca
 * existem dois renderers vivos ao mesmo tempo.
 *
 * window.RoadCutscene.play(onComplete)
 * -------------------------------------------------
 */

window.RoadCutscene = (function () {
  // Mesma resolucao interna da gameplay (ver scripts/main.js).
  const INTERNAL_WIDTH = 320;
  const INTERNAL_HEIGHT = 180;

  // Os dois tempos pedidos para a cutscene.
  const FADE_IN_MS = 8000;
  const FADE_OUT_MS = 10000;

  // Quanto tempo o telefone toca antes do xiado que atende a ligacao.
  const RING_MS = 3000;

  // Fade-out da musica quando a ligacao e atendida. Comeca no MESMO instante
  // do xiado e termina junto com o fim real da faixa: a musica nao e mais
  // cortada, ela sai.
  const MUSIC_FADE_OUT_MS = 5000;

  // Entrada do som da estrada. Curta: o carro ja esta andando quando a
  // cutscene comeca, so nao pode aparecer do nada em volume cheio.
  const ROAD_FADE_IN_MS = 1800;

  // Fade curto que revela a gameplay depois do preto (o mesmo do antigo
  // player de video).
  const HANDOFF_FADE_MS = 400;

  // Piso de seguranca para o inicio do toque do telefone. Em condicao
  // normal quem manda e o fim da musica; isto so existe para o caso de o
  // audio nao poder tocar de jeito nenhum (navegador sem Web Audio,
  // arquivo faltando), em que a Promise da musica resolve na hora - sem
  // este piso, o telefone tocaria com a tela ainda preta.
  const MIN_TIME_TO_RING_MS = FADE_IN_MS + 4000;

  // Tempo maximo de espera pelos modelos antes de comecar de qualquer
  // jeito (a tela esta preta nesse trecho, entao a espera nao aparece).
  const LOAD_TIMEOUT_MS = 12000;

  // Velocidade do carro: 13 m/s, ~47 km/h. Rapido o bastante para a
  // estrada correr de verdade, devagar o bastante para a vegetacao nao
  // estroboscopar a 320x180.
  const CAR_SPEED = 13;

  // Deriva lateral: o carro nao anda colado no eixo da estrada, ele
  // passeia uns 20 cm de um lado para o outro, como quem dirige na
  // terra.
  const LATERAL_DRIFT = 0.22;

  // ---------- Chuva (ver "A CHUVA" no topo) ----------
  // Quantos metros de chuva ficam ATRAS da cabine. E a origem do volume,
  // medida no eixo do carro: a coluna da fabrica tem 24 m de
  // profundidade, entao 6 m atras deixam ~18 m de agua adiante do capo -
  // que e o que a lente enxerga antes da nevoa fechar.
  const RAIN_BEHIND = 6;

  // A caixa seca em volta do carro, no espaco do volume de chuva. A
  // cabine tem 2,0 m de largura e vai de z -1,2 (painel/para-brisa) a
  // z +1,05 (encosto do banco de tras) - ver models/car-interior-factory.js.
  // A margem e a folga por cima disso, para nenhuma gota raspar no vidro
  // por dentro.
  const RAIN_CAR_HALF_WIDTH = 1.6;
  const RAIN_CAR_FRONT_Z = -1.2;
  const RAIN_CAR_REAR_Z = 1.05;
  const RAIN_CAR_MARGIN = 0.35;

  // Um pouco mais de gota que o padrao da fabrica (2600): aqui a camera
  // esta DENTRO do volume, e nao olhando ele de longe pelo vao de uma
  // janela. Ainda e uma unica draw call.
  const RAIN_COUNT = 3200;

  // A nevoa da chuva desta cutscene. A chuva faz a propria nevoa (ver
  // models/rain-factory.js) e, por padrao, com os numeros da atmosfera da
  // casa - que nao valem aqui. Estes dois fecham a agua antes da borda do
  // volume, entao nao existe uma linha reta onde a chuva termina.
  const RAIN_FOG_NEAR = 5;
  const RAIN_FOG_FAR = 20;

  const DIALOGUE_KEY = "cutscene-estrada-ravi";

  // ---------- Paleta: fim de tarde encoberto ----------
  // O pacote da estrada vinha com um dia claro de neblina cinza. Aqui
  // ele foi puxado para o fim de tarde, porque a historia continua a
  // noite: quando o jogador chega em casa, ja esta tarde e caindo
  // tempestade (ver o dialogo "chamada-ravi" em
  // dialogue/dialogue-config.js). Para voltar ao dia do pacote, basta
  // clarear estes cinco numeros.
  const FOG_COLOR = 0x6d7075;
  const FOG_NEAR = 6;
  const FOG_FAR = 48;
  const SKY_LIGHT = 0x929aa2;
  const GROUND_LIGHT = 0x2b2318;
  const HEMI_INTENSITY = 0.9;
  const SUN_INTENSITY = 0.26;

  // Espera o fim de uma transicao de opacidade do overlay, com
  // salvaguarda por tempo (o evento pode nao disparar se a aba ficar em
  // segundo plano). Mesmo padrao de cutscenes/phone-sequence.js.
  function waitForFade(overlay, durationMs, onDone) {
    let done = false;
    function finish(event) {
      if (done) {
        return;
      }
      if (event && event.propertyName && event.propertyName !== "opacity") {
        return;
      }
      done = true;
      overlay.removeEventListener("transitionend", finish);
      onDone();
    }
    overlay.addEventListener("transitionend", finish);
    setTimeout(finish, durationMs + 200);
  }

  function fadeTo(overlay, opacity, durationMs) {
    // A duracao vive no JS, nao no CSS: assim os 8 s e os 10 s pedidos
    // ficam num lugar so e nao ha dois numeros para manter em sincronia.
    overlay.style.transitionDuration = durationMs + "ms";
    // Forca o navegador a confirmar o estado atual antes de mudar - sem
    // isto, um elemento recem-inserido pularia direto para o valor final
    // em vez de animar.
    void overlay.offsetWidth;
    overlay.style.opacity = String(opacity);
  }

  function play(onComplete) {
    const container = document.getElementById("game-container");

    // ---------- Camadas na tela ----------
    const canvas = document.createElement("canvas");
    canvas.className = "road-cutscene-canvas";
    canvas.width = INTERNAL_WIDTH;
    canvas.height = INTERNAL_HEIGHT;
    container.appendChild(canvas);

    const overlay = document.createElement("div");
    overlay.className = "road-cutscene-fade";
    overlay.style.opacity = "1"; // a cutscene nasce no preto
    container.appendChild(overlay);

    const tapPrompt = document.createElement("div");
    tapPrompt.className = "road-cutscene-tap-prompt";
    tapPrompt.textContent = "Toque para iniciar";
    container.appendChild(tapPrompt);

    let finished = false;
    let frameId = null;
    let started = false;
    let roadReady = false;
    let readyPoll = null;

    // Saida de emergencia: se o WebGL nao subir neste aparelho, a
    // cutscene nao acontece, mas o jogo COMECA - nunca fica preso numa
    // tela preta.
    function bailOut(reason) {
      console.error("RoadCutscene: " + reason);
      cleanup();
      if (!finished) {
        finished = true;
        onComplete();
      }
      overlay.remove();
      tapPrompt.remove();
    }

    let renderer = null;
    let car = null;
    let road = null;
    let rain = null;

    function cleanup() {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      window.RoadCutsceneAudio.stopAll();
      if (rain) {
        scene.remove(rain.group);
        rain.dispose();
        rain = null;
      }
      if (road) {
        road.dispose();
        road = null;
      }
      if (car) {
        car.dispose();
        car = null;
      }
      if (renderer) {
        // forceContextLoss libera o contexto WebGL de verdade, para a
        // gameplay criar o dela num aparelho que so permite poucos.
        renderer.dispose();
        if (renderer.forceContextLoss) {
          renderer.forceContextLoss();
        }
        renderer = null;
      }
      canvas.remove();
    }

    // ---------- Cena ----------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(FOG_COLOR);
    scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    } catch (e) {
      bailOut("WebGL indisponivel");
      return;
    }
    renderer.setPixelRatio(1);
    renderer.setSize(INTERNAL_WIDTH, INTERNAL_HEIGHT, false);
    renderer.setClearColor(FOG_COLOR, 1);

    // Calibra o snap de vertice PSX pela resolucao interna.
    window.PSXCutsceneMaterial.setResolution(INTERNAL_WIDTH, INTERNAL_HEIGHT);

    // Ceu encoberto (hemisferica) + uma luz direcional fraca vinda da
    // frente-esquerda, como no pacote da estrada. Sem sombras: PS1 nao
    // tinha, e no celular sai de graca.
    const hemisphere = new THREE.HemisphereLight(SKY_LIGHT, GROUND_LIGHT, HEMI_INTENSITY);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xaab0b6, SUN_INTENSITY);
    sun.position.set(-0.35, 1, -0.6);
    scene.add(sun);

    // ---------- Carro e camera ----------
    car = window.CarInteriorFactory.build();
    scene.add(car.root);

    const camera = car.camera;
    camera.aspect = INTERNAL_WIDTH / INTERNAL_HEIGHT;
    camera.updateProjectionMatrix();

    // ---------- Estrada ----------
    road = window.RoadLoopFactory.build(scene, function () {
      roadReady = true;
      maybeStart();
    });

    // ---------- Chuva ----------
    // Ver "A CHUVA" no topo. Nada aqui e novo: e a fabrica de sempre, com
    // o carro no meio do volume e o retangulo seco em volta dele.
    rain = window.RainFactory.createRain({
      seed: "chuva-estrada",
      count: RAIN_COUNT,
      // Paleta de DIA: a estrada e fim de tarde encoberto, nao a noite
      // fechada da casa. A paleta de noite (ver PALETTES em
      // models/rain-factory.js) e quase a cor desta nevoa e sumiria.
      daytime: true,
      // Metros por pixel da tela interna nesta lente. A fabrica assume o
      // FOV 68 da gameplay; a cabine filma com 62 (ver CAMERA em
      // models/car-interior-factory.js), e e desta conta que sai a
      // espessura minima do risco em pixel.
      pixel: (2 * Math.tan((camera.fov * Math.PI) / 360)) / INTERNAL_HEIGHT,
      fog: { fogColor: FOG_COLOR, fogNear: RAIN_FOG_NEAR, fogFar: RAIN_FOG_FAR },
      // A caixa seca do carro, convertida para o espaco do volume: com o
      // grupo girado 180 graus, o z local cresce para TRAS do carro, ou
      // seja z_local = RAIN_BEHIND - z_cabine.
      exclusions: [
        {
          minX: -RAIN_CAR_HALF_WIDTH,
          maxX: RAIN_CAR_HALF_WIDTH,
          minZ: RAIN_BEHIND - RAIN_CAR_REAR_Z - RAIN_CAR_MARGIN,
          maxZ: RAIN_BEHIND - RAIN_CAR_FRONT_Z + RAIN_CAR_MARGIN
        }
      ]
    });
    // +Z local do volume aponta para a frente do carro (-Z do mundo).
    rain.group.rotation.y = Math.PI;
    scene.add(rain.group);

    // ---------- Audio ----------
    // Comeca a baixar/decodificar agora, em paralelo com os modelos. O
    // unlock() aproveita o toque em NOVO JOGO, que ainda esta na pilha de
    // chamadas neste instante - e o que libera o audio no mobile.
    window.RoadCutsceneAudio.preload();
    window.RoadCutsceneAudio.unlock();

    // ---------- Loop de render ----------
    // Comeca ANTES do fade-in: quando o preto sair, o carro ja esta
    // andando e a estrada ja esta desenhada - nao ha primeiro quadro
    // parado.
    const clock = new THREE.Clock();
    let travel = 0;
    let elapsed = 0;

    function tick() {
      frameId = requestAnimationFrame(tick);

      const delta = Math.min(0.05, clock.getDelta());
      elapsed += delta;

      // O carro anda para -Z sem parar; ao passar do fim do trecho, volta
      // para o inicio dele. A volta cai no meio de um pedaco de mata
      // identico ao que estava na tela (ver models/road-loop-factory.js),
      // entao nao aparece.
      travel += CAR_SPEED * delta;
      if (travel > window.RoadLoopFactory.PERIOD) {
        travel -= window.RoadLoopFactory.PERIOD;
      }

      const z = -travel;
      const lateral = Math.sin(elapsed * 0.31) * LATERAL_DRIFT;
      // O delta vai junto: o balanco da cabeca e uma mola integrada no
      // tempo, nao um seno, entao ela precisa saber o tamanho do passo.
      const bob = car.update(elapsed, CAR_SPEED * 3.6, delta);

      // A altura vem da FORMULA do terreno: o carro sobe e desce de
      // verdade com o abaulamento e os sulcos de pneu da pista.
      car.root.position.set(
        lateral,
        window.RoadLoopFactory.roadY(lateral, z) + car.rideHeight + bob,
        z
      );

      road.update(z);

      // A chuva anda com a cabine: o volume e sempre o mesmo, muda so o
      // lugar dele no mundo. O retangulo seco vai colado no carro (por
      // isso o X tambem acompanha a deriva lateral), entao a cabine
      // continua sem uma gota dentro em qualquer ponto da estrada. O
      // `elapsed` e o mesmo tempo absoluto do resto da cutscene - um
      // engasgo de quadro nao faz a chuva saltar.
      if (rain) {
        rain.group.position.set(lateral, 0, z + RAIN_BEHIND);
        rain.update(delta, elapsed);
      }

      renderer.render(scene, camera);
    }

    tick();

    // ---------- Largada ----------
    function maybeStart() {
      if (started) {
        return;
      }
      if (!roadReady || !window.RoadCutsceneAudio.isReady()) {
        return;
      }
      startTimeline();
    }

    // Se algo demorar demais (rede ruim), comeca de qualquer jeito: a
    // musica pode entrar muda, mas a cutscene nao trava.
    setTimeout(function () {
      startTimeline();
    }, LOAD_TIMEOUT_MS);

    // Enquanto os modelos e a musica carregam, a tela esta preta. Se o
    // navegador ainda estiver com o audio travado nesse momento, pede um
    // toque - mesmo recurso que o antigo player de video tinha.
    readyPoll = setInterval(function () {
      if (started) {
        return;
      }
      maybeStart();
      if (window.RoadCutsceneAudio.isBlocked()) {
        tapPrompt.classList.add("road-cutscene-tap-prompt-visible");
      }
    }, 250);

    container.addEventListener(
      "pointerdown",
      function () {
        window.RoadCutsceneAudio.unlock();
        tapPrompt.classList.remove("road-cutscene-tap-prompt-visible");
      },
      { once: true }
    );

    function startTimeline() {
      if (started) {
        return;
      }
      started = true;
      if (readyPoll !== null) {
        clearInterval(readyPoll);
        readyPoll = null;
      }
      tapPrompt.remove();

      // 1) Musica no radio do carro, som da estrada por baixo e o fade-in de
      // 8 s, tudo junto no primeiro quadro.
      fadeTo(overlay, 0, FADE_IN_MS);

      window.RoadCutsceneAudio.playMusic();
      window.RoadCutsceneAudio.startRoad(ROAD_FADE_IN_MS / 1000);

      // 2) A ligacao entra ANTES de a musica acabar - ela precisa estar
      // tocando para poder SAIR em fade quando a chamada e atendida. O
      // instante e contado de tras para a frente, a partir do fim real da
      // faixa: 3 s de toque + 5 s de fade-out. Assim o fade termina
      // exatamente onde a musica acabaria sozinha e nao sobra corte nem
      // silencio no meio da cutscene.
      const musicMs = window.RoadCutsceneAudio.getMusicDuration() * 1000;
      let timeToRingMs = musicMs - RING_MS - MUSIC_FADE_OUT_MS;
      if (!musicMs || timeToRingMs < MIN_TIME_TO_RING_MS) {
        // Faixa curta demais ou audio indisponivel: vale o piso de sempre, e
        // o fade-out pega o que ainda estiver tocando.
        timeToRingMs = MIN_TIME_TO_RING_MS;
      }

      setTimeout(function () {
        window.RoadCutsceneAudio.startRing();

        // O olhar para de passear e volta para a frente: alguem esta
        // chamando no radio, e e nisso que o Kael presta atencao agora. O
        // balanco da estrada continua inteiro por baixo.
        if (car) {
          car.centerView();
        }

        // 3) Tres segundos de toque -> a ligacao e atendida: xiado de radio,
        // e a musica comeca a sair no MESMO instante, em 5 segundos.
        setTimeout(function () {
          window.RoadCutsceneAudio.stopRing();
          window.RoadCutsceneAudio.fadeOutMusic(MUSIC_FADE_OUT_MS / 1000);
          window.RoadCutsceneAudio.playStatic().then(startDialogue);
        }, RING_MS);
      }, timeToRingMs);
    }

    // 4) O dialogo da ligacao, na caixa de dialogo de sempre.
    function startDialogue() {
      const dialogueBox = window.DialogueBox.create(container);
      dialogueBox.show();
      dialogueBox.playSequence(window.DialogueConfig[DIALOGUE_KEY], function () {
        // Ultima fala confirmada OU "PULAR TUDO": nos dois casos a
        // ligacao cai do mesmo jeito.
        dialogueBox.hide();
        window.RoadCutsceneAudio.playStatic().then(finishCutscene);
      });
    }

    // 5) Fade-out de 10 s, gameplay montada no preto, preto sai.
    function finishCutscene() {
      fadeTo(overlay, 1, FADE_OUT_MS);

      // A estrada sai junto com a imagem, no mesmo tempo do preto - em vez
      // de ser cortada quando a gameplay monta.
      window.RoadCutsceneAudio.stopRoad(FADE_OUT_MS / 1000);

      waitForFade(overlay, FADE_OUT_MS, function () {
        cleanup();

        if (!finished) {
          finished = true;
          // A gameplay e montada com a tela ainda 100% preta - e ela quem
          // dispara a mini cutscene de entrada no corredor (a camera
          // "acordando" + o dialogo do Kael), exatamente como antes.
          onComplete();
        }

        fadeTo(overlay, 0, HANDOFF_FADE_MS);
        let removed = false;
        function remove() {
          if (removed) {
            return;
          }
          removed = true;
          overlay.remove();
        }
        overlay.addEventListener("transitionend", remove, { once: true });
        setTimeout(remove, HANDOFF_FADE_MS + 150);
      });
    }
  }

  return { play: play };
})();
