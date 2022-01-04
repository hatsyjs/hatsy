import { noop } from '@proc7ts/primitives';
import { createServer, IncomingMessage, request, RequestListener, RequestOptions, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { promisify } from 'node:util';
import type { RequestHandler } from '../core';
import { HttpConfig, httpListener, HttpMeans } from '../http';
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
    return new TestHttpServer()._start();
  }

  /**
   * @internal
   */
  private _listener: RequestListener;

  /**
   * @internal
   */
  private _server!: Server;

  private constructor() {
    this._listener = noop;
  }

  /**
   * HTTP server instance.
   */
  get server(): Server {
    return this._server;
  }

  /**
   * An address the service is bound to.
   */
  get address(): AddressInfo {
    return this._server.address() as AddressInfo;
  }

  /**
   * Starts to handle incoming requests by the given request listener.
   *
   * @param listener - New HTTP request listener.
   *
   * @returns `this` instance.
   */
  listenBy(listener: RequestListener): this {
    this._listener = listener;

    return this;
  }

  /**
   * Starts to handle extended incoming requests by the given request handler.
   *
   * @typeParam TExt - Request processing means extension type.
   * @param config - HTTP processing configuration.
   * @param handler - New HTTP request processing handler.
   *
   * @returns `this` instance.
   */
  handleBy<TExt>(
      config: HttpConfig.Extended<TExt, HttpMeans>,
      handler: RequestHandler<HttpMeans & TExt>,
  ): this;

  /**
   * Starts to handle incoming requests by the given request handler.
   *
   * @param config - HTTP processing configuration.
   * @param handler - New HTTP request processing handler.
   *
   * @returns `this` instance.
   */
  handleBy(config: HttpConfig, handler: RequestHandler<HttpMeans>): this;

  /**
   * Starts to handle incoming requests by the given request handler according to default configuration.
   *
   * @param handler - New HTTP request processing handler.
   *
   * @returns `this` instance.
   */
  handleBy(handler: RequestHandler<HttpMeans>): this;

  handleBy(
      configOrHandler: HttpConfig | RequestHandler<HttpMeans>,
      optionalHandler?: RequestHandler<HttpMeans>,
  ): this {
    return this.listenBy(httpListener(configOrHandler as HttpConfig, optionalHandler as RequestHandler<HttpMeans>));
  }

  /**
   * @internal
   */
  private _start(): Promise<TestHttpServer> {
    return new Promise((resolve, reject) => {

      const server = this._server = createServer(
          (request, response) => this._listener(request, response),
      );

      server.on('error', reject);
      server.on('listening', () => resolve(this));
      server.listen({ port: 0, host: 'localhost' });
    });
  }

  /**
   * Posts the data to the test server.
   *
   * @param path - Request path.
   * @param body - Request body to post, or `undefined` to post nothing.
   * @param options - Request options. The default request method is `POST`.
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
   * @param path - Request path.
   * @param options - Request options. The default request method is `GET`.
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
