/**
 * models/switch-factory.js
 * -------------------------------------------------
 * Interruptor de luz de parede: placa plástica envelhecida
 * (mesmo espírito "desgastado mas bem conservado" do resto
 * do cenário), dois parafusos de fixação, uma alavanca que
 * gira entre "para cima" (ligado) e "para baixo" (desligado)
 * ao ser acionada, e uma luzinha indicadora que acende fraca
 * só quando a luz está apagada (ajuda a localizar o
 * interruptor no escuro — detalhe comum em interruptores
 * antigos de verdade).
 *
 * Mesma convenção do resto do jogo (ver DoorFactory): o
 * interruptor "olha" para +Z no espaço local; quem posiciona
 * (scenes/corridor-scene.js) decide a rotação em Y para ele
 * encarar o corredor. `createSwitch` não sabe nada sobre a
 * luminária — só expõe seu próprio estado ligado/desligado
 * (`toggle`/`isOn`); quem monta a cena é responsável por
 * ligar isso à luminária de verdade (ver CorridorScene).
 *
 * `createSwitch` devolve, além do grupo 3D e da "outline"
 * principal (usada pelo InteractionSystem, ver
 * OutlineFactory), um `update` (anima a alavanca a cada
 * quadro) e um `toggle` (chamado pelo sistema de interação
 * quando o jogador aperta "Interagir" perto do interruptor).
 * -------------------------------------------------
 */

window.SwitchFactory = (function () {
  const PLATE_WIDTH = 0.09;
  const PLATE_HEIGHT = 0.15;
  const PLATE_DEPTH = 0.014;

  const BASE_WIDTH = PLATE_WIDTH * 0.6;
  const BASE_HEIGHT = PLATE_HEIGHT * 0.42;
  const BASE_DEPTH = 0.01;

  const SCREW_RADIUS = 0.006;
  const SCREW_LENGTH = 0.01;

  const LEVER_WIDTH = 0.022;
  const LEVER_LENGTH = 0.05;
  const LEVER_THICKNESS = 0.016;

  // Ângulos da alavanca em torno do próprio pivô (radianos). Como o
  // interruptor "olha" para +Z local, os dois ângulos ficam sempre
  // positivos de propósito — a ponta da alavanca sempre se afasta da
  // parede (nunca "afunda" nela): ligado fica quase na vertical (bem
  // rente à base), desligado tomba mais para frente e para baixo.
  const ANGLE_ON = 0.12;
  const ANGLE_OFF = 0.85;

  const TOGGLE_ANIM_DURATION = 0.18; // rápido, como um clique físico

  function createSwitch(materials) {
    const group = new THREE.Group();

    // ---------- Placa plástica (fixada na parede) ----------
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(PLATE_WIDTH, PLATE_HEIGHT, PLATE_DEPTH),
      materials.switchPlate
    );
    plate.position.z = PLATE_DEPTH / 2;
    group.add(plate);

    // Base/moldura do mecanismo, levemente saliente sobre a placa —
    // onde a alavanca fica de fato encaixada.
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(BASE_WIDTH, BASE_HEIGHT, BASE_DEPTH),
      materials.switchPlate
    );
    base.position.z = PLATE_DEPTH + BASE_DEPTH / 2;
    group.add(base);

    // ---------- Parafusos de fixação (mesmo metal escuro da maçaneta) ----------
    const screwGeo = new THREE.CylinderGeometry(
      SCREW_RADIUS,
      SCREW_RADIUS,
      SCREW_LENGTH,
      6
    );
    [PLATE_HEIGHT / 2 - 0.016, -PLATE_HEIGHT / 2 + 0.016].forEach(function (y) {
      const screw = new THREE.Mesh(screwGeo, materials.lampMetal);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(0, y, PLATE_DEPTH + SCREW_LENGTH / 2 - 0.004);
      group.add(screw);
    });

    // ---------- Alavanca (peça que realmente gira) ----------
    // Fica num sub-grupo próprio: gira inteira em torno do pivô (base
    // da alavanca), sem afetar o resto da peça. Sozinha entra numa
    // "casca" de contorno separada (ver mais abaixo) para acompanhar
    // corretamente o giro.
    const leverPivot = new THREE.Group();
    // Marca este sub-grupo (e tudo dentro dele) para ficar de fora da
    // casca de contorno principal — ver comentário no topo do
    // OutlineFactory sobre `userData.excludeFromOutline`. A alavanca
    // gira sozinha, então precisa da sua própria casca (montada logo
    // abaixo), senão o contorno da parte que se move ficaria "parado"
    // na pose original enquanto a alavanca gira.
    leverPivot.userData.excludeFromOutline = true;
    leverPivot.position.set(0, 0, PLATE_DEPTH + BASE_DEPTH * 0.55);
    group.add(leverPivot);

    const lever = new THREE.Mesh(
      new THREE.BoxGeometry(LEVER_WIDTH, LEVER_LENGTH, LEVER_THICKNESS),
      materials.switchPlate
    );
    // Desloca a peça para cima do próprio pivô, que fica na base dela.
    lever.position.y = LEVER_LENGTH / 2;
    leverPivot.add(lever);

    // ---------- Luzinha indicadora (acende quando a luz está apagada) ----------
    const indicatorMat = materials.switchIndicator.clone();
    const indicatorBaseColor = indicatorMat.color.clone();
    const indicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.005, 6, 6),
      indicatorMat
    );
    indicator.position.set(0, -PLATE_HEIGHT * 0.32, PLATE_DEPTH + 0.004);
    group.add(indicator);

    // ---------- Cascas de destaque ----------
    // Principal: cobre a placa, a base e os parafusos (tudo que não se
    // move) — é ela que o InteractionSystem usa para o raycast e para
    // decidir quando mostrar o contorno branco (ver comentário no topo
    // do arquivo e OutlineFactory).
    const outline = window.OutlineFactory.build(group, materials.outline);
    group.add(outline);

    // Secundária: só a alavanca, montada a partir do próprio
    // `leverPivot` e adicionada como filha dele — assim acompanha o
    // giro automaticamente (mesma técnica usada na gaveta da
    // escrivaninha, ver DeskFactory). Puramente visual: a interação
    // continua decidida só pela casca principal acima; a visibilidade
    // das duas é sincronizada no `update`, logo abaixo (mesmo padrão
    // das cortinas em WindowFactory).
    const leverOutline = window.OutlineFactory.build(leverPivot, materials.outline);
    leverPivot.add(leverOutline);

    // ---------- Estado / animação ----------
    let on = true;
    let progress = 1; // 0 = desligado, 1 = ligado

    function toggle() {
      on = !on;
    }

    function isOn() {
      return on;
    }

    function update(delta) {
      const target = on ? 1 : 0;
      const step = delta / TOGGLE_ANIM_DURATION;
      if (progress < target) {
        progress = Math.min(target, progress + step);
      } else if (progress > target) {
        progress = Math.max(target, progress - step);
      }
      const eased = progress * progress * (3 - 2 * progress);
      leverPivot.rotation.x = ANGLE_OFF + (ANGLE_ON - ANGLE_OFF) * eased;

      // Luzinha indicadora: acesa (quase) por completo quando desligado,
      // quase apagada quando ligado — mesma transição suave da alavanca.
      const glow = 1 - eased * 0.85;
      indicatorMat.color.copy(indicatorBaseColor).multiplyScalar(glow);

      // Mantém a casca da alavanca sincronizada com o destaque geral do
      // interruptor (ver comentário acima de `leverOutline`).
      leverOutline.visible = outline.visible;
    }

    return {
      group: group,
      outline: outline,
      toggle: toggle,
      isOn: isOn,
      update: update,
    };
  }

  return { createSwitch: createSwitch };
})();
