import { noop } from '@proc7ts/primitives';
import type { IncomingMessage, ServerResponse } from 'http';
import type { ErrorMeans, RequestContext } from '../core';
import { TestHttpServer } from '../testing';
import { HttpError } from './http-error';
import { httpListener } from './http-listener';
import type { HttpMeans } from './http.means';
import { Rendering } from './render';

describe('httpListener', () => {

  let server: TestHttpServer;

  beforeAll(async () => {
    server = await TestHttpServer.start();
  });
  afterAll(async () => {
    await server.stop();
  });

  afterEach(() => {
    server.listener.mockReset();
  });

  let logErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logErrorSpy = jest.spyOn(console, 'error');
    logErrorSpy.mockImplementation(noop);
  });
  afterEach(() => {
    logErrorSpy.mockRestore();
  });

  it('invokes handler', async () => {

    const handler = jest.fn(({ response }: RequestContext<HttpMeans>) => {
      response.end('TEST');
    });

    server.listener.mockImplementation(httpListener(handler));

    const response = await server.get('/test');

    expect(await response.body()).toBe('TEST');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ method: 'GET', url: '/test' }),
    }));
  });
  it('responds with `404` status when handler not responding', async () => {
    server.listener.mockImplementation(httpListener(noop));

    const response = await server.get('/');

    expect(response.statusCode).toBe(404);
    expect(response.statusMessage).toBe('Not Found');
    expect(response.headers['content-type']).toContain('text/html');
    expect(await response.body()).toContain('ERROR 404');
  });
  it('responds with `404` status and JSON when handler not responding and JSON expected', async () => {
    server.listener.mockImplementation(httpListener(noop));

    const response = await server.get('/', { headers: { accept: 'application/json' } });

    expect(response.statusCode).toBe(404);
    expect(response.statusMessage).toBe('Not Found');
    expect(JSON.parse(await response.body())).toEqual({ error: { code: 404, message: 'Not Found' } });
  });
  it('does not respond when handler not responding and no default handler', async () => {

    const listener = httpListener({ defaultHandler: false }, noop);

    server.listener.mockImplementation((request, response) => {
      listener(request, response);
      Promise.resolve().finally(() => {
        response.end('NO RESPONSE');
      });
    });

    const response = await server.get('/');

    expect(await response.body()).toBe('NO RESPONSE');
  });
  it('responds with `500` status when handler throws error', async () => {

    const error = new Error('test');

    server.listener.mockImplementation(httpListener(() => { throw error; }));

    const response = await server.get('/test');

    expect(response.statusCode).toBe(500);
    expect(response.statusMessage).toBe('Internal Server Error');
    expect(await response.body()).toContain('ERROR 500');
  });
  it('responds with `500` status and JSON when handler throws error and JSON expected', async () => {

    const error = new Error('test');

    server.listener.mockImplementation(httpListener(() => { throw error; }));

    const response = await server.get('/test', { headers: { accept: 'application/json' } });

    expect(response.statusCode).toBe(500);
    expect(response.statusMessage).toBe('Internal Server Error');
    expect(JSON.parse(await response.body())).toEqual({ error: { code: 500, message: 'Internal Server Error' } });
  });
  it('responds with error status when handler throws error', async () => {

    const error = new HttpError(403, { details: 'No Go' });

    server.listener.mockImplementation(httpListener(() => { throw error; }));

    const response = await server.get('/test');

    expect(response.statusCode).toBe(403);
    expect(response.statusMessage).toBe('Forbidden');

    const body = await response.body();

    expect(body).toContain('ERROR 403 Forbidden');
    expect(body).toContain('No Go');
  });
  it('responds with error status and JSON when handler throws error and JSON expected', async () => {

    const error = new HttpError(403, { details: 'No Go' });

    server.listener.mockImplementation(httpListener(() => { throw error; }));

    const response = await server.get('/test', { headers: { accept: 'application/json' } });

    expect(response.statusCode).toBe(403);
    expect(response.statusMessage).toBe('Forbidden');

    const body = await response.body();

    expect(JSON.parse(body)).toEqual({ error: { code: 403, message: 'Forbidden', details: 'No Go' } });
  });
  it('invokes provided default handler when handler not responding', async () => {

    const defaultHandler = jest.fn(({ response }: RequestContext<HttpMeans>) => {
      response.end('DEFAULT');
    });

    server.listener.mockImplementation(httpListener(
        { defaultHandler },
        noop,
    ));

    const response = await server.get('/test');

    expect(await response.body()).toBe('DEFAULT');
    expect(defaultHandler).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ method: 'GET', url: '/test' }),
    }));
  });
  it('logs error and invokes provided error handler', async () => {

    const error = new Error('test');
    const errorHandler = jest.fn(({ response, error }: RequestContext<ErrorMeans & HttpMeans>) => {
      response.end(`ERROR ${error.message}`);
    });

    server.listener.mockImplementation(httpListener(
        { errorHandler },
        () => { throw error; },
    ));

    const response = await server.get('/test');

    expect(await response.body()).toContain('ERROR test');
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', error);
    expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ method: 'GET', url: '/test' }),
      error,
    }));
  });
  it('logs HTTP error and invokes provided error handler', async () => {

    const error = new HttpError(404, { details: 'Never Found' });
    const errorHandler = jest.fn(({ response, error }: RequestContext<ErrorMeans & HttpMeans>) => {
      response.end(`ERROR ${error.message} ${error.details}`);
    });

    server.listener.mockImplementation(httpListener(
        { errorHandler },
        () => { throw error; },
    ));

    const response = await server.get('/test');
    const body = await response.body();

    expect(body).toContain('ERROR 404 Never Found');
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', '404', 'Never Found');
    expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ method: 'GET', url: '/test' }),
      error,
    }));
  });
  it('logs ERROR when there is no error handler', async () => {

    const error = new Error('test');

    server.listener.mockImplementation(httpListener(
        { errorHandler: false },
        () => { throw error; },
    ));

    const response = await server.get('/test');

    expect(await response.body()).toBe('');
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', error);
  });
  it('does not log ERROR when there is no error handler', async () => {

    const error = new Error('test');

    server.listener.mockImplementation(httpListener(
        { errorHandler: false, logErrors: false },
        () => { throw error; },
    ));

    const response = await server.get('/test');

    expect(await response.body()).toBe('');
    expect(logErrorSpy).not.toHaveBeenCalled();
  });
  it('logs ERROR when there is neither error, not default handler', async () => {

    const error = new Error('test');
    const listener = httpListener(
        { defaultHandler: false, errorHandler: false },
        () => { throw error; },
    );

    server.listener.mockImplementation((request, response) => {
      listener(request, response);
      response.end('NO RESPONSE');
    });

    await server.get('/test');
    const response = await server.get('/test');

    expect(await response.body()).toBe('NO RESPONSE');
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', error);
  });
  it('logs unhandled errors', async () => {

    const error = new Error('test');
    const errorHandler = jest.fn(() => {
      throw error;
    });
    const whenErrorLogged = new Promise(resolve => {
      logErrorSpy.mockImplementation(resolve);
    });

    const listener = httpListener(
        { errorHandler },
        () => { throw error; },
    );

    server.listener.mockImplementation((request, response) => {
      listener(request, response);
      response.end('NO RESPONSE');
    });

    const response = await server.get('/test');

    expect(await response.body()).toBe('NO RESPONSE');

    await whenErrorLogged;
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', 'Unhandled error', error);
  });
  it('does not log unhandled errors when disabled', async () => {

    const error = new Error('test');
    const errorHandler = jest.fn(() => {
      throw error;
    });

    let listener: (this: void, req: IncomingMessage, res: ServerResponse) => void;

    const whenErrorLogged = new Promise(resolve => {
      listener = httpListener(
          { errorHandler, logErrors: false },
          () => {
            setTimeout(resolve);
            throw error;
          },
      );
    });

    server.listener.mockImplementation((request, response) => {
      listener(request, response);
      response.end('NO RESPONSE');
    });

    const response = await server.get('/test');

    expect(await response.body()).toBe('NO RESPONSE');

    await whenErrorLogged;
    expect(logErrorSpy).not.toHaveBeenCalled();
  });

  describe('requestAddresses', () => {
    it('contain request URL', async () => {
      server.listener.mockImplementation(httpListener(Rendering.for(({ requestAddresses, renderJson }) => {
        renderJson({ url: requestAddresses.url.href });
      })));

      const response = await server.get('/test', { headers: { host: 'localhost' } });

      expect(JSON.parse(await response.body())).toEqual({ url: 'http://localhost/test' });
    });
    it('contain root request URL when path is unknown', async () => {
      server.listener.mockImplementation(httpListener(Rendering.for(({ request, requestAddresses, renderJson }) => {
        delete request.url;
        renderJson({ url: requestAddresses.url.href });
      })));

      const response = await server.get('/test', { headers: { host: 'localhost' } });

      expect(JSON.parse(await response.body())).toEqual({ url: 'http://localhost/' });
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

      expect(JSON.parse(await response.body())).toEqual({ ip: '127.0.0.1' });
    });
  });
});
