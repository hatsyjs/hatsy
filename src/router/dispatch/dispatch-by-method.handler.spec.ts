import { RequestContext, requestHandler } from '../../core';
import { httpListener, HttpMeans, Rendering, RenderMeans } from '../../http';
import { readAll, suppressedLog, testServer, TestServer } from '../../spec';
import { RouterMeans } from '../router.means';
import { Routing } from '../routing.capability';
import { dispatchByMethod } from './dispatch-by-method.handler';

describe('dispatchByName', () => {

  let server: TestServer;

  beforeAll(async () => {
    server = await testServer();
  });
  afterAll(async () => {
    await server.stop();
  });

  afterEach(() => {
    server.listener.mockReset();
  });

  it('dispatches by method', async () => {
    server.listener.mockImplementation(httpListener(
        Rendering
            .and(Routing)
            .for(dispatchByMethod({
              search({ renderJson }: RequestContext<HttpMeans & RenderMeans & RouterMeans>): void {
                renderJson({ response: 'ok' });
              },
            })),
    ));

    const response = await server.request('/', { method: 'SEARCH' });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(await readAll(response))).toEqual({ response: 'ok' });
  });
  it('dispatches to HEAD', async () => {
    server.listener.mockImplementation(httpListener(
        Rendering
            .and(Routing)
            .for(dispatchByMethod({
              head({ renderJson }): void {
                renderJson({ response: 'ok' });
              },
            })),
    ));

    const response = await server.request('/', { method: 'HEAD' });

    expect(response.statusCode).toBe(200);
    expect(await readAll(response)).toBe('');
  });
  it('dispatches to GET on HEAD request', async () => {
    server.listener.mockImplementation(httpListener(
        Rendering
            .and(Routing)
            .for(dispatchByMethod({
              get({ renderJson }): void {
                renderJson({ response: 'ok' });
              },
            })),
    ));

    const response = await server.request('/', { method: 'HEAD' });

    expect(response.statusCode).toBe(200);
    expect(await readAll(response)).toBe('');
  });
  it('dispatches to GET without method specified', async () => {
    server.listener.mockImplementation(httpListener(
        Rendering
            .and(Routing)
            .for(requestHandler([
                ({ request }) => {
                  delete request.method;
                },
                dispatchByMethod({
                  get({ renderJson }): void {
                    renderJson({ response: 'ok' });
                  },
                }),
            ])),
    ));

    const response = await server.request('/', { method: 'HEAD' });

    expect(response.statusCode).toBe(200);
    expect(await readAll(response)).toBe('');
  });
  it('does not dispatch without corresponding handler', async () => {
    server.listener.mockImplementation(httpListener(
        {
          log: suppressedLog(),
        },
        Rendering
            .and(Routing)
            .for(dispatchByMethod({
              get({ renderJson }): void {
                renderJson({ response: 'ok' });
              },
            })),
    ));

    const response = await server.request('/', { method: 'PUT' });

    expect(response.statusCode).toBe(404);
  });
});
