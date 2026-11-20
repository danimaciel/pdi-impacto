(function () {
  "use strict";

  var INST = JSON.parse(document.getElementById("instrumento").textContent);
  var DIMS = INST.dimensoes;
  var IMP = DIMS.filter(function (d) { return d.bloco === "impacto_potencial"; });
  var TRAJ = DIMS.filter(function (d) { return d.bloco === "trajetoria"; })[0];
  var LISTAS = INST.listas;
  var KEY = "terimpact.v1.rascunho";
  var app = document.getElementById("app");

  var framed = true;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }

  var STEPS = [{ id: "inicio", nome: "Início" }, { id: "proposta", nome: "Proposta" }]
    .concat(DIMS.map(function (d) { return { id: d.id, nome: d.nome, dim: d }; }))
    .concat([{ id: "resultado", nome: "Resultado" }]);

  /* ---------- Estado ---------- */

  function blank() {
    return {
      instrumento: INST.instrumento, versao: INST.versao,
      criado: new Date().toISOString(), atualizado: null, exemplo: false,
      contexto: { titulo: "", tipo: "", escala: "", publicos: [], parceiros: "", duracao: "", transformacao: "" },
      pertinencia: {}, pertinencia_just: {}, respostas: {}
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      return valid(s) ? normalize(s) : null;
    } catch (e) { return null; }
  }

  var saveOk = true;
  function save() {
    S.atualizado = new Date().toISOString();
    if (S.exemplo) return;
    try { localStorage.setItem(KEY, JSON.stringify(S)); saveOk = true; }
    catch (e) { saveOk = false; }
  }

  function valid(s) {
    return s && typeof s === "object" && s.respostas && typeof s.respostas === "object" && s.contexto;
  }

  function normalize(s) {
    var b = blank();
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    Object.keys(b.contexto).forEach(function (k) { if (s.contexto[k] === undefined) s.contexto[k] = b.contexto[k]; });
    return s;
  }

  var S = load() || blank();
  var step = 0;

  /* ---------- Cálculo ---------- */

  function avg(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
  function nota(code) { var r = S.respostas[code]; return r && r.nota ? r.nota : null; }
  function aplica(d) { return d.bloco === "trajetoria" || S.pertinencia[d.id] !== false; }

  function dimInfo(d) {
    if (!aplica(d)) return { status: "na", media: null, n: 0, total: d.itens.length };
    var v = d.itens.map(function (i) { return nota(i.codigo); }).filter(Boolean);
    return {
      status: v.length === 0 ? "vazio" : v.length < d.itens.length ? "parcial" : "completo",
      media: v.length ? avg(v) : null, n: v.length, total: d.itens.length
    };
  }

  function resumo() {
    var dims = {};
    DIMS.forEach(function (d) { dims[d.id] = dimInfo(d); });
    var impVals = IMP.map(function (d) { return dims[d.id]; }).filter(function (x) { return x.media !== null; });
    var imp = impVals.length ? avg(impVals.map(function (x) { return x.media; })) : null;
    var mat = dims[TRAJ.id].media;
    var total = 0, resp = 0;
    DIMS.forEach(function (d) { if (aplica(d)) { total += d.itens.length; resp += dims[d.id].n; } });
    var indice = imp !== null && mat !== null ? imp * mat : null;
    var classe = null;
    if (indice !== null) {
      var regras = INST.calculo.classificacao.slice().sort(function (a, b) { return b.min - a.min; });
      for (var i = 0; i < regras.length; i++) { if (indice >= regras[i].min) { classe = regras[i].rotulo; break; } }
    }
    return {
      dims: dims, imp: imp, mat: mat, indice: indice, classe: classe, total: total, resp: resp,
      nImp: impVals.length,
      nNa: IMP.filter(function (d) { return dims[d.id].status === "na"; }).length
    };
  }

  function temPublico(lista) {
    return S.contexto.publicos.some(function (p) { return lista.indexOf(p) >= 0; });
  }

  function alertas(R) {
    var A = [];
    var d = R.dims;
    function m(id) { return d[id] ? d[id].media : null; }

    if (R.resp < R.total) {
      A.push({ nivel: "info", tag: "Preenchimento", texto: (R.total - R.resp) + " de " + R.total + " perguntas aplicáveis ainda não foram respondidas. Os resultados abaixo consideram apenas as respostas registradas." });
    }
    if (R.imp !== null && R.mat !== null && R.imp >= 3.5 && R.mat < 3) {
      A.push({ nivel: "crit", tag: "Coerência", texto: "O impacto potencial foi avaliado como elevado (" + fmt(R.imp) + "), mas a trajetória de impacto está pouco estruturada (" + fmt(R.mat) + "). Sem uma estratégia clara de uso dos resultados, o impacto esperado tende a não se realizar." });
    }
    if (m("politica") !== null && m("politica") >= 3.5 && !temPublico(["Gestores públicos", "Formuladores de políticas"])) {
      A.push({ nivel: "warn", tag: "Coerência", texto: "A dimensão Política foi bem avaliada, mas gestores públicos e formuladores de políticas não constam entre os públicos da proposta." });
    }
    if (m("economica") !== null && m("economica") >= 3.5 && !temPublico(["Produtores rurais", "Setor privado"])) {
      A.push({ nivel: "warn", tag: "Coerência", texto: "A dimensão Econômica foi bem avaliada, mas produtores rurais e setor privado não constam entre os públicos da proposta. Verifique quem se apropria do ganho econômico." });
    }
    if (m("social") !== null && m("social") >= 3.5 && !temPublico(["Produtores rurais", "Organizações sociais", "Gestores públicos"])) {
      A.push({ nivel: "warn", tag: "Coerência", texto: "A dimensão Social foi bem avaliada, mas nenhum público diretamente associado a benefícios sociais foi indicado." });
    }
    var t1 = nota("T1");
    if (t1 && t1 >= 4 && S.contexto.publicos.length === 0) {
      A.push({ nivel: "warn", tag: "Coerência", texto: "A pergunta T1 indica usuários bem identificados, mas nenhum público foi informado na caracterização da proposta." });
    }
    var t2 = nota("T2");
    if (t2 && t2 >= 4 && !S.contexto.parceiros.trim()) {
      A.push({ nivel: "warn", tag: "Coerência", texto: "A pergunta T2 indica parcerias fortes, mas os parceiros principais não foram informados." });
    }
    var c2 = nota("C2");
    if (c2 && c2 <= 2 && aplica(DIMS.filter(function (x) { return x.id === "cientifica"; })[0])) {
      A.push({ nivel: "crit", tag: "Fundamentação", texto: "O rigor teórico-metodológico (C2) foi avaliado como baixo. Essa fragilidade compromete a validade dos resultados em todas as dimensões." });
    }

    var notas = [], altasSemJust = [];
    DIMS.forEach(function (dm) {
      if (!aplica(dm)) return;
      dm.itens.forEach(function (it) {
        var r = S.respostas[it.codigo];
        if (r && r.nota) {
          notas.push(r.nota);
          if (r.nota >= 4 && !(r.justificativa || "").trim()) altasSemJust.push(it.codigo);
        }
      });
    });
    if (notas.length >= 10 && notas.filter(function (n) { return n === 5; }).length / notas.length >= 0.7) {
      A.push({ nivel: "warn", tag: "Autoavaliação", texto: "A maior parte das respostas recebeu a nota máxima. Reveja as perguntas com olhar crítico: um perfil uniforme em 5 raramente descreve uma proposta real." });
    }
    if (altasSemJust.length) {
      A.push({ nivel: "warn", tag: "Justificativa", texto: "Notas 4 ou 5 sem justificativa: " + altasSemJust.join(", ") + ". Registrar a base da resposta torna a avaliação verificável." });
    }
    IMP.forEach(function (dm) {
      if (S.pertinencia[dm.id] === false && !(S.pertinencia_just[dm.id] || "").trim()) {
        A.push({ nivel: "info", tag: "Pertinência", texto: "A dimensão " + dm.nome + " foi marcada como não aplicável sem justificativa." });
      }
    });
    return A;
  }

  /* ---------- Utilidades ---------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n) { return n === null || n === undefined ? "–" : n.toFixed(1).replace(".", ","); }
  function opts(list, sel) {
    return '<option value="">Selecione</option>' + list.map(function (v) {
      return '<option' + (v === sel ? " selected" : "") + ">" + esc(v) + "</option>";
    }).join("");
  }

  /* ---------- Cabeçalho ---------- */

  function header() {
    var R = resumo();
    var pct = R.total ? Math.round(100 * R.resp / R.total) : 0;
    var chips = STEPS.slice(1).map(function (s, i) {
      var idx = i + 1;
      var done = s.dim ? dimInfo(s.dim).status === "completo" || dimInfo(s.dim).status === "na" : false;
      return '<button class="chip' + (done ? " done" : "") + '" data-go="' + idx + '"' +
        (idx === step ? ' aria-current="step"' : "") + ">" + esc(s.nome) + "</button>";
    }).join("");
    return '<header class="top"><div class="wrap">' +
      '<div class="top-row"><div class="brand">Ter<span>Impact</span></div>' +
      '<div class="status" id="status">' + R.resp + " de " + R.total + " perguntas respondidas" + (saveOk ? "" : " · não foi possível salvar neste navegador") + "</div></div>" +
      '<div class="bar" aria-hidden="true"><i id="barfill" style="width:' + pct + '%"></i></div>' +
      (step > 0 ? '<nav class="chips" aria-label="Etapas">' + chips + "</nav>" : "") +
      "</div></header>";
  }

  function refreshStatus() {
    var R = resumo();
    var st = document.getElementById("status");
    if (st) st.textContent = R.resp + " de " + R.total + " perguntas respondidas" + (saveOk ? "" : " · não foi possível salvar neste navegador");
    var bf = document.getElementById("barfill");
    if (bf) bf.style.width = (R.total ? Math.round(100 * R.resp / R.total) : 0) + "%";
    STEPS.forEach(function (s, idx) {
      if (!s.dim) return;
      var c = app.querySelector('.chip[data-go="' + idx + '"]');
      if (c) { var di = dimInfo(s.dim); c.classList.toggle("done", di.status === "completo" || di.status === "na"); }
    });
  }

  function exampleBanner() {
    return S.exemplo ? '<div class="note example no-print">Você está vendo um exemplo fictício. As alterações não são salvas. <button class="btn link" data-act="novo-real">Iniciar minha avaliação</button></div>' : "";
  }

  function nav() {
    var prev = step > 1 ? '<button class="btn" data-go="' + (step - 1) + '">Anterior</button>' : "<span></span>";
    var next = step < STEPS.length - 1
      ? '<button class="btn primary" data-go="' + (step + 1) + '">' + (step === STEPS.length - 2 ? "Ver resultado" : "Próxima: " + esc(STEPS[step + 1].nome)) + "</button>"
      : "";
    return '<div class="nav no-print">' + prev + next + "</div>";
  }

  /* ---------- Telas ---------- */

  function viewInicio() {
    var temRascunho = !S.exemplo && Object.keys(S.respostas).length > 0;
    var escala = INST.escala.rotulos.map(function (r, i) { return "<li><b>" + (i + 1) + "</b><span>" + esc(r) + "</span></li>"; }).join("");
    return '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Avaliação ex ante</p><h1>TerImpact</h1>' +
      '<p class="lead">Análise do potencial de impacto de propostas de pesquisa antes da submissão.</p></div>' +
      '<p>O questionário reúne 23 perguntas, distribuídas em seis dimensões de impacto (econômica, social, ambiental, política, institucional e científica) e na trajetória de impacto. Para cada pergunta, atribua uma nota de 1 a 5 e registre brevemente em que se baseia a resposta. Ao final, a ferramenta apresenta o perfil da proposta, a maturidade da trajetória de impacto e os pontos que merecem atenção.</p>' +
      '<div class="stack"><h3>Escala</h3><ul class="scale">' + escala + "</ul></div>" +
      '<p class="muted small">Dimensões que não se aplicam à proposta podem ser marcadas como tal e são excluídas do cálculo.</p>' +
      '<div class="note">As respostas ficam armazenadas apenas neste navegador. Nenhuma informação é enviada a servidores.</div>' +
      '<div class="actions">' +
      (temRascunho ? '<button class="btn primary" data-go="1">Continuar avaliação</button><button class="btn" data-act="pedir-novo">Nova avaliação</button>'
        : '<button class="btn primary" data-act="comecar">Iniciar avaliação</button>') +
      '<button class="btn" data-act="exemplo">Ver exemplo preenchido</button></div>' +
      '<div id="confirm-slot"></div>' +
      '<p class="footer">Instrumento versão ' + esc(INST.versao) + ", derivado da planilha de Avaliação Ex Ante de Projetos de Pesquisa da Embrapa Territorial.</p>" +
      "</div>";
  }

  function viewProposta() {
    var c = S.contexto;
    var pubs = LISTAS.Usuarios.map(function (u, i) {
      return '<label><input type="checkbox" id="pub-' + i + '" data-pub="' + esc(u) + '"' + (c.publicos.indexOf(u) >= 0 ? " checked" : "") + "> " + esc(u) + "</label>";
    }).join("");
    return exampleBanner() + '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Etapa 1</p><h2>Caracterização da proposta</h2>' +
      '<p class="muted">Essas informações orientam a leitura dos resultados e permitem verificar a coerência entre as respostas. Nenhum campo é obrigatório.</p></div>' +
      '<div class="field"><label for="f-titulo">Título da proposta</label><input type="text" id="f-titulo" data-ctx="titulo" value="' + esc(c.titulo) + '"></div>' +
      '<div class="grid2">' +
      '<div class="field"><label for="f-tipo">Tipo de projeto</label><select id="f-tipo" data-ctx="tipo">' + opts(LISTAS.Tipos_Projeto, c.tipo) + "</select></div>" +
      '<div class="field"><label for="f-escala">Escala territorial</label><select id="f-escala" data-ctx="escala">' + opts(LISTAS.Escala_Territorial, c.escala) + "</select></div>" +
      '<div class="field"><label for="f-duracao">Duração prevista (meses)</label><input type="number" min="1" max="120" id="f-duracao" data-ctx="duracao" value="' + esc(c.duracao) + '"></div>' +
      '<div class="field"><label for="f-transf">Nível de transformação esperado</label><select id="f-transf" data-ctx="transformacao">' + opts(LISTAS.Nivel_Transformacao, c.transformacao) + "</select></div>" +
      "</div>" +
      '<fieldset class="field"><legend>Públicos da proposta</legend><span class="hint">Quem deverá usar ou se beneficiar dos resultados.</span><div class="checks">' + pubs + "</div></fieldset>" +
      '<div class="field"><label for="f-parc">Parceiros principais</label><input type="text" id="f-parc" data-ctx="parceiros" value="' + esc(c.parceiros) + '" placeholder="Instituições, separadas por ponto e vírgula"></div>' +
      "</div>" + nav();
  }

  function viewDim(d, n) {
    var isTraj = d.bloco === "trajetoria";
    var ap = aplica(d);
    var pert = isTraj ? "" :
      '<div class="stack"><p><strong>Esta dimensão se aplica à proposta?</strong></p>' +
      '<div class="segment" role="group" aria-label="Pertinência da dimensão">' +
      '<button data-pert="sim" aria-pressed="' + (S.pertinencia[d.id] !== false) + '">Sim, se aplica</button>' +
      '<button data-pert="nao" aria-pressed="' + (S.pertinencia[d.id] === false) + '">Não se aplica</button></div>' +
      '<div class="field" id="na-just"' + (ap ? " hidden" : "") + '><label for="na-' + d.id + '">Por que esta dimensão não se aplica?</label>' +
      '<textarea id="na-' + d.id + '" data-najust="' + d.id + '">' + esc(S.pertinencia_just[d.id] || "") + "</textarea></div></div>";

    var itens = d.itens.map(function (it) {
      var r = S.respostas[it.codigo] || {};
      var btns = it.ancoras.map(function (a, i) {
        var v = i + 1;
        return '<button class="score" data-code="' + it.codigo + '" data-v="' + v + '" aria-pressed="' + (r.nota === v) + '" aria-label="' + v + ", " + esc(a) + '"><b>' + v + "</b><small>" + esc(a) + "</small></button>";
      }).join("");
      return '<div class="item" id="item-' + it.codigo + '">' +
        '<div class="item-head"><span class="code">' + it.codigo + '</span><p class="q">' + esc(it.pergunta) + "</p></div>" +
        '<div class="scores" role="group" aria-label="Nota para ' + it.codigo + '">' + btns + "</div>" +
        '<div class="anchor" id="anc-' + it.codigo + '">' + (r.nota ? esc(it.ancoras[r.nota - 1]) : "") + "</div>" +
        '<div class="field"><label for="j-' + it.codigo + '" class="small">Justificativa</label>' +
        '<textarea id="j-' + it.codigo + '" data-just="' + it.codigo + '" placeholder="Em que se baseia esta nota?">' + esc(r.justificativa || "") + "</textarea></div>" +
        "</div>";
    }).join("");

    return exampleBanner() + '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Etapa ' + n + (isTraj ? "" : " · Dimensão") + "</p><h2>" + esc(d.nome) + "</h2>" +
      '<p class="guide">' + esc(d.pergunta_guia) + "</p></div>" +
      pert +
      '<div class="stack" id="itens"' + (ap ? "" : " hidden") + ">" + itens + "</div>" +
      "</div>" + nav();
  }

  function radar(R) {
    var W = 440, H = 340, cx = 220, cy = 172, Rad = 110, n = IMP.length;
    var pts = [], axes = "", labels = "", rings = "", dots = "";
    for (var k = 1; k <= 5; k++) {
      var ring = [];
      for (var i = 0; i < n; i++) {
        var a = (-90 + i * 360 / n) * Math.PI / 180;
        ring.push((cx + Rad * k / 5 * Math.cos(a)).toFixed(1) + "," + (cy + Rad * k / 5 * Math.sin(a)).toFixed(1));
      }
      rings += '<polygon class="ring" points="' + ring.join(" ") + '"/>';
      rings += '<text class="tick" x="' + (cx + 4) + '" y="' + (cy - Rad * k / 5 + 3).toFixed(1) + '">' + k + "</text>";
    }
    IMP.forEach(function (d, i) {
      var a = (-90 + i * 360 / n) * Math.PI / 180;
      var info = R.dims[d.id];
      var v = info.media || 0;
      var x = cx + Rad * v / 5 * Math.cos(a), y = cy + Rad * v / 5 * Math.sin(a);
      pts.push(x.toFixed(1) + "," + y.toFixed(1));
      if (info.media !== null) dots += '<circle class="pt" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5"/>';
      axes += '<line class="axis" x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Rad * Math.cos(a)).toFixed(1) + '" y2="' + (cy + Rad * Math.sin(a)).toFixed(1) + '"/>';
      var lx = cx + (Rad + 16) * Math.cos(a), ly = cy + (Rad + 16) * Math.sin(a);
      var cos = Math.cos(a), anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
      var dy = Math.sin(a) < -0.6 ? -20 : Math.sin(a) > 0.6 ? 14 : 0;
      var sub = info.status === "na" ? "não se aplica" : fmt(info.media);
      labels += '<text x="' + lx.toFixed(1) + '" y="' + (ly + dy).toFixed(1) + '" text-anchor="' + anchor + '"' + (info.status === "na" ? ' class="na"' : "") + ">" +
        '<tspan font-weight="600">' + esc(d.nome) + '</tspan><tspan x="' + lx.toFixed(1) + '" dy="15" class="na">' + sub + "</tspan></text>";
    });
    return '<svg class="radar" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Perfil de impacto por dimensão">' +
      rings + axes + '<polygon class="shape" points="' + pts.join(" ") + '"/>' + dots + labels + "</svg>";
  }

  function viewResultado() {
    var R = resumo();
    var A = alertas(R);
    var c = S.contexto;

    var linhas = IMP.map(function (d) {
      var i = R.dims[d.id];
      var st = i.status === "na" ? "Não se aplica" : i.status === "vazio" ? "Sem respostas" : i.status === "parcial" ? i.n + " de " + i.total + " respondidas" : "Completa";
      return "<tr><td>" + esc(d.nome) + '</td><td class="num">' + (i.status === "na" ? "–" : fmt(i.media)) + '</td><td class="muted">' + st + "</td></tr>";
    }).join("");

    var bars = TRAJ.itens.map(function (it) {
      var v = nota(it.codigo);
      return '<div class="brow"><span class="lbl"><span class="code">' + it.codigo + "</span> " + esc(it.rotulo_curto || it.pergunta) + "</span>" +
        '<div class="track"><i style="width:' + (v ? v * 20 : 0) + '%"></i></div><span class="n">' + (v || "–") + "</span></div>";
    }).join("");

    var fracos = DIMS.map(function (d) {
      if (!aplica(d)) return "";
      var its = d.itens.filter(function (it) { var v = nota(it.codigo); return v && v <= 2; });
      if (!its.length) return "";
      return '<div class="weak-dim"><h3>' + esc(d.nome) + "</h3><ul>" +
        its.map(function (it) { return "<li><span class=\"code\">" + it.codigo + "</span> " + esc(it.pergunta) + " <span class=\"muted\">(nota " + nota(it.codigo) + ")</span></li>"; }).join("") +
        '</ul><p class="guide">' + esc(d.pergunta_guia) + "</p></div>";
    }).join("");

    var alertHtml = A.length ? '<ul class="alerts">' + A.map(function (a) {
      return '<li class="' + a.nivel + '"><span class="tag">' + esc(a.tag) + "</span>" + esc(a.texto) + "</li>";
    }).join("") + "</ul>" : '<p class="muted">Nenhum alerta para as respostas registradas.</p>';

    var exportar = '<div class="panel no-print"><h3>Guardar e retomar</h3>' +
      '<p class="small muted">As respostas estão salvas neste navegador. Para usar em outro dispositivo ou guardar uma cópia, copie as respostas ou baixe o arquivo e depois importe-o.</p>' +
      '<div class="actions"><button class="btn" data-act="copiar">Copiar respostas</button>' +
      (framed ? "" : '<button class="btn" data-act="baixar">Baixar arquivo</button><button class="btn" data-act="imprimir">Imprimir ou salvar em PDF</button>') +
      "</div>" +
      '<details><summary>Importar respostas</summary><div>' +
      '<label class="small" for="imp-file">Arquivo de respostas (.json)</label><input type="file" id="imp-file" accept=".json,application/json">' +
      '<label class="small" for="imp-txt">Ou cole o conteúdo copiado</label><textarea id="imp-txt"></textarea>' +
      '<div class="actions"><button class="btn" data-act="importar">Carregar respostas</button></div></div></details>' +
      '<div id="msg" class="msg" role="status"></div><textarea id="copia" hidden readonly></textarea>' +
      '<div class="actions"><button class="btn danger" data-act="pedir-novo">Nova avaliação</button></div><div id="confirm-slot"></div>' +
      "</div>";

    var classif = '<details><summary>Indicadores da planilha original</summary><div>' +
      "<p>Índice estratégico (impacto potencial × maturidade da trajetória, escala de 1 a 25): <strong>" + fmt(R.indice) + "</strong>" + (R.classe ? " · " + esc(R.classe) : "") + "</p>" +
      '<p class="small muted">Esses indicadores reproduzem o cálculo da planilha usada pelo comitê. Os pontos de corte (10 e 15) são convencionais e ainda não foram calibrados. Para a análise da própria proposta, o perfil por dimensão é mais informativo.</p>' +
      "</div></details>";

    return exampleBanner() + '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Resultado</p><h2>' + esc(c.titulo || "Proposta sem título") + "</h2>" +
      '<p class="muted small">' + [c.tipo, c.escala, c.duracao ? c.duracao + " meses" : ""].filter(Boolean).map(esc).join(" · ") + "</p></div>" +
      '<div class="cards">' +
      '<div class="card"><span class="eyebrow">Impacto potencial</span><span class="v">' + fmt(R.imp) + " <small>de 5</small></span>" +
      '<span class="small muted">Média de ' + R.nImp + " dimens" + (R.nImp === 1 ? "ão" : "ões") + (R.nNa ? "; " + R.nNa + " não se aplica" + (R.nNa > 1 ? "m" : "") : "") + "</span></div>" +
      '<div class="card"><span class="eyebrow">Maturidade da trajetória</span><span class="v">' + fmt(R.mat) + " <small>de 5</small></span>" +
      '<span class="small muted">Média de T1 a T5</span></div>' +
      '<div class="card"><span class="eyebrow">Respostas</span><span class="v">' + R.resp + " <small>de " + R.total + "</small></span>" +
      '<span class="small muted">Perguntas aplicáveis</span></div>' +
      "</div>" +
      '<div class="panel"><h3>Alertas</h3>' + alertHtml + "</div>" +
      '<div class="panel"><h3>Perfil de impacto</h3>' + radar(R) +
      '<div class="table-wrap"><table><thead><tr><th>Dimensão</th><th class="num">Média</th><th>Situação</th></tr></thead><tbody>' + linhas + "</tbody></table></div></div>" +
      '<div class="panel"><h3>Trajetória de impacto</h3><div class="bars">' + bars + "</div></div>" +
      '<div class="panel"><h3>Pontos a fortalecer</h3>' + (fracos ? '<p class="small muted">Perguntas com nota 1 ou 2 e questões para orientar a revisão da proposta.</p><div class="weak">' + fracos + "</div>" : '<p class="muted">Nenhuma pergunta recebeu nota 1 ou 2.</p>') + classif + "</div>" +
      exportar +
      "</div>" + nav();
  }

  /* ---------- Renderização ---------- */

  function render() {
    var s = STEPS[step];
    var body;
    if (s.id === "inicio") body = viewInicio();
    else if (s.id === "proposta") body = viewProposta();
    else if (s.id === "resultado") body = viewResultado();
    else body = viewDim(s.dim, step);
    app.innerHTML = header() + '<main><div class="wrap">' + body + "</div></main>";
    var cur = app.querySelector('.chip[aria-current="step"]');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest", inline: "center" });
  }

  function go(i) {
    step = Math.max(0, Math.min(STEPS.length - 1, i));
    render();
    window.scrollTo(0, 0);
  }

  function msg(t, ok) {
    var m = document.getElementById("msg");
    if (m) { m.textContent = t; m.className = "msg " + (ok ? "ok" : "err"); }
  }

  function importar(texto) {
    var s;
    try { s = JSON.parse(texto); } catch (e) { msg("O conteúdo não é um arquivo de respostas válido. Verifique se foi copiado por inteiro."); return; }
    if (!valid(s)) { msg("O conteúdo não corresponde a respostas do TerImpact."); return; }
    S = normalize(s); S.exemplo = false; save();
    go(STEPS.length - 1);
    msg("Respostas carregadas.", true);
  }

  function pedirNovo() {
    var slot = document.getElementById("confirm-slot");
    if (!slot) return;
    slot.innerHTML = '<div class="confirm"><span>As respostas salvas neste navegador serão apagadas.</span>' +
      '<button class="btn danger" data-act="novo">Apagar e começar de novo</button><button class="btn" data-act="cancelar">Cancelar</button></div>';
  }

  /* ---------- Eventos ---------- */

  app.addEventListener("click", function (ev) {
    var t = ev.target.closest("button");
    if (!t) return;

    if (t.dataset.go !== undefined) { go(parseInt(t.dataset.go, 10)); return; }

    if (t.dataset.code) {
      var code = t.dataset.code, v = parseInt(t.dataset.v, 10);
      var r = S.respostas[code] || (S.respostas[code] = {});
      r.nota = r.nota === v ? null : v;
      if (!r.nota && !r.justificativa) delete S.respostas[code];
      save();
      var item = document.getElementById("item-" + code);
      item.querySelectorAll(".score").forEach(function (b) { b.setAttribute("aria-pressed", String(parseInt(b.dataset.v, 10) === (r.nota || 0))); });
      var it = null;
      DIMS.forEach(function (d) { d.itens.forEach(function (x) { if (x.codigo === code) it = x; }); });
      document.getElementById("anc-" + code).textContent = r.nota ? it.ancoras[r.nota - 1] : "";
      refreshStatus();
      return;
    }

    if (t.dataset.pert) {
      var d = STEPS[step].dim;
      if (t.dataset.pert === "nao") S.pertinencia[d.id] = false; else delete S.pertinencia[d.id];
      save();
      app.querySelectorAll("[data-pert]").forEach(function (b) {
        b.setAttribute("aria-pressed", String((b.dataset.pert === "nao") === (S.pertinencia[d.id] === false)));
      });
      document.getElementById("itens").hidden = S.pertinencia[d.id] === false;
      document.getElementById("na-just").hidden = S.pertinencia[d.id] !== false;
      refreshStatus();
      return;
    }

    switch (t.dataset.act) {
      case "comecar": S = blank(); save(); go(1); break;
      case "exemplo": S = exemplo(); go(STEPS.length - 1); break;
      case "novo-real": S = load() || blank(); if (S.exemplo) S = blank(); go(1); break;
      case "pedir-novo": pedirNovo(); break;
      case "cancelar": document.getElementById("confirm-slot").innerHTML = ""; break;
      case "novo":
        try { localStorage.removeItem(KEY); } catch (e) {}
        S = blank(); save(); go(1); break;
      case "copiar": {
        var txt = JSON.stringify(S, null, 2);
        var fallback = function () {
          var ta = document.getElementById("copia");
          ta.hidden = false; ta.value = txt; ta.focus(); ta.select();
          msg("Não foi possível copiar automaticamente. O conteúdo foi selecionado no campo acima; copie-o manualmente.");
        };
        try {
          navigator.clipboard.writeText(txt).then(function () { msg("Respostas copiadas. Guarde o conteúdo em um local seguro.", true); }, fallback);
        } catch (e) { fallback(); }
        break;
      }
      case "baixar": {
        var blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "terimpact-" + (S.contexto.titulo || "proposta").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) + ".json";
        document.body.appendChild(a); a.click(); a.remove();
        break;
      }
      case "imprimir": window.print(); break;
      case "importar": {
        var f = document.getElementById("imp-file");
        var txtIn = document.getElementById("imp-txt").value.trim();
        if (f.files && f.files[0]) {
          var rd = new FileReader();
          rd.onload = function () { importar(String(rd.result)); };
          rd.readAsText(f.files[0]);
        } else if (txtIn) importar(txtIn);
        else msg("Selecione um arquivo ou cole o conteúdo das respostas.");
        break;
      }
    }
  });

  app.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t.dataset.just) {
      var r = S.respostas[t.dataset.just] || (S.respostas[t.dataset.just] = {});
      r.justificativa = t.value; save();
    } else if (t.dataset.najust) {
      S.pertinencia_just[t.dataset.najust] = t.value; save();
    } else if (t.dataset.ctx) {
      S.contexto[t.dataset.ctx] = t.value; save();
    }
  });

  app.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.dataset.pub !== undefined) {
      var p = t.dataset.pub, l = S.contexto.publicos, i = l.indexOf(p);
      if (t.checked && i < 0) l.push(p);
      if (!t.checked && i >= 0) l.splice(i, 1);
      save();
    }
  });

  /* ---------- Exemplo fictício ---------- */

  function exemplo() {
    var s = blank();
    s.exemplo = true;
    s.contexto = {
      titulo: "Exemplo: monitoramento do uso da terra para apoio ao planejamento municipal",
      tipo: "Sistema de monitoramento", escala: "Regional",
      publicos: ["Gestores públicos", "Produtores rurais"],
      parceiros: "Universidade estadual; secretarias municipais de agricultura",
      duracao: "36", transformacao: "3 - Método/ferramenta"
    };
    var n = { E1: 3, E2: 3, E3: 2, S1: 4, S2: 2, S3: 3, A1: 4, A2: 3, A3: 5, P1: 5, P2: 4, P3: 4, I1: 4, I2: 5, I3: 4, C1: 3, C2: 4, C3: 4, T1: 4, T2: 3, T3: 2, T4: 4, T5: 3 };
    var j = {
      A3: "Mapeamento anual do uso e cobertura da terra em 40 municípios, com indicadores de conversão de vegetação nativa.",
      P1: "Demanda formal de dois consórcios municipais para subsidiar planos diretores rurais.",
      I2: "Base de dados e painel de consulta mantidos após o projeto pela equipe de geotecnologias.",
      T3: "Ainda não há definição de como os gestores municipais serão capacitados para usar o painel."
    };
    Object.keys(n).forEach(function (k) { s.respostas[k] = { nota: n[k], justificativa: j[k] || "" }; });
    return s;
  }

  render();
})();
