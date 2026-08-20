/**
 * effects/motion-blur.js
 * -------------------------------------------------
 * Motion Blur sutil de câmera, acoplado apenas à ROTAÇÃO da visão
 * (o "olhar ao redor" do jogador) — o movimento de posição do
 * personagem no corredor não entra nessa conta.
 *
 * Como funciona:
 * 1. Em vez de desenhar a cena direto no canvas, ela é renderizada
 *    num WebGLRenderTarget interno, na mesma resolução baixa (320x180)
 *    do resto do jogo — assim o desfoque nasce dentro da estética PSX,
 *    e não por cima dela.
 * 2. A cada quadro, a velocidade angular da câmera (o quanto o
 *    yaw/pitch mudou desde o quadro anterior, dividido pelo tempo)
 *    define a intensidade e a direção de um leve desfoque direcional.
 * 3. Um quad de tela cheia desenha essa textura no canvas de verdade,
 *    aplicando o desfoque via shader — poucas amostras, um único
 *    passe extra, bem barato para celular.
 *
 * A intensidade é sempre suavizada e limitada a um teto bem baixo: o
 * efeito deve ser quase imperceptível, só reforçando a sensação de
 * movimento ao virar a câmera rápido. Câmera parada ou girando devagar
 * praticamente não gera desfoque nenhum.
 * -------------------------------------------------
 */

window.MotionBlur = (function () {
  // ---------- Ajustes (concentrados aqui para fácil calibragem) ----------

  // Abaixo dessa velocidade angular (rad/s), nenhum desfoque é aplicado.
  const MIN_ANGULAR_SPEED = 0.6;

  // A partir dessa velocidade angular, o desfoque já está no máximo.
  const MAX_ANGULAR_SPEED = 9.0;

  // Deslocamento máximo da amostra mais distante, em espaço de UV
  // (1.0 = a largura/altura inteira do quadro). Mantido bem baixo de
  // propósito — é o que garante o efeito "quase imperceptível".
  const MAX_BLUR_OFFSET = 0.0075;

  // Velocidade de resposta da suavização (maior = reage mais rápido).
  // ATTACK: quão rápido o desfoque "liga" ao acelerar a câmera.
  // RELEASE: quão rápido ele some ao a câmera parar — rápido, porém
  // suave, sem corte abrupto nem efeito "arrastando".
  const ATTACK_RATE = 22;
  const RELEASE_RATE = 9;

  const VERTEX_SHADER = [
    "varying vec2 vUv;",
    "void main() {",
    "  vUv = uv;",
    "  // Quad já em espaço de tela (-1..1): não precisa de projeção.",
    "  gl_Position = vec4(position.xy, 0.0, 1.0);",
    "}",
  ].join("\n");

  // Desfoque direcional de 9 amostras (pesos de um kernel gaussiano
  // aproximado, somando 1.0) ao longo de "uBlurDirection". Barato:
  // uma amostra central + 4 pares, um único passe, na resolução
  // interna baixa do jogo — custo desprezível em celular.
  const FRAGMENT_SHADER = [
    "uniform sampler2D tDiffuse;",
    "uniform vec2 uBlurDirection;",
    "varying vec2 vUv;",
    "",
    "void main() {",
    "  vec4 color = texture2D(tDiffuse, vUv) * 0.227027;",
    "",
    "  vec2 o1 = uBlurDirection * 0.25;",
    "  vec2 o2 = uBlurDirection * 0.5;",
    "  vec2 o3 = uBlurDirection * 0.75;",
    "  vec2 o4 = uBlurDirection;",
    "",
    "  color += texture2D(tDiffuse, vUv + o1) * 0.1945946;",
    "  color += texture2D(tDiffuse, vUv - o1) * 0.1945946;",
    "  color += texture2D(tDiffuse, vUv + o2) * 0.1216216;",
    "  color += texture2D(tDiffuse, vUv - o2) * 0.1216216;",
    "  color += texture2D(tDiffuse, vUv + o3) * 0.0540541;",
    "  color += texture2D(tDiffuse, vUv - o3) * 0.0540541;",
    "  color += texture2D(tDiffuse, vUv + o4) * 0.0162162;",
    "  color += texture2D(tDiffuse, vUv - o4) * 0.0162162;",
    "",
    "  gl_FragColor = color;",
    "}",
  ].join("\n");

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {number} width  resolução interna do jogo (ex.: 320)
   * @param {number} height resolução interna do jogo (ex.: 180)
   */
  function create(renderer, width, height) {
    const sceneRenderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthBuffer: true,
      // `stencilBuffer: true` (mesmo sem usar stencil pra nada aqui):
      // é o que faz o Three.js alocar um buffer de profundidade
      // COMBINADO depth+stencil (tipicamente 24 bits de profundidade),
      // em vez do buffer de profundidade "puro" que ele usa quando
      // stencilBuffer é false — que na prática cai para só 16 bits.
      // Como a cena inteira passa por este render target antes de
      // chegar no canvas (ver beginSceneRender()/finishAndRender()
      // abaixo), rodar com metade da precisão de profundidade normal
      // deixava superfícies bem próximas uma da outra (como o tapete
      // do corredor sobre o piso — ver models/carpet-factory.js e
      // materials.carpet em materials/material-library.js) brigando
      // pelo mesmo valor de profundidade: paradas, o resultado fica
      // estável; ao girar a câmera, os valores mudam de leve e o
      // "empate" se inverte de um quadro pro outro — o tapete pisca/
      // some. Voltar para 24 bits de profundidade resolve na causa.
      stencilBuffer: true,
    });

    const uniforms = {
      tDiffuse: { value: sceneRenderTarget.texture },
      uBlurDirection: { value: new THREE.Vector2(0, 0) },
    };

    const quadMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    });

    // Câmera/cena dedicadas só para desenhar o quad de tela cheia —
    // não fazem parte da cena do jogo.
    const quadScene = new THREE.Scene();
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMaterial);
    quadScene.add(quad);

    // Estado usado para medir a velocidade angular da câmera
    // (comparando a rotação atual com a do quadro anterior).
    let prevYaw = null;
    let prevPitch = null;
    const currentBlur = new THREE.Vector2(0, 0);

    return {
      /**
       * Chamar antes de renderizar a cena do jogo: desvia o desenho
       * para o render target interno em vez do canvas.
       */
      beginSceneRender: function () {
        renderer.setRenderTarget(sceneRenderTarget);
      },

      /**
       * Chamar depois de renderizar a cena do jogo, com a câmera já
       * na posição/rotação final do quadro atual. Calcula a
       * velocidade angular da câmera, atualiza a intensidade do
       * desfoque de forma suavizada e desenha o resultado final
       * (cena + Motion Blur) no canvas.
       */
      finishAndRender: function (camera, delta) {
        const yaw = camera.rotation.y;
        const pitch = camera.rotation.x;

        let targetX = 0;
        let targetY = 0;

        if (prevYaw !== null && delta > 0) {
          const deltaYaw = yaw - prevYaw;
          const deltaPitch = pitch - prevPitch;
          const rawMagnitude = Math.sqrt(
            deltaYaw * deltaYaw + deltaPitch * deltaPitch
          );
          const angularSpeed = rawMagnitude / delta; // rad/s

          // Rampa suave (smoothstep) entre "sem desfoque" e "desfoque
          // máximo", conforme a velocidade angular da câmera.
          const t = clamp01(
            (angularSpeed - MIN_ANGULAR_SPEED) /
              (MAX_ANGULAR_SPEED - MIN_ANGULAR_SPEED)
          );
          const smoothT = t * t * (3 - 2 * t);
          const blurMagnitude = smoothT * MAX_BLUR_OFFSET;

          if (rawMagnitude > 1e-6) {
            const scale = blurMagnitude / rawMagnitude;
            targetX = deltaYaw * scale;
            targetY = deltaPitch * scale;
          }
        }

        prevYaw = yaw;
        prevPitch = pitch;

        // Suaviza a transição: liga rápido ao acelerar, some suave ao
        // parar — nunca um corte abrupto.
        const targetMag = Math.sqrt(targetX * targetX + targetY * targetY);
        const currentMag = currentBlur.length();
        const rate = targetMag > currentMag ? ATTACK_RATE : RELEASE_RATE;
        const smoothing = 1 - Math.exp(-rate * Math.max(delta, 0));

        currentBlur.x += (targetX - currentBlur.x) * smoothing;
        currentBlur.y += (targetY - currentBlur.y) * smoothing;

        uniforms.uBlurDirection.value.copy(currentBlur);

        renderer.setRenderTarget(null);
        renderer.render(quadScene, quadCamera);
      },

      /**
       * Redimensiona o render target interno (só necessário se a
       * resolução interna do jogo mudar em tempo de execução).
       */
      setSize: function (newWidth, newHeight) {
        sceneRenderTarget.setSize(newWidth, newHeight);
      },

      /** Libera os recursos de GPU do efeito. */
      dispose: function () {
        sceneRenderTarget.dispose();
        quadMaterial.dispose();
        quad.geometry.dispose();
      },
    };
  }

  return { create: create };
})();
