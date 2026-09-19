#!/usr/bin/env bash
# Provisiona a infraestrutura da Traço Óptica na Azure:
#   - Resource Group
#   - Azure Database for PostgreSQL (Flexible Server, tier Burstable B1ms)
#   - App Service (Linux, Node 24) para o backend
#   - (frontend é servido pelo próprio backend, pasta backend/public)
#
# Pré-requisitos: Azure CLI instalado e logado (`az login`).
# Uso:
#   chmod +x infra/azure-deploy.sh
#   ./infra/azure-deploy.sh

set -euo pipefail

# ---------- variáveis — ajuste antes de rodar ----------
LOCATION="canadacentral"
RESOURCE_GROUP="rg-traco-optica"
SUFFIX="$(openssl rand -hex 3)"

APP_SERVICE_PLAN="plan-traco-optica"
WEBAPP_NAME="traco-optica-api-${SUFFIX}"
WEBAPP_SKU="B1"

PG_SERVER_NAME="traco-optica-db-${SUFFIX}"
PG_ADMIN_USER="tracoadmin"
PG_ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)"
PG_DB_NAME="traco_optica"
PG_SKU="Standard_B1ms"

JWT_SECRET="$(openssl rand -hex 32)"

echo "== Traço Óptica — provisionamento Azure =="
echo "Resource Group: $RESOURCE_GROUP"
echo "Região: $LOCATION"
echo "Sufixo único desta execução: $SUFFIX"
echo

# ---------- 1. Resource Group ----------
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
echo "[1/5] Resource group '$RESOURCE_GROUP' pronto."

# ---------- 2. Postgres Flexible Server ----------
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$PG_SERVER_NAME" \
  --location "$LOCATION" \
  --admin-user "$PG_ADMIN_USER" \
  --admin-password "$PG_ADMIN_PASSWORD" \
  --sku-name "$PG_SKU" \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0 \
  --yes \
  --output none
echo "[2/5] Servidor Postgres '$PG_SERVER_NAME' criado."

az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$PG_SERVER_NAME" \
  --name "$PG_DB_NAME" \
  --output none
echo "    Banco '$PG_DB_NAME' criado dentro do servidor."

DATABASE_URL="postgresql://${PG_ADMIN_USER}:${PG_ADMIN_PASSWORD}@${PG_SERVER_NAME}.postgres.database.azure.com:5432/${PG_DB_NAME}?sslmode=require"

# ---------- 3. App Service Plan + Web App (backend) ----------
az appservice plan create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE_PLAN" \
  --location "$LOCATION" \
  --is-linux \
  --sku "$WEBAPP_SKU" \
  --output none
echo "[3/5] App Service Plan '$APP_SERVICE_PLAN' ($WEBAPP_SKU) criado."

az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_SERVICE_PLAN" \
  --name "$WEBAPP_NAME" \
  --runtime "NODE|24-lts" \
  --output none
echo "[4/5] Web App '$WEBAPP_NAME' criado."

# ---------- 4. Configurações do Web App ----------
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --settings \
    DATABASE_URL="$DATABASE_URL" \
    JWT_SECRET="$JWT_SECRET" \
    JWT_EXPIRES_IN="7d" \
    PORT="8080" \
    CORS_ORIGIN="*" \
    PAYMENT_PROVIDER="mock" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
    WEBSITE_NODE_DEFAULT_VERSION="~24" \
  --output none

az webapp config set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --startup-file "npx prisma migrate deploy && node src/index.js" \
  --output none
echo "[5/5] Variáveis de ambiente e startup command configurados."
echo "    O frontend agora é servido pelo próprio backend (pasta backend/public),"
echo "    então o mesmo endereço do Web App abre o site inteiro."

# ---------- resumo ----------
WEBAPP_HOST=$(az webapp show --resource-group "$RESOURCE_GROUP" --name "$WEBAPP_NAME" --query defaultHostName -o tsv)
PUBLISH_PROFILE_FILE="./${WEBAPP_NAME}.PublishSettings"
az webapp deployment list-publishing-profiles \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --xml > "$PUBLISH_PROFILE_FILE"

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP_NAME" \
  --settings CORS_ORIGIN="https://${WEBAPP_HOST}" \
  --output none

cat <<EOF

=================================================================
 Provisionamento concluído
=================================================================

Site (frontend + backend juntos): https://${WEBAPP_HOST}
Banco Postgres:    ${PG_SERVER_NAME}.postgres.database.azure.com

Guarde essas credenciais em um lugar seguro (gerenciador de senhas),
elas não aparecem de novo depois:

  Postgres admin user: ${PG_ADMIN_USER}
  Postgres admin senha: ${PG_ADMIN_PASSWORD}
  JWT_SECRET gerado:    ${JWT_SECRET}

-----------------------------------------------------------------
 Próximo passo: configurar o secret do GitHub Actions
-----------------------------------------------------------------

1. Publish profile do App Service foi salvo em:
     ${PUBLISH_PROFILE_FILE}
   Copie o CONTEÚDO desse arquivo e cole no secret do GitHub:
     Settings → Secrets and variables → Actions → New repository secret
     Nome:  AZURE_WEBAPP_PUBLISH_PROFILE

2. Depois de configurar o secret, dê push na branch main —
   o workflow em .github/workflows/backend-deploy.yml cuida do resto
   (backend e frontend juntos, já que agora são a mesma aplicação).

EOF