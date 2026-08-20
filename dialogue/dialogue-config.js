/**
 * dialogue/dialogue-config.js
 * -------------------------------------------------
 * Falas de cada sequência de diálogo, organizadas por chave.
 * Mantido separado da lógica de exibição (dialogue-box.js) pelo
 * mesmo motivo do cutscenes/cutscene-config.js: adicionar um novo
 * diálogo no futuro é só acrescentar uma nova chave aqui, sem
 * tocar no código que digita/anima o texto.
 *
 * Cada linha tem "character" (nome exibido em amarelo, antes dos
 * dois-pontos) e "text" (a fala, exibida em branco).
 * -------------------------------------------------
 */

window.DialogueConfig = {
  // Dialogo da CUTSCENE DE ABERTURA, no carro (ver
  // cutscenes/road-cutscene.js): a ligacao de radio que o Ravi faz
  // enquanto Kael volta pra casa pela estrada de terra. E o primeiro
  // dialogo do jogo, antes de qualquer gameplay - o texto e do jogador,
  // copiado fala por fala, inclusive a primeira, que sai como "???"
  // (Kael atendendo sem saber quem e).
  "cutscene-estrada-ravi": [
    { character: "???", text: "Er... alô?" },
    { character: "Ravi", text: "Eaê, Kael. Aqui é o Ravi." },
    { character: "Ravi", text: "Tô te ligando pra saber se deu tudo certo ai." },
    { character: "Ravi", text: "Você ficou de sair pra buscar recursos na base da P.H." },
    { character: "Kael", text: "Tá tudo tranquilo." },
    { character: "Kael", text: "Na verdade, estou voltando agora pra casa." },
    { character: "Ravi", text: "Hm..." },
    { character: "Ravi", text: "Certo." },
    { character: "Ravi", text: "Toma cuidado na estrada, seu barbeiro." },
    { character: "Kael", text: "Cala a boca, seu merdinha." },
    { character: "Kael", text: "Tá achando que eu sou você é?" },
    { character: "Ravi", text: "Vai ver se eu tô na esquina, otário." },
    { character: "Kael", text: "HaHaHa..." },
    { character: "Ravi", text: "Mas ai, cara." },
    { character: "Ravi", text: "Como tem sido as coisas com os visitantes?" },
    { character: "Kael", text: "Indo bem, eu acho." },
    { character: "Kael", text: "Os últimos visitantes que abriguei foram embora faz 4 dias." },
    { character: "Kael", text: "E contigo, como tem sido?" },
    { character: "Ravi", text: "Pra mim tá difícil, viu." },
    { character: "Ravi", text: "Meus visitantes foram embora há mais de uma semana" },
    { character: "Ravi", text: "Estou ficando sem grana já." },
    { character: "Kael", text: "Qualquer coisa, passa lá em casa, cara." },
    { character: "Kael", text: "Posso te dar uma ajuda." },
    { character: "Kael", text: "Tenho recebido bastante gente nos últimos dias." },
    { character: "Ravi", text: "Acho que as pessoas da minha região já devem ter sedido ao vírus Tema." },
    { character: "Ravi", text: "Eu bem que queria te fazer uma vista, mas tá difícil." },
    { character: "Ravi", text: "Tem muitos infectados por aqui." },
    { character: "Kael", text: "Pô, cara, que pena..." },
    { character: "Kael", text: "A gente da um jeito." },
    { character: "Ravi", text: "Relaxa, vou dar um jeito de meter o pé daqui." },
    { character: "Ravi", text: "Fiquei sabendo que, na região leste, as coisas estão mais tranquilas." },
    { character: "Ravi", text: "Aliás, não se preocupe comigo, beleza?" },
    { character: "Ravi", text: "Continue recebendo os visitantes." },
    { character: "Ravi", text: "Além de dinheiro e itens, você ainda consegue companhia." },
    { character: "Ravi", text: "Não queira ficar sozinho no meio desse caos." },
    { character: "Ravi", text: "Sempre verifique atentamente as pessoas." },
    { character: "Ravi", text: "Nunca deixe um infectado entrar na sua casa..." },
    { character: "Kael", text: "Er... Eu sei disso." },
    { character: "Ravi", text: "Mas, enfim... Vou indo nessa." },
    { character: "Ravi", text: "Quando chegar na sua casa, me liga pelo telefone." },
    { character: "Ravi", text: "Estou testando uma nova linha." },
    { character: "Ravi", text: "E também quero ter certeza de que você chegou em casa bem." },
    { character: "Kael", text: "Beleza, qualquer coisa, me liga também." },
    { character: "Kael", text: "Posso dar um jeito de ajudar." },
    { character: "Ravi", text: "Valeu, cara." },
  ],

  // Diálogo da mini cutscene de entrada (ver scripts/main.js ->
  // cutscenes/entry-sequence.js), logo após o jogador "acordar" e a
  // câmera terminar de subir.
  "entrada-kael": [
    { character: "Kael", text: "Ahh... Finalmente. Nem tão doce lar." },
    { character: "Kael", text: "Acho que eu deveria ligar para o Ravi agora." },
  ],

  // Respostas do primeiro objetivo da história ("Interagir com o
  // telefone" — ver objectives/objective-config.js): tocadas quando
  // o jogador tenta interagir com algo ainda bloqueado nesta etapa,
  // no lugar da ação normal do objeto.
  "porta-entrada-bloqueada": [
    { character: "Kael", text: "(Está tarde, não quero sair agora)." },
  ],
  "porta-sem-nada": [
    { character: "Kael", text: "(Não tenho nada para fazer aqui)." },
  ],
  "janela-bloqueada": [
    { character: "Kael", text: "(É melhor não abrir isso agora)." },
  ],
  "lembrete-ligar-ravi": [
    { character: "Kael", text: "(Preciso ligar para o Ravi.)" },
  ],

  // Diálogo da ligação com Ravi, tocado logo após o fade-out da mini
  // cutscene do telefone (ver cutscenes/phone-sequence.js), quando o
  // jogador interage com o telefone da escrivaninha — conclusão do
  // primeiro objetivo da história ("Interagir com o telefone").
  "chamada-ravi": [
    { character: "Kael", text: "Hm... Alô? Ravi?" },
    { character: "Kael", text: "..." },
    { character: "Ravi", text: "Opa, foi mal, eu estava só ajustando umas coisas aqui." },
    { character: "Kael", text: "Acabei de chegar em casa, tá uma tempestade sinistra aqui. Parecendo que tá caindo o mundo." },
    { character: "Ravi", text: "Aqui tá chovendo também, mas é pouca coisa." },
    { character: "Ravi", text: "Eu até prefiro que seja assim. Não sei se minha casa iria aguentar uma tempestade." },
    { character: "Kael", text: "A minha casa até que é resistente. O que tá me incomodando é que tá chovendo direto há dias." },
    { character: "Kael", text: "Só durante o dia que alivia um pouco." },
    { character: "Ravi", text: "..." },
    { character: "Ravi", text: "Enfim, mano. Que bom que você chegou em casa em segurança." },
    { character: "Kael", text: "Aconteceu alguma coisa, Ravi?" },
    { character: "Kael", text: "Você parece um pouco... estranho." },
    { character: "Ravi", text: "..." },
    { character: "Ravi", text: "Que nada, cara. É só impressão sua." },
    { character: "Ravi", text: "Aliás, tá ficando muito tarde já. Não é bom ficar acordado até muito tarde." },
    { character: "Ravi", text: "Ninguém vai querer trabalhar com cansaço no dia seguinte." },
    { character: "Kael", text: "Pode apostar. Última vez que fiquei acordado até tarde, eu mal conseguia levantar o copo de café no dia seguinte." },
    { character: "Ravi", text: "Beleza. Vou revisar o que você deve fazer. Só para o caso de você ter esquecido, graças à sua memória de peixe." },
    { character: "Kael", text: "Vai pro inferno, Ravi." },
    { character: "Ravi", text: "hahaha!" },
    { character: "Ravi", text: "Se liga, cara. Pela manhã, você deve receber visitas." },
    { character: "Ravi", text: "Não abra a porta para qualquer um. Tenha certeza de que a pessoa não é um infectado." },
    { character: "Ravi", text: "Faça perguntas, revistas ou o que for necessário." },
    { character: "Ravi", text: "Porém... No final do dia, você não pode ficar sozinho." },
    { character: "Ravi", text: "Você... já sabe o que acontece, não é?" },
    { character: "Kael", text: "Aquela coisa... Certo?" },
    { character: "Ravi", text: "Isso." },
    { character: "Ravi", text: "Não sabemos nem como e quando ela vai aparecer. Só sabemos que ela não ataca grupos, apenas pessoas solitárias." },
    { character: "Ravi", text: "Eu te enviei uma carta. Nessa carta tem alguns sintomas que indicam os infectados. Você chegou a ler?" },
    { character: "Kael", text: "Er..." },
    { character: "Ravi", text: "Você não leu, certo?" },
    { character: "Kael", text: "Quase isso... Eu juro que guardei ela em algum lugar pra ler depois." },
    { character: "Ravi", text: "Faz o seguinte, cara. Por enquanto vai dormir. Amanhã você procura ela." },
    { character: "Ravi", text: "Qualquer dúvida, você pode sempre me ligar." },
    { character: "Kael", text: "Valeu, cara. Eu provavelmente não lembraria de tudo isso sem você. Você sabe, né? Minha memória é meio..." },
    { character: "Ravi", text: "Sim, eu sei bem disso." },
    { character: "Ravi", text: "Enfim. Boa noite, cara." },
    { character: "Kael", text: "Boa noite." },
  ],

  // Resposta usada depois que a ligação com Ravi já terminou (segundo
  // objetivo da história — ver objectives/objective-config.js): tocada
  // tanto ao tentar usar o telefone de novo quanto ao tentar abrir a
  // gaveta da escrivaninha, no lugar de "lembrete-ligar-ravi".
  "acho-melhor-dormir": [
    { character: "Kael", text: "(Acho melhor eu ir dormir.)" },
  ],

  // Resposta ao interagir com a cama do quarto (ver
  // models/bed-factory.js e scenes/room-config.js): por enquanto a
  // cama não faz nada além de mostrar esta fala — nenhuma ação de
  // deitar/dormir/apagar a luz de fato ainda implementada. Tocada
  // pelo mesmo mecanismo de "resposta bloqueada" das portas/janela
  // (ver objectives/objective-config.js), não por um caso novo em
  // scripts/main.js.
  "cama-apagar-luz": [{ character: "Kael", text: "(preciso apagar a luz)." }],

  // Resposta ao interagir com o guarda-roupas do quarto (ver
  // models/wardrobe-factory.js e scenes/room-config.js): mesmo caso da
  // cama acima — só esta fala por enquanto, nenhuma ação de abrir
  // porta/animação/som implementada ainda. Tocada pelo mesmo mecanismo
  // de "resposta bloqueada" das portas/janela/cama (ver
  // objectives/objective-config.js), não por um caso novo em
  // scripts/main.js.
  "guarda-roupa-dormir": [{ character: "Kael", text: "(Preciso dormir)." }],

  // Diálogo automático de Kael, tocado assim que a animação de
  // levantar da cama termina por completo, na manhã seguinte à
  // primeira noite (ver cutscenes/sleep-sequence.js e
  // playWakeUpDialogue() em scripts/main.js) — mesmo princípio do
  // diálogo de abertura da mini cutscene de entrada ("entrada-kael"
  // acima), só que disparado no meio do jogo em vez de na primeira
  // cutscene. A própria última fala já indica o que fazer a seguir
  // (abrir as janelas); não existe nenhum texto de objetivo próprio
  // na tela para isso ainda.
  "acordar-primeira-noite": [
    { character: "Kael", text: "Uhhraaihh... Que sono." },
    { character: "Kael", text: "Ando tendo uns sonhos bem esquisitos. É difícil dormir." },
    { character: "Kael", text: "Bom, hora de começar o dia." },
    { character: "Kael", text: "O que eu deveria fazer primeiro... Abrir as janelas? Procurar a carta do Ravi?" },
    { character: "Kael", text: "Bom, tanto faz." },
  ],

  // Resposta do terceiro objetivo da história ("abrir as janelas" —
  // ver objectives/objective-config.js): tocada ao tentar interagir
  // com qualquer objeto do quarto que não seja a janela (ou a bola de
  // futebol, que nem passa por aqui — ver "kind": "ball" em
  // scripts/main.js), enquanto o jogador ainda não abriu a janela.
  "abrir-janela-primeiro": [
    { character: "Kael", text: "(Melhor abrir as janelas logo)." },
  ],

  // ---------- Etapa "abrir as janelas", agora no CORREDOR ----------
  // Resposta usada quando o jogador VOLTA do quarto para o corredor
  // ainda na etapa "abrir-janelas" (ver objectives/objective-config.js):
  // das 3 janelas do jogo, a do quarto ja foi aberta e faltam as 2 do
  // corredor. Qualquer interativo que nao seja uma janela AINDA
  // FECHADA (portas, gaveta, telefone, interruptor do corredor, e ate
  // uma janela ja aberta) responde com esta fala no lugar da acao
  // normal. Os objetos do quarto seguem com o lembrete antigo
  // ("abrir-janela-primeiro" acima), para nao mudar nada do que ja
  // existia antes desta atualizacao.
  "precisa-abrir-janelas": [
    { character: "Kael", text: "(Preciso abrir as janelas)." },
  ],

  // Dialogo automatico de Kael, disparado no instante em que a ULTIMA
  // janela do jogo e aberta (as 3: a do quarto + as 2 do corredor —
  // ver areAllWindowsOpen() em scripts/main.js). Conclui a etapa
  // "abrir-janelas" e ja aponta o proximo passo da historia. Assim que
  // ele termina, comeca a contagem de 3 segundos ate o telefone tocar
  // sozinho (ver startIncomingPhoneCall() em scripts/main.js).
  "janelas-abertas": [
    { character: "Kael", text: "Aah... Finalmente, um pouco de vida nessa casa." },
    { character: "Kael", text: "Acho melhor eu procurar a carta do Ravi." },
  ],

  // Dialogo da SEGUNDA ligacao com o Ravi — desta vez e ele quem liga
  // (o telefone toca sozinho e fica tocando ate o jogador atender, ver
  // PhoneAudio.startIncomingRing() e PhoneSequence.playIncoming()).
  // Tocado logo depois do fade-out de atendimento, na mesma caixa de
  // dialogo e com a mesma estetica da primeira ligacao
  // ("chamada-ravi" acima).
  "chamada-ravi-manha": [
    { character: "Ravi", text: "Eaê, Kael. Dormiu bem?" },
    { character: "Kael", text: "..." },
    { character: "Kael", text: '"Bem" é uma palavra muito forte.' },
    { character: "Kael", text: "Eu diria que eu sobrevivi a essa noite." },
    { character: "Ravi", text: "Hahahaha!" },
    { character: "Ravi", text: "Falando desse jeito, até parece que você viu um monstro." },
    { character: "Ravi", text: "Enfim, cara. Você conseguiu ler a carta que te mandei?" },
    { character: "Kael", text: "Ainda não, mas eu já me lembrei que deixei ela aqui na gaveta da escrivaninha." },
    { character: "Ravi", text: "Que bom, cara. Leia ela, vai te ajudar com os visitantes." },
    { character: "Ravi", text: "Sua casa cabe três pessoas, certo?" },
    { character: "Kael", text: "Pior que não. Eu não tô mais deixando ninguém ficar no quarto dos fundos." },
    { character: "Ravi", text: "Ainda é por causa daquele tal visitante que se suicidou lá?" },
    { character: "Ravi", text: "Isso já faz uns 2 meses, cara, deveria voltar ele à ativa." },
    { character: "Kael", text: "Sinceramente, aquele lugar sempre teve um clima estranho." },
    { character: "Kael", text: "Eu tô pensando até em destruir ele. Aquela coisa nem faz parte da casa mesmo." },
    { character: "Ravi", text: "Bem, não vou ficar te enchendo o saco não." },
    { character: "Ravi", text: "Se você tá dizendo que não quer, então tá certo." },
    { character: "Ravi", text: "Leia a carta, beleza? Qualquer coisa, me dá um toque." },
    { character: "Kael", text: "Valeu, Ravi. Se precisar, me liga também." },
  ],

  // Resposta da etapa "ler a carta" (ver objectives/objective-config.js),
  // ativa assim que a segunda ligacao termina: qualquer interativo que
  // nao seja a gaveta da escrivaninha responde com esta fala. A gaveta
  // em si, de proposito, NAO tem resposta cadastrada nesta etapa —
  // interagir com ela simplesmente nao faz nada por enquanto (fica
  // reservada para a proxima atualizacao). A mesma fala ja e usada no
  // intervalo entre o fim do dialogo das janelas e o atendimento do
  // telefone (etapa "atender-telefone"), ja que a ultima coisa que
  // Kael disse foi justamente que vai procurar a carta.
  "precisa-ler-carta": [
    { character: "Kael", text: "(Preciso ler a carta)." },
  ],

  // Mesma ideia da fala acima, mas so da etapa "ler-carta" em diante
  // (ver objectives/objective-config.js): agora que a gaveta da
  // escrivaninha e o unico interativo liberado, Kael fica explicito
  // sobre de quem e a carta. A fala anterior continua intacta para a
  // etapa "atender-telefone", que e onde ela ja era usada.
  "precisa-ler-carta-ravi": [
    { character: "Kael", text: "(Preciso ler a carta do Ravi)." },
  ],
};
