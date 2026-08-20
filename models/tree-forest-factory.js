/**
 * models/tree-forest-factory.js
 * -------------------------------------------------
 * A FLORESTA que cerca a casa, vista atraves do vidro das tres janelas
 * do jogo (as duas do corredor + a de "MEU QUARTO" - ver
 * models/window-factory.js). Terceira e ultima camada da vista externa,
 * empilhada em cima das duas que ja existiam, sem substituir nenhuma
 * delas:
 *
 *   models/exterior-factory.js .... o terreno (plano texturizado)
 *   models/grass-field-factory.js . os tufos de grama em cima dele
 *   models/tree-forest-factory.js . a mata que fecha o horizonte  <=
 *
 * Modelo: assets/models/arvores_psx.glb (enviado pelo jogador - pacote
 * "Pine Trees Pack | PS1 Low Poly" de Vova Truestory, CC-BY-4.0, com a
 * textura ja reprocessada em estilo PSX). Carregado pelo MESMO
 * THREE.GLTFLoader ja usado por todos os outros modelos importados do
 * jogo (ver models/grass-field-factory.js, models/trash-can-factory.js,
 * models/wardrobe-factory.js etc.) - nenhum sistema novo de importacao
 * foi criado aqui, exatamente como pedido.
 *
 * O arquivo traz TRES pinheiros diferentes num so .glb
 * (Tree_Pine_T1/T2/T3, 154 + 100 + 99 = 353 triangulos no total),
 * cada um em torno da propria origem. Sao tratados como tres VARIANTES
 * sorteadas por instancia: mesmo custo de um modelo so, tres siluetas
 * distintas espalhadas pela mata - o primeiro (e mais barato) truque
 * contra o aspecto de "mesma arvore clonada".
 *
 * ---------- Desempenho (o jogo e mobile) ----------
 *  1. THREE.InstancedMesh, igual a grama: uma malha por (faixa x
 *     variante). Sao ~220 arvores por janela desenhadas em 12 draw
 *     calls de dia e 3 de noite - nao ~220 objetos independentes.
 *     Geometria e material sao criados UMA vez (nivel de modulo) e
 *     compartilhados pelas tres janelas; cada floresta so tem a propria
 *     lista de matrizes de instancia.
 *
 *  2. Nenhum nivel de detalhe (LOD) foi necessario aqui - diferente da
 *     grama, que precisou de tres versoes da geometria. A arvore mais
 *     pesada do pacote tem 154 triangulos: a floresta inteira de uma
 *     janela fica em ~26 mil triangulos de dia, contra os ~73 mil que a
 *     grama ja custava. Cortar laminas de um modelo tao barato so
 *     adicionaria codigo.
 *
 *  3. As tres faixas mais distantes nascem invisiveis e so aparecem de
 *     dia - mesma regra (e mesmo motivo) da grama: de noite a nevoa da
 *     cena fecha 100% preta a 13 unidades (Atmosphere.NIGHT em
 *     scripts/atmosphere.js) e nao ha luz nenhuma la fora, entao
 *     qualquer arvore alem disso seria um pixel preto identico ao
 *     fundo. De noite sobra so a primeira faixa, o suficiente para a
 *     silhueta da mata existir contra o pouco que a janela mostra.
 *     Custo noturno: ~44 arvores, ~5 mil triangulos, 3 draw calls.
 *
 * ---------- Casa -> grama -> floresta ----------
 * A regra de composicao pedida sai de duas travas que se somam:
 * CLEARING_BASE/forestEdge, que abre uma CLAREIRA de grama de 8 a ~13,8
 * unidades medida em linha reta a partir da JANELA, e WALL_STANDOFF,
 * que garante 6 metros de gramado livre ao longo da fachada da casa,
 * inclusive nas direcoes de esguelha em que a conta radial sozinha
 * deixaria uma arvore chegar perto da parede. Nenhuma arvore, nenhum
 * galho, encosta em parede, porta ou vidro - o gramado inteiro de
 * models/grass-field-factory.js preenche esse vao.
 *
 * ---------- Flancos: a mata tambem fecha de esguelha ----------
 * As duas travas acima, sozinhas, deixavam um BURACO nos angulos
 * extremos - o problema relatado (e circulado nos prints) pelo
 * jogador. O motivo era geometrico, nao de densidade:
 *
 *   - WALL_STANDOFF era medido ate o PLANO da parede (z no espaco
 *     local), e o plano nao acaba nunca. Isso abria um corredor de
 *     grama de 6 metros de largura que corria ao lado da casa ate o
 *     infinito, para os dois lados.
 *   - Olhando pela janela de esguelha, a linha de visao anda quase
 *     paralela a parede: ela fica dentro desse corredor por dezenas de
 *     metros. A primeira arvore possivel numa mirada a X graus da
 *     normal so aparecia a 6/cos(X) metros - 12 m a 60 graus, 17 m a
 *     70 graus, e NADA a partir de ~73 graus, porque ai a conta ja
 *     passa do alcance da ultima faixa (27 m).
 *   - Resultado: de esguelha o jogador via gramado + ceu, ou uma ou
 *     outra arvore ja comida pela nevoa - a mata "acabava".
 *
 * A correcao troca as duas medidas por versoes que conhecem a CASA, em
 * vez de conhecerem so o plano infinito da parede e o ponto da janela:
 *
 *   1. A folga passa a ser medida ate a FACHADA de verdade (o trecho
 *      de parede da casa, options.facade - ver createForest), e nao
 *      ate o plano dela. Longe do fim da parede, a conta e a mesma de
 *      antes; passando do canto da casa, ela vira distancia ate o
 *      canto, entao a mata pode CONTORNAR a construcao em vez de
 *      correr reto ate o infinito.
 *   2. Tanto essa folga quanto a clareira encolhem conforme a arvore
 *      se afasta da janela ao longo da parede (YARD_FLAT -> YARD_END,
 *      com smoothstep): de frente para a janela, onde o jogador passa
 *      99% do tempo olhando, absolutamente nada muda (mesma clareira
 *      de 8-13,8 m, mesmos 6 m de gramado); ja a 13 m para o lado o
 *      quintal se fecha e a mata encosta na faixa de grama, como um
 *      terreno aberto de verdade que termina em vez de virar um
 *      corredor.
 *
 * Medido com as tres janelas do jogo, varrendo o cone de visao
 * possivel de cada uma (todas as posicoes em que o jogador cabe perto
 * da parede x toda a abertura do vao): as miradas que terminavam sem
 * mata dentro do alcance da nevoa cairam de ~61% para ~6% - e o que
 * sobra sao raios apontados para CIMA da copa das arvores mais
 * distantes (ceu, como sempre foi) ou para o gramado logo abaixo do
 * peitoril. Nenhuma direcao horizontal termina mais em vazio.
 *
 * A borda da clareira NAO e um circulo perfeito: forestEdge() ondula o
 * raio com duas senoides de frequencias diferentes, com fase sorteada
 * por janela. E o que impede a leitura de "a mata comeca num arco
 * desenhado com compasso" - em algumas direcoes o mato avanca sobre o
 * gramado, em outras recua, como uma orla de floresta de verdade.
 *
 * ---------- Profundidade (quatro faixas) ----------
 * Nao existe "uma fileira de arvores": BANDS empilha QUATRO faixas
 * concentricas (orla, mata, funda, horizonte) ate onde a nevoa ainda
 * deixa alguma coisa aparecer, cada uma com espacamento, porte e cor
 * proprios (ver a tabela). Olhando pela janela, o jogador ve
 * arvores na frente de arvores na frente de arvores, cada camada mais
 * alta, mais espacada e mais desbotada que a anterior - a mata continua
 * para longe ate se desfazer na bruma.
 *
 * O porte CRESCE com a distancia (5,5-8 m na orla, 10-13 m no
 * horizonte) pelo mesmo motivo que na grama: a partir de ~20 unidades a
 * nevoa de dia (fogFar = 28) ja esta comendo a cena e a tela nao
 * distingue mais o tamanho de uma arvore isolada, so a massa. Arvores
 * maiores e mais espacadas cobrem a mesma area do horizonte por uma
 * fracao do custo - e a silhueta mais alta la no fundo ainda reforca a
 * sensacao de mata fechada subindo atras da primeira linha.
 *
 * O DAY_TINT de cada faixa vai perdendo saturacao junto (perspectiva
 * aerea, o mesmo que a pintura de paisagem faz), entao a separacao
 * entre as camadas se le mesmo antes de a nevoa agir.
 *
 * ---------- Tres janelas, tres vistas ----------
 * Toda a aleatoriedade sai de um PRNG com semente explicita
 * (mulberry32), nunca de Math.random - a mesma escolha da grama, e pelo
 * mesmo motivo: a floresta fica IDENTICA a cada vez que a cena e
 * remontada (o jogador entra e sai do quarto varias vezes, ver
 * cutscenes/room-transition.js). A semente vem do id da janela, entao
 * as tres janelas do jogo mostram florestas DIFERENTES - posicoes,
 * portes, variantes de pinheiro e ate o desenho da orla da clareira
 * (a fase de forestEdge) mudam de uma para a outra, mantendo a mesma
 * densidade.
 *
 * ---------- Nenhuma arvore dentro da casa ----------
 * Regra dura, garantida pela matematica da distribuicao e nao por
 * tentativa e erro - identica a da grama. O grupo devolvido por
 * createForest e ancorado NA PAREDE, com o +Z local apontando para FORA
 * da casa (quem posiciona e gira e a cena, como ja faz com o chao e com
 * o gramado). No espaco local, "dentro da casa" e simplesmente z <= 0,
 * e nenhuma instancia e aceita sem que
 *
 *     z >= alcance_horizontal_da_arvore + WALL_SAFETY
 *
 * usando o alcance REAL da variante sorteada (medido no arquivo,
 * MODEL_REACH abaixo) multiplicado pela escala daquela instancia. Na
 * pratica a clareira de 8,5+ unidades ja torna esse teste folgado por
 * uma ordem de grandeza - ele fica como trava de seguranca: mesmo que
 * um dia alguem encoste a floresta na casa mexendo em CLEARING_BASE,
 * continua sendo impossivel uma arvore atravessar parede, porta, vao de
 * janela, piso ou teto. Nao existe instancia com z negativo para
 * comecar.
 *
 * ---------- Noite e dia ----------
 * O MESMO modelo e a MESMA geometria servem para os dois periodos; a
 * troca e so de material, pelo mesmo caminho ja usado pelo chao e pelo
 * gramado (setMorning):
 *
 *   - Noite: MeshStandardMaterial - reage a iluminacao da cena e, como
 *     do lado de fora so chega a luz ambiente (0x141018 a 0.35, ver
 *     scripts/main.js), a mata escurece junto com o resto da noite.
 *   - Dia: MeshBasicMaterial, obrigatoriamente - o chao externo e a
 *     grama ja trocam para material chapado de manha
 *     (materials.grassDay, ver materials/material-library.js). Uma
 *     floresta iluminada em cima de um gramado chapado apareceria preta
 *     contra o verde claro. A nevoa continua ligada (fog: true), entao
 *     a distancia continua se desfazendo na bruma.
 *
 * O material vem do proprio .glb com alphaMode MASK (recorte binario,
 * alphaTest 0.5) em vez de BLEND: a folhagem escreve profundidade
 * normalmente e nao existe nenhum problema de ordenacao de
 * transparencia, mesmo com centenas de copas se sobrepondo. E de
 * quebra e o recorte serrilhado certo para a estetica PSX.
 * -------------------------------------------------
 */

window.TreeForestFactory = (function () {
  const MODEL_URL = "assets/models/arvores_psx.glb";

  // ---------- Medidas nativas do arquivo .glb ----------
  // Tiradas dos vertices ja com a hierarquia de nos resolvida (o
  // GLTFLoader aplica as matrizes "assadas" ao montar gltf.scene -
  // aqui elas incluem a conversao Z-up -> Y-up que o export do
  // Sketchfab deixou no no raiz, entao as arvores ja chegam EM PE, sem
  // precisar de nenhuma rotacao de correcao como a do relogio em
  // models/clock-factory.js):
  //
  //   Tree_Pine_T1 : altura 13.48 nativa, 154 triangulos, alcance 0.45
  //   Tree_Pine_T2 : altura 17.92 nativa, 100 triangulos, alcance 0.34
  //   Tree_Pine_T3 : altura 11.39 nativa,  99 triangulos, alcance 0.50
  //
  // Cada geometria e NORMALIZADA no carregamento (ver
  // normalizeGeometry, copia da mesma funcao da grama): recentralizada
  // em X/Z, com a base em Y = 0 e altura exatamente 1. Assim a escala
  // de cada instancia e, literalmente, a ALTURA DA ARVORE EM METROS do
  // jogo - os numeros de BANDS abaixo se leem direto ("pinheiro de 9
  // metros") em vez de virarem multiplicadores arbitrarios.
  //
  // "Alcance" acima e o maior raio horizontal a partir do proprio
  // centro, em unidades de ALTURA - NAO metade da caixa envolvente:
  // como cada instancia gira livremente em Y, o que importa e o vertice
  // mais distante do centro no plano XZ (a ponta de galho mais baixa e
  // comprida). E medido de verdade no carregamento, variante por
  // variante (ver measureReach), e nao chutado - e dele que sai a folga
  // de parede descrita no topo. Os valores acima ficam so de
  // referencia para quem for calibrar BANDS.

  // Folga minima, em metros, entre a ponta de galho mais comprida de
  // qualquer arvore e o plano da parede (z = 0 no espaco local da
  // floresta). Soma-se a ela o proprio ExteriorFactory.WALL_GAP com que
  // a cena afasta o grupo da parede. Ver "Nenhuma arvore dentro da
  // casa" no topo.
  const WALL_SAFETY = 0.5;

  // Faixa de gramado, em metros, que fica LIVRE ao longo de toda a
  // fachada - medida do plano da parede (z = 0 no espaco local) ate a
  // ponta de galho mais proxima de qualquer arvore. Diferente de
  // CLEARING_BASE/forestEdge, que mede a clareira em linha reta a
  // partir da JANELA: sem esta segunda trava, uma arvore bem para o
  // lado podia estar a 9 unidades do vidro (passando na conta radial) e
  // ainda assim a menos de um metro da parede, exatamente o "arvore
  // encostada na casa" que nao se quer. Com ela, qualquer parte de
  // qualquer arvore, em QUALQUER direcao, para a 6 metros da
  // construcao - a casa fica no meio de um gramado aberto de verdade,
  // nao so de frente para a janela.
  const WALL_STANDOFF = 6;

  // ---------- Fechamento dos flancos (ver "Flancos" no topo) ----------
  // A folga de WALL_STANDOFF acima e a clareira de CLEARING_BASE abaixo
  // valem inteiras enquanto a arvore esta no maximo YARD_FLAT metros de
  // lado a partir da janela - ou seja, em tudo que o jogador ve olhando
  // reto para fora. A partir dai elas vao encolhendo (smoothstep) ate os
  // valores SIDE_* em YARD_END metros de lado, e ficam neles dali para
  // fora. E isso que fecha a mata nos angulos extremos sem tocar em uma
  // unica arvore da vista frontal.
  //
  // Os numeros nao sao chutados: SIDE_STANDOFF 1.2 e o que faz a linha
  // de visao de esguelha (que anda quase colada na parede) cruzar copa
  // de arvore antes de a nevoa fechar. Menos que isso nao melhora mais
  // nada - a trava dura de parede (z >= alcance + WALL_SAFETY) passa a
  // ser o limite - e mais que isso reabre o buraco.
  const YARD_FLAT = 6.5;
  const YARD_END = 13;
  const SIDE_STANDOFF = 1.2;
  const SIDE_CLEARING = 2.8;

  // Quanto a fachada informada pela cena e ESTICADA para cada lado
  // antes de virar conta. Serve de folga para o canto da casa: sem ela,
  // a mata poderia dobrar a esquina rente a quina da parede.
  const FACADE_MARGIN = 1.5;

  // Fachada usada quando a cena nao informa nenhuma (nunca acontece no
  // jogo hoje - as tres janelas passam a sua, ver scenes/*-scene.js).
  // Valor conservador: casa pequena, mata contornando cedo.
  const DEFAULT_FACADE = { left: 6, right: 6 };

  // Quanto a base do tronco afunda no chao externo (y = 0). Sem isso, o
  // aro de vertices da base fica coplanar com o plano do terreno e pode
  // piscar (z-fighting); afundando alguns centimetros, a arvore tambem
  // "nasce" do chao em vez de parecer apoiada em cima dele. Um pouco
  // maior que o GROUND_SINK da grama porque o tronco e bem mais grosso
  // que uma lamina.
  const GROUND_SINK = 0.15;

  // Limite lateral: o chao externo de cada janela e um quadrado de
  // ExteriorFactory.GROUND_SIZE (60) centrado nela, ou seja, so existe
  // terreno ate 30 unidades para cada lado. Este limite mantem toda
  // arvore (copa inclusa) dentro dele - uma arvore alem da borda ficaria
  // "plantada no vazio", ainda que a nevoa ja a esconda muito antes.
  const LATERAL_LIMIT = window.ExteriorFactory.GROUND_SIZE / 2 - 3;

  // ---------- Folga do CAMINHO DE TERRA ----------
  // Ver models/dirt-path-factory.js, bloco "Caminho limpo". Quando a
  // cena passa options.path, nenhuma arvore e SORTEADA dentro da
  // estrada mais a folga calculada abaixo: nao existe nenhuma para
  // remover depois, nao ha teste por quadro, e e por isso que e
  // impossivel nascer arvore no meio da pista. Sem options.path (as
  // outras duas janelas do jogo) nada muda - a mata delas continua
  // exatamente a de antes.
  //
  // A folga NAO e o alcance cheio da copa somado a uma constante, como
  // a da parede. Seria a conta obvia e esta errada: o alcance real de
  // um pinheiro aqui vai de 1,6 a 7,8 metros conforme a faixa e a
  // escala sorteadas (ver o bloco "Medidas nativas"), entao exigir que
  // ate a ponta de galho mais comprida ficasse fora da estrada abriria
  // um rasgo de 12 a 18 metros na mata - uma CLAREIRA comprida, nao
  // uma estrada. O pedido e o contrario: a estrada CORTA a floresta,
  // com as arvores bem juntas dos dois lados dela.
  //
  // Entao a regra se separa em duas, e vale sempre a MAIOR delas:
  //
  //   1. TRUNK_STANDOFF: nenhum TRONCO a menos de 1,3 m da borda da
  //      terra. E o que garante o pedido de nada plantado na pista nem
  //      encostado nela, qualquer que seja o tamanho da arvore.
  //   2. reach - CANOPY_OVERHANG: a copa pode passar da borda, mas no
  //      maximo 25 cm - e sempre 25 cm, tanto no pinheiro de 5,5 m
  //      quanto no de 13 m. Como a conta usa o alcance REAL da
  //      variante ja escalada, a arvore grande simplesmente nasce mais
  //      longe, e o resultado na tela fica igual em todas as faixas.
  //
  // O efeito somado e um corredor de copas que quase se tocam por cima
  // das duas bordas, com o miolo da estrada sempre aberto: leitura de
  // estrada de mata, sem nada atravessando o caminho.
  const TRUNK_STANDOFF = 1.3;
  const CANOPY_OVERHANG = 0.25;

  // ---------- A clareira (casa -> grama -> floresta) ----------
  // Raio medio, em metros, da area aberta de grama entre a parede e a
  // primeira arvore. As duas senoides de forestEdge() ondulam esse raio
  // entre ~8.5 e ~14.5 conforme a direcao, para a orla da mata nao
  // virar um arco geometrico. Ver "Casa -> grama -> floresta" no topo.
  const CLEARING_BASE = 10.8;
  const EDGE_WAVE_LONG = 2.0; // ondulacao larga (poucos avancos/recuos grandes)
  const EDGE_WAVE_SHORT = 1.0; // ondulacao curta (irregularidade fina da orla)

  // Distancia da parede (em metros) a partir da qual a orla pode
  // avancar, em qualquer caso. Trava de sanidade independente das
  // senoides acima: mexer em CLEARING_BASE nunca encosta a mata na casa.
  const CLEARING_FLOOR = 8;

  /**
   * Raio da orla da floresta numa dada direcao. `angle` e o angulo
   * horizontal da posicao em relacao ao "reto para fora da janela"
   * (0 = de frente para a parede, +-PI/2 = rente a fachada); `phase`
   * muda o desenho da orla de uma janela para outra.
   */
  // Interpolacao suave classica (0 antes de edge0, 1 depois de edge1,
  // com derivada zero nas duas pontas): a transicao entre a clareira
  // frontal e o fechamento dos flancos precisa ser continua, senao a
  // orla da mata ganharia um degrau reto bem no meio da vista - o
  // oposto do pedido de composicao organica.
  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function forestEdge(angle, phase) {
    const r =
      CLEARING_BASE +
      EDGE_WAVE_LONG * Math.sin(angle * 2.7 + phase) +
      EDGE_WAVE_SHORT * Math.sin(angle * 6.1 + phase * 1.7 + 2.3);
    return Math.max(CLEARING_FLOOR, r);
  }

  // ---------- Faixas de profundidade ----------
  // from/to: distancia (em metros do jogo) do ponto da janela. A faixa
  //          de orla comeca antes da clareira de proposito: quem
  //          realmente recorta a borda interna dela e forestEdge()
  //          acima, para o corte ficar ondulado em vez de circular.
  // spacing: passo da grade antes do "chacoalho" - quanto menor, mais
  //          densa a mata. Calibrado bem abaixo do diametro de copa de
  //          cada faixa, entao as copas se entrelacam e nao sobra buraco
  //          de bruma entre elas (o pedido era floresta FECHADA).
  // minScale/maxScale: altura final da arvore, em metros.
  // A mata e a MESMA de dia e de noite (nada de faixa escondida).
  // tint: cor do material de DIA (perspectiva aerea, ver o topo).
  const BANDS = [
    {
      name: "orla",
      from: 8,
      to: 15,
      spacing: 1.75,
      minScale: 5.5,
      maxScale: 8,
      tint: 0x5f7a4a,
    },
    {
      name: "mata",
      from: 15,
      to: 19.5,
      spacing: 1.85,
      minScale: 7,
      maxScale: 10,
      tint: 0x66804f,
    },
    {
      name: "funda",
      from: 19.5,
      to: 23.5,
      spacing: 1.95,
      minScale: 8.5,
      maxScale: 11.5,
      tint: 0x6e8759,
    },
    {
      name: "horizonte",
      from: 23.5,
      to: 27,
      spacing: 2.1,
      minScale: 10,
      maxScale: 13,
      tint: 0x778f66,
    },
  ];

  // Variacao de LARGURA por instancia (a altura ja vem do sorteio de
  // escala da faixa). Escala nao uniforme: o mesmo pinheiro entra ora
  // mais espigado, ora mais atarracado. Como a arvore e sempre girada
  // em torno do proprio eixo Y, aplicar o mesmo fator em X e Z mantem o
  // resultado independente da rotacao (nada de arvore "amassada" para
  // um lado so).
  const WIDTH_MIN = 0.85;
  const WIDTH_MAX = 1.2;

  // Inclinacao maxima do tronco, em radianos (~3.4 graus), em uma
  // direcao sorteada. Pouquissimo - o bastante para a floresta perder o
  // alinhamento de "poste de luz" sem virar um cenario de vendaval.
  const MAX_TILT = 0.06;

  // Esfera de corte (frustum culling) usada pelas malhas instanciadas.
  // PRECISA ser definida na mao, pelo mesmo motivo ja documentado em
  // models/grass-field-factory.js: no three.js r128 o corte de uma
  // THREE.InstancedMesh usa a boundingSphere da GEOMETRIA (uma arvore
  // so, na origem do grupo) e ignora as matrizes de instancia - sem
  // isso, a floresta inteira sumiria da tela sempre que a origem do
  // grupo (o ponto da janela) saisse do campo de visao, que e
  // exatamente o que acontece ao olhar de esguelha pelo vidro.
  // Generosa de proposito: cobre as tres faixas com folga, e o corte
  // continua funcionando de verdade quando o jogador esta de costas
  // para a janela (o caso que importa).
  const FIELD_SPHERE_CENTER = new THREE.Vector3(0, 5, 16);
  const FIELD_SPHERE_RADIUS = 36;

  const UP = new THREE.Vector3(0, 1, 0);

  // ---------- Sorteio deterministico ----------
  // mulberry32: mesmo gerador da grama (ver "Tres janelas, tres vistas"
  // no topo para o motivo de nao usar Math.random).
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
    const s = String(text || "floresta");
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // ---------- Carregamento (uma vez para o jogo inteiro) ----------
  let sharedLoader = null;
  function getLoader() {
    if (!sharedLoader) {
      sharedLoader = new THREE.GLTFLoader();
    }
    return sharedLoader;
  }

  let assets = null;
  let loading = false;
  const waiting = [];

  // As tres janelas pedem a floresta cada uma na construcao da sua
  // cena. Sem esta fila, o mesmo .glb seria lido e processado tres
  // vezes (e geraria tres copias da mesma geometria na GPU). Continua
  // sendo o GLTFLoader de sempre - so nao pedimos duas vezes o que ja
  // esta na mao. Mesma fila da grama.
  function whenReady(callback) {
    if (assets) {
      callback(assets);
      return;
    }
    waiting.push(callback);
    if (loading) {
      return;
    }
    loading = true;
    getLoader().load(
      MODEL_URL,
      function onLoad(gltf) {
        assets = prepareAssets(gltf);
        while (waiting.length) {
          waiting.shift()(assets);
        }
      },
      undefined,
      function onError(error) {
        console.error("TreeForestFactory: falha ao carregar " + MODEL_URL, error);
      }
    );
  }

  // Mesmo tratamento de textura dos outros modelos importados (ver
  // normalizeTexture em models/grass-field-factory.js): filtro nearest
  // e sem mipmap para o pixel "cru" do visual PSX, encoding linear como
  // todo o resto do jogo. O modo de repeticao (wrapS/wrapT) NAO e
  // tocado: as UVs deste modelo saem bastante fora do intervalo 0-1
  // (V vai de -2.7 a 3.7) e dependem do REPEAT que ja vem do arquivo.
  function normalizeTexture(map) {
    if (!map) {
      return;
    }
    map.magFilter = THREE.NearestFilter;
    map.minFilter = THREE.NearestFilter;
    map.generateMipmaps = false;
    map.encoding = THREE.LinearEncoding;
    map.needsUpdate = true;
  }

  // Traz a geometria do arquivo para a convencao descrita no bloco
  // "Medidas nativas": escala do jogo, base em Y = 0, centro em X/Z e
  // altura exatamente 1.
  function normalizeGeometry(mesh) {
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    geo.computeBoundingBox();

    const box = geo.boundingBox;
    const centerX = (box.min.x + box.max.x) / 2;
    const centerZ = (box.min.z + box.max.z) / 2;
    const height = box.max.y - box.min.y;

    geo.translate(-centerX, -box.min.y, -centerZ);
    geo.scale(1 / height, 1 / height, 1 / height);

    // Atributos que nao usamos so ocupariam memoria de GPU a toa.
    Object.keys(geo.attributes).forEach(function (name) {
      if (name !== "position" && name !== "normal" && name !== "uv") {
        geo.deleteAttribute(name);
      }
    });

    return geo;
  }

  // Maior raio horizontal da geometria ja normalizada - ver o bloco
  // "Medidas nativas" e "Nenhuma arvore dentro da casa" no topo.
  function measureReach(geo) {
    const pos = geo.attributes.position;
    let maxSq = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const d = x * x + z * z;
      if (d > maxSq) {
        maxSq = d;
      }
    }
    return Math.sqrt(maxSq);
  }

  // Ver FIELD_SPHERE_CENTER/RADIUS.
  function applyFieldBounds(geo) {
    geo.boundingSphere = new THREE.Sphere(FIELD_SPHERE_CENTER.clone(), FIELD_SPHERE_RADIUS);
    geo.boundingBox = new THREE.Box3(
      new THREE.Vector3(-34, -2, 0),
      new THREE.Vector3(34, 16, 35)
    );
  }

  function prepareAssets(gltf) {
    gltf.scene.updateMatrixWorld(true);

    // As tres arvores do pacote, na ordem em que aparecem no arquivo
    // (Tree_Pine_T1/T2/T3). Ordem estavel = sorteio estavel.
    const sourceMeshes = [];
    gltf.scene.traverse(function (node) {
      if (node.isMesh) {
        sourceMeshes.push(node);
      }
    });
    if (!sourceMeshes.length) {
      console.error("TreeForestFactory: nenhuma malha encontrada em " + MODEL_URL);
      return { geometries: [], reaches: [], nightMaterial: null, dayMaterials: {} };
    }

    const geometries = [];
    const reaches = [];
    sourceMeshes.forEach(function (mesh) {
      const geo = normalizeGeometry(mesh);
      reaches.push(measureReach(geo));
      applyFieldBounds(geo);
      geometries.push(geo);
    });

    const sourceMaterial = Array.isArray(sourceMeshes[0].material)
      ? sourceMeshes[0].material[0]
      : sourceMeshes[0].material;
    const map = sourceMaterial ? sourceMaterial.map : null;
    normalizeTexture(map);

    // alphaTest 0.5 = o alphaMode MASK que o proprio .glb ja declara
    // (ver o final do comentario do topo). Repetido aqui na mao porque
    // os materiais abaixo sao novos, nao o do arquivo.
    // THREE.DoubleSide porque a folhagem sao cartoes/casquinhas abertas
    // - sem isso, metade das copas sumiria dependendo do angulo (o
    // proprio arquivo ja vem marcado como doubleSided).
    const nightMaterial = new THREE.MeshStandardMaterial({
      map: map,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
      transparent: false,
    });

    const dayMaterials = {};
    BANDS.forEach(function (band) {
      dayMaterials[band.name] = new THREE.MeshBasicMaterial({
        map: map,
        color: band.tint,
        side: THREE.DoubleSide,
        alphaTest: 0.5,
        transparent: false,
        fog: true,
      });
    });

    return {
      geometries: geometries,
      reaches: reaches,
      nightMaterial: nightMaterial,
      dayMaterials: dayMaterials,
    };
  }

  // ---------- Distribuicao ----------
  // Grade "chacoalhada" (jittered grid) sobre o retangulo que envolve a
  // faixa, filtrada depois pelo raio, pela orla ondulada e pelas travas
  // de seguranca. Nada de linhas retas, espacamento constante nem
  // arvores clonadas na mesma pose. Devolve as poses de uma faixa ja
  // separadas por variante de pinheiro (uma lista por variante = uma
  // InstancedMesh por variante).
  // ---------- Construcao nova no caminho ----------
  // `exclusions` (ver options.exclusions em createForest) sao
  // retangulos do ESPACO LOCAL do campo em que nao pode nascer arvore
  // nenhuma: hoje, os quatro comodos novos da casa (ver
  // scenes/side-room-scene.js e o bloco "Comodos novos x vista externa"
  // em scenes/corridor-scene.js).
  //
  // Por que a folga de fachada (WALL_STANDOFF/SIDE_STANDOFF) nao
  // bastava: ela mede a distancia ate a PAREDE DA JANELA, e nos flancos
  // ela cai para SIDE_STANDOFF (1.2 m) para a mata poder contornar a
  // quina da casa. Os comodos novos avancam quase 5 metros para dentro
  // desse quintal, exatamente na regiao de flanco - sem esta trava,
  // apareceria pinheiro dentro da COZINHA e do BANHEIRO.
  //
  // A margem usada por quem chama e o `reach` REAL da instancia (raio
  // horizontal da copa, ja com a escala sorteada), entao nem a copa
  // encosta na parede: nada de galho atravessando o comodo.
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

  function buildPlacements(
    band,
    rng,
    edgePhase,
    ready,
    facade,
    path,
    exclusions,
    lateralLimit
  ) {
    const variantCount = ready.geometries.length;
    const byVariant = [];
    for (let v = 0; v < variantCount; v++) {
      byVariant.push([]);
    }

    const cells = Math.ceil(band.to / band.spacing);
    const jitter = band.spacing * 0.85;

    for (let gx = -cells; gx <= cells; gx++) {
      for (let gz = 0; gz <= cells; gz++) {
        // Os sorteios acontecem SEMPRE, mesmo quando a celula e
        // descartada logo abaixo: e o que mantem a sequencia do PRNG
        // estavel (mesma semente, mesma floresta, sempre).
        const jx = (rng() - 0.5) * jitter;
        const jz = (rng() - 0.5) * jitter;
        const height = band.minScale + rng() * (band.maxScale - band.minScale);
        const width = WIDTH_MIN + rng() * (WIDTH_MAX - WIDTH_MIN);
        const rotation = rng() * Math.PI * 2;
        const tiltDir = rng() * Math.PI * 2;
        const tiltAmount = rng() * MAX_TILT;
        const variant = Math.min(variantCount - 1, Math.floor(rng() * variantCount));

        const x = gx * band.spacing + jx;
        const z = gz * band.spacing + jz;
        const distance = Math.sqrt(x * x + z * z);

        if (distance < band.from || distance >= band.to) {
          continue;
        }

        // Quanto esta arvore esta "de lado" em relacao a janela:
        // 0 = na vista frontal (nada muda em relacao a antes),
        // 1 = ja no flanco, onde o quintal se fecha (ver o bloco
        // "Flancos" no topo do arquivo).
        const flank = smoothstep(YARD_FLAT, YARD_END, Math.abs(x));

        // A clareira: casa -> area aberta de grama -> floresta.
        // atan2(x, z) = 0 olhando reto para fora da janela. Com flank =
        // 0 esta linha e exatamente a de sempre; nos flancos ela abre
        // caminho para a mata fechar o angulo.
        const clearing =
          forestEdge(Math.atan2(x, z), edgePhase) * (1 - flank) +
          SIDE_CLEARING * flank;
        if (distance < clearing) {
          continue;
        }

        // Folga ate a CASA - nao ate o plano infinito da parede. Dentro
        // do trecho de fachada informado pela cena, `outside` e 0 e a
        // conta cai no z de sempre; passando do canto, ela vira a
        // distancia real ate a quina, e e por isso que a mata consegue
        // contornar a construcao (ver "Flancos" no topo).
        const reach = ready.reaches[variant] * height * width;
        const outside = Math.max(facade.min - x, 0, x - facade.max);
        const houseDist = Math.sqrt(outside * outside + z * z);
        const standoff = WALL_STANDOFF * (1 - flank) + SIDE_STANDOFF * flank;
        if (houseDist < reach + standoff) {
          continue;
        }

        // A regra dura de "nenhuma arvore dentro da casa" - ver o bloco
        // dedicado no topo do arquivo. Usa o alcance REAL da variante
        // sorteada, ja multiplicado pela escala desta instancia. As duas
        // travas acima ja sao bem mais folgadas que esta em qualquer
        // direcao; ela fica como ultima linha de defesa, e continua
        // valendo tal e qual: nenhuma instancia com z negativo, nenhum
        // galho cruzando parede, porta, vidro, corredor ou quarto.
        if (z < reach + WALL_SAFETY) {
          continue;
        }
        // Nenhum TRONCO fora do terreno - ou fora da largura pedida por
        // esta mata, ver options.lateralLimit. A copa das arvores das faixas
        // mais distantes pode passar da borda do plano de chao, e tudo
        // bem: qualquer arvore encostada nesse limite esta a mais de 25
        // unidades da janela, ou seja, ja 100% comida pela nevoa nas
        // duas paletas (ver Atmosphere em scripts/atmosphere.js).
        if (Math.abs(x) > lateralLimit) {
          continue;
        }
        // Fora da estrada de terra: tronco a pelo menos TRUNK_STANDOFF
        // da borda, copa passando dela no maximo CANOPY_OVERHANG. Ver o
        // bloco de comentario dessas duas constantes la em cima. reach
        // ja e o alcance horizontal REAL desta instancia, com a escala
        // sorteada aplicada.
        if (path) {
          const pathMargin = Math.max(TRUNK_STANDOFF, reach - CANOPY_OVERHANG);
          if (path.contains(x, z, pathMargin)) {
            continue;
          }
        }
        // Fora da construcao nova (comodos da casa) - ver
        // hitsExclusion acima.
        if (exclusions.length && hitsExclusion(exclusions, x, z, reach)) {
          continue;
        }

        byVariant[variant].push({
          x: x,
          z: z,
          height: height,
          width: width,
          rotation: rotation,
          tiltDir: tiltDir,
          tiltAmount: tiltAmount,
        });
      }
    }

    return byVariant;
  }

  /**
   * Cria a floresta de UMA janela.
   *
   * Convencao de espaco local: EXATAMENTE a mesma de
   * GrassFieldFactory.createGrassField - origem no pe da parede, na
   * posicao da janela; +Z aponta para FORA da casa; Y = 0 e o chao
   * externo. Quem chama so precisa de group.position.set(...) no plano
   * da parede e group.rotation.y apontando o +Z local para fora - ou
   * seja, os mesmos dois numeros que a cena ja calcula para o gramado,
   * sem nenhuma conta nova.
   *
   * options.seed: qualquer texto estavel (o id da janela serve) para a
   * floresta daquela janela nao ser identica a das outras.
   *
   * options.exclusions: lista de retangulos {minX,maxX,minZ,maxZ} do
   * espaco LOCAL do campo em que nao nasce arvore nenhuma - hoje, os
   * comodos novos da casa (ver o bloco "Construcao nova no caminho"
   * acima). Vazio/ausente: a floresta sai exatamente igual a de antes.
   *
   * options.facade: { left, right } - quantos metros a PAREDE DA CASA
   * ainda corre para cada lado da janela (left = sentido -X local,
   * right = +X local), incluindo o trecho de construcao que continua
   * depois do comodo atual. E so isso que a floresta precisa saber
   * sobre a casa: dentro desse trecho ela mantem os 6 metros de
   * gramado de sempre; passando dele, ela contorna a quina. Quem sabe
   * essas medidas e a cena (ver scenes/corridor-scene.js e
   * scenes/room-scene.js), entao e ela quem passa - a fabrica continua
   * sem saber nada sobre janelas especificas.
   *
   * options.lateralLimit: metros que esta mata cobre para CADA LADO da
   * ancora (o X local). Padrao e o terreno inteiro (LATERAL_LIMIT).
   * Gemea da opcao de mesmo nome do gramado (ver
   * models/grass-field-factory.js) e existe pelo mesmo motivo: uma mata
   * de REMENDO, que so preenche a faixa que as outras nao alcancam -
   * hoje a mata dos FUNDOS da casa (ver o bloco Mata e nevoa dos FUNDOS
   * em scenes/corridor-scene.js). Sem ela, aquele remendo plantaria uma
   * terceira arvore em cima do que as florestas das duas fachadas
   * laterais ja cobrem. Nunca ultrapassa o LATERAL_LIMIT do terreno,
   * mesmo que se peca mais.
   */
  function createForest(options) {
    const opts = options || {};
    const group = new THREE.Group();
    const built = [];
    let morning = false;

    // Mesma ideia do gramado (ver models/grass-field-factory.js):
    // aplica o estado atual em tudo que ja foi montado. De noite volta
    // ao material noturno. As ARVORES nao mudam: mesmas copas, mesmas
    // posicoes, de dia e de noite - so o material troca.
    function applyTimeOfDay() {
      built.forEach(function (item) {
        item.mesh.material = morning
          ? assets.dayMaterials[item.band.name]
          : item.nightMaterial;
        item.mesh.visible = true;
      });
    }

    whenReady(function (ready) {
      if (!ready.nightMaterial) {
        return;
      }

      const matrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion();
      const tilt = new THREE.Quaternion();
      const tiltAxis = new THREE.Vector3();
      const position = new THREE.Vector3();
      const scale = new THREE.Vector3();

      // Fase da orla da clareira, sorteada por janela - ver forestEdge.
      const edgePhase = mulberry32(hashSeed(opts.seed))() * Math.PI * 2;

      // Trecho de fachada (em X local) ocupado pela casa, ja com a
      // folga de quina - ver FACADE_MARGIN e o bloco "Flancos" no topo.
      // Largura desta mata para cada lado da ancora (ver
      // options.lateralLimit acima). O terreno continua sendo o teto: uma
      // mata nunca planta tronco alem da borda do chao externo.
      const lateralLimit =
        opts.lateralLimit === undefined
          ? LATERAL_LIMIT
          : Math.min(LATERAL_LIMIT, Math.max(0, opts.lateralLimit));

      const facadeOpt = opts.facade || DEFAULT_FACADE;
      const facade = {
        min: -Math.abs(facadeOpt.left) - FACADE_MARGIN,
        max: Math.abs(facadeOpt.right) + FACADE_MARGIN,
      };

      BANDS.forEach(function (band, bandIndex) {
        const rng = mulberry32(hashSeed(opts.seed) + bandIndex * 0x9e3779b9);
        const byVariant = buildPlacements(
          band,
          rng,
          edgePhase,
          ready,
          facade,
          opts.path,
          opts.exclusions || [],
          lateralLimit
        );

        byVariant.forEach(function (placements, variant) {
          if (!placements.length) {
            return;
          }

          const mesh = new THREE.InstancedMesh(
            ready.geometries[variant],
            ready.nightMaterial,
            placements.length
          );

          placements.forEach(function (pose, i) {
            quaternion.setFromAxisAngle(UP, pose.rotation);
            tiltAxis.set(Math.cos(pose.tiltDir), 0, Math.sin(pose.tiltDir));
            tilt.setFromAxisAngle(tiltAxis, pose.tiltAmount);
            quaternion.premultiply(tilt);

            position.set(pose.x, -GROUND_SINK, pose.z);
            scale.set(pose.height * pose.width, pose.height, pose.height * pose.width);
            matrix.compose(position, quaternion, scale);
            mesh.setMatrixAt(i, matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;

          // As instancias nunca mudam depois de montadas, e a malha
          // nunca se move dentro do grupo: nao ha motivo para o three.js
          // recalcular a matriz dela a cada quadro.
          mesh.matrixAutoUpdate = false;
          mesh.updateMatrix();

          mesh.visible = true;

          group.add(mesh);
          built.push({ mesh: mesh, band: band, nightMaterial: ready.nightMaterial });
        });
      });

      if (morning) {
        applyTimeOfDay();
      }
    });

    // Mesmo contrato do chao externo e do gramado: a cena chama isto de
    // dentro do proprio setDaytime() dela, com a tela preta (ver
    // cutscenes/sleep-sequence.js). Pode ser chamado antes de o .glb
    // terminar de carregar - o estado fica guardado em morning e e
    // aplicado assim que as malhas existirem. Reversivel por causa do
    // controle de horario do Editor (ver editor/editor-ui.js).
    function setDaytime(daytime) {
      morning = daytime !== false;
      if (built.length) {
        applyTimeOfDay();
      }
    }

    function setMorning() {
      setDaytime(true);
    }

    return {
      group: group,
      setDaytime: setDaytime,
      setMorning: setMorning,
    };
  }

  return {
    createForest: createForest,
  };
})();
