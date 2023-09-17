import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { silentLogger } from '@proc7ts/logger';
import { Logging } from '../../core/logging/logging.capability.js';
import { TestHttpServer } from '../../testing/test-http-server.js';
import { Rendering } from '../render/rendering.capability.js';
import { dispatchByLanguage } from './dispatch-by-language.handler.js';

describe('dispatchByLanguage', () => {
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
        dispatchByLanguage({
          en({ renderJson }): void {
            renderJson({ lang: 'en' });
          },

          ['en-US']({ renderJson }): void {
            renderJson({ lang: 'en-US' });
          },

          ['*']({ renderJson }) {
            renderJson({ lang: 'any' });
          },
        }),
      ),
    );
  });

  it('dispatches by accepted language', async () => {
    const response = await server.get('/test', {
      headers: { 'accept-language': 'en,*' },
    });

    expect(JSON.parse(await response.body())).toEqual({ lang: 'en' });
    expect(response.headers.vary).toBe('Accept-Language');
  });
  it('dispatches by preferred language', async () => {
    const response = await server.get('/test', {
      headers: { 'accept-language': 'en,en-US;*' },
    });

    expect(JSON.parse(await response.body())).toEqual({ lang: 'en-US' });
    expect(response.headers.vary).toBe('Accept-Language');
  });
  it('dispatches to fallback', async () => {
    const response = await server.get('/test');

    expect(JSON.parse(await response.body())).toEqual({ lang: 'any' });
    expect(response.headers.vary).toBe('Accept-Language');
  });
  it('sends with 406 (No Acceptable) when no matching handler found', async () => {
    const response = await server.get('/test', {
      headers: { 'accept-language': 'de,*;q=0' },
    });

    expect(response.statusCode).toBe(406);
    expect(response.statusMessage).toBe('Not Acceptable');
  });
});
