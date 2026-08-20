/**
 * materials/light-zones.js
 * -------------------------------------------------
 * A LUZ DE CADA COMODO PARA NA PAREDE DELE.
 *
 * O problema que este arquivo resolve: as luminarias de teto da casa
 * (models/lamp-factory.js) e o abajur do quarto
 * (models/table-lamp-factory.js) sao THREE.PointLight, e PointLight do
 * three.js nao sabe o que e parede. Ela ilumina TODA superficie dentro do
 * alcance dela, do outro lado de qualquer geometria - o jogo nao usa
 * shadow map (PS1 nao tinha, e no celular custa caro). Resultado: a
 * claridade da luminaria da varanda aparecia no piso e no forro do
 * corredor, atravessando a fachada, e o mesmo acontecia entre comodos
 * vizinhos.
 *
 * A correcao NAO e sombra. E uma ZONA: cada comodo registra aqui a caixa
 * (AABB, em coordenadas do MUNDO) que ele ocupa, e o shader de todo
 * material iluminado da casa passa a fazer uma pergunta a mais por luz e
 * por pixel:
 *
 *   esta PointLight cai dentro de alguma zona?
 *     - nao cai -> ilumina como sempre (nada muda).
 *     - cai     -> so ilumina este pixel se o pixel estiver na MESMA zona.
 *
 * A luz da varanda continua iluminando a varanda inteira (piso, muro,
 * forro, pilares) e deixa de existir para qualquer pixel do corredor. Nao
 * ha vazamento possivel, porque o teste e de POSICAO e nao de
 * visibilidade: nenhum raio, nenhum mapa de sombra, nenhum passe extra -
 * so um loop curto de comparacoes no fragmento.
 *
 * ---------- Por que a comparacao e pela POSICAO da luz ----------
 * O three.js entrega as point lights ao shader como um array
 * (pointLights[i]) na ordem em que varre a cena, e essa ordem pode mudar
 * quando um objeto entra ou sai. Por isso nada aqui e indexado por luz: o
 * shader le a POSICAO da luz que esta iluminando, descobre em que zona ela
 * cai e compara com a zona do pixel. Acrescentar, remover ou mover
 * luminaria nao pede nenhuma linha nova.
 *
 * ---------- Interface ----------
 * window.LightZones.reset()
 * window.LightZones.add(box)      box = { minX, maxX, minY, maxY, minZ, maxZ }
 * window.LightZones.applyTo(root) patcheia os materiais da subarvore
 * window.LightZones.update(camera) uma vez por quadro, antes do render
 * window.LightZones.maskAt(lightPos, point) -> 0 ou 1, a MESMA conta em JS
 *                                 para quem calcula luz fora do shader
 *                                 (ver effects/dust-motes.js)
 *
 * ---------- A CORRECAO DAS LINHAS VERTICAIS NAS QUINAS ----------
 * O bug relatado (com imagens): em algumas quinas de comodo aparecia uma
 * LINHA/FEIXE vertical claro e morno, do piso ao forro, mais clara que a
 * parede em volta - visivel tanto no reboco cinza do corredor quanto no
 * lambri verde do rodape, o que ja dizia que nao era textura: era LUZ.
 *
 * E nascia aqui, no `PAD`. Ele era uma folga aplicada IGUALMENTE nos SEIS
 * lados da caixa do comodo no teste do PIXEL. As caixas dos comodos
 * vizinhos se encostam exatamente no plano das paredes (o corredor vai de
 * z = -22 a z = 0 e o MEU QUARTO comeca em z = 0 - ver `bounds` em
 * scripts/main.js), e as paredes LATERAIS do corredor correm ate z = 0.
 * Ou seja: os 3 cm finais da parede lateral, justamente os que chegam na
 * quina, caiam DENTRO da caixa inflada do comodo vizinho. A face deles
 * olha para o corredor, mas olha tambem para a luminaria e para o abajur
 * do quarto - e as duas passavam a iluminar essa tira de 3 cm.
 *
 * O resultado e exatamente o da imagem: uma tira estreita, do chao ao
 * teto, com a luz do comodo AO LADO somada a dela - a "linha" na quina. E
 * valia nas duas pontas: a quina do quarto ganhava a luz do corredor. Nao
 * era z-fighting, nem UV, nem parede sobreposta, nem fresta - as paredes
 * se encontram em aresta exata, sem vao e sem sobra.
 *
 * A correcao troca a folga BURRA por uma folga com DIRECAO: em vez de
 * inflar a caixa nos seis lados, o pixel e empurrado `PAD` metros ao
 * longo da PROPRIA NORMAL antes do teste. Toda superficie passa a ser
 * julgada pelo lado para o qual ela OLHA:
 *
 *   - a face da parede que olha para o corredor cai dentro do corredor,
 *     entao recebe luz do corredor e SO dela - inclusive na quina;
 *   - a mesma parede vista do quarto (os planos sao DoubleSide, e o three
 *     inverte a normal na face de tras) cai dentro do quarto;
 *   - piso e forro continuam caindo dentro do proprio comodo, porque a
 *     normal deles aponta para dentro dele.
 *
 * E continua sem linha PRETA na quina, que era o motivo de o PAD existir:
 * o pixel nao e mais comparado no limite exato da caixa (onde o
 * arredondamento do float decide o resultado), ele e comparado 3 cm
 * DENTRO dela. Sobra so `EPS` (2 mm) nos seis lados, para as arestas em
 * que a normal corre PARALELA a face da caixa - o alto da parede, por
 * exemplo, fica exatamente na altura do forro e a normal dele nao tem
 * componente em Y. 2 mm sao mil vezes o erro de float e vinte vezes menos
 * que um pixel da tela interna de 320x180: absorvem o arredondamento sem
 * poder acender tira nenhuma.
 *
 * Nada mais muda: nenhuma geometria, posicao, textura, UV, colisao ou
 * material foi tocado, e superficie que ja estava de costas para a luz
 * vizinha continua como estava (face virada para o outro lado tem difusa
 * zero de qualquer jeito, com mascara ou sem).
 * -------------------------------------------------
 */

window.LightZones = (function () {
  // Teto de zonas. Seis comodos + varanda hoje; o array do shader tem
  // tamanho fixo porque uniform array em GLSL nao cresce em tempo de
  // execucao. Sobra folga para a casa crescer sem recompilar nada.
  const MAX_ZONES = 16;

  // Quanto o pixel e empurrado ao longo da PROPRIA NORMAL antes do teste,
  // e SO no teste do pixel - o da luz nunca leva folga nenhuma. A face
  // interna da parede, o piso e o forro caem exatamente no limite da caixa
  // do comodo: sem este empurrao, o arredondamento do float deixaria uma
  // linha preta na quina.
  //
  // Empurrar na DIRECAO DA NORMAL (e nao inflar a caixa nos seis lados,
  // como esta folga fazia antes) e o que corrige as linhas verticais nas
  // quinas - ver "A CORRECAO DAS LINHAS VERTICAIS NAS QUINAS" no topo do
  // arquivo. Continua menor que meia espessura de parede (30 cm na casa,
  // ver WALL_THICKNESS), entao ele nunca atravessa para o comodo vizinho.
  const PAD = 0.03;

  // Folga MINIMA nos seis lados da caixa, so para o teste do pixel. Existe
  // para as arestas em que a normal corre PARALELA a face da caixa e o
  // empurrao acima nao ajuda: o alto da parede cai exatamente na altura do
  // forro (maxY da caixa) e a normal dela nao tem componente em Y, entao a
  // comparacao aconteceria no limite exato, onde o float decide - e um
  // pixel rejeitado ali seria uma linha escura no encontro parede/forro.
  //
  // 2 mm: mil vezes o erro de arredondamento e vinte vezes MENOS que um
  // pixel da tela interna de 320x180 a um metro de distancia. Absorve o
  // float sem poder acender tira nenhuma - era justamente o tamanho da
  // folga antiga (3 cm) que virava a linha clara na quina.
  const EPS = 0.002;

  const zoneMin = [];
  const zoneMax = [];
  for (let i = 0; i < MAX_ZONES; i++) {
    zoneMin.push(new THREE.Vector3());
    zoneMax.push(new THREE.Vector3());
  }

  // Uniforms COMPARTILHADOS: todo material patcheado aponta para estes
  // mesmos objetos, entao registrar uma zona nova (ou mover a camera)
  // atualiza a casa inteira de uma vez, sem varrer material nenhum.
  const uniforms = {
    uZoneCount: { value: 0 },
    uZoneMin: { value: zoneMin },
    uZoneMax: { value: zoneMax },
    uZonePad: { value: PAD },
    uZoneEps: { value: EPS },
    // Inversa da matriz de view = matrixWorld da camera. Serve para levar
    // a posicao da luz (que o three entrega em espaco de VIEW) e a do
    // pixel de volta ao espaco do MUNDO, onde as caixas vivem. GLSL ES 1.0
    // nao tem inverse(), entao ela vem pronta de fora.
    uZoneCameraMatrix: { value: new THREE.Matrix4() }
  };

  let count = 0;

  function reset() {
    count = 0;
    uniforms.uZoneCount.value = 0;
  }

  function add(box) {
    if (!box || count >= MAX_ZONES) {
      if (box) {
        console.warn('LightZones: passou de ' + MAX_ZONES + ' zonas; aumente MAX_ZONES.');
      }
      return;
    }
    zoneMin[count].set(box.minX, box.minY, box.minZ);
    zoneMax[count].set(box.maxX, box.maxY, box.maxZ);
    count += 1;
    uniforms.uZoneCount.value = count;
  }

  function update(camera) {
    if (!camera) {
      return;
    }
    // A matriz do MESMO quadro, nao a do quadro passado.
    //
    // O three.js so recalcula `camera.matrixWorld` DENTRO de
    // renderer.render(). Como este update() roda ANTES do render, sem a
    // linha abaixo o que chegava aqui era a matriz do quadro ANTERIOR -
    // e, com a camera girando, a diferenca entre as duas e uma rotacao
    // inteira de quadro. A posicao da luz reconstruida a partir dela saia
    // deslocada em proporcao a distancia (a 10 m, um giro rapido de
    // ~4 rad/s a 60 fps ja da mais de meio metro), a luz caia FORA da
    // caixa do comodo em que ela esta e a mascara passava a rejeitar a
    // luz - o comodo inteiro perdia as PointLights por um quadro e
    // aparecia PRETO (a ambiente da casa e quase nula, ver
    // scripts/main.js). Era o piscar preto ao girar a camera rapido, e
    // vinha daqui.
    camera.updateMatrixWorld();
    uniforms.uZoneCameraMatrix.value.copy(camera.matrixWorld);
  }

  // ---------- A conta, em JS ----------
  // Igual a do shader, linha por linha. Existe porque a poeira suspensa
  // (effects/dust-motes.js) soma a luz das PointLights da casa na CPU, nao
  // no shader: sem isto, a poeira do corredor continuaria acendendo com a
  // luz da varanda mesmo depois de as paredes pararem de vazar.
  function inside(box, x, y, z, pad) {
    return (
      x >= box.min.x - pad &&
      x <= box.max.x + pad &&
      y >= box.min.y - pad &&
      y <= box.max.y + pad &&
      z >= box.min.z - pad &&
      z <= box.max.z + pad
    );
  }

  // `normal` e OPCIONAL, e o mesmo empurrao do shader: com ela o ponto e
  // deslocado PAD metros na direcao para a qual a superficie olha e o teste
  // usa a caixa crua, com EPS de folga. SEM ela (o caso da poeira suspensa,
  // que flutua no ar e nao tem face nenhuma) a conta continua exatamente a
  // de antes - PAD nos seis lados -, porque uma particula no meio do comodo
  // esta longe de qualquer limite de caixa e nunca sofreu do problema das
  // quinas.
  function maskAt(lightPos, point, normal) {
    if (!lightPos || !point) {
      return 1;
    }
    let px = point.x;
    let py = point.y;
    let pz = point.z;
    let pad = PAD;
    if (normal) {
      const len = Math.sqrt(
        normal.x * normal.x + normal.y * normal.y + normal.z * normal.z
      );
      if (len > 0.0001) {
        px += (normal.x / len) * PAD;
        py += (normal.y / len) * PAD;
        pz += (normal.z / len) * PAD;
        pad = EPS;
      }
    }
    for (let i = 0; i < count; i++) {
      const box = { min: zoneMin[i], max: zoneMax[i] };
      if (inside(box, lightPos.x, lightPos.y, lightPos.z, 0)) {
        return inside(box, px, py, pz, pad) ? 1 : 0;
      }
    }
    // Luz fora de toda zona: comportamento de antes deste arquivo existir.
    return 1;
  }

  // ---------- A conta, em GLSL ----------
  // O fragmento precisa saber onde ELE esta no mundo, e essa conta NAO
  // passa mais pela camera: ela sai de `modelMatrix` (a matrixWorld do
  // proprio objeto, que o three.js sempre entrega atualizada) aplicada ao
  // vertice ja deformado - o mesmo `transformed` que o
  // <project_vertex> logo acima usou, entao morph e esqueleto continuam
  // valendo, e a instanceMatrix entra explicitamente para a grama, a mata
  // e a poeira (InstancedMesh).
  //
  // Antes isto era `uZoneCameraMatrix * mvPosition`, ou seja, o pixel ia
  // ao mundo pelo caminho mais longo: espaco de view -> mundo, usando uma
  // matriz de camera que vinha de fora. Qualquer defasagem de um quadro
  // nessa matriz (ver update()) deslocava o pixel em relacao as caixas
  // dos comodos e apagava a luz de superficies que ficam exatamente na
  // borda de uma zona - que e o caso de TODA parede, piso e forro da
  // casa. Pela modelMatrix nao existe defasagem possivel: a posicao e
  // exata, girando a camera ou nao.
  const VERTEX_HEAD = [
    'varying vec3 vZoneWorld;'
  ].join('\n');

  const VERTEX_TAIL = [
    'vec4 zoneLocalPos = vec4( transformed, 1.0 );',
    '#ifdef USE_INSTANCING',
    '  zoneLocalPos = instanceMatrix * zoneLocalPos;',
    '#endif',
    'vZoneWorld = ( modelMatrix * zoneLocalPos ).xyz;'
  ].join('\n\t');

  const FRAGMENT_HEAD = [
    'uniform int uZoneCount;',
    'uniform vec3 uZoneMin[ ' + MAX_ZONES + ' ];',
    'uniform vec3 uZoneMax[ ' + MAX_ZONES + ' ];',
    'uniform float uZonePad;',
    'uniform float uZoneEps;',
    'uniform mat4 uZoneCameraMatrix;',
    'varying vec3 vZoneWorld;',
    'bool zoneHas( vec3 pointWorld, int index, float pad ) {',
    '  vec3 lo = uZoneMin[ index ] - pad;',
    '  vec3 hi = uZoneMax[ index ] + pad;',
    '  return all( greaterThanEqual( pointWorld, lo ) ) && all( lessThanEqual( pointWorld, hi ) );',
    '}',
    // `normalView` e a normal de sombreamento do proprio fragmento, em
    // espaco de VIEW, ja com a inversao que o three faz na face de tras de
    // material DoubleSide - ou seja, ela aponta sempre para o lado de onde
    // a superficie esta sendo VISTA. E o que decide a que comodo o pixel
    // pertence: a face que olha para o corredor e do corredor, a mesma
    // parede vista do quarto e do quarto.
    'float zoneLightMask( vec3 lightViewPos, vec3 normalView ) {',
    '  if ( uZoneCount == 0 ) return 1.0;',
    '  vec3 lightWorld = ( uZoneCameraMatrix * vec4( lightViewPos, 1.0 ) ).xyz;',
    // A mesma matriz que leva a luz de view para o mundo leva a normal:
    // com w = 0.0 ela entra como DIRECAO, sem a translacao da camera. A
    // camera nao tem escala, entao normalizar basta.
    '  vec3 normalWorld = ( uZoneCameraMatrix * vec4( normalView, 0.0 ) ).xyz;',
    '  float normalLen = length( normalWorld );',
    '  vec3 facing = normalLen > 0.0001 ? normalWorld / normalLen : vec3( 0.0 );',
    '  vec3 pointWorld = vZoneWorld + facing * uZonePad;',
    '  for ( int i = 0; i < ' + MAX_ZONES + '; i++ ) {',
    '    if ( i >= uZoneCount ) break;',
    '    if ( zoneHas( lightWorld, i, 0.0 ) ) {',
    '      return zoneHas( pointWorld, i, uZoneEps ) ? 1.0 : 0.0;',
    '    }',
    '  }',
    '  return 1.0;',
    '}'
  ].join('\n');

  // A linha do three que calcula a contribuicao de UMA point light. O nome
  // dela mudou entre versoes: o jogo roda no r128 (ver index.html), que usa
  // a primeira - a segunda esta aqui para o dia de trocar de versao.
  const LIGHT_CALLS = [
    'getPointDirectLightIrradiance( pointLight, geometry, directLight );',
    'getPointLightInfo( pointLight, geometry, directLight );'
  ];

  // `geometry.normal` e montada pelo proprio bloco do three algumas linhas
  // acima desta chamada (geometry.normal = normal), entao ela ja existe aqui
  // e ja passou pelo normal map e pela inversao de face dupla.
  const MASK_LINE =
    'directLight.color *= zoneLightMask( pointLight.position, geometry.normal );';

  let warned = false;

  function warnOnce(message) {
    if (warned) {
      return;
    }
    warned = true;
    console.warn('LightZones: ' + message + ' - materiais deixados como estavam.');
  }

  // O bloco do three que soma as luzes, JA com a mascara dentro. Ele e
  // lido de THREE.ShaderChunk e nao escrito aqui: assim a correcao anda
  // junto com a versao do three.js em uso.
  //
  // Detalhe que importa: onBeforeCompile recebe o shader com os
  // #include AINDA fechados (o three resolve os includes depois). Por isso
  // o gancho troca o proprio #include pelo bloco expandido e corrigido, em
  // vez de procurar a chamada da luz no texto que chegou - que nao esta la.
  let patchedLightsChunk = null;

  function lightsChunk() {
    if (patchedLightsChunk !== null) {
      return patchedLightsChunk;
    }
    const original =
      (THREE.ShaderChunk && THREE.ShaderChunk.lights_fragment_begin) || '';
    let out = original;
    let hooked = false;
    for (let i = 0; i < LIGHT_CALLS.length; i++) {
      const call = LIGHT_CALLS[i];
      if (out.indexOf(call) === -1) {
        continue;
      }
      out = out.split(call).join(call + '\n\t\t' + MASK_LINE);
      hooked = true;
    }
    patchedLightsChunk = hooked ? out : '';
    return patchedLightsChunk;
  }

  const LIGHTS_INCLUDE = '#include <lights_fragment_begin>';
  const PROJECT_INCLUDE = '#include <project_vertex>';

  function onBeforeCompile(shader) {
    const chunk = lightsChunk();

    if (
      !chunk ||
      shader.fragmentShader.indexOf(LIGHTS_INCLUDE) === -1 ||
      shader.vertexShader.indexOf(PROJECT_INCLUDE) === -1
    ) {
      // Material que nao soma point light no fragmento, ou uma versao do
      // three com outro desenho de shader: sai INTEIRO como estava. Uma luz
      // vazando e um defeito; a casa sem iluminacao nenhuma seria pior.
      warnOnce('shader sem o gancho esperado');
      return;
    }

    shader.vertexShader = shader.vertexShader
      .replace('void main() {', VERTEX_HEAD + '\nvoid main() {')
      .replace(PROJECT_INCLUDE, PROJECT_INCLUDE + '\n\t' + VERTEX_TAIL);

    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', FRAGMENT_HEAD + '\nvoid main() {')
      .replace(LIGHTS_INCLUDE, chunk);

    shader.uniforms.uZoneCount = uniforms.uZoneCount;
    shader.uniforms.uZoneMin = uniforms.uZoneMin;
    shader.uniforms.uZoneMax = uniforms.uZoneMax;
    shader.uniforms.uZonePad = uniforms.uZonePad;
    shader.uniforms.uZoneEps = uniforms.uZoneEps;
    shader.uniforms.uZoneCameraMatrix = uniforms.uZoneCameraMatrix;
  }

  // Materiais que respondem a luz. MeshBasicMaterial (bulbo, contorno, ceu,
  // chuva) nao entra: ele nao le luz nenhuma, entao nao tem o que mascarar.
  // MeshLambert fica de fora de proposito - no r128 ele resolve a luz no
  // VERTICE, e mascarar por vertice daria degrade em vez de corte na
  // parede. A casa nao usa Lambert (ver materials/material-library.js): quem
  // usa e a cutscene da estrada, que nao tem parede nem luminaria.
  function isLit(material) {
    return (
      !!material &&
      (material.isMeshStandardMaterial ||
        material.isMeshPhysicalMaterial ||
        material.isMeshPhongMaterial)
    );
  }

  function patch(material) {
    if (!isLit(material) || material.userData.zonedLight) {
      return;
    }
    material.userData.zonedLight = true;
    material.onBeforeCompile = onBeforeCompile;
    // Todos compartilham a MESMA funcao, entao o three continua
    // reaproveitando um programa por combinacao de material - o gancho nao
    // multiplica shader compilado.
    material.customProgramCacheKey = function () {
      return 'zonedLight';
    };
    material.needsUpdate = true;
  }

  // Varre uma subarvore e patcheia o que encontrar. Chamada mais de uma vez
  // de proposito (ver scripts/main.js): boa parte da mobilia vem de .glb e
  // entra na cena DEPOIS do boot, com material proprio. Material ja
  // patcheado e ignorado na hora pela marca em userData, entao repetir a
  // varredura nao custa nada.
  function applyTo(root) {
    if (!root || !root.traverse) {
      return;
    }
    root.traverse(function (node) {
      const material = node.material;
      if (!material) {
        return;
      }
      if (Array.isArray(material)) {
        material.forEach(patch);
        return;
      }
      patch(material);
    });
  }

  return {
    MAX_ZONES: MAX_ZONES,
    PAD: PAD,
    EPS: EPS,
    reset: reset,
    add: add,
    update: update,
    applyTo: applyTo,
    patch: patch,
    maskAt: maskAt,
    getCount: function () {
      return count;
    }
  };
})();
