const { verifyToken } = require("../utils/jwt");
const prisma = require("../config/prisma");

/**
 * Exige um token JWT válido no header Authorization: Bearer <token>.
 * Em caso de sucesso, popula req.user com { id, email, isAdmin }.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ erro: "Não autenticado. Envie o token no header Authorization." });
  }

  try {
    const payload = verifyToken(token);
    // Busca o usuário atual no banco (garante que ele ainda existe / não foi removido).
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ erro: "Usuário do token não existe mais." });
    }
    req.user = { id: user.id, email: user.email, isAdmin: user.isAdmin };
    next();
  } catch (err) {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}

/** Deve ser usado sempre depois de requireAuth. */
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ erro: "Acesso restrito a administradores." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
