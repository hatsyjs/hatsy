import { RequestContext } from '../core';
import { httpListener, RenderMeans } from '../http';
import { readAll, suppressedLog, testServer, TestServer } from '../spec';
import { HttpRouterMeans } from './http-router-means';
import { routeMapper } from './route-mapper';
import { RouterMeans } from './router-means';

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
              second: routeMapper({
                third: routeMapper({
                  'test.html'({ route, renderJson }: RequestContext<RenderMeans & RouterMeans>) {
                    renderJson({ test: String(route) });
                  },
                }),
              }),
            })),
    ));
  });

  it('delegates to matching route', async () => {

    const response = await server.get('/first');

    expect(JSON.parse(await readAll(response))).toEqual({ first: '' });
  });
  it('delegates to nested route', async () => {

    const response = await server.get('/second/third/test.html?param=value');

    expect(JSON.parse(await readAll(response))).toEqual({ test: '?param=value' });
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
