/**
 * editor/editor-camera.js
 * -------------------------------------------------
 * CÂMERA LIVRE DO EDITOR (com modo voo e NO-CLIP).
 *
 * Enquanto o Editor está aberto, o PlayerController do jogo fica em
 * "cameraOverride" (ver scripts/player-controller.js) e quem escreve
 * em camera.position/rotation é este arquivo. Nenhuma câmera nova é
 * criada: é a MESMA câmera do jogo, com o mesmo FOV e o mesmo
 * renderer — só o que a controla muda.
 *
 * - Modo voo LIGADO (padrão): "para frente" segue para onde a
 *   câmera olha, então dá para subir/descer só apontando.
 * - Modo voo DESLIGADO: anda rente ao chão, como no gameplay, e os
 *   botões SUBIR/DESCER continuam servindo para ajustar a altura.
 * - NO-CLIP LIGADO: nenhuma colisão. Atravessa parede, porta,
 *   móvel, chão e teto.
 * - NO-CLIP DESLIGADO: a movimentação passa pelo MESMO
 *   window.Collision do jogo, contra a MESMA lista de sólidos do
 *   cenário ativo — nada de física paralela.
 * -------------------------------------------------
 */

window.EditorCamera = (function () {
  const PITCH_LIMIT = 1.5533; // ~89 graus
  const BASE_SPEED = 3.2; // unidades por segundo em velocidade 1x
  const LOOK_SENSITIVITY = 0.0042;
  const FLOOR_LIMIT = 0.25;
  const CEILING_LIMIT = 0.25;

  function create(camera, options) {
    const opts = options || {};
    const getSolids = opts.getSolids || function () { return []; };
    const getBounds = opts.getBounds || function () { return { minY: -50, maxY: 50 }; };
    const radius = opts.radius === undefined ? 0.28 : opts.radius;

    const position = new THREE.Vector3().copy(camera.position);
    let yaw = camera.rotation.y;
    let pitch = camera.rotation.x;

    let move = { x: 0, y: 0 };   // analógico: x = lateral, y = frente/trás
    let vertical = 0;            // -1 desce, +1 sobe
    let lookDX = 0;
    let lookDY = 0;

    let speedMultiplier = 1;
    let flyMode = true;
    let noClip = true;

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const step = new THREE.Vector3();

    function setMove(vector) {
      move.x = vector.x;
      move.y = vector.y;
    }

    function addLook(dx, dy) {
      lookDX += dx;
      lookDY += dy;
    }

    function setVertical(value) {
      vertical = value;
    }

    function update(delta) {
      // ---------- Olhar ----------
      if (lookDX !== 0 || lookDY !== 0) {
        yaw -= lookDX * LOOK_SENSITIVITY;
        pitch -= lookDY * LOOK_SENSITIVITY;
        pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
        lookDX = 0;
        lookDY = 0;
      }

      // ---------- Direções ----------
      if (flyMode) {
        forward.set(
          -Math.sin(yaw) * Math.cos(pitch),
          Math.sin(pitch),
          -Math.cos(yaw) * Math.cos(pitch)
        );
      } else {
        forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      }
      right.set(Math.cos(yaw), 0, -Math.sin(yaw));

      const speed = BASE_SPEED * speedMultiplier * delta;
      step.set(0, 0, 0);
      step.addScaledVector(forward, move.y);
      step.addScaledVector(right, move.x);
      step.y += vertical;
      if (step.lengthSq() > 1) {
        step.normalize();
      }
      step.multiplyScalar(speed);

      if (noClip) {
        position.add(step);
      } else {
        // Mesmo resolvedor de colisão do gameplay — sem cópia,
        // sem sistema paralelo (ver scripts/collision.js).
        const resolved = window.Collision.resolveMovement(
          position.x,
          position.z,
          step.x,
          step.z,
          radius,
          getSolids()
        );
        position.x = resolved.x;
        position.z = resolved.z;
        position.y += step.y;

        const bounds = getBounds();
        position.y = Math.max(
          bounds.minY + FLOOR_LIMIT,
          Math.min(bounds.maxY - CEILING_LIMIT, position.y)
        );
      }

      camera.position.copy(position);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
    }

    /** Coloca a câmera olhando para um objeto, a uma distância que o enquadre. */
    function focusOn(object3D) {
      if (!object3D) return;
      const box = new THREE.Box3();
      try {
        box.setFromObject(object3D);
      } catch (e) {
        return;
      }
      if (box.isEmpty()) {
        const target = new THREE.Vector3();
        object3D.getWorldPosition(target);
        lookAtPoint(target, 1.6);
        return;
      }
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radiusOf = Math.max(size.x, size.y, size.z) * 0.5 || 0.5;
      const distance = Math.max(0.9, radiusOf / Math.tan((camera.fov * Math.PI) / 360) + radiusOf * 0.6);
      lookAtPoint(center, distance);
    }

    function lookAtPoint(target, distance) {
      // Mantém a direção atual da câmera e só recua o suficiente para
      // o objeto caber na tela — nada de "teletransporte" com ângulo
      // aleatório, que desorienta no celular.
      const dir = new THREE.Vector3(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      );
      position.copy(target).addScaledVector(dir, -distance);
      camera.position.copy(position);

      const to = new THREE.Vector3().subVectors(target, position);
      yaw = Math.atan2(-to.x, -to.z);
      pitch = Math.atan2(to.y, Math.sqrt(to.x * to.x + to.z * to.z));
      pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
      camera.rotation.set(pitch, yaw, 0, "YXZ");
    }

    function teleport(x, y, z, newYaw, newPitch) {
      position.set(x, y, z);
      yaw = newYaw === undefined ? yaw : newYaw;
      pitch = newPitch === undefined ? 0 : newPitch;
      camera.position.copy(position);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
    }

    function syncFromCamera() {
      position.copy(camera.position);
      yaw = camera.rotation.y;
      pitch = camera.rotation.x;
    }

    return {
      update: update,
      setMove: setMove,
      addLook: addLook,
      setVertical: setVertical,
      focusOn: focusOn,
      teleport: teleport,
      syncFromCamera: syncFromCamera,
      setSpeedMultiplier: function (value) {
        speedMultiplier = value;
      },
      getSpeedMultiplier: function () {
        return speedMultiplier;
      },
      setFlyMode: function (value) {
        flyMode = !!value;
      },
      isFlyMode: function () {
        return flyMode;
      },
      setNoClip: function (value) {
        noClip = !!value;
      },
      isNoClip: function () {
        return noClip;
      },
      getPosition: function () {
        return position;
      },
    };
  }

  return { create: create };
})();
