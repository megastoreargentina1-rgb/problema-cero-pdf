const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// CARPETA TEMPORAL PÚBLICA PARA IPHONE
const tmpDir = path.join(__dirname, "tmp_pdfs");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir);
}
app.use("/descargas", express.static(tmpDir));

let logoBase64 = "";

try {
  const logoPath = path.join(__dirname, "logo.png");
  if (fs.existsSync(logoPath)) {
    const logoData = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;
    console.log("Logo cargado correctamente");
  }
} catch (error) {
  console.error("Error leyendo logo:", error);
}

app.get("/", (req, res) => {
  res.send("Problema Cero PDF Premium activo - Diseño Editorial y Paginación Ejecutiva");
});

function escapeHtml(text = "") {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function limpiarContenido(text = "") {
  return String(text)
    .replace(/━━━━━━━━━━━━━━━━━━━━/g, "\n")
    .replace(/\*\*/g, "")
    .replace(/Aquí tienes el diagnóstico estratégico de Problema Cero:/gi, "")
    .replace(/Aquí está el diagnóstico estratégico de Problema Cero:/gi, "")
    .replace(/Aquí está el diagnóstico de Problema Cero para tu negocio:/gi, "")
    .trim();
}

function normalizarLinea(linea = "") {
  return linea.replace(/[⚡🔴🧠⚠️🚀💰🔥🔎🧭🎯🛑🔧📅📆📌💬📊👉]/g, "").replace(/^\*+\s*/g, "").trim();
}

function esTitulo(linea = "") {
  const t = normalizarLinea(linea).replace(/:$/g, "").toUpperCase();
  const titulos = [
    "RESUMEN RÁPIDO", "RESUMEN RAPIDO", "TU PROBLEMA PRINCIPAL",
    "QUÉ ESTÁ PASANDO", "QUE ESTÁ PASANDO", "QUÉ DEBERÍAS CORREGIR PRIMERO",
    "QUE DEBERÍAS CORREGIR PRIMERO", "PROBLEMA PRINCIPAL", "QUÉ SIGNIFICA",
    "QUE SIGNIFICA", "CAUSA REAL", "ACCIÓN CONCRETA", "ACCION CONCRETA",
    "IMPACTO", "CIERRE", "QUÉ CORREGIR PRIMERO", "PLAN DE ACCIÓN"
  ];
  return titulos.some(x => t === x || t.includes(x));
}

function convertirContenidoAHTML(text = "") {
  const lineas = limpiarContenido(text).split("\n").map(l => l.trim()).filter(Boolean);
  let html = "";
  let abierto = false;
  let contadorSecciones = 0;

  function cerrar() {
    if (abierto) { 
      html += `</div></section>`; 
      abierto = false; 
    }
  }

  function abrir(titulo) {
    cerrar();
    contadorSecciones++;
    
    // MAGIA ESTRATÉGICA: A partir del segundo tema, forzamos hoja nueva
    const pageBreakClass = contadorSecciones > 1 ? "page-break-section" : "";
    
    html += `
      <section class="section ${pageBreakClass}">
        <div class="editorial-header">
          <h2>${escapeHtml(normalizarLinea(titulo).replace(/:$/g, ""))}</h2>
          <div class="red-line"></div>
        </div>
        <div class="editorial-content">
    `;
    abierto = true;
  }

  lineas.forEach((linea) => {
    const l = normalizarLinea(linea);
    if (!l) return;
    
    if (esTitulo(l)) { 
      abrir(l); 
      return; 
    }
    
    if (!abierto) abrir("Lectura estratégica");

    if (l.startsWith("-") || l.startsWith("*") || l.startsWith("•")) {
      html += `<p class="bullet">${escapeHtml(l.replace(/^[-*•]\s*/, "• "))}</p>`;
      return;
    }

    if (/^\d+\./.test(l)) {
      html += `<div class="step block-avoid">${escapeHtml(l)}</div>`;
      return;
    }

    if (l.includes(":") && l.length < 120) {
      html += `<div class="signal block-avoid">${escapeHtml(l)}</div>`;
      return;
    }

    html += `<p>${escapeHtml(l)}</p>`;
  });

  cerrar();
  return html;
}

app.post("/generar-pdf", async (req, res) => {
  let browser;
  try {
    const { titulo, contenido, isMobile } = req.body;
    const fecha = new Date().toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });
    const contenidoHTML = convertirContenidoAHTML(contenido || "");

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });

    const page = await browser.newPage();

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{ 
  --brand-red: #D32F2F; 
  --dark: #0B132B; 
  --dark2: #111827; 
  --text: #111827; 
  --muted: #374151; 
  --soft-red: #FEF2F2;
  --border: #E5E7EB; 
}
*{ box-sizing:border-box; margin:0; padding:0; }
html,body{ font-family:'Inter',Arial,sans-serif; background:#fff; color:var(--text); }

/* LETRAS INTELIGENTES: 26px para celular (gigantes), 16px para PC (ejecutivas) */
body{ font-size:${isMobile ? '26px' : '16px'}; line-height:${isMobile ? '1.8' : '1.9'}; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }

@media print{
  h1,h2,h3{ break-after:avoid; page-break-after:avoid; }
  p,li{ orphans:3; widows:3; }
  .block-avoid, .signal, .step, .visual-map, .editorial-header{ break-inside:avoid; page-break-inside:avoid; }
  .cover-wrapper{ break-after:page; page-break-after:always; }
  .closing{ break-before:page; page-break-before:always; }
  /* ORDEN DE SALTO DE PÁGINA PARA CADA TEMA */
  .page-break-section { break-before:page; page-break-before:always; }
}

.cover-wrapper{ height:238mm; background:linear-gradient(160deg,#0B132B 0%,#111827 100%); color:#fff; border-radius:18px; padding:${isMobile ? '40px' : '34px'}; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; }
.logo-card{ margin-bottom:20px; }
.logo-card img{ width:150px; height:auto; display:block; border-radius:14px; }
.brand-name{ font-size:${isMobile ? '24px' : '20px'}; font-weight:900; letter-spacing:.10em; margin-bottom:6px; }
.brand-sub{ font-size:${isMobile ? '16px' : '14px'}; color:#E5E7EB; }
.doc-type{ display:flex; align-items:center; font-size:14px; letter-spacing:.12em; text-transform:uppercase; color:#F8FAFC; margin-bottom:22px; }
.doc-type::before{ content:""; width:32px; height:2px; background:var(--brand-red); margin-right:12px; }
.cover-title{ font-size:${isMobile ? '64px' : '58px'}; line-height:1.05; letter-spacing:-.055em; font-weight:900; margin-bottom:26px; max-width:760px; }
.cover-desc{ font-size:${isMobile ? '26px' : '20px'}; line-height:1.75; color:#F3F4F6; max-width:720px; }
.cover-bottom{ display:grid; grid-template-columns:1fr 1fr; gap:24px; border-top:1px solid rgba(255,255,255,.20); padding-top:24px; }
.meta-label{ font-size:13px; letter-spacing:.10em; text-transform:uppercase; color:#CBD5E1; margin-bottom:6px; font-weight:700; }
.meta-value{ font-size:18px; color:#fff; font-weight:700; }

.visual-map{ background:#fff; border:1px solid var(--border); border-radius:14px; padding:30px; display:flex; align-items:center; justify-content:space-between; margin-bottom:46px; }
.step-label{ font-size:13px; text-transform:uppercase; letter-spacing:.08em; color:#111827; margin-bottom:8px; font-weight:800; }
.step-value{ font-size:${isMobile ? '22px' : '18px'}; color:var(--text); font-weight:800; }
.map-arrow{ color:var(--brand-red); font-size:28px; font-weight:900; }

.section{ margin-bottom:50px; }
.editorial-header{ margin-bottom: 24px; }
h2{ font-size:${isMobile ? '46px' : '36px'}; line-height:1.15; color:var(--text); font-weight:900; letter-spacing:-.03em; margin-bottom: 12px; }
.red-line{ width: 60px; height: 4px; background-color: var(--brand-red); border-radius: 2px; }

p{ margin-bottom:24px; color:var(--muted); font-size:${isMobile ? '26px' : '16px'}; font-weight:500; }

/* DISEÑO EDITORIAL: Cajas de impacto elegantes */
.signal{ background:var(--soft-red); border-left:5px solid var(--brand-red); padding:26px; margin-bottom:28px; border-radius:0 12px 12px 0; color:#111827; font-weight:700; font-size:${isMobile ? '26px' : '18px'}; line-height:1.7; }
.step{ border-left:3px solid var(--brand-red); padding-left:24px; margin-bottom:24px; color:#111827; font-size:${isMobile ? '26px' : '17px'}; line-height:1.7; font-weight:700; }
.bullet{ padding-left:14px; font-weight:500; position: relative; }

.closing{ background:var(--dark2); border-radius:18px; padding:50px; margin-top:40px; }
.closing h3{ color:#fff; font-size:${isMobile ? '50px' : '42px'}; line-height:1.1; letter-spacing:-.05em; margin-bottom:24px; font-weight:900; }
.closing p{ color:#F3F4F6; font-size:${isMobile ? '26px' : '18px'}; line-height:1.8; margin-bottom:0; }
</style>
</head>
<body>
<section class="cover-wrapper">
  <div>
    ${logoBase64 ? `<div class="logo-card"><img src="${logoBase64}" alt="Problema Cero Logo"></div>` : ""}
    <div class="brand-name">PROBLEMA CERO</div>
    <div class="brand-sub">Interconsulta estratégica empresarial</div>
  </div>
  <div>
    <div class="doc-type">Informe privado</div>
    <div class="cover-title">${escapeHtml(titulo || "Diagnóstico estratégico")}</div>
    <div class="cover-desc">Una lectura estratégica diseñada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.</div>
  </div>
  <div class="cover-bottom">
    <div><div class="meta-label">Fecha de emisión</div><div class="meta-value">${fecha}</div></div>
    <div><div class="meta-label">Dirección estratégica</div><div class="meta-value">Lic. Hernán Mariano Waisman</div></div>
  </div>
</section>
<section class="section">
  <div class="visual-map">
    <div><div class="step-label">Punto de partida</div><div class="step-value">Síntoma declarado</div></div>
    <div class="map-arrow">→</div>
    <div><div class="step-label">Lectura</div><div class="step-value">Bloqueo estratégico</div></div>
    <div class="map-arrow">→</div>
    <div><div class="step-label">Dirección</div><div class="step-value">Prioridad y avance</div></div>
  </div>
</section>
  ${contenidoHTML}
  <div class="closing">
    <h3>El problema no era hacer más.<br>Era saber qué mirar primero.</h3>
    <p>Problema Cero no reemplaza tu ejecución. Te ayuda a ordenar la lectura del problema para que la próxima decisión no salga desde la confusión.</p>
  </div>
</body>
</html>
`;

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const nombreArchivo = `Diagnostico_${Date.now()}_${Math.floor(Math.random() * 1000)}.pdf`;
    const filePath = path.join(tmpDir, nombreArchivo);

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<span></span>`,
      footerTemplate: `
        <div style="width:100%;font-family:Arial,sans-serif;font-size:12px;color:#374151;padding:0 18mm;">
          <div style="border-top:1px solid #D1D5DB;padding-top:8px;display:flex;justify-content:space-between;">
            <span style="font-weight:700;">Problema Cero — Dirección Estratégica</span>
            <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          </div>
        </div>
      `,
      margin:{ top:"18mm", bottom:"24mm", left:"18mm", right:"18mm" }
    });

    await browser.close();

    setTimeout(() => {
      fs.unlink(filePath, (err) => {
        if (!err) console.log(`Archivo temporal eliminado: ${nombreArchivo}`);
      });
    }, 300000);

    const fileUrl = `https://problema-cero-pdf-production.up.railway.app/descargas/${nombreArchivo}`;
    res.json({ ok: true, url: fileUrl });

  } catch(error) {
    if(browser) await browser.close();
    console.error("Error generando PDF:", error);
    res.status(500).json({ ok:false, error:error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Problema Cero PDF Premium activo");
});
