/**
 * editor/editor-overrides.js
 * -------------------------------------------------
 * CAMADA DE DADOS DO EDITOR — a "metade invisível" da ferramenta.
 *
 * Este arquivo é o único dono das alterações feitas no modo Editor.
 * Ele NUNCA toca nos arquivos originais do jogo: guarda apenas o
 * DELTA (o que mudou em relação ao valor original) de cada objeto,
 * identificado por um id estável (ver editor/editor-registry.js).
 *
 * Três camadas, aplicadas nesta ordem:
 *
 *   1. Arquivos originais do jogo (scenes/*, models/*, materials/*)
 *   2. data/editor-overrides.json  — camada OPCIONAL versionada junto
 *      do jogo (o dev exporta pelo Editor e comita o arquivo; assim a
 *      edição viaja com a build para outros aparelhos)
 *   3. localStorage do aparelho  — camada de trabalho do dia a dia
 *
 * A camada 3 vence a 2, que vence a 1. Como nada disso mora dentro
 * dos arquivos originais, uma atualização do jogo pode substituir
 * scenes/, models/ e afins à vontade: as alterações continuam
 * aplicadas por cima (ver o README do Editor).
 *
 * Formato salvo (JSON), só com o que de fato mudou:
 *
 *   {
 *     "version": 2,
 *     "updatedAt": "2026-01-01T00:00:00.000Z",
 *     "scenes": {
 *       "corredor": {
 *         "mesa/telefone": {
 *           "position": { "x": 1.2 },
 *           "rotation": { "y": 0.5236 },
 *           "visible": false,
 *           "removed": true,
 *           "hint": { "name": "", "type": "Group", "pos": [1, 0.9, -3] }
 *         }
 *       }
 *     },
 *     "clones": {
 *       "quarto": {
 *         "cadeira-copia": {
 *           "source": "cadeira",
 *           "parent": "",
 *           "localId": "cadeira-copia",
 *           "base": "cadeira",
 *           "label": "Cadeira (cópia)",
 *           "count": 4,
 *           "order": 1
 *         }
 *       }
 *     }
 *   }
 *
 * `visible: false` é OCULTAR (o objeto continua na cena, só não aparece);
 * `removed: true` é EXCLUIR (o objeto sai da árvore da cena e perde a
 * interação, no Editor e no jogo normal). São duas coisas diferentes de
 * propósito, e as duas são só delta: sem a linha salva, o objeto volta
 * como era — nenhum arquivo do jogo foi tocado. Ver a seção
 * "Excluídos" em editor/editor-registry.js.
 *
 * `scenes` é o que MUDOU em objetos que o jogo já tem (o que saiu
 * incluso); `clones` é o que PASSOU A EXISTIR (a ferramenta DUPLICAR —
 * ver editor/editor-clones.js).
 * Os dois são delta: a cópia guarda só "existe uma cópia de X aqui", e as
 * próprias propriedades dela ficam em `scenes`, na chave do id novo.
 * Arquivo antigo (version 1, sem `clones`) continua valendo — ele só
 * não tem cópia nenhuma.
 *
 * `hint` não é usado para achar o objeto no caso normal (o id basta);
 * ele existe como plano B para o dia em que uma atualização do jogo
 * mudar o id de um objeto — ver resolveByHint() em
 * editor/editor-registry.js. E se nem o id nem o hint acharem nada,
 * a alteração é simplesmente ignorada: nunca quebra o boot do jogo.
 * -------------------------------------------------
 */

window.EditorOverrides = (function () {
  const STORAGE_KEY = "psx-editor-overrides-v1";
  const SHIPPED_URL = "data/editor-overrides.json";
  const VERSION = 2;

  // Documento de trabalho: já é a fusão das camadas 2 e 3 acima.
  let doc = emptyDoc();

  // true = existe alteração feita depois do último SALVAR.
  let dirty = false;

  let ready = false;
  const readyCallbacks = [];

  function emptyDoc() {
    return { version: VERSION, updatedAt: null, scenes: {}, clones: {} };
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  // Funde `source` dentro de `target` sem apagar nada que já exista em
  // `target` — usado para colocar o arquivo versionado POR BAIXO do
  // que o aparelho já tem salvo.
  function mergeUnder(target, source) {
    Object.keys(source).forEach(function (key) {
      const incoming = source[key];
      if (isPlainObject(incoming)) {
        if (!isPlainObject(target[key])) {
          target[key] = isPlainObject(target[key]) ? target[key] : {};
        }
        mergeUnder(target[key], incoming);
      } else if (target[key] === undefined) {
        target[key] = incoming;
      }
    });
    return target;
  }

  function sanitize(raw) {
    const out = emptyDoc();
    if (!isPlainObject(raw) || !isPlainObject(raw.scenes)) {
      return out;
    }
    out.updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : null;
    Object.keys(raw.scenes).forEach(function (sceneKey) {
      const sceneRaw = raw.scenes[sceneKey];
      if (!isPlainObject(sceneRaw)) return;
      const sceneOut = {};
      Object.keys(sceneRaw).forEach(function (objectId) {
        if (isPlainObject(sceneRaw[objectId])) {
          sceneOut[objectId] = sceneRaw[objectId];
        }
      });
      out.scenes[sceneKey] = sceneOut;
    });

    // ---------- Cópias (DUPLICAR) ----------
    // Registro curto e conferido campo por campo: um JSON estranho
    // colado à mão nunca pode virar uma cópia meia-boca na cena.
    if (isPlainObject(raw.clones)) {
      Object.keys(raw.clones).forEach(function (sceneKey) {
        const sceneRaw = raw.clones[sceneKey];
        if (!isPlainObject(sceneRaw)) return;
        const sceneOut = {};
        Object.keys(sceneRaw).forEach(function (cloneId) {
          const record = sceneRaw[cloneId];
          if (!isPlainObject(record)) return;
          if (typeof record.source !== "string" || !record.source) return;
          if (typeof record.localId !== "string" || !record.localId) return;
          sceneOut[cloneId] = {
            source: record.source,
            parent: typeof record.parent === "string" ? record.parent : "",
            localId: record.localId,
            base: typeof record.base === "string" ? record.base : record.localId,
            label: typeof record.label === "string" ? record.label : "",
            count: typeof record.count === "number" ? record.count : 0,
            order: typeof record.order === "number" ? record.order : 0,
          };
        });
        out.clones[sceneKey] = sceneOut;
      });
    }
    return out;
  }

  function readLocal() {
    try {
      const text = window.localStorage.getItem(STORAGE_KEY);
      if (!text) return null;
      return sanitize(JSON.parse(text));
    } catch (e) {
      // localStorage bloqueado (file:// em alguns WebViews, modo
      // privado etc.) ou JSON corrompido: o Editor continua
      // funcionando, só sem persistir sozinho — o dev ainda pode
      // EXPORTAR o JSON pela própria interface.
      return null;
    }
  }

  function writeLocal() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
      return true;
    } catch (e) {
      return false;
    }
  }

  function finishInit() {
    ready = true;
    while (readyCallbacks.length) {
      const cb = readyCallbacks.shift();
      try {
        cb();
      } catch (e) {
        /* nunca deixa uma alteração salva derrubar o boot */
      }
    }
  }

  /**
   * Carrega as duas camadas de dados. `onReady` é chamado sempre —
   * inclusive quando não existe nenhuma alteração salva, ou quando o
   * arquivo versionado não existe (404 é esperado e silencioso).
   */
  function init(onReady) {
    if (typeof onReady === "function") {
      if (ready) {
        onReady();
        return;
      }
      readyCallbacks.push(onReady);
    }
    if (doc.__initStarted) return;
    doc.__initStarted = true;

    const local = readLocal();
    if (local) {
      doc = local;
    }
    doc.__initStarted = true;

    // Camada versionada (opcional). fetch falha em file:// — tudo bem,
    // é só a camada de baixo.
    let settled = false;
    function settle() {
      if (settled) return;
      settled = true;
      finishInit();
    }

    try {
      window
        .fetch(SHIPPED_URL, { cache: "no-store" })
        .then(function (response) {
          if (!response.ok) throw new Error("sem arquivo");
          return response.json();
        })
        .then(function (json) {
          adoptShipped(sanitize(json));
        })
        .catch(function () {})
        .then(settle);
    } catch (e) {
      settle();
    }

    // Rede/WebView travado não pode atrasar o jogo: no pior caso o
    // boot segue sem a camada versionada.
    window.setTimeout(settle, 1500);
  }

  /**
   * Decide quem vale mais: o arquivo que esta na PASTA DO JOGO
   * (data/editor-overrides.json) ou o que este aparelho tem salvo.
   *
   * Desde que o SALVAR passou a gravar direto na pasta (ver
   * editor/editor-filesystem.js), os dois lados sao gravados juntos e
   * carregam o mesmo `updatedAt`. Entao a regra e simples: ganha o
   * mais NOVO, inteiro. Empate vai para o arquivo da pasta, que e a
   * versao que viaja junto da build.
   *
   * Ganhar INTEIRO importa: e o que faz apagar uma alteracao no Editor
   * (e salvar) realmente apaga-la. Fundir as duas camadas ressuscitaria
   * o que foi removido. O caminho antigo (fundir por baixo) continua
   * valendo quando o aparelho esta na frente do arquivo -- por exemplo,
   * quando a build trouxe um arquivo velho.
   */
  function adoptShipped(shipped) {
    const fileAt = shipped.updatedAt || "";
    const localAt = doc.updatedAt || "";
    if (fileAt && (!localAt || fileAt >= localAt)) {
      shipped.__initStarted = true;
      doc = shipped;
      // Espelha no aparelho para o proximo boot ja abrir certo mesmo
      // sem servidor (e para o jogo normal, que nao tem Editor).
      writeLocal();
      return;
    }
    // Aparelho na frente do arquivo: o aparelho vence INTEIRO. Fundir o
    // arquivo velho por baixo ressuscitaria o que foi apagado depois
    // dele (resetar um objeto voltaria atras no proximo boot).
    if (localAt) return;
    mergeUnder(doc, shipped);
  }

  function sceneMap(sceneKey, create) {
    if (!doc.scenes[sceneKey]) {
      if (!create) return null;
      doc.scenes[sceneKey] = {};
    }
    return doc.scenes[sceneKey];
  }

  function get(sceneKey, objectId) {
    const map = sceneMap(sceneKey, false);
    return map ? map[objectId] || null : null;
  }

  function getSceneEntries(sceneKey) {
    return sceneMap(sceneKey, false) || {};
  }

  /**
   * Grava um valor em um caminho ("position.x", "material.opacity",
   * "visible"). `hint` é opcional e só é gravado uma vez por objeto.
   */
  function setPath(sceneKey, objectId, path, value, hint) {
    const map = sceneMap(sceneKey, true);
    if (!map[objectId]) {
      map[objectId] = {};
    }
    const entry = map[objectId];
    if (hint && !entry.hint) {
      entry.hint = hint;
    }

    const parts = path.split(".");
    let node = entry;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!isPlainObject(node[parts[i]])) {
        node[parts[i]] = {};
      }
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = value;
    dirty = true;
  }

  /**
   * Apaga um caminho específico — usado quando o valor volta a ser
   * exatamente o original (é assim que o arquivo salvo se mantém
   * pequeno: só guarda o que de fato difere do jogo).
   */
  function clearPath(sceneKey, objectId, path) {
    const map = sceneMap(sceneKey, false);
    if (!map || !map[objectId]) return;

    const parts = path.split(".");
    const chain = [map[objectId]];
    let node = map[objectId];
    for (let i = 0; i < parts.length - 1; i++) {
      node = node[parts[i]];
      if (!isPlainObject(node)) return;
      chain.push(node);
    }
    delete node[parts[parts.length - 1]];

    // Poda os objetos que ficaram vazios, de dentro para fora.
    for (let i = chain.length - 1; i > 0; i--) {
      if (Object.keys(chain[i]).length === 0) {
        delete chain[i - 1][parts[i - 1]];
      }
    }
    const entry = map[objectId];
    const keys = Object.keys(entry).filter(function (k) {
      return k !== "hint";
    });
    if (keys.length === 0) {
      delete map[objectId];
    }
    dirty = true;
  }

  /**
   * Substitui (ou apaga, com `entry = null`) o delta inteiro de um
   * objeto de uma vez. É por aqui que o desfazer/refazer restaura o
   * estado anterior — ver editor/editor-mode.js.
   */
  function setEntry(sceneKey, objectId, entry) {
    const map = sceneMap(sceneKey, true);
    if (entry === null || entry === undefined) {
      delete map[objectId];
    } else {
      map[objectId] = JSON.parse(JSON.stringify(entry));
    }
    dirty = true;
  }

  // ---------- Cópias ----------
  // Aqui mora só a EXISTÊNCIA da cópia. Posição, escala, material e
  // companhia dela seguem o caminho normal (setPath/setEntry), na
  // chave do id dela — ver editor/editor-clones.js.

  function cloneMap(sceneKey, create) {
    if (!doc.clones) {
      if (!create) return null;
      doc.clones = {};
    }
    if (!doc.clones[sceneKey]) {
      if (!create) return null;
      doc.clones[sceneKey] = {};
    }
    return doc.clones[sceneKey];
  }

  function getSceneClones(sceneKey) {
    return cloneMap(sceneKey, false) || {};
  }

  function getClone(sceneKey, cloneId) {
    const map = cloneMap(sceneKey, false);
    return map ? map[cloneId] || null : null;
  }

  function setClone(sceneKey, cloneId, record) {
    const map = cloneMap(sceneKey, true);
    if (record === null || record === undefined) {
      delete map[cloneId];
    } else {
      map[cloneId] = JSON.parse(JSON.stringify(record));
    }
    dirty = true;
  }

  function removeClone(sceneKey, cloneId) {
    const map = cloneMap(sceneKey, false);
    if (!map || !map[cloneId]) return;
    delete map[cloneId];
    dirty = true;
  }

  function countClones() {
    let total = 0;
    Object.keys(doc.clones || {}).forEach(function (sceneKey) {
      total += Object.keys(doc.clones[sceneKey]).length;
    });
    return total;
  }

  function clearObject(sceneKey, objectId) {
    const map = sceneMap(sceneKey, false);
    if (!map || !map[objectId]) return;
    delete map[objectId];
    dirty = true;
  }

  function clearAll() {
    doc = emptyDoc();
    doc.__initStarted = true;
    dirty = true;
  }

  function countChanges() {
    let total = 0;
    Object.keys(doc.scenes).forEach(function (sceneKey) {
      total += Object.keys(doc.scenes[sceneKey]).length;
    });
    return total;
  }

  /**
   * SALVAR.
   *
   * Grava nos dois lugares, nesta ordem:
   *   1. data/editor-overrides.json, DENTRO DA PASTA DO JOGO, quando
   *      existe caminho de escrita (servidor local ou pasta autorizada
   *      -- ver editor/editor-filesystem.js);
   *   2. armazenamento do aparelho, sempre (e o que segura a edicao
   *      quando nao ha ponte nenhuma, e o que o jogo le no boot).
   *
   * A gravacao na pasta e assincrona, por isso o resultado completo vem
   * pelo callback: { local, folder, mode, reason }. O retorno direto
   * continua sendo so o do aparelho, para nao quebrar quem ja chamava
   * save() sem callback.
   */
  function save(onDone) {
    doc.version = VERSION;
    doc.updatedAt = new Date().toISOString();
    const localOk = writeLocal();
    if (localOk) {
      dirty = false;
    }

    const result = { local: localOk, folder: false, mode: "none", reason: "", late: false };
    let called = false;
    function finish() {
      if (called) return;
      called = true;
      if (typeof onDone === "function") onDone(result);
    }
    // A gravacao pode chegar DEPOIS do prazo de seguranca (aparelho
    // ocupado, servidor lento). Quando chega, avisa de novo com
    // late = true, em vez de deixar na tela um "salvo so no aparelho"
    // que ja nao e verdade.
    function settleLate() {
      if (!called) {
        finish();
        return;
      }
      if (!result.folder) return;
      result.late = true;
      if (typeof onDone === "function") onDone(result);
    }

    const bridge = window.EditorFileSystem;
    if (!bridge) {
      result.reason = "sem caminho ate a pasta";
      finish();
      return localOk;
    }
    // Nao pergunta mais "da para gravar?" antes de tentar. Quem
    // responde e a propria tentativa (ver write() em
    // editor/editor-filesystem.js): o probe do boot pode ter perdido a
    // corrida com o carregamento dos modelos, e ate agora isso fazia o
    // SALVAR ir so para o aparelho sem nem bater na porta do servidor.

    try {
      bridge
        .write(exportText(), true)
        .then(function (res) {
          result.folder = !!(res && res.ok);
          result.mode = (res && res.mode) || "none";
          result.reason = (res && res.reason) || "";
          // Gravou no arquivo de verdade: nada pendente, mesmo que o
          // armazenamento do aparelho esteja bloqueado.
          if (result.folder) dirty = false;
        })
        .catch(function () {
          result.reason = "falha ao gravar na pasta";
        })
        .then(settleLate);
    } catch (e) {
      result.reason = "falha ao gravar na pasta";
      finish();
    }

    // Ponte travada nao pode deixar o Editor esperando para sempre —
    // mas o prazo tem que caber um servidor local ocupado servindo
    // modelo, senao o aviso mente.
    window.setTimeout(function () {
      if (!called) result.reason = result.reason || "a pasta ainda nao respondeu";
      finish();
    }, 20000);
    return localOk;
  }

  /**
   * Recarrega o que esta salvo, jogando fora o que nao foi salvo.
   * Le o ARQUIVO da pasta do jogo tambem (nao so o aparelho), com a
   * mesma regra de precedencia do boot -- por isso e assincrono e
   * avisa por callback quando terminou.
   */
  function reloadFromDisk(onDone) {
    const local = readLocal();
    doc = local || emptyDoc();
    doc.__initStarted = true;
    dirty = false;

    let settled = false;
    function settle() {
      if (settled) return;
      settled = true;
      if (typeof onDone === "function") onDone(doc);
    }

    const bridge = window.EditorFileSystem;
    let source = null;
    try {
      if (bridge && bridge.hasFolder()) {
        source = bridge.readFromFolder().then(function (text) {
          return text ? JSON.parse(text) : null;
        });
      } else {
        source = window.fetch(SHIPPED_URL, { cache: "no-store" }).then(function (response) {
          if (!response.ok) throw new Error("sem arquivo");
          return response.json();
        });
      }
      source
        .then(function (json) {
          if (json) adoptShipped(sanitize(json));
        })
        .catch(function () {})
        .then(settle);
    } catch (e) {
      settle();
    }
    window.setTimeout(settle, 1500);
    return doc;
  }

  function exportText() {
    const copy = {
      version: VERSION,
      updatedAt: doc.updatedAt || new Date().toISOString(),
      scenes: doc.scenes,
      clones: doc.clones || {},
    };
    return JSON.stringify(copy, null, 2);
  }

  function importText(text) {
    const parsed = sanitize(JSON.parse(text));
    doc = parsed;
    doc.__initStarted = true;
    dirty = true;
    return doc;
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    SHIPPED_URL: SHIPPED_URL,
    init: init,
    isReady: function () {
      return ready;
    },
    get: get,
    getSceneEntries: getSceneEntries,
    getSceneClones: getSceneClones,
    getClone: getClone,
    setClone: setClone,
    removeClone: removeClone,
    countClones: countClones,
    getDocument: function () {
      return doc;
    },
    setPath: setPath,
    setEntry: setEntry,
    clearPath: clearPath,
    clearObject: clearObject,
    clearAll: clearAll,
    countChanges: countChanges,
    isDirty: function () {
      return dirty;
    },
    markClean: function () {
      dirty = false;
    },
    save: save,
    reloadFromDisk: reloadFromDisk,
    exportText: exportText,
    importText: importText,
  };
})();
