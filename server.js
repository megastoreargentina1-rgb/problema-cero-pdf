const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Motor PDF Problema Cero: Arquitectura Editorial High-Ticket (Tipografía 24px)");
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
  let ignorarResto = false; // Nueva bandera para cortar el texto sobrante al final

  lineas.forEach(linea => {
    if (ignorarResto) return;

    let limpia = linea.trim();
    if (!limpia) return;

    if (limpia === "CONSULTA ORIGINAL:") {
      htmlResult += `<div class="editorial-header">
                       <div class="kicker">Análisis de Situación</div>
                       <h2 class="editorial-title">CASO PLANTEADO</h2>
                     </div>`;
      return;
    }
    if (limpia === "DIAGNÓSTICO:" || limpia === "DIAGNÓSTICO INICIAL:" || limpia === "Aquí tienes el análisis de Problema Cero:") {
      return; 
    }

    if (limpia.includes("━━━━━━━━━━━━━━━━━━━━") || limpia === "•") {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      return; 
    }

    // CARÁTULA SECUNDARIA (DOCUMENTO EJECUTIVO) 
    if (limpia === "ANÁLISIS COMPLETO:") {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      if (enCajaNaranja) { htmlResult += '</div>'; enCajaNaranja = false; }
      if (enCajaCierre) { htmlResult += '</div></div>'; enCajaCierre = false; }
      
      htmlResult += '<div class="page-break"></div>';
      htmlResult += `
      <div class="cover-interna">
        <img src="https://www.problemacero.com.ar/logo.png" alt="Logo Problema Cero" class="logo-portada" onerror="this.style.display='none'">
        
        <h1 style="font-size: 42px !important; margin-bottom: 10px; font-weight: 700; letter-spacing: 2px;">PROBLEMA CERO</h1>
        <div class="subtitle" style="font-size: 22px !important; margin-bottom: 50px; font-weight: 300; letter-spacing: 1px;">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
        
        <div class="diag-title" style="color: #ffffff; font-size: 65px !important; margin-bottom: 20px; font-weight: 300;">Mapa de <span style="font-weight: 700; color: var(--rojo-marca);">Ejecución</span></div>
        <div class="private" style="font-size: 16px !important; margin-bottom: 40px; letter-spacing: 4px; color: #9ca3af;">DOCUMENTO EJECUTIVO</div>
        
        <div class="description" style="font-size: 24px !important; font-weight: 300; margin-bottom: 60px; max-width: 750px; color: #d1d5db; line-height: 1.6;">
          Un plan de acción quirúrgico diseñado para corregir la raíz del problema, ordenar prioridades absolutas y escalar el negocio en los próximos 30 días.
        </div>

        <div style="max-width: 750px; margin: 0 auto; text-align: left; padding-left: 25px; border-left: 3px solid var(--rojo-marca);">
           <div style="color: #ffffff; font-size: 16px !important; font-weight: 600; margin-bottom: 10px; letter-spacing: 2px; text-transform: uppercase;">Línea Abierta Activada</div>
           <div style="color: #9ca3af; font-size: 22px !important; line-height: 1.5; margin: 0; font-weight: 300;">La claridad sin ejecución es solo entretenimiento. Si durante estos 30 días necesitás calibrar la estrategia o destrabar un paso específico, tu canal para solicitar una interconsulta 1 a 1 sigue activo en la plataforma.</div>
        </div>
      </div>
      `;
      return;
    }

    // CAJA DEL CTA NUEVO (PLAN DE ACCIÓN) - REEMPLAZA A LA BANDA BLANCA
    if (limpia.includes("ESTE DIAGNÓSTICO ES SOLO EL PUNTO DE PARTIDA") || limpia.includes("TU SIGUIENTE NIVEL DE EJECUCIÓN") || limpia.includes("TU SIGUIENTE NIVEL:")) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      htmlResult += `<div class="page-break"></div>`; 
      htmlResult += `<div class="contenedor-cierre">`;
      htmlResult += `<div class="black-box-cta">`;
      htmlResult += `<h3>TU SIGUIENTE NIVEL DE EJECUCIÓN</h3>`;
      htmlResult += `<p>Detectar el bloqueo estructural de tu negocio es vital, pero la transformación real ocurre en la acción. Tienes la hoja de ruta exacta; es momento de pasar de la teoría a la implementación concreta sin improvisar.</p>`;
      htmlResult += `<a href="https://problemacero.com.ar" class="btn-premium">DESBLOQUEAR RUTA DE 30 DÍAS</a>`;
      htmlResult += `</div></div>`;
      ignorarResto = true; // Ignora el resto del texto para que no se dupliquen las instrucciones de ChatGPT
      return;
    }

    // CAJA DEL CTA VIEJO (DIAGNÓSTICO)
    if (limpia.includes("ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL")) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      enCajaCierre = true;
      htmlResult += `<div class="page-break"></div>`; 
      htmlResult += `<div class="contenedor-cierre">`;
      htmlResult += `<div class="caja-premium-cierre">`;
      htmlResult += `<h2 class="cierre-titulo">ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL</h2>`;
      return;
    }

    // TÍTULOS DEL PLAN DE ACCIÓN Y DIAGNÓSTICO
    const regexTitulos = /^(?:🧭|🎯|🛑|🔧|📅|📆|📌|💬|📊|⚠️|🧠|⚡|🔴|🚀|💰|🔥)?\s*(MAPA EJECUTIVO|PRIORIDAD ABSOLUTA|QUÉ DEJAR DE HACER YA|QUÉ CORREGIR PRIMERO|PLAN DE ACCIÓN.*|CONTENIDO QUE DEBERÍA CREAR|MENSAJES DE VENTA.*|MÉTRICA QUE DEBERÍA MIRAR|SI \/ ENTONCES|CIERRE ESTRATÉGICO|RESUMEN RÁPIDO|PROBLEMA PRINCIPAL|QUÉ SIGNIFICA|CAUSA REAL|ACCIÓN CONCRETA|IMPACTO|CIERRE)/i;
    const matchTitulo = limpia.match(regexTitulos);

    if (matchTitulo) {
      if (enLista) { htmlResult += '</ul>'; enLista = false; }
      const tituloLimpio = matchTitulo[1].toUpperCase();
      
      if (!tituloLimpio.includes("RESUMEN RÁPIDO")) {
          htmlResult += '<div class="page-break"></div>';
      }
      
      let kickerText = "Lectura Estratégica";
      if (["MAPA EJECUTIVO", "PRIORIDAD ABSOLUTA", "QUÉ DEJAR DE HACER YA", "QUÉ CORREGIR PRIMERO", "PLAN DE ACCIÓN - PRÓXIMOS 7 DÍAS", "PLAN DE ACCIÓN - PRÓXIMOS 30 DÍAS", "SI / ENTONCES"].includes(tituloLimpio)) {
          kickerText = "Arquitectura de Decisiones";
      } else if (["CONTENIDO QUE DEBERÍA CREAR", "MENSAJES DE VENTA LISTOS PARA USAR", "MÉTRICA QUE DEBERÍA MIRAR"].includes(tituloLimpio)) {
          kickerText = "Ejecución Comercial";
      }

      htmlResult += `<div class="editorial-header">
                       <div class="kicker">${kickerText}</div>
                       <h2 class="editorial-title">${tituloLimpio}</h2>
                     </div>`;
      return;
    }

    if (limpia.includes("TU PRÓXIMO PASO:")) {
      htmlResult += `<div class="caja-cta-blanca"><p class="cta-titulo">TU PRÓXIMO PASO:</p>`;
      enCajaNaranja = true;
      return;
    }

    if (limpia.startsWith('- ') || limpia.startsWith('* ')) {
      if (!enLista) { 
        htmlResult += (enCajaCierre && !enCajaNaranja) ? '<ul class="cierre-list">' : '<ul class="editorial-list">'; 
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

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --rojo-marca: #dc2626;
        --texto-principal: #171717;
        --texto-secundario: #525252;
      }
      body {
        font-family: 'Inter', sans-serif;
        color: var(--texto-principal);
        background-color: #ffffff;
        margin: 0;
        padding: 0;
      }
      .page-content { padding: 50px 90px; }
      .page-break { page-break-before: always; height: 1px; }
      
      /* CARÁTULAS NEGRAS */
      .cover {
         height: 100vh; display: flex; flex-direction: column; justify-content: center;
         align-items: center; text-align: center; 
         background-color: #0a0a0a; color: #ffffff; padding: 0 80px; box-sizing: border-box; position: relative;
      }
      .cover-interna {
         height: 100vh; display: flex; flex-direction: column; justify-content: center;
         align-items: center; text-align: center; 
         background-color: #0a0a0a; color: #ffffff; padding: 40px 80px; box-sizing: border-box; position: relative;
         page-break-inside: avoid;
      }
      .logo-portada { width: 280px; margin-bottom: 50px; margin-top: 20px; }
      .cover h1 { font-size: 44px !important; color: var(--rojo-marca); margin-top: 0; margin-bottom: 15px; letter-spacing: 4px; font-weight: 700; }
      .cover .subtitle { font-size: 24px !important; font-weight: 300; margin-bottom: 10px; color: #d1d5db; letter-spacing: 1px;}
      .cover .private { font-size: 16px !important; font-weight: 600; margin-bottom: 60px; color: #6b7280; letter-spacing: 5px; text-transform: uppercase; }
      .cover .diag-title { font-size: 68px !important; font-weight: 300; margin-bottom: 60px; line-height: 1.1; }
      .cover .description { 
        font-size: 24px !important; color: #9ca3af; max-width: 750px; 
        border-top: 1px solid #334155; border-bottom: 1px solid #334155; 
        padding: 30px 0; margin: 0 auto; line-height: 1.6; margin-bottom: 110px; font-weight: 300;
      }
      .cover-footer { position: absolute; bottom: 50px; left: 0; right: 0; text-align: center; }
      .cover-footer .label { font-size: 14px !important; color: #6b7280; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 8px; font-weight: 600; }
      .cover-footer .value { font-size: 22px !important; color: #ffffff; font-weight: 400; letter-spacing: 1px; }

      /* ESTILOS EDITORIALES HIGH-TICKET */
      .editorial-header {
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 1px solid #e5e7eb;
      }
      .kicker {
        font-size: 14px !important;
        color: var(--rojo-marca);
        text-transform: uppercase;
        letter-spacing: 3px;
        font-weight: 700;
        margin-bottom: 10px;
      }
      .editorial-title {
        color: var(--texto-principal);
        font-size: 34px !important;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 300;
      }
      
      .texto-editorial, p {
        font-size: 24px !important;
        line-height: 1.6 !important;
        color: var(--texto-secundario);
        font-weight: 300;
        margin-bottom: 28px;
        max-width: 95%;
      }
      strong { font-weight: 600; color: #000000; }

      .editorial-list { list-style: none; padding-left: 0; margin-top: 15px; margin-bottom: 40px; }
      .list-item { 
        position: relative; 
        padding-left: 45px; 
        margin-bottom: 24px; 
        font-size: 24px !important; 
        line-height: 1.6 !important; 
        color: var(--texto-secundario); 
        font-weight: 300; 
        max-width: 95%;
      }
      .editorial-list .list-item::before { 
        content: "—"; 
        color: var(--rojo-marca); 
        font-weight: 400; 
        font-size: 24px; 
        position: absolute; 
        left: 0; 
        top: 0; 
      }

      /* CAJA CTA CIERRE DIAGNÓSTICO (VIEJA) */
      .contenedor-cierre { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 75vh; }
      .caja-premium-cierre {
        background-color: #0a0a0a; color: #ffffff; border: 1px solid #334155;
        padding: 50px; margin: 0 auto; display: block; width: 100%; box-sizing: border-box; text-align: center;
      }
      .caja-premium-cierre .cierre-titulo { 
        color: #ffffff; font-size: 26px !important; margin-top: 0; margin-bottom: 30px; 
        text-transform: uppercase; border-bottom: 1px solid var(--rojo-marca); padding-bottom: 20px; letter-spacing: 2px; font-weight: 300;
      }
      .caja-cta-blanca {
        background-color: #ffffff; border: 1px solid #e5e7eb; padding: 30px;
        margin-top: 35px; text-align: center;
      }
      .cta-titulo { color: var(--rojo-marca) !important; font-size: 16px !important; margin: 0 0 10px 0 !important; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
      .cta-texto { color: var(--texto-principal) !important; font-size: 24px !important; margin: 0 !important; font-weight: 400; }

      .cierre-list { list-style: none; padding-left: 0; margin-top: 15px; margin-bottom: 20px; }
      .cierre-list .list-item { position: relative; padding-left: 45px; margin-bottom: 16px; font-size: 22px !important; color: #9ca3af; font-weight: 300; }
      .cierre-list .list-item::before { content: "—"; color: var(--rojo-marca); position: absolute; left: 0; top: 0; }

      /* NUEVA CAJA NEGRA CTA (PLAN DE ACCIÓN) */
      .black-box-cta {
          background-color: #0a0a0a;
          color: #ffffff;
          padding: 60px 50px;
          border: 1px solid #334155;
          border-radius: 8px;
          margin: 0 auto;
          text-align: center;
          width: 100%;
          box-sizing: border-box;
      }
      .black-box-cta h3 {
          font-size: 28px !important;
          font-weight: 700;
          letter-spacing: 2px;
          margin: 0 0 20px 0;
          color: #ffffff;
          text-transform: uppercase;
          border-bottom: 1px solid var(--rojo-marca);
          padding-bottom: 20px;
          display: inline-block;
      }
      .black-box-cta p {
          font-size: 22px !important;
          font-weight: 300;
          line-height: 1.6;
          color: #e5e7eb;
          margin: 0 auto 40px auto !important;
          max-width: 90%;
      }
      .btn-premium {
          display: inline-block;
          background-color: var(--rojo-marca);
          color: #ffffff !important;
          text-decoration: none;
          padding: 18px 40px;
          font-weight: 600;
          font-size: 20px;
          letter-spacing: 1px;
          border-radius: 4px;
          text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <div class="cover">
      <img src="https://www.problemacero.com.ar/logo.png" alt="Logo Problema Cero" class="logo-portada" onerror="this.style.display='none'">
      
      <h1>PROBLEMA CERO</h1>
      <div class="subtitle">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
      <div class="private">INFORME PRIVADO</div>
      
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
      format: "A4", 
      printBackground: true, 
      margin: { top: "50px", bottom: "80px", left: "0px", right: "0px" },
      displayHeaderFooter: true, 
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="font-size: 12px; width: 100%; color: #9ca3af; padding: 0 90px; display: flex; justify-content: space-between; font-family: 'Inter', sans-serif; letter-spacing: 1px; -webkit-print-color-adjust: exact;"><span>PROBLEMA CERO</span><span>PÁGINA <span class="pageNumber"></span></span></div>`
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
app.listen(PORT, () => console.log(`Motor PDF Problema Cero corriendo en el puerto ${PORT}`));
