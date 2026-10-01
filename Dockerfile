# Estagio 1: Build da aplicacao
FROM node:22-alpine AS builder

WORKDIR /app

# Copia manifestos de dependencias
COPY package*.json tsconfig*.json nest-cli.json ./

# Instala todas as dependencias para compilacao estrita
RUN npm ci

# Copia codigo-fonte
COPY src/ ./src/

# Executa build de producao
RUN npm run build

# Remove dependencias de desenvolvimento para manter apenas producao
RUN npm prune --production

# Estagio 2: Imagem final de execucao minima e endurecida
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Adiciona usuario nao privilegiado e prepara diretorio
RUN chown -R node:node /app

# Copia apenas os artefatos compilados e dependencias de producao
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/src/database/radios.json ./dist/database/radios.json

# Executa sob usuario sem privilegios de root
USER node

# Exponha a porta da aplicacao
EXPOSE 3000

# Verificacao de integridade (Healthcheck) nativo
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Inicializacao direta do processo
CMD ["node", "dist/src/main.js"]
