import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

process.env.API_KEY = 'test-api-key-for-e2e';

describe('Radios API (e2e)', () => {
  let app: INestApplication<App>;
  const validKey = 'test-api-key-for-e2e';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET) returns API info without auth', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);
    expect(res.body.name).toBe('RadiosWave API');
  });

  it('/api/radios without API key returns 401', async () => {
    await request(app.getHttpServer()).get('/api/radios').expect(401);
  });

  it('/api/radios with wrong API key returns 401', async () => {
    await request(app.getHttpServer())
      .get('/api/radios')
      .set('X-API-Key', 'wrong-key')
      .expect(401);
  });

  it('/api/radios (GET) returns paginated list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?page=1&limit=5')
      .set('X-API-Key', validKey)
      .expect(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(5);
  });

  it('/api/radios?q= (GET) filters by text', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios?q=Palmas')
      .set('X-API-Key', validKey)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(
      res.body.data.every(
        (r: { name: string; state: string }) =>
          r.name.toLowerCase().includes('palmas') ||
          r.state.toLowerCase().includes('palmas'),
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

  it('/api/radios/meta (GET) returns states and tags', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/radios/meta')
      .set('X-API-Key', validKey)
      .expect(200);
    expect(res.body.states).toContain('Tocantins');
    expect(res.body.tags).toContain('popular');
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('/api/radios/:id (GET) returns one radio', async () => {
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
  });

  it('/api/radios/abc (GET) returns 400', () => {
    return request(app.getHttpServer())
      .get('/api/radios/abc')
      .set('X-API-Key', validKey)
      .expect(400);
  });

  it('/api/radios/999999 (GET) returns 404', () => {
    return request(app.getHttpServer())
      .get('/api/radios/999999')
      .set('X-API-Key', validKey)
      .expect(404);
  });
});
