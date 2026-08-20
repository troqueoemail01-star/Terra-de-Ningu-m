/**
 * models/graffiti-factory.js
 * -------------------------------------------------
 * PICHACAO NA FACHADA. Pedido do jogador sobre a imagem de referencia:
 * na parede da frente da ala direita da casa (a que da para o quintal,
 * ver o circulo vermelho da marcacao), a frase "No man's land" pichada -
 * "bem abstrata e estranha, para dar impressao que foi pichado por uma
 * pessoa. Nao pode ficar toda certinha".
 *
 * ---------- Por que NAO tem fonte nenhuma aqui ----------
 * Escrever com `ctx.font` (o que a placa das portas faz, ver
 * models/sign-factory.js) daria exatamente o que o pedido proibe: uma
 * linha reta, com todas as letras do mesmo tamanho, na mesma altura e
 * com a mesma espessura de traco - texto de placa, nao de spray.
 *
 * Aqui cada letra e um punhado de TRACOS a mao (ver GLYPHS): uma tabela
 * de linhas quebradas num quadrado 1x1, que a fabrica desenha com
 * curvas, e cada ponto delas leva um empurrao aleatorio antes de virar
 * pixel. Em cima disso, e sempre por sorteio:
 *
 *   - cada letra tem o proprio tamanho, a propria inclinacao e a propria
 *     altura de linha de base (nenhuma letra alinhada com a vizinha);
 *   - cada traco e pintado em duas ou tres PASSADAS ligeiramente
 *     deslocadas, como quem passa o spray de novo em cima do que ja fez;
 *   - a espessura varia dentro do proprio traco;
 *   - a tinta ESCORRE: pingos verticais nascem de pontos aleatorios dos
 *     tracos e terminam numa gota;
 *   - sai respingo fino de spray em volta de tudo (overspray);
 *   - e ainda entram rabiscos SEM SIGNIFICADO - riscos cruzando a frase,
 *     um circulo torto por cima e marcas soltas -, que sao o que faz a
 *     parede parecer pichada e nao rotulada.
 *
 * A frase fica em DUAS linhas ("NO MAN'S" em cima, "LAND" embaixo, mais
 * torta e maior), porque e assim que alguem escreve com o braco numa
 * parede alta: a segunda linha nunca sai do mesmo tamanho da primeira.
 *
 * ---------- Sorteio com semente ----------
 * Nada de Math.random: o sorteio usa mulberry32 com semente de texto
 * (mesma receita do gramado e dos canteiros, ver
 * models/grass-field-factory.js). A pichacao e SEMPRE a mesma - ela nao
 * pode se redesenhar cada vez que o jogador entra e sai do quarto e a
 * cena e remontada (ver cutscenes/room-transition.js).
 *
 * ---------- Como ela encosta na parede ----------
 * Um plano so, com a textura de canvas em cima e alphaTest: a parte sem
 * tinta e DESCARTADA no fragmento, em vez de virar um retangulo
 * semitransparente por cima do reboco. E o que faz a pichacao se
 * comportar como pintura na parede e nao como adesivo.
 *
 * Quem posiciona e a cena (ver o bloco "Pichacao da fachada" em
 * scenes/corridor-scene.js), com a MESMA regra de sempre das pecas de
 * fora: o plano vai 1.5 cm a frente do revestimento externo daquela
 * parede (que por sua vez esta 2 cm a frente do plano dela, ver
 * CLADDING_GAP em models/exterior-factory.js). Nada coplanar, nada
 * dentro da casa.
 *
 * ---------- Noite e dia ----------
 * Contrato de sempre do exterior (`setDaytime`/`setMorning`, ver
 * createGroundPlane em models/exterior-factory.js): entra na lista
 * `exteriorGrounds` da cena e amanhece junto com a fachada, trocando
 * material por malha.
 * -------------------------------------------------
 */

window.GraffitiFactory = (function () {
  // ---------- Os tracos de cada letra ----------
  // Cada letra e uma lista de linhas quebradas, em coordenadas 0..1 (x da
  // esquerda para a direita, y de BAIXO para cima). Sao tracos de mao
  // livre de proposito: o "O" nao e um circulo, e um laco que fecha mal;
  // o "S" e um ziguezague amaciado; o "D" tem a barriga em quatro pontos.
  const GLYPHS = {
    N: {
      advance: 1,
      strokes: [
        [[0.05, 0], [0.02, 1]],
        [[0.02, 1], [0.9, 0.05]],
        [[0.88, 0], [0.92, 1]],
      ],
    },
    O: {
      advance: 1,
      strokes: [
        [
          [0.5, 1.02],
          [0.94, 0.72],
          [0.88, 0.22],
          [0.44, -0.02],
          [0.04, 0.28],
          [0.12, 0.78],
          [0.56, 1.0],
        ],
      ],
    },
    M: {
      advance: 1.25,
      strokes: [[[0.02, 0], [0.1, 1], [0.5, 0.32], [0.86, 1], [0.96, 0.02]]],
    },
    A: {
      advance: 1,
      strokes: [
        [[0.02, 0], [0.46, 1], [0.94, 0.02]],
        [[0.16, 0.34], [0.78, 0.4]],
      ],
    },
    S: {
      advance: 0.95,
      strokes: [
        [
          [0.92, 0.84],
          [0.46, 1.02],
          [0.06, 0.76],
          [0.42, 0.5],
          [0.8, 0.42],
          [0.9, 0.16],
          [0.42, -0.02],
          [0.04, 0.16],
        ],
      ],
    },
    L: {
      advance: 0.85,
      strokes: [[[0.16, 1], [0.08, 0.06], [0.88, 0.0]]],
    },
    D: {
      advance: 1,
      strokes: [
        [[0.06, 0], [0.03, 1]],
        [[0.03, 1], [0.62, 0.92], [0.94, 0.48], [0.6, 0.06], [0.06, 0]],
      ],
    },
    "'": {
      advance: 0.34,
      strokes: [[[0.6, 1.02], [0.3, 0.6]]],
    },
    " ": { advance: 0.5, strokes: [] },
  };

  // Semente estavel (ver "Sorteio com semente" no topo).
  function hashSeed(value) {
    const text = String(value === undefined ? "pichacao" : value);
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

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

  // ---------- As tintas ----------
  // Preto sujo com um fundo de vermelho oxidado: spray velho numa parede
  // de reboco. Nao e preto puro em lugar nenhum - preto chapado nao
  // existe em nenhuma textura deste jogo.
  const INK = "rgba(34, 25, 21, ";
  const INK_RED = "rgba(92, 30, 24, ";

  function drawStroke(ctx, points, rng, width, alpha, color) {
    if (points.length < 2) {
      return;
    }
    ctx.strokeStyle = (color || INK) + alpha + ")";
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    // Curvas quadraticas pelos pontos medios: e o que tira o aspecto de
    // "linha de poligono" e deixa o traco com cara de braco humano.
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i][0] + points[i + 1][0]) / 2;
      const my = (points[i][1] + points[i + 1][1]) / 2;
      ctx.quadraticCurveTo(points[i][0], points[i][1], mx, my);
    }
    const last = points[points.length - 1];
    ctx.quadraticCurveTo(last[0], last[1], last[0], last[1]);
    ctx.stroke();
  }

  // Pingo de tinta escorrendo: uma linha fina para baixo e uma gota na
  // ponta. Em canvas, +Y e para BAIXO - o escorrido acompanha a gravidade
  // da parede de verdade.
  function drawDrip(ctx, x, y, rng) {
    const length = 4 + rng() * 22;
    const width = 1 + rng() * 2.2;
    ctx.strokeStyle = INK + (0.5 + rng() * 0.35) + ")";
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rng() - 0.5) * 3, y + length * 0.6, x + (rng() - 0.5) * 4, y + length);
    ctx.stroke();
    ctx.fillStyle = INK + (0.55 + rng() * 0.3) + ")";
    ctx.beginPath();
    ctx.arc(x + (rng() - 0.5) * 3, y + length, width * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------- Uma letra ----------
  // `box` e a caixa dela em pixels do canvas ({x, y, w, h}, y no TOPO).
  // A letra nasce inclinada, fora do eixo, e cada ponto dos tracos leva
  // um empurrao: e daqui que vem o "nao pode ficar toda certinha".
  function drawGlyph(ctx, glyph, box, rng, ink) {
    const tilt = (rng() - 0.5) * 0.55;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const jitter = Math.min(box.w, box.h) * 0.09;

    function place(u, v, extra) {
      const lx = (u - 0.5) * box.w;
      const ly = (0.5 - v) * box.h;
      const jx = (rng() - 0.5) * jitter + (extra ? extra[0] : 0);
      const jy = (rng() - 0.5) * jitter + (extra ? extra[1] : 0);
      return [cx + lx * cos - ly * sin + jx, cy + lx * sin + ly * cos + jy];
    }

    glyph.strokes.forEach(function (stroke) {
      // Duas ou tres PASSADAS do mesmo traco, deslocadas: e o que da o
      // aspecto de spray repassado, sem precisar de nenhum filtro.
      const passes = 2 + (rng() < 0.45 ? 1 : 0);
      for (let p = 0; p < passes; p++) {
        const offset = [(rng() - 0.5) * 3.2, (rng() - 0.5) * 3.2];
        const points = stroke.map(function (point) {
          return place(point[0], point[1], offset);
        });
        const width = box.h * (0.1 + rng() * 0.07) * (p === 0 ? 1 : 0.75);
        const alpha = p === 0 ? 0.82 + rng() * 0.15 : 0.28 + rng() * 0.3;
        const color = p > 0 && rng() < 0.35 ? INK_RED : INK;
        drawStroke(ctx, points, rng, width, alpha, color);
        if (p === 0) {
          points.forEach(function (point) {
            ink.push(point);
          });
        }
      }
    });
  }

  // ---------- Uma linha da frase ----------
  function drawLine(ctx, text, rng, layout, ink) {
    const chars = String(text).toUpperCase().split("");
    let total = 0;
    chars.forEach(function (ch) {
      const glyph = GLYPHS[ch];
      total += glyph ? glyph.advance : GLYPHS[" "].advance;
    });
    if (total <= 0) {
      return;
    }

    const unit = layout.w / total;
    let cursor = layout.x;

    chars.forEach(function (ch) {
      const glyph = GLYPHS[ch];
      if (!glyph) {
        // Letra que a tabela de tracos nao conhece: avisa e segue sem
        // ela, em vez de deixar um buraco silencioso na frase.
        if (typeof console !== "undefined" && console.warn) {
          console.warn(
            "[pichacao] a letra " +
              ch +
              " nao tem traco em GLYPHS (models/graffiti-factory.js) e foi pulada."
          );
        }
        cursor += unit * GLYPHS[" "].advance;
        return;
      }
      const advance = unit * glyph.advance;
      if (glyph.strokes.length) {
        const scale = 1 + (rng() - 0.5) * 0.34;
        const h = layout.h * scale;
        const w = advance * (0.78 + rng() * 0.22);
        const y =
          layout.y - (h - layout.h) / 2 + (rng() - 0.5) * layout.h * 0.22;
        drawGlyph(ctx, glyph, { x: cursor, y: y, w: w, h: h }, rng, ink);
      }
      cursor += advance;
    });
  }

  // ---------- Os rabiscos sem significado ----------
  // O que faz a parede parecer PICHADA: riscos cruzando a frase, um
  // circulo torto por cima de nada e marcas soltas. Sem eles, o desenho
  // continua lendo como "texto na parede".
  function drawScribbles(ctx, width, height, rng, ink) {
    const slashes = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < slashes; i++) {
      const x0 = rng() * width * 0.5;
      const y0 = rng() * height;
      const points = [];
      const steps = 3 + Math.floor(rng() * 3);
      const dx = (width * (0.4 + rng() * 0.55)) / steps;
      const dy = ((rng() - 0.5) * height * 0.9) / steps;
      for (let s = 0; s <= steps; s++) {
        points.push([
          x0 + dx * s + (rng() - 0.5) * 8,
          y0 + dy * s + (rng() - 0.5) * 8,
        ]);
      }
      drawStroke(ctx, points, rng, 1.6 + rng() * 2.4, 0.3 + rng() * 0.35, rng() < 0.4 ? INK_RED : INK);
      ink.push(points[0]);
      ink.push(points[points.length - 1]);
    }

    // O circulo torto: um laco de 7 pontos com raio irregular, que fecha
    // mal de proposito (a ultima ponta passa da primeira).
    const cx = width * (0.25 + rng() * 0.5);
    const cy = height * (0.25 + rng() * 0.5);
    const rx = width * (0.12 + rng() * 0.12);
    const ry = height * (0.16 + rng() * 0.16);
    const loop = [];
    const turns = 7;
    for (let i = 0; i <= turns; i++) {
      const a = (i / turns) * Math.PI * 2 * 1.12;
      loop.push([
        cx + Math.cos(a) * rx * (0.8 + rng() * 0.4),
        cy + Math.sin(a) * ry * (0.8 + rng() * 0.4),
      ]);
    }
    drawStroke(ctx, loop, rng, 2 + rng() * 2.5, 0.32 + rng() * 0.3, INK);

    const marks = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < marks; i++) {
      const x = rng() * width;
      const y = rng() * height;
      drawStroke(
        ctx,
        [
          [x, y],
          [x + (rng() - 0.5) * 26, y + (rng() - 0.5) * 26],
        ],
        rng,
        1.4 + rng() * 2,
        0.25 + rng() * 0.35,
        INK
      );
    }
  }

  /**
   * A textura da pichacao: canvas TRANSPARENTE com tinta em cima (nao um
   * retangulo pintado - o reboco da parede continua sendo o fundo).
   *
   * A frase e quebrada em duas linhas sozinha: a ultima palavra desce.
   * Com "No man's land" isso da "NO MAN'S" em cima e "LAND" embaixo, que
   * era o desenho pedido.
   */
  function createGraffitiTexture(options) {
    const opts = options || {};
    const text = opts.text === undefined ? "No man's land" : opts.text;
    const rng = mulberry32(hashSeed(opts.seed || text));
    const width = 256;
    const height = 128;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    let lines = opts.lines;
    if (!lines || !lines.length) {
      const words = String(text).trim().split(/\s+/);
      lines =
        words.length > 1
          ? [words.slice(0, words.length - 1).join(" "), words[words.length - 1]]
          : [words[0]];
    }

    const ink = [];

    // Primeira linha: menor, mais para a esquerda. Segunda: maior e mais
    // torta, como quem ja estava sem espaco e sem paciencia.
    const layouts = [
      {
        x: width * (0.05 + rng() * 0.05),
        y: height * 0.14,
        w: width * (0.76 + rng() * 0.1),
        h: height * 0.3,
      },
      {
        x: width * (0.12 + rng() * 0.14),
        y: height * 0.5,
        w: width * (0.48 + rng() * 0.16),
        h: height * 0.36,
      },
    ];

    lines.forEach(function (line, i) {
      drawLine(ctx, line, rng, layouts[Math.min(i, layouts.length - 1)], ink);
    });

    drawScribbles(ctx, width, height, rng, ink);

    // ---------- Escorridos ----------
    // Nascem de pontos SORTEADOS entre os que receberam tinta, entao o
    // pingo sempre sai de um traco - nunca do nada.
    const drips = 5 + Math.floor(rng() * 6);
    for (let i = 0; i < drips && ink.length; i++) {
      const point = ink[Math.floor(rng() * ink.length)];
      drawDrip(ctx, point[0], point[1], rng);
    }

    // ---------- Respingo de spray ----------
    // Poeira de tinta em volta dos tracos: pixels soltos, o mesmo
    // acabamento de grao que todas as texturas do jogo levam.
    const specks = 320;
    for (let i = 0; i < specks && ink.length; i++) {
      const point = ink[Math.floor(rng() * ink.length)];
      const radius = 3 + rng() * 16;
      const a = rng() * Math.PI * 2;
      ctx.fillStyle = INK + (0.1 + rng() * 0.3) + ")";
      ctx.fillRect(
        Math.round(point[0] + Math.cos(a) * radius),
        Math.round(point[1] + Math.sin(a) * radius),
        1,
        1
      );
    }

    // ---------- Falhas na tinta ----------
    // Spray velho em reboco velho nao cobre parelho: alguns pixels da
    // tinta somem e o resto perde alfa a esmo. E o que quebra a borda
    // "limpa" do traco de canvas.
    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) {
        continue;
      }
      const roll = rng();
      if (roll < 0.05) {
        data[i] = 0;
      } else {
        data[i] = Math.max(0, Math.min(255, data[i] - Math.floor(rng() * 34)));
      }
    }
    ctx.putImageData(image, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * A pichacao pronta: um plano com a textura acima.
   *
   * options:
   *   text     - a frase (padrao "No man's land")
   *   seed     - semente do sorteio (padrao: o proprio texto)
   *   width    - largura em METROS (padrao 2.6)
   *   height   - altura em METROS (padrao 1.3)
   *   name     - nome legivel para o Editor
   *
   * Devolve { mesh, group, setDaytime, setMorning } - o mesmo contrato
   * das outras pecas do exterior. Quem chama posiciona/gira o `group`.
   */
  function createGraffiti(options) {
    const opts = options || {};
    const width = opts.width || 2.6;
    const height = opts.height || 1.3;
    const texture = createGraffitiTexture(opts);

    // alphaTest, e nao transparencia pura: o pixel sem tinta e DESCARTADO
    // (ver "Como ela encosta na parede" no topo), entao a pichacao nao
    // precisa entrar na fila de transparentes da cena nem depende da
    // ordem de desenho para ficar certa.
    const night = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.12,
      roughness: 1,
      metalness: 0,
      side: THREE.FrontSide,
    });
    // De dia, chapado com nevoa - a mesma regra da fachada e da varanda
    // (ver wallExteriorEndDay/porchPlasterDay em
    // materials/material-library.js): de manha o exterior inteiro perde a
    // iluminacao, e tinta iluminada em cima de reboco chapado apareceria
    // preta.
    const day = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.12,
      color: 0xd9d2c4,
      side: THREE.FrontSide,
      fog: true,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), night);
    mesh.name = opts.name || "pichacao";

    function setDaytime(daytime) {
      mesh.material = daytime === false ? night : day;
    }

    function setMorning() {
      setDaytime(true);
    }

    return {
      mesh: mesh,
      group: mesh,
      texture: texture,
      setDaytime: setDaytime,
      setMorning: setMorning,
    };
  }

  function createImageGraffiti(options) {
    const o=options||{};
    const tex=new THREE.TextureLoader().load(o.image);
    tex.magFilter=THREE.NearestFilter; tex.minFilter=THREE.NearestFilter; tex.generateMipmaps=false;
    const night=new THREE.MeshStandardMaterial({map:tex,transparent:true,alphaTest:0.12,roughness:1,metalness:0,side:THREE.FrontSide});
    const day=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:0.12,color:0xd9d2c4,side:THREE.FrontSide,fog:true});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(o.width||2.2,o.height||2.2),night); mesh.name=o.name||'pichacao-imagem';
    return {mesh,group:mesh,texture:tex,setDaytime:function(v){mesh.material=v===false?night:day},setMorning:function(){mesh.material=day}};
  }

  return {
    createImageGraffiti:createImageGraffiti,
    createGraffiti: createGraffiti,
    createGraffitiTexture: createGraffitiTexture,
  };
})();
