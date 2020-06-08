import {
  MatrixRoute,
  matrixRoute,
  rcaptureEntry,
  rmatchDirs,
  rmatchDirSep,
  routeTail,
  URLRoute,
} from '@hatsy/route-match';
import { RouteMatcher } from '@hatsy/route-match/d.ts/route-matcher';
import { httpListener, HttpMeans, renderJson } from '../http';
import { readAll, testServer, TestServer } from '../spec';
import { requestURL } from '../util';
import { httpRouter } from './http-router';

describe('httpRouter', () => {

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

  it('follows matching route', async () => {

    const wrongHandler = jest.fn();

    server.listener.mockImplementation(httpListener(
        httpRouter({
          routes: [
            {
              on: 'wrong',
              to: wrongHandler,
            },
            {
              on: 'test',
              async to({ next }) {
                await next(renderJson({ response: 'test' }));
              },
            },
          ],
        }),
    ));

    const response = await server.get('/test');

    expect(JSON.parse(await readAll(response))).toEqual({ response: 'test' });
    expect(wrongHandler).not.toHaveBeenCalled();
  });
  it('delegates to route handler', async () => {

    const wrongHandler = jest.fn();

    server.listener.mockImplementation(httpListener(
        httpRouter({
          routes: async ({ route, next }) => {
            await next(renderJson({ route: String(route) }));
          },
        }),
    ));

    const response = await server.get('/test.html');

    expect(JSON.parse(await readAll(response))).toEqual({ route: 'test.html' });
    expect(wrongHandler).not.toHaveBeenCalled();
  });
  it('extracts route tail', async () => {
    server.listener.mockImplementation(httpListener(
        httpRouter({
          routes: {
            on: 'test/**',
            async to({ next, route }) {
              await next(renderJson({ route: route.toString() }));
            },
          },
        }),
    ));

    const response = await server.get('/test/nested?param=value');

    expect(JSON.parse(await readAll(response))).toEqual({ route: 'nested?param=value' });
  });
  it('extracts route tail with custom function', async () => {
    server.listener.mockImplementation(httpListener(
        httpRouter({
          routes: {
            on: 'test/{tail:**}',
            async to({ next, route }) {
              await next(renderJson({ route: String(route) }));
            },
            tail({ routeMatch }) {

              let tail!: URLRoute;

              routeMatch((_type, key, _value, position: RouteMatcher.Position<URLRoute>) => {
                if (key === 'tail') {
                  tail = routeTail(position.route, position.entryIndex);
                }
              });

              return tail;
            },
          },
        }),
    ));

    const response = await server.get('/test/nested?param=value');

    expect(JSON.parse(await readAll(response))).toEqual({ route: 'nested?param=value' });
  });
  it('captures route matches', async () => {
    server.listener.mockImplementation(httpListener(
        httpRouter({
          routes: {
            on: [rcaptureEntry('dir'), rmatchDirSep, rmatchDirs],
            async to({ next, routeMatch }) {

              const captured: (readonly [string, string | number, any])[] = [];

              routeMatch((type, key, value, _position): void => {
                captured.push([type, key, value]);
              });

              await next(renderJson(captured));
            },
          },
        }),
    ));

    const response = await server.get('/test/nested');

    expect(JSON.parse(await readAll(response))).toEqual([['capture', 'dir', 'test'], ['dirs', 1, 2]]);
  });
  it('builds custom route', async () => {
    server.listener.mockImplementation(httpListener(
        httpRouter<HttpMeans, MatrixRoute>({
          routes: {
            on: 'test/**',
            async to({ next, fullRoute }) {
              await next(renderJson({ attr: fullRoute.path[0].attrs.get('attr') }));
            },
          },
          buildRoute({ request }) {
            return matrixRoute(requestURL(request, this.forwardTrust));
          },
        }),
    ));

    const response = await server.get('/test;attr=val/nested?param=value');

    expect(JSON.parse(await readAll(response))).toEqual({ attr: 'val' });
  });
  it('extracts URL from trusted forwarding info', async () => {
    server.listener.mockImplementation(httpListener(
        httpRouter({
          routes: {
            on: 'test/**',
            async to({ next, fullRoute: { url: { href } } }) {
              await next(renderJson({ href }));
            },
          },
          forwardTrust: {
            trusted: true,
          },
        }),
    ));

    const response = await server.get(
        '/test/nested?param=value',
        {
          headers: {
            forwarded: 'host=test.com:8443;proto=https',
          },
        },
    );

    expect(JSON.parse(await readAll(response))).toEqual({ href: 'https://test.com:8443/test/nested?param=value' });
  });
});
