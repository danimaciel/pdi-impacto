"""Gera o site do TerImpact a partir de src/ e do instrumento.

Saídas:
  index.html                 página completa, para publicação no GitHub Pages
  <destino>/terimpact.html   fragmento para publicação como página do Claude (opcional)

Uso: python tools/build.py [pasta_destino_do_fragmento]
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
css = (RAIZ / "src" / "app.css").read_text(encoding="utf-8")
js = (RAIZ / "src" / "app.js").read_text(encoding="utf-8")
inst = json.loads((RAIZ / "instrumento" / "terimpact_v1.json").read_text(encoding="utf-8"))
inst_txt = json.dumps(inst, ensure_ascii=False).replace("</", "<\\/")

head = (
    "<title>TerImpact, versão 1</title>\n"
    '<meta name="claude:viewport-fit-sides" content="cover">\n'
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500'
    '&family=Manrope:wght@600;700;800&family=Source+Sans+3:wght@400;600;700&display=swap">\n'
    f"<style>\n{css}\n</style>\n"
)
body = (
    '<div id="app"></div>\n'
    f'<script type="application/json" id="instrumento">{inst_txt}</script>\n'
    f"<script>\n{js}\n</script>\n"
)

pagina = (
    '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    '<meta name="description" content="Avaliação ex ante do potencial de impacto de propostas de pesquisa.">\n'
    f"{head}</head>\n<body>\n{body}</body>\n</html>\n"
)
(RAIZ / "index.html").write_text(pagina, encoding="utf-8")
print("index.html gerado")

if len(sys.argv) > 1:
    destino = Path(sys.argv[1])
    destino.mkdir(parents=True, exist_ok=True)
    (destino / "terimpact.html").write_text(head + body, encoding="utf-8")
    print(f"{destino / 'terimpact.html'} gerado")
