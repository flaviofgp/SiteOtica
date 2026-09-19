require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`Traço Óptica API rodando em http://localhost:${PORT}`);
  console.log(`Provedor de pagamento ativo: ${process.env.PAYMENT_PROVIDER || "mock"}`);
});
