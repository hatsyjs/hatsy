import type { ErrorMeans, RequestHandler } from '../core';
import type { HttpMeans } from './http.means';

/**
 * HTTP processing configuration.
 *
 * @typeParam TMeans - A type of supported HTTP request processing means.
 */
export interface HttpConfig<TMeans extends HttpMeans = HttpMeans> {

  /**
   * Default HTTP request handler.
   *
   * This handler will be called after all other handlers when response is not generated.
   *
   * When set to `false` the default response won't be generated.
   *
   * @default `true`, which means a `404 Not Found` error will be raised if there is no response.
   */
  readonly defaultHandler?: RequestHandler<TMeans> | boolean | undefined;

  /**
   * Error processing handler.
   *
   * This handler will be called once request processing error occurred. Such handler would receive
   * a {@link ErrorMeans error processing means} along with {@link HttpMeans HTTP processing ones}.
   *
   * When set to `false` the request processing errors will be logged, but otherwise ignored.
   *
   * @default `true`, which means the request processing error page will be rendered by {@link renderHttpError}
   * handler.
   */
  readonly errorHandler?: RequestHandler<TMeans & ErrorMeans> | boolean | undefined;

  /**
   * Whether to log HTTP processing error.
   *
   * Unhandled errors will be logged with `console.error` in any case.
   *
   * @default `true`, which means an error will be logged with {@link LoggerMeans logger means}, created if necessary.
   */
  readonly logError?: boolean | undefined;

}

export namespace HttpConfig {

  /**
   * HTTP processing configuration for extended requests.
   *
   * @typeParam TExt - Request processing means extension type.
   * @typeParam TMeans - A type of supported HTTP request processing means.
   */
  export interface Extended<TExt, TMeans extends HttpMeans = HttpMeans> extends HttpConfig<TMeans & TExt> {

    /**
     * Creates actual HTTP request handler.
     *
     * This can be used e.g. to set up additional request processing capabilities, such as {@link Logging}.
     *
     * @param handler - HTTP request handler.
     *
     * @returns HTTP request handler to use instead.
     */
    handleBy(handler: RequestHandler<TMeans & TExt>): RequestHandler<TMeans>;

  }

}
