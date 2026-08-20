/**
 * models/roof-factory.js
 * -------------------------------------------------
 * O TELHADO da casa: a unica peca do jogo que existe SO para ser vista
 * de fora. Ate aqui ele era a silhueta certa feita de LAMINAS DE
 * ESPESSURA ZERO - uma agua era um plano, e vista de lado (ou de perto,
 * no modo VOO do Editor) aparecia como uma folha de papel dobrada, com
 * a borda do beiral sumindo dependendo do angulo. Esta atualizacao
 * mexeu SO no telhado e trocou essas laminas por PECAS COM VOLUME, na
 * mesma planta, na mesma silhueta e com as mesmas alturas de cumeeira
 * de antes.
 *
 * ---------- Regra numero um: nada entra em comodo nenhum ----------
 * TODA a geometria daqui nasce em `eaveY` = CorridorConfig.height +
 * LIFT, ou seja, ACIMA do forro de todos os comodos (que fica exatamente
 * em `height`), e dali so sobe: a espessura da agua (DECK) e somada para
 * CIMA, nunca para baixo. As unicas pecas que descem abaixo dessa linha
 * sao as que ficam penduradas nas PONTAS do beiral e do oitao
 * (testeira, labio da ponta, caibros aparentes, tabuas de oitao) e
 * TODAS elas nascem no minimo OUT_CLEAR metros para FORA da face
 * externa da parede em que avancam, no ar livre.
 *
 * E, para nao depender de mim ter feito a conta certa, o arquivo tem uma
 * TRAVA no fim (ver `guardRooms`): antes de virar malha, cada vertice
 * que estiver abaixo de `eaveY` E dentro do retangulo de algum comodo e
 * levantado de volta para `eaveY` e a ocorrencia sai no console. Se um
 * dia alguem mexer numa medida da planta e o telhado passar a invadir um
 * comodo, o jogo NAO mostra o furo - ele conserta e avisa.
 *
 * ---------- A planta que o telhado cobre (nao mudou) ----------
 * Nada e escrito na mao aqui: as medidas saem de CorridorConfig,
 * RoomConfig e HouseConfig, os mesmos dados que constroem os comodos
 * (ver scenes/house-config.js). Mexer na planta la muda o telhado aqui
 * sem tocar neste arquivo.
 *
 *   CORPO PRINCIPAL ("spine"): corredor + MEU QUARTO, a faixa x de -3 a
 *   +3, z de -22 a +6. Duas aguas, cumeeira correndo em Z sobre x = 0 (a
 *   mais alta da casa), oitoes fechando as duas pontas.
 *
 *   ALAS ("wings"): os quatro comodos laterais, dois de cada lado do
 *   corredor. Cada lado vira UMA ala continua (QUARTO 01 + QUARTO 02 a
 *   esquerda, COZINHA + BANHEIRO a direita), com duas aguas e cumeeira
 *   propria, mais baixa que a do corpo principal - e o que da o
 *   escalonamento de alturas da referencia enviada.
 *
 *        vista de topo                       corte transversal
 *   +----+------------+----+            /\  <- cumeeira do corpo
 *   |ALA |   CORPO    |ALA |         /\/  \/\  <- cumeeiras das alas
 *   |    |  PRINCIPAL |    |        /  |    |  \
 *   +----+------------+----+       ALA |CORR| ALA
 *
 * ---------- O que esta atualizacao acrescentou ----------
 * Sete camadas de detalhe, todas construidas PARA CIMA a partir das
 * mesmas linhas de antes:
 *
 *  1. ESPESSURA (DECK): cada agua agora e uma laje fechada - face de
 *     cima (telha), face de baixo (o forro que se ve de baixo do beiral)
 *     e tampas fechando as bordas. Fim da "folha de papel".
 *  2. FIADAS EM DEGRAU: reguas atravessadas de metro em metro subindo a
 *     agua, cada uma sobrando um labio sobre a de baixo - a sombra
 *     horizontal marcada da referencia. Sao quebradas em trechos ao
 *     longo de Z com uma variacao propria (e algumas telhas faltando),
 *     entao a fiada nao vira uma linha reta de lado a lado.
 *  3. CUMEEIRA DE PECAS: a cumeeira deixou de ser uma caixa comprida e
 *     virou uma fila de capas curtas, cada uma torta um tico, apoiadas
 *     numa tabua continua (a tabua garante que nenhuma fresta apareca
 *     entre as capas).
 *  4. BEIRAL DE VERDADE: labio grosso na ponta, testeira alta atras dele
 *     e CAIBROS APARENTES saindo da parede - sempre do lado de fora da
 *     fachada.
 *  5. OITOES COM ESTRUTURA: as tabuas do oitao ganharam friso embaixo,
 *     tabuas correndo na inclinacao, pendural no meio, travessa
 *     horizontal e, nas duas pontas do corpo principal, um respiro de
 *     tres reguas.
 *  6. RINCAO ARREMATADO: no encontro da agua da ala com a do corpo
 *     principal, duas reguas formam a calha do rincao. As duas aguas ja
 *     chegavam na MESMA linha (mesmo x, mesmo y); agora esse encontro
 *     tem peca cobrindo, como na obra.
 *  7. FIM DO "DEGRAU SOLTO": onde a agua do corpo principal morre no
 *     telhado da ala, a laje e fechada com a face do degrau e uma tabua
 *     de arremate. Era esse pedaco que aparecia como uma aba solta
 *     flutuando no ar.
 *
 * ---------- Custo de desenho: o mesmo de antes ----------
 * Continuam sendo TRES malhas (aguas, oitoes, arremates), os mesmos
 * nomes de antes para o Editor nao perder o telhado
 * (editor/editor-registry.js), os mesmos tres materiais de
 * materials/material-library.js e nenhum material novo. Todo o detalhe
 * novo entra dentro dessas tres malhas, entao o telhado inteiro continua
 * custando 3 draw calls - que e o que um jogo mobile pede.
 *
 * UV medido em METROS (TEX_SCALE = metros por repeticao da textura),
 * entao a telha tem a mesma escala em todas as aguas, independente do
 * tamanho de cada uma.
 * -------------------------------------------------
 */

window.RoofFactory = (function () {
  // ---------------------------------------------------------------
  // MEDIDAS DA PLANTA (as mesmas de antes - a silhueta nao mudou)
  // ---------------------------------------------------------------

  // Espessura de parede do jogo, igual a de scenes/room-scene.js e
  // scenes/side-room-scene.js: e ela que diz onde esta a face EXTERNA
  // de cada parede, ou seja, ate onde o telhado precisa cobrir.
  const WALL_THICKNESS = 0.3;

  // Quanto a linha do beiral nasce acima do topo das paredes (que e o
  // proprio pe-direito, CorridorConfig.height). Pequeno de proposito:
  // so o bastante para nenhuma agua encostar no forro dos comodos por
  // erro de arredondamento. A folga fica escondida pelo avanco do
  // beiral, que passa na frente dela vista de baixo.
  const LIFT = 0.05;

  // Altura da cumeeira em relacao a linha do beiral. O corpo principal
  // sobe mais que as alas (2.1 contra 1.45): as duas cumeeiras ficam em
  // niveis diferentes, com a da ala encostando na agua do corpo
  // principal bem abaixo do topo dele - o telhado escalonado da imagem
  // de referencia.
  const MAIN_RISE = 2.1;
  const WING_RISE = 1.45;

  // Avanco do beiral (quanto a agua passa da parede) e do oitao (quanto
  // ela passa da parede de ponta). Iguais para o telhado ler como uma
  // peca unica.
  const EAVE_OVERHANG = 0.55;
  const RAKE_OVERHANG = 0.55;

  // ---------------------------------------------------------------
  // ESPESSURA E FOLGAS (o que esta atualizacao trouxe)
  // ---------------------------------------------------------------

  // Espessura da agua, medida na VERTICAL e somada sempre PARA CIMA da
  // linha antiga: a face de baixo da laje e exatamente o plano que o
  // telhado antigo tinha, e o telhado novo cresce por fora dele. E o que
  // garante, por construcao, que engrossar o telhado nao empurrou
  // NENHUM triangulo na direcao do forro dos comodos.
  const DECK = 0.16;

  // Folga minima para FORA da face externa de uma parede antes de
  // qualquer peca ter permissao de descer abaixo de eaveY. A casca
  // externa da casa fica 2 cm para fora do plano da parede
  // (CLADDING_GAP em models/exterior-factory.js), entao 6 cm deixa 4 cm
  // de ar entre a peca e a fachada - longe o bastante para nao empatar
  // em profundidade nem com o wobble de vertice da estetica PSX.
  const OUT_CLEAR = 0.06;

  // ---------- Fiadas (o degrau horizontal da telha) ----------
  const COURSE_STEP = 0.46;   // distancia de uma fiada para a outra, subindo a agua
  const COURSE_FIRST = 0.14;  // onde comeca a primeira fiada, contada da ponta do beiral
  const COURSE_LIP = 0.05;    // quanto a fiada sobra por cima da de baixo
  const COURSE_BUTT = 0.15;   // largura da regua, no sentido da inclinacao
  const COURSE_CHUNK = 1.75;  // comprimento de cada trecho de fiada, em Z
  const COURSE_GAP = 0.05;    // fresta entre dois trechos da mesma fiada
  const COURSE_MISSING = 0.045; // fatia dos trechos que nasce faltando (telha caida)
  // Onde as fiadas comecam quando a borda de baixo da agua e um RINCAO e
  // nao um beiral: as duas primeiras fiadas dariam de cara com a calha do
  // rincao, entao elas comecam depois dela.
  const VALLEY_CLEAR = 0.36;

  // ---------- Beiral ----------
  const EAVE_LIP_W = 0.1;     // largura do labio grosso da ponta
  const EAVE_LIP_EXTRA = 0.07; // quanto ele engrossa a ponta, alem de DECK
  const FASCIA_H = 0.26;      // altura da testeira (a tabua vertical atras do labio)
  const FASCIA_D = 0.13;      // espessura dela
  const RAFTER_STEP = 0.82;   // de quantos em quantos metros sai um caibro
  const RAFTER_W = 0.11;      // largura do caibro
  const RAFTER_DROP = 0.14;   // quanto ele desce abaixo da laje

  // ---------- Oitao ----------
  const RAKE_H = 0.24;        // altura da tabua de oitao (barge board)
  const RAKE_D = 0.14;        // espessura dela
  const RAKE_MOLD_H = 0.09;   // a moldura fininha por baixo da tabua
  const RAKE_MOLD_D = 0.22;
  // Onde a tabua de oitao da ala para, antes de chegar no rincao: sem
  // isso ela terminaria em cima do forro do corredor. Mesma solucao da
  // obra real - a tabua morre no encontro com o telhado vizinho.
  const RAKE_STOP = 0.5;
  const GABLE_BOARD_H = 0.16; // tabuas correndo na inclinacao, no plano do oitao
  const GABLE_FRIEZE_H = 0.18; // friso horizontal no pe do oitao
  const GABLE_OUT = 0.06;     // quanto o arremate do oitao fica para fora do plano dele
  const GABLE_POST_W = 0.14;  // pendural (a peca vertical do meio)
  const GABLE_TIE_H = 0.13;   // travessa horizontal

  // ---------- Cumeeira ----------
  const RIDGE_W = 0.44;        // largura de cada capa
  const RIDGE_H = 0.2;         // altura dela
  const RIDGE_BOARD_W = 0.3;   // tabua continua por baixo das capas
  const RIDGE_BOARD_H = 0.12;
  const CAP_LEN = 0.62;        // comprimento de cada capa
  const CAP_GAP = 0.04;        // fresta entre duas capas

  // ---------- Rincao ----------
  const VALLEY_W = 0.26;       // largura da regua de cada lado da calha
  const VALLEY_LIP = 0.055;    // quanto ela sobe da agua

  // Metros de mundo por repeticao da textura (ver o topo do arquivo).
  const TEX_SCALE = 2.2;

  // Trava anti-invasao (ver `guardRooms` e o topo do arquivo): quanto o
  // retangulo de cada comodo e encolhido antes do teste. Existe para que
  // uma peca que ENCOSTA na parede (x = +-3, por exemplo) nao seja
  // acusada de estar dentro do comodo por erro de ponto flutuante.
  const GUARD_INSET = 0.04;

  function v(x, y, z) {
    return { x: x, y: y, z: z };
  }

  // Ponto no CORTE do telhado (x, y): quase toda a geometria daqui e um
  // perfil desenhado nesse corte e depois esticado ao longo de Z - e por
  // isso que cumeeiras, fiadas, testeiras e caibros saem todos de
  // caixas giradas so em Z.
  function p2(x, y) {
    return { x: x, y: y };
  }

  function normalized(vec) {
    const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z) || 1;
    return v(vec.x / len, vec.y / len, vec.z / len);
  }

  // Sorteio ESTAVEL: mesma entrada, mesmo numero, sempre. Nao uso
  // Math.random porque o telhado seria diferente a cada carregamento do
  // jogo (e o Editor guarda posicao por nome - ver
  // editor/editor-overrides.js). Aqui a "bagunca" das fiadas e das capas
  // de cumeeira e assinada pelo indice da peca, entao e sempre a mesma
  // bagunca.
  function noise(seed) {
    const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // Base de uma rampa do corte: direcao ao longo da inclinacao (`u`), a
  // perpendicular que aponta para FORA do telhado (`n`, sempre com y
  // positivo, porque a face de cima de uma agua olha para cima),
  // comprimento e o angulo que gira as caixas de arremate.
  function slopeFrame(low, high) {
    const dx = high.x - low.x;
    const dy = high.y - low.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const u = p2(dx / len, dy / len);
    let n = p2(u.y, -u.x);
    if (n.y < 0) {
      n = p2(-n.x, -n.y);
    }
    return { u: u, n: n, len: len, angle: Math.atan2(dy, dx) };
  }

  // Altura da rampa num x qualquer (interpolacao simples: nenhuma agua
  // do jogo e vertical, entao x serve de parametro).
  function yAtX(low, high, x) {
    const dx = high.x - low.x;
    if (Math.abs(dx) < 1e-6) {
      return low.y;
    }
    return low.y + ((high.y - low.y) * (x - low.x)) / dx;
  }

  /**
   * Acumulador de geometria: recebe poligonos planos (quads e
   * triangulos) e devolve UMA BufferGeometry no fim. UV por projecao
   * nos eixos que o proprio chamador informa, medido em metros e
   * dividido por TEX_SCALE - e o que mantem a telha na mesma escala em
   * aguas de tamanhos diferentes.
   */
  function createBuilder() {
    const positions = [];
    const uvs = [];

    function pushVertex(p, origin, uAxis, vAxis) {
      positions.push(p.x, p.y, p.z);
      const dx = p.x - origin.x;
      const dy = p.y - origin.y;
      const dz = p.z - origin.z;
      uvs.push(
        (dx * uAxis.x + dy * uAxis.y + dz * uAxis.z) / TEX_SCALE,
        (dx * vAxis.x + dy * vAxis.y + dz * vAxis.z) / TEX_SCALE
      );
    }

    // Poligono convexo em leque (fan): serve para os quads das aguas e
    // para os triangulos dos oitoes sem nenhum caso especial.
    function addPoly(points, uAxis, vAxis) {
      const origin = points[0];
      for (let i = 1; i < points.length - 1; i++) {
        pushVertex(points[0], origin, uAxis, vAxis);
        pushVertex(points[i], origin, uAxis, vAxis);
        pushVertex(points[i + 1], origin, uAxis, vAxis);
      }
    }

    // Caixa (as pecas de arremate), opcionalmente girada em Z - e o giro
    // que deita a tabua na inclinacao da agua, no caso das testeiras de
    // oitao, das fiadas e dos caibros.
    function addBox(center, size, rotZ) {
      const c = Math.cos(rotZ || 0);
      const s = Math.sin(rotZ || 0);
      const ax = v(c, s, 0);
      const ay = v(-s, c, 0);
      const az = v(0, 0, 1);
      const hx = size.x / 2;
      const hy = size.y / 2;
      const hz = size.z / 2;

      function corner(sx, sy, sz) {
        return v(
          center.x + ax.x * sx * hx + ay.x * sy * hy,
          center.y + ax.y * sx * hx + ay.y * sy * hy,
          center.z + sz * hz
        );
      }

      addPoly([corner(1, -1, -1), corner(1, -1, 1), corner(1, 1, 1), corner(1, 1, -1)], az, ay);
      addPoly([corner(-1, -1, 1), corner(-1, -1, -1), corner(-1, 1, -1), corner(-1, 1, 1)], az, ay);
      addPoly([corner(-1, 1, -1), corner(1, 1, -1), corner(1, 1, 1), corner(-1, 1, 1)], ax, az);
      addPoly([corner(-1, -1, 1), corner(1, -1, 1), corner(1, -1, -1), corner(-1, -1, -1)], ax, az);
      addPoly([corner(-1, -1, 1), corner(-1, 1, 1), corner(1, 1, 1), corner(1, -1, 1)], ax, ay);
      addPoly([corner(1, -1, -1), corner(1, 1, -1), corner(-1, 1, -1), corner(-1, -1, -1)], ax, ay);
    }

    /**
     * A TRAVA anti-invasao (ver o topo do arquivo). Percorre os vertices
     * ja acumulados e, se algum estiver ABAIXO de `minY` e DENTRO do
     * retangulo de algum comodo, sobe ele de volta para `minY`. Devolve
     * quantos consertou.
     *
     * Nao e o mecanismo que mantem o telhado fora dos comodos - isso e
     * feito pela forma como a geometria e montada (espessura somada para
     * cima, pecas penduradas so do lado de fora das paredes). E a rede de
     * seguranca: se um dia a planta mudar em scenes/house-config.js e o
     * telhado passar a cruzar um comodo, o jogador nao ve o furo.
     */
    function guard(minY, rects) {
      let fixed = 0;
      for (let i = 0; i < positions.length; i += 3) {
        const y = positions[i + 1];
        if (y >= minY - 1e-6) {
          continue;
        }
        const x = positions[i];
        const z = positions[i + 2];
        for (let r = 0; r < rects.length; r++) {
          const rect = rects[r];
          if (x > rect.minX && x < rect.maxX && z > rect.minZ && z < rect.maxZ) {
            positions[i + 1] = minY;
            fixed++;
            break;
          }
        }
      }
      return fixed;
    }

    function toGeometry() {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.computeVertexNormals();
      return geo;
    }

    return {
      addPoly: addPoly,
      addBox: addBox,
      guard: guard,
      toGeometry: toGeometry,
      isEmpty: function () {
        return positions.length === 0;
      },
    };
  }

  /**
   * A planta do telhado, derivada dos dados dos comodos - nenhum numero
   * de posicao escrito na mao (ver o topo do arquivo).
   */
  function plan(options) {
    const opts = options || {};
    const cfg = opts.corridorConfig || window.CorridorConfig;
    const roomCfg = opts.roomConfig || window.RoomConfig;
    const houseCfg = opts.houseConfig || window.HouseConfig;

    const halfW = cfg.width / 2;
    const eaveY = cfg.height + LIFT;

    // MEU QUARTO fica do outro lado da parede z = 0 do corredor, girado
    // 180 graus, entao o interior dele cresce para +Z: a parede de fundo
    // (e o fim do corpo principal) cai em placement.z + RoomConfig.size
    // (ver scenes/house-config.js).
    const quartoPlacement =
      (houseCfg &&
        houseCfg.zones &&
        houseCfg.zones.quarto &&
        houseCfg.zones.quarto.placement) || { z: 0 };
    const quartoDepth = (roomCfg && roomCfg.size) || 0;

    const spine = {
      halfW: halfW,
      minZ: -cfg.length,
      maxZ: (quartoPlacement.z || 0) + quartoDepth,
      ridgeY: eaveY + MAIN_RISE,
      slope: MAIN_RISE / halfW,
    };

    // Uma ala por lado do corredor, engolindo TODOS os comodos daquele
    // lado de uma vez (inclusive a divisoria entre eles): um telhado por
    // comodo deixaria um sulco entre os dois, que nao e o que a
    // referencia mostra.
    const sideRooms = (houseCfg && houseCfg.sideRooms) || [];
    const wings = [];
    // Retangulos INTERNOS dos comodos, em coordenadas de mundo: e com
    // eles que a trava anti-invasao trabalha (ver `guardRooms`).
    const rooms = [
      { minX: -halfW, maxX: halfW, minZ: -cfg.length, maxZ: spine.maxZ },
    ];

    ["left", "right"].forEach(function (side) {
      const list = sideRooms.filter(function (room) {
        return room.side === side;
      });
      if (!list.length) {
        return;
      }

      const sign = side === "left" ? -1 : 1;
      let minZ = Infinity;
      let maxZ = -Infinity;
      let depth = 0;

      list.forEach(function (room) {
        // Face EXTERNA das paredes de ponta: o plano da parede fica em
        // center +- length/2 e a espessura dela cresce para fora (ver os
        // solids em scenes/side-room-scene.js).
        const halfLen = room.length / 2 + WALL_THICKNESS;
        minZ = Math.min(minZ, room.center - halfLen);
        maxZ = Math.max(maxZ, room.center + halfLen);
        depth = Math.max(depth, room.depth);

        // O retangulo do comodo em si (ate o PLANO das paredes, nao ate a
        // face externa delas) para a trava anti-invasao.
        rooms.push({
          minX: sign < 0 ? -(halfW + room.depth) : halfW,
          maxX: sign < 0 ? -halfW : halfW + room.depth,
          minZ: room.center - room.length / 2,
          maxZ: room.center + room.length / 2,
        });
      });

      wings.push({
        key: side,
        sign: sign,
        minZ: minZ,
        maxZ: maxZ,
        depth: depth,
        innerX: sign * halfW,
        outerX: sign * (halfW + depth),
        ridgeX: sign * (halfW + depth / 2),
        ridgeY: eaveY + WING_RISE,
        slope: WING_RISE / (depth / 2),
      });
    });

    return { eaveY: eaveY, spine: spine, wings: wings, rooms: rooms };
  }

  function wingFor(wings, sign) {
    for (let i = 0; i < wings.length; i++) {
      if (wings[i].sign === sign) {
        return wings[i];
      }
    }
    return null;
  }

  /**
   * Os trechos de uma agua do corpo principal ao longo de Z. Onde a ala
   * encosta (contando o avanco de oitao dela), o beiral do corpo
   * principal PARA na parede (overhang 0): e o rincao. Fora dali, ele
   * avanca normalmente.
   */
  function segmentsFor(z0, z1, wing) {
    if (!wing) {
      return [{ z0: z0, z1: z1, overhang: EAVE_OVERHANG }];
    }

    const from = Math.max(z0, wing.minZ - RAKE_OVERHANG);
    const to = Math.min(z1, wing.maxZ + RAKE_OVERHANG);
    const segments = [];

    if (from > z0) {
      segments.push({ z0: z0, z1: from, overhang: EAVE_OVERHANG });
    }
    segments.push({ z0: from, z1: to, overhang: 0 });
    if (to < z1) {
      segments.push({ z0: to, z1: z1, overhang: EAVE_OVERHANG });
    }

    return segments.filter(function (seg) {
      return seg.z1 - seg.z0 > 0.001;
    });
  }

  // ---------------------------------------------------------------
  // AS PECAS. Todas desenhadas no corte (x, y) e esticadas ao longo de
  // Z - ver p2() la em cima. Nenhuma delas escreve numero de posicao:
  // recebem a rampa (`low` -> `high`) e o trecho de Z e se resolvem.
  // ---------------------------------------------------------------

  /**
   * Uma AGUA com volume: face de cima (a telha), face de baixo (o forro
   * que se ve por baixo do beiral) e as tampas das bordas. A espessura
   * DECK e somada na VERTICAL e sempre PARA CIMA, entao a face de baixo
   * desta laje e exatamente o plano que o telhado antigo tinha.
   *
   * As tampas sao opcionais porque quase toda borda deste telhado morre
   * dentro de outra peca: no topo, as duas aguas se encontram na mesma
   * linha (nao ha o que tampar, e duas tampas coincidentes brigariam por
   * profundidade); no rincao, a agua da ala continua de onde a do corpo
   * principal para.
   *
   * `capZ0`/`capZ1` aceitam:
   *   "full"            - fecha a ponta inteira (a borda de oitao)
   *   { from:, to: }    - fecha SO a faixa entre dois x: e o DEGRAU, onde
   *                       uma agua larga morre contra uma mais estreita
   *   false             - nao fecha
   */
  function addSlab(builder, low, high, z0, z1, opts) {
    const o = opts || {};
    const f = slopeFrame(low, high);
    const along = v(f.u.x, f.u.y, 0);
    const zAxis = v(0, 0, 1);
    const xAxis = v(1, 0, 0);
    const yAxis = v(0, 1, 0);

    // Telha (face de cima).
    builder.addPoly(
      [
        v(low.x, low.y + DECK, z0),
        v(low.x, low.y + DECK, z1),
        v(high.x, high.y + DECK, z1),
        v(high.x, high.y + DECK, z0),
      ],
      zAxis,
      along
    );

    // Forro (face de baixo) - e o plano antigo do telhado, intacto.
    builder.addPoly(
      [
        v(low.x, low.y, z0),
        v(high.x, high.y, z0),
        v(high.x, high.y, z1),
        v(low.x, low.y, z1),
      ],
      zAxis,
      along
    );

    if (o.capLow !== false) {
      builder.addPoly(
        [
          v(low.x, low.y, z0),
          v(low.x, low.y + DECK, z0),
          v(low.x, low.y + DECK, z1),
          v(low.x, low.y, z1),
        ],
        zAxis,
        yAxis
      );
    }

    if (o.capHigh) {
      builder.addPoly(
        [
          v(high.x, high.y, z0),
          v(high.x, high.y + DECK, z0),
          v(high.x, high.y + DECK, z1),
          v(high.x, high.y, z1),
        ],
        zAxis,
        yAxis
      );
    }

    [
      { z: z0, mode: o.capZ0 },
      { z: z1, mode: o.capZ1 },
    ].forEach(function (end) {
      if (!end.mode) {
        return;
      }
      let xa = low.x;
      let xb = high.x;
      if (end.mode !== "full" && end.mode !== true) {
        xa = end.mode.from;
        xb = end.mode.to;
      }
      const ya = yAtX(low, high, xa);
      const yb = yAtX(low, high, xb);
      builder.addPoly(
        [
          v(xa, ya, end.z),
          v(xb, yb, end.z),
          v(xb, yb + DECK, end.z),
          v(xa, ya + DECK, end.z),
        ],
        xAxis,
        yAxis
      );
    });
  }

  /**
   * As FIADAS: reguas atravessadas subindo a agua, cada uma sobrando um
   * labio por cima da de baixo. E o detalhe que mais aparece na imagem de
   * referencia - a telha lida como camadas empilhadas, nao como uma chapa
   * lisa.
   *
   * Cada fiada e quebrada em trechos ao longo de Z, com labio, deslocamento
   * e ausencia sorteados de forma ESTAVEL (ver noise()): assim a linha da
   * fiada nao atravessa o telhado reta de ponta a ponta, e algumas telhas
   * nascem faltando - casa velha, nao casa nova.
   */
  function addCourses(builder, low, high, z0, z1, opts) {
    const o = opts || {};
    const f = slopeFrame(low, high);
    const start = typeof o.start === "number" ? o.start : COURSE_FIRST;
    const seed = o.seed || 1;
    const zLen = z1 - z0;
    if (zLen <= 0.05) {
      return;
    }

    const chunks = Math.max(1, Math.round(zLen / COURSE_CHUNK));
    const chunkLen = zLen / chunks;
    let row = 0;

    for (let s = start; s < f.len - 0.16; s += COURSE_STEP) {
      row++;
      for (let c = 0; c < chunks; c++) {
        const h = noise(seed * 7.3 + row * 3.1 + c * 1.7);
        // Telha faltando: o trecho simplesmente nao nasce.
        if (h < COURSE_MISSING) {
          continue;
        }
        const lip = COURSE_LIP * (0.7 + 0.6 * h);
        const slide = (noise(seed * 2.9 + row * 5.7 + c * 0.9) - 0.5) * 0.05;
        const cz0 = z0 + c * chunkLen + COURSE_GAP / 2;
        const cz1 = z0 + (c + 1) * chunkLen - COURSE_GAP / 2;
        const px = low.x + f.u.x * (s + slide) + f.n.x * (lip / 2);
        const py = low.y + DECK + f.u.y * (s + slide) + f.n.y * (lip / 2);
        builder.addBox(
          v(px, py, (cz0 + cz1) / 2),
          v(COURSE_BUTT, lip, cz1 - cz0),
          f.angle
        );
      }
    }
  }

  /**
   * O BEIRAL: o labio grosso da ponta (a espessura que se ve de longe), a
   * testeira alta logo atras dele e os caibros aparentes saindo da
   * parede.
   *
   * `wallX` e o plano da parede que este beiral avanca. Os caibros so
   * nascem depois de `wallX + OUT_CLEAR + RAFTER_DROP` (a folga conta a
   * espessura do proprio caibro, senao a quina de baixo dele entraria na
   * parede) e vao ate a ponta - ou seja, sempre no ar
   * livre, do lado de FORA da fachada. Sem esse cuidado eles entrariam na
   * parede e apareceriam por dentro do comodo, abaixo do forro.
   */
  function addEaveDetail(shingles, trim, low, high, z0, z1, sign, wallX) {
    const zc = (z0 + z1) / 2;
    const zl = z1 - z0;
    if (zl <= 0.05) {
      return;
    }

    // Labio da ponta - na malha das AGUAS, para a ponta do beiral ficar
    // da cor da telha e nao da madeira dos arremates.
    shingles.addBox(
      v(low.x, low.y + DECK / 2, zc),
      v(EAVE_LIP_W, DECK + EAVE_LIP_EXTRA, zl),
      0
    );

    // Testeira: tabua vertical logo atras do labio. A parte de cima dela
    // fica enterrada na laje (de proposito: nenhuma fresta), e o que
    // aparece e a faixa pendurada abaixo da agua.
    trim.addBox(
      v(low.x - (sign * FASCIA_D) / 2, low.y + DECK - FASCIA_H / 2, zc),
      v(FASCIA_D, FASCIA_H, zl),
      0
    );

    if (typeof wallX !== "number") {
      return;
    }

    const f = slopeFrame(low, high);
    const xStart = wallX + sign * (OUT_CLEAR + RAFTER_DROP);
    const xEnd = low.x;
    if ((xEnd - xStart) * sign <= 0.05) {
      return;
    }

    const yStart = yAtX(low, high, xStart);
    const dx = xEnd - xStart;
    const dy = low.y - yStart;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const midX = (xStart + xEnd) / 2 - f.n.x * (RAFTER_DROP / 2 - 0.01);
    const midY = (yStart + low.y) / 2 - f.n.y * (RAFTER_DROP / 2 - 0.01);

    const count = Math.max(1, Math.floor(zl / RAFTER_STEP));
    const step = zl / count;
    for (let i = 0; i < count; i++) {
      trim.addBox(
        v(midX, midY, z0 + step * (i + 0.5)),
        v(len, RAFTER_DROP, RAFTER_W),
        angle
      );
    }
  }

  /**
   * A TABUA DE OITAO (barge board) pendurada na borda inclinada da agua,
   * mais a moldura fininha por baixo dela. Duas pecas em vez de uma
   * porque e o degrau entre as duas que da a sombra grossa da borda na
   * referencia.
   *
   * `outward` (-1 ou +1) diz para que lado de Z a tabua fica: sempre para
   * FORA do telhado, nunca para dentro.
   * `stopLow` encurta a tabua na ponta de baixo - e o que faz a tabua do
   * oitao da ala morrer antes de chegar no rincao (ver RAKE_STOP).
   */
  function addRakeBoards(trim, low, high, z, outward, stopLow) {
    const f = slopeFrame(low, high);
    let ax = low.x;
    let ay = low.y;
    if (stopLow > 0) {
      const cut = Math.min(stopLow, f.len * 0.6);
      ax += f.u.x * cut;
      ay += f.u.y * cut;
    }
    const dx = high.x - ax;
    const dy = high.y - ay;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.25) {
      return;
    }

    // DECK e vertical; o que interessa aqui e quanto ela vale na
    // perpendicular da rampa, para o topo da tabua encostar no topo da
    // laje sem passar por cima dela.
    const perpThick = DECK * f.n.y;
    const drop = RAKE_H / 2 - perpThick / 2;
    const cx = (ax + high.x) / 2;
    const cy = (ay + high.y) / 2 + DECK / 2;

    trim.addBox(
      v(cx - f.n.x * drop, cy - f.n.y * drop, z + outward * (RAKE_D / 2)),
      v(len, RAKE_H, RAKE_D),
      f.angle
    );

    const drop2 = drop + RAKE_H / 2 + RAKE_MOLD_H / 2 - 0.02;
    trim.addBox(
      v(cx - f.n.x * drop2, cy - f.n.y * drop2, z + outward * (RAKE_MOLD_D / 2)),
      v(len * 0.99, RAKE_MOLD_H, RAKE_MOLD_D),
      f.angle
    );
  }

  /**
   * Arremate do DEGRAU: a tabua que fecha a faixa onde a agua do corpo
   * principal morre contra o telhado da ala. Sem ela aquele pedaco lia
   * como uma aba solta no ar - era o defeito mais visivel do telhado
   * antigo.
   */
  function addStepTrim(trim, low, high, mode, z, outward) {
    if (!mode || mode === "full" || mode === true) {
      return;
    }
    const xa = mode.from;
    const xb = mode.to;
    const ya = yAtX(low, high, xa);
    const yb = yAtX(low, high, xb);
    const dx = xb - xa;
    const dy = yb - ya;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.3) {
      return;
    }
    // A tabua e encurtada nas duas pontas (STEP_INSET) porque ela e uma
    // caixa GIRADA: sem isso a quina de baixo dela avancaria para dentro
    // do plano da parede do corredor, que e justamente onde este degrau
    // nasce.
    const STEP_INSET = 0.1;
    const ux = dx / len;
    const uy = dy / len;
    trim.addBox(
      v(
        (xa + xb) / 2 + ux * (STEP_INSET / 2),
        (ya + yb) / 2 + uy * (STEP_INSET / 2) + DECK / 2,
        z + outward * 0.07
      ),
      v(len - STEP_INSET, DECK + 0.04, 0.12),
      Math.atan2(dy, dx)
    );
  }

  /**
   * A CUMEEIRA: uma fila de capas curtas, cada uma torta um tico e de
   * largura levemente diferente, apoiadas numa tabua continua. A tabua
   * existe para que a fresta entre duas capas nunca vire um furo no topo
   * do telhado.
   */
  function addRidge(trim, x, y, z0, z1, seed) {
    const len = z1 - z0;
    if (len <= 0.05) {
      return;
    }

    trim.addBox(
      v(x, y + DECK - RIDGE_BOARD_H / 2 + 0.03, (z0 + z1) / 2),
      v(RIDGE_BOARD_W, RIDGE_BOARD_H, len),
      0
    );

    const count = Math.max(1, Math.round(len / CAP_LEN));
    const step = len / count;
    for (let i = 0; i < count; i++) {
      const h = noise(seed * 3.7 + i * 2.3);
      trim.addBox(
        v(x, y + DECK + RIDGE_H / 2 - 0.07 + (h - 0.5) * 0.02, z0 + step * (i + 0.5)),
        v(RIDGE_W * (0.94 + 0.1 * h), RIDGE_H, step - CAP_GAP),
        (h - 0.5) * 0.06
      );
    }
  }

  /**
   * O RINCAO: as duas aguas ja chegavam na MESMA linha (mesmo x, mesmo
   * y), entao aqui nao existe fresta para tapar - o que faltava era
   * PECA. Sao duas reguas, uma deitada em cada agua, encostadas na linha
   * do encontro: juntas formam a calha em V que a obra real tem.
   */
  function addValleyBoards(trim, slopes, z0, z1) {
    if (z1 - z0 <= 0.05) {
      return;
    }
    slopes.forEach(function (pair) {
      const low = pair[0];
      const high = pair[1];
      const f = slopeFrame(low, high);
      const s = VALLEY_W / 2 + 0.01;
      trim.addBox(
        v(
          low.x + f.u.x * s + f.n.x * (VALLEY_LIP / 2),
          low.y + DECK + f.u.y * s + f.n.y * (VALLEY_LIP / 2),
          (z0 + z1) / 2
        ),
        v(VALLEY_W, VALLEY_LIP, z1 - z0),
        f.angle
      );
    });
  }

  /**
   * A ESTRUTURA DO OITAO, no plano do proprio oitao e sempre deslocada
   * para FORA dele (GABLE_OUT): friso no pe, tabuas correndo nas duas
   * inclinacoes, pendural no meio, travessa horizontal e, quando o
   * chamador pede, um respiro de tres reguas.
   *
   * Tudo aqui mora ACIMA de eaveY, menos o friso do pe - e ele nasce
   * inteiro do lado de fora do plano da parede de ponta, no ar livre.
   */
  function addGableFraming(trim, a, b, apex, z, outward, opts) {
    const o = opts || {};
    const zTrim = z + outward * (GABLE_OUT + 0.07);
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const width = maxX - minX;
    const height = apex.y - a.y;
    if (width < 0.4 || height < 0.4) {
      return;
    }

    // Friso no pe do oitao.
    trim.addBox(
      v((minX + maxX) / 2, a.y - GABLE_FRIEZE_H / 2 + 0.03, zTrim),
      v(width, GABLE_FRIEZE_H, 0.14),
      0
    );

    // Tabuas nas duas inclinacoes, encostadas por baixo da borda da agua.
    [a, b].forEach(function (corner) {
      const f = slopeFrame(corner, apex);
      const drop = GABLE_BOARD_H / 2 - 0.01;
      trim.addBox(
        v(
          (corner.x + apex.x) / 2 - f.n.x * drop,
          (corner.y + apex.y) / 2 - f.n.y * drop,
          zTrim
        ),
        v(f.len - 0.02, GABLE_BOARD_H, 0.14),
        f.angle
      );
    });

    // Pendural (peca vertical do meio).
    trim.addBox(
      v(apex.x, a.y + height / 2, zTrim),
      v(GABLE_POST_W, height - 0.12, 0.12),
      0
    );

    // Travessa horizontal, de uma inclinacao a outra.
    const t = 0.42;
    const tieY = a.y + height * t;
    const tieLeft = a.x + (apex.x - a.x) * t;
    const tieRight = b.x + (apex.x - b.x) * t;
    const tieMin = Math.min(tieLeft, tieRight) + 0.05;
    const tieMax = Math.max(tieLeft, tieRight) - 0.05;
    if (tieMax - tieMin > 0.3) {
      trim.addBox(
        v((tieMin + tieMax) / 2, tieY, zTrim),
        v(tieMax - tieMin, GABLE_TIE_H, 0.12),
        0
      );
    }

    // Respiro: tres reguas deitadas logo acima da travessa.
    if (o.vent) {
      const ventW = Math.min(0.62, width * 0.3);
      for (let i = 0; i < 3; i++) {
        trim.addBox(
          v(apex.x, tieY + 0.16 + i * 0.11, zTrim + outward * 0.03),
          v(ventW, 0.05, 0.08),
          0.1
        );
      }
    }
  }

  // ---------------------------------------------------------------
  // MONTAGEM
  // ---------------------------------------------------------------
  function build(materials, options) {
    const p = plan(options);
    const eaveY = p.eaveY;
    const spine = p.spine;

    const root = new THREE.Group();
    root.name = "telhado";

    const shingles = createBuilder();
    const trim = createBuilder();
    const gables = createBuilder();

    const xAxis = v(1, 0, 0);
    const yAxis = v(0, 1, 0);

    const spineZ0 = spine.minZ - RAKE_OVERHANG;
    const spineZ1 = spine.maxZ + RAKE_OVERHANG;
    const spineTop = p2(0, spine.ridgeY);

    function spineY(x) {
      return spine.ridgeY - Math.abs(x) * spine.slope;
    }

    // ---------- Corpo principal: duas aguas ----------
    [-1, 1].forEach(function (sign) {
      const wing = wingFor(p.wings, sign);
      const segs = segmentsFor(spineZ0, spineZ1, wing);

      segs.forEach(function (seg, i) {
        const eaveX = sign * (spine.halfW + seg.overhang);
        const low = p2(eaveX, spineY(eaveX));

        // Como fechar a ponta deste trecho: se o vizinho e igual ou mais
        // largo, ele que fecha (nada aqui); se e mais estreito, este
        // trecho fecha SO o degrau entre os dois.
        function capFor(neighbor) {
          if (!neighbor) {
            return "full";
          }
          const nx = sign * (spine.halfW + neighbor.overhang);
          if (Math.abs(nx) >= Math.abs(eaveX) - 1e-6) {
            return false;
          }
          return { from: nx, to: eaveX };
        }

        const capZ0 = capFor(segs[i - 1]);
        const capZ1 = capFor(segs[i + 1]);

        addSlab(shingles, low, spineTop, seg.z0, seg.z1, {
          // No rincao (overhang 0) a agua da ala continua exatamente
          // desta linha: tampar aqui seria duas faces no mesmo lugar.
          capLow: seg.overhang > 0,
          capHigh: false,
          capZ0: capZ0,
          capZ1: capZ1,
        });

        addCourses(shingles, low, spineTop, seg.z0, seg.z1, {
          start: seg.overhang > 0 ? COURSE_FIRST : VALLEY_CLEAR,
          seed: 13 + i * 3 + (sign > 0 ? 1 : 0),
        });

        if (seg.overhang > 0) {
          addEaveDetail(
            shingles,
            trim,
            low,
            spineTop,
            seg.z0,
            seg.z1,
            sign,
            sign * spine.halfW
          );
        }

        addStepTrim(trim, low, spineTop, capZ0, seg.z0, -1);
        addStepTrim(trim, low, spineTop, capZ1, seg.z1, 1);

        if (capZ0 === "full") {
          addRakeBoards(trim, low, spineTop, seg.z0, -1, 0);
        }
        if (capZ1 === "full") {
          addRakeBoards(trim, low, spineTop, seg.z1, 1, 0);
        }
      });
    });

    // Cumeeira do corpo principal (a mais alta da casa).
    addRidge(trim, 0, spine.ridgeY, spineZ0, spineZ1, 3);

    // Oitoes do corpo principal: o triangulo que fecha o vao entre o topo
    // da parede de ponta e as duas aguas (entrada, em z = -22, e fundo de
    // MEU QUARTO, em z = +6), agora com estrutura de tabuas e respiro.
    [spine.minZ, spine.maxZ].forEach(function (z) {
      const outward = z === spine.minZ ? -1 : 1;
      gables.addPoly(
        [
          v(-spine.halfW, eaveY, z),
          v(spine.halfW, eaveY, z),
          v(0, spine.ridgeY, z),
        ],
        xAxis,
        yAxis
      );
      addGableFraming(
        trim,
        p2(-spine.halfW, eaveY),
        p2(spine.halfW, eaveY),
        spineTop,
        z,
        outward,
        { vent: true }
      );
    });

    // ---------- Alas: duas aguas cada, mais baixas ----------
    p.wings.forEach(function (wing, wi) {
      const z0 = wing.minZ - RAKE_OVERHANG;
      const z1 = wing.maxZ + RAKE_OVERHANG;
      const tipX = wing.outerX + wing.sign * EAVE_OVERHANG;

      function wingY(x) {
        return (
          wing.ridgeY -
          Math.abs(Math.abs(x) - Math.abs(wing.ridgeX)) * wing.slope
        );
      }

      const ridge = p2(wing.ridgeX, wing.ridgeY);
      const innerLow = p2(wing.innerX, wingY(wing.innerX)); // == eaveY (o rincao)
      const outerLow = p2(tipX, wingY(tipX));

      // Agua de dentro: da cumeeira da ala ate o rincao, onde encontra a
      // agua do corpo principal na mesma linha.
      addSlab(shingles, innerLow, ridge, z0, z1, {
        capLow: false,
        capHigh: false,
        capZ0: "full",
        capZ1: "full",
      });
      addCourses(shingles, innerLow, ridge, z0, z1, {
        start: VALLEY_CLEAR,
        seed: 31 + wi * 5,
      });

      // Agua de fora: da cumeeira da ala ate a ponta do beiral.
      addSlab(shingles, outerLow, ridge, z0, z1, {
        capLow: true,
        capHigh: false,
        capZ0: "full",
        capZ1: "full",
      });
      addCourses(shingles, outerLow, ridge, z0, z1, {
        start: COURSE_FIRST,
        seed: 47 + wi * 5,
      });
      addEaveDetail(shingles, trim, outerLow, ridge, z0, z1, wing.sign, wing.outerX);

      addRidge(trim, wing.ridgeX, wing.ridgeY, z0, z1, 7 + wi * 2);

      // Calha do rincao: uma regua na agua do corpo principal e outra na
      // agua da ala, as duas encostadas na linha do encontro.
      const spineValleyLow = p2(
        wing.sign * spine.halfW,
        spineY(wing.sign * spine.halfW)
      );
      addValleyBoards(
        trim,
        [
          [spineValleyLow, spineTop],
          [innerLow, ridge],
        ],
        z0,
        z1
      );

      // Oitoes da ala (as duas pontas), com a mesma estrutura de tabuas.
      [wing.minZ, wing.maxZ].forEach(function (gz) {
        const outward = gz === wing.minZ ? -1 : 1;
        gables.addPoly(
          [
            v(wing.innerX, eaveY, gz),
            v(wing.outerX, eaveY, gz),
            v(wing.ridgeX, wing.ridgeY, gz),
          ],
          xAxis,
          yAxis
        );
        addGableFraming(
          trim,
          p2(wing.innerX, eaveY),
          p2(wing.outerX, eaveY),
          ridge,
          gz,
          outward,
          { vent: false }
        );
      });

      // Tabuas de oitao das duas pontas. A de dentro morre antes do
      // rincao (ver RAKE_STOP): inteira, ela terminaria em cima do forro
      // do corredor.
      addRakeBoards(trim, innerLow, ridge, z0, -1, RAKE_STOP);
      addRakeBoards(trim, outerLow, ridge, z0, -1, 0);
      addRakeBoards(trim, innerLow, ridge, z1, 1, RAKE_STOP);
      addRakeBoards(trim, outerLow, ridge, z1, 1, 0);
    });

    // ---------- A trava anti-invasao ----------
    // Ver o topo do arquivo e createBuilder().guard: nenhuma peca do
    // telhado tem permissao de descer abaixo da linha do beiral DENTRO do
    // retangulo de um comodo. Por construcao isso nao acontece; isto aqui
    // e a rede de seguranca para o dia em que a planta mudar.
    const rects = p.rooms.map(function (rect) {
      return {
        minX: rect.minX + GUARD_INSET,
        maxX: rect.maxX - GUARD_INSET,
        minZ: rect.minZ + GUARD_INSET,
        maxZ: rect.maxZ - GUARD_INSET,
      };
    });
    let clamped = 0;
    [shingles, trim, gables].forEach(function (builder) {
      clamped += builder.guard(eaveY, rects);
    });
    if (clamped > 0 && typeof console !== "undefined" && console.warn) {
      console.warn(
        "[telhado] " +
          clamped +
          " vertice(s) invadiriam um comodo e foram travados na linha do beiral (" +
          eaveY.toFixed(2) +
          " m). Confira as medidas em scenes/house-config.js."
      );
    }

    // ---------- Malhas ----------
    // Tres objetos, nao um por peca: menos draw call, e o Editor continua
    // conseguindo pegar cada um pelo nome (ver editor/editor-registry.js).
    // Os nomes sao os MESMOS de antes de propósito.
    const meshes = [];

    function addMesh(name, builder, nightMaterial, dayMaterial) {
      if (builder.isEmpty()) {
        return;
      }
      const mesh = new THREE.Mesh(builder.toGeometry(), nightMaterial);
      mesh.name = name;
      root.add(mesh);
      meshes.push({
        mesh: mesh,
        night: nightMaterial,
        day: dayMaterial || nightMaterial,
      });
    }

    addMesh("telhado-aguas", shingles, materials.roofShingle, materials.roofShingleDay);
    addMesh("telhado-oitoes", gables, materials.roofGable, materials.roofGableDay);
    addMesh("telhado-arremates", trim, materials.roofTrim, materials.roofTrimDay);

    // Noite <-> dia: mesma receita do chao externo (ver createGroundPlane
    // em models/exterior-factory.js) - troca de material por malha, sem
    // recriar geometria nenhuma.
    function setDaytime(daytime) {
      meshes.forEach(function (item) {
        item.mesh.material = daytime === false ? item.night : item.day;
      });
    }

    function setMorning() {
      setDaytime(true);
    }

    return {
      key: "telhado",
      label: "Telhado",
      root: root,
      eaveY: eaveY,
      // Linha estrutural da cumeeira (a mesma de antes) e o ponto mais
      // alto de verdade do telhado agora que ele tem espessura e capa.
      ridgeY: spine.ridgeY,
      topY: spine.ridgeY + DECK + RIDGE_H,
      deck: DECK,
      setDaytime: setDaytime,
      setMorning: setMorning,
    };
  }

  return {
    LIFT: LIFT,
    MAIN_RISE: MAIN_RISE,
    WING_RISE: WING_RISE,
    EAVE_OVERHANG: EAVE_OVERHANG,
    RAKE_OVERHANG: RAKE_OVERHANG,
    DECK: DECK,
    plan: plan,
    build: build,
  };
})();
