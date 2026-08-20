# assets/videos/

## Os dois videos de cutscene de introducao foram REMOVIDOS

`cutscene-parte1.mp4` (~9,6 MB) e `cutscene-parte2.mp4` (~66 MB) nao
existem mais: eles pesavam ~76 MB dos arquivos do jogo, o que e demais
para um app mobile. A abertura agora e uma cutscene IN ENGINE, feita com
os modelos 3D do carro e da estrada de terra, e pesa ~600 KB somando o
.glb da estrada com a musica. Ver `cutscenes/road-cutscene.js`.

Junto com os videos sairam `cutscenes/cutscene-player.js` (o player que
tocava as duas partes em sequencia), `cutscenes/cutscene-config.js` (o
caminho dos arquivos) e `cutscenes/cutscene.css`.

## Video de fundo do menu principal

`menu-background.mp4` continua aqui e continua sendo usado (ver
`menu/menu.js`): e o unico video que sobrou no jogo. Padrao do arquivo:
H.264 (perfil High), 1920x1080, 60 fps, CRF 18, sem faixa de audio,
`faststart` ligado, ~4,2 MB.

## Videos futuros

Se algum dia entrar video de novo, siga o mesmo padrao do
`menu-background.mp4` acima - e pense duas vezes: 10 segundos de video em
1080p custam mais em disco que a cutscene de abertura inteira.
