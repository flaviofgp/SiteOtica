# Traço Óptica — Backend (API)

API em Node.js + Express + Prisma para o sistema da ótica: catálogo, autenticação,
carrinho/pedidos com receita óptica (grau) e pagamento (Pix/cartão).

Por padrão usa **SQLite**, então roda local sem instalar nenhum banco de dados.
Para produção, é uma troca de uma linha para Postgres (veja abaixo).

## 1. Instalar e rodar

```bash
cd backend
npm install
cp .env.example .env        # ajuste JWT_SECRET pelo menos
npx prisma migrate dev --name init   # cria o banco SQLite e as tabelas
npm run seed                 # popula os 12 produtos e cria o usuário admin
npm run dev                   # inicia em http://localhost:3333
```

Login do admin criado pelo seed: `admin@tracooptica.com.br` / `admin123`
(troque a senha depois de testar — ela fica hasheada com bcrypt no banco).

## 2. Estrutura

```
backend/
  prisma/schema.prisma      modelos: User, Product, Order, OrderItem
  src/
    index.js                sobe o servidor
    app.js                  monta o Express e as rotas
    config/prisma.js        cliente do banco
    middleware/auth.js       requireAuth / requireAdmin (JWT)
    routes/                 definição das rotas
    controllers/            lógica de cada rota
    services/payment/       mock (padrão) e Mercado Pago (real, opcional)
    seed.js                 popula produtos + usuário admin
```

## 3. Autenticação

JWT simples. Depois de login/signup você recebe um `token` — envie em
todas as rotas protegidas como:

```
Authorization: Bearer <token>
```

Não existe um "modo admin" separado por senha fixa (como no protótipo em HTML):
aqui o admin é um `User` normal com `isAdmin: true` no banco. O usuário criado
pelo `seed` já vem como admin.

## 4. Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Cria conta `{ nome, email, telefone?, senha }` |
| POST | `/api/auth/login` | — | Login `{ email, senha }` → `{ usuario, token }` |
| GET | `/api/auth/me` | cliente | Dados do usuário logado |
| GET | `/api/products` | — | Catálogo. Query: `?categoria=armacao\|sol&formato=&genero=&busca=` |
| GET | `/api/products/:id` | — | Detalhe de um produto |
| POST | `/api/products` | admin | Cria produto |
| PUT | `/api/products/:id` | admin | Edita produto |
| DELETE | `/api/products/:id` | admin | Remove produto (soft delete) |
| POST | `/api/orders` | cliente | Cria pedido + dispara pagamento (ver abaixo) |
| GET | `/api/orders/me` | cliente | Meus pedidos |
| POST | `/api/orders/:id/confirm-pix` | cliente/admin | Simula confirmação de um Pix pendente (só provider mock) |
| GET | `/api/orders` | admin | Todos os pedidos |
| PATCH | `/api/orders/:id/status` | admin | Atualiza status (`em_preparacao`, `enviado`, `entregue`, `cancelado`) |

### Criando um pedido

```
POST /api/orders
Authorization: Bearer <token>

{
  "paymentMethod": "pix",           // ou "cartao"
  "enderecoEntrega": "Rua X, 123",
  "items": [
    {
      "productId": "uuid-do-produto",
      "qty": 1,
      "rx": {                        // opcional, só para armações
        "od": { "esf": "-2.00", "cil": "-0.50", "eixo": "90" },
        "oe": { "esf": "-1.75", "cil": "-0.25", "eixo": "85" },
        "dnp": "62"
      }
    }
  ]
}
```

O preço é sempre recalculado no servidor a partir do banco — o valor que o
front manda para exibição nunca é usado para cobrar.

Resposta inclui `pedido` (salvo no banco) e `pagamento` (o que o provedor
retornou: código Pix copia-e-cola, status, etc). Com `paymentMethod: "cartao"`
e o provedor Mercado Pago ativo, o front precisa enviar `cardData.token`
gerado pelo SDK de frontend do Mercado Pago — **nunca** o número do cartão cru.

## 5. Pagamento: trocando de mock para Mercado Pago de verdade

No `.env`:

```
PAYMENT_PROVIDER=mercadopago
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_de_producao_ou_teste
```

O restante do código (controllers, rotas) não muda — a escolha do provedor é
feita em `src/services/payment/index.js`. Antes de ir para produção:

- Implemente o **webhook** de notificação do Mercado Pago para atualizar
  `paymentStatus` de forma assíncrona (hoje o `confirm-pix` é só um atalho de
  demonstração para o provedor mock).
- No front, gere o `card token` com o MercadoPago.js antes de chamar
  `POST /api/orders` — não envie número de cartão para o seu backend.
- Confira os campos exigidos (CPF do pagador, etc.) na documentação atual do
  Mercado Pago, já que APIs de pagamento mudam com frequência.

## 6. Trocando SQLite por Postgres

Em `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

E no `.env`:

```
DATABASE_URL="postgresql://usuario:senha@host:5432/traco_optica"
```

Depois rode `npx prisma migrate dev` de novo para recriar as migrações no
Postgres.

## 7. Ligando com o front

O protótipo em HTML que fizemos antes usa `localStorage` e dados mockados —
ele ainda não fala com essa API. Os próximos passos naturais são:
1. Trocar as funções de leitura/gravação do front (que hoje leem `state.products`,
   `state.cart` etc. do localStorage) por chamadas `fetch()` para estes endpoints.
2. Guardar o `token` retornado no login/signup e usá-lo nas chamadas autenticadas.
3. Se for seguir com React de verdade (como planejado), isso vira um client
   HTTP (`fetch`/`axios`) + hooks (`useEffect`/`useState` ou React Query) em vez de
   manipulação direta do DOM.
