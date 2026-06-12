const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Motor PDF Problema Cero v4.0");
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function limpiarTexto(texto) {
  if (!texto) return "";
  return texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─────────────────────────────────────────────
// PROCESADOR DE MARKDOWN → HTML PREMIUM
// ─────────────────────────────────────────────
function procesarMarkdownAHTML(textoCrudo) {
  const textoSeguro = limpiarTexto(textoCrudo);
  const lineas = textoSeguro.split('\n');
  let htmlResult = '';
  let enLista = false;
  let ignorarResto = false;
  let enCajaCierre = false;
  let enCajaNaranja = false;
  let saltarLinea = false;
  let seccionActual = '';

  // Estado para bloques especiales
  let diasBuffer = [];
  let semanasBuffer = [];
  let ideasBuffer = [];
  let ideaActual = null;
  let metricasBuffer = [];
  let metricaActual = null;
  let siEntoncesBuffer = [];
  let mensajesBuffer = [];
  let enDias = false;
  let enSemanas = false;
  let enIdeas = false;
  let enMetricas = false;
  let enSiEntonces = false;
  let enMensajes = false;

  const prefijosIgnorar = [
    "CASO DEL CLIENTE:", "EL NEGOCIO:", "EL PROBLEMA ELEGIDO",
    "LAS BASES DEL NEGOCIO:", "EL PUNTO DE BLOQUEO:", "EL OBJETIVO A 90",
    "ANÁLISIS INICIAL:", "ANÁLISIS ESTRATÉGICO:", "MAPA DE EJECUCIÓN",
    "CASO ORIGINAL:", "RECURSOS DISPONIBLES", "FEEDBACK DEL USUARIO:",
    "DIAGNÓSTICO:", "DIAGNÓSTICO INICIAL:", "Aquí tienes el análisis"
  ];

  let contenidoEmpezado = false;

  function cerrarBuffers() {
    // Renderizar días si hay buffer
    if (enDias && diasBuffer.length) {
      htmlResult += renderizarDias(diasBuffer);
      diasBuffer = [];
      enDias = false;
    }
    // Renderizar semanas si hay buffer
    if (enSemanas && semanasBuffer.length) {
      htmlResult += renderizarSemanas(semanasBuffer);
      semanasBuffer = [];
      enSemanas = false;
    }
    // Renderizar ideas si hay buffer
    if (enIdeas && ideasBuffer.length) {
      if (ideaActual) { ideasBuffer.push(ideaActual); ideaActual = null; }
      htmlResult += renderizarIdeas(ideasBuffer);
      ideasBuffer = [];
      enIdeas = false;
    }
    // Renderizar métricas si hay buffer
    if (enMetricas && metricasBuffer.length) {
      if (metricaActual) { metricasBuffer.push(metricaActual); metricaActual = null; }
      htmlResult += renderizarMetricas(metricasBuffer);
      metricasBuffer = [];
      enMetricas = false;
    }
    // Renderizar SI/ENTONCES si hay buffer
    if (enSiEntonces && siEntoncesBuffer.length) {
      htmlResult += renderizarSiEntonces(siEntoncesBuffer);
      siEntoncesBuffer = [];
      enSiEntonces = false;
    }
    // Renderizar mensajes si hay buffer
    if (enMensajes && mensajesBuffer.length) {
      htmlResult += renderizarMensajes(mensajesBuffer);
      mensajesBuffer = [];
      enMensajes = false;
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
      cerrarBuffers();
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      if (enCajaNaranja) { htmlResult += '</div>'; enCajaNaranja = false; }
      if (enCajaCierre) { htmlResult += '</div></div>'; enCajaCierre = false; }
      htmlResult += '<div class="page-break"></div>';
      htmlResult += `
      <div class="cover-interna">
        <div class="logo-box">
          <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px">
            <circle cx="28" cy="30" r="16" stroke="white" stroke-width="3" fill="none"/>
            <line x1="28" y1="14" x2="28" y2="10" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <path d="M28 30 L44 18" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
            <circle cx="28" cy="30" r="3" fill="white"/>
            <path d="M42 10 L50 6 L46 14" fill="white"/>
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
      cerrarBuffers();
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
      cerrarBuffers();
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      if (enCajaNaranja) { htmlResult += '</div>'; enCajaNaranja = false; }
      if (enCajaCierre) { htmlResult += '</div></div>'; enCajaCierre = false; }
      htmlResult += '<div class="page-break"></div>';
      htmlResult += '<div class="contenedor-cierre"><div class="black-box-cta">';
      htmlResult += '<h3>TU SIGUIENTE NIVEL DE EJECUCIÓN</h3>';
      htmlResult += '<p>Detectar el bloqueo es vital, pero la transformación ocurre en la acción. Tenés la hoja de ruta exacta — es momento de implementar.</p>';
      htmlResult += '<a href="https://problemacero.com.ar" class="btn-premium">DESBLOQUEAR RUTA DE 30 DÍAS</a>';
      htmlResult += '</div></div>';
      ignorarResto = true;
      return;
    }

    // TU PRÓXIMO PASO
    if (limpia.includes("TU PRÓXIMO PASO:")) {
      cerrarBuffers();
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      htmlResult += '<div class="caja-cta-blanca"><p class="cta-titulo">TU PRÓXIMO PASO:</p>';
      enCajaNaranja = true;
      return;
    }

    // ── TÍTULOS DE SECCIÓN ──
    const regexTitulos = /^(?:[🧭🎯🛑🔧📅📆📌💬📊⚠️🧠⚡🔴🚀💰🔥👉⚠]\s*)?(MAPA EJECUTIVO|PRIORIDAD ABSOLUTA|QUÉ DEJAR DE HACER YA|QUÉ CORREGIR PRIMERO|PLAN DE ACCIÓN[^a-z]*|CONTENIDO QUE DEBERÍA CREAR|MENSAJES DE VENTA[^a-z]*|MÉTRICA QUE DEBERÍA MIRAR|SI \/ ENTONCES|CIERRE ESTRATÉGICO|RESUMEN RÁPIDO|PROBLEMA PRINCIPAL|QUÉ SIGNIFICA|CAUSA REAL|ACCIÓN CONCRETA|IMPACTO|CIERRE)$/i;
    const matchTitulo = limpia.match(regexTitulos);

    if (matchTitulo) {
      cerrarBuffers();
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      if (enCajaNaranja) { htmlResult += '</div>'; enCajaNaranja = false; }
      if (enCajaCierre) { htmlResult += '</div></div>'; enCajaCierre = false; }

      const tituloLimpio = matchTitulo[1].trim().toUpperCase();
      seccionActual = tituloLimpio;

      // Activar buffers según sección
      enDias = /PLAN DE ACCIÓN.*7/i.test(tituloLimpio) || (tituloLimpio === "PLAN DE ACCIÓN — PRÓXIMOS 7 DÍAS") || (tituloLimpio.includes("PLAN DE ACCIÓN") && !tituloLimpio.includes("30"));
      enSemanas = /PLAN DE ACCIÓN.*30/i.test(tituloLimpio) || tituloLimpio.includes("30 DÍAS");
      enIdeas = tituloLimpio.includes("CONTENIDO QUE DEBERÍA CREAR");
      enMetricas = tituloLimpio.includes("MÉTRICA");
      enSiEntonces = tituloLimpio.includes("SI / ENTONCES") || tituloLimpio.includes("SI/ENTONCES");
      enMensajes = tituloLimpio.includes("MENSAJES DE VENTA");

      htmlResult += '<div class="page-break"></div>';

      let kickerText = 'Lectura Estratégica';
      const titulos_decision = ["MAPA EJECUTIVO","PRIORIDAD ABSOLUTA","QUÉ DEJAR DE HACER YA","QUÉ CORREGIR PRIMERO","SI / ENTONCES"];
      const titulos_comercial = ["CONTENIDO QUE DEBERÍA CREAR","MENSAJES DE VENTA","MÉTRICA QUE DEBERÍA MIRAR"];
      if (titulos_decision.some(t => tituloLimpio.includes(t))) kickerText = 'Arquitectura de Decisiones';
      else if (titulos_comercial.some(t => tituloLimpio.includes(t))) kickerText = 'Ejecución Comercial';
      else if (tituloLimpio.startsWith("PLAN DE ACCIÓN")) kickerText = 'Arquitectura de Decisiones';

      htmlResult += `<div class="editorial-header">
        <div class="kicker">${kickerText}</div>
        <h2 class="editorial-title">${tituloLimpio}</h2>
      </div>`;
      return;
    }

    // ── CAPTURA DE DÍAS (línea de tiempo) ──
    if (enDias && !enSemanas) {
      const mDia = limpia.match(/^[-—*]\s*(?:\*\*)?D[ií]a\s*(\d+)[:\*\s]*(.*)/i);
      if (mDia) {
        diasBuffer.push({ numero: mDia[1], texto: mDia[2].replace(/\*\*/g,'').trim() });
        return;
      }
    }

    // ── CAPTURA DE SEMANAS (grilla 2x2) ──
    if (enSemanas) {
      const mSem = limpia.match(/^[-—*]\s*(?:\*\*)?Semana\s*(\d+)[:\*\s]*(.*)/i);
      if (mSem) {
        semanasBuffer.push({ numero: mSem[1], texto: mSem[2].replace(/\*\*/g,'').trim() });
        return;
      }
    }

    // ── CAPTURA DE IDEAS DE CONTENIDO ──
    if (enIdeas) {
      const mIdea = limpia.match(/^[-—*]\s*(?:Idea\s*)?(\d+)[:\.\-]?\s*$/i);
      const mGancho = limpia.match(/^[-—*]\s*(?:\*\*)?Gancho[:\*\s]*(.*)/i);
      const mTema = limpia.match(/^[-—*]\s*(?:\*\*)?Tema[:\*\s]*(.*)/i);
      const mObj = limpia.match(/^[-—*]\s*(?:\*\*)?Objetivo[:\*\s]*(.*)/i);
      if (mIdea) {
        if (ideaActual) ideasBuffer.push(ideaActual);
        ideaActual = { numero: mIdea[1], gancho:'', tema:'', objetivo:'' };
        return;
      }
      if (mGancho && ideaActual) { ideaActual.gancho = mGancho[1].replace(/\*\*/g,'').trim(); return; }
      if (mTema && ideaActual)   { ideaActual.tema   = mTema[1].replace(/\*\*/g,'').trim();   return; }
      if (mObj && ideaActual)    { ideaActual.objetivo = mObj[1].replace(/\*\*/g,'').trim();   return; }
    }

    // ── CAPTURA DE MÉTRICAS ──
    if (enMetricas) {
      const mQ = limpia.match(/^[-—*]\s*(?:\*\*)?Qu[eé] mirar[:\*\s]*(.*)/i);
      const mP = limpia.match(/^[-—*]\s*(?:\*\*)?Por qu[eé] importa[:\*\s]*(.*)/i);
      const mD = limpia.match(/^[-—*]\s*(?:\*\*)?Qu[eé] decisi[oó]n[:\*\s]*(.*)/i);
      if (mQ) {
        if (metricaActual) metricasBuffer.push(metricaActual);
        metricaActual = { que: mQ[1].replace(/\*\*/g,'').trim(), porQue:'', decision:'' };
        return;
      }
      if (mP && metricaActual) { metricaActual.porQue   = mP[1].replace(/\*\*/g,'').trim(); return; }
      if (mD && metricaActual) { metricaActual.decision = mD[1].replace(/\*\*/g,'').trim(); return; }
    }

    // ── CAPTURA DE SI/ENTONCES ──
    if (enSiEntonces) {
      const mSE = limpia.match(/^[-—*]\s*(?:\*\*)?Si\b(.*?)(?:,\s*|\s+)(?:\*\*)?entonces\b(.*)/i);
      if (mSE) {
        siEntoncesBuffer.push({
          condicion: mSE[1].replace(/\*\*/g,'').trim(),
          accion: mSE[2].replace(/\*\*/g,'').trim()
        });
        return;
      }
    }

    // ── CAPTURA DE MENSAJES DE VENTA ──
    if (enMensajes) {
      if (limpia.startsWith('- ') || limpia.startsWith('— ') || limpia.startsWith('* ')) {
        const msg = limpia.substring(2).replace(/^[""]|[""]$/g,'').trim();
        if (msg) { mensajesBuffer.push(msg); return; }
      }
    }

    // ── SUBTÍTULOS ──
    if (limpia.startsWith('👉')) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      const texto = limpia.replace('👉', '').trim();
      htmlResult += `<p class="subtitulo-seccion">${texto}</p>`;
      return;
    }

    // ── LISTAS NORMALES ──
    if (limpia.startsWith('- ') || limpia.startsWith('* ') || limpia.startsWith('— ')) {
      if (!enLista) {
        htmlResult += enCajaCierre ? '<ul class="cierre-list">' : '<ul class="editorial-list">';
        enLista = true;
      }
      let itemTexto = limpia.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      htmlResult += `<li class="list-item">${itemTexto}</li>`;
      return;
    } else if (enLista) {
      htmlResult += '</ul>';
      enLista = false;
    }

    // ── PÁRRAFOS NORMALES ──
    if (!limpia.startsWith('<')) {
      let parrafo = limpia.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (enCajaNaranja)     htmlResult += `<p class="cta-texto">${parrafo}</p>`;
      else if (enCajaCierre) htmlResult += `<p class="texto-cierre">${parrafo}</p>`;
      else                   htmlResult += `<p class="texto-editorial">${parrafo}</p>`;
    }
  });

  // Cerrar lo que quede abierto
  cerrarBuffers();
  if (enLista) htmlResult += '</ul>';
  if (enCajaNaranja) htmlResult += '</div>';
  if (enCajaCierre) htmlResult += '</div></div>';

  return htmlResult;
}

// ─────────────────────────────────────────────
// RENDERERS PREMIUM
// ─────────────────────────────────────────────

function renderizarDias(dias) {
  if (!dias.length) return '';
  let html = '<div class="timeline-container">';
  html += '<div class="timeline-linea"></div>';
  dias.forEach(d => {
    html += `<div class="timeline-item">
      <div class="timeline-nodo">
        <span class="nodo-label">DÍA</span>
        <span class="nodo-num">${d.numero}</span>
      </div>
      <div class="timeline-card">
        <span class="timeline-texto">${d.texto}</span>
      </div>
    </div>`;
  });
  html += '</div>';
  return html;
}

function renderizarSemanas(semanas) {
  if (!semanas.length) return '';
  const FONDOS = ['#0a0a0a','#dc2626','#1a1a1a','#8B0000'];
  let html = '<div class="semanas-grid">';
  semanas.forEach((sem, i) => {
    const partes = sem.texto.match(/Objetivo[:\s]+(.*?)(?:\.\s*Acci[oó]n|$)(.*)/i);
    const objetivo = partes ? partes[1].trim() : '';
    const accion = partes ? sem.texto.replace(/.*Acci[oó]n[:\s]+/i,'').trim() : sem.texto;
    html += `<div class="semana-card">
      <div class="semana-header" style="background:${FONDOS[i % FONDOS.length]}">
        <span class="semana-num-bg">${sem.numero}</span>
        <div class="semana-header-texto">
          <span class="semana-label">SEMANA</span>
          <span class="semana-objetivo">${objetivo || 'Plan de ejecución'}</span>
        </div>
      </div>
      <div class="semana-body">
        <div class="semana-accion-label">ACCIÓN</div>
        <div class="semana-accion-texto">${accion}</div>
      </div>
    </div>`;
  });
  html += '</div>';
  return html;
}

function renderizarIdeas(ideas) {
  if (!ideas.length) return '';
  const FONDOS = ['#0a0a0a','#dc2626','#1a1a1a','#8B0000','#2c2c2c'];
  let html = '';
  ideas.forEach((idea, i) => {
    html += `<div class="idea-card">
      <div class="idea-lateral" style="background:${FONDOS[i % FONDOS.length]}">
        <span class="idea-label-small">IDEA</span>
        <span class="idea-num">${idea.numero}</span>
      </div>
      <div class="idea-cuerpo">
        <div class="idea-gancho-box">
          <div class="idea-gancho-label">GANCHO</div>
          <div class="idea-gancho-texto">"${idea.gancho}"</div>
        </div>
        <div class="idea-info-row">
          ${idea.tema ? `<div class="idea-info-col"><div class="idea-col-label">TEMA</div><div class="idea-col-texto">${idea.tema}</div></div>` : ''}
          ${idea.objetivo ? `<div class="idea-info-col"><div class="idea-col-label">OBJETIVO</div><div class="idea-col-texto">${idea.objetivo}</div></div>` : ''}
        </div>
      </div>
    </div>`;
  });
  return html;
}

function renderizarMetricas(metricas) {
  if (!metricas.length) return '';
  let html = '';
  metricas.forEach((m, i) => {
    html += `<div class="metrica-item">
      <div class="metrica-header">
        <div class="metrica-badge">${i+1}</div>
        <div class="metrica-titulo">${m.que}</div>
      </div>
      ${m.porQue ? `<div class="metrica-fila"><strong>Por qué importa:</strong> ${m.porQue}</div>` : ''}
      ${m.decision ? `<div class="metrica-fila"><strong>Decisión a tomar:</strong> ${m.decision}</div>` : ''}
    </div>`;
  });
  return html;
}

function renderizarSiEntonces(items) {
  if (!items.length) return '';
  let html = '';
  items.forEach((se, i) => {
    html += `<div class="se-wrapper">
      <div class="se-escenario">ESCENARIO ${String(i+1).padStart(2,'0')}</div>
      <div class="se-flujo">
        <div class="se-si">
          <div class="se-label-top">CONDICIÓN</div>
          <div class="se-texto">Si ${se.condicion}</div>
        </div>
        <div class="se-flecha">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="se-entonces-label">ENTONCES</span>
        </div>
        <div class="se-entonces">
          <div class="se-label-top-blanco">ACCIÓN</div>
          <div class="se-texto-blanco">${se.accion || 'Ver plan de acción'}</div>
        </div>
      </div>
    </div>`;
  });
  return html;
}

function renderizarMensajes(mensajes) {
  if (!mensajes.length) return '';
  let html = '';
  mensajes.forEach((msg, i) => {
    const esOscuro = i % 2 !== 0;
    html += `<div class="mensaje-card ${esOscuro ? 'mensaje-oscuro' : 'mensaje-claro'}">
      <div class="mensaje-comilla">"</div>
      <div class="mensaje-num">${String(i+1).padStart(2,'0')}</div>
      <div class="mensaje-texto">${msg}</div>
    </div>`;
  });
  return html;
}

// ─────────────────────────────────────────────
// PLANTILLA HTML COMPLETA
// ─────────────────────────────────────────────
function generarPlantillaPDF(textoDiagnostico) {
  const contenidoHTML = procesarMarkdownAHTML(textoDiagnostico);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --rojo: #dc2626;
      --negro: #0a0a0a;
      --texto: #111111;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: var(--texto); background: #ffffff; }

    /* ── CARÁTULAS ── */
    .cover, .cover-interna {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background-color: var(--negro);
      color: #ffffff;
      padding: 60px;
      page-break-after: always;
    }
    .logo-box {
      width: 90px; height: 90px;
      border: 2px solid #333;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 32px;
    }
    .cover h1, .cover-interna h1 {
      font-size: 34px; color: #ffffff; letter-spacing: 5px;
      font-weight: 900; margin-bottom: 8px;
    }
    .rojo { color: var(--rojo); font-weight: 900; }
    .cover .subtitle, .cover-interna .subtitle {
      font-size: 14px; font-weight: 300; color: #9ca3af;
      letter-spacing: 2px; margin-bottom: 6px;
    }
    .cover .private, .cover-interna .private {
      font-size: 11px; font-weight: 600; color: #4b5563;
      letter-spacing: 5px; text-transform: uppercase; margin-bottom: 44px;
    }
    .cover .diag-title, .cover-interna .diag-title {
      font-size: 64px; font-weight: 300; line-height: 1.1;
      margin-bottom: 40px; color: #ffffff;
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
    .cover-footer .value { font-size: 19px; color: #ffffff; font-weight: 400; }

    /* ── CONTENIDO ── */
    .page-content { padding: 70px 80px; }
    .page-break { page-break-before: always; height: 1px; }

    /* ── ENCABEZADOS ── */
    .editorial-header {
      margin-bottom: 36px; padding-bottom: 18px;
      border-bottom: 2px solid #111111;
    }
    .kicker {
      font-size: 11px; color: var(--rojo); text-transform: uppercase;
      letter-spacing: 3px; font-weight: 700; margin-bottom: 10px;
    }
    .editorial-title {
      color: #111111; font-size: 32px;
      text-transform: uppercase; letter-spacing: 1px; font-weight: 800;
    }

    /* ── TEXTO ── */
    .texto-editorial {
      font-size: 23px; line-height: 1.85; color: #111111;
      font-weight: 400; margin-bottom: 22px;
    }
    .subtitulo-seccion {
      font-size: 21px; font-weight: 700; color: #111111;
      margin-bottom: 14px; margin-top: 12px;
    }
    strong { font-weight: 700; color: #000000; }

    /* ── LISTAS NORMALES ── */
    .editorial-list { list-style: none; padding-left: 0; margin: 12px 0 28px 0; }
    .list-item {
      position: relative; padding-left: 28px;
      margin-bottom: 18px; font-size: 23px;
      line-height: 1.85; color: #111111; font-weight: 400;
    }
    .editorial-list .list-item::before {
      content: "—"; color: var(--rojo); font-weight: 700;
      position: absolute; left: 0; top: 0;
    }

    /* ── LÍNEA DE TIEMPO — 7 DÍAS ── */
    .timeline-container {
      position: relative; padding-left: 88px; margin-bottom: 8px;
    }
    .timeline-linea {
      position: absolute; left: 29px; top: 10px; bottom: 10px;
      width: 3px; background: linear-gradient(to bottom, #dc2626, #333);
      border-radius: 2px;
    }
    .timeline-item {
      position: relative; margin-bottom: 16px; display: flex; align-items: center;
    }
    .timeline-nodo {
      position: absolute; left: -88px;
      width: 58px; height: 58px;
      background: var(--rojo); border-radius: 50%;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(220,38,38,0.4);
    }
    .nodo-label {
      font-size: 8px; letter-spacing: 2px; color: rgba(255,255,255,0.7);
      text-transform: uppercase; font-weight: 400;
    }
    .nodo-num {
      font-size: 22px; font-weight: 900; color: #fff; line-height: 1;
    }
    .timeline-card {
      background: #f9fafb; border: 1px solid #e5e7eb;
      border-left: 3px solid var(--rojo);
      border-radius: 0 6px 6px 0;
      padding: 16px 20px; min-height: 58px;
      display: flex; align-items: center; width: 100%;
    }
    .timeline-texto {
      font-size: 21px; font-weight: 400; color: #111111; line-height: 1.5;
    }

    /* ── GRILLA SEMANAS ── */
    .semanas-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
      margin-bottom: 8px;
    }
    .semana-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .semana-header {
      padding: 14px 18px; display: flex;
      align-items: center; gap: 12px;
    }
    .semana-num-bg {
      font-size: 44px; font-weight: 900;
      color: rgba(255,255,255,0.12); line-height: 1;
    }
    .semana-header-texto { display: flex; flex-direction: column; }
    .semana-label {
      font-size: 9px; letter-spacing: 3px;
      color: rgba(255,255,255,0.45); text-transform: uppercase;
    }
    .semana-objetivo {
      font-size: 13px; font-weight: 700;
      color: #fff; letter-spacing: 0.5px; text-transform: uppercase;
    }
    .semana-body { padding: 14px 18px; background: #f9fafb; }
    .semana-accion-label {
      font-size: 9px; font-weight: 700; letter-spacing: 2px;
      color: var(--rojo); text-transform: uppercase; margin-bottom: 6px;
    }
    .semana-accion-texto {
      font-size: 16px; font-weight: 400; color: #111111; line-height: 1.55;
    }

    /* ── TARJETAS IDEAS ── */
    .idea-card {
      display: flex; border-radius: 8px; overflow: hidden;
      margin-bottom: 14px; min-height: 88px;
    }
    .idea-lateral {
      width: 66px; flex-shrink: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .idea-label-small {
      font-size: 8px; letter-spacing: 2px;
      color: rgba(255,255,255,0.45); text-transform: uppercase;
    }
    .idea-num {
      font-size: 30px; font-weight: 900; color: #fff; line-height: 1;
    }
    .idea-cuerpo {
      flex: 1; border: 1px solid #e5e7eb;
      border-left: none; border-radius: 0 8px 8px 0;
    }
    .idea-gancho-box {
      background: #f0f0f0; padding: 12px 18px;
      border-bottom: 1px solid #e5e7eb;
    }
    .idea-gancho-label {
      font-size: 8px; font-weight: 700; letter-spacing: 3px;
      color: var(--rojo); text-transform: uppercase; margin-bottom: 4px;
    }
    .idea-gancho-texto {
      font-size: 17px; font-weight: 700;
      color: #111111; font-style: italic; line-height: 1.4;
    }
    .idea-info-row {
      display: flex; gap: 0; background: #fafafa;
      padding: 10px 18px;
    }
    .idea-info-col { flex: 1; }
    .idea-col-label {
      font-size: 8px; font-weight: 700; letter-spacing: 2px;
      color: #999; text-transform: uppercase; margin-bottom: 3px;
    }
    .idea-col-texto {
      font-size: 14px; color: #111111; line-height: 1.45;
    }

    /* ── MÉTRICAS ── */
    .metrica-item {
      background: #f4f4f4; border-left: 5px solid var(--rojo);
      padding: 20px 24px; border-radius: 0 6px 6px 0;
      margin-bottom: 16px;
    }
    .metrica-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
    }
    .metrica-badge {
      width: 28px; height: 28px; background: var(--rojo);
      border-radius: 50%; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
      font-size: 13px; font-weight: 800; color: #fff;
    }
    .metrica-titulo {
      font-size: 21px; font-weight: 700; color: #111111;
    }
    .metrica-fila {
      font-size: 17px; color: #444; line-height: 1.55; margin-bottom: 5px;
    }

    /* ── SI / ENTONCES ── */
    .se-wrapper { margin-bottom: 20px; }
    .se-escenario {
      font-size: 10px; font-weight: 700; letter-spacing: 3px;
      color: #ccc; text-transform: uppercase; margin-bottom: 8px;
    }
    .se-flujo { display: flex; align-items: stretch; }
    .se-si {
      flex: 1; background: #f4f4f4; border: 2px solid #e5e7eb;
      border-right: none; border-radius: 8px 0 0 8px; padding: 16px 18px;
    }
    .se-label-top {
      font-size: 9px; font-weight: 700; letter-spacing: 3px;
      color: #999; text-transform: uppercase; margin-bottom: 8px;
    }
    .se-texto {
      font-size: 17px; font-weight: 500; color: #111111; line-height: 1.5;
    }
    .se-flecha {
      background: var(--rojo); width: 50px; flex-shrink: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 4px;
    }
    .se-entonces-label {
      font-size: 7px; letter-spacing: 1px;
      color: rgba(255,255,255,0.6); text-transform: uppercase;
    }
    .se-entonces {
      flex: 1; background: var(--negro); border: 2px solid var(--negro);
      border-left: none; border-radius: 0 8px 8px 0; padding: 16px 18px;
    }
    .se-label-top-blanco {
      font-size: 9px; font-weight: 700; letter-spacing: 3px;
      color: rgba(255,255,255,0.4); text-transform: uppercase; margin-bottom: 8px;
    }
    .se-texto-blanco {
      font-size: 17px; font-weight: 500; color: #fff; line-height: 1.5;
    }

    /* ── MENSAJES DE VENTA ── */
    .mensaje-card {
      position: relative; padding: 30px 34px 26px;
      border-radius: 8px; margin-bottom: 18px;
    }
    .mensaje-claro {
      background: #f9fafb; border: 1px solid #e5e7eb;
    }
    .mensaje-oscuro {
      background: var(--negro); border: 1px solid var(--negro);
    }
    .mensaje-comilla {
      position: absolute; top: 8px; left: 20px;
      font-size: 80px; font-weight: 900;
      color: var(--rojo); opacity: 0.18;
      line-height: 1; font-family: Georgia, serif;
    }
    .mensaje-num {
      position: absolute; top: 14px; right: 18px;
      font-size: 11px; font-weight: 700; letter-spacing: 2px;
    }
    .mensaje-claro .mensaje-num { color: #ccc; }
    .mensaje-oscuro .mensaje-num { color: #555; }
    .mensaje-texto {
      font-size: 21px; font-weight: 500;
      line-height: 1.7; font-style: italic;
      position: relative; z-index: 1; padding-left: 10px;
    }
    .mensaje-claro .mensaje-texto { color: #111111; }
    .mensaje-oscuro .mensaje-texto { color: #ffffff; }

    /* ── CAJAS CTA ── */
    .contenedor-cierre {
      display: flex; flex-direction: column;
      justify-content: center; align-items: center; min-height: 70vh;
    }
    .caja-premium-cierre {
      background-color: var(--negro); color: #ffffff;
      border: 1px solid #1f2937; padding: 54px; width: 100%; text-align: center;
    }
    .cierre-titulo {
      color: #ffffff; font-size: 24px; text-transform: uppercase;
      border-bottom: 2px solid var(--rojo); padding-bottom: 18px;
      margin-bottom: 24px; letter-spacing: 2px; font-weight: 700;
    }
    .texto-cierre {
      color: #e5e7eb; font-size: 23px; line-height: 1.85;
      margin-bottom: 18px; font-weight: 300;
    }
    .cierre-list { list-style: none; padding-left: 0; margin: 10px 0 20px 0; }
    .cierre-list .list-item {
      position: relative; padding-left: 28px;
      margin-bottom: 14px; font-size: 19px;
      color: #d1d5db; font-weight: 300; line-height: 1.7;
    }
    .cierre-list .list-item::before {
      content: "—"; color: var(--rojo);
      position: absolute; left: 0; top: 0;
    }
    .caja-cta-blanca {
      background: #f9fafb; border: 1px solid #e5e7eb;
      border-left: 4px solid var(--rojo); padding: 28px 32px; margin-top: 32px;
    }
    .cta-titulo {
      color: var(--rojo); font-size: 12px; font-weight: 700;
      letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;
    }
    .cta-texto {
      color: #111111; font-size: 19px; font-weight: 400; line-height: 1.7;
    }
    .black-box-cta {
      background-color: var(--negro); color: #ffffff;
      padding: 54px; border: 1px solid #1f2937;
      border-radius: 6px; width: 100%; text-align: center;
    }
    .black-box-cta h3 {
      font-size: 22px; font-weight: 700; letter-spacing: 2px;
      margin-bottom: 20px; color: #ffffff; text-transform: uppercase;
      border-bottom: 2px solid var(--rojo); padding-bottom: 18px;
      display: inline-block;
    }
    .black-box-cta p {
      font-size: 19px; font-weight: 300; line-height: 1.7;
      color: #e5e7eb; margin: 0 auto 36px auto; max-width: 80%;
    }
    .btn-premium {
      display: inline-block; background-color: var(--rojo);
      color: #ffffff; text-decoration: none;
      padding: 16px 40px; font-weight: 700; font-size: 16px;
      letter-spacing: 1px; border-radius: 4px; text-transform: uppercase;
    }
  </style>
</head>
<body>

  <!-- CARÁTULA PRINCIPAL -->
  <div class="cover">
    <div class="logo-box">
      <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px">
        <circle cx="28" cy="30" r="16" stroke="white" stroke-width="3" fill="none"/>
        <line x1="28" y1="14" x2="28" y2="10" stroke="white" stroke-width="3" stroke-linecap="round"/>
        <path d="M28 30 L44 18" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
        <circle cx="28" cy="30" r="3" fill="white"/>
        <path d="M42 10 L50 6 L46 14" fill="white"/>
      </svg>
    </div>
    <h1>PROBLEMA <span class="rojo">CERO</span></h1>
    <div class="subtitle">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
    <div class="private">INFORME PRIVADO</div>
    <div class="diag-title">Diagnóstico<br>estratégico</div>
    <div class="description">Una lectura estratégica diseñada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.</div>
    <div class="cover-footer">
      <div class="label">Dirección Estratégica</div>
      <div class="value">Lic. Hernán Mariano Waisman</div>
    </div>
  </div>

  <!-- CONTENIDO -->
  <div class="page-content">${contenidoHTML}</div>

</body>
</html>`;
}

// ─────────────────────────────────────────────
// RUTA PRINCIPAL — igual que el original
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
      footerTemplate: `<div style="font-size:11px;width:100%;color:#555555;padding:0 80px;display:flex;justify-content:space-between;font-family:'Inter',sans-serif;letter-spacing:1px;-webkit-print-color-adjust:exact;print-color-adjust:exact;"><span style="font-weight:600;">PROBLEMA CERO</span><span>PÁGINA <span class="pageNumber"></span></span></div>`
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
app.listen(PORT, () => console.log(`Motor PDF Problema Cero v4.0 activo en puerto ${PORT}`));
