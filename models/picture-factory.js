/**
 * models/picture-factory.js
 * -------------------------------------------------
 * Cria um quadro decorativo: moldura simples (reaproveita
 * o material de moldura das portas, para manter a mesma
 * identidade visual) + a imagem em si, aplicada como
 * textura sobre um plano.
 *
 * Segue a mesma convenção do resto do jogo (ver
 * DoorFactory): o quadro "olha" para +Z no espaço local;
 * quem posiciona (scenes/corridor-scene.js) decide a
 * rotação em Y para ele encarar o corredor.
 * -------------------------------------------------
 */

window.PictureFactory = (function () {
  const FRAME_BORDER = 0.05;
  const FRAME_DEPTH = 0.045;

  // Um único loader é suficiente — as texturas são pequenas e poucas.
  const textureLoader = new THREE.TextureLoader();

  function loadPictureTexture(imagePath) {
    const texture = textureLoader.load(imagePath);
    // Mesmo filtro "nearest" usado no resto do jogo, para a imagem se
    // encaixar na estética pixelada em vez de ficar borrada/destoante.
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  // `size` é a largura/altura do quadro (as imagens fornecidas são
  // aproximadamente quadradas).
  function createPicture(imagePath, size, materials) {
    const group = new THREE.Group();
    const half = size / 2;

    // ---------- Moldura (mesmo material das portas) ----------
    const sideGeo = new THREE.BoxGeometry(
      FRAME_BORDER,
      size + FRAME_BORDER * 2,
      FRAME_DEPTH
    );
    const frameLeft = new THREE.Mesh(sideGeo, materials.doorFrame);
    frameLeft.position.set(-half - FRAME_BORDER / 2, 0, 0);
    group.add(frameLeft);

    const frameRight = frameLeft.clone();
    frameRight.position.x = half + FRAME_BORDER / 2;
    group.add(frameRight);

    const topBottomGeo = new THREE.BoxGeometry(size, FRAME_BORDER, FRAME_DEPTH);
    const frameTop = new THREE.Mesh(topBottomGeo, materials.doorFrame);
    frameTop.position.set(0, half + FRAME_BORDER / 2, 0);
    group.add(frameTop);

    const frameBottom = frameTop.clone();
    frameBottom.position.y = -half - FRAME_BORDER / 2;
    group.add(frameBottom);

    // ---------- A imagem ----------
    const texture = loadPictureTexture(imagePath);
    // MeshStandardMaterial (não MeshBasicMaterial): precisa reagir às
    // luzes da cena (luminária + ambient light) igual à moldura e ao
    // resto do corredor. MeshBasicMaterial ignora iluminação por
    // completo, o que fazia a imagem parecer autoiluminada. Roughness
    // alto (sem metalness) para se comportar como uma foto/impressão
    // fosca, na mesma linha das demais superfícies foscas do cenário.
    const pictureMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0,
    });
    const pictureGeo = new THREE.PlaneGeometry(size, size);
    const picture = new THREE.Mesh(pictureGeo, pictureMat);
    // Levemente à frente da moldura, para não haver z-fighting com o
    // fundo (mesma lógica usada na placa das portas).
    picture.position.z = FRAME_DEPTH / 2 + 0.003;
    group.add(picture);

    return group;
  }

  return { createPicture: createPicture };
})();
