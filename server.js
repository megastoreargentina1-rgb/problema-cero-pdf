const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

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

  const limpio = limpiarContenido(text);

  const lineas = limpio
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
      <section class="chapter">
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
        <div class="signal">
          ${escapeHtml(l)}
        </div>
      `;

      return;
    }

    if (/^\d+\./.test(l)) {

      html += `
        <p class="step">
          ${escapeHtml(l)}
        </p>
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

    html += `
      <p>${escapeHtml(l)}</p>
    `;
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

@page{
  size:A4;
  margin:0;
}

*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#f4f6f8;
  color:#111827;
  font-family:Arial, Helvetica, sans-serif;
}

.cover{
  width:210mm;
  height:297mm;
  padding:58px;
  background:
    radial-gradient(circle at top right, rgba(37,99,235,0.08), transparent 30%),
    linear-gradient(135deg,#0b1120 0%,#111827 100%);
  color:white;
  page-break-after:always;
  position:relative;
}

.brand{
  display:flex;
  align-items:center;
  gap:18px;
}

.logo-card{
  width:86px;
  height:86px;
  background:white;
  border-radius:26px;
  padding:12px;
  display:flex;
  align-items:center;
  justify-content:center;
}

.logo-card img{
  max-width:100%;
  max-height:100%;
  object-fit:contain;
}

.brand-title{
  font-size:31px;
  font-weight:900;
  letter-spacing:-0.04em;
}

.brand-subtitle{
  margin-top:4px;
  color:#cbd5e1;
  font-size:13px;
}

.hero{
  margin-top:132px;
  max-width:660px;
}

.label{
  display:inline-block;
  padding:9px 14px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,0.18);
  color:#bfdbfe;
  font-size:11px;
  letter-spacing:0.08em;
  text-transform:uppercase;
  margin-bottom:28px;
}

h1{
  margin:0;
  font-size:56px;
  line-height:0.97;
  letter-spacing:-0.06em;
}

.hero-text{
  margin-top:30px;
  color:#d1d5db;
  font-size:18px;
  line-height:1.7;
}

.meta{
  position:absolute;
  left:58px;
  right:58px;
  bottom:76px;
  display:grid;
  grid-template-columns:1fr 1fr 1.3fr;
  gap:22px;
}

.meta-card{
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.13);
  border-radius:22px;
  padding:22px;
}

.meta-card small{
  display:block;
  color:#94a3b8;
  font-size:10px;
  text-transform:uppercase;
  letter-spacing:0.08em;
  margin-bottom:10px;
}

.meta-card strong{
  font-size:14px;
  line-height:1.5;
}

.content{
  width:210mm;
  background:#ffffff;
  padding:48px 58px 78px;
}

.intro{
  background:#f8fafc;
  border-left:5px solid #2563eb;
  border-radius:20px;
  padding:24px 28px;
  margin-bottom:34px;
  break-inside:avoid;
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
  color:#374151;
  font-size:15px;
  line-height:1.75;
}

.map{
  display:grid;
  grid-template-columns:1fr 36px 1fr 36px 1fr;
  align-items:center;
  margin:0 0 52px 0;
  break-inside:avoid;
}

.map-card{
  background:#ffffff;
  border:1px solid #e5e7eb;
  border-radius:20px;
  padding:20px;
  min-height:112px;
}

.map-card small{
  display:block;
  color:#2563eb;
  font-size:10px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:0.08em;
  margin-bottom:8px;
}

.map-card strong{
  display:block;
  color:#0b1120;
  font-size:15px;
  line-height:1.35;
}

.arrow{
  text-align:center;
  color:#2563eb;
  font-size:24px;
  font-weight:900;
}

.chapter{
  margin-bottom:42px;
  padding-bottom:34px;
  border-bottom:1px solid #e5e7eb;

  break-inside:avoid-page;
  page-break-inside:avoid;

  position:relative;
}

.chapter::after{
  content:"";
  width:52px;
  height:3px;
  background:#2563eb;
  border-radius:999px;
  position:absolute;
  bottom:-2px;
  left:0;
}

h2{
  font-size:25px;
  line-height:1.15;
  letter-spacing:-0.035em;
  color:#0b1120;
  margin:0 0 18px 0;
  padding-bottom:10px;
  border-bottom:3px solid #dbeafe;
}

p{
  font-size:15.4px;
  line-height:1.9;
  color:#1f2937;
  margin:0 0 16px 0;

  orphans:4;
  widows:4;

  text-align:left;
}

.signal{
  background:#eff6ff;
  border-left:4px solid #2563eb;
  padding:16px 18px;
  border-radius:16px;
  margin-bottom:18px;
  font-size:15px;
  line-height:1.72;
  font-weight:700;
  color:#111827;
}

.step{
  padding-left:18px;
  border-left:3px solid #93c5fd;
  margin-bottom:18px;
  line-height:1.8;
}

.bullet{
  margin-bottom:14px;
  line-height:1.8;
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
  margin-top:56px;
  border-top:1px solid #e5e7eb;
  padding-top:22px;

  display:flex;
  justify-content:space-between;
  align-items:center;

  font-size:11px;
  color:#6b7280;
}

</style>

</head>

<body>

<div class="cover">

  <div class="brand">

    <div class="logo-card">
      <img src="/logo.png" />
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

<div class="content">

  <div class="intro">

    <div class="intro-title">
      Antes de leer
    </div>

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
