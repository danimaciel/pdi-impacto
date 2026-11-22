/* Tradução da interface do AgroRadarEval.
   O texto em português é a referência; cada idioma traz pares (português, tradução).
   O conteúdo do instrumento (dimensões, afirmações, pilares, escala, perfil) vem dos campos *_en do próprio instrumento. */
(function (raiz) {
  "use strict";

  var UI_EN = [
    ["Início", "Start"], ["Identificação", "Identification"], ["Resultado", "Results"], ["Etapas", "Steps"],
    [" · não foi possível salvar", " · could not save"],
    ["Você está vendo um exemplo fictício. As alterações não são salvas.", "You are viewing a fictitious example. Changes are not saved."],
    ["Iniciar meu diagnóstico", "Start my diagnosis"], ["Anterior", "Previous"], ["Ver resultado", "See results"], ["Próxima: ", "Next: "],
    ["Diagnóstico organizacional", "Organizational diagnosis"],
    ["Diagnóstico do processo de avaliação em organizações de PD&I agropecuária, com foco no uso dos resultados das avaliações para a pesquisa orientada ao impacto.",
     "Diagnosis of the evaluation process in agricultural RD&I organizations, focused on the use of evaluation results for impact-oriented research."],
    ["O AgroRadarEval apoia dirigentes e gestores de PD&I na reflexão sobre as capacidades, a cultura, as colaborações, os processos e a comunicação que sustentam o uso dos resultados das avaliações. O instrumento foi construído a partir de revisão de literatura e está alinhado aos princípios de pesquisa e inovação responsável e de avaliação responsável da pesquisa (Pinto et al., 2024).",
     "AgroRadarEval supports RD&I leaders and managers in reflecting on the capacities, culture, collaborations, processes and communication that underpin the use of evaluation results. The instrument was built from a literature review and is aligned with the principles of Responsible Research and Innovation and Responsible Research Assessment (Pinto et al., 2024)."],
    ["Estrutura: pilares e dimensões", "Structure: pillars and dimensions"],
    ["Os três pilares se desdobram em oito dimensões, operacionalizadas por 94 afirmações. Cada dimensão se associa a princípios de pesquisa e inovação responsável e de avaliação responsável da pesquisa (",
     "The three pillars unfold into eight dimensions, operationalized by 94 statements. Each dimension is associated with principles of Responsible Research and Innovation and Responsible Research Assessment ("],
    ["Princípios de RRI e RRA associados: ", "Associated RRI and RRA principles: "], ["Princípios de RRI e RRA: ", "RRI and RRA principles: "],
    ["Cada afirmação é respondida em uma escala de concordância de 1 (", "Each statement is answered on an agreement scale from 1 ("], [") a 5 (", ") to 5 ("],
    ['). A opção "', '). The option "'],
    ['" exclui a afirmação do cálculo. O resultado de cada dimensão é expresso em percentual da pontuação máxima e comparado ao valor de referência de ',
     '" excludes the statement from the calculation. The result of each dimension is expressed as a percentage of the maximum score and compared with the reference value of '],
    ["%, adotado na versão original.", "%, adopted in the original version."],
    ["Conceitos de base", "Core concepts"],
    ["A pesquisa orientada ao impacto busca que os resultados da pesquisa contribuam para mudanças econômicas, sociais, ambientais e institucionais, e não apenas para a produção de conhecimento. A avaliação de impacto é parte desse processo, mas seu valor depende do uso que se faz de seus resultados. Na pesquisa agrícola, esse uso ainda se concentra na prestação de contas, com pouco aproveitamento para aprendizagem, alocação de recursos e formulação de políticas (Pinto, 2026).",
     "Impact-oriented research seeks research results that contribute to economic, social, environmental and institutional change, not only to the production of knowledge. Impact evaluation is part of this process, but its value depends on how its results are used. In agricultural research, this use is still concentrated on accountability, with little use for learning, resource allocation and policymaking (Pinto, 2026)."],
    ["O AgroRadarEval examina as condições organizacionais para esse uso. Parte de três pilares: o desenvolvimento de capacidades avaliativas, a cultura de avaliação orientada ao impacto e a aprendizagem reflexiva. Está alinhado aos princípios de pesquisa e inovação responsável, como antecipação, reflexividade, inclusão e responsividade, e de avaliação responsável da pesquisa, como transparência e julgamento qualitativo apoiado por indicadores.",
     "AgroRadarEval examines the organizational conditions for this use. It is built on three pillars: evaluation capacity building, impact-oriented evaluation culture and reflective learning. It is aligned with the principles of Responsible Research and Innovation, such as anticipation, reflexivity, inclusion and responsiveness, and of Responsible Research Assessment, such as transparency and qualitative judgement supported by indicators."],
    ["Como preencher", "How to complete"],
    ["A organização define quem vai responder, considerando o perfil recomendado abaixo. Podem responder uma ou várias pessoas.",
     "The organization decides who will respond, considering the recommended profile below. One or several people may respond."],
    ["Cada pessoa informa a organização e sua função e responde às afirmações das oito dimensões, indicando o grau de concordância com cada uma. Quando não conhecer a prática descrita, deve marcar a opção de não saber avaliar.",
     "Each person provides the organization and their role and answers the statements of the eight dimensions, indicating their level of agreement with each. When the practice described is unknown to them, they should select the option for being unable to assess."],
    ["Ao final, cada pessoa obtém o resultado individual, com o radar das dimensões, os destaques e os pontos a melhorar, e baixa ou copia suas respostas.",
     "At the end, each person obtains their individual results, with the dimensions radar, the highlights and the areas for improvement, and downloads or copies their answers."],
    ["Quem coordena reúne as respostas na seção de consolidação, que calcula a média e as estatísticas de cada dimensão e indica as afirmações em que as respostas divergem.",
     "The coordinator gathers the answers in the consolidation section, which calculates the mean and the statistics of each dimension and identifies the statements on which answers diverge."],
    ["O resultado consolidado é discutido pela equipe, com atenção às afirmações divergentes e aos pontos a melhorar, para definir ações.",
     "The team discusses the consolidated results, paying attention to divergent statements and areas for improvement, in order to define actions."],
    ["Perfil recomendado de quem responde", "Recommended respondent profile"],
    ["A escolha de quem responde cabe à organização. Recomenda-se envolver pessoas com as características abaixo. Quando várias pessoas da mesma organização respondem, os resultados podem ser consolidados na tela de resultado.",
     "The choice of respondents is up to the organization. It is recommended to involve people with the characteristics below. When several people from the same organization respond, the results can be consolidated on the results screen."],
    ["O preenchimento leva cerca de 15 a 20 minutos, em média 2 minutos por dimensão. As respostas ficam salvas neste navegador e podem ser retomadas a qualquer momento. Nenhuma informação é enviada a servidores.",
     "Completion takes about 15 to 20 minutes, around 2 minutes per dimension. Answers are saved in this browser and can be resumed at any time. No information is sent to servers."],
    ["Continuar diagnóstico", "Continue diagnosis"], ["Novo diagnóstico", "New diagnosis"], ["Iniciar diagnóstico", "Start diagnosis"], ["Ver exemplo preenchido", "See a completed example"],
    ["Instrumento versão ", "Instrument version "], [" Fonte: ", " Source: "],
    ["Organização e respondente", "Organization and respondent"],
    ["Nenhum campo é obrigatório. O nome da organização é usado para reunir respostas de várias pessoas na consolidação.",
     "No field is mandatory. The organization name is used to gather the answers of several people in the consolidation."],
    ["Digite para buscar na lista. Se a organização não estiver na lista, digite o nome completo. Pessoas da mesma organização devem usar o mesmo nome, para que as respostas possam ser consolidadas.",
     "Type to search the list. If the organization is not listed, type its full name. People from the same organization should use the same name so that their answers can be consolidated."],
    ["Organização não identificada", "Unidentified organization"], ["Organização (consolidado)", "Organization (consolidated)"],
    ["Unidade ou área", "Unit or area"], ["Função de quem responde", "Respondent's role"], ["Função de quem respondeu", "Respondent's role"],
    ["Por exemplo: gestão de PD&I, equipe de avaliação, transferência de tecnologia.", "For example: RD&I management, evaluation team, technology transfer."],
    ["Resposta para ", "Answer for "], ["Sobre esta dimensão", "About this dimension"],
    ["Indique o grau de concordância com cada afirmação, considerando a prática atual da organização. Ao responder, a página avança para a próxima afirmação.",
     "Indicate your level of agreement with each statement, considering the organization's current practice. After each answer, the page moves on to the next statement."],
    ["Observações sobre esta dimensão", "Notes on this dimension"],
    ["Registre exemplos, práticas existentes ou dificuldades que ajudem a interpretar as respostas.", "Record examples, existing practices or difficulties that help interpret the answers."],
    ["Resultado por dimensão em percentual da pontuação máxima", "Result by dimension as a percentage of the maximum score"],
    ["sem resposta", "no answer"], ["Nenhuma afirmação nesta faixa.", "No statements in this range."],
    ["acima da referência", "above reference"], ["abaixo da referência", "below reference"],
    ["Vista do resultado", "Results view"], ["Minhas respostas", "My answers"], ["Consolidado (", "Consolidated ("],
    ["Afirmações para discussão", "Statements for discussion"],
    ["Sinalizadas pela dispersão das respostas entre os respondentes (desvio médio em relação à mediana e padrão da distribuição). O número varia conforme as respostas e pode ser zero.",
     "Flagged by the dispersion of answers across respondents (mean deviation from the median and pattern of the distribution). The number depends on the answers and may be zero."],
    ["Respostas: ", "Answers: "], [" · mediana ", " · median "], [" · desvio médio ", " · mean deviation "],
    ["Nenhuma afirmação com divergência relevante entre os respondentes.", "No statements with relevant divergence across respondents."],
    ["Nenhuma afirmação com divergência relevante.", "No statements with relevant divergence."],
    ["Respostas divididas entre concordância e discordância. Discussão necessária: indica entendimentos diferentes sobre a prática da organização.",
     "Answers split between agreement and disagreement. Discussion needed: it indicates different understandings of the organization's practice."],
    ["Uma resposta se afasta das demais. Convém ouvir a justificativa: pode indicar informação que o grupo não considerou.",
     "One answer departs from the others. It is worth hearing the reasoning: it may reveal information the group has not considered."],
    ["Respostas dispersas na escala. Discussão recomendada.", "Answers spread across the scale. Discussion recommended."],
    ["Diferença de dois pontos entre respostas.", "Two-point difference between answers."],
    ["Avaliação destoante", "Outlying answer"], ["Divergência moderada", "Moderate divergence"], ["Polarização", "Polarization"], ["Divergência", "Divergence"],
    ["Estatísticas entre respondentes", "Statistics across respondents"],
    ["Resultado de cada dimensão calculado por respondente, em percentual da pontuação máxima. O desvio-padrão indica a dispersão entre as pessoas que responderam.",
     "Result of each dimension calculated per respondent, as a percentage of the maximum score. The standard deviation indicates the dispersion across respondents."],
    ["Estatísticas por afirmação", "Statistics by statement"], ["Desvio-padrão", "Standard deviation"], ["Dimensão", "Dimension"], ["Mediana", "Median"],
    ["Mínimo", "Minimum"], ["Máximo (100%)", "Maximum (100%)"], ["Máximo", "Maximum"], ["Média", "Mean"], ["Código", "Code"], ["Mín.", "Min."], ["Máx.", "Max."],
    ["Consolidar respostas da organização", "Consolidate the organization's answers"],
    ["Quando várias pessoas da mesma organização respondem, cada uma baixa ou copia suas respostas e as envia a quem coordena. A consolidação calcula a média de cada afirmação e indica as afirmações em que as respostas divergem, para discussão.",
     "When several people from the same organization respond, each one downloads or copies their answers and sends them to the coordinator. The consolidation calculates the mean of each statement and identifies the statements on which answers diverge, for discussion."],
    ["Arquivos de respostas (.json), um por respondente", "Answer files (.json), one per respondent"],
    ["Ou cole as respostas copiadas, uma após a outra", "Or paste the copied answers, one after another"],
    ["Incluir as minhas respostas", "Include my answers"], ["Desfazer consolidação", "Undo consolidation"], ["Consolidar", "Consolidate"],
    ["Relatório e respostas", "Report and answers"], ["Baixar relatório (Word)", "Download report (Word)"], ["Copiar texto do relatório", "Copy report text"],
    ["Imprimir ou salvar em PDF", "Print or save as PDF"], ["Copiar minhas respostas", "Copy my answers"], ["Baixar minhas respostas (.json)", "Download my answers (.json)"],
    ["Importar respostas", "Import answers"], ["Arquivo de respostas (.json)", "Answer file (.json)"], ["Ou cole o conteúdo copiado", "Or paste the copied content"],
    ["Carregar respostas", "Load answers"], ["Resultado consolidado", "Consolidated results"],
    ["Resultado geral", "Overall result"], ["Média das dimensões, em percentual da pontuação máxima", "Mean of the dimensions, as a percentage of the maximum score"],
    ["Acima da referência", "Above reference"], ["Dimensões com resultado igual ou superior a ", "Dimensions with a result equal to or above "],
    ["Afirmações respondidas", "Statements answered"], ["Incluídas as marcadas como sem avaliação", "Including those marked as unable to assess"],
    ["Radar das dimensões", "Dimensions radar"],
    ["Percentual da pontuação máxima em cada dimensão. A linha tracejada indica o valor de referência de ", "Percentage of the maximum score in each dimension. The dashed line shows the reference value of "],
    ["Referência (", "Reference ("], ["Situação", "Status"], ["Respostas", "Answers"],
    ["Destaques e pontos a melhorar", "Highlights and areas for improvement"],
    ["Destaques: afirmações com resposta média igual ou superior a ", "Highlights: statements with a mean answer equal to or above "],
    [". Pontos a melhorar: resposta média igual ou inferior a ", ". Areas for improvement: mean answer equal to or below "],
    [" afirmações ficaram na faixa intermediária.", " statements fell in the intermediate range."],
    ["Pontos a melhorar", "Areas for improvement"], ["Destaques", "Highlights"],
    ["Resultado por dimensão", "Results by dimension"],
    ["Percentual da pontuação máxima em cada dimensão, comparado ao valor de referência de ", "Percentage of the maximum score in each dimension, compared with the reference value of "],
    ["sem respostas.", "no answers."], ["Respondentes", "Respondents"], ["Observações", "Notes"], ["País", "Country"], ["Organização", "Organization"],
    ["Diagnóstico do processo de avaliação. Gerado em ", "Diagnosis of the evaluation process. Generated on "], [" com o instrumento versão ", " with instrument version "],
    [", resultado consolidado de ", ", consolidated result of "], ["AgroRadarEval: diagnóstico", "AgroRadarEval: diagnosis"],
    ["Arquivo salvo.", "File saved."], ["Não foi possível salvar o arquivo neste ambiente. Use a opção de copiar.", "The file could not be saved in this environment. Use the copy option."],
    ["Não foi possível copiar automaticamente. O conteúdo foi selecionado no campo ao final da página; copie-o manualmente.", "Automatic copying was not possible. The content has been selected in the field at the end of the page; copy it manually."],
    ["Respostas copiadas.", "Answers copied."], ["Texto do relatório copiado.", "Report text copied."],
    ["Não foi possível gerar o arquivo Word neste ambiente. Use a opção de copiar o texto.", "The Word file could not be generated in this environment. Use the option to copy the text."],
    ["Não foi possível gerar o arquivo Word.", "The Word file could not be generated."],
    ["Nenhuma resposta válida do AgroRadarEval foi encontrada.", "No valid AgroRadarEval answers were found."], ["Respostas carregadas.", "Answers loaded."],
    ["São necessárias respostas de pelo menos duas pessoas para consolidar.", "Answers from at least two people are needed for consolidation."],
    ["As respostas salvas neste navegador serão apagadas.", "The answers saved in this browser will be deleted."], ["Apagar e começar de novo", "Delete and start over"], ["Cancelar", "Cancel"],
    ["Exemplo: instituto de pesquisa agropecuária", "Example: agricultural research institute"], ["Coordenação de avaliação", "Evaluation unit"], ["Brasil", "Brazil"], ["Gestão de PD&I", "RD&I management"],
    ["As recomendações das avaliações não têm responsável definido nem acompanhamento sistemático.", "Evaluation recommendations have no designated owner and no systematic follow-up."],
    ["Neutro", "Neutral"],
    ["Diagnóstico em grupo com link", "Group diagnosis with a link"],
    ["Crie um link para que outras pessoas da organização respondam ao diagnóstico. Cada pessoa responde de forma independente e envia suas respostas; apenas quem tem o link de coordenação vê e consolida as respostas.",
     "Create a link so that other people in the organization can answer the diagnosis. Each person answers independently and submits their answers; only the holder of the coordination link can see and consolidate them."],
    ["Criar link para o grupo", "Create a link for the group"],
    ["Link de participação", "Participation link"], ["(envie às pessoas que vão responder)", "(send it to the people who will respond)"],
    ["Link de coordenação", "Coordination link"], ["(guarde; permite ver e consolidar as respostas)", "(keep it; it allows you to see and consolidate the answers)"],
    ["Copiar", "Copy"],
    ["Concordo em enviar minhas respostas, incluindo a organização e a função informadas, para a planilha de respostas mantida pela coordenação deste site. As respostas são usadas apenas para a consolidação deste diagnóstico.",
     "I agree to send my answers, including the organization and role provided, to the response spreadsheet maintained by the coordination of this site. The answers are used only to consolidate this diagnosis."],
    ["Reenviar minhas respostas", "Resend my answers"], ["Enviar minhas respostas", "Send my answers"], ["Carregar respostas do grupo", "Load the group's answers"],
    ["Sair deste diagnóstico em grupo", "Leave this group diagnosis"], ["Respostas enviadas em ", "Answers sent on "], [". Um novo envio substitui o anterior.", ". A new submission replaces the previous one."],
    ["Diagnóstico em grupo", "Group diagnosis"], [". Responda de forma independente e, ao final, envie suas respostas na tela de resultado.", ". Answer independently and, at the end, send your answers from the results screen."],
    ["Criando o link. A primeira conexão pode levar até 20 segundos.", "Creating the link. The first connection may take up to 20 seconds."],
    ["Link criado. Envie o link de participação às pessoas que vão responder e guarde o link de coordenação.", "Link created. Send the participation link to the people who will respond and keep the coordination link."],
    ["Não foi possível criar o link. Verifique a conexão e tente novamente.", "The link could not be created. Check your connection and try again."],
    ["Para enviar, marque a concordância com o envio das respostas.", "To send, tick the agreement to send your answers."],
    ["Enviando. A primeira conexão pode levar até 20 segundos.", "Sending. The first connection may take up to 20 seconds."],
    ["Respostas atualizadas.", "Answers updated."], ["Respostas enviadas.", "Answers sent."],
    ["Este diagnóstico em grupo não foi encontrado. Confira o link recebido.", "This group diagnosis was not found. Check the link you received."],
    ["Não foi possível enviar. Verifique a conexão e tente novamente.", "Sending failed. Check your connection and try again."],
    ["Carregando respostas. A primeira conexão pode levar até 20 segundos.", "Loading answers. The first connection may take up to 20 seconds."],
    ["Apenas uma pessoa enviou respostas até agora. A consolidação exige pelo menos duas.", "Only one person has sent answers so far. Consolidation requires at least two."],
    ["Nenhuma resposta foi enviada até agora.", "No answers have been sent yet."],
    ["Não foi possível carregar as respostas. Verifique a conexão e o link de coordenação.", "The answers could not be loaded. Check your connection and the coordination link."],
    ["Link copiado.", "Link copied."], ["Selecione o link e copie manualmente.", "Select the link and copy it manually."]
  ];

  var REGRAS_EN = [
    [/(\d+) de (\d+) afirmações avaliadas/g, "$1 of $2 statements assessed"],
    [/\((acima|abaixo) da referência;/g, function (m, a) { return "(" + (a === "acima" ? "above" : "below") + " reference;"; }],
    [/(\d+) de (\d+) afirmações/g, "$1 of $2 statements"],
    [/(\d+) de (\d+) respondidas/g, "$1 of $2 answered"],
    [/(\d+) afirmações\)/g, "$1 statements)"],
    [/ · dimensão (\d+) de (\d+)/g, " · dimension $1 of $2"],
    [/(\d+) sem avaliação/g, "$1 unable to assess"],
    [/(\d+) respondentes/g, "$1 respondents"],
    [/<small>de (\d+)/g, "<small>of $1"],
    [/(\d+) de (\d+)(<|\s|$)/g, "$1 of $2$3"],
    [/média (\d)/g, "mean $1"], [/; desvio-padrão /g, "; standard deviation "], [/; mínimo /g, "; minimum "], [/; máximo /g, "; maximum "],
    [/>NS</g, ">N/A<"]
  ];

  function escHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function criar(INST) {
    var pares = UI_EN.slice();
    function par(a, b) { if (a && b && a !== b) pares.push([a, b]); }
    INST.dimensoes.forEach(function (d) {
      par(d.nome, d.nome_en); par(d.descricao, d.descricao_en);
      (d.principios || []).forEach(function (p, i) { par(p, (d.principios_en || [])[i]); });
      d.afirmacoes.forEach(function (a) { par(a.texto, a.texto_en); });
    });
    INST.pilares.forEach(function (p) { par(p.nome, p.nome_en); par(p.descricao, p.descricao_en); });
    (INST.perfil_respondente || []).forEach(function (p, i) { var e = (INST.perfil_respondente_en || [])[i] || []; par(p[0], e[0]); par(p[1], e[1]); });
    INST.escala.rotulos.forEach(function (r, i) { var e = (INST.escala.rotulos_en || [])[i]; par(r, e); if (e) par(r.toLowerCase(), e.toLowerCase()); });
    par(INST.escala.nao_sei, INST.escala.nao_sei_en);
    par(INST.situacao, INST.situacao_en); par(INST.estrutura_fonte, INST.estrutura_fonte_en);
    var todos = [];
    pares.forEach(function (p) {
      todos.push(p);
      var a = escHtml(p[0]), b = escHtml(p[1]);
      if (a !== p[0]) todos.push([a, b]);
    });
    todos.sort(function (x, y) { return y[0].length - x[0].length; });
    function tr(s) {
      s = String(s);
      for (var i = 0; i < todos.length; i++) if (s.indexOf(todos[i][0]) >= 0) s = s.split(todos[i][0]).join(todos[i][1]);
      REGRAS_EN.forEach(function (r) { s = s.replace(r[0], r[1]); });
      return s;
    }
    return { tr: tr };
  }

  raiz.ARV_I18N = criar;
})(window);
