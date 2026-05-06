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

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Gestão de Cabelos</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#faf9f7;color:#111}
.app{display:flex;min-height:100vh}
.sidebar{width:224px;background:#fff;border-right:1px solid #ddd;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0}
.brand{padding:20px;border-bottom:1px solid #ddd}
.brand h2{margin:0;font-size:18px;font-weight:800}
.brand p{margin:6px 0 0;color:#777;font-size:13px}
.menu{padding:18px 0;flex:1}
.menu button{width:100%;background:transparent;border:0;text-align:left;padding:13px 20px;font-size:15px;cursor:pointer;color:#111;display:flex;gap:10px;align-items:center}
.menu button:hover,.menu button.active{background:#f4eee9;color:#c95b12;font-weight:700}
.sair{border-top:1px solid #ddd;padding:16px 20px;color:#777}
.main{margin-left:224px;padding:34px;flex:1}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:26px}
.top h1{margin:0;font-size:25px}
.top p{margin:4px 0 0;color:#777}
.btn{border:0;border-radius:8px;padding:10px 15px;cursor:pointer;font-weight:700}
.btn-orange{background:#d96213;color:#fff}
.btn-light{background:#f4eee9;color:#111;border:1px solid #ddd}
.btn-red{background:#dc2626;color:#fff}
.btn-dark{background:#111;color:#fff}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:30px}
.card{background:#fff;border:1px solid #ddd;border-radius:10px;padding:20px;box-shadow:0 2px 5px rgba(0,0,0,.08)}
.kpi-title{color:#666;font-size:13px;text-transform:uppercase;letter-spacing:.4px}
.kpi-value{font-size:26px;font-weight:800;margin-top:8px}
.orange{color:#d96213}
.red{color:#dc2626}
.green{color:#16a34a}
.table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #ddd;border-radius:10px;overflow:hidden}
.table th,.table td{padding:17px;border-bottom:1px solid #ddd;text-align:left;font-size:14px}
.table th{color:#6b625c;background:#f8f6f4;font-size:13px}
.table tr:last-child td{border-bottom:0}
.page{display:none}
.page.active{display:block}
input,textarea{width:100%;padding:11px;border:1px solid #ddd;border-radius:8px;margin:6px 0 12px;background:#fff}
label{font-size:13px;color:#555;font-weight:700}
.form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.badge{background:#f4eee9;border-radius:7px;padding:5px 10px;font-weight:700}
.section-title{margin:28px 0 14px;font-size:17px}
pre{background:#111;color:#9cffb1;padding:15px;border-radius:10px;white-space:pre-wrap}
@media(max-width:900px){.grid,.form-grid{grid-template-columns:1fr}.sidebar{width:190px}.main{margin-left:190px;padding:22px}}
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand">
      <h2>Gestão de Cabelos</h2>
      <p>Sistema de controle</p>
    </div>

    <div class="menu">
      <button class="active" onclick="abrir('dashboard',this)">▦ Painel</button>
      <button onclick="abrir('cabelos',this)">✂ Cabelos</button>
      <button onclick="abrir('produtos',this)">▧ Produtos</button>
      <button onclick="abrir('relatorios',this)">▥ Relatórios</button>
    </div>

    <div class="sair">↪ Sair</div>
  </aside>

  <main class="main">

    <section id="dashboard" class="page active">
      <div class="top">
        <div>
          <h1>Painel</h1>
          <p id="mesPainel"></p>
        </div>
      </div>

      <div class="grid">
        <div class="card"><div class="kpi-title">Faturamento do mês</div><div id="kpiFat" class="kpi-value">R$ 0,00</div></div>
        <div class="card"><div class="kpi-title">Lucro do mês</div><div id="kpiLucro" class="kpi-value orange">R$ 0,00</div></div>
        <div class="card"><div class="kpi-title">Estoque cabelo (gramas)</div><div id="kpiEstoqueCabelo" class="kpi-value">0g</div></div>
        <div class="card"><div class="kpi-title">Estoque produtos</div><div id="kpiEstoqueProduto" class="kpi-value">0</div></div>
        <div class="card"><div class="kpi-title">Lotes de cabelo</div><div id="kpiLotes" class="kpi-value">0</div></div>
        <div class="card"><div class="kpi-title">Produtos cadastrados</div><div id="kpiProdutos" class="kpi-value">0</div></div>
      </div>

      <div class="card">
        <h3>Cabelos Mais Vendidos</h3>
        <div id="maisVendidos"></div>
      </div>
    </section>

    <section id="cabelos" class="page">
      <div class="top">
        <div>
          <h1>Cabelos</h1>
          <p>Gerenciar lotes de cabelo</p>
        </div>
        <button class="btn btn-orange" onclick="limparCabelo()">+ Novo Lote</button>
      </div>

      <div class="card">
        <h3 id="tituloCabelo">Novo cabelo</h3>
        <input type="hidden" id="editCabeloId">

        <div class="form-grid">
          <div><label>Tipo</label><input id="tipoCabelo" placeholder="Ex: Indiano 65 cm"></div>
          <div><label>Peso total em gramas</label><input id="pesoTotal" type="number"></div>
          <div><label>Valor de venda por grama</label><input id="valorVendaGrama" type="number"></div>
          <div><label>Custo por grama</label><input id="valorCustoGrama" type="number"></div>
        </div>

        <label>Códigos internos do lote</label>
        <textarea id="codigosCabelo" placeholder="Ex: A01, A02, A03"></textarea>

        <div class="actions">
          <button class="btn btn-orange" onclick="salvarCabelo()">Salvar cabelo</button>
          <button class="btn btn-light" onclick="limparCabelo()">Limpar</button>
        </div>
      </div>

      <div class="card">
        <h3>Registrar venda de cabelo</h3>
        <div class="form-grid">
          <div><label>ID do cabelo</label><input id="idCabeloVenda" type="number"></div>
          <div><label>Gramas vendidas</label><input id="gramasVendidas" type="number"></div>
        </div>
        <button class="btn btn-dark" onclick="venderCabelo()">Registrar venda</button>
      </div>

      <h3 class="section-title">Lotes cadastrados</h3>
      <div id="listaCabelos"></div>
    </section>

    <section id="produtos" class="page">
      <div class="top">
        <div>
          <h1>Produtos</h1>
          <p>Gerenciar produtos</p>
        </div>
        <button class="btn btn-orange" onclick="limparProduto()">+ Novo Produto</button>
      </div>

      <div class="card">
        <h3 id="tituloProduto">Novo produto</h3>
        <input type="hidden" id="editProdutoId">

        <div class="form-grid">
          <div><label>Nome</label><input id="nomeProduto"></div>
          <div><label>Quantidade</label><input id="quantidadeProduto" type="number"></div>
          <div><label>Valor unitário de venda</label><input id="valorVendaProduto" type="number"></div>
          <div><label>Custo unitário</label><input id="valorCustoProduto" type="number"></div>
        </div>

        <div class="actions">
          <button class="btn btn-orange" onclick="salvarProduto()">Salvar produto</button>
          <button class="btn btn-light" onclick="limparProduto()">Limpar</button>
        </div>
      </div>

      <div class="card">
        <h3>Registrar venda de produto</h3>
        <div class="form-grid">
          <div><label>ID do produto</label><input id="idProdutoVenda" type="number"></div>
          <div><label>Quantidade vendida</label><input id="qtdProdutoVenda" type="number"></div>
        </div>
        <button class="btn btn-dark" onclick="venderProduto()">Registrar venda</button>
      </div>

      <h3 class="section-title">Produtos cadastrados</h3>
      <div id="listaProdutos"></div>
    </section>

    <section id="relatorios" class="page">
      <div class="top">
        <div>
          <h1>Relatórios</h1>
          <p id="mesRelatorio"></p>
        </div>
        <div class="actions">
          <button class="btn btn-light" onclick="baixarPDF()">PDF</button>
          <button class="btn btn-light" onclick="fecharMes()">Fechar Mês</button>
        </div>
      </div>

      <div class="card">
        <h3>Mês Atual</h3>
        <div class="grid">
          <div><div class="kpi-title">Faturamento</div><div id="relFat" class="kpi-value">R$ 0,00</div></div>
          <div><div class="kpi-title">Custo</div><div id="relCusto" class="kpi-value red">R$ 0,00</div></div>
          <div><div class="kpi-title">Lucro</div><div id="relLucro" class="kpi-value orange">R$ 0,00</div></div>
        </div>
        <hr>
        <p>Margem de lucro: <strong id="relMargem">0%</strong></p>
      </div>

      <h3 class="section-title">Histórico</h3>
      <div id="historico"></div>
    </section>

  </main>
</div>

<script>
let token = "";

function moeda(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function mesAtualTexto(){return new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}

async function loginAuto(){
  const r = await fetch("/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({senha:"1234"})});
  const data = await r.json();
  token = data.token;
  carregarTudo();
}

function abrir(id,btn){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll(".menu button").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  carregarTudo();
}

async function api(url,op={}){
  op.headers = op.headers || {};
  op.headers.Authorization = token;
  if(op.body) op.headers["Content-Type"] = "application/json";
  return fetch(url,op);
}

async function dados(){
  const r = await fetch("/debug");
  return r.json();
}

async function carregarTudo(){
  const d = await dados();
  const mes = mesAtualTexto();
  mesPainel.innerText = mes;
  mesRelatorio.innerText = mes;

  const rel = await api("/relatorio/mes").then(r=>r.json()).catch(()=>({faturamento:0,custo:0,lucro:0}));

  kpiFat.innerText = moeda(rel.faturamento);
  kpiLucro.innerText = moeda(rel.lucro);
  kpiEstoqueCabelo.innerText = d.cabelos.reduce((s,c)=>s+(Number(c.peso_total||0)-Number(c.gramas_vendidas||0)),0)+"g";
  kpiEstoqueProduto.innerText = d.produtos.reduce((s,p)=>s+(Number(p.quantidade||0)-Number(p.vendidos||0)),0);
  kpiLotes.innerText = d.cabelos.length;
  kpiProdutos.innerText = d.produtos.length;

  maisVendidos.innerHTML = d.cabelos.slice().sort((a,b)=>(b.gramas_vendidas||0)-(a.gramas_vendidas||0)).map(c=>"<p>"+c.tipo+" — "+(c.gramas_vendidas||0)+"g</p>").join("") || "Nenhum cabelo vendido";

  listarCabelos(d);
  listarProdutos(d);
  carregarRelatorios();
}

function limparCabelo(){
  editCabeloId.value="";
  tituloCabelo.innerText="Novo cabelo";
  tipoCabelo.value="";
  pesoTotal.value="";
  valorVendaGrama.value="";
  valorCustoGrama.value="";
  codigosCabelo.value="";
}

async function salvarCabelo(){
  const codigos = codigosCabelo.value.split(",").map(c=>c.trim()).filter(Boolean);
  const body = JSON.stringify({
    tipo: tipoCabelo.value,
    peso_total: Number(pesoTotal.value),
    valor_grama_venda: Number(valorVendaGrama.value),
    valor_grama_custo: Number(valorCustoGrama.value),
    codigos
  });

  if(editCabeloId.value){
    await api("/cabelos/"+editCabeloId.value,{method:"PUT",body});
  } else {
    await api("/cabelos",{method:"POST",body});
  }

  limparCabelo();
  carregarTudo();
}

function editarCabelo(c){
  editCabeloId.value=c.id;
  tituloCabelo.innerText="Editando cabelo ID "+c.id;
  tipoCabelo.value=c.tipo;
  pesoTotal.value=c.peso_total;
  valorVendaGrama.value=c.valor_grama_venda;
  valorCustoGrama.value=c.valor_grama_custo;
  codigosCabelo.value=(c.itens||[]).map(i=>i.codigo).join(", ");
  window.scrollTo(0,0);
}

async function excluirCabelo(id){
  if(!confirm("Excluir este cabelo?")) return;
  await api("/cabelos/"+id,{method:"DELETE"});
  carregarTudo();
}

async function venderCabelo(){
  await api("/cabelos/"+idCabeloVenda.value+"/venda",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gramas:Number(gramasVendidas.value)})});
  idCabeloVenda.value="";
  gramasVendidas.value="";
  carregarTudo();
}

function listarCabelos(d){
  listaCabelos.innerHTML = '<table class="table"><tr><th>Tipo</th><th>Total</th><th>Vendido</th><th>Estoque</th><th>R$/g Venda</th><th>Lucro</th><th>Itens</th><th>Ações</th></tr>'+
  d.cabelos.map(c=>{
    const estoque = Number(c.peso_total||0)-Number(c.gramas_vendidas||0);
    return '<tr><td>'+c.tipo+'<br><small>ID '+c.id+'</small></td><td>'+c.peso_total+'g</td><td>'+c.gramas_vendidas+'g</td><td>'+estoque+'g</td><td>'+moeda(c.valor_grama_venda)+'</td><td class="orange">'+moeda(c.lucro)+'</td><td><span class="badge">'+((c.itens||[]).length)+'</span></td><td><button class="btn btn-light" onclick=\\'editarCabelo('+JSON.stringify(c)+')\\'>Editar</button> <button class="btn btn-red" onclick="excluirCabelo('+c.id+')">Excluir</button></td></tr>';
  }).join("")+'</table>';
}

function limparProduto(){
  editProdutoId.value="";
  tituloProduto.innerText="Novo produto";
  nomeProduto.value="";
  quantidadeProduto.value="";
  valorVendaProduto.value="";
  valorCustoProduto.value="";
}

async function salvarProduto(){
  const body = JSON.stringify({
    nome:nomeProduto.value,
    quantidade:Number(quantidadeProduto.value),
    valor_unitario_venda:Number(valorVendaProduto.value),
    valor_unitario_custo:Number(valorCustoProduto.value)
  });

  if(editProdutoId.value){
    await api("/produtos/"+editProdutoId.value,{method:"PUT",body});
  } else {
    await api("/produtos",{method:"POST",body});
  }

  limparProduto();
  carregarTudo();
}

function editarProduto(p){
  editProdutoId.value=p.id;
  tituloProduto.innerText="Editando produto ID "+p.id;
  nomeProduto.value=p.nome;
  quantidadeProduto.value=p.quantidade;
  valorVendaProduto.value=p.valor_unitario_venda;
  valorCustoProduto.value=p.valor_unitario_custo;
  window.scrollTo(0,0);
}

async function excluirProduto(id){
  if(!confirm("Excluir este produto?")) return;
  await api("/produtos/"+id,{method:"DELETE"});
  carregarTudo();
}

async function venderProduto(){
  await api("/produtos/"+idProdutoVenda.value+"/venda",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quantidade:Number(qtdProdutoVenda.value)})});
  idProdutoVenda.value="";
  qtdProdutoVenda.value="";
  carregarTudo();
}

function listarProdutos(d){
  listaProdutos.innerHTML = '<table class="table"><tr><th>Produto</th><th>Total</th><th>Vendido</th><th>Estoque</th><th>Venda</th><th>Lucro</th><th>Ações</th></tr>'+
  d.produtos.map(p=>{
    const estoque = Number(p.quantidade||0)-Number(p.vendidos||0);
    return '<tr><td>'+p.nome+'<br><small>ID '+p.id+'</small></td><td>'+p.quantidade+'</td><td>'+p.vendidos+'</td><td>'+estoque+'</td><td>'+moeda(p.valor_unitario_venda)+'</td><td class="orange">'+moeda(p.lucro)+'</td><td><button class="btn btn-light" onclick=\\'editarProduto('+JSON.stringify(p)+')\\'>Editar</button> <button class="btn btn-red" onclick="excluirProduto('+p.id+')">Excluir</button></td></tr>';
  }).join("")+'</table>';
}

async function carregarRelatorios(){
  const rel = await api("/relatorio/mes").then(r=>r.json());
  relFat.innerText=moeda(rel.faturamento);
  relCusto.innerText=moeda(rel.custo);
  relLucro.innerText=moeda(rel.lucro);
  relMargem.innerText = rel.faturamento ? ((rel.lucro/rel.faturamento)*100).toFixed(1)+"%" : "0%";

  const hist = await api("/relatorio/historico").then(r=>r.json());
  historico.innerHTML='<table class="table"><tr><th>Mês</th><th>Faturamento</th><th>Custo</th><th>Lucro</th><th>Status</th></tr>'+
  Object.keys(hist).map(m=>'<tr><td>'+m+'</td><td>'+moeda(hist[m].faturamento)+'</td><td class="red">'+moeda(hist[m].custo)+'</td><td class="orange">'+moeda(hist[m].lucro)+'</td><td><span class="badge">'+(hist[m].fechado?"Fechado":"Aberto")+'</span></td></tr>').join("")+'</table>';
}

async function fecharMes(){
  if(!confirm("Fechar mês atual?")) return;
  await api("/relatorio/fechar",{method:"POST"});
  carregarTudo();
}

function baixarPDF(){
  window.open("/relatorio/pdf?token="+token,"_blank");
}

loginAuto();
</script>
</body>
</html>
`);
});

app.post("/login", (req, res) => {
  if (req.body.senha !== "1234") return res.status(401).send("Senha incorreta");
  res.json({ token: jwt.sign({}, SECRET) });
});

app.post("/cabelos", auth, (req, res) => {
  const { tipo, peso_total, valor_grama_venda, valor_grama_custo, codigos } = req.body;
  db.cabelos.push({
    id: Date.now(),
    tipo,
    peso_total: Number(peso_total),
    gramas_vendidas: 0,
    valor_grama_venda: Number(valor_grama_venda),
    valor_grama_custo: Number(valor_grama_custo),
    faturamento: 0,
    custo: 0,
    lucro: 0,
    itens: Array.isArray(codigos) ? codigos.map(codigo => ({ codigo, status: "disponivel" })) : []
  });
  salvar();
  res.json({ mensagem: "Cabelo cadastrado" });
});

app.put("/cabelos/:id", auth, (req, res) => {
  const cabelo = db.cabelos.find(c => c.id == req.params.id);
  if (!cabelo) return res.status(404).send("Cabelo não encontrado");

  cabelo.tipo = req.body.tipo;
  cabelo.peso_total = Number(req.body.peso_total);
  cabelo.valor_grama_venda = Number(req.body.valor_grama_venda);
  cabelo.valor_grama_custo = Number(req.body.valor_grama_custo);
  cabelo.itens = Array.isArray(req.body.codigos) ? req.body.codigos.map(codigo => ({ codigo, status: "disponivel" })) : cabelo.itens;

  salvar();
  res.json(cabelo);
});

app.delete("/cabelos/:id", auth, (req, res) => {
  db.cabelos = db.cabelos.filter(c => c.id != req.params.id);
  salvar();
  res.send("Cabelo excluído");
});

app.post("/cabelos/:id/venda", auth, (req, res) => {
  const cabelo = db.cabelos.find(c => c.id == req.params.id);
  if (!cabelo) return res.status(404).send("Cabelo não encontrado");

  const gramas = Number(req.body.gramas);
  const mes = getMesAtual();
  garantirRelatorio(mes);

  if (db.relatorios[mes].fechado) return res.status(400).send("Mês fechado");

  const estoque = cabelo.peso_total - cabelo.gramas_vendidas;
  if (gramas > estoque) return res.status(400).send("Sem estoque");

  const faturamento = gramas * cabelo.valor_grama_venda;
  const custo = gramas * cabelo.valor_grama_custo;
  const lucro = faturamento - custo;

  cabelo.gramas_vendidas += gramas;
  cabelo.faturamento = (cabelo.faturamento || 0) + faturamento;
  cabelo.custo = (cabelo.custo || 0) + custo;
  cabelo.lucro = (cabelo.lucro || 0) + lucro;

  db.relatorios[mes].faturamento += faturamento;
  db.relatorios[mes].custo += custo;
  db.relatorios[mes].lucro += lucro;

  salvar();
  res.send("Venda registrada");
});

app.post("/produtos", auth, (req, res) => {
  const { nome, quantidade, valor_unitario_venda, valor_unitario_custo } = req.body;
  db.produtos.push({
    id: Date.now(),
    nome,
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

app.put("/produtos/:id", auth, (req, res) => {
  const produto = db.produtos.find(p => p.id == req.params.id);
  if (!produto) return res.status(404).send("Produto não encontrado");

  produto.nome = req.body.nome;
  produto.quantidade = Number(req.body.quantidade);
  produto.valor_unitario_venda = Number(req.body.valor_unitario_venda);
  produto.valor_unitario_custo = Number(req.body.valor_unitario_custo);

  salvar();
  res.json(produto);
});

app.delete("/produtos/:id", auth, (req, res) => {
  db.produtos = db.produtos.filter(p => p.id != req.params.id);
  salvar();
  res.send("Produto excluído");
});

app.post("/produtos/:id/venda", auth, (req, res) => {
  const produto = db.produtos.find(p => p.id == req.params.id);
  if (!produto) return res.status(404).send("Produto não encontrado");

  const quantidade = Number(req.body.quantidade);
  const mes = getMesAtual();
  garantirRelatorio(mes);

  if (db.relatorios[mes].fechado) return res.status(400).send("Mês fechado");

  const estoque = produto.quantidade - produto.vendidos;
  if (quantidade > estoque) return res.status(400).send("Sem estoque");

  const faturamento = quantidade * produto.valor_unitario_venda;
  const custo = quantidade * produto.valor_unitario_custo;
  const lucro = faturamento - custo;

  produto.vendidos += quantidade;
  produto.faturamento = (produto.faturamento || 0) + faturamento;
  produto.custo = (produto.custo || 0) + custo;
  produto.lucro = (produto.lucro || 0) + lucro;

  db.relatorios[mes].faturamento += faturamento;
  db.relatorios[mes].custo += custo;
  db.relatorios[mes].lucro += lucro;

  salvar();
  res.send("Venda registrada");
});

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
  try {
    jwt.verify(req.query.token || req.headers.authorization, SECRET);
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