import type { IncomingMessage, ServerResponse } from 'node:http';
import { RequestCapability, RequestContext, RequestHandler } from '../core';
import type { HttpMeans } from './http.means';

/**
 * HTTP middleware signature.
 *
 * This is a [Connect]-style middleware.
 *
 * [Connect]: https://github.com/senchalabs/connect
 *
 * @typeParam TRequest - Supported HTTP request type.
 * @typeParam TResponse - Supported HTTP response type.
 *
 * @param request - HTTP request.
 * @param response HTTP response.
 * @param next - Next function to delegate request processing to or report error with.
 */
export type Middleware<
  TRequest extends IncomingMessage = IncomingMessage,
  TResponse extends ServerResponse = ServerResponse,
> = (this: void, request: TRequest, response: TResponse, next: Middleware.Next) => void;

export namespace Middleware {
  /**
   * A signature of the function the {@link Middleware middleware} may call to delegate request processing
   * or report error with.
   *
   * @param error - Either an error to report, or nothing to delegate request processing to next handler.
   */
  export type Next = (this: void, error?: unknown) => void;
}

/**
 * Involves the given `middleware` into HTTP request processing.
 *
 * @typeParam TInput - A type of input HTTP request processing means.
 * @param middleware - Middleware to apply.
 *
 * @returns New request processing capability that processes HTTP requests by the given `middleware`.
 */
export function middleware<TInput extends HttpMeans>(
  middleware: Middleware<TInput['request'], TInput['response']>,
): RequestCapability<TInput> {
  return RequestCapability.of(middlewareProvider);

  function middlewareProvider<TMeans extends TInput>(
    handler: RequestHandler<TMeans>,
  ): RequestHandler<TMeans> {
    return async ({ request, response, next }: RequestContext<TMeans>) => await new Promise<void>((resolve, reject) => {
        const mdNext = (error?: unknown): void => {
          if (error !== undefined) {
            reject(error);
          } else {
            next(handler).then(() => resolve(), reject);
          }
        };

        middleware(request, response, mdNext);
      });
  }
}
