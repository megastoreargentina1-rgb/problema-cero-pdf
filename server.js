const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Motor PDF Problema Cero v3.0");
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

  lineas.forEach(linea => {
    if (ignorarResto) return;

    let limpia = linea.trim();
    if (!limpia) return;

    // Ignorar el caso del cliente completo
    if (
      limpia.startsWith("CASO DEL CLIENTE:") ||
      limpia.startsWith("EL NEGOCIO:") ||
      limpia.startsWith("EL PROBLEMA ELEGIDO") ||
      limpia.startsWith("LAS BASES DEL NEGOCIO:") ||
      limpia.startsWith("EL PUNTO DE BLOQUEO:") ||
      limpia.startsWith("EL OBJETIVO A 90") ||
      limpia.startsWith("ANÁLISIS INICIAL:") ||
      limpia.startsWith("ANÁLISIS ESTRATÉGICO:") ||
      limpia.startsWith("MAPA DE EJECUCIÓN") ||
      limpia.startsWith("CASO ORIGINAL:") ||
      limpia.startsWith("RECURSOS DISPONIBLES") ||
      limpia.startsWith("FEEDBACK DEL USUARIO:")
    ) {
      ignorarResto = false;
      return;
    }

    // Saltar líneas que son parte del caso del cliente
    // (numeradas con 1. 2. 3. 4. al inicio, antes del primer título real)
    if (!htmlResult && /^\d+\./.test(limpia)) return;

    // Separadores visuales — ignorar
    if (limpia.includes("━━━━━━━━━━━━━━━━━━━━") || limpia === "•") {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      return;
    }

    // Líneas de encabezado del diagnóstico — ignorar
    if (
      limpia === "DIAGNÓSTICO:" ||
      limpia === "DIAGNÓSTICO INICIAL:" ||
      limpia === "CONSULTA ORIGINAL:" ||
      limpia.includes("Aquí tienes el análisis")
    ) return;

    // CARÁTULA INTERNA ANÁLISIS COMPLETO
    if (limpia === "ANÁLISIS COMPLETO:") {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      htmlResult += '<div class="page-break"></div>';
      htmlResult += `
      <div class="cover-interna">
        <img src="https://www.problemacero.com.ar/logo.png" alt="Logo" class="logo-portada" onerror="this.style.display='none'">
        <h1>PROBLEMA CERO</h1>
        <div class="subtitle">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
        <div class="diag-title">Mapa de <span class="rojo">Ejecución</span></div>
        <div class="private">DOCUMENTO EJECUTIVO</div>
        <div class="description">Un plan de acción diseñado para corregir la raíz del problema, ordenar prioridades absolutas y escalar el negocio en los próximos 30 días.</div>
      </div>`;
      ignorarResto = false;
      return;
    }

    // CTA FINAL — DIAGNÓSTICO
    if (limpia.includes("ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL")) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
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
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
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
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      htmlResult += '<div class="caja-cta-blanca"><p class="cta-titulo">TU PRÓXIMO PASO:</p>';
      enCajaNaranja = true;
      return;
    }

    // TÍTULOS DE SECCIÓN
    const regexTitulos = /^(?:[🧭🎯🛑🔧📅📆📌💬📊⚠️🧠⚡🔴🚀💰🔥👉]\s*)?(MAPA EJECUTIVO|PRIORIDAD ABSOLUTA|QUÉ DEJAR DE HACER YA|QUÉ CORREGIR PRIMERO|PLAN DE ACCIÓN[^a-z]*|CONTENIDO QUE DEBERÍA CREAR|MENSAJES DE VENTA[^a-z]*|MÉTRICA QUE DEBERÍA MIRAR|SI \/ ENTONCES|CIERRE ESTRATÉGICO|RESUMEN RÁPIDO|PROBLEMA PRINCIPAL|QUÉ SIGNIFICA|CAUSA REAL|ACCIÓN CONCRETA|IMPACTO|CIERRE)$/i;
    const matchTitulo = limpia.match(regexTitulos);

    if (matchTitulo) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      if (enCajaNaranja) { htmlResult += '</div>'; enCajaNaranja = false; }
      if (enCajaCierre) { htmlResult += '</div></div>'; enCajaCierre = false; }

      const tituloLimpio = matchTitulo[1].trim().toUpperCase();

      if (!tituloLimpio.includes("RESUMEN RÁPIDO")) {
        htmlResult += '<div class="page-break"></div>';
      }

      let kickerText = 'Lectura Estratégica';
      const titulos_decision = ["MAPA EJECUTIVO","PRIORIDAD ABSOLUTA","QUÉ DEJAR DE HACER YA","QUÉ CORREGIR PRIMERO","SI / ENTONCES"];
      const titulos_comercial = ["CONTENIDO QUE DEBERÍA CREAR","MENSAJES DE VENTA LISTOS PARA USAR","MÉTRICA QUE DEBERÍA MIRAR"];
      const titulos_plan = tituloLimpio.startsWith("PLAN DE ACCIÓN");

      if (titulos_decision.some(t => tituloLimpio.includes(t))) kickerText = 'Arquitectura de Decisiones';
      else if (titulos_comercial.some(t => tituloLimpio.includes(t))) kickerText = 'Ejecución Comercial';
      else if (titulos_plan) kickerText = 'Arquitectura de Decisiones';

      htmlResult += `<div class="editorial-header">
        <div class="kicker">${kickerText}</div>
        <h2 class="editorial-title">${tituloLimpio}</h2>
      </div>`;
      return;
    }

    // Subtítulos tipo "👉 Tu problema principal:"
    if (limpia.startsWith('👉')) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      const texto = limpia.replace('👉', '').trim();
      htmlResult += `<p class="subtitulo-seccion">${texto}</p>`;
      return;
    }

    // LISTAS — reemplazar guiones por items reales
    if (limpia.startsWith('- ') || limpia.startsWith('* ')) {
      if (!enLista) {
        htmlResult += enCajaCierre
          ? '<ul class="cierre-list">'
          : '<ul class="editorial-list">';
        enLista = true;
      }
      // Arreglar números pegados: "3-4" que quedaron como "34"
      let itemTexto = limpia.substring(2)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      htmlResult += `<li class="list-item">${itemTexto}</li>`;
      return;
    } else if (enLista) {
      htmlResult += '</ul>';
      enLista = false;
    }

    // PÁRRAFOS NORMALES
    if (!limpia.startsWith('<')) {
      let parrafo = limpia.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (enCajaNaranja) {
        htmlResult += `<p class="cta-texto">${parrafo}</p>`;
      } else if (enCajaCierre) {
        htmlResult += `<p class="texto-cierre">${parrafo}</p>`;
      } else {
        htmlResult += `<p class="texto-editorial">${parrafo}</p>`;
      }
    }
  });

  if (enLista) htmlResult += '</ul>';
  if (enCajaNaranja) htmlResult += '</div>';
  if (enCajaCierre) htmlResult += '</div></div>';

  return htmlResult;
}

function generarPlantillaPDF(textoDiagnostico) {
  const contenidoHTML = procesarMarkdownAHTML(textoDiagnostico);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --rojo: #dc2626;
      --negro: #0a0a0a;
      --texto: #1a1a1a;
      --texto-secundario: #4b5563;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      color: var(--texto);
      background: #ffffff;
    }

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
    .logo-portada { width: 200px; margin-bottom: 40px; }
    .cover h1, .cover-interna h1 {
      font-size: 38px;
      color: var(--rojo);
      letter-spacing: 4px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .cover .subtitle, .cover-interna .subtitle {
      font-size: 18px;
      font-weight: 300;
      color: #d1d5db;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .cover .private, .cover-interna .private {
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      letter-spacing: 5px;
      text-transform: uppercase;
      margin-bottom: 50px;
    }
    .cover .diag-title, .cover-interna .diag-title {
      font-size: 58px;
      font-weight: 300;
      line-height: 1.15;
      margin-bottom: 40px;
    }
    .rojo { color: var(--rojo); font-weight: 700; }
    .cover .description, .cover-interna .description {
      font-size: 20px;
      color: #9ca3af;
      max-width: 600px;
      border-top: 1px solid #334155;
      border-bottom: 1px solid #334155;
      padding: 24px 0;
      line-height: 1.7;
      font-weight: 300;
    }
    .cover-footer {
      margin-top: 50px;
      text-align: center;
    }
    .cover-footer .label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .cover-footer .value {
      font-size: 20px;
      color: #ffffff;
      font-weight: 400;
    }

    /* ── CONTENIDO ── */
    .page-content {
      padding: 55px 75px;
    }
    .page-break {
      page-break-before: always;
      height: 1px;
    }

    /* ── ENCABEZADOS DE SECCIÓN ── */
    .editorial-header {
      margin-bottom: 36px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e7eb;
    }
    .kicker {
      font-size: 11px;
      color: var(--rojo);
      text-transform: uppercase;
      letter-spacing: 3px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .editorial-title {
      color: var(--texto);
      font-size: 28px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 300;
    }

    /* ── TEXTO ── */
    .texto-editorial {
      font-size: 17px;
      line-height: 1.75;
      color: var(--texto-secundario);
      font-weight: 300;
      margin-bottom: 20px;
    }
    .subtitulo-seccion {
      font-size: 15px;
      font-weight: 600;
      color: var(--texto);
      margin-bottom: 10px;
      margin-top: 8px;
    }
    strong { font-weight: 600; color: #111; }

    /* ── LISTAS ── */
    .editorial-list {
      list-style: none;
      padding-left: 0;
      margin: 10px 0 30px 0;
    }
    .list-item {
      position: relative;
      padding-left: 28px;
      margin-bottom: 18px;
      font-size: 17px;
      line-height: 1.75;
      color: var(--texto-secundario);
      font-weight: 300;
    }
    .editorial-list .list-item::before {
      content: "—";
      color: var(--rojo);
      font-weight: 400;
      position: absolute;
      left: 0;
      top: 0;
    }

    /* ── CAJA CTA DIAGNÓSTICO ── */
    .contenedor-cierre {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 70vh;
    }
    .caja-premium-cierre {
      background-color: var(--negro);
      color: #ffffff;
      border: 1px solid #334155;
      padding: 50px;
      width: 100%;
      text-align: center;
    }
    .cierre-titulo {
      color: #ffffff;
      font-size: 22px;
      text-transform: uppercase;
      border-bottom: 1px solid var(--rojo);
      padding-bottom: 18px;
      margin-bottom: 24px;
      letter-spacing: 2px;
      font-weight: 300;
    }
    .texto-cierre {
      color: #e5e7eb;
      font-size: 17px;
      line-height: 1.75;
      margin-bottom: 14px;
    }
    .cierre-list { list-style: none; padding-left: 0; margin: 10px 0 20px 0; }
    .cierre-list .list-item {
      position: relative;
      padding-left: 28px;
      margin-bottom: 12px;
      font-size: 16px;
      color: #9ca3af;
      font-weight: 300;
    }
    .cierre-list .list-item::before { content: "—"; color: var(--rojo); position: absolute; left: 0; top: 0; }

    /* ── CAJA CTA BLANCA ── */
    .caja-cta-blanca {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      padding: 28px;
      margin-top: 30px;
      text-align: center;
    }
    .cta-titulo {
      color: var(--rojo);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .cta-texto {
      color: var(--texto);
      font-size: 17px;
      font-weight: 400;
      line-height: 1.6;
    }

    /* ── CAJA CTA PLAN ── */
    .black-box-cta {
      background-color: var(--negro);
      color: #ffffff;
      padding: 50px;
      border: 1px solid #334155;
      border-radius: 6px;
      width: 100%;
      text-align: center;
    }
    .black-box-cta h3 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 2px;
      margin-bottom: 18px;
      color: #ffffff;
      text-transform: uppercase;
      border-bottom: 1px solid var(--rojo);
      padding-bottom: 18px;
      display: inline-block;
    }
    .black-box-cta p {
      font-size: 18px;
      font-weight: 300;
      line-height: 1.6;
      color: #e5e7eb;
      margin: 0 auto 36px auto;
      max-width: 80%;
    }
    .btn-premium {
      display: inline-block;
      background-color: var(--rojo);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 36px;
      font-weight: 600;
      font-size: 17px;
      letter-spacing: 1px;
      border-radius: 4px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>

  <!-- CARÁTULA PRINCIPAL -->
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

  <!-- CONTENIDO -->
  <div class="page-content">${contenidoHTML}</div>

</body>
</html>`;
}

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
      margin: { top: "0px", bottom: "70px", left: "0px", right: "0px" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="font-size:11px;width:100%;color:#9ca3af;padding:0 75px;display:flex;justify-content:space-between;font-family:'Inter',sans-serif;letter-spacing:1px;-webkit-print-color-adjust:exact;print-color-adjust:exact"><span>PROBLEMA CERO</span><span>PÁGINA <span class="pageNumber"></span></span></div>`
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
app.listen(PORT, () => console.log(`Motor PDF Problema Cero v3.0 activo en puerto ${PORT}`));
