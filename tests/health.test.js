const app = require('../src/app');
const { request } = require('./helpers/request');

describe('Health endpoint', () => {
  it('returns service status', async () => {
    const response = await request(app, { method: 'GET', url: '/health' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        timestamp: expect.any(String)
      })
    );
  });
});
