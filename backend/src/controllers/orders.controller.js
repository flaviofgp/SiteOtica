const prisma = require("../config/prisma");
const { getProvider } = require("../services/payment");

function extractRx(rx) {
  if (!rx) return {};
  const od = rx.od || {};
  const oe = rx.oe || {};
  return {
    rxOdEsf: od.esf || null,
    rxOdCil: od.cil || null,
    rxOdEixo: od.eixo || null,
    rxOeEsf: oe.esf || null,
    rxOeCil: oe.cil || null,
    rxOeEixo: oe.eixo || null,
    rxDnp: rx.dnp || null,
  };
}

// POST /api/orders
// body: { items: [{ productId, qty, rx? }], paymentMethod: "pix" | "cartao", enderecoEntrega?, cardData? }
async function create(req, res) {
  const { items, paymentMethod, enderecoEntrega, cardData } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ erro: "O pedido precisa ter pelo menos um item." });
  }
  if (!["pix", "cartao"].includes(paymentMethod)) {
    return res.status(400).json({ erro: "Forma de pagamento inválida." });
  }

  // Busca os produtos reais no banco — nunca confiamos no preço enviado pelo cliente.
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, ativo: true } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    if (!productMap.has(item.productId)) {
      return res.status(400).json({ erro: `Produto ${item.productId} não existe ou não está mais disponível.` });
    }
    if (!Number.isInteger(item.qty) || item.qty < 1) {
      return res.status(400).json({ erro: "Quantidade inválida em um dos itens." });
    }
  }

  const total = items.reduce((sum, i) => sum + productMap.get(i.productId).preco * i.qty, 0);

  // Cria o pedido e seus itens numa transação — ou tudo é salvo, ou nada é.
  const order = await prisma.order.create({
    data: {
      userId: req.user.id,
      total,
      paymentMethod,
      enderecoEntrega: enderecoEntrega || null,
      items: {
        create: items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          precoUnit: productMap.get(i.productId).preco,
          ...extractRx(i.rx),
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  // Aciona o provedor de pagamento (mock por padrão, Mercado Pago se configurado).
  const provider = getProvider();
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  let paymentInfo;
  try {
    paymentInfo =
      paymentMethod === "pix"
        ? await provider.createPixCharge(order, user)
        : await provider.chargeCard(order, cardData, user);
  } catch (err) {
    // Pedido já existe no banco; marcamos como falho em vez de perder o registro.
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "recusado" } });
    throw err;
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: paymentInfo.status, paymentRef: paymentInfo.paymentRef },
    include: { items: { include: { product: true } } },
  });

  res.status(201).json({ pedido: updated, pagamento: paymentInfo });
}

// GET /api/orders/me
async function listMine(req, res) {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ pedidos: orders });
}

// GET /api/orders — admin, todos os pedidos
async function listAll(req, res) {
  const orders = await prisma.order.findMany({
    include: { items: { include: { product: true } }, user: { select: { nome: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ pedidos: orders });
}

// PATCH /api/orders/:id/status — admin, avança o status do pedido (ex: "enviado")
async function updateStatus(req, res) {
  const { status } = req.body;
  const validos = ["em_preparacao", "enviado", "entregue", "cancelado"];
  if (!validos.includes(status)) {
    return res.status(400).json({ erro: "Status inválido. Use um de: " + validos.join(", ") });
  }
  const order = await prisma.order.update({ where: { id: req.params.id }, data: { status } });
  res.json({ pedido: order });
}

// POST /api/orders/:id/confirm-pix — endpoint de demonstração.
// Em produção real isso seria substituído por um webhook do Mercado Pago
// (notificação assíncrona confirmando o pagamento), não por uma chamada do front.
async function confirmPixMock(req, res) {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ erro: "Pedido não encontrado." });
  if (order.userId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ erro: "Sem permissão para este pedido." });
  }
  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { paymentStatus: "aprovado" },
  });
  res.json({ pedido: updated });
}

module.exports = { create, listMine, listAll, updateStatus, confirmPixMock };
