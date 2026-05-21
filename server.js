const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("Problema Cero PDF Premium activo");
});

const LOGO_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABIMDRANCxIQDhAUExIVGywdGxgYGzYnKSAsQDlEQz85Pj1HUGZXR0thTT0+WXlaYWltcnNyRVV9hnxvhWZwcm7/2wBDARMUFBsXGzQdHTRuST5Jbm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm7/wAARCAB4AF8DASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAUDBAYH/8QAPxAAAQMDAgQCBgYIBwAAAAAAAQACAwQFEQYhEjFBUWEHInGBkaGxwTNCUnLR8BUjNGJygpKisvEVM3OS/8QAFgEBAQEAAAAAAAAAAAAAAAAAAQID/8QAHhEBAQACAgIDAQAAAAAAAAAAAQIRITESIkFREzL/2gAMAwEAAhEDEQA/AO9FFFABRRRQAV4pzVphSk5kPR6n7rcG09J9S81cDqemxx8Lh8p+c+tYyqr33FFeZzHWNo0bklLCkE5H+7xUC4Wnao0kk7Y+EePa6e1ctr7Gm7IoYmIG5PHtB7AXJqehnp9nIraCRZ8zjo5O3RYnfA1yslscv1LKcEGdCw2jexq7Di3p9wNcouhmoqIyujE6RIwPfI5PvArUxnC1WlM58bXjPaePpVphbN6jYPPmP5Vh2Wr62tHFbsw+p98/hfL4BfMZqY2k1lK+eoU0rJzX+Jp2H0Yp8bPoyK9U7xRUy80UUUAF5Z2tpcN6hFqfK7bW8dz1gD7VL9It2zTNpJLEdsqHkNqKLMuG9k7HY5FdJ4/wDTodCt/RO4+Xy1gW1FQjKud3/ltG1bTT0u6lZJpJJO0a1gCSo57xjgd6UPZdl36bqjHpGkM9tbSyeJt2mHk4NfVY8ePkrLZTa0uSS0u53Zdt1zE9z8CqWQ2fqXXR1SxV0bfrb3KxJ+PyWlU+K6en6W0U09MkhkaeOPHwKc0m6t6N61n7t/c2ZPPUd4z1XW3k69D4pc4d6Yo6/3kMeYxzH5VSPtM2TVWnC1NbG9kZWtk9P6e4d4qO0l16VziiiuKogooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/Z";

function escapeHtml(text = "") {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
  return linea.replace(/[⚡🔴🧠⚠️🚀💰🔥🔎🧭🎯🛑🔧📅📆📌💬📊👉]/g, "").trim();
}

function esTitulo(linea = "") {
  const t = normalizarLinea(linea).toUpperCase();
  return [
    "CONSULTA ORIGINAL:", "DIAGNÓSTICO:", "RESUMEN RÁPIDO", "PROBLEMA PRINCIPAL",
    "QUÉ SIGNIFICA", "QUE SIGNIFICA", "CAUSA REAL", "ACCIÓN CONCRETA",
    "ACCION CONCRETA", "IMPACTO", "CIERRE",
    "ESTE DIAGNÓSTICO ES SOLO EL PRIMER NIVEL", "ESTE DIAGNOSTICO ES SOLO EL PRIMER NIVEL",
    "ANÁLISIS COMPLETO", "ANALISIS COMPLETO", "MAPA EJECUTIVO",
    "PRIORIDAD ABSOLUTA", "QUÉ DEJAR DE HACER YA", "QUE DEJAR DE HACER YA",
    "QUÉ CORREGIR PRIMERO", "QUE CORREGIR PRIMERO", "PLAN DE ACCIÓN",
    "PLAN DE ACCION", "CIERRE ESTRATÉGICO", "CIERRE ESTRATEGICO"
  ].some(x => t === x || t.includes(x));
}

function convertirContenidoAHTML(text = "") {
  const lineas = limpiarContenido(text).split("\n").map(l => l.trim()).filter(Boolean);
  let html = "";
  let abierto = false;

  function cerrar() {
    if (abierto) {
      html += "</section>";
      abierto = false;
    }
  }

  function abrir(titulo) {
    cerrar();
    html += `<section class="chapter"><h2>${escapeHtml(normalizarLinea(titulo))}</h2>`;
    abierto = true;
  }

  lineas.forEach(linea => {
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
      html += `<div class="signal">${escapeHtml(l)}</div>`;
    } else if (/^\d+\./.test(l)) {
      html += `<p class="step">${escapeHtml(l)}</p>`;
    } else if (l.startsWith("-")) {
      html += `<p class="bullet">${escapeHtml(l.replace(/^-/, "•"))}</p>`;
    } else {
      html += `<p>${escapeHtml(l)}</p>`;
    }
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

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>
@page { size: A4; margin: 18mm 15mm 20mm 15mm; }

* { box-sizing: border-box; }

body {
  margin: 0;
  background: #ffffff;
  color: #111827;
  font-family: Arial, Helvetica, sans-serif;
}

.cover {
  min-height: calc(297mm - 38mm);
  padding: 26mm 22mm;
  background: linear-gradient(135deg,#0b1120 0%,#111827 100%);
  color: white;
  page-break-after: always;
  border-radius: 0;
  position: relative;
}

.brand {
  display: flex;
  align-items: center;
  gap: 18px;
}

.logo-card {
  width: 88px;
  height: 88px;
  background: #ffffff;
  border-radius: 24px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-card img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.brand-title {
  font-size: 31px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.brand-subtitle {
  margin-top: 5px;
  color: #cbd5e1;
  font-size: 13px;
}

.hero {
  margin-top: 95px;
  max-width: 620px;
}

.label {
  display: inline-block;
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.18);
  color: #bfdbfe;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 28px;
}

h1 {
  margin: 0;
  font-size: 54px;
  line-height: 0.98;
  letter-spacing: -0.06em;
}

.hero-text {
  margin-top: 30px;
  color: #d1d5db;
  font-size: 18px;
  line-height: 1.7;
}

.meta {
  position: absolute;
  left: 22mm;
  right: 22mm;
  bottom: 24mm;
  display: grid;
  grid-template-columns: 1fr 1fr 1.35fr;
  gap: 18px;
}

.meta-card {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 20px;
  padding: 20px;
}

.meta-card small {
  display: block;
  color: #94a3b8;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.meta-card strong {
  font-size: 14px;
  line-height: 1.5;
}

.intro {
  background: #f8fafc;
  border-left: 5px solid #2563eb;
  border-radius: 18px;
  padding: 22px 26px;
  margin-bottom: 30px;
  break-inside: avoid;
}

.intro-title {
  color: #2563eb;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 900;
  margin-bottom: 10px;
}

.intro p {
  margin: 0;
  color: #374151;
  font-size: 15px;
  line-height: 1.75;
}

.map {
  display: grid;
  grid-template-columns: 1fr 34px 1fr 34px 1fr;
  align-items: center;
  margin: 0 0 38px 0;
  break-inside: avoid;
}

.map-card {
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 18px;
  padding: 18px;
  min-height: 105px;
}

.map-card small {
  display: block;
  color: #2563eb;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}

.map-card strong {
  display: block;
  color: #0b1120;
  font-size: 14px;
  line-height: 1.35;
}

.arrow {
  text-align: center;
  color: #2563eb;
  font-size: 24px;
  font-weight: 900;
}

.chapter {
  margin-bottom: 34px;
  padding-bottom: 26px;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
  break-inside: auto;
  page-break-inside: auto;
}

.chapter::after {
  content: "";
  width: 52px;
  height: 3px;
  background: #2563eb;
  border-radius: 999px;
  position: absolute;
  bottom: -2px;
  left: 0;
}

h2 {
  font-size: 24px;
  line-height: 1.15;
  letter-spacing: -0.035em;
  color: #0b1120;
  margin: 0 0 18px 0;
  padding-bottom: 10px;
  border-bottom: 3px solid #dbeafe;
  break-after: avoid;
  page-break-after: avoid;
}

p {
  font-size: 15.2px;
  line-height: 1.86;
  color: #1f2937;
  margin: 0 0 15px 0;
  orphans: 4;
  widows: 4;
}

.signal {
  background: #eff6ff;
  border-left: 4px solid #2563eb;
  padding: 15px 17px;
  border-radius: 15px;
  margin-bottom: 16px;
  font-size: 15px;
  line-height: 1.72;
  font-weight: 700;
  color: #111827;
  break-inside: avoid;
}

.step {
  padding-left: 18px;
  border-left: 3px solid #93c5fd;
  margin-bottom: 16px;
}

.bullet {
  margin-bottom: 13px;
}

.closing {
  margin-top: 34px;
  background: #0b1120;
  border-radius: 26px;
  padding: 38px;
  color: white;
  break-inside: avoid;
}

.closing h3 {
  margin: 0 0 18px 0;
  font-size: 32px;
  line-height: 1.08;
  letter-spacing: -0.05em;
}

.closing p {
  color: #d1d5db;
  font-size: 15px;
  line-height: 1.8;
}

.footer {
  margin-top: 48px;
  border-top: 1px solid #e5e7eb;
  padding-top: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #6b7280;
}
</style>
</head>

<body>

<div class="cover">
  <div class="brand">
    <div class="logo-card">
      <img src="data:image/jpeg;base64,${LOGO_BASE64}" />
    </div>
    <div>
      <div class="brand-title">PROBLEMA CERO</div>
      <div class="brand-subtitle">Interconsulta estratégica empresarial</div>
    </div>
  </div>

  <div class="hero">
    <div class="label">Informe privado</div>
    <h1>${tituloSeguro}</h1>
    <div class="hero-text">
      Una lectura estratégica pensada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.
    </div>
  </div>

  <div class="meta">
    <div class="meta-card">
      <small>Fecha</small>
      <strong>${fecha}</strong>
    </div>
    <div class="meta-card">
      <small>Enfoque</small>
      <strong>Claridad, prioridad y acción</strong>
    </div>
    <div class="meta-card">
      <small>Dirección estratégica</small>
      <strong>Lic. Hernán Mariano Waisman</strong>
    </div>
  </div>
</div>

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

<div class="footer">
  <span>Problema Cero · Dirección estratégica: Lic. Hernán Mariano Waisman</span>
  <span>problemacero.com.ar</span>
</div>

</body>
</html>
`;

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdf.length
    });

    res.send(pdf);

  } catch (error) {
    if (browser) await browser.close();

    console.error(error);

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
