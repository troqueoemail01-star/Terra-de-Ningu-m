/**
 * models/ceiling-fan-factory.js
 * -------------------------------------------------
 * Ventilador de teto, estilo retrô PSX/PS1. 100% procedural — mesmo
 * princípio já usado por CarpetFactory/LampFactory: geometria montada
 * em código e texturas geradas via <canvas> em baixa resolução com
 * NearestFilter (sem depender de nenhum arquivo externo tipo .glb ou
 * .png), incluindo o mesmo efeito de "vertex snapping" da PS1 (ver
 * applyPSXVertexSnap mais abaixo) usado noutros pontos do jogo.
 *
 * As pás giram (ver `update` abaixo, chamado a cada quadro por
 * scenes/room-scene.js) — o suporte de teto (`mount`) e a haste
 * (`rod`) ficam FORA do grupo `motor`, então nunca giram: continuam
 * presos e parados, como uma base de ventilador de verdade. Só o
 * grupo `motor` (cubo do motor + as pás) roda em torno do próprio
 * eixo Y, na velocidade de `rotationSpeed` (rad/s). Ainda sem
 * interação, sem som, sem liga/desliga — só a rotação contínua.
 *
 * Espaço local: a origem do grupo fica no nível do motor/pás (Y = 0);
 * a haste e o suporte de teto sobem a partir daí. `mountTopY`
 * (devolvido junto com o grupo) é a altura, nesse mesmo espaço local,
 * do topo do suporte — o ponto que deve encostar no teto. Quem monta
 * a cena (RoomScene) usa esse valor para calcular a posição vertical
 * certa, em vez de duplicar aqui a conta de onde fica o teto.
 * -------------------------------------------------
 */

window.CeilingFanFactory = (function () {
  function createCeilingFan(options) {
    const opts = Object.assign({
      bladeCount: 4,
      bladeLength: 0.85,
      bladeWidth: 0.22,
      bladeTipWidth: 0.16,
      bladeThickness: 0.035,
      bladePitch: 7, // inclinação da pá, em graus
      hubRadius: 0.20,
      hubHeight: 0.30,
      rodLength: 0.45,
      rodRadius: 0.03,
      mountRadius: 0.14,
      rotationSpeed: 1.9, // rad/s (~18 rpm) — giro lento e constante
      textureSize: 64, // resolução baixa proposital (estilo PS1)
      psxJitter: true, // efeito de "vertex snapping" da PSX
      jitterResolution: 240, // quanto menor, mais tremido/quantizado
      castShadow: true,
      receiveShadow: true,
    }, options);

    const group = new THREE.Group();
    group.name = 'CeilingFan';

    // ---------- Texturas procedurais (baixa resolução + filtro nearest) ----------
    const bladeTexture = buildRustyTexture(opts.textureSize, {
      base: '#a89a86', rust: ['#5b4433', '#3c2a1e'], highlight: '#c9bfae',
    });
    const hubTexture = buildRustyTexture(opts.textureSize, {
      base: '#4a4640', rust: ['#5b3a26', '#241b17'], highlight: '#726a5f',
    });

    const bladeMaterial = new THREE.MeshStandardMaterial({
      map: bladeTexture, roughness: 0.85, metalness: 0.15, flatShading: true,
    });
    const hubMaterial = new THREE.MeshStandardMaterial({
      map: hubTexture, roughness: 0.75, metalness: 0.35, flatShading: true,
    });

    if (opts.psxJitter) {
      applyPSXVertexSnap(bladeMaterial, opts.jitterResolution);
      applyPSXVertexSnap(hubMaterial, opts.jitterResolution);
    }

    // ---------- Suporte de teto ----------
    const mountGeo = new THREE.CylinderGeometry(
      opts.mountRadius, opts.mountRadius * 1.15, opts.mountRadius * 0.8, 8
    );
    const mount = new THREE.Mesh(mountGeo, hubMaterial);
    mount.name = 'CeilingMount';
    mount.position.y = opts.rodLength + opts.mountRadius * 0.4;
    mount.castShadow = opts.castShadow;
    mount.receiveShadow = opts.receiveShadow;
    group.add(mount);

    // Topo do suporte, no espaço local — ponto que encosta no teto
    // (ver comentário de cabeçalho sobre `mountTopY`).
    const mountTopY = opts.rodLength + opts.mountRadius * 0.8;

    // ---------- Haste ----------
    const rodGeo = new THREE.CylinderGeometry(opts.rodRadius, opts.rodRadius, opts.rodLength, 6);
    const rod = new THREE.Mesh(rodGeo, hubMaterial);
    rod.name = 'Rod';
    rod.position.y = opts.rodLength * 0.5;
    rod.castShadow = opts.castShadow;
    group.add(rod);

    // ---------- Grupo do motor + pás (parte que giraria, se um dia animar) ----------
    const motor = new THREE.Group();
    motor.name = 'FanMotor';
    group.add(motor);

    const bodyGeo = new THREE.CylinderGeometry(opts.hubRadius, opts.hubRadius * 0.92, opts.hubHeight, 8);
    const body = new THREE.Mesh(bodyGeo, hubMaterial);
    body.name = 'MotorBody';
    body.castShadow = opts.castShadow;
    body.receiveShadow = opts.receiveShadow;
    motor.add(body);

    const capGeo = new THREE.CylinderGeometry(opts.hubRadius * 0.92, opts.hubRadius * 0.55, opts.hubHeight * 0.4, 8);
    const cap = new THREE.Mesh(capGeo, hubMaterial);
    cap.name = 'MotorCap';
    cap.position.y = -opts.hubHeight * 0.7;
    cap.castShadow = opts.castShadow;
    motor.add(cap);

    const blades = [];
    for (let i = 0; i < opts.bladeCount; i++) {
      const blade = buildBlade(opts, bladeMaterial);
      const angle = (i / opts.bladeCount) * Math.PI * 2;
      blade.position.set(
        Math.cos(angle) * opts.hubRadius * 0.85,
        0,
        Math.sin(angle) * opts.hubRadius * 0.85
      );
      blade.rotation.y = -angle;
      blade.rotation.z = THREE.MathUtils.degToRad(opts.bladePitch);
      blade.name = 'Blade' + i;
      motor.add(blade);
      blades.push(blade);
    }

    // ---------- Animação ----------
    // Gira só o grupo `motor` (motor + pás) — `mount`/`rod`, fora
    // deste grupo, nunca são tocados aqui. Chamado a cada quadro por
    // scenes/room-scene.js enquanto o jogador está no quarto.
    function update(delta) {
      if (opts.rotationSpeed !== 0) {
        motor.rotation.y += opts.rotationSpeed * delta;
      }
    }

    function setSpinning(rpm) {
      opts.rotationSpeed = (rpm * Math.PI * 2) / 60;
    }

    function dispose() {
      group.traverse(function (obj) {
        if (obj.isMesh) obj.geometry.dispose();
      });
      bladeMaterial.dispose();
      hubMaterial.dispose();
      bladeTexture.dispose();
      hubTexture.dispose();
    }

    return {
      group: group,
      motor: motor,
      blades: blades,
      mountTopY: mountTopY,
      update: update,
      setSpinning: setSpinning,
      dispose: dispose,
    };
  }

  // ------------------------------------------------------------------
  // Helpers internos
  // ------------------------------------------------------------------

  function buildBlade(opts, material) {
    const geo = new THREE.BoxGeometry(
      opts.bladeLength, opts.bladeThickness, opts.bladeWidth, 4, 1, 1
    );
    const pos = geo.attributes.position;
    const halfLen = opts.bladeLength / 2;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const t = (x + halfLen) / opts.bladeLength; // 0 = base, 1 = ponta
      const widthScale = THREE.MathUtils.lerp(1.0, opts.bladeTipWidth / opts.bladeWidth, t);
      pos.setZ(i, pos.getZ(i) * widthScale);
    }
    geo.computeVertexNormals();
    geo.translate(halfLen, 0, 0); // pivô na base da pá (encaixe no motor)

    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = opts.castShadow;
    mesh.receiveShadow = opts.receiveShadow;
    return mesh;
  }

  function buildRustyTexture(size, palette) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = palette.base;
    ctx.fillRect(0, 0, size, size);

    // Faixas de metal "escovado"
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = palette.highlight;
    for (let y = 0; y < size; y += 3) {
      if (Math.random() > 0.5) ctx.fillRect(0, y, size, 1);
    }

    // Manchas de ferrugem em blocos (sem suavização -> visual PSX)
    const blotches = Math.floor(size * 0.9);
    for (let i = 0; i < blotches; i++) {
      const rx = Math.floor(Math.random() * size);
      const ry = Math.floor(Math.random() * size);
      const rs = 1 + Math.floor(Math.random() * 3);
      ctx.fillStyle = palette.rust[Math.floor(Math.random() * palette.rust.length)];
      ctx.globalAlpha = 0.35 + Math.random() * 0.4;
      ctx.fillRect(rx, ry, rs, rs);
    }
    ctx.globalAlpha = 1;

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  function applyPSXVertexSnap(material, resolution) {
    // Simula o "vertex jitter" clássico do PS1: a posição final do
    // vértice é arredondada para uma grade de baixa resolução no
    // espaço da tela.
    material.onBeforeCompile = function (shader) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        '\n      #include <project_vertex>\n      float psxSnapRes = ' + resolution.toFixed(1) + ';\n      gl_Position.xy = floor(gl_Position.xy / gl_Position.w * psxSnapRes) / psxSnapRes * gl_Position.w;\n      '
      );
    };
    material.needsUpdate = true;
  }

  return { createCeilingFan: createCeilingFan };
})();
