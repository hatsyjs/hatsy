import { readAll } from '../../impl';
import { suppressedLog, testServer, TestServer } from '../../spec';
import { httpListener } from '../http-listener';
import { HttpMeans } from '../http.means';
import { Rendering, RenderMeans } from '../render';
import { urlDecodeForm } from './url-decode-form.handler';

describe('urlDecodeForm', () => {

  let server: TestServer;

  beforeAll(async () => {
    server = await testServer();
  });
  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.listener.mockImplementation(
        httpListener(
            {
              log: suppressedLog(),
            },
            Rendering.for(urlDecodeForm<HttpMeans & RenderMeans>(
                ({ requestBody, renderJson }) => {
                  renderJson({ request: Array.from(requestBody.entries()) });
                },
            )),
        ),
    );
  });

  it('processes submitted form', async () => {

    const response = await server.post(
        '/test',
        'param1=value1&param2=value2',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
        },
    );

    expect(JSON.parse(await readAll(response))).toEqual({ request: [['param1', 'value1'], ['param2', 'value2']] });
  });
  it('responds with 415 (Unsupported Media Type) with wrong request type', async () => {

    const response = await server.get('/test?param1=value1&param2=value2');

    expect(response.statusCode).toBe(415);
    expect(response.statusMessage).toBe('application/x-www-form-urlencoded request expected');
  });
});
