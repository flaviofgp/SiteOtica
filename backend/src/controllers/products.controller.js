const prisma = require("../config/prisma");
const {
  isNonEmptyString,
  isPositiveNumber,
  CATEGORIAS_VALIDAS,
  FORMATOS_VALIDOS,
  GENEROS_VALIDOS,
} = require("../utils/validators");

// GET /api/products — catálogo público, com filtros por query string.
async function list(req, res) {
  const { categoria, formato, genero, busca } = req.query;

  const where = { ativo: true };
  if (categoria && CATEGORIAS_VALIDAS.includes(categoria)) where.categoria = categoria;
  if (formato && FORMATOS_VALIDOS.includes(formato)) where.formato = formato;
  if (genero && GENEROS_VALIDOS.includes(genero)) where.genero = genero;
  if (busca) {
    where.OR = [
      { nome: { contains: String(busca) } },
      { cor: { contains: String(busca) } },
    ];
  }

  const products = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json({ produtos: products });
}

// GET /api/products/:id
async function getById(req, res) {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product || !product.ativo) {
    return res.status(404).json({ erro: "Produto não encontrado." });
  }
  res.json({ produto: product });
}

function validateProductBody(body) {
  const erros = [];
  if (!isNonEmptyString(body.nome)) erros.push("nome");
  if (!CATEGORIAS_VALIDAS.includes(body.categoria)) erros.push("categoria");
  if (!FORMATOS_VALIDOS.includes(body.formato)) erros.push("formato");
  if (!isNonEmptyString(body.material)) erros.push("material");
  if (!isNonEmptyString(body.cor)) erros.push("cor");
  if (!GENEROS_VALIDOS.includes(body.genero)) erros.push("genero");
  if (!isPositiveNumber(body.preco)) erros.push("preco");
  if (!isNonEmptyString(body.rosto)) erros.push("rosto");
  return erros;
}

// POST /api/products — admin
async function create(req, res) {
  const erros = validateProductBody(req.body);
  if (erros.length) {
    return res.status(400).json({ erro: "Campos inválidos ou ausentes: " + erros.join(", ") });
  }

  const { nome, categoria, formato, material, cor, genero, preco, rosto, descricao } = req.body;
  const product = await prisma.product.create({
    data: { nome, categoria, formato, material, cor, genero, preco: Number(preco), rosto, descricao: descricao || "" },
  });
  res.status(201).json({ produto: product });
}

// PUT /api/products/:id — admin
async function update(req, res) {
  const existente = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existente) return res.status(404).json({ erro: "Produto não encontrado." });

  const erros = validateProductBody({ ...existente, ...req.body });
  if (erros.length) {
    return res.status(400).json({ erro: "Campos inválidos: " + erros.join(", ") });
  }

  const { nome, categoria, formato, material, cor, genero, preco, rosto, descricao } = req.body;
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { nome, categoria, formato, material, cor, genero, preco: Number(preco), rosto, descricao },
  });
  res.json({ produto: product });
}

// DELETE /api/products/:id — admin (soft delete, preserva histórico de pedidos)
async function remove(req, res) {
  const existente = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existente) return res.status(404).json({ erro: "Produto não encontrado." });

  await prisma.product.update({ where: { id: req.params.id }, data: { ativo: false } });
  res.status(204).send();
}

module.exports = { list, getById, create, update, remove };
