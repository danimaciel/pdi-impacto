(function () {
  "use strict";

  var INST = JSON.parse(document.getElementById("instrumento").textContent);
  var LISTAS = JSON.parse(document.getElementById("listas").textContent);
  var ORGS = LISTAS.organizacoes.map(function (o) { return o.nome; });
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
      criado: new Date().toISOString(), atualizado: null, exemplo: false, modo: "conceber",
      contexto: { titulo: "", tipo: "", escala: "", duracao: "", transformacao: "", publicos: [], parceiros: [] },
      respostas: {}, mapa: {}
    };
  }
  function valid(s) { return s && typeof s === "object" && s.respostas && s.mapa && s.contexto; }
  function normalize(s) {
    var b = blank();
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    Object.keys(b.contexto).forEach(function (k) { if (s.contexto[k] === undefined) s.contexto[k] = b.contexto[k]; });
    if (typeof s.contexto.parceiros === "string") s.contexto.parceiros = s.contexto.parceiros ? s.contexto.parceiros.split(/;\s*/).filter(Boolean) : [];
    if (!Array.isArray(s.contexto.publicos)) s.contexto.publicos = [];
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
    if (it.tipo === "escala") return S.modo === "conceber" ? (!!(r.justificativa || "").trim() || !!r.na) : (!!r.nota || !!r.na);
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

  function opcoesItem(it) {
    var r = S.respostas[it.codigo] || {};
    var base = it.fonte === "produtos" ? LISTAS.produtos
      : it.fonte === "publicos_selecionados" ? (S.contexto.publicos.length ? S.contexto.publicos : LISTAS.publicos)
      : it.opcoes;
    var extras = (r.opcoes || []).filter(function (x) { return base.indexOf(x) < 0; });
    return base.concat(extras);
  }
  function incluirOutroHtml(alvo, rotulo, lista) {
    return '<div class="add-row no-print"><input type="text" id="add-' + alvo + '" aria-label="' + esc(rotulo) + '" placeholder="' + esc(rotulo) + '"' + (lista ? ' list="' + lista + '"' : "") + '><button class="btn" data-add="' + alvo + '">Incluir</button></div>';
  }
  function opcoes(code) { var r = S.respostas[code]; return r && r.opcoes ? r.opcoes : []; }
  function nota(code) { if (S.modo === "conceber") return null; var r = S.respostas[code]; return r && r.nota && !r.na ? r.nota : null; }
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
    function temUsuario(re) { return usuarios.concat(S.contexto.publicos).some(function (u) { return re.test(u); }); }
    function dimMarcada(id) { return mk.some(function (c) { return MUD[c].dim === id; }); }
    var mCam = S.modo === "conceber" ? null : blocoMedia(BLOCOS.filter(function (b) { return b.id === "caminho"; })[0]);

    var p = progresso();
    if (p.resp < p.total) A.push({ n: "info", t: "Preenchimento", x: (p.total - p.resp) + " de " + p.total + " perguntas ainda não foram respondidas. A devolutiva considera apenas as respostas registradas." });
    if (!mk.length) A.push({ n: "crit", t: "Mapa de impactos", x: "Nenhuma mudança foi marcada no mapa de impactos. Sem mudanças pretendidas, não é possível examinar o caminho para o impacto." });

    if (dimMarcada("politica") && !temUsuario(/gestor|formulador|legislador|regula/i))
      A.push({ n: "warn", t: "Coerência", x: "Há mudanças pretendidas na dimensão Política, mas gestores públicos e formuladores de políticas não estão entre os usuários dos resultados." });
    if (dimMarcada("economica") && !temUsuario(/produtor|agricultor|cooperativ|empresa|agroind|extens|assentad/i))
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
      '<div class="top-row"><div class="brand">Ter<span>Impact</span> <span class="draft">' + (S.modo === "conceber" ? "Conceber" : "Revisar") + "</span></div>" +
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
      '<div class="stack"><p class="eyebrow">Avaliação ex ante</p><h1>TerImpact</h1>' +
      '<p class="lead">Reflexão sobre o impacto de uma proposta de pesquisa antes da submissão.</p></div>' +
      "<p>O TerImpact ajuda quem está concebendo uma proposta a pensá-la em função do impacto. Não se trata de pontuar a proposta, e sim de identificar o que já está bem pensado e o que precisa ser trabalhado.</p>" +
      '<div class="stack"><h3>Etapas</h3><ul class="scale">' +
      BLOCOS.map(function (b, i) { return "<li><b>" + (i + 1) + "</b><span><strong>" + esc(b.nome) + ".</strong> " + esc(b.pergunta_guia) + "</span></li>"; }).join("") +
      "</ul></div>" +
      '<p class="muted small">No mapa de impactos, marque apenas as mudanças que a proposta pretende de fato gerar. Nenhuma proposta precisa ter impacto em todas as dimensões.</p>' +
      '<div class="note">As respostas ficam armazenadas apenas neste navegador. Nenhuma informação é enviada a servidores.</div>' +
      '<div class="stack"><h3>Como você quer usar?</h3>' +
      '<div class="lists">' +
      '<div class="panel"><h3>Conceber uma proposta</h3><p class="small">' + esc(INST.modos.conceber) + '</p><div class="actions"><button class="btn primary" data-act="modo-conceber">' + (tem && S.modo === "conceber" ? "Continuar" : "Começar") + "</button></div></div>" +
      '<div class="panel"><h3>Revisar uma proposta</h3><p class="small">' + esc(INST.modos.revisar) + '</p><div class="actions"><button class="btn primary" data-act="modo-revisar">' + (tem && S.modo === "revisar" ? "Continuar" : "Começar") + "</button></div></div>" +
      "</div>" +
      '<p class="small muted">As respostas são as mesmas nos dois modos: é possível começar concebendo e depois revisar.</p></div>' +
      '<div class="actions">' + (tem ? '<button class="btn" data-act="pedir-novo">Nova avaliação</button>' : "") +
      '<button class="btn" data-act="exemplo">Ver exemplo preenchido</button></div><div id="confirm-slot"></div>' +
      '<p class="footer">Instrumento versão ' + esc(INST.versao) + ". " + esc(INST.situacao) + " As dimensões do mapa de impactos correspondem à metodologia de referência de avaliação de impactos da Embrapa. A <a href=\"v1/\">versão 1</a>, com o instrumento original derivado da planilha, permanece disponível para consulta.</p></div>";
  }

  var DD = { publicos: false, parceiros: false };
  function chipsDe(campo) {
    var l = S.contexto[campo];
    if (!l.length) return '<span class="small muted">Nenhum item selecionado.</span>';
    return l.map(function (p, i) { return '<span class="tag-chip">' + esc(p) + ' <button data-rm="' + campo + '" data-i="' + i + '" aria-label="Remover ' + esc(p) + '">×</button></span>'; }).join("");
  }
  function multiSelect(campo, alvo, cfg) {
    var sel = S.contexto[campo], aberto = DD[campo];
    var nomes = cfg.base.map(function (x) { return x.v; });
    var todos = cfg.base.concat(sel.filter(function (x) { return nomes.indexOf(x) < 0; }).map(function (x) { return { v: x, extra: "incluído por você" }; }));
    return '<div class="field"><span class="small"><strong>' + esc(cfg.titulo) + '</strong></span><span class="hint">' + esc(cfg.ajuda) + "</span>" +
      '<div class="chips-list" id="chips-' + campo + '">' + chipsDe(campo) + "</div>" +
      '<div class="dropdown"><button class="btn dd-toggle" data-dd="' + campo + '" aria-expanded="' + aberto + '" aria-controls="dd-' + campo + '">' + esc(aberto ? cfg.fechar : cfg.abrir) + "</button>" +
      '<div class="dd-panel" id="dd-' + campo + '"' + (aberto ? "" : " hidden") + '><input type="search" id="busca-' + campo + '" data-busca="' + campo + '" placeholder="Buscar na lista" aria-label="Buscar">' +
      '<div class="opts dd-list">' + todos.map(function (x, i) {
        return '<label data-rotulo="' + esc((x.v + " " + (x.extra || "")).toLowerCase()) + '"><input type="checkbox" id="' + campo + "-" + i + '" data-sel="' + campo + '" data-val="' + esc(x.v) + '"' + (sel.indexOf(x.v) >= 0 ? " checked" : "") + "> <span>" + esc(x.v) + (x.extra ? ' <span class="small muted">' + esc(x.extra) + "</span>" : "") + "</span></label>";
      }).join("") + "</div>" + incluirOutroHtml(alvo, cfg.incluir) +
      '<div class="actions"><button class="btn primary" data-dd="' + campo + '">Concluir seleção</button></div></div></div></div>';
  }
  var IMPORT = null, IMPORT_MSG = "";
  var JUST_DE = [["QV1", "originalidade", "Originalidade"], ["QV2", "metodologia", "Abordagem teórico-metodológica"], ["CA5", "divulgacao", "Estratégia de uso e divulgação"], ["CA9", "parcerias", "Parcerias"], ["CA10", "equipe", "Equipe e infraestrutura"], ["RE1", "riscos", "Riscos e efeitos indesejados"]];
  var REF_BLOCO = { problema: ["problema", "resumo", "objetivos", "publico"], mapa: ["impactos", "resultados", "objetivos"], caminho: ["resultados", "impactos", "divulgacao", "parcerias", "publico"], responsabilidade: ["riscos", "impactos"], qualidade: ["originalidade", "metodologia", "equipe"] };
  function nomeCampo(id) { var c = TerImportar.CAMPOS.filter(function (x) { return x.id === id; })[0]; return c ? c.nome : id; }
  function recalcularImport() {
    var r = TerImportar.sugestoes(IMPORT.secoes, IMPORT.texto, LISTAS);
    IMPORT.sug = r;
  }
  function trecho(t, n) { t = String(t || "").trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t; }

  function painelImport() {
    var h = '<div class="panel import no-print"><h3>Carregar a proposta</h3>' +
      '<p class="small">Envie o arquivo da proposta (.docx, .pdf ou .txt). A ferramenta identifica as seções e sugere o preenchimento dos campos. O arquivo é lido neste navegador e não é enviado a servidores.</p>' +
      '<div class="add-row"><input type="file" id="imp-prop" accept=".docx,.pdf,.txt,.md"><button class="btn primary" data-act="ler-proposta">Ler proposta</button></div>' +
      '<div class="msg" id="imp-msg" role="status">' + esc(IMPORT_MSG) + "</div>";
    if (S.proposta && !IMPORT) h += '<p class="small muted">Proposta carregada: ' + esc(S.proposta.arquivo) + ". Os trechos aparecem ao lado das perguntas de cada bloco.</p>";
    if (IMPORT) {
      var g = IMPORT.sug, i;
      h += '<div class="stack import-rev"><p><strong>Encontrado em ' + esc(IMPORT.arquivo) + ".</strong> Marque o que deseja usar. Nada é aplicado sem a sua confirmação.</p>";
      function chk(id, rot, val, marcado) { return '<label class="imp-op"><input type="checkbox" id="' + id + '"' + (marcado ? " checked" : "") + "> <span><strong>" + esc(rot) + "</strong>" + (val ? ": " + esc(val) : "") + "</span></label>"; }
      h += '<div class="opts">';
      if (g.titulo) h += chk("imp-tit", "Título", trecho(g.titulo, 200), !S.contexto.titulo);
      if (g.duracao) h += chk("imp-dur", "Duração", g.duracao + " meses", !S.contexto.duracao);
      if (g.problema) h += chk("imp-prob", "Problema (PD1)", trecho(g.problema, 260), !texto("PD1"));
      h += "</div>";
      if (g.publicos.length) h += '<div class="stack"><p class="small"><strong>Públicos mencionados na proposta</strong> (sugestões; marque os que se aplicam)</p><div class="opts">' + g.publicos.map(function (x, k) { return chk("imp-pub-" + k, x, "", false); }).join("") + "</div></div>";
      if (g.parceiros.length) h += '<div class="stack"><p class="small"><strong>Organizações mencionadas</strong></p><div class="opts">' + g.parceiros.map(function (x, k) { return chk("imp-par-" + k, x, "", true); }).join("") + "</div></div>";
      if (g.produtos.length) h += '<div class="stack"><p class="small"><strong>Tipos de produto identificados (CA1)</strong></p><div class="opts">' + g.produtos.map(function (x, k) { return chk("imp-prod-" + k, x, "", false); }).join("") + "</div></div>";
      var js = JUST_DE.filter(function (x) { return g.porCampo[x[1]]; });
      if (js.length) h += '<div class="stack"><p class="small"><strong>Trechos para as justificativas</strong> (preenchem apenas campos vazios)</p><div class="opts">' + js.map(function (x) { return chk("imp-just-" + x[0], x[0] + " · " + x[2], trecho(g.porCampo[x[1]], 140), !(S.respostas[x[0]] && (S.respostas[x[0]].justificativa || "").trim())); }).join("") + "</div></div>";
      var reconhecidas = IMPORT.secoes.filter(function (x) { return x.campo && x.campo !== "ignorar"; });
      var outras = TerImportar.naoReconhecidas(IMPORT.secoes);
      h += '<details><summary>Seções identificadas (' + reconhecidas.length + ") e outras seções (" + outras.length + ")</summary><div>" +
        '<p class="small muted">Se alguma seção foi classificada de forma errada, ou não foi reconhecida, indique a que corresponde.</p><div class="table-wrap"><table><tbody>' +
        reconhecidas.concat(outras).map(function (x) {
          var idx = IMPORT.secoes.indexOf(x);
          return "<tr><td>" + esc(trecho(x.rotulo, 70)) + '</td><td><select data-secidx="' + idx + '" aria-label="Correspondência da seção">' +
            '<option value="">Não usar</option>' + TerImportar.CAMPOS.filter(function (c) { return c.id !== "ignorar"; }).map(function (c) { return "<option value=\"" + c.id + "\"" + (x.campo === c.id ? " selected" : "") + ">" + esc(c.nome) + "</option>"; }).join("") + "</select></td></tr>";
        }).join("") + "</tbody></table></div></div></details>";
      h += '<div class="actions"><button class="btn primary" data-act="aplicar-proposta">Aplicar à avaliação</button><button class="btn" data-act="descartar-proposta">Descartar</button></div></div>';
    }
    return h + "</div>";
  }

  function aplicarImport() {
    var g = IMPORT.sug, c = S.contexto, n = 0;
    function marcado(id) { var e = document.getElementById(id); return e && e.checked; }
    if (g.titulo && marcado("imp-tit")) { c.titulo = g.titulo; n++; }
    if (g.duracao && marcado("imp-dur")) { c.duracao = String(g.duracao); n++; }
    S.prefill = S.prefill || {};
    if (g.problema && marcado("imp-prob")) { R("PD1").texto = g.problema; S.prefill.PD1 = true; n++; }
    g.publicos.forEach(function (x, k) { if (marcado("imp-pub-" + k) && c.publicos.indexOf(x) < 0) { c.publicos.push(x); n++; } });
    g.parceiros.forEach(function (x, k) { if (marcado("imp-par-" + k) && c.parceiros.indexOf(x) < 0) { c.parceiros.push(x); n++; } });
    g.produtos.forEach(function (x, k) { if (marcado("imp-prod-" + k)) { var r = R("CA1"); r.opcoes = r.opcoes || []; if (r.opcoes.indexOf(x) < 0) { r.opcoes.push(x); n++; } } });
    JUST_DE.forEach(function (x) {
      if (g.porCampo[x[1]] && marcado("imp-just-" + x[0])) {
        var r = R(x[0]);
        if (!(r.justificativa || "").trim()) { r.justificativa = g.porCampo[x[1]]; S.prefill[x[0]] = true; n++; }
      }
    });
    S.proposta = { arquivo: IMPORT.arquivo, carregada: new Date().toISOString(), porCampo: g.porCampo };
    IMPORT = null; IMPORT_MSG = n + " informações aplicadas. Revise os campos preenchidos; os trechos da proposta aparecem ao lado das perguntas de cada bloco.";
    save();
  }

  function refProposta(blocoId) {
    if (!S.proposta || !REF_BLOCO[blocoId]) return "";
    var pc = S.proposta.porCampo, campos = REF_BLOCO[blocoId].filter(function (k) { return pc[k]; });
    if (!campos.length) return "";
    return '<details class="ref-prop"><summary>Trechos da proposta relacionados a este bloco</summary><div>' + campos.map(function (k) {
      return '<div class="stack"><p class="small"><strong>' + esc(nomeCampo(k)) + '</strong></p><p class="ref-txt">' + esc(trecho(pc[k], 3000)) + "</p></div>";
    }).join("") + "</div></details>";
  }

  function viewProposta() {
    var c = S.contexto, L = INST.contexto;
    return exampleBanner() + '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Caracterização</p><h2>A proposta</h2><p class="muted">Nenhum campo é obrigatório. As informações orientam a leitura da devolutiva.</p></div>' +
      (S.modo === "revisar" ? painelImport() : "") +
      '<div class="field"><label for="f-titulo">Título da proposta</label><input type="text" id="f-titulo" data-ctx="titulo" value="' + esc(c.titulo) + '"></div>' +
      '<div class="grid2">' +
      '<div class="field"><label for="f-tipo">Tipo de projeto</label><select id="f-tipo" data-ctx="tipo">' + opts(L.tipos_projeto, c.tipo) + "</select></div>" +
      '<div class="field"><label for="f-escala">Escala territorial</label><select id="f-escala" data-ctx="escala">' + opts(L.escala_territorial, c.escala) + "</select></div>" +
      '<div class="field"><label for="f-duracao">Duração prevista (meses)</label><input type="number" min="1" max="120" id="f-duracao" data-ctx="duracao" value="' + esc(c.duracao) + '"></div>' +
      '<div class="field"><label for="f-transf">Nível de transformação esperado</label><select id="f-transf" data-ctx="transformacao">' + opts(L.nivel_transformacao, c.transformacao) + "</select></div>" +
      "</div>" +
      multiSelect("publicos", "publico", { titulo: "Públicos da proposta", ajuda: "Abra a lista e selecione quantos grupos quiser. Se algum não estiver na lista, inclua-o.", abrir: "Selecionar públicos", fechar: "Fechar lista de públicos", incluir: "Incluir outro público", base: LISTAS.publicos.map(function (x) { return { v: x }; }) }) +
      multiSelect("parceiros", "parceiro", { titulo: "Parceiros principais", ajuda: "Abra a lista, busque pelo nome ou pela sigla e selecione quantas organizações quiser. Se alguma não estiver na lista, inclua-a.", abrir: "Selecionar parceiros", fechar: "Fechar lista de parceiros", incluir: "Incluir outra organização", base: LISTAS.organizacoes.map(function (o) { return { v: o.nome, extra: o.pais }; }) }) +
      "</div>" + nav();
  }

  function itemHtml(it) {
    var r = S.respostas[it.codigo] || {};
    var corpo = "";
    if (it.tipo === "texto") {
      corpo = (it.ajuda ? '<p class="small muted">' + esc(it.ajuda) + "</p>" : "") +
        '<textarea id="t-' + it.codigo + '" data-texto="' + it.codigo + '" aria-label="' + esc(it.pergunta) + '">' + esc(r.texto || "") + "</textarea>";
    } else if (it.tipo === "multipla") {
      corpo = (it.fonte === "publicos_selecionados" && S.contexto.publicos.length ? '<p class="small muted">Opções a partir dos públicos indicados na caracterização da proposta.</p>' : "") +
        '<div class="opts">' + opcoesItem(it).map(function (o, i) {
        return '<label><input type="checkbox" id="o-' + it.codigo + "-" + i + '" data-opt="' + it.codigo + '" data-val="' + esc(o) + '"' + ((r.opcoes || []).indexOf(o) >= 0 ? " checked" : "") + "> <span>" + esc(o) + "</span></label>";
      }).join("") + "</div>" + (it.permite_outro ? incluirOutroHtml(it.codigo, "Incluir outra opção") : "");
    } else if (S.modo === "conceber") {
      return '<div class="item" id="item-' + it.codigo + '"><div class="item-head"><span class="code">' + it.codigo + '</span><p class="q">' + esc(it.pergunta_concepcao || it.pergunta) + "</p></div>" +
        '<textarea id="j-' + it.codigo + '" data-just="' + it.codigo + '" aria-label="' + esc(it.pergunta_concepcao || it.pergunta) + '" placeholder="Escreva livremente. Em branco, vira ponto a desenvolver.">' + esc(r.justificativa || "") + "</textarea>" +
        '<div class="anchor" id="anc-' + it.codigo + '" hidden></div>' +
        (it.permite_na ? '<button class="na-btn" data-na="' + it.codigo + '" aria-pressed="' + !!r.na + '">Não se aplica a esta proposta</button>' : "") +
        (S.prefill && S.prefill[it.codigo] ? '<p class="prefill">Texto trazido da proposta. Revise e complemente.</p>' : "") +
        (it.fundamento ? '<p class="basis">Base: ' + esc(it.fundamento) + "</p>" : "") + "</div>";
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
      corpo + (S.prefill && S.prefill[it.codigo] ? '<p class="prefill">Texto trazido da proposta. Revise e complemente.</p>' : "") +
      (it.fundamento ? '<p class="basis">Base: ' + esc(it.fundamento) + "</p>" : "") + "</div>";
  }

  function viewItens(b, n) {
    return exampleBanner() + '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Bloco ' + n + "</p><h2>" + esc(b.nome) + "</h2><p>" + esc(b.descricao) + '</p><p class="guide">' + esc(b.pergunta_guia) + "</p></div>" +
      refProposta(b.id) + '<div class="stack">' + b.itens.map(itemHtml).join("") + "</div></div>" + nav();
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
      refProposta("mapa") + '<div class="stack">' + dims + "</div></div>" + nav();
  }

  /* Radar das seis dimensões: nível mais alto de mudança pretendida (0 = fora do escopo; 1 conhecimento; 2 prática; 3 condição). */
  function radarDimensoes(RM) {
    var W = 540, H = 360, cx = 270, cy = 182, Rad = 112, n = RM.length, MAX = 3;
    var niveis = MAPA.campos.nivel.opcoes;
    function ang(i) { return (-90 + i * 360 / n) * Math.PI / 180; }
    function pt(i, v) { var a = ang(i); return [cx + Rad * v / MAX * Math.cos(a), cy + Rad * v / MAX * Math.sin(a)]; }
    var rings = "", axes = "", labels = "", dots = "", pts = [];
    for (var k = 1; k <= MAX; k++) {
      rings += '<polygon class="ring" points="' + RM.map(function (_, i) { return pt(i, k).map(function (x) { return x.toFixed(1); }).join(","); }).join(" ") + '"/>';
      rings += '<text class="tick" x="' + (cx + 4) + '" y="' + (cy - Rad * k / MAX + 3).toFixed(1) + '">' + k + "</text>";
    }
    RM.forEach(function (x, i) {
      var a = ang(i), e = pt(i, MAX), p = pt(i, x.nivel);
      pts.push(p[0].toFixed(1) + "," + p[1].toFixed(1));
      axes += '<line class="axis" x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '"/>';
      if (x.nivel) dots += '<circle class="pt" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4"/>';
      var lx = cx + (Rad + 16) * Math.cos(a), ly = cy + (Rad + 16) * Math.sin(a);
      var cos = Math.cos(a), anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
      var dy = Math.sin(a) < -0.6 ? -20 : Math.sin(a) > 0.6 ? 14 : 0;
      var sub = !x.n ? "fora do escopo" : (x.nivel ? niveis[x.nivel - 1].rotulo.split(" ")[0].toLowerCase() : "sem nível") + " (" + x.n + ")";
      labels += '<text x="' + lx.toFixed(1) + '" y="' + (ly + dy).toFixed(1) + '" text-anchor="' + anchor + '"' + (x.n ? "" : ' class="na"') + '><tspan font-weight="600">' + esc(x.dim.nome) + '</tspan><tspan x="' + lx.toFixed(1) + '" dy="15" class="na">' + esc(sub) + "</tspan></text>";
    });
    return '<svg class="radar" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Perfil de impacto por dimensão: nível mais alto de mudança pretendida">' + rings + axes +
      '<polygon class="shape" points="' + pts.join(" ") + '"/>' + dots + labels + "</svg>";
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

  /* ---------- Esboço do projeto ---------- */

  function hoje() { var d = new Date(); return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear(); }

  function val(code) {
    var it = ITENS[code], r = S.respostas[code] || {};
    if (it.tipo === "texto") return (r.texto || "").trim() || null;
    if (it.tipo === "multipla") return (r.opcoes || []).length ? r.opcoes.join("; ") + "." : null;
    if (r.na) return "Não se aplica a esta proposta.";
    var partes = [];
    if (S.modo === "revisar" && r.nota) partes.push(it.ancoras[r.nota - 1] + ".");
    if ((r.justificativa || "").trim()) partes.push(r.justificativa.trim());
    return partes.length ? partes.join(" ") : null;
  }

  function esboco() {
    var c = S.contexto, pend = [], secoes = [];
    function campo(rotulo, code, falta) {
      var v = val(code);
      if (!v) pend.push(falta);
      return { p: [{ t: rotulo + ": ", b: true }, v ? { t: v } : { t: "a desenvolver.", pend: true }] };
    }
    var carac = [["Tipo de projeto", c.tipo], ["Escala territorial", c.escala], ["Duração prevista", c.duracao ? c.duracao + " meses" : ""], ["Nível de transformação esperado", c.transformacao], ["Públicos", c.publicos.join("; ")], ["Parceiros principais", c.parceiros.join("; ")]]
      .filter(function (x) { return x[1]; }).map(function (x) { return { li: [{ t: x[0] + ": ", b: true }, { t: x[1] }] }; });
    if (carac.length) secoes.push({ h: "Caracterização", blocos: carac });

    secoes.push({ h: "1. Problema e justificativa", blocos: [
      campo("Problema", "PD1", "Descrever o problema e para quem ele é relevante (PD1)"),
      campo("Origem do problema", "PD2", "Indicar como o problema foi identificado (PD2)"),
      campo("Participação dos usuários na definição do problema", "PD3", "Descrever a participação dos usuários na definição do problema (PD3)")
    ] });

    secoes.push({ h: "2. Usuários e beneficiários", blocos: [
      campo("Usuários dos resultados", "CA2", "Indicar quem usará os resultados (CA2)"),
      campo("Identificação dos usuários", "CA3", "Identificar os usuários de forma específica (CA3)"),
      campo("Beneficiários e possíveis excluídos", "RE3", "Indicar quem se beneficia e quem pode ficar de fora (RE3)")
    ] });

    var mud = [];
    resumoMapa().forEach(function (x) {
      if (!x.n) return;
      mud.push({ sub: x.dim.nome });
      x.mudancas.forEach(function (m) {
        var r = S.mapa[m.codigo], det = [];
        var nv = MAPA.campos.nivel.opcoes.filter(function (o) { return o.valor === r.nivel; })[0];
        if (nv) det.push("nível: " + nv.rotulo.toLowerCase()); else pend.push("Indicar o nível da mudança " + m.codigo);
        if (r.alcance) det.push("alcance: " + r.alcance.toLowerCase());
        if (r.horizonte) det.push("horizonte: " + r.horizonte.toLowerCase());
        var runs = [{ t: m.rotulo + ". ", b: true }];
        if (det.length) runs.push({ t: det.join("; ").replace(/^./, function (s) { return s.toUpperCase(); }) + ". " });
        if ((r.justificativa || "").trim()) runs.push({ t: r.justificativa.trim() });
        else { runs.push({ t: "Base da expectativa a desenvolver.", pend: true }); pend.push("Registrar o que sustenta a expectativa da mudança " + m.codigo); }
        mud.push({ li: runs });
      });
    });
    if (!mud.length) { mud.push({ p: [{ t: "Nenhuma mudança pretendida foi indicada.", pend: true }] }); pend.push("Indicar as mudanças pretendidas no mapa de impactos"); }
    secoes.push({ h: "3. Mudanças pretendidas", blocos: mud });

    secoes.push({ h: "4. Caminho para o impacto", blocos: [
      campo("Principais produtos", "CA1", "Indicar os principais produtos (CA1)"),
      campo("O que os usuários farão de diferente", "CA4", "Descrever o que os usuários passarão a saber, fazer ou decidir (CA4)"),
      campo("Estratégia para que os resultados cheguem aos usuários", "CA5", "Definir a estratégia de uso dos resultados (CA5)"),
      campo("Pressupostos externos ao projeto", "CA6", "Identificar os pressupostos externos ao projeto (CA6)"),
      campo("Evidências que sustentam os pressupostos", "CA7", "Indicar as evidências que sustentam os pressupostos (CA7)"),
      campo("Resultados e avaliações anteriores", "CA8", "Indicar resultados ou avaliações anteriores que orientam a proposta (CA8)"),
      campo("Parcerias para chegar aos usuários", "CA9", "Descrever as parcerias necessárias (CA9)"),
      campo("Capacidade de implementação e difusão", "CA10", "Descrever a capacidade de implementação (CA10)")
    ] });

    secoes.push({ h: "5. Interação com usuários e parceiros", blocos: [campo("Interações previstas durante o projeto", "PD4", "Indicar as interações previstas com usuários e parceiros (PD4)")] });

    secoes.push({ h: "6. Riscos, efeitos indesejados e limites", blocos: [
      campo("Efeitos indesejados e medidas", "RE1", "Identificar possíveis efeitos indesejados (RE1)"),
      campo("Conflitos entre dimensões", "RE2", "Examinar possíveis conflitos entre dimensões (RE2)"),
      campo("Pressupostos, incertezas e limites", "RE4", "Explicitar pressupostos, incertezas e limites (RE4)"),
      campo("Revisão do rumo do projeto", "RE5", "Prever momentos de revisão do rumo do projeto (RE5)"),
      campo("Aspectos éticos e proteção de dados", "RE6", "Examinar aspectos éticos e de proteção de dados (RE6)")
    ] });

    secoes.push({ h: "7. Qualidade e viabilidade", blocos: [
      campo("Originalidade", "QV1", "Explicitar a originalidade da proposta (QV1)"),
      campo("Abordagem teórico-metodológica", "QV2", "Descrever a abordagem teórico-metodológica (QV2)"),
      campo("Integração de conhecimentos", "QV3", "Indicar as áreas de conhecimento e os saberes a integrar (QV3)"),
      campo("Proporcionalidade entre ambição e recursos", "QV4", "Examinar a compatibilidade entre ambição, recursos e prazo (QV4)")
    ] });

    var al = alertas().filter(function (a) { return a.n !== "info"; });
    var falta = pend.map(function (x) { return { li: [{ t: x }] }; }).concat(al.map(function (a) { return { li: [{ t: a.t + ": ", b: true }, { t: a.x }] }; }));
    secoes.push({ h: "8. Pontos a desenvolver", blocos: falta.length ? falta : [{ p: [{ t: "Nenhum ponto pendente identificado." }] }] });

    return {
      titulo: c.titulo || "Proposta sem título",
      subtitulo: "Esboço do projeto orientado ao impacto. Gerado pelo TerImpact (versão " + INST.versao + ", modo " + (S.modo === "conceber" ? "Conceber" : "Revisar") + ") em " + hoje() + ".",
      secoes: secoes, pendentes: pend.length
    };
  }

  function runsHtml(runs) {
    return runs.map(function (r) {
      var t = esc(r.t);
      if (r.pend) return '<em class="tag-warn">' + t + "</em>";
      return r.b ? "<strong>" + t + "</strong>" : t;
    }).join("");
  }

  function esbocoHtml(E) {
    var h = '<div class="esboco"><h2>' + esc(E.titulo) + '</h2><p class="small muted">' + esc(E.subtitulo) + "</p>";
    E.secoes.forEach(function (s) {
      h += "<h3>" + esc(s.h) + "</h3>";
      var lista = false;
      s.blocos.forEach(function (b) {
        if (b.li) { if (!lista) { h += "<ul>"; lista = true; } h += "<li>" + runsHtml(b.li) + "</li>"; return; }
        if (lista) { h += "</ul>"; lista = false; }
        if (b.sub) h += "<h4>" + esc(b.sub) + "</h4>";
        else h += "<p>" + runsHtml(b.p) + "</p>";
      });
      if (lista) h += "</ul>";
    });
    return h + "</div>";
  }

  function esbocoTexto(E) {
    var L = [E.titulo, E.subtitulo, ""];
    E.secoes.forEach(function (s) {
      L.push(s.h.toUpperCase());
      s.blocos.forEach(function (b) {
        if (b.sub) L.push(b.sub);
        else if (b.li) L.push("- " + b.li.map(function (r) { return r.t; }).join(""));
        else L.push(b.p.map(function (r) { return r.t; }).join(""));
      });
      L.push("");
    });
    return L.join("\n");
  }

  function xml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function wRuns(runs) {
    return runs.map(function (r) {
      var pr = (r.b ? "<w:b/>" : "") + (r.pend ? '<w:i/><w:color w:val="8A5300"/>' : "");
      return "<w:r>" + (pr ? "<w:rPr>" + pr + "</w:rPr>" : "") + '<w:t xml:space="preserve">' + xml(r.t) + "</w:t></w:r>";
    }).join("");
  }
  function wP(style, inner, ind) {
    var ppr = (style ? '<w:pStyle w:val="' + style + '"/>' : "") + (ind ? '<w:ind w:left="360" w:hanging="240"/>' : "");
    return "<w:p>" + (ppr ? "<w:pPr>" + ppr + "</w:pPr>" : "") + inner + "</w:p>";
  }

  function docxBlob(E) {
    var body = wP("Title", wRuns([{ t: E.titulo }])) + wP("Subtitle", wRuns([{ t: E.subtitulo }]));
    E.secoes.forEach(function (s) {
      body += wP("Heading1", wRuns([{ t: s.h }]));
      s.blocos.forEach(function (b) {
        if (b.sub) body += wP("Heading2", wRuns([{ t: b.sub }]));
        else if (b.li) body += wP(null, wRuns([{ t: "• " }].concat(b.li)), true);
        else body += wP(null, wRuns(b.p));
      });
    });
    var W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + W + "><w:body>" + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
    function st(id, name, rpr, ppr) { return '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + name + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' + (ppr ? "<w:pPr>" + ppr + "</w:pPr>" : "") + "<w:rPr>" + rpr + "</w:rPr></w:style>"; }
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ' + W + '><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      st("Title", "Title", '<w:b/><w:sz w:val="36"/><w:color w:val="1C6A58"/>', '<w:spacing w:after="120"/>') +
      st("Subtitle", "Subtitle", '<w:i/><w:sz w:val="20"/><w:color w:val="586A63"/>', '<w:spacing w:after="240"/>') +
      st("Heading1", "heading 1", '<w:b/><w:sz w:val="28"/><w:color w:val="1C6A58"/>', '<w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/>') +
      st("Heading2", "heading 2", '<w:b/><w:sz w:val="24"/>', '<w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/>') +
      "</w:styles>";
    var z = new JSZip();
    z.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
    z.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file("word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    z.file("word/document.xml", doc);
    z.file("word/styles.xml", styles);
    return z.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }

  /* ---------- Salvar arquivos ---------- */

  var DL = null;
  try {
    if (window.claude && typeof window.claude.use === "function") {
      window.claude.use("downloads").then(function (ns) { DL = ns; if (STEPS[step].id === "resultado") render(); }, function () {});
    }
  } catch (e) {}
  function podeBaixar() { return !!DL || !framed; }
  function nomeArquivo(ext) {
    var base = (S.contexto.titulo || "proposta").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
    return "terimpact-" + (base || "proposta") + "." + ext;
  }
  function salvar(filename, data) {
    if (DL) {
      return DL.save({ filename: filename, data: data }).then(function () { msg("Arquivo salvo.", true); }, function (e) {
        if (e && e.code === "declined") return;
        msg("Não foi possível salvar o arquivo neste ambiente. Use a opção de copiar.");
      });
    }
    var blob = data instanceof Blob ? data : new Blob([data], { type: "application/octet-stream" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    return Promise.resolve();
  }

  /* ---------- Devolutiva ---------- */

  function viewResultado() {
    var c = S.contexto;
    var conceber = S.modo === "conceber";
    var A = alertas();
    var RM = resumoMapa();
    var E = esboco();
    var nivelNome = ["–"].concat(MAPA.campos.nivel.opcoes.map(function (o) { return o.rotulo; }));
    var mk = marcadas();
    var dimsCom = RM.filter(function (x) { return x.n > 0; }).length;
    var p = progresso();

    var linhas = RM.map(function (x) {
      return "<tr><td>" + esc(x.dim.nome) + '</td><td class="num">' + (x.n || "–") + "</td><td>" + (x.n ? esc(nivelNome[x.nivel]) : '<span class="muted">fora do escopo</span>') +
        "</td><td>" + (x.alcance >= 0 ? esc(MAPA.campos.alcance.opcoes[x.alcance]) : "–") + "</td><td>" + (x.horizonte >= 0 ? esc(MAPA.campos.horizonte.opcoes[x.horizonte]) : "–") + "</td></tr>";
    }).join("");

    var alertHtml = A.length ? '<ul class="alerts">' + A.map(function (a) {
      return '<li class="' + a.n + '"><span class="tag">' + esc(a.t) + "</span>" + esc(a.x) + "</li>";
    }).join("") + "</ul>" : '<p class="muted">Nenhum alerta para as respostas registradas.</p>';

    var acoesEsboco = '<div class="actions no-print">' +
      (podeBaixar() ? '<button class="btn primary" data-act="baixar-docx">Baixar esboço (Word)</button>' : "") +
      '<button class="btn" data-act="copiar-esboco">Copiar texto do esboço</button>' +
      (!framed ? '<button class="btn" data-act="imprimir">Imprimir ou salvar em PDF</button>' : "") + "</div>";

    var cards = '<div class="cards">' +
      '<div class="card"><span class="eyebrow">Mudanças pretendidas</span><span class="v">' + mk.length + '</span><span class="small muted">em ' + dimsCom + " de 6 dimensões</span></div>";
    if (conceber) {
      cards += '<div class="card"><span class="eyebrow">Perguntas respondidas</span><span class="v">' + p.resp + " <small>de " + p.total + '</small></span><span class="small muted">Perguntas em branco viram pontos a desenvolver</span></div>' +
        '<div class="card"><span class="eyebrow">Pontos a desenvolver</span><span class="v">' + E.pendentes + '</span><span class="small muted">Listados ao final do esboço</span></div>';
    } else {
      cards += ITEM_BLOCOS.filter(function (b) { return b.id !== "problema"; }).map(function (b) {
        return '<div class="card"><span class="eyebrow">' + esc(b.nome) + '</span><span class="v">' + fmt(blocoMedia(b)) + ' <small>de 5</small></span><span class="small muted">Média das perguntas com escala</span></div>';
      }).join("");
    }
    cards += "</div>";

    var avaliacao = "";
    if (!conceber) {
      var eixos = ITEM_BLOCOS.map(function (b) { return { nome: b.nome, valor: blocoMedia(b) }; });
      var destaques = [], fracos = [];
      ITEM_BLOCOS.forEach(function (b) {
        b.itens.forEach(function (it) {
          var v = nota(it.codigo); if (!v) return;
          var li = '<li><span class="code">' + it.codigo + "</span> " + esc(it.ancoras[v - 1]) + ' <span class="muted">(' + esc(b.nome) + ")</span></li>";
          if (v >= 4) destaques.push(li);
          if (v <= 2) fracos.push(li);
        });
      });
      var guias = ITEM_BLOCOS.filter(function (b) { var m = blocoMedia(b); return m !== null && m < 3; })
        .map(function (b) { return "<li><strong>" + esc(b.nome) + ".</strong> " + esc(b.pergunta_guia) + "</li>"; }).join("");
      avaliacao = '<div class="panel"><h3>Perfil da proposta</h3><p class="small muted">Cada eixo mostra a média das respostas do bloco. O perfil indica onde a proposta está mais e menos amadurecida, e não constitui uma nota.</p>' + radar(eixos) + "</div>" +
        '<div class="panel"><h3>Destaques e pontos a fortalecer</h3><div class="lists">' +
        '<div class="stack"><h3 class="tag-ok">Destaques</h3>' + (destaques.length ? "<ul>" + destaques.join("") + "</ul>" : '<p class="muted small">Nenhuma resposta 4 ou 5.</p>') + "</div>" +
        '<div class="stack"><h3 class="tag-warn">Pontos a fortalecer</h3>' + (fracos.length ? "<ul>" + fracos.join("") + "</ul>" : '<p class="muted small">Nenhuma resposta 1 ou 2.</p>') + "</div></div>" +
        (guias ? '<div class="stack"><h3>Questões para a revisão da proposta</h3><ul>' + guias + "</ul></div>" : "") + "</div>";
    }

    var exportar = '<div class="panel no-print"><h3>Guardar e retomar</h3>' +
      '<p class="small muted">As respostas estão salvas neste navegador. Para continuar em outro dispositivo, copie ou baixe as respostas e importe-as no outro aparelho.</p>' +
      '<div class="actions"><button class="btn" data-act="copiar">Copiar respostas</button>' +
      (podeBaixar() ? '<button class="btn" data-act="baixar">Baixar respostas (.json)</button>' : "") + "</div>" +
      '<details><summary>Importar respostas</summary><div><label class="small" for="imp-file">Arquivo de respostas (.json)</label><input type="file" id="imp-file" accept=".json,application/json">' +
      '<label class="small" for="imp-txt">Ou cole o conteúdo copiado</label><textarea id="imp-txt"></textarea><div class="actions"><button class="btn" data-act="importar">Carregar respostas</button></div></div></details>' +
      '<textarea id="copia" hidden readonly></textarea>' +
      '<div class="actions"><button class="btn" data-act="' + (conceber ? "modo-revisar-aqui" : "modo-conceber-aqui") + '">' + (conceber ? "Passar para o modo Revisar" : "Passar para o modo Conceber") + '</button><button class="btn danger" data-act="pedir-novo">Nova avaliação</button></div><div id="confirm-slot"></div></div>';

    return exampleBanner() + '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">' + (conceber ? "Esboço do projeto" : "Devolutiva e esboço") + "</p><h2>" + esc(c.titulo || "Proposta sem título") + "</h2>" +
      '<p class="muted small">' + [c.tipo, c.escala, c.duracao ? c.duracao + " meses" : ""].filter(Boolean).map(esc).join(" · ") + "</p></div>" +
      cards +
      '<div class="panel"><h3>Alertas</h3>' + alertHtml + "</div>" +
      '<div class="panel"><h3>Perfil de impacto por dimensão</h3><p class="small muted">Para cada dimensão, o nível mais alto de mudança pretendida entre as mudanças marcadas no mapa de impactos: 1, conhecimento ou capacidade; 2, prática ou decisão; 3, condição. Dimensões sem mudança marcada ficam no centro, como fora do escopo da proposta. As dimensões correspondem à metodologia de referência de avaliação de impactos da Embrapa.</p>' + radarDimensoes(RM) +
      '<div class="legend"><span><b>1</b> Conhecimento ou capacidade</span><span><b>2</b> Prática ou decisão</span><span><b>3</b> Condição</span></div></div>' +
      '<div class="panel"><h3>Mapa de impactos</h3><p class="small muted">Nível mais alto, maior alcance e horizonte mais longo entre as mudanças marcadas em cada dimensão.</p>' +
      '<div class="table-wrap"><table><thead><tr><th>Dimensão</th><th class="num">Mudanças</th><th>Nível</th><th>Alcance</th><th>Horizonte</th></tr></thead><tbody>' + linhas + "</tbody></table></div></div>" +
      avaliacao +
      '<div class="panel"><h3>Esboço do projeto orientado ao impacto</h3><p class="small muted">Montado a partir das suas respostas, sem acréscimos. Trechos em itálico indicam o que ainda falta desenvolver.</p>' +
      acoesEsboco + '<div id="msg" class="msg" role="status"></div>' + esbocoHtml(E) + "</div>" +
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
    if (!valid(s)) { msg("O conteúdo não corresponde a respostas do TerImpact."); return; }
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
    if (t.dataset.add) {
      var alvo = t.dataset.add, campo = document.getElementById("add-" + alvo), novo = (campo.value || "").trim();
      if (!novo) { campo.focus(); return; }
      if (alvo === "publico") { if (S.contexto.publicos.indexOf(novo) < 0) S.contexto.publicos.push(novo); DD.publicos = true; }
      else if (alvo === "parceiro") { if (S.contexto.parceiros.indexOf(novo) < 0) S.contexto.parceiros.push(novo); DD.parceiros = true; }
      else { var ra = R(alvo); ra.opcoes = ra.opcoes || []; if (ra.opcoes.indexOf(novo) < 0) ra.opcoes.push(novo); }
      save(); var y = window.scrollY; render(); window.scrollTo(0, y);
      var c2 = document.getElementById("add-" + alvo); if (c2) c2.focus();
      return;
    }
    if (t.dataset.dd) { var k = t.dataset.dd; DD[k] = !DD[k]; var yd = window.scrollY; render(); window.scrollTo(0, yd); if (DD[k]) { var bz = document.getElementById("busca-" + k); if (bz) bz.focus(); } return; }
    if (t.dataset.rm) { S.contexto[t.dataset.rm].splice(parseInt(t.dataset.i, 10), 1); save(); var yp = window.scrollY; render(); window.scrollTo(0, yp); return; }
    if (t.dataset.rmParc !== undefined) {
      S.contexto.parceiros.splice(parseInt(t.dataset.rmParc, 10), 1); save(); var y2 = window.scrollY; render(); window.scrollTo(0, y2); return;
    }
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
      case "ler-proposta": {
        var fi = document.getElementById("imp-prop");
        if (!fi.files || !fi.files[0]) { IMPORT_MSG = "Selecione o arquivo da proposta."; var mm = document.getElementById("imp-msg"); if (mm) { mm.textContent = IMPORT_MSG; mm.className = "msg err"; } break; }
        var arq = fi.files[0], mi = document.getElementById("imp-msg");
        if (mi) { mi.textContent = "Lendo a proposta…"; mi.className = "msg"; }
        TerImportar.lerArquivo(arq).then(function (r) {
          var sec = TerImportar.segmentar(r.blocos);
          IMPORT = { arquivo: arq.name, secoes: sec, texto: r.texto };
          recalcularImport();
          var nrec = sec.filter(function (x) { return x.campo && x.campo !== "ignorar"; }).length;
          IMPORT_MSG = nrec ? nrec + " seções reconhecidas." : "Nenhuma seção foi reconhecida automaticamente. Indique as correspondências abaixo ou preencha os campos manualmente.";
          var y = window.scrollY; render(); window.scrollTo(0, y);
        }, function (e) {
          IMPORT_MSG = "Não foi possível ler o arquivo. " + (e && e.message ? e.message : "");
          var m2 = document.getElementById("imp-msg"); if (m2) { m2.textContent = IMPORT_MSG; m2.className = "msg err"; }
        });
        break;
      }
      case "aplicar-proposta": aplicarImport(); var ya = window.scrollY; render(); window.scrollTo(0, ya); break;
      case "descartar-proposta": IMPORT = null; IMPORT_MSG = ""; render(); break;
      case "modo-conceber":
      case "modo-revisar": {
        var modo = t.dataset.act === "modo-conceber" ? "conceber" : "revisar";
        if (S.exemplo) S = load() || blank();
        if (S.exemplo) S = blank();
        S.modo = modo; save(); go(1); break;
      }
      case "modo-conceber-aqui": S.modo = "conceber"; save(); render(); break;
      case "modo-revisar-aqui": S.modo = "revisar"; save(); render(); break;
      case "exemplo": S = exemplo(); go(STEPS.length - 1); break;
      case "novo-real": { var m0 = S.modo; S = load() || blank(); if (S.exemplo) S = blank(); S.modo = m0; go(1); break; }
      case "pedir-novo": pedirNovo(); break;
      case "cancelar": document.getElementById("confirm-slot").innerHTML = ""; break;
      case "novo": { var m1 = S.modo; try { localStorage.removeItem(KEY); } catch (e) {} S = blank(); S.modo = m1; save(); go(1); break; }
      case "copiar":
      case "copiar-esboco": {
        var txt = t.dataset.act === "copiar" ? JSON.stringify(S, null, 2) : esbocoTexto(esboco());
        var okMsg = t.dataset.act === "copiar" ? "Respostas copiadas." : "Texto do esboço copiado.";
        var fb = function () { var ta = document.getElementById("copia"); ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); msg("Não foi possível copiar automaticamente. O conteúdo foi selecionado no campo ao final da página; copie-o manualmente."); };
        try { navigator.clipboard.writeText(txt).then(function () { msg(okMsg, true); }, fb); } catch (e) { fb(); }
        break;
      }
      case "baixar": salvar(nomeArquivo("json"), JSON.stringify(S, null, 2)); break;
      case "baixar-docx": {
        if (typeof JSZip === "undefined") { msg("Não foi possível gerar o arquivo Word neste ambiente. Use a opção de copiar o texto."); break; }
        docxBlob(esboco()).then(function (b) { return salvar(nomeArquivo("docx"), b); }, function () { msg("Não foi possível gerar o arquivo Word. Use a opção de copiar o texto."); });
        break;
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

  app.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.id && ev.target.id.indexOf("add-") === 0) {
      ev.preventDefault(); var b = ev.target.parentNode.querySelector("button[data-add]"); if (b) b.click();
    }
  });

  app.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t.dataset.busca) {
      var q = t.value.trim().toLowerCase();
      document.querySelectorAll("#dd-" + t.dataset.busca + " .dd-list label").forEach(function (l) { l.hidden = q && l.dataset.rotulo.indexOf(q) < 0; });
      return;
    }
    if (t.dataset.just) { R(t.dataset.just).justificativa = t.value; save(); }
    else if (t.dataset.texto) { R(t.dataset.texto).texto = t.value; save(); refreshStatus(); }
    else if (t.dataset.mjust) { (S.mapa[t.dataset.mjust] || (S.mapa[t.dataset.mjust] = {})).justificativa = t.value; save(); }
    else if (t.dataset.ctx) { S.contexto[t.dataset.ctx] = t.value; save(); }
  });

  app.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.dataset.secidx !== undefined && IMPORT) {
      IMPORT.secoes[parseInt(t.dataset.secidx, 10)].campo = t.value || null;
      recalcularImport(); var ys = window.scrollY; render(); window.scrollTo(0, ys); return;
    }
    if (t.dataset.sel) {
      var lc = S.contexto[t.dataset.sel], iv = lc.indexOf(t.dataset.val);
      if (t.checked && iv < 0) lc.push(t.dataset.val);
      if (!t.checked && iv >= 0) lc.splice(iv, 1);
      save();
      var ch = document.getElementById("chips-" + t.dataset.sel); if (ch) ch.innerHTML = chipsDe(t.dataset.sel);
    } else if (t.dataset.opt) {
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
    var s = blank(); s.exemplo = true; s.modo = "revisar";
    s.contexto = { titulo: "Exemplo: monitoramento do uso da terra para apoio ao planejamento municipal", tipo: "Sistema de monitoramento", escala: "Regional", duracao: "36", transformacao: "3 - Método/ferramenta", publicos: ["Gestores públicos municipais", "Técnicos de assistência técnica e extensão rural", "Agricultores familiares"], parceiros: ["Universidade Estadual de Campinas (Unicamp)", "Consórcio intermunicipal da região"] };
    s.respostas = {
      PD1: { texto: "Municípios da região não dispõem de informação atualizada sobre o uso da terra para elaborar planos diretores rurais." },
      PD2: { opcoes: ["Demanda formal de usuários, parceiros ou gestores", "Programação ou agenda estratégica da instituição"] },
      PD3: { nota: 3, justificativa: "Oficinas com técnicos de dois consórcios municipais em 2025." },
      PD4: { opcoes: ["Interações diretas: reuniões, oficinas, visitas, unidades de referência", "Interações indiretas: publicações técnicas, plataformas, bases de dados, mídias"] },
      CA1: { opcoes: ["Base de dados ou mapa", "Software, aplicativo ou plataforma", "Capacitação ou formação"] },
      CA2: { opcoes: ["Gestores públicos municipais", "Técnicos de assistência técnica e extensão rural"] },
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
