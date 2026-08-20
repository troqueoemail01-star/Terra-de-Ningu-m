/**
 * scripts/collision.js
 * -------------------------------------------------
 * Colisão simples: trata o jogador como um círculo
 * (visto de cima) e cada objeto sólido (parede, porta,
 * futuramente móveis etc.) como uma caixa alinhada aos
 * eixos (AABB) em X/Z. A altura (Y) não entra no cálculo
 * porque, nesta base, tudo é sólido do chão ao teto.
 *
 * Resolver por eixo (primeiro X, depois Z) é o que permite
 * o jogador "deslizar" pela parede em vez de travar
 * quando anda na diagonal contra ela.
 *
 * A caixa nao e mais um retangulo fixo escrito nos arquivos de
 * configuracao. Ela e presa ao objeto de quem ela e (`owner`) e, a partir
 * dai, quatro coisas valem sempre - no jogo normal e no Editor:
 *
 *   1. objeto EXCLUIDO leva a colisao dele embora (isSolidActive), e
 *      restaurar devolve as duas coisas;
 *   2. objeto DUPLICADO ganha a colisao do original, do mesmo tamanho
 *      (mirrorSolids);
 *   3. objeto MOVIDO, GIRADO ou ESCALADO leva a colisao junto, inclusive
 *      quando o que se mexeu foi uma peca la dentro dele (followOwner,
 *      anchorOf, guardFootprint);
 *   4. a caixa tem o TAMANHO do que esta DESENHADO, e nao a medida grossa
 *      escrita na mao mais uma folga de seguranca (fitToModel).
 *
 * E colisao de coisa que nao esta mais no jogo - a caixa solta no vazio,
 * a que a vista de COLISAO do Editor pinta de AZUL - sai da lista de vez
 * (purgeGhosts), em vez de so ser ignorada.
 * -------------------------------------------------
 */

window.Collision = (function () {
  // Testa se um círculo (cx, cz, radius) toca uma caixa {minX,maxX,minZ,maxZ}
  function circleHitsBox(cx, cz, radius, box) {
    const closestX = Math.max(box.minX, Math.min(cx, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(cz, box.maxZ));
    const dx = cx - closestX;
    const dz = cz - closestZ;
    return dx * dx + dz * dz < radius * radius;
  }

  // ---------- Sólido DESLIGADO (objeto excluído no Editor) ----------
  //
  // Cada caixa desta lista pode carregar um `owner`: o objeto 3D de quem
  // ela é a colisão (o grupo do móvel, a malha da parede, a folha da
  // porta). Quem preenche é a própria cena, na mesma linha em que
  // empilha a caixa (ver scenes/room-scene.js, scenes/corridor-scene.js
  // e scenes/side-room-scene.js).
  //
  // Existe para UMA coisa: quando o objeto é EXCLUÍDO no Editor ele sai
  // da árvore da cena (ver "Excluídos" em editor/editor-registry.js),
  // mas a caixa de colisão dele nunca morava no objeto — mora nesta
  // lista, montada uma vez na construção do cenário. Era exatamente o
  // bug da "parede invisível": o móvel desaparecia da tela e a colisão
  // ficava para trás, barrando o jogador no meio do caminho. Agora a
  // caixa acompanha o dono.
  //
  // A pergunta sobe pelos PAIS do dono porque excluir um grupo tira
  // todos os filhos de uma vez: a caixa de uma peça de dentro (a folha
  // de uma porta, uma malha de parede) também precisa sair quando quem
  // foi excluído é um pai dela.
  //
  // OCULTAR (`visible = false`) continua NÃO mexendo em colisão: são
  // duas ferramentas diferentes no Editor, e um objeto oculto continua
  // fisicamente ali. `enabled: false` na caixa é a chave manual, para
  // quem quiser desligar um sólido sem excluir nada.
  function isSolidActive(box) {
    if (!box) return false;
    if (box.enabled === false) return false;
    // Caixa que perdeu o contato com o que esta desenhado - e nao deu
    // para recolocar em cima dele: era ela que barrava o jogador no
    // vazio (ver guardFootprint abaixo).
    if (box.__orphan === true) return false;
    const owner = box.owner;
    if (!owner) return true;
    let node = owner;
    while (node) {
      if (node.userData && node.userData.__editorRemoved) return false;
      node = node.parent;
    }
    return hasVisualPart(owner);
  }

  // Segunda brecha da mesma história: no Editor dá para abrir o objeto e
  // excluir a MALHA de dentro dele em vez do objeto todo (a árvore mostra
  // as duas coisas). O grupo continua pendurado na cena — vazio, sem nada
  // desenhado — e só a olhada nos pais, acima, não notaria: a caixa
  // seguiria de pé barrando o jogador num lugar onde não existe mais nada.
  // Então, se sobrou zero malha dentro do dono, a caixa dele também cai.
  //
  // O `__collisionSawMesh` é o que segura o gatilho durante o carregamento:
  // boa parte da mobilia vem de .glb e o grupo dela nasce VAZIO, com a
  // malha entrando alguns instantes depois (ver as fábricas em models/).
  // Enquanto nada nunca apareceu ali, a caixa vale como sempre valeu — só
  // um dono que JÁ teve malha e ficou sem nenhuma é que perde a colisão.
  // Sem essa memória, um modelo que demorasse (ou falhasse) para carregar
  // deixaria o cenário atravessável nesse meio tempo.
  function hasVisualPart(owner) {
    if (findMesh(owner)) {
      if (!owner.userData) owner.userData = {};
      owner.userData.__collisionSawMesh = true;
      return true;
    }
    return !(owner.userData && owner.userData.__collisionSawMesh);
  }

  // Peca EXCLUIDA no Editor nao conta como desenho. Hoje ela tambem SAI
  // da arvore da cena, entao nem seria encontrada aqui - mas a marca e o
  // contrato usado por isSolidActive e por growFootprint, e valia a pena
  // esta linha: sem ela, uma peca marcada que continuasse pendurada na
  // arvore (uma exclusao aplicada antes de a arvore ser mexida, um caso
  // novo no futuro) mantinha a caixa do movel solida com o movel apagado.
  function findMesh(node) {
    if (!node) return false;
    const data = node.userData;
    if (data && data.__editorRemoved) return false;
    if (node.isMesh) return true;
    const children = node.children;
    if (!children) return false;
    for (let i = 0; i < children.length; i++) {
      if (findMesh(children[i])) return true;
    }
    return false;
  }

  // ---------- Solido que SEGUE o dono (objeto MOVIDO no Editor) ----------
  //
  // Segunda metade da mesma historia da "parede invisivel". EXCLUIR um
  // movel ja desliga a caixa dele (bloco acima), mas MOVER, GIRAR ou
  // ESCALAR pela ferramenta do Editor nao mexia em nada: cada caixa e
  // montada UMA vez, na construcao do cenario, a partir dos numeros
  // escritos nos arquivos de configuracao (ver scenes/house-config.js e
  // scenes/room-config.js). Quem entrava no Editor e arrastava a
  // geladeira para a outra parede da cozinha ficava com DOIS problemas
  // de uma vez:
  //
  //   1. uma parede invisivel no canto de ONDE ELA SAIU - a caixa velha,
  //      parada nas coordenadas de fabrica, sem nada desenhado ali;
  //   2. a geladeira NOVA sem colisao nenhuma, atravessavel.
  //
  // Era o que continuava sobrando nos comodos depois da primeira
  // correcao (o caso 1 nos comodos mais mexidos, o caso 2 espalhado por
  // todos eles), e some quando a caixa deixa de ser um retangulo fixo e
  // passa a acompanhar o objeto de quem ela e.
  //
  // Como: na montagem (bindSolids, chamado por scripts/main.js) cada
  // caixa guarda a caixa ORIGINAL e a matriz de mundo que o dono tinha
  // naquele instante - o retrato de quando a conta foi feita. Depois, a
  // cada consulta, se a matriz do dono mudou, os quatro cantos da caixa
  // original sao levados pelo MESMO deslocamento/giro/escala que o dono
  // sofreu desde entao e os extremos viram a caixa de agora. Objeto
  // parado - a esmagadora maioria, sempre - nao custa quase nada: seis
  // numeros comparados e pronto.
  //
  // Vale para o Editor aberto E para o jogo normal, porque as alteracoes
  // salvas sao aplicadas nos dois (ver editor/editor-overrides.js): o
  // movel nasce ja na posicao nova e a caixa nasce junto com ele.
  //
  // So o plano XZ entra na conta, porque a colisao do jogo e um AABB sem
  // eixo Y (ver o topo deste arquivo). Deslocamento, giro em torno de Y
  // e escala saem exatos; um giro que DEITA o objeto (em torno de X ou
  // de Z) achataria a caixa ate a espessura zero, e nesse caso a parte
  // do giro e descartada e so o deslocamento e aplicado - melhor a caixa
  // do tamanho certo no lugar certo do que um solido que nao segura
  // ninguem.
  //
  // A cena pode continuar escrevendo na caixa por quadro (hoje so a da
  // folha da porta compartilhada, que libera o vao quando ela abre - ver
  // scenes/corridor-scene.js): quando os limites chegam diferentes do
  // que ESTA funcao escreveu, eles passam a ser a nova caixa original e
  // o deslocamento do dono e reaplicado por cima. O retrato da matriz
  // nunca e refeito, senao mover a porta no Editor deixaria justamente a
  // caixa dela para tras.

  // ---------- Quem e o "dono", na pratica: a ANCORA ----------
  //
  // A caixa aponta para o GRUPO do movel, mas quase toda a mobilia vem
  // de .glb e o desenho de verdade mora num no LA DENTRO (o grupo e so a
  // casca que a fabrica devolve, ver models/stove-factory.js). Na arvore
  // do Editor as duas coisas aparecem, e arrastar a de dentro e o mais
  // comum - foi o que aconteceu com o fogao e o botijao da cozinha: o
  // modelo andou 7 metros e o grupo ficou onde estava.
  //
  // Por isso quem e seguido nao e o grupo, e a ANCORA: desce-se do dono
  // enquanto houver UM filho unico (a casca do .glb, a cena do
  // exportador, o no do modelo...) e para-se no primeiro no que tem
  // geometria propria ou mais de um filho. Mover o grupo OU mover esse
  // no de dentro leva a caixa junto, que e o que se ve na tela.
  //
  // Movel montado por partes (varios filhos: uma porta com folha e
  // batente, uma escrivaninha com gaveta) para a descida no primeiro
  // galho: mexer numa peca solta la dentro nao arrasta a colisao do
  // movel inteiro - e e o que segura a folha da porta, que gira a cada
  // quadro, sem embaralhar nada.
  //
  // Modelo .glb que chega DEPOIS do boot muda a ancora (o grupo estava
  // vazio na montagem): nesse caso o retrato e apenas REFEITO, sem mexer
  // na caixa - senao o deslocamento que o proprio exportador ja traz
  // dentro do arquivo empurraria a colisao para longe do movel. Quem
  // pede esse retrato na hora certa - modelo recem-chegado, ainda com os
  // valores de fabrica, antes de as alteracoes salvas entrarem - e
  // absorbOwners, chamado por scripts/main.js e por editor/editor-mode.js.

  const boundLists = [];   // { list, space } - listas registradas em bindSolids
  const mirrorBoxes = [];  // { list, box, owner, source } - caixas de COPIAS
  let deltaMatrix = null;

  function matrix4() {
    if (!deltaMatrix) deltaMatrix = new THREE.Matrix4();
    return deltaMatrix;
  }

  function invertedCopy(matrix) {
    const out = new THREE.Matrix4();
    out.copy(matrix);
    // three.js r128 tem `invert`; o `getInverse` fica como rede de
    // seguranca, mesma dupla que editor/editor-clones.js ja usa.
    if (out.invert) out.invert();
    else out.getInverse(matrix);
    return out;
  }

  // Uma lista de solidos pode estar escrita no espaco de uma ZONA da
  // casa em vez do mundo (e o caso de `localSolids`, usada pela fisica
  // da bola de futebol - ver scenes/room-scene.js). O dono, porem, vive
  // sempre no mundo: e este `space` que traz o deslocamento do dono de
  // volta para o espaco da lista, com a MESMA conversao das zonas (ver
  // createTransform em scripts/house-world.js).
  // Ate 8 niveis: um .glb de banco de modelos costuma ter 3 ou 4 (cena
  // do exportador, no do modelo, malha), e o teto evita que uma arvore
  // esquisita custe caro por quadro.
  const ANCHOR_MAX_DEPTH = 8;

  function anchorOf(owner) {
    let node = owner;
    for (let i = 0; i < ANCHOR_MAX_DEPTH; i++) {
      if (!node || node.isMesh || !node.children || node.children.length !== 1) break;
      const child = node.children[0];
      if (!child || !child.matrixWorld || child.isLight || child.isCamera) break;
      node = child;
    }
    return node;
  }

  function spaceOf(options) {
    const space = options && options.space;
    if (!space || typeof space.toLocal !== "function") return null;
    const yaw = space.rotationY || 0;
    return { toLocal: space.toLocal, cos: Math.cos(yaw), sin: Math.sin(yaw) };
  }

  /**
   * Registra uma lista de solidos: e aqui que cada caixa tira o retrato
   * do dono. Precisa rodar DEPOIS de o cenario estar montado e ANTES de
   * as alteracoes salvas do Editor serem aplicadas - senao o retrato
   * sairia com o movel ja movido e a caixa ficaria onde estava.
   * Idempotente: registrar a mesma lista de novo nao refaz retrato nenhum.
   */
  function bindSolids(list, options) {
    if (!list || typeof list.length !== "number") return null;
    let record = null;
    for (let i = 0; i < boundLists.length; i++) {
      if (boundLists[i].list === list) record = boundLists[i];
    }
    if (!record) {
      record = { list: list, space: spaceOf(options) };
      boundLists.push(record);
    }
    // Antes dos retratos, de proposito: o retrato de cada caixa ja a
    // encaixa no modelo, e para saber se ela pode ser esticada ele precisa
    // saber se ela e a unica caixa do dono.
    tagSoleOwners(list);
    for (let i = 0; i < list.length; i++) {
      baseline(list[i], record);
    }
    return record;
  }

  /**
   * Marca quais caixas sao a UNICA colisao do dono delas dentro da lista.
   *
   * Quem usa e o encaixe no modelo (fitToModel): uma caixa sozinha pode
   * ser esticada ate o tamanho do desenho, mas um dono repartido em
   * VARIAS caixas nunca pode - a parede com vao de porta e duas caixas,
   * uma de cada lado da passagem, e as duas tem como dono a MESMA parede.
   * Esticar qualquer uma delas ate a pegada da parede inteira fecharia
   * justamente a passagem e trancaria o jogador no comodo.
   *
   * Roda em bindSolids (poucas vezes, no boot) e nunca por quadro.
   */
  function tagSoleOwners(list) {
    const owners = [];
    const counts = [];
    for (let i = 0; i < list.length; i++) {
      const box = list[i];
      if (!box || !box.owner) continue;
      const at = owners.indexOf(box.owner);
      if (at === -1) {
        owners.push(box.owner);
        counts.push(1);
      } else {
        counts[at] += 1;
      }
    }
    for (let i = 0; i < list.length; i++) {
      const box = list[i];
      if (!box) continue;
      const at = box.owner ? owners.indexOf(box.owner) : -1;
      box.__soleOwner = at !== -1 && counts[at] === 1;
    }
  }

  function baseline(box, record) {
    if (!box || box.__follow !== undefined) return box; // ja tem retrato
    const owner = box.owner;
    const usable =
      !!owner &&
      box.follow !== false &&
      typeof box.minX === "number" &&
      typeof THREE !== "undefined" &&
      !!owner.matrixWorld;
    if (!usable) {
      // Caixa sem dono continua exatamente como sempre foi: fixa.
      box.__follow = false;
      return box;
    }
    box.__follow = true;
    box.__space = record ? record.space : null;
    box.__base = { minX: box.minX, maxX: box.maxX, minZ: box.minZ, maxZ: box.maxZ };
    box.__written = { minX: box.minX, maxX: box.maxX, minZ: box.minZ, maxZ: box.maxZ };
    box.__anchor = null;
    box.__baseInv = null;
    box.__baseX = 0;
    box.__baseZ = 0;
    box.__seen = null;
    // Pegada do desenho: o ultimo estado em que caixa e malha estavam de
    // acordo (`__geo`/`__geoBox`), quando a pergunta foi feita por ultimo
    // (`__geoAt`) e se a caixa esta valendo (`__orphan`).
    box.__geo = null;
    box.__geoBox = null;
    box.__geoAt = 0;
    box.__orphan = false;
    // Desde QUANDO a caixa esta solta no vazio: e a idade que purgeGhosts
    // exige antes de tirar uma caixa da lista de vez, para um modelo .glb
    // que ainda esta chegando nunca perder a colisao por atraso.
    box.__orphanSince = 0;
    // A caixa CRUA - a que followOwner escreve a partir do retrato, antes
    // de ser colada no modelo (ver fitToModel). O encaixe parte sempre
    // dela, e nunca do resultado do encaixe anterior: sem isso a caixa
    // iria encolhendo um pouco a cada quadro.
    box.__preFit = { minX: box.minX, maxX: box.maxX, minZ: box.minZ, maxZ: box.maxZ };
    // `sceneDriven: true` e a cena avisando que ELA manda nos limites
    // desta caixa por quadro (a folha da porta compartilhada, que vai para
    // 1e6 quando a porta abre - ver scenes/corridor-scene.js). A mesma
    // coisa continua sendo DESCOBERTA sozinha em syncSolid na primeira vez
    // que a cena escreve; declarar aqui e o que tira a janela de tempo
    // entre o boot e essa primeira escrita, em que a caixa - ainda zerada,
    // longe do desenho da porta - podia ser confundida com uma colisao
    // solta e ser varrida (ver purgeGhosts).
    box.__sceneWrites = box.sceneDriven === true;
    portrait(box, anchorOf(owner));
    return box;
  }

  /**
   * (Re)tira o retrato: guarda a matriz de mundo da ancora AGORA como o
   * ponto de partida da caixa. NAO mexe nos limites da caixa - e
   * exatamente o que se quer quando a ancora muda porque o modelo .glb
   * acabou de chegar.
   */
  function portrait(box, anchor) {
    if (!anchor || !anchor.matrixWorld) return;
    // A matriz de mundo e montada aqui a partir dos pais, sem depender de
    // nenhum quadro ja ter sido desenhado.
    if (anchor.updateWorldMatrix) anchor.updateWorldMatrix(true, false);
    const e = anchor.matrixWorld.elements;
    box.__anchor = anchor;
    box.__baseInv = invertedCopy(anchor.matrixWorld);
    box.__baseX = e[12];
    box.__baseZ = e[14];
    box.__seen = [e[0], e[2], e[8], e[10], e[12], e[14]];
    // O retrato guarda tambem a PEGADA do desenho neste instante - ou
    // seja, com os valores de fabrica, antes das alteracoes salvas do
    // Editor entrarem (ver bindSolids e absorbOwners). E o par
    // caixa+desenho de referencia: e a partir dele que a caixa e
    // recolocada se, depois, a peca de dentro do movel se mudar.
    // Caixa que JA nasce fora do desenho nao guarda nada: sem par de
    // referencia, ela e tratada como fantasma (ver guardFootprint).
    const foot = footprintFor(box, true);
    if (foot && touchesFootprint(box, foot)) {
      // Retrato novo e a hora certa de conferir o TAMANHO tambem: e este o
      // caminho do modelo .glb que acabou de chegar (ver absorbOwners), em
      // que o desenho do movel passou a existir agora. Sem isto a caixa
      // ficava com a medida escrita na mao ate a varredura seguinte.
      fitToModel(box, foot);
      rememberFootprint(box, foot);
    }
    // A arvore do dono mudou de forma: a pergunta da pegada se refaz na
    // proxima consulta, sem esperar o intervalo normal.
    box.__geoAt = 0;
  }

  /**
   * Refaz o retrato das caixas cuja ancora mudou - hoje, os modelos .glb
   * que chegam depois do boot. Precisa rodar com o modelo recem-chegado
   * ainda nos valores de fabrica, ou seja: depois da varredura do
   * registro e ANTES de as alteracoes salvas serem aplicadas (ver
   * scripts/main.js e editor/editor-mode.js).
   */
  function absorbOwners() {
    let taken = 0;
    for (let b = 0; b < boundLists.length; b++) {
      const list = boundLists[b].list;
      for (let i = 0; i < list.length; i++) {
        const box = list[i];
        if (!box || box.__follow !== true) continue;
        const anchor = anchorOf(box.owner);
        if (anchor === box.__anchor) continue;
        portrait(box, anchor);
        taken += 1;
      }
    }
    return taken;
  }

  // ---------- A caixa tem de ENCOSTAR no que esta DESENHADO ----------
  //
  // O que ainda sobrava depois das correcoes acima: caixa que barra o
  // jogador num lugar onde NAO existe nada. Duas origens, as duas reais
  // no cenario de hoje:
  //
  //   1. O objeto foi mexido POR DENTRO. O Editor deixa abrir o movel e
  //      arrastar/girar/escalar uma peca la no fundo da arvore - e o que
  //      esta salvo em data/editor-overrides.json para o fogao
  //      (`stovepsx/stove-psx`, 7 m), o botijao, a lixeira do quintal, a
  //      planta da varanda, a gaveta da escrivaninha. A caixa segue a
  //      ANCORA (o primeiro no com geometria propria ou com mais de um
  //      filho), entao mexer numa peca ABAIXO dela move o desenho e
  //      deixa a caixa parada: parede invisivel no lugar antigo e movel
  //      atravessavel no lugar novo - o mesmo problema que MOVER o grupo
  //      de fora ja nao tem mais.
  //   2. A caixa nasceu errada. Ela sai dos numeros dos arquivos de
  //      configuracao, nunca do modelo: medida trocada, eixo trocado
  //      depois de um giro, modelo que mudou de tamanho. Qualquer um
  //      desses deixa um retangulo solido jogado num canto do comodo,
  //      sem nada dentro dele. Nenhuma correcao anterior olhava para
  //      isso - todas cuidam de para ONDE a caixa vai, nenhuma nunca
  //      perguntou se ela esta em cima de alguma coisa.
  //
  // A regra nova, uma so, resolve as duas: uma caixa so segura o jogador
  // se ela ENCOSTAR na pegada do que esta realmente desenhado dentro do
  // dono - a uniao das MALHAS, vista de cima, com a folga de um raio de
  // jogador (0.35, o mesmo `playerRadius` de scenes/corridor-config.js).
  // Fora disso:
  //
  //   - se a caixa JA encostou alguma vez, ela e levada de volta para
  //     cima da pegada, guardando a mesma posicao e o mesmo tamanho
  //     relativos (caso 1: a colisao passa a acompanhar a peca de
  //     dentro, sem ninguem precisar adivinhar qual no foi arrastado);
  //   - se ela nunca encostou em nada, e caixa fantasma e para de valer
  //     (caso 2).
  //
  // Nada disso e permanente: a pergunta se refaz a cada ~meio segundo,
  // entao modelo .glb que chega tarde, objeto restaurado no Editor ou
  // peca devolvida ao lugar trazem a colisao de volta sozinhos. E nada
  // disso mexe em OCULTAR: objeto oculto continua com as malhas dele na
  // arvore, logo continua com pegada e continua solido, como sempre.
  //
  // Custo: a pegada e calculada no maximo a cada 250 ms e fica guardada
  // NO DONO (as varias caixas de um mesmo dono - os pedacos de uma
  // parede, o muro da varanda - dividem a mesma conta), e cada caixa
  // refaz a pergunta a cada ~500 ms, nunca por quadro. Dono que se move
  // e conferido na hora em que se move.

  const CONTACT_SLACK = 0.35;         // folga = um raio de jogador
  const FOOTPRINT_CACHE_MS = 250;     // pegada guardada no dono
  const FOOTPRINT_RECHECK_MS = 500;   // intervalo da pergunta por caixa
  const FLAT_SPAN = 0.02;             // abaixo disso a pegada e um risco
  const FIT_MAX_SCALE = 20;

  function clock() {
    if (typeof performance !== "undefined" && performance.now) return performance.now();
    return Date.now();
  }

  // Soma na pegada tudo que e MALHA dentro do no. Subarvore excluida no
  // Editor nao entra: uma caixa nao pode ficar de pe por causa de uma
  // peca que o jogador mandou fora (mesma marca que isSolidActive le).
  // As ajudas visuais do proprio Editor (as caixas cor-de-rosa da vista
  // de COLISAO) tambem ficam fora, senao a pegada seria a propria caixa
  // que esta sendo conferida.
  function growFootprint(node, out) {
    if (!node) return;
    const data = node.userData;
    if (data && (data.__editorRemoved || data.__editorHelper)) return;
    if (node.isMesh && node.geometry) {
      const geometry = node.geometry;
      if (!geometry.boundingBox && geometry.computeBoundingBox) {
        try {
          geometry.computeBoundingBox();
        } catch (e) {
          /* geometria sem posicao: so nao entra na pegada */
        }
      }
      const bb = geometry.boundingBox;
      const e = node.matrixWorld && node.matrixWorld.elements;
      if (bb && e && isFinite(bb.min.x) && isFinite(bb.max.x)) {
        // Os 8 cantos da caixa do modelo levados para o mundo e depois
        // achatados em X/Z - a colisao do jogo nao tem eixo Y (ver o topo
        // deste arquivo). So as linhas de X e de Z da matriz participam,
        // sem alocar um vetor por canto.
        for (let i = 0; i < 8; i++) {
          const x = i & 1 ? bb.max.x : bb.min.x;
          const y = i & 2 ? bb.max.y : bb.min.y;
          const z = i & 4 ? bb.max.z : bb.min.z;
          const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
          const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
          if (!isFinite(wx) || !isFinite(wz)) continue;
          if (wx < out.minX) out.minX = wx;
          if (wx > out.maxX) out.maxX = wx;
          if (wz < out.minZ) out.minZ = wz;
          if (wz > out.maxZ) out.maxZ = wz;
          out.found = true;
        }
      }
    }
    const children = node.children;
    if (!children) return;
    for (let i = 0; i < children.length; i++) {
      growFootprint(children[i], out);
    }
  }

  /**
   * Pegada (X/Z, no MUNDO) do que esta desenhado dentro do dono, ou
   * `null` quando ele nao tem malha nenhuma - o caso do modelo .glb que
   * ainda esta chegando, que continua resolvido por hasVisualPart.
   */
  function footprintOf(owner, force) {
    if (!owner) return null;
    if (!owner.userData) owner.userData = {};
    const cached = owner.userData.__collisionFootprint;
    const now = clock();
    if (!force && cached && now - cached.at < FOOTPRINT_CACHE_MS) return cached.box;
    // No boot nenhum quadro foi desenhado ainda, e no Editor o objeto
    // pode ter acabado de ser arrastado: as matrizes de mundo da arvore
    // do dono sao montadas aqui, na mao, para a pegada nunca sair no
    // lugar de antes.
    if (force && owner.updateWorldMatrix) owner.updateWorldMatrix(true, true);
    const out = {
      minX: Infinity,
      maxX: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity,
      found: false,
    };
    growFootprint(owner, out);
    const box = out.found
      ? { minX: out.minX, maxX: out.maxX, minZ: out.minZ, maxZ: out.maxZ }
      : null;
    owner.userData.__collisionFootprint = { at: now, box: box };
    return box;
  }

  // A pegada nasce no mundo; a caixa pode viver no espaco de uma ZONA
  // (`localSolids`, a fisica da bola). Mesma conversao de 4 cantos que
  // followOwner usa, exata com os giros da casa (multiplos de 90).
  function footprintFor(box, force) {
    const world = footprintOf(box.owner, force);
    if (!world) return null;
    const space = box.__space;
    if (!space) return world;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < 4; i++) {
      const x = i < 2 ? world.minX : world.maxX;
      const z = i % 2 === 0 ? world.minZ : world.maxZ;
      const local = space.toLocal(x, z);
      if (local.x < minX) minX = local.x;
      if (local.x > maxX) maxX = local.x;
      if (local.z < minZ) minZ = local.z;
      if (local.z > maxZ) maxZ = local.z;
    }
    return { minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ };
  }

  // Encosta? Dois retangulos vistos de cima, com a folga somada. Parede
  // e um PLANO (pegada de espessura zero) e o solido dela e uma fatia
  // fina colada nesse plano: distancia zero, encosta.
  function touchesFootprint(box, foot) {
    return (
      box.minX - CONTACT_SLACK <= foot.maxX &&
      box.maxX + CONTACT_SLACK >= foot.minX &&
      box.minZ - CONTACT_SLACK <= foot.maxZ &&
      box.maxZ + CONTACT_SLACK >= foot.minZ
    );
  }

  // Ultimo estado em que caixa e desenho estavam de acordo. E a partir
  // dele que a caixa e recolocada quando a peca de dentro se muda.
  function rememberFootprint(box, foot) {
    box.__geo = { minX: foot.minX, maxX: foot.maxX, minZ: foot.minZ, maxZ: foot.maxZ };
    box.__geoBox = { minX: box.minX, maxX: box.maxX, minZ: box.minZ, maxZ: box.maxZ };
  }

  function fitRatio(now, before) {
    // Pegada achatada num eixo (parede, quadro, tapete): nada de dividir
    // por quase-zero - esse eixo nao muda de tamanho.
    if (before < FLAT_SPAN || now < FLAT_SPAN) return 1;
    const ratio = now / before;
    if (!isFinite(ratio) || ratio <= 0) return 1;
    if (ratio > FIT_MAX_SCALE) return FIT_MAX_SCALE;
    if (ratio < 1 / FIT_MAX_SCALE) return 1 / FIT_MAX_SCALE;
    return ratio;
  }

  /**
   * Leva a caixa de volta para cima do desenho, guardando a posicao e o
   * tamanho relativos do ultimo estado em que os dois estavam de acordo.
   * Devolve `true` quando o resultado encosta - o que sempre acontece se
   * havia um estado guardado, ja que ele proprio encostava.
   */
  function fitToFootprint(box, foot) {
    const geo = box.__geo;
    const ref = box.__geoBox;
    if (!geo || !ref) return false; // nunca encostou: e caixa fantasma
    const sx = fitRatio(foot.maxX - foot.minX, geo.maxX - geo.minX);
    const sz = fitRatio(foot.maxZ - foot.minZ, geo.maxZ - geo.minZ);
    const fromX = (geo.minX + geo.maxX) / 2;
    const fromZ = (geo.minZ + geo.maxZ) / 2;
    const toX = (foot.minX + foot.maxX) / 2;
    const toZ = (foot.minZ + foot.maxZ) / 2;
    const aX = toX + (ref.minX - fromX) * sx;
    const bX = toX + (ref.maxX - fromX) * sx;
    const aZ = toZ + (ref.minZ - fromZ) * sz;
    const bZ = toZ + (ref.maxZ - fromZ) * sz;
    if (!isFinite(aX) || !isFinite(bX) || !isFinite(aZ) || !isFinite(bZ)) return false;
    box.minX = Math.min(aX, bX);
    box.maxX = Math.max(aX, bX);
    box.minZ = Math.min(aZ, bZ);
    box.maxZ = Math.max(aZ, bZ);
    // Os limites passam a ser tambem os "escritos por aqui", senao
    // syncSolid leria isto como a CENA tendo mexido na caixa (o caminho
    // da folha da porta) e adotaria o encaixe como caixa original.
    const written = box.__written;
    if (written) {
      written.minX = box.minX;
      written.maxX = box.maxX;
      written.minZ = box.minZ;
      written.maxZ = box.maxZ;
    }
    rememberRaw(box);
    return touchesFootprint(box, foot);
  }

  function rememberRaw(box) {
    const pre = box.__preFit;
    if (!pre) return;
    pre.minX = box.minX;
    pre.maxX = box.maxX;
    pre.minZ = box.minZ;
    pre.maxZ = box.maxZ;
  }

  // ---------- Caixa COLADA no modelo (o formato da colisao) ----------
  //
  // Tudo acima cuida de ONDE a caixa esta. Este bloco cuida do TAMANHO
  // dela, que era a ultima coisa que ninguem nunca tinha conferido.
  //
  // A caixa de cada movel nunca saiu do modelo: ela e um retangulo
  // escrito na mao nos arquivos de configuracao, quase sempre a medida
  // grossa do movel MAIS uma folga de seguranca (os varios `...Margin` e
  // o ROOM_PROP_MARGIN das cenas). Somadas, as duas coisas deixam a
  // colisao sistematicamente MAIOR que o desenho: o jogador para no ar a
  // um palmo da cadeira, a passagem entre a cama e a parede nao da, e
  // movel encostado na parede parece ter um degrau invisivel em volta.
  // Onde a medida grossa errou para o outro lado (modelo trocado, modelo
  // que mudou de tamanho numa atualizacao do jogo) acontece o contrario:
  // parte do movel fica atravessavel.
  //
  // A pegada das malhas - a mesma que o bloco de cima ja calcula para
  // saber se a caixa esta em cima de alguma coisa - e o desenho de
  // verdade: vem da geometria, no mundo, com posicao, giro e escala ja
  // aplicados. Entao ela e tambem a melhor medida possivel da colisao, e
  // aqui cada um dos QUATRO lados da caixa e puxado ate o lado
  // correspondente da pegada, com uma pele fina de sobra (MODEL_SKIN) so
  // para o jogador nunca ficar visualmente dentro da malha.
  //
  // Com dois freios, porque a pegada e uma leitura automatica e a caixa
  // escrita na mao as vezes quer dizer mais do que "o tamanho do movel":
  //
  //   - APARAR (puxar o lado para dentro) vale no maximo MODEL_TRIM_MAX
  //     por lado. E o que come as folgas, que sao dessa ordem, sem
  //     desmanchar uma caixa feita de proposito muito maior que o desenho
  //     dela (um tapume invisivel continua tapando).
  //   - ESTICAR (empurrar o lado para fora) so quando aquela caixa e a
  //     UNICA do dono (ver tagSoleOwners) e no maximo MODEL_GROW_MAX. E o
  //     freio que protege as passagens: parede com vao de porta sao varias
  //     caixas do mesmo dono, e nenhuma delas cresce nunca.
  //
  // Eixo em que a pegada e um PLANO (parede, quadro, poster, tapete: um
  // dos lados tem espessura zero) fica intocado nesse eixo - a espessura
  // do solido de uma parede e escolha do cenario, nao do desenho. O outro
  // eixo, o comprimento, e aparado normalmente.
  //
  // Nada disso e permanente nem cumulativo: o encaixe e recalculado a
  // partir da caixa crua (`__preFit`) na mesma varredura que ja rodava,
  // entao mudar tamanho, mover ou girar o movel no Editor recalcula o
  // formato da colisao junto - e a caixa de uma copia sai igual a do
  // original, porque as duas partem do mesmo lugar.
  //
  // Caixa dirigida pela CENA (a folha da porta compartilhada, que vai
  // para 1e6 quando a porta abre) nunca entra aqui. `modelFit: false` na
  // caixa e a chave manual para deixar uma de fora.

  const MODEL_SKIN = 0.02;       // pele de sobra, para nao encostar na malha
  const MODEL_TRIM_MAX = 0.35;   // quanto um lado pode ser puxado para dentro
  const MODEL_GROW_MAX = 0.75;   // ...e para fora (so caixa unica do dono)
  const MODEL_MIN_SPAN = 0.06;   // caixa nunca vira um risco
  let modelFitOn = true;

  /**
   * Um eixo do encaixe. `lo`/`hi` sao os limites CRUS da caixa nesse
   * eixo, `footLo`/`footHi` os do desenho. Devolve `null` quando o eixo
   * nao deve ser tocado.
   */
  function fitAxis(lo, hi, footLo, footHi, canGrow) {
    if (!isFinite(footLo) || !isFinite(footHi)) return null;
    // Pegada achatada nesse eixo: e parede/quadro/tapete vista de lado. A
    // espessura do solido continua sendo a que o cenario escolheu.
    if (footHi - footLo < FLAT_SPAN) return null;
    let a = footLo - MODEL_SKIN;
    let b = footHi + MODEL_SKIN;
    // Aparar, com freio.
    if (a > lo + MODEL_TRIM_MAX) a = lo + MODEL_TRIM_MAX;
    if (b < hi - MODEL_TRIM_MAX) b = hi - MODEL_TRIM_MAX;
    // Esticar, com freio - e so quando a caixa e a unica do dono.
    if (a < lo) a = canGrow ? Math.max(a, lo - MODEL_GROW_MAX) : lo;
    if (b > hi) b = canGrow ? Math.min(b, hi + MODEL_GROW_MAX) : hi;
    if (b - a < MODEL_MIN_SPAN) {
      const middle = (a + b) / 2;
      a = middle - MODEL_MIN_SPAN / 2;
      b = middle + MODEL_MIN_SPAN / 2;
    }
    if (!isFinite(a) || !isFinite(b)) return null;
    return { lo: a, hi: b };
  }

  /** Cola a caixa no desenho do dono. Sempre a partir da caixa crua. */
  function fitToModel(box, foot) {
    if (!modelFitOn || box.modelFit === false) return;
    if (box.__sceneWrites) return;
    const raw = box.__preFit;
    if (!raw) return;
    const canGrow = box.__soleOwner === true;
    const x = fitAxis(raw.minX, raw.maxX, foot.minX, foot.maxX, canGrow);
    const z = fitAxis(raw.minZ, raw.maxZ, foot.minZ, foot.maxZ, canGrow);
    if (!x && !z) return;
    box.minX = x ? x.lo : raw.minX;
    box.maxX = x ? x.hi : raw.maxX;
    box.minZ = z ? z.lo : raw.minZ;
    box.maxZ = z ? z.hi : raw.maxZ;
    // Os limites passam a ser tambem os "escritos por aqui", senao
    // syncSolid leria o encaixe como a CENA tendo mexido na caixa (o
    // caminho da folha da porta) e o adotaria como caixa original.
    const written = box.__written;
    if (written) {
      written.minX = box.minX;
      written.maxX = box.maxX;
      written.minZ = box.minZ;
      written.maxZ = box.maxZ;
    }
  }

  /** Liga/desliga o encaixe no modelo. No console: `Collision.setModelFit(false)`. */
  function setModelFit(value) {
    modelFitOn = value !== false;
    // Todas as caixas voltam a ser recalculadas na proxima consulta.
    for (let b = 0; b < boundLists.length; b++) {
      const list = boundLists[b].list;
      for (let i = 0; i < list.length; i++) {
        const box = list[i];
        if (!box || box.__follow !== true) continue;
        box.__seen = null;
        box.__geoAt = 0;
      }
    }
    return modelFitOn;
  }

  /**
   * A pergunta, para UMA caixa: o que esta desenhado ainda esta aqui?
   * `moved` = o dono acabou de se mexer (ou a arvore dele mudou), o que
   * fura o intervalo e refaz a pegada na hora.
   */
  function guardFootprint(box, moved) {
    const now = clock();
    if (!moved && box.__geoAt && now - box.__geoAt < FOOTPRINT_RECHECK_MS) return;
    // O empurrao aleatorio espalha as proximas perguntas no tempo, para
    // as caixas nao cairem todas no mesmo quadro.
    box.__geoAt = now + Math.random() * FOOTPRINT_RECHECK_MS * 0.4;
    // Caixa dirigida pela CENA (hoje so a da folha da porta compartilhada,
    // que vai para 1e6 quando a porta abre - ver scenes/corridor-scene.js):
    // ela SAI do desenho de proposito, e e esse justamente o trabalho
    // dela. Nao e fantasma, nao e colada no modelo e nunca e varrida (ver
    // purgeGhosts) - sem esta saida, abrir a porta apagaria a colisao dela
    // para o resto da partida.
    if (box.__sceneWrites) {
      box.__orphan = false;
      box.__orphanSince = 0;
      return;
    }
    const foot = footprintFor(box, moved === true);
    if (!foot) {
      // Dono sem nenhuma malha: quem decide continua sendo hasVisualPart
      // (modelo .glb que ainda nao chegou segue solido, como sempre foi).
      box.__orphan = false;
      box.__orphanSince = 0;
      return;
    }
    if (touchesFootprint(box, foot)) {
      // Caixa em cima do desenho: e aqui que ela ganha tambem o FORMATO
      // do desenho (ver fitToModel). Nesta ordem, de proposito - o par
      // caixa+desenho guardado na linha seguinte e o que ja esta
      // encaixado.
      fitToModel(box, foot);
      rememberFootprint(box, foot);
      box.__orphan = false;
      box.__orphanSince = 0;
      return;
    }
    if (fitToFootprint(box, foot)) {
      box.__orphan = false;
      box.__orphanSince = 0;
      return;
    }
    if (box.__orphan !== true) box.__orphanSince = now;
    box.__orphan = true;
  }

  /**
   * Diagnostico. Refaz a pergunta em todas as caixas (sem esperar o
   * intervalo) e devolve o que ficou de fora: quantas, de quem e onde.
   * Sem argumento vale para tudo que foi registrado; com uma lista, so
   * para ela - e o que a vista de COLISAO do Editor usa, para nao contar
   * duas vezes a mesma caixa (a do mundo e a local do comodo).
   * No console do navegador: `Collision.audit()`.
   */
  function audit(list) {
    const lists = [];
    if (list) lists.push(list);
    else for (let b = 0; b < boundLists.length; b++) lists.push(boundLists[b].list);
    const report = { total: 0, active: 0, ghosts: [] };
    for (let b = 0; b < lists.length; b++) {
      const items = lists[b];
      for (let i = 0; i < items.length; i++) {
        const box = items[i];
        if (!box) continue;
        report.total += 1;
        if (box.__follow === true) {
          box.__geoAt = 0; // fura o intervalo
          syncSolid(box);
        }
        if (isSolidActive(box)) {
          report.active += 1;
        } else if (box.__orphan === true) {
          const owner = box.owner;
          report.ghosts.push({
            owner: (owner && (owner.name || owner.type)) || "?",
            minX: box.minX,
            maxX: box.maxX,
            minZ: box.minZ,
            maxZ: box.maxZ,
          });
        }
      }
    }
    return report;
  }

  // ---------- Faxina: as caixas AZUIS saem da lista de vez ----------
  //
  // Caixa fantasma - a que a vista de COLISAO do Editor pinta de AZUL - e
  // colisao de coisa que nao esta mais no jogo: perdeu o contato com
  // qualquer desenho e nao deu para recolocar em cima de nada. Ela ja nao
  // barrava mais o jogador (`__orphan` em isSolidActive), mas continuava
  // na lista: conferida a cada consulta, desenhada em azul e pronta para
  // voltar a valer se um dia encostasse em algo por acidente.
  //
  // Aqui ela sai da lista DE VEZ. Com duas travas, para nunca apagar
  // colisao boa:
  //
  //   - a caixa tem de estar solta HA UM TEMPO (`minAge`), porque um
  //     modelo .glb pesado chega segundos depois do boot e, enquanto nao
  //     chega, a pegada do movel e outra;
  //   - caixa dirigida pela cena (a folha da porta) nunca e fantasma, nem
  //     com a porta aberta (ver guardFootprint).
  //
  // Quem chama: scripts/main.js, algumas vezes depois do boot - vale para
  // o jogo normal, nao so com o Editor aberto - e a vista de COLISAO do
  // Editor ao ser ligada, ali com `minAge: 0`, porque o cenario ja esta
  // carregado e a varredura acabou de refazer a pegada de todas elas.
  const GHOST_MIN_AGE_MS = 1200;

  function purgeGhosts(list, options) {
    const minAge =
      options && typeof options.minAge === "number"
        ? options.minAge
        : GHOST_MIN_AGE_MS;
    const lists = [];
    if (list) lists.push(list);
    else for (let b = 0; b < boundLists.length; b++) lists.push(boundLists[b].list);
    const now = clock();
    let dropped = 0;
    for (let b = 0; b < lists.length; b++) {
      const items = lists[b];
      if (!items || typeof items.length !== "number") continue;
      for (let i = items.length - 1; i >= 0; i--) {
        const box = items[i];
        if (!box) continue;
        if (box.__follow === true) {
          box.__geoAt = 0; // fura o intervalo: pegada refeita agora
          syncSolid(box);
        }
        if (box.__orphan !== true) continue;
        const since = box.__orphanSince || now;
        if (now - since < minAge) continue;
        items.splice(i, 1);
        dropped += 1;
        for (let m = mirrorBoxes.length - 1; m >= 0; m--) {
          if (mirrorBoxes[m].box === box) mirrorBoxes.splice(m, 1);
        }
      }
    }
    return dropped;
  }

  function sane(xx, xz, zx, zz) {
    if (!isFinite(xx) || !isFinite(xz) || !isFinite(zx) || !isFinite(zz)) return false;
    // Determinante perto de zero = o giro deitou o objeto e a caixa
    // vista de cima virou um risco. Nesse caso so o deslocamento vale.
    return Math.abs(xx * zz - xz * zx) > 0.05;
  }

  function followOwner(box, anchor) {
    const base = box.__base;
    const e = anchor.matrixWorld.elements;

    let fromX = box.__baseX;
    let fromZ = box.__baseZ;
    let toX = e[12];
    let toZ = e[14];

    // Parte linear do delta "dono agora x dono na montagem", so as
    // linhas/colunas de X e Z (a de Y nao participa: a caixa e plana).
    const d = matrix4().multiplyMatrices(anchor.matrixWorld, box.__baseInv).elements;
    let xx = d[0];
    let xz = d[8];
    let zx = d[2];
    let zz = d[10];

    const space = box.__space;
    if (space) {
      const from = space.toLocal(fromX, fromZ);
      const to = space.toLocal(toX, toZ);
      fromX = from.x;
      fromZ = from.z;
      toX = to.x;
      toZ = to.z;
      // Mesmo giro da zona aplicado na parte linear (R⁻¹ · L · R), para
      // um empurrao no eixo X do mundo virar o eixo certo aqui dentro.
      const c = space.cos;
      const s = space.sin;
      const a00 = xx * c - xz * s;
      const a01 = xx * s + xz * c;
      const a10 = zx * c - zz * s;
      const a11 = zx * s + zz * c;
      xx = c * a00 - s * a10;
      xz = c * a01 - s * a11;
      zx = s * a00 + c * a10;
      zz = s * a01 + c * a11;
    }

    if (!sane(xx, xz, zx, zz)) {
      xx = 1;
      xz = 0;
      zx = 0;
      zz = 1;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < 4; i++) {
      const bx = i < 2 ? base.minX : base.maxX;
      const bz = i % 2 === 0 ? base.minZ : base.maxZ;
      const dx = bx - fromX;
      const dz = bz - fromZ;
      const nx = toX + xx * dx + xz * dz;
      const nz = toZ + zx * dx + zz * dz;
      if (nx < minX) minX = nx;
      if (nx > maxX) maxX = nx;
      if (nz < minZ) minZ = nz;
      if (nz > maxZ) maxZ = nz;
    }

    if (isFinite(minX) && isFinite(maxX) && isFinite(minZ) && isFinite(maxZ)) {
      box.minX = minX;
      box.maxX = maxX;
      box.minZ = minZ;
      box.maxZ = maxZ;
    } else {
      // Conta impossivel (matriz zerada, escala 0): a caixa volta a ser
      // a original em vez de virar NaN e deixar de segurar o jogador.
      box.minX = base.minX;
      box.maxX = base.maxX;
      box.minZ = base.minZ;
      box.maxZ = base.maxZ;
    }

    const written = box.__written;
    written.minX = box.minX;
    written.maxX = box.maxX;
    written.minZ = box.minZ;
    written.maxZ = box.maxZ;
    // Este e o estado CRU da caixa (dono aplicado, modelo ainda nao): e
    // dele que fitToModel parte na linha seguinte, dentro de
    // guardFootprint.
    rememberRaw(box);
  }

  /** Deixa UMA caixa em dia com o dono dela. */
  function syncSolid(box) {
    if (!box || box.__follow !== true) return box;
    const anchor = anchorOf(box.owner);
    const matrix = anchor && anchor.matrixWorld;
    if (!matrix) return box;

    if (anchor !== box.__anchor) {
      // Arvore do dono mudou de forma (o modelo .glb chegou, uma peca de
      // dentro foi excluida): retrato novo, caixa intacta. O caminho
      // certo para isso e absorbOwners, na hora em que o modelo ainda
      // esta nos valores de fabrica; aqui e so a rede de seguranca.
      portrait(box, anchor);
      guardFootprint(box, true);
      return box;
    }

    const written = box.__written;
    if (
      box.minX !== written.minX ||
      box.maxX !== written.maxX ||
      box.minZ !== written.minZ ||
      box.maxZ !== written.maxZ
    ) {
      // A cena escreveu na caixa (porta abrindo/fechando): estes passam
      // a ser os limites originais, e o deslocamento do dono e aplicado
      // por cima na mesma hora.
      const base = box.__base;
      base.minX = box.minX;
      base.maxX = box.maxX;
      base.minZ = box.minZ;
      base.maxZ = box.maxZ;
      box.__seen = null;
      // Caixa dirigida pela CENA. A pegada nao mexe mais nos limites
      // dela: a da folha da porta compartilhada vai para 1e6 quando a
      // porta abre (e o que libera o vao), e recolocar essa caixa em cima
      // da folha seria trancar o jogador na passagem aberta. Ela continua
      // sendo CONFERIDA - so nao e mais movida.
      box.__sceneWrites = true;
    }

    const e = matrix.elements;
    const seen = box.__seen;
    if (
      seen &&
      seen[0] === e[0] &&
      seen[1] === e[2] &&
      seen[2] === e[8] &&
      seen[3] === e[10] &&
      seen[4] === e[12] &&
      seen[5] === e[14]
    ) {
      // Dono parado desde a ultima conta. Ainda assim a pergunta da
      // pegada e refeita de vez em quando: o que se move pode ser uma
      // peca LA DENTRO dele, e a matriz do dono nem fica sabendo.
      guardFootprint(box, false);
      return box;
    }
    box.__seen = [e[0], e[2], e[8], e[10], e[12], e[14]];
    followOwner(box, anchor);
    guardFootprint(box, true);
    return box;
  }

  /**
   * Deixa uma lista inteira em dia. O jogo nao precisa chamar (cada
   * caixa se acerta sozinha na hora em que e consultada, ver blocks
   * abaixo); quem usa e a vista de COLISAO do Editor, que desenha as
   * caixas sem o jogador andar (ver editor/editor-mode.js).
   */
  function sync(list) {
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      syncSolid(list[i]);
    }
  }

  // ---------- Colisao das COPIAS (a ferramenta DUPLICAR) ----------
  //
  // Uma copia feita no Editor e um objeto 3D novo (ver
  // editor/editor-clones.js) e nasce, por natureza, FORA da lista de
  // solidos - que foi montada uma vez, na construcao do cenario. Era o
  // outro lado do problema relatado: sofa, cama e mesa duplicados eram
  // decoracao atravessavel, e quanto mais o comodo era montado por
  // duplicacao, menos colisao ele tinha.
  //
  // Aqui a copia ganha a MESMA caixa do original, com o retrato do
  // original: dai para frente ela segue o proprio objeto pelo caminho
  // de cima (o delta da copia - posicao, giro, escala - e aplicado logo
  // depois de ela nascer, e a caixa vai junto). Nenhuma conta nova de
  // tamanho: a caixa da copia e, por construcao, do mesmo tamanho da
  // do original.
  //
  // Copia de copia nao entra de novo (o Editor sempre duplica a partir
  // do objeto de origem, ver o cabecalho de editor/editor-clones.js), e
  // apagar a copia derruba a caixa dela: exclusao normal ja desliga
  // pelo `owner`, e a remocao definitiva chama dropMirrors.

  // Caminho de indices de `root` ate `node`, ou `null` se `node` nao
  // estiver dentro de `root`. E o que casa a peca do original com a peca
  // correspondente DENTRO da copia: o clone do three.js preserva a ordem
  // dos filhos, o mesmo casamento que editor/editor-clones.js ja faz para
  // levar o delta de cada peca.
  function pathTo(root, node) {
    const path = [];
    let current = node;
    for (let i = 0; i < 32 && current && current !== root; i++) {
      const parent = current.parent;
      if (!parent || !parent.children) return null;
      const at = parent.children.indexOf(current);
      if (at === -1) return null;
      path.unshift(at);
      current = parent;
    }
    return current === root ? path : null;
  }

  function nodeAtPath(root, path) {
    let current = root;
    for (let i = 0; i < path.length; i++) {
      if (!current || !current.children) return null;
      current = current.children[path[i]];
      if (!current) return null;
    }
    return current;
  }

  function alreadyMirrored(list, source, owner) {
    for (let i = 0; i < mirrorBoxes.length; i++) {
      const record = mirrorBoxes[i];
      if (record.list === list && record.source === source && record.owner === owner) {
        return true;
      }
    }
    return false;
  }

  /** Espelha para `cloneObject` as caixas de `sourceObject`. */
  function mirrorSolids(sourceObject, cloneObject) {
    if (!sourceObject || !cloneObject || typeof THREE === "undefined") return 0;
    let created = 0;
    for (let b = 0; b < boundLists.length; b++) {
      const record = boundLists[b];
      const list = record.list;
      const total = list.length; // as caixas novas nao entram nesta passada
      for (let i = 0; i < total; i++) {
        const box = list[i];
        if (!box || !box.owner) continue;
        // O dono da caixa pode ser o proprio objeto duplicado OU uma peca
        // LA DENTRO dele: quase toda a mobilia vem de .glb e a caixa
        // costuma apontar para o grupo do movel, mas duplicar um conjunto
        // (a varanda inteira, a escrivaninha com gaveta, um grupo montado
        // por partes) duplica um ANCESTRAL desse grupo. Antes, so o
        // primeiro caso ganhava colisao e o segundo nascia atravessavel.
        // Agora a caixa da copia e a da PECA correspondente dentro dela.
        let cloneOwner = null;
        if (box.owner === sourceObject) {
          cloneOwner = cloneObject;
        } else {
          const path = pathTo(sourceObject, box.owner);
          cloneOwner = path && path.length ? nodeAtPath(cloneObject, path) : null;
        }
        if (!cloneOwner) continue;
        baseline(box, record);
        if (box.__follow !== true) continue;
        if (box.__mirrorOf) continue;
        if (alreadyMirrored(list, box, cloneOwner)) continue;

        const base = box.__base;
        const copy = {
          owner: cloneOwner,
          enabled: box.enabled,
          // As chaves manuais da caixa vao junto: a copia de um movel que
          // esta de fora do encaixe no modelo tambem nasce de fora dele.
          follow: box.follow,
          modelFit: box.modelFit,
          sceneDriven: box.sceneDriven,
          __sceneWrites: box.__sceneWrites === true,
          minX: base.minX,
          maxX: base.maxX,
          minZ: base.minZ,
          maxZ: base.maxZ,
          __follow: true,
          __mirrorOf: box,
          __space: record.space,
          __base: { minX: base.minX, maxX: base.maxX, minZ: base.minZ, maxZ: base.maxZ },
          // Mesmo retrato do original: e a partir dele que a copia se
          // posiciona (clone, e nao a mesma matriz, para uma nunca mexer
          // no retrato da outra).
          __baseInv: box.__baseInv.clone(),
          __baseX: box.__baseX,
          __baseZ: box.__baseZ,
          __written: { minX: base.minX, maxX: base.maxX, minZ: base.minZ, maxZ: base.maxZ },
          __seen: null,
          // A copia confere a pegada dela na primeira consulta, a partir
          // da propria arvore (ver guardFootprint).
          __geo: null,
          __geoBox: null,
          __geoAt: 0,
          __orphan: false,
          __orphanSince: 0,
          // A copia tem o mesmo tamanho do original e o mesmo numero de
          // caixas por dono, entao o encaixe no modelo dela sai igual ao
          // dele (ver fitToModel e tagSoleOwners).
          __soleOwner: box.__soleOwner === true,
          __preFit: { minX: base.minX, maxX: base.maxX, minZ: base.minZ, maxZ: base.maxZ },
        };
        // A ancora da copia e a peca correspondente DENTRO dela (o clone
        // do Three.js copia a arvore inteira), e o ponto de partida
        // continua sendo o retrato do original: e isso que faz a caixa
        // nascer exatamente onde a copia esta.
        copy.__anchor = anchorOf(cloneOwner);
        if (copy.__anchor.updateWorldMatrix) copy.__anchor.updateWorldMatrix(true, false);
        syncSolid(copy);
        list.push(copy);
        mirrorBoxes.push({ list: list, box: copy, owner: cloneOwner, source: box });
        created += 1;
      }
    }
    return created;
  }

  /**
   * Tira da lista as caixas espelhadas de um objeto que saiu da cena
   * DE VEZ (copia apagada, copia refeita porque o .glb chegou depois).
   * Nunca toca nas caixas do cenario: exclusao normal e reversivel e
   * continua resolvida pelo `owner` em isSolidActive.
   */
  function dropMirrors(object) {
    if (!object || !mirrorBoxes.length) return 0;
    const doomed = [];
    if (object.traverse) {
      object.traverse(function (node) {
        doomed.push(node);
      });
    } else {
      doomed.push(object);
    }
    let dropped = 0;
    for (let i = mirrorBoxes.length - 1; i >= 0; i--) {
      const record = mirrorBoxes[i];
      if (doomed.indexOf(record.owner) === -1) continue;
      const index = record.list.indexOf(record.box);
      if (index !== -1) record.list.splice(index, 1);
      mirrorBoxes.splice(i, 1);
      dropped += 1;
    }
    return dropped;
  }

  // Caixa que vale AGORA: bate primeiro a geometria (conta curta, sempre
  // a mesma de antes) e só depois pergunta se o sólido ainda existe —
  // nessa ordem, a verificação nova só roda no punhado de caixas que o
  // jogador está de fato tocando naquele quadro, e não em todas elas.
  function blocks(cx, cz, radius, box) {
    syncSolid(box);
    return circleHitsBox(cx, cz, radius, box) && isSolidActive(box);
  }

  // Move o jogador de (x,z) por (dx,dz), resolvendo colisão eixo a eixo.
  // `solids` é uma lista de caixas {minX,maxX,minZ,maxZ}.
  function resolveMovement(x, z, dx, dz, radius, solids) {
    let newX = x + dx;
    let newZ = z + dz;

    // Testa movimento em X isoladamente
    for (let i = 0; i < solids.length; i++) {
      if (blocks(newX, z, radius, solids[i])) {
        newX = x; // bloqueia esse eixo, mantém a posição anterior
        break;
      }
    }

    // Testa movimento em Z isoladamente (a partir do X já resolvido)
    for (let i = 0; i < solids.length; i++) {
      if (blocks(newX, newZ, radius, solids[i])) {
        newZ = z;
        break;
      }
    }

    return { x: newX, z: newZ };
  }

  // Dado um eixo perpendicular fixo (`perp`, ex.: Z quando estamos
  // resolvendo X) e o raio do círculo, devolve a "meia largura" que
  // sobra da caixa expandida pelo raio nesse ponto — mesma matemática
  // de distância do circleHitsBox acima (ponto mais próximo da caixa +
  // Pitágoras), só resolvida para achar os limites da faixa de
  // sobreposição no eixo, em vez de só devolver true/false. Encosta
  // exatamente no formato de "retângulo com cantos arredondados pelo
  // raio" que é, na prática, a área que o CENTRO do círculo não pode
  // ocupar perto dessa caixa — por isso o mesmo cálculo já resolve
  // tanto uma batida de raspão perto do canto quanto uma batida de
  // frente no meio da face, sem precisar de casos separados.
  function axisOverlapHalfWidth(perp, radius, minPerp, maxPerp) {
    const closestPerp = Math.max(minPerp, Math.min(perp, maxPerp));
    const dPerp = perp - closestPerp;
    const remainSq = radius * radius - dPerp * dPerp;
    return remainSq > 0 ? Math.sqrt(remainSq) : -1;
  }

  // Tira o centro do círculo de dentro da faixa de sobreposição de UM
  // eixo, escolhendo sempre o lado de saída mais PRÓXIMO (menor
  // deslocamento) entre os dois lados possíveis da caixa. Essa escolha
  // "lado mais perto" é o que faz a mesma conta resolver tanto uma
  // colisão normal (a bola só encostou de leve na borda, e o lado
  // mais perto já é o lado de onde ela veio) quanto uma bola presa/
  // cravada bem dentro do sólido (ex.: depois de um encostão do
  // jogador que empurrou a bola pra dentro de um canto formado por
  // parede + móvel) — nesse segundo caso, ainda é o caminho de saída
  // mais curto, e a bola é posicionada exatamente na borda (nunca
  // além, nunca ainda sobreposta), pronta pra continuar se afastando
  // pela física normal (rebote + atrito) no quadro seguinte.
  function pushOutOfBoxAxis(x, minAxis, maxAxis, half) {
    const lowExit = minAxis - half;
    const highExit = maxAxis + half;
    return (x - lowExit) <= (highExit - x) ? lowExit : highExit;
  }

  // Move um objeto DINÂMICO (ex.: a bola de futebol do quarto — ver
  // scripts/ball-controller.js) de (x,z) com velocidade (vx,vz) ao
  // longo de `delta` segundos. Mesma resolução eixo a eixo (X, depois
  // Z a partir do X já resolvido) de resolveMovement acima, reusando
  // o mesmo circleHitsBox — mas, em vez de só bloquear o eixo que
  // colidiu (o que faria sentido pro jogador, que tem controle
  // próprio), aqui a velocidade nesse eixo é invertida e amortecida
  // por `restitution` (0 a 1: 1 = rebate sem perder nada, 0 = gruda na
  // hora), produzindo o rebate contra parede/móvel.
  //
  // A posição em caso de colisão NÃO volta simplesmente para a posição
  // antiga (`x`/`z`) como antes: ela é recalculada com
  // pushOutOfBoxAxis, que sempre devolve um ponto FORA da caixa, na
  // borda mais próxima. A diferença importa exatamente pro caso de
  // "bola presa num canto": se a posição antiga já estivesse ela
  // própria encostada/cravada num sólido (hipótese que essa função
  // ainda cobre como reforço, mesmo que hoje applyPlayerContact em
  // scripts/ball-controller.js já resolva o encostão do jogador contra
  // `solids` antes de chegar aqui — ver comentário lá), reverter pra
  // essa mesma posição a cada quadro prendia a bola ali
  // pra sempre: a velocidade ficava invertendo de sinal sem a posição
  // nunca sair do lugar. Agora, a cada quadro em que a bola ainda
  // estiver tocando o sólido, ela é reposicionada na borda válida mais
  // próxima — ou seja, se solta progressivamente em vez de ficar
  // grudada, e some por completo assim que sair da faixa de
  // sobreposição (sem nunca atravessar o sólido: pushOutOfBoxAxis só
  // devolve pontos fora dele). Combinado com a velocidade de "chute"
  // que o encostão do jogador já dá (ver KICK_BASE_SPEED/
  // KICK_OVERLAP_SCALE em ball-controller.js), isso é suficiente pra
  // bola se libertar sozinha assim que o jogador encosta/chuta ela
  // contra o obstáculo que está prendendo — sem teleporte brusco (o
  // reposicionamento é sempre para o ponto de saída mais curto, não
  // pra um lugar arbitrário) e sem desativar ou pular nenhuma colisão.
  function resolveBounce(x, z, vx, vz, delta, radius, solids, restitution) {
    let newX = x + vx * delta;
    let newVx = vx;
    for (let i = 0; i < solids.length; i++) {
      const box = solids[i];
      if (blocks(newX, z, radius, box)) {
        const half = axisOverlapHalfWidth(z, radius, box.minZ, box.maxZ);
        newX = half >= 0 ? pushOutOfBoxAxis(newX, box.minX, box.maxX, half) : x;
        newVx = -vx * restitution;
        break;
      }
    }

    let newZ = z + vz * delta;
    let newVz = vz;
    for (let i = 0; i < solids.length; i++) {
      const box = solids[i];
      if (blocks(newX, newZ, radius, box)) {
        const half = axisOverlapHalfWidth(newX, radius, box.minX, box.maxX);
        newZ = half >= 0 ? pushOutOfBoxAxis(newZ, box.minZ, box.maxZ, half) : z;
        newVz = -vz * restitution;
        break;
      }
    }

    return { x: newX, z: newZ, vx: newVx, vz: newVz };
  }

  return {
    circleHitsBox: circleHitsBox,
    isSolidActive: isSolidActive,
    blocks: blocks,
    resolveMovement: resolveMovement,
    resolveBounce: resolveBounce,
    bindSolids: bindSolids,
    absorbOwners: absorbOwners,
    sync: sync,
    syncSolid: syncSolid,
    mirrorSolids: mirrorSolids,
    dropMirrors: dropMirrors,
    audit: audit,
    purgeGhosts: purgeGhosts,
    setModelFit: setModelFit,
  };
})();
