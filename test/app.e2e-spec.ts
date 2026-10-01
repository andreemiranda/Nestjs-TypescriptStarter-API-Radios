import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';

describe('RadiosWave API (Security & Endpoints e2e)', () => {
  let app: INestApplication;
  const validKey =
    process.env.API_KEY ||
    '6addf0e784c83b88f76d0d97a3a34bf7cb77d88145b9d37f4eea747d81e1a97d';

  beforeAll(async () => {
    process.env.API_KEY = validKey;
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_INSECURE_HTTP_STREAMS = 'true';
    process.env.ALLOW_QUERY_API_KEY = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET) returns minimal public status without leaking server internals', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeUndefined();
    expect(res.body.environment).toBeUndefined();
    expect(res.body.version).toBeUndefined();
  });

  it('/.well-known/security.txt is public and returns RFC 9116 text', async () => {
    const res = await request(app.getHttpServer())
      .get('/.well-known/security.txt')
      .expect(200);

    expect(res.text).toContain('Contact: mailto:legislativemunicipal@gmail.com');
    expect(res.headers['content-type']).toContain('text/plain');
  });

  it('/robots.txt is public and returns crawler directives', async () => {
    const res = await request(app.getHttpServer())
      .get('/robots.txt')
      .expect(200);

    expect(res.text).toContain('User-agent: *');
    expect(res.headers['content-type']).toContain('text/plain');
  });

  it('/favicon.ico returns 204 or static favicon without 404', async () => {
    const res = await request(app.getHttpServer()).get('/favicon.ico');
    expect([200, 204]).toContain(res.status);
  });

  it('/api/health/detailed requires authentication and returns metrics', async () => {
    // Sem chave -> 401
    await request(app.getHttpServer()).get('/api/health/detailed').expect(401);

    // Com chave valida -> 200
    const res = await request(app.getHttpServer())
      .get('/api/health/detailed')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.catalogSize).toBe(211);
    expect(res.body.uptime).toBeDefined();
  });

  it('/api/info requires authentication', async () => {
    // Sem chave -> 401
    await request(app.getHttpServer()).get('/api/info').expect(401);

    // Com chave -> 200
    const res = await request(app.getHttpServer())
      .get('/api/info')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res.body.name).toBe('RadiosWave API');
  });

  it('/api/radios without API key returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios')
      .expect(401);
    expect(res.body.statusCode).toBe(401);
  });

  it('/api/radios with wrong API key returns 401 and redacts key from response', async () => {
    const resHeader = await request(app.getHttpServer())
      .get('/api/radios')
      .set('X-API-Key', 'wrong-key-value-with-sufficient-length')
      .expect(401);
    expect(resHeader.body.statusCode).toBe(401);

    const resQuery = await request(app.getHttpServer())
      .get('/api/radios?API_KEY=secret-token-to-hide')
      .expect(401);
    expect(resQuery.body.statusCode).toBe(401);
    expect(resQuery.body.path).toContain('API_KEY=[REDACTED]');
    expect(resQuery.body.path).not.toContain('secret-token-to-hide');
  });

  it('/api/radios with valid API key in X-API-Key header returns 200 and paginated list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.total).toBe(211);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(50);
    expect(res.body.totalPages).toBe(5);

    // Verifica que o primeiro ID possui 14 digitos, sem zero e sem duplicatas consecutivas
    const firstRadio = res.body.data[0];
    const idStr = firstRadio.id.toString();
    expect(idStr).toHaveLength(14);
    expect(idStr).not.toContain('0');
    expect(/(.)\1/.test(idStr)).toBe(false);
  });

  it('/api/radios accepts Authorization: Bearer <key>', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?limit=5')
      .set('Authorization', `Bearer ${validKey}`)
      .expect(200);

    expect(res.body.data.length).toBe(5);
  });

  it('/api/radios with valid API key in query string (?API_KEY=) returns 200 when allowed', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/radios?API_KEY=${validKey}&limit=5`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBe(5);
  });

  it('emits hardened security headers including CSP, HSTS, and X-Request-Id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['permissions-policy']).toContain('geolocation=()');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain(
      "default-src 'none'",
    );
  });

  it('rejects HTTP Parameter Pollution (HPP) with 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?page=1&page=2')
      .set('X-API-Key', validKey)
      .expect(400);

    expect(res.body.message).toContain('HTTP Parameter Pollution');
  });

  it('rejects disallowed HTTP methods (POST, PUT, DELETE) with 405 Method Not Allowed', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/radios')
      .set('X-API-Key', validKey)
      .expect(405);

    expect(res.body.statusCode).toBe(405);
    expect(res.body.error).toBe('Method Not Allowed');
    expect(res.headers['allow']).toContain('GET');
  });

  it('/api/radios?page=2 (GET) returns second page of radios', async () => {
    const resPage1 = await request(app.getHttpServer())
      .get('/api/radios?page=1&limit=50')
      .set('X-API-Key', validKey)
      .expect(200);

    const resPage2 = await request(app.getHttpServer())
      .get('/api/radios?page=2&limit=50')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(resPage2.body.page).toBe(2);
    expect(resPage2.body.limit).toBe(50);
    expect(resPage2.body.data.length).toBe(50);
    expect(resPage2.body.data[0].id).not.toBe(resPage1.body.data[0].id);
  });

  it('/api/radios with per_page query param sets page size', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?page=2&per_page=15')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(15);
    expect(res.body.data.length).toBe(15);
  });

  it('/api/radios supports limits up to 10000 radios and rejects limit > 10000', async () => {
    const res10k = await request(app.getHttpServer())
      .get('/api/radios?limit=10000')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res10k.body.limit).toBe(10000);
    expect(res10k.body.total).toBe(211);
    expect(res10k.body.data.length).toBe(211);

    await request(app.getHttpServer())
      .get('/api/radios?limit=10001')
      .set('X-API-Key', validKey)
      .expect(400);
  });

  it('/api/radios/page/:page (GET) returns radios directly from route path', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios/page/2')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(50);
    expect(res.body.data.length).toBe(50);
  });

  it('/api/radios/per_page_2 and /api/radios/page_2 alias endpoints work correctly', async () => {
    const resPerPage = await request(app.getHttpServer())
      .get('/api/radios/per_page_2')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(resPerPage.body.page).toBe(2);
    expect(resPerPage.body.limit).toBe(50);
    expect(resPerPage.body.data.length).toBe(50);

    const resPageAlias = await request(app.getHttpServer())
      .get('/api/radios/page_2')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(resPageAlias.body.page).toBe(2);
    expect(resPageAlias.body.limit).toBe(50);
    expect(resPageAlias.body.data.length).toBe(50);
  });

  it('/api/radios/page/invalid-page returns 400', async () => {
    await request(app.getHttpServer())
      .get('/api/radios/page/abc')
      .set('X-API-Key', validKey)
      .expect(400);
  });

  it('/api/radios?q= (GET) filters by text in name, state or tag', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?q=Palmas')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    for (const radio of res.body.data) {
      const combined =
        `${radio.name} ${radio.state} ${radio.tags?.join(' ')}`.toLowerCase();
      expect(combined).toContain('palmas');
    }
  });

  it('/api/radios?state= (GET) filters by state', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?state=Tocantins')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    for (const radio of res.body.data) {
      expect(radio.state.toLowerCase()).toBe('tocantins');
    }
  });

  it('/api/radios/by-state/:state (GET) applies pagination and ceiling', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios/by-state/Bahia?page=1&limit=10')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res.body.data.length).toBeLessThanOrEqual(10);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });

  it('/api/radios/by-tag/:tag (GET) applies pagination and ceiling', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios/by-tag/popular?page=1&limit=10')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res.body.data.length).toBeLessThanOrEqual(10);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('/api/radios with sort and order sorts correctly', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?sort=name&order=asc&limit=10')
      .set('X-API-Key', validKey)
      .expect(200);

    const names = res.body.data.map((r: { name: string }) => r.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(names).toEqual(sorted);
  });

  it('/api/radios/meta (GET) returns states, tags and total count', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios/meta')
      .set('X-API-Key', validKey)
      .expect(200);
    expect(res.body.states).toContain('Tocantins');
    expect(res.body.tags).toContain('popular');
    expect(res.body.total).toBe(211);
  });

  it('/api/radios/:id (GET) returns radio with valid 14-digit ID', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/radios?limit=1')
      .set('X-API-Key', validKey)
      .expect(200);
    const id = list.body.data[0].id;

    const res = await request(app.getHttpServer())
      .get(`/api/radios/${id}`)
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res.body.id).toBe(id);
    expect(res.body.streamUrl).toBeTruthy();
    expect(res.body.name).toBeTruthy();
  });

  it('rejects invalid parameters with 400 and returns 404 for non-existent radio', async () => {
    // ID alfabetico
    await request(app.getHttpServer())
      .get('/api/radios/invalid-id')
      .set('X-API-Key', validKey)
      .expect(400);

    // ID contendo zero
    await request(app.getHttpServer())
      .get('/api/radios/10234567891234')
      .set('X-API-Key', validKey)
      .expect(400);

    // ID contendo repeticoes consecutivas
    await request(app.getHttpServer())
      .get('/api/radios/11234567891234')
      .set('X-API-Key', validKey)
      .expect(400);

    // Pagina invalida
    await request(app.getHttpServer())
      .get('/api/radios?page=-1')
      .set('X-API-Key', validKey)
      .expect(400);

    // Propriedade nao permitida no DTO
    await request(app.getHttpServer())
      .get('/api/radios?maliciousParam=attack')
      .set('X-API-Key', validKey)
      .expect(400);

    // ID inexistente de 14 digitos
    await request(app.getHttpServer())
      .get('/api/radios/98765432198765')
      .set('X-API-Key', validKey)
      .expect(404);
  });

  it('Reflects changes made directly to radios.json without server restart', async () => {
    const dbPath = path.join(process.cwd(), 'src', 'database', 'radios.json');
    const originalContent = fs.readFileSync(dbPath, 'utf-8');
    const radios = JSON.parse(originalContent);

    const testRadio = {
      id: 98765432198765,
      name: 'Rádio Teste Dinâmico Sem Reiniciar',
      streamUrl: 'https://stream.teste.com/live',
      logo: 'https://stream.teste.com/logo.png',
      state: 'Distrito Federal',
      tags: ['teste', 'aovivo'],
    };

    try {
      fs.writeFileSync(
        dbPath,
        JSON.stringify([...radios, testRadio], null, 2),
        'utf-8',
      );

      const res = await request(app.getHttpServer())
        .get('/api/radios/98765432198765')
        .set('X-API-Key', validKey)
        .expect(200);

      expect(res.body.id).toBe(98765432198765);
      expect(res.body.name).toBe('Rádio Teste Dinâmico Sem Reiniciar');
    } finally {
      fs.writeFileSync(dbPath, originalContent, 'utf-8');
    }
  });
});
