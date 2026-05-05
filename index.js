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
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
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

// =======================
// SITE VISUAL SAAS
// =======================
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Irany Gestão</title>
<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: linear-gradient(135deg, #0f172a, #581c87, #be123c);
  color: #fff;
}

header {
  padding: 25px;
  background: rgba(0,0,0,0.45);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

header h1 {
  margin: 0;
  font-size: 30px;
}

header span {
  color: #facc15;
}

.container {
  max-width: 1200px;
  margin: auto;
  padding: 25px;
}

.login-box {
  background: rgba(255,255,255,0.12);
  padding: 25px;
  border-radius: 18px;
  margin-bottom: 25px;
  backdrop-filter: blur(10px);
}

.tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.tabs button {
  background: #facc15;
  color: #111827;
  font-weight: bold;
  border: none;
  padding: 14px 20px;
  border-radius: 12px;
  cursor: pointer;
}

.tabs button:hover {
  background: #fde047;
}

.page {
  display: none;
}

.page.active {
  display: block;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.card {
  background: rgba(255,255,255,0.13);
  border: 1px solid rgba(255,255,255,0.2);
  padding: 22px;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  backdrop-filter: blur(10px);
}

.card h2 {
  margin-top: 0;
  color: #facc15;
}

input, textarea {
  width: 100%;
  padding: 13px;
  margin: 7px 0;
  border-radius: 10px;
  border: none;
  outline: none;
}

button.action {
  background: #22c55e;
  color: white;
  border: none;
  padding: 13px 18px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 8px;
}

button.danger {
  background: #ef4444;
}

button.blue {
  background: #2563eb;
}

.result {
  background: #020617;
  color: #86efac;
  padding: 15px;
  border-radius: 12px;
  overflow-x: auto;
  min-height: 100px;
  white-space: pre-wrap;
}

.item {
  background: rgba(0,0,0,0.25);
  padding: 14px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.badge {
  display: inline-block;
  background: #facc15;
  color: #111827;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: bold;
}

.money {
  color: #86efac;
  font-weight: bold;
}

.warn {
  color: #facc15;
}
</style>
</head>

<body>

<header>
  <h1>Irany <span>Gestão</span></h1>
  <div>Sistema online de estoque, vendas e lucro</div>
</header>

<div class="container">

  <div class="login-box">
    <h2>Login</h2>
    <input id="senha" type="password" value="1234" placeholder="Senha">
    <button class="action" onclick="login()">Entrar</button>
    <p id="statusLogin" class="warn"></p>
  </div>

  <div class="tabs">
    <button onclick="abrirAba('abaCabelos')">Cabelos</button>
    <button onclick="abrirAba('abaProdutos')">Produtos</button>
    <button onclick="abrirAba('abaRelatorios')">Relatórios</button>
    <button onclick="abrirAba('abaDados')">Dados Gerais</button>
  </div>

  <section id="abaCabelos" class="page active">
    <div class="grid">
      <div class="card">
        <h2>Cadastrar Cabelo</h2>
        <input id="tipoCabelo" placeholder="Tipo do cabelo">
        <input id="pesoTotal" type="number" placeholder="Peso total em gramas">
        <input id="valorVendaGrama" type="number" placeholder="Valor de venda por grama">
        <input id="valorCustoGrama" type="number" placeholder="Custo por grama">

        <textarea id="codigosCabelo" placeholder="Códigos do cabelo para balanço interno. Separe por vírgula. Ex: A01,A02,A03"></textarea>

        <button class="action" onclick="cadastrarCabelo()">Cadastrar cabelo</button>
      </div>

      <div class="card">
        <h2>Venda de Cabelo por Gramas</h2>
        <input id="idCabeloVenda" type="number" placeholder="ID do cabelo">
        <input id="gramasVendidas" type="number" placeholder="Quantas gramas saíram">
        <button class="action blue" onclick="venderCabelo()">Registrar venda</button>
        <p class="warn">Os códigos são apenas para balanço interno e NÃO entram no faturamento.</p>
      </div>
    </div>

    <div class="card">
      <h2>Cabelos Cadastrados</h2>
      <button class="action" onclick="listarCabelos()">Atualizar lista</button>
      <div id="listaCabelos"></div>
    </div>
  </section>

  <section id="abaProdutos" class="page">
    <div class="grid">
      <div class="card">
        <h2>Cadastrar Produto</h2>
        <input id="nomeProduto" placeholder="Nome do produto">
        <input id="quantidadeProduto" type="number" placeholder="Quantidade">
        <input id="valorVendaProduto" type="number" placeholder="Valor unitário de venda">
        <input id="valorCustoProduto" type="number" placeholder="Custo unitário">
        <button class="action" onclick="cadastrarProduto()">Cadastrar produto</button>
      </div>

      <div class="card">
        <h2>Venda de Produto</h2>
        <input id="idProdutoVenda" type="number" placeholder="ID do produto">
        <input id="qtdProdutoVenda" type="number" placeholder="Quantidade vendida">
        <button class="action blue" onclick="venderProduto()">Registrar venda</button>
      </div>
    </div>

    <div class="card">
      <h2>Produtos Cadastrados</h2>
      <button class="action" onclick="listarProdutos()">Atualizar lista</button>
      <div id="listaProdutos"></div>
    </div>
  </section>

  <section id="abaRelatorios" class="page">
    <div class="grid">
      <div class="card">
        <h2>Relatório Mensal</h2>
        <button class="action" onclick="verRelatorioMes()">Ver relatório do mês</button>
        <button class="action danger" onclick="fecharMes()">Fechar mês</button>
        <button class="action blue" onclick="baixarPDF()">Baixar PDF</button>
      </div>

      <div class="card">
        <h2>Histórico de Meses</h2>
        <button class="action" onclick="verHistorico()">Ver histórico</button>
      </div>
    </div>

    <div class="card">
      <h2>Resultado</h2>
      <div id="resultadoRelatorio" class="result"></div>
    </div>
  </section>

  <section id="abaDados" class="page">
    <div class="card">
      <h2>Dados Gerais do Sistema</h2>
      <button class="action" onclick="verDados()">Atualizar dados</button>
      <div id="dadosGerais" class="result"></div>
    </div>
  </section>

</div>

<script>
let token = "";

function abrirAba(id) {
  document.querySelectorAll(".page").forEach(function(p) {
    p.classList.remove("active");
  });
  document.getElementById(id).classList.add("active");
}

async function login() {
  const senha = document.getElementById("senha").value;

  const r = await fetch("/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ senha: senha })
  });

  if (!r.ok) {
    document.getElementById("statusLogin").innerText = "Senha incorreta";
    return;
  }

  const data = await r.json();
  token = data.token;
  document.getElementById("statusLogin").innerText = "Login realizado com sucesso";
  listarCabelos();
  listarProdutos();
}

async function cadastrarCabelo() {
  if (!token) return alert("Faça login primeiro");

  const codigosTexto = document.getElementById("codigosCabelo").value;
  const codigos = codigosTexto
    .split(",")
    .map(function(c) { return c.trim(); })
    .filter(function(c) { return c.length > 0; });

  const r = await fetch("/cabelos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      tipo: document.getElementById("tipoCabelo").value,
      peso_total: Number(document.getElementById("pesoTotal").value),
      valor_grama_venda: Number(document.getElementById("valorVendaGrama").value),
      valor_grama_custo: Number(document.getElementById("valorCustoGrama").value),
      codigos: codigos
    })
  });

  const data = await r.json();
  alert(data.mensagem || "Cabelo cadastrado");
  listarCabelos();
}

async function venderCabelo() {
  if (!token) return alert("Faça login primeiro");

  const id = document.getElementById("idCabeloVenda").value;

  const r = await fetch("/cabelos/" + id + "/venda", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      gramas: Number(document.getElementById("gramasVendidas").value)
    })
  });

  const txt = await r.text();
  alert(txt);
  listarCabelos();
}

async function cadastrarProduto() {
  if (!token) return alert("Faça login primeiro");

  const r = await fetch("/produtos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      nome: document.getElementById("nomeProduto").value,
      quantidade: Number(document.getElementById("quantidadeProduto").value),
      valor_unitario_venda: Number(document.getElementById("valorVendaProduto").value),
      valor_unitario_custo: Number(document.getElementById("valorCustoProduto").value)
    })
  });

  const data = await r.json();
  alert(data.mensagem || "Produto cadastrado");
  listarProdutos();
}

async function venderProduto() {
  if (!token) return alert("Faça login primeiro");

  const id = document.getElementById("idProdutoVenda").value;

  const r = await fetch("/produtos/" + id + "/venda", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      quantidade: Number(document.getElementById("qtdProdutoVenda").value)
    })
  });

  const txt = await r.text();
  alert(txt);
  listarProdutos();
}

async function listarCabelos() {
  const r = await fetch("/debug");
  const data = await r.json();

  let html = "";

  data.cabelos.forEach(function(c) {
    const estoque = c.peso_total - c.gramas_vendidas;

    html += '<div class="item">';
    html += '<span class="badge">ID ' + c.id + '</span>';
    html += '<h3>' + c.tipo + '</h3>';
    html += '<p>Peso total: ' + c.peso_total + 'g</p>';
    html += '<p>Gramas vendidas: ' + c.gramas_vendidas + 'g</p>';
    html += '<p>Estoque restante: ' + estoque + 'g</p>';
    html += '<p>Venda por grama: R$ ' + c.valor_grama_venda + '</p>';
    html += '<p>Custo por grama: R$ ' + c.valor_grama_custo + '</p>';
    html += '<p>Faturamento deste cabelo: <span class="money">R$ ' + (c.faturamento || 0).toFixed(2) + '</span></p>';
    html += '<p>Lucro deste cabelo: <span class="money">R$ ' + (c.lucro || 0).toFixed(2) + '</span></p>';
    html += '<p>Códigos internos: ' + (c.itens || []).map(function(i) { return i.codigo; }).join(", ") + '</p>';
    html += '</div>';
  });

  document.getElementById("listaCabelos").innerHTML = html || "Nenhum cabelo cadastrado";
}

async function listarProdutos() {
  const r = await fetch("/debug");
  const data = await r.json();

  let html = "";

  data.produtos.forEach(function(p) {
    const estoque = p.quantidade - p.vendidos;

    html += '<div class="item">';
    html += '<span class="badge">ID ' + p.id + '</span>';
    html += '<h3>' + p.nome + '</h3>';
    html += '<p>Quantidade total: ' + p.quantidade + '</p>';
    html += '<p>Vendidos: ' + p.vendidos + '</p>';
    html += '<p>Estoque restante: ' + estoque + '</p>';
    html += '<p>Faturamento: <span class="money">R$ ' + (p.faturamento || 0).toFixed(2) + '</span></p>';
    html += '<p>Lucro: <span class="money">R$ ' + (p.lucro || 0).toFixed(2) + '</span></p>';
    html += '</div>';
  });

  document.getElementById("listaProdutos").innerHTML = html || "Nenhum produto cadastrado";
}

async function verRelatorioMes() {
  if (!token) return alert("Faça login primeiro");

  const r = await fetch("/relatorio/mes", {
    headers: { "Authorization": token }
  });

  const data = await r.json();
  document.getElementById("resultadoRelatorio").innerText = JSON.stringify(data, null, 2);
}

async function verHistorico() {
  if (!token) return alert("Faça login primeiro");

  const r = await fetch("/relatorio/historico", {
    headers: { "Authorization": token }
  });

  const data = await r.json();
  document.getElementById("resultadoRelatorio").innerText = JSON.stringify(data, null, 2);
}

async function fecharMes() {
  if (!token) return alert("Faça login primeiro");

  const r = await fetch("/relatorio/fechar", {
    method: "POST",
    headers: { "Authorization": token }
  });

  const txt = await r.text();
  alert(txt);
}

function baixarPDF() {
  if (!token) return alert("Faça login primeiro");
  window.open("/relatorio/pdf?token=" + token, "_blank");
}

async function verDados() {
  const r = await fetch("/debug");
  const data = await r.json();
  document.getElementById("dadosGerais").innerText = JSON.stringify(data, null, 2);
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
  const { tipo, peso_total, valor_grama_venda, valor_grama_custo, codigos } = req.body;

  const itens = Array.isArray(codigos)
    ? codigos.map(function(codigo) {
        return { codigo: codigo, status: "disponivel" };
      })
    : [];

  db.cabelos.push({
    id: Date.now(),
    tipo: tipo,
    peso_total: Number(peso_total),
    gramas_vendidas: 0,
    valor_grama_venda: Number(valor_grama_venda),
    valor_grama_custo: Number(valor_grama_custo),
    faturamento: 0,
    custo: 0,
    lucro: 0,
    itens: itens
  });

  salvar();
  res.json({ mensagem: "Cabelo cadastrado" });
});

app.post("/cabelos/:id/lote", auth, (req, res) => {
  const cabelo = db.cabelos.find(c => c.id == req.params.id);
  if (!cabelo) return res.status(404).send("Não encontrado");

  const { codigos } = req.body;

  if (!Array.isArray(codigos)) {
    return res.status(400).send("Envie codigos como lista");
  }

  codigos.forEach(function(codigo) {
    cabelo.itens.push({
      codigo: codigo,
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

  const gramas = Number(req.body.gramas);

  const mes = getMesAtual();
  garantirRelatorio(mes);

  if (db.relatorios[mes].fechado) {
    return res.status(400).send("Mês fechado");
  }

  const estoque = cabelo.peso_total - cabelo.gramas_vendidas;

  if (gramas > estoque) {
    return res.status(400).send("Sem estoque");
  }

  cabelo.gramas_vendidas += gramas;

  const faturamento = gramas * cabelo.valor_grama_venda;
  const custo = gramas * cabelo.valor_grama_custo;
  const lucro = faturamento - custo;

  cabelo.faturamento = (cabelo.faturamento || 0) + faturamento;
  cabelo.custo = (cabelo.custo || 0) + custo;
  cabelo.lucro = (cabelo.lucro || 0) + lucro;

  db.relatorios[mes].faturamento += faturamento;
  db.relatorios[mes].custo += custo;
  db.relatorios[mes].lucro += lucro;

  salvar();
  res.send("Venda de cabelo registrada");
});

// PRODUTOS
app.post("/produtos", auth, (req, res) => {
  const { nome, quantidade, valor_unitario_venda, valor_unitario_custo } = req.body;

  db.produtos.push({
    id: Date.now(),
    nome: nome,
    quantidade: Number(quantidade),
    vendidos: 0,
    valor_unitario_venda: Number(valor_unitario_venda),
    valor_unitario_custo: Number(valor_unitario_custo),
    faturamento: 0,
    custo: 0,
    lucro: 0
  });

  salvar();
  res.json({ mensagem: "Produto cadastrado" });
});

app.post("/produtos/:id/venda", auth, (req, res) => {
  const produto = db.produtos.find(p => p.id == req.params.id);
  if (!produto) return res.status(404).send("Produto não encontrado");

  const quantidade = Number(req.body.quantidade);

  const mes = getMesAtual();
  garantirRelatorio(mes);

  if (db.relatorios[mes].fechado) {
    return res.status(400).send("Mês fechado");
  }

  const estoque = produto.quantidade - produto.vendidos;

  if (quantidade > estoque) {
    return res.status(400).send("Sem estoque");
  }

  produto.vendidos += quantidade;

  const faturamento = quantidade * produto.valor_unitario_venda;
  const custo = quantidade * produto.valor_unitario_custo;
  const lucro = faturamento - custo;

  produto.faturamento = (produto.faturamento || 0) + faturamento;
  produto.custo = (produto.custo || 0) + custo;
  produto.lucro = (produto.lucro || 0) + lucro;

  db.relatorios[mes].faturamento += faturamento;
  db.relatorios[mes].custo += custo;
  db.relatorios[mes].lucro += lucro;

  salvar();
  res.send("Venda de produto registrada");
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

  res.send("Mês fechado");
});

app.get("/relatorio/pdf", (req, res) => {
  const token = req.query.token || req.headers.authorization;

  try {
    jwt.verify(token, SECRET);
  } catch {
    return res.status(401).send("Token inválido");
  }

  const mes = getMesAtual();
  garantirRelatorio(mes);

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  const r = db.relatorios[mes];

  doc.fontSize(20).text("Relatório " + mes);
  doc.moveDown();
  doc.text("Faturamento: " + r.faturamento);
  doc.text("Custo: " + r.custo);
  doc.text("Lucro: " + r.lucro);
  doc.text("Fechado: " + r.fechado);

  doc.end();
});

app.get("/debug", (req, res) => {
  res.json(db);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 Sistema completo rodando");
});