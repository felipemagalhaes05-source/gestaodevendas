const mongoose = require("mongoose");

const VendaSchema = new mongoose.Schema({
  tipo: String,
  item: String,
  quantidade: Number,
  lucro: Number,
  data: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Venda", VendaSchema);