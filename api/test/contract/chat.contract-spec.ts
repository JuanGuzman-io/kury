/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, getHttpServer } from '../support/test-app';

describe('POST /api/v1/chat contract', () => {
  let app: INestApplication;

  beforeAll(async () => ({ app } = await createTestApp()));
  afterAll(async () => app.close());

  it('requires role and trusted user context', async () => {
    await request(getHttpServer(app))
      .post('/api/v1/chat')
      .send({ message: 'estado' })
      .expect(403);
    await request(getHttpServer(app))
      .post('/api/v1/chat')
      .set('X-Kuri-Role', 'OPS')
      .send({ message: 'estado' })
      .expect(400)
      .expect((response) =>
        expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR'),
      );
  });

  it('rejects a body user id that differs from trusted context', async () => {
    const response = await request(getHttpServer(app))
      .post('/api/v1/chat')
      .set('X-Kuri-Role', 'OPS')
      .set('X-Kuri-User-Id', 'usr_real')
      .send({ user_id: 'usr_attacker', message: 'estado' })
      .expect(201);
    expect(response.body.message).toContain('no coincide');
  });
});
