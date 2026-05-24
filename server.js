const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// 1. ESTA ES LA MAGIA PARA IPHONE: CARPETA TEMPORAL PÚBLICA
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
  res.send("Problema Cero PDF Premium activo con Storage Temporal");
});

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
  return linea
    .replace(/[⚡🔴🧠⚠️🚀💰🔥🔎🧭🎯🛑🔧📅📆📌💬📊👉]/g, "")
    .replace(/^\*+\s*/g, "")
    .trim();
}

function esTitulo(linea = "") {
  const t = normalizarLinea(linea)
    .replace(/:$/g, "")
    .toUpperCase();

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
  const lineas = limpiarContenido(text)
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  let html = "";
  let abierto = false;

  function cerrar() {
    if (abierto) {
      html += `</section>`;
      abierto = false;
    }
  }

  function abrir(titulo) {
    cerrar();
    html += `
      <section class="section block-avoid">
        <h2>${escapeHtml(normalizarLinea(titulo).replace(/:$/g, ""))}</h2>
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
      html += `
        <p class="bullet">
          ${escapeHtml(l.replace(/^[-*•]\s*/, "• "))}
        </p>
      `;
      return;
    }

    if (/^\d+\./.test(l)) {
      html += `
        <div class="step block-avoid">
          ${escapeHtml(l)}
        </div>
      `;
      return;
    }

    if (l.includes(":") && l.length < 120) {
      html += `
        <div class="signal block-avoid">
          ${escapeHtml(l)}
        </div>
      `;
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
    const { titulo, contenido } = req.body;
    const fecha = new Date().toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const contenidoHTML = convertirContenidoAHTML(contenido || "");

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
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
:root{ --dark:#0B132B; --dark2:#111827; --text:#111827; --muted:#1F2937; --soft:#F8FAFC; --red:#D32F2F; --border:#E5E7EB; }
*{ box-sizing:border-box; margin:0; padding:0; }
html,body{ font-family:'Inter',Arial,sans-serif; background:#fff; color:var(--text); }
body{ font-size:16px; line-height:1.85; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
@media print{
  h1,h2,h3{ break-after:avoid; page-break-after:avoid; }
  p,li{ orphans:3; widows:3; }
  .block-avoid, .signal, .step, .visual-map{ break-inside:avoid; page-break-inside:avoid; }
  .cover-wrapper{ break-after:page; page-break-after:always; }
}
.cover-wrapper{ height:238mm; background:linear-gradient(160deg,#0B132B 0%,#111827 100%); color:#fff; border-radius:18px; padding:34px 34px; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; }
.logo-card{ margin-bottom:20px; }
.logo-card img{ width:132px; height:auto; display:block; border-radius:14px; }
.brand-name{ font-size:20px; font-weight:900; letter-spacing:.10em; margin-bottom:6px; }
.brand-sub{ font-size:14px; color:#E5E7EB; }
.doc-type{ display:flex; align-items:center; font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:#F8FAFC; margin-bottom:22px; }
.doc-type::before{ content:""; width:32px; height:2px; background:var(--red); margin-right:12px; }
.cover-title{ font-size:58px; line-height:1.02; letter-spacing:-.055em; font-weight:900; margin-bottom:26px; max-width:760px; }
.cover-desc{ font-size:20px; line-height:1.75; color:#F3F4F6; max-width:720px; }
.cover-bottom{ display:grid; grid-template-columns:1fr 1fr; gap:24px; border-top:1px solid rgba(255,255,255,.20); padding-top:24px; }
.meta-label{ font-size:11px; letter-spacing:.10em; text-transform:uppercase; color:#CBD5E1; margin-bottom:6px; font-weight:700; }
.meta-value{ font-size:16px; color:#fff; font-weight:700; }
.visual-map{ background:#fff; border:1px solid var(--border); border-radius:14px; padding:26px; display:flex; align-items:center; justify-content:space-between; margin-bottom:46px; }
.step-label{ font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:#111827; margin-bottom:8px; font-weight:800; }
.step-value{ font-size:18px; color:var(--text); font-weight:800; }
.map-arrow{ color:var(--red); font-size:24px; font-weight:900; }
.section{ margin-bottom:44px; padding-bottom:34px; border-bottom:1px solid #E5E7EB; }
.section::after{ content:""; display:block; width:60px; height:3px; background:var(--red); margin-top:26px; }
h2{ font-size:34px; line-height:1.15; margin-bottom:24px; color:var(--text); font-weight:900; letter-spacing:-.03em; }
p{ margin-bottom:24px; color:var(--muted); font-size:16px; line-height:1.9; font-weight:500; }
.signal{ background:#F8FAFC; border-left:4px solid var(--red); padding:22px; margin-bottom:24px; border-radius:0 10px 10px 0; color:#111827; font-weight:800; font-size:17px; line-height:1.8; }
.step{ border-left:3px solid var(--red); padding-left:20px; margin-bottom:24px; color:#111827; font-size:17px; line-height:1.85; font-weight:600; }
.bullet{ padding-left:10px; font-weight:500; }
.closing{ background:var(--dark2); border-radius:18px; padding:42px; margin-top:56px; break-inside:avoid; }
.closing h3{ color:#fff; font-size:42px; line-height:1.08; letter-spacing:-.05em; margin-bottom:24px; font-weight:900; }
.closing p{ color:#F3F4F6; font-size:18px; line-height:1.9; }
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
<section>
  <div class="visual-map">
    <div><div class="step-label">Punto de partida</div><div class="step-value">Síntoma declarado</div></div>
    <div class="map-arrow">→</div>
    <div><div class="step-label">Lectura</div><div class="step-value">Bloqueo estratégico</div></div>
    <div class="map-arrow">→</div>
    <div><div class="step-label">Dirección</div><div class="step-value">Prioridad y avance</div></div>
  </div>
  ${contenidoHTML}
  <div class="closing">
    <h3>El problema no era hacer más.<br>Era saber qué mirar primero.</h3>
    <p>Problema Cero no reemplaza tu ejecución. Te ayuda a ordenar la lectura del problema para que la próxima decisión no salga desde la confusión.</p>
  </div>
</section>
</body>
</html>
`;

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    // 2. CREAMOS EL NOMBRE ÚNICO Y GUARDAMOS EN DISCO
    const nombreArchivo = `Diagnostico_${Date.now()}_${Math.floor(Math.random() * 1000)}.pdf`;
    const filePath = path.join(tmpDir, nombreArchivo);

    await page.pdf({
      path: filePath, // Acá le decimos que lo guarde en la carpeta
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<span></span>`,
      footerTemplate: `
        <div style="width:100%;font-family:Arial,sans-serif;font-size:10px;color:#374151;padding:0 18mm;">
          <div style="border-top:1px solid #D1D5DB;padding-top:8px;display:flex;justify-content:space-between;">
            <span style="font-weight:700;">Problema Cero — Dirección Estratégica</span>
            <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          </div>
        </div>
      `,
      margin:{ top:"18mm", bottom:"24mm", left:"18mm", right:"18mm" }
    });

    await browser.close();

    // 3. PROGRAMAMOS LA AUTODESTRUCCIÓN DEL ARCHIVO EN 5 MINUTOS (300000 milisegundos)
    setTimeout(() => {
      fs.unlink(filePath, (err) => {
        if (!err) console.log(`Archivo temporal eliminado de la memoria: ${nombreArchivo}`);
      });
    }, 300000);

    // 4. LE ENVIAMOS AL FRONTEND EL LINK EXACTO PARA QUE SAFARI LO ABRA
    const fileUrl = `https://problema-cero-pdf-production.up.railway.app/descargas/${nombreArchivo}`;

    // Respuesta limpia
    res.json({ ok: true, url: fileUrl });

  } catch(error) {
    if(browser){
      await browser.close();
    }
    console.error("Error generando PDF:", error);
    res.status(500).json({ ok:false, error:error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Problema Cero PDF Premium activo");
});
