/**
 * editor/editor-widgets.js
 * -------------------------------------------------
 * PEÇAS DE INTERFACE REAPROVEITÁVEIS DO EDITOR.
 *
 * Todo controle do Editor sai daqui: seção retrátil, campo numérico,
 * slider, chave liga/desliga, cor, lista suspensa e botão. Concentrar
 * isso em um arquivo só é o que mantém a interface CONSISTENTE (mesmo
 * tamanho de toque, mesmo espaçamento, mesmo comportamento) e o que
 * permite acrescentar ferramentas novas depois sem reinventar
 * componente nenhum.
 *
 * Detalhe pensado para celular: o campo numérico tem TRÊS formas de
 * mexer no mesmo valor —
 *   - arrastar a letra do eixo para os lados (ajuste fino contínuo);
 *   - tocar em − / + (passo exato);
 *   - digitar direto no campo (valor preciso).
 *
 * `onChange(valor, commit)`: `commit=false` enquanto o dedo ainda
 * está arrastando (só atualiza a cena, sem gravar no histórico) e
 * `commit=true` no fim do gesto (aí sim vira uma etapa de desfazer).
 * -------------------------------------------------
 */

window.EditorWidgets = (function () {
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function clamp(value, min, max) {
    if (min !== undefined && min !== null && value < min) return min;
    if (max !== undefined && max !== null && value > max) return max;
    return value;
  }

  function format(value, precision) {
    const p = precision === undefined ? 3 : precision;
    if (!isFinite(value)) return "0";
    const fixed = value.toFixed(p);
    // Tira zeros à direita para o campo não virar "1.000000".
    return fixed.replace(/\.?0+$/, "") || "0";
  }

  function button(label, options) {
    const opts = options || {};
    const node = el("button", "editor-btn" + (opts.small ? " editor-btn-sm" : ""), label);
    node.type = "button";
    if (opts.variant) node.classList.add("is-" + opts.variant);
    if (opts.title) node.title = opts.title;
    if (opts.onClick) {
      node.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        opts.onClick(node);
      });
    }
    return node;
  }

  /** Seção retrátil — é o que evita a tela cheia de controle solto. */
  function section(title, options) {
    const opts = options || {};
    const root = el("div", "editor-section");
    const head = el("button", "editor-section-head");
    head.type = "button";
    head.appendChild(el("span", null, title));
    const caret = el("span", "editor-caret", "▾");
    head.appendChild(caret);
    const body = el("div", "editor-section-body");
    root.appendChild(head);
    root.appendChild(body);

    let open = opts.open === undefined ? true : !!opts.open;
    function apply() {
      root.classList.toggle("is-collapsed", !open);
      caret.textContent = open ? "▾" : "▸";
    }
    apply();

    head.addEventListener("click", function () {
      open = !open;
      apply();
    });

    return {
      root: root,
      body: body,
      setOpen: function (value) {
        open = !!value;
        apply();
      },
    };
  }

  /**
   * Campo numérico com eixo arrastável.
   * opts: { axis, label, value, step, scrub, min, max, precision, onChange }
   */
  function numberField(opts) {
    const step = opts.step === undefined ? 0.05 : opts.step;
    const perPixel = opts.scrub === undefined ? step * 0.5 : opts.scrub;
    const precision = opts.precision === undefined ? 3 : opts.precision;

    const root = el("div", "editor-field");
    if (opts.label) {
      root.appendChild(el("div", "editor-field-label", opts.label));
    }
    const row = el("div", "editor-field-row");
    root.appendChild(row);

    const axisKey = String(opts.axis || "").toLowerCase();
    const axis = el(
      "div",
      "editor-axis" + (axisKey ? " axis-" + axisKey : ""),
      opts.axis || "·"
    );
    const minus = el("button", "editor-step", "−");
    minus.type = "button";
    const input = el("input", "editor-number");
    input.type = "text";
    input.inputMode = "decimal";
    const plus = el("button", "editor-step", "+");
    plus.type = "button";

    row.appendChild(axis);
    row.appendChild(minus);
    row.appendChild(input);
    row.appendChild(plus);

    let value = opts.value || 0;
    let silent = false;

    function render() {
      silent = true;
      input.value = format(value, precision);
      silent = false;
    }

    function emit(next, commit) {
      value = clamp(next, opts.min, opts.max);
      render();
      if (opts.onChange) opts.onChange(value, commit);
    }

    render();

    minus.addEventListener("click", function () {
      emit(value - step, true);
    });
    plus.addEventListener("click", function () {
      emit(value + step, true);
    });

    input.addEventListener("change", function () {
      if (silent) return;
      const parsed = parseFloat(String(input.value).replace(",", "."));
      if (isNaN(parsed)) {
        render();
        return;
      }
      emit(parsed, true);
    });
    input.addEventListener("blur", render);

    // ---------- Arrastar a letra do eixo ----------
    let scrubbing = false;
    let startX = 0;
    let startValue = 0;
    let pointerId = null;

    axis.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      scrubbing = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startValue = value;
      axis.classList.add("is-scrubbing");
      if (axis.setPointerCapture) axis.setPointerCapture(pointerId);
    });

    axis.addEventListener("pointermove", function (event) {
      if (!scrubbing || event.pointerId !== pointerId) return;
      event.preventDefault();
      emit(startValue + (event.clientX - startX) * perPixel, false);
    });

    function endScrub(event) {
      if (!scrubbing || (event && event.pointerId !== pointerId)) return;
      scrubbing = false;
      axis.classList.remove("is-scrubbing");
      if (opts.onChange) opts.onChange(value, true);
    }

    axis.addEventListener("pointerup", endScrub);
    axis.addEventListener("pointercancel", endScrub);

    return {
      root: root,
      set: function (next) {
        if (scrubbing) return;
        value = next;
        render();
      },
      get: function () {
        return value;
      },
    };
  }

  /** Slider com valor numérico ao lado. */
  function sliderField(opts) {
    const root = el("div", "editor-field");
    const head = el("div", "editor-field-row");
    head.appendChild(el("div", "editor-field-label", opts.label));
    const tag = el("div", "editor-value-tag");
    head.style.justifyContent = "space-between";
    head.appendChild(tag);
    root.appendChild(head);

    const input = el("input", "editor-slider");
    input.type = "range";
    input.min = opts.min;
    input.max = opts.max;
    input.step = opts.step === undefined ? 0.01 : opts.step;
    root.appendChild(input);

    let value = opts.value || 0;

    function render() {
      input.value = value;
      tag.textContent = opts.format ? opts.format(value) : format(value, opts.precision);
    }
    render();

    input.addEventListener("input", function () {
      value = parseFloat(input.value);
      tag.textContent = opts.format ? opts.format(value) : format(value, opts.precision);
      if (opts.onChange) opts.onChange(value, false);
    });
    input.addEventListener("change", function () {
      value = parseFloat(input.value);
      render();
      if (opts.onChange) opts.onChange(value, true);
    });

    return {
      root: root,
      set: function (next) {
        value = next;
        render();
      },
    };
  }

  function toggleField(opts) {
    const root = el("div", "editor-toggle");
    root.appendChild(el("div", "editor-field-label", opts.label));
    const track = el("div", "editor-toggle-track");
    track.appendChild(el("div", "editor-toggle-knob"));
    root.appendChild(track);

    let value = !!opts.value;
    function render() {
      root.classList.toggle("is-on", value);
    }
    render();

    root.addEventListener("click", function () {
      value = !value;
      render();
      if (opts.onChange) opts.onChange(value, true);
    });

    return {
      root: root,
      set: function (next) {
        value = !!next;
        render();
      },
      get: function () {
        return value;
      },
    };
  }

  function colorField(opts) {
    const root = el("div", "editor-field-row");
    root.style.justifyContent = "space-between";
    root.appendChild(el("div", "editor-field-label", opts.label));
    const input = el("input", "editor-color");
    input.type = "color";
    input.value = opts.value || "#ffffff";
    root.appendChild(input);

    input.addEventListener("input", function () {
      if (opts.onChange) opts.onChange(input.value, false);
    });
    input.addEventListener("change", function () {
      if (opts.onChange) opts.onChange(input.value, true);
    });

    return {
      root: root,
      set: function (next) {
        input.value = next;
      },
    };
  }

  function selectField(opts) {
    const root = el("div", "editor-field-row");
    root.appendChild(el("div", "editor-field-label", opts.label));
    const select = el("select", "editor-select");
    (opts.options || []).forEach(function (option) {
      const node = el("option", null, option.label);
      node.value = option.value;
      select.appendChild(node);
    });
    select.value = opts.value;
    root.appendChild(select);

    select.addEventListener("change", function () {
      if (opts.onChange) opts.onChange(select.value, true);
    });

    return {
      root: root,
      set: function (next) {
        select.value = next;
      },
    };
  }

  function buttonRow(buttons) {
    const row = el("div", "editor-field-row");
    row.style.flexWrap = "wrap";
    buttons.forEach(function (config) {
      if (!config) return;
      const node = button(config.label, config);
      node.style.flex = config.flex === undefined ? "1" : config.flex;
      row.appendChild(node);
    });
    return row;
  }

  return {
    el: el,
    format: format,
    clamp: clamp,
    button: button,
    section: section,
    numberField: numberField,
    sliderField: sliderField,
    toggleField: toggleField,
    colorField: colorField,
    selectField: selectField,
    buttonRow: buttonRow,
  };
})();
