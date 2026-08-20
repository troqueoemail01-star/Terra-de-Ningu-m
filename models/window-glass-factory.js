/**
 * models/window-glass-factory.js
 * -------------------------------------------------
 * Vidro das janelas em estilo PSX/PS1 — usado pelas três
 * janelas do jogo (duas do corredor + uma do "MEU QUARTO"),
 * chamado de dentro de models/window-factory.js.
 *
 * Baseado no modelo de referência "PSX Window Glass" enviado
 * pelo jogador (moldura clara ao redor de um vidro
 * transparente acinzentado, com uma faixa de luz diagonal e
 * dois brilhos — um pequeno no canto superior direito, um
 * alongado no canto inferior direito). Só a PARTE DO VIDRO
 * desse modelo é usada aqui — a "moldura" do pacote de
 * referência é ignorada de propósito, porque a janela já tem
 * sua própria moldura de madeira (ver window-factory.js);
 * usar as duas juntas duplicaria a moldura.
 *
 * Portado para o mesmo formato "clássico" já usado por todo o
 * resto do jogo (window.XFactory = IIFE, THREE global
 * carregado via <script> no index.html, sem import/export de
 * ES module) — o pacote de referência original era um ES
 * Module autocontido (import * as THREE from 'three'), que
 * não é o sistema de carregamento usado neste projeto.
 *
 * `createGlass(width, height)` devolve um THREE.Group (origem
 * no CENTRO do vidro) com duas meshes:
 *  - "glass"           -> tingimento transparente do vidro
 *                          (MeshBasicMaterial, transparent,
 *                          depthWrite:false)
 *  - "glassHighlight"  -> reflexos/brilhos (textura procedural
 *                          via canvas, NearestFilter, blending
 *                          aditivo)
 *
 * As duas usam applyPSXShader (cópia local da mesma função já
 * usada em models/window-factory.js e models/book-factory.js)
 * para o wobble de vértice + dithering ficarem idênticos ao
 * resto da janela — em vez do onBeforeCompile específico do
 * pacote de referência (mesma ideia, implementação diferente;
 * aqui usamos a técnica já padronizada no projeto, pro vidro
 * não destoar visualmente da moldura/cortina).
 *
 * São PlaneGeometry simples, então o próprio
 * models/outline-factory.js já ignora essas peças
 * automaticamente na casca de contorno/mira do
 * InteractionSystem (ver comentário no topo daquele arquivo,
 * que cita "vidro" como exemplo de decalque ignorado) —
 * nenhuma alteração necessária lá, nem `excludeFromOutline`.
 * -------------------------------------------------
 */

window.WindowGlassFactory = (function () {
  "use strict";

  const DEFAULTS = Object.freeze({
    glassColor: 0x8b939c, // tingimento acinzentado, igual à referência enviada
    glassOpacity: 0.34,
    highlightIntensity: 0.9,
    textureSize: 64, // textura procedural de reflexo, pixelizada (estilo PS1)
    // Pequena folga em relação ao vão da moldura (largura/altura
    // passadas para createGlass), pra a borda do vidro nunca coincidir
    // exatamente com a borda interna do friso de madeira (evita
    // qualquer artefato de borda por causa do wobble de vértice do
    // shader PSX abaixo, que desloca levemente os dois em separado).
    edgeInset: 0.006,
  });

  // ---------------------------------------------------------------------
  // Mesmo shader PSX (wobble de vértice no espaço de tela + dithering
  // ordenado 4x4) já usado em window-factory.js/book-factory.js — cópia
  // local, mesma convenção do resto do projeto.
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

  // Textura procedural de reflexo (faixa diagonal + brilho pequeno no
  // canto superior direito + brilho alongado no canto inferior direito
  // + leve brilho vertical na borda esquerda) — mesma receita do
  // modelo de referência enviado, só a resolução do canvas é
  // reaproveitada como está (pequena, com NearestFilter, de propósito:
  // reflexo "blocado"/pixelizado, no espírito PS1, igual ao resto das
  // texturas procedurais do jogo — ver createFrostedGlassTexture etc.
  // em materials/textures.js).
  function createHighlightTexture(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.filter = "blur(3px)";
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(size * 0.04, size * 0.02);
    ctx.lineTo(size * 0.72, size * 0.82);
    ctx.stroke();
    ctx.restore();

    let g = ctx.createRadialGradient(size * 0.78, size * 0.15, 0, size * 0.78, size * 0.15, size * 0.11);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.translate(size * 0.78, size * 0.15);
    ctx.rotate(-0.4);
    ctx.scale(1, 0.55);
    ctx.translate(-size * 0.78, -size * 0.15);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    g = ctx.createRadialGradient(size * 0.86, size * 0.78, 0, size * 0.86, size * 0.78, size * 0.16);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.translate(size * 0.86, size * 0.78);
    ctx.scale(0.5, 1.7);
    ctx.translate(-size * 0.86, -size * 0.78);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    g = ctx.createLinearGradient(size * 0.0, 0, size * 0.16, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, size * 0.16, size * 0.16, size * 0.55);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Cria o vidro (tingimento + reflexos) pronto para ser encaixado no
   * vão de UMA janela já existente (ver window-factory.js).
   *
   * `width`/`height`: tamanho do vão VISÍVEL da moldura (depois do
   * friso interno) — não o tamanho externo da janela inteira.
   *
   * Devolve um THREE.Group com origem no CENTRO do vidro, já com as
   * duas meshes posicionadas/prontas — quem chamar só precisa
   * posicionar esse grupo dentro do vão (x, y, z) e adicioná-lo à
   * cena; nenhum ajuste de escala/rotação é necessário depois (a
   * geometria já nasce do tamanho certo, olhando para +Z local, igual
   * ao resto das peças planas do jogo — ver DoorFactory).
   */
  function createGlass(width, height, options) {
    const opts = Object.assign({}, DEFAULTS, options || {});

    const w = Math.max(width - opts.edgeInset * 2, 0.01);
    const h = Math.max(height - opts.edgeInset * 2, 0.01);

    // ---- Vidro (tingimento transparente) -------------------------------
    const glassGeo = new THREE.PlaneGeometry(w, h, 1, 1);
    const glassMat = new THREE.MeshBasicMaterial({
      color: opts.glassColor,
      transparent: true,
      opacity: opts.glassOpacity,
      side: THREE.DoubleSide, // visível dos dois lados — agora que existe vista externa (grama, ver models/exterior-factory.js), importante pro vidro continuar certo vindo de qualquer ângulo
      depthWrite: false,
      fog: true, // mesma neblina de cena que o resto do jogo já usa (scripts/main.js)
    });
    // `levels` bem mais alto que o padrão (28) só aqui: o vidro é uma cor
    // LISA e sem luz (MeshBasicMaterial, sem textura, sem variação por
    // pixel), então o dithering ordenado do PSX shader — pensado pra
    // disfarçar banding em gradientes de luz/textura — passa a ser a
    // própria coisa visível: um quadriculado 4x4 uniforme cobrindo o
    // vidro inteiro. De dia isso quase não se nota (o vidro fica contra a
    // grama/céu claros do lado de fora, ver models/exterior-factory.js);
    // de noite o lado de fora é quase preto (Atmosphere.NIGHT.mistColor),
    // e o mesmo quadriculado passa a se destacar com força. Um `levels`
    // alto deixa o degrau de quantização pequeno demais pra formar
    // xadrez perceptível, sem remover o wobble de vértice (grid,
    // inalterado) que dá o resto do "visual PSX" à janela.
    applyPSXShader(glassMat, undefined, 512);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.name = "glass";
    glassMesh.renderOrder = 1;
    glassMesh.castShadow = false;
    glassMesh.receiveShadow = false;

    // ---- Reflexos do vidro (blending aditivo, textura procedural) ------
    const highlightGeo = new THREE.PlaneGeometry(w, h, 1, 1);
    const highlightTex = createHighlightTexture(opts.textureSize);
    const highlightMat = new THREE.MeshBasicMaterial({
      map: highlightTex,
      transparent: true,
      opacity: opts.highlightIntensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    // Mesmo motivo do glassMat acima: reflexo por cima de blending
    // aditivo, sem luz nem textura variando por pixel — `levels` alto
    // evita o mesmo quadriculado nas bordas suaves do brilho.
    applyPSXShader(highlightMat, undefined, 512);
    const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    highlightMesh.name = "glassHighlight";
    highlightMesh.renderOrder = 2;
    highlightMesh.position.z = 0.002; // levemente à frente do tingimento, evita z-fighting (coplanares)
    highlightMesh.castShadow = false;
    highlightMesh.receiveShadow = false;

    const group = new THREE.Group();
    group.name = "WindowGlass";
    group.add(glassMesh, highlightMesh);
    return group;
  }

  return {
    createGlass: createGlass,
  };
})();
