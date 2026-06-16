const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Motor PDF Problema Cero v3.2");
});

function limpiarTexto(texto) {
  if (!texto) return "";
  return texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function procesarMarkdownAHTML(textoCrudo) {
  const textoSeguro = limpiarTexto(textoCrudo);
  const lineas = textoSeguro.split('\n');
  let htmlResult = '';
  let enLista = false;
  let ignorarResto = false;
  let enCajaCierre = false;
  let enCajaNaranja = false;
  let saltarLinea = false;

  const prefijosIgnorar = [
    "CASO DEL CLIENTE:", "EL NEGOCIO:", "EL PROBLEMA ELEGIDO",
    "LAS BASES DEL NEGOCIO:", "EL PUNTO DE BLOQUEO:", "EL OBJETIVO A 90",
    "ANÁLISIS INICIAL:", "ANÁLISIS ESTRATÉGICO:", "MAPA DE EJECUCIÓN",
    "CASO ORIGINAL:", "RECURSOS DISPONIBLES", "FEEDBACK DEL USUARIO:",
    "ANÁLISIS COMPLETO\n", "DIAGNÓSTICO:", "DIAGNÓSTICO INICIAL:",
    "Aquí tienes el análisis"
  ];

  let contenidoEmpezado = false;

  // Estado para secciones especiales
  let seccionActual = '';
  let diasBuffer = [];
  let semanasBuffer = [];
  let ideasBuffer = [];
  let ideaActual = null;
  let siEntoncesBuffer = [];
  let mensajesBuffer = [];
  let enDias = false;
  let enSemanas = false;
  let enIdeas = false;
  let enSiEntonces = false;
  let enMensajes = false;

  function volcarBuffers() {
    if (enDias && diasBuffer.length) {
      htmlResult += renderDias(diasBuffer);
      diasBuffer = []; enDias = false;
    }
    if (enSemanas && semanasBuffer.length) {
      htmlResult += renderSemanas(semanasBuffer);
      semanasBuffer = []; enSemanas = false;
    }
    if (enIdeas && ideasBuffer.length) {
      if (ideaActual) { ideasBuffer.push(ideaActual); ideaActual = null; }
      htmlResult += renderIdeas(ideasBuffer);
      ideasBuffer = []; enIdeas = false;
    }
    if (enSiEntonces && siEntoncesBuffer.length) {
      htmlResult += renderSiEntonces(siEntoncesBuffer);
      siEntoncesBuffer = []; enSiEntonces = false;
    }
    if (enMensajes && mensajesBuffer.length) {
      htmlResult += renderMensajes(mensajesBuffer);
      mensajesBuffer = []; enMensajes = false;
    }
  }

  lineas.forEach(linea => {
    if (ignorarResto) return;

    let limpia = linea.trim();
    if (!limpia) return;

    if (prefijosIgnorar.some(p => limpia.startsWith(p))) {
      saltarLinea = true;
      return;
    }

    const esTitulo = /^(?:[🧭🎯🛑🔧📅📆📌💬📊⚠️🧠⚡🔴🚀💰🔥👉⚠]\s*)?(MAPA EJECUTIVO|PRIORIDAD ABSOLUTA|QUÉ DEJAR DE HACER YA|QUÉ CORREGIR PRIMERO|PLAN DE ACCIÓN|CONTENIDO QUE DEBERÍA CREAR|MENSAJES DE VENTA|MÉTRICA QUE DEBERÍA MIRAR|SI \/ ENTONCES|CIERRE ESTRATÉGICO|RESUMEN RÁPIDO|PROBLEMA PRINCIPAL|QUÉ SIGNIFICA|CAUSA REAL|ACCIÓN CONCRETA|IMPACTO|CIERRE)/i.test(limpia);

    if (esTitulo) { contenidoEmpezado = true; saltarLinea = false; }

    if (saltarLinea && !contenidoEmpezado) return;
    if (!contenidoEmpezado && /^\d+\./.test(limpia)) return;
    if (!contenidoEmpezado && limpia.length < 80 && !esTitulo) return;

    if (limpia.includes("━━━━━━━━━━━━━━━━━━━━") || limpia === "•") {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      return;
    }

    // CARÁTULA INTERNA — ANÁLISIS COMPLETO
    if (limpia === "ANÁLISIS COMPLETO:") {
      volcarBuffers();
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      if (enCajaNaranja) { htmlResult += '</div>'; enCajaNaranja = false; }
      if (enCajaCierre) { htmlResult += '</div></div>'; enCajaCierre = false; }
      htmlResult += '<div class="page-break"></div>';
      htmlResult += `
      <div class="cover-interna">
        <div class="logo-box">
          <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:54px;height:54px;display:block;">
            <circle cx="28" cy="30" r="16" stroke="white" stroke-width="3" fill="none"/>
            <line x1="28" y1="14" x2="28" y2="10" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <path d="M28 30 L44 18" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
            <circle cx="28" cy="30" r="3" fill="white"/>
            <polygon points="42,10 50,6 46,14" fill="white"/>
          </svg>
        </div>
        <h1>PROBLEMA <span class="rojo">CERO</span></h1>
        <div class="subtitle">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
        <div class="private">DOCUMENTO EJECUTIVO</div>
        <div class="diag-title">Mapa de <span class="rojo">Ejecución</span></div>
        <div class="description">Un plan de acción diseñado para corregir la raíz del problema, ordenar prioridades absolutas y escalar el negocio en los próximos 30 días.</div>
      </div>`;
      contenidoEmpezado = true;
      return;
    }

    // CTA FINAL — DIAGNÓSTICO
    if (limpia.includes("ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL")) {
      volcarBuffers();
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      if (enCajaNaranja) { htmlResult += '</div>'; enCajaNaranja = false; }
      enCajaCierre = true;
      htmlResult += '<div class="page-break"></div>';
      htmlResult += '<div class="contenedor-cierre"><div class="caja-premium-cierre">';
      htmlResult += '<h2 class="cierre-titulo">ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL</h2>';
      return;
    }

    // CTA FINAL — PLAN
    if (
      limpia.includes("ESTE DIAGNÓSTICO ES SOLO EL PUNTO DE PARTIDA") ||
      limpia.includes("TU SIGUIENTE NIVEL DE EJECUCIÓN") ||
      limpia.includes("TU SIGUIENTE NIVEL:")
    ) {
      volcarBuffers();
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      if (enCajaNaranja) { htmlResult += '</div>'; enCajaNaranja = false; }
      if (enCajaCierre) { htmlResult += '</div></div>'; enCajaCierre = false; }
      htmlResult += '<div class="page-break"></div>';
      htmlResult += '<div class="contenedor-cierre"><div class="black-box-cta">';
      htmlResult += '<h3>TU SIGUIENTE NIVEL DE EJECUCIÓN</h3>';
      htmlResult += '<p>Detectar el bloqueo es vital, pero la transformación ocurre en la acción.</p>';
      htmlResult += '<a href="https://problemacero.com.ar" class="btn-premium">DESBLOQUEAR RUTA DE 30 DÍAS</a>';
      htmlResult += '</div></div>';
      ignorarResto = true;
      return;
    }

    // TU PRÓXIMO PASO
    if (limpia.includes("TU PRÓXIMO PASO:")) {
      volcarBuffers();
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      htmlResult += '<div class="caja-cta-blanca"><p class="cta-titulo">TU PRÓXIMO PASO:</p>';
      enCajaNaranja = true;
      return;
    }

    // TÍTULOS DE SECCIÓN
    const regexTitulos = /^(?:[🧭🎯🛑🔧📅📆📌💬📊⚠️🧠⚡🔴🚀💰🔥👉⚠]\s*)?(MAPA EJECUTIVO|PRIORIDAD ABSOLUTA|QUÉ DEJAR DE HACER YA|QUÉ CORREGIR PRIMERO|PLAN DE ACCIÓN[^a-z]*|CONTENIDO QUE DEBERÍA CREAR|MENSAJES DE VENTA[^a-z]*|MÉTRICA QUE DEBERÍA MIRAR|SI \/ ENTONCES|CIERRE ESTRATÉGICO|RESUMEN RÁPIDO|PROBLEMA PRINCIPAL|QUÉ SIGNIFICA|CAUSA REAL|ACCIÓN CONCRETA|IMPACTO|CIERRE)$/i;
    const matchTitulo = limpia.match(regexTitulos);

    if (matchTitulo) {
      volcarBuffers();
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      if (enCajaNaranja) { htmlResult += '</div>'; enCajaNaranja = false; }
      if (enCajaCierre) { htmlResult += '</div></div>'; enCajaCierre = false; }

      const tituloLimpio = matchTitulo[1].trim().toUpperCase();
      seccionActual = tituloLimpio;

      // Activar buffers
      enDias      = tituloLimpio.includes("7 DÍAS") || (tituloLimpio.startsWith("PLAN DE ACCIÓN") && !tituloLimpio.includes("30"));
      enSemanas   = tituloLimpio.includes("30 DÍAS") || tituloLimpio.includes("SEMANA");
      enIdeas     = tituloLimpio.includes("CONTENIDO QUE DEBERÍA CREAR");
      enSiEntonces= tituloLimpio.includes("SI / ENTONCES");
      enMensajes  = tituloLimpio.includes("MENSAJES DE VENTA");

      htmlResult += '<div class="page-break"></div>';

      let kickerText = 'Lectura Estratégica';
      if (["MAPA EJECUTIVO","PRIORIDAD ABSOLUTA","QUÉ DEJAR DE HACER YA","QUÉ CORREGIR PRIMERO","SI / ENTONCES"].some(t => tituloLimpio.includes(t))) kickerText = 'Arquitectura de Decisiones';
      else if (["CONTENIDO QUE DEBERÍA CREAR","MENSAJES DE VENTA","MÉTRICA QUE DEBERÍA MIRAR"].some(t => tituloLimpio.includes(t))) kickerText = 'Ejecución Comercial';
      else if (tituloLimpio.startsWith("PLAN DE ACCIÓN")) kickerText = 'Arquitectura de Decisiones';

      htmlResult += `<div class="editorial-header">
        <div class="kicker">${kickerText}</div>
        <h2 class="editorial-title">${tituloLimpio}</h2>
        <div class="titulo-linea"></div>
      </div>`;
      return;
    }

    // CAPTURA DÍAS
    if (enDias) {
      const mDia = limpia.match(/^[-—*]\s*\*?\*?D[ií]a\s*(\d+)\*?\*?[:\s]+(.*)/i);
      if (mDia) { diasBuffer.push({ numero: mDia[1], texto: mDia[2].replace(/\*\*/g,'').trim() }); return; }
    }

    // CAPTURA SEMANAS
    if (enSemanas) {
      const mSem = limpia.match(/^[-—*]\s*\*?\*?Semana\s*(\d+)\*?\*?[:\s]+(.*)/i);
      if (mSem) { semanasBuffer.push({ numero: mSem[1], texto: mSem[2].replace(/\*\*/g,'').trim() }); return; }
    }

    // CAPTURA IDEAS
    if (enIdeas) {
      const mNum  = limpia.match(/^[-—*]\s*(?:Idea\s*)?(\d+)\s*[:\-]?\s*$/i);
      const mG    = limpia.match(/^[-—*]\s*\*?\*?Gancho\*?\*?[:\s]+(.*)/i);
      const mT    = limpia.match(/^[-—*]\s*\*?\*?Tema\*?\*?[:\s]+(.*)/i);
      const mO    = limpia.match(/^[-—*]\s*\*?\*?Objetivo\*?\*?[:\s]+(.*)/i);
      if (mNum) { if (ideaActual) ideasBuffer.push(ideaActual); ideaActual = { numero: mNum[1], gancho:'', tema:'', objetivo:'' }; return; }
      if (mG && ideaActual)  { ideaActual.gancho   = mG[1].replace(/\*\*/g,'').trim(); return; }
      if (mT && ideaActual)  { ideaActual.tema      = mT[1].replace(/\*\*/g,'').trim(); return; }
      if (mO && ideaActual)  { ideaActual.objetivo  = mO[1].replace(/\*\*/g,'').trim(); return; }
    }

    // CAPTURA SI/ENTONCES
    if (enSiEntonces) {
      const mSE = limpia.match(/^[-—*]\s*\*?\*?Si\b(.*?)(?:,\s*|\s+)\*?\*?entonces\b(.*)/i);
      if (mSE) { siEntoncesBuffer.push({ condicion: mSE[1].replace(/\*\*/g,'').trim(), accion: mSE[2].replace(/\*\*/g,'').trim() }); return; }
    }

    // CAPTURA MENSAJES DE VENTA
    if (enMensajes && (limpia.startsWith('- ') || limpia.startsWith('— ') || limpia.startsWith('* '))) {
      const msg = limpia.substring(2).replace(/^[""]|[""]$/g,'').trim();
      if (msg) { mensajesBuffer.push(msg); return; }
    }

    // SUBTÍTULOS
    if (limpia.startsWith('👉')) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      htmlResult += `<p class="subtitulo-seccion">${limpia.replace('👉','').trim()}</p>`;
      return;
    }

    // LISTAS
    if (limpia.startsWith('- ') || limpia.startsWith('* ') || limpia.startsWith('— ')) {
      if (!enLista) {
        htmlResult += enCajaCierre ? '<ul class="cierre-list">' : '<ul class="editorial-list">';
        enLista = true;
      }
      htmlResult += `<li class="list-item">${limpia.substring(2).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</li>`;
      return;
    } else if (enLista) { htmlResult += '</ul>'; enLista = false; }

    // PÁRRAFOS
    if (!limpia.startsWith('<')) {
      const p = limpia.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
      if (enCajaNaranja)     htmlResult += `<p class="cta-texto">${p}</p>`;
      else if (enCajaCierre) htmlResult += `<p class="texto-cierre">${p}</p>`;
      else                   htmlResult += `<p class="texto-editorial">${p}</p>`;
    }
  });

  volcarBuffers();
  if (enLista) htmlResult += '</ul>';
  if (enCajaNaranja) htmlResult += '</div>';
  if (enCajaCierre) htmlResult += '</div></div>';

  return htmlResult;
}

// ─────────────────────────────────────────────
// RENDERS PREMIUM
// ─────────────────────────────────────────────
function renderDias(dias) {
  let h = '<div class="timeline"><div class="timeline-rail"></div>';
  dias.forEach(d => {
    h += `<div class="tl-item">
      <div class="tl-nodo">
        <span class="tl-nodo-label">DÍA</span>
        <span class="tl-nodo-num">${d.numero}</span>
      </div>
      <div class="tl-card"><span class="tl-texto">${d.texto}</span></div>
    </div>`;
  });
  return h + '</div>';
}

function renderSemanas(sems) {
  const BG = ['#0a0a0a','#dc2626','#1a1a1a','#7f1d1d'];
  let h = '<div class="semanas-grid">';
  sems.forEach((s, i) => {
    const mObj = s.texto.match(/Objetivo[:\s]+(.*?)(?:\.\s*Acci[oó]n|$)/i);
    const mAcc = s.texto.match(/Acci[oó]n[:\s]+(.*)/i);
    const obj  = mObj ? mObj[1].trim() : '';
    const acc  = mAcc ? mAcc[1].trim() : s.texto;
    h += `<div class="sem-card">
      <div class="sem-header" style="background:${BG[i%BG.length]}">
        <span class="sem-num-bg">${s.numero}</span>
        <div class="sem-info">
          <span class="sem-label">SEMANA</span>
          <span class="sem-obj">${obj || 'Ejecución'}</span>
        </div>
      </div>
      <div class="sem-body">
        <div class="sem-acc-label">ACCIÓN</div>
        <div class="sem-acc-texto">${acc || s.texto}</div>
      </div>
    </div>`;
  });
  return h + '</div>';
}

function renderIdeas(ideas) {
  const BG = ['#0a0a0a','#dc2626','#1a1a1a','#7f1d1d','#2c2c2c'];
  return ideas.map((idea, i) => `<div class="idea-card">
    <div class="idea-lat" style="background:${BG[i%BG.length]}">
      <span class="idea-lat-label">IDEA</span>
      <span class="idea-lat-num">${idea.numero}</span>
    </div>
    <div class="idea-body">
      <div class="idea-gancho-box">
        <div class="idea-gancho-label">GANCHO</div>
        <div class="idea-gancho">"${idea.gancho}"</div>
      </div>
      <div class="idea-meta">
        ${idea.tema    ? `<div class="idea-col"><div class="idea-col-label">TEMA</div><div class="idea-col-val">${idea.tema}</div></div>` : ''}
        ${idea.objetivo? `<div class="idea-col"><div class="idea-col-label">OBJETIVO</div><div class="idea-col-val">${idea.objetivo}</div></div>` : ''}
      </div>
    </div>
  </div>`).join('');
}

function renderSiEntonces(items) {
  return items.map((se, i) => `<div class="se-bloque">
    <div class="se-num">ESCENARIO ${String(i+1).padStart(2,'0')}</div>
    <div class="se-flujo">
      <div class="se-si">
        <div class="se-si-label">CONDICIÓN</div>
        <div class="se-si-texto">Si ${se.condicion}</div>
      </div>
      <div class="se-flecha">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="se-entonces-label">ENTONCES</span>
      </div>
      <div class="se-entonces">
        <div class="se-entonces-label-top">ACCIÓN</div>
        <div class="se-entonces-texto">${se.accion || 'Ver plan'}</div>
      </div>
    </div>
  </div>`).join('');
}

function renderMensajes(msjs) {
  return msjs.map((m, i) => {
    const osc = i % 2 !== 0;
    return `<div class="msj-card ${osc ? 'msj-osc' : 'msj-cla'}">
      <div class="msj-comilla">"</div>
      <div class="msj-num">${String(i+1).padStart(2,'0')}</div>
      <div class="msj-texto">${m}</div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// PLANTILLA HTML
// ─────────────────────────────────────────────
function generarPlantillaPDF(textoDiagnostico) {
  const contenidoHTML = procesarMarkdownAHTML(textoDiagnostico);

  const LOGO = `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:54px;height:54px;display:block;">
    <circle cx="28" cy="30" r="16" stroke="white" stroke-width="3" fill="none"/>
    <line x1="28" y1="14" x2="28" y2="10" stroke="white" stroke-width="3" stroke-linecap="round"/>
    <path d="M28 30 L44 18" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
    <circle cx="28" cy="30" r="3" fill="white"/>
    <polygon points="42,10 50,6 46,14" fill="white"/>
  </svg>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { --rojo: #dc2626; --negro: #0a0a0a; --texto: #111111; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: var(--texto); background: #fff; }

    /* CARÁTULAS */
    .cover, .cover-interna {
      height: 100vh; display: flex; flex-direction: column;
      justify-content: center; align-items: center; text-align: center;
      background-color: var(--negro); color: #fff;
      padding: 60px; page-break-after: always;
    }
    .logo-box {
      width: 92px; height: 92px; border: 2px solid #222; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; margin-bottom: 32px;
    }
    .cover h1, .cover-interna h1 {
      font-size: 32px; color: #fff; letter-spacing: 6px;
      font-weight: 900; margin-bottom: 8px;
    }
    .rojo { color: var(--rojo); }
    .cover .subtitle, .cover-interna .subtitle {
      font-size: 13px; font-weight: 300; color: #9ca3af; letter-spacing: 2px; margin-bottom: 6px;
    }
    .cover .private, .cover-interna .private {
      font-size: 10px; font-weight: 600; color: #4b5563;
      letter-spacing: 5px; text-transform: uppercase; margin-bottom: 44px;
    }
    .cover .diag-title, .cover-interna .diag-title {
      font-size: 62px; font-weight: 300; line-height: 1.1;
      margin-bottom: 40px; color: #fff;
    }
    .cover .description, .cover-interna .description {
      font-size: 18px; color: #9ca3af; max-width: 560px;
      border-top: 1px solid #1f2937; border-bottom: 1px solid #1f2937;
      padding: 22px 0; line-height: 1.75; font-weight: 300;
    }
    .cover-footer { margin-top: 44px; text-align: center; }
    .cover-footer .label {
      font-size: 10px; color: #4b5563; text-transform: uppercase;
      letter-spacing: 3px; margin-bottom: 6px; font-weight: 600;
    }
    .cover-footer .value { font-size: 19px; color: #fff; font-weight: 400; }

    /* CONTENIDO */
    .page-content { padding: 70px 80px; }
    .page-break { page-break-before: always; height: 1px; }

    /* HEADER SECCIÓN */
    .editorial-header { margin-bottom: 36px; }
    .kicker {
      font-size: 11px; color: var(--rojo); text-transform: uppercase;
      letter-spacing: 4px; font-weight: 700; margin-bottom: 10px;
    }
    .editorial-title {
      color: #111; font-size: 36px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;
    }
    .titulo-linea { width: 56px; height: 5px; background: var(--rojo); margin-bottom: 36px; }

    /* TEXTO */
    .texto-editorial {
      font-size: 23px; line-height: 1.85; color: #111;
      font-weight: 400; margin-bottom: 22px;
    }
    .subtitulo-seccion {
      font-size: 21px; font-weight: 700; color: #111; margin-bottom: 14px; margin-top: 12px;
    }
    strong { font-weight: 700; color: #000; }

    /* LISTAS */
    .editorial-list { list-style: none; padding-left: 0; margin: 12px 0 28px 0; }
    .list-item {
      position: relative; padding-left: 28px;
      margin-bottom: 18px; font-size: 23px; line-height: 1.85; color: #111;
    }
    .editorial-list .list-item::before {
      content: "—"; color: var(--rojo); font-weight: 700;
      position: absolute; left: 0; top: 0;
    }

    /* LÍNEA DE TIEMPO 7 DÍAS */
    .timeline { position: relative; padding-left: 86px; margin-bottom: 8px; }
    .timeline-rail {
      position: absolute; left: 28px; top: 12px; bottom: 12px;
      width: 4px; background: linear-gradient(to bottom, #dc2626, #333); border-radius: 2px;
    }
    .tl-item { position: relative; margin-bottom: 14px; min-height: 66px; display: flex; align-items: center; }
    .tl-nodo {
      position: absolute; left: -86px; width: 64px; height: 64px;
      background: var(--rojo); border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(220,38,38,.4);
    }
    .tl-nodo-label { font-size: 8px; letter-spacing: 2px; color: rgba(255,255,255,.65); text-transform: uppercase; }
    .tl-nodo-num { font-size: 24px; font-weight: 900; color: #fff; line-height: 1; }
    .tl-card {
      background: #fafafa; border: 1px solid #e8e8e8;
      border-left: 4px solid var(--rojo); border-radius: 0 6px 6px 0;
      padding: 16px 20px; flex: 1; display: flex; align-items: center;
    }
    .tl-texto { font-size: 21px; font-weight: 400; color: #111; line-height: 1.5; }

    /* GRILLA SEMANAS */
    .semanas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .sem-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .sem-header { padding: 14px 18px; display: flex; align-items: center; gap: 10px; }
    .sem-num-bg { font-size: 48px; font-weight: 900; color: rgba(255,255,255,.12); line-height: 1; }
    .sem-info { display: flex; flex-direction: column; }
    .sem-label { font-size: 8px; letter-spacing: 3px; color: rgba(255,255,255,.4); text-transform: uppercase; }
    .sem-obj { font-size: 12px; font-weight: 700; color: #fff; text-transform: uppercase; margin-top: 2px; }
    .sem-body { padding: 14px 18px; background: #fafafa; }
    .sem-acc-label { font-size: 8px; font-weight: 700; letter-spacing: 2px; color: var(--rojo); text-transform: uppercase; margin-bottom: 6px; }
    .sem-acc-texto { font-size: 16px; color: #111; line-height: 1.55; }

    /* TARJETAS IDEAS */
    .idea-card { display: flex; border-radius: 8px; overflow: hidden; margin-bottom: 14px; min-height: 90px; }
    .idea-lat { width: 68px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .idea-lat-label { font-size: 8px; letter-spacing: 2px; color: rgba(255,255,255,.4); text-transform: uppercase; }
    .idea-lat-num { font-size: 32px; font-weight: 900; color: #fff; line-height: 1; }
    .idea-body { flex: 1; border: 1px solid #e0e0e0; border-left: none; border-radius: 0 8px 8px 0; }
    .idea-gancho-box { background: #f0f0f0; padding: 12px 18px; border-bottom: 1px solid #e0e0e0; }
    .idea-gancho-label { font-size: 8px; font-weight: 700; letter-spacing: 3px; color: var(--rojo); text-transform: uppercase; margin-bottom: 4px; }
    .idea-gancho { font-size: 17px; font-weight: 700; color: #111; font-style: italic; line-height: 1.4; }
    .idea-meta { display: flex; padding: 10px 18px; background: #fafafa; gap: 16px; }
    .idea-col { flex: 1; }
    .idea-col-label { font-size: 8px; font-weight: 700; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-bottom: 3px; }
    .idea-col-val { font-size: 14px; color: #111; line-height: 1.45; }

    /* SI/ENTONCES */
    .se-bloque { margin-bottom: 18px; }
    .se-num { font-size: 9px; font-weight: 700; letter-spacing: 3px; color: #ccc; text-transform: uppercase; margin-bottom: 6px; }
    .se-flujo { display: flex; align-items: stretch; }
    .se-si {
      flex: 1; background: #f4f4f4; border: 2px solid #e0e0e0;
      border-right: none; border-radius: 8px 0 0 8px; padding: 16px 18px;
    }
    .se-si-label { font-size: 9px; font-weight: 700; letter-spacing: 3px; color: #aaa; text-transform: uppercase; margin-bottom: 6px; }
    .se-si-texto { font-size: 18px; font-weight: 500; color: #111; line-height: 1.5; }
    .se-flecha {
      background: var(--rojo); width: 52px; flex-shrink: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    }
    .se-entonces-label { font-size: 7px; letter-spacing: 1px; color: rgba(255,255,255,.55); text-transform: uppercase; }
    .se-entonces {
      flex: 1; background: var(--negro); border: 2px solid var(--negro);
      border-left: none; border-radius: 0 8px 8px 0; padding: 16px 18px;
    }
    .se-entonces-label-top { font-size: 9px; font-weight: 700; letter-spacing: 3px; color: rgba(255,255,255,.35); text-transform: uppercase; margin-bottom: 6px; }
    .se-entonces-texto { font-size: 18px; font-weight: 500; color: #fff; line-height: 1.5; }

    /* MENSAJES DE VENTA */
    .msj-card { position: relative; padding: 30px 34px 28px; border-radius: 8px; margin-bottom: 16px; }
    .msj-cla { background: #fafafa; border: 1px solid #e0e0e0; }
    .msj-osc { background: var(--negro); border: 1px solid var(--negro); }
    .msj-comilla { position: absolute; top: 6px; left: 18px; font-size: 88px; font-weight: 900; color: var(--rojo); opacity: .16; line-height: 1; font-family: Georgia, serif; }
    .msj-num { position: absolute; top: 14px; right: 18px; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #555; }
    .msj-texto { font-size: 21px; font-weight: 500; line-height: 1.72; font-style: italic; position: relative; z-index: 1; padding-left: 8px; }
    .msj-cla .msj-texto { color: #111; }
    .msj-osc .msj-texto { color: #fff; }

    /* CAJAS CTA */
    .contenedor-cierre { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 70vh; }
    .caja-premium-cierre {
      background-color: var(--negro); color: #fff;
      border: 1px solid #1f2937; padding: 54px; width: 100%; text-align: center;
    }
    .cierre-titulo {
      color: #fff; font-size: 24px; text-transform: uppercase;
      border-bottom: 2px solid var(--rojo); padding-bottom: 18px;
      margin-bottom: 24px; letter-spacing: 2px; font-weight: 700;
    }
    .texto-cierre { color: #e5e7eb; font-size: 23px; line-height: 1.85; margin-bottom: 18px; font-weight: 300; }
    .cierre-list { list-style: none; padding-left: 0; margin: 10px 0 20px 0; }
    .cierre-list .list-item { position: relative; padding-left: 28px; margin-bottom: 14px; font-size: 19px; color: #d1d5db; font-weight: 300; line-height: 1.7; }
    .cierre-list .list-item::before { content: "—"; color: var(--rojo); position: absolute; left: 0; top: 0; }
    .caja-cta-blanca { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid var(--rojo); padding: 28px 32px; margin-top: 32px; }
    .cta-titulo { color: var(--rojo); font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
    .cta-texto { color: #111; font-size: 19px; font-weight: 400; line-height: 1.7; }
    .black-box-cta { background-color: var(--negro); color: #fff; padding: 54px; border: 1px solid #1f2937; border-radius: 6px; width: 100%; text-align: center; }
    .black-box-cta h3 { font-size: 22px; font-weight: 700; letter-spacing: 2px; margin-bottom: 20px; color: #fff; text-transform: uppercase; border-bottom: 2px solid var(--rojo); padding-bottom: 18px; display: inline-block; }
    .black-box-cta p { font-size: 19px; font-weight: 300; line-height: 1.7; color: #e5e7eb; margin: 0 auto 36px auto; max-width: 80%; }
    .btn-premium { display: inline-block; background-color: var(--rojo); color: #fff; text-decoration: none; padding: 16px 40px; font-weight: 700; font-size: 16px; letter-spacing: 1px; border-radius: 4px; text-transform: uppercase; }
  </style>
</head>
<body>

  <div class="cover">
    <div class="logo-box">${LOGO}</div>
    <h1>PROBLEMA <span class="rojo">CERO</span></h1>
    <div class="subtitle">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
    <div class="private">INFORME PRIVADO</div>
    <div class="diag-title">Diagnóstico<br><strong>estratégico</strong></div>
    <div class="description">Una lectura estratégica diseñada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.</div>
    <div class="cover-footer">
      <div class="label">Dirección Estratégica</div>
      <div class="value">Lic. Hernán Mariano Waisman</div>
    </div>
  </div>

  <div class="page-content">${contenidoHTML}</div>

</body>
</html>`;
}

// ─────────────────────────────────────────────
// RUTA — IGUAL QUE EL ORIGINAL
// ─────────────────────────────────────────────
app.post("/*", async (req, res) => {
  let browser = null;
  try {
    const diagnostico = req.body.diagnostico || req.body.texto || req.body.problem;
    if (!diagnostico) return res.status(400).json({ error: "No se envió texto para el PDF" });

    const htmlFinal = generarPlantillaPDF(diagnostico);

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
    const page = await browser.newPage();
    await page.setContent(htmlFinal, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", bottom: "72px", left: "0px", right: "0px" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="font-size:11px;width:100%;color:#555;padding:0 80px;display:flex;justify-content:space-between;font-family:'Inter',sans-serif;letter-spacing:1px;-webkit-print-color-adjust:exact;print-color-adjust:exact;"><span style="font-weight:600;">PROBLEMA CERO</span><span>PÁGINA <span class="pageNumber"></span></span></div>`
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=Diagnostico_ProblemaCero.pdf",
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
app.listen(PORT, () => console.log(`Motor PDF Problema Cero v3.2 activo en puerto ${PORT}`));
