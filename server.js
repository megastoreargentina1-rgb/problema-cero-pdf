const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Motor PDF Problema Cero v5.1");
});

// ─────────────────────────────────────────────
// LOGO — lee logo.png del repositorio
// ─────────────────────────────────────────────
let LOGO_BASE64 = null;
try {
  const logoPath = path.join(__dirname, "logo.png");
  if (fs.existsSync(logoPath)) {
    LOGO_BASE64 = "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");
  }
} catch (e) {
  console.log("Logo no encontrado, usando fallback.");
}

function getLogoTag() {
  if (LOGO_BASE64) {
    return `<img src="${LOGO_BASE64}" alt="Problema Cero" class="logo-portada">`;
  }
  return `<div class="logo-fallback">P<span>0</span></div>`;
}

function limpiarTexto(texto) {
  if (!texto) return "";
  return texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sinMd(t) {
  return String(t || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .trim();
}

// ─────────────────────────────────────────────
// RENDERS VISUALES
// ─────────────────────────────────────────────
function renderDias(dias) {
  if (!dias.length) return "";
  let h = '<div class="timeline"><div class="timeline-rail"></div>';
  dias.forEach(d => {
    h += `<div class="tl-item">
      <div class="tl-nodo">
        <span class="tl-nodo-label">DÍA</span>
        <span class="tl-nodo-num">${limpiarTexto(d.numero)}</span>
      </div>
      <div class="tl-card">
        <div class="tl-texto">${limpiarTexto(d.texto)}</div>
      </div>
    </div>`;
  });
  return h + "</div>";
}

function renderSemanas(sems) {
  if (!sems.length) return "";
  const BG = ["#0a0a0a", "#dc2626", "#1a1a1a", "#7f1d1d"];
  let h = '<div class="semanas-grid">';
  sems.forEach((s, i) => {
    h += `<div class="sem-card">
      <div class="sem-header" style="background:${BG[i % BG.length]}">
        <span class="sem-num-bg">${limpiarTexto(s.numero)}</span>
        <div class="sem-info">
          <span class="sem-label">SEMANA</span>
          <span class="sem-obj">${limpiarTexto(s.objetivo || "Ejecución")}</span>
        </div>
      </div>
      <div class="sem-body">
        <div class="sem-acc-label">ACCIÓN</div>
        <div class="sem-acc-texto">${limpiarTexto(s.accion)}</div>
      </div>
    </div>`;
  });
  return h + "</div>";
}

function renderIdeas(ideas) {
  if (!ideas.length) return "";
  const BG = ["#0a0a0a", "#dc2626", "#1a1a1a", "#7f1d1d", "#2c2c2c"];
  return ideas.map((idea, i) => `
  <div class="idea-card">
    <div class="idea-lat" style="background:${BG[i % BG.length]}">
      <span class="idea-lat-label">IDEA</span>
      <span class="idea-lat-num">${limpiarTexto(idea.numero)}</span>
    </div>
    <div class="idea-cuerpo">
      <div class="idea-gancho-box">
        <div class="idea-gancho-label">GANCHO</div>
        <div class="idea-gancho">"${limpiarTexto(idea.gancho)}"</div>
      </div>
      <div class="idea-meta">
        ${idea.tema ? `<div class="idea-col"><div class="idea-col-label">TEMA</div><div class="idea-col-val">${limpiarTexto(idea.tema)}</div></div>` : ""}
        ${idea.objetivo ? `<div class="idea-col"><div class="idea-col-label">OBJETIVO</div><div class="idea-col-val">${limpiarTexto(idea.objetivo)}</div></div>` : ""}
      </div>
    </div>
  </div>`).join("");
}

function renderSiEntonces(items) {
  if (!items.length) return "";
  return items.map((se, i) => `
  <div class="se-bloque">
    <div class="se-num">ESCENARIO ${String(i + 1).padStart(2, "0")}</div>
    <div class="se-flujo">
      <div class="se-si">
        <div class="se-si-label">CONDICIÓN</div>
        <div class="se-si-texto">Si ${limpiarTexto(se.condicion)}</div>
      </div>
      <div class="se-flecha">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="se-flecha-label">ENTONCES</span>
      </div>
      <div class="se-entonces">
        <div class="se-entonces-label">ACCIÓN</div>
        <div class="se-entonces-texto">${limpiarTexto(se.accion) || "Ver plan"}</div>
      </div>
    </div>
  </div>`).join("");
}

function renderMensajes(msjs) {
  if (!msjs.length) return "";
  return msjs.map((m, i) => {
    const osc = i % 2 !== 0;
    return `<div class="msj-card ${osc ? "msj-osc" : "msj-cla"}">
      <div class="msj-comilla">"</div>
      <div class="msj-num">${String(i + 1).padStart(2, "0")}</div>
      <div class="msj-texto">${limpiarTexto(m)}</div>
    </div>`;
  }).join("");
}

function renderMetricas(items) {
  if (!items.length) return "";
  return items.map((m, i) => `
  <div class="metrica-card">
    <div class="metrica-badge">${i + 1}</div>
    <div class="metrica-body">
      <div class="metrica-que">${limpiarTexto(m.que)}</div>
      ${m.porQue ? `<div class="metrica-row"><span class="metrica-label">POR QUÉ IMPORTA</span><div class="metrica-val">${limpiarTexto(m.porQue)}</div></div>` : ""}
      ${m.decision ? `<div class="metrica-row"><span class="metrica-label">QUÉ DECISIÓN TOMAR</span><div class="metrica-val">${limpiarTexto(m.decision)}</div></div>` : ""}
    </div>
  </div>`).join("");
}

// ─────────────────────────────────────────────
// PARSER
// ─────────────────────────────────────────────
function parsearTexto(textoCrudo) {
  const texto = textoCrudo
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lineas = texto.split("\n");
  const secciones = [];
  let seccionActual = null;
  let enLista = false;

  let diasBuf = [], semanasBuf = [], ideasBuf = [], siEntoncesBuf = [];
  let mensajesBuf = [], metricasBuf = [];
  let ideaActual = null, metricaActual = null;

  let enDias = false, enSemanas = false, enIdeas = false;
  let enSiEntonces = false, enMensajes = false, enMetricas = false;

  const IGNORAR = [
    "CASO DEL CLIENTE:", "EL NEGOCIO:", "EL PROBLEMA ELEGIDO",
    "LAS BASES DEL NEGOCIO:", "EL PUNTO DE BLOQUEO:", "EL OBJETIVO A 90",
    "ANÁLISIS INICIAL:", "ANÁLISIS ESTRATÉGICO:", "ANÁLISIS COMPLETO:",
    "CASO ORIGINAL:", "RECURSOS DISPONIBLES", "FEEDBACK DEL USUARIO:",
    "Aquí tienes el análisis", "🚀 Etapa privada", "🧠 Para armar",
    "🔎 Feedback", "Del 1 al 10", "El resultado depende",
    "¿Tenés más TIEMPO", "¿Este análisis", "¿Qué punto específico",
    "Logo Problema Cero", "PROBLEMA CERO", "Lic. Hernán",
    "Director Estratégico", "Mi objetivo no es"
  ];

  const RX_TITULO = /^(?:[🧭🎯🛑🔧📅📆📌💬📊⚠️🧠⚡🔴🚀💰🔥👉⚠🔎]\s*)?(MAPA EJECUTIVO|PRIORIDAD ABSOLUTA|QUÉ DEJAR DE HACER YA|QUÉ CORREGIR PRIMERO|PLAN DE ACCIÓN.*|CONTENIDO QUE DEBER[ÍI]A CREAR|MENSAJES DE VENTA.*|M[ÉE]TRICA.*MIRAR|SI\s*\/\s*ENTONCES|CIERRE ESTRATÉGICO|RESUMEN RÁPIDO|PROBLEMA PRINCIPAL|QUÉ SIGNIFICA|CAUSA REAL|ACCI[ÓO]N CONCRETA|IMPACTO|CIERRE)$/i;

  const RX_CTA = /ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL/i;

  let contenidoEmpezado = false;

  function kickerPara(titulo) {
    const t = titulo.toUpperCase();
    if (/RESUMEN|PROBLEMA PRINCIPAL|QUÉ SIGNIFICA|CAUSA REAL|IMPACTO|CIERRE/.test(t)) return "Lectura Estratégica";
    if (/MAPA EJECUTIVO|PRIORIDAD|DEJAR|CORREGIR|SI.*ENTONCES/.test(t)) return "Arquitectura de Decisiones";
    if (/PLAN.*7|PLAN.*30|PLAN DE ACCIÓN/.test(t)) return "Plan de Ejecución";
    if (/CONTENIDO|MENSAJES|MÉTRICA|METRICA/.test(t)) return "Ejecución Comercial";
    if (/ACCIÓN CONCRETA/.test(t)) return "Próximos Pasos";
    return "Análisis Estratégico";
  }

  function volcarBuffers() {
    if (!seccionActual) return;
    if (enLista) { seccionActual.html += "</ul>"; enLista = false; }
    if (enDias && diasBuf.length) { seccionActual.html += renderDias(diasBuf); diasBuf = []; enDias = false; }
    if (enSemanas && semanasBuf.length) { seccionActual.html += renderSemanas(semanasBuf); semanasBuf = []; enSemanas = false; }
    if (enIdeas) {
      if (ideaActual) { ideasBuf.push(ideaActual); ideaActual = null; }
      if (ideasBuf.length) { seccionActual.html += renderIdeas(ideasBuf); ideasBuf = []; }
      enIdeas = false;
    }
    if (enSiEntonces && siEntoncesBuf.length) { seccionActual.html += renderSiEntonces(siEntoncesBuf); siEntoncesBuf = []; enSiEntonces = false; }
    if (enMensajes && mensajesBuf.length) { seccionActual.html += renderMensajes(mensajesBuf); mensajesBuf = []; enMensajes = false; }
    if (enMetricas) {
      if (metricaActual) { metricasBuf.push(metricaActual); metricaActual = null; }
      if (metricasBuf.length) { seccionActual.html += renderMetricas(metricasBuf); metricasBuf = []; }
      enMetricas = false;
    }
  }

  function nuevaSeccion(titulo) {
    volcarBuffers();
    if (seccionActual) secciones.push(seccionActual);
    seccionActual = { titulo, kicker: kickerPara(titulo), html: "" };
    const t = titulo.toUpperCase();
    enDias       = /PLAN.*7|PRÓXIMOS 7/.test(t) || (/PLAN DE ACCIÓN/.test(t) && !/30/.test(t));
    enSemanas    = /PLAN.*30|PRÓXIMOS 30/.test(t) || (/PLAN DE ACCIÓN/.test(t) && /30/.test(t));
    enIdeas      = /CONTENIDO QUE DEBER/.test(t);
    enSiEntonces = /SI.*ENTONCES/.test(t);
    enMensajes   = /MENSAJES DE VENTA/.test(t);
    enMetricas   = /M[ÉE]TRICA/.test(t);
  }

  lineas.forEach(linea => {
    const limpia = linea.trim();
    if (!limpia) return;
    if (limpia.match(/^━+$/) || limpia.match(/^═+$/)) return;
    if (IGNORAR.some(p => limpia.startsWith(p))) return;

    if (RX_CTA.test(limpia)) {
      volcarBuffers();
      if (seccionActual) secciones.push(seccionActual);
      seccionActual = { titulo: "CTA", kicker: "", html: "", esCTA: true };
      return;
    }

    const mT = limpia.match(RX_TITULO);
    if (mT) {
      contenidoEmpezado = true;
      nuevaSeccion(mT[1].trim().toUpperCase());
      return;
    }

    if (!contenidoEmpezado) return;
    if (!seccionActual) return;

    // Subtítulos 👉
    if (limpia.startsWith("👉")) {
      if (enLista) { seccionActual.html += "</ul>"; enLista = false; }
      const sub = sinMd(limpia.replace(/^👉\s*/, ""));
      if (/tu problema principal/i.test(sub)) {
        seccionActual.html += `<div class="resumen-label">Tu problema principal:</div><div class="resumen-valor">${limpiarTexto(sub.replace(/^tu problema principal[:\s]*/i, ""))}</div>`;
      } else if (/qué está pasando|que está pasando/i.test(sub)) {
        seccionActual.html += `<div class="resumen-label">Qué está pasando:</div>`;
      } else if (/qué deberías corregir|que deberías corregir/i.test(sub)) {
        seccionActual.html += `<div class="resumen-label">Qué deberías corregir primero:</div>`;
      } else {
        seccionActual.html += `<p class="subtitulo-seccion">${limpiarTexto(sub)}</p>`;
      }
      return;
    }

    // Captura días
    if (enDias) {
      const m = limpia.match(/^[-—*]?\s*\*{0,2}D[ií]a\s*(\d+)\*{0,2}[:\s]+(.+)/i);
      if (m) { diasBuf.push({ numero: m[1], texto: sinMd(m[2]) }); return; }
    }

    // Captura semanas
    if (enSemanas) {
      const m = limpia.match(/^[-—*]?\s*\*{0,2}Semana\s*(\d+)\*{0,2}[:\s]+(.+)/i);
      if (m) {
        const resto = sinMd(m[2]);
        const mObj = resto.match(/Objetivo[:\s]+([^.]+?)(?:\s+Acci[oó]n|$)/i);
        const mAcc = resto.match(/Acci[oó]n[:\s]+(.+)/i);
        semanasBuf.push({
          numero: m[1],
          objetivo: mObj ? mObj[1].trim() : resto.substring(0, 60),
          accion: mAcc ? mAcc[1].trim() : resto
        });
        return;
      }
    }

    // Captura ideas
    if (enIdeas) {
      const mNum = limpia.match(/^[-—*]?\s*\*{0,2}Idea\s*(\d+)\*{0,2}[:\s]*$/i);
      const mG   = limpia.match(/\*{0,2}Gancho\*{0,2}[:\s]+(.+)/i);
      const mT2  = limpia.match(/\*{0,2}Tema\*{0,2}[:\s]+(.+)/i);
      const mO   = limpia.match(/\*{0,2}Objetivo\*{0,2}[:\s]+(.+)/i);
      if (mNum) {
        if (ideaActual) ideasBuf.push(ideaActual);
        ideaActual = { numero: mNum[1], gancho: "", tema: "", objetivo: "" };
        return;
      }
      if (mG) {
        if (!ideaActual) ideaActual = { numero: String(ideasBuf.length + 1), gancho: "", tema: "", objetivo: "" };
        ideaActual.gancho = sinMd(mG[1]); return;
      }
      if (mT2 && ideaActual) { ideaActual.tema = sinMd(mT2[1]); return; }
      if (mO && ideaActual) {
        ideaActual.objetivo = sinMd(mO[1]);
        if (ideaActual.gancho && ideaActual.tema) { ideasBuf.push(ideaActual); ideaActual = null; }
        return;
      }
    }

    // Captura si/entonces
    if (enSiEntonces) {
      const m = limpia.match(/^[-—*]?\s*\*{0,2}Si\*{0,2}\s+(.*?),?\s+\*{0,2}entonces\*{0,2}\s+(.*)/i);
      if (m) { siEntoncesBuf.push({ condicion: sinMd(m[1]), accion: sinMd(m[2]) }); return; }
    }

    // Captura mensajes
    if (enMensajes) {
      const m1 = limpia.match(/^[-—*]?\s*[""""](.+)[""""]/);
      if (m1) { mensajesBuf.push(sinMd(m1[1])); return; }
      if ((limpia.startsWith("- ") || limpia.startsWith("— ")) && limpia.length > 12) {
        const msg = limpia.substring(2).replace(/^[""""]/,"").replace(/[""""]\s*$/,"").trim();
        if (msg.length > 10) { mensajesBuf.push(sinMd(msg)); return; }
      }
    }

    // Captura métricas
    if (enMetricas) {
      const mQue = limpia.match(/\*{0,2}(?:Qué mirar|Métrica)\*{0,2}[:\s]+(.+)/i);
      const mPQ  = limpia.match(/\*{0,2}Por qué importa\*{0,2}[:\s]+(.+)/i);
      const mDec = limpia.match(/\*{0,2}Qué decisión tomar\*{0,2}[:\s]+(.+)/i);
      if (mQue) { if (metricaActual) metricasBuf.push(metricaActual); metricaActual = { que: sinMd(mQue[1]), porQue: "", decision: "" }; return; }
      if (mPQ && metricaActual) { metricaActual.porQue = sinMd(mPQ[1]); return; }
      if (mDec && metricaActual) { metricaActual.decision = sinMd(mDec[1]); return; }
    }

    // Listas normales
    if (limpia.startsWith("- ") || limpia.startsWith("* ") || limpia.startsWith("— ")) {
      if (!enLista) { seccionActual.html += '<ul class="editorial-list">'; enLista = true; }
      const itemTexto = limpia.substring(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      seccionActual.html += `<li class="list-item">${itemTexto}</li>`;
      return;
    } else if (enLista) { seccionActual.html += "</ul>"; enLista = false; }

    // Párrafo normal
    if (!limpia.startsWith("<")) {
      const p = limpia.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      seccionActual.html += `<p class="texto-editorial">${p}</p>`;
    }
  });

  volcarBuffers();
  if (seccionActual) secciones.push(seccionActual);
  return secciones;
}

// ─────────────────────────────────────────────
// GENERAR HTML
// ─────────────────────────────────────────────
function generarHTML(texto) {
  const secciones = parsearTexto(texto);

  let paginasHTML = "";
  secciones.forEach(sec => {
    if (sec.esCTA) {
      paginasHTML += `
      <div class="pagina pagina-cta">
        <div class="cta-inner">
          <h2 class="cta-titulo">ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL</h2>
          <p class="cta-desc">Detectar el problema es importante. Pero el cambio aparece cuando sabés qué corregir primero, qué dejar de hacer y cómo ordenar los próximos pasos.</p>
          <div class="cta-box">
            <div class="cta-box-label">TU PRÓXIMO PASO:</div>
            <p class="cta-box-texto">Volvé a la pestaña de la web <strong>problemacero.com.ar</strong> y tocá el botón para desbloquear tu Análisis Completo ahora mismo.</p>
          </div>
        </div>
      </div>`;
      return;
    }
    paginasHTML += `
    <div class="pagina pagina-contenido">
      <div class="editorial-header">
        <div class="kicker">${limpiarTexto(sec.kicker)}</div>
        <h2 class="editorial-title">${limpiarTexto(sec.titulo)}</h2>
        <div class="titulo-linea"></div>
      </div>
      <div class="editorial-body">${sec.html}</div>
    </div>`;
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { --rojo: #dc2626; --negro: #0a0a0a; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #111; }
    .pagina { width: 210mm; min-height: 297mm; page-break-after: always; break-after: page; position: relative; overflow: hidden; }
    .pagina-caratula { background: var(--negro); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 60px 70px; color: #fff; }
    .logo-portada { width: 160px; margin-bottom: 32px; }
    .logo-fallback { width: 100px; height: 100px; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 52px; font-weight: 900; color: #fff; margin-bottom: 32px; }
    .logo-fallback span { color: var(--rojo); }
    .caratula-brand { font-size: 22px; font-weight: 900; letter-spacing: 6px; color: var(--rojo); margin-bottom: 6px; }
    .caratula-sub { font-size: 11px; letter-spacing: 3px; color: #888; margin-bottom: 4px; }
    .caratula-tag { font-size: 10px; letter-spacing: 5px; color: #555; margin-bottom: 48px; }
    .caratula-titulo { font-size: 62px; font-weight: 300; color: #fff; line-height: 1.1; margin-bottom: 36px; }
    .caratula-divider { width: 100%; height: 1px; background: linear-gradient(to right, transparent, #444, transparent); margin: 20px 0; }
    .caratula-desc { font-size: 18px; color: #aaa; line-height: 1.7; font-weight: 300; max-width: 520px; }
    .caratula-firma { margin-top: 36px; }
    .caratula-firma-label { font-size: 9px; letter-spacing: 4px; color: #555; margin-bottom: 6px; }
    .caratula-firma-name { font-size: 20px; color: #fff; font-weight: 400; }
    .pagina-contenido { padding: 64px 80px 80px 80px; }
    .editorial-header { margin-bottom: 32px; }
    .kicker { font-size: 10px; color: var(--rojo); text-transform: uppercase; letter-spacing: 4px; font-weight: 700; margin-bottom: 10px; }
    .editorial-title { font-size: 36px; font-weight: 800; color: #111; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .titulo-linea { width: 52px; height: 5px; background: var(--rojo); }
    .editorial-body { margin-top: 28px; }
    .texto-editorial { font-size: 22px; line-height: 1.85; color: #111; font-weight: 400; margin-bottom: 20px; }
    .subtitulo-seccion { font-size: 20px; font-weight: 700; color: #111; margin-bottom: 12px; margin-top: 10px; }
    strong { font-weight: 700; }
    .resumen-label { font-size: 10px; font-weight: 700; letter-spacing: 3px; color: var(--rojo); text-transform: uppercase; margin-bottom: 6px; margin-top: 20px; }
    .resumen-valor { font-size: 22px; color: #111; line-height: 1.6; font-weight: 300; margin-bottom: 16px; }
    .editorial-list { list-style: none; padding-left: 0; margin: 8px 0 24px 0; }
    .list-item { position: relative; padding-left: 28px; margin-bottom: 18px; font-size: 22px; line-height: 1.8; color: #111; font-weight: 400; }
    .editorial-list .list-item::before { content: "—"; color: var(--rojo); font-weight: 700; position: absolute; left: 0; top: 0; }
    .timeline { position: relative; padding-left: 88px; margin-top: 8px; }
    .timeline-rail { position: absolute; left: 30px; top: 8px; bottom: 8px; width: 4px; background: linear-gradient(to bottom, #dc2626, #333); border-radius: 2px; }
    .tl-item { position: relative; margin-bottom: 14px; min-height: 66px; display: flex; align-items: center; }
    .tl-nodo { position: absolute; left: -86px; width: 62px; height: 62px; background: var(--rojo); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(220,38,38,.4); }
    .tl-nodo-label { font-size: 7px; letter-spacing: 2px; color: rgba(255,255,255,.65); text-transform: uppercase; }
    .tl-nodo-num { font-size: 24px; font-weight: 900; color: #fff; line-height: 1; }
    .tl-card { background: #fafafa; border: 1px solid #e8e8e8; border-left: 4px solid var(--rojo); border-radius: 0 6px 6px 0; padding: 14px 18px; flex: 1; }
    .tl-texto { font-size: 20px; color: #111; line-height: 1.55; font-weight: 400; }
    .semanas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 8px; }
    .sem-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .sem-header { padding: 16px 18px; display: flex; align-items: center; gap: 12px; }
    .sem-num-bg { font-size: 50px; font-weight: 900; color: rgba(255,255,255,.12); line-height: 1; flex-shrink: 0; }
    .sem-info { display: flex; flex-direction: column; }
    .sem-label { font-size: 8px; letter-spacing: 3px; color: rgba(255,255,255,.4); text-transform: uppercase; }
    .sem-obj { font-size: 12px; font-weight: 700; color: #fff; text-transform: uppercase; margin-top: 3px; line-height: 1.3; }
    .sem-body { padding: 14px 18px; background: #fafafa; }
    .sem-acc-label { font-size: 8px; font-weight: 700; letter-spacing: 2px; color: var(--rojo); text-transform: uppercase; margin-bottom: 5px; }
    .sem-acc-texto { font-size: 16px; color: #111; line-height: 1.6; }
    .idea-card { display: flex; border-radius: 8px; overflow: hidden; margin-bottom: 14px; min-height: 90px; }
    .idea-lat { width: 66px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .idea-lat-label { font-size: 7px; letter-spacing: 2px; color: rgba(255,255,255,.4); text-transform: uppercase; }
    .idea-lat-num { font-size: 30px; font-weight: 900; color: #fff; line-height: 1; }
    .idea-cuerpo { flex: 1; border: 1px solid #e0e0e0; border-left: none; border-radius: 0 8px 8px 0; }
    .idea-gancho-box { background: #f0f0f0; padding: 10px 16px; border-bottom: 1px solid #e0e0e0; }
    .idea-gancho-label { font-size: 8px; font-weight: 700; letter-spacing: 3px; color: var(--rojo); text-transform: uppercase; margin-bottom: 3px; }
    .idea-gancho { font-size: 17px; font-weight: 700; color: #111; font-style: italic; line-height: 1.4; }
    .idea-meta { display: flex; padding: 10px 16px; background: #fafafa; gap: 14px; }
    .idea-col { flex: 1; }
    .idea-col-label { font-size: 7px; font-weight: 700; letter-spacing: 2px; color: #999; text-transform: uppercase; margin-bottom: 3px; }
    .idea-col-val { font-size: 14px; color: #111; line-height: 1.4; }
    .se-bloque { margin-bottom: 18px; }
    .se-num { font-size: 9px; font-weight: 700; letter-spacing: 3px; color: #ccc; text-transform: uppercase; margin-bottom: 6px; }
    .se-flujo { display: flex; align-items: stretch; }
    .se-si { flex: 1; background: #f4f4f4; border: 2px solid #e0e0e0; border-right: none; border-radius: 8px 0 0 8px; padding: 16px 18px; }
    .se-si-label { font-size: 8px; font-weight: 700; letter-spacing: 3px; color: #aaa; text-transform: uppercase; margin-bottom: 6px; }
    .se-si-texto { font-size: 17px; font-weight: 500; color: #111; line-height: 1.5; }
    .se-flecha { background: var(--rojo); width: 52px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; }
    .se-flecha-label { font-size: 7px; letter-spacing: 1px; color: rgba(255,255,255,.6); text-transform: uppercase; }
    .se-entonces { flex: 1; background: var(--negro); border: 2px solid var(--negro); border-left: none; border-radius: 0 8px 8px 0; padding: 16px 18px; }
    .se-entonces-label { font-size: 8px; font-weight: 700; letter-spacing: 3px; color: rgba(255,255,255,.35); text-transform: uppercase; margin-bottom: 6px; }
    .se-entonces-texto { font-size: 17px; font-weight: 500; color: #fff; line-height: 1.5; }
    .msj-card { position: relative; padding: 28px 32px 24px; border-radius: 8px; margin-bottom: 14px; }
    .msj-cla { background: #fafafa; border: 1px solid #e0e0e0; }
    .msj-osc { background: var(--negro); }
    .msj-comilla { position: absolute; top: 4px; left: 14px; font-size: 80px; font-weight: 900; color: var(--rojo); opacity: .15; line-height: 1; font-family: Georgia, serif; }
    .msj-num { position: absolute; top: 12px; right: 16px; font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #aaa; }
    .msj-texto { font-size: 20px; font-weight: 500; line-height: 1.7; font-style: italic; position: relative; z-index: 1; padding-left: 6px; }
    .msj-cla .msj-texto { color: #111; }
    .msj-osc .msj-texto { color: #fff; }
    .metrica-card { display: flex; gap: 20px; background: #f5f5f5; border-left: 5px solid var(--rojo); padding: 20px 22px; margin-bottom: 16px; border-radius: 0 8px 8px 0; align-items: flex-start; }
    .metrica-badge { width: 40px; height: 40px; background: var(--rojo); border-radius: 50%; color: #fff; font-size: 17px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .metrica-body { flex: 1; }
    .metrica-que { font-size: 19px; font-weight: 700; color: #111; margin-bottom: 10px; }
    .metrica-row { margin-bottom: 8px; }
    .metrica-label { font-size: 9px; letter-spacing: 2px; font-weight: 700; color: var(--rojo); text-transform: uppercase; display: block; margin-bottom: 2px; }
    .metrica-val { font-size: 16px; color: #333; line-height: 1.5; }
    .pagina-cta { background: var(--negro); display: flex; align-items: center; justify-content: center; padding: 80px; }
    .cta-inner { max-width: 520px; text-align: center; }
    .cta-titulo { font-size: 26px; font-weight: 700; color: #fff; letter-spacing: 2px; text-transform: uppercase; border-bottom: 2px solid var(--rojo); padding-bottom: 20px; margin-bottom: 28px; }
    .cta-desc { font-size: 20px; color: #aaa; line-height: 1.7; font-weight: 300; margin-bottom: 36px; }
    .cta-box { background: #1a1a1a; border-left: 4px solid var(--rojo); padding: 24px 28px; text-align: left; }
    .cta-box-label { font-size: 10px; letter-spacing: 3px; color: var(--rojo); font-weight: 700; text-transform: uppercase; margin-bottom: 10px; }
    .cta-box-texto { font-size: 18px; color: #ddd; line-height: 1.6; font-weight: 300; }
  </style>
</head>
<body>
  <div class="pagina pagina-caratula">
    ${getLogoTag()}
    <div class="caratula-brand">PROBLEMA CERO</div>
    <div class="caratula-sub">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
    <div class="caratula-tag">I N F O R M E &nbsp; P R I V A D O</div>
    <div class="caratula-titulo">Diagnóstico<br>estratégico</div>
    <div class="caratula-divider"></div>
    <div class="caratula-desc">Una lectura estratégica diseñada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.</div>
    <div class="caratula-firma">
      <div class="caratula-firma-label">D I R E C C I Ó N &nbsp; E S T R A T É G I C A</div>
      <div class="caratula-firma-name">Lic. Hernán Mariano Waisman</div>
    </div>
  </div>
  ${paginasHTML}
</body>
</html>`;
}

// ─────────────────────────────────────────────
// RUTA PRINCIPAL
// ─────────────────────────────────────────────
app.post("/*", async (req, res) => {
  let browser = null;
  try {
    const diagnostico = req.body.diagnostico || req.body.texto || req.body.problem;
    if (!diagnostico) return res.status(400).json({ error: "No se envió texto para el PDF" });

    const htmlFinal = generarHTML(diagnostico);

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process"
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlFinal, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", bottom: "72px", left: "0px", right: "0px" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="font-size:11px;width:100%;color:#555;padding:0 80px;display:flex;justify-content:space-between;font-family:'Inter',sans-serif;letter-spacing:1px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        <span style="font-weight:700;color:#dc2626;letter-spacing:3px;">PROBLEMA CERO</span>
        <span>PÁGINA <span class="pageNumber"></span></span>
      </div>`
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
app.listen(PORT, () => console.log(`Motor PDF Problema Cero v5.1 activo en puerto ${PORT}`));
