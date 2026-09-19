const mockProvider = require("./mockProvider");
const mercadoPagoProvider = require("./mercadoPagoProvider");

// Troca de provedor inteira via variável de ambiente — o resto do código
// (controllers/rotas) nunca sabe qual provedor está por trás.
function getProvider() {
  const name = process.env.PAYMENT_PROVIDER || "mock";
  if (name === "mercadopago") return mercadoPagoProvider;
  return mockProvider;
}

module.exports = { getProvider };
