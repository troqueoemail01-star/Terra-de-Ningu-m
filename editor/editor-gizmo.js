/**
 * editor/editor-gizmo.js
 * -------------------------------------------------
 * GIZMO DE MANIPULAÇÃO (mover / rotacionar / escalar) FEITO PARA DEDO.
 *
 * Mesma ideia das engines 3D de PC, mas com três diferenças pensadas
 * para o celular:
 *
 *   1. Cada eixo tem uma ÁREA DE TOQUE invisível bem mais gorda que a
 *      seta desenhada — acertar a seta com o dedo é fácil.
 *   2. O gizmo tem TAMANHO CONSTANTE NA TELA: ele é reescalado a cada
 *      quadro conforme a distância da câmera, então nunca fica
 *      minúsculo de longe nem gigante de perto.
 *   3. Um modo por vez (setas OU anéis OU cubos), nunca os três
 *      juntos — tela pequena não comporta 9 alças ao mesmo tempo.
 *
 * Vive dentro da MESMA cena Three.js do jogo, marcado com
 * `userData.__editorHelper = true` para o registro de objetos e a
 * seleção por toque ignorarem ele por completo (ver
 * editor/editor-registry.js).
 *
 * Trabalha sempre em ESPAÇO DE MUNDO e converte o resultado para o
 * espaço local do pai do objeto na hora de escrever — é isso que faz
 * o gizmo funcionar igual em objetos soltos na raiz e em objetos
 * dentro de grupos rotacionados/escalados (ex.: a escrivaninha).
 * -------------------------------------------------
 */

window.EditorGizmo = (function () {
  const AXIS_COLORS = { x: 0xff5f6d, y: 0x86ff9b, z: 0x6fb2ff };
  const HIGHLIGHT = 0xffe066;
  const UNIFORM_COLOR = 0xf2f2f2;

  const AXES = {
    x: new THREE.Vector3(1, 0, 0),
    y: new THREE.Vector3(0, 1, 0),
    z: new THREE.Vector3(0, 0, 1),
  };

  function basicMaterial(color, opacity) {
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity === undefined ? 1 : opacity,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
  }

  // Alça invisível: não aparece, mas é ela que o raio do dedo acerta.
  function pickMaterial() {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
  }

  function orientToAxis(object, axis) {
    if (axis === "x") object.rotation.z = -Math.PI / 2;
    if (axis === "z") object.rotation.x = Math.PI / 2;
  }

  function create(scene, camera) {
    const root = new THREE.Group();
    root.name = "EditorGizmo";
    root.userData.__editorHelper = true;
    root.renderOrder = 9000;
    root.visible = false;
    scene.add(root);

    const groups = {
      translate: new THREE.Group(),
      rotate: new THREE.Group(),
      scale: new THREE.Group(),
    };
    Object.keys(groups).forEach(function (key) {
      groups[key].userData.__editorHelper = true;
      groups[key].visible = false;
      root.add(groups[key]);
    });

    const handles = []; // { mesh, axis, mode, material, baseColor }

    function registerHandle(mesh, axis, mode, material, baseColor) {
      mesh.userData.__editorHelper = true;
      mesh.userData.__gizmoAxis = axis;
      mesh.userData.__gizmoMode = mode;
      mesh.renderOrder = 9001;
      handles.push({ mesh: mesh, axis: axis, mode: mode, material: material, baseColor: baseColor });
    }

    // ---------- Setas (mover) ----------
    Object.keys(AXES).forEach(function (axis) {
      const color = AXIS_COLORS[axis];
      const material = basicMaterial(color);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 8), material);
      shaft.position.y = 0.35;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 10), material);
      tip.position.y = 0.79;

      const arm = new THREE.Group();
      arm.userData.__editorHelper = true;
      arm.add(shaft);
      arm.add(tip);

      // Área de toque: cilindro gordo e invisível cobrindo o braço.
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.95, 8), pickMaterial());
      pick.position.y = 0.45;
      arm.add(pick);

      orientToAxis(arm, axis);
      groups.translate.add(arm);
      registerHandle(pick, axis, "translate", material, color);
    });

    // ---------- Anéis (rotacionar) ----------
    Object.keys(AXES).forEach(function (axis) {
      const color = AXIS_COLORS[axis];
      const material = basicMaterial(color, 0.95);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.014, 6, 40), material);
      const pick = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.1, 5, 24), pickMaterial());

      const arm = new THREE.Group();
      arm.userData.__editorHelper = true;
      arm.add(ring);
      arm.add(pick);

      // O torus nasce no plano XY: girar para que o "furo" aponte
      // para o eixo certo.
      if (axis === "x") arm.rotation.y = Math.PI / 2;
      if (axis === "y") arm.rotation.x = Math.PI / 2;

      groups.rotate.add(arm);
      registerHandle(pick, axis, "rotate", material, color);
    });

    // ---------- Cubos (escalar) ----------
    Object.keys(AXES).forEach(function (axis) {
      const color = AXIS_COLORS[axis];
      const material = basicMaterial(color);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 6), material);
      shaft.position.y = 0.31;
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), material);
      box.position.y = 0.66;

      const arm = new THREE.Group();
      arm.userData.__editorHelper = true;
      arm.add(shaft);
      arm.add(box);

      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.82, 8), pickMaterial());
      pick.position.y = 0.4;
      arm.add(pick);

      orientToAxis(arm, axis);
      groups.scale.add(arm);
      registerHandle(pick, axis, "scale", material, color);
    });

    // Cubo central: escala uniforme (os três eixos juntos).
    const uniformMaterial = basicMaterial(UNIFORM_COLOR);
    const uniformBox = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), uniformMaterial);
    const uniformPick = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), pickMaterial());
    groups.scale.add(uniformBox);
    groups.scale.add(uniformPick);
    registerHandle(uniformPick, "uniform", "scale", uniformMaterial, UNIFORM_COLOR);

    // ---------- Estado ----------
    let target = null;
    let mode = "translate";
    let translateSnap = 0;
    let rotateSnap = 0;
    let onChange = null;

    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane();
    const worldPosition = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();

    let drag = null;

    function setOnChange(fn) {
      onChange = fn;
    }

    function attach(object3D) {
      target = object3D || null;
      root.visible = !!target && mode !== "none";
      refreshMode();
    }

    function detach() {
      target = null;
      drag = null;
      root.visible = false;
    }

    function refreshMode() {
      Object.keys(groups).forEach(function (key) {
        groups[key].visible = !!target && key === mode;
      });
      root.visible = !!target && mode !== "none";
    }

    function setMode(newMode) {
      mode = newMode;
      drag = null;
      refreshMode();
    }

    function setSnap(translateValue, rotateValue) {
      translateSnap = translateValue || 0;
      rotateSnap = rotateValue || 0;
    }

    function highlight(axis) {
      handles.forEach(function (handle) {
        if (handle.mode !== mode) return;
        handle.material.color.setHex(axis === handle.axis ? HIGHLIGHT : handle.baseColor);
      });
    }

    /** Reposiciona/reescala o gizmo — chamado uma vez por quadro. */
    function update() {
      if (!target || !root.visible) return;
      target.getWorldPosition(worldPosition);
      root.position.copy(worldPosition);

      // Tamanho constante na tela, independente da distância.
      const distance = camera.position.distanceTo(worldPosition);
      root.scale.setScalar(Math.max(0.12, distance * 0.19));

      // Sempre alinhado aos eixos do MUNDO (mais previsível no
      // celular do que gizmo em espaço local).
      root.quaternion.set(0, 0, 0, 1);
    }

    function activeHandles() {
      return handles
        .filter(function (handle) {
          return handle.mode === mode;
        })
        .map(function (handle) {
          return handle.mesh;
        });
    }

    function snapValue(value, snap) {
      return snap > 0 ? Math.round(value / snap) * snap : value;
    }

    function worldToLocalPosition(object3D, worldPoint) {
      const out = worldPoint.clone();
      if (object3D.parent) {
        object3D.parent.updateWorldMatrix(true, false);
        object3D.parent.worldToLocal(out);
      }
      return out;
    }

    /**
     * pointerDown(ndc) — devolve true se o dedo pegou uma alça (nesse
     * caso o Editor não deve girar a câmera nem trocar a seleção).
     */
    function pointerDown(ndc) {
      if (!target || !root.visible) return false;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(activeHandles(), false);
      if (!hits.length) return false;

      const hit = hits[0].object;
      const axis = hit.userData.__gizmoAxis;
      target.getWorldPosition(worldPosition);

      const axisVector = axis === "uniform" ? AXES.y.clone() : AXES[axis].clone();
      camera.getWorldDirection(cameraDirection);

      if (mode === "rotate") {
        plane.setFromNormalAndCoplanarPoint(axisVector, worldPosition);
      } else {
        // Plano que contém o eixo e encara a câmera o máximo possível.
        const normal = axisVector
          .clone()
          .cross(cameraDirection)
          .cross(axisVector)
          .normalize();
        if (normal.lengthSq() < 1e-6) {
          normal.copy(cameraDirection).negate();
        }
        plane.setFromNormalAndCoplanarPoint(normal, worldPosition);
      }

      const point = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, point)) {
        return false;
      }

      drag = {
        axis: axis,
        axisVector: axisVector,
        startPoint: point.clone(),
        startWorld: worldPosition.clone(),
        startPosition: target.position.clone(),
        startQuaternion: target.quaternion.clone(),
        startWorldQuaternion: target.getWorldQuaternion(new THREE.Quaternion()),
        startScale: target.scale.clone(),
        gizmoScale: root.scale.x,
        moved: false,
      };
      highlight(axis);
      return true;
    }

    /** pointerMove(ndc) — devolve true enquanto estiver arrastando. */
    function pointerMove(ndc) {
      if (!drag || !target) return false;
      raycaster.setFromCamera(ndc, camera);

      const point = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, point)) {
        return true;
      }

      if (mode === "translate") {
        const offset = point.clone().sub(drag.startPoint);
        let distance = offset.dot(drag.axisVector);
        distance = snapValue(distance, translateSnap);
        const newWorld = drag.startWorld.clone().addScaledVector(drag.axisVector, distance);
        target.position.copy(worldToLocalPosition(target, newWorld));
      } else if (mode === "rotate") {
        const from = drag.startPoint.clone().sub(drag.startWorld);
        const to = point.clone().sub(drag.startWorld);
        let angle = Math.atan2(
          from.clone().cross(to).dot(drag.axisVector),
          from.dot(to)
        );
        if (rotateSnap > 0) {
          angle = Math.round(angle / rotateSnap) * rotateSnap;
        }
        const delta = new THREE.Quaternion().setFromAxisAngle(drag.axisVector, angle);
        const newWorldQuaternion = delta.multiply(drag.startWorldQuaternion.clone());

        if (target.parent) {
          const parentQuaternion = target.parent.getWorldQuaternion(new THREE.Quaternion());
          target.quaternion.copy(parentQuaternion.invert().multiply(newWorldQuaternion));
        } else {
          target.quaternion.copy(newWorldQuaternion);
        }
      } else if (mode === "scale") {
        const offset = point.clone().sub(drag.startPoint);
        const distance = offset.dot(drag.axisVector);
        const factor = Math.max(0.02, 1 + distance / Math.max(0.001, drag.gizmoScale));
        if (drag.axis === "uniform") {
          target.scale.set(
            drag.startScale.x * factor,
            drag.startScale.y * factor,
            drag.startScale.z * factor
          );
        } else {
          target.scale[drag.axis] = drag.startScale[drag.axis] * factor;
        }
      }

      drag.moved = true;
      if (onChange) {
        onChange(target, mode);
      }
      return true;
    }

    /**
     * pointerUp() — devolve o "antes e depois" do arrasto para o
     * histórico de desfazer, ou null se nada mudou.
     */
    function pointerUp() {
      highlight(null);
      if (!drag || !target) {
        drag = null;
        return null;
      }
      const result = drag.moved
        ? {
            mode: mode,
            axis: drag.axis,
            before: {
              position: drag.startPosition.toArray(),
              quaternion: drag.startQuaternion.toArray(),
              scale: drag.startScale.toArray(),
            },
            after: {
              position: target.position.toArray(),
              quaternion: target.quaternion.toArray(),
              scale: target.scale.toArray(),
            },
          }
        : null;
      drag = null;
      return result;
    }

    function isDragging() {
      return !!drag;
    }

    function dispose() {
      scene.remove(root);
    }

    return {
      attach: attach,
      detach: detach,
      setMode: setMode,
      getMode: function () {
        return mode;
      },
      setSnap: setSnap,
      setOnChange: setOnChange,
      update: update,
      pointerDown: pointerDown,
      pointerMove: pointerMove,
      pointerUp: pointerUp,
      isDragging: isDragging,
      dispose: dispose,
      root: root,
    };
  }

  return { create: create };
})();
