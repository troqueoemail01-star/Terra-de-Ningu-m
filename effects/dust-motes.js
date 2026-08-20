/**
 * effects/dust-motes.js
 * -------------------------------------------------
 * POEIRA SUSPENSA NO AR dos ambientes internos da casa: particulas
 * minusculas, lentas e discretas flutuando dentro do CORREDOR, do
 * MEU QUARTO, do QUARTO 01, do QUARTO 02, da COZINHA e do BANHEIRO.
 *
 * E detalhe de ambientacao, nao elemento de tela: o objetivo e o
 * jogador SENTIR "esse lugar e velho e cheio de poeira", nunca pensar
 * "olha, um efeito de particulas". Por isso cada escolha aqui empurra
 * para o lado do DISCRETO - poucos pontos, de 1 a 2 pixels na
 * resolucao interna do jogo, movimento na casa dos centimetros por
 * segundo e brilho que depende da luz que existe no comodo.
 *
 * ---------- Como funciona (e por que assim) ----------
 * Um unico THREE.Points POR COMODO (6 objetos no total, ~150
 * particulas somando tudo), com um ShaderMaterial proprio. Ou seja:
 * seis draw calls, nenhum objeto 3D individual por particula e NENHUM
 * laco de JavaScript por particula por quadro - todo o movimento e
 * calculado no vertex shader a partir de `uTime`. O custo por quadro
 * do lado da CPU e literalmente escrever um punhado de uniforms por
 * comodo, e e isso que faz o efeito caber num celular (ver
 * "Desempenho" mais abaixo).
 *
 * Usa o mesmo Three.js, a mesma cena, a mesma camera e o mesmo
 * renderer do resto do jogo (ver scripts/main.js). Nada de sistema de
 * particulas paralelo, nada de segunda tecnologia.
 *
 * ---------- 1. Movimento: poeira, nao pontinhos em fila ----------
 * Cada particula tem uma posicao BASE (sorteada uma vez, na criacao) e
 * passeia em torno dela. O passeio e a soma de TRES senoides por eixo,
 * com frequencias que nao sao multiplas entre si (0.4x, 1x, 1.7x) e
 * fases proprias sorteadas por particula:
 *
 *   - a soma de senoides incomensuraveis nunca fecha um ciclo curto,
 *     entao o caminho nao le como "trajetoria", le como deriva: muda
 *     de direcao sozinho, de leve, sem repetir o mesmo desenho e sem
 *     nunca correr em linha reta;
 *   - as tres amplitudes somam exatamente 1.0, entao o desvio maximo e
 *     EXATAMENTE `WANDER` em cada eixo - e isso que permite garantir,
 *     por construcao, que nenhuma particula sai do comodo (ver 5);
 *   - cada particula tem frequencia propria em cada eixo, entao o
 *     enxame nunca "respira junto" (o erro classico que entrega que
 *     tudo saiu da mesma formula);
 *   - os periodos ficam entre ~13 e ~34 segundos: a velocidade de pico
 *     fica na casa de 10 cm/s. Bem devagar de proposito. Poeira de
 *     verdade quase nao anda.
 *
 * O movimento vem do relogio do jogo, nao do jogador: as particulas
 * continuam derivando com ele parado, andando, olhando para cima, para
 * baixo ou girando a camera. Todos os comodos animam sempre, inclusive
 * os que estao fora de vista (e so um `uTime`), pelo mesmo principio
 * das outras animacoes da casa (ver scripts/house-world.js).
 *
 * ---------- 2. Tamanho: 1 a 2 pixels ----------
 * O jogo renderiza em 320x180 e depois amplia com `image-rendering:
 * pixelated` (ver scripts/main.js), entao "pequeno" aqui e literal:
 * `gl_PointSize` e travado entre 1.0 e 2.4 PIXELS DESSE buffer, com
 * atenuacao por distancia. Na pratica a poeira e um pixel cru
 * acendendo de leve - exatamente a estetica PS1/PSX do resto do jogo,
 * de graca, sem pos-processamento nenhum.
 *
 * Tambem nao ha textura: num ponto de 1 ou 2 pixels, um sprite nao
 * teria como aparecer. O recorte redondo e feito no fragment shader
 * com `gl_PointCoord`, e o alpha final e QUANTIZADO em 8 degraus, para
 * a poeira ter a mesma banda grosseira do resto da imagem em vez de um
 * degrade liso e moderno.
 *
 * ---------- 3. Quantidade e distribuicao ----------
 * A contagem sai da AREA de piso do comodo (`DENSITY`), com piso e
 * teto (`MIN_COUNT`/`MAX_COUNT`): comodo grande nao fica vazio, e o
 * corredor (132 m2) nao vira tempestade de areia.
 *
 * As posicoes base nao sao sorteio puro: o comodo e dividido numa
 * grade e cada particula cai numa celula distinta, com jitter dentro
 * dela (amostragem estratificada). Sorteio puro forma grumos e deixa
 * buracos visiveis com tao poucas particulas; a grade embaralhada
 * garante espalhamento natural pelo ambiente inteiro, sem alinhamento
 * perceptivel.
 *
 * Em Y a distribuicao e enviesada para baixo (`HEIGHT_BIAS`): o
 * pe-direito e 4.2 e os olhos do jogador ficam em 1.6, entao
 * concentrar a poeira na faixa em que ele realmente olha rende mais do
 * que espalhar tudo ate o teto.
 *
 * ---------- 4. Iluminacao: particula iluminada, nao particula que brilha ----------
 * O brilho de cada particula e calculado no shader a partir da luz que
 * REALMENTE existe naquele ponto: a luz ambiente da cena mais ate 4
 * PointLights do jogo (as luminarias do corredor, o abajur do quarto,
 * a luz da manha), com queda por distancia. As particulas nao emitem
 * nada: sem blending aditivo, sem bulbo, sem "estrelinha".
 *
 * Consequencias que saem de graca disso:
 *
 *   - debaixo de uma luminaria acesa a poeira aparece mais e puxa o
 *     TOM da luz (as luminarias sao ambar, 0xffcf8a);
 *   - num comodo escuro ela cai para o minimo (`minLit`) e fica so
 *     insinuada - o BANHEIRO e os dois quartos laterais nao tem luz
 *     propria nenhuma, e e assim que devem ficar;
 *   - as luminarias do corredor OSCILAM (ver models/lamp-factory.js) e
 *     a poeira oscila com elas, porque le a intensidade viva da luz a
 *     cada quadro;
 *   - apagar o abajur do quarto apaga a poeira do quarto junto.
 *
 * ---------- 5. A poeira nao atravessa parede ----------
 * Duas garantias independentes:
 *
 *   - GEOMETRICA: cada comodo tem seu proprio volume de particulas,
 *     que e o retangulo que a zona ocupa no MUNDO (`zone.bounds`, ver
 *     scripts/house-world.js) encolhido por `WALL_MARGIN` + o desvio
 *     maximo do passeio. Como o passeio e limitado por construcao (ver
 *     1), nenhuma particula tem como chegar ao plano de uma parede,
 *     entrar no comodo vizinho, sair pela porta ou aparecer do lado de
 *     fora da casa. Nao existe "poeira da casa" solta: existem seis
 *     volumes, um por ambiente.
 *   - DE PROFUNDIDADE: o material TESTA profundidade (so nao ESCREVE
 *     nela), entao parede, porta fechada e mobilia ocultam a poeira
 *     normalmente. Mesmo principio da neblina do exterior (ver
 *     models/fog-volume-factory.js).
 *
 * ---------- 6. Nevoa e distancia ----------
 * A mistura com a `scene.fog` e feita a mao no shader, como na neblina
 * do exterior: para um ponto translucido, o certo e DESAPARECER dentro
 * da nevoa (alpha caindo a zero) e nao ser pintado com a cor dela -
 * misturar com a cor da nevoa de dia deixaria a poeira mais CLARA
 * justamente onde ela deveria se perder. Os valores de near/far sao
 * lidos da propria `scene.fog`, entao noite e dia continuam sendo
 * decididos num lugar so (ver scripts/atmosphere.js).
 *
 * Ha tambem um fade de PERTO: uma particula colada na camera viraria
 * um borrao chapado no meio da tela. Abaixo de ~0.19 metro ela apaga.
 *
 * ---------- 7. Desempenho mobile ----------
 *   - 6 draw calls, ~150 pontos, tudo em buffer estatico por comodo
 *     (nenhum atributo e reescrito em tempo de execucao);
 *   - zero laco por particula na CPU - o passeio inteiro e `uTime`;
 *   - comodo longe do jogador (alem do alcance da nevoa) fica
 *     `visible = false`: nem sobe uniform, nem entra na fila de
 *     desenho;
 *   - shader curto, sem textura, sem derivadas, sem pos-processamento
 *     e sem alocacao por quadro (os vetores de trabalho e as posicoes
 *     das luzes sao reaproveitados; o coletor de lixo num celular e
 *     justamente o que produz aquele engasgo periodico).
 *
 * window.DustMotes.create({ zones, parent, height, fog,
 *                           ambientLight, lightRoot })
 *   -> { root, update(delta, elapsed, viewPos), setEnabled,
 *        isEnabled, dispose }
 * -------------------------------------------------
 */

window.DustMotes = (function () {
  "use strict";

  // Quantas luzes do jogo cada comodo leva em conta. 4 e folgado para
  // a casa atual (o corredor tem as luminarias de teto, o quarto tem o
  // abajur e a luz da manha) e mantem o laco do shader curto - o
  // tamanho do array de uniforms e fixo, exigencia do GLSL.
  const MAX_LIGHTS = 4;

  // ---------- Quantidade ----------
  const DENSITY = 0.75; // particulas por m2 de piso
  const MIN_COUNT = 18; // nenhum comodo fica "vazio"
  const MAX_COUNT = 80; // teto do corredor (132 m2), que e o maior

  // ---------- Volume de cada comodo ----------
  // Afastamento das paredes/piso/teto, ANTES de somar o passeio (o
  // passeio e somado por cima destes valores em `buildRoom`, entao a
  // distancia minima real ate a parede e sempre esta).
  const WALL_MARGIN = 0.3;
  const FLOOR_MARGIN = 0.15;
  const CEILING_MARGIN = 0.55;

  // Desvio MAXIMO do passeio em cada eixo, em metros (ver o item 1 do
  // comentario no topo). Pequeno de proposito: poeira suspensa vagueia
  // num palmo de ar, nao atravessa o comodo.
  const WANDER = [0.24, 0.18, 0.24];

  // Periodos (em segundos) do passeio, sorteados nesta faixa por
  // particula e por eixo.
  const PERIOD_MIN = 13;
  const PERIOD_MAX = 34;

  // Expoente da distribuicao em altura: 1 = uniforme ate o teto,
  // maior = mais concentrado na faixa do chao/altura dos olhos.
  const HEIGHT_BIAS = 1.6;

  // ---------- Aparencia ----------
  // Cinza levemente amarelado, opaco. E a cor de poeira "fisica": quem
  // decide o brilho final e a luz do comodo, nao esta cor.
  const DUST_COLOR = 0xb9b2a4;

  // Tamanho em PIXELS do buffer interno (320x180). `PIXEL_SCALE` e o
  // tamanho a 1 metro; a partir dai cai com a distancia. O clamp e o
  // que garante "sempre pequeno": no maximo ~2 pixels crus.
  const PIXEL_SCALE = 2.15;
  const SIZE_MIN = 1.0;
  const SIZE_MAX = 2.4;

  // Fade de perto: apaga por completo abaixo de ~0.19 e entra inteira
  // a partir de 0.55 metro da camera.
  const NEAR_FADE = 0.55;

  // Degraus de alpha (banda grosseira, estetica PSX).
  const ALPHA_STEPS = 8;

  // Freio na intensidade das PointLights do jogo antes de ela virar
  // brilho de poeira. As luminarias vao a 1.1 e o abajur a 1.6 (ver
  // models/lamp-factory.js e models/table-lamp-factory.js); sem isto a
  // poeira estouraria em branco embaixo delas.
  const LIGHT_GAIN = 0.55;

  // Ganho da luz AMBIENTE da cena. Ela e escurissima de proposito
  // (0x141018 a 0.35, ver scripts/main.js), entao por si so quase nao
  // acende poeira - quem sustenta a visibilidade no breu e o `minLit`
  // da paleta abaixo.
  const AMBIENT_GAIN = 1.0;

  // ---------- Paletas (noite / dia) ----------
  // `opacity` e o alpha maximo de uma particula em plena luz;
  // `minLit`  e o piso de visibilidade no escuro total;
  // `litGain` e quanto a luz do comodo soma em cima desse piso.
  //
  // De dia o piso sobe (entra claridade por todo canto) e o ganho cai:
  // com o cenario claro, poeira "acesa" demais viraria chuvisco na
  // tela. De noite e o contrario - piso baixo, para os comodos sem luz
  // ficarem apenas insinuados, e ganho alto, para a poeira aparecer de
  // verdade no cone das luminarias.
  const NIGHT = Object.freeze({ opacity: 0.6, minLit: 0.26, litGain: 0.8 });
  const DAY = Object.freeze({ opacity: 0.5, minLit: 0.42, litGain: 0.5 });

  // Nevoa da noite (ver scripts/atmosphere.js), usada so como valor
  // inicial enquanto ninguem passou uma `scene.fog` para `create`.
  const FOG_FALLBACK = { near: 2.5, far: 13 };

  // Limite de `fog.near` acima do qual a cena esta de DIA (a paleta da
  // noite fecha em 2.5, a do dia abre em 7 - ver scripts/atmosphere.js).
  // E assim que a poeira descobre que amanheceu sem ninguem avisar.
  const DAY_FOG_NEAR = 5;

  // ---------- Ritmos de atualizacao ----------
  // Quais luzes servem cada comodo muda pouco (acender/apagar um
  // abajur, o dia nascer), entao a ESCOLHA e revista a cada 0.4 s e a
  // varredura completa da casa em busca de luzes novas a cada 3 s. A
  // INTENSIDADE das luzes escolhidas, essa sim, e lida todo quadro: e
  // o que faz a poeira oscilar junto com as luminarias.
  const LIGHT_REFRESH = 0.4;
  const LIGHT_RESCAN = 3.0;

  // Margem alem do alcance da nevoa para desligar o comodo por
  // completo. Dentro da nevoa a poeira ja esta com alpha zero, entao
  // isto nao corta nada visivel.
  const CULL_MARGIN = 2.0;

  // ---------- Sorteio deterministico ----------
  // Mesma receita ja usada pela vegetacao e pela neblina: a poeira de
  // cada comodo e sorteada a partir do NOME dele, entao o layout e
  // identico em toda partida e em todo aparelho.
  function hashSeed(text) {
    let h = 2166136261;
    const str = String(text || "poeira");
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
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

  // ---------- Shaders ----------
  const MOTE_VERTEX = [
    "#define MAX_LIGHTS " + MAX_LIGHTS,
    "",
    "uniform float uTime;",
    "uniform vec3 uWander;",
    "uniform float uPixelScale;",
    "uniform vec2 uSizeClamp;",
    "uniform float uOpacity;",
    "uniform float uMinLit;",
    "uniform float uLitGain;",
    "uniform vec3 uDustColor;",
    "uniform vec3 uAmbient;",
    "uniform vec3 uLightColor[MAX_LIGHTS];",
    "uniform vec3 uLightPos[MAX_LIGHTS];",
    "uniform float uLightRange[MAX_LIGHTS];",
    "uniform vec2 uFogRange;",
    "uniform float uNearFade;",
    "",
    // Fases (uma por eixo), frequencias (uma por eixo), tamanho e
    // brilho proprios de cada particula: e o que impede o enxame de se
    // mexer em bloco.
    "attribute vec3 aSeed;",
    "attribute vec3 aFreq;",
    "attribute float aScale;",
    "attribute float aBright;",
    "",
    "varying float vAlpha;",
    "varying vec3 vTint;",
    "",
    "void main() {",
    "  vec3 t = uTime * aFreq;",
    "",
    // Tres senoides por eixo, com frequencias nao multiplas entre si.
    // Os pesos somam 1.0 em cada linha: o desvio nunca passa de
    // uWander, que e o que mantem a poeira dentro do comodo.
    "  vec3 drift;",
    "  drift.x = sin(t.x + aSeed.x) * 0.60",
    "          + sin(t.x * 0.41 + aSeed.y) * 0.28",
    "          + sin(t.x * 1.73 + aSeed.z) * 0.12;",
    "  drift.y = sin(t.y * 0.70 + aSeed.y) * 0.58",
    "          + sin(t.y * 0.27 + aSeed.z) * 0.30",
    "          + sin(t.y * 1.31 + aSeed.x) * 0.12;",
    "  drift.z = sin(t.z * 0.83 + aSeed.z) * 0.60",
    "          + sin(t.z * 0.37 + aSeed.x) * 0.28",
    "          + sin(t.z * 1.57 + aSeed.y) * 0.12;",
    "",
    "  vec3 local = position + drift * uWander;",
    "  vec4 worldPos = modelMatrix * vec4(local, 1.0);",
    "  vec4 mvPosition = viewMatrix * worldPos;",
    "  float depth = max(-mvPosition.z, 0.001);",
    "",
    // Luz que existe NESTE ponto do ar: ambiente + as PointLights do
    // comodo, com queda quadratica por distancia (mesma leitura da
    // `distance`/`decay` das luzes do jogo).
    "  vec3 lit = uAmbient;",
    "  for (int i = 0; i < MAX_LIGHTS; i++) {",
    "    float dist = length(uLightPos[i] - worldPos.xyz);",
    "    float att = max(0.0, 1.0 - dist / max(uLightRange[i], 0.001));",
    "    lit += uLightColor[i] * att * att;",
    "  }",
    "",
    // A particula e cinza; a luz do ambiente e que a tinge (ambar das
    // luminarias, frio da manha). No breu ela fica na propria cor.
    "  float energy = max(max(lit.r, lit.g), lit.b);",
    "  vec3 lightHue = lit / max(energy, 0.001);",
    "  vTint = uDustColor * mix(vec3(1.0), lightHue, clamp(energy * 1.6, 0.0, 1.0));",
    "",
    "  float visible = clamp(uMinLit + energy * uLitGain, 0.0, 1.0);",
    // Nevoa a mao: a poeira DESAPARECE na distancia em vez de ser
    // pintada com a cor da nevoa (ver item 6 no topo do arquivo).
    "  float fogFade = 1.0 - smoothstep(uFogRange.x, uFogRange.y, depth);",
    "  float nearFade = smoothstep(uNearFade * 0.35, uNearFade, depth);",
    "",
    "  vAlpha = uOpacity * aBright * visible * fogFade * nearFade;",
    "",
    "  gl_Position = projectionMatrix * mvPosition;",
    // Sempre pequeno: 1 a ~2 pixels do buffer interno de 320x180.
    "  gl_PointSize = clamp(uPixelScale * aScale / depth, uSizeClamp.x, uSizeClamp.y);",
    "}",
  ].join("\n");

  const MOTE_FRAGMENT = [
    "uniform float uSteps;",
    "",
    "varying float vAlpha;",
    "varying vec3 vTint;",
    "",
    "void main() {",
    // Recorte redondo sem textura: num ponto de 1-2 pixels um sprite
    // nao teria como aparecer.
    "  float mask = 1.0 - smoothstep(0.22, 0.5, length(gl_PointCoord - 0.5));",
    "  float a = vAlpha * mask;",
    "  if (a < 0.01) discard;",
    // Banda grosseira de alpha: a poeira acende em degraus, como o
    // resto da imagem do jogo, em vez de num degrade liso e moderno.
    "  a = floor(a * uSteps + 0.5) / uSteps;",
    "  if (a <= 0.0) discard;",
    "  gl_FragColor = vec4(vTint, a);",
    "}",
  ].join("\n");

  /**
   * Volume de particulas de UM comodo. `bounds` e o retangulo que a
   * zona ocupa no MUNDO ({minX,maxX,minZ,maxZ}, ver
   * scripts/house-world.js) e `height` e o pe-direito.
   *
   * Devolve null quando o comodo e pequeno demais para caber o volume
   * com as margens de parede - assim um comodo estreito no futuro
   * simplesmente nao recebe poeira, em vez de recebe-la atravessando as
   * paredes.
   */
  function buildRoom(key, bounds, height, palette) {
    // Margem de parede + o desvio maximo do passeio: e isto que
    // garante, por construcao, que nenhuma particula alcanca o plano de
    // uma parede (ver item 5 no topo do arquivo).
    const minX = bounds.minX + WALL_MARGIN + WANDER[0];
    const maxX = bounds.maxX - WALL_MARGIN - WANDER[0];
    const minZ = bounds.minZ + WALL_MARGIN + WANDER[2];
    const maxZ = bounds.maxZ - WALL_MARGIN - WANDER[2];
    const minY = FLOOR_MARGIN + WANDER[1];
    const maxY = height - CEILING_MARGIN - WANDER[1];

    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;
    const spanY = maxY - minY;
    if (spanX <= 0 || spanZ <= 0 || spanY <= 0) {
      return null;
    }

    const rng = mulberry32(hashSeed("poeira:" + key));

    const count = Math.max(
      MIN_COUNT,
      Math.min(MAX_COUNT, Math.round(spanX * spanZ * DENSITY))
    );

    // ---------- Amostragem estratificada ----------
    // Uma grade proporcional ao formato do comodo (o corredor e longo,
    // entao ganha muito mais celulas em Z que em X), embaralhada, com
    // uma particula por celula e jitter dentro dela. Espalha de forma
    // natural, sem grumos e sem alinhamento visivel.
    const cols = Math.max(1, Math.round(Math.sqrt((count * spanX) / spanZ)));
    const rows = Math.max(1, Math.ceil(count / cols));
    const cells = [];
    for (let c = 0; c < cols * rows; c++) {
      cells.push(c);
    }
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const swap = cells[i];
      cells[i] = cells[j];
      cells[j] = swap;
    }

    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    const freqs = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const brights = new Float32Array(count);

    const TWO_PI = Math.PI * 2;

    for (let i = 0; i < count; i++) {
      const cell = cells[i];
      const cx = cell % cols;
      const cz = Math.floor(cell / cols);

      positions[i * 3] = minX + ((cx + rng()) / cols) * spanX;
      // Enviesado para baixo: e na faixa dos olhos (1.6) que o jogador
      // olha, nao no teto (4.2).
      positions[i * 3 + 1] = minY + Math.pow(rng(), HEIGHT_BIAS) * spanY;
      positions[i * 3 + 2] = minZ + ((cz + rng()) / rows) * spanZ;

      seeds[i * 3] = rng() * TWO_PI;
      seeds[i * 3 + 1] = rng() * TWO_PI;
      seeds[i * 3 + 2] = rng() * TWO_PI;

      for (let axis = 0; axis < 3; axis++) {
        const period = PERIOD_MIN + rng() * (PERIOD_MAX - PERIOD_MIN);
        freqs[i * 3 + axis] = TWO_PI / period;
      }

      scales[i] = 0.7 + rng() * 0.6;
      // Poeira real nao e toda do mesmo tamanho nem reflete tudo igual:
      // sem esta variacao, um punhado de pontos identicos le como grade
      // de pixels acesos.
      brights[i] = 0.45 + rng() * 0.55;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    geometry.setAttribute("aFreq", new THREE.BufferAttribute(freqs, 3));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute("aBright", new THREE.BufferAttribute(brights, 1));

    // O passeio acontece no shader, entao o three.js nao tem como saber
    // que a nuvem e um pouco maior que as posicoes base. Sem esta folga
    // na esfera de recorte, as particulas da borda poderiam sumir junto
    // com o objeto inteiro num angulo de camera raso.
    geometry.computeBoundingSphere();
    if (geometry.boundingSphere) {
      geometry.boundingSphere.radius += Math.max(WANDER[0], WANDER[1], WANDER[2]);
    }

    const lightColors = [];
    const lightPositions = [];
    const lightRanges = [];
    for (let i = 0; i < MAX_LIGHTS; i++) {
      lightColors.push(new THREE.Vector3(0, 0, 0));
      lightPositions.push(new THREE.Vector3(0, 0, 0));
      lightRanges.push(1);
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWander: { value: new THREE.Vector3(WANDER[0], WANDER[1], WANDER[2]) },
        uPixelScale: { value: PIXEL_SCALE },
        uSizeClamp: { value: new THREE.Vector2(SIZE_MIN, SIZE_MAX) },
        uOpacity: { value: palette.opacity },
        uMinLit: { value: palette.minLit },
        uLitGain: { value: palette.litGain },
        uDustColor: { value: new THREE.Color(DUST_COLOR) },
        uAmbient: { value: new THREE.Vector3(0, 0, 0) },
        uLightColor: { value: lightColors },
        uLightPos: { value: lightPositions },
        uLightRange: { value: lightRanges },
        uFogRange: {
          value: new THREE.Vector2(FOG_FALLBACK.near, FOG_FALLBACK.far),
        },
        uNearFade: { value: NEAR_FADE },
        uSteps: { value: ALPHA_STEPS },
      },
      vertexShader: MOTE_VERTEX,
      fragmentShader: MOTE_FRAGMENT,
      transparent: true,
      // COM teste de profundidade (parede, porta fechada e mobilia
      // ocultam a poeira) e SEM escrita nela (as particulas nao se
      // recortam entre si nem contra a neblina). Mesma escolha da
      // neblina do exterior, ver models/fog-volume-factory.js.
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      fog: false, // a mistura com a scene.fog e feita a mao no shader
    });

    const points = new THREE.Points(geometry, material);
    points.name = "poeira-" + key;
    // As particulas nunca se movem DENTRO do objeto (quem as move e o
    // shader), entao nao ha por que o three.js recalcular a matriz dele
    // a cada quadro - mesma otimizacao da grama e da floresta.
    points.matrixAutoUpdate = false;
    points.updateMatrix();
    // A poeira nao e cenario editavel: o Editor deve ignora-la na
    // selecao por toque, como ja ignora os helpers dele (ver
    // editor/editor-mode.js).
    points.userData.__editorHelper = true;

    return {
      key: key,
      bounds: bounds,
      points: points,
      material: material,
      uniforms: material.uniforms,
      // Altura de referencia do comodo: usada so para ranquear as luzes
      // (ver `refreshRoomLights`).
      centerY: height / 2,
      // Luzes que servem este comodo: { light, x, y, z } - a posicao e
      // recalculada nas revisoes raras, nao a cada quadro (as luzes da
      // casa nao andam).
      lights: [],
    };
  }

  // Distancia de um ponto ate o retangulo (0 se estiver dentro dele).
  function distanceToBounds(bounds, x, z) {
    const dx = Math.max(bounds.minX - x, 0, x - bounds.maxX);
    const dz = Math.max(bounds.minZ - z, 0, z - bounds.maxZ);
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Cria a poeira da casa inteira.
   *
   *   zones        - as zonas montadas (ver scripts/house-world.js).
   *                  Cada uma precisa de `key` e `bounds` (mundo).
   *   parent       - onde pendurar a poeira (o worldRoot da casa).
   *   height       - pe-direito dos ambientes.
   *   fog          - a `scene.fog` do jogo. Lida a cada quadro, entao a
   *                  poeira acompanha noite/dia sozinha, sem ninguem
   *                  precisar avisa-la (nem a sequencia de dormir, nem
   *                  o controle de horario do Editor).
   *   ambientLight - a AmbientLight da cena, lida por quadro.
   *   lightRoot    - subarvore onde procurar as PointLights do jogo.
   */
  function create(options) {
    const opts = options || {};
    const height = typeof opts.height === "number" ? opts.height : 4.2;
    const fog = opts.fog || null;
    const ambientLight = opts.ambientLight || null;
    const lightRoot = opts.lightRoot || opts.parent || null;

    const root = new THREE.Group();
    root.name = "poeira-da-casa";
    root.userData.__editorHelper = true;

    let morning = !!(fog && fog.near > DAY_FOG_NEAR);
    let palette = morning ? DAY : NIGHT;

    const rooms = [];
    (opts.zones || []).forEach(function (zone) {
      if (!zone || !zone.bounds || !zone.key) {
        return;
      }
      const room = buildRoom(zone.key, zone.bounds, height, palette);
      if (room) {
        rooms.push(room);
        root.add(room.points);
      }
    });

    if (opts.parent) {
      opts.parent.add(root);
    }

    // Objetos criados uma vez e reescritos sempre: nada de lixo por
    // quadro.
    const tmpVec = new THREE.Vector3();
    // Um ponto qualquer DENTRO do comodo, para perguntar a
    // materials/light-zones.js se uma luz vale aqui. Reaproveitado a cada
    // consulta: refreshRoomLights roda raro, mas nao gera lixo nenhum.
    const tmpRoomPoint = new THREE.Vector3();
    const worldLights = [];
    let rescanTimer = 0;
    let refreshTimer = 0;
    let enabled = true;

    function applyPalette() {
      for (let i = 0; i < rooms.length; i++) {
        const u = rooms[i].uniforms;
        u.uOpacity.value = palette.opacity;
        u.uMinLit.value = palette.minLit;
        u.uLitGain.value = palette.litGain;
      }
    }

    // Todas as PointLights vivas da casa. Varredura rara (ver
    // LIGHT_RESCAN): pega tanto as luzes criadas no boot quanto
    // qualquer uma que apareca depois (modelo .glb carregado tarde, luz
    // criada pelo Editor).
    function rescanLights() {
      worldLights.length = 0;
      if (!lightRoot) {
        return;
      }
      lightRoot.traverse(function (node) {
        if (node.isPointLight) {
          worldLights.push(node);
        }
      });
    }

    // Quais luzes servem cada comodo: as mais proximas dele, com
    // preferencia para as que estao ACESAS neste momento (uma luz
    // apagada nao contribui em nada, entao ocupar uma das 4 vagas com
    // ela seria desperdicio - e o caso da luz da manha enquanto ainda e
    // noite e do abajur desligado).
    function refreshRoomLights() {
      for (let r = 0; r < rooms.length; r++) {
        const room = rooms[r];
        const ranked = [];

        for (let i = 0; i < worldLights.length; i++) {
          const light = worldLights[i];
          light.getWorldPosition(tmpVec);
          const range = light.distance > 0 ? light.distance : 12;
          const flat = distanceToBounds(room.bounds, tmpVec.x, tmpVec.z);
          const dy = tmpVec.y - room.centerY;
          const dist = Math.sqrt(flat * flat + dy * dy);
          // Fora de alcance: nao ilumina uma unica particula deste
          // comodo, nem no ponto mais proximo dele.
          if (dist > range) {
            continue;
          }
          // ZONA DE LUZ: a luminaria de outro comodo nao acende a poeira
          // deste, do mesmo jeito que ela deixou de acender as paredes dele
          // (ver materials/light-zones.js). Sem isto, a poeira do corredor
          // continuaria brilhando com a luz da varanda depois da correcao -
          // ela e a unica luz do jogo somada na CPU e nao no shader.
          tmpRoomPoint.set(
            (room.bounds.minX + room.bounds.maxX) / 2,
            room.centerY,
            (room.bounds.minZ + room.bounds.maxZ) / 2
          );
          if (
            window.LightZones &&
            window.LightZones.maskAt(tmpVec, tmpRoomPoint) === 0
          ) {
            continue;
          }
          ranked.push({
            light: light,
            x: tmpVec.x,
            y: tmpVec.y,
            z: tmpVec.z,
            score: dist + (light.intensity > 0.001 ? 0 : 1000),
          });
        }

        ranked.sort(function (a, b) {
          return a.score - b.score;
        });

        room.lights.length = 0;
        for (let i = 0; i < ranked.length && i < MAX_LIGHTS; i++) {
          const entry = ranked[i];
          room.lights.push({
            light: entry.light,
            x: entry.x,
            y: entry.y,
            z: entry.z,
          });
        }
      }
    }

    rescanLights();
    refreshRoomLights();

    /**
     * Um quadro. `delta` alimenta so as duas manutencoes raras das
     * luzes; `elapsed` e o relogio do jogo (THREE.Clock), unico
     * responsavel pelo movimento; `viewPos` e a posicao de quem olha
     * (jogador ou camera livre do Editor), usada apenas para desligar
     * comodos distantes.
     */
    function update(delta, elapsed, viewPos) {
      if (!enabled || rooms.length === 0) {
        return;
      }

      // ---------- Manutencao das luzes ----------
      rescanTimer -= delta || 0;
      refreshTimer -= delta || 0;
      if (rescanTimer <= 0) {
        rescanTimer = LIGHT_RESCAN;
        rescanLights();
        refreshTimer = 0;
      }
      if (refreshTimer <= 0) {
        refreshTimer = LIGHT_REFRESH;
        refreshRoomLights();
      }

      // ---------- Noite <-> dia ----------
      // Sem ninguem avisar: a poeira le a nevoa em vigor, que e a dona
      // do horario (ver scripts/atmosphere.js).
      const fogNear = fog ? fog.near : FOG_FALLBACK.near;
      const fogFar = fog ? fog.far : FOG_FALLBACK.far;
      const isMorning = fogNear > DAY_FOG_NEAR;
      if (isMorning !== morning) {
        morning = isMorning;
        palette = morning ? DAY : NIGHT;
        applyPalette();
      }

      const cullDistance = fogFar + CULL_MARGIN;
      const viewX = viewPos ? viewPos.x : 0;
      const viewZ = viewPos ? viewPos.z : 0;

      // Luz ambiente da cena (a mesma para todos os comodos).
      let ambR = 0;
      let ambG = 0;
      let ambB = 0;
      if (ambientLight) {
        const intensity = ambientLight.intensity * AMBIENT_GAIN;
        ambR = ambientLight.color.r * intensity;
        ambG = ambientLight.color.g * intensity;
        ambB = ambientLight.color.b * intensity;
      }

      for (let r = 0; r < rooms.length; r++) {
        const room = rooms[r];

        // Comodo alem do alcance da nevoa: a poeira dele ja estaria com
        // alpha zero, entao sai da fila de desenho por completo.
        if (distanceToBounds(room.bounds, viewX, viewZ) > cullDistance) {
          room.points.visible = false;
          continue;
        }
        room.points.visible = true;

        const u = room.uniforms;
        u.uTime.value = elapsed;
        u.uAmbient.value.set(ambR, ambG, ambB);
        u.uFogRange.value.set(fogNear, fogFar);

        // Intensidade viva das luzes escolhidas: e isto que faz a poeira
        // oscilar junto com as luminarias do corredor e apagar junto com
        // o abajur do quarto.
        for (let i = 0; i < MAX_LIGHTS; i++) {
          const entry = room.lights[i];
          if (!entry) {
            u.uLightColor.value[i].set(0, 0, 0);
            u.uLightRange.value[i] = 1;
            continue;
          }
          const light = entry.light;
          u.uLightPos.value[i].set(entry.x, entry.y, entry.z);
          u.uLightRange.value[i] = light.distance > 0 ? light.distance : 12;
          const gain = light.intensity * LIGHT_GAIN;
          u.uLightColor.value[i].set(
            light.color.r * gain,
            light.color.g * gain,
            light.color.b * gain
          );
        }
      }
    }

    // Liga/desliga o efeito inteiro (um interruptor so, caso um dia ele
    // vire opcao de desempenho na tela de Configuracoes).
    function setEnabled(value) {
      enabled = value !== false;
      root.visible = enabled;
    }

    function isEnabled() {
      return enabled;
    }

    function dispose() {
      for (let i = 0; i < rooms.length; i++) {
        root.remove(rooms[i].points);
        rooms[i].points.geometry.dispose();
        rooms[i].material.dispose();
      }
      rooms.length = 0;
      if (root.parent) {
        root.parent.remove(root);
      }
    }

    return {
      root: root,
      rooms: rooms,
      update: update,
      setEnabled: setEnabled,
      isEnabled: isEnabled,
      dispose: dispose,
    };
  }

  return {
    MAX_LIGHTS: MAX_LIGHTS,
    NIGHT: NIGHT,
    DAY: DAY,
    create: create,
  };
})();
