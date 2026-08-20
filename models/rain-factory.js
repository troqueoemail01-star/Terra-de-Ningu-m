/**
 * models/rain-factory.js
 * -------------------------------------------------
 * A CHUVA da vista externa do jogo, vista atraves do vidro das tres
 * janelas (as duas do corredor + a de "MEU QUARTO" - ver
 * models/window-factory.js) e do vao da porta ENTRADA & SAIDA. Quinta
 * camada da vista externa, empilhada nas quatro que ja existiam, sem
 * substituir nem alterar nenhuma delas:
 *
 *   models/exterior-factory.js .... o terreno (plano texturizado)
 *   models/grass-field-factory.js . os tufos de grama em cima dele
 *   models/tree-forest-factory.js . a mata que fecha o horizonte
 *   models/fog-volume-factory.js .. a neblina que ocupa o ar entre tudo
 *   models/rain-factory.js ........ a chuva caindo por dentro de tudo  <=
 *
 * Chove de DIA e de NOITE, sempre, sem parar: o pedido foi esse. O que
 * muda de um horario para o outro e so a paleta (ver PALETTES abaixo e
 * `setDaytime`), pelo MESMO contrato do chao, do gramado, da mata e da
 * neblina - a cena chama `setDaytime()` e a chuva amanhece junto com o
 * resto do terreno.
 *
 * =========================================================
 *  DE ONDE VEIO (o tutorial pedido)
 * =========================================================
 * Base: "Three.js Realistic Rain Effect Tutorial" (Red Stapler,
 * https://redstapler.co/three-js-realistic-rain-tutorial/). O que foi
 * aproveitado dele, que e a ideia central e continua valendo:
 *
 *   - UM UNICO OBJETO para a chuva inteira, com muitos vertices, em vez
 *     de um objeto 3D por gota. Uma draw call por volume de chuva.
 *   - Cada gota tem VELOCIDADE PROPRIA e, ao passar do chao, VOLTA para
 *     o topo (o reciclo infinito de gotas do tutorial).
 *   - A chuva le como cortina de agua por acumulo de gotas pequenas,
 *     nao por gota detalhada.
 *
 * O que teve de mudar, e por que (nao e liberdade poetica: o tutorial
 * nao roda como esta, neste projeto):
 *
 *  1. THREE.Geometry NAO EXISTE MAIS. O tutorial usa
 *     `new THREE.Geometry()` + `rainGeo.vertices.push(...)` +
 *     `verticesNeedUpdate`. Essa classe foi REMOVIDA do three.js na
 *     r125, e este jogo roda na r128 (ver o <script> em index.html).
 *     Copiar aquele codigo daria "THREE.Geometry is not a constructor"
 *     na primeira linha. Aqui e THREE.BufferGeometry, como todo o resto
 *     do projeto.
 *
 *  2. O LACO DE JAVASCRIPT POR GOTA POR QUADRO SAIU. No tutorial, cada
 *     quadro percorre as 15.000 gotas no CPU (`forEach` somando
 *     velocidade e reescrevendo y) e reenvia o buffer inteiro para a
 *     GPU. Isso e o oposto de tudo o que este projeto faz: a poeira dos
 *     comodos (effects/dust-motes.js), a grama (grass-field-factory),
 *     as nuvens antigas e a neblina volumetrica animam INTEIRAS no
 *     vertex shader, a partir de um `uTime`. O motivo e o alvo: celular,
 *     a 320x180 (ver scripts/main.js). Aqui a queda e:
 *
 *         caido = mod(fase * uSpan + uTime * velocidade, uSpan)
 *
 *     Uma linha no vertex shader. O reciclo do tutorial ("se y < -200,
 *     volta pro topo") esta dentro do `mod`, de graca e sem `if`. Custo
 *     por quadro do lado da CPU: escrever UM float por volume de chuva.
 *     Nenhum buffer e reenviado nunca.
 *
 *  3. GOTA E RISCO, NAO PONTO. O tutorial usa THREE.Points com
 *     PointsMaterial - quadradinhos sempre alinhados a tela. Chuva de
 *     verdade nao e ponto: e um RISCO na direcao da queda (o rastro que
 *     a gota deixa no tempo de exposicao do olho/da camera). Aqui cada
 *     gota e um quadrado de dois triangulos que o vertex shader
 *     ESTICA na direcao da queda projetada na tela (ver "O RISCO"
 *     abaixo). E o que faz a chuva parecer chuva, e nao neve.
 *
 *  4. AS NUVENS DO TUTORIAL NAO ENTRARAM, de proposito. Aquele trecho
 *     monta 25 planos com um PNG de fumaca para fazer o teto de nuvem.
 *     Este jogo ja tem um ceu fechado de verdade, procedural e no
 *     infinito, feito no proprio shader do ceu (ver models/sky-factory.js
 *     - o "teto de nuvem"). Empilhar 25 cartoes de fumaca por cima
 *     seria um SEGUNDO sistema de nuvem, com paralaxe errada (planos a
 *     poucas centenas de unidades, dentro do alcance de corte da camera)
 *     e sem passar pela quantizacao/dithering PSX do resto do jogo. E
 *     precisaria de um arquivo de imagem novo - aqui nada e baixado.
 *
 *  5. O RELAMPAGO do tutorial (um PointLight azul piscando) tambem nao
 *     entrou: o pedido desta rodada foi CHUVA. O gancho para os
 *     relampagos continua existindo no jogo, onde sempre esteve
 *     (`stopStorm` em models/window-factory.js), sem nenhuma mudanca.
 *
 * =========================================================
 *  ONDE A CHUVA EXISTE (e por que ela nao molha o corredor)
 * =========================================================
 * Um volume de chuva por FACHADA, exatamente como a neblina: mesma
 * ancora das outras camadas da vista externa (origem no pe da parede,
 * +Z local apontando para FORA da casa, Y = 0 no chao). Dessa convencao
 * sai a garantia mais importante deste arquivo: com NEAR_EDGE = 0.35, a
 * gota mais proxima nasce 35 cm ADIANTE da fachada. Nao existe um unico
 * vertice de chuva dentro da casa - nao por teste de colisao, por
 * geometria. A parede solida com o vao recortado (ver
 * models/exterior-factory.js) faz o resto: a chuva so aparece atraves do
 * vidro da janela e pela porta aberta.
 *
 * Nao e filtro de tela, nao e um plano colado na camera e nao e um
 * "efeito de chuva" por cima do quadro - os tres apareceriam DENTRO da
 * casa, que e o erro classico. E geometria de verdade plantada no mundo,
 * entrando no teste de profundidade com a grama, com os troncos e com a
 * neblina: a gota passa NA FRENTE de uma arvore e ATRAS da seguinte.
 *
 * E os COMODOS/A VARANDA que ficam do lado de fora da parede? Mesma
 * solucao da neblina e da mata: `options.exclusions`, a lista de
 * retangulos que a cena ja calcula (ver `exclusionsFor` em
 * scenes/corridor-scene.js). Gota nenhuma e SORTEADA dentro deles -
 * entao nao chove dentro da COZINHA, nem do BANHEIRO, nem debaixo da
 * cobertura da varanda (que tem telhado). Nada e removido depois nem
 * testado por quadro: a gota simplesmente nunca chega a existir ali.
 *
 * =========================================================
 *  O RISCO (o billboard esticado)
 * =========================================================
 * Cada gota e um quad de 4 vertices. O vertex shader:
 *
 *   1. calcula a posicao dela no mundo (queda + inclinacao do vento);
 *   2. leva a DIRECAO DA QUEDA para o espaco da camera e projeta na
 *      tela - isso da o eixo do risco, `along`;
 *   3. estica o quad ao longo de `along` (comprimento) e o engrossa em
 *      `across`, que e `along` girado 90 graus (largura).
 *
 * Dois detalhes que separam "risco de chuva" de "tracinho torto":
 *
 *   - LARGURA E COMPRIMENTO MINIMOS EM PIXELS. A tela interna do jogo
 *     tem 180 pixels de altura. Uma gota de 2 cm a 15 metros da menos de
 *     um decimo de pixel: sumiria, e a chuva ficaria so no primeiro
 *     metro. O shader converte pixels em metros na profundidade daquela
 *     gota (`uPixel`, ver PIXEL_PER_UNIT abaixo) e garante um minimo -
 *     entao a chuva longe continua sendo um risco visivel de 1 pixel de
 *     largura, como em qualquer jogo de PS1.
 *
 *   - CHUVA VINDO NA DIRECAO DO OLHAR. Se o jogador olhar para cima, a
 *     direcao da queda projetada na tela encurta (no limite, a gota vem
 *     na direcao do olho e o risco seria um ponto). O shader encurta o
 *     comprimento junto (`max(lenXY, 0.25)`), senao o quad esticaria num
 *     eixo qualquer e a chuva viraria um leque de riscos aleatorios.
 *
 * =========================================================
 *  VENTO E RAJADA
 * =========================================================
 * A inclinacao nao vem do tempo, vem de QUANTO a gota ja caiu:
 * `xz += drift * caido`. Duas consequencias boas: a inclinacao do risco
 * e sempre coerente com o rastro (a gota anda na diagonal exata em que
 * o risco aponta) e o deslocamento lateral e LIMITADO (drift * uSpan),
 * entao a coluna de chuva nunca escapa do volume nem exige wrap
 * lateral. A rajada e um seno lento por cima disso: a chuva inteira se
 * inclina um pouco mais e um pouco menos, devagar, como vento de
 * verdade. O vetor de deriva aponta para o MESMO lado do vento da
 * neblina (ver WIND em models/fog-volume-factory.js) - agua e bruma
 * empurradas pela mesma massa de ar, que e o que costura os dois numa
 * so leitura de "esta chovendo la fora".
 *
 * =========================================================
 *  ESTETICA PSX
 * =========================================================
 * Cor e transparencia passam pelo mesmo acabamento do resto do jogo:
 * quantizacao em poucos niveis + dithering ordenado 4x4 (Bayer), a mesma
 * matriz do ceu, das janelas e da neblina. A transparencia quantizada em
 * poucos degraus e o que da o "chuvisco" cru de PS1 em vez de um
 * gradiente de alpha liso e moderno - e, de tabela, faz a chuva
 * cintilar, que e exatamente o que chuva faz.
 *
 * A chuva NAO participa da `scene.fog` do three.js (`fog: false`): ela
 * faz a propria conta, com os MESMOS numeros da paleta em vigor (ver
 * scripts/atmosphere.js). Assim as gotas se dissolvem na bruma em vez de
 * serem pintadas por cima dela - e, de noite, com a nevoa fechando 100%
 * a 13 metros, a chuva simplesmente acaba onde a escuridao acaba, sem
 * uma unica gota aparecendo "por cima do breu".
 *
 * window.RainFactory.createRain({ seed, exclusions, count })
 *   -> { group, update(delta, elapsed), setDaytime, setMorning, dispose }
 * -------------------------------------------------
 */

window.RainFactory = (function () {
  "use strict";

  // =========================================================
  //  Espaco ocupado pela chuva (metros, espaco LOCAL do grupo:
  //  origem no pe da parede, +Z para fora da casa, Y = 0 no chao)
  // =========================================================

  // Meia-largura da coluna de chuva. A neblina usa
  // ExteriorFactory.GROUND_SIZE / 2 - 4 = 26; a chuva nao precisa de
  // tanto: o que esta a mais de 20 metros de LADO da janela so aparece
  // se o jogador estiver colado no vidro olhando na diagonal, e nessa
  // hora a bruma ja fechou. 20 gasta gota onde ela e vista.
  const LATERAL_HALF = 20;

  // Onde a coluna comeca e termina ao longo do +Z local. NEAR_EDGE e a
  // garantia geometrica de que nao chove dentro da casa (ver o bloco
  // dedicado no topo): a gota mais proxima nasce 35 cm adiante da
  // fachada, e a inclinacao do vento so a joga para MAIS longe.
  // FAR_EDGE fica alem do ponto em que a nevoa de dia (fogFar = 28) ja
  // comeu tudo, entao a borda externa nunca chega a ser vista.
  const NEAR_EDGE = 0.35;
  const FAR_EDGE = 24;

  // Altura do topo da coluna, em metros. A casa tem ~2.6 m de pe
  // direito e o telhado passa dos 4 (ver models/roof-factory.js): 13 m
  // deixa chuva bem acima da linha do telhado, entao olhando para cima
  // pela janela sempre existe agua vindo de algum lugar la de cima.
  const TOP = 13;

  // Esmaecimentos de borda (metros) - nenhuma aresta reta do volume
  // pode aparecer na tela. A da frente e curtinha (a chuva colada na
  // fachada e justamente a que se quer ver); as outras duas somem bem
  // antes do fim do chao externo.
  const NEAR_FADE = 0.45;
  const FAR_FADE = 6.0;
  const SIDE_FADE = 6.0;

  // Quantas gotas por volume. Cada gota = 4 vertices e 2 triangulos,
  // entao 2600 gotas = 5.200 triangulos numa draw call. Para comparar:
  // a mata de UMA janela passa de 20 mil. As nuvens que sairam nesta
  // atualizacao (models/cloud-factory.js) custavam sozinhas quase
  // metade disso, e nao se moviam de verdade. Os volumes fora da vista
  // ainda saem de graca pelo frustum culling (a esfera de contorno e
  // escrita na mao la embaixo).
  const COUNT = 2600;

  // Distribuicao em profundidade: `pow(aleatorio, DEPTH_BIAS)` puxa as
  // gotas para PERTO da fachada. Chuva uniforme em 24 metros gastaria a
  // maioria das gotas onde elas tem menos de um pixel e a bruma ja
  // apagou. 1.7 concentra ~60% da agua nos 8 metros que a janela
  // realmente mostra, sem deixar o fundo vazio.
  const DEPTH_BIAS = 1.7;

  // Velocidade de queda, em metros por segundo. Chuva de verdade cai
  // entre 4 e 9 m/s (gota de 1 a 4 mm). A faixa larga e o que mais
  // ajuda a leitura: se todas cairem na mesma velocidade, o olho pega o
  // padrao na hora e a chuva vira "cortina de listras".
  const SPEED_MIN = 6.5;
  const SPEED_MAX = 11.0;

  // Comprimento do risco, em metros (o rastro da gota). Na pratica quem
  // manda de perto e este numero e, de longe, o minimo em pixels
  // (MIN_LENGTH_PX) - ver "O RISCO" no topo.
  const LENGTH_MIN = 0.22;
  const LENGTH_MAX = 0.46;

  // Largura do risco em metros: 1,8 cm. Mais grosso que uma gota real,
  // porque na tela ele quase sempre cai no minimo de pixel abaixo.
  const WIDTH = 0.018;

  // Minimos em PIXELS da tela interna (320x180): abaixo disso a chuva
  // sumiria na distancia (ver "O RISCO" no topo). 0.85 de largura
  // mantem o risco fino, do jeito PSX, sem ele piscar fora da grade de
  // pixels; 2.6 de comprimento garante que a gota longe continue sendo
  // um TRACO, e nao um ponto.
  const MIN_WIDTH_PX = 0.85;
  const MIN_LENGTH_PX = 2.6;

  // Quantos metros mede UM pixel da tela interna, por metro de
  // distancia da camera. Sai direto da camera do jogo (ver
  // scripts/main.js): campo de visao vertical de 68 graus e 180 pixels
  // de altura de buffer.
  //
  //   2 * tan(68/2) / 180 = 0.007494
  //
  // Fica escrito aqui, e nao pedido a camera, para a fabrica nao
  // depender de nada externo - e da para sobrepor por `options.pixel`
  // se um dia a resolucao interna ou o FOV mudarem.
  const PIXEL_PER_UNIT = (2 * Math.tan((68 * Math.PI) / 360)) / 180;

  // Deriva do vento: quantos metros a gota anda de lado por metro
  // CAIDO (ver "VENTO E RAJADA" no topo). (0.16, 0.03) da uma chuva
  // inclinada ~9 graus, apontando para o mesmo lado do vento da
  // neblina (WIND em models/fog-volume-factory.js). Chuva perfeitamente
  // vertical parece chuva de desenho animado; inclinada demais parece
  // temporal de furacao.
  const DRIFT = [0.16, 0.03];

  // Rajada: quanto a inclinacao acima varia (fracao) e a que ritmo
  // (rad/s). 2*pi/0.055 =~ 114 segundos por ciclo - lento o bastante
  // para o jogador nunca ver o padrao, so sentir que o vento muda.
  const GUST = 0.28;
  const GUST_RATE = 0.055;

  // =========================================================
  //  As duas paletas da chuva
  // =========================================================
  // A agua nao tem cor propria: ela mostra a cor do que esta em volta.
  // Por isso as duas paletas saem da mesma familia de cinzas da
  // atmosfera (ver scripts/atmosphere.js) e do ceu nublado (ver
  // models/sky-factory.js) - nunca branco puro, que salta como faisca de
  // solda na tela de 320x180.
  const PALETTES = Object.freeze({
    DAY: Object.freeze({
      // De dia o risco e mais claro que a mata e um pouco mais claro
      // que o ceu: e assim que se ve chuva contra um dia encoberto.
      color: 0xb3bcc4,
      headColor: 0xd2d9dd,
      opacity: 0.5,
    }),
    NIGHT: Object.freeze({
      // De noite nao existe uma unica fonte de luz la fora (ver
      // scripts/main.js): a chuva nao pode brilhar, senao parece
      // fosforescente - o mesmo cuidado que a neblina noturna tomou. Ela
      // fica um passo acima do breu, o suficiente para o movimento ser
      // percebido, e a nevoa de 13 metros faz o recorte.
      color: 0x6f7b88,
      headColor: 0x8b97a2,
      opacity: 0.42,
    }),
  });

  // Niveis de quantizacao (ver "ESTETICA PSX" no topo). A cor segue o
  // padrao do projeto; a transparencia usa poucos degraus de proposito.
  const DITHER_LEVELS = 28;
  const ALPHA_LEVELS = 5;

  // Matriz de Bayer 4x4 - mesma tabela e mesmo motivo do resto do
  // projeto (ver models/sky-factory.js / models/window-factory.js):
  // indice dinamico em array constante e territorio de driver duvidoso
  // em WebGL 1 / GLSL ES 1.0, sobretudo em GPU de celular.
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
  // Vertex shader: a queda, a inclinacao e o risco
  // ---------------------------------------------------------------------
  // precision highp: `uTime` cresce durante a partida inteira e entra
  // multiplicado pela velocidade (11 m/s x meia hora = 19 km) antes do
  // `mod`. Em mediump a parte fracionaria se perderia e a chuva
  // comecaria a cair em degraus depois de alguns minutos - o mesmo
  // motivo documentado em models/fog-volume-factory.js.
  const VERTEX_SHADER = [
    "precision highp float;",
    // aCorner.x: -0.5 a 0.5 (largura do risco).
    // aCorner.y:  0 na CABECA da gota, 1 na ponta da cauda.
    "attribute vec2 aCorner;",
    // aDrop.x: velocidade (m/s). aDrop.y: comprimento (m).
    // aDrop.z: fase 0-1 (onde a gota esta na queda no instante zero).
    "attribute vec3 aDrop;",
    "uniform float uTime;",
    "uniform float uTop;",
    "uniform float uSpan;",
    "uniform float uWidth;",
    "uniform float uMinWidthPx;",
    "uniform float uMinLengthPx;",
    "uniform float uPixel;",
    "uniform vec2 uDrift;",
    "uniform float uGust;",
    "uniform float uGustRate;",
    "uniform float uNear;",
    "uniform float uNearFade;",
    "uniform float uFar;",
    "uniform float uFarFade;",
    "uniform float uSideHalf;",
    "uniform float uSideFade;",
    "uniform float uFogNear;",
    "uniform float uFogFar;",
    "varying float vFade;",
    "varying float vMist;",
    "varying vec2 vUv;",
    "void main() {",
    // ---- Rajada: a chuva inteira se inclina mais e menos, devagar. A
    // fase depende do X da gota, entao a rajada ATRAVESSA a vista em vez
    // de a coluna toda respirar junto.
    "  float gust = 1.0 + sin(uTime * uGustRate + position.x * 0.045) * uGust;",
    "  vec2 drift = uDrift * gust;",
    // ---- A queda + o reciclo, numa linha (ver o item 2 no topo) ----
    "  float fallen = mod(aDrop.z * uSpan + uTime * aDrop.x, uSpan);",
    "  vec3 p = vec3(",
    "    position.x + drift.x * fallen,",
    "    uTop - fallen,",
    "    position.z + drift.y * fallen",
    "  );",
    // ---- Esmaecimento das bordas do volume ----
    "  float fade = smoothstep(uNear, uNear + uNearFade, p.z);",
    "  fade *= 1.0 - smoothstep(uFar - uFarFade, uFar, p.z);",
    "  fade *= 1.0 - smoothstep(uSideHalf - uSideFade, uSideHalf, abs(p.x));",
    // ---- O risco: billboard esticado na direcao da queda ----
    "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
    "  vec3 fallDir = normalize(vec3(drift.x, -1.0, drift.y));",
    "  vec3 axis = (modelViewMatrix * vec4(fallDir, 0.0)).xyz;",
    "  vec2 along = axis.xy;",
    "  float lenXY = length(along);",
    "  along = lenXY > 0.0001 ? along / lenXY : vec2(0.0, -1.0);",
    "  vec2 across = vec2(-along.y, along.x);",
    "  float dist = max(-mv.z, 0.001);",
    "  float pixel = dist * uPixel;",
    "  float w = max(uWidth, uMinWidthPx * pixel);",
    // Chuva vindo quase na direcao do olhar encurta junto (ver o topo).
    "  float len = max(aDrop.y, uMinLengthPx * pixel) * max(lenXY, 0.25);",
    // A cauda fica ATRAS da gota, ou seja, contra a direcao da queda.
    "  mv.xy += across * (aCorner.x * w) - along * (aCorner.y * len);",
    // ---- Nevoa feita na mao (ver "ESTETICA PSX" no topo) ----
    "  vMist = smoothstep(uFogNear, uFogFar, dist);",
    "  vFade = fade * (1.0 - vMist);",
    "  vUv = vec2(aCorner.x + 0.5, aCorner.y);",
    "  gl_Position = projectionMatrix * mv;",
    "}",
  ].join("\n");

  // ---------------------------------------------------------------------
  // Fragment shader: o perfil do risco + acabamento PSX
  // ---------------------------------------------------------------------
  const FRAGMENT_SHADER = [
    "precision highp float;",
    "uniform vec3 uColor;",
    "uniform vec3 uHeadColor;",
    "uniform vec3 uFogColor;",
    "uniform float uOpacity;",
    "uniform float uLevels;",
    "uniform float uAlphaLevels;",
    "varying float vFade;",
    "varying float vMist;",
    "varying vec2 vUv;",
    BAYER_GLSL,
    "void main() {",
    // Perfil na LARGURA: cheio no meio, zero nas duas beiradas. E o que
    // impede o risco de virar uma fita retangular de borda dura.
    "  float across = vUv.x * 2.0 - 1.0;",
    "  float body = 1.0 - across * across;",
    // Perfil no COMPRIMENTO: a cabeca concentra a agua e a cauda se
    // dissolve, como o rastro de uma gota de verdade.
    "  float taper = mix(1.0, 0.12, vUv.y);",
    "  float a = vFade * uOpacity * body * taper;",
    "  float d = psxBayer(gl_FragCoord.xy);",
    "  a = floor(a * uAlphaLevels + d + 0.5) / uAlphaLevels;",
    "  if (a <= 0.0) discard;",
    "  vec3 c = mix(uColor, uHeadColor, 1.0 - vUv.y);",
    // Longe, a gota assume a cor da bruma antes de desaparecer nela.
    "  c = mix(c, uFogColor, vMist * 0.75);",
    "  c = floor(c * uLevels + d + 0.5) / uLevels;",
    "  gl_FragColor = vec4(c, a);",
    "}",
  ].join("\n");

  // =========================================================
  //  Sorteio (a mesma semente da janela = sempre a mesma chuva)
  // =========================================================
  function hashSeed(seed) {
    let h = 2166136261;
    const s = String(seed === undefined ? "chuva" : seed);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
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

  function randRange(rng, min, max) {
    return min + (max - min) * rng();
  }

  /**
   * A gota chega a passar por dentro de um dos retangulos proibidos
   * (comodos externos, varanda coberta...) em ALGUM ponto da queda?
   *
   * Testa quatro pontos ao longo do caminho, e nao so o de partida,
   * porque a inclinacao do vento move a gota alguns metros de lado do
   * topo ao chao: uma gota que nasce fora da COZINHA pode acabar
   * caindo dentro dela. Testar o caminho inteiro sai de graca (e uma
   * vez, na criacao) e evita a alternativa feia, que seria engordar os
   * retangulos e abrir uma faixa seca em volta de cada comodo.
   */
  function pathBlocked(x, z, exclusions) {
    if (!exclusions || !exclusions.length) {
      return false;
    }
    for (let s = 0; s < 4; s++) {
      const fallen = (s / 3) * TOP;
      const px = x + DRIFT[0] * (1 + GUST) * fallen;
      const pz = z + DRIFT[1] * (1 + GUST) * fallen;
      for (let e = 0; e < exclusions.length; e++) {
        const rect = exclusions[e];
        if (px > rect.minX && px < rect.maxX && pz > rect.minZ && pz < rect.maxZ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * A malha da chuva: `count` quads soltos num unico BufferGeometry.
   * Quatro vertices por gota, todos com a MESMA posicao de origem (o
   * ponto de nascimento no chao-espaco local) e o MESMO aDrop; quem os
   * separa em quadrado e o aCorner, la no vertex shader. Nenhum atributo
   * e reescrito depois - o buffer sobe uma vez para a GPU e fica.
   */
  function buildGeometry(rng, exclusions, count) {
    const positions = new Float32Array(count * 4 * 3);
    const corners = new Float32Array(count * 4 * 2);
    const drops = new Float32Array(count * 4 * 3);
    const indices = new Uint16Array(count * 6);

    const CORNER = [
      [-0.5, 0],
      [0.5, 0],
      [0.5, 1],
      [-0.5, 1],
    ];

    let written = 0;

    for (let i = 0; i < count; i++) {
      // Ate 8 tentativas de achar um lugar livre; se todas cairem em
      // area proibida, esta gota simplesmente nao existe (com os
      // retangulos reais do jogo isso quase nunca acontece, e uma gota a
      // menos em 2600 nao muda nada).
      let x = 0;
      let z = 0;
      let ok = false;
      for (let tries = 0; tries < 8; tries++) {
        x = randRange(rng, -LATERAL_HALF, LATERAL_HALF);
        // Ver DEPTH_BIAS: mais gota perto da fachada, que e o que a
        // janela mostra.
        z = NEAR_EDGE + (FAR_EDGE - NEAR_EDGE) * Math.pow(rng(), DEPTH_BIAS);
        if (!pathBlocked(x, z, exclusions)) {
          ok = true;
          break;
        }
      }
      if (!ok) {
        continue;
      }

      const speed = randRange(rng, SPEED_MIN, SPEED_MAX);
      const length = randRange(rng, LENGTH_MIN, LENGTH_MAX);
      const phase = rng();

      const base = written * 4;
      for (let v = 0; v < 4; v++) {
        const idx = base + v;
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = z;
        corners[idx * 2] = CORNER[v][0];
        corners[idx * 2 + 1] = CORNER[v][1];
        drops[idx * 3] = speed;
        drops[idx * 3 + 1] = length;
        drops[idx * 3 + 2] = phase;
      }

      const tri = written * 6;
      indices[tri] = base;
      indices[tri + 1] = base + 1;
      indices[tri + 2] = base + 2;
      indices[tri + 3] = base;
      indices[tri + 4] = base + 2;
      indices[tri + 5] = base + 3;

      written++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions.subarray(0, written * 4 * 3), 3)
    );
    geometry.setAttribute(
      "aCorner",
      new THREE.BufferAttribute(corners.subarray(0, written * 4 * 2), 2)
    );
    geometry.setAttribute(
      "aDrop",
      new THREE.BufferAttribute(drops.subarray(0, written * 4 * 3), 3)
    );
    geometry.setIndex(new THREE.BufferAttribute(indices.subarray(0, written * 6), 1));

    // Esfera de contorno escrita na mao: os vertices nascem TODOS na
    // altura 0 (quem os espalha pela coluna e o shader), entao a caixa
    // calculada pelo three.js seria um plano rasteiro e o volume
    // desapareceria por frustum culling na hora em que o jogador
    // olhasse para cima. Envolve a coluna inteira, com folga para o
    // comprimento do risco.
    const halfDepth = (FAR_EDGE - NEAR_EDGE) / 2;
    geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, TOP / 2, NEAR_EDGE + halfDepth),
      Math.sqrt(LATERAL_HALF * LATERAL_HALF + halfDepth * halfDepth + (TOP / 2) * (TOP / 2)) + 2
    );

    return { geometry: geometry, dropCount: written };
  }

  /**
   * A paleta em vigor: as cores da AGUA saem de PALETTES (deste
   * arquivo) e os numeros da NEVOA de scripts/atmosphere.js, dono unico
   * da atmosfera - exatamente o mesmo arranjo de
   * models/fog-volume-factory.js. Se a paleta de dia/noite do jogo
   * mudar, a chuva acompanha sozinha.
   */
  function palette(isMorning, fogOverride) {
    const local = isMorning ? PALETTES.DAY : PALETTES.NIGHT;
    // `fogOverride` e a UNICA porta de saida deste arranjo, e existe por
    // causa da cutscene de abertura (ver cutscenes/road-cutscene.js): a
    // estrada nao esta dentro da atmosfera da casa, ela tem a nevoa de fim
    // de tarde dela. Sem override nada muda - a chuva das janelas continua
    // lendo scripts/atmosphere.js, dono unico da atmosfera.
    const source = fogOverride
      ? fogOverride
      : isMorning
      ? window.Atmosphere.DAY
      : window.Atmosphere.NIGHT;
    return {
      color: new THREE.Color(local.color),
      headColor: new THREE.Color(local.headColor),
      opacity: local.opacity,
      fogColor: new THREE.Color(source.fogColor),
      fogNear: source.fogNear,
      fogFar: source.fogFar,
    };
  }

  /**
   * options.seed       : semente (o id da janela, como as outras camadas).
   * options.exclusions : retangulos {minX,maxX,minZ,maxZ} no espaco LOCAL
   *                      onde nao pode chover (comodos externos, varanda
   *                      coberta) - ver `exclusionsFor` nas cenas.
   * options.count      : numero de gotas (padrao COUNT).
   * options.daytime    : comeca de dia? Padrao false (o jogo comeca de
   *                      noite, ver scripts/main.js). Nos DOIS casos
   *                      chove - muda so a paleta.
   * options.fog        : { fogColor, fogNear, fogFar } - troca a NEVOA que
   *                      a chuva faz na mao (ver "ESTETICA PSX" no topo)
   *                      por outra. So a cutscene de abertura usa isto,
   *                      porque a estrada tem atmosfera propria (ver
   *                      cutscenes/road-cutscene.js); dentro da casa a
   *                      opcao nao e passada e a chuva continua obedecendo
   *                      scripts/atmosphere.js, como sempre.
   */
  function createRain(options) {
    const opts = options || {};
    const group = new THREE.Group();
    const rng = mulberry32(hashSeed(opts.seed));

    const built = buildGeometry(
      rng,
      opts.exclusions,
      Math.max(1, opts.count || COUNT)
    );

    let morning = opts.daytime === true;
    const fogOverride = opts.fog || null;
    const pal = palette(morning, fogOverride);

    const uniforms = {
      uTime: { value: 0 },
      uTop: { value: TOP },
      uSpan: { value: TOP },
      uWidth: { value: WIDTH },
      uMinWidthPx: { value: MIN_WIDTH_PX },
      uMinLengthPx: { value: MIN_LENGTH_PX },
      uPixel: { value: opts.pixel || PIXEL_PER_UNIT },
      uDrift: { value: new THREE.Vector2(DRIFT[0], DRIFT[1]) },
      uGust: { value: GUST },
      uGustRate: { value: GUST_RATE },
      uNear: { value: NEAR_EDGE },
      uNearFade: { value: NEAR_FADE },
      uFar: { value: FAR_EDGE },
      uFarFade: { value: FAR_FADE },
      uSideHalf: { value: LATERAL_HALF },
      uSideFade: { value: SIDE_FADE },
      uFogNear: { value: pal.fogNear },
      uFogFar: { value: pal.fogFar },
      uColor: { value: pal.color },
      uHeadColor: { value: pal.headColor },
      uFogColor: { value: pal.fogColor },
      uOpacity: { value: pal.opacity },
      uLevels: { value: DITHER_LEVELS },
      uAlphaLevels: { value: ALPHA_LEVELS },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      // Testa profundidade (a gota fica atras do tronco, na frente do
      // seguinte) mas NAO escreve: milhares de riscos transparentes
      // escrevendo profundidade recortariam buracos uns nos outros e na
      // neblina.
      depthTest: true,
      depthWrite: false,
      // Os quads sao virados para a tela pelo vertex shader, mas a
      // rotacao do risco pode invertar o sentido da face: DoubleSide
      // evita gota sumindo por winding.
      side: THREE.DoubleSide,
      // A nevoa e feita na mao aqui dentro (ver o topo).
      fog: false,
    });

    const mesh = new THREE.Mesh(built.geometry, material);
    mesh.name = "Chuva";
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    // O grupo nunca se move depois de a cena posiciona-lo.
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    group.add(mesh);

    // Todo o custo por quadro: UM float. A queda, a inclinacao, a
    // rajada e o risco acontecem no vertex shader, a partir do tempo
    // ABSOLUTO do jogo - entao um engasgo de quadro nao faz a chuva
    // saltar, e `delta` e ignorado de proposito.
    function update(delta, elapsed) {
      uniforms.uTime.value =
        typeof elapsed === "number" ? elapsed : uniforms.uTime.value + (delta || 0);
    }

    /**
     * Mesmo contrato do chao externo, do gramado, da mata e da neblina:
     * a cena chama isto de dentro do proprio setDaytime() dela. A chuva
     * NAO liga nem desliga aqui - ela existe nos dois horarios, foi o
     * pedido. O que troca e a paleta, instantaneamente e sem nada
     * recriado (a virada da historia acontece com a tela preta, ver
     * cutscenes/sleep-sequence.js; o Editor usa os dois sentidos, ver
     * editor/editor-ui.js).
     */
    function setDaytime(daytime) {
      const wanted = daytime !== false;
      if (morning === wanted) {
        return;
      }
      morning = wanted;
      const now = palette(morning, fogOverride);
      uniforms.uColor.value.copy(now.color);
      uniforms.uHeadColor.value.copy(now.headColor);
      uniforms.uFogColor.value.copy(now.fogColor);
      uniforms.uFogNear.value = now.fogNear;
      uniforms.uFogFar.value = now.fogFar;
      uniforms.uOpacity.value = now.opacity;
    }

    function setMorning() {
      setDaytime(true);
    }

    function dispose() {
      built.geometry.dispose();
      material.dispose();
    }

    return {
      group: group,
      update: update,
      setDaytime: setDaytime,
      setMorning: setMorning,
      dispose: dispose,
      dropCount: built.dropCount,
    };
  }

  return {
    LATERAL_HALF: LATERAL_HALF,
    NEAR_EDGE: NEAR_EDGE,
    FAR_EDGE: FAR_EDGE,
    TOP: TOP,
    COUNT: COUNT,
    PALETTES: PALETTES,
    createRain: createRain,
  };
})();
