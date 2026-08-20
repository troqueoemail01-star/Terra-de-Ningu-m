/**
 * models/paper-note-factory.js
 * -------------------------------------------------
 * Nota de papel 3D (Como identificar infectados) no visual PS1/PSX.
 *
 * O papel em si é 100% procedural: uma malha de plano subdividida,
 * amassada por ruído determinístico (mesma semente = mesmo amassado
 * em toda máquina, sempre), com vincos horizontais retos, uma dobra
 * vertical na metade de cima e a pontinha do canto superior direito
 * dobrada -- exatamente o que aparece na imagem de referência.
 *
 * A folha é feita de DUAS malhas, não de um plano DoubleSide:
 *   - frente: a arte da nota (textura com canal alfa; a borda rasgada
 *     é recortada pelo próprio alfa, via alphaTest, do jeito que os
 *     jogos de PS1 faziam -- sem transparência real, sem dor de
 *     cabeça com ordem de desenho);
 *   - verso: a mesma folha empurrada alguns décimos de milímetro para
 *     trás, com as normais e o sentido dos triângulos invertidos, e
 *     textura própria (papel envelhecido com o texto vazando fraco
 *     por trás).
 * Isso dá espessura de verdade ao papel e, principalmente, deixa a
 * iluminação correta nos dois lados -- num plano DoubleSide o verso
 * recebe luz errada, porque a normal continua apontando para frente.
 *
 * O visual PSX não vem de shader próprio: vem de um enxerto
 * (onBeforeCompile) por cima de um material padrão do three.js. Assim
 * a nota continua reagindo a luz, a névoa e a tudo mais da cena que
 * a receber, sem precisar de integração especial:
 *   1. tremor de vértice -- posição final arredondada para uma grade
 *      de baixa resolução (a falta de precisão sub-pixel do PS1);
 *   2. textura afim -- UV interpolada sem correção de perspectiva
 *      (o famoso texturao escorregando);
 *   3. dither + 5 bits -- Bayer 4x4 e cor reduzida na saída.
 * Os três são uniformes: dá para ligar e desligar em tempo real sem
 * recompilar shader nenhum (ver nota.setPsx()).
 *
 * Funciona do three.js r100 às versões atuais (o jogo usa r128). Não
 * importa nada: le o THREE global ou recebe um pelas opções.
 *
 * Convenção do resto do jogo (ver PosterFactory/PictureFactory): a
 * nota olha para +Z no espaço local e nasce centrada na origem; quem
 * posiciona decide onde ela entra na cena.
 *
 *   const nota = PaperNoteFactory.criar({ largura: 0.17 });
 *   scene.add(nota.grupo);
 * -------------------------------------------------
 */

(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.PaperNoteFactory = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Proporção real da folha da imagem de referência (958 x 1069 px).
  // A altura sai sempre da largura por aqui: assim não há como esticar
  // o papel sem querer e deformar o texto.
  var PROPORCAO = 1069 / 958;

  var PASTA_PADRAO = 'assets/pictures/';

  // Onde fica a dobra da pontinha, em coordenadas de textura
  // (0,0 = canto superior esquerdo). Medido direto na imagem.
  var DOBRA_A = [0.862, 0.0];
  var DOBRA_B = [1.0, 0.105];

  // ================================================================
  // Ruído de valor determinístico. Nada de Math.random: o amassado
  // precisa ser idêntico em todo aparelho e em toda sessão.
  // ================================================================
  function embaralhar(x, y, semente) {
    var n = Math.sin(x * 127.1 + y * 311.7 + semente * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  }

  function ruido(x, y, semente) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = embaralhar(xi, yi, semente);
    var b = embaralhar(xi + 1, yi, semente);
    var c = embaralhar(xi, yi + 1, semente);
    var d = embaralhar(xi + 1, yi + 1, semente);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }

  // |d| com o bico arredondado: é o que transforma uma reta num vinco
  // de papel de verdade (dois planos retos se encontrando) em vez de
  // uma ondulacao mole.
  function vinco(d, raio) {
    return Math.sqrt(d * d + raio * raio) - raio;
  }

  function degrau(a, b, x) {
    var t = (x - a) / (b - a);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3 - 2 * t);
  }

  // ================================================================
  // Relevo da folha, em unidades normalizadas (aprox. -1 .. 1).
  // u e v seguem a TEXTURA: u = 0 na esquerda, v = 0 no topo.
  // ================================================================
  function relevo(u, v, semente) {
    var z = 0;

    // Amassado geral: uma oitava larga e uma miúda.
    z += (ruido(u * 3.1, v * 3.4, semente) - 0.5) * 0.90;
    z += (ruido(u * 7.3, v * 8.1, semente + 11) - 0.5) * 0.34;

    // Vincos horizontais retos (as marcas de dobra da imagem).
    z += (vinco(v - 0.255, 0.045) - 0.11) * 1.30;
    z -= (vinco(v - 0.510, 0.028) - 0.13) * 2.10;
    z += (vinco(v - 0.730, 0.030) - 0.10) * 1.70;

    // Dobra vertical, só na metade de cima (some ao descer a folha).
    z -= (vinco(u - 0.583, 0.035) - 0.12) * 1.60 * (1 - degrau(0.30, 0.62, v));

    // Bordas e cantos levantando de leve, como papel velho faz.
    var bu = Math.abs(u * 2 - 1), bv = Math.abs(v * 2 - 1);
    z += bu * bu * bu * 0.55 + bv * bv * bv * bv * 0.40;

    // A pontinha dobrada do canto superior direito: tudo que estiver
    // do lado de fora da reta DOBRA_A -> DOBRA_B sobe de uma vez.
    var dx = DOBRA_B[0] - DOBRA_A[0], dy = DOBRA_B[1] - DOBRA_A[1];
    var comp = Math.sqrt(dx * dx + dy * dy);
    var lado = ((u - DOBRA_A[0]) * dy - (v - DOBRA_A[1]) * dx) / comp;
    z += degrau(0.0, 0.024, lado) * 0.95;

    return z;
  }

  // ================================================================
  // Geometria: grade subdividida + relevo.
  // ================================================================
  function criarGeometria(THREE, largura, altura, segX, segY, amassado, semente) {
    var geo = new THREE.BufferGeometry();
    var nx = segX + 1, ny = segY + 1;
    var total = nx * ny;
    var pos = new Float32Array(total * 3);
    var uvs = new Float32Array(total * 2);
    var zs = new Float32Array(total);
    var escalaZ = amassado * largura;
    var i, j, k = 0, soma = 0;

    for (j = 0; j < ny; j++) {
      for (i = 0; i < nx; i++, k++) {
        // v da textura conta de cima para baixo; a grade, de baixo
        // para cima. Daí o 1 - j/segY.
        zs[k] = relevo(i / segX, 1 - j / segY, semente);
        soma += zs[k];
      }
    }
    var media = soma / total; // centraliza: a folha nao flutua fora do eixo

    k = 0;
    for (j = 0; j < ny; j++) {
      for (i = 0; i < nx; i++, k++) {
        var u = i / segX, v = j / segY;
        pos[k * 3] = (u - 0.5) * largura;
        pos[k * 3 + 1] = (v - 0.5) * altura;
        pos[k * 3 + 2] = (zs[k] - media) * escalaZ;
        uvs[k * 2] = u;
        uvs[k * 2 + 1] = v;
      }
    }

    var indices = [];
    for (j = 0; j < segY; j++) {
      for (i = 0; i < segX; i++) {
        var a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        indices.push(a, b, d, a, d, c);
      }
    }

    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  // Verso: a mesma folha empurrada para trás pela espessura, com as
  // normais e o sentido dos triângulos invertidos (ver topo do arquivo).
  function criarVerso(THREE, geoFrente, espessura) {
    var geo = geoFrente.clone();
    var p = geo.attributes.position.array;
    var n = geo.attributes.normal.array;
    for (var i = 0; i < p.length; i += 3) {
      p[i] -= n[i] * espessura;
      p[i + 1] -= n[i + 1] * espessura;
      p[i + 2] -= n[i + 2] * espessura;
      n[i] = -n[i]; n[i + 1] = -n[i + 1]; n[i + 2] = -n[i + 2];
    }
    var idx = geo.index.array;
    for (var t = 0; t < idx.length; t += 3) {
      var tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.index.needsUpdate = true;
    geo.computeBoundingSphere();
    return geo;
  }

  // ================================================================
  // O enxerto PSX no material padrão do three.js
  // ================================================================
  var CABECA_VERTICE = [
    'uniform vec2 uPsxRes;',
    'uniform float uPsxTremor;',
    'varying vec2 vPsxUv;',
    'varying vec2 vPsxUvW;',
    'varying float vPsxW;'
  ].join('\n');

  // Roda logo depois de project_vertex, ou seja, com gl_Position já
  // calculado em espaço de recorte.
  var CORPO_VERTICE = [
    'if (gl_Position.w > 0.0) {',
    '  vec2 grade = uPsxRes * 0.5;',
    '  vec2 travado = floor(grade * gl_Position.xy / gl_Position.w + 0.5) / grade * gl_Position.w;',
    '  gl_Position.xy = mix(gl_Position.xy, travado, uPsxTremor);',
    '}',
    'vPsxUv = uv;',
    // Multiplicar por w antes de interpolar cancela a divisão por w que
    // a GPU faz sozinha: dividir de volta no fragmento devolve uma UV
    // interpolada em espaço de TELA, que é exatamente o mapeamento
    // afim (sem correção de perspectiva) do PlayStation 1.
    'vPsxUvW = uv * gl_Position.w;',
    'vPsxW = gl_Position.w;'
  ].join('\n');

  var CABECA_FRAGMENTO = [
    'uniform float uPsxAfim;',
    'uniform float uPsxDither;',
    'uniform float uPsxNiveis;',
    'varying vec2 vPsxUv;',
    'varying vec2 vPsxUvW;',
    'varying float vPsxW;',
    // Bayer 2x2 analitico; combinado consigo mesmo vira o 4x4 clássico.
    'float psxBayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }'
  ].join('\n');

  var CAUDA_FRAGMENTO = [
    'if (uPsxDither > 0.0) {',
    '  float limiar = psxBayer2(gl_FragCoord.xy * 0.5) * 0.25 + psxBayer2(gl_FragCoord.xy);',
    '  float n = max(uPsxNiveis - 1.0, 1.0);',
    '  vec3 cortada = floor(gl_FragColor.rgb * n + limiar) / n;',
    '  gl_FragColor.rgb = mix(gl_FragColor.rgb, cortada, uPsxDither);',
    '}'
  ].join('\n');

  function aplicarPsx(THREE, material, estado) {
    // Sem esta chave o three.js reaproveitaria o programa já compilado
    // de um material igual sem o enxerto, e o efeito sumiria.
    material.customProgramCacheKey = function () { return 'psx-paper-note'; };

    material.onBeforeCompile = function (shader) {
      shader.uniforms.uPsxRes = estado.res;
      shader.uniforms.uPsxTremor = estado.tremor;
      shader.uniforms.uPsxAfim = estado.afim;
      shader.uniforms.uPsxDither = estado.dither;
      shader.uniforms.uPsxNiveis = estado.niveis;

      shader.vertexShader = shader.vertexShader
        .replace('void main() {', CABECA_VERTICE + '\nvoid main() {')
        .replace('#include <project_vertex>', '#include <project_vertex>\n' + CORPO_VERTICE);

      // Em vez de reescrever o trecho da textura na mão (o nome da UV
      // mudou entre versões do three.js, e o tratamento de espaço de
      // cor também), pegamos o trecho oficial da versão em uso e só
      // trocamos a UV dele pela nossa. Funciona em r128 e nas atuais.
      var trechoMapa = THREE.ShaderChunk.map_fragment.replace(/vMapUv|vUv/g, 'psxUvFinal');

      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', CABECA_FRAGMENTO + '\nvoid main() {')
        .replace(
          '#include <map_fragment>',
          'vec2 psxUvFinal = mix(vPsxUv, vPsxUvW / vPsxW, uPsxAfim);\n' + trechoMapa
        )
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + CAUDA_FRAGMENTO);
    };
  }

  // ================================================================
  // Texturas
  // ================================================================
  function ajustarTextura(THREE, tex) {
    // Sem filtragem suave e sem mipmap: a receita do pixel cru do PS1,
    // a mesma já usada por PictureFactory/PosterFactory no jogo.
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    // Do r152 em diante o renderer entrega sRGB por padrão; sem avisar
    // que a textura já esta em sRGB o papel sairia lavado. Em versões
    // antigas (r128) não existe essa propriedade e nada muda.
    if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  var embutidasPedidas = false;

  // Injeta o pacote base64 sob demanda (script clássico: é o único
  // jeito que funciona também em file://, onde fetch e módulos ES são
  // bloqueados pelo navegador).
  function garantirEmbutidas(urlPacote, aoPronto) {
    if (typeof window === 'undefined') return aoPronto(null);
    if (window.PaperNoteTexturasEmbutidas) return aoPronto(window.PaperNoteTexturasEmbutidas);
    if (embutidasPedidas) return setTimeout(function () { garantirEmbutidas(urlPacote, aoPronto); }, 120);
    embutidasPedidas = true;
    var s = document.createElement('script');
    s.src = urlPacote;
    s.onload = function () { aoPronto(window.PaperNoteTexturasEmbutidas || null); };
    s.onerror = function () { aoPronto(null); };
    document.head.appendChild(s);
  }

  // Carrega o PNG normal e, se der errado (arquivo ausente, ou página
  // aberta em file://, onde o navegador se recusa a mandar uma imagem
  // de disco para a placa de vídeo), cai sozinho para o base64.
  function carregarTextura(THREE, pasta, arquivo, chave, urlPacote, aplicar) {
    var loader = new THREE.TextureLoader();
    var emArquivo = typeof location !== 'undefined' && location.protocol === 'file:';

    function porEmbutida() {
      garantirEmbutidas(urlPacote, function (dados) {
        if (!dados || !dados[chave]) return;
        aplicar(ajustarTextura(THREE, loader.load(dados[chave])));
      });
    }

    if (emArquivo) { porEmbutida(); return; }
    aplicar(ajustarTextura(THREE, loader.load(pasta + arquivo, undefined, undefined, porEmbutida)));
  }

  // ================================================================
  // Montagem
  // ================================================================
  function criar(opcoes) {
    opcoes = opcoes || {};
    var THREE = opcoes.THREE || (typeof window !== 'undefined' && window.THREE);
    if (!THREE) {
      throw new Error('PaperNoteFactory: three.js nao encontrado. Carregue o three.js antes deste arquivo ou passe { THREE: THREE } nas opcoes.');
    }

    var largura = opcoes.largura || 0.17;
    var altura = opcoes.altura || largura * PROPORCAO;
    var segX = (opcoes.segmentos && opcoes.segmentos.x) || 14;
    var segY = (opcoes.segmentos && opcoes.segmentos.y) || 16;
    var amassado = opcoes.amassado === undefined ? 1 : opcoes.amassado;
    var espessura = opcoes.espessura === undefined ? 0.00035 : opcoes.espessura;
    var semente = opcoes.semente === undefined ? 3 : opcoes.semente;
    var duasFaces = opcoes.duasFaces !== false;
    var psx = opcoes.psx || {};
    var baixa = opcoes.resolucao === 'psx';
    var pasta = opcoes.pasta === undefined ? PASTA_PADRAO : opcoes.pasta;
    var urlPacote = opcoes.pacoteEmbutido || (pasta + '../nota-textura-embutida.js');

    // Uniformes compartilhados pelos dois materiais: mexer aqui muda
    // frente e verso de uma vez só.
    var res = psx.resolucao || [320, 180];
    var estado = {
      res: { value: new THREE.Vector2(res[0], res[1]) },
      tremor: { value: psx.tremor === false ? 0 : 1 },
      afim: { value: psx.afim === false ? 0 : 1 },
      dither: { value: psx.dither === false ? 0 : 1 },
      niveis: { value: psx.niveis || 32 }
    };

    function novoMaterial() {
      // A cor comeca num bege de papel de proposito: enquanto a
      // textura não chega, a folha já aparece com a cor certa em vez
      // de um branco estourado. Vira branco puro ao aplicar o mapa.
      var base = { alphaTest: 0.5, side: THREE.FrontSide, transparent: false, color: 0xbcb096 };
      var m;
      if (opcoes.iluminacao === 'basic') m = new THREE.MeshBasicMaterial(base);
      else if (opcoes.iluminacao === 'phong') m = new THREE.MeshPhongMaterial(base);
      else if (opcoes.iluminacao === 'standard') {
        base.roughness = 0.95; base.metalness = 0;
        m = new THREE.MeshStandardMaterial(base);
      } else {
        // Padrão: Lambert. Além de barato, ele ilumina por Vértice --
        // que é literalmente o jeito que o PS1 sombreava.
        m = new THREE.MeshLambertMaterial(base);
      }
      aplicarPsx(THREE, m, estado);
      return m;
    }

    var grupo = new THREE.Group();
    grupo.name = 'nota-papel-psx';

    var geoFrente = criarGeometria(THREE, largura, altura, segX, segY, amassado * 0.035, semente);
    var matFrente = novoMaterial();
    var malhaFrente = new THREE.Mesh(geoFrente, matFrente);
    malhaFrente.name = 'nota-frente';
    grupo.add(malhaFrente);

    var geoVerso = null, matVerso = null, malhaVerso = null;
    if (duasFaces) {
      geoVerso = criarVerso(THREE, geoFrente, espessura);
      matVerso = novoMaterial();
      malhaVerso = new THREE.Mesh(geoVerso, matVerso);
      malhaVerso.name = 'nota-verso';
      grupo.add(malhaVerso);
    }

    var nota = {
      grupo: grupo,
      malhaFrente: malhaFrente,
      malhaVerso: malhaVerso,
      materialFrente: matFrente,
      materialVerso: matVerso,
      largura: largura,
      altura: altura,
      psx: estado
    };

    // Quem for reconstruir a nota varias vezes (um slider de amassado,
    // por exemplo) pode passar as texturas já carregadas em
    // opções.texturas e pular o carregamento inteiro.
    var prontas = opcoes.texturas || {};

    if (prontas.frente) {
      nota.texturaFrente = prontas.frente;
      matFrente.map = prontas.frente;
      matFrente.color.setHex(0xffffff);
      matFrente.needsUpdate = true;
    } else carregarTextura(THREE, pasta, baixa ? 'nota-infectados-256.png' : 'nota-infectados.png',
      baixa ? 'frente256' : 'frente', urlPacote, function (tex) {
        nota.texturaFrente = tex;
        matFrente.map = tex;
        matFrente.color.setHex(0xffffff);
        matFrente.needsUpdate = true;
        if (opcoes.aoCarregar) opcoes.aoCarregar(nota);
      });

    if (duasFaces && prontas.verso) {
      nota.texturaVerso = prontas.verso;
      matVerso.map = prontas.verso;
      matVerso.color.setHex(0xffffff);
      matVerso.needsUpdate = true;
    } else if (duasFaces) {
      carregarTextura(THREE, pasta, baixa ? 'nota-infectados-verso-256.png' : 'nota-infectados-verso.png',
        baixa ? 'verso256' : 'verso', urlPacote, function (tex) {
          nota.texturaVerso = tex;
          matVerso.map = tex;
          matVerso.color.setHex(0xffffff);
          matVerso.needsUpdate = true;
        });
    }

    // Liga/desliga cada ingrediente do visual PSX em tempo real.
    // Aceita booleano ou numero de 0 a 1 (da para animar a transição).
    nota.setPsx = function (o) {
      o = o || {};
      function num(v) { return typeof v === 'number' ? v : (v ? 1 : 0); }
      if (o.tremor !== undefined) estado.tremor.value = num(o.tremor);
      if (o.afim !== undefined) estado.afim.value = num(o.afim);
      if (o.dither !== undefined) estado.dither.value = num(o.dither);
      if (o.niveis !== undefined) estado.niveis.value = o.niveis;
      if (o.resolucao) estado.res.value.set(o.resolucao[0], o.resolucao[1]);
      return nota;
    };

    nota.dispose = function () {
      geoFrente.dispose();
      matFrente.dispose();
      if (nota.texturaFrente && !prontas.frente) nota.texturaFrente.dispose();
      if (geoVerso) geoVerso.dispose();
      if (matVerso) matVerso.dispose();
      if (nota.texturaVerso && !prontas.verso) nota.texturaVerso.dispose();
      if (grupo.parent) grupo.parent.remove(grupo);
    };

    grupo.userData.nota = nota;
    return nota;
  }

  return {
    criar: criar,
    create: criar,          // apelido em ingles, para quem preferir
    PROPORCAO: PROPORCAO,
    // Exposto de proposito: da para envelhecer QUALQUER material do
    // three.js com o mesmo enxerto PSX usado aqui.
    aplicarPsx: aplicarPsx
  };
});
