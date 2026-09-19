const crypto = require("crypto");

// Provedor de pagamento simulado. Usado por padrão (PAYMENT_PROVIDER=mock no .env)
// para que o sistema funcione de ponta a ponta sem precisar de credenciais reais.
// Nenhuma cobrança de verdade é feita aqui.

async function createPixCharge(order) {
  const fakeCode =
    "00020126580014BR.GOV.BCB.PIX0136traco-optica-mock" +
    crypto.randomBytes(6).toString("hex") +
    "5204000053039865406" +
    order.total.toFixed(2).replace(".", "") +
    "5802BR5913Traco Optica6009Sao Paulo62070503***6304MOCK";

  return {
    provider: "mock",
    status: "pendente", // no mock, o front pode simular a confirmação chamando /confirm
    paymentRef: "mock_pix_" + crypto.randomUUID(),
    pixCopiaECola: fakeCode,
    // Em produção real (Mercado Pago), aqui viria também um qr_code_base64 (imagem).
  };
}

async function chargeCard(order, cardData) {
  // Simulação: cartões terminados em "0000" são recusados, o resto é aprovado.
  // Isso permite testar os dois fluxos no front sem integração real.
  const numero = (cardData && cardData.numero) || "";
  const aprovado = !numero.replace(/\s/g, "").endsWith("0000");

  return {
    provider: "mock",
    status: aprovado ? "aprovado" : "recusado",
    paymentRef: "mock_card_" + crypto.randomUUID(),
  };
}

module.exports = { createPixCharge, chargeCard };
