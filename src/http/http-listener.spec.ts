import { ErrorMatters } from '../errors';
import { RequestContext } from '../request-context';
import { readAll, suppressedLog, testServer, TestServer } from '../spec';
import { HttpError } from './http-error';
import { httpListener } from './http-listener';
import { HttpMatters } from './http-matters';

describe('httpListener', () => {

  let server: TestServer;

  beforeAll(async () => {
    server = await testServer();
  });
  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.listener.mockReset();
  });

  it('invokes handler', async () => {

    const handler = jest.fn(({ response }: RequestContext<HttpMatters>) => {
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
    server.listener.mockImplementation(httpListener(() => {/* do not respond */}, { log: suppressedLog() }));

    const response = await server.get('/');

    expect(response.statusCode).toBe(404);
    expect(response.statusMessage).toBe('Not Found');
    expect(await readAll(response)).toContain('ERROR 404');
  });
  it('does not respond when handler not responding ad no default handler', async () => {

    const listener = httpListener(() => {/* do not respond */}, { defaultHandler: false });

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

    server.listener.mockImplementation(httpListener(() => { throw error; }, { log: suppressedLog() }));

    const response = await server.get('/test');

    expect(response.statusCode).toBe(500);
    expect(response.statusMessage).toBe('Internal Server Error');
    expect(await readAll(response)).toContain('ERROR 500');
  });
  it('responds with error status when handler throws error', async () => {

    const error = new HttpError(403);

    server.listener.mockImplementation(httpListener(() => { throw error; }, { log: suppressedLog() }));

    const response = await server.get('/test');

    expect(response.statusCode).toBe(403);
    expect(response.statusMessage).toBe('Forbidden');
    expect(await readAll(response)).toContain('ERROR 403');
  });
  it('invokes provided default handler when handler not responding', async () => {

    const defaultHandler = jest.fn(({ response }: RequestContext<HttpMatters>) => {
      response.end('DEFAULT');
    });

    server.listener.mockImplementation(httpListener(
        () => {/* do not respond */},
        { log: suppressedLog(), defaultHandler },
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
    const errorHandler = jest.fn(({ response, error }: RequestContext<ErrorMatters & HttpMatters>) => {
      response.end(`ERROR ${error.message}`);
    });

    server.listener.mockImplementation(httpListener(() => { throw error; }, { log, errorHandler }));

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
    const errorHandler = jest.fn(({ response, error }: RequestContext<ErrorMatters & HttpMatters>) => {
      response.end(`ERROR ${error.message}`);
    });

    server.listener.mockImplementation(httpListener(() => { throw error; }, { log, errorHandler }));

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

    server.listener.mockImplementation(httpListener(() => { throw error; }, { log, errorHandler: false }));

    const response = await server.get('/test');

    expect(await readAll(response)).toBe('');
    expect(logErrorSpy).toHaveBeenCalledWith('[GET /test]', error);
  });
  it('logs ERROR when there is neither error, not default handler', async () => {

    const error = new Error('test');
    const log = suppressedLog();
    const logErrorSpy = jest.spyOn(log, 'error');
    const listener = httpListener(
        () => { throw error; },
        { log, defaultHandler: false, errorHandler: false },
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
        () => { throw error; },
        { log, errorHandler },
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
});
