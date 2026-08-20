/**
 * editor/editor-textures.js
 * -------------------------------------------------
 * CATÁLOGO DE TEXTURAS DO EDITOR.
 *
 * Regra número um: reaproveitar o que o jogo já carregou. Todas as
 * texturas procedurais do projeto (materials/textures.js) já estão
 * na memória, penduradas nos materiais da cena — este arquivo só
 * varre a cena, junta as que encontrar e apresenta a lista.
 *
 * Nada de segundo sistema de carregamento: as poucas imagens de
 * arquivo (assets/pictures/) usam o mesmo THREE.TextureLoader do
 * resto do jogo, e só quando o dev toca nelas de fato (carregamento
 * sob demanda, nunca no boot).
 *
 * Filtro NEAREST em tudo, de propósito: qualquer textura aplicada
 * pelo Editor continua com o mesmo "pixel cru" PS1 do jogo.
 * -------------------------------------------------
 */

window.EditorTextures = (function () {
  // chave -> { key, label, texture, source }
  const catalog = {};
  let loader = null;

  // Imagens que já vêm com o jogo e podem ser jogadas em qualquer
  // objeto (quadros, pôster, a carta). Carregadas sob demanda.
  const FILES = [
    { file: "assets/pictures/quadro-colher.jpg", label: "Quadro · colher" },
    { file: "assets/pictures/quadro-figura.jpg", label: "Quadro · figura" },
    { file: "assets/pictures/quadro-xadrez.jpg", label: "Quadro · xadrez" },
    { file: "assets/pictures/poster-brasil-penta.jpg", label: "Pôster · penta" },
    { file: "assets/pictures/nota-infectados-256.png", label: "Carta · frente" },
    { file: "assets/pictures/nota-infectados-verso-256.png", label: "Carta · verso" },
  ];

  function getLoader() {
    if (!loader) {
      loader = new THREE.TextureLoader();
    }
    return loader;
  }

  function psxFilter(texture) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Varre os materiais já presentes nas cenas do jogo e cataloga
   * cada textura encontrada uma única vez.
   */
  function scanScenes(roots) {
    let index = 0;
    roots.forEach(function (root) {
      if (!root) return;
      root.traverse(function (obj) {
        if (!obj.material) return;
        const list = Array.isArray(obj.material) ? obj.material : [obj.material];
        list.forEach(function (mat) {
          if (!mat || !mat.map) return;
          if (mat.map.__editorCatalogKey) return;
          index += 1;
          const label = mat.name
            ? window.EditorRegistry.prettify(mat.name)
            : "Textura " + index;
          const key = "cena:" + (mat.name ? window.EditorRegistry.slug(mat.name) : "tex-" + index);
          if (catalog[key]) return;
          mat.map.__editorCatalogKey = key;
          catalog[key] = {
            key: key,
            label: label,
            texture: mat.map,
            source: "cena",
          };
        });
      });
    });
    return catalog;
  }

  function fileEntries() {
    return FILES.map(function (item) {
      const key = "arquivo:" + item.file;
      if (!catalog[key]) {
        catalog[key] = {
          key: key,
          label: item.label,
          texture: null, // só carrega quando for usada
          source: "arquivo",
          file: item.file,
        };
      }
      return catalog[key];
    });
  }

  function list() {
    fileEntries();
    return Object.keys(catalog).map(function (key) {
      return catalog[key];
    });
  }

  /**
   * Devolve a THREE.Texture de uma chave do catálogo, carregando do
   * disco na primeira vez se for uma imagem de arquivo. Devolve null
   * enquanto a imagem ainda não chegou (o material é atualizado
   * sozinho quando ela chega).
   */
  function resolve(key, onLoaded) {
    fileEntries();
    const item = catalog[key];
    if (!item) return null;
    if (item.texture) return item.texture;
    if (item.source !== "arquivo" || item.loading) return null;

    item.loading = true;
    getLoader().load(
      item.file,
      function (texture) {
        item.loading = false;
        item.texture = psxFilter(texture);
        if (typeof onLoaded === "function") {
          onLoaded(item.texture);
        }
      },
      undefined,
      function () {
        item.loading = false;
      }
    );
    return null;
  }

  return {
    scanScenes: scanScenes,
    list: list,
    resolve: resolve,
    psxFilter: psxFilter,
  };
})();
