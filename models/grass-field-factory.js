/**
 * models/grass-field-factory.js
 * -------------------------------------------------
 * O GRAMADO ALTO DO TERRENO EXTERNO - a grama que cobre TODO o chao de
 * grama visto atraves do vidro das tres janelas do jogo (as duas do
 * corredor + a de MEU QUARTO, ver models/window-factory.js).
 *
 * ---------- O que mudou nesta atualizacao ----------
 * MEXEU SO NA GRAMA. Nenhum outro sistema do jogo mudou; nas cenas
 * entrou UMA linha por gramado, so para repassar o quadro (ver Vento).
 *
 * 1. A LAMINA DEIXOU DE SER UM ESPINHO. Antes cada lamina era uma tira
 *    RETA de 1 ou 2 quads que afinava direto da base para a ponta e so
 *    se inclinava para fora. Um punhado de tiras retas saindo do mesmo
 *    ponto le exatamente como o problema relatado: espinhos cravados no
 *    chao. Agora a lamina e um ARCO de verdade, construido por
 *    comprimento de arco (ver buildBlade): sai VERTICAL da base, vai
 *    virando progressivamente e a ponta tomba, como capim de terreno
 *    abandonado. Curva, nao dobra.
 * 2. PERFIL DE FOLHA, NAO DE AGULHA. A largura segue taper(): a lamina
 *    mantem quase toda a largura no primeiro terco e so afina de
 *    verdade perto da ponta, terminando em bico.
 * 3. TORCAO. Cada lamina gira em torno do proprio eixo ao subir (ver
 *    spec.twist). Nao custa um triangulo a mais e mata o aspecto de
 *    papelao chapado: a tira fica de perfil num ponto e volta a mostrar
 *    a face noutro, entao a silhueta deixa de ser um losango perfeito.
 * 4. BASE PREENCHIDA. Alem das laminas altas, cada moita de perto e de
 *    medio ganhou laminas CURTAS, largas, muito tombadas e mais escuras
 *    (spec.fillers). Sao elas que cobrem a linha em que a grama encontra
 *    o chao - a que denunciava tufo plantado no piso - e que dao volume
 *    a base da moita por 1 quad cada.
 * 5. VENTO. Todo o gramado balanca junto, em ondas que atravessam o
 *    terreno (ver o bloco Vento abaixo). Brisa leve, nao tempestade.
 *
 * Custo medido por janela: 1732 moitas, ~48 mil triangulos de dia e
 * ~29 mil de noite (antes: ~1800 moitas, ~38 mil e ~26 mil). Os draw
 * calls sao os MESMOS: 7 de dia, 3 de noite. Praticamente a mesma
 * quantidade de grama e o mesmo numero de chamadas de desenho por ~25%
 * mais triangulo - e o gramado importado do .glb custava ~73 mil.
 *
 * ---------- Por que grama em codigo, e nao o tufo do .glb ----------
 * Aritmetica de jogo mobile, nao gosto: cobrir o terreno com o tufo de
 * assets/models/grass_psx.glb (1392 triangulos) exigiria ~1800
 * instancias por janela = ~2,5 MILHOES de triangulos por janela. O
 * arquivo segue na pasta assets/models, apenas sem uso.
 *
 * ---------- Desempenho ----------
 *  1. THREE.InstancedMesh, como antes: cada par (anel de distancia x
 *     variante de moita) e UMA malha instanciada. 7 draw calls por
 *     janela de dia, 3 de noite, independente de quantas moitas existam.
 *  2. Nada de textura: as laminas usam COR POR VERTICE (escura na base,
 *     mais clara na ponta, tom sorteado por lamina e as duas bordas
 *     levemente diferentes uma da outra, o que finge o rolo da folha).
 *  3. Tres niveis de moita por distancia: perto, 6 arcos de 3 segmentos
 *     + 4 laminas de base; medio, 5 arcos de 2 segmentos + 2 de base;
 *     longe, 5 laminas de 1 segmento, mais largas e mais abertas. Curva
 *     e torcao existem so onde o olho alcanca.
 *  4. Geometria e materiais sao criados UMA vez (nivel de modulo) e
 *     compartilhados pelas tres janelas; cada campo so tem a sua lista
 *     de matrizes de instancia. As matrizes NUNCA mudam depois de
 *     montadas (matrixAutoUpdate desligado, como antes): o vento e 100%
 *     no shader, o custo por quadro na CPU e uma soma de float.
 *  5. Os dois aneis mais distantes nascem invisiveis e so aparecem de
 *     dia. De noite a nevoa fecha 100% preta a 13 unidades
 *     (Atmosphere.NIGHT em scripts/atmosphere.js) e a unica luz que
 *     poderia vazar para fora e a luminaria do corredor: alem de ~8
 *     unidades da fachada, qualquer moita e um pixel preto igual ao
 *     fundo.
 *
 * ---------- Vento ----------
 * A brisa e uma deformacao de VERTICE injetada por onBeforeCompile no
 * mesmo ponto (#include <project_vertex>) e com a mesma tecnica que o
 * resto do jogo ja usa para o tremor PSX (ver applyPSXVertexSnap em
 * models/floor-plant-factory.js e models/book-factory.js). Cinco
 * decisoes que importam:
 *
 *  1. DEPOIS da instanceMatrix. O deslocamento e calculado no espaco do
 *     CAMPO, nao no da moita: como cada instancia tem rotacao Y
 *     sorteada, dobrar no espaco local faria cada moita pender para um
 *     lado diferente - um redemoinho, nao uma brisa. Aplicado depois da
 *     instanceMatrix, o vento tem UMA direcao para o gramado inteiro
 *     (WIND_DIR, quase paralela a parede, atravessando o campo de visao
 *     de quem olha pela janela).
 *  2. A BASE NAO SE MEXE. O empurrao e proporcional a (altura do
 *     vertice / altura da moita)^2: zero no pe da lamina, maximo na
 *     ponta. A grama nao desliza no chao, ela verga. E como a altura da
 *     instancia e lida da propria instanceMatrix, uma moita alta e uma
 *     baixa vergam na mesma PROPORCAO, cada uma na sua escala.
 *  3. ONDA VIAJANTE. A fase soma a posicao no terreno, entao as moitas
 *     vizinhas nao balancam em uniformidade de pelotao: as rajadas
 *     atravessam o gramado a ~1,3 m/s. Por cima disso ha um envelope de
 *     rajada bem mais lento, que faz o vento respirar em vez de bater
 *     sempre com a mesma forca.
 *  4. UM RELOGIO SO, ALIMENTADO PELO JOGO. O tempo vem do loop da cena
 *     (frameUpdaters -> update(delta), ver scenes/corridor-scene.js e
 *     scenes/room-scene.js), nao de um requestAnimationFrame proprio:
 *     assim o gramado congela junto com o resto do jogo quando o loop
 *     para. O relogio e UNICO e compartilhado pelos campos das tres
 *     janelas; chamar update varias vezes no MESMO quadro nao acelera o
 *     vento (ver advanceWind), e o delta e limitado a 50 ms para a grama
 *     nao dar um salto ao voltar de segundo plano. O relogio da a volta
 *     em WIND_PERIOD, um valor escolhido para ser periodo exato das tres
 *     frequencias usadas: a volta e invisivel e o float do uniform nunca
 *     cresce o suficiente para perder precisao.
 *  5. NENHUMA GARANTIA FOI PERDIDA. O empurrao maximo do vento entra na
 *     conta de onde pode nascer grama (windReach em buildPlacements),
 *     junto com o alcance medido na geometria: nem no pico da rajada uma
 *     lamina invade a parede, a estrada de terra ou um comodo.
 *
 * ---------- Cobertura: grama em todo o chao verde ----------
 * A distribuicao e uma grade chacoalhada (jittered grid) em tres aneis
 * concentricos ao redor do ponto da janela, com rotacao livre em Y,
 * altura sorteada e largura sorteada por moita. O passo da grade e
 * MENOR que a copa de uma moita em todos os aneis (ver RINGS), entao as
 * moitas se sobrepoem de proposito: nao existe celula vazia que leia
 * como chao pelado. O sorteio usa um PRNG com semente fixa por janela
 * (mulberry32), nao Math.random: o gramado fica IDENTICO a cada vez que
 * a cena e remontada e diferente entre as tres janelas.
 *
 * O anel de perto comeca em 0: a grama vai ate onde a geometria permite
 * chegar sem furar a casa, ou seja, a faixa colada na parede tambem
 * fica coberta.
 *
 * ---------- Onde NAO pode nascer grama ----------
 * Tres regras duras, todas garantidas pela propria matematica do
 * sorteio - nada e removido depois nem testado por quadro. Todas usam o
 * ALCANCE REAL da moita (medido nos vertices da geometria construida,
 * nao chutado) multiplicado pela altura e pela largura sorteadas da
 * propria instancia, MAIS o empurrao maximo do vento:
 *
 *  1. DENTRO DA CASA. O grupo devolvido por createGrassField e ancorado
 *     NA PAREDE, com o eixo +Z local apontando para FORA (quem posiciona
 *     e gira e a cena, exatamente como ja faz com o chao de
 *     ExteriorFactory.createGroundPlane). No espaco local, dentro da
 *     casa e simplesmente z <= 0, e nenhuma instancia e aceita sem que
 *
 *         z >= alcance_da_moita + empurrao_do_vento + WALL_SAFETY
 *
 *     Nem o centro nem a lamina mais comprida de qualquer moita alcanca
 *     o plano da parede. Nao existe uma instancia com z negativo para
 *     comecar - por isso nao ha grama no corredor, em MEU QUARTO, nem
 *     atravessando parede, porta ou piso.
 *  2. DENTRO DOS COMODOS NOVOS E DA VARANDA. options.exclusions traz
 *     retangulos do espaco LOCAL do campo (as pegadas da COZINHA, do
 *     BANHEIRO, de QUARTO 01, de QUARTO 02 e a da varanda + as faixas do
 *     muro das alas, ver scenes/side-room-scene.js,
 *     models/porch-factory.js e o bloco Comodos novos x vista externa de
 *     scenes/corridor-scene.js). Embaixo da casa quem aparece e o chao
 *     de grama solido de sempre (ExteriorFactory.createUnderHouseGround),
 *     sem uma lamina em cima.
 *  3. NA ESTRADA DE TERRA. Quando a cena passa options.path (a janela da
 *     porta ENTRADA & SAIDA, ver models/dirt-path-factory.js), nenhuma
 *     moita e sorteada dentro do desenho da pista mais a folga acima.
 *
 * ---------- Noite e dia ----------
 * A MESMA geometria serve para os dois periodos; a troca e so de
 * material, no mesmo instante e pelo mesmo caminho do chao externo
 * (setMorning, ver models/exterior-factory.js e o bloco Vista externa
 * (grama) das cenas). Os dois materiais recebem o MESMO vento, pelos
 * mesmos uniforms compartilhados: virar o dia nao muda o balanco.
 *
 *   - Noite: MeshStandardMaterial, roughness 1, SEM mapa emissivo -
 *     reage a iluminacao da cena como qualquer outro objeto e, como do
 *     lado de fora so chega a luz ambiente (0x141018 a 0.35, ver
 *     scripts/main.js), escurece junto com o resto da noite. Grama
 *     nenhuma brilha no escuro.
 *   - Dia: MeshBasicMaterial, exatamente como o chao de grama faz
 *     (materials.grassDay em materials/material-library.js) - e
 *     obrigatorio acompanhar a escolha do chao: se as laminas usassem um
 *     material iluminado enquanto o terreno embaixo usa um material
 *     chapado, a vegetacao apareceria preta em cima de um gramado claro.
 *     A nevoa continua ligada (fog: true), entao a distancia continua se
 *     desfazendo na bruma.
 * -------------------------------------------------
 */

window.GrassFieldFactory = (function () {
  const TAU = Math.PI * 2;
  const UP = new THREE.Vector3(0, 1, 0);

  // ---------- Altura ----------
  // A altura pedida: uma grama que cubra ate os joelhos do personagem.
  // A camera do jogador vive em eyeHeight = 1.6 (ver
  // scenes/corridor-config.js), o que da um personagem de ~1.72 m e,
  // portanto, um joelho a ~0.46 m do chao. E esse o numero base do anel
  // de perto (ver RINGS); a variacao de altura de cada moita corre em
  // volta dele, para o gramado nao ficar aparado como campo de futebol.
  const KNEE_HEIGHT = 0.46;

  // Folga minima, em metros, entre a lamina mais comprida de qualquer
  // moita (ja no pico da rajada) e o plano da parede (z = 0 no espaco
  // local do campo). Soma-se a ela o proprio ExteriorFactory.WALL_GAP
  // com que a cena afasta o campo da parede. Pequena porque o alcance
  // real da moita e o empurrao do vento ja sao medidos e ja entram na
  // conta - esta e so a margem de seguranca contra o wobble de vertice
  // do shader PSX das paredes, que trabalha em centimetros.
  const WALL_SAFETY = 0.12;

  // Quanto a base da moita afunda no chao externo (y = 0). Sem isso, a
  // linha em que as laminas nascem fica coplanar com o plano do chao e
  // pode piscar (z-fighting); afundando 3 cm, a moita tambem senta
  // melhor no terreno em vez de parecer apoiada. Menos que o
  // ExteriorFactory.UNDER_HOUSE_DROP (4 cm) de proposito: mesmo a base
  // afundada continua ACIMA do chao que passa por baixo da casa.
  const GROUND_SINK = 0.03;

  // Limite lateral: o chao externo de cada janela e um quadrado de
  // ExteriorFactory.GROUND_SIZE (60) centrado nela, ou seja, so existe
  // terreno ate 30 unidades para cada lado. Este limite mantem toda
  // moita confortavelmente dentro dele - uma moita alem da borda ficaria
  // plantada no vazio (ainda que a nevoa ja a esconda muito antes).
  const LATERAL_LIMIT = window.ExteriorFactory.GROUND_SIZE / 2 - 2.5;

  // Folga EXTRA entre a borda da estrada de terra (ver
  // models/dirt-path-factory.js) e a moita mais proxima, em metros, ja
  // somada ao alcance real da moita e ao empurrao do vento. Minuscula de
  // proposito: sao justamente as moitas da beirada que quebram
  // opticamente a emenda entre a terra e a grama.
  const PATH_CLEARANCE = 0.05;

  // ---------- Vento (ver o bloco Vento no topo) ----------
  // Direcao da brisa no espaco LOCAL do campo, ja normalizada. Quase
  // toda em X (paralela a parede da janela) com um pingo de Z: e a
  // direcao que atravessa o campo de visao de quem olha pelo vidro, a
  // unica em que o balanco realmente se le. Vento vindo de frente ou de
  // costas so encurta a grama na tela.
  const WIND_DIR_X = 0.94;
  const WIND_DIR_Z = 0.34;

  // Empurrao maximo da PONTA, em fracao da altura da moita. 0.1 = a
  // ponta de uma moita de 46 cm anda no maximo ~4,6 cm para cada lado,
  // ou seja ~11 graus de inclinacao no pico da rajada. Brisa leve, era o
  // pedido; a partir de ~0.25 comeca a virar vendaval de tempestade.
  const WIND_STRENGTH = 0.1;

  // Pico teorico de |sway| no shader: sin() (1.0) + a ondulacao rapida
  // de amplitude 0.3. E o numero que transforma WIND_STRENGTH no
  // empurrao MAXIMO possivel, que por sua vez entra nas travas de onde
  // pode nascer grama (windReach em buildPlacements). Se as constantes
  // do shader mudarem, este numero muda com elas.
  const WIND_PEAK = 1.3;

  // Alcance extra, em fracao da altura da moita, que o vento pode
  // acrescentar ao raio da moita. E somado ao alcance medido na
  // geometria em TODAS as travas de posicionamento.
  const WIND_REACH = WIND_STRENGTH * WIND_PEAK;

  // Frequencias do shader. As tres sao multiplos exatos de WIND_BASE_W,
  // e por isso o relogio pode dar a volta em WIND_PERIOD sem nenhum
  // salto visivel: no instante da volta as tres estao exatamente na fase
  // em que comecaram.
  //   WIND_SWAY_W  - balanco principal (3 x a base).
  //   WIND_GUST_W  - envelope de rajada, o vento respirando (1 x a base).
  //   3.0          - ondulacao rapida por cima do balanco, dentro do
  //                  shader (multiplica a fase do balanco, logo 9 x).
  const WIND_BASE_W = 0.4;
  const WIND_SWAY_W = WIND_BASE_W * 3;
  const WIND_GUST_W = WIND_BASE_W;
  const WIND_PERIOD = TAU / WIND_BASE_W;

  // Uniforms COMPARTILHADOS pelos materiais de dia e de noite e pelos
  // campos das tres janelas: um objeto so, uma escrita por quadro.
  const windUniforms = {
    uWindTime: { value: 0 },
    uWindStrength: { value: WIND_STRENGTH },
  };

  // Relogio da brisa. Ver o item 4 do bloco Vento no topo: quem o
  // empurra e o loop da cena, e chamar duas vezes no mesmo quadro (uma
  // por gramado) NAO acelera o vento.
  let windClock = 0;
  let windFrameMark = -1;

  function advanceWind(delta, elapsed) {
    // `elapsed` e o mesmo numero para todos os campos dentro de um
    // quadro (vem do THREE.Clock de scripts/main.js): serve de
    // impressao digital do quadro. Sem ele (chamada avulsa), avanca
    // normalmente.
    if (typeof elapsed === 'number') {
      if (elapsed === windFrameMark) {
        return;
      }
      windFrameMark = elapsed;
    }
    // Teto de 50 ms: voltando de segundo plano, a grama continua de onde
    // parou em vez de dar um salto.
    const step =
      typeof delta === 'number' && delta > 0 ? Math.min(delta, 0.05) : 0;
    windClock += step;
    if (windClock >= WIND_PERIOD) {
      windClock -= WIND_PERIOD;
    }
    windUniforms.uWindTime.value = windClock;
  }

  // Injeta a brisa num material. Mesmo ponto de enxerto (project_vertex)
  // e mesmo estilo do tremor PSX do resto do jogo - a diferenca e que
  // aqui o calculo acontece DEPOIS da instanceMatrix, no espaco do campo
  // (ver item 1 do bloco Vento no topo).
  function applyWind(material) {
    material.onBeforeCompile = function (shader) {
      shader.uniforms.uWindTime = windUniforms.uWindTime;
      shader.uniforms.uWindStrength = windUniforms.uWindStrength;
      shader.vertexShader =
        'uniform float uWindTime;\nuniform float uWindStrength;\n' +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        [
          'vec4 grassPos = vec4( transformed, 1.0 );',
          '#ifdef USE_INSTANCING',
          '  grassPos = instanceMatrix * grassPos;',
          // Altura desta moita em metros: e o comprimento da coluna Y da
          // matriz de instancia (ver a convencao escala = altura em
          // buildClumpGeometry). Sem isto o vento vergaria a moita alta e
          // a baixa na mesma quantidade de METROS, e as baixas pareceriam
          // dobrar o dobro.
          '  float grassH = max( length( instanceMatrix[ 1 ].xyz ), 0.0001 );',
          // 0 na base, 1 na ponta - e o quadrado disso e o perfil de
          // vergadura: o pe da lamina fica cravado no chao, a ponta faz
          // todo o passeio.
          '  float grassT = clamp( grassPos.y / grassH, 0.0, 1.0 );',
          '  float grassK = grassT * grassT;',
          '  float grassPhase = uWindTime * ' +
            WIND_SWAY_W.toFixed(4) +
            ' + grassPos.x * 0.75 + grassPos.z * 0.55;',
          '  float grassGust = 0.62 + 0.38 * sin( uWindTime * ' +
            WIND_GUST_W.toFixed(4) +
            ' + ( grassPos.x + grassPos.z ) * 0.07 );',
          '  float grassSway = sin( grassPhase ) + 0.3 * sin( grassPhase * 3.0 + 1.3 );',
          '  float grassPush = grassSway * grassGust * grassK * uWindStrength * grassH;',
          '  grassPos.x += grassPush * ' + WIND_DIR_X.toFixed(4) + ';',
          '  grassPos.z += grassPush * ' + WIND_DIR_Z.toFixed(4) + ';',
          // A lamina nao e um elastico: o que ela ganha de lado, perde um
          // pouco de altura. Sem isto o arco parece esticar quando verga.
          '  grassPos.y -= abs( grassPush ) * grassT * 0.35;',
          '#endif',
          'vec4 mvPosition = modelViewMatrix * grassPos;',
          'gl_Position = projectionMatrix * mvPosition;',
        ].join('\n')
      );
    };
    // Sem isto o three.js pode reaproveitar o programa compilado de
    // outro MeshBasicMaterial/MeshStandardMaterial igual (o do chao, por
    // exemplo) e a grama nasce sem vento nenhum.
    material.customProgramCacheKey = function () {
      return 'grama-vento';
    };
    material.needsUpdate = true;
    return material;
  }

  // ---------- Perfil da lamina ----------
  // Largura relativa a base ao longo da lamina (t = 0 na base, 1 na
  // ponta). Nao e uma reta: a lamina mantem ~95% da largura no primeiro
  // terco, ~80% na metade, e so entao afina para o bico. Era exatamente
  // essa reta (largura caindo desde o primeiro vertice) que fazia a
  // grama antiga ler como espinho. O piso de 0.03 evita um triangulo
  // degenerado de largura zero na ponta.
  function taper(t) {
    return Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.6))) * 0.97 + 0.03;
  }

  // Como o arco abre ao longo da lamina: expoente > 1 mantem o pe
  // VERTICAL e concentra a virada na metade de cima, que e como o capim
  // realmente cresce. Com expoente 1 a lamina viraria um arco de circulo
  // uniforme, que le como gancho.
  const BEND_CURVE = 1.3;

  // ---------- Moitas ----------
  // Uma receita por nivel de detalhe. Todas as medidas sao em unidades de
  // ALTURA da moita (a geometria e normalizada para altura exatamente 1,
  // ver buildClumpGeometry), entao a escala de cada instancia e,
  // literalmente, a altura dela em metros do jogo - e por isso o alcance
  // medido na geometria vale para qualquer tamanho.
  //
  //   blades      - laminas ALTAS (as em arco), saindo do mesmo ponto.
  //   segments    - quantos quads tem cada lamina alta. 3 = arco de
  //                 verdade; 1 = tira reta (so no anel do fundo).
  //   spread      - raio em que os pes das laminas se espalham.
  //   width       - largura da base de uma lamina alta.
  //   minH        - altura minima de uma lamina alta dentro da moita (a
  //                 mais alta e sempre 1, para a escala da instancia ser
  //                 a altura real da moita).
  //   bendMin/Max - quanto a lamina verga, em radianos, do pe a ponta. A
  //                 lamina mais alta usa bendMin (fica mais ereta, e ela
  //                 que define a altura); as demais vao abrindo ate
  //                 bendMax, com jitter.
  //   twist       - torcao maxima (radianos) da lamina em torno do
  //                 proprio eixo, sorteada nos dois sentidos.
  //   fillers     - laminas CURTAS de base: largas, muito tombadas e
  //                 escuras, 1 quad cada. Cobrem a linha do chao.
  //   variants    - quantas moitas DIFERENTES sao construidas para este
  //                 nivel. Cada variante custa um draw call, por isso o
  //                 anel de perto tem 3 e os outros 2.
  const CLUMPS = {
    full: {
      blades: 6,
      segments: 3,
      spread: 0.36,
      width: 0.115,
      minH: 0.55,
      bendMin: 0.42,
      bendMax: 1.18,
      twist: 0.7,
      fillers: 4,
      fillerSpread: 0.26,
      fillerWidth: 0.17,
      fillerMinH: 0.2,
      fillerMaxH: 0.42,
      fillerBend: 1.4,
      variants: 3,
    },
    mid: {
      blades: 5,
      segments: 2,
      spread: 0.42,
      width: 0.15,
      minH: 0.6,
      bendMin: 0.45,
      bendMax: 1.05,
      twist: 0.5,
      fillers: 2,
      fillerSpread: 0.3,
      fillerWidth: 0.22,
      fillerMinH: 0.24,
      fillerMaxH: 0.45,
      fillerBend: 1.3,
      variants: 2,
    },
    far: {
      blades: 5,
      segments: 1,
      spread: 0.55,
      width: 0.2,
      minH: 0.68,
      bendMin: 0.3,
      bendMax: 0.85,
      twist: 0,
      fillers: 0,
      fillerSpread: 0.3,
      fillerWidth: 0.2,
      fillerMinH: 0.25,
      fillerMaxH: 0.45,
      fillerBend: 1.2,
      variants: 2,
    },
  };

  // ---------- Cor ----------
  // O tom de verde escuro do terreno, gravado direto nos vertices. Base
  // bem escura (a sombra dentro da massa de grama, onde a luz nao entra)
  // e ponta um pouco mais clara: e esse degrade que da volume ao gramado
  // visto de longe, sem nenhuma textura e sem nenhuma luz. Os dois
  // extremos sao os MESMOS de antes de proposito - eles foram casados com
  // o tom do chao solido (ver GRASS_DARK_TINT em
  // materials/material-library.js), e mexer neles descasaria a grama do
  // terreno embaixo dela.
  const BLADE_BASE = { r: 0.086, g: 0.125, b: 0.055 };
  const BLADE_TIP = { r: 0.2, g: 0.278, b: 0.122 };

  // Curva do degrade base -> ponta. Menor que 1 = o verde clareia rapido
  // ao sair da base e depois se acalma, entao a MASSA da lamina fica no
  // meio-tom em vez de escura pela metade. Antes o degrade era linear.
  const SHADE_CURVE = 0.75;

  // Variacao de tom por lamina (multiplica as duas cores acima): sem ela
  // a moita vira uma mancha chapada de uma cor so.
  const TONE_MIN = 0.82;
  const TONE_MAX = 1.16;

  // Contraste ao longo da lamina, POR CIMA do degrade: base 8% mais
  // escura, ponta 8% mais clara. A media fica em 1.0, ou seja, o brilho
  // geral do gramado nao muda - so ganha profundidade.
  const AO_MIN = 0.92;
  const AO_MAX = 1.08;

  // As duas bordas da lamina recebem valores levemente diferentes. Numa
  // tira plana de cor unica, isto e o que finge o rolo da folha: um lado
  // pega a luz, o outro fica na propria sombra. Custa zero (a cor ja e
  // por vertice) e, junto com a torcao, e o que tira o aspecto de
  // papelao.
  const EDGE_DARK = 0.9;
  const EDGE_LIGHT = 1.07;

  // As laminas curtas de base vivem no fundo da moita, onde nao entra
  // luz: entram mais escuras que as altas.
  const FILLER_SHADE = 0.72;

  // Uma lamina em cada ~8 entra seca/amarelada (mais vermelho, menos
  // azul). Detalhe barato que quebra o verde uniforme e combina com mato
  // alto de terreno sem cuidado.
  const DRY_CHANCE = 0.12;
  const DRY_TONE = { r: 1.3, g: 1.04, b: 0.7 };

  // Tintura do material de DIA por anel (multiplica a cor de vertice).
  // As moitas de longe entram um pouco mais dessaturadas para casar com
  // a bruma antes mesmo de a nevoa agir - o mesmo que a pintura de
  // paisagem faz com a perspectiva aerea.
  const DAY_TINT = { full: 0xffffff, mid: 0xeef2ea, far: 0xdfe6dc };

  // ---------- Aneis de distribuicao ----------
  // from/to    - distancia (em metros do jogo) do ponto da janela.
  // spacing    - passo da grade antes do chacoalho. MENOR que a copa de
  //              uma moita do anel, de proposito: as moitas se
  //              sobrepoem e nao sobra celula vazia lendo como chao
  //              pelado (ver Cobertura no topo).
  // minScale/maxScale - altura final da moita, em metros. O anel de
  //              perto e o joelho pedido (KNEE_HEIGHT); os de tras
  //              crescem de leve, o truque de sempre para a cobertura
  //              chegar ao fim do terreno sem multiplicar instancia (a
  //              partir de ~17 m a tela nao distingue mais o tamanho de
  //              uma moita isolada, so a densidade da massa verde).
  // lod        - qual receita de CLUMPS usar.
  // nightVisible - ver item 5 de Desempenho no topo.
  const RINGS = [
    {
      name: "perto",
      from: 0,
      to: 9,
      spacing: 0.42,
      minScale: KNEE_HEIGHT - 0.06,
      maxScale: KNEE_HEIGHT + 0.08,
      lod: "full",
      nightVisible: true,
    },
    {
      name: "medio",
      from: 9,
      to: 18,
      spacing: 0.8,
      minScale: KNEE_HEIGHT + 0.02,
      maxScale: KNEE_HEIGHT + 0.2,
      lod: "mid",
      nightVisible: false,
    },
    {
      name: "longe",
      from: 18,
      to: 29,
      spacing: 1.25,
      minScale: KNEE_HEIGHT + 0.24,
      maxScale: KNEE_HEIGHT + 0.54,
      lod: "far",
      nightVisible: false,
    },
  ];

  // Esfera de corte (frustum culling) usada pelas malhas instanciadas.
  // PRECISA ser definida na mao: no three.js r128 o corte de uma
  // THREE.InstancedMesh usa a boundingSphere da GEOMETRIA (uma moita
  // so, na origem do campo) e ignora as matrizes de instancia - sem
  // isso, o gramado inteiro sumiria da tela sempre que a origem do
  // campo (o ponto da janela) saisse do campo de visao, que e
  // exatamente o que acontece ao olhar para os lados atraves do vidro.
  const FIELD_SPHERE_CENTER = new THREE.Vector3(0, 0, 12);
  const FIELD_SPHERE_RADIUS = 42;

  // ---------- Sorteio deterministico ----------
  // mulberry32: gerador pequeno e rapido, com semente explicita. Ver
  // Cobertura no topo para o motivo de nao usar Math.random.
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

  // Semente estavel a partir do id da janela (ex.: janela-quarto), para
  // as tres janelas do jogo nao mostrarem o mesmo gramado clonado.
  function hashSeed(text) {
    let h = 0x811c9dc5;
    const s = String(text || "grama");
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // Ver FIELD_SPHERE_CENTER/RADIUS.
  function applyFieldBounds(geo) {
    geo.boundingSphere = new THREE.Sphere(
      FIELD_SPHERE_CENTER.clone(),
      FIELD_SPHERE_RADIUS
    );
    geo.boundingBox = new THREE.Box3(
      new THREE.Vector3(-32, -1, -2),
      new THREE.Vector3(32, 3, 34)
    );
  }


  /**
   * Constroi UMA lamina e empilha nos arrays da moita.
   *
   * A lamina e um ARCO percorrido por COMPRIMENTO DE ARCO: a cada
   * segmento andamos sempre a mesma distancia (ds), so mudando a
   * direcao. E o que garante que vergar mais nao encurta nem estica a
   * folha - ela apenas tomba - e o que faz a curva ser uma curva de
   * verdade em vez de duas retas emendadas.
   *
   *   opts.segments   - quantos quads (1 = tira reta, 3 = arco cheio).
   *   opts.height     - comprimento da lamina (antes da normalizacao).
   *   opts.bend       - angulo total de virada, em radianos, da base a
   *                     ponta. 0 = lamina vertical.
   *   opts.lean       - para que lado do circulo ela verga.
   *   opts.twist      - torcao acumulada em torno do proprio eixo.
   *   opts.baseX/baseZ- o pe da lamina dentro da moita.
   *   opts.halfWidth  - metade da largura na base.
   *   opts.toneR/G/B  - tom desta lamina (ver TONE_MIN/DRY_TONE).
   */
  function buildBlade(data, opts) {
    const segs = opts.segments;
    const first = data.positions.length / 3;
    const ds = opts.height / segs;
    const dirX = Math.cos(opts.lean);
    const dirZ = Math.sin(opts.lean);

    let px = opts.baseX;
    let py = 0;
    let pz = opts.baseZ;

    for (let i = 0; i <= segs; i++) {
      const t = i / segs;

      // Anda um segmento na direcao MEDIA do trecho (nao na do vertice
      // anterior): com 3 segmentos, essa media e o que separa um arco
      // liso de um cotovelo.
      if (i > 0) {
        const thMid = opts.bend * Math.pow((i - 0.5) / segs, BEND_CURVE);
        const sinMid = Math.sin(thMid);
        px += sinMid * dirX * ds;
        py += Math.cos(thMid) * ds;
        pz += sinMid * dirZ * ds;
      }

      // Tangente da lamina neste ponto (para onde ela aponta).
      const th = opts.bend * Math.pow(t, BEND_CURVE);
      const sinTh = Math.sin(th);
      const tx = sinTh * dirX;
      const ty = Math.cos(th);
      const tz = sinTh * dirZ;

      // Eixo da LARGURA. Comeca horizontal e perpendicular ao plano do
      // arco (a tira nunca fica de perfil no proprio sentido em que se
      // dobra) e vai girando em torno da tangente conforme sobe: e a
      // torcao. Como a base horizontal e a tangente sao perpendiculares,
      // a rotacao e so um seno/cosseno entre ela e T x ela.
      const bx = -dirZ;
      const bz = dirX;
      const upX = ty * bz;
      const upY = tz * bx - tx * bz;
      const upZ = -ty * bx;
      const phi = opts.twist * t;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      const sx = bx * cosPhi + upX * sinPhi;
      const sy = upY * sinPhi;
      const sz = bz * cosPhi + upZ * sinPhi;

      // Normal da face = tangente x eixo da largura. Virada para cima
      // quando aponta para baixo: de noite quem manda e a luz ambiente
      // (MeshStandardMaterial), e uma normal apontando para o chao
      // apagaria a lamina.
      let nx = ty * sz - tz * sy;
      let ny = tz * sx - tx * sz;
      let nz = tx * sy - ty * sx;
      if (ny < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }

      const w = opts.halfWidth * taper(t);

      // Cor: degrade base -> ponta (curvado por SHADE_CURVE), vezes o
      // contraste ao longo da lamina e o tom sorteado dela.
      const g = Math.pow(t, SHADE_CURVE);
      const ao = AO_MIN + (AO_MAX - AO_MIN) * t;
      const cr = (BLADE_BASE.r + (BLADE_TIP.r - BLADE_BASE.r) * g) * opts.toneR * ao;
      const cg = (BLADE_BASE.g + (BLADE_TIP.g - BLADE_BASE.g) * g) * opts.toneG * ao;
      const cb = (BLADE_BASE.b + (BLADE_TIP.b - BLADE_BASE.b) * g) * opts.toneB * ao;

      for (let s = -1; s <= 1; s += 2) {
        const edge = s < 0 ? EDGE_DARK : EDGE_LIGHT;
        data.positions.push(px + sx * w * s, py + sy * w * s, pz + sz * w * s);
        data.normals.push(nx, ny, nz);
        data.colors.push(cr * edge, cg * edge, cb * edge);
      }
    }

    // Duas faces por par de linhas. O material e DoubleSide (cada lamina
    // e uma casquinha aberta), entao a ordem dos vertices nao esconde
    // nada.
    for (let i = 0; i < segs; i++) {
      const a = first + i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      data.index.push(a, c, b, b, c, d);
    }
  }

  /**
   * Constroi UMA moita de grama: as laminas altas em arco mais as
   * laminas curtas de base, todas assadas numa unica BufferGeometry
   * (nenhum no, nenhum grupo - e uma malha instanciavel).
   *
   * Convencoes de saida, das quais o resto do arquivo depende:
   *   - base em y = 0 e ponta mais alta em y = 1 (altura exatamente 1),
   *     entao a escala da instancia E a altura em metros. Como agora a
   *     lamina verga, a altura final nao e mais o comprimento dela: a
   *     moita e construida e SO DEPOIS normalizada pelo ponto mais alto
   *     que realmente atingiu.
   *   - centrada em x/z na origem;
   *   - reach devolvido junto e o MAIOR alcance horizontal medido nos
   *     proprios vertices JA normalizados (nao metade de uma bounding
   *     box, nao um numero chutado): e ele que alimenta todas as travas
   *     de onde nao pode nascer grama.
   */
  function buildClumpGeometry(spec, seed) {
    const rng = mulberry32(seed);
    const data = { positions: [], normals: [], colors: [], index: [] };
    const total = spec.blades + spec.fillers;

    for (let b = 0; b < total; b++) {
      // As primeiras sao as laminas altas; o resto e base.
      const filler = b >= spec.blades;

      // Angulo do pe da lamina dentro da moita. O passo aureo (2.39996
      // rad) espalha as laminas sem sorteio nenhum - duas vizinhas nunca
      // caem no mesmo lado - e o chacoalho por cima tira a regularidade
      // que sobraria.
      const spot = b * 2.39996 + rng() * 0.9;
      // Raiz quadrada: pes distribuidos por AREA, nao por raio (senao
      // tudo se acumula no centro). O 0.18 de piso evita a moita virar um
      // buque saindo de um ponto unico.
      const spread = filler ? spec.fillerSpread : spec.spread;
      const radius = spread * (0.18 + 0.82 * Math.sqrt(rng()));

      // Para que lado ela verga: para FORA da moita, com desvio sorteado
      // - e o que da o contorno irregular de mato de verdade.
      const lean = spot + (rng() - 0.5) * 1.1;

      // A primeira lamina alta e sempre a mais comprida: e o que ancora a
      // convencao escala = altura (as outras nunca a ultrapassam porque
      // vergam mais, ver bend abaixo).
      const hRnd = rng();
      let height;
      if (filler) {
        height = spec.fillerMinH + hRnd * (spec.fillerMaxH - spec.fillerMinH);
      } else {
        height = b === 0 ? 1 : spec.minH + hRnd * (1 - spec.minH);
      }

      const wRnd = rng();
      const baseWidth = filler ? spec.fillerWidth : spec.width;
      const halfWidth = (baseWidth * (0.75 + wRnd * 0.55)) / 2;

      // Quanto esta lamina verga. As altas vao abrindo em leque: a mais
      // comprida (b = 0) fica quase ereta em bendMin e as seguintes
      // tombam cada vez mais, ate bendMax, com jitter para o leque nao
      // ficar em ordem crescente visivel. As de base ja nascem muito
      // tombadas - elas existem para se deitar sobre o chao.
      const bRnd = rng();
      let bend;
      if (filler) {
        bend = spec.fillerBend * (0.7 + bRnd * 0.6);
      } else {
        const span = spec.blades <= 1 ? 0 : b / (spec.blades - 1);
        const k = Math.min(1, Math.max(0, span + (bRnd - 0.5) * 0.3));
        bend = spec.bendMin + (spec.bendMax - spec.bendMin) * k;
      }

      // Torcao nos dois sentidos (ver spec.twist e o item 3 do topo).
      const twist = (rng() - 0.5) * 2 * spec.twist;

      // Tom da lamina (ver TONE_MIN/TONE_MAX, DRY_CHANCE e FILLER_SHADE).
      let toneR = TONE_MIN + rng() * (TONE_MAX - TONE_MIN);
      let toneG = toneR;
      let toneB = toneR;
      if (rng() < DRY_CHANCE) {
        toneR *= DRY_TONE.r;
        toneG *= DRY_TONE.g;
        toneB *= DRY_TONE.b;
      }
      if (filler) {
        toneR *= FILLER_SHADE;
        toneG *= FILLER_SHADE;
        toneB *= FILLER_SHADE;
      }

      buildBlade(data, {
        // Lamina de base e sempre 1 quad: ela e um borrao escuro no pe da
        // moita, nao tem silhueta para desenhar.
        segments: filler ? 1 : spec.segments,
        height: height,
        bend: bend,
        lean: lean,
        twist: twist,
        baseX: Math.cos(spot) * radius,
        baseZ: Math.sin(spot) * radius,
        halfWidth: halfWidth,
        toneR: toneR,
        toneG: toneG,
        toneB: toneB,
      });
    }

    // ---------- Normalizacao: altura exatamente 1 ----------
    // O arco tomba, entao o ponto mais alto da moita nao e o comprimento
    // da lamina mais comprida. Medimos o topo real e escalamos a moita
    // inteira por ele: a base continua em y = 0, as proporcoes ficam
    // intactas e a convencao escala da instancia = altura em metros volta
    // a valer - e com ela todas as travas de posicionamento.
    let maxY = 0;
    for (let i = 1; i < data.positions.length; i += 3) {
      if (data.positions[i] > maxY) {
        maxY = data.positions[i];
      }
    }
    const norm = maxY > 0 ? 1 / maxY : 1;

    const count = data.positions.length / 3;
    const positions = new Float32Array(data.positions.length);
    let reach = 0;
    for (let v = 0; v < count; v++) {
      const o = v * 3;
      const x = data.positions[o] * norm;
      const y = data.positions[o + 1] * norm;
      const z = data.positions[o + 2] * norm;
      positions[o] = x;
      positions[o + 1] = y;
      positions[o + 2] = z;
      const dist = Math.sqrt(x * x + z * z);
      if (dist > reach) {
        reach = dist;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(data.normals), 3)
    );
    geo.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(data.colors), 3)
    );
    geo.setIndex(new THREE.BufferAttribute(new Uint16Array(data.index), 1));
    applyFieldBounds(geo);

    return { geometry: geo, reach: reach };
  }

  // ---------- Geometria e materiais compartilhados ----------
  // Construidos UMA vez para o jogo inteiro, na primeira janela que
  // pedir, e reaproveitados pelas outras duas (ver item 4 de Desempenho
  // no topo).
  const clumpCache = {};

  function getClumpSet(lod) {
    if (clumpCache[lod]) {
      return clumpCache[lod];
    }
    const spec = CLUMPS[lod];
    const geometries = [];
    let reach = 0;
    for (let v = 0; v < spec.variants; v++) {
      const built = buildClumpGeometry(spec, hashSeed(lod + '-moita-' + v));
      geometries.push(built.geometry);
      reach = Math.max(reach, built.reach);
    }
    clumpCache[lod] = { geometries: geometries, reach: reach };
    return clumpCache[lod];
  }

  let materialCache = null;

  function getMaterials() {
    if (materialCache) {
      return materialCache;
    }
    // Um unico material de noite para os tres aneis (a essa altura tudo
    // la fora esta quase preto de qualquer jeito, ver Noite e dia no
    // topo); tinturas separadas so de dia, ver DAY_TINT. Todos passam
    // por applyWind: a brisa e a mesma nos dois periodos e vem dos
    // mesmos uniforms.
    const nightMaterial = applyWind(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      })
    );
    const dayMaterials = {};
    Object.keys(DAY_TINT).forEach(function (lod) {
      dayMaterials[lod] = applyWind(
        new THREE.MeshBasicMaterial({
          vertexColors: true,
          color: DAY_TINT[lod],
          side: THREE.DoubleSide,
          fog: true,
        })
      );
    });
    materialCache = {
      nightMaterial: nightMaterial,
      dayMaterials: dayMaterials,
    };
    return materialCache;
  }

  // ---------- Distribuicao ----------
  // Retangulos do espaco LOCAL do campo em que nao pode nascer moita
  // nenhuma - hoje os comodos novos da casa e a varanda (ver item 2 de
  // Onde NAO pode nascer grama no topo). A moita nao e removida depois:
  // ela simplesmente nao e sorteada.
  function hitsExclusion(exclusions, x, z, margin) {
    for (let i = 0; i < exclusions.length; i++) {
      const rect = exclusions[i];
      if (
        x > rect.minX - margin &&
        x < rect.maxX + margin &&
        z > rect.minZ - margin &&
        z < rect.maxZ + margin
      ) {
        return true;
      }
    }
    return false;
  }

  // Grade chacoalhada sobre o retangulo que envolve o anel, filtrada
  // depois pelo raio e pelas tres travas. Devolve as poses prontas.
  function buildPlacements(
    ring,
    reachNorm,
    variantCount,
    rng,
    path,
    exclusions,
    lateralLimit
  ) {
    const placements = [];
    const cells = Math.ceil(ring.to / ring.spacing);
    const jitter = ring.spacing * 0.7;

    for (let gx = -cells; gx <= cells; gx++) {
      for (let gz = 0; gz <= cells; gz++) {
        // Os seis sorteios acontecem SEMPRE, mesmo quando a celula e
        // descartada logo abaixo: e o que mantem a sequencia do PRNG
        // estavel (mesma semente, mesmo gramado, sempre).
        const jx = (rng() - 0.5) * jitter;
        const jz = (rng() - 0.5) * jitter;
        const height = ring.minScale + rng() * (ring.maxScale - ring.minScale);
        // Largura sorteada em separado da altura: umas moitas mais
        // abertas, outras mais fechadas. Ajuda a cobertura sem custar
        // instancia nenhuma.
        const widen = 0.9 + rng() * 0.5;
        const rotation = rng() * TAU;
        const variant = Math.min(
          variantCount - 1,
          Math.floor(rng() * variantCount)
        );

        const x = gx * ring.spacing + jx;
        const z = gz * ring.spacing + jz;
        const distance = Math.sqrt(x * x + z * z);

        if (distance < ring.from || distance >= ring.to) {
          continue;
        }

        // Alcance REAL desta instancia: o raio medido na geometria vezes
        // a altura e a largura sorteadas, MAIS o empurrao maximo que o
        // vento pode dar na ponta dela (que nao acompanha a largura, so a
        // altura - ver o shader em applyWind). Alimenta as tres travas.
        const reach = reachNorm * height * widen + WIND_REACH * height;

        // 1. Nada de grama dentro da casa.
        if (z < reach + WALL_SAFETY) {
          continue;
        }
        // Borda do terreno (ou a largura pedida por este campo, ver
        // options.lateralLimit).
        if (Math.abs(x) + reach > lateralLimit) {
          continue;
        }
        // 3. Nada de grama na estrada de terra.
        if (path && path.contains(x, z, reach + PATH_CLEARANCE)) {
          continue;
        }
        // 2. Nada de grama dentro dos comodos novos / da varanda.
        if (exclusions.length && hitsExclusion(exclusions, x, z, reach)) {
          continue;
        }

        placements.push({
          x: x,
          z: z,
          height: height,
          widen: widen,
          rotation: rotation,
          variant: variant,
        });
      }
    }

    return placements;
  }

  /**
   * Cria o gramado de UMA janela.
   *
   * Convencao de espaco local (a mesma do chao de
   * ExteriorFactory.createGroundPlane, so que ancorada na parede em vez
   * do centro do terreno): origem no pe da parede, na posicao da
   * janela; +Z aponta para FORA da casa; Y = 0 e o chao externo. Quem
   * chama so precisa de group.position.set(...) no plano da parede e
   * group.rotation.y apontando o +Z local para fora - exatamente o que
   * as duas cenas ja fazem no bloco Vista externa (grama).
   *
   * options.seed: qualquer texto estavel (o id da janela serve) para o
   * gramado daquela janela nao ser identico ao das outras.
   *
   * options.exclusions: lista de retangulos {minX,maxX,minZ,maxZ} do
   * espaco LOCAL do campo em que nao nasce moita nenhuma (comodos novos
   * e varanda). Vazio/ausente: o gramado cobre o terreno todo.
   *
   * options.lateralLimit: metros que este campo cobre para CADA LADO da
   * ancora (o X local). Padrao e o terreno inteiro (LATERAL_LIMIT). Serve
   * para um campo de REMENDO, que existe so para preencher uma faixa que
   * os outros nao alcancam - hoje o gramado dos FUNDOS da casa (ver o
   * bloco Gramado dos fundos em scenes/corridor-scene.js): sem ele, o
   * remendo plantaria 60 metros de grama por cima do gramado que as
   * fachadas laterais ja cobrem, o dobro de instancias no mesmo lugar.
   * Nunca ultrapassa o LATERAL_LIMIT do terreno, mesmo que se peca mais.
   *
   * options.path: o caminho de terra (DirtPathFactory), quando esta
   * janela da para ele. Nenhuma moita e sorteada dentro da pista.
   *
   * Devolve o contrato de sempre do exterior mais o quadro do vento:
   * { group, update, setDaytime, setMorning }. `update(delta, elapsed)`
   * so empurra o relogio da brisa e e o unico custo por quadro deste
   * arquivo (ver o bloco Vento no topo); um gramado que nao seja
   * registrado nos frameUpdaters da cena simplesmente fica parado, sem
   * quebrar nada.
   */
  function createGrassField(options) {
    const opts = options || {};
    const group = new THREE.Group();
    group.name = "gramado-alto";
    const built = [];
    let morning = false;

    const shared = getMaterials();
    const exclusions = opts.exclusions || [];
    // Largura deste campo para cada lado da ancora (ver
    // options.lateralLimit acima). O terreno continua sendo o teto: um
    // campo nunca planta grama alem da borda do chao externo.
    const lateralLimit =
      opts.lateralLimit === undefined
        ? LATERAL_LIMIT
        : Math.min(LATERAL_LIMIT, Math.max(0, opts.lateralLimit));

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    RINGS.forEach(function (ring, ringIndex) {
      const set = getClumpSet(ring.lod);
      const rng = mulberry32(hashSeed(opts.seed) + ringIndex * 0x9e3779b9);
      const placements = buildPlacements(
        ring,
        set.reach,
        set.geometries.length,
        rng,
        opts.path,
        exclusions,
        lateralLimit
      );
      if (!placements.length) {
        return;
      }

      // Uma malha instanciada por variante de moita (ver variants em
      // CLUMPS): o numero de draw calls e fixo, nao acompanha a
      // quantidade de grama.
      set.geometries.forEach(function (geometry, variant) {
        const mine = placements.filter(function (pose) {
          return pose.variant === variant;
        });
        if (!mine.length) {
          return;
        }

        const mesh = new THREE.InstancedMesh(
          geometry,
          shared.nightMaterial,
          mine.length
        );
        mesh.name = "grama-alta-" + ring.name + "-" + (variant + 1);

        mine.forEach(function (pose, i) {
          quaternion.setFromAxisAngle(UP, pose.rotation);
          position.set(pose.x, -GROUND_SINK, pose.z);
          // Y = altura em metros; X/Z = a mesma altura vezes a largura
          // sorteada (ver widen em buildPlacements).
          scale.set(
            pose.height * pose.widen,
            pose.height,
            pose.height * pose.widen
          );
          matrix.compose(position, quaternion, scale);
          mesh.setMatrixAt(i, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;

        // As instancias nunca mudam depois de montadas, e a malha nunca
        // se move dentro do grupo: nao ha motivo para o three.js
        // recalcular a matriz dela a cada quadro.
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();

        mesh.visible = ring.nightVisible;

        group.add(mesh);
        built.push({ mesh: mesh, ring: ring });
      });
    });

    // Aplica o estado atual (noite/dia) em tudo que foi montado. De dia:
    // material de dia e TODOS os aneis visiveis. De noite: material de
    // noite e so os aneis marcados com nightVisible (ver RINGS) - ou
    // seja, exatamente o estado em que o gramado nasce.
    function applyTimeOfDay() {
      built.forEach(function (item) {
        item.mesh.material = morning
          ? shared.dayMaterials[item.ring.lod]
          : shared.nightMaterial;
        item.mesh.visible = morning ? true : item.ring.nightVisible;
      });
    }

    // Mesmo contrato de ExteriorFactory.createGroundPlane: a cena chama
    // isto de dentro do proprio setDaytime() dela, com a tela preta (ver
    // cutscenes/sleep-sequence.js). Os dois sentidos existem por causa
    // do controle de horario do Editor (ver editor/editor-ui.js); no
    // jogo so o sentido noite -> dia acontece.
    function setDaytime(daytime) {
      morning = daytime !== false;
      applyTimeOfDay();
    }

    function setMorning() {
      setDaytime(true);
    }

    // ---------- O quadro ----------
    // Chamado pelo loop da cena (frameUpdaters). Nao toca em nenhuma
    // matriz de instancia: so empurra o relogio compartilhado da brisa,
    // que o vertex shader le. Chamar isto pelos tres gramados no mesmo
    // quadro nao acelera o vento (ver advanceWind).
    function update(delta, elapsed) {
      advanceWind(delta, elapsed);
    }

    return {
      group: group,
      update: update,
      setDaytime: setDaytime,
      setMorning: setMorning,
    };
  }

  return {
    KNEE_HEIGHT: KNEE_HEIGHT,
    WIND_STRENGTH: WIND_STRENGTH,
    createGrassField: createGrassField,
  };
})();
