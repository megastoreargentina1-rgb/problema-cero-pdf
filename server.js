const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

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
    .replace(/Aquí tienes el diagnóstico estratégico de Problema Cero:/gi, "")
    .replace(/Aquí está el diagnóstico estratégico de Problema Cero:/gi, "")
    .replace(/Aquí está el diagnóstico de Problema Cero para tu negocio:/gi, "")
    .replace(/\*\*/g, "")
    .trim();
}

function normalizarLinea(linea = "") {
  return linea
    .replace(/[⚡🔴🧠⚠️🚀💰🔥🔎🧭🎯🛑🔧📅📆📌💬📊👉]/g, "")
    .trim();
}

function getLogoHTML() {
  const posibles = ["logo.png", "logo.PNG", "IMG_3532.PNG", "IMG_3532.png"];

  for (const nombre of posibles) {
    const filePath = path.join(__dirname, nombre);
    if (fs.existsSync(filePath)) {
      const ext = nombre.toLowerCase().endsWith(".jpg") || nombre.toLowerCase().endsWith(".jpeg")
        ? "jpeg"
        : "png";
      const base64 = fs.readFileSync(filePath).toString("base64");
      return `<img class="cover-logo" src="data:image/${ext};base64,${base64}" alt="Problema Cero Logo" />`;
    }
  }

  return `<div class="logo-fallback">P</div>`;
}

function esTitulo(linea = "") {
  const t = normalizarLinea(linea).toUpperCase();

  const titulos = [
    "CONSULTA ORIGINAL:",
    "DIAGNÓSTICO:",
    "RESUMEN RÁPIDO",
    "PROBLEMA PRINCIPAL",
    "QUÉ SIGNIFICA",
    "QUE SIGNIFICA",
    "CAUSA REAL",
    "ACCIÓN CONCRETA",
    "ACCION CONCRETA",
    "IMPACTO",
    "CIERRE",
    "ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL",
    "ESTE DIAGNOSTICO ES SOLO EL PRIMER NIVEL",
    "ANÁLISIS COMPLETO",
    "ANALISIS COMPLETO",
    "MAPA EJECUTIVO",
    "PRIORIDAD ABSOLUTA",
    "QUÉ DEJAR DE HACER YA",
    "QUE DEJAR DE HACER YA",
    "QUÉ CORREGIR PRIMERO",
    "QUE CORREGIR PRIMERO",
    "PLAN DE ACCIÓN",
    "PLAN DE ACCION",
    "CIERRE ESTRATÉGICO",
    "CIERRE ESTRATEGICO"
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
      html += `<div class="signal block-avoid">${escapeHtml(l)}</div>`;
      return;
    }

    if (/^\d+\./.test(l)) {
      html += `<p class="step block-avoid">${escapeHtml(l)}</p>`;
      return;
    }

    if (l.startsWith("-")) {
      html += `<p class="bullet">${escapeHtml(l.replace(/^-/, "•"))}</p>`;
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

    const tituloSeguro = escapeHtml(titulo || "Diagnóstico estratégico");
    const contenidoHTML = convertirContenidoAHTML(contenido || "");
    const logoHTML = getLogoHTML();

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
<meta charset="UTF-8" />
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #111111;
  font-family: Inter, Arial, Helvetica, sans-serif;
}

body {
  font-size: 11pt;
  line-height: 1.62;
}

@media print {
  h1, h2, h3 {
    break-after: avoid;
    page-break-after: avoid;
  }

  p, li {
    orphans: 3;
    widows: 3;
  }

  .block-avoid,
  .signal,
  .step,
  .map,
  .closing {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .cover {
    break-after: page;
    page-break-after: always;
  }
}

.cover {
  min-height: 242mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8mm 0;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 52px;
}

.logo-wrap {
  width: 74px;
  height: 74px;
  border: 1px solid #eeeeee;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  overflow: hidden;
}

.cover-logo {
  max-width: 58px;
  max-height: 58px;
  object-fit: contain;
  display: block;
}

.logo-fallback {
  font-size: 32px;
  font-weight: 900;
  color: #111111;
}

.brand-name {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.brand-sub {
  font-size: 11px;
  color: #666666;
  margin-top: 3px;
}

.label {
  display: inline-block;
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #555555;
  border-bottom: 1.5px solid #d32f2f;
  padding-bottom: 8px;
  margin-bottom: 28px;
}

h1 {
  font-size: 42px;
  line-height: 1.06;
  letter-spacing: -0.055em;
  margin: 0 0 28px 0;
  max-width: 620px;
}

.cover-text {
  font-size: 15px;
  line-height: 1.75;
  color: #4a4a4a;
  max-width: 560px;
  font-weight: 300;
  margin-bottom: 70px;
}

.meta {
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 26px;
  border-top: 1px solid #e7e7e7;
  padding-top: 26px;
  max-width: 650px;
}

.meta small {
  display: block;
  font-size: 9px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: #777777;
  margin-bottom: 6px;
}

.meta strong {
  font-size: 12px;
  color: #111111;
  font-weight: 600;
}

.intro {
  background: #f8f8f8;
  border-left: 2.5px solid #d32f2f;
  padding: 20px 24px;
  margin-bottom: 34px;
  break-inside: avoid;
}

.intro-title {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  color: #d32f2f;
  font-weight: 800;
  margin-bottom: 8px;
}

.intro p {
  margin: 0;
  color: #444444;
  font-size: 12px;
  line-height: 1.7;
}

.map {
  display: grid;
  grid-template-columns: 1fr 28px 1fr 28px 1fr;
  align-items: stretch;
  gap: 0;
  margin: 0 0 38px 0;
}

.map-card {
  border: 1px solid #e7e7e7;
  background: #ffffff;
  padding: 17px;
  min-height: 92px;
}

.map-card small {
  display: block;
  font-size: 8px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: #d32f2f;
  font-weight: 800;
  margin-bottom: 7px;
}

.map-card strong {
  display: block;
  font-size: 11px;
  line-height: 1.45;
  color: #111111;
  font-weight: 600;
}

.arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d32f2f;
  font-weight: 800;
  font-size: 18px;
}

.section {
  margin: 0 0 32px 0;
  padding: 0 0 28px 0;
  border-bottom: 1px solid #eeeeee;
}

.section::after {
  content: "";
  display: block;
  width: 48px;
  height: 2px;
  background: #d32f2f;
  margin-top: 22px;
}

h2 {
  font-size: 17px;
  line-height: 1.25;
  letter-spacing: -0.025em;
  margin: 0 0 18px 0;
  color: #111111;
  font-weight: 700;
}

p {
  font-size: 12.2px;
  line-height: 1.72;
  color: #444444;
  font-weight: 300;
  margin: 0 0 14px 0;
}

.signal {
  background: #f8f8f8;
  border-left: 2.5px solid #d32f2f;
  padding: 15px 18px;
  margin: 0 0 16px 0;
  font-size: 12.2px;
  line-height: 1.65;
  color: #111111;
  font-weight: 500;
}

.step {
  padding-left: 18px;
  border-left: 2px solid #d32f2f;
  margin-bottom: 17px;
  font-weight: 300;
}

.bullet {
  padding-left: 8px;
}

.closing {
  background: #111111;
  color: #ffffff;
  padding: 34px 38px;
  margin-top: 38px;
}

.closing h3 {
  font-size: 26px;
  line-height: 1.12;
  letter-spacing: -0.045em;
  margin: 0 0 18px 0;
  color: #ffffff;
}

.closing p {
  color: #d8d8d8;
  font-size: 12.4px;
  line-height: 1.72;
  margin: 0;
}
</style>
</head>

<body>

<section class="cover">
  <div class="brand-row">
    <div class="logo-wrap">
      ${logoHTML}
    </div>
    <div>
      <div class="brand-name">PROBLEMA CERO</div>
      <div class="brand-sub">Interconsulta estratégica empresarial</div>
    </div>
  </div>

  <div class="label">Informe privado</div>

  <h1>${tituloSeguro}</h1>

  <div class="cover-text">
    Una lectura estratégica pensada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.
  </div>

  <div class="meta">
    <div>
      <small>Fecha de emisión</small>
      <strong>${fecha}</strong>
    </div>
    <div>
      <small>Dirección estratégica</small>
      <strong>Lic. Hernán Mariano Waisman</strong>
    </div>
  </div>
</section>

<section>
  <div class="intro">
    <div class="intro-title">Antes de leer</div>
    <p>
      Este informe no intenta sonar automático ni llenar páginas. Su función es observar el caso, ordenar prioridades y señalar qué mirar primero para destrabar el negocio.
    </p>
  </div>

  <div class="map">
    <div class="map-card">
      <small>Punto de partida</small>
      <strong>Síntoma declarado por el negocio</strong>
    </div>
    <div class="arrow">→</div>
    <div class="map-card">
      <small>Lectura</small>
      <strong>Bloqueo estratégico detectado</strong>
    </div>
    <div class="arrow">→</div>
    <div class="map-card">
      <small>Dirección</small>
      <strong>Prioridad para destrabar avance</strong>
    </div>
  </div>

  ${contenidoHTML}

  <div class="closing">
    <h3>El problema no era hacer más.<br>Era saber qué mirar primero.</h3>
    <p>
      Problema Cero no reemplaza tu ejecución. Te ayuda a ordenar la lectura del problema para que la próxima decisión no salga desde la confusión.
    </p>
  </div>
</section>

</body>
</html>
`;

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<span></span>`,
      footerTemplate: `
        <div style="width:100%; font-family:Arial, sans-serif; font-size:8px; color:#888; padding:0 25mm;">
          <div style="border-top:1px solid #e5e5e5; padding-top:6px; display:flex; justify-content:space-between;">
            <span>Problema Cero · Dirección estratégica: Lic. Hernán Mariano Waisman</span>
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
    if (browser) await browser.close();

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
