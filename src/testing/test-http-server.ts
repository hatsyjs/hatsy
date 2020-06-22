/**
 * @packageDocumentation
 * @module @hatsy/hatsy/testing
 */
import { createServer, IncomingMessage, request, RequestListener, RequestOptions, Server } from 'http';
import { AddressInfo } from 'net';
import { promisify } from 'util';
import { readAll } from '../impl';

/**
 * Testing HTTP server and client.
 */
export class TestHttpServer {

  /**
   * Starts new test HTTP server and binds it ro random port ad localhost.
   *
   * @returns A promise resolved to started server.
   */
  static start(): Promise<TestHttpServer> {
    return new Promise<TestHttpServer>((resolve, reject) => {

      const listener = jest.fn();
      const server = createServer(listener);

      server.on('error', reject);
      server.on('listening', () => resolve(new TestHttpServer(server, listener)));
      server.listen({ port: 0, host: 'localhost' });
    });
  }

  /**
   * HTTP server instance.
   */
  readonly server: Server;

  /**
   * An address the service is bound to.
   */
  readonly address: AddressInfo;

  /**
   * A mock of HTTP server request listener.
   *
   * Does nothing by default.
   */
  readonly listener: jest.Mock<void, Parameters<RequestListener>>;

  private constructor(server: Server, listener: jest.Mock<void, Parameters<RequestListener>>) {
    this.server = server;
    this.listener = listener;
    this.address = server.address() as AddressInfo;
  }

  /**
   * Posts the data to the test server.
   *
   * @param path  Request path.
   * @param body  Request body to post, or `undefined` to post nothing.
   * @param options  Request options. The default request method is `POST`.
   *
   * @returns A promise resolves to server response.
   */
  post(path: string, body?: string | Buffer, options?: RequestOptions): Promise<TestHttpServer.Response> {
    return new Promise((resolve, reject) => {

      const req = request(
          `http://${this.address.address}:${this.address.port}${path}`,
          {
            method: 'POST',
            host: this.address.address,
            port: this.address.port,
            ...options,
          },
          response => {

            const resp = response as TestHttpServer.Response;

            resp.body = () => readAll(resp);

            resolve(resp);
          },
      );

      req.on('close', reject);
      req.on('error', reject);
      req.end(body);
    });
  }

  /**
   * Requests the data from the test server.
   *
   * @param path  Request path.
   * @param options  Request options. The default request method is `GET`.
   *
   * @returns A promise resolves to server response.
   */
  get(path: string, options?: RequestOptions): Promise<TestHttpServer.Response> {
    return this.post(path, undefined, { method: 'GET', ...options });
  }

  /**
   * Stops this server.
   *
   * @returns A promise resolved when the server is stopped.
   */
  stop(): Promise<void> {
    return promisify(this.server.close.bind(this.server))();
  }

}

export namespace TestHttpServer {

  /**
   * A response of test HTTP server.
   */
  export interface Response extends IncomingMessage {

    /**
     * Reads response body.
     *
     * @returns A promise resolved to response body.
     */
    body(): Promise<string>;

  }

}
