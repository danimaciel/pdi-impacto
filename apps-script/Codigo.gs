/**
 * PD&I orientada ao impacto: serviço de respostas em equipe e de inclusões nas listas.
 *
 * Instalação: crie uma planilha Google em branco, abra Extensões > Apps Script,
 * substitua o conteúdo do arquivo pelo deste código e publique como aplicativo da web
 * (Executar como: eu; Quem pode acessar: qualquer pessoa).
 *
 * As abas "grupos", "respostas" e "inclusoes" são criadas automaticamente no primeiro uso.
 * - grupos: cada avaliação em equipe, com o código de participação e o token de coordenação.
 * - respostas: uma linha por pessoa e grupo; o envio repetido da mesma pessoa substitui a linha anterior.
 * - inclusoes: itens incluídos pelos usuários nas listas (públicos, parceiros, organizações etc.).
 *
 * As respostas de um grupo só são devolvidas a quem apresenta o token de coordenação.
 */

var ABAS = {
  grupos: ["codigo", "token", "ferramenta", "titulo", "criado"],
  respostas: ["codigo", "id_respondente", "ferramenta", "respondente", "enviado", "dados"],
  inclusoes: ["data", "ferramenta", "lista", "valor", "situacao"]
};
var LIMITE_CELULA = 45000;

function aba_(nome) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.appendRow(ABAS[nome]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function aleatorio_(n) {
  var c = "abcdefghijkmnpqrstuvwxyz23456789", s = "";
  for (var i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}

function texto_(v, max) { return String(v == null ? "" : v).slice(0, max); }

function linhaGrupo_(codigo) {
  var v = aba_("grupos").getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (v[i][0] === codigo) return v[i];
  return null;
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.acao === "grupo") return json_(grupo_(texto_(p.codigo, 20)));
    if (p.acao === "respostas") return json_(respostas_(texto_(p.codigo, 20), texto_(p.token, 40)));
    return json_({ ok: true, servico: "PD&I orientada ao impacto" });
  } catch (err) {
    return json_({ ok: false, erro: String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var corpo = (e && e.postData && e.postData.contents) || "{}";
    if (corpo.length > 300000) return json_({ ok: false, erro: "tamanho" });
    var b = JSON.parse(corpo);
    if (b.acao === "criar") return json_(criar_(b));
    if (b.acao === "enviar") return json_(enviar_(b));
    if (b.acao === "incluir") return json_(incluir_(b));
    return json_({ ok: false, erro: "acao" });
  } catch (err) {
    return json_({ ok: false, erro: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function criar_(b) {
  var codigo = aleatorio_(10), token = aleatorio_(24);
  aba_("grupos").appendRow([codigo, token, texto_(b.ferramenta, 40), texto_(b.titulo, 300), new Date()]);
  return { ok: true, codigo: codigo, token: token };
}

function grupo_(codigo) {
  var g = linhaGrupo_(codigo);
  if (!g) return { ok: false, erro: "grupo" };
  return { ok: true, ferramenta: g[2], titulo: g[3] };
}

function enviar_(b) {
  var codigo = texto_(b.codigo, 20);
  var g = linhaGrupo_(codigo);
  if (!g) return { ok: false, erro: "grupo" };
  var dados = JSON.stringify(b.dados || {});
  if (dados.length > LIMITE_CELULA) return { ok: false, erro: "tamanho" };
  var rid = texto_(b.rid, 40);
  var linha = [codigo, rid, g[2], texto_(b.respondente, 120), new Date(), dados];
  var sh = aba_("respostas");
  var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (v[i][0] === codigo && v[i][1] === rid) {
      sh.getRange(i + 1, 1, 1, linha.length).setValues([linha]);
      try { registrarLegivel_(g[2], codigo, rid, texto_(b.respondente, 120), b.dados || {}); } catch (e) {}
      return { ok: true, atualizado: true };
    }
  }
  sh.appendRow(linha);
  try { registrarLegivel_(g[2], codigo, rid, texto_(b.respondente, 120), b.dados || {}); } catch (e) {}
  return { ok: true, atualizado: false };
}

/* ---------- Abas legíveis por ferramenta ---------- */

function lista_(v) { return Array.isArray(v) ? v.join("; ") : (v == null ? "" : String(v)); }

/* Converte as respostas em pares coluna/valor, na ordem em que devem aparecer na planilha. */
function achatar_(ferramenta, d) {
  ferramentaAtual_ = ferramenta;
  var c = [];
  function add(k, v) { c.push([k, v == null ? "" : v]); }
  if (ferramenta === "agroradareval") {
    var o = d.organizacao || {};
    add("organizacao", o.nome); add("unidade", o.unidade); add("pais", o.pais); add("funcao", o.funcao);
    var r = d.respostas || {};
    Object.keys(r).sort(ordemCodigo_).forEach(function (k) { add(k, r[k] === 0 ? "NS" : r[k]); });
    var com = d.comentarios || {};
    Object.keys(com).forEach(function (k) { if (com[k]) add("observacoes_" + k, com[k]); });
    return c;
  }
  if (ferramenta === "terimpact") {
    var x = d.contexto || {};
    add("modo", d.modo); add("titulo", x.titulo); add("tipo", x.tipo); add("escala", x.escala); add("duracao", x.duracao);
    add("transformacao", x.transformacao); add("publicos", lista_(x.publicos)); add("parceiros", lista_(x.parceiros));
    var rs = d.respostas || {};
    Object.keys(rs).sort(ordemCodigo_).forEach(function (k) {
      var it = rs[k] || {};
      if (it.nota !== undefined && it.nota !== null) add(k + "_nota", it.nota);
      if (it.na) add(k + "_nota", "não se aplica");
      if (it.texto) add(k, it.texto);
      if (it.opcoes) add(k, lista_(it.opcoes));
      if (it.justificativa) add(k + "_justificativa", it.justificativa);
    });
    var m = d.mapa || {};
    Object.keys(m).sort(ordemCodigo_).forEach(function (k) {
      var it = m[k] || {};
      if (!it.marcada) return;
      add("mapa_" + k + "_nivel", it.nivel); add("mapa_" + k + "_alcance", it.alcance); add("mapa_" + k + "_horizonte", it.horizonte);
      if (it.justificativa) add("mapa_" + k + "_justificativa", it.justificativa);
    });
    return c;
  }
  Object.keys(d).forEach(function (k) { if (typeof d[k] !== "object") add(k, d[k]); });
  return c;
}

var ORDEM_ = {
  terimpact: ["PD", "EC", "SO", "AM", "PO", "IN", "CI", "CA", "RE", "QV"],
  agroradareval: ["DC", "PE", "CO", "PC", "CA", "MR", "RA", "AE"]
};
var ferramentaAtual_ = "";
function ordemCodigo_(a, b) {
  var ma = String(a).match(/^([A-Za-z]+)(\d*)/), mb = String(b).match(/^([A-Za-z]+)(\d*)/);
  if (!ma || !mb) return String(a) < String(b) ? -1 : 1;
  if (ma[1] !== mb[1]) {
    var ord = ORDEM_[ferramentaAtual_] || [], ia = ord.indexOf(ma[1]), ib = ord.indexOf(mb[1]);
    if (ia >= 0 && ib >= 0) return ia - ib;
    return ma[1] < mb[1] ? -1 : 1;
  }
  return (parseInt(ma[2] || "0", 10)) - (parseInt(mb[2] || "0", 10));
}

function registrarLegivel_(ferramenta, codigo, rid, respondente, dados) {
  var nome = "respostas_" + String(ferramenta || "outras").replace(/[^a-z0-9_]/gi, "");
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(nome);
  var base = ["codigo", "id_respondente", "respondente", "enviado"];
  if (!sh) { sh = ss.insertSheet(nome); sh.appendRow(base); sh.setFrozenRows(1); sh.setFrozenColumns(3); }
  var cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var pares = achatar_(ferramenta, dados);
  pares.forEach(function (p) { if (cab.indexOf(p[0]) < 0) { cab.push(p[0]); sh.getRange(1, cab.length).setValue(p[0]); } });
  var linha = cab.map(function () { return ""; });
  linha[0] = codigo; linha[1] = rid; linha[2] = respondente; linha[3] = new Date();
  pares.forEach(function (p) { var v = p[1]; if (typeof v === "string" && v.length > LIMITE_CELULA) v = v.slice(0, LIMITE_CELULA); linha[cab.indexOf(p[0])] = v; });
  var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (v[i][0] === codigo && v[i][1] === rid) { sh.getRange(i + 1, 1, 1, linha.length).setValues([linha]); return; }
  }
  sh.appendRow(linha);
}

function respostas_(codigo, token) {
  var g = linhaGrupo_(codigo);
  if (!g || g[1] !== token) return { ok: false, erro: "acesso" };
  var v = aba_("respostas").getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    if (v[i][0] === codigo) { try { out.push(JSON.parse(v[i][5])); } catch (e) {} }
  }
  return { ok: true, titulo: g[3], respostas: out };
}

function incluir_(b) {
  var valor = texto_(b.valor, 200).trim();
  if (!valor) return { ok: false, erro: "valor" };
  aba_("inclusoes").appendRow([new Date(), texto_(b.ferramenta, 40), texto_(b.lista, 40), valor, "novo"]);
  return { ok: true };
}
