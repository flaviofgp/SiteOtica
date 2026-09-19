const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(v) {
  return typeof v === "string" && EMAIL_RE.test(v);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isPositiveNumber(v) {
  const n = Number(v);
  return !Number.isNaN(n) && n > 0;
}

const CATEGORIAS_VALIDAS = ["armacao", "sol"];
const FORMATOS_VALIDOS = ["round", "square", "cat", "aviator", "rect", "hex"];
const GENEROS_VALIDOS = ["Unissex", "Feminino", "Masculino"];

module.exports = {
  isEmail,
  isNonEmptyString,
  isPositiveNumber,
  CATEGORIAS_VALIDAS,
  FORMATOS_VALIDOS,
  GENEROS_VALIDOS,
};
