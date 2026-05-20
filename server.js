const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("Problema Cero PDF Premium activo");
});

app.post("/generar-pdf", async (req, res) => {

  try {

    const {
      titulo,
      contenido
    } = req.body;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    const html = `
    <html>
    <head>

      <style>

        body{
          font-family: Arial, sans-serif;
          background:#f5f5f5;
          padding:40px;
          color:#111;
        }

        .container{
          max-width:900px;
          margin:auto;
          background:white;
          border-radius:20px;
          padding:60px;
          box-shadow:0 10px 40px rgba(0,0,0,0.08);
        }

        .logo{
          font-size:32px;
          font-weight:bold;
          color:#c62828;
          margin-bottom:30px;
        }

        h1{
          font-size:42px;
          margin-bottom:30px;
          line-height:1.1;
        }

        .content{
          font-size:18px;
          line-height:1.8;
          white-space:pre-wrap;
        }

        .footer{
          margin-top:60px;
          padding-top:20px;
          border-top:1px solid #ddd;
          color:#777;
          font-size:14px;
        }

      </style>

    </head>

    <body>

      <div class="container">

        <div class="logo">
          PROBLEMA CERO
        </div>

        <h1>
          ${titulo}
        </h1>

        <div class="content">
          ${contenido}
        </div>

        <div class="footer">
          Interconsulta estratégica empresarial
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
      margin: {
        top: "30px",
        bottom: "30px",
        left: "30px",
        right: "30px"
      }
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdf.length
    });

    res.send(pdf);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok:false,
      error:error.message
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Problema Cero PDF Premium activo");
});
