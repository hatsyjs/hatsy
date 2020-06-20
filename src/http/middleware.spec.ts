import { noop } from '@proc7ts/primitives';
import { readAll } from '../impl';
import { suppressedLog, testServer, TestServer } from '../spec';
import { HttpError } from './http-error';
import { httpListener } from './http-listener';
import { middleware, Middleware } from './middleware';
import { Rendering } from './render';

describe('middleware', () => {

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

  let ware: jest.Mock<void, Parameters<Middleware>>;

  beforeEach(() => {
    ware = jest.fn((_request, _response, next) => next());
  });

  it('applies middleware after capabilities', async () => {
    server.listener.mockImplementation(httpListener(
        Rendering
            .and(middleware(ware))
            .for(({ renderJson }) => {
              renderJson({ response: 'ok' });
            }),
    ));

    const response = await server.get('/test');

    expect(JSON.parse(await readAll(response))).toEqual({ response: 'ok' });
    expect(ware).toHaveBeenCalledTimes(1);
  });
  it('applies capabilities after middleware', async () => {
    server.listener.mockImplementation(httpListener(
        middleware(ware)
            .and(Rendering)
            .for(({ renderJson }) => {
              renderJson({ response: 'ok' });
            }),
    ));

    const response = await server.get('/test');

    expect(JSON.parse(await readAll(response))).toEqual({ response: 'ok' });
    expect(ware).toHaveBeenCalledTimes(1);
  });
  it('allows middleware to error', async () => {
    ware.mockImplementation((_request, _response, next) => next(new HttpError(503, 'Custom Error')));

    server.listener.mockImplementation(httpListener(
        {
          log: suppressedLog(),
        },
        middleware(ware).for(noop),
    ));

    const response = await server.get('/test');

    expect(response.statusCode).toBe(503);
    expect(response.statusMessage).toBe('Custom Error');
  });
  it('allows middleware to respond', async () => {
    ware.mockImplementation((_request, response) => {
      response.end('TEST');
    });

    server.listener.mockImplementation(httpListener(
        middleware(ware).for(noop),
    ));

    const response = await server.get('/test');

    expect(response.statusCode).toBe(200);
    expect(await readAll(response)).toBe('TEST');
  });
});
