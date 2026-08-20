# data/

Esta pasta guarda ALTERACOES, nunca conteudo original do jogo.

## editor-overrides.json

Camada opcional e versionada de alteracoes feitas no modo Editor
(ver editor/README.md). Ordem em que o jogo monta um cenario:

1. arquivos originais (scenes/, models/, materials/);
2. data/editor-overrides.json (este arquivo, se existir);
3. alteracoes salvas no aparelho.

A camada 3 vence a 2, que vence a 1.

Duas secoes dentro do arquivo:

- `scenes`: o que MUDOU em objetos que o jogo ja tem;
- `clones`: o que PASSOU A EXISTIR, ou seja, o que foi duplicado no
  Editor (ver editor/README.md). Cada copia guarda so a origem, o pai
  e o nome; as propriedades dela ficam em `scenes`, na chave do id
  novo.

Arquivo antigo, sem `clones`, continua valendo - ele so nao tem copia
nenhuma.

Editando so no seu aparelho? Pode ignorar este arquivo: o botao
SALVAR do Editor grava no aparelho e pronto. Se quiser que a edicao
va junto com a build (outro celular, um APK gerado), use no Editor:
o botao ... e depois EXPORTAR JSON, e cole o resultado aqui.
