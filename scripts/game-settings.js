/**
 * scripts/game-settings.js
 * -------------------------------------------------
 * Estado global das configurações do jogo (Áudio, Sensibilidade,
 * Idioma) — lido e escrito pela tela de Configurações
 * (menu/settings.js) e consumido por quem precisar (ex.:
 * scripts/player-controller.js, para a sensibilidade da câmera).
 *
 * Persistido em localStorage (com fallback silencioso se não
 * estiver disponível — ex.: alguma WebView mais restrita), para as
 * escolhas do jogador sobreviverem a um fechar/abrir do jogo.
 * Enquanto o jogo está rodando, qualquer alteração feita na tela de
 * Configurações já vale na hora para quem ler os valores abaixo —
 * nenhum sistema guarda uma cópia própria "congelada" desses
 * números.
 *
 * Áudio: atualmente nenhum som/música está implementado no jogo
 * (ver audio/README.md). Os volumes abaixo já ficam armazenados,
 * separados entre Música e Efeitos sonoros, e prontos: quando
 * música/efeitos forem adicionados no futuro, o código novo só
 * precisa ler getMusicVolume()/getSfxVolume() (ou usar onChange
 * para reagir a mudanças ao vivo) em vez de inventar um novo
 * sistema de volume do zero.
 *
 * Idioma: guarda só a escolha atual ("pt-BR" ou "en") — nenhuma
 * tradução de fato acontece ainda, de propósito (ver comentário em
 * menu/settings.js). Serve de base para quando o sistema de
 * tradução for adicionado numa atualização futura.
 * -------------------------------------------------
 */

window.GameSettings = (function () {
  const STORAGE_KEY = "corredor-psx:settings";

  // Sensibilidade da câmera: o slider vai de 0 a 100; o valor padrão
  // (50) precisa corresponder exatamente à sensibilidade que o jogo
  // já usava antes desta tela existir (ver LOOK_SENSITIVITY_BASE em
  // scripts/player-controller.js) — por isso, em 50, o multiplicador
  // calculado abaixo é sempre exatamente 1.0, sem nenhuma mudança de
  // comportamento para quem nunca abrir Configurações.
  const SENSITIVITY_MIN_MULTIPLIER = 0.4; // extremo esquerdo do slider: câmera bem mais lenta
  const SENSITIVITY_MAX_MULTIPLIER = 1.6; // extremo direito do slider: câmera bem mais rápida

  const DEFAULTS = {
    musicVolume: 80, // 0-100
    sfxVolume: 80, // 0-100
    cameraSensitivity: 50, // 0-100 — 50 = comportamento original do jogo
    language: "pt-BR", // "pt-BR" | "en"
  };

  let state = Object.assign({}, DEFAULTS);
  const listeners = [];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        state = Object.assign({}, DEFAULTS, saved);
      }
    } catch (e) {
      // localStorage indisponível (ex.: WebView restrita) — segue só
      // com os valores padrão nesta sessão, sem quebrar o jogo.
    }
  }

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Mesma tolerância de load() acima: sem persistência entre
      // sessões nesse caso, mas o jogo continua funcionando
      // normalmente com o estado em memória.
    }
  }

  function notify() {
    listeners.forEach(function (fn) {
      fn(state);
    });
  }

  function update(patch) {
    state = Object.assign({}, state, patch);
    persist();
    notify();
  }

  load();

  return {
    // ---------- Áudio ----------
    getMusicVolume: function () {
      return state.musicVolume;
    },
    setMusicVolume: function (value) {
      update({ musicVolume: clamp(value, 0, 100) });
    },
    getSfxVolume: function () {
      return state.sfxVolume;
    },
    setSfxVolume: function (value) {
      update({ sfxVolume: clamp(value, 0, 100) });
    },

    // ---------- Sensibilidade ----------
    getCameraSensitivity: function () {
      return state.cameraSensitivity;
    },
    setCameraSensitivity: function (value) {
      update({ cameraSensitivity: clamp(value, 0, 100) });
    },
    // Multiplicador de fato aplicado sobre LOOK_SENSITIVITY_BASE em
    // scripts/player-controller.js. Mantém a fórmula num único
    // lugar, para o slider (0-100) e a velocidade real da câmera
    // nunca ficarem dessincronizados.
    getCameraSensitivityMultiplier: function () {
      const t = state.cameraSensitivity / 100;
      return (
        SENSITIVITY_MIN_MULTIPLIER +
        t * (SENSITIVITY_MAX_MULTIPLIER - SENSITIVITY_MIN_MULTIPLIER)
      );
    },

    // ---------- Idioma ----------
    getLanguage: function () {
      return state.language;
    },
    setLanguage: function (value) {
      if (value !== "pt-BR" && value !== "en") return;
      update({ language: value });
    },

    // ---------- Assinatura de mudanças ----------
    // Reservado para quem precisar reagir ao vivo a uma alteração
    // (ex.: um futuro AudioManager ajustando o volume de uma música
    // já tocando assim que o slider se mexe).
    onChange: function (fn) {
      listeners.push(fn);
    },
  };
})();
