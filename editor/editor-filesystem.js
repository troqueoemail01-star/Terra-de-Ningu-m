/**
 * editor/editor-filesystem.js
 * -------------------------------------------------
 * PONTE COM A PASTA DO JOGO — o caminho que faz o botao SALVAR do
 * Editor gravar DIRETO em data/editor-overrides.json, dentro da
 * propria pasta do jogo, em vez de so no armazenamento do aparelho.
 *
 * O navegador nao pode escrever em uma pasta por conta propria (e
 * bom que nao possa). Existem exatamente dois caminhos legitimos, e
 * este arquivo implementa os dois, nesta ordem de preferencia:
 *
 *   1. PONTE DE SERVIDOR (funciona em qualquer aparelho, inclusive
 *      celular). O jogo e aberto por um servidor local que roda na
 *      propria pasta (ver tools/dev-server.py ou tools/dev-server.js).
 *      Esse servidor aceita PUT em data/editor-overrides.json e grava
 *      o arquivo no disco. O Editor descobre sozinho que esta ponte
 *      existe pedindo GET __editor-bridge no boot.
 *
 *   2. PASTA AUTORIZADA (File System Access API — Chrome/Edge no
 *      computador). Uma vez, pelo menu ... do Editor, o dev escolhe a
 *      pasta do jogo e autoriza a escrita. A autorizacao fica guardada
 *      em IndexedDB e vale para as proximas sessoes.
 *
 * Se nenhum dos dois existir (jogo aberto por file://, hospedagem
 * estatica, WebView de APK), nada quebra: o SALVAR continua gravando
 * no aparelho como sempre fez, e o aviso na tela diz exatamente onde
 * a alteracao ficou.
 *
 * Este arquivo NAO conhece o formato do JSON e nao conhece Three.js.
 * Ele so recebe um texto e tenta grava-lo no lugar certo.
 * -------------------------------------------------
 */

window.EditorFileSystem = (function () {
  const TARGET_PATH = "data/editor-overrides.json";
  const PROBE_PATH = "__editor-bridge";
  // O probe compete com o carregamento dos .glb (dezenas de MB no
  // mesmo servidor local, e o navegador abre poucas conexoes por vez).
  // Timeout curto = ponte declarada inexistente por atraso, e o SALVAR
  // caindo silenciosamente no aparelho. Generoso aqui, e com repeticao.
  const PROBE_TIMEOUT = 10000;
  const PROBE_TRIES = 3;
  const DB_NAME = "psx-editor-fs";
  const DB_STORE = "handles";
  const DB_KEY = "game-folder";

  // Ponte de servidor: preenchido pelo probe do boot.
  let server = null; // { write: true, root: "..." }
  // Pasta autorizada pelo dev (File System Access API).
  let folderHandle = null;
  let folderName = "";

  let ready = false;
  const readyCallbacks = [];
  let lastResult = null;

  function supportsFolderPicker() {
    return (
      typeof window.showDirectoryPicker === "function" &&
      window.isSecureContext !== false
    );
  }

  // ---------- IndexedDB (guarda so a autorizacao da pasta) ----------

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("sem indexedDB"));
        return;
      }
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error || new Error("indexedDB bloqueado"));
      };
    });
  }

  function idbPut(value) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put(value, DB_KEY);
        tx.oncomplete = function () {
          db.close();
          resolve(true);
        };
        tx.onerror = function () {
          db.close();
          reject(tx.error || new Error("falha ao gravar"));
        };
      });
    });
  }

  function idbGet() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(DB_STORE, "readonly");
        const request = tx.objectStore(DB_STORE).get(DB_KEY);
        request.onsuccess = function () {
          db.close();
          resolve(request.result || null);
        };
        request.onerror = function () {
          db.close();
          reject(request.error || new Error("falha ao ler"));
        };
      });
    });
  }

  function idbDelete() {
    return openDB().then(function (db) {
      return new Promise(function (resolve) {
        const tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).delete(DB_KEY);
        tx.oncomplete = function () {
          db.close();
          resolve(true);
        };
        tx.onerror = function () {
          db.close();
          resolve(false);
        };
      });
    });
  }

  // ---------- Permissao da pasta ----------

  function ensurePermission(handle, ask) {
    if (!handle || typeof handle.queryPermission !== "function") {
      return Promise.resolve(true);
    }
    const options = { mode: "readwrite" };
    return handle.queryPermission(options).then(function (state) {
      if (state === "granted") return true;
      if (!ask || typeof handle.requestPermission !== "function") return false;
      return handle.requestPermission(options).then(function (result) {
        return result === "granted";
      });
    });
  }

  // ---------- Boot ----------

  function probeOnce(timeout) {
    return new Promise(function (resolve) {
      let done = false;
      function finish(value) {
        if (done) return;
        done = true;
        resolve(value);
      }
      window.setTimeout(function () {
        finish(null);
      }, timeout);
      try {
        window
          .fetch(PROBE_PATH, { cache: "no-store" })
          .then(function (response) {
            if (!response.ok) throw new Error("sem ponte");
            return response.json();
          })
          .then(function (info) {
            if (info && info.bridge === "psx-editor" && info.write) {
              finish(info);
            } else {
              finish(null);
            }
          })
          .catch(function () {
            finish(null);
          });
      } catch (e) {
        finish(null);
      }
    });
  }

  // Tenta algumas vezes antes de concluir que nao ha servidor: durante
  // o boot o aparelho esta ocupado baixando modelo, e uma unica
  // tentativa perdida deixaria a sessao inteira sem ponte.
  function probeServer() {
    let attempt = 0;
    function round() {
      attempt += 1;
      return probeOnce(PROBE_TIMEOUT).then(function (info) {
        if (info || attempt >= PROBE_TRIES) return info;
        return new Promise(function (resolve) {
          window.setTimeout(resolve, 1500);
        }).then(round);
      });
    }
    return round();
  }

  // Reconfere a ponte sob demanda (o SALVAR usa isto quando ainda nao
  // sabe se existe servidor).
  function recheckServer() {
    return probeOnce(PROBE_TIMEOUT).then(function (info) {
      if (info) server = info;
      return server;
    });
  }

  function restoreFolder() {
    if (!supportsFolderPicker()) return Promise.resolve(null);
    return idbGet()
      .then(function (handle) {
        if (!handle || typeof handle.getDirectoryHandle !== "function") return null;
        // Sem pedir nada ao dev: se a autorizacao ainda vale, ja esta
        // pronta; se nao vale, o primeiro SALVAR pergunta (o toque no
        // botao e o gesto que o navegador exige).
        return handle;
      })
      .catch(function () {
        return null;
      });
  }

  function init(onReady) {
    if (typeof onReady === "function") {
      if (ready) {
        onReady();
        return;
      }
      readyCallbacks.push(onReady);
    }
    if (init.__started) return;
    init.__started = true;

    Promise.all([probeServer(), restoreFolder()])
      .then(function (results) {
        server = results[0];
        folderHandle = results[1];
        folderName = folderHandle ? folderHandle.name || "pasta do jogo" : "";
      })
      .catch(function () {})
      .then(function () {
        ready = true;
        while (readyCallbacks.length) {
          const cb = readyCallbacks.shift();
          try {
            cb();
          } catch (e) {
            /* nada aqui pode derrubar o boot do jogo */
          }
        }
      });
  }

  // ---------- Escrita ----------

  function writeThroughServer(text) {
    return window
      .fetch(TARGET_PATH, {
        method: "PUT",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: text,
      })
      .then(function (response) {
        if (!response.ok) {
          return { ok: false, mode: "server", reason: "servidor recusou (" + response.status + ")" };
        }
        return { ok: true, mode: "server", path: TARGET_PATH };
      })
      .catch(function () {
        return { ok: false, mode: "server", reason: "servidor local nao respondeu" };
      });
  }

  function writeThroughFolder(text, ask) {
    return ensurePermission(folderHandle, ask)
      .then(function (allowed) {
        if (!allowed) {
          return { ok: false, mode: "folder", reason: "permissao da pasta negada" };
        }
        return folderHandle
          .getDirectoryHandle("data", { create: true })
          .then(function (dir) {
            return dir.getFileHandle("editor-overrides.json", { create: true });
          })
          .then(function (file) {
            return file.createWritable();
          })
          .then(function (writable) {
            return writable.write(text).then(function () {
              return writable.close();
            });
          })
          .then(function () {
            return { ok: true, mode: "folder", path: TARGET_PATH };
          });
      })
      .catch(function (e) {
        return {
          ok: false,
          mode: "folder",
          reason: (e && e.message) || "falha ao escrever na pasta",
        };
      });
  }

  /**
   * Grava o texto em data/editor-overrides.json, na pasta do jogo.
   * Sempre resolve (nunca rejeita): { ok, mode, reason }.
   * `ask = true` permite abrir o pedido de permissao do navegador —
   * so passe true a partir de um toque do dev (o SALVAR).
   */
  function write(text, ask) {
    let chain;
    if (server) {
      chain = writeThroughServer(text).then(function (result) {
        // Servidor caiu no meio da sessao? Ainda da para tentar a
        // pasta autorizada antes de desistir.
        if (!result.ok && folderHandle) return writeThroughFolder(text, ask);
        return result;
      });
    } else if (folderHandle) {
      chain = writeThroughFolder(text, ask);
    } else {
      // NAO desiste sem tentar. O probe do boot pode ter perdido a
      // corrida com o carregamento dos modelos: quem decide se existe
      // servidor e o proprio PUT. Em hospedagem estatica ele so
      // devolve 403/405 e o aviso honesto aparece igual.
      chain = writeThroughServer(text).then(function (result) {
        if (result.ok) {
          server = { bridge: "psx-editor", write: true };
          return result;
        }
        return {
          ok: false,
          mode: "none",
          reason: result.reason || "sem ponte com a pasta",
        };
      });
    }
    return chain.then(function (result) {
      lastResult = result;
      return result;
    });
  }

  /** Le o arquivo direto da pasta autorizada (quando houver). */
  function readFromFolder() {
    if (!folderHandle) return Promise.resolve(null);
    return ensurePermission(folderHandle, false)
      .then(function (allowed) {
        if (!allowed) return null;
        return folderHandle
          .getDirectoryHandle("data")
          .then(function (dir) {
            return dir.getFileHandle("editor-overrides.json");
          })
          .then(function (file) {
            return file.getFile();
          })
          .then(function (blob) {
            return blob.text();
          });
      })
      .catch(function () {
        return null;
      });
  }

  // ---------- Escolher a pasta (uma vez) ----------

  function connectFolder() {
    if (!supportsFolderPicker()) {
      return Promise.resolve({
        ok: false,
        reason: "Este navegador nao deixa escolher pasta. Use o servidor local (tools/dev-server).",
      });
    }
    let picked = null;
    return window
      .showDirectoryPicker({ id: "psx-game-folder", mode: "readwrite", startIn: "documents" })
      .then(function (handle) {
        picked = handle;
        // Confere que e mesmo a pasta do jogo: index.html tem que
        // estar ali dentro. Evita gravar um editor-overrides.json
        // perdido em Downloads.
        return picked.getFileHandle("index.html").catch(function () {
          throw new Error("pasta-errada");
        });
      })
      .then(function () {
        return ensurePermission(picked, true);
      })
      .then(function (allowed) {
        if (!allowed) {
          return { ok: false, reason: "Permissao de escrita negada." };
        }
        folderHandle = picked;
        folderName = picked.name || "pasta do jogo";
        return idbPut(picked)
          .catch(function () {
            // Sem IndexedDB a pasta vale so nesta sessao — melhor do
            // que nada, e o dev e avisado.
            return false;
          })
          .then(function (stored) {
            return { ok: true, name: folderName, remembered: stored !== false };
          });
      })
      .catch(function (e) {
        if (e && e.name === "AbortError") {
          return { ok: false, reason: "" }; // o dev desistiu; sem barulho
        }
        if (e && e.message === "pasta-errada") {
          return {
            ok: false,
            reason: "Essa pasta nao parece ser a do jogo (nao tem index.html).",
          };
        }
        return { ok: false, reason: (e && e.message) || "Nao foi possivel abrir a pasta." };
      });
  }

  function disconnectFolder() {
    folderHandle = null;
    folderName = "";
    return idbDelete().catch(function () {
      return false;
    });
  }

  // ---------- Estado, para a interface ----------

  function mode() {
    if (server) return "server";
    if (folderHandle) return "folder";
    return "none";
  }

  function canWrite() {
    return mode() !== "none";
  }

  function describe() {
    if (server) return "Pasta do jogo (servidor local)";
    if (folderHandle) return "Pasta do jogo (" + folderName + ")";
    return "Somente neste aparelho";
  }

  return {
    TARGET_PATH: TARGET_PATH,
    init: init,
    isReady: function () {
      return ready;
    },
    recheckServer: recheckServer,
    mode: mode,
    canWrite: canWrite,
    describe: describe,
    supportsFolderPicker: supportsFolderPicker,
    hasFolder: function () {
      return !!folderHandle;
    },
    folderName: function () {
      return folderName;
    },
    write: write,
    readFromFolder: readFromFolder,
    connectFolder: connectFolder,
    disconnectFolder: disconnectFolder,
    lastResult: function () {
      return lastResult;
    },
  };
})();
