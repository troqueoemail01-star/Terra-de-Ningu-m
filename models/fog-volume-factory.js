/**
 * models/fog-volume-factory.js
 * -------------------------------------------------
 * A NEBLINA VOLUMETRICA do cenario exterior, vista atraves do vidro
 * das tres janelas do jogo (as duas do corredor + a de "MEU QUARTO" -
 * ver models/window-factory.js). Quarta e ultima camada da vista
 * externa, empilhada em cima das tres que ja existiam, sem substituir
 * nem alterar nenhuma delas:
 *
 *   models/exterior-factory.js .... o terreno (plano texturizado)
 *   models/grass-field-factory.js . os tufos de grama em cima dele
 *   models/tree-forest-factory.js . a mata que fecha o horizonte
 *   models/fog-volume-factory.js .. a nevoa que ocupa o ar entre tudo  <=
 *
 * A referencia pedida e a atmosfera de Silent Hill, adaptada a
 * estetica PSX do projeto: nevoa fria, acinzentada, melancolica, que
 * OCUPA O ESPACO em vez de ser um filtro na frente da camera.
 *
 * =========================================================
 *  O QUE MUDOU NESTA REVISAO (e por que)
 * =========================================================
 * A versao anterior tinha DOIS defeitos que faziam a nevoa ser lida
 * como "um PNG que anda junto com o jogador", exatamente a queixa:
 *
 *  1. OS TUFOS AMOSTRAVAM O RUIDO NO ESPACO DA UV DO CARTAO.
 *     Como o cartao e um billboard (sempre encara a camera), a UV dele
 *     esta amarrada a TELA - ou seja, o desenho interno da nevoa
 *     acompanhava a cabeca do jogador. Andar de lado nao revelava um
 *     lado novo do banco de nevoa: revelava o MESMO decalque, so
 *     transladado. Era literalmente um PNG preso na cara da camera.
 *     Agora cada fragmento do cartao sabe a propria POSICAO NO MUNDO
 *     (ver worldDirToLocal no vertex shader) e o ruido e amostrado ALI.
 *     O cartao continua encarando a tela - o que ele desenha, nao. O
 *     billboard passou a ser o que sempre deveria ter sido: uma FATIA
 *     de um campo de nevoa 3D plantado no mundo. Mexer a cabeca agora
 *     desliza a fatia pelo campo, com paralaxe de verdade.
 *
 *  2. AS FATIAS ERAM PLANOS DE ESPESSURA ZERO.
 *     Uma amostra de ruido por fragmento, no ponto exato em que o raio
 *     furava o plano: isso e um DECALQUE, nao um volume. Agora cada
 *     fatia tem espessura (uSpan) e o shader amostra o ruido em DOIS
 *     pontos ao longo do raio de visao, dentro da propria fatia (ver
 *     "ESPESSURA OTICA" abaixo). O borrao que aparece quando o olhar
 *     fica rasante e o mesmo de um gas de verdade sendo atravessado na
 *     diagonal - e ele nasce de graca, sem ray marching.
 *
 * E dois defeitos de MOVIMENTO, que faziam a nevoa parecer uma textura
 * sendo arrastada em vez de ar se movendo:
 *
 *  3. Cada fatia arrastava o proprio ruido numa direcao PROPRIA, e os
 *     tufos andavam em orbitas de Lissajous (que sempre voltam ao ponto
 *     de partida). Cinco texturas indo para cinco lados + orbitas que
 *     se repetem = o cerebro le "animacao", nao "vento". Agora existe
 *     UM VENTO, um vetor so, compartilhado por fatias e tufos (ver
 *     WIND). O que diferencia as camadas e o CISALHAMENTO: as de cima
 *     correm mais rapido que as de baixo, como em qualquer perfil de
 *     vento real. O resultado le como uma massa de ar unica.
 *
 *  4. Os tufos nunca saiam de perto. Agora eles ATRAVESSAM a vista
 *     inteira e voltam pelo outro lado (o wrap lateral do vertex
 *     shader), sempre esmaecendo nas duas pontas - entao o jogador ve
 *     bancos de nevoa CHEGANDO e PASSANDO, nao balancando no lugar.
 *
 * =========================================================
 *  POR QUE NAO E UM FILTRO DE TELA, NEM UM PLANO 2D
 * =========================================================
 * A tentacao obvia (um quad na frente da camera, ou um cinza no
 * pos-processamento) foi descartada de proposito: nenhuma das duas
 * tem PARALAXE. Sem paralaxe a nevoa gruda na tela, anda junto com a
 * cabeca do jogador, e o cerebro le na hora como sujeira no monitor -
 * nao como ar. E um filtro de tela ainda apareceria DENTRO da casa,
 * o oposto do pedido (ver "A CASA CONTINUA SENDO BARREIRA" abaixo).
 *
 * O que existe aqui, em vez disso, sao DOIS sistemas de geometria de
 * verdade, plantados no mundo, do lado de fora da parede, os dois
 * amostrando O MESMO campo de ruido 3D nas MESMAS coordenadas de
 * mundo - e e por isso que eles se leem como um so gas, e nao como
 * dois efeitos empilhados:
 *
 *   1. FATIAS (sheets) - seis lajes horizontais de nevoa empilhadas em
 *                        alturas diferentes, cobrindo todo o exterior
 *                        daquela janela. Sao elas que dao a MASSA da
 *                        nevoa: a camada rasteira sobre a grama, o
 *                        corpo no meio das arvores e o veu fino por
 *                        cima das copas.
 *
 *   2. TUFOS (wisps)   - ~104 fatias de campo 3D que encaram a camera
 *                        (billboard feito no vertex shader),
 *                        espalhadas ENTRE as arvores. Sao elas que dao
 *                        a estrutura local e o movimento visivel:
 *                        massas de nevoa que passam na frente e atras
 *                        dos troncos conforme o vento empurra.
 *
 * Os dois sao geometria comum na cena e entram no teste de
 * profundidade com o chao, com a grama e com a floresta. E dai que sai
 * a sensacao de volume: a nevoa fica ATRAS de uma arvore e NA FRENTE
 * da seguinte, como um gas de verdade ocupando o vao entre as duas.
 *
 * =========================================================
 *  O TRUQUE PRINCIPAL: ESPESSURA OTICA POR ANGULO DE VISAO
 * =========================================================
 * Seis planos horizontais, sozinhos, seriam seis decalques chapados.
 * O que os transforma em VOLUME sao duas coisas no fragment shader:
 *
 *   a) A formula de absorcao (Lei de Beer-Lambert numa "fatia" de gas):
 *
 *          alpha = 1 - exp(-densidade / |cos(angulo com a normal)|)
 *
 *      O caminho que o olhar percorre DENTRO da fatia cresce quando o
 *      angulo fica rasante. Na pratica:
 *        - Olhando reto para o horizonte pela janela, o olhar atravessa
 *          a fatia quase de lado -> caminho longuissimo -> nevoa densa.
 *        - Olhando para baixo, para a grama logo abaixo do peitoril, o
 *          olhar corta a fatia quase perpendicular -> caminho curto ->
 *          quase nada de nevoa.
 *
 *   b) A AMOSTRAGEM AO LONGO DESSE CAMINHO (novidade desta revisao). O
 *      ruido nao e mais lido no ponto em que o raio fura o plano, e sim
 *      nas duas pontas da corda que o raio descreve dentro da fatia
 *      (vWorld -+ V * span, com span = meia-espessura / |cos|). Como as
 *      duas pontas estao em ALTURAS diferentes e o campo de ruido e 3D,
 *      elas caem em regioes diferentes da nevoa - e a media das duas
 *      borra a densidade na direcao exata em que o olhar atravessa o
 *      gas. E o efeito que ray marching entrega com dezenas de
 *      amostras, aqui aproximado com duas, e que e o unico jeito de uma
 *      laje plana parar de parecer um adesivo.
 *
 * Ray marching de verdade custaria dezenas de amostras POR PIXEL para
 * chegar num resultado que, na resolucao interna de 320x180 do jogo
 * (ver scripts/main.js), ninguem distinguiria deste - e num celular
 * essa e a diferenca entre caber e nao caber no orcamento de quadro.
 *
 * =========================================================
 *  O CAMPO DE RUIDO E 3D (e o mesmo para todo mundo)
 * =========================================================
 * O ruido nao e mais uma textura 2D lida em coordenadas de chao: e um
 * campo TRIDIMENSIONAL, montado a partir da mesma textura 128x128
 * periodica de sempre. A altura escolhe DUAS "fatias" da textura
 * (deslocadas pela razao aurea, que e o deslocamento que menos
 * correlaciona), e a parte fracionaria interpola entre elas - o mesmo
 * truque que a industria usa para tirar volume de um atlas 2D. Custo:
 * duas buscas de textura em cache por oitava, contra as oito de um
 * ruido de valor 3D analitico.
 *
 * Consequencias praticas, todas desejaveis:
 *   - Fatias vizinhas nao precisam mais de ruido "desafinado" na mao:
 *     estao em alturas diferentes, entao caem em regioes diferentes do
 *     campo automaticamente.
 *   - A nevoa tem estrutura VERTICAL. Subir e descer o olhar mostra
 *     nevoa diferente, nao a mesma mancha esticada.
 *   - Fatias e tufos amostram o MESMO campo nas MESMAS coordenadas de
 *     mundo. Um banco de nevoa denso e denso nos dois sistemas ao mesmo
 *     tempo, e o conjunto vira uma coisa so.
 *   - O vento pode empurrar o campo tambem em Y (ver WIND_SWAY): a
 *     nevoa assenta e sobe de leve, sozinha.
 *
 * =========================================================
 *  PROFUNDIDADE
 * =========================================================
 * A densidade dos dois sistemas e multiplicada por uma RAMPA que
 * depende da distancia ATE A JANELA (nao ate a camera - de proposito:
 * rampa por distancia de camera e justamente o que faz nevoa "andar
 * junto com o jogador"). Perto da casa a nevoa e um veu, longe ela
 * fecha. A rampa e uma potencia (pow(t, RAMP_EXP)) e nao uma reta,
 * para o adensamento acontecer tarde e rapido, como bruma de verdade.
 * Com os numeros calibrados abaixo, olhando na horizontal pela janela:
 *
 *     distancia    nevoa acumulada     o que o jogador ve
 *     ---------    ---------------     ---------------------------
 *      8 - 12 m         25 - 36%       grama e primeiras arvores
 *                                      nitidas, so "esfriadas"
 *     15 - 18 m         50 - 67%       troncos ainda legiveis, copas
 *                                      comecando a se dissolver
 *     20 - 23 m         77 - 89%       so as silhuetas da mata
 *     26 m ou mais           95%       a floresta some na bruma
 *
 * Esse degrade e o que cria a ilusao de uma floresta MUITO maior do
 * que as 27 unidades que ela realmente tem, e e tambem o que esconde
 * de vez a borda do cenario exterior: o limite do terreno
 * (ExteriorFactory.GROUND_SIZE) fica atras da parede de nevoa.
 *
 * IMPORTANTE: o acumulado NUNCA chega a 100%, e o ruido faz a
 * densidade variar em manchas. Sempre resta alguma coisa atravessando
 * - silhueta, pedaco de tronco, vinco de copa. Nevoa densa, mas nada
 * de tela branca cobrindo tudo.
 *
 * =========================================================
 *  MOVIMENTO: UM VENTO SO, INDEPENDENTE DO JOGADOR
 * =========================================================
 * Tudo que se move aqui deriva de UM vetor (WIND, em metros por
 * segundo, no espaco local do grupo) e de um relogio absoluto. Nenhuma
 * conta de movimento olha para a camera, para a posicao do jogador ou
 * para o delta do quadro - por construcao, e impossivel a nevoa
 * "acompanhar" quem esta olhando:
 *
 *   a) ADVECCAO. As coordenadas em que o campo de ruido e amostrado sao
 *      deslocadas por -WIND * tempo. O campo inteiro (fatias e tufos)
 *      escorre pelo mundo na mesma direcao e no mesmo ritmo.
 *
 *   b) CISALHAMENTO (WIND_SHEAR). A velocidade cresce com a altura:
 *      +7,5% por metro. As lajes altas correm visivelmente mais que a
 *      rasteira, e e disso que vem a leitura de "camadas de ar" - o
 *      sinal mais forte de que aquilo tem profundidade. De graca: uma
 *      multiplicacao no shader.
 *
 *   c) RAJADAS (WIND_SWAY). Por cima da deriva constante, um vaivem
 *      lento e LIMITADO nos tres eixos (periodos de 170 a 300 s). E o
 *      que impede a leitura de "textura sendo puxada em linha reta": a
 *      nevoa acelera, hesita, assenta e volta a subir.
 *
 *   d) TRAVESSIA DOS TUFOS. Os tufos derivam com o vento e, ao sair por
 *      um lado do volume, voltam pelo outro (mod no vertex shader) -
 *      sempre nos ultimos EDGE_SIDE_FADE metros, onde a opacidade deles
 *      ja e zero, entao ninguem ve o salto. O jogador ve bancos de
 *      nevoa CHEGANDO e PASSANDO pela vista, indefinidamente.
 *
 * As velocidades sao propositalmente baixas (13 cm/s rente ao chao,
 * ~23 cm/s no veu de cima): so se percebe o movimento depois de olhar
 * pela janela por alguns segundos. Nada aqui e rapido o bastante para
 * ler como fumaca.
 *
 * =========================================================
 *  A CASA CONTINUA SENDO BARREIRA: A NEVOA COLIDE COM AS PAREDES
 * =========================================================
 * Garantido em QUATRO camadas independentes - se qualquer uma falhar,
 * as outras tres ainda seguram:
 *
 *   1. ANCORA. O grupo devolvido por createFogVolume e ancorado NA
 *      PAREDE, com o +Z local apontando para FORA da casa. Quem
 *      posiciona e gira e a cena, com os MESMOS dois numeros que ela ja
 *      calcula para o gramado e para a floresta (nenhuma conta nova).
 *      Nenhuma geometria de nevoa existe com z local < NEAR_EDGE (0.3):
 *      nao ha um unico vertice de neblina do lado de dentro da fachada.
 *
 *   2. TESTE DE PROFUNDIDADE. Tudo aqui e geometria normal com
 *      depthTest ligado, entao a parede solida da casa OCULTA a nevoa:
 *      ela so aparece no recorte do vao da janela (ver
 *      ExteriorFactory.buildWallGeometryWithHoles). De costas para a
 *      janela, o corredor esta exatamente como antes desta atualizacao.
 *
 *   3. COLISAO DE VERDADE (novidade desta revisao). Os comodos da casa
 *      chegam como retangulos (options.exclusions) e viram um campo de
 *      distancia assinada no shader. Cada tufo, DEPOIS de ser empurrado
 *      pelo vento, e testado contra esse campo e EMPURRADO PARA FORA
 *      pela face mais proxima (keepOutPush no vertex shader), mantendo
 *      uma folga de WISP_CLEARANCE metros da parede. Ou seja: a nevoa
 *      nao atravessa e nem simplesmente desaparece na parede - ela
 *      ESCORREGA ao longo dela, que e o que um gas empurrado pelo vento
 *      contra um obstaculo faz. O empurrao acontece por VERTICE (4 por
 *      tufo), nao por pixel: custo desprezivel.
 *
 *   4. CORTE POR FRAGMENTO. Por cima do empurrao, os DOIS sistemas
 *      zeram a opacidade dentro dos retangulos, no fragmento, usando a
 *      distancia assinada real do retangulo (cantos arredondados
 *      corretos, sem o vinco que o teste por eixo separado deixava).
 *      Isso vale inclusive para a metade de um tufo grande que fique
 *      sobre a parede: ele e FATIADO pelo comodo em vez de piscar
 *      inteiro. E daqui que vem a garantia final de que nenhum comodo -
 *      QUARTO 01, QUARTO 02, COZINHA, BANHEIRO ou a varanda - recebe um
 *      fio de bruma por dentro.
 *
 * A nevoa de DENTRO da casa continua sendo unica e exclusivamente a
 * scene.fog de sempre (scripts/atmosphere.js), cujos near/far esta
 * revisao NAO tocou.
 *
 * =========================================================
 *  ILUMINACAO E NOITE/DIA
 * =========================================================
 * A nevoa NAO e emissiva e nao inventa luz propria: a cor dela sai da
 * paleta atual de scripts/atmosphere.js (Atmosphere.NIGHT.mistColor /
 * Atmosphere.DAY.mistColor), o mesmo arquivo que ja e dono da
 * scene.fog e da cor de fundo do renderer, e o mesmo de onde o ceu
 * (models/sky-factory.js) le a cor do horizonte. Um lugar so decide a
 * atmosfera inteira; a neblina apenas obedece.
 *
 * Alem disso, cada fragmento de nevoa e misturado com a cor da
 * scene.fog conforme a propria distancia ate a camera (as uniforms
 * uFogColor/uFogNear/uFogFar, alimentadas pela mesma paleta). Isso
 * resolve a emenda: a nevoa proxima tem o tom frio dela, a nevoa
 * distante cai EXATAMENTE na cor em que a floresta e o ceu tambem se
 * dissolvem. Nada aparece "por cima" da imagem - tudo termina no
 * mesmo tom.
 *
 * Quando a historia vira o dia (setMorning(), chamado pela sequencia
 * de dormir com a tela preta - ver cutscenes/sleep-sequence.js), a
 * neblina troca de paleta junto com o resto do mundo, pelo mesmo
 * caminho que o chao, o gramado e a floresta ja usavam. De noite ela e
 * quase preta-azulada (nao ha luz nenhuma la fora; uma nevoa cinza
 * clara pareceria fosforescente); de dia, o cinza-azulado frio e
 * dessaturado da referencia.
 *
 * =========================================================
 *  DESEMPENHO - o jogo e mobile
 * =========================================================
 *  1. 7 draw calls por janela (6 fatias + 1 malha unica com os ~104
 *     tufos), ~220 triangulos no total. Nada de "milhares de objetos
 *     individuais": os tufos sao um unico BufferGeometry mesclado e o
 *     billboard de cada um acontece no vertex shader.
 *
 *  2. Zero trabalho de CPU por quadro. update() escreve um float (o
 *     tempo) por material e le dois numeros da matriz do grupo - sem
 *     percorrer particula, sem recalcular matriz, sem alocar objeto
 *     dentro do loop.
 *
 *  3. Quatro buscas de textura por fragmento nas fatias (duas por
 *     oitava do ruido 3D, duas oitavas) e tres nos tufos. O ruido e uma
 *     textura 128x128 gerada UMA vez por procedimento (fBm de ruido de
 *     valor, periodico e portanto sem costura), compartilhada pelas
 *     tres janelas. Buscas em cache custam uma fracao de um ruido
 *     analitico de varias oitavas, que e o que a maioria das
 *     implementacoes faz - e num chip movel isso e a diferenca entre
 *     caber e nao caber no orcamento de quadro.
 *
 *  4. Nenhum discard, em lugar nenhum. E deliberado: discard desliga o
 *     early-Z das GPUs moveis (Mali/Adreno). Sem ele, a parede opaca
 *     da casa - ja desenhada e ja no depth buffer - rejeita de graca a
 *     maior parte dos fragmentos de nevoa antes de o shader rodar. Na
 *     pratica so o retangulo do vao da janela chega a custar algo.
 *
 *  5. Esferas de corte (frustum culling) definidas na mao, mesmo
 *     motivo ja documentado em models/grass-field-factory.js e
 *     models/tree-forest-factory.js: de costas para a janela, a nevoa
 *     inteira sai da lista de desenho.
 *
 *  6. depthWrite: false e renderOrder 0 (o padrao). Os dois importam:
 *     sem depthWrite a nevoa nao se auto-oculta, e com renderOrder 0
 *     ela e desenhada ANTES do vidro da janela (renderOrder 1 e 2 em
 *     models/window-glass-factory.js) - ou seja, o tingimento do vidro
 *     e o brilho diagonal continuam por cima da paisagem, como antes.
 *
 *  7. precision: "highp" nos dois materiais. A advecao soma metros ao
 *     longo de toda a partida (13 cm/s x meia hora = 234 m) antes de
 *     virar coordenada de textura; em mediump isso perderia a parte
 *     fracionaria e o ruido comecaria a "degrauzar" depois de alguns
 *     minutos de jogo. O three.js cai para mediump sozinho onde highp
 *     nao existir, e o dithering (bayer2) ja e escrito para sobreviver
 *     a isso.
 *
 * =========================================================
 *  ESTETICA PSX
 * =========================================================
 * O resultado passa por dithering ordenado 4x4 (Bayer) e e quantizado
 * em 5 bits por canal, que e a profundidade de cor real do framebuffer
 * do PS1. Em vez de um degrade suave e moderno, a nevoa fecha em
 * faixas com o padrao xadrez caracteristico do hardware da epoca -
 * casando com o serrilhado da folhagem (alphaTest da floresta), com o
 * wobble de vertice das janelas e com os 320x180 de resolucao interna.
 * A matriz de Bayer e deslocada por camada para os padroes das seis
 * fatias nao se alinharem e virarem moire.
 *
 * window.FogVolumeFactory.createFogVolume({ seed, exclusions })
 *   -> { group, update(delta, elapsed), setDaytime, setMorning }
 * -------------------------------------------------
 */

window.FogVolumeFactory = (function () {
  "use strict";

  // =========================================================
  //  Espaco ocupado pela nevoa (metros, espaco LOCAL do grupo:
  //  origem no pe da parede, +Z para fora da casa, Y = 0 no chao)
  // =========================================================

  // Meia-largura das fatias. O terreno externo de cada janela e um
  // quadrado de ExteriorFactory.GROUND_SIZE (60) centrado nela, ou
  // seja, so ha chao ate 30 unidades para cada lado; 26 mantem a nevoa
  // dentro dele com a folga que o esmaecimento lateral
  // (EDGE_SIDE_FADE) precisa para acabar sem mostrar uma borda reta.
  const LATERAL_HALF = window.ExteriorFactory.GROUND_SIZE / 2 - 4;

  // Onde as camadas comecam e terminam ao longo do +Z local. NEAR_EDGE
  // e o que garante, por geometria, que nao existe nevoa dentro da
  // casa (ver o bloco dedicado no topo). FAR_EDGE passa de proposito
  // MUITO alem do ponto em que a nevoa ja fechou 100%, assim a borda
  // externa dos planos nunca chega a ser vista.
  const NEAR_EDGE = 0.3;
  const FAR_EDGE = 34;

  // Esmaecimentos de borda (em metros) - nenhuma aresta reta de plano
  // pode aparecer na tela, em nenhum angulo. EDGE_SIDE_FADE tem um
  // segundo emprego desde esta revisao: e a faixa em que os tufos que
  // atravessam a vista somem antes de reaparecer pelo outro lado (ver
  // o item d do bloco MOVIMENTO no topo), entao ele nao pode ser
  // encurtado sem o salto do wrap ficar visivel.
  const EDGE_NEAR_FADE = 2.2; // sobe de 0 a 1 de NEAR_EDGE ate NEAR_EDGE + isto
  const EDGE_SIDE_FADE = 7.0; // cai a 0 nos ultimos N metros de LATERAL_HALF
  const EDGE_FAR_FADE = 5.0;  // cai a 0 nos ultimos N metros de FAR_EDGE

  // =========================================================
  //  Rampa de profundidade (ver o bloco "PROFUNDIDADE" no topo)
  // =========================================================
  // Distancia (da JANELA) em que a nevoa comeca a adensar e em que ela
  // atinge a densidade maxima. RAMP_FLOOR e o veu minimo que existe
  // mesmo colado na casa - o suficiente para o ar nunca parecer limpo
  // demais logo depois do vidro, sem tampar a grama de perto.
  const RAMP_NEAR = 5.5;
  const RAMP_FAR = 26.0;
  const RAMP_FLOOR = 0.09;
  const RAMP_EXP = 2.5;

  // Os tufos usam a MESMA rampa com numeros bem mais suaves: eles nao
  // sao a massa da nevoa (isso e trabalho das fatias), sao a estrutura
  // e o movimento visivel ENTRE as arvores - e isso precisa ser
  // percebido ja na primeira faixa da mata, a 8-15 metros, nao so no
  // horizonte.
  const WISP_RAMP_FLOOR = 0.45;
  const WISP_RAMP_EXP = 1.2;

  // =========================================================
  //  O VENTO (ver o bloco "MOVIMENTO" no topo)
  // =========================================================
  // Um vetor so, em METROS POR SEGUNDO, no espaco LOCAL do grupo
  // (x = lateral da janela, z = para fora da casa). Fatias e tufos
  // usam este mesmo vetor - e isso que faz o conjunto ler como UMA
  // massa de ar em vez de varias texturas indo para lados diferentes.
  //
  // Por que LOCAL e nao mundo: o +X local e sempre "de um lado a outro
  // do vao da janela", qualquer que seja a parede. Um vento definido no
  // mundo apareceria de frente numa janela e de lado na outra; definido
  // aqui, ele atravessa a vista das TRES, que e o enquadramento em que
  // o movimento e percebido. As tres janelas nunca aparecem juntas na
  // tela (dao para terrenos separados), entao nao existe o problema de
  // "o vento sopra para dois lados ao mesmo tempo".
  //
  // 0.13 m/s = 7.8 m/min rente ao chao. Lento de proposito: e para o
  // jogador demorar alguns segundos para ter certeza de que a nevoa se
  // move, nao para parecer fumaca de maquina.
  const WIND = [0.13, 0.022];

  // Cisalhamento: quanto por metro de altura a velocidade cresce.
  // 0.075 = +7.5%/m, ou seja, o veu de 4 m corre 30% mais rapido que a
  // camada rasteira. E o sinal mais forte de profundidade que a nevoa
  // tem, e custa uma multiplicacao.
  const WIND_SHEAR = 0.075;

  // Rajadas: vaivem lento e LIMITADO por cima da deriva constante, em
  // metros, nos eixos x / z / y - e o periodo (rad/s) de cada um.
  // Limitado importa: a componente constante do vento pode crescer sem
  // limite (e so a coordenada de amostragem do ruido), mas o vaivem que
  // move OS TUFOS precisa caber no volume.
  //
  // Periodos: 2*pi/0.037 ~ 170 s, 2*pi/0.029 ~ 217 s, 2*pi/0.021 ~ 300 s.
  // Nunca coincidem em fase, entao o vento nunca repete o mesmo ciclo.
  // O eixo Y e o que faz a nevoa assentar e subir sozinha.
  const WIND_SWAY = [1.7, 1.15, 0.4];
  const WIND_SWAY_RATE = [0.037, 0.029, 0.021];

  // Quantas "fatias" do campo de ruido 3D cabem em um metro de altura
  // (ver o bloco "O CAMPO DE RUIDO E 3D" no topo). 0.34 = uma fatia
  // nova a cada ~2.9 m, na mesma ordem de grandeza das manchas
  // horizontais - a nevoa fica com estrutura vertical sem virar um
  // sanduiche de camadas visiveis.
  const NOISE_Y_SCALE = 0.34;

  // =========================================================
  //  As seis fatias
  // =========================================================
  // y      : altura da laje, em metros (o chao externo e y = 0 e o
  //          centro das janelas fica a 1.85 - ver as cenas).
  // weight : peso na densidade. Cai com a altura: a neblina e mais
  //          pesada rente ao chao e vai rareando para cima, como
  //          qualquer nevoa de radiacao de verdade.
  // scale  : escala do ruido (1/metros). Fatias baixas tem manchas
  //          menores; as altas, manchas largas e preguicosas.
  // span   : MEIA-ESPESSURA da laje, em metros - o quanto o shader
  //          afasta as duas amostras ao longo do raio de visao (ver o
  //          item b do bloco "ESPESSURA OTICA" no topo). Cresce com a
  //          altura junto com o espacamento entre as lajes: cada uma
  //          representa a sua fatia de ar, sem vao nem sobreposicao
  //          grosseira.
  // warp   : intensidade do domain warping da segunda amostra.
  // dither : deslocamento da matriz de Bayer, para os padroes das seis
  //          fatias nao se sobreporem alinhados.
  // cap    : teto de opacidade DESTA laje. Nenhuma sozinha chega a
  //          100%: e o que garante que sempre reste alguma coisa da
  //          floresta atravessando a nevoa, por mais fechada que ela
  //          esteja. Cai um pouco nas de cima para o ceu nunca fechar
  //          num cinza chapado.
  // floor  : piso PROPRIO da rampa de profundidade desta fatia, ou
  //          seja, quanta nevoa ela tem colada na casa, antes de a
  //          distancia comecar a adensar (RAMP_FLOOR e o padrao).
  //          As tres fatias de baixo levam um piso bem maior de
  //          proposito: e a NEVOA RASTEIRA, a que tem de estar visivel
  //          deitada sobre a grama logo do outro lado do vidro, e nao
  //          so la na orla da mata. Como as fatias altas continuam com
  //          o piso baixo, isso NAO embaca a vista de perto - so poe
  //          uma camada rala no chao, exatamente onde uma nevoa de
  //          radiacao se acumularia.
  const SHEETS = [
    // Rasteira: a que passa POR CIMA DA GRAMA. E a camada que o
    // jogador ve primeiro ao olhar para baixo pela janela.
    { y: 0.18, weight: 1.00, scale: 0.032, span: 0.55, warp: 0.20, dither: [0, 0], cap: 0.86, floor: 0.26 },
    { y: 0.55, weight: 0.92, scale: 0.027, span: 0.70, warp: 0.23, dither: [1, 2], cap: 0.86, floor: 0.19 },
    // Corpo baixo: o vao entre a grama e o primeiro terco dos troncos.
    { y: 1.05, weight: 0.78, scale: 0.023, span: 0.85, warp: 0.25, dither: [2, 1], cap: 0.84, floor: 0.13 },
    // Corpo medio: bem na altura do olhar pela janela.
    { y: 1.75, weight: 0.60, scale: 0.019, span: 1.05, warp: 0.27, dither: [3, 3], cap: 0.82 },
    // Alta: entre as copas da primeira faixa e as das faixas de tras.
    { y: 2.70, weight: 0.42, scale: 0.015, span: 1.30, warp: 0.30, dither: [1, 3], cap: 0.80 },
    // Veu: por cima da mata, fechando o ceu contra o horizonte.
    { y: 4.00, weight: 0.24, scale: 0.011, span: 1.60, warp: 0.34, dither: [2, 0], cap: 0.76 },
  ];

  // Densidade global. E o unico numero que se mexe para deixar a
  // neblina do jogo inteiro mais ou menos fechada; todo o resto e
  // proporcao.
  //
  // 0.132 e 0.16 (o valor das cinco fatias da revisao anterior)
  // reescalado por 3.24/3.96 - a razao entre a soma dos pesos de antes
  // e a de agora. Sao seis lajes no lugar de cinco, entao manter o
  // mesmo numero teria deixado a vista ~20% mais fechada de graca; a
  // tabela do bloco "PROFUNDIDADE" continua valendo com este valor.
  const SHEET_DENSITY = 0.132;

  // Piso do |cos| da formula de Beer-Lambert. Sem ele, olhar
  // EXATAMENTE na horizontal daria caminho otico infinito (divisao por
  // zero) e a linha do horizonte viraria uma faixa branca dura.
  const MIN_NDV = 0.1;

  // Teto da meia-corda de amostragem, em metros. Perto da horizontal,
  // span/|cos| explode; sem teto, as duas amostras iriam parar em
  // regioes tao distantes do campo que a media viraria um cinza morto
  // (e, pior, coordenadas grandes o bastante para custar precisao).
  // 11 m e mais que a maior mancha de ruido da laje mais fina.
  const SPAN_MAX = 11.0;

  // Quanto o ruido bagunca o |cos| do Beer-Lambert. Serve para UMA
  // coisa: o ponto em que uma laje horizontal satura e sempre a altura
  // do olhar, o que desenha uma LINHA RETA na tela - e seis lajes
  // desenhariam seis linhas empilhadas. Com o |cos| perturbado pelo
  // ruido, essa linha vira uma borda irregular e organica, e as seis
  // deixam de se alinhar.
  const NDV_JITTER = 0.5;

  // =========================================================
  //  Os tufos (fatias do campo 3D que encaram a camera)
  // =========================================================
  // count   : quantos cartoes nesta faixa.
  // from/to : distancia (metros da janela) em que sao sorteados. A
  //           primeira faixa comeca em 7.5 para casar com a clareira
  //           de grama da floresta (CLEARING_FLOOR = 8 em
  //           models/tree-forest-factory.js): os tufos nascem
  //           exatamente onde as primeiras arvores comecam.
  // size    : lado do cartao, em metros. Cresce com a distancia pelo
  //           mesmo motivo que o porte das arvores cresce (ver
  //           tree-forest-factory.js): a partir de ~20 metros a tela
  //           nao distingue mais tamanho, so massa - cartoes maiores e
  //           menos numerosos cobrem a mesma area por uma fracao do
  //           custo de preenchimento.
  // maxY    : altura maxima do centro. O sorteio e enviesado para
  //           baixo (ver Y_BIAS), entao a maioria fica rente ao chao.
  // sway    : amplitude, em metros, do vaivem PROPRIO do tufo por cima
  //           da deriva do vento (cada um com fase propria, entao a
  //           massa nao anda em bloco).
  // weight  : peso na densidade da faixa.
  const WISP_BANDS = [
    { count: 38, from: 7.5, to: 14, size: [3.2, 6.6], maxY: 2.6, sway: 1.5, weight: 0.85 },
    { count: 38, from: 14, to: 20, size: [5.6, 10.5], maxY: 3.8, sway: 2.1, weight: 1.0 },
    { count: 28, from: 20, to: 27, size: [9.5, 15.5], maxY: 5.6, sway: 2.8, weight: 1.0 },
  ];

  // Vies do sorteio de altura: rnd^Y_BIAS. Maior que 1 empurra o
  // resultado para perto de 0, ou seja, para o chao.
  const Y_BIAS = 1.7;

  // Abertura angular do leque de tufos em torno do "reto para fora da
  // janela". Um pouco mais de 180 graus no total: cobre inclusive o
  // que o jogador ve olhando de esguelha pelo vidro, sem gastar
  // cartoes atras da propria parede.
  const WISP_SPREAD = 1.75; // radianos para cada lado (~100 graus)

  // Densidade otica no MIOLO de um tufo. Diferente da revisao anterior,
  // que multiplicava uma opacidade fixa e chapada: agora o tufo tambem
  // passa por Beer-Lambert, e o caminho otico dele e a integral EXATA de
  // uma esfera de densidade parabolica, ro(r) = 1 - r^2. Integrada ao
  // longo da corda a distancia r do centro de uma bola de raio 1:
  //
  //     caminho(r) = (4/3) * (1 - r^2)^1.5
  //
  // Vale escrever a formula certa em vez de chutar um sqrt. A integral da
  // esfera SOLIDA, sqrt(1 - r^2), tem derivada infinita na borda, e uma
  // derivada infinita ali desenha um circulo nitido em volta de cada
  // tufo - exatamente o contorno de adesivo que esta revisao existe para
  // eliminar. A parabolica chega a zero com derivada finita: miolo denso,
  // beirada rala, e nenhuma aresta de cartao visivel em opacidade
  // nenhuma.
  //
  // 0.95 vezes o pico do caminho otico (4/3) satura em
  // 1 - exp(-1.27) = 72%, cortado por WISP_ALPHA_CAP - e so no centro
  // exato de um tufo em que o ruido tambem esteja no maximo. Na pratica
  // os valores uteis ficam entre 12% e 40%: os tufos somam estrutura e
  // movimento sobre as fatias, nao opacidade. Quem fecha a vista sao as
  // lajes.
  const WISP_DENSITY = 0.95;
  const WISP_ALPHA_CAP = 0.62;

  // Escala do ruido dos tufos (1/metros) e o multiplicador da segunda
  // oitava. Bem mais finas que as das fatias: e daqui que vem o recorte
  // irregular da beirada e o miolo rasgado de cada banco de nevoa.
  //
  // Os dois numeros atendem AS DUAS pontas da faixa de tamanhos:
  // 1/0.085 = 11.8 m da a forma geral dos tufos grandes do fundo (ate
  // 15.5 m de lado), e 1/(0.085*3.5) = 3.4 m da textura interna aos
  // pequenos da frente (3.2 m), que num campo so de manchas largas
  // sairiam como bolas lisas. Escala fixa em metros de MUNDO, igual para
  // todos os tufos: e o que mantem eles e as fatias amostrando o mesmo
  // gas em vez de dois efeitos empilhados.
  const WISP_NOISE_SCALE = 0.085;
  const WISP_NOISE_OCTAVE = 3.5;

  // Onde os tufos terminam de aparecer, indo da parede para fora.
  const WISP_FADE_IN = [6.0, 9.5];

  // Trava dura de fachada: nenhum tufo passa disto na direcao da casa,
  // por mais que vento, vaivem e empurrao de parede o puxem. Fica
  // confortavelmente antes do fim do esmaecimento de WISP_FADE_IN,
  // entao a trava nunca aparece como um corte.
  const WISP_MIN_Z = 5.2;

  // Folga, em metros, que um tufo mantem das paredes dos comodos (ver
  // o item 3 do bloco da barreira, no topo). E o raio da "colisao":
  // dentro dela o tufo e empurrado para fora pela face mais proxima.
  const WISP_CLEARANCE = 1.2;

  // ---------- Retangulos de "nada de nevoa aqui" ----------
  // Quantos cada volume aceita (ver options.exclusions em
  // createFogVolume) e a largura, em metros, da borda em que a nevoa
  // desaparece ao entrar num deles.
  //
  // Diferente da grama e da floresta, aqui NAO da para "nao sortear":
  // cada fatia e um retangulo unico de 52 x 34 metros, nao um monte de
  // instancias. Entao a exclusao acontece no fragmento: dentro do
  // retangulo, a opacidade vai a zero. Custo: uma distancia de
  // retangulo por fragmento por comodo relevante (hoje, no maximo dois
  // por janela), sem nenhum draw call, material ou geometria extra.
  //
  // Sem isto, as fatias (que comecam a 30 cm da fachada, ver NEAR_EDGE)
  // atravessariam a COZINHA e o BANHEIRO por dentro: como elas nao
  // escrevem profundidade e ficam nas alturas 0.18 a 4.0 - todas abaixo
  // do pe-direito de 4.2 -, o jogador veria faixas de bruma dentro de
  // um comodo fechado.
  const KEEPOUT_MAX = 4;
  const KEEPOUT_FEATHER = 0.6;

  // Esferas de corte, mesmo motivo (e mesma generosidade) das da grama
  // e da floresta - ver o item 5 do bloco "DESEMPENHO" no topo.
  const SHEET_SPHERE_CENTER = new THREE.Vector3(0, 2, 17);
  const SHEET_SPHERE_RADIUS = 40;
  const WISP_SPHERE_CENTER = new THREE.Vector3(0, 3, 17);
  const WISP_SPHERE_RADIUS = 36;

  // =========================================================
  //  Sorteio deterministico
  // =========================================================
  // mulberry32: o MESMO gerador da grama e da floresta, e pelo mesmo
  // motivo - a nevoa de cada janela precisa nascer identica toda vez
  // que a cena e remontada (o jogador entra e sai do quarto varias
  // vezes, ver cutscenes/room-transition.js), e as tres janelas
  // precisam ter distribuicoes DIFERENTES entre si. Nada de
  // Math.random em lugar nenhum deste arquivo.
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

  function hashSeed(text) {
    let h = 0x811c9dc5;
    const s = String(text || "neblina");
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // =========================================================
  //  Textura de ruido (gerada uma vez para o jogo inteiro)
  // =========================================================
  // fBm de RUIDO DE VALOR PERIODICO. "Periodico" e a palavra
  // importante: cada oitava usa uma grade cujo periodo DIVIDE o
  // tamanho da textura, e o vizinho da ultima celula e a primeira (o
  // wrap por modulo no lattice abaixo). Assim a textura repete sem
  // nenhuma costura visivel, o que aqui e obrigatorio duas vezes: as
  // fatias amostram o ruido em coordenadas de dezenas de metros (ou
  // seja, repetem a textura varias vezes dentro da mesma tela) E o
  // campo 3D e montado deslocando essa mesma textura (ver slice3
  // abaixo), o que so funciona se ela puder ser deslocada em qualquer
  // direcao sem mostrar emenda.
  //
  // Tres canais independentes, para os shaders combinarem amostras que
  // nao correlacionam entre si:
  //   R -> manchas largas   (a forma geral dos bancos de nevoa)
  //   G -> detalhe medio    (a segunda amostra, com domain warping)
  //   B -> erosao dos tufos (recorte irregular dos cartoes)
  const NOISE_SIZE = 128;
  let noiseTexture = null;

  function buildLattice(period, rnd) {
    const grid = new Float32Array(period * period);
    for (let i = 0; i < grid.length; i++) {
      grid[i] = rnd();
    }
    return function sample(u, v) {
      const fx = u * period;
      const fy = v * period;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      let tx = fx - ix;
      let ty = fy - iy;
      // Suavizacao de Hermite (a mesma curva do smoothstep): sem ela o
      // ruido de valor mostra as arestas da grade.
      tx = tx * tx * (3 - 2 * tx);
      ty = ty * ty * (3 - 2 * ty);
      const x0 = ((ix % period) + period) % period;
      const y0 = ((iy % period) + period) % period;
      const x1 = (x0 + 1) % period;
      const y1 = (y0 + 1) % period;
      const a = grid[y0 * period + x0];
      const b = grid[y0 * period + x1];
      const c = grid[y1 * period + x0];
      const d = grid[y1 * period + x1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    };
  }

  function buildFbmChannel(periods, weights, rnd) {
    const octaves = periods.map(function (period) {
      return buildLattice(period, rnd);
    });
    const values = new Float32Array(NOISE_SIZE * NOISE_SIZE);
    let min = Infinity;
    let max = -Infinity;
    for (let y = 0; y < NOISE_SIZE; y++) {
      for (let x = 0; x < NOISE_SIZE; x++) {
        const u = x / NOISE_SIZE;
        const v = y / NOISE_SIZE;
        let sum = 0;
        for (let o = 0; o < octaves.length; o++) {
          sum += octaves[o](u, v) * weights[o];
        }
        const i = y * NOISE_SIZE + x;
        values[i] = sum;
        if (sum < min) min = sum;
        if (sum > max) max = sum;
      }
    }
    // Normaliza para 0-1: garante que o contraste do ruido nao dependa
    // da sorte do sorteio das grades.
    const range = max - min || 1;
    for (let i = 0; i < values.length; i++) {
      values[i] = (values[i] - min) / range;
    }
    return values;
  }

  function getNoiseTexture() {
    if (noiseTexture) {
      return noiseTexture;
    }
    // Semente fixa: a textura de ruido e a mesma em toda partida do
    // jogo (o que muda de janela para janela e a POSICAO em que cada
    // uma amostra essa textura, ver uNoiseOffset).
    const rnd = mulberry32(0x5eed1a7e);
    const r = buildFbmChannel([3, 6, 12], [0.55, 0.3, 0.15], rnd);
    const g = buildFbmChannel([6, 12, 24], [0.5, 0.3, 0.2], rnd);
    const b = buildFbmChannel([4, 8, 16, 32], [0.42, 0.28, 0.18, 0.12], rnd);

    const data = new Uint8Array(NOISE_SIZE * NOISE_SIZE * 4);
    for (let i = 0; i < NOISE_SIZE * NOISE_SIZE; i++) {
      data[i * 4 + 0] = Math.round(r[i] * 255);
      data[i * 4 + 1] = Math.round(g[i] * 255);
      data[i * 4 + 2] = Math.round(b[i] * 255);
      data[i * 4 + 3] = 255;
    }

    noiseTexture = new THREE.DataTexture(data, NOISE_SIZE, NOISE_SIZE, THREE.RGBAFormat);
    noiseTexture.wrapS = THREE.RepeatWrapping;
    noiseTexture.wrapT = THREE.RepeatWrapping;
    // AQUI a filtragem e LINEAR, ao contrario de praticamente toda
    // textura do jogo (ver materials/textures.js). Nao e descuido: com
    // NearestFilter o ruido viraria blocos duros de 128 px esticados
    // por dezenas de metros. O "pixel cru" do PSX nesta camada vem do
    // dithering + quantizacao de 5 bits do shader e dos 320x180 de
    // resolucao interna, que e onde ele realmente pertence.
    noiseTexture.magFilter = THREE.LinearFilter;
    noiseTexture.minFilter = THREE.LinearFilter;
    noiseTexture.generateMipmaps = false;
    noiseTexture.encoding = THREE.LinearEncoding;
    noiseTexture.needsUpdate = true;
    return noiseTexture;
  }

  // =========================================================
  //  Trechos de GLSL compartilhados
  // =========================================================

  // Matriz de Bayer 4x4 por aritmetica pura. E de proposito que nao ha
  // nenhum array nem matriz indexada aqui: indexacao dinamica de array
  // e proibida/instavel em GLSL ES 1.00 (que e o que o three.js r128
  // gera para WebGL 1), e WebGL 1 e o alvo real num celular.
  //
  // bayer2 devolve a matriz classica [[0, .5], [.75, .25]]; bayer4 a
  // constroi recursivamente e entrega 16 niveis em [0, 0.9375).
  const GLSL_DITHER = [
    "float bayer2(vec2 a) {",
    // O `mod(..., 2.0)` NAO e decorativo: sem ele o argumento seria
    // gl_FragCoord cru e `a.y * a.y` chegaria a ~32000, um valor que um
    // fragment shader forcado a `mediump` (GPUs moveis antigas, onde o
    // three.js nao consegue `highp`) nem sequer consegue representar com
    // parte fracionaria - o `fract` devolveria lixo e o dithering viraria
    // ruido. Reduzido ao periodo 2 antes da conta, tudo acontece entre 0 e
    // 1 e o padrao fica identico em qualquer precisao.
    "  a = mod(floor(a), 2.0);",
    "  return fract(a.x * 0.5 + a.y * a.y * 0.75);",
    "}",
    "float bayer4(vec2 a) {",
    "  return bayer2(0.5 * a) * 0.25 + bayer2(a);",
    "}",
    // 5 bits por canal = as 32 tonalidades por componente do
    // framebuffer real do PS1, com o dither espalhando o erro.
    "vec3 psxQuantize(vec3 c, float d) {",
    "  return floor(c * 31.0 + d) / 31.0;",
    "}",
  ].join("\n");

  // ---------------------------------------------------------
  //  O CAMPO DE RUIDO 3D
  // ---------------------------------------------------------
  // slice3 le o campo tridimensional a partir da textura 2D periodica:
  // a altura (`sl`, em unidades de fatia) escolhe duas fatias inteiras
  // vizinhas e a parte fracionaria interpola entre elas, com a mesma
  // curva de Hermite do gerador da textura (senao a interpolacao
  // vertical apareceria como bandas).
  //
  // Cada fatia inteira e a MESMA textura deslocada por um multiplo da
  // razao aurea (0.7548776, 0.5698403 - os inversos de phi em duas
  // dimensoes). E o deslocamento que menos correlaciona amostras
  // vizinhas: duas fatias consecutivas mostram desenhos que nao tem
  // parentesco visivel, que e exatamente o que se espera de um campo 3D.
  // Como a textura e periodica, deslocar assim nao produz emenda.
  //
  // `ch` seleciona o canal por produto escalar - evita escrever a mesma
  // funcao tres vezes, e uma instrucao de ALU e mais barata que uma
  // busca de textura extra.
  const GLSL_NOISE3 = [
    "float slice3(vec2 uv, float sl, vec4 ch) {",
    "  float f = floor(sl);",
    "  float t = fract(sl);",
    "  t = t * t * (3.0 - 2.0 * t);",
    "  vec2 g = vec2(0.7548776, 0.5698403);",
    // fract() antes da busca: mantem a coordenada em [0,1) mesmo depois
    // de a advecao somar centenas de metros ao longo da partida. Nao
    // muda o resultado (a textura e RepeatWrapping), so protege a
    // precisao. Ver o item 7 do bloco DESEMPENHO no topo.
    "  float a = dot(texture2D(uNoise, fract(uv + g * f)), ch);",
    "  float b = dot(texture2D(uNoise, fract(uv + g * (f + 1.0))), ch);",
    "  return mix(a, b, t);",
    "}",
  ].join("\n");

  // ---------------------------------------------------------
  //  ADVECAO PELO VENTO
  // ---------------------------------------------------------
  // Recebe um ponto do mundo e devolve ONDE, no campo de nevoa, aquele
  // ponto estava quando o vento comecou a soprar - ou seja, a
  // coordenada em que o ruido deve ser lido. Subtrair o deslocamento do
  // ponto (em vez de somar ao ruido) e o que faz a nevoa parecer
  // ATRAVESSAR o cenario.
  //
  // NAO depende de camera, de posicao do jogador nem de delta de
  // quadro: so de uTime. Por construcao, e impossivel esta nevoa
  // "acompanhar" quem esta olhando - era o defeito principal da revisao
  // anterior.
  const GLSL_FLOW = [
    "vec3 fogFlow(vec3 world) {",
    // Perfil de vento: mais rapido em cima. max(y,0) porque as amostras
    // ao longo do raio podem cair abaixo do chao.
    "  float shear = 1.0 + max(world.y, 0.0) * " + WIND_SHEAR.toFixed(4) + ";",
    "  vec3 off = vec3(uWind.x, 0.0, uWind.y) * (uTime * shear);",
    "  off.x += " + WIND_SWAY[0].toFixed(3) + " * sin(uTime * " + WIND_SWAY_RATE[0].toFixed(4) + ");",
    "  off.z += " + WIND_SWAY[1].toFixed(3) + " * cos(uTime * " + WIND_SWAY_RATE[1].toFixed(4) + ");",
    "  off.y += " + WIND_SWAY[2].toFixed(3) + " * sin(uTime * " + WIND_SWAY_RATE[2].toFixed(4) + ");",
    "  return world - off;",
    "}",
  ].join("\n");

  // A rampa de profundidade descrita no topo, usada pelos dois
  // sistemas com parametros diferentes.
  const GLSL_RAMP = [
    "float depthRamp(float dist, float rNear, float rFar, float rFloor, float rExp) {",
    "  float t = clamp((dist - rNear) / max(rFar - rNear, 0.001), 0.0, 1.0);",
    // max(t, 1e-4): pow(0.0, x) e formalmente indefinido em GLSL ES 1.00
    // e ja devolveu NaN em drivers moveis reais. O piso e pequeno demais
    // para mudar a curva e grande o bastante para nunca cair no caso
    // patologico.
    "  return rFloor + (1.0 - rFloor) * pow(max(t, 0.0001), rExp);",
    "}",
  ].join("\n");

  // ---------------------------------------------------------
  //  AS PAREDES: DISTANCIA ASSINADA, MASCARA E EMPURRAO
  // ---------------------------------------------------------
  // Os comodos chegam como vec4(minX, maxX, minZ, maxZ) no espaco
  // LOCAL do grupo. O array de uniforms tem tamanho fixo (o GLSL exige)
  // e uKeepOutCount diz quantos valem de verdade - com 0, o laco quebra
  // na primeira volta e a nevoa sai identica a de um terreno vazio.
  //
  // rectSdf: distancia assinada ao retangulo (negativa dentro). E a
  // formula canonica de caixa 2D - vale a troca pelo teste por eixo
  // separado da revisao anterior porque ela acerta os CANTOS: o
  // esmaecimento vira um raio arredondado em volta do comodo em vez de
  // um vinco em cruz nas quinas.
  //
  // keepOutMask: 1 = ar livre, 0 = dentro de comodo. Usada por
  // fragmento nos dois sistemas.
  //
  // keepOutPush: o vetor que tira um tufo de dentro (ou de perto) de uma
  // parede, pela face em que ele esta MENOS enfiado - o mesmo criterio
  // de um resolvedor de colisao de caixa. Usada por VERTICE, so nos
  // tufos: e ela que faz a nevoa escorregar ao longo da parede em vez de
  // atravessar ou sumir.
  const GLSL_KEEPOUT = [
    "float rectSdf(vec2 p, vec4 r) {",
    "  vec2 c = vec2((r.x + r.y) * 0.5, (r.z + r.w) * 0.5);",
    "  vec2 h = vec2((r.y - r.x) * 0.5, (r.w - r.z) * 0.5);",
    "  vec2 d = abs(p - c) - h;",
    "  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);",
    "}",
    "float keepOutMask(vec2 p) {",
    "  float m = 1.0;",
    "  for (int i = 0; i < " + KEEPOUT_MAX + "; i++) {",
    "    if (i >= uKeepOutCount) { break; }",
    "    m = min(m, smoothstep(0.0, " + KEEPOUT_FEATHER.toFixed(2) + ", rectSdf(p, uKeepOut[i])));",
    "  }",
    "  return m;",
    "}",
  ].join("\n");

  const GLSL_KEEPOUT_PUSH = [
    "vec2 keepOutPush(vec2 p) {",
    "  vec2 push = vec2(0.0);",
    "  for (int i = 0; i < " + KEEPOUT_MAX + "; i++) {",
    "    if (i >= uKeepOutCount) { break; }",
    "    vec4 r = uKeepOut[i];",
    "    vec2 c = vec2((r.x + r.y) * 0.5, (r.z + r.w) * 0.5);",
    "    vec2 h = vec2((r.y - r.x) * 0.5, (r.w - r.z) * 0.5);",
    "    vec2 d = p - c;",
    "    vec2 ad = abs(d) - h;",
    "    float sd = length(max(ad, 0.0)) + min(max(ad.x, ad.y), 0.0);",
    // Face de saida: o eixo em que ele esta MENOS enfiado. step() em vez
    // de if/ternario por habito de shader movel (sem divergencia).
    "    float pickX = step(ad.y, ad.x);",
    "    vec2 n = vec2(sign(d.x) * pickX, sign(d.y) * (1.0 - pickX));",
    // Empurra so o que falta para respeitar a folga, e nada quando o
    // tufo ja esta longe: max(0, folga - distancia).
    "    push += n * max(" + WISP_CLEARANCE.toFixed(2) + " - sd, 0.0);",
    "  }",
    "  return push;",
    "}",
  ].join("\n");

  // =========================================================
  //  Shader das fatias
  // =========================================================
  const SHEET_VERTEX = [
    "varying vec2 vXZ;",       // posicao LOCAL no plano (x = lateral, y = profundidade)
    "varying vec3 vWorld;",    // posicao de mundo, para o raio de visao por fragmento
    "varying float vFogDepth;", // distancia ate a camera, para a scene.fog manual
    "void main() {",
    "  vXZ = vec2(position.x, position.z);",
    "  vec4 world = modelMatrix * vec4(position, 1.0);",
    "  vWorld = world.xyz;",
    "  vec4 mv = viewMatrix * world;",
    "  vFogDepth = -mv.z;",
    "  gl_Position = projectionMatrix * mv;",
    "}",
  ].join("\n");

  const SHEET_FRAGMENT = [
    "uniform sampler2D uNoise;",
    "uniform vec2 uNoiseOffset;",
    "uniform float uTime;",
    "uniform vec2 uWind;",
    "uniform vec3 uColor;",
    "uniform vec3 uFogColor;",
    "uniform float uFogNear;",
    "uniform float uFogFar;",
    "uniform float uDensity;",
    "uniform float uWeight;",
    "uniform float uScale;",
    "uniform float uSpan;",
    "uniform float uWarp;",
    "uniform float uCap;",
    "uniform float uRampFloor;",
    "uniform vec2 uDither;",
    "uniform float uLateral;",
    "uniform float uFarEdge;",
    "uniform int uKeepOutCount;",
    "uniform vec4 uKeepOut[" + KEEPOUT_MAX + "];",
    "",
    "varying vec2 vXZ;",
    "varying vec3 vWorld;",
    "varying float vFogDepth;",
    "",
    GLSL_DITHER,
    GLSL_NOISE3,
    GLSL_FLOW,
    GLSL_RAMP,
    GLSL_KEEPOUT,
    "",
    "void main() {",
    // Distancia ate a JANELA (nao ate a camera): e o que a rampa de
    // profundidade usa, e e por isso que a parede de nevoa fica parada
    // no mundo quando o jogador anda.
    "  float dist = length(vXZ);",
    "",
    // ---- O raio de visao que atravessa esta fatia ----
    "  vec3 toCam = cameraPosition - vWorld;",
    "  float len = max(length(toCam), 0.001);",
    "  vec3 V = toCam / len;",
    // A fatia e horizontal, entao a normal e (0,1,0) e |N . V| e
    // simplesmente |V.y|. Calculado POR FRAGMENTO de proposito:
    // interpolar isso entre os 4 cantos de um plano de 52 x 34 metros
    // daria um erro grosseiro justamente perto da camera, que e onde o
    // jogador esta olhando.
    "  float vy = max(abs(V.y), " + MIN_NDV.toFixed(3) + ");",
    "",
    // ---- Espessura otica: as duas amostras DENTRO da fatia ----
    // span = meia-espessura / |cos|, ou seja, metade da corda que o
    // olhar percorre dentro desta laje de ar. As duas pontas dessa
    // corda caem em ALTURAS diferentes, entao o campo 3D devolve
    // valores diferentes para elas: a media borra a densidade na
    // direcao exata em que o raio atravessa o gas. E o que ray marching
    // faz com dezenas de amostras (ver o bloco do topo).
    "  float span = min(uSpan / vy, " + SPAN_MAX.toFixed(2) + ");",
    "  vec3 pA = fogFlow(vWorld - V * span);",
    "  vec3 pB = fogFlow(vWorld + V * span);",
    "",
    // ---- Duas oitavas do campo, a segunda com domain warping ----
    // O deslocamento do vento e aplicado em METROS (dentro de fogFlow)
    // ANTES de virar coordenada de textura: a nevoa arrasta pelo MUNDO,
    // na velocidade fisica escrita em WIND, e nao "pela textura".
    "  float n1 = slice3(pA.xz * uScale + uNoiseOffset, pA.y * " + NOISE_Y_SCALE.toFixed(4) + ", vec4(1.0, 0.0, 0.0, 0.0));",
    "  vec2 uv2 = pB.xz * uScale * 2.35 + uNoiseOffset.yx + (n1 - 0.5) * uWarp;",
    "  float n2 = slice3(uv2, pB.y * " + (NOISE_Y_SCALE * 2).toFixed(4) + ", vec4(0.0, 1.0, 0.0, 0.0));",
    // 0.18 de piso: nunca existe um "buraco" totalmente limpo no meio
    // da nevoa, so regioes mais raras.
    "  float n = 0.18 + 0.82 * clamp(n1 * 0.62 + n2 * 0.38, 0.0, 1.0);",
    "",
    // ---- Beer-Lambert, com o |cos| perturbado pelo ruido ----
    // Ver NDV_JITTER: e o que impede as seis lajes de desenharem seis
    // linhas retas empilhadas na altura do olhar.
    "  float ndv = max(abs(V.y) * (1.0 + (n2 - 0.5) * " + NDV_JITTER.toFixed(3) + "), " + MIN_NDV.toFixed(3) + ");",
    "  float ramp = depthRamp(dist, " +
      RAMP_NEAR.toFixed(2) + ", " + RAMP_FAR.toFixed(2) +
      ", uRampFloor, " + RAMP_EXP.toFixed(2) + ");",
    "  float density = uDensity * uWeight * ramp * n;",
    "  float alpha = min(1.0 - exp(-density / ndv), uCap);",
    "",
    // ---- Bordas: nenhuma aresta reta de plano pode aparecer ----
    "  alpha *= smoothstep(" + NEAR_EDGE.toFixed(2) + ", " +
      (NEAR_EDGE + EDGE_NEAR_FADE).toFixed(2) + ", vXZ.y);",
    "  alpha *= 1.0 - smoothstep(uLateral - " + EDGE_SIDE_FADE.toFixed(2) +
      ", uLateral, abs(vXZ.x));",
    "  alpha *= 1.0 - smoothstep(uFarEdge - " + EDGE_FAR_FADE.toFixed(2) +
      ", uFarEdge, vXZ.y);",
    "",
    // ---- Nada de nevoa dentro dos comodos da casa ----
    "  alpha *= keepOutMask(vXZ);",
    "",
    // ---- Cor: nevoa propria -> cor da scene.fog conforme a distancia ----
    "  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);",
    "  vec3 col = mix(uColor, uFogColor, fogFactor);",
    "",
    // ---- PSX: dither ordenado + 5 bits por canal ----
    "  float d = bayer4(gl_FragCoord.xy + uDither);",
    "  col = psxQuantize(col, d);",
    "  alpha = floor(clamp(alpha, 0.0, 1.0) * 16.0 + d) / 16.0;",
    "",
    "  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));",
    "}",
  ].join("\n");

  // =========================================================
  //  Shader dos tufos (fatia do campo 3D, com billboard no vertex)
  // =========================================================
  // O billboard e montado com os EIXOS DA CAMERA TRAZIDOS PARA O ESPACO
  // LOCAL do grupo, e nao em espaco de visao como na revisao anterior.
  // A troca parece burocratica e e a mudanca mais importante deste
  // arquivo, porque ela entrega duas coisas que o billboard em espaco de
  // visao nao tinha como entregar:
  //
  //   1. A POSICAO DE MUNDO de cada canto do cartao (vWorld), que e onde
  //      o campo de ruido 3D e amostrado. Antes o ruido era lido na UV
  //      do cartao - ou seja, num espaco preso a TELA -, e era
  //      literalmente por isso que a nevoa parecia um PNG andando junto
  //      com o jogador. Agora o cartao e uma JANELA para um campo de
  //      nevoa que existe no mundo: mexer a cabeca desliza a fatia pelo
  //      campo e revela nevoa nova, com paralaxe.
  //
  //   2. A POSICAO LOCAL de cada canto (vLocalXZ), que e o espaco em que
  //      os retangulos dos comodos estao escritos. E o que permite
  //      FATIAR um tufo grande na quina de uma parede em vez de fazer o
  //      cartao inteiro piscar.
  //
  // Os eixos da camera saem das LINHAS da viewMatrix (a transposta da
  // rotacao mundo->camera e a rotacao camera->mundo), e vem para o local
  // por um giro em Y de -theta, com o cos/sen que uLocalAxis carrega.
  // Nenhuma linha de JavaScript por quadro e por tufo: continua sendo o
  // vertex shader fazendo tudo.
  const WISP_VERTEX = [
    "attribute vec2 aCorner;", // canto do quad: (+-0.5, +-0.5)
    "attribute vec4 aParams;", // x = lado (m), y = semente, z = peso, w = amplitude do vaivem
    "",
    "uniform float uTime;",
    "uniform vec2 uWind;",
    "uniform vec2 uLocalAxis;", // (cos, sen) do giro do grupo no mundo
    "uniform float uLateral;",
    "uniform int uKeepOutCount;",
    "uniform vec4 uKeepOut[" + KEEPOUT_MAX + "];",
    "",
    "varying vec2 vUv;",
    "varying vec3 vWorld;",
    "varying vec2 vLocalXZ;",
    "varying float vDist;",
    "varying float vEdge;",
    "varying float vWeight;",
    "varying float vFogDepth;",
    "",
    GLSL_KEEPOUT_PUSH,
    "",
    "void main() {",
    "  float seed = aParams.y;",
    "  vec3 center = position;",
    "",
    // ---- Deriva pelo vento (o mesmo vetor das fatias) ----
    // So a componente X do vento entra sem limite: e a que atravessa a
    // vista da janela e a unica que tem para onde voltar (o wrap logo
    // abaixo). A componente Z fica de fora de proposito - somada sem
    // limite, ela empurraria todos os tufos para a borda do terreno em
    // poucos minutos, e a profundidade de cada faixa (WISP_BANDS) e
    // calibrada com o tamanho do cartao. O movimento em Z vem do vaivem
    // limitado abaixo.
    "  float shear = 1.0 + max(center.y, 0.0) * " + WIND_SHEAR.toFixed(4) + ";",
    "  vec2 flow = vec2(uWind.x * uTime * shear, 0.0);",
    // Vaivem proprio, com fase por semente: a massa nao anda em bloco.
    // Periodos ~203 s e ~262 s, primos entre si o bastante para o
    // caminho de cada tufo nunca repetir.
    "  flow += aParams.w * vec2(",
    "    sin(uTime * 0.031 + seed * 6.283),",
    "    cos(uTime * 0.024 + seed * 9.71)",
    "  );",
    "  center.xz += flow;",
    // Sobe e desce de leve (ciclo de ~273 s): a nevoa assenta e levanta.
    "  center.y += 0.30 * sin(uTime * 0.023 + seed * 4.11);",
    "",
    // ---- Travessia: sai por um lado, volta pelo outro ----
    // Acontece sempre nos ultimos EDGE_SIDE_FADE metros, onde a
    // opacidade do tufo ja e zero (ver o fragment abaixo), entao o salto
    // e invisivel. E o que faz o jogador ver bancos de nevoa CHEGANDO e
    // PASSANDO em vez de balancando no lugar.
    "  center.x = mod(center.x + uLateral, 2.0 * uLateral) - uLateral;",
    "",
    // ---- Colisao com as paredes da casa ----
    // Empurra o tufo para fora do comodo mais proximo, pela face em que
    // ele esta menos enfiado. Como o vento continua empurrando na
    // mesma direcao, o resultado visivel e a nevoa ESCORREGANDO ao
    // longo da parede - nao atravessando, nem piscando. E depois disso
    // a trava dura da fachada, que nenhuma soma de vento e vaivem pode
    // furar.
    "  center.xz += keepOutPush(center.xz);",
    "  center.z = max(center.z, " + WISP_MIN_Z.toFixed(2) + ");",
    "",
    "  vDist = length(center.xz);",
    // Esmaecimento lateral medido no CENTRO, nao no fragmento: e o que
    // apaga o tufo por completo antes de a travessia do wrap acima levar
    // o centro para o outro lado do volume (ver o fragment shader).
    "  vEdge = 1.0 - smoothstep(uLateral - " + EDGE_SIDE_FADE.toFixed(2) +
      ", uLateral, abs(center.x));",
    "  vWeight = aParams.z;",
    "  vUv = aCorner + 0.5;",
    "",
    // "Respiracao": o cartao incha e murcha de leve num ciclo de ~126 s,
    // fora de fase com o vaivem. Somado ao ruido de mundo, e o que
    // impede qualquer leitura de "sprite rigido deslizando".
    "  float size = aParams.x * (0.86 + 0.14 * sin(uTime * 0.05 + seed * 7.31));",
    "",
    // ---- Eixos da camera, do mundo para o espaco local do grupo ----
    "  vec3 rightW = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);",
    "  vec3 upW = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);",
    "  vec3 rightL = vec3(",
    "    uLocalAxis.x * rightW.x - uLocalAxis.y * rightW.z,",
    "    rightW.y,",
    "    uLocalAxis.y * rightW.x + uLocalAxis.x * rightW.z",
    "  );",
    "  vec3 upL = vec3(",
    "    uLocalAxis.x * upW.x - uLocalAxis.y * upW.z,",
    "    upW.y,",
    "    uLocalAxis.y * upW.x + uLocalAxis.x * upW.z",
    "  );",
    "",
    "  vec3 local = center + (rightL * aCorner.x + upL * aCorner.y) * size;",
    "  vLocalXZ = local.xz;",
    "",
    "  vec4 world = modelMatrix * vec4(local, 1.0);",
    "  vWorld = world.xyz;",
    "  vec4 mv = viewMatrix * world;",
    "  vFogDepth = -mv.z;",
    "  gl_Position = projectionMatrix * mv;",
    "}",
  ].join("\n");

  const WISP_FRAGMENT = [
    "uniform sampler2D uNoise;",
    "uniform vec2 uNoiseOffset;",
    "uniform float uTime;",
    "uniform vec2 uWind;",
    "uniform vec3 uColor;",
    "uniform vec3 uFogColor;",
    "uniform float uFogNear;",
    "uniform float uFogFar;",
    "uniform float uDensity;",
    "uniform vec2 uDither;",
    "uniform float uLateral;",
    "uniform float uFarEdge;",
    "uniform int uKeepOutCount;",
    "uniform vec4 uKeepOut[" + KEEPOUT_MAX + "];",
    "",
    "varying vec2 vUv;",
    "varying vec3 vWorld;",
    "varying vec2 vLocalXZ;",
    "varying float vDist;",
    "varying float vEdge;",
    "varying float vWeight;",
    "varying float vFogDepth;",
    "",
    GLSL_DITHER,
    GLSL_NOISE3,
    GLSL_FLOW,
    GLSL_RAMP,
    GLSL_KEEPOUT,
    "",
    "void main() {",
    // ---- O cartao e uma ESFERA de gas, nao um disco ----
    // chord e o caminho otico dentro de uma bola de raio 1 com densidade
    // parabolica, medido a distancia r do centro: (4/3) * (1 - r^2)^1.5
    // (ver WISP_DENSITY para a integral e para o motivo de NAO ser o
    // sqrt(1 - r^2) da esfera solida, cuja derivada infinita na borda
    // desenharia um circulo duro em volta de cada tufo). Miolo denso,
    // beirada rala, derivada finita na borda: nenhuma aresta de cartao
    // aparece, em opacidade nenhuma.
    "  vec2 c = vUv - 0.5;",
    "  float fall = max(1.0 - dot(c, c) * 4.0, 0.0);",
    "  float chord = 1.33333 * fall * sqrt(fall);",
    "",
    // ---- O ruido lido NO MUNDO (a correcao principal) ----
    // vWorld e a posicao de mundo deste pixel do cartao, e fogFlow leva
    // ele para tras no tempo pelo vento. O desenho da nevoa pertence ao
    // MUNDO: quando o jogador anda ou vira a cabeca, o cartao acompanha
    // a tela mas o conteudo dele NAO - a fatia desliza pelo campo e
    // mostra nevoa diferente.
    "  vec3 p = fogFlow(vWorld);",
    "  float n1 = slice3(p.xz * " + WISP_NOISE_SCALE.toFixed(4) + " + uNoiseOffset, p.y * " + (NOISE_Y_SCALE * 1.6).toFixed(4) + ", vec4(0.0, 0.0, 1.0, 0.0));",
    // Terceira busca: uma oitava fina, so 2D, com domain warping pela
    // primeira. E ela que rasga a beirada do banco de nevoa. Fica em 2D
    // de proposito - a estrutura vertical ja vem de n1, e num tufo o
    // detalhe fino nao paga uma quarta busca.
    "  float n2 = texture2D(uNoise, fract(p.xz * " + (WISP_NOISE_SCALE * WISP_NOISE_OCTAVE).toFixed(4) + " + uNoiseOffset.yx + (n1 - 0.5) * 0.30)).r;",
    "  float n = smoothstep(0.20, 0.80, clamp(n1 * 0.62 + n2 * 0.38, 0.0, 1.0));",
    "",
    // ---- Beer-Lambert, igual as fatias ----
    "  float dens = uDensity * vWeight * n * chord;",
    "  dens *= depthRamp(vDist, " + RAMP_NEAR.toFixed(2) + ", " + RAMP_FAR.toFixed(2) +
      ", " + WISP_RAMP_FLOOR.toFixed(3) + ", " + WISP_RAMP_EXP.toFixed(2) + ");",
    "  float alpha = min(1.0 - exp(-dens), " + WISP_ALPHA_CAP.toFixed(3) + ");",
    "",
    // ---- Bordas do volume (e as duas pontas do wrap lateral) ----
    "  alpha *= smoothstep(" + WISP_FADE_IN[0].toFixed(2) + ", " +
      WISP_FADE_IN[1].toFixed(2) + ", vDist);",
    // O esmaecimento lateral vem PRONTO do vertex shader (vEdge), medido
    // no CENTRO do tufo e nao neste fragmento. E ele que garante que o
    // cartao esteja totalmente invisivel ANTES de a travessia lateral
    // levar o centro para o outro lado do volume: medido por fragmento,
    // metade de um cartao de 15 metros ainda estaria dentro da faixa
    // visivel na hora do salto - e o salto apareceria.
    "  alpha *= vEdge;",
    "  alpha *= 1.0 - smoothstep(uFarEdge - " + EDGE_FAR_FADE.toFixed(2) +
      ", uFarEdge, vLocalXZ.y);",
    // Nem meio pixel de tufo do lado de dentro da fachada, nem dentro
    // de comodo - as duas travas por FRAGMENTO, alem do empurrao por
    // vertice do vertex shader.
    "  alpha *= smoothstep(" + NEAR_EDGE.toFixed(2) + ", " +
      (NEAR_EDGE + EDGE_NEAR_FADE).toFixed(2) + ", vLocalXZ.y);",
    "  alpha *= keepOutMask(vLocalXZ);",
    "",
    "  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);",
    "  vec3 col = mix(uColor, uFogColor, fogFactor);",
    "",
    "  float d = bayer4(gl_FragCoord.xy + uDither);",
    "  col = psxQuantize(col, d);",
    "  alpha = floor(clamp(alpha, 0.0, 1.0) * 16.0 + d) / 16.0;",
    "",
    "  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));",
    "}",
  ].join("\n");

  // =========================================================
  //  Paleta atual (lida de scripts/atmosphere.js - ver o bloco
  //  "ILUMINACAO E NOITE/DIA" no topo)
  // =========================================================
  function palette(isMorning) {
    const source = isMorning ? window.Atmosphere.DAY : window.Atmosphere.NIGHT;
    return {
      color: new THREE.Color(source.mistColor),
      density: source.mistDensity,
      fogColor: new THREE.Color(source.fogColor),
      fogNear: source.fogNear,
      fogFar: source.fogFar,
    };
  }

  // =========================================================
  //  Geometria
  // =========================================================

  /**
   * Uma fatia: dois triangulos deitados na altura `y`, cobrindo de
   * NEAR_EDGE a FAR_EDGE ao longo do +Z local e +-LATERAL_HALF de
   * lado. Nao precisa de nenhuma subdivisao - os varyings sao lineares
   * e a interpolacao com correcao de perspectiva do proprio hardware
   * ja entrega a posicao exata em cada fragmento. A ESPESSURA da fatia
   * nao esta na geometria: ela vive no shader, como o comprimento da
   * corda que o raio de visao percorre dentro dela (uSpan).
   */
  function buildSheetGeometry(y) {
    const hw = LATERAL_HALF;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      -hw, y, NEAR_EDGE,
      hw, y, NEAR_EDGE,
      hw, y, FAR_EDGE,
      -hw, y, FAR_EDGE,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.boundingSphere = new THREE.Sphere(SHEET_SPHERE_CENTER.clone(), SHEET_SPHERE_RADIUS);
    geo.boundingBox = new THREE.Box3(
      new THREE.Vector3(-hw, y - 0.01, NEAR_EDGE),
      new THREE.Vector3(hw, y + 0.01, FAR_EDGE)
    );
    return geo;
  }

  /**
   * A malha unica com todos os tufos. Um quad por tufo, todos no mesmo
   * BufferGeometry - e por isso que ~104 volumes de nevoa custam UM
   * draw call, e nao 104 objetos soltos na cena.
   *
   * O atributo `position` guarda o CENTRO do cartao repetido nos
   * quatro vertices (o deslocamento para os cantos, a deriva do vento e
   * o empurrao das paredes acontecem no vertex shader). Guardar o
   * centro ali, e nao o vertice ja deslocado, tem uma vantagem
   * pratica: qualquer conta de caixa/esfera envolvente sobre este
   * atributo continua descrevendo onde a nevoa REALMENTE esta no mundo.
   */
  function buildWispGeometry(rng, exclusions) {
    const centers = [];
    const corners = [];
    const params = [];
    const indices = [];
    let quad = 0;
    let maxSize = 0;

    WISP_BANDS.forEach(function (band) {
      for (let i = 0; i < band.count; i++) {
        // Os sorteios acontecem SEMPRE, mesmo quando o tufo e
        // descartado logo abaixo: e o que mantem a sequencia do PRNG
        // estavel (mesma semente, mesma nevoa, sempre) - mesma regra
        // ja usada em models/tree-forest-factory.js.
        const angle = (rng() * 2 - 1) * WISP_SPREAD;
        const radius = band.from + rng() * (band.to - band.from);
        const yRoll = rng();
        const sizeRoll = rng();
        const seed = rng();

        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;

        // Nenhum tufo atras da parede, nenhum tufo fora do terreno. A
        // primeira trava e a mesma regra dura da grama e da floresta
        // ("nada dentro da casa"); a segunda so evita nevoa plantada no
        // vazio para alem da borda do chao externo.
        if (z < WISP_FADE_IN[0]) {
          continue;
        }
        if (Math.abs(x) > LATERAL_HALF) {
          continue;
        }
        // Nenhum tufo NASCE dentro dos comodos da casa. A partir desta
        // revisao isto e a primeira de tres travas, nao a unica: os
        // tufos agora andam de verdade (vento + vaivem), entao quem
        // garante a regra ao longo da partida sao o empurrao de colisao
        // por vertice e a mascara por fragmento (ver GLSL_KEEPOUT_PUSH e
        // keepOutMask). Este teste de nascimento fica porque e de graca
        // e porque poupa o shader de trabalhar num tufo que ja comecaria
        // invisivel.
        if (exclusions && exclusions.length) {
          let blocked = false;
          for (let e = 0; e < exclusions.length; e++) {
            const rect = exclusions[e];
            if (
              x > rect.minX &&
              x < rect.maxX &&
              z > rect.minZ &&
              z < rect.maxZ
            ) {
              blocked = true;
              break;
            }
          }
          if (blocked) {
            continue;
          }
        }

        const y = Math.pow(yRoll, Y_BIAS) * band.maxY + 0.25;
        const size = band.size[0] + sizeRoll * (band.size[1] - band.size[0]);
        if (size > maxSize) {
          maxSize = size;
        }

        for (let v = 0; v < 4; v++) {
          centers.push(x, y, z);
          params.push(size, seed, band.weight, band.sway);
        }
        corners.push(-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5);

        const base = quad * 4;
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        quad++;
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(centers), 3));
    geo.setAttribute("aCorner", new THREE.BufferAttribute(new Float32Array(corners), 2));
    geo.setAttribute("aParams", new THREE.BufferAttribute(new Float32Array(params), 4));
    geo.setIndex(indices);
    // Esfera de corte na mao: os vertices guardam CENTROS, entao a
    // esfera automatica ignoraria o raio dos proprios cartoes (e a
    // travessia lateral do vento). Ver o item 5 do bloco "DESEMPENHO".
    geo.boundingSphere = new THREE.Sphere(
      WISP_SPHERE_CENTER.clone(),
      WISP_SPHERE_RADIUS + maxSize
    );
    return geo;
  }

  // =========================================================
  //  API
  // =========================================================

  /**
   * Cria a neblina de UMA janela.
   *
   * Convencao de espaco local: EXATAMENTE a mesma de
   * GrassFieldFactory.createGrassField e TreeForestFactory.createForest
   * - origem no pe da parede, na posicao da janela; +Z aponta para
   * FORA da casa; Y = 0 e o chao externo. Quem chama reaproveita os
   * mesmos dois numeros (o "grassAnchor" das cenas) que ja usa para o
   * gramado e para a floresta, sem nenhuma conta nova - e e dessa
   * convencao que sai, de novo, a garantia de que nada disto entra na
   * casa.
   *
   * options.seed: qualquer texto estavel (o id da janela serve) para a
   * nevoa daquela janela nao ser identica a das outras.
   *
   * options.exclusions: lista de retangulos {minX,maxX,minZ,maxZ} do
   * espaco LOCAL em que a nevoa nao existe - os comodos da casa e a
   * varanda (ver KEEPOUT_MAX acima). Vazia/ausente: a neblina sai como
   * num terreno vazio, com uma comparacao de inteiro a mais por
   * fragmento.
   */
  function createFogVolume(options) {
    const opts = options || {};
    const group = new THREE.Group();
    const materials = [];
    const noise = getNoiseTexture();
    const rng = mulberry32(hashSeed(opts.seed));

    // Deslocamento proprio de cada janela dentro da textura de ruido.
    // Continua existindo mesmo agora que o ruido e lido em coordenadas
    // de MUNDO (e portanto ja diferente de janela para janela): e de
    // graca e garante que duas janelas que por acaso caiam em pedacos
    // parecidos do campo nao mostrem o mesmo desenho.
    const noiseOffset = new THREE.Vector2(rng(), rng());

    // O vento desta janela: o vetor global com um giro pequeno proprio
    // (+-9 graus, sorteado pela semente). As tres janelas continuam
    // partilhando a mesma massa de ar, sem soprarem em sincronia
    // perfeita - que e o tipo de coincidencia que o olho pega.
    const windAngle = (rng() * 2 - 1) * 0.16;
    const windCos = Math.cos(windAngle);
    const windSin = Math.sin(windAngle);
    const wind = new THREE.Vector2(
      WIND[0] * windCos - WIND[1] * windSin,
      WIND[0] * windSin + WIND[1] * windCos
    );

    // (cos, sen) do giro do grupo no mundo. Preenchido no primeiro
    // update() (ver a funcao la embaixo) - na hora em que este objeto e
    // criado, quem chama ainda nao girou nem posicionou o grupo.
    const localAxis = new THREE.Vector2(1, 0);

    let morning = false;
    const pal = palette(false);

    // ---------- Retangulos dos comodos ----------
    // Ver KEEPOUT_MAX acima. O array de uniforms tem tamanho fixo (o
    // GLSL exige), entao os retangulos que faltam entram zerados e
    // uKeepOutCount cuida de ignora-los. Compartilhado por todo mundo:
    // e o mesmo espaco local para as seis fatias e para os tufos.
    const keepOut = (opts.exclusions || []).slice(0, KEEPOUT_MAX);
    const keepOutCount = keepOut.length;
    const keepOutUniform = [];
    for (let k = 0; k < KEEPOUT_MAX; k++) {
      const rect = keepOut[k];
      keepOutUniform.push(
        rect
          ? new THREE.Vector4(rect.minX, rect.maxX, rect.minZ, rect.maxZ)
          : new THREE.Vector4(0, 0, 0, 0)
      );
    }

    // ---------- As seis fatias ----------
    SHEETS.forEach(function (sheet) {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uNoise: { value: noise },
          uNoiseOffset: { value: noiseOffset },
          uTime: { value: 0 },
          uWind: { value: wind },
          uColor: { value: pal.color.clone() },
          uFogColor: { value: pal.fogColor.clone() },
          uFogNear: { value: pal.fogNear },
          uFogFar: { value: pal.fogFar },
          uDensity: { value: SHEET_DENSITY * pal.density },
          uWeight: { value: sheet.weight },
          uScale: { value: sheet.scale },
          uSpan: { value: sheet.span },
          uWarp: { value: sheet.warp },
          uCap: { value: sheet.cap },
          // Piso proprio da fatia quando ela define um (ver a tabela de
          // SHEETS); as demais usam o padrao RAMP_FLOOR.
          uRampFloor: {
            value: typeof sheet.floor === "number" ? sheet.floor : RAMP_FLOOR,
          },
          uDither: { value: new THREE.Vector2(sheet.dither[0], sheet.dither[1]) },
          uLateral: { value: LATERAL_HALF },
          uFarEdge: { value: FAR_EDGE },
          uKeepOutCount: { value: keepOutCount },
          uKeepOut: { value: keepOutUniform },
        },
        vertexShader: SHEET_VERTEX,
        fragmentShader: SHEET_FRAGMENT,
        // Ver o item 7 do bloco DESEMPENHO no topo: a advecao acumula
        // metros durante toda a partida antes de virar coordenada de
        // textura, e mediump perderia a parte fracionaria.
        precision: "highp",
        transparent: true,
        // Sem escrita de profundidade: as camadas de nevoa se
        // atravessam livremente. Mas COM teste de profundidade - e ele
        // que faz a parede da casa e os troncos das arvores ocultarem a
        // neblina, que e metade da sensacao de volume.
        depthWrite: false,
        depthTest: true,
        // Vistas por cima E por baixo (o jogador olha para a fatia
        // rasteira de cima e para o veu alto de baixo).
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
        fog: false, // a mistura com a scene.fog e feita a mao no shader
      });

      const mesh = new THREE.Mesh(buildSheetGeometry(sheet.y), material);
      // Antes do vidro da janela (renderOrder 1 e 2 em
      // models/window-glass-factory.js): o tingimento e o brilho do
      // vidro continuam por cima da paisagem, exatamente como sempre.
      mesh.renderOrder = 0;
      // As fatias nunca se movem dentro do grupo: nao ha motivo para o
      // three.js recalcular a matriz delas a cada quadro (mesma
      // otimizacao ja usada pela grama e pela floresta).
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      group.add(mesh);
      materials.push(material);
    });

    // ---------- Os tufos ----------
    const wispMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uNoise: { value: noise },
        uNoiseOffset: { value: noiseOffset },
        uTime: { value: 0 },
        uWind: { value: wind },
        uLocalAxis: { value: localAxis },
        uColor: { value: pal.color.clone() },
        uFogColor: { value: pal.fogColor.clone() },
        uFogNear: { value: pal.fogNear },
        uFogFar: { value: pal.fogFar },
        uDensity: { value: WISP_DENSITY * pal.density },
        uDither: { value: new THREE.Vector2(2, 3) },
        uLateral: { value: LATERAL_HALF },
        uFarEdge: { value: FAR_EDGE },
        uKeepOutCount: { value: keepOutCount },
        uKeepOut: { value: keepOutUniform },
      },
      vertexShader: WISP_VERTEX,
      fragmentShader: WISP_FRAGMENT,
      precision: "highp",
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      fog: false,
    });

    const wispMesh = new THREE.Mesh(
      buildWispGeometry(rng, keepOut),
      wispMaterial
    );
    wispMesh.renderOrder = 0;
    wispMesh.matrixAutoUpdate = false;
    wispMesh.updateMatrix();
    group.add(wispMesh);
    materials.push(wispMaterial);

    // ---------- Por quadro ----------
    // Um float por material (o tempo) e uma leitura de dois numeros da
    // matriz do grupo. Todo o movimento da neblina (advecao das fatias,
    // domain warping, travessia dos tufos, colisao com as paredes,
    // respiracao) e derivado do tempo dentro do shader - nenhuma
    // particula percorrida, nenhuma matriz recalculada, nenhum objeto
    // alocado.
    //
    // `delta` nao e usado de proposito: a animacao depende do tempo
    // ABSOLUTO, entao um engasgo de quadro nao faz a nevoa saltar. Os
    // parametros de playerPos/playerRadius que as cenas passam para
    // alguns updaters tambem sao ignorados, e aqui isso e uma garantia,
    // nao um detalhe: nada nesta neblina pode depender de onde o jogador
    // esta.
    let axisReady = false;

    function update(delta, elapsed) {
      const t = typeof elapsed === "number" ? elapsed : 0;

      // O giro do grupo no mundo, que o billboard dos tufos usa para
      // trazer os eixos da camera para o espaco local (ver o comentario
      // do WISP_VERTEX). Quem posiciona e gira o grupo e a cena, DEPOIS
      // de createFogVolume, e a matrixWorld so e calculada pelo
      // renderer - entao na primeira volta ela e forcada aqui. Depois e
      // so releitura de dois campos de um array: o grupo nunca se move,
      // mas ler de novo mantem isto correto se um dia o Editor arrastar
      // a ancora.
      if (!axisReady) {
        group.updateWorldMatrix(true, false);
        axisReady = true;
      }
      const e = group.matrixWorld.elements;
      // Coluna X da matriz = o eixo +X local visto do mundo. Para um
      // giro puro em Y ela vale (cos, 0, -sen); normalizada para o caso
      // de alguem por escala no grupo.
      const len = Math.sqrt(e[0] * e[0] + e[2] * e[2]) || 1;
      localAxis.set(e[0] / len, -e[2] / len);

      for (let i = 0; i < materials.length; i++) {
        materials[i].uniforms.uTime.value = t;
      }
    }

    /**
     * Mesmo contrato do chao externo, do gramado e da floresta: a cena
     * chama isto de dentro do proprio setDaytime() dela, com a tela
     * preta (ver cutscenes/sleep-sequence.js). A troca e instantanea de
     * proposito, pelo mesmo motivo documentado em
     * scripts/atmosphere.js - ninguem chega a ver a transicao.
     *
     * Aceita os DOIS sentidos porque a paleta inteira ja vem pronta de
     * scripts/atmosphere.js (NIGHT e DAY): voltar para a noite e so
     * reescrever os mesmos uniforms com a outra paleta - nenhum
     * material, geometria ou shader e recriado, entao a volta custa o
     * mesmo que a ida (nada). Quem usa a volta e o controle de horario
     * do Editor (ver editor/editor-ui.js).
     */
    function setDaytime(daytime) {
      const wanted = daytime !== false;
      if (morning === wanted) {
        return;
      }
      morning = wanted;
      const now = palette(morning);
      materials.forEach(function (material) {
        const u = material.uniforms;
        u.uColor.value.copy(now.color);
        u.uFogColor.value.copy(now.fogColor);
        u.uFogNear.value = now.fogNear;
        u.uFogFar.value = now.fogFar;
        // As fatias tem uWeight e os tufos nao: e por isso que a
        // densidade de cada sistema tem a sua propria base.
        u.uDensity.value =
          (material === wispMaterial ? WISP_DENSITY : SHEET_DENSITY) * now.density;
      });
    }

    function setMorning() {
      setDaytime(true);
    }

    return {
      group: group,
      update: update,
      setDaytime: setDaytime,
      setMorning: setMorning,
    };
  }

  return {
    LATERAL_HALF: LATERAL_HALF,
    NEAR_EDGE: NEAR_EDGE,
    FAR_EDGE: FAR_EDGE,
    WIND: WIND,
    createFogVolume: createFogVolume,
  };
})();
