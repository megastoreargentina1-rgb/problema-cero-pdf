const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

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
    .replace(/\*\*/g, "")
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
    "CONTENIDO QUE DEBERÍA CREAR",
    "CONTENIDO QUE DEBERIA CREAR",
    "MENSAJES DE VENTA LISTOS PARA USAR",
    "MÉTRICA QUE DEBERÍA MIRAR",
    "METRICA QUE DEBERIA MIRAR",
    "SI / ENTONCES",
    "CIERRE ESTRATÉGICO",
    "CIERRE ESTRATEGICO"
  ];

  return titulos.some(x => t === x || t.includes(x));
}

function convertirContenidoAHTML(text = "") {
  const limpio = limpiarContenido(text);
  const lineas = limpio.split("\n").map(l => l.trim()).filter(Boolean);

  let html = "";
  let bloqueAbierto = false;

  function abrirBloque(titulo) {
    if (bloqueAbierto) html += `</div>`;
    html += `
      <section class="section">
        <h2>${escapeHtml(normalizarLinea(titulo))}</h2>
    `;
    bloqueAbierto = true;
  }

  lineas.forEach((linea) => {
    const l = normalizarLinea(linea);
    if (!l) return;

    if (esTitulo(l)) {
      abrirBloque(l);
      return;
    }

    if (!bloqueAbierto) {
      abrirBloque("Lectura estratégica");
    }

    if (/^\d+\./.test(l)) {
      html += `<p class="numbered">${escapeHtml(l)}</p>`;
    } else if (l.startsWith("-")) {
      html += `<p class="bullet">${escapeHtml(l.replace(/^-/, "•"))}</p>`;
    } else if (
      l.toLowerCase().startsWith("tu problema principal:") ||
      l.toLowerCase().startsWith("qué está pasando:") ||
      l.toLowerCase().startsWith("que está pasando:") ||
      l.toLowerCase().startsWith("qué deberías corregir primero:") ||
      l.toLowerCase().startsWith("que deberías corregir primero:")
    ) {
      html += `<p class="highlight">${escapeHtml(l)}</p>`;
    } else {
      html += `<p>${escapeHtml(l)}</p>`;
    }
  });

  if (bloqueAbierto) html += `</div>`;

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
  @page {
    size: A4;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    background: #f3f4f6;
    color: #111827;
  }

  .page {
    width: 210mm;
    background: #ffffff;
    margin: 0 auto;
  }

  .cover {
    min-height: 297mm;
    padding: 52px 56px;
    background:
      radial-gradient(circle at top right, rgba(211,47,47,0.14), transparent 34%),
      linear-gradient(135deg, #0b1120 0%, #111827 100%);
    color: white;
    position: relative;
    page-break-after: always;
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .mark {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    background: #ffffff;
    color: #0b1120;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 27px;
    font-weight: 900;
    position: relative;
  }

  .mark::after {
    content: "";
    width: 18px;
    height: 11px;
    border-top: 3px solid #d32f2f;
    border-right: 3px solid #d32f2f;
    transform: rotate(-35deg);
    position: absolute;
    right: 6px;
    bottom: 9px;
  }

  .brand-title {
    font-size: 28px;
    font-weight: 900;
    letter-spacing: -0.03em;
  }

  .brand-subtitle {
    font-size: 12px;
    color: #cbd5e1;
    margin-top: 3px;
  }

  .cover-main {
    position: absolute;
    left: 56px;
    right: 56px;
    top: 185px;
  }

  .label {
    display: inline-block;
    color: #fecaca;
    border: 1px solid rgba(248,113,113,0.5);
    border-radius: 999px;
    padding: 8px 13px;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 28px;
  }

  h1 {
    font-size: 52px;
    line-height: 0.98;
    letter-spacing: -0.055em;
    margin: 0 0 28px 0;
    max-width: 620px;
  }

  .cover-text {
    max-width: 590px;
    font-size: 17px;
    line-height: 1.65;
    color: #d1d5db;
  }

  .cover-card {
    position: absolute;
    left: 56px;
    right: 56px;
    bottom: 78px;
    border-radius: 24px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.16);
    padding: 24px 28px;
    display: grid;
    grid-template-columns: 1fr 1fr 1.25fr;
    gap: 28px;
  }

  .cover-card small {
    display: block;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 10px;
    margin-bottom: 8px;
  }

  .cover-card strong {
    color: #ffffff;
    font-size: 14px;
    line-height: 1.4;
  }

  .content-page {
    padding: 42px 52px 54px;
    background: #ffffff;
  }

  .intro {
    border-left: 5px solid #d32f2f;
    background: #f9fafb;
    border-radius: 18px;
    padding: 22px 26px;
    margin-bottom: 30px;
    break-inside: avoid;
  }

  .intro-title {
    font-size: 13px;
    color: #d32f2f;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 800;
    margin-bottom: 8px;
  }

  .intro p {
    margin: 0;
    color: #374151;
    font-size: 14.8px;
    line-height: 1.7;
  }

  .section {
    break-inside: avoid;
    page-break-inside: avoid;
    margin-bottom: 24px;
    padding: 24px 28px;
    border: 1px solid #e5e7eb;
    border-radius: 22px;
    background: #ffffff;
    box-shadow: 0 10px 28px rgba(15,23,42,0.04);
  }

  h2 {
    font-size: 22px;
    line-height: 1.18;
    letter-spacing: -0.035em;
    margin: 0 0 16px 0;
    color: #0b1120;
    border-bottom: 2px solid #fee2e2;
    padding-bottom: 10px;
  }

  p {
    font-size: 14.7px;
    line-height: 1.78;
    color: #1f2937;
    margin: 0 0 12px 0;
  }

  .highlight {
    background: #fff7f7;
    border-left: 4px solid #d32f2f;
    padding: 12px 14px;
    border-radius: 12px;
    color: #111827;
    font-weight: 600;
  }

  .numbered {
    padding-left: 14px;
    border-left: 3px solid #fee2e2;
  }

  .bullet {
    color: #374151;
  }

  .closing {
    margin-top: 34px;
    border-radius: 26px;
    background: #0b1120;
    color: white;
    padding: 36px 38px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .closing h3 {
    margin: 0 0 16px 0;
    font-size: 31px;
    line-height: 1.08;
    letter-spacing: -0.05em;
  }

  .closing p {
    color: #d1d5db;
    font-size: 14.5px;
    line-height: 1.7;
  }

  .footer {
    margin-top: 34px;
    border-top: 1px solid #e5e7eb;
    padding-top: 16px;
    font-size: 11px;
    color: #6b7280;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>

<body>
  <div class="page cover">
    <div class="brand-row">
      <div class="mark">P</div>
      <div>
        <div class="brand-title">PROBLEMA CERO</div>
        <div class="brand-subtitle">Interconsulta estratégica empresarial</div>
      </div>
    </div>

    <div class="cover-main">
      <div class="label">Informe privado</div>
      <h1>${tituloSeguro}</h1>
      <div class="cover-text">
        Una lectura estratégica pensada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.
      </div>
    </div>

    <div class="cover-card">
      <div>
        <small>Fecha</small>
        <strong>${fecha}</strong>
      </div>
      <div>
        <small>Enfoque</small>
        <strong>Claridad, prioridad y acción</strong>
      </div>
      <div>
        <small>Dirección estratégica</small>
        <strong>Hernán Mariano Waisman</strong>
      </div>
    </div>
  </div>

  <div class="page content-page">
    <div class="intro">
      <div class="intro-title">Antes de leer</div>
      <p>
        Este informe no intenta sonar inteligente ni llenar páginas. Su función es observar el caso, ordenar lo importante y señalar qué mirar primero para destrabar el negocio.
      </p>
    </div>

    ${contenidoHTML}

    <div class="closing">
      <h3>El problema no era hacer más.<br>Era saber qué mirar primero.</h3>
      <p>
        Problema Cero no reemplaza tu ejecución. Te ayuda a ordenar la lectura del problema para que la próxima decisión no salga desde la confusión.
      </p>
    </div>

    <div class="footer">
      <span>Problema Cero · Dirección estratégica: Hernán Mariano Waisman</span>
      <span>problemacero.com.ar</span>
    </div>
  </div>
</body>
</html>
`;

    await page.setContent(html, {
      waitUntil: "networkidle0"
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0px",
        bottom: "0px",
        left: "0px",
        right: "0px"
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
