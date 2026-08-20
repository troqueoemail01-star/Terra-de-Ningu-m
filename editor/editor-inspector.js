/**
 * editor/editor-inspector.js
 * -------------------------------------------------
 * PAINEL DA DIREITA — propriedades do objeto selecionado.
 *
 * Regra central: SÓ APARECE O QUE FAZ SENTIDO para o objeto
 * selecionado. Um vaso não mostra intensidade de luz; um PointLight
 * não mostra textura; um grupo sem malha não mostra material. Isso é
 * decidido lendo o próprio objeto Three.js (obj.isLight, obj.isMesh,
 * a existência de `roughness`/`distance`/`penumbra` no material ou na
 * luz), e não por uma lista fixa escrita à mão — então objeto novo
 * que o jogo ganhar no futuro já cai na regra certa sozinho.
 *
 * Tudo em seções que abrem e fecham: em pé, no celular, você vê uma
 * seção por vez em vez de trinta controles empilhados.
 * -------------------------------------------------
 */

window.EditorInspector = (function () {
  const W = window.EditorWidgets;
  const TO_DEG = 180 / Math.PI;
  const TO_RAD = Math.PI / 180;

  const SIDE_OPTIONS = [
    { value: String(THREE.FrontSide), label: "Frente" },
    { value: String(THREE.BackSide), label: "Trás" },
    { value: String(THREE.DoubleSide), label: "Ambos" },
  ];

  function firstMaterial(entry) {
    const material = entry.object.material;
    if (!material) return null;
    return Array.isArray(material) ? material[0] || null : material;
  }

  function hex(color) {
    return "#" + color.getHexString();
  }

  function create(api) {
    const root = W.el("div", "editor-panel editor-panel-right");

    const head = W.el("div", "editor-panel-head");
    const title = W.el("div", "editor-panel-title", "PROPRIEDADES");
    head.appendChild(title);
    head.appendChild(
      W.button("✕", {
        small: true,
        title: "Fechar painel",
        onClick: function () {
          api.togglePanel("right", false);
        },
      })
    );
    root.appendChild(head);

    const body = W.el("div", "editor-panel-body");
    root.appendChild(body);

    let entry = null;
    let fields = {};
    let uniformScale = true;

    // ---------- Construção ----------

    function setEntry(next) {
      entry = next || null;
      build();
    }

    function build() {
      body.innerHTML = "";
      fields = {};

      if (!entry) {
        title.textContent = "PROPRIEDADES";
        const empty = W.el(
          "div",
          "editor-empty",
          "Nenhum objeto selecionado.\n\nToque em algo no cenário ou escolha na hierarquia."
        );
        empty.style.whiteSpace = "pre-line";
        body.appendChild(empty);
        return;
      }

      title.textContent = entry.label;

      buildIdentity();
      if (entry.isClone) buildClone();

      // Objeto EXCLUÍDO não está na cena: posição, luz, material e
      // interação dele não têm onde aparecer. O painel fica com o que
      // importa nesse momento - o que ele é e como trazer ele de volta.
      if (api.isRemoved(entry)) {
        buildSavedData();
        return;
      }

      buildTransform();
      if (entry.isLight) buildLight();
      if (entry.isMesh && firstMaterial(entry)) buildMaterial();
      if (entry.interactable) buildInteraction();
      buildSavedData();
    }

    // ---------- Identidade ----------

    function buildIdentity() {
      const box = W.section("OBJETO", { open: true });

      const name = W.el("div", null, entry.label);
      name.style.fontSize = "3.4vmin";
      name.style.color = "#f4efdf";
      box.body.appendChild(name);

      box.body.appendChild(W.el("div", "editor-mono", "id: " + entry.id));
      box.body.appendChild(
        W.el("div", "editor-mono", "tipo: " + entry.object.type + (entry.kind ? " · " + entry.kind : ""))
      );

      // ---------- Excluído ----------
      // Estado, e não um botão escondido: quem abriu o painel de um
      // objeto que sumiu da tela entende na primeira linha por que ele
      // sumiu, e o caminho de volta está ali mesmo.
      if (api.isRemoved(entry)) {
        const own = api.isRemovedSelf(entry);
        box.body.appendChild(
          W.el(
            "div",
            "editor-note is-warn",
            own
              ? "✕ EXCLUÍDO do cenário. Ele não é desenhado, não pode ser tocado e também não existe mais para o jogador quando você SALVAR. A colisão dele sai junto — e volta se você restaurar."
              : "✕ Está DENTRO de um objeto excluído, então saiu junto. Restaure o objeto de fora para ele voltar."
          )
        );
        if (own) {
          box.body.appendChild(
            W.buttonRow([
              {
                label: "Restaurar no cenário",
                variant: "primary",
                onClick: function () {
                  api.restoreEntry(entry);
                },
              },
            ])
          );
        }
        body.appendChild(box.root);
        return;
      }

      fields.visible = W.toggleField({
        label: "Visível",
        value: entry.object.visible,
        onChange: function (value) {
          api.setVisible(entry, value);
        },
      });
      box.body.appendChild(fields.visible.root);

      box.body.appendChild(
        W.buttonRow([
          {
            label: "Focar",
            onClick: function () {
              api.focusEntry(entry);
            },
          },
          {
            label: "Duplicar",
            onClick: function () {
              api.duplicateSelection();
            },
          },
          {
            label: "Resetar",
            variant: "danger",
            onClick: function () {
              api.confirm({
                title: "Resetar objeto",
                text: "Devolver \"" + entry.label + "\" aos valores originais do jogo?",
                confirmLabel: "RESETAR",
                onConfirm: function () {
                  api.resetEntry(entry);
                },
              });
            },
          },
        ])
      );

      // Em linha própria, e não encostado em "Resetar": os dois são
      // vermelhos e fazem coisas bem diferentes. Ocultar continua logo
      // acima, na chave Visível, para quem quer só tirar da vista.
      // Cópia inteira já tem o EXCLUIR dela na seção CÓPIA, logo abaixo:
      // dois botões vermelhos com o mesmo destino só dariam medo.
      if (!entry.isCloneRoot) {
        box.body.appendChild(
          W.buttonRow([
            {
              label: "Excluir do cenário",
              variant: "danger",
              onClick: function () {
                api.requestDelete(entry);
              },
            },
          ])
        );
      }

      body.appendChild(box.root);
    }

    // ---------- Cópia ----------
    // Só aparece em objeto que o Editor criou. É também o único lugar
    // com EXCLUIR: objeto do jogo não se apaga, se esconde (Visível).

    function buildClone() {
      const box = W.section("CÓPIA", { open: true });

      box.body.appendChild(W.el("div", "editor-mono", "cópia de: " + entry.cloneOf));

      if (!entry.isCloneRoot) {
        box.body.appendChild(
          W.el(
            "div",
            "editor-note",
            "Esta é uma peça DENTRO de uma cópia. Ela pode ser editada e excluída por conta própria (Excluir do cenário, na seção acima); “Excluir cópia” aqui embaixo tira a cópia INTEIRA."
          )
        );
      }

      box.body.appendChild(
        W.el(
          "div",
          "editor-note",
          "A cópia nasce igual ao original (posição, rotação, escala, material e textura) e a partir daí vive por conta própria: editar uma não mexe na outra. Ela ganha a colisão do original, do mesmo tamanho, e essa colisão acompanha a cópia quando você move, gira ou redimensiona. Ela é cenário — o que ela não ganha é interação própria, então a cópia de uma porta não abre."
        )
      );

      box.body.appendChild(
        W.buttonRow([
          {
            label: "Duplicar de novo",
            onClick: function () {
              api.duplicateSelection();
            },
          },
          {
            label: "Excluir cópia",
            variant: "danger",
            onClick: function () {
              api.confirm({
                title: "Excluir cópia",
                text:
                  "Tirar \"" +
                  entry.label +
                  "\" do cenário? A cópia e as alterações dela são apagadas (dá para desfazer).",
                confirmLabel: "EXCLUIR",
                onConfirm: function () {
                  api.deleteClone(entry);
                },
              });
            },
          },
        ])
      );

      body.appendChild(box.root);
    }

    // ---------- Transformação ----------

    function transformGroup(kind, label, options) {
      const opts = options || {};
      const wrap = W.el("div", "editor-field");
      wrap.appendChild(W.el("div", "editor-field-label", label));
      fields[kind] = {};

      ["x", "y", "z"].forEach(function (axis) {
        const field = W.numberField({
          axis: axis.toUpperCase(),
          value: opts.read(axis),
          step: opts.step,
          scrub: opts.scrub,
          min: opts.min,
          precision: opts.precision,
          onChange: function (value, commit) {
            opts.write(axis, value, commit);
          },
        });
        fields[kind][axis] = field;
        wrap.appendChild(field.root);
      });

      return wrap;
    }

    function buildTransform() {
      const box = W.section("TRANSFORMAR", { open: true });
      const obj = entry.object;

      box.body.appendChild(
        transformGroup("position", "Posição", {
          step: 0.05,
          scrub: 0.012,
          precision: 3,
          read: function (axis) {
            return obj.position[axis];
          },
          write: function (axis, value, commit) {
            api.setTransform(entry, "position", axis, value, commit);
          },
        })
      );

      box.body.appendChild(
        transformGroup("rotation", "Rotação (graus)", {
          step: 5,
          scrub: 0.6,
          precision: 1,
          read: function (axis) {
            return obj.rotation[axis] * TO_DEG;
          },
          write: function (axis, value, commit) {
            api.setTransform(entry, "rotation", axis, value * TO_RAD, commit);
          },
        })
      );

      fields.uniform = W.toggleField({
        label: "Escala uniforme",
        value: uniformScale,
        onChange: function (value) {
          uniformScale = value;
        },
      });
      box.body.appendChild(fields.uniform.root);

      box.body.appendChild(
        transformGroup("scale", "Escala", {
          step: 0.05,
          scrub: 0.01,
          min: 0.001,
          precision: 3,
          read: function (axis) {
            return obj.scale[axis];
          },
          write: function (axis, value, commit) {
            if (uniformScale) {
              const base = obj.scale[axis];
              const factor = base !== 0 ? value / base : 1;
              api.setScaleUniform(entry, axis, value, factor, commit);
            } else {
              api.setTransform(entry, "scale", axis, value, commit);
            }
            refreshValues();
          },
        })
      );

      box.body.appendChild(
        W.buttonRow([
          {
            label: "Rot. 0",
            small: true,
            onClick: function () {
              api.setTransform(entry, "rotation", "x", 0, false);
              api.setTransform(entry, "rotation", "y", 0, false);
              api.setTransform(entry, "rotation", "z", 0, true);
              refreshValues();
            },
          },
          {
            label: "Escala 1",
            small: true,
            onClick: function () {
              api.setTransform(entry, "scale", "x", 1, false);
              api.setTransform(entry, "scale", "y", 1, false);
              api.setTransform(entry, "scale", "z", 1, true);
              refreshValues();
            },
          },
          {
            label: "Original",
            small: true,
            onClick: function () {
              api.resetTransform(entry);
              refreshValues();
            },
          },
        ])
      );

      body.appendChild(box.root);
    }

    // ---------- Luz ----------

    function buildLight() {
      const light = entry.object;
      const original = entry.original.light || {};
      const box = W.section("LUZ", { open: true });

      box.body.appendChild(W.el("div", "editor-mono", "tipo: " + light.type));

      fields.lightOn = W.toggleField({
        label: "Ligada",
        value: light.visible,
        onChange: function (value) {
          api.setVisible(entry, value);
        },
      });
      box.body.appendChild(fields.lightOn.root);

      fields.intensity = W.sliderField({
        label: "Intensidade",
        value: light.intensity,
        min: 0,
        max: Math.max(3, (original.intensity || 1) * 4),
        step: 0.01,
        precision: 2,
        onChange: function (value, commit) {
          api.setLight(entry, "intensity", value, commit);
        },
      });
      box.body.appendChild(fields.intensity.root);

      if (light.distance !== undefined) {
        fields.distance = W.sliderField({
          label: "Alcance",
          value: light.distance,
          min: 0,
          max: Math.max(30, (original.distance || 10) * 3),
          step: 0.1,
          precision: 1,
          onChange: function (value, commit) {
            api.setLight(entry, "distance", value, commit);
          },
        });
        box.body.appendChild(fields.distance.root);
      }

      if (light.decay !== undefined) {
        fields.decay = W.sliderField({
          label: "Decaimento",
          value: light.decay,
          min: 0,
          max: 4,
          step: 0.05,
          precision: 2,
          onChange: function (value, commit) {
            api.setLight(entry, "decay", value, commit);
          },
        });
        box.body.appendChild(fields.decay.root);
      }

      if (light.angle !== undefined) {
        fields.angle = W.sliderField({
          label: "Ângulo (graus)",
          value: light.angle * TO_DEG,
          min: 1,
          max: 89,
          step: 0.5,
          precision: 1,
          onChange: function (value, commit) {
            api.setLight(entry, "angle", value * TO_RAD, commit);
          },
        });
        box.body.appendChild(fields.angle.root);
      }

      if (light.penumbra !== undefined) {
        fields.penumbra = W.sliderField({
          label: "Penumbra",
          value: light.penumbra,
          min: 0,
          max: 1,
          step: 0.01,
          precision: 2,
          onChange: function (value, commit) {
            api.setLight(entry, "penumbra", value, commit);
          },
        });
        box.body.appendChild(fields.penumbra.root);
      }

      fields.lightColor = W.colorField({
        label: "Cor",
        value: hex(light.color),
        onChange: function (value, commit) {
          api.setLight(entry, "color", value, commit);
        },
      });
      box.body.appendChild(fields.lightColor.root);

      body.appendChild(box.root);
    }

    // ---------- Material / textura ----------

    function buildMaterial() {
      const material = firstMaterial(entry);
      const box = W.section("MATERIAL", { open: false });

      box.body.appendChild(
        W.el("div", "editor-mono", "material: " + material.type + (material.name ? " · " + material.name : ""))
      );

      if (material.color) {
        fields.color = W.colorField({
          label: "Cor",
          value: hex(material.color),
          onChange: function (value, commit) {
            api.setMaterial(entry, "color", value, commit);
          },
        });
        box.body.appendChild(fields.color.root);
      }

      fields.opacity = W.sliderField({
        label: "Opacidade",
        value: material.opacity,
        min: 0,
        max: 1,
        step: 0.01,
        precision: 2,
        onChange: function (value, commit) {
          api.setMaterial(entry, "opacity", value, commit);
        },
      });
      box.body.appendChild(fields.opacity.root);

      fields.transparent = W.toggleField({
        label: "Transparente",
        value: !!material.transparent,
        onChange: function (value) {
          api.setMaterial(entry, "transparent", value, true);
        },
      });
      box.body.appendChild(fields.transparent.root);

      if (material.roughness !== undefined) {
        fields.roughness = W.sliderField({
          label: "Rugosidade",
          value: material.roughness,
          min: 0,
          max: 1,
          step: 0.01,
          precision: 2,
          onChange: function (value, commit) {
            api.setMaterial(entry, "roughness", value, commit);
          },
        });
        box.body.appendChild(fields.roughness.root);
      }

      if (material.metalness !== undefined) {
        fields.metalness = W.sliderField({
          label: "Metalicidade",
          value: material.metalness,
          min: 0,
          max: 1,
          step: 0.01,
          precision: 2,
          onChange: function (value, commit) {
            api.setMaterial(entry, "metalness", value, commit);
          },
        });
        box.body.appendChild(fields.metalness.root);
      }

      if (material.emissive) {
        fields.emissive = W.colorField({
          label: "Emissivo",
          value: hex(material.emissive),
          onChange: function (value, commit) {
            api.setMaterial(entry, "emissive", value, commit);
          },
        });
        box.body.appendChild(fields.emissive.root);

        if (material.emissiveIntensity !== undefined) {
          fields.emissiveIntensity = W.sliderField({
            label: "Brilho emissivo",
            value: material.emissiveIntensity,
            min: 0,
            max: 4,
            step: 0.05,
            precision: 2,
            onChange: function (value, commit) {
              api.setMaterial(entry, "emissiveIntensity", value, commit);
            },
          });
          box.body.appendChild(fields.emissiveIntensity.root);
        }
      }

      fields.wireframe = W.toggleField({
        label: "Wireframe",
        value: !!material.wireframe,
        onChange: function (value) {
          api.setMaterial(entry, "wireframe", value, true);
        },
      });
      box.body.appendChild(fields.wireframe.root);

      fields.side = W.selectField({
        label: "Lados",
        value: String(material.side),
        options: SIDE_OPTIONS,
        onChange: function (value) {
          api.setMaterial(entry, "side", parseInt(value, 10), true);
        },
      });
      box.body.appendChild(fields.side.root);

      body.appendChild(box.root);

      // ---------- Textura ----------
      const texBox = W.section("TEXTURA", { open: false });
      const override = api.overrides.get(entry.sceneKey, entry.id) || {};
      const currentKey = override.material ? override.material.map : null;

      const grid = W.el("div", "editor-texture-grid");
      const originalButton = W.el(
        "button",
        "editor-texture-item" + (currentKey ? "" : " is-active"),
        "Original"
      );
      originalButton.type = "button";
      originalButton.addEventListener("click", function () {
        api.setTexture(entry, null);
        build();
      });
      grid.appendChild(originalButton);

      api.textures.list().forEach(function (item) {
        const node = W.el(
          "button",
          "editor-texture-item" + (currentKey === item.key ? " is-active" : ""),
          item.label
        );
        node.type = "button";
        node.addEventListener("click", function () {
          api.setTexture(entry, item.key);
          build();
        });
        grid.appendChild(node);
      });
      texBox.body.appendChild(grid);
      texBox.body.appendChild(
        W.el(
          "div",
          "editor-note",
          "As texturas listadas já estão carregadas pelo jogo. Ao editar o material, este objeto ganha uma cópia própria dele — o resto da cena continua com o material original."
        )
      );
      body.appendChild(texBox.root);
    }

    // ---------- Interação ----------

    function buildInteraction() {
      const box = W.section("INTERAÇÃO", { open: false });
      const item = entry.interactable;

      box.body.appendChild(W.el("div", "editor-mono", "id de jogo: " + item.id));
      box.body.appendChild(W.el("div", "editor-mono", "tipo: " + item.kind));

      fields.interaction = W.toggleField({
        label: "Interação ativa",
        value: api.isInteractionEnabled(entry),
        onChange: function (value) {
          api.setInteractionEnabled(entry, value);
        },
      });
      box.body.appendChild(fields.interaction.root);

      box.body.appendChild(
        W.el(
          "div",
          "editor-note",
          "Mover, girar, escalar e ocultar não quebram a lógica deste objeto: o jogo continua encontrando a porta, a janela ou a gaveta normalmente. Esta chave só desliga a interação durante a sessão atual do Editor (não é salva)."
        )
      );

      body.appendChild(box.root);
    }

    // ---------- O que está salvo ----------

    function describeOverride(override) {
      const parts = [];
      if (override.position) parts.push("posição");
      if (override.rotation) parts.push("rotação");
      if (override.scale) parts.push("escala");
      if (override.visible !== undefined) parts.push("visibilidade");
      if (override.light) parts.push("luz");
      if (override.material) parts.push("material/textura");
      if (override.removed) parts.push("excluído do cenário");
      return parts.length ? parts.join(", ") : "nenhuma";
    }

    function buildSavedData() {
      const override = api.overrides.get(entry.sceneKey, entry.id);
      const box = W.section("ALTERAÇÕES DESTE OBJETO", { open: false });

      box.body.appendChild(
        W.el("div", "editor-note", "Guardado como diferença do original: " + describeOverride(override || {}))
      );

      if (override) {
        const original = entry.original;
        box.body.appendChild(
          W.el(
            "div",
            "editor-mono",
            "original: " +
              original.position.map(function (v) { return Math.round(v * 1000) / 1000; }).join(", ")
          )
        );
        box.body.appendChild(
          W.buttonRow([
            {
              label: "Descartar alterações deste objeto",
              variant: "danger",
              onClick: function () {
                api.resetEntry(entry);
              },
            },
          ])
        );
      }

      body.appendChild(box.root);
    }

    // ---------- Atualização de valores (gizmo mexeu, desfazer, etc.) ----------

    function refreshValues() {
      if (!entry) return;
      const obj = entry.object;

      ["x", "y", "z"].forEach(function (axis) {
        if (fields.position) fields.position[axis].set(obj.position[axis]);
        if (fields.rotation) fields.rotation[axis].set(obj.rotation[axis] * TO_DEG);
        if (fields.scale) fields.scale[axis].set(obj.scale[axis]);
      });

      if (fields.visible) fields.visible.set(obj.visible);
      if (fields.lightOn) fields.lightOn.set(obj.visible);
      if (entry.isLight) {
        if (fields.intensity) fields.intensity.set(obj.intensity);
        if (fields.distance) fields.distance.set(obj.distance);
        if (fields.decay) fields.decay.set(obj.decay);
        if (fields.angle) fields.angle.set(obj.angle * TO_DEG);
        if (fields.penumbra) fields.penumbra.set(obj.penumbra);
        if (fields.lightColor) fields.lightColor.set(hex(obj.color));
      }

      const material = firstMaterial(entry);
      if (material) {
        if (fields.color && material.color) fields.color.set(hex(material.color));
        if (fields.opacity) fields.opacity.set(material.opacity);
        if (fields.transparent) fields.transparent.set(!!material.transparent);
        if (fields.roughness) fields.roughness.set(material.roughness);
        if (fields.metalness) fields.metalness.set(material.metalness);
        if (fields.emissive && material.emissive) fields.emissive.set(hex(material.emissive));
        if (fields.emissiveIntensity) fields.emissiveIntensity.set(material.emissiveIntensity);
        if (fields.wireframe) fields.wireframe.set(!!material.wireframe);
        if (fields.side) fields.side.set(String(material.side));
      }
    }

    return {
      root: root,
      setEntry: setEntry,
      rebuild: build,
      refreshValues: refreshValues,
      getEntry: function () {
        return entry;
      },
    };
  }

  return { create: create };
})();
