/**
 * editor/editor-clones.js
 * -------------------------------------------------
 * CÓPIAS — a ferramenta DUPLICAR do Editor.
 *
 * Entra exatamente pelo caminho que o resto do Editor já usa: nada
 * aqui mexe nos arquivos originais do jogo e nada aqui cria cena,
 * renderer ou loop paralelo. Uma cópia é só mais um objeto na MESMA
 * cena Three.js, com id estável, delta próprio e desfazer normal.
 *
 * ---------- Como uma cópia é guardada ----------
 *
 * Só o ESSENCIAL vira dado salvo — "existe uma cópia de X aqui":
 *
 *   "clones": {
 *     "quarto": {
 *       "cama-copia": {
 *         "source": "cama",      // objeto de origem (sempre um objeto REAL do jogo)
 *         "parent": "",          // pai na árvore ("" = raiz do cenário)
 *         "localId": "cama-copia",
 *         "base": "cama",
 *         "label": "Cama (cópia)",
 *         "count": 12,            // nós da origem na hora da cópia (ver .glb abaixo)
 *         "order": 1              // ordem de criação
 *       }
 *     }
 *   }
 *
 * Posição, rotação, escala, material e textura da cópia NÃO ficam
 * aqui: eles vão para o mesmo delta de sempre
 * (editor/editor-overrides.js), na chave do id dela. Ou seja, depois
 * de nascer, uma cópia é um objeto igual a qualquer outro para o
 * Editor inteiro — gizmo, inspetor, hierarquia, desfazer e SALVAR
 * funcionam nela sem nenhum caso especial.
 *
 * A cópia nasce IDÊNTICA ao que está na tela porque o delta do objeto
 * duplicado (e o das peças dentro dele) é copiado para os ids novos.
 * Depois disso as duas vidas são separadas: editar uma não toca na
 * outra.
 *
 * ---------- Por que "source" é sempre um objeto real ----------
 *
 * Duplicar uma cópia gera uma IRMÃ dela, não uma neta: o `source`
 * aponta para o objeto de origem do jogo. Assim, apagar a primeira
 * cópia nunca faz as outras desaparecerem no próximo boot.
 *
 * ---------- Modelos .glb (que chegam depois) ----------
 *
 * A cópia guarda quantos nós a origem tinha quando foi copiada
 * (`count`). No boot, enquanto a origem tiver menos nós que isso, a
 * cópia espera a próxima passada em vez de nascer pela metade — é o
 * mesmo motivo pelo qual o registro varre a árvore algumas vezes
 * (ver scripts/main.js). A espera tem PRAZO (WAIT_FOR_MODEL_MS): se a
 * origem parou de crescer e nunca vai bater aquele numero (foi ela que
 * mudou de tamanho numa atualizacao do jogo), a copia nasce com o que
 * existe e e refeita sozinha se o resto ainda aparecer. Esperar para
 * sempre seria o mesmo que sumir.
 *
 * ---------- Original EXCLUIDO no Editor ----------
 *
 * Apagar o original NAO apaga as copias dele. Excluir e delta
 * (`removed: true`): o objeto 3D do original continua existindo em
 * memoria, so fica fora da arvore da cena - e clonar a partir dele
 * continua valendo. As copias sao objetos independentes, com id e
 * delta proprios, e seguem na cena ate o proprio jogador apagar cada
 * uma. Duas coisas seguram isso de pe:
 *
 *   1. a varredura de excluidos (syncRemoved, em
 *      editor/editor-registry.js), que continua registrando as pecas
 *      de um .glb que chega DEPOIS de o original ser excluido - sem
 *      ela o `count` abaixo nunca fechava e a copia nao nascia;
 *   2. resolveByHint, que nunca aceita uma copia como plano B - senao
 *      o `removed` orfa do original podia encaixar na copia e apagar
 *      justamente ela.
 *
 * Origem que nao existe mais NEM COMO OBJETO (o jogo foi atualizado e
 * a peca saiu do codigo)? Ai sim a copia e ignorada em silencio, como
 * qualquer outra alteracao orfa. Nunca derruba o boot.
 * -------------------------------------------------
 */

window.EditorClones = (function () {
  // Teto de segurança: é uma ferramenta rodando no celular.
  const MAX_PER_SCENE = 400;
  const EPSILON = 1e-6;

  // Quanto tempo uma copia espera o modelo .glb da origem terminar de
  // chegar antes de nascer com o que existe. Sem este teto, uma origem
  // que mudou de tamanho numa atualizacao do jogo (ou que perdeu uma
  // peca) deixaria a copia invisivel PARA SEMPRE - e sem nenhum aviso.
  const WAIT_FOR_MODEL_MS = 6000;

  // Janela em que uma copia que nasceu incompleta ainda pode ser
  // refeita. Depois disso a cena e do jogador (ou do Editor aberto), e
  // trocar o objeto 3D debaixo da mao dele seria pior que uma peca
  // faltando.
  const REBUILD_WINDOW_MS = 25000;

  const MODULE_START = Date.now();

  // cena + id -> instante em que esta copia comecou a esperar a origem.
  const waitingSince = {};

  // O Editor aberto CONGELA o refazer de copia incompleta: dali para
  // frente a cena esta na mao do jogador, e trocar o objeto 3D debaixo
  // do gizmo (ou da selecao) seria pior que uma peca faltando.
  let rebuildFrozen = false;

  function freezeRebuild() {
    rebuildFrozen = true;
  }

  function registry() {
    return window.EditorRegistry;
  }

  function data() {
    return window.EditorOverrides;
  }

  function round6(value) {
    return Math.round(value * 1e6) / 1e6;
  }

  function idOf(parentId, localId) {
    return parentId ? parentId + "/" + localId : localId;
  }

  function isUnder(id, rootId) {
    return id === rootId || String(id).indexOf(rootId + "/") === 0;
  }

  function deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  // ---------- Nome e id da cópia ----------

  function isTaken(sceneKey, id) {
    if (registry().findById(sceneKey, id)) return true;
    return !!data().getSceneClones(sceneKey)[id];
  }

  function nextLocalId(sceneKey, parentId, base) {
    const root = (base || "objeto") + "-copia";
    let candidate = root;
    let n = 2;
    while (isTaken(sceneKey, idOf(parentId, candidate))) {
      candidate = root + "-" + n;
      n += 1;
      if (n > 999) {
        candidate = root + "-" + Date.now().toString(36);
        break;
      }
    }
    return candidate;
  }

  function cleanLabel(label) {
    return String(label || "Objeto").replace(/\s*\(c[oó]pia[^)]*\)\s*$/i, "");
  }

  function labelFrom(base, localId) {
    const match = /-copia-(\d+)$/.exec(localId);
    return cleanLabel(base) + (match ? " (cópia " + match[1] + ")" : " (cópia)");
  }

  function nextOrder(sceneKey) {
    const records = data().getSceneClones(sceneKey);
    let max = 0;
    Object.keys(records).forEach(function (id) {
      const order = records[id].order || 0;
      if (order > max) max = order;
    });
    return max + 1;
  }

  // ---------- Delta: copiar e apagar em bloco ----------

  function copyDeltaSubtree(sceneKey, fromId, toId) {
    const store = data();
    const entries = store.getSceneEntries(sceneKey);
    Object.keys(entries).forEach(function (id) {
      if (!isUnder(id, fromId)) return;
      const targetId = toId + id.slice(fromId.length);
      const copy = deepCopy(entries[id]);
      // O `hint` é do objeto ORIGINAL (mesmo nome, mesmo tipo, mesma
      // posição de fábrica). Numa cópia ele poderia encaixar a
      // alteração no objeto errado, então cópia não tem plano B: sem
      // a cópia, a alteração dela é só ignorada.
      delete copy.hint;
      if (Object.keys(copy).length) {
        store.setEntry(sceneKey, targetId, copy);
      }
    });
  }

  function clearDeltaSubtree(sceneKey, rootId) {
    const store = data();
    Object.keys(store.getSceneEntries(sceneKey)).forEach(function (id) {
      if (isUnder(id, rootId)) {
        store.clearObject(sceneKey, id);
      }
    });
  }

  // ---------- Nascer de verdade na cena ----------

  /** Reaplica o delta em toda a cópia (raiz e peças de dentro). */
  function applySubtree(entry) {
    const store = data();
    const reg = registry();
    (function walk(node) {
      reg.applyEntry(node, store.get(node.sceneKey, node.id) || {});
      node.children.forEach(walk);
    })(entry);
  }

  function materializeOne(sceneKey, id, record) {
    const reg = registry();

    const existing = reg.findById(sceneKey, id);
    if (existing) return existing;

    // A origem pode estar EXCLUIDA do cenario (o jogador apagou o
    // original e ficou so com as duplicatas): isso e problema dela, nao
    // da copia. O objeto 3D da origem continua em memoria, entao ainda
    // da para clonar - e as pecas de dentro dela continuam entrando no
    // registro pela varredura de excluidos (ver syncRemoved em
    // editor/editor-registry.js).
    const origin = reg.findById(sceneKey, record.source);
    if (!origin) return null;

    // Origem ainda incompleta (modelo .glb a caminho): espera a proxima
    // passada, mas com PRAZO. Se ela parou de crescer e nunca vai bater
    // o `count` guardado, a copia nasce com o que existe hoje, marcada
    // como incompleta - e e refeita sozinha se o resto aparecer (ver
    // materializeScene).
    const nodes = reg.countSubtree(origin);
    let pending = false;
    if (record.count && nodes < record.count) {
      const waitKey = sceneKey + "|" + id;
      const since = waitingSince[waitKey] || (waitingSince[waitKey] = Date.now());
      if (Date.now() - since < WAIT_FOR_MODEL_MS) return null;
      pending = true;
    }

    const parentEntry = record.parent ? reg.findById(sceneKey, record.parent) : null;
    if (record.parent && !parentEntry) return null;

    // Geometria e material NÃO são duplicados: o clone do Three.js
    // reaproveita os mesmos, então uma cópia custa quase nada.
    const object = origin.object.clone(true);

    const entry = reg.adoptClone({
      sceneKey: sceneKey,
      object: object,
      parentEntry: parentEntry,
      sourceEntry: origin,
      localId: record.localId,
      label: record.label || labelFrom(origin.label, record.localId),
      base: record.base,
    });
    if (!entry) return null;

    entry.__cloneNodes = nodes;
    entry.__clonePending = pending;

    applySubtree(entry);
    return entry;
  }

  /**
   * Vale a pena refazer esta copia? So quando ela nasceu incompleta E a
   * origem cresceu desde entao E ainda estamos na janela de boot.
   */
  function canRebuild(sceneKey, entry, record) {
    if (rebuildFrozen) return false;
    if (!entry || !entry.isCloneRoot || !entry.__clonePending) return false;
    if (Date.now() - MODULE_START > REBUILD_WINDOW_MS) return false;
    const reg = registry();
    const origin = reg.findById(sceneKey, record.source);
    if (!origin) return false;
    return reg.countSubtree(origin) > (entry.__cloneNodes || 0);
  }

  function materializeScene(sceneKey) {
    const reg = registry();
    const scene = reg.getScene(sceneKey);
    if (!scene || !scene.root) return 0;

    const records = data().getSceneClones(sceneKey);
    const ids = Object.keys(records).sort(function (a, b) {
      return (records[a].order || 0) - (records[b].order || 0);
    });

    let created = 0;
    ids.forEach(function (id) {
      const existing = reg.findById(sceneKey, id);
      if (existing) {
        if (!canRebuild(sceneKey, existing, records[id])) return;
        // Nasceu pela metade e a origem finalmente cresceu: refaz
        // inteira. O delta dela nao e tocado, entao posicao, rotacao,
        // escala, material e textura voltam exatamente iguais.
        try {
          reg.removeEntryTree(existing);
        } catch (e) {
          return;
        }
      }
      try {
        if (materializeOne(sceneKey, id, records[id])) created += 1;
      } catch (e) {
        /* uma cópia ruim nunca pode derrubar o jogo */
      }
    });
    return created;
  }

  function materializeAll() {
    let total = 0;
    registry()
      .getScenes()
      .forEach(function (scene) {
        total += materializeScene(scene.key);
      });
    return total;
  }

  // ---------- Deslocamento inicial ----------

  /**
   * A cópia nasce ao LADO do original (senão ela nasceria dentro
   * dele e ninguém veria nada). O empurrão vem em coordenadas de
   * mundo e é convertido para o espaço do pai, que é onde `position`
   * mora — assim funciona igual dentro de qualquer grupo, girado ou
   * escalado.
   */
  function offsetEntry(entry, offsetWorld) {
    if (!offsetWorld) return;
    const object = entry.object;
    const local = offsetWorld.clone();
    const parent = object.parent;

    if (parent) {
      parent.updateMatrixWorld();
      const inverse = new THREE.Matrix4().copy(parent.matrixWorld);
      if (inverse.invert) {
        inverse.invert();
      } else {
        inverse.getInverse(parent.matrixWorld);
      }
      const here = object.getWorldPosition(new THREE.Vector3());
      const there = here.clone().add(offsetWorld);
      here.applyMatrix4(inverse);
      there.applyMatrix4(inverse);
      local.copy(there).sub(here);
    }

    const store = data();
    ["x", "y", "z"].forEach(function (axis, index) {
      const value = round6(object.position[axis] + local[axis]);
      object.position[axis] = value;
      if (Math.abs(value - entry.original.position[index]) < EPSILON) {
        store.clearPath(entry.sceneKey, entry.id, "position." + axis);
      } else {
        store.setPath(entry.sceneKey, entry.id, "position." + axis, value, null);
      }
    });
  }

  // ---------- Duplicar ----------

  /**
   * duplicate(entry, { offsetWorld }) -> { entry, id } | { error }
   * A cópia já nasce pronta, selecionável e salvável. Quem chama
   * cuida do desfazer (ver editor/editor-mode.js) usando
   * snapshot/remove/restore aqui embaixo.
   */
  function duplicate(sourceEntry, options) {
    const opts = options || {};
    if (!sourceEntry) return { error: "selecao" };

    const sceneKey = sourceEntry.sceneKey;
    const reg = registry();
    const store = data();

    if (Object.keys(store.getSceneClones(sceneKey)).length >= MAX_PER_SCENE) {
      return { error: "limite" };
    }

    // Cópia de cópia vira irmã, não neta (ver o cabeçalho).
    const originId = sourceEntry.cloneOf || sourceEntry.id;
    const origin = reg.findById(sceneKey, originId);
    if (!origin) return { error: "origem" };

    const parentEntry = sourceEntry.parent || null;
    const parentId = parentEntry ? parentEntry.id : "";

    const base = sourceEntry.cloneBase || sourceEntry.baseLocalId || sourceEntry.localId;
    const localId = nextLocalId(sceneKey, parentId, base);
    const id = idOf(parentId, localId);

    const record = {
      source: originId,
      parent: parentId,
      localId: localId,
      base: base,
      label: labelFrom(origin.label, localId),
      count: reg.countSubtree(origin),
      order: nextOrder(sceneKey),
    };

    // 1. o que estiver editado no objeto duplicado passa para a cópia
    copyDeltaSubtree(sceneKey, sourceEntry.id, id);
    // 2. a cópia passa a existir como dado salvo
    store.setClone(sceneKey, id, record);

    // 3. e como objeto na cena
    let entry = null;
    try {
      entry = materializeOne(sceneKey, id, record);
    } catch (e) {
      entry = null;
    }

    if (!entry) {
      // Deu errado no meio: nada de meia cópia registrada por aí.
      const halfway = reg.findById(sceneKey, id);
      if (halfway) {
        try {
          reg.removeEntryTree(halfway);
        } catch (e) {
          /* silencioso de propósito */
        }
      }
      store.removeClone(sceneKey, id);
      clearDeltaSubtree(sceneKey, id);
      return { error: "falhou" };
    }

    // 4. empurrada para o lado, para dar para ver e pegar no gizmo
    offsetEntry(entry, opts.offsetWorld);

    return { entry: entry, id: id, record: record };
  }

  // ---------- Retrato / remover / restaurar (desfazer) ----------

  /** Tudo que define uma cópia: o registro dela e o delta dela. */
  function snapshot(sceneKey, rootId) {
    const store = data();
    const clones = {};
    const deltas = {};

    const records = store.getSceneClones(sceneKey);
    Object.keys(records).forEach(function (id) {
      if (isUnder(id, rootId)) clones[id] = deepCopy(records[id]);
    });

    const entries = store.getSceneEntries(sceneKey);
    Object.keys(entries).forEach(function (id) {
      if (isUnder(id, rootId)) deltas[id] = deepCopy(entries[id]);
    });

    return { sceneKey: sceneKey, rootId: rootId, clones: clones, deltas: deltas };
  }

  /**
   * Remove a cópia da cena E dos dados. Devolve o retrato para quem
   * quiser trazê-la de volta (desfazer). Cópias feitas DENTRO desta
   * saem junto — elas moram na árvore dela.
   */
  function remove(entry) {
    if (!entry || !entry.isClone) return null;
    const sceneKey = entry.sceneKey;
    const reg = registry();
    const root = reg.findById(sceneKey, entry.cloneRootId) || entry;
    const snap = snapshot(sceneKey, root.id);
    const store = data();

    reg.removeEntryTree(root);
    Object.keys(snap.clones).forEach(function (id) {
      store.removeClone(sceneKey, id);
    });
    Object.keys(snap.deltas).forEach(function (id) {
      store.clearObject(sceneKey, id);
    });
    return snap;
  }

  function restore(snap) {
    if (!snap) return null;
    const store = data();
    Object.keys(snap.deltas).forEach(function (id) {
      store.setEntry(snap.sceneKey, id, snap.deltas[id]);
    });
    Object.keys(snap.clones).forEach(function (id) {
      store.setClone(snap.sceneKey, id, snap.clones[id]);
    });
    materializeScene(snap.sceneKey);
    return registry().findById(snap.sceneKey, snap.rootId);
  }

  /**
   * Tira TODAS as cópias da cena (só os objetos 3D). Usada antes de
   * recarregar, importar ou resetar: quem chama é que decide o que
   * fazer com os dados depois.
   */
  function removeAll() {
    const reg = registry();
    reg.getScenes().forEach(function (scene) {
      const records = data().getSceneClones(scene.key);
      Object.keys(records)
        // as mais novas primeiro: cópia de dentro sai antes da de fora
        .sort(function (a, b) {
          return (records[b].order || 0) - (records[a].order || 0);
        })
        .forEach(function (id) {
          const entry = reg.findById(scene.key, id);
          if (!entry || !entry.isClone) return;
          try {
            reg.removeEntryTree(entry);
          } catch (e) {
            /* nunca derruba o jogo */
          }
        });
    });
  }

  function countScene(sceneKey) {
    return Object.keys(data().getSceneClones(sceneKey)).length;
  }

  /**
   * Quantas copias salvas ainda NAO estao inteiras na cena. E o sinal
   * que scripts/main.js usa para saber se vale insistir mais uma vez:
   * zero = tudo que foi duplicado ja esta na tela.
   */
  function pendingCount() {
    const reg = registry();
    let total = 0;
    reg.getScenes().forEach(function (scene) {
      const records = data().getSceneClones(scene.key);
      Object.keys(records).forEach(function (id) {
        const entry = reg.findById(scene.key, id);
        if (!entry || entry.__clonePending) total += 1;
      });
    });
    return total;
  }

  return {
    MAX_PER_SCENE: MAX_PER_SCENE,
    duplicate: duplicate,
    snapshot: snapshot,
    remove: remove,
    restore: restore,
    removeAll: removeAll,
    materializeScene: materializeScene,
    materializeAll: materializeAll,
    countScene: countScene,
    pendingCount: pendingCount,
    freezeRebuild: freezeRebuild,
  };
})();
