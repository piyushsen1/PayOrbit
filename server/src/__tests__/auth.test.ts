import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppDataSource } from '../config/data-source';
import { User, UserRole } from '../entities/User';
import { createApp } from '../app';

/**
 * Real integration test against a live Postgres DB (migrations must already
 * be applied — see server/CLAUDE.md). This is the template to copy for every
 * future module's test: boot the app, exercise real routes with supertest,
 * clean up what you created.
 */
describe('auth flow', () => {
  const app = createApp();
  const password = 'Password123!';
  const email = `test-${randomUUID()}@example.com`;

  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.getRepository(User).delete({ email });
    await AppDataSource.destroy();
  });

  it('signs up a new user', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email, password });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.role).toBe(UserRole.USER);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate signup', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email, password });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_RESOURCE');
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('rejects login with a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects a protected route with no token (401)', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an admin-only route for a regular user (403)', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email, password });
    const { token } = loginRes.body.data;

    const res = await request(app).get('/api/auth/admin-check').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
