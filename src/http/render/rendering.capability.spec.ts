import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { noop } from '@proc7ts/primitives';
import { TextEncoder } from 'node:util';
import { TestHttpServer } from '../../testing';
import { Rendering } from './rendering.capability';

describe('Rendering', () => {

  let server: TestHttpServer;

  beforeAll(async () => {
    server = await TestHttpServer.start();
  });
  afterAll(async () => {
    await server.stop();
  });

  afterEach(() => {
    server.listenBy(noop);
  });

  describe('renderHtml', () => {

    beforeEach(() => {
      server.handleBy(Rendering.for(({ renderHtml }) => {
        renderHtml('TEST');
      }));
    });

    it('renders HTML', async () => {

      const response = await server.get('/test');
      const body = await response.body();

      expect(body).toBe('TEST');
      expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(response.headers['content-length']).toBe('4');
    });
    it('renders HTML as buffer', async () => {
      server.handleBy(Rendering.for(({ renderHtml }) => {
        renderHtml(Buffer.from(new TextEncoder().encode('TEST')));
      }));

      const response = await server.get('/test');
      const body = await response.body();

      expect(body).toBe('TEST');
      expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(response.headers['content-length']).toBe('4');
    });
    it('is applied once', async () => {
      server.handleBy(
          Rendering
              .and(Rendering)
              .and(Rendering)
              .for(({ renderHtml }) => {
                renderHtml('TEST');
              }),
      );

      const response = await server.get('/test');
      const body = await response.body();

      expect(body).toBe('TEST');
      expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(response.headers['content-length']).toBe('4');
    });
    it('does not render HTML on HEAD request', async () => {

      const response = await server.get('/test', { method: 'head' });
      const body = await response.body();

      expect(body).toBe('');
      expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(response.headers['content-length']).toBe('4');
    });
  });

  describe('renderJson', () => {

    beforeEach(() => {
      server.handleBy(Rendering.for(({ renderJson }) => {
        renderJson('TEST');
      }));
    });

    it('renders JSON', async () => {

      const response = await server.get('/test');
      const body = await response.body();

      expect(body).toBe('"TEST"');
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.headers['content-length']).toBe('6');
    });
    it('does not render JSON on HEAD request', async () => {

      const response = await server.get('/test', { method: 'head' });
      const body = await response.body();

      expect(body).toBe('');
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.headers['content-length']).toBe('6');
    });
  });
});
