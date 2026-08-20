/**
 * scripts/house-world.js
 * -------------------------------------------------
 * O "mundo da casa": junta as zonas (hoje CORREDOR e MEU QUARTO) num
 * unico espaco 3D, sem apagar a separacao interna de cada uma.
 *
 * Duas responsabilidades, so isso:
 *
 *  1. `createTransform(placement)` - a conversao entre o espaco LOCAL
 *     de uma zona (as coordenadas em que ela foi desenhada, ver
 *     scenes/room-config.js) e o espaco do MUNDO (onde ela realmente
 *     fica, ver scenes/house-config.js). E o que permite o quarto
 *     continuar sendo escrito nas coordenadas dele mesmo, mas viver
 *     deslocado/girado dentro da casa. Usada por scenes/room-scene.js.
 *
 *  2. `create({ zones })` - o registro das zonas montadas: soma as
 *     listas de colisao e de interativos das duas numa lista unica
 *     (que e o que o jogador de fato usa, ja que ele anda pela casa
 *     inteira), chama o `update` de cada zona a cada quadro e sabe
 *     dizer em QUAL zona um ponto do mundo esta (usado, por exemplo,
 *     para o som de passos pegar a superficie certa e para a porta
 *     compartilhada saber se o jogador esta olhando ela do corredor ou
 *     de dentro do quarto).
 *
 * Contrato de cada zona: o objeto devolvido por CorridorScene.build /
 * RoomScene.build fala MUNDO na borda (solids, getSurfaceAt,
 * playerPos de update, sleepSpot) e continua fazendo as contas dele em
 * LOCAL por dentro. O corredor e a zona de referencia (fica na origem,
 * sem giro), entao para ele os dois espacos sao o mesmo.
 *
 * Nao renderiza nada, nao cria geometria, nao guarda estado de jogo:
 * so costura o que as cenas ja devolvem.
 * -------------------------------------------------
 */

window.HouseWorld = (function () {
  /**
   * Conversao local <-> mundo de uma zona. `placement` e
   * `{ x, z, rotationY }` (ver HouseConfig.zones).
   *
   * Mesma matematica do THREE.Object3D com `rotation.y`: um ponto
   * local (x, z) vira (x*cos + z*sin, -x*sin + z*cos) no espaco do pai,
   * e depois soma o deslocamento da zona. `toLocal` e o caminho
   * inverso. Assim, o grupo 3D da zona e as contas de colisao/audio
   * ficam sempre de acordo: um so lugar decide onde a zona esta.
   */
  function createTransform(placement) {
    const p = placement || {};
    const offsetX = p.x || 0;
    const offsetZ = p.z || 0;
    const yaw = p.rotationY || 0;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);

    function toWorld(x, z) {
      return {
        x: x * cos + z * sin + offsetX,
        z: -x * sin + z * cos + offsetZ,
      };
    }

    function toLocal(x, z) {
      const dx = x - offsetX;
      const dz = z - offsetZ;
      return {
        x: dx * cos - dz * sin,
        z: dx * sin + dz * cos,
      };
    }

    /**
     * Caixa de colisao (AABB {minX,maxX,minZ,maxZ}) do espaco local
     * para o do mundo. Converte os 4 cantos e pega os extremos: com
     * `rotationY` em multiplos de 90 graus (o unico caso usado pela
     * casa, ver HouseConfig) o resultado e EXATO, sem inflar nada.
     */
    function transformBox(box) {
      const corners = [
        toWorld(box.minX, box.minZ),
        toWorld(box.minX, box.maxZ),
        toWorld(box.maxX, box.minZ),
        toWorld(box.maxX, box.maxZ),
      ];
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (let i = 0; i < corners.length; i++) {
        minX = Math.min(minX, corners[i].x);
        maxX = Math.max(maxX, corners[i].x);
        minZ = Math.min(minZ, corners[i].z);
        maxZ = Math.max(maxZ, corners[i].z);
      }
      return { minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ };
    }

    // Yaw do jogador (mundo) para o yaw equivalente dentro da zona:
    // basta descontar o giro dela. Usado por scenes/room-scene.js para
    // entregar a posicao do jogador ja no espaco local a quem faz conta
    // com ela por dentro (hoje, a fisica da bola de futebol).
    function toLocalYaw(worldYaw) {
      return (worldYaw || 0) - yaw;
    }

    return {
      offsetX: offsetX,
      offsetZ: offsetZ,
      rotationY: yaw,
      toWorld: toWorld,
      toLocal: toLocal,
      transformBox: transformBox,
      toLocalYaw: toLocalYaw,
    };
  }

  /**
   * Registro das zonas montadas.
   *
   * `options.zones` e uma lista de
   *   { key, label, scene, bounds }
   * onde `scene` e o objeto devolvido por CorridorScene.build /
   * RoomScene.build e `bounds` e o retangulo que a zona ocupa no MUNDO
   * ({minX,maxX,minZ,maxZ}) - usado so para responder "em que comodo o
   * jogador esta".
   */
  function create(options) {
    const zones = ((options && options.zones) || []).slice();

    // Listas unicas do mundo: o jogador anda pela casa inteira, entao
    // colisao e interacao valem para tudo que esta carregado ao mesmo
    // tempo. Sao os MESMOS objetos das listas de cada cena (nenhuma
    // copia profunda), entao qualquer caixa de colisao que a propria
    // cena atualize por quadro - por exemplo a da porta compartilhada,
    // que abre e fecha - continua valendo aqui sem nenhum passo extra.
    const solids = [];
    const interactables = [];

    zones.forEach(function (zone) {
      const scene = zone.scene;
      if (!scene) {
        return;
      }
      (scene.solids || []).forEach(function (solid) {
        solids.push(solid);
      });
      (scene.interactables || []).forEach(function (item) {
        interactables.push(item);
      });
    });

    // Ultima zona valida em que o jogador esteve: se num quadro ele
    // estiver exatamente sobre uma divisoria (ou dentro da espessura de
    // uma parede), a resposta continua sendo a de antes em vez de virar
    // nula - nada pisca por causa de um caso de borda.
    let lastZone = zones[0] || null;

    function contains(bounds, x, z) {
      return (
        !!bounds &&
        x >= bounds.minX &&
        x <= bounds.maxX &&
        z >= bounds.minZ &&
        z <= bounds.maxZ
      );
    }

    function zoneAt(x, z) {
      for (let i = 0; i < zones.length; i++) {
        if (contains(zones[i].bounds, x, z)) {
          lastZone = zones[i];
          return zones[i];
        }
      }
      return lastZone;
    }

    function zoneKeyAt(x, z) {
      const zone = zoneAt(x, z);
      return zone ? zone.key : null;
    }

    function getZone(key) {
      for (let i = 0; i < zones.length; i++) {
        if (zones[i].key === key) {
          return zones[i];
        }
      }
      return null;
    }

    // Superficie sob o jogador (madeira/tapete, ver
    // audio/footstep-audio.js): pergunta a zona em que ele esta neste
    // instante. Cada cena responde nas coordenadas do MUNDO (ver o
    // contrato no topo deste arquivo), entao aqui nao ha conversao
    // nenhuma para fazer.
    function getSurfaceAt(x, z) {
      const zone = zoneAt(x, z);
      if (zone && zone.scene && zone.scene.getSurfaceAt) {
        return zone.scene.getSurfaceAt(x, z);
      }
      return "madeira";
    }

    // Um quadro de animacao do mundo inteiro: TODAS as zonas animam
    // sempre, nao so a que o jogador esta - e o que faz a cortina, o
    // ventilador do quarto e a folha da porta continuarem se movendo
    // enquanto ele olha de longe, do outro comodo.
    function update(delta, elapsed, playerPos, playerRadius) {
      for (let i = 0; i < zones.length; i++) {
        const scene = zones[i].scene;
        if (scene && scene.update) {
          scene.update(delta, elapsed, playerPos, playerRadius);
        }
      }
    }

    // Noite <-> dia da casa inteira de uma vez (ver
    // scripts/atmosphere.js e o `setDaytime` de cada cena).
    function setDaytime(daytime) {
      for (let i = 0; i < zones.length; i++) {
        const scene = zones[i].scene;
        if (scene && scene.setDaytime) {
          scene.setDaytime(daytime);
        }
      }
    }

    return {
      zones: zones,
      solids: solids,
      interactables: interactables,
      getZone: getZone,
      zoneAt: zoneAt,
      zoneKeyAt: zoneKeyAt,
      getSurfaceAt: getSurfaceAt,
      update: update,
      setDaytime: setDaytime,
    };
  }

  return {
    createTransform: createTransform,
    create: create,
  };
})();
