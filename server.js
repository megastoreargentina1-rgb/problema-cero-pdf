const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Motor PDF Problema Cero v4.0");
});

function limpiarTexto(texto) {
  if (!texto) return "";
  return texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function esPlanAccion(texto) {
  return texto.includes("ANÁLISIS COMPLETO:");
}

// ── PROCESADOR DIAGNÓSTICO ──────────────────────────────────

function procesarDiagnostico(textoCrudo) {
  const textoSeguro = limpiarTexto(textoCrudo);
  const lineas = textoSeguro.split('\n');
  let html = '';
  let enLista = false;
  let enCajaCierre = false;
  let enCajaNaranja = false;
  let ignorar = false;
  let contenidoEmpezado = false;

  const TITULOS_RE = /^(?:[🧭🎯🛑🔧📅📆📌💬📊⚠️🧠⚡🔴🚀💰🔥👉⚠]\s*)?(MAPA EJECUTIVO|PRIORIDAD ABSOLUTA|QUÉ DEJAR DE HACER YA|QUÉ CORREGIR PRIMERO|PLAN DE ACCIÓN[^a-z]*|CONTENIDO QUE DEBERÍA CREAR|MENSAJES DE VENTA[^a-z]*|MÉTRICA QUE DEBERÍA MIRAR|SI \/ ENTONCES|CIERRE ESTRATÉGICO|RESUMEN RÁPIDO|PROBLEMA PRINCIPAL|QUÉ SIGNIFICA|CAUSA REAL|ACCIÓN CONCRETA|IMPACTO|CIERRE)$/i;

  const IGNORAR_PREFIJOS = ["CASO DEL CLIENTE:","EL NEGOCIO:","EL PROBLEMA ELEGIDO","LAS BASES DEL NEGOCIO:","EL PUNTO DE BLOQUEO:","EL OBJETIVO A 90","ANÁLISIS INICIAL:","ANÁLISIS ESTRATÉGICO:","ANÁLISIS COMPLETO:","CASO ORIGINAL:","RECURSOS DISPONIBLES","FEEDBACK DEL USUARIO:","DIAGNÓSTICO:","DIAGNÓSTICO INICIAL:"];

  lineas.forEach(linea => {
    if (ignorar) return;
    let limpia = linea.trim();
    if (!limpia) return;
    if (IGNORAR_PREFIJOS.some(p => limpia.startsWith(p))) return;
    if (limpia.includes("━━━━━━━━━━━━━━━━━━━━") || limpia === "•") {
      if (enLista) { html += '</ul>'; enLista = false; }
      return;
    }

    const esTitulo = TITULOS_RE.test(limpia);
    if (esTitulo) contenidoEmpezado = true;
    if (!contenidoEmpezado) return;

    if (limpia.includes("ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL")) {
      if (enLista) { html += '</ul>'; enLista = false; }
      if (enCajaNaranja) { html += '</div>'; enCajaNaranja = false; }
      if (enCajaCierre) { html += '</div>'; enCajaCierre = false; }
      enCajaCierre = true;
      html += '<div class="pg-break"></div><div class="cta-diagnostico">';
      html += '<h2 class="cta-titulo-d">ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL</h2>';
      return;
    }

    if (limpia.includes("TU PRÓXIMO PASO:")) {
      if (enLista) { html += '</ul>'; enLista = false; }
      html += '<div class="cta-paso"><span class="cta-label">TU PRÓXIMO PASO:</span>';
      enCajaNaranja = true;
      return;
    }

    const matchTitulo = limpia.match(TITULOS_RE);
    if (matchTitulo) {
      if (enLista) { html += '</ul>'; enLista = false; }
      if (enCajaNaranja) { html += '</div>'; enCajaNaranja = false; }
      if (enCajaCierre) { html += '</div>'; enCajaCierre = false; }
      const t = matchTitulo[1].trim().toUpperCase();
      let kicker = 'Lectura Estratégica';
      if (["MAPA EJECUTIVO","PRIORIDAD ABSOLUTA","QUÉ DEJAR DE HACER YA","QUÉ CORREGIR PRIMERO","SI / ENTONCES"].some(x => t.includes(x))) kicker = 'Arquitectura de Decisiones';
      else if (["CONTENIDO QUE DEBERÍA CREAR","MENSAJES DE VENTA LISTOS PARA USAR","MÉTRICA QUE DEBERÍA MIRAR"].some(x => t.includes(x))) kicker = 'Ejecución Comercial';
      else if (t.startsWith("PLAN DE ACCIÓN")) kicker = 'Arquitectura de Decisiones';
      html += `<div class="pg-break"></div><div class="seccion"><div class="seccion-header"><div class="kicker">${kicker}</div><h2 class="seccion-titulo">${t}</h2></div>`;
      return;
    }

    if (limpia.startsWith('- ') || limpia.startsWith('* ')) {
      if (!enLista) {
        html += enCajaCierre ? '<ul class="lista-cierre">' : '<ul class="lista">';
        enLista = true;
      }
      let item = limpia.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `<li>${item}</li>`;
      return;
    } else if (enLista) { html += '</ul>'; enLista = false; }

    if (!limpia.startsWith('<')) {
      let p = limpia.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (enCajaNaranja) html += `<p class="cta-texto">${p}</p>`;
      else if (enCajaCierre) html += `<p class="texto-cierre">${p}</p>`;
      else html += `<p class="texto">${p}</p>`;
    }
  });

  if (enLista) html += '</ul>';
  if (enCajaNaranja) html += '</div>';
  if (enCajaCierre) html += '</div>';
  html += '</div>';
  return html;
}

// ── PROCESADOR PLAN DE ACCIÓN ───────────────────────────────

function procesarPlan(textoCrudo) {
  const textoSeguro = limpiarTexto(textoCrudo);
  const lineas = textoSeguro.split('\n');
  let html = '';
  let seccionActual = null;
  let enLista = false;

  const TITULOS_RE = /^(?:[🧭🎯🛑🔧📅📆📌💬📊⚠️🧠⚡🔴🚀💰🔥👉⚠]\s*)?(MAPA EJECUTIVO|PRIORIDAD ABSOLUTA|QUÉ DEJAR DE HACER YA|QUÉ CORREGIR PRIMERO|PLAN DE ACCIÓN[^a-z]*|CONTENIDO QUE DEBERÍA CREAR|MENSAJES DE VENTA[^a-z]*|MÉTRICA QUE DEBERÍA MIRAR|SI \/ ENTONCES|CIERRE ESTRATÉGICO)$/i;

  lineas.forEach(linea => {
    let limpia = linea.trim();
    if (!limpia) return;
    if (limpia.includes("━━━") || limpia === "•") {
      if (enLista) { html += '</div>'; enLista = false; }
      return;
    }
    if (limpia.includes("El resultado depende")) return;

    const matchTitulo = limpia.match(TITULOS_RE);
    if (matchTitulo) {
      if (enLista) { html += '</div>'; enLista = false; }
      if (seccionActual) html += '</div>';
      const t = matchTitulo[1].trim().toUpperCase();
      seccionActual = t;
      html += `<div class="pg-break"></div><div class="plan-seccion">`;
      html += `<div class="plan-header"><span class="plan-kicker">${getKicker(t)}</span><h2 class="plan-titulo">${t}</h2></div>`;
      return;
    }

    if (limpia.startsWith('- ') || limpia.startsWith('* ')) {
      const item = limpia.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // PLAN 7 DÍAS — formato especial con número de día
      if (seccionActual && seccionActual.includes("7 DÍAS")) {
        const diaMatch = item.match(/^(Día \d+):\s*(.+)/i);
        if (diaMatch) {
          html += `<div class="dia-item"><div class="dia-numero">${diaMatch[1].toUpperCase()}</div><div class="dia-texto">${diaMatch[2]}</div></div>`;
          return;
        }
      }

      // PLAN 30 DÍAS — formato con semana destacada
      if (seccionActual && seccionActual.includes("30 DÍAS")) {
        const semMatch = item.match(/^(Semana \d+):\s*(.+)/i);
        if (semMatch) {
          html += `<div class="semana-item"><div class="semana-label">${semMatch[1].toUpperCase()}</div><div class="semana-texto">${semMatch[2]}</div></div>`;
          return;
        }
      }

      // SI/ENTONCES — formato con flecha
      if (seccionActual && seccionActual.includes("SI / ENTONCES")) {
        const siMatch = item.match(/^Si\s+(.+?),?\s+entonces\s+(.+)/i);
        if (siMatch) {
          html += `<div class="si-entonces"><div class="si-bloque"><span class="si-label">SI</span><span class="si-texto">${siMatch[1]}</span></div><div class="flecha">→</div><div class="entonces-bloque"><span class="entonces-label">ENTONCES</span><span class="entonces-texto">${siMatch[2]}</span></div></div>`;
          return;
        }
      }

      // CONTENIDO — formato con gancho destacado
      if (seccionActual && seccionActual.includes("CONTENIDO")) {
        const ideaMatch = item.match(/^(Idea \d+):\s*(.+)/i);
        if (ideaMatch) {
          html += `<div class="contenido-item"><div class="contenido-num">${ideaMatch[1].toUpperCase()}</div><div class="contenido-texto">${ideaMatch[2]}</div></div>`;
          return;
        }
      }

      // MÉTRICAS — formato tarjeta
      if (seccionActual && seccionActual.includes("MÉTRICA")) {
        if (!enLista) {
          html += '<div class="metrica-lista">';
          enLista = true;
        }
        html += `<div class="metrica-item">${item}</div>`;
        return;
      }

      // MENSAJES DE VENTA — formato quote
      if (seccionActual && seccionActual.includes("MENSAJES")) {
        html += `<div class="mensaje-item"><span class="comilla">"</span>${item.replace(/^"|"$/g, '')}<span class="comilla">"</span></div>`;
        return;
      }

      // Lista genérica con bullet rojo
      html += `<div class="plan-item"><span class="bullet">—</span><div class="plan-item-texto">${item}</div></div>`;
      return;
    }

    // Párrafo normal
    if (!limpia.startsWith('<')) {
      if (enLista) { html += '</div>'; enLista = false; }
      let p = limpia.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `<p class="plan-texto">${p}</p>`;
    }
  });

  if (enLista) html += '</div>';
  if (seccionActual) html += '</div>';
  return html;
}

function getKicker(titulo) {
  if (["MAPA EJECUTIVO","PRIORIDAD ABSOLUTA","QUÉ DEJAR DE HACER YA","QUÉ CORREGIR PRIMERO","SI / ENTONCES"].some(x => titulo.includes(x))) return 'Arquitectura de Decisiones';
  if (["CONTENIDO QUE DEBERÍA CREAR","MENSAJES DE VENTA LISTOS PARA USAR","MÉTRICA QUE DEBERÍA MIRAR"].some(x => titulo.includes(x))) return 'Ejecución Comercial';
  if (titulo.startsWith("PLAN DE ACCIÓN")) return 'Arquitectura de Decisiones';
  return 'Lectura Estratégica';
}

// ── PLANTILLAS HTML ─────────────────────────────────────────

const CSS_BASE = `
  :root { --rojo: #dc2626; --negro: #0a0a0a; --gris: #f4f4f4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; color: #111; background: #fff; }
  .pg-break { page-break-before: always; break-before: page; height: 0; display: block; }

  /* CARÁTULA */
  .cover, .cover-plan {
    height: 100vh; display: flex; flex-direction: column;
    justify-content: center; align-items: center; text-align: center;
    background: var(--negro); color: #fff; padding: 60px;
    page-break-after: always;
  }
  .logo-portada { width: 220px; margin-bottom: 40px; }
  .cover-marca { font-size: 40px; color: var(--rojo); letter-spacing: 4px; font-weight: 700; margin-bottom: 8px; }
  .cover-sub { font-size: 16px; font-weight: 300; color: #d1d5db; letter-spacing: 1px; margin-bottom: 6px; }
  .cover-privado { font-size: 12px; font-weight: 600; color: #6b7280; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 44px; }
  .cover-titulo { font-size: 64px; font-weight: 300; line-height: 1.1; margin-bottom: 36px; color: #fff; }
  .cover-titulo span { color: var(--rojo); font-weight: 700; }
  .cover-desc {
    font-size: 19px; color: #9ca3af; max-width: 580px;
    border-top: 1px solid #334155; border-bottom: 1px solid #334155;
    padding: 22px 0; line-height: 1.7; font-weight: 300; margin-bottom: 44px;
  }
  .cover-firma .label { font-size: 11px; color: #6b7280; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px; font-weight: 600; }
  .cover-firma .value { font-size: 20px; color: #fff; font-weight: 400; }

  /* DIAGNÓSTICO */
  .seccion { padding: 65px 80px; page-break-inside: avoid; }
  .seccion-header { border-bottom: 3px solid #111; padding-bottom: 18px; margin-bottom: 36px; }
  .kicker { font-size: 11px; color: var(--rojo); text-transform: uppercase; letter-spacing: 3px; font-weight: 700; margin-bottom: 8px; }
  .seccion-titulo { font-size: 32px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #111; }
  .texto { font-size: 21px; line-height: 1.8; color: #111; font-weight: 400; margin-bottom: 20px; }
  strong { font-weight: 700; color: #000; }
  .lista { list-style: none; padding: 0; margin: 12px 0 28px 0; }
  .lista li { position: relative; padding-left: 28px; margin-bottom: 18px; font-size: 21px; line-height: 1.8; color: #111; }
  .lista li::before { content: "—"; color: var(--rojo); font-weight: 700; position: absolute; left: 0; top: 0; }
  .cta-diagnostico { padding: 65px 80px; min-height: 60vh; display: flex; flex-direction: column; justify-content: center; background: var(--negro); }
  .cta-titulo-d { color: #fff; font-size: 26px; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid var(--rojo); padding-bottom: 18px; margin-bottom: 26px; letter-spacing: 2px; }
  .texto-cierre { color: #e5e7eb; font-size: 21px; line-height: 1.8; margin-bottom: 16px; }
  .lista-cierre { list-style: none; padding: 0; margin: 12px 0 20px 0; }
  .lista-cierre li { position: relative; padding-left: 28px; margin-bottom: 14px; font-size: 20px; color: #d1d5db; }
  .lista-cierre li::before { content: "—"; color: var(--rojo); position: absolute; left: 0; }
  .cta-paso { background: #fff; border-left: 4px solid var(--rojo); padding: 24px 28px; margin-top: 28px; }
  .cta-label { display: block; font-size: 12px; color: var(--rojo); font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .cta-texto { font-size: 20px; color: #111; line-height: 1.7; margin-bottom: 8px; }

  /* PLAN — LAYOUT GENERAL */
  .plan-seccion { padding: 60px 80px; page-break-inside: avoid; }
  .plan-header { margin-bottom: 36px; padding-bottom: 18px; border-bottom: 3px solid #111; }
  .plan-kicker { display: block; font-size: 11px; color: var(--rojo); text-transform: uppercase; letter-spacing: 3px; font-weight: 700; margin-bottom: 8px; }
  .plan-titulo { font-size: 32px; font-weight: 700; text-transform: uppercase; color: #111; letter-spacing: 1px; }
  .plan-texto { font-size: 21px; line-height: 1.8; color: #111; margin-bottom: 20px; }
  .plan-item { display: flex; gap: 16px; margin-bottom: 20px; align-items: flex-start; }
  .bullet { color: var(--rojo); font-weight: 700; font-size: 21px; flex-shrink: 0; margin-top: 2px; }
  .plan-item-texto { font-size: 21px; line-height: 1.8; color: #111; }

  /* PLAN 7 DÍAS */
  .dia-item { display: flex; gap: 0; margin-bottom: 18px; border-left: 3px solid var(--rojo); }
  .dia-numero { background: var(--rojo); color: #fff; font-size: 13px; font-weight: 700; letter-spacing: 1px; padding: 14px 18px; min-width: 80px; text-align: center; display: flex; align-items: center; justify-content: center; text-transform: uppercase; }
  .dia-texto { font-size: 20px; line-height: 1.75; color: #111; padding: 14px 20px; background: var(--gris); flex: 1; }

  /* PLAN 30 DÍAS */
  .semana-item { display: flex; gap: 0; margin-bottom: 18px; border-left: 3px solid #111; }
  .semana-label { background: #111; color: #fff; font-size: 13px; font-weight: 700; padding: 14px 18px; min-width: 100px; text-align: center; display: flex; align-items: center; justify-content: center; text-transform: uppercase; letter-spacing: 1px; }
  .semana-texto { font-size: 20px; line-height: 1.75; color: #111; padding: 14px 20px; background: var(--gris); flex: 1; }

  /* SI / ENTONCES */
  .si-entonces { display: flex; align-items: stretch; gap: 0; margin-bottom: 18px; border-radius: 4px; overflow: hidden; border: 1px solid #e5e7eb; }
  .si-bloque { background: #fef2f2; padding: 18px 20px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .si-label { font-size: 11px; font-weight: 700; color: var(--rojo); letter-spacing: 2px; text-transform: uppercase; }
  .si-texto { font-size: 19px; color: #111; line-height: 1.6; }
  .flecha { background: var(--rojo); color: #fff; font-size: 26px; font-weight: 700; display: flex; align-items: center; justify-content: center; padding: 0 20px; }
  .entonces-bloque { background: #f0fdf4; padding: 18px 20px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .entonces-label { font-size: 11px; font-weight: 700; color: #16a34a; letter-spacing: 2px; text-transform: uppercase; }
  .entonces-texto { font-size: 19px; color: #111; line-height: 1.6; }

  /* CONTENIDO */
  .contenido-item { display: flex; gap: 0; margin-bottom: 18px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
  .contenido-num { background: var(--negro); color: #fff; font-size: 13px; font-weight: 700; padding: 14px 18px; min-width: 80px; text-align: center; display: flex; align-items: center; justify-content: center; letter-spacing: 1px; }
  .contenido-texto { font-size: 19px; line-height: 1.75; color: #111; padding: 14px 20px; flex: 1; }

  /* MÉTRICAS */
  .metrica-lista { display: flex; flex-direction: column; gap: 16px; }
  .metrica-item { background: var(--gris); border-left: 4px solid var(--rojo); padding: 18px 22px; font-size: 20px; line-height: 1.75; color: #111; }

  /* MENSAJES */
  .mensaje-item { border: 1px solid #e5e7eb; border-radius: 4px; padding: 20px 24px; margin-bottom: 16px; font-size: 20px; line-height: 1.75; color: #111; position: relative; background: var(--gris); }
  .comilla { color: var(--rojo); font-size: 28px; font-weight: 700; line-height: 1; }
`;

function htmlDiagnostico(contenido) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>${CSS_BASE}</style></head><body>
  <div class="cover">
    <img src="https://www.problemacero.com.ar/logo.png" class="logo-portada" onerror="this.style.display='none'">
    <div class="cover-marca">PROBLEMA CERO</div>
    <div class="cover-sub">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
    <div class="cover-privado">INFORME PRIVADO</div>
    <div class="cover-titulo">Diagnóstico<br>estratégico</div>
    <div class="cover-desc">Una lectura estratégica diseñada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.</div>
    <div class="cover-firma"><div class="label">Dirección Estratégica</div><div class="value">Lic. Hernán Mariano Waisman</div></div>
  </div>
  ${contenido}
  </body></html>`;
}

function htmlPlan(contenido) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>${CSS_BASE}</style></head><body>
  <div class="cover-plan">
    <img src="https://www.problemacero.com.ar/logo.png" class="logo-portada" onerror="this.style.display='none'">
    <div class="cover-marca">PROBLEMA CERO</div>
    <div class="cover-sub">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
    <div class="cover-privado">DOCUMENTO EJECUTIVO</div>
    <div class="cover-titulo">Mapa de<br><span>Ejecución</span></div>
    <div class="cover-desc">Un plan de acción diseñado para corregir la raíz del problema, ordenar prioridades absolutas y escalar el negocio en los próximos 30 días.</div>
    <div class="cover-firma"><div class="label">Dirección Estratégica</div><div class="value">Lic. Hernán Mariano Waisman</div></div>
  </div>
  ${contenido}
  </body></html>`;
}

// ── ENDPOINT PRINCIPAL ──────────────────────────────────────

app.post("/*", async (req, res) => {
  let browser = null;
  try {
    const texto = req.body.diagnostico || req.body.texto || req.body.problem;
    if (!texto) return res.status(400).json({ error: "No se envió texto" });

    const esPlan = esPlanAccion(texto);
    const contenidoHTML = esPlan ? procesarPlan(texto) : procesarDiagnostico(texto);
    const htmlFinal = esPlan ? htmlPlan(contenidoHTML) : htmlDiagnostico(contenidoHTML);

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
    const page = await browser.newPage();
    await page.setContent(htmlFinal, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "72px", left: "0px", right: "0px" },
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

  } catch (error) {
    console.error("Error PDF:", error);
    res.status(500).json({ error: "Falla interna", detalle: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Motor PDF Problema Cero v4.0 activo en puerto ${PORT}`));
