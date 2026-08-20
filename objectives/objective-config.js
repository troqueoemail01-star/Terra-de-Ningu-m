/**
 * objectives/objective-config.js
 * -------------------------------------------------
 * Dados "puros" de cada objetivo/etapa da história — nenhuma lógica
 * aqui, só a definição de quais objetos interativos continuam
 * funcionando normalmente e quais ficam bloqueados (respondendo com
 * um diálogo no lugar da ação de sempre) em cada etapa. Mesmo
 * espírito de scenes/corridor-config.js e dialogue/dialogue-config.js:
 * adicionar uma nova etapa da história no futuro é só acrescentar um
 * novo objeto neste array, sem tocar no código que interpreta os
 * dados (objectives/objective-system.js) nem no que os aplica
 * (scripts/main.js).
 *
 * Cada objetivo tem:
 *  - id: identificador da etapa (uso interno; útil já desde já para
 *    depurar, e para uma futura tela/HUD de objetivo).
 *  - allowedKinds: quais "kind" de interativo (ver a lista única em
 *    scenes/corridor-scene.js — "door", "window", "drawer", "phone",
 *    "lightSwitch") continuam funcionando normalmente nesta etapa.
 *    Tudo que não estiver aqui fica bloqueado por padrão.
 *  - allowedIds: opcional — libera um objeto específico por id, mesmo
 *    que o "kind" dele não esteja em allowedKinds (ex.: liberar só a
 *    porta "MEU QUARTO", sem liberar as outras 5 portas do corredor,
 *    que continuam do "kind" "door" bloqueado normalmente). Tem
 *    prioridade sobre allowedKinds (objectives/objective-system.js
 *    checa os dois em isAllowed()).
 *  - blockedResponses: qual diálogo (chave de
 *    dialogue/dialogue-config.js) tocar quando o jogador tentar
 *    interagir com algo bloqueado.
 *      - byId: resposta para um objeto específico (prioridade maior).
 *      - byKind: resposta padrão para todo objeto daquele "kind" que
 *        não tenha uma entrada própria em byId (ex.: as duas janelas
 *        do corredor, sem precisar repetir a mesma chave duas vezes).
 * -------------------------------------------------
 */

window.ObjectiveConfig = {
  objectives: [
    {
      id: "interagir-telefone",

      // Nesta primeira etapa, o interruptor de luz continua livre (não
      // depende da história) e o telefone é o próprio objetivo — por
      // isso os dois seguem com sua ação normal (ver README: interagir
      // com o telefone agora dispara a mini cutscene de fade + diálogo
      // da ligação com Ravi, ver cutscenes/phone-sequence.js e
      // scripts/main.js). Todo o resto (portas, janelas, gaveta) fica
      // bloqueado, respondendo com diálogo no lugar da ação normal.
      // "ball" entra aqui por causa da integracao dos dois ambientes num
      // mundo so (ver scenes/house-config.js): a porta "MEU QUARTO" pode
      // estar aberta desde o inicio, entao o jogador consegue chegar ao
      // quarto ja nesta etapa. A bola e um brinquedo sem consequencia
      // nenhuma na historia - liberada, ela responde ao toque como
      // sempre; bloqueada, ela simplesmente nao fazia nada (nao ha fala
      // cadastrada para ela).
      allowedKinds: ["lightSwitch", "phone", "ball"],

      blockedResponses: {
        byId: {
          "entrada-saida": "porta-entrada-bloqueada",
          "quarto-01": "porta-sem-nada",
          "quarto-02": "porta-sem-nada",
          "cozinha": "porta-sem-nada",
          "banheiro": "porta-sem-nada",
          "meu-quarto": "lembrete-ligar-ravi",
          "escrivaninha-quartos-gaveta": "lembrete-ligar-ravi",
        },
        byKind: {
          window: "janela-bloqueada",
          // Objetos do QUARTO nesta etapa: com a casa integrada num
          // mundo unico, o jogador pode entrar no quarto antes de ligar
          // para o Ravi, entao a cama, o guarda-roupa e a porta vista de
          // dentro precisam de resposta aqui - todas com o mesmo
          // lembrete que a porta "MEU QUARTO" ja dava do corredor.
          // Sem estas entradas, interagir com eles nesta etapa nao faria
          // absolutamente nada (getBlockedDialogueKey devolve null).
          // A cama, alem disso, esta travada por fora do sistema de
          // objetivos: a sequencia de dormir so pode comecar na etapa
          // seguinte (ver o caso "bed" em scripts/main.js).
          bed: "lembrete-ligar-ravi",
          wardrobe: "lembrete-ligar-ravi",
        },
      },
    },

    {
      id: "interagir-porta-meu-quarto",

      // Segunda etapa, ativada assim que a ligação com Ravi termina
      // (objectives.advance() é chamado no fim do diálogo "chamada-ravi"
      // — ver scripts/main.js e cutscenes/phone-sequence.js). O
      // interruptor de luz continua livre; o telefone deixa de ser o
      // objetivo (some de allowedKinds) e passa a responder só com uma
      // fala curta, igual à gaveta da escrivaninha (ver
      // "acho-melhor-dormir" em dialogue/dialogue-config.js) — nenhum
      // dos dois reinicia a ligação nem abre a gaveta de verdade. A
      // porta "MEU QUARTO" é o novo objetivo: `allowedIds` libera só
      // ela por id (não por "kind" — as outras 5 portas do corredor
      // continuam do "kind" "door", bloqueadas normalmente pelas
      // mesmas respostas de sempre, ver blockedResponses.byId abaixo).
      // Liberada, ela sai do caminho de diálogo de bloqueio e cai no
      // switch por "kind" de scripts/main.js, que reconhece esse id
      // específico e dispara a transição para o novo cenário do quarto
      // (fade in -> troca de cenário -> fade out, ver
      // cutscenes/room-transition.js e scenes/room-scene.js) — sem
      // diálogo nem qualquer outra interação nova. "ball" também
      // liberado por "kind" (todo objeto desse tipo — hoje só a bola
      // de futebol, ver scenes/room-scene.js): sem isso, o botão
      // "Interagir" nela cairia direto no bloqueio abaixo (sem
      // resposta cadastrada em blockedResponses = não faz nada, ver
      // scripts/main.js), e o pedido do usuário era justamente poder
      // pegá-la/largá-la (ver BallController.toggleHold).
      allowedKinds: ["lightSwitch", "ball"],
      allowedIds: ["meu-quarto"],

      blockedResponses: {
        byId: {
          "entrada-saida": "porta-entrada-bloqueada",
          "quarto-01": "porta-sem-nada",
          "quarto-02": "porta-sem-nada",
          "cozinha": "porta-sem-nada",
          "banheiro": "porta-sem-nada",
          "escrivaninha-quartos-telefone": "acho-melhor-dormir",
          "escrivaninha-quartos-gaveta": "acho-melhor-dormir",
          // Cama do quarto (ver models/bed-factory.js): NÃO entra
          // aqui de propósito. "bed" é tratado como caso especial em
          // scripts/main.js, por fora do sistema de objetivos —
          // depende do abajur estar aceso/apagado, não da etapa da
          // história (ver comentário sobre "kind": "bed" em
          // scenes/room-scene.js) — então uma entrada aqui nunca
          // chegaria a ser lida.
          // Guarda-roupas do quarto (ver models/wardrobe-factory.js):
          // mesmo caso da cama acima — "wardrobe" nunca entra em
          // allowedKinds, então toda tentativa de interação cai
          // automaticamente nesta resposta, sem exceção.
          "guarda-roupa-quarto": "guarda-roupa-dormir",
          // Porta interna do "MEU QUARTO" (ver scenes/room-scene.js):
          // mesmo "kind": "wardrobe" reservado do guarda-roupa acima,
          // então cai no mesmo mecanismo — aqui só precisa de uma
          // entrada própria por id porque o guarda-roupa não cobre
          // outros ids desse "kind" por padrão (blockedResponses não
          // tem byKind para "wardrobe" nesta etapa, só byId).
          // Mantida por compatibilidade: a porta interna separada do
          // quarto deixou de existir na integracao dos dois ambientes
          // (agora e UMA porta so, id "meu-quarto", ver
          // scenes/house-config.js). A entrada nao estorva e volta a
          // valer se algum dia o quarto for construido sozinho, sem o
          // mundo em volta (ver `entryDoorway` em
          // scenes/room-scene.js).
          "porta-interna-quarto": "guarda-roupa-dormir",
        },
        byKind: {
          window: "janela-bloqueada",
        },
      },
    },

    {
      id: "abrir-janelas",

      // Terceira etapa, ativada assim que o diálogo automático de
      // despertar termina (ver "acordar-primeira-noite" em
      // dialogue/dialogue-config.js e playWakeUpDialogue() em
      // scripts/main.js — objectives.advance() é chamado no fim
      // dele, mesmo princípio de playPhoneSequence acima). "window"
      // agora entra em allowedKinds — é o novo objetivo, então a
      // janela deixa de usar "janela-bloqueada" e passa a funcionar
      // normalmente (toggleCurtain). "ball" continua liberada pelo
      // mesmo motivo da etapa anterior (física da bola intacta, sem
      // nenhuma fala). Todo o resto do quarto — inclusive "bed" e
      // "lightSwitch" (abajur), que nas etapas anteriores tinham
      // tratamento próprio/ficavam sempre livres — passa a responder
      // com a mesma fala curta de lembrete enquanto a janela não for
      // aberta (ver "bed" && !sleepSequenceStarted em
      // scripts/main.js: a cama só cai neste bloco depois que a
      // sequência de dormir já rodou uma vez). Qualquer novo tipo de
      // interativo que vier a existir no quarto precisa de uma
      // entrada própria aqui embaixo — sem ela, getBlockedDialogueKey
      // devolve null e a interação simplesmente não faz nada.
      // A partir do momento em que o jogador volta do quarto para o
      // corredor (ver exitRoom() em scripts/main.js), esta MESMA etapa
      // continua valendo: das 3 janelas do jogo, a do quarto ja foi
      // aberta e faltam as 2 do corredor. Por isso "window" continua
      // liberado, mas agora com uma condicao (allowedKindsWhen abaixo):
      // so vale para janelas AINDA FECHADAS. Uma janela ja aberta deixa
      // de responder ao "Interagir" (nao da mais para fechar a cortina
      // no meio do objetivo) e passa a cair na resposta de bloqueio,
      // igual a qualquer outro objeto — era exatamente o pedido: so as
      // janelas que ainda precisam ser abertas contam como objetivo.
      allowedKinds: ["ball", "window"],
      allowedKindsWhen: { window: "isClosed" },

      // Duas familias de resposta nesta etapa, porque ela atravessa os
      // dois cenarios:
      //  - objetos do QUARTO (cama, guarda-roupa/porta interna e o
      //    abajur do criado-mudo) seguem com o lembrete de antes
      //    ("abrir-janela-primeiro"), sem nenhuma mudanca em relacao ao
      //    que ja existia;
      //  - objetos do CORREDOR (as 6 portas, a gaveta, o telefone, o
      //    interruptor e as janelas ja abertas) usam a fala nova
      //    "precisa-abrir-janelas" (ver dialogue/dialogue-config.js).
      // "lightSwitch" aparece nos dois lugares (abajur do quarto e
      // interruptor do corredor), entao o corredor precisa de uma
      // entrada propria por id — byId tem prioridade sobre byKind (ver
      // getBlockedDialogueKey em objectives/objective-system.js).
      blockedResponses: {
        byId: {
          "interruptor-corredor": "precisa-abrir-janelas",
          "interruptor-cozinha": "precisa-abrir-janelas",
          "interruptor-banheiro": "precisa-abrir-janelas",
          "interruptor-varanda": "precisa-abrir-janelas",
          // Os dois interruptores novos desta atualizacao (QUARTO 01 e
          // QUARTO 02, ver `lightSwitches` em scenes/house-config.js).
          // Precisam de entrada por ID pelo mesmo motivo dos quatro de
          // cima: o byKind "lightSwitch" logo abaixo e a fala do ABAJUR do
          // MEU QUARTO ("abrir-janela-primeiro"), que nao faz sentido na
          // boca de quem esta do outro lado da casa. Sem estas duas linhas
          // o jogador ouviria a fala errada nesta etapa.
          "interruptor-quarto-01": "precisa-abrir-janelas",
          "interruptor-quarto-02": "precisa-abrir-janelas",
        },
        byKind: {
          bed: "abrir-janela-primeiro",
          lightSwitch: "abrir-janela-primeiro",
          wardrobe: "abrir-janela-primeiro",
          door: "precisa-abrir-janelas",
          drawer: "precisa-abrir-janelas",
          phone: "precisa-abrir-janelas",
          window: "precisa-abrir-janelas",
        },
      },
    },

    {
      id: "atender-telefone",

      // Quarta etapa, ativada no instante em que a ULTIMA das 3 janelas
      // do jogo e aberta (ver areAllWindowsOpen()/finishWindowsObjective()
      // em scripts/main.js): o dialogo "janelas-abertas" toca na hora e,
      // 3 segundos depois que ele termina, o telefone comeca a tocar
      // sozinho e nao para ate ser atendido (ver
      // PhoneAudio.startIncomingRing()).
      //
      // So o telefone da escrivaninha fica liberado, por id (o "kind"
      // "phone" em si nao entra em allowedKinds: se um dia existir outro
      // telefone na casa, ele nao vira objetivo por tabela). Interagir
      // com ele enquanto esta tocando dispara a segunda ligacao (mesmo
      // fade da primeira, ver cutscenes/phone-sequence.js); nos 3
      // segundos antes de comecar a tocar, o toque nele nao faz nada —
      // quem cuida disso e o proprio scripts/main.js, que so abre a
      // sequencia com o telefone de fato tocando.
      allowedKinds: [],
      allowedIds: ["escrivaninha-quartos-telefone"],

      // Kael acabou de dizer que vai procurar a carta do Ravi, entao
      // ja e essa a fala de qualquer outra interacao daqui em diante.
      // A gaveta da escrivaninha, de proposito, NAO tem entrada aqui
      // (nem em byId nem em byKind): sem resposta cadastrada,
      // getBlockedDialogueKey devolve null e interagir com ela nao faz
      // absolutamente nada — a interacao dela fica para a proxima
      // atualizacao.
      blockedResponses: {
        byKind: {
          door: "precisa-ler-carta",
          window: "precisa-ler-carta",
          lightSwitch: "precisa-ler-carta",
          bed: "precisa-ler-carta",
          wardrobe: "precisa-ler-carta",
          ball: "precisa-ler-carta",
        },
      },
    },

    {
      id: "ler-carta",

      // Quinta etapa, ativada assim que o dialogo da segunda ligacao
      // termina por completo (objectives.advance() no onComplete de
      // PhoneSequence.playIncoming, ver scripts/main.js) — mesmo
      // principio das etapas anteriores.
      //
      // Objetivo: LER A CARTA DO RAVI, que esta na gaveta da
      // escrivaninha. A GAVETA e o unico interativo liberado da etapa
      // inteira, e por id (nao por "kind"): se um dia existir outra
      // gaveta na casa, ela nao vira objetivo por tabela. Interagir com
      // ela abre a gaveta de verdade e mostra o pop-up com o que tem
      // dentro (ver o caso "drawer" em scripts/main.js e
      // interface/drawer-popup.js).
      //
      // Todo o resto — inclusive o telefone, que ja cumpriu o papel
      // dele — responde "(Preciso ler a carta do Ravi)." e nao avanca
      // nada da historia. "drawer" tambem aparece em blockedResponses
      // abaixo so por seguranca: allowedIds tem prioridade sobre
      // qualquer bloqueio (ver isAllowed em
      // objectives/objective-system.js), entao a gaveta da
      // escrivaninha nunca chega la — mas uma gaveta futura, sim.
      allowedKinds: [],
      allowedIds: ["escrivaninha-quartos-gaveta"],

      blockedResponses: {
        byKind: {
          door: "precisa-ler-carta-ravi",
          window: "precisa-ler-carta-ravi",
          phone: "precisa-ler-carta-ravi",
          lightSwitch: "precisa-ler-carta-ravi",
          bed: "precisa-ler-carta-ravi",
          wardrobe: "precisa-ler-carta-ravi",
          ball: "precisa-ler-carta-ravi",
          drawer: "precisa-ler-carta-ravi",
        },
      },
    },
  ],
};
