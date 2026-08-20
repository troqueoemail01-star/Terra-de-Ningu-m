/**
 * models/book-factory.js
 * -------------------------------------------------
 * Pilha de livros decorativa (4 volumes empilhados, um deles
 * apoiado torto no topo) — elemento puramente visual, pensado
 * para ficar sobre a escrivaninha, entre o vaso de rosas e o
 * telefone (ver DeskFactory, que decide a posição). Sem
 * interação, sem animação, sem som: só compõe o cenário.
 *
 * Geometria, texturas (capas/lombadas/páginas geradas em canvas)
 * e o "shader PSX" de cada livro foram portados do modelo de
 * referência enviado, mantendo a malha e a lógica de construção
 * de cada volume inalteradas — só o necessário para encaixar no
 * padrão de fábricas do jogo (ver comentário de createBookStack
 * mais abaixo sobre o que mudou: recentralização, escala e a
 * remoção da pequena base de pedra que só existia para apoiar a
 * pilha na cena de inspeção do arquivo original).
 *
 * O material de cada livro usa a mesma técnica do arquivo
 * original: MeshLambertMaterial com um shader PSX próprio
 * (onBeforeCompile, ver applyPSXShader), que faz snapping de
 * vértices no espaço de tela e dithering ordenado 4x4 no
 * fragment shader. É uma técnica diferente da usada no resto do
 * jogo (que consegue o visual retrô via textura, ver
 * materials/textures.js, sem mexer no shader) — mantida assim de
 * propósito para preservar a aparência exata do modelo enviado.
 * -------------------------------------------------
 */

window.BookFactory = (function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Utilitários
  // ---------------------------------------------------------------------

  function seededRandom(seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp255(v) { return Math.max(0, Math.min(255, v)); }

  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }

  function hexToRgb(hex) {
    const m = hex.replace('#', '');
    const n = parseInt(m, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  // ---------------------------------------------------------------------
  // Geração procedural de texturas (baixa resolução, propositalmente crua)
  // ---------------------------------------------------------------------

  function makeLeatherTexture(baseColorHex, opts) {
    opts = opts || {};
    const w = opts.w || 48, h = opts.h || 48, seed = opts.seed || 1;
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext("2d");
    const base = hexToRgb(baseColorHex);
    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, w, h);

    const rand = seededRandom(seed);
    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (rand() - 0.5) * 46;
      const streak = (rand() - 0.5) * 10;
      data[i]     = clamp255(base.r + n + streak);
      data[i + 1] = clamp255(base.g + n * 0.9 + streak * 0.8);
      data[i + 2] = clamp255(base.b + n * 0.75 + streak * 0.6);
    }
    ctx.putImageData(img, 0, 0);

    // vinheta suave nas bordas (couro gasto)
    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.72);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    return canvas;
  }

  function makePageTexture(opts) {
    opts = opts || {};
    const w = opts.w || 64, h = opts.h || 64, seed = opts.seed || 7;
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e6d8b8";
    ctx.fillRect(0, 0, w, h);

    const rand = seededRandom(seed);
    for (let y = 0; y < h; y++) {
      const shade = 0.8 + rand() * 0.35;
      const c = Math.floor(150 * shade);
      ctx.fillStyle = "rgba(" + (c + 30) + "," + c + "," + (c - 30) + "," + (0.10 + rand() * 0.18) + ")";
      ctx.fillRect(0, y, w, 1);
    }
    // manchas de "foxing" (envelhecimento do papel)
    for (let i = 0; i < w * h * 0.03; i++) {
      const x = Math.floor(rand() * w), y = Math.floor(rand() * h);
      ctx.fillStyle = "rgba(110,80,40,0.18)";
      ctx.fillRect(x, y, 1, 1);
    }
    return canvas;
  }

  // desenha texto letra a letra com leve jitter/rotação, como se fosse
  // estampado à mão numa lombada de couro velho
  function drawJitteredText(ctx, text, x, y, opts) {
    opts = opts || {};
    const font = opts.font || "bold 20px Georgia";
    const color = opts.color || "#e8e0c8";
    const seed = opts.seed || 1;
    const jitter = opts.jitter !== undefined ? opts.jitter : 1.2;
    const align = opts.align || "left";
    const shadow = opts.shadow;

    ctx.font = font;
    ctx.textBaseline = "alphabetic";
    const rand = seededRandom(seed);

    const widths = [];
    let totalWidth = 0;
    for (let i = 0; i < text.length; i++) {
      const cw = ctx.measureText(text[i]).width + (opts.spacing || 0);
      widths.push(cw);
      totalWidth += cw;
    }

    let cx = x;
    if (align === "center") cx = x - totalWidth / 2;
    else if (align === "right") cx = x - totalWidth;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const cw = widths[i];
      const jx = (rand() - 0.5) * jitter;
      const jy = (rand() - 0.5) * jitter;
      const jr = (rand() - 0.5) * 0.05;

      ctx.save();
      ctx.translate(cx + cw / 2 + jx, y + jy);
      ctx.rotate(jr);
      if (shadow) {
        ctx.fillStyle = shadow;
        ctx.fillText(ch, -cw / 2 + 1, 1);
      }
      ctx.fillStyle = color;
      ctx.fillText(ch, -cw / 2, 0);
      ctx.restore();

      cx += cw;
    }
    return totalWidth;
  }

  function drawGoldBand(ctx, w, y0, y1, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, y0, w, Math.max(1, y1 - y0));
  }

  // Livro C — "No man's Land" (vermelho, com rótulo vertical "LORE")
  function makeSpineNoMansLand(w, h) {
    const canvas = makeLeatherTexture("#7c2222", { seed: 11, w: w, h: h });
    const ctx = canvas.getContext("2d");

    const hl = ctx.createLinearGradient(0, 0, 0, h);
    hl.addColorStop(0, "rgba(255,255,255,0.12)");
    hl.addColorStop(0.18, "rgba(255,255,255,0)");
    hl.addColorStop(0.82, "rgba(255,255,255,0)");
    hl.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = hl;
    ctx.fillRect(0, 0, w, h);

    const dividerX = w * 0.775;

    drawJitteredText(ctx, "No man's Land", w * 0.045, h * 0.60, {
      font: "bold " + Math.floor(h * 0.30) + "px Georgia",
      color: "#e9dfc4", seed: 21, jitter: 1.6, shadow: "rgba(30,5,5,0.5)"
    });

    ctx.fillStyle = "rgba(215,205,180,0.6)";
    ctx.fillRect(dividerX - 1, h * 0.08, 2, h * 0.84);

    ctx.save();
    ctx.translate(w * 0.895, h * 0.86);
    ctx.rotate(-Math.PI / 2);
    drawJitteredText(ctx, "LORE", 0, 0, {
      font: "bold " + Math.floor(h * 0.19) + "px Georgia",
      color: "#d2c6a8", seed: 31, jitter: 1.0, align: "left"
    });
    ctx.restore();

    return canvas;
  }

  // Livro B — "Corpse Bride" (marrom/dourado, com emblema ornamental)
  function makeSpineCorpseBride(w, h) {
    const canvas = makeLeatherTexture("#5a3a1c", { seed: 12, w: w, h: h });
    const ctx = canvas.getContext("2d");

    drawGoldBand(ctx, w, h * 0.115, h * 0.16, "#c8a23c");
    drawGoldBand(ctx, w, h * 0.84, h * 0.885, "#c8a23c");

    ctx.save();
    ctx.translate(w * 0.145, h * 0.5);
    ctx.strokeStyle = "#d9b64c";
    ctx.fillStyle = "#d9b64c";
    ctx.lineWidth = Math.max(1, h * 0.02);
    const r = h * 0.24;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.94;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawJitteredText(ctx, "Corpse Bride", w * 0.315, h * 0.60, {
      font: "bold " + Math.floor(h * 0.255) + "px Georgia",
      color: "#e7c876", seed: 23, jitter: 1.4, shadow: "rgba(20,10,0,0.5)"
    });

    return canvas;
  }

  // Livro A — capa lisa, cinza-azulada escura, com pequeno medalhão
  function makeSpinePlainA(w, h) {
    const canvas = makeLeatherTexture("#38445a", { seed: 13, w: w, h: h });
    const ctx = canvas.getContext("2d");
    const rand = seededRandom(51);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "rgba(255,255,255," + (0.02 + rand() * 0.03) + ")";
      ctx.fillRect(rand() * w, 0, 2, h);
    }
    ctx.save();
    ctx.translate(w * 0.165, h * 0.53);
    ctx.strokeStyle = "rgba(175,185,198,0.5)";
    ctx.lineWidth = Math.max(1, h * 0.012);
    ctx.beginPath(); ctx.arc(0, 0, h * 0.17, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, h * 0.075, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    return canvas;
  }

  // Livro D — capa clara e desgastada, sem título (moldura simples)
  function makeSpinePlainD(w, h) {
    const canvas = makeLeatherTexture("#cbb885", { seed: 14, w: w, h: h });
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "rgba(110,90,55,0.4)";
    ctx.lineWidth = Math.max(1, h * 0.035);
    ctx.strokeRect(w * 0.09, h * 0.13, w * 0.82, h * 0.74);
    return canvas;
  }

  // ---------------------------------------------------------------------
  // Material PSX (snapping de vértices + dithering ordenado 4x4)
  // ---------------------------------------------------------------------

  function applyPSXShader(material, grid, levels) {
    grid = (grid || 140).toFixed(1);
    levels = (levels || 28).toFixed(1);
    material.onBeforeCompile = function (shader) {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        [
          "vec4 mvPosition = vec4( transformed, 1.0 );",
          "#ifdef USE_INSTANCING",
          "  mvPosition = instanceMatrix * mvPosition;",
          "#endif",
          "mvPosition = modelViewMatrix * mvPosition;",
          "gl_Position = projectionMatrix * mvPosition;",
          "gl_Position.xyz = gl_Position.xyz / gl_Position.w;",
          "gl_Position.xy = floor(gl_Position.xy * " + grid + ") / " + grid + ";",
          "gl_Position.xyz *= gl_Position.w;"
        ].join("\n")
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <fog_fragment>",
        [
          "#include <fog_fragment>",
          "float bx = mod(floor(gl_FragCoord.x), 4.0);",
          "float by = mod(floor(gl_FragCoord.y), 4.0);",
          "float bidx = bx + by * 4.0;",
          "float bval;",
          "if (bidx < 0.5) bval = 0.0;",
          "else if (bidx < 1.5) bval = 8.0;",
          "else if (bidx < 2.5) bval = 2.0;",
          "else if (bidx < 3.5) bval = 10.0;",
          "else if (bidx < 4.5) bval = 12.0;",
          "else if (bidx < 5.5) bval = 4.0;",
          "else if (bidx < 6.5) bval = 14.0;",
          "else if (bidx < 7.5) bval = 6.0;",
          "else if (bidx < 8.5) bval = 3.0;",
          "else if (bidx < 9.5) bval = 11.0;",
          "else if (bidx < 10.5) bval = 1.0;",
          "else if (bidx < 11.5) bval = 9.0;",
          "else if (bidx < 12.5) bval = 15.0;",
          "else if (bidx < 13.5) bval = 7.0;",
          "else if (bidx < 14.5) bval = 13.0;",
          "else bval = 5.0;",
          "float psxDither = (bval / 16.0) - 0.5;",
          "gl_FragColor.rgb = floor(gl_FragColor.rgb * " + levels + " + psxDither + 0.5) / " + levels + ";"
        ].join("\n")
      );
    };
    material.needsUpdate = true;
    return material;
  }

  function makePSXMaterial(opts) {
    opts = opts || {};
    const map = opts.map || null;
    if (map) {
      map.magFilter = THREE.NearestFilter;
      map.minFilter = THREE.NearestFilter;
      map.generateMipmaps = false;
      map.needsUpdate = true;
    }
    const mat = new THREE.MeshLambertMaterial({
      map: map,
      color: opts.color !== undefined ? opts.color : 0xffffff,
      flatShading: true,
      fog: true
    });
    return applyPSXShader(mat, opts.grid, opts.levels);
  }

  function makeFlatPSXMaterial(colorHex) {
    const mat = new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true, fog: true });
    return applyPSXShader(mat);
  }

  // ---------------------------------------------------------------------
  // Construção de um livro (caixa com 6 faces + detalhes em relevo)
  // ---------------------------------------------------------------------

  const sharedPageCanvas = makePageTexture({ w: 48, h: 64, seed: 7 });

  function createBook(spec) {
    const width = spec.width, height = spec.height, depth = spec.depth;
    const group = new THREE.Group();

    const spineTex = new THREE.CanvasTexture(spec.spineCanvas);
    const coverTex = new THREE.CanvasTexture(spec.coverCanvas);
    const pageTex = new THREE.CanvasTexture(sharedPageCanvas);

    const matPage = makePSXMaterial({ map: pageTex });
    const matCover = makePSXMaterial({ map: coverTex });
    const matSpine = makePSXMaterial({ map: spineTex });

    // ordem BoxGeometry: +X, -X, +Y, -Y, +Z(frente/lombada), -Z
    const materials = [matPage, matPage, matCover, matCover, matSpine, matCover];
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, materials);
    group.add(mesh);

    if (spec.bandColor) {
      const bandThickness = height * 0.11;
      const bandProtrude = 0.008;
      const bandGeo = new THREE.BoxGeometry(width * 0.985, bandThickness, bandProtrude);
      const bandMatTop = makeFlatPSXMaterial(spec.bandColor);
      const bandMatBot = makeFlatPSXMaterial(spec.bandColor);
      const topBand = new THREE.Mesh(bandGeo, bandMatTop);
      topBand.position.set(0, height * 0.365, depth / 2 + bandProtrude / 2 - 0.002);
      group.add(topBand);
      const botBand = new THREE.Mesh(bandGeo.clone(), bandMatBot);
      botBand.position.set(0, -height * 0.365, depth / 2 + bandProtrude / 2 - 0.002);
      group.add(botBand);
    }

    if (spec.hasDivider) {
      const dGeo = new THREE.BoxGeometry(width * 0.018, height * 0.92, 0.008);
      const dMat = makeFlatPSXMaterial("#d2c6a8");
      const divider = new THREE.Mesh(dGeo, dMat);
      divider.position.set(width * 0.275, 0, depth / 2 + 0.003);
      group.add(divider);
    }

    group.userData.width = width;
    group.userData.height = height;
    group.userData.depth = depth;
    return group;
  }

  // ---------------------------------------------------------------------
  // Pilha completa (4 livros), recentralizada e escalada para a
  // escrivaninha
  // ---------------------------------------------------------------------
  //
  // Abaixo, as mesmas 4 chamadas (posições, rotações e cores) do
  // arquivo de referência, sem nenhuma alteração de valores — só
  // organizadas dentro de createBookStack(). Duas diferenças em relação
  // ao arquivo original, as únicas necessárias para o modelo funcionar
  // corretamente aqui:
  //
  // 1) A pequena base/prateleira de pedra do arquivo original não foi
  //    trazida — ela só existia para apoiar a pilha na cena de
  //    inspeção isolada do item; sobre a escrivaninha, os livros apoiam
  //    direto no tampo.
  // 2) Todo o grupo é recentralizado (a pilha inteira nasce com o
  //    centro X/Z em 0 e a base do livro mais baixo em y = 0) e depois
  //    escalado, para poder ser posicionado do mesmo jeito que o vaso e
  //    o telefone (grupo plantado em y = DESK_HEIGHT, ver DeskFactory).
  //    Os valores de recentralização/escala vêm de medir o bounding box
  //    do conjunto original (X: -1.3375 a 1.3375: centro em 0; Z:
  //    -0.9260 a 0.8415: centro em -0.0422; Y: 0 a 1.8023, base já em
  //    y = 0, mesma convenção do vaso/telefone). A escala final faz a
  //    pilha ocupar cerca de 0.18 m de largura sobre a escrivaninha —
  //    cabe folgada no vão entre o vaso e o telefone e fica proporcional
  //    a eles (o telefone, por comparação, tem cerca de 0.156 m de
  //    altura).
  const NATIVE_CENTER_X = 0;
  const NATIVE_CENTER_Z = -0.0422;
  const NATIVE_WIDTH = 2.6749;
  const TARGET_WIDTH = 0.18;
  const BOOK_SCALE = TARGET_WIDTH / NATIVE_WIDTH;

  function createBookStack() {
    const outer = new THREE.Group();
    const stack = new THREE.Group();
    outer.add(stack);

    let cursorY = 0;
    function stackBook(book, offX, offZ, yawDeg) {
      const h = book.userData.height;
      book.position.set(offX - NATIVE_CENTER_X, cursorY + h / 2, offZ - NATIVE_CENTER_Z);
      book.rotation.y = THREE.MathUtils.degToRad(yawDeg);
      cursorY += h;
      stack.add(book);
      return book;
    }

    // Livro A — base, cinza-azulado
    const bookA = createBook({
      width: 2.6, height: 0.50, depth: 1.5,
      spineCanvas: makeSpinePlainA(260, 50),
      coverCanvas: makeLeatherTexture("#303c4c", { seed: 41, w: 40, h: 40 })
    });
    stackBook(bookA, 0.0, 0.0, -3);

    // Livro B — "Corpse Bride", marrom/dourado
    const bookB = createBook({
      width: 2.3, height: 0.42, depth: 1.34,
      spineCanvas: makeSpineCorpseBride(260, 48),
      coverCanvas: makeLeatherTexture("#4c2e16", { seed: 42, w: 40, h: 40 }),
      bandColor: "#c8a23c"
    });
    stackBook(bookB, 0.06, -0.04, 3);

    // Livro C — "No man's Land" + "LORE", vermelho
    const bookC = createBook({
      width: 2.16, height: 0.48, depth: 1.40,
      spineCanvas: makeSpineNoMansLand(260, 58),
      coverCanvas: makeLeatherTexture("#5c1616", { seed: 43, w: 40, h: 40 }),
      hasDivider: true
    });
    stackBook(bookC, 0.20, 0.05, -5);

    // Livro D — tombo claro, apoiado torto no topo, mostrando a lombada
    // das páginas
    const bookD = createBook({
      width: 1.5, height: 0.34, depth: 1.05,
      spineCanvas: makeSpinePlainD(180, 41),
      coverCanvas: makeLeatherTexture("#cdbb8c", { seed: 44, w: 40, h: 40 })
    });
    {
      const h = bookD.userData.height;
      bookD.position.set(-0.18 - NATIVE_CENTER_X, cursorY + h / 2 + 0.03, -0.12 - NATIVE_CENTER_Z);
      bookD.rotation.y = THREE.MathUtils.degToRad(96);
      bookD.rotation.x = THREE.MathUtils.degToRad(-7);
      bookD.rotation.z = THREE.MathUtils.degToRad(5);
      stack.add(bookD);
    }

    outer.scale.setScalar(BOOK_SCALE);
    return outer;
  }

  return { createBookStack: createBookStack };
})();
