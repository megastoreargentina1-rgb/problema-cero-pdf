const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => res.send("Motor PDF Problema Cero v3.2"));

function esc(t) {
  if (!t) return "";
  return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function sinMd(t) {
  return String(t||"").replace(/\*\*(.*?)\*\*/g,"$1").replace(/\*(.*?)\*/g,"$1").trim();
}

// ─────────────────────────────────────────────
// PARSER — trabaja con el texto real de Gemini
// ─────────────────────────────────────────────
function parsear(texto) {
  const out = {
    secciones: [],   // [{titulo, kicker, items:[{tipo,texto}]}]
    diasBuffer: [],
    semanasBuffer: [],
    ideasBuffer: [],
    siEntoncesBuffer: [],
    mensajesBuffer: [],
    esPlan: false
  };

  const lineas = texto.split('\n');
  let secActual = null;
  let ideaActual = null;

  const PREFIJOS_IGNORAR = [
    "CASO DEL CLIENTE:","EL NEGOCIO:","EL PROBLEMA ELEGIDO","LAS BASES DEL NEGOCIO:",
    "EL PUNTO DE BLOQUEO:","EL OBJETIVO A 90","ANÁLISIS INICIAL:","MAPA DE EJECUCIÓN",
    "CASO ORIGINAL:","RECURSOS DISPONIBLES","FEEDBACK DEL USUARIO:","DIAGNÓSTICO:",
    "Aquí tienes","🚀 Etapa privada","🧠 Para armar","🔎 Feedback","Del 1 al 10",
    "El resultado depende","¿Tenés más TIEMPO","¿Este análisis","¿Qué punto específico"
  ];

  const TITULOS_RE = /^(?:[🧭🎯🛑🔧📅📆📌💬📊⚠️🧠⚡🔴🚀💰🔥👉⚠🔎]\s*)?(MAPA EJECUTIVO|PRIORIDAD ABSOLUTA|QUÉ DEJAR DE HACER YA|QUÉ CORREGIR PRIMERO|PLAN DE ACCIÓN[^a-z]*|CONTENIDO QUE DEBERÍA CREAR|MENSAJES DE VENTA[^a-z]*|MÉTRICA QUE DEBERÍA MIRAR|SI \/ ENTONCES|CIERRE ESTRATÉGICO|RESUMEN RÁPIDO|PROBLEMA PRINCIPAL|QUÉ SIGNIFICA|CAUSA REAL|ACCIÓN CONCRETA|IMPACTO|CIERRE)$/i;

  let contenidoEmpezado = false;
  let saltarLinea = false;
  let modoDias = false, modoSemanas = false, modoIdeas = false;
  let modoSiEntonces = false, modoMensajes = false;

  // Detectar si es plan (tiene ANÁLISIS COMPLETO o secciones de plan)
  if (/ANÁLISIS COMPLETO|MAPA EJECUTIVO|PLAN DE ACCIÓN/i.test(texto)) {
    out.esPlan = true;
  }

  function cerrarModos() {
    modoDias = modoSemanas = modoIdeas = modoSiEntonces = modoMensajes = false;
    if (ideaActual) { out.ideasBuffer.push(ideaActual); ideaActual = null; }
  }

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const limpia = linea.trim();
    if (!limpia) continue;

    if (PREFIJOS_IGNORAR.some(p => limpia.startsWith(p))) { saltarLinea = true; continue; }

    const esTit = TITULOS_RE.test(limpia);
    if (esTit) { contenidoEmpezado = true; saltarLinea = false; }
    if (saltarLinea && !contenidoEmpezado) continue;
    if (!contenidoEmpezado && limpia.length < 80 && !esTit) continue;

    // Separadores
    if (limpia.includes("━━━━━━━━━") || limpia === "•") continue;

    // ANÁLISIS COMPLETO — carátula interna
    if (/^ANÁLISIS COMPLETO:?$/i.test(limpia)) {
      cerrarModos();
      secActual = { titulo: "ANÁLISIS COMPLETO", kicker: "", items: [], esCaratula: true };
      out.secciones.push(secActual);
      out.esPlan = true;
      continue;
    }

    // CTA final diagnóstico
    if (limpia.includes("ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL")) {
      cerrarModos();
      secActual = { titulo: "CTA_DIAG", kicker: "", items: [] };
      out.secciones.push(secActual);
      continue;
    }

    // CTA final plan
    if (limpia.includes("TU SIGUIENTE NIVEL") || limpia.includes("ESTE DIAGNÓSTICO ES SOLO EL PUNTO")) {
      cerrarModos(); secActual = null; continue;
    }

    // TU PRÓXIMO PASO
    if (/TU PRÓXIMO PASO/i.test(limpia)) {
      if (secActual) secActual.items.push({ tipo: "cta_paso", texto: "" });
      continue;
    }

    // TÍTULO DE SECCIÓN
    const mTit = limpia.match(TITULOS_RE);
    if (mTit) {
      cerrarModos();
      const tit = mTit[1].trim().toUpperCase();
      let kicker = 'Lectura Estratégica';
      if (["MAPA EJECUTIVO","PRIORIDAD ABSOLUTA","QUÉ DEJAR DE HACER YA","QUÉ CORREGIR PRIMERO","SI / ENTONCES"].some(t=>tit.includes(t))) kicker='Arquitectura de Decisiones';
      else if (["CONTENIDO QUE DEBERÍA CREAR","MENSAJES DE VENTA","MÉTRICA QUE DEBERÍA MIRAR"].some(t=>tit.includes(t))) kicker='Ejecución Comercial';
      else if (tit.startsWith("PLAN DE ACCIÓN")) kicker='Arquitectura de Decisiones';

      modoDias       = tit.includes("7 DÍAS") || (tit.startsWith("PLAN DE ACCIÓN") && !tit.includes("30"));
      modoSemanas    = tit.includes("30 DÍAS") || (tit.startsWith("PLAN DE ACCIÓN") && tit.includes("30"));
      modoIdeas      = tit.includes("CONTENIDO QUE DEBERÍA CREAR");
      modoSiEntonces = tit.includes("SI / ENTONCES");
      modoMensajes   = tit.includes("MENSAJES DE VENTA");

      secActual = { titulo: tit, kicker, items: [],
        modoDias, modoSemanas, modoIdeas, modoSiEntonces, modoMensajes };
      out.secciones.push(secActual);
      continue;
    }

    if (!secActual) continue;

    const textoLimpio = sinMd(limpia);

    // ── DÍAS ──
    // Detecta: "- **Día 1:** texto" o "**Día 1:** texto" o "- Día 1: texto"
    if (modoDias) {
      const m = limpia.match(/\*?\*?D[ií]a\s+(\d+)\*?\*?[:\s]+(.+)/i);
      if (m) { out.diasBuffer.push({ numero: m[1], texto: sinMd(m[2]) }); continue; }
    }

    // ── SEMANAS ──
    if (modoSemanas) {
      const m = limpia.match(/\*?\*?Semana\s+(\d+)\*?\*?[:\s]+(.+)/i);
      if (m) {
        const resto = sinMd(m[2]);
        const mObj = resto.match(/Objetivo[:\s]+([^.]+?)(?=\s*Acci[oó]n|$)/i);
        const mAcc = resto.match(/Acci[oó]n[:\s]+(.+)/i);
        out.semanasBuffer.push({
          numero: m[1],
          objetivo: mObj ? mObj[1].trim() : resto.substring(0,40),
          accion: mAcc ? mAcc[1].trim() : resto
        });
        continue;
      }
    }

    // ── IDEAS ──
    if (modoIdeas) {
      const mNum = limpia.match(/\*?\*?Idea\s+(\d+)\*?\*?[:\s]*$/i);
      const mG   = limpia.match(/\*?\*?Gancho\*?\*?[:\s]+(.+)/i);
      const mT   = limpia.match(/\*?\*?Tema\*?\*?[:\s]+(.+)/i);
      const mO   = limpia.match(/\*?\*?Objetivo\*?\*?[:\s]+(.+)/i);
      if (mNum) {
        if (ideaActual) out.ideasBuffer.push(ideaActual);
        ideaActual = { numero: mNum[1], gancho:'', tema:'', objetivo:'' };
        continue;
      }
      if (mG && ideaActual) { ideaActual.gancho   = sinMd(mG[1]); continue; }
      if (mT && ideaActual) { ideaActual.tema      = sinMd(mT[1]); continue; }
      if (mO && ideaActual) { ideaActual.objetivo  = sinMd(mO[1]); continue; }
    }

    // ── SI/ENTONCES ──
    if (modoSiEntonces) {
      // Formato: "- **Si** cond, **entonces** acc" o con negritas en cualquier posición
      const m = limpia.match(/\*?\*?Si\*?\*?\s+(.*?)[,\s]+\*?\*?entonces\*?\*?\s+(.*)/i);
      if (m) {
        out.siEntoncesBuffer.push({ condicion: sinMd(m[1]), accion: sinMd(m[2]) });
        continue;
      }
    }

    // ── MENSAJES DE VENTA ──
    if (modoMensajes) {
      // Detecta líneas que empiezan con - " o solo "
      const m = limpia.match(/^[-—*]?\s*[""""](.+)[""""]/);
      if (m) { out.mensajesBuffer.push(sinMd(m[1])); continue; }
      if (limpia.match(/^[-—*]\s+[""""]/) || limpia.match(/^[""""]/)) {
        const msg = limpia.replace(/^[-—*]\s*/,'').replace(/^[""""]/,'').replace(/[""""]\s*$/,'').trim();
        if (msg.length > 10) { out.mensajesBuffer.push(sinMd(msg)); continue; }
      }
    }

    // ── CONTENIDO NORMAL ──
    if (limpia.startsWith('👉')) {
      secActual.items.push({ tipo:'subtitulo', texto: sinMd(limpia.replace('👉','').trim()) });
      continue;
    }

    if (limpia.startsWith('- ') || limpia.startsWith('* ') || limpia.startsWith('— ')) {
      const txt = limpia.substring(2).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
      secActual.items.push({ tipo:'bullet', texto: txt });
      continue;
    }

    if (!limpia.startsWith('<')) {
      const txt = limpia.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
      secActual.items.push({ tipo:'parrafo', texto: txt });
    }
  }

  // Cerrar idea abierta
  if (ideaActual) out.ideasBuffer.push(ideaActual);

  return out;
}

// ─────────────────────────────────────────────
// RENDERS HTML PREMIUM
// ─────────────────────────────────────────────
function renderDias(dias) {
  if (!dias.length) return '';
  let h = '<div class="timeline"><div class="timeline-rail"></div>';
  dias.forEach(d => {
    h += `<div class="tl-item">
      <div class="tl-nodo"><span class="tl-nodo-label">DÍA</span><span class="tl-nodo-num">${esc(d.numero)}</span></div>
      <div class="tl-card"><div class="tl-texto">${esc(d.texto)}</div></div>
    </div>`;
  });
  return h + '</div>';
}

function renderSemanas(sems) {
  if (!sems.length) return '';
  const BG = ['#0a0a0a','#dc2626','#1a1a1a','#7f1d1d'];
  let h = '<div class="semanas-grid">';
  sems.forEach((s,i) => {
    h += `<div class="sem-card">
      <div class="sem-header" style="background:${BG[i%BG.length]}">
        <span class="sem-num-bg">${esc(s.numero)}</span>
        <div class="sem-info"><span class="sem-label">SEMANA</span><span class="sem-obj">${esc(s.objetivo||'Ejecución')}</span></div>
      </div>
      <div class="sem-body">
        <div class="sem-acc-label">ACCIÓN</div>
        <div class="sem-acc-texto">${esc(s.accion)}</div>
      </div>
    </div>`;
  });
  return h + '</div>';
}

function renderIdeas(ideas) {
  if (!ideas.length) return '';
  const BG = ['#0a0a0a','#dc2626','#1a1a1a','#7f1d1d','#2c2c2c'];
  return ideas.map((idea,i) => `<div class="idea-card">
    <div class="idea-lat" style="background:${BG[i%BG.length]}">
      <span class="idea-lat-label">IDEA</span>
      <span class="idea-lat-num">${esc(idea.numero)}</span>
    </div>
    <div class="idea-cuerpo">
      <div class="idea-gancho-box">
        <div class="idea-gancho-label">GANCHO</div>
        <div class="idea-gancho">"${esc(idea.gancho)}"</div>
      </div>
      <div class="idea-meta">
        ${idea.tema?`<div class="idea-col"><div class="idea-col-label">TEMA</div><div class="idea-col-val">${esc(idea.tema)}</div></div>`:''}
        ${idea.objetivo?`<div class="idea-col"><div class="idea-col-label">OBJETIVO</div><div class="idea-col-val">${esc(idea.objetivo)}</div></div>`:''}
      </div>
    </div>
  </div>`).join('');
}

function renderSiEntonces(items) {
  if (!items.length) return '';
  return items.map((se,i) => `<div class="se-bloque">
    <div class="se-num">ESCENARIO ${String(i+1).padStart(2,'0')}</div>
    <div class="se-flujo">
      <div class="se-si"><div class="se-si-label">CONDICIÓN</div><div class="se-si-texto">Si ${esc(se.condicion)}</div></div>
      <div class="se-flecha">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="se-flecha-label">ENTONCES</span>
      </div>
      <div class="se-entonces"><div class="se-entonces-label">ACCIÓN</div><div class="se-entonces-texto">${esc(se.accion)||'Ver plan'}</div></div>
    </div>
  </div>`).join('');
}

function renderMensajes(msjs) {
  if (!msjs.length) return '';
  return msjs.map((m,i) => {
    const osc = i%2!==0;
    return `<div class="msj-card ${osc?'msj-osc':'msj-cla'}">
      <div class="msj-comilla">"</div>
      <div class="msj-num">${String(i+1).padStart(2,'0')}</div>
      <div class="msj-texto">${esc(m)}</div>
    </div>`;
  }).join('');
}

function renderItems(items, enCajaCierre) {
  let html = '';
  let enLista = false;
  items.forEach(item => {
    if (item.tipo === 'bullet') {
      if (!enLista) { html += enCajaCierre ? '<ul class="cierre-list">' : '<ul class="editorial-list">'; enLista=true; }
      html += `<li class="list-item">${item.texto}</li>`;
    } else {
      if (enLista) { html += '</ul>'; enLista=false; }
      if (item.tipo === 'subtitulo') html += `<p class="subtitulo-seccion">${esc(item.texto)}</p>`;
      else if (item.tipo === 'parrafo') {
        if (enCajaCierre) html += `<p class="texto-cierre">${item.texto}</p>`;
        else html += `<p class="texto-editorial">${item.texto}</p>`;
      }
      else if (item.tipo === 'cta_paso') html += `<p class="cta-titulo">TU PRÓXIMO PASO:</p>`;
    }
  });
  if (enLista) html += '</ul>';
  return html;
}

// ─────────────────────────────────────────────
// GENERADOR HTML
// ─────────────────────────────────────────────
function generarHTML(datos) {
  const { secciones, diasBuffer, semanasBuffer, ideasBuffer, siEntoncesBuffer, mensajesBuffer, esPlan } = datos;

  let paginasHTML = '';

  secciones.forEach(sec => {

    // Carátula interna del plan
    if (sec.esCaratula) {
      paginasHTML += `<div class="cover-interna">
        <img src="https://www.problemacero.com.ar/logo.png" alt="Logo" class="logo-portada" onerror="this.style.display='none'">
        <h1>PROBLEMA CERO</h1>
        <div class="subtitle">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
        <div class="diag-title">Mapa de <span class="rojo">Ejecución</span></div>
        <div class="private">DOCUMENTO EJECUTIVO</div>
        <div class="description">Un plan de acción diseñado para corregir la raíz del problema, ordenar prioridades absolutas y escalar el negocio en los próximos 30 días.</div>
      </div>`;
      return;
    }

    // CTA diagnóstico
    if (sec.titulo === 'CTA_DIAG') {
      paginasHTML += `<div class="seccion-nueva">
        <div class="contenedor-cierre">
          <div class="caja-premium-cierre">
            <h2 class="cierre-titulo">ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL</h2>
            ${renderItems(sec.items, true)}
          </div>
        </div>
      </div>`;
      return;
    }

    // Sección con elementos visuales
    let contenidoVisual = '';

    if (sec.modoDias && diasBuffer.length) {
      contenidoVisual = renderDias(diasBuffer);
    } else if (sec.modoSemanas && semanasBuffer.length) {
      contenidoVisual = renderSemanas(semanasBuffer);
    } else if (sec.modoIdeas && ideasBuffer.length) {
      contenidoVisual = renderIdeas(ideasBuffer);
    } else if (sec.modoSiEntonces && siEntoncesBuffer.length) {
      contenidoVisual = renderSiEntonces(siEntoncesBuffer);
    } else if (sec.modoMensajes && mensajesBuffer.length) {
      contenidoVisual = renderMensajes(mensajesBuffer);
    }

    paginasHTML += `<div class="seccion-nueva">
      <div class="kicker">${esc(sec.kicker)}</div>
      <h2 class="editorial-title">${esc(sec.titulo)}</h2>
      <div class="titulo-linea"></div>
      ${renderItems(sec.items, false)}
      ${contenidoVisual}
    </div>`;
  });

  return paginasHTML;
}

// ─────────────────────────────────────────────
// PLANTILLA HTML COMPLETA
// ─────────────────────────────────────────────
function generarPlantillaPDF(texto) {
  const datos = parsear(texto);
  const contenido = generarHTML(datos);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{--rojo:#dc2626;--negro:#0a0a0a;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',sans-serif;color:#111;background:#fff;}

/* CARÁTULAS */
.cover,.cover-interna{
  height:100vh;display:flex;flex-direction:column;
  justify-content:center;align-items:center;text-align:center;
  background:var(--negro);color:#fff;padding:60px;
  page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact;
}
.logo-portada{width:180px;margin-bottom:36px;}
.cover h1,.cover-interna h1{font-size:36px;color:var(--rojo);letter-spacing:4px;font-weight:700;margin-bottom:10px;}
.cover .subtitle,.cover-interna .subtitle{font-size:16px;font-weight:300;color:#d1d5db;letter-spacing:1px;margin-bottom:6px;}
.cover .private,.cover-interna .private{font-size:12px;font-weight:600;color:#6b7280;letter-spacing:5px;text-transform:uppercase;margin-bottom:44px;}
.cover .diag-title,.cover-interna .diag-title{font-size:54px;font-weight:300;line-height:1.15;margin-bottom:36px;color:#fff;}
.rojo{color:var(--rojo);font-weight:700;}
.cover .description,.cover-interna .description{font-size:18px;color:#9ca3af;max-width:560px;border-top:1px solid #334155;border-bottom:1px solid #334155;padding:20px 0;line-height:1.7;font-weight:300;}
.cover-footer{margin-top:44px;text-align:center;}
.cover-footer .label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:3px;margin-bottom:6px;font-weight:600;}
.cover-footer .value{font-size:19px;color:#fff;font-weight:400;}

/* CONTENIDO */
.page-content{padding:0 80px;}

/* CADA SECCIÓN = PÁGINA NUEVA */
.seccion-nueva{
  page-break-before:always;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
  padding-top:70px;
  padding-bottom:40px;
}

/* HEADER */
.kicker{font-size:11px;color:var(--rojo);text-transform:uppercase;letter-spacing:4px;font-weight:700;margin-bottom:10px;}
.editorial-title{color:#111;font-size:34px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;}
.titulo-linea{width:52px;height:5px;background:var(--rojo);margin-bottom:32px;}

/* TEXTO */
.texto-editorial{font-size:22px;line-height:1.85;color:#111;font-weight:400;margin-bottom:20px;}
.subtitulo-seccion{font-size:20px;font-weight:700;color:#111;margin-bottom:12px;margin-top:10px;}
strong{font-weight:700;color:#000;}

/* LISTAS */
.editorial-list{list-style:none;padding-left:0;margin:10px 0 24px 0;}
.list-item{position:relative;padding-left:28px;margin-bottom:16px;font-size:22px;line-height:1.85;color:#111;font-weight:400;}
.editorial-list .list-item::before{content:"—";color:var(--rojo);font-weight:700;position:absolute;left:0;top:0;}

/* LÍNEA DE TIEMPO 7 DÍAS */
.timeline{position:relative;padding-left:82px;margin-top:4px;}
.timeline-rail{position:absolute;left:26px;top:10px;bottom:10px;width:4px;background:linear-gradient(to bottom,#dc2626,#333);border-radius:2px;}
.tl-item{position:relative;margin-bottom:12px;min-height:64px;display:flex;align-items:center;}
.tl-nodo{position:absolute;left:-82px;width:62px;height:62px;background:var(--rojo);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(220,38,38,.4);}
.tl-nodo-label{font-size:8px;letter-spacing:2px;color:rgba(255,255,255,.65);text-transform:uppercase;}
.tl-nodo-num{font-size:23px;font-weight:900;color:#fff;line-height:1;}
.tl-card{background:#fafafa;border:1px solid #e8e8e8;border-left:4px solid var(--rojo);border-radius:0 6px 6px 0;padding:14px 18px;flex:1;display:flex;align-items:center;}
.tl-texto{font-size:20px;font-weight:400;color:#111;line-height:1.5;}

/* GRILLA SEMANAS */
.semanas-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.sem-card{border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;}
.sem-header{padding:14px 16px;display:flex;align-items:center;gap:10px;}
.sem-num-bg{font-size:46px;font-weight:900;color:rgba(255,255,255,.12);line-height:1;flex-shrink:0;}
.sem-info{display:flex;flex-direction:column;}
.sem-label{font-size:8px;letter-spacing:3px;color:rgba(255,255,255,.4);text-transform:uppercase;}
.sem-obj{font-size:12px;font-weight:700;color:#fff;text-transform:uppercase;margin-top:2px;line-height:1.3;}
.sem-body{padding:12px 16px;background:#fafafa;}
.sem-acc-label{font-size:8px;font-weight:700;letter-spacing:2px;color:var(--rojo);text-transform:uppercase;margin-bottom:5px;}
.sem-acc-texto{font-size:15px;color:#111;line-height:1.55;}

/* IDEAS */
.idea-card{display:flex;border-radius:8px;overflow:hidden;margin-bottom:12px;min-height:86px;}
.idea-lat{width:66px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.idea-lat-label{font-size:7px;letter-spacing:2px;color:rgba(255,255,255,.4);text-transform:uppercase;}
.idea-lat-num{font-size:30px;font-weight:900;color:#fff;line-height:1;}
.idea-cuerpo{flex:1;border:1px solid #e0e0e0;border-left:none;border-radius:0 8px 8px 0;}
.idea-gancho-box{background:#f0f0f0;padding:10px 16px;border-bottom:1px solid #e0e0e0;}
.idea-gancho-label{font-size:8px;font-weight:700;letter-spacing:3px;color:var(--rojo);text-transform:uppercase;margin-bottom:3px;}
.idea-gancho{font-size:16px;font-weight:700;color:#111;font-style:italic;line-height:1.4;}
.idea-meta{display:flex;padding:8px 16px;background:#fafafa;gap:12px;}
.idea-col{flex:1;}
.idea-col-label{font-size:7px;font-weight:700;letter-spacing:2px;color:#999;text-transform:uppercase;margin-bottom:2px;}
.idea-col-val{font-size:13px;color:#111;line-height:1.4;}

/* SI/ENTONCES */
.se-bloque{margin-bottom:16px;}
.se-num{font-size:9px;font-weight:700;letter-spacing:3px;color:#ccc;text-transform:uppercase;margin-bottom:6px;}
.se-flujo{display:flex;align-items:stretch;}
.se-si{flex:1;background:#f4f4f4;border:2px solid #e0e0e0;border-right:none;border-radius:8px 0 0 8px;padding:14px 16px;}
.se-si-label{font-size:8px;font-weight:700;letter-spacing:3px;color:#aaa;text-transform:uppercase;margin-bottom:5px;}
.se-si-texto{font-size:17px;font-weight:500;color:#111;line-height:1.5;}
.se-flecha{background:var(--rojo);width:50px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;}
.se-flecha-label{font-size:7px;letter-spacing:1px;color:rgba(255,255,255,.55);text-transform:uppercase;}
.se-entonces{flex:1;background:var(--negro);border:2px solid var(--negro);border-left:none;border-radius:0 8px 8px 0;padding:14px 16px;}
.se-entonces-label{font-size:8px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,.35);text-transform:uppercase;margin-bottom:5px;}
.se-entonces-texto{font-size:17px;font-weight:500;color:#fff;line-height:1.5;}

/* MENSAJES */
.msj-card{position:relative;padding:28px 32px 24px;border-radius:8px;margin-bottom:14px;}
.msj-cla{background:#fafafa;border:1px solid #e0e0e0;}
.msj-osc{background:var(--negro);}
.msj-comilla{position:absolute;top:4px;left:14px;font-size:80px;font-weight:900;color:var(--rojo);opacity:.15;line-height:1;font-family:Georgia,serif;}
.msj-num{position:absolute;top:12px;right:16px;font-size:10px;font-weight:700;letter-spacing:2px;color:#aaa;}
.msj-texto{font-size:20px;font-weight:500;line-height:1.7;font-style:italic;position:relative;z-index:1;padding-left:6px;}
.msj-cla .msj-texto{color:#111;}
.msj-osc .msj-texto{color:#fff;}

/* CAJAS CTA */
.contenedor-cierre{display:flex;justify-content:center;align-items:center;min-height:60vh;}
.caja-premium-cierre{background:var(--negro);color:#fff;border:1px solid #334155;padding:50px;width:100%;text-align:center;}
.cierre-titulo{color:#fff;font-size:22px;text-transform:uppercase;border-bottom:2px solid var(--rojo);padding-bottom:16px;margin-bottom:22px;letter-spacing:2px;font-weight:700;}
.texto-cierre{color:#e5e7eb;font-size:21px;line-height:1.8;margin-bottom:16px;font-weight:300;}
.cierre-list{list-style:none;padding-left:0;margin:8px 0 18px 0;}
.cierre-list .list-item{position:relative;padding-left:28px;margin-bottom:12px;font-size:18px;color:#d1d5db;font-weight:300;line-height:1.7;}
.cierre-list .list-item::before{content:"—";color:var(--rojo);position:absolute;left:0;top:0;}
.cta-titulo{color:var(--rojo);font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px;}
</style>
</head>
<body>

<div class="cover">
  <img src="https://www.problemacero.com.ar/logo.png" alt="Logo Problema Cero" class="logo-portada" onerror="this.style.display='none'">
  <h1>PROBLEMA CERO</h1>
  <div class="subtitle">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
  <div class="private">INFORME PRIVADO</div>
  <div class="diag-title">Diagnóstico<br>estratégico</div>
  <div class="description">Una lectura estratégica diseñada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.</div>
  <div class="cover-footer">
    <div class="label">Dirección Estratégica</div>
    <div class="value">Lic. Hernán Mariano Waisman</div>
  </div>
</div>

<div class="page-content">${contenido}</div>

</body>
</html>`;
}

// ─────────────────────────────────────────────
// RUTA
// ─────────────────────────────────────────────
app.post("/*", async (req, res) => {
  let browser = null;
  try {
    const texto = req.body.diagnostico || req.body.texto || req.body.problem;
    if (!texto) return res.status(400).json({ error: "No se envió texto" });

    const htmlFinal = generarPlantillaPDF(texto);

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage"]
    });
    const page = await browser.newPage();
    await page.setContent(htmlFinal, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top:"0px", bottom:"72px", left:"0px", right:"0px" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="font-size:11px;width:100%;color:#555;padding:0 80px;display:flex;justify-content:space-between;font-family:'Inter',sans-serif;letter-spacing:1px;-webkit-print-color-adjust:exact;print-color-adjust:exact;"><span style="font-weight:600;">PROBLEMA CERO</span><span>PÁGINA <span class="pageNumber"></span></span></div>`
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=ProblemaCero.pdf",
      "Content-Length": pdfBuffer.length
    });
    res.send(pdfBuffer);

  } catch(err) {
    console.error("Error PDF:", err);
    res.status(500).json({ error: "Falla interna", detalle: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Motor PDF Problema Cero v3.2 activo en puerto ${PORT}`));
