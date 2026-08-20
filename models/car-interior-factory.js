/**
 * models/car-interior-factory.js
 * -------------------------------------------------
 * A CABINE DO CARRO em primeira pessoa da cutscene de abertura (ver
 * cutscenes/road-cutscene.js). Esta e a SEGUNDA versao da cabine: a
 * primeira era o pacote PS1 Car FPV remontado caixa por caixa, e tinha
 * tres problemas que apareciam justamente no unico enquadramento que o
 * jogador ve:
 *
 *   1. NAO EXISTIA JANELA. As laterais eram duas paredes macicas de 1,34 m
 *      de altura, do assoalho ao teto. Do lado do motorista, onde a
 *      camera esta, isso virava um bloco escuro sem furo nenhum.
 *   2. O VOLANTE NUNCA ENTRAVA NO QUADRO. A mira da lente era quase
 *      horizontal (alvo em y 0,88 a 7 m de distancia), entao o aro, que
 *      fica 50 cm abaixo do olho, caia fora da tela inteira. O jogador
 *      nao tinha como saber se havia volante.
 *   3. TUDO ERA CAIXA RETA. Vinte e cinco paralelepipedos de quina viva,
 *      um do lado do outro: a leitura na tela era de uma caixa quadrada,
 *      nao de um carro.
 *
 * O que esta versao faz de diferente:
 *
 *   - JANELAS DE VERDADE. A lateral agora e montada em faixas: painel de
 *     porta ate a altura do apoio de braco, friso da cintura, e acima
 *     disso um VAO ABERTO fechado apenas por coluna A, coluna B, o poste
 *     do basculante e o trilho do teto. O vidro do motorista esta MEIO
 *     BAIXADO (sobra uma faixa fina no alto do vao), entao a estrada
 *     corre a vista pela esquerda; o do passageiro esta fechado.
 *   - MIRA DA CAMERA ~15 GRAUS PARA BAIXO. E o angulo de quem dirige: o
 *     terco de cima da tela e estrada, o meio e o painel, e o terco de
 *     baixo e o volante. A POSICAO do olho nao mudou, so para onde ele
 *     aponta - o balanco da cabeca e a centralizacao no toque do telefone
 *     continuam identicos.
 *   - QUINA CHANFRADA EM TUDO QUE A CAMERA PEGA DE PERTO. O construtor
 *     ganhou bevelBox(): a peca sai com as doze arestas e os oito cantos
 *     chanfrados, entao a luz quebra na quina em vez de terminar num
 *     angulo reto. Painel, capo dos instrumentos, portas, bancos, console
 *     e teto usam isso; o que fica atras da cabeca do motorista continua
 *     caixa simples, para nao gastar triangulo com o que ninguem ve.
 *   - COCKPIT MOBILIADO. Capo de instrumentos com pala, dois mostradores,
 *     coluna de direcao com capa e as duas alavancas, console central com
 *     radio e saidas de ar, porta-luvas, bancos com laterais de contencao
 *     e apoio de cabeca, cinto na diagonal, tunel com cambio e freio de
 *     mao, quebra-sois, luz de teto, alca de apoio e um terco pendurado
 *     no retrovisor que BALANCA com os buracos da estrada.
 *
 * Continua tudo feito em codigo (nenhum arquivo novo em assets/), com os
 * materiais normais do three.js temperados por
 * materials/psx-cutscene-material.js, e a mesma interface de antes:
 *
 * window.CarInteriorFactory.build()
 *   -> { root, camera, rideHeight, update, centerView, dispose }
 * -------------------------------------------------
 */

window.CarInteriorFactory = (function () {
  // ---------- Paleta ----------
  // Cor por componente, 0-255, num lugar so: e mais facil escurecer a
  // cabine inteira daqui do que cacar literais espalhados na geometria.
  function rgb(r, g, b) {
    return (r << 16) + (g << 8) + b;
  }

  const C = {
    carpet: rgb(30, 27, 25),
    mat: rgb(20, 20, 21),
    tunnel: rgb(40, 37, 34),
    dashLow: rgb(46, 43, 40),
    dashFace: rgb(58, 54, 50),
    dashTop: rgb(42, 39, 36),
    binnacle: rgb(28, 26, 25),
    plastic: rgb(48, 45, 42),
    darkPlastic: rgb(26, 25, 24),
    trim: rgb(104, 96, 84),
    chrome: rgb(158, 155, 148),
    pillar: rgb(84, 79, 74),
    rail: rgb(74, 70, 66),
    roof: rgb(96, 91, 86),
    doorCard: rgb(56, 52, 48),
    doorLow: rgb(42, 39, 36),
    beltLine: rgb(70, 65, 61),
    seat: rgb(50, 46, 43),
    seatSide: rgb(41, 38, 36),
    seatBack: rgb(37, 34, 32),
    strap: rgb(64, 60, 55),
    rubber: rgb(24, 24, 25),
    metal: rgb(118, 112, 104),
    wheel: rgb(56, 52, 48),
    bead: rgb(120, 58, 52)
  };

  // Olho do motorista e mira da lente, em coordenadas da cabine
  // (x negativo = lado esquerdo, -Z = para a frente). O alvo esta ~15
  // graus abaixo da horizontal, a 6 m de distancia: e o que traz painel e
  // volante para dentro do quadro.
  //
  // ALTURA DO OLHO: 1,10 m acima do assoalho da cabine. Eram 1,02 m, e de
  // 1,02 o motorista sentava BAIXO DEMAIS - a leitura na tela era de
  // alguem pequeno atras do volante, com o painel alto no quadro. Os 8 cm
  // a mais colocam a cabeca na altura de um adulto no banco: o topo do
  // painel desce ~2,5 graus na tela e sobra mais estrada pelo para-brisa.
  //
  // O ALVO desceu junto (de -0,48 para -0,55), e isso nao e detalhe: se so
  // o olho subisse, a mira continuaria a mesma e o aro do volante
  // escorregaria para fora da borda de baixo do quadro (o campo de visao
  // vertical e de 62 graus, 31 para cada lado do eixo - ver `fov` logo
  // abaixo). Com o alvo 7 cm mais baixo a lente inclina ~1,4 grau a mais:
  // o volante continua na faixa de baixo da tela, os mostradores continuam
  // legiveis e o horizonte continua onde estava. A cabeca continua sendo o
  // MESMO pivo de antes - balanco da estrada, passeio do olhar e
  // centralizacao no toque do telefone nao mudaram em nada (ver update).
  const CAMERA = {
    position: { x: -0.36, y: 1.10, z: 0.2 },
    target: { x: -0.12, y: -0.55, z: -5.8 },
    fov: 62
  };

  // Altura do assoalho da cabine em relacao ao chao: e o quanto o carro
  // sobe acima da terra batida (pneu + suspensao).
  const RIDE_HEIGHT = 0.14;

  // ---------- Olhar e balanco da cabeca (ver update) ----------
  const GAZE_YAW = 0.155;
  const GAZE_PITCH = 0.045;
  const GAZE_ROLL = 0.018;
  const CENTER_SECONDS = 1.6;

  const JOLT_STIFFNESS = 260;
  const JOLT_DAMPING = 13;
  const JOLT_RISE_STIFFNESS = 340;
  const JOLT_RISE_DAMPING = 17;
  const JOLT_PITCH = 0.02;
  const JOLT_ROLL = 0.03;
  const JOLT_RISE = 0.009;
  const JOLT_MIN_GAP = 0.16;
  const JOLT_GAP_SPREAD = 0.34;
  const TREMOR_PITCH = 0.0022;
  const TREMOR_ROLL = 0.0026;
  const TREMOR_RISE = 0.0012;

  function makeCanvasTexture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext('2d'), width, height);

    const texture = new THREE.CanvasTexture(canvas);
    // Mesmo tratamento das texturas procedurais do jogo (ver
    // materials/textures.js): nearest, sem mipmap, encoding linear.
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.encoding = THREE.LinearEncoding;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  function css(hex) {
    return 'rgb(' + ((hex >> 16) & 255) + ',' + ((hex >> 8) & 255) + ',' + (hex & 255) + ')';
  }

  // ---------- As tres texturas ----------
  // Granulado de plastico injetado. A cabine inteira usa esta: a COR de
  // cada peca vem do vertice, a textura so quebra o chapado das faces
  // grandes. Ela e clara de proposito (media perto de 150) porque
  // multiplica a cor de vertice - se fosse escura, escureceria tudo.
  function buildGrainTexture() {
    return makeCanvasTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = 'rgb(150,147,143)';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2400; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const s = Math.random() * 2.2 + 0.6;
        const t = Math.random();
        if (t > 0.66) {
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
        } else if (t > 0.33) {
          ctx.fillStyle = 'rgba(0,0,0,0.13)';
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.05)';
        }
        ctx.fillRect(x, y, s, s);
      }
      // Algumas linhas horizontais de leve: o vinil do painel tem veio.
      for (let j = 0; j < 40; j++) {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, Math.random() * h, w, 1);
      }
    });
  }

  // O mostrador. Velocimetro grande a esquerda, conta-giros menor a
  // direita, odometro embaixo, combustivel e temperatura em barras e as
  // quatro luzes de aviso na coluna da direita. Desenhado em 512x256 para
  // uma peca que na tela tem uns 60 pixels: o excesso de resolucao e o que
  // mantem os numeros legiveis enquanto a cabeca balanca.
  //
  // O ponteiro do velocimetro e uma malha separada (ver build) e gira pela
  // MESMA conta usada aqui para distribuir os numeros: zero em 135 graus
  // de tela, fundo de escala 270 graus depois, no sentido do relogio.
  const DIAL_START = 135;
  const DIAL_SWEEP = 270;
  const SPEED_MAX = 140;

  // Centro do velocimetro na textura, em pixel: e daqui que sai a posicao
  // do ponteiro no espaco 3D, entao os dois nunca saem de registro.
  const SPEED_DIAL = { x: 118, y: 116, r: 94 };

  function buildClusterTexture() {
    return makeCanvasTexture(512, 256, function (ctx, w, h) {
      ctx.fillStyle = 'rgb(13,13,14)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgb(23,23,25)';
      ctx.fillRect(6, 6, w - 12, h - 12);

      // Um relogio: fundo preto, aro, tracos e numeros. O angulo cresce no
      // sentido do relogio a partir de baixo e a esquerda, como em painel
      // de verdade - a versao anterior girava ao contrario.
      function dial(cx, cy, r, majors, step, sweep) {
        ctx.fillStyle = 'rgb(11,11,12)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgb(92,88,82)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        const total = majors * 2;
        for (let i = 0; i <= total; i++) {
          const big = i % 2 === 0;
          const deg = DIAL_START + (i / total) * sweep;
          const rad = (deg * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const inner = r - (big ? 19 : 10);
          ctx.strokeStyle = 'rgb(232,228,220)';
          ctx.lineWidth = big ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(cx + cos * inner, cy + sin * inner);
          ctx.lineTo(cx + cos * (r - 4), cy + sin * (r - 4));
          ctx.stroke();
          if (big) {
            ctx.fillStyle = 'rgb(236,232,224)';
            ctx.font = 'bold ' + (r > 70 ? 18 : 14) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
              String((i / 2) * step),
              cx + cos * (r - 34),
              cy + sin * (r - 34) + (r > 70 ? 6 : 5)
            );
          }
        }
      }

      dial(SPEED_DIAL.x, SPEED_DIAL.y, SPEED_DIAL.r, 7, SPEED_MAX / 7, DIAL_SWEEP);
      dial(296, 108, 58, 4, 2, 240);

      ctx.fillStyle = 'rgb(150,146,140)';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KM/H', SPEED_DIAL.x, 226);
      ctx.fillText('RPM', 296, 190);

      // Odometro: o carro do Kael ja rodou muito.
      ctx.fillStyle = 'rgb(202,196,184)';
      ctx.fillRect(238, 216, 118, 22);
      ctx.fillStyle = 'rgb(15,15,16)';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('184627', 297, 233);

      // Combustivel quase no fim e temperatura no meio.
      function bar(x, y, fill, label, color) {
        ctx.fillStyle = 'rgb(150,146,140)';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, x, y - 6);
        ctx.strokeStyle = 'rgb(108,104,98)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 96, 15);
        ctx.fillStyle = color;
        ctx.fillRect(x + 2, y + 2, 92 * fill, 11);
      }
      bar(378, 60, 0.22, 'FUEL', 'rgb(196,138,58)');
      bar(378, 116, 0.48, 'TEMP', 'rgb(88,138,178)');

      // Luzes de aviso. A do oleo acesa: detalhe de carro velho.
      const lamps = [
        [392, 196, 'rgb(188,58,48)'],
        [424, 196, 'rgb(68,64,60)'],
        [456, 196, 'rgb(58,138,88)'],
        [488, 196, 'rgb(68,64,60)']
      ];
      for (let k = 0; k < lamps.length; k++) {
        ctx.fillStyle = lamps[k][2];
        ctx.beginPath();
        ctx.arc(lamps[k][0], lamps[k][1], 10, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // O vidro riscado dos dois retrovisores.
  function buildMirrorTexture() {
    return makeCanvasTexture(128, 64, function (ctx, w, h) {
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, 'rgb(150,152,150)');
      gradient.addColorStop(1, 'rgb(96,98,100)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 8 + 1, 1);
      }
    });
  }

  // ---------- Construtor de volumes com cor de vertice ----------
  // A cabine inteira e UMA malha (uma draw call): cada peca entra aqui e
  // sai como triangulos com a cor dela gravada nos vertices.
  function Builder() {
    this.positions = [];
    this.normals = [];
    this.uvs = [];
    this.colors = [];
    this.indices = [];
    this.count = 0;
  }

  const QUAD_UV = [
    [0.03, 0.97],
    [0.97, 0.97],
    [0.97, 0.03],
    [0.03, 0.03]
  ];

  function V(x, y, z) {
    return new THREE.Vector3(x, y, z);
  }

  Builder.prototype.push = function (v, normal, uv, color) {
    this.positions.push(v.x, v.y, v.z);
    this.normals.push(normal.x, normal.y, normal.z);
    this.uvs.push(uv[0], uv[1]);
    this.colors.push(color.r, color.g, color.b);
    this.count += 1;
    return this.count - 1;
  };

  Builder.prototype.quad = function (a, b, c, d, normal, color) {
    const base = this.count;
    const verts = [a, b, c, d];
    for (let i = 0; i < 4; i++) {
      this.push(verts[i], normal, QUAD_UV[i], color);
    }
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  Builder.prototype.tri = function (a, b, c, normal, color) {
    const base = this.count;
    this.push(a, normal, QUAD_UV[0], color);
    this.push(b, normal, QUAD_UV[1], color);
    this.push(c, normal, QUAD_UV[2], color);
    this.indices.push(base, base + 1, base + 2);
  };

  // Face de chanfro: a normal sai da PROPRIA geometria e a ordem dos
  // vertices e corrigida sozinha para a normal apontar para fora. Sem
  // isto, cada uma das doze arestas de cada peca seria uma chance de
  // inverter a face e aparecer um buraco preto na cabine.
  Builder.prototype.faceQuad = function (a, b, c, d, outward, color) {
    const e1 = V(b.x - a.x, b.y - a.y, b.z - a.z);
    const e2 = V(c.x - a.x, c.y - a.y, c.z - a.z);
    const n = new THREE.Vector3().crossVectors(e1, e2).normalize();
    if (n.dot(outward) < 0) {
      n.multiplyScalar(-1);
      this.quad(a, d, c, b, n, color);
      return;
    }
    this.quad(a, b, c, d, n, color);
  };

  Builder.prototype.faceTri = function (a, b, c, outward, color) {
    const e1 = V(b.x - a.x, b.y - a.y, b.z - a.z);
    const e2 = V(c.x - a.x, c.y - a.y, c.z - a.z);
    const n = new THREE.Vector3().crossVectors(e1, e2).normalize();
    if (n.dot(outward) < 0) {
      n.multiplyScalar(-1);
      this.tri(a, c, b, n, color);
      return;
    }
    this.tri(a, b, c, n, color);
  };

  // Ponto local -> ponto na cabine. A rotacao e opcional e serve para as
  // pecas inclinadas (coluna A, encosto do banco, cinto): sem ela, todas
  // as arestas do carro ficariam paralelas aos eixos, que e metade da
  // razao pela qual a cabine antiga parecia uma caixa.
  function place(center, rot, x, y, z) {
    let px = x;
    let py = y;
    let pz = z;
    if (rot) {
      if (rot.z) {
        const c = Math.cos(rot.z);
        const s = Math.sin(rot.z);
        const nx = px * c - py * s;
        py = px * s + py * c;
        px = nx;
      }
      if (rot.y) {
        const c = Math.cos(rot.y);
        const s = Math.sin(rot.y);
        const nx = px * c + pz * s;
        pz = -px * s + pz * c;
        px = nx;
      }
      if (rot.x) {
        const c = Math.cos(rot.x);
        const s = Math.sin(rot.x);
        const ny = py * c - pz * s;
        pz = py * s + pz * c;
        py = ny;
      }
    }
    return V(center[0] + px, center[1] + py, center[2] + pz);
  }

  // Caixa de quina viva: 12 triangulos. Para o que fica atras da cabeca
  // do motorista, ou grande e longe, onde chanfro nao aparece.
  Builder.prototype.box = function (center, size, hex, rot) {
    const color = new THREE.Color(hex);
    const h = [size[0] / 2, size[1] / 2, size[2] / 2];
    const axes = [
      [0, 1, 2],
      [1, 2, 0],
      [2, 0, 1]
    ];
    for (let a = 0; a < 3; a++) {
      for (let s = -1; s <= 1; s += 2) {
        const u = axes[a][1];
        const v = axes[a][2];
        const corners = [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1]
        ].map(function (c) {
          const p = [0, 0, 0];
          p[a] = s * h[a];
          p[u] = c[0] * h[u];
          p[v] = c[1] * h[v];
          return place(center, rot, p[0], p[1], p[2]);
        });
        const out = [0, 0, 0];
        out[a] = s;
        this.faceQuad(
          corners[0],
          corners[1],
          corners[2],
          corners[3],
          place([0, 0, 0], rot, out[0], out[1], out[2]),
          color
        );
      }
    }
  };

  // Caixa CHANFRADA: as seis faces recuadas, doze faces de aresta e oito
  // triangulos de canto. Sao 52 triangulos em vez de 12, e e por isso que
  // so o que a camera pega de perto usa esta versao. O ganho: a quina
  // deixa de ser uma linha de 90 graus e passa a ter uma faceta propria,
  // com luz propria - e o que tira a cara de bloco de Lego.
  Builder.prototype.bevelBox = function (center, size, bevel, hex, rot) {
    const color = new THREE.Color(hex);
    const h = [size[0] / 2, size[1] / 2, size[2] / 2];
    const b = Math.min(bevel, h[0] * 0.5, h[1] * 0.5, h[2] * 0.5);
    const i = [h[0] - b, h[1] - b, h[2] - b];
    const self = this;

    function pt(p) {
      return place(center, rot, p[0], p[1], p[2]);
    }
    function dir(d) {
      return place([0, 0, 0], rot, d[0], d[1], d[2]);
    }

    // As seis faces, recuadas de b nos dois eixos do proprio plano.
    const axes = [
      [0, 1, 2],
      [1, 2, 0],
      [2, 0, 1]
    ];
    for (let a = 0; a < 3; a++) {
      const u = axes[a][1];
      const v = axes[a][2];
      for (let s = -1; s <= 1; s += 2) {
        const corners = [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1]
        ].map(function (c) {
          const p = [0, 0, 0];
          p[a] = s * h[a];
          p[u] = c[0] * i[u];
          p[v] = c[1] * i[v];
          return pt(p);
        });
        const out = [0, 0, 0];
        out[a] = s;
        self.faceQuad(corners[0], corners[1], corners[2], corners[3], dir(out), color);
      }
    }

    // As doze arestas.
    for (let a = 0; a < 3; a++) {
      for (let bx = a + 1; bx < 3; bx++) {
        const c = 3 - a - bx;
        for (let sa = -1; sa <= 1; sa += 2) {
          for (let sb = -1; sb <= 1; sb += 2) {
            const p1 = [0, 0, 0];
            p1[a] = sa * h[a];
            p1[bx] = sb * i[bx];
            p1[c] = -i[c];
            const p2 = p1.slice();
            p2[c] = i[c];
            const p3 = [0, 0, 0];
            p3[a] = sa * i[a];
            p3[bx] = sb * h[bx];
            p3[c] = i[c];
            const p4 = p3.slice();
            p4[c] = -i[c];
            const out = [0, 0, 0];
            out[a] = sa;
            out[bx] = sb;
            self.faceQuad(pt(p1), pt(p2), pt(p3), pt(p4), dir(out), color);
          }
        }
      }
    }

    // Os oito cantos.
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let sy = -1; sy <= 1; sy += 2) {
        for (let sz = -1; sz <= 1; sz += 2) {
          self.faceTri(
            pt([sx * h[0], sy * i[1], sz * i[2]]),
            pt([sx * i[0], sy * h[1], sz * i[2]]),
            pt([sx * i[0], sy * i[1], sz * h[2]]),
            dir([sx, sy, sz]),
            color
          );
        }
      }
    }
  };

  Builder.prototype.geometry = function () {
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(this.indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  };

  // ---------- As pecas da cabine ----------
  // p = centro, s = tamanho, c = cor, b = chanfro (ausente = quina viva),
  // r = rotacao em radianos. Medidas em metros, na mesma escala do resto
  // do jogo (o olho do motorista fica a 1,10 m do assoalho da cabine, ver
  // CAMERA acima).
  const CABIN = [
    // --- Assoalho e tunel ---
    // O assoalho e maior que a cabine de proposito: as bordas ficam
    // escondidas atras dos paineis de porta e da parede de fogo, e e o que
    // garante que olhar para baixo nunca ache uma fresta para fora do carro.
    { p: [0, -0.07, -0.1], s: [2.0, 0.14, 2.3], c: C.carpet, b: 0.02 },
    { p: [0.02, 0.08, -0.15], s: [0.36, 0.26, 1.4], c: C.tunnel, b: 0.06 },
    { p: [-0.44, 0.02, -0.34], s: [0.56, 0.04, 0.66], c: C.mat, b: 0.015 },
    { p: [0.46, 0.02, -0.34], s: [0.56, 0.04, 0.66], c: C.mat, b: 0.015 },

    // --- Parede de fogo e painel ---
    // O painel sobe em tres degraus rasos em vez de um bloco unico: e o
    // que faz o pad parecer abaulado quando a luz do ceu bate nele.
    { p: [0, 0.36, -1.06], s: [1.78, 0.64, 0.2], c: C.dashLow },
    { p: [0, 0.5, -0.86], s: [1.74, 0.28, 0.22], c: C.dashLow, b: 0.05 },
    { p: [0, 0.69, -0.84], s: [1.74, 0.2, 0.24], c: C.dashFace, b: 0.05 },
    { p: [0, 0.805, -0.79], s: [1.74, 0.06, 0.22], c: C.dashTop, b: 0.03 },
    { p: [0, 0.835, -0.89], s: [1.74, 0.05, 0.16], c: C.dashTop, b: 0.025 },
    { p: [0, 0.858, -0.98], s: [1.74, 0.04, 0.14], c: C.dashTop, b: 0.02 },
    { p: [0, 0.884, -0.94], s: [1.2, 0.02, 0.1], c: C.darkPlastic },

    // --- Capo dos instrumentos, na frente do motorista ---
    { p: [-0.37, 0.75, -0.74], s: [0.58, 0.28, 0.22], c: C.binnacle, b: 0.06 },
    { p: [-0.37, 0.89, -0.76], s: [0.62, 0.05, 0.32], c: C.binnacle, b: 0.02, r: { x: 0.18 } },
    { p: [-0.37, 0.55, -0.66], s: [0.16, 0.18, 0.26], c: C.plastic, b: 0.05 },

    // --- Console central, saidas de ar e porta-luvas ---
    { p: [0.14, 0.66, -0.79], s: [0.36, 0.4, 0.2], c: C.plastic, b: 0.03 },
    { p: [0.14, 0.75, -0.682], s: [0.3, 0.11, 0.02], c: C.darkPlastic },
    { p: [0.14, 0.6, -0.682], s: [0.3, 0.09, 0.02], c: C.darkPlastic },
    { p: [-0.74, 0.72, -0.705], s: [0.16, 0.07, 0.04], c: C.darkPlastic },
    { p: [0.62, 0.72, -0.705], s: [0.16, 0.07, 0.04], c: C.darkPlastic },
    { p: [0.6, 0.5, -0.76], s: [0.46, 0.2, 0.18], c: C.dashFace, b: 0.03 },
    { p: [0.6, 0.56, -0.685], s: [0.14, 0.03, 0.03], c: C.trim },

    // --- Porta esquerda, a do motorista ---
    // Aqui esta a correcao principal: o painel da porta para na altura do
    // apoio de braco (topo do friso em y 0,78) e NADA sobe dali ate o
    // trilho do teto, em y 1,36. Esses 58 cm de vao aberto sao a janela.
    { p: [-0.87, 0.475, -0.05], s: [0.1, 0.83, 1.46], c: C.doorCard, b: 0.03 },
    { p: [-0.845, 0.1, -0.05], s: [0.07, 0.2, 1.46], c: C.doorLow },
    { p: [-0.87, 0.45, -0.87], s: [0.1, 0.9, 0.24], c: C.doorLow, b: 0.02 },
    { p: [-0.8, 0.79, 0.04], s: [0.16, 0.1, 0.46], c: C.doorCard, b: 0.035 },
    { p: [-0.81, 0.8, -0.22], s: [0.1, 0.055, 0.3], c: C.plastic, b: 0.02 },
    { p: [-0.825, 0.3, -0.46], s: [0.05, 0.22, 0.22], c: C.darkPlastic },
    { p: [-0.87, 0.89, -0.05], s: [0.11, 0.08, 1.46], c: C.beltLine, b: 0.025 },
    { p: [-0.83, 0.97, -0.5], s: [0.035, 0.05, 0.12], c: C.chrome },

    // Coluna A inclinada para tras (e o pe do para-brisa), poste do
    // basculante, coluna B e o trilho do teto: e so isso que cerca o vao.
    { p: [-0.845, 1.08, -0.93], s: [0.105, 0.66, 0.15], c: C.pillar, b: 0.03, r: { x: 0.22 } },
    { p: [-0.855, 1.06, -0.74], s: [0.05, 0.56, 0.05], c: C.pillar },
    { p: [-0.85, 1.08, 0.62], s: [0.11, 0.62, 0.14], c: C.pillar, b: 0.03 },
    { p: [-0.85, 1.42, -0.06], s: [0.11, 0.13, 1.7], c: C.rail, b: 0.03 },

    // --- Porta direita, mesma armacao ---
    { p: [0.87, 0.475, -0.05], s: [0.1, 0.83, 1.46], c: C.doorCard, b: 0.03 },
    { p: [0.845, 0.1, -0.05], s: [0.07, 0.2, 1.46], c: C.doorLow },
    { p: [0.87, 0.45, -0.87], s: [0.1, 0.9, 0.24], c: C.doorLow, b: 0.02 },
    { p: [0.8, 0.79, 0.04], s: [0.16, 0.1, 0.46], c: C.doorCard, b: 0.035 },
    { p: [0.87, 0.89, -0.05], s: [0.11, 0.08, 1.46], c: C.beltLine, b: 0.025 },
    { p: [0.845, 1.08, -0.93], s: [0.105, 0.66, 0.15], c: C.pillar, b: 0.03, r: { x: 0.22 } },
    { p: [0.855, 1.06, -0.74], s: [0.05, 0.56, 0.05], c: C.pillar },
    { p: [0.85, 1.08, 0.62], s: [0.11, 0.62, 0.14], c: C.pillar, b: 0.03 },
    { p: [0.85, 1.42, -0.06], s: [0.11, 0.13, 1.7], c: C.rail, b: 0.03 },

    // --- Teto ---
    // Tres faixas, as duas laterais tombadas alguns graus: da o
    // abaulamento do forro sem custar uma malha curva.
    { p: [0, 1.5, -0.04], s: [0.94, 0.06, 1.7], c: C.roof, b: 0.02 },
    { p: [-0.5, 1.485, -0.04], s: [0.42, 0.06, 1.7], c: C.roof, b: 0.02, r: { z: 0.06 } },
    { p: [0.5, 1.485, -0.04], s: [0.42, 0.06, 1.7], c: C.roof, b: 0.02, r: { z: -0.06 } },
    { p: [0, 1.4, -0.99], s: [1.8, 0.16, 0.2], c: C.rail, b: 0.04, r: { x: 0.25 } },
    { p: [0, 1.4, 0.78], s: [1.8, 0.16, 0.16], c: C.rail },

    // --- Banco do motorista ---
    // Assento, as duas laterais de contencao, encosto tombado 6 graus,
    // apoio de cabeca nas hastes e o cinto na diagonal.
    { p: [-0.42, 0.29, 0.3], s: [0.5, 0.16, 0.58], c: C.seat, b: 0.06 },
    { p: [-0.67, 0.34, 0.3], s: [0.1, 0.2, 0.58], c: C.seatSide, b: 0.05 },
    { p: [-0.17, 0.34, 0.3], s: [0.1, 0.2, 0.58], c: C.seatSide, b: 0.05 },
    { p: [-0.42, 0.78, 0.62], s: [0.5, 0.86, 0.14], c: C.seatBack, b: 0.06, r: { x: 0.1 } },
    { p: [-0.67, 0.76, 0.6], s: [0.1, 0.78, 0.18], c: C.seatSide, b: 0.05, r: { x: 0.1 } },
    { p: [-0.17, 0.76, 0.6], s: [0.1, 0.78, 0.18], c: C.seatSide, b: 0.05, r: { x: 0.1 } },
    { p: [-0.42, 1.16, 0.66], s: [0.2, 0.06, 0.05], c: C.metal },
    { p: [-0.42, 1.26, 0.68], s: [0.28, 0.18, 0.13], c: C.seatBack, b: 0.05, r: { x: 0.1 } },
    { p: [-0.63, 0.92, 0.52], s: [0.05, 0.6, 0.02], c: C.strap, r: { z: -0.28, x: 0.1 } },

    // --- Banco do passageiro, mais simples: fica atras da cabeca ---
    { p: [0.44, 0.29, 0.3], s: [0.5, 0.16, 0.58], c: C.seat, b: 0.05 },
    { p: [0.19, 0.34, 0.3], s: [0.1, 0.2, 0.58], c: C.seatSide },
    { p: [0.69, 0.34, 0.3], s: [0.1, 0.2, 0.58], c: C.seatSide },
    { p: [0.44, 0.78, 0.62], s: [0.5, 0.86, 0.14], c: C.seatBack, b: 0.05, r: { x: 0.1 } },
    { p: [0.44, 1.26, 0.68], s: [0.28, 0.18, 0.13], c: C.seatBack, b: 0.04, r: { x: 0.1 } },

    // --- Console entre os bancos e o banco de tras ---
    { p: [0.02, 0.32, 0.22], s: [0.3, 0.24, 0.6], c: C.tunnel, b: 0.04 },
    { p: [0.02, 0.44, 0.34], s: [0.16, 0.03, 0.18], c: C.darkPlastic },
    { p: [0, 0.36, 0.82], s: [1.72, 0.22, 0.32], c: C.seat },
    { p: [0, 0.86, 0.94], s: [1.72, 0.8, 0.12], c: C.seatBack }
  ];

  function build() {
    const grainTexture = buildGrainTexture();
    const clusterTexture = buildClusterTexture();
    const mirrorTexture = buildMirrorTexture();

    const materials = [];
    const geometries = [];
    function track(geometry) {
      geometries.push(geometry);
      return geometry;
    }

    // Material da cabine: granulado + cor de vertice, uma malha, uma draw
    // call - igual a versao anterior.
    const cabinMaterial = window.PSXCutsceneMaterial.create({
      map: grainTexture,
      vertexColors: true,
      fog: true
    });
    materials.push(cabinMaterial);

    const partMaterialCache = new Map();
    function partMaterial(hex) {
      if (!partMaterialCache.has(hex)) {
        const material = window.PSXCutsceneMaterial.create({
          map: grainTexture,
          color: new THREE.Color(hex),
          fog: true
        });
        partMaterialCache.set(hex, material);
        materials.push(material);
      }
      return partMaterialCache.get(hex);
    }

    // Vidro: material transparente que nao escreve profundidade, igual ao
    // das janelas da casa (ver models/window-glass-factory.js).
    function glassMaterial(opacity) {
      const material = window.PSXCutsceneMaterial.create({
        color: new THREE.Color(rgb(206, 216, 220)),
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true
      });
      materials.push(material);
      return material;
    }

    const root = new THREE.Group();
    root.name = 'CabineCarro';

    // ---------- Casco: tudo da tabela numa malha so ----------
    const builder = new Builder();
    for (let i = 0; i < CABIN.length; i++) {
      const part = CABIN[i];
      if (part.b) {
        builder.bevelBox(part.p, part.s, part.b, part.c, part.r);
      } else {
        builder.box(part.p, part.s, part.c, part.r);
      }
    }
    const cabinMesh = new THREE.Mesh(track(builder.geometry()), cabinMaterial);
    cabinMesh.name = 'CabineCasco';
    root.add(cabinMesh);

    // Peca solta de quina viva (parafusos, hastes, coisa pequena).
    function addBox(width, height, depth, hex, x, y, z) {
      const mesh = new THREE.Mesh(
        track(new THREE.BoxGeometry(width, height, depth)),
        partMaterial(hex)
      );
      mesh.position.set(x, y, z);
      return mesh;
    }

    // Peca solta CHANFRADA: mesma coisa, com as quinas quebradas. Usada em
    // tudo que fica a menos de meio metro da lente (volante, cambio,
    // retrovisor), onde a quina viva denuncia na hora que e uma caixa.
    function addBevel(width, height, depth, bevel, hex, x, y, z) {
      const local = new Builder();
      local.bevelBox([0, 0, 0], [width, height, depth], bevel, hex);
      const mesh = new THREE.Mesh(track(local.geometry()), partMaterial(hex));
      mesh.position.set(x, y, z);
      return mesh;
    }

    // ---------- Vidros ----------
    // Para-brisa: da base em y 0,86 ao topo em y 1,34, deitado 18 graus.
    const windshield = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.72, 0.52)),
      glassMaterial(0.13)
    );
    windshield.position.set(0, 1.1, -0.94);
    windshield.rotation.x = 0.32;
    root.add(windshield);

    // Vidro do motorista MEIO BAIXADO: sobra a faixa de 16 cm no alto do
    // vao. E o que da para ver da estrada pela esquerda sem o vidro
    // atravessado na frente.
    const sideWindowLeft = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.3, 0.16)),
      glassMaterial(0.12)
    );
    sideWindowLeft.position.set(-0.855, 1.28, -0.05);
    sideWindowLeft.rotation.y = Math.PI / 2;
    root.add(sideWindowLeft);

    // O basculante da frente, aquele vidrinho de canto que gira: fechado.
    const quarterGlass = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.16, 0.4)),
      glassMaterial(0.16)
    );
    quarterGlass.position.set(-0.855, 1.14, -0.82);
    quarterGlass.rotation.y = Math.PI / 2;
    root.add(quarterGlass);

    // Do lado do passageiro o vidro esta fechado, ocupando o vao inteiro.
    const sideWindowRight = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.3, 0.42)),
      glassMaterial(0.17)
    );
    sideWindowRight.position.set(0.855, 1.14, -0.05);
    sideWindowRight.rotation.y = Math.PI / 2;
    root.add(sideWindowRight);

    const rearGlass = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.5, 0.42)),
      glassMaterial(0.2)
    );
    rearGlass.position.set(0, 1.14, 0.86);
    rearGlass.rotation.x = -0.3;
    root.add(rearGlass);

    // ---------- Mostradores ----------
    // A face fica virada 20 graus para cima, apontando para o olho do
    // motorista - nao reta para tras como antes.
    const clusterMaterial = window.PSXCutsceneMaterial.create({
      map: clusterTexture,
      fog: true
    });
    materials.push(clusterMaterial);
    const cluster = new THREE.Mesh(track(new THREE.PlaneGeometry(0.52, 0.24)), clusterMaterial);
    cluster.position.set(-0.37, 0.755, -0.618);
    cluster.rotation.x = -0.35;
    root.add(cluster);

    const clusterGlass = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.52, 0.24)),
      glassMaterial(0.09)
    );
    clusterGlass.position.set(-0.37, 0.756, -0.6155);
    clusterGlass.rotation.x = -0.35;
    root.add(clusterGlass);

    // Ponteiro do velocimetro: o unico pedaco da cabine que se move por
    // conta da velocidade (ver update). Fica no centro do relogio grande,
    // que na textura esta no primeiro quarto da esquerda.
    const needleGeometry = track(new THREE.BufferGeometry());
    needleGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, -0.005, 0, 0.078, 0, 0, 0, 0.005, 0, -0.014, 0, 0], 3)
    );
    needleGeometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3)
    );
    needleGeometry.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2)
    );
    needleGeometry.setIndex([0, 1, 2, 0, 2, 3]);
    const needle = new THREE.Mesh(needleGeometry, partMaterial(rgb(228, 222, 210)));
    needle.position.set(-0.51, 0.769, -0.6125);
    needle.rotation.x = -0.35;
    root.add(needle);

    // ---------- Volante ----------
    // O grupo esta tombado 35 graus para tras (o eixo da coluna aponta
    // para cima e para o peito do motorista, como em carro de verdade - a
    // versao anterior tombava para o lado errado). A rotacao Z do grupo
    // continua sendo o motorista corrigindo a direcao, ver update.
    const wheelGroup = new THREE.Group();
    wheelGroup.name = 'Volante';
    wheelGroup.position.set(-0.37, 0.575, -0.33);
    wheelGroup.rotation.x = -0.62;
    root.add(wheelGroup);

    // Aro: 24 lados em vez de 18, e o tubo mais fino. Redondo o bastante
    // para nao virar um octogono a 320x180.
    const rim = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.185, 0.019, 6, 24)),
      partMaterial(C.wheel)
    );
    wheelGroup.add(rim);

    // Anel da buzina, por dentro do aro: o brilho dele e o que faz o
    // volante se destacar do painel escuro.
    const hornRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.105, 0.008, 5, 16)),
      partMaterial(C.trim)
    );
    hornRing.position.z = 0.014;
    wheelGroup.add(hornRing);

    // Tres raios, como nos volantes de tres pontas dos anos 80: um para
    // baixo e dois abrindo para cima.
    function spoke(length, thickness, angle) {
      const mesh = new THREE.Mesh(
        track(new THREE.BoxGeometry(length, thickness, 0.026)),
        partMaterial(C.wheel)
      );
      mesh.position.set(Math.cos(angle) * length * 0.5, Math.sin(angle) * length * 0.5, 0);
      mesh.rotation.z = angle;
      return mesh;
    }
    wheelGroup.add(spoke(0.175, 0.042, -Math.PI / 2));
    wheelGroup.add(spoke(0.175, 0.034, Math.PI * 0.82));
    wheelGroup.add(spoke(0.175, 0.034, Math.PI * 0.18));

    // Cubo com a tampa da buzina.
    const hub = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.048, 0.055, 0.05, 10)),
      partMaterial(C.plastic)
    );
    hub.rotation.x = Math.PI / 2;
    wheelGroup.add(hub);
    const hornPad = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.032, 0.032, 0.012, 8)),
      partMaterial(C.trim)
    );
    hornPad.rotation.x = Math.PI / 2;
    hornPad.position.z = 0.03;
    wheelGroup.add(hornPad);

    // Coluna de direcao: sai do cubo e desce para dentro da capa que esta
    // no painel.
    const column = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.026, 0.032, 0.3, 8)),
      partMaterial(C.darkPlastic)
    );
    column.position.set(-0.37, 0.47, -0.47);
    column.rotation.x = 0.95;
    root.add(column);

    // As duas alavancas: seta a esquerda, limpador a direita.
    function stalk(x, sign) {
      const mesh = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.011, 0.013, 0.17, 6)),
        partMaterial(C.darkPlastic)
      );
      mesh.position.set(x, 0.605, -0.55);
      mesh.rotation.z = (sign * Math.PI) / 2;
      mesh.rotation.x = 0.2;
      return mesh;
    }
    root.add(stalk(-0.52, 1));
    root.add(stalk(-0.22, -1));

    // ---------- Cambio, freio de mao e pedais ----------
    const shifter = new THREE.Group();
    shifter.position.set(0.02, 0.21, -0.08);
    root.add(shifter);
    // Coifa de borracha, haste inclinada para tras e o manopla.
    const boot = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.055, 0.085, 0.1, 8)),
      partMaterial(C.rubber)
    );
    shifter.add(boot);
    const lever = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.013, 0.017, 0.24, 6)),
      partMaterial(C.metal)
    );
    lever.position.set(-0.02, 0.16, 0.03);
    lever.rotation.z = 0.1;
    lever.rotation.x = -0.14;
    shifter.add(lever);
    shifter.add(addBevel(0.075, 0.07, 0.075, 0.026, C.darkPlastic, -0.035, 0.28, 0.06));

    // Freio de mao no tunel, do lado direito do motorista.
    const handbrake = new THREE.Group();
    handbrake.position.set(-0.14, 0.22, 0.16);
    root.add(handbrake);
    handbrake.add(addBox(0.06, 0.04, 0.16, C.darkPlastic, 0, 0, 0));
    const brakeLever = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.017, 0.02, 0.26, 6)),
      partMaterial(C.metal)
    );
    brakeLever.position.set(0, 0.07, 0.1);
    brakeLever.rotation.x = -1.0;
    handbrake.add(brakeLever);
    handbrake.add(addBevel(0.045, 0.045, 0.11, 0.018, C.rubber, 0, 0.14, 0.2));

    // Pedais. Ficam abaixo do quadro na maior parte do tempo, mas quando a
    // cabeca balanca para baixo eles aparecem - e sao tres, com o da
    // embreagem mais alto, como em cambio manual.
    function pedal(x, height, scale) {
      const group = new THREE.Group();
      group.position.set(x, height, -0.56);
      group.add(addBox(0.018, 0.14, 0.018, C.metal, 0, 0.07, 0));
      const plate = addBevel(0.075, 0.11, 0.016, 0.008, C.rubber, 0, 0, 0);
      plate.rotation.x = -0.26;
      group.add(plate);
      group.scale.x = scale;
      return group;
    }
    root.add(pedal(-0.56, 0.19, 1));
    root.add(pedal(-0.4, 0.17, 1));
    root.add(pedal(-0.25, 0.15, 0.72));

    // ---------- Retrovisores ----------
    const mirrorMaterial = window.PSXCutsceneMaterial.create({
      map: mirrorTexture,
      side: THREE.DoubleSide,
      fog: true
    });
    materials.push(mirrorMaterial);

    // Espelho cortado nos cantos: um octogono chato, como no pacote
    // original.
    function mirrorGlass(width, height) {
      const shape = new THREE.Shape();
      const cut = 0.03;
      shape.moveTo(-width / 2 + cut, -height / 2);
      shape.lineTo(width / 2 - cut, -height / 2);
      shape.lineTo(width / 2, -height / 2 + cut);
      shape.lineTo(width / 2, height / 2 - cut);
      shape.lineTo(width / 2 - cut, height / 2);
      shape.lineTo(-width / 2 + cut, height / 2);
      shape.lineTo(-width / 2, height / 2 - cut);
      shape.lineTo(-width / 2, -height / 2 + cut);
      return new THREE.Mesh(track(new THREE.ShapeGeometry(shape)), mirrorMaterial);
    }

    // Retrovisor central, pendurado na travessa do para-brisa.
    const rearMirror = new THREE.Group();
    rearMirror.position.set(0.02, 1.3, -0.9);
    rearMirror.rotation.x = -0.12;
    root.add(rearMirror);
    rearMirror.add(addBox(0.022, 0.09, 0.022, C.darkPlastic, 0, 0.07, 0));
    rearMirror.add(addBevel(0.3, 0.12, 0.028, 0.012, C.darkPlastic, 0, 0, -0.012));
    const rearGlassMirror = mirrorGlass(0.27, 0.095);
    rearGlassMirror.position.z = 0.006;
    rearMirror.add(rearGlassMirror);

    // O TERCO pendurado no retrovisor. Ele nao e enfeite: e o unico objeto
    // solto da cabine, e e ele que traduz o balanco da estrada em algo que
    // a vista percebe (ver update). Combina com o resto do mundo do jogo,
    // que ja tem a pichacao de Nossa Senhora na parede da casa.
    const rosary = new THREE.Group();
    rosary.position.set(0.02, 1.29, -0.878);
    root.add(rosary);
    for (let bead = 0; bead < 6; bead++) {
      const size = bead === 5 ? 0.016 : 0.011;
      const dot = addBox(size, size, size, bead === 5 ? C.bead : C.trim, 0, -0.03 - bead * 0.032, 0);
      rosary.add(dot);
    }
    rosary.add(addBox(0.011, 0.05, 0.009, C.metal, 0, -0.25, 0));
    rosary.add(addBox(0.032, 0.011, 0.009, C.metal, 0, -0.245, 0));

    // Retrovisor externo esquerdo, visto POR DENTRO do vao da janela: e o
    // que da profundidade para a janela aberta.
    const sideMirror = new THREE.Group();
    sideMirror.position.set(-0.96, 1.02, -0.66);
    root.add(sideMirror);
    const sideStem = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.016, 0.02, 0.12, 6)),
      partMaterial(C.darkPlastic)
    );
    sideStem.rotation.z = Math.PI / 2;
    sideStem.position.x = 0.06;
    sideMirror.add(sideStem);
    sideMirror.add(addBevel(0.03, 0.13, 0.19, 0.012, C.darkPlastic, 0, 0, 0));
    const sideGlass = mirrorGlass(0.16, 0.11);
    sideGlass.rotation.y = -Math.PI / 2;
    sideGlass.position.x = -0.017;
    sideMirror.add(sideGlass);

    // ---------- Quebra-sois, luz de teto, alca e limpadores ----------
    // Quebra-sois recolhidos, encostados no forro.
    function visor(x) {
      const mesh = addBevel(0.46, 0.035, 0.2, 0.014, C.roof, x, 1.4, -0.82);
      mesh.rotation.x = 0.22;
      return mesh;
    }
    root.add(visor(-0.4));
    root.add(visor(0.4));

    // Luz de teto.
    root.add(addBevel(0.13, 0.035, 0.09, 0.012, C.trim, 0.02, 1.455, 0.12));

    // Alca de apoio acima da porta do passageiro.
    root.add(addBevel(0.045, 0.05, 0.22, 0.016, C.plastic, 0.79, 1.36, 0.1));

    // Limpadores PARADOS na posicao de descanso. Agora chove na cutscene
    // (ver o volume de chuva em cutscenes/road-cutscene.js), mas eles
    // continuam exatamente onde sempre estiveram: varrer o para-brisa nao
    // foi pedido, e o limpador e a unica peca da cabine que precisaria de
    // animacao nova para isso.
    function wiper(length, x) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.9, -1.01);
      pivot.rotation.x = 0.32;
      pivot.rotation.z = 0.1;
      pivot.add(addBox(length, 0.012, 0.012, C.darkPlastic, length * 0.5, 0, 0));
      const blade = addBox(length * 0.7, 0.018, 0.008, C.rubber, length * 0.62, -0.014, 0.004);
      blade.rotation.z = -0.06;
      pivot.add(blade);
      return pivot;
    }
    root.add(wiper(0.5, -0.5));
    root.add(wiper(0.44, 0.16));

    // ---------- Camera: a cabeca do Kael ----------
    // Igual a versao anterior: a camera e filha de um PIVO no pescoco, e a
    // mira do CAMERA acima virou a rotacao BASE desse pivo. O passeio do
    // olhar, a centralizacao no toque do telefone e o balanco da estrada
    // entram como desvios em cima dela.
    const head = new THREE.Group();
    head.name = 'CabecaMotorista';
    head.position.set(CAMERA.position.x, CAMERA.position.y, CAMERA.position.z);
    head.rotation.order = 'YXZ';
    root.add(head);

    const aim = new THREE.Vector3(
      CAMERA.target.x - CAMERA.position.x,
      CAMERA.target.y - CAMERA.position.y,
      CAMERA.target.z - CAMERA.position.z
    ).normalize();
    const BASE_PITCH = Math.asin(aim.y);
    const BASE_YAW = Math.atan2(-aim.x, -aim.z);

    const camera = new THREE.PerspectiveCamera(CAMERA.fov, 16 / 9, 0.03, 320);
    head.add(camera);

    // ---------- Vida (o carro andando e a cabeca do motorista) ----------
    const gaze = { weight: 1, centering: false, time: 0, duration: CENTER_SECONDS };
    const jolt = { pitch: 0, pitchV: 0, roll: 0, rollV: 0, rise: 0, riseV: 0, next: 0.25 };
    const JOLT_OMEGA = Math.sqrt(JOLT_STIFFNESS);

    function centerView(seconds) {
      if (gaze.centering) {
        return;
      }
      gaze.centering = true;
      gaze.time = 0;
      gaze.duration = seconds === undefined ? CENTER_SECONDS : seconds;
    }

    function fireJolt() {
      const big = Math.random() < 0.12;
      const size = big ? 1.9 + Math.random() * 0.9 : 0.45 + Math.random() * 0.75;
      const side = Math.random() < 0.5 ? -1 : 1;
      jolt.pitchV += size * JOLT_PITCH * JOLT_OMEGA * (Math.random() < 0.75 ? 1 : -1);
      jolt.rollV += side * size * JOLT_ROLL * JOLT_OMEGA;
      jolt.riseV += size * JOLT_RISE * JOLT_OMEGA;
    }

    function integrate(step) {
      let left = step;
      while (left > 0) {
        const h = Math.min(1 / 120, left);
        left -= h;
        jolt.pitchV += (-JOLT_STIFFNESS * jolt.pitch - JOLT_DAMPING * jolt.pitchV) * h;
        jolt.pitch += jolt.pitchV * h;
        jolt.rollV += (-JOLT_STIFFNESS * jolt.roll - JOLT_DAMPING * jolt.rollV) * h;
        jolt.roll += jolt.rollV * h;
        jolt.riseV += (-JOLT_RISE_STIFFNESS * jolt.rise - JOLT_RISE_DAMPING * jolt.riseV) * h;
        jolt.rise += jolt.riseV * h;
      }
    }

    function update(elapsed, speedKmh, delta) {
      const step = delta === undefined ? 1 / 60 : Math.min(0.05, delta);

      // --- A cabine: suspensao lenta, igual a de antes ---
      const bob = Math.sin(elapsed * 2.2) * 0.008 + Math.sin(elapsed * 0.9) * 0.004;
      const turn = Math.sin(elapsed * 0.42) * 0.12;

      root.rotation.z = turn * 0.018;
      root.rotation.x = bob * 0.06;

      // Motorista corrigindo a direcao na terra batida.
      wheelGroup.rotation.z = Math.sin(elapsed * 0.65) * 0.18 + turn * 0.9;

      // Ponteiro: a MESMA conta que distribuiu os numeros na textura, com
      // o sinal trocado (na textura o angulo cresce com o eixo Y para baixo,
      // no plano 3D ele cresce para cima). Zero km/h no traco do zero.
      needle.rotation.z = THREE.MathUtils.degToRad(
        -DIAL_START - (Math.min(speedKmh, SPEED_MAX) / SPEED_MAX) * DIAL_SWEEP
      );

      // --- As pedras: sorteia e integra ---
      jolt.next -= step;
      while (jolt.next <= 0) {
        fireJolt();
        jolt.next += JOLT_MIN_GAP + Math.random() * JOLT_GAP_SPREAD;
      }
      integrate(step);

      // O terco pendurado no retrovisor: mesma mola da cabeca, com mais
      // amplitude e atrasada meio quadro. E o pedaco de cabine que MOSTRA
      // o solavanco em vez de so aplica-lo na lente.
      rosary.rotation.z = jolt.roll * 2.6 + Math.sin(elapsed * 1.7) * 0.03;
      rosary.rotation.x = -jolt.pitch * 2.2 + Math.sin(elapsed * 1.3 + 0.8) * 0.025;

      // --- O olhar: passeando, depois centralizado ---
      if (gaze.centering && gaze.weight > 0) {
        gaze.time = Math.min(gaze.duration, gaze.time + step);
        const t = gaze.duration > 0 ? gaze.time / gaze.duration : 1;
        gaze.weight = 1 - t * t * (3 - 2 * t);
      }
      const w = gaze.weight;
      const lookYaw =
        (Math.sin(elapsed * 0.34) * 0.68 + Math.sin(elapsed * 0.13 + 1.1) * 0.32) * GAZE_YAW * w;
      const lookPitch = Math.sin(elapsed * 0.23 + 0.6) * GAZE_PITCH * w;
      const lookRoll = Math.sin(elapsed * 0.19 + 2.0) * GAZE_ROLL * w;

      // --- Tremor de fundo: motor e a costela da terra batida ---
      const tremorPitch =
        Math.sin(elapsed * 13.7) * TREMOR_PITCH + Math.sin(elapsed * 17.3 + 0.7) * TREMOR_PITCH * 0.6;
      const tremorRoll = Math.sin(elapsed * 11.1 + 1.4) * TREMOR_ROLL;
      const tremorRise = Math.sin(elapsed * 15.2) * TREMOR_RISE;

      head.rotation.y = BASE_YAW + lookYaw + jolt.roll * 0.25;
      head.rotation.x = BASE_PITCH + lookPitch + jolt.pitch + tremorPitch;
      head.rotation.z = lookRoll + jolt.roll + tremorRoll;
      head.position.y = CAMERA.position.y + jolt.rise + tremorRise;
      head.position.x = CAMERA.position.x + jolt.roll * 0.03;

      return bob;
    }

    function dispose() {
      geometries.forEach(function (geometry) {
        geometry.dispose();
      });
      materials.forEach(function (material) {
        material.dispose();
      });
      grainTexture.dispose();
      clusterTexture.dispose();
      mirrorTexture.dispose();
      if (root.parent) {
        root.parent.remove(root);
      }
    }

    return {
      root: root,
      camera: camera,
      rideHeight: RIDE_HEIGHT,
      update: update,
      centerView: centerView,
      dispose: dispose
    };
  }

  return {
    build: build,
    CAMERA: CAMERA,
    RIDE_HEIGHT: RIDE_HEIGHT
  };
})();
