/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage, ServerResponse } from 'http';
import { RequestCapabilities, RequestContext, RequestHandler, RequestModification } from '../core';
import { HttpMeans } from './http.means';

/**
 * HTTP middleware signature.
 *
 * This is a [connect]-style middleware.
 *
 * [connect]: https://github.com/senchalabs/connect
 */
export type Middleware =
/**
 * @param request  HTTP request.
 * @param response HTTP response.
 * @param next  Next function to delegate request processing to or report error with.
 */
    (
        this: void,
        request: IncomingMessage,
        response: ServerResponse,
        next: Middleware.Next,
    ) => void;

export namespace Middleware {

  /**
   * A signature of the function the {@link Middleware middleware} may call to delegate request processing
   * or report error with.
   */
  export type Next =
  /**
   * @param error  Either an error to report, or nothing to delegate request processing to next handler.
   */
      (this: void, error?: any) => void;

  /**
   * A signature of function extracting request modification after middleware execution.
   *
   * When middleware modifies the request or response objects such function can be used to extract this modification
   * to pass it downstream.
   *
   * @typeparam TInput  A type of input HTTP request processing means.
   * @typeparam TExt  A type of request processing means extension applied by middleware.
   */
  export type Modification<TInput extends HttpMeans, TExt> =
  /**
   * @param context  HTTP request processing context the middleware received request and response from.
   *
   * @returns Extracted request modification or a promise-like instance resolving to it.
   */
      (
          this: void,
          context: RequestContext<TInput>,
      ) => RequestModification<TInput, TExt> | PromiseLike<RequestModification<TInput, TExt>>;

}

/**
 * Involves the given `middleware` into HTTP request processing.
 *
 * @typeparam TInput  A type of input HTTP request processing means.
 * @param middleware  Middleware to apply.
 *
 * @returns New request processing capability set that processes HTTP requests by the given `middleware`.
 */
export function middleware<TInput extends HttpMeans>(
    middleware: Middleware,
): RequestCapabilities<TInput> {
  return RequestCapabilities.of(
      <TMeans extends TInput>(handler: RequestHandler<TMeans>) => async (
          { request, response, next }: RequestContext<TMeans>,
      ) => new Promise<void>((resolve, reject) => {

        const mdNext = (error?: any): void => {
          if (error !== undefined) {
            reject(error);
          } else {
            next(handler).then(() => resolve(), reject);
          }
        };

        middleware(request, response, mdNext);
      }),
  );
}
