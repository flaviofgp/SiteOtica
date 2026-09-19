const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { signToken } = require("../utils/jwt");
const { isEmail, isNonEmptyString } = require("../utils/validators");

function toPublicUser(user) {
  return { id: user.id, nome: user.nome, email: user.email, telefone: user.telefone, isAdmin: user.isAdmin };
}

async function signup(req, res) {
  const { nome, email, telefone, senha } = req.body;

  if (!isNonEmptyString(nome) || !isEmail(email) || !isNonEmptyString(senha)) {
    return res.status(400).json({ erro: "Preencha nome, e-mail e senha corretamente." });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: "A senha precisa ter pelo menos 6 caracteres." });
  }

  const existente = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existente) {
    return res.status(409).json({ erro: "Já existe uma conta com esse e-mail." });
  }

  const hash = await bcrypt.hash(senha, 10);
  const user = await prisma.user.create({
    data: { nome: nome.trim(), email: email.toLowerCase().trim(), telefone: telefone || null, senha: hash },
  });

  const token = signToken({ sub: user.id });
  res.status(201).json({ usuario: toPublicUser(user), token });
}

async function login(req, res) {
  const { email, senha } = req.body;
  if (!isEmail(email) || !isNonEmptyString(senha)) {
    return res.status(400).json({ erro: "Informe e-mail e senha." });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    return res.status(401).json({ erro: "E-mail ou senha incorretos." });
  }

  const confere = await bcrypt.compare(senha, user.senha);
  if (!confere) {
    return res.status(401).json({ erro: "E-mail ou senha incorretos." });
  }

  const token = signToken({ sub: user.id });
  res.json({ usuario: toPublicUser(user), token });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json({ usuario: toPublicUser(user) });
}

module.exports = { signup, login, me };
