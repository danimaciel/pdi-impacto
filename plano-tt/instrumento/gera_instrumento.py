"""Gera plano-tt/instrumento/plano-tt.json: estrutura do Plano de TT orientado ao impacto.

Fontes: proposta de PTT da área de TT da Embrapa Territorial (abril de 2026), Plano TT da
Plataforma Trigo no Brasil e Documento Orientador da Escala CRL (agosto de 2026).
Marcadores de progresso: Earl, Carden e Smutylo (2001).
"""
import json
from pathlib import Path

crl = {
    "niveis": ["Incipiente", "Exploração", "Estruturação inicial", "Definição", "Validação", "Preparação", "Prontidão", "Inserção", "Alcance"],
    "regra": "O nível global é o menor nível entre as dimensões aplicáveis. As dimensões marcadas com asterisco são de análise obrigatória, mas ficam fora do nível global quando não exigem nenhuma ação.",
    "dimensoes": [
        {"id": "mercado", "nome": "Mercado e concorrência", "pergunta": "Quem são os usuários, quais mercados e quais alternativas existem?", "opcional": False},
        {"id": "valor", "nome": "Proposta de valor", "pergunta": "Que problema resolve, que benefício gera e isso é aceito pelo adotante?", "opcional": False},
        {"id": "negocio", "nome": "Negócio", "pergunta": "Como o ativo gera e sustenta valor?", "opcional": False},
        {"id": "parcerias", "nome": "Parcerias para inserção no mercado", "pergunta": "Quem precisa participar para levar o ativo ao ambiente de uso?", "opcional": True},
        {"id": "pi", "nome": "Propriedade intelectual", "pergunta": "Qual estratégia de proteção ou tratamento de PI é aplicável?", "opcional": True},
        {"id": "tt", "nome": "Transferência de tecnologia", "pergunta": "Como ocorrerão a inserção e a adoção?", "opcional": False},
        {"id": "regulatorio", "nome": "Regulatório", "pergunta": "Quais requisitos, aprovações ou registros são necessários?", "opcional": True},
    ],
}

fases = [
    {"id": "ideacao", "nome": "Ideação orientada ao impacto", "descricao": "Para tecnologias ainda em P&D: hipótese de impacto, usuários potenciais e proposta de valor."},
    {"id": "f0", "nome": "Fase 0 · Preparação", "descricao": "Materiais, conteúdos validados, links rastreáveis, linha de base e identificação de usuários."},
    {"id": "f1", "nome": "Fase 1 · Lançamento e mobilização", "descricao": "Lançamento, divulgação inicial e articulação com públicos e parceiros."},
    {"id": "f2", "nome": "Fase 2 · Execução", "descricao": "Comunicação contínua, capacitação, eventos, evolução e monitoramento."},
    {"id": "f3", "nome": "Fase 3 · Consolidação", "descricao": "Análise, avaliação de impacto, devolutiva, balanço e recomendações para o ciclo seguinte."},
]

niveis_indicador = [
    {"id": "produto", "nome": "Produto", "descricao": "Entregas do plano (peças, eventos, materiais)."},
    {"id": "alcance", "nome": "Alcance", "descricao": "Quantas pessoas ou organizações foram alcançadas (acessos, participantes, contatos)."},
    {"id": "uso", "nome": "Uso", "descricao": "Uso efetivo da tecnologia pelos públicos (usuários registrados, consultas recorrentes, aplicações)."},
    {"id": "mudanca", "nome": "Mudança", "descricao": "Mudanças de prática, decisão ou condição associadas ao uso (casos de uso, decisões informadas, avaliação ex post)."},
]

def a(tipo, acao, desc, fase, resp, res, ind, met, crl_dim, nivel, padrao=False):
    return {"tipo": tipo, "acao": acao, "descricao": desc, "fase": fase, "responsavel": resp, "resultado": res, "indicador": ind, "metrica": met, "crl": crl_dim, "nivel": nivel, "sugerida": padrao}

biblioteca = [
    a("Preparação", "Kit e modelos de comunicação", "Arte e texto-base reutilizáveis em vários canais, adaptados em formato.", "f0", "TT/NCO", "Materiais padronizados para a divulgação", "kit produzido", "nº de peças-base", "tt", "produto", True),
    a("Preparação", "Levantamento e validação de conteúdos", "Reunião das informações sobre a tecnologia e validação dos números e afirmações com a equipe técnica.", "f0", "ET", "Conteúdos validados para divulgação", "conteúdos validados", "nº de conteúdos validados", "valor", "produto", True),
    a("Preparação", "Links rastreáveis e linha de base", "Inclusão de UTM em todos os links publicados e registro dos acessos antes do início do plano.", "f0", "TT", "Linha de base registrada e acessos rastreáveis por canal", "linha de base", "acessos mensais na linha de base", "tt", "alcance", True),
    a("Preparação", "Registro de usuários e canal de contato", "Pop-up de registro e botão de sugestão ou contato, com aceite LGPD, para identificar quem usa a tecnologia.", "f0", "NTI/TT", "Usuários identificados", "usuários registrados", "nº de usuários registrados por perfil", "mercado", "uso", True),
    a("Preparação", "Mapeamento de usuários potenciais e alternativas", "Levantamento de públicos potenciais, concorrentes e alternativas disponíveis.", "f0", "TT/ET", "Mercado e usuários caracterizados", "segmentos mapeados", "nº de segmentos e alternativas identificados", "mercado", "produto"),
    a("Preparação", "Proposta de valor por público", "Definição do problema que a tecnologia resolve e do benefício para cada público.", "f0", "TT/ET", "Proposta de valor definida", "proposta de valor", "documento aprovado pela equipe", "valor", "produto"),
    a("Preparação", "Modelo de sustentação e financiamento", "Definição de como a tecnologia será mantida, atualizada e evoluída (MAE) e das fontes de recursos.", "f0", "Gestão", "Sustentação definida", "modelo de sustentação", "documento aprovado", "negocio", "produto"),
    a("Preparação", "Análise de propriedade intelectual", "Verificação da estratégia de proteção ou tratamento de PI aplicável.", "f0", "TT", "Situação de PI definida", "análise de PI", "análise concluída", "pi", "produto"),
    a("Preparação", "Análise de requisitos regulatórios", "Verificação de requisitos, aprovações ou registros necessários.", "f0", "TT", "Requisitos regulatórios identificados", "análise regulatória", "análise concluída", "regulatorio", "produto"),
    a("Comunicação", "Produção de notícias institucionais", "Notícias que contextualizem a tecnologia, sua relevância e seus usos.", "f1", "NCO", "Notícias publicadas", "notícias produzidas", "nº de notícias", "tt", "produto", True),
    a("Comunicação", "Divulgação nos portais e redes", "Divulgação nos portais e redes institucionais, com links rastreáveis.", "f2", "NCO", "Visibilidade da tecnologia ampliada", "alcance", "nº de acessos à matéria", "tt", "alcance", True),
    a("Comunicação", "Série recorrente de conteúdos", "Série periódica sobre funcionalidades e usos, em rodízio ao longo do ano.", "f2", "TT/NCO", "Presença contínua da tecnologia nos canais", "peças publicadas", "nº de peças; engajamento", "tt", "alcance"),
    a("Comunicação", "Vídeos explicativos", "Vídeos curtos sobre a tecnologia, seus benefícios e como usá-la.", "f2", "TT", "Materiais audiovisuais acessíveis", "vídeos produzidos", "nº de vídeos; visualizações", "valor", "alcance"),
    a("Comunicação", "Peças gráficas por público", "Peças explicativas dirigidas a cada público.", "f2", "TT/NCO", "Conteúdos visuais por público", "peças produzidas", "nº de peças", "valor", "produto"),
    a("Comunicação", "Informativo da Unidade", "Divulgação no informativo e no mailing da Unidade.", "f2", "NCO", "Público do informativo alcançado", "envios e cliques", "nº de cliques no link", "tt", "alcance"),
    a("Eventos", "Lançamento institucional", "Evento ou ação de lançamento da tecnologia.", "f1", "TT/NCO", "Apresentação pública e posicionamento institucional", "participação", "nº de participantes", "tt", "alcance"),
    a("Eventos", "Participação em feiras e eventos do setor", "Demonstração da tecnologia em eventos dos setores usuários.", "f2", "TT", "Contato direto com usuários potenciais", "contatos", "nº de contatos registrados", "mercado", "alcance"),
    a("Capacitação", "Curso para usuários", "Curso, por exemplo em plataforma de ensino a distância, sobre o uso da tecnologia.", "f2", "TT/ET", "Usuários capacitados", "pessoas capacitadas", "nº de concluintes", "tt", "uso"),
    a("Capacitação", "Tutoriais de uso", "Tutoriais do tipo \"como consultar\" ou \"como aplicar\".", "f2", "TT", "Orientação prática disponível", "tutoriais", "nº de tutoriais; acessos", "tt", "uso"),
    a("Capacitação", "Oficina com usuários-chave", "Oficina com usuários de referência para aplicação da tecnologia em casos reais.", "f2", "ET/TT", "Aplicações em situação real", "aplicações", "nº de aplicações relatadas", "valor", "mudanca"),
    a("Mailing", "Identificação de usuários potenciais", "Mapeamento de usuários e parceiros por indicação sucessiva (snowball).", "f1", "TT", "Rede de usuários potenciais", "usuários identificados", "nº de contatos identificados", "mercado", "alcance"),
    a("Mailing", "Contato direcionado por público", "Apresentação da tecnologia a cooperativas, associações, órgãos públicos ou empresas.", "f2", "TT", "Articulação com organizações representativas", "organizações contatadas", "nº de organizações; respostas", "parcerias", "alcance"),
    a("Evolução", "Workshop técnico", "Discussão da evolução da tecnologia com usuários e especialistas.", "f2", "ET/TT", "Demandas de melhoria identificadas", "sugestões", "nº de sugestões incorporadas", "valor", "uso"),
    a("Evolução", "Parcerias para multiplicação", "Acordos com organizações capazes de ampliar a adoção.", "f2", "TT/Gestão", "Parceiros multiplicadores formalizados", "parcerias", "nº de acordos", "parcerias", "alcance"),
    a("Evolução", "Integração com outras ferramentas", "Integração por API ou incorporação em sistemas de outras organizações.", "f2", "NTI/ET", "Uso da tecnologia em outros sistemas", "integrações", "nº de integrações", "tt", "uso"),
    a("Monitoramento", "Monitoramento de acessos e uso", "Análise mensal de acessos, usuários recorrentes e consultas, por canal.", "f2", "TT", "Informação sistemática sobre o uso", "uso", "acessos mensais; usuários recorrentes", "tt", "uso", True),
    a("Monitoramento", "Retorno dos usuários", "Coleta de sugestões e dificuldades em eventos, formulários e contatos.", "f2", "TT", "Demandas e oportunidades de melhoria", "retorno", "nº de sugestões", "valor", "uso", True),
    a("Monitoramento", "Registro de casos de uso", "Documentação de casos em que a tecnologia orientou uma decisão ou mudou uma prática.", "f2", "TT/ET", "Evidências de uso e de mudança", "casos documentados", "nº de casos de uso", "valor", "mudanca", True),
    a("Avaliação de impacto", "Recrutamento de usuários para avaliação", "Identificação e convite de usuários para a avaliação ex post, com mensagem própria, distinta da divulgação.", "f3", "TT", "Usuários disponíveis para avaliação", "usuários recrutados", "nº de usuários recrutados por perfil", "tt", "uso", True),
    a("Avaliação de impacto", "Avaliação de impacto ex post", "Aplicação do Ambitec-TICs (ou método adequado ao tipo de ativo) com usuários reais.", "f3", "TT/ET", "Impactos verificados", "impacto", "índice de impacto; nº de usuários avaliados", "tt", "mudanca", True),
    a("Avaliação de impacto", "Devolutiva e uso dos resultados", "Sistematização e apresentação dos resultados a gestores, equipes e participantes.", "f3", "TT", "Resultados usados em decisões", "uso dos resultados", "nº de recomendações incorporadas", "tt", "mudanca", True),
]

inst = {
    "instrumento": "Plano de TT orientado ao impacto",
    "versao": "1.0.0",
    "situacao": "Em desenvolvimento.",
    "tipos_ativo": ["Software ou aplicativo", "Plataforma ou painel", "Banco de dados", "Ativo cartográfico", "Metodologia", "Procedimento informatizado", "Processo ou produto", "Cultivar ou material genético", "Prática agropecuária", "Outro"],
    "momentos": ["Em pesquisa e desenvolvimento", "Recém-disponibilizada", "Em uso"],
    "objetivos": ["Lançar a tecnologia", "Ampliar o acesso contínuo", "Ampliar a adoção", "Fortalecer parcerias para inserção", "Recrutar usuários para avaliação de impacto"],
    "responsaveis": [["TT", "Transferência de Tecnologia"], ["NCO", "Núcleo de Comunicação Organizacional"], ["NTI", "Núcleo de Tecnologia da Informação"], ["ET", "Equipe técnica da tecnologia"], ["Gestão", "Coordenação do plano"]],
    "canais": ["Portal da Unidade (carrossel e notícias)", "LinkedIn da Unidade", "Informativo e mailing da Unidade", "Redes corporativas (proposta de pauta ao NCO)", "Eventos do setor", "Contato direto"],
    "niveis_mudanca": [
        {"valor": 1, "rotulo": "Conhecimento ou capacidade"},
        {"valor": 2, "rotulo": "Prática ou decisão"},
        {"valor": 3, "rotulo": "Condição"}
    ],
    "crl": crl,
    "fases": fases,
    "niveis_indicador": niveis_indicador,
    "tipos_acao": ["Preparação", "Comunicação", "Eventos", "Capacitação", "Mailing", "Evolução", "Monitoramento", "Avaliação de impacto"],
    "biblioteca": biblioteca,
}
Path(__file__).with_name("plano-tt.json").write_text(json.dumps(inst, ensure_ascii=False, indent=2), encoding="utf-8")
print(len(biblioteca), "ações na biblioteca;", sum(1 for x in biblioteca if x["sugerida"]), "sugeridas por padrão")
