import { httpListener, Rendering } from '../../http';
import { readAll, suppressedLog, testServer, TestServer } from '../../spec';
import { dispatchByLanguage } from './dispatch-by-language.handler';

describe('dispatchByLanguage', () => {

  let server: TestServer;

  beforeAll(async () => {
    server = await testServer();
  });
  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.listener.mockImplementation(httpListener(
        {
          log: suppressedLog(),
        },
        Rendering
            .for(dispatchByLanguage({

              en({ renderJson }): void {
                renderJson({ lang: 'en' });
              },

              ['en-US']({ renderJson }): void {
                renderJson({ lang: 'en-US' });
              },

              ['*']({ renderJson }) {
                renderJson({ lang: 'any' });
              },

            })),
    ));
  });

  it('dispatches by accepted language', async () => {

    const response = await server.get(
        '/test',
        {
          headers: { 'accept-language': 'en,*' },
        },
    );

    expect(JSON.parse(await readAll(response))).toEqual({ lang: 'en' });
    expect(response.headers.vary).toBe('Accept-Language');
  });
  it('dispatches by preferred language', async () => {

    const response = await server.get(
        '/test',
        {
          headers: { 'accept-language': 'en,en-US;*' },
        },
    );

    expect(JSON.parse(await readAll(response))).toEqual({ lang: 'en-US' });
    expect(response.headers.vary).toBe('Accept-Language');
  });
  it('dispatches to fallback', async () => {

    const response = await server.get('/test');

    expect(JSON.parse(await readAll(response))).toEqual({ lang: 'any' });
    expect(response.headers.vary).toBe('Accept-Language');
  });
  it('sends with 406 (No Acceptable) when no matching handler found', async () => {

    const response = await server.get(
        '/test',
        {
          headers: { 'accept-language': 'de,*;q=0' },
        },
    );

    expect(response.statusCode).toBe(406);
    expect(response.statusMessage).toBe('Not Acceptable');
  });
});
