# Infraestrutura — Traço Óptica na Azure

Este diretório provisiona tudo que o site precisa na Azure:

- **Azure Database for PostgreSQL** (Flexible Server) — banco de produção
- **Azure App Service** (Linux, Node 20) — roda o backend Express
- **Azure Static Web Apps** (Free) — hospeda o frontend

## Passo a passo

### 1. Pré-requisitos

- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) instalado
- `az login` feito (e `az account set --subscription "<sua-subscription>"` se tiver mais de uma)
- Repositório já no GitHub (você já tem ✅)

### 2. Provisionar os recursos

```bash
chmod +x infra/azure-deploy.sh
./infra/azure-deploy.sh
```

Isso leva alguns minutos (o Postgres Flexible Server é o que mais demora).
No final, o script imprime:
- as URLs do backend e do frontend
- a senha do Postgres e o `JWT_SECRET` gerados (guarde num gerenciador de senhas)
- o **publish profile** do App Service (salvo em `./<nome-do-webapp>.PublishSettings`)
- o **token de deploy** do Static Web App

### 3. Configurar os secrets no GitHub

No repositório: `Settings → Secrets and variables → Actions → New repository secret`

| Secret | Valor |
|---|---|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | conteúdo do arquivo `.PublishSettings` gerado no passo 2 |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | token impresso no final do script |

### 4. Ajustar o nome do Web App no workflow

Abra `.github/workflows/backend-deploy.yml` e troque:

```yaml
env:
  AZURE_WEBAPP_NAME: SUBSTITUA-PELO-NOME-DO-WEBAPP
```

pelo nome real que o script imprimiu (algo como `traco-optica-api-a1b2c3`).

### 5. Deploy

```bash
git add .
git commit -m "infra: configura deploy na Azure"
git push origin main
```

Os dois workflows (`backend-deploy.yml` e `frontend-deploy.yml`) disparam
automaticamente e cuidam do resto — inclusive das migrações do Prisma, que
rodam sozinhas a cada start do backend (configurado no *startup command* do
App Service pelo script).

### 6. Depois que estiver no ar

- Rode o **seed** uma vez para popular os produtos e o usuário admin. O jeito
  mais simples é abrir o **SSH do App Service** (aba "SSH" no portal Azure,
  dentro do recurso do Web App) e rodar:
  ```bash
  npm run seed
  ```
- Trave o CORS no domínio real do frontend (o script deixa `*` como valor
  inicial só para não travar o primeiro deploy):
  ```bash
  az webapp config appsettings set --resource-group rg-traco-optica \
    --name <nome-do-webapp> --settings CORS_ORIGIN="https://<seu-site>.azurestaticapps.net"
  ```
- Configure um **domínio customizado** (opcional) tanto no App Service quanto
  no Static Web App — os dois emitem certificado SSL grátis automaticamente.

## Rodando localmente com o mesmo banco de produção (Postgres)

Na raiz do projeto:

```bash
docker compose up -d          # sobe Postgres local na porta 5432
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run seed
npm run dev
```

## Quando o frontend virar React de verdade

Hoje o `frontend/` é o protótipo em HTML puro (sem build). Quando ele virar
um app React (Vite ou CRA), só precisa:

1. Trocar o conteúdo de `frontend/` pelo projeto React.
2. No `frontend-deploy.yml`, mudar `output_location` de `""` para `"dist"`
   (Vite) ou `"build"` (Create React App).
3. Conferir se `app_location` continua apontando pra pasta certa.

O Static Web Apps builda automaticamente (`npm install && npm run build`)
antes de publicar, contanto que exista um `package.json` dentro de `app_location`.

## Custos aproximados (nível de entrada, região West Europe)

| Recurso | SKU usado pelo script | Custo aproximado |
|---|---|---|
| App Service | B1 | ~US$13/mês |
| Postgres Flexible Server | Burstable B1ms | ~US$12-15/mês |
| Static Web Apps | Free | US$0 |

Para ambiente de teste/demo, dá pra trocar `WEBAPP_SKU` no script para `F1`
(App Service free tier) — tem limitações de CPU/tempo de execução, mas custa
zero. O Postgres não tem tier gratuito.
