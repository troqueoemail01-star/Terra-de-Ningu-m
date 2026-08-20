/**
 * interface/hud.js
 * -------------------------------------------------
 * Toda a interface tocável do jogo:
 *  - Analógico virtual (movimento) — canto inferior esquerdo
 *  - Área de câmera (metade direita da tela, arrastar)
 *  - Botão "Interagir" — discreto, lado direito
 *  - Inventário — 4 slots vazios, parte inferior central
 *
 * Expõe window.HUD.getMoveVector() e
 * window.HUD.consumeLookDelta() para o resto do jogo ler,
 * sem que o resto do jogo precise saber nada sobre toque.
 * -------------------------------------------------
 */

window.HUD = (function () {
  let moveVector = { x: 0, y: 0 };
  let lookDelta = { x: 0, y: 0 };
  let interactHandler = null;
  let hudRoot = null;

  // Registra a função chamada quando o botão "Interagir" é tocado.
  // Mantém o HUD desacoplado da lógica de jogo: quem decide o que
  // "interagir" significa a cada momento (ex.: abrir/fechar uma
  // cortina) é o restante do jogo, não a interface.
  function setInteractHandler(handler) {
    interactHandler = handler;
  }

  function getMoveVector() {
    return moveVector;
  }

  // Lê e zera o delta acumulado (padrão "consumir" para não perder frames)
  function consumeLookDelta() {
    const d = lookDelta;
    lookDelta = { x: 0, y: 0 };
    return d;
  }

  function buildJoystick(container) {
    const base = document.createElement("div");
    base.className = "hud-joystick-base";
    const knob = document.createElement("div");
    knob.className = "hud-joystick-knob";
    base.appendChild(knob);
    container.appendChild(base);

    const RADIUS = 46; // raio de curso do analógico em px
    let activePointerId = null;
    let centerX = 0;
    let centerY = 0;

    function start(e) {
      if (activePointerId !== null) return;
      activePointerId = e.pointerId;
      const rect = base.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
      base.setPointerCapture(activePointerId);
      move(e);
    }

    function move(e) {
      if (e.pointerId !== activePointerId) return;
      let dx = e.clientX - centerX;
      let dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > RADIUS) {
        dx = (dx / dist) * RADIUS;
        dy = (dy / dist) * RADIUS;
      }
      knob.style.transform = "translate(" + dx + "px, " + dy + "px)";
      moveVector = { x: dx / RADIUS, y: -dy / RADIUS };
    }

    function end(e) {
      if (e.pointerId !== activePointerId) return;
      activePointerId = null;
      knob.style.transform = "translate(0px, 0px)";
      moveVector = { x: 0, y: 0 };
    }

    base.addEventListener("pointerdown", start);
    base.addEventListener("pointermove", move);
    base.addEventListener("pointerup", end);
    base.addEventListener("pointercancel", end);
  }

  function buildLookZone(container) {
    const zone = document.createElement("div");
    zone.className = "hud-look-zone";
    container.appendChild(zone);

    let activePointerId = null;
    let lastX = 0;
    let lastY = 0;

    zone.addEventListener("pointerdown", function (e) {
      if (activePointerId !== null) return;
      activePointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      zone.setPointerCapture(activePointerId);
    });

    zone.addEventListener("pointermove", function (e) {
      if (e.pointerId !== activePointerId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      lookDelta.x += dx;
      lookDelta.y += dy;
    });

    function release(e) {
      if (e.pointerId !== activePointerId) return;
      activePointerId = null;
    }
    zone.addEventListener("pointerup", release);
    zone.addEventListener("pointercancel", release);

    return zone;
  }

  function buildInteractButton(container) {
    const button = document.createElement("button");
    button.className = "hud-interact-button";
    button.type = "button";
    button.textContent = "Interagir";

    // Impede que tocar no botão também gire a câmera
    // (o botão fica dentro da metade direita da tela).
    ["pointerdown", "pointermove", "pointerup"].forEach(function (evt) {
      button.addEventListener(evt, function (e) {
        e.stopPropagation();
      });
    });

    button.addEventListener("click", function () {
      if (interactHandler) {
        interactHandler();
      }
    });

    container.appendChild(button);
  }

  // Pontinho discreto no centro da tela: representa a mira do jogador,
  // usada pelo InteractionSystem para saber qual objeto está sendo
  // encarado. Puramente visual — não recebe toque nenhum.
  function buildCrosshair(container) {
    const dot = document.createElement("div");
    dot.className = "hud-crosshair";
    container.appendChild(dot);
  }

  // A barra continua nascendo aqui (posicao, quantidade de slots e
  // aparencia sao coisa do HUD), mas quem cuida do CONTEUDO dela
  // agora e window.Inventory (ver interface/inventory.js): itens
  // guardados, icones e o toque em cada slot. Sem o modulo de
  // inventario carregado, cai no comportamento antigo (4 quadradinhos
  // decorativos), exatamente como era antes.
  function buildInventory(container) {
    const bar = document.createElement("div");
    bar.className = "hud-inventory";

    if (window.Inventory && typeof window.Inventory.mount === "function") {
      window.Inventory.mount(bar);
    } else {
      for (let i = 0; i < 4; i++) {
        const slot = document.createElement("div");
        slot.className = "hud-inventory-slot";
        bar.appendChild(slot);
      }
    }

    container.appendChild(bar);
  }

  function init(container) {
    // Todo o HUD fica dentro de um wrapper próprio, para poder ser
    // escondido/mostrado de uma vez só (ver setVisible) sem afetar o
    // posicionamento absoluto de cada elemento (o wrapper em si não
    // recebe "position", então continua transparente pra isso).
    const root = document.createElement("div");
    root.className = "hud-root";
    container.appendChild(root);

    buildLookZone(root); // primeiro, para ficar embaixo dos demais elementos
    buildCrosshair(root);
    buildJoystick(root);
    buildInteractButton(root);
    buildInventory(root);

    hudRoot = root;
  }

  // Esconde ou mostra toda a interface tocável de uma vez (analógico,
  // área de câmera, botão Interagir, inventário, mira). Escondido, um
  // elemento também para de receber toque — usado por cutscenes em
  // engine (ex.: cutscenes/entry-sequence.js) para garantir que nada
  // do HUD apareça nem responda a toque enquanto o jogador não tem
  // controle do personagem.
  function setVisible(visible) {
    if (!hudRoot) return;
    hudRoot.classList.toggle("hud-hidden", !visible);
  }

  return {
    init: init,
    getMoveVector: getMoveVector,
    consumeLookDelta: consumeLookDelta,
    setInteractHandler: setInteractHandler,
    setVisible: setVisible,
  };
})();
