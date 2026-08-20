/**
 * models/sign-factory.js
 * -------------------------------------------------
 * Cria as placas com o nome de cada porta.
 * O texto é desenhado num <canvas> e usado como
 * textura de um plano — não depende de nenhuma
 * fonte 3D nem de arquivo de modelo externo.
 * -------------------------------------------------
 */

window.SignFactory = (function () {
  function createSignTexture(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    // Placa metálica escura, envelhecida
    ctx.fillStyle = "#141210";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#3a352c";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    ctx.fillStyle = "#d8cba8";
    ctx.font = "bold 26px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  // Cria a placa (um plano fino) posicionada acima/ao lado da porta,
  // sempre "colada" na parede indicada por `wallNormal`.
  function createSign(text, width, height) {
    const texture = createSignTexture(text);
    const geometry = new THREE.PlaneGeometry(width, height);
    // MeshStandardMaterial (não MeshBasicMaterial): precisa reagir às
    // luzes da cena igual ao resto do corredor. MeshBasicMaterial ignora
    // iluminação por completo, o que fazia o texto parecer autoiluminado
    // mesmo em áreas escuras. Roughness alto (sem metalness) para se
    // comportar como uma placa metálica fosca, na mesma linha do quadro
    // (ver PictureFactory).
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0,
      transparent: false,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geometry, material);
  }

  return { createSign: createSign };
})();
