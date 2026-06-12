const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => res.send("Motor PDF Problema Cero v5.0"));

function limpiarTexto(t) {
  if (!t) return "";
  return t.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─────────────────────────────────────────────
// LOGO SVG INLINE
// ─────────────────────────────────────────────
const LOGO_SVG = `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:56px;height:56px;display:block;">
  <circle cx="28" cy="30" r="16" stroke="white" stroke-width="3" fill="none"/>
  <line x1="28" y1="14" x2="28" y2="10" stroke="white" stroke-width="3" stroke-linecap="round"/>
  <path d="M28 30 L44 18" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
  <circle cx="28" cy="30" r="3" fill="white"/>
  <polygon points="42,10 50,6 46,14" fill="white"/>
</svg>`;

// ─────────────────────────────────────────────
// PARSER: extrae secciones estructuradas
// ─────────────────────────────────────────────
function parsear(texto) {
  const resultado = {
    mapaEjecutivo: [], prioridad: "", dejarDeHacer: [],
    corregirPrimero: [], dias7: [], semanas30: [],
    contenido: [], mensajesVenta: [], metricas: [],
    siEntonces: [], cierre: "",
    // diagnóstico
    resumenRapido: [], problemaPrincipal: [], queSig: [],
    causaReal: [], accionConcreta: [], impacto: [], cierreDiag: "",
    ctaDiag: ""
  };

  const lineas = texto.split("\n").map(l => l.trim()).filter(Boolean);
  let sec = null;
  let ideaActual = null;
  let metricaActual = null;

  const TITULOS = /^(?:[🧭🎯🛑🔧📅📆📌💬📊⚠️🧠⚡🔴🚀💰🔥👉⚠]\s*)?(MAPA EJECUTIVO|PRIORIDAD ABSOLUTA|QUÉ DEJAR DE HACER YA|QUÉ CORREGIR PRIMERO|PLAN DE ACCIÓN[^a-z]*|CONTENIDO QUE DEBERÍA CREAR|MENSAJES DE VENTA[^a-z]*|MÉTRICA QUE DEBERÍA MIRAR|SI \/ ENTONCES|CIERRE ESTRATÉGICO|RESUMEN RÁPIDO|PROBLEMA PRINCIPAL|QUÉ SIGNIFICA|CAUSA REAL|ACCIÓN CONCRETA|IMPACTO|CIERRE|ANÁLISIS COMPLETO)$/i;

  const prefijosIgnorar = ["CASO DEL CLIENTE:","EL NEGOCIO:","EL PROBLEMA ELEGIDO","LAS BASES DEL NEGOCIO:","ANÁLISIS INICIAL:","ANÁLISIS ESTRATÉGICO:","CASO ORIGINAL:","FEEDBACK DEL USUARIO:","Aquí tienes el análisis"];
  let contenidoEmpezado = false;
  let saltarLinea = false;

  for (const linea of lineas) {
    const limpia = linea.replace(/^[-—•*]\s*/, "").trim();

    if (prefijosIgnorar.some(p => linea.startsWith(p))) { saltarLinea = true; continue; }

    const mTit = linea.match(TITULOS);
    if (mTit) { contenidoEmpezado = true; saltarLinea = false; }
    if (saltarLinea && !contenidoEmpezado) continue;
    if (!contenidoEmpezado && linea.length < 80 && !mTit) continue;
    if (!limpia) continue;

    if (mTit) {
      const t = mTit[1].toUpperCase();
      if (t.includes("MAPA EJECUTIVO"))          sec = "mapaEjecutivo";
      else if (t.includes("PRIORIDAD ABSOLUTA")) sec = "prioridad";
      else if (t.includes("DEJAR DE HACER"))     sec = "dejarDeHacer";
      else if (t.includes("CORREGIR PRIMERO"))   sec = "corregirPrimero";
      else if (t.includes("PLAN DE ACCIÓN") && !t.includes("30")) sec = "dias7";
      else if (t.includes("30") || t.includes("SEMANAS"))         sec = "semanas30";
      else if (t.includes("CONTENIDO"))          sec = "contenido";
      else if (t.includes("MENSAJES DE VENTA"))  sec = "mensajesVenta";
      else if (t.includes("MÉTRICA"))            sec = "metricas";
      else if (t.includes("SI / ENTONCES") || t.includes("SI/ENTONCES")) sec = "siEntonces";
      else if (t.includes("CIERRE ESTRATÉGICO")) sec = "cierre";
      else if (t.includes("RESUMEN"))            sec = "resumenRapido";
      else if (t.includes("PROBLEMA PRINCIPAL")) sec = "problemaPrincipal";
      else if (t.includes("QUÉ SIGNIFICA"))      sec = "queSig";
      else if (t.includes("CAUSA REAL"))         sec = "causaReal";
      else if (t.includes("ACCIÓN CONCRETA"))    sec = "accionConcreta";
      else if (t.includes("IMPACTO"))            sec = "impacto";
      else if (t.includes("CIERRE"))             sec = "cierreDiag";
      else if (t.includes("ANÁLISIS COMPLETO"))  sec = "mapaEjecutivo";
      continue;
    }

    if (!sec || !limpia) continue;

    // Secciones simples de diagnóstico
    if (["resumenRapido","problemaPrincipal","queSig","causaReal","accionConcreta","impacto"].includes(sec)) {
      resultado[sec].push(limpia); continue;
    }
    if (sec === "cierreDiag") { resultado.cierreDiag += (resultado.cierreDiag ? " " : "") + limpia; continue; }

    // Plan
    switch (sec) {
      case "mapaEjecutivo":   resultado.mapaEjecutivo.push(limpia); break;
      case "prioridad":       resultado.prioridad += (resultado.prioridad ? " " : "") + limpia; break;
      case "dejarDeHacer":    resultado.dejarDeHacer.push(limpia); break;
      case "corregirPrimero": resultado.corregirPrimero.push(limpia); break;
      case "dias7": {
        const m = limpia.match(/(?:\*\*)?D[ií]a\s*(\d+)[:\*\s]*/i);
        if (m) resultado.dias7.push({ numero: m[1], texto: limpia.replace(/(?:\*\*)?D[ií]a\s*\d+[:\*\s]*/i,"").replace(/\*\*/g,"").trim() });
        break;
      }
      case "semanas30": {
        const m = limpia.match(/(?:\*\*)?Semana\s*(\d+)[:\*\s]*/i);
        if (m) resultado.semanas30.push({ numero: m[1], texto: limpia.replace(/(?:\*\*)?Semana\s*\d+[:\*\s]*/i,"").replace(/\*\*/g,"").trim() });
        break;
      }
      case "contenido": {
        const mIdea = limpia.match(/^(?:Idea\s*)?(\d+)\s*[:\-]?\s*$/i);
        const mG = limpia.match(/^(?:\*\*)?Gancho[:\*\s]*(.*)/i);
        const mT = limpia.match(/^(?:\*\*)?Tema[:\*\s]*(.*)/i);
        const mO = limpia.match(/^(?:\*\*)?Objetivo[:\*\s]*(.*)/i);
        if (mIdea) { ideaActual = { numero: mIdea[1], gancho:"", tema:"", objetivo:"" }; resultado.contenido.push(ideaActual); }
        else if (mG && ideaActual) ideaActual.gancho   = mG[1].replace(/\*\*/g,"").trim();
        else if (mT && ideaActual) ideaActual.tema      = mT[1].replace(/\*\*/g,"").trim();
        else if (mO && ideaActual) ideaActual.objetivo  = mO[1].replace(/\*\*/g,"").trim();
        break;
      }
      case "mensajesVenta": resultado.mensajesVenta.push(limpia.replace(/^[""]|[""]$/g,"").trim()); break;
      case "metricas": {
        const mQ = limpia.match(/^(?:\*\*)?Qu[eé] mirar[:\*\s]*(.*)/i);
        const mP = limpia.match(/^(?:\*\*)?Por qu[eé] importa[:\*\s]*(.*)/i);
        const mD = limpia.match(/^(?:\*\*)?Qu[eé] decisi[oó]n[:\*\s]*(.*)/i);
        if (mQ) { metricaActual = { que: mQ[1].replace(/\*\*/g,"").trim(), porQue:"", decision:"" }; resultado.metricas.push(metricaActual); }
        else if (mP && metricaActual) metricaActual.porQue   = mP[1].replace(/\*\*/g,"").trim();
        else if (mD && metricaActual) metricaActual.decision = mD[1].replace(/\*\*/g,"").trim();
        break;
      }
      case "siEntonces": {
        const m = limpia.match(/^(?:\*\*)?Si\b(.*?)(?:,\s*|\s+)(?:\*\*)?entonces\b(.*)/i);
        if (m) resultado.siEntonces.push({ condicion: m[1].replace(/\*\*/g,"").trim(), accion: m[2].replace(/\*\*/g,"").trim() });
        break;
      }
      case "cierre": resultado.cierre += (resultado.cierre ? " " : "") + limpia; break;
    }
  }
  return resultado;
}

// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Inter','Helvetica Neue',Arial,sans-serif;background:#fff;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact;}

  /* CARÁTULA */
  .portada{
    width:794px;height:1123px;
    background:#0a0a0a;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    text-align:center;padding:80px;
    page-break-after:always;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
  .portada-logo{
    width:96px;height:96px;
    border:2px solid #222;border-radius:10px;
    display:flex;align-items:center;justify-content:center;
    margin-bottom:36px;
  }
  .portada-marca{
    font-size:26px;font-weight:900;letter-spacing:7px;
    color:#fff;margin-bottom:8px;
  }
  .portada-marca span{color:#dc2626;}
  .portada-sub{
    font-size:10px;letter-spacing:4px;color:#666;
    text-transform:uppercase;margin-bottom:4px;
  }
  .portada-tipo{
    font-size:9px;letter-spacing:6px;color:#444;
    text-transform:uppercase;margin-bottom:60px;
  }
  .portada-t1{font-size:68px;font-weight:200;color:#fff;line-height:1.05;}
  .portada-t2{font-size:68px;font-weight:900;color:#dc2626;line-height:1.05;margin-bottom:44px;}
  .portada-linea{width:100%;height:1px;background:#222;margin-bottom:32px;}
  .portada-desc{
    font-size:16px;font-weight:300;color:#888;
    line-height:1.75;max-width:480px;margin-bottom:40px;
  }
  .portada-firma-label{font-size:9px;letter-spacing:4px;color:#444;text-transform:uppercase;margin-bottom:6px;}
  .portada-firma{font-size:17px;font-weight:500;color:#fff;}

  /* PÁGINA DE CONTENIDO */
  .pagina{
    width:794px;min-height:1123px;
    padding:72px 80px 100px 80px;
    background:#fff;
    position:relative;
    page-break-after:always;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
  .pagina:last-child{page-break-after:avoid;}

  /* PIE */
  .pie{
    position:absolute;bottom:28px;left:80px;right:80px;
    display:flex;justify-content:space-between;align-items:center;
    border-top:1px solid #e5e7eb;padding-top:12px;
  }
  .pie span{font-size:9px;font-weight:700;letter-spacing:3px;color:#bbb;text-transform:uppercase;}

  /* HEADER DE SECCIÓN */
  .sec-kicker{
    font-size:10px;font-weight:700;letter-spacing:4px;
    color:#dc2626;text-transform:uppercase;margin-bottom:10px;
  }
  .sec-titulo{
    font-size:38px;font-weight:800;color:#111;
    line-height:1.05;margin-bottom:10px;
  }
  .sec-linea{width:56px;height:5px;background:#dc2626;margin-bottom:38px;}

  /* TEXTO BASE */
  .parrafo{font-size:21px;font-weight:400;color:#111;line-height:1.8;margin-bottom:20px;}
  .parrafo strong{font-weight:700;color:#000;}

  /* BULLET SIMPLE */
  .bullet-item{
    display:flex;gap:14px;align-items:flex-start;
    margin-bottom:16px;padding-bottom:16px;
    border-bottom:1px solid #f0f0f0;
  }
  .bullet-item:last-child{border-bottom:none;}
  .bullet-guion{
    font-size:20px;font-weight:700;color:#dc2626;
    flex-shrink:0;margin-top:1px;line-height:1.8;
  }
  .bullet-texto{font-size:21px;font-weight:400;color:#111;line-height:1.8;}

  /* BLOQUE DESTACADO */
  .bloque-negro{
    background:#0a0a0a;border-left:6px solid #dc2626;
    padding:26px 30px;border-radius:4px;margin-bottom:20px;
  }
  .bloque-negro p{font-size:21px;font-weight:400;color:#fff;line-height:1.8;margin:0;}

  /* ── LÍNEA DE TIEMPO 7 DÍAS ── */
  .timeline{position:relative;padding-left:86px;margin-top:4px;}
  .timeline-rail{
    position:absolute;left:28px;top:12px;bottom:12px;
    width:4px;background:linear-gradient(to bottom,#dc2626,#222);
    border-radius:2px;
  }
  .tl-item{position:relative;margin-bottom:14px;min-height:64px;display:flex;align-items:center;}
  .tl-nodo{
    position:absolute;left:-86px;
    width:64px;height:64px;
    background:#dc2626;border-radius:50%;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    box-shadow:0 4px 16px rgba(220,38,38,.4);
  }
  .tl-nodo-label{font-size:8px;letter-spacing:2px;color:rgba(255,255,255,.65);text-transform:uppercase;}
  .tl-nodo-num{font-size:24px;font-weight:900;color:#fff;line-height:1;}
  .tl-card{
    background:#fafafa;border:1px solid #e8e8e8;
    border-left:4px solid #dc2626;
    border-radius:0 6px 6px 0;
    padding:16px 20px;flex:1;
    display:flex;align-items:center;
  }
  .tl-texto{font-size:20px;font-weight:400;color:#111;line-height:1.5;}

  /* ── GRILLA SEMANAS 2x2 ── */
  .semanas-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:4px;}
  .sem-card{border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;}
  .sem-header{padding:16px 18px;display:flex;align-items:center;gap:10px;}
  .sem-num-bg{font-size:48px;font-weight:900;color:rgba(255,255,255,.12);line-height:1;}
  .sem-header-info{display:flex;flex-direction:column;}
  .sem-label{font-size:8px;letter-spacing:3px;color:rgba(255,255,255,.4);text-transform:uppercase;}
  .sem-objetivo{font-size:12px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px;margin-top:2px;}
  .sem-body{padding:14px 18px;background:#fafafa;}
  .sem-accion-label{font-size:8px;font-weight:700;letter-spacing:2px;color:#dc2626;text-transform:uppercase;margin-bottom:6px;}
  .sem-accion-texto{font-size:16px;font-weight:400;color:#111;line-height:1.55;}

  /* ── TARJETAS DE CONTENIDO ── */
  .idea-card{display:flex;border-radius:8px;overflow:hidden;margin-bottom:14px;min-height:92px;}
  .idea-lateral{width:68px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
  .idea-lateral-label{font-size:8px;letter-spacing:2px;color:rgba(255,255,255,.4);text-transform:uppercase;}
  .idea-lateral-num{font-size:34px;font-weight:900;color:#fff;line-height:1;}
  .idea-cuerpo{flex:1;border:1px solid #e0e0e0;border-left:none;border-radius:0 8px 8px 0;}
  .idea-gancho-box{background:#f0f0f0;padding:12px 18px;border-bottom:1px solid #e0e0e0;}
  .idea-gancho-label{font-size:8px;font-weight:700;letter-spacing:3px;color:#dc2626;text-transform:uppercase;margin-bottom:4px;}
  .idea-gancho{font-size:17px;font-weight:700;color:#111;font-style:italic;line-height:1.4;}
  .idea-meta{display:flex;gap:0;padding:10px 18px;background:#fafafa;}
  .idea-meta-col{flex:1;}
  .idea-meta-label{font-size:8px;font-weight:700;letter-spacing:2px;color:#999;text-transform:uppercase;margin-bottom:3px;}
  .idea-meta-val{font-size:14px;color:#111;line-height:1.45;}

  /* ── MÉTRICAS ── */
  .metrica-item{
    background:#f4f4f4;border-left:5px solid #dc2626;
    padding:20px 24px;border-radius:0 6px 6px 0;margin-bottom:14px;
  }
  .metrica-header{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
  .metrica-badge{
    width:30px;height:30px;background:#dc2626;border-radius:50%;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
  }
  .metrica-badge span{font-size:14px;font-weight:800;color:#fff;}
  .metrica-titulo{font-size:20px;font-weight:700;color:#111;}
  .metrica-fila{font-size:17px;color:#444;line-height:1.55;margin-bottom:4px;}
  .metrica-fila strong{color:#111;font-weight:700;}

  /* ── SI / ENTONCES ── */
  .se-bloque{margin-bottom:18px;}
  .se-etiqueta{font-size:9px;font-weight:700;letter-spacing:3px;color:#ccc;text-transform:uppercase;margin-bottom:6px;}
  .se-flujo{display:flex;align-items:stretch;}
  .se-si{
    flex:1;background:#f4f4f4;border:2px solid #e0e0e0;
    border-right:none;border-radius:8px 0 0 8px;padding:16px 18px;
  }
  .se-si-label{font-size:9px;font-weight:700;letter-spacing:3px;color:#aaa;text-transform:uppercase;margin-bottom:6px;}
  .se-si-texto{font-size:18px;font-weight:500;color:#111;line-height:1.5;}
  .se-conector{
    background:#dc2626;width:52px;flex-shrink:0;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:5px;
  }
  .se-conector-label{font-size:7px;letter-spacing:1px;color:rgba(255,255,255,.55);text-transform:uppercase;}
  .se-entonces{
    flex:1;background:#0a0a0a;border:2px solid #0a0a0a;
    border-left:none;border-radius:0 8px 8px 0;padding:16px 18px;
  }
  .se-entonces-label{font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,.35);text-transform:uppercase;margin-bottom:6px;}
  .se-entonces-texto{font-size:18px;font-weight:500;color:#fff;line-height:1.5;}

  /* ── MENSAJES DE VENTA ── */
  .msj-card{
    position:relative;padding:30px 34px 28px;
    border-radius:8px;margin-bottom:16px;
  }
  .msj-claro{background:#fafafa;border:1px solid #e0e0e0;}
  .msj-oscuro{background:#0a0a0a;border:1px solid #0a0a0a;}
  .msj-comilla{
    position:absolute;top:6px;left:18px;
    font-size:88px;font-weight:900;color:#dc2626;
    opacity:.16;line-height:1;font-family:Georgia,serif;
  }
  .msj-num{
    position:absolute;top:14px;right:18px;
    font-size:11px;font-weight:700;letter-spacing:2px;
  }
  .msj-num-claro{color:#ccc;}
  .msj-num-oscuro{color:#444;}
  .msj-texto{
    font-size:21px;font-weight:500;line-height:1.72;
    font-style:italic;position:relative;z-index:1;padding-left:8px;
  }
  .msj-texto-claro{color:#111;}
  .msj-texto-oscuro{color:#fff;}

  /* ── CIERRE ── */
  .cierre-box{
    background:#0a0a0a;padding:38px 42px;border-radius:8px;
    position:relative;overflow:hidden;margin-top:8px;
  }
  .cierre-deco1{position:absolute;right:-24px;bottom:-24px;width:200px;height:200px;border:3px solid rgba(220,38,38,.15);border-radius:50%;}
  .cierre-deco2{position:absolute;right:20px;bottom:20px;width:110px;height:110px;border:3px solid rgba(220,38,38,.1);border-radius:50%;}
  .cierre-texto{font-size:22px;font-weight:400;color:#fff;line-height:1.85;position:relative;z-index:1;}

  /* ── CTA DIAGNÓSTICO ── */
  .cta-diag-wrap{display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:80vh;}
  .cta-diag-box{
    background:#0a0a0a;color:#fff;
    border:1px solid #1f2937;padding:54px;
    width:100%;text-align:center;border-radius:6px;
  }
  .cta-diag-titulo{
    color:#fff;font-size:22px;text-transform:uppercase;
    border-bottom:2px solid #dc2626;padding-bottom:16px;
    margin-bottom:22px;letter-spacing:2px;font-weight:700;
  }
  .cta-diag-texto{color:#e5e7eb;font-size:19px;line-height:1.8;margin-bottom:14px;font-weight:300;}
  .cta-diag-list{list-style:none;margin:14px 0 24px;}
  .cta-diag-list li{
    font-size:18px;color:#d1d5db;font-weight:300;
    margin-bottom:8px;position:relative;padding-left:22px;text-align:left;
    display:inline-block;
  }
  .cta-diag-list li::before{content:"—";color:#dc2626;position:absolute;left:0;}
  .cta-diag-btn{
    display:inline-block;background:#dc2626;color:#fff;
    font-size:13px;font-weight:700;letter-spacing:2px;
    padding:14px 36px;border-radius:4px;text-transform:uppercase;
    text-decoration:none;
  }
`;

// ─────────────────────────────────────────────
// COMPONENTES HTML
// ─────────────────────────────────────────────
function e(s){ return limpiarTexto(String(s||"")); }

function portada(t1, t2, desc, tipo, pg) {
  return `<div class="portada">
    <div class="portada-logo">${LOGO_SVG}</div>
    <div class="portada-marca">PROBLEMA <span>CERO</span></div>
    <div class="portada-sub">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
    <div class="portada-tipo">${e(tipo)}</div>
    <div class="portada-t1">${e(t1)}</div>
    <div class="portada-t2">${e(t2)}</div>
    <div class="portada-linea"></div>
    <div class="portada-desc">${e(desc)}</div>
    <div class="portada-firma-label">DIRECCIÓN ESTRATÉGICA</div>
    <div class="portada-firma">Lic. Hernán Mariano Waisman</div>
  </div>`;
}

function piePagina(n) {
  return `<div class="pie"><span>PROBLEMA CERO</span><span>PÁGINA ${n}</span></div>`;
}

function pag(contenido, n) {
  return `<div class="pagina">${contenido}${piePagina(n)}</div>`;
}

function secHeader(kicker, titulo) {
  return `<div class="sec-kicker">${e(kicker)}</div>
  <div class="sec-titulo">${e(titulo)}</div>
  <div class="sec-linea"></div>`;
}

function bullets(items) {
  return items.map(i => `<div class="bullet-item">
    <div class="bullet-guion">—</div>
    <div class="bullet-texto">${e(i)}</div>
  </div>`).join("");
}

// ─────────────────────────────────────────────
// RENDERS PREMIUM
// ─────────────────────────────────────────────
function renderTimeline(dias) {
  let h = `<div class="timeline"><div class="timeline-rail"></div>`;
  dias.forEach(d => {
    h += `<div class="tl-item">
      <div class="tl-nodo">
        <span class="tl-nodo-label">DÍA</span>
        <span class="tl-nodo-num">${e(d.numero)}</span>
      </div>
      <div class="tl-card">
        <span class="tl-texto">${e(d.texto)}</span>
      </div>
    </div>`;
  });
  return h + `</div>`;
}

function renderSemanas(sems) {
  const BG = ["#0a0a0a","#dc2626","#1a1a1a","#7f1d1d"];
  let h = `<div class="semanas-grid">`;
  sems.forEach((s, i) => {
    const mObj = s.texto.match(/Objetivo[:\s]+(.*?)(?:\.\s*Acci[oó]n|$)/i);
    const mAcc = s.texto.match(/Acci[oó]n[:\s]+(.*)/i);
    const obj  = mObj ? mObj[1].trim() : "";
    const acc  = mAcc ? mAcc[1].trim() : s.texto;
    h += `<div class="sem-card">
      <div class="sem-header" style="background:${BG[i%BG.length]}">
        <span class="sem-num-bg">${e(s.numero)}</span>
        <div class="sem-header-info">
          <span class="sem-label">SEMANA</span>
          <span class="sem-objetivo">${obj || "Ejecución"}</span>
        </div>
      </div>
      <div class="sem-body">
        <div class="sem-accion-label">ACCIÓN</div>
        <div class="sem-accion-texto">${e(acc || s.texto)}</div>
      </div>
    </div>`;
  });
  return h + `</div>`;
}

function renderIdeas(ideas) {
  const BG = ["#0a0a0a","#dc2626","#1a1a1a","#7f1d1d","#2c2c2c"];
  return ideas.map((idea, i) => `<div class="idea-card">
    <div class="idea-lateral" style="background:${BG[i%BG.length]}">
      <span class="idea-lateral-label">IDEA</span>
      <span class="idea-lateral-num">${e(idea.numero)}</span>
    </div>
    <div class="idea-cuerpo">
      <div class="idea-gancho-box">
        <div class="idea-gancho-label">GANCHO</div>
        <div class="idea-gancho">"${e(idea.gancho)}"</div>
      </div>
      <div class="idea-meta">
        ${idea.tema ? `<div class="idea-meta-col"><div class="idea-meta-label">TEMA</div><div class="idea-meta-val">${e(idea.tema)}</div></div>` : ""}
        ${idea.objetivo ? `<div class="idea-meta-col"><div class="idea-meta-label">OBJETIVO</div><div class="idea-meta-val">${e(idea.objetivo)}</div></div>` : ""}
      </div>
    </div>
  </div>`).join("");
}

function renderMetricas(metricas) {
  return metricas.map((m, i) => `<div class="metrica-item">
    <div class="metrica-header">
      <div class="metrica-badge"><span>${i+1}</span></div>
      <div class="metrica-titulo">${e(m.que)}</div>
    </div>
    ${m.porQue ? `<div class="metrica-fila"><strong>Por qué importa:</strong> ${e(m.porQue)}</div>` : ""}
    ${m.decision ? `<div class="metrica-fila"><strong>Decisión:</strong> ${e(m.decision)}</div>` : ""}
  </div>`).join("");
}

function renderSiEntonces(items) {
  return items.map((se, i) => `<div class="se-bloque">
    <div class="se-etiqueta">ESCENARIO ${String(i+1).padStart(2,"0")}</div>
    <div class="se-flujo">
      <div class="se-si">
        <div class="se-si-label">CONDICIÓN</div>
        <div class="se-si-texto">Si ${e(se.condicion)}</div>
      </div>
      <div class="se-conector">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="se-conector-label">ENTONCES</span>
      </div>
      <div class="se-entonces">
        <div class="se-entonces-label">ACCIÓN</div>
        <div class="se-entonces-texto">${e(se.accion) || "Ver plan"}</div>
      </div>
    </div>
  </div>`).join("");
}

function renderMensajes(msjs) {
  return msjs.map((m, i) => {
    const osc = i % 2 !== 0;
    return `<div class="msj-card ${osc ? "msj-oscuro" : "msj-claro"}">
      <div class="msj-comilla">"</div>
      <div class="msj-num ${osc ? "msj-num-oscuro" : "msj-num-claro"}">${String(i+1).padStart(2,"0")}</div>
      <div class="msj-texto ${osc ? "msj-texto-oscuro" : "msj-texto-claro"}">${e(m)}</div>
    </div>`;
  }).join("");
}

// ─────────────────────────────────────────────
// GENERADOR PLAN DE EJECUCIÓN
// ─────────────────────────────────────────────
function generarPlan(s) {
  const pags = [];
  let n = 2;

  // Mapa ejecutivo + prioridad
  if (s.mapaEjecutivo.length || s.prioridad) {
    let h = secHeader("Resumen ejecutivo", "Mapa Ejecutivo");
    h += bullets(s.mapaEjecutivo);
    if (s.prioridad) {
      h += `<div style="margin-top:28px;">
        <div class="sec-kicker" style="margin-bottom:10px;">PRIORIDAD ABSOLUTA</div>
        <div class="bloque-negro"><p>${e(s.prioridad)}</p></div>
      </div>`;
    }
    pags.push(pag(h, n++));
  }

  // Dejar de hacer + corregir
  if (s.dejarDeHacer.length || s.corregirPrimero.length) {
    let h = "";
    if (s.dejarDeHacer.length) {
      h += secHeader("Acción inmediata", "Qué Dejar de Hacer Ya");
      h += bullets(s.dejarDeHacer);
    }
    if (s.corregirPrimero.length) {
      h += `<div style="margin-top:32px;">` + secHeader("Correcciones prioritarias", "Qué Corregir Primero") + bullets(s.corregirPrimero) + `</div>`;
    }
    pags.push(pag(h, n++));
  }

  // 7 días — línea de tiempo
  if (s.dias7.length) {
    let h = secHeader("Plan de acción", "Próximos 7 Días");
    h += renderTimeline(s.dias7);
    pags.push(pag(h, n++));
  }

  // 30 días — grilla
  if (s.semanas30.length) {
    let h = secHeader("Plan de acción", "Plan 30 Días");
    h += renderSemanas(s.semanas30);
    pags.push(pag(h, n++));
  }

  // Contenido a crear
  if (s.contenido.length) {
    let h = secHeader("Estrategia de contenido", "Contenido a Crear");
    h += renderIdeas(s.contenido);
    pags.push(pag(h, n++));
  }

  // Mensajes de venta
  if (s.mensajesVenta.length) {
    let h = secHeader("Comunicación comercial", "Mensajes de Venta");
    h += renderMensajes(s.mensajesVenta);
    pags.push(pag(h, n++));
  }

  // Métricas
  if (s.metricas.length) {
    let h = secHeader("Control y seguimiento", "Métricas a Monitorear");
    h += renderMetricas(s.metricas);
    pags.push(pag(h, n++));
  }

  // SI / ENTONCES
  if (s.siEntonces.length) {
    let h = secHeader("Gestión de escenarios", "Si / Entonces");
    h += renderSiEntonces(s.siEntonces);
    pags.push(pag(h, n++));
  }

  // Cierre
  if (s.cierre) {
    let h = secHeader("Conclusión estratégica", "Cierre");
    h += `<div class="cierre-box">
      <div class="cierre-deco1"></div>
      <div class="cierre-deco2"></div>
      <div class="cierre-texto">${e(s.cierre)}</div>
    </div>`;
    pags.push(pag(h, n++));
  }

  return pags.join("");
}

// ─────────────────────────────────────────────
// GENERADOR DIAGNÓSTICO
// ─────────────────────────────────────────────
function generarDiagnostico(s, textoBruto) {
  const pags = [];
  let n = 2;

  const SECCIONES_DIAG = [
    { key: "resumenRapido",    kicker: "Visión general",        titulo: "Resumen Rápido" },
    { key: "problemaPrincipal",kicker: "Diagnóstico central",   titulo: "Problema Principal" },
    { key: "queSig",           kicker: "Impacto en el negocio", titulo: "Qué Significa" },
    { key: "causaReal",        kicker: "Raíz del bloqueo",      titulo: "Causa Real" },
    { key: "accionConcreta",   kicker: "Hoja de ruta",          titulo: "Acción Concreta" },
    { key: "impacto",          kicker: "Resultado esperado",    titulo: "Impacto" },
    { key: "cierreDiag",       kicker: "Conclusión",            titulo: "Cierre" },
  ];

  SECCIONES_DIAG.forEach(sec => {
    const items = sec.key === "cierreDiag" ? (s.cierreDiag ? [s.cierreDiag] : []) : (s[sec.key] || []);
    if (!items.length) return;

    let h = secHeader(sec.kicker, sec.titulo);
    items.forEach(item => {
      const esBullet = /^[-—•]/.test(item) || item.length < 120;
      if (esBullet) {
        h += `<div class="bullet-item">
          <div class="bullet-guion">—</div>
          <div class="bullet-texto">${e(item)}</div>
        </div>`;
      } else {
        h += `<div class="parrafo">${e(item)}</div>`;
      }
    });
    pags.push(pag(h, n++));
  });

  // CTA final
  if (/ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL/i.test(textoBruto)) {
    const h = `<div class="cta-diag-wrap">
      <div class="cta-diag-box">
        <div class="cta-diag-titulo">ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL</div>
        <div class="cta-diag-texto">Detectar el problema es importante. Pero el cambio aparece cuando sabés:</div>
        <ul class="cta-diag-list">
          <li>qué corregir primero</li>
          <li>qué dejar de hacer</li>
          <li>cómo ordenar los próximos pasos sin seguir probando cosas al azar</li>
        </ul>
        <a href="https://problemacero.com.ar" class="cta-diag-btn">Desbloquear Análisis Completo</a>
      </div>
    </div>`;
    pags.push(pag(h, n++));
  }

  return pags.join("");
}

// ─────────────────────────────────────────────
// GENERA HTML FINAL
// ─────────────────────────────────────────────
function generarHTML(texto) {
  const s = parsear(texto);
  const esPlan = /ANÁLISIS COMPLETO/i.test(texto) || s.dias7.length > 0 || s.semanas30.length > 0;

  let contenido;
  let port;

  if (esPlan) {
    port = portada("Mapa de", "Ejecución",
      "Un plan de acción diseñado para corregir la raíz del problema, ordenar prioridades absolutas y escalar el negocio en los próximos 30 días.",
      "DOCUMENTO EJECUTIVO", 1);
    contenido = generarPlan(s);
  } else {
    port = portada("Diagnóstico", "estratégico",
      "Una lectura estratégica diseñada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.",
      "INFORME PRIVADO", 1);
    contenido = generarDiagnostico(s, texto);
  }

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>${CSS}</style>
  </head><body>${port}${contenido}</body></html>`;
}

// ─────────────────────────────────────────────
// RUTA — igual que el original
// ─────────────────────────────────────────────
app.post("/*", async (req, res) => {
  let browser = null;
  try {
    const texto = req.body.diagnostico || req.body.texto || req.body.problem;
    if (!texto) return res.status(400).json({ error: "No se envió texto para el PDF" });

    const htmlFinal = generarHTML(texto);

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
    const page = await browser.newPage();
    await page.setContent(htmlFinal, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", bottom: "0px", left: "0px", right: "0px" },
      displayHeaderFooter: false
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=ProblemaCero.pdf",
      "Content-Length": pdfBuffer.length
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Error PDF:", error);
    res.status(500).json({ error: "Falla interna", detalle: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Motor PDF Problema Cero v5.0 activo en puerto ${PORT}`));
