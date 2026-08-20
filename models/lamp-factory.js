/**
 * models/lamp-factory.js
 * -------------------------------------------------
 * Uma única luminária de teto — a única fonte de luz
 * do corredor. Fraca e quente, para reforçar o clima
 * de terror (o resto do corredor deve ficar em sombra).
 *
 * Também é responsável por dois detalhes atmosféricos:
 *  - piscadas ocasionais e aleatórias, como se a luminária
 *    estivesse velha e com defeito;
 *  - pequenas moscas voando ao redor do bulbo.
 * Ambos são só cosméticos: quem monta a cena chama
 * `lamp.update(delta, elapsed)` a cada quadro (a própria
 * luminária expõe esse método diretamente).
 * -------------------------------------------------
 */

window.LampFactory = (function () {
  const FLY_COUNT = 5;

  // Pequeno enxame de moscas, sempre por perto do bulbo (centerY local),
  // com um voo levemente errático (não é uma órbita perfeita).
  function createFlies(centerY) {
    const group = new THREE.Group();
    const flyGeo = new THREE.SphereGeometry(0.018, 5, 4);
    const flyMat = new THREE.MeshBasicMaterial({ color: 0x1c150f });
    const flies = [];

    for (let i = 0; i < FLY_COUNT; i++) {
      const mesh = new THREE.Mesh(flyGeo, flyMat);
      group.add(mesh);
      flies.push({
        mesh: mesh,
        angle: Math.random() * Math.PI * 2,
        speed: (0.6 + Math.random() * 1.6) * (Math.random() < 0.5 ? -1 : 1),
        radius: 0.22 + Math.random() * 0.28,
        minR: 0.16,
        maxR: 0.55,
        height: (Math.random() - 0.5) * 0.25,
        bobFreq: 2 + Math.random() * 2.5,
        bobAmp: 0.05 + Math.random() * 0.06,
        bobPhase: Math.random() * Math.PI * 2,
      });
    }

    function update(delta, elapsed) {
      flies.forEach(function (f) {
        // Pequena variação aleatória a cada quadro em vez de uma órbita
        // perfeita — é isso que dá o aspecto de voo "vivo" e imprevisível.
        f.angle += f.speed * delta + (Math.random() - 0.5) * 0.8 * delta;
        f.radius = Math.max(
          f.minR,
          Math.min(f.maxR, f.radius + (Math.random() - 0.5) * 0.18 * delta)
        );
        f.height = Math.max(
          -0.3,
          Math.min(0.3, f.height + (Math.random() - 0.5) * 0.5 * delta)
        );

        const x = Math.cos(f.angle) * f.radius;
        const z = Math.sin(f.angle) * f.radius;
        const y =
          centerY + f.height + Math.sin(elapsed * f.bobFreq + f.bobPhase) * f.bobAmp;
        f.mesh.position.set(x, y, z);
      });
    }

    return { group: group, update: update };
  }

  function createCeilingLamp(materials) {
    const group = new THREE.Group();

    // Suporte que desce do teto
    const cordGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6);
    const cord = new THREE.Mesh(cordGeo, materials.lampMetal);
    cord.position.y = -0.15;
    group.add(cord);

    // Abajur cônico
    const shadeGeo = new THREE.ConeGeometry(0.35, 0.25, 12, 1, true);
    const shade = new THREE.Mesh(shadeGeo, materials.lampMetal);
    shade.position.y = -0.42;
    group.add(shade);

    // Bulbo (emissivo visual — luz real vem de uma PointLight separada).
    // O material é clonado (mesma aparência inicial) só para poder variar
    // o brilho durante as piscadas sem mexer no material compartilhado.
    const bulbGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const bulbMat = materials.lampGlow.clone();
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = -0.44;
    group.add(bulb);

    // Luz fraca e quente — única fonte de iluminação do corredor
    const baseIntensity = 1.1;
    const light = new THREE.PointLight(0xffcf8a, baseIntensity, 9, 2);
    light.position.y = -0.5;
    group.add(light);

    // Moscas ao redor da luminária — detalhe ambiental discreto
    const flies = createFlies(-0.5);
    group.add(flies.group);

    // ---------- Piscadas ocasionais (luminária velha e com defeito) ----------
    const baseColor = bulbMat.color.clone();
    let flickerTimer = 6 + Math.random() * 10; // primeira falha ainda demora um pouco
    let flickering = false;
    let flickerElapsed = 0;
    let flickerDuration = 0;
    const flickerSeed = Math.random() * 100;

    // ---------- Liga/desliga (controlado pelo interruptor de parede) ----------
    // `powered` começa ligado (estado inicial do corredor, igual a antes
    // desta funcionalidade existir). Desligar zera a luz de verdade (a
    // PointLight) e escurece o bulbo visual, e congela o cronômetro de
    // piscadas exatamente onde estava — assim, ao religar, as piscadas
    // "continuam funcionando exatamente como antes" (nenhum tempo se
    // passa para elas enquanto a luz está apagada).
    let powered = true;

    function setPower(on) {
      if (powered === on) {
        return;
      }
      powered = on;
      if (!powered) {
        flickering = false;
        light.intensity = 0;
        bulbMat.color.copy(baseColor).multiplyScalar(0.12);
      } else {
        light.intensity = baseIntensity;
        bulbMat.color.copy(baseColor);
      }
    }

    function update(delta, elapsed) {
      flies.update(delta, elapsed);

      if (!powered) {
        // Luz apagada: nenhuma piscada roda enquanto o interruptor
        // estiver desligado (ver comentário acima de `powered`).
        return;
      }

      flickerTimer -= delta;
      if (!flickering && flickerTimer <= 0) {
        flickering = true;
        flickerElapsed = 0;
        flickerDuration = 0.25 + Math.random() * 0.55;
      }

      if (flickering) {
        flickerElapsed += delta;
        if (flickerElapsed >= flickerDuration) {
          // Fim da falha: volta ao normal e agenda a próxima, sempre
          // espaçada o bastante para não incomodar nem virar previsível.
          flickering = false;
          light.intensity = baseIntensity;
          bulbMat.color.copy(baseColor);
          flickerTimer = 7 + Math.random() * 14;
        } else {
          // Combinação de duas senoides com fases aleatórias: pisca de
          // forma irregular (não é um pulso limpo/repetitivo), e varia
          // de intensidade dentro da própria falha.
          const n1 = Math.sin(flickerElapsed * 47 + flickerSeed);
          const n2 = Math.sin(flickerElapsed * 17 + flickerSeed * 2.3);
          let flicker = 0.3 + 0.7 * Math.abs(n1 * n2);
          if (Math.random() < 0.05) flicker *= 0.15; // blip quase apagado, raro
          light.intensity = baseIntensity * flicker;
          bulbMat.color.copy(baseColor).multiplyScalar(0.35 + 0.65 * flicker);
        }
      }
    }

    group.update = update;
    group.setPower = setPower;
    return group;
  }

  return { createCeilingLamp: createCeilingLamp };
})();
