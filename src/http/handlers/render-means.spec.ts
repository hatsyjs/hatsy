import { TextEncoder } from 'util';
import { readAll, testServer, TestServer } from '../../spec';
import { httpListener } from '../http-listener';
import { RenderMeans } from './render-means';

describe('RenderMeans', () => {

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

  describe('renderHtml', () => {

    beforeEach(() => {
      server.listener.mockImplementation(httpListener(RenderMeans.handler(({ renderHtml }) => {
        renderHtml('TEST');
      })));
    });

    it('renders HTML', async () => {

      const response = await server.get('/test');
      const body = await readAll(response);

      expect(body).toBe('TEST');
      expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(response.headers['content-length']).toBe('4');
    });
    it('renders HTML as buffer', async () => {
      server.listener.mockImplementation(httpListener(RenderMeans.handler(({ renderHtml }) => {
        renderHtml(Buffer.from(new TextEncoder().encode('TEST')));
      })));

      const response = await server.get('/test');
      const body = await readAll(response);

      expect(body).toBe('TEST');
      expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(response.headers['content-length']).toBe('4');
    });
    it('does not render HTML on HEAD request', async () => {

      const response = await server.request('/test', { method: 'head' });
      const body = await readAll(response);

      expect(body).toBe('');
      expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(response.headers['content-length']).toBe('4');
    });
  });

  describe('renderJson', () => {

    beforeEach(() => {
      server.listener.mockImplementation(httpListener(RenderMeans.handler(({ renderJson }) => {
        renderJson('TEST');
      })));
    });

    it('renders JSON', async () => {

      const response = await server.get('/test');
      const body = await readAll(response);

      expect(body).toBe('"TEST"');
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.headers['content-length']).toBe('6');
    });
    it('does not render JSON on HEAD request', async () => {

      const response = await server.request('/test', { method: 'head' });
      const body = await readAll(response);

      expect(body).toBe('');
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.headers['content-length']).toBe('6');
    });
  });
});
