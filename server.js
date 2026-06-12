<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Problema Cero</title>
<style>
body{margin:0;font-family:Arial,sans-serif;background:#020617;color:#e5e7eb;}
.container{max-width:880px;margin:auto;padding:28px 18px 50px;}
.header{text-align:center;margin-bottom:24px;}
.logo{max-width:220px;height:auto;margin-bottom:15px;mix-blend-mode:screen;}
.header h1{font-size:38px;margin-bottom:8px;margin-top:0;}
.header p{font-size:18px;color:#cbd5e1;line-height:1.5;}
.block{background:#111827;padding:22px;border-radius:16px;margin-top:20px;border:1px solid #1f2937;line-height:1.6;}
.gold{background:#422006;border:1px solid #f59e0b;}
.blue{background:#0f172a;border:1px solid #38bdf8;}
.purple{background:#1e1b4b;border:1px solid #818cf8;}
.orange{background:#431407;border:1px solid #f97316;}
.border-red{border-top:4px solid #dc2626;box-shadow:0 4px 20px rgba(220,38,38,0.05);}
textarea,input{width:100%;box-sizing:border-box;padding:16px;border-radius:12px;border:none;background:#1e293b;color:white;font-size:16px;margin-top:10px;font-family:inherit;}
textarea{min-height:140px;resize:vertical;line-height:1.5;}
button{width:100%;margin-top:14px;padding:17px;border:none;border-radius:14px;font-size:18px;background:#dc2626;color:white;font-weight:bold;cursor:pointer;-webkit-user-select:none;user-select:none;touch-action:manipulation;transition:all 0.3s ease;}
button:hover{background:#b91c1c;}
button:disabled{background:#475569;cursor:not-allowed;}
.btn-secondary{background:#475569;}
.btn-secondary:hover{background:#334155;}
.cta{background:#f97316;color:#111827;font-weight:900;}
.download{background:#2563eb;}
.download-green{background:#16a34a;}
#resultado,#analisisCompleto{display:none;white-space:pre-line;line-height:1.65;}
ul{line-height:1.8;padding-left:22px;}
li{margin-bottom:6px;}
.video-box{background:#000;border-radius:16px;padding:14px;margin-top:20px;text-align:center;border:1px solid #334155;}
.small{color:#94a3b8;font-size:14px;line-height:1.5;margin-top:30px;text-align:center;}

/* Conversacional */
.pregunta-conversacional{margin-bottom:20px;}
.pregunta-conversacional p{margin-bottom:6px;color:#e5e7eb;font-size:16px;}
.pregunta-conversacional textarea{min-height:80px;}
.pregunta-bloque{border-left:3px solid #dc2626;padding-left:14px;margin-bottom:18px;}
</style>
</head>
<body>
<div class="container">

<div class="header">
  <img src="logo.png" alt="Logo Problema Cero" class="logo">
  <h1>PROBLEMA CERO</h1>
  <p>Tu negocio no tiene un problema de ventas.<br>Tiene un problema que no estás viendo.</p>
</div>

<div class="video-box">
  <iframe width="100%" height="400" src="https://www.youtube.com/embed/iW1JsUqeS_o?modestbranding=1&rel=0" title="Problema Cero" frameborder="0" allowfullscreen style="border-radius:14px;"></iframe>
</div>

<div class="block">
  <h3>Lic. Hernán Mariano Waisman</h3>
  <p><strong>Director Estratégico & Fundador</strong></p>
  <p>Mi objetivo no es darte motivación, sino estructura. Diseñé Problema Cero para auditar negocios estancados y detectar con precisión milimétrica dónde está la fuga de capital o la falla operativa, antes de que sigas invirtiendo presupuesto en soluciones equivocadas.</p>
</div>

<div class="block gold">
  <h3>⚠️ Antes de empezar</h3>
  <p>Esto no es un test automático. Es un análisis a medida. Respondé cada pregunta con la mayor precisión posible para que el sistema pueda diagnosticar tu caso.</p>
</div>

<!-- ── PASO 1 ── -->
<div id="funnel-step-1" class="block border-red">
  <h3>Paso 1 de 5 — Tu Negocio</h3>
  <div class="pregunta-bloque">
    <p><strong>¿Qué estás vendiendo?</strong></p>
    <textarea id="q1a" placeholder="Ej: Vendo velas artesanales perfumadas." rows="2" style="min-height:60px;"></textarea>
  </div>
  <div class="pregunta-bloque">
    <p><strong>¿A qué tipo de público apuntás, o quiénes te compran más?</strong></p>
    <textarea id="q1b" placeholder="Ej: Mujeres de 25 a 45 años interesadas en decoración y bienestar." rows="2" style="min-height:60px;"></textarea>
  </div>
  <div class="pregunta-bloque">
    <p><strong>¿Hace cuánto tiempo arrancaste?</strong></p>
    <textarea id="q1c" placeholder="Ej: Hace 6 meses." rows="2" style="min-height:60px;"></textarea>
  </div>
  <button onclick="avanzarPaso(2)">Siguiente paso →</button>
</div>

<!-- ── PASO 2 ── -->
<div id="funnel-step-2" class="block border-red" style="display:none;">
  <h3>Paso 2 de 5 — El Escenario Actual</h3>
  <p style="margin-bottom:14px;">¿Cuál de estas situaciones te está afectando más hoy?</p>
  <ul style="margin-bottom:18px;">
    <li><strong>Opción 1:</strong> Muchas consultas, pocas ventas (preguntan el precio y desaparecen).</li>
    <li><strong>Opción 2:</strong> Invisibilidad (buen producto, pero nadie consulta).</li>
    <li><strong>Opción 3:</strong> Guerra de precios (si no hago descuentos, no vendo).</li>
    <li><strong>Opción 4:</strong> Mucho esfuerzo, poca ganancia (trabajo todo el día pero no rinde).</li>
    <li><strong>Opción 5:</strong> Falta de retención (compran una vez y no vuelven).</li>
  </ul>
  <div class="pregunta-bloque">
    <p><strong>¿Cuál opción te representa más?</strong></p>
    <textarea id="q2a" placeholder="Ej: Opción 1." rows="2" style="min-height:60px;"></textarea>
  </div>
  <div class="pregunta-bloque">
    <p><strong>Contame un ejemplo real de cómo te pasa esto en el día a día.</strong></p>
    <textarea id="q2b" placeholder="Ej: Me llegan mensajes preguntando el precio, les respondo y me clavan el visto." rows="3" style="min-height:80px;"></textarea>
  </div>
  <div style="display:flex;gap:10px;">
    <button onclick="avanzarPaso(1)" class="btn-secondary">← Volver</button>
    <button onclick="avanzarPaso(3)">Siguiente paso →</button>
  </div>
</div>

<!-- ── PASO 3 ── -->
<div id="funnel-step-3" class="block border-red" style="display:none;">
  <h3>Paso 3 de 5 — Las Bases de tu Negocio</h3>
  <div class="pregunta-bloque">
    <p><strong>¿Cómo definís tus precios?</strong></p>
    <textarea id="q3a" placeholder="Ej: Miro lo que cobra la competencia y me pongo parecido." rows="2" style="min-height:60px;"></textarea>
  </div>
  <div class="pregunta-bloque">
    <p><strong>¿Por qué canales vendés?</strong></p>
    <textarea id="q3b" placeholder="Ej: Solo por Instagram y WhatsApp." rows="2" style="min-height:60px;"></textarea>
  </div>
  <div class="pregunta-bloque">
    <p><strong>¿Hacés publicidad paga o es boca a boca?</strong></p>
    <textarea id="q3c" placeholder="Ej: Solo boca a boca, nunca pagué publicidad." rows="2" style="min-height:60px;"></textarea>
  </div>
  <div class="pregunta-bloque">
    <p><strong>¿Trabajás solo o tenés equipo?</strong></p>
    <textarea id="q3d" placeholder="Ej: Trabajo completamente solo." rows="2" style="min-height:60px;"></textarea>
  </div>
  <div style="display:flex;gap:10px;">
    <button onclick="avanzarPaso(2)" class="btn-secondary">← Volver</button>
    <button onclick="avanzarPaso(4)">Siguiente paso →</button>
  </div>
</div>

<!-- ── PASO 4 ── -->
<div id="funnel-step-4" class="block border-red" style="display:none;">
  <h3>Paso 4 de 5 — El Punto de Bloqueo</h3>
  <p style="margin-bottom:14px;">¿En qué área sentís que se frena tu crecimiento hoy?</p>
  <ul style="margin-bottom:18px;">
    <li><strong>Opción 1 (Tracción):</strong> Cuesta que la gente me descubra o me consulte.</li>
    <li><strong>Opción 2 (Conversión):</strong> Hay consultas, pero cuesta que paguen.</li>
    <li><strong>Opción 3 (Rentabilidad):</strong> Hay ventas, pero el margen de ganancia es muy bajo.</li>
    <li><strong>Opción 4 (Retención):</strong> Compran una vez, pero no vuelven ni recomiendan.</li>
    <li><strong>Opción 5 (Incertidumbre):</strong> Siento que hay una traba pero no logro identificarla.</li>
  </ul>
  <div class="pregunta-bloque">
    <p><strong>¿Cuál opción te representa y por qué?</strong></p>
    <textarea id="q4a" placeholder="Ej: Opción 2. Genero consultas pero me cuesta cerrarlas, siempre piden descuento." rows="3" style="min-height:80px;"></textarea>
  </div>
  <div style="display:flex;gap:10px;">
    <button onclick="avanzarPaso(3)" class="btn-secondary">← Volver</button>
    <button onclick="avanzarPaso(5)">Siguiente paso →</button>
  </div>
</div>

<!-- ── PASO 5 ── -->
<div id="funnel-step-5" class="block border-red" style="display:none;">
  <h3>Paso 5 de 5 — Tu Objetivo</h3>
  <p style="margin-bottom:14px;">¿Cuál de estos objetivos representa mejor lo que querés lograr en los próximos 90 días?</p>
  <ul style="margin-bottom:18px;">
    <li><strong>Opción 1:</strong> Escalar las ventas y construir una estructura que sostenga el crecimiento.</li>
    <li><strong>Opción 2:</strong> Definir una oferta clara que convierta y alcanzar la rentabilidad.</li>
    <li><strong>Opción 3:</strong> Construir una marca reconocible con un canal de adquisición que funcione.</li>
    <li><strong>Opción 4:</strong> Lograr clientes recurrentes que sostengan el negocio en el tiempo.</li>
  </ul>
  <div class="pregunta-bloque">
    <p><strong>¿Cuál opción te representa? Podés agregar algo si querés.</strong></p>
    <textarea id="q5a" placeholder="Ej: Opción 2. También me gustaría mejorar cómo comunico mis precios." rows="3" style="min-height:80px;"></textarea>
  </div>
  <div style="display:flex;gap:10px;">
    <button onclick="avanzarPaso(4)" class="btn-secondary">← Volver</button>
    <button onclick="consultar()">🔍 Iniciar Análisis Estratégico</button>
  </div>
</div>

<!-- ── RESULTADO DIAGNÓSTICO ── -->
<div id="resultado" class="block"></div>
<button id="btnDescargarDiagnostico" class="download" style="display:none;" onclick="descargarDiagnosticoPDF()">📥 Descargar documento PDF</button>

<div id="ctaRapido" class="block orange" style="display:none;">
  <h3>🚀 Etapa privada de validación</h3>
  <p>Actualmente Problema Cero abrió una etapa privada de validación con negocios reales para seguir mejorando el sistema y brindarte los pasos exactos a seguir.</p>
  <button class="cta" onclick="mostrarPreguntas()">🚀 SOLICITAR ACCESO AL PLAN DE EJECUCIÓN</button>
</div>

<div id="preguntas" class="block" style="display:none;">
  <h3>🧠 Para armar tu Plan necesito un dato clave</h3>
  <div class="pregunta-bloque">
    <p><strong>¿Tenés más TIEMPO para ejecutar vos, o más CAPITAL para delegar e invertir?</strong></p>
    <textarea id="p3" placeholder="Ej: Tengo poco tiempo por otro trabajo, pero puedo invertir algo en publicidad." rows="3" style="min-height:80px;"></textarea>
  </div>
  <button onclick="mostrarFeedback()">Continuar</button>
</div>

<div id="feedback" class="block purple" style="display:none;">
  <h3>🔎 Feedback breve del primer análisis</h3>
  <div class="pregunta-bloque">
    <p><strong>¿Este análisis te mostró algo de tu negocio que no estabas viendo?</strong></p>
    <textarea id="f1" placeholder="Ej: Sí, me di cuenta que..." rows="2" style="min-height:60px;"></textarea>
  </div>
  <div class="pregunta-bloque">
    <p><strong>¿Qué punto específico te resultó más útil?</strong></p>
    <textarea id="f2" placeholder="Ej: Me sirvió mucho la parte de..." rows="2" style="min-height:60px;"></textarea>
  </div>
  <div class="pregunta-bloque">
    <p><strong>Del 1 al 10, ¿qué tan clara te resultó la respuesta?</strong></p>
    <textarea id="f3" placeholder="Ej: Le doy un 8." rows="2" style="min-height:60px;"></textarea>
  </div>
  <button class="cta" onclick="generarAnalisisCompleto()">🚀 DESBLOQUEAR MAPA DE EJECUCIÓN</button>
</div>

<div id="analisisCompleto" class="block"></div>
<button id="btnDescargarAnalisis" class="download-green" style="display:none;" onclick="descargarAnalisisPDF()">📥 Descargar Análisis Completo PDF</button>

<p class="small">El resultado depende de la información que ingreses. Problema Cero no promete resultados mágicos, te entrega claridad y estructura corporativa.</p>
</div>

<script>
const API_URL     = "https://problema-cero-api.onrender.com/api/diagnostico";
const PDF_API_URL = "https://problema-cero-pdf-production.up.railway.app/generar-pdf";

function getUserId() {
  let id = localStorage.getItem("pc_user_id");
  if (!id) { id = "user_" + Math.random().toString(36).slice(2); localStorage.setItem("pc_user_id", id); }
  return id;
}

function resetearBotones() {
  const btnDiag = document.getElementById("btnDescargarDiagnostico");
  btnDiag.pdfBlob = null; btnDiag.innerText = "📥 Descargar documento PDF"; btnDiag.style.backgroundColor = "";
  const btnAna = document.getElementById("btnDescargarAnalisis");
  btnAna.pdfBlob = null; btnAna.innerText = "📥 Descargar Análisis Completo PDF"; btnAna.style.backgroundColor = "";
}

function avanzarPaso(paso) {
  const validaciones = {
    2: [["q1a","¿Qué estás vendiendo?"], ["q1b","¿A qué público apuntás?"], ["q1c","¿Hace cuánto arrancaste?"]],
    3: [["q2a","¿Cuál opción te representa?"], ["q2b","El ejemplo del día a día"]],
    4: [["q3a","¿Cómo definís tus precios?"], ["q3b","¿Por qué canales vendés?"], ["q3c","¿Hacés publicidad?"], ["q3d","¿Trabajás solo o con equipo?"]],
    5: [["q4a","El punto de bloqueo"]]
  };
  const camposActuales = validaciones[paso];
  if (camposActuales) {
    for (const [id, nombre] of camposActuales) {
      if (!document.getElementById(id).value.trim()) {
        alert("Por favor completá: " + nombre);
        document.getElementById(id).focus();
        return;
      }
    }
  }
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('funnel-step-' + i);
    if (el) el.style.display = 'none';
  }
  const destino = document.getElementById('funnel-step-' + paso);
  if (destino) {
    destino.style.display = 'block';
    destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function consultar() {
  const q1a = document.getElementById("q1a").value.trim();
  const q1b = document.getElementById("q1b").value.trim();
  const q1c = document.getElementById("q1c").value.trim();
  const q2a = document.getElementById("q2a").value.trim();
  const q2b = document.getElementById("q2b").value.trim();
  const q3a = document.getElementById("q3a").value.trim();
  const q3b = document.getElementById("q3b").value.trim();
  const q3c = document.getElementById("q3c").value.trim();
  const q3d = document.getElementById("q3d").value.trim();
  const q4a = document.getElementById("q4a").value.trim();
  const q5a = document.getElementById("q5a").value.trim();

  if (!q1a || !q1b || !q1c || !q2a || !q2b || !q3a || !q3b || !q3c || !q3d || !q4a || !q5a) {
    alert("Por favor completá todas las preguntas para que podamos analizar tu caso con precisión.");
    return;
  }

  const inputCombinado =
    `EL NEGOCIO:\n1. ${q1a}\n2. ${q1b}\n3. ${q1c}` +
    `\n\nEL PROBLEMA ELEGIDO Y DETALLE:\n1. ${q2a}\n2. ${q2b}` +
    `\n\nLAS BASES DEL NEGOCIO:\n1. ${q3a}\n2. ${q3b}\n3. ${q3c}\n4. ${q3d}` +
    `\n\nEL PUNTO DE BLOQUEO:\n1. ${q4a}` +
    `\n\nEL OBJETIVO A 90 DÍAS:\n1. ${q5a}`;

  resetearBotones();
  localStorage.setItem("pc_problem", inputCombinado);

  const resultado             = document.getElementById("resultado");
  const btnDescargarDiagnostico = document.getElementById("btnDescargarDiagnostico");
  const ctaRapido             = document.getElementById("ctaRapido");

  document.getElementById('funnel-step-5').style.display = 'none';
  resultado.style.display = "block";
  resultado.innerText = "Analizando la estructura de tu negocio...";
  btnDescargarDiagnostico.style.display = "none";
  ctaRapido.style.display = "none";
  resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const res  = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problem: inputCombinado, consultaOriginal: inputCombinado, userId: getUserId() }) });
    const data = await res.json();
    if (!res.ok) {
      resultado.innerText = "Hubo un problema al analizar tu caso. Por favor intentá de nuevo en unos segundos.";
      btnDescargarDiagnostico.style.display = "none";
      ctaRapido.style.display = "none";
      return;
    }
    resultado.innerText = data.diagnostico || "No se pudo generar el documento.";
    ctaRapido.style.display = "block";
    btnDescargarDiagnostico.style.display = "block";
  } catch (error) {
    resultado.innerText = "Hubo un problema de conexión. Por favor intentá de nuevo en unos segundos.";
  }
}

function mostrarPreguntas() {
  document.getElementById("preguntas").style.display = "block";
  document.getElementById("preguntas").scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function mostrarFeedback() {
  if (!document.getElementById("p3").value.trim()) {
    alert("Contame de qué recursos disponés para poder continuar.");
    return;
  }
  document.getElementById("feedback").style.display = "block";
  document.getElementById("feedback").scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function generarAnalisisCompleto() {
  const f1 = document.getElementById("f1").value.trim();
  const f2 = document.getElementById("f2").value.trim();
  const f3 = document.getElementById("f3").value.trim();
  if (!f1 || !f2 || !f3) { alert("Por favor completá las respuestas para desbloquear tu plan."); return; }

  const pedidoCompleto =
    `ANÁLISIS COMPLETO\n\nCASO ORIGINAL:\n${localStorage.getItem("pc_problem")}` +
    `\n\nRECURSOS DISPONIBLES (TIEMPO VS CAPITAL):\n${document.getElementById("p3").value}` +
    `\n\nFEEDBACK DEL USUARIO:\n1. ${f1}\n2. ${f2}\n3. ${f3}`;

  const analisis            = document.getElementById("analisisCompleto");
  const btnDescargarAnalisis = document.getElementById("btnDescargarAnalisis");

  analisis.style.display = "block";
  btnDescargarAnalisis.style.display = "none";
  analisis.innerText = "Armando tu mapa de ejecución paso a paso...";
  analisis.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const res  = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problem: pedidoCompleto, userId: getUserId() }) });
    const data = await res.json();
    if (!res.ok) {
      analisis.innerText = "Hubo un problema al generar el plan. Por favor intentá de nuevo en unos segundos.";
      return;
    }
    analisis.innerText = data.diagnostico || "No se pudo generar el documento.";
    btnDescargarAnalisis.style.display = "block";
  } catch (error) {
    analisis.innerText = "Hubo un problema de conexión. Por favor intentá de nuevo en unos segundos.";
  }
}

function abrirOCompartir(blob, nombreArchivo) {
  if (navigator.canShare) {
    const file = new File([blob], nombreArchivo, { type: 'application/pdf' });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: "Análisis Problema Cero" })
        .catch(err => console.log("Operación cancelada", err));
      return;
    }
  }
  const url = window.URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

async function descargarPDFBackend(contenido, nombreArchivo, idBoton) {
  const boton        = document.getElementById(idBoton);
  if (boton.pdfBlob) { abrirOCompartir(boton.pdfBlob, nombreArchivo); return; }

  const textoOriginal = boton.innerText;
  boton.innerText = "⏳ Generando documento...";
  boton.disabled  = true;

  try {
    const res = await fetch(PDF_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ diagnostico: contenido }) });
    if (!res.ok) throw new Error("No se pudo conectar con el motor PDF.");
    const blob      = await res.blob();
    boton.pdfBlob   = blob;
    boton.innerText = "✅ Documento Listo. Tocá para Ver";
    boton.style.backgroundColor = "#16a34a";
    boton.disabled  = false;
  } catch (error) {
    alert("Error al generar el PDF. Por favor intentá de nuevo.");
    boton.innerText = textoOriginal;
    boton.disabled  = false;
  }
}

// PDF DIAGNÓSTICO — solo el diagnóstico, sin el caso del cliente
async function descargarDiagnosticoPDF() {
  const contenido = document.getElementById("resultado").innerText;
  await descargarPDFBackend(contenido, "Analisis_ProblemaCero.pdf", "btnDescargarDiagnostico");
}

// PDF PLAN — solo el plan de ejecución, con carátula propia
async function descargarAnalisisPDF() {
  const contenido = `ANÁLISIS COMPLETO:\n\n${document.getElementById("analisisCompleto").innerText}`;
  await descargarPDFBackend(contenido, "PlanEjecucion_ProblemaCero.pdf", "btnDescargarAnalisis");
}
</script>
</body>
</html>
