"""Gera a página do Plano de TT orientado ao impacto a partir de src/ e do instrumento.

Uso: python plano-tt/tools/build.py [pasta_destino_do_fragmento]
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def emb(obj):
    return json.dumps(obj, ensure_ascii=False).replace("</", r"<\/")


css = (RAIZ / "src" / "app.css").read_text(encoding="utf-8")
js = (RAIZ / "src" / "app.js").read_text(encoding="utf-8")
inst = json.loads((RAIZ / "instrumento" / "plano-tt.json").read_text(encoding="utf-8"))
listas = json.loads((RAIZ.parent / "listas" / "listas.json").read_text(encoding="utf-8"))
servico = json.loads((RAIZ.parent / "config" / "servico.json").read_text(encoding="utf-8"))
ti = json.loads((RAIZ.parent / "terimpact" / "instrumento" / "terimpact_v2.json").read_text(encoding="utf-8"))
rotulos = {m["codigo"]: m["rotulo"] for b in ti["blocos"] if b["tipo"] == "mapa" for d in b["dimensoes"] for m in d["mudancas"]}

head = (
    "<title>Plano de TT orientado ao impacto</title>\n"
    '<meta name="claude:viewport-fit-sides" content="cover">\n'
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500'
    '&family=Manrope:wght@600;700;800&family=Source+Sans+3:wght@400;600;700&display=swap">\n'
    f"<style>\n{css}\n</style>\n"
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>\n'
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\n'
)
body = (
    '<div id="app"></div>\n'
    f'<script type="application/json" id="instrumento">{emb(inst)}</script>\n'
    f'<script type="application/json" id="listas">{emb(listas)}</script>\n'
    f'<script type="application/json" id="servico">{emb(servico)}</script>\n'
    f'<script type="application/json" id="rotulos-ti">{emb(rotulos)}</script>\n'
    f"<script>\n{js}\n</script>\n"
)
pagina = (
    '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    '<meta name="description" content="Elaboração de planos de transferência de tecnologia orientados ao impacto.">\n'
    f"{head}</head>\n<body>\n{body}</body>\n</html>\n"
)
(RAIZ / "index.html").write_text(pagina, encoding="utf-8")
print("plano-tt/index.html gerado")
if len(sys.argv) > 1:
    destino = Path(sys.argv[1]); destino.mkdir(parents=True, exist_ok=True)
    (destino / "plano-tt.html").write_text(head + body, encoding="utf-8")
    print(destino / "plano-tt.html", "gerado")
