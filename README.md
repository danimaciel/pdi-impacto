# PD&I orientada ao impacto

Ferramentas e referenciais de apoio à pesquisa agropecuária, fundamentados nos princípios de pesquisa e inovação responsável e de avaliação responsável da pesquisa.

Site: https://danimaciel.github.io/pdi-impacto/

## Estrutura

| Pasta | Conteúdo | Situação |
|---|---|---|
| `index.html` | Página de abertura | Publicada |
| `terimpact/` | TerImpact: análise ex ante do impacto de propostas de pesquisa, com modos Conceber e Revisar | Em desenvolvimento |

Estão previstas camadas para o AgroRadarEval e para o Plano de Transferência de Tecnologia orientado ao impacto.

## TerImpact

- `terimpact/instrumento/terimpact_v2.json`: blocos, perguntas, opções de resposta, fundamentos e regras da devolutiva.
- `terimpact/src/`: código da aplicação.
- `terimpact/tools/build.py`: gera `terimpact/index.html` a partir de `src/` e do instrumento.

Após alterar o instrumento ou o código, execute `python terimpact/tools/build.py`.

A versão 1, derivada da planilha original, está preservada no histórico do repositório, na marcação `terimpact-v1`.
