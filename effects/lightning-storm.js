/**
 * effects/lightning-storm.js
 * -------------------------------------------------
 * O CLARAO DA TEMPESTADE - o relampago que entra pela janela e clareia
 * o comodo por um instante, de noite.
 *
 * =========================================================
 *  O BUG QUE ESTE ARQUIVO CONSERTA
 * =========================================================
 * O clarao existia e parou de sair pela janela. Nao foi um numero
 * desregulado: o sistema inteiro DESAPARECEU do jogo quando a janela
 * antiga foi trocada pelo modelo novo (moldura + varao + cortina, ver
 * models/window-factory.js). Da versao antiga sobrou so o GANCHO, um
 * `stopStorm()` VAZIO - o proprio arquivo dizia isso em letras
 * garrafais ("chuva, relampago e qualquer outro elemento externo
 * continuam sem existir por enquanto ... `stopStorm` continua existindo
 * so para nao quebrar a chamada"), e as duas cenas seguiam chamando
 * esse vazio no amanhecer achando que desligavam alguma coisa.
 *
 * Ou seja: as janelas continuavam abrindo, fechando e soando como
 * sempre, mas nao havia mais NADA para acender. Era por isso que o
 * clarao nao voltava mexendo em janela nenhuma - ele nao existia em
 * lugar nenhum do codigo.
 *
 * =========================================================
 *  UMA TEMPESTADE, NAO UMA POR JANELA
 * =========================================================
 * Relampago e um evento do CEU: quando cai um, ele cai para a casa
 * inteira. Por isso o sorteio (quando vem o proximo, quantos piscos
 * tem, quanto dura cada um) vive AQUI, num lugar so, e todas as
 * janelas do jogo leem o MESMO valor no MESMO quadro. As duas janelas
 * da mesma parede do corredor piscam juntas, como tem de ser - se cada
 * janela sorteasse o seu proprio clarao, o corredor viraria arvore de
 * natal.
 *
 * O relogio nao e `performance.now()`: e o `elapsed` que a cena do
 * corredor ja recebe por quadro (ver `update` abaixo e o frameUpdaters
 * de scenes/corridor-scene.js). Assim a tempestade congela junto com o
 * jogo quando o navegador congela a aba, e nunca avanca duas vezes no
 * mesmo quadro.
 *
 * =========================================================
 *  UMA LUZ SO PARA A CASA INTEIRA (e por que isso importa)
 * =========================================================
 * O clarao tem duas metades visiveis, e so a primeira custa caro:
 *
 *   1. A LUZ que entra no comodo - uma THREE.PointLight de verdade,
 *      que acende parede, movel, chao e a cortina.
 *   2. O VIDRO brilhando - um quad aditivo por janela, dentro da
 *      propria fabrica (ver models/window-factory.js). Nao e luz, e
 *      pintura: custa quase nada e acontece em TODAS as janelas ao
 *      mesmo tempo.
 *
 * PointLight no three.js nao e de graca: cada uma entra no shader de
 * TODO material iluminado da casa, em todo pixel. Uma luz por janela
 * (seis, hoje) encareceria a casa inteira para sempre por causa de um
 * efeito que dura 0,2 segundo - no alvo do jogo (celular, ver
 * scripts/main.js) isso e caro do jeito errado.
 *
 * Entao existe UMA luz de clarao no jogo inteiro, e ela vai ate a
 * janela que interessa: no instante em que o relampago cai, a mais
 * PROXIMA do jogador. As outras seguem piscando no vidro (item 2), que
 * e o que se ve de longe de qualquer forma - o jogador nunca esta
 * dentro de dois comodos ao mesmo tempo. A escolha e feita uma vez POR
 * RELAMPAGO, nao por quadro: andar durante o pisco nao faz a claridade
 * saltar de janela.
 *
 * =========================================================
 *  A LUZ NAO VAZA PARA O COMODO VIZINHO
 * =========================================================
 * De graca, e pelo mesmo caminho das luminarias: a luz e plantada
 * DENTRO do comodo (o ancora criado em models/window-factory.js fica
 * alguns centimetros para dentro da janela), entao
 * materials/light-zones.js a prende na zona daquele comodo exatamente
 * como prende a luminaria de teto. Clarao na janela da COZINHA nao
 * clareia o corredor.
 *
 * =========================================================
 *  CORTINA FECHADA
 * =========================================================
 * O quad do vidro fica ATRAS do tecido (ver models/window-factory.js),
 * entao cortina fechada tapa o brilho do vidro sozinha, por
 * profundidade, sem nenhum teste. A LUZ continua entrando, so mais
 * fraca (CLOSED_FACTOR): pano de cortina nao e parede, e relampago de
 * verdade acende quarto de cortina fechada. E tambem e decisao de jogo:
 * o primeiro objetivo da noite e justamente ABRIR as janelas (ver
 * objectives/objective-config.js) - se o clarao dependesse da cortina
 * aberta, o jogador comecaria a partida sem nunca ter visto o efeito.
 *
 * =========================================================
 *  DE DIA NAO TEM CLARAO
 * =========================================================
 * `setDaytime(true)` desliga a tempestade inteira num lugar so - a
 * virada da historia (cutscenes/sleep-sequence.js) e o controle de
 * HORARIO do Editor passam por aqui. Diferente do antigo `stopStorm`,
 * isto tem VOLTA: o Editor troca dia/noite quantas vezes quiser e o
 * clarao volta com a noite.
 *
 * window.LightningStorm
 *   .createLight()       -> { light, update(delta, elapsed, playerPos) }
 *                           criado UMA vez, pela cena do corredor.
 *   .registerWindow(w)   -> { anchor, getOpenness } de cada janela
 *   .intensity()         -> 0..1 do quadro atual (o brilho do vidro)
 *   .setDaytime(day)     -> liga/desliga a tempestade
 *   .isActive()
 * -------------------------------------------------
 */

window.LightningStorm = (function () {
  "use strict";

  // ---------- A luz ----------
  // Azul frio esbranquicado: relampago nao e a luz morna da luminaria
  // (0xffcf8a, ver models/lamp-factory.js). E o contraste entre as duas
  // que faz o clarao ler como "veio de fora".
  const COLOR = 0xc9d9ff;

  // Pico de intensidade. A luminaria de teto e 1.1 e o abajur 1.6 (ver
  // models/lamp-factory.js e models/table-lamp-factory.js): 3.0 poe o
  // clarao bem acima das duas sem estourar a quantizacao de 28 niveis do
  // acabamento PSX (dai para cima o comodo vira chapado branco e o
  // dithering aparece em faixas).
  const PEAK_INTENSITY = 3.0;

  // Alcance e queda no mesmo espirito das luminarias (9 e 2), so um
  // pouco mais longe: a luz nasce na parede da janela e precisa chegar
  // na parede do fundo do comodo (4.8 m nos comodos novos). No corredor
  // (22 m) ela acaba antes, e isso esta certo - o clarao ilumina o
  // TRECHO da janela, nao o corredor inteiro.
  const LIGHT_DISTANCE = 12;
  const LIGHT_DECAY = 2;

  // Quanto da luz sobra com a cortina fechada (ver CORTINA FECHADA).
  const CLOSED_FACTOR = 0.45;

  // ---------- O ritmo da tempestade (segundos) ----------
  // Espera antes do PRIMEIRO relampago: curta o bastante para o jogador
  // ver um logo na primeira noite, longa o bastante para nao cair em
  // cima da cutscene de entrada (ver cutscenes/entry-sequence.js).
  const FIRST_DELAY_MIN = 5;
  const FIRST_DELAY_MAX = 11;

  // Intervalo entre relampagos. Faixa larga de proposito: tempestade com
  // intervalo fixo vira metronomo, e metronomo nao assusta.
  const GAP_MIN = 7;
  const GAP_MAX = 19;

  // Cada relampago e um SURTO de 1 a 3 piscos - relampago de verdade
  // quase nunca e um pisco unico e limpo.
  const PULSES_MIN = 1;
  const PULSES_MAX = 3;
  const PULSE_DUR_MIN = 0.08;
  const PULSE_DUR_MAX = 0.22;
  const PULSE_GAP_MIN = 0.05;
  const PULSE_GAP_MAX = 0.17;

  // Sorteio proprio (mulberry32), a mesma receita das fabricas do jogo.
  // Nao e Math.random so por higiene: com semente propria o ritmo da
  // tempestade fica reproduzivel se um dia alguem precisar depurar.
  let seed = 0x1f2e3d4c;
  function rand() {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function between(min, max) {
    return min + (max - min) * rand();
  }

  // ---------- Estado ----------
  const registered = [];
  let active = true; // o jogo comeca de NOITE (ver scripts/main.js)
  let clock = 0; // segundos, vem do `elapsed` do jogo
  let armed = false; // o primeiro relampago ja foi agendado?
  let nextAt = 0;
  let burst = null; // { pulses: [{ at, dur }], end }
  let level = 0; // 0..1 do quadro atual
  let target = null; // a janela escolhida para o relampago atual

  function makeBurst(startAt) {
    const count = Math.floor(between(PULSES_MIN, PULSES_MAX + 0.999));
    const pulses = [];
    let at = startAt;
    for (let i = 0; i < count; i++) {
      const dur = between(PULSE_DUR_MIN, PULSE_DUR_MAX);
      pulses.push({ at: at, dur: dur });
      at += dur + between(PULSE_GAP_MIN, PULSE_GAP_MAX);
    }
    return { pulses: pulses, end: at };
  }

  // O desenho de UM pisco: sobe quase instantaneo e cai rapido. ATTACK e
  // uma fracao pequena da duracao porque e isso que separa relampago
  // (estouro) de lampada acendendo (rampa).
  const ATTACK = 0.12;
  function pulseShape(u) {
    if (u <= 0 || u >= 1) {
      return 0;
    }
    if (u < ATTACK) {
      return u / ATTACK;
    }
    const fall = (u - ATTACK) / (1 - ATTACK);
    return (1 - fall) * (1 - fall);
  }

  function burstLevel(now) {
    if (!burst) {
      return 0;
    }
    let out = 0;
    for (let i = 0; i < burst.pulses.length; i++) {
      const p = burst.pulses[i];
      const v = pulseShape((now - p.at) / p.dur);
      if (v > out) {
        out = v;
      }
    }
    return out;
  }

  /**
   * Cada janela do jogo se inscreve aqui na hora em que e construida
   * (ver models/window-factory.js).
   *
   *   entry.anchor      : Object3D alguns centimetros para DENTRO do
   *                       comodo, no meio da janela. E onde a luz do
   *                       clarao nasce quando esta janela e a escolhida.
   *   entry.getOpenness : 0 (cortina fechada) a 1 (aberta), opcional.
   */
  function registerWindow(entry) {
    if (!entry || !entry.anchor) {
      return;
    }
    registered.push(entry);
  }

  function setDaytime(daytime) {
    const day = daytime !== false;
    active = !day;
    if (day) {
      // Zera na hora: nada de um pisco atravessando o amanhecer.
      level = 0;
      burst = null;
      target = null;
      armed = false;
    }
  }

  function intensity() {
    return active ? level : 0;
  }

  /**
   * A luz compartilhada. Criada UMA vez, pela cena do corredor.
   *
   * Por que la: o corredor e a zona de referencia da casa - fica na
   * origem, sem giro (ver scenes/house-config.js), entao as coordenadas
   * locais dele SAO as do mundo e a luz pode ir para a posicao mundial
   * da janela sem conversao nenhuma. A conversao existe abaixo
   * (worldToLocal) de qualquer forma, para o dia em que alguem pendurar
   * esta luz em outro lugar.
   */
  function createLight() {
    const light = new THREE.PointLight(COLOR, 0, LIGHT_DISTANCE, LIGHT_DECAY);
    light.name = "clarao-relampago";
    const worldPos = new THREE.Vector3();

    // A janela mais proxima do jogador, em planta (X/Z): altura nao
    // importa aqui, todas as janelas do jogo estao na mesma faixa.
    function pickTarget(playerPos) {
      if (!registered.length) {
        return null;
      }
      const px = playerPos && typeof playerPos.x === "number" ? playerPos.x : 0;
      const pz = playerPos && typeof playerPos.z === "number" ? playerPos.z : 0;
      let best = null;
      let bestDist = Infinity;
      for (let i = 0; i < registered.length; i++) {
        const entry = registered[i];
        entry.anchor.getWorldPosition(worldPos);
        const dx = worldPos.x - px;
        const dz = worldPos.z - pz;
        const dist = dx * dx + dz * dz;
        if (dist < bestDist) {
          bestDist = dist;
          best = entry;
        }
      }
      return best;
    }

    function update(delta, elapsed, playerPos) {
      // O relogio do jogo: `elapsed` e monotonico e vem do mesmo
      // THREE.Clock do resto do jogo (ver scripts/main.js). O `delta`
      // fica de reserva para quem chamar sem ele.
      clock = typeof elapsed === "number" ? elapsed : clock + (delta || 0);

      if (!active) {
        level = 0;
        light.intensity = 0;
        return;
      }

      if (!armed) {
        armed = true;
        nextAt = clock + between(FIRST_DELAY_MIN, FIRST_DELAY_MAX);
      }

      if (!burst && clock >= nextAt) {
        burst = makeBurst(clock);
        // A janela do relampago e escolhida AQUI, uma vez, no instante em
        // que ele cai (ver o topo do arquivo).
        target = pickTarget(playerPos);
      }

      level = burstLevel(clock);

      if (burst && clock > burst.end) {
        level = 0;
        target = null;
        burst = null;
        nextAt = clock + between(GAP_MIN, GAP_MAX);
      }

      if (!target || level <= 0) {
        light.intensity = 0;
        return;
      }

      target.anchor.getWorldPosition(worldPos);
      light.position.copy(worldPos);
      if (light.parent) {
        light.parent.worldToLocal(light.position);
      }

      const openness =
        typeof target.getOpenness === "function" ? target.getOpenness() : 1;
      const through = CLOSED_FACTOR + (1 - CLOSED_FACTOR) * openness;
      light.intensity = PEAK_INTENSITY * level * through;
    }

    return {
      light: light,
      update: update,
    };
  }

  return {
    COLOR: COLOR,
    PEAK_INTENSITY: PEAK_INTENSITY,
    createLight: createLight,
    registerWindow: registerWindow,
    intensity: intensity,
    setDaytime: setDaytime,
    isActive: function () {
      return active;
    },
  };
})();
