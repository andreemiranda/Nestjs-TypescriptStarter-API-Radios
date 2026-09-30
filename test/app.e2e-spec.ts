import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';

process.env.API_KEY = 'test-api-key-for-e2e';

describe('Radios API (e2e)', () => {
  let app: INestApplication<App>;
  const validKey = 'test-api-key-for-e2e';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET) returns status ok without auth', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('/api/radios without API key returns 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios')
      .expect(401);
    expect(res.body.statusCode).toBe(401);
  });

  it('/api/radios with wrong API key returns 401 and redacts key from response path', async () => {
    const resHeader = await request(app.getHttpServer())
      .get('/api/radios')
      .set('X-API-Key', 'wrong-key-value')
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
      .get('/api/radios?page=1&limit=5')
      .set('X-API-Key', validKey)
      .expect(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(5);
  });

  it('/api/radios with valid API key in query string (?API_KEY=) returns 200', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/radios?API_KEY=${validKey}&limit=2`)
      .expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('/api/radios returns 503 when API_KEY is not configured on server', async () => {
    const originalKey = process.env.API_KEY;
    delete process.env.API_KEY;
    try {
      const res = await request(app.getHttpServer())
        .get('/api/radios')
        .set('X-API-Key', validKey)
        .expect(503);
      expect(res.body.statusCode).toBe(503);
      expect(res.body.message).toBe('API key not configured on the server');
    } finally {
      process.env.API_KEY = originalKey;
    }
  });

  it('/api/radios?q= (GET) filters by text in name, state or tag', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?q=Palmas')
      .set('X-API-Key', validKey)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(
      res.body.data.every(
        (r: { name: string; state: string; tags: string[] }) =>
          r.name.toLowerCase().includes('palmas') ||
          r.state.toLowerCase().includes('palmas') ||
          r.tags.some((t) => t.toLowerCase().includes('palmas')),
      ),
    ).toBe(true);
  });

  it('/api/radios?state= (GET) filters by state', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?state=Tocantins')
      .set('X-API-Key', validKey)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(
      res.body.data.every((r: { state: string }) => r.state === 'Tocantins'),
    ).toBe(true);
  });

  it('/api/radios?tag= (GET) filters by tag', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?tag=popular')
      .set('X-API-Key', validKey)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(
      res.body.data.every((r: { tags: string[] }) =>
        r.tags.map((t) => t.toLowerCase()).includes('popular'),
      ),
    ).toBe(true);
  });

  it('/api/radios with sort and order sorts correctly', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?sort=name&order=asc&limit=10')
      .set('X-API-Key', validKey)
      .expect(200);
    const names: string[] = (res.body.data as { name: string }[]).map(
      (r: { name: string }) => r.name,
    );
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

  it('/api/radios/states (GET) returns list of available states', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios/states')
      .set('X-API-Key', validKey)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toContain('Bahia');
  });

  it('/api/radios/tags (GET) returns list of available tags', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios/tags')
      .set('X-API-Key', validKey)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toContain('popular');
  });

  it('/api/radios/:id (GET) returns one radio station', async () => {
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

  it('/api/radios validation rejects invalid parameters (400) and returns 404 for non-existent radio', async () => {
    await request(app.getHttpServer())
      .get('/api/radios/invalid-id')
      .set('X-API-Key', validKey)
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/radios?page=-1')
      .set('X-API-Key', validKey)
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/radios/999999')
      .set('X-API-Key', validKey)
      .expect(404);
  });

  it('Reflects changes made directly to radios.json without server restart', async () => {
    const dbPath = path.join(process.cwd(), 'src', 'database', 'radios.json');
    const originalContent = fs.readFileSync(dbPath, 'utf-8');
    const radios = JSON.parse(originalContent);

    const testRadio = {
      id: 888888,
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
        .get('/api/radios/888888')
        .set('X-API-Key', validKey)
        .expect(200);

      expect(res.body.id).toBe(888888);
      expect(res.body.name).toBe('Rádio Teste Dinâmico Sem Reiniciar');
    } finally {
      fs.writeFileSync(dbPath, originalContent, 'utf-8');
    }

    await request(app.getHttpServer())
      .get('/api/radios/888888')
      .set('X-API-Key', validKey)
      .expect(404);
  });
});
