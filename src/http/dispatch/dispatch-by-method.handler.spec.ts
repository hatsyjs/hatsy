import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { silentLogger } from '@proc7ts/logger';
import { noop } from '@proc7ts/primitives';
import { Logging, RequestContext, requestHandler } from '../../core';
import { TestHttpServer } from '../../testing';
import { HttpError } from '../http-error';
import type { HttpMeans } from '../http.means';
import { Rendering, RenderMeans } from '../render';
import { dispatchByMethod } from './dispatch-by-method.handler';

describe('dispatchByName', () => {

  let server: TestHttpServer;

  beforeAll(async () => {
    server = await TestHttpServer.start();
  });
  afterAll(async () => {
    await server.stop();
  });

  afterEach(() => {
    server.handleBy(noop);
  });

  it('dispatches by method', async () => {
    server.handleBy(
        Rendering
            .for(dispatchByMethod({
              search({ renderJson }: RequestContext<HttpMeans & RenderMeans>): void {
                renderJson({ response: 'ok' });
              },
            })),
    );

    const response = await server.get('/', { method: 'SEARCH' });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(await response.body())).toEqual({ response: 'ok' });
  });
  it('dispatches to HEAD', async () => {
    server.handleBy(
        Rendering
            .for(dispatchByMethod({
              head({ renderJson }): void {
                renderJson({ response: 'ok' });
              },
            })),
    );

    const response = await server.get('/', { method: 'HEAD' });

    expect(response.statusCode).toBe(200);
    expect(await response.body()).toBe('');
  });
  it('dispatches to GET on HEAD request', async () => {
    server.handleBy(
        Rendering
            .for(dispatchByMethod({
              get({ renderJson }): void {
                renderJson({ response: 'ok' });
              },
            })),
    );

    const response = await server.get('/', { method: 'HEAD' });

    expect(response.statusCode).toBe(200);
    expect(await response.body()).toBe('');
  });
  it('dispatches to GET without method specified', async () => {
    server.handleBy(
        Rendering.for(requestHandler([
          ({ request }) => {
            delete request.method;
          },
          dispatchByMethod({
            get({ renderJson }): void {
              renderJson({ response: 'ok' });
            },
          }),
        ])),
    );

    const response = await server.get('/', { method: 'HEAD' });

    expect(response.statusCode).toBe(200);
    expect(await response.body()).toBe('');
  });
  it('does not dispatch without corresponding handler', async () => {
    server.handleBy(
        {
          handleBy(handler) {
            return Logging.logBy(silentLogger).for(handler);
          },
        },
        Rendering.for(requestHandler([
          dispatchByMethod({
            get({ renderJson }): void {
              renderJson({ response: 'ok' });
            },
          }),
          () => {
            throw new HttpError(404);
          },
        ])),
    );

    const response = await server.get('/', { method: 'PUT' });

    expect(response.statusCode).toBe(404);
  });
});
