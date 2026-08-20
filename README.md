# Jogo de Terror — Base PSX/PS1 (protótipo)

Base inicial de um jogo de terror mobile em primeira pessoa, com estética
3D retrô inspirada no PS1, feita em Three.js puro (sem framework/engine
externo — mais fácil de expandir e sem dependências de build).

## Como rodar

Basta abrir `index.html` num navegador (o Three.js é carregado de um CDN,
então é necessário estar conectado à internet). Para testar os controles
de toque, use o modo de emulação de dispositivo móvel do navegador (ou
abra direto num celular).

> Dica: se o navegador bloquear o carregamento de scripts locais ao abrir
> o arquivo diretamente (`file://`), sirva a pasta com um servidor local
> simples, por exemplo `python3 -m http.server` dentro da pasta do
> projeto, e acesse `http://localhost:8000`.

## Estrutura de pastas

```
index.html            -> monta o container 16:9 e carrega tudo na ordem certa
menu/                   -> menu principal (primeira tela do jogo): vídeo de
                              fundo em loop e botões tocáveis, e a tela de
                              Configurações (Áudio, Sensibilidade, Idioma),
                              aberta a partir do botão CONFIGURAÇÕES
scripts/               -> lógica de jogo (movimento, colisão, interação, loop
                              principal) e o estado global de Configurações
                              (scripts/game-settings.js)
scenes/                 -> dados e construção dos cenários (o corredor e o
                              novo quarto "MEU QUARTO")
models/                 -> "fábricas" dos objetos 3D (portas, placas, luminária, quadros, janelas, vista externa/grama + gramado alto que cobre o terreno + floresta de pinheiros + neblina volumétrica do exterior, escrivaninha, vaso de rosas, telefone, relógio de parede, pilha de livros, vasos de planta do corredor, fogão, botijão de gás, geladeira, mesa de frutas, pia com armário, prateleira, microondas, filtro de barro, garrafa com copo e rádio portátil da cozinha, e pia de coluna, privada, espelheira, toalha, box de chuveiro e cesto de roupa do banheiro, canteiros de flores do quintal da frente a pichacao da fachada, e a planta, a cadeira de plastico, a churrasqueira e o varal da varanda da entrada, e o carro estacionado no gramado dos fundos)
materials/               -> texturas procedurais e materiais do Three.js
effects/                 -> efeitos de imagem e de ar: o Motion Blur sutil de
                              câmera (pós-processamento sobre o render final) e a
                              poeira suspensa no ar dos cômodos internos
                              (effects/dust-motes.js, partículas dentro do
                              próprio mundo 3D)
interface/               -> HUD (analógico, botão Interagir, inventário com itens
                              de verdade), a casca única de pop-up do jogo, o
                              pop-up da gaveta, o pop-up de leitura da carta e o
                              CSS de layout
cutscenes/                -> cutscene de abertura na estrada (em engine: carro +
                              estrada de terra em looping + ligação de rádio do
                              Ravi, ver cutscenes/road-cutscene.js - ela
                              SUBSTITUIU os dois vídeos de introdução, que foram
                              removidos), a mini cutscene de
                              entrada (câmera "acordando" em engine), a mini
                              cutscene do telefone (fade in/out + diálogo da
                              ligação com Ravi) e a transição genérica de
                              cenário usada ao entrar no quarto (fade in ->
                              troca -> fade out)
dialogue/                 -> sistema de caixa de diálogo (digitação, avanço manual),
                              reutilizável por qualquer cutscene futura
objectives/               -> objetivos/estados de progresso da história: decide quais
                              interativos funcionam normalmente e quais respondem com
                              diálogo em cada etapa (ver scripts/main.js)
assets/pictures/          -> imagens usadas nos quadros decorativos do corredor
assets/videos/            -> vídeos de cutscene e do fundo do menu (ver README
                              dentro da pasta)
assets/menu/              -> imagens dos botões do menu principal
assets/fonts/             -> fonte usada nos diálogos (BoldsPixels.ttf)
audio/                    -> som de passos do player (madeira/tapete), os sons
                              da ligação telefônica inicial (discagem, toque,
                              atender e desligar) e o som das cortinas das
                              janelas (ver audio/README.md) — o resto
                              (portas, ambiente, sussurros etc.) ainda não
                              existe
```

## A CASA: corredor e quarto no mesmo mundo 3D

Antes desta atualizacao, `CORREDOR` e `MEU QUARTO` se REVEZAVAM na cena:
entrar no quarto tirava o corredor de `scene` e colocava o quarto no lugar,
com um fade escondendo a troca. Os dois viviam na origem, um em cima do
outro, e so um existia por vez -- por isso, estando no corredor, o quarto
simplesmente nao existia visualmente.

Agora existe **uma casa so**. Os dois ambientes continuam sendo construidos
pelos mesmos arquivos de sempre (`scenes/corridor-scene.js` e
`scenes/room-scene.js`), com os objetos, colisoes, interacoes e logica de
cada um, mas ficam **os dois carregados e renderizados ao mesmo tempo**,
cada um no seu lugar do mundo:

```
worldRoot (MUNDO DA CASA)
  |-- ZONA_CORREDOR    z de -22 a 0    (objetos, portas, janelas, ...)
  |-- ZONA_MEU_QUARTO  z de 0 a +6     (cama, abajur, guarda-roupa, TV, ...)
  +-- EXTERIOR         dentro de cada zona, do lado de fora das paredes
                       (chao, grama, arvores, nevoa, ceu)

       x=-3                      x=+3
 z=+6   +--------------------------+   parede de fundo do quarto
        |        MEU QUARTO        |
 z= 0   +=========[ PORTA ]========+   parede COMPARTILHADA
        |         CORREDOR         |
 z=-22  +--------------------------+   ENTRADA & SAIDA
```

- **Nada de trocar de cena.** Do corredor, olhar na direcao da porta mostra
  o interior do quarto de verdade (chao, paredes, cama, abajur, guarda-roupa,
  TV, cabeceira); de dentro do quarto, a mesma porta mostra o corredor.
- **Uma porta so.** A porta `MEU QUARTO` deixou de ser uma peca parada
  encostada num plano de parede e virou a divisoria fisica entre os dois
  comodos: a parede de extremidade do corredor e a parede de entrada do
  quarto ganharam um **vao de porta recortado de verdade**
  (`buildWallGeometryWithOpenings` em `models/exterior-factory.js`), a folha
  gira de verdade (`options.hinged` em `models/door-factory.js`) e a antiga
  porta duplicada do lado do quarto deixou de existir. Os dois planos de
  parede ficam nas duas faces da moldura (`FRAME_DEPTH`), entao o vao fica
  forrado por ela dos dois lados: sem fresta, sem borda crua e sem duas
  paredes coplanares brigando por profundidade. Por padrao ela ja nasce
  ABERTA (`sharedDoor.openAtStart` em `scenes/corridor-config.js`) -- e o que
  faz o quarto aparecer do corredor desde o primeiro quadro.
- **Separacao logica intacta.** Continuam existindo duas cenas, duas listas
  de interativos, duas de colisao e dois `update`. O que junta as duas num
  mundo unico e `scripts/house-world.js` (soma as listas, roda o `update` de
  todas as zonas por quadro e sabe dizer em que comodo o jogador esta); onde
  cada zona fica e dado puro em `scenes/house-config.js`.
- **Coordenadas.** O quarto continua escrito nas coordenadas dele mesmo
  (parede de entrada em z = 0, interior crescendo para -Z). Ele recebe um
  `placement` (girado 180 graus) e converte na BORDA o que sai para o resto
  do jogo: colisao, superficie do piso, ponto de dormir da cama e a posicao
  do jogador que entra em `update`. Nenhum numero de mobilia foi reescrito, e
  180 graus em Y e uma rotacao (nao um espelho): o quarto e exatamente o
  mesmo por dentro.
- **Chao, paredes e colisao.** Quarto e corredor tem a mesma largura (6) e o
  mesmo pe-direito (4.2), e o piso do quarto passa por baixo da divisoria e
  encosta no piso do corredor: sem degrau, buraco ou piso sobreposto. A
  colisao acompanhou: a parede compartilhada virou dois solidos (um de cada
  lado do vao) nas duas cenas, e a caixa da porta muda com o estado da folha
  -- fechada bloqueia a passagem, aberta bloqueia apenas a propria folha,
  girando libera o vao (e nunca prende o jogador dentro de si).
- **Floresta fora da casa.** Nada mudou na grama, nas arvores, na neblina ou
  no caminho de terra: todas as camadas continuam ancoradas na parede com o
  +Z local apontando para FORA, com a garantia matematica de sempre de que
  nenhuma instancia atravessa parede. As fachadas de cada janela ja
  contavam com a casa continuando do outro lado (ver `facade`), e e
  exatamente essa a planta agora. O ceu virou um so para a casa inteira
  (`sharedSky`), em vez de um por cenario.
- **Historia preservada.** A porta continua liberada pela etapa
  `interagir-porta-meu-quarto`; a cama so aceita dormir a partir dessa mesma
  etapa (antes isso vinha de graca, porque o quarto nem existia na cena); a
  virada da noite fecha a porta com a tela preta, entao a regra de abrir a
  janela antes de sair do quarto continua valendo exatamente como antes.
  `cutscenes/room-transition.js` deixou de ser usado pelo quarto (segue
  disponivel para transicoes futuras).
- **Espaco para crescer.** O conjunto ocupa apenas a faixa x de -3 a +3, com
  terreno livre dos dois lados (a floresta guarda 6 m de gramado aberto ao
  longo de toda a fachada). Um comodo novo no futuro e uma cena nova + uma
  entrada em `zones` e outra em `connections` de `scenes/house-config.js`.
## A EXPANSAO DA CASA: os quatro comodos novos

Ate esta atualizacao a casa tinha dois ambientes (`CORREDOR` e
`MEU QUARTO`) e as quatro portas laterais do corredor eram pecas
paradas encostadas num plano cheio de parede. Agora a casa tem **seis
ambientes**, todos no mesmo mundo 3D, e cada uma daquelas portas virou
uma **passagem de verdade**:

```
            x=-7.8   x=-3        x=+3   x=+7.8
  z=-3.15   +-----------+                          <- QUARTO 01
            | QUARTO 01 |[ porta QUARTO - 01 ]
  z=-10.85  +-----------+   |            |
  z=-11.15  +-----------+   |  CORREDOR  |         <- QUARTO 02
            | QUARTO 02 |[ porta QUARTO - 02 ]
  z=-18.85  +-----------+   |            |

  z=-3.75                   |  CORREDOR  |  +-----------+
                                [ porta COZINHA ]  |  COZINHA  |
  z=-11.45                                     +-----------+
  z=-11.75                                     +-----------+
                               [ porta BANHEIRO ]  | BANHEIRO  |
  z=-19.45                                     +-----------+
```

- **Construidos EM TORNO das portas que ja existiam.** Nenhuma posicao
  de porta mudou (`doors` em `scenes/corridor-config.js` esta igual).
  Cada comodo recebe o `doorId` da porta a que se liga e deriva dali a
  propria posicao (ver `resolve` em `scenes/side-room-scene.js`), entao
  porta, vao recortado, parede e colisao nao tem como discordar.
- **Mesmo tratamento da porta `MEU QUARTO`, mesmo codigo.** As quatro
  portas entraram na lista `passages` (`scenes/corridor-config.js`) e o
  bloco "Portas" do corredor deixou de tratar "a porta do quarto" como
  caso especial: a parede lateral ganha um vao recortado de verdade
  (`buildWallGeometryWithOpenings`), a folha gira (`options.hinged`) e a
  colisao acompanha o estado dela (fechada bloqueia o vao, aberta
  bloqueia so a folha, girando libera). As quatro nascem ABERTAS
  (`openAtStart: true`), entao a passagem esta pronta desde o primeiro
  quadro sem tocar em nada da historia.
- **Um construtor para os quatro** (`scenes/side-room-scene.js`): piso,
  paredes, teto, o vao da porta e a colisao. Sem luz nova, sem
  interativos e sem mecanicas novas - so a caixa arquitetonica pedida
  (o fogao, o botijao de gas, a geladeira, a mesa de frutas, a pia com
  armario, a prateleira e o microondas decorativos da COZINHA vieram
  depois, ver as secoes O FOGAO DA COZINHA, O BOTIJAO DE GAS DA COZINHA,
  A GELADEIRA DA COZINHA, A PIA COM ARMARIO DA COZINHA e O MICROONDAS DA
  COZINHA abaixo). Os dados de cada comodo sao puros e moram em
  `HouseConfig.sideRooms`.
- **Sao zonas como qualquer outra** (`scripts/house-world.js`): colisao,
  interacao, som de passos, "em que comodo o jogador esta" e o horario
  noite/dia passam a valer neles sem nenhum caso especial. Um quinto
  comodo no futuro e uma entrada em `sideRooms`, e mais nada.
- **Texturas reaproveitadas, nenhuma nova.** Piso e teto usam a MESMA
  receita de madeira do corredor e as paredes a MESMA do `MEU QUARTO`
  (`materials/material-library.js`), so com o `repeat` recalculado para
  o tamanho destes comodos - a tabua tem exatamente a mesma medida em
  unidades de mundo nos dois lados da porta, entao o piso atravessa a
  passagem sem mudar de escala. Pe-direito, espessura de parede e altura
  de piso sao os mesmos do corredor: a casa le como uma construcao
  unica.
- **Vegetacao fora da construcao.** As tres camadas da vista externa
  (`grass-field-factory`, `tree-forest-factory`, `fog-volume-factory`)
  passaram a aceitar `options.exclusions`, os retangulos da casa nova.
  Mesma filosofia do caminho de terra: nenhum tufo e nenhuma arvore e
  SORTEADA dentro deles (nao existe remocao depois nem teste por
  quadro), e a neblina zera a opacidade ali dentro no proprio
  fragmento - sem isso as fatias de nevoa atravessariam a COZINHA e o
  BANHEIRO por dentro. Nada mais da floresta, do gramado ou da nevoa
  mudou.
- **Detalhes de acabamento:** os comodos de cada lado ficam 0.30
  afastados um do outro (a espessura de parede do jogo) para as duas
  paredes vizinhas nao ficarem coplanares brigando por profundidade; os
  da direita ficam 0.6 mais para dentro do corredor para nao nascerem
  colados na `janela-meu-quarto`; e o piso deles nasce 2 cm acima do
  zero, porque o "remendo" de chao externo daquela fachada passa por
  baixo em y = 0.
- **O que NAO mudou:** controles, HUD, sistema de interacao, cutscenes,
  dialogos, objetivos, iluminacao e a estetica PSX. As quatro portas
  continuam sem acao propria no botao "Interagir" e continuam
  respondendo pelas mesmas etapas de `objectives/objective-config.js` -
  inclusive a fala "porta-sem-nada", que agora vale a pena reescrever
  numa proxima passada, ja que existe comodo do outro lado.

## CORRECOES: os bugs da expansao da casa

Tres bugs que apareceram com os quatro comodos novos, mais um do tapete do
quarto. Nenhum comodo, movel, textura, mecanica ou numero de planta mudou:
sao quatro ajustes cirurgicos, cada um no arquivo que causava o problema.

- **Portas embutidas na parede (COZINHA e BANHEIRO)**
  (`scenes/side-room-scene.js`). A parede de entrada de cada comodo e um
  plano girado 180 graus em Y (ela precisa encarar o interior, que cresce
  para -Z), e 180 graus em Y **inverte o X**: o vao recortado em `doorX`
  terminava desenhado em `-doorX`, espelhado para o outro lado do centro da
  parede. Nos dois comodos da ESQUERDA a porta cai no centro exato
  (`doorX = 0`), entao o espelho nao mudava nada e ninguem percebia; nos da
  DIREITA a porta fica 0.6 fora do centro (eles sao deslocados 0.6 para nao
  nascerem colados na `janela-meu-quarto`), e 0.6 espelhado da **1.2 metro
  de erro**: o vao aparecia ao lado da porta e a parede do comodo tapava a
  passagem por dentro - a porta lia como se estivesse dentro da parede. A
  colisao sempre usou o valor certo, por isso dava para atravessar a parede
  fechada. O recorte agora e pedido em `-doorX`, entao **depois** do giro
  ele cai exatamente sobre a porta: geometria, folha, moldura e colisao
  voltam a concordar.

- **Grama e arvores dentro de QUARTO 01 e QUARTO 02**
  (`scenes/room-scene.js`). A vista externa da janela do `MEU QUARTO` e
  ancorada na parede direita dele que, com o giro de 180 graus da zona, e a
  fachada **esquerda** da casa no mundo: exatamente o lado onde os dois
  quartos novos foram construidos. As duas janelas do corredor ja recebiam
  os retangulos da construcao nova (`SideRoomScene.footprints`); esta,
  nao - entao o gramado e a floresta dela continuavam sorteando tufos e
  troncos por dentro dos dois comodos. Agora ela recebe os mesmos
  retangulos, com a mesma filosofia de sempre: nada e removido depois nem
  testado por quadro, as instancias dentro dos comodos **nunca chegam a ser
  sorteadas**.

- **Nevoa invadindo os comodos** (`scenes/room-scene.js`). Mesma causa e
  mesma correcao do item acima: as cinco fatias horizontais de nevoa daquela
  janela comecam a 30 cm da fachada, vao a 34 metros, ficam todas abaixo do
  pe-direito e nao escrevem profundidade - sem os retangulos elas
  atravessavam QUARTO 01 e QUARTO 02 por dentro, e a bruma aparecia dentro
  de um comodo fechado. Com `exclusions`, a opacidade vai a zero ali dentro
  no proprio fragmento (custo: uma conta de retangulo por fragmento, zero
  draw call novo).

- **Tapete do MEU QUARTO se sobrepondo ao cenario**
  (`materials/material-library.js`). O `polygonOffset` dele era -4 / -4:
  menos agressivo que o -120 antigo, mas ainda 4x o deslocamento de
  "decal", e a mesma armadilha ja documentada no tapete do corredor. O
  termo do `factor` **nao e constante** - ele cresce com a inclinacao do
  poligono na tela, e o tapete e um plano deitado visto de angulo raso num
  render de 320x180, onde cada pixel cobre muita profundidade. O resultado
  era o tapete vencendo o teste de profundidade contra geometria que esta
  genuinamente na frente dele (o batente da porta e o rodape ao redor).
  Agora usa -1 / -2, os valores classicos de decal, os mesmos do runner do
  corredor. Quem separa tapete e piso continua sendo a folga real de 2 cm em
  Y mais o `renderOrder`, nao o `polygonOffset` - e a bola de futebol segue
  resolvida, porque um deslocamento menor interfere ainda menos em objetos
  proximos da camera.

- **Divisoria da porta com uma espessura so** (`models/door-factory.js`,
  `scenes/corridor-scene.js`, `scenes/side-room-scene.js`,
  `scripts/main.js`). Reforco do primeiro item, na mesma familia de bug:
  o corredor centrava a moldura numa divisoria de `FRAME_DEPTH + 0.04`
  (2 cm de folga de cada lado da madeira), mas o comodo do outro lado
  recuava a parede dele apenas `FRAME_DEPTH` - ou seja, o plano da parede
  do comodo caia 2 cm **dentro** da moldura e a cortava por dentro. Agora
  o numero e um so, exportado como `DoorFactory.PARTITION_DEPTH` (e dado
  de modelo: e a moldura que da a espessura da divisoria) e lido pelos
  tres lugares que precisam concordar. Vale para as cinco passagens,
  MEU QUARTO incluso.

## O FOGAO DA COZINHA

Primeiro movel a entrar em um dos quatro comodos novos. Peca puramente
decorativa, no mesmo sistema de importacao de `.glb` que os moveis do
`MEU QUARTO` ja usavam: nenhum carregador novo, nenhum shader novo,
nenhum sistema paralelo de 3D.

- **Onde ele esta.** Encostado no canto do FUNDO A ESQUERDA da COZINHA
  (no mundo, por volta de `x = 7.49`, `z = -11.15`), com 2 cm de folga
  para as duas paredes e a frente olhando para dentro do comodo: o canto
  mais longe da porta, entao o movel nunca disputa espaco com a
  passagem. Medidas finais 0.56 x 0.59 x 0.92 (largura, profundidade e
  altura): um fogao de quatro bocas em escala 1:1 como o resto da
  mobilia (`MODEL_SCALE = 1`, igual a cama e ao criado-mudo).
- **Dado puro, como todo o resto da planta.** A posicao vem de `stoves`
  na entrada da COZINHA em `HouseConfig.sideRooms`
  (`scenes/house-config.js`), com dois campos: `corner` (os dois cantos
  da parede de fundo) e `rotationY`. Quem monta e o mesmo construtor dos
  quatro comodos (`scenes/side-room-scene.js`), e so monta o fogao se o
  comodo declarar esse dado: os outros tres continuam vazios, sem nenhum
  caso especial.
- **Decorativo, mas solido.** Nao entra em `interactables`: sem contorno
  de destaque, sem prompt de Interagir, sem dialogo, sem animacao, sem
  som. Entra em `solids`, so para o jogador nao atravessar o fogao
  andando: a mesma separacao que o criado-mudo, a estante e a lata de
  lixo do quarto ja usavam. A caixa de colisao sai do contorno JA girado
  (a mesma trigonometria da caixa de papelao do quarto), entao continua
  exata para qualquer `rotationY`.
- **Fica 2 cm acima do zero, de proposito.** O piso destes quatro
  comodos nasce em `FLOOR_LIFT` (ver `scenes/side-room-scene.js`), e nao
  no zero como o do corredor/quarto: o fogao e posicionado nessa mesma
  altura, senao afundaria esses 2 cm no chao.
- **Da para mexer sem tocar em codigo.** O grupo tem nome estavel
  (`StovePSX`), entao o Editor identifica, move, gira e escala a peca, e
  o que for salvo vale por cima dos numeros do arquivo (ver
  `editor/README.md`). No painel da hierarquia ele aparece como Fogao.
- **Textura.** O `.glb` ja chegou com a textura em versao PSX (256x256,
  15-bit, CLUT de 256 cores com dither ordenado), mesmo tratamento
  previo dos outros modelos importados. Em tempo de execucao roda so o
  `normalizeTextures` de sempre (nearest, sem mipmap, encoding linear) e
  o material continua sendo `MeshStandardMaterial`, iluminado pelas luzes
  da casa como todo o resto do cenario.
- **A unica novidade tecnica: Draco.** A geometria deste modelo chegou
  comprimida em Draco (`KHR_draco_mesh_compression`, extensao marcada
  como obrigatoria dentro do arquivo: 33.165 vertices e 50.000
  triangulos em 231 KB), o primeiro caso no jogo. Para o `GLTFLoader`
  descomprimir isso, ele recebe um `DRACOLoader` acoplado: o script dele
  entra em `index.html` logo depois do GLTFLoader, do MESMO CDN e da
  MESMA versao do three.js (r128) que o jogo ja usa, e o decodificador
  em si so e baixado quando esse `.glb` carrega. Continua sendo o mesmo
  loader, o mesmo `.glb` em `assets/models` e o mesmo caminho de codigo
  dos outros modelos. O jogo ja dependia de internet para o proprio
  three.js, entao nada mudou no que ele exige para rodar; e se o
  decodificador nao chegar, a fabrica tenta uma segunda fonte, registra
  a falha no console e o boot segue igual, so sem o fogao. Para rodar
  100% offline um dia, basta copiar o decodificador para uma pasta local
  e por o caminho dela primeiro em `DECODER_SOURCES`
  (`models/stove-factory.js`).
- **O que veio no pacote e NAO entrou.** O modelo chegou com um preview
  proprio (`psx-render.js` e `psx-glb-loader.js`): um mini carregador de
  GLB e um shader PSX (wobble de vertice, warp afim, dither) que rodam
  fora do three.js do jogo. Nada disso foi usado, de proposito: o look
  PSX daqui ja vem da renderizacao do jogo, e aquele shader deixaria SO
  o fogao com iluminacao propria, chapado no meio de um comodo escuro.
  O que importava do pacote (a textura PSX) ja estava embutido no `.glb`.


## O BOTIJAO DE GAS DA COZINHA

Segunda peca decorativa da COZINHA, ao lado do fogao. Mesmo sistema de
importacao de `.glb` do fogao e dos moveis do `MEU QUARTO`: nenhum
carregador novo, nenhum shader novo, nenhum sistema paralelo de 3D.

- **Onde ele esta.** Encostado no canto do FUNDO A DIREITA da COZINHA
  (no mundo, por volta de `x = 7.56`, `z = -4.01`), com 2 cm de folga
  para as duas paredes. O canto foi escolhido por conta propria (o
  jogador pediu "um canto aleatorio"): e o outro canto da parede do
  fundo, o unico ainda vago - o fogao ja ocupa o do fundo a esquerda, e
  as duas pecas no mesmo canto se sobreporiam.
- **Medidas finais 0.49 x 0.44 x 0.60** (largura, profundidade e
  altura) - um botijao P13 domestico. Aqui houve reescala, diferente do
  fogao: o arquivo chegou com 0.91 de altura (uns 50% maior que o
  botijao real) e base larga demais para essa altura, entao a peca e
  escalada UNIFORMEMENTE pela altura (`TARGET_HEIGHT = 0.6` em
  `models/gas-cylinder-factory.js`, mesma ideia do guarda-roupa e da
  lata de lixo). A altura e a medida que o jogador le em primeira
  pessoa, contra o fogao (0.92) ao lado; ficar um pouco mais chapudo que
  o botijao real combina com a estetica PS1, ficar mais alto seria
  obvio.
- **Dado puro, como todo o resto da planta.** A posicao vem de
  `gasCylinders` na entrada da COZINHA em `HouseConfig.sideRooms`
  (`scenes/house-config.js`), com os MESMOS campos do `stoves`: `corner`
  (hoje os quatro cantos do comodo, ver a secao da geladeira abaixo) e
  `rotationY`.
- **Um bloco de mobilia para as duas pecas.** O construtor dos quatro
  comodos (`scenes/side-room-scene.js`) nao ganhou um bloco novo: fogao
  e botijao entraram numa tabela (`FLOOR_PROPS`) que liga a lista de
  dados a fabrica correspondente, e UM bloco encosta as duas no canto,
  calcula a colisao e sobe as duas no piso. Do ponto de vista do comodo
  as duas sao a mesma coisa (objeto apoiado no chao, encostado num
  canto), entao peca decorativa nova daqui pra frente e uma linha nessa
  tabela, e nao mais um lugar para o mesmo bug morar.
- **Decorativo, mas solido.** Nao entra em `interactables`: sem contorno
  de destaque, sem prompt de Interagir, sem dialogo, sem animacao, sem
  som (o pedido foi "apenas um item decorativo, sem interacoes, por
  enquanto"). Entra em `solids`, so para o jogador nao atravessar o
  botijao andando. Como a caixa sai da bounding box do modelo, a colisao
  e um pouco mais folgada que o cilindro visivel - melhor sobrar do que
  deixar a camera entrar dentro da peca.
- **Da para mexer sem tocar em codigo.** O grupo tem nome estavel
  (`GasCylinderPSX`), entao o Editor identifica, move, gira e escala a
  peca, e o que for salvo vale por cima dos numeros do arquivo (ver
  `editor/README.md`). No painel da hierarquia ele aparece como Botijao
  de gas.
- **Textura: veio SOLTA no pacote e foi embutida no `.glb`.** Unica
  diferenca de fluxo em relacao ao fogao. O `.glb` do pacote chegou so
  com a geometria (material branco, sem imagem nenhuma) e a textura PSX
  morava como data URI dentro do `botijao-psx.js`, aplicada em tempo de
  execucao pelo shader do preview. Como o jogo carrega `.glb` e nao
  modulos ES, essa mesma imagem (PNG 256x256, dither ordenado e cor de
  ~15-bit ja "assados" nos pixels) foi embutida bit a bit dentro de
  `assets/models/gas_cylinder_psx.glb`, com sampler NEAREST e wrap
  REPEAT - exatamente o que o preview pedia no codigo dele. Mudou so
  ONDE a imagem mora, para o modelo continuar sendo UM arquivo carregado
  pelo MESMO `GLTFLoader`, sem `TextureLoader` avulso e sem um segundo
  asset para sincronizar. A geometria Draco nao foi tocada, e em tempo
  de execucao roda so o `normalizeTextures` de sempre (nearest, sem
  mipmap, encoding linear), com `MeshStandardMaterial` iluminado pelas
  luzes da casa.
- **Draco, de novo.** Segundo modelo do jogo com a geometria comprimida
  (`KHR_draco_mesh_compression`, obrigatoria dentro do arquivo: 55.497
  vertices e 49.770 triangulos). O `<script>` do `DRACOLoader` ja estava
  em `index.html` por causa do fogao, entao nada de novo precisou entrar
  la: a fabrica so acopla o `DRACOLoader` ao mesmo `GLTFLoader`, com a
  mesma lista de fontes do decodificador (`DECODER_SOURCES`) e o mesmo
  comportamento se ele nao chegar - avisa no console, tenta a segunda
  fonte e o boot segue igual, so sem o botijao.
- **O que veio no pacote e NAO entrou.** Igual ao fogao: o preview
  (`index.html` + `botijao-psx.js`) traz um `ShaderMaterial` PSX com
  wobble de vertice, warp de textura afim e quantizacao de cor, e um
  mini carregador de GLB. Nada disso foi usado: o look PSX daqui ja vem
  da renderizacao do jogo, e aquele shader tem luz propria fixa - so o
  botijao ignoraria as luzes do comodo e apareceria chapado no meio de
  um cenario escuro.


## A GELADEIRA DA COZINHA

Terceira peca decorativa da COZINHA, na mesma parede do fogao. Mesmo
sistema de importacao de `.glb` do fogao, do botijao e dos moveis do
`MEU QUARTO`: nenhum carregador novo, nenhum shader novo, nenhum sistema
paralelo de 3D - foi o pedido ("ja tem outros itens que foram
implementados dessa forma, portanto use o mesmo sistema").

- **Onde ela esta.** Encostada no canto da parede da PORTA, do lado
  esquerdo do comodo (no mundo, por volta de `x = 3.53`, `z = -11.15`),
  com 2 cm de folga para as duas paredes e de costas para a parede de
  entrada, com a porta virada para dentro do comodo. O canto foi
  escolhido por conta propria (o pedido foi "pode escolher um canto
  aleatorio"): os dois cantos do FUNDO ja estavam ocupados pelo fogao e
  pelo botijao, e o da entrada a esquerda e o mais longe do vao da porta
  (que cai em `x` local +0.6), entao a geladeira nunca disputa espaco com
  a passagem nem com a folha girando. Na pratica ela fica na mesma parede
  do fogao, na outra ponta - do jeito que geladeira e fogao ficam numa
  cozinha de verdade.
- **Os dois cantos da parede de entrada entraram agora.** Ate aqui o
  construtor dos quatro comodos so sabia encostar movel nos dois cantos
  do fundo. Em vez de mais um `if`, os cantos viraram uma tabela
  (`CORNERS` em `scenes/side-room-scene.js`) que diz de qual parede de
  cada eixo o canto encosta, e a conta de posicao ficou uma so para as
  quatro opcoes e para qualquer peca. Canto escrito errado nos dados
  avisa no console e a peca simplesmente nao aparece; peca que caia na
  frente de um vao tambem avisa (nao acontece com a planta de hoje).
- **Medidas finais 0.56 x 0.59 x 1.60** (largura, profundidade e altura)
  - uma geladeira domestica de uma porta. Houve reescala, como no botijao
  e no guarda-roupa: as PROPORCOES do arquivo estavam certas (2.85x mais
  alta que larga, um pouco mais funda que larga), so a escala absoluta
  veio pequena - 1.08 de altura e altura de bancada. A peca e escalada
  UNIFORMEMENTE pela altura (`TARGET_HEIGHT = 1.6` em
  `models/fridge-factory.js`), a medida que o jogador le em primeira
  pessoa contra o fogao (0.92) ao lado. Com essa altura a base sai
  praticamente igual a do fogao (0.56 x 0.59), entao as duas pecas leem
  como uma linha de moveis na mesma profundidade de parede.
- **Dado puro, como todo o resto da planta.** A posicao vem de `fridges`
  na entrada da COZINHA em `HouseConfig.sideRooms`
  (`scenes/house-config.js`), com os MESMOS campos do `stoves` e do
  `gasCylinders`: `corner` e `rotationY`. O `rotationY: Math.PI` esta nos
  DADOS, e nao dentro da fabrica: a peca nasce com a frente em +Z e, nos
  cantos da parede de entrada, o interior do comodo fica em -Z - sem o
  meio giro a porta da geladeira ficaria virada para a parede.
- **Um bloco de mobilia para as tres pecas.** O construtor dos quatro
  comodos (`scenes/side-room-scene.js`) nao ganhou bloco novo: a
  geladeira foi uma linha na tabela `FLOOR_PROPS` (a que liga a lista de
  dados a fabrica correspondente) e o MESMO bloco encosta as tres no
  canto, calcula a colisao e sobe as tres no piso (o piso destes comodos
  nasce 2 cm acima do zero, ver `FLOOR_LIFT`).
- **Decorativa, mas solida.** Nao entra em `interactables`: sem contorno
  de destaque, sem prompt de Interagir, sem dialogo, sem animacao, sem
  som (o pedido foi "apenas um item decorativo, sem interacoes, por
  enquanto" - abrir a porta um dia e trabalho de outra atualizacao).
  Entra em `solids`, so para o jogador nao atravessar a geladeira
  andando, com a mesma margem de 5 cm dos outros moveis.
- **Da para mexer sem tocar em codigo.** O grupo tem nome estavel
  (`FridgePSX`), entao o Editor identifica, move, gira e escala a peca, e
  o que for salvo vale por cima dos numeros do arquivo (ver
  `editor/README.md`). No painel da hierarquia ela aparece como
  Geladeira.
- **Textura: ja veio embutida no `.glb`.** Diferente do botijao (cuja
  imagem morava solta num `.js` do pacote), aqui a textura PSX ja estava
  dentro do arquivo - PNG 128x128, cor requantizada em ~15 bits com
  dithering Floyd-Steinberg e sampler NEAREST/REPEAT. O `.glb` foi
  copiado bit a bit para `assets/models/fridge_psx.glb`, sem reexportar
  nada, e em tempo de execucao roda so o `normalizeTextures` de sempre
  (nearest, sem mipmap, encoding linear), com `MeshStandardMaterial`
  iluminado pelas luzes da casa.
- **Draco, de novo.** Terceiro modelo do jogo com a geometria comprimida
  (`KHR_draco_mesh_compression`, obrigatoria dentro do arquivo: 33.372
  vertices e 49.966 triangulos). O `<script>` do `DRACOLoader` ja estava
  em `index.html` por causa do fogao, entao nada de novo precisou entrar
  la: a fabrica so acopla o `DRACOLoader` ao mesmo `GLTFLoader`, com a
  mesma lista de fontes do decodificador (`DECODER_SOURCES`) e o mesmo
  comportamento se ele nao chegar - avisa no console, tenta a segunda
  fonte e o boot segue igual, so sem a geladeira.
- **O que veio no pacote e NAO entrou.** O `fridge-loader.js` (modulo ES
  que monta o proprio GLTFLoader e importa three.js 0.160 por importmap
  de CDN) e o `preview.html`. O jogo roda em three.js r128 com scripts
  globais: usar aquele loader significaria carregar um SEGUNDO three.js
  na pagina, exatamente o sistema novo que o pedido descarta. Ele tambem
  troca o material por `MeshLambertMaterial`, e manter o material que vem
  no `.glb` e o que faz a geladeira receber a mesma luz do fogao ao lado.
  O que importava do pacote (geometria + textura) ja estava no proprio
  `.glb`.
- **Se ela aparecer de costas.** Nem a bounding box nem os nomes do
  arquivo dizem qual lado e a frente (a base e quase quadrada), entao foi
  assumido o mesmo lado do fogao e do botijao, que sairam da mesma esteira
  de conversao. Se o puxador estiver virado para a parede, e UMA linha:
  `MODEL_YAW` em `models/fridge-factory.js` (0 ou `Math.PI`) - ou um giro
  no Editor, sem tocar em codigo. O recentramento e a colisao acompanham
  sozinhos.


## A PIA COM ARMARIO DA COZINHA

Quinta peca decorativa da COZINHA, na mesma parede do fogao e ao lado
dele. Mesmo sistema de importacao de `.glb` do fogao, do botijao, da
geladeira, da mesa e dos moveis do `MEU QUARTO`: nenhum carregador novo,
nenhum shader novo, nenhum sistema paralelo de 3D - foi o pedido ("ja tem
outros itens que foram implementados dessa forma, portanto use o mesmo
sistema, nao precisa criar algo novo").

- **Onde ela esta.** Encostada na parede do FUNDO, do lado esquerdo do
  comodo, 80 cm ao lado do fogao (no mundo, por volta de `x = 7.43`,
  `z = -9.95`), com 2 cm de folga para a parede e a frente (portas do
  armario e cuba) virada para dentro do comodo. Pia ao lado do fogao, na
  mesma bancada: e como uma cozinha de verdade e montada, e a bancada
  dela (0.9) fica praticamente na altura da do fogao (0.92), entao as
  duas leem como uma linha continua de moveis. Sobram 24 cm visiveis
  entre as duas pecas (14 cm entre as caixas de colisao).
- **A peca NAO esta num canto - e o primeiro caso disso.** As quatro
  pecas anteriores ocuparam os quatro cantos do comodo (fogao no fundo a
  esquerda, botijao no fundo a direita, geladeira na entrada a esquerda,
  mesa na entrada a direita). Nao sobrou canto, e empilhar a pia em cima
  de outra peca sobreporia modelos e caixas de colisao. Em vez de
  inventar um canto que nao existe, o bloco de mobilia ganhou um campo
  opcional: `wallOffset`, quantos metros a peca DESLIZA a partir do canto
  na direcao do centro da parede. O canto continua sendo a ancora (mesmo
  `corner`, mesma folga de parede, mesma conta de colisao), e
  `wallOffset` e um termo somado ao X - as outras quatro pecas nao tem o
  campo e nao mudaram um milimetro. Deslizar demais avisa no console (a
  peca passaria da parede oposta), no mesmo espirito do aviso de "peca na
  frente do vao da porta".
- **Medidas finais 1.35 x 0.70 x 0.90** (largura, profundidade e altura)
  - um balcao de pia de uma cuba. Houve reescala, como no botijao, na
  geladeira e na mesa: as PROPORCOES do arquivo estavam certas (1.5x mais
  largo que alto, base rasa de movel de encostar), so a escala absoluta
  veio pequena - 0.62 de altura e movel de banheiro, nao bancada de
  cozinha. A peca e escalada UNIFORMEMENTE pela altura
  (`TARGET_HEIGHT = 0.9` em `models/sink-cabinet-factory.js`), a medida
  que o jogador le em primeira pessoa contra o fogao (0.92) ao lado e
  contra a escrivaninha do corredor (0.8). Achou grande ou pequena? E UMA
  linha - largura, profundidade, recentramento e colisao saem todas dela.
- **Dado puro, como todo o resto da planta.** A posicao vem de
  `sinkCabinets` na entrada da COZINHA em `HouseConfig.sideRooms`
  (`scenes/house-config.js`), com os MESMOS campos das outras quatro
  pecas (`corner`, `rotationY`) mais o `wallOffset` novo. `rotationY: 0`
  porque na parede do fundo o interior do comodo ja fica em +Z, o lado
  para onde a peca nasce olhando - o meio giro e coisa dos cantos da
  parede de entrada (geladeira e mesa).
- **Um bloco de mobilia para as cinco pecas.** O construtor dos quatro
  comodos (`scenes/side-room-scene.js`) nao ganhou bloco novo: a pia foi
  uma linha na tabela `FLOOR_PROPS` (a que liga a lista de dados a
  fabrica correspondente) e o MESMO bloco encosta as cinco na parede,
  calcula a colisao e sobe as cinco no piso (o piso destes comodos nasce
  2 cm acima do zero, ver `FLOOR_LIFT`).
- **Decorativa, mas solida.** Nao entra em `interactables`: sem contorno
  de destaque, sem prompt de Interagir, sem dialogo, sem animacao, sem
  som (o pedido foi "e apenas um item decorativo, sem interacoes, por
  enquanto" - abrir a torneira ou o armario um dia e trabalho de outra
  atualizacao). Entra em `solids`, so para o jogador nao atravessar o
  balcao andando, com a mesma margem de 5 cm dos outros moveis.
- **Da para mexer sem tocar em codigo.** O grupo tem nome estavel
  (`SinkCabinetPSX`), entao o Editor identifica, move, gira e escala a
  peca, e o que for salvo vale por cima dos numeros do arquivo (ver
  `editor/README.md`). No painel da hierarquia ela aparece como Pia com
  armario.
- **Textura: veio SOLTA no pacote e foi embutida no `.glb`.** Mesmo caso
  do botijao, resolvido do mesmo jeito. O pacote trouxe geometria e
  imagem separadas - o `.glb` so com a geometria (material `PSX` branco,
  sem imagem) e a textura PSX ao lado, em `pia-armario-psx-texture.png`
  (256x256, cor de ~15 bits e dithering ja assados nos pixels). Essa
  imagem foi embutida no proprio `assets/models/sink_cabinet_psx.glb`
  como `image/png` em bufferView, com sampler NEAREST/REPEAT, ligada ao
  `baseColorTexture` do material que ja existia no arquivo: a imagem e a
  mesma bit a bit, a geometria Draco nao foi tocada e nada foi
  reexportado. Assim o modelo continua sendo UM arquivo carregado pelo
  MESMO `GLTFLoader`, sem `TextureLoader` avulso e sem um segundo asset
  para sincronizar - e o `flipY = false` que o README do pacote pedia na
  mao sai de graca, ja que o `GLTFLoader` cuida disso para textura de
  dentro do arquivo. Em execucao roda so o `normalizeTextures` de sempre
  (nearest, sem mipmap, encoding linear), com `MeshStandardMaterial`
  iluminado pelas luzes da casa.
- **Draco, de novo.** Quinto modelo do jogo com a geometria comprimida
  (`KHR_draco_mesh_compression`, obrigatoria dentro do arquivo: 31.551
  vertices e 50.000 triangulos). O `<script>` do `DRACOLoader` ja estava
  em `index.html` por causa do fogao, entao nada de novo precisou entrar
  la: a fabrica so acopla o `DRACOLoader` ao mesmo `GLTFLoader`, com a
  mesma lista de fontes do decodificador (`DECODER_SOURCES`) e o mesmo
  comportamento se ele nao chegar - avisa no console, tenta a segunda
  fonte e o boot segue igual, so sem a pia.
- **O que veio no pacote e NAO entrou.** O `index.html` de preview
  (three.js 0.1xx por modulos ES de CDN, OrbitControls, render em baixa
  resolucao com render target proprio, vertex snapping e um passe de
  dither/quantizacao). O jogo roda em three.js r128 com scripts globais:
  usar aquele preview significaria carregar um SEGUNDO three.js na
  pagina, exatamente o sistema novo que o pedido descarta, e uma segunda
  camada de efeito PSX brigando com a do jogo inteiro. Ele tambem troca o
  material por `MeshBasicMaterial`, que ignora iluminacao: a pia seria a
  unica peca autoiluminada de um comodo escuro, do lado da geladeira e do
  fogao.
- **Se ela aparecer de costas.** Aqui a frente importa (diferente da
  mesa, que le igual dos dois lados): as portas do armario e a boca da
  cuba ficam de um lado, o fundo cru do outro. Nem a bounding box nem os
  nomes do arquivo dizem qual e qual, entao foi assumido o mesmo lado das
  outras quatro pecas da COZINHA, que sairam da mesma esteira de
  conversao. Se estiver invertida, e UMA linha: `MODEL_YAW` em
  `models/sink-cabinet-factory.js` (0 ou `Math.PI`) - ou um giro no
  Editor, sem tocar em codigo. O recentramento e a colisao acompanham
  sozinhos.


## O MICROONDAS DA COZINHA

SETIMA peca decorativa da COZINHA, na mesma parede do fogao e da pia,
logo depois dela. Mesmo sistema de importacao de `.glb` das outras seis e
dos moveis do `MEU QUARTO`: nenhum carregador novo, nenhum shader novo,
nenhum sistema paralelo de 3D - foi o pedido ("ja tem outros itens que
foram implementados dessa forma, portanto use o mesmo sistema, nao precisa
criar algo novo").

- **Onde ele esta.** Encostado na parede do FUNDO, 2.4 m ao lado do canto
  do fogao - ou seja, logo depois da pia (no mundo, por volta de
  `x = 7.59`, `z = -8.72`), com 2 cm de folga para a parede e a frente
  (porta de vidro + painel de botoes) virada para dentro do comodo. A
  parede do fundo agora le como uma bancada continua na ordem de uma
  cozinha de verdade: fogao, pia, microondas. Sobram 24 cm visiveis entre
  ele e a pia (14 cm entre as caixas de colisao) e ainda 2.89 m de parede
  livre entre ele e a prateleira, do outro lado.
- **Ancorado num canto e deslizado, como a pia e a prateleira.** Os quatro
  cantos do comodo seguem ocupados, entao o microondas usa o canto
  `fundo-esquerda` (o do fogao) como ancora e o campo opcional
  `wallOffset: 2.4` para andar ao longo da parede. Nada novo: o campo
  existe desde a pia e e um termo somado ao X, entao encosto, colisao e o
  aviso de "peca na frente do vao da porta" continuam valendo sem caso
  especial. Deslizar demais avisa no console.
- **Ele fica NO CHAO.** O bloco de mobilia dos comodos apoia toda peca no
  piso (`FLOOR_LIFT`, os 2 cm que o piso destes comodos tem acima do
  zero); nao existe campo de altura para empilhar uma peca em cima de
  outra, e inventar um seria justamente o "algo novo" que o pedido
  descarta. Quer ver o aparelho em cima da bancada da pia? E um arraste no
  eixo Y do gizmo no Editor, e o valor fica salvo por cima dos numeros do
  arquivo.
- **Medidas finais 0.61 x 0.38 x 0.38** (largura, profundidade e altura) -
  um microondas grande de bancada. Sem reescala, como o fogao e a
  prateleira: `MODEL_SCALE = 1`, porque o arquivo ja chegou em metros e em
  medida de eletrodomestico de verdade. Contra a bancada da pia (0.9) e o
  fogao (0.92) ao lado, ele le como pouco menos da metade da altura -
  exatamente a proporcao certa.
- **Dado puro, como todo o resto da planta.** A posicao vem de
  `microwaves` na entrada da COZINHA em `HouseConfig.sideRooms`
  (`scenes/house-config.js`), com os MESMOS campos das outras pecas
  (`corner`, `wallOffset`, `rotationY`). `rotationY: 0` porque na parede
  do fundo o interior do comodo ja fica em +Z, o lado para onde a peca
  nasce olhando.
- **Um bloco de mobilia para as sete pecas.** O construtor dos quatro
  comodos (`scenes/side-room-scene.js`) nao ganhou bloco novo: o
  microondas foi UMA linha na tabela `FLOOR_PROPS` (a que liga a lista de
  dados a fabrica correspondente) e o MESMO bloco encosta as sete na
  parede, calcula a colisao e sobe as sete no piso.
- **Decorativo, mas solido.** Nao entra em `interactables`: sem contorno
  de destaque, sem prompt de Interagir, sem dialogo, sem animacao, sem
  som, sem porta que abre e sem luz interna (o pedido foi "e apenas um
  item decorativo, sem interacoes, (por enquanto)" - esquentar algo, o
  "beep" ou a lampadinha girando o prato sao trabalho de outra
  atualizacao). Entra em `solids`, so para o jogador nao atravessar o
  aparelho andando, com a mesma margem de 5 cm dos outros moveis.
- **Da para mexer sem tocar em codigo.** O grupo tem nome estavel
  (`MicrowavePSX`), entao o Editor identifica, move, gira e escala a peca,
  e o que for salvo vale por cima dos numeros do arquivo (ver
  `editor/README.md`). No painel da hierarquia ele aparece como
  Microondas.
- **O arquivo entrou COMO CHEGOU, byte a byte.** Diferente do botijao, da
  pia e da prateleira, aqui nada precisou ser mexido no asset: o pacote ja
  trouxe a geometria E a textura dentro do mesmo `.glb` (PNG 256x256 em
  bufferView, sampler NEAREST, paleta reduzida e dither ja assados nos
  pixels), que e exatamente o formato ao qual as tres pecas anteriores
  foram convertidas a mao. `assets/models/microwave_psx.glb` e copia
  identica do arquivo enviado - 51 KB, o mais leve das sete pecas da
  COZINHA - com os creditos da licenca (CC BY 4.0, *Lo-Fi Microwave
  (PSX)*, de Vaportrash) preservados dentro do proprio arquivo.
- **O material vinha "Unlit" - e esse conserto ja existia.** O modelo veio
  do Sketchfab marcado com `KHR_materials_unlit`, e o `GLTFLoader`, ao ver
  essa extensao, cria um `MeshBasicMaterial`, que IGNORA as luzes da cena
  e desenha a textura sempre no brilho maximo. Numa cozinha sem luz
  propria o microondas seria a UNICA peca acesa do comodo - o mesmo bug
  que a TV do `MEU QUARTO` teve. A fabrica roda a MESMA funcao
  `fixUnlitMaterial` de `models/tv-factory.js`: troca por
  `MeshStandardMaterial` reaproveitando a textura ja normalizada, com o
  mesmo acabamento fosco (roughness 0.7 / metalness 0.05). Nada de sistema
  novo, e o aparelho passa a ser iluminado pelas luzes da casa como as
  outras seis pecas.
- **`DoubleSide` preservado de proposito.** A face lateral esquerda do
  modelo veio com a normal e o winding invertidos no arquivo (apontando
  para dentro da caixa). O material do `.glb` e `doubleSided`, e o `side` e
  preservado na troca do material: com `DoubleSide` o three.js desenha essa
  face e inverte a normal dela na iluminacao, entao ela acende como as
  outras cinco - com `FrontSide` o microondas ficaria com um buraco do lado
  esquerdo. A geometria segue INTOCADA (24 vertices, 12 triangulos, nada
  reexportado).
- **Sem Draco - primeira das sete.** A geometria deste arquivo chega crua,
  entao a fabrica nao acopla `DRACOLoader` nenhum e nao tem lista de
  fontes de decodificador: e o `GLTFLoader` puro, igual ao da TV e do
  relogio de parede. O `<script>` do `DRACOLoader` continua em
  `index.html` por causa das outras seis pecas da COZINHA, e nada de novo
  precisou entrar la.
- **A frente nao foi chute.** Diferente do fogao (que precisou deduzir
  pela camera do preview), aqui a frente e conhecida: as seis faces da
  caixa usam regioes diferentes do atlas 256x256 embutido, e a regiao da
  face +Z e a que traz a porta de vidro escuro com o painel de botoes ao
  lado (a face -Z traz a grade de ventilacao e a etiqueta da traseira).
  Frente em +Z, a MESMA convencao das outras seis pecas da COZINHA. Se um
  dia o modelo for trocado e a peca aparecer de costas, e UMA linha:
  `MODEL_YAW` em `models/microwave-factory.js` - ou um giro no Editor.
- **O que veio no pacote e NAO entrou.** O `index.html` de preview
  (three.js 0.160 por modulos ES de CDN, OrbitControls, render interno em
  baixa resolucao, vertex snapping e controles de pixelizacao na tela). O
  jogo roda em three.js r128 com scripts globais: usar aquele preview
  significaria carregar um SEGUNDO three.js na pagina, exatamente o
  sistema novo que o pedido descarta, e uma segunda camada de efeito PSX
  brigando com a do jogo inteiro (resolucao interna baixa, vinheta,
  scanlines e motion blur ja valem para o jogo todo - o microondas entra
  nisso de graca).


## O RADIO PORTATIL DA COZINHA

DECIMA peca decorativa do comodo, e a segunda que chega com a geometria
CRUA (sem Draco), como o microondas. Modelo enviado pelo jogador em um
pacote de conversao PSX pronto, e entrou no jogo pelo MESMO caminho de
sempre: `assets/models/portable_radio_psx.glb` +
`models/portable-radio-factory.js` + uma linha nos dados do comodo. Um
radio portatil de pilha, com alca e antena estendida.

- **Nenhum sistema novo, que era o pedido.** Mesmo `THREE.GLTFLoader` dos
  outros `.glb` de `assets/models`, mesmo `normalizeTextures` (nearest,
  sem mipmap, encoding linear), mesmo `fixUnlitMaterial` de
  `models/tv-factory.js` e a mesma ideia de medir a bounding box nativa
  UMA vez e deixar a cena so decidir ONDE a peca fica. Nenhum carregador
  novo, nenhum shader novo, nenhum segundo three.js.
- **Cuidado com o nome: sao DOIS radios no jogo.** `RadioFactory`
  (`models/radio-factory.js`) e o radio DE MAO deitado na mesinha de TV do
  `MEU QUARTO`. Este e outro modelo, em outro comodo, e por isso se chama
  `PortableRadioFactory` (`portable_radio_psx.glb`, grupo
  `PortableRadioPSX`) - o arquivo novo nao encosta em uma linha do radio
  de mao, e no painel da hierarquia do Editor os dois aparecem com
  rotulos distintos.
- **Um canto "aleatorio", como o jogador pediu.** Os quatro cantos do
  comodo ja estavam ocupados, entao o radio faz o que a pia, a
  prateleira, o microondas e o filtro fazem: ancora num canto e desliza
  pela parede (`corner: "fundo-esquerda"`, `wallOffset: 3.2`). Cai na
  parede do FUNDO logo depois do microondas, fechando a sequencia da
  bancada (fogao, pia, microondas, radio) - que e onde um radio de cozinha
  vive de verdade. No mundo: x = 7.74, z = -8.13, com 19 cm visiveis ate o
  microondas e 2.5 m de parede livre do outro lado. `rotationY: 0` porque
  na parede do fundo o interior do comodo ja fica em +Z: o painel olha
  para dentro da cozinha e a antena fica junto da parede.
- **Um bloco de mobilia para as dez pecas.** O construtor dos quatro
  comodos (`scenes/side-room-scene.js`) nao ganhou bloco novo: o radio foi
  UMA linha na tabela `FLOOR_PROPS` e o MESMO bloco de sempre encosta a
  peca na parede, calcula a colisao e apoia ela no piso.
- **Decorativo, mas solido.** Nao entra em `interactables`: sem contorno
  de destaque, sem prompt de Interagir, sem dialogo, sem animacao, sem
  som, sem chuvisco de estacao morta e sem botao que liga (o pedido foi "e
  apenas um item decorativo, sem interacoes, (por enquanto)" - ligar o
  radio e trabalho de outra atualizacao, em `interactables` + `audio/`).
  Entra em `solids`, so para o jogador nao atravessar o aparelho andando,
  com a mesma margem de 5 cm dos outros moveis.
- **A escala NAO podia ser ancorada na altura.** A bounding box tem 55 cm
  de altura, mas esses 55 cm sao a ANTENA ESTENDIDA: o aparelho em si mede
  20,5 x 14 x 7,4 cm, ou seja, o arquivo chegou em metros e com medida de
  radio de verdade. Dai `MODEL_SCALE = 1`, como o fogao, a prateleira e o
  microondas, e nao um `TARGET_HEIGHT` como a geladeira, a pia ou o
  filtro - ancorar na altura da caixa daria um radio de casa de boneca com
  uma antena de 30 cm.
- **A antena nao infla a colisao.** Ela nasce DENTRO da pegada do corpo
  (X entre +0.073 e +0.080, dentro dos +-0.1025 do aparelho; Z entre
  -0.038 e -0.031, dentro dos -0.039 a +0.035), entao a base da bounding
  box e exatamente a base do radio: a colisao e a pegada do aparelho e nao
  uma coluna invisivel de 55 cm em volta de uma haste de 3 mm.
- **O arquivo entrou COMO CHEGOU, byte a byte.** Como no microondas, nada
  precisou ser mexido no asset: geometria intocada (161 vertices, 95
  triangulos) e a textura PSX ja dentro do proprio `.glb` (PNG 128x128 em
  bufferView, paleta de 48 cores e dither ja assados nos pixels).
  `assets/models/portable_radio_psx.glb` e copia identica do arquivo
  enviado (26 KB), com os creditos da licenca (CC BY 4.0, *Radio*, de
  Luka.Aleksic) preservados dentro do proprio arquivo. A textura solta de
  128x128 e a original de 1024x1024 que vinham no pacote NAO entraram -
  seriam um segundo caminho para a mesma imagem, e a de 1024 existia so
  para o comparativo do preview.
- **`normalizeTextures` aqui e obrigatorio, nao "cinto e suspensorio".**
  Diferente do microondas, o sampler deste `.glb` pede LINEAR com
  `LINEAR_MIPMAP_LINEAR` (o padrao do Sketchfab, mesmo caso da mesa de
  frutas). Sem a normalizacao a textura de 128x128 chegaria borrada e com
  mipmap - o oposto do visual do jogo, e visivel de perto justamente onde
  o modelo tem detalhe (o dial de sintonia).
- **O material vinha "Unlit" - o mesmo conserto de sempre.** O modelo veio
  do Sketchfab com `KHR_materials_unlit`, entao o `GLTFLoader` cria um
  `MeshBasicMaterial`, que IGNORA as luzes e desenha a textura no brilho
  maximo: o radio brilharia sozinho numa cozinha escura, do lado de um
  fogao apagado. A fabrica roda a MESMA funcao `fixUnlitMaterial` da TV e
  do microondas (`MeshStandardMaterial` com a textura ja normalizada,
  roughness 0.7 / metalness 0.05), e o `side` `DoubleSide` do arquivo e
  preservado - a antena e um cilindro de 3 mm e a alca e uma tira sem
  espessura, que sumiriam em certos angulos com `FrontSide`.
- **A frente nao foi chute.** As faces do lado +Z caem na regiao do atlas
  128x128 que traz o auto-falante redondo, o dial de sintonia com as
  marcacoes de frequencia e os dois botoes; o lado -Z traz o painel
  traseiro (tampa de pilhas e etiquetas), e a antena sai do canto de tras
  a direita. Frente em +Z, a MESMA convencao do resto do jogo. Se um dia o
  modelo for trocado e a peca aparecer de costas, e UMA linha:
  `MODEL_YAW` em `models/portable-radio-factory.js` - ou um giro no
  Editor.
- **Sem Draco, como o microondas.** A geometria chega crua, entao a
  fabrica nao acopla `DRACOLoader` nenhum: e o `GLTFLoader` puro. O
  `<script>` do `DRACOLoader` continua em `index.html` por causa das
  outras pecas da COZINHA, e nada de novo precisou entrar la.
- **O `js/psx-material.js` do pacote NAO entrou.** Ele e um modulo ES
  (`import * as THREE from 'three'`) e o jogo carrega o three.js r128 por
  `<script>` global - nao roda aqui sem bundler. Pior: e um
  `ShaderMaterial` com luz, fog e direcao de luz PROPRIAS cravadas em
  uniforms, entao o radio seria o UNICO objeto do jogo fora do sistema de
  iluminacao da casa (as luzes do comodo, o amanhecer e o fog da cena nao
  chegariam nele) - o mesmo bug do material "unlit", de dentro para fora.
  E o visual PS1 que ele simula o jogo JA TEM por outro caminho: render em
  resolucao interna baixa com upscale sem suavizacao
  (`scripts/main.js` + `image-rendering: pixelated`) e textura
  nearest/sem mipmap. O `preview.html` do pacote ficou de fora pelo mesmo
  motivo do preview do microondas: carregaria um SEGUNDO three.js na
  pagina.
- **Da para mexer sem tocar em codigo.** O grupo tem nome estavel
  (`PortableRadioPSX`), entao o Editor identifica, move, gira e escala a
  peca, e o que for salvo vale por cima dos numeros do arquivo (ver
  `editor/README.md`). No painel da hierarquia ele aparece como Radio
  portatil. Ele nasce NO CHAO, como as outras nove pecas do comodo (nao
  existe, ainda, campo de altura para empilhar uma peca em cima da outra):
  para ver o radio em cima da PRATELEIRA ou da bancada da pia, e um
  arraste no eixo Y do gizmo.


## OS SEIS MOVEIS DO BANHEIRO

O BANHEIRO era o ultimo dos quatro comodos novos ainda vazio (so a caixa
arquitetonica de `scenes/side-room-scene.js`). O jogador enviou SEIS
modelos de uma vez, em pacotes de conversao PSX, e os seis entraram pelo
MESMO caminho das dez pecas da COZINHA: um `.glb` em `assets/models`, uma
fabrica em `models/` e uma lista nos dados da planta
(`scenes/house-config.js`). Todos decorativos, sem interacao.

| peca | asset | fabrica | onde ficou |
| --- | --- | --- | --- |
| Privada | `toilet_psx.glb` | `models/toilet-factory.js` | canto do fundo a esquerda |
| Pia de coluna | `bathroom_sink_psx.glb` | `models/bathroom-sink-factory.js` | parede do fundo, ao lado da privada |
| Espelheira | `mirror_cabinet_psx.glb` | `models/mirror-cabinet-factory.js` | **pendurada** acima da pia |
| Toalha | `towel_psx.glb` | `models/towel-factory.js` | **pendurada** na parede do fundo, ao lado do box |
| Box de chuveiro | `shower_box_psx.glb` | `models/shower-box-factory.js` | canto do fundo a direita |
| Cesto de roupa | `laundry_basket_psx.glb` | `models/laundry-basket-factory.js` | canto da entrada a direita |

- **Nenhum sistema novo, que era o pedido.** Mesmo `THREE.GLTFLoader` dos
  outros `.glb` de `assets/models`, mesmo `THREE.DRACOLoader` (nas quatro
  pecas com geometria comprimida: privada, toalha, box e cesto), mesmo
  `normalizeTextures` (nearest, sem mipmap, encoding linear), mesmo
  `fixUnlitMaterial` de `models/tv-factory.js` (na privada, que chegou
  com material "Unlit") e a mesma ideia de medir a bounding box nativa
  UMA vez e deixar a cena so decidir ONDE a peca fica. Nenhum carregador
  novo, nenhum shader novo, nenhum segundo three.js. Os previews que
  vinham nos pacotes (modulos ES em three.js 0.16x, com `ShaderMaterial`,
  framebuffer virtual e fog proprios) ficaram TODOS de fora, pelos
  motivos ja escritos nas fabricas da COZINHA.
- **Um bloco de mobilia para as dezesseis pecas.** O construtor dos
  quatro comodos (`scenes/side-room-scene.js`) nao ganhou bloco novo: as
  seis foram SEIS linhas na tabela `FLOOR_PROPS` e o MESMO bloco de
  sempre encosta cada peca na parede, calcula a colisao e apoia no piso.
- **O campo `elevation`: as duas primeiras pecas PENDURADAS do jogo.**
  Ate aqui todo movel importado nascia no chao ("nao existe, ainda, campo
  de altura para empilhar uma peca em cima da outra", dizia o bloco do
  radio portatil). Espelheira e toalha no chao nao existem, entao os
  dados de mobilia ganharam `elevation`: quantos metros a peca sobe a
  partir do piso. E um termo somado ao Y, a mesma ideia do `wallOffset`
  (que e um termo somado ao X), e opcional - as onze pecas que nascem no
  chao nao mudaram um milimetro. A espelheira sobe 1.15 (30 cm acima da
  borda da cuba, topo em 1.95) e a toalha 0.6 (ponta de cima em 1.55,
  altura de toalheiro).
- **A colisao continua sendo AABB em X/Z.** Peca pendurada tambem entra
  em `solids`, com a pegada dela no chao: a espelheira cai em cima da pia
  (que ja e solida no mesmo lugar) e ninguem enfia a cabeca na toalha.
  Solido com ALTURA e coisa que a colisao do jogo nao tem - e nao faz
  falta aqui.
- **As posicoes sao "um canto aleatorio", como o jogador pediu.** A
  escolha seguiu a regra da COZINHA: canto/parede que faz sentido num
  banheiro de verdade e, acima de tudo, nada sobreposto. Privada e pia
  lado a lado na parede do fundo (50 cm entre elas), espelheira em cima
  da pia, toalha a um passo do box, cesto atras da porta. Nenhuma das
  seis fica na frente do vao (que cai em x local +0.6).
- **Todas as seis chegaram NORMALIZADAS.** Os pacotes vieram com a
  bounding box encaixada num cubo de ~1 unidade (o modelo em si nao
  estava em metros), entao cada fabrica tem um `TARGET_HEIGHT` ancorado na
  ALTURA, com escala UNIFORME - mesma decisao da geladeira, da pia da
  cozinha e do filtro de barro. As proporcoes dos arquivos conferem com as
  das pecas reais em todos os seis casos (as contas estao nos comentarios
  de cada fabrica). Se alguma parecer grande ou pequena demais no jogo, e
  UMA linha por peca - ou um arraste no Editor.
- **A textura foi embutida no `.glb` em tres delas.** Toalha, box e cesto
  chegaram com geometria e textura em arquivos SEPARADOS; a PSX de 256x256
  entrou dentro do proprio `.glb` (PNG em bufferView, sampler
  NEAREST/NEAREST), como no botijao, na pia da cozinha e no filtro de
  barro: um arquivo so, um caminho de codigo so, nada de `TextureLoader`
  avulso. A geometria Draco foi copiada byte a byte nas tres. Na toalha as
  texturas PBR originais (baseColor, normal e metallic/roughness em WebP
  de 1024) sairam do arquivo - PS1 nao tinha nada disso, e o normal map
  dela e praticamente plano.
- **A pia foi a unica que precisou de um `.glb` montado do zero.** O
  pacote dela nao trouxe nenhum: a malha vinha em base64 dentro de um
  `.js` de 1,4 MB, montada em runtime na mao. Os MESMOS buffers foram
  gravados num `.glb` padrao (29.737 vertices / 50.000 triangulos,
  `POSITION`/`NORMAL`/`TEXCOORD_0` em float32, indices em Uint16, textura
  PSX embutida), sem mover um vertice - o alternativo era um SEGUNDO
  caminho de import na pagina, que e justo o que o pedido descarta. As
  cores por vertice do pacote ficaram de fora: eram a textura ja assada em
  Gouraud para o preview, e no jogo elas escureceriam a peca duas vezes.
- **Uma peca teve a identidade DEDUZIDA.** O pacote do box de chuveiro
  veio chamado so de "banheiro", sem dizer que peca e, e a malha chega
  comprimida em Draco (nao da para desenhar e olhar, como foi possivel com
  a pia e a espelheira). A textura e um atlas de paineis azulejados com
  rejunte, tubos e um RALO redondo com grelha, e a bounding box da uma
  peca 2x mais alta que larga com pegada quase quadrada: box de chuveiro.
  Se a leitura estiver errada, o conserto e o `TARGET_HEIGHT` da fabrica,
  o `corner`/`rotationY` nos dados e o rotulo no Editor - nada de
  geometria.
- **A frente de cada peca.** Medida vertice por vertice nas duas que
  chegaram cruas (na pia, a torneira e os registros estao todos no lado
  -Z, e a aba da cuba avanca para +Z; na espelheira, o espelho e a
  prateleirinha de frascos estao em +Z). Nas outras quatro, a malha chega
  comprimida: valeu a convencao do jogo (frente em +Z), com a bounding box
  confirmando o caso da privada (o vaso avanca para +Z, a caixa de
  descarga fica rente a parede). Se alguma aparecer de costas, e uma linha
  (`MODEL_YAW`) ou um giro no Editor.
- **Da para mexer sem tocar em codigo.** Os seis grupos tem nome estavel
  (`ToiletPSX`, `BathroomSinkPSX`, `MirrorCabinetPSX`, `TowelPSX`,
  `ShowerBoxPSX`, `LaundryBasketPSX`), entao o Editor identifica, move,
  gira e escala cada uma, e o que for salvo vale por cima dos numeros dos
  arquivos (ver `editor/README.md`). No painel de hierarquia elas aparecem
  como Privada, Pia do banheiro, Espelheira, Toalha, Box de chuveiro e
  Cesto de roupa (`editor/editor-registry.js`).
- **O comodo continua sem luz propria.** O BANHEIRO nao declara
  `ceilingLamps` nem `lightSwitches` (a COZINHA declara os dois), entao
  ele segue iluminado so pelo que entra pela porta e pela luz ambiente da
  casa - as seis pecas vao ler bem escuras ali dentro. Nao foi mexido de
  proposito: nao estava no pedido, e e uma linha de dados quando for a
  hora (ver o `ceilingLamps` da COZINHA em `scenes/house-config.js`).


## A REFORMA DO BANHEIRO: comodo menor, teto mais baixo, azulejo e tapete

Quatro pedidos do jogador numa passada, todos no BANHEIRO e SO nele.
Nenhum sistema novo entrou: as quatro coisas sao DADO em
`HouseConfig.sideRooms` (`scenes/house-config.js`), do mesmo jeito que a
COZINHA ja fazia - por isso CORREDOR, MEU QUARTO, QUARTO 01, QUARTO 02 e
COZINHA nao mudaram um pixel.

- **O comodo diminuiu, e a caixa antiga nao foi tocada** (`partitions`,
  campo NOVO, e o bloco "Divisorias internas" em
  `scenes/side-room-scene.js`). O traco a mao na imagem do Editor foi lido
  de volta para as coordenadas do comodo e virou uma linha de TRES
  trechos: desce da parede de entrada em `x = +2.5`, atravessa o comodo em
  `z = -2.35` e sobe ate a parede do fundo em `x = -0.3`. Cada trecho
  comeca e termina em outra parede, entao a linha fecha de parede a parede
  sem ponta solta: o retangulo de 7.7 x 4.8 (37 m2, mais salao que
  banheiro) virou um L de ~23 m2. Mesma filosofia do teto rebaixado da
  cozinha: `length`, `depth`, pe-direito, vao da porta, fachada, telhado e
  os retangulos que mantem grama/arvores/nevoa fora da casa seguem TODOS
  com os mesmos numeros - as paredes novas sao uma camada por dentro, e o
  espaco que sobrou atras delas fica lacrado (a divisoria sobe ate 4.2, o
  forro tampa por cima). Cada uma e um plano de face dupla como as quatro
  paredes do comodo, com colisao propria (`PARTITION_COLLISION`), e a
  escala do azulejo nelas sai do U da PROPRIA malha (`scaleGeometryU`):
  zero textura nova, zero material novo.
- **Teto mais baixo, sem mexer no teto que existia** (`loweredCeiling:
  { height: 2.6 }`). E o MESMO campo da COZINHA, e era o pedido literal
  ("ao invez de modificar o teto que ja existe, apenas crie uma nova
  camada de teto"): o teto de 4.2 continua onde estava e um SEGUNDO teto
  nasce por baixo. 2.6 e 5 cm mais baixo que o da cozinha porque banheiro
  e o comodo mais baixo de uma casa de verdade - sobram 60 cm acima do box
  de chuveiro e 1 m acima da cabeca do jogador.
- **Azulejo florido nas paredes, so do banheiro** (`wallStyle:
  "azulejo-banheiro"`, `createBathroomTileWallTexture` em
  `materials/textures.js`, `bathroomWallLong/Short` em
  `materials/material-library.js`). Redesenhado do zero em canvas a partir
  da referencia, como toda textura do jogo (nunca um decalque da imagem):
  azulejo quase branco do chao ate 1.84 m com uma florzinha salmao e duas
  folhinhas verdes em CADA peca - o que diferencia esta parede do azulejo
  da cozinha, onde o motivo aparece so numa fiada - rejunte afundado no
  normal map, friso de arremate saliente e pintura bege gasta acima, com
  manchas e escorridos de umidade. `roughnessMap` para a ceramica
  esmaltada e a cal fosca nao brilharem igual.
- **Tapete de banho em frente a pia** (`rugs` com o campo NOVO `style:
  "banho"`, `createBathMatTexture` em `materials/textures.js`). O
  retangulo vermelho da imagem, lido de volta para o comodo, deu 1.5 x 0.9
  centrado em `x = -1.0, z = -1.0`, logo a frente da pia (que o Editor ja
  havia movido para a parede de entrada). Mesma `CarpetFactory` dos outros
  tres tapetes do jogo, so com um par de materiais proprio e SEM franja -
  tapete de banho nao tem. Tecido escuro cinza-arroxeado em blocos de
  2 px, fiel a imagem. Como os outros, nao entra na colisao: o unico
  efeito de jogo e o som do passo virar "tapete".

## A VARANDA DA ENTRADA (atualização de design externo)

Feita a partir da imagem de referência da parte FRONTAL da casa. Quatro
peças novas, todas do lado de fora da parede de `ENTRADA & SAÍDA`: um
**piso de varanda** avançando 2.6 m da fachada, um **muro** cercando esse
piso com um vão no meio alinhado com a porta, **seis pilares** que sobem
do piso ao teto e um **tapete vermelho de boas-vindas** em frente à
porta. Arquivo novo: `models/porch-factory.js`.

- **O interior não mudou um pixel.** Toda a geometria nasce em
  `z <= frontZ` (a face externa da parede de entrada), e isso não é um
  *eu conferi*: a fábrica tem uma **trava** que percorre todos os
  vértices no fim da montagem e, se algum estiver do lado de dentro,
  empurra ele de volta para a linha da fachada e avisa no console -
  mesma ideia do `guardRooms` do telhado.
- **Nenhuma medida escrita na mão.** A planta é derivada de
  `CorridorConfig` (largura, comprimento, pé-direito), do `CLADDING_GAP`
  da fachada e do `LIFT` do telhado. A laje de cobertura nasce 55 cm
  ABAIXO da linha do beiral - mais que a peça mais baixa que pendura do
  telhado naquele canto (0.33) -, então sobra ar entre as duas
  construções por construção. O que dá para ajustar (profundidade,
  altura do muro, largura do vão, tamanho do tapete) é dado puro em
  `porch`, em `scenes/corridor-config.js`.
- **O piso fica 20 cm acima da grama, e isso é técnico.** O caminho de
  terra da porta (`models/dirt-path-factory.js`) sobe até 16 cm no eixo
  dele e passa POR BAIXO da varanda: com a laje em 20 cm, a terra corre
  inteira dentro da caixa fechada do piso (invisível, sem um triângulo
  furando a varanda) e reaparece na frente dela. **A estrada não mudou
  em nada.** E a própria face de 20 cm da laje é o degrau da varanda.
- **Nem grama, nem árvore, nem névoa dentro da varanda.** O retângulo
  dela entra em `exclusions` do gramado, da floresta e da neblina da
  `janela-entrada-saida`, pelo mesmo caminho dos quatro cômodos novos:
  nada é removido depois nem testado por quadro, as instâncias dentro
  dela **nunca chegam a ser sorteadas**.
- **Quase nenhum material novo.** A telha da laje é a MESMA do telhado
  (`roofShingle`), o madeiramento (vigas, testeira, rufo, beiras e o
  forro que se vê de baixo) o MESMO dos arremates dele (`roofTrim`) e a
  alvenaria é a MESMA receita de reboco da fachada, só numa versão que
  ladrilha nos dois sentidos (`createPorchPlasterTexture`) - a da
  fachada não serve porque tem a faixa de mofo ancorada no rodapé e não
  fecha na vertical. UV medido em METROS, então o pixel do reboco tem o
  mesmo tamanho no piso deitado, no muro de 88 cm e no pilar de 3 m.
- **O tapete.** Caixa rasa de 1.2 cm (a mesma receita dos tapetes da
  cozinha e do banheiro, e pelo mesmo motivo: acaba com qualquer empate
  de profundidade contra o piso, sem `polygonOffset`). A palavra
  BEM-VINDO é pintada na textura, em canvas 128x64 - as duas potências
  de 2 e a mesma proporção 2:1 do tapete no mundo, para o pixel sair
  quadrado e a palavra não esticar.
- **Custo: quatro draw calls.** Alvenaria, telha, madeiramento e tapete,
  cada um uma malha única com a geometria acumulada. Nada se move,
  `matrixAutoUpdate = false` em tudo, zero trabalho de CPU por quadro.
- **Colisão.** Muro e pilares viram sólidos; o piso não (em X/Z ele
  seria uma parede no meio da varanda). Hoje é prevenção - a porta
  `ENTRADA & SAÍDA` continua bloqueada pela história -, mas no dia em
  que ela abrir a varanda já não é atravessável.
- **Noite e dia.** Mesmo contrato de tudo que vive lá fora
  (`setDaytime` / `setMorning`): a varanda amanhece junto com a grama, a
  estrada, a mata e a fachada, e o Editor continua podendo voltar para a
  noite.
- **O que NÃO mudou:** interior de nenhum cômodo, telhado, móveis,
  controles, HUD, interações, cutscenes, objetivos, iluminação interna e
  a estética PSX.

## CORREÇÕES DA VARANDA (piso, muro e tapete)

Três problemas relatados com print: o tapete flutuando, as quinas do muro
piscando e o muro parando na largura do corredor. Os dois primeiros tinham
a MESMA raiz.

- **A raiz do tapete flutuando: a ordem dos vértices das caixas.** Todas as
  caixas de `models/porch-factory.js` (piso, muro, pingadeira, pilares,
  vigas) nasciam com a normal apontando para DENTRO. No telhado isso nunca
  apareceu porque `roofShingle`/`roofTrim` são `DoubleSide` — o three.js
  vira a normal na face de trás —, mas a alvenaria da varanda é
  `FrontSide` de propósito (caixas fechadas, metade do custo de
  rasterização). Resultado: **toda face virada para a câmera era
  descartada** e a varanda inteira desaparecia vista de fora. Como o topo
  da laje também sumia, por cima dela aparecia o **caminho de terra que
  passa por baixo** — e o tapete, que é uma malha separada (`BoxGeometry`,
  ordem correta), ficava desenhado sozinho a 20 cm do chão. Ele nunca
  esteve na altura errada: faltava o piso embaixo dele. Corrigido em
  `face()`, dentro do acumulador da fábrica; o tapete continua sendo a
  mesma lâmina de 1.2 cm, 3 mm acima do piso.
  > Nota: `models/roof-factory.js` tem a mesma ordem invertida, mas lá os
  > materiais são `DoubleSide`, então o telhado aparece; só a iluminação
  > dele é que se beneficiaria da mesma correção. Não foi mexido nesta
  > rodada para não alterar o visual do telhado sem pedido.
- **As quinas piscando eram geometria repetida, não material nem luz.** Na
  quina, muro lateral, muro da frente e pilar ocupavam o MESMO pedaço de
  espaço com as faces de fora no MESMO plano, e as pingadeiras de dois
  trechos vizinhos se cruzavam com o topo no mesmo plano. Duas superfícies
  opacas empatadas em profundidade é a única coisa que a GPU não tem como
  resolver: o pixel sorteia uma delas a cada quadro. Agora **são os
  pilares que recortam o muro** (cada trecho começa e termina na face de
  um pilar) e **a pingadeira só cresce na perpendicular do muro**, nunca
  nas pontas. Regra da varanda inteira: duas peças ou se encostam (faces
  coladas viradas para lados opostos, e o three.js descarta a de trás) ou
  uma morre dentro da outra. Zero pares de faces coplanares sobrepostas.
- **O muro segue nas duas alas da casa.** Ele não para mais na quina da
  varanda: de cada lado nascem duas pernas — uma correndo na linha da
  frente da varanda até a face externa da ala, outra voltando dali até a
  parede frontal dela —, fechando o quintal da frente com a mesma
  pingadeira e o **mesmo nível de topo** do muro da varanda (a linha de
  cima corre reta em volta da casa). A diferença é o pé: o da varanda
  nasce no piso dela, o das alas na grama, descendo 6 cm abaixo de zero
  para não abrir fresta nem empatar com o chão externo. Nenhuma medida
  escrita na mão: as alas são **derivadas** de
  `SideRoomScene.footprints()` (a cena passa em `options.wings`), então
  mudar o tamanho de um cômodo move o muro junto. `porch.extendToWings:
  false` em `scenes/corridor-config.js` volta ao muro só da varanda.
- **A trava anti-invasão agora trabalha por faixas de X.** A linha que a
  varanda não pode cruzar deixou de ser um número único: na frente do
  corredor continua sendo a fachada da `ENTRADA & SAÍDA`, mas na frente de
  cada ala é a parede frontal DAQUELA ala, vários metros atrás. Sem isso,
  a própria trava achataria as pernas novas contra a fachada.
- **Colisão e vista externa acompanham.** As pernas novas entram na mesma
  lista de sólidos do muro da varanda, e uma faixa de 35 cm em volta de
  cada uma entra em `exclusions` do gramado, da mata e da névoa — só a
  faixa do muro, não o quintal inteiro: dentro dele a grama continua
  nascendo.
- **O que NÃO mudou:** interior de nenhum cômodo, telhado, móveis,
  controles, HUD, interações, cutscenes, objetivos, iluminação interna,
  o caminho de terra e a estética PSX. Continua tudo em quatro malhas.

## A GRAMA ALTA DO TERRENO (atualizacao do gramado)

Pedido do jogador: a grama alta do lado de fora estava espalhada em pouca
quantidade, so tufos isolados em cima de um chao texturizado. Agora TODO o
chao de grama solido esta coberto por uma grama nova, na altura do joelho
do personagem, num verde bem mais escuro.

- **Os tufos antigos sairam de cena.** Nenhuma instancia de
  `assets/models/grass_psx.glb` e criada em lugar nenhum, e o arquivo nao e
  mais carregado (ele continua na pasta `assets/models`, apenas sem uso).
  Eram ~90 tufos por janela, um a cada ~30 m2 - era dai que vinha o chao
  pelado entre uma moita e outra.
- **Grama nova, feita por codigo.** Cada moita e um punhado de laminas
  (9 perto, 6 no meio, 5 no fundo) que afinam na ponta e abrem em leque,
  com cor por vertice: base escura, ponta mais clara e uma lamina em cada
  oito seca/amarelada. Nao ha textura nenhuma nela. Por que nao continuar
  com o tufo importado: cobrir o terreno com ele custaria ~2,5 MILHOES de
  triangulos por janela - inviavel em celular.
- **Cobertura total.** ~1500 a 1700 moitas por janela, uma a cada ~40 cm
  nos primeiros 9 metros (3 a 5 moitas por m2), e o passo da grade e sempre
  menor que a copa da moita, entao elas se sobrepoem: nao existe celula
  vazia lendo como chao pelado. A grama vai da parede (a ~14 cm dela, o
  minimo que a geometria permite sem furar a casa) ate a borda do terreno.
- **Altura de joelho.** 0.40 a 0.54 m perto da casa - a camera do jogador
  fica em 1.6 m (`eyeHeight`), o que da um personagem de ~1.72 m e um
  joelho a ~0.46 m. As moitas do fundo crescem de leve (ate 1 m), o truque
  de sempre para a cobertura chegar longe sem multiplicar instancia.
- **Verde mais escuro.** As laminas leem em media ~rgb(37, 52, 23), contra
  ~rgb(68, 74, 30) do gramado antigo. O chao solido embaixo escureceu
  junto (`GRASS_DARK_TINT` em `materials/material-library.js`, aplicado nos
  materiais de noite e de dia): sem isso o oliva claro dele apareceria nas
  frestas e voltaria o efeito de grama pintada em cima de um tapete claro.
- **Nada de grama onde nao pode.** Tres regras duras, todas por construcao
  (nenhuma remocao depois, nenhum teste por quadro), e todas usando o
  alcance REAL da moita medido nos vertices da geometria vezes a escala
  sorteada: (1) dentro da casa - o campo e ancorado na parede com o +Z
  local para fora e nenhuma instancia nasce sem caber inteira do lado de
  fora, entao nao ha grama no corredor, em MEU QUARTO nem atravessando
  parede/porta/piso; (2) dentro dos quatro comodos novos e da varanda -
  entram como retangulos de exclusao, e embaixo da casa quem aparece
  continua sendo o chao de grama solido de sempre; (3) sobre a estrada de
  terra da porta ENTRADA & SAIDA - nenhuma moita e sorteada dentro do
  desenho da pista, nem com a ponta de uma lamina por cima dela.
- **Mais barato que antes.** ~28 a 36 mil triangulos por janela de dia e
  ~17 a 24 mil de noite (o gramado esparso antigo custava ~73 mil de dia),
  em 7 draw calls de dia e 3 de noite, com zero custo por quadro
  (`matrixAutoUpdate` desligado, nenhuma animacao). Geometria e materiais
  sao criados uma vez e compartilhados pelas tres janelas.
- **Noite, dia e Editor intactos.** O campo continua expondo
  `setDaytime`/`setMorning` e entrando na mesma lista `exteriorGrounds` das
  cenas, entao amanhece junto com o chao, a estrada, a mata e a fachada.
  Nenhuma mudanca de contrato: as cenas chamam `createGrassField` do mesmo
  jeito.


## O que já está implementado

- PAREDE DO CORREDOR: textura nova, feita a partir da imagem de
  referência enviada pelo jogador — reboco caqui/oliva desbotado na parte
  de cima, um TRILHO de madeira escura, o LAMBRI VERDE pintado embaixo
  dele e o RODAPÉ de madeira rente ao chão
  (`createCorridorWainscotWallTexture` em `materials/textures.js`). Como
  todas as outras, é gerada proceduralmente em `<canvas>`, na estética
  PS1/PSX do resto do jogo: nenhum arquivo de imagem novo entrou no
  projeto, o padrão é redesenhado do zero a partir das cores medidas na
  referência (reboco 143,130,94 · lambri 77,87,50 · os dois perfis de
  madeira degrau por degrau) — inspirado na imagem, nunca um decalque
  dela. SÓ O CORREDOR muda: MEU QUARTO, QUARTO 01, QUARTO 02 e BANHEIRO
  seguem com o lambri claro (`createPsxWallPanelTexture`), a COZINHA com
  o azulejo (`createKitchenTileWallTexture`), a fachada com o reboco
  mofado e o piso/teto de madeira do corredor não mudaram um pixel. O
  reboco liso e cinzento de antes (`createOldPlasterWallTexture`)
  continua no arquivo, mas nenhuma parede aponta mais para ele.
  Detalhes que valem a nota:
  1. **As alturas são de parede de verdade, não as frações cruas da
     foto.** Trilho de 1.34 m a 1.50 m, lambri de 0.22 m a 1.34 m,
     rodapé nos primeiros 22 cm. Esticada nos 4.2 m de pé-direito do
     corredor, a referência (que é um recorte) poria o trilho em 1.82 m —
     acima da linha dos olhos do jogador, que fica em 1.6 — e um rodapé
     de 42 cm. Calibrar é o mesmo caminho que o azulejo da cozinha já
     seguiu, e mantém a proporção que a imagem realmente mostra: o verde
     ocupando o terço de baixo da parede.
  2. **Resolução 256, o dobro das outras paredes.** Aqui a composição é
     vertical e os dois perfis de madeira têm 6 e 8 degraus de tom cada
     um; em 128 o trilho inteiro teria 5 pixels de altura e o perfil
     desapareceria. Continua gerada uma única vez, no carregamento, e
     continua `NearestFilter` sem mipmap como o resto do jogo.
  3. **Não repete na vertical, de propósito** (`repeatY = 1`): o desenho
     tem topo e base, então com `repeatY = 2` sairiam dois trilhos e dois
     rodapés empilhados no meio da parede. Em X fecha sem costura, e o
     `repeat` horizontal passou a ser largura/pé-direito (a mesma regra
     da fachada), o que deixa o texel quadrado: o pixel da parede tem o
     mesmo tamanho em metros na parede de 22 metros e nas de 6.
  4. **Ganhou `roughnessMap`.** A cal de cima continua nos mesmos 0.95 de
     rugosidade de sempre, a tinta a óleo do lambri reflete a luminária
     um pouco mais (0.75) e a madeira fica no meio — é essa diferença que
     faz o verde ler como pintura lavável e o caqui como cal, sob a mesma
     luz fraca. O `normalMap` também é novo: trilho e rodapé são
     salientes, com sombra logo abaixo de cada um, e as juntas escuras
     entram como sulcos.
  5. **O que quebra a repetição.** O tom não é chapado: são cinco manchas
     amplas, quarenta manchas médias sobrepostas e dezesseis borrões
     alongados de esfregão, mais fissuras finas, riscos diagonais de
     arraste, encardido na junta com o teto e escorridos verticais no
     verde (uns poucos claros pingando de baixo do trilho, como na
     referência). Remendos descascados existem, mas só três e pequenos:
     manchas claras e grandes viram bolhas que denunciam o ladrilho se
     repetindo a cada 4.2 metros de corredor.
- FACHADA da casa: as faces de FORA das paredes agora têm textura
  própria — reboco velho e sujo com uma faixa de MOFO subindo do chão em
  línguas irregulares, fiel à referência enviada pelo jogador e gerada
  proceduralmente na estética PS1/PSX do resto do jogo
  (`createExteriorPlasterWallTexture` em `materials/textures.js`, nenhum
  arquivo de imagem novo). Motivo: as paredes do jogo são planos de
  espessura zero e `DoubleSide`, então o lado de fora da casa mostrava a
  mesma textura de dentro vista pelas costas (o reboco do corredor, o
  lambri dos quartos). Cada parede externa ganhou um REVESTIMENTO: uma
  malha nova com a mesma geometria da parede (inclusive os vãos de
  janela/porta já recortados), 2 cm para fora e visível só pelo lado de
  fora (`side: THREE.BackSide`) — `createWallCladding` em
  `models/exterior-factory.js`, aplicado pelos blocos de revestimento
  externo de `scenes/corridor-scene.js`, `scenes/room-scene.js` e
  `scenes/side-room-scene.js`. NADA do interior mudou: o reboco do
  corredor e o lambri do MEU QUARTO e dos quatro cômodos continuam
  exatamente como estavam, nos mesmos planos. Só as paredes que dão para
  o terreno são revestidas — as divisórias entre cômodos (a parede
  compartilhada corredor/quarto e as paredes de entrada dos cômodos)
  ficam de fora. A textura não repete na vertical de propósito (o mofo
  mora no rodapé dela) e o `repeat` horizontal é sempre
  largura/pé-direito, então o pixel da fachada tem o mesmo tamanho em
  metros numa parede de 22 metros e numa de 4.8. Tem par noite/dia como
  a grama e o telhado, e a virada da manhã da história agora acende a
  casa TODA de uma vez (`world.setDaytime` + `roof.setDaytime` via o novo
  `onMorning` de `cutscenes/sleep-sequence.js`) — antes o telhado e os
  quatro cômodos ficavam na paleta de noite depois de dormir.
- Neblina volumétrica do cenário exterior (`models/fog-volume-factory.js`),
  visível pelas três janelas do jogo. Não é filtro de tela nem plano
  colado na câmera: são cinco fatias horizontais de névoa com absorção
  de Beer-Lambert por ângulo de visão (é o que faz um plano ler como
  volume) mais uma malha única com ~94 tufos que encaram a câmera,
  todos geometria de verdade plantada no mundo, entrando no teste de
  profundidade com o chão, a grama e os troncos — a névoa fica atrás de
  uma árvore e na frente da seguinte. A densidade cresce com a
  distância até a janela (véu a 8-12 m, silhuetas a 20 m, floresta
  sumindo a 26 m), o que também esconde a borda do cenário externo. O
  movimento é todo derivado do tempo dentro do shader — arrasto de 3 a
  8 cm/s por fatia em direções divergentes, domain warping e órbitas de
  Lissajous de 150 a 480 s nos tufos — então o `update()` por quadro
  escreve um único float e nada mais. Cor e densidade saem da paleta de
  `scripts/atmosphere.js` (noite/dia), e a parede sólida da casa oculta
  tudo: não existe um vértice de névoa do lado de dentro. 6 draw calls
  por janela, ~200 triângulos, dithering ordenado 4x4 e quantização de
  5 bits por canal para casar com a estética PSX. Ver o comentário
  grande no topo do próprio arquivo.

- Tela cheia automática ao iniciar: o jogo tenta entrar em
  Fullscreen sozinho assim que carrega, sem exigir nenhuma ação
  manual do jogador, em navegadores, WebView, build Android (APK)
  e build Windows (EXE). Quando a plataforma exige um gesto do
  usuário antes de liberar tela cheia (regra comum de segurança dos
  navegadores), o pedido acontece "de carona" no primeiro toque que
  o jogador já ia dar de qualquer forma (ex.: o "Toque para iniciar"
  da cutscene) — nenhuma tela ou botão extra aparece pra isso. Se o
  sistema sair da tela cheia por conta própria (ex.: Esc/F11 no
  desktop), o próximo toque tenta reengajar sozinho
  (`scripts/fullscreen-manager.js`). Em ambientes onde a Fullscreen
  API de JavaScript não existe de verdade (Safari no iOS fora do
  modo "adicionado à Tela de Início"), as meta tags de web app no
  `index.html` e o `manifest.webmanifest` (`display: "fullscreen"`)
  garantem o mesmo resultado quando o jogo é aberto a partir da Tela
  de Início. Em qualquer caso, o layout em 16:9 com letterbox (ver
  abaixo) já ocupa 100% da área disponível, com ou sem tela cheia
  real.
- Menu principal: primeira tela exibida ao abrir o jogo, antes de
  qualquer cutscene, diálogo ou gameplay (`menu/menu.js`,
  `menu/menu.css`). Vídeo de fundo em loop contínuo: dois `<video>`
  com a mesma fonte se alternam, e pouco antes do vídeo em exibição
  terminar o outro já começa a tocar do início por baixo, com um
  crossfade curto de opacidade disfarçando o corte entre o fim e o
  começo (loop discreto, sem salto brusco). Quatro botões (NOVO
  JOGO, CONTINUAR, CONFIGURAÇÕES, FECHAR JOGO) usam diretamente as
  imagens fornecidas como referência (`assets/menu/`), como
  elementos realmente clicáveis/tocáveis, posicionados e
  espaçados seguindo a composição de referência enviada. Só "NOVO
  JOGO" tem ação: encerra o menu (com fade) e dispara o fluxo de
  sempre — a Cutscene de introdução seguida da gameplay (ver
  abaixo) — exatamente como funcionava antes do menu existir. Os
  outros três botões respondem ao toque visualmente (mesmo destaque
  discreto do botão "Interagir" do HUD) mas ainda não têm ação
  própria, de propósito.
- Tela de Configurações: aberta a partir do botão "CONFIGURAÇÕES" do
  menu principal (`menu/settings.js`, `menu/settings.css`). Abre
  DENTRO do mesmo quadro/vídeo de fundo do menu principal (os botões
  do menu somem com um fade curto e o painel aparece no lugar, sem o
  vídeo parar ou reiniciar o loop) — mesma fonte, cores e atmosfera
  do resto da interface. Três seções:
  - **Áudio**: dois sliders independentes, Música e Efeitos sonoros.
    O slider de Efeitos sonoros já controla o volume do som de passos,
    dos sons da ligação telefônica e do som das cortinas (ver bullets
    dedicados abaixo); Música ainda não tem nenhum som
    associado. Os dois volumes ficam salvos em
    `scripts/game-settings.js`, lidos ao vivo por quem precisar.
  - **Sensibilidade**: um slider para a velocidade da câmera em
    primeira pessoa, aplicado ao vivo em
    `scripts/player-controller.js`. Na posição padrão do slider, a
    sensibilidade é idêntica à que o jogo sempre teve.
  - **Idioma**: alternância entre Português-BR (padrão) e English. A
    escolha já fica salva e selecionável, mas nenhum texto do jogo é
    traduzido ainda nesta atualização (de propósito) — a base fica
    pronta para quando a tradução for adicionada.
  Todas as escolhas são salvas em `localStorage` e continuam valendo
  entre sessões do jogo.
- Ao tocar em "NOVO JOGO", a cutscene de abertura na estrada (Parte 1 seguida
  imediatamente da Parte 2) toca automaticamente em tela cheia
  (qualidade visual praticamente idêntica ao original, áudio
  sincronizado, corte instantâneo entre as duas partes) e, ao
  terminar, a gameplay do corredor carrega na hora, sem tela
  intermediária. Nenhum quadro/placeholder do vídeo aparece antes da
  reprodução começar. Um toque na tela revela um botão discreto
  "PULAR" (some sozinho depois de alguns segundos), que encerra a
  cutscene inteira na hora e vai direto pra gameplay — funciona em
  qualquer parte da sequência. Detalhes técnicos dos vídeos em
  `assets/videos/README.md`.
- Mini cutscene de entrada: assim que o vídeo de introdução termina,
  o jogador já nasce no lugar certo (em frente à porta "ENTRADA &
  SAÍDA"), mas o controle não é entregue na hora. A câmera começa
  olhando para o chão, sem HUD e sem controles, e sobe sozinha e
  suavemente ao longo de ~5s até a visão normal em primeira pessoa
  (representando o personagem recuperando a consciência). Em
  seguida, Kael fala duas falas curtas, digitadas aos poucos numa
  fonte pixelada própria (nome em amarelo, fala em branco — ver
  `dialogue/`), avançando com um toque por vez. Só depois da segunda
  fala o HUD reaparece e o jogador recupera o controle completo
  (`cutscenes/entry-sequence.js`).
- Gameplay em primeira pessoa pura (câmera = jogador, nenhuma parte
  do corpo é renderizada).
- Respiração / head bob sutis na câmera, para a visão em primeira
  pessoa nunca ficar completamente estática: parado, um pequeníssimo
  sobe-desce contínuo (respiração); andando, um balanço um pouco mais
  perceptível, sincronizado com a distância de fato percorrida pelo
  personagem (não só com o tempo — se travar contra uma parede, o
  balanço também para). A transição entre os dois estados é sempre
  suave, nunca abrupta. Não altera o FOV nem interfere na mira, no
  movimento ou no Motion Blur (`scripts/player-controller.js`).
- Som de passos do player, primeiro efeito sonoro do jogo (ver
  `audio/README.md` e `audio/footstep-audio.js`): sintetizado por
  código (Web Audio API — sem arquivo de som nenhum), com um som mais
  seco/estalado no piso de madeira (corredor e quarto) e outro mais
  leve/abafado sobre qualquer um dos dois tapetes (o runner central do
  corredor e o tapete circular do quarto). A superfície embaixo do
  jogador é detectada automaticamente a cada quadro, sem exigir botão
  (`getSurfaceAt()` em `scenes/corridor-scene.js`/`scenes/room-scene.js`),
  e o ritmo de cada passo é sincronizado com o mesmo relógio de fase do
  head bob acima (`walkPhase`) — por isso já para sozinho assim que o
  jogador para, trava contra uma parede, ou entra numa cutscene/diálogo
  que bloqueia o movimento, sem precisar de nenhuma lógica própria para
  isso. Volume controlado pelo slider "Efeitos sonoros" da tela de
  Configurações.
- Som das cortinas das janelas, terceiro efeito sonoro do jogo (ver
  `audio/README.md` e `audio/curtain-audio.js`): gravação real
  recortada do áudio de referência do dev (`audio/cortinas/cortina.wav`,
  ~0,68s), usada tanto para abrir quanto para fechar, com variação
  aleatória estreita de afinação/volume a cada toque para não soar
  repetitiva. O disparo mora dentro do `toggleCurtain()` de
  `models/window-factory.js`, o mesmo ponto em que a animação (0.8s)
  passa a rodar — sem nenhum atraso programado no meio, então
  interação, movimento do tecido e som saem juntos nos dois sentidos.
  Como todas as janelas saem da mesma fábrica, vale igual para as três
  cortinas do jogo (as duas do corredor e a do quarto). O som é
  posicionado em relação à câmera (lado + leve queda de volume por
  distância), para parecer vir da janela que está sendo manipulada, e
  fica num volume discreto, sob o slider "Efeitos sonoros".
- Formato 16:9 com letterbox automático em qualquer proporção de tela.
- Analógico virtual discreto (canto inferior esquerdo) para movimento,
  sem eixos invertidos.
- Área de câmera na metade direita da tela, arrastar para olhar ao redor,
  sem eixos invertidos.
- Botão "Interagir": abre/fecha a cortina das janelas quando o jogador
  está por perto; inventário com 4 slots vazios (ainda sem uso).
- Corredor com as 6 portas pedidas, cada uma com sua placa.
- Mira central discreta (pontinho no meio da tela) e sistema único de
  interação: o contorno branco só aparece no objeto que estiver
  realmente sob a mira e dentro do alcance — nunca em mais de um ao
  mesmo tempo, mesmo com vários objetos próximos (ex.: gaveta e
  telefone na mesma escrivaninha). O contorno é fino e segue a
  silhueta real de cada objeto (não uma caixa em volta dele) —
  sistema único e reutilizável (`models/outline-factory.js`), já
  usado por portas, janelas, gaveta, telefone e pronto para qualquer
  objeto interativo futuro (nas portas o destaque ainda é só visual —
  nenhuma porta abre ainda).
- Iluminação fraca com uma única luminária de teto, névoa escura e
  filtro visual retrô (resolução interna baixa + scanlines + vinheta).
- Motion Blur sutil de câmera: ativa só enquanto o jogador está
  girando a visão, crescendo com a velocidade da rotação e
  desaparecendo rápido e suave assim que a câmera para. Bem discreto
  de propósito (só reforça a sensação de movimento, sem perder
  nitidez do cenário) e leve o bastante para celular — um único passe
  extra de composição, na mesma resolução interna baixa do resto do
  jogo (`effects/motion-blur.js`).
- Poeira suspensa no ar em TODOS os cômodos internos (CORREDOR, MEU
  QUARTO, QUARTO 01, QUARTO 02, COZINHA e BANHEIRO): partículas
  minúsculas (1 a 2 pixels da resolução interna), derivando devagar
  (4 a 11 cm/s) num movimento irregular, sem trajetória reta e sem
  parar nunca — o ar dos ambientes continua vivo mesmo com o jogador
  imóvel. O brilho de cada partícula vem da luz que existe ali (elas
  não emitem nada): aparecem mais no cone das luminárias, piscam com
  elas, somem junto com o abajur e ficam apenas insinuadas nos cômodos
  escuros. Cada ambiente tem seu próprio volume de poeira, recuado das
  paredes, então nada atravessa parede, porta ou fachada. Leve para
  celular de propósito: ~167 partículas em 6 draw calls, todo o
  movimento no vertex shader e nenhum objeto 3D por partícula
  (`effects/dust-motes.js`).
- Luminária de teto com piscadas ocasionais e aleatórias (luz antiga
  com defeito) e pequenas moscas voando ao redor do bulbo.
- Três quadros decorativos nas paredes laterais, cada um com uma
  imagem diferente, espalhados em pontos distintos do corredor.
- Relógio de parede decorativo (modelo importado em .glb —
  assets/models/clockwall_psx.glb; ver models/clock-factory.js), na
  parede direita, no maior trecho de parede vazio do corredor (entre
  a porta BANHEIRO e a parede de ENTRADA & SAÍDA). Preso à parede,
  numa altura um pouco acima da dos quadros. Elemento puramente
  decorativo — sem interação, sem outline, sem animação — mesmo
  tratamento dado aos quadros e vasos de planta. Asset original "PSX
  Low-Poly Victorian Clock", por PSX Game Assets
  (https://sketchfab.com/PSXGameAssets), licença CC-BY-4.0; a
  geometria não foi alterada, só a textura foi reprocessada para o
  estilo PSX (ver comentário completo em models/clock-factory.js).
- Três janelas com moldura de madeira e cortina interativa — as duas
  do corredor (ao lado de MEU QUARTO e de ENTRADA & SAÍDA) mais a
  janela do próprio cenário "MEU QUARTO" (ver models/window-factory.js)
  — com vidro transparente, leve tingimento acinzentado e reflexos
  (models/window-glass-factory.js). Vista externa (chuva, relâmpago
  etc.) ainda não existe; o que existe do lado de fora do vidro, por
  enquanto, é só o chão de grama do bullet logo abaixo.
- Vista externa de grama através das três janelas acima
  (models/exterior-factory.js): cada parede que tem janela ganhou um
  vão retangular de verdade recortado nela — a moldura de madeira da
  própria janela cobre a borda do recorte por completo — revelando
  um chão de grama baixo-poligonagem (um único plano por janela),
  texturizado numa referência real de grama enviada pelo jogador
  (mesma técnica de canvas 2D + NearestFilter do resto das texturas
  do jogo, sem lâminas de grama individuais). Cada "remendo" de
  grama é bem maior que a distância em que a névoa escura da cena já
  esconde tudo (scene.fog em scripts/main.js), então o jogador nunca
  chega a perceber a borda dele, o fim do chão ou o vazio ao redor —
  a grama parece se estender por uma grande área. Reage à luz
  ambiente da cena normalmente, sem parecer um objeto emissivo. Só o
  chão por enquanto: sem céu, árvores, casas ou qualquer outro
  elemento externo ainda.
- Gramado ALTO cobrindo esse chao externo inteiro
  (models/grass-field-factory.js): ~1500 a 1700 moitas de grama por
  janela, na altura do JOELHO do personagem (0.40 a 0.54 m perto da
  casa, para uma camera de olhos a 1.6 m), uma a cada ~40 cm nos
  primeiros 9 metros e cobertura continua ate onde a nevoa fecha. As
  moitas sao construidas por codigo (laminas que afinam na ponta e
  abrem em leque, cor por vertice: base escura, ponta mais clara, uma
  lamina em cada oito seca/amarelada) - o tufo importado
  assets/models/grass_psx.glb NAO e mais usado, porque cobrir 60 x 60
  metros com ele custaria ~2,5 milhoes de triangulos por janela. Cada
  moita entra com posicao, rotacao, altura e largura sorteadas, em
  grade chacoalhada com semente fixa por janela - nada de linhas retas,
  e o mesmo gramado toda vez que a cena e remontada. Desenho em
  THREE.InstancedMesh: 7 draw calls por janela de dia e 3 de noite, com
  tres niveis de detalhe por distancia e os dois aneis do fundo ligados
  so de dia (de noite a nevoa preta cobre tudo alem de 13 unidades).
  Custo total: ~28 a 36 mil triangulos por janela, menos da METADE do
  gramado esparso antigo (~73 mil), e zero custo por quadro. Nenhuma
  moita atravessa parede, porta ou piso: o campo e ancorado na parede
  com o eixo +Z apontando para fora e toda instancia precisa caber
  inteira (alcance medido na geometria x escala + folga) do lado de
  fora - dentro da casa nao existe uma unica instancia. Nada de grama
  dentro dos comodos, dentro da varanda nem sobre a estrada de terra
  (ver a secao A GRAMA ALTA DO TERRENO). Mesma geometria de noite e de
  dia; so o material troca no amanhecer, junto com o chao (nada de
  material emissivo brilhando no escuro).
- Caminho de terra saindo da porta "ENTRADA & SAÍDA"
  (models/dirt-path-factory.js): estrada longa que leva até a casa, quinta
  camada da vista externa, integrada ao terreno, gramado, floresta e
  neblina existentes. A leitura final é: casa -> porta -> terra limpa ->
  pedrinhas nas laterais -> grama -> árvores densas dos dois lados ->
  neblina -> caminho desaparecendo na mata.
  - Começa exatamente em frente à porta, sai reto no primeiro trecho e
    segue por 58 metros, com uma curva suave que ajuda a estrada a sumir
    entre os troncos. A câmera enxerga 50 metros e a névoa fecha antes
    disso, então não há ponta ou borda artificial visível.
  - A pista fica limpa por construção: o gramado e a floresta recebem o
    desenho da estrada e não sorteiam instâncias dentro dela. Não há grama
    nem árvores no centro do caminho. Os troncos mantêm afastamento mínimo
    de 1,3 m, enquanto as copas podem se aproximar sem bloquear a passagem.
  - A floresta não foi removida em faixa reta: as quatro faixas continuam
    dos dois lados e a abertura acompanha a curva da estrada.
  - Transição orgânica com a grama usando largura irregular, bordas
    chacoalhadas por vértice, variação de cor e tufos próximos às laterais.
  - Textura procedural PSX de terra batida com cascalho e sulcos, variação
    de cor por vértice, relevo de aproximadamente ±5 cm e barriga central,
    sem buracos, degraus ou obstáculos.
  - Pedrinhas low-poly decorativas nas bordas, meio enterradas e fora do
    centro da pista.
  - Desempenho mobile: uma malha estática para a estrada e pedras em
    THREE.InstancedMesh. Nenhum sistema novo de carregamento e nenhum
    trabalho de CPU por quadro. A neblina existente não foi alterada.
- Floresta densa cercando a casa (models/tree-forest-factory.js): o
  pacote de pinheiros enviado pelo jogador
  (assets/models/arvores_psx.glb, carregado pelo mesmo
  THREE.GLTFLoader dos outros modelos importados) plantado em massa
  em cima do mesmo chao externo, do outro lado do gramado. A leitura
  final e a pedida: casa -> area aberta de grama -> floresta muito
  densa em todas as direcoes. Pontos principais:
  - Clareira: a borda da mata ondula entre ~8 e ~13,8 unidades de
    distancia da janela (duas senoides com fase sorteada por janela),
    entao a orla nao parece um arco desenhado com compasso; alem
    disso, uma segunda trava garante 6 metros de gramado livre ao
    longo de TODA a fachada, inclusive de esguelha. Nenhum galho
    encosta em parede, porta ou vidro.
  - Profundidade: quatro faixas concentricas (orla, mata, funda,
    horizonte) ate 27 unidades, cada uma mais espacada, mais alta
    (5,5-8 m na orla, 10-13 m no horizonte) e mais desbotada que a
    anterior - arvore na frente de arvore na frente de arvore, ate a
    mata se desfazer na bruma.
  - Variacao: sao TRES pinheiros diferentes no mesmo .glb, sorteados
    por instancia, cada um com rotacao livre, altura, largura e
    inclinacao proprias, em grade chacoalhada - nenhuma fileira reta,
    nenhuma copia na mesma pose.
  - Tres vistas diferentes: a semente e o id da janela, entao cada
    uma das tres janelas do jogo da para uma floresta propria (e
    sempre a mesma, toda vez que a cena e remontada).
  - Mobile: ~165 arvores por janela em THREE.InstancedMesh, ~19 mil
    triangulos e 12 draw calls de dia; de noite so a faixa da orla
    fica ligada (~35 arvores, 3 draw calls), ja que a nevoa preta
    cobre tudo alem de 13 unidades. Geometria e material sao criados
    uma vez e compartilhados pelas tres janelas.
  - Nenhuma arvore dentro da casa: mesma garantia matematica do
    gramado - o grupo e ancorado na parede com o +Z apontando para
    fora, e toda instancia precisa caber inteira (alcance real da
    variante x escala + folga) do lado de fora. Nao existe uma unica
    instancia com z negativo.
- Colisão nas paredes, portas e limites do corredor.
- Escrivaninha de madeira encostada na parede entre QUARTO - 01 e
  QUARTO - 02, com gaveta interativa (abre/fecha pelo botão
  "Interagir"). Por dentro ela e uma caixa de verdade (fundo,
  laterais e traseira, com as mesmas medidas externas de sempre) e
  guarda uma carta de papel levemente amassada, deitada sobre o
  fundo (malha procedural + textura, ver
  models/paper-note-factory.js). A carta e filha do grupo da gaveta,
  entao desliza junto com ela: some por completo com a gaveta
  fechada e aparece naturalmente quando ela abre. Por enquanto e so
  objeto visual: nenhuma leitura, dialogo, zoom ou objetivo ligado a
  ela. Sobre o tampo: um vaso de rosas
  (decorativo), uma pequena pilha de livros (decorativa, entre o
  vaso e o telefone — ver models/book-factory.js) e um telefone de
  mesa antigo com teclado numérico,
  fone apoiado na horizontal numa forquilha com fio espiralado
  (modelo importado em .glb — assets/models/old_telephone_psx.glb;
  interativo — o botão
  "Interagir" já reconhece quando a mira está nele, mas nenhuma
  mecânica está implementada ainda). Os três modelos originais
  (escrivaninha, vaso e telefone) estão num tamanho um pouco maior,
  para preencher melhor o espaço do corredor — a pilha de livros
  entrou depois, já calibrada nessa mesma escala.
- Tapete vermelho ("runner") centralizado no chão do corredor,
  acompanhando boa parte do seu comprimento, com uma margem visível
  até as paredes dos dois lados e até as portas de extremidade.
  Padrão ornamentado (borda escura, friso dourado, medalhões em
  losango repetidos) e leve desgaste, mesma técnica de textura
  procedural em `<canvas>` usada no resto do jogo — puramente
  decorativo, sem colisão nem interação (`models/carpet-factory.js`).
- Dois vasos de planta decorativos, encostados nas paredes do
  corredor em pontos bem afastados um do outro (paredes opostas,
  trechos diferentes do corredor), inspirados numa referência de
  vaso enviada pelo usuário: vaso de cerâmica envelhecida (pátina e
  leve escorrido mineral, mesma técnica de textura procedural em
  `<canvas>` do resto do jogo) com uma planta frondosa de folhas
  grandes, cada folha com sua própria haste e nervura central,
  distribuídas em leque com alturas e ângulos variados — e uma
  pequena variação aleatória a cada vaso, para os dois não saírem
  idênticos. Elemento puramente decorativo (sem interação), mas com
  um pequeno sólido de colisão no footprint do vaso para o jogador
  não atravessá-lo (`models/potted-plant-factory.js`).
- Interruptor de luz interativo na parede do corredor, perto do
  quadro-xadrez: placa plástica envelhecida (mas bem conservada), dois
  parafusos de fixação e uma alavanca que gira de verdade entre
  ligado/desligado ao ser acionada pelo botão "Interagir", com uma
  luzinha indicadora que acende fraca só quando a luz está apagada
  (ajuda a achar o interruptor no escuro). Entra na mesma lista única
  de interativos (contorno de destaque, alcance de interação — ver
  README acima), sem lógica própria separada. Controla a luminária de
  teto: desligado, a luz apaga por completo e o corredor fica
  significativamente mais escuro (o resto da iluminação — paredes,
  quadros, portas, móveis — reage normalmente, já que é a mesma
  PointLight de sempre sendo zerada); ligado, tudo volta ao estado
  original, inclusive as piscadas ocasionais da lâmpada, que continuam
  funcionando exatamente como antes (`models/switch-factory.js`,
  ligado a `models/lamp-factory.js` só por um `setPower(on)` bem
  pequeno — os dois módulos continuam independentes um do outro).
- Primeiro objetivo da história — "Interagir com o telefone": assim
  que a mini cutscene de entrada termina e a gameplay começa, o
  jogador pode explorar o corredor livremente, mas quase todos os
  objetos interativos respondem com uma fala curta de Kael no lugar
  da ação normal (porta "ENTRADA & SAÍDA", as quatro portas sem
  destino ainda definido, as janelas, a porta "MEU QUARTO" e a gaveta
  da escrivaninha — cada grupo com sua própria fala, digitada na
  mesma caixa de diálogo já usada na entrada). O interruptor de luz é
  a única exceção e continua funcionando normalmente; o telefone
  também não é bloqueado (é o próprio objetivo) e agora tem sua
  própria mecânica — ver bullet dedicado logo abaixo. O contorno de
  destaque continua aparecendo normalmente em
  qualquer objeto sob a mira, mesmo bloqueado — só o botão "Interagir"
  muda de comportamento. Enquanto cada fala de bloqueio está na tela,
  o HUD inteiro fica escondido e olhar/movimento ficam travados (ver
  regra geral em `dialogue/`, logo abaixo), voltando ao normal assim
  que ela é fechada. Sistema pensado para crescer com a história:
  cada etapa é um objetivo em `objectives/objective-config.js`
  (quais tipos de objeto ficam liberados + qual diálogo tocar em cada
  um bloqueado), interpretado por `objectives/objective-system.js` e
  aplicado em `scripts/main.js` — adicionar uma nova etapa no futuro
  não exige tocar no código dos objetos em si.
- Interação com o telefone (conclusão do primeiro objetivo): ao
  apertar "Interagir" com o telefone da escrivaninha em destaque, uma
  mini cutscene toca uma única vez — uma camada preta cobre a tela com
  um fade-in rápido (~0,9s) assim que a discagem começa a tocar, fica
  preta durante a discagem e o toque (tempo ditado pela duração real
  do áudio, não por um número fixo no código) e faz o fade-out de
  volta ao normal assim que a ligação é atendida
  (`cutscenes/phone-sequence.js` e `cutscenes/phone-sequence.css`).
  Sequência sonora completa (`audio/phone-audio.js` e
  `audio/README.md`): som de discagem, telefone chamando (ambos
  recortados de um áudio de referência real enviado pelo dev) e um
  clique curto de atender, seguido do diálogo; ao fim da última fala,
  um clique curto de desligar toca antes da caixa fechar. Controles e
  HUD ficam escondidos do início da mini cutscene até o fim do diálogo
  que vem em seguida — a ligação completa entre Kael e Ravi
  (`chamada-ravi` em `dialogue/dialogue-config.js`), digitada na mesma
  caixa de sempre. Interagir com o telefone de novo depois disso não
  repete a sequência.
- Segundo objetivo da história — "Entrar no MEU QUARTO": liberado
  assim que a ligação com Ravi termina (mesma etapa de
  `objectives/objective-config.js` do primeiro objetivo, agora com
  `allowedIds` liberando especificamente a porta "MEU QUARTO" — as
  outras 5 portas do corredor continuam bloqueadas normalmente pela
  mesma fala de sempre). Interagir com essa porta dispara a
  transição genérica de cenário (fade in -> troca de cenário -> fade
  out, ~1,2s no total — `cutscenes/room-transition.js` e
  `cutscenes/room-transition.css`, mesmo conceito visual da mini
  cutscene do telefone acima): o corredor sai da cena, o novo
  cenário do quarto entra (`scenes/room-scene.js`) e o jogador
  aparece perto da porta, já do lado de dentro — a troca em si nunca
  chega a ser vista, escondida pela tela preta. O quarto é um
  ambiente quadrado e vazio (mesma largura do corredor, mesmo
  pé-direito): chão e teto reaproveitam a mesma madeira do corredor
  (mesma receita de textura, só recalculada para o tamanho do quarto
  — `materials/material-library.js`), as paredes usam um lambri claro
  novo, inspirado numa referência enviada pelo jogador e adaptado à
  estética PS1/PSX do resto do jogo (`createPsxWallPanelTexture` em
  `materials/textures.js`), e a porta de entrada reaproveita o mesmo
  modelo das outras 6 portas do corredor (`models/door-factory.js`),
  sem nenhum modelo novo. Ainda sem mobília, sem luz própria (só a
  luz ambiente fraca do resto do jogo) e sem caminho de volta para o
  corredor — tudo isso fica para uma atualização futura.
- Terceiro objetivo da história — "ABRIR AS JANELAS" (agora também no
  corredor): o objetivo começa no quarto, na manhã seguinte, e
  continua valendo depois que o jogador volta para o corredor. São 3
  janelas no jogo (1 em "MEU QUARTO", já aberta lá dentro, e 2 no
  corredor), então ao voltar restam as duas do corredor. Enquanto essa
  etapa está ativa, só uma janela AINDA FECHADA responde ao
  "Interagir" — o novo campo `allowedKindsWhen: { window: "isClosed" }`
  em `objectives/objective-config.js` (interpretado pelo pequeno
  registro de condições em `objectives/objective-system.js`) faz a
  janela já aberta cair no bloqueio junto com todo o resto, sem espalhar
  essa regra pelo `scripts/main.js`. Qualquer outra interação (as 6
  portas, a gaveta, o telefone, o interruptor) responde
  "Kael: (Preciso abrir as janelas)." e nada avança a história. Os
  objetos do quarto seguem com o lembrete que já existia antes
  ("(Melhor abrir as janelas logo)."), sem nenhuma mudança.
- Conclusão do objetivo das janelas + segunda ligação: no instante em
  que a última das 3 janelas é aberta (`areAllWindowsOpen()` em
  `scripts/main.js` — varre os dois cenários pelo "kind", então
  qualquer janela nova futura entra na conta sozinha), o objetivo é
  concluído e o diálogo automático de Kael toca na hora ("Aah...
  Finalmente, um pouco de vida nessa casa." / "Acho melhor eu procurar
  a carta do Ravi."). Quando a última fala é confirmada, começa uma
  contagem de exatos 3 segundos — com o jogador já livre para andar —
  e só então o telefone da escrivaninha começa a tocar sozinho, em
  loop, sem limite de tempo, até ser atendido
  (`PhoneAudio.startIncomingRing()`, reaproveitando o mesmo
  `audio/telefone/chamando.wav` da primeira ligação, sem arquivo novo;
  o volume acompanha "Efeitos sonoros" ao vivo enquanto toca). Esse
  toque é POSICIONAL: sai do telefone da escrivaninha, não do "fone"
  do jogador. A câmera é o ouvinte (mesmo registro já usado pelo som
  das cortinas) e `PhoneAudio.updateIncomingRing()`, chamada uma vez
  por quadro no loop principal, reavalia volume (atenuação inversa por
  distância, com piso audível pra o som nunca sumir de vez), lado no
  estéreo e um passa-baixa que fecha com a distância — e fecha mais
  ainda quando o telefone está atrás do jogador, que é o truque de
  dar a dica de frente/trás sem HRTF. Na prática dá pra achar o
  telefone de ouvido: longe e de costas ele chega abafado e baixo, e
  vai abrindo/centralizando conforme o jogador se aproxima. Tudo entra
  por `setTargetAtTime`, então nada estala enquanto ele anda.
  Interagir com o telefone tocando atende a ligação usando a MESMA
  animação de fade da primeira (`PhoneSequence.playIncoming` em
  `cutscenes/phone-sequence.js`: o arquivo foi reorganizado para as
  duas ligações compartilharem overlay, duração, clique de
  atendimento/desligar e caixa de diálogo — nenhum sistema de fade
  novo). Sequência: telefone tocando -> interação -> fade in (o toque
  continua durante o fade) -> atendimento (o toque para no clique, com
  a tela preta) -> fade out -> diálogo "chamada-ravi-manha", com os
  botões de gameplay escondidos do começo ao fim, como em qualquer
  cutscene do jogo.
- Quarto objetivo da história — "LER A CARTA DO RAVI": ativado assim
  que o diálogo da segunda ligação termina por completo. A gaveta da
  escrivaninha é o ÚNICO interativo liberado da etapa (por id, em
  `allowedIds`); qualquer outra interação responde "Kael: (Preciso ler
  a carta do Ravi)." e não avança nada. O fluxo completo, do móvel até
  a leitura:

  1. **Gaveta** — "Interagir" na gaveta puxa ela de verdade (a mesma
     animação de sempre, `openDrawer`/`closeDrawer` em
     `models/desk-factory.js`) e abre um pop-up discreto com o que
     está guardado lá dentro (`interface/drawer-popup.js`). Hoje só a
     "Carta do Ravi". O botão "Fechar" empurra a gaveta de volta e
     devolve o gameplay.
  2. **Pegar a carta** — tocar nela some com a folha de dentro da
     gaveta, guarda o item no inventário e fecha o pop-up. Ela NÃO vai
     para a mão nesse momento.
  3. **Inventário** — os 4 slots que já existiam no HUD deixam de ser
     decorativos: `interface/inventory.js` cuida do conteúdo deles
     (ícone do item, toque, marcação de "em uso"), sem mudar posição,
     tamanho ou aparência da barra. O ícone é a própria arte da carta.
  4. **Carta na mão direita** — tocar no ícone equipa/guarda a carta
     (`scripts/hand-item.js`): ela é filha da própria câmera, então
     acompanha o olhar sem nenhuma sincronia por quadro, sobe suave ao
     ser equipada e respira de leve na mão. Sem iluminação e sem
     névoa de propósito (o corredor é escuro; um papel dependendo da
     luminária ficaria preto) e sem teste de profundidade — o truque
     clássico de viewmodel, para nenhuma parede recortar a carta num
     canto apertado. Tocar no ícone NÃO abre o texto: ela só aparece
     na mão.
  5. **Leitura** — com a carta na mão, o MESMO botão "Interagir" abre
     o pop-up de leitura (`interface/note-reader.js`): à esquerda o
     MODELO 3D de verdade da carta (a mesma fábrica de papel do resto
     do jogo), girável com um dedo, com zoom por pinça e toque duplo
     para reenquadrar; à direita o texto escrito nela, na mesma fonte
     pixelada de todo o jogo. O modelo roda em cena, câmera, luzes e
     loop de render PRÓPRIOS (`models/note-viewer.js`), então girar e
     dar zoom nunca mexe um milímetro na câmera principal — e o loop
     só existe enquanto o pop-up está aberto.

  Os dois pop-ups usam a mesma casca (`interface/popup.js`): fundo
  escurecido, painel translúcido, botão discreto "Fechar" e a regra
  fixa de esconder o HUD inteiro enquanto estão na tela, igual a
  qualquer diálogo. Enquanto um deles está aberto, olhar/movimento
  ficam travados e nenhum toque atravessa para a área de câmera.
  Fechando, o gameplay volta exatamente ao estado anterior. A etapa
  termina aqui de propósito: ler a carta NÃO cria objetivo novo nem
  consequência narrativa.
- Regra fixa de qualquer diálogo do jogo (intro, entrada ou os de
  bloqueio do objetivo atual): enquanto uma fala está na tela, o HUD
  inteiro (analógico, área de câmera, botão "Interagir", inventário)
  fica escondido, voltando a aparecer só depois que a caixa é
  fechada e removida da tela. A regra vive dentro da própria
  `dialogue/dialogue-box.js` (`show()`/`hide()`), então qualquer
  diálogo futuro já nasce seguindo-a, sem precisar de nenhum código
  extra em quem chama.

> **Nota técnica sobre APK/EXE:** este projeto é só o jogo web (HTML/CSS/JS
> puro) — o processo que empacota isso num `.apk` ou `.exe` é externo a esta
> pasta. O `scripts/fullscreen-manager.js` cobre 100% da parte web (o
> conteúdo dentro da WebView/janela), que é o que dá pra controlar daqui. Se
> a ferramenta usada para gerar o APK/EXE tiver uma opção própria de
> "fullscreen"/"kiosk"/"tela cheia nativa" (comum em wrappers Android e em
> builds Electron/NW.js para Windows), vale ativar também: isso remove a
> própria moldura do app (barra de status do Android, borda da janela do
> Windows) de um jeito mais garantido do que só a Fullscreen API do
> navegador, que depende do que aquela WebView específica suporta.

## AS QUATRO PEÇAS DECORATIVAS DA VARANDA

Pedido do jogador: quatro modelos enviados em `.zip` (uma **planta**, uma
**cadeira de plástico**, uma **churrasqueira** com engradado de garrafas
e um **varal com roupa**) posicionados "em algum canto da varanda da casa
(frente à casa)", com a liberdade de escolher o canto, sem interação
nenhuma "por enquanto", e **no mesmo sistema** dos modelos que já
existiam: "já tem outros itens que foram implementados dessa forma,
portanto use o mesmo sistema, não precisa criar algo novo".

- **Mesmo sistema, mesmo loader.** Os quatro são `.glb` em
  `assets/models`, carregados pelo MESMO `THREE.GLTFLoader` do fogão, da
  geladeira, da cama e das árvores, com o MESMO `DRACOLoader` acoplado e o
  MESMO `normalizeTextures` (nearest, sem mipmap, encoding linear). Nenhum
  carregador novo, nenhum shader novo, nenhum segundo three.js na página.
  Cada peça tem sua fábrica (`models/porch-plant-factory.js`,
  `models/plastic-chair-factory.js`, `models/barbecue-grill-factory.js`,
  `models/clothesline-factory.js`), e a primeira delas documenta o caminho
  inteiro; as outras três só anotam as diferenças.
- **Onde ficaram: o canto DIREITO da varanda**, escolhido por conta
  própria (o pedido foi "pode escolher um canto aleatório"). É o lado sem
  a `janela-entrada-saida` (que fica em `offsetX: -2.0`, na metade
  esquerda da fachada), então nenhuma peça nova entra na frente da vista
  externa daquela janela. Da fachada para a rua: **churrasqueira** no
  canto do fundo (espetos virados para dentro da varanda, engradado
  escondido atrás dela, no canto), **cadeira** logo à frente dela de
  costas para o muro lateral, **jardineira** fechando a fileira no canto
  da frente, e o **varal** pendurado no ar entre os dois pilares daquele
  lado, com a roupa entre 1,55 e 1,96 do chão. O vão do muro, o tapete de
  boas-vindas e o caminho até a porta continuam livres.
- **Nenhuma coordenada escrita na mão.** Os dados dizem só o CANTO (mais
  os opcionais `wallOffset`, `depthOffset`, `rotationY`, `elevation` e
  `solid`) em `porch.props`, em `scenes/corridor-config.js`; quem monta é
  um bloco novo em `scenes/corridor-scene.js` que deriva tudo da planta da
  varanda (`porch.plan`): laje, muro, pilares e tapete. Mudar
  `porch.depth` leva as quatro peças junto. É a mesma tabela
  `PROPS` + `CORNERS` que a mobiliária dos quatro cômodos laterais já
  usava (ver `FLOOR_PROPS` em `scenes/side-room-scene.js`): peça nova na
  varanda daqui pra frente é uma linha na tabela e uma lista nos dados.
- **As linhas do piso são as dos PILARES, não as do muro.** Os pilares de
  quina avançam mais para dentro da varanda do que o muro; encostar no
  muro deixaria a quina da peça DENTRO de um pilar. O bloco usa sempre a
  linha mais restritiva (lateral e frente), então isso vale para qualquer
  `depthOffset` sem nenhum caso especial. E o Y das peças é
  `plan.deckTop` (20 cm), não zero: o piso da varanda é alto por causa do
  caminho de terra que passa por baixo dele.
- **Decorativas, mas sólidas** (menos o varal). Não entram em
  `interactables`: sem contorno de destaque, sem prompt de Interagir, sem
  diálogo, sem animação, sem som. Entram em `solids` só para o jogador não
  atravessar a peça andando — hoje isso é prevenção, como o muro e os
  pilares (a porta ENTRADA & SAÍDA continua bloqueada pela história). O
  **varal** é a exceção (`solid: false` nos dados): é pano no ar na altura
  do peito, sobre a passagem, e a colisão do jogo é um AABB sem eixo Y —
  um sólido ali viraria parede invisível.
- **Noite e dia: a novidade técnica desta rodada.** São os primeiros
  modelos importados que ficam do lado de FORA da casa, e lá fora ninguém
  sobrevive só com o material do arquivo: de manhã o chão, a grama, a
  estrada, a fachada e a própria varanda trocam para material CHAPADO
  (`MeshBasicMaterial`), porque não existe sol de verdade na cena — um
  modelo iluminado no meio disso apareceria preto. Então as quatro
  cumprem o MESMO contrato de tudo que vive lá fora
  (`setDaytime`/`setMorning`, entram em `exteriorGrounds`), pelo MESMO
  caminho da floresta importada: mesma geometria, mesma textura, troca só
  de material — `MeshStandardMaterial` de noite, `MeshBasicMaterial` de
  dia, no mesmo tom em que a varanda amanhece. Reversível, por causa do
  controle de horário do Editor, e funciona mesmo se o horário mudar
  ANTES do `.glb` chegar.
- **Escala: nenhuma reescala.** Os quatro chegaram em metros e nas
  medidas certas — jardineira 1,07 x 0,38 x 0,74; cadeira 0,52 x 0,61 x
  0,93 (os 52 x 93 x 61 cm que o próprio pacote anuncia); churrasqueira
  0,78 x 0,75 x 0,68 (com o engradado ao lado); varal 1,13 de vão por
  0,41 de altura. Diferente do botijão e da geladeira, aqui `MODEL_SCALE`
  é 1 nas quatro.
- **Textura: as quatro vieram SOLTAS e foram embutidas no `.glb`.** Mesmo
  fluxo do botijão de gás: os pacotes trazem a imagem PSX (256x256, cor
  de 15 bits com dither ordenado) ao lado do modelo, para o preview
  aplicar em tempo de execução. Cada uma foi embutida bit a bit dentro do
  `.glb` correspondente, com sampler NEAREST/REPEAT e material
  `MeshStandardMaterial` de dupla face (folha, roupa e a grelha original
  são cascas abertas). Mudou só ONDE a imagem mora: um arquivo, um
  loader, nada para sincronizar. A geometria Draco não foi tocada em
  nenhum dos três pacotes que a usam.
- **A churrasqueira não chegou como `.glb`.** É o único caso do jogo: o
  pacote traz a malha em `churrasqueira.psx.bin`, um formato próprio do
  autor (posições e UV quantizadas em uint16, normais em int8). O
  conteúdo foi **reempacotado** em `assets/models/grill_psx.glb` — os
  mesmos 41.026 vértices e 49.794 triângulos, dequantizados com o
  offset/escala do cabeçalho do próprio arquivo, sem remodelar nada. Ele
  não usa Draco (o formato do pacote não usa) e por isso nem instancia o
  `DRACOLoader`: fica maior em disco (1,6 MB — o `chair_psx.glb` do
  quarto tem 11,9 MB) e em troca carrega sem depender de CDN.
  O V da UV foi invertido na conversão, porque o `.psx.bin` guarda V de
  baixo para cima e o glTF quer de cima para baixo; isso não é chute — a
  peça foi renderizada nas duas orientações e comparada com o
  `preview.png` que veio no pacote, e só a invertida bate.
- **Dá para mexer sem tocar em código.** Os quatro grupos têm nome
  estável (`PorchPlantPSX`, `PlasticChairPSX`, `BarbecueGrillPSX`,
  `ClotheslinePSX`), então o Editor identifica, move, gira e escala cada
  um, e o que for salvo vale por cima dos números do arquivo (ver
  `editor/README.md`). No painel da hierarquia aparecem como Planta da
  varanda, Cadeira de plástico da varanda, Churrasqueira da varanda e
  Varal com roupa — era o combinado: "caso eu não goste da posição, eu
  posso alterar com o editor depois".
- **O que veio nos pacotes e NÃO entrou.** Os quatro trazem preview
  próprio e um motor PSX em módulos ES (shader com snap de vértice, warp
  afim, dither, pipeline de framebuffer baixo), alguns importando outra
  versão do three.js por importmap. Nada disso foi usado, de propósito e
  pelos mesmos motivos já escritos no fogão e no botijão: o jogo roda em
  three.js r128 com scripts globais, o look PSX daqui já vem da
  renderização do jogo, e aquele shader tem luz própria fixa — só essas
  quatro peças ignorariam as luzes da cena.
- **O que NÃO mudou:** interior de nenhum cômodo, a varanda em si
  (geometria, muro, pilares, tapete), telhado, móveis, controles, HUD,
  interações, cutscenes, objetivos, iluminação e a estética PSX.

## CORREÇÕES: grama dos fundos, lixeira acesa e telhado da varanda

Três bugs relatados pelo jogador, três ajustes cirúrgicos, cada um no
arquivo que causava o problema. Nenhum cômodo, móvel, textura, mecânica,
medida de planta, controle, HUD, cutscene ou objetivo mudou.

- **1. Área sem grama atrás da casa**
  (`scenes/corridor-scene.js`, `models/grass-field-factory.js`). O gramado
  alto nasce por JANELA, ancorado na parede dela com o +Z local apontando
  para FORA, e cada campo cobre só o meio-disco do lado de fora da SUA
  parede. O jogo tem três janelas: duas no corredor (parede direita e
  ENTRADA & SAÍDA) e a de MEU QUARTO, que com o giro de 180° da zona dá na
  fachada esquerda — ou seja, frente, esquerda e direita têm gramado. A
  faixa ATRÁS da casa (a largura da construção, da parede de fundo de MEU
  QUARTO para trás) não era alcançada por nenhum dos três: ali existia só
  o chão texturizado (o remendo sob a casa), sem uma única moita em cima,
  enquanto a mata, que contorna a esquina, já plantava árvores no mesmo
  pedaço. Agora existe um **gramado dos fundos**: o MESMO
  `GrassFieldFactory` das janelas, com a MESMA convenção de âncora, só que
  ancorado na parede de fundo (rotação zero — o +Z local já é o +Z do
  mundo) e montado pelo corredor, a zona de referência da casa, onde as
  coordenadas locais SÃO as do mundo (mesmo motivo do remendo de chão sob
  a casa).
  - **Nada de grama dentro de casa**, e não é "eu conferi": a garantia é a
    de sempre da fábrica — no espaço local do campo, dentro da casa é
    z <= 0, e nenhuma moita é sorteada sem que z >= alcance real da moita
    + WALL_SAFETY (nem o centro, nem a lâmina mais comprida chegam ao
    plano da parede). A casa INTEIRA fica atrás dessa âncora, então não há
    um único retângulo de cômodo do lado de fora dela: este campo não
    precisa de `exclusions` nem de `path`.
  - **Ele é um remendo estreito, de propósito.** A fábrica ganhou
    `options.lateralLimit` (metros para cada lado da âncora, nunca além da
    borda do terreno): o campo cobre a largura da casa mais 0,6 m de
    mistura nas duas quinas, para a emenda com o gramado das fachadas
    laterais não ler como linha reta. Um campo inteiro de 60 m plantaria
    uma segunda camada de grama por cima do que aquelas fachadas já
    cobrem — o dobro de instâncias no mesmo lugar, num jogo mobile. Custo
    real: ~450 moitas, 3 draw calls de noite e 7 de dia, como qualquer
    outro campo. Amanhece junto com o resto do terreno pelo `setMorning()`
    que a cena já percorre.

- **2. Lixeira brilhando no escuro** (`models/trash-can-factory.js`). O
  `.glb` veio do Sketchfab marcado como "Unlit" (`KHR_materials_unlit`
  gravado no próprio arquivo) e o `GLTFLoader`, ao ver essa extensão, cria
  um `THREE.MeshBasicMaterial` — que IGNORA as luzes da cena e desenha a
  textura sempre no brilho máximo. Em MEU QUARTO, onde de noite só chega a
  ambiente da casa (0x141018 a 0.35), a lata era a ÚNICA peça acesa do
  cômodo. Não é caso novo: é o MESMO bug e o MESMO conserto que a TV, o
  microondas, a privada e o rádio portátil já tiveram — a função
  `fixUnlitMaterial` de `models/tv-factory.js`, que troca o material por
  `MeshStandardMaterial` reaproveitando a textura já normalizada (nearest,
  sem mipmap, encoding linear), com o mesmo acabamento fosco
  (roughness 0.7 / metalness 0.05). A lixeira era a única peça importada do
  jogo que ainda não rodava esse conserto. `side` e `alphaTest` são
  PRESERVADOS na troca: o material do arquivo vem `doubleSided` (a lata é
  uma casca aberta em cima) e com `alphaMode: MASK` / `alphaCutoff: 0.05`,
  que é o recorte da textura dela. Geometria, medidas, posição e textura
  intocadas: a lata é a mesma, só deixou de ter luz própria e agora segue
  a iluminação do ambiente como o resto do quarto.

- **3. Telhado da varanda piscando** (`models/porch-factory.js`). Era
  z-fighting — geometria empatada em profundidade, a mesma família de bug
  das quinas do muro —, em duas frentes:
  - **Todo arremate estava rente demais à laje.** A laje é feita de duas
    faces (telha em cima, forro embaixo) e a telha fica `COVER_DECK` acima
    do forro medido na VERTICAL; testeira, tábuas de beira, rufo e as três
    vigas eram posicionadas medindo na PERPENDICULAR da laje. Resultado: a
    face de cima delas caía a **0,8 milímetro** da face da telha, e o topo
    das vigas caía EXATAMENTE no plano do forro. Duas superfícies grandes,
    quase paralelas, a menos de um milímetro uma da outra, num render de
    320x180 e com o wobble de vértice da estética PSX mexendo cada malha em
    separado: o pixel sorteia uma delas a cada quadro. A faixa do rufo,
    colada na fachada, era a mais visível — e é dela que vinha a impressão
    de peça "dentro da parede". Agora existe `SLAB_BITE`: cada arremate
    **morde 2 cm dentro da laje** em vez de encostar rente nela (testeira e
    beiras passam 2 cm acima da telha, como o lábio do beiral do telhado da
    casa; o rufo afunda 2 cm nela; as vigas escondem 2 cm do topo dentro
    dela). Mesma regra que o arquivo já usava no pilar (`PILLAR_TUCK`) e na
    ponta do muro: ou uma peça morre dentro da outra, ou nada — e
    superfície que se cruza não pisca. As vigas também ficaram 2 cm mais
    largas que os pilares (e a da frente mais larga que as laterais), para
    a ponta do pilar que morre dentro da viga parar de dividir as faces de
    fora com ela.
  - **As duas vigas laterais entravam na casa.** Elas são deitadas na
    inclinação, e o giro joga a quina de cima da caixa 2,9 cm para trás
    (|sin(inclinação)| x altura). O comprimento antigo ignorava isso: a
    quina passava da fachada, caía na TRAVA anti-invasão (`guardHouse`) e
    era achatada no próprio plano da parede — a trava tirava a viga de
    dentro do corredor e, no lugar, criava um empate de profundidade com o
    revestimento da fachada, exatamente onde o telhado encontra a parede
    (com aviso no console a cada boot). Agora a ponta de trás é derivada JÁ
    com o giro descontado e para 2 cm antes da fachada: a trava não
    conserta mais nada, porque não há mais nada para consertar.
  - **A silhueta não mudou:** mesma laje, mesma inclinação, mesma queda,
    mesmo beiral, mesmas alturas, mesmos três materiais e o mesmo custo de
    desenho (quatro malhas). Nenhum `polygonOffset` e nenhum `renderOrder`
    entrou — quem resolve continua sendo a geometria.

## O que ainda não existe (de propósito)

Das 6 portas do corredor, só "MEU QUARTO" abre (leva ao novo cenário
do quarto, ver bullet dedicado acima); as outras 5 continuam sem
destino definido. O quarto em si ainda não tem mobília, luz própria
nem caminho de volta para o corredor. O inventário já funciona, mas
com um item só (a carta do Ravi) e os mesmos 4 slots fixos. Do
áudio, só o som de passos, os sons da ligação telefônica e o som das
cortinas existem por enquanto (ver bullets dedicados acima); portas,
ambiente, música e demais efeitos ainda não têm nenhum som. Os botões
CONTINUAR e FECHAR JOGO do menu principal ainda não têm nenhuma ação
(NOVO JOGO e CONFIGURAÇÕES já funcionam). A ideia é que essa base
sirva de alicerce para as próximas fases.

## A CUTSCENE DE ABERTURA (estrada de terra + ligacao do Ravi)

A abertura do jogo era dois VIDEOS (`cutscene-parte1.mp4` e
`cutscene-parte2.mp4`, ~76 MB juntos). Os dois foram REMOVIDOS, junto com
o player deles, o config e o CSS da camada de video. No lugar entrou uma
cutscene em engine, com os dois pacotes 3D enviados pelo jogador:

```
cutscenes/road-cutscene.js ....... a cutscene: renderer e canvas proprios
                                   dentro do #game-container, a linha do
                                   tempo (fades, musica, toque, xiado,
                                   dialogo) e a entrega para a gameplay
cutscenes/road-cutscene.css ...... as tres camadas dela na tela
models/car-interior-factory.js ... a cabine do carro em primeira pessoa,
                                   com a camera FIXA no olho do motorista
models/road-loop-factory.js ...... a estrada de terra, a floresta, o mato,
                                   os postes e a nevoa, montados para dar
                                   a volta em si mesmos (loop infinito)
materials/psx-cutscene-material.js  snap de vertice + textura afim +
                                   dither 15 bits, injetados no material
                                   Lambert de sempre do three.js
audio/road-cutscene-audio.js ..... musica, toque de chamada e xiado de radio
assets/models/estrada_terra_psx.glb  o modelo da estrada (172 KB)
audio/musica/cutscene-estrada.mp3    a musica enviada (~420 KB)
```

Linha do tempo, do primeiro ao ultimo quadro:

1. Tela preta, musica comecando, carro ja andando por tras do preto.
2. **Fade-in de 8 segundos** revelando a estrada.
3. Quando a **musica acaba**, o telefone comeca a tocar (ligacao de radio
   entrando). Quem cronometra e a propria musica, nao um tempo fixo.
4. **Tres segundos** de toque -> xiado de radio curto, musica encerrada.
5. **Dialogo** da ligacao (chave `cutscene-estrada-ravi` em
   `dialogue/dialogue-config.js`), na caixa de dialogo de sempre. O carro
   segue rodando o tempo que for. O botao **PULAR TUDO** encerra a
   conversa inteira de uma vez.
6. Fim do dialogo -> o mesmo xiado, agora como a ligacao caindo.
7. **Fade-out de 10 segundos**. A gameplay e montada com a tela ja preta e
   so depois o preto sai: o jogo comeca no corredor exatamente como
   sempre comecou (camera "acordando" + dialogo do Kael, ver
   `cutscenes/entry-sequence.js`).

A camera nunca se mexe por conta propria: ela e filha da cabine, no olho
do motorista. Quem anda e o carro, sempre para a frente, e o mundo tem
176 m que dao a volta em si mesmos, com as pontas duplicadas - por isso o
loop nao tem emenda visivel, rode ele por 20 segundos ou por 10 minutos.

### A nevoa da estrada (o bug visual do carro, corrigido)

Os tufos de neblina (`Neblina_Puff`) apareciam como **pedacos de PNG de
borda reta parados na pista**, piscando de um quadro para o outro, e
chegavam a cobrir o interior da cabine com um chuviscado quadriculado -
como se a nevoa atravessasse o carro. Eram tres causas somadas, todas no
mesmo lugar: o tufo e um cartao CRUZADO gigante (ate 25 m de lado) e
semitransparente, e estava recebendo o mesmo tratamento PSX das pecas
solidas.

1. **Mapeamento afim** num cartao que atravessa dezenas de metros de
   profundidade nao torce a textura de leve: ele joga a UV para fora de
   `[0,1]`, e como o sampler do `.glb` vem em `REPEAT`, o wrapping
   devolve COPIAS da mancha de nevoa, com borda reta. Somado ao filtro
   `Nearest` sem mipmap, a 320x180, isso vira o chuviscado quadriculado.
2. **Snap de vertice** num cartao com um vertice atras da camera move um
   canto e nao o outro - a borda pisca a cada quadro.
3. Com a camera DENTRO do cartao, o **plano de corte** da lente fatiava
   o tufo numa reta perfeita: a reta que cruzava a cabine.

E o cartao entrava na cabine porque a posicao dele era sorteada de
5,5 a 29,5 m do eixo da estrada **sem olhar para o tamanho**: um tufo de
25 m largado a 5,5 m alcanca `x = -7`, ou seja, atravessa a pista inteira
(o mesmo erro que as pedras soltas ja tiveram).

O que mudou:

- `materials/psx-cutscene-material.js` ganhou um tipo de material
  **VOLUME** (`markAsVolume`): sem mapeamento afim, sem snap de vertice,
  textura em `ClampToEdge` e o alpha morrendo por PROFUNDIDADE - o tufo
  nasce invisivel a 3,5 m da lente e so fica cheio a 13 m, entao ele
  nunca chega perto o bastante para ser cortado. O dither de 15 bits
  continua: e ele que da a granulacao PSX da nevoa. O resto da cutscene
  (estrada, arvores, mato, cabine) segue com as tres tecnicas intactas.
- `models/road-loop-factory.js` sorteia o TAMANHO primeiro e mede a
  distancia pela BORDA do cartao, nao pelo centro: a borda interna nasce
  a 4,6 m do eixo no minimo, 1,2 m de folga alem da pista, entao nenhum
  tufo passa mais por dentro do carro. A rotacao e o achatamento sairam
  de dentro do `emit`, para as copias das pontas do loop ficarem
  identicas a original.

A bruma sobre a propria pista nunca veio desses cartoes: ela e o
`scene.fog` da cena (6 m a 48 m), e continua igual.

## AS DOZE PECAS DO QUINTAL LATERAL DIREITO

Quatro pacotes `.glb` enviados pelo jogador (lixo, jardim, madeira e o
medidor de energia) viraram **doze pecas decorativas** encostadas na
**parede lateral direita, do lado de fora da casa** - a parede comprida que
a COZINHA e o BANHEIRO formam (`x = 7.82` no mundo, de `z = -19.45` a
`z = -3.75`).

**Individuais de verdade.** Tres dos quatro pacotes vinham com varias pecas
coladas num modelo unico (o pacote de lixo tinha 5, o de jardim 3, o de
madeira 3). Cada uma entrou como **modelo individual**: um `.glb` proprio em
`assets/models`, uma fabrica propria em `models/` e um nome proprio no
Editor - da para mover, girar e escalar cada peca separadamente, que era o
pedido. O `pack-completo`/`trash_pack_full`/`garden_pack` de cada pacote
nao entrou.

| peca | modelo | arquivo | escala |
|---|---|---|---|
| Lixeira grande (dumpster) | `dumpster` | `dumpster_psx.glb` | x3.2 |
| Lata de lixo do quintal | `yard-trash-can` | `yard_trash_can_psx.glb` | x3.2 |
| Sacos de lixo A, B e C | `trash-bag-a/b/c` | `trash_bag_a/b/c_psx.glb` | x3.2 |
| Montinho de terra | `dirt-mound` | `dirt_mound_psx.glb` | 1:1 |
| Vaso de samambaia | `fern-pot` | `fern_pot_psx.glb` | 1:1 |
| Galinha porta-ferramentas | `chicken-toolpot` | `chicken_toolpot_psx.glb` | 1:1 |
| Pilha de lenha | `woodpile` | `woodpile_psx.glb` | x3 |
| Gravetos e galhos | `branches` | `branches_psx.glb` | x3 |
| Machado no toco | `axe-stump` | `axe_stump_psx.glb` | x3 |
| Medidor de energia | `power-meter` | `power_meter_psx.glb` | 1:1 |

As escalas nao foram inventadas: cada pacote diz a sua (`unitScaleHint`
3.2 no de lixo, `scale: 3` no de madeira, "1 unit = 1 metre" no de jardim e
no medidor). Geometria e UV **1:1 do arquivo**, sem decimar nada.

**Mesmo sistema de import de sempre.** `.glb` em `assets/models` + o MESMO
`THREE.GLTFLoader` das outras pecas, o MESMO `normalizeTextures` (nearest,
sem mipmap, encoding linear) e a MESMA convencao de espaco local (X/Z no
centro da base, Y = 0 no chao, frente em +Z). Nenhum carregador novo,
nenhum shader novo, nenhum segundo three.js: o runtime PSX em modulo ES que
veio dentro dos pacotes ficou de fora, pelos mesmos motivos ja escritos em
`models/porch-plant-factory.js`. Nenhuma usa Draco (geometria crua) e todas
trazem a textura PSX embutida no proprio `.glb`, entao o bloco do motor 3D
de `index.html` nao mudou.

Tres detalhes que apareceram nestes arquivos:

- **Material Unlit** (pacote de lixo e medidor): viraria `MeshBasicMaterial`
  e a peca brilharia sozinha no escuro. Trocado por `MeshStandardMaterial`
  pela MESMA funcao que a TV, o microondas e a privada ja usavam.
- **AO assada em `COLOR_0`** (medidor): primeira peca do jogo com sombra de
  contato nas cores de vertice. A flag `vertexColors` e preservada nas duas
  versoes de material, senao a peca ficaria lisa.
- **`KHR_mesh_quantization`** (pacote de jardim): lido nativamente pelo
  GLTFLoader do r128 - o jogo ja tinha um modelo assim (a cadeira do MEU
  QUARTO).

**Onde ficam.** Os dados estao em `sideYard` (`scenes/corridor-config.js`):
cada peca diz so o `offset` (Z ao longo da parede), a folga `gap` contra
ela, o `rotationY` e, se for o caso, `elevation` e `solid`. Quem monta e o
bloco "Pecas decorativas da parede lateral direita" de
`scenes/corridor-scene.js`, que **deriva o X da propria casa** (pegada dos
comodos menos a engorda das paredes, mais os 2 cm do revestimento externo):
mudar a profundidade da COZINHA/BANHEIRO leva as doze junto. O bloco avisa
no console se uma peca passar da ponta da parede ou entrar dentro de outra.

A fila conta uma historia, da frente para os fundos: medidor de energia na
quina da frente (pendurado a 1,05 m, mostrador na altura dos olhos), o lixo
todo junto perto da rua, a parte de servico do quintal (terra, lenha,
machado, gravetos) e, no fim, os dois vasos de enfeite. A fresta de 30 cm
entre as paredes da COZINHA e do BANHEIRO (z -11.85 a -11.35) fica vaga de
proposito.

**Decorativas, como pedido.** Nenhuma entra em `interactables`: sem
contorno, sem prompt de "Interagir", sem dialogo, sem animacao, sem som.
Entram em `solids` (para o dia em que o jogador puder andar por fora), menos
as rasteiras (terra, gravetos) e a pendurada (medidor) - a colisao do jogo e
um AABB sem eixo Y e elas viariam parede invisivel. E cumprem o contrato
`setDaytime`/`setMorning` de tudo que vive la fora, entao amanhecem junto
com a grama e a fachada.

**Mexer nelas.** Tudo foi feito para ser mexido no Editor: cada peca tem
nome proprio na hierarquia ("Lixeira grande do quintal", "Saco de lixo A",
"Medidor de energia"...) e o que o Editor salvar vale por cima dos dados,
sem tocar em nenhum arquivo.

## O CARRO DOS FUNDOS (Golf Mk4 PSX, decorativo)

O modelo `.glb` enviado nesta rodada, estacionado no gramado **ATRAS da
casa** - o pedido, com o lugar circulado num print do Editor: *"adicione o
carro ao jogo, por enquanto como modelo decorativo. E posicione ele atras
da casa, no local onde eu circulei na imagem"*.

```
models/car-factory.js .................. a fabrica (mesma forma das outras)
assets/models/car_golf_mk4_psx.glb ..... o modelo, copiado byte a byte do pacote
scenes/corridor-config.js .............. `backYard.props`: os dados da peca
scenes/corridor-scene.js ............... o bloco que monta o quintal dos fundos
editor/editor-registry.js .............. os nomes dele na hierarquia do Editor
index.html ............................. um <script>, e nada mais
```

**Mesmo sistema de import de sempre, nenhum sistema novo.** Um `.glb` em
`assets/models` carregado pelo MESMO `THREE.GLTFLoader` de todos os outros
modelos do jogo, o MESMO `normalizeTextures` (nearest, sem mipmap, encoding
linear), a MESMA convencao de espaco local (X/Z no centro da base, Y = 0 no
chao, frente em +Z) e o MESMO contrato de noite/dia de tudo que vive la fora
(`setDaytime`/`setMorning`). O pacote veio com um three.js r185 inteiro e um
runtime PSX proprio em modulo ES: nada disso entrou, pelos mesmos motivos ja
escritos em `models/porch-plant-factory.js` (seria um SEGUNDO three.js na
pagina, e o shader dele tem luz propria fixa - o carro ignoraria as luzes da
casa). A geometria chega crua, entao nao passa pelo DRACOLoader, e a textura
PSX (256x256, 256 cores, 15-bit) ja vem embutida no `.glb`: o bloco do motor
3D de `index.html` nao mudou.

**Sete pecas, UM objeto.** O arquivo traz 7 nos separados (carroceria, dois
espelhos, quatro rodas; 4.376 triangulos). Diferente dos pacotes de lixo,
jardim e madeira - onde cada peca era um OBJETO diferente e virou uma fabrica
individual -, aqui as sete sao partes do mesmo carro: uma fabrica, um grupo,
um nome no Editor, e o carro se move/gira/escala como uma coisa so. As sete
continuam existindo como malhas com nome proprio na hierarquia ("Carro:
roda diant. esquerda"), de graca, para o dia em que uma delas precisar sumir
ou se mexer.

**Onde ele esta.** No gramado dos fundos, quase de frente para a casa: capo
apontando para a parede de fundo de MEU QUARTO com 12,6 graus de torto
(carro parado em terreno de grama nao fica reto - mesmo espirito dos giros
"quebrados" dos sacos de lixo do quintal lateral). No mundo ele ocupa x de
-0,72 a +2,52 e z de 7,22 a 12,25, com **1,2 m de folga** entre o
para-choque e o revestimento da parede: cabe passar andando entre o carro e
a casa, e ele fica inteiro dentro da largura da construcao, sem invadir
nenhum dos quintais laterais. Medidas finais 2,29 x 1,65 x 4,64 m (largura
com os espelhos, altura, comprimento), escala **1:1** - o LEIA-ME do pacote
diz "escala em metros", e escala de pacote nao se inventa aqui (mesma regra
das doze pecas do quintal lateral). Fica registrado que isso deixa o modelo
~12% maior que um Golf Mk4 real: se um dia incomodar, e UM numero
(`MODEL_SCALE` em `models/car-factory.js`), e as medidas e a colisao
acompanham sozinhas.

**Dado puro, como todo o resto da planta.** A peca diz so `model`, `offset`
(X ao longo da parede de fundo), `gap`, `rotationY` e, se for o caso,
`elevation`/`solid`. Quem monta e o bloco "Pecas decorativas do QUINTAL DOS
FUNDOS" de `scenes/corridor-scene.js`, que **deriva o Z da propria casa**
(parede de fundo do quarto + os 2 cm do revestimento externo): mudar o
tamanho do quarto leva o carro junto. E o mesmo desenho do bloco do quintal
lateral direito, lendo a MESMA tabela de modelos (`SIDE_YARD_MODELS` virou
`YARD_MODELS`, agora compartilhada pelos dois quintais) - a unica diferenca e
o eixo: a parede lateral corre em Z, a de fundo corre em X. Ele tambem avisa
no console se uma peca sair da faixa de chao dos fundos ou nascer dentro de
outra.

**Ele nasce 4 cm abaixo do zero, de proposito.** Detalhe que o quintal
lateral nao tem: la as pecas se apoiam no remendo de chao da janela daquela
parede, que esta em y = 0. Na largura da casa, atras dela, o unico chao que
existe e o **remendo sob a casa**, que nasce em `-UNDER_HOUSE_DROP` (4 cm
abaixo do zero, ver a secao do vao do limbo). Um carro deixado em y = 0
flutuaria esses 4 cm sobre o chao que aparece embaixo dele - mesmo cuidado
que o fogao teve com o `FLOOR_LIFT` dos comodos novos.

**Decorativo, como pedido.** Nao entra em `interactables`: sem contorno de
destaque, sem prompt de "Interagir", sem dialogo, sem animacao, sem som.
Entra em `solids`, so para o jogador nao atravessar o carro andando quando um
dia sair de casa - isso e colisao FISICA, nao "interacao". O material do
arquivo vinha marcado como **Unlit** (`KHR_materials_unlit`), o que faria o
carro brilhar sozinho no escuro: trocado por `MeshStandardMaterial` pela
MESMA funcao que a TV, o microondas, a privada e a lixeira grande ja usavam.
As sete malhas compartilham UM material no arquivo, e esse compartilhamento
foi preservado no conserto - o carro inteiro fica com um material de noite e
um de dia, nao 14.

**A grama passa por dentro dele, e isso e escolha.** O gramado alto dos
fundos (~0,5 m de lamina) planta suas moitas em volta e por baixo do carro,
como faz com o caixote de lixo e a pilha de lenha do quintal lateral: carro
parado em mato alto le como carro abandonado, que e exatamente o clima. A
alternativa seria passar a pegada dele em `options.exclusions` do
`GrassFieldFactory` (o campo ja aceita) - mas isso abre um retangulo pelado
que **nao segue o carro** quando ele for movido no Editor, e o Editor e o
lugar onde esta peca vai ser ajustada. Se um dia o mato incomodar, e uma
linha no bloco do gramado dos fundos.

**Nenhuma arvore nasce em cima dele, e nao e sorte.** As tres florestas do
jogo sao ancoradas nas paredes das JANELAS e so plantam do lado de fora da
parede delas: as duas laterais cobrem |x| > 3 e a da frente, z < -22. A faixa
atras da casa (x de -3 a +3) nao e alcancada por nenhuma - por isso ela
precisou de um gramado proprio, na correcao "area sem grama atras da casa", e
por isso o carro nao disputa espaco com tronco nenhum.

**Mexer nele.** O grupo tem nome estavel (`CarPSX`), entao o Editor
identifica, move, gira e escala o carro, e o que for salvo vale por cima dos
numeros do arquivo (ver `editor/README.md`). Na hierarquia ele aparece como
**Carro (Golf Mk4)**, com as sete pecas listadas dentro.

**Credito obrigatorio (CC-BY 4.0).** Modelo *"1998 Volkswagen Golf Mk4"*, de
**ImperialBlue** (https://sketchfab.com/ImperialBlue3D), licenca
[CC-BY 4.0](http://creativecommons.org/licenses/by/4.0/). A malha nao foi
alterada; a textura veio reamostrada e requantizada em estilo PSX pelo
proprio pacote (obra derivada, permitida pela licenca). A licenca **exige**
atribuicao visivel se o jogo for publicado - este e o texto que deve ir para
a futura tela de CREDITOS do menu. "Volkswagen" e "Golf" sao marcas da
Volkswagen AG; para uso comercial, considere descaracterizar emblemas.

**O que NAO mudou:** controles, HUD, sistema de interacao, colisao do
interior, cutscenes, dialogos, objetivos, iluminacao, a estetica PSX, o
bloco do motor 3D, o gramado, a mata, a nevoa, o telhado e as doze pecas do
quintal lateral. Nenhum comodo, movel, textura ou numero de planta foi
tocado.

## O GALPAO DOS FUNDOS (armazem PSX, decorativo)

O pequeno galpao enviado nesta rodada, plantado no gramado **ATRAS da casa** e
**afastado dela** - o pedido, com o lugar circulado num print do Editor:
*"adicione esse pequeno galpao ao jogo... Parte de tras da casa (exterior). Nao
e pra juntar esse galpao com a casa. O galpao deve ficar um pouco afastado"*.

```
models/shed-factory.js ................. a fabrica (geometria do pacote + materiais do jogo)
models/door-factory.js ................. duas opcoes novas: frame e outline
scenes/corridor-config.js .............. `backYard.props`: os dados da peca
scenes/corridor-scene.js ............... o galpao na tabela YARD_MODELS
editor/editor-registry.js .............. os nomes dele na hierarquia do Editor
index.html ............................. um <script>, e nada mais
```

**As DUAS trocas pedidas.** *Piso*: o piso de **cimento** do pacote nao entrou -
o chao do galpao e a MESMA madeira do chao da casa (`createWoodTexture`, a
receita do corredor, de MEU QUARTO e dos quatro comodos), com a tabua do MESMO
tamanho em metros que a de dentro (1,2 tabuas por metro, ver `FLOOR_TILE`).
*Portas*: as duas folhas de taboas do pacote tambem nao entraram - as duas
folhas do galpao **sao a porta do jogo** (`DoorFactory`, a mesma das 6 do
corredor), com `materials.doorPanel` e a macaneta `materials.lampMetal`, em
escala **uniforme** de 0,899 (porta de galpao e menor que porta de casa; sem um
pixel de distorcao). A folha da direita e espelhada em X, entao as duas
macanetas ficam no meio do vao. E o **vao** do galpao e derivado da porta do
jogo, nao escrito na mao: mudou a porta, o recorte da parede, os batentes e a
verga acompanham.

**Nada de sistema novo.** Este pacote nao e um `.glb`: e codigo que monta a
malha e pinta as texturas em canvas na hora. Entao ele nao passa pelo
GLTFLoader, nao precisa do DRACOLoader e **nao tem um unico arquivo de imagem**
para baixar - o bloco do motor 3D de `index.html` nao mudou. O runtime PSX do
pacote (ShaderMaterial com snap de vertice, warp afim, dither e luz/nevoa
proprias) **nao entrou**, pelo mesmo motivo do carro e da planta da varanda:
seria um segundo sistema de material, cego para as luzes da cena e para o
amanhecer. Do pacote vieram, VERBATIM, so o construtor de malha, a oclusao
assada nos vertices e os cinco pintores de textura que sobraram (reboco externo,
reboco interno, madeira, telhas e forro); sobre eles entram os materiais do jogo
- `MeshStandardMaterial` de noite, `MeshBasicMaterial` de dia, o mesmo contrato
`setDaytime`/`setMorning` de tudo que vive la fora. **1.392 triangulos**, 7
malhas de casca + 4 das folhas.

**Onde ele esta.** Centrado na largura da casa (`offset: 0`) e a **7,3 m** da
parede de fundo de MEU QUARTO (`gap: 7.3`), com a porta virada PARA a casa
(`rotationY: Math.PI` - construcao nao fica torta, diferente do carro). No mundo
ocupa x de -2,71 a +2,71 e z de 13,32 a 18,95, com 4,34 m de altura na cumeeira:
inteiro dentro da faixa de chao que existe atras da casa (x de -3,25 a +3,25),
com **1,07 m de folga** entre o beiral e o para-choque do carro (que termina em
z = 12,25), e longe da mata (as tres florestas so plantam para fora das paredes
das janelas, nunca nessa faixa central). Nasce 4 cm abaixo do zero, como o
carro, porque ali o chao e o remendo sob a casa (`UNDER_HOUSE_DROP`).

**Decorativo, como o carro.** Nao entra em `interactables`: sem contorno, sem
prompt de Interagir, sem dialogo, sem som; as folhas nascem fechadas e nao
abrem. Entra em `solids` como UM retangulo (o contorno do telhado) - colisao
fisica, para o dia em que o jogador sair de casa. A grama alta passa em volta e
por baixo dele pela MESMA escolha ja registrada na secao do carro (um retangulo
pelado nao seguiria a peca quando ela for movida no Editor), e o interior fica
fechado de qualquer forma.

**Mexer nele.** O grupo tem nome estavel (`ShedPSX`), entao o Editor move, gira
e escala o galpao e o que for salvo vale por cima dos numeros do arquivo. Na
hierarquia ele aparece como **Galpao (armazem PSX)**, com casca, paredes,
madeiramento, telhas, forro, piso e as duas folhas listados dentro.

**As duas opcoes novas de `DoorFactory`** (`frame: false` e `outline: false`)
nascem DESLIGADAS-por-omissao, ou seja: sem elas a porta sai exatamente como as
6 do corredor e a de MEU QUARTO sempre foram. Nenhuma porta da casa mudou um
vertice. O galpao usa as duas porque ja tem batente e verga proprios (duas
molduras lado a lado se atropelariam no vao) e porque peca decorativa nao tem
contorno para acender.

**Licenca do pacote:** MIT (*Armazem PSX v1.0.0*) - sem exigencia de atribuicao,
diferente do carro.

**O que NAO mudou:** controles, HUD, interacao, colisao do interior, cutscenes,
dialogos, objetivos, iluminacao, a estetica PSX, o bloco do motor 3D, o gramado,
a mata, a nevoa, o telhado da casa, o carro e as doze pecas do quintal lateral.
Nenhum comodo, movel, textura ou numero de planta da casa foi tocado.

## CORRECOES DOS FUNDOS: grama no armazem, fim do cenario, mata e nevoa

Tres coisas pedidas na mesma rodada, todas no QUINTAL DOS FUNDOS (a faixa de
terreno atras da parede de fundo de MEU QUARTO, onde moram o carro e o
galpao). Nenhum sistema novo entrou no jogo: as tres usam fabricas que ja
existiam, pelo mesmo caminho e com a mesma convencao de ancora do resto da
vista externa.

### 1. Grama dentro do pequeno armazem, atravessando o chao dele

O gramado alto dos fundos (`GrassFieldFactory`) sorteava moita na faixa de
terreno INTEIRA, inclusive embaixo do galpao: as laminas subiam por dentro e
furavam o piso de madeira dele.

O conserto e o mesmo que os quatro comodos novos e a varanda ja usavam: a
pegada da construcao entra na lista de exclusoes e a moita **nem chega a ser
sorteada** ali - nada e removido depois, nada e testado por quadro.

- `scenes/corridor-config.js`: o galpao ganhou duas linhas de dados -
  `keepGrassOut: true` (esta peca tem piso proprio) e `grassInset: 0.45` (a
  caixa da peca mede o TELHADO, e 45 cm de desconto poem a trava na PAREDE:
  a grama cresce por baixo do beiral, sem faixa pelada em volta e sem uma
  lamina do lado de dentro). Peca nova com piso proprio nos fundos so
  precisa dessas linhas.
- `scenes/corridor-scene.js`: o bloco das pecas dos fundos agora roda ANTES
  da vegetacao e monta duas listas de retangulos - `backyardGrassKeepOut`
  (so quem tem piso) e `backyardFootprints` (todas as pecas, para a mata e a
  nevoa). E a unica mudanca de ordem; as pecas continuam montadas exatamente
  como antes.

Medido no proprio codigo da fabrica, com a semente do gramado dos fundos:
**51 moitas nasciam dentro do galpao** (77 encostando nele). Depois da
correcao: **zero**, e nenhuma lamina alcanca a parede.

### 2. O fim do cenario (o void atras do armazem)

Todo chao externo do jogo e um remendo quadrado de 60 x 60 encostado do lado
de fora da parede de UMA JANELA. Nenhuma janela olha para os fundos, entao
atras da casa o unico chao era a faixa estreita do remendo sob a casa (da
largura da construcao): passando do galpao, para os lados, a grama acabava e
aparecia o fundo da cena.

- `scenes/corridor-scene.js`, bloco Chao dos FUNDOS ampliado: um remendo
  novo de `ExteriorFactory.createUnderHouseGround` (2 triangulos, 1 draw
  call, a MESMA textura e os MESMOS materiais de grama de noite e de dia)
  cobrindo o fundo do terreno inteiro - 60 metros para frente, na largura
  dos remendos das duas fachadas laterais somadas, sem canto sobrando entre
  eles. Ele nasce 2 cm ABAIXO do chao em que o carro e o galpao se apoiam,
  entao nao e coplanar com nada (sem z-fighting) e passa por baixo do piso
  do galpao: de dentro dele continua se vendo o piso de madeira.

### 3. Arvores, nevoa e grama preenchendo o terreno novo

- **Mata dos fundos**: `TreeForestFactory` ancorada na parede de fundo, com
  a mesma clareira de 6 metros de gramado livre em volta da casa. A fabrica
  ganhou a opcao `lateralLimit` (gemea da que o gramado ja tinha): a mata
  dos fundos cobre 18 metros para cada lado, o que fecha o horizonte de quem
  esta no quintal sem plantar uma terceira arvore em cima do que as
  florestas das duas fachadas laterais ja cobrem.
- **Nevoa dos fundos**: `FogVolumeFactory` na mesma ancora, com as mesmas
  fatias horizontais e tufos de bruma das janelas.
- **Grama sem falhas**: o gramado dos fundos deixou de ser um remendo
  estreito (so a largura da casa) e passou a usar a largura cheia do
  terreno, como os das janelas. Era ali que apareciam as areas de chao sem
  grama: pedacos onde o meio-disco de nenhuma das tres janelas chega. Custo
  do campo cheio: ~1650 moitas instanciadas, 7 draw calls de dia e 3 de
  noite (o campo estreito tinha 418). Para reduzir num aparelho fraco, basta
  devolver um `lateralLimit` na chamada - nada mais depende disso.

Nem a mata, nem a nevoa, nem a grama entram na casa, no galpao ou no carro:
todas usam retangulos de exclusao com o alcance REAL da instancia (copa,
moita ou fatia) como margem, exatamente como as camadas das janelas.


## Doze pecas decorativas novas em MEU QUARTO (mesa de xadrez, cadeira de balanco, plantas, mesa de canto, mesa de taverna + 5 garrafas, sofa)

Seis pacotes `.glb` enviados pelo jogador, todos com o pedido: "posicione em algum
lugar dentro do QUARTO PS1, caso eu nao goste da posicao, eu posso alterar com o
editor depois. Sao apenas itens decorativos, sem interacoes, (Por enquanto)" e
"use o mesmo sistema, nao precisa criar algo novo".

**O que virou o que.** Dois pacotes vinham com mais de uma peca dentro, e o pedido
foi explicito: entram como modelos INDIVIDUAIS, para o Editor mexer em cada um
sozinho. Entao:

| pacote | virou | arquivo em `assets/models` |
|---|---|---|
| `psx-chess-table` | mesa de xadrez | `chess_table_psx.glb` |
| `rocking_chair_psx_threejs` | cadeira de balanco (malha `_opt`, 34.594 tris) | `rocking_chair_psx.glb` |
| `psx_plantas` | canteiro + vaso oval (2 pecas) | `plant_bed_psx.glb`, `round_pot_psx.glb` |
| `psx_night_table` | mesa de canto | `side_table_psx.glb` |
| `psx-tavern-table` | mesa + as 5 garrafas (6 pecas) | `tavern_table_psx.glb`, `tavern_bottle_01..05_psx.glb` |
| `psx_sofa` | sofa (LOD 1, 8.000 tris) | `sofa_psx.glb` |

Dois pacotes precisaram de conversao antes de entrar:

- **A mesa de taverna** vinha com as 5 garrafas COLADAS na mesa. O pacote trazia
  `extras/tavern_table_psx_separated.glb` com as 6 pecas ja separadas em nos
  diferentes; cada no virou um `.glb` proprio, recentralizado no centro da base
  (X/Z) com o pe em Y = 0, como todas as outras pecas do jogo. Nenhum vertice foi
  mexido.
- **O sofa** nao trouxe `.glb` nenhum: so o formato proprio `.psxm` do pacote e um
  leitor em modulo ES. Em vez de trazer um SEGUNDO carregador para dentro do jogo,
  o `.psxm` foi convertido para `.glb` (mesma geometria, mesmos UVs, textura
  `sofa_albedo_256.png` embutida). Assim o caminho de import continua sendo UM so.
- Os dois `.glb` do pacote de plantas exigiam a extensao `KHR_mesh_quantization`.
  Foram reescritos com posicao/normal em float32 (mesmos valores que o loader
  calcularia), para o arquivo nao depender de extensao nenhuma - igual a todos os
  outros modelos daqui.

**Mesmo sistema de sempre.** Uma fabrica por peca em `models/` (doze arquivos
novos), cada uma carregando o `.glb` pelo MESMO `THREE.GLTFLoader` do resto do
jogo, com o MESMO `normalizeTextures` (nearest, sem mipmap, encoding linear) e a
MESMA convencao de espaco local (X/Z no centro da base, Y = 0 no chao, frente em
+Z). Nenhum carregador novo, nenhum shader novo, nenhum segundo three.js: os
runtimes PSX que vinham nos pacotes NAO entraram, pelos mesmos motivos ja escritos
em `models/fern-pot-factory.js` (eles ignoram as luzes da cena e exigiriam um
segundo three.js na pagina).

**Como sao posicionadas.** Nao ganharam um array e um bloco por peca como a
mobilia antiga: entram por uma lista GENERICA, `RoomConfig.props`
(`scenes/room-config.js`), lida pelo bloco "Pecas decorativas soltas" de
`scenes/room-scene.js` - o MESMO desenho que as pecas do quintal ja usavam em
`sideYard.props`/`backYard.props`. Cada linha tem `model`, `id`, `x`, `z`,
`rotationY`, `elevation` e `solid`. Peca nova = uma linha na lista + uma linha na
tabela `ROOM_PROP_MODELS`.

**Sem interacao.** Nenhuma delas entra em `interactables`: sem contorno, sem
prompt de "Interagir", sem dialogo, sem animacao, sem som. Entram em `solids` so
para o jogador nao atravessar elas andando; as cinco garrafas em cima da mesa
ficam de fora (`solid: false`), porque a colisao do jogo e um AABB sem eixo Y e
elas viariam parede invisivel no ar - mesmo raciocinio do trofeu em cima da
estante.

**Posicoes.** Escolhidas por conta propria, so respeitando: nao sobrepor nada do
que ja estava no quarto, nao tampar o vao da porta e deixar livre o ponto onde o
jogador nasce. A mesa de taverna com as garrafas, o canteiro e o vaso ficaram no
canto do fundo a esquerda; a mesa de xadrez na frente da estante; a cadeira de
balanco e a mesa de canto na frente a esquerda, viradas para o meio do quarto; e o
sofa encostado na parede direita, debaixo da janela, no vao que sobrava entre a
mesinha de TV e a cama. As doze aparecem na hierarquia do Editor com nome em
portugues (ver `NAME_LABELS` em `editor/editor-registry.js`) e podem ser movidas,
giradas e escaladas uma por uma - o que o Editor salvar vale por cima destes
numeros, sem tocar em nenhum arquivo.

## QUARTO 01 e QUARTO 02: teto rebaixado, luminária e interruptor

Três pedidos numa passada, todos nos dois quartos laterais do corredor e SÓ
neles. **Nenhum sistema novo entrou, nenhum modelo novo entrou e nenhuma linha
de lógica foi escrita:** as três coisas são DADO em `HouseConfig.sideRooms`
(`scenes/house-config.js`), pelos MESMOS campos que a COZINHA e o BANHEIRO já
usavam. Por isso CORREDOR, MEU QUARTO, COZINHA, BANHEIRO, varanda, quintal e
exterior não mudaram um pixel.

- **Teto mais baixo, sem tocar no teto que existia** (`loweredCeiling:
  { height: 2.7 }` nos dois). Era a condição literal do pedido ("ao invés de
  descer o teto que já existe, crie uma nova camada de teto, que seja mais
  baixa") e é exatamente o que o campo faz: o teto de 4.2
  (`CorridorConfig.height`) continua onde sempre esteve, com o mesmo material,
  as mesmas medidas e a mesma malha, e o que entra é um SEGUNDO plano por baixo
  dele (bloco "Teto REBAIXADO" em `scenes/side-room-scene.js`). Os dois quartos
  eram 7.7 x 4.8 com pé-direito de galpão: agora leem como dormitório.
- **2.7, e não 2.65 (cozinha) nem 2.6 (banheiro).** Dormitório é o mais alto
  dos três numa casa de verdade. Sobra 1.10 m acima da cabeça do jogador
  (`eyeHeight = 1.6`), dá para atravessar o quarto inteiro sem raspar, e ainda
  fica 26 cm acima do topo da moldura da porta (2.44) - a própria cena avisa no
  console e sobe o forro se alguém escrever abaixo do limite de segurança. **Os
  dois quartos com o MESMO número de propósito:** são a mesma caixa na mesma
  parede, e forros em alturas diferentes leriam como erro de construção ao
  passar de um para o outro.
- **Nenhuma fresta.** As quatro paredes de cada quarto continuam subindo
  inteiras até 4.2 (nada nelas mudou), então o vazio entre os dois tetos fica
  lacrado; o vão da porta termina em 2.28 e a moldura em 2.44, os dois ABAIXO
  do forro novo, então ele nem aparece do corredor. Por cima da casa quem tampa
  é o telhado. Nenhuma parede, nenhum vão, nenhuma fachada e **nenhuma caixa de
  colisão** mudou de número.
- **A luminária é a MESMA das outras três** (`LampFactory.createCeilingLamp`,
  `models/lamp-factory.js`) - a mesma do corredor, da cozinha e do banheiro,
  sem nenhum modelo novo. Uma por quarto, no centro exato do cômodo
  (`x: 0, z: -2.4`). Sem `height` na declaração ela pendura no forro NOVO, não
  no antigo: quem decide isso é `fixtureCeilingHeight`, que passa a valer o teto
  rebaixado assim que ele existe. Bulbo em ~2.24. A `PointLight` de cada uma já
  nasce limitada à zona de luz do próprio quarto (`materials/light-zones.js`
  monta as caixas a partir do `bounds` que cada cômodo já publicava), então a
  luz de um quarto não vaza para o outro nem para o corredor - **zero linha nova
  para isso.**
- **O interruptor é o MESMO das outras três** (`SwitchFactory.createSwitch`,
  `models/switch-factory.js`). Um por quarto, e o controlador dele só conhece as
  luminárias DAQUELA zona: acende e apaga só a luz do próprio quarto, sem tocar
  em nenhuma outra luz da casa. Luminária e interruptor nascem os dois ligados,
  então não existe estado dessincronizado no primeiro toque.
- **Ao lado da porta, pelo lado de DENTRO, e o lado não foi sorteado.**
  `wall: "entrada"` é a parede da porta, e o `placeOnWall()` da cena encosta a
  espelhinha na face interna dela (folga de 5 mm), virada para dentro do quarto.
  `along: 0.95`: nos dois quartos a porta cai no centro exato dessa parede
  (`doorLocalX = 0`) e a moldura termina em 0.79
  (`DOOR_WIDTH/2 + FRAME_THICKNESS`), então a espelhinha de 9 cm começa 11 cm
  depois da madeira, sem invadir um pixel dela. E +0.95 é o lado da MAÇANETA: a
  dobradiça cai em `x = -0.57` (o `HINGE_X` da porta depois do giro de 90 graus
  da parede lateral), então a folha aberta nunca passa na frente do interruptor.
  `y: 1.15`, a mesma altura da cozinha.
- **A fala de bloqueio dos dois interruptores**
  (`objectives/objective-config.js`). Na etapa `abrir-janelas` o `byKind` de
  `lightSwitch` é a fala do ABAJUR do MEU QUARTO ("abrir-janela-primeiro"), que
  não faz sentido na boca de quem está do outro lado da casa - por isso
  `interruptor-quarto-01` e `interruptor-quarto-02` ganharam entrada por ID com
  `precisa-abrir-janelas`, exatamente como o interruptor do corredor, da
  cozinha, do banheiro e da varanda já tinham. Sem essas duas linhas o jogador
  ouviria a fala errada. Nenhuma resposta existente foi alterada.
- **Dá para afinar tudo sem tocar em código.** Os dois forros entram na
  hierarquia do Editor como "Teto rebaixado do quarto 01" e "Teto rebaixado do
  quarto 02" (`NAME_LABELS` em `editor/editor-registry.js`) e podem ser movidos
  com o gizmo; a altura também é um número só no dado. Tirar a chave
  `loweredCeiling` de um dos quartos devolve ele ao pé-direito antigo.
- **O que NÃO mudou:** os dois quartos continuam sem MOBÍLIA nenhuma (não
  estava no pedido), a textura de parede deles continua o lambri claro de
  sempre, o piso continua o de madeira, e o resto do jogo - corredor, MEU
  QUARTO, cozinha, banheiro, exterior, telhado, colisão, controles, HUD,
  cutscenes, diálogos, objetivos e a estética PSX - está intacto.

## Atualizacao: janelas novas (COZINHA, QUARTO 01, QUARTO 02) e o CLARAO de volta

- **Tres janelas novas**, nos lugares circulados nas imagens de referencia, todas
  saindo da MESMA fabrica das tres que ja existiam (`models/window-factory.js`):
  moldura de madeira, cortina interativa com som, vidro. Nenhum modelo novo.
  - COZINHA: parede de fundo, em cima da bancada da pia (`along` 0.5, centro em
    1.8 - peitoril logo acima dos 0.9 da bancada, alto logo abaixo do forro
    rebaixado de 2.65).
  - QUARTO 01 e QUARTO 02: o mesmo ponto nos dois (`along` -1.5, centro em 1.4),
    ao lado da cama - o valor original era -2.4 e caia atras da cabeceira; ver a
    secao "Correcao: as janelas dos quartos estavam atras da cama" no fim deste
    arquivo.
  - Sao **dados**, nao codigo: a lista `windows` de cada comodo em
    `scenes/house-config.js`, lida pelo bloco novo de `scenes/side-room-scene.js`.
    Comodo que nao declarar `windows` continua com a parede cheia de sempre - o
    BANHEIRO nao mudou um pixel. O vao e recortado de verdade na parede (e no
    revestimento externo, que reaproveita a mesma geometria).
- **Vista externa da fachada esquerda** (`scenes/corridor-scene.js`): as janelas dos
  dois quartos olham para um lado da casa onde nao existia terreno nenhum. Entrou
  a mesma pilha da direita (chao, gramado, mata, nevoa, chuva), **uma so** para os
  dois quartos, ancorada na fachada do corredor e com a pegada dos comodos
  excluida. A COZINHA nao precisou de nada: a fachada direita ja tinha vista.
- **O CLARAO voltou** (`effects/lightning-storm.js`). O efeito nao estava
  desregulado: ele havia sido REMOVIDO junto com a troca do modelo de janela, e
  sobrara so um `stopStorm()` vazio que as duas cenas continuavam chamando. Agora:
  - Uma tempestade **unica** para a casa inteira - todas as janelas piscam no mesmo
    quadro, porque relampago e evento do ceu.
  - Surtos de 1 a 3 piscos, a cada 7-19 segundos, com subida instantanea.
  - **Uma** PointLight no jogo inteiro, que vai para a janela mais proxima do
    jogador no instante do relampago (PointLight encarece todo material iluminado
    da casa; seis delas por 0,2 segundo de efeito seria caro do jeito errado). O
    brilho do VIDRO, esse acontece em todas as janelas: e um quad aditivo, nao luz.
  - Nao vaza para o comodo vizinho: a luz nasce dentro do comodo e
    `materials/light-zones.js` a prende ali, igual a luminaria de teto.
  - Cortina fechada tapa o brilho do vidro (por profundidade, sem teste nenhum) e
    deixa passar 45% da luz - relampago de verdade acende quarto de cortina
    fechada, e o primeiro objetivo da noite ainda e abrir as janelas.
  - Vale para as tres janelas antigas e para as tres novas, e agora liga/desliga
    nos DOIS sentidos (`setDaytime`), entao o controle de HORARIO do Editor volta
    para a noite sem perder o efeito.
- O objetivo "abrir as janelas" continua contando so as tres antigas
  (`areAllWindowsOpen` em `scripts/main.js`): durante ele as portas dos comodos
  novos estao bloqueadas, entao exigir as seis travaria o jogo.

## Atualizacao: as duplicatas param de sumir quando o original e excluido

**O sintoma.** Modelos duplicados no Editor, posicionados a mao e salvos,
voltavam a desaparecer a cada atualizacao do jogo. Sempre os mesmos tres
pacotes do MEU QUARTO: a **mesa de canto**, o **canteiro de plantas** e a
**mesa de taverna com as cinco garrafas** - exatamente os modelos cujos
ORIGINAIS haviam sido excluidos no Editor, sobrando so as duplicatas. Ao
todo 15 copias salvas em `data/editor-overrides.json` que nunca chegavam
a nascer.

**A causa (duas, na verdade).** Nenhuma tinha a ver com os modelos.

1. **O objeto excluido virava um buraco negro.** Excluir tira o objeto da
   arvore da cena (`removed: true`), mas o objeto 3D dele continua em
   memoria - e continua recebendo os nos do `.glb`, que chega um pouco
   DEPOIS. Como a varredura do Editor partia so de `scene.root`, essas
   pecas nunca entravam no registro: a origem ficava valendo "um no" para
   sempre. E uma copia so nasce quando a origem esta inteira (o `count`
   guardado no registro dela), justamente para nao nascer pela metade.
   Ou seja: origem eternamente incompleta, copia eternamente sem nascer.
   E variava de um boot para o outro porque dependia de qual `.glb`
   ganhava a corrida contra o carregamento das alteracoes salvas.
2. **O plano B do delta encaixava na copia.** Quando o id de um objeto
   nao e achado, o Editor tenta reencontra-lo pelo `hint` (nome + tipo +
   posicao de fabrica). Uma copia tem os TRES iguais aos do original, e
   nada impedia que ela fosse escolhida - inclusive para receber o
   `removed: true` do proprio original. Isto e: o original apagado
   apagava a copia no lugar dele.

**A correcao** (`editor/editor-registry.js`, `editor/editor-clones.js`,
`scripts/main.js`):

- `syncRemoved()`: a varredura ganhou uma segunda frente e passa DENTRO
  do que foi excluido, so para aprender o nome das pecas que chegam
  depois. O objeto excluido continua fora da cena: nao e desenhado, nao
  recebe toque, nao volta para a lista de interativos (peca que chega
  atrasada tambem e tirada dela).
- `resolveByHint()` nunca mais aceita uma COPIA como plano B, e a
  resolucao por hint agora e LEMBRADA por cena (`hintMap`): a mesma
  alteracao salva nao muda de destino de uma passada para a outra.
- A espera de uma copia pela origem ganhou prazo (`WAIT_FOR_MODEL_MS`,
  6 s): se a origem mudou de tamanho numa atualizacao e nunca vai bater
  o numero guardado, a copia nasce com o que existe e se refaz sozinha
  se o resto ainda chegar. Antes, esse caso significava copia invisivel
  para sempre, sem nenhum aviso.
- As passadas de boot vao ate 20 s (eram 5 s) e param sozinhas quando
  nao ha mais copia pendente (`EditorClones.pendingCount()`), para o
  celular carregando modelo pesado nao perder as copias por atraso.

**As regras, agora explicitas.** Excluir e permanente ate restaurar, e
nao alcanca as copias daquele objeto. Duplicar cria um objeto NOVO e
permanente, que fica onde foi posto ate o proprio jogador apaga-lo. As
duas coisas continuam sendo delta: nenhum arquivo original do jogo foi
tocado, nenhum modelo foi reposicionado a mao e
`data/editor-overrides.json` nao mudou uma linha - as 15 copias e as
posicoes delas ja estavam la, e agora sao carregadas.

## Correcao: as janelas dos quartos estavam atras da cama

**O problema.** As janelas novas do QUARTO 01 e do QUARTO 02 nasceram em
`along` -2.4 da parede de fundo, e a cama que o jogador pos nos dois quartos
pelo Editor encosta a cabeceira nessa MESMA parede. No X local do comodo a cama
ocupa de -3.84 a -2.22 e o vao de 1.2 abria de -3.0 a -1.8: 0.73 do vidro
ficava atras do movel - o que a foto mostrava.

**O que mudou (dois numeros, nenhum modelo novo).**

- `scenes/house-config.js`: `along` das duas janelas de -2.4 para **-1.5**. A
  janela desliza 0.9 para o lado aberto do quarto (passa a ir de -2.1 a -0.9),
  com 12 cm de folga da cama. Para o outro lado nao havia espaco: a cama para a
  1 cm da parede lateral. Os dois quartos seguem com o MESMO numero, como antes.
- `data/editor-overrides.json`: a prateleira de plantas do QUARTO 01
  (`plantbedpsx-copia`) andou 32 cm na mesma parede. Motivo: entre a cama e ela
  sobravam 1.16 m e a janela precisa de 1.2 - faltavam 4 cm. Agora a prateleira
  comeca em -0.80 e sobram 10 cm de parede entre as duas pecas. A do QUARTO 02 ja
  estava do outro lado (+0.62) e nao foi tocada.

**O que NAO mudou.** Altura (`centerY` 1.4, peitoril em 0.6), o modelo da janela
(a mesma `models/window-factory.js`, com cortina interativa e som), o recorte do
vao na parede e no revestimento externo (derivados de `along`, se ajustam
sozinhos), o clarao do relampago, a cozinha, o banheiro, o MEU QUARTO, o
corredor, a cama (nao saiu do lugar - o pedido foi mover a JANELA) e todo o
resto do jogo.

## Correcao: as colisoes SOLTAS (a parede invisivel sem nada ali)

**O problema.** A correcao anterior fez a caixa de colisao acompanhar o
objeto (mover, girar, escalar, duplicar, excluir), mas ela cuidava de para
ONDE a caixa vai - nunca perguntou se a caixa esta em cima de ALGUMA COISA.
Sobraram retangulos solidos jogados no meio do comodo, sem nenhum modelo
dentro deles, barrando o jogador. Duas origens, as duas presentes no cenario
de hoje:

1. **O objeto foi mexido POR DENTRO.** O Editor deixa abrir o movel e
   arrastar/girar/escalar uma peca no fundo da arvore, e e o que esta salvo
   em `data/editor-overrides.json`: `stovepsx/stove-psx` (o fogao andou 7 m
   por dentro), `gascylinderpsx/gas-cylinder-psx`, `yardtrashcanpsx/...`,
   `porchplantpsx/plant-copia`, `escrivaninha-quartos-gaveta/grupo-1eg8nj`.
   A caixa segue a ANCORA (o primeiro no com geometria propria ou com mais
   de um filho); mexer numa peca ABAIXO dela movia o desenho e deixava a
   caixa parada - parede invisivel no lugar antigo, movel atravessavel no
   lugar novo. Exatamente o problema que mover o grupo de fora ja nao tinha
   mais.
2. **A caixa nasceu errada.** Ela sai dos numeros dos arquivos de
   configuracao, nunca do modelo: medida trocada, eixo trocado depois de um
   giro, modelo que mudou de tamanho. Cada um desses deixa uma caixa solta
   num canto qualquer, e nada no jogo notava.

**A regra nova (uma so, em `scripts/collision.js`).** Uma caixa so segura o
jogador se ela ENCOSTAR na pegada do que esta realmente desenhado dentro do
dono - a uniao das malhas, vista de cima, com a folga de um raio de jogador
(0.35, o mesmo `playerRadius` de `scenes/corridor-config.js`). Fora disso:

- se a caixa JA encostou alguma vez, ela e **recolocada** em cima da pegada,
  guardando a mesma posicao e o mesmo tamanho relativos - e assim a colisao
  passa a acompanhar tambem a peca de dentro, sem ninguem precisar adivinhar
  qual no foi arrastado;
- se ela nunca encostou em nada, e **caixa fantasma e para de valer**.

Nada disso e permanente: a pergunta se refaz a cada ~meio segundo, entao
modelo .glb que chega tarde, objeto restaurado ou peca devolvida ao lugar
trazem a colisao de volta sozinhos.

**Na vista de COLISAO do Editor** (`editor/editor-mode.js`) as caixas agora
tem duas cores: **rosa** = solido de verdade, **azul** = caixa solta que foi
desligada. A azul continua sendo desenhada de proposito, para se ver ONDE o
cenario tinha parede invisivel. Ao ligar a vista, um aviso diz quantas sao;
no console, `Collision.audit()` lista dono e coordenadas de cada uma.

**Custo.** A pegada de um dono e calculada no maximo a cada 250 ms e fica
guardada NELE (as varias caixas de uma mesma parede dividem a conta), e cada
caixa refaz a pergunta a cada ~500 ms, nunca por quadro. Dono que se move e
conferido na hora em que se move.

**O que NAO mudou.** OCULTAR continua sem mexer em colisao (objeto oculto
mantem as malhas na arvore, logo mantem a pegada e continua solido). As
paredes, que sao PLANOS de espessura zero com uma fatia fina colada nelas,
encostam por definicao e seguem solidas. A caixa que a CENA dirige por
quadro - a folha da porta compartilhada, que vai para 1e6 e libera o vao -
continua sob o comando da cena: ela e conferida, mas nunca movida, senao
abrir a porta trancaria o jogador na passagem. Nenhum modelo foi
reposicionado, nenhuma caixa foi apagada dos arquivos e
`data/editor-overrides.json` nao mudou uma linha: o cenario e o mesmo, so
sem as paredes invisiveis.
