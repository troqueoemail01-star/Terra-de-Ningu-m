/**
 * models/sky-factory.js
 * -------------------------------------------------
 * CEU (skybox) da vista externa das tres janelas do jogo - duas do
 * corredor + a do "MEU QUARTO" (ver models/window-factory.js,
 * models/window-glass-factory.js e o chao de grama de
 * models/exterior-factory.js).
 *
 * ====================================================================
 * O QUE MUDOU NESTA ATUALIZACAO (o pedido)
 * ====================================================================
 * Antes: ceu AZUL limpo + uma malha de nuvens fofas soltas por cima
 * (models/cloud-factory.js), e SO DE DIA - de noite o ceu nascia
 * invisivel e a janela mostrava o preto da nevoa.
 *
 * Agora:
 *
 *  1. NADA DE AZUL. Nenhuma parada da paleta tem azul de ceu limpo. O
 *     que existe e uma escala de CINZA fria (um sopro de azul-chumbo
 *     apenas para o cinza nao ficar "morto"), que e o "ar mais cinza"
 *     pedido para o jogo.
 *
 *  2. AS NUVENS SOLTAS SAIRAM. models/cloud-factory.js foi REMOVIDO do
 *     projeto (e o <script> dele saiu de index.html). Aquelas eram
 *     nuvens de tempo bom: tufos separados, com ceu aberto entre eles -
 *     o oposto de um ceu fechado. Nao virou "menos nuvens": o ceu
 *     inteiro agora E a nuvem. A cobertura nasce dentro deste proprio
 *     fragment shader (ver "O TETO DE NUVEM" abaixo), sem um unico
 *     triangulo a mais na cena - a malha continua sendo o mesmo cubo de
 *     12 triangulos de sempre.
 *
 *  3. O MESMO CEU DE DIA E DE NOITE. O desenho da cobertura, a altura
 *     do teto, o vento, tudo igual nos dois horarios: muda so o BRILHO
 *     da paleta (ver PALETTES abaixo). De noite fica bem escuro, de
 *     manha bem mais claro - foi exatamente o pedido. Por isso o ceu
 *     tambem deixou de nascer invisivel: ele existe desde o primeiro
 *     quadro do jogo, e `setDaytime()` so troca as cores.
 *
 * ====================================================================
 * POR QUE UMA SKYBOX DE VERDADE (E NAO UM PLANO PINTADO LA FORA)
 * ====================================================================
 * Um plano/quadro de ceu posicionado atras de cada janela teria tres
 * problemas que aqui nao existem:
 *
 *  1. PARALAXE ERRADA: andando pelo corredor, um plano a poucos metros
 *     "desliza" junto com o jogador e denuncia na hora que o ceu e um
 *     cenario de papelao. O ceu de verdade esta no infinito. A malha
 *     daqui e acompanhada pela camera de graca, direto no vertex
 *     shader (ver a mat3 do viewMatrix abaixo): a translacao da camera
 *     e DESCARTADA, entao o ceu nunca se aproxima nem se afasta -
 *     apenas gira com o olhar, como um ceu real.
 *
 *  2. PLANO DE CORTE DISTANTE: a camera do jogo desenha so ate 50
 *     unidades (`far`, ver scripts/main.js), e um ceu grande o
 *     bastante para nunca aparecer "de lado" estouraria esse limite e
 *     seria cortado em preto. Aqui a malha e um cubo minusculo (2
 *     unidades) e o proprio shader forca `gl_Position.z =
 *     gl_Position.w`, ou seja, todo pixel do ceu e escrito exatamente
 *     na profundidade maxima: nunca e cortado por perto nem por longe.
 *     E a mesma tecnica que o three.js usa no fundo de cubemap.
 *
 *  3. NEVOA: a nevoa da cena (ver scripts/atmosphere.js) fica 100%
 *     opaca a algumas dezenas de unidades e apagaria qualquer ceu
 *     desenhado como objeto normal do mundo. Este material simplesmente
 *     nao participa da nevoa (`fog: false` + shader proprio, sem os
 *     chunks de fog do three.js), entao o cinza chega limpo ate a tela.
 *
 * ORDEM DE DESENHO: `renderOrder = -1000` + `depthTest/depthWrite =
 * false` - o ceu e o PRIMEIRO objeto do quadro e nao escreve nada no
 * buffer de profundidade. Todo o resto (paredes, teto, moveis, moldura
 * da janela, CHUVA - ver models/rain-factory.js -, vidro) e desenhado
 * depois, por cima, do jeito normal. Resultado: o cinza so sobra onde
 * nao ha geometria nenhuma na frente - na pratica, o vao das tres
 * janelas, acima da linha da grama. `frustumCulled = false` porque a
 * malha e desenhada num lugar que nao tem relacao com a posicao real
 * dela no mundo (ver item 1).
 *
 * ====================================================================
 * O TETO DE NUVEM (a parte nova)
 * ====================================================================
 * Ceu fechado nao e "azul + manchas brancas": e uma LAJE de nuvem
 * continua, a algumas centenas de metros, vista DE BAIXO. Duas contas
 * dao isso, as duas dentro do fragment shader:
 *
 *  a) A PROJECAO DA LAJE. Para cada direcao do olhar, o ponto em que
 *     ela furaria um plano horizontal a `uDeckHeight` metros de altura
 *     e, simplesmente:
 *
 *         q = (direcao.xz / direcao.y) * uDeckHeight     [em metros]
 *
 *     E dai que sai a perspectiva certa de graca: olhando para cima, q
 *     anda pouco (as manchas ficam largas); baixando o olhar para o
 *     horizonte, direcao.y tende a zero e q dispara (as manchas
 *     comprimem e correm para longe). E a MESMA sensacao de um teto de
 *     nuvem real fugindo para o horizonte - e nao ha uma unica
 *     geometria de nuvem na cena. `uDeckFloor` limita o divisor: sem
 *     ele, rente ao horizonte q iria ao infinito e viraria chuvisco.
 *
 *  b) O DESENHO. Tres amostras da MESMA textura de ruido (128x128,
 *     assada em JavaScript na criacao - ver makeNoiseTexture), em tres
 *     escalas e com tres velocidades de vento diferentes. Isso e um
 *     fBm de tres oitavas em tres leituras de textura, o que cabe
 *     folgado num celular a 320x180 (ver scripts/main.js). As oitavas
 *     andam em velocidades diferentes de proposito: e o cisalhamento
 *     do vento, o mesmo truque da neblina de
 *     models/fog-volume-factory.js, e e ele que faz a cobertura
 *     "ferver" devagar em vez de deslizar como um decalque.
 *
 * O ruido nao pinta nuvem sobre ceu: ele MULTIPLICA o cinza de base
 * (`shade`), entre 1 - uContrast e 1 + uContrast. E por isso que a
 * mesma cobertura serve de dia e de noite - de noite o cinza de base e
 * quase preto, e o mesmo desenho aparece como sombra funda em vez de
 * nuvem clara. Uma unica paleta por horario, um unico shader.
 *
 * Perto do horizonte a estrutura e apagada (`structure`) e o cinza
 * abre para `uHorizonColor`: e o que qualquer dia nublado faz (a bruma
 * come o contraste na distancia) e, de tabela, mata o aliasing da laje
 * comprimida - que e onde q cresce mais rapido.
 *
 * `uGlowColor` e a unica claridade que sobra: as partes finas da laje,
 * por onde o sol quase passa. E de onde vem a leitura "e dia, mas nao
 * da para ver o sol" sem nenhum sol desenhado.
 *
 * ESTILO PSX: o resultado passa pelo MESMO tratamento de cor do resto
 * do jogo - quantizacao em poucos niveis + dithering ordenado 4x4 (a
 * matriz de Bayer daqui e a mesma de `applyPSXShader` em
 * models/window-factory.js). E isso que da o degrade "chapado", com
 * aquele chuvisco de pixels tipico do PS1. O que NAO e copiado de
 * applyPSXShader e o wobble/snap de vertice: num ceu no infinito ele
 * apareceria como a linha do horizonte tremendo a cada quadro.
 *
 * O BAIXO DO HORIZONTE: abaixo de y = 0 o ceu escurece rapido ate a
 * cor da NEVOA da cena em vez de continuar cinza de nuvem. Assim o
 * ponto em que a grama se perde na nevoa e o comeco do ceu se encontram
 * na mesma cor, sem nenhuma emenda visivel. Essa cor NAO e decidida
 * aqui: as cenas passam `hazeColor`/`nightHazeColor` a partir de
 * window.Atmosphere (ver scripts/atmosphere.js, dono da nevoa).
 *
 * USO (ver scenes/corridor-scene.js):
 *   const sky = window.SkyFactory.createSky({
 *     hazeColor: window.Atmosphere.DAY.fogColor,
 *     nightHazeColor: window.Atmosphere.NIGHT.fogColor,
 *   });
 *   root.add(sky.mesh);              // JA VISIVEL (ceu nublado de noite)
 *   frameUpdaters.push(sky.update);  // so empurra o relogio do vento
 *   ...
 *   function setDaytime(day) { sky.setDaytime(day); }
 * -------------------------------------------------
 */

window.SkyFactory = (function () {
  "use strict";

  // =====================================================================
  //  As DUAS paletas: mesma nuvem, brilhos opostos
  // =====================================================================
  // Regra que amarra as duas: NENHUM valor aqui tem azul de ceu limpo.
  // Sao cinzas frios (o canal azul so um passo acima do vermelho), o
  // "ar mais cinza" do pedido. E, em qualquer horario, o ZENITE e mais
  // ESCURO que o HORIZONTE - o contrario do ceu azul de antes. Nao e
  // gosto pessoal, e o que um dia encoberto faz: olhando para cima o
  // olhar atravessa a laje de nuvem pela espessura cheia (escuro);
  // olhando para o horizonte, atravessa quilometros de bruma iluminada
  // (claro). Inverter isso e o erro que faz ceu nublado parecer teto de
  // cimento.
  const PALETTES = Object.freeze({
    DAY: Object.freeze({
      // Manha nublada: claro o bastante para ler como "amanheceu",
      // fechado o bastante para nao ter uma unica aberta de sol.
      zenithColor: 0x6d747a,
      horizonColor: 0xa7adb1,
      glowColor: 0xc6cbcd,
      glowStrength: 0.34,
      contrast: 0.17,
    }),
    NIGHT: Object.freeze({
      // A MESMA cobertura, "bem escuro" como pedido: o desenho da
      // nuvem continua ali, mas so aparece como variacao de breu. Nao e
      // preto puro de proposito - preto puro nao le como ceu, le como
      // buraco no cenario. Este cinza-chumbo baixissimo deixa a
      // silhueta da mata (ver models/tree-forest-factory.js) se
      // destacar contra o ceu, que e o que faz uma noite encoberta
      // parecer noite encoberta.
      zenithColor: 0x0b0d11,
      horizonColor: 0x191d24,
      glowColor: 0x272d36,
      glowStrength: 0.22,
      contrast: 0.24,
    }),
  });

  const DEFAULTS = Object.freeze({
    // ---------- Geometria da laje de nuvem ----------
    // Altura do teto de nuvem, em metros (ver "a) A PROJECAO DA LAJE"
    // no topo). 220 m e a faixa de um stratus/stratocumulus baixo, que
    // e justamente o ceu encoberto e opressivo que o jogo quer. Mais
    // alto e a laje "descola" e vira papel de parede; mais baixo e a
    // perspectiva exagera e as manchas correm rapido demais ao mexer a
    // cabeca.
    deckHeight: 220,

    // Limite inferior do divisor da projecao (ver o topo). 0.10 =~ 5.7
    // graus acima do horizonte: dali para baixo a laje para de
    // comprimir. Sem isto, o ultimo grau antes do horizonte viraria
    // ruido puro de um pixel.
    deckFloor: 0.1,

    // Tamanho das manchas: quantos METROS de laje cabem numa volta
    // completa da textura na oitava mais larga. 900 m = manchao de
    // nuvem de quase um quilometro, a escala real de um teto de
    // stratocumulus.
    deckScale: 900,

    // Vento do teto de nuvem, em metros por segundo (x, z do mundo).
    // ~5 m/s: da para PERCEBER que o ceu se move se o jogador ficar
    // olhando pela janela, sem parecer time-lapse. As tres oitavas
    // andam com este mesmo vetor multiplicado por fatores diferentes
    // (ver DRIFT_SHEAR), o que da o cisalhamento.
    wind: [4.6, 1.7],

    // ---------- Gradiente ----------
    // Largura (em altura normalizada, 0-1) da transicao horizonte ->
    // zenite, e o expoente dessa subida. Expoente < 1 puxa o cinza
    // fundo para mais perto do horizonte: pelo vao de uma janela o
    // jogador ve um pedaco pequeno de ceu, quase sempre logo acima da
    // linha da mata.
    horizonSoftness: 0.06,
    zenithBias: 0.62,

    // Onde a estrutura da nuvem termina de nascer, subindo do
    // horizonte (em altura normalizada). Abaixo disso o ceu e cinza
    // liso de bruma - ver o topo.
    structureRise: 0.3,

    // Largura da queda para a cor da nevoa abaixo do horizonte.
    hazeSoftness: 0.1,

    // Niveis de quantizacao de cor (mesmo valor padrao de
    // applyPSXShader no resto do projeto).
    ditherLevels: 28,

    // Cores da nevoa de cada horario. Fallback: as cenas passam as duas
    // a partir de window.Atmosphere.
    hazeColor: 0x7d93a6,
    nightHazeColor: 0x05040a,

    // Comeca de dia? Nao: o jogo comeca de NOITE (ver scripts/main.js).
    // A diferenca em relacao a versao anterior deste arquivo e que
    // "noite" agora e uma PALETA, nao mais um ceu invisivel.
    daytime: false,

    // Visivel ao ser criado? Agora SIM, sempre: o pedido e ter ceu
    // nublado tambem de noite.
    visible: true,
  });

  // Fatores de velocidade de cada oitava (o cisalhamento do vento). A
  // do meio corre mais que a larga, e a fina corre para tras: nenhuma
  // das tres fecha ciclo com as outras, entao a cobertura nunca repete
  // o mesmo desenho.
  const DRIFT_SHEAR = [1.0, 1.42, -0.68];

  // Escalas relativas das tres oitavas e o peso de cada uma na soma.
  const OCTAVE_SCALE = [1.0, 2.9, 7.8];
  const OCTAVE_WEIGHT = [0.54, 0.31, 0.15];

  // =====================================================================
  //  A textura de ruido do teto (assada uma vez, compartilhada)
  // =====================================================================
  // 128x128, tileavel, com um fBm de quatro oitavas JA ASSADO dentro
  // dela. Assar em JavaScript em vez de calcular no shader troca ~20
  // linhas de matematica por fragmento (o classico hash com sin(), que
  // ainda por cima "banda" em mediump nos celulares) por uma leitura de
  // textura - a mesma escolha que models/fog-volume-factory.js ja tinha
  // feito pela neblina.
  //
  // O ruido e de LATTICE PERIODICA: cada oitava sorteia valores numa
  // grade cujo lado divide 128 e le os vizinhos com modulo, entao a
  // textura fecha sem costura nas quatro bordas. Sem isso apareceria
  // uma linha reta de emenda cruzando o ceu.
  let noiseTexture = null;

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

  function makeNoiseTexture() {
    if (noiseTexture) {
      return noiseTexture;
    }

    const SIZE = 128;
    const rng = mulberry32(0x6ce0a17);

    // cells: lado da grade da oitava (divide 128). amp: peso dela.
    const OCTAVES = [
      { cells: 4, amp: 0.5 },
      { cells: 8, amp: 0.26 },
      { cells: 16, amp: 0.15 },
      { cells: 32, amp: 0.09 },
    ];

    const field = new Float32Array(SIZE * SIZE);

    OCTAVES.forEach(function (octave) {
      const n = octave.cells;
      const lattice = new Float32Array(n * n);
      for (let i = 0; i < lattice.length; i++) {
        lattice[i] = rng();
      }
      const step = SIZE / n;

      for (let y = 0; y < SIZE; y++) {
        const gy = y / step;
        const y0 = Math.floor(gy) % n;
        const y1 = (y0 + 1) % n;
        // smoothstep na fracao: value noise com interpolacao suave (e
        // nao linear, que deixaria vinco de grade visivel no ceu).
        const fy = gy - Math.floor(gy);
        const sy = fy * fy * (3 - 2 * fy);

        for (let x = 0; x < SIZE; x++) {
          const gx = x / step;
          const x0 = Math.floor(gx) % n;
          const x1 = (x0 + 1) % n;
          const fx = gx - Math.floor(gx);
          const sx = fx * fx * (3 - 2 * fx);

          const v00 = lattice[y0 * n + x0];
          const v10 = lattice[y0 * n + x1];
          const v01 = lattice[y1 * n + x0];
          const v11 = lattice[y1 * n + x1];
          const top = v00 + (v10 - v00) * sx;
          const bottom = v01 + (v11 - v01) * sx;
          field[y * SIZE + x] += (top + (bottom - top) * sy) * octave.amp;
        }
      }
    });

    // Normaliza para 0-1 pelo minimo/maximo reais: a cobertura usa a
    // faixa inteira do byte, qualquer que seja o sorteio.
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < field.length; i++) {
      if (field[i] < min) min = field[i];
      if (field[i] > max) max = field[i];
    }
    const range = max - min || 1;

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(SIZE, SIZE);
    for (let i = 0; i < field.length; i++) {
      const v = Math.round(((field[i] - min) / range) * 255);
      image.data[i * 4] = v;
      image.data[i * 4 + 1] = v;
      image.data[i * 4 + 2] = v;
      image.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // LINEAR aqui, ao contrario das texturas de objeto do jogo (que sao
    // NearestFilter de proposito, ver materials/textures.js): a
    // "pixelizacao" do ceu tem que vir do dithering + quantizacao no
    // fim do shader, na resolucao da TELA, nao de blocos de 128avos da
    // textura de ruido - que apareceriam como quadrados gigantes de
    // nuvem, cada um de um cinza chapado. Com mipmap porque a laje
    // comprime brutalmente perto do horizonte.
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;

    noiseTexture = texture;
    return texture;
  }

  // Matriz de Bayer 4x4 escrita como cadeia de ifs - mesma tabela e
  // mesmo motivo de applyPSXShader (window-factory.js): indice
  // dinamico em array constante e territorio de driver duvidoso em
  // WebGL 1 / GLSL ES 1.0, sobretudo em GPU de celular, que e o alvo
  // deste jogo.
  const BAYER_GLSL = [
    "float psxBayer(vec2 fragCoord) {",
    "  float bx = mod(floor(fragCoord.x), 4.0);",
    "  float by = mod(floor(fragCoord.y), 4.0);",
    "  float bidx = bx + by * 4.0;",
    "  float bval;",
    "  if (bidx < 0.5) bval = 0.0;",
    "  else if (bidx < 1.5) bval = 8.0;",
    "  else if (bidx < 2.5) bval = 2.0;",
    "  else if (bidx < 3.5) bval = 10.0;",
    "  else if (bidx < 4.5) bval = 12.0;",
    "  else if (bidx < 5.5) bval = 4.0;",
    "  else if (bidx < 6.5) bval = 14.0;",
    "  else if (bidx < 7.5) bval = 6.0;",
    "  else if (bidx < 8.5) bval = 3.0;",
    "  else if (bidx < 9.5) bval = 11.0;",
    "  else if (bidx < 10.5) bval = 1.0;",
    "  else if (bidx < 11.5) bval = 9.0;",
    "  else if (bidx < 12.5) bval = 15.0;",
    "  else if (bidx < 13.5) bval = 7.0;",
    "  else if (bidx < 14.5) bval = 13.0;",
    "  else bval = 5.0;",
    "  return (bval / 16.0) - 0.5;",
    "}",
  ].join("\n");

  // ---------------------------------------------------------------------
  // Vertex shader (inalterado desde a versao do ceu azul)
  // ---------------------------------------------------------------------
  // `position` e um vertice do cubo unitario centrado na origem, entao
  // serve direto como DIRECAO do ceu (o fragment shader normaliza) - e,
  // de proposito, sem passar por `modelMatrix`: o ceu ignora por
  // completo a posicao/rotacao do grupo em que foi pendurado. Isso
  // deixa "para cima" sendo sempre o +Y do mundo.
  //
  // Na conta de tela, so a ROTACAO da camera e usada: a mat3 montada a
  // partir das tres primeiras colunas de `viewMatrix` descarta a
  // translacao (e isso que prende o ceu no infinito). A mat3 e montada
  // coluna por coluna em vez de `mat3(viewMatrix)` porque construtor de
  // matriz a partir de outra matriz nao existe em GLSL ES 1.0 (WebGL 1,
  // que e o que a r128 usa aqui) - compilaria em desktop e falharia
  // justamente no celular.
  const VERTEX_SHADER = [
    "varying vec3 vSkyDirection;",
    "void main() {",
    "  vSkyDirection = position;",
    "  mat3 viewRotation = mat3(viewMatrix[0].xyz, viewMatrix[1].xyz, viewMatrix[2].xyz);",
    "  vec4 clipPosition = projectionMatrix * vec4(viewRotation * position, 1.0);",
    "  clipPosition.z = clipPosition.w;",
    "  gl_Position = clipPosition;",
    "}",
  ].join("\n");

  // ---------------------------------------------------------------------
  // Fragment shader
  // ---------------------------------------------------------------------
  // precision highp: `uTime` cresce durante a partida inteira e entra
  // multiplicado pelo vento em metros (5 m/s x meia hora = 8 km) antes
  // de virar coordenada de textura. Em mediump isso perderia a parte
  // fracionaria e o teto de nuvem comecaria a "degrauzar" depois de
  // alguns minutos de jogo. O three.js cai para mediump sozinho onde
  // highp nao existir, e o dithering sobrevive a isso.
  const FRAGMENT_SHADER = [
    "precision highp float;",
    "uniform sampler2D uNoise;",
    "uniform float uTime;",
    "uniform vec3 uZenithColor;",
    "uniform vec3 uHorizonColor;",
    "uniform vec3 uGlowColor;",
    "uniform vec3 uHazeColor;",
    "uniform vec2 uWind;",
    "uniform float uDeckHeight;",
    "uniform float uDeckFloor;",
    "uniform float uDeckScale;",
    "uniform float uHorizonSoftness;",
    "uniform float uZenithBias;",
    "uniform float uStructureRise;",
    "uniform float uHazeSoftness;",
    "uniform float uContrast;",
    "uniform float uGlowStrength;",
    "uniform float uLevels;",
    "varying vec3 vSkyDirection;",
    BAYER_GLSL,
    // Uma oitava da cobertura: a mesma textura, numa escala e com uma
    // velocidade de vento proprias (ver DRIFT_SHEAR/OCTAVE_SCALE).
    "float deckOctave(vec2 q, float scale, float drift) {",
    "  vec2 uv = (q * scale + uWind * uTime * drift) / uDeckScale;",
    "  return texture2D(uNoise, uv).r;",
    "}",
    "void main() {",
    // Altura no ceu: +1 no zenite, 0 no horizonte, -1 nos pes.
    "  vec3 direction = normalize(vSkyDirection);",
    "  float height = direction.y;",
    "  float upward = max(height, 0.0);",
    // ---- a) onde o olhar fura a laje de nuvem (em metros) ----
    "  vec2 q = (direction.xz / max(upward, uDeckFloor)) * uDeckHeight;",
    // ---- b) o desenho da cobertura: fBm de tres oitavas ----
    "  float cover = deckOctave(q, S0, D0) * W0;",
    "  cover += deckOctave(q, S1, D1) * W1;",
    "  cover += deckOctave(q, S2, D2) * W2;",
    // Perto do horizonte a bruma come o contraste (e o aliasing).
    "  float structure = smoothstep(0.0, uStructureRise, upward);",
    // Cinza de base: ESCURO no zenite, PALIDO no horizonte (ver o
    // comentario das paletas).
    "  vec3 base = mix(uHorizonColor, uZenithColor, smoothstep(uHorizonSoftness, 1.0, pow(upward, uZenithBias)));",
    // A nuvem MULTIPLICA o cinza de base - e isso que faz a mesma
    // cobertura servir de dia e de noite.
    "  float shade = mix(1.0 - uContrast, 1.0 + uContrast, smoothstep(0.12, 0.88, cover));",
    "  vec3 above = base * mix(1.0, shade, structure);",
    // As partes finas da laje, por onde a luz quase passa.
    "  float thin = smoothstep(0.63, 0.97, cover) * uGlowStrength * structure;",
    "  above = mix(above, uGlowColor, thin);",
    // Abaixo do horizonte: cai para a cor da nevoa da cena, pra emendar
    // sem costura com a grama que a nevoa ja apagou.
    "  vec3 below = mix(uHorizonColor, uHazeColor, smoothstep(0.0, uHazeSoftness, -height));",
    "  vec3 color = mix(below, above, step(0.0, height));",
    // Acabamento PSX: paleta reduzida + dithering ordenado (ver topo).
    "  color = floor(color * uLevels + psxBayer(gl_FragCoord.xy) + 0.5) / uLevels;",
    "  gl_FragColor = vec4(color, 1.0);",
    "}",
  ]
    .join("\n")
    // As seis constantes das tres oitavas entram como LITERAIS no
    // codigo do shader (e nao como uniforms): elas nunca mudam em tempo
    // de execucao, e literal deixa o compilador do driver dobrar as
    // multiplicacoes. Ficam escritas num lugar so, la em cima.
    .replace(/S0/g, OCTAVE_SCALE[0].toFixed(3))
    .replace(/S1/g, OCTAVE_SCALE[1].toFixed(3))
    .replace(/S2/g, OCTAVE_SCALE[2].toFixed(3))
    .replace(/D0/g, DRIFT_SHEAR[0].toFixed(3))
    .replace(/D1/g, DRIFT_SHEAR[1].toFixed(3))
    .replace(/D2/g, DRIFT_SHEAR[2].toFixed(3))
    .replace(/W0/g, OCTAVE_WEIGHT[0].toFixed(3))
    .replace(/W1/g, OCTAVE_WEIGHT[1].toFixed(3))
    .replace(/W2/g, OCTAVE_WEIGHT[2].toFixed(3));

  /**
   * Cria o ceu. Devolve `{ mesh, setDaytime, setMorning, isMorning,
   * setVisible, isVisible, setColors, update, dispose }` - a cena so
   * precisa pendurar `mesh` no grupo dela, empurrar `update` nos
   * frameUpdaters e chamar `setDaytime(true/false)` quando o horario
   * virar.
   *
   * Nenhum parametro e obrigatorio; `options` aceita qualquer chave de
   * DEFAULTS acima (cores em hexadecimal, como no resto do projeto).
   */
  function createSky(options) {
    const opts = Object.assign({}, DEFAULTS, options || {});

    let daytime = opts.daytime !== false;

    // A paleta em vigor, montada na hora: as cores de NUVEM vem de
    // PALETTES (deste arquivo, dono do ceu) e a cor da NEVOA vem de quem
    // chamou (dona: scripts/atmosphere.js) - ver o topo.
    function paletteFor(day) {
      const source = day ? PALETTES.DAY : PALETTES.NIGHT;
      return {
        zenithColor: source.zenithColor,
        horizonColor: source.horizonColor,
        glowColor: source.glowColor,
        glowStrength: source.glowStrength,
        contrast: source.contrast,
        hazeColor: day ? opts.hazeColor : opts.nightHazeColor,
      };
    }

    const start = paletteFor(daytime);

    const uniforms = {
      uNoise: { value: makeNoiseTexture() },
      uTime: { value: 0 },
      uZenithColor: { value: new THREE.Color(start.zenithColor) },
      uHorizonColor: { value: new THREE.Color(start.horizonColor) },
      uGlowColor: { value: new THREE.Color(start.glowColor) },
      uHazeColor: { value: new THREE.Color(start.hazeColor) },
      uWind: { value: new THREE.Vector2(opts.wind[0], opts.wind[1]) },
      uDeckHeight: { value: opts.deckHeight },
      uDeckFloor: { value: opts.deckFloor },
      uDeckScale: { value: opts.deckScale },
      uHorizonSoftness: { value: opts.horizonSoftness },
      uZenithBias: { value: opts.zenithBias },
      uStructureRise: { value: opts.structureRise },
      uHazeSoftness: { value: opts.hazeSoftness },
      uContrast: { value: start.contrast },
      uGlowStrength: { value: start.glowStrength },
      uLevels: { value: opts.ditherLevels },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      // Cubo visto de DENTRO (a camera esta sempre no centro dele).
      side: THREE.BackSide,
      // Fundo de tudo: nao testa nem escreve profundidade, e e desenhado
      // antes de qualquer outra coisa (renderOrder abaixo).
      depthTest: false,
      depthWrite: false,
      // Sem nevoa: e o ceu, nao um objeto a 13 unidades (ver item 3 no
      // topo do arquivo).
      fog: false,
      transparent: false,
    });

    // 2 unidades, centrado na origem: o tamanho e irrelevante (o shader
    // normaliza a direcao e crava a profundidade), so precisa envolver a
    // camera. 12 triangulos, o ceu mais barato possivel - importa num
    // jogo de celular. E, desde esta atualizacao, sao os MESMOS 12
    // triangulos: o ceu fechado nasceu inteiro dentro do fragment
    // shader, sem nuvem de geometria (a antiga models/cloud-factory.js
    // somava alguns milhares de triangulos e um segundo material
    // transparente).
    const geometry = new THREE.BoxGeometry(2, 2, 2);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Skybox";
    mesh.renderOrder = -1000;
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false; // nunca se move: a camera vem ate ele
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.visible = !!opts.visible;

    function setVisible(visible) {
      mesh.visible = !!visible;
    }

    function isVisible() {
      return mesh.visible;
    }

    /**
     * Troca a paleta em vigor: `true` = DIA (cinza claro), `false` =
     * NOITE (o MESMO ceu nublado, bem escuro). Instantaneo e sem nada
     * recriado - sao os mesmos uniforms, o mesmo material e a mesma
     * textura de ruido -, pelo mesmo motivo de sempre: a virada da
     * historia acontece com a tela preta (ver
     * cutscenes/sleep-sequence.js), e o Editor precisa poder ir e voltar
     * (ver editor/editor-ui.js).
     */
    function setDaytime(day) {
      daytime = day !== false;
      const now = paletteFor(daytime);
      uniforms.uZenithColor.value.set(now.zenithColor);
      uniforms.uHorizonColor.value.set(now.horizonColor);
      uniforms.uGlowColor.value.set(now.glowColor);
      uniforms.uHazeColor.value.set(now.hazeColor);
      uniforms.uContrast.value = now.contrast;
      uniforms.uGlowStrength.value = now.glowStrength;
    }

    function setMorning() {
      setDaytime(true);
    }

    function isMorning() {
      return daytime;
    }

    // Troca de cor na mao (nenhum uso no jogo) - deixa a porta aberta
    // pra um fim de tarde ou uma tempestade mais fechada mais adiante,
    // sem precisar recriar nada.
    function setColors(colors) {
      if (!colors) {
        return;
      }
      if (colors.zenithColor !== undefined) uniforms.uZenithColor.value.set(colors.zenithColor);
      if (colors.horizonColor !== undefined) uniforms.uHorizonColor.value.set(colors.horizonColor);
      if (colors.glowColor !== undefined) uniforms.uGlowColor.value.set(colors.glowColor);
      if (colors.hazeColor !== undefined) uniforms.uHazeColor.value.set(colors.hazeColor);
      if (colors.contrast !== undefined) uniforms.uContrast.value = colors.contrast;
      if (colors.glowStrength !== undefined) uniforms.uGlowStrength.value = colors.glowStrength;
    }

    // Todo o custo por quadro do ceu: escrever UM float. O vento da
    // cobertura acontece inteiro no shader, a partir do tempo ABSOLUTO
    // do jogo - entao um engasgo de quadro nao faz o ceu saltar.
    function update(delta, elapsed) {
      uniforms.uTime.value =
        typeof elapsed === "number" ? elapsed : uniforms.uTime.value + (delta || 0);
    }

    function dispose() {
      geometry.dispose();
      material.dispose();
    }

    return {
      mesh: mesh,
      setDaytime: setDaytime,
      setMorning: setMorning,
      isMorning: isMorning,
      setVisible: setVisible,
      isVisible: isVisible,
      setColors: setColors,
      update: update,
      dispose: dispose,
    };
  }

  return {
    DEFAULTS: DEFAULTS,
    PALETTES: PALETTES,
    createSky: createSky,
  };
})();
