/**
 * scripts/hand-item.js
 * -------------------------------------------------
 * Objeto segurado na MAO DIREITA do jogador, em primeira pessoa —
 * hoje, a carta do Ravi (ver scripts/main.js e interface/inventory.js).
 *
 * Como funciona: o objeto e filho da propria camera (`camera.add`), e
 * nao um objeto solto no mundo. Isso resolve de uma vez tres coisas
 * que dariam trabalho de outro jeito:
 *  - ele acompanha a camera sem nenhum codigo de sincronia por quadro
 *    (nem posicao, nem rotacao, nem head bob);
 *  - a posicao/escala em relacao a tela e SEMPRE a mesma, entao da
 *    para ajustar uma vez e confiar em qualquer aparelho;
 *  - nunca atravessa a camera: fica cravado a 32 cm dela, bem dentro
 *    do campo de visao (o near plane do jogo e 0.05, ver
 *    scripts/main.js).
 *
 * Para a camera renderizar os proprios filhos, ela precisa fazer
 * parte do grafo da cena — por isso `create()` adiciona a camera a
 * cena caso ela ainda nao esteja la (nao muda absolutamente nada do
 * resto: a camera continua com a mesma posicao/rotacao de sempre,
 * escritas por scripts/player-controller.js).
 *
 * Desenho: material sem iluminacao (MeshBasicMaterial) e `fog: false`
 * de proposito. O corredor e escuro por design; um papel na mao
 * dependendo da luminaria do teto ficaria preto e ilegivel. Com uma
 * cor de base amarelada em vez de branco puro, a folha continua
 * discreta e coerente com a penumbra, sem brilhar. `depthTest: false`
 * + `renderOrder` alto garantem que ela nunca seja recortada por uma
 * parede quando o jogador encosta em um canto — o classico truque de
 * "viewmodel" de FPS.
 *
 * Uso:
 *   const hand = window.HandItem.create(camera, scene);
 *   hand.equip(); hand.unequip(); hand.isEquipped();
 *   hand.update(delta, elapsed);   // uma vez por quadro
 * -------------------------------------------------
 */

window.HandItem = (function () {
  // ---------- Enquadramento da carta na mao ----------
  // Valores em espaco da CAMERA: x positivo = para a direita da tela
  // (mao direita), y negativo = para baixo, z negativo = para frente.
  const POS_X = 0.115;
  const POS_Y = -0.125;
  const POS_Z = -0.32;

  // Rotacao: a folha nasce olhando para +Z (convencao do projeto), ou
  // seja, ja de frente para a camera. Os tres angulos abaixo apenas
  // inclinam o papel o suficiente para parecer segurado por uma mao,
  // e nao colado na tela — sem nunca deixar o texto de cabeca para
  // baixo nem em angulo desconfortavel de leitura.
  const ROT_X = -0.1;
  const ROT_Y = -0.22;
  const ROT_Z = 0.13;

  // Tamanho da folha na mao: grande o bastante para se ler que e uma
  // carta, pequena o bastante para nao tapar o corredor (ocupa cerca
  // de um terco da altura da tela).
  const NOTE_WIDTH = 0.15;

  // Cor de base da folha (multiplica a textura): papel na penumbra,
  // nunca branco estourado.
  const PAPER_TINT = 0xc6c0ae;

  // Animacao de equipar/guardar: a carta sobe do rodape da tela em vez
  // de aparecer do nada — mesmo tipo de transicao suave da gaveta, da
  // cortina e da bola (ver models/desk-factory.js e
  // scripts/ball-controller.js).
  const EQUIP_DURATION = 0.26; // segundos
  const EQUIP_DROP = 0.17;     // de quanto ela vem de baixo
  const EQUIP_TILT = 0.28;     // giro extra durante a subida

  function create(camera, scene) {
    // Camera dentro da cena: sem isso o three.js nem chega a visitar
    // os filhos dela na hora de desenhar (ver comentario no topo).
    if (scene && !camera.parent) {
      scene.add(camera);
    }

    const root = new THREE.Group();
    root.name = "item-na-mao";
    root.visible = false;
    camera.add(root);

    // O MESMO modelo 3D de carta do resto do jogo (a de dentro da
    // gaveta e a do pop-up de leitura saem desta mesma fabrica), so
    // que de uma face so: na mao a folha esta sempre virada para o
    // jogador, entao o verso seria desenhado a toa.
    const note = window.PaperNoteFactory.criar({
      largura: NOTE_WIDTH,
      amassado: 0.45,
      semente: 5,
      duasFaces: false,
      iluminacao: "basic",
      resolucao: "psx",
      psx: { resolucao: [320, 180] },
      // A fabrica pinta o material de branco puro assim que a textura
      // chega; este retorno de chamada roda logo depois disso, entao e
      // o lugar certo de devolver o tom de penumbra.
      aoCarregar: function (carregada) {
        carregada.materialFrente.color.setHex(PAPER_TINT);
      },
    });

    root.add(note.grupo);

    if (note.materialFrente) {
      note.materialFrente.fog = false;
      note.materialFrente.depthTest = false;
      note.materialFrente.depthWrite = false;
      note.materialFrente.color.setHex(PAPER_TINT);
      note.materialFrente.needsUpdate = true;
    }

    // Desenhada por ultimo e sem teste de profundidade: nenhuma parede
    // ou movel consegue recortar a carta da mao (ver topo do arquivo).
    note.grupo.traverse(function (object) {
      object.renderOrder = 999;
      object.frustumCulled = false;
    });

    let equipped = false;
    let progress = 0; // 0 = guardada, 1 = totalmente na mao

    function equip() {
      equipped = true;
      root.visible = true;
    }

    function unequip() {
      equipped = false;
    }

    function isEquipped() {
      return equipped;
    }

    // Chamada uma vez por quadro pelo loop principal.
    function update(delta, elapsed) {
      const target = equipped ? 1 : 0;
      const step = delta / EQUIP_DURATION;
      if (progress < target) {
        progress = Math.min(target, progress + step);
      } else if (progress > target) {
        progress = Math.max(target, progress - step);
      }

      if (progress === 0) {
        root.visible = false;
        return;
      }
      root.visible = true;

      const eased = progress * progress * (3 - 2 * progress);
      const missing = 1 - eased;

      // Balanco de respiracao: minusculo, so para a carta nao ficar
      // congelada na tela (mesmo espirito da respiracao da camera em
      // scripts/player-controller.js).
      const swayX = Math.sin(elapsed * 0.83) * 0.0035;
      const swayY = Math.sin(elapsed * 1.15) * 0.0045;
      const swayZ = Math.sin(elapsed * 0.67) * 0.012;

      root.position.set(
        POS_X + swayX,
        POS_Y + swayY - EQUIP_DROP * missing,
        POS_Z
      );
      root.rotation.set(
        ROT_X,
        ROT_Y,
        ROT_Z + swayZ - EQUIP_TILT * missing
      );
    }

    return {
      equip: equip,
      unequip: unequip,
      isEquipped: isEquipped,
      update: update,
      nota: note,
    };
  }

  return { create: create };
})();
