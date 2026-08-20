/**
 * models/window-factory.js
 * -------------------------------------------------
 * Janela em estilo PSX/PS1: moldura de madeira + varão +
 * cortina com argolas (100% procedural, sem .glb, mesma
 * receita "canvas 2D + wobble/dither via onBeforeCompile"
 * já usada por outras peças do jogo — ver applyPSXShader,
 * cópia local da mesma função de models/book-factory.js).
 *
 * Baseado no modelo de referência "PSXWindow" enviado pelo
 * jogador (moldura + varão + cortina de duas folhas com
 * pregas em leque). Portado aqui para o mesmo sistema de
 * scripts clássicos (THREE global, sem import/ES module)
 * já usado pelo resto do jogo, em vez do import map do
 * pacote original.
 *
 * VIDRO: o vão da moldura é preenchido com o vidro transparente
 * de models/window-glass-factory.js (baseado no modelo de
 * referência "PSX Window Glass" enviado pelo jogador — ver
 * comentário no topo daquele arquivo). Só a parte do vidro
 * desse pacote é usada; a moldura continua sendo só esta
 * aqui (madeira + friso), sem duplicação. Vista externa: um
 * chão de grama (models/exterior-factory.js) já existe do
 * lado de fora do vidro das três janelas, mas essa peça (a
 * janela em si) não sabe nada sobre isso — quem recorta o vão
 * na parede e posiciona a grama é sempre a cena
 * (scenes/corridor-scene.js / scenes/room-scene.js). Chuva,
 * relâmpago e o resto do lado de fora JÁ EXISTEM: a chuva em
 * models/rain-factory.js e o CLARÃO dos relâmpagos em
 * effects/lightning-storm.js. Este arquivo entra no clarão de duas
 * formas, as duas montadas em `createWindow`: (1) o âncora de onde a
 * luz do relâmpago nasce, alguns centímetros para DENTRO do cómodo, e
 * (2) o quad aditivo que faz o próprio VIDRO brilhar no pisco (atrás
 * da cortina, de propósito: cortina fechada tapa o brilho sozinha, por
 * profundidade). `stopStorm` continua existindo para as duas cenas
 * seguirem funcionando, mas agora desliga a tempestade DE VERDADE —
 * quem liga e desliga nos dois sentidos é `setDaytime`.
 *
 * Mesma convenção do resto do jogo (ver DoorFactory): a
 * janela "olha" para +Z no espaço local (lado de dentro do
 * corredor/quarto — cortina e varão ficam desse lado). A
 * origem do grupo devolvido continua sendo o CENTRO
 * vertical da janela (mesmo ponto que a versão anterior já
 * usava), mesmo o modelo de referência tendo sido desenhado
 * com a origem no peitoril (base) — ver o sub-grupo
 * `visuals`, deslocado para baixo em -WINDOW_HEIGHT/2, logo
 * no início de `createWindow`. Isso evita ter que mexer em
 * scenes/corridor-scene.js / scenes/room-scene.js: os dois
 * continuam fazendo `group.position.set(x, WINDOW_CENTER_Y,
 * z)` exatamente como antes e a janela aparece no mesmo
 * lugar de sempre.
 *
 * Tamanho: a moldura de referência enviada usa 1.9 x 2.2
 * (bem maior que a janela antiga). Para a nova janela
 * ocupar o mesmo vão de parede das três janelas atuais (sem
 * esbarrar em portas/móveis vizinhos — ver corridor-config.js
 * e room-config.js), as dimensões e os detalhes (moldura,
 * varão, argolas) foram reduzidos proporcionalmente (ver
 * SCALE abaixo) até o vão interno (a abertura visível, sem
 * contar a moldura) ficar bem próximo do tamanho da janela
 * anterior (que era 1.0 x 1.4).
 *
 * `createWindow` devolve `{ group, outline, toggleCurtain,
 * isOpen, update, stopStorm }` — exatamente a mesma
 * interface de antes, para o resto do jogo (InteractionSystem,
 * scripts/main.js, scenes/*.js) continuar funcionando sem
 * nenhuma mudança.
 * -------------------------------------------------
 */

window.WindowFactory = (function () {
  // ---------- Dimensões externas da moldura ----------
  // Ajustadas para o vão interno ficar perto do tamanho da
  // janela anterior (abertura de 1.0 x 1.4) — ver comentário
  // acima.
  const WINDOW_WIDTH = 1.2;
  const WINDOW_HEIGHT = 1.6;

  // Escala aplicada aos detalhes da moldura/varão/argolas em
  // relação ao modelo de referência (desenhado para uma
  // moldura de 1.9 de largura) — mantém as proporções do
  // modelo original numa janela menor.
  const REFERENCE_WIDTH = 1.9;
  const SCALE = WINDOW_WIDTH / REFERENCE_WIDTH;

  const FRAME_DEPTH = 0.1;
  const BEAM_WIDTH = 0.09;
  const SILL_HEIGHT = 0.12;
  const TRIM_THICK = 0.03;
  const TRIM_DEPTH = 0.032;

  const PLEATS = 7;
  const SEGMENTS_PER_PLEAT = 3;
  const FOLD_DEPTH = 0.045 * SCALE;
  const RING_FRACS = [0.14, 0.4, 0.66, 0.9];

  const ROD_RADIUS = 0.017 * SCALE;
  const FINIAL_RADIUS = 0.032 * SCALE;
  const RING_RADIUS = 0.03 * SCALE;
  const RING_TUBE = 0.006 * SCALE;
  const BRACKET_RADIUS = 0.015 * SCALE;
  const RING_GAP_TO_ROD = 0.05 * SCALE;
  const ROD_Y_GAP = 0.045 * SCALE; // do topo do vão até o varão
  const ROD_Z_GAP = 0.05 * SCALE; // da frente do friso até o varão
  const ROD_HALF_LEN_EXTRA = 0.07 * SCALE; // quanto o varão passa de cada lado do vão
  const BRACKET_INSET = 0.16 * SCALE;
  const PANEL_OVERLAP_EXTRA = 0.02 * SCALE; // quanto a cortina se esconde atrás do friso
  const PANEL_BOTTOM_GAP = 0.015 * SCALE;

  // Fração do vão central que fica sobreposta pelas duas
  // folhas quando a cortina está em repouso/fechada (negativa
  // = sobreposição, não uma folga) — ver comentário detalhado
  // em `buildPanel` mais abaixo: é essa sobreposição que
  // corrige o problema de a cortina nunca fechar de vez.
  const CURTAIN_OVERLAP_FRAC = -0.05;

  // Fração da largura de cada folha que ela percorre ao abrir
  // (além da posição de repouso), suficiente para ficar
  // encostada/além da moldura, fora do vão.
  const OPEN_TRAVEL_FRAC = 0.85;

  const CURTAIN_ANIM_DURATION = 0.8; // segundos para abrir/fechar por completo

  // Contador só para dar um id único a cada janela criada, usado como
  // "voz" do som da cortina (ver toggleCurtain mais abaixo e
  // audio/curtain-audio.js). Não influencia geometria, animação nem
  // interação: é apenas um rótulo de áudio.
  let curtainVoiceCounter = 0;

  /* ======================================================
   *  utilidades de textura procedural (canvas 2D)
   * =================================================== */

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp255(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
  }

  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  // Mesmo tratamento de textura usado em todo o resto do jogo
  // (NearestFilter, sem mipmap, sem sRGB — ver comentários em
  // models/floor-plant-factory.js e outras factories: "não usa
  // sRGBEncoding em nenhuma outra textura").
  function finishTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.encoding = THREE.LinearEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  function createWoodTexture() {
    const size = 64;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const rand = mulberry32(7);
    const base = "#4a3320";
    const dark = "#241608";
    const light = "#6b4a26";

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // veios verticais da madeira
    for (let x = 0; x < size; x++) {
      if (rand() > 0.5) continue;
      ctx.fillStyle = rand() > 0.6 ? light : dark;
      ctx.globalAlpha = 0.1 + rand() * 0.22;
      const w = 1 + Math.floor(rand() * 2);
      ctx.fillRect(x, 0, w, size);
    }
    ctx.globalAlpha = 1;

    // "juntas" horizontais de tábuas
    for (let y = 6; y < size; y += 10) {
      ctx.fillStyle = dark;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(0, y, size, 1);
    }
    ctx.globalAlpha = 1;

    // ruído/manchas
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rand() - 0.5) * 26;
      img.data[i] = clamp255(img.data[i] + n);
      img.data[i + 1] = clamp255(img.data[i + 1] + n * 0.85);
      img.data[i + 2] = clamp255(img.data[i + 2] + n * 0.6);
    }
    ctx.putImageData(img, 0, 0);

    return finishTexture(canvas);
  }

  function createFabricTexture() {
    const size = 32;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const rand = mulberry32(42);
    const base = "#5b3a1a";
    const dark = "#3a230e";
    const light = "#7a5326";

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // textura de tecido (tramas curtas)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x += 2) {
        if (rand() > 0.55) continue;
        ctx.fillStyle = rand() > 0.5 ? light : dark;
        ctx.globalAlpha = 0.08 + rand() * 0.14;
        ctx.fillRect(x, y, 2, 1);
      }
    }
    ctx.globalAlpha = 1;

    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rand() - 0.5) * 16;
      img.data[i] = clamp255(img.data[i] + n);
      img.data[i + 1] = clamp255(img.data[i + 1] + n * 0.9);
      img.data[i + 2] = clamp255(img.data[i + 2] + n * 0.75);
    }
    ctx.putImageData(img, 0, 0);

    return finishTexture(canvas);
  }

  /* ======================================================
   *  material PSX (wobble de vértice + dithering ordenado)
   *  — mesma técnica/implementação de models/book-factory.js
   *  (applyPSXShader), reaproveitada aqui para a janela ficar
   *  visualmente consistente com o resto do jogo.
   * =================================================== */

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
          "gl_Position.xyz *= gl_Position.w;",
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
          "gl_FragColor.rgb = floor(gl_FragColor.rgb * " + levels + " + psxDither + 0.5) / " + levels + ";",
        ].join("\n")
      );
    };
    material.needsUpdate = true;
    return material;
  }

  function makePSXWoodMaterial() {
    const tex = createWoodTexture();
    const mat = new THREE.MeshLambertMaterial({ map: tex, fog: true });
    return applyPSXShader(mat);
  }

  function makePSXFabricMaterial() {
    const tex = createFabricTexture();
    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      vertexColors: true,
      side: THREE.DoubleSide,
      fog: true,
    });
    return applyPSXShader(mat);
  }

  /* ======================================================
   *  geometria da cortina (pregas em "leque", baixo poligonagem)
   * =================================================== */

  function buildCurtainGeometry(width, height, color) {
    const cols = PLEATS * SEGMENTS_PER_PLEAT + 1;
    const rows = 10;
    const positions = [];
    const colors = [];
    const uvs = [];
    const baseColor = new THREE.Color(color);
    const tmpColor = new THREE.Color();

    for (let r = 0; r < rows; r++) {
      const ty = r / (rows - 1);
      const y = ty * height;
      // cortina levemente mais "franzida" (estreita) perto do varão
      const widthScale = THREE.MathUtils.lerp(1.06, 0.9, ty);

      for (let c = 0; c < cols; c++) {
        const tx = c / (cols - 1);
        const angle = tx * PLEATS * Math.PI * 2;
        const foldT = Math.sin(angle); // -1 (vinco) .. 1 (crista)
        const zLocal = foldT * FOLD_DEPTH;
        const x = (tx - 0.5) * width * widthScale;

        positions.push(x, y, zLocal);

        const shade = 0.6 + 0.4 * ((foldT + 1) / 2); // vincos mais escuros, cristas mais claras
        tmpColor.copy(baseColor).multiplyScalar(shade);
        colors.push(tmpColor.r, tmpColor.g, tmpColor.b);

        uvs.push(tx * PLEATS, ty * (height / 0.4));
      }
    }

    const indices = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c;
        const b = a + 1;
        const cIdx = a + cols;
        const d = cIdx + 1;
        indices.push(a, cIdx, b, b, cIdx, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /* ======================================================
   *  montagem principal
   * =================================================== */

  function createWindow(materials) {
    const group = new THREE.Group();

    // Sub-grupo deslocado para baixo em -H/2: o modelo de
    // referência foi desenhado com a origem no peitoril (base
    // da moldura), mas o resto do jogo (corridor-scene.js,
    // room-scene.js) posiciona a janela pelo CENTRO vertical
    // dela (mesma convenção da janela anterior) — ver
    // comentário no topo do arquivo.
    const visuals = new THREE.Group();
    visuals.position.y = -WINDOW_HEIGHT / 2;
    group.add(visuals);

    const woodMat = makePSXWoodMaterial();
    const fabricMat = makePSXFabricMaterial();
    const fabricColor = "#5b3a1a";

    const W = WINDOW_WIDTH;
    const H = WINDOW_HEIGHT;
    const D = FRAME_DEPTH;
    const BW = BEAM_WIDTH;
    const SH = SILL_HEIGHT;
    const TT = TRIM_THICK;
    const TD = TRIM_DEPTH;

    // ---------- Moldura ----------
    const frame = new THREE.Group();

    function addBox(parent, w, h, d, x, y, z, mat) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(w, 0.001), Math.max(h, 0.001), Math.max(d, 0.001)),
        mat
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    // vigas principais (topo, peitoril, laterais)
    addBox(frame, W, BW, D, 0, H - BW / 2, 0, woodMat);
    addBox(frame, W, SH, D, 0, SH / 2, 0, woodMat);
    const sideH = H - BW - SH;
    addBox(frame, BW, sideH, D, -W / 2 + BW / 2, SH + sideH / 2, 0, woodMat);
    addBox(frame, BW, sideH, D, W / 2 - BW / 2, SH + sideH / 2, 0, woodMat);

    // friso interno decorativo, levemente saliente na face frontal
    const openingW = W - BW * 2;
    const openingH = H - BW - SH;
    const trimZ = D / 2 + TD / 2 - 0.005;
    addBox(frame, openingW, TT, TD, 0, H - BW - TT / 2, trimZ, woodMat);
    addBox(frame, openingW, TT, TD, 0, SH + TT / 2, trimZ, woodMat);
    addBox(frame, TT, openingH - TT * 2, TD, -openingW / 2 + TT / 2, SH + openingH / 2, trimZ, woodMat);
    addBox(frame, TT, openingH - TT * 2, TD, openingW / 2 - TT / 2, SH + openingH / 2, trimZ, woodMat);

    visuals.add(frame);

    // vão visível (depois do friso) — usado para posicionar varão,
    // cortinas e também o vidro (ver bloco logo abaixo).
    const visW = openingW - TT * 2;
    const visTopY = H - BW - TT;
    const visBottomY = SH + TT;
    const trimFrontZ = trimZ + TD / 2;

    // ---------- Vidro ----------
    // Encaixado dentro do vão calculado acima (ver
    // models/window-glass-factory.js): largura/altura = tamanho do vão
    // visível, centralizado em x=0 (o vão é sempre simétrico) e no
    // meio vertical entre visBottomY e visTopY.
    //
    // Profundidade (glassZ): um valor positivo modesto, dentro do
    // intervalo da moldura principal (que vai de -D/2 a +D/2) e bem
    // atrás da face frontal do friso (trimFrontZ) e da cortina (que
    // fica sempre nesse mesmo plano, trimFrontZ — ver `panelBaseZ`
    // mais abaixo) — pro vidro ficar visualmente recuado/encaixado
    // "atrás" do friso, como numa janela de verdade, mas ainda dentro
    // da margem de segurança em relação à parede: `group.position`
    // (ver corridor-scene.js/room-scene.js) já é puxado alguns cm pra
    // dentro do corredor/quarto especificamente pra qualquer coisa em
    // z >= 0 aqui vencer o teste de profundidade contra a parede (o
    // mesmo ajuste já documentado lá, originalmente causado pelo vidro
    // de uma versão anterior desta janela) — um z negativo arriscaria
    // o vidro "perder" pra parede de novo e não aparecer (voltaria o
    // bug antigo: textura da parede visível dentro do vão).
    const glassZ = D * 0.3;
    const glassGroup = window.WindowGlassFactory.createGlass(visW, visTopY - visBottomY);
    glassGroup.position.set(0, (visTopY + visBottomY) / 2, glassZ);
    visuals.add(glassGroup);

    // ---------- O CLARÃO do relâmpago ----------
    // O sorteio da tempestade e a LUZ moram em effects/lightning-storm.js
    // (uma luz só para a casa inteira, por custo). O que nasce aqui, por
    // janela, é barato e não é luz:
    //  - `flashPane`: quad ADITIVO no vão do vidro, que acende no pisco.
    //    Fica 4 mm na frente do vidro e bem ATRÁS do plano da cortina
    //    (trimFrontZ) — é isso que faz a cortina fechada tapar o brilho
    //    sem nenhum teste, só por profundidade. Invisível fora do pisco.
    //  - `flashAnchor`: de onde a luz nasce quando ESTA janela é a
    //    escolhida. FLASH_INSET metros para dentro do cómodo (o +Z local
    //    é sempre o lado de dentro): assim materials/light-zones.js
    //    prende o clarão na zona deste cómodo, igual à luminária, e ele
    //    não vaza para o vizinho.
    const FLASH_INSET = 0.4;
    const FLASH_MAX_OPACITY = 0.85;
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xdce8ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    applyPSXShader(flashMat, undefined, 512);
    const flashPane = new THREE.Mesh(
      new THREE.PlaneGeometry(visW, visTopY - visBottomY),
      flashMat
    );
    flashPane.name = "clarao-vidro";
    flashPane.renderOrder = 3;
    flashPane.position.set(0, (visTopY + visBottomY) / 2, glassZ + 0.004);
    flashPane.visible = false;
    flashPane.userData.excludeFromOutline = true;
    visuals.add(flashPane);

    const flashAnchor = new THREE.Object3D();
    flashAnchor.name = "clarao-ancora";
    flashAnchor.position.set(0, 0, FLASH_INSET);
    group.add(flashAnchor);

    // ---------- Varão + suportes ----------
    // Reaproveita materials.lampMetal (já usado por outras peças
    // metálicas do jogo, ex.: luminária, maçanetas) em vez de criar
    // um material novo — mesmo princípio do "varão" da janela
    // anterior.
    const rod = new THREE.Group();
    const rodY = visTopY - ROD_Y_GAP;
    const rodZ = trimFrontZ + ROD_Z_GAP;
    const rodHalfLen = W / 2 + ROD_HALF_LEN_EXTRA;

    const rodMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(ROD_RADIUS, ROD_RADIUS, rodHalfLen * 2, 6, 1),
      materials.lampMetal
    );
    rodMesh.rotation.z = Math.PI / 2;
    rodMesh.position.set(0, rodY, rodZ);
    rodMesh.castShadow = true;
    rod.add(rodMesh);

    const finialGeo = new THREE.SphereGeometry(FINIAL_RADIUS, 8, 6);
    [-1, 1].forEach(function (s) {
      const f = new THREE.Mesh(finialGeo, materials.lampMetal);
      f.position.set(s * rodHalfLen, rodY, rodZ);
      f.castShadow = true;
      rod.add(f);
    });

    const bracketLen = Math.max(rodZ - trimFrontZ, 0.01);
    const bracketGeo = new THREE.CylinderGeometry(BRACKET_RADIUS, BRACKET_RADIUS, bracketLen, 6);
    [-1, 1].forEach(function (s) {
      const br = new THREE.Mesh(bracketGeo, materials.lampMetal);
      br.rotation.x = Math.PI / 2;
      br.position.set(s * (rodHalfLen - BRACKET_INSET), rodY, trimFrontZ + bracketLen / 2);
      br.castShadow = true;
      rod.add(br);
    });

    visuals.add(rod);

    // ---------- Cortinas ----------
    // Cada folha é construída já LARGA o bastante para as duas se
    // sobreporem um pouco no meio (CURTAIN_OVERLAP_FRAC é negativo)
    // quando em repouso — é essa sobreposição que garante a janela
    // fechar de vez (ver comentário grande logo abaixo, dentro de
    // `buildPanel`).
    const ringGeo = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 6, 10);
    // O tecido agora sobe até visTopY (o mesmo limite superior do vão/vidro,
    // logo abaixo do friso) em vez de parar em rodY - RING_GAP_TO_ROD: antes
    // sobrava uma faixa de vidro visível entre o topo do vão e o início da
    // cortina, acima do varão (o "buraco" reportado pelo jogador). O trecho
    // extra do tecido fica escondido atrás do friso/varão — puramente
    // visual, não muda hitbox/outline (`excludeFromOutline` continua true)
    // nem a animação de abrir/fechar.
    const panelTopY = visTopY;
    const panelBottomY = visBottomY + PANEL_BOTTOM_GAP;
    const panelHeight = panelTopY - panelBottomY;
    const panelBaseZ = trimFrontZ;
    // Y das argolas continua fixo na altura do varão (rodY), independente da
    // altura maior do tecido acima — sem isso, esticar o pano pra cima
    // também empurraria as argolas pra cima do varão de verdade.
    const ringY = rodY - panelBottomY;
    const overlap = TT + PANEL_OVERLAP_EXTRA;
    const gapW = visW * CURTAIN_OVERLAP_FRAC;

    function buildPanel(mirror) {
      // outerX: borda de fora da folha, escondida atrás do friso.
      // innerX: borda de dentro — com CURTAIN_OVERLAP_FRAC negativo,
      // isso fica um pouco ALÉM do centro do vão (não simétrico em
      // torno de 0 só até a metade), então as duas folhas se
      // sobrepõem no meio em vez de deixar um vão permanente ali.
      //
      // PROBLEMA QUE ISSO CORRIGE: no modelo de referência, a opção
      // `curtainGap` (fração do vão que fica aberta entre as folhas)
      // é usada como uma folga PERMANENTE já embutida na largura de
      // cada folha — não algo que a animação de abrir/fechar consiga
      // fechar depois, já que só a posição (x) de cada folha é
      // animada, não a largura dela. Com uma folga positiva (padrão
      // do modelo original, 0.34 = 34% do vão), a cortina nunca
      // conseguia se tocar no meio, não importa quanto a animação
      // avançasse — por isso ela "parava na metade do caminho" ao
      // fechar. Usando uma sobreposição (valor negativo) em vez de
      // uma folga, a largura de cada folha já nasce grande o
      // suficiente para as duas se encontrarem (e se sobrepor um
      // pouco) quando a animação chega em 100% fechada.
      const outerX = mirror < 0 ? -visW / 2 - overlap : visW / 2 + overlap;
      const innerX = mirror < 0 ? -gapW / 2 : gapW / 2;
      const panelWidth = Math.abs(innerX - outerX);
      const centerX = (outerX + innerX) / 2;

      const geo = buildCurtainGeometry(panelWidth, panelHeight, fabricColor);
      const mesh = new THREE.Mesh(geo, fabricMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const panelGroup = new THREE.Group();
      panelGroup.position.set(centerX, panelBottomY, panelBaseZ);
      panelGroup.add(mesh);

      RING_FRACS.forEach(function (f) {
        const ring = new THREE.Mesh(ringGeo, materials.lampMetal);
        ring.rotation.y = Math.PI / 2;
        ring.position.set((f - 0.5) * panelWidth, ringY, rodZ - panelBaseZ);
        ring.castShadow = true;
        panelGroup.add(ring);
      });

      // A cortina tem volume de verdade agora (pregas em relevo, não
      // um plano chapado como na janela anterior), então
      // OutlineFactory.build(...) mais abaixo passaria a incluir a
      // cortina na casca de contorno/mira do InteractionSystem por
      // padrão — só que essa casca é "assada" uma única vez na
      // construção, sem acompanhar a cortina abrindo/fechando depois.
      // `excludeFromOutline` mantém o comportamento de sempre: só a
      // moldura de madeira e o varão (as partes que não se movem)
      // entram na casca/mira — exatamente como na janela anterior,
      // que já ignorava a cortina nesse cálculo (lá, por ser um
      // plano chapado).
      panelGroup.userData.excludeFromOutline = true;

      const travel = panelWidth * OPEN_TRAVEL_FRAC;
      const openX = mirror < 0 ? centerX - travel : centerX + travel;

      return { panelGroup: panelGroup, closedX: centerX, openX: openX };
    }

    const leftPanel = buildPanel(-1);
    const rightPanel = buildPanel(1);
    const curtains = new THREE.Group();
    curtains.add(leftPanel.panelGroup, rightPanel.panelGroup);
    visuals.add(curtains);

    // ---------- Casca de destaque / mira do InteractionSystem ----------
    const outline = window.OutlineFactory.build(group, materials.outline);
    group.add(outline);

    // ---------- Estado / animação ----------
    let curtainOpen = false;
    let curtainProgress = 0; // 0 = fechada, 1 = aberta

    // Identificador desta janela para o som da cortina (ver
    // CurtainAudio logo abaixo): serve só para o módulo de áudio
    // saber que dois toques seguidos vieram da MESMA janela e não
    // empilhar dois sons um por cima do outro; janelas diferentes
    // continuam podendo soar ao mesmo tempo.
    curtainVoiceCounter += 1;
    const curtainVoiceId = "janela-" + curtainVoiceCounter;
    const curtainWorldPos = new THREE.Vector3();

    function toggleCurtain() {
      curtainOpen = !curtainOpen;

      // Som da cortina (ver audio/curtain-audio.js): disparado aqui,
      // no MESMO instante em que o estado alvo muda — e esse alvo
      // novo já começa a ser aplicado pelo `update(delta)` logo
      // abaixo no quadro seguinte, então o tecido se move junto com
      // o som, sem nenhum atraso programado no meio. O mesmo efeito
      // serve para abrir e para fechar (é o mesmo tecido correndo no
      // varão nos dois sentidos).
      //
      // Como TODAS as janelas com cortina do jogo (as duas do
      // corredor e a do quarto) saem desta mesma função, este único
      // ponto já cobre as três — nada muda em scenes/corridor-scene.js,
      // scenes/room-scene.js nem no switch de interação de
      // scripts/main.js.
      //
      // Chamada defensiva (typeof): se o módulo de áudio não estiver
      // carregado por algum motivo, a cortina continua abrindo e
      // fechando exatamente como antes, só que muda.
      if (window.CurtainAudio && typeof window.CurtainAudio.play === "function") {
        group.getWorldPosition(curtainWorldPos);
        window.CurtainAudio.play({
          position: curtainWorldPos,
          voiceId: curtainVoiceId,
        });
      }
    }

    // Mesmo princípio de `isLampOn` em models/lamp-factory.js: consulta
    // simples do estado atual, sem alterar nada. Usada por
    // scripts/main.js para saber se a janela do QUARTO já foi aberta
    // pelo menos uma vez.
    function isOpen() {
      return curtainOpen;
    }

    // Não faz mais nada (a chuva/relâmpago do lado de fora ainda não
    // existem nesta versão da janela — ver comentário no topo do
    // arquivo) — mantida só para scenes/corridor-scene.js e
    // scenes/room-scene.js (`setMorning()`) continuarem funcionando
    // sem precisar de nenhuma mudança lá.
    // Quanto a cortina está aberta (0 fechada, 1 aberta). A tempestade
    // usa isto para a luz entrar mais forte com a cortina aberta (ver
    // CLOSED_FACTOR em effects/lightning-storm.js).
    function getOpenness() {
      return curtainProgress;
    }

    // Esta janela participa da tempestade? De dia, não.
    let stormOn = true;

    // Liga/desliga o clarão DESTA janela, nos dois sentidos. Quem chama
    // é o `setDaytime` das cenas (corredor, quarto e cómodos laterais).
    function setDaytime(daytime) {
      stormOn = daytime === false;
      if (!stormOn) {
        flashMat.opacity = 0;
        flashPane.visible = false;
      }
    }

    // Mesmo nome de sempre, para as cenas que já chamavam — mas agora
    // ela realmente para o clarão desta janela em vez de não fazer nada.
    function stopStorm() {
      setDaytime(true);
    }

    // O brilho do vidro no pisco: um valor por quadro, o MESMO para
    // todas as janelas do jogo (relâmpago é evento do céu), então as
    // duas janelas do corredor piscam juntas, como tem de ser.
    function updateFlash() {
      const storm = window.LightningStorm;
      const level = stormOn && storm ? storm.intensity() : 0;
      if (level <= 0) {
        if (flashPane.visible) {
          flashPane.visible = false;
          flashMat.opacity = 0;
        }
        return;
      }
      flashPane.visible = true;
      flashMat.opacity = level * FLASH_MAX_OPACITY;
    }

    // Inscrição na tempestade: daqui para frente esta janela é candidata
    // a receber a luz do próximo relâmpago (a mais próxima do jogador
    // ganha). Chamada defensiva: sem o módulo carregado, a janela
    // continua funcionando como antes, só sem clarão.
    if (window.LightningStorm && window.LightningStorm.registerWindow) {
      window.LightningStorm.registerWindow({
        anchor: flashAnchor,
        getOpenness: getOpenness,
      });
    }

    function update(delta) {
      // Anima suavemente até o estado alvo, sempre chegando exatamente
      // aos dois extremos (0 ou 1) — nunca fica preso a meio caminho,
      // mesmo em quedas de quadro (delta grande): `Math.min`/`Math.max`
      // "grudam" o progresso no alvo assim que ele é alcançado ou
      // ultrapassado, em vez de uma aproximação exponencial (1ª causa
      // do problema relatado; a 2ª é a sobreposição da largura das
      // folhas, corrigida acima em `buildPanel`).
      const target = curtainOpen ? 1 : 0;
      const step = delta / CURTAIN_ANIM_DURATION;
      if (curtainProgress < target) {
        curtainProgress = Math.min(target, curtainProgress + step);
      } else if (curtainProgress > target) {
        curtainProgress = Math.max(target, curtainProgress - step);
      }
      const eased = curtainProgress * curtainProgress * (3 - 2 * curtainProgress);
      leftPanel.panelGroup.position.x = THREE.MathUtils.lerp(leftPanel.closedX, leftPanel.openX, eased);
      rightPanel.panelGroup.position.x = THREE.MathUtils.lerp(rightPanel.closedX, rightPanel.openX, eased);

      // O clarão no vidro (ver o bloco do CLARÃO mais acima).
      updateFlash();
    }

    return {
      group: group,
      outline: outline,
      toggleCurtain: toggleCurtain,
      isOpen: isOpen,
      getOpenness: getOpenness,
      update: update,
      setDaytime: setDaytime,
      stopStorm: stopStorm,
    };
  }

  return {
    createWindow: createWindow,
    WINDOW_WIDTH: WINDOW_WIDTH,
    WINDOW_HEIGHT: WINDOW_HEIGHT,
  };
})();
