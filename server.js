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
    "ANALISIS COMPLETO"
  ];

  return titulos.some(x => t === x || t.includes(x));
}

function convertirContenidoAHTML(text = "") {

  const limpio = limpiarContenido(text);

  const lineas = limpio
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  let html = "";
  let bloqueAbierto = false;

  function cerrarBloque() {
    if (bloqueAbierto) {
      html += `</section>`;
      bloqueAbierto = false;
    }
  }

  function abrirBloque(titulo) {

    cerrarBloque();

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

    if (
      l.toLowerCase().startsWith("tu problema principal:") ||
      l.toLowerCase().startsWith("qué está pasando:") ||
      l.toLowerCase().startsWith("que está pasando:") ||
      l.toLowerCase().startsWith("qué deberías corregir primero:") ||
      l.toLowerCase().startsWith("que deberías corregir primero:")
    ) {

      html += `
        <div class="highlight">
          ${escapeHtml(l)}
        </div>
      `;

      return;
    }

    if (/^\d+\./.test(l)) {

      html += `
        <div class="step">
          ${escapeHtml(l)}
        </div>
      `;

      return;
    }

    if (l.startsWith("-")) {

      html += `
        <div class="bullet">
          ${escapeHtml(l.replace(/^-/, "•"))}
        </div>
      `;

      return;
    }

    html += `
      <p>${escapeHtml(l)}</p>
    `;
  });

  cerrarBloque();

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

@page{
  size:A4;
  margin:0;
}

*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#f3f4f6;
  color:#111827;
  font-family:Arial, Helvetica, sans-serif;
}

.page{
  width:210mm;
  background:white;
  margin:0 auto;
}

.cover{
  min-height:297mm;
  padding:58px;
  background:
    radial-gradient(circle at top right, rgba(37,99,235,0.08), transparent 30%),
    linear-gradient(135deg,#0b1120 0%,#111827 100%);
  color:white;
  position:relative;
}

.brand{
  display:flex;
  align-items:center;
  gap:18px;
}

.logo-box{
  width:72px;
  height:72px;
  background:white;
  border-radius:22px;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:10px;
}

.logo-box img{
  width:100%;
  object-fit:contain;
}

.brand-title{
  font-size:30px;
  font-weight:900;
  letter-spacing:-0.03em;
}

.brand-subtitle{
  margin-top:4px;
  font-size:13px;
  color:#cbd5e1;
}

.hero{
  margin-top:140px;
}

.label{
  display:inline-block;
  padding:9px 14px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,0.16);
  color:#dbeafe;
  font-size:11px;
  letter-spacing:0.08em;
  text-transform:uppercase;
  margin-bottom:28px;
}

h1{
  font-size:56px;
  line-height:0.96;
  letter-spacing:-0.06em;
  margin:0;
  max-width:680px;
}

.hero p{
  margin-top:30px;
  max-width:620px;
  color:#d1d5db;
  font-size:18px;
  line-height:1.7;
}

.info{
  position:absolute;
  left:58px;
  right:58px;
  bottom:78px;
  display:grid;
  grid-template-columns:1fr 1fr 1.2fr;
  gap:24px;
}

.info-card{
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.12);
  border-radius:22px;
  padding:22px;
}

.info-card small{
  display:block;
  color:#94a3b8;
  text-transform:uppercase;
  letter-spacing:0.08em;
  font-size:10px;
  margin-bottom:10px;
}

.info-card strong{
  font-size:14px;
  line-height:1.5;
}

.content{
  padding:54px;
}

.intro{
  background:#f9fafb;
  border-left:5px solid #2563eb;
  border-radius:20px;
  padding:24px 28px;
  margin-bottom:36px;
}

.intro-title{
  color:#2563eb;
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:0.08em;
  font-weight:900;
  margin-bottom:10px;
}

.intro p{
  margin:0;
  font-size:15px;
  line-height:1.75;
  color:#374151;
}

.section{
  margin-bottom:28px;
  border:1px solid #e5e7eb;
  border-radius:24px;
  padding:30px;
  background:white;
  box-shadow:0 10px 30px rgba(15,23,42,0.04);

  break-inside:auto;
  page-break-inside:auto;
}

h2{
  margin:0 0 18px 0;
  padding-bottom:12px;
  border-bottom:2px solid #dbeafe;
  color:#0b1120;
  font-size:24px;
  letter-spacing:-0.03em;
  line-height:1.15;
}

p{
  margin:0 0 14px 0;
  color:#1f2937;
  font-size:15.4px;
  line-height:1.82;
}

.highlight{
  background:#eff6ff;
  border-left:4px solid #2563eb;
  padding:16px 18px;
  border-radius:16px;
  margin-bottom:18px;
  font-size:15px;
  line-height:1.7;
  color:#111827;
  font-weight:600;
}

.step{
  padding-left:18px;
  border-left:3px solid #93c5fd;
  margin-bottom:18px;
  line-height:1.8;
  font-size:15px;
}

.bullet{
  margin-bottom:14px;
  line-height:1.8;
  font-size:15px;
}

.closing{
  margin-top:40px;
  background:#0b1120;
  border-radius:28px;
  padding:42px;
  color:white;
}

.closing h3{
  margin:0 0 18px 0;
  font-size:34px;
  line-height:1.08;
  letter-spacing:-0.05em;
}

.closing p{
  color:#d1d5db;
  font-size:15px;
  line-height:1.8;
}

.footer{
  margin-top:34px;
  border-top:1px solid #e5e7eb;
  padding-top:18px;
  display:flex;
  justify-content:space-between;
  font-size:11px;
  color:#6b7280;
}

</style>

</head>

<body>

<div class="page cover">

  <div class="brand">

    <div class="logo-box">
      <img src="https://i.imgur.com/ZG4m5Qx.png" />
    </div>

    <div>
      <div class="brand-title">
        PROBLEMA CERO
      </div>

      <div class="brand-subtitle">
        Interconsulta estratégica empresarial
      </div>
    </div>

  </div>

  <div class="hero">

    <div class="label">
      Informe privado
    </div>

    <h1>
      ${tituloSeguro}
    </h1>

    <p>
      Una lectura estratégica pensada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.
    </p>

  </div>

  <div class="info">

    <div class="info-card">
      <small>Fecha</small>
      <strong>${fecha}</strong>
    </div>

    <div class="info-card">
      <small>Enfoque</small>
      <strong>Claridad, prioridad y acción</strong>
    </div>

    <div class="info-card">
      <small>Dirección estratégica</small>
      <strong>Lic. Hernán Mariano Waisman</strong>
    </div>

  </div>

</div>

<div class="page content">

  <div class="intro">

    <div class="intro-title">
      Antes de leer
    </div>

    <p>
      Este informe no intenta sonar automático ni llenar páginas. Su función es observar el caso, ordenar prioridades y señalar qué mirar primero para destrabar el negocio.
    </p>

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

  <div class="footer">

    <span>
      Problema Cero · Dirección estratégica: Lic. Hernán Mariano Waisman
    </span>

    <span>
      Interconsulta estratégica empresarial
    </span>

  </div>

</div>

</body>
</html>
`;

    await page.setContent(html,{
      waitUntil:"networkidle0"
    });

    const pdf = await page.pdf({
      format:"A4",
      printBackground:true,
      preferCSSPageSize:true,
      margin:{
        top:"0",
        bottom:"0",
        left:"0",
        right:"0"
      }
    });

    await browser.close();

    res.set({
      "Content-Type":"application/pdf",
      "Content-Length":pdf.length
    });

    res.send(pdf);

  } catch(error){

    if(browser){
      await browser.close();
    }

    console.error(error);

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
