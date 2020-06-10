import { httpListener, RenderMeans } from '../http';
import { readAll, suppressedLog, testServer, TestServer } from '../spec';
import { HttpRouterMeans } from './http-router-means';
import { routeMapper } from './route-mapper';

describe('routeMapper', () => {

  let server: TestServer;

  beforeAll(async () => {
    server = await testServer();
  });
  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.listener.mockImplementation(httpListener(
        {
          log: suppressedLog(),
        },
        RenderMeans
            .and(HttpRouterMeans)
            .handler(routeMapper({
              first({ route, renderJson }) {
                renderJson({ first: String(route) });
              },
              second({ route, renderJson }) {
                renderJson({ second: String(route) });
              },
            })),
    ));
  });

  it('delegates to matching route', async () => {

    const response = await server.get('/first');

    expect(JSON.parse(await readAll(response))).toEqual({ first: '' });
  });
  it('delegates to matching route prefix', async () => {

    const response = await server.get('/second/test.html');

    expect(JSON.parse(await readAll(response))).toEqual({ second: 'test.html' });
  });
  it('does nothing when no routes match', async () => {

    const response = await server.get('/missing/test.html');

    expect(response.statusCode).toBe(404);
  });
  it('does nothing for empty route', async () => {

    const response = await server.get('/?param=value');

    expect(response.statusCode).toBe(404);
  });
});
