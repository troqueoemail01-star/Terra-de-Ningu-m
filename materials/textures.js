/**
 * materials/textures.js
 * -------------------------------------------------
 * Texturas geradas proceduralmente em <canvas>.
 * Baixa resolução + filtro "nearest" de propósito:
 * é o que dá a crocância pixelada característica do
 * visual PS1 / PSX, sem precisar baixar nenhum arquivo
 * de imagem externo.
 * -------------------------------------------------
 */

window.PsxTextures = (function () {
  // `height` e opcional: sem ela, o canvas sai QUADRADO, como sempre (e o
  // caso de praticamente todas as texturas do jogo). Com ela, sai
  // retangular - foi o tapete de boas-vindas da varanda que precisou
  // disso (ver createWelcomeMatTexture): o desenho dele tem letras, e um
  // canvas quadrado esticado num tapete 2:1 sairia com o pixel achatado e
  // a palavra deformada. Nada de quem ja chamava antes muda.
  function makeCanvas(size, height) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = height || size;
    return canvas;
  }

  function toThreeTexture(canvas, repeatX, repeatY) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    // Sem filtragem suave nem mipmaps: essa é a receita do "pixel cru" do PS1.
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  // Textura de madeira em tom marrom (piso e teto)
  function createWoodTexture(repeatX, repeatY) {
    const size = 64;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");

    const base = "#4a3222";
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // Réguas/tábuas horizontais
    const plankHeight = 8;
    for (let y = 0; y < size; y += plankHeight) {
      const shade = 18 + Math.floor(Math.random() * 14);
      ctx.fillStyle = `rgb(${74 - shade}, ${50 - shade * 0.6}, ${34 - shade * 0.4})`;
      ctx.fillRect(0, y, size, 1);
    }

    // Veios da madeira (linhas irregulares mais escuras)
    ctx.strokeStyle = "rgba(20, 12, 6, 0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const y = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(0, y);
      let cx = 0;
      let cy = y;
      while (cx < size) {
        cx += 6 + Math.random() * 6;
        cy += (Math.random() - 0.5) * 3;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Ruído leve para quebrar a uniformidade
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      imgData.data[i] += n;
      imgData.data[i + 1] += n * 0.8;
      imgData.data[i + 2] += n * 0.6;
    }
    ctx.putImageData(imgData, 0, 0);

    return toThreeTexture(canvas, repeatX, repeatY);
  }

  // -----------------------------------------------------------------
  // Grama do chão externo (vista através do vidro das três janelas —
  // ver models/exterior-factory.js). Inspirada numa referência real
  // de textura de grama enviada pelo jogador: tom oliva/musgo
  // desbotado e uniforme, sem lâminas de grama individuais nem
  // gradiente suave nenhum — só manchas irregulares pequenas (mais
  // escuras e mais claras) e ruído fino por cima, a mesma receita de
  // createWoodTexture acima, só que sem nenhum padrão direcional
  // (grama não tem "veio", diferente da madeira). Baixa resolução +
  // NearestFilter, igual a todas as outras texturas deste arquivo —
  // é justamente essa crocância que aproxima do original enviado,
  // que já é bastante ruidoso/pixelizado.
  function createGrassTexture(repeatX, repeatY) {
    const size = 64;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");

    const base = "#565a28";
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // Manchas pequenas e irregulares — nunca lâminas ou linhas, só
    // blocos de 1-3px, no espírito "chapado" das outras texturas do
    // jogo (a grama só precisa ler bem à distância, do lado de fora
    // de uma janela, nunca de perto).
    const dark = "#363c18";
    const light = "#797b3c";
    const patches = 260;
    for (let i = 0; i < patches; i++) {
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * size);
      const w = 1 + Math.floor(Math.random() * 3);
      const h = 1 + Math.floor(Math.random() * 3);
      ctx.fillStyle = Math.random() > 0.5 ? dark : light;
      ctx.globalAlpha = 0.12 + Math.random() * 0.22;
      ctx.fillRect(x, y, w, h);
    }
    ctx.globalAlpha = 1;

    // Ruído fino final, mesma técnica do resto do jogo (quebra a
    // uniformidade em nível de pixel, sem criar nenhum padrão
    // repetitivo perceptível quando a textura tileia).
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      imgData.data[i] = imgData.data[i] + n;
      imgData.data[i + 1] = imgData.data[i + 1] + n;
      imgData.data[i + 2] = imgData.data[i + 2] + n * 0.6;
    }
    ctx.putImageData(imgData, 0, 0);

    return toThreeTexture(canvas, repeatX, repeatY);
  }


  // -----------------------------------------------------------------
  // Terra batida do CAMINHO que sai da porta "ENTRADA & SAIDA" (ver
  // models/dirt-path-factory.js). Mesma receita das outras texturas
  // deste arquivo (64x64, NearestFilter, sem mipmap) e o mesmo
  // espirito "chapado" de createGrassTexture logo acima: a estrada so
  // precisa ler bem do lado de fora de uma janela, nunca de perto.
  //
  // Quatro camadas, todas desenhadas com WRAP (cada forma e repetida
  // deslocada por mais ou menos size nos dois eixos) para o ladrilho
  // fechar sem costura visivel quando o material repete:
  //
  //  1. Manchas grandes e irregulares de terra mais clara e mais
  //     escura (poeira seca contra solo compactado). E o que impede o
  //     marrom de ficar chapado.
  //  2. Sulcos verticais discretos: no caminho, o eixo V da textura
  //     corre ao longo da estrada (as UVs sao x/TILE, z/TILE), entao
  //     linhas verticais leem como marcas de passagem e de escoamento
  //     de agua, e nao como um padrao aleatorio.
  //  3. Cascalho: pontinhos de 1-2 px em tons de pedra, espalhados. As
  //     pedras GRANDES sao geometria de verdade (DirtPathFactory);
  //     estas aqui sao so o granulado do solo.
  //  4. Ruido fino por pixel, igual ao resto do jogo.
  //
  // A variacao de cor em escala GRANDE (metros, nao centimetros) nao
  // vem daqui: vem da cor por vertice da propria malha da estrada, o
  // que tambem quebra a repeticao do ladrilho de graca. Ver o bloco
  // "Textura, cor e relevo" em models/dirt-path-factory.js.
  function createDirtPathTexture(repeatX, repeatY) {
    const size = 64;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#5b452c";
    ctx.fillRect(0, 0, size, size);

    // Desenha a mesma forma 9 vezes (grade 3x3 deslocada), mesma
    // tecnica de fillWrappedPolygon usada na parede de reboco, aqui na
    // versao barata, so para retangulos.
    function wrappedRect(x, y, w, h) {
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          ctx.fillRect(x + ox * size, y + oy * size, w, h);
        }
      }
    }

    // 1. Manchas de terra clara e escura.
    const dark = "#3f2f1c";
    const light = "#7b6141";
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = 3 + Math.random() * 11;
      const h = 2 + Math.random() * 8;
      ctx.fillStyle = Math.random() > 0.5 ? dark : light;
      ctx.globalAlpha = 0.07 + Math.random() * 0.16;
      wrappedRect(x, y, w, h);
    }

    // 2. Sulcos ao longo da estrada (eixo V da textura).
    for (let i = 0; i < 16; i++) {
      const x = Math.random() * size;
      const w = 1 + Math.floor(Math.random() * 2);
      const y = Math.random() * size;
      const h = 10 + Math.random() * 26;
      ctx.fillStyle = Math.random() > 0.45 ? "#4a3722" : "#6d573a";
      ctx.globalAlpha = 0.1 + Math.random() * 0.14;
      wrappedRect(x, y, w, h);
    }

    // 3. Cascalho fino.
    for (let i = 0; i < 130; i++) {
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * size);
      const s = 1 + Math.floor(Math.random() * 2);
      const g = Math.random();
      ctx.fillStyle = g > 0.6 ? "#8b8377" : g > 0.3 ? "#6b6153" : "#3a3128";
      ctx.globalAlpha = 0.3 + Math.random() * 0.4;
      wrappedRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;

    // 4. Ruido fino final, mesma tecnica do resto do jogo.
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      imgData.data[i] = imgData.data[i] + n;
      imgData.data[i + 1] = imgData.data[i + 1] + n * 0.85;
      imgData.data[i + 2] = imgData.data[i + 2] + n * 0.65;
    }
    ctx.putImageData(imgData, 0, 0);

    return toThreeTexture(canvas, repeatX, repeatY);
  }
  // -----------------------------------------------------------------
  // Parede de reboco antigo e desgastado (corredor)
  // -----------------------------------------------------------------
  // Substitui a antiga textura lisa tipo cimento por um padrão
  // orgânico inspirado numa parede real envelhecida: manchas de
  // umidade em blocos irregulares, pequenos remendos onde o reboco
  // descascou revelando uma camada mais clara por baixo, e fissuras
  // finas e ramificadas.
  //
  // O mesmo conjunto de formas é desenhado ao mesmo tempo no canvas
  // de cor e num canvas auxiliar de "altura", para que o normal map
  // gerado a partir da altura acompanhe fielmente o que se vê na
  // textura (manchas levemente afundadas, remendos levemente
  // salientes, fissuras como sulcos) — ver heightCanvasToNormalTexture.
  //
  // Cada forma é desenhada 9 vezes, numa grade 3x3 deslocada por
  // ±size, para o padrão fechar sem costura perceptível quando o
  // material repete a textura (wrapS/wrapT = RepeatWrapping).

  // Pontos (relativos ao próprio centro) de um polígono com raio
  // levemente irregular por vértice — a "forma orgânica" usada tanto
  // nas manchas quanto nos remendos descascados.
  function makeBlobPoints(radius, points, jitter) {
    const pts = [];
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = radius * (1 + (Math.random() * 2 - 1) * jitter);
      pts.push([Math.cos(angle) * r, Math.sin(angle) * r]);
    }
    return pts;
  }

  // Preenche um polígono (pontos relativos em localPoints) nas 9
  // posições da grade de wrap, com blur opcional para bordas macias.
  //
  // `wrapY` (padrão: true) permite fechar SÓ em X, deixando as 3
  // posições da linha central em vez das 9 da grade. Existe para a
  // parede EXTERNA (ver createExteriorPlasterWallTexture), a única
  // textura do jogo que não repete na vertical: o mofo dela mora no
  // rodapé e não pode reaparecer no alto da parede.
  function fillWrappedPolygon(ctx, size, cx, cy, localPoints, blurPx, fillStyle, wrapY) {
    const oySpan = wrapY === false ? 0 : 1;
    ctx.save();
    ctx.filter = blurPx > 0 ? "blur(" + blurPx + "px)" : "none";
    ctx.fillStyle = fillStyle;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -oySpan; oy <= oySpan; oy++) {
        const originX = cx + ox * size;
        const originY = cy + oy * size;
        ctx.beginPath();
        for (let i = 0; i < localPoints.length; i++) {
          const px = originX + localPoints[i][0];
          const py = originY + localPoints[i][1];
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Risca um traço (pontos relativos em localPoints) nas 9 posições
  // da grade de wrap — mesmo princípio de fillWrappedPolygon, mas
  // para linhas (usado nas fissuras).
  // `wrapY` (padrão: true), igual ao de fillWrappedPolygon acima.
  function strokeWrappedPath(ctx, size, cx, cy, localPoints, strokeStyle, lineWidth, wrapY) {
    const oySpan = wrapY === false ? 0 : 1;
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -oySpan; oy <= oySpan; oy++) {
        const originX = cx + ox * size;
        const originY = cy + oy * size;
        ctx.beginPath();
        for (let i = 0; i < localPoints.length; i++) {
          const px = originX + localPoints[i][0];
          const py = originY + localPoints[i][1];
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Desenha uma mancha orgânica ao mesmo tempo no canvas de cor (tom
  // terroso/desbotado, via opts.colorRGB/colorAlpha) e no canvas de
  // altura (opts.heightValue/heightAlpha — mais escuro que o cinza
  // neutro 128 = afundado, mais claro = saliente). hctx é opcional.
  function paintBlotch(cctx, hctx, size, cx, cy, radius, opts) {
    const pts = makeBlobPoints(radius, opts.points, opts.jitter);
    const c = opts.colorRGB;
    fillWrappedPolygon(
      cctx,
      size,
      cx,
      cy,
      pts,
      opts.blurPx,
      "rgba(" + c[0] + ", " + c[1] + ", " + c[2] + ", " + opts.colorAlpha + ")",
      opts.wrapY
    );
    if (hctx) {
      const hv = opts.heightValue;
      fillWrappedPolygon(
        hctx,
        size,
        cx,
        cy,
        pts,
        opts.blurPx,
        "rgba(" + hv + ", " + hv + ", " + hv + ", " + opts.heightAlpha + ")",
        opts.wrapY
      );
    }
  }

  // Caminho (pontos relativos ao ponto de partida) de uma fissura
  // fina: uma linha que serpenteia com pequenas variações de ângulo a
  // cada passo.
  function makeCrackPath(length, angle) {
    const pts = [[0, 0]];
    let x = 0;
    let y = 0;
    let a = angle;
    const steps = Math.round(length);
    for (let i = 0; i < steps; i++) {
      a += (Math.random() - 0.5) * 0.6;
      x += Math.cos(a) * 1.1;
      y += Math.sin(a) * 1.1;
      pts.push([x, y]);
    }
    return pts;
  }

  // Desenha uma fissura (+ eventual ramo secundário mais curto) tanto
  // na cor (traço escuro fino) quanto na altura (sulco).
  //
  // `opts` e opcional e existe pela parede EXTERNA (ver
  // createExteriorPlasterWallTexture): as fissuras de fora sao mais
  // finas, mais claras e nao podem fechar na vertical. Sem `opts`, o
  // comportamento e exatamente o de sempre - os tracos do reboco de
  // dentro nao mudaram um pixel.
  //   colorStyle / lineWidth       -> traco na cor
  //   heightStyle / heightLineWidth -> sulco na altura
  //   wrapY                        -> ver fillWrappedPolygon
  function paintCrack(cctx, hctx, size, x, y, length, angle, opts) {
    const o = opts || {};
    const colorStyle = o.colorStyle || "rgba(70, 63, 54, 0.65)";
    const lineWidth = o.lineWidth || 0.5;
    const heightStyle = o.heightStyle || "rgba(66, 66, 66, 0.75)";
    const heightLineWidth = o.heightLineWidth || 0.7;
    const wrapY = o.wrapY;
    const pts = makeCrackPath(length, angle);
    strokeWrappedPath(cctx, size, x, y, pts, colorStyle, lineWidth, wrapY);
    if (hctx) {
      strokeWrappedPath(hctx, size, x, y, pts, heightStyle, heightLineWidth, wrapY);
    }
    // Ramo secundário ocasional, mais curto, saindo de um ponto do
    // traço principal — quebra o aspecto "linha única perfeita".
    if (Math.random() < 0.6 && pts.length > 4) {
      const start = pts[Math.floor(pts.length * (0.3 + Math.random() * 0.4))];
      const branch = makeCrackPath(length * 0.4, angle + (Math.random() - 0.5) * 2);
      strokeWrappedPath(
        cctx,
        size,
        x + start[0],
        y + start[1],
        branch,
        o.branchColorStyle || "rgba(70, 63, 54, 0.5)",
        lineWidth,
        wrapY
      );
      if (hctx) {
        strokeWrappedPath(
          hctx,
          size,
          x + start[0],
          y + start[1],
          branch,
          o.branchHeightStyle || "rgba(80, 80, 80, 0.6)",
          heightLineWidth * 0.85,
          wrapY
        );
      }
    }
  }

  // A partir de um canvas em tons de cinza (altura no canal R,
  // 0-255), gera um normal map por diferenças finitas: compara a
  // altura dos vizinhos de cada texel e converte a inclinação
  // resultante num vetor normal, codificado em RGB (convenção
  // tangent-space padrão do THREE.MeshStandardMaterial.normalMap).
  // A intensidade é propositalmente baixa — o pedido era um relevo
  // sutil, só o bastante pra quebrar o aspecto totalmente plano.
  // Aceita tanto canvas quadrado (paredes) quanto retangular (folha da
  // porta, ver createDoorPanelTexture) — largura e altura tratadas
  // separadamente em vez de um único "size".
  function heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY) {
    const width = heightCanvas.width;
    const height = heightCanvas.height;
    const hctx = heightCanvas.getContext("2d");
    const heightData = hctx.getImageData(0, 0, width, height).data;

    function heightAt(x, y) {
      const xi = ((x % width) + width) % width;
      const yi = ((y % height) + height) % height;
      return heightData[(yi * width + xi) * 4] / 255;
    }

    const normalCanvas = document.createElement("canvas");
    normalCanvas.width = width;
    normalCanvas.height = height;
    const nctx = normalCanvas.getContext("2d");
    const out = nctx.createImageData(width, height);
    const strength = 2.4;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const hL = heightAt(x - 1, y);
        const hR = heightAt(x + 1, y);
        const hD = heightAt(x, y - 1);
        const hU = heightAt(x, y + 1);

        let nx = (hL - hR) * strength;
        let ny = (hD - hU) * strength;
        let nz = 1;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= len;
        ny /= len;
        nz /= len;

        const idx = (y * width + x) * 4;
        out.data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        out.data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        out.data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        out.data[idx + 3] = 255;
      }
    }

    nctx.putImageData(out, 0, 0);
    return toThreeTexture(normalCanvas, repeatX, repeatY);
  }

  // A partir do mesmo canvas de altura usado por heightCanvasToNormalTexture,
  // gera um roughnessMap: relevo saliente (mais alto que o cinza neutro
  // 128) vira uma célula mais lisa/brilhante; relevo rebaixado vira uma
  // célula mais fosca. Assim a mesma pintura de relevo passa a modular
  // também o brilho da superfície, sem precisar de uma segunda passada
  // de pintura. `variance` controla o quanto essa diferença é
  // perceptível (0 = nenhuma variação, todo o canvas sai neutro).
  function heightCanvasToRoughnessTexture(heightCanvas, variance, repeatX, repeatY) {
    const width = heightCanvas.width;
    const height = heightCanvas.height;
    const hctx = heightCanvas.getContext("2d");
    const heightData = hctx.getImageData(0, 0, width, height);

    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = width;
    roughCanvas.height = height;
    const rctx = roughCanvas.getContext("2d");
    const out = rctx.createImageData(width, height);

    for (let i = 0; i < heightData.data.length; i += 4) {
      const h = heightData.data[i] / 255; // 0..1, 0.5 = neutro
      const g = Math.max(0, Math.min(1, 1 - (h - 0.5) * variance));
      const v = Math.round(g * 255);
      out.data[i] = v;
      out.data[i + 1] = v;
      out.data[i + 2] = v;
      out.data[i + 3] = 255;
    }

    rctx.putImageData(out, 0, 0);
    return toThreeTexture(roughCanvas, repeatX, repeatY);
  }

  // Gera os pontos (relativos ao próprio centro) de um polígono
  // alongado numa direção — mesma ideia de makeBlobPoints, mas com
  // raios diferentes em cada eixo e rotacionado por `angle`. Usado
  // pelas células diagonais do vidro martelado (ver
  // createFrostedGlassTexture): um "blob" comum e simétrico não dá a
  // sensação de ondulação direcional que o vidro real tem.
  function makeElongatedBlobPoints(radiusLong, radiusShort, angle, points, jitter) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const pts = [];
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2;
      const j = 1 + (Math.random() * 2 - 1) * jitter;
      const lx = Math.cos(a) * radiusLong * j;
      const ly = Math.sin(a) * radiusShort * j;
      pts.push([lx * cos - ly * sin, lx * sin + ly * cos]);
    }
    return pts;
  }

  // APOSENTADA: era a textura principal das paredes do corredor ate a
  // atualizacao do LAMBRI (hoje o corredor usa
  // createCorridorWainscotWallTexture, mais abaixo neste arquivo, cujo
  // reboco de cima nasceu desta receita). Continua exportada porque as
  // helpers de mancha/fissura documentadas acima referenciam ela como
  // exemplo, mas nenhuma parede do jogo aponta mais para aqui.
  //
  // Reboco antigo e desgastado, inspirado em referência real. Resolução maior que as
  // demais texturas do jogo (128 em vez de 64) — é a superfície mais
  // presente na tela o tempo todo, então ganha mais detalhe sem pesar
  // no desempenho (tudo é gerado uma única vez, no carregamento).
  // Retorna { map, normalMap }, prontos pra entrar direto num
  // MeshStandardMaterial.
  function createOldPlasterWallTexture(repeatX, repeatY) {
    const size = 128;
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");

    // Base: reboco bege-acinzentado claro
    cctx.fillStyle = "#c9c3b7";
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);

    // Variação ampla e suave de tom, como se fosse luz/sombra natural
    // acumulada na parede ao longo do tempo.
    for (let i = 0; i < 3; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const r = size * (0.5 + Math.random() * 0.25);
      const lighter = Math.random() < 0.5;
      paintBlotch(cctx, hctx, size, cx, cy, r, {
        points: 10,
        jitter: 0.3,
        blurPx: r * 0.5,
        colorRGB: lighter ? [214, 210, 200] : [178, 172, 160],
        colorAlpha: 0.35,
        heightValue: lighter ? 122 : 134,
        heightAlpha: 0.4,
      });
    }

    // Remendos descascados: reboco mais claro à mostra, com borda
    // levemente irregular e uma pequena saliência de borda (rebordo).
    for (let i = 0; i < 4; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const r = 7 + Math.random() * 6;
      paintBlotch(cctx, hctx, size, cx, cy, r, {
        points: 8,
        jitter: 0.5,
        blurPx: 1.5,
        colorRGB: [223, 219, 209],
        colorAlpha: 0.55,
        heightValue: 150,
        heightAlpha: 0.5,
      });
    }

    // Fissuras finas, cada uma com posição/comprimento/ângulo
    // próprios (mais a ramificação ocasional gerada em paintCrack).
    const cracks = [
      { x: size * 0.08, y: size * 0.02, len: size * 0.38, angle: Math.PI * 0.48 },
      { x: size * 0.58, y: size * 0.47, len: size * 0.31, angle: Math.PI * 0.1 },
      { x: size * 0.82, y: size * 0.12, len: size * 0.22, angle: Math.PI * 0.65 },
      { x: size * 0.35, y: size * 0.9, len: size * 0.16, angle: -Math.PI * 0.2 },
    ];
    cracks.forEach(function (c) {
      paintCrack(cctx, hctx, size, c.x, c.y, c.len, c.angle);
    });

    // Ruído fino final (grão do reboco), mesma técnica usada nas
    // outras texturas do jogo — aplicado nos dois canvases.
    const colorData = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 7;
      colorData.data[i] += n;
      colorData.data[i + 1] += n * 0.85;
      colorData.data[i + 2] += n * 0.7;
    }
    cctx.putImageData(colorData, 0, 0);

    const heightNoiseData = hctx.getImageData(0, 0, size, size);
    for (let i = 0; i < heightNoiseData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 5;
      heightNoiseData.data[i] += n;
      heightNoiseData.data[i + 1] += n;
      heightNoiseData.data[i + 2] += n;
    }
    hctx.putImageData(heightNoiseData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
    };
  }

  // Tecido de cortina (dobras verticais em tom vinho escuro)
  function createCurtainTexture(repeatX, repeatY) {
    const size = 32;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#3a1418";
    ctx.fillRect(0, 0, size, size);

    // Dobras verticais do tecido
    for (let x = 0; x < size; x += 3) {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + Math.random() * 0.18})`;
      ctx.fillRect(x, 0, 2, size);
    }

    // Ruído leve para quebrar a uniformidade
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      imgData.data[i] += n;
      imgData.data[i + 1] += n * 0.7;
      imgData.data[i + 2] += n * 0.6;
    }
    ctx.putImageData(imgData, 0, 0);

    return toThreeTexture(canvas, repeatX, repeatY);
  }

  // -----------------------------------------------------------------
  // Vidro fosco das janelas (ver materials/material-library.js e
  // models/window-factory.js)
  // -----------------------------------------------------------------
  // Padrão inspirado num vidro canelado/martelado real (referência
  // enviada pelo jogador): pequenas células alongadas na diagonal,
  // metade salientes e mais lisas — pegam a luz do corredor e dos
  // clarões de relâmpago — metade rebaixadas e mais foscas, como as
  // ondulações de um vidro fosco de verdade. Não é uma cópia da
  // referência: o padrão é gerado do zero, em baixa resolução e
  // paleta fria, pra combinar com a identidade visual PSX do resto do
  // jogo, e não com o material moderno/hiper-realista da foto.
  //
  // Mesma técnica de createOldPlasterWallTexture — pinta ao mesmo
  // tempo um canvas de cor e um canvas de altura — só que aqui a
  // altura também alimenta um roughnessMap (ver
  // heightCanvasToRoughnessTexture), então a célula saliente fica
  // ligeiramente mais lisa que o vale ao redor. É essa combinação de
  // relevo (normal map) + variação de brilho (roughness map) + uma
  // fina camada de clearcoat no material (ver material-library.js)
  // que faz o vidro "pegar" luz de um jeito convincente sem precisar
  // de mapa de ambiente nem de qualquer recurso pesado pro celular.
  function createFrostedGlassTexture(repeatX, repeatY) {
    const size = 48;
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");

    // Base: branco-azulado bem claro e frio — já nasce leitoso, como
    // um vidro fosco de verdade, em vez de simular vidro transparente
    // comum.
    cctx.fillStyle = "#dfe9ee";
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);

    // Células alongadas na diagonal — o "martelado" do vidro.
    const cellAngle = Math.PI * 0.28;
    const cellCount = 150;
    for (let i = 0; i < cellCount; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const radiusLong = 2.4 + Math.random() * 2.2;
      const radiusShort = 0.9 + Math.random() * 0.9;
      const pts = makeElongatedBlobPoints(radiusLong, radiusShort, cellAngle, 7, 0.35);
      const raised = Math.random() < 0.5;

      const colorAlpha = raised ? 0.14 + Math.random() * 0.14 : 0.08 + Math.random() * 0.1;
      const colorRGB = raised ? [255, 255, 255] : [130, 150, 165];
      fillWrappedPolygon(
        cctx, size, cx, cy, pts, 0.5,
        `rgba(${colorRGB[0]}, ${colorRGB[1]}, ${colorRGB[2]}, ${colorAlpha})`
      );

      const heightValue = raised ? 165 + Math.random() * 55 : 80 - Math.random() * 40;
      fillWrappedPolygon(
        hctx, size, cx, cy, pts, 0.5,
        `rgba(${heightValue}, ${heightValue}, ${heightValue}, ${0.55 + Math.random() * 0.3})`
      );
    }

    // Vinheta suave nas bordas: escurece levemente o vidro perto da
    // moldura, reforçando a leitura de "painel encaixado no caixilho"
    // em vez de uma superfície plana que se confunde com o que está
    // ao redor.
    const vignette = cctx.createRadialGradient(
      size / 2, size / 2, size * 0.3,
      size / 2, size / 2, size * 0.72
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(28, 40, 48, 0.35)");
    cctx.fillStyle = vignette;
    cctx.fillRect(0, 0, size, size);

    // Ruído fino final em cada canvas — mesma técnica das outras
    // texturas do jogo. No canvas de altura, esse grão pixel a pixel
    // é o que dá o brilho "picotado" e irregular do vidro martelado
    // (em vez de uma ondulação lisa demais), bem no espírito PSX.
    const colorData = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      colorData.data[i] += n;
      colorData.data[i + 1] += n;
      colorData.data[i + 2] += n;
    }
    cctx.putImageData(colorData, 0, 0);

    const heightNoiseData = hctx.getImageData(0, 0, size, size);
    for (let i = 0; i < heightNoiseData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      heightNoiseData.data[i] += n;
      heightNoiseData.data[i + 1] += n;
      heightNoiseData.data[i + 2] += n;
    }
    hctx.putImageData(heightNoiseData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
      roughnessMap: heightCanvasToRoughnessTexture(heightCanvas, 0.7, repeatX, repeatY),
    };
  }

  // Grão de madeira em duas camadas — traços grossos e escuros (a
  // estrutura principal do veio) por baixo, traços finos e claros por
  // cima (o brilho fosco que a luz pega na crista do veio) — pintado
  // ao mesmo tempo na cor e na altura, pra render mais natural que uma
  // única camada de linhas. Reaproveitado tanto pelo corpo da
  // escrivaninha (createAgedWoodTexture) quanto pela frente da gaveta
  // (createDeskDrawerFrontTexture), pra as duas saírem com a cara da
  // mesma madeira.
  function paintWoodGrain(cctx, hctx, w, h, countCoarse, countFine) {
    function pass(strokeColor, heightColor, count, widthMin, widthMax) {
      for (let i = 0; i < count; i++) {
        const y = Math.random() * h;
        const points = [[0, y]];
        let cx = 0;
        let cy = y;
        while (cx < w) {
          cx += 6 + Math.random() * 7;
          cy += (Math.random() - 0.5) * 2.6;
          points.push([cx, cy]);
        }
        const lw = widthMin + Math.random() * (widthMax - widthMin);
        strokePath(cctx, points, strokeColor, lw, false);
        strokePath(hctx, points, heightColor, lw, false);
      }
    }
    pass("rgba(32, 20, 11, 0.4)", "rgba(90, 90, 90, 0.5)", countCoarse, 0.8, 1.2);
    pass("rgba(150, 116, 80, 0.16)", "rgba(165, 165, 165, 0.3)", countFine, 0.5, 0.8);
  }

  // Madeira envelhecida (tom mais claro/desbotado que a do piso), usada
  // no corpo da escrivaninha (tampo e pernas): grão em duas camadas
  // (ver paintWoodGrain), emendas sutis de tábua, manchas de desgaste
  // onde o verniz sumiu e leve escurecimento acumulado nos cantos —
  // reforça o aspecto de móvel antigo, mas bem cuidado. Relevo
  // (normalMap) gerado a partir de um canvas de altura pintado em
  // paralelo, mesma técnica das paredes/porta (ver
  // heightCanvasToNormalTexture): só o bastante pra quebrar o aspecto
  // chapado sob a luz da luminária, sem exagerar.
  function createAgedWoodTexture(repeatX, repeatY) {
    const size = 64;
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");

    const base = "#5e4029";
    cctx.fillStyle = base;
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);

    paintWoodGrain(cctx, hctx, size, size, 16, 10);

    // Emendas sutis de tábua: uma ou duas linhas horizontais retas e
    // discretas, sugerindo que o tampo é feito de poucas peças
    // maciças unidas — bem espaçadas, para não virar um ladrilho óbvio.
    const seamCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < seamCount; i++) {
      const y = size * (0.3 + Math.random() * 0.4);
      cctx.strokeStyle = "rgba(24, 14, 8, 0.35)";
      cctx.lineWidth = 1;
      cctx.beginPath();
      cctx.moveTo(0, y);
      cctx.lineTo(size, y);
      cctx.stroke();
      hctx.strokeStyle = "rgba(70, 70, 70, 0.55)";
      hctx.lineWidth = 1;
      hctx.beginPath();
      hctx.moveTo(0, y);
      hctx.lineTo(size, y);
      hctx.stroke();
    }

    // Manchas de desgaste: áreas levemente descoloridas, como se o
    // verniz tivesse sumido com o uso ao longo dos anos.
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 3 + Math.random() * 5;
      const grad = cctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(150, 122, 92, 0.35)");
      grad.addColorStop(1, "rgba(150, 122, 92, 0)");
      cctx.fillStyle = grad;
      cctx.beginPath();
      cctx.arc(x, y, r, 0, Math.PI * 2);
      cctx.fill();
    }

    // Leve escurecimento acumulado nos quatro cantos (sujeira e uso ao
    // longo do tempo), discreto o bastante para não parecer uma
    // vinheta artificial.
    const corners = [[0, 0], [size, 0], [0, size], [size, size]];
    corners.forEach(function (c) {
      const grad = cctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], size * 0.4);
      grad.addColorStop(0, "rgba(20, 12, 6, 0.22)");
      grad.addColorStop(1, "rgba(20, 12, 6, 0)");
      cctx.fillStyle = grad;
      cctx.fillRect(0, 0, size, size);
    });

    // Ruído leve para quebrar a uniformidade
    const imgData = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      imgData.data[i] += n;
      imgData.data[i + 1] += n * 0.8;
      imgData.data[i + 2] += n * 0.6;
    }
    cctx.putImageData(imgData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
    };
  }

  // Frente da gaveta da escrivaninha: textura única (sem repetição —
  // cobre a peça inteira de uma vez, como uma tábua maciça só, mesmo
  // princípio da folha da porta em createDoorPanelTexture), com o
  // mesmo grão de madeira do corpo da escrivaninha (paintWoodGrain,
  // pra combinar) e um sulco de painel rebaixado com cantos chanfrados
  // — mesma técnica dos almofadados da porta (paintPanelGroove), só
  // que em escala menor e sem travessa central. Tom levemente mais
  // escuro que o tampo/pernas, sugerindo uma peça com mais manuseio, e
  // um leve desbotamento concentrado ao redor do puxador (a mão passa
  // sempre no mesmo lugar). Esse pequeno "desenho" na frente da gaveta
  // é o que dá o ar de peça de marcenaria de verdade, em vez de uma
  // tábua lisa qualquer.
  function createDeskDrawerFrontTexture() {
    const w = 96;
    const h = 16;
    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = w;
    colorCanvas.height = h;
    const heightCanvas = document.createElement("canvas");
    heightCanvas.width = w;
    heightCanvas.height = h;
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");

    const base = "#553a24";
    cctx.fillStyle = base;
    cctx.fillRect(0, 0, w, h);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, w, h);

    paintWoodGrain(cctx, hctx, w, h, 12, 7);

    const marginX = w * 0.09;
    const marginY = h * 0.16;
    const cut = Math.min(w, h) * 0.09;
    paintPanelGroove(cctx, hctx, marginX, marginY, w - marginX * 2, h - marginY * 2, cut);

    // Desbotamento suave concentrado no centro (onde fica o puxador):
    // o verniz sai primeiro onde a mão passa toda vez.
    const wearGrad = cctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h * 0.9);
    wearGrad.addColorStop(0, "rgba(150, 122, 92, 0.22)");
    wearGrad.addColorStop(1, "rgba(150, 122, 92, 0)");
    cctx.fillStyle = wearGrad;
    cctx.fillRect(0, 0, w, h);

    // Ruído leve final, mesma técnica do resto do jogo
    const colorData = cctx.getImageData(0, 0, w, h);
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 12;
      colorData.data[i] += n;
      colorData.data[i + 1] += n * 0.8;
      colorData.data[i + 2] += n * 0.6;
    }
    cctx.putImageData(colorData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, 1, 1),
      normalMap: heightCanvasToNormalTexture(heightCanvas, 1, 1),
    };
  }

  // Gotas escorrendo: traços verticais irregulares e translúcidos sobre
  // fundo transparente, pensados para deslizar (offset.y) e simular a
  // água descendo pelo vidro.
  function createRainStreakTexture(repeatX, repeatY) {
    const size = 32;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(190, 205, 218, 0.55)";
    ctx.lineWidth = 1;

    for (let i = 0; i < 9; i++) {
      let x = Math.random() * size;
      let y = Math.random() * size * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      while (y < size) {
        y += 2 + Math.random() * 3;
        x += (Math.random() - 0.5) * 1.4;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    return toThreeTexture(canvas, repeatX, repeatY);
  }

  // Desenha um losango preenchido (usado no medalhão central do tapete).
  function fillDiamond(ctx, cx, cy, halfW, halfH) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - halfH);
    ctx.lineTo(cx + halfW, cy);
    ctx.lineTo(cx, cy + halfH);
    ctx.lineTo(cx - halfW, cy);
    ctx.closePath();
    ctx.fill();
  }

  // Tapete vermelho ornamentado (corredor), estilo "runner" oriental:
  // borda escura com friso dourado, campo vermelho profundo com
  // medalhões em losango repetidos ao longo do comprimento (o padrão
  // se completa via repeatY, aplicado pelo material-library) e uma
  // trilha central levemente desbotada, como se fosse o caminho mais
  // pisado — reforça o desgaste sem parecer sujo. Ruído final para
  // quebrar a uniformidade, igual às outras texturas do jogo.
  function createCarpetTexture(repeatX, repeatY) {
    const size = 64;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");

    const fieldColor = "#6e1620";
    const borderColor = "#1c0d0f";
    const goldColor = "#b08a4e";
    const goldDim = "#8a6a3a";

    // Campo vermelho
    ctx.fillStyle = fieldColor;
    ctx.fillRect(0, 0, size, size);

    // Trilha central desbotada (efeito de uso/desgaste ao longo do
    // caminho mais pisado do corredor)
    const pathGrad = ctx.createLinearGradient(size * 0.32, 0, size * 0.68, 0);
    pathGrad.addColorStop(0, "rgba(0,0,0,0)");
    pathGrad.addColorStop(0.5, "rgba(40, 10, 14, 0.22)");
    pathGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = pathGrad;
    ctx.fillRect(0, 0, size, size);

    // Borda escura nas laterais (largura do tapete)
    const borderW = 7;
    ctx.fillStyle = borderColor;
    ctx.fillRect(0, 0, borderW, size);
    ctx.fillRect(size - borderW, 0, borderW, size);

    // Friso dourado separando a borda do campo
    ctx.fillStyle = goldColor;
    ctx.fillRect(borderW - 1, 0, 1, size);
    ctx.fillRect(size - borderW, 0, 1, size);

    // "Dentes" decorativos repetidos ao longo da borda
    ctx.fillStyle = goldDim;
    for (let y = 2; y < size; y += 8) {
      ctx.fillRect(2, y, 3, 2);
      ctx.fillRect(size - 5, y, 3, 2);
    }

    // Medalhão central em losango (repete a cada tile via repeatY)
    const cx = size / 2;
    const cy = size / 2;
    ctx.fillStyle = goldColor;
    fillDiamond(ctx, cx, cy, 12, 8);
    ctx.fillStyle = fieldColor;
    fillDiamond(ctx, cx, cy, 8, 5);
    ctx.fillStyle = goldDim;
    fillDiamond(ctx, cx, cy, 4, 2.5);

    // Pequenos brotos florais entre os medalhões
    ctx.fillStyle = goldDim;
    ctx.fillRect(cx - 1, 3, 2, 2);
    ctx.fillRect(cx - 1, size - 5, 2, 2);

    // Manchas de desgaste: fibras puídas e leve sujeira acumulada,
    // para não parecer um tapete novo demais.
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const dark = Math.random() < 0.6;
      const a = dark ? 0.08 + Math.random() * 0.18 : 0.05 + Math.random() * 0.12;
      ctx.fillStyle = dark
        ? `rgba(20, 8, 8, ${a})`
        : `rgba(180, 150, 120, ${a})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Ruído leve por pixel, mesma técnica usada nas outras texturas
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 12;
      imgData.data[i] += n;
      imgData.data[i + 1] += n * 0.6;
      imgData.data[i + 2] += n * 0.5;
    }
    ctx.putImageData(imgData, 0, 0);

    return toThreeTexture(canvas, repeatX, repeatY);
  }

  // -----------------------------------------------------------------
  // Porta: folha almofadada (dois painéis de cantos chanfrados +
  // travessa central) e moldura própria, inspiradas na foto de
  // referência enviada pelo jogador (porta de madeira nobre em tom
  // âmbar, moldura num castanho-avermelhado mais escuro).
  //
  // IMPORTANTE: estas texturas alimentam materials.doorPanel e
  // materials.doorCasing (ver material-library.js) — materiais NOVOS,
  // exclusivos da folha/moldura da própria porta. materials.door e
  // materials.doorFrame continuam intocados, porque WindowFactory,
  // PictureFactory, DeskFactory e PhoneFactory reaproveitam esses dois
  // para peças que não são a porta (peitoril de janela, moldura de
  // quadro, etc.) — trocar o conteúdo deles mudaria essas outras peças
  // também, o que não foi pedido.
  // -----------------------------------------------------------------

  // Desenha um traço num ctx a partir de uma lista de pontos [x,y] já
  // prontos — usado tanto pela grã da madeira quanto pelo sulco dos
  // almofadados, sempre chamado duas vezes (cor + altura) com os
  // MESMOS pontos, pra o relevo do normal map bater com o que se vê.
  function strokePath(ctx, points, strokeStyle, lineWidth, closed) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    points.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    });
    if (closed) ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Pontos de um retângulo com os quatro cantos cortados em 45° — o
  // desenho clássico de canto chanfrado dos almofadados na referência.
  function cutCornerRectPath(x, y, w, h, cut) {
    return [
      [x + cut, y],
      [x + w - cut, y],
      [x + w, y + cut],
      [x + w, y + h - cut],
      [x + w - cut, y + h],
      [x + cut, y + h],
      [x, y + h - cut],
      [x, y + cut],
    ];
  }

  // Contorno de um almofadado (painel afundado): um sulco escuro
  // seguindo a borda real do painel, mais um friso claro logo por fora
  // sugerindo o bisel pegando luz — desenhado ao mesmo tempo na cor e
  // na altura, pra sair relevo de verdade no normal map em vez de um
  // desenho só "pintado" e chapado.
  function paintPanelGroove(cctx, hctx, x, y, w, h, cut) {
    const outer = cutCornerRectPath(x, y, w, h, cut);
    const light = cutCornerRectPath(x - 1.2, y - 1.2, w + 2.4, h + 2.4, cut + 1.2);

    strokePath(cctx, outer, "rgba(35, 20, 10, 0.6)", 2, true);
    strokePath(hctx, outer, "rgba(60, 60, 60, 0.75)", 2, true);

    strokePath(cctx, light, "rgba(212, 168, 108, 0.28)", 1, true);
    strokePath(hctx, light, "rgba(185, 185, 185, 0.35)", 1, true);
  }

  // Folha da porta: madeira em tom âmbar/mel, mais clara e viva que a
  // moldura ao redor (mesmo contraste da referência), com grã vertical,
  // alguns nós e o desenho de dois almofadados + travessa central.
  // Sem parâmetro de repeat: a textura cobre a folha inteira de uma só
  // vez (repeat 1,1), como uma peça única de madeira maciça.
  function createDoorPanelTexture() {
    const w = 72;
    const h = 128;
    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = w;
    colorCanvas.height = h;
    const heightCanvas = document.createElement("canvas");
    heightCanvas.width = w;
    heightCanvas.height = h;
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");

    cctx.fillStyle = "#8a5a34";
    cctx.fillRect(0, 0, w, h);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, w, h);

    // Grã vertical (acompanha o comprimento da porta, como numa tábua
    // maciça de verdade — mesma técnica de createWoodTexture, só com
    // os eixos trocados).
    for (let i = 0; i < 34; i++) {
      const points = [[Math.random() * w, 0]];
      let cx = points[0][0];
      let cy = 0;
      while (cy < h) {
        cy += 5 + Math.random() * 5;
        cx += (Math.random() - 0.5) * 1.6;
        points.push([cx, cy]);
      }
      strokePath(cctx, points, "rgba(58, 34, 16, 0.4)", 1, false);
    }

    // Nós da madeira: manchas escuras concêntricas, detalhe comum numa
    // porta maciça e visível na foto de referência.
    for (let i = 0; i < 4; i++) {
      const kx = w * (0.2 + Math.random() * 0.6);
      const ky = h * (0.1 + Math.random() * 0.8);
      const kr = 2 + Math.random() * 2;
      const grad = cctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
      grad.addColorStop(0, "rgba(40, 22, 10, 0.55)");
      grad.addColorStop(0.6, "rgba(60, 35, 18, 0.35)");
      grad.addColorStop(1, "rgba(60, 35, 18, 0)");
      cctx.fillStyle = grad;
      cctx.beginPath();
      cctx.ellipse(kx, ky, kr, kr * 1.6, 0, 0, Math.PI * 2);
      cctx.fill();
    }

    // Dois almofadados de cantos chanfrados + travessa central lisa
    // entre eles — mesma proporção da referência (painel de cima mais
    // quadrado, painel de baixo mais alto).
    const marginX = w * 0.15;
    const panel1Top = h * 0.07;
    const panel1Bottom = h * 0.43;
    const panel2Top = h * 0.55;
    const panel2Bottom = h * 0.9;
    const cut = w * 0.09;

    paintPanelGroove(cctx, hctx, marginX, panel1Top, w - marginX * 2, panel1Bottom - panel1Top, cut);
    paintPanelGroove(cctx, hctx, marginX, panel2Top, w - marginX * 2, panel2Bottom - panel2Top, cut);

    [cctx, hctx].forEach(function (ctx, i) {
      ctx.strokeStyle = i === 0 ? "rgba(35, 20, 10, 0.5)" : "rgba(75, 75, 75, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX * 0.6, panel1Bottom + 2);
      ctx.lineTo(w - marginX * 0.6, panel1Bottom + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(marginX * 0.6, panel2Top - 2);
      ctx.lineTo(w - marginX * 0.6, panel2Top - 2);
      ctx.stroke();
    });

    // Ruído leve final, mesma técnica das outras texturas do jogo
    const colorData = cctx.getImageData(0, 0, w, h);
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 12;
      colorData.data[i] += n;
      colorData.data[i + 1] += n * 0.8;
      colorData.data[i + 2] += n * 0.55;
    }
    cctx.putImageData(colorData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, 1, 1),
      normalMap: heightCanvasToNormalTexture(heightCanvas, 1, 1),
    };
  }

  // Moldura própria da porta (o caixilho ao redor da folha): madeira
  // num castanho-avermelhado mais escuro que a folha, com grã vertical
  // sutil. Tileável — repete ao longo das peças compridas da moldura,
  // diferente da textura única da folha acima.
  function createDoorFrameWoodTexture(repeatX, repeatY) {
    const size = 32;
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");

    cctx.fillStyle = "#4a2a18";
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 14; i++) {
      const points = [[Math.random() * size, 0]];
      let cx = points[0][0];
      let cy = 0;
      while (cy < size) {
        cy += 4 + Math.random() * 4;
        cx += (Math.random() - 0.5) * 1.2;
        points.push([cx, cy]);
      }
      strokePath(cctx, points, "rgba(24, 13, 7, 0.45)", 1, false);
      strokePath(hctx, points, "rgba(100, 100, 100, 0.4)", 1, false);
    }

    const colorData = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      colorData.data[i] += n;
      colorData.data[i + 1] += n * 0.75;
      colorData.data[i + 2] += n * 0.5;
    }
    cctx.putImageData(colorData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
    };
  }

  // Franjas do tapete: fios finos e irregulares sobre fundo
  // transparente (mesmo princípio de textura "recorte" usado nas gotas
  // de chuva das janelas), aplicados nas duas pontas do tapete.
  function createCarpetFringeTexture(repeatX, repeatY) {
    const w = 64;
    const h = 16;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    for (let x = 0; x < w; x += 3) {
      const alpha = 0.55 + Math.random() * 0.4;
      const thickness = 1 + Math.round(Math.random());
      ctx.fillStyle = `rgba(156, 124, 70, ${alpha})`;
      ctx.fillRect(x, 0, thickness, h);
    }

    return toThreeTexture(canvas, repeatX, repeatY);
  }

  // Cerâmica envelhecida dos vasos de planta do corredor: acabamento
  // fosco com manchas de pátina e leve escorrido mineral pelas laterais,
  // como um vaso antigo que recebeu água por anos — dá o ar "conservado,
  // mas com idade" pedido para os vasos (ver PottedPlantFactory), sem
  // parecer sujo ou quebrado.
  function createAgedCeramicTexture(repeatX, repeatY) {
    const size = 64;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");

    const base = "#6e5b48";
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // Manchas de pátina: áreas levemente esverdeadas/escurecidas,
    // espalhadas de forma irregular pela superfície.
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 4 + Math.random() * 7;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(56, 58, 44, 0.4)");
      grad.addColorStop(1, "rgba(56, 58, 44, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Escorridos minerais: traços verticais finos e irregulares, como
    // água escorrendo pela lateral do vaso ao longo dos anos.
    ctx.strokeStyle = "rgba(40, 36, 28, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      let x = Math.random() * size;
      let y = Math.random() * size * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      while (y < size) {
        y += 3 + Math.random() * 4;
        x += (Math.random() - 0.5) * 1.2;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Ruído leve para quebrar a uniformidade (mesma técnica do resto do jogo)
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 12;
      imgData.data[i] += n;
      imgData.data[i + 1] += n * 0.9;
      imgData.data[i + 2] += n * 0.7;
    }
    ctx.putImageData(imgData, 0, 0);

    return toThreeTexture(canvas, repeatX, repeatY);
  }

  // -----------------------------------------------------------------
  // Plástico envelhecido do corpo do telefone de mesa (PhoneFactory):
  // tom creme/bege com leve variação de matiz — plástico antigo nunca
  // amarela de forma perfeitamente uniforme —, pequenos arranhões
  // foscos (traços curtos e claros, espalhados ao acaso) e algumas
  // marcas escuras discretas de uso acumulado. Acabamento sem brilho
  // (a definição de "fosco" fica a cargo do roughness alto do material
  // em materials.phoneBody; esta função só cuida do padrão visual).
  // Relevo bem sutil via normal map, mesma técnica das paredes/madeira
  // (ver heightCanvasToNormalTexture): só o bastante pra a superfície
  // reagir à luz rasante da luminária do corredor, sem exagerar.
  // -----------------------------------------------------------------
  function createAgedPlasticTexture(repeatX, repeatY) {
    const size = 64;
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");

    const base = "#cabf9c";
    cctx.fillStyle = base;
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);

    // Manchas largas e suaves de amarelamento desigual.
    for (let i = 0; i < 4; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = size * (0.28 + Math.random() * 0.22);
      const yellowed = Math.random() < 0.6;
      const grad = cctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(
        0,
        yellowed ? "rgba(178, 156, 96, 0.22)" : "rgba(150, 145, 128, 0.16)"
      );
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      cctx.fillStyle = grad;
      cctx.beginPath();
      cctx.arc(x, y, r, 0, Math.PI * 2);
      cctx.fill();
    }

    // Pequenos arranhões foscos: traços curtos, finos e claros —
    // desgaste natural do manuseio ao longo dos anos.
    const scratches = [];
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 2 + Math.random() * 4;
      const angle = Math.random() * Math.PI * 2;
      scratches.push([x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len]);
    }
    cctx.strokeStyle = "rgba(226, 218, 196, 0.35)";
    cctx.lineWidth = 0.6;
    scratches.forEach(function (s) {
      cctx.beginPath();
      cctx.moveTo(s[0], s[1]);
      cctx.lineTo(s[2], s[3]);
      cctx.stroke();
    });
    // Mesmos traços, também na altura (riscos levemente afundados),
    // pro normal map acompanhar o que se vê na cor.
    hctx.strokeStyle = "rgba(100, 100, 100, 0.4)";
    hctx.lineWidth = 0.6;
    scratches.forEach(function (s) {
      hctx.beginPath();
      hctx.moveTo(s[0], s[1]);
      hctx.lineTo(s[2], s[3]);
      hctx.stroke();
    });

    // Pontinhos escuros ocasionais (pequenas marcas de uso acumulado).
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      cctx.fillStyle = `rgba(70, 62, 46, ${0.15 + Math.random() * 0.2})`;
      cctx.fillRect(x, y, 1, 1);
    }

    // Ruído fino final, mesma técnica do resto do jogo.
    const colorData = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      colorData.data[i] += n;
      colorData.data[i + 1] += n * 0.9;
      colorData.data[i + 2] += n * 0.7;
    }
    cctx.putImageData(colorData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
    };
  }

  // -----------------------------------------------------------------
  // Baquelite escura envelhecida do corpo do novo telefone de mesa
  // (PhoneFactory, versão redesenhada): tom quase preto com leve calor
  // acastanhado — em vez do "amarelamento" do plástico creme anterior,
  // aqui a variação de tom lembra a oxidação natural da baquelite
  // antiga (mancha para um castanho-avermelhado sutil com o tempo),
  // mais pequenos arranhões foscos, uns pontinhos discretos de
  // polimento (leve brilho acumulado onde a peça é mais tocada) e
  // marcas escuras de uso — "antiga, porém bem conservada", sem
  // brilho exagerado (isso fica a cargo do roughness alto do material
  // em materials.phoneBody). Relevo sutil via normal map, mesma
  // técnica das demais texturas do jogo (ver heightCanvasToNormalTexture).
  // -----------------------------------------------------------------
  function createAgedBakeliteTexture(repeatX, repeatY) {
    const size = 64;
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");

    const base = "#241c17";
    cctx.fillStyle = base;
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);

    // Manchas largas e suaves de oxidação (castanho-avermelhado),
    // espalhadas de forma irregular — mais discretas que o
    // amarelamento do plástico, para não fugir do "bem conservada".
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = size * (0.22 + Math.random() * 0.2);
      const grad = cctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(94, 48, 30, 0.26)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      cctx.fillStyle = grad;
      cctx.beginPath();
      cctx.arc(x, y, r, 0, Math.PI * 2);
      cctx.fill();
    }

    // Pontinhos de polimento: manchas suaves e claras onde o
    // manuseio ao longo dos anos deixou a superfície um pouco mais
    // lisa/clara — só uns poucos, nos lugares mais tocados.
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = size * (0.05 + Math.random() * 0.05);
      const grad = cctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(150, 138, 118, 0.2)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      cctx.fillStyle = grad;
      cctx.beginPath();
      cctx.arc(x, y, r, 0, Math.PI * 2);
      cctx.fill();
    }

    // Pequenos arranhões foscos, mesma técnica do plástico do modelo
    // anterior (traços curtos e claros, espalhados ao acaso).
    const scratches = [];
    for (let i = 0; i < 16; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 2 + Math.random() * 4;
      const angle = Math.random() * Math.PI * 2;
      scratches.push([x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len]);
    }
    cctx.strokeStyle = "rgba(196, 182, 158, 0.28)";
    cctx.lineWidth = 0.6;
    scratches.forEach(function (s) {
      cctx.beginPath();
      cctx.moveTo(s[0], s[1]);
      cctx.lineTo(s[2], s[3]);
      cctx.stroke();
    });
    hctx.strokeStyle = "rgba(100, 100, 100, 0.35)";
    hctx.lineWidth = 0.6;
    scratches.forEach(function (s) {
      hctx.beginPath();
      hctx.moveTo(s[0], s[1]);
      hctx.lineTo(s[2], s[3]);
      hctx.stroke();
    });

    // Pontinhos escuros ocasionais (marcas de uso acumulado).
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      cctx.fillStyle = "rgba(10, 8, 6, " + (0.15 + Math.random() * 0.2) + ")";
      cctx.fillRect(x, y, 1, 1);
    }

    // Ruído fino final, mesma técnica do resto do jogo.
    const colorData = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 9;
      colorData.data[i] += n;
      colorData.data[i + 1] += n * 0.85;
      colorData.data[i + 2] += n * 0.7;
    }
    cctx.putImageData(colorData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
    };
  }

  // -----------------------------------------------------------------
  // Lambri de madeira clara das paredes do quarto ("MEU QUARTO" — ver
  // scenes/room-scene.js)
  // -----------------------------------------------------------------
  // Ripas verticais pintadas num tom bege/creme desgastado, inspiradas
  // na imagem de referência enviada pelo jogador (parede em lambri
  // claro) — mas não é uma cópia realista dela: o padrão é redesenhado
  // do zero, em baixa resolução, pra combinar com a estética PS1/PSX
  // do resto do jogo, e não com o material moderno/fotográfico da
  // referência. Mesma técnica de canvas de cor + canvas de altura de
  // createOldPlasterWallTexture acima (a parede do corredor); aqui o
  // relevo vem dos sulcos entre as ripas (levemente afundados), não de
  // manchas orgânicas de reboco.
  function createPsxWallPanelTexture(repeatX, repeatY) {
    const size = 128;
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");

    // Base: madeira clara pintada, bege/creme.
    const baseR = 221;
    const baseG = 214;
    const baseB = 199;
    cctx.fillStyle = "rgb(" + baseR + ", " + baseG + ", " + baseB + ")";
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);

    // Ripas verticais: cada uma um pouco mais clara ou mais escura que
    // a base (tábuas reais nunca saem idênticas), mais um grão vertical
    // bem sutil dentro de cada uma (linhas finas, levemente onduladas,
    // mesma técnica dos veios de createWoodTexture, só que verticais).
    const panelCount = 8;
    const panelWidth = size / panelCount;
    for (let i = 0; i < panelCount; i++) {
      const x = i * panelWidth;
      const shade = 5 + Math.floor(Math.random() * 9); // 5-13
      const sign = Math.random() < 0.5 ? 1 : -1;
      cctx.fillStyle =
        "rgb(" +
        (baseR + sign * shade) +
        ", " +
        (baseG + sign * shade) +
        ", " +
        (baseB + sign * Math.round(shade * 0.85)) +
        ")";
      cctx.fillRect(x, 0, panelWidth, size);

      cctx.strokeStyle = "rgba(150, 140, 120, 0.16)";
      cctx.lineWidth = 1;
      const grainLines = 3;
      for (let g = 0; g < grainLines; g++) {
        const gx = x + (panelWidth / (grainLines + 1)) * (g + 1);
        cctx.beginPath();
        cctx.moveTo(gx, 0);
        let cx = gx;
        let cy = 0;
        while (cy < size) {
          cy += 6 + Math.random() * 6;
          cx += (Math.random() - 0.5) * 2;
          cctx.lineTo(cx, cy);
        }
        cctx.stroke();
      }
    }

    // Sulcos entre as ripas: linha vertical mais escura na cor e
    // afundada no mapa de altura (o normal map resultante dá a sombra
    // sutil de um sulco real de encaixe entre tábuas). Desenhado nas
    // duas bordas do canvas (x=0 e x=size) para fechar sem costura
    // quando a textura repete (RepeatWrapping).
    const grooveWidth = 2;
    for (let i = 0; i <= panelCount; i++) {
      const x = Math.round(i * panelWidth);
      cctx.fillStyle = "rgba(118, 109, 90, 0.6)";
      cctx.fillRect(x - grooveWidth / 2, 0, grooveWidth, size);
      hctx.fillStyle = "rgb(85, 85, 85)";
      hctx.fillRect(x - grooveWidth / 2, 0, grooveWidth, size);
    }

    // Ruído fino final (grão da pintura), mesma técnica do resto do jogo.
    const colorData = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 8;
      colorData.data[i] += n;
      colorData.data[i + 1] += n * 0.95;
      colorData.data[i + 2] += n * 0.85;
    }
    cctx.putImageData(colorData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
    };
  }


  // -----------------------------------------------------------------
  // Telha de madeira do TELHADO (ver models/roof-factory.js). Feita a
  // partir da referencia de telhado enviada pelo jogador: fiadas
  // horizontais bem marcadas, tabuas estreitas desencontradas de uma
  // fiada para a outra, sombra forte na emenda de baixo de cada fiada e
  // um marrom escuro quase preto, sujo. O V da textura corre no sentido
  // da INCLINACAO (ver o UV em models/roof-factory.js), entao as fiadas
  // ficam paralelas ao beiral, como num telhado de verdade. Mesma
  // receita do resto do arquivo: 64x64, NearestFilter e um mapa de
  // altura em paralelo, virado em normal map no fim (e ele que da o
  // relevo de fiada sobreposta com a luz fraca da casa).
  function createRoofShingleTexture(repeatX, repeatY) {
    const size = 64;
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");

    cctx.fillStyle = "#3a2917";
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);

    const rowHeight = 8; // 8 fiadas na textura
    const tileWidth = 10; // largura de cada telha dentro da fiada

    for (let row = 0; row * rowHeight < size; row++) {
      const y = row * rowHeight;

      // Cada fiada com um tom levemente diferente: e o que impede o
      // telhado de virar uma chapa lisa de cor unica vista de longe.
      const tone = 8 + Math.floor(Math.random() * 16);
      cctx.fillStyle = "rgb(" + (52 + tone) + ", " + (36 + tone * 0.7) + ", " + (21 + tone * 0.5) + ")";
      cctx.fillRect(0, y, size, rowHeight - 1);

      // A fiada de cima cobre a de baixo: sombra na emenda e um degrau
      // no mapa de altura, no mesmo lugar.
      cctx.fillStyle = "rgba(10, 6, 3, 0.7)";
      cctx.fillRect(0, y + rowHeight - 1, size, 1);
      hctx.fillStyle = "rgb(58, 58, 58)";
      hctx.fillRect(0, y + rowHeight - 1, size, 1);
      hctx.fillStyle = "rgb(178, 178, 178)";
      hctx.fillRect(0, y, size, 1);

      // Recortes entre telhas, desencontrados a cada fiada (meia telha
      // de deslocamento), como no assentamento real.
      const offset = (row % 2) * (tileWidth / 2);
      for (let x = offset; x < size + tileWidth; x += tileWidth) {
        const cut = Math.round(x + (Math.random() - 0.5) * 2) % size;
        cctx.fillStyle = "rgba(14, 9, 4, 0.55)";
        cctx.fillRect(cut, y, 1, rowHeight - 1);
        hctx.fillStyle = "rgb(96, 96, 96)";
        hctx.fillRect(cut, y, 1, rowHeight - 1);
      }

      // Veio da madeira de cada telha: riscos curtos no sentido da
      // inclinacao (vertical na textura).
      for (let i = 0; i < 22; i++) {
        const x = Math.floor(Math.random() * size);
        const h = 2 + Math.floor(Math.random() * (rowHeight - 2));
        const dark = Math.random() < 0.6;
        cctx.fillStyle = dark ? "rgba(18, 11, 5, 0.35)" : "rgba(112, 88, 60, 0.22)";
        cctx.fillRect(x, y + Math.floor(Math.random() * (rowHeight - h)), 1, h);
      }
    }

    // Manchas de umidade/musgo bem discretas, do mesmo tipo que a casa
    // toda tem: o telhado precisa parecer velho, nao novo.
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 2 + Math.random() * 6;
      const grad = cctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(28, 30, 18, 0.3)");
      grad.addColorStop(1, "rgba(28, 30, 18, 0)");
      cctx.fillStyle = grad;
      cctx.beginPath();
      cctx.arc(x, y, r, 0, Math.PI * 2);
      cctx.fill();
    }

    // Ruido fino final, igual ao das outras texturas do jogo.
    const imgData = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 16;
      imgData.data[i] += n;
      imgData.data[i + 1] += n * 0.8;
      imgData.data[i + 2] += n * 0.6;
    }
    cctx.putImageData(imgData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
    };
  }

  // -----------------------------------------------------------------
  // Parede EXTERNA da casa (reboco velho com mofo subindo do chao)
  // -----------------------------------------------------------------
  // Textura das faces de FORA das paredes da casa - ver
  // `createWallCladding` em models/exterior-factory.js e os blocos
  // "Revestimento externo" de scenes/corridor-scene.js,
  // scenes/room-scene.js e scenes/side-room-scene.js.
  //
  // NADA do lado de DENTRO muda por causa desta receita: a parede do
  // corredor (createCorridorWainscotWallTexture) e o lambri do MEU QUARTO e
  // dos quatro comodos (createPsxWallPanelTexture) continuam
  // exatamente como estavam - esta textura so existe na casca externa,
  // que ate agora era a MESMA parede de dentro vista pelo lado de tras
  // (as paredes sao planos DoubleSide).
  //
  // Fiel a referencia enviada pelo jogador, sem ser um decalque dela
  // (mesmo caminho da grama e do lambri: receita procedural inspirada
  // na imagem, nunca a imagem em si - nenhum arquivo novo pra baixar,
  // que e a regra deste arquivo):
  //
  //   - reboco bege-claro levemente esverdeado (a referencia fica em
  //     torno de 183,169,140), com variacao ampla e suave de tom, como
  //     sujeira acumulada por decadas de chuva;
  //   - uma teia de fissuras finissimas, quase todas correndo de cima
  //     para baixo e com ramos curtos - o "craquele" de parede caiada
  //     velha, bem mais discreto que as fissuras de dentro;
  //   - alguns pontos escuros de ferrugem/infiltracao, cada um com um
  //     escorrido curto pra BAIXO;
  //   - e o traco mais marcante da referencia: a faixa de MOFO subindo
  //     do chao em linguas pontudas de altura irregular, verde-oliva
  //     que escurece ate quase preto no rodape.
  //
  // ---------- Por que esta textura NAO repete na vertical ----------
  // O mofo tem que ficar no RODAPE, e so nele. Isso amarra duas coisas:
  //
  //  1. quem usa esta textura precisa passar repeatY = 1 (uma passada
  //     unica cobrindo o pe-direito inteiro, os 4.2 metros de
  //     CorridorConfig.height) - ver materials/material-library.js. Com
  //     repeatY = 2 apareceria uma segunda faixa de mofo no meio da
  //     parede, flutuando;
  //  2. o wrap do desenho, que nas outras paredes fecha nos DOIS eixos
  //     (a grade 3x3 de fillWrappedPolygon), aqui fecha SO em X - por
  //     isso tudo aqui embaixo passa `wrapY: false`. Fechando em Y
  //     tambem, cada mancha de rodape reapareceria no alto da parede e
  //     o mofo pareceria pingar do telhado.
  //
  // Em X ela continua fechando sem costura, que e o que permite
  // repetir a mesma textura ao longo dos 22 metros da fachada do
  // corredor sem emenda: as linguas de mofo medem a distancia com
  // wrap, as manchas/fissuras sao desenhadas tambem em +-size e o
  // perfil de baixa frequencia usa senos de frequencia INTEIRA (que
  // fecham em 0 == size por construcao).
  //
  // Resolucao 128, igual a parede de dentro (o dobro do resto do jogo):
  // e a superficie que a casa mostra inteira de uma vez quando vista
  // pela janela ou de fora, entao ganha mais detalhe. Continua gerada
  // uma unica vez, no carregamento.

  // Perfil da faixa de mofo: quantos PIXELS de canvas ela sobe em cada
  // coluna x. `baseRise` e a altura media; `waves` sao as ondulacoes
  // largas (frequencia inteira, pra fechar em X) e `tongues` sao as
  // linguas pontudas que sobem bem mais alto que a media - o detalhe
  // que faz a borda superior parecer mofo e nao uma faixa pintada.
  function moldRiseProfile(size, baseRise, waves, tongues) {
    const profile = new Float32Array(size);
    for (let x = 0; x < size; x++) {
      let rise = baseRise;
      for (let i = 0; i < waves.length; i++) {
        const w = waves[i];
        rise += Math.sin((x / size) * Math.PI * 2 * w.k + w.phase) * w.amp;
      }
      for (let i = 0; i < tongues.length; i++) {
        const t = tongues[i];
        // Distancia com wrap: a lingua que nasce na borda esquerda
        // continua na direita, senao a costura em X apareceria justo
        // onde a borda do mofo e mais visivel.
        let d = Math.abs(x - t.x);
        if (d > size / 2) {
          d = size - d;
        }
        if (d < t.halfWidth) {
          const k = 1 - d / t.halfWidth;
          rise += t.height * Math.pow(k, t.sharpness);
        }
      }
      profile[x] = Math.max(2, rise);
    }
    return profile;
  }

  function createExteriorPlasterWallTexture(repeatX, repeatY) {
    const size = 128;
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");

    // Base: reboco bege-claro puxando pro esverdeado, o tom medio da
    // referencia. Mais claro e mais quente que o reboco de dentro
    // (#c9c3b7, cinzento): parede que tomou sol e chuva.
    cctx.fillStyle = "#c4b89d";
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);

    // 1. Variacao ampla e suave de tom (manchas de metros, nao de
    // centimetros): e o que impede a fachada de ler como uma cor
    // chapada quando a mesma textura repete 5 vezes ao longo do
    // corredor.
    for (let i = 0; i < 5; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size * 0.8;
      const r = size * (0.35 + Math.random() * 0.3);
      const lighter = Math.random() < 0.5;
      paintBlotch(cctx, hctx, size, cx, cy, r, {
        points: 12,
        jitter: 0.3,
        blurPx: r * 0.6,
        colorRGB: lighter ? [212, 203, 180] : [176, 164, 136],
        colorAlpha: 0.28,
        heightValue: lighter ? 124 : 132,
        heightAlpha: 0.35,
        wrapY: false,
      });
    }

    // 2. Escorridos verticais de chuva: faixas largas, levemente mais
    // escuras, descendo do alto. Bem sutis - na referencia elas quase
    // nao aparecem, mas sao elas que dao a direcao "a agua desce por
    // aqui" da fachada.
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * size;
      const w = 3 + Math.random() * 6;
      const top = Math.random() * size * 0.45;
      const len = 24 + Math.random() * 70;
      const grad = cctx.createLinearGradient(0, top, 0, top + len);
      grad.addColorStop(0, "rgba(150, 138, 112, 0)");
      grad.addColorStop(0.35, "rgba(150, 138, 112, 0.1)");
      grad.addColorStop(1, "rgba(150, 138, 112, 0)");
      cctx.fillStyle = grad;
      // Wrap so em X, na mao: as tres copias mantem a faixa inteira
      // quando ela nasce em cima da borda.
      cctx.fillRect(x - w / 2, top, w, len);
      cctx.fillRect(x - w / 2 - size, top, w, len);
      cctx.fillRect(x - w / 2 + size, top, w, len);
    }

    // 3. A teia de fissuras. Quase todas descendo (angulo em torno de
    // PI/2, que no canvas aponta pra baixo) e MAIS FINAS/CLARAS que as
    // de dentro: na referencia elas sao um craquele de cal, nao rachadura
    // estrutural. Cinco delas saem mais marcadas, pra teia nao ficar
    // toda no mesmo peso.
    for (let i = 0; i < 16; i++) {
      const strong = i < 4;
      paintCrack(
        cctx,
        hctx,
        size,
        Math.random() * size,
        Math.random() * size * 0.75,
        12 + Math.random() * 30,
        Math.PI / 2 + (Math.random() - 0.5) * 1.2,
        {
          colorStyle: strong
            ? "rgba(104, 90, 68, 0.45)"
            : "rgba(138, 126, 102, 0.38)",
          lineWidth: 0.5,
          heightStyle: "rgba(108, 108, 108, 0.5)",
          heightLineWidth: 0.6,
          wrapY: false,
        }
      );
    }

    // 4. Pontos de ferrugem/infiltracao: manchinhas escuras e
    // avermelhadas (uma cabeca de prego enferrujada, um vazamento
    // antigo), cada uma com um escorrido curto pra baixo. Na referencia
    // sao meia duzia - o suficiente pra parede ter historia.
    for (let i = 0; i < 5; i++) {
      const cx = Math.random() * size;
      const cy = size * 0.06 + Math.random() * size * 0.62;
      const r = 0.9 + Math.random() * 1.3;
      paintBlotch(cctx, hctx, size, cx, cy, r, {
        points: 7,
        jitter: 0.5,
        blurPx: 0.5,
        colorRGB: [96, 62, 42],
        colorAlpha: 0.5,
        heightValue: 118,
        heightAlpha: 0.45,
        wrapY: false,
      });
      const dripLen = 2 + Math.random() * 5;
      const drip = [];
      for (let s = 0; s <= dripLen; s++) {
        drip.push([(Math.random() - 0.5) * 1.2, s]);
      }
      strokeWrappedPath(
        cctx,
        size,
        cx,
        cy + r * 0.5,
        drip,
        "rgba(112, 80, 52, 0.22)",
        0.6,
        false
      );
    }

    // 5. Manchas soltas de mofo ACIMA da faixa, na zona de transicao:
    // pintadas antes da faixa (logo abaixo) porque a faixa so escreve
    // do proprio topo pra baixo - estas ficam por cima da linha e
    // quebram a leitura de "borda", igual na referencia.
    for (let i = 0; i < 6; i++) {
      const cx = Math.random() * size;
      const cy = size * (0.58 + Math.random() * 0.14);
      const r = 1 + Math.random() * 2;
      paintBlotch(cctx, hctx, size, cx, cy, r, {
        points: 11,
        jitter: 0.45,
        blurPx: 1.4,
        colorRGB: [92, 88, 60],
        colorAlpha: 0.14 + Math.random() * 0.12,
        heightValue: 122,
        heightAlpha: 0.3,
        wrapY: false,
      });
    }

    // 6. A FAIXA DE MOFO subindo do chao - o traco que define a
    // referencia. Feita pixel a pixel (e nao com poligonos) porque o
    // que importa aqui e o degrade vertical: transparente na ponta das
    // linguas, saturado e quase preto no rodape.
    //
    // Alturas em fracao do canvas, calibradas contra a referencia: com
    // repeatY = 1 e pe-direito de 4.2 metros (CorridorConfig.height), a
    // faixa sobe ~1.2 metro de parede na media e as linguas mais altas
    // chegam a ~1.6 - a mesma proporcao da imagem enviada, onde o mofo
    // ocupa mais ou menos o terco de baixo.
    const baseRise = size * 0.24;
    const waves = [
      { k: 2, phase: Math.random() * Math.PI * 2, amp: size * 0.03 },
      { k: 5, phase: Math.random() * Math.PI * 2, amp: size * 0.02 },
      { k: 11, phase: Math.random() * Math.PI * 2, amp: size * 0.012 },
      { k: 23, phase: Math.random() * Math.PI * 2, amp: size * 0.007 },
    ];
    const tongues = [];
    for (let i = 0; i < 18; i++) {
      tongues.push({
        x: Math.random() * size,
        halfWidth: 3 + Math.random() * 9,
        height: size * (0.02 + Math.random() * 0.07),
        // Expoente alto = ponta fina; baixo = lingua mais gorda. A faixa
        // da referencia e mais lambida que pontuda, entao a maioria sai
        // larga - com expoentes altos ela viraria capim.
        sharpness: 0.6 + Math.random() * 1.2,
      });
    }
    const profile = moldRiseProfile(size, baseRise, waves, tongues);

    const colorData = cctx.getImageData(0, 0, size, size);
    const heightData = hctx.getImageData(0, 0, size, size);

    for (let x = 0; x < size; x++) {
      const rise = profile[x];
      const topY = size - rise;
      const startY = Math.max(0, Math.ceil(topY));
      for (let y = startY; y < size; y++) {
        // 0 na ponta da lingua, 1 no rodape.
        const t = Math.min(1, Math.max(0, (y - topY) / rise));
        // Opacidade cresce rapido e satura embaixo; o ruido por pixel
        // e o que corroi a borda e evita qualquer contorno liso.
        let a = Math.pow(t, 0.75) * 0.96 * (0.72 + Math.random() * 0.56);
        if (a <= 0.01) {
          continue;
        }
        a = Math.min(1, a);
        // Verde-oliva escuro que vai escurecendo ate o rodape
        // (~54,47,35 no fim, o tom mais escuro da referencia).
        const mr = 98 - t * 44;
        const mg = 90 - t * 42;
        const mb = 64 - t * 29;
        const idx = (y * size + x) * 4;
        colorData.data[idx] = colorData.data[idx] * (1 - a) + mr * a;
        colorData.data[idx + 1] = colorData.data[idx + 1] * (1 - a) + mg * a;
        colorData.data[idx + 2] = colorData.data[idx + 2] * (1 - a) + mb * a;
        // Relevo: o mofo e uma crosta levemente rebaixada e irregular
        // (ha = um pouco menos que a opacidade de cor, pro normal map
        // nao virar um degrau seco na borda da faixa).
        const ha = a * 0.7;
        const hv = 128 - 16 * t - Math.random() * 6;
        heightData.data[idx] = heightData.data[idx] * (1 - ha) + hv * ha;
        heightData.data[idx + 1] = heightData.data[idx];
        heightData.data[idx + 2] = heightData.data[idx];
      }
    }

    // 7. Ruido fino final (grao do reboco), a mesma tecnica das outras
    // texturas do jogo - nos dois canvases, e depois da faixa pra o
    // mofo tambem ganhar grao.
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 12;
      colorData.data[i] += n;
      colorData.data[i + 1] += n * 0.9;
      colorData.data[i + 2] += n * 0.7;
      const hn = (Math.random() - 0.5) * 6;
      heightData.data[i] += hn;
      heightData.data[i + 1] += hn;
      heightData.data[i + 2] += hn;
    }
    cctx.putImageData(colorData, 0, 0);
    hctx.putImageData(heightData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
    };
  }

  // -----------------------------------------------------------------
  // PAREDE DA COZINHA: azulejo no rodape + faixa decorativa florida +
  // pintura acima (ver a referencia enviada pelo jogador). Receita
  // usada SO pela COZINHA (ver kitchenWallLong/Short em
  // materials/material-library.js): o lambri claro
  // (createPsxWallPanelTexture) continua valendo para QUARTO 01,
  // QUARTO 02, BANHEIRO e MEU QUARTO, e o CORREDOR tem a receita dele
  // (createCorridorWainscotWallTexture, mais abaixo).
  //
  // Mesma tecnica do resto do arquivo: canvas pequeno, NearestFilter e
  // um mapa de altura pintado em paralelo (virado em normal map no
  // fim) - e ele que da o rejunte afundado e o azulejo levemente
  // saliente sob a luz fraca da casa. Alem dele sai tambem um
  // roughnessMap: azulejo esmaltado brilha, pintura a base de cal nao.
  // Sem isso a parede inteira reagiria a luz do mesmo jeito e o rodape
  // nao leria como ceramica.
  //
  // ---------- Como o desenho vira metro na parede ----------
  // O canvas e QUADRADO e cobre o PE-DIREITO inteiro em uma passada
  // (repeatY = 1, mesma regra das outras paredes do jogo). Ou seja: o
  // lado do canvas equivale a CorridorConfig.height (4.2) tanto na
  // vertical quanto na horizontal, e KITCHEN_TILE_COLS = 16 ladrilhos
  // por lado dao ladrilhos de 4.2/16 = 26 cm - medida de azulejo de
  // cozinha de verdade, e a mesma em qualquer parede (quem calcula o
  // repeatX de cada largura e material-library.js, arredondando para um
  // numero INTEIRO de ladrilhos: assim a fiada fecha na quina em vez de
  // cortar um azulejo no meio, e o pixel nao estica).
  //
  // Com KITCHEN_WAINSCOT_ROWS = 5 + 1 fiada decorativa, o azulejo sobe
  // 1.31 m e a faixa florida fecha em 1.57 m - abaixo dos 2.65 m do
  // teto rebaixado da cozinha (ver loweredCeiling em
  // scenes/house-config.js), na mesma proporcao da foto de referencia
  // (pouco mais da metade da parede em azulejo, o resto pintado).
  //
  // O V da parede tem v = 0 EMBAIXO e o canvas cresce para baixo, entao
  // o rodape de azulejo e pintado no FIM do canvas.
  // -----------------------------------------------------------------
  const KITCHEN_TILE_COLS = 16; // ladrilhos por lado do canvas
  const KITCHEN_WAINSCOT_ROWS = 5; // fiadas de azulejo liso
  const KITCHEN_BORDER_ROWS = 1; // fiadas da faixa decorativa

  function createKitchenTileWallTexture(repeatX, repeatY) {
    const size = 128;
    const tile = size / KITCHEN_TILE_COLS; // 8 px por azulejo
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const roughCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");
    const rctx = roughCanvas.getContext("2d");

    // Fronteiras horizontais do desenho (em pixels do canvas).
    const wainscotTop = size - tile * KITCHEN_WAINSCOT_ROWS; // 88
    const borderTop = wainscotTop - tile * KITCHEN_BORDER_ROWS; // 80

    // ---------- Pintura de cima ----------
    // Verde-caqui esmaecido da referencia. Pintura a cal velha: fosca
    // (branco no roughnessMap) e sem relevo nenhum (altura neutra 128).
    const paintR = 168;
    const paintG = 166;
    const paintB = 132;
    cctx.fillStyle = "rgb(" + paintR + ", " + paintG + ", " + paintB + ")";
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);
    rctx.fillStyle = "rgb(255, 255, 255)";
    rctx.fillRect(0, 0, size, size);

    // Manchas da pintura envelhecida. wrapY: false de proposito (mesmo
    // motivo da parede externa): esta textura NAO repete na vertical, e
    // uma mancha nascida no alto nao pode reaparecer dentro do azulejo.
    // O borrao que escorrer para baixo do borderTop e coberto pelas
    // fiadas, pintadas depois.
    for (let i = 0; i < 9; i++) {
      const dark = Math.random() < 0.65;
      paintBlotch(
        cctx,
        null,
        size,
        Math.random() * size,
        Math.random() * borderTop,
        7 + Math.random() * 18,
        {
          points: 9,
          jitter: 0.42,
          blurPx: 4,
          colorRGB: dark ? [122, 120, 90] : [198, 195, 168],
          colorAlpha: dark
            ? 0.1 + Math.random() * 0.09
            : 0.07 + Math.random() * 0.07,
          wrapY: false,
        }
      );
    }

    // Sujeira acumulada logo acima da faixa decorativa (a linha onde a
    // parede encosta no azulejo e nunca e lavada).
    const grime = cctx.createLinearGradient(0, borderTop - 9, 0, borderTop);
    grime.addColorStop(0, "rgba(110, 106, 78, 0)");
    grime.addColorStop(1, "rgba(110, 106, 78, 0.26)");
    cctx.fillStyle = grime;
    cctx.fillRect(0, borderTop - 9, size, 9);

    // ---------- Rodape de azulejo ----------
    // Bege areia da referencia, com cada peca num tom um pouco
    // diferente (azulejo antigo nunca sai igual) e marquinhas de uso.
    const tileR = 198;
    const tileG = 176;
    const tileB = 134;
    hctx.fillStyle = "rgb(148, 148, 148)"; // ceramica saliente
    hctx.fillRect(0, wainscotTop, size, size - wainscotTop);
    rctx.fillStyle = "rgb(140, 140, 140)"; // esmalte: brilha mais que a cal
    rctx.fillRect(0, wainscotTop, size, size - wainscotTop);

    for (let row = 0; row < KITCHEN_WAINSCOT_ROWS; row++) {
      for (let col = 0; col < KITCHEN_TILE_COLS; col++) {
        const x = col * tile;
        const y = wainscotTop + row * tile;
        const sign = Math.random() < 0.5 ? 1 : -1;
        const shade = 3 + Math.floor(Math.random() * 8); // 3-10
        cctx.fillStyle =
          "rgb(" +
          (tileR + sign * shade) +
          ", " +
          (tileG + sign * shade) +
          ", " +
          (tileB + sign * Math.round(shade * 0.8)) +
          ")";
        cctx.fillRect(x, y, tile, tile);

        const marks = 2 + Math.floor(Math.random() * 2);
        for (let m = 0; m < marks; m++) {
          const a = 0.05 + Math.random() * 0.1;
          cctx.fillStyle = "rgba(120, 100, 72, " + a + ")";
          cctx.fillRect(
            x + 1 + Math.floor(Math.random() * (tile - 2)),
            y + 1 + Math.floor(Math.random() * (tile - 2)),
            1,
            1
          );
        }
      }
    }

    // ---------- A fiada decorativa florida ----------
    // Fundo branco-creme e um motivo miudo por peca, alternando flor
    // laranja e cruz azul - a referencia alterna os dois. Em 8 px por
    // peca o desenho e literalmente pixel por pixel: e exatamente o
    // tipo de arte que o PS1 fazia.
    const flowerOrange = "rgb(200, 86, 48)";
    const flowerOrangeDeep = "rgb(168, 64, 36)";
    const flowerBlue = "rgb(56, 84, 138)";
    const flowerGreen = "rgb(96, 116, 60)";
    hctx.fillStyle = "rgb(168, 168, 168)"; // peca um tico mais saliente
    hctx.fillRect(0, borderTop, size, tile * KITCHEN_BORDER_ROWS);
    rctx.fillStyle = "rgb(118, 118, 118)"; // a mais esmaltada das tres faixas
    rctx.fillRect(0, borderTop, size, tile * KITCHEN_BORDER_ROWS);

    for (let col = 0; col < KITCHEN_TILE_COLS; col++) {
      const x0 = col * tile;
      const y0 = borderTop;
      const dirt = Math.floor(Math.random() * 7);
      cctx.fillStyle =
        "rgb(" + (232 - dirt) + ", " + (228 - dirt) + ", " + (214 - dirt) + ")";
      cctx.fillRect(x0, y0, tile, tile);

      const petal = col % 2 === 0 ? flowerOrange : flowerBlue;
      const core = col % 2 === 0 ? flowerOrangeDeep : flowerOrange;

      // Petalas nos quatro lados + miolo.
      cctx.fillStyle = petal;
      cctx.fillRect(x0 + 3, y0 + 1, 2, 1);
      cctx.fillRect(x0 + 3, y0 + 6, 2, 1);
      cctx.fillRect(x0 + 1, y0 + 3, 1, 2);
      cctx.fillRect(x0 + 6, y0 + 3, 1, 2);
      cctx.fillStyle = core;
      cctx.fillRect(x0 + 3, y0 + 3, 2, 2);

      // Folhinhas nas diagonais.
      cctx.fillStyle = flowerGreen;
      cctx.fillRect(x0 + 2, y0 + 2, 1, 1);
      cctx.fillRect(x0 + 5, y0 + 2, 1, 1);
      cctx.fillRect(x0 + 2, y0 + 5, 1, 1);
      cctx.fillRect(x0 + 5, y0 + 5, 1, 1);

      // Pontos azuis nas quinas: com os das pecas vizinhas eles formam
      // os losangos que atravessam a faixa na referencia.
      cctx.fillStyle = flowerBlue;
      cctx.fillRect(x0, y0, 1, 1);
      cctx.fillRect(x0 + 7, y0, 1, 1);
      cctx.fillRect(x0, y0 + 7, 1, 1);
      cctx.fillRect(x0 + 7, y0 + 7, 1, 1);
    }

    // ---------- Rejunte ----------
    // Linha mais escura na cor e AFUNDADA na altura (o normal map tira
    // dela a sombrinha do sulco). Desenhado tambem em x = 0, que e a
    // emenda do wrap: com isso a fiada fecha sem costura quando a
    // textura repete ao longo da parede.
    const groutColor = "rgba(150, 128, 96, 0.85)";
    const groutHeight = "rgb(78, 78, 78)";
    const groutRough = "rgb(224, 224, 224)"; // rejunte e poroso, nao brilha
    for (let col = 0; col <= KITCHEN_TILE_COLS; col++) {
      const x = Math.min(size - 1, col * tile);
      cctx.fillStyle = groutColor;
      cctx.fillRect(x, borderTop, 1, size - borderTop);
      hctx.fillStyle = groutHeight;
      hctx.fillRect(x, borderTop, 1, size - borderTop);
      rctx.fillStyle = groutRough;
      rctx.fillRect(x, borderTop, 1, size - borderTop);
    }
    for (let row = 0; row <= KITCHEN_WAINSCOT_ROWS + KITCHEN_BORDER_ROWS; row++) {
      const y = Math.min(size - 1, borderTop + row * tile);
      cctx.fillStyle = groutColor;
      cctx.fillRect(0, y, size, 1);
      hctx.fillStyle = groutHeight;
      hctx.fillRect(0, y, size, 1);
      rctx.fillStyle = groutRough;
      rctx.fillRect(0, y, size, 1);
    }

    // Sombra logo abaixo da fiada decorativa: e o que a faz "sair" da
    // parede em vez de parecer um adesivo colado.
    hctx.fillStyle = "rgb(64, 64, 64)";
    hctx.fillRect(0, wainscotTop, size, 1);

    // Encardido subindo do chao (o azulejo de baixo e o que mais toma
    // agua e pano). wrapY: false pelo mesmo motivo das manchas da cal.
    for (let i = 0; i < 5; i++) {
      paintBlotch(
        cctx,
        null,
        size,
        Math.random() * size,
        size - Math.random() * 12,
        5 + Math.random() * 9,
        {
          points: 8,
          jitter: 0.45,
          blurPx: 2,
          colorRGB: [116, 96, 68],
          colorAlpha: 0.08 + Math.random() * 0.08,
          wrapY: false,
        }
      );
    }

    // Ruido fino final (grao do esmalte e da cal), mesma tecnica do
    // resto do arquivo.
    const colorData = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 9;
      colorData.data[i] += n;
      colorData.data[i + 1] += n * 0.95;
      colorData.data[i + 2] += n * 0.85;
    }
    cctx.putImageData(colorData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
      roughnessMap: toThreeTexture(roughCanvas, repeatX, repeatY),
    };
  }

  // -----------------------------------------------------------------
  // PAREDE DO CORREDOR: reboco caqui em cima + trilho de madeira +
  // LAMBRI VERDE pintado + rodape de madeira
  // -----------------------------------------------------------------
  // Receita NOVA, feita a partir da referencia enviada pelo jogador, e
  // usada SO pelo CORREDOR (ver wallTex/endWallTex em
  // materials/material-library.js). Substitui createOldPlasterWallTexture,
  // que era o reboco liso e cinzento de antes - a funcao continua no
  // arquivo e exportada, mas nenhuma parede aponta mais para ela.
  //
  // NENHUM outro comodo muda: MEU QUARTO, QUARTO 01, QUARTO 02 e
  // BANHEIRO seguem com o lambri claro (createPsxWallPanelTexture), a
  // COZINHA com o azulejo (createKitchenTileWallTexture) e a fachada com
  // o reboco mofado (createExteriorPlasterWallTexture). Nenhum arquivo de
  // imagem novo: como toda textura deste arquivo, o padrao e redesenhado
  // do zero em canvas, baixa resolucao e NearestFilter - inspirado na
  // imagem, nunca um decalque dela.
  //
  // ---------- O que foi lido da referencia ----------
  // As cores saem medidas da propria imagem, faixa por faixa:
  //   - reboco de cima: caqui/oliva desbotado, media (143,130,94), com
  //     manchas amplas, remendos descascados, fissuras finas e uns
  //     riscos diagonais de arraste;
  //   - trilho: moldura de madeira escura, um perfil de 6 degraus de
  //     tom (labio claro em cima (90,70,38), sulco quase preto
  //     (33,26,12) no meio, sombra (31,24,12) embaixo);
  //   - lambri: verde-oliva (77,87,50) de tinta a oleo, riscado de
  //     escorridos verticais mais escuros e mais claros (a variacao de
  //     coluna da referencia vai de 74 a 100 no canal verde) e com uns
  //     poucos escorridos claros, quase bege, pingando de baixo do
  //     trilho;
  //   - rodape: outro perfil de madeira escura, ainda mais baixo de
  //     tom, com uma junta quase preta (25,19,10) perto do chao.
  //
  // ---------- Como o desenho vira metro na parede ----------
  // Mesma regra das outras paredes do jogo: o canvas e QUADRADO e cobre
  // o PE-DIREITO inteiro numa passada (repeatY = 1 - obrigatorio aqui,
  // ver abaixo), logo o lado do canvas equivale a CorridorConfig.height
  // (4.2 m). As fronteiras estao guardadas como FRACAO da altura, e nao
  // em pixels, para o desenho continuar correto se a resolucao mudar:
  //
  //   rodape ................. 0 a 0.22 m
  //   lambri verde ........... 0.22 a 1.34 m
  //   trilho de madeira ...... 1.34 a 1.50 m
  //   reboco ................. 1.50 a 4.20 m
  //
  // Essas alturas NAO sao as fracoes cruas da imagem: a referencia e um
  // recorte, e esticada nos 4.2 m do corredor ela poria o trilho em
  // 1.82 m (acima da linha dos olhos do jogador, que fica em 1.6 -
  // CorridorConfig.eyeHeight) e um rodape de 42 cm. Calibrar para
  // medidas de parede de verdade e o mesmo caminho que o azulejo da
  // cozinha ja seguiu, e mantem a PROPORCAO que a referencia realmente
  // mostra: o lambri ocupando o terco de baixo da parede (1.12 m de
  // verde aqui, contra os ~1.15 m que a imagem daria num pe-direito
  // normal).
  //
  // Resolucao 256, o dobro das outras paredes: aqui a composicao e
  // VERTICAL, e o trilho e o rodape tem perfil de 6 e 8 degraus de tom
  // cada um. Em 128 o trilho inteiro teria 5 pixels de altura e o perfil
  // sumiria. O reboco antigo era organico e nao precisava disso. Continua
  // gerada uma unica vez, no carregamento.
  //
  // ---------- Por que esta textura NAO repete na vertical ----------
  // Pelo mesmo motivo da fachada: o desenho tem topo e base. Com
  // repeatY = 2 apareceriam dois trilhos e dois rodapes empilhados no
  // meio da parede. Entao todo blotch/fissura daqui passa wrapY: false
  // (fecha so em X) e quem usa a textura passa repeatY = 1. Em X ela
  // fecha sem costura: as faixas atravessam o canvas inteiro e todo
  // escorrido e desenhado tambem em +-size.
  // -----------------------------------------------------------------
  const CORRIDOR_WALL_SIZE = 256;
  // Fracoes da altura da parede, medidas DO CHAO (v = 0 embaixo).
  const CORRIDOR_BASEBOARD_TOP = 0.22 / 4.2;
  const CORRIDOR_WAINSCOT_TOP = 1.34 / 4.2;
  const CORRIDOR_RAIL_TOP = 1.5 / 4.2;

  // Perfil do TRILHO: cada degrau com um peso (a espessura relativa
  // medida na referencia), a cor, a altura no mapa de relevo (>128 =
  // saliente, <128 = afundado) e a rugosidade (madeira envernizada
  // velha brilha um pouco mais que a cal, menos que a tinta a oleo).
  const CORRIDOR_RAIL_ROWS = [
    { w: 8, color: [90, 70, 38], height: 186, rough: 198 },
    { w: 10, color: [54, 43, 24], height: 168, rough: 206 },
    { w: 7, color: [46, 35, 19], height: 150, rough: 210 },
    { w: 4, color: [33, 26, 12], height: 96, rough: 224 },
    { w: 9, color: [70, 53, 30], height: 172, rough: 204 },
    { w: 6, color: [31, 24, 12], height: 64, rough: 228 },
  ];

  // Perfil do RODAPE, lido do mesmo jeito. A penultima faixa e a junta
  // quase preta que a referencia mostra rente ao chao.
  const CORRIDOR_BASEBOARD_ROWS = [
    { w: 11, color: [78, 59, 34], height: 176, rough: 200 },
    { w: 15, color: [56, 44, 26], height: 166, rough: 206 },
    { w: 13, color: [62, 47, 27], height: 162, rough: 204 },
    { w: 14, color: [43, 33, 21], height: 124, rough: 216 },
    { w: 15, color: [47, 36, 21], height: 158, rough: 210 },
    { w: 15, color: [60, 45, 25], height: 164, rough: 204 },
    { w: 9, color: [25, 19, 10], height: 70, rough: 230 },
    { w: 9, color: [51, 40, 29], height: 146, rough: 214 },
  ];

  // Pinta uma pilha de faixas horizontais (um perfil de madeira) dentro
  // de [y0, y1), distribuindo os degraus pelos pesos da tabela. Serve o
  // trilho e o rodape, que sao o mesmo tipo de desenho, e mantem o
  // perfil correto qualquer que seja a espessura em pixels que sobrar
  // para a faixa.
  function paintWoodProfile(cctx, hctx, rctx, size, y0, y1, rows) {
    let total = 0;
    for (let i = 0; i < rows.length; i++) {
      total += rows[i].w;
    }
    const span = y1 - y0;
    let acc = 0;
    for (let i = 0; i < rows.length; i++) {
      const top = y0 + Math.round((span * acc) / total);
      acc += rows[i].w;
      const bottom = y0 + Math.round((span * acc) / total);
      if (bottom <= top) {
        continue;
      }
      const c = rows[i].color;
      cctx.fillStyle = "rgb(" + c[0] + ", " + c[1] + ", " + c[2] + ")";
      cctx.fillRect(0, top, size, bottom - top);
      const h = rows[i].height;
      hctx.fillStyle = "rgb(" + h + ", " + h + ", " + h + ")";
      hctx.fillRect(0, top, size, bottom - top);
      const r = rows[i].rough;
      rctx.fillStyle = "rgb(" + r + ", " + r + ", " + r + ")";
      rctx.fillRect(0, top, size, bottom - top);
    }
  }

  // Veio da madeira do trilho/rodape: riscos curtos e HORIZONTAIS (no
  // sentido da peca), claros e escuros, dentro de [y0, y1). E o que
  // impede as faixas de lerem como listras chapadas de cor.
  function paintWoodGrain(cctx, size, y0, y1, count) {
    for (let i = 0; i < count; i++) {
      const y = y0 + Math.floor(Math.random() * Math.max(1, y1 - y0));
      const x = Math.random() * size;
      const len = 4 + Math.random() * 26;
      const dark = Math.random() < 0.62;
      cctx.fillStyle = dark
        ? "rgba(16, 10, 4, " + (0.14 + Math.random() * 0.2) + ")"
        : "rgba(126, 100, 66, " + (0.1 + Math.random() * 0.16) + ")";
      // Wrap so em X, na mao (as duas copias mantem o risco inteiro
      // quando ele nasce em cima da borda do canvas).
      cctx.fillRect(x, y, len, 1);
      cctx.fillRect(x - size, y, len, 1);
    }
  }

  function createCorridorWainscotWallTexture(repeatX, repeatY) {
    const size = CORRIDOR_WALL_SIZE;
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const roughCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");
    const rctx = roughCanvas.getContext("2d");

    // Fronteiras em pixels do canvas (y cresce para BAIXO e v = 0 fica
    // embaixo, entao o chao e o FIM do canvas).
    const railTopY = Math.round(size * (1 - CORRIDOR_RAIL_TOP));
    const railBottomY = Math.round(size * (1 - CORRIDOR_WAINSCOT_TOP));
    const baseboardTopY = Math.round(size * (1 - CORRIDOR_BASEBOARD_TOP));

    // ---------- 1. O REBOCO DE CIMA ----------
    // Caqui/oliva desbotado da referencia, um tico mais claro que a
    // media medida nela (143,130,94): o corredor e iluminado por uma
    // luminaria fraca, e a cor da textura ainda vai ser multiplicada
    // por essa luz. Pintado no canvas INTEIRO - o lambri, o trilho e o
    // rodape entram por cima depois, e e isso que deixa qualquer mancha
    // ou fissura escorrer para baixo sem precisar de recorte.
    cctx.fillStyle = "rgb(150, 138, 101)";
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);
    // Cal velha: fosca. 242/255 = 0.95, a mesma rugosidade que a parede
    // do corredor sempre teve no material (ver material-library.js).
    rctx.fillStyle = "rgb(242, 242, 242)";
    rctx.fillRect(0, 0, size, size);

    // Variacao ampla e suave de tom (manchas de METROS): e o que impede
    // o reboco de ler como cor chapada quando a textura repete 5 vezes
    // ao longo dos 22 metros do corredor.
    for (let i = 0; i < 5; i++) {
      const lighter = Math.random() < 0.5;
      const r = size * (0.22 + Math.random() * 0.2);
      paintBlotch(cctx, hctx, size, Math.random() * size, Math.random() * railTopY, r, {
        points: 11,
        jitter: 0.3,
        blurPx: r * 0.55,
        colorRGB: lighter ? [176, 166, 134] : [124, 113, 82],
        colorAlpha: 0.22,
        heightValue: lighter ? 126 : 132,
        heightAlpha: 0.3,
        wrapY: false,
      });
    }

    // MOSQUEADO de escala media, a camada que mais aproxima do reboco da
    // referencia: ela nao e uma cor chapada com manchas grandes, e um
    // marmoreado de dezenas de manchas de 8 cm a 40 cm, umas mais
    // escuras e outras mais claras, todas de opacidade baixa e se
    // sobrepondo. Sem esta camada o caqui fica limpo demais - foi o que a
    // primeira versao desta textura errou.
    for (let i = 0; i < 40; i++) {
      const dark = Math.random() < 0.6;
      const r = 5 + Math.random() * 21;
      paintBlotch(cctx, hctx, size, Math.random() * size, Math.random() * railTopY, r, {
        points: 9,
        jitter: 0.5,
        blurPx: r * 0.45,
        colorRGB: dark ? [110, 100, 72] : [182, 173, 142],
        colorAlpha: 0.09 + Math.random() * 0.12,
        heightValue: dark ? 130 : 126,
        heightAlpha: 0.2,
        wrapY: false,
      });
    }

    // Borroes ALONGADOS: as manchas da referencia nao sao redondas, tem
    // direcao - parede esfregada com pano, infiltracao escorrendo,
    // desempenadeira passada de lado. Mesmo makeElongatedBlobPoints do
    // vidro martelado, aqui com angulo sorteado (o vidro usa um angulo
    // fixo, porque ali o padrao e regular).
    for (let i = 0; i < 16; i++) {
      const dark = Math.random() < 0.55;
      const pts = makeElongatedBlobPoints(
        14 + Math.random() * 26,
        3 + Math.random() * 6,
        (Math.random() - 0.5) * 2.4,
        9,
        0.45
      );
      const cx = Math.random() * size;
      const cy = Math.random() * railTopY;
      const c = dark ? [104, 94, 68] : [186, 178, 148];
      const a = 0.08 + Math.random() * 0.1;
      fillWrappedPolygon(
        cctx, size, cx, cy, pts, 3,
        "rgba(" + c[0] + ", " + c[1] + ", " + c[2] + ", " + a + ")",
        false
      );
      const hv = dark ? 131 : 125;
      fillWrappedPolygon(
        hctx, size, cx, cy, pts, 3,
        "rgba(" + hv + ", " + hv + ", " + hv + ", 0.18)",
        false
      );
    }

    // Remendos descascados: uma camada mais clara a mostra, com rebordo
    // levemente saliente. So TRES, pequenos (raio de 6 a 14 px = 10 a 23
    // cm) e discretos de proposito: remendos grandes e claros viram
    // bolhas que denunciam a repeticao do ladrilho a cada 4.2 metros de
    // corredor - e o remendo nao e um traco forte da referencia, o
    // mosqueado e.
    for (let i = 0; i < 3; i++) {
      paintBlotch(
        cctx,
        hctx,
        size,
        Math.random() * size,
        Math.random() * railTopY,
        6 + Math.random() * 8,
        {
          points: 9,
          jitter: 0.55,
          blurPx: 1.6,
          colorRGB: [192, 184, 154],
          colorAlpha: 0.24,
          heightValue: 148,
          heightAlpha: 0.45,
          wrapY: false,
        }
      );
    }

    // Riscos diagonais de arraste (o detalhe mais visivel do reboco da
    // referencia depois das manchas: marcas claras e escuras cruzando a
    // parede, de movel arrastado e de desempenadeira). Bem fracos - de
    // perto quase nao aparecem, mas e o que da textura ao caqui.
    for (let i = 0; i < 16; i++) {
      const len = 26 + Math.random() * 62;
      const angle = (Math.random() < 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.5);
      const pts = [
        [0, 0],
        [Math.cos(angle) * len * 0.5, Math.sin(angle) * len * 0.5],
        [Math.cos(angle) * len, Math.sin(angle) * len],
      ];
      strokeWrappedPath(
        cctx,
        size,
        Math.random() * size,
        Math.random() * railTopY,
        pts,
        Math.random() < 0.55
          ? "rgba(112, 101, 72, " + (0.1 + Math.random() * 0.12) + ")"
          : "rgba(180, 171, 140, " + (0.08 + Math.random() * 0.1) + ")",
        0.6 + Math.random(),
        false
      );
    }

    // Fissuras finas, quase todas descendo, so na metade de cima (a
    // que sobra visivel): comprimento de 24 a 70 px = 40 cm a 1.15 m.
    for (let i = 0; i < 7; i++) {
      paintCrack(
        cctx,
        hctx,
        size,
        Math.random() * size,
        Math.random() * railTopY * 0.7,
        24 + Math.random() * 46,
        Math.PI / 2 + (Math.random() - 0.5) * 1.6,
        {
          colorStyle: "rgba(96, 86, 62, 0.5)",
          lineWidth: 0.6,
          heightStyle: "rgba(104, 104, 104, 0.55)",
          heightLineWidth: 0.8,
          wrapY: false,
        }
      );
    }

    // Encardido na junta com o TETO: a faixa que ninguem nunca limpa.
    const ceilingGrime = cctx.createLinearGradient(0, 0, 0, size * 0.09);
    ceilingGrime.addColorStop(0, "rgba(84, 76, 54, 0.42)");
    ceilingGrime.addColorStop(1, "rgba(84, 76, 54, 0)");
    cctx.fillStyle = ceilingGrime;
    cctx.fillRect(0, 0, size, size * 0.09);

    // Sujeira acumulada logo ACIMA do trilho (a quina onde a poeira
    // assenta, igual a que a parede da cozinha tem acima da faixa).
    const railGrime = cctx.createLinearGradient(0, railTopY - 14, 0, railTopY);
    railGrime.addColorStop(0, "rgba(96, 86, 60, 0)");
    railGrime.addColorStop(1, "rgba(96, 86, 60, 0.3)");
    cctx.fillStyle = railGrime;
    cctx.fillRect(0, railTopY - 14, size, 14);

    // ---------- 2. O LAMBRI VERDE ----------
    // Verde-oliva de tinta a oleo. Diferente da cal de cima, ele e
    // semi-brilhante (rugosidade menor no roughnessMap) e levemente
    // saliente: e uma pintura mais grossa, aplicada por cima do reboco.
    const wainscotHeightPx = baseboardTopY - railBottomY;
    cctx.fillStyle = "rgb(77, 87, 50)";
    cctx.fillRect(0, railBottomY, size, wainscotHeightPx);
    hctx.fillStyle = "rgb(136, 136, 136)";
    hctx.fillRect(0, railBottomY, size, wainscotHeightPx);
    rctx.fillStyle = "rgb(190, 190, 190)";
    rctx.fillRect(0, railBottomY, size, wainscotHeightPx);

    // Escorridos verticais, em duas frequencias: faixas largas e
    // suaves (a variacao de coluna da referencia, que vai de 74 a 100
    // no canal verde) e riscos estreitos e nitidos por cima. Todos
    // atravessam o lambri de ponta a ponta - e uma parede lavada com
    // pano molhado por decadas, a agua sempre desce. Wrap so em X.
    function wainscotStreak(x, w, style) {
      cctx.fillStyle = style;
      cctx.fillRect(x, railBottomY, w, wainscotHeightPx);
      cctx.fillRect(x - size, railBottomY, w, wainscotHeightPx);
      cctx.fillRect(x + size, railBottomY, w, wainscotHeightPx);
    }
    for (let i = 0; i < 20; i++) {
      const dark = Math.random() < 0.55;
      wainscotStreak(
        Math.random() * size,
        5 + Math.random() * 22,
        dark
          ? "rgba(52, 60, 32, " + (0.07 + Math.random() * 0.13) + ")"
          : "rgba(108, 120, 74, " + (0.06 + Math.random() * 0.12) + ")"
      );
    }
    for (let i = 0; i < 46; i++) {
      const dark = Math.random() < 0.6;
      wainscotStreak(
        Math.floor(Math.random() * size),
        1 + Math.floor(Math.random() * 3),
        dark
          ? "rgba(44, 52, 26, " + (0.1 + Math.random() * 0.16) + ")"
          : "rgba(122, 134, 84, " + (0.08 + Math.random() * 0.14) + ")"
      );
    }

    // E escorridos PARCIAIS, que nascem no trilho e morrem no meio do
    // lambri em vez de atravessar de ponta a ponta: sem eles as faixas
    // completas acima leem como um pente regular, e na referencia a agua
    // desce ate onde da e para.
    for (let i = 0; i < 12; i++) {
      const dark = Math.random() < 0.7;
      const x = Math.floor(Math.random() * size);
      const w = 2 + Math.floor(Math.random() * 9);
      const h = Math.round(wainscotHeightPx * (0.35 + Math.random() * 0.55));
      cctx.fillStyle = dark
        ? "rgba(40, 48, 24, " + (0.1 + Math.random() * 0.14) + ")"
        : "rgba(126, 138, 88, " + (0.1 + Math.random() * 0.14) + ")";
      cctx.fillRect(x, railBottomY, w, h);
      cctx.fillRect(x - size, railBottomY, w, h);
      cctx.fillRect(x + size, railBottomY, w, h);
    }

    // Os escorridos CLAROS pingando de baixo do trilho - o detalhe mais
    // caracteristico do lambri da referencia (na imagem sao dois, quase
    // bege, ~110,105,62). Curtos, finos, com degrade que morre no fim.
    for (let i = 0; i < 4; i++) {
      const x = Math.random() * size;
      const w = 1 + Math.random() * 2.5;
      const len = 10 + Math.random() * 34;
      const drip = cctx.createLinearGradient(0, railBottomY, 0, railBottomY + len);
      drip.addColorStop(0, "rgba(126, 118, 74, 0.7)");
      drip.addColorStop(0.45, "rgba(118, 112, 70, 0.4)");
      drip.addColorStop(1, "rgba(110, 105, 62, 0)");
      cctx.fillStyle = drip;
      cctx.fillRect(x, railBottomY, w, len);
      cctx.fillRect(x - size, railBottomY, w, len);
      cctx.fillRect(x + size, railBottomY, w, len);
    }

    // Sombra do trilho caindo no lambri: e o que faz a moldura sair da
    // parede em vez de parecer um adesivo colado (mesmo truque da faixa
    // decorativa da cozinha).
    const railShadow = cctx.createLinearGradient(0, railBottomY, 0, railBottomY + 5);
    railShadow.addColorStop(0, "rgba(16, 20, 10, 0.4)");
    railShadow.addColorStop(1, "rgba(16, 20, 10, 0)");
    cctx.fillStyle = railShadow;
    cctx.fillRect(0, railBottomY, size, 5);

    // Rente ao rodape a tinta esta mais gasta e clara (pano, vassoura,
    // pe de movel), igual na referencia - onde o verde abre de (77,87,50)
    // para (82,94,54) nos ultimos centimetros.
    const wainscotWear = cctx.createLinearGradient(0, baseboardTopY - 16, 0, baseboardTopY);
    wainscotWear.addColorStop(0, "rgba(104, 118, 72, 0)");
    wainscotWear.addColorStop(1, "rgba(104, 118, 72, 0.22)");
    cctx.fillStyle = wainscotWear;
    cctx.fillRect(0, baseboardTopY - 16, size, 16);

    // Falhas da pintura: pontinhos onde a tinta descascou e aparece o
    // reboco claro por baixo. Poucos e miudos, senao viram doenca.
    for (let i = 0; i < 22; i++) {
      const x = Math.floor(Math.random() * size);
      const y = railBottomY + Math.floor(Math.random() * wainscotHeightPx);
      const w = 1 + Math.floor(Math.random() * 2);
      cctx.fillStyle = "rgba(158, 150, 116, " + (0.18 + Math.random() * 0.3) + ")";
      cctx.fillRect(x, y, w, 1 + Math.floor(Math.random() * 2));
    }

    // ---------- 3. O TRILHO DE MADEIRA ----------
    paintWoodProfile(cctx, hctx, rctx, size, railTopY, railBottomY, CORRIDOR_RAIL_ROWS);
    paintWoodGrain(cctx, size, railTopY, railBottomY, 40);

    // ---------- 4. O RODAPE ----------
    paintWoodProfile(
      cctx,
      hctx,
      rctx,
      size,
      baseboardTopY,
      size,
      CORRIDOR_BASEBOARD_ROWS
    );
    paintWoodGrain(cctx, size, baseboardTopY, size, 46);

    // O rodape tambem e mais grosso que a parede: sombra na quina de
    // cima dele, no mapa de ALTURA (o normal map tira dai o degrau).
    hctx.fillStyle = "rgb(72, 72, 72)";
    hctx.fillRect(0, baseboardTopY - 1, size, 1);

    // Poeira e encardido subindo do chao no rodape.
    for (let i = 0; i < 8; i++) {
      paintBlotch(cctx, null, size, Math.random() * size, size - Math.random() * 8, 4 + Math.random() * 9, {
        points: 8,
        jitter: 0.45,
        blurPx: 2,
        colorRGB: [92, 78, 56],
        colorAlpha: 0.1 + Math.random() * 0.1,
        wrapY: false,
      });
    }

    // ---------- 5. Ruido fino final ----------
    // Grao da cal, da tinta e da madeira, a mesma tecnica do resto do
    // arquivo - nos dois canvases, e depois de tudo, para as quatro
    // faixas ganharem grao junto.
    const colorData = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 9;
      colorData.data[i] += n;
      colorData.data[i + 1] += n * 0.95;
      colorData.data[i + 2] += n * 0.8;
    }
    cctx.putImageData(colorData, 0, 0);

    const heightData = hctx.getImageData(0, 0, size, size);
    for (let i = 0; i < heightData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 6;
      heightData.data[i] += n;
      heightData.data[i + 1] += n;
      heightData.data[i + 2] += n;
    }
    hctx.putImageData(heightData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
      roughnessMap: toThreeTexture(roughCanvas, repeatX, repeatY),
    };
  }

  // -----------------------------------------------------------------
  // TAPETE LISTRADO DA COZINHA (ver createStripedRug em
  // models/carpet-factory.js), feito a partir da segunda imagem de
  // referencia: listras no sentido do COMPRIMENTO - borda verde-oliva,
  // vermelho, campo bege, um friso mostarda e uma faixa central
  // azul-acinzentada, espelhado nas duas metades - com franja nas duas
  // pontas curtas.
  //
  // O desenho e 1D de proposito: a listra so muda ao longo da LARGURA
  // (o V da textura) e e constante ao longo do comprimento. Isso da
  // duas coisas de graca:
  //  - a textura pode repetir ao longo do comprimento sem NENHUMA
  //    costura visivel (o que varia em X e so ruido, que nao tem
  //    continuidade para quebrar);
  //  - com repeatX = comprimento / largura o texel fica QUADRADO, ou
  //    seja: a listra nao estica, qualquer que seja o tamanho do tapete
  //    (ver kitchenRug em materials/material-library.js).
  // -----------------------------------------------------------------
  const STRIPED_RUG_ROWS = 64;

  // Cor de cada uma das 64 linhas do tapete, da borda ao centro e
  // espelhada de volta. Existe separada porque a FRANJA usa exatamente
  // as mesmas cores: cada fio sai da listra que o gerou, como num
  // tapete de verdade.
  function stripedRugRowColors() {
    const half = STRIPED_RUG_ROWS / 2;
    const bands = [
      { to: 4, color: [76, 82, 48] }, // verde-oliva da borda
      { to: 9, color: [164, 70, 60] }, // vermelho
      { to: 20, color: [198, 186, 152] }, // campo bege
      { to: 21, color: [189, 138, 44] }, // friso mostarda
      { to: 30, color: [198, 186, 152] }, // campo bege
      { to: half, color: [76, 87, 99] }, // faixa central azul-acinzentada
    ];
    const rows = [];
    for (let i = 0; i < half; i++) {
      let color = bands[bands.length - 1].color;
      for (let b = 0; b < bands.length; b++) {
        if (i < bands[b].to) {
          color = bands[b].color;
          break;
        }
      }
      rows.push(color);
    }
    const full = rows.slice();
    for (let i = half - 1; i >= 0; i--) {
      full.push(rows[i]);
    }
    return full;
  }

  function createStripedRugTexture(repeatX, repeatY) {
    const size = STRIPED_RUG_ROWS;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");
    const rows = stripedRugRowColors();

    for (let y = 0; y < size; y++) {
      const c = rows[y];
      // Trama: cada fio da urdidura sai um tico mais claro ou mais
      // escuro que o vizinho. E o que impede a listra de virar uma
      // barra de cor chapada.
      const weft = (y % 2 === 0 ? 4 : -4) + (Math.random() - 0.5) * 6;
      ctx.fillStyle =
        "rgb(" +
        Math.max(0, Math.min(255, Math.round(c[0] + weft))) +
        ", " +
        Math.max(0, Math.min(255, Math.round(c[1] + weft))) +
        ", " +
        Math.max(0, Math.min(255, Math.round(c[2] + weft * 0.9))) +
        ")";
      ctx.fillRect(0, y, size, 1);
    }

    // Desgaste: fibra puida e poeira entranhada, do mesmo jeito do
    // tapete do corredor (ver createCarpetTexture). Pontos isolados
    // nunca criam costura no wrap.
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const dark = Math.random() < 0.62;
      const a = dark ? 0.07 + Math.random() * 0.16 : 0.05 + Math.random() * 0.11;
      ctx.fillStyle = dark
        ? "rgba(38, 30, 20, " + a + ")"
        : "rgba(214, 202, 172, " + a + ")";
      ctx.fillRect(x, y, 1, 1);
    }

    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 11;
      imgData.data[i] += n;
      imgData.data[i + 1] += n * 0.9;
      imgData.data[i + 2] += n * 0.8;
    }
    ctx.putImageData(imgData, 0, 0);

    return toThreeTexture(canvas, repeatX, repeatY);
  }

  // Franja das duas pontas curtas do tapete listrado. Canvas deitado
  // (16 x 64): o U corre no COMPRIMENTO do fio e o V atravessa a
  // largura do tapete, entao cada linha do canvas e um fio e a cor dele
  // sai da MESMA tabela de listras do tapete (ver stripedRugRowColors).
  // Fio de comprimento sorteado + recorte por alphaTest = ponta
  // irregular, fio a fio, sem uma unica face a mais de geometria.
  function createStripedRugFringeTexture(repeatX, repeatY) {
    const w = 16;
    const h = STRIPED_RUG_ROWS;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    const rows = stripedRugRowColors();

    // Fios de 2 px com 1 px de folga entre eles.
    for (let y = 0; y < h; y += 3) {
      const c = rows[Math.min(rows.length - 1, y)];
      const shade = Math.floor((Math.random() - 0.5) * 18);
      const length = Math.round(w * (0.6 + Math.random() * 0.4));
      ctx.fillStyle =
        "rgb(" +
        Math.max(0, Math.min(255, c[0] + shade)) +
        ", " +
        Math.max(0, Math.min(255, c[1] + shade)) +
        ", " +
        Math.max(0, Math.min(255, c[2] + shade)) +
        ")";
      ctx.fillRect(0, y, length, 2);
    }

    return toThreeTexture(canvas, repeatX, repeatY);
  }

  // -----------------------------------------------------------------
  // PAREDE DO BANHEIRO: azulejo florido do chao ate 1.84 m + pintura
  // bege em cima
  // -----------------------------------------------------------------
  // Receita NOVA, feita a partir da imagem de referencia enviada pelo
  // jogador, e usada SO pelo BANHEIRO (ver bathroomWallLong/Short em
  // materials/material-library.js e a tabela WALL_STYLES em
  // scenes/side-room-scene.js). NENHUM outro comodo muda um pixel: o
  // CORREDOR segue com o lambri verde, a COZINHA com o azulejo bege
  // florido dela (createKitchenTileWallTexture), MEU QUARTO, QUARTO 01 e
  // QUARTO 02 com o lambri claro e a fachada com o reboco mofado.
  //
  // Nenhum arquivo de imagem novo entrou: como toda textura deste
  // arquivo, o padrao e redesenhado do zero em canvas, baixa resolucao e
  // NearestFilter - inspirado na imagem, nunca um decalque dela (foi o
  // pedido: "nao precisa usar exatamente a mesma textura de parede que
  // enviei... voce pode apenas criar algo que seja muito fiel").
  //
  // ---------- O que foi lido da referencia ----------
  //   - dois tercos DE BAIXO: azulejo quadrado quase branco
  //     (media (226,223,214)), rejunte cinza claro e, no centro de CADA
  //     peca, um motivo miudo de florzinha salmao com duas folhinhas
  //     verdes embaixo (na cozinha o motivo aparece so numa fiada
  //     decorativa; aqui ele repete em todas, e essa e a diferenca que
  //     salta aos olhos entre as duas paredes);
  //   - terco DE CIMA: pintura bege/areia gasta (media (178,168,138)),
  //     com manchas amplas e escorridos, sem relevo;
  //   - entre as duas: um friso claro e saliente, o acabamento de
  //     arremate do azulejo.
  //
  // ---------- Como o desenho vira metro na parede ----------
  // Mesma regra do azulejo da cozinha: o canvas e QUADRADO e cobre o
  // pe-direito (4.2 m) numa passada (repeatY = 1, obrigatorio - o
  // desenho tem topo e base), com 16 pecas por lado, ou seja azulejo de
  // 26,25 cm. As 7 fiadas de baixo dao 1.84 m de azulejo, que e altura de
  // meia-parede de banheiro de verdade (1.80 a 2.00) e fica acima da
  // linha do olho do jogador (1.6). Quem calcula o repeat em X e
  // materials/material-library.js, arredondando para um numero INTEIRO de
  // pecas para a fiada fechar na quina.
  //
  // Em X a textura fecha sem costura (o rejunte e desenhado tambem em
  // x = 0), entao ela pode repetir ao longo de qualquer parede - inclusive
  // das divisorias novas do comodo, que escalam o U da propria malha em
  // vez de pedir uma textura a mais (ver o bloco Divisorias internas em
  // scenes/side-room-scene.js).
  // -----------------------------------------------------------------
  const BATHROOM_TILE_COLS = 16; // ladrilhos por lado do canvas
  const BATHROOM_WAINSCOT_ROWS = 7; // fiadas de azulejo (7 x 0.2625 = 1.84 m)

  function createBathroomTileWallTexture(repeatX, repeatY) {
    const size = 128;
    const tile = size / BATHROOM_TILE_COLS; // 8 px por azulejo
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const roughCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");
    const rctx = roughCanvas.getContext("2d");

    // Fronteiras horizontais do desenho, em pixels do canvas.
    const wainscotTop = size - tile * BATHROOM_WAINSCOT_ROWS; // 72
    const capHeight = 3; // o friso de arremate do azulejo
    const capTop = wainscotTop - capHeight;

    // ---------- Pintura de cima ----------
    // Bege areia da referencia. Cal velha: fosca (branco no
    // roughnessMap) e sem relevo (altura neutra 128).
    cctx.fillStyle = "rgb(178, 168, 138)";
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);
    rctx.fillStyle = "rgb(255, 255, 255)";
    rctx.fillRect(0, 0, size, size);

    // Manchas da pintura gasta. wrapY: false de proposito (mesmo motivo
    // da cozinha e da fachada): esta textura NAO repete na vertical, e
    // uma mancha nascida no alto nao pode reaparecer dentro do azulejo -
    // o que escorrer para baixo do friso e coberto pelas fiadas, pintadas
    // depois.
    for (let i = 0; i < 10; i++) {
      const dark = Math.random() < 0.6;
      paintBlotch(
        cctx,
        null,
        size,
        Math.random() * size,
        Math.random() * capTop,
        6 + Math.random() * 17,
        {
          points: 9,
          jitter: 0.44,
          blurPx: 4,
          colorRGB: dark ? [138, 128, 100] : [206, 198, 172],
          colorAlpha: dark
            ? 0.09 + Math.random() * 0.1
            : 0.06 + Math.random() * 0.08,
          wrapY: false,
        }
      );
    }

    // Escorridos verticais finos, de umidade: banheiro velho tem disso
    // logo acima do azulejo. Desenhados tambem em +-size para fechar o
    // wrap em X.
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * size;
      const top = Math.random() * (capTop * 0.7);
      const len = 8 + Math.random() * (capTop - top);
      cctx.fillStyle = "rgba(132, 122, 94, " + (0.06 + Math.random() * 0.1) + ")";
      cctx.fillRect(x, top, 1, len);
      cctx.fillRect(x - size, top, 1, len);
    }

    // Sujeira acumulada rente ao friso (a linha que nunca e lavada).
    const grime = cctx.createLinearGradient(0, capTop - 8, 0, capTop);
    grime.addColorStop(0, "rgba(120, 110, 84, 0)");
    grime.addColorStop(1, "rgba(120, 110, 84, 0.24)");
    cctx.fillStyle = grime;
    cctx.fillRect(0, capTop - 8, size, 8);

    // ---------- Azulejo ----------
    // Quase branco, com cada peca num tom um tico diferente (azulejo
    // antigo nunca sai igual) e marquinhas de uso.
    const tileR = 226;
    const tileG = 223;
    const tileB = 214;
    hctx.fillStyle = "rgb(150, 150, 150)"; // ceramica saliente
    hctx.fillRect(0, wainscotTop, size, size - wainscotTop);
    rctx.fillStyle = "rgb(126, 126, 126)"; // esmalte: brilha mais que a cal
    rctx.fillRect(0, wainscotTop, size, size - wainscotTop);

    // Cores do motivo, medidas da referencia: florzinha salmao com miolo
    // mais claro e duas folhinhas verde-oliva embaixo.
    const petal = "rgb(206, 142, 118)";
    const petalDeep = "rgb(182, 116, 94)";
    const core = "rgb(228, 186, 162)";
    const leaf = "rgb(130, 146, 104)";

    for (let row = 0; row < BATHROOM_WAINSCOT_ROWS; row++) {
      for (let col = 0; col < BATHROOM_TILE_COLS; col++) {
        const x = col * tile;
        const y = wainscotTop + row * tile;
        const sign = Math.random() < 0.5 ? 1 : -1;
        const shade = 2 + Math.floor(Math.random() * 7); // 2-8
        cctx.fillStyle =
          "rgb(" +
          (tileR + sign * shade) +
          ", " +
          (tileG + sign * shade) +
          ", " +
          (tileB + sign * Math.round(shade * 0.9)) +
          ")";
        cctx.fillRect(x, y, tile, tile);

        // ---------- O motivo, pixel por pixel ----------
        // Em 8 px por peca o desenho e literalmente pixel a pixel: e
        // exatamente o tipo de arte que o PS1 fazia. Flor em cima
        // (3 linhas), duas folhinhas embaixo - a leitura da referencia.
        cctx.fillStyle = petal;
        cctx.fillRect(x + 3, y + 1, 2, 1);
        cctx.fillRect(x + 2, y + 2, 4, 1);
        cctx.fillRect(x + 3, y + 3, 2, 1);
        cctx.fillStyle = core;
        cctx.fillRect(x + 3, y + 2, 2, 1);
        cctx.fillStyle = petalDeep;
        cctx.fillRect(x + 2, y + 1, 1, 1);
        cctx.fillRect(x + 5, y + 1, 1, 1);
        cctx.fillStyle = leaf;
        cctx.fillRect(x + 2, y + 4, 1, 1);
        cctx.fillRect(x + 5, y + 4, 1, 1);
        cctx.fillRect(x + 3, y + 5, 2, 1);

        const marks = 1 + Math.floor(Math.random() * 2);
        for (let m = 0; m < marks; m++) {
          const a = 0.04 + Math.random() * 0.08;
          cctx.fillStyle = "rgba(126, 120, 104, " + a + ")";
          cctx.fillRect(
            x + 1 + Math.floor(Math.random() * (tile - 2)),
            y + 1 + Math.floor(Math.random() * (tile - 2)),
            1,
            1
          );
        }
      }
    }

    // ---------- Friso de arremate ----------
    // A peca de acabamento que fecha o azulejo em cima: mais clara que a
    // parede, saliente no relevo e mais esmaltada que a cal. E o que faz
    // a meia-parede "sair" do reboco em vez de parecer um adesivo colado.
    cctx.fillStyle = "rgb(214, 208, 190)";
    cctx.fillRect(0, capTop, size, capHeight);
    hctx.fillStyle = "rgb(178, 178, 178)";
    hctx.fillRect(0, capTop, size, capHeight);
    rctx.fillStyle = "rgb(120, 120, 120)";
    rctx.fillRect(0, capTop, size, capHeight);
    // Sombra fina por baixo do friso.
    hctx.fillStyle = "rgb(70, 70, 70)";
    hctx.fillRect(0, wainscotTop, size, 1);

    // ---------- Rejunte ----------
    // Linha mais escura na cor e AFUNDADA na altura (o normal map tira
    // dela a sombrinha do sulco). Desenhado tambem em x = 0, que e a
    // emenda do wrap: com isso a fiada fecha sem costura quando a textura
    // repete ao longo da parede.
    const groutColor = "rgba(168, 164, 152, 0.9)";
    const groutHeight = "rgb(80, 80, 80)";
    const groutRough = "rgb(226, 226, 226)"; // rejunte e poroso, nao brilha
    for (let col = 0; col <= BATHROOM_TILE_COLS; col++) {
      const x = Math.min(size - 1, col * tile);
      cctx.fillStyle = groutColor;
      cctx.fillRect(x, wainscotTop, 1, size - wainscotTop);
      hctx.fillStyle = groutHeight;
      hctx.fillRect(x, wainscotTop, 1, size - wainscotTop);
      rctx.fillStyle = groutRough;
      rctx.fillRect(x, wainscotTop, 1, size - wainscotTop);
    }
    for (let row = 0; row <= BATHROOM_WAINSCOT_ROWS; row++) {
      const y = Math.min(size - 1, wainscotTop + row * tile);
      cctx.fillStyle = groutColor;
      cctx.fillRect(0, y, size, 1);
      hctx.fillStyle = groutHeight;
      hctx.fillRect(0, y, size, 1);
      rctx.fillStyle = groutRough;
      rctx.fillRect(0, y, size, 1);
    }

    // Encardido subindo do chao (o azulejo de baixo e o que mais toma
    // agua e pano). wrapY: false pelo mesmo motivo das manchas da cal.
    for (let i = 0; i < 6; i++) {
      paintBlotch(
        cctx,
        null,
        size,
        Math.random() * size,
        size - Math.random() * 12,
        5 + Math.random() * 9,
        {
          points: 8,
          jitter: 0.45,
          blurPx: 2,
          colorRGB: [128, 120, 100],
          colorAlpha: 0.07 + Math.random() * 0.08,
          wrapY: false,
        }
      );
    }

    // Ruido fino final (grao do esmalte e da cal), mesma tecnica do resto
    // do arquivo.
    const colorData = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 9;
      colorData.data[i] += n;
      colorData.data[i + 1] += n * 0.95;
      colorData.data[i + 2] += n * 0.85;
    }
    cctx.putImageData(colorData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
      roughnessMap: toThreeTexture(roughCanvas, repeatX, repeatY),
    };
  }

  // -----------------------------------------------------------------
  // TAPETE DE BANHEIRO (ver createStripedRug em
  // models/carpet-factory.js, estilo "banho")
  // -----------------------------------------------------------------
  // Feito a partir da imagem de referencia enviada pelo jogador: um
  // tapete de banho escuro, cinza-arroxeado, sem listra e sem franja - a
  // graca dele esta no TECIDO, um felpudo manchado em blocos de 2 px que
  // e exatamente como o PS1 resolveria uma superficie assim.
  //
  // Blocos de 2 px, e nao pixel a pixel, de proposito: o tapete e visto
  // de cima e de perto, e ruido de 1 px nessa distancia vira chuvisco.
  // Com bloco de 2 a felpa le como felpa.
  //
  // O desenho nao tem topo, base nem lado: e ruido sem continuidade para
  // quebrar, entao a textura fecha sem costura em qualquer repeat e a
  // borda do tapete pode cair em qualquer lugar dela. Quem usa passa
  // repeatX = comprimento / largura para o texel sair QUADRADO (ver
  // bathMatTex em materials/material-library.js), do mesmo jeito que o
  // tapete listrado da cozinha.
  // -----------------------------------------------------------------
  function createBathMatTexture(repeatX, repeatY) {
    const size = 64;
    const block = 2;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext("2d");

    // Cinza-arroxeado escuro da referencia.
    const baseR = 74;
    const baseG = 68;
    const baseB = 84;
    ctx.fillStyle = "rgb(" + baseR + ", " + baseG + ", " + baseB + ")";
    ctx.fillRect(0, 0, size, size);

    // Felpa: cada bloco um tom, com uma parte deles puxando para o roxo e
    // outra para o cinza (e o que da o aspecto "mesclado" da imagem).
    for (let y = 0; y < size; y += block) {
      for (let x = 0; x < size; x += block) {
        const n = (Math.random() - 0.45) * 22;
        const violet = Math.random() < 0.4 ? 6 : 0;
        ctx.fillStyle =
          "rgb(" +
          Math.max(0, Math.min(255, Math.round(baseR + n))) +
          ", " +
          Math.max(0, Math.min(255, Math.round(baseG + n * 0.9))) +
          ", " +
          Math.max(0, Math.min(255, Math.round(baseB + n * 0.85 + violet))) +
          ")";
        ctx.fillRect(x, y, block, block);
      }
    }

    // Manchas largas de pelo amassado/desbotado, do tamanho da mao - a
    // referencia tem varias. Pontos isolados nunca criam costura no wrap.
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = block * (1 + Math.floor(Math.random() * 4));
      const h = block * (1 + Math.floor(Math.random() * 3));
      const light = Math.random() < 0.45;
      const a = light ? 0.05 + Math.random() * 0.09 : 0.06 + Math.random() * 0.12;
      ctx.fillStyle = light
        ? "rgba(146, 138, 158, " + a + ")"
        : "rgba(28, 24, 34, " + a + ")";
      ctx.fillRect(x, y, w, h);
    }

    // Ruido fino final, o grao do fio.
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 8;
      imgData.data[i] += n;
      imgData.data[i + 1] += n * 0.9;
      imgData.data[i + 2] += n;
    }
    ctx.putImageData(imgData, 0, 0);

    return toThreeTexture(canvas, repeatX, repeatY);
  }


  // -----------------------------------------------------------------
  // PISO DE CERAMICA DO BANHEIRO (ver bathroomFloor em
  // materials/material-library.js e a tabela FLOOR_STYLES em
  // scenes/side-room-scene.js)
  // -----------------------------------------------------------------
  // Feita a partir da imagem de textura de ceramica enviada pelo
  // jogador, e vale SO para o piso do BANHEIRO: o CORREDOR, o
  // MEU QUARTO, o QUARTO 01, o QUARTO 02 e a COZINHA seguem com a
  // madeira de sempre (createWoodTexture / materials.sideRoomFloor).
  //
  // ---------- O que foi MEDIDO na referencia ----------
  // A imagem e um mosaico de 6 x 6 pecas em 1254 px (209 px por peca,
  // com a linha de rejunte caindo em 0 e em 1254 - ela ja fecha sem
  // costura). Os numeros daqui saem todos de medicao, nao de olho:
  //
  //   - peca:    media rgb(110, 102, 95), um cinza-taupe morno;
  //   - rejunte: rgb(93, 86, 79) no miolo da linha, ou seja SO 15%
  //              mais escuro que a peca - a grade da referencia e
  //              discreta, nao um quadriculado preto;
  //   - largura do rejunte: ~12 px em 209, uns 6% da peca;
  //   - variacao ENTRE pecas: quase nada (as 36 pecas ficam dentro de
  //     2 pontos de luminancia) - e ceramica de fabrica, nao pedra;
  //   - grao DENTRO da peca: desvio padrao de ~9 por canal, e a maior
  //     parte dele NAO e chuvisco de 1 px: sao risquinhos e manchas
  //     curtas, em qualquer direcao, do tamanho de 1/5 da peca.
  //
  // ---------- Como isso virou textura PSX ----------
  // Canvas de 128 px com 8 pecas por lado, ou seja 16 px por peca -
  // contra os 8 px do azulejo de PAREDE deste mesmo comodo (ver
  // createBathroomTileWallTexture acima). O piso e visto de perto e de
  // cima; com 8 px o risquinho medido acima nao caberia. A proporcao da
  // referencia se mantem: rejunte de 1 px e 1/16 = 6.25% da peca,
  // contra os ~6% medidos.
  //
  // Tres camadas, na ordem em que o olho le a superficie:
  //   1. o tom de CADA peca, com a variacao minima medida acima;
  //   2. o grao em blocos de 2 px - a mesma escolha do tapete de banho
  //      (ver createBathMatTexture): em bloco de 1 px, a esta
  //      distancia, viraria chuvisco;
  //   3. os risquinhos curtos, 11 por peca, em direcao sorteada - e o
  //      que faz a peca ler como ceramica gasta em vez de ruido.
  // O ruido fino de 1 px entra so no fim, fraco, como grao de camera.
  //
  // ---------- Rejunte por ultimo, e em 8 linhas (nao 9) ----------
  // Ele e escrito DEPOIS do ruido - senao o grao comeria a linha - e o
  // laco vai de 0 a COLS - 1: cada peca e dona da propria linha de cima
  // e da esquerda. Assim o desenho fecha exatamente no wrap, sem a
  // linha DUPLA que apareceria se a coluna 127 e a coluna 0 fossem as
  // duas pintadas.
  //
  // Como todo revestimento do jogo, devolve os tres mapas: cor, normal
  // (a partir de um mapa de altura - rejunte AFUNDADO, peca saliente) e
  // rugosidade (a ceramica esmaltada brilha mais que o rejunte poroso).
  // -----------------------------------------------------------------
  const CERAMIC_FLOOR_COLS = 8; // pecas por lado do canvas (16 px cada)

  function createCeramicFloorTexture(repeatX, repeatY) {
    const size = 128;
    const tile = size / CERAMIC_FLOOR_COLS; // 16 px por peca
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const roughCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");
    const rctx = roughCanvas.getContext("2d");

    // Cor media da peca, medida na referencia.
    const baseR = 110;
    const baseG = 102;
    const baseB = 95;

    function clamp255(value) {
      return Math.max(0, Math.min(255, Math.round(value)));
    }

    // ---------- O tom de cada peca ----------
    const shades = [];
    for (let row = 0; row < CERAMIC_FLOOR_COLS; row++) {
      shades[row] = [];
      for (let col = 0; col < CERAMIC_FLOOR_COLS; col++) {
        shades[row][col] = (Math.random() - 0.5) * 5;
      }
    }

    // ---------- Grao da ceramica, em blocos de 2 px ----------
    for (let y = 0; y < size; y += 2) {
      for (let x = 0; x < size; x += 2) {
        const shade = shades[Math.floor(y / tile)][Math.floor(x / tile)];
        const n = (Math.random() - 0.5) * 17;
        cctx.fillStyle =
          "rgb(" +
          clamp255(baseR + shade + n) +
          ", " +
          clamp255(baseG + shade * 0.95 + n * 0.95) +
          ", " +
          clamp255(baseB + shade * 0.9 + n * 0.9) +
          ")";
        cctx.fillRect(x, y, 2, 2);
      }
    }

    // ---------- Risquinhos e manchas curtas de dentro da peca ----------
    // Andam pixel a pixel numa direcao sorteada (e nao `stroke`, que
    // sairia com antialias e borraria o pixel art) e nunca invadem a
    // peca vizinha nem a linha de rejunte.
    for (let row = 0; row < CERAMIC_FLOOR_COLS; row++) {
      for (let col = 0; col < CERAMIC_FLOOR_COLS; col++) {
        for (let m = 0; m < 11; m++) {
          const len = 3 + Math.floor(Math.random() * 5);
          const angle = Math.random() * Math.PI * 2;
          const dx = Math.cos(angle);
          const dy = Math.sin(angle);
          const x0 = col * tile + 1 + Math.random() * (tile - 2);
          const y0 = row * tile + 1 + Math.random() * (tile - 2);
          const dark = Math.random() < 0.55;
          const alpha = dark
            ? 0.16 + Math.random() * 0.2
            : 0.13 + Math.random() * 0.18;
          cctx.fillStyle = dark
            ? "rgba(84, 77, 70, " + alpha + ")"
            : "rgba(140, 132, 124, " + alpha + ")";
          for (let step = 0; step < len; step++) {
            const px = Math.floor(x0 + dx * step);
            const py = Math.floor(y0 + dy * step);
            if (
              px > col * tile &&
              px < (col + 1) * tile &&
              py > row * tile &&
              py < (row + 1) * tile
            ) {
              cctx.fillRect(px, py, 1, 1);
            }
          }
        }
      }
    }

    // ---------- Relevo e brilho ----------
    // Peca saliente e esmaltada; as duas linhas do rejunte (afundado e
    // fosco) entram no mesmo laco da cor, mais abaixo.
    hctx.fillStyle = "rgb(150, 150, 150)";
    hctx.fillRect(0, 0, size, size);
    rctx.fillStyle = "rgb(132, 132, 132)";
    rctx.fillRect(0, 0, size, size);

    // ---------- Ruido fino final (o grao de camera) ----------
    const colorData = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < colorData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 9;
      colorData.data[i] += n;
      colorData.data[i + 1] += n * 0.95;
      colorData.data[i + 2] += n * 0.9;
    }

    // ---------- Rejunte ----------
    // Escrito por ultimo, direto nos pixels, e ainda variando de tom de
    // um pixel para o outro: rejunte de verdade nao e cor chapada.
    function writeGrout(px, py) {
      const jitter = (Math.random() - 0.5) * 6;
      const idx = (py * size + px) * 4;
      colorData.data[idx] = clamp255(90 + jitter);
      colorData.data[idx + 1] = clamp255(83 + jitter * 0.95);
      colorData.data[idx + 2] = clamp255(76 + jitter * 0.9);
      colorData.data[idx + 3] = 255;
    }
    for (let k = 0; k < CERAMIC_FLOOR_COLS; k++) {
      const p = k * tile;
      for (let i = 0; i < size; i++) {
        writeGrout(i, p);
        writeGrout(p, i);
      }
      hctx.fillStyle = "rgb(80, 80, 80)";
      hctx.fillRect(0, p, size, 1);
      hctx.fillRect(p, 0, 1, size);
      rctx.fillStyle = "rgb(228, 228, 228)";
      rctx.fillRect(0, p, size, 1);
      rctx.fillRect(p, 0, 1, size);
    }
    cctx.putImageData(colorData, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
      roughnessMap: toThreeTexture(roughCanvas, repeatX, repeatY),
    };
  }
  // -----------------------------------------------------------------
  // REBOCO DA VARANDA (ver porchPlaster em materials/material-library.js
  // e models/porch-factory.js)
  // -----------------------------------------------------------------
  // A alvenaria da varanda - piso, muro, pingadeira e pilares - e a MESMA
  // parede da casa: mesmo tom base da fachada (#c4b89d, medido em
  // createExteriorPlasterWallTexture acima), mesmas manchas de chuva,
  // mesmas fissuras. A varanda tem de ler como parte da construcao, e nao
  // como um objeto encostado nela.
  //
  // ---------- Por que nao da para usar a textura da FACHADA ----------
  // A da fachada tem uma FAIXA DE MOFO no rodape e, por isso, o repeatY
  // dela e obrigatoriamente 1: ela nao fecha na vertical (ver o
  // comentario grande de la). A varanda precisa do contrario - o UV dela
  // e medido em METROS (TEX_SCALE em models/porch-factory.js, a mesma
  // ideia do telhado), justamente para o pixel do reboco ter o mesmo
  // tamanho no piso deitado, no muro de 88 cm e no pilar de 3 metros. Com
  // a textura da fachada apareceria uma faixa de mofo flutuando a cada
  // 2.2 metros de pilar.
  //
  // Entao esta e a mesma receita SEM a faixa e SEM os escorridos
  // ancorados no alto: so o que ladrilha nos dois sentidos. Tudo aqui e
  // pintado com os mesmos helpers do resto do arquivo (paintBlotch,
  // paintCrack), que ja desenham nas 9 posicoes da grade de wrap - por
  // isso nenhuma mancha e nenhuma fissura cria costura na emenda.
  //
  // Devolve os tres mapas de sempre: cor, normal (a partir do mapa de
  // altura) e rugosidade.
  function createPorchPlasterTexture(repeatX, repeatY) {
    const size = 128;
    const colorCanvas = makeCanvas(size);
    const heightCanvas = makeCanvas(size);
    const cctx = colorCanvas.getContext("2d");
    const hctx = heightCanvas.getContext("2d");

    cctx.fillStyle = "#c4b89d";
    cctx.fillRect(0, 0, size, size);
    hctx.fillStyle = "rgb(128, 128, 128)";
    hctx.fillRect(0, 0, size, size);

    // 1. Variacao ampla de tom (manchas de metros): sem ela, uma peca que
    // repete a mesma textura oito vezes le como cor chapada.
    for (let i = 0; i < 6; i++) {
      const lighter = Math.random() < 0.5;
      const r = size * (0.3 + Math.random() * 0.3);
      paintBlotch(cctx, hctx, size, Math.random() * size, Math.random() * size, r, {
        points: 12,
        jitter: 0.3,
        blurPx: r * 0.6,
        colorRGB: lighter ? [212, 203, 180] : [176, 164, 136],
        colorAlpha: 0.26,
        heightValue: lighter ? 124 : 132,
        heightAlpha: 0.32,
      });
    }

    // 2. Manchas pequenas de sujeira e limo, do tamanho da mao: a chuva
    // que bate no muro e volta do chao. Poucas e fracas - a varanda fica
    // protegida pela propria laje.
    for (let i = 0; i < 14; i++) {
      const r = 2 + Math.random() * 5;
      const mossy = Math.random() < 0.4;
      paintBlotch(cctx, hctx, size, Math.random() * size, Math.random() * size, r, {
        points: 10,
        jitter: 0.45,
        blurPx: 1.6,
        colorRGB: mossy ? [96, 98, 70] : [150, 139, 116],
        colorAlpha: 0.1 + Math.random() * 0.12,
        heightValue: 122,
        heightAlpha: 0.28,
      });
    }

    // 3. Fissuras: reboco velho de area externa sempre tem. Finas e
    // claras, no mesmo tom das da fachada.
    for (let i = 0; i < 5; i++) {
      paintCrack(
        cctx,
        hctx,
        size,
        Math.random() * size,
        Math.random() * size,
        10 + Math.random() * 22,
        Math.random() * Math.PI * 2,
        {
          colorStyle: "rgba(120, 110, 92, 0.5)",
          lineWidth: 0.5,
          heightStyle: "rgba(96, 96, 96, 0.6)",
          heightLineWidth: 0.7,
        }
      );
    }

    // 4. Grao do reboco, texel a texel: e ele que da a crocancia PSX de
    // perto, ja que o jogador pode encostar o rosto num pilar.
    const img = cctx.getImageData(0, 0, size, size);
    const hImg = hctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      img.data[i] += n;
      img.data[i + 1] += n * 0.95;
      img.data[i + 2] += n * 0.85;
      hImg.data[i] += n * 0.9;
      hImg.data[i + 1] += n * 0.9;
      hImg.data[i + 2] += n * 0.9;
    }
    cctx.putImageData(img, 0, 0);
    hctx.putImageData(hImg, 0, 0);

    return {
      map: toThreeTexture(colorCanvas, repeatX, repeatY),
      normalMap: heightCanvasToNormalTexture(heightCanvas, repeatX, repeatY),
      roughnessMap: heightCanvasToRoughnessTexture(
        heightCanvas,
        0.4,
        repeatX,
        repeatY
      ),
    };
  }

  // -----------------------------------------------------------------
  // TAPETE VERMELHO DE BOAS-VINDAS (ver welcomeMat em
  // materials/material-library.js e o item 6 de models/porch-factory.js)
  // -----------------------------------------------------------------
  // O tapete que fica em frente a porta ENTRADA & SAIDA, na varanda:
  // capacho de fibra vermelho, borda escura e a palavra BEM-VINDO no meio
  // - o unico texto do jogo escrito direto numa textura.
  //
  // ---------- Canvas 128x64, e nao 128x128 ----------
  // O tapete e 1.20 x 0.60 no mundo (2:1, ver MAT_W/MAT_D em
  // models/porch-factory.js). Num canvas quadrado esticado nessa
  // proporcao o texel sairia duas vezes mais largo que alto e a palavra
  // apareceria achatada. Com 128x64 - as duas, potencias de 2, entao o
  // RepeatWrapping continua valido tambem em WebGL 1 - o texel sai
  // QUADRADO no mundo (9.4 mm de lado) e o desenho aparece exatamente
  // como foi pintado. E o mesmo cuidado que os tapetes de dentro de casa
  // tomam passando a proporcao no repeat (ver kitchenRugTex em
  // materials/material-library.js), resolvido aqui na FORMA do canvas
  // porque este desenho NAO pode repetir: repetir duplicaria a palavra.
  //
  // ---------- Sobre a legibilidade ----------
  // O jogo renderiza a 320x180. De pe na varanda, BEM-VINDO ocupa uns 100
  // pixels de tela, ou seja umas 10 colunas por letra: le-se com algum
  // esforco, do mesmo jeito que se lia texto em textura no PS1. E o que
  // se quer - um letreiro nitido demais brigaria com o resto do jogo.
  function createWelcomeMatTexture() {
    const width = 128;
    const height = 64;
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Base: vermelho de capacho, escuro e sujo de terra - nao o vermelho
    // saturado de tapete novo (a casa esta abandonada).
    ctx.fillStyle = "#8c2b22";
    ctx.fillRect(0, 0, width, height);

    // Fibra de coco: blocos de 2 px, com o tom variando mais na
    // horizontal que na vertical - e o que da a leitura de fio trancado
    // em vez de ruido solto. Mesma escolha de bloco do tapete de banho
    // (ver createBathMatTexture): em 1 px viraria chuvisco.
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const n = (Math.random() - 0.45) * 30 + Math.sin(y * 1.7) * 5;
        ctx.fillStyle =
          "rgb(" +
          Math.max(0, Math.min(255, Math.round(140 + n))) +
          ", " +
          Math.max(0, Math.min(255, Math.round(43 + n * 0.5))) +
          ", " +
          Math.max(0, Math.min(255, Math.round(34 + n * 0.45))) +
          ")";
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Borda: uma faixa escura de 5 px e um filete claro por dentro dela,
    // como o acabamento costurado de um capacho de verdade.
    ctx.strokeStyle = "#4a130f";
    ctx.lineWidth = 5;
    ctx.strokeRect(2.5, 2.5, width - 5, height - 5);
    ctx.strokeStyle = "rgba(196, 150, 130, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(6.5, 6.5, width - 13, height - 13);

    // A palavra. O scale no X porque a fonte do navegador nao cabe em 128
    // px de largura num tamanho legivel: comprimir a palavra e o que um
    // letreiro de capacho faz mesmo. Sombra de 1 px embaixo para as
    // letras nao se perderem no vermelho.
    const text = "BEM-VINDO";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const measured = ctx.measureText(text).width || width;
    const fit = Math.min(1, (width - 26) / measured);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(fit, 1);
    ctx.fillStyle = "rgba(30, 12, 10, 0.85)";
    ctx.fillText(text, 0, 2);
    ctx.fillStyle = "#e0d3b8";
    ctx.fillText(text, 0, 0);
    ctx.restore();

    // Desgaste POR CIMA das letras: manchas de pe e poeira que comem
    // pedacos delas. Sem isto o letreiro fica novo demais para uma casa
    // abandonada.
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const w = 2 + Math.random() * 7;
      const h = 2 + Math.random() * 4;
      const dusty = Math.random() < 0.45;
      ctx.fillStyle = dusty
        ? "rgba(150, 132, 104, " + (0.06 + Math.random() * 0.14) + ")"
        : "rgba(52, 16, 12, " + (0.08 + Math.random() * 0.16) + ")";
      ctx.fillRect(x, y, w, h);
    }

    // Grao fino final, o mesmo acabamento dos outros tapetes.
    const img = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      img.data[i] += n;
      img.data[i + 1] += n * 0.9;
      img.data[i + 2] += n * 0.9;
    }
    ctx.putImageData(img, 0, 0);

    // repeat 1x1: o desenho aparece UMA vez na face de cima do tapete
    // (ver o item 6 de models/porch-factory.js - o UV da face de uma
    // BoxGeometry vai de 0 a 1).
    return toThreeTexture(canvas, 1, 1);
  }

  return {
    createWoodTexture: createWoodTexture,
    createGrassTexture: createGrassTexture,
    createDirtPathTexture: createDirtPathTexture,
    createOldPlasterWallTexture: createOldPlasterWallTexture,
    createCurtainTexture: createCurtainTexture,
    createFrostedGlassTexture: createFrostedGlassTexture,
    createRainStreakTexture: createRainStreakTexture,
    createAgedWoodTexture: createAgedWoodTexture,
    createDeskDrawerFrontTexture: createDeskDrawerFrontTexture,
    createCarpetTexture: createCarpetTexture,
    createCarpetFringeTexture: createCarpetFringeTexture,
    createDoorPanelTexture: createDoorPanelTexture,
    createDoorFrameWoodTexture: createDoorFrameWoodTexture,
    createAgedCeramicTexture: createAgedCeramicTexture,
    createAgedPlasticTexture: createAgedPlasticTexture,
    createAgedBakeliteTexture: createAgedBakeliteTexture,
    createPsxWallPanelTexture: createPsxWallPanelTexture,
    createExteriorPlasterWallTexture: createExteriorPlasterWallTexture,
    createRoofShingleTexture: createRoofShingleTexture,
    createKitchenTileWallTexture: createKitchenTileWallTexture,
    createBathroomTileWallTexture: createBathroomTileWallTexture,
    createCorridorWainscotWallTexture: createCorridorWainscotWallTexture,
    createStripedRugTexture: createStripedRugTexture,
    createStripedRugFringeTexture: createStripedRugFringeTexture,
    createBathMatTexture: createBathMatTexture,
    createCeramicFloorTexture: createCeramicFloorTexture,
    createPorchPlasterTexture: createPorchPlasterTexture,
    createWelcomeMatTexture: createWelcomeMatTexture,
  };
})();
