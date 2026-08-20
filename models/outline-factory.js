/**
 * models/outline-factory.js
 * -------------------------------------------------
 * Sistema único e reutilizável para gerar a "casca" de
 * contorno (o destaque branco) de qualquer objeto
 * interativo, seguindo a silhueta real da geometria dele —
 * em vez de uma caixa (bounding box) genérica em volta do
 * objeto inteiro (era assim que DoorFactory/WindowFactory/
 * DeskFactory/PhoneFactory faziam antes).
 *
 * Técnica ("casca inflada", clássica em jogos com visual
 * retrô): junta as geometrias de todas as peças sólidas do
 * objeto numa só, desloca cada vértice um pouquinho para
 * fora ao longo da própria normal, e desenha essa cópia
 * "inflada" só pelo lado de dentro (side: THREE.BackSide).
 * O resultado é uma borda fina que aparece exatamente na
 * silhueta real do modelo, de qualquer ângulo — sem
 * precisar desenhar/ajustar essa casca peça por peça à mão.
 *
 * Isso NÃO funciona para peças chapadas sem volume (um
 * plano só, como o tecido de uma cortina): deslocar os
 * vértices de um plano ao longo da normal desloca o plano
 * inteiro pro lado, sem criar nenhuma borda visível. Por
 * isso `build` ignora automaticamente qualquer PlaneGeometry
 * (etiquetas, telas, vidro etc. — decalques encostados numa
 * peça sólida, que já entra no contorno por conta própria).
 * Para o caso em que o plano É o objeto interativo (a
 * cortina), use `buildFlat` — ver comentário mais abaixo.
 *
 * Uso típico (ver DoorFactory/DeskFactory/PhoneFactory):
 *
 *   const outline = window.OutlineFactory.build(group, materials.outline);
 *   group.add(outline);
 *
 * `build` sempre devolve um único THREE.Mesh (nunca um
 * Group), de propósito: o InteractionSystem faz raycast
 * direto nele (`raycaster.intersectObject(item.outline,
 * false)`, não recursivo) — mantendo 100% de compatibilidade
 * com o sistema já existente, sem precisar mudar nada lá.
 * -------------------------------------------------
 */

window.OutlineFactory = (function () {
  // Espessura padrão da casca inflada, em unidades de mundo (metros) —
  // pequena de propósito (contorno fino e discreto). Pode ser ajustada
  // por chamada através do terceiro argumento de `build`.
  const DEFAULT_THICKNESS = 0.006;

  // Margem padrão da borda de peças chapadas (ver `buildFlat`) — mesma
  // ideia acima, só que como "crescimento" das bordas do plano em vez
  // de deslocamento ao longo da normal.
  const DEFAULT_FLAT_MARGIN = 0.006;

  // Recuo aplicado à cópia de `buildFlat` (ao longo da normal do
  // plano, para trás), só o suficiente para não brigar visualmente
  // (z-fighting) com o plano original desenhado por cima.
  const FLAT_BACK_OFFSET = 0.002;

  // Espessura padrao da linha da borda de face (ver `buildFaceBorder`):
  // bem maior que a folga da casca inflada de proposito - essa borda e
  // vista de frente, na resolucao interna baixa do jogo (320x180), onde
  // 6 mm nao renderizam pixel nenhum.
  const DEFAULT_BORDER_LINE = 0.02;

  // Material compartilhado só para bordas de peças chapadas: precisa
  // ser visível dos dois lados (DoubleSide), diferente da casca comum
  // (BackSide) usada por `build` — por isso não reaproveita
  // materials.outline diretamente.
  let flatMaterial = null;
  function getFlatMaterial() {
    if (!flatMaterial) {
      flatMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      });
    }
    return flatMaterial;
  }

  // Clona a geometria de uma mesh já "assada" (posição + normal) no
  // espaço local de referência (dado por `refWorldInverse`) — isso
  // reduz corretamente qualquer cadeia de sub-grupos/rotações no
  // caminho (ex.: o disco discador inclinado do telefone, dentro do seu
  // próprio sub-grupo).
  function bakeLocalGeometry(mesh, refWorldInverse) {
    const source = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry.clone();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", source.getAttribute("position").clone());
    if (source.getAttribute("normal")) {
      geometry.setAttribute("normal", source.getAttribute("normal").clone());
    } else {
      geometry.computeVertexNormals();
    }

    const localMatrix = new THREE.Matrix4().multiplyMatrices(refWorldInverse, mesh.matrixWorld);
    geometry.applyMatrix4(localMatrix);
    return geometry;
  }

  // Concatena várias geometrias (só position + normal) numa só, sem
  // depender do addon BufferGeometryUtils — este projeto não usa
  // nenhuma dependência de build (ver README), só o three.js "puro"
  // já carregado via CDN.
  function mergeGeometries(geometries) {
    let total = 0;
    geometries.forEach(function (g) {
      total += g.getAttribute("position").count;
    });

    const positions = new Float32Array(total * 3);
    const normals = new Float32Array(total * 3);
    let offset = 0;
    geometries.forEach(function (g) {
      positions.set(g.getAttribute("position").array, offset * 3);
      normals.set(g.getAttribute("normal").array, offset * 3);
      offset += g.getAttribute("position").count;
    });

    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    return merged;
  }

  // "Infla" a geometria deslocando cada vértice para fora, ao longo da
  // própria normal — cria a folga visível da casca em relação à
  // superfície real, que depois é desenhada por dentro (BackSide).
  function inflate(geometry, thickness) {
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    for (let i = 0; i < position.count; i++) {
      position.setXYZ(
        i,
        position.getX(i) + normal.getX(i) * thickness,
        position.getY(i) + normal.getY(i) * thickness,
        position.getZ(i) + normal.getZ(i) * thickness
      );
    }
    position.needsUpdate = true;
  }

  // Percorre `node` coletando toda mesh sólida (com volume) para
  // dentro de `out`. Ignora automaticamente:
  //  - o próprio `root` (é só um contêiner, não tem geometria própria);
  //  - qualquer plano chapado (PlaneGeometry — ver comentário no topo
  //    do arquivo);
  //  - qualquer peça (e toda a subárvore dela) marcada com
  //    `userData.excludeFromOutline = true`, para casos futuros em que
  //    uma peça sólida precise ficar de fora do contorno de propósito.
  function collectSolidMeshes(node, root, out) {
    if (node !== root && node.userData && node.userData.excludeFromOutline) {
      return;
    }
    if (node.isMesh && node.geometry && node !== root) {
      if (node.geometry.type !== "PlaneGeometry") {
        out.push(node);
      }
    }
    node.children.forEach(function (child) {
      collectSolidMeshes(child, root, out);
    });
  }

  /**
   * Constrói a casca de contorno de um objeto a partir da geometria
   * real das suas peças sólidas (caixas, cilindros, esferas, toros —
   * qualquer coisa com volume). Ignora automaticamente planos chapados
   * (decalques como etiquetas/telas/vidro) e qualquer peça marcada com
   * `userData.excludeFromOutline = true`.
   *
   * `root`: grupo com as peças já montadas como filhos dele (pode ter
   * sub-grupos com suas próprias rotações — tudo é considerado).
   * `material`: material da casca (normalmente materials.outline).
   * `thickness`: opcional, espessura em unidades de mundo.
   *
   * Devolve um único THREE.Mesh, já com `visible = false` (mesmo
   * padrão de antes — quem chamar decide quando revelar). A posição
   * devolvida é relativa ao próprio `root`: adicione o resultado como
   * filho dele (`root.add(outline)`) — ou do grupo que se move junto
   * com ele (ex.: a gaveta deslizando), para acompanhar corretamente
   * qualquer animação de posição do conjunto.
   */
  function build(root, material, thickness) {
    root.updateWorldMatrix(true, true);
    const refWorldInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();

    const solids = [];
    collectSolidMeshes(root, root, solids);

    if (solids.length === 0) {
      // Nada sólido para contornar (objeto feito só de planos) — devolve
      // uma casca vazia em vez de quebrar quem chamou.
      const empty = new THREE.Mesh(new THREE.BufferGeometry(), material);
      empty.visible = false;
      return empty;
    }

    const geometries = solids.map(function (mesh) {
      return bakeLocalGeometry(mesh, refWorldInverse);
    });
    const merged = mergeGeometries(geometries);
    // "=== undefined" em vez de "||": um thickness explícito de 0 é
    // válido (casca sem folga) e não deve cair no padrão por engano.
    inflate(merged, thickness === undefined ? DEFAULT_THICKNESS : thickness);

    const outline = new THREE.Mesh(merged, material);
    outline.visible = false;
    return outline;
  }

  /**
   * Constrói a borda de destaque de UMA peça chapada (um único plano
   * sem volume, como o tecido de uma cortina) — uma cópia levemente
   * maior do mesmo plano, recuada só o suficiente para não brigar
   * (z-fighting) com o plano original desenhado por cima. Assume que o
   * plano foi criado olhando para +Z local (convenção usada em todo o
   * jogo — ver DoorFactory).
   *
   * Ao contrário de `build`, o resultado deve ser adicionado como
   * FILHO da própria mesh original (`mesh.add(borda)`), não de um
   * grupo externo — assim, se a peça se mover ou mudar de escala
   * sozinha (ex.: os dois painéis da cortina abrindo/fechando, cada um
   * para seu lado), a borda acompanha automaticamente pela própria
   * hierarquia de cena, sem precisar recalcular nada a cada quadro.
   *
   * É puramente decorativo (não participa do raycast do
   * InteractionSystem, que continua usando só o contorno principal do
   * objeto) — quem chamar é responsável por sincronizar `.visible` com
   * esse contorno principal (ver WindowFactory: uma linha no `update`).
   */
  function buildFlat(mesh, margin) {
    const geometry = mesh.geometry.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const width = box.max.x - box.min.x;
    const height = box.max.y - box.min.y;
    const m = margin === undefined ? DEFAULT_FLAT_MARGIN : margin;
    const scaleX = width > 0 ? (width + m * 2) / width : 1;
    const scaleY = height > 0 ? (height + m * 2) / height : 1;
    geometry.scale(scaleX, scaleY, 1);

    const border = new THREE.Mesh(geometry, getFlatMaterial());
    border.position.z = -FLAT_BACK_OFFSET;
    border.visible = false;
    return border;
  }

  /**
   * Constroi uma BORDA CHAPADA (retangulo vazado, tipo "moldura de
   * luz") para ser desenhada logo a frente de uma face plana do objeto.
   *
   * Por que isso existe: a casca inflada de `build` so aparece na
   * SILHUETA do objeto. Isso funciona bem para moveis soltos no meio do
   * comodo, mas nao para pecas ENCAIXADAS numa parede (a porta e o caso
   * classico): a silhueta dela morre atras do recorte da parede e da
   * propria moldura, entao a casca fica escondida e o objeto nunca
   * parecia destacado - mesmo com o prompt "Interagir" aparecendo, ja
   * que o raycast acerta a casca normalmente. A borda daqui e desenhada
   * DENTRO do vao, sobre a face que o jogador esta olhando, entao
   * aparece sempre: de perto, de longe e de qualquer angulo.
   *
   * `width`/`height`: tamanho EXTERNO do retangulo (unidades de mundo).
   * `lineWidth`: espessura da linha, para dentro dessa borda externa.
   *
   * Devolve um unico THREE.Mesh no plano XY, olhando para +Z local
   * (mesma convencao do resto do jogo), com material visivel dos dois
   * lados - logo serve tanto para a face da frente quanto para a de
   * tras. Vem com `visible = false` pelo mesmo padrao dos outros
   * construtores daqui: quem chamar decide quando revelar (ou pendura
   * como filho do contorno principal e deixa a visibilidade ser
   * herdada da hierarquia de cena - ver DoorFactory).
   */
  function buildFaceBorder(width, height, lineWidth) {
    const line = lineWidth === undefined ? DEFAULT_BORDER_LINE : lineWidth;
    // Garante que sempre sobre "miolo" para vazar: uma borda mais grossa
    // que a metade do retangulo viraria um retangulo cheio (mancha
    // branca por cima da peca) em vez de um contorno.
    const halfW = Math.max(width, line * 3) / 2;
    const halfH = Math.max(height, line * 3) / 2;
    const innerW = halfW - line;
    const innerH = halfH - line;

    const shape = new THREE.Shape();
    shape.moveTo(-halfW, -halfH);
    shape.lineTo(halfW, -halfH);
    shape.lineTo(halfW, halfH);
    shape.lineTo(-halfW, halfH);
    shape.lineTo(-halfW, -halfH);

    // Buraco no sentido contrario ao contorno externo (convencao de furo
    // do three.js) - e ele que deixa a peca aparecer no meio.
    const hole = new THREE.Path();
    hole.moveTo(-innerW, -innerH);
    hole.lineTo(-innerW, innerH);
    hole.lineTo(innerW, innerH);
    hole.lineTo(innerW, -innerH);
    hole.lineTo(-innerW, -innerH);
    shape.holes.push(hole);

    const border = new THREE.Mesh(new THREE.ShapeGeometry(shape), getFlatMaterial());
    border.visible = false;
    return border;
  }

  return {
    build: build,
    buildFlat: buildFlat,
    buildFaceBorder: buildFaceBorder,
    DEFAULT_THICKNESS: DEFAULT_THICKNESS,
    DEFAULT_FLAT_MARGIN: DEFAULT_FLAT_MARGIN,
    DEFAULT_BORDER_LINE: DEFAULT_BORDER_LINE,
  };
})();
