(function () {
  "use strict";

  var INST = JSON.parse(document.getElementById("instrumento").textContent);
  var BLOCOS = INST.blocos;
  var MAPA = BLOCOS.filter(function (b) { return b.tipo === "mapa"; })[0];
  var ITEM_BLOCOS = BLOCOS.filter(function (b) { return b.tipo === "itens"; });
  var KEY = "terimpact.v2.rascunho";
  var app = document.getElementById("app");

  var framed = true;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }

  var ITENS = {};
  ITEM_BLOCOS.forEach(function (b) { b.itens.forEach(function (it) { it.bloco = b.id; ITENS[it.codigo] = it; }); });
  var MUD = {};
  MAPA.dimensoes.forEach(function (d) { d.mudancas.forEach(function (m) { m.dim = d.id; MUD[m.codigo] = m; }); });

  var STEPS = [{ id: "inicio", nome: "Início" }, { id: "proposta", nome: "Proposta" }]
    .concat(BLOCOS.map(function (b) { return { id: b.id, nome: b.nome, bloco: b }; }))
    .concat([{ id: "resultado", nome: "Resultado" }]);

  /* ---------- Estado ---------- */

  function blank() {
    return {
      instrumento: INST.instrumento, versao: INST.versao,
      criado: new Date().toISOString(), atualizado: null, exemplo: false,
      contexto: { titulo: "", tipo: "", escala: "", duracao: "", transformacao: "", parceiros: "" },
      respostas: {}, mapa: {}
    };
  }
  function valid(s) { return s && typeof s === "object" && s.respostas && s.mapa && s.contexto; }
  function normalize(s) {
    var b = blank();
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    Object.keys(b.contexto).forEach(function (k) { if (s.contexto[k] === undefined) s.contexto[k] = b.contexto[k]; });
    return s;
  }
  function load() {
    try { var raw = localStorage.getItem(KEY); if (!raw) return null; var s = JSON.parse(raw); return valid(s) ? normalize(s) : null; }
    catch (e) { return null; }
  }
  var saveOk = true;
  function save() {
    S.atualizado = new Date().toISOString();
    if (S.exemplo) return;
    try { localStorage.setItem(KEY, JSON.stringify(S)); saveOk = true; } catch (e) { saveOk = false; }
  }

  var S = load() || blank();
  var step = 0;

  function R(code) { return S.respostas[code] || (S.respostas[code] = {}); }

  /* ---------- Cálculo ---------- */

  function avg(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
  function fmt(n) { return n === null || n === undefined ? "–" : n.toFixed(1).replace(".", ","); }

  function respondido(it) {
    var r = S.respostas[it.codigo];
    if (!r) return false;
    if (it.tipo === "escala") return !!r.nota || !!r.na;
    if (it.tipo === "texto") return !!(r.texto || "").trim();
    if (it.tipo === "multipla") return (r.opcoes || []).length > 0;
    return false;
  }

  function blocoMedia(b) {
    var v = b.itens.filter(function (it) { return it.tipo === "escala"; })
      .map(function (it) { var r = S.respostas[it.codigo]; return r && r.nota && !r.na ? r.nota : null; })
      .filter(Boolean);
    return v.length ? avg(v) : null;
  }

  function marcadas() { return Object.keys(S.mapa).filter(function (c) { return S.mapa[c] && S.mapa[c].marcada; }); }

  function progresso() {
    var total = 0, resp = 0;
    ITEM_BLOCOS.forEach(function (b) { b.itens.forEach(function (it) { total++; if (respondido(it)) resp++; }); });
    return { total: total, resp: resp, mudancas: marcadas().length };
  }

  function opcoes(code) { var r = S.respostas[code]; return r && r.opcoes ? r.opcoes : []; }
  function nota(code) { var r = S.respostas[code]; return r && r.nota && !r.na ? r.nota : null; }
  function texto(code) { var r = S.respostas[code]; return r && r.texto ? r.texto.trim() : ""; }

  function resumoMapa() {
    return MAPA.dimensoes.map(function (d) {
      var ms = d.mudancas.filter(function (m) { return S.mapa[m.codigo] && S.mapa[m.codigo].marcada; });
      var niveis = ms.map(function (m) { return S.mapa[m.codigo].nivel || 0; });
      var alc = ms.map(function (m) { return MAPA.campos.alcance.opcoes.indexOf(S.mapa[m.codigo].alcance); });
      var hor = ms.map(function (m) { return MAPA.campos.horizonte.opcoes.indexOf(S.mapa[m.codigo].horizonte); });
      return {
        dim: d, n: ms.length, mudancas: ms,
        nivel: niveis.length ? Math.max.apply(null, niveis) : 0,
        alcance: alc.length ? Math.max.apply(null, alc) : -1,
        horizonte: hor.length ? Math.max.apply(null, hor) : -1
      };
    });
  }

  function alertas() {
    var A = [];
    var mk = marcadas();
    var dimsCom = resumoMapa().filter(function (x) { return x.n > 0; });
    var usuarios = opcoes("CA2");
    function temUsuario(l) { return usuarios.some(function (u) { return l.indexOf(u) >= 0; }); }
    function dimMarcada(id) { return mk.some(function (c) { return MUD[c].dim === id; }); }
    var mCam = blocoMedia(BLOCOS.filter(function (b) { return b.id === "caminho"; })[0]);

    var p = progresso();
    if (p.resp < p.total) A.push({ n: "info", t: "Preenchimento", x: (p.total - p.resp) + " de " + p.total + " perguntas ainda não foram respondidas. A devolutiva considera apenas as respostas registradas." });
    if (!mk.length) A.push({ n: "crit", t: "Mapa de impactos", x: "Nenhuma mudança foi marcada no mapa de impactos. Sem mudanças pretendidas, não é possível examinar o caminho para o impacto." });

    if (dimMarcada("politica") && !temUsuario(["Gestores públicos", "Formuladores de políticas"]))
      A.push({ n: "warn", t: "Coerência", x: "Há mudanças pretendidas na dimensão Política, mas gestores públicos e formuladores de políticas não estão entre os usuários dos resultados." });
    if (dimMarcada("economica") && !temUsuario(["Produtores rurais", "Setor privado", "Técnicos de assistência técnica e extensão rural"]))
      A.push({ n: "warn", t: "Coerência", x: "Há mudanças pretendidas na dimensão Econômica, mas nenhum ator produtivo está entre os usuários dos resultados. Verifique quem se apropria do ganho econômico." });

    var condCurto = mk.filter(function (c) { return S.mapa[c].nivel === 3 && S.mapa[c].horizonte === MAPA.campos.horizonte.opcoes[0]; });
    if (condCurto.length) A.push({ n: "warn", t: "Plausibilidade", x: "Mudanças de condição esperadas ainda durante o projeto (" + condCurto.join(", ") + "). Mudanças desse nível costumam levar mais tempo; verifique se o horizonte é realista." });
    var cond = mk.filter(function (c) { return S.mapa[c].nivel === 3; });
    if (cond.length && mCam !== null && mCam < 3)
      A.push({ n: "crit", t: "Plausibilidade", x: "A proposta pretende mudanças de condição (" + cond.join(", ") + "), mas o caminho para o impacto está pouco estruturado (" + fmt(mCam) + "). Mudanças desse nível dependem de usuários, estratégia de uso e parcerias bem definidos." });

    var semNivel = mk.filter(function (c) { return !S.mapa[c].nivel; });
    if (semNivel.length) A.push({ n: "info", t: "Mapa de impactos", x: "Mudanças marcadas sem indicação de nível: " + semNivel.join(", ") + "." });
    var semJust = mk.filter(function (c) { return !(S.mapa[c].justificativa || "").trim(); });
    if (semJust.length) A.push({ n: "warn", t: "Justificativa", x: "Mudanças marcadas sem registro do que sustenta a expectativa: " + semJust.join(", ") + "." });

    if (dimsCom.length >= 4 && nota("QV4") && nota("QV4") <= 2)
      A.push({ n: "warn", t: "Proporcionalidade", x: "A proposta pretende mudanças em " + dimsCom.length + " dimensões, mas a compatibilidade com recursos, equipe e prazo foi avaliada como baixa. Considere concentrar o escopo." });
    var dur = parseInt(S.contexto.duracao, 10);
    if (S.contexto.transformacao.indexOf("5") === 0 && dur && dur <= 24)
      A.push({ n: "warn", t: "Proporcionalidade", x: "Transformação sistêmica esperada em um projeto de " + dur + " meses. Verifique se a ambição é compatível com o prazo." });

    if ((dimMarcada("economica") && dimMarcada("ambiental")) && nota("RE2") && nota("RE2") <= 2)
      A.push({ n: "warn", t: "Antecipação", x: "A proposta pretende mudanças econômicas e ambientais, mas não reconhece possíveis conflitos entre elas." });
    if (nota("RE1") && nota("RE1") <= 2)
      A.push({ n: "warn", t: "Antecipação", x: "Os possíveis efeitos indesejados da proposta foram pouco considerados." });

    if (!texto("CA4") && mk.length) A.push({ n: "warn", t: "Caminho para o impacto", x: "Não foi descrito o que os usuários passarão a saber, fazer ou decidir de forma diferente (CA4)." });
    if (!texto("CA6") && mk.length) A.push({ n: "warn", t: "Caminho para o impacto", x: "Não foram registrados os pressupostos externos ao projeto (CA6). Identificar o que precisa acontecer fora do controle da equipe é parte central do caminho para o impacto." });

    var orig = opcoes("PD2");
    if (orig.length === 1 && orig[0] === "Iniciativa da equipe de pesquisa" && nota("PD3") && nota("PD3") <= 2)
      A.push({ n: "warn", t: "Legitimidade", x: "O problema partiu apenas da equipe de pesquisa, com pouca participação dos usuários. Considere validar o problema com quem deverá usar os resultados." });
    if (opcoes("PD4").indexOf("Nenhuma interação prevista") >= 0)
      A.push({ n: "crit", t: "Interação", x: "Não há interações previstas com usuários ou parceiros durante o projeto. A literatura sobre impacto indica que a interação ao longo da pesquisa é um dos principais mecanismos de geração de impacto." });

    var notas = [];
    ITEM_BLOCOS.forEach(function (b) { b.itens.forEach(function (it) { var v = nota(it.codigo); if (v) notas.push(v); }); });
    if (notas.length >= 8 && notas.filter(function (n) { return n === 5; }).length / notas.length >= 0.7)
      A.push({ n: "warn", t: "Autoavaliação", x: "A maior parte das respostas recebeu a nota máxima. Reveja as perguntas com olhar crítico." });
    return A;
  }

  /* ---------- Utilidades ---------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function opts(list, sel, vazio) {
    return '<option value="">' + (vazio || "Selecione") + "</option>" + list.map(function (v) {
      return "<option" + (v === sel ? " selected" : "") + ">" + esc(v) + "</option>";
    }).join("");
  }
  function statusTxt() {
    var p = progresso();
    return p.resp + " de " + p.total + " perguntas · " + p.mudancas + " mudanç" + (p.mudancas === 1 ? "a" : "as") + " no mapa" + (saveOk ? "" : " · não foi possível salvar");
  }

  /* ---------- Cabeçalho ---------- */

  function header() {
    var p = progresso();
    var pct = p.total ? Math.round(100 * p.resp / p.total) : 0;
    var chips = STEPS.slice(1).map(function (s, i) {
      var idx = i + 1;
      return '<button class="chip" data-go="' + idx + '"' + (idx === step ? ' aria-current="step"' : "") + ">" + esc(s.nome) + "</button>";
    }).join("");
    return '<header class="top"><div class="wrap">' +
      '<div class="top-row"><div class="brand">Ter<span>Impact</span> <span class="draft">versão 2 · rascunho</span></div>' +
      '<div class="status" id="status">' + statusTxt() + "</div></div>" +
      '<div class="bar" aria-hidden="true"><i id="barfill" style="width:' + pct + '%"></i></div>' +
      (step > 0 ? '<nav class="chips" aria-label="Etapas">' + chips + "</nav>" : "") +
      "</div></header>";
  }
  function refreshStatus() {
    var st = document.getElementById("status"); if (st) st.textContent = statusTxt();
    var p = progresso(); var bf = document.getElementById("barfill");
    if (bf) bf.style.width = (p.total ? Math.round(100 * p.resp / p.total) : 0) + "%";
  }
  function exampleBanner() {
    return S.exemplo ? '<div class="note example no-print">Você está vendo um exemplo fictício. As alterações não são salvas. <button class="btn link" data-act="novo-real">Iniciar minha avaliação</button></div>' : "";
  }
  function nav() {
    var prev = step > 1 ? '<button class="btn" data-go="' + (step - 1) + '">Anterior</button>' : "<span></span>";
    var next = step < STEPS.length - 1
      ? '<button class="btn primary" data-go="' + (step + 1) + '">' + (step === STEPS.length - 2 ? "Ver devolutiva" : "Próxima: " + esc(STEPS[step + 1].nome)) + "</button>" : "";
    return '<div class="nav no-print">' + prev + next + "</div>";
  }

  /* ---------- Telas ---------- */

  function viewInicio() {
    var tem = !S.exemplo && (Object.keys(S.respostas).length > 0 || marcadas().length > 0);
    return '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Avaliação ex ante · versão 2 em construção</p><h1>TerImpact</h1>' +
      '<p class="lead">Reflexão sobre o impacto de uma proposta de pesquisa antes da submissão.</p></div>' +
      "<p>O TerImpact ajuda quem está concebendo uma proposta a pensá-la em função do impacto. Não se trata de pontuar a proposta, e sim de identificar o que já está bem pensado e o que precisa ser trabalhado.</p>" +
      '<div class="stack"><h3>Etapas</h3><ul class="scale">' +
      BLOCOS.map(function (b, i) { return "<li><b>" + (i + 1) + "</b><span><strong>" + esc(b.nome) + ".</strong> " + esc(b.pergunta_guia) + "</span></li>"; }).join("") +
      "</ul></div>" +
      '<p class="muted small">No mapa de impactos, marque apenas as mudanças que a proposta pretende de fato gerar. Nenhuma proposta precisa ter impacto em todas as dimensões.</p>' +
      '<div class="note">As respostas ficam armazenadas apenas neste navegador. Nenhuma informação é enviada a servidores.</div>' +
      '<div class="actions">' +
      (tem ? '<button class="btn primary" data-go="1">Continuar avaliação</button><button class="btn" data-act="pedir-novo">Nova avaliação</button>'
        : '<button class="btn primary" data-act="comecar">Iniciar avaliação</button>') +
      '<button class="btn" data-act="exemplo">Ver exemplo preenchido</button></div><div id="confirm-slot"></div>' +
      '<p class="footer">Instrumento versão ' + esc(INST.versao) + ". " + esc(INST.situacao) + " As dimensões do mapa de impactos correspondem à metodologia de referência de avaliação de impactos da Embrapa.</p></div>";
  }

  function viewProposta() {
    var c = S.contexto, L = INST.contexto;
    return exampleBanner() + '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Caracterização</p><h2>A proposta</h2><p class="muted">Nenhum campo é obrigatório. As informações orientam a leitura da devolutiva.</p></div>' +
      '<div class="field"><label for="f-titulo">Título da proposta</label><input type="text" id="f-titulo" data-ctx="titulo" value="' + esc(c.titulo) + '"></div>' +
      '<div class="grid2">' +
      '<div class="field"><label for="f-tipo">Tipo de projeto</label><select id="f-tipo" data-ctx="tipo">' + opts(L.tipos_projeto, c.tipo) + "</select></div>" +
      '<div class="field"><label for="f-escala">Escala territorial</label><select id="f-escala" data-ctx="escala">' + opts(L.escala_territorial, c.escala) + "</select></div>" +
      '<div class="field"><label for="f-duracao">Duração prevista (meses)</label><input type="number" min="1" max="120" id="f-duracao" data-ctx="duracao" value="' + esc(c.duracao) + '"></div>' +
      '<div class="field"><label for="f-transf">Nível de transformação esperado</label><select id="f-transf" data-ctx="transformacao">' + opts(L.nivel_transformacao, c.transformacao) + "</select></div>" +
      "</div>" +
      '<div class="field"><label for="f-parc">Parceiros principais</label><input type="text" id="f-parc" data-ctx="parceiros" value="' + esc(c.parceiros) + '"></div>' +
      "</div>" + nav();
  }

  function itemHtml(it) {
    var r = S.respostas[it.codigo] || {};
    var corpo = "";
    if (it.tipo === "texto") {
      corpo = (it.ajuda ? '<p class="small muted">' + esc(it.ajuda) + "</p>" : "") +
        '<textarea id="t-' + it.codigo + '" data-texto="' + it.codigo + '" aria-label="' + esc(it.pergunta) + '">' + esc(r.texto || "") + "</textarea>";
    } else if (it.tipo === "multipla") {
      corpo = '<div class="opts">' + it.opcoes.map(function (o, i) {
        return '<label><input type="checkbox" id="o-' + it.codigo + "-" + i + '" data-opt="' + it.codigo + '" data-val="' + esc(o) + '"' + ((r.opcoes || []).indexOf(o) >= 0 ? " checked" : "") + "> <span>" + esc(o) + "</span></label>";
      }).join("") + "</div>";
    } else {
      corpo = '<div class="scores" role="group" aria-label="Resposta para ' + it.codigo + '">' + it.ancoras.map(function (a, i) {
        var v = i + 1;
        return '<button class="score" data-code="' + it.codigo + '" data-v="' + v + '" aria-pressed="' + (r.nota === v && !r.na) + '" aria-label="' + v + ", " + esc(a) + '"><b>' + v + "</b><small>" + esc(a) + "</small></button>";
      }).join("") + "</div>" +
        '<div class="anchor" id="anc-' + it.codigo + '">' + (r.nota && !r.na ? esc(it.ancoras[r.nota - 1]) : "") + "</div>" +
        (it.permite_na ? '<button class="na-btn" data-na="' + it.codigo + '" aria-pressed="' + !!r.na + '">Não se aplica a esta proposta</button>' : "") +
        '<div class="field"><label for="j-' + it.codigo + '" class="small">Justificativa</label>' +
        '<textarea id="j-' + it.codigo + '" data-just="' + it.codigo + '" placeholder="' + esc(it.placeholder || "Em que se baseia esta resposta?") + '">' + esc(r.justificativa || "") + "</textarea></div>";
    }
    return '<div class="item" id="item-' + it.codigo + '"><div class="item-head"><span class="code">' + it.codigo + '</span><p class="q">' + esc(it.pergunta) + "</p></div>" +
      corpo + (it.fundamento ? '<p class="basis">Base: ' + esc(it.fundamento) + "</p>" : "") + "</div>";
  }

  function viewItens(b, n) {
    return exampleBanner() + '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Bloco ' + n + "</p><h2>" + esc(b.nome) + "</h2><p>" + esc(b.descricao) + '</p><p class="guide">' + esc(b.pergunta_guia) + "</p></div>" +
      '<div class="stack">' + b.itens.map(itemHtml).join("") + "</div></div>" + nav();
  }

  function changeDetail(m) {
    var r = S.mapa[m.codigo] || {};
    var C = MAPA.campos;
    return '<div class="change-detail" id="cd-' + m.codigo + '"' + (r.marcada ? "" : " hidden") + ">" +
      '<div class="stack"><span class="small"><strong>' + esc(C.nivel.pergunta) + '</strong></span><div class="levels" role="group" aria-label="Nível da mudança">' +
      C.nivel.opcoes.map(function (o) {
        return '<button class="level" data-nivel="' + m.codigo + '" data-v="' + o.valor + '" aria-pressed="' + (r.nivel === o.valor) + '"><b>' + esc(o.rotulo) + "</b><small>" + esc(o.descricao) + "</small></button>";
      }).join("") + "</div></div>" +
      '<div class="grid2"><div class="field"><label for="al-' + m.codigo + '" class="small">' + esc(C.alcance.pergunta) + '</label><select id="al-' + m.codigo + '" data-mcampo="alcance" data-m="' + m.codigo + '">' + opts(C.alcance.opcoes, r.alcance) + "</select></div>" +
      '<div class="field"><label for="ho-' + m.codigo + '" class="small">' + esc(C.horizonte.pergunta) + '</label><select id="ho-' + m.codigo + '" data-mcampo="horizonte" data-m="' + m.codigo + '">' + opts(C.horizonte.opcoes, r.horizonte) + "</select></div></div>" +
      '<div class="field"><label for="mj-' + m.codigo + '" class="small">Em que se baseia essa expectativa?</label><textarea id="mj-' + m.codigo + '" data-mjust="' + m.codigo + '" placeholder="Quem muda, o que muda e como a equipe saberá que a mudança ocorreu">' + esc(r.justificativa || "") + "</textarea></div>" +
      "</div>";
  }

  function dimCount(d) {
    return d.mudancas.filter(function (m) { return S.mapa[m.codigo] && S.mapa[m.codigo].marcada; }).length;
  }

  function viewMapa(n) {
    var dims = MAPA.dimensoes.map(function (d) {
      var k = dimCount(d);
      return '<div class="dim"><div class="dim-head"><h3>' + esc(d.nome) + '</h3><span class="count' + (k ? " on" : "") + '" id="cnt-' + d.id + '">' + (k ? k + " marcada" + (k > 1 ? "s" : "") : "fora do escopo") + "</span></div>" +
        '<p class="basis">Correspondência: ' + esc(d.correspondencia) + "</p>" +
        d.mudancas.map(function (m) {
          var r = S.mapa[m.codigo] || {};
          return '<div class="change"><label><input type="checkbox" id="mk-' + m.codigo + '" data-marca="' + m.codigo + '"' + (r.marcada ? " checked" : "") + '> <span><span class="code">' + m.codigo + "</span> " + esc(m.rotulo) + "</span></label>" + changeDetail(m) + "</div>";
        }).join("") + "</div>";
    }).join("");
    return exampleBanner() + '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Bloco ' + n + "</p><h2>" + esc(MAPA.nome) + "</h2><p>" + esc(MAPA.descricao) + '</p><p class="guide">' + esc(MAPA.pergunta_guia) + '</p><p class="basis">Base: ' + esc(MAPA.fundamento) + "</p></div>" +
      '<div class="stack">' + dims + "</div></div>" + nav();
  }

  function radar(eixos) {
    var W = 440, H = 340, cx = 220, cy = 172, Rad = 110, n = eixos.length;
    var pts = [], axes = "", labels = "", rings = "", dots = "";
    function ang(i) { return (-90 + i * 360 / n) * Math.PI / 180; }
    for (var k = 1; k <= 5; k++) {
      var ring = [];
      for (var i = 0; i < n; i++) ring.push((cx + Rad * k / 5 * Math.cos(ang(i))).toFixed(1) + "," + (cy + Rad * k / 5 * Math.sin(ang(i))).toFixed(1));
      rings += '<polygon class="ring" points="' + ring.join(" ") + '"/><text class="tick" x="' + (cx + 4) + '" y="' + (cy - Rad * k / 5 + 3).toFixed(1) + '">' + k + "</text>";
    }
    eixos.forEach(function (e, i) {
      var a = ang(i), v = e.valor || 0;
      var x = cx + Rad * v / 5 * Math.cos(a), y = cy + Rad * v / 5 * Math.sin(a);
      pts.push(x.toFixed(1) + "," + y.toFixed(1));
      if (e.valor !== null) dots += '<circle class="pt" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5"/>';
      axes += '<line class="axis" x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Rad * Math.cos(a)).toFixed(1) + '" y2="' + (cy + Rad * Math.sin(a)).toFixed(1) + '"/>';
      var lx = cx + (Rad + 16) * Math.cos(a), ly = cy + (Rad + 16) * Math.sin(a);
      var cos = Math.cos(a), anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
      var dy = Math.sin(a) < -0.6 ? -20 : Math.sin(a) > 0.6 ? 14 : 0;
      labels += '<text x="' + lx.toFixed(1) + '" y="' + (ly + dy).toFixed(1) + '" text-anchor="' + anchor + '"><tspan font-weight="600">' + esc(e.nome) + '</tspan><tspan x="' + lx.toFixed(1) + '" dy="15" class="na">' + (e.valor === null ? "sem resposta" : fmt(e.valor)) + "</tspan></text>";
    });
    return '<svg class="radar" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Perfil da proposta por bloco">' + rings + axes + '<polygon class="shape" points="' + pts.join(" ") + '"/>' + dots + labels + "</svg>";
  }

  function viewResultado() {
    var c = S.contexto;
    var A = alertas();
    var RM = resumoMapa();
    var nivelNome = ["–"].concat(MAPA.campos.nivel.opcoes.map(function (o) { return o.rotulo; }));
    var eixos = ITEM_BLOCOS.map(function (b) { return { nome: b.nome, valor: blocoMedia(b) }; });
    var mk = marcadas();
    var dimsCom = RM.filter(function (x) { return x.n > 0; }).length;

    var linhas = RM.map(function (x) {
      return "<tr><td>" + esc(x.dim.nome) + '</td><td class="num">' + (x.n || "–") + "</td><td>" + (x.n ? esc(nivelNome[x.nivel]) : '<span class="muted">fora do escopo</span>') +
        "</td><td>" + (x.alcance >= 0 ? esc(MAPA.campos.alcance.opcoes[x.alcance]) : "–") + "</td><td>" + (x.horizonte >= 0 ? esc(MAPA.campos.horizonte.opcoes[x.horizonte]) : "–") + "</td></tr>";
    }).join("");

    var destaques = [], fracos = [];
    ITEM_BLOCOS.forEach(function (b) {
      b.itens.forEach(function (it) {
        var v = nota(it.codigo); if (!v) return;
        var li = '<li><span class="code">' + it.codigo + "</span> " + esc(it.ancoras[v - 1]) + ' <span class="muted">(' + esc(b.nome) + ")</span></li>";
        if (v >= 4) destaques.push(li);
        if (v <= 2) fracos.push(li);
      });
    });

    var alertHtml = A.length ? '<ul class="alerts">' + A.map(function (a) {
      return '<li class="' + a.n + '"><span class="tag">' + esc(a.t) + "</span>" + esc(a.x) + "</li>";
    }).join("") + "</ul>" : '<p class="muted">Nenhum alerta para as respostas registradas.</p>';

    var guias = ITEM_BLOCOS.filter(function (b) { var m = blocoMedia(b); return m !== null && m < 3; })
      .map(function (b) { return "<li><strong>" + esc(b.nome) + ".</strong> " + esc(b.pergunta_guia) + "</li>"; }).join("");

    var exportar = '<div class="panel no-print"><h3>Guardar e retomar</h3>' +
      '<p class="small muted">As respostas estão salvas neste navegador. Para usar em outro dispositivo, copie as respostas e importe-as no outro aparelho.</p>' +
      '<div class="actions"><button class="btn" data-act="copiar">Copiar respostas</button>' +
      (framed ? "" : '<button class="btn" data-act="baixar">Baixar arquivo</button><button class="btn" data-act="imprimir">Imprimir ou salvar em PDF</button>') + "</div>" +
      '<details><summary>Importar respostas</summary><div><label class="small" for="imp-file">Arquivo de respostas (.json)</label><input type="file" id="imp-file" accept=".json,application/json">' +
      '<label class="small" for="imp-txt">Ou cole o conteúdo copiado</label><textarea id="imp-txt"></textarea><div class="actions"><button class="btn" data-act="importar">Carregar respostas</button></div></div></details>' +
      '<div id="msg" class="msg" role="status"></div><textarea id="copia" hidden readonly></textarea>' +
      '<div class="actions"><button class="btn danger" data-act="pedir-novo">Nova avaliação</button></div><div id="confirm-slot"></div></div>';

    return exampleBanner() + '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Devolutiva</p><h2>' + esc(c.titulo || "Proposta sem título") + "</h2>" +
      '<p class="muted small">' + [c.tipo, c.escala, c.duracao ? c.duracao + " meses" : ""].filter(Boolean).map(esc).join(" · ") + "</p></div>" +
      '<div class="cards">' +
      '<div class="card"><span class="eyebrow">Mudanças pretendidas</span><span class="v">' + mk.length + '</span><span class="small muted">em ' + dimsCom + " de 6 dimensões</span></div>" +
      ITEM_BLOCOS.filter(function (b) { return b.id !== "problema"; }).map(function (b) {
        return '<div class="card"><span class="eyebrow">' + esc(b.nome) + '</span><span class="v">' + fmt(blocoMedia(b)) + ' <small>de 5</small></span><span class="small muted">Média das perguntas com escala</span></div>';
      }).join("") + "</div>" +
      '<div class="panel"><h3>Alertas</h3>' + alertHtml + "</div>" +
      '<div class="panel"><h3>Mapa de impactos</h3><p class="small muted">Nível mais alto, maior alcance e horizonte mais longo entre as mudanças marcadas em cada dimensão.</p>' +
      '<div class="table-wrap"><table><thead><tr><th>Dimensão</th><th class="num">Mudanças</th><th>Nível</th><th>Alcance</th><th>Horizonte</th></tr></thead><tbody>' + linhas + "</tbody></table></div></div>" +
      '<div class="panel"><h3>Perfil da proposta</h3><p class="small muted">Cada eixo mostra a média das respostas do bloco. O perfil indica onde a proposta está mais e menos amadurecida, e não constitui uma nota.</p>' + radar(eixos) + "</div>" +
      '<div class="panel"><h3>Destaques e pontos a fortalecer</h3><div class="lists">' +
      '<div class="stack"><h3 class="tag-ok">Destaques</h3>' + (destaques.length ? "<ul>" + destaques.join("") + "</ul>" : '<p class="muted small">Nenhuma resposta 4 ou 5.</p>') + "</div>" +
      '<div class="stack"><h3 class="tag-warn">Pontos a fortalecer</h3>' + (fracos.length ? "<ul>" + fracos.join("") + "</ul>" : '<p class="muted small">Nenhuma resposta 1 ou 2.</p>') + "</div></div>" +
      (guias ? '<div class="stack"><h3>Questões para a revisão da proposta</h3><ul>' + guias + "</ul></div>" : "") + "</div>" +
      exportar + "</div>" + nav();
  }

  /* ---------- Renderização e eventos ---------- */

  function render() {
    var s = STEPS[step], body;
    if (s.id === "inicio") body = viewInicio();
    else if (s.id === "proposta") body = viewProposta();
    else if (s.id === "resultado") body = viewResultado();
    else if (s.bloco.tipo === "mapa") body = viewMapa(step - 1);
    else body = viewItens(s.bloco, step - 1);
    app.innerHTML = header() + '<main><div class="wrap">' + body + "</div></main>";
    var cur = app.querySelector('.chip[aria-current="step"]');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest", inline: "center" });
  }
  function go(i) { step = Math.max(0, Math.min(STEPS.length - 1, i)); render(); window.scrollTo(0, 0); }
  function msg(t, ok) { var m = document.getElementById("msg"); if (m) { m.textContent = t; m.className = "msg " + (ok ? "ok" : "err"); } }
  function importar(txt) {
    var s; try { s = JSON.parse(txt); } catch (e) { msg("O conteúdo não é um arquivo de respostas válido."); return; }
    if (!valid(s)) { msg("O conteúdo não corresponde a respostas da versão 2 do TerImpact."); return; }
    S = normalize(s); S.exemplo = false; save(); go(STEPS.length - 1); msg("Respostas carregadas.", true);
  }
  function pedirNovo() {
    var slot = document.getElementById("confirm-slot"); if (!slot) return;
    slot.innerHTML = '<div class="confirm"><span>As respostas salvas neste navegador serão apagadas.</span><button class="btn danger" data-act="novo">Apagar e começar de novo</button><button class="btn" data-act="cancelar">Cancelar</button></div>';
  }
  function updateDimCount(code) {
    var d = MAPA.dimensoes.filter(function (x) { return x.id === MUD[code].dim; })[0];
    var k = dimCount(d), el = document.getElementById("cnt-" + d.id);
    if (el) { el.textContent = k ? k + " marcada" + (k > 1 ? "s" : "") : "fora do escopo"; el.classList.toggle("on", k > 0); }
  }

  app.addEventListener("click", function (ev) {
    var t = ev.target.closest("button"); if (!t) return;
    if (t.dataset.go !== undefined) { go(parseInt(t.dataset.go, 10)); return; }
    if (t.dataset.code) {
      var code = t.dataset.code, v = parseInt(t.dataset.v, 10), r = R(code);
      r.nota = r.nota === v && !r.na ? null : v; r.na = false; save();
      var item = document.getElementById("item-" + code);
      item.querySelectorAll(".score").forEach(function (b) { b.setAttribute("aria-pressed", String(parseInt(b.dataset.v, 10) === (r.nota || 0))); });
      var nb = item.querySelector(".na-btn"); if (nb) nb.setAttribute("aria-pressed", "false");
      document.getElementById("anc-" + code).textContent = r.nota ? ITENS[code].ancoras[r.nota - 1] : "";
      refreshStatus(); return;
    }
    if (t.dataset.na) {
      var c2 = t.dataset.na, r2 = R(c2); r2.na = !r2.na; if (r2.na) r2.nota = null; save();
      var it2 = document.getElementById("item-" + c2);
      it2.querySelectorAll(".score").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      t.setAttribute("aria-pressed", String(r2.na));
      document.getElementById("anc-" + c2).textContent = r2.na ? "Não se aplica" : "";
      refreshStatus(); return;
    }
    if (t.dataset.nivel) {
      var mc = t.dataset.nivel, mv = parseInt(t.dataset.v, 10), mr = S.mapa[mc] || (S.mapa[mc] = {});
      mr.nivel = mr.nivel === mv ? null : mv; save();
      document.querySelectorAll('[data-nivel="' + mc + '"]').forEach(function (b) { b.setAttribute("aria-pressed", String(parseInt(b.dataset.v, 10) === mr.nivel)); });
      return;
    }
    switch (t.dataset.act) {
      case "comecar": S = blank(); save(); go(1); break;
      case "exemplo": S = exemplo(); go(STEPS.length - 1); break;
      case "novo-real": S = load() || blank(); if (S.exemplo) S = blank(); go(1); break;
      case "pedir-novo": pedirNovo(); break;
      case "cancelar": document.getElementById("confirm-slot").innerHTML = ""; break;
      case "novo": try { localStorage.removeItem(KEY); } catch (e) {} S = blank(); save(); go(1); break;
      case "copiar": {
        var txt = JSON.stringify(S, null, 2);
        var fb = function () { var ta = document.getElementById("copia"); ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); msg("Não foi possível copiar automaticamente. O conteúdo foi selecionado no campo acima; copie-o manualmente."); };
        try { navigator.clipboard.writeText(txt).then(function () { msg("Respostas copiadas.", true); }, fb); } catch (e) { fb(); }
        break;
      }
      case "baixar": {
        var blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "terimpact-v2.json";
        document.body.appendChild(a); a.click(); a.remove(); break;
      }
      case "imprimir": window.print(); break;
      case "importar": {
        var f = document.getElementById("imp-file"), tx = document.getElementById("imp-txt").value.trim();
        if (f.files && f.files[0]) { var rd = new FileReader(); rd.onload = function () { importar(String(rd.result)); }; rd.readAsText(f.files[0]); }
        else if (tx) importar(tx); else msg("Selecione um arquivo ou cole o conteúdo das respostas.");
        break;
      }
    }
  });

  app.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t.dataset.just) { R(t.dataset.just).justificativa = t.value; save(); }
    else if (t.dataset.texto) { R(t.dataset.texto).texto = t.value; save(); refreshStatus(); }
    else if (t.dataset.mjust) { (S.mapa[t.dataset.mjust] || (S.mapa[t.dataset.mjust] = {})).justificativa = t.value; save(); }
    else if (t.dataset.ctx) { S.contexto[t.dataset.ctx] = t.value; save(); }
  });

  app.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.dataset.opt) {
      var r = R(t.dataset.opt), l = r.opcoes || (r.opcoes = []), i = l.indexOf(t.dataset.val);
      if (t.checked && i < 0) l.push(t.dataset.val);
      if (!t.checked && i >= 0) l.splice(i, 1);
      save(); refreshStatus();
    } else if (t.dataset.marca) {
      var c = t.dataset.marca, m = S.mapa[c] || (S.mapa[c] = {});
      m.marcada = t.checked; save();
      document.getElementById("cd-" + c).hidden = !t.checked;
      updateDimCount(c); refreshStatus();
    } else if (t.dataset.mcampo) {
      (S.mapa[t.dataset.m] || (S.mapa[t.dataset.m] = {}))[t.dataset.mcampo] = t.value; save();
    }
  });

  /* ---------- Exemplo fictício ---------- */

  function exemplo() {
    var s = blank(); s.exemplo = true;
    s.contexto = { titulo: "Exemplo: monitoramento do uso da terra para apoio ao planejamento municipal", tipo: "Sistema de monitoramento", escala: "Regional", duracao: "36", transformacao: "3 - Método/ferramenta", parceiros: "Universidade estadual; consórcio intermunicipal" };
    s.respostas = {
      PD1: { texto: "Municípios da região não dispõem de informação atualizada sobre o uso da terra para elaborar planos diretores rurais." },
      PD2: { opcoes: ["Demanda formal de usuários, parceiros ou gestores", "Programação ou agenda estratégica da instituição"] },
      PD3: { nota: 3, justificativa: "Oficinas com técnicos de dois consórcios municipais em 2025." },
      PD4: { opcoes: ["Interações diretas: reuniões, oficinas, visitas, unidades de referência", "Interações indiretas: publicações técnicas, plataformas, bases de dados, mídias"] },
      CA1: { opcoes: ["Base de dados ou mapa", "Software, aplicativo ou plataforma", "Capacitação ou formação"] },
      CA2: { opcoes: ["Gestores públicos", "Técnicos de assistência técnica e extensão rural"] },
      CA3: { nota: 4, justificativa: "Secretarias de agricultura de 12 municípios dos dois consórcios." },
      CA4: { texto: "Os técnicos municipais passarão a consultar o painel para delimitar zonas rurais nos planos diretores." },
      CA5: { nota: 3, justificativa: "Painel e capacitação previstos; responsáveis ainda não definidos." },
      CA6: { texto: "As prefeituras manterem técnicos dedicados ao planejamento rural e os consórcios incluírem o tema na agenda." },
      CA7: { nota: 2, justificativa: "" },
      CA8: { nota: 3, justificativa: "Projeto anterior da equipe em outra região." },
      CA9: { nota: 4, justificativa: "Acordo com os consórcios em negociação final." },
      CA10: { nota: 3, justificativa: "" },
      RE1: { nota: 2, justificativa: "" },
      RE2: { na: true },
      RE3: { nota: 3, justificativa: "Municípios menores podem ter menos capacidade de uso." },
      RE4: { nota: 3, justificativa: "" },
      RE5: { nota: 4, justificativa: "Reuniões semestrais com os consórcios." },
      RE6: { na: true },
      QV1: { nota: 3, justificativa: "" },
      QV2: { nota: 4, justificativa: "" },
      QV3: { nota: 3, justificativa: "" },
      QV4: { nota: 4, justificativa: "" }
    };
    s.mapa = {
      PO1: { marcada: true, nivel: 2, alcance: "Regional", horizonte: "Até 3 anos após o término", justificativa: "Demanda dos consórcios para os planos diretores." },
      PO2: { marcada: true, nivel: 2, alcance: "Regional", horizonte: "Durante o projeto", justificativa: "" },
      AM6: { marcada: true, nivel: 3, alcance: "Regional", horizonte: "Mais de 3 anos após o término", justificativa: "Depende da aprovação e aplicação dos planos." },
      IN3: { marcada: true, nivel: 1, alcance: "Regional", horizonte: "Durante o projeto", justificativa: "Painel mantido pela equipe de geotecnologias." },
      IN2: { marcada: true, nivel: 1, alcance: "Local", horizonte: "Durante o projeto", justificativa: "Capacitação dos técnicos municipais." },
      CI2: { marcada: true, nivel: 1, alcance: "Nacional", horizonte: "Até 3 anos após o término", justificativa: "" }
    };
    return s;
  }

  render();
})();
