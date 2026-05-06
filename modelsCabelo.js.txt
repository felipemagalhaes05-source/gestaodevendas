const mongoose = require("mongoose");

const CabeloSchema = new mongoose.Schema({
  tipo: String,
  peso_total: Number,
  gramas_vendidas: Number,
  valor_grama_venda: Number,
  valor_grama_custo: Number,
  faturamento: Number,
  custo: Number,
  lucro: Number,
  itens: [
    {
      codigo: String,
      status: String
    }
  ]
});

module.exports = mongoose.model("Cabelo", CabeloSchema);