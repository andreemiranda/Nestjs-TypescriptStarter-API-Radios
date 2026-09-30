# Documentação Completa da API RadiosWave

A **RadiosWave API** é uma API REST desenvolvida com **NestJS**, **TypeScript** e **Swagger**, projetada para catálogo e streaming de rádios brasileiras com paginação, busca textual e filtros refinados.

---

## 1. Autenticação e Segurança

A autenticação é controlada pelo `ApiKeyGuard` e pode ser realizada de duas formas equivalentes:

1. **Cabeçalho HTTP:**
   ```http
   X-API-Key: <sua-chave-secreta>
   ```

2. **Query Parameter (URL):**
   ```http
   ?API_KEY=<sua-chave-secreta>
   ```

### Camadas de Segurança Implementadas:
- **Ocultação de Chaves (Credential Redaction):** O filtro global de exceções mascara automaticamente qualquer parâmetro sensível (`API_KEY`, `api_key`, `token`, `secret`) em URLs de erro, substituindo-o por `[REDACTED]` para evitar vazamentos em logs ou respostas.
- **Proteção contra Timing Attacks:** Validação criptográfica de chaves utilizando hashes SHA-256 em tempo constante (`crypto.timingSafeEqual`), impedindo qualquer ataque de medição de tempo que deduza o tamanho ou conteúdo da chave.
- **Cabeçalhos de Segurança (Helmet):** Proteção via HSTS, X-Content-Type-Options (nosniff), X-Frame-Options (SAMEORIGIN), X-XSS-Protection e remoção do cabeçalho `X-Powered-By`.
- **Prevenção de Cache Sensível:** Respostas autenticadas incluem cabeçalhos `Cache-Control: no-store, no-cache, must-revalidate` impedindo o armazenamento em proxies e caches de navegador.
- **CORS Restrito:** Permissões restritas a métodos de leitura (`GET, HEAD, OPTIONS`).
- **Limitação de Payload:** Limite estrito de 64kb para requisições, evitando ataques de DoS por buffers inflados.
- **Higienização de Entradas:** Sanitização contra caracteres de controle, limitação de tamanho de strings e validação com `class-validator`.

### Endpoints Públicos
- `GET /`: Interface visual Swagger UI para testar as requisições no navegador.
- `GET /api/health`: Verificação de status e saúde do serviço.
- `GET /api/info`: Metadados e catálogo de rotas da API.

---

## 2. Rate Limiting (Controle de Frequência)

A aplicação conta com proteção global contra abuso através do `@nestjs/throttler`:
- **Limite:** 120 requisições por minuto por IP.
- **Janela de tempo:** 60 segundos (TTL: 60.000 ms).
- **Código retornado ao ultrapassar:** `429 Too Many Requests`.

---

## 3. Formato Padrão de Erros

Todas as exceções tratadas pelo `HttpExceptionFilter` retornam a seguinte estrutura JSON:

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Missing X-API-Key header or API_KEY query parameter",
  "path": "/api/radios",
  "timestamp": "2026-09-30T10:00:00.000Z"
}
```

### Principais Códigos de Status HTTP:

| Código | Descrição | Exemplo de Causa |
|---|---|---|
| `200 OK` | Sucesso | Requisição processada com êxito |
| `400 Bad Request` | Parâmetro inválido | `id` não numérico, `page` menor que 1, `limit` maior que 500, `sort` com valor não permitido |
| `401 Unauthorized` | Não autorizado | Chave de API ausente ou inválida |
| `404 Not Found` | Não encontrado | Estação com o ID fornecido não existe no banco de dados |
| `429 Too Many Requests` | Excesso de requisições | Ultrapassou 120 requisições em 1 minuto |
| `500 Internal Server Error` | Erro interno | Arquivo `radios.json` corrompido ou erro inesperado |
| `503 Service Unavailable` | Serviço indisponível | Variável `API_KEY` não cadastrada no servidor |

---

## 4. Catálogo de Endpoints

### 4.1. Swagger UI
- **Método:** `GET`
- **Rota:** `/`
- **Autenticação:** Não requer.
- **Descrição:** Documentação interativa Swagger com suporte ao botão **Authorize** para inserir a chave `X-API-Key`.

---

### 4.2. Health Check
- **Método:** `GET`
- **Rota:** `/api/health`
- **Autenticação:** Não requer (público).
- **Resposta Sucesso (`200 OK`):**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-30T10:30:00.000Z"
  }
  ```

---

### 4.3. Informações da API
- **Método:** `GET`
- **Rota:** `/api/info`
- **Autenticação:** Não requer (público).
- **Resposta Sucesso (`200 OK`):**
  ```json
  {
    "name": "RadiosWave API",
    "description": "Catálogo de estações de rádio brasileiras em streaming",
    "version": "1.0.0",
    "authentication": {
      "type": "API Key",
      "header": "X-API-Key",
      "query": "API_KEY"
    },
    "endpoints": { ... }
  }
  ```

---

### 4.4. Listar Rádios (com Busca, Filtros, Paginação e Ordenação)
- **Método:** `GET`
- **Rota:** `/api/radios`
- **Autenticação:** Obrigatória (`X-API-Key` ou `?API_KEY=`).

#### Parâmetros de Query:
| Parâmetro | Tipo | Padrão | Validação | Descrição |
|---|---|---|---|---|
| `q` | `string` | — | Opcional | Busca textual por nome, estado ou tags |
| `state` | `string` | — | Opcional | Filtra estações por estado |
| `tag` | `string` | — | Opcional | Filtra estações por tag/gênero (ex: `gospel`, `popular`) |
| `page` | `integer` | `1` | Mínimo: 1 | Página desejada |
| `limit` | `integer` | `50` | Mín: 1, Máx: 500 | Quantidade de itens por página |
| `sort` | `string` | `name` | `name`, `state`, `id` | Campo base para ordenação |
| `order` | `string` | `asc` | `asc`, `desc` | Sentido crescente ou decrescente |
| `API_KEY` | `string` | — | Opcional | Alternativa para envio da chave na query string |

#### Exemplos de Requisição:
```bash
# Via cabeçalho HTTP
curl -H "X-API-Key: SUA_CHAVE" "http://localhost:3000/api/radios?state=Tocantins&limit=10"

# Via query string
curl "http://localhost:3000/api/radios?API_KEY=SUA_CHAVE&q=Palmas&sort=name&order=asc"
```

#### Resposta Sucesso (`200 OK`):
```json
{
  "data": [
    {
      "id": 11111111111111,
      "name": "Rádio Olivença FM",
      "streamUrl": "https://server12.srvsh.com.br:8074/stream",
      "logo": "https://radioswave.netlify.app/icon-192x192.png",
      "state": "Bahia",
      "tags": ["fm", "popular"]
    }
  ],
  "total": 211,
  "page": 1,
  "limit": 50,
  "totalPages": 5
}
```

---

### 4.5. Buscar Rádio por ID
- **Método:** `GET`
- **Rota:** `/api/radios/:id`
- **Autenticação:** Obrigatória.
- **Parâmetros de Rota:** `id` (número com exatamente 14 dígitos e nenhum dígito zero `0`, ex: `11111111111111`).
- **Resposta Sucesso (`200 OK`):**
  ```json
  {
    "id": 11111111111111,
    "name": "Rádio Olivença FM",
    "streamUrl": "https://server12.srvsh.com.br:8074/stream",
    "logo": "https://radioswave.netlify.app/icon-192x192.png",
    "state": "Bahia",
    "tags": ["fm", "popular"]
  }
  ```
- **Respostas de Erro:**
  - `400 Bad Request` se `id` não possuir 14 dígitos ou contiver o dígito `0`.
  - `404 Not Found` se o ID não existir no banco.

---

### 4.6. Metadados Gerais
- **Método:** `GET`
- **Rota:** `/api/radios/meta`
- **Autenticação:** Obrigatória.
- **Resposta Sucesso (`200 OK`):**
  ```json
  {
    "states": ["Acre", "Alagoas", "Bahia", "Tocantins", "..."],
    "tags": ["adulto", "comunitaria", "gospel", "noticias", "popular"],
    "total": 211
  }
  ```

---

### 4.7. Lista de Estados
- **Método:** `GET`
- **Rota:** `/api/radios/states`
- **Autenticação:** Obrigatória.
- **Resposta Sucesso (`200 OK`):**
  ```json
  ["Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Tocantins"]
  ```

---

### 4.8. Lista de Tags
- **Método:** `GET`
- **Rota:** `/api/radios/tags`
- **Autenticação:** Obrigatória.
- **Resposta Sucesso (`200 OK`):**
  ```json
  ["adulto", "comunitaria", "cultural", "fm", "gospel", "jovem", "noticias", "popular"]
  ```

---

### 4.9. Rádios por Estado
- **Método:** `GET`
- **Rota:** `/api/radios/by-state/:state`
- **Autenticação:** Obrigatória.
- **Exemplo:** `/api/radios/by-state/Tocantins`
- **Resposta Sucesso (`200 OK`):**
  ```json
  {
    "data": [
      {
        "id": 142,
        "name": "Rádio Palmas FM",
        "streamUrl": "https://...",
        "logo": "https://...",
        "state": "Tocantins",
        "tags": ["popular"]
      }
    ],
    "total": 12
  }
  ```

---

### 4.10. Rádios por Tag
- **Método:** `GET`
- **Rota:** `/api/radios/by-tag/:tag`
- **Autenticação:** Obrigatória.
- **Exemplo:** `/api/radios/by-tag/popular`
- **Resposta Sucesso (`200 OK`):**
  ```json
  {
    "data": [ ... ],
    "total": 85
  }
  ```
