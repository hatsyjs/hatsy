import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { consoleLogger } from '@proc7ts/logger';
import { noop } from '@proc7ts/primitives';
import type { Mock } from 'jest-mock';
import { ErrorMeans } from '../core/error.means.js';
import { RequestContext } from '../core/request-context.js';
import { TestHttpServer } from '../testing/test-http-server.js';
import { HttpError } from './http-error.js';
import { httpListener } from './http-listener.js';
import { HttpMeans } from './http.means.js';
import { Rendering } from './render/rendering.capability.js';

describe('httpListener', () => {
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

  let logErrorSpy: Mock<(...args: unknown[]) => void>;

  beforeEach(() => {
    logErrorSpy = jest.spyOn(consoleLogger, 'error').mockImplementation(noop) as typeof logErrorSpy;
  });
  afterEach(() => {
    logErrorSpy.mockRestore();
  });

  it('invokes handler', async () => {
    const handler = jest.fn(({ response }: RequestContext<HttpMeans>) => {
      response.end('TEST');
    });

    server.handleBy(handler);

    const response = await server.get('/test');

    expect(await response.body()).toBe('TEST');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ method: 'GET', url: '/test' }),
      }) as unknown as RequestContext<HttpMeans>,
    );
  });
  it('responds with `404` status when handler not responding', async () => {
    server.handleBy(noop);

    const response = await server.get('/');

    expect(response.statusCode).toBe(404);
    expect(response.statusMessage).toBe('Not Found');
    expect(response.headers['content-type']).toContain('text/html');
    expect(await response.body()).toContain('ERROR 404');
  });
  it('responds with `404` status and JSON when handler not responding and JSON expected', async () => {
    server.handleBy(noop);

    const response = await server.get('/', { headers: { accept: 'application/json' } });

    expect(response.statusCode).toBe(404);
    expect(response.statusMessage).toBe('Not Found');
    expect(JSON.parse(await response.body())).toEqual({
      error: { code: 404, message: 'Not Found' },
    });
  });
  it('does not respond when handler not responding and no default handler', async () => {
    const listener = httpListener({ defaultHandler: false }, noop);

    server.listenBy((request, response) => {
      listener(request, response);
      // eslint-disable-next-line jest/valid-expect-in-promise
      Promise.resolve()
        .finally(() => {
          response.end('NO RESPONSE');
        })
        .catch(noop);
    });

    const response = await server.get('/');

    expect(await response.body()).toBe('NO RESPONSE');
  });
  it('responds with `500` status when handler throws error', async () => {
    const error = new Error('test');

    server.handleBy(() => {
      throw error;
    });

    const response = await server.get('/test');

    expect(response.statusCode).toBe(500);
    expect(response.statusMessage).toBe('Internal Server Error');
    expect(await response.body()).toContain('ERROR 500');
  });
  it('responds with `500` status and JSON when handler throws error and JSON expected', async () => {
    const error = new Error('test');

    server.handleBy(() => {
      throw error;
    });

    const response = await server.get('/test', { headers: { accept: 'application/json' } });

    expect(response.statusCode).toBe(500);
    expect(response.statusMessage).toBe('Internal Server Error');
    expect(JSON.parse(await response.body())).toEqual({
      error: { code: 500, message: 'Internal Server Error' },
    });
  });
  it('responds with error status when handler throws error', async () => {
    const error = new HttpError(403, { details: 'No Go' });

    server.handleBy(() => {
      throw error;
    });

    const response = await server.get('/test');

    expect(response.statusCode).toBe(403);
    expect(response.statusMessage).toBe('Forbidden');

    const body = await response.body();

    expect(body).toContain('ERROR 403 Forbidden');
    expect(body).toContain('No Go');
  });
  it('responds with unknown error status when handler throws error', async () => {
    const error = new HttpError(499);

    server.handleBy(() => {
      throw error;
    });

    const response = await server.get('/test');

    expect(response.statusCode).toBe(499);
    expect(response.statusMessage).toBe('unknown');

    const body = await response.body();

    expect(body).toContain('<h1><strong>ERROR 499</strong></h1>');
  });
  it('responds with error status and JSON when handler throws error and JSON expected', async () => {
    const error = new HttpError(403, { details: 'No Go' });

    server.handleBy(() => {
      throw error;
    });

    const response = await server.get('/test', { headers: { accept: 'application/json' } });

    expect(response.statusCode).toBe(403);
    expect(response.statusMessage).toBe('Forbidden');

    const body = await response.body();

    expect(JSON.parse(body)).toEqual({
      error: { code: 403, message: 'Forbidden', details: 'No Go' },
    });
  });
  it('invokes provided default handler when handler not responding', async () => {
    const defaultHandler = jest.fn(({ response }: RequestContext<HttpMeans>) => {
      response.end('DEFAULT');
    });

    server.handleBy({ defaultHandler }, noop);

    const response = await server.get('/test');

    expect(await response.body()).toBe('DEFAULT');
    expect(defaultHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ method: 'GET', url: '/test' }),
      }) as unknown as RequestContext<HttpMeans>,
    );
  });
  it('logs error and invokes provided error handler', async () => {
    const error = new Error('test');
    const errorHandler = jest.fn(({ response, error }: RequestContext<ErrorMeans & HttpMeans>) => {
      response.end(`ERROR ${error.message}`);
    });

    server.handleBy({ errorHandler }, () => {
      throw error;
    });

    const response = await server.get('/test');

    expect(await response.body()).toContain('ERROR test');
    expect(logErrorSpy).toHaveBeenCalledWith(error);
    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ method: 'GET', url: '/test' }),
        error,
      }) as unknown as RequestContext<ErrorMeans & HttpMeans>,
    );
  });
  it('logs HTTP error and invokes provided error handler', async () => {
    const error = new HttpError(404, { details: 'Never Found' });
    const errorHandler = jest.fn(({ response, error }: RequestContext<ErrorMeans & HttpMeans>) => {
      response.end(`ERROR ${error.message} ${error.details}`);
    });

    server.handleBy({ errorHandler }, () => {
      throw error;
    });

    const response = await server.get('/test');
    const body = await response.body();

    expect(body).toContain('ERROR 404 Never Found');
    expect(logErrorSpy).toHaveBeenCalledWith(error);
    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ method: 'GET', url: '/test' }),
        error,
      }) as unknown as RequestContext<ErrorMeans & HttpMeans>,
    );
  });
  it('logs ERROR when there is no error handler', async () => {
    const error = new Error('test');

    server.handleBy({ errorHandler: false }, () => {
      throw error;
    });

    const response = await server.get('/test');

    expect(await response.body()).toBe('');
    expect(logErrorSpy).toHaveBeenCalledWith(error);
  });
  it('does not log ERROR when there is no error handler', async () => {
    const error = new Error('test');

    server.handleBy({ errorHandler: false, logError: false }, () => {
      throw error;
    });

    const response = await server.get('/test');

    expect(await response.body()).toBe('');
    expect(logErrorSpy).not.toHaveBeenCalled();
  });
  it('logs ERROR when there is neither error, not default handler', async () => {
    const error = new Error('test');
    const listener = httpListener({ defaultHandler: false, errorHandler: false }, () => {
      throw error;
    });

    server.listenBy((request, response) => {
      listener(request, response);
      response.end('NO RESPONSE');
    });

    await server.get('/test');

    const response = await server.get('/test');

    expect(await response.body()).toBe('NO RESPONSE');
    expect(logErrorSpy).toHaveBeenCalledWith(error);
  });
  it('logs unhandled error', async () => {
    const error = new Error('test');
    const errorHandler = jest.fn(() => {
      throw error;
    });
    const whenErrorLogged = new Promise(resolve => {
      logErrorSpy.mockImplementation(resolve);
    });

    const listener = httpListener({ errorHandler }, () => {
      throw error;
    });

    server.listenBy((request, response) => {
      listener(request, response);
      response.end('NO RESPONSE');
    });

    const response = await server.get('/test');

    expect(await response.body()).toBe('NO RESPONSE');

    await whenErrorLogged;
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', 'Unhandled error', error);
  });
  it('logs unhandled error when logging disabled', async () => {
    const error = new Error('test');
    const errorHandler = jest.fn(() => {
      throw error;
    });
    const whenErrorLogged = new Promise(resolve => {
      logErrorSpy.mockImplementation(resolve);
    });

    const listener = httpListener({ errorHandler, logError: false }, () => {
      throw error;
    });

    server.listenBy((request, response) => {
      listener(request, response);
      response.end('NO RESPONSE');
    });

    const response = await server.get('/test');

    expect(await response.body()).toBe('NO RESPONSE');

    await whenErrorLogged;
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', 'Unhandled error', error);
  });

  describe('requestAddresses', () => {
    it('contain request URL', async () => {
      server.handleBy(
        Rendering.for(({ requestAddresses, renderJson }) => {
          renderJson({ url: requestAddresses.url.href });
        }),
      );

      const response = await server.get('/test', { headers: { host: 'localhost' } });

      expect(JSON.parse(await response.body())).toEqual({ url: 'http://localhost/test' });
    });
    it('contain root request URL when path is unknown', async () => {
      server.handleBy(
        Rendering.for(({ request, requestAddresses, renderJson }) => {
          delete request.url;
          renderJson({ url: requestAddresses.url.href });
        }),
      );

      const response = await server.get('/test', { headers: { host: 'localhost' } });

      expect(JSON.parse(await response.body())).toEqual({ url: 'http://localhost/' });
    });
    it('contains remote address', async () => {
      server.handleBy(
        Rendering.for(({ requestAddresses, renderJson }) => {
          renderJson({ ip: requestAddresses.ip });
        }),
      );

      const response = await server.get('/test', {
        family: 4,
        localAddress: '127.0.0.1',
        headers: { host: 'localhost' },
      });

      expect(JSON.parse(await response.body())).toEqual({ ip: '127.0.0.1' });
    });
  });
});
