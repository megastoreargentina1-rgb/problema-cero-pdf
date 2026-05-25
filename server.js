const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Motor PDF Premium Problema Cero: Biónico + Sinóptico Activo");
});

function limpiarTexto(texto) {
  if (!texto) return "";
  return texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function aplicarLecturaBionica(texto) {
  return texto.replace(/\b([a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]{4,})\b/g, (match) => {
    let mid = Math.ceil(match.length / 2);
    return `<span class="bionic-bold">${match.substring(0, mid)}</span>${match.substring(mid)}`;
  });
}

function procesarMarkdownAHTML(textoCrudo) {
  const textoSeguro = limpiarTexto(textoCrudo);
  const lineas = textoSeguro.split('\n');
  let htmlResult = '';
  let enLista = false;

  lineas.forEach(linea => {
    let limpia = linea.trim();
    if (!limpia) return;

    if (limpia.includes("━━━━━━━━━━━━━━━━━━━━")) {
      if (enLista) { htmlResult += '</ul></div>'; enLista = false; }
      htmlResult += '<div class="page-break"></div>';
      return;
    }

    const matchTitulo = limpia.match(/^(⚡|🔴|🧠|⚠️|🚀|💰|🔥|🧭|🎯|🛑|🔧|📅|📆|📌|💬|📊)\s(.*)$/);
    if (matchTitulo) {
      if (enLista) { htmlResult += '</ul></div>'; enLista = false; }
      
      const icono = matchTitulo[1];
      const textoTitulo = matchTitulo[2];
      
      let claseCaja = 'box-standard';
      if (icono === '⚠️' || icono === '🛑') claseCaja = 'box-alert'; 
      if (icono === '🚀' || icono === '📅' || icono === '📆' || icono === '🔧') claseCaja = 'box-action'; 
      if (icono === '⚡' || icono === '🧭') claseCaja = 'box-executive'; 
      
      htmlResult += `<div class="caja-sinoptica ${claseCaja}">`;
      htmlResult += `<h2 class="section-title"><span class="icon">${icono}</span> ${textoTitulo}</h2>`;
      return;
    }

    if (limpia.startsWith('- ')) {
      if (!enLista) { htmlResult += '<ul class="premium-list">'; enLista = true; }
      let itemTexto = limpia.substring(2);
      itemTexto = itemTexto.replace(/\*\*(.*?)\*\*/g, '<strong class="highlight">$1</strong>');
      htmlResult += `<li class="list-item">${itemTexto}</li>`;
      return;
    } else if (enLista) {
      htmlResult += '</ul></div>';
      enLista = false;
    }

    if (!limpia.startsWith('<')) {
      let parrafo = limpia.replace(/\*\*(.*?)\*\*/g, '<strong class="highlight">$1</strong>');
      parrafo = aplicarLecturaBionica(parrafo);
      htmlResult += `<p>${parrafo}</p>`;
    }
  });

  if (enLista) htmlResult += '</ul></div>';
  return htmlResult;
}

function generarPlantillaPDF(textoDiagnostico) {
  const contenidoHTML = procesarMarkdownAHTML(textoDiagnostico);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --rojo-marca: #b91c1c;
        --rojo-fondo: #fef2f2;
        --texto-principal: #1f2937;
        --texto-secundario: #4b5563;
        --gris-fondo: #f9fafb;
        --oscuro-fondo: #111827;
      }
      body {
        font-family: 'Inter', sans-serif;
        color: var(--texto-principal);
        background-color: #ffffff;
        line-height: 1.7; 
        font-size: 14px;
        margin: 0;
        padding: 0;
      }
      .page-content { padding: 40px 60px; }
      .page-break { page-break-before: always; height: 1px; }
      .bionic-bold { font-weight: 700; color: #000000; }
      
      .cover {
         height: 100vh;
         display: flex;
         flex-direction: column;
         justify-content: center;
         align-items: center;
         text-align: center;
         background-color: #ffffff;
         border-bottom: 12px solid var(--rojo-marca);
      }
      .cover h1 { font-size: 48px; font-weight: 700; margin-bottom: 10px; letter-spacing: -1px; }
      .cover h1 span { color: var(--rojo-marca); }
      .cover p { font-size: 14px; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 2px; font-weight: 600; }
      
      .caja-sinoptica { border-radius: 8px; padding: 24px; margin-bottom: 24px; page-break-inside: avoid; }
      .box-standard { background-color: #ffffff; border: 1px solid #e5e7eb; border-left: 4px solid var(--texto-principal); }
      .box-alert { background-color: var(--rojo-fondo); border: 1px solid #fecaca; border-left: 4px solid var(--rojo-marca); }
      .box-action { background-color: var(--gris-fondo); border: 1px solid #e5e7eb; border-left: 4px solid #3b82f6; }
      .box-executive { background-color: var(--oscuro-fondo); color: #f9fafb; border-left: 4px solid var(--rojo-marca); }
      .box-executive p, .box-executive .bionic-bold { color: #f3f4f6; font-weight: 500; }
      .box-executive .bionic-bold { color: #ffffff; font-weight: 700; }
      
      .section-title { font-size: 15px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-top: 0; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
      .box-standard .section-title { color: var(--texto-principal); }
      .box-alert .section-title { color: var(--rojo-marca); }
      .box-action .section-title { color: #1e40af; }
      .box-executive .section-title { color: #ffffff; border-bottom: 1px solid #374151; padding-bottom: 8px; }
      
      p { margin-top: 0; margin-bottom: 16px; text-align: left; }
      .highlight { background-color: #fef08a; padding: 0 4px; color: #000; font-weight: 600; border-radius: 2px; }
      
      .premium-list { list-style: none; padding-left: 0; margin-top: 10px; margin-bottom: 0; }
      .list-item { position: relative; padding-left: 24px; margin-bottom: 12px; }
      .list-item::before { content: "•"; color: var(--rojo-marca); font-weight: bold; font-size: 20px; position: absolute; left: 0; top: -4px; }
      .box-action .list-item::before { color: #3b82f6; }
      .box-executive .list-item::before { color: var(--rojo-marca); }
    </style>
  </head>
  <body>
    <div class="cover">
      <h1>Problema <span>Cero</span></h1>
      <p>Reporte Estratégico Ejecutivo</p>
    </div>
    <div class="page-break"></div>
    <div class="page-content">
      ${contenidoHTML}
    </div>
  </body>
  </html>
  `;
}

// RED DE ARRASTRE: Atrapa CUALQUIER petición POST sin importar la ruta
app.post("/*", async (req, res) => {
  console.log(`📥 Petición de PDF recibida en la ruta: ${req.path}`);
  let browser = null;
  
  try {
    const diagnostico = req.body.diagnostico || req.body.texto || req.body.problem;
    
    if (!diagnostico) {
      console.log("⚠️ Error: El frontend no envió el texto del diagnóstico.");
      return res.status(400).json({ error: "No se envió texto para el PDF" });
    }

    console.log("✅ Texto recibido. Iniciando motor de renderizado...");
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
      margin: { top: "40px", bottom: "50px", left: "0px", right: "0px" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="width: 100%; font-size: 9px; padding: 0 60px; display: flex; justify-content: space-between; color: #9ca3af; font-family: 'Helvetica Neue', sans-serif;">
          <span>CONFIDENCIAL - Problema Cero</span>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `
    });

    console.log("🚀 PDF generado con éxito. Enviando al cliente...");
    
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=Auditoria_Ejecutiva_ProblemaCero.pdf",
      "Content-Length": pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error("❌ Error al generar PDF:", error);
    res.status(500).json({ error: "Falla interna al generar el documento", detalle: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Motor PDF Problema Cero: Red de arrastre activa en puerto ${PORT}`));
