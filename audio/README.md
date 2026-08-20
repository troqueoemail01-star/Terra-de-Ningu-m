# audio/

Pasta reservada para os arquivos de som do jogo (ambiente, passos, portas,
efeitos de sussurro, etc.).

## Passos do player (`footstep-audio.js` + `passos/`)

Primeiro efeito sonoro implementado. Toca gravações reais de passo,
carregadas como `AudioBuffer` (Web Audio API) a partir dos arquivos em
`audio/passos/madeira/` e `audio/passos/tapete/`. Cada passo é um evento
sonoro próprio, nunca um loop tocando continuamente.

- `madeira`: som mais seco e estalado (piso do corredor e do quarto).
  Vem de uma gravação de referência de passos em piso de madeira
  fornecida pelo dev: os golpes individuais foram recortados um a um,
  limpos (corte de silêncio/ruído nas pontas, remoção de grave abaixo
  de 35Hz) e normalizados a -1dB de pico. Resultado: 6 variações
  (`passo-01.wav` a `passo-06.wav`), sorteadas a cada passo (nunca a
  mesma duas vezes seguidas — ver `pickBuffer()`).
- `tapete`: som mais leve, abafado e sem impacto (tapete central do
  corredor e tapete circular do quarto). Derivado das mesmas 6
  gravações de madeira, processadas para soar mais macio: filtro
  passa-baixa (~950Hz, corta o estalo agudo da madeira), ataque
  suavizado (rampa de ~14ms em vez do golpe quase instantâneo),
  decaimento um pouco mais longo, uma camada bem discreta de ruído
  filtrado em banda média-aguda por cima (textura de fibra/tecido) e
  volume final normalizado a -8dB de pico (mais baixo que a madeira).
- A superfície é detectada automaticamente a cada quadro a partir da
  posição do jogador (`getSurfaceAt(x, z)` em `scenes/corridor-scene.js` e
  `scenes/room-scene.js`), sem precisar de nenhum botão.
- O ritmo de cada passo é sincronizado com o mesmo relógio de fase que já
  dirige o head bob da câmera (`walkPhase`, em `scripts/player-controller.js`)
  — por isso já nasce mudo quando o jogador está parado, travado contra uma
  parede, ou numa cutscene/diálogo que bloqueia o movimento.
- Cada reprodução ainda recebe uma pequena variação aleatória extra de
  afinação (`playbackRate`) e volume por cima do arquivo, pra 6
  variações por superfície não soarem repetitivas.
- Lê o volume de "Efeitos sonoros" ao vivo de `scripts/game-settings.js`
  (`getSfxVolume()`), igual a qualquer outro som que vier a ser adicionado.
- Os 12 arquivos (6 madeira + 6 tapete, ~340KB no total, .wav sem
  compressão — arquivos pequenos o bastante pra não valer a pena
  perder precisão de início do transiente com um codec com padding,
  tipo mp3) são buscados via `fetch()` e decodificados assim que o
  `AudioContext` existe, em paralelo com a cutscene de entrada — não
  esperam o primeiro toque do jogador, só a *reprodução* espera (ver
  comentário de `attachUnlockListener` em `footstep-audio.js`).

Uma versão anterior deste sistema sintetizava os passos na hora (ruído
filtrado via Web Audio, sem nenhum arquivo de áudio), porque não havia
nenhuma gravação disponível ainda. Se no futuro for necessário trocar de
novo — outra gravação de referência, mais variações, etc. — o ponto de
entrada é só `AUDIO_FILES` no topo de `footstep-audio.js`; o resto do
sistema (detecção de superfície, sincronismo com o andar, volume)
continua igual.

## Sequência telefônica (`phone-audio.js` + `telefone/`)

Segundo efeito sonoro implementado, para a mini cutscene do telefone
(ver `cutscenes/phone-sequence.js`). Mesma arquitetura de fundo dos
passos (AudioBuffer via Web Audio, carregado uma única vez, volume
lido ao vivo), mas com dois grupos de som bem diferentes:

- `discagem.wav` e `chamando.wav` (dentro de `telefone/`): recortados
  de um único áudio de referência enviado pelo dev (uma ligação real,
  discagem + toque, MP3 160kbps). Convertidos para WAV mono sem
  compressão (mesmo motivo dos passos: evitar o padding de início que
  um codec com perdas, tipo MP3, introduziria — aqui importa ainda
  mais, porque o fim de `discagem.wav` precisa encadear direto no
  início de `chamando.wav` sem gap perceptível). `discagem.wav`
  (~2.77s) é só os tons de discagem, com um pequeno silêncio natural
  antes do primeiro tom. `chamando.wav` (~5.66s) vai da pausa logo
  depois da discagem até o fim do 2º toque completo — inclui essa
  pequena pausa antes do telefone começar a chamar, igual à ligação
  original. Cada um é tocado por `playDial()`/`playRinging()`, que
  devolvem uma Promise resolvida quando o som termina sozinho
  ("onended") — `cutscenes/phone-sequence.js` encadeia as duas
  (`playDial().then(playRinging).then(...)`) para saber quando avançar
  de etapa, então a duração da mini cutscene nasce automaticamente
  igual à duração real do áudio, sem nenhum tempo fixo "chutado" no
  código JS.
- `startIncomingRing()` / `updateIncomingRing()` / `stopIncomingRing()`:
  a SEGUNDA ligação do jogo (o Ravi é quem liga, na manhã seguinte)
  reaproveita o mesmo `chamando.wav` acima, agora em loop, tocando
  sozinho até o jogador atender — e, diferente de tudo o que vem
  antes, ele é POSICIONAL: o som sai do telefone da escrivaninha, não
  do "fone" do jogador. A câmera é registrada como ouvinte
  (`setListener`, chamado em `scripts/main.js` junto do mesmo registro
  já feito para as cortinas) e `updateIncomingRing()` roda uma vez por
  quadro dentro do loop principal, recalculando três coisas a partir
  de onde o jogador está e pra onde está olhando: volume (atenuação
  inversa por distância, com piso audível pra o toque nunca sumir de
  vez e deixar o jogador perdido), lado no estéreo (StereoPanner, pela
  projeção no vetor "direita" da câmera) e um passa-baixa que fecha
  com a distância — de longe o toque chega abafado, atravessando o
  corredor, e vai abrindo conforme o jogador se aproxima. Quando o
  telefone está atrás dele, o filtro fecha mais um pouco: estéreo puro
  não distingue frente de trás, e esse abafamento extra é o que dá
  essa dica ao ouvido sem precisar de HRTF. Todo parâmetro entra por
  `setTargetAtTime` com constante de tempo curta, então nada estala
  nem "zipa" enquanto o jogador anda. Sem listener registrado ou em
  navegador sem StereoPannerNode, o toque simplesmente soa
  centralizado — nunca deixa de tocar por causa disso. Os sons da
  primeira ligação continuam centralizados de propósito: eles tocam
  com a tela preta, com o fone já no ouvido do Kael.
- `playAnswered()`/`playHangup()`: sem gravação de referência para
  estes dois (o áudio enviado cobre só discagem + toque) —
  sintetizados na hora via Web Audio (oscilador senoidal com pitch
  caindo rápido, simulando o "thump" grave do gancho do telefone, por
  baixo de uma camada fina de ruído filtrado para a textura do
  contato/plástico), mesmo princípio da versão antiga de passos
  citada acima. `playAnswered()` é mais curto e agudo (clique único);
  `playHangup()` é um pouco mais grave e longo (fone pousado com mais
  peso). Se no futuro surgir uma gravação real para estes dois, basta
  trocar a implementação de `playClick()` por um buffer carregado,
  igual ao padrão de `discagem`/`chamando` — o resto
  (`cutscenes/phone-sequence.js`) não precisa mudar, já que só chama
  `playAnswered()`/`playHangup()` sem saber como o som é gerado.

## Cortinas das janelas (`curtain-audio.js` + `cortinas/`)

Terceiro efeito sonoro implementado, para a interação de abrir/fechar
as cortinas (as duas janelas do corredor e a janela do cenário "MEU
QUARTO"). Mesma arquitetura dos dois anteriores (AudioBuffer via Web
Audio, carregado uma única vez, volume de "Efeitos sonoros" lido ao
vivo), com um arquivo só:

- `cortinas/cortina.wav` (~0,68s): recortado do áudio de referência
  enviado pelo dev ("Curtains sound effect", MP3 estéreo 48kHz).
  Processo: cortado o padding/silêncio do começo (o transiente passa a
  valer já no primeiro sample — é isso que faz o som nascer junto com
  a animação, sem atraso), cortada a cauda inaudível do fim, removido
  o grave abaixo de 45Hz (mesma limpeza dos passos), fades curtos nas
  pontas (4ms/35ms) para não estalar e pico normalizado a -3dB.
  Convertido para WAV mono 16-bit: sem o padding de início de um codec
  com perdas, e mono é o que o `StereoPannerNode` espera para
  posicionar o som (ver abaixo).
- **O mesmo arquivo serve para abrir e para fechar** — é o mesmo
  tecido correndo no varão nos dois sentidos. Para não soar como um
  sample colado duas vezes quando o jogador abre e fecha seguidamente,
  cada reprodução recebe uma variação aleatória estreita de afinação
  (±3%, faixa curta de propósito: mexer muito mudaria a duração e o
  som deixaria de casar com a animação) e de volume (±5%).
- **Sincronismo**: o disparo mora dentro de `toggleCurtain()`, em
  `models/window-factory.js` — o mesmo ponto em que o estado alvo da
  cortina muda, que é aplicado pelo `update(delta)` da janela já no
  quadro seguinte (animação de 0.8s, ver `CURTAIN_ANIM_DURATION`).
  Nenhum `setTimeout` nem atraso programado no meio: interação →
  movimento → som saem juntos, tanto ao abrir quanto ao fechar. A
  duração do efeito (~0,68s) cobre praticamente todo o percurso do
  tecido, terminando junto com a desaceleração final do easing.
- **As três janelas de uma vez**: todas nascem da mesma
  `WindowFactory.createWindow()`, então esse único ponto de disparo já
  cobre as duas do corredor e a do quarto — nada precisou mudar em
  `scenes/corridor-scene.js`, `scenes/room-scene.js` nem no switch de
  interação de `scripts/main.js`.
- **Posição**: `CurtainAudio.setListener(camera)` é chamado uma vez em
  `scripts/main.js`; a cada toque, o módulo lê a `matrixWorld` da
  câmera e a posição-mundo da janela para calcular o lado
  (`StereoPannerNode`, até ±0.65) e uma atenuação leve por distância
  (cheio até 1m, caindo até 55% a 3,5m). Assim o som parece vir da
  janela que o jogador está manipulando, e não da cabeça dele. Sem
  listener ou sem suporte a `StereoPannerNode`, toca centralizado —
  nunca deixa de tocar por causa disso.
- **Volume**: classificado como efeito sonoro (nunca música/ambiente)
  — `getSfxVolume()` de `scripts/game-settings.js`, com um ganho
  relativo baixo (0.5) por cima, para ficar discreto como pede um
  terror em primeira pessoa.
- Abrir e fechar a MESMA cortina em sequência muito rápida corta o som
  anterior daquela janela com um fade de 40ms antes de começar o novo
  (uma "voz" por janela), em vez de somar os dois e dobrar o volume.
  Janelas diferentes continuam podendo soar ao mesmo tempo.

Os controles de volume (Música e Efeitos sonoros, separados) já existem
na tela de Configurações (`menu/settings.js`) e ficam salvos em
`window.GameSettings` (`scripts/game-settings.js`). Quando novos sons
forem adicionados aqui, o código novo só precisa ler
`getMusicVolume()`/`getSfxVolume()` (0-100) para aplicar o volume certo —
não é necessário criar um novo sistema de volume do zero.

Sugestão de organização para os próximos sons:

```
audio/
  ambiente/   -> loops de fundo (zumbido de luz, vento, silêncio tenso)
  passos/     -> sons de passo do jogador (madeira/, tapete/ — já existem)
  telefone/   -> discagem e toque da ligação inicial (já existe)
  cortinas/   -> som das cortinas das janelas (já existe)
  portas/     -> ranger de portas, batidas
  sfx/        -> efeitos pontuais de susto
```


## Cutscene de abertura na estrada (musica, toque e xiado)

Ver `audio/road-cutscene-audio.js` - o terceiro pacote de som do jogo,
usado so pela cutscene de abertura (`cutscenes/road-cutscene.js`):

- `audio/musica/cutscene-estrada.mp3` - a musica enviada pelo jogador
  (21 s). Chegou como .wav estereo de 3,7 MB e foi convertida para MP3
  160 kbps (~420 KB, mesma duracao e mesmo conteudo) porque e o unico
  arquivo de audio longo do jogo: em .wav ela custaria mais que todos os
  outros sons somados. E a PRIMEIRA musica do jogo, entao e tambem o
  primeiro som a usar o volume de "Musica" das Configuracoes; todo o
  resto usa "Efeitos sonoros".
- O toque de telefone da ligacao de radio NAO e um arquivo novo: e o
  mesmo `audio/telefone/chamando.wav` das ligacoes da casa, tocado a
  partir de 1,1 s (pulando o silencio inicial do recorte) e com o trecho
  "toque + pausa" em loop, para os 3 segundos de toque serem 3 segundos
  de telefone tocando de fato.
- O xiado de radio que abre e fecha a ligacao e SINTETIZADO (ruido
  filtrado + estalo de squelch), como os cliques de gancho do telefone.

### Correções da cutscene: fade-out, volume de rádio e a estrada de terra

- **A música não é mais cortada.** Ela sai em **fade-out de 5s**
  (`fadeOutMusic`), começando no mesmo instante em que o xiado da ligação
  atendida toca. Para isso a ligação passou a entrar *antes* do fim da
  faixa: a cutscene lê a duração real do arquivo e conta de trás para
  frente (3s de toque + 5s de fade), então o fade termina exatamente onde
  a música acabaria sozinha. A rampa é exponencial (o ouvido ouve dB, não
  amplitude) e mora num nó de envelope separado do ganho que acompanha o
  slider de Música — mexer no volume durante o fade continua valendo e não
  desfaz a saída.
- **Música mais baixa** (`MUSIC_LEVEL = 0.55`): ela está tocando no rádio
  do carro, não é trilha por cima da cena.
- **`carro/estrada-terra.mp3`** (~105KB): o carro andando em chão de terra,
  recortado da gravação enviada pelo dev (78s). Foi usado o trecho estável
  (sem eventos marcantes), limpo abaixo de 35Hz e **fechado em loop de
  10,8s**: o fim foi cruzado com o começo em crossfade de potência
  constante, então a volta não tem emenda nem queda de volume. O arquivo
  guarda 1s de cauda antes e 1,5s de cabeça depois da região de loop, de
  propósito, para o padding do MP3 nunca cair dentro dela
  (`ROAD_LOOP_START`/`ROAD_LOOP_END`). Toca do primeiro ao último quadro da
  cutscene e sai em fade junto com o preto do fim.
- **Abafado** (`ROAD_MUFFLE_HZ`): o som acontece do lado de fora e o Kael
  está dentro do carro — passa-baixa em 780Hz (mata o cascalho estalando na
  lataria, sobra o ronco) e high shelf de -14dB em 2,2kHz para o agudo que
  ainda vaza pelo joelho do filtro.
