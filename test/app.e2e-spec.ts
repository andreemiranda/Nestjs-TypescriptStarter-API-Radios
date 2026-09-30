import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Radios API (e2e)', () => {
  let app: INestApplication;
  const validKey =
    process.env.API_KEY ||
    '6addf0e784c83b88f76d0d97a3a34bf7cb77d88145b9d37f4eea747d81e1a97d';

  beforeAll(async () => {
    process.env.API_KEY = validKey;

    const moduleFixture: TestingModule = await Test.createTestingModule({
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

    // Verify first radio ID is 14 digits, contains NO zero, and NO consecutive duplicates
    const firstRadio = res.body.data[0];
    const idStr = firstRadio.id.toString();
    expect(idStr).toHaveLength(14);
    expect(idStr).not.toContain('0');
    expect(/(.)\1/.test(idStr)).toBe(false);
  });

  it('/api/radios with valid API key in query string (?API_KEY=) returns 200', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/radios?API_KEY=${validKey}&limit=5`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBe(5);
  });

  it('/api/radios returns 503 when API_KEY is not configured on server', async () => {
    const saved = process.env.API_KEY;
    const savedSys = process.env.SYSTEM_API_KEY;
    delete process.env.API_KEY;
    delete process.env.SYSTEM_API_KEY;

    try {
      const res = await request(app.getHttpServer())
        .get('/api/radios')
        .set('X-API-Key', 'any-key')
        .expect(503);
      expect(res.body.statusCode).toBe(503);
    } finally {
      process.env.API_KEY = saved;
      if (savedSys) process.env.SYSTEM_API_KEY = savedSys;
    }
  });

  it('/api/radios?q= (GET) filters by text in name, state or tag', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?q=Palmas')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    for (const radio of res.body.data) {
      const combined = `${radio.name} ${radio.state} ${radio.tags?.join(' ')}`.toLowerCase();
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

  it('/api/radios?tag= (GET) filters by tag', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?tag=noticias')
      .set('X-API-Key', validKey)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    for (const radio of res.body.data) {
      const tags = radio.tags.map((t: string) => t.toLowerCase());
      expect(tags).toContain('noticias');
    }
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

  it('/api/radios/:id (GET) returns one radio station with 14-digit ID, no zero, and no repeated digits', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/radios?limit=1')
      .set('X-API-Key', validKey)
      .expect(200);
    const id = list.body.data[0].id;
    const idStr = id.toString();
    expect(idStr).toHaveLength(14);
    expect(idStr).not.toContain('0');
    expect(/(.)\1/.test(idStr)).toBe(false);

    const res = await request(app.getHttpServer())
      .get(`/api/radios/${id}`)
      .set('X-API-Key', validKey)
      .expect(200);
    expect(res.body.id).toBe(id);
    expect(res.body.streamUrl).toBeTruthy();
    expect(res.body.name).toBeTruthy();
  });

  it('/api/radios validation rejects invalid parameters (400) and returns 404 for non-existent 14-digit radio', async () => {
    // Rejects non-14 digit or alphabetic ID
    await request(app.getHttpServer())
      .get('/api/radios/invalid-id')
      .set('X-API-Key', validKey)
      .expect(400);

    // Rejects ID containing zero (0) even if 14 digits
    await request(app.getHttpServer())
      .get('/api/radios/10234567891234')
      .set('X-API-Key', validKey)
      .expect(400);

    // Rejects ID containing consecutive repeated digits (like 11 or 22)
    await request(app.getHttpServer())
      .get('/api/radios/11234567891234')
      .set('X-API-Key', validKey)
      .expect(400);

    // Rejects all-repeated ID
    await request(app.getHttpServer())
      .get('/api/radios/11111111111111')
      .set('X-API-Key', validKey)
      .expect(400);

    // Rejects ID with less than 14 digits
    await request(app.getHttpServer())
      .get('/api/radios/12345')
      .set('X-API-Key', validKey)
      .expect(400);

    // Rejects invalid page
    await request(app.getHttpServer())
      .get('/api/radios?page=-1')
      .set('X-API-Key', validKey)
      .expect(400);

    // Valid 14-digit non-repeating ID that does not exist returns 404
    await request(app.getHttpServer())
      .get('/api/radios/98765432198765')
      .set('X-API-Key', validKey)
      .expect(404);
  });

  it('Reflects changes made directly to radios.json without server restart', async () => {
    const dbPath = path.join(process.cwd(), 'src', 'database', 'radios.json');
    const originalContent = fs.readFileSync(dbPath, 'utf-8');
    const radios = JSON.parse(originalContent);

    // 14 digits, no zero, no consecutive duplicates: 98765432198765
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
