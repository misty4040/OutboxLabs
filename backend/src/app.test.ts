import request from 'supertest';
import { app } from './app';

describe('Phase 1: Basic App Scaffold & Health Check', () => {
  it('GET /api/health should return 200 with standard envelope', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('status', 'healthy');
    expect(res.body.data).toHaveProperty('service', 'reachinbox-scheduler-api');
  });
});
