# PD&I orientada ao impacto

Ferramentas e referenciais de apoio à pesquisa agropecuária, fundamentados nos princípios de pesquisa e inovação responsável e de avaliação responsável da pesquisa.

Site: https://danimaciel.github.io/pdi-impacto/

## Estrutura

| Pasta | Conteúdo | Situação |
|---|---|---|
| `index.html` | Página de abertura | Publicada |
| `terimpact/` | TerImpact: análise ex ante do impacto de propostas de pesquisa, com modos Conceber e Revisar | Em desenvolvimento |
| `agroradareval/` | AgroRadarEval: diagnóstico do processo de avaliação em organizações de PD&I agropecuária, com consolidação de respondentes | Nova versão |
| `plano-tt/` | Plano de Transferência de Tecnologia orientado ao impacto: maturidade CRL, trajetória de adoção, ações, cronograma e indicadores | Em desenvolvimento |

## TerImpact

- `terimpact/instrumento/terimpact_v2.json`: blocos, perguntas, opções de resposta, fundamentos e regras da devolutiva.
- `terimpact/src/`: código da aplicação.
- `terimpact/tools/build.py`: gera `terimpact/index.html` a partir de `src/` e do instrumento.

Após alterar o instrumento ou o código, execute `python terimpact/tools/build.py`.

A versão 1, derivada da planilha original, está em `terimpact/v1/` (gerada por `python terimpact/v1/tools/build.py`) e publicada em https://danimaciel.github.io/pdi-impacto/terimpact/v1/.

## AgroRadarEval

- `agroradareval/instrumento/agroradareval.json`: pilares, dimensões, 94 afirmações (português e texto original em inglês), escala e valor de referência.
- `agroradareval/src/` e `agroradareval/tools/build.py`: código e geração de `agroradareval/index.html`.

A versão original (Pinto et al., 2024), com dados e código em R/Shiny, está em https://github.com/danimaciel/agroradareval.

## Plano de TT orientado ao impacto

- `plano-tt/instrumento/gera_instrumento.py`: gera `plano-tt.json` (dimensões e níveis da escala CRL, fases, níveis de indicador e biblioteca de ações).
- `plano-tt/src/` e `plano-tt/tools/build.py`: código e geração de `plano-tt/index.html`.

Saídas: plano em Excel e em Word, exportação para a base de acompanhamento de planos de TT no AppSheet e arquivo do plano (.json). A ferramenta lê o arquivo de respostas do TerImpact para pré-preencher título, problema, públicos, parceiros, mudanças esperadas e pressupostos.
