/**
 * scripts/atmosphere.js
 * -------------------------------------------------
 * Dono único da ATMOSFERA da cena: a névoa (`scene.fog`) e a cor de
 * fundo do renderer (`setClearColor`). Duas paletas, NIGHT e DAY, e um
 * único caminho entre elas: `setMorning()`.
 *
 * MOTIVO DE EXISTIR: até agora a névoa era uma linha solta no meio de
 * scripts/main.js (`scene.fog = new THREE.Fog(0x05040a, 2.5, 13)`),
 * criada uma vez e nunca mais tocada — a noite era o único estado
 * possível do jogo. Com a vista externa (grama de
 * models/exterior-factory.js + o céu azul de models/sky-factory.js)
 * isso passou a ser um problema visível: aquela névoa é PRETA e fica
 * 100% opaca a 13 unidades, então de dia a grama distante morria num
 * breu de noite e formava uma faixa escura entre o chão e o céu azul,
 * bem no meio do vão da janela.
 *
 * A névoa é da CENA, não do corredor nem do quarto — os dois
 * compartilham a mesma (ver scripts/main.js), do mesmo jeito que já
 * compartilham a luz ambiente. Por isso ela NÃO virou mais um
 * `setMorning()` dentro de cada cena (como a luz da manhã e o céu, que
 * são peças próprias de cada cenário): quem chama o daqui é a própria
 * sequência de dormir, uma única vez, no mesmo instante de tela preta
 * em que chama os outros dois (ver cutscenes/sleep-sequence.js).
 *
 * A troca é INSTANTÂNEA de propósito, sem nenhuma animação: ela
 * acontece com a tela completamente preta, entre o fade-in e o
 * fade-out da sequência de dormir — ninguém vê a transição, então
 * animar seria complexidade a troco de nada (mesmo princípio das
 * outras trocas de estado "escondidas pelo preto" do jogo, ver
 * scripts/main.js/enterRoom()).
 *
 * `Atmosphere.DAY.fogColor` também é lido pelas duas cenas na hora de
 * criar o céu (`hazeColor` em models/sky-factory.js): abaixo da linha
 * do horizonte o céu cai exatamente para a cor da névoa, então o ponto
 * em que a grama se perde na distância e o começo do céu se encontram
 * na mesma cor, sem nenhuma emenda visível. Os dois valores precisam
 * continuar sendo o MESMO — daí ele viver aqui, num lugar só, em vez
 * de aparecer copiado em três arquivos.
 *
 * window.Atmosphere.create(scene, renderer)
 *   -> { setDaytime, setMorning, isMorning }
 * -------------------------------------------------
 */

window.Atmosphere = (function () {
  "use strict";

  // ---------- Noite (estado inicial do jogo) ----------
  // Exatamente os valores que estavam soltos em scripts/main.js antes
  // deste arquivo existir — nada muda no jogo antes de o jogador
  // dormir. Névoa escura curta: some com as extremidades do corredor
  // no breu, reforça o clima de terror e esconde o limite de desenho.
  const NIGHT = Object.freeze({
    fogColor: 0x05040a,
    fogNear: 2.5,
    fogFar: 13,
    clearColor: 0x000000,

    // Cor e intensidade da NEBLINA VOLUMETRICA do cenario exterior
    // (models/fog-volume-factory.js). Nao tem nada a ver com a
    // `scene.fog` acima, que continua sendo a nevoa de distancia de
    // TODA a cena, inclusive de dentro da casa: estas duas linhas
    // descrevem a nevoa fisica que ocupa o ar la fora, do lado de la
    // do vidro das tres janelas.
    //
    // Moram aqui, e nao na propria fabrica, pelo mesmo motivo que a
    // cor do horizonte do ceu ja morava (ver o comentario no topo do
    // arquivo): este e o dono unico da atmosfera. A neblina obedece a
    // paleta em vigor em vez de ter opiniao propria, entao noite e dia
    // continuam sendo decididos num lugar so.
    //
    // De noite ela e quase preta-azulada de proposito. Nao ha uma
    // unica fonte de luz do lado de fora (so a ambiente 0x141018 a
    // 0.35, ver scripts/main.js), entao uma nevoa cinza clara la fora
    // pareceria fosforescente - o erro classico de neblina noturna.
    // Este tom fica um passo acima do chao e da mata escurecidos: le
    // como ar denso, nao como luz.
    mistColor: 0x151b22,

    // Multiplicador de densidade da neblina (1 = a calibracao cheia
    // descrita em models/fog-volume-factory.js). De noite a propria
    // `scene.fog` acima ja fecha 100% preta a 13 unidades, entao a
    // neblina so tem os primeiros metros da clareira para trabalhar -
    // insistir na densidade cheia ali so entupiria o pouco que a janela
    // ainda mostra.
    mistDensity: 0.55,
  });

  // ---------- Dia (depois de dormir e acordar) ----------
  const DAY = Object.freeze({
    // Azul-acinzentado empoeirado, de bruma distante. NÃO é o azul
    // claro do céu (uHorizonColor = 0xc3e4f7 em
    // models/sky-factory.js): esta cor também tinge o fundo do
    // corredor por dentro, e um cinza-claro estourado lá no fim do
    // corredor pareceria máquina de fumaça dentro da casa. Este
    // tom médio lê como "distância" nos dois lados da janela —
    // bruma/mata longe lá fora, profundidade escurecida aqui dentro —
    // e ainda continua fazendo o serviço original da névoa: esconder
    // o fim do corredor.
    fogColor: 0x7d93a6,

    // Bem mais longe que de noite, e por dois motivos:
    //
    //  - `fogNear` 7: quarto (6 x 6) e primeiros metros do corredor
    //    ficam PRATICAMENTE SEM névoa de dia. De noite a névoa
    //    fechava já a 2.5 unidades, no meio do próprio quarto — de
    //    manhã isso pareceria neblina dentro de casa. O ar limpo por
    //    perto é metade da sensação de "amanheceu".
    //
    //  - `fogFar` 28: precisa fechar por completo ANTES da borda do
    //    "remendo" de grama de cada janela, que fica a
    //    ExteriorFactory.GROUND_SIZE = 30 unidades da parede — senão
    //    o jogador enxerga o fim da grama como uma linha reta contra
    //    o céu (o plano simplesmente acaba ali). 28 dá a margem de
    //    segurança: a grama já sumiu na bruma antes de acabar. Se um
    //    dia GROUND_SIZE mudar, este número precisa continuar
    //    confortavelmente abaixo dele. Também segue bem abaixo do
    //    limite de desenho da câmera (`far` = 50, ver
    //    scripts/main.js), então nada é cortado em seco.
    fogNear: 7,
    fogFar: 28,

    // Mesma cor da névoa: qualquer pixel que por acaso não receba
    // nem geometria nem céu se resolve na cor do horizonte, nunca num
    // buraco preto. Na prática o céu (models/sky-factory.js) cobre a
    // tela inteira de dia, então isto é só cinto de segurança.
    clearColor: 0x7d93a6,

    // Ver o bloco equivalente em NIGHT acima. De dia a neblina do
    // exterior fica um tom ACIMA da cor da nevoa de distancia
    // (`fogColor`), nunca branca: cinza-azulado frio e dessaturado, a
    // paleta de terror psicologico pedida. Um pouco mais clara que a
    // bruma do fundo para os bancos de nevoa proximos se lerem contra a
    // mata escura, e proxima o bastante dela para que, la longe, os
    // dois se encontrem sem emenda - e a mesma cor em que o ceu tambem
    // cai abaixo do horizonte (ver hazeColor em models/sky-factory.js).
    mistColor: 0x8e9ba4,
    mistDensity: 1.0,
  });

  function apply(scene, renderer, palette) {
    scene.fog.color.set(palette.fogColor);
    scene.fog.near = palette.fogNear;
    scene.fog.far = palette.fogFar;
    renderer.setClearColor(palette.clearColor, 1);
  }

  /**
   * Cria a atmosfera e já aplica a paleta da NOITE na cena/renderer
   * (estado inicial do jogo) — quem chama não precisa mexer em
   * `scene.fog` nem em `setClearColor` em lugar nenhum.
   *
   * Uma única instância de `THREE.Fog` do início ao fim: `setMorning()`
   * só troca cor/near/far dela. Substituir o objeto `scene.fog` por um
   * novo obrigaria a recompilar todo material já na GPU (o three.js
   * decide os chunks de fog em tempo de compilação), o que daria um
   * engasgo de vários quadros — invisível durante o fade preto, mas
   * caro à toa num celular.
   */
  function create(scene, renderer) {
    scene.fog = new THREE.Fog(NIGHT.fogColor, NIGHT.fogNear, NIGHT.fogFar);
    apply(scene, renderer, NIGHT);

    let morning = false;

    /**
     * Troca a paleta em vigor: `true` = DIA, `false` = NOITE.
     *
     * O JOGO só anda para frente (`setMorning()` abaixo, uma única vez,
     * pela sequência de dormir). Quem usa os dois sentidos é o EDITOR:
     * o controle de HORÁRIO da barra de ferramentas (ver
     * editor/editor-ui.js) precisa poder VOLTAR para a noite, para o
     * cenário ser conferido nos dois estados sem reabrir o jogo.
     *
     * Por isso a paleta virou um interruptor em vez de um caminho só:
     * NIGHT e DAY já descreviam os dois estados por inteiro — faltava
     * apenas poder aplicar qualquer uma das duas a qualquer momento.
     * Nada aqui é animado, pelo mesmo motivo de sempre (ver o topo).
     */
    function setDaytime(daytime) {
      morning = daytime !== false;
      apply(scene, renderer, morning ? DAY : NIGHT);
    }

    // Chamada uma única vez pela sequência de dormir, com a tela
    // completamente preta (ver comentário no topo do arquivo), junto
    // de `room.setMorning()` e `corridor.setMorning()`. Continua
    // existindo com o mesmo nome e o mesmo efeito de sempre: é só o
    // atalho de `setDaytime(true)`.
    function setMorning() {
      setDaytime(true);
    }

    function isMorning() {
      return morning;
    }

    return {
      setDaytime: setDaytime,
      setMorning: setMorning,
      isMorning: isMorning,
    };
  }

  return {
    NIGHT: NIGHT,
    DAY: DAY,
    create: create,
  };
})();
