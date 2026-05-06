const mongoose = require("mongoose");

const ProdutoSchema = new mongoose.Schema({
  nome: String,
  quantidade: Number,
  vendidos: Number,
  valor_unitario_venda: Number,
  valor_unitario_custo: Number,
  faturamento: Number,
  custo: Number,
  lucro: Number
});

module.exports = mongoose.model("Produto", ProdutoSchema);