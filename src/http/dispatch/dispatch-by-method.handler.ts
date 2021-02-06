import type { RequestHandler, RequestHandlerMethod } from '../../core';
import type { HttpMeans } from '../http.means';

/**
 * Request processing handlers for HTTP request methods.
 *
 * @typeParam TMeans - Supported HTTP request processing means.
 */
export interface DispatchMethods<TMeans extends HttpMeans = HttpMeans> {

  /**
   * Request processing handler for HTTP DELETE.
   */
  readonly delete?: RequestHandlerMethod<this, TMeans>;

  /**
   * Request processing handler for HTTP GET.
   *
   * It is also called for HTTP HEAD requests unless a [head] handler is also defined.
   */
  readonly get?: RequestHandlerMethod<this, TMeans>;

  /**
   * Request processing handler for HTTP HEAD.
   */
  readonly head?: RequestHandlerMethod<this, TMeans>;

  /**
   * Request processing handler for HTTP OPTIONS.
   */
  readonly options?: RequestHandlerMethod<this, TMeans>;

  /**
   * Request processing handler for HTTP PATCH.
   */
  readonly patch?: RequestHandlerMethod<this, TMeans>;

  /**
   * Request processing handler for HTTP POST.
   */
  readonly post?: RequestHandlerMethod<this, TMeans>;

  /**
   * Request processing handler for HTTP PUT.
   */
  readonly put?: RequestHandlerMethod<this, TMeans>;

  /**
   * Request handler method with lower-case HTTP method name as its key.
   */
  readonly [method: string]: RequestHandlerMethod<this, TMeans> | undefined;

}

/**
 * Dispatches request processing by HTTP request method.
 *
 * @typeParam TMeans - Supported HTTP route processing means.
 * @param methods - A map of request processing handlers corresponding to HTTP request methods.
 *
 * @returns New HTTP request processing handler.
 */
export function dispatchByMethod<TMeans extends HttpMeans>(
    methods: DispatchMethods<TMeans>,
): RequestHandler<TMeans> {
  return async ({ request: { method }, next }) => {

    const verb = method ? method.toLocaleLowerCase() : 'get';
    const handler = methods[verb] || (verb === 'head' && methods.get);

    if (handler) {
      await next(handler.bind(methods));
    }
  };
}
