import type { RequestContext } from './request-context.js';

/**
 * Request processing handler signature.
 *
 * Handler implementations expect a request processing context containing specific processing means.
 * E.g. the ones for {@link HttpMeans HTTP request processing}. The handler may either respond using the provided means,
 * or delegate to {@link RequestContext.Agent#next next handler}.
 *
 * The handler may be asynchronous.
 *
 * @typeParam TMeans - A type of request processing means this handler expects.
 * @param context - Request processing context containing the necessary means.
 *
 * @returns Either nothing if the handler completed its work synchronously, or a promise-like instance resolved when
 * the handler completed its work asynchronously.
 */
export type RequestHandler<TMeans> = (
  this: void,
  context: RequestContext<TMeans>,
) => PromiseLike<unknown> | void;

/**
 * Request processing method signature.
 *
 * This is a {@link RequestHandler request handler} that requires a `this` object.
 *
 * @typeParam TThis - A type of `this` object.
 * @typeParam TMeans - A type of request processing means this handler expects.
 *  @param context - Request processing context containing the necessary means.
 *
 * @returns Either nothing if the handler completed its work synchronously, or a promise-like instance resolved when
 * the handler completed its work asynchronously.
 */
export type RequestHandlerMethod<TThis, TMeans> = (
  this: TThis,
  context: RequestContext<TMeans>,
) => PromiseLike<unknown> | void;

/**
 * Builds a request processing handler that delegates request processing to other handlers.
 *
 * Iterates over the given handlers in order and delegates the request processing to them. It stops when either
 * response is generated, an error thrown, or no handlers left.
 *
 * @typeParam TMeans - A type of request processing means `handlers` expect.
 * @param handlers - Either single handler or iterable of handlers to delegate request processing to.
 *
 * @returns Request processing handler.
 */
export function requestHandler<TMeans>(
  handlers: RequestHandler<TMeans> | Iterable<RequestHandler<TMeans>>,
): RequestHandler<TMeans> {
  if (typeof handlers === 'function') {
    return handlers;
  }

  return async (context: RequestContext<TMeans>): Promise<void> => {
    for (const handler of handlers) {
      if (await context.next(handler)) {
        return;
      }
    }

    return;
  };
}
