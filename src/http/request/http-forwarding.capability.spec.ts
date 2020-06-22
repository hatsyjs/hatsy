import { TestHttpServer } from '../../testing';
import { httpListener } from '../http-listener';
import { Rendering } from '../render';
import { HttpForwarding } from './http-forwarding.capability';

describe('HttpForwarding', () => {

  let server: TestHttpServer;

  beforeAll(async () => {
    server = await TestHttpServer.start();
  });
  afterAll(async () => {
    await server.stop();
  });

  it('replaces addresses trusted forwarding info', async () => {
    server.listener.mockImplementation(httpListener(
        HttpForwarding
            .with({ trusted: true })
            .and(Rendering)
            .for(({ renderJson, requestAddresses: { url: { href }, ip } }) => {
              renderJson({ href, ip });
            }),
    ));

    const response = await server.get(
        '/test/nested?param=value',
        {
          family: 4,
          localAddress: '127.0.0.1',
          headers: {
            forwarded: 'host=test.com:8443;proto=https',
          },
        },
    );

    expect(JSON.parse(await response.body())).toEqual({
      ip: '127.0.0.1',
      href: 'https://test.com:8443/test/nested?param=value',
    });
  });
});
