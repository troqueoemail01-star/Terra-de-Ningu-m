/**
 * menu/settings.js
 * -------------------------------------------------
 * Tela de Configurações — aberta a partir do botão "CONFIGURAÇÕES"
 * do menu principal (ver menu/menu.js).
 *
 * window.SettingsMenu.create(frame, { onBack }) monta o painel
 * (título + seções Áudio/Sensibilidade/Idioma + botão VOLTAR) DENTRO
 * do mesmo .main-menu-frame já usado pelo menu principal — por isso
 * este módulo não cria vídeo nem quadro próprios: o mesmo vídeo de
 * fundo em loop do menu principal continua tocando sem interrupção
 * por baixo do painel, exatamente como pedido (a tela deve parecer
 * uma continuação natural do menu, não uma tela separada).
 *
 * Cada controle já lê/escreve direto em window.GameSettings (ver
 * scripts/game-settings.js), então qualquer alteração vale na hora e
 * continua valendo enquanto o jogo estiver rodando.
 *
 * Idioma: por enquanto a troca entre Português-BR e English só salva
 * a escolha (window.GameSettings.setLanguage) — nenhum texto do jogo
 * muda de fato ainda, de propósito (ver README.md, seção "O que
 * ainda não existe"). O gancho para um futuro sistema de tradução é
 * justamente window.GameSettings.getLanguage(): quando os textos
 * traduzidos existirem, é só passar a lê-los a partir daí.
 * -------------------------------------------------
 */

window.SettingsMenu = (function () {
  function createSliderRow(labelText, getValue, setValue) {
    const row = document.createElement("div");
    row.className = "settings-row";

    const label = document.createElement("label");
    label.className = "settings-row-label";
    label.textContent = labelText;
    row.appendChild(label);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.step = "1";
    slider.className = "settings-slider";
    slider.value = String(getValue());
    slider.setAttribute("aria-label", labelText);

    // "input" (não "change"): aplica a cada movimento do dedo, não só
    // ao soltar — resposta imediata, do jeito que um slider de volume
    // costuma se comportar.
    slider.addEventListener("input", function () {
      setValue(Number(slider.value));
    });

    row.appendChild(slider);
    return row;
  }

  function createSection(titleText, rows) {
    const section = document.createElement("section");
    section.className = "settings-section";

    const title = document.createElement("h3");
    title.className = "settings-section-title";
    title.textContent = titleText;
    section.appendChild(title);

    rows.forEach(function (row) {
      section.appendChild(row);
    });

    return section;
  }

  function createLanguageSection() {
    const section = document.createElement("section");
    section.className = "settings-section";

    const title = document.createElement("h3");
    title.className = "settings-section-title";
    title.textContent = "Idioma";
    section.appendChild(title);

    const toggle = document.createElement("div");
    toggle.className = "settings-lang-toggle";

    const OPTIONS = [
      { value: "pt-BR", label: "Português-BR" },
      { value: "en", label: "English" },
    ];

    const buttons = OPTIONS.map(function (opt) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "settings-lang-option";
      btn.textContent = opt.label;
      btn.dataset.lang = opt.value;
      toggle.appendChild(btn);
      return btn;
    });

    function refreshActive() {
      const current = window.GameSettings.getLanguage();
      buttons.forEach(function (btn) {
        btn.classList.toggle(
          "settings-lang-option-active",
          btn.dataset.lang === current
        );
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.GameSettings.setLanguage(btn.dataset.lang);
        refreshActive();
      });
    });

    refreshActive();
    section.appendChild(toggle);
    return section;
  }

  /**
   * @param {HTMLElement} frame  o .main-menu-frame do menu principal
   * @param {{ onBack?: () => void }} options
   */
  function create(frame, options) {
    options = options || {};
    const onBack = options.onBack || function () {};

    const panel = document.createElement("div");
    panel.className = "settings-panel";

    const title = document.createElement("h2");
    title.className = "settings-title";
    title.textContent = "CONFIGURAÇÕES";
    panel.appendChild(title);

    const scroll = document.createElement("div");
    scroll.className = "settings-scroll";
    panel.appendChild(scroll);

    scroll.appendChild(
      createSection("Áudio", [
        createSliderRow(
          "Música",
          window.GameSettings.getMusicVolume,
          window.GameSettings.setMusicVolume
        ),
        createSliderRow(
          "Efeitos sonoros",
          window.GameSettings.getSfxVolume,
          window.GameSettings.setSfxVolume
        ),
      ])
    );

    scroll.appendChild(
      createSection("Sensibilidade", [
        createSliderRow(
          "Câmera",
          window.GameSettings.getCameraSensitivity,
          window.GameSettings.setCameraSensitivity
        ),
      ])
    );

    scroll.appendChild(createLanguageSection());

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "settings-back-button";
    backButton.textContent = "VOLTAR";
    // Impede que o toque no botão "vaze" para o vídeo/overlay por
    // baixo (mesmo cuidado já tomado em interface/hud.js).
    ["pointerdown", "pointermove", "pointerup"].forEach(function (evt) {
      backButton.addEventListener(evt, function (e) {
        e.stopPropagation();
      });
    });
    backButton.addEventListener("click", function () {
      onBack();
    });
    panel.appendChild(backButton);

    frame.appendChild(panel);

    function show() {
      panel.classList.add("settings-panel-visible");
    }

    function hide() {
      panel.classList.remove("settings-panel-visible");
    }

    return { show: show, hide: hide, element: panel };
  }

  return { create: create };
})();
