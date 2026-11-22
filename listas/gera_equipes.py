"""Gera listas/equipes.json, fonte das listas de empregados e de áreas usadas pelo Plano de TT.

Para cada Unidade, o arquivo guarda as áreas que podem coordenar um plano e os nomes dos
empregados que podem compor a equipe técnica. Apenas os nomes são publicados: cargo, função e
e-mail da planilha de origem não entram no site.

Uso:
  python listas/gera_equipes.py                      # regrava equipes.json com as áreas abaixo
  python listas/gera_equipes.py planilha.xlsx "Embrapa Territorial"
      # substitui os empregados da Unidade pelos nomes da coluna "Nome" da planilha

A planilha pode ter também uma coluna "Unidade"; nesse caso o segundo argumento é dispensável e
cada linha vai para a Unidade indicada. Requer openpyxl para ler planilhas.
"""
import json
import sys
from pathlib import Path

ARQ = Path(__file__).resolve().parent / "equipes.json"

# Áreas que podem coordenar um plano de TT, por Unidade. Itens com "grupos" aparecem
# na lista como "Área: Grupo".
AREAS = {
    "Embrapa Territorial": [
        {"nome": "Área de TT"},
        {"nome": "Área de Comunicação"},
        {"nome": "Área de Tecnologia da Informação"},
        {"nome": "Área de Pesquisa", "grupos": [
            "Grupo de Gestão Territorial Estratégica",
            "Grupo de Inteligência Territorial Estratégica",
            "Grupo de Monitoramento Territorial",
        ]},
    ],
}


def ler_planilha(caminho, unidade_padrao):
    import openpyxl
    ws = openpyxl.load_workbook(caminho, read_only=True, data_only=True).active
    linhas = ws.iter_rows(values_only=True)
    cab = [str(c or "").strip().lower() for c in next(linhas)]
    i_nome = cab.index("nome")
    i_un = cab.index("unidade") if "unidade" in cab else None
    out = {}
    for r in linhas:
        nome = " ".join(str(r[i_nome] or "").split())
        un = (str(r[i_un] or "").strip() if i_un is not None else "") or unidade_padrao
        if not nome:
            continue
        if not un:
            sys.exit("Informe a Unidade (segundo argumento ou coluna Unidade).")
        out.setdefault(un, [])
        if nome not in out[un]:
            out[un].append(nome)
    return out


atual = json.loads(ARQ.read_text(encoding="utf-8")) if ARQ.exists() else {"unidades": []}
unidades = {u["nome"]: u for u in atual.get("unidades", [])}
for nome, areas in AREAS.items():
    unidades.setdefault(nome, {"nome": nome, "areas": [], "empregados": []})["areas"] = areas
if len(sys.argv) > 1:
    for nome, pessoas in ler_planilha(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "").items():
        unidades.setdefault(nome, {"nome": nome, "areas": [], "empregados": []})["empregados"] = sorted(pessoas, key=str.casefold)

saida = {
    "versao": "2026-11-22",
    "observacao": "Somente nomes. Unidades sem lista de empregados podem ser acrescentadas com este script.",
    "unidades": sorted(unidades.values(), key=lambda u: u["nome"]),
}
ARQ.write_text(json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(ARQ, "gerado:", ", ".join(f"{u['nome']} ({len(u['empregados'])} nomes)" for u in saida["unidades"]))
