// Captura qualquer erro não tratado nas rotas (inclusive de async, via express-async wrapper)
// e devolve uma resposta JSON consistente, sem vazar detalhes internos em produção.
function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  const isDev = process.env.NODE_ENV !== "production";

  res.status(status).json({
    erro: err.publicMessage || "Erro interno do servidor.",
    ...(isDev && { detalhe: err.message }),
  });
}

/** Envolve uma rota async para que erros caiam automaticamente no errorHandler. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
