const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3000;

const ROJO = "#C0392B";
const NEGRO = "#111111";
const BLANCO = "#FFFFFF";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────
// PARSER
// ─────────────────────────────────────────────
function parsearContenido(texto) {
  const s = {
    mapaEjecutivo: [], prioridad: "", dejarDeHacer: [],
    corregirPrimero: [], dias7: [], semanas30: [],
    contenido: [], mensajesVenta: [], metricas: [],
    siEntonces: [], cierre: "",
  };
  const lineas = texto.split("\n").map(l => l.trim()).filter(Boolean);
  let sec = null, itemActual = null;

  for (const linea of lineas) {
    const limpia = linea.replace(/^[-—•]\s*/, "").trim();
    if (/MAPA EJECUTIVO/i.test(linea))                                                   { sec = "mapaEjecutivo"; continue; }
    if (/PRIORIDAD ABSOLUTA/i.test(linea))                                               { sec = "prioridad"; continue; }
    if (/QU[EÉ] DEJAR DE HACER/i.test(linea))                                           { sec = "dejarDeHacer"; continue; }
    if (/QU[EÉ] CORREGIR PRIMERO/i.test(linea))                                         { sec = "corregirPrimero"; continue; }
    if (/PR[OÓ]XIMOS 7 D[IÍ]AS/i.test(linea) || /PLAN DE ACCI[OÓ]N.*7/i.test(linea))  { sec = "dias7"; continue; }
    if (/PR[OÓ]XIMOS 30 D[IÍ]AS/i.test(linea) || /PLAN DE ACCI[OÓ]N.*30/i.test(linea)){ sec = "semanas30"; continue; }
    if (/CONTENIDO QUE DEB[EÉ]R[IÍ]A/i.test(linea) || /CONTENIDO A CREAR/i.test(linea)){ sec = "contenido"; itemActual = null; continue; }
    if (/MENSAJES DE VENTA/i.test(linea))                                                { sec = "mensajesVenta"; continue; }
    if (/M[EÉ]TRICA/i.test(linea))                                                      { sec = "metricas"; itemActual = null; continue; }
    if (/SI\s*[\/]\s*ENTONCES/i.test(linea) || /⚠.*SI/i.test(linea))                   { sec = "siEntonces"; continue; }
    if (/CIERRE/i.test(linea))                                                           { sec = "cierre"; continue; }
    if (/AN[AÁ]LISIS COMPLETO/i.test(linea))                                            { continue; }
    if (!sec || !limpia) continue;

    switch (sec) {
      case "mapaEjecutivo":   s.mapaEjecutivo.push(limpia); break;
      case "prioridad":       s.prioridad += (s.prioridad ? " " : "") + limpia; break;
      case "dejarDeHacer":    s.dejarDeHacer.push(limpia); break;
      case "corregirPrimero": s.corregirPrimero.push(limpia); break;
      case "dias7": {
        const m = limpia.match(/(?:\*\*)?D[ií]a\s*(\d+)[:\*]*/i);
        if (m) s.dias7.push({ numero: m[1], texto: limpia.replace(/(?:\*\*)?D[ií]a\s*\d+[:\*\s]*/i,"").replace(/\*\*/g,"").trim() });
        break;
      }
      case "semanas30": {
        const m = limpia.match(/(?:\*\*)?Semana\s*(\d+)[:\*]*/i);
        if (m) s.semanas30.push({ numero: m[1], texto: limpia.replace(/(?:\*\*)?Semana\s*\d+[:\*\s]*/i,"").replace(/\*\*/g,"").trim() });
        break;
      }
      case "contenido": {
        const mIdea = limpia.match(/^(?:Idea\s*)?(\d+)[:\.\-]?\s*/i);
        if (mIdea) { itemActual = { numero: mIdea[1], gancho:"", tema:"", objetivo:"" }; s.contenido.push(itemActual); }
        else if (itemActual) {
          const mG = limpia.match(/^(?:\*\*)?Gancho[:\*\s]*(.*)/i);
          const mT = limpia.match(/^(?:\*\*)?Tema[:\*\s]*(.*)/i);
          const mO = limpia.match(/^(?:\*\*)?Objetivo[:\*\s]*(.*)/i);
          if (mG) itemActual.gancho = mG[1].replace(/\*\*/g,"").trim();
          else if (mT) itemActual.tema = mT[1].replace(/\*\*/g,"").trim();
          else if (mO) itemActual.objetivo = mO[1].replace(/\*\*/g,"").trim();
        }
        break;
      }
      case "mensajesVenta": s.mensajesVenta.push(limpia.replace(/^[""]|[""]$/g,"").trim()); break;
      case "metricas": {
        const mQ = limpia.match(/^(?:\*\*)?Qu[eé] mirar[:\*\s]*(.*)/i);
        const mP = limpia.match(/^(?:\*\*)?Por qu[eé] importa[:\*\s]*(.*)/i);
        const mD = limpia.match(/^(?:\*\*)?Qu[eé] decisi[oó]n[:\*\s]*(.*)/i);
        if (mQ) { itemActual = { que: mQ[1].replace(/\*\*/g,"").trim(), porQue:"", decision:"" }; s.metricas.push(itemActual); }
        else if (mP && itemActual) itemActual.porQue = mP[1].replace(/\*\*/g,"").trim();
        else if (mD && itemActual) itemActual.decision = mD[1].replace(/\*\*/g,"").trim();
        break;
      }
      case "siEntonces": {
        const m = limpia.match(/^(?:\*\*)?Si\b(.*?)(?:,\s*|\s+)(?:\*\*)?entonces\b(.*)/i);
        if (m) s.siEntonces.push({ condicion: m[1].replace(/\*\*/g,"").trim(), accion: m[2].replace(/\*\*/g,"").trim() });
        else if (/^si\b/i.test(limpia)) s.siEntonces.push({ condicion: limpia, accion: "" });
        break;
      }
      case "cierre": s.cierre += (s.cierre ? " " : "") + limpia; break;
    }
  }
  return s;
}

// ─────────────────────────────────────────────
// LOGO SVG
// ─────────────────────────────────────────────
const LOGO_SVG = `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px">
  <circle cx="28" cy="30" r="16" stroke="white" stroke-width="3" fill="none"/>
  <line x1="28" y1="14" x2="28" y2="10" stroke="white" stroke-width="3" stroke-linecap="round"/>
  <path d="M28 30 L44 18" stroke="#C0392B" stroke-width="3" stroke-linecap="round"/>
  <circle cx="28" cy="30" r="3" fill="white"/>
  <path d="M42 10 L50 6 L46 14" fill="white"/>
</svg>`;

// ─────────────────────────────────────────────
// PIE DE PÁGINA
// ─────────────────────────────────────────────
function pie(num, dark) {
  const border = dark ? "#333" : "#E0E0E0";
  const color  = dark ? "#555" : "#AAAAAA";
  return `<div style="position:absolute;bottom:32px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${border};padding-top:14px;">
    <span style="font-size:10px;font-weight:700;letter-spacing:3px;color:${color};text-transform:uppercase;font-family:'Inter',Arial,sans-serif">PROBLEMA CERO</span>
    <span style="font-size:10px;letter-spacing:2px;color:${color};text-transform:uppercase;font-family:'Inter',Arial,sans-serif">PÁGINA ${num}</span>
  </div>`;
}

// ─────────────────────────────────────────────
// CARÁTULA
// ─────────────────────────────────────────────
function caratula(t1, t2, desc, tipo, pgNum) {
  return `<div style="width:794px;min-height:1123px;padding:80px;background:#111111;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative;page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;">
    <div style="width:90px;height:90px;border:2px solid #333;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:36px;">${LOGO_SVG}</div>
    <div style="font-size:28px;font-weight:900;letter-spacing:6px;color:#fff;margin-bottom:6px;font-family:'Inter',Arial,sans-serif">PROBLEMA <span style="color:${ROJO}">CERO</span></div>
    <div style="font-size:11px;letter-spacing:4px;color:#888;text-transform:uppercase;margin-bottom:4px;font-family:'Inter',Arial,sans-serif">INTERCONSULTA ESTRATÉGICA EMPRESARIAL</div>
    <div style="font-size:10px;letter-spacing:6px;color:#555;text-transform:uppercase;margin-bottom:64px;font-family:'Inter',Arial,sans-serif">${esc(tipo)}</div>
    <div style="font-size:72px;font-weight:300;color:#fff;line-height:1.05;font-family:'Inter',Arial,sans-serif">${esc(t1)}</div>
    <div style="font-size:72px;font-weight:800;color:${ROJO};line-height:1.05;margin-bottom:48px;font-family:'Inter',Arial,sans-serif">${esc(t2)}</div>
    <div style="width:100%;height:1px;background:#333;margin-bottom:36px;"></div>
    <div style="font-size:17px;font-weight:300;color:#AAAAAA;line-height:1.7;max-width:500px;margin-bottom:36px;font-family:'Inter',Arial,sans-serif">${esc(desc)}</div>
    <div style="font-size:9px;letter-spacing:4px;color:#555;text-transform:uppercase;margin-bottom:6px;font-family:'Inter',Arial,sans-serif">DIRECCIÓN ESTRATÉGICA</div>
    <div style="font-size:18px;font-weight:500;color:#fff;font-family:'Inter',Arial,sans-serif">Lic. Hernán Mariano Waisman</div>
    ${pie(pgNum, true)}
  </div>`;
}

// ─────────────────────────────────────────────
// WRAPPER DE PÁGINA
// ─────────────────────────────────────────────
function pagina(contenidoHtml, pgNum) {
  return `<div style="width:794px;min-height:1123px;padding:80px 80px 100px 80px;background:#fff;position:relative;page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;">
    ${contenidoHtml}
    ${pie(pgNum, false)}
  </div>`;
}

// ─────────────────────────────────────────────
// HEADER DE SECCIÓN
// ─────────────────────────────────────────────
function headerSeccion(kicker, titulo) {
  return `<div style="font-size:10px;font-weight:700;letter-spacing:4px;color:${ROJO};text-transform:uppercase;margin-bottom:12px;font-family:'Inter',Arial,sans-serif">${esc(kicker)}</div>
  <div style="font-size:36px;font-weight:800;color:${NEGRO};line-height:1.1;margin-bottom:10px;font-family:'Inter',Arial,sans-serif">${esc(titulo)}</div>
  <div style="width:60px;height:4px;background:${ROJO};margin-bottom:40px;"></div>`;
}

// ─────────────────────────────────────────────
// SECCIÓN: MAPA EJECUTIVO
// ─────────────────────────────────────────────
function renderMapaEjecutivo(items, prioridad, pgNum) {
  let html = headerSeccion("Resumen ejecutivo", "Mapa Ejecutivo");
  items.forEach(item => {
    html += `<div style="display:flex;align-items:flex-start;margin-bottom:18px;gap:16px;">
      <div style="width:8px;height:8px;background:${ROJO};border-radius:50%;flex-shrink:0;margin-top:10px;"></div>
      <div style="font-size:21px;font-weight:400;color:${NEGRO};line-height:1.65;font-family:'Inter',Arial,sans-serif">${esc(item)}</div>
    </div>`;
  });
  if (prioridad) {
    html += `<div style="margin-top:32px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:4px;color:${ROJO};text-transform:uppercase;margin-bottom:12px;font-family:'Inter',Arial,sans-serif">PRIORIDAD ABSOLUTA</div>
      <div style="background:${NEGRO};border-left:6px solid ${ROJO};padding:28px 32px;border-radius:4px;">
        <p style="font-size:21px;font-weight:400;color:#fff;line-height:1.7;font-family:'Inter',Arial,sans-serif;margin:0">${esc(prioridad)}</p>
      </div>
    </div>`;
  }
  return pagina(html, pgNum);
}

// ─────────────────────────────────────────────
// SECCIÓN: DEJAR / CORREGIR
// ─────────────────────────────────────────────
function renderDejarCorregir(dejar, corregir, pgNum) {
  let html = "";
  if (dejar.length) {
    html += headerSeccion("Acción inmediata", "Qué Dejar de Hacer Ya");
    dejar.forEach(item => {
      html += `<div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #EEE;">
        <div style="font-size:22px;font-weight:700;color:${ROJO};line-height:1;flex-shrink:0;margin-top:2px;">—</div>
        <div style="font-size:21px;font-weight:400;color:${NEGRO};line-height:1.6;font-family:'Inter',Arial,sans-serif">${esc(item)}</div>
      </div>`;
    });
  }
  if (corregir.length) {
    html += `<div style="margin-top:36px;">
      ${headerSeccion("Correcciones prioritarias", "Qué Corregir Primero")}`;
    corregir.forEach(item => {
      html += `<div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #EEE;">
        <div style="font-size:22px;font-weight:700;color:${ROJO};line-height:1;flex-shrink:0;margin-top:2px;">—</div>
        <div style="font-size:21px;font-weight:400;color:${NEGRO};line-height:1.6;font-family:'Inter',Arial,sans-serif">${esc(item)}</div>
      </div>`;
    });
    html += `</div>`;
  }
  return pagina(html, pgNum);
}

// ─────────────────────────────────────────────
// SECCIÓN: 7 DÍAS — línea de tiempo vertical
// ─────────────────────────────────────────────
function renderDias7(dias, pgNum) {
  let html = headerSeccion("Plan de acción", "Próximos 7 Días");
  html += `<div style="position:relative;padding-left:90px;">`;
  html += `<div style="position:absolute;left:31px;top:8px;bottom:8px;width:3px;background:linear-gradient(to bottom, ${ROJO}, #333);border-radius:2px;"></div>`;

  dias.forEach((d, i) => {
    const esUltimo = i === dias.length - 1;
    html += `<div style="position:relative;margin-bottom:${esUltimo ? "0" : "20px"};">
      <div style="position:absolute;left:-90px;top:50%;transform:translateY(-50%);width:62px;height:62px;background:${ROJO};border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(192,57,43,0.35);">
        <span style="font-size:9px;font-weight:400;letter-spacing:2px;color:rgba(255,255,255,0.7);text-transform:uppercase;font-family:'Inter',Arial,sans-serif">DÍA</span>
        <span style="font-size:24px;font-weight:900;color:#fff;line-height:1;font-family:'Inter',Arial,sans-serif">${esc(d.numero)}</span>
      </div>
      <div style="background:#FAFAFA;border:1px solid #E8E8E8;border-left:3px solid ${ROJO};border-radius:0 6px 6px 0;padding:18px 22px;min-height:62px;display:flex;align-items:center;">
        <span style="font-size:21px;font-weight:400;color:${NEGRO};line-height:1.5;font-family:'Inter',Arial,sans-serif">${esc(d.texto)}</span>
      </div>
    </div>`;
  });

  html += `</div>`;
  return pagina(html, pgNum);
}

// ─────────────────────────────────────────────
// SECCIÓN: 4 SEMANAS — grilla 2x2
// ─────────────────────────────────────────────
function renderSemanas30(semanas, pgNum) {
  let html = headerSeccion("Plan de acción", "Plan 30 Días");

  const parseSem = (texto) => {
    const mObj = texto.match(/Objetivo[:\s]+(.*?)(?:\.\s*Acci[oó]n|$)/i);
    const mAcc = texto.match(/Acci[oó]n[:\s]+(.*)/i);
    return {
      objetivo: mObj ? mObj[1].trim() : "",
      accion: mAcc ? mAcc[1].trim() : texto
    };
  };

  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">`;
  semanas.forEach((sem, i) => {
    const { objetivo, accion } = parseSem(sem.texto);
    const bgHeader = i % 2 === 0 ? NEGRO : ROJO;
    html += `<div style="border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;">
      <div style="background:${bgHeader};padding:16px 20px;display:flex;align-items:center;gap:14px;">
        <div style="font-size:42px;font-weight:900;color:rgba(255,255,255,0.15);line-height:1;font-family:'Inter',Arial,sans-serif">${esc(sem.numero)}</div>
        <div>
          <div style="font-size:9px;letter-spacing:3px;color:rgba(255,255,255,0.5);text-transform:uppercase;font-family:'Inter',Arial,sans-serif">SEMANA</div>
          <div style="font-size:13px;font-weight:700;color:#fff;letter-spacing:1px;text-transform:uppercase;font-family:'Inter',Arial,sans-serif">${objetivo ? esc(objetivo) : "Plan de ejecución"}</div>
        </div>
      </div>
      <div style="padding:18px 20px;background:#FAFAFA;">
        <div style="font-size:9px;font-weight:700;letter-spacing:3px;color:${ROJO};text-transform:uppercase;margin-bottom:8px;font-family:'Inter',Arial,sans-serif">ACCIÓN</div>
        <div style="font-size:17px;font-weight:400;color:${NEGRO};line-height:1.6;font-family:'Inter',Arial,sans-serif">${esc(accion || sem.texto)}</div>
      </div>
    </div>`;
  });
  html += `</div>`;
  return pagina(html, pgNum);
}

// ─────────────────────────────────────────────
// SECCIÓN: CONTENIDO A CREAR — tarjetas magazine
// ─────────────────────────────────────────────
function renderContenido(ideas, pgNum) {
  let html = headerSeccion("Estrategia de contenido", "Contenido a Crear");
  const FONDOS = ["#111111", "#C0392B", "#1a1a1a", "#8B0000", "#2c2c2c"];

  ideas.forEach((idea, i) => {
    html += `<div style="border-radius:8px;overflow:hidden;margin-bottom:16px;display:flex;min-height:90px;">
      <div style="background:${FONDOS[i % FONDOS.length]};width:70px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 0;">
        <span style="font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.5);text-transform:uppercase;font-family:'Inter',Arial,sans-serif">IDEA</span>
        <span style="font-size:32px;font-weight:900;color:#fff;line-height:1;font-family:'Inter',Arial,sans-serif">${esc(idea.numero)}</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;border:1px solid #E0E0E0;border-left:none;border-radius:0 8px 8px 0;">
        <div style="background:#F0F0F0;padding:14px 20px;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:9px;font-weight:700;letter-spacing:3px;color:${ROJO};text-transform:uppercase;margin-bottom:4px;font-family:'Inter',Arial,sans-serif">GANCHO</div>
          <div style="font-size:18px;font-weight:700;color:${NEGRO};font-style:italic;line-height:1.4;font-family:'Inter',Arial,sans-serif">"${esc(idea.gancho)}"</div>
        </div>
        <div style="padding:12px 20px;background:#FAFAFA;flex:1;display:flex;gap:24px;">
          ${idea.tema ? `<div style="flex:1;"><div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#999;text-transform:uppercase;margin-bottom:4px;font-family:'Inter',Arial,sans-serif">TEMA</div><div style="font-size:15px;color:${NEGRO};line-height:1.5;font-family:'Inter',Arial,sans-serif">${esc(idea.tema)}</div></div>` : ""}
          ${idea.objetivo ? `<div style="flex:1;"><div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#999;text-transform:uppercase;margin-bottom:4px;font-family:'Inter',Arial,sans-serif">OBJETIVO</div><div style="font-size:15px;color:${NEGRO};line-height:1.5;font-family:'Inter',Arial,sans-serif">${esc(idea.objetivo)}</div></div>` : ""}
        </div>
      </div>
    </div>`;
  });
  return pagina(html, pgNum);
}

// ─────────────────────────────────────────────
// SECCIÓN: MENSAJES DE VENTA — editorial
// ─────────────────────────────────────────────
function renderMensajesVenta(mensajes, pgNum) {
  let html = headerSeccion("Comunicación comercial", "Mensajes de Venta");
  mensajes.forEach((msg, i) => {
    const esImpar = i % 2 !== 0;
    html += `<div style="margin-bottom:20px;position:relative;padding:32px 36px 28px 36px;background:${esImpar ? NEGRO : "#FAFAFA"};border-radius:8px;border:1px solid ${esImpar ? NEGRO : "#E0E0E0"};">
      <div style="position:absolute;top:10px;left:22px;font-size:80px;font-weight:900;color:${ROJO};opacity:0.18;line-height:1;font-family:Georgia,serif;pointer-events:none;">"</div>
      <div style="position:absolute;top:14px;right:20px;font-size:11px;font-weight:700;letter-spacing:2px;color:${esImpar ? "#555" : "#CCC"};font-family:'Inter',Arial,sans-serif">${String(i+1).padStart(2,"0")}</div>
      <div style="font-size:20px;font-weight:500;color:${esImpar ? "#fff" : NEGRO};line-height:1.7;font-style:italic;font-family:'Inter',Arial,sans-serif;position:relative;z-index:1;padding-left:12px;">${esc(msg)}</div>
    </div>`;
  });
  return pagina(html, pgNum);
}

// ─────────────────────────────────────────────
// SECCIÓN: MÉTRICAS
// ─────────────────────────────────────────────
function renderMetricas(metricas, pgNum) {
  let html = headerSeccion("Control y seguimiento", "Métricas a Monitorear");
  metricas.forEach((m, i) => {
    html += `<div style="background:#F4F4F4;border-left:5px solid ${ROJO};padding:22px 26px;border-radius:0 6px 6px 0;margin-bottom:18px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <div style="width:28px;height:28px;background:${ROJO};border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="font-size:13px;font-weight:800;color:#fff;font-family:'Inter',Arial,sans-serif">${i+1}</span>
        </div>
        <div style="font-size:21px;font-weight:700;color:${NEGRO};font-family:'Inter',Arial,sans-serif">${esc(m.que)}</div>
      </div>
      ${m.porQue ? `<div style="font-size:17px;color:#444;line-height:1.55;margin-bottom:6px;font-family:'Inter',Arial,sans-serif"><strong style="color:${NEGRO}">Por qué importa:</strong> ${esc(m.porQue)}</div>` : ""}
      ${m.decision ? `<div style="font-size:17px;color:#444;line-height:1.55;font-family:'Inter',Arial,sans-serif"><strong style="color:${NEGRO}">Decisión a tomar:</strong> ${esc(m.decision)}</div>` : ""}
    </div>`;
  });
  return pagina(html, pgNum);
}

// ─────────────────────────────────────────────
// SECCIÓN: SI / ENTONCES — diagrama de flujo
// ─────────────────────────────────────────────
function renderSiEntonces(items, pgNum) {
  let html = headerSeccion("Gestión de escenarios", "Si / Entonces");
  items.forEach((se, i) => {
    html += `<div style="margin-bottom:22px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:3px;color:#CCC;text-transform:uppercase;margin-bottom:8px;font-family:'Inter',Arial,sans-serif">ESCENARIO ${String(i+1).padStart(2,"0")}</div>
      <div style="display:flex;align-items:stretch;gap:0;">
        <div style="flex:1;background:#F4F4F4;border:2px solid #E0E0E0;border-right:none;border-radius:8px 0 0 8px;padding:18px 20px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:8px;height:8px;background:#999;border-radius:50%;flex-shrink:0;"></div>
            <span style="font-size:9px;font-weight:700;letter-spacing:3px;color:#999;text-transform:uppercase;font-family:'Inter',Arial,sans-serif">CONDICIÓN</span>
          </div>
          <div style="font-size:18px;font-weight:500;color:${NEGRO};line-height:1.5;font-family:'Inter',Arial,sans-serif">Si ${esc(se.condicion)}</div>
        </div>
        <div style="background:${ROJO};width:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span style="font-size:7px;letter-spacing:1px;color:rgba(255,255,255,0.6);text-transform:uppercase;font-family:'Inter',Arial,sans-serif">ENTONCES</span>
        </div>
        <div style="flex:1;background:${NEGRO};border:2px solid ${NEGRO};border-left:none;border-radius:0 8px 8px 0;padding:18px 20px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:8px;height:8px;background:${ROJO};border-radius:50%;flex-shrink:0;"></div>
            <span style="font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;font-family:'Inter',Arial,sans-serif">ACCIÓN</span>
          </div>
          <div style="font-size:18px;font-weight:500;color:#fff;line-height:1.5;font-family:'Inter',Arial,sans-serif">${se.accion ? esc(se.accion) : "Ver plan de acción"}</div>
        </div>
      </div>
    </div>`;
  });
  return pagina(html, pgNum);
}

// ─────────────────────────────────────────────
// SECCIÓN: CIERRE
// ─────────────────────────────────────────────
function renderCierre(texto, pgNum) {
  let html = headerSeccion("Conclusión estratégica", "Cierre");
  html += `<div style="background:${NEGRO};padding:40px 44px;border-radius:8px;margin-top:8px;position:relative;overflow:hidden;">
    <div style="position:absolute;right:-20px;bottom:-20px;width:180px;height:180px;border:3px solid rgba(192,57,43,0.2);border-radius:50%;"></div>
    <div style="position:absolute;right:20px;bottom:20px;width:100px;height:100px;border:3px solid rgba(192,57,43,0.15);border-radius:50%;"></div>
    <div style="font-size:22px;font-weight:400;color:#fff;line-height:1.85;font-family:'Inter',Arial,sans-serif;position:relative;z-index:1;">${esc(texto)}</div>
  </div>`;
  return pagina(html, pgNum);
}

// ─────────────────────────────────────────────
// GENERADOR COMPLETO — PLAN
// ─────────────────────────────────────────────
function generarHtmlPlan(data) {
  const s = parsearContenido(data.planContent || data.content || "");
  let paginas = [];
  let pg = 2;

  if (s.mapaEjecutivo.length || s.prioridad)             paginas.push(renderMapaEjecutivo(s.mapaEjecutivo, s.prioridad, pg++));
  if (s.dejarDeHacer.length || s.corregirPrimero.length) paginas.push(renderDejarCorregir(s.dejarDeHacer, s.corregirPrimero, pg++));
  if (s.dias7.length)                                     paginas.push(renderDias7(s.dias7, pg++));
  if (s.semanas30.length)                                 paginas.push(renderSemanas30(s.semanas30, pg++));
  if (s.contenido.length)                                 paginas.push(renderContenido(s.contenido, pg++));
  if (s.mensajesVenta.length)                             paginas.push(renderMensajesVenta(s.mensajesVenta, pg++));
  if (s.metricas.length)                                  paginas.push(renderMetricas(s.metricas, pg++));
  if (s.siEntonces.length)                                paginas.push(renderSiEntonces(s.siEntonces, pg++));
  if (s.cierre)                                           paginas.push(renderCierre(s.cierre, pg++));

  const portada = caratula(
    "Mapa de", "Ejecución",
    "Un plan de acción diseñado para corregir la raíz del problema, ordenar prioridades absolutas y escalar el negocio en los próximos 30 días.",
    "DOCUMENTO EJECUTIVO", 1
  );

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Inter','Helvetica Neue',Arial,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{margin:0;size:A4;}</style>
  </head><body>${portada}${paginas.join("")}</body></html>`;
}

// ─────────────────────────────────────────────
// PARSER DIAGNÓSTICO
// ─────────────────────────────────────────────
function parsearSeccionesDiag(texto) {
  const DEFS = [
    { pat: /RESUMEN R[AÁ]PIDO/i,          kicker: "Visión general",        titulo: "Resumen Rápido" },
    { pat: /PROBLEMA PRINCIPAL/i,          kicker: "Diagnóstico central",   titulo: "Problema Principal" },
    { pat: /QU[EÉ] SIGNIFICA/i,            kicker: "Impacto en el negocio", titulo: "Qué Significa" },
    { pat: /CAUSA REAL/i,                  kicker: "Raíz del bloqueo",      titulo: "Causa Real" },
    { pat: /ACCI[OÓ]N CONCRETA/i,          kicker: "Hoja de ruta",          titulo: "Acción Concreta" },
    { pat: /^IMPACTO/i,                    kicker: "Resultado esperado",    titulo: "Impacto" },
    { pat: /CIERRE/i,                      kicker: "Conclusión",            titulo: "Cierre" },
    { pat: /SIGUIENTE PASO|PRIMER NIVEL/i, kicker: "Próximo paso",          titulo: "Tu próximo paso" },
  ];
  const lineas = texto.split("\n").map(l => l.trim()).filter(Boolean);
  const secciones = [];
  let sec = null;
  for (const linea of lineas) {
    const def = DEFS.find(d => d.pat.test(linea));
    if (def) { sec = { kicker: def.kicker, titulo: def.titulo, items: [] }; secciones.push(sec); continue; }
    if (!sec) continue;
    const limpia = linea.replace(/^[-—•]\s*/, "").trim();
    if (!limpia) continue;
    const esBullet = /^[-—•]/.test(linea);
    if (esBullet) {
      sec.items.push({ tipo: "lista", texto: limpia });
    } else if (/problemacero\.com\.ar/i.test(limpia) || /bot[oó]n naranja/i.test(limpia)) {
      const last = sec.items[sec.items.length - 1];
      if (last && last.tipo === "cta") last.texto += " " + limpia;
      else sec.items.push({ tipo: "cta", titulo: "Este diagnóstico es solo el primer nivel", texto: limpia });
    } else {
      sec.items.push({ tipo: "parrafo", texto: limpia });
    }
  }
  return secciones.length ? secciones : [{ kicker: "Diagnóstico", titulo: "Análisis", items: [{ tipo: "parrafo", texto: texto }] }];
}

// ─────────────────────────────────────────────
// GENERADOR DIAGNÓSTICO
// ─────────────────────────────────────────────
function generarHtmlDiagnostico(data) {
  const secciones = parsearSeccionesDiag(data.diagContent || data.content || "");
  let paginas = [];
  let pg = 2;

  secciones.forEach(sec => {
    let html = `<div style="font-size:10px;font-weight:700;letter-spacing:4px;color:${ROJO};text-transform:uppercase;margin-bottom:12px;font-family:'Inter',Arial,sans-serif">${esc(sec.kicker)}</div>
    <div style="font-size:34px;font-weight:800;color:${NEGRO};margin-bottom:8px;line-height:1.1;font-family:'Inter',Arial,sans-serif">${esc(sec.titulo)}</div>
    <div style="width:50px;height:4px;background:${ROJO};margin-bottom:36px;"></div>`;

    sec.items.forEach(item => {
      if (item.tipo === "parrafo") {
        html += `<div style="font-size:21px;font-weight:400;color:${NEGRO};line-height:1.75;margin-bottom:22px;font-family:'Inter',Arial,sans-serif">${esc(item.texto)}</div>`;
      } else if (item.tipo === "lista") {
        html += `<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #EEE;">
          <div style="width:8px;height:8px;background:${ROJO};border-radius:50%;flex-shrink:0;margin-top:8px;"></div>
          <div style="font-size:21px;color:${NEGRO};line-height:1.6;font-family:'Inter',Arial,sans-serif">${esc(item.texto)}</div>
        </div>`;
      } else if (item.tipo === "cta") {
        html += `<div style="border:2px solid ${ROJO};border-radius:8px;padding:32px 36px;text-align:center;margin-top:20px;">
          <div style="font-size:22px;font-weight:800;color:${NEGRO};margin-bottom:16px;font-family:'Inter',Arial,sans-serif">${esc(item.titulo)}</div>
          <div style="font-size:18px;color:#444;line-height:1.7;margin-bottom:24px;font-family:'Inter',Arial,sans-serif">${esc(item.texto)}</div>
          <span style="display:inline-block;background:${ROJO};color:#fff;font-size:13px;font-weight:700;letter-spacing:2px;padding:14px 32px;border-radius:4px;text-transform:uppercase;font-family:'Inter',Arial,sans-serif">Desbloquear Análisis Completo</span>
        </div>`;
      }
    });

    paginas.push(pagina(html, pg++));
  });

  const portada = caratula(
    "Diagnóstico", "estratégico",
    "Una lectura estratégica diseñada para detectar el bloqueo principal, ordenar prioridades y transformar confusión en dirección concreta.",
    "INFORME PRIVADO", 1
  );

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Inter','Helvetica Neue',Arial,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{margin:0;size:A4;}</style>
  </head><body>${portada}${paginas.join("")}</body></html>`;
}

// ─────────────────────────────────────────────
// PUPPETEER → PDF
// ─────────────────────────────────────────────
async function htmlAPdf(html) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--no-zygote",
      "--single-process",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────
// RUTAS
// ─────────────────────────────────────────────
app.post("/generar-plan", async (req, res) => {
  try {
    const pdf = await htmlAPdf(generarHtmlPlan(req.body));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="PlanEjecucion_ProblemaCero.pdf"');
    res.send(pdf);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

app.post("/generar-diagnostico", async (req, res) => {
  try {
    const pdf = await htmlAPdf(generarHtmlDiagnostico(req.body));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="Diagnostico_ProblemaCero.pdf"');
    res.send(pdf);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

app.post("/generar-pdf", async (req, res) => {
  try {
    const tipo = req.body.tipo || "plan";
    const html = tipo === "diagnostico" ? generarHtmlDiagnostico(req.body) : generarHtmlPlan(req.body);
    const pdf = await htmlAPdf(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="ProblemaCero.pdf"');
    res.send(pdf);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

app.get("/", (req, res) => res.json({ status: "ok", service: "problema-cero-pdf" }));

app.listen(PORT, () => console.log(`problema-cero-pdf corriendo en puerto ${PORT}`));
