const express = require("express");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");

const app = express();
app.use(express.json());

const SECRET = "1234";
const DATA_FILE = "banco.json";

let db = {
  cabelos: [],
  produtos: [],
  relatorios: {}
};

// =======================
// SALVAR / CARREGAR
// =======================
if (fs.existsSync(DATA_FILE)) {
  db = JSON.parse(fs.readFileSync(DATA_FILE));
}

function salvar() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// =======================
// SITE (SEM HTML EXTERNO)
// =======================
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Irany Gestão</title>
      <style>
        body {
          font-family: Arial;
          background: #f4f4f4;
          text-align: center;
          padding: 50px;
        }
        .card {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);
        }
        button {
          padding: 10px 20px;
          background: black;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Irany Gestão</h1>
        <p>Sistema funcionando 🚀</p>
        <button onclick="verDados()">Ver dados</button>
        <pre id="dados"></pre>
      </div>

      <script>
        function verDados() {
          fetch("/debug")
            .then(res => res.json())
            .then(data => {
              document.getElementById("dados").innerText =
                JSON.stringify(data, null, 2);
            });
        }
      </script>
    </body>
    </html>
  `);
});

// =======================
// LOGIN
// =======================
app.post("/login", (req, res) => {
  if (req.body.senha !== "1234") {
    return res.status(401).send("Senha incorreta");
  }

  const token = jwt.sign({}, SECRET);
  res.json({ token });
});

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send("Sem token");

  try {
    jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).send("Token inválido");
  }
}

// =======================
// RELATÓRIOS
// =======================
function getMesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function garantirRelatorio(mes) {
  if (!db.relatorios[mes]) {
    db.relatorios[mes] = {
      faturamento: 0,
      custo: 0,
      lucro: 0,
      fechado: false
    };
  }
}

// =======================
// CABELOS
// =======================
app.post("/cabelos", auth, (req, res) => {
  const { tipo, peso_total } = req.body;

  db.cabelos.push({
    id: Date.now(),
    tipo,
    peso_total: Number(peso_total),
    vendidos: 0
  });

  salvar();
  res.json({ mensagem: "Cabelo cadastrado" });
});

// =======================
// PRODUTOS
// =======================
app.post("/produtos", auth, (req, res) => {
  const { nome, quantidade } = req.body;

  db.produtos.push({
    id: Date.now(),
    nome,
    quantidade: Number(quantidade)
  });

  salvar();
  res.json({ mensagem: "Produto cadastrado" });
});

// =======================
// DEBUG
// =======================
app.get("/debug", (req, res) => {
  res.json(db);
});

// =======================
// PDF
// =======================
app.get("/pdf", (req, res) => {
  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);

  doc.text("Relatório");
  doc.end();
});

// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 rodando");
});