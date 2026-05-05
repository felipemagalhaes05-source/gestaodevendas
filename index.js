const express = require("express");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");

const app = express();
app.use(express.json());

// =======================
const SECRET = "senha_super_secreta";
const DATA_FILE = "banco.json";

// =======================
let db = {
  cabelos: [],
  produtos: [],
  relatorios: {}
};

// =======================
// CARREGAR / SALVAR
// =======================
if (fs.existsSync(DATA_FILE)) {
  db = JSON.parse(fs.readFileSync(DATA_FILE));
}

function salvar() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

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
// DATA
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

// =======================
// ADICIONAR CÓDIGOS
// =======================
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

// =======================
// ALTERAR STATUS
// =======================
app.patch("/cabelos/:id/item/:codigo/status", auth, (req, res) => {
  const cabelo = db.cabelos.find(c => c.id == req.params.id);
  const item = cabelo.itens.find(i => i.codigo == req.params.codigo);

  item.status = req.body.status;

  salvar();
  res.json(item);
});

// =======================
// VENDA CABELOS
// =======================
app.post("/cabelos/:id/venda", auth, (req, res) => {
  const cabelo = db.cabelos.find(c => c.id == req.params.id);
  const { gramas } = req.body;

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

  db.relatorios[mes].faturamento += faturamento;
  db.relatorios[mes].custo += custo;
  db.relatorios[mes].lucro += faturamento - custo;

  salvar();
  res.json({ mensagem: "Venda registrada" });
});

// =======================
// PRODUTOS
// =======================
app.post("/produtos", auth, (req, res) => {
  const { nome, quantidade, valor_unitario_venda, valor_unitario_custo } = req.body;

  db.produtos.push({
    id: Date.now(),
    nome,
    quantidade: Number(quantidade),
    vendidos: 0,
    valor_unitario_venda,
    valor_unitario_custo
  });

  salvar();
  res.json({ mensagem: "Produto cadastrado" });
});

app.post("/produtos/:id/venda", auth, (req, res) => {
  const produto = db.produtos.find(p => p.id == req.params.id);
  const { quantidade } = req.body;

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

  db.relatorios[mes].faturamento += faturamento;
  db.relatorios[mes].custo += custo;
  db.relatorios[mes].lucro += faturamento - custo;

  salvar();
  res.json({ mensagem: "Venda produto registrada" });
});

// =======================
// RELATÓRIOS
// =======================
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

// =======================
// PDF
// =======================
app.get("/relatorio/pdf", auth, (req, res) => {
  const mes = getMesAtual();
  garantirRelatorio(mes);

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  const r = db.relatorios[mes];

  doc.fontSize(20).text(`Relatório ${mes}`);
  doc.moveDown();
  doc.text(`Faturamento: ${r.faturamento}`);
  doc.text(`Custo: ${r.custo}`);
  doc.text(`Lucro: ${r.lucro}`);
  doc.text(`Fechado: ${r.fechado}`);

  doc.end();
});

// =======================
app.get("/", (req, res) => {
  res.send("TESTE NOVO FUNCIONANDO");
});
app.get("/debug", (req, res) => {
  res.json(db);
});
// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 Sistema completo rodando");
});