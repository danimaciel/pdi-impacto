# PD&I Impacto

Ferramentas e referenciais para uma pesquisa agrícola orientada ao impacto, fundamentados nos princípios de pesquisa e inovação responsável e de avaliação responsável da pesquisa.

## Camadas

| Pasta | Conteúdo | Situação |
|---|---|---|
| `terimpact/` | TerImpact, versão 1: avaliação ex ante do potencial de impacto de propostas de pesquisa | Protótipo |
| `terimpact/v2/` | TerImpact, versão 2: mapa de impactos, caminho para o impacto, responsabilidade e qualidade | Rascunho em revisão |

Novas camadas serão incluídas para o Plano de Transferência de Tecnologia orientado ao impacto, o AgroRadarEval e outros trabalhos sobre avaliação de impacto da pesquisa agrícola.

## TerImpact

- `terimpact/instrumento/terimpact_v1.json`: itens, escalas, perguntas orientadoras e regras de cálculo.
- `terimpact/src/`: código da aplicação.
- `terimpact/tools/build.py`: gera `terimpact/index.html` a partir de `src/` e do instrumento.

Após alterar o instrumento ou o código, execute `python terimpact/tools/build.py`.

Para a versão 2, execute `python terimpact/v2/tools/build.py`.
