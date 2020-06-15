import { noop } from '@proc7ts/primitives';
import { ErrorMeans, RequestContext } from '../core';
import { readAll, suppressedLog, testServer, TestServer } from '../spec';
import { HttpError } from './http-error';
import { httpListener } from './http-listener';
import { HttpMeans } from './http-means';
import { Rendering } from './render';

describe('httpListener', () => {

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

  it('invokes handler', async () => {

    const handler = jest.fn(({ response }: RequestContext<HttpMeans>) => {
      response.end('TEST');
    });

    server.listener.mockImplementation(httpListener(handler));

    const response = await server.get('/test');

    expect(await readAll(response)).toBe('TEST');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ method: 'GET', url: '/test' }),
    }));
  });
  it('responds with `404` status when handler not responding', async () => {
    server.listener.mockImplementation(httpListener({ log: suppressedLog() }, noop));

    const response = await server.get('/');

    expect(response.statusCode).toBe(404);
    expect(response.statusMessage).toBe('Not Found');
    expect(await readAll(response)).toContain('ERROR 404');
  });
  it('does not respond when handler not responding ad no default handler', async () => {

    const listener = httpListener({ defaultHandler: false }, noop);

    server.listener.mockImplementation((request, response) => {
      listener(request, response);
      Promise.resolve().finally(() => {
        response.end('NO RESPONSE');
      });
    });

    const response = await server.get('/');

    expect(await readAll(response)).toBe('NO RESPONSE');
  });
  it('responds with `500` status when handler throws error', async () => {

    const error = new Error('test');

    server.listener.mockImplementation(httpListener({ log: suppressedLog() }, () => { throw error; }));

    const response = await server.get('/test');

    expect(response.statusCode).toBe(500);
    expect(response.statusMessage).toBe('Internal Server Error');
    expect(await readAll(response)).toContain('ERROR 500');
  });
  it('responds with error status when handler throws error', async () => {

    const error = new HttpError(403);

    server.listener.mockImplementation(httpListener({ log: suppressedLog() }, () => { throw error; }));

    const response = await server.get('/test');

    expect(response.statusCode).toBe(403);
    expect(response.statusMessage).toBe('Forbidden');
    expect(await readAll(response)).toContain('ERROR 403');
  });
  it('invokes provided default handler when handler not responding', async () => {

    const defaultHandler = jest.fn(({ response }: RequestContext<HttpMeans>) => {
      response.end('DEFAULT');
    });

    server.listener.mockImplementation(httpListener(
        { log: suppressedLog(), defaultHandler },
        noop,
    ));

    const response = await server.get('/test');

    expect(await readAll(response)).toBe('DEFAULT');
    expect(defaultHandler).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ method: 'GET', url: '/test' }),
    }));
  });
  it('logs error and invokes provided error handler', async () => {

    const error = new Error('test');
    const log = suppressedLog();
    const logErrorSpy = jest.spyOn(log, 'error');
    const errorHandler = jest.fn(({ response, error }: RequestContext<ErrorMeans & HttpMeans>) => {
      response.end(`ERROR ${error.message}`);
    });

    server.listener.mockImplementation(httpListener({ log, errorHandler }, () => { throw error; }));

    const response = await server.get('/test');

    expect(await readAll(response)).toContain('ERROR test');
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', error);
    expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ method: 'GET', url: '/test' }),
      error,
    }));
  });
  it('logs HTTP error and invokes provided error handler', async () => {

    const error = new HttpError(404, 'Never Found');
    const log = suppressedLog();
    const logErrorSpy = jest.spyOn(log, 'error');
    const errorHandler = jest.fn(({ response, error }: RequestContext<ErrorMeans & HttpMeans>) => {
      response.end(`ERROR ${error.message}`);
    });

    server.listener.mockImplementation(httpListener({ log, errorHandler }, () => { throw error; }));

    const response = await server.get('/test');

    expect(await readAll(response)).toContain('ERROR 404 Never Found');
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', 'ERROR 404 Never Found');
    expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ method: 'GET', url: '/test' }),
      error,
    }));
  });
  it('logs ERROR when there is no error handler', async () => {

    const error = new Error('test');
    const log = suppressedLog();
    const logErrorSpy = jest.spyOn(log, 'error');

    server.listener.mockImplementation(httpListener({ log, errorHandler: false }, () => { throw error; }));

    const response = await server.get('/test');

    expect(await readAll(response)).toBe('');
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', error);
  });
  it('logs ERROR when there is neither error, not default handler', async () => {

    const error = new Error('test');
    const log = suppressedLog();
    const logErrorSpy = jest.spyOn(log, 'error');
    const listener = httpListener(
        { log, defaultHandler: false, errorHandler: false },
        () => { throw error; },
    );

    server.listener.mockImplementation((request, response) => {
      listener(request, response);
      Promise.resolve().finally(() => {
        response.end('NO RESPONSE');
      });
    });

    await server.get('/test');
    const response = await server.get('/test');

    expect(await readAll(response)).toBe('NO RESPONSE');
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', error);
  });
  it('logs unhandled errors', async () => {

    const error = new Error('test');
    const log = suppressedLog();
    const logErrorSpy = jest.spyOn(log, 'error');
    const errorHandler = jest.fn(() => {
      throw error;
    });

    const listener = httpListener(
        { log, errorHandler },
        () => { throw error; },
    );

    server.listener.mockImplementation((request, response) => {
      listener(request, response);
      Promise.resolve().finally(() => {
        response.end('NO RESPONSE');
      });
    });

    const response = await server.get('/test');

    expect(await readAll(response)).toBe('NO RESPONSE');
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', 'Unhandled error', error);
  });

  describe('requestAddresses', () => {
    it('contain request URL', async () => {
      server.listener.mockImplementation(httpListener(Rendering.for(({ requestAddresses, renderJson }) => {
        renderJson({ url: requestAddresses.url.href });
      })));

      const response = await server.get('/test', { headers: { host: 'localhost' } });

      expect(JSON.parse(await readAll(response))).toEqual({ url: 'http://localhost/test' });
    });
    it('contain root request URL when path is unknown', async () => {
      server.listener.mockImplementation(httpListener(Rendering.for(({ request, requestAddresses, renderJson }) => {
        delete request.url;
        renderJson({ url: requestAddresses.url.href });
      })));

      const response = await server.request('/test', { headers: { host: 'localhost' } });

      expect(JSON.parse(await readAll(response))).toEqual({ url: 'http://localhost/' });
    });
    it('contains remote address', async () => {
      server.listener.mockImplementation(httpListener(Rendering.for(({ requestAddresses, renderJson }) => {
        renderJson({ ip: requestAddresses.ip });
      })));

      const response = await server.get(
          '/test',
          {
            family: 4,
            localAddress: '127.0.0.1',
            headers: { host: 'localhost' },
          },
      );

      expect(JSON.parse(await readAll(response))).toEqual({ ip: '127.0.0.1' });
    });
  });
});
