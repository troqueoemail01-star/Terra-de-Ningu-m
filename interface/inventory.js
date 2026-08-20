/**
 * interface/inventory.js
 * -------------------------------------------------
 * Inventario do jogador: os MESMOS 4 slots que ja existiam na parte
 * inferior central do HUD (ver interface/hud.js -> buildInventory e o
 * bloco "Inventario" de interface/hud.css), agora com conteudo de
 * verdade em vez de quadradinhos puramente decorativos.
 *
 * Nao cria barra propria, nao cria posicionamento proprio e nao sabe
 * nada sobre a historia: recebe a barra ja montada pelo HUD
 * (`mount`), preenche os slots conforme itens vao entrando (`add`) e
 * avisa quem registrou o item quando o jogador toca nele
 * (`onSelect`). Quem decide o que "selecionar um item" significa e
 * scripts/main.js — hoje, equipar/desequipar a carta do Ravi na mao
 * direita (ver scripts/hand-item.js).
 *
 * Como o inventario vive dentro de `.hud-root`, ele ja some junto com
 * o resto do HUD durante dialogos, cutscenes e pop-ups (regra fixa de
 * dialogue/dialogue-box.js e interface/popup.js) sem precisar de
 * nenhuma linha a mais aqui.
 *
 * Uso:
 *   window.Inventory.mount(barraDoHud);          // chamado pelo HUD
 *   window.Inventory.add({ id, nome, icone, aoSelecionar });
 *   window.Inventory.setSelected("carta-ravi", true);
 *   window.Inventory.has("carta-ravi");
 * -------------------------------------------------
 */

window.Inventory = (function () {
  // Mesma quantidade de slots que o HUD sempre teve — o inventario
  // nunca cresce sozinho nem muda de tamanho na tela.
  const SLOT_COUNT = 4;

  let slots = [];   // elementos DOM de cada slot, na ordem da barra
  let entries = []; // item guardado em cada slot (null = slot vazio)

  // Impede que o toque no slot vire arrasto de camera: o inventario
  // fica na metade de baixo da tela, mas a area de olhar do HUD cobre
  // a metade direita inteira (ver .hud-look-zone em interface/hud.css)
  // — mesmo cuidado que o botao "Interagir" ja tomava.
  function swallowPointer(el) {
    ["pointerdown", "pointermove", "pointerup"].forEach(function (evt) {
      el.addEventListener(evt, function (e) {
        e.stopPropagation();
      });
    });
  }

  // Aplica a imagem do icone com um plano B para o caso de o PNG nao
  // poder ser carregado (jogo aberto em file://, arquivo ausente): o
  // mesmo pacote base64 que a carta 3D ja usa como reserva
  // (assets/nota-textura-embutida.js, ver models/paper-note-factory.js
  // -> garantirEmbutidas). Nada de icone quebrado na tela.
  function applyIcon(el, url, embeddedKey) {
    if (!url) return;
    const probe = new Image();
    probe.onload = function () {
      el.style.backgroundImage = 'url("' + url + '")';
    };
    probe.onerror = function () {
      const pack = window.PaperNoteTexturasEmbutidas;
      if (pack && embeddedKey && pack[embeddedKey]) {
        el.style.backgroundImage = 'url("' + pack[embeddedKey] + '")';
      }
    };
    probe.src = url;
  }

  function indexOfId(id) {
    for (let i = 0; i < entries.length; i++) {
      if (entries[i] && entries[i].id === id) {
        return i;
      }
    }
    return -1;
  }

  // Monta os 4 slots dentro da barra criada pelo HUD. Chamado uma
  // unica vez, no HUD.init.
  function mount(bar) {
    slots = [];
    entries = [];
    bar.innerHTML = "";

    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "hud-inventory-slot";
      swallowPointer(slot);

      (function (index) {
        slot.addEventListener("click", function () {
          const entry = entries[index];
          if (entry && typeof entry.aoSelecionar === "function") {
            entry.aoSelecionar(entry);
          }
        });
      })(i);

      bar.appendChild(slot);
      slots.push(slot);
      entries.push(null);
    }
  }

  // Guarda um item no primeiro slot livre. Devolve o indice usado, ou
  // -1 se o inventario estiver cheio (hoje impossivel: so existe um
  // item no jogo inteiro).
  function add(item) {
    if (!item || indexOfId(item.id) !== -1) {
      return -1;
    }
    const index = entries.indexOf(null);
    if (index === -1) {
      return -1;
    }

    entries[index] = item;

    const slot = slots[index];
    slot.classList.add("hud-inventory-slot-filled");
    slot.setAttribute("aria-label", item.nome || "");

    const icon = document.createElement("span");
    icon.className = "hud-inventory-icon";
    applyIcon(icon, item.icone, item.iconeEmbutido);
    slot.appendChild(icon);

    // Brilho curto de "item novo": so pra o jogador perceber que algo
    // entrou no inventario, sem nenhum aviso escrito na tela.
    slot.classList.add("hud-inventory-slot-new");
    setTimeout(function () {
      slot.classList.remove("hud-inventory-slot-new");
    }, 1200);

    return index;
  }

  // Marca/desmarca visualmente um item como "em uso" (hoje: a carta
  // equipada na mao direita).
  function setSelected(id, selected) {
    const index = indexOfId(id);
    if (index === -1) return;
    slots[index].classList.toggle("hud-inventory-slot-active", !!selected);
  }

  function has(id) {
    return indexOfId(id) !== -1;
  }

  return {
    mount: mount,
    add: add,
    setSelected: setSelected,
    has: has,
    applyIcon: applyIcon,
  };
})();
