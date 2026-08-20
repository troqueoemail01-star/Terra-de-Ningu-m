/**
 * scripts/ball-controller.js
 * -------------------------------------------------
 * Física simples da bola de futebol do quarto ("MEU QUARTO" — ver
 * models/soccer-ball-factory.js para a malha, e o bloco "Bola de
 * futebol" em scenes/room-scene.js para onde ela nasce). Mesmo
 * espírito de scripts/player-controller.js: um módulo dono do próprio
 * estado (posição, velocidade), com um `update(delta, ...)` chamado a
 * cada quadro por scenes/room-scene.js (via frameUpdaters).
 *
 * Reaproveita o mesmo scripts/collision.js já usado pelo jogador
 * (círculo vs. caixas AABB dos `solids` do cenário — paredes, guarda-
 * roupa, cama, criado-mudo, mesinha de TV, lata de lixo, vaso de
 * planta etc.), só que pela nova função resolveBounce em vez de
 * resolveMovement: em vez de só bloquear o eixo que bateu (o que faz
 * sentido pro jogador, que tem controle próprio via analógico), a
 * bola inverte e amortece a velocidade nesse eixo — o que produz o
 * rebate contra parede/móvel, perdendo energia a cada batida.
 *
 * Duas formas de mexer na bola: fisicamente (ver applyPlayerContact
 * abaixo, chamada a cada quadro — chute por encostão, sem precisar de
 * nenhum botão) e pelo botão "Interagir" (ver toggleHold abaixo),
 * que pega/larga a bola na mão — só ela, nunca vai pro inventário do
 * jogador (ver kind: "ball" em scenes/room-scene.js e o switch por
 * `kind` em scripts/main.js). Mesmo com o botão, ela também NUNCA
 * entra na lista de `solids` do quarto (ver bloco "Bola de futebol"
 * em scenes/room-scene.js): se entrasse, o PRÓPRIO jogador ficaria
 * travado contra ela como se fosse uma parede (resolveMovement
 * bloqueia o eixo, não empurra o obstáculo), o oposto do que foi
 * pedido.
 *
 * Enquanto segurada (held === true, ou ainda em transição — ver
 * holdProgress em `update`), a física de chute/rebote/atrito/
 * rolamento fica toda pausada: a posição passa a seguir a câmera do
 * jogador em vez de `solids`/velocidade. Assim que é largada, ela cai
 * exatamente onde foi solta e a física de sempre retoma dali, com
 * velocidade zerada (nunca sai "atirada" da mão).
 *
 * Sem física vertical "de verdade" (queda, pulo, quicar no ar): o
 * quarto é um único andar plano, sem rampas ou degraus, então o
 * centro da bola sempre fica na mesma altura (`radius` acima do chão)
 * — sozinho, isso já garante ela "começar apoiada no chão, sem
 * flutuar ou atravessá-lo" (pedido do usuário), sem precisar de um
 * sistema de gravidade/salto que este cenário não chegaria a usar de
 * verdade.
 * -------------------------------------------------
 */

window.BallController = (function () {
  // Desaceleração por atrito com o chão (unidades/s a cada segundo) —
  // depois de empurrada, a bola vai perdendo velocidade aos poucos até
  // parar sozinha; nunca fica deslizando pra sempre.
  const FRICTION_DECEL = 1.35;

  // Abaixo disso a bola é considerada parada (evita "rastejar" pra
  // sempre numa velocidade quase zero por causa de arredondamento).
  const STOP_SPEED = 0.03;

  // Velocidade máxima (encostão do jogador ou rebote acumulado), pra
  // ela nunca sair disparada rápido demais dentro do quarto.
  const MAX_SPEED = 3.2;

  // Perda de energia a cada rebote contra parede/móvel (ver
  // window.Collision.resolveBounce) — 1 = rebate sem perder nada,
  // 0 = gruda na hora.
  const WALL_RESTITUTION = 0.5;

  // "Chute" ao encostar no jogador: uma velocidade mínima mesmo num
  // toque de leve, mais um tanto proporcional a quanto os dois
  // círculos (jogador/bola) estavam sobrepostos naquele quadro —
  // encostão de leve empurra pouco, esbarrão mais brusco (jogador
  // entrando mais rápido nela) empurra mais forte. É essa a única
  // fonte de "intensidade" do movimento: não há botão, nem chute
  // "mirado" — só o quanto o jogador entrou na bola.
  const KICK_BASE_SPEED = 1.1;
  const KICK_OVERLAP_SCALE = 14;

  // ---------- Segurar / soltar (botão "Interagir") ----------
  // Distância à frente da câmera onde a bola fica enquanto está sendo
  // segurada (mesmo eixo "para frente" usado pelo movimento do
  // jogador — ver scripts/player-controller.js) e altura absoluta
  // nesse momento (bem abaixo da altura dos olhos — config.eyeHeight
  // é 1.6 —, simulando a bola junto ao corpo/mãos do jogador; não há
  // nenhum modelo de corpo/braços renderizado neste jogo em primeira
  // pessoa — ver o topo de player-controller.js —, então esta é a
  // única pista visual de que ela está "na mão"). Duração da transição
  // suave entre chão e mão (e vice-versa) — mesmo padrão de
  // progress/easing já usado por cortina/gaveta/interruptor (ver
  // models/window-factory.js, models/desk-factory.js e
  // models/switch-factory.js).
  const HOLD_DISTANCE = 0.5;
  const HOLD_HEIGHT = 1.05;
  const HOLD_ANIM_DURATION = 0.25;

  function create(group, startX, startZ, radius, bounds) {
    let posX = startX;
    let posZ = startZ;
    let velX = 0;
    let velZ = 0;

    // Enquanto `held` for true, a física normal (chute, rebote,
    // atrito, rolamento) fica toda pausada — ver `update` abaixo — e a
    // posição passa a seguir a câmera em vez de `solids`/velocidade.
    // `holdProgress` (0 = no chão, 1 = na mão) é quem realmente decide
    // o que é desenhado a cada quadro: a transição entre os dois
    // estados sempre passa suavemente por ele (mesmo padrão de
    // progress/easing de cortina/gaveta/interruptor, ver constantes
    // HOLD_* acima), nunca um corte seco. `holdAnchorX/Z` guarda a
    // posição exata no instante de CADA toggle (pego ou largado): ao
    // pegar, é o ponto de partida do deslize até a mão (ver `update`);
    // ao largar, como nada mais escreve em posX/posZ enquanto
    // `holdProgress` desce de volta a 0 (só a altura anima), a bola
    // naturalmente já fica "presa" ali sem precisar reler esta
    // variável de novo — só existe pelo lado da simetria/clareza do
    // código.
    let held = false;
    let holdProgress = 0;
    let holdAnchorX = posX;
    let holdAnchorZ = posZ;

    // ---------- Trava dura: a bola NAO sai do quarto ----------
    // `bounds` = retangulo {minX,maxX,minZ,maxZ} do INTERIOR de "MEU
    // QUARTO", ja descontado o raio da bola, montado em
    // scenes/room-scene.js (ver o bloco de mesmo nome no trecho da bola
    // de futebol), nas MESMAS coordenadas locais em que esta fisica roda.
    //
    // CORRECAO do bug relatado (a bola atravessava a parede e ia para o
    // CORREDOR): a lista de `solids` do quarto tem, de proposito, um
    // BURACO na altura do vao da porta: o solido da parede de entrada e
    // cortado em dois para o JOGADOR poder atravessar andando, e quem
    // fecha o vao e a colisao da FOLHA da porta, que vive na cena do
    // corredor e nunca chega aqui. Nem resolveBounce nem resolveMovement
    // poderiam parar a bola ali: nao havia caixa NENHUMA naquele trecho.
    // Este retangulo e a trava final, aplicada depois de TODO
    // deslocamento da bola (chute, rebote, empurrao do jogador e tambem
    // o carregar na mao): ela fica sempre dentro de "MEU QUARTO", e nao
    // existe mais nenhum caminho pelo qual ela chegue a outro cenario.
    const limits = bounds || null;

    // Devolve a bola para dentro do retangulo. `bounce` = true na fisica
    // normal: encostar no limite tem o MESMO efeito de bater numa parede
    // de verdade (velocidade invertida e amortecida pela mesma
    // WALL_RESTITUTION), nada de bola parando seca numa barreira
    // invisivel. False quando ela esta na mao (ou acabou de ser posta no
    // lugar): ali a velocidade e zero e nao ha nada para inverter - ela
    // so deixa de acompanhar o jogador naquele eixo. So inverte quando a
    // velocidade aponta para FORA, para nao empurrar a bola de volta ao
    // limite no quadro seguinte.
    function clampToBounds(bounce) {
      if (!limits) {
        return;
      }

      if (posX < limits.minX) {
        posX = limits.minX;
        if (bounce && velX < 0) {
          velX = -velX * WALL_RESTITUTION;
        }
      } else if (posX > limits.maxX) {
        posX = limits.maxX;
        if (bounce && velX > 0) {
          velX = -velX * WALL_RESTITUTION;
        }
      }

      if (posZ < limits.minZ) {
        posZ = limits.minZ;
        if (bounce && velZ < 0) {
          velZ = -velZ * WALL_RESTITUTION;
        }
      } else if (posZ > limits.maxZ) {
        posZ = limits.maxZ;
        if (bounce && velZ > 0) {
          velZ = -velZ * WALL_RESTITUTION;
        }
      }
    }

    // Eixo de rolamento reaproveitado a cada quadro (evita alocar um
    // THREE.Vector3 novo por frame só pra isso).
    const rollAxis = new THREE.Vector3();

    // Mesmo o ponto de nascimento passa pela trava (ver clampToBounds
    // acima): se um dia a mobilia de referencia mudar de lugar em
    // scenes/room-config.js, a bola nasce dentro do quarto de qualquer
    // jeito - nunca dentro da parede nem do outro lado dela.
    clampToBounds(false);
    group.position.set(posX, radius, posZ);

    function applyFriction(delta) {
      const speed = Math.sqrt(velX * velX + velZ * velZ);
      if (speed <= STOP_SPEED) {
        velX = 0;
        velZ = 0;
        return;
      }
      const newSpeed = Math.max(0, speed - FRICTION_DECEL * delta);
      if (newSpeed <= STOP_SPEED) {
        velX = 0;
        velZ = 0;
      } else {
        const scale = newSpeed / speed;
        velX *= scale;
        velZ *= scale;
      }
    }

    function clampMaxSpeed() {
      const speed = Math.sqrt(velX * velX + velZ * velZ);
      if (speed > MAX_SPEED) {
        const scale = MAX_SPEED / speed;
        velX *= scale;
        velZ *= scale;
      }
    }

    // Círculo (bola) vs. círculo (jogador): se estiverem se tocando,
    // empurra a bola pra fora do jogador (evita ela ficar atravessada/
    // grudada nele) e dá o "chute" na direção jogador -> bola.
    //
    // CORREÇÃO (bola presa nos cantos / sumindo): esse empurrão agora
    // passa pela mesma resolução de colisão contra `solids` que o
    // jogador já usa pra andar (window.Collision.resolveMovement — ver
    // scripts/collision.js), em vez de jogar a bola direto pra
    // "playerPos + normal*minDist" sem checar nada no caminho. Esse
    // pulo direto era a causa raiz dos dois bugs: minDist (raio da bola
    // + raio do jogador) é maior que a espessura de uma parede/da
    // margem de um móvel, então um encostão numa quina facilmente
    // cravava o CENTRO da bola dentro do sólido — às vezes até além da
    // METADE dele. A partir daí, resolveBounce (logo abaixo) só sabe
    // empurrar pra borda mais PRÓXIMA da posição atual: perto o
    // suficiente da borda "de dentro", ela reaparecia cravada no mesmo
    // lugar a cada quadro (a bola "presa no canto", nunca soltando de
    // verdade); funda o bastante pra passar da metade, a borda mais
    // próxima passava a ser a de FORA do cenário — a bola era ejetada
    // pro outro lado da parede e sumia. resolveMovement evita os dois
    // de raiz: é o mesmo "anda até esbarrar, e para exatamente aí" do
    // jogador, então o empurrão nunca avança além do sólido mais
    // próximo — a bola fica encostada nele (nunca dentro, nunca do
    // outro lado), pronta pra ressaltar de verdade no chute seguinte.
    function applyPlayerContact(playerPos, playerRadius, solids) {
      if (!playerPos) {
        return;
      }

      const dx = posX - playerPos.x;
      const dz = posZ - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = radius + playerRadius;

      if (dist >= minDist) {
        return;
      }

      const safeDist = dist > 1e-4 ? dist : 1e-4;
      const nx = dx / safeDist;
      const nz = dz / safeDist;
      const overlap = minDist - dist;

      const pushed = window.Collision.resolveMovement(
        posX, posZ, nx * overlap, nz * overlap, radius, solids
      );
      posX = pushed.x;
      posZ = pushed.z;
      clampToBounds(false);

      const kickSpeed = KICK_BASE_SPEED + overlap * KICK_OVERLAP_SCALE;
      velX = nx * kickSpeed;
      velZ = nz * kickSpeed;
    }

    // Alterna pegar/largar — chamada pelo botão "Interagir" do HUD
    // enquanto a bola está em destaque (ver `kind: "ball"` no bloco
    // "Bola de futebol" em scenes/room-scene.js e o switch por `kind`
    // em scripts/main.js). Zera a velocidade nos dois sentidos: pegar
    // no meio de um rolamento não deveria deixar nenhum resquício de
    // física antiga esperando pra "explodir" quando for largada de
    // novo, e enquanto segura (`held === true`) a velocidade nem é
    // usada mesmo (ver `update`). `holdAnchorX/Z` grava a posição
    // exata deste instante — ver comentário de `held` acima.
    function toggleHold() {
      held = !held;
      holdAnchorX = posX;
      holdAnchorZ = posZ;
      velX = 0;
      velZ = 0;
    }

    // Chamada a cada quadro por scenes/room-scene.js (via
    // frameUpdaters) enquanto o jogador está no quarto. `solids` é a
    // mesma lista de sólidos do cenário usada pelo jogador;
    // `playerPos`/`playerRadius` vêm de scripts/main.js (posição
    // devolvida por PlayerController.update() a cada quadro —
    // `playerPos.yaw` é o que permite calcular "na frente da câmera"
    // enquanto segurando, ver bloco `if (held)` abaixo).
    function update(delta, solids, playerPos, playerRadius) {
      // ---------- Transição chão <-> mão ----------
      // Sempre desliza suavemente até o alvo (1 = totalmente na mão, 0
      // = totalmente no chão), nunca um corte seco — mesmo padrão de
      // cortina/gaveta/interruptor (ver constantes HOLD_* acima).
      const holdTarget = held ? 1 : 0;
      const holdStep = delta / HOLD_ANIM_DURATION;
      if (holdProgress < holdTarget) {
        holdProgress = Math.min(holdTarget, holdProgress + holdStep);
      } else if (holdProgress > holdTarget) {
        holdProgress = Math.max(holdTarget, holdProgress - holdStep);
      }
      const eased = holdProgress * holdProgress * (3 - 2 * holdProgress);

      if (held) {
        // ---------- Segurando: nada de chute/rebote/atrito ----------
        // A posição passa a seguir a câmera (na direção "para frente",
        // mesma fórmula de scripts/player-controller.js), não mais
        // `solids`/velocidade — mas o deslocamento até lá SEMPRE passa
        // por resolveMovement (mesma função segura que já protege
        // applyPlayerContact acima): sem isso, um jogador virado de
        // frente pra uma parede/móvel bem de perto empurraria a bola
        // segurada pra dentro do sólido, reabrindo exatamente o mesmo
        // bug de "atravessar parede" já corrigido ali.
        if (playerPos) {
          const yaw = playerPos.yaw || 0;
          const forwardX = -Math.sin(yaw);
          const forwardZ = -Math.cos(yaw);
          const targetX = playerPos.x + forwardX * HOLD_DISTANCE;
          const targetZ = playerPos.z + forwardZ * HOLD_DISTANCE;

          // Desliza do ponto onde foi pega (holdAnchorX/Z) até a
          // posição-alvo (que persegue o jogador) conforme
          // `holdProgress` avança — assim ela "sobe até a mão" em vez
          // de teleportar na hora exata em que o botão é apertado.
          // Depois de totalmente na mão (holdProgress = 1, eased = 1),
          // a fórmula já reduz sozinha a acompanhar `targetX/Z` puro a
          // cada quadro, sem precisar de nenhum caso especial.
          const glideX = holdAnchorX + (targetX - holdAnchorX) * eased;
          const glideZ = holdAnchorZ + (targetZ - holdAnchorZ) * eased;

          const carried = window.Collision.resolveMovement(
            posX, posZ, glideX - posX, glideZ - posZ, radius, solids
          );
          posX = carried.x;
          posZ = carried.z;
          clampToBounds(false);
        }
      } else if (holdProgress === 0) {
        // ---------- Física normal de sempre ----------
        applyPlayerContact(playerPos, playerRadius, solids);
        clampMaxSpeed();

        const resolved = window.Collision.resolveBounce(
          posX, posZ, velX, velZ, delta, radius, solids, WALL_RESTITUTION
        );
        posX = resolved.x;
        posZ = resolved.z;
        velX = resolved.vx;
        velZ = resolved.vz;
        clampToBounds(true);

        applyFriction(delta);
      }
      // else (held === false mas holdProgress > 0): acabou de ser
      // largada e ainda está "descendo" até o chão — de propósito, não
      // mexe em posX/posZ neste meio-tempo (só a altura abaixo já
      // anima com `eased`): ela cai exatamente no lugar onde foi
      // solta, sem nenhum deslizamento lateral. Física normal só
      // retoma quando `holdProgress` chegar em 0 de verdade.

      // Altura: sempre radius (apoiada no chão) quando holdProgress =
      // 0, sempre HOLD_HEIGHT (na mão) quando = 1, com a mesma
      // transição suave de `eased` nos dois sentidos.
      const posY = radius + (HOLD_HEIGHT - radius) * eased;
      group.position.set(posX, posY, posZ);

      // Rolamento visual: só faz sentido rolando de verdade no chão —
      // held/holdProgress>0 sempre com velX=velZ=0 (ver toggleHold),
      // então "speed > STOP_SPEED" abaixo já filtra isso sozinho, sem
      // precisar de nenhuma condição extra aqui.
      //
      // Gira em torno do eixo horizontal perpendicular à direção do
      // movimento (cross(velocidade, eixo vertical)), na velocidade
      // angular de uma bola real rolando sem deslizar (ângulo =
      // distância percorrida / raio) — consequência direta da física
      // acima, não uma animação separada: para de girar assim que a
      // bola para.
      const speed = Math.sqrt(velX * velX + velZ * velZ);
      if (speed > STOP_SPEED) {
        rollAxis.set(-velZ / speed, 0, velX / speed);
        const angle = (speed / radius) * delta;
        group.rotateOnWorldAxis(rollAxis, angle);
      }
    }

    // Consultado por scripts/main.js a cada quadro para saber se a
    // bola está na mão agora (ou em transição — ver holdProgress
    // acima): enquanto isso for true, o jogador não deve conseguir
    // mirar/interagir com mais nada além da própria bola (ver
    // getHeldItem() e o início de HUD.setInteractHandler em
    // scripts/main.js). Considera também a transição (não só
    // held === true) para não abrir uma brecha de um quadro logo
    // depois de largar, enquanto ela ainda está "descendo" até o chão.
    function isHeld() {
      return held || holdProgress > 0;
    }

    return { update: update, toggleHold: toggleHold, isHeld: isHeld };
  }

  return { create: create };
})();
