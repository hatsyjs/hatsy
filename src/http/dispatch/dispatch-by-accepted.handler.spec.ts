import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { silentLogger } from '@proc7ts/logger';
import { Logging } from '../../core/logging/logging.capability.js';
import { RequestContext } from '../../core/request-context.js';
import { TestHttpServer } from '../../testing/test-http-server.js';
import { HttpMeans } from '../http.means.js';
import { RenderMeans } from '../render/render.means.js';
import { Rendering } from '../render/rendering.capability.js';
import { addResponseHeader } from '../util/add-response-header.js';
import { dispatchByAccepted } from './dispatch-by-accepted.handler.js';

describe('dispatchByAccepted', () => {
  let server: TestHttpServer;

  beforeAll(async () => {
    server = await TestHttpServer.start();
  });
  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.handleBy(
      {
        handleBy(handler) {
          return Logging.logBy(silentLogger).for(handler);
        },
      },
      Rendering.for(
        dispatchByAccepted({
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
        }),
      ),
    );
  });

  it('dispatches to accepted MIME', async () => {
    const response = await server.get('/test', {
      headers: { accept: 'text/html,application/json;q=0.8,*/*;q=0.8' },
    });

    expect(await response.body()).toContain('HTML');
    expect(response.headers.vary).toBe('Accept');
  });
  it('dispatches to preferred MIME', async () => {
    const response = await server.get('/test', {
      headers: { accept: 'text/html;q=0.8,application/json;q=0.9,*/*;q=0.8' },
    });

    expect(JSON.parse(await response.body())).toEqual({ response: 'json' });
    expect(response.headers.vary).toBe('Accept');
  });
  it('dispatches to fallback', async () => {
    const response = await server.get('/test');

    expect(JSON.parse(await response.body())).toEqual({ response: 'fallback' });
    expect(response.headers.vary).toBe('Accept, Accept-Language');
  });
  it('sends with 406 (No Acceptable) when no matching handler found', async () => {
    const response = await server.get('/test', {
      headers: { accept: 'image/jpeg,*/*;q=0' },
    });

    expect(response.statusCode).toBe(406);
    expect(response.statusMessage).toBe('Not Acceptable');
  });
});
