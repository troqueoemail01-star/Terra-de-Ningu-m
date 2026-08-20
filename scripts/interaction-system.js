/**
 * scripts/interaction-system.js
 * -------------------------------------------------
 * Sistema único de interação por "mira central": a cada
 * quadro, lança um raio a partir da câmera na direção
 * exata do centro da tela (para onde o jogador está
 * olhando) e verifica quais objetos interativos esse raio
 * atravessa.
 *
 * Entre os objetos dentro do alcance de interação, apenas
 * o que estiver realmente sob a mira — e, em caso de mais
 * de um, o mais próximo do jogador — recebe o contorno
 * branco. Nunca mais de um objeto fica em destaque ao
 * mesmo tempo, e mover a câmera para outro objeto transfere
 * o destaque imediatamente, já que tudo é recalculado do
 * zero a cada quadro.
 *
 * Qualquer objeto interativo (porta, cortina, gaveta,
 * telefone, ou qualquer outro que vier a ser adicionado no
 * futuro) participa deste mesmo sistema só por ter uma
 * "outline" (a casca branca já usada em todo o jogo — ver
 * DoorFactory/WindowFactory/DeskFactory/PhoneFactory): não
 * é preciso ensinar este arquivo a conhecer cada tipo novo
 * de objeto. A posição de cada item é lida diretamente da
 * própria "outline" a cada quadro (`getWorldPosition`), o
 * que também cobre automaticamente objetos que se movem
 * (a gaveta deslizando, a cortina) ou que estejam dentro de
 * grupos escalados (ver DESK_SCALE em DeskFactory).
 * -------------------------------------------------
 */

window.InteractionSystem = (function () {
  function create(items, range) {
    const raycaster = new THREE.Raycaster();
    const cameraPos = new THREE.Vector3();
    const itemPos = new THREE.Vector3();

    // Recebe a câmera (não mais x/z do jogador): é a partir dela que a
    // direção da mira e a posição para medir distância são calculadas.
    function update(camera) {
      camera.getWorldPosition(cameraPos);
      // (0, 0) em coordenadas normalizadas de tela = exatamente o
      // centro da tela, ou seja, a mira do jogador.
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);

      let targeted = null;
      let nearestDist = Infinity;

      items.forEach(function (item) {
        // Reseta todo mundo primeiro — só o vencedor (se houver) volta
        // a ficar visível mais abaixo. Isso garante que nunca mais de
        // um objeto fique destacado ao mesmo tempo.
        item.outline.visible = false;

        item.outline.getWorldPosition(itemPos);
        const dist = cameraPos.distanceTo(itemPos);
        if (dist > range) {
          return; // fora de alcance: nem entra na disputa pela mira
        }

        // Testa se o raio da mira realmente atravessa a "casca" deste
        // objeto (interseção real com a geometria, não uma aproximação
        // por distância/ângulo) — por isso só um objeto por vez pode
        // ganhar o destaque, mesmo quando há vários próximos uns dos
        // outros (ex.: gaveta e telefone na mesma escrivaninha).
        const hits = raycaster.intersectObject(item.outline, false);
        if (hits.length > 0 && dist < nearestDist) {
          nearestDist = dist;
          targeted = item;
        }
      });

      if (targeted) {
        targeted.outline.visible = true;
      }

      return targeted;
    }

    return { update: update };
  }

  return { create: create };
})();
