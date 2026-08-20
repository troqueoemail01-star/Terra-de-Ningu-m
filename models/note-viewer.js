/**
 * models/note-viewer.js
 * -------------------------------------------------
 * Visualizador 3D da carta, usado dentro do pop-up de leitura (ver
 * interface/note-reader.js). NAO e uma imagem 2D da carta: e o mesmo
 * modelo 3D de papel do jogo (models/paper-note-factory.js — a mesma
 * folha amassada, as mesmas texturas de frente e verso, o mesmo
 * enxerto de shader PSX), so que renderizado numa cena propria.
 *
 * Por que uma cena/camera/renderer proprios:
 *  - o jogador precisa girar e dar zoom na carta SEM que a camera
 *    principal do jogo se mexa um milimetro. Com um render separado,
 *    isso e garantido por construcao: o arrasto dentro deste canvas
 *    nunca toca no player-controller;
 *  - a iluminacao da leitura pode ser propria (o corredor e escuro de
 *    proposito; a carta na mesa de leitura precisa estar legivel),
 *    sem alterar em nada a luz do cenario;
 *  - o loop de render so roda enquanto o pop-up esta aberto
 *    (`start()` / `stop()`), entao fora da leitura o custo e zero.
 *
 * O contexto WebGL e criado uma unica vez e reaproveitado em toda
 * leitura seguinte — abrir/fechar o pop-up varias vezes nao cria
 * contexto novo nenhum.
 *
 * Estetica: buffer interno pequeno (192x216) ampliado por CSS com
 * image-rendering: pixelated, exatamente o mesmo truque da tela do
 * jogo (320x180 em scripts/main.js). O resultado tem o mesmo pixel
 * cru do resto, em vez de um modelo liso e moderno colado no meio de
 * um jogo de PS1.
 *
 * Controles (todos so dentro deste canvas):
 *  - um dedo arrastando  -> gira a carta (yaw/pitch);
 *  - dois dedos (pinca)  -> zoom;
 *  - roda do mouse       -> zoom (conveniencia no PC/testes);
 *  - toque duplo         -> volta ao enquadramento inicial.
 * -------------------------------------------------
 */

window.NoteViewer = (function () {
  // Resolucao interna do buffer (mesma proporcao do canvas em tela).
  const INTERNAL_WIDTH = 192;
  const INTERNAL_HEIGHT = 216;

  const NOTE_WIDTH = 0.22;

  // Distancia da camera ate a carta: a inicial enquadra a folha
  // inteira com folga; os limites definem o quanto o jogador pode
  // chegar perto (ler detalhe) ou se afastar.
  const DIST_START = 0.52;
  const DIST_MIN = 0.17;
  const DIST_MAX = 0.85;

  // Inclinacao inicial: a carta levemente virada, para ler de cara
  // como um objeto 3D e nao como um cartaz reto.
  const YAW_START = -0.18;
  const PITCH_START = 0.12;
  const PITCH_LIMIT = 1.45; // evita virar de cabeca para baixo

  function create(canvas) {
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
      alpha: true,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(INTERNAL_WIDTH, INTERNAL_HEIGHT, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      38,
      INTERNAL_WIDTH / INTERNAL_HEIGHT,
      0.01,
      10
    );

    // Luz propria da "mesa de leitura": ambiente morna generosa (a
    // carta precisa estar legivel), uma principal vinda de cima e da
    // direita para marcar os vincos do papel, e uma contraluz fria
    // fraca so para a silhueta nao sumir no fundo escuro.
    scene.add(new THREE.AmbientLight(0xb7b0a0, 0.9));

    const key = new THREE.DirectionalLight(0xfff1d6, 0.95);
    key.position.set(0.55, 1, 1.1);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x7d8bb0, 0.32);
    rim.position.set(-0.9, -0.35, -1);
    scene.add(rim);

    // Pivo: e ele que gira, nunca a camera — assim a iluminacao fica
    // parada no lugar e o papel "passa" por ela ao ser girado, que e
    // o que da a leitura de volume.
    const pivot = new THREE.Group();
    scene.add(pivot);

    // O MESMO modelo 3D de carta que existe no jogo (a de dentro da
    // gaveta e a da mao usam esta mesma fabrica), com as duas faces
    // ligadas: da para virar a folha e ver o verso.
    const note = window.PaperNoteFactory.criar({
      largura: NOTE_WIDTH,
      amassado: 0.5,
      semente: 5,
      iluminacao: "lambert",
      resolucao: "psx",
      psx: { resolucao: [INTERNAL_WIDTH, INTERNAL_HEIGHT] },
    });
    pivot.add(note.grupo);

    let yaw = YAW_START;
    let pitch = PITCH_START;
    let dist = DIST_START;
    let running = false;
    let rafId = null;

    function applyCamera() {
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      pivot.rotation.set(pitch, yaw, 0);
    }
    applyCamera();

    function reset() {
      yaw = YAW_START;
      pitch = PITCH_START;
      dist = DIST_START;
      applyCamera();
    }

    // ---------- Controles de toque ----------
    // Ponteiros ativos sobre o canvas: 1 = girar, 2 = pinca de zoom.
    const pointers = new Map();
    let pinchStartDist = 0;
    let pinchStartCamDist = 0;
    let lastTapAt = 0;

    const ROTATE_SPEED = 0.011; // radianos por pixel arrastado

    function pinchDistance() {
      const list = Array.from(pointers.values());
      const dx = list[0].x - list[1].x;
      const dy = list[0].y - list[1].y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    canvas.addEventListener("pointerdown", function (e) {
      e.stopPropagation();
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2) {
        pinchStartDist = pinchDistance();
        pinchStartCamDist = dist;
      } else if (pointers.size === 1) {
        // Toque duplo rapido volta ao enquadramento inicial.
        const now = performance.now();
        if (now - lastTapAt < 320) {
          reset();
        }
        lastTapAt = now;
      }
    });

    canvas.addEventListener("pointermove", function (e) {
      const previous = pointers.get(e.pointerId);
      if (!previous) return;
      e.stopPropagation();

      const dx = e.clientX - previous.x;
      const dy = e.clientY - previous.y;
      previous.x = e.clientX;
      previous.y = e.clientY;

      if (pointers.size >= 2) {
        // Pinca: a distancia da camera muda na proporcao inversa da
        // distancia entre os dois dedos (afastar = aproximar a carta).
        const current = pinchDistance();
        if (pinchStartDist > 0 && current > 0) {
          dist = pinchStartCamDist * (pinchStartDist / current);
          dist = Math.max(DIST_MIN, Math.min(DIST_MAX, dist));
          applyCamera();
        }
        return;
      }

      yaw += dx * ROTATE_SPEED;
      pitch += dy * ROTATE_SPEED;
      pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
      applyCamera();
    });

    function releasePointer(e) {
      if (!pointers.has(e.pointerId)) return;
      e.stopPropagation();
      pointers.delete(e.pointerId);
      pinchStartDist = 0;
    }
    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);

    canvas.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        dist = Math.max(DIST_MIN, Math.min(DIST_MAX, dist + e.deltaY * 0.0008));
        applyCamera();
      },
      { passive: false }
    );

    // ---------- Loop proprio (so enquanto o pop-up esta aberto) ----------
    function frame() {
      if (!running) return;
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      pointers.clear();
    }

    return {
      start: start,
      stop: stop,
      reset: reset,
      nota: note,
    };
  }

  return { create: create };
})();
