import { HatsyHandler } from './handler';
import { hatsyListener } from './listener';
import { readAll, suppressedLog, testServer, TestServer } from './spec';

describe('hatsyListener', () => {

  let server: TestServer;
  let handler: jest.Mock<ReturnType<HatsyHandler>, Parameters<HatsyHandler>>;

  beforeAll(async () => {
    handler = jest.fn();
    server = await testServer(hatsyListener(handler, { log: suppressedLog }));
  });
  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    handler.mockReset();
  });

  it('responds with `404` when handler not responding', async () => {

    const response = await server.get('/');

    expect(response.statusCode).toBe(404);
    expect(response.statusMessage).toBe('Not Found');
    expect(await readAll(response)).toContain('ERROR 404');
  });
  it('invokes handler', async () => {
    handler.mockImplementation(({ response }) => response.end('TEST'));

    const response = await server.get('/test');

    expect(await readAll(response)).toBe('TEST');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ method: 'GET', url: '/test' }),
    }));
  });

});
