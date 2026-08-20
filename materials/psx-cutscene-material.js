/**
 * materials/psx-cutscene-material.js
 * -------------------------------------------------
 * As tres tecnicas de imagem PSX que os DOIS pacotes 3D da cutscene da
 * estrada trouxeram de fabrica (ver models/road-loop-factory.js e
 * models/car-interior-factory.js), reescritas aqui como um "tempero"
 * aplicado por cima dos materiais NORMAIS do three.js:
 *
 *   1. SNAP DE VERTICE - a posicao final de cada vertice e arredondada
 *      para a grade de pixels da tela (em clip space). E o tremor de
 *      geometria caracteristico do PS1, que nao tinha subpixel.
 *   2. MAPEAMENTO AFIM DE TEXTURA - a UV e interpolada em espaco de
 *      TELA, sem correcao de perspectiva. E o que torce a textura da
 *      estrada conforme o carro anda, marca registrada do console.
 *   3. SAIDA EM 15 BITS COM DITHER BAYER 4x4 - 32 niveis por canal, com
 *      ruido ordenado para disfarcar as faixas de cor.
 *
 * ---------- Por que isso NAO e um segundo sistema de material ----------
 * Os dois pacotes originais vinham cada um com um shader PROPRIO e
 * completo (RawShaderMaterial no pacote do carro; um modulo
 * js/psx-material.js com luz e nevoa proprias no da estrada) - ou seja,
 * dois motores de render em paralelo ao do jogo, cada um com a sua
 * conta de luz e de nevoa. Nenhum dos dois entrou, pelo mesmo motivo
 * que o js/psx-material.js do radio portatil tambem nao entrou (ver o
 * bloco no topo de models/portable-radio-factory.js).
 *
 * O que existe aqui e o material de sempre do three.js
 * (THREE.MeshLambertMaterial, com as luzes e a nevoa da propria cena)
 * com tres trechos INJETADOS nos shaders dele via `onBeforeCompile`. A
 * luz continua sendo a luz do three.js, a nevoa continua sendo
 * `scene.fog`, o material continua entendendo `map`, `alphaTest`,
 * `vertexColors` e tudo o mais. Se este arquivo for removido, os
 * modelos continuam aparecendo - so perdem o tremor, a torcao e o
 * dither.
 *
 * ---------- Onde isso e usado (e onde NAO e) ----------
 * SO na cutscene da estrada (cutscenes/road-cutscene.js), que roda numa
 * cena, numa camera e num renderer proprios, antes da gameplay existir.
 * A gameplay (o corredor e a casa) NAO passa por aqui: la o visual PSX
 * ja vem da resolucao interna de 320x180 e do upscale "quadriculado" do
 * CSS (ver interface/layout.css), e nada disso muda por causa deste
 * arquivo.
 *
 * window.PSXCutsceneMaterial.fromStandard(material)  -> MeshLambert + PSX
 * window.PSXCutsceneMaterial.create(parametros)      -> MeshLambert + PSX
 * window.PSXCutsceneMaterial.setResolution(w, h)     -> calibra o snap
 * -------------------------------------------------
 */

window.PSXCutsceneMaterial = (function () {
  // A grade de snap acompanha a resolucao INTERNA do render, nao a
  // tela: e por isso que o tremor tem sempre o mesmo tamanho em
  // qualquer aparelho. O fator 0.92 e o do pacote original da estrada -
  // um pouco menos que a resolucao cheia, para o tremor ser visivel sem
  // rasgar a geometria.
  const snapUniform = { value: new THREE.Vector2(320 * 0.92, 180 * 0.92) };

  function setResolution(width, height) {
    snapUniform.value.set(width * 0.92, height * 0.92);
  }

  // ---------- VOLUMES DE NEVOA: o tempero muda para eles ----------
  // Os tufos de neblina da estrada (Neblina_Puff, alphaMode BLEND - ver
  // models/road-loop-factory.js) sao a UNICA peca da cutscene que e um
  // cartao gigante e semitransparente. Por isso as tres tecnicas PSX se
  // voltavam contra eles:
  //
  //   1. MAPEAMENTO AFIM num quad de 10 m que atravessa 30 m de
  //      profundidade nao torce a textura de leve: ele parte o tufo nas
  //      duas diagonais dos triangulos e transforma a mancha redonda em
  //      cunhas de borda reta. Era dai que vinham os pedacos e as formas
  //      geometricas estranhas na estrada.
  //   2. SNAP DE VERTICE num quad com um vertice atras da camera (w <= 0,
  //      onde o snap e pulado) move um canto e nao o outro: a borda do
  //      tufo pisca de um quadro para o outro.
  //   3. E, perto da lente, o proprio PLANO DE CORTE da camera fatiava o
  //      cartao numa reta perfeita - a reta que atravessava a cabine.
  //
  // Entao, para eles: sem afim, sem snap, e o alpha morre por
  // PROFUNDIDADE antes de qualquer uma dessas coisas acontecer. O dither
  // continua - e ele que da a granulacao PSX da nevoa.
  const VOLUME_FADE_IN_START = 3.5;   // m: aqui o tufo e invisivel
  const VOLUME_FADE_IN_END = 13.0;    // m: aqui ele esta cheio
  const VOLUME_FADE_OUT_START = 38.0; // sai antes do fim da nevoa da cena
  const VOLUME_FADE_OUT_END = 54.0;   // (scene.fog fecha em 48)

  // Profundidade em METROS do fragmento ate a lente. Serve para
  // InstancedMesh tambem: <project_vertex> ja aplicou a instanceMatrix
  // em mvPosition antes desta linha.
  const VOLUME_VARYING = 'varying float vPsxViewDepth;\n';
  const VOLUME_VERTEX = '  vPsxViewDepth = -mvPosition.z;';

  const VOLUME_FRAGMENT = [
    '{',
    '  float psxIn = smoothstep( ' + VOLUME_FADE_IN_START.toFixed(1) + ', ' +
      VOLUME_FADE_IN_END.toFixed(1) + ', vPsxViewDepth );',
    '  float psxOut = 1.0 - smoothstep( ' + VOLUME_FADE_OUT_START.toFixed(1) + ', ' +
      VOLUME_FADE_OUT_END.toFixed(1) + ', vPsxViewDepth );',
    '  gl_FragColor.a *= psxIn * psxOut;',
    '}',
  ].join('\n');

  // Liga o tratamento de volume num material. Pode ser chamado DEPOIS
  // de create()/fromStandard(): a flag e lida na compilacao do shader,
  // que so acontece no primeiro quadro em que o material aparece.
  function markAsVolume(material) {
    if (!material) {
      return material;
    }
    material.userData = material.userData || {};
    material.userData.psxVolume = true;

    // A textura do tufo e uma mancha redonda com a borda inteira em
    // alpha 0 (a imagem `fog` do pacote da estrada), mas o sampler do
    // .glb vem em REPEAT. Num cartao desse tamanho isso e perigoso: se a
    // UV escapar de [0,1] por qualquer motivo, o wrapping devolve
    // COPIAS da mancha, de borda reta - os "PNG esquisitos" na pista.
    // ClampToEdge fecha essa porta de vez e nao muda nada dentro de
    // [0,1], que e onde a mancha vive.
    if (material.map) {
      material.map.wrapS = THREE.ClampToEdgeWrapping;
      material.map.wrapT = THREE.ClampToEdgeWrapping;
      material.map.needsUpdate = true;
    }
    return material;
  }

  function isVolume(material) {
    return !!(material.userData && material.userData.psxVolume);
  }

  // ---------- Os tres trechos de shader ----------

  // Roda logo depois de <project_vertex>, ou seja, com gl_Position ja
  // calculado: arredonda X/Y para a grade de pixels e devolve ao espaco
  // homogeneo multiplicando por w de novo.
  const SNAP_CHUNK = [
    "  if ( gl_Position.w > 0.0001 ) {",
    "    vec2 psxGrid = uPsxSnap * 0.5;",
    "    gl_Position.xy = floor( ( gl_Position.xy / gl_Position.w ) * psxGrid + 0.5 ) / psxGrid * gl_Position.w;",
    "  }",
  ].join("\n");

  // Guarda a UV multiplicada por w. Como o hardware divide os varyings
  // por w na interpolacao, isso CANCELA a correcao de perspectiva - o
  // efeito que se quer. A divisao de volta acontece no fragmento.
  const AFFINE_VERTEX = "  vPsxAffineUv = vec3( vUv, 1.0 ) * max( 0.0001, gl_Position.w );";

  // Substitui o <map_fragment> do three.js r128 inteiro (por isso ele
  // repete o mapTexelToLinear de la): mesma leitura de textura, so com
  // a UV afim em vez da UV interpolada com perspectiva.
  const AFFINE_FRAGMENT = [
    "#ifdef USE_MAP",
    "  vec4 texelColor = texture2D( map, vPsxAffineUv.xy / vPsxAffineUv.z );",
    "  texelColor = mapTexelToLinear( texelColor );",
    "  diffuseColor *= texelColor;",
    "#endif",
  ].join("\n");

  // Quantiza a cor final em 32 niveis por canal, com a matriz de Bayer
  // 4x4 calculada direto do numero do pixel (sem textura de ruido).
  const DITHER_CHUNK = [
    "#include <dithering_fragment>",
    "{",
    "  vec2 psxQ = mod( floor( gl_FragCoord.xy ), 4.0 );",
    "  vec2 psxLo = mod( psxQ, 2.0 );",
    "  vec2 psxHi = floor( psxQ * 0.5 );",
    "  float psxBayer = ( 4.0 * ( 2.0 * psxHi.x + 3.0 * psxHi.y - 4.0 * psxHi.x * psxHi.y )",
    "                        + ( 2.0 * psxLo.x + 3.0 * psxLo.y - 4.0 * psxLo.x * psxLo.y ) ) / 16.0;",
    "  gl_FragColor.rgb = floor( clamp( gl_FragColor.rgb + ( psxBayer - 0.5 ) / 31.0, 0.0, 1.0 ) * 31.0 + 0.5 ) / 31.0;",
    "}",
  ].join("\n");

  // Substituicao tolerante: se o three.js mudar de versao e algum
  // #include deixar de existir, o material continua valendo - so sem
  // aquele efeito. Nunca deixa a cutscene quebrar por causa disso.
  function replaceOnce(source, needle, replacement) {
    if (source.indexOf(needle) === -1) {
      return null;
    }
    return source.replace(needle, replacement);
  }

  function psxify(material) {
    material.onBeforeCompile = function (shader) {
      // Os tufos de nevoa levam o tempero REDUZIDO: so o dither. Snap e
      // mapeamento afim ficam de fora, e no lugar deles entra a morte do
      // alpha por profundidade (ver o bloco VOLUMES DE NEVOA no topo).
      const volume = isVolume(material);
      const snap = !volume;

      // Mapeamento afim so faz sentido em quem tem textura; sem `map`,
      // o three.js nem declara a varying vUv.
      const affine = !!material.map && !volume;

      let vertex = "";
      if (snap) {
        shader.uniforms.uPsxSnap = snapUniform;
        vertex += "uniform vec2 uPsxSnap;\n";
      }
      if (affine) {
        vertex += "varying vec3 vPsxAffineUv;\n";
      }
      if (volume) {
        vertex += VOLUME_VARYING;
      }
      vertex += shader.vertexShader;

      let afterProject = "#include <project_vertex>";
      if (snap) {
        afterProject += "\n" + SNAP_CHUNK;
      }
      if (affine) {
        afterProject += "\n" + AFFINE_VERTEX;
      }
      if (volume) {
        afterProject += "\n" + VOLUME_VERTEX;
      }

      const patchedVertex = replaceOnce(
        vertex,
        "#include <project_vertex>",
        afterProject
      );
      if (patchedVertex) {
        shader.vertexShader = patchedVertex;
      }

      let fragment = affine ? "varying vec3 vPsxAffineUv;\n" : "";
      if (volume) {
        fragment += VOLUME_VARYING;
      }
      fragment += shader.fragmentShader;

      if (affine) {
        const patchedMap = replaceOnce(fragment, "#include <map_fragment>", AFFINE_FRAGMENT);
        if (patchedMap) {
          fragment = patchedMap;
        }
      }
      // O corte de alpha entra no MESMO ponto do dither (fim do
      // fragmento, com gl_FragColor ja pronto), logo antes dele.
      const tail = volume ? VOLUME_FRAGMENT + "\n" + DITHER_CHUNK : DITHER_CHUNK;
      const patchedDither = replaceOnce(fragment, "#include <dithering_fragment>", tail);
      if (patchedDither) {
        fragment = patchedDither;
      }

      shader.fragmentShader = fragment;
    };

    // Sem isto, o three.js reaproveitaria o programa compilado de um
    // material Lambert comum (mesma "receita" de defines) e os trechos
    // acima nunca chegariam a GPU.
    material.customProgramCacheKey = function () {
      // O volume compila um shader DIFERENTE (sem snap, sem afim, com o
      // corte por profundidade), entao precisa da propria chave - senao o
      // three.js entrega a ele o programa do material solido.
      return (
        "psx-cutscene-" +
        (isVolume(material) ? "volume" : "solid") +
        "-" +
        (material.map ? "map" : "flat")
      );
    };

    return material;
  }

  // Materiais recem-criados (o carro, que e geometria procedural).
  function create(parameters) {
    return psxify(new THREE.MeshLambertMaterial(parameters));
  }

  // Materiais que chegaram de um .glb pelo GLTFLoader (a estrada e as
  // arvores): o loader entrega MeshStandardMaterial, e aqui ele vira o
  // MeshLambert equivalente - mais barato no celular e sem o brilho
  // especular PBR, que nao existia no PS1. Tudo o que importa e
  // copiado: textura, recorte de alpha, transparencia, lado e cor de
  // vertice.
  function fromStandard(source) {
    const material = new THREE.MeshLambertMaterial({
      color: source.color ? source.color.clone() : new THREE.Color(0xffffff),
      map: source.map || null,
      side: source.side,
      vertexColors: !!source.vertexColors,
      fog: true,
      transparent: !!source.transparent,
      opacity: source.opacity === undefined ? 1 : source.opacity,
    });

    // Folhagem, grama e samambaias vem com recorte binario (alphaMode
    // MASK no glTF): escrevem profundidade normalmente, sem nenhuma
    // ordenacao de transparencia - e de quebra e o recorte serrilhado
    // certo para a estetica PSX. Mesma escolha da floresta das janelas
    // (ver models/tree-forest-factory.js).
    if (source.alphaTest) {
      material.alphaTest = source.alphaTest;
      material.transparent = false;
      material.depthWrite = true;
    } else if (material.transparent) {
      // Os tufos de nevoa (alphaMode BLEND) sao o caso oposto: precisam
      // se somar uns aos outros, entao nao escrevem profundidade.
      material.depthWrite = false;
      // E sao eles, e so eles, o VOLUME: nos dois .glb da cutscene o
      // unico material BLEND e a `neblina` - o resto e opaco ou MASK.
      // models/road-loop-factory.js ainda marca o tufo pelo nome do no,
      // por garantia; marcar duas vezes nao faz diferenca nenhuma.
      markAsVolume(material);
    }

    material.name = source.name || "";
    return psxify(material);
  }

  return {
    create: create,
    fromStandard: fromStandard,
    psxify: psxify,
    markAsVolume: markAsVolume,
    setResolution: setResolution,
  };
})();
