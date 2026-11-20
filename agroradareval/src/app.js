(function () {
  "use strict";

  var INST = JSON.parse(document.getElementById("instrumento").textContent);
  var DIMS = INST.dimensoes;
  var ESC = INST.escala.rotulos;
  var REF = INST.referencia.percentual;
  var KEY = "agroradareval.v2.respostas";
  var app = document.getElementById("app");
  var TOTAL = DIMS.reduce(function (a, d) { return a + d.afirmacoes.length; }, 0);
  var AFIRM = {};
  DIMS.forEach(function (d) { d.afirmacoes.forEach(function (a) { a.dim = d.id; AFIRM[a.codigo] = a; }); });

  var framed = true;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }

  var STEPS = [{ id: "inicio", nome: "Início" }, { id: "identificacao", nome: "Identificação" }]
    .concat(DIMS.map(function (d) { return { id: d.id, nome: d.nome, dim: d }; }))
    .concat([{ id: "resultado", nome: "Resultado" }]);

  /* ---------- Estado ---------- */

  function blank() {
    return { instrumento: INST.instrumento, versao: INST.versao, criado: new Date().toISOString(), atualizado: null, exemplo: false,
      organizacao: { nome: "", unidade: "", pais: "", funcao: "" }, respostas: {}, comentarios: {} };
  }
  function valid(s) { return s && typeof s === "object" && s.instrumento === INST.instrumento && s.respostas && typeof s.respostas === "object"; }
  function normalize(s) {
    var b = blank();
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    Object.keys(b.organizacao).forEach(function (k) { if (s.organizacao[k] === undefined) s.organizacao[k] = ""; });
    return s;
  }
  function load() { try { var r = localStorage.getItem(KEY); if (!r) return null; var s = JSON.parse(r); return valid(s) ? normalize(s) : null; } catch (e) { return null; } }
  var saveOk = true;
  function save() {
    S.atualizado = new Date().toISOString();
    if (S.exemplo) return;
    try { localStorage.setItem(KEY, JSON.stringify(S)); saveOk = true; } catch (e) { saveOk = false; }
  }
  var S = load() || blank();
  var CONS = null;      // respostas consolidadas de vários respondentes
  var VISTA = "minha";  // "minha" ou "consolidada"
  var step = 0;

  /* ---------- Cálculo ---------- */

  function avg(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
  function fmt(n, d) { return n === null || n === undefined || isNaN(n) ? "–" : n.toFixed(d === undefined ? 1 : d).replace(".", ","); }

  // respostas: código -> valor (1 a 5; 0 = não sei). Para dados consolidados, valor é a média.
  function porDimensao(resp) {
    return DIMS.map(function (d) {
      var vals = [], ns = 0;
      d.afirmacoes.forEach(function (a) { var v = resp[a.codigo]; if (v === 0) ns++; else if (v) vals.push(v); });
      var m = vals.length ? avg(vals) : null;
      return { dim: d, media: m, pct: m === null ? null : m / 5 * 100, n: vals.length, ns: ns, total: d.afirmacoes.length };
    });
  }
  function contagem(resp) {
    var n = 0; Object.keys(resp).forEach(function (k) { if (resp[k] !== undefined && resp[k] !== null) n++; }); return n;
  }
  function respostasAtivas() { return VISTA === "consolidada" && CONS ? CONS.medias : S.respostas; }

  /* ---------- Consolidação de respondentes ---------- */

  function mediana(a) { var b = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }

  function consolidar(lista) {
    var medias = {}, disp = {};
    Object.keys(AFIRM).forEach(function (c) {
      var notas = lista.map(function (s) { return s.respostas[c]; }).filter(function (v) { return v >= 1 && v <= 5; });
      var nsn = lista.filter(function (s) { return s.respostas[c] === 0; }).length;
      if (notas.length) medias[c] = avg(notas); else if (nsn) medias[c] = 0;
      if (notas.length >= 2) {
        var md = mediana(notas), ad = avg(notas.map(function (v) { return Math.abs(v - md); }));
        var amp = Math.max.apply(null, notas) - Math.min.apply(null, notas);
        var baixos = notas.filter(function (v) { return v <= 2; }).length, altos = notas.filter(function (v) { return v >= 4; }).length;
        var padrao = "consenso";
        if (baixos >= notas.length / 3 && altos >= notas.length / 3 && amp >= 2) padrao = "polarizacao";
        else {
          var dest = notas.filter(function (v) { return Math.abs(v - md) >= 2; });
          if (dest.length === 1 && notas.length >= 3) padrao = "destoante";
          else if (amp >= 3 || ad > 0.83) padrao = "divergencia";
          else if (amp === 2) padrao = "moderada";
        }
        disp[c] = { notas: notas, mediana: md, ad: ad, amplitude: amp, padrao: padrao };
      }
    });
    return { n: lista.length, respondentes: lista.map(function (s) { return s.organizacao || {}; }), medias: medias, dispersao: disp };
  }

  var PADRAO = {
    polarizacao: ["Polarização", "Respostas divididas entre concordância e discordância. Discussão necessária: indica entendimentos diferentes sobre a prática da organização."],
    destoante: ["Avaliação destoante", "Uma resposta se afasta das demais. Convém ouvir a justificativa: pode indicar informação que o grupo não considerou."],
    divergencia: ["Divergência", "Respostas dispersas na escala. Discussão recomendada."],
    moderada: ["Divergência moderada", "Diferença de dois pontos entre respostas."]
  };

  /* ---------- Utilidades ---------- */

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function msg(t, ok) { var m = document.getElementById("msg"); if (m) { m.textContent = t; m.className = "msg " + (ok ? "ok" : "err"); } }
  function hoje() { var d = new Date(); return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear(); }

  /* ---------- Cabeçalho e navegação ---------- */

  function statusTxt() { return contagem(S.respostas) + " de " + TOTAL + " afirmações" + (saveOk ? "" : " · não foi possível salvar"); }
  function header() {
    var pct = Math.round(100 * contagem(S.respostas) / TOTAL);
    var chips = STEPS.slice(1).map(function (s, i) {
      var idx = i + 1;
      return '<button class="chip" data-go="' + idx + '"' + (idx === step ? ' aria-current="step"' : "") + ">" + esc(s.nome) + "</button>";
    }).join("");
    return '<header class="top"><div class="wrap"><div class="top-row"><div class="brand">Agro<span>RadarEval</span></div>' +
      '<div class="status" id="status">' + statusTxt() + '</div></div><div class="bar" aria-hidden="true"><i id="barfill" style="width:' + pct + '%"></i></div>' +
      (step > 0 ? '<nav class="chips" aria-label="Etapas">' + chips + "</nav>" : "") + "</div></header>";
  }
  function refreshStatus() {
    var st = document.getElementById("status"); if (st) st.textContent = statusTxt();
    var bf = document.getElementById("barfill"); if (bf) bf.style.width = Math.round(100 * contagem(S.respostas) / TOTAL) + "%";
  }
  function exampleBanner() {
    return S.exemplo ? '<div class="note example no-print">Você está vendo um exemplo fictício. As alterações não são salvas. <button class="btn link" data-act="novo-real">Iniciar meu diagnóstico</button></div>' : "";
  }
  function nav() {
    var prev = step > 1 ? '<button class="btn" data-go="' + (step - 1) + '">Anterior</button>' : "<span></span>";
    var next = step < STEPS.length - 1 ? '<button class="btn primary" data-go="' + (step + 1) + '">' + (step === STEPS.length - 2 ? "Ver resultado" : "Próxima: " + esc(STEPS[step + 1].nome)) + "</button>" : "";
    return '<div class="nav no-print">' + prev + next + "</div>";
  }

  /* ---------- Telas ---------- */

  function viewInicio() {
    var tem = !S.exemplo && contagem(S.respostas) > 0;
    var pil = INST.pilares.map(function (p) { return "<li><strong>" + esc(p.nome) + ".</strong> " + esc(p.descricao) + "</li>"; }).join("");
    var dims = DIMS.map(function (d, i) { return "<li><b>" + (i + 1) + "</b><span>" + esc(d.nome) + ' <span class="muted">(' + d.afirmacoes.length + " afirmações)</span></span></li>"; }).join("");
    var perfil = INST.perfil_respondente.map(function (p) { return "<tr><td><strong>" + esc(p[0]) + "</strong></td><td>" + esc(p[1]) + "</td></tr>"; }).join("");
    return '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Diagnóstico organizacional</p><h1>AgroRadarEval</h1>' +
      '<p class="lead">Diagnóstico do processo de avaliação em organizações de PD&amp;I agropecuária, com foco no uso dos resultados das avaliações para a pesquisa orientada ao impacto.</p></div>' +
      "<p>O AgroRadarEval apoia dirigentes e gestores de PD&amp;I na reflexão sobre as capacidades, a cultura, as colaborações, os processos e a comunicação que sustentam o uso dos resultados das avaliações. O instrumento foi construído a partir de revisão de literatura e está alinhado aos princípios de pesquisa e inovação responsável e de avaliação responsável da pesquisa (Pinto et al., 2024).</p>" +
      '<div class="stack"><h3>Pilares</h3><ul class="stack" style="margin:0;padding-left:1.1em">' + pil + "</ul></div>" +
      '<div class="stack"><h3>Dimensões</h3><ul class="scale">' + dims + "</ul></div>" +
      "<p>Cada afirmação é respondida em uma escala de concordância de 1 (" + esc(ESC[0].toLowerCase()) + ") a 5 (" + esc(ESC[4].toLowerCase()) + "). A opção \"" + esc(INST.escala.nao_sei) + "\" exclui a afirmação do cálculo. O resultado de cada dimensão é expresso em percentual da pontuação máxima e comparado ao valor de referência de " + REF + "%, adotado na versão original.</p>" +
      '<details><summary>Perfil recomendado de quem responde</summary><div><p class="small">A escolha de quem responde cabe à organização. Recomenda-se envolver pessoas com as características abaixo. Quando várias pessoas da mesma organização respondem, os resultados podem ser consolidados na tela de resultado.</p><div class="table-wrap"><table><tbody>' + perfil + "</tbody></table></div></div></details>" +
      '<div class="note">As respostas ficam armazenadas apenas neste navegador. Nenhuma informação é enviada a servidores.</div>' +
      '<div class="actions">' + (tem ? '<button class="btn primary" data-go="1">Continuar diagnóstico</button><button class="btn" data-act="pedir-novo">Novo diagnóstico</button>'
        : '<button class="btn primary" data-act="comecar">Iniciar diagnóstico</button>') +
      '<button class="btn" data-act="exemplo">Ver exemplo preenchido</button></div><div id="confirm-slot"></div>' +
      '<p class="footer">Instrumento versão ' + esc(INST.versao) + ". " + esc(INST.situacao) + " Fonte: " + esc(INST.origem) + ".</p></div>";
  }

  function viewIdentificacao() {
    var o = S.organizacao;
    function campo(id, rotulo, k, ajuda) {
      return '<div class="field"><label for="f-' + id + '">' + rotulo + "</label>" + (ajuda ? '<span class="hint">' + ajuda + "</span>" : "") + '<input type="text" id="f-' + id + '" data-org="' + k + '" value="' + esc(o[k]) + '"></div>';
    }
    return exampleBanner() + '<div class="stack-lg"><div class="stack"><p class="eyebrow">Identificação</p><h2>Organização e respondente</h2>' +
      '<p class="muted">Nenhum campo é obrigatório. O nome da organização é usado para reunir respostas de várias pessoas na consolidação.</p></div>' +
      campo("org", "Organização", "nome") +
      '<div class="grid2">' + campo("uni", "Unidade ou área", "unidade") + campo("pais", "País", "pais") + "</div>" +
      campo("funcao", "Função de quem responde", "funcao", "Por exemplo: gestão de PD&amp;I, equipe de avaliação, transferência de tecnologia.") +
      "</div>" + nav();
  }

  function afirmHtml(a) {
    var v = S.respostas[a.codigo];
    var btns = ESC.map(function (r, i) {
      var n = i + 1;
      return '<button class="score" data-code="' + a.codigo + '" data-v="' + n + '" aria-pressed="' + (v === n) + '" aria-label="' + n + ", " + esc(r) + '"><b>' + n + "</b><small>" + esc(r) + "</small></button>";
    }).join("") + '<button class="score ns" data-code="' + a.codigo + '" data-v="0" aria-pressed="' + (v === 0) + '"><b>' + esc(INST.escala.nao_sei) + "</b></button>";
    return '<div class="item" id="item-' + a.codigo + '"><div class="item-head"><span class="code">' + a.codigo + '</span><p class="q">' + esc(a.texto) + "</p></div>" +
      '<div class="scores six" role="group" aria-label="Resposta para ' + a.codigo + '">' + btns + "</div>" +
      '<div class="anchor" id="anc-' + a.codigo + '">' + (v ? esc(ESC[v - 1]) : v === 0 ? esc(INST.escala.nao_sei) : "") + "</div>" +
      '<details><summary class="small">Texto original em inglês</summary><div><p class="small muted">' + esc(a.texto_en) + "</p></div></details></div>";
  }

  function viewDim(d, n) {
    return exampleBanner() + '<div class="stack-lg"><div class="stack"><p class="eyebrow">Dimensão ' + (n - 1) + " de " + DIMS.length + "</p><h2>" + esc(d.nome) + "</h2><p>" + esc(d.descricao) + "</p></div>" +
      '<div class="stack">' + d.afirmacoes.map(afirmHtml).join("") + "</div>" +
      '<div class="field"><label for="obs-' + d.id + '">Observações sobre esta dimensão</label><textarea id="obs-' + d.id + '" data-obs="' + d.id + '" placeholder="Registre exemplos, práticas existentes ou dificuldades que ajudem a interpretar as respostas.">' + esc(S.comentarios[d.id] || "") + "</textarea></div>" +
      "</div>" + nav();
  }

  function radar(linhas) {
    var W = 520, H = 420, cx = 260, cy = 212, Rad = 130, n = linhas.length;
    function ang(i) { return (-90 + i * 360 / n) * Math.PI / 180; }
    function pt(i, pct) { var a = ang(i); return [cx + Rad * pct / 100 * Math.cos(a), cy + Rad * pct / 100 * Math.sin(a)]; }
    var rings = "";
    [20, 40, 60, 80, 100].forEach(function (k) {
      rings += '<polygon class="ring" points="' + linhas.map(function (_, i) { return pt(i, k).map(function (x) { return x.toFixed(1); }).join(","); }).join(" ") + '"/>';
      rings += '<text class="tick" x="' + (cx + 4) + '" y="' + (cy - Rad * k / 100 + 3).toFixed(1) + '">' + k + "</text>";
    });
    var axes = "", labels = "", dots = "";
    var ref = linhas.map(function (_, i) { return pt(i, REF).map(function (x) { return x.toFixed(1); }).join(","); }).join(" ");
    var org = linhas.map(function (l, i) { return pt(i, l.pct || 0).map(function (x) { return x.toFixed(1); }).join(","); }).join(" ");
    linhas.forEach(function (l, i) {
      var a = ang(i), e = pt(i, 100);
      axes += '<line class="axis" x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '"/>';
      if (l.pct !== null) { var p = pt(i, l.pct); dots += '<circle class="pt" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5"/>'; }
      var lx = cx + (Rad + 14) * Math.cos(a), ly = cy + (Rad + 14) * Math.sin(a);
      var cos = Math.cos(a), anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
      var dy = Math.sin(a) < -0.6 ? -20 : Math.sin(a) > 0.6 ? 14 : 0;
      labels += '<text x="' + lx.toFixed(1) + '" y="' + (ly + dy).toFixed(1) + '" text-anchor="' + anchor + '"><tspan font-weight="600">' + esc(l.dim.sigla) + '</tspan><tspan x="' + lx.toFixed(1) + '" dy="15" class="na">' + (l.pct === null ? "sem resposta" : fmt(l.pct, 0) + "%") + "</tspan></text>";
    });
    return '<svg class="radar" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Resultado por dimensão em percentual da pontuação máxima">' + rings + axes +
      '<polygon class="ref" points="' + ref + '"/><polygon class="shape" points="' + org + '"/>' + dots + labels + "</svg>";
  }

  function listas(resp) {
    var dest = [], melh = [], inter = 0;
    DIMS.forEach(function (d) {
      var dd = [], mm = [];
      d.afirmacoes.forEach(function (a) {
        var v = resp[a.codigo]; if (!v) return;
        if (v >= INST.regras.destaque_min) dd.push(a); else if (v <= INST.regras.melhorar_max) mm.push(a); else inter++;
      });
      if (dd.length) dest.push({ dim: d, itens: dd });
      if (mm.length) melh.push({ dim: d, itens: mm });
    });
    return { destaques: dest, melhorar: melh, intermediarios: inter };
  }
  function listaHtml(grupos, resp) {
    if (!grupos.length) return '<p class="muted small">Nenhuma afirmação nesta faixa.</p>';
    return grupos.map(function (g) {
      return '<div class="weak-dim"><h3>' + esc(g.dim.nome) + "</h3><ul>" + g.itens.map(function (a) {
        return '<li><span class="code">' + a.codigo + "</span> " + esc(a.texto) + ' <span class="muted">(' + fmt(resp[a.codigo]) + ")</span></li>";
      }).join("") + "</ul></div>";
    }).join("");
  }

  function viewResultado() {
    var resp = respostasAtivas();
    var linhas = porDimensao(resp);
    var L = listas(resp);
    var o = S.organizacao;
    var validas = linhas.filter(function (l) { return l.pct !== null; });
    var geral = validas.length ? avg(validas.map(function (l) { return l.pct; })) : null;
    var acima = validas.filter(function (l) { return l.pct >= REF; }).length;
    var cons = VISTA === "consolidada" && CONS;

    var tabela = linhas.map(function (l) {
      return "<tr><td>" + esc(l.dim.nome) + '</td><td class="num">' + (l.pct === null ? "–" : fmt(l.pct, 0) + "%") + "</td><td>" +
        (l.pct === null ? "–" : '<span class="pill ' + (l.pct >= REF ? "acima" : "abaixo") + '">' + (l.pct >= REF ? "acima da referência" : "abaixo da referência") + "</span>") +
        '</td><td class="num">' + l.n + " de " + l.total + (l.ns ? " · " + l.ns + " sem avaliação" : "") + "</td></tr>";
    }).join("");

    var seletor = CONS ? '<div class="seg" role="group" aria-label="Vista do resultado"><button data-vista="minha" aria-pressed="' + (VISTA === "minha") + '">Minhas respostas</button><button data-vista="consolidada" aria-pressed="' + (VISTA === "consolidada") + '">Consolidado (' + CONS.n + " respondentes)</button></div>" : "";

    var divergHtml = "";
    if (cons) {
      var itens = Object.keys(CONS.dispersao).filter(function (c) { return CONS.dispersao[c].padrao !== "consenso"; });
      var ordem = { polarizacao: 0, destoante: 1, divergencia: 2, moderada: 3 };
      itens.sort(function (a, b) { return ordem[CONS.dispersao[a].padrao] - ordem[CONS.dispersao[b].padrao] || CONS.dispersao[b].ad - CONS.dispersao[a].ad; });
      divergHtml = '<div class="panel"><h3>Afirmações para discussão</h3><p class="small muted">Sinalizadas pela dispersão das respostas entre os respondentes (desvio médio em relação à mediana e padrão da distribuição). O número varia conforme as respostas e pode ser zero.</p>' +
        (itens.length ? '<ul class="alerts">' + itens.map(function (c) {
          var d = CONS.dispersao[c], p = PADRAO[d.padrao];
          return '<li class="' + (d.padrao === "polarizacao" ? "crit" : d.padrao === "moderada" ? "info" : "warn") + '"><span class="tag">' + esc(p[0]) + " · " + c + "</span>" + esc(AFIRM[c].texto) +
            '<br><span class="dots">Respostas: ' + d.notas.slice().sort().join(", ") + " · mediana " + fmt(d.mediana) + " · desvio médio " + fmt(d.ad, 2) + "</span><br><span class=\"small muted\">" + esc(p[1]) + "</span></li>";
        }).join("") + "</ul>" : '<p class="muted">Nenhuma afirmação com divergência relevante entre os respondentes.</p>') + "</div>";
    }

    var consPanel = '<div class="panel no-print"><h3>Consolidar respostas da organização</h3>' +
      '<p class="small">Quando várias pessoas da mesma organização respondem, cada uma baixa ou copia suas respostas e as envia a quem coordena. A consolidação calcula a média de cada afirmação e indica as afirmações em que as respostas divergem, para discussão.</p>' +
      '<label class="small" for="cons-files">Arquivos de respostas (.json), um por respondente</label><input type="file" id="cons-files" accept=".json,application/json" multiple>' +
      '<label class="small" for="cons-txt">Ou cole as respostas copiadas, uma após a outra</label><textarea id="cons-txt"></textarea>' +
      '<label class="opts"><span><input type="checkbox" id="cons-incluir" checked> Incluir as minhas respostas</span></label>' +
      '<div class="actions"><button class="btn" data-act="consolidar">Consolidar</button>' + (CONS ? '<button class="btn" data-act="desfazer-cons">Desfazer consolidação</button>' : "") + "</div></div>";

    var exportar = '<div class="panel no-print"><h3>Relatório e respostas</h3>' +
      '<div class="actions">' + (podeBaixar() ? '<button class="btn primary" data-act="baixar-docx">Baixar relatório (Word)</button>' : "") +
      '<button class="btn" data-act="copiar-relatorio">Copiar texto do relatório</button>' + (!framed ? '<button class="btn" data-act="imprimir">Imprimir ou salvar em PDF</button>' : "") + "</div>" +
      '<div class="actions"><button class="btn" data-act="copiar">Copiar minhas respostas</button>' + (podeBaixar() ? '<button class="btn" data-act="baixar">Baixar minhas respostas (.json)</button>' : "") + "</div>" +
      '<details><summary>Importar respostas</summary><div><label class="small" for="imp-file">Arquivo de respostas (.json)</label><input type="file" id="imp-file" accept=".json,application/json">' +
      '<label class="small" for="imp-txt">Ou cole o conteúdo copiado</label><textarea id="imp-txt"></textarea><div class="actions"><button class="btn" data-act="importar">Carregar respostas</button></div></div></details>' +
      '<div id="msg" class="msg" role="status"></div><textarea id="copia" hidden readonly></textarea>' +
      '<div class="actions"><button class="btn danger" data-act="pedir-novo">Novo diagnóstico</button></div><div id="confirm-slot"></div></div>';

    return exampleBanner() + '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">' + (cons ? "Resultado consolidado" : "Resultado") + "</p><h2>" + esc(o.nome || "Organização não identificada") + "</h2>" +
      '<p class="muted small">' + [o.unidade, o.pais, cons ? CONS.n + " respondentes" : o.funcao].filter(Boolean).map(esc).join(" · ") + "</p>" + seletor + "</div>" +
      '<div class="cards">' +
      '<div class="card"><span class="eyebrow">Resultado geral</span><span class="v">' + (geral === null ? "–" : fmt(geral, 0) + "%") + '</span><span class="small muted">Média das dimensões, em percentual da pontuação máxima</span></div>' +
      '<div class="card"><span class="eyebrow">Acima da referência</span><span class="v">' + acima + ' <small>de ' + DIMS.length + '</small></span><span class="small muted">Dimensões com resultado igual ou superior a ' + REF + "%</span></div>" +
      '<div class="card"><span class="eyebrow">Afirmações respondidas</span><span class="v">' + contagem(resp) + " <small>de " + TOTAL + '</small></span><span class="small muted">Incluídas as marcadas como sem avaliação</span></div></div>' +
      '<div class="panel"><h3>Radar das dimensões</h3><p class="small muted">Percentual da pontuação máxima em cada dimensão. A linha tracejada indica o valor de referência de ' + REF + "%.</p>" + radar(linhas) +
      '<div class="legend"><span><i></i>' + (cons ? "Organização (consolidado)" : "Organização") + '</span><span><i class="ref"></i>Referência (' + REF + '%)</span><span><i class="max"></i>Máximo (100%)</span></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Dimensão</th><th class="num">Resultado</th><th>Situação</th><th class="num">Respostas</th></tr></thead><tbody>' + tabela + "</tbody></table></div></div>" +
      divergHtml +
      '<div class="panel"><h3>Destaques e pontos a melhorar</h3><p class="small muted">Destaques: afirmações com resposta média igual ou superior a ' + INST.regras.destaque_min + ". Pontos a melhorar: resposta média igual ou inferior a " + INST.regras.melhorar_max + ". " + L.intermediarios + " afirmações ficaram na faixa intermediária.</p>" +
      '<div class="lists"><div class="stack"><h3 class="tag-ok">Destaques</h3>' + listaHtml(L.destaques, resp) + '</div><div class="stack"><h3 class="tag-warn">Pontos a melhorar</h3>' + listaHtml(L.melhorar, resp) + "</div></div></div>" +
      consPanel + exportar + "</div>" + nav();
  }

  /* ---------- Relatório ---------- */

  function relatorio() {
    var resp = respostasAtivas(), linhas = porDimensao(resp), L = listas(resp), o = S.organizacao, cons = VISTA === "consolidada" && CONS;
    var secoes = [];
    secoes.push({ h: "Identificação", blocos: [["Organização", o.nome], ["Unidade ou área", o.unidade], ["País", o.pais], [cons ? "Respondentes" : "Função de quem respondeu", cons ? String(CONS.n) : o.funcao]]
      .filter(function (x) { return x[1]; }).map(function (x) { return { li: [{ t: x[0] + ": ", b: true }, { t: x[1] }] }; }) });
    secoes.push({ h: "Resultado por dimensão", blocos: [{ p: [{ t: "Percentual da pontuação máxima em cada dimensão, comparado ao valor de referência de " + REF + "%." }] }].concat(linhas.map(function (l) {
      return { li: [{ t: l.dim.nome + ": ", b: true }, { t: l.pct === null ? "sem respostas." : fmt(l.pct, 0) + "% (" + (l.pct >= REF ? "acima" : "abaixo") + " da referência; " + l.n + " de " + l.total + " afirmações avaliadas)." }] };
    })) });
    if (cons) {
      var it = Object.keys(CONS.dispersao).filter(function (c) { return CONS.dispersao[c].padrao !== "consenso"; });
      secoes.push({ h: "Afirmações para discussão", blocos: it.length ? it.map(function (c) { var d = CONS.dispersao[c]; return { li: [{ t: PADRAO[d.padrao][0] + " (" + c + "): ", b: true }, { t: AFIRM[c].texto + " Respostas: " + d.notas.slice().sort().join(", ") + "." }] }; }) : [{ p: [{ t: "Nenhuma afirmação com divergência relevante." }] }] });
    }
    function grupos(g) { var b = []; g.forEach(function (x) { b.push({ sub: x.dim.nome }); x.itens.forEach(function (a) { b.push({ li: [{ t: a.codigo + ". ", b: true }, { t: a.texto }] }); }); }); return b.length ? b : [{ p: [{ t: "Nenhuma afirmação nesta faixa." }] }]; }
    secoes.push({ h: "Destaques", blocos: grupos(L.destaques) });
    secoes.push({ h: "Pontos a melhorar", blocos: grupos(L.melhorar) });
    var obs = DIMS.filter(function (d) { return (S.comentarios[d.id] || "").trim(); }).map(function (d) { return { li: [{ t: d.nome + ": ", b: true }, { t: S.comentarios[d.id].trim() }] }; });
    if (obs.length && !cons) secoes.push({ h: "Observações", blocos: obs });
    return { titulo: "AgroRadarEval: " + (o.nome || "diagnóstico"), subtitulo: "Diagnóstico do processo de avaliação. Gerado em " + hoje() + " com o instrumento versão " + INST.versao + (cons ? ", resultado consolidado de " + CONS.n + " respondentes." : "."), secoes: secoes };
  }
  function relTexto(E) {
    var L = [E.titulo, E.subtitulo, ""];
    E.secoes.forEach(function (s) { L.push(s.h.toUpperCase()); s.blocos.forEach(function (b) { if (b.sub) L.push(b.sub); else if (b.li) L.push("- " + b.li.map(function (r) { return r.t; }).join("")); else L.push(b.p.map(function (r) { return r.t; }).join("")); }); L.push(""); });
    return L.join("\n");
  }
  function xml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function wRuns(runs) { return runs.map(function (r) { return "<w:r>" + (r.b ? "<w:rPr><w:b/></w:rPr>" : "") + '<w:t xml:space="preserve">' + xml(r.t) + "</w:t></w:r>"; }).join(""); }
  function wP(style, inner, ind) { var ppr = (style ? '<w:pStyle w:val="' + style + '"/>' : "") + (ind ? '<w:ind w:left="360" w:hanging="240"/>' : '<w:jc w:val="both"/>'); return "<w:p><w:pPr>" + ppr + "</w:pPr>" + inner + "</w:p>"; }
  function docxBlob(E) {
    var body = wP("Title", wRuns([{ t: E.titulo }])) + wP("Subtitle", wRuns([{ t: E.subtitulo }]));
    E.secoes.forEach(function (s) { body += wP("Heading1", wRuns([{ t: s.h }])); s.blocos.forEach(function (b) { if (b.sub) body += wP("Heading2", wRuns([{ t: b.sub }])); else if (b.li) body += wP(null, wRuns([{ t: "• " }].concat(b.li)), true); else body += wP(null, wRuns(b.p)); }); });
    var W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + W + "><w:body>" + body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
    function st(id, name, rpr, ppr) { return '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + name + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' + (ppr ? "<w:pPr>" + ppr + "</w:pPr>" : "") + "<w:rPr>" + rpr + "</w:rPr></w:style>"; }
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ' + W + '><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      st("Title", "Title", '<w:b/><w:sz w:val="36"/><w:color w:val="1C6A58"/>', '<w:spacing w:after="120"/>') + st("Subtitle", "Subtitle", '<w:i/><w:sz w:val="20"/><w:color w:val="586A63"/>', '<w:spacing w:after="240"/>') +
      st("Heading1", "heading 1", '<w:b/><w:sz w:val="28"/><w:color w:val="1C6A58"/>', '<w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/>') + st("Heading2", "heading 2", '<w:b/><w:sz w:val="24"/>', '<w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/>') + "</w:styles>";
    var z = new JSZip();
    z.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
    z.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file("word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    z.file("word/document.xml", doc); z.file("word/styles.xml", styles);
    return z.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }

  /* ---------- Arquivos ---------- */

  var DL = null;
  try { if (window.claude && typeof window.claude.use === "function") window.claude.use("downloads").then(function (ns) { DL = ns; if (STEPS[step].id === "resultado") render(); }, function () {}); } catch (e) {}
  function podeBaixar() { return !!DL || !framed; }
  function nomeArquivo(ext) {
    var base = (S.organizacao.nome || "organizacao").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    var f = (S.organizacao.funcao || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20);
    return "agroradareval-" + (base || "organizacao") + (f ? "-" + f : "") + "." + ext;
  }
  function salvar(nome, data) {
    if (DL) return DL.save({ filename: nome, data: data }).then(function () { msg("Arquivo salvo.", true); }, function (e) { if (e && e.code === "declined") return; msg("Não foi possível salvar o arquivo neste ambiente. Use a opção de copiar."); });
    var blob = data instanceof Blob ? data : new Blob([data], { type: "application/octet-stream" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    return Promise.resolve();
  }
  function lerJsons(texto) {
    var out = [], t = texto.trim(); if (!t) return out;
    try { var x = JSON.parse(t); return Array.isArray(x) ? x : [x]; } catch (e) {}
    var prof = 0, ini = -1, str = false, escp = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (str) { if (escp) escp = false; else if (ch === "\\") escp = true; else if (ch === '"') str = false; continue; }
      if (ch === '"') str = true; else if (ch === "{") { if (prof === 0) ini = i; prof++; } else if (ch === "}") { prof--; if (prof === 0 && ini >= 0) { try { out.push(JSON.parse(t.slice(ini, i + 1))); } catch (e) {} ini = -1; } }
    }
    return out;
  }
  function lerArquivos(files) {
    return Promise.all(Array.prototype.map.call(files || [], function (f) { return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(String(r.result)); }; r.onerror = function () { res(""); }; r.readAsText(f); }); }));
  }

  /* ---------- Renderização e eventos ---------- */

  function render() {
    var s = STEPS[step], body;
    if (s.id === "inicio") body = viewInicio(); else if (s.id === "identificacao") body = viewIdentificacao(); else if (s.id === "resultado") body = viewResultado(); else body = viewDim(s.dim, step);
    app.innerHTML = header() + '<main><div class="wrap">' + body + "</div></main>";
    var cur = app.querySelector('.chip[aria-current="step"]'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest", inline: "center" });
  }
  function go(i) { step = Math.max(0, Math.min(STEPS.length - 1, i)); render(); window.scrollTo(0, 0); }
  function pedirNovo() { var s = document.getElementById("confirm-slot"); if (s) s.innerHTML = '<div class="confirm"><span>As respostas salvas neste navegador serão apagadas.</span><button class="btn danger" data-act="novo">Apagar e começar de novo</button><button class="btn" data-act="cancelar">Cancelar</button></div>'; }
  function copiar(txt, ok) {
    var fb = function () { var ta = document.getElementById("copia"); ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); msg("Não foi possível copiar automaticamente. O conteúdo foi selecionado no campo ao final da página; copie-o manualmente."); };
    try { navigator.clipboard.writeText(txt).then(function () { msg(ok, true); }, fb); } catch (e) { fb(); }
  }

  app.addEventListener("click", function (ev) {
    var t = ev.target.closest("button"); if (!t) return;
    if (t.dataset.go !== undefined) { go(parseInt(t.dataset.go, 10)); return; }
    if (t.dataset.vista) { VISTA = t.dataset.vista; render(); return; }
    if (t.dataset.code) {
      var c = t.dataset.code, v = parseInt(t.dataset.v, 10);
      if (S.respostas[c] === v) delete S.respostas[c]; else S.respostas[c] = v;
      save();
      var it = document.getElementById("item-" + c), cur = S.respostas[c];
      it.querySelectorAll(".score").forEach(function (b) { b.setAttribute("aria-pressed", String(cur !== undefined && parseInt(b.dataset.v, 10) === cur)); });
      document.getElementById("anc-" + c).textContent = cur ? ESC[cur - 1] : cur === 0 ? INST.escala.nao_sei : "";
      refreshStatus(); return;
    }
    switch (t.dataset.act) {
      case "comecar": S = blank(); save(); go(1); break;
      case "exemplo": S = exemplo(); CONS = null; VISTA = "minha"; go(STEPS.length - 1); break;
      case "novo-real": S = load() || blank(); if (S.exemplo) S = blank(); CONS = null; VISTA = "minha"; go(1); break;
      case "pedir-novo": pedirNovo(); break;
      case "cancelar": document.getElementById("confirm-slot").innerHTML = ""; break;
      case "novo": try { localStorage.removeItem(KEY); } catch (e) {} S = blank(); CONS = null; VISTA = "minha"; save(); go(1); break;
      case "copiar": copiar(JSON.stringify(S, null, 2), "Respostas copiadas."); break;
      case "copiar-relatorio": copiar(relTexto(relatorio()), "Texto do relatório copiado."); break;
      case "baixar": salvar(nomeArquivo("json"), JSON.stringify(S, null, 2)); break;
      case "baixar-docx":
        if (typeof JSZip === "undefined") { msg("Não foi possível gerar o arquivo Word neste ambiente. Use a opção de copiar o texto."); break; }
        docxBlob(relatorio()).then(function (b) { return salvar(nomeArquivo("docx"), b); }, function () { msg("Não foi possível gerar o arquivo Word."); });
        break;
      case "imprimir": window.print(); break;
      case "importar": {
        var f = document.getElementById("imp-file"), tx = document.getElementById("imp-txt").value;
        lerArquivos(f.files).then(function (arqs) {
          var lista = lerJsons(arqs.join("\n") + "\n" + tx).filter(valid);
          if (!lista.length) { msg("Nenhuma resposta válida do AgroRadarEval foi encontrada."); return; }
          S = normalize(lista[0]); S.exemplo = false; save(); CONS = null; VISTA = "minha"; go(STEPS.length - 1); msg("Respostas carregadas.", true);
        });
        break;
      }
      case "consolidar": {
        var fs = document.getElementById("cons-files"), ct = document.getElementById("cons-txt").value, inc = document.getElementById("cons-incluir").checked;
        lerArquivos(fs.files).then(function (arqs) {
          var lista = lerJsons(arqs.join("\n") + "\n" + ct).filter(valid);
          if (inc && contagem(S.respostas)) lista.unshift(S);
          if (lista.length < 2) { msg("São necessárias respostas de pelo menos duas pessoas para consolidar."); return; }
          CONS = consolidar(lista); VISTA = "consolidada"; render(); window.scrollTo(0, 0);
        });
        break;
      }
      case "desfazer-cons": CONS = null; VISTA = "minha"; render(); break;
    }
  });
  app.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t.dataset.org) { S.organizacao[t.dataset.org] = t.value; save(); }
    else if (t.dataset.obs) { S.comentarios[t.dataset.obs] = t.value; save(); }
  });

  /* ---------- Exemplo fictício ---------- */

  function exemplo() {
    var s = blank(); s.exemplo = true;
    s.organizacao = { nome: "Exemplo: instituto de pesquisa agropecuária", unidade: "Coordenação de avaliação", pais: "Brasil", funcao: "Gestão de PD&I" };
    var perfil = { participacao: [4, 3, 3, 3, 4, 2, 3, 3, 2, 4, 3, 2, 2, 3], competencias: [3, 2, 3, 2, 2, 2, 3, 2, 3, 2, 2, 3], cultura: [3, 4, 3, 4, 3, 3, 2, 2, 3, 4, 4, 3, 3],
      retroalimentacao: [3, 3, 2, 2, 2, 2, 3, 3, 2, 3], planejamento: [3, 4, 2, 4, 3, 2, 3, 3, 2], monitoramento: [2, 2, 1, 2, 2, 2, 2, 3, 3, 1, 2],
      ambiente: [4, 4, 5, 4, 3, 3, 3, 4, 5, 3, 3], comunicacao: [4, 3, 4, 3, 3, 4, 2, 2, 3, 3, 4, 3, 3, 2] };
    DIMS.forEach(function (d) { d.afirmacoes.forEach(function (a, i) { s.respostas[a.codigo] = perfil[d.id][i]; }); });
    s.respostas.MR3 = 0;
    s.comentarios.monitoramento = "As recomendações das avaliações não têm responsável definido nem acompanhamento sistemático.";
    return s;
  }

  render();
})();
