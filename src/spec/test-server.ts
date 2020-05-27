import { createServer, IncomingMessage, request, RequestListener, RequestOptions, Server } from 'http';
import { AddressInfo } from 'net';
import { promisify } from 'util';

export class TestServer {

  readonly address: AddressInfo;

  constructor(readonly server: Server, readonly listener: jest.Mock<void, Parameters<RequestListener>>) {
    this.address = server.address() as AddressInfo;
  }

  request(path: string, options?: RequestOptions): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {

      const req = request(
          `http://${this.address.address}:${this.address.port}${path}`,
          {
            method: 'GET',
            host: this.address.address,
            port: this.address.port,
            ...options,
          },
          resolve,
      );

      req.on('close', reject);
      req.on('error', reject);
      req.end();
    });
  }

  get(path: string, options?: RequestOptions): Promise<IncomingMessage> {
    return this.request(path, { ...options, method: 'GET' });
  }

  stop(): Promise<void> {
    return promisify(this.server.close.bind(this.server))();
  }

}

export function testServer(): Promise<TestServer> {
  return new Promise<TestServer>((resolve, reject) => {

    const listener = jest.fn();
    const server = createServer(listener);

    server.on('error', reject);
    server.on('listening', () => resolve(new TestServer(server, listener)));
    server.listen({ port: 0, host: 'localhost' });
  });
}
