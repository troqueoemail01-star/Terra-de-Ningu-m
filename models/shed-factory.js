/**
 * models/shed-factory.js
 * -------------------------------------------------
 * O GALPAO DO QUINTAL DOS FUNDOS (armazem PSX, decorativo)
 *
 * Segunda peca do QUINTAL DOS FUNDOS, depois do carro (ver
 * models/car-factory.js): o galpaozinho que o jogador enviou nesta rodada,
 * plantado no gramado ATRAS da casa, um pouco AFASTADO dela - o pedido, com o
 * lugar circulado num print do Editor: "quero que voce adicione esse pequeno
 * galpao ao jogo, exatamente onde eu mostro na imagem. Parte de tras da casa
 * (exterior). Nao e pra juntar esse galpao com a casa. O galpao deve ficar um
 * pouco afastado".
 *
 * Peca puramente DECORATIVA, como o carro: sem interacao, sem contorno de
 * destaque, sem prompt de Interagir, sem dialogo, sem som. As duas folhas
 * nascem FECHADAS e nao abrem (nao ha nada la dentro, e o jogador ainda nao
 * sai de casa).
 *
 * ---------- As DUAS trocas pedidas ----------
 *  1. PISO: o pacote entrega um piso de CIMENTO. Ele nao entrou. O chao do
 *     galpao e a MESMA madeira do chao da casa - a receita
 *     PsxTextures.createWoodTexture usada pelo corredor, por MEU QUARTO e
 *     pelos quatro comodos novos (ver materials/textures.js e
 *     materials/material-library.js) -, com a tabua do MESMO tamanho em
 *     metros que a de dentro da casa (ver FLOOR_TILE). Nenhuma textura nova
 *     foi inventada, e o pintor de cimento do pacote nem foi copiado para ca.
 *  2. PORTAS: as duas folhas de taboas do pacote tambem NAO entraram. As duas
 *     folhas do galpao sao o MODELO DE PORTA DO JOGO (window.DoorFactory, o
 *     mesmo das 6 portas do corredor e da porta de MEU QUARTO), com o mesmo
 *     material de folha (materials.doorPanel) e a mesma macaneta
 *     (materials.lampMetal). Os pintores de taboas e de ferro do pacote
 *     tambem ficaram de fora.
 *
 *     E o VAO da porta do galpao e DERIVADO da porta do jogo, nao escrito na
 *     mao (ver DOOR_SCALE / LEAF_W / DIM.DOOR_W): mudou a porta do jogo, o
 *     recorte da parede, os batentes e a verga do galpao acompanham sozinhos.
 *
 * ---------- Nada de sistema novo (o mesmo pedido de sempre) ----------
 * O pacote do galpao nao e um .glb: e codigo que MONTA a geometria e PINTA as
 * texturas em canvas na hora, com um runtime PSX proprio (ShaderMaterial com
 * snap de vertice, warp afim de textura, dither de 15 bits e luz/nevoa
 * proprias). Aquele runtime NAO entrou, pelo MESMO motivo ja escrito em
 * models/car-factory.js, models/porch-plant-factory.js e
 * models/portable-radio-factory.js: shader com luz propria fixa ignoraria as
 * luzes da cena e o amanhecer, e seria um SEGUNDO sistema de material em
 * paralelo ao do jogo.
 *
 * O que veio do pacote foi so o que interessa, VERBATIM, sem mexer em um
 * numero: as funcoes que montam a MALHA (Builder, addBox, addQuadDiv,
 * addTriDiv, addSlopedBoard), a oclusao assada nos vertices e os cinco
 * pintores de textura que sobraram depois das duas trocas (reboco externo,
 * reboco interno, madeira, telhas e forro). Todos vivem aqui dentro desta
 * fabrica. Sobre eles entram os materiais do JOGO: MeshStandardMaterial de
 * noite e MeshBasicMaterial de dia, exatamente como o carro. Nenhum
 * carregador novo, nenhum shader novo, nenhum segundo three.js e nenhum
 * arquivo de imagem para baixar - as texturas continuam nascendo em canvas,
 * como TODAS as do jogo.
 *
 * ---------- Convencao de espaco local ----------
 *   - X = 0 e Z = 0 sao o CENTRO da base;
 *   - Y = 0 e o chao (a base das paredes);
 *   - a FRENTE (a porta) olha para +Z, mesma convencao do resto do jogo.
 * O pacote ja entrega o galpao exatamente assim, entao nao existe aqui o
 * bloco ROTATED_* que o fogao e a planta da varanda precisaram ter. Quem vira
 * a porta para o lado da casa e o `rotationY` dos DADOS (ver `backYard.props`
 * em scenes/corridor-config.js).
 *
 * ---------- Noite e dia ----------
 * Mesmo contrato de tudo que vive do lado de FORA (setDaytime/setMorning, ver
 * models/car-factory.js e models/dumpster-factory.js): mesma geometria e
 * mesma textura nos dois periodos, trocando so o material - MeshStandard de
 * noite, MeshBasic de dia, no mesmo tom em que a fachada, o telhado e o carro
 * amanhecem (DAY_TINT). Reversivel pelo controle de HORARIO do Editor.
 *
 * ---------- Colisao ----------
 * O galpao entra em `solids` como UM retangulo, o contorno do telhado - o
 * mesmo tratamento do carro. Ele e macico de proposito: as portas estao
 * fechadas e nao ha nada la dentro, entao nao existe "entrar no galpao" hoje.
 * O dia em que existir, as paredes ja estao em malhas proprias e as medidas
 * todas estao em DIM/EX/EZ/HX aqui embaixo.
 *
 * Licenca do pacote: MIT ("Armazem PSX v1.0.0", psx-warehouse) - sem exigencia
 * de atribuicao, diferente do carro. O credito fica registrado aqui e na
 * secao do galpao do README.md.
 * -------------------------------------------------
 */

window.ShedFactory = (function () {
  // ---------- A porta do JOGO, que o galpao passou a usar ----------
  // As medidas da porta do corredor, exportadas por models/door-factory.js. O
  // <script> dela vem muito antes do desta fabrica em index.html, entao aqui
  // ela sempre existe; o fallback e so para um erro de ordem nao virar tela
  // preta.
  var DOOR_MODEL = window.DoorFactory;
  if (!DOOR_MODEL) {
    console.error(
      "ShedFactory: DoorFactory nao esta carregada - o galpao vai sair com o " +
        "vao da porta nas medidas padrao e SEM folha. Confira a ordem dos " +
        "<script> em index.html (models/door-factory.js vem antes)."
    );
    DOOR_MODEL = {
      DOOR_WIDTH: 1.3,
      DOOR_HEIGHT: 2.3,
      DOOR_DEPTH: 0.12,
      PANEL_RECESS: 0.02,
      OPENING_WIDTH: 1.26,
      OPENING_HEIGHT: 2.28,
    };
  }

  /* =========================================================
     0. DIMENSOES (metros). Interior = quarto pequeno 4.0 x 4.4
        As oito primeiras vem do pacote, sem tocar em uma virgula; as duas
        da PORTA sao derivadas da porta do jogo.
     ========================================================= */
  // Altura do vao: a do pacote (2,05 m). E ela que mantem a fachada do galpao
  // com a cara da referencia - verga de madeira em 2,05 e uma faixa de reboco
  // ainda por cima dela, ate o frechal em 2,28.
  var DOOR_H_PKG = 2.05;
  // Escala UNIFORME da porta do jogo dentro deste vao: a folha do corredor tem
  // 2,30 m e o vao dela e 2 cm mais baixo, porque a folha sempre sobrepoe a
  // borda do recorte (ver OPENING_HEIGHT em models/door-factory.js). Mesma
  // regra aqui: vao de 2,05 -> folha de 2,07 -> escala 0,899. UNIFORME de
  // proposito: a porta do jogo entra sem um pixel de distorcao, so um pouco
  // menor - porta de galpao e menor que porta de casa.
  var DOOR_SCALE = DOOR_H_PKG / DOOR_MODEL.OPENING_HEIGHT;
  // Largura de UMA folha ja na escala do galpao (1,169 m). O vao das duas
  // juntas (DIM.DOOR_W, 2,266 m) sai da largura de RECORTE da porta do jogo,
  // ou seja com a mesma sobreposicao de 2 cm por lado. E daqui que vem o HX do
  // pacote: o recorte na parede da frente, os batentes e a verga do galpao
  // SAO a porta do jogo, e nao um numero solto.
  var LEAF_W = DOOR_MODEL.DOOR_WIDTH * DOOR_SCALE;
  var DIM = {
    IW: 4.0,          // largura interna (X)
    ID: 4.4,          // profundidade interna (Z)
    WT: 0.20,         // espessura da parede
    WALL_H: 2.45,     // altura livre interna
    RISE: 1.65,       // altura do telhado acima do topo da parede
    EAVE: 0.45,       // beiral lateral (X)
    GABLE: 0.40,      // beiral frente/tras (Z)
    ROOF_T: 0.14,     // espessura da laje do telhado
    DOOR_W: DOOR_MODEL.OPENING_WIDTH * DOOR_SCALE * 2,   // 2.266: duas folhas do jogo
    DOOR_H: DOOR_H_PKG                                   // 2.05
  };
  var EX = DIM.IW / 2 + DIM.WT;               // 2.20 face externa X
  var EZ = DIM.ID / 2 + DIM.WT;               // 2.40 face externa Z
  var IX = DIM.IW / 2;                        // 2.00 face interna X
  var IZ = DIM.ID / 2;                        // 2.20 face interna Z
  var WH = DIM.WALL_H;                        // 2.45
  var PEAK = WH + DIM.RISE;                   // 4.10 (face de baixo do telhado na cumeeira)
  var SLOPE = DIM.RISE / EX;                  // 0.75
  var RX = EX + DIM.EAVE;                     // 2.65 borda do telhado em X
  var RZ = EZ + DIM.GABLE;                    // 2.80 borda do telhado em Z
  var EAVE_Y = PEAK - SLOPE * RX;             // 2.1125 altura da borda do beiral
  var DOOR_Z = EZ - 0.04;                     // 2.36 plano externo das folhas
  var HX = DIM.DOOR_W / 2;                    // 1.133 batente

  function underRoofY(x) { return PEAK - SLOPE * Math.abs(x); }

  // Espessura das testeiras/tabeiras escuras que contornam o beiral: elas sao
  // a ponta mais externa do galpao, um pouco a frente da propria telha (6 cm
  // em X, 7,5 cm em Z). Ficam aqui porque as medidas finais precisam incluir
  // elas - senao a caixa do galpao mentiria alguns centimetros.
  var FASCIA_X = 0.06;
  var FASCIA_Z = 0.075;

  // Medidas finais que a cena usa para afastar a peca da parede, para o solido
  // de colisao e para o aviso de peca fora da faixa de chao - mesmo contrato de
  // CarFactory/DumpsterFactory.width/height/depth. Aqui elas sao o contorno do
  // TELHADO (o beiral, a parte mais larga do galpao), nao o das paredes: assim
  // nem o jogador acaba debaixo do beiral, nem o beiral sai da faixa de chao
  // que existe atras da casa. Conferidas contra a caixa real da malha montada.
  var FINAL_WIDTH = (RX + FASCIA_X) * 2;       // 5.42
  var FINAL_DEPTH = (RZ + FASCIA_Z) * 2;       // 5.75
  var FINAL_HEIGHT = PEAK + DIM.ROOF_T + 0.10; // 4.34 (com a cumeeira)

  // ---------- O chao de madeira da casa, aqui dentro ----------
  // Tamanho de UM tile da textura de madeira, em metros. O jogo calibra o piso
  // de cada ambiente com `lado * 1.2` repeticoes num UV de 0 a 1 (ver
  // floorTex/roomFloorTex/sideRoomFloorTex em materials/material-library.js),
  // ou seja 1,2 tabuas por metro. Aqui o UV vem das COORDENADAS DE MUNDO (e
  // assim que addBox mapeia, ver a secao 4), entao a MESMA densidade sai
  // dividindo o mundo por 1/1.2: a tabua do galpao tem exatamente o tamanho da
  // tabua do corredor, do quarto e dos quatro comodos. Era o pedido - "o mesmo
  // chao de madeira que ja tem na casa".
  var FLOOR_TILE = 1 / 1.2;
  var FLOOR_Y = 0.02;    // espessura do piso, a mesma do piso do pacote

  // Semente das texturas: a do pacote (1337). Fixa de proposito - o galpao sai
  // identico a cada remontagem da cena, como o resto do mundo.
  var SEED = 1337;

  // Tom em que o exterior amanhece: o MESMO das outras pecas de fora (ver
  // DAY_TINT em models/car-factory.js e exteriorWallDayMaterial em
  // materials/material-library.js), para galpao, gramado, casa e carro
  // amanhecerem juntos.
  var DAY_TINT = 0xd9d2c4;

  /* =========================================================
     1. RUIDO / RNG DETERMINISTICO  (do pacote, verbatim)
     ========================================================= */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash1(n) { var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function mixRGB(c1, c2, t) {
    t = clamp(t, 0, 1);
    return [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t];
  }

  // ruido de valor com periodo inteiro (garante textura sem costura)
  function valueNoise(seed, period) {
    var rnd = mulberry32(seed >>> 0);
    var g = new Float32Array(period * period);
    for (var i = 0; i < g.length; i++) g[i] = rnd();
    function at(x, y) {
      x = x % period; if (x < 0) x += period;
      y = y % period; if (y < 0) y += period;
      return g[y * period + x];
    }
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y);
      var xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      var ab = a + (b - a) * u, cd = c + (d - c) * u;
      return ab + (cd - ab) * v;
    };
  }
  // fbm ciclico: chame sempre com multiplicadores INTEIROS para manter o tile
  function fbm(seed, octaves) {
    var ns = [];
    for (var k = 0; k < (octaves || 4); k++) {
      var p = 1 << (k + 1);
      ns.push({ n: valueNoise(seed + k * 1013 + 7, p), p: p, a: 1 / (1 << k) });
    }
    return function (u, v) {
      var s = 0, t = 0;
      for (var i = 0; i < ns.length; i++) { var o = ns[i]; s += o.a * o.n(u * o.p, v * o.p); t += o.a; }
      return s / t;
    };
  }

  /* =========================================================
     2. PINTORES DE TEXTURA (canvas, paleta 15-bit + dither)
        Do pacote, verbatim. Os pintores de CIMENTO, de TABOAS DA PORTA e de
        FERRO nao foram copiados: com as duas trocas pedidas, o piso vem da
        madeira do jogo e as folhas vem de DoorFactory.
     ========================================================= */
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function q15(v, d) {
    v = clamp(v + d, 0, 255);
    return Math.round(Math.round((v / 255) * 31) / 31 * 255);
  }
  function paint(size, fn) {
    var cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(size, size);
    var d = img.data;
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var u = (x + 0.5) / size;
        var v = 1 - (y + 0.5) / size;      // v casa com o UV do three (flipY)
        var c = fn(u, v, x, y);
        var dth = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * 7.5;
        var i = (y * size + x) * 4;
        d[i] = q15(c[0], dth); d[i + 1] = q15(c[1], dth); d[i + 2] = q15(c[2], dth);
        d[i + 3] = c.length > 3 ? c[3] : 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  /* ---- reboco externo: creme sujo + faixa de barro na base (V = altura) ---- */
  function texPlasterExt(seed) {
    var f1 = fbm(seed, 5), f2 = fbm(seed + 31, 4), f3 = fbm(seed + 97, 3);
    var CREAM_L = [223, 217, 198], CREAM_D = [193, 187, 167], GRIME = [149, 146, 133];
    var DIRT_L = [201, 147, 58], DIRT_D = [148, 100, 37], DIRT_VD = [105, 70, 29];
    return paint(128, function (u, v) {
      var n = f1(u * 2, v * 2);
      var col = mixRGB(CREAM_L, CREAM_D, clamp(n * 1.35 - 0.15, 0, 1));
      // escorridos verticais de chuva, mais fortes no alto
      var st = f2(u * 6, v * 1);
      var streak = clamp((st - 0.58) * 3.0, 0, 1) * clamp((v - 0.24) / 0.5, 0, 1);
      col = mixRGB(col, GRIME, streak * 0.30);
      // manchas / mofo
      col = mixRGB(col, GRIME, clamp((f3(u * 4, v * 4) - 0.68) * 2.2, 0, 1) * 0.22);
      // reboco descascado (pontos claros)
      var chip = f3(u * 8, v * 8);
      if (chip > 0.78) col = mixRGB(col, [228, 223, 205], (chip - 0.78) * 3.0);
      // faixa de barro na base, borda irregular + respingos
      var band = 0.215 + 0.085 * f2(u * 3, 0.37) + 0.045 * f1(u * 8, 0.11);
      var dm = f1(u * 10, v * 10);
      var edge = (band - v) / 0.09;
      if (edge > -1.1) {
        var amt = clamp(edge, 0, 1);
        if (edge < 0) amt = (dm > 0.6 - edge * 0.34) ? 0.72 : 0;
        var dirt = mixRGB(DIRT_L, DIRT_D, clamp(dm * 1.4 - 0.2, 0, 1));
        if (v < band * 0.4) dirt = mixRGB(dirt, DIRT_VD, clamp((band * 0.4 - v) / (band * 0.45), 0, 1) * 0.6);
        col = mixRGB(col, dirt, amt);
      }
      var g = (dm - 0.5) * 13;
      return [col[0] + g, col[1] + g, col[2] + g];
    });
  }

  /* ---- reboco interno: cinza cru, tileavel nos dois eixos ---- */
  function texPlasterInt(seed) {
    var f1 = fbm(seed + 5, 4), f2 = fbm(seed + 61, 3);
    var A = [186, 181, 168], B = [138, 134, 124], C = [104, 100, 92];
    return paint(64, function (u, v) {
      var n = f1(u * 2, v * 2);
      var col = mixRGB(A, B, clamp(n * 1.5 - 0.2, 0, 1));
      col = mixRGB(col, C, clamp((f2(u * 4, v * 4) - 0.58) * 2.4, 0, 1) * 0.5);
      var g = (f1(u * 16, v * 16) - 0.5) * 16;
      return [col[0] + g, col[1] + g, col[2] + g];
    });
  }

  /* ---- madeira escura, veio ao longo de V ---- */
  function texWood(seed) {
    var f1 = fbm(seed + 11, 4), f2 = fbm(seed + 23, 3);
    var W_D = [46, 30, 19], W_M = [82, 55, 34], W_L = [116, 82, 52];
    return paint(64, function (u, v) {
      var warp = f1(u * 2, v * 2) * 0.45;
      var s = u * 6 + warp;
      var grain = 0.5 + 0.5 * Math.sin(s * Math.PI * 2);
      grain = Math.pow(grain, 2.1);
      var col = mixRGB(W_D, W_M, grain);
      col = mixRGB(col, W_L, clamp((f2(u * 8, v * 4) - 0.62) * 2.6, 0, 1) * 0.55);
      // no da madeira
      var k = f2(u * 4, v * 4);
      if (k < 0.16) col = mixRGB(col, [30, 19, 12], (0.16 - k) * 5.0);
      var g = (f1(u * 16, v * 16) - 0.5) * 14;
      return [col[0] + g, col[1] + g, col[2] + g];
    });
  }

  /* ---- telhas de barro escuro, fileiras alternadas ---- */
  function texTiles(seed) {
    var f1 = fbm(seed + 71, 4);
    var T_L = [98, 57, 37], T_M = [71, 40, 26], T_D = [50, 27, 17], T_VD = [29, 16, 10], T_HL = [113, 71, 47];
    var ROWS = 4, COLS = 4;
    return paint(128, function (u, v) {
      var rr = v * ROWS, r = Math.floor(rr), rv = rr - r;
      var off = (r % 2) ? 0.5 : 0.0;
      var cc = u * COLS + off, ci = Math.floor(cc), cf = cc - ci;
      var jit = hash1(ci * 5.3 + r * 11.7);
      var base = mixRGB(T_M, T_L, clamp(jit * 0.55 + f1(u * 4, v * 4) * 0.5 - 0.1, 0, 1));
      if (jit < 0.26) base = mixRGB(base, T_D, 0.45 + jit);
      // sombra de sobreposicao na base da fileira
      if (rv < 0.2) base = mixRGB(base, T_VD, 1 - rv / 0.2);
      else if (rv < 0.34) base = mixRGB(base, T_D, (0.34 - rv) / 0.14 * 0.5);
      // brilho no lombo da telha
      if (rv > 0.72) base = mixRGB(base, T_HL, (rv - 0.72) / 0.28 * 0.42);
      // junta vertical
      var vg = Math.min(cf, 1 - cf);
      if (vg < 0.03) base = mixRGB(base, T_VD, (1 - vg / 0.03) * 0.9);
      else if (vg < 0.09) base = mixRGB(base, T_HL, (vg - 0.03) / 0.06 * 0.16);
      // musgo
      var m = f1(u * 8, v * 8);
      if (m > 0.74) base = mixRGB(base, [72, 74, 48], (m - 0.74) * 2.2);
      var g = (f1(u * 16, v * 16) - 0.5) * 12;
      return [base[0] + g, base[1] + g, base[2] + g];
    });
  }

  /* ---- forro / taboas sob o telhado (fileiras horizontais) ---- */
  function texPlanks(seed) {
    var f1 = fbm(seed + 83, 4), f2 = fbm(seed + 29, 3);
    var A = [72, 52, 35], B = [104, 78, 52], C = [44, 31, 20];
    var ROWS = 4;
    return paint(64, function (u, v) {
      var rr = v * ROWS, r = Math.floor(rr), rv = rr - r;
      var bri = 0.8 + hash1(r * 3.1 + 0.5) * 0.4;
      var grain = 0.5 + 0.5 * Math.sin((u * 5 + hash1(r + 2.2)) * Math.PI * 2);
      var col = mixRGB(A, B, clamp(grain * 0.7 * bri + f1(u * 4, v * 4) * 0.4 - 0.15, 0, 1));
      var e = Math.min(rv, 1 - rv);
      if (e < 0.07) col = mixRGB(col, C, 1 - e / 0.07);
      col = mixRGB(col, C, clamp((f2(u * 8, v * 8) - 0.68) * 3.0, 0, 1) * 0.4);
      var g = (f1(u * 16, v * 16) - 0.5) * 12;
      return [col[0] + g, col[1] + g, col[2] + g];
    });
  }

  /* =========================================================
     4. CONSTRUTOR DE MALHA  (do pacote, verbatim)
     ========================================================= */
  function Builder(name) {
    this.name = name; this.pos = []; this.nrm = []; this.uv = []; this.col = [];
    this.idx = []; this.count = 0; this.aoFn = null;
  }
  Builder.prototype.ao = function (fn) { this.aoFn = fn; return this; };
  Builder.prototype.vert = function (p, n, uv) {
    this.pos.push(p[0], p[1], p[2]);
    this.nrm.push(n[0], n[1], n[2]);
    this.uv.push(uv[0], uv[1]);
    var a = this.aoFn ? this.aoFn(p[0], p[1], p[2], n[0], n[1], n[2]) : 1;
    this.col.push(a, a, a);
    return this.count++;
  };
  function faceNormal(p0, p1, p2) {
    var ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
    var bx = p2[0] - p1[0], by = p2[1] - p1[1], bz = p2[2] - p1[2];
    var nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    var l = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (l < 1e-9) return [0, 1, 0];
    return [nx / l, ny / l, nz / l];
  }
  Builder.prototype.quad = function (p0, p1, p2, p3, uvs, nrm) {
    var n = nrm || faceNormal(p0, p1, p2);
    var i0 = this.vert(p0, n, uvs[0]);
    var i1 = this.vert(p1, n, uvs[1]);
    var i2 = this.vert(p2, n, uvs[2]);
    var i3 = this.vert(p3, n, uvs[3]);
    this.idx.push(i0, i1, i2, i0, i2, i3);
  };
  Builder.prototype.tri = function (p0, p1, p2, uvs, nrm) {
    var n = nrm || faceNormal(p0, p1, p2);
    var i0 = this.vert(p0, n, uvs[0]);
    var i1 = this.vert(p1, n, uvs[1]);
    var i2 = this.vert(p2, n, uvs[2]);
    this.idx.push(i0, i1, i2);
  };
  Builder.prototype.isEmpty = function () { return this.count === 0; };
  Builder.prototype.geometry = function (THREE, useColor) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (useColor) g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    g.name = this.name;
    return g;
  };

  var FACE_DEF = {
    '+x': { ax: 'x', hi: 1, a1: 'z', a2: 'y', c: [[1, 0], [0, 0], [0, 1], [1, 1]], n: [1, 0, 0] },
    '-x': { ax: 'x', hi: 0, a1: 'z', a2: 'y', c: [[0, 0], [1, 0], [1, 1], [0, 1]], n: [-1, 0, 0] },
    '+y': { ax: 'y', hi: 1, a1: 'x', a2: 'z', c: [[0, 1], [1, 1], [1, 0], [0, 0]], n: [0, 1, 0] },
    '-y': { ax: 'y', hi: 0, a1: 'x', a2: 'z', c: [[0, 0], [1, 0], [1, 1], [0, 1]], n: [0, -1, 0] },
    '+z': { ax: 'z', hi: 1, a1: 'x', a2: 'y', c: [[0, 0], [1, 0], [1, 1], [0, 1]], n: [0, 0, 1] },
    '-z': { ax: 'z', hi: 0, a1: 'x', a2: 'y', c: [[1, 0], [0, 0], [0, 1], [1, 1]], n: [0, 0, -1] }
  };
  var ALL_FACES = ['+x', '-x', '+y', '-y', '+z', '-z'];

  // caixa alinhada aos eixos; UV vem das coordenadas do mundo (variedade de graca)
  function addBox(b, x0, y0, z0, x1, y1, z1, o) {
    o = o || {};
    var min = { x: Math.min(x0, x1), y: Math.min(y0, y1), z: Math.min(z0, z1) };
    var max = { x: Math.max(x0, x1), y: Math.max(y0, y1), z: Math.max(z0, z1) };
    var list = o.only || ALL_FACES;
    var skip = o.skip || [];
    var su = o.su || o.s || 1, sv = o.sv || o.s || 1;
    var uo = o.uo || 0, vo = o.vo || 0;
    var grain = o.grain || null;
    var div = o.div || 0;
    for (var k = 0; k < list.length; k++) {
      var key = list[k];
      if (skip.indexOf(key) >= 0) continue;
      var f = FACE_DEF[key];
      if (!f) continue;
      var a1 = f.a1, a2 = f.a2, uAx = a1, vAx = a2;
      if (grain === a1) { uAx = a2; vAx = a1; }
      var L1 = max[a1] - min[a1], L2 = max[a2] - min[a2];
      var n1 = div ? Math.max(1, Math.round(L1 / div)) : 1;
      var n2 = div ? Math.max(1, Math.round(L2 / div)) : 1;
      for (var i = 0; i < n1; i++) {
        for (var j = 0; j < n2; j++) {
          var lo = {}, hh = {};
          lo[a1] = min[a1] + L1 * i / n1; hh[a1] = min[a1] + L1 * (i + 1) / n1;
          lo[a2] = min[a2] + L2 * j / n2; hh[a2] = min[a2] + L2 * (j + 1) / n2;
          var fixed = f.hi ? max[f.ax] : min[f.ax];
          var pts = [], uvs = [];
          for (var c = 0; c < 4; c++) {
            var cc = f.c[c], p = {};
            p[f.ax] = fixed;
            p[a1] = cc[0] ? hh[a1] : lo[a1];
            p[a2] = cc[1] ? hh[a2] : lo[a2];
            pts.push([p.x, p.y, p.z]);
            uvs.push([p[uAx] / su + uo, p[vAx] / sv + vo]);
          }
          b.quad(pts[0], pts[1], pts[2], pts[3], uvs, f.n);
        }
      }
    }
  }

  // quad arbitrario subdividido (telhado). A->B = eixo s, A->D = eixo t
  function addQuadDiv(b, A, B, C, D, uvFn, n1, n2) {
    var nrm = faceNormal(A, B, C);
    function P(s, t) {
      var ab = [A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s, A[2] + (B[2] - A[2]) * s];
      var dc = [D[0] + (C[0] - D[0]) * s, D[1] + (C[1] - D[1]) * s, D[2] + (C[2] - D[2]) * s];
      return [ab[0] + (dc[0] - ab[0]) * t, ab[1] + (dc[1] - ab[1]) * t, ab[2] + (dc[2] - ab[2]) * t];
    }
    n1 = Math.max(1, n1 | 0); n2 = Math.max(1, n2 | 0);
    for (var i = 0; i < n1; i++) {
      for (var j = 0; j < n2; j++) {
        var p0 = P(i / n1, j / n2), p1 = P((i + 1) / n1, j / n2);
        var p2 = P((i + 1) / n1, (j + 1) / n2), p3 = P(i / n1, (j + 1) / n2);
        b.quad(p0, p1, p2, p3, [uvFn(p0), uvFn(p1), uvFn(p2), uvFn(p3)], nrm);
      }
    }
  }

  // triangulo subdividido em baricentricas (frontoes)
  function addTriDiv(b, A, B, C, uvFn, n) {
    var nrm = faceNormal(A, B, C);
    n = Math.max(1, n | 0);
    function P(i, j) {
      var wa = (n - i) / n, wb = (i - j) / n, wc = j / n;
      return [A[0] * wa + B[0] * wb + C[0] * wc, A[1] * wa + B[1] * wb + C[1] * wc, A[2] * wa + B[2] * wb + C[2] * wc];
    }
    for (var i = 0; i < n; i++) {
      for (var j = 0; j <= i; j++) {
        var a = P(i, j), bb = P(i + 1, j), cc = P(i + 1, j + 1);
        b.tri(a, bb, cc, [uvFn(a), uvFn(bb), uvFn(cc)], nrm);
        if (j < i) {
          var d = P(i, j + 1);
          b.tri(a, cc, d, [uvFn(a), uvFn(cc), uvFn(d)], nrm);
        }
      }
    }
  }

  // tabua inclinada (caibros, testeiras do frontao, travessa diagonal da porta)
  // aresta superior de (xa,ya) a (xb,yb) no plano XY, altura h para baixo, extrudada em Z
  function addSlopedBoard(b, xa, ya, xb, yb, z0, z1, h, s) {
    s = s || 1;
    var L = Math.sqrt((xb - xa) * (xb - xa) + (yb - ya) * (yb - ya));
    function t(x, y) { return Math.sqrt((x - xa) * (x - xa) + (y - ya) * (y - ya)) / s; }
    var A = [xa, ya, 0], B = [xb, yb, 0];
    // face +Z
    b.quad([xa, ya - h, z1], [xb, yb - h, z1], [xb, yb, z1], [xa, ya, z1],
      [[0, 0], [0, L / s], [h / s, L / s], [h / s, 0]]);
    // face -Z
    b.quad([xb, yb - h, z0], [xa, ya - h, z0], [xa, ya, z0], [xb, yb, z0],
      [[0, L / s], [0, 0], [h / s, 0], [h / s, L / s]]);
    // topo (voltado para cima/fora)
    b.quad([xa, ya, z1], [xb, yb, z1], [xb, yb, z0], [xa, ya, z0],
      [[0, 0], [0, L / s], [(z1 - z0) / s, L / s], [(z1 - z0) / s, 0]]);
    // base
    b.quad([xa, ya - h, z0], [xb, yb - h, z0], [xb, yb - h, z1], [xa, ya - h, z1],
      [[0, 0], [0, L / s], [(z1 - z0) / s, L / s], [(z1 - z0) / s, 0]]);
    // topos das pontas
    b.quad([xa, ya - h, z0], [xa, ya - h, z1], [xa, ya, z1], [xa, ya, z0],
      [[0, 0], [(z1 - z0) / s, 0], [(z1 - z0) / s, h / s], [0, h / s]]);
    b.quad([xb, yb - h, z1], [xb, yb - h, z0], [xb, yb, z0], [xb, yb, z1],
      [[0, 0], [(z1 - z0) / s, 0], [(z1 - z0) / s, h / s], [0, h / s]]);
    return { A: A, B: B, L: L };
  }

  /* =========================================================
     5. OCLUSAO ASSADA NOS VERTICES (do pacote, verbatim)
        aoDoor ficou de fora: a folha agora e a porta do jogo.
     ========================================================= */
  var AO_IN = 1.0;   // multiplicador da luz assada do interior

  function aoExterior(x, y, z) {
    var a = 1.0;
    if (y <= WH) {
      // sombra projetada pelo beiral, so na faixa alta da parede
      a *= mix(0.62, 1.0, clamp((WH - y) / 0.7, 0, 1));
    } else {
      // frontao: sombra apenas junto da agua do telhado, o meio fica claro
      var dr = underRoofY(x) - y;
      a *= mix(0.66, 1.0, clamp(dr / 0.5, 0, 1));
    }
    a *= mix(0.78, 1.0, clamp(y / 0.5, 0, 1));       // escurece no rodape
    return a;
  }
  function aoInterior(x, y, z) {
    var a = 0.48 * AO_IN;
    a *= mix(0.70, 1.0, clamp(y / 1.7, 0, 1));
    var door = clamp(1 - (IZ - z) / 3.4, 0, 1);      // luz que entra pela porta
    return a * (1 + door * 0.55);
  }
  function aoFloor(x, y, z) {
    var d = Math.min(IX - Math.abs(x), IZ - Math.abs(z));
    var a = mix(0.30, 0.58, clamp(d / 0.85, 0, 1)) * AO_IN;
    a *= 1 + 0.7 * clamp(1 - (IZ - z) / 3.2, 0, 1);
    return a;
  }
  function aoRoofTop(x, y, z) {
    var a = 1.0;
    a *= mix(0.86, 1.0, clamp((RZ - Math.abs(z)) / 0.6, 0, 1));
    return a;
  }
  function aoRoofUnder(x, y, z) {
    var inside = Math.abs(x) < EX + 0.02 && Math.abs(z) < EZ + 0.02;
    var a = inside ? 0.42 * AO_IN : 0.5;
    if (!inside) a *= mix(1.0, 0.62, clamp((EX + 0.1 - Math.abs(x)) / 0.45, 0, 1));
    return a;
  }
  function aoTimberExt(x, y, z) { return aoExterior(x, y, z) * 0.96; }
  function aoTimberInt(x, y, z) { return 0.42 * AO_IN * mix(0.7, 1.0, clamp(y / 2.2, 0, 1)); }

  /* =========================================================
     6. MONTAGEM DO GALPAO (do pacote, verbatim, menos o piso)
     ========================================================= */
  var PL_U = 2.4;     // metros por tile horizontal do reboco externo
  var IN_S = 1.6;     // escala do reboco interno
  var WD_S = 0.75;    // escala da madeira
  var TL_S = 1.56;    // escala das telhas (fileira ~39 cm, como na referencia)
  var PK_S = 1.10;    // escala das taboas do forro
  var CM_S = 1.70;    // escala do cimento

  function buildStatic() {
    // Os builders do pacote, menos os dois que sairam nas trocas (o cimento do
    // piso e o ferro, que so existia nas ferragens das folhas de taboas), mais
    // o do piso de madeira.
    var B = {
      plasterExt: new Builder('galpao_reboco_ext'),
      plasterInt: new Builder('galpao_reboco_int'),
      wood: new Builder('galpao_madeira'),
      woodDark: new Builder('galpao_madeira_escura'),
      tiles: new Builder('galpao_telhas'),
      planks: new Builder('galpao_forro'),
      floor: new Builder('galpao_piso_madeira')
    };
    /* ---- 6.1 PAREDES (anel oco) ---- */
    B.plasterExt.ao(aoExterior);
    B.plasterInt.ao(aoInterior);
    // lateral esquerda (-X) e direita (+X): atravessam toda a profundidade
    addBox(B.plasterExt, -EX, 0, -EZ, -IX, WH, EZ, { only: ['-x', '+z', '-z'], su: PL_U, sv: WH, grain: 'y', div: 0.8 });
    addBox(B.plasterInt, -EX, 0, -EZ, -IX, WH, EZ, { only: ['+x', '+y'], s: IN_S, div: 0.9 });
    addBox(B.plasterExt, IX, 0, -EZ, EX, WH, EZ, { only: ['+x', '+z', '-z'], su: PL_U, sv: WH, grain: 'y', div: 0.8 });
    addBox(B.plasterInt, IX, 0, -EZ, EX, WH, EZ, { only: ['-x', '+y'], s: IN_S, div: 0.9 });
    // fundo (-Z)
    addBox(B.plasterExt, -IX, 0, -EZ, IX, WH, -IZ, { only: ['-z'], su: PL_U, sv: WH, grain: 'y', div: 0.8 });
    addBox(B.plasterInt, -IX, 0, -EZ, IX, WH, -IZ, { only: ['+z', '+y'], s: IN_S, div: 0.9 });
    // frente (+Z): dois painheis laterais + verga sobre a porta
    addBox(B.plasterExt, -IX, 0, IZ, -HX, WH, EZ, { only: ['+z'], su: PL_U, sv: WH, grain: 'y', div: 0.7 });
    addBox(B.plasterInt, -IX, 0, IZ, -HX, WH, EZ, { only: ['-z', '+x', '+y'], s: IN_S, div: 0.9 });
    addBox(B.plasterExt, HX, 0, IZ, IX, WH, EZ, { only: ['+z'], su: PL_U, sv: WH, grain: 'y', div: 0.7 });
    addBox(B.plasterInt, HX, 0, IZ, IX, WH, EZ, { only: ['-z', '-x', '+y'], s: IN_S, div: 0.9 });
    addBox(B.plasterExt, -HX, DIM.DOOR_H + 0.16, IZ, HX, WH, EZ, { only: ['+z'], su: PL_U, sv: WH, grain: 'y', div: 0.7 });
    addBox(B.plasterInt, -HX, DIM.DOOR_H + 0.16, IZ, HX, WH, EZ, { only: ['-z'], s: IN_S, div: 0.9 });
    // miolo da verga: fecha o trecho atras da tabua de madeira, sobre o vao
    addBox(B.plasterInt, -HX, DIM.DOOR_H, IZ, HX, DIM.DOOR_H + 0.16, EZ - 0.021, { only: ['-z', '-y'], s: IN_S, div: 0.9 });

    /* ---- 6.2 FRONTOES (triangulos sobre as paredes) ---- */
    var gableUvExt = function (p) { return [p[0] / PL_U, 0.58 + (p[1] - WH) / DIM.RISE * 0.34]; };
    var gableUvInt = function (p) { return [p[0] / IN_S, p[1] / IN_S]; };
    // frente: externo em +EZ, interno em +IZ
    addTriDiv(B.plasterExt, [-EX, WH, EZ], [EX, WH, EZ], [0, PEAK, EZ], gableUvExt, 4);
    addTriDiv(B.plasterInt, [-EX, WH, IZ], [0, PEAK, IZ], [EX, WH, IZ], gableUvInt, 4);
    // fundo: externo em -EZ, interno em -IZ
    addTriDiv(B.plasterExt, [EX, WH, -EZ], [-EX, WH, -EZ], [0, PEAK, -EZ], gableUvExt, 4);
    addTriDiv(B.plasterInt, [EX, WH, -IZ], [0, PEAK, -IZ], [-EX, WH, -IZ], gableUvInt, 4);

    /* ---- 6.3 ESTRUTURA DE MADEIRA APARENTE ---- */
    B.wood.ao(aoTimberExt);
    var PSZ = 0.19, PPR = 0.05;   // largura do pilar e quanto ele sobressai
    var corners = [[-EX, -EZ], [EX, -EZ], [-EX, EZ], [EX, EZ]];
    for (var ci = 0; ci < corners.length; ci++) {
      var cx = corners[ci][0], cz = corners[ci][1];
      var sx = cx < 0 ? 1 : -1, sz = cz < 0 ? 1 : -1;
      addBox(B.wood, cx + PPR * -sx, 0, cz + PPR * -sz, cx + sx * PSZ, WH, cz + sz * PSZ,
        { s: WD_S, grain: 'y', div: 1.2, skip: ['-y'] });
    }
    // pilar central no fundo
    addBox(B.wood, -0.11, 0, -EZ - PPR, 0.11, WH, -EZ, { s: WD_S, grain: 'y', div: 1.2, skip: ['-y', '+z'] });
    // frechal (viga de topo) nas quatro faces
    var TP_Y0 = WH - 0.17;
    addBox(B.wood, -EX - PPR, TP_Y0, -EZ - PPR, -EX, WH, EZ + PPR, { s: WD_S, grain: 'z', div: 1.2, skip: ['+x'] });
    addBox(B.wood, EX, TP_Y0, -EZ - PPR, EX + PPR, WH, EZ + PPR, { s: WD_S, grain: 'z', div: 1.2, skip: ['-x'] });
    addBox(B.wood, -EX, TP_Y0, -EZ - PPR, EX, WH, -EZ, { s: WD_S, grain: 'x', div: 1.2, skip: ['+z'] });
    addBox(B.wood, -EX, TP_Y0, EZ, EX, WH, EZ + PPR, { s: WD_S, grain: 'x', div: 1.2, skip: ['-z'] });
    // batentes e verga da porta
    addBox(B.wood, -HX - 0.13, 0, EZ - 0.02, -HX, DIM.DOOR_H + 0.16, EZ + 0.045, { s: WD_S, grain: 'y', div: 1.1, skip: ['-y'] });
    addBox(B.wood, HX, 0, EZ - 0.02, HX + 0.13, DIM.DOOR_H + 0.16, EZ + 0.045, { s: WD_S, grain: 'y', div: 1.1, skip: ['-y'] });
    addBox(B.wood, -HX - 0.13, DIM.DOOR_H, EZ - 0.02, HX + 0.13, DIM.DOOR_H + 0.16, EZ + 0.045, { s: WD_S, grain: 'x', div: 1.0, skip: ['-y'] });

    /* ---- 6.4 TELHADO ---- */
    // faces superiores (telhas): u corre em Z, v sobe a rampa
    B.tiles.ao(aoRoofTop);
    var T = DIM.ROOF_T;
    function slopeUv(xe, ye) {
      return function (p) {
        var t = Math.sqrt((p[0] - xe) * (p[0] - xe) + (p[1] - ye) * (p[1] - ye));
        return [p[2] / TL_S, t / TL_S];
      };
    }
    // rampa esquerda, topo
    addQuadDiv(B.tiles,
      [-RX, EAVE_Y + T, RZ], [0, PEAK + T, RZ], [0, PEAK + T, -RZ], [-RX, EAVE_Y + T, -RZ],
      slopeUv(-RX, EAVE_Y + T), 5, 7);
    // rampa direita, topo
    addQuadDiv(B.tiles,
      [0, PEAK + T, RZ], [RX, EAVE_Y + T, RZ], [RX, EAVE_Y + T, -RZ], [0, PEAK + T, -RZ],
      slopeUv(RX, EAVE_Y + T), 5, 7);
    // faces inferiores (forro de taboas)
    B.planks.ao(aoRoofUnder);
    function underUv(xe, ye) {
      return function (p) {
        var t = Math.sqrt((p[0] - xe) * (p[0] - xe) + (p[1] - ye) * (p[1] - ye));
        return [p[2] / PK_S, t / PK_S];
      };
    }
    addQuadDiv(B.planks,
      [-RX, EAVE_Y, -RZ], [0, PEAK, -RZ], [0, PEAK, RZ], [-RX, EAVE_Y, RZ],
      underUv(-RX, EAVE_Y), 5, 7);
    addQuadDiv(B.planks,
      [0, PEAK, -RZ], [RX, EAVE_Y, -RZ], [RX, EAVE_Y, RZ], [0, PEAK, RZ],
      underUv(RX, EAVE_Y), 5, 7);
    // testeiras do beiral (madeira escura)
    B.woodDark.ao(aoTimberExt);
    addBox(B.woodDark, -RX - 0.06, EAVE_Y - 0.055, -RZ, -RX, EAVE_Y + T, RZ, { s: WD_S, grain: 'z', div: 1.2, skip: ['+x'] });
    addBox(B.woodDark, RX, EAVE_Y - 0.055, -RZ, RX + 0.06, EAVE_Y + T, RZ, { s: WD_S, grain: 'z', div: 1.2, skip: ['-x'] });
    // tabeiras do frontao: a moldura escura inclinada que aparece na imagem
    var BB_H = 0.235;
    var bbZ = [[RZ, RZ + 0.075], [-RZ - 0.075, -RZ]];
    for (var bi = 0; bi < 2; bi++) {
      addSlopedBoard(B.woodDark, -RX, EAVE_Y + T, 0, PEAK + T, bbZ[bi][0], bbZ[bi][1], BB_H, WD_S);
      addSlopedBoard(B.woodDark, RX, EAVE_Y + T, 0, PEAK + T, bbZ[bi][0], bbZ[bi][1], BB_H, WD_S);
    }
    // cumeeira
    addBox(B.woodDark, -0.17, PEAK + T - 0.045, -RZ - 0.075, 0.17, PEAK + T + 0.10, RZ + 0.075,
      { s: WD_S, grain: 'z', div: 1.2, skip: ['-y'] });

    /* ---- 6.5 ESTRUTURA INTERNA DO TELHADO (caibros, cumeeira, tirantes) ---- */
    B.woodDark.ao(aoTimberInt);
    var rz = [-IZ + 0.28, -1.05, 0, 1.05, IZ - 0.28];
    for (var ri = 0; ri < rz.length; ri++) {
      var z0 = rz[ri] - 0.05, z1 = rz[ri] + 0.05;
      addSlopedBoard(B.woodDark, -EX, WH, -0.02, PEAK - 0.015, z0, z1, 0.115, WD_S);
      addSlopedBoard(B.woodDark, EX, WH, 0.02, PEAK - 0.015, z0, z1, 0.115, WD_S);
    }
    addBox(B.woodDark, -0.075, PEAK - 0.18, -IZ, 0.075, PEAK - 0.01, IZ, { s: WD_S, grain: 'z', div: 1.2, skip: ['+y'] });
    var tieY = 3.28, tieX = (PEAK - tieY) / SLOPE;
    addBox(B.woodDark, -tieX, tieY - 0.13, -1.32, tieX, tieY, -1.2, { s: WD_S, grain: 'x', div: 1.1 });
    addBox(B.woodDark, -tieX, tieY - 0.13, 1.2, tieX, tieY, 1.32, { s: WD_S, grain: 'x', div: 1.1 });


    /* ---- 6.6 PISO DE MADEIRA (a troca pedida: no pacote era cimento) ---- */
    // Mesma geometria de piso do pacote - a laje interna, a soleira do vao e a
    // testeira dela -, trocando so a textura de cimento pela MADEIRA DO CHAO DA
    // CASA e a escala de UV pela do piso dos comodos (ver FLOOR_TILE). A
    // subdivisao de 62 cm e a do pacote: e ela que da vertice suficiente para a
    // luz assada do interior nao virar um degrade grosseiro.
    B.floor.ao(aoFloor);
    addBox(B.floor, -IX, 0, -IZ, IX, FLOOR_Y, IZ, { only: ['+y'], s: FLOOR_TILE, div: 0.62 });
    addBox(B.floor, -HX, 0, IZ, HX, FLOOR_Y, EZ + 0.02, { only: ['+y'], s: FLOOR_TILE, div: 0.62 });
    addBox(B.floor, -HX, 0, EZ, HX, FLOOR_Y, EZ + 0.02, { only: ['+z'], s: FLOOR_TILE, div: 0.62 });

    return B;
  }

  /* =========================================================
     7. TEXTURAS -> three (na receita do JOGO)
     ========================================================= */
  // O pacote entrega as texturas com mipmap ligado. Aqui elas entram na receita
  // de TODAS as texturas do jogo (ver toThreeTexture em materials/textures.js):
  // CanvasTexture, wrap repetido nos dois eixos, filtro NEAREST e mipmap
  // DESLIGADO - o pixel cru do PS1. Nada de TextureLoader e nada para baixar:
  // os cinco desenhos nascem em canvas.
  function gameTexture(canvas) {
    var t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.anisotropy = 1;
    t.needsUpdate = true;
    return t;
  }

  // As texturas nascem UMA vez e sao reaproveitadas (hoje ha um galpao; o
  // proprio pacote recomenda compartilhar). O piso NAO vem do pacote: e a
  // madeira do chao da casa, com repeat 1x1 porque aqui a repeticao vive no UV
  // da geometria (ver FLOOR_TILE).
  var sharedTextures = null;

  function getTextures() {
    if (!sharedTextures) {
      sharedTextures = {
        plasterExt: gameTexture(texPlasterExt(SEED)),
        plasterInt: gameTexture(texPlasterInt(SEED)),
        wood: gameTexture(texWood(SEED)),
        tiles: gameTexture(texTiles(SEED)),
        planks: gameTexture(texPlanks(SEED)),
        floor: window.PsxTextures.createWoodTexture(1, 1)
      };
    }
    return sharedTextures;
  }

  /* =========================================================
     8. MATERIAIS DO JOGO (nada de ShaderMaterial)
     ========================================================= */
  // De noite: MeshStandardMaterial, que reage as luzes da cena como todo o
  // resto do jogo. `vertexColors` liga a oclusao assada da secao 5 - e ela que
  // da volume ao galpao sem uma unica sombra dinamica.
  function nightMaterial(name, map, tint) {
    var m = new THREE.MeshStandardMaterial({
      map: map,
      color: tint === undefined ? 0xffffff : tint,
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      side: THREE.FrontSide
    });
    m.name = name;
    return m;
  }

  // Versao de DIA de QUALQUER material do galpao (inclusive os dois que vem da
  // porta do jogo): MeshBasicMaterial obrigatorio, pelo mesmo motivo do carro,
  // da grama e do telhado - nao existe sol de verdade na cena, e um objeto
  // iluminado no meio de um cenario chapado apareceria PRETO. Mesma textura,
  // mesmo lado, nevoa ligada, e o tom do amanhecer multiplicado pela cor de
  // noite (o reboco interno e a madeira escura tem tinta propria, e ela nao se
  // perde no caminho).
  function dayMaterialFor(mat, cache) {
    if (cache.has(mat)) {
      return cache.get(mat);
    }
    var color = new THREE.Color(DAY_TINT);
    if (mat.color) {
      color.multiply(mat.color);
    }
    var made = new THREE.MeshBasicMaterial({
      map: mat.map || null,
      color: color,
      vertexColors: !!mat.vertexColors,
      side: mat.side,
      alphaTest: mat.alphaTest,
      transparent: false,
      fog: true
    });
    made.name = (mat.name || "galpao") + "-dia";
    cache.set(mat, made);
    return made;
  }

  /* =========================================================
     9. MONTAGEM
     ========================================================= */
  function applyTimeOfDay(state) {
    state.swaps.forEach(function (item) {
      item.mesh.material = state.day ? item.day : item.night;
    });
  }

  function addMesh(parent, builder, material, name) {
    if (builder.isEmpty()) {
      return null;
    }
    var mesh = new THREE.Mesh(builder.geometry(THREE, true), material);
    mesh.name = name;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    parent.add(mesh);
    return mesh;
  }

  // ---------- As duas folhas: a PORTA DO JOGO ----------
  // Uma chamada de DoorFactory.createDoor por folha, com as duas opcoes que
  // esta peca precisa (e que nao mudam NADA nas portas de dentro da casa - as
  // duas so existem quando pedidas):
  //   frame: false    - o galpao ja tem batente e verga de madeira proprios, do
  //                     pacote. Duas molduras do jogo lado a lado se
  //                     atropelariam no meio do vao.
  //   outline: false  - peca decorativa: nao entra em `interactables`, entao nao
  //                     existe contorno de destaque para acender.
  // A folha da DIREITA e espelhada em X (scale.x negativo, o MESMO truque que o
  // pacote usava): assim as duas macanetas ficam no MEIO do vao, como em
  // qualquer porta de duas folhas, em vez de as duas no mesmo lado.
  function addDoorLeaves(group, materials, prefix) {
    if (!window.DoorFactory) {
      return;
    }
    // Z do grupo da folha: a face externa dela cai exatamente no plano em que o
    // pacote punha a folha de taboas (DOOR_Z, 4 cm atras do reboco). Derivado
    // da propria porta do jogo (a folha nasce recuada PANEL_RECESS dentro do
    // grupo dela), nao escrito na mao.
    var faceZ = (DOOR_MODEL.DOOR_DEPTH / 2 - DOOR_MODEL.PANEL_RECESS) * DOOR_SCALE;
    for (var s = 0; s < 2; s++) {
      var door = window.DoorFactory.createDoor(materials, {
        frame: false,
        outline: false
      });
      var leaf = door.group;
      leaf.name = prefix + (s === 0 ? "-folha-esquerda" : "-folha-direita");
      leaf.position.set((s === 0 ? -1 : 1) * (LEAF_W / 2), 0, DOOR_Z - faceZ);
      leaf.scale.set((s === 0 ? 1 : -1) * DOOR_SCALE, DOOR_SCALE, DOOR_SCALE);
      group.add(leaf);
    }
  }

  /**
   * Monta o galpao. `materials` e a biblioteca de materiais do jogo (ver
   * materials/material-library.js): dela saem a folha da porta (doorPanel) e a
   * macaneta (lampMetal). Quem chama e a tabela YARD_MODELS de
   * scenes/corridor-scene.js.
   */
  function createShed(materials) {
    var group = new THREE.Group();
    // Nome estavel: e por ele que o Editor identifica a peca e guarda as
    // alteracoes de posicao/rotacao/escala do usuario (ver "Identidade dos
    // objetos" em editor/README.md e o rotulo em editor/editor-registry.js).
    group.name = "ShedPSX";

    var textures = getTextures();
    var mats = {
      plasterExt: nightMaterial("galpao-reboco-externo", textures.plasterExt, 0xffffff),
      plasterInt: nightMaterial("galpao-reboco-interno", textures.plasterInt, 0xf2efe6),
      wood: nightMaterial("galpao-madeira", textures.wood, 0xffffff),
      woodDark: nightMaterial("galpao-madeira-escura", textures.wood, 0xb9a99a),
      tiles: nightMaterial("galpao-telhas", textures.tiles, 0xffffff),
      planks: nightMaterial("galpao-forro", textures.planks, 0xffffff),
      floor: nightMaterial("galpao-piso-madeira", textures.floor, 0xffffff)
    };

    var shell = new THREE.Group();
    shell.name = "galpao-casca";
    group.add(shell);

    var B = buildStatic();
    addMesh(shell, B.plasterExt, mats.plasterExt, "galpao-paredes-externas");
    addMesh(shell, B.plasterInt, mats.plasterInt, "galpao-paredes-internas");
    addMesh(shell, B.wood, mats.wood, "galpao-estrutura-madeira");
    addMesh(shell, B.woodDark, mats.woodDark, "galpao-telhado-madeira");
    addMesh(shell, B.tiles, mats.tiles, "galpao-telhas");
    addMesh(shell, B.planks, mats.planks, "galpao-forro");
    addMesh(shell, B.floor, mats.floor, "galpao-piso-madeira");

    addDoorLeaves(group, materials, "galpao");

    // Noite (o material de cada malha) e dia (o chapado equivalente), por malha
    // - inclusive as duas folhas da porta do jogo, que passam pelo MESMO
    // caminho. O cache garante UM material de dia por material de noite, e nao
    // um por malha. Os materiais da biblioteca (doorPanel, lampMetal) nao sao
    // tocados: quem troca e a malha, nunca o material compartilhado.
    var state = { day: false, swaps: [] };
    var dayCache = new Map();
    group.traverse(function (node) {
      if (!node.isMesh || !node.material || Array.isArray(node.material)) {
        return;
      }
      state.swaps.push({
        mesh: node,
        night: node.material,
        day: dayMaterialFor(node.material, dayCache)
      });
    });
    applyTimeOfDay(state);

    return {
      group: group,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      depth: FINAL_DEPTH,
      // Mesmo contrato de tudo que vive do lado de fora (a cena empurra isto em
      // exteriorGrounds, ver scenes/corridor-scene.js).
      setDaytime: function (daytime) {
        state.day = daytime !== false;
        applyTimeOfDay(state);
      },
      setMorning: function () {
        state.day = true;
        applyTimeOfDay(state);
      }
    };
  }

  return {
    createShed: createShed,
    // Expostas pelo mesmo motivo das outras fabricas: quem posiciona a peca nao
    // precisa esperar nem remedir nada.
    DIM: DIM,
    WIDTH: FINAL_WIDTH,
    DEPTH: FINAL_DEPTH,
    HEIGHT: FINAL_HEIGHT
  };
})();
