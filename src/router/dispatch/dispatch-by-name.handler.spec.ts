import { RequestContext } from '../../core';
import { httpListener, Rendering, RenderMeans } from '../../http';
import { readAll, suppressedLog, testServer, TestServer } from '../../spec';
import { RouterMeans } from '../router.means';
import { Routing } from '../routing.capability';
import { dispatchByName } from './dispatch-by-name.handler';

describe('dispatchByName', () => {

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
        Rendering
            .and(Routing)
            .for(dispatchByName({
              first({ route, renderJson }) {
                renderJson({ first: String(route) });
              },
              second: dispatchByName({
                third: dispatchByName({
                  'test.html'({ route, renderJson }: RequestContext<RenderMeans & RouterMeans>) {
                    renderJson({ test: String(route) });
                  },
                }),
              }),
            })),
    ));
  });

  it('dispatches to matching route', async () => {

    const response = await server.get('/first');

    expect(JSON.parse(await readAll(response))).toEqual({ first: '' });
  });
  it('dispatches to nested route', async () => {

    const response = await server.get('/second/third/test.html?param=value');

    expect(JSON.parse(await readAll(response))).toEqual({ test: '?param=value' });
  });
  it('does not dispatch when no routes match', async () => {

    const response = await server.get('/missing/test.html');

    expect(response.statusCode).toBe(404);
  });
  it('does not dispatch when route is empty', async () => {

    const response = await server.get('/?param=value');

    expect(response.statusCode).toBe(404);
  });
});
