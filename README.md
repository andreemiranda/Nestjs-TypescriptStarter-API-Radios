# RadiosWave API

API REST em NestJS que serve um catálogo de estações de rádio brasileiras em streaming, com busca, filtros, paginação e ordenação.

## Autenticação

Todos os endpoints `/api/radios` exigem uma **chave de API** enviada no cabeçalho HTTP:

```
X-API-Key: <sua-chave>
```

A página inicial (`/`) é pública e não exige chave.

### Chave de API

A chave está definida na variável de ambiente `API_KEY` no arquivo `.env`:

```
API_KEY=6b6889a433054b403ce25a51af4b939e396c2ed952e6fa9d3b6244d591f9f9c4
```

Para gerar uma nova chave, execute:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Substitua o valor de `API_KEY` no arquivo `.env` e reinicie o servidor.

## Endpoints

### Página inicial (público)

```
GET /
```

Retorna informações sobre a API e a lista de endpoints disponíveis.

### Listar rádios

```
GET /api/radios
```

**Cabeçalho:** `X-API-Key: <chave>`

**Parâmetros de query (opcionais):**

| Parâmetro | Tipo   | Padrão | Descrição                                            |
| --------- | ------ | ------ | --------------------------------------------------- |
| `q`       | string | —      | Busca textual (nome, estado ou tag)                 |
| `state`   | string | —      | Filtra por estado (ex: `Tocantins`)                 |
| `tag`     | string | —      | Filtra por tag (ex: `gospel`, `popular`, `noticias`) |
| `page`    | number | 1      | Número da página                                     |
| `limit`   | number | 50     | Itens por página (máx 500)                          |
| `sort`    | string | name   | Campo de ordenação: `name`, `state` ou `id`         |
| `order`   | string | asc    | Direção: `asc` ou `desc`                            |

**Exemplo:**

```bash
curl -H "X-API-Key: 6b6889a433054b403ce25a51af4b939e396c2ed952e6fa9d3b6244d591f9f9c4" \
  "http://localhost:3000/api/radios?state=Tocantins&page=1&limit=10"
```

**Resposta:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Rádio Palmas FM",
      "streamUrl": "https://exemplo.com/stream",
      "logo": "https://exemplo.com/logo.png",
      "state": "Tocantins",
      "tags": ["popular"]
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10,
  "totalPages": 15
}
```

### Rádio por ID

```
GET /api/radios/:id
```

Retorna os detalhes de uma rádio específica.

### Metadados

```
GET /api/radios/meta
```

Retorna a lista de estados, tags e o total de estações.

### Estados disponíveis

```
GET /api/radios/states
```

### Tags disponíveis

```
GET /api/radios/tags
```

### Rádios por estado

```
GET /api/radios/by-state/:state
```

### Rádios por tag

```
GET /api/radios/by-tag/:tag
```

## Configuração

```bash
npm install
```

## Executar

```bash
npm run start:dev
```

O servidor inicia na porta `3000`.

## Testes

```bash
npm test
npm run test:e2e
```

## Estrutura do projeto

```
src/
  common/
    guards/
      api-key.guard.ts       # Guard de autenticação por chave
  radios/
    dto/
      query-radios.dto.ts    # DTO de paginação/filtros
    interfaces/
      radio.interface.ts     # Tipos da entidade Rádio
    parsers/
      m3u.parser.ts          # Parser de arquivos .m3u
    radios.controller.ts     # Endpoints REST
    radios.module.ts         # Módulo NestJS
    radios.service.ts        # Lógica de negócio
  streams/
    Playlist_Profissional_RadiosWave.m3u  # Playlist de origem
  app.controller.ts          # Página inicial (info da API)
  app.module.ts              # Módulo raiz
  main.ts                    # Bootstrap + CORS + dotenv
```

## Licença

MIT
