const crypto = require("crypto");

// Integração real com o Mercado Pago (Checkout Transparente / API de Pagamentos).
// Só é usada quando PAYMENT_PROVIDER=mercadopago no .env.
//
// Documentação de referência:
//   https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix
//
// IMPORTANTE sobre cartão: por segurança e PCI compliance, o número do cartão
// NUNCA deve passar pelo seu backend. O Mercado Pago.js (SDK de frontend) transforma
// os dados do cartão em um "card token" no navegador do cliente; o backend só recebe
// esse token e usa aqui. Ajuste o front (checkout) para gerar esse token antes de
// chamar POST /api/orders com paymentMethod = "cartao".

const MP_BASE = "https://api.mercadopago.com/v1/payments";

function getAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    const err = new Error("MERCADOPAGO_ACCESS_TOKEN não configurado no .env");
    err.publicMessage = "Pagamento indisponível: configuração pendente.";
    err.status = 500;
    throw err;
  }
  return token;
}

async function mpFetch(body) {
  const res = await fetch(MP_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
      // Evita cobrança duplicada em caso de retry de rede.
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error("Falha no Mercado Pago: " + JSON.stringify(data));
    err.publicMessage = "Não foi possível processar o pagamento.";
    err.status = 502;
    throw err;
  }
  return data;
}

async function createPixCharge(order, payer) {
  const data = await mpFetch({
    transaction_amount: Number(order.total.toFixed(2)),
    description: `Pedido ${order.id} — Traço Óptica`,
    payment_method_id: "pix",
    payer: {
      email: payer.email,
      first_name: payer.nome ? payer.nome.split(" ")[0] : "Cliente",
      last_name: payer.nome ? payer.nome.split(" ").slice(1).join(" ") || "Traco" : "Traco",
    },
  });

  const txData = data.point_of_interaction && data.point_of_interaction.transaction_data;
  return {
    provider: "mercadopago",
    status: data.status === "approved" ? "aprovado" : "pendente",
    paymentRef: String(data.id),
    pixCopiaECola: txData ? txData.qr_code : null,
    qrCodeBase64: txData ? txData.qr_code_base64 : null,
  };
}

/**
 * cardData deve conter { token, installments, paymentMethodId, identificationType, identificationNumber }
 * onde `token` é o card token gerado no FRONTEND pelo MercadoPago.js — nunca o número do cartão puro.
 */
async function chargeCard(order, cardData, payer) {
  if (!cardData || !cardData.token) {
    const err = new Error("Token do cartão ausente");
    err.publicMessage = "Dados do cartão inválidos. Gere o token no checkout antes de enviar.";
    err.status = 400;
    throw err;
  }

  const data = await mpFetch({
    transaction_amount: Number(order.total.toFixed(2)),
    token: cardData.token,
    description: `Pedido ${order.id} — Traço Óptica`,
    installments: cardData.installments || 1,
    payment_method_id: cardData.paymentMethodId,
    payer: {
      email: payer.email,
      identification: {
        type: cardData.identificationType,
        number: cardData.identificationNumber,
      },
    },
  });

  return {
    provider: "mercadopago",
    status: data.status === "approved" ? "aprovado" : data.status === "rejected" ? "recusado" : "pendente",
    paymentRef: String(data.id),
  };
}

module.exports = { createPixCharge, chargeCard };
