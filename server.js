const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

let logoBase64 = "";

try {
  const logoPath = path.join(__dirname, "logo.png");

  if (fs.existsSync(logoPath)) {
    const logoData = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;
    console.log("✅ Logo cargado correctamente");
  } else {
    console.log("⚠️ No se encontró logo.png");
  }

} catch (error) {
  console.error("Error leyendo logo:", error);
}

app.get("/", (req, res) => {
  res.send("Problema Cero PDF Premium activo");
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
    .trim();
}

function esTitulo(linea = "") {
  const t = normalizarLinea(linea).toUpperCase();

  const titulos = [
    "RESUMEN RÁPIDO",
    "RESUMEN RAPIDO",
    "PROBLEMA PRINCIPAL",
    "QUÉ SIGNIFICA",
    "QUE SIGNIFICA",
    "CAUSA REAL",
    "ACCIÓN CONCRETA",
    "ACCION CONCRETA",
    "IMPACTO",
    "CIERRE",
    "MAPA EJECUTIVO",
    "PRIORIDAD ABSOLUTA",
    "QUÉ DEJAR DE HACER YA",
    "QUE DEJAR DE HACER YA",
    "QUÉ CORREGIR PRIMERO",
    "QUE CORREGIR PRIMERO",
    "PLAN DE ACCIÓN",
    "PLAN DE ACCION",
    "CIERRE ESTRATÉGICO",
    "CIERRE ESTRATEGICO",
    "CONTENIDO QUE DEBERÍA CREAR",
    "CONTENIDO QUE DEBERIA CREAR",
    "MENSAJES DE VENTA LISTOS PARA USAR",
    "MÉTRICA QUE DEBERÍA MIRAR",
    "METRICA QUE DEBERIA MIRAR",
    "SI / ENTONCES"
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
        <h2>${escapeHtml(normalizarLinea(titulo))}</h2>
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

    const lower = l.toLowerCase();

    if (
      lower.startsWith("tu problema principal:") ||
      lower.startsWith("qué está pasando:") ||
      lower.startsWith("que está pasando:") ||
      lower.startsWith("qué deberías corregir primero:") ||
      lower.startsWith("que deberías corregir primero:")
    ) {

      html += `
        <div class="signal block-avoid">
          ${escapeHtml(l)}
        </div>
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

    if (l.startsWith("-")) {

      html += `
        <p class="bullet">
          ${escapeHtml(l.replace(/^-/, "•"))}
        </p>
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

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">

<style>

:root{
  --bg-dark:#0F172A;
  --text-main:#111827;
  --text-secondary:#374151;
  --red:#D32F2F;
  --light:#F8FAFC;
}

*{
  box-sizing:border-box;
  margin:0;
  padding:0;
}

html,body{
  font-family:'Inter',sans-serif;
  background:#ffffff;
  color:var(--text-main);
}

body{
  font-size:12px;
  line-height:1.72;
}

@media print{

  h1,h2,h3{
    break-after:avoid;
    page-break-after:avoid;
  }

  p,li{
    orphans:3;
    widows:3;
  }

  .block-avoid,
  .signal,
  .step,
  .visual-map,
  .cover-wrapper{
    break-inside:avoid;
    page-break-inside:avoid;
  }

  .cover-wrapper{
    break-after:page;
    page-break-after:always;
  }

}

.cover-wrapper{
  min-height:245mm;
  background:linear-gradient(180deg,#0F172A 0%, #111827 100%);
  color:#ffffff;
  border-radius:18px;
  padding:48px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
}

.cover-top{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
}

.logo-card{
  background:#ffffff;
  border-radius:18px;
  padding:18px;
  margin-bottom:28px;
  box-shadow:0 8px 24px rgba(0,0,0,0.25);
}

.logo-card img{
  width:58px;
  height:auto;
  display:block;
}

.brand-name{
  font-size:16px;
  font-weight:900;
  letter-spacing:0.12em;
  margin-bottom:4px;
}

.brand-sub{
  font-size:11px;
  color:#CBD5E1;
  font-weight:400;
}

.cover-middle{
  margin-top:20px;
}

.doc-type{
  display:flex;
  align-items:center;
  font-size:9px;
  letter-spacing:0.12em;
  text-transform:uppercase;
  color:#E2E8F0;
  margin-bottom:18px;
}

.doc-type::before{
  content:"";
  width:22px;
  height:2px;
  background:var(--red);
  margin-right:12px;
}

.cover-title{
  font-size:44px;
  line-height:1.05;
  letter-spacing:-0.05em;
  font-weight:900;
  margin-bottom:28px;
  max-width:640px;
}

.cover-desc{
  font-size:14px;
  line-height:1.8;
  color:#CBD5E1;
  max-width:620px;
  font-weight:300;
}

.cover-bottom{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:24px;
  border-top:1px solid rgba(255,255,255,0.14);
  padding-top:28px;
}

.meta-label{
  font-size:8px;
  letter-spacing:0.10em;
  text-transform:uppercase;
  color:#94A3B8;
  margin-bottom:6px;
}

.meta-value{
  font-size:12px;
  color:#ffffff;
  font-weight:600;
}

.interior{
  padding-top:6px;
}

.visual-map{
  background:var(--light);
  border:1px solid #E2E8F0;
  border-radius:12px;
  padding:24px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:40px;
}

.map-step{
  display:flex;
  flex-direction:column;
}

.step-label{
  font-size:8px;
  text-transform:uppercase;
  letter-spacing:0.08em;
  color:#64748B;
  margin-bottom:5px;
  font-weight:700;
}

.step-value{
  font-size:12px;
  color:var(--text-main);
  font-weight:700;
}

.map-arrow{
  color:var(--red);
  font-size:18px;
  font-weight:900;
}

.section{
  margin-bottom:36px;
  padding-bottom:28px;
  border-bottom:1px solid #EEEEEE;
}

.section::after{
  content:"";
  display:block;
  width:52px;
  height:2px;
  background:var(--red);
  margin-top:24px;
}

h2{
  font-size:18px;
  line-height:1.2;
  margin-bottom:18px;
  color:var(--text-main);
  letter-spacing:-0.02em;
  font-weight:800;
}

p{
  margin-bottom:16px;
  color:var(--text-secondary);
  font-size:12.5px;
  line-height:1.78;
  font-weight:400;
}

.signal{
  background:#F8FAFC;
  border-left:3px solid var(--red);
  padding:18px 20px;
  margin-bottom:18px;
  border-radius:0 8px 8px 0;
  color:var(--text-main);
  font-weight:600;
  line-height:1.7;
}

.step{
  border-left:2px solid var(--red);
  padding-left:16px;
  margin-bottom:18px;
  color:var(--text-secondary);
}

.bullet{
  padding-left:6px;
}

.closing{
  background:#111827;
  border-radius:16px;
  padding:38px;
  margin-top:44px;
}

.closing h3{
  color:#ffffff;
  font-size:28px;
  line-height:1.15;
  letter-spacing:-0.04em;
  margin-bottom:20px;
  font-weight:900;
}

.closing p{
  color:#D1D5DB;
  font-size:13px;
  line-height:1.8;
}

</style>

</head>

<body>

<section class="cover-wrapper">

  <div class="cover-top">

    ${
      logoBase64
      ? `
      <div class="logo-card">
        <img src="${logoBase64}" alt="Problema Cero Logo">
      </div>
      `
      : ""
    }

    <div class="brand-name">
      PROBLEMA CERO
    </div>

    <div class="brand-sub">
      Interconsulta estratégica empresarial
    </div>

  </div>

  <div class="cover-middle">

    <div class="doc-type">
      Informe privado
    </div>

    <div class="cover-title">
      ${escapeHtml(titulo || "Diagnóstico estratégico")}
    </div>

    <div class="cover-desc">
      Una lectura estratégica pensada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.
    </div>

  </div>

  <div class="cover-bottom">

    <div>
      <div class="meta-label">
        Fecha de emisión
      </div>

      <div class="meta-value">
        ${fecha}
      </div>
    </div>

    <div>
      <div class="meta-label">
        Dirección estratégica
      </div>

      <div class="meta-value">
        Lic. Hernán Mariano Waisman
      </div>
    </div>

  </div>

</section>

<section class="interior">

  <div class="visual-map">

    <div class="map-step">
      <div class="step-label">
        Punto de partida
      </div>

      <div class="step-value">
        Síntoma declarado
      </div>
    </div>

    <div class="map-arrow">→</div>

    <div class="map-step">
      <div class="step-label">
        Lectura
      </div>

      <div class="step-value">
        Bloqueo estratégico
      </div>
    </div>

    <div class="map-arrow">→</div>

    <div class="map-step">
      <div class="step-label">
        Dirección
      </div>

      <div class="step-value">
        Prioridad y avance
      </div>
    </div>

  </div>

  ${contenidoHTML}

  <div class="closing">

    <h3>
      El problema no era hacer más.<br>
      Era saber qué mirar primero.
    </h3>

    <p>
      Problema Cero no reemplaza tu ejecución. Te ayuda a ordenar la lectura del problema para que la próxima decisión no salga desde la confusión.
    </p>

  </div>

</section>

</body>

</html>
`;

    await page.setContent(html, {
      waitUntil: "networkidle0"
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<span></span>`,
      footerTemplate: `
        <div style="width:100%;font-family:Inter,sans-serif;font-size:8px;color:#94A3B8;padding:0 25mm;">
          <div style="border-top:1px solid #E2E8F0;padding-top:8px;display:flex;justify-content:space-between;">
            <span style="font-weight:600;">Problema Cero — Dirección Estratégica</span>
            <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          </div>
        </div>
      `,
      margin: {
        top: "25mm",
        bottom: "30mm",
        left: "25mm",
        right: "25mm"
      }
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdf.length
    });

    res.send(pdf);

  } catch (error) {

    if (browser) {
      await browser.close();
    }

    console.error("Error generando PDF:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Problema Cero PDF Premium activo");
});
