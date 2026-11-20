"""Gera listas/listas.json, fonte das listas usadas pelo TerImpact e pelo AgroRadarEval.

As listas são editadas aqui ou na planilha correspondente no Google Drive. Itens marcados
com "revisar" foram incluídos na elaboração inicial e aguardam conferência.
"""
import json
from pathlib import Path

embrapa = ["Acre", "Agricultura Digital", "Agrobiologia", "Agroenergia", "Agroindústria de Alimentos",
           "Agroindústria Tropical", "Agropecuária Oeste", "Agrossilvipastoril", "Algodão", "Alimentos e Territórios",
           "Amapá", "Amazônia Ocidental", "Amazônia Oriental", "Arroz e Feijão", "Café", "Caprinos e Ovinos",
           "Cerrados", "Clima Temperado", "Cocais", "Florestas", "Gado de Corte", "Gado de Leite", "Hortaliças",
           "Instrumentação", "Mandioca e Fruticultura", "Meio Ambiente", "Meio-Norte", "Milho e Sorgo", "Pantanal",
           "Pecuária Sudeste", "Pecuária Sul", "Pesca e Aquicultura", "Recursos Genéticos e Biotecnologia",
           "Rondônia", "Roraima", "Semiárido", "Soja", "Solos", "Suínos e Aves", "Tabuleiros Costeiros",
           "Territorial", "Trigo", "Uva e Vinho"]

organizacoes = [{"nome": "Embrapa (Sede)", "pais": "Brasil", "tipo": "Pesquisa agropecuária pública", "situacao": "revisar"}]
organizacoes += [{"nome": "Embrapa " + u, "pais": "Brasil", "tipo": "Pesquisa agropecuária pública", "situacao": "revisar"} for u in embrapa]

brasil = [
    ("Instituto Agronômico (IAC)", "Pesquisa agropecuária estadual"),
    ("Instituto Biológico (IB)", "Pesquisa agropecuária estadual"),
    ("Instituto de Economia Agrícola (IEA)", "Pesquisa agropecuária estadual"),
    ("Instituto de Zootecnia (IZ)", "Pesquisa agropecuária estadual"),
    ("Instituto de Tecnologia de Alimentos (Ital)", "Pesquisa agropecuária estadual"),
    ("Instituto de Desenvolvimento Rural do Paraná (IDR-Paraná)", "Pesquisa e extensão estadual"),
    ("Empresa de Pesquisa Agropecuária e Extensão Rural de Santa Catarina (Epagri)", "Pesquisa e extensão estadual"),
    ("Empresa de Pesquisa Agropecuária de Minas Gerais (Epamig)", "Pesquisa agropecuária estadual"),
    ("Empresa de Pesquisa Agropecuária do Estado do Rio de Janeiro (Pesagro-Rio)", "Pesquisa agropecuária estadual"),
    ("Instituto Capixaba de Pesquisa, Assistência Técnica e Extensão Rural (Incaper)", "Pesquisa e extensão estadual"),
    ("Departamento de Diagnóstico e Pesquisa Agropecuária (DDPA/Seapi-RS)", "Pesquisa agropecuária estadual"),
    ("Instituto Agronômico de Pernambuco (IPA)", "Pesquisa agropecuária estadual"),
    ("Empresa de Pesquisa Agropecuária do Rio Grande do Norte (Emparn)", "Pesquisa agropecuária estadual"),
    ("Empresa Mato-Grossense de Pesquisa, Assistência e Extensão Rural (Empaer)", "Pesquisa e extensão estadual"),
    ("Agência Goiana de Assistência Técnica, Extensão Rural e Pesquisa Agropecuária (Emater-GO)", "Pesquisa e extensão estadual"),
    ("Empresa Estadual de Pesquisa Agropecuária da Paraíba (Empaer-PB)", "Pesquisa agropecuária estadual"),
    ("Empresa de Desenvolvimento Agropecuário de Sergipe (Emdagro)", "Pesquisa e extensão estadual"),
    ("Agência Nacional de Assistência Técnica e Extensão Rural (Anater)", "Extensão rural"),
    ("Ministério da Agricultura e Pecuária (Mapa)", "Governo"),
    ("Ministério do Desenvolvimento Agrário e Agricultura Familiar (MDA)", "Governo"),
    ("Companhia Nacional de Abastecimento (Conab)", "Governo"),
    ("Instituto Nacional de Colonização e Reforma Agrária (Incra)", "Governo"),
    ("Instituto Nacional de Pesquisas Espaciais (Inpe)", "Pesquisa"),
    ("Instituto Brasileiro de Geografia e Estatística (IBGE)", "Governo"),
    ("Escola Superior de Agricultura Luiz de Queiroz (Esalq/USP)", "Universidade"),
    ("Universidade Estadual de Campinas (Unicamp)", "Universidade"),
    ("Universidade Federal de Viçosa (UFV)", "Universidade"),
    ("Universidade Federal de Lavras (Ufla)", "Universidade"),
    ("Universidade Federal Rural de Pernambuco (UFRPE)", "Universidade"),
    ("Universidade Federal Rural do Rio de Janeiro (UFRRJ)", "Universidade"),
    ("Universidade Federal Rural da Amazônia (Ufra)", "Universidade"),
    ("Universidade Federal do Rio Grande do Sul (UFRGS)", "Universidade"),
    ("Universidade de Brasília (UnB)", "Universidade"),
    ("Universidade Estadual Paulista (Unesp)", "Universidade"),
]
organizacoes += [{"nome": n, "pais": "Brasil", "tipo": t, "situacao": "revisar"} for n, t in brasil]

internacionais = [
    ("Instituto Nacional de Tecnología Agropecuaria (INTA)", "Argentina", "Pesquisa agropecuária pública"),
    ("Instituto Nacional de Investigación Agropecuaria (INIA)", "Uruguai", "Pesquisa agropecuária pública"),
    ("Instituto de Investigaciones Agropecuarias (INIA)", "Chile", "Pesquisa agropecuária pública"),
    ("Instituto Nacional de Innovación Agraria (INIA)", "Peru", "Pesquisa agropecuária pública"),
    ("Corporación Colombiana de Investigación Agropecuaria (Agrosavia)", "Colômbia", "Pesquisa agropecuária pública"),
    ("Instituto Nacional de Investigaciones Agropecuarias (Iniap)", "Equador", "Pesquisa agropecuária pública"),
    ("Instituto Paraguayo de Tecnología Agraria (IPTA)", "Paraguai", "Pesquisa agropecuária pública"),
    ("Cirad", "França", "Pesquisa agropecuária pública"),
    ("INRAE", "França", "Pesquisa agropecuária pública"),
    ("Teagasc", "Irlanda", "Pesquisa agropecuária pública"),
    ("AgResearch", "Nova Zelândia", "Pesquisa agropecuária pública"),
    ("Wageningen University & Research", "Países Baixos", "Universidade e pesquisa"),
    ("CSIRO", "Austrália", "Pesquisa"),
    ("Alliance of Bioversity International and CIAT", "Internacional", "CGIAR"),
    ("CIMMYT", "Internacional", "CGIAR"),
    ("Centro Internacional de la Papa (CIP)", "Internacional", "CGIAR"),
    ("ICARDA", "Internacional", "CGIAR"),
    ("ICRISAT", "Internacional", "CGIAR"),
    ("IFPRI", "Internacional", "CGIAR"),
    ("IITA", "Internacional", "CGIAR"),
    ("ILRI", "Internacional", "CGIAR"),
    ("IRRI", "Internacional", "CGIAR"),
    ("IWMI", "Internacional", "CGIAR"),
    ("CIFOR-ICRAF", "Internacional", "CGIAR"),
    ("WorldFish", "Internacional", "CGIAR"),
    ("AfricaRice", "Internacional", "CGIAR"),
    ("FAO", "Internacional", "Organismo internacional"),
    ("Instituto Interamericano de Cooperação para a Agricultura (IICA)", "Internacional", "Organismo internacional"),
    ("Procisur", "Internacional", "Cooperação regional"),
    ("Fontagro", "Internacional", "Cooperação regional"),
]
organizacoes += [{"nome": n, "pais": p, "tipo": t, "situacao": "revisar"} for n, p, t in internacionais]

publicos = [
    "Agricultores familiares",
    "Médios e grandes produtores rurais",
    "Povos indígenas e comunidades tradicionais",
    "Assentados da reforma agrária",
    "Cooperativas e associações de produtores",
    "Técnicos de assistência técnica e extensão rural",
    "Gestores públicos municipais",
    "Gestores públicos estaduais",
    "Gestores públicos federais",
    "Formuladores de políticas e legisladores",
    "Órgãos de regulação e fiscalização",
    "Agentes financeiros e de crédito rural",
    "Empresas de insumos, máquinas e serviços",
    "Agroindústrias e empresas de processamento",
    "Startups e empresas de tecnologia",
    "Organizações da sociedade civil",
    "Pesquisadores e instituições de pesquisa",
    "Universidades, professores e estudantes",
    "Consumidores",
    "Mídia e público em geral",
    "Organismos internacionais e de cooperação",
]

produtos = [
    "Tecnologia, produto ou processo",
    "Cultivar ou material genético",
    "Software, aplicativo ou plataforma",
    "Base de dados ou mapa",
    "Sistema de monitoramento",
    "Método ou metodologia",
    "Prática ou sistema de produção",
    "Publicação técnica ou científica",
    "Recomendação para políticas ou gestão",
    "Capacitação ou formação",
]

listas = {
    "versao": "2026-11-20",
    "observacao": "Elaboração inicial. Itens com situacao 'revisar' aguardam conferência.",
    "organizacoes": organizacoes,
    "publicos": publicos,
    "produtos": produtos,
}
Path(__file__).with_name("listas.json").write_text(json.dumps(listas, ensure_ascii=False, indent=2), encoding="utf-8")
print(len(organizacoes), "organizações;", len(publicos), "públicos;", len(produtos), "produtos")
