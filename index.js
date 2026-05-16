const express = require("express");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");
const multer = require("multer");

const app = express();
app.use(express.json());

const SECRET = "senha_super_secreta";
const DATA_FILE = "banco.json";

const USER_LOGIN = "felipegomes0155";
const USER_PASSWORD = "felipemaga123";

const LOJA_NOME = "iranymegahairloja";
const LOJA_ENDERECO = "Galeria Ouvidor Loja 42A";

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const nomeSeguro =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "-");

    cb(null, nomeSeguro);
  }
});

const upload = multer({ storage });

let db = {
  cabelos: [],
  produtos: [],
  relatorios: {},
  vendas: [],
  notas: []
};

if (fs.existsSync(DATA_FILE)) {
  db = JSON.parse(fs.readFileSync(DATA_FILE));
}

function salvar() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function getMesAtual() {
  const d = new Date();

  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0")
  );
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
  const token =
    req.headers.authorization || req.query.token;

  if (!token) {
    return res.status(401).send("Sem token");
  }

  try {
    jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).send("Token inválido");
  }
}

function normalizarBanco() {
  db.cabelos = Array.isArray(db.cabelos)
    ? db.cabelos
    : [];

  db.produtos = Array.isArray(db.produtos)
    ? db.produtos
    : [];

  db.relatorios = db.relatorios || {};

  db.vendas = Array.isArray(db.vendas)
    ? db.vendas
    : [];

  db.notas = Array.isArray(db.notas)
    ? db.notas
    : [];

  db.cabelos.forEach(c => {
    c.gramas_vendidas = Number(
      c.gramas_vendidas || 0
    );

    c.faturamento = Number(c.faturamento || 0);
    c.custo = Number(c.custo || 0);
    c.lucro = Number(c.lucro || 0);

    c.itens = Array.isArray(c.itens)
      ? c.itens
      : [];
  });

  db.produtos.forEach(p => {
    p.vendidos = Number(p.vendidos || 0);
    p.faturamento = Number(p.faturamento || 0);
    p.custo = Number(p.custo || 0);
    p.lucro = Number(p.lucro || 0);
  });
}

normalizarBanco();
salvar();

app.get("/", (req, res) => {
  res.send(`

<!DOCTYPE html>
<html lang="pt-BR">

<head>

<meta charset="UTF-8">

<title>Gestão de Cabelos</title>

<style>

*{
box-sizing:border-box
}

body{
margin:0;
font-family:Arial,Helvetica,sans-serif;
background:#faf8f5;
color:#111
}

.login-screen{
min-height:100vh;
display:flex;
align-items:center;
justify-content:center;
background:
linear-gradient(
135deg,
#fff7ed,
#fed7aa,
#f97316
)
}

.login-box{
width:360px;
background:white;
padding:30px;
border-radius:18px;
box-shadow:0 20px 50px #0003
}

.login-box h1{
margin:0 0 5px
}

.login-box p{
color:#777
}

input,
textarea,
select{
width:100%;
padding:11px;
border:1px solid #ddd;
border-radius:8px;
margin:6px 0 12px;
background:white
}

button{
cursor:pointer
}

.btn{
border:0;
border-radius:8px;
padding:10px 15px;
font-weight:700;
margin:2px
}

.btn-orange{
background:#d96213;
color:white
}

.btn-light{
background:#f4eee9;
color:#111;
border:1px solid #ddd
}

.btn-red{
background:#dc2626;
color:white
}

.btn-dark{
background:#111;
color:white
}

.app{
display:none;
min-height:100vh
}

.sidebar{
width:245px;
background:white;
border-right:1px solid #ddd;
position:fixed;
top:0;
left:0;
bottom:0
}

.brand{
padding:20px;
border-bottom:1px solid #ddd
}

.brand h2{
margin:0;
font-size:18px
}

.versiculo{
font-size:12px;
color:#a4490c;
margin-top:8px;
font-style:italic;
line-height:1.4
}

.menu{
padding:18px 0
}

.menu button{
width:100%;
background:transparent;
border:0;
text-align:left;
padding:13px 20px;
font-size:15px;
color:#111
}

.menu button:hover,
.menu button.active{
background:#f4eee9;
color:#c95b12;
font-weight:700
}

.sair{
position:absolute;
bottom:0;
left:0;
right:0;
padding:16px 20px;
border-top:1px solid #ddd;
color:#777
}

.main{
margin-left:245px;
padding:34px
}

.top{
display:flex;
justify-content:space-between;
align-items:center;
margin-bottom:26px
}

.top h1{
margin:0;
font-size:25px
}

.top p{
margin:4px 0 0;
color:#777
}

.grid{
display:grid;
grid-template-columns:
repeat(3,1fr);
gap:16px;
margin-bottom:26px
}

.card{
background:white;
border:1px solid #ddd;
border-radius:12px;
padding:20px;
box-shadow:0 2px 5px #0001;
margin-bottom:18px
}

.kpi-title{
color:#666;
font-size:13px;
text-transform:uppercase
}

.kpi-value{
font-size:26px;
font-weight:800;
margin-top:8px
}

.orange{
color:#d96213
}

.red{
color:#dc2626
}

.page{
display:none
}

.page.active{
display:block
}

.form-grid{
display:grid;
grid-template-columns:
repeat(2,1fr);
gap:15px
}

.table{
width:100%;
border-collapse:collapse;
background:white;
border:1px solid #ddd;
border-radius:10px;
overflow:hidden
}

.table th,
.table td{
padding:14px;
border-bottom:1px solid #ddd;
text-align:left;
font-size:14px;
vertical-align:top
}

.table th{
background:#f8f6f4;
color:#6b625c
}

.badge{
background:#f4eee9;
border-radius:7px;
padding:5px 10px;
font-weight:700;
display:inline-block;
margin:2px
}

.codigo-line{
display:grid;
grid-template-columns:
1fr 170px auto;
gap:8px;
align-items:center;
margin-bottom:8px;
background:#faf7f3;
padding:8px;
border-radius:8px
}

.codigo-line input,
.codigo-line select{
margin:0
}

.frase-relatorio{
background:#fff7ed;
border:1px solid #fdba74;
color:#9a3412;
padding:13px;
border-radius:10px;
margin-bottom:18px;
font-style:italic
}

.nota-box{
background:
linear-gradient(
135deg,
#fff7ed,
#ffffff
);

border:1px solid #fed7aa;
border-radius:14px;
padding:18px;
margin-bottom:14px
}

.preview{
max-width:120px;
max-height:120px;
border-radius:10px;
border:1px solid #ddd;
margin-top:8px
}

</style>

</head>

<body>

<div id="loginScreen" class="login-screen">

<div class="login-box">

<h1>Gestão de Cabelos</h1>

<p>Acesso privado</p>

<input id="loginUsuario" placeholder="Login">

<input
id="loginSenha"
type="password"
placeholder="Senha"
>

<button
class="btn btn-orange"
onclick="fazerLogin()"
>
Entrar
</button>

<p id="loginErro" class="red"></p>

</div>
</div>

<div id="app" class="app">

<aside class="sidebar">

<div class="brand">

<h2>Gestão de Cabelos</h2>

<div class="versiculo">
“Os que olham para ti estão radiantes, Senhor.”
</div>

</div>

<div class="menu">

<button
class="active"
onclick="abrir('dashboard',this)"
>
▦ Painel
</button>

<button onclick="abrir('cabelos',this)">
✂ Cabelos
</button>

<button onclick="abrir('produtos',this)">
▧ Produtos
</button>

<button onclick="abrir('relatorios',this)">
▥ Relatórios
</button>

<button onclick="abrir('vendas',this)">
▤ Vendas
</button>

<button onclick="abrir('notas',this)">
▣ Notas
</button>

</div>

<div class="sair" onclick="sair()">
↪ Sair
</div>

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

<div class="card">
<div class="kpi-title">
Faturamento do mês
</div>
<div id="kpiFat" class="kpi-value">
R$ 0,00
</div>
</div>

<div class="card">
<div class="kpi-title">
Lucro do mês
</div>
<div
id="kpiLucro"
class="kpi-value orange"
>
R$ 0,00
</div>
</div>

<div class="card">
<div class="kpi-title">
Estoque cabelo
</div>
<div
id="kpiEstoqueCabelo"
class="kpi-value"
>
0g
</div>
</div>

</div>

</section>

<section id="cabelos" class="page">

<div class="top">

<div>

<h1>Cabelos</h1>

<p>
Gerenciar lotes, códigos e vendas
</p>

</div>

<button
class="btn btn-orange"
onclick="limparCabelo()"
>
+ Novo Lote
</button>

</div>

<div class="card">

<h3 id="tituloCabelo">
Novo cabelo
</h3>

<input
type="hidden"
id="editCabeloId"
>

<div class="form-grid">

<div>
<label>Tipo</label>

<input
id="tipoCabelo"
placeholder="Ex: Indiano 65 cm"
>
</div>

<div>
<label>Peso total em gramas</label>

<input
id="pesoTotal"
type="number"
>
</div>

<div>
<label>Valor venda por grama</label>

<input
id="valorVendaGrama"
type="number"
>
</div>

<div>
<label>Custo por grama</label>

<input
id="valorCustoGrama"
type="number"
>
</div>

</div>

<label>Códigos internos do lote</label>

<textarea
id="codigosCabelo"
placeholder="A01, A02, A03"
></textarea>

<div id="editorCodigos"></div>

<button
type="button"
class="btn btn-light"
onclick="adicionarNovoCodigo()"
>
+ Adicionar código manual
</button>

<button
class="btn btn-orange"
onclick="salvarCabelo()"
>
Salvar cabelo
</button>

<button
class="btn btn-light"
onclick="limparCabelo()"
>
Limpar
</button>

</div>

<div class="card">

<h3>
Registrar venda de cabelo
</h3>

<div class="form-grid">

<div>

<label>ID do cabelo</label>

<input
id="idCabeloVenda"
type="number"
>

</div>

<div>

<label>Gramas vendidas</label>

<input
id="gramasVendidas"
type="number"
>

</div>

</div>

<button
class="btn btn-dark"
onclick="venderCabelo()"
>
Registrar venda
</button>

</div>

<div id="listaCabelos"></div>

</section>

<section id="vendas" class="page">

<div class="top">

<div>

<h1>Vendas</h1>

<p>
Histórico de vendas
</p>

</div>

</div>

<div class="card">

<h3>Vendas registradas</h3>

<p class="red">
<strong>Atenção:</strong>
apagar venda devolve estoque.
</p>

<div id="listaVendas"></div>

</div>

</section>

<section id="notas" class="page">

<div class="top">

<div>

<h1>Notas e Canhotos</h1>

<p>
Notas fiscais, comprovantes e fotos
</p>

</div>

</div>

<div class="card">

<h3>Adicionar documento</h3>

<div class="form-grid">

<div>

<label>Tipo</label>

<select id="tipoNota">

<option value="Canhoto">
Canhoto
</option>

<option value="Nota Entrada">
Nota Entrada
</option>

<option value="Comprovante">
Comprovante
</option>

</select>

</div>

<div>

<label>Descrição</label>

<input
id="descricaoNota"
placeholder="Descrição"
>

</div>

</div>

<label>Arquivo</label>

<input
id="arquivoNota"
type="file"
>

<button
class="btn btn-orange"
onclick="enviarNota()"
>
Salvar documento
</button>

</div>

<div class="card">

<h3>Documentos salvos</h3>

<div id="listaNotas"></div>

</div>

</section>

</main>

</div>

<script>

let token =
localStorage.getItem("token") || "";

let dadosAtuais = {
cabelos: [],
produtos: [],
vendas: [],
notas: [],
relatorios: {}
};

function moeda(v){
return Number(v||0)
.toLocaleString(
"pt-BR",
{
style:"currency",
currency:"BRL"
}
)
}

function mesTexto(){
return new Date()
.toLocaleDateString(
"pt-BR",
{
month:"long",
year:"numeric"
}
)
}

async function fazerLogin(){
  const usuario = loginUsuario.value;
  const senha = loginSenha.value;

  const r = await fetch("/login", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({usuario, senha})
  });

  if(!r.ok){
    loginErro.innerText = "Login ou senha incorretos";
    return;
  }

  const data = await r.json();
  token = data.token;
  localStorage.setItem("token", token);
  loginScreen.style.display = "none";
  app.style.display = "flex";
  carregarTudo();
}

function sair(){
  localStorage.removeItem("token");
  token = "";
  location.reload();
}

async function api(url, op={}){
  op.headers = op.headers || {};
  op.headers.Authorization = token;

  if(op.body && !(op.body instanceof FormData)){
    op.headers["Content-Type"] = "application/json";
  }

  return fetch(url, op);
}

async function verificarToken(){
  if(!token) return;

  const r = await api("/debug");

  if(r.ok){
    loginScreen.style.display = "none";
    app.style.display = "flex";
    carregarTudo();
  } else {
    localStorage.removeItem("token");
  }
}

function abrir(id,btn){
  document.querySelectorAll(".page")
    .forEach(p=>p.classList.remove("active"));

  document.getElementById(id)
    .classList.add("active");

  document.querySelectorAll(".menu button")
    .forEach(b=>b.classList.remove("active"));

  btn.classList.add("active");

  carregarTudo();
}

async function dados(){
  const r = await api("/debug");
  dadosAtuais = await r.json();
  return dadosAtuais;
}

async function carregarTudo(){
  const d = await dados();

  if(document.getElementById("mesPainel")){
    mesPainel.innerText = mesTexto();
  }

  const rel = await api("/relatorio/mes")
    .then(r=>r.json());

  if(document.getElementById("kpiFat")){
    kpiFat.innerText = moeda(rel.faturamento);
  }

  if(document.getElementById("kpiLucro")){
    kpiLucro.innerText = moeda(rel.lucro);
  }

  if(document.getElementById("kpiEstoqueCabelo")){
    kpiEstoqueCabelo.innerText =
      d.cabelos.reduce(
        (s,c)=>s+(Number(c.peso_total||0)-Number(c.gramas_vendidas||0)),
        0
      ) + "g";
  }

  listarCabelos(d);
  listarVendas(d);
  listarNotas(d);
}

function limparCabelo(){
  editCabeloId.value="";
  tituloCabelo.innerText="Novo cabelo";
  tipoCabelo.value="";
  pesoTotal.value="";
  valorVendaGrama.value="";
  valorCustoGrama.value="";
  codigosCabelo.value="";
  editorCodigos.innerHTML="";
}

function adicionarLinhaCodigo(codigo = "", status = "disponivel"){
  const div = document.createElement("div");
  div.className = "codigo-line";

  div.innerHTML =
    '<input value="' + String(codigo).replace(/"/g, "&quot;") + '" placeholder="Código">' +
    '<select>' +
      '<option value="disponivel" ' + (status === "disponivel" ? "selected" : "") + '>Disponível</option>' +
      '<option value="reservado" ' + (status === "reservado" ? "selected" : "") + '>Reservado</option>' +
      '<option value="vendido" ' + (status === "vendido" ? "selected" : "") + '>Vendido</option>' +
    '</select>' +
    '<button type="button" class="btn btn-red" onclick="this.parentElement.remove()">Remover</button>';

  editorCodigos.appendChild(div);
}

function montarEditorCodigos(itens){
  editorCodigos.innerHTML = "<h4>Status dos códigos</h4>";

  if(Array.isArray(itens)){
    itens.forEach(function(i){
      adicionarLinhaCodigo(i.codigo, i.status || "disponivel");
    });
  }
}

function adicionarNovoCodigo(){
  adicionarLinhaCodigo("", "disponivel");
}

function pegarCodigosEditados(){
  const linhas = editorCodigos.querySelectorAll(".codigo-line");

  if(linhas.length > 0){
    return Array.from(linhas)
      .map(function(linha){
        return {
          codigo: linha.querySelector("input").value.trim(),
          status: linha.querySelector("select").value
        };
      })
      .filter(function(item){
        return item.codigo.length > 0;
      });
  }

  return codigosCabelo.value
    .split(",")
    .map(function(c){ return c.trim(); })
    .filter(Boolean)
    .map(function(codigo){
      return {
        codigo: codigo,
        status: "disponivel"
      };
    });
}

async function salvarCabelo(){
  const itens = pegarCodigosEditados();

  const body = JSON.stringify({
    tipo: tipoCabelo.value,
    peso_total: Number(pesoTotal.value),
    valor_grama_venda: Number(valorVendaGrama.value),
    valor_grama_custo: Number(valorCustoGrama.value),
    itens: itens
  });

  if(editCabeloId.value){
    await api("/cabelos/" + editCabeloId.value, {
      method:"PUT",
      body
    });
  } else {
    await api("/cabelos", {
      method:"POST",
      body
    });
  }

  limparCabelo();
  carregarTudo();
}

function editarCabelo(id){
  const c = dadosAtuais.cabelos.find(item => item.id == id);

  if(!c){
    return alert("Cabelo não encontrado");
  }

  editCabeloId.value = c.id;
  tituloCabelo.innerText = "Editando cabelo ID " + c.id;
  tipoCabelo.value = c.tipo;
  pesoTotal.value = c.peso_total;
  valorVendaGrama.value = c.valor_grama_venda;
  valorCustoGrama.value = c.valor_grama_custo;

  codigosCabelo.value = (c.itens || [])
    .map(i=>i.codigo)
    .join(", ");

  montarEditorCodigos(c.itens || []);

  window.scrollTo(0,0);
}

async function excluirCabelo(id){
  if(!confirm("Excluir este cabelo?")) return;

  await api("/cabelos/" + id, {
    method:"DELETE"
  });

  carregarTudo();
}

async function venderCabelo(){
  await api("/cabelos/" + idCabeloVenda.value + "/venda", {
    method:"POST",
    body:JSON.stringify({
      gramas:Number(gramasVendidas.value)
    })
  });

  idCabeloVenda.value="";
  gramasVendidas.value="";
  carregarTudo();
}

function listarCabelos(d){
  listaCabelos.innerHTML =
    '<table class="table">' +
    '<tr>' +
    '<th>Tipo</th>' +
    '<th>Total</th>' +
    '<th>Vendido</th>' +
    '<th>Estoque</th>' +
    '<th>Lucro</th>' +
    '<th>Códigos</th>' +
    '<th>Ações</th>' +
    '</tr>' +
    d.cabelos.map(c=>{
      const estoque =
        Number(c.peso_total || 0) -
        Number(c.gramas_vendidas || 0);

      const codigos =
        (c.itens || [])
          .map(i=>'<span class="badge">' + i.codigo + ' - ' + i.status + '</span>')
          .join(" ");

      return (
        '<tr>' +
        '<td>' + c.tipo + '<br><small>ID ' + c.id + '</small></td>' +
        '<td>' + c.peso_total + 'g</td>' +
        '<td>' + c.gramas_vendidas + 'g</td>' +
        '<td>' + estoque + 'g</td>' +
        '<td class="orange">' + moeda(c.lucro) + '</td>' +
        '<td>' + codigos + '</td>' +
        '<td>' +
        '<button class="btn btn-light" onclick="editarCabelo(' + c.id + ')">Editar</button>' +
        '<button class="btn btn-red" onclick="excluirCabelo(' + c.id + ')">Excluir</button>' +
        '</td>' +
        '</tr>'
      );
    }).join("") +
    '</table>';
}

function listarVendas(d){
  listaVendas.innerHTML =
    '<table class="table">' +
    '<tr>' +
    '<th>Data</th>' +
    '<th>Tipo</th>' +
    '<th>Item</th>' +
    '<th>Quantidade</th>' +
    '<th>Faturamento</th>' +
    '<th>Lucro</th>' +
    '<th>Ação</th>' +
    '</tr>' +
    (d.vendas || [])
      .slice()
      .reverse()
      .map(v=>{
        return (
          '<tr>' +
          '<td>' + new Date(v.data).toLocaleString("pt-BR") + '</td>' +
          '<td>' + v.tipo + '</td>' +
          '<td>' + v.item + '</td>' +
          '<td>' + v.quantidade + '</td>' +
          '<td>' + moeda(v.faturamento) + '</td>' +
          '<td class="orange">' + moeda(v.lucro) + '</td>' +
          '<td><button class="btn btn-red" onclick="apagarVenda(' + v.id + ')">Apagar</button></td>' +
          '</tr>'
        );
      }).join("") +
    '</table>';
}

async function apagarVenda(id){
  if(!confirm("Apagar esta venda e corrigir o relatório?")) return;

  const r = await api("/vendas/" + id, {
    method:"DELETE"
  });

  alert(await r.text());
  carregarTudo();
}

async function enviarNota(){
  if(!arquivoNota.files[0]){
    return alert("Escolha um arquivo");
  }

  const form = new FormData();
  form.append("arquivo", arquivoNota.files[0]);
  form.append("tipo", tipoNota.value);
  form.append("descricao", descricaoNota.value);

  const r = await api("/notas", {
    method:"POST",
    body: form
  });

  alert(await r.text());

  arquivoNota.value = "";
  descricaoNota.value = "";

  carregarTudo();
}

function listarNotas(d){
  listaNotas.innerHTML =
    (d.notas || [])
      .slice()
      .reverse()
      .map(n=>{
        const isImg =
          n.mimetype &&
          n.mimetype.startsWith("image/");

        return (
          '<div class="nota-box">' +
          '<h3>' + n.tipo + '</h3>' +
          '<p>' + n.descricao + '</p>' +
          '<p><strong>Data:</strong> ' + new Date(n.data).toLocaleString("pt-BR") + '</p>' +
          '<a target="_blank" href="' + n.url + '">Abrir arquivo</a><br>' +
          (isImg ? '<img class="preview" src="' + n.url + '">' : '') +
          '<br><button class="btn btn-red" onclick="apagarNota(' + n.id + ')">Excluir</button>' +
          '</div>'
        );
      }).join("") || "Nenhum documento salvo.";
}

async function apagarNota(id){
  if(!confirm("Excluir este documento?")) return;

  const r = await api("/notas/" + id, {
    method:"DELETE"
  });

  alert(await r.text());
  carregarTudo();
}

function baixarPDF(){
  window.open("/relatorio/pdf?token=" + token, "_blank");
}

verificarToken();

</script>

</body>
</html>

  `);
});

app.post("/login", (req, res) => {
  if (
    req.body.usuario !== USER_LOGIN ||
    req.body.senha !== USER_PASSWORD
  ) {
    return res.status(401).send("Login ou senha incorretos");
  }

  res.json({
    token: jwt.sign({ usuario: USER_LOGIN }, SECRET)
  });
});

app.post("/cabelos", auth, (req, res) => {
  const {
    tipo,
    peso_total,
    valor_grama_venda,
    valor_grama_custo,
    itens
  } = req.body;

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
    itens: Array.isArray(itens) ? itens : []
  });

  salvar();
  res.json({ mensagem: "Cabelo cadastrado" });
});

app.put("/cabelos/:id", auth, (req, res) => {
  const cabelo =
    db.cabelos.find(c => c.id == req.params.id);

  if(!cabelo){
    return res.status(404).send("Cabelo não encontrado");
  }

  cabelo.tipo = req.body.tipo;
  cabelo.peso_total = Number(req.body.peso_total);
  cabelo.valor_grama_venda =
    Number(req.body.valor_grama_venda);
  cabelo.valor_grama_custo =
    Number(req.body.valor_grama_custo);

  cabelo.itens = Array.isArray(req.body.itens)
    ? req.body.itens
    : cabelo.itens;

  salvar();
  res.json(cabelo);
});

app.delete("/cabelos/:id", auth, (req, res) => {
  db.cabelos =
    db.cabelos.filter(c => c.id != req.params.id);

  salvar();
  res.send("Cabelo excluído");
});

app.post("/cabelos/:id/venda", auth, (req, res) => {
  const cabelo =
    db.cabelos.find(c => c.id == req.params.id);

  if(!cabelo){
    return res.status(404).send("Cabelo não encontrado");
  }

  const gramas = Number(req.body.gramas);

  const mes = getMesAtual();
  garantirRelatorio(mes);

  if(db.relatorios[mes].fechado){
    return res.status(400).send("Mês fechado");
  }

  const estoque =
    cabelo.peso_total -
    cabelo.gramas_vendidas;

  if(gramas > estoque){
    return res.status(400).send("Sem estoque");
  }

  const faturamento =
    gramas * cabelo.valor_grama_venda;

  const custo =
    gramas * cabelo.valor_grama_custo;

  const lucro =
    faturamento - custo;

  cabelo.gramas_vendidas += gramas;
  cabelo.faturamento += faturamento;
  cabelo.custo += custo;
  cabelo.lucro += lucro;

  db.relatorios[mes].faturamento += faturamento;
  db.relatorios[mes].custo += custo;
  db.relatorios[mes].lucro += lucro;

  db.vendas.push({
    id: Date.now(),
    tipo: "Cabelo",
    itemId: cabelo.id,
    item: cabelo.tipo,
    quantidade: gramas + "g",
    quantidadeNumero: gramas,
    faturamento,
    custo,
    lucro,
    mes,
    data: new Date().toISOString()
  });

  salvar();
  res.send("Venda registrada");
});

app.delete("/vendas/:id", auth, (req, res) => {
  const venda =
    db.vendas.find(v => v.id == req.params.id);

  if(!venda){
    return res.status(404).send("Venda não encontrada");
  }

  garantirRelatorio(venda.mes);

  if(venda.tipo === "Cabelo"){
    const cabelo =
      db.cabelos.find(c => c.id == venda.itemId);

    if(cabelo){
      cabelo.gramas_vendidas -= venda.quantidadeNumero;
      cabelo.faturamento -= venda.faturamento;
      cabelo.custo -= venda.custo;
      cabelo.lucro -= venda.lucro;
    }
  }

  db.relatorios[venda.mes].faturamento -= venda.faturamento;
  db.relatorios[venda.mes].custo -= venda.custo;
  db.relatorios[venda.mes].lucro -= venda.lucro;

  db.vendas =
    db.vendas.filter(v => v.id != req.params.id);

  salvar();
  res.send("Venda apagada e relatório corrigido");
});

app.post("/notas", auth, upload.single("arquivo"), (req, res) => {
  if(!req.file){
    return res.status(400).send("Nenhum arquivo enviado");
  }

  db.notas.push({
    id: Date.now(),
    tipo: req.body.tipo || "Outro",
    descricao: req.body.descricao || "",
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    url: "/uploads/" + req.file.filename,
    data: new Date().toISOString()
  });

  salvar();
  res.send("Documento salvo");
});

app.delete("/notas/:id", auth, (req, res) => {
  const nota =
    db.notas.find(n => n.id == req.params.id);

  if(nota && nota.filename){
    const caminho =
      "uploads/" + nota.filename;

    if(fs.existsSync(caminho)){
      fs.unlinkSync(caminho);
    }
  }

  db.notas =
    db.notas.filter(n => n.id != req.params.id);

  salvar();
  res.send("Documento excluído");
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

app.get("/relatorio/pdf", auth, (req, res) => {
  const mes = getMesAtual();
  garantirRelatorio(mes);

  const doc = new PDFDocument({ margin: 45 });

  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  const r = db.relatorios[mes];

  doc.rect(0, 0, 612, 95).fill("#d96213");

  doc.fillColor("white")
    .fontSize(24)
    .text(LOJA_NOME, 45, 28);

  doc.fontSize(11)
    .text(LOJA_ENDERECO, 45, 58);

  doc.fillColor("#111")
    .fontSize(18)
    .text("Relatório Financeiro Mensal", 45, 125);

  doc.fontSize(11)
    .fillColor("#555")
    .text("Mês: " + mes, 45, 150);

  doc.text(
    "Que Deus nos abençoe em cada decisão.",
    45,
    168
  );

  doc.moveTo(45, 195)
    .lineTo(565, 195)
    .stroke("#d96213");

  doc.fillColor("#111")
    .fontSize(14)
    .text("Resumo", 45, 220);

  doc.fontSize(12);

  doc.text(
    "Faturamento: R$ " +
      Number(r.faturamento || 0).toFixed(2),
    60,
    250
  );

  doc.text(
    "Custo: R$ " +
      Number(r.custo || 0).toFixed(2),
    60,
    272
  );

  doc.text(
    "Lucro: R$ " +
      Number(r.lucro || 0).toFixed(2),
    60,
    294
  );

  doc.text(
    "Status do mês: " +
      (r.fechado ? "Fechado" : "Aberto"),
    60,
    316
  );

  doc.end();
});

app.get("/debug", auth, (req, res) => {
  res.json(db);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 Sistema completo rodando");
});