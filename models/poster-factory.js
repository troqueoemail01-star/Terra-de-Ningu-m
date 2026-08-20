/**
 * models/poster-factory.js
 * -------------------------------------------------
 * Poster decorativo: a imagem em si, aplicada como textura sobre um
 * plano (sem moldura de madeira ao redor, diferente dos quadros do
 * corredor — ver models/picture-factory.js), preso na parede por um
 * prego e uma cordinha que passa por cima dele — mesma leitura de um
 * pôster de papel pendurado, não um quadro emoldurado.
 *
 * 100% procedural na parte do prego/cordinha (mesmo espírito de
 * CarpetFactory/CeilingFanFactory: sem depender de nenhum .glb) — só
 * a arte do poster em si vem de um arquivo de imagem (mesma técnica
 * de PictureFactory: TextureLoader + NearestFilter, para a imagem se
 * encaixar na estética pixelada do resto do jogo em vez de ficar
 * nítida/destoante; a própria imagem já chega pré-reduzida de
 * resolução, mesmo tratamento dado às três imagens de
 * assets/pictures/ usadas pelos quadros do corredor).
 *
 * A cordinha reaproveita window.CableFactory (ver
 * models/cable-factory.js) — mesmo utilitário genérico já usado para
 * o cabo de energia da TV do quarto: aqui os pontos são passados em
 * espaço LOCAL deste grupo (não espaço-mundo), o que funciona porque
 * o grupo devolvido por createCable entra como filho direto deste
 * mesmo grupo (ver comentário em cable-factory.js: ele só sabe
 * desenhar cilindros entre pontos, não se importa em que espaço eles
 * estão).
 *
 * Mesma convenção do resto do jogo (ver DoorFactory/PictureFactory):
 * o poster "olha" para +Z no espaço local; quem posiciona
 * (scenes/room-scene.js) decide onde e com que rotação ele entra.
 * -------------------------------------------------
 */

window.PosterFactory = (function () {
  const textureLoader = new THREE.TextureLoader();

  function loadPosterTexture(imagePath) {
    const texture = textureLoader.load(imagePath);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  // `width`/`height` em metros (a imagem fornecida não é quadrada,
  // ao contrário dos quadros do corredor — por isso os dois eixos
  // entram separados, em vez de um único `size`).
  function createPoster(imagePath, width, height) {
    const group = new THREE.Group();
    const halfW = width / 2;
    const halfH = height / 2;

    // ---------- O poster (papel, sem moldura) ----------
    const texture = loadPosterTexture(imagePath);
    // MeshStandardMaterial (não Basic): reage à luz da cena, mesmo
    // motivo já usado em PictureFactory. DoubleSide porque, sem
    // moldura cobrindo a face de trás, um ângulo mais aberto de
    // câmera poderia flagrar o verso do plano.
    const posterMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const posterGeo = new THREE.PlaneGeometry(width, height);
    const poster = new THREE.Mesh(posterGeo, posterMat);
    group.add(poster);

    // ---------- Prego ----------
    // Metal escuro simples, criado localmente (mesmo padrão de
    // CeilingFanFactory: material próprio da peça, sem depender de
    // materials.* compartilhado) — cabeça + haste, cravado na parede
    // um pouco acima do poster.
    const nailMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b2b2b,
      roughness: 0.55,
      metalness: 0.6,
    });

    // Só a parte visível do prego é modelada (Z = 0 já é a própria
    // parede, mesma convenção de "Z = 0 é a parede" usada por
    // Nightstand/Bookshelf/Wardrobe — a haste cravada de verdade fica
    // escondida atrás dela, sem necessidade de geometria ali): a
    // haste sai da parede (Z = 0) e cresce para +Z (para fora, na
    // direção do jogador — mesmo sentido em que o próprio poster
    // "olha", ver comentário no topo do arquivo), terminando na
    // cabeça, que é onde a cordinha se apoia.
    const nailGap = 0.07; // distância entre a borda de cima do poster e o prego
    const nailY = halfH + nailGap;
    const nailShaftLength = 0.045;

    const shaftGeo = new THREE.CylinderGeometry(0.006, 0.006, nailShaftLength, 6);
    const shaft = new THREE.Mesh(shaftGeo, nailMaterial);
    shaft.rotation.x = Math.PI / 2; // cilindro nasce em pé (eixo Y); deitado para apontar em Z
    shaft.position.set(0, nailY, nailShaftLength / 2);
    group.add(shaft);

    const headGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.006, 8);
    const head = new THREE.Mesh(headGeo, nailMaterial);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, nailY, nailShaftLength);
    group.add(head);

    // Ponta do prego (onde a cordinha se apoia): a cabeça, extremidade
    // da haste mais afastada da parede — ligeiramente recuada
    // (- 0.003) para a corda encostar "debaixo" da cabeça, não
    // atravessá-la.
    const nailTip = new THREE.Vector3(0, nailY, nailShaftLength - 0.003);

    // ---------- Cordinha ----------
    // Corda clara e fina, presa nos dois cantos de cima do poster e
    // passando por cima do prego no meio — mesma leitura da imagem 2
    // de referência do jogador. Reaproveita CableFactory (ver
    // comentário no topo do arquivo).
    const stringMaterial = new THREE.MeshStandardMaterial({
      color: 0xcbb98a,
      roughness: 0.9,
      metalness: 0,
    });

    const stringInset = width * 0.32; // afasta os pontos de fixação das quinas exatas do poster
    const stringLeft = new THREE.Vector3(-halfW + stringInset, halfH - 0.01, 0.004);
    const stringRight = new THREE.Vector3(halfW - stringInset, halfH - 0.01, 0.004);

    const stringBuilt = window.CableFactory.createCable(
      [stringLeft, nailTip, stringRight],
      stringMaterial,
      { radius: 0.0035 }
    );
    group.add(stringBuilt.group);

    return group;
  }

  return { createPoster: createPoster };
})();
