# RadiosWave API

API REST moderna desenvolvida em **NestJS** e **TypeScript** que fornece catálogo completo e links de streaming de emissoras de rádio brasileiras, com busca textual inteligente, filtros por estado/tag, paginação, ordenação e documentação Swagger integrada.

---

## 🌟 Principais Recursos

- **Catálogo Completo em JSON:** 211 estações de rádio com IDs, nomes, logos, estados, tags e URLs de streaming.
- **Leitura em Tempo Real (`DatabaseLoader`):** O arquivo `src/database/radios.json` é lido a cada requisição, sem cache em memória. Qualquer inclusão, alteração ou exclusão de estação entra em vigor imediatamente, sem reiniciar a aplicação.
- **Autenticação Flexível:** Suporte a chave de API via cabeçalho HTTP (`X-API-Key`) ou via parâmetro de busca (`?API_KEY=`).
- **Documentação Interativa Swagger:** Acessível na raiz (`/`), com botão **Authorize** para testar os endpoints direto pelo navegador.
- **Segurança e Resiliência:** Proteção contra ataques via `helmet`, CORS habilitado, rate limiting global via `@nestjs/throttler` (120 req/min) e `HttpExceptionFilter` padronizando respostas de erro com `{ statusCode, error, message, path, timestamp }`.
- **Validação Estrita:** `ValidationPipe` com `class-validator` e `class-transformer` rejeitando parâmetros incorretos.
- **Pronto para Deploy na Vercel:** Configuração serverless via `vercel.json` e `api/index.ts`.

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto para desenvolvimento local (já configurado no `.gitignore`):

```env
NODE_ENV=production
PORT=3000
API_KEY=<sua-chave-secreta-de-64-caracteres>
CORS_ORIGIN=*
THROTTLE_TTL=60000
THROTTLE_LIMIT=120
SWAGGER_ENABLED=true
```

### Relação Completa de Variáveis de Ambiente:

| Variável | Tipo | Padrão | Obrigatória? | Descrição |
|---|---|---|---|---|
| `API_KEY` | String | *(nenhum)* | **Sim (em Produção)** | Chave secreta de autenticação para as rotas protegidas (`/api/radios/*`). Aceita via cabeçalho `X-API-Key` ou query string `?API_KEY=<chave>`. |
| `NODE_ENV` | String | `development` | Não | Define o ambiente de execução (`production`, `development`, `test`). Em produção, oculta mensagens de erro internas. |
| `PORT` | Número | `3000` | Não | Porta TCP em que o servidor HTTP aceita conexões. |
| `CORS_ORIGIN` | String | `*` | Não | Origens permitidas para requisições cross-origin (ex: `https://meuapp.com` ou múltiplas separadas por vírgula). |
| `THROTTLE_TTL` | Número | `60000` | Não | Janela de tempo do Rate Limiter em milissegundos (60000 ms = 60 segundos). |
| `THROTTLE_LIMIT` | Número | `120` | Não | Quantidade máxima de requisições por IP permitidas na janela do Rate Limiter. |
| `SWAGGER_ENABLED` | Booleano | `true` | Não | Habilita (`true`) ou desabilita (`false`) a interface Swagger UI na raiz (`/`). |
| `RADIOS_DB_PATH` | String | *(automático)* | Não | Caminho absoluto ou relativo para um arquivo `radios.json` customizado (ex: volume montado em container). |

### Gerando uma Nova Chave de API Forte

Você pode gerar uma chave criptograficamente segura via Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Atenção:** Em plataformas de nuvem (como **Vercel**, Docker ou Kubernetes), cadastre as variáveis de ambiente diretamente nas configurações do provedor, pois o arquivo `.env` local nunca deve ser versionado.

---

## 🚀 Instalação e Execução

### 1. Instalar dependências
```bash
npm install
```

### 2. Modo Desenvolvimento
```bash
npm run dev
# ou
npm run start:dev
```
A API iniciará em `http://localhost:3000` (ou na porta definida por `PORT`).

### 3. Modo Produção
```bash
npm run build
npm run start:prod
```

---

## 📖 Documentação dos Endpoints

Acesse `http://localhost:3000/` no navegador para abrir a interface gráfica do **Swagger UI**.

Para a documentação completa de esquemas e códigos de status, consulte [docs/API.md](docs/API.md).

### Resumo das Rotas:

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `GET` | `/` | Pública | Interface interativa do Swagger UI |
| `GET` | `/api/health` | Pública | Verificação de status e saúde do serviço |
| `GET` | `/api/info` | Pública | Metadados e catálogo de endpoints |
| `GET` | `/api/radios` | `X-API-Key` ou `?API_KEY=` | Listagem paginada com busca, filtros e ordenação |
| `GET` | `/api/radios/page/:page` | `X-API-Key` ou `?API_KEY=` | Acesso direto às páginas (ex: `/api/radios/page/2`) |
| `GET` | `/api/radios/:id` | `X-API-Key` ou `?API_KEY=` | Busca estação pelo ID numérico |
| `GET` | `/api/radios/meta` | `X-API-Key` ou `?API_KEY=` | Lista de estados, tags e totalizador |
| `GET` | `/api/radios/states` | `X-API-Key` ou `?API_KEY=` | Lista de estados disponíveis |
| `GET` | `/api/radios/tags` | `X-API-Key` ou `?API_KEY=` | Lista de tags e gêneros musicais |
| `GET` | `/api/radios/by-state/:state` | `X-API-Key` ou `?API_KEY=` | Rádios de um estado específico |
| `GET` | `/api/radios/by-tag/:tag` | `X-API-Key` ou `?API_KEY=` | Rádios de uma tag/gênero específico |

---

## 💡 Exemplos de Uso

### 1. Health Check (Público)
```bash
curl http://localhost:3000/api/health
```
**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-30T10:00:00.000Z"
}
```

### 2. Autenticação via Cabeçalho `X-API-Key`
```bash
curl -H "X-API-Key: SUA_CHAVE" \
  "http://localhost:3000/api/radios?state=Tocantins&page=1&limit=10"
```

### 3. Autenticação via Query String `?API_KEY=`
```bash
curl "http://localhost:3000/api/radios?API_KEY=SUA_CHAVE&q=Palmas&sort=name&order=asc"
```

### 4. Buscar Rádio por ID (14 dígitos sem dígito 0)
```bash
curl -H "X-API-Key: SUA_CHAVE" "http://localhost:3000/api/radios/49639317164246"
```

---

## 📄 Guia de Paginação e Estrutura de URLs com API Key

Por padrão, o endpoint `/api/radios` retorna **50 rádios por página** para garantir respostas ultrarrápidas e baixo consumo de banda.

Como o catálogo possui **211 rádios**, o resultado completo está dividido em **5 páginas** (`totalPages: 5`):
- **Página 1:** Rádios 1 a 50
- **Página 2:** Rádios 51 a 100
- **Página 3:** Rádios 101 a 150
- **Página 4:** Rádios 151 a 200
- **Página 5:** Rádios 201 a 211

Você pode navegar pelas páginas de **três formas diferentes**, com autenticação via Query String (`?API_KEY=...`) ou via Cabeçalho (`X-API-Key: ...`):

---

### Opção 1: Via Parâmetro de Query `?page=` (Padrão REST)

Basta adicionar o parâmetro `page=<número>` na URL:

#### 🌐 No Navegador / Web (com API Key na URL):
```text
https://seu-dominio.vercel.app/api/radios?page=2&API_KEY=SUA_CHAVE
https://seu-dominio.vercel.app/api/radios?page=3&API_KEY=SUA_CHAVE
https://seu-dominio.vercel.app/api/radios?page=4&API_KEY=SUA_CHAVE
https://seu-dominio.vercel.app/api/radios?page=5&API_KEY=SUA_CHAVE
```

#### 💻 Via cURL (Terminal):
```bash
# Acessar a página 2 com API Key na URL
curl "http://localhost:3000/api/radios?page=2&API_KEY=SUA_CHAVE"

# Ou com o cabeçalho X-API-Key
curl -H "X-API-Key: SUA_CHAVE" "http://localhost:3000/api/radios?page=2"
```

---

### Opção 2: Via Rota Direta `/api/radios/page/:page`

Se você preferir uma estrutura de caminho amigável diretamente na URL, utilize a rota `/api/radios/page/<número>`:

#### 🌐 No Navegador / Web (com API Key na URL):
```text
https://seu-dominio.vercel.app/api/radios/page/2?API_KEY=SUA_CHAVE
https://seu-dominio.vercel.app/api/radios/page/3?API_KEY=SUA_CHAVE
https://seu-dominio.vercel.app/api/radios/page/4?API_KEY=SUA_CHAVE
https://seu-dominio.vercel.app/api/radios/page/5?API_KEY=SUA_CHAVE
```

#### 💻 Via cURL (Terminal):
```bash
# Acessar a página 2 diretamente pelo caminho da URL
curl "http://localhost:3000/api/radios/page/2?API_KEY=SUA_CHAVE"

# Ou com cabeçalho X-API-Key
curl -H "X-API-Key: SUA_CHAVE" "http://localhost:3000/api/radios/page/2"
```

---

### Opção 3: Alterar o Tamanho da Página com `limit` ou `per_page`

Você pode controlar quantas rádios vêm em cada página usando os parâmetros `limit` ou `per_page` (máximo permitido: **500 estações por página**):

#### Exemplos com `per_page` ou `limit`:
```text
# Trazer 20 rádios na página 2
https://seu-dominio.vercel.app/api/radios?page=2&per_page=20&API_KEY=SUA_CHAVE

# Trazer 100 rádios na página 1
https://seu-dominio.vercel.app/api/radios?page=1&limit=100&API_KEY=SUA_CHAVE
```

---

### 🚀 Dica: Como Obter TODAS as Rádios de Uma Vez (Sem Paginar)

Se a sua aplicação precisa carregar todas as rádios em uma única requisição, basta definir `limit=500` (ou `per_page=500`):

```text
https://seu-dominio.vercel.app/api/radios?limit=500&API_KEY=SUA_CHAVE
```

```bash
curl -H "X-API-Key: SUA_CHAVE" "http://localhost:3000/api/radios?limit=500"
```
> Como o banco possui 211 rádios e o limite máximo suportado é 500, essa requisição devolverá o catálogo completo de uma só vez!

---

### 🧩 Combinando Paginação com Filtros e Ordenação

Todos os filtros funcionam em conjunto com a paginação:

```text
# Rádios do estado da Bahia, página 1, 10 por página, com API Key:
https://seu-dominio.vercel.app/api/radios?state=Bahia&page=1&per_page=10&API_KEY=SUA_CHAVE

# Busca textual "FM", página 2, ordenada por nome:
https://seu-dominio.vercel.app/api/radios?q=FM&page=2&sort=name&order=asc&API_KEY=SUA_CHAVE

# Rádios de gênero "popular", página 3:
https://seu-dominio.vercel.app/api/radios?tag=popular&page=3&API_KEY=SUA_CHAVE
```

---

### 📦 Estrutura do Objeto de Resposta Paginada

Toda requisição paginada devolve os metadados para que o seu frontend/app monte a navegação:

```json
{
  "data": [
    {
      "id": 49639317164246,
      "name": "Rádio Olivença FM",
      "streamUrl": "https://server12.srvsh.com.br:8074/stream",
      "logo": "https://radioswave.netlify.app/icon-192x192.png",
      "state": "Bahia",
      "tags": ["fm", "popular"]
    }
  ],
  "total": 211,
  "page": 2,
  "limit": 50,
  "totalPages": 5
}
```

- **`total`**: Quantidade total de rádios cadastradas (ou correspondentes aos filtros aplicados).
- **`page`**: Número da página atual que você está visualizando.
- **`limit`**: Quantidade máxima de itens desta página.
- **`totalPages`**: Quantidade total de páginas disponíveis.

---

## 🗄️ Como Editar o Banco de Dados (`radios.json`)

O arquivo de dados está localizado em:
```
src/database/radios.json
```

Cada rádio segue a estrutura:
```json
{
  "id": 212,
  "name": "Nova Rádio FM",
  "streamUrl": "https://stream.exemplo.com/live",
  "logo": "https://exemplo.com/logo.png",
  "state": "Goiás",
  "tags": ["fm", "sertanejo", "popular"]
}
```

Como o `DatabaseLoader` lê o arquivo diretamente a cada requisição:
- Você pode abrir `src/database/radios.json` em qualquer editor;
- Inserir uma nova rádio com um `id` único;
- Salvar o arquivo;
- Imediatamente, a nova estação estará disponível em `/api/radios`, `/api/radios/:id`, `/api/radios/states`, etc., sem reiniciar o servidor NestJS!

---

## ☁️ Deploy na Plataforma Vercel

O projeto está totalmente configurado para deploy serverless na **Vercel** com `vercel.json` e o manipulador `api/index.ts`.

### Passo a Passo para Deploy:

1. **Repositório GitHub:** Faça commit do projeto para um repositório no seu GitHub.
2. **Importar na Vercel:**
   - Acesse o painel da [Vercel](https://vercel.com/) e clique em **Add New > Project**;
   - Selecione o repositório da API de rádios.
3. **Configuração de Build e Framework:**
   - Framework Preset: **Other**;
   - Build Command: `npm run build` (configurado automaticamente);
   - Output Directory: `dist` (configurado automaticamente);
   - Install Command: `npm install`.
4. **Configuração das Variáveis de Ambiente:**
   - No painel da Vercel, vá na seção **Environment Variables**;
   - Adicione a chave:
     - `API_KEY`: insira a chave secreta gerada (ex: string hexadecimal segura de 64 caracteres);
   - Salve a variável.
5. **Deploy:**
   - Clique em **Deploy**;
   - Uma vez finalizado, a URL pública (`https://seu-projeto.vercel.app`) estará ativa, exibindo o Swagger UI na raiz e respondendo a `/api/health` e `/api/radios`.

---

## 🧪 Testes

A suíte de testes contempla 18 testes automatizados:
- **2 Testes Unitários:** Testando o controlador principal (`AppController`), validação de saúde e metadados.
- **16 Testes End-to-End (e2e):** Cobrindo autenticação por cabeçalho, por query string, rejeição sem chave (401), ausência de chave no servidor (503), filtros (`q`, `state`, `tag`), ordenação, listagem por ID, tratamento de parâmetros inválidos (400) e atualização em tempo real do `radios.json`.

Para rodar todos os testes:

```bash
# Testes unitários (2 testes)
npm test

# Testes end-to-end (16 testes)
npm run test:e2e

# Cobertura de código
npm run test:cov
```

---

## 📂 Estrutura de Arquivos

```
api/
  index.ts                   # Adaptador serverless para deploy na Vercel
src/
  common/
    decorators/
      public.decorator.ts    # Decorator @Public() para rotas abertas
    filters/
      http-exception.filter.ts # Filtro global de formatação de erros
    guards/
      api-key.guard.ts       # Guard de autenticação por chave (header ou query)
  database/
    database.loader.ts       # Loader em tempo real de radios.json sem cache
    radios.json              # Banco de dados com 211 estações de rádio
  radios/
    dto/
      query-radios.dto.ts    # DTO com class-validator e Swagger decorators
    interfaces/
      radio.interface.ts     # Interfaces TypeScript de Radio e paginação
    radios.controller.ts     # Endpoints REST de rádios com anotações Swagger
    radios.module.ts         # Módulo de rádios
    radios.service.ts        # Regras de negócio, busca, filtros e ordenação segura
  app.controller.ts          # Endpoints /api/health e /api/info
  app.module.ts              # ConfigModule + ThrottlerModule globais
  app.service.ts             # Provedor de dados de saúde e metadados
  main.ts                    # Bootstrap: Helmet, CORS, ValidationPipe e Swagger UI na raiz
test/
  app.e2e-spec.ts            # 16 testes e2e automatizados
docs/
  API.md                     # Documentação técnica e detalhada dos endpoints
vercel.json                  # Configuração de roteamento da Vercel
```

---

## 📄 Licença

MIT
