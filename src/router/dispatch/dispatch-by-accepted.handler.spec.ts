import { RequestContext } from '../../core';
import { httpListener, HttpMeans, Rendering, RenderMeans } from '../../http';
import { addResponseHeader, readAll } from '../../impl';
import { suppressedLog, testServer, TestServer } from '../../spec';
import { dispatchByAccepted } from './dispatch-by-accepted.handler';

describe('dispatchByAccepted', () => {

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
            .for(dispatchByAccepted({

              ['application/json']({ renderJson }: RequestContext<HttpMeans & RenderMeans>): void {
                renderJson({ response: 'json' });
              },

              ['text/html']({ renderHtml }: RequestContext<HttpMeans & RenderMeans>): void {
                renderHtml('<html lang="en"><body>HTML</body></html>');
              },

              ['*/*']({ response, renderJson }: RequestContext<HttpMeans & RenderMeans>): void {
                addResponseHeader(response, 'Vary', 'Accept-Language');
                renderJson({ response: 'fallback' });
              },

            })),
    ));
  });

  it('dispatches to accepted MIME', async () => {

    const response = await server.get(
        '/test',
        {
          headers: { accept: 'text/html,application/json;q=0.8,*/*;q=0.8' },
        },
    );

    expect(await readAll(response)).toContain('HTML');
    expect(response.headers.vary).toBe('Accept');
  });
  it('dispatches to preferred MIME', async () => {

    const response = await server.get(
        '/test',
        {
          headers: { accept: 'text/html;q=0.8,application/json;q=0.9,*/*;q=0.8' },
        },
    );

    expect(JSON.parse(await readAll(response))).toEqual({ response: 'json' });
    expect(response.headers.vary).toBe('Accept');
  });
  it('dispatches to fallback', async () => {

    const response = await server.get('/test');

    expect(JSON.parse(await readAll(response))).toEqual({ response: 'fallback' });
    expect(response.headers.vary).toBe('Accept, Accept-Language');
  });
  it('sends with 406 (No Acceptable) when no matching handler found', async () => {

    const response = await server.get(
        '/test',
        {
          headers: { accept: 'image/jpeg,*/*;q=0' },
        },
    );

    expect(response.statusCode).toBe(406);
    expect(response.statusMessage).toBe('Not Acceptable');
  });
});
