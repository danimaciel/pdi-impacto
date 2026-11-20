/* Leitura de propostas para o modo Revisar do TerImpact.
   O arquivo é lido no navegador; nada é enviado a servidores.
   Formatos: .docx (via JSZip), .pdf (via pdf.js, carregado sob demanda) e .txt. */
(function (raiz) {
  "use strict";

  function norm(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  /* Campos de destino e títulos equivalentes (do mais específico para o mais geral). */
  var CAMPOS = [
    { id: "ignorar", nome: "Ignorar", sin: ["resumo de orcamento", "resumo em ingles", "abstract", "referencias", "bibliografia", "orcamento", "cronograma", "item de dispendio", "atividades propostas", "recurso seg", "dados do proponente"] },
    { id: "duracao", nome: "Duração", sin: ["prazo/duracao", "duracao do projeto", "duracao(meses)", "duracao (meses)", "prazo de execucao", "duracao"] },
    { id: "titulo", nome: "Título", sin: ["titulo do projeto", "titulo da proposta", "titulo"] },
    { id: "problema", nome: "Problema e justificativa", sin: ["caracterizacao e justificativa", "motivacao", "problematica", "questao central", "pergunta de pesquisa", "contextualizacao", "justificativa", "problema", "antecedentes", "introducao"] },
    { id: "resumo", nome: "Resumo", sin: ["resumo"] },
    { id: "objetivos", nome: "Objetivos", sin: ["objetivo geral", "objetivos especificos", "objetivo especifico", "objetivos", "objetivo"] },
    { id: "resultados", nome: "Produtos e resultados esperados", sin: ["produtos e resultados esperados", "resultados esperados", "principal resultado", "tipos de resultados", "resultados", "produtos esperados", "entregas"] },
    { id: "impactos", nome: "Impactos e benefícios esperados", sin: ["potenciais impactos", "impactos esperados", "impacto esperado", "desenvolvimento tecnologico e potencial de inovacao", "potencial de inovacao", "beneficios", "diferencial", "impactos"] },
    { id: "metodologia", nome: "Metodologia", sin: ["metodologia", "material e metodos", "materiais e metodos", "metodos", "abordagem metodologica"] },
    { id: "originalidade", nome: "Originalidade e estado da arte", sin: ["originalidade", "estado da arte", "relevancia do projeto", "carater inovador", "revisao de literatura"] },
    { id: "parcerias", nome: "Parcerias", sin: ["colaboracoes e parcerias", "outras instituicoes parceiras", "instituicoes parceiras", "parceiro demandante", "fontes de financiamento e/ou parcerias", "parcerias", "parceiros"] },
    { id: "equipe", nome: "Equipe e infraestrutura", sin: ["capacitacao da equipe", "equipe e percentual", "infraestrutura", "equipe executora", "equipe"] },
    { id: "divulgacao", nome: "Divulgação e transferência", sin: ["plano de divulgacao", "plano de popularizacao", "articulacao e comunicacao", "transferencia de tecnologia", "divulgacao", "comunicacao"] },
    { id: "riscos", nome: "Riscos", sin: ["riscos e mitigacao", "analise de riscos", "riscos"] },
    { id: "publico", nome: "Público-alvo", sin: ["publico-alvo", "publico alvo", "publicos-alvo", "beneficiarios", "usuarios"] },
  ];

  function casar(rotulo) {
    var n = norm(rotulo).replace(/^[\d.\s)-]+/, "");
    if (!n || n.length > 230) return null;
    for (var i = 0; i < CAMPOS.length; i++) {
      for (var j = 0; j < CAMPOS[i].sin.length; j++) {
        if (n.indexOf(CAMPOS[i].sin[j]) === 0) return { campo: CAMPOS[i].id, extra: n.length - CAMPOS[i].sin[j].length };
      }
    }
    return null;
  }
  function campoDe(rotulo) { var c = casar(rotulo); return c ? c.campo : null; }
  /* Uma linha de texto corrido só é tomada como título quando tem forma de título. */
  function tituloReconhecido(t) {
    var c = casar(t);
    if (!c) return null;
    if (!/^[A-ZÀ-Ý0-9]/.test(t)) return null;
    if (pareceTitulo(t)) return c.campo;
    if (t.length < 70 && c.extra <= 25 && !/[.;,]$/.test(t)) return c.campo;
    return null;
  }

  function pareceTitulo(linha) {
    var t = linha.trim().split("(")[0].trim();
    if (t.length < 4 || t.length > 160) return false;
    if (/^[\d.\s]+$/.test(t)) return false;
    var letras = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
    if (letras.length < 4) return false;
    return letras === letras.toUpperCase();
  }

  /* blocos: [{tipo: "p", texto, destaque}] ou [{tipo: "linha", rotulo, texto}] */
  function segmentar(blocos) {
    var secoes = [], atual = null;
    function nova(rotulo, campo, texto) {
      atual = { rotulo: rotulo.trim(), campo: campo, texto: (texto || "").trim(), parens: 0 };
      atual.parens = (atual.rotulo.match(/\(/g) || []).length - (atual.rotulo.match(/\)/g) || []).length;
      secoes.push(atual);
    }
    blocos.forEach(function (b) {
      if (b.tipo === "linha") { nova(b.rotulo, campoDe(b.rotulo), b.texto); atual = null; return; }
      var t = (b.texto || "").trim();
      if (!t) return;
      var m = t.match(/^([A-ZÀ-Ý][^:]{2,45}):\s*(.*)$/);
      if (m && m[1].split(/\s+/).length <= 6) { nova(m[1], campoDe(m[1]), m[2]); return; }
      var c = tituloReconhecido(t);
      if (c) { nova(t, c, ""); return; }
      if (atual && atual.campo === "titulo") { atual.texto += (atual.texto ? " " : "") + t; return; }
      if (atual && !atual.texto && (atual.parens > 0 || /^\(/.test(t) || (pareceTitulo(t) && atual.rotulo.length < 300))) {
        atual.rotulo += " " + t;
        atual.parens += (t.match(/\(/g) || []).length - (t.match(/\)/g) || []).length;
        return;
      }
      if ((b.destaque && t.length < 120) || pareceTitulo(t)) { nova(t, null, ""); return; }
      if (atual) atual.texto += (atual.texto ? "\n" : "") + t;
    });
    return secoes.filter(function (s) { return s.texto.length > 0; }).map(function (s) {
      return { rotulo: s.rotulo.replace(/\s*\([^)]*caracteres\)?\s*$/i, "").replace(/\s*-\s*at[eé] \d+ caracteres$/i, "").trim(), campo: s.campo, texto: s.texto };
    });
  }

  /* Agrupa o texto por campo reconhecido. */
  function porCampo(secoes) {
    var out = {};
    secoes.forEach(function (s) {
      if (!s.campo || s.campo === "ignorar" || !s.texto) return;
      out[s.campo] = (out[s.campo] ? out[s.campo] + "\n\n" : "") + s.texto;
    });
    return out;
  }

  var MAPA_PUBLICOS = [
    [/agricultura familiar|agricultores? familiar/i, ["Agricultores familiares"]],
    [/\bprodutor(es)? rura|cafeicultor|pecuarist|\bprodutores\b/i, ["Agricultores familiares", "Médios e grandes produtores rurais"]],
    [/ind[ií]gena|quilombol|comunidades tradicionais|povos tradicionais/i, ["Povos indígenas e comunidades tradicionais"]],
    [/assentad|reforma agr[aá]ria/i, ["Assentados da reforma agrária"]],
    [/cooperativ|associa[cç][aã]o(es)? de produtores|associa[cç][oõ]es de produtores|associa[cç][aã]o nacional dos produtores/i, ["Cooperativas e associações de produtores"]],
    [/assist[eê]ncia t[eé]cnica|extens[aã]o rural|\bater\b/i, ["Técnicos de assistência técnica e extensão rural"]],
    [/munic[ií]p(io|ios|al|ais)\b|prefeitura|gestores? municipa/i, ["Gestores públicos municipais"]],
    [/secretaria(s)? estadua|governo(s)? estadua|[oó]rg[aã]os? estadua/i, ["Gestores públicos estaduais"]],
    [/minist[eé]rio|governo federal|c[aâ]mara setorial|\bMAPA\b/, ["Gestores públicos federais"]],
    [/pol[ií]ticas? p[uú]blicas?|formula[cç][aã]o de pol[ií]tica|legisla/i, ["Formuladores de políticas e legisladores"]],
    [/fiscaliza|regula[cç][aã]o|[oó]rg[aã]os? reguladores?/i, ["Órgãos de regulação e fiscalização"]],
    [/cr[eé]dito rural|agentes? financeir|institui[cç][oõ]es financeiras|bancos?\b/i, ["Agentes financeiros e de crédito rural"]],
    [/agroind[uú]stri|beneficiamento|processamento/i, ["Agroindústrias e empresas de processamento"]],
    [/insumos|m[aá]quinas agr[ií]colas|setor privado|empresas? priva/i, ["Empresas de insumos, máquinas e serviços"]],
    [/startup|agtech/i, ["Startups e empresas de tecnologia"]],
    [/sociedade civil|\bongs?\b|organiza[cç][oõ]es sociais/i, ["Organizações da sociedade civil"]],
    [/pesquisadores|comunidade cient[ií]fica|institui[cç][oõ]es de pesquisa/i, ["Pesquisadores e instituições de pesquisa"]],
    [/universidade|estudantes|p[oó]s-gradua/i, ["Universidades, professores e estudantes"]],
    [/consumidor/i, ["Consumidores"]],
    [/p[uú]blico (em )?geral|sociedade em geral|p[uú]blico n[aã]o especializado|imprensa|m[ií]dia/i, ["Mídia e público em geral"]],
    [/fao\b|cooper[aç][aã]o internacional|organismos? internaciona/i, ["Organismos internacionais e de cooperação"]]
  ];

  var MAPA_PRODUTOS = [
    [/mapa|mapeamento|base de dados|banco de dados|geoespacia|cartogr/i, "Base de dados ou mapa"],
    [/software|aplicativo|plataforma|sistema web|painel|dashboard/i, "Software, aplicativo ou plataforma"],
    [/monitoramento/i, "Sistema de monitoramento"],
    [/metodologi|m[eé]todo|protocolo/i, "Método ou metodologia"],
    [/cultivar|material gen[eé]tico|melhoramento gen/i, "Cultivar ou material genético"],
    [/publica[cç]|artigo|boletim|livro|cap[ií]tulo|comunicado t[eé]cnico/i, "Publicação técnica ou científica"],
    [/capacita|treinamento|\bcursos?\b|forma[cç][aã]o de/i, "Capacitação ou formação"],
    [/recomenda[cç]|subs[ií]dio(s)? (a|para) pol[ií]tic|nota t[eé]cnica/i, "Recomendação para políticas ou gestão"],
    [/pr[aá]tica agr|sistema de produ[cç]|manejo/i, "Prática ou sistema de produção"],
    [/tecnologia|produto|processo/i, "Tecnologia, produto ou processo"]
  ];

  function sugestoes(secoes, textoCompleto, listas) {
    var pc = porCampo(secoes);
    var tit = secoes.filter(function (s) { return s.campo === "titulo"; })[0];
    var titulo = tit ? (tit.texto || "").split("\n")[0].trim() : "";
    var dur = null;
    function numeros(txt) {
      var out = [], re = /(m[aá]ximo de\s*)?(\d{1,3})\s*meses/gi, mm;
      while ((mm = re.exec(txt))) if (!mm[1]) out.push(parseInt(mm[2], 10));
      return out;
    }
    if (pc.duracao) { var nd = numeros(pc.duracao); if (!nd.length) nd = (pc.duracao.match(/\d{1,3}/g) || []).map(Number); if (nd.length) dur = nd[0]; }
    if (dur === null) { var mm2 = textoCompleto.match(/dura[cç][aã]o\s*\(?\s*meses\s*\)?\s*:?\s*(\d{1,3})/i); if (mm2) dur = parseInt(mm2[1], 10); }
    if (dur === null) { var nn = numeros(textoCompleto); if (nn.length) dur = nn[0]; }
    if (dur !== null && (dur < 1 || dur > 120)) dur = null;

    var baseP = pc.publico ? pc.publico + "\n" + textoCompleto : textoCompleto;
    var relevante = [pc.publico, pc.impactos, pc.resultados, pc.problema].join("\n");
    var cont = {};
    MAPA_PUBLICOS.forEach(function (par) {
      var re = new RegExp(par[0].source, par[0].flags.indexOf("i") >= 0 ? "gi" : "g");
      var n = (baseP.match(re) || []).length;
      if (!n) return;
      if (n < 2 && !par[0].test(relevante)) return;
      par[1].forEach(function (p) { if (listas.publicos.indexOf(p) >= 0) cont[p] = Math.max(cont[p] || 0, n); });
    });
    var publicos = Object.keys(cont).sort(function (a, b) { return cont[b] - cont[a]; });

    var parceiros = [];
    function escRe(x) { return x.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"); }
    function palavra(x, txt, flags) { return new RegExp("(^|[^A-Za-zÀ-ÿ])" + escRe(x) + "([^A-Za-zÀ-ÿ]|$)", flags || "").test(txt); }
    // O nome não conta quando é apenas o início de um nome mais longo ("Instituto Agronômico de Pernambuco").
    function nomeIsolado(x, txt) { return new RegExp("(^|[^A-Za-zÀ-ÿ])" + escRe(x) + "(?!\\s+(de|do|da|dos|das)\\s+[A-ZÀ-Ý])([^A-Za-zÀ-ÿ]|$)", "i").test(txt); }
    var SIGLA_PALAVRA = { "Mapa": 1 };
    var contaSig = {};
    listas.organizacoes.forEach(function (o) { var sg = (o.nome.match(/\(([^)]+)\)\s*$/) || [])[1]; if (sg) contaSig[sg] = (contaSig[sg] || 0) + 1; });
    listas.organizacoes.forEach(function (o) {
      var sig = (o.nome.match(/\(([^)]+)\)\s*$/) || [])[1];
      var alvo = o.nome.replace(/\s*\([^)]*\)\s*$/, "");
      var achou;
      if (o.nome === "Embrapa (Sede)") achou = /embrapa[\s-]+sede|sede da embrapa/i.test(textoCompleto);
      else achou = nomeIsolado(alvo, textoCompleto);
      if (!achou && sig && sig.length >= 3 && contaSig[sig] === 1 && !/\//.test(sig)) achou = SIGLA_PALAVRA[sig] ? palavra(sig.toUpperCase(), textoCompleto) : (palavra(sig, textoCompleto) || palavra(sig.toUpperCase(), textoCompleto));
      if (achou && parceiros.indexOf(o.nome) < 0) parceiros.push(o.nome);
    });
    var linhasParc = pc.parcerias ? pc.parcerias.split(/\n/).filter(function (l) { return l.trim(); }) : [];
    var mediaParc = linhasParc.length ? linhasParc.reduce(function (a, l) { return a + l.length; }, 0) / linhasParc.length : 0;
    // Só aproveita linhas soltas quando a seção tem forma de lista; texto corrido gera fragmentos de frase.
    if (pc.parcerias && mediaParc <= 70) {
      pc.parcerias.split(/\n|;|\s\/\s/).forEach(function (l) {
        l = l.replace(/^[-•\s]+/, "").trim();
        l = l.replace(/\s+Institui[cç][aã]o\s+(Nacional|Internacional|Estrangeira)\b.*$/i, "").trim();
        if (l.length < 3 || l.length > 140 || !/^[A-ZÀ-Ý0-9]/.test(l) || /[,.]$/.test(l) || l.split(/\s+/).length > 14) return;
        if (/^\(|especificar|^nome\b|^tipo\b|^categoria\b|https?:|\bof \d+\b|\d{2}\/\d{2}\/\d{4}|funda[cç][aã]o\s*\(|^embrapa$/i.test(l)) return;
        var jaTem = parceiros.some(function (x) {
          if (x.toLowerCase() === l.toLowerCase()) return true;
          var sg = (x.match(/\(([^)]+)\)\s*$/) || [])[1];
          return sg && sg.length >= 3 && palavra(sg, l);
        });
        if (!jaTem) parceiros.push(l);
      });
    }

    var baseR = (pc.resultados || "") + "\n" + (pc.objetivos || "");
    if (baseR.trim().length < 40) baseR = textoCompleto;
    var produtos = [];
    MAPA_PRODUTOS.forEach(function (par) { if (par[0].test(baseR) && produtos.indexOf(par[1]) < 0) produtos.push(par[1]); });

    return { titulo: titulo, duracao: dur, problema: pc.problema || pc.resumo || "", porCampo: pc, publicos: publicos, parceiros: parceiros.slice(0, 25), produtos: produtos };
  }

  /* ---------- Leitores ---------- */

  function decodificar(s) { return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"); }
  function textoParagrafo(px) {
    var t = "", re = /<w:t[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g, m;
    while ((m = re.exec(px))) t += m[1] !== undefined ? decodificar(m[1]) : (m[0] === "<w:tab/>" ? " " : "\n");
    return t;
  }
  function blocosDocx(xml) {
    var blocos = [];
    var corpo = (xml.match(/<w:body>([\s\S]*)<\/w:body>/) || [])[1] || xml;
    var re = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g, m;
    while ((m = re.exec(corpo))) {
      var x = m[0];
      if (x.indexOf("<w:tbl>") === 0) {
        (x.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).forEach(function (tr) {
          var cel = (tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map(function (tc) {
            return (tc.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map(textoParagrafo).join("\n").trim();
          });
          var uniq = []; cel.forEach(function (c) { if (c && uniq.indexOf(c) < 0) uniq.push(c); });
          if (uniq.length >= 2) blocos.push({ tipo: "linha", rotulo: uniq[0], texto: uniq.slice(1).join("\n") });
          else if (uniq.length === 1) blocos.push({ tipo: "p", texto: uniq[0] });
        });
      } else {
        var t = textoParagrafo(x).trim();
        if (!t) continue;
        var estilo = (x.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || "";
        var runs = x.match(/<w:r[ >][\s\S]*?<\/w:r>/g) || [];
        var negrito = runs.length > 0 && runs.every(function (r) { return !/<w:t/.test(r) || /<w:b\/>|<w:b w:val="(1|true)"\/>/.test(r); });
        blocos.push({ tipo: "p", texto: t, destaque: /heading|t[ií]tulo|title/i.test(estilo) || negrito });
      }
    }
    return blocos;
  }

  function carregarScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = function () { rej(new Error("Falha ao carregar " + src)); }; document.head.appendChild(s); });
  }
  var PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  function obterPdfjs() {
    if (raiz.pdfjsLib) return Promise.resolve(raiz.pdfjsLib);
    return carregarScript(PDFJS + "pdf.min.js").then(function () { return carregarScript(PDFJS + "pdf.worker.min.js"); }).then(function () {
      try { raiz.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js"; } catch (e) {}
      return raiz.pdfjsLib;
    });
  }
  function linhasPdf(lib, buf) {
    return lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise.then(function (doc) {
      var ps = [];
      for (var i = 1; i <= doc.numPages; i++) ps.push(doc.getPage(i).then(function (pg) { return pg.getTextContent(); }));
      return Promise.all(ps);
    }).then(function (conteudos) {
      var linhas = [];
      conteudos.forEach(function (tc) {
        var atual = "", y = null;
        tc.items.forEach(function (it) {
          var yy = it.transform ? Math.round(it.transform[5]) : y;
          if (y !== null && yy !== null && Math.abs(yy - y) > 2 && atual.trim()) { linhas.push(atual); atual = ""; }
          atual += it.str; y = yy;
          if (it.hasEOL) { if (atual.trim()) linhas.push(atual); atual = ""; }
        });
        if (atual.trim()) linhas.push(atual);
      });
      return linhas;
    });
  }

  function lerArquivo(file) {
    var nome = (file.name || "").toLowerCase();
    return file.arrayBuffer().then(function (buf) {
      if (/\.docx$/.test(nome)) {
        if (typeof JSZip === "undefined") throw new Error("Leitor de arquivos Word indisponível neste ambiente.");
        return JSZip.loadAsync(buf).then(function (z) { var f = z.file("word/document.xml"); if (!f) throw new Error("O arquivo não parece ser um documento Word válido."); return f.async("string"); })
          .then(function (xml) { var b = blocosDocx(xml); return { blocos: b, texto: b.map(function (x) { return (x.rotulo ? x.rotulo + "\n" : "") + x.texto; }).join("\n") }; });
      }
      if (/\.pdf$/.test(nome)) {
        return obterPdfjs().then(function (lib) { return linhasPdf(lib, buf); }).then(function (ls) { return { blocos: ls.map(function (l) { return { tipo: "p", texto: l }; }), texto: ls.join("\n") }; });
      }
      if (/\.(txt|md)$/.test(nome)) {
        var t = new TextDecoder("utf-8").decode(buf);
        var ls = t.split(/\r?\n/);
        return { blocos: ls.map(function (l) { return { tipo: "p", texto: l }; }), texto: t };
      }
      throw new Error("Formato não reconhecido. Use arquivos .docx, .pdf ou .txt.");
    });
  }

  function naoReconhecidas(secoes) {
    var vistos = {}, out = [];
    secoes.forEach(function (s) {
      if (s.campo || s.texto.length < 80) return;
      var k = norm(s.rotulo);
      if (vistos[k]) return;
      vistos[k] = 1; out.push(s);
    });
    return out.slice(0, 15);
  }

  var API = { naoReconhecidas: naoReconhecidas, CAMPOS: CAMPOS, campoDe: campoDe, segmentar: segmentar, porCampo: porCampo, sugestoes: sugestoes, blocosDocx: blocosDocx, lerArquivo: lerArquivo, linhasPdf: linhasPdf, norm: norm };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else raiz.TerImportar = API;
})(typeof window !== "undefined" ? window : globalThis);
