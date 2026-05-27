const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Motor PDF Problema Cero: Doble Carátula Premium y Línea Abierta");
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
  let enCajaNaranja = false;

  lineas.forEach(linea => {
    let limpia = linea.trim();
    if (!limpia) return;

    if (limpia === "CONSULTA ORIGINAL:") {
      htmlResult += `<h2 class="section-title">CASO PLANTEADO</h2>`;
      return;
    }
    if (limpia === "DIAGNÓSTICO:" || limpia === "DIAGNÓSTICO INICIAL:") {
      return; 
    }

    if (limpia === "ANÁLISIS COMPLETO:") {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      if (enCajaNaranja) { htmlResult += '</div>'; enCajaNaranja = false; }
      if (enCajaCierre) { htmlResult += '</div></div>'; enCajaCierre = false; }
      
      htmlResult += '<div class="page-break"></div>';
      htmlResult += `
      <div class="cover">
        <img src="https://www.problemacero.com.ar/logo.png" alt="Logo Problema Cero" class="logo-portada" onerror="this.style.display='none'">
        
        <h1>PROBLEMA CERO</h1>
        <div class="subtitle">Interconsulta estratégica empresarial</div>
        <div class="private">Documento Ejecutivo</div>
        
        <div class="diag-title" style="color: #ffffff; margin-bottom: 30px;">Mapa de<br><span style="color: var(--rojo-marca);">Ejecución</span></div>
        
        <div class="description" style="margin-bottom: 40px; border-bottom: none; padding-bottom: 0;">
          Un plan de acción quirúrgico diseñado para corregir la raíz del problema, ordenar prioridades absolutas y escalar el negocio en los próximos 30 días.
        </div>

        <div style="background-color: #0a0a0a; border-left: 6px solid var(--rojo-marca); padding: 25px 35px; max-width: 800px; margin: 0 auto; text-align: left; border-radius: 0 12px 12px 0;">
           <div style="color: var(--naranja-cta); font-size: 20px !important; font-weight: 700; margin-bottom: 12px; letter-spacing: 1px;">LÍNEA ABIERTA</div>
           <div style="color: #d1d5db; font-size: 22px !important; line-height: 1.6; margin: 0;">La claridad sin ejecución es solo entretenimiento. Si durante estos 30 días necesitás calibrar la estrategia o destrabar un paso específico, tu canal para solicitar una interconsulta 1 a 1 sigue activo.</div>
        </div>

        <div class="cover-footer">
          <div class="label">Dirección Estratégica</div>
          <div class="value">Lic. Hernán Mariano Waisman</div>
        </div>
      </div>
      `;
      htmlResult += '<div class="page-break"></div>';
      return;
    }

    if (limpia.includes("━━━━━━━━━━━━━━━━━━━━")) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      return; 
    }

    if (limpia.includes("ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL")) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      enCajaCierre = true;
      htmlResult += `<div class="page-break"></div>`; 
      htmlResult += `<div class="contenedor-cierre">`;
      htmlResult += `<div class="caja-premium-cierre">`;
      htmlResult += `<h2 class="cierre-titulo">ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL</h2>`;
      return;
    }

    const regexPlanAccion = /^(?:🧭|🎯|🛑|🔧|📅|📆|📌|💬|📊|⚠️|🧠)?\s*(MAPA EJECUTIVO|PRIORIDAD ABSOLUTA|QUÉ DEJAR DE HACER YA|QUÉ CORREGIR PRIMERO|PLAN DE ACCIÓN.*|CONTENIDO QUE DEBERÍA CREAR|MENSAJES DE VENTA.*|MÉTRICA QUE DEBERÍA MIRAR|SI \/ ENTONCES|CIERRE ESTRATÉGICO)/i;
    const matchAccion = limpia.match(regexPlanAccion);

    if (matchAccion) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      const tituloLimpio = matchAccion[1].toUpperCase();
      htmlResult += '<div class="page-break"></div>';
      htmlResult += `<div class="titulo-accion-wrapper"><h2 class="titulo-accion">${tituloLimpio}</h2></div>`;
      return;
    }

    const matchDiag = limpia.match(/^(?:⚡|🔴|🧠|⚠️|🚀|💰|🔥)\s*(.*)$/);
    if (matchDiag) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      htmlResult += `<h2 class="section-title">${matchDiag[1]}</h2>`;
      return;
    }

    if (limpia.includes("TU PRÓXIMO PASO:")) {
      htmlResult += `<div class="caja-cta-naranja"><p class="cta-titulo">TU PRÓXIMO PASO:</p>`;
      enCajaNaranja = true;
      return;
    }

    if (limpia.startsWith('- ') || limpia.startsWith('* ')) {
      if (!enLista) { 
        htmlResult += (enCajaCierre && !enCajaNaranja) ? '<ul class="cierre-list">' : '<ul class="premium-list">'; 
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
      if (enCajaNaranja) {
         htmlResult += `<p class="cta-texto">${parrafo}</p>`;
      } else if (enCajaCierre) {
         htmlResult += `<p style="color: #e5e7eb;">${parrafo}</p>`;
      } else {
         htmlResult += `<p>${parrafo}</p>`;
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

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --rojo-marca: #dc2626;
        --naranja-cta: #f97316;
        --texto-principal: #111827;
      }
      body {
        font-family: 'Inter', sans-serif;
        color: var(--texto-principal);
        background-color: #ffffff;
        margin: 0;
        padding: 0;
      }
      p, li, .list-item { 
        font-size: 24px !important; 
        line-height: 1.6 !important; 
        color: #1f2937;
      }
      .section-title { 
        font-size: 32px !important; 
        color: var(--rojo-marca); 
        text-transform: uppercase; 
        letter-spacing: 1.5px; 
        font-weight: 700; 
        margin-top: 0; 
        margin-bottom: 24px; 
        border-bottom: 2px solid #e5e7eb; 
        padding-bottom: 12px; 
      }

      .page-content { padding: 40px 90px; }
      .page-break { page-break-before: always; height: 1px; }
      
      .cover {
         height: 100vh; display: flex; flex-direction: column; justify-content: center;
         align-items: center; text-align: center; 
         background-color: #000000; color: #ffffff; padding: 0 80px; box-sizing: border-box; position: relative;
      }
      .logo-portada { width: 320px; margin-bottom: 40px; margin-top: 20px; }
      .cover h1 { font-size: 55px !important; color: var(--rojo-marca); margin-top: 0; margin-bottom: 15px; letter-spacing: 3px; }
      .cover .subtitle { font-size: 28px !important; font-weight: 400; margin-bottom: 10px; color: #d1d5db; }
      .cover .private { font-size: 20px !important; font-weight: 700; margin-bottom: 50px; color: #9ca3af; letter-spacing: 4px; text-transform: uppercase; }
      .cover .diag-title { font-size: 65px !important; font-weight: 700; margin-bottom: 50px; line-height: 1.1; }
      .cover .description { 
        font-size: 24px !important; color: #9ca3af; max-width: 800px; 
        border-top: 2px solid var(--rojo-marca); border-bottom: 2px solid var(--rojo-marca); 
        padding: 30px 0; margin: 0 auto; line-height: 1.6; margin-bottom: 110px;
      }
      .cover-footer { position: absolute; bottom: 50px; left: 0; right: 0; text-align: center; }
      .cover-footer .label { font-size: 18px !important; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
      .cover-footer .value { font-size: 24px !important; color: #ffffff; font-weight: 600; }

      strong { font-weight: 700; color: #000000; }
      .premium-list { list-style: none; padding-left: 0; margin-top: 20px; margin-bottom: 30px; }
      .list-item { position: relative; padding-left: 45px; margin-bottom: 24px; }
      .premium-list .list-item::before { content: "•"; color: var(--rojo-marca); font-weight: bold; font-size: 40px; position: absolute; left: 0; top: -6px; }

      .titulo-accion-wrapper {
        background-color: #0a0a0a;
        border-left: 8px solid var(--rojo-marca);
        padding: 20px 30px;
        margin-bottom: 40px;
        border-radius: 0 12px 12px 0;
      }
      .titulo-accion {
        color: #ffffff;
        font-size: 32px !important;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 1.5px;
      }

      .contenedor-cierre { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 75vh; }
      .caja-premium-cierre {
        background-color: #0a0a0a; color: #ffffff; border: 3px solid var(--rojo-marca);
        padding: 35px; margin: 0 auto; border-radius: 16px; display: block; width: 100%; box-sizing: border-box;
      }
      .caja-premium-cierre .cierre-titulo { 
        color: var(--rojo-marca); font-size: 26px !important; margin-top: 0; margin-bottom: 25px; 
        text-transform: uppercase; text-align: center; border-top: 2px solid var(--rojo-marca);
        border-bottom: 2px solid var(--rojo-marca); padding: 18px 0; letter-spacing: 1px;
      }
      .caja-premium-cierre p { color: #e5e7eb; font-size: 22px !important; }
      .caja-premium-cierre strong { color: #ffffff; }
      
      .caja-cta-naranja {
        background-color: #2a1005; border: 2px solid var(--naranja-cta); padding: 16px;
        border-radius: 12px; margin-top: 25px; text-align: center;
      }
      .cta-titulo { color: var(--naranja-cta) !important; font-size: 26px !important; margin: 0 0 10px 0 !important; font-weight: bold; }
      .cta-texto { color: #ffffff !important; font-size: 24px !important; margin: 0 !important; }

      .cierre-list { list-style: none; padding-left: 0; margin-top: 15px; margin-bottom: 20px; }
      .cierre-list .list-item { position: relative; padding-left: 45px; margin-bottom: 16px; font-size: 22px !important; color: #e5e7eb; }
      .cierre-list .list-item::before { content: "•"; color: var(--rojo-marca); font-weight: bold; font-size: 40px; position: absolute; left: 0; top: -6px; }
    </style>
  </head>
  <body>
    <div class="cover">
      <img src="https://www.problemacero.com.ar/logo.png" alt="Logo Problema Cero" class="logo-portada" onerror="this.style.display='none'">
      
      <h1>PROBLEMA CERO</h1>
      <div class="subtitle">Interconsulta estratégica empresarial</div>
      <div class="private">Informe Privado</div>
      
      <div class="diag-title">Diagnóstico<br>estratégico</div>
      
      <div class="description">
        Una lectura estratégica diseñada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.
      </div>

      <div class="cover-footer">
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
    if (!diagnostico) return res.status(400).json({ error: "No se envió texto para el PDF" });

    const htmlFinal = generarPlantillaPDF(diagnostico);

    browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
    const page = await browser.newPage();
    await page.setContent(htmlFinal, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4", printBackground: true, margin: { top: "40px", bottom: "60px", left: "0px", right: "0px" },
      displayHeaderFooter: true, headerTemplate: "<div></div>",
      footerTemplate: `<div style="width: 100%; font-size: 14px; padding: 0 90px; display: flex; justify-content: space-between; color: #6b7280; font-family: 'Helvetica Neue', sans-serif;"><span>Problema Cero Dirección Estratégica</span><span>Página <span class="pageNumber"></span></span></div>`
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
app.listen(PORT, () => console.log(`Motor PDF: Doble Carátula y Línea Abierta en puerto ${PORT}`));
