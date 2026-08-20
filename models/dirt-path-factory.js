/**
 * models/dirt-path-factory.js
 * -------------------------------------------------
 * O CAMINHO DE TERRA que sai da porta "ENTRADA & SAIDA" e some dentro
 * da floresta. Quinta camada da vista externa, empilhada nas quatro que
 * ja existiam, sem substituir nenhuma delas:
 *
 *   models/exterior-factory.js .... o terreno (plano texturizado)
 *   models/grass-field-factory.js . os tufos de grama em cima dele
 *   models/tree-forest-factory.js . a mata que fecha o horizonte
 *   models/fog-volume-factory.js .. a neblina volumetrica no ar
 *   models/dirt-path-factory.js ... a estrada de terra              <=
 *
 * Leitura final pedida, olhando pela parede da ENTRADA & SAIDA:
 *
 *   CASA -> PORTA -> TERRA LIMPA -> PEDRAS NAS LATERAIS -> GRAMA ->
 *   ARVORES DENSAS DOS DOIS LADOS -> NEBLINA -> caminho sumindo
 *
 * ---------- Mesma ancora das outras camadas ----------
 * Convencao de espaco local IDENTICA a de GrassFieldFactory e
 * TreeForestFactory (de proposito: e ela que faz as tres camadas
 * casarem sem nenhuma conta nova na cena): origem no pe da parede, na
 * posicao da janela daquele lado; +Z local aponta para FORA da casa;
 * Y = 0 e o chao externo. Quem posiciona e gira e a cena
 * (scenes/corridor-scene.js), reaproveitando o MESMO `grassAnchor` que
 * ja calculava para o gramado, a floresta e a neblina.
 *
 * `options.centerX` e o unico dado novo que a cena precisa passar: o X
 * LOCAL da porta ENTRADA & SAIDA. E dele que sai o requisito "o caminho
 * comeca diretamente em frente a porta" - a fabrica continua sem saber
 * nada sobre portas, janelas ou corredores especificos.
 *
 * ---------- Nada de caminho dentro da casa ----------
 * Mesma regra dura das outras camadas, garantida pela matematica e nao
 * por tentativa e erro: a estrada comeca em z = 0 (o plano da parede) e
 * so cresce no +Z local. Nao existe um unico vertice com z negativo, e
 * a superficie e sempre horizontal e rasa (5 a 16 cm de altura), entao
 * nao ha como ela atravessar parede, porta, piso ou vidro.
 *
 * ---------- O jogador nao pode ver o fim ----------
 * Tres coisas somadas resolvem isso, e nenhuma delas e um truque de
 * "tampar com um objeto":
 *
 *  1. A estrada tem PATH_TO_Z = 58 metros de comprimento, contra uma
 *     nevoa que fecha 100% a 28 unidades de dia e a 13 de noite (ver
 *     Atmosphere.DAY/NIGHT em scripts/atmosphere.js) e uma camera com
 *     `far` = 50 (ver scripts/main.js). Ou seja: o caminho continua por
 *     mais de 30 metros DEPOIS do ponto em que a bruma ja apagou tudo.
 *     Nenhuma ponta, nenhuma borda, nenhum corte aparece - nao porque
 *     esteja escondido atras de alguma coisa, mas porque a vista
 *     termina muito antes dele.
 *  2. Ele NAO e reto: laneCenter() faz a estrada serpentear
 *     lentamente, entao no fundo da vista ela ja saiu do eixo e some
 *     atras dos troncos, do jeito que uma estrada de mata some de
 *     verdade.
 *  3. As arvores continuam dos dois lados ate o fim do alcance da mata
 *     (27 unidades, ver BANDS em models/tree-forest-factory.js), com o
 *     corredor da estrada aberto no meio - a composicao de arvore,
 *     arvore, arvore e bruma fecha o resto.
 *
 * ---------- Caminho limpo (a regra mais importante do pedido) ----------
 * "Caminho de terra = somente terra/estrada" nao e resolvido aqui
 * dentro: e resolvido na FONTE. `createDirtPath` devolve, junto com o
 * grupo 3D, um `contains(x, z, margem)` - o mesmo desenho de estrada
 * usado para montar a malha, exposto como funcao pura. O gramado e a
 * floresta recebem esse objeto (`options.path`) e simplesmente NAO
 * sorteiam nenhuma instancia dentro dele:
 *
 *   - grama:   margem 0.8 x escala do tufo  (as laminas param na borda)
 *   - arvores: margem alcance real + 1.6 m  (nenhum galho sobre a pista)
 *
 * Nao ha remocao depois, nao ha colisao por quadro, nao ha lista de
 * excecoes: as instancias nunca chegam a existir. E por isso que e
 * impossivel nascer grama em cima da estrada ou uma arvore no meio
 * dela, e tambem por isso que a floresta NAO foi removida em faixa
 * nenhuma - ela continua inteira, so abre onde a estrada passa, como
 * uma estrada que corta a mata.
 *
 * As pedrinhas seguem a mesma regra pelo outro lado: so entram na
 * faixa das BORDAS (ver ROCK_INNER/ROCK_OUTER), nunca no miolo, e
 * nenhuma passa de ROCK_MAX_SIZE - sao detalhe decorativo, nao
 * obstaculo. A pista fica livre de ponta a ponta para o jogador andar
 * nela no futuro.
 *
 * ---------- Transicao organica com a grama ----------
 * Nada de linha reta separando terra e grama. Quatro coisas se somam:
 *
 *  1. A LARGURA de cada lado da estrada ondula sozinha, com senoides de
 *     frequencias diferentes e fases diferentes por lado
 *     (halfWidthAt): a borda esquerda e a direita nunca sao espelho uma
 *     da outra.
 *  2. Cada linha transversal da malha ainda leva um "chacoalho"
 *     sorteado nos dois vertices de fora (EDGE_JITTER), entao a borda
 *     serrilha de fileira para fileira em vez de correr lisa.
 *  3. A cor de vertice escurece perto da borda (terra mais umida /
 *     sombra da vegetacao), entao a passagem de terra para grama e um
 *     degrade e nao um corte.
 *  4. Os tufos de grama chegam ate a borda (margem de so 0.8 x escala)
 *     e as pedrinhas ficam justamente em cima dela - sao eles que
 *     quebram opticamente a emenda.
 *
 * ---------- Textura, cor e relevo ----------
 * A estrada NAO e um plano marrom chapado:
 *
 *   - Textura de terra propria, gerada em <canvas> pelo mesmo caminho
 *     de todas as outras texturas do jogo (PsxTextures.createDirtPathTexture
 *     em materials/textures.js): 64x64, NearestFilter, sem mipmap -
 *     terra batida com cascalho, poeira clara e sulcos de roda.
 *   - Variacao de cor por VERTICE (mottle), que quebra a repeticao do
 *     ladrilho de graca: nenhum material extra, nenhum draw call extra,
 *     nenhuma textura extra. So o atributo `color`.
 *   - Relevo de verdade nos vertices (relief): pequenas ondulacoes de
 *     +-5 cm com tres frequencias somadas, mais uma leve BARRIGA no
 *     meio da pista (crown), como toda estrada de terra tem para
 *     escoar agua. Nada de buraco, degrau ou elevacao grande: a
 *     amplitude total nao passa de 11 cm em 4 metros de largura, e o
 *     relevo e amortecido ate zero exatamente na borda, para a emenda
 *     com a grama nunca abrir.
 *
 * ---------- Desempenho (o jogo e mobile) ----------
 *   - A pista inteira e UMA malha estatica: ~40 linhas transversais x
 *     10 colunas = ~700 triangulos, 1 draw call. As linhas ficam mais
 *     esparsas conforme se afastam (0.8 m perto, 1.4 m no meio, 3 m no
 *     fundo, onde a nevoa ja comeu tudo) - detalhe onde se ve, nada
 *     onde nao se ve.
 *   - As pedrinhas sao THREE.InstancedMesh, como a grama e as arvores:
 *     ~55 pedras em 3 draw calls (uma por variante), ~1.1 mil
 *     triangulos. A geometria e criada UMA vez no nivel do modulo.
 *   - `matrixAutoUpdate = false` em tudo: nada aqui se move, nao ha
 *     nenhum trabalho de CPU por quadro. A fabrica nao expoe `update`.
 *   - Nenhuma textura nova alem da de terra, nenhum shader novo,
 *     nenhum sistema de carregamento novo.
 *
 * ---------- Noite e dia ----------
 * Mesmo contrato `setMorning()` do chao, do gramado e da floresta (a
 * cena chama de dentro do proprio setMorning() dela, com a tela preta -
 * ver cutscenes/sleep-sequence.js): de noite, MeshStandardMaterial, que
 * escurece junto com o resto; de dia, MeshBasicMaterial com `fog: true`,
 * obrigatoriamente - o chao e a grama ja trocam para material chapado
 * de manha, e uma estrada iluminada em cima de um gramado chapado
 * apareceria preta. Ver `dirtPath`/`dirtPathDay` e `pathRock`/
 * `pathRockDay` em materials/material-library.js.
 *
 * ---------- Por que nao ha wobble PSX aqui ----------
 * O resto do jogo aplica o tremor de vertice do PS1 via onBeforeCompile
 * (ver applyPSXShader em models/window-factory.js), mas NENHUMA camada
 * da vista externa usa isso - nem o chao, nem a grama, nem a floresta.
 * O motivo e o mesmo aqui: o snapping trabalha em espaco de tela e, em
 * triangulos grandes e rasantes como os de um terreno, ele arranca a
 * geometria da vizinha e abre fendas piscando entre a estrada e o chao.
 * A estetica PSX ja vem da textura 64x64 com NearestFilter, da malha
 * grosseira e do sombreamento chapado.
 * -------------------------------------------------
 */

window.DirtPathFactory = (function () {
  // ---------- Tracado ----------
  // Onde a estrada comeca e termina, em metros medidos a partir do
  // plano da parede (Z local). PATH_FROM_Z = 0 encosta a terra no pe da
  // porta, sem nunca entrar na casa (ver o bloco "Nada de caminho
  // dentro da casa" no topo). PATH_TO_Z = 58 quase alcanca a borda do
  // terreno (ExteriorFactory.GROUND_SIZE = 60) e fica MUITO alem do
  // alcance da nevoa - e o que garante que a ponta nunca apareca.
  const PATH_FROM_Z = 0;
  const PATH_TO_Z = 58;

  // Meia-largura media da pista, em metros (estrada de ~4 m, largura de
  // estrada de terra de mata de verdade). As senoides de halfWidthAt()
  // fazem esse numero variar de lado e de trecho.
  const HALF_BASE = 1.8;

  // Meia-largura MINIMA depois de todas as ondulacoes: a estrada pode
  // estreitar, nunca a ponto de virar trilha ou de fechar.
  const HALF_MIN = 1.25;

  // Alargamento extra bem na frente da porta (o "patio" de terra batida
  // de quem entra e sai todo dia), que desaparece nos primeiros metros.
  const DOOR_FLARE = 0.55;
  const DOOR_FLARE_RANGE = 4.5;

  // Serpenteado da estrada. A onda LONGA e fixa e sempre comeca subindo
  // (o seno nasce em 0 e cresce), entao o caminho sai reto da porta e so
  // depois abre para o lado, sumindo atras dos troncos no fundo da
  // vista - ver item 2 de "O jogador nao pode ver o fim" no topo. A
  // onda CURTA usa a fase sorteada pela semente, para o desenho nao ser
  // sempre o mesmo se um dia existir mais de um caminho no jogo.
  const DRIFT_LONG = 2.4;
  const DRIFT_LONG_FREQ = 0.05;
  const DRIFT_SHORT = 0.9;
  const DRIFT_SHORT_FREQ = 0.14;

  // A estrada sai PERFEITAMENTE reta da porta e so comeca a serpentear
  // depois desta distancia (smoothstep, sem nenhum "joelho"): e o que
  // faz a leitura "porta -> caminho" ficar limpa de frente.
  const DRIFT_RAMP = 9;

  // ---------- Malha ----------
  // Colunas de vertices ao longo da largura (10 colunas = 11 vertices).
  // Precisa ser par para existir uma coluna exatamente no eixo da pista.
  const COLS = 10;

  // Passo entre linhas transversais por faixa de distancia. Detalhe
  // onde o jogador enxerga, quase nada onde a nevoa ja fechou.
  const STEP_NEAR = 0.8; // ate 10 m
  const STEP_MID = 1.4; // ate 24 m
  const STEP_FAR = 3.0; // dai em diante

  // Chacoalho lateral sorteado nos vertices da BORDA, linha a linha -
  // ver item 2 de "Transicao organica com a grama" no topo. O valor e
  // em metros; a coluna vizinha a borda leva 30% dele, para o
  // serrilhado nao virar um pico isolado.
  const EDGE_JITTER = 0.45;

  // ---------- Relevo ----------
  // Altura base da pista acima do plano de grama (y = 0). Pequena o
  // bastante para nao ler como degrau (5,5 cm, menos de um pixel na
  // tela a qualquer distancia em que a estrada seja visivel) e grande o
  // bastante para nunca haver z-fighting com o chao de
  // ExteriorFactory.createGroundPlane.
  const PATH_LIFT = 0.055;

  // "Barriga" no meio da pista (a agua da chuva escorre para as
  // laterais). Zero exatamente na borda.
  const CROWN = 0.055;

  // Amplitude das ondulacoes do solo. Amortecida por (1 - t^6), ou
  // seja: some exatamente na borda, para a emenda com a grama nunca
  // abrir uma fresta.
  const BUMP = 0.05;

  // ---------- Textura ----------
  // Metros de mundo por repeticao da textura de terra. As UVs sao
  // calculadas em espaco de mundo (x/TILE, z/TILE) em vez de
  // normalizadas pela largura: assim o tamanho do pixel de terra nao
  // estica nos trechos em que a estrada alarga.
  const TILE = 2.0;

  // ---------- Pedrinhas ----------
  // Faixa (em metros a partir da BORDA da estrada) onde uma pedra pode
  // cair. Negativo = para dentro da pista. Note que o limite de dentro
  // e minusculo de proposito: pedra e detalhe de beira de estrada, nao
  // obstaculo - nada de "pedras bloqueando a passagem".
  const ROCK_INNER = -0.12;
  const ROCK_OUTER = 0.95;
  const ROCK_MIN_SIZE = 0.07;
  const ROCK_MAX_SIZE = 0.26;
  // Alem disso nao vale a pena: a nevoa ja fechou e a pedra teria menos
  // de um pixel.
  const ROCK_MAX_Z = 26;
  // Passo medio entre grupos de pedras ao longo da estrada.
  const ROCK_STEP = 0.32;

  // Esfera de corte (frustum culling) das malhas instanciadas de pedra.
  // PRECISA ser definida na mao, pelo mesmo motivo ja documentado em
  // models/grass-field-factory.js: no three.js r128 o corte de uma
  // THREE.InstancedMesh usa a boundingSphere da GEOMETRIA (uma pedra so,
  // na origem) e ignora as matrizes de instancia.
  const ROCK_SPHERE_CENTER = new THREE.Vector3(0, 0, 13);
  const ROCK_SPHERE_RADIUS = 20;

  const UP = new THREE.Vector3(0, 1, 0);

  // ---------- Sorteio deterministico ----------
  // mulberry32 + hash de string: exatamente os mesmos da grama e da
  // floresta, e pelo mesmo motivo - a cena e remontada toda vez que o
  // jogador entra e sai do quarto (ver cutscenes/room-transition.js) e
  // a estrada precisa ser IDENTICA em todas elas. Nada de Math.random.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(text) {
    let h = 0x811c9dc5;
    const s = String(text || "caminho");
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // Mesma interpolacao suave usada em models/tree-forest-factory.js.
  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  // ---------- O tracado, como funcao pura ----------
  // Deslocamento lateral do EIXO da estrada a `z` metros da parede.
  // Vale 0 (e com derivada 0) em z = 0: o caminho nasce exatamente em
  // frente a porta, apontado para fora.
  function laneCenter(z, phase) {
    const ramp = smoothstep(0, DRIFT_RAMP, z);
    return (
      ramp *
      (DRIFT_LONG * Math.sin(z * DRIFT_LONG_FREQ) +
        DRIFT_SHORT * Math.sin(z * DRIFT_SHORT_FREQ + phase))
    );
  }

  // Meia-largura da estrada a `z` metros da parede, de um lado so
  // (`side` = -1 ou +1). O deslocamento de fase por lado e o que impede
  // as duas bordas de serem espelho uma da outra.
  function halfWidthAt(z, side, phase) {
    const s = side < 0 ? 0 : 3.7;
    const w =
      HALF_BASE +
      0.3 * Math.sin(z * 0.62 + phase + s) +
      0.16 * Math.sin(z * 1.53 + phase * 2.3 + s * 1.7) +
      0.09 * Math.sin(z * 3.1 + phase * 0.7 + s * 2.9);
    const flare = DOOR_FLARE * (1 - smoothstep(0, DOOR_FLARE_RANGE, z));
    return Math.max(HALF_MIN, w + flare);
  }

  // Ondulacao do solo (-1 a 1). Tres frequencias somadas para nao ler
  // como "onda": o olho nao acha o padrao.
  function relief(x, z, phase) {
    return (
      0.55 * Math.sin(z * 0.42 + phase) * Math.cos(x * 0.31 - phase * 0.7) +
      0.3 * Math.sin(z * 0.95 - x * 0.55 + phase * 1.9) +
      0.15 * Math.sin(z * 2.1 + x * 1.3 + phase * 0.4)
    );
  }

  // Manchas de cor da terra (0 a 1) - ver "Textura, cor e relevo".
  function mottle(x, z, phase) {
    const v =
      0.5 +
      0.28 * Math.sin(x * 0.9 + phase) * Math.sin(z * 0.7 - phase * 0.6) +
      0.14 * Math.sin(x * 2.3 - phase * 1.4 + z * 0.35) +
      0.08 * Math.sin(z * 4.1 + x * 1.7 + phase);
    return Math.max(0, Math.min(1, v));
  }

  // As linhas transversais da malha, mais juntas perto da casa.
  function buildRows() {
    const rows = [];
    let z = PATH_FROM_Z;
    while (z < PATH_TO_Z) {
      rows.push(z);
      z += z < 10 ? STEP_NEAR : z < 24 ? STEP_MID : STEP_FAR;
    }
    rows.push(PATH_TO_Z);
    return rows;
  }

  /**
   * O desenho da estrada exposto como funcao pura, para o gramado e a
   * floresta poderem se afastar dele ANTES de existir (ver "Caminho
   * limpo" no topo). `margin` e a folga extra pedida por quem pergunta
   * (o raio do tufo, o alcance do galho...).
   */
  function makeContains(centerX, phase) {
    return function contains(x, z, margin) {
      const m = margin || 0;
      if (z < PATH_FROM_Z - m || z > PATH_TO_Z + m) {
        return false;
      }
      const cz = Math.max(PATH_FROM_Z, Math.min(PATH_TO_Z, z));
      const u = x - (centerX + laneCenter(cz, phase));
      const half = halfWidthAt(cz, u < 0 ? -1 : 1, phase);
      return Math.abs(u) < half + m;
    };
  }

  // ---------- A malha da pista ----------
  function buildRoadGeometry(centerX, phase, rng) {
    const rows = buildRows();
    const rowCount = rows.length;
    const colCount = COLS + 1;
    const vertexCount = rowCount * colCount;

    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const colors = new Float32Array(vertexCount * 3);

    for (let r = 0; r < rowCount; r++) {
      const z = rows[r];
      const center = centerX + laneCenter(z, phase);
      const halfL = halfWidthAt(z, -1, phase);
      const halfR = halfWidthAt(z, 1, phase);
      // Um chacoalho por LINHA e por LADO (nao por vertice): e o que
      // serrilha a borda de fileira para fileira. Os dois sorteios
      // acontecem sempre, para a sequencia do PRNG nao depender de
      // nada calculado depois.
      const jitterL = (rng() - 0.5) * EDGE_JITTER;
      const jitterR = (rng() - 0.5) * EDGE_JITTER;

      for (let c = 0; c < colCount; c++) {
        const t = -1 + (2 * c) / COLS;
        const half = t < 0 ? halfL : halfR;
        const jitter = t < 0 ? jitterL : jitterR;

        // O chacoalho so vale nas duas colunas de fora (a de borda
        // inteiro, a vizinha 30%): o miolo da pista continua limpo e
        // regular, como terra batida de verdade.
        let edgePull = 0;
        if (c === 0 || c === colCount - 1) {
          edgePull = jitter;
        } else if (c === 1 || c === colCount - 2) {
          edgePull = jitter * 0.3;
        }

        const x = center + t * half + edgePull * (t < 0 ? -1 : 1);

        const t2 = t * t;
        const crown = CROWN * (1 - t2);
        const bump = BUMP * relief(x, z, phase) * (1 - t2 * t2 * t2);
        const y = PATH_LIFT + crown + bump;

        const i3 = (r * colCount + c) * 3;
        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        const i2 = (r * colCount + c) * 2;
        uvs[i2] = x / TILE;
        uvs[i2 + 1] = z / TILE;

        // Variacao de cor + escurecimento progressivo ate a borda (ver
        // item 3 de "Transicao organica com a grama").
        const shade = 0.86 + 0.2 * mottle(x, z, phase);
        const edgeDark = 1 - 0.18 * Math.abs(t) * Math.abs(t) * Math.abs(t);
        const v = Math.max(0.68, Math.min(1.12, shade * edgeDark));
        colors[i3] = v;
        colors[i3 + 1] = v;
        colors[i3 + 2] = v;
      }
    }

    // Indices: dois triangulos por celula, no sentido anti-horario
    // visto de cima (+Y), para a normal nascer apontando para o ceu.
    const quadCount = (rowCount - 1) * COLS;
    const index = new Uint16Array(quadCount * 6);
    let k = 0;
    for (let r = 0; r < rowCount - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        const a = r * colCount + c;
        const b = a + 1;
        const d = a + colCount;
        const e = d + 1;
        index[k++] = a;
        index[k++] = d;
        index[k++] = b;
        index[k++] = b;
        index[k++] = d;
        index[k++] = e;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  // ---------- As pedrinhas ----------
  // Tres variantes de seixo low-poly criadas UMA vez no nivel do modulo
  // (20 triangulos cada, icosaedro com os vertices deslocados). O
  // deslocamento sai de um hash da POSICAO do vertice, nao de um
  // sorteio por indice: como a geometria do three.js vem sem indice,
  // vertices coincidentes de faces vizinhas recebem o mesmo
  // deslocamento e a pedra nao se abre em fendas.
  let rockGeometries = null;

  function positionHash(x, y, z, salt) {
    let h = 0x811c9dc5 ^ (salt >>> 0);
    const parts = [Math.round(x * 4096), Math.round(y * 4096), Math.round(z * 4096)];
    for (let p = 0; p < 3; p++) {
      let v = parts[p] | 0;
      for (let b = 0; b < 4; b++) {
        h ^= v & 0xff;
        h = Math.imul(h, 0x01000193);
        v >>= 8;
      }
    }
    return ((h >>> 0) % 10000) / 10000;
  }

  function buildRockGeometry(salt) {
    const geo = new THREE.IcosahedronGeometry(0.5, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const f = 0.68 + 0.5 * positionHash(x, y, z, salt);
      pos.setXYZ(i, x * f, y * f, z * f);
    }
    pos.needsUpdate = true;

    // Seixo, nao bolinha: achatado e assentado com a base em y = 0,
    // para a escala de cada instancia ser diretamente a ALTURA da pedra
    // em metros (mesma convencao da grama e das arvores).
    geo.scale(1, 0.6, 1);
    geo.computeBoundingBox();
    geo.translate(0, -geo.boundingBox.min.y, 0);
    // Sem indice: computeVertexNormals produz normal por face, o
    // facetado chapado certo para a estetica PSX.
    geo.computeVertexNormals();
    geo.deleteAttribute("uv");
    geo.boundingSphere = new THREE.Sphere(
      ROCK_SPHERE_CENTER.clone(),
      ROCK_SPHERE_RADIUS
    );
    return geo;
  }

  function getRockGeometries() {
    if (!rockGeometries) {
      rockGeometries = [
        buildRockGeometry(1),
        buildRockGeometry(2),
        buildRockGeometry(3),
      ];
    }
    return rockGeometries;
  }

  // Poses das pedras, ja separadas por variante (uma InstancedMesh por
  // variante). Todas nascem na BORDA da estrada, nunca no miolo.
  function buildRockPlacements(centerX, phase, rng, variantCount) {
    const byVariant = [];
    for (let v = 0; v < variantCount; v++) {
      byVariant.push([]);
    }

    let z = 0.6;
    while (z < ROCK_MAX_Z) {
      // Os sorteios acontecem SEMPRE, mesmo quando a pedra e
      // descartada: mantem a sequencia do PRNG estavel.
      const side = rng() < 0.5 ? -1 : 1;
      const outward = ROCK_INNER + rng() * (ROCK_OUTER - ROCK_INNER);
      const size = ROCK_MIN_SIZE + rng() * (ROCK_MAX_SIZE - ROCK_MIN_SIZE);
      const rotation = rng() * Math.PI * 2;
      const width = 0.8 + rng() * 0.7;
      const variant = Math.min(variantCount - 1, Math.floor(rng() * variantCount));
      const skip = rng();
      const advance = ROCK_STEP * (0.55 + rng());
      const along = rng() * ROCK_STEP;

      const zz = z + along;
      z += advance;

      // Um vao aqui e ali: pedra de estrada de terra nao vem em fila.
      if (skip < 0.28 || zz >= ROCK_MAX_Z) {
        continue;
      }

      const half = halfWidthAt(zz, side, phase);
      const x = centerX + laneCenter(zz, phase) + side * (half + outward);
      byVariant[variant].push({
        x: x,
        z: zz,
        size: size,
        width: width,
        rotation: rotation,
      });
    }

    return byVariant;
  }

  /**
   * Cria o caminho de terra de UMA porta.
   *
   * options.centerX: X LOCAL do eixo do caminho - normalmente o X local
   *   da porta, para a estrada nascer exatamente em frente a ela (ver
   *   "Mesma ancora das outras camadas" no topo).
   * options.seed: qualquer texto estavel; define a fase do serpenteado,
   *   o serrilhado das bordas e a distribuicao das pedras.
   * options.materials: a biblioteca de materiais da cena (precisa de
   *   dirtPath/dirtPathDay e pathRock/pathRockDay).
   *
   * Devolve, alem do grupo 3D e do `setMorning()` do contrato de sempre,
   * o `contains(x, z, margem)` que o gramado e a floresta usam para
   * manter a pista limpa.
   */
  function createDirtPath(options) {
    const opts = options || {};
    const materials = opts.materials || {};
    const centerX = opts.centerX || 0;
    const seed = hashSeed(opts.seed);
    const phase = mulberry32(seed)() * Math.PI * 2;

    const group = new THREE.Group();
    const swaps = []; // { mesh, night, day }

    // ---------- Pista ----------
    const roadRng = mulberry32(seed + 0x9e3779b9);
    const roadGeo = buildRoadGeometry(centerX, phase, roadRng);
    const road = new THREE.Mesh(roadGeo, materials.dirtPath);
    road.matrixAutoUpdate = false;
    road.updateMatrix();
    group.add(road);
    swaps.push({ mesh: road, night: materials.dirtPath, day: materials.dirtPathDay });

    // ---------- Pedrinhas ----------
    const geometries = getRockGeometries();
    const rockRng = mulberry32(seed + 0x85ebca6b);
    const byVariant = buildRockPlacements(centerX, phase, rockRng, geometries.length);

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    byVariant.forEach(function (placements, variant) {
      if (!placements.length) {
        return;
      }
      const mesh = new THREE.InstancedMesh(
        geometries[variant],
        materials.pathRock,
        placements.length
      );
      placements.forEach(function (pose, i) {
        quaternion.setFromAxisAngle(UP, pose.rotation);
        // Meia pedra enterrada: seixo de estrada nasce do chao, nao fica
        // pousado em cima dele (mesma ideia do GROUND_SINK da grama e das
        // arvores).
        position.set(pose.x, PATH_LIFT - pose.size * 0.35, pose.z);
        scale.set(pose.size * pose.width, pose.size, pose.size * pose.width);
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      // Nada aqui se move depois de montado.
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      group.add(mesh);
      swaps.push({ mesh: mesh, night: materials.pathRock, day: materials.pathRockDay });
    });

    // Mesmo contrato do chao externo, do gramado e da floresta: a cena
    // chama isto de dentro do proprio setDaytime() dela, com a tela
    // preta (ver cutscenes/sleep-sequence.js). Vai e volta por causa do
    // controle de horario do Editor (ver editor/editor-ui.js).
    function setDaytime(daytime) {
      const day = daytime !== false;
      swaps.forEach(function (item) {
        const material = day ? item.day : item.night;
        if (material) {
          item.mesh.material = material;
        }
      });
    }

    function setMorning() {
      setDaytime(true);
    }

    return {
      group: group,
      setDaytime: setDaytime,
      setMorning: setMorning,
      contains: makeContains(centerX, phase),
    };
  }

  return {
    PATH_FROM_Z: PATH_FROM_Z,
    PATH_TO_Z: PATH_TO_Z,
    createDirtPath: createDirtPath,
  };
})();
