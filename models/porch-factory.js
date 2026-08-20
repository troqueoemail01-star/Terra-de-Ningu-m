/**
 * models/porch-factory.js
 * -------------------------------------------------
 * A VARANDA DA ENTRADA: a segunda peca do jogo que existe SO para ser
 * vista de fora (a primeira e o telhado, ver models/roof-factory.js).
 * Feita a partir da imagem de referencia enviada pelo jogador, que mostra
 * a parte FRONTAL da casa com quatro coisas: um piso de varanda avancando
 * da fachada, um MURO baixo cercando esse piso, PILARES que sobem do chao
 * ao teto e um TAPETE VERMELHO de boas-vindas em frente a porta.
 *
 * ---------- Regra numero um: nada entra na casa ----------
 * (Atualizada na correcao 3: a linha nao e mais um numero unico. Na
 * frente do corredor o limite continua sendo a fachada da ENTRADA &
 * SAIDA; na frente de cada ala, o limite e a parede frontal DAQUELA ala,
 * varios metros atras. Ver `guardBands` em plan e `guardHouse`.)
 *
 * TODA a geometria daqui nasce em z <= `frontZ`, ou seja do lado de FORA
 * da face externa da parede de ENTRADA & SAIDA (o plano dela em
 * z = -CorridorConfig.length, mais o CLADDING_GAP do revestimento
 * externo, ver models/exterior-factory.js). Nenhuma peca desta fabrica
 * tem permissao de cruzar essa linha, e nao e "eu conferi": no fim da
 * montagem existe uma TRAVA (ver `guardHouse` no builder) que percorre
 * todos os vertices e, se algum estiver do lado de dentro, empurra ele
 * de volta para a linha da fachada e avisa no console. Se um dia alguem
 * mudar uma medida da planta, o jogo NAO mostra a varanda entrando no
 * corredor - ele conserta e reclama.
 *
 * O interior, portanto, nao muda um pixel: piso, paredes, teto,
 * luminaria, moveis, colisao e a porta continuam exatamente como
 * estavam. Esta atualizacao e so a fachada.
 *
 * ---------- A planta (corte lateral, olhando a casa de perfil) ----------
 *
 *   parede         .-- laje da varanda (meia agua: telha em cima,
 *   da casa        |   forro de madeira embaixo)
 *      |           v
 *      |  [rufo]=================------____
 *      |  |                              ---- testeira
 *      |  |                                ||
 *      |  |   viga --> [=======================]
 *      |  |             |                   |
 *      |  |   pilar --> #                   # <- pilar
 *      |  |             |   muro -->  ___   |
 *      |  |  tapete     |            |   |  |
 *      |  |  [=====]    |            |   |  |
 *   ---+--+-------------+------------+---+--+---  <- piso da varanda
 *      |  |                                   |
 *      |  +-----------------------------------+
 *   piso do            grama / caminho de terra
 *   corredor
 *   (y = 0)
 *
 * Vista de cima, o muro cerca os tres lados abertos e deixa um VAO no
 * meio da frente, alinhado com a porta - e por ele que se entra, como na
 * referencia. Depois da correcao desta rodada ele NAO PARA na quina da
 * varanda: segue em volta das duas ALAS da frente da casa, no mesmo nivel
 * de topo, fechando o quintal:
 *
 *   +-------+                                      +-------+
 *   |  ALA  |             CORREDOR                 |  ALA  |
 *   +----+--+--------------------------------------+--+----+
 *   |    |  x=-3.02                        x=+3.02 |  |    |
 *   |    |    | [muro]   [ TAPETE ]   [muro] |     |  |    |
 *   |    |    | #                          # |     |  |    |
 *   |    |    | |                          | |     |  |    |
 *   |    +====+=#==[muro]==  VAO  ==[muro]==#=+====+  |    |  <- deckFrontZ
 *   +---------+                                +--------- +
 *                      caminho de terra
 *
 * ---------- As tres correcoes desta rodada ----------
 *  1. ORDEM DOS VERTICES DAS CAIXAS (o bug que valia por tres). Todas as
 *     caixas desta fabrica nasciam com a normal para DENTRO. Como a
 *     alvenaria e FrontSide, TODA face virada para a camera era
 *     descartada: piso, muro e pilares simplesmente nao apareciam por
 *     fora, e por cima da laje aparecia o caminho de terra que passa por
 *     baixo dela - o que fazia o TAPETE parecer flutuando no ar. Ver
 *     `face` em createBuilder.
 *  2. QUINAS EMPATADAS. Muro lateral, muro da frente e pilar de quina
 *     ocupavam o mesmo espaco com as faces de fora no mesmo plano, e as
 *     pingadeiras de dois trechos vizinhos se cruzavam na quina com o
 *     topo no mesmo plano. Duas superficies opacas empatadas em
 *     profundidade e o que faz a quina PISCAR. Agora cada trecho comeca e
 *     termina nas faces dos pilares e a pingadeira so cresce na
 *     perpendicular: nada sobreposto, nada coplanar.
 *  3. O MURO SEGUE NAS DUAS ALAS. Duas pernas por lado, derivadas dos
 *     retangulos dos comodos (`SideRoomScene.footprints`, passados pela
 *     cena em `options.wings`): uma na linha da frente da varanda ate a
 *     face externa da ala e outra voltando dali ate a parede frontal
 *     dela. Nasce na grama (WING_WALL_BASE) e termina na MESMA altura do
 *     muro da varanda. Da para desligar com `porch.extendToWings: false`
 *     em scenes/corridor-config.js.
 *
 * ---------- A CORRECAO DO TELHADO DA VARANDA PISCANDO ----------
 * O bug relatado: "o telhado da varanda esta piscando em algumas areas,
 * como se estivesse bugado dentro da parede". Era z-fighting, em duas
 * frentes, e nenhuma delas era material, luz ou textura - as duas eram
 * geometria empatada em profundidade, a mesma familia de bug das quinas
 * do muro (item 2 acima).
 *
 *  1. TODO ARREMATE DA LAJE ESTAVA RENTE DEMAIS A ELA. A laje e feita de
 *     duas faces: a telha em cima e o forro embaixo, e a telha fica
 *     COVER_DECK acima do forro medido na VERTICAL. Testeira, tabuas de
 *     beira, rufo e as tres vigas eram posicionadas com slabPoint, que
 *     mede na PERPENDICULAR da laje - entao a face de cima delas caia a
 *     0.8 MILIMETRO da face da telha (0.13 perpendicular contra 0.129), e
 *     o topo das vigas caia EXATAMENTE no plano do forro. Duas
 *     superficies grandes, quase paralelas, a menos de um milimetro uma
 *     da outra, num render de 320x180 e com o wobble de vertice da
 *     estetica PSX mexendo cada malha em separado: o pixel sorteia uma
 *     delas a cada quadro. Era o telhado "piscando em algumas areas" - a
 *     faixa do rufo, colada na fachada, era a mais visivel, e e dela que
 *     vem a impressao de peca "dentro da parede".
 *
 *     Conserto: SLAB_BITE (ver abaixo). Nenhuma peca encosta mais rente
 *     na laje - cada uma MORDE 2 cm dentro dela. Mesma regra que este
 *     arquivo ja usava no pilar (PILLAR_TUCK) e na ponta do muro
 *     (WING_WALL_CLEARANCE): ou uma peca morre dentro da outra, ou nada.
 *     Nenhuma medida da silhueta mudou: a laje, a inclinacao, a queda, o
 *     beiral e as alturas sao exatamente os de antes.
 *
 *  2. AS DUAS VIGAS LATERAIS ENTRAVAM NA CASA. Elas sao deitadas na
 *     inclinacao, e um giro joga a quina de cima da caixa para tras:
 *     |sin(inclinacao)| x altura = 2.9 cm. A ponta de tras era calculada
 *     como se a caixa nao girasse, entao essa quina passava 2.9 cm ALEM
 *     da fachada, caia na TRAVA anti-invasao (`guardHouse`) e era
 *     achatada no proprio plano da parede - ou seja, a trava tirava a
 *     viga de dentro do corredor e, no lugar, criava um empate de
 *     profundidade com o revestimento da fachada, exatamente onde o
 *     telhado encontra a parede (e um aviso no console a cada boot).
 *     Agora a ponta de tras e derivada JA com o giro descontado e para 2
 *     cm antes da fachada: a trava nao conserta mais nada, porque nao ha
 *     mais nada para consertar.
 *
 * ---------- A correcao do encontro do muro com a parede ----------
 * O bug relatado: onde a perna do muro chega na parede da ala ficava uma
 * FRESTA vertical, com a grama do quintal aparecendo por dentro dela.
 *
 * A causa nao estava no muro, estava na REGUA que ele usava. As duas
 * pernas nasciam do retangulo de `SideRoomScene.footprints`, e aquele
 * retangulo e INFLADO de proposito: ele nao descreve as paredes do
 * comodo, ele descreve a area em que a vista externa nao pode plantar
 * nada (meia espessura de parede a mais em cada ponta do comprimento e
 * uma espessura inteira a mais na profundidade - ver a funcao la). Com a
 * planta de hoje (paredes de 30 cm, comodos de 7.7 x 4.8) isso dava,
 * medido na ala da frente de cada lado:
 *
 *   - 15 cm de FALTA em Z: a perna morria em z = -19.02 enquanto o
 *     revestimento da parede da ala esta em z = -18.87. Ela parava
 *     ANTES da parede - e essa era a fresta que aparecia na imagem.
 *   - 30 cm de SOBRA em X: o muro corria por fora da linha da casa, e
 *     nao rente a ela; entre a face interna dele (x = -7.84) e o
 *     revestimento da lateral da ala (x = -7.82) sobrava mais uma
 *     fenda de 2 cm ao longo da perna inteira.
 *
 * O muro NAO mudou de forma: mesma altura, mesma espessura de 28 cm,
 * mesma pingadeira, mesmo pe na grama, mesmo vao na frente. O que mudou
 * e onde ele encosta - agora os planos das paredes da ala sao lidos de
 * verdade (ver resolveWings) e a perna:
 *
 *   1. corre RENTE a lateral da casa: a face externa dela cai
 *      exatamente no plano do revestimento daquela parede, continuando
 *      a linha da fachada em vez de correr 30 cm afastada dela;
 *   2. MORRE DENTRO da parede da frente: a ponta passa 1.6 cm do
 *      revestimento e para 4 mm antes do plano da parede (ver
 *      WING_WALL_CLEARANCE). Fresta impossivel por construcao, sem
 *      nenhuma peca coplanar com outra e sem um unico vertice dentro do
 *      comodo - de dentro da casa nada mudou.
 *
 * ---------- Por que o piso fica 20 cm acima da grama ----------
 * Nao e estilo, e a unica altura que resolve TRES coisas de uma vez:
 *
 *  1. O CAMINHO DE TERRA passa por baixo. A estrada da porta
 *     ENTRADA & SAIDA (models/dirt-path-factory.js) nasce encostada no pe
 *     da parede e sobe ate 16 cm no eixo dela (PATH_LIFT + CROWN + BUMP).
 *     Com a laje em 20 cm, a terra passa INTEIRA por dentro da caixa
 *     fechada do piso - invisivel, sem um unico triangulo furando a
 *     varanda - e reaparece na frente da laje, chegando exatamente no pe
 *     do degrau. Nada precisou mudar na estrada.
 *  2. Ela nao empata em profundidade com nada: o chao de grama externo
 *     fica em y = 0 e o remendo sob a casa em y = -0.04 (ver
 *     models/exterior-factory.js). A laje vai de -0.02 a 0.20, ou seja
 *     ATRAVESSA os dois - e, sendo uma caixa fechada e opaca, quem ganha
 *     e sempre a face de fora dela. Nao existe superficie coplanar aqui,
 *     entao nao existe z-fighting para resolver com polygonOffset.
 *  3. A propria face de 20 cm da laje E o degrau da varanda, igual ao da
 *     referencia. Um degrau solto na frente dela nao caberia: a terra
 *     sobe ate 16 cm justamente ali, e qualquer laje de 8 ou 13 cm seria
 *     furada por ela.
 *
 * ---------- Onde a altura do teto vem de ----------
 * A laje da varanda NAO tem altura escrita na mao: ela nasce
 * COVER_DROP_FROM_EAVE metros abaixo da linha do beiral do telhado
 * (o pe-direito + `RoofFactory.LIFT`), e essa linha e o ponto mais baixo
 * de qualquer peca do telhado naquele canto da casa - a tabua de oitao e
 * a moldura dela descem no maximo 0.33 abaixo dela (ver RAKE_H e
 * RAKE_MOLD_H em models/roof-factory.js). Sobra ar entre as duas
 * construcoes por CONSTRUCAO, e mexer no pe-direito ou no telhado leva a
 * varanda junto, sem ninguem ter de lembrar disso.
 *
 * ---------- Custo de desenho: quatro malhas ----------
 * Mesma filosofia do telhado: a geometria toda e acumulada em tres
 * builders e vira TRES malhas (alvenaria, telha e madeiramento), mais uma
 * quarta caixa rasa para o tapete. UV medido em METROS (TEX_SCALE), entao
 * o pixel do reboco tem o mesmo tamanho no muro, no pilar e no piso. E
 * quase nada de material novo: a telha e a MESMA do telhado
 * (materials.roofShingle), o madeiramento o MESMO dos arremates dele
 * (materials.roofTrim) e a alvenaria e a MESMA receita de reboco da
 * fachada, so numa versao que ladrilha nos dois sentidos (ver
 * createPorchPlasterTexture em materials/textures.js).
 *
 * ---------- Noite e dia ----------
 * Contrato de sempre de tudo que vive do lado de fora
 * (`setDaytime`/`setMorning`, ver createGroundPlane em
 * models/exterior-factory.js): a cena empurra a varanda na lista
 * `exteriorGrounds` e ela amanhece junto com a grama, a estrada, a
 * floresta e a fachada, trocando material por malha - sem recriar
 * geometria nenhuma.
 * -------------------------------------------------
 */

window.PorchFactory = (function () {
  // ---------------------------------------------------------------
  // MEDIDAS (metros de mundo)
  // ---------------------------------------------------------------

  // Quanto a varanda avanca para FORA da fachada. Padrao; quem manda e
  // `porch.depth` em scenes/corridor-config.js (dado de planta).
  const DEPTH = 2.6;

  // A laje do piso. Ver "Por que o piso fica 20 cm acima da grama" no
  // topo do arquivo - os dois numeros sao a resposta para o caminho de
  // terra que passa por baixo.
  const DECK_TOP = 0.2;
  const DECK_BOTTOM = -0.02;

  // O muro (parapeito) que cerca a varanda: altura MEDIDA A PARTIR DO
  // PISO dela (nao do chao), espessura, e a pingadeira de cima - a
  // "tampa" um pouco mais larga que o muro, que aparece na referencia.
  const WALL_H = 0.88;
  const WALL_T = 0.28;
  const CAP_H = 0.06;
  const CAP_OUT = 0.04;

  // ---------- O muro que continua nas duas alas da casa ----------
  // O muro da varanda cobre so a largura do corredor (a parte do meio da
  // casa). Da quina dele para fora, ele agora segue em volta das duas
  // ALAS da frente (QUARTO 02 e BANHEIRO na planta de hoje, ver
  // scenes/house-config.js): uma perna correndo na MESMA linha da frente
  // da varanda ate a face externa da ala, e outra voltando dali para a
  // parede frontal da ala. O topo (pingadeira inclusa) fica na MESMA
  // altura do muro da varanda, entao a linha de cima corre reta em volta
  // da casa inteira.
  //
  // A diferenca e o PE: o muro da varanda nasce no piso dela (20 cm); o
  // das alas nasce na grama. Por isso ele desce um pouco ABAIXO de zero -
  // o chao externo fica em y = 0 e o remendo sob a casa em y = -0.04 (ver
  // models/exterior-factory.js), e -0.06 passa pelos dois sem ficar
  // coplanar com nenhum: sem fresta na base e sem empate de profundidade.
  const WING_WALL_BASE = -0.06;
  // Folga em volta de cada perna do muro das alas para o gramado, a mata
  // e a neblina nao sortearem nada atravessando ela.
  const WING_FOOTPRINT_MARGIN = 0.35;

  // ---------- Onde a perna do muro MORRE dentro da parede da ala ----------
  // (ver "A correcao do encontro do muro com a parede" no topo do arquivo)
  //
  // As paredes dos comodos sao PLANOS de espessura zero e o revestimento
  // externo delas e uma casca 2 cm para fora (CLADDING_GAP, ver
  // models/exterior-factory.js). Entre a casca e o plano da parede existe,
  // portanto, uma folga de 2 cm - e e DENTRO dela que a ponta do muro
  // termina: 4 mm antes do plano da parede, ou seja 1.6 cm DEPOIS da casca.
  //
  // Os dois numeros sao os dois lados da mesma moeda:
  //  - passar da casca (1.6 cm de sobreposicao) e o que fecha a fresta: a
  //    ponta do muro fica ATRAS de uma superficie opaca, e nao encostada
  //    nela, entao nao existe mais linha de vista entre as duas pecas nem
  //    empate de profundidade (a ponta nao e coplanar com nada).
  //  - parar 4 mm antes do PLANO da parede e o que mantem a regra numero
  //    um do arquivo: nenhum vertice da varanda entra na casa. De dentro
  //    do comodo, nada mudou - o muro nao alcanca o plano da parede.
  const WING_WALL_CLEARANCE = 0.004;

  // O vao do muro na frente, alinhado com a porta: por onde se entra.
  // Bem mais largo que a folha (DoorFactory.DOOR_WIDTH = 1.3) de
  // proposito - e a passagem da varanda, nao a da porta.
  const OPENING = 1.7;

  // Os pilares: secao quadrada, e quanto eles ENTRAM na viga por cima
  // (a ponta de cima morre dentro dela, entao nunca aparece emenda de
  // pilar com laje).
  const PILLAR = 0.34;
  const PILLAR_TUCK = 0.1;

  // ---------- A laje/telhado da varanda (meia agua) ----------
  // Quanto o topo dela nasce ABAIXO da linha do beiral do telhado - ver
  // "Onde a altura do teto vem de" no topo.
  const COVER_DROP_FROM_EAVE = 0.55;
  // Espessura da laje, medida na perpendicular dela.
  const COVER_DECK = 0.13;
  // Quanto a laje avanca ALEM da beira do piso (o beiral da varanda) e
  // para os lados, alem da largura do piso.
  const COVER_EAVE = 0.4;
  const COVER_SIDE = 0.13;
  // Queda total da meia agua, da parede ate a ponta do beiral: e o que
  // faz a agua da chuva correr para longe da porta, e o que da o desenho
  // inclinado da referencia. Suave de proposito (uns 11%): mais que isso
  // e a laje comecaria a comer a vista de quem olha pela
  // janela-entrada-saida.
  const COVER_RISE = 0.34;

  // ---------- Madeiramento ----------
  const BEAM_H = 0.3; // viga da frente, sobre os pilares
  const SIDE_BEAM_H = 0.26; // as duas vigas laterais
  const FASCIA_H = 0.2; // testeira, na ponta do beiral
  const FASCIA_D = 0.07;
  const RAKE_H = 0.18; // tabua das duas beiras laterais
  const RAKE_W = 0.07;
  const LEDGER_H = 0.18; // rufo: a tabua que fecha o encontro com a fachada
  const LEDGER_D = 0.12;

  // ---------- A MORDIDA DOS ARREMATES NA LAJE ----------
  // (ver "A CORRECAO DO TELHADO DA VARANDA PISCANDO" no topo)
  //
  // Quanto cada arremate da laje (testeira, tabuas de beira, rufo e as
  // tres vigas) entra DENTRO dela, em vez de encostar rente na face. E o
  // que garante que nenhuma face de arremate caia no mesmo plano - nem a
  // 0.8 mm dele - da telha ou do forro: as pecas se cruzam de verdade, e
  // superficie que se cruza nao pisca.
  //
  // 2 cm e a mesma ordem de grandeza do CLADDING_GAP da fachada e da
  // folga do muro das alas: grande o bastante para o wobble de vertice do
  // shader PSX (que trabalha em centimetros) nunca encostar as duas
  // faces de novo, pequeno o bastante para nao mudar a silhueta da
  // varanda - a laje, a inclinacao e o beiral continuam com as medidas
  // exatas de antes.
  const SLAB_BITE = 0.02;

  // ---------- Tapete de boas-vindas ----------
  // 1.20 x 0.60 nao e um numero solto: e exatamente 2:1, a proporcao do
  // canvas 128x64 de createWelcomeMatTexture (materials/textures.js).
  // Com isso o pixel do tapete sai QUADRADO no mundo e as letras de
  // "BEM-VINDO" nao esticam - o mesmo cuidado que os outros tapetes do
  // jogo tomam passando a proporcao para a textura.
  const MAT_W = 1.2;
  const MAT_D = 0.6;
  // Folga entre a fachada e a borda de tras do tapete. A moldura da
  // porta ENTRADA & SAIDA avanca cerca de 9 cm da parede (FRAME_DEPTH /
  // 2, ver models/door-factory.js), entao 16 cm poem o tapete na frente
  // dela, nunca dentro.
  const MAT_GAP = 0.16;
  // Mesma receita dos tapetes de dentro de casa (ver createStripedRug em
  // models/carpet-factory.js, e o comentario grande de la sobre por que
  // tapete no jogo e uma CAIXA rasa e nao um plano deitado): lamina de
  // 1.2 cm, flutuando 3 mm acima do piso para nem a face de baixo ficar
  // coplanar com ele. Sem polygonOffset, sem renderOrder, sem briga de
  // profundidade.
  const MAT_T = 0.012;
  const MAT_LIFT = 0.003;

  // Metros de mundo por repeticao da textura: o MESMO numero do telhado
  // (TEX_SCALE em models/roof-factory.js), porque a telha da varanda e a
  // mesma textura da dele - com outro valor, a mesma telha apareceria em
  // dois tamanhos na mesma casa.
  const TEX_SCALE = 2.2;

  function v(x, y, z) {
    return { x: x, y: y, z: z };
  }

  /**
   * Acumulador de geometria, gemeo do de models/roof-factory.js: recebe
   * poligonos planos e caixas e devolve UMA BufferGeometry no fim. UV por
   * projecao nos eixos que o chamador informa, medido em metros e
   * dividido por TEX_SCALE.
   *
   * A unica diferenca em relacao ao do telhado: as caixas giram em torno
   * do eixo X (e nao de Z). O telhado e um perfil desenhado no corte
   * (x, y) e esticado ao longo de Z; a varanda e o contrario - ela e um
   * perfil no corte (z, y) esticado ao longo de X, porque a meia agua
   * dela desce da parede para a frente da casa, nao de um lado para o
   * outro.
   */
  function createBuilder() {
    const positions = [];
    const uvs = [];

    function pushVertex(p, origin, uAxis, vAxis) {
      positions.push(p.x, p.y, p.z);
      const dx = p.x - origin.x;
      const dy = p.y - origin.y;
      const dz = p.z - origin.z;
      uvs.push(
        (dx * uAxis.x + dy * uAxis.y + dz * uAxis.z) / TEX_SCALE,
        (dx * vAxis.x + dy * vAxis.y + dz * vAxis.z) / TEX_SCALE
      );
    }

    // Poligono convexo em leque (fan). A ORDEM dos pontos e que decide
    // para onde a face olha (a normal sai do produto vetorial, via
    // computeVertexNormals): sempre anti-horario visto do lado visivel.
    function addPoly(points, uAxis, vAxis) {
      const origin = points[0];
      for (let i = 1; i < points.length - 1; i++) {
        pushVertex(points[0], origin, uAxis, vAxis);
        pushVertex(points[i], origin, uAxis, vAxis);
        pushVertex(points[i + 1], origin, uAxis, vAxis);
      }
    }

    // Caixa, opcionalmente girada em torno de X - e esse giro que deita a
    // testeira, o rufo e as vigas na inclinacao da laje.
    function addBox(center, size, rotX) {
      const c = Math.cos(rotX || 0);
      const s = Math.sin(rotX || 0);
      const ax = v(1, 0, 0);
      const ay = v(0, c, s);
      const az = v(0, -s, c);
      const hx = size.x / 2;
      const hy = size.y / 2;
      const hz = size.z / 2;

      function corner(sx, sy, sz) {
        return v(
          center.x + sx * hx,
          center.y + ay.y * sy * hy + az.y * sz * hz,
          center.z + ay.z * sy * hy + az.z * sz * hz
        );
      }

      // ---------- A CORRECAO DA ORDEM DOS VERTICES ----------
      // As seis listas abaixo sao as MESMAS de sempre (as mesmas do
      // acumulador do telhado), so que agora passam por `face`, que
      // INVERTE a ordem antes de virar triangulo. Sem isso, a normal de
      // toda caixa desta fabrica aponta para DENTRO dela: a face de +X
      // olha para -X, a de cima olha para baixo, e assim nas seis.
      //
      // No telhado isso nunca apareceu porque `roofShingle`/`roofTrim`
      // sao DoubleSide (o three.js vira a normal no fragmento de tras),
      // mas a alvenaria da varanda e FrontSide de proposito (caixas
      // fechadas, metade do custo). Resultado do bug: TODA face virada
      // para a camera era descartada e a varanda desaparecia por fora -
      // e o topo da laje sumindo era justamente o que fazia o TAPETE
      // parecer flutuando (por baixo dele aparecia o caminho de terra,
      // que passa dentro da caixa do piso). Uma inversao, tres sintomas.
      function face(points, uAxis, vAxis) {
        addPoly(points.slice().reverse(), uAxis, vAxis);
      }

      face([corner(1, -1, -1), corner(1, -1, 1), corner(1, 1, 1), corner(1, 1, -1)], az, ay);
      face([corner(-1, -1, 1), corner(-1, -1, -1), corner(-1, 1, -1), corner(-1, 1, 1)], az, ay);
      face([corner(-1, 1, -1), corner(1, 1, -1), corner(1, 1, 1), corner(-1, 1, 1)], ax, az);
      face([corner(-1, -1, 1), corner(1, -1, 1), corner(1, -1, -1), corner(-1, -1, -1)], ax, az);
      face([corner(-1, -1, 1), corner(-1, 1, 1), corner(1, 1, 1), corner(1, -1, 1)], ax, ay);
      face([corner(1, -1, -1), corner(1, 1, -1), corner(-1, 1, -1), corner(-1, -1, -1)], ax, ay);
    }

    /**
     * A TRAVA anti-invasao (ver o topo do arquivo). Nenhum vertice da
     * varanda pode estar do lado de DENTRO da casa: se estiver, ele e
     * empurrado de volta para a linha da parede. Devolve quantos
     * consertou.
     *
     * Agora ela trabalha por FAIXAS de X, e nao com um numero unico, por
     * causa do muro que continua nas duas alas da casa (ver o item 3 das
     * correcoes no topo): na frente do corredor o limite e a fachada da
     * ENTRADA & SAIDA, mas na frente de cada ala o limite e a parede
     * frontal DAQUELA ala, varios metros atras. Cada faixa e
     * { minX, maxX, maxZ }.
     *
     * Nao e o mecanismo que mantem a varanda fora da casa - isso vem da
     * forma como a planta e derivada, sempre para -Z a partir de
     * `frontZ`. E a rede de seguranca para o dia em que alguem mudar uma
     * medida em scenes/corridor-config.js.
     */
    function guardHouse(bands) {
      let fixed = 0;
      if (!bands || !bands.length) {
        return 0;
      }
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        let limit = null;
        // O limite de um vertice e o MAIS PERMISSIVO entre as faixas que
        // contem o X dele. Nas duas fronteiras (x = +-deckHalfX) as
        // faixas se encostam, e ali o vertice esta exatamente NO plano da
        // parede lateral da casa - nunca dentro dela -, entao pegar o
        // maior dos dois limites e o certo: e o que deixa o muro das alas
        // sair da quina da varanda sem a trava cortar a peca no meio.
        for (let b = 0; b < bands.length; b++) {
          const band = bands[b];
          if (x < band.minX - 1e-6 || x > band.maxX + 1e-6) {
            continue;
          }
          if (limit === null || band.maxZ > limit) {
            limit = band.maxZ;
          }
        }
        if (limit === null) {
          continue;
        }
        if (positions[i + 2] > limit + 1e-6) {
          positions[i + 2] = limit;
          fixed++;
        }
      }
      return fixed;
    }

    function toGeometry() {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      return geo;
    }

    return {
      addPoly: addPoly,
      addBox: addBox,
      guardHouse: guardHouse,
      toGeometry: toGeometry,
      isEmpty: function () {
        return positions.length === 0;
      },
    };
  }

  /**
   * Le os retangulos dos comodos laterais (coordenadas do MUNDO, paredes
   * inclusas - e o que `SideRoomScene.footprints` devolve) e responde a
   * unica pergunta que o muro das alas precisa fazer: de cada lado do
   * corredor, qual e a ala MAIS PROXIMA da fachada, onde fica a face
   * externa dela e onde fica a parede da frente dela.
   *
   * Nenhuma medida das alas entra escrita na mao aqui: se um comodo mudar
   * de tamanho em scenes/house-config.js, o muro anda com ele.
   */
  function resolveWings(rects, claddingGap) {
    const out = { left: null, right: null };
    if (!rects || !rects.length) {
      return out;
    }
    // Espessura das paredes dos comodos laterais, lida de quem manda nela
    // (scenes/side-room-scene.js) para as duas nunca discordarem. O numero
    // escrito aqui e so a rede para o caso de a varanda ser montada sem
    // aquele arquivo carregado.
    const roomWallT =
      (window.SideRoomScene && window.SideRoomScene.WALL_THICKNESS) || 0.3;
    rects.forEach(function (rect) {
      if (!rect || typeof rect.minX !== "number") {
        return;
      }
      const side = (rect.minX + rect.maxX) / 2 < 0 ? "left" : "right";
      const current = out[side];
      // "Mais proxima da fachada" = o menor minZ, ja que a fachada da
      // ENTRADA & SAIDA e a ponta NEGATIVA do corredor.
      if (current && current.rectMinZ <= rect.minZ) {
        return;
      }
      // ---------- Os planos DE VERDADE da ala ----------
      // Ver "A correcao do encontro do muro com a parede" no topo: o
      // retangulo que chega aqui e o de `SideRoomScene.footprints`, que
      // ENGORDA o comodo de proposito (ele existe para manter grama,
      // arvore e neblina longe da construcao) - meia espessura de parede
      // nas duas pontas do comprimento e uma espessura inteira na
      // profundidade. Quem constroi encostado na casa nao pode usar essa
      // borda inflada como se fosse a parede: os planos das paredes sao
      // estes dois, e e neles que o muro se encaixa.
      const sideWallX =
        side === "left" ? rect.minX + roomWallT : rect.maxX - roomWallT;
      const frontWallZ = rect.minZ + roomWallT / 2;
      out[side] = {
        rectMinZ: rect.minZ,
        // Os planos das paredes da ala (sem revestimento).
        sideWallX: sideWallX,
        frontWallZ: frontWallZ,
        // Face externa da ala, com o revestimento da fachada somado: o
        // muro nasce rente a ela, continuando a linha da parede.
        outerX: side === "left" ? sideWallX - claddingGap : sideWallX + claddingGap,
        // O revestimento externo da parede da frente da ala: a superficie
        // que o jogador ve e que a ponta do muro precisa PASSAR.
        frontZ: frontWallZ - claddingGap,
        // Onde a ponta do muro termina de verdade: dentro da folga de 2 cm
        // entre o revestimento e o plano da parede (ver
        // WING_WALL_CLEARANCE no topo).
        sealZ: frontWallZ - WING_WALL_CLEARANCE,
      };
    });
    return out;
  }

  /**
   * A planta da varanda, DERIVADA da casa - nenhuma posicao escrita na
   * mao. Tudo sai de CorridorConfig (largura, comprimento, pe-direito),
   * do CLADDING_GAP da fachada (models/exterior-factory.js) e do LIFT do
   * telhado (models/roof-factory.js). Mexer na planta da casa move a
   * varanda junto.
   *
   * options:
   *   corridorConfig - a config do corredor (padrao: window.CorridorConfig)
   *   porch          - os dados de planta da varanda (padrao:
   *                    corridorConfig.porch, ver scenes/corridor-config.js)
   *   doorX          - X da porta ENTRADA & SAIDA (o vao do muro e o
   *                    tapete se alinham nela). Padrao 0, que e onde a
   *                    porta de extremidade fica hoje.
   */
  function plan(options) {
    const opts = options || {};
    const cfg = opts.corridorConfig || window.CorridorConfig;
    const data = opts.porch || cfg.porch || {};
    const doorX = opts.doorX || 0;

    const halfW = cfg.width / 2;
    // A face EXTERNA da parede de ENTRADA & SAIDA: o plano dela fica em
    // z = -length e o revestimento externo (a casca da fachada) 2 cm para
    // fora dele. Tudo desta fabrica vive em z <= isto.
    const claddingGap =
      (window.ExteriorFactory && window.ExteriorFactory.CLADDING_GAP) || 0.02;
    const frontZ = -cfg.length - claddingGap;
    // Linha do beiral do telhado: a MESMA conta de models/roof-factory.js
    // (pe-direito + LIFT), lida de la para as duas nunca discordarem.
    const roofLift = (window.RoofFactory && window.RoofFactory.LIFT) || 0.05;
    const eaveY = cfg.height + roofLift;

    const depth = Math.max(1.2, data.depth || DEPTH);
    const wallHeight = data.wallHeight || WALL_H;
    const opening = data.openingWidth || OPENING;

    // A varanda tem exatamente a largura da FACHADA (a casca externa das
    // duas paredes laterais fica em +-(halfW + claddingGap)): a laje
    // termina rente a quina da casa, sem sobra e sem degrau lateral.
    const deckHalfX = halfW + claddingGap;
    const deckFrontZ = frontZ - depth;

    const wallTopY = DECK_TOP + wallHeight;
    const capTopY = wallTopY + CAP_H;

    // Linha dos pilares da frente: centrada na espessura do muro da
    // frente, entao pilar e muro se encaixam em vez de brigar por espaco.
    const pillarLineZ = deckFrontZ + WALL_T / 2;
    // Linha dos pilares de tras: encostados na fachada (sem cruzar ela).
    const wallPillarZ = frontZ - PILLAR / 2;

    const coverHalfX = deckHalfX + COVER_SIDE;
    const coverFrontZ = deckFrontZ - COVER_EAVE;
    const coverSpan = frontZ - coverFrontZ;
    // Face de BAIXO da laje (o forro): alta na parede, baixa na ponta.
    const underWallY = eaveY - COVER_DROP_FROM_EAVE - COVER_DECK;
    const underFrontY = underWallY - COVER_RISE;
    const slopeLen = Math.sqrt(coverSpan * coverSpan + COVER_RISE * COVER_RISE);
    // Giro NEGATIVO em X: e o que faz o +Z local das caixas apontar para
    // a parede E para cima, ou seja subir a laje na direcao da casa.
    const slopeAngle = -Math.atan2(COVER_RISE, coverSpan);

    // ---------- As duas alas da casa ----------
    // `wings` chega da cena (os retangulos de SideRoomScene.footprints).
    // Sem eles - ou com `porch.extendToWings: false` em
    // scenes/corridor-config.js - a varanda volta a ser exatamente o que
    // era: muro so na largura do corredor.
    const wings =
      data.extendToWings === false
        ? { left: null, right: null }
        : resolveWings(opts.wings || data.wings, claddingGap);

    // ---------- As faixas da trava anti-invasao ----------
    // Uma por parte da casa, porque a linha que nao se pode cruzar nao e
    // a mesma em toda a largura: na frente do corredor e a fachada da
    // ENTRADA & SAIDA; na frente de cada ala e a parede frontal dela.
    const guardBands = [
      { minX: -deckHalfX, maxX: deckHalfX, maxZ: frontZ },
      // O limite das duas faixas de fora nao e o revestimento da ala, e a
      // linha onde a ponta do muro morre DENTRO dela (ver `sealZ` em
      // resolveWings e WING_WALL_CLEARANCE no topo). Continua sendo uma
      // linha do lado de FORA do comodo: 4 mm antes do plano da parede.
      {
        minX: -Infinity,
        maxX: -deckHalfX,
        maxZ: wings.left ? wings.left.sealZ : frontZ,
      },
      {
        minX: deckHalfX,
        maxX: Infinity,
        maxZ: wings.right ? wings.right.sealZ : frontZ,
      },
    ];

    const mat = data.mat || {};
    const matWidth = mat.width || MAT_W;
    const matDepth = mat.depth || MAT_D;
    const matGap = mat.gap === undefined ? MAT_GAP : mat.gap;

    return {
      frontZ: frontZ,
      wings: wings,
      guardBands: guardBands,
      eaveY: eaveY,
      doorX: doorX,
      depth: depth,
      deckHalfX: deckHalfX,
      deckFrontZ: deckFrontZ,
      deckTop: DECK_TOP,
      deckBottom: DECK_BOTTOM,
      wallThickness: WALL_T,
      wallTopY: wallTopY,
      capTopY: capTopY,
      openingHalf: opening / 2,
      pillarSize: PILLAR,
      pillarLineZ: pillarLineZ,
      wallPillarZ: wallPillarZ,
      coverHalfX: coverHalfX,
      coverFrontZ: coverFrontZ,
      coverSpan: coverSpan,
      coverDeck: COVER_DECK,
      // Quanto a face de BAIXO do forro DESCE da fachada ate a ponta do
      // beiral, medido na vertical (o forro da varanda e inclinado). Vai
      // na planta porque quem monta a cena precisa dele para achar a
      // altura do teto num z qualquer: e o caso da luminaria de teto da
      // varanda, ver o bloco Luz e interruptor exclusivos da varanda em
      // scenes/corridor-scene.js. E o mesmo numero que o underAt() daqui
      // de dentro usa.
      coverRise: COVER_RISE,
      underWallY: underWallY,
      underFrontY: underFrontY,
      slopeLen: slopeLen,
      slopeAngle: slopeAngle,
      mat: {
        x: doorX,
        z: frontZ - matGap - matDepth / 2,
        width: matWidth,
        depth: matDepth,
        thickness: MAT_T,
        baseY: DECK_TOP + MAT_LIFT,
      },
      // O retangulo que a varanda ocupa no terreno, em coordenadas do
      // MUNDO. Quem usa: a vista externa da janela-entrada-saida (ver o
      // bloco "Comodos novos x vista externa" em
      // scenes/corridor-scene.js) - gramado, floresta e neblina recebem
      // este retangulo em `exclusions` e simplesmente NAO sorteiam nada
      // dentro dele. Mesma filosofia do caminho de terra e dos quatro
      // comodos: tufo dentro da varanda nunca chega a existir, em vez de
      // ser removido depois. Usa os extremos da LAJE DE COBERTURA, a
      // peca mais larga e mais avancada do conjunto.
      footprint: {
        minX: -coverHalfX,
        maxX: coverHalfX,
        minZ: coverFrontZ,
        maxZ: frontZ,
      },
      // ---------- Os dois QUINTAIS da frente ----------
      // O retangulo de grama que sobra fechado de cada lado da varanda,
      // em coordenadas do MUNDO: por fora ele para na face interna da
      // perna do muro, por dentro na quina da laje de cobertura da
      // varanda, na frente na face de dentro do muro da frente e no
      // fundo na parede da ala. E exatamente o pedaco de quintal que se
      // ve da frente da casa por cima do muro.
      //
      // Quem usa: models/flower-bed-factory.js, o canteiro de flores
      // desta rodada (ver o bloco "Canteiros de flores" em
      // scenes/corridor-scene.js). Sai daqui, e nao de numeros escritos
      // na mao la, pelo mesmo motivo de sempre: mexer na planta da casa
      // ou na do muro leva o canteiro junto.
      yards: ["left", "right"]
        .map(function (side) {
          const wing = wings[side];
          if (!wing) {
            return null;
          }
          const sign = side === "left" ? -1 : 1;
          const innerX = wing.outerX - sign * WALL_T; // face do muro virada para a casa
          const deckEdgeX = sign * coverHalfX; // quina da laje da varanda
          return {
            key: side,
            minX: Math.min(innerX, deckEdgeX),
            maxX: Math.max(innerX, deckEdgeX),
            minZ: deckFrontZ + WALL_T,
            maxZ: wing.frontZ,
          };
        })
        .filter(function (rect) {
          return !!rect;
        }),
    };
  }

  function build(materials, options) {
    const p = plan(options);
    const root = new THREE.Group();
    root.name = "varanda";

    const masonry = createBuilder(); // piso, muro, pingadeira e pilares
    const shingles = createBuilder(); // a telha da laje (face de cima)
    const trim = createBuilder(); // forro, vigas, testeira, rufo e beiras

    const ax = v(1, 0, 0);

    // Vetor unitario que sobe a inclinacao da laje (da ponta do beiral
    // para a parede). Serve de eixo V do UV da telha e do forro: com ele,
    // o pixel da telha nao estica na parte inclinada.
    const alongSlope = v(0, COVER_RISE / p.slopeLen, p.coverSpan / p.slopeLen);

    // Altura da face de BAIXO da laje num z qualquer (interpolacao
    // simples entre a parede e a ponta do beiral).
    function underAt(z) {
      const t = (p.frontZ - z) / p.coverSpan;
      return p.underWallY - COVER_RISE * t;
    }

    /**
     * Um ponto no referencial da LAJE: parte da face de baixo dela em `z`
     * e caminha `perp` metros na PERPENDICULAR (o +Y local, positivo para
     * cima da laje) e `along` metros ao longo da INCLINACAO (o +Z local,
     * positivo na direcao da parede). E assim que viga, testeira, rufo e
     * beiras encostam na laje inclinada sem fresta e sem trigonometria
     * repetida em cada peca.
     */
    function slabPoint(z, perp, along) {
      const c = Math.cos(p.slopeAngle);
      const s = Math.sin(p.slopeAngle);
      const d = perp || 0;
      const a = along || 0;
      return v(0, underAt(z) + c * d - s * a, z + s * d + c * a);
    }

    // ---------- Caixa simples, alinhada aos eixos ----------
    // Toda a alvenaria e ortogonal (piso, muro, pingadeira e pilares):
    // uma funcao que recebe o RETANGULO no chao e as duas alturas evita
    // repetir a conta de centro/tamanho em quinze lugares.
    function addSolidBox(builder, rect, minY, maxY) {
      const width = rect.maxX - rect.minX;
      const depth = rect.maxZ - rect.minZ;
      const height = maxY - minY;
      if (width <= 0 || depth <= 0 || height <= 0) {
        return;
      }
      builder.addBox(
        v(
          (rect.minX + rect.maxX) / 2,
          (minY + maxY) / 2,
          (rect.minZ + rect.maxZ) / 2
        ),
        v(width, height, depth),
        0
      );
    }

    // ---------- 1. O PISO DA VARANDA ----------
    // Uma laje so, da fachada ate a beira, na largura inteira da casa.
    // Ver "Por que o piso fica 20 cm acima da grama" no topo: e ela que
    // esconde o caminho de terra que passa por baixo.
    addSolidBox(
      masonry,
      {
        minX: -p.deckHalfX,
        maxX: p.deckHalfX,
        minZ: p.deckFrontZ,
        maxZ: p.frontZ,
      },
      p.deckBottom,
      p.deckTop
    );

    // ---------- 2. OS PILARES (agora ANTES do muro) ----------
    // A ordem trocou de proposito nesta correcao: sao os PILARES que
    // decidem onde cada trecho de muro comeca e termina.
    //
    // Por que as quinas piscavam: muro lateral, muro da frente e pilar de
    // quina ocupavam O MESMO pedaco de espaco, e as faces de fora dos
    // tres caiam no MESMO plano. Duas superficies opacas empatadas em
    // profundidade e a unica coisa que a GPU nao tem como resolver - o
    // pixel sorteia uma delas a cada quadro e a quina PISCA. Nao era
    // material, nem luz, nem textura: era geometria repetida.
    //
    // A regra nova, valida para a varanda inteira e para o muro das alas:
    // duas pecas ou se ENCOSTAM (faces coladas, viradas para lados
    // opostos - o three.js descarta a de tras e ninguem ve nada), ou uma
    // morre DENTRO da outra. O que nao existe mais em nenhum lugar e
    // sobreposicao com as faces de fora no mesmo plano.
    const halfPillar = PILLAR / 2;
    const pillars = [
      { x: -(p.deckHalfX - halfPillar), z: p.pillarLineZ },
      { x: p.deckHalfX - halfPillar, z: p.pillarLineZ },
      { x: p.doorX - p.openingHalf - halfPillar, z: p.pillarLineZ },
      { x: p.doorX + p.openingHalf + halfPillar, z: p.pillarLineZ },
      { x: -(p.deckHalfX - halfPillar), z: p.wallPillarZ },
      { x: p.deckHalfX - halfPillar, z: p.wallPillarZ },
    ];

    pillars.forEach(function (pos) {
      addSolidBox(
        masonry,
        {
          minX: pos.x - halfPillar,
          maxX: pos.x + halfPillar,
          minZ: pos.z - halfPillar,
          maxZ: Math.min(pos.z + halfPillar, p.frontZ),
        },
        p.deckTop,
        underAt(pos.z) - PILLAR_TUCK
      );
    });

    // Faces dos pilares de onde o muro parte e onde ele morre. Sao elas,
    // e nao numeros soltos, que recortam os trechos abaixo - mexer em
    // `openingWidth` ou em `PILLAR` continua movendo tudo junto.
    const cornerInnerX = p.deckHalfX - PILLAR; // face interna do pilar de quina
    const openingOuterX = p.openingHalf + PILLAR; // face externa do pilar do vao
    const frontPillarBackZ = p.pillarLineZ + halfPillar;
    const wallPillarFrontZ = p.wallPillarZ - halfPillar;

    // ---------- 3. O MURO ----------
    // Cada trecho e um par { wall, cap }: a alvenaria e a pingadeira dela.
    // A pingadeira NAO cresce mais nas duas pontas do trecho - so nos
    // lados, na perpendicular do muro. Era essa sobra nas pontas que fazia
    // as tampas de dois trechos vizinhos se cruzarem na quina com o topo
    // no mesmo plano (o segundo lugar onde a imagem piscava).
    //
    // Nas quinas da varanda a tampa do LADO leva a curva inteira (ela
    // comeca 4 cm antes da linha da frente) e a da FRENTE encosta nela.
    // Os 2 cm que sobram entre uma e outra caem exatamente sobre o pilar,
    // que sobe atravessando esse nivel - ninguem ve um buraco ali.
    //
    // `baseY` existe porque o muro da varanda nasce no PISO dela e o das
    // alas nasce na grama (ver WING_WALL_BASE no topo). O topo dos dois e
    // o mesmo, entao a linha de cima corre reta em volta da casa.
    const wallSegments = [
      // --- Varanda: muro lateral esquerdo, entre os dois pilares ---
      {
        wall: {
          minX: -p.deckHalfX,
          maxX: -p.deckHalfX + WALL_T,
          minZ: frontPillarBackZ,
          maxZ: wallPillarFrontZ,
        },
        cap: {
          minX: -p.deckHalfX - CAP_OUT,
          maxX: -p.deckHalfX + WALL_T + CAP_OUT,
          minZ: p.deckFrontZ - CAP_OUT,
          maxZ: wallPillarFrontZ,
        },
        baseY: p.deckTop,
      },
      // --- Varanda: muro lateral direito ---
      {
        wall: {
          minX: p.deckHalfX - WALL_T,
          maxX: p.deckHalfX,
          minZ: frontPillarBackZ,
          maxZ: wallPillarFrontZ,
        },
        cap: {
          minX: p.deckHalfX - WALL_T - CAP_OUT,
          maxX: p.deckHalfX + CAP_OUT,
          minZ: p.deckFrontZ - CAP_OUT,
          maxZ: wallPillarFrontZ,
        },
        baseY: p.deckTop,
      },
      // --- Varanda: frente, do pilar de quina ao pilar do vao ---
      {
        wall: {
          minX: -cornerInnerX,
          maxX: p.doorX - openingOuterX,
          minZ: p.deckFrontZ,
          maxZ: p.deckFrontZ + WALL_T,
        },
        cap: {
          minX: -cornerInnerX,
          maxX: p.doorX - openingOuterX,
          minZ: p.deckFrontZ - CAP_OUT,
          maxZ: Math.min(p.deckFrontZ + WALL_T + CAP_OUT, p.frontZ),
        },
        baseY: p.deckTop,
      },
      // --- Varanda: frente, do outro pilar do vao ao pilar de quina ---
      {
        wall: {
          minX: p.doorX + openingOuterX,
          maxX: cornerInnerX,
          minZ: p.deckFrontZ,
          maxZ: p.deckFrontZ + WALL_T,
        },
        cap: {
          minX: p.doorX + openingOuterX,
          maxX: cornerInnerX,
          minZ: p.deckFrontZ - CAP_OUT,
          maxZ: Math.min(p.deckFrontZ + WALL_T + CAP_OUT, p.frontZ),
        },
        baseY: p.deckTop,
      },
    ];

    // ---------- 3b. O MURO DAS DUAS ALAS DA CASA ----------
    // O pedido: o muro nao para na quina da varanda, ele segue para as
    // outras duas partes da casa. Cada lado ganha duas pernas:
    //
    //   1. a que CORRE NA FRENTE, na mesma linha da frente da varanda,
    //      da quina dela ate a face externa da ala;
    //   2. a que VOLTA para a casa, rente a face externa da ala, morrendo
    //      encostada na parede frontal dela.
    //
    // Vista de cima, com a casa em cima e o caminho de terra embaixo:
    //
    //     +-----+                             +-----+
    //     | ALA |        CORREDOR             | ALA |
    //     +--+--+-----+-----------+-----+-----+--+--+
    //        |        |  VARANDA        |        |
    //        |  [muro]|=====   VAO   ===|[muro]  |
    //        +========+                 +========+
    //
    // A perna que volta LEVA A QUINA (a tampa dela comeca 4 cm antes da
    // linha da frente) e a perna da frente encosta nela dos dois lados -
    // de novo: nada sobreposto, nada coplanar.
    [
      { key: "left", sign: -1, wing: p.wings.left },
      { key: "right", sign: 1, wing: p.wings.right },
    ].forEach(function (item) {
      const wing = item.wing;
      if (!wing) {
        return;
      }
      const sign = item.sign;
      const outerX = wing.outerX;
      const innerX = outerX - sign * WALL_T; // face do muro virada para a casa
      const deckEdgeX = sign * p.deckHalfX; // quina da varanda

      // A perna que volta para a casa. O `wing.sealZ` no lugar do
      // revestimento da ala e a correcao desta rodada: alvenaria e
      // pingadeira ENTRAM 1.6 cm na parede em vez de morrer encostadas
      // nela (ver "A correcao do encontro do muro com a parede" no topo).
      wallSegments.push({
        outer: true,
        wall: {
          minX: Math.min(outerX, innerX),
          maxX: Math.max(outerX, innerX),
          minZ: p.deckFrontZ,
          maxZ: wing.sealZ,
        },
        cap: {
          minX: Math.min(outerX, innerX) - CAP_OUT,
          maxX: Math.max(outerX, innerX) + CAP_OUT,
          minZ: p.deckFrontZ - CAP_OUT,
          maxZ: wing.sealZ,
        },
        baseY: WING_WALL_BASE,
      });

      // A perna que corre na frente, ligando a ala a varanda.
      wallSegments.push({
        outer: true,
        wall: {
          minX: Math.min(innerX, deckEdgeX),
          maxX: Math.max(innerX, deckEdgeX),
          minZ: p.deckFrontZ,
          maxZ: p.deckFrontZ + WALL_T,
        },
        // A tampa desta perna e a UNICA que encurta nas duas pontas: de um
        // lado ela encosta na tampa da perna que volta, do outro na tampa
        // lateral da varanda. Sem esses 4 cm, as tres se cruzariam com o
        // topo no mesmo plano - a mesma quina piscando, so mais para fora.
        cap: {
          minX: Math.min(innerX - sign * CAP_OUT, deckEdgeX + sign * CAP_OUT),
          maxX: Math.max(innerX - sign * CAP_OUT, deckEdgeX + sign * CAP_OUT),
          minZ: p.deckFrontZ - CAP_OUT,
          maxZ: Math.min(p.deckFrontZ + WALL_T + CAP_OUT, p.frontZ),
        },
        baseY: WING_WALL_BASE,
      });
    });

    wallSegments.forEach(function (segment) {
      addSolidBox(masonry, segment.wall, segment.baseY, p.wallTopY);
      addSolidBox(masonry, segment.cap, p.wallTopY, p.capTopY);
    });

    // ---------- 4. A LAJE DE COBERTURA (o "teto" da varanda) ----------
    // Meia agua caindo da parede para a frente. Duas faces, como as aguas
    // do telhado (ver addSlab em models/roof-factory.js): a de CIMA leva a
    // telha, a de BAIXO e o forro que se ve estando na varanda. A
    // espessura entre as duas e escondida pela testeira, pelas tabuas das
    // beiras e pelo rufo - por isso nao existe tampa de borda aqui.
    const topWallY = p.underWallY + COVER_DECK;
    const topFrontY = p.underFrontY + COVER_DECK;

    shingles.addPoly(
      [
        v(-p.coverHalfX, topFrontY, p.coverFrontZ),
        v(-p.coverHalfX, topWallY, p.frontZ),
        v(p.coverHalfX, topWallY, p.frontZ),
        v(p.coverHalfX, topFrontY, p.coverFrontZ),
      ],
      ax,
      alongSlope
    );

    trim.addPoly(
      [
        v(-p.coverHalfX, p.underFrontY, p.coverFrontZ),
        v(p.coverHalfX, p.underFrontY, p.coverFrontZ),
        v(p.coverHalfX, p.underWallY, p.frontZ),
        v(-p.coverHalfX, p.underWallY, p.frontZ),
      ],
      ax,
      alongSlope
    );

    // Testeira: a tabua alta da ponta do beiral. Fica metade para dentro,
    // metade para fora da ponta - assim ela tampa a espessura da laje sem
    // deixar aresta crua.
    //
    // O topo dela sobe SLAB_BITE ACIMA da telha (antes ficava "alinhado"
    // com ela, e era esse alinhamento que piscava - ver o topo do
    // arquivo). A ponta da telha passa a morrer DENTRO da tabua, entao
    // nao existe mais face empatada e a laje continua tampada: le como o
    // labio grosso do beiral do telhado da casa (EAVE_LIP_EXTRA em
    // models/roof-factory.js), que tambem passa da espessura da agua.
    const fascia = slabPoint(
      p.coverFrontZ,
      COVER_DECK + SLAB_BITE - FASCIA_H / 2,
      0
    );
    trim.addBox(
      v(0, fascia.y, fascia.z),
      v(p.coverHalfX * 2, FASCIA_H, FASCIA_D),
      p.slopeAngle
    );

    // Tabuas das duas beiras laterais, correndo a inclinacao inteira.
    // Mesmo SLAB_BITE da testeira, pelo mesmo motivo: o topo sobe 2 cm
    // acima da telha e a beira da laje morre dentro da tabua, em vez de as
    // duas dividirem o mesmo plano ao longo dos 3 metros da inclinacao.
    const rake = slabPoint(
      (p.frontZ + p.coverFrontZ) / 2,
      COVER_DECK + SLAB_BITE - RAKE_H / 2,
      0
    );
    [-1, 1].forEach(function (sign) {
      trim.addBox(
        v(sign * p.coverHalfX, rake.y, rake.z),
        v(RAKE_W, RAKE_H, p.slopeLen),
        p.slopeAngle
      );
    });

    // Rufo: a tabua que fecha o encontro da laje com a fachada, por cima
    // da telha. O -LEDGER_D / 2 no eixo da inclinacao a empurra INTEIRA
    // para fora da parede - sem isso ela cruzaria a linha da fachada.
    // O -SLAB_BITE afunda a base dela 2 cm DENTRO da laje: era esta a
    // faixa mais visivel do bug, 12 cm de tabua por 6,3 m de largura
    // apoiados a 0.8 mm da telha, colados na fachada (ver o topo).
    const ledger = slabPoint(
      p.frontZ,
      COVER_DECK - SLAB_BITE + LEDGER_H / 2,
      -LEDGER_D / 2
    );
    trim.addBox(
      v(0, ledger.y, ledger.z),
      v(p.coverHalfX * 2, LEDGER_H, LEDGER_D),
      p.slopeAngle
    );

    // ---------- 5. AS VIGAS ----------
    // Uma na frente, sobre os quatro pilares da fileira da frente, e uma
    // de cada lado, ligando o pilar da frente ao da parede. O topo das
    // tres MORDE a laje (SLAB_BITE) em vez de encostar rente na face de
    // baixo dela: era esse "rente" que deixava o topo da viga exatamente
    // no plano do forro e fazia o teto da varanda piscar visto de baixo
    // (ver o topo do arquivo). O pedaco mordido fica escondido dentro da
    // laje, entao, olhando de baixo, a viga continua encostada no forro.
    //
    // Elas tambem passam a ser SLAB_BITE mais largas que os pilares em
    // cada lado: antes tinham a largura exata deles, e a ponta de cima do
    // pilar (que morre dentro da viga por PILLAR_TUCK) dividia as faces
    // de fora com ela, no mesmo plano - a mesma armadilha do item 2 das
    // correcoes acima. Agora o pilar morre DENTRO da viga de verdade, sem
    // nenhuma face coplanar. A viga da frente morde o dobro (SLAB_BITE *
    // 2) para o topo dela nao ficar coplanar com o topo das duas
    // laterais, que a cruzam nas quinas. E por isso tambem que ela e mais
    // larga (SLAB_BITE * 4) que as duas laterais (SLAB_BITE * 2): as duas
    // se cruzam nas quinas da varanda, e com a mesma sobra as faces de
    // fora das duas cairiam no mesmo plano - o empate de sempre, so 2 cm
    // mais para fora. Assim a lateral morre DENTRO da viga da frente.
    const frontBeam = slabPoint(p.pillarLineZ, SLAB_BITE * 2 - BEAM_H / 2, 0);
    trim.addBox(
      v(0, frontBeam.y, frontBeam.z),
      v(p.deckHalfX * 2 + SLAB_BITE * 4, BEAM_H, PILLAR + SLAB_BITE * 2),
      p.slopeAngle
    );

    // As duas vigas laterais, da fileira da frente ate a fachada.
    //
    // A ponta de tras e o item 2 das correcoes do topo: a caixa e DEITADA
    // na inclinacao, e o giro joga a quina de cima dela para tras em
    // |sin(inclinacao)| x altura. O comprimento antigo ignorava isso, a
    // quina passava 2.9 cm da fachada, a trava anti-invasao a achatava no
    // plano da parede e o encontro do telhado com a parede piscava. Agora
    // as duas pontas sao dadas em Z (sideBeamFromZ e sideBeamBackZ, este
    // 2 cm antes da fachada) e o comprimento sai DELAS, com o giro
    // descontado - por isso o Z do centro e o meio exato entre as duas, e
    // nao o que slabPoint devolve (ele desloca o centro em Z junto com o
    // deslocamento perpendicular; aqui so o Y dele interessa).
    const sideBeamFromZ = p.pillarLineZ - PILLAR / 2;
    const sideBeamBackZ = p.frontZ - SLAB_BITE;
    const sideBeamTilt = Math.abs(Math.sin(p.slopeAngle)) * SIDE_BEAM_H;
    const sideBeamLen =
      (sideBeamBackZ - sideBeamFromZ - sideBeamTilt) / Math.cos(p.slopeAngle);
    const sideBeamCenterZ = (sideBeamFromZ + sideBeamBackZ) / 2;
    const sideBeam = slabPoint(
      sideBeamCenterZ,
      SLAB_BITE - SIDE_BEAM_H / 2,
      0
    );
    [-1, 1].forEach(function (sign) {
      trim.addBox(
        v(sign * (p.deckHalfX - halfPillar), sideBeam.y, sideBeamCenterZ),
        v(PILLAR + SLAB_BITE * 2, SIDE_BEAM_H, sideBeamLen),
        p.slopeAngle
      );
    });

    // ---------- A trava anti-invasao ----------
    // Ver o topo do arquivo: nenhum vertice da varanda pode estar do lado
    // de dentro da fachada. Por construcao nao esta; isto e a rede de
    // seguranca para o dia em que a planta mudar.
    let clamped = 0;
    [masonry, shingles, trim].forEach(function (builder) {
      clamped += builder.guardHouse(p.guardBands);
    });
    if (clamped > 0 && typeof console !== "undefined" && console.warn) {
      console.warn(
        "[varanda] " +
          clamped +
          " vertice(s) entrariam na casa e foram travados na linha da fachada (z = " +
          p.frontZ.toFixed(2) +
          "). Confira `porch` em scenes/corridor-config.js."
      );
    }

    // ---------- Malhas ----------
    const swaps = []; // { mesh, night, day } - ver setDaytime abaixo

    function addMesh(name, builder, nightMaterial, dayMaterial) {
      if (builder.isEmpty() || !nightMaterial) {
        return;
      }
      const mesh = new THREE.Mesh(builder.toGeometry(), nightMaterial);
      mesh.name = name;
      // Nada na varanda se move depois de montada.
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      root.add(mesh);
      swaps.push({
        mesh: mesh,
        night: nightMaterial,
        day: dayMaterial || nightMaterial,
      });
      // Devolve a malha: a alvenaria e quem "dona" as caixas de colisao
      // do muro e dos pilares, la embaixo (ver o bloco Colisao).
      return mesh;
    }

    const masonryMesh = addMesh(
      "varanda-alvenaria",
      masonry,
      materials.porchPlaster,
      materials.porchPlasterDay
    );
    addMesh(
      "varanda-telha",
      shingles,
      materials.roofShingle,
      materials.roofShingleDay
    );
    addMesh(
      "varanda-madeiramento",
      trim,
      materials.roofTrim,
      materials.roofTrimDay
    );

    // ---------- 6. O TAPETE VERMELHO DE BOAS-VINDAS ----------
    // Em frente a porta ENTRADA & SAIDA, apoiado no piso da varanda.
    // Mesma receita dos tapetes de dentro de casa (ver createStripedRug
    // em models/carpet-factory.js): uma CAIXA rasa de 1.2 cm, e nao um
    // plano deitado - e o que tira qualquer empate de profundidade contra
    // o piso da jogada, sem polygonOffset.
    //
    // Ordem das faces de uma BoxGeometry no three.js: [+X, -X, +Y, -Y,
    // +Z, -Z]. So a de CIMA (+Y, indice 2) leva a textura com as letras;
    // as outras cinco sao a espessura do tapete, num vermelho escuro
    // liso. O UV da face de cima de uma BoxGeometry vai de 0 a 1 e a
    // textura tem repeat 1x1: o desenho aparece UMA vez, inteiro, do
    // jeito que foi desenhado.
    if (materials.welcomeMat) {
      const edge = materials.welcomeMatEdge || materials.welcomeMat;
      const edgeDay =
        materials.welcomeMatEdgeDay || materials.welcomeMatDay || edge;
      const nightFaces = [edge, edge, materials.welcomeMat, edge, edge, edge];
      const dayFaces = [
        edgeDay,
        edgeDay,
        materials.welcomeMatDay || materials.welcomeMat,
        edgeDay,
        edgeDay,
        edgeDay,
      ];
      const matMesh = new THREE.Mesh(
        new THREE.BoxGeometry(p.mat.width, p.mat.thickness, p.mat.depth),
        nightFaces
      );
      matMesh.name = "varanda-tapete-boas-vindas";
      matMesh.position.set(p.mat.x, p.mat.baseY + p.mat.thickness / 2, p.mat.z);
      matMesh.matrixAutoUpdate = false;
      matMesh.updateMatrix();
      root.add(matMesh);
      swaps.push({ mesh: matMesh, night: nightFaces, day: dayFaces });
    }

    // Noite <-> dia: mesma receita do chao externo, da fachada e do
    // telhado (troca de material por malha, sem recriar geometria). Os
    // dois sentidos existem por causa do controle de horario do Editor
    // (ver editor/editor-ui.js).
    function setDaytime(daytime) {
      const day = daytime !== false;
      swaps.forEach(function (item) {
        item.mesh.material = day ? item.day : item.night;
      });
    }

    function setMorning() {
      setDaytime(true);
    }

    // ---------- Colisao ----------
    // Muro e pilares viram solidos (caixas em X/Z, ver
    // scripts/collision.js); o PISO nao vira - solido, em X/Z, ele seria
    // uma parede no meio da varanda.
    //
    // Hoje isto e prevencao: a porta ENTRADA & SAIDA continua bloqueada
    // pela historia (ver "porta-entrada-bloqueada" em
    // objectives/objective-config.js), entao ninguem pisa na varanda
    // ainda. No dia em que ela abrir, a varanda ja tem colisao de
    // verdade - e nao um cenario atravessavel.
    // Cada caixa aponta para a malha da alvenaria (`owner`): muro,
    // pilares e piso saem todos de uma geometria unida, entao e ela o
    // objeto que o Editor vê e pode excluir. Sem esse elo, excluir a
    // alvenaria deixava o muro invisivel e ainda solido (ver `owner` em
    // scripts/collision.js).
    const solids = [];
    wallSegments.forEach(function (segment) {
      solids.push({
        owner: masonryMesh,
        minX: segment.wall.minX,
        maxX: segment.wall.maxX,
        minZ: segment.wall.minZ,
        maxZ: segment.wall.maxZ,
      });
    });
    pillars.forEach(function (pos) {
      solids.push({
        owner: masonryMesh,
        minX: pos.x - halfPillar,
        maxX: pos.x + halfPillar,
        minZ: pos.z - halfPillar,
        maxZ: Math.min(pos.z + halfPillar, p.frontZ),
      });
    });

    // ---------- Retangulos que a vista externa precisa evitar ----------
    // O da varanda (ver `footprint` em plan) mais uma faixa em volta de
    // cada perna do muro das alas. So a FAIXA do muro, e nao o quintal
    // inteiro: dentro do muro a grama continua nascendo (e um quintal, nao
    // um patio de cimento) - o que nao pode e um tufo ou um pinheiro
    // atravessando a alvenaria.
    const footprints = [p.footprint];
    wallSegments.forEach(function (segment) {
      if (!segment.outer) {
        return;
      }
      footprints.push({
        minX: segment.wall.minX - WING_FOOTPRINT_MARGIN,
        maxX: segment.wall.maxX + WING_FOOTPRINT_MARGIN,
        minZ: segment.wall.minZ - WING_FOOTPRINT_MARGIN,
        maxZ: segment.wall.maxZ + WING_FOOTPRINT_MARGIN,
      });
    });

    return {
      key: "varanda",
      label: "Varanda",
      root: root,
      group: root,
      plan: p,
      solids: solids,
      footprint: p.footprint,
      footprints: footprints,
      setDaytime: setDaytime,
      setMorning: setMorning,
    };
  }

  return {
    DEPTH: DEPTH,
    DECK_TOP: DECK_TOP,
    WALL_H: WALL_H,
    WALL_T: WALL_T,
    OPENING: OPENING,
    PILLAR: PILLAR,
    WING_WALL_CLEARANCE: WING_WALL_CLEARANCE,
    TEX_SCALE: TEX_SCALE,
    plan: plan,
    build: build,
  };
})();
