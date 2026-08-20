# EDITOR

Ferramenta de desenvolvimento. Camada de edicao/debug que roda POR
CIMA do jogo: usa a MESMA cena Three.js, a MESMA camera, o MESMO
renderer, os MESMOS modelos e o MESMO sistema de colisao do gameplay.
Nenhum sistema de renderizacao paralelo, nenhuma copia de geometria.

## Como abrir

Menu inicial, botao EDITOR. Ele fica separado dos botoes de jogo por
um traco divisorio e pela legenda ferramenta de desenvolvimento (ver
menu/menu.js e editor/editor.css). Pula a cutscene de introducao e
abre a gameplay ja em modo de edicao.

SAIR volta ao menu inicial. Se houver alteracao nao salva, aparece
SALVAR E SAIR / SAIR SEM SALVAR / CANCELAR.

## Controles

- Analogico (canto inferior esquerdo): andar e voar.
- Arrastar na tela: girar a camera (olhar em todas as direcoes).
- Toque rapido: seleciona o objeto. Tocar de novo no mesmo ponto
  desce um nivel na hierarquia (pega a peca dentro do conjunto).
- Botoes triangulo: subir e descer.
- VOO: para frente segue para onde a camera esta olhando.
- NO-CLIP: atravessa parede, porta, movel, chao e teto. Desligado, a
  colisao normal volta a valer (o mesmo scripts/collision.js do jogo).
- Gizmo: setas (mover), aneis (girar), cubos (escalar). Tamanho
  constante na tela e area de toque bem maior que o desenho.
- DUPLICAR: botao escrito por extenso, ao lado dos tres do gizmo.
  Fica apagado enquanto nada estiver selecionado. Ver a secao abaixo.
- EXCLUIR: vizinho do DUPLICAR, tambem por extenso. Sempre pergunta
  antes. Com um objeto ja excluido selecionado, o mesmo botao vira
  RESTAURAR. Ver a secao abaixo.
- HORARIO: botao ☾ NOITE / ☀ DIA, ao lado de VOO e NO-CLIP. Vira o
  cenario de noite para dia e de volta, na hora. Ver a secao abaixo.

## Paineis

- Esquerda (HIERARQUIA): arvore do cenario, pesquisa por nome e
  filtros rapidos (Tudo / Luzes / Interativos / Copias / Excluidos /
  Alterados). Objeto excluido continua na arvore, riscado: e por ali
  que se acha e se restaura o que sumiu de vista sessoes atras.
- Direita (PROPRIEDADES): so mostra o que existe naquele objeto.
  Transformacao sempre; Luz so em luz; Material e Textura so em malha;
  Interacao so em objeto interativo; Copia so em objeto duplicado.
  Objeto excluido mostra so o aviso, o RESTAURAR e o que esta salvo -
  nao existe posicao nem material para ajustar em quem saiu da cena.

Os dois deslizam para fora da tela pelas abinhas nas bordas, para o
cenario inteiro ficar livre para o dedo.

## Duplicar (copias)

Selecione e toque em DUPLICAR (barra de ferramentas) ou no botao
Duplicar do painel de propriedades. A copia:

- nasce IGUAL ao que esta na tela - posicao, rotacao, escala,
  visibilidade, material e textura, inclusive as pecas de dentro (o
  delta do objeto e copiado para ela);
- nasce AO LADO do original, do lado direito de quem esta olhando e na
  distancia do proprio tamanho do objeto, senao nasceria dentro dele e
  pareceria que nada aconteceu;
- nasce SELECIONADA, com o gizmo na mao: duplicar, arrastar, duplicar,
  arrastar.

Depois de nascer, ela e um objeto como qualquer outro para o Editor:
id estavel, gizmo, inspetor, hierarquia, desfazer e SALVAR funcionam
nela sem nenhum caso especial. Editar a copia nao mexe no original
(nem no material: a copia ganha material proprio na primeira vez que
voce pinta ela).

Duplicar uma copia gera uma IRMA dela, nunca uma neta - toda copia
aponta para um objeto de verdade do jogo. E por isso que apagar a
primeira copia nunca faz as outras sumirem no proximo boot.

### Apagar o original NAO apaga as copias

Duplicar, espalhar as copias pelo cenario e depois EXCLUIR o original e
um caminho normal, e ele funciona: cada copia e um objeto proprio, com
id proprio e delta proprio, e continua no lugar onde voce a deixou, boot
depois de boot, ate voce mesmo apagar cada uma.

Antes nao era assim, e o motivo era invisivel. Excluir tira o objeto da
arvore da cena, e o modelo .glb do original costuma chegar DEPOIS dessa
hora: as pecas que chegavam entravam num galho que a varredura do Editor
nao alcancava mais, entao a origem parecia ter uma peca so - e uma copia
so nasce quando a origem esta inteira. Resultado: as copias sumiam no
boot seguinte, e de forma intermitente, porque dependia de qual modelo
ganhava a corrida contra o carregamento das alteracoes salvas.

Corrigido em duas frentes (ver `syncRemoved` e `resolveByHint` em
`editor/editor-registry.js`):

1. o Editor continua aprendendo o nome das pecas de dentro de um objeto
   EXCLUIDO. Ele segue fora da cena (nao e desenhado, nao recebe toque);
   so deixou de ser um buraco negro para os modelos que chegam depois;
2. o plano B do delta (o `hint`) nunca mais aceita uma copia como alvo.
   Uma copia nasce com o mesmo nome, o mesmo tipo e a mesma posicao de
   fabrica do original, entao o `removed: true` orfa do original
   encaixava justamente nela - e apagava a copia no lugar do original.

E a espera pela origem passou a ter PRAZO: se o modelo mudou de tamanho
numa atualizacao do jogo e nunca vai bater o numero de pecas guardado, a
copia nasce com o que existe hoje (e se refaz sozinha se o resto ainda
chegar), em vez de esperar para sempre. Esperar para sempre e o mesmo
que sumir.

EXCLUIR uma copia (secao COPIA do painel da direita, ou o botao da
barra) apaga ela de verdade: o registro dela sai do arquivo salvo e ela
deixa de existir. Leva junto o que estava dentro dela, e da para
desfazer. Para objeto do jogo, ver a secao EXCLUIR abaixo.

O que a copia NAO ganha:

- interacao (a colisao a copia GANHA: recebe a mesma caixa do original,
  do mesmo tamanho, e leva essa caixa junto quando voce a arrasta - ver
  mirrorSolids em scripts/collision.js). Copia de porta nao abre, copia
  de gaveta nao abre: ela e cenario. O objeto interativo do jogo
  continua sendo um so (ver scripts/interaction-system.js);
- animacao e virada de noite/dia: quem anima o ventilador ou troca o
  material da grama guarda a referencia do objeto original.

Custo: quase nada. A copia reaproveita a MESMA geometria e o MESMO
material do original (nenhuma copia de malha na memoria). Copia de
LUZ e a excecao, porque luz a mais custa quadro - o Editor avisa
quando voce duplica uma.

Resetar uma copia devolve ela ao valor de fabrica do objeto copiado,
entao ela vai parar exatamente em cima do original. Nao e defeito: o
"original" de uma copia e o do objeto que ela copia. Da para desfazer.

Ha um teto de 400 copias por cenario, de proposito: e uma ferramenta
rodando no celular.

## Excluir

Selecione e toque em EXCLUIR (barra de ferramentas) ou em "Excluir do
cenario" (secao OBJETO do painel da direita). Sempre pergunta antes - a
pergunta ja diz quantas pecas de dentro vao junto e avisa quando o
objeto e interativo.

Excluir NAO e ocultar. As duas coisas existem e fazem coisas
diferentes:

- Visivel (desligado): o objeto continua na cena, so nao aparece.
  Serve para "tirar da frente" e voltar em seguida.
- EXCLUIR: o objeto sai da arvore da cena. Nao e desenhado, nao recebe
  toque, nao entra em raycast nenhum, nao custa mais nada por quadro e
  perde a interacao.

A exclusao e delta, como qualquer outra alteracao: nenhum arquivo do
jogo e tocado. Ela mora na mesma secao de sempre (`scenes`), na chave
do objeto, como `removed: true`. No boot, o jogo monta o cenario
original e o objeto sai dele na hora de aplicar o delta - inclusive no
jogo normal, entao o que voce excluiu tambem nao existe para o
jogador.

Da para voltar atras de tres formas:

- desfazer (a acao entra no historico como qualquer outra);
- RESTAURAR: o proprio botao da barra vira RESTAURAR enquanto um
  objeto excluido esta selecionado, e a secao OBJETO ganha "Restaurar
  no cenario";
- "Resetar objeto", que limpa o delta inteiro daquele objeto.

O objeto volta para o MESMO lugar da arvore (o pai e o indice de onde
saiu ficam guardados) e o id dele segue reservado enquanto ele estiver
fora - um modelo .glb que chegue depois nunca herda o id, e portanto
nunca herda a exclusao, de outro.

O que sai junto:

- as pecas de dentro (o conjunto inteiro);
- a interacao: telefone excluido nao toca mais, porta excluida nao
  abre mais. A lista viva de interativos do jogo e a mesma no Editor e
  no jogo normal (ver scripts/main.js -> setInteractableList).

- a COLISAO do objeto. A caixa de colisao nao mora no objeto 3D: ela
  vive numa lista que o cenario monta na construcao (ver
  scripts/collision.js). Cada caixa guarda hoje o objeto de quem ela e
  (`owner`), e o EXCLUIR marca esse objeto - entao a colisao sai junto,
  na hora, e volta junto no RESTAURAR. Vale igual no jogo normal, no
  proximo boot, porque a exclusao salva e aplicada pelo mesmo caminho.
  Antes disso a caixa ficava para tras: o objeto desaparecia da tela e a
  "parede invisivel" dele continuava barrando o jogador (dava para
  trancar uma passagem excluindo o movel que estava nela). Ligue "Ver
  caixas de colisao" no menu de ajustes para conferir.

## Ver caixas de colisao

O menu de ajustes tem "Ver caixas de colisao": desenha por cima do
cenario o que segura o jogador.

- ROSA: solido de verdade. Encosta no que esta desenhado e barra o
  jogador. E o normal - hoje deve ser a unica cor que voce ve.
- AZUL: caixa SOLTA. Perdeu o contato com qualquer malha do objeto de
  quem ela e - ou nunca teve - e por isso nao barra mais ninguem: e
  colisao de coisa que nao esta mais no jogo, a colisao "jogada
  aleatoriamente, sem nada ali".

As AZUIS nao ficam mais no cenario. Elas sao APAGADAS: saem da lista de
solidos, e nao ficam mais so desligadas esperando. Quem faz a faxina:

- o jogo, algumas vezes nos primeiros ~20 segundos do boot (vale para o
  jogo normal tambem, nao so aqui) - depois desse prazo porque a
  mobilia .glb chega ao longo dos primeiros segundos, e caixa de movel
  que ainda esta carregando nao pode ser confundida com caixa solta;
- LIGAR esta vista, na hora. O aviso diz quantas foram removidas.

Uma caixa precisa estar solta ha mais de um segundo para cair, e caixa
dirigida pela cena (a folha da porta compartilhada, que se afasta de
proposito quando a porta abre) nunca entra na conta. Se uma azul
aparecer DURANTE a edicao - voce arrastou uma peca para longe do lugar
dela - ela fica azul na tela sem ser apagada, para dar tempo de
desfazer. No console do navegador, `Collision.audit()` devolve a lista
com o dono e as coordenadas de cada uma, e `Collision.purgeGhosts()`
varre na hora.

## A caixa tem o tamanho do MODELO

A colisao nao e mais o retangulo escrito na mao nos arquivos do
cenario. Cada caixa e colada no que esta DESENHADO dentro do objeto: os
quatro lados dela sao puxados ate os lados da malha, com 2 cm de sobra
(ver fitToModel em scripts/collision.js). Era dai que vinha a sensacao
de parar no ar um palmo antes do movel - a medida grossa do movel mais
uma folga de seguranca, somadas.

Isso e recalculado, nao congelado: mexer no TAMANHO de um objeto pela
ferramenta de escala refaz a colisao dele junto, do mesmo jeito que
mover e girar ja levavam a caixa. Vale para as copias tambem.

Dois freios, para nao estragar o cenario: um lado nunca e puxado mais
de 35 cm para dentro (bloqueio feito de proposito maior que o desenho
continua bloqueando) e a caixa so pode CRESCER quando e a unica colisao
daquele objeto - parede com vao de porta sao duas caixas da MESMA
parede, e esticar qualquer uma fecharia a passagem. Eixo em que o
desenho e um plano (parede, quadro, tapete) mantem a espessura que o
cenario escolheu. Para deixar uma caixa de fora, `modelFit: false` nela.

O que NAO sai junto:

- a colisao de um objeto apenas MOVIDO (nao excluido) - e ela nao
  precisa mais sair: a caixa acompanha o objeto, inclusive quando o que
  se move e uma PECA LA DENTRO dele, e uma caixa que fique sozinha no
  vazio para de valer sozinha (ver scripts/collision.js);
- a historia: excluir um objeto de que a progressao depende (as tres
  janelas, o telefone, as portas) pode travar o jogo. O Editor avisa
  na confirmacao, mas nao impede - e uma ferramenta de
  desenvolvimento.

Nada e destruido de verdade: geometria e material sao compartilhados
com o resto do jogo e continuam vivos. Excluir nao libera memoria, e
nao e para isso que serve - o ganho e o cenario limpo (e alguns
desenhos a menos por quadro).

Excluir e PERMANENTE ate voce restaurar: fica salvo como `removed: true`
e vale em todos os boots seguintes, no Editor e no jogo normal. E nao
alcanca as COPIAS daquele objeto: elas sao objetos proprios e continuam
na cena (ver "Apagar o original NAO apaga as copias", mais acima).

Peca DENTRO de uma copia pode ser excluida por conta propria (tirar o
travesseiro da cama copiada sem apagar a cama). Excluir a copia
INTEIRA e outro caminho: "Excluir copia", na secao COPIA - a copia
deixa de existir, porque quem a criou foi o proprio Editor.

## Horario (noite / dia)

O jogo comeca de noite e so amanhece uma vez, dormindo na cama (ver
cutscenes/sleep-sequence.js). Editar um cenario que so pode ser visto
de noite obrigava a jogar a historia inteira ate o amanhecer a cada
teste. O botao ☾ NOITE / ☀ DIA resolve isso: um toque vira o horario
na hora, sem fade e sem cutscene. A mesma opcao esta escrita por
extenso no menu ⚙ (NAVEGACAO E AJUSTES), como "Horario do cenario".

O rotulo mostra o horario em vigor AGORA, nao o que o toque vai fazer.

Nao e um sistema paralelo de iluminacao: e exatamente a MESMA virada
da sequencia de dormir, aplicada sob demanda e nos dois sentidos. Vira
junto:

- a luz da manha do quarto e a do corredor;
- o ceu azul das tres janelas (models/sky-factory.js);
- a nevoa de distancia e a cor de fundo (scripts/atmosphere.js);
- chao de grama, gramado, estrada de terra e floresta (troca de
  material e a visibilidade por anel/faixa);
- a neblina volumetrica do lado de fora.

Os DOIS cenarios viram juntos, inclusive o que nao esta na tela, entao
trocar de aba (Corredor / Meu Quarto) nunca mostra um de dia e o outro
de noite.

Custo: nenhum. Nada e recriado - so troca de material e de uniform,
nos dois sentidos, com os valores que ja existiam nas paletas NIGHT e
DAY de scripts/atmosphere.js.

O horario e estado de VISUALIZACAO, nao de edicao: nao vira delta, nao
entra no desfazer e NAO e salvo. O jogo continua comecando de noite e
amanhecendo so depois de dormir. Como virar o dia troca o material da
grama, da terra e da floresta, o Editor reaplica o delta salvo logo
depois da troca - uma alteracao de material feita por voce nao se
perde ao alternar noite/dia.

## Onde as alteracoes ficam salvas

Nunca dentro dos arquivos originais. Tres camadas, nesta ordem:

1. arquivos originais do jogo (scenes/, models/, materials/);
2. data/editor-overrides.json (opcional, versionado junto da build);
3. armazenamento local do aparelho (o botao SALVAR).

A camada 3 vence a 2, que vence a 1. No boot, scripts/main.js monta os
cenarios originais, fotografa os valores de fabrica e aplica o delta
salvo por cima. Por isso a edicao sobrevive a atualizacoes do jogo:
os arquivos podem ser trocados a vontade.

So o que MUDOU e gravado - inclusive o que foi EXCLUIDO, que e so uma
linha a mais no delta (`removed: true`). Objeto removido em uma
atualizacao futura tem a alteracao dele ignorada em silencio, sem
quebrar o boot.

As copias moram no mesmo arquivo, em uma secao propria (`clones`), e
tambem sao delta: cada uma guarda so "existe uma copia de X aqui"
(origem, pai e nome). As propriedades dela ficam na secao de sempre,
na chave do id novo. No boot, as copias nascem depois da varredura e
ANTES do delta ser aplicado - inclusive no jogo normal, entao o que
voce duplicou aparece para o jogador. Copia cuja origem nao existe
mais e ignorada em silencio, como qualquer outra alteracao orfa.

## Identidade dos objetos

1. interativos usam o id que ja tem no jogo (porta-entrada,
   janela-quarto, mesa-telefone);
2. objetos com name na fabrica usam o proprio nome;
3. o resto ganha id derivado de uma assinatura estrutural (tipo,
   geometria, material e posicao original), nunca da ordem de
   carregamento (os .glb chegam de forma assincrona).

Cada delta guarda tambem um hint (nome, tipo e posicao original),
usado como plano B se o id mudar em uma atualizacao futura.

## Desempenho

- Nenhum renderer, cena ou loop paralelo; nenhuma copia de geometria.
- Material so e clonado quando voce edita o material daquele objeto.
- A varredura da arvore roda 1x por segundo dentro do Editor (para
  achar .glb recem-carregados) e algumas vezes no boot. Depois disso,
  nada roda por quadro alem do proprio Editor.

## Arquivos

- editor-overrides.js: a camada de dados (delta salvo).
- editor-registry.js: identidade, nomes e valores originais.
- editor-clones.js: duplicar, excluir e recriar copias no boot.
- (excluir): nao tem arquivo proprio. O botao vive em editor-ui.js, a
  decisao em editor-mode.js (requestDelete/removeEntry/restoreEntry) e
  o efeito na cena em editor-registry.js, secao "Excluidos".
- editor-textures.js: catalogo das texturas ja carregadas pelo jogo.
- editor-camera.js: camera livre, modo voo e no-clip.
- (horario): nao tem arquivo proprio. O botao vive em editor-ui.js, o
  caminho em editor-mode.js, e a virada em si e a do jogo
  (scripts/main.js -> atmosphere/corridor/room `setDaytime`).
- editor-gizmo.js: gizmo de mover/girar/escalar adaptado ao toque.
- editor-history.js: desfazer e refazer.
- editor-widgets.js: pecas de interface (secoes, sliders, campos).
- editor-hierarchy.js: painel da esquerda.
- editor-inspector.js: painel da direita.
- editor-ui.js: casca da interface.
- editor-mode.js: o cerebro, costura tudo.

## Pronto para crescer

editor-widgets.js concentra as pecas de interface, editor-history.js
aceita qualquer acao reversivel e editor-overrides.js aceita qualquer
caminho de propriedade. Clima, neblina, particulas, audio, pontos de
spawn, cameras e colisoes entram por cima disso sem reescrever nada.

DUPLICAR entrou por esse caminho e abriu a porta do resto: o Editor
agora sabe CRIAR objeto, e nao so mexer no que ja existe. Um botao de
"adicionar objeto novo" e a mesma ideia com outra origem (uma fabrica
de models/ em vez de um objeto da cena), e cai no mesmo registro, no
mesmo delta e no mesmo desfazer.

O horario ja entrou por esse caminho: as fabricas do exterior e a
atmosfera passaram a aceitar `setDaytime(true/false)` em vez de so
`setMorning()`, e o botao e um controle a mais na barra. Um por-do-sol
ou um terceiro horario entra do mesmo jeito - basta mais uma paleta em
scripts/atmosphere.js.
