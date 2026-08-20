/**
 * editor/editor-registry.js
 * -------------------------------------------------
 * REGISTRO DE OBJETOS DO EDITOR — quem dá nome e identidade a
 * cada coisa que já existe na cena Three.js do jogo.
 *
 * Este arquivo NÃO cria nenhum objeto 3D, nenhuma cena e nenhum
 * renderer. Ele só varre os grupos que as cenas do jogo já
 * montaram (scenes/corridor-scene.js e scenes/room-scene.js) e,
 * para cada nó da árvore, guarda:
 *
 *   - um ID ESTÁVEL (ver "Como o id é montado" abaixo);
 *   - um NOME legível em português para a lista/hierarquia;
 *   - o VALOR ORIGINAL de tudo que o Editor pode mexer
 *     (posição, rotação, escala, visibilidade, luz, material) —
 *     capturado ANTES de qualquer alteração salva ser aplicada.
 *
 * É esse valor original que permite ao Editor salvar só o DELTA
 * (ver editor/editor-overrides.js) e restaurar o objeto ao estado
 * de fábrica a qualquer momento.
 *
 * ---------- Como o id é montado ----------
 *
 * 1. Objetos INTERATIVOS já têm id próprio no jogo ("porta-entrada",
 *    "janela-quarto", "mesa-telefone"...). Esses são usados direto:
 *    são os ids mais estáveis que existem no projeto.
 *      -> corredor / "mesa-telefone"
 *
 * 2. Objetos com `name` definido na fábrica (CeilingFan,
 *    SoccerBallPSX, Skybox...) usam o próprio nome.
 *      -> quarto / "ventilador-de-teto"
 *
 * 3. O resto ganha um id derivado de uma ASSINATURA do objeto
 *    (tipo + geometria + posição original + material + nº de
 *    filhos), e não da ordem em que apareceu na cena. Isso importa
 *    porque vários modelos .glb entram na cena de forma assíncrona:
 *    a ordem muda de execução para execução, a assinatura não.
 *      -> quarto / "malha-k3f9x2"
 *
 * O id de um filho é sempre "idDoPai/idDoFilho", então mover um
 * objeto inteiro de lugar no código não invalida os filhos dele.
 *
 * CÓPIAS (a ferramenta DUPLICAR — ver editor/editor-clones.js) entram
 * por adoptClone(): elas não inventam id nenhum e não refazem
 * assinatura. A cópia recebe um id próprio ("cama-copia") e cada peça
 * de dentro dela repete o id local da peça correspondente do original,
 * então "cama-copia/travesseiro" é estável entre execuções do mesmo
 * jeito que "cama/travesseiro". O valor ORIGINAL da cópia é o valor
 * original de fábrica do objeto copiado — não o estado em que ele
 * estava na hora da cópia. É isso que faz a cópia se comportar como
 * qualquer outro objeto: original + delta, sempre.
 *
 * Se, mesmo assim, uma atualização futura do jogo mudar o id de um
 * objeto, a alteração salva ainda tenta se encaixar pelo `hint`
 * gravado junto (nome + tipo + posição original — ver
 * resolveByHint). E se nada casar, a alteração é ignorada em
 * silêncio: nunca derruba o boot do jogo.
 * -------------------------------------------------
 */

window.EditorRegistry = (function () {
  // ---------- Dicionários de nome legível ----------

  const KIND_LABELS = {
    door: "Porta",
    window: "Janela",
    drawer: "Gaveta",
    phone: "Telefone",
    lightSwitch: "Interruptor",
    bed: "Cama",
    wardrobe: "Guarda-roupa",
    ball: "Bola",
    desk: "Escrivaninha",
    tv: "TV",
    lamp: "Abajur",
  };

  const NAME_LABELS = {
    ceilingfan: "Ventilador de teto",
    ceilingmount: "Suporte do ventilador",
    fanmotor: "Motor do ventilador",
    motorbody: "Corpo do motor",
    motorcap: "Tampa do motor",
    rod: "Haste",
    skybox: "Céu",
    // Varanda da entrada (ver models/porch-factory.js). As chaves sao o
    // `name` de cada malha, em minusculas.
    varanda: "Varanda",
    "varanda-alvenaria": "Varanda: piso, muro (varanda + alas) e pilares",
    "varanda-telha": "Varanda: telha",
    "varanda-madeiramento": "Varanda: vigas e arremates",
    "varanda-tapete-boas-vindas": "Tapete de boas-vindas",
    // As quatro pecas decorativas da varanda (modelos .glb enviados pelo
    // jogador - ver o bloco "Pecas decorativas da varanda" em
    // scenes/corridor-scene.js). CUIDADO: "Cadeira com roupas"
    // (chairpsx, mais abaixo) e a cadeira do MEU QUARTO, nao esta.
    porchplantpsx: "Planta da varanda",
    plant_psx: "Planta da varanda (malha)",
    plasticchairpsx: "Cadeira de plastico da varanda",
    cadeira_plastico: "Cadeira de plastico (malha)",
    barbecuegrillpsx: "Churrasqueira da varanda",
    churrasqueira_psx: "Churrasqueira (malha)",
    clotheslinepsx: "Varal com roupa",
    varal_roupa: "Varal com roupa (malha)",
    // As DOZE pecas do QUINTAL LATERAL DIREITO (modelos .glb enviados pelo
    // jogador - ver o bloco "Pecas decorativas da parede lateral direita"
    // em scenes/corridor-scene.js). CUIDADO: "Lixeira" (trashcanpsx) e a
    // lixeirinha de dentro do MEU QUARTO, nao a do quintal.
    dumpsterpsx: "Lixeira grande do quintal",
    dumpster_psx: "Lixeira grande do quintal (malha)",
    yardtrashcanpsx: "Lata de lixo do quintal",
    yard_trash_can_psx: "Lata de lixo do quintal (malha)",
    trashbagapsx: "Saco de lixo A",
    trash_bag_a_psx: "Saco de lixo A (malha)",
    trashbagbpsx: "Saco de lixo B",
    trash_bag_b_psx: "Saco de lixo B (malha)",
    trashbagcpsx: "Saco de lixo C",
    trash_bag_c_psx: "Saco de lixo C (malha)",
    dirtmoundpsx: "Montinho de terra",
    dirt_mound_psx: "Montinho de terra (malha)",
    fernpotpsx: "Vaso de samambaia",
    fern_pot_psx: "Vaso de samambaia (malha)",
    chickentoolpotpsx: "Galinha porta-ferramentas",
    chicken_toolpot_psx: "Galinha porta-ferramentas (malha)",
    woodpilepsx: "Pilha de lenha",
    woodpile_psx: "Pilha de lenha (malha)",
    branchespsx: "Gravetos e galhos",
    branches_psx: "Gravetos e galhos (malha)",
    axestumppsx: "Machado no toco",
    axe_stump_psx: "Machado no toco (malha)",
    powermeterpsx: "Medidor de energia",
    power_meter_psx: "Medidor de energia (malha)",
    // O carro do QUINTAL DOS FUNDOS (ver models/car-factory.js e o bloco
    // "Pecas decorativas do QUINTAL DOS FUNDOS" em
    // scenes/corridor-scene.js). "Carro" e o grupo inteiro - e nele que o
    // gizmo pega para mover, girar e escalar o carro todo; as sete linhas
    // seguintes sao as pecas de dentro do modelo, uteis para conferir uma
    // roda ou um espelho sem desmontar nada. CUIDADO: a cabine da cutscene
    // da estrada e outra coisa (CabineCarro, ver
    // models/car-interior-factory.js).
    carpsx: "Carro (Golf Mk4)",
    car_golf_mk4_psx: "Carro (malha)",
    car_body: "Carro: carroceria",
    car_mirror_l: "Carro: espelho esquerdo",
    car_mirror_r: "Carro: espelho direito",
    car_wheel_fl: "Carro: roda diant. esquerda",
    car_wheel_fr: "Carro: roda diant. direita",
    car_wheel_rl: "Carro: roda tras. esquerda",
    car_wheel_rr: "Carro: roda tras. direita",
    // O GALPAO do QUINTAL DOS FUNDOS (ver models/shed-factory.js). "Galpao" e
    // o grupo inteiro - e nele que o gizmo pega para mover, girar e escalar o
    // galpao todo; as linhas seguintes sao as pecas de dentro, uteis para
    // conferir uma parede ou o piso sem desmontar nada. As duas ultimas sao as
    // folhas da PORTA DO JOGO que substituiram as folhas de taboas do pacote.
    shedpsx: "Galpao (armazem PSX)",
    "galpao-casca": "Galpao: casca",
    "galpao-paredes-externas": "Galpao: paredes externas",
    "galpao-paredes-internas": "Galpao: paredes internas",
    "galpao-estrutura-madeira": "Galpao: pilares, frechal e batentes",
    "galpao-telhado-madeira": "Galpao: madeiramento do telhado",
    "galpao-telhas": "Galpao: telhas",
    "galpao-forro": "Galpao: forro do telhado",
    "galpao-piso-madeira": "Galpao: piso de madeira",
    "galpao-folha-esquerda": "Galpao: folha esquerda da porta",
    "galpao-folha-direita": "Galpao: folha direita da porta",
    // Quintal da frente: canteiros e pichacao (ver
    // models/flower-bed-factory.js e models/graffiti-factory.js).
    "flores-do-quintal": "Canteiros de flores do quintal",
    "canteiro-de-flores": "Canteiro: rosas e flores",
    "pichacao-fachada": "Pichacao da fachada",
    // As DOZE pecas decorativas novas de MEU QUARTO (modelos .glb enviados
    // pelo jogador - ver o bloco "Pecas decorativas soltas" em
    // scenes/room-scene.js e a lista RoomConfig.props em
    // scenes/room-config.js). A primeira linha de cada par e o GRUPO (e nele
    // que o gizmo pega para mover/girar/escalar a peca inteira); a segunda e a
    // malha de dentro do .glb. CUIDADO com os nomes parecidos: "Criado-mudo"
    // e o da cabeceira (nightstand), "Vaso de planta" e o da parede esquerda
    // (floorplantpsx), "Vaso de samambaia" e do quintal (fernpotpsx),
    // "Cadeira com roupas" e a do canto (chairpsx) e "Garrafa com copo" e a
    // da cozinha (bottleglasspsx).
    chesstablepsx: "Mesa de xadrez",
    chess_table_psx: "Mesa de xadrez (malha)",
    rockingchairpsx: "Cadeira de balanco",
    rocking_chair_psx: "Cadeira de balanco (malha)",
    plantbedpsx: "Canteiro de plantas",
    plant_bed_psx: "Canteiro de plantas (malha)",
    roundpotpsx: "Vaso oval de planta",
    round_pot_psx: "Vaso oval de planta (malha)",
    sidetablepsx: "Mesa de canto",
    side_table_psx: "Mesa de canto (malha)",
    taverntablepsx: "Mesa de taverna",
    tavern_table_psx: "Mesa de taverna (malha)",
    tavernbottle01psx: "Garrafa 1 da taverna (jarro baixo)",
    tavern_bottle_01_psx: "Garrafa 1 da taverna (jarro baixo) (malha)",
    tavernbottle02psx: "Garrafa 2 da taverna (garrafao)",
    tavern_bottle_02_psx: "Garrafa 2 da taverna (garrafao) (malha)",
    tavernbottle03psx: "Garrafa 3 da taverna (quadrada)",
    tavern_bottle_03_psx: "Garrafa 3 da taverna (quadrada) (malha)",
    tavernbottle04psx: "Garrafa 4 da taverna (alta)",
    tavern_bottle_04_psx: "Garrafa 4 da taverna (alta) (malha)",
    tavernbottle05psx: "Garrafa 5 da taverna (frasco)",
    tavern_bottle_05_psx: "Garrafa 5 da taverna (frasco) (malha)",
    sofapsx: "Sofa",
    sofa_psx: "Sofa (malha)",
    windowglass: "Vidro da janela",
    glass: "Vidro",
    glasshighlight: "Brilho do vidro",
    floorplantpsx: "Vaso de planta",
    chairpsx: "Cadeira com roupas",
    psx_chair: "Cadeira (malha)",
    plant_leaves: "Folhas da planta",
    pot: "Vaso",
    soccerballpsx: "Bola de futebol",
    stovepsx: "Fogao",
    stove_psx: "Fogao (malha)",
    gascylinderpsx: "Botijao de gas",
    gas_cylinder_psx: "Botijao de gas (malha)",
    fridgepsx: "Geladeira",
    fridge_psx: "Geladeira (malha)",
    fruittablepsx: "Mesa de frutas",
    fruit_table_psx: "Mesa de frutas (malha)",
    sinkcabinetpsx: "Pia com armario",
    sink_cabinet_psx: "Pia com armario (malha)",
    shelfpsx: "Prateleira",
    shelf_psx: "Prateleira (malha)",
    microwavepsx: "Microondas",
    microwave_psx: "Microondas (malha)",
    clayfilterpsx: "Filtro de barro",
    clay_filter_psx: "Filtro de barro (malha)",
    bottleglasspsx: "Garrafa com copo",
    bottle_glass_psx: "Garrafa com copo (malha)",
    portableradiopsx: "Radio portatil",
    portable_radio_psx: "Radio portatil (malha)",
    // Banheiro: as seis pecas decorativas do comodo (ver
    // scenes/house-config.js e as fabricas em models/). CUIDADO: "Pia do
    // banheiro" e a pia de coluna deste comodo, e nao a "Pia com
    // armario" da cozinha, la em cima.
    bathroomsinkpsx: "Pia do banheiro",
    bathroom_sink_psx: "Pia do banheiro (malha)",
    toiletpsx: "Privada",
    toilet_psx: "Privada (malha)",
    mirrorcabinetpsx: "Espelheira",
    mirror_cabinet_psx: "Espelheira (malha)",
    towelpsx: "Toalha",
    towel_psx: "Toalha (malha)",
    showerboxpsx: "Box de chuveiro",
    shower_box_psx: "Box de chuveiro (malha)",
    laundrybasketpsx: "Cesto de roupa",
    laundry_basket_psx: "Cesto de roupa (malha)",
    // Cozinha: o forro rebaixado e o tapete listrado (ver
    // scenes/side-room-scene.js).
    "teto-rebaixado-cozinha": "Teto rebaixado da cozinha",
    "tapete-cozinha": "Tapete da cozinha",
    "teto-rebaixado-banheiro": "Teto rebaixado do banheiro",
    "tapete-banheiro": "Tapete do banheiro",
    // Os forros rebaixados dos dois quartos desta atualizacao (mesmo
    // mecanismo dos dois de cima, ver `loweredCeiling` em
    // scenes/house-config.js): sem estes rotulos eles apareceriam no painel
    // como "teto-rebaixado-quarto-01"/"-02" crus.
    "teto-rebaixado-quarto-01": "Teto rebaixado do quarto 01",
    "teto-rebaixado-quarto-02": "Teto rebaixado do quarto 02",
    // As tres divisorias que diminuiram o BANHEIRO (ver `partitions` em
    // scenes/house-config.js). Sao paredes NOVAS por dentro do comodo:
    // mover uma delas aqui pelo gizmo muda a planta do banheiro, e a
    // colisao continua a do lugar original - o dado manda em
    // scenes/house-config.js.
    "divisoria-banheiro-entrada": "Divisoria do banheiro (entrada)",
    "divisoria-banheiro-meio": "Divisoria do banheiro (meio)",
    "divisoria-banheiro-fundo": "Divisoria do banheiro (fundo)",
    "tapete-tecido": "Tapete (tecido)",
    "tapete-franja": "Tapete (franja)",
    soccerballmesh: "Bola (malha)",
    soccerballseams: "Costuras da bola",
    "nota-papel-psx": "Carta de papel",
    "nota-frente": "Carta (frente)",
    "nota-verso": "Carta (verso)",
    "carta-gaveta": "Carta na gaveta",
    "item-na-mao": "Item na mão",
  };

  const MATERIAL_LABELS = {
    floor: "Chão",
    ceiling: "Teto",
    grass: "Grama",
    grassday: "Grama (dia)",
    dirtpath: "Caminho de terra",
    dirtpathday: "Caminho de terra (dia)",
    wall: "Parede",
    wallend: "Parede do fundo",
    wallroom: "Parede do quarto",
    roomfloor: "Chão do quarto",
    roomceiling: "Teto do quarto",
    curtain: "Cortina",
    carpet: "Tapete",
    wood: "Madeira",
  };

  const LIGHT_LABELS = {
    PointLight: "Luz pontual",
    SpotLight: "Holofote",
    DirectionalLight: "Luz direcional",
    HemisphereLight: "Luz de hemisfério",
    AmbientLight: "Luz ambiente",
    RectAreaLight: "Luz de área",
  };

  // ---------- Utilidades de texto/id ----------

  function slug(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function prettify(value) {
    const text = String(value == null ? "" : value).replace(/[-_]+/g, " ").trim();
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Hash curto e determinístico (FNV-1a) — dois objetos diferentes
  // dificilmente colidem, e o mesmo objeto sempre dá o mesmo id em
  // qualquer execução, independente da ordem de carregamento.
  function hash6(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(36).slice(0, 6);
  }

  function round3(value) {
    return Math.round(value * 1000) / 1000;
  }

  function typeToken(obj) {
    if (obj.isLight) return "luz";
    if (obj.isInstancedMesh) return "instancias";
    if (obj.isMesh) return "malha";
    if (obj.isLine) return "linha";
    if (obj.isPoints) return "pontos";
    if (obj.isSprite) return "sprite";
    if (obj.isCamera) return "camera";
    return "grupo";
  }

  function firstMaterial(obj) {
    if (!obj.material) return null;
    return Array.isArray(obj.material) ? obj.material[0] || null : obj.material;
  }

  function materialList(obj) {
    if (!obj.material) return [];
    return Array.isArray(obj.material) ? obj.material : [obj.material];
  }

  // Assinatura estrutural do objeto — a base do id do caso 3 lá em
  // cima. Usa a posição ORIGINAL (não a atual), então continua a
  // mesma depois que o objeto é movido pelo Editor.
  function signatureOf(obj, originalPosition) {
    const geo = obj.geometry;
    const mat = firstMaterial(obj);
    return [
      obj.type,
      geo ? geo.type : "-",
      mat ? mat.type + ":" + (mat.name || "-") : "-",
      round3(originalPosition[0]),
      round3(originalPosition[1]),
      round3(originalPosition[2]),
    ].join("|");
  }

  // ---------- Estado ----------

  const scenes = {}; // key -> { key, label, root, interactables, entries[], byId{}, byObject:Map }
  const sceneOrder = [];

  function registerScene(key, label, root, interactables) {
    if (scenes[key]) {
      scenes[key].root = root;
      scenes[key].interactables = interactables || scenes[key].interactables;
      if (!scenes[key].hintMap) scenes[key].hintMap = {};
      return scenes[key];
    }
    const scene = {
      key: key,
      label: label,
      root: root,
      interactables: interactables || [],
      entries: [],
      byId: {},
      byObject: new Map(),
      // Resolucoes por hint ja decididas (ver applyScene): objectId ->
      // entrada ou null. Lembrar a decisao faz as passadas seguintes
      // (modelos .glb chegando) tratarem o objeto como o MESMO, em vez
      // de sortear outro candidato ou desistir no meio do caminho.
      hintMap: {},
    };
    scenes[key] = scene;
    sceneOrder.push(key);
    return scene;
  }

  function getScenes() {
    return sceneOrder.map(function (key) {
      return scenes[key];
    });
  }

  function getScene(key) {
    return scenes[key] || null;
  }

  // Nomes de material: a MaterialLibrary devolve um objeto
  // { floor: ..., ceiling: ..., wallRoom: ... }. Carimbar a chave em
  // `material.name` custa nada e é o que permite a hierarquia dizer
  // "Parede do quarto" em vez de "Malha".
  function nameMaterials(materials) {
    if (!materials) return;
    Object.keys(materials).forEach(function (key) {
      const mat = materials[key];
      if (mat && mat.isMaterial && !mat.name) {
        mat.name = key;
      }
    });
  }

  // ---------- Captura do estado original ----------

  function captureLight(light) {
    const data = {
      intensity: light.intensity,
      color: "#" + light.color.getHexString(),
      visible: light.visible,
    };
    if (light.distance !== undefined) data.distance = light.distance;
    if (light.decay !== undefined) data.decay = light.decay;
    if (light.angle !== undefined) data.angle = light.angle;
    if (light.penumbra !== undefined) data.penumbra = light.penumbra;
    if (light.groundColor) data.groundColor = "#" + light.groundColor.getHexString();
    return data;
  }

  function captureMaterial(mat) {
    if (!mat) return null;
    const data = {
      color: mat.color ? "#" + mat.color.getHexString() : null,
      opacity: mat.opacity,
      transparent: !!mat.transparent,
      wireframe: !!mat.wireframe,
      side: mat.side,
      map: mat.map || null,
    };
    if (mat.emissive) data.emissive = "#" + mat.emissive.getHexString();
    if (mat.emissiveIntensity !== undefined) data.emissiveIntensity = mat.emissiveIntensity;
    if (mat.roughness !== undefined) data.roughness = mat.roughness;
    if (mat.metalness !== undefined) data.metalness = mat.metalness;
    return data;
  }

  // Retrato original de um objeto, copiado para uma cópia. Não dá para
  // usar JSON aqui: `material.map` guarda a textura em si, que é um
  // objeto do Three.js.
  function copySnapshot(data) {
    if (!data) return null;
    const out = {};
    Object.keys(data).forEach(function (key) {
      out[key] = data[key];
    });
    return out;
  }

  function copyOriginal(original) {
    return {
      position: original.position.slice(),
      rotation: original.rotation.slice(),
      scale: original.scale.slice(),
      visible: original.visible,
      light: copySnapshot(original.light),
      material: copySnapshot(original.material),
    };
  }

  function labelFor(obj, anchor) {
    if (anchor && anchor.label) return anchor.label;

    const nameKey = String(obj.name || "").toLowerCase();
    if (nameKey && NAME_LABELS[nameKey]) return NAME_LABELS[nameKey];
    if (obj.name) return prettify(obj.name);

    if (obj.isLight) {
      return LIGHT_LABELS[obj.type] || "Luz";
    }
    if (obj.isInstancedMesh) {
      return "Instâncias (" + obj.count + ")";
    }

    const mat = firstMaterial(obj);
    if (mat && mat.name) {
      const matKey = mat.name.toLowerCase();
      if (MATERIAL_LABELS[matKey]) return MATERIAL_LABELS[matKey];
      return prettify(mat.name);
    }
    if (obj.isMesh && obj.geometry) {
      return prettify(obj.geometry.type.replace(/BufferGeometry|Geometry/g, "")) || "Malha";
    }
    return obj.isMesh ? "Malha" : "Grupo";
  }

  // Sobe do `outline` de um interativo até o filho direto da raiz da
  // cena: é esse grupo que representa "a porta", "a janela", "a
  // escrivaninha" inteira.
  function topAncestorUnder(obj, root) {
    let node = obj;
    while (node && node.parent && node.parent !== root) {
      node = node.parent;
    }
    return node && node.parent === root ? node : null;
  }

  function buildAnchors(scene) {
    const anchors = new Map();
    (scene.interactables || []).forEach(function (item) {
      if (!item || !item.outline) return;
      const top = topAncestorUnder(item.outline, scene.root);
      if (!top || anchors.has(top)) return;
      const kindLabel = KIND_LABELS[item.kind] || prettify(item.kind) || "Objeto";
      const own = item.label || prettify(item.id);
      anchors.set(top, {
        id: slug(item.id) || slug(item.kind),
        label: own && own.toLowerCase() !== kindLabel.toLowerCase() ? kindLabel + " · " + own : kindLabel,
        kind: item.kind,
        interactable: item,
      });
    });
    return anchors;
  }

  // ---------- Varredura ----------

  /**
   * Registra tudo que ainda não está registrado. Pode (e deve) ser
   * chamada várias vezes: os modelos .glb entram na cena depois do
   * boot, então cada passagem nova só acrescenta o que apareceu.
   * Devolve quantos nós novos entraram.
   */
  function sync() {
    let added = 0;
    getScenes().forEach(function (scene) {
      if (!scene.root) return;
      const anchors = buildAnchors(scene);
      added += walk(scene, scene.root, null, anchors);
      added += syncRemoved(scene, anchors);
    });
    return added;
  }

  /**
   * Segunda frente da varredura: DENTRO do que foi excluido.
   *
   * Excluir tira o objeto da arvore da cena, mas o objeto 3D dele
   * continua existindo em memoria - e continua RECEBENDO FILHOS. Um
   * modelo .glb que ainda estava a caminho quando a exclusao foi
   * aplicada entra dentro dele DEPOIS, num galho que a varredura
   * normal (que parte de scene.root) nao alcanca mais.
   *
   * Sem esta passada, essas pecas nunca entram no registro. E como uma
   * COPIA espera a origem terminar de chegar antes de nascer (o gate de
   * `count` em editor/editor-clones.js), a origem ficava para sempre
   * com um unico no registrado e a copia nunca nascia. Era exatamente
   * isto que fazia as copias de um modelo cujo ORIGINAL foi excluido no
   * Editor desaparecerem a cada boot - e de forma intermitente, porque
   * dependia de qual .glb ganhava a corrida contra o carregamento das
   * alteracoes salvas.
   *
   * O objeto excluido continua FORA da cena: aqui so se aprende o nome
   * das pecas de dentro dele. Nada volta a ser desenhado, nada volta a
   * receber toque.
   */
  function syncRemoved(scene, anchors) {
    let added = 0;
    // Copia da lista de proposito: registrar peca nova empurra entradas
    // em scene.entries no meio do laco.
    scene.entries.slice().forEach(function (entry) {
      if (!entry.__removed || !entry.object) return;
      const before = added;
      added += walk(scene, entry.object, entry, anchors);
      // Peca que chegou DEPOIS da exclusao tambem nao interage.
      if (added !== before) eachInSubtree(entry, dropInteractable);
    });
    return added;
  }

  function walk(scene, node, parentEntry, anchors) {
    let added = 0;
    const used = {};

    // Conta os ids locais já ocupados por filhos JÁ registrados, para
    // um filho novo (modelo .glb que acabou de carregar) nunca roubar
    // um id que já pertence a outro.
    //
    // A conta vem do REGISTRO (os filhos registrados deste nó), e não
    // da lista de filhos do objeto 3D: um objeto EXCLUÍDO sai da árvore
    // da cena mas continua registrado (ver a seção "Excluídos" mais
    // abaixo), e o id dele segue reservado — senão um .glb que chegasse
    // depois poderia tomar o id e receber a exclusão alheia.
    siblingEntries(scene, parentEntry).forEach(function (existing) {
      const base = existing.baseLocalId || existing.localId;
      used[base] = (used[base] || 0) + 1;
    });

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];

      // Nada do próprio Editor entra no registro (gizmo, contorno de
      // seleção, ajudantes de colisão) — ver editor/editor-gizmo.js.
      if (child.userData && child.userData.__editorHelper) {
        continue;
      }

      let entry = scene.byObject.get(child);
      if (!entry) {
        entry = createEntry(scene, child, parentEntry, anchors, used);
        added += 1;
      }
      added += walk(scene, child, entry, anchors);
    }
    return added;
  }

  function createEntry(scene, obj, parentEntry, anchors, used) {
    const original = {
      position: [obj.position.x, obj.position.y, obj.position.z],
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: [obj.scale.x, obj.scale.y, obj.scale.z],
      visible: obj.visible,
      light: obj.isLight ? captureLight(obj) : null,
      material: captureMaterial(firstMaterial(obj)),
    };

    const anchor = anchors.get(obj) || null;

    let localId;
    if (anchor) {
      localId = anchor.id;
    } else if (obj.name) {
      localId = slug(obj.name);
    } else {
      localId = typeToken(obj) + "-" + hash6(signatureOf(obj, original.position));
    }
    if (!localId) {
      localId = typeToken(obj);
    }

    const baseLocalId = localId;
    const seen = used[baseLocalId] || 0;
    used[baseLocalId] = seen + 1;
    if (seen > 0) {
      localId = baseLocalId + "-" + (seen + 1);
    }

    const id = parentEntry ? parentEntry.id + "/" + localId : localId;

    const entry = {
      id: id,
      localId: localId,
      baseLocalId: baseLocalId,
      sceneKey: scene.key,
      object: obj,
      parent: parentEntry,
      children: [],
      depth: parentEntry ? parentEntry.depth + 1 : 0,
      label: labelFor(obj, anchor),
      kind: anchor ? anchor.kind : null,
      interactable: anchor ? anchor.interactable : null,
      isLight: !!obj.isLight,
      isMesh: !!obj.isMesh,
      original: original,
      originalMaterial: obj.material || null,
      searchText: "",
    };

    entry.searchText = (entry.label + " " + entry.id + " " + (obj.name || "") + " " + (entry.kind || ""))
      .toLowerCase();

    obj.userData.__editorId = id;
    obj.userData.__editorScene = scene.key;

    scene.entries.push(entry);
    scene.byId[id] = entry;
    scene.byObject.set(obj, entry);
    if (parentEntry) {
      parentEntry.children.push(entry);
    }
    return entry;
  }

  function siblingEntries(scene, parentEntry) {
    if (parentEntry) return parentEntry.children;
    return scene.entries.filter(function (entry) {
      return !entry.parent;
    });
  }

  // ---------- Excluídos (a ferramenta EXCLUIR) ----------
  //
  // Excluir NÃO é ocultar. Ocultar (`visible`) deixa o objeto na cena,
  // apagado; excluir TIRA ele da árvore da cena: não é desenhado, não
  // recebe toque, não entra em raycast nenhum e não custa mais nada por
  // quadro. A exclusão vira delta salvo (`removed: true` — ver
  // editor/editor-overrides.js), então vale também no jogo normal, no
  // próximo boot, do mesmo jeito que uma cópia criada no Editor.
  //
  // O objeto 3D NÃO é destruído e nada é descartado aqui: geometria e
  // material são compartilhados com o resto do jogo. Guardamos o pai e
  // o ÍNDICE de onde ele saiu, e é por isso que restaurar devolve o
  // objeto ao MESMO lugar da árvore — a ordem dos filhos importa, é ela
  // que casa cada peça de uma cópia com a peça do original (ver
  // adoptCloneNode).
  //
  // O que a exclusão alcança: o objeto 3D, a INTERAÇÃO dele (telefone
  // excluído não pode mais ser usado por engano) e, desde a correção da
  // "parede invisível", também a COLISÃO.
  //
  // A colisão nunca morou no objeto 3D: ela é uma caixa numa lista que o
  // cenário monta na construção (ver scripts/collision.js). Então tirar
  // o objeto da árvore, sozinho, deixava a caixa dele para trás — o
  // móvel desaparecia e continuava barrando o jogador, até trancando
  // passagens. Agora cada caixa guarda o objeto de quem ela é (`owner`)
  // e a marca abaixo é o que ela consulta.
  //
  // O que a exclusão continua NÃO alcançando: a caixa de um objeto que
  // foi apenas MOVIDO pelo Editor, que segue onde o cenário a colocou.

  /**
   * Marca/desmarca o objeto como excluído PARA A COLISÃO.
   *
   * Fica no próprio `userData` do objeto 3D de propósito: assim a
   * colisão descobre sozinha, sem o Editor precisar conhecer nenhuma
   * lista de sólidos nem existir no jogo normal (as exclusões salvas são
   * aplicadas por este mesmo caminho no boot — ver applyEntry). Um só
   * nó marcado basta: quem pergunta sobe pelos pais (ver isSolidActive
   * em scripts/collision.js), então excluir um grupo já desliga a caixa
   * de cada peça de dentro dele.
   */
  function markRemovedForCollision(obj, removed) {
    if (!obj) return;
    if (!obj.userData) obj.userData = {};
    if (removed) obj.userData.__editorRemoved = true;
    else delete obj.userData.__editorRemoved;
  }

  // Lista VIVA de interativos do jogo (scripts/main.js entrega a dele).
  // Opcional de propósito: sem ela, excluir continua funcionando, só
  // não mexe na interação.
  let interactableList = null;

  function setInteractableList(list) {
    interactableList = list || null;
    if (!interactableList) return;
    // A lista pode chegar DEPOIS de as exclusões salvas já terem sido
    // aplicadas (é o que acontece no boot do jogo normal), então ela é
    // acertada aqui, uma vez, em vez de depender da ordem das chamadas.
    sceneOrder.forEach(function (key) {
      scenes[key].entries.forEach(function (entry) {
        if (entry.__removed) eachInSubtree(entry, dropInteractable);
      });
    });
  }

  function dropInteractable(entry) {
    const item = entry.interactable;
    if (!item) return;
    // A casca branca pode ter ficado acesa no quadro em que o objeto
    // saiu: quem apaga é o InteractionSystem, varrendo a lista, e ele
    // não vai mais ver este item.
    if (item.outline) item.outline.visible = false;
    if (!interactableList) return;
    const index = interactableList.indexOf(item);
    if (index !== -1) interactableList.splice(index, 1);
  }

  function keepInteractable(entry) {
    const item = entry.interactable;
    if (!item || !interactableList) return;
    if (interactableList.indexOf(item) === -1) interactableList.push(item);
  }

  function eachInSubtree(entry, fn) {
    fn(entry);
    entry.children.forEach(function (child) {
      eachInSubtree(child, fn);
    });
  }

  function isRemoved(entry) {
    return !!(entry && entry.__removed);
  }

  /** Algum pai está excluído? (então este objeto também não está na cena) */
  function isInsideRemoved(entry) {
    let node = entry ? entry.parent : null;
    while (node) {
      if (node.__removed) return true;
      node = node.parent;
    }
    return false;
  }

  function detachEntry(entry) {
    if (entry.__removed) return false;
    const obj = entry.object;
    const parent = obj.parent;
    entry.__removed = true;
    markRemovedForCollision(obj, true);
    if (parent) {
      entry.__removedFrom = parent;
      entry.__removedIndex = parent.children.indexOf(obj);
      parent.remove(obj);
    }
    eachInSubtree(entry, dropInteractable);
    return true;
  }

  function reattachEntry(entry) {
    if (!entry.__removed) return false;
    entry.__removed = false;
    const scene = scenes[entry.sceneKey];
    const obj = entry.object;
    markRemovedForCollision(obj, false);
    const parent =
      entry.__removedFrom || (entry.parent ? entry.parent.object : scene ? scene.root : null);

    if (parent && obj.parent !== parent) {
      parent.add(obj);
      // O `add` do Three.js joga sempre no fim da lista: volta para o
      // índice de onde saiu.
      const index = entry.__removedIndex;
      const now = parent.children.indexOf(obj);
      if (typeof index === "number" && index >= 0 && now > index) {
        parent.children.splice(now, 1);
        parent.children.splice(index, 0, obj);
      }
    }
    entry.__removedFrom = null;
    entry.__removedIndex = -1;

    // Peça de dentro que está excluída por conta própria continua fora.
    (function walkAlive(node) {
      if (node !== entry && node.__removed) return;
      keepInteractable(node);
      node.children.forEach(walkAlive);
    })(entry);
    return true;
  }

  // ---------- Cópias ----------

  /**
   * Adota uma CÓPIA já clonada de um objeto registrado: pendura na
   * cena, registra a raiz e cada peça de dentro, e dá a cada uma o
   * retrato original da peça correspondente do objeto copiado.
   *
   * options: { sceneKey, object, parentEntry, sourceEntry, localId, label, base }
   */
  function adoptClone(options) {
    const scene = scenes[options.sceneKey];
    const source = options.sourceEntry;
    if (!scene || !source || !options.object || !options.localId) return null;

    const parentEntry = options.parentEntry || null;
    const parentObject = parentEntry ? parentEntry.object : scene.root;
    if (!parentObject) return null;

    // A cópia chega com o userData do original colado nela (o clone do
    // Three.js copia userData). As marcas do Editor são reescritas nó a
    // nó aqui embaixo; limpar antes evita que um filho que ainda não
    // estava registrado fique carregando o id de outro objeto.
    options.object.traverse(function (node) {
      if (!node.userData) return;
      delete node.userData.__editorId;
      delete node.userData.__editorScene;
      delete node.userData.__editorClone;
    });

    parentObject.add(options.object);

    const rootId = parentEntry ? parentEntry.id + "/" + options.localId : options.localId;
    return adoptCloneNode(
      scene,
      options.object,
      parentEntry,
      source,
      options.localId,
      options.label || null,
      rootId,
      options.base || source.baseLocalId || source.localId
    );
  }

  function adoptCloneNode(scene, obj, parentEntry, sourceEntry, localId, label, cloneRootId, base) {
    const id = parentEntry ? parentEntry.id + "/" + localId : localId;

    const entry = {
      id: id,
      localId: localId,
      baseLocalId: localId,
      sceneKey: scene.key,
      object: obj,
      parent: parentEntry,
      children: [],
      depth: parentEntry ? parentEntry.depth + 1 : 0,
      label: label || sourceEntry.label,
      // Uma cópia é cenário, não uma segunda porta que abre: ela não
      // herda o objeto interativo do original (ver editor-clones.js).
      kind: null,
      interactable: null,
      isLight: !!obj.isLight,
      isMesh: !!obj.isMesh,
      original: copyOriginal(sourceEntry.original),
      originalMaterial: obj.material || null,
      searchText: "",
      isClone: true,
      isCloneRoot: id === cloneRootId,
      cloneRootId: cloneRootId,
      cloneOf: sourceEntry.id,
      cloneBase: base,
    };

    entry.searchText = (
      entry.label +
      " " +
      entry.id +
      " " +
      (obj.name || "") +
      " copia cópia"
    ).toLowerCase();

    obj.userData.__editorId = id;
    obj.userData.__editorScene = scene.key;
    obj.userData.__editorClone = true;

    // ---------- Colisao da copia ----------
    // Uma copia e um objeto 3D novo, e a lista de solidos do cenario foi
    // montada uma vez, na construcao dele: sem esta linha a copia nascia
    // sem colisao nenhuma - sofa, cama e mesa duplicados viravam
    // decoracao atravessavel, e um comodo montado a base de DUPLICAR
    // ficava praticamente sem colisao. A caixa espelhada e a MESMA do
    // objeto de origem e passa a seguir a copia (posicao, giro e escala
    // dela sao aplicados logo depois, em applySubtree). Ver mirrorSolids
    // em scripts/collision.js. Nada acontece se a origem nao tiver
    // colisao (quadro, poster, garrafa em cima da mesa).
    if (window.Collision && window.Collision.mirrorSolids) {
      try {
        window.Collision.mirrorSolids(sourceEntry.object, obj);
      } catch (e) {
        /* colisao de copia nunca pode derrubar o Editor nem o boot */
      }
    }

    scene.entries.push(entry);
    scene.byId[id] = entry;
    scene.byObject.set(obj, entry);
    if (parentEntry) {
      parentEntry.children.push(entry);
    }

    // Os filhos casam 1 para 1 com os do objeto copiado (o clone do
    // Three.js preserva a ordem), então cada peça da cópia herda o id
    // local e o retrato original da peça certa. Filho que ainda não
    // estava registrado (modelo a caminho) fica de fora desta passada.
    const sourceChildren = sourceEntry.object.children;
    const total = Math.min(obj.children.length, sourceChildren.length);
    for (let i = 0; i < total; i++) {
      const childSource = scene.byObject.get(sourceChildren[i]);
      if (!childSource) continue;
      adoptCloneNode(
        scene,
        obj.children[i],
        entry,
        childSource,
        childSource.localId,
        null,
        cloneRootId,
        childSource.baseLocalId || childSource.localId
      );
    }

    return entry;
  }

  /** Quantos nós (do jogo, sem contar cópias) existem sob este objeto. */
  function countSubtree(entry) {
    if (!entry || entry.isClone) return 0;
    let total = 1;
    entry.children.forEach(function (child) {
      total += countSubtree(child);
    });
    return total;
  }

  /**
   * Tira um objeto e tudo dentro dele da cena e do registro. Serve
   * para cópias (criar e desfazer): geometria e material de fábrica
   * são COMPARTILHADOS com o original e nunca são descartados aqui —
   * só as cópias de material que o próprio Editor criou.
   */
  function removeEntryTree(entry) {
    const scene = scenes[entry.sceneKey];
    if (!scene) return [];

    const removed = [];
    (function collect(node) {
      removed.push(node);
      node.children.slice().forEach(collect);
    })(entry);

    if (entry.object.parent) {
      entry.object.parent.remove(entry.object);
    }
    // Mesma marca da exclusão: aqui o objeto sai da cena de vez, então
    // qualquer caixa de colisão que aponte para ele também para de valer.
    markRemovedForCollision(entry.object, true);
    // Copia apagada de vez (ou refeita porque o .glb da origem chegou
    // depois): a caixa espelhada dela sai da lista em vez de ficar
    // sobrando desligada para sempre. So mexe em caixa de COPIA - a do
    // cenario continua viva, porque excluir e reversivel.
    if (window.Collision && window.Collision.dropMirrors) {
      try {
        window.Collision.dropMirrors(entry.object);
      } catch (e) {
        /* idem: nunca pode derrubar o Editor */
      }
    }

    removed.forEach(function (node) {
      if (node.__ownsMaterial) {
        materialListOf(node.object.material).forEach(function (mat) {
          if (mat && mat.dispose) mat.dispose();
        });
      }
      delete scene.byId[node.id];
      scene.byObject.delete(node.object);
      const index = scene.entries.indexOf(node);
      if (index !== -1) scene.entries.splice(index, 1);
    });

    if (entry.parent) {
      const index = entry.parent.children.indexOf(entry);
      if (index !== -1) entry.parent.children.splice(index, 1);
    }

    return removed.map(function (node) {
      return node.id;
    });
  }

  function entryForObject(obj) {
    let node = obj;
    while (node) {
      const sceneKey = node.userData ? node.userData.__editorScene : null;
      if (sceneKey && scenes[sceneKey]) {
        const found = scenes[sceneKey].byObject.get(node);
        if (found) return found;
      }
      node = node.parent;
    }
    return null;
  }

  function findById(sceneKey, id) {
    const scene = scenes[sceneKey];
    return scene ? scene.byId[id] || null : null;
  }

  // Plano B: a alteração salva aponta para um id que não existe mais
  // (o jogo foi atualizado e o objeto mudou de lugar na árvore).
  // Tenta reencontrar pelo nome + tipo + posição original.
  function resolveByHint(sceneKey, hint) {
    const scene = scenes[sceneKey];
    if (!scene || !hint) return null;

    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < scene.entries.length; i++) {
      const entry = scene.entries[i];
      // COPIA JAMAIS. Uma copia nasce com o mesmo nome, o mesmo tipo e a
      // MESMA posicao de fabrica do objeto copiado, entao ela seria o
      // alvo perfeito para o hint de uma alteracao orfa do original -
      // inclusive de um `removed: true`. Era o segundo jeito de as
      // duplicatas sumirem: o original excluido acabava puxando a copia
      // para dentro da propria exclusao. Copia tem id proprio e delta
      // proprio; sem o id, a alteracao dela e ignorada e ponto.
      if (entry.isClone) continue;
      if (entry.__hintUsed) continue;
      if (hint.type && entry.object.type !== hint.type) continue;
      if (hint.name && (entry.object.name || "") !== hint.name) continue;
      if (!hint.pos) continue;
      const p = entry.original.position;
      const dx = p[0] - hint.pos[0];
      const dy = p[1] - hint.pos[1];
      const dz = p[2] - hint.pos[2];
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = entry;
      }
    }
    // Tolerância curta de propósito: melhor ignorar a alteração do
    // que aplicá-la no objeto errado.
    return bestDist <= 0.0025 ? best : null;
  }

  function hintFor(entry) {
    // Cópia não tem plano B: ela nasceu com o mesmo nome, o mesmo tipo
    // e a mesma posição de fábrica do original, então um hint poderia
    // encaixar a alteração DELA no objeto original. Sem cópia, a
    // alteração da cópia é simplesmente ignorada.
    if (entry.isClone) return null;
    return {
      name: entry.object.name || "",
      type: entry.object.type,
      pos: [
        round3(entry.original.position[0]),
        round3(entry.original.position[1]),
        round3(entry.original.position[2]),
      ],
    };
  }

  // ---------- Materiais próprios ----------

  /**
   * Os materiais do jogo são COMPARTILHADOS (o mesmo material de
   * parede serve dezenas de malhas). Mexer nele direto mudaria todas
   * de uma vez, então, na primeira edição de material de um objeto,
   * ele ganha uma cópia só dele. Só objetos de fato editados pagam
   * esse custo — o resto do jogo continua com o material original
   * compartilhado (ver o item "Desempenho" no README do Editor).
   */
  function ensureOwnMaterial(entry) {
    const obj = entry.object;
    if (!obj.material) return null;

    // A marca de "material próprio" fica na ENTRADA, não no material:
    // uma cópia nasce apontando para o mesmo material do original
    // (inclusive quando ele já era uma cópia de material do Editor), e
    // sem isso pintar a cópia pintaria o original junto.
    if (entry.__ownsMaterial) return obj.material;

    if (Array.isArray(obj.material)) {
      const copies = obj.material.map(function (mat) {
        const clone = mat.clone();
        clone.userData.__editorOwned = true;
        return clone;
      });
      copies.__editorOwned = true;
      obj.material = copies;
    } else {
      const clone = obj.material.clone();
      clone.userData.__editorOwned = true;
      obj.material = clone;
    }

    entry.__ownsMaterial = true;
    return obj.material;
  }

  function restoreOriginalMaterial(entry) {
    const obj = entry.object;
    entry.__ownsMaterial = false;
    if (!entry.originalMaterial || obj.material === entry.originalMaterial) return;
    const current = obj.material;
    obj.material = entry.originalMaterial;
    materialListOf(current).forEach(function (mat) {
      if (mat && mat.userData && mat.userData.__editorOwned && mat.dispose) {
        mat.dispose();
      }
    });
  }

  function materialListOf(material) {
    if (!material) return [];
    return Array.isArray(material) ? material : [material];
  }

  // ---------- Aplicação das alterações salvas ----------

  function applyVector(target, originalArray, override) {
    const x = override && override.x !== undefined ? override.x : originalArray[0];
    const y = override && override.y !== undefined ? override.y : originalArray[1];
    const z = override && override.z !== undefined ? override.z : originalArray[2];
    target.set(x, y, z);
  }

  function applyEntry(entry, override) {
    const obj = entry.object;
    const original = entry.original;

    applyVector(obj.position, original.position, override.position);
    applyVector(obj.rotation, original.rotation, override.rotation);
    applyVector(obj.scale, original.scale, override.scale);
    obj.visible = override.visible === undefined ? original.visible : !!override.visible;

    if (entry.isLight && original.light) {
      const l = override.light || {};
      const light = obj;
      light.intensity = l.intensity === undefined ? original.light.intensity : l.intensity;
      light.color.set(l.color === undefined ? original.light.color : l.color);
      if (light.distance !== undefined) {
        light.distance = l.distance === undefined ? original.light.distance : l.distance;
      }
      if (light.decay !== undefined) {
        light.decay = l.decay === undefined ? original.light.decay : l.decay;
      }
      if (light.angle !== undefined && original.light.angle !== undefined) {
        light.angle = l.angle === undefined ? original.light.angle : l.angle;
      }
      if (light.penumbra !== undefined && original.light.penumbra !== undefined) {
        light.penumbra = l.penumbra === undefined ? original.light.penumbra : l.penumbra;
      }
    }

    if (override.material && entry.isMesh) {
      applyMaterial(entry, override.material);
    } else if (!override.material) {
      restoreOriginalMaterial(entry);
    }

    // EXCLUÍDO (ver a seção "Excluídos" mais acima). Vem por último e
    // é idempotente como o resto: aplicar de novo não faz nada, e a
    // AUSÊNCIA do `removed` devolve o objeto à cena. É por isso que
    // desfazer, "Resetar objeto", RECARREGAR e IMPORTAR trazem o
    // objeto de volta sem nenhum caminho próprio para isso.
    if (override.removed) {
      detachEntry(entry);
    } else {
      reattachEntry(entry);
    }
  }

  function applyMaterial(entry, matOverride) {
    const target = ensureOwnMaterial(entry);
    if (!target) return;
    const original = entry.original.material || {};

    materialListOf(target).forEach(function (mat) {
      if (matOverride.color !== undefined && mat.color) mat.color.set(matOverride.color);
      if (matOverride.emissive !== undefined && mat.emissive) mat.emissive.set(matOverride.emissive);
      if (matOverride.emissiveIntensity !== undefined && mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = matOverride.emissiveIntensity;
      }
      if (matOverride.opacity !== undefined) {
        mat.opacity = matOverride.opacity;
        mat.transparent = matOverride.transparent === undefined ? matOverride.opacity < 1 : !!matOverride.transparent;
      } else if (matOverride.transparent !== undefined) {
        mat.transparent = !!matOverride.transparent;
      }
      if (matOverride.roughness !== undefined && mat.roughness !== undefined) mat.roughness = matOverride.roughness;
      if (matOverride.metalness !== undefined && mat.metalness !== undefined) mat.metalness = matOverride.metalness;
      if (matOverride.wireframe !== undefined) mat.wireframe = !!matOverride.wireframe;
      if (matOverride.side !== undefined) mat.side = matOverride.side;

      if (matOverride.map !== undefined) {
        if (matOverride.map === null || matOverride.map === "") {
          mat.map = original.map || null;
        } else {
          const tex = window.EditorTextures ? window.EditorTextures.resolve(matOverride.map) : null;
          if (tex) {
            mat.map = tex;
          }
        }
      }
      mat.needsUpdate = true;
    });
  }

  /**
   * Aplica TODAS as alterações salvas de uma cena por cima dos
   * valores originais. Idempotente de propósito: cada aplicação parte
   * sempre do original, então chamar de novo (depois que um .glb
   * terminou de carregar, por exemplo) nunca acumula erro.
   */
  function applyScene(sceneKey) {
    const scene = scenes[sceneKey];
    if (!scene) return 0;
    const entries = window.EditorOverrides.getSceneEntries(sceneKey);
    let applied = 0;

    Object.keys(entries).forEach(function (objectId) {
      const override = entries[objectId];
      let entry = scene.byId[objectId];
      if (!entry) {
        // A decisao do plano B e tomada UMA vez e lembrada. Antes, a
        // marca __hintUsed ficava so na entrada, e a passada seguinte
        // (depois de um .glb chegar) ou desistia ou escolhia outro
        // candidato: duas passadas, dois destinos para a mesma
        // alteracao salva.
        if (Object.prototype.hasOwnProperty.call(scene.hintMap, objectId)) {
          entry = scene.hintMap[objectId];
        } else if (override.hint) {
          entry = resolveByHint(sceneKey, override.hint);
          if (entry) entry.__hintUsed = true;
          scene.hintMap[objectId] = entry || null;
        }
      }
      if (!entry) {
        // Objeto removido em alguma atualização do jogo: ignora a
        // alteração e segue em frente (nunca dá erro).
        return;
      }
      try {
        applyEntry(entry, override);
        applied += 1;
      } catch (e) {
        /* uma alteração ruim nunca pode derrubar o jogo */
      }
    });
    return applied;
  }

  function applyAll() {
    let total = 0;
    sceneOrder.forEach(function (key) {
      total += applyScene(key);
    });
    return total;
  }

  /** Devolve o objeto ao estado de fábrica (e nada mais). */
  function resetEntry(entry) {
    restoreOriginalMaterial(entry);
    applyEntry(entry, {});
  }

  function resetScene(sceneKey) {
    const scene = scenes[sceneKey];
    if (!scene) return;
    scene.entries.forEach(resetEntry);
  }

  function resetAll() {
    sceneOrder.forEach(resetScene);
  }

  // ---------- Consulta (hierarquia + pesquisa) ----------

  function rootEntries(sceneKey) {
    const scene = scenes[sceneKey];
    if (!scene) return [];
    return scene.entries.filter(function (entry) {
      return !entry.parent;
    });
  }

  function search(sceneKey, query, filter) {
    const scene = scenes[sceneKey];
    if (!scene) return [];
    const needle = String(query || "").trim().toLowerCase();
    return scene.entries.filter(function (entry) {
      if (filter === "lights" && !entry.isLight) return false;
      if (filter === "interactive" && !entry.interactable) return false;
      if (filter === "clones" && !entry.isClone) return false;
      if (filter === "removed" && !isRemoved(entry)) return false;
      if (filter === "changed" && !window.EditorOverrides.get(sceneKey, entry.id)) return false;
      if (!needle) return true;
      return entry.searchText.indexOf(needle) !== -1;
    });
  }

  function hasOverride(entry) {
    return !!window.EditorOverrides.get(entry.sceneKey, entry.id);
  }

  return {
    registerScene: registerScene,
    nameMaterials: nameMaterials,
    getScenes: getScenes,
    getScene: getScene,
    sync: sync,
    applyScene: applyScene,
    applyAll: applyAll,
    applyEntry: applyEntry,
    resetEntry: resetEntry,
    resetScene: resetScene,
    resetAll: resetAll,
    ensureOwnMaterial: ensureOwnMaterial,
    restoreOriginalMaterial: restoreOriginalMaterial,
    adoptClone: adoptClone,
    removeEntryTree: removeEntryTree,
    setInteractableList: setInteractableList,
    isRemoved: isRemoved,
    isInsideRemoved: isInsideRemoved,
    markRemovedForCollision: markRemovedForCollision,
    countSubtree: countSubtree,
    entryForObject: entryForObject,
    findById: findById,
    hintFor: hintFor,
    rootEntries: rootEntries,
    search: search,
    hasOverride: hasOverride,
    slug: slug,
    prettify: prettify,
  };
})();
