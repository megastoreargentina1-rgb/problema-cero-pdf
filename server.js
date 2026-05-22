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
    console.log("Logo cargado correctamente");
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
    .replace(/^\*+\s*/g, "")
    .trim();
}

function esTitulo(linea = "") {
  const t = normalizarLinea(linea).replace(/:$/g, "").toUpperCase();

  const titulos = [
    "RESUMEN RÁPIDO",
    "RESUMEN RAPIDO",
    "TU PROBLEMA PRINCIPAL",
    "QUÉ ESTÁ PASANDO",
    "QUE ESTÁ PASANDO",
    "QUÉ DEBERÍAS CORREGIR PRIMERO",
    "QUE DEBERÍAS CORREGIR PRIMERO",
    "PROBLEMA PRINCIPAL",
    "QUÉ SIGNIFICA",
    "QUE SIGNIFICA",
    "CAUSA REAL",
    "ACCIÓN CONCRETA",
    "ACCION CONCRETA",
    "IMPACTO",
    "CIERRE",
    "QUÉ CORREGIR PRIMERO",
    "QUE CORREGIR PRIMERO",
    "QUÉ DEJAR DE HACER",
    "QUE DEJAR DE HACER",
    "PLAN DE ACCIÓN",
    "PLAN DE ACCION",
    "MAPA EJECUTIVO",
    "PRIORIDAD ABSOLUTA",
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
    html += `<section class="section block-avoid"><h2>${escapeHtml(normalizarLinea(titulo).replace(/:$/g, ""))}</h2>`;
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
  --dark:#0F172A;
  --dark2:#111827;
  --text:#111827;
  --muted:#374151;
  --soft:#F8FAFC;
  --red:#D32F2F;
  --border:#E2E8F0;
}

*{box-sizing:border-box;margin:0;padding:0;}

html,body{
  font-family:'Inter',Arial,sans-serif;
  background:#fff;
  color:var(--text);
}

body{
  font-size:12.8px;
  line-height:1.78;
}

@media print{
  h1,h2,h3{break-after:avoid;page-break-after:avoid;}
  p,li{orphans:3;widows:3;}
  .block-avoid,.signal,.step,.visual-map{break-inside:avoid;page-break-inside:avoid;}
  .cover-wrapper{break-after:page;page-break-after:always;}
}

.cover-wrapper{
  height:226mm;
  background:linear-gradient(160deg,#0F172A 0%,#111827 100%);
  color:#fff;
  border-radius:18px;
  padding:38px 44px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  overflow:hidden;
}

.logo-card{
  background:transparent;
  border:none;
  padding:0;
  margin-bottom:26px;
}

.logo-card img{
  width:112px;
  height:auto;
  display:block;
  border-radius:14px;
}

.brand-name{
  font-size:17px;
  font-weight:900;
  letter-spacing:.12em;
  margin-bottom:5px;
}

.brand-sub{
  font-size:12px;
  color:#E5E7EB;
}

.doc-type{
  display:flex;
  align-items:center;
  font-size:10px;
  letter-spacing:.12em;
  text-transform:uppercase;
  color:#F8FAFC;
  margin-bottom:20px;
}

.doc-type::before{
  content:"";
  width:26px;
  height:2px;
  background:var(--red);
  margin-right:12px;
}

.cover-title{
  font-size:45px;
  line-height:1.04;
  letter-spacing:-.055em;
  font-weight:900;
  margin-bottom:26px;
  max-width:640px;
}

.cover-desc{
  font-size:14.5px;
  line-height:1.75;
  color:#E5E7EB;
  max-width:620px;
}

.cover-bottom{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:24px;
  border-top:1px solid rgba(255,255,255,.20);
  padding-top:26px;
}

.meta-label{
  font-size:9px;
  letter-spacing:.10em;
  text-transform:uppercase;
  color:#CBD5E1;
  margin-bottom:6px;
  font-weight:700;
}

.meta-value{
  font-size:12.5px;
  color:#fff;
  font-weight:700;
}

.visual-map{
  background:#fff;
  border:1px solid var(--border);
  border-radius:14px;
  padding:22px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:40px;
}

.step-label{
  font-size:8.5px;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:#334155;
  margin-bottom:5px;
  font-weight:800;
}

.step-value{
  font-size:12.5px;
  color:var(--text);
  font-weight:800;
}

.map-arrow{
  color:var(--red);
  font-size:18px;
  font-weight:900;
}

.section{
  margin-bottom:36px;
  padding-bottom:28px;
  border-bottom:1px solid #ECECEC;
}

.section::after{
  content:"";
  display:block;
  width:54px;
  height:2px;
  background:var(--red);
  margin-top:24px;
}

h2{
  font-size:19px;
  line-height:1.2;
  margin-bottom:18px;
  color:var(--text);
  font-weight:900;
  letter-spacing:-.02em;
}

p{
  margin-bottom:16px;
  color:var(--muted);
  font-size:13px;
  line-height:1.82;
  font-weight:400;
}

.signal{
  background:var(--soft);
  border-left:3px solid var(--red);
  padding:16px 18px;
  margin-bottom:18px;
  border-radius:0 9px 9px 0;
  color:var(--text);
  font-weight:700;
  line-height:1.7;
}

.step{
  border-left:2px solid var(--red);
  padding-left:16px;
  margin-bottom:18px;
  color:var(--muted);
  font-size:13px;
  line-height:1.8;
}

.bullet{
  padding-left:8px;
  font-weight:500;
}

.closing{
  background:var(--dark2);
  border-radius:16px;
  padding:38px;
  margin-top:44px;
  break-inside:avoid;
}

.closing h3{
  color:#fff;
  font-size:28px;
  line-height:1.15;
  letter-spacing:-.04em;
  margin-bottom:20px;
  font-weight:900;
}

.closing p{
  color:#E5E7EB;
  font-size:13px;
}
</style>
</head>

<body>

<section class="cover-wrapper">
  <div>
    ${
      logoBase64
      ? `<div class="logo-card"><img src="${logoBase64}" alt="Problema Cero Logo"></div>`
      : ""
    }

    <div class="brand-name">PROBLEMA CERO</div>
    <div class="brand-sub">Interconsulta estratégica empresarial</div>
  </div>

  <div>
    <div class="doc-type">Informe privado</div>
    <div class="cover-title">${escapeHtml(titulo || "Diagnóstico estratégico")}</div>
    <div class="cover-desc">
      Una lectura estratégica pensada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.
    </div>
  </div>

  <div class="cover-bottom">
    <div>
      <div class="meta-label">Fecha de emisión</div>
      <div class="meta-value">${fecha}</div>
    </div>
    <div>
      <div class="meta-label">Dirección estratégica</div>
      <div class="meta-value">Lic. Hernán Mariano Waisman</div>
    </div>
  </div>
</section>

<section>
  <div class="visual-map">
    <div>
      <div class="step-label">Punto de partida</div>
      <div class="step-value">Síntoma declarado</div>
    </div>
    <div class="map-arrow">→</div>
    <div>
      <div class="step-label">Lectura</div>
      <div class="step-value">Bloqueo estratégico</div>
    </div>
    <div class="map-arrow">→</div>
    <div>
      <div class="step-label">Dirección</div>
      <div class="step-value">Prioridad y avance</div>
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

    await page.setContent(html,{ waitUntil:"networkidle0" });

    const pdf = await page.pdf({
      format:"A4",
      printBackground:true,
      displayHeaderFooter:true,
      headerTemplate:`<span></span>`,
      footerTemplate:`
        <div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#64748B;padding:0 25mm;">
          <div style="border-top:1px solid #E2E8F0;padding-top:8px;display:flex;justify-content:space-between;">
            <span style="font-weight:600;">Problema Cero — Dirección Estratégica</span>
            <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          </div>
        </div>
      `,
      margin:{
        top:"25mm",
        bottom:"30mm",
        left:"25mm",
        right:"25mm"
      }
    });

    await browser.close();

    res.set({
      "Content-Type":"application/pdf",
      "Content-Length":pdf.length
    });

    res.send(pdf);

  }catch(error){
    if(browser) await browser.close();

    console.error("Error generando PDF:", error);

    res.status(500).json({
      ok:false,
      error:error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("Problema Cero PDF Premium activo");
});
