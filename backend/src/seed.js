require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("./config/prisma");

// Mesmo catálogo do protótipo em HTML, agora persistido no banco de verdade.
const produtos = [
  { nome: "Modelo Estrela", categoria: "armacao", formato: "round", material: "Acetato", cor: "Âmbar translúcido", genero: "Unissex", preco: 389, rosto: "Redondo", descricao: "Armação redonda em acetato italiano, com ponte alta e hastes flexíveis em mola." },
  { nome: "Modelo Norte", categoria: "armacao", formato: "square", material: "Titânio", cor: "Grafite fosco", genero: "Masculino", preco: 549, rosto: "Oval", descricao: "Estrutura quadrada em titânio ultraleve, ideal para uso o dia inteiro." },
  { nome: "Modelo Olinda", categoria: "armacao", formato: "cat", material: "Acetato", cor: "Verde-oliva", genero: "Feminino", preco: 419, rosto: "Coração", descricao: "Formato gatinho contemporâneo, combina com rostos em coração e ovais." },
  { nome: "Modelo Cais", categoria: "armacao", formato: "rect", material: "Metal", cor: "Dourado escovado", genero: "Unissex", preco: 459, rosto: "Alongado", descricao: "Linhas retangulares finas em metal, inspiradas em armações de arquiteto." },
  { nome: "Modelo Seis", categoria: "armacao", formato: "hex", material: "Acetato", cor: "Preto fosco", genero: "Unissex", preco: 399, rosto: "Redondo", descricao: "Formato hexagonal geométrico, traço marcante." },
  { nome: "Modelo Vento", categoria: "armacao", formato: "aviator", material: "Metal", cor: "Prata", genero: "Masculino", preco: 479, rosto: "Quadrado", descricao: "Aviador clássico revisitado para lentes de grau." },
  { nome: "Solar Maré", categoria: "sol", formato: "round", material: "Acetato", cor: "Tartaruga", genero: "Unissex", preco: 329, rosto: "Quadrado", descricao: "Lente solar redonda com proteção UV400 e antirreflexo." },
  { nome: "Solar Copacabana", categoria: "sol", formato: "aviator", material: "Metal", cor: "Dourado / verde", genero: "Unissex", preco: 359, rosto: "Oval", descricao: "Aviador clássico com lente espelhada verde e proteção UV400." },
  { nome: "Solar Beco", categoria: "sol", formato: "square", material: "Acetato", cor: "Preto brilho", genero: "Masculino", preco: 299, rosto: "Redondo", descricao: "Quadrada robusta com lente polarizada." },
  { nome: "Solar Ipê", categoria: "sol", formato: "cat", material: "Acetato", cor: "Amarelo mostarda", genero: "Feminino", preco: 339, rosto: "Coração", descricao: "Gatinho colorido com lente degradê e proteção UV400." },
  { nome: "Solar Brisa", categoria: "sol", formato: "hex", material: "Metal", cor: "Rosé", genero: "Feminino", preco: 319, rosto: "Alongado", descricao: "Hexagonal delicada em metal rosé, lente com leve tom fumê." },
  { nome: "Solar Cerrado", categoria: "sol", formato: "rect", material: "Acetato", cor: "Marrom fosco", genero: "Unissex", preco: 309, rosto: "Oval", descricao: "Retangular esportiva, lente polarizada marrom." },
];

async function main() {
  console.log("Limpando dados antigos de produtos...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  console.log("Inserindo produtos...");
  await prisma.product.createMany({ data: produtos });

  console.log("Garantindo usuário admin...");
  const senhaHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@tracooptica.com.br" },
    update: {},
    create: { nome: "Admin Traço", email: "admin@tracooptica.com.br", senha: senhaHash, isAdmin: true },
  });

  console.log("Seed concluído.");
  console.log("Login admin: admin@tracooptica.com.br / senha: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
