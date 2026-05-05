const express = require("express");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");

const app = express();
app.use(express.json());

const SECRET = "senha_super_secreta";
const DATA_FILE = "banco.json";

let db = {
  cabelos: [],
  produtos: [],
  relatorios: {}
};

if (fs.existsSync(DATA_FILE)) {
  db = JSON.parse(fs.readFileSync(DATA_FILE));
}

function salvar() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

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

// SITE VISUAL
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Irany Gestão</title>
<style>
body {
  font-family: Arial, sans-serif;
  background: #f3f4f6;
  margin: 0;
  padding: 30px;
}
.container {
  max-width: 1100px;
  margin: auto;
}
h1 {
  text-align: center;
}
.card {
  background: white;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 14px;
  box-shadow: 0 0 12px rgba(0,0,0,0.12);
}
input, button {
  padding: 10px;
  margin: 5px;
  border-radius: 8px;
  border: 1px solid #ccc;
}
button {
  background: #111;
  color: white;
  cursor: pointer;
  border: none;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
pre {
  background: #111;
  color: #00ff88;
  padding: 15px;
  border-radius: 10px;
  overflow: auto;
}
</style>
</head>
<body>
<div class="container">
<h1>Irany Gestão</h1>

<div class="card">
<h2>Login</h2>
<input id="senha" type="password" placeholder="Senha" value="1234">
<button onclick="login()">Entrar</button>
<p id="status"></p>
</div>

<div class="grid">
<div class="card">
<h2>Cadastrar Cabelo</h2>
<input id="tipo" placeholder="Tipo do cabelo">
<input id="peso_total" type="number" placeholder="Peso total">
<input id="valor_grama_venda" type="number" placeholder="Valor grama venda">
<input id="valor_grama_custo" type="number" placeholder="Valor grama custo">
<button onclick="cadastrarCabelo()">Cadastrar cabelo</button>
</div>

<div class="card">
<h2>Cadastrar Produto</h2>
<input id="nome" placeholder="Nome do produto">
<input id="quantidade" type="number" placeholder="Quantidade">
<input id="valor_unitario_venda" type="number" placeholder="Valor venda">
<input id="valor_unitario_custo" type="number" placeholder="Valor custo">
<button onclick="cadastrarProduto()">Cadastrar produto</button>
</div>
</div>

<div class="grid">
<div class="card">
<h2>Registrar Venda de Cabelo</h2>
<input id="id_cabelo_venda" type="number" placeholder="ID do cabelo">
<input id="gramas_venda" type="number" placeholder="Gramas vendidas">
<button onclick="venderCabelo()">Registrar venda</button>
</div>

<div class="card">
<h2>Registrar Venda de Produto</h2>
<input id="id_produto_venda" type="number" placeholder="ID do produto">
<input id="quantidade_venda" type="number" placeholder="Quantidade vendida">
<button onclick="venderProduto()">Registrar venda</button>
</div>
</div>

<div class="card">
<h2>Relatórios</h2>
<button onclick="verDados()">Atualizar dados</button>
<button onclick="verRelatorio()">Relatório do mês</button>
<button onclick="fecharMes()">Fechar mês</button>
<a href="/relatorio/pdf" target="_blank">
<button>Baixar PDF</button>
</a>
<pre id="resultado">Clique em atualizar dados.</pre>
</div>
</div>

<script>
let token = "";

async function login() {
  const senha = document.getElementById("senha").value;

  const r = await fetch("/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ senha })
  });

  if (!r.ok) {
    document.getElementById("status").innerText = "Senha incorreta";
    return;
  }

  const data = await r.json();
  token = data.token;
  document.getElementById("status").innerText = "Login realizado com sucesso.";
}

async function cadastrarCabelo() {
  if (!token) return alert("Faça login primeiro");

  await fetch("/cabelos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      tipo: document.getElementById("tipo").value,
      peso_total: Number(document.getElementById("peso_total").value),
      valor_grama_venda: Number(document.getElementById("valor_grama_venda").value),
      valor_grama_custo: Number(document.getElementById("valor_grama_custo").value)
    })
  });

  alert("Cabelo cadastrado");
  verDados();
}

async function cadastrarProduto() {
  if (!token) return alert("Faça login primeiro");

  await fetch("/produtos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      nome: document.getElementById("nome").value,
      quantidade: Number(document.getElementById("quantidade").value),
      valor_unitario_venda: Number(document.getElementById("valor_unitario_venda").value),
      valor_unitario_custo: Number(document.getElementById("valor_unitario_custo").value)
    })
  });

  alert("Produto cadastrado");
  verDados();
}

async function venderCabelo() {
  if (!token) return alert("Faça login primeiro");

  const id = document.getElementById("id_cabelo_venda").value;

  await fetch("/cabelos/" + id + "/venda", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      gramas: Number(document.getElementById("gramas_venda").value)
    })
  });

  alert("Venda registrada");
  verDados();
}

async function venderProduto() {
  if (!token) return alert("Faça login primeiro");

  const id = document.getElementById("id_produto_venda").value;

  await fetch("/produtos/" + id + "/venda", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      quantidade: Number(document.getElementById("quantidade_venda").value)
    })
  });

  alert("Venda registrada");
  verDados();
}

async function verDados() {
  const r = await fetch("/debug");
  const data = await r.json();
  document.getElementById("resultado").innerText = JSON.stringify(data, null, 2);
}

async function verRelatorio() {
  if (!token) return alert("Faça login primeiro");

  const r = await fetch("/relatorio/mes", {
    headers: { "Authorization": token }
  });

  const data = await r.json();
  document.getElementById("resultado").innerText = JSON.stringify(data, null, 2);
}

async function fecharMes() {
  if (!token) return alert("Faça login primeiro");

  await fetch("/relatorio/fechar", {
    method: "POST",
    headers: { "Authorization": token }
  });

  alert("Mês fechado");
  verRelatorio();
}
</script>
</body>
</html>
`);
});

// LOGIN
app.post("/login", (req, res) => {
  if (req.body.senha !== "1234") {
    return res.status(401).send("Senha incorreta");
  }

  const token = jwt.sign({}, SECRET);
  res.json({ token });
});

// CABELOS
app.post("/cabelos", auth, (req, res) => {
  const { tipo, peso_total, valor_grama_venda, valor_grama_custo } = req.body;

  db.cabelos.push({
    id: Date.now(),
    tipo,
    peso_total: Number(peso_total),
    gramas_vendidas: 0,
    valor_grama_venda: Number(valor_grama_venda),
    valor_grama_custo: Number(valor_grama_custo),
    itens: []
  });

  salvar();
  res.json({ mensagem: "Cabelo cadastrado" });
});

app.post("/cabelos/:id/lote", auth, (req, res) => {
  const cabelo = db.cabelos.find(c => c.id == req.params.id);
  if (!cabelo) return res.status(404).send("Não encontrado");

  const { codigos } = req.body;

  codigos.forEach(codigo => {
    cabelo.itens.push({
      codigo,
      status: "disponivel"
    });
  });

  salvar();
  res.json(cabelo);
});

app.patch("/cabelos/:id/item/:codigo/status", auth, (req, res) => {
  const cabelo = db.cabelos.find(c => c.id == req.params.id);
  if (!cabelo) return res.status(404).send("Cabelo não encontrado");

  const item = cabelo.itens.find(i => i.codigo == req.params.codigo);
  if (!item) return res.status(404).send("Código não encontrado");

  item.status = req.body.status;
  salvar();
  res.json(item);
});

app.post("/cabelos/:id/venda", auth, (req, res) => {
  const cabelo = db.cabelos.find(c => c.id == req.params.id);
  if (!cabelo) return res.status(404).send("Cabelo não encontrado");

  const { gramas } = req.body;

  const mes = getMesAtual();
  garantirRelatorio(mes);

  if (db.relatorios[mes].fechado) {
    return res.status(400).send("Mês fechado");
  }

  const estoque = cabelo.peso_total - cabelo.gramas_vendidas;

  if (Number(gramas) > estoque) {
    return res.status(400).send("Sem estoque");
  }

  cabelo.gramas_vendidas += Number(gramas);

  const faturamento = Number(gramas) * cabelo.valor_grama_venda;
  const custo = Number(gramas) * cabelo.valor_grama_custo;

  db.relatorios[mes].faturamento += faturamento;
  db.relatorios[mes].custo += custo;
  db.relatorios[mes].lucro += faturamento - custo;

  salvar();
  res.json({ mensagem: "Venda registrada" });
});

// PRODUTOS
app.post("/produtos", auth, (req, res) => {
  const { nome, quantidade, valor_unitario_venda, valor_unitario_custo } = req.body;

  db.produtos.push({
    id: Date.now(),
    nome,
    quantidade: Number(quantidade),
    vendidos: 0,
    valor_unitario_venda: Number(valor_unitario_venda),
    valor_unitario_custo: Number(valor_unitario_custo)
  });

  salvar();
  res.json({ mensagem: "Produto cadastrado" });
});

app.post("/produtos/:id/venda", auth, (req, res) => {
  const produto = db.produtos.find(p => p.id == req.params.id);
  if (!produto) return res.status(404).send("Produto não encontrado");

  const { quantidade } = req.body;

  const mes = getMesAtual();
  garantirRelatorio(mes);

  if (db.relatorios[mes].fechado) {
    return res.status(400).send("Mês fechado");
  }

  const estoque = produto.quantidade - produto.vendidos;

  if (Number(quantidade) > estoque) {
    return res.status(400).send("Sem estoque");
  }

  produto.vendidos += Number(quantidade);

  const faturamento = Number(quantidade) * produto.valor_unitario_venda;
  const custo = Number(quantidade) * produto.valor_unitario_custo;

  db.relatorios[mes].faturamento += faturamento;
  db.relatorios[mes].custo += custo;
  db.relatorios[mes].lucro += faturamento - custo;

  salvar();
  res.json({ mensagem: "Venda produto registrada" });
});

// RELATÓRIOS
app.get("/relatorio/mes", auth, (req, res) => {
  const mes = getMesAtual();
  garantirRelatorio(mes);
  res.json(db.relatorios[mes]);
});

app.get("/relatorio/historico", auth, (req, res) => {
  res.json(db.relatorios);
});

app.post("/relatorio/fechar", auth, (req, res) => {
  const mes = getMesAtual();
  garantirRelatorio(mes);

  db.relatorios[mes].fechado = true;
  salvar();

  res.json({ mensagem: "Mês fechado" });
});

app.get("/relatorio/pdf", auth, (req, res) => {
  const mes = getMesAtual();
  garantirRelatorio(mes);

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  const r = db.relatorios[mes];

  doc.fontSize(20).text(\`Relatório \${mes}\`);
  doc.moveDown();
  doc.text(\`Faturamento: \${r.faturamento}\`);
  doc.text(\`Custo: \${r.custo}\`);
  doc.text(\`Lucro: \${r.lucro}\`);
  doc.text(\`Fechado: \${r.fechado}\`);

  doc.end();
});

app.get("/debug", (req, res) => {
  res.json(db);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 Sistema completo rodando");
});