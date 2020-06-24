import { httpListener, HttpMeans, Rendering } from '../http';
import { TestHttpServer } from '../testing';
import { RequestContext } from './request-context';
import { requestExtension, RequestModification } from './request-modification';
import { RequestModifier, RequestModifier__symbol } from './request-modifier';

describe('RequestModifier', () => {

  let server: TestHttpServer;

  beforeAll(async () => {
    server = await TestHttpServer.start();
  });
  afterAll(async () => {
    await server.stop();
  });

  interface TestMeans {
    test: string;
  }

  let modifier: RequestModifier<HttpMeans, TestMeans>;

  beforeEach(() => {
    modifier = {

      get [RequestModifier__symbol]() {
        return modifier;
      },

      modification<TMeans extends HttpMeans>(
          _context: RequestContext<TMeans>,
      ): RequestModification<TMeans, TestMeans> {
        return requestExtension({ test: 'modified' });
      },

      modifyNext<TNext>(
          context: RequestContext<HttpMeans & TestMeans>,
          modification: RequestModification<HttpMeans & TestMeans, TNext>,
      ): RequestModification<HttpMeans & TestMeans, TNext> {
        return { ...modification, test: `${modification.test || context.test}!` };
      },

    };
  });

  it('modifies request', async () => {
    server.listener.mockImplementation(httpListener(Rendering.for(async ({ next }) => {
      await next(({ renderJson, test }) => renderJson({ test }), modifier);
    })));

    const response = await server.get('/');

    expect(JSON.parse(await response.body())).toEqual({ test: 'modified' });
  });
  it('alters subsequent requests', async () => {
    server.listener.mockImplementation(httpListener(Rendering.for(async ({ next }) => next(
        ({ next }) => next(({ renderJson, test }) => renderJson({ test }), { test: 'another' }),
        modifier,
    ))));

    const response = await server.get('/');

    expect(JSON.parse(await response.body())).toEqual({ test: 'another!' });
  });
});
