(function () {
  "use strict";

  var INST = JSON.parse(document.getElementById("instrumento").textContent);
  var LISTAS = JSON.parse(document.getElementById("listas").textContent);
  var SERVICO = {}; try { SERVICO = JSON.parse(document.getElementById("servico").textContent); } catch (e) {}
  var ENDPOINT = SERVICO.endpoint || "";
  var MEMORIA = {};
  function lsGet(k) { var v = null; try { v = localStorage.getItem(k); } catch (e) {} return v !== null ? v : (MEMORIA[k] !== undefined ? MEMORIA[k] : null); }
  function lsSet(k, v) { MEMORIA[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }
  var KEY = "planott.v1.rascunho";
  var app = document.getElementById("app");
  var framed = true;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }

  var DIMS = INST.crl.dimensoes, NIVEIS = INST.crl.niveis;
  var FASES = INST.fases, FASE = {}; FASES.forEach(function (f) { FASE[f.id] = f; });
  var NIVIND = INST.niveis_indicador, NI = {}; NIVIND.forEach(function (n) { NI[n.id] = n; });
  var DIM = {}; DIMS.forEach(function (d) { DIM[d.id] = d; });
  var ORGS = LISTAS.organizacoes.map(function (o) { return o.nome; });

  var STEPS = [
    { id: "inicio", nome: "Início" },
    { id: "tecnologia", nome: "Tecnologia" },
    { id: "maturidade", nome: "Maturidade" },
    { id: "valor", nome: "Valor e públicos" },
    { id: "trajetoria", nome: "Trajetória de adoção" },
    { id: "acoes", nome: "Ações" },
    { id: "monitoramento", nome: "Monitoramento e sustentação" },
    { id: "plano", nome: "Plano" }
  ];

  /* ---------- Estado ---------- */

  function mesAtual() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2); }
  function blank() {
    var crl = {}; DIMS.forEach(function (d) { crl[d.id] = { nivel: 0, na: false, obs: "" }; });
    return {
      instrumento: INST.instrumento, versao: INST.versao, criado: new Date().toISOString(), atualizado: null, exemplo: false,
      tec: { nome: "", tipo: "", momento: "", descricao: "", endereco: "", unidade: "", projeto: "", equipe: "", responsavel: "", trl: "", inicio: mesAtual(), duracao: 24, objetivos: [], parceiros: [] },
      crl: crl,
      valor: { problema: "", beneficios: "", diferencial: "", casos: "", publicos: [], territorios: "" },
      traj: {},
      acoes: [],
      aval: { metodo: "Ambitec-TICs", inicio: "", fim: "", indicadores: "" },
      sust: { manutencao: "", atualizacao: "", evolucao: "", recursos: "", responsavel: "" },
      ideias: "",
      terimpact: null,
      seq: 0
    };
  }
  function normalize(s) {
    var b = blank();
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    ["tec", "valor", "aval", "sust"].forEach(function (g) { Object.keys(b[g]).forEach(function (k) { if (s[g][k] === undefined) s[g][k] = b[g][k]; }); });
    DIMS.forEach(function (d) { if (!s.crl[d.id]) s.crl[d.id] = { nivel: 0, na: false, obs: "" }; });
    s.acoes.forEach(function (a) { if (!a.id) a.id = "a" + (++s.seq); if (!Array.isArray(a.publicos)) a.publicos = []; });
    return s;
  }
  function valid(s) { return s && typeof s === "object" && s.tec && s.crl && Array.isArray(s.acoes); }
  function load() { try { var raw = lsGet(KEY); if (!raw) return null; var s = JSON.parse(raw); return valid(s) ? normalize(s) : null; } catch (e) { return null; } }
  var saveOk = true;
  function save(sincronizado) {
    if (S.exemplo) return;
    S.atualizado = new Date().toISOString();
    if (S.grupo) S.sujo = !sincronizado;
    try { localStorage.setItem(KEY, JSON.stringify(S)); saveOk = true; } catch (e) { MEMORIA[KEY] = JSON.stringify(S); saveOk = false; }
  }
  var S = load() || blank();
  var step = 0;

  /* ---------- Utilidades ---------- */

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function opts(list, sel, vazio) {
    return '<option value="">' + esc(vazio || "Selecione") + "</option>" + list.map(function (v) {
      var val = Array.isArray(v) ? v[0] : v, rot = Array.isArray(v) ? v[1] : v;
      return '<option value="' + esc(val) + '"' + (String(val) === String(sel) ? " selected" : "") + ">" + esc(rot) + "</option>";
    }).join("");
  }
  function caminho(p) { return p.split("|").map(decodeURIComponent); }
  function P() { return Array.prototype.slice.call(arguments).map(function (x) { return encodeURIComponent(String(x)); }).join("|"); }
  function getP(path) { var o = S; caminho(path).forEach(function (k) { o = o == null ? undefined : o[k]; }); return o; }
  function setP(path, v) {
    var ks = caminho(path), o = S;
    for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }
  function addMes(m, n) {
    var p = String(m || mesAtual()).split("-"), y = +p[0], mo = +p[1] - 1 + n;
    y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12;
    return y + "-" + ("0" + (mo + 1)).slice(-2);
  }
  function difMes(a, b) { var pa = a.split("-"), pb = b.split("-"); return (+pb[0] - +pa[0]) * 12 + (+pb[1] - +pa[1]); }
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function mesTxt(m) { if (!m) return ""; var p = m.split("-"); return MESES[+p[1] - 1] + "/" + p[0].slice(2); }
  function fimPlano() { return addMes(S.tec.inicio, Math.max(1, +S.tec.duracao || 1) - 1); }
  function txt(v) { return String(v || "").trim(); }

  function campo(path, rotulo, cfg) {
    cfg = cfg || {};
    var v = getP(path), id = "f-" + path.replace(/[^a-z0-9]/gi, "_");
    var ctl;
    if (cfg.area) ctl = '<textarea id="' + id + '" data-f="' + esc(path) + '"' + (cfg.ph ? ' placeholder="' + esc(cfg.ph) + '"' : "") + ">" + esc(v) + "</textarea>";
    else if (cfg.lista) ctl = '<select id="' + id + '" data-f="' + esc(path) + '"' + (cfg.render ? ' data-r="1"' : "") + ">" + opts(cfg.lista, v, cfg.vazio) + "</select>";
    else ctl = '<input type="' + (cfg.tipo || "text") + '" id="' + id + '" data-f="' + esc(path) + '" value="' + esc(v) + '"' + (cfg.ph ? ' placeholder="' + esc(cfg.ph) + '"' : "") + (cfg.attrs || "") + (cfg.render ? ' data-r="1"' : "") + ">";
    return '<div class="field"><label for="' + id + '">' + esc(rotulo) + "</label>" + (cfg.hint ? '<span class="hint">' + esc(cfg.hint) + "</span>" : "") + ctl + "</div>";
  }

  /* Lista suspensa com seleção múltipla, busca e inclusão de item novo. */
  var DD = {};
  function multiSelect(path, base, cfg) {
    var sel = getP(path) || [], aberto = !!DD[path];
    var todos = base.map(function (x) { return { v: x }; }).concat(sel.filter(function (x) { return base.indexOf(x) < 0; }).map(function (x) { return { v: x, extra: "incluído por você" }; }));
    var chips = sel.length ? sel.map(function (p, i) { return '<span class="tag-chip">' + esc(p) + ' <button data-rm="' + esc(path) + '" data-i="' + i + '" aria-label="Remover ' + esc(p) + '">×</button></span>'; }).join("") : '<span class="small muted">Nenhum item selecionado.</span>';
    var k = path.replace(/[^a-z0-9]/gi, "_");
    return '<div class="field"><span class="small"><strong>' + esc(cfg.titulo) + "</strong></span>" + (cfg.ajuda ? '<span class="hint">' + esc(cfg.ajuda) + "</span>" : "") +
      '<div class="chips-list">' + chips + "</div>" +
      '<div class="dropdown"><button class="btn dd-toggle" data-dd="' + esc(path) + '" aria-expanded="' + aberto + '">' + esc(aberto ? "Fechar a lista" : (cfg.abrir || "Selecionar da lista")) + "</button>" +
      '<div class="dd-panel"' + (aberto ? "" : " hidden") + ">" +
      (todos.length > 8 ? '<input type="search" data-busca="' + k + '" placeholder="Buscar na lista" aria-label="Buscar">' : "") +
      '<div class="opts dd-list" id="dl-' + k + '">' + (todos.length ? todos.map(function (x) {
        return '<label data-rotulo="' + esc(x.v.toLowerCase()) + '"><input type="checkbox" data-sel="' + esc(path) + '" data-val="' + esc(x.v) + '"' + (sel.indexOf(x.v) >= 0 ? " checked" : "") + "> <span>" + esc(x.v) + (x.extra ? ' <span class="small muted">' + esc(x.extra) + "</span>" : "") + "</span></label>";
      }).join("") : '<span class="small muted">' + esc(cfg.vazio || "Lista vazia.") + "</span>") + "</div>" +
      (cfg.incluir === false ? "" : '<div class="add-row"><input type="text" id="add-' + k + '" placeholder="' + esc(cfg.incluir || "Incluir item novo") + '" aria-label="' + esc(cfg.incluir || "Incluir item novo") + '"><button class="btn" data-add="' + esc(path) + '" data-lista="' + esc(cfg.lista || "") + '" data-k="' + k + '">Incluir</button></div>') +
      '<div class="actions"><button class="btn primary" data-dd="' + esc(path) + '">Concluir seleção</button></div></div></div></div>';
  }

  /* ---------- Maturidade (CRL) ---------- */

  function crlCalc() {
    var aplic = DIMS.filter(function (d) { return !(d.opcional && S.crl[d.id].na); });
    var com = aplic.filter(function (d) { return S.crl[d.id].nivel > 0; });
    var falta = aplic.filter(function (d) { return !(S.crl[d.id].nivel > 0); });
    var global = com.length ? Math.min.apply(null, com.map(function (d) { return S.crl[d.id].nivel; })) : 0;
    var limit = com.filter(function (d) { return S.crl[d.id].nivel === global; });
    return { aplic: aplic, falta: falta, global: global, limitantes: limit, completo: !falta.length && com.length > 0 };
  }

  /* ---------- Ações ---------- */

  function datasPadrao(fase) {
    var D = Math.max(1, +S.tec.duracao || 1), i = S.tec.inicio || mesAtual();
    function r(a, b) { a = Math.max(0, Math.min(a, D - 1)); b = Math.max(a, Math.min(b, D - 1)); return [addMes(i, a), addMes(i, b)]; }
    if (fase === "ideacao" || fase === "f0") return r(0, 2);
    if (fase === "f1") return r(3, 4);
    if (fase === "f3") return r(D - 3, D - 1);
    return r(5, D - 4);
  }
  function novaAcao(modelo) {
    var m = modelo || { tipo: "", acao: "", descricao: "", fase: "f2", responsavel: "", resultado: "", indicador: "", metrica: "", crl: "", nivel: "" };
    var d = datasPadrao(m.fase);
    return { id: "a" + (++S.seq), tipo: m.tipo, acao: m.acao, descricao: m.descricao, fase: m.fase, publicos: [], inicio: d[0], fim: d[1], responsavel: m.responsavel, resultado: m.resultado, indicador: m.indicador, metrica: m.metrica, crl: m.crl, nivel: m.nivel, base: "", meta: "", mudanca: "" };
  }
  function ordenarAcoes() {
    var ord = FASES.map(function (f) { return f.id; });
    S.acoes.sort(function (a, b) { var x = ord.indexOf(a.fase) - ord.indexOf(b.fase); return x || String(a.inicio).localeCompare(String(b.inicio)); });
  }
  function incompleta(a) { return !txt(a.acao) || !txt(a.responsavel) || !txt(a.indicador) || !txt(a.metrica) || !a.inicio || !a.fim; }

  /* ---------- Alertas ---------- */

  function alertas() {
    var L = [], c = crlCalc(), A = S.acoes;
    function add(nivel, tag, t) { L.push({ nivel: nivel, tag: tag, t: t }); }
    if (!c.completo) add("warn", "Maturidade", c.falta.length ? "Nível não informado em: " + c.falta.map(function (d) { return d.nome; }).join(", ") + "." : "Maturidade mercadológica não informada.");
    c.limitantes.forEach(function (d) {
      if (!A.some(function (a) { return a.crl === d.id; })) add("crit", "Dimensão limitante sem ação", d.nome + " está no nível " + S.crl[d.id].nivel + " e limita o nível global, mas nenhuma ação do plano está ligada a ela.");
    });
    S.valor.publicos.forEach(function (p) {
      var t = S.traj[p] || {};
      if (!A.some(function (a) { return a.publicos.indexOf(p) >= 0; })) add("warn", "Público sem ação", p + ": nenhuma ação dirigida a este público.");
      if (!txt(t.mudanca)) add("warn", "Trajetória incompleta", p + ": mudança esperada não descrita.");
    });
    if (!S.valor.publicos.length) add("warn", "Públicos", "Nenhum público definido.");
    var comPress = S.valor.publicos.filter(function (p) { return S.traj[p] && txt(S.traj[p].pressupostos); });
    if (comPress.length && !A.some(function (a) { return a.tipo === "Monitoramento"; })) add("warn", "Pressupostos sem acompanhamento", "Há pressupostos registrados na trajetória, mas nenhuma ação de monitoramento para verificar se se confirmam.");
    if (A.length) {
      var niv = A.map(function (a) { return a.nivel; });
      if (niv.indexOf("uso") < 0 && niv.indexOf("mudanca") < 0) add("crit", "Indicadores", "Todos os indicadores são de produto ou de alcance. O plano não acompanha o uso da tecnologia nem as mudanças entre os usuários.");
      else if (niv.indexOf("mudanca") < 0) add("warn", "Indicadores", "Não há indicador de mudança (prática, decisão ou condição dos usuários).");
      if (!A.some(function (a) { return a.tipo === "Avaliação de impacto"; })) add("warn", "Avaliação de impacto", "O plano não prevê avaliação de impacto ex post.");
      if (!A.some(function (a) { return /linha de base/i.test(a.acao + " " + a.indicador + " " + a.descricao); })) add("info", "Linha de base", "Convém registrar a linha de base dos acessos e do uso antes do início das ações de divulgação.");
      var rec = A.filter(function (a) { return a.tipo === "Avaliação de impacto" && /recrut/i.test(a.acao); });
      if (rec.some(function (a) { return a.fase === "f0" || a.fase === "f1"; })) add("warn", "Mensagens misturadas", "O recrutamento de usuários para a avaliação está previsto junto com o lançamento. Convém separar a divulgação da tecnologia do convite à avaliação.");
      var inc = A.filter(incompleta);
      if (inc.length) add("warn", "Ações incompletas", inc.length + (inc.length === 1 ? " ação sem" : " ações sem") + " responsável, indicador, métrica ou período: " + inc.slice(0, 4).map(function (a) { return a.acao || "(sem nome)"; }).join("; ") + (inc.length > 4 ? "…" : "") + ".");
      var inv = A.filter(function (a) { return a.inicio && a.fim && a.fim < a.inicio; });
      if (inv.length) add("crit", "Período", "Término anterior ao início em: " + inv.map(function (a) { return a.acao; }).join("; ") + ".");
      var fora = A.filter(function (a) { return (a.inicio && a.inicio < S.tec.inicio) || (a.fim && a.fim > fimPlano()); });
      if (fora.length) add("info", "Período", fora.length + (fora.length === 1 ? " ação ultrapassa" : " ações ultrapassam") + " o período do plano (" + mesTxt(S.tec.inicio) + " a " + mesTxt(fimPlano()) + ").");
      var pico = picoMensal();
      if (A.length > 25 || pico.n > 10) add("warn", "Volume de ações", A.length + " ações, com até " + pico.n + " simultâneas em " + mesTxt(pico.m) + ". Verifique se o volume é compatível com a equipe disponível.");
      var semAval = A.filter(function (a) { return a.tipo === "Avaliação de impacto"; });
      if (semAval.length && !txt(S.aval.inicio)) add("info", "Avaliação de impacto", "Defina o período previsto para a avaliação ex post na etapa de monitoramento.");
    } else add("crit", "Ações", "O plano ainda não tem ações.");
    if (!txt(S.sust.manutencao) && !txt(S.sust.recursos)) add("warn", "Sustentação", "Não há definição de como a tecnologia será mantida e com quais recursos.");
    if (S.tec.momento === "Em pesquisa e desenvolvimento" && !A.some(function (a) { return a.fase === "ideacao"; })) add("info", "Momento da tecnologia", "Para tecnologias ainda em P&D, a fase de ideação orientada ao impacto ajuda a confirmar usuários e proposta de valor antes da disponibilização.");
    var ord = { crit: 0, warn: 1, info: 2 };
    return L.sort(function (a, b) { return ord[a.nivel] - ord[b.nivel]; });
  }
  function picoMensal() {
    var cont = {}, best = { m: S.tec.inicio, n: 0 };
    S.acoes.forEach(function (a) {
      if (!a.inicio || !a.fim || a.fim < a.inicio) return;
      for (var m = a.inicio, g = 0; m <= a.fim && g < 120; m = addMes(m, 1), g++) { cont[m] = (cont[m] || 0) + 1; if (cont[m] > best.n) best = { m: m, n: cont[m] }; }
    });
    return best;
  }

  /* ---------- Cabeçalho e navegação ---------- */

  function statusTxt() {
    var c = crlCalc();
    return (c.global ? "CRL " + c.global : "CRL não informada") + " · " + S.acoes.length + (S.acoes.length === 1 ? " ação" : " ações") + (saveOk ? "" : " · não foi possível salvar");
  }
  function progresso() {
    var n = 0, t = 6;
    if (txt(S.tec.nome) && S.tec.tipo) n++;
    if (crlCalc().completo) n++;
    if (S.valor.publicos.length && txt(S.valor.problema)) n++;
    if (S.valor.publicos.length && S.valor.publicos.every(function (p) { return S.traj[p] && txt(S.traj[p].mudanca); })) n++;
    if (S.acoes.length) n++;
    if (txt(S.sust.manutencao) || txt(S.sust.recursos)) n++;
    return Math.round(100 * n / t);
  }
  function header() {
    var chips = STEPS.slice(1).map(function (s, i) { var idx = i + 1; return '<button class="chip" data-go="' + idx + '"' + (idx === step ? ' aria-current="step"' : "") + ">" + esc(s.nome) + "</button>"; }).join("");
    return '<header class="top"><div class="wrap"><div class="top-row"><div class="brand">Plano de <span>TT</span> <span class="draft">orientado ao impacto</span></div>' +
      '<div class="status" id="status">' + esc(statusTxt()) + "</div></div>" +
      '<div class="bar" aria-hidden="true"><i id="barfill" style="width:' + progresso() + '%"></i></div>' +
      (step > 0 ? '<nav class="chips" aria-label="Etapas">' + chips + "</nav>" : "") + "</div></header>";
  }
  function refreshStatus() {
    var st = document.getElementById("status"); if (st) st.textContent = statusTxt();
    var bf = document.getElementById("barfill"); if (bf) bf.style.width = progresso() + "%";
    var fp = document.getElementById("fim-plano"); if (fp) fp.textContent = mesTxt(fimPlano());
  }
  function nav() {
    var prev = step > 1 ? '<button class="btn" data-go="' + (step - 1) + '">Anterior</button>' : "<span></span>";
    var next = step < STEPS.length - 1 ? '<button class="btn primary" data-go="' + (step + 1) + '">' + (step === STEPS.length - 2 ? "Ver o plano" : "Próxima: " + esc(STEPS[step + 1].nome)) + "</button>" : "";
    return '<div class="nav no-print">' + prev + next + "</div>";
  }
  function exemploAviso() { return S.exemplo ? '<div class="note example no-print">Você está vendo um exemplo fictício. As alterações não são salvas. <button class="btn link" data-act="novo-real">Iniciar meu plano</button></div>' : ""; }

  /* ---------- Telas ---------- */

  function viewInicio() {
    var tem = !S.exemplo && (txt(S.tec.nome) || S.acoes.length);
    return '<div class="stack-lg">' +
      '<div class="stack"><p class="eyebrow">Percurso da tecnologia</p><h1>Plano de TT orientado ao impacto</h1>' +
      '<p class="lead">Elaboração do plano de transferência de uma tecnologia, com as ações ligadas às mudanças esperadas entre os usuários.</p></div>' +
      "<p>O plano organiza o ciclo de disponibilização, uso, adoção e impacto de uma tecnologia. Parte da maturidade mercadológica (escala CRL), define para cada público a mudança esperada e os sinais de progresso, e reúne as ações de preparação, comunicação, capacitação, parcerias, monitoramento e avaliação, cada uma com responsável, período, indicador e métrica. Recomenda-se iniciar o plano cerca de seis meses antes da disponibilização da tecnologia.</p>" +
      '<div class="stack"><h3>Etapas</h3><ul class="scale">' +
      [["Tecnologia", "identificação, tipo de ativo, momento e período do plano."],
       ["Maturidade", "nível nas sete dimensões da CRL e dimensão limitante."],
       ["Valor e públicos", "problema, benefícios, alternativas e públicos."],
       ["Trajetória de adoção", "mudança esperada por público, marcadores de progresso e pressupostos."],
       ["Ações", "biblioteca de ações por tipo e fase, ou ações próprias."],
       ["Monitoramento e sustentação", "linha de base e metas, avaliação ex post, manutenção e recursos."],
       ["Plano", "alertas, cronograma e arquivos para a equipe e para o acompanhamento."]].map(function (e, i) { return "<li><b>" + (i + 1) + "</b><span><strong>" + e[0] + ".</strong> " + e[1] + "</span></li>"; }).join("") +
      "</ul></div>" +
      '<div class="note">O plano fica armazenado apenas neste navegador. Para continuar em outro dispositivo ou compartilhar com a equipe, salve o arquivo do plano na última etapa.</div>' +
      '<div class="actions"><button class="btn primary" data-go="1">' + (tem ? "Continuar o plano" : "Começar") + "</button>" +
      (tem ? '<button class="btn" data-act="pedir-novo">Novo plano</button>' : "") +
      '<button class="btn" data-act="exemplo">Ver exemplo preenchido</button></div><div id="confirm-slot"></div>' +
      '<div class="lists"><div class="panel"><h3>Partir do TerImpact</h3><p class="small">Se o projeto que gerou a tecnologia passou pelo TerImpact, carregue o arquivo de respostas (.json). Título, problema, públicos, parceiros, mudanças esperadas e pressupostos são trazidos para o plano.</p>' +
      '<div class="add-row"><input type="file" id="ti-file" accept=".json,application/json"><button class="btn" data-act="ler-terimpact">Carregar</button></div></div>' +
      '<div class="panel"><h3>Abrir um plano salvo</h3><p class="small">Arquivo .json salvo por esta ferramenta.</p><div class="add-row"><input type="file" id="plano-file" accept=".json,application/json"><button class="btn" data-act="abrir-plano">Abrir</button></div></div></div>' +
      '<div class="msg" id="msg" role="status"></div>' + (S.grupo ? painelEquipe("inicio") : "") +
      '<p class="footer">Versão ' + esc(INST.versao) + ". " + esc(INST.situacao) + " Base: processo de Plano de Transferência de Tecnologias da Embrapa Territorial; Documento Orientador da Escala CRL da Embrapa; Outcome Mapping (Earl, Carden e Smutylo, 2001) para os marcadores de progresso. A ferramenta integra o conjunto PD&amp;I orientada ao impacto, com o TerImpact (ex ante) e a avaliação ex post pelo Ambitec.</p></div>";
  }

  function viewTecnologia() {
    var t = S.tec;
    return '<div class="stack-lg"><div class="stack"><p class="eyebrow">Etapa 1</p><h2>Tecnologia</h2><p>Identificação do ativo e do período de vigência do plano.</p></div>' +
      '<div class="panel">' + campo("tec|nome", "Nome da tecnologia") +
      '<div class="grid2">' + campo("tec|tipo", "Tipo de ativo", { lista: INST.tipos_ativo }) + campo("tec|momento", "Momento", { lista: INST.momentos, render: true, hint: "Situação da tecnologia quando o plano começa." }) + "</div>" +
      campo("tec|descricao", "Descrição resumida", { area: true, ph: "O que é a tecnologia e o que ela permite fazer." }) +
      '<div class="grid2">' + campo("tec|endereco", "Endereço de acesso", { ph: "https://", hint: "Quando houver." }) + campo("tec|trl", "Maturidade tecnológica (TRL/MRL)", { lista: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], vazio: "Não se aplica ou não avaliada" }) + "</div>" +
      '<div class="grid2">' + campo("tec|unidade", "Unidade responsável") + campo("tec|projeto", "Projeto de origem") + "</div>" +
      '<div class="grid2">' + campo("tec|equipe", "Equipe técnica", { hint: "Nomes ou funções." }) + campo("tec|responsavel", "Coordenação do plano") + "</div></div>" +
      '<div class="panel"><h3>Período do plano</h3><div class="grid2">' + campo("tec|inicio", "Início", { tipo: "month" }) + campo("tec|duracao", "Duração (meses)", { tipo: "number", attrs: ' min="3" max="60"' }) + "</div>" +
      '<p class="small muted">Término previsto: <span id="fim-plano">' + esc(mesTxt(fimPlano())) + '</span>' + ". As datas sugeridas para as ações da biblioteca seguem esse período.</p></div>" +
      '<div class="panel">' + multiSelect("tec|objetivos", INST.objetivos, { titulo: "Objetivos do plano", ajuda: "Um plano pode ter mais de um objetivo.", lista: "objetivos-tt" }) + "</div>" +
      '<div class="panel">' + multiSelect("tec|parceiros", ORGS, { titulo: "Parceiros", ajuda: "Organizações que participam da transferência.", lista: "organizacoes", abrir: "Selecionar da lista de organizações", incluir: "Incluir organização" }) + "</div>" +
      nav() + "</div>";
  }

  function viewMaturidade() {
    var c = crlCalc();
    var resumo = '<div class="cards"><div class="card"><span class="eyebrow">Nível global</span><span class="v">' + (c.global || "–") + '<small> de 9</small></span><span class="small">' + (c.global ? esc(NIVEIS[c.global - 1]) : "não informado") + (c.completo ? "" : " · incompleto") + "</span></div>" +
      '<div class="card"><span class="eyebrow">Dimensão limitante</span><span class="small"><strong>' + (c.limitantes.length ? esc(c.limitantes.map(function (d) { return d.nome; }).join("; ")) : "–") + '</strong></span><span class="small muted">As ações devem se concentrar aqui.</span></div></div>';
    var dims = DIMS.map(function (d) {
      var v = S.crl[d.id], lim = c.limitantes.indexOf(d) >= 0 && c.global;
      var bts = '<div class="crl-levels" role="group" aria-label="Nível em ' + esc(d.nome) + '"' + (v.na ? ' aria-disabled="true"' : "") + ">" + NIVEIS.map(function (n, i) {
        return '<button data-crl="' + d.id + '" data-v="' + (i + 1) + '" aria-pressed="' + (v.nivel === i + 1) + '" title="' + esc(n) + '"' + (v.na ? " disabled" : "") + ">" + (i + 1) + "</button>";
      }).join("") + "</div>";
      return '<div class="crl-dim' + (lim ? " limita" : "") + '"><div class="crl-head"><h3>' + esc(d.nome) + (d.opcional ? " *" : "") + "</h3>" + (lim ? '<span class="badge crit">limitante</span>' : "") + "</div>" +
        '<p class="small muted">' + esc(d.pergunta) + "</p>" + bts +
        '<div class="crl-nome">' + (v.na ? "Não requer ação; fora do nível global." : v.nivel ? v.nivel + " · " + esc(NIVEIS[v.nivel - 1]) : "Nível não informado") + "</div>" +
        (d.opcional ? '<label class="small"><input type="checkbox" data-crlna="' + d.id + '"' + (v.na ? " checked" : "") + "> Não requer ação para esta tecnologia</label>" : "") +
        campo(P("crl", d.id, "obs"), "Observação", { ph: "Evidência ou justificativa do nível" }) + "</div>";
    }).join("");
    return '<div class="stack-lg"><div class="stack"><p class="eyebrow">Etapa 2</p><h2>Maturidade mercadológica</h2>' +
      "<p>Informe o nível de cada dimensão da escala CRL (Commercial Readiness Level), de 1 a 9, conforme a avaliação feita com a Calculadora CRL. " + esc(INST.crl.regra) + "</p></div>" +
      '<p class="legend">' + NIVEIS.map(function (n, i) { return "<span><b>" + (i + 1) + "</b>" + esc(n) + "</span>"; }).join("") + "</p>" +
      resumo + '<div class="crl-grid">' + dims + "</div>" + nav() + "</div>";
  }

  function viewValor() {
    return '<div class="stack-lg"><div class="stack"><p class="eyebrow">Etapa 3</p><h2>Valor e públicos</h2><p>O que a tecnologia resolve, para quem, e o que a diferencia das alternativas disponíveis.</p></div>' +
      '<div class="panel">' + campo("valor|problema", "Problema que a tecnologia resolve", { area: true }) +
      campo("valor|beneficios", "Benefícios para os usuários", { area: true }) +
      campo("valor|diferencial", "Alternativas existentes e diferencial", { area: true, hint: "Outras soluções disponíveis e o que esta oferece a mais." }) +
      campo("valor|casos", "Casos de uso", { area: true, hint: "Situações concretas em que a tecnologia é usada para uma decisão ou prática." }) + "</div>" +
      '<div class="panel">' + multiSelect("valor|publicos", LISTAS.publicos, { titulo: "Públicos", ajuda: "Quem deve conhecer, usar ou adotar a tecnologia. Cada público terá uma trajetória de adoção na próxima etapa.", lista: "publicos", incluir: "Incluir público" }) +
      campo("valor|territorios", "Territórios", { hint: "Regiões, biomas ou cadeias em que o plano atua, quando houver recorte." }) + "</div>" + nav() + "</div>";
  }

  function viewTrajetoria() {
    var ti = S.terimpact;
    var ref = ti && (ti.mudancas.length || txt(ti.ca4)) ? '<div class="ref-ti"><strong>Indicado no TerImpact</strong>' + (ti.mudancas.length ? "<ul>" + ti.mudancas.map(function (m) { return "<li>" + esc(m.rotulo) + (m.nivel ? " (" + esc(INST.niveis_mudanca[m.nivel - 1].rotulo.toLowerCase()) + ")" : "") + "</li>"; }).join("") + "</ul>" : "") + (txt(ti.ca4) ? "<span>O que os usuários passarão a saber, fazer ou decidir: " + esc(ti.ca4) + "</span>" : "") + "</div>" : "";
    var corpo = S.valor.publicos.length ? S.valor.publicos.map(function (p) {
      var t = S.traj[p] || {};
      var seg = '<div class="seg" role="group" aria-label="Nível da mudança">' + INST.niveis_mudanca.map(function (n) { return '<button data-traj="' + esc(p) + '" data-v="' + n.valor + '" aria-pressed="' + (+t.nivel === n.valor) + '">' + esc(n.rotulo) + "</button>"; }).join("") + "</div>";
      return '<div class="traj"><h3>' + esc(p) + "</h3>" +
        campo(P("traj", p, "mudanca"), "Mudança esperada", { area: true, ph: "O que este público passa a saber, fazer ou decidir de forma diferente com a tecnologia." }) +
        '<div class="field"><span class="small"><strong>Nível da mudança</strong></span>' + seg + "</div>" +
        '<div class="marcadores">' + campo(P("traj", p, "espera"), "O que se espera ver", { area: true, hint: "Reações iniciais: acesso, interesse, participação." }) +
        campo(P("traj", p, "gostaria"), "O que se gostaria de ver", { area: true, hint: "Uso efetivo e engajamento." }) +
        campo(P("traj", p, "adoraria"), "O que se adoraria ver", { area: true, hint: "Mudança de prática ou de decisão, apropriação pelo público." }) + "</div>" +
        campo(P("traj", p, "pressupostos"), "Pressupostos", { area: true, hint: "Condições fora do controle da equipe que precisam ocorrer para que a mudança aconteça." }) + "</div>";
    }).join("") : '<div class="note">Defina os públicos na etapa anterior. <button class="btn link" data-go="3">Ir para Valor e públicos</button></div>';
    return '<div class="stack-lg"><div class="stack"><p class="eyebrow">Etapa 4</p><h2>Trajetória de adoção</h2>' +
      "<p>Para cada público, descreva a mudança que a tecnologia deve provocar e os sinais que indicam o avanço nessa direção. Os marcadores de progresso, graduais, orientam o monitoramento: o que se espera ver logo, o que se gostaria de ver com o uso e o que se adoraria ver quando a tecnologia for apropriada pelo público (Earl, Carden e Smutylo, 2001).</p></div>" +
      ref + corpo + nav() + "</div>";
  }

  var BIB = false, BIB_SEL = {}, ABERTAS = {}, REMOVER = null;
  function painelBiblioteca() {
    var c = crlCalc(), lim = c.limitantes.map(function (d) { return d.id; });
    var aplic = c.aplic.map(function (d) { return d.id; });
    var existentes = S.acoes.map(function (a) { return a.acao; });
    var grupos = INST.tipos_acao.map(function (tp) {
      var its = INST.biblioteca.map(function (b, i) { return { b: b, i: i }; }).filter(function (x) { return x.b.tipo === tp && (aplic.indexOf(x.b.crl) >= 0 || !DIM[x.b.crl]); });
      if (!its.length) return "";
      return '<div class="bib-grupo"><h4>' + esc(tp) + "</h4>" + its.map(function (x) {
        var ja = existentes.indexOf(x.b.acao) >= 0;
        return '<label data-rotulo="' + esc((x.b.acao + " " + x.b.descricao).toLowerCase()) + '"><input type="checkbox" data-bib="' + x.i + '"' + (BIB_SEL[x.i] ? " checked" : "") + (ja ? " disabled" : "") + "> <span><strong>" + esc(x.b.acao) + "</strong> " +
          '<span class="small muted">' + esc(FASE[x.b.fase].nome.split(" · ")[0]) + " · " + esc(DIM[x.b.crl] ? DIM[x.b.crl].nome : "") + " · " + esc(NI[x.b.nivel].nome.toLowerCase()) + (ja ? " · já incluída" : "") + "</span>" +
          (lim.indexOf(x.b.crl) >= 0 && !ja ? ' <span class="why">avança a dimensão limitante</span>' : "") +
          '<br><span class="small">' + esc(x.b.descricao) + "</span></span></label>";
      }).join("") + "</div>";
    }).join("");
    return '<div class="dd-panel"><input type="search" data-busca="bib" placeholder="Buscar na biblioteca" aria-label="Buscar na biblioteca"><div class="opts dd-list" id="dl-bib" style="max-height:420px">' + grupos + "</div>" +
      '<div class="actions"><button class="btn primary" data-act="bib-add">Incluir selecionadas</button><button class="btn" data-act="bib-fechar">Fechar</button></div></div>';
  }
  function cardAcao(a, i) {
    var aberto = !!ABERTAS[a.id];
    var falta = incompleta(a);
    var pubs = S.valor.publicos;
    var corpo = '<div class="corpo">' +
      '<div class="grid2">' + campo(P("acoes", i, "acao"), "Ação") + campo(P("acoes", i, "tipo"), "Tipo", { lista: INST.tipos_acao, render: true }) + "</div>" +
      campo(P("acoes", i, "descricao"), "Descrição", { area: true }) +
      '<div class="grid3">' + campo(P("acoes", i, "fase"), "Fase", { lista: FASES.map(function (f) { return [f.id, f.nome]; }), render: true }) +
      campo(P("acoes", i, "inicio"), "Início", { tipo: "month", render: true }) + campo(P("acoes", i, "fim"), "Término", { tipo: "month", render: true }) + "</div>" +
      (pubs.length ? multiSelect(P("acoes", i, "publicos"), pubs, { titulo: "Públicos da ação", incluir: false, abrir: "Selecionar públicos" }) : '<p class="small muted">Defina os públicos na etapa Valor e públicos para associá-los às ações.</p>') +
      '<div class="grid2">' + campo(P("acoes", i, "responsavel"), "Responsável", { ph: INST.responsaveis.map(function (r) { return r[0]; }).join(", "), attrs: ' list="dl-resp"' }) +
      campo(P("acoes", i, "crl"), "Dimensão da CRL que a ação avança", { lista: DIMS.map(function (d) { return [d.id, d.nome]; }), vazio: "Nenhuma em particular", render: true }) + "</div>" +
      campo(P("acoes", i, "resultado"), "Resultado esperado", { area: true }) +
      '<div class="grid3">' + campo(P("acoes", i, "indicador"), "Indicador") + campo(P("acoes", i, "metrica"), "Métrica") +
      campo(P("acoes", i, "nivel"), "Nível do indicador", { lista: NIVIND.map(function (n) { return [n.id, n.nome]; }), render: true }) + "</div>" +
      (pubs.length ? campo(P("acoes", i, "mudanca"), "Mudança visada", { lista: pubs.map(function (p) { return [p, p + ": " + (txt((S.traj[p] || {}).mudanca) ? trecho((S.traj[p] || {}).mudanca, 70) : "mudança não descrita")]; }), vazio: "Nenhuma em particular", hint: "Trajetória de adoção à qual a ação contribui." }) : "") +
      '<div class="actions"><button class="btn" data-dup="' + i + '">Duplicar</button>' +
      (REMOVER === a.id ? '<button class="btn danger" data-rmacao="' + i + '">Confirmar remoção</button><button class="btn link" data-act="cancelar-rm">Cancelar</button>' : '<button class="btn danger" data-pedirm="' + a.id + '">Remover</button>') + "</div></div>";
    return '<details class="acao" data-acao="' + a.id + '"' + (aberto ? " open" : "") + "><summary>" +
      '<span class="fase-tag">' + esc(FASE[a.fase] ? FASE[a.fase].nome.split(" · ")[0].replace("Fase ", "F").replace("Ideação orientada ao impacto", "Id") : "–") + "</span>" +
      '<span class="t">' + esc(a.acao || "(ação sem nome)") + "</span>" + (falta ? '<span class="badge warn">incompleta</span>' : "<span></span>") +
      '<span class="meta">' + esc([a.tipo, a.inicio ? mesTxt(a.inicio) + "–" + mesTxt(a.fim) : "", a.responsavel, a.publicos.join(", ")].filter(Boolean).join(" · ")) + "</span></summary>" + corpo + "</details>";
  }
  function trecho(t, n) { t = txt(t); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t; }

  function viewAcoes() {
    var c = crlCalc();
    var porFase = FASES.map(function (f) {
      var its = S.acoes.map(function (a, i) { return { a: a, i: i }; }).filter(function (x) { return x.a.fase === f.id; });
      if (!its.length) return "";
      return '<div class="stack"><h3>' + esc(f.nome) + '</h3><p class="small muted">' + esc(f.descricao) + "</p>" + its.map(function (x) { return cardAcao(x.a, x.i); }).join("") + "</div>";
    }).join("");
    var semFase = S.acoes.map(function (a, i) { return { a: a, i: i }; }).filter(function (x) { return !FASE[x.a.fase]; });
    if (semFase.length) porFase += '<div class="stack"><h3>Sem fase</h3>' + semFase.map(function (x) { return cardAcao(x.a, x.i); }).join("") + "</div>";
    return '<div class="stack-lg"><div class="stack"><p class="eyebrow">Etapa 5</p><h2>Ações</h2>' +
      "<p>Selecione ações da biblioteca ou inclua ações próprias. Cada ação deve ter responsável, período, indicador e métrica, e pode ser ligada à dimensão da CRL que faz avançar e à mudança visada. Para uma equipe pequena, poucas ações bem definidas são preferíveis a um plano extenso.</p></div>" +
      (c.limitantes.length ? '<div class="note">Dimensão limitante: <strong>' + esc(c.limitantes.map(function (d) { return d.nome; }).join("; ")) + "</strong>. As ações da biblioteca que a fazem avançar estão indicadas.</div>" : "") +
      '<div class="panel no-print"><div class="actions"><button class="btn primary" data-act="bib-abrir" aria-expanded="' + BIB + '">' + (BIB ? "Biblioteca de ações aberta" : "Incluir da biblioteca") + '</button><button class="btn" data-act="acao-nova">Incluir ação própria</button>' +
      (!S.acoes.length ? '<button class="btn" data-act="acao-basicas">Incluir o conjunto básico</button>' : "") + "</div>" +
      (!S.acoes.length ? '<p class="small muted">O conjunto básico reúne as ações de preparação, monitoramento e avaliação presentes em qualquer plano (kit de comunicação, validação de conteúdos, linha de base, registro de usuários, notícias, monitoramento do uso, casos de uso, avaliação ex post e devolutiva).</p>' : "") +
      (BIB ? painelBiblioteca() : "") + "</div>" +
      '<datalist id="dl-resp">' + INST.responsaveis.map(function (r) { return '<option value="' + esc(r[0]) + '">' + esc(r[1]) + "</option>"; }).join("") + "</datalist>" +
      (S.acoes.length ? porFase : '<p class="muted">Nenhuma ação incluída.</p>') +
      '<p class="small muted">Responsáveis: ' + INST.responsaveis.map(function (r) { return "<strong>" + esc(r[0]) + "</strong> " + esc(r[1]); }).join("; ") + ".</p>" + nav() + "</div>";
  }

  function viewMonitoramento() {
    var linhas = S.acoes.map(function (a, i) {
      return "<tr><td>" + esc(a.acao || "(sem nome)") + '<br><span class="small muted">' + esc(a.indicador) + (a.metrica ? " · " + esc(a.metrica) : "") + "</span></td><td>" + esc(NI[a.nivel] ? NI[a.nivel].nome : "–") + "</td>" +
        '<td><input type="text" data-f="' + esc(P("acoes", i, "base")) + '" value="' + esc(a.base) + '" aria-label="Linha de base"></td><td><input type="text" data-f="' + esc(P("acoes", i, "meta")) + '" value="' + esc(a.meta) + '" aria-label="Meta"></td></tr>';
    }).join("");
    return '<div class="stack-lg"><div class="stack"><p class="eyebrow">Etapa 6</p><h2>Monitoramento e sustentação</h2>' +
      "<p>O monitoramento acompanha quatro níveis: produto (entregas do plano), alcance (quem foi alcançado), uso (quem usa a tecnologia) e mudança (o que mudou na prática ou na decisão dos usuários). Os dois últimos ligam o plano à avaliação de impacto ex post.</p></div>" +
      '<div class="panel"><h3>Linha de base e metas</h3>' + (S.acoes.length ? '<div class="table-wrap"><table><thead><tr><th>Ação e indicador</th><th>Nível</th><th>Linha de base</th><th>Meta</th></tr></thead><tbody>' + linhas + "</tbody></table></div>" : '<p class="muted small">Inclua ações na etapa anterior.</p>') + "</div>" +
      '<div class="panel"><h3>Avaliação de impacto ex post</h3><div class="grid3">' + campo("aval|metodo", "Método", { hint: "Ambitec-TICs para tecnologias de informação; outro método conforme o tipo de ativo." }) + campo("aval|inicio", "Início previsto", { tipo: "month" }) + campo("aval|fim", "Término previsto", { tipo: "month" }) + "</div>" +
      campo("aval|indicadores", "Indicadores-chave", { area: true, ph: "Usuários identificados, índice de impacto, evidências de uso institucional." }) + "</div>" +
      '<div class="panel"><h3>Sustentação e financiamento</h3>' + campo("sust|manutencao", "Manutenção", { area: true, hint: "Quem mantém a tecnologia disponível e funcionando, e com que periodicidade." }) +
      campo("sust|atualizacao", "Atualização", { area: true, hint: "Atualização de dados, conteúdos ou versões." }) +
      campo("sust|evolucao", "Evolução", { area: true, hint: "Novas funcionalidades ou versões previstas a partir do retorno dos usuários." }) +
      '<div class="grid2">' + campo("sust|recursos", "Fontes de recursos") + campo("sust|responsavel", "Responsável pela sustentação") + "</div></div>" +
      '<div class="panel">' + campo("ideias", "Ideias para ciclos futuros", { area: true, hint: "Ações que não cabem no plano atual, mas devem ser consideradas depois." }) + "</div>" + nav() + "</div>";
  }

  /* ---------- Plano (devolutiva) ---------- */

  function mesesPlano() {
    var ini = S.tec.inicio, fim = fimPlano();
    S.acoes.forEach(function (a) { if (a.inicio && a.inicio < ini) ini = a.inicio; if (a.fim && a.fim > fim) fim = a.fim; });
    var L = []; for (var m = ini, g = 0; m <= fim && g < 72; m = addMes(m, 1), g++) L.push(m);
    return L;
  }
  function gantt() {
    if (!S.acoes.length) return '<p class="muted small">Sem ações.</p>';
    var ms = mesesPlano();
    var head = '<tr><th class="nm">Ação</th>' + ms.map(function (m) { return '<th class="m">' + mesTxt(m) + "</th>"; }).join("") + "</tr>";
    var rows = S.acoes.map(function (a) {
      return '<tr><td class="nm">' + esc(a.acao || "(sem nome)") + '<br><span class="small muted">' + esc(a.responsavel || "") + "</span></td>" + ms.map(function (m) {
        var on = a.inicio && a.fim && m >= a.inicio && m <= a.fim;
        return '<td class="c' + (on ? " on " + esc(a.fase) : "") + '"></td>';
      }).join("") + "</tr>";
    }).join("");
    var cores = { ideacao: "#9aa7a2", f0: "#8fb9ad", f1: "#3f8f7a", f2: "var(--accent)", f3: "#b27a1e" };
    return '<div class="leg-fases">' + FASES.filter(function (f) { return S.acoes.some(function (a) { return a.fase === f.id; }); }).map(function (f) { return '<span><i style="background:' + cores[f.id] + '"></i>' + esc(f.nome) + "</span>"; }).join("") + "</div>" +
      '<div class="table-wrap"><table class="gantt"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div>";
  }
  function barrasNivel() {
    var tot = S.acoes.length || 1;
    return '<div class="bars">' + NIVIND.map(function (n) {
      var k = S.acoes.filter(function (a) { return a.nivel === n.id; }).length;
      return '<div class="brow"><span class="lbl">' + esc(n.nome) + ' <span class="small muted">' + esc(n.descricao) + '</span></span><span class="track"><i style="width:' + Math.round(100 * k / tot) + '%"></i></span><span class="n">' + k + "</span></div>";
    }).join("") + "</div>";
  }
  function viewPlano() {
    var c = crlCalc(), al = alertas();
    var crlTab = '<div class="table-wrap"><table><thead><tr><th>Dimensão</th><th class="num">Nível</th><th class="num">Ações</th></tr></thead><tbody>' + DIMS.map(function (d) {
      var v = S.crl[d.id], k = S.acoes.filter(function (a) { return a.crl === d.id; }).length, lim = c.limitantes.indexOf(d) >= 0;
      return "<tr><td>" + esc(d.nome) + (lim ? ' <span class="badge crit">limitante</span>' : "") + '</td><td class="num">' + (v.na ? "não requer ação" : v.nivel ? v.nivel + " · " + esc(NIVEIS[v.nivel - 1]) : "–") + '</td><td class="num">' + k + "</td></tr>";
    }).join("") + "</tbody></table></div>";
    var trajTab = S.valor.publicos.length ? '<div class="table-wrap"><table><thead><tr><th>Público</th><th>Mudança esperada</th><th class="num">Ações</th></tr></thead><tbody>' + S.valor.publicos.map(function (p) {
      var t = S.traj[p] || {};
      return "<tr><td>" + esc(p) + "</td><td>" + esc(t.mudanca || "–") + (t.nivel ? ' <span class="small muted">(' + esc(INST.niveis_mudanca[t.nivel - 1].rotulo.toLowerCase()) + ")</span>" : "") + '</td><td class="num">' + S.acoes.filter(function (a) { return a.publicos.indexOf(p) >= 0; }).length + "</td></tr>";
    }).join("") + "</tbody></table></div>" : '<p class="muted small">Sem públicos definidos.</p>';
    var podeDL = podeBaixar();
    return '<div class="stack-lg"><div class="stack"><p class="eyebrow">Etapa 7</p><h2>' + esc(S.tec.nome || "Plano de TT") + "</h2>" +
      '<p class="muted">' + esc([S.tec.tipo, S.tec.momento, mesTxt(S.tec.inicio) + " a " + mesTxt(fimPlano())].filter(Boolean).join(" · ")) + "</p></div>" +
      '<div class="cards"><div class="card"><span class="eyebrow">CRL global</span><span class="v">' + (c.global || "–") + '<small> de 9</small></span><span class="small">' + (c.limitantes.length ? "Limitante: " + esc(c.limitantes.map(function (d) { return d.nome; }).join("; ")) : "") + "</span></div>" +
      '<div class="card"><span class="eyebrow">Ações</span><span class="v">' + S.acoes.length + '</span><span class="small">' + S.acoes.filter(incompleta).length + " incompletas</span></div>" +
      '<div class="card"><span class="eyebrow">Públicos</span><span class="v">' + S.valor.publicos.length + '</span><span class="small">' + S.valor.publicos.filter(function (p) { return S.traj[p] && txt(S.traj[p].mudanca); }).length + " com mudança descrita</span></div>" +
      '<div class="card"><span class="eyebrow">Pontos de atenção</span><span class="v">' + al.filter(function (x) { return x.nivel !== "info"; }).length + '</span><span class="small">' + al.filter(function (x) { return x.nivel === "crit"; }).length + " críticos</span></div></div>" +
      '<div class="panel"><h3>Pontos de atenção</h3>' + (al.length ? '<ul class="alerts">' + al.map(function (x) { return '<li class="' + (x.nivel === "crit" ? "crit" : x.nivel === "info" ? "info" : "") + '"><span class="tag">' + esc(x.tag) + "</span>" + esc(x.t) + "</li>"; }).join("") + "</ul>" : '<p class="small">Nenhum ponto de atenção.</p>') + "</div>" +
      '<div class="lists"><div class="panel"><h3>Maturidade e ações</h3>' + crlTab + '</div><div class="panel"><h3>Indicadores por nível</h3>' + barrasNivel() + "</div></div>" +
      '<div class="panel"><h3>Trajetória por público</h3>' + trajTab + "</div>" +
      '<div class="panel"><h3>Cronograma</h3>' + gantt() + "</div>" +
      '<div class="panel no-print"><h3>Arquivos</h3>' +
      '<p class="small">O plano completo em Excel tem as abas LEIA-ME, Tecnologia, Maturidade, Trajetória, Ações, Cronograma, Indicadores e Sustentação. A exportação para o AppSheet segue as tabelas da base de acompanhamento de planos de TT (Tecnologias, Planos_TT, Acoes_TT, Indicadores, Monitoramento_Adocao e Avaliacoes_ExPost). O arquivo do plano (.json) permite continuar a edição em outro dispositivo.</p>' +
      (podeDL ? '<div class="actions"><button class="btn primary" data-act="xlsx">Plano em Excel</button><button class="btn" data-act="docx">Plano em Word</button><button class="btn" data-act="appsheet">Exportar para o AppSheet</button><button class="btn" data-act="json">Salvar arquivo do plano</button><button class="btn" data-act="imprimir">Imprimir</button></div>'
        : '<p class="small muted">Este ambiente não permite baixar arquivos. Abra a ferramenta no endereço público para salvar o plano.</p>') +
      '<div class="msg" id="msg" role="status"></div></div>' + painelEquipe("plano") + nav() + "</div>";
  }

  /* ---------- Render ---------- */

  function render() {
    var id = STEPS[step].id;
    var v = id === "inicio" ? viewInicio() : id === "tecnologia" ? viewTecnologia() : id === "maturidade" ? viewMaturidade() : id === "valor" ? viewValor() :
      id === "trajetoria" ? viewTrajetoria() : id === "acoes" ? viewAcoes() : id === "monitoramento" ? viewMonitoramento() : viewPlano();
    var y = window.scrollY;
    app.innerHTML = header() + '<main><div class="wrap">' + exemploAviso() + faixaEquipe() + v + "</div></main>";
    return y;
  }
  function go(i) { step = Math.max(0, Math.min(STEPS.length - 1, i)); render(); window.scrollTo(0, 0); }
  function rerender() { var y = window.scrollY; render(); window.scrollTo(0, y); }
  function msg(t, ok) { var m = document.getElementById("msg"); if (m) { m.textContent = t; m.className = "msg " + (ok ? "ok" : "err"); } }

  /* ---------- Importações ---------- */

  function lerArquivo(input) {
    return new Promise(function (res, rej) {
      var f = input && input.files && input.files[0];
      if (!f) return rej(new Error("Selecione um arquivo."));
      var r = new FileReader(); r.onload = function () { try { res(JSON.parse(r.result)); } catch (e) { rej(new Error("O arquivo não é um JSON válido.")); } };
      r.onerror = function () { rej(new Error("Não foi possível ler o arquivo.")); }; r.readAsText(f, "utf-8");
    });
  }
  function mesclar(lista, novos) { (novos || []).forEach(function (x) { if (x && lista.indexOf(x) < 0) lista.push(x); }); }
  function aplicarTerImpact(d) {
    if (!d || !d.contexto || !d.respostas) throw new Error("O arquivo não parece ser um arquivo de respostas do TerImpact.");
    if (S.exemplo) S = blank();
    var x = d.contexto, r = d.respostas;
    function tx(c) { return r[c] && r[c].texto ? txt(r[c].texto) : ""; }
    if (!txt(S.tec.nome) && x.titulo) S.tec.nome = x.titulo;
    if (!txt(S.tec.projeto) && x.titulo) S.tec.projeto = x.titulo;
    if (!txt(S.valor.problema) && tx("PD1")) S.valor.problema = tx("PD1");
    var usuarios = r.CA2 && r.CA2.opcoes && r.CA2.opcoes.length ? r.CA2.opcoes : (x.publicos || []);
    mesclar(S.valor.publicos, usuarios);
    mesclar(S.tec.parceiros, x.parceiros || []);
    S.valor.publicos.forEach(function (p) {
      var t = S.traj[p] = S.traj[p] || {};
      if (!txt(t.mudanca) && tx("CA4")) t.mudanca = tx("CA4");
      if (!txt(t.pressupostos) && tx("CA6")) t.pressupostos = tx("CA6");
    });
    var muds = [];
    var rot = {}; (d.mapa_rotulos || []).forEach(function (m) { rot[m.codigo] = m.rotulo; });
    Object.keys(d.mapa || {}).forEach(function (k) { var m = d.mapa[k]; if (m && m.marcada) muds.push({ codigo: k, rotulo: rot[k] || ROTULOS_TI[k] || k, nivel: m.nivel || 0 }); });
    S.terimpact = { titulo: x.titulo || "", mudancas: muds, ca4: tx("CA4"), ca6: tx("CA6") };
    save();
  }
  var ROTULOS_TI = {};
  try { ROTULOS_TI = JSON.parse(document.getElementById("rotulos-ti").textContent); } catch (e) {}

  function exemplo() {
    var s = blank(); S = s; s.exemplo = true;
    s.tec = { nome: "Painel de indicadores de uma cadeia produtiva (exemplo)", tipo: "Plataforma ou painel", momento: "Recém-disponibilizada", descricao: "Plataforma web que reúne dados de produção, mercado e logística de uma cadeia produtiva, com mapas e séries históricas por município.", endereco: "https://exemplo.org/painel", unidade: "Unidade de pesquisa (exemplo)", projeto: "Projeto de inteligência territorial (exemplo)", equipe: "Equipe técnica do painel", responsavel: "Área de TT", trl: "8", inicio: "2027-03", duracao: 24, objetivos: ["Lançar a tecnologia", "Ampliar o acesso contínuo", "Recrutar usuários para avaliação de impacto"], parceiros: ["Ministério da Agricultura e Pecuária (MAPA)"] };
    s.crl.mercado.nivel = 6; s.crl.valor.nivel = 5; s.crl.negocio.nivel = 4; s.crl.parcerias.nivel = 6; s.crl.pi.na = true; s.crl.tt.nivel = 4; s.crl.regulatorio.na = true;
    s.crl.negocio.obs = "Não há definição de quem mantém e atualiza os dados após o término do projeto.";
    s.valor = { problema: "Informações sobre a cadeia estão dispersas em várias fontes e não permitem comparar regiões ao longo do tempo.", beneficios: "Consulta rápida a dados consolidados e comparáveis, para análise de mercado e para a formulação de políticas.", diferencial: "As bases oficiais estão dispersas e não integram produção, mercado e logística no mesmo recorte territorial.", casos: "Apoio à definição de áreas prioritárias de um programa público; análise de mercado por cooperativas.", publicos: ["Formuladores de políticas públicas", "Cooperativas e associações de produtores", "Pesquisadores e instituições de ensino"], territorios: "Regiões produtoras da cadeia" };
    s.traj = {
      "Formuladores de políticas públicas": { mudanca: "Usam os dados do painel na definição e no acompanhamento de programas para a cadeia.", nivel: 2, espera: "Acessam o painel após o lançamento e participam do workshop.", gostaria: "Consultam o painel de forma recorrente e pedem recortes específicos.", adoraria: "Citam o painel em documentos de programas e notas técnicas.", pressupostos: "Há interesse institucional em políticas para a cadeia no período." },
      "Cooperativas e associações de produtores": { mudanca: "Usam o painel em análises de mercado e no planejamento.", nivel: 2, espera: "Recebem e abrem o material de divulgação.", gostaria: "Registram-se como usuários e enviam sugestões.", adoraria: "Relatam decisões apoiadas nos dados do painel.", pressupostos: "As cooperativas dispõem de pessoas para consultar e interpretar os dados." },
      "Pesquisadores e instituições de ensino": { mudanca: "Usam os dados em pesquisas e aulas.", nivel: 1, espera: "Acessam o painel a partir das notícias.", gostaria: "Citam o painel em trabalhos.", adoraria: "Propõem integrações e novos indicadores.", pressupostos: "" }
    };
    var nomes = ["Kit e modelos de comunicação", "Levantamento e validação de conteúdos", "Links rastreáveis e linha de base", "Registro de usuários e canal de contato", "Lançamento institucional", "Produção de notícias institucionais", "Contato direcionado por público", "Workshop técnico", "Monitoramento de acessos e uso", "Registro de casos de uso", "Recrutamento de usuários para avaliação", "Avaliação de impacto ex post", "Devolutiva e uso dos resultados"];
    var pub = { "Lançamento institucional": [0, 1, 2], "Produção de notícias institucionais": [0, 1, 2], "Contato direcionado por público": [1], "Workshop técnico": [0, 1], "Registro de casos de uso": [0, 1], "Recrutamento de usuários para avaliação": [0, 1], "Registro de usuários e canal de contato": [0, 1, 2] };
    nomes.forEach(function (n) {
      var b = INST.biblioteca.filter(function (x) { return x.acao === n; })[0]; if (!b) return;
      var a = novaAcao(b); a.publicos = (pub[n] || []).map(function (k) { return s.valor.publicos[k]; });
      if (a.nivel === "mudanca" || a.nivel === "uso") a.mudanca = a.publicos[0] || "";
      s.acoes.push(a);
    });
    s.acoes.forEach(function (a) {
      if (a.acao === "Links rastreáveis e linha de base") { a.base = "registrar acessos de fev/27"; }
      if (a.acao === "Monitoramento de acessos e uso") { a.base = "a definir na fase 0"; a.meta = "300 usuários recorrentes por mês"; }
      if (a.acao === "Registro de casos de uso") a.meta = "5 casos documentados";
    });
    s.aval = { metodo: "Ambitec-TICs", inicio: "2028-09", fim: "2029-02", indicadores: "Usuários identificados por perfil; índice Ambitec-TICs; casos de uso institucional." };
    s.sust = { manutencao: "Equipe técnica, com atualização dos servidores pela área de TI.", atualizacao: "Atualização anual das bases, após a divulgação dos dados oficiais.", evolucao: "Novos indicadores conforme as sugestões registradas no monitoramento.", recursos: "Orçamento da Unidade e projeto de continuidade a submeter.", responsavel: "Coordenação do plano" };
    ordenarAcoes();
  }

  /* ---------- Arquivos ---------- */

  var DL = null;
  try { if (window.claude && typeof window.claude.use === "function") window.claude.use("downloads").then(function (ns) { DL = ns; if (STEPS[step].id === "plano") rerender(); }, function () {}); } catch (e) {}
  function podeBaixar() { return !!DL || !framed; }
  function nomeArq(sufixo, ext) {
    var b = (S.tec.nome || "plano").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
    return "plano-tt-" + (b || "plano") + (sufixo ? "-" + sufixo : "") + "." + ext;
  }
  function salvar(nome, data) {
    if (DL) return DL.save({ filename: nome, data: data }).then(function () { msg("Arquivo salvo.", true); }, function (e) { if (e && e.code === "declined") return; msg("Não foi possível salvar o arquivo neste ambiente."); });
    var blob = data instanceof Blob ? data : new Blob([data], { type: "application/octet-stream" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    return Promise.resolve();
  }
  function blobXlsx(wb) { var out = XLSX.write(wb, { bookType: "xlsx", type: "array" }); return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }); }
  function folha(wb, nome, linhas, larguras) {
    var ws = XLSX.utils.aoa_to_sheet(linhas);
    if (larguras) ws["!cols"] = larguras.map(function (w) { return { wch: w }; });
    XLSX.utils.book_append_sheet(wb, ws, nome);
  }
  function rotNivel(v) { return NI[v] ? NI[v].nome : ""; }
  function rotFase(v) { return FASE[v] ? FASE[v].nome : ""; }
  function rotDim(v) { return DIM[v] ? DIM[v].nome : ""; }
  function dataMes(m) { return m ? m + "-01" : ""; }

  function planoXlsx() {
    var wb = XLSX.utils.book_new(), c = crlCalc(), t = S.tec;
    folha(wb, "LEIA-ME", [["Plano de Transferência de Tecnologia orientado ao impacto"], [t.nome], [], ["Gerado em", new Date().toLocaleDateString("pt-BR")], ["Período", mesTxt(t.inicio) + " a " + mesTxt(fimPlano())], [],
      ["Aba", "Conteúdo"], ["Tecnologia", "Identificação do ativo, objetivos e parceiros"], ["Maturidade", "Nível por dimensão da escala CRL e dimensão limitante"], ["Trajetória", "Mudança esperada, marcadores de progresso e pressupostos por público"],
      ["Ações", "Ações do plano, com responsável, período, indicador e métrica"], ["Cronograma", "Meses de execução de cada ação"], ["Indicadores", "Indicadores por nível, linha de base e meta"], ["Sustentação", "Manutenção, atualização, evolução, recursos, avaliação ex post e ideias futuras"]], [22, 90]);
    folha(wb, "Tecnologia", [["Campo", "Valor"], ["Nome", t.nome], ["Tipo de ativo", t.tipo], ["Momento", t.momento], ["Descrição", t.descricao], ["Endereço de acesso", t.endereco], ["TRL/MRL", t.trl], ["Unidade", t.unidade], ["Projeto de origem", t.projeto], ["Equipe técnica", t.equipe], ["Coordenação do plano", t.responsavel],
      ["Início do plano", mesTxt(t.inicio)], ["Duração (meses)", t.duracao], ["Objetivos", t.objetivos.join("; ")], ["Parceiros", t.parceiros.join("; ")], ["Problema", S.valor.problema], ["Benefícios", S.valor.beneficios], ["Alternativas e diferencial", S.valor.diferencial], ["Casos de uso", S.valor.casos], ["Públicos", S.valor.publicos.join("; ")], ["Territórios", S.valor.territorios]], [26, 100]);
    folha(wb, "Maturidade", [["Dimensão", "Pergunta orientadora", "Nível", "Descrição do nível", "Situação", "Observação", "Ações no plano"]].concat(DIMS.map(function (d) {
      var v = S.crl[d.id];
      return [d.nome + (d.opcional ? " *" : ""), d.pergunta, v.na ? "" : (v.nivel || ""), v.na ? "" : (v.nivel ? NIVEIS[v.nivel - 1] : ""), v.na ? "Não requer ação" : (c.limitantes.indexOf(d) >= 0 ? "Limitante" : ""), v.obs, S.acoes.filter(function (a) { return a.crl === d.id; }).length];
    })).concat([[], ["Nível global", "", c.global || "", c.global ? NIVEIS[c.global - 1] : ""], ["Regra", INST.crl.regra]]), [30, 50, 8, 20, 16, 50, 14]);
    folha(wb, "Trajetória", [["Público", "Mudança esperada", "Nível da mudança", "O que se espera ver", "O que se gostaria de ver", "O que se adoraria ver", "Pressupostos", "Ações"]].concat(S.valor.publicos.map(function (p) {
      var x = S.traj[p] || {};
      return [p, x.mudanca || "", x.nivel ? INST.niveis_mudanca[x.nivel - 1].rotulo : "", x.espera || "", x.gostaria || "", x.adoraria || "", x.pressupostos || "", S.acoes.filter(function (a) { return a.publicos.indexOf(p) >= 0; }).length];
    })), [30, 50, 22, 40, 40, 40, 40, 8]);
    folha(wb, "Ações", [["Tipo de Ação", "Ação", "Descrição", "Público", "Início", "Fim", "Responsável", "Resultado Esperado", "Indicador", "Métricas", "Fase", "Dimensão CRL", "Nível do indicador", "Mudança visada", "Linha de base", "Meta"]].concat(S.acoes.map(function (a) {
      return [a.tipo, a.acao, a.descricao, a.publicos.join("; "), mesTxt(a.inicio), mesTxt(a.fim), a.responsavel, a.resultado, a.indicador, a.metrica, rotFase(a.fase), rotDim(a.crl), rotNivel(a.nivel), a.mudanca, a.base, a.meta];
    })), [16, 34, 50, 26, 9, 9, 12, 44, 22, 22, 26, 24, 14, 26, 18, 18]);
    var ms = mesesPlano();
    folha(wb, "Cronograma", [["Ação", "Responsável", "Fase"].concat(ms.map(mesTxt))].concat(S.acoes.map(function (a) {
      return [a.acao, a.responsavel, rotFase(a.fase)].concat(ms.map(function (m) { return a.inicio && a.fim && m >= a.inicio && m <= a.fim ? "■" : ""; }));
    })), [34, 12, 26].concat(ms.map(function () { return 6; })));
    folha(wb, "Indicadores", [["Nível", "Indicador", "Métrica", "Ação", "Responsável", "Linha de base", "Meta"]].concat(NIVIND.reduce(function (acc, n) {
      return acc.concat(S.acoes.filter(function (a) { return a.nivel === n.id; }).map(function (a) { return [n.nome, a.indicador, a.metrica, a.acao, a.responsavel, a.base, a.meta]; }));
    }, [])).concat(S.acoes.filter(function (a) { return !NI[a.nivel]; }).map(function (a) { return ["", a.indicador, a.metrica, a.acao, a.responsavel, a.base, a.meta]; })), [12, 26, 26, 34, 12, 18, 18]);
    folha(wb, "Sustentação", [["Campo", "Valor"], ["Manutenção", S.sust.manutencao], ["Atualização", S.sust.atualizacao], ["Evolução", S.sust.evolucao], ["Fontes de recursos", S.sust.recursos], ["Responsável", S.sust.responsavel], [],
      ["Avaliação ex post: método", S.aval.metodo], ["Avaliação ex post: período", [mesTxt(S.aval.inicio), mesTxt(S.aval.fim)].filter(Boolean).join(" a ")], ["Avaliação ex post: indicadores", S.aval.indicadores], [], ["Ideias para ciclos futuros", S.ideias],
      [], ["Pontos de atenção"]].concat(alertas().map(function (x) { return [x.tag, x.t]; })), [30, 100]);
    return blobXlsx(wb);
  }

  function ids() {
    var t = S.tec;
    var b = (t.nome || "PLANO").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "PLANO";
    return { b: b, tec: "TEC-" + b, plano: "PLANO-" + b + "-" + String(t.inicio).slice(0, 4) };
  }
  function appsheetXlsx() {
    var wb = XLSX.utils.book_new(), t = S.tec, I = ids();
    var b = I.b, idTec = I.tec, idPlano = I.plano;
    var fim = fimPlano();
    folha(wb, "Tecnologias", [["ID_Tecnologia", "Nome_Tecnologia", "ID_Projeto", "Tipo_Tecnologia", "Maturidade", "Status_Tecnologia", "Data_Prevista_Disponibilizacao", "Precisa_Plano_TT", "ID_Plano_TT_Relacionado", "Publico_Alvo_Principal", "Parceiros", "Observacoes"],
      [idTec, t.nome, "", t.tipo, "CRL " + (crlCalc().global || "") + (t.trl ? "; TRL " + t.trl : ""), t.momento, "", "SIM", idPlano, S.valor.publicos.join("; "), t.parceiros.join("; "), t.descricao]]);
    folha(wb, "Planos_TT", [["ID_Plano_TT", "Nome_Plano", "ID_Tecnologia", "Ciclo", "Objetivo_Plano", "Responsavel_TT", "Fase_Plano", "Status_Plano", "Prioridade", "Risco_TT", "Data_Inicio_Planejada", "Data_Fim_Planejada", "Data_Avaliacao_ExPost_Prevista", "Observacoes"],
      [idPlano, "Plano de TT - " + t.nome, idTec, String(t.inicio).slice(0, 4) + "-" + fim.slice(0, 4), t.objetivos.join("; "), t.responsavel, "Planejamento", "Ativo", "", "", dataMes(t.inicio), dataMes(fim), dataMes(S.aval.inicio), "Gerado pela ferramenta Plano de TT orientado ao impacto."]]);
    var inds = [], idx = {};
    S.acoes.forEach(function (a) { var k = (a.indicador + "|" + a.metrica).toLowerCase(); if (!idx[k]) { idx[k] = "IND-" + ("00" + (inds.length + 1)).slice(-3); inds.push([idx[k], a.indicador, a.metrica, "Número", "Conforme ação", ""]); } });
    folha(wb, "Acoes_TT", [["ID_Acao", "ID_Plano_TT", "ID_Tecnologia", "Tipo_Acao", "Nome_Acao", "Descricao", "ID_Publico", "Publico_Texto", "Data_Inicio", "Data_Fim", "Acao_Continua", "ID_Responsavel", "Responsavel_Texto", "Resultado_Esperado", "ID_Indicador", "Indicador_Texto", "Metrica_Texto", "Status_Acao", "Prioridade", "Percentual_Avanco", "Evidencia_Principal", "Observacoes"]].concat(S.acoes.map(function (a, i) {
      return ["ACAO-" + b + "-" + ("00" + (i + 1)).slice(-3), idPlano, idTec, a.tipo, a.acao, a.descricao, "", a.publicos.join("; "), dataMes(a.inicio), dataMes(a.fim), "NÃO", "", a.responsavel, a.resultado, idx[(a.indicador + "|" + a.metrica).toLowerCase()], a.indicador, a.metrica, "Planejada", "", 0, "", [rotFase(a.fase), rotDim(a.crl) && "CRL: " + rotDim(a.crl), rotNivel(a.nivel) && "Nível: " + rotNivel(a.nivel), a.base && "Linha de base: " + a.base, a.meta && "Meta: " + a.meta].filter(Boolean).join("; ")];
    })));
    folha(wb, "Indicadores", [["ID_Indicador", "Indicador", "Metrica", "Unidade_Medida", "Fonte_Padrao", "Periodicidade"]].concat(inds));
    var mon = S.acoes.filter(function (a) { return a.tipo === "Monitoramento"; });
    folha(wb, "Monitoramento_Adocao", [["ID_Monitoramento", "ID_Tecnologia", "ID_Plano_TT", "Tipo_Monitoramento", "Fonte", "Periodicidade", "Data_Inicio", "Data_Fim", "Status_Monitoramento", "Indicador_Principal", "Resultado_Observado", "Evidencias", "Observacoes"]].concat(mon.map(function (a, i) {
      return ["MON-" + b + "-" + ("00" + (i + 1)).slice(-3), idTec, idPlano, a.acao, "", "Mensal", dataMes(a.inicio), dataMes(a.fim), "Planejado", a.metrica, "", "", a.descricao];
    })));
    folha(wb, "Avaliacoes_ExPost", [["ID_Avaliacao", "ID_Tecnologia", "ID_Plano_TT", "Metodo", "Status_Avaliacao", "Data_Inicio_Prevista", "Data_Fim_Prevista", "Indicadores_Chave", "Resultados", "Recomendacoes"],
      ["AVEX-" + b + "-001", idTec, idPlano, S.aval.metodo, "Planejada", dataMes(S.aval.inicio), dataMes(S.aval.fim), S.aval.indicadores, "", ""]]);
    return blobXlsx(wb);
  }

  function xe(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ""); }
  function wp(t, est) { return "<w:p>" + (est ? '<w:pPr><w:pStyle w:val="' + est + '"/></w:pPr>' : '<w:pPr><w:jc w:val="both"/></w:pPr>') + '<w:r><w:t xml:space="preserve">' + xe(t) + "</w:t></w:r></w:p>"; }
  function wpb(rot, t) { return '<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">' + xe(rot) + ': </w:t></w:r><w:r><w:t xml:space="preserve">' + xe(t || "–") + "</w:t></w:r></w:p>"; }
  function wtab(cab, linhas) {
    function cel(t, b) { return '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p><w:r>' + (b ? "<w:rPr><w:b/><w:sz w:val=\"18\"/></w:rPr>" : '<w:rPr><w:sz w:val="18"/></w:rPr>') + '<w:t xml:space="preserve">' + xe(t) + "</w:t></w:r></w:p></w:tc>"; }
    var bd = '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="BBBBBB"/><w:bottom w:val="single" w:sz="4" w:color="BBBBBB"/><w:insideH w:val="single" w:sz="4" w:color="BBBBBB"/><w:insideV w:val="single" w:sz="4" w:color="DDDDDD"/></w:tblBorders>';
    return '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' + bd + "</w:tblPr>" + "<w:tr>" + cab.map(function (c) { return cel(c, true); }).join("") + "</w:tr>" + linhas.map(function (l) { return "<w:tr>" + l.map(function (c) { return cel(c); }).join("") + "</w:tr>"; }).join("") + "</w:tbl>" + wp("");
  }
  function planoDocx() {
    var c = crlCalc(), t = S.tec, b = "";
    b += wp("Plano de Transferência de Tecnologia orientado ao impacto", "Title") + wp(t.nome, "Subtitle");
    b += wp("1. Tecnologia", "Heading1") + wpb("Tipo de ativo", t.tipo) + wpb("Momento", t.momento) + wpb("Descrição", t.descricao) + wpb("Endereço de acesso", t.endereco) + wpb("TRL/MRL", t.trl) + wpb("Unidade", t.unidade) + wpb("Projeto de origem", t.projeto) + wpb("Equipe técnica", t.equipe) + wpb("Coordenação do plano", t.responsavel) + wpb("Período", mesTxt(t.inicio) + " a " + mesTxt(fimPlano()) + " (" + t.duracao + " meses)") + wpb("Objetivos", t.objetivos.join("; ")) + wpb("Parceiros", t.parceiros.join("; "));
    b += wp("2. Maturidade mercadológica", "Heading1") + wp("Nível global: " + (c.global ? c.global + " (" + NIVEIS[c.global - 1] + ")" : "não informado") + ". Dimensão limitante: " + (c.limitantes.map(function (d) { return d.nome; }).join("; ") || "–") + ". " + INST.crl.regra);
    b += wtab(["Dimensão", "Nível", "Observação", "Ações"], DIMS.map(function (d) { var v = S.crl[d.id]; return [d.nome, v.na ? "Não requer ação" : v.nivel ? v.nivel + " · " + NIVEIS[v.nivel - 1] : "–", v.obs, String(S.acoes.filter(function (a) { return a.crl === d.id; }).length)]; }));
    b += wp("3. Valor e públicos", "Heading1") + wpb("Problema", S.valor.problema) + wpb("Benefícios", S.valor.beneficios) + wpb("Alternativas e diferencial", S.valor.diferencial) + wpb("Casos de uso", S.valor.casos) + wpb("Públicos", S.valor.publicos.join("; ")) + wpb("Territórios", S.valor.territorios);
    b += wp("4. Trajetória de adoção", "Heading1");
    S.valor.publicos.forEach(function (p) { var x = S.traj[p] || {}; b += wp(p, "Heading2") + wpb("Mudança esperada", (x.mudanca || "") + (x.nivel ? " (" + INST.niveis_mudanca[x.nivel - 1].rotulo.toLowerCase() + ")" : "")) + wpb("O que se espera ver", x.espera) + wpb("O que se gostaria de ver", x.gostaria) + wpb("O que se adoraria ver", x.adoraria) + wpb("Pressupostos", x.pressupostos); });
    b += wp("5. Ações", "Heading1");
    FASES.forEach(function (f) {
      var its = S.acoes.filter(function (a) { return a.fase === f.id; }); if (!its.length) return;
      b += wp(f.nome, "Heading2") + wtab(["Ação", "Público", "Período", "Responsável", "Resultado esperado", "Indicador e métrica"], its.map(function (a) { return [a.acao + (a.descricao ? ". " + a.descricao : ""), a.publicos.join("; "), mesTxt(a.inicio) + "–" + mesTxt(a.fim), a.responsavel, a.resultado, [a.indicador, a.metrica].filter(Boolean).join(": ")]; }));
    });
    b += wp("6. Monitoramento e avaliação", "Heading1") + wtab(["Nível", "Indicador", "Métrica", "Linha de base", "Meta"], S.acoes.map(function (a) { return [rotNivel(a.nivel), a.indicador, a.metrica, a.base, a.meta]; }));
    b += wpb("Avaliação ex post", [S.aval.metodo, [mesTxt(S.aval.inicio), mesTxt(S.aval.fim)].filter(Boolean).join(" a ")].filter(Boolean).join(", ")) + wpb("Indicadores-chave", S.aval.indicadores);
    b += wp("7. Sustentação e financiamento", "Heading1") + wpb("Manutenção", S.sust.manutencao) + wpb("Atualização", S.sust.atualizacao) + wpb("Evolução", S.sust.evolucao) + wpb("Fontes de recursos", S.sust.recursos) + wpb("Responsável", S.sust.responsavel);
    if (txt(S.ideias)) b += wp("Ideias para ciclos futuros", "Heading2") + wp(S.ideias);
    var al = alertas(); if (al.length) { b += wp("Pontos de atenção", "Heading1"); al.forEach(function (x) { b += wpb(x.tag, x.t); }); }
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + b + '<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
    function st(id, nome, sz, cor, extra) { return '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + nome + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="120"/>' + (extra || "") + '</w:pPr><w:rPr><w:b/><w:sz w:val="' + sz + '"/><w:color w:val="' + cor + '"/></w:rPr></w:style>'; }
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' + st("Title", "Title", 36, "1C6A58") + st("Subtitle", "Subtitle", 26, "333333") + st("Heading1", "heading 1", 28, "1C6A58", '<w:outlineLvl w:val="0"/>') + st("Heading2", "heading 2", 23, "333333", '<w:outlineLvl w:val="1"/>') + "</w:styles>";
    var z = new JSZip();
    z.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
    z.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file("word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    z.file("word/document.xml", doc); z.file("word/styles.xml", styles);
    return z.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }


  /* ---------- Plano em equipe e registro ---------- */

  var PARAMS = (function () { try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; } })();
  var EQ = { msg: "", ok: false, conflito: null, ocupado: false };
  function api(metodo, dados) {
    if (!ENDPOINT) return Promise.reject(new Error("Serviço não configurado."));
    var req = metodo === "GET" ? fetch(ENDPOINT + "?" + new URLSearchParams(dados).toString()) : fetch(ENDPOINT, { method: "POST", body: JSON.stringify(dados) });
    return req.then(function (x) { return x.json(); });
  }
  function linkPlano() { return location.origin + location.pathname + "?plano=" + S.grupo.codigo; }
  function autor() { return lsGet("planott.autor") || ""; }
  function dataHora(v) { try { return new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return ""; } }
  function dadosEnvio() { var d = JSON.parse(JSON.stringify(S)); delete d.grupo; delete d.sujo; d.exemplo = false; return d; }

  /* Versão legível do plano para as abas planos_tt e acoes_tt, nas colunas da base do AppSheet. */
  function legivel() {
    var t = S.tec, c = crlCalc(), I = ids(), al = alertas();
    var plano = {
      ID_Plano_TT: I.plano, ID_Tecnologia: I.tec, Nome_Plano: "Plano de TT - " + t.nome, Nome_Tecnologia: t.nome, Tipo_Tecnologia: t.tipo, Momento: t.momento,
      Descricao: t.descricao, Endereco: t.endereco, TRL: t.trl, Unidade: t.unidade, Projeto: t.projeto, Equipe: t.equipe, Responsavel_TT: t.responsavel,
      Objetivo_Plano: t.objetivos, Parceiros: t.parceiros, Publicos: S.valor.publicos, Territorios: S.valor.territorios,
      Data_Inicio_Planejada: dataMes(t.inicio), Data_Fim_Planejada: dataMes(fimPlano()), Duracao_meses: t.duracao,
      CRL_global: c.global || "", CRL_limitante: c.limitantes.map(function (d) { return d.nome; })
    };
    DIMS.forEach(function (d) { var v = S.crl[d.id]; plano["CRL_" + d.id] = v.na ? "não requer ação" : (v.nivel || ""); });
    plano.Problema = S.valor.problema; plano.Beneficios = S.valor.beneficios; plano.Diferencial = S.valor.diferencial; plano.Casos_de_uso = S.valor.casos;
    plano.N_acoes = S.acoes.length; plano.Metodo_ExPost = S.aval.metodo; plano.Data_Avaliacao_ExPost_Prevista = dataMes(S.aval.inicio);
    plano.Manutencao = S.sust.manutencao; plano.Atualizacao = S.sust.atualizacao; plano.Evolucao = S.sust.evolucao; plano.Recursos = S.sust.recursos;
    plano.Pontos_de_atencao = al.filter(function (x) { return x.nivel !== "info"; }).map(function (x) { return x.tag + ": " + x.t; }).join(" | ");
    var acoes = S.acoes.map(function (a, i) {
      return {
        ID_Acao: "ACAO-" + I.b + "-" + ("00" + (i + 1)).slice(-3), ID_Plano_TT: I.plano, Fase: rotFase(a.fase), Tipo_Acao: a.tipo, Nome_Acao: a.acao, Descricao: a.descricao,
        Publico_Texto: a.publicos, Data_Inicio: dataMes(a.inicio), Data_Fim: dataMes(a.fim), Responsavel_Texto: a.responsavel, Resultado_Esperado: a.resultado,
        Indicador_Texto: a.indicador, Metrica_Texto: a.metrica, Nivel_Indicador: rotNivel(a.nivel), Dimensao_CRL: rotDim(a.crl), Mudanca_Visada: a.mudanca,
        Linha_de_Base: a.base, Meta: a.meta, Status_Acao: "Planejada"
      };
    });
    return { plano: plano, acoes: acoes };
  }

  function eqMsg(t, ok) { EQ.msg = t; EQ.ok = !!ok; var m = document.getElementById("eq-msg"); if (m) { m.textContent = t; m.className = "msg " + (ok ? "ok" : "err"); } }
  var ESPERA = "Conectando à planilha. A primeira conexão do dia pode levar até 20 segundos.";
  function ocupado(b) { EQ.ocupado = b; document.querySelectorAll("[data-eq]").forEach(function (x) { x.disabled = b; }); }

  function enviarPlano(opcoes) {
    opcoes = opcoes || {};
    var nome = autor();
    eqMsg(ESPERA, true); ocupado(true);
    return api("POST", { acao: "salvar-plano", codigo: S.grupo.codigo, versao_base: S.grupo.versao || 0, forcar: !!opcoes.forcar, registrar: !!opcoes.registrar, autor: nome, dados: dadosEnvio(), legivel: legivel() })
      .then(function (x) {
        ocupado(false);
        if (x.ok) {
          S.grupo.versao = x.versao; S.grupo.salvo = x.salvo; S.grupo.autor = nome; S.grupo.situacao = x.situacao; EQ.conflito = null;
          save(true); eqMsg(opcoes.registrar ? "Plano registrado na base da área de TT (versão " + x.versao + ")." : "Plano salvo no link (versão " + x.versao + ").", true);
          rerender(); return;
        }
        if (x.erro === "conflito") { EQ.conflito = x; eqMsg(""); rerender(); return; }
        eqMsg(x.erro === "grupo" ? "O plano compartilhado não foi encontrado na planilha." : x.erro === "tamanho" ? "O plano excede o tamanho permitido para envio." : "Não foi possível salvar: " + x.erro);
      })
      .catch(function () { ocupado(false); eqMsg("Não foi possível conectar à planilha. Verifique a conexão e tente novamente."); });
  }
  function criarLink(depois) {
    eqMsg(ESPERA, true); ocupado(true);
    return api("POST", { acao: "criar", ferramenta: "plano-tt", titulo: S.tec.nome || "Plano de TT" }).then(function (x) {
      ocupado(false);
      if (!x.ok) return eqMsg("Não foi possível criar o link: " + x.erro);
      S.grupo = { codigo: x.codigo, versao: 0 }; save();
      return enviarPlano(depois);
    }).catch(function () { ocupado(false); eqMsg("Não foi possível conectar à planilha. Verifique a conexão e tente novamente."); });
  }
  function carregarDoLink(codigo, silencioso) {
    if (!silencioso) { eqMsg(ESPERA, true); ocupado(true); }
    return api("GET", { acao: "plano", codigo: codigo }).then(function (x) {
      ocupado(false);
      if (!x.ok) { eqMsg("Plano compartilhado não encontrado. Confira o link recebido."); return; }
      if (!x.versao || !x.dados || !valid(x.dados)) {
        if (!S.grupo || S.grupo.codigo !== codigo) { lsSet(KEY + ".anterior", JSON.stringify(S)); S = blank(); S.tec.nome = x.titulo || ""; }
        S.grupo = { codigo: codigo, versao: 0 }; save(true); eqMsg("O plano compartilhado ainda não tem versão salva.", true); rerender(); return;
      }
      if ((!S.grupo || S.grupo.codigo !== codigo) && !S.exemplo && (txt(S.tec.nome) || S.acoes.length)) lsSet(KEY + ".anterior", JSON.stringify(S));
      S = normalize(x.dados); S.exemplo = false;
      S.grupo = { codigo: codigo, versao: x.versao, salvo: x.salvo, autor: x.autor, situacao: x.situacao }; EQ.conflito = null;
      save(true); eqMsg("Versão " + x.versao + " carregada" + (x.autor ? " (salva por " + x.autor + " em " + dataHora(x.salvo) + ")" : "") + ".", true); rerender();
    }).catch(function () { ocupado(false); eqMsg("Não foi possível conectar à planilha. Verifique a conexão e tente novamente."); });
  }
  /* Ao abrir um link de plano: carrega a versão do link, preservando alterações locais ainda não enviadas. */
  function abrirLink(codigo) {
    if (S.grupo && S.grupo.codigo === codigo && S.sujo) {
      api("GET", { acao: "plano", codigo: codigo }).then(function (x) {
        if (x.ok && x.versao > (S.grupo.versao || 0)) { EQ.conflito = { versao: x.versao, autor: x.autor, salvo: x.salvo, aoAbrir: true }; rerender(); }
      }).catch(function () {});
      return;
    }
    carregarDoLink(codigo, true);
  }

  function painelEquipe(onde) {
    if (!ENDPOINT || S.exemplo) return "";
    var nome = autor();
    var campoNome = '<div class="field"><label for="eq-autor">Seu nome ou função</label><input type="text" id="eq-autor" value="' + esc(nome) + '" placeholder="Identifica quem salvou cada versão"></div>';
    var aceite = '<label class="opts"><span><input type="checkbox" id="eq-aceite"> Concordo em enviar o plano, com o nome ou a função informados, para a planilha mantida pela coordenação deste site.</span></label>';
    var h = '<div class="panel no-print"><h3>Plano em equipe</h3>';
    if (!S.grupo) {
      h += '<p class="small">Crie um link para que a equipe edite o mesmo plano. Cada pessoa abre o link, faz as alterações e salva uma nova versão. Se duas pessoas editarem ao mesmo tempo, quem salvar por último é avisado e escolhe entre carregar a versão mais recente ou manter a sua.</p>' +
        campoNome + aceite + '<div class="actions"><button class="btn primary" data-eq="1" data-act="eq-criar">Criar link do plano</button></div>';
    } else {
      var g = S.grupo;
      h += '<div class="stack"><p class="small"><strong>Link do plano</strong> (envie a quem vai editar)</p><div class="add-row"><input type="text" readonly id="eq-link" value="' + esc(linkPlano()) + '"><button class="btn" data-copiar="eq-link">Copiar</button></div>' +
        '<p class="small muted">' + (g.versao ? "Versão " + g.versao + (g.autor ? ", salva por " + esc(g.autor) : "") + (g.salvo ? " em " + esc(dataHora(g.salvo)) : "") + "." : "Ainda não há versão salva no link.") +
        (g.situacao === "registrado" ? " Plano registrado." : "") + (S.sujo ? ' <strong class="tag-warn">Há alterações neste navegador ainda não salvas no link.</strong>' : "") + "</p></div>";
      if (EQ.conflito) {
        var cf = EQ.conflito;
        h += '<div class="confirm"><span>' + (cf.aoAbrir ? "O link tem uma versão mais recente (" : "Outra pessoa salvou uma versão mais recente (") + "versão " + cf.versao + (cf.autor ? ", por " + esc(cf.autor) : "") + (cf.salvo ? " em " + esc(dataHora(cf.salvo)) : "") + "). Carregar a versão do link descarta as alterações feitas neste navegador; manter a sua substitui a versão do link.</span>" +
          '<button class="btn primary" data-eq="1" data-act="eq-carregar-forcado">Carregar a versão do link</button><button class="btn danger" data-eq="1" data-act="eq-sobrescrever">Manter a minha</button></div>';
      }
      h += campoNome + aceite + '<div class="actions"><button class="btn primary" data-eq="1" data-act="eq-salvar">Salvar no link</button><button class="btn" data-eq="1" data-act="eq-atualizar">Carregar a versão do link</button><button class="btn link" data-act="eq-sair">Deixar de usar o link</button></div>';
    }
    if (onde === "plano") {
      h += '<div class="stack import-rev"><h3>Registrar o plano</h3><p class="small">Quando o plano estiver concluído, registre-o na base da área de TT. O plano passa a constar da planilha de acompanhamento, com uma linha por plano e uma linha por ação, nas colunas da base do AppSheet. Alterações posteriores podem ser salvas no mesmo link e atualizam o registro.</p>' +
        (S.grupo && S.grupo.situacao === "registrado" ? '<p class="small tag-ok"><strong>Plano registrado.</strong></p>' : "") +
        '<div class="actions"><button class="btn" data-eq="1" data-act="eq-registrar">' + (S.grupo && S.grupo.situacao === "registrado" ? "Atualizar o registro" : "Registrar plano concluído") + "</button></div></div>";
    }
    return h + '<div class="msg ' + (EQ.ok ? "ok" : "err") + '" id="eq-msg" role="status">' + esc(EQ.msg) + "</div></div>";
  }
  function faixaEquipe() {
    if (!S.grupo || S.exemplo || step === 0) return "";
    return '<div class="eq-faixa no-print"><span>Plano compartilhado · ' + (S.grupo.versao ? "versão " + S.grupo.versao : "sem versão salva") + (S.sujo ? ' · <strong>alterações não salvas no link</strong>' : "") + '</span>' +
      (S.sujo ? '<button class="btn" data-eq="1" data-act="eq-salvar-rapido">Salvar no link</button>' : "") + "</div>";
  }
  function validarEnvio() {
    var a = document.getElementById("eq-autor"), ac = document.getElementById("eq-aceite");
    var nome = a ? txt(a.value) : autor();
    if (!nome) { eqMsg("Informe seu nome ou função."); return false; }
    lsSet("planott.autor", nome);
    if (ac && !ac.checked) { eqMsg("Marque a concordância com o envio para a planilha."); return false; }
    return true;
  }

  /* ---------- Eventos ---------- */

  function incluirItem(path, valor, lista) {
    var l = getP(path) || []; if (!valor || l.indexOf(valor) >= 0) return;
    l.push(valor); setP(path, l); save();
    if (ENDPOINT && lista && !S.exemplo) { try { fetch(ENDPOINT, { method: "POST", body: JSON.stringify({ acao: "incluir", ferramenta: "plano-tt", lista: lista, valor: valor }) }).catch(function () {}); } catch (e) {} }
  }
  function aposMudarPublicos() {
    S.acoes.forEach(function (a) { a.publicos = a.publicos.filter(function (p) { return S.valor.publicos.indexOf(p) >= 0; }); if (a.mudanca && S.valor.publicos.indexOf(a.mudanca) < 0) a.mudanca = ""; });
  }

  app.addEventListener("click", function (e) {
    var el = e.target.closest("button"); if (!el) return;
    var d = el.dataset;
    if (d.go !== undefined) return go(+d.go);
    if (d.dd !== undefined) { DD[d.dd] = !DD[d.dd]; return rerender(); }
    if (d.rm !== undefined) { var l = getP(d.rm); l.splice(+d.i, 1); if (d.rm === "valor|publicos") aposMudarPublicos(); save(); return rerender(); }
    if (d.add !== undefined) {
      var inp = document.getElementById("add-" + d.k), v = inp ? txt(inp.value) : "";
      if (!v) return; incluirItem(d.add, v, d.lista); return rerender();
    }
    if (d.crl) { var c = S.crl[d.crl]; c.nivel = c.nivel === +d.v ? 0 : +d.v; save(); return rerender(); }
    if (d.traj !== undefined) { var t = S.traj[d.traj] = S.traj[d.traj] || {}; t.nivel = +t.nivel === +d.v ? 0 : +d.v; save(); return rerender(); }
    if (d.dup !== undefined) { var o = S.acoes[+d.dup], n = JSON.parse(JSON.stringify(o)); n.id = "a" + (++S.seq); n.acao = o.acao + " (cópia)"; S.acoes.splice(+d.dup + 1, 0, n); ABERTAS[n.id] = true; save(); return rerender(); }
    if (d.pedirm) { REMOVER = d.pedirm; return rerender(); }
    if (d.rmacao !== undefined) { S.acoes.splice(+d.rmacao, 1); REMOVER = null; save(); return rerender(); }
    if (d.copiar) { var cp = document.getElementById(d.copiar); cp.select(); try { navigator.clipboard.writeText(cp.value).then(function () { eqMsg("Link copiado.", true); }, function () { document.execCommand("copy"); }); } catch (er) { document.execCommand("copy"); } return; }
    var act = d.act;
    if (!act) return;
    if (EQ.ocupado && /^eq-/.test(act)) return;
    if (act === "eq-criar") { if (validarEnvio()) criarLink(); return; }
    if (act === "eq-salvar" || act === "eq-salvar-rapido") {
      if (act === "eq-salvar" && !validarEnvio()) return;
      if (act === "eq-salvar-rapido" && !autor()) { go(STEPS.length - 1); return eqMsg("Informe seu nome ou função e salve no link."); }
      return enviarPlano();
    }
    if (act === "eq-registrar") {
      if (!validarEnvio()) return;
      return S.grupo ? enviarPlano({ registrar: true }) : criarLink({ registrar: true });
    }
    if (act === "eq-sobrescrever") { if (!validarEnvio()) return; return enviarPlano({ forcar: true }); }
    if (act === "eq-atualizar") {
      if (S.sujo) { EQ.conflito = { versao: "do link", aoAbrir: true }; return rerender(); }
      return carregarDoLink(S.grupo.codigo);
    }
    if (act === "eq-carregar-forcado") { return carregarDoLink(S.grupo.codigo); }
    if (act === "eq-sair") { S.grupo = null; S.sujo = false; EQ.conflito = null; EQ.msg = ""; save(); try { history.replaceState(null, "", location.pathname); } catch (er) {} return rerender(); }
    if (act === "cancelar-rm") { REMOVER = null; return rerender(); }
    if (act === "exemplo") { exemplo(); return go(STEPS.length - 1); }
    if (act === "novo-real") { S = load() || blank(); return go(1); }
    if (act === "pedir-novo") {
      document.getElementById("confirm-slot").innerHTML = '<div class="confirm"><span>O plano atual será apagado deste navegador. Salve o arquivo antes, se quiser mantê-lo.</span><button class="btn danger" data-act="confirma-novo">Apagar e começar</button><button class="btn link" data-act="cancela-novo">Cancelar</button></div>';
      return;
    }
    if (act === "confirma-novo") { S = blank(); save(); try { history.replaceState(null, "", location.pathname); } catch (er) {} return go(1); }
    if (act === "cancela-novo") { document.getElementById("confirm-slot").innerHTML = ""; return; }
    if (act === "ler-terimpact") {
      return lerArquivo(document.getElementById("ti-file")).then(function (j) { aplicarTerImpact(j); go(1); }).catch(function (er) { msg(er.message); });
    }
    if (act === "abrir-plano") {
      return lerArquivo(document.getElementById("plano-file")).then(function (j) {
        if (!valid(j)) throw new Error("O arquivo não é um plano salvo por esta ferramenta.");
        S = normalize(j); S.exemplo = false; save(); go(STEPS.length - 1);
      }).catch(function (er) { msg(er.message); });
    }
    if (act === "bib-abrir") { BIB = !BIB; return rerender(); }
    if (act === "bib-fechar") { BIB = false; BIB_SEL = {}; return rerender(); }
    if (act === "bib-add") {
      Object.keys(BIB_SEL).forEach(function (i) { if (BIB_SEL[i]) S.acoes.push(novaAcao(INST.biblioteca[+i])); });
      BIB_SEL = {}; BIB = false; ordenarAcoes(); save(); return rerender();
    }
    if (act === "acao-nova") { var a = novaAcao(); S.acoes.push(a); ABERTAS[a.id] = true; save(); return rerender(); }
    if (act === "acao-basicas") { INST.biblioteca.filter(function (b) { return b.sugerida; }).forEach(function (b) { S.acoes.push(novaAcao(b)); }); ordenarAcoes(); save(); return rerender(); }
    if (act === "imprimir") { window.print(); return; }
    if (act === "json") { var data = JSON.parse(JSON.stringify(S)); data.exemplo = false; return salvar(nomeArq("", "json"), JSON.stringify(data, null, 2)); }
    if (act === "xlsx" || act === "appsheet") {
      if (typeof XLSX === "undefined") return msg("A biblioteca de planilhas não carregou. Verifique a conexão e recarregue a página.");
      try { return salvar(nomeArq(act === "appsheet" ? "appsheet" : "", "xlsx"), act === "appsheet" ? appsheetXlsx() : planoXlsx()); } catch (er) { return msg("Erro ao gerar a planilha: " + er.message); }
    }
    if (act === "docx") {
      if (typeof JSZip === "undefined") return msg("A biblioteca de documentos não carregou. Verifique a conexão e recarregue a página.");
      return planoDocx().then(function (bl) { return salvar(nomeArq("", "docx"), bl); }).catch(function (er) { msg("Erro ao gerar o documento: " + er.message); });
    }
  });

  app.addEventListener("toggle", function (e) {
    var dt = e.target; if (dt.matches && dt.matches("details.acao")) ABERTAS[dt.dataset.acao] = dt.open;
  }, true);

  function aplicarCampo(el) {
    var path = el.dataset.f, v = el.value;
    if (el.type === "number") v = v === "" ? "" : +v;
    setP(path, v);
    var ks = caminho(path);
    if (ks[0] === "acoes" && ks[2] === "fase") { var a = S.acoes[+ks[1]]; var dd = datasPadrao(v); if (!a.inicio) a.inicio = dd[0]; if (!a.fim) a.fim = dd[1]; }
    save();
  }
  app.addEventListener("input", function (e) {
    var el = e.target;
    if (el.dataset.f !== undefined && !el.dataset.r) { aplicarCampo(el); refreshStatus(); return; }
    if (el.dataset.busca !== undefined) {
      var q = el.value.trim().toLowerCase(), box = document.getElementById("dl-" + el.dataset.busca);
      if (box) box.querySelectorAll("label").forEach(function (lb) { lb.hidden = q && (lb.dataset.rotulo || "").indexOf(q) < 0; });
    }
  });
  app.addEventListener("change", function (e) {
    var el = e.target, d = el.dataset;
    if (d.f !== undefined) {
      aplicarCampo(el);
      if (d.r) {
        if (caminho(d.f)[0] === "acoes" && /fase|inicio/.test(d.f)) { var id = S.acoes[+caminho(d.f)[1]].id; ordenarAcoes(); ABERTAS[id] = true; }
        rerender();
      } else refreshStatus();
      return;
    }
    if (d.sel !== undefined) {
      var l = getP(d.sel) || [], v = d.val, i = l.indexOf(v);
      if (el.checked && i < 0) l.push(v); if (!el.checked && i >= 0) l.splice(i, 1);
      setP(d.sel, l); if (d.sel === "valor|publicos") aposMudarPublicos(); save();
      var chips = el.closest(".field").querySelector(".chips-list");
      if (chips) chips.innerHTML = l.length ? l.map(function (p, k) { return '<span class="tag-chip">' + esc(p) + ' <button data-rm="' + esc(d.sel) + '" data-i="' + k + '" aria-label="Remover ' + esc(p) + '">×</button></span>'; }).join("") : '<span class="small muted">Nenhum item selecionado.</span>';
      refreshStatus(); return;
    }
    if (d.crlna) { S.crl[d.crlna].na = el.checked; save(); return rerender(); }
    if (d.bib !== undefined) { BIB_SEL[d.bib] = el.checked; return; }
  });
  app.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.id && e.target.id.indexOf("add-") === 0) { e.preventDefault(); var b = e.target.parentNode.querySelector("button[data-add]"); if (b) b.click(); }
  });

  if (location.hash === "#exemplo") { exemplo(); step = STEPS.length - 1; }
  var CODIGO_LINK = (PARAMS.get("plano") || "").replace(/[^a-z0-9]/gi, "").slice(0, 20);
  if (CODIGO_LINK && ENDPOINT && location.hash !== "#exemplo") { if (S.exemplo) S = load() || blank(); EQ.msg = ESPERA; EQ.ok = true; step = STEPS.length - 1; abrirLink(CODIGO_LINK); }
  render();
})();
