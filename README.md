# TerImpact

Ferramenta online de apoio à avaliação ex ante do potencial de impacto de propostas de pesquisa. Destina-se ao pesquisador que deseja examinar sua proposta nas dimensões econômica, social, ambiental, política, institucional e científica, bem como a consistência de sua trajetória de impacto, antes da submissão.

O instrumento tem origem na planilha de Avaliação Ex Ante de Projetos de Pesquisa da Embrapa Territorial.

## Estrutura

- `instrumento/terimpact_v1.json`: itens, escalas, perguntas orientadoras e regras de cálculo.
- `src/`: código da aplicação (estilos e script).
- `tools/build.py`: gera o `index.html` a partir de `src/` e do instrumento.
- `index.html`: página publicada. Não deve ser editada diretamente.

## Atualização

Após alterar o instrumento ou o código em `src/`, execute:

```
python tools/build.py
```
