const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Motor PDF Problema Cero: Cierre Premium y Logo Activo");
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
  let enCajaCierre = false;

  lineas.forEach(linea => {
    let limpia = linea.trim();
    if (!limpia) return;

    if (limpia.includes("━━━━━━━━━━━━━━━━━━━━")) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      htmlResult += '<div class="page-break"></div>';
      return;
    }

    // Detección del bloque de cierre para crear la caja premium
    if (limpia.includes("ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL")) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      enCajaCierre = true;
      htmlResult += `<div class="caja-premium-cierre">`;
      htmlResult += `<h2 class="cierre-titulo">${limpia}</h2>`;
      return;
    }

    const matchTitulo = limpia.match(/^(⚡|🔴|🧠|⚠️|🚀|💰|🔥|🧭|🎯|🛑|🔧|📅|📆|📌|💬|📊)\s(.*)$/);
    if (matchTitulo) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      const textoTitulo = matchTitulo[2];
      htmlResult += `<h2 class="section-title">${textoTitulo}</h2>`;
      return;
    }

    if (limpia.startsWith('- ')) {
      if (!enLista) { 
        htmlResult += enCajaCierre ? '<ul class="cierre-list">' : '<ul class="premium-list">'; 
        enLista = true; 
      }
      let itemTexto = limpia.substring(2);
      itemTexto = itemTexto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      htmlResult += `<li class="list-item">${itemTexto}</li>`;
      return;
    } else if (enLista) {
      htmlResult += '</ul>';
      enLista = false;
    }

    if (!limpia.startsWith('<')) {
      let parrafo = limpia.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      htmlResult += `<p>${parrafo}</p>`;
    }
  });

  if (enLista) htmlResult += '</ul>';
  if (enCajaCierre) htmlResult += '</div>';
  return htmlResult;
}

function generarPlantillaPDF(textoDiagnostico, isMobile) {
  const contenidoHTML = procesarMarkdownAHTML(textoDiagnostico);
  
  const fontSize = isMobile ? "24px" : "15px"; 
  const lineHeight = isMobile ? "1.6" : "1.7";
  const titleSize = isMobile ? "28px" : "18px";
  const bulletSize = isMobile ? "32px" : "24px";
  
  const opcionesFecha = { year: 'numeric', month: 'long', day: 'numeric' };
  const fechaHoy = new Date().toLocaleDateString('es-AR', opcionesFecha);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --rojo-marca: #dc2626;
        --texto-principal: #111827;
      }
      body {
        font-family: 'Inter', sans-serif;
        color: var(--texto-principal);
        background-color: #ffffff;
        line-height: ${lineHeight}; 
        font-size: ${fontSize};
        margin: 0;
        padding: 0;
      }
      .page-content { padding: 60px 80px; }
      .page-break { page-break-before: always; height: 1px; }
      
      .cover {
         height: 100vh; display: flex; flex-direction: column; justify-content: center;
         align-items: flex-start; background-color: #0a0a0a; color: #ffffff; padding: 0 80px; box-sizing: border-box;
      }
      .logo-portada { width: 140px; margin-bottom: 30px; }
      .cover h1 { font-size: 42px; color: var(--rojo-marca); margin-bottom: 30px; letter-spacing: 2px; }
      .cover .subtitle { font-size: 24px; font-weight: 400; margin-bottom: 5px; color: #d1d5db; }
      .cover .private { font-size: 16px; font-weight: 700; margin-bottom: 40px; color: #9ca3af; letter-spacing: 3px; text-transform: uppercase; }
      .cover .diag-title { font-size: 50px; font-weight: 700; margin-bottom: 40px; line-height: 1.1; }
      .cover .description { font-size: 18px; color: #9ca3af; max-width: 600px; border-left: 3px solid var(--rojo-marca); padding-left: 20px; line-height: 1.6; }
      
      .cover-footer { position: absolute; bottom: 80px; left: 80px; }
      .cover-footer .label { font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
      .cover-footer .value { font-size: 18px; color: #ffffff; margin-bottom: 20px; font-weight: 600; }
      
      .section-title { font-size: ${titleSize}; color: var(--rojo-marca); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-top: 0; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; }
      p { margin-top: 0; margin-bottom: 24px; text-align: left; color: #1f2937; font-weight: 400; }
      strong { font-weight: 700; color: #000000; }
      
      .premium-list { list-style: none; padding-left: 0; margin-top: 15px; margin-bottom: 24px; }
      .list-item { position: relative; padding-left: 32px; margin-bottom: 18px; color: #1f2937; }
      .premium-list .list-item::before { content: "•"; color: var(--rojo-marca); font-weight: bold; font-size: ${bulletSize}; position: absolute; left: 0; top: -6px; }

      /* LA NUEVA CAJA PREMIUM DE CIERRE */
      .caja-premium-cierre {
        background-color: #0a0a0a;
        color: #ffffff;
        border-left: 6px solid var(--rojo-marca);
        padding: 40px;
        margin-top: 50px;
        border-radius: 12px;
        page-break-inside: avoid;
      }
      .caja-premium-cierre .cierre-titulo {
        color: var(--rojo-marca);
        font-size: ${titleSize};
        margin-top: 0;
        margin-bottom: 20px;
        text-transform: uppercase;
      }
      .caja-premium-cierre p { color: #e5e7eb; }
      .caja-premium-cierre strong { color: #ffffff; }
      .cierre-list { list-style: none; padding-left: 0; margin-top: 15px; margin-bottom: 24px; }
      .cierre-list .list-item { position: relative; padding-left: 32px; margin-bottom: 18px; color: #e5e7eb; }
      .cierre-list .list-item::before { content: "•"; color: var(--rojo-marca); font-weight: bold; font-size: ${bulletSize}; position: absolute; left: 0; top: -6px; }
    </style>
  </head>
  <body>
    <div class="cover">
      <!-- RUTA DEL LOGO INYECTADA -->
      <img src="https://www.problemacero.com.ar/logo.png" alt="Logo Problema Cero" class="logo-portada" onerror="this.style.display='none'">
      
      <h1>PROBLEMA CERO</h1>
      <div class="subtitle">Interconsulta estratégica empresarial</div>
      <div class="private">Informe Privado</div>
      
      <div class="diag-title">Diagnóstico<br>estratégico</div>
      
      <div class="description">
        Una lectura estratégica diseñada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.
      </div>

      <div class="cover-footer">
        <div class="label">Fecha de emisión</div>
        <div class="value">${fechaHoy}</div>
        <div class="label">Dirección Estratégica</div>
        <div class="value">Lic. Hernán Mariano Waisman</div>
      </div>
    </div>
    <div class="page-break"></div>

    <div class="page-content">
      ${contenidoHTML}
    </div>
  </body>
  </html>
  `;
}

app.post("/*", async (req, res) => {
  let browser = null;
  try {
    const diagnostico = req.body.diagnostico || req.body.texto || req.body.problem;
    const isMobile = req.body.isMobile === true;
    if (!diagnostico) return res.status(400).json({ error: "No se envió texto para el PDF" });

    const htmlFinal = generarPlantillaPDF(diagnostico, isMobile);

    browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
    const page = await browser.newPage();
    await page.setContent(htmlFinal, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4", printBackground: true, margin: { top: "50px", bottom: "60px", left: "0px", right: "0px" },
      displayHeaderFooter: true, headerTemplate: "<div></div>",
      footerTemplate: `<div style="width: 100%; font-size: 11px; padding: 0 80px; display: flex; justify-content: space-between; color: #6b7280; font-family: 'Helvetica Neue', sans-serif;"><span>Problema Cero Dirección Estratégica</span><span>Página <span class="pageNumber"></span></span></div>`
    });
    
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=Diagnostico_ProblemaCero.pdf", "Content-Length": pdfBuffer.length });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Falla interna", detalle: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Motor PDF Problema Cero: Cierre Premium activo en puerto ${PORT}`));
