/**
 * Landim Advisory — tradução do site e do painel (português, inglês e espanhol).
 * Os textos são traduzidos no próprio navegador com os dicionários desta pasta (en.js, es.js):
 * nada da tela é enviado a serviços de tradução de terceiros.
 * - A língua escolhida fica em localStorage ("la_lingua"); sem escolha, segue a língua do navegador.
 * - Cada texto da tela é procurado no dicionário; números, valores e datas viram {0}, {1}… para
 *   frases como "Você tem 3 empresas" usarem um modelo só.
 * - Textos que mudam depois (o painel redesenha as telas o tempo todo) são traduzidos na hora,
 *   por um MutationObserver.
 */
(function () {
  'use strict';
  if (window.laIdioma) return;
  var LINGUAS = { pt: 'Português', en: 'English', es: 'Español' };
  var HTML_LANG = { pt: 'pt-BR', en: 'en', es: 'es' };
  var CHAVE = 'la_lingua';

  function escolhida() {
    var l = '';
    try { l = localStorage.getItem(CHAVE) || ''; } catch (e) { /* sem armazenamento */ }
    try { var q = new URLSearchParams(location.search).get('lang'); if (q && LINGUAS[q]) { l = q; try { localStorage.setItem(CHAVE, q); } catch (e) { } } } catch (e) { }
    if (LINGUAS[l]) return l;
    var nav = String((navigator.languages && navigator.languages[0]) || navigator.language || 'pt').toLowerCase();
    if (nav.indexOf('pt') === 0) return 'pt';
    if (nav.indexOf('es') === 0) return 'es';
    if (nav.indexOf('en') === 0) return 'en';
    return 'pt';
  }

  var lingua = escolhida();
  var dic = null;          // { 'texto em português': 'tradução' }
  var modelos = null;      // chaves com {0}
  var originais = new WeakMap(); // nó de texto -> { o: original, t: traduzido }
  var attrsOrig = new WeakMap(); // elemento -> { atributo: { o, t } }
  var faltando = window.__laFaltando = new Map();
  var registrarFaltas = false;
  try { registrarFaltas = localStorage.getItem('la_faltando') === '1'; } catch (e) { }

  // ---------- busca no dicionário ----------
  var RE_VALOR = /R\$\s?-?\s?\d[\d.]*(?:,\d+)?|US\$\s?\d[\d.,]*|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}h\d{0,2}|[-+−]?\d+(?:[.,]\d+)*(?:\s?%)?/g;
  function normalizar(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function traduzirParte(p) {
    if (dic[p] != null) return dic[p];
    var vals = [];
    var mod = p.replace(RE_VALOR, function (v) { vals.push(v); return '{' + (vals.length - 1) + '}'; });
    if (vals.length && dic[mod] != null) return dic[mod].replace(/\{(\d+)\}/g, function (_, i) { return vals[+i] != null ? vals[+i] : ''; });
    return datas(p);
  }
  function traduzir(texto) {
    if (!dic) return null;
    var chave = normalizar(texto);
    if (!chave || !/[A-Za-zÀ-ÿ]/.test(chave)) return null;
    var t = dic[chave];
    if (t != null) return t;
    // sem pontuação final ("Salvar:" / "Salvar." / "Salvar…")
    var m = /^(.*?)([:.…!?]+)$/.exec(chave);
    if (m && dic[m[1]] != null) return dic[m[1]] + m[2];
    // modelo com números, valores e datas
    var vals = [];
    var mod = chave.replace(RE_VALOR, function (v) { vals.push(v); return '{' + (vals.length - 1) + '}'; });
    if (vals.length && dic[mod] != null) return dic[mod].replace(/\{(\d+)\}/g, function (_, i) { return vals[+i] != null ? vals[+i] : ''; });
    var dt = datas(chave);
    if (dt != null) return dt;
    // partes separadas por " · " (ex.: "Fornecedor · Categoria"): traduz o que der de cada parte
    if (chave.indexOf(' · ') > 0) {
      var partes = chave.split(' · '), mudou = false;
      var trad = partes.map(function (pp) { var r = pp && /[A-Za-zÀ-ÿ]/.test(pp) ? traduzirParte(pp) : null; if (r != null) { mudou = true; return r; } return pp; });
      if (mudou) return trad.join(' · ');
    }
    if (registrarFaltas && chave.length < 400) faltando.set(vals.length ? mod : chave, (faltando.get(vals.length ? mod : chave) || 0) + 1);
    return null;
  }
  // Datas escritas em português ("terça-feira, 27 de outubro", "27 de out. 14:20", "out/26")
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var MESES_AB = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var M_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var M_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = { 'segunda-feira': ['Monday', 'lunes'], 'terça-feira': ['Tuesday', 'martes'], 'quarta-feira': ['Wednesday', 'miércoles'], 'quinta-feira': ['Thursday', 'jueves'], 'sexta-feira': ['Friday', 'viernes'], 'sábado': ['Saturday', 'sábado'], 'domingo': ['Sunday', 'domingo'] };
  var DIAS_AB = { 'seg.': ['Mon', 'lun.'], 'ter.': ['Tue', 'mar.'], 'qua.': ['Wed', 'mié.'], 'qui.': ['Thu', 'jue.'], 'sex.': ['Fri', 'vie.'], 'sáb.': ['Sat', 'sáb.'], 'dom.': ['Sun', 'dom.'] };
  var RE_DATA = /(\d{1,2}) de (janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan\.?|fev\.?|mar\.?|abr\.?|mai\.?|jun\.?|jul\.?|ago\.?|set\.?|out\.?|nov\.?|dez\.?)(?: de (\d{4}))?/gi;
  function mesIdx(m) { m = m.toLowerCase().replace('.', ''); var i = MESES.indexOf(m); return i >= 0 ? i : MESES_AB.indexOf(m.slice(0, 3)); }
  function datas(t) {
    if (!/(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|\b(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b|-feira|sábado|domingo|\b(?:seg|ter|qua|qui|sex|sáb|dom)\.)/i.test(t)) return null;
    var en = lingua === 'en', r = t;
    r = r.replace(/(segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|domingo)/gi, function (w) { var d = DIAS[w.toLowerCase()]; return d ? d[en ? 0 : 1] : w; });
    r = r.replace(/\b(seg|ter|qua|qui|sex|sáb|dom)\./gi, function (w) { var d = DIAS_AB[w.toLowerCase()]; return d ? d[en ? 0 : 1] : w; });
    r = r.replace(RE_DATA, function (all, dia, mes, ano) {
      var i = mesIdx(mes); if (i < 0) return all;
      var curto = mes.length <= 4;
      var nome = en ? (curto ? M_EN[i].slice(0, 3) : M_EN[i]) : (curto ? M_ES[i].slice(0, 3) + '.' : M_ES[i]);
      if (en) return nome + ' ' + dia + (ano ? ', ' + ano : '');
      return dia + ' de ' + nome + (ano ? ' de ' + ano : '');
    });
    r = r.replace(/\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (\d{4})/gi, function (all, mes, ano) { var i = mesIdx(mes); return en ? M_EN[i] + ' ' + ano : M_ES[i] + ' de ' + ano; });
    r = r.replace(/\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/(\d{2,4})\b/gi, function (all, mes, ano) { var i = mesIdx(mes); return (en ? M_EN[i].slice(0, 3) : M_ES[i].slice(0, 3)) + '/' + ano; });
    r = r.replace(/\(demonstração\)/g, en ? '(demo)' : '(demostración)');
    return r !== t ? r : null;
  }
  function comEspacos(orig, trad) {
    var ini = /^\s*/.exec(orig)[0], fim = /\s*$/.exec(orig)[0];
    return ini + trad + fim;
  }

  // ---------- aplicar no DOM ----------
  var PULAR = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1, SVG: 1, svg: 1, TEMPLATE: 1, IFRAME: 1, CANVAS: 1 };
  function pularElemento(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentNode) {
      if (PULAR[e.nodeName]) return true;
      if (e.isContentEditable) return true;
      if (e.hasAttribute && (e.hasAttribute('data-sem-traducao') || e.getAttribute('translate') === 'no')) return true;
    }
    return false;
  }
  function textoNo(n) {
    var reg = originais.get(n);
    var atual = n.nodeValue;
    if (reg && atual === reg.t) return; // já traduzido
    var orig = atual;
    if (!/[A-Za-zÀ-ÿ]/.test(orig)) return;
    if (n.parentNode && pularElemento(n.parentNode)) return;
    var t = traduzir(orig);
    if (t == null) { originais.set(n, { o: orig, t: orig }); return; }
    var novo = comEspacos(orig, t);
    originais.set(n, { o: orig, t: novo });
    if (novo !== atual) n.nodeValue = novo;
  }
  var ATRIBUTOS = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip'];
  function atributosEl(el) {
    if (pularElemento(el)) return;
    var reg = attrsOrig.get(el) || {};
    for (var i = 0; i < ATRIBUTOS.length; i++) {
      var a = ATRIBUTOS[i];
      if (!el.hasAttribute(a)) continue;
      var v = el.getAttribute(a);
      if (reg[a] && reg[a].t === v) continue;
      var t = traduzir(v);
      reg[a] = { o: v, t: t == null ? v : t };
      if (t != null && t !== v) el.setAttribute(a, t);
    }
    if (el.nodeName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && el.value) {
      var r = reg.value;
      if (!(r && r.t === el.value)) { var tv = traduzir(el.value); reg.value = { o: el.value, t: tv == null ? el.value : tv }; if (tv != null) el.value = tv; }
    }
    attrsOrig.set(el, reg);
  }
  function percorrer(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { textoNo(raiz); return; }
    if (raiz.nodeType !== 1 && raiz.nodeType !== 11) return;
    if (raiz.nodeType === 1) { if (PULAR[raiz.nodeName]) return; atributosEl(raiz); }
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.nodeType === 1 && PULAR[n.nodeName] ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; },
    });
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) textoNo(n); else atributosEl(n); }
  }
  var tituloOrig = null;
  function titulo() {
    var t = document.title;
    if (tituloOrig && tituloOrig.t === t) return;
    var tr = traduzir(t);
    tituloOrig = { o: t, t: tr == null ? t : tr };
    if (tr != null && tr !== t) document.title = tr;
  }

  var observador = null;
  function observar() {
    if (observador || !document.body) return;
    observador = new MutationObserver(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var m = lista[i];
        if (m.type === 'characterData') textoNo(m.target);
        else if (m.type === 'attributes') atributosEl(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) percorrer(m.addedNodes[j]);
      }
      titulo();
    });
    observador.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS.concat(['value']) });
    var head = document.querySelector('title');
    if (head) new MutationObserver(titulo).observe(head, { childList: true, characterData: true, subtree: true });
  }

  // Janelas do navegador (confirm, alert, prompt) também em outra língua
  function caixas() {
    ['alert', 'confirm', 'prompt'].forEach(function (f) {
      var orig = window[f];
      if (!orig || orig.__la) return;
      var nova = function (msg) {
        var args = Array.prototype.slice.call(arguments);
        if (typeof msg === 'string' && dic) args[0] = msg.split('\n').map(function (l) { var t = traduzir(l); return t == null ? l : comEspacos(l, t); }).join('\n');
        return orig.apply(window, args);
      };
      nova.__la = true;
      window[f] = nova;
    });
  }

  // ---------- início ----------
  var pronto = false, hidratado = false;
  function mostrar() { document.documentElement.classList.remove('la-traduzindo'); }
  function aplicar() {
    if (pronto || !dic || !hidratado || !document.body) return;
    pronto = true;
    percorrer(document.body);
    titulo();
    observar();
    caixas();
    mostrar();
  }
  function carregarDic() {
    if (lingua === 'pt') return;
    var d = window.LA_DIC && window.LA_DIC[lingua];
    if (d) { dic = d; aplicar(); return; }
    var s = document.createElement('script');
    s.src = '/i18n/' + lingua + '.js?v=' + (window.LA_I18N_VERSAO || '');
    s.onload = function () { dic = (window.LA_DIC && window.LA_DIC[lingua]) || {}; aplicar(); };
    s.onerror = function () { mostrar(); };
    document.head.appendChild(s);
  }

  document.documentElement.lang = HTML_LANG[lingua];
  if (lingua !== 'pt') {
    document.documentElement.classList.add('la-traduzindo');
    setTimeout(mostrar, 2500); // nunca deixa a tela escondida
    carregarDic();
  }

  window.laIdioma = {
    LINGUAS: LINGUAS,
    atual: function () { return lingua; },
    // chamado quando o React termina de montar a página (evita conflito com a hidratação)
    hidratou: function () { hidratado = true; aplicar(); },
    trocar: function (l) {
      if (!LINGUAS[l]) return;
      try { localStorage.setItem(CHAVE, l); } catch (e) { }
      try { var u = new URL(location.href); if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); history.replaceState(null, '', u); } } catch (e) { }
      location.reload();
    },
    // para textos montados em JavaScript que não vão para a tela (ex.: nome de arquivo)
    t: function (s) { if (lingua === 'pt' || !dic) return s; var r = traduzir(s); return r == null ? s : comEspacos(s, r); },
    faltando: function () { return Array.from(faltando.keys()); },
  };
  // páginas sem React (painel antigo, testes) avisam sozinhas quando o documento termina de carregar
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { if (!window.__laEsperaReact) window.laIdioma.hidratou(); });
  else if (!window.__laEsperaReact) setTimeout(function () { window.laIdioma.hidratou(); }, 0);
})();
