# RadiosWave API

API REST de alta performance desenvolvida em NestJS 11 e TypeScript para catalogo e streaming de estacoes de radio brasileiras, construida com arquitetura de Defesa em Profundidade (AppSec).

---

## Principais Recursos de Seguranca e Arquitetura

- Catalogo em Memoria Imutavel: 211 estacoes validadas no arranque e protegidas com Object.freeze, eliminando bloqueio de event loop e vetores de DoS.
- Autenticacao Robusta e Rotacao de Chaves:
  - Suporte a multi-chaves nomeadas via API_KEYS_JSON com janelas de transicao e expiracao.
  - Armazenamento em memoria como hash SHA-256 com comparacao em tempo constante (crypto.timingSafeEqual) contra ataques de temporizacao.
  - Suporte aos cabecalhos HTTP X-API-Key e Authorization: Bearer <chave>.
  - Query string (?API_KEY=) desabilitada por padrao em producao via ALLOW_QUERY_API_KEY=false.
  - Protecao ativa contra forca bruta: bloqueia o IP por 5 minutos apos 10 falhas consecutivas com HTTP 429 e cabecalho Retry-After.
  - Inicializacao estrita (fail-fast): a aplicacao falha ao iniciar em producao se nenhuma chave valida de no minimo 32 caracteres estiver definida.
- Protecao de Cabecalhos e CORS:
  - Politica de Seguranca de Conteudo (CSP) restritiva para a API JSON (default-src 'none'; frame-ancestors 'none').
  - CSP controlada com Subresource Integrity (SRI) para a documentacao Swagger.
  - Cabecalhos HTTP endurecidos: Referrer-Policy: no-referrer, X-Content-Type-Options: nosniff, Permissions-Policy, HSTS e X-Frame-Options: DENY.
  - CORS restrito com allowlist sem curinga em producao.
- Rate Limiting Granular:
  - Limites diferenciados por rota (consultas pesadas de catalogo possuem limite mais severo que consultas pontuais por ID).
  - Configuracao explicita de trust proxy ('1' para Vercel / Cloud Run) para prevencao de IP spoofing via X-Forwarded-For.
- Validacao e Sanitizacao Estrita:
  - Pipes dedicados para todos os parametros de rota (:id, :state, :tag, :page) com normalizacao Unicode NFC e rejeicao de caracteres de controle.
  - Protecao contra HTTP Parameter Pollution (HPP) rejeitando arrays ou objetos aninhados em queries.
  - ForbidNonWhitelisted ativo no ValidationPipe rejeitando propriedades estranhas.
- Prevencao contra SSRF e Validacao de Midia:
  - Validacao de URLs de streams e logos bloqueando alvos internos, loopback e metadados de nuvem.
  - Bloqueio de streams sem criptografia HTTP em producao, salvo com permissao explicita.
- Observabilidade e Prevencao de Vazamentos:
  - Logging estruturado em JSON com Pino, geracao/propagacao de X-Request-Id.
  - Redacao automatica de chaves e segredos em logs, queries e caminhos.
  - Respostas de erro 500 genericas em producao vinculadas por correlationId.

---

## Variaveis de Ambiente

Consulte o arquivo `.env.example` para obter o modelo com valores padrao de producao.

| Variavel | Tipo | Padrao | Descricao |
|---|---|---|---|
| `NODE_ENV` | String | `development` | Ambiente de execucao (`production`, `development`, `test`). |
| `PORT` | Numero | `3000` | Porta TCP do servidor HTTP. |
| `API_KEY` | String | *(nenhum)* | Chave primaria (minimo 32 caracteres de alta entropia em producao). |
| `API_KEYS_JSON` | String (JSON) | *(nenhum)* | Multi-chaves com id, nome, chave e expiracao. |
| `ALLOW_QUERY_API_KEY` | Booleano | `false` | Permite passagem de chave via query string (?API_KEY=). |
| `CORS_ORIGIN` | String | `*` em dev | Allowlist de origens permitidas (ex: `https://meuapp.com`). |
| `THROTTLE_TTL` | Numero | `60000` | Janela de rate limit geral em milissegundos (60s). |
| `THROTTLE_LIMIT` | Numero | `120` | Maximo de requisicoes permitidas na janela geral. |
| `AUTH_FAIL_LIMIT` | Numero | `10` | Falhas de autenticacao permitidas antes de bloquear o IP. |
| `AUTH_FAIL_TTL_SEC` | Numero | `300` | Duracao do bloqueio por forca bruta em segundos (5 min). |
| `SWAGGER_ENABLED` | Booleano | `false` em prod | Habilita a documentacao Swagger. |
| `SWAGGER_USER` | String | *(nenhum)* | Usuario para protecao do Swagger via Basic Auth. |
| `SWAGGER_PASSWORD` | String | *(nenhum)* | Senha para protecao do Swagger via Basic Auth. |
| `TRUST_PROXY` | String/Numero | `1` | Quantidade de saltos de proxy reverso confiaveis. |
| `REQUEST_TIMEOUT_MS` | Numero | `15000` | Tempo limite maximo para requisicoes (15s). |
| `ALLOW_INSECURE_HTTP_STREAMS` | Booleano | `false` em prod | Permite estacoes com stream HTTP inseguro. |
| `RADIOS_DB_PATH` | String | *(automatico)* | Caminho do catalogo radios.json (restrito ao projeto). |

---

## Instalacao e Execucao

### 1. Instalacao de Dependencias
```bash
npm ci
```

### 2. Modo Desenvolvimento
```bash
npm run start:dev
```

### 3. Compilacao e Execucao em Producao
```bash
npm run build
npm run start:prod
```

### 4. Execucao de Testes e Auditoria
```bash
# Testes unitarios
npm test

# Testes de integracao e seguranca (e2e)
npm run test:e2e

# Verificacao estatica de codigo (Lint)
npm run lint

# Auditoria de seguranca de dependencias
npm audit --audit-level=high
```

---

## Resumo dos Endpoints

| Metodo | Rota | Autenticacao | Descricao |
|---|---|---|---|
| `GET` | `/` ou `/docs` | Publica / Basic Auth | Interface interativa Swagger UI (se habilitada) |
| `GET` | `/api/health` | Publica | Verificacao minimalista de status ({ status: 'ok' }) |
| `GET` | `/api/health/detailed` | Obrigatoria | Diagnostico protegido com metricas do sistema |
| `GET` | `/api/info` | Obrigatoria | Metadados gerais da API |
| `GET` | `/api/radios` | Obrigatoria | Listagem com paginacao, filtros e ordenacao |
| `GET` | `/api/radios/page/:page` | Obrigatoria | Acesso direto a pagina via rota (ex: `/api/radios/page/2`) |
| `GET` | `/api/radios/page_:page` | Obrigatoria | Alias direto para pagina (ex: `/api/radios/page_2`) |
| `GET` | `/api/radios/per_page_:page` | Obrigatoria | Alias direto para pagina (ex: `/api/radios/per_page_2`) |
| `GET` | `/api/radios/:id` | Obrigatoria | Busca por ID de 14 digitos sem 0 e sem repeticao |
| `GET` | `/api/radios/meta` | Obrigatoria | Metadados de estados, tags e totalizador |
| `GET` | `/api/radios/states` | Obrigatoria | Lista de estados disponiveis |
| `GET` | `/api/radios/tags` | Obrigatoria | Lista de categorias e tags |
| `GET` | `/api/radios/by-state/:state` | Obrigatoria | Radios do estado (paginado com teto de até 10000) |
| `GET` | `/api/radios/by-tag/:tag` | Obrigatoria | Radios da tag (paginado com teto de até 10000) |

---

## Como Acessar as Demais Páginas (Guia Completo de Paginação)

Por padrão, o endpoint `/api/radios` retorna **50 estações por página** (`page=1`, `limit=50`). Como o catálogo conta com **211 rádios**, o resultado é distribuído em **5 páginas**:
- **Página 1:** Rádios 1 a 50
- **Página 2:** Rádios 51 a 100
- **Página 3:** Rádios 101 a 150
- **Página 4:** Rádios 151 a 200
- **Página 5:** Rádios 201 a 211

Você pode navegar pelas páginas de **três maneiras flexíveis**:

### Opção 1: Via Parâmetro de Query String (`?page=`)
A forma padrão e mais versátil, aceitando controle de página e quantidade por página:
```bash
# Acessar a página 2 (estações 51 a 100) com 50 itens:
GET /api/radios?page=2

# Acessar a página 3 customizando a quantidade para 25 rádios:
GET /api/radios?page=3&limit=25
# (Também aceita o alias per_page):
GET /api/radios?page=3&per_page=25

# Obter todas as rádios do catálogo em uma única requisição (limite suporta até 10000 rádios):
GET /api/radios?limit=10000
```

### Opção 2: Diretamente no Caminho da URL (`/page/2`, `/page_2`, `/per_page_2`)
A API disponibiliza rotas amigáveis diretamente no path da URL:
```bash
# Sintaxe padrão no caminho:
GET /api/radios/page/2

# Sintaxe com underline (page_N):
GET /api/radios/page_2

# Sintaxe com per_page_N:
GET /api/radios/per_page_2
```
*Todas as variações acima retornam a página 2 do catálogo.*

### Opção 3: Paginação em Filtros Específicos
Nos filtros por estado e por tag, a paginação também está disponível:
```bash
# Página 2 de rádios do estado de São Paulo:
GET /api/radios/by-state/SP?page=2&limit=50

# Página 2 de rádios com a tag rock:
GET /api/radios/by-tag/rock?page=2&limit=50
```

---

## Estrutura de URLs com a API Key (Autenticação)

A autenticação é obrigatória em todas as rotas da API. Você pode fornecer a sua credencial de três formas:

### 1. Recomendado: Via Cabeçalho HTTP `X-API-Key` (Máxima Segurança)
Não expõe a chave em URLs, histórico do navegador nem em logs de servidores proxy intermediários.
```bash
curl -X GET "https://seu-dominio.com/api/radios?page=2&limit=50" \
  -H "X-API-Key: SUA_CHAVE_DE_API"
```
Ou com as rotas diretas no path:
```bash
curl -X GET "https://seu-dominio.com/api/radios/per_page_2" \
  -H "X-API-Key: SUA_CHAVE_DE_API"

curl -X GET "https://seu-dominio.com/api/radios/page/2" \
  -H "X-API-Key: SUA_CHAVE_DE_API"
```

### 2. Alternativa Segura: Via Cabeçalho HTTP `Authorization: Bearer`
Compatível com clientes HTTP e bibliotecas padrão OAuth/Bearer:
```bash
curl -X GET "https://seu-dominio.com/api/radios?page=2&limit=50" \
  -H "Authorization: Bearer SUA_CHAVE_DE_API"
```

### 3. Via Query String na Própria URL (`?API_KEY=` ou `?api_key=`)
> ⚠️ **Aviso de Segurança:** Por padrão em produção, a passagem da chave via query string é desativada por razões de segurança (evitar que a chave fique registrada em logs de acesso e histórico do navegador). Para permitir o uso via query string em ambientes autorizados, configure a variável de ambiente `ALLOW_QUERY_API_KEY=true`.

Exemplos práticos de URLs completas com a chave incorporada:

- **Página 2 via Query Param:**
  ```text
  https://seu-dominio.com/api/radios?page=2&API_KEY=SUA_CHAVE_DE_API
  ```

- **Página 2 especificando limite:**
  ```text
  https://seu-dominio.com/api/radios?page=2&limit=50&API_KEY=SUA_CHAVE_DE_API
  ```

- **Página 2 via `/per_page_2`:**
  ```text
  https://seu-dominio.com/api/radios/per_page_2?API_KEY=SUA_CHAVE_DE_API
  ```

- **Página 2 via `/page/2`:**
  ```text
  https://seu-dominio.com/api/radios/page/2?API_KEY=SUA_CHAVE_DE_API
  ```

- **Página 2 via `/page_2`:**
  ```text
  https://seu-dominio.com/api/radios/page_2?API_KEY=SUA_CHAVE_DE_API
  ```

- **Exemplo em cURL com Query String:**
  ```bash
  curl "https://seu-dominio.com/api/radios/per_page_2?API_KEY=SUA_CHAVE_DE_API"
  ```

### Formato do Objeto de Resposta Paginada
Todas as respostas paginadas entregam o seguinte formato padronizado:
```json
{
  "data": [
    {
      "id": 49639317164246,
      "name": "Rádio Exemplo FM",
      "state": "SP",
      "city": "São Paulo",
      "streamUrl": "https://stream.exemplo.com/live",
      "logo": "https://exemplo.com/logo.png",
      "tags": ["popular", "notícias"]
    }
  ],
  "total": 211,
  "page": 2,
  "limit": 50,
  "totalPages": 5
}
```
Campos retornados:
- `data`: Array contendo a lista de rádios da página atual.
- `total`: Quantidade total de registros no catálogo (211 rádios).
- `page`: Número da página atual solicitada.
- `limit`: Quantidade de registros por página exibidos.
- `totalPages`: Quantidade total de páginas disponíveis para navegação.

---

## Autenticacao e Exemplos de Requisicao

### 1. Via Cabecalho HTTP X-API-Key (Recomendado)
```bash
curl -H "X-API-Key: SUA_CHAVE" "http://localhost:3000/api/radios?page=2&limit=50"
```

### 2. Via Cabecalho HTTP Authorization Bearer
```bash
curl -H "Authorization: Bearer SUA_CHAVE" "http://localhost:3000/api/radios?page=2&limit=50"
```

### 3. Via Query String (Apenas com ALLOW_QUERY_API_KEY=true)
```bash
curl "http://localhost:3000/api/radios?page=2&API_KEY=SUA_CHAVE"
```

---

## Deploy em Producao

### Deploy na Vercel (Serverless)
O projeto inclui suporte nativo a Vercel Functions atraves de `api/index.ts` e `vercel.json`:
- Roteamento automatico para Serverless Function.
- Cabecalhos de seguranca aplicados na borda da rede.
- Configuracao compartilhada via `src/bootstrap/configure-app.ts`.

### Deploy em Container Docker
O projeto conta com Dockerfile multi-estagio com usuario nao privilegiado (`node:node`) e healthcheck nativo:
```bash
docker build -t radioswave-api:latest .
docker run -d -p 3000:3000 -e NODE_ENV=production -e API_KEY=sua-chave-forte radioswave-api:latest
```
